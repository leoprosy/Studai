use anyhow::{Context, Result};
use pyo3::prelude::*;
use pyo3::types::{PyList, PyModule};
use std::fmt::Display;
use std::path::Path;

/// PyO3 errors (`PyErr`, `DowncastError`, …) are not `Send`/`Sync`, so they cannot be wrapped in
/// `anyhow::Error` via `?` inside `Python::with_gil` (closure return must be `Send`). Convert to a
/// plain message first.
fn map_py_err<T, E: Display>(r: Result<T, E>) -> Result<T> {
    r.map_err(|e| anyhow::anyhow!("{e}"))
}

fn setup_python_path(py: Python<'_>) -> Result<()> {
    let sys = map_py_err(py.import_bound("sys"))?;
    let path = map_py_err(sys.getattr("path"))?;
    let path: &Bound<PyList> = map_py_err(path.downcast())?;

    let ai_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("ai");

    let ai_path_str = ai_path.to_str().context("Chemin ai/ invalide")?;
    map_py_err(path.insert(0, ai_path_str))?;
    Ok(())
}

/// Importe un module Python en forçant le rechargement depuis le fichier source.
/// Évite le cache de `sys.modules` qui bloquerait les modifications à chaud.
fn import_fresh_module<'py>(py: Python<'py>, module_name: &str) -> Result<Bound<'py, PyModule>> {
    setup_python_path(py)?;

    // Supprimer le module du cache sys.modules s'il y est déjà
    let sys = map_py_err(py.import_bound("sys"))?;
    let modules = map_py_err(sys.getattr("modules"))?;
    let _ = modules.call_method1("pop", (module_name,)); // ignore si absent

    // Importer (lecture fraîche du .py)
    map_py_err(PyModule::import_bound(py, module_name))
        .with_context(|| format!("Impossible d'importer {module_name}.py"))
}

pub fn transcribe_audio(audio_path: &str) -> Result<String> {
    Python::with_gil(|py| {
        let module = import_fresh_module(py, "whisper_bridge")?;

        let transcribe = map_py_err(module.getattr("transcribe"))?;
        let result = map_py_err(transcribe.call1((audio_path,)))
            .context("Erreur transcription")?;

        map_py_err(result.extract::<String>())
    })
}

pub fn structure_course(raw_text: &str) -> Result<String> {
    Python::with_gil(|py| {
        let module = import_fresh_module(py, "llm_bridge")?;

        let structure = map_py_err(module.getattr("structure_course"))?;
        let result = map_py_err(structure.call1((raw_text,)))
            .context("Erreur structuration LLM")?;

        map_py_err(result.extract::<String>())
    })
}

pub fn generate_pdf(markdown: &str) -> Result<String> {
    Python::with_gil(|py| {
        let module = import_fresh_module(py, "pdf_generator")?;

        let generate = map_py_err(module.getattr("generate_pdf"))?;
        let result = map_py_err(generate.call1((markdown,)))
            .context("Erreur generation PDF")?;

        map_py_err(result.extract::<String>())
    })
}
