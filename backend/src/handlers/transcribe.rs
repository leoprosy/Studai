use axum::{
    extract::Multipart,
    Json,
};
use serde::Serialize;
use std::path::PathBuf;
use tokio::fs;
use tracing::{info, error};
use uuid::Uuid;
use anyhow::Context;

use crate::ai;

#[derive(Serialize)]
pub struct TranscribeResponse {
    pub success: bool,
    pub pdf_path: Option<String>,
    pub error: Option<String>,
}

pub async fn transcribe_audio(mut multipart: Multipart) -> Json<TranscribeResponse> {
    match process_upload(&mut multipart).await {
        Ok(pdf_path) => {
            info!("Pipeline terminé → {}", pdf_path);
            Json(TranscribeResponse {
                success: true,
                pdf_path: Some(pdf_path),
                error: None,
            })
        }
        Err(e) => {
            error!("Erreur pipeline : {:#}", e);
            Json(TranscribeResponse {
                success: false,
                pdf_path: None,
                error: Some(format!("{:#}", e)),
            })
        }
    }
}

async fn process_upload(multipart: &mut Multipart) -> anyhow::Result<String> {
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

    let audio_path_str = audio_path.to_str().context("Chemin audio invalide")?.to_string();

    // 2. Pipeline IA dans spawn_blocking (ne bloque pas Tokio)
    let pdf_path = tokio::task::spawn_blocking(move || -> anyhow::Result<String> {
        info!("Transcription en cours...");
        let raw_text = ai::transcribe_audio(&audio_path_str)
            .context("Echec transcription Whisper")?;
        info!("Transcription : {} caracteres", raw_text.len());

        info!("Structuration LLM en cours...");
        let markdown = ai::structure_course(&raw_text)
            .context("Echec structuration LLM")?;
        info!("Markdown : {} caracteres", markdown.len());

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