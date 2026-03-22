"""
BLOC 2 — Script 2/3
Prend une transcription brute, appelle Ollama,
retourne un cours complet structuré en Markdown.
"""

import os
import sys
import json
import urllib.request
import urllib.error

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

SYSTEM_PROMPT = """Tu es un assistant spécialisé dans la prise de notes académiques.
Tu reçois une transcription brute d'un cours oral (avec des hésitations, répétitions, langage parlé).
Tu dois produire un cours écrit complet, clair et bien structuré en Markdown.

Respecte IMPÉRATIVEMENT cette structure :
1. Un titre principal (# Titre du cours)
2. Un résumé court (2-3 phrases)
3. Une introduction rédigée
4. Les parties principales du cours (## Partie 1, ## Partie 2, etc.)
   - Avec des sous-parties si nécessaire (### Sous-partie)
   - Des définitions mises en valeur (**Définition :** ...)
   - Des exemples signalés (> Exemple : ...)
5. Une conclusion rédigée
6. Les points clés à retenir (liste)

Écris en français académique. Ne mentionne pas que c'est une transcription.
Produis UNIQUEMENT le Markdown, sans commentaires ni explications."""


def _list_available_models() -> list[str]:
    """Récupère la liste des modèles installés sur Ollama."""
    try:
        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/tags",
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


def structure_course(raw_text: str) -> str:
    """
    Envoie la transcription à Ollama et retourne le cours en Markdown.

    Args:
        raw_text: Transcription brute de Whisper

    Returns:
        Cours structuré en Markdown
    """
    if not raw_text.strip():
        raise ValueError("La transcription est vide.")

    print(f"[llm] Envoi à Ollama ({OLLAMA_MODEL})...", flush=True)

    payload = json.dumps(
        {
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Voici la transcription du cours :\n\n{raw_text}",
                },
            ],
            "stream": False,
            "options": {
                "temperature": 0.3,  # Peu créatif : on veut de la structure
                "num_predict": 4096,
            },
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=300) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            available = _list_available_models()
            models_str = ", ".join(available) if available else "(aucun modèle trouvé)"
            raise ConnectionError(
                f"Le modèle '{OLLAMA_MODEL}' n'est pas installé sur Ollama. "
                f"Modèles disponibles : {models_str}. "
                f"Installe-le avec : ollama pull {OLLAMA_MODEL}"
            )
        raise ConnectionError(
            f"Erreur HTTP {e.code} depuis Ollama : {e.reason}"
        )
    except urllib.error.URLError as e:
        raise ConnectionError(
            f"Impossible de joindre Ollama sur {OLLAMA_BASE_URL}. "
            f"Lance 'ollama serve' d'abord. Erreur : {e}"
        )

    # Extraire le contenu (ignorer le champ 'thinking' de deepseek-r1)
    message = data.get("message", {})
    markdown = message.get("content", "").strip()

    if not markdown:
        raise ValueError(
            f"Ollama a retourné une réponse vide pour le modèle '{OLLAMA_MODEL}'."
        )

    print(f"[llm] Cours généré — {len(markdown)} caractères.", flush=True)
    return markdown


# --- Test standalone ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Test avec un texte fictif si pas d'argument
        test_text = (
            "Alors aujourd'hui on va parler de la photosynthèse, euh c'est un processus "
            "vraiment fondamental dans la biologie végétale. Donc la photosynthèse c'est "
            "quand les plantes utilisent la lumière du soleil pour produire de l'énergie. "
            "Plus précisément elles transforment le CO2 et l'eau en glucose et en oxygène. "
            "Il y a deux grandes étapes, la phase lumineuse et la phase sombre aussi appelée "
            "cycle de Calvin. La phase lumineuse se passe dans les thylakoïdes et la phase "
            "sombre dans le stroma du chloroplaste. En résumé c'est le mécanisme de base "
            "qui permet la vie sur Terre."
        )
        print("[test] Utilisation du texte de démonstration...\n")
        result = structure_course(test_text)
    else:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            result = structure_course(f.read())

    print("\n--- COURS STRUCTURÉ ---")
    print(result)
