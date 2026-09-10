import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_abha_email(patient_email: str, patient_name: str, abha_number: str) -> tuple[bool, str | None]:
    host = os.environ.get("SMTP_HOST")
    port = os.environ.get("SMTP_PORT")
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    sender = os.environ.get("SMTP_FROM", username)
    
    if not host or not username or not password:
        return False, "SMTP is not configured in environment variables"
        
    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = patient_email
        msg['Subject'] = "Your Simulated ABHA Health ID"
        
        body = f"""
        Dear {patient_name},
        
        Your simulated ABHA Health ID has been successfully generated for this healthcare application.
        
        ABHA Number: {abha_number}
        
        You can now use this ID to log in and access your patient dashboard.
        
        IMPORTANT: This ABHA ID is generated only for the college/hackathon demonstration and is NOT an official Government of India ABHA number.
        
        Stay healthy!
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(host, int(port or 587))
        server.starttls()
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        return True, None
    except Exception as e:
        return False, str(e)

def send_prescription_email(patient_email: str, patient_name: str, medicine_name: str, dosage: str, frequency: str, duration: str, instructions: str) -> tuple[bool, str | None]:
    host = os.environ.get('SMTP_HOST')
    port = os.environ.get('SMTP_PORT')
    username = os.environ.get('SMTP_USERNAME')
    password = os.environ.get('SMTP_PASSWORD')
    sender = os.environ.get('SMTP_FROM', username)
    
    if not host or not username or not password:
        return False, 'SMTP is not configured in environment variables'
        
    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = patient_email
        msg['Subject'] = 'Your Prescription & Medicine Timer Details'
        
        body = f'''
        Dear {patient_name},
        
        A new prescription has been added to your case. Here are your medicine details and schedule:
        
        Medicine: {medicine_name}
        Dosage: {dosage}
        Frequency: {frequency}
        Duration: {duration}
        Instructions: {instructions}
        
        Please log into your Patient Dashboard to download the full PDF.
        
        Stay healthy!
        '''
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(host, int(port or 587))
        server.starttls()
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        return True, None
    except Exception as e:
        return False, str(e)

def send_password_reset_email(patient_email: str, patient_name: str, new_password: str) -> tuple[bool, str | None]:
    host = os.environ.get('SMTP_HOST')
    port = os.environ.get('SMTP_PORT')
    username = os.environ.get('SMTP_USERNAME')
    password = os.environ.get('SMTP_PASSWORD')
    sender = os.environ.get('SMTP_FROM', username)
    
    if not host or not username or not password:
        return False, 'SMTP is not configured in environment variables'
        
    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = patient_email
        msg['Subject'] = 'Your Password Has Been Reset'
        
        body = f'''
        Dear {patient_name},
        
        Your password has been successfully reset.
        
        Your new temporary password is: {new_password}
        
        Please log into your Patient Dashboard using this new password.
        
        Stay healthy!
        '''
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(host, int(port or 587))
        server.starttls()
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        return True, None
    except Exception as e:
        return False, str(e)
