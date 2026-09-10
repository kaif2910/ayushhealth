"""initial SIH26047 schema

Revision ID: 0001
Revises:
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("gender", sa.String(length=40), nullable=False),
        sa.Column("contact", sa.String(length=80), nullable=False),
        sa.Column("abha_id", sa.String(length=20), nullable=True, unique=True),
        sa.Column("preferred_language", sa.String(length=40), nullable=False),
    )
    op.create_index("ix_patients_id", "patients", ["id"])
    op.create_table(
        "practitioners",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("specialization", sa.String(length=160), nullable=False),
        sa.Column("clinic_id", sa.String(length=80), nullable=False),
    )
    op.create_index("ix_practitioners_id", "practitioners", ["id"])
    op.create_index("ix_practitioners_clinic_id", "practitioners", ["clinic_id"])
    op.create_table(
        "case_sheets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("chief_complaint_raw", sa.Text(), nullable=False),
        sa.Column("chief_complaint_structured", sa.JSON(), nullable=False),
        sa.Column("duration", sa.String(length=120), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("history", sa.JSON(), nullable=False),
        sa.Column("lifestyle", sa.JSON(), nullable=False),
        sa.Column("prakriti_assessment", sa.JSON(), nullable=False),
        sa.Column("nadi_notes", sa.Text(), nullable=False),
        sa.Column("tongue_notes", sa.Text(), nullable=False),
        sa.Column("ai_summary", sa.Text(), nullable=False),
        sa.Column("fhir_export", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("current_step", sa.Integer(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_case_sheets_id", "case_sheets", ["id"])
    op.create_index("ix_case_sheets_patient_id", "case_sheets", ["patient_id"])
    op.create_index("ix_case_sheets_status", "case_sheets", ["status"])
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_sheet_id", sa.Integer(), sa.ForeignKey("case_sheets.id"), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("ocr_text", sa.Text(), nullable=False),
        sa.Column("document_type", sa.String(length=60), nullable=False),
    )
    op.create_index("ix_documents_id", "documents", ["id"])
    op.create_index("ix_documents_case_sheet_id", "documents", ["case_sheet_id"])


def downgrade() -> None:
    op.drop_table("documents")
    op.drop_table("case_sheets")
    op.drop_table("practitioners")
    op.drop_table("patients")
