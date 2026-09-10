from pathlib import Path


def extract_ocr_text(file_path: Path) -> tuple[str, str | None]:
    """Return OCR text and optional degradation note."""
    try:
        import pytesseract
        from PIL import Image

        if file_path.suffix.lower() == ".pdf":
            from pdf2image import convert_from_path

            pages = convert_from_path(str(file_path), dpi=200)
            text = "\n\n".join(pytesseract.image_to_string(page) for page in pages)
        else:
            with Image.open(file_path) as image:
                text = pytesseract.image_to_string(image)
        text = text.strip()
        if not text:
            return "", "OCR completed but no machine-readable text was detected. Please review the document manually."
        return text, None
    except Exception as exc:
        return "", f"OCR processing unavailable; uploaded file was saved for manual review. {exc}"
