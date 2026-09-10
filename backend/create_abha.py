from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.environ.get('DATABASE_URL'))
with engine.begin() as conn:
    conn.execute(text('''
    CREATE TABLE IF NOT EXISTS abha_registry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        abha_number VARCHAR(20) NOT NULL UNIQUE,
        patient_name VARCHAR(160) NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
    '''))
print('Table created successfully!')
