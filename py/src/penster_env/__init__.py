"""penster_env — the one env boundary every Penster Python service uses.

The single invariant (see ../../SPEC.md):

    empty string ≡ unset.

Two ways to adopt it:

1. pydantic-settings services — subclass ``PensterBaseSettings`` instead of
   ``BaseSettings``. Empty env values are dropped before validation, so
   ``Optional`` / defaulted fields fall back and required fields (no default)
   raise ``ValidationError``.

       class Settings(PensterBaseSettings):
           database_url: str                 # required -> raises if empty/absent
           otp_channel: str = "sms"           # defaulted -> "sms" if empty/absent
           pixel_id: str | None = None        # optional -> None if empty/absent

2. raw ``os.getenv`` call sites (while migrating) — use ``getenv`` /
   ``require`` which treat empty as absent.

Required-ness is enforced by the field being non-optional (or by ``require``),
never by trusting that '' counts as present.
"""

from __future__ import annotations

import os
from typing import Mapping, Optional, overload

from pydantic_settings import BaseSettings, SettingsConfigDict

from ._sources import DropEmptySource

__all__ = ["PensterBaseSettings", "clean_environ", "getenv", "require"]


class PensterBaseSettings(BaseSettings):
    """BaseSettings that treats empty env values as unset."""

    model_config = SettingsConfigDict(extra="ignore")

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        return (
            init_settings,
            DropEmptySource(env_settings),
            DropEmptySource(dotenv_settings),
            file_secret_settings,
        )


def clean_environ(source: Optional[Mapping[str, str]] = None) -> dict[str, Optional[str]]:
    """Return a copy of the environment with '' values mapped to None."""
    src = os.environ if source is None else source
    return {key: (None if value == "" else value) for key, value in src.items()}


class MissingEnvError(RuntimeError):
    pass


@overload
def getenv(key: str) -> Optional[str]: ...
@overload
def getenv(key: str, default: str) -> str: ...


def getenv(key: str, default: Optional[str] = None) -> Optional[str]:
    """os.getenv with empty ≡ unset. Returns ``default`` for missing/empty."""
    value = os.environ.get(key)
    if value is None or value == "":
        return default
    return value


def require(key: str) -> str:
    """Return a required env var, raising if missing, empty, or whitespace."""
    value = os.environ.get(key)
    if value is None or value.strip() == "":
        raise MissingEnvError(f"[penster_env] Missing required env: {key}")
    return value
