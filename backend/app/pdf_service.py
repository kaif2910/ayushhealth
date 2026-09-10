import io
from fpdf import FPDF
from . import models

def safe_text(text: str) -> str:
    if not text: return "N/A"
    # Replace common unicode chars before falling back to ?
    replacements = {
        '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
        '\u2013': '-', '\u2014': '-', '\u2026': '...'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return str(text).encode('latin-1', 'replace').decode('latin-1')

def generate_prescription_pdf(prescription: models.Prescription, patient: models.Patient, practitioner: models.Practitioner) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", style="B", size=16)
    
    # Header
    pdf.cell(0, 10, "AYUSH Medical Prescription", ln=True, align="C")
    pdf.ln(5)
    
    # Doctor Details
    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 8, f"Doctor: {safe_text(practitioner.name)} ({safe_text(practitioner.specialization)})", ln=True)
    pdf.cell(0, 8, f"Date: {prescription.created_at.strftime('%Y-%m-%d %H:%M')}", ln=True)
    pdf.ln(5)
    
    # Patient Details
    pdf.set_font("Helvetica", style="B", size=12)
    pdf.cell(0, 8, "Patient Details", ln=True)
    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 8, f"Name: {safe_text(patient.name)}", ln=True)
    pdf.cell(0, 8, f"Age/Gender: {patient.age} / {safe_text(patient.gender)}", ln=True)
    if patient.blood_group:
        pdf.cell(0, 8, f"Blood Group: {safe_text(patient.blood_group)}", ln=True)
    pdf.ln(5)
    
    # Medicine Details
    pdf.set_font("Helvetica", style="B", size=12)
    pdf.cell(0, 8, "Rx", ln=True)
    pdf.set_font("Helvetica", size=12)
    
    pdf.cell(0, 8, f"Medicine: {safe_text(prescription.medicine_name)}", ln=True)
    pdf.cell(0, 8, f"Dosage: {safe_text(prescription.dosage)}", ln=True)
    pdf.cell(0, 8, f"Frequency: {safe_text(prescription.frequency)}", ln=True)
    pdf.cell(0, 8, f"Duration: {safe_text(prescription.duration)}", ln=True)
    
    # Use multi_cell for instructions in case it's long
    pdf.multi_cell(0, 8, f"Instructions: {safe_text(prescription.instructions)}")
    
    pdf.cell(0, 8, f"Start Date: {safe_text(prescription.start_date)}", ln=True)
    pdf.cell(0, 8, f"End Date: {safe_text(prescription.end_date)}", ln=True)
    
    pdf.ln(15)
    pdf.set_font("Helvetica", style="I", size=10)
    pdf.cell(0, 8, "This is an electronically generated prescription.", ln=True, align="C")
    
    return bytes(pdf.output())

