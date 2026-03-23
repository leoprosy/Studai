use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};
use anyhow::{Context, Result};
use std::path::Path;

pub fn transcribe(audio_path: &str, model_path: &str) -> Result<String> {
    // Charge le modèle GGML
    let ctx = WhisperContext::new_with_params(
        model_path,
        WhisperContextParameters::default(),
    ).context("Impossible de charger le modèle Whisper")?;

    let mut state = ctx.create_state()
        .context("Impossible de créer l'état Whisper")?;

    // Paramètres de transcription
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("fr"));
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_special(false);

    // Décode l'audio en PCM f32 mono 16kHz (requis par Whisper)
    let pcm = decode_audio_to_pcm(audio_path)
        .context("Échec décodage audio")?;

    // Transcription
    state.full(params, &pcm)
        .context("Échec transcription Whisper")?;

    // Collecte les segments
    let n_segments = state.full_n_segments()
        .context("Impossible de lire les segments")?;

    let mut result = String::new();
    for i in 0..n_segments {
        let segment = state.full_get_segment_text(i)
            .context("Impossible de lire le segment")?;
        result.push_str(segment.trim());
        result.push(' ');
    }

    Ok(result.trim().to_string())
}

/// Décode n'importe quel format audio en PCM f32 mono 16kHz
/// via Symphonia et applique un resampling avec Rubato si nécessaire.
fn decode_audio_to_pcm(audio_path: &str) -> Result<Vec<f32>> {
    use symphonia::core::audio::SampleBuffer;
    use symphonia::core::codecs::DecoderOptions;
    use symphonia::core::formats::FormatOptions;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::meta::MetadataOptions;
    use symphonia::core::probe::Hint;

    let file = std::fs::File::open(audio_path)
        .context("Impossible d'ouvrir le fichier audio")?;

    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = Path::new(audio_path).extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .context("Format audio non reconnu")?;

    let mut format = probed.format;
    let track = format.default_track()
        .context("Aucune piste audio trouvée")?.clone();

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .context("Codec audio non supporté")?;

    let track_id = track.id;
    let mut samples: Vec<f32> = Vec::new();
    let sample_rate = track.codec_params.sample_rate.unwrap_or(16000);

    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(_) => break,
        };
        if packet.track_id() != track_id { continue; }

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let spec = *decoded.spec();
        let mut sample_buf = SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
        sample_buf.copy_interleaved_ref(decoded);

        let channels = spec.channels.count();
        let raw = sample_buf.samples();

        // Mixdown vers mono si stéréo
        if channels == 1 {
            samples.extend_from_slice(raw);
        } else {
            for chunk in raw.chunks(channels) {
                let mono = chunk.iter().sum::<f32>() / channels as f32;
                samples.push(mono);
            }
        }
    }

    // Resample vers 16kHz si nécessaire
    if sample_rate != 16000 {
        use rubato::{Resampler, SincFixedIn, SincInterpolationType, SincInterpolationParameters, WindowFunction};
        let params = SincInterpolationParameters {
            sinc_len: 256,
            f_cutoff: 0.95,
            interpolation: SincInterpolationType::Linear,
            oversampling_factor: 256,
            window: WindowFunction::BlackmanHarris2,
        };
        let mut resampler = SincFixedIn::<f32>::new(
            16000 as f64 / sample_rate as f64,
            2.0,
            params,
            samples.len(),
            1,
        ).context("Erreur création resampler rubato")?;

        let waves_in = vec![samples];
        let waves_out = resampler.process(&waves_in, None)
            .context("Erreur lors du resampling")?;
        Ok(waves_out[0].clone())
    } else {
        Ok(samples)
    }
}
