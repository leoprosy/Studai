pub mod whisper;
pub mod llm;
use anyhow::Result;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct TranscriptionSegment {
    pub text: String,
    pub start: i64,
    pub end: i64,
}

pub fn transcribe_audio(
    audio_path: &str, 
    model_path: &str, 
    sender: Option<tokio::sync::mpsc::UnboundedSender<TranscriptionSegment>>
) -> Result<String> {
    whisper::transcribe(audio_path, model_path, sender)
}

pub async fn structure_course(raw_text: &str) -> Result<String> {
    llm::structure_course(raw_text).await
}
