## 1. Configuration des dépendances (`Cargo.toml`)

Ajoute les bibliothèques natives nécessaires à ton backend.

```toml
[dependencies]
tauri = { version = "1.x", features = ["api-all"] }
tokio = { version = "1", features = ["full"] }
# Moteur Whisper en C/C++ natif
whisper-rs = "0.11"
# Décodage de tous les formats audio (mp3, wav, m4a...)
symphonia = { version = "0.5", features = ["all"] }
# Rééchantillonnage audio (pour imposer le 16kHz)
rubato = "0.14"
# Téléchargement du modèle IA
reqwest = { version = "0.11", features = ["stream"] }
```

## 2. Téléchargement et stockage du modèle IA

Whisper utilise des modèles au format `ggml` (ex: `ggml-base.bin`).

- **Vérification locale :** Au démarrage, utilise `tauri::api::path::app_data_dir` pour vérifier si le modèle existe déjà sur la machine.
- **Téléchargement asynchrone :** S'il est absent, utilise `reqwest` pour le télécharger depuis un repo officiel (ex: HuggingFace). Émets un événement Tauri (`app.emit_all`) pour afficher une barre de progression de téléchargement sur ton frontend.

## 3. Décodage et formatage de l'audio

Whisper est intransigeant sur le format d'entrée : il veut un tableau de `f32` (PCM), strictement en **Mono**, et avec un taux d'échantillonnage de **16 000 Hz**.

- **Extraction :** Utilise `symphonia` pour ouvrir le fichier utilisateur et extraire les échantillons audio.
- **Conversion Mono :** Si le fichier est stéréo, fusionne les deux canaux en faisant la moyenne de chaque échantillon.
- **Rééchantillonnage :** Si le fichier source n'est pas à 16kHz (souvent 44.1kHz ou 48kHz), passe le signal dans `rubato` pour le convertir.

## 4. Inférence avec Whisper-rs

C'est ici que la transcription se fait localement.

- **Initialisation :** Charge le fichier `.bin` avec `WhisperContext::new()`.
- **Paramétrage :** Configure les `WhisperFullParams`. Tu pourras y définir la langue forcée (ex: "fr"), ou activer la détection automatique.
- **Exécution :** Passe ton tableau audio `f32` formaté à la fonction `state.full()`.
- **Extraction du texte :** Itère sur les segments générés (`state.full_n_segments()`) pour récupérer le texte et les horodatages (timestamps).

## 5. Architecture des Commandes Tauri

L'inférence est une tâche CPU-intensive. Si tu l'exécutes sur le thread principal de Tauri, l'interface utilisateur va figer (freeze).

- **Commandes Asynchrones :** Crée ta commande `#[tauri::command] async fn process_audio(...)`.
- **Délégation au multithreading :** Encapsule tout le code d'inférence Whisper dans un bloc `tokio::task::spawn_blocking` pour libérer le thread UI.
- **Feedback temps réel :** Pendant que Whisper traite les segments, envoie des événements au frontend via le `Window` ou `AppHandle` de Tauri pour actualiser l'interface (ex: "Phrase 1/10 transcrite...").
