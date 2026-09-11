import os
import re

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./ayush_case_taking.db",
)

# On Vercel, strip SSL verification params (the `cryptography` package is not
# available in the serverless runtime, so pymysql cannot verify certs).
if os.getenv("VERCEL") and "mysql" in DATABASE_URL:
    DATABASE_URL = re.sub(r"[?&]ssl_verify_cert=[^&]*", "", DATABASE_URL)
    DATABASE_URL = re.sub(r"[?&]ssl_verify_identity=[^&]*", "", DATABASE_URL)
    # Clean up leftover ? or & at the end
    DATABASE_URL = DATABASE_URL.rstrip("?&")

# On Vercel with SQLite fallback, use /tmp (the only writable directory)
if os.getenv("VERCEL") and DATABASE_URL.startswith("sqlite"):
    DATABASE_URL = "sqlite:////tmp/ayush_case_taking.db"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Vercel serverless functions are stateless — connection pools cause stale
# connections.  Use NullPool so each invocation gets a fresh connection.
if os.getenv("VERCEL"):
    engine = create_engine(DATABASE_URL, poolclass=NullPool, connect_args=connect_args)
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        connect_args=connect_args,
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
