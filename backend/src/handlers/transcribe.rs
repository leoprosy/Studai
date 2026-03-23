use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use tokio::fs;
use tracing::{info, error};
use anyhow::Context;
use tauri::{AppHandle, Manager, Emitter};

use crate::ai;

#[derive(Serialize, Deserialize, Clone)]
pub struct TranscribeResponse {
    pub success: bool,
    pub markdown: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct ProgressEvent {
    pub job_id: String,
    pub status: String,
}

#[tauri::command]
pub async fn process_audio(
    app: AppHandle,
    job_id: String,
    filename: String,
    bytes: Vec<u8>,
) -> Result<TranscribeResponse, String> {
    match run_pipeline(&app, &job_id, &filename, bytes).await {
        Ok(markdown) => {
            info!("Pipeline termine");
            let _ = app.emit("progress", ProgressEvent { job_id: job_id.clone(), status: "done".into() });
            Ok(TranscribeResponse { success: true, markdown: Some(markdown), error: None })
        }
        Err(e) => {
            error!("Erreur pipeline : {:#}", e);
            let _ = app.emit("progress", ProgressEvent { job_id: job_id.clone(), status: "error".into() });
            Err(format!("{:#}", e))
        }
    }
}

async fn run_pipeline(app: &AppHandle, job_id: &str, filename: &str, bytes: Vec<u8>) -> anyhow::Result<String> {
    let app_data_dir = app.path().app_data_dir().context("Impossible de trouver le dossier AppData")?;
    
    // Config paths
    let audio_dir = app_data_dir.join("audio");
    let output_dir = app_data_dir.join("outputs");
    let models_dir = app_data_dir.join("models");
    let model_path = models_dir.join("ggml-small.bin");

    fs::create_dir_all(&audio_dir).await?;
    fs::create_dir_all(&output_dir).await?;
    fs::create_dir_all(&models_dir).await?;

    // Check if model exists, eventually download it here
    if !model_path.exists() {
        let _ = app.emit("progress", ProgressEvent { job_id: job_id.to_string(), status: "downloading_model".into() });
        // Downloading dummy since the actual download wasn't fully asked, but let's implement the logic
        let url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin";
        let response = reqwest::get(url).await.context("Erreur de telechargement du modele")?;
        let bytes_model = response.bytes().await?;
        fs::write(&model_path, bytes_model).await?;
    }

    let ext = PathBuf::from(filename).extension().and_then(|e| e.to_str()).unwrap_or("mp3").to_string();
    let audio_path = audio_dir.join(format!("{}.{}", job_id, ext));
    
    fs::write(&audio_path, &bytes).await.context("Erreur sauvegarde audio")?;
    let audio_path_str = audio_path.to_str().context("Chemin invalide")?.to_string();

    // Étape 1 — Whisper (CPU-bound → spawn_blocking)
    let _ = app.emit("progress", ProgressEvent { job_id: job_id.to_string(), status: "transcribing".into() });
    info!("Transcription Whisper...");
    let raw_text = {
        let path = audio_path_str.clone();
        let m_path = model_path.to_str().unwrap().to_string();
        tokio::task::spawn_blocking(move || ai::transcribe_audio(&path, &m_path))
            .await.context("spawn_blocking whisper")??
    };
    info!("Transcription : {} caracteres", raw_text.len());

    // Étape 2 — LLM (I/O async → direct await)
    let _ = app.emit("progress", ProgressEvent { job_id: job_id.to_string(), status: "structuring".into() });
    info!("Structuration LLM...");
    let markdown = ai::structure_course(&raw_text).await
        .context("Echec LLM")?;
    info!("Markdown : {} caracteres", markdown.len());

    let _ = fs::remove_file(&audio_path_str).await;
    Ok(markdown)
}