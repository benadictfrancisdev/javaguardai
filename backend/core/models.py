import hashlib
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from core.database import Base


class Error(Base):
    __tablename__ = "errors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    error_text = Column(Text, nullable=False)
    hash = Column(String(64), nullable=False, index=True)
    service_name = Column(String(255), nullable=False, default="unknown")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    analysis = relationship(
        "Analysis", back_populates="error", uselist=False, cascade="all, delete-orphan"
    )

    @staticmethod
    def compute_hash(error_text: str) -> str:
        """Generate a SHA-256 hash of the error text for deduplication."""
        normalized = error_text.strip()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class Analysis(Base):
    __tablename__ = "analysis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    error_id = Column(
        Integer, ForeignKey("errors.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    root_cause = Column(Text, nullable=False, default="")
    why = Column(Text, nullable=False, default="")
    fix_steps = Column(Text, nullable=False, default="")
    code_fix = Column(Text, nullable=False, default="")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    error = relationship("Error", back_populates="analysis")
