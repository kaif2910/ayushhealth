from pathlib import Path

def extract_ocr_text(file_path: Path) -> tuple[str, str | None]:
    return "", "OCR processing is disabled on the Vercel cloud deployment. Please enter information manually."
