from pathlib import Path

_model = None


def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        # Tiny keeps first demo download/CPU footprint reasonable. Override with
        # WHISPER_MODEL=base/small for better accuracy when resources allow.
        _model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _model


def transcribe_audio(file_path: Path) -> tuple[str, str | None]:
    try:
        model = _get_model()
        segments, _info = model.transcribe(str(file_path), beam_size=3, vad_filter=True)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        if not text:
            return "", "Voice processing completed but no speech was detected. You can type the complaint manually."
        return text, None
    except Exception as exc:
        return "", f"Voice processing unavailable; please type the complaint manually. {exc}"
