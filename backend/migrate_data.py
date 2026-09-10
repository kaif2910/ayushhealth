import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app import models

load_dotenv()

# Setup engines
sqlite_url = "sqlite:///./ayush_case_taking.db"
mysql_url = os.getenv("DATABASE_URL")

engine_sqlite = create_engine(sqlite_url)
SessionSQLite = sessionmaker(bind=engine_sqlite)

engine_mysql = create_engine(mysql_url)
SessionMySQL = sessionmaker(bind=engine_mysql)

# Clear existing tables in TiDB and recreate them fresh
print("Clearing cloud database and recreating tables...")
models.Base.metadata.drop_all(bind=engine_mysql)
models.Base.metadata.create_all(bind=engine_mysql)

db_sqlite = SessionSQLite()
db_mysql = SessionMySQL()

# List of models in the correct order to respect foreign keys (parents first)
tables_to_migrate = [
    models.Patient,
    models.Practitioner,
    models.CaseSheet,
    models.Document,
    models.Consultation,
    models.Prescription,
    models.EmailLog,
    models.AuditLog
]

print("Starting migration from local SQLite to cloud TiDB...")

for model in tables_to_migrate:
    print(f"Migrating table: {model.__tablename__}...")
    records = db_sqlite.query(model).all()
    
    if not records:
        print(f"  No records found in {model.__tablename__}, skipping.")
        continue
        
    for r in records:
        try:
            r_dict = {c.name: getattr(r, c.name) for c in r.__table__.columns}
            db_mysql.execute(model.__table__.insert().values(**r_dict))
            db_mysql.commit()
        except Exception as e:
            db_mysql.rollback()
            print(f"  Skipping orphaned record {model.__tablename__} ID {getattr(r, 'id', 'unknown')}: {e}")
            
    print(f"  Finished processing {model.__tablename__}.")

db_sqlite.close()
db_mysql.close()

print("Migration completed successfully! Your old data is now in TiDB.")
