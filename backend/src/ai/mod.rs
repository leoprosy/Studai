pub mod whisper;
pub mod llm;
use anyhow::Result;

pub fn transcribe_audio(audio_path: &str, model_path: &str) -> Result<String> {
    whisper::transcribe(audio_path, model_path)
}

pub async fn structure_course(raw_text: &str) -> Result<String> {
    llm::structure_course(raw_text).await
}
