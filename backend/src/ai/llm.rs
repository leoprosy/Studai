use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const SYSTEM_PROMPT: &str = r#"Tu es un assistant spécialisé dans la prise de notes académiques.
Tu reçois une transcription brute d'un cours oral.
Produis un cours écrit complet en Markdown avec cette structure :
1. # Titre du cours
2. Résumé court (2-3 phrases)
3. ## Introduction rédigée
4. ## Parties principales (avec ### sous-parties si nécessaire)
   - **Définition :** pour les définitions clés
   - > Exemple : pour les exemples
5. ## Conclusion rédigée
6. ## Points clés à retenir (liste)
Écris en français académique. Produis UNIQUEMENT le Markdown."#;

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
    options: Options,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct Options {
    temperature: f32,
    num_predict: u32,
}

#[derive(Deserialize)]
struct OllamaResponse {
    message: ResponseMessage,
}

#[derive(Deserialize)]
struct ResponseMessage {
    content: String,
}

pub async fn structure_course(raw_text: &str) -> Result<String> {
    let base_url = std::env::var("OLLAMA_BASE_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string());
    let model = std::env::var("OLLAMA_MODEL")
        .unwrap_or_else(|_| "mistral".to_string());

    let client = Client::new();

    let payload = OllamaRequest {
        model,
        messages: vec![
            Message { role: "system".to_string(), content: SYSTEM_PROMPT.to_string() },
            Message { role: "user".to_string(),
                      content: format!("Transcription du cours :\n\n{}", raw_text) },
        ],
        stream: false,
        options: Options { temperature: 0.3, num_predict: 4096 },
    };

    let response = client
        .post(format!("{}/api/chat", base_url))
        .json(&payload)
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .context("Impossible de joindre Ollama — lance `ollama serve`")?;

    let data: OllamaResponse = response
        .json()
        .await
        .context("Réponse Ollama invalide")?;

    Ok(data.message.content.trim().to_string())
}
