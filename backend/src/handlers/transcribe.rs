use axum::{
    extract::{Multipart, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use tracing::{info, error};
use uuid::Uuid;
use anyhow::Context;

use crate::{ai, AppState};

#[derive(Deserialize)]
pub struct TranscribeQuery {
    job_id: String,
}

#[derive(Serialize)]
pub struct TranscribeResponse {
    pub success: bool,
    pub pdf_path: Option<String>,
    pub error: Option<String>,
}

pub async fn transcribe_audio(
    State(state): State<AppState>,
    Query(query): Query<TranscribeQuery>,
    mut multipart: Multipart,
) -> Json<TranscribeResponse> {
    let job_id = query.job_id.clone();
    
    // Obtenir ou créer le canal de broadcast pour ce job
    let tx = {
        let mut map = state.channels.write().await;
        map.entry(job_id.clone())
            .or_insert_with(|| tokio::sync::broadcast::channel(16).0)
            .clone()
    };

    match process_upload(&mut multipart, tx.clone()).await {
        Ok(pdf_path) => {
            info!("Pipeline terminé → {}", pdf_path);
            let _ = tx.send("done".to_string()); // Signal that we're completely done
            Json(TranscribeResponse {
                success: true,
                pdf_path: Some(pdf_path),
                error: None,
            })
        }
        Err(e) => {
            let err_msg = format!("{:#}", e);
            error!("Erreur pipeline : {}", err_msg);
            let _ = tx.send(format!("error:{}", err_msg)); // Send error over WS
            Json(TranscribeResponse {
                success: false,
                pdf_path: None,
                error: Some(err_msg),
            })
        }
    }
}

async fn process_upload(
    multipart: &mut Multipart,
    tx: tokio::sync::broadcast::Sender<String>
) -> anyhow::Result<String> {
    // 1. Reception du fichier audio
    let field = multipart
        .next_field()
        .await
        .context("Erreur lecture multipart")?
        .context("Aucun champ dans la requete")?;

    let original_name = field.file_name().unwrap_or("audio").to_string();
    let ext = PathBuf::from(&original_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp3")
        .to_string();

    let data = field.bytes().await.context("Erreur lecture bytes")?;
    info!("Fichier recu : {} ({} octets)", original_name, data.len());

    // Sauvegarde temporaire
    let audio_dir = PathBuf::from(
        std::env::var("AUDIO_DIR").unwrap_or_else(|_| "./data/audio".to_string())
    );
    fs::create_dir_all(&audio_dir).await?;

    let audio_path = audio_dir.join(format!("{}.{}", Uuid::new_v4(), ext));
    fs::write(&audio_path, &data).await.context("Erreur sauvegarde audio")?;

    // Valider la taille du fichier (minimum 10 KB pour un audio valide)
    const MIN_AUDIO_SIZE: usize = 10 * 1024;
    if data.len() < MIN_AUDIO_SIZE {
        let _ = fs::remove_file(&audio_path).await;
        anyhow::bail!(
            "Fichier audio trop petit ({} octets, minimum {} octets). \
             Vérifiez que le fichier audio est valide et que le client envoie \
             bien le contenu du fichier.",
            data.len(),
            MIN_AUDIO_SIZE
        );
    }

    // Utiliser un chemin absolu
    let audio_path_abs = audio_path.canonicalize().context("Impossible de résoudre le chemin audio absolu")?;
    let audio_path_str = audio_path_abs.to_str().context("Chemin audio invalide")?.to_string();

    // 2. Pipeline IA dans spawn_blocking
    let pdf_path = tokio::task::spawn_blocking(move || -> anyhow::Result<String> {
        // Envoi d'un événement au frontend = on est passé à la transcription
        let _ = tx.send("transcribing".to_string());
        info!("Transcription en cours...");
        let raw_text = ai::transcribe_audio(&audio_path_str)
            .context("Echec transcription Whisper")?;
        info!("Transcription : {} caracteres", raw_text.len());

        let _ = tx.send("structuring".to_string());
        info!("Structuration LLM en cours...");
        let markdown = ai::structure_course(&raw_text)
            .context("Echec structuration LLM")?;
        info!("Markdown : {} caracteres", markdown.len());

        let _ = tx.send("generating_pdf".to_string());
        info!("Generation PDF...");
        let pdf = ai::generate_pdf(&markdown)
            .context("Echec generation PDF")?;

        // Nettoyage fichier audio temporaire
        let _ = std::fs::remove_file(&audio_path_str);

        Ok(pdf)
    })
    .await
    .context("Erreur spawn_blocking")??;

    Ok(pdf_path)
}