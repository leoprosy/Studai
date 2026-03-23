pub mod whisper;
pub mod llm;
pub mod pdf;

use anyhow::Result;

pub fn transcribe_audio(audio_path: &str, model_path: &str) -> Result<String> {
    whisper::transcribe(audio_path, model_path)
}

pub async fn structure_course(raw_text: &str) -> Result<String> {
    llm::structure_course(raw_text).await
}

pub fn generate_pdf(markdown: &str, output_dir: &str) -> Result<String> {
    pdf::generate_pdf(markdown, output_dir)
}
