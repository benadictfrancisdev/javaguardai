"""Tests for core models — hash computation and basic model behaviour."""

from core.models import Error


def test_compute_hash_deterministic():
    """Same text should always produce the same hash."""
    text = "java.lang.NullPointerException at Service.java:42"
    h1 = Error.compute_hash(text)
    h2 = Error.compute_hash(text)
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex digest


def test_compute_hash_strips_whitespace():
    """Leading/trailing whitespace should be ignored."""
    text = "  java.lang.NullPointerException  "
    h1 = Error.compute_hash(text)
    h2 = Error.compute_hash(text.strip())
    assert h1 == h2


def test_different_texts_produce_different_hashes():
    h1 = Error.compute_hash("NPE at line 1")
    h2 = Error.compute_hash("OOM at line 2")
    assert h1 != h2
