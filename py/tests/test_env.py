import os

import pytest
from pydantic import ValidationError

from penster_env import PensterBaseSettings, clean_environ, getenv, require, MissingEnvError


class Settings(PensterBaseSettings):
    database_url: str                      # required
    otp_channel: str = "sms"               # defaulted
    pixel_id: str | None = None            # optional


def _clear(monkeypatch, *keys):
    for k in keys:
        monkeypatch.delenv(k, raising=False)


def test_clean_environ_maps_empty_to_none():
    assert clean_environ({"A": "", "B": "x", "C": " "}) == {"A": None, "B": "x", "C": " "}


def test_optional_empty_is_unset(monkeypatch):
    _clear(monkeypatch, "OTP_CHANNEL", "PIXEL_ID")
    monkeypatch.setenv("DATABASE_URL", "postgres://x")
    monkeypatch.setenv("PIXEL_ID", "")        # empty -> None
    monkeypatch.setenv("OTP_CHANNEL", "")     # empty -> default
    s = Settings()
    assert s.pixel_id is None
    assert s.otp_channel == "sms"


def test_required_empty_fails(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")    # empty -> treated as missing
    with pytest.raises(ValidationError):
        Settings()


def test_required_present_ok(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://x")
    monkeypatch.setenv("OTP_CHANNEL", "whatsapp")
    assert Settings().otp_channel == "whatsapp"


def test_getenv_empty_is_default(monkeypatch):
    monkeypatch.setenv("FOO", "")
    assert getenv("FOO", "fallback") == "fallback"
    monkeypatch.setenv("FOO", "bar")
    assert getenv("FOO") == "bar"


def test_require_rejects_empty(monkeypatch):
    monkeypatch.setenv("FOO", "   ")
    with pytest.raises(MissingEnvError):
        require("FOO")
    monkeypatch.setenv("FOO", "bar")
    assert require("FOO") == "bar"
