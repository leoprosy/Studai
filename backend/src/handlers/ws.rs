use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::Deserialize;
use tracing::{info, warn};

use crate::AppState;

#[derive(Deserialize)]
pub struct WsQuery {
    job_id: String,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, query.job_id, state))
}

async fn handle_socket(socket: WebSocket, job_id: String, state: AppState) {
    info!("🔗 Websocket connecté pour le job : {}", job_id);

    // Initialiser le channel pour ce job
    let mut rx = {
        let mut map = state.channels.write().await;
        // Si le canal n'existe pas encore, on le crée (le client peut se connecter juste avant ou au même moment que l'upload commence à traiter)
        let tx = map
            .entry(job_id.clone())
            .or_insert_with(|| tokio::sync::broadcast::channel(16).0);
        tx.subscribe()
    };

    let (mut sender, mut _receiver) = socket.split();

    // Boucle de lecture des événements broadcast et envoi dans le websocket
    while let Ok(msg) = rx.recv().await {
        if let Err(e) = sender.send(Message::Text(msg.clone())).await {
            warn!("Erreur d'envoi websocket (job {}) : {}", job_id, e);
            break;
        }
        if msg == "done" || msg.starts_with("error:") {
            break;
        }
    }

    info!("🔌 Websocket fermé pour le job : {}", job_id);
    
    // Nettoyer le channel du cache partagé
    let mut map = state.channels.write().await;
    map.remove(&job_id);
}
