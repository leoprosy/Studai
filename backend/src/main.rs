use axum::{extract::DefaultBodyLimit, routing::{get, post}, Router};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use std::collections::HashMap;
use tower_http::{
    cors::{Any, CorsLayer},
    limit::RequestBodyLimitLayer,
};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use dotenvy::dotenv;

mod handlers;
mod ai;

// Notre état partagé ("AppState")
#[derive(Clone)]
pub struct AppState {
    pub channels: Arc<RwLock<HashMap<String, broadcast::Sender<String>>>>,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    // Force PyO3 à utiliser le venv
    if let Ok(python_path) = std::env::var("PYO3_PYTHON") {
        std::env::set_var("PYO3_PYTHON", python_path);
    }

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "course_transcriber_backend=debug,info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let state = AppState {
        channels: Arc::new(RwLock::new(HashMap::new())),
    };

    // Multipart utilise `with_limited_body()` : sans ces couches, la limite Axum reste 2 Mo.
    const MAX_UPLOAD: usize = 500 * 1024 * 1024;
    let transcribe = Router::new()
        .route(
            "/transcribe",
            post(handlers::transcribe::transcribe_audio),
        )
        .layer(DefaultBodyLimit::max(MAX_UPLOAD))
        .layer(RequestBodyLimitLayer::new(MAX_UPLOAD));

    let app = Router::new()
        .route("/health", get(handlers::health::health_check))
        .route("/ws", get(handlers::ws::ws_handler))
        .merge(transcribe)
        .layer(cors)
        .with_state(state);

    let host = std::env::var("BACKEND_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("BACKEND_PORT").unwrap_or_else(|_| "8001".to_string());
    let addr: SocketAddr = format!("{}:{}", host, port).parse().expect("Adresse invalide");

    info!("Backend demarre sur http://{}", addr);
    info!("Routes : GET /health | POST /transcribe | GET /ws");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}