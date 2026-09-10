from pathlib import Path

def transcribe_audio(file_path: Path) -> tuple[str, str | None]:
    return "", "Voice transcription is disabled on the Vercel cloud deployment due to size limits. Please type your complaint manually."
