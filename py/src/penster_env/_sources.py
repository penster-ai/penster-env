"""Internal: a pydantic-settings source wrapper that treats '' as unset.

Works across pydantic-settings 2.1.x .. 2.x (does NOT rely on the
`env_ignore_empty` config flag, which only exists from 2.2.0).
"""

from __future__ import annotations

from typing import Any

from pydantic_settings.sources import PydanticBaseSettingsSource


class DropEmptySource(PydanticBaseSettingsSource):
    """Delegates to a wrapped env/dotenv source, dropping empty-string values.

    A dropped key is absent, so pydantic falls through to the field default
    (or raises if the field is required) — i.e. empty string ≡ unset.
    """

    def __init__(self, wrapped: PydanticBaseSettingsSource) -> None:
        self._wrapped = wrapped
        super().__init__(wrapped.settings_cls)

    # Abstract in the base class; we never use it because we override __call__,
    # but it must exist to instantiate.
    def get_field_value(self, field: Any, field_name: str) -> tuple[Any, str, bool]:
        return None, field_name, False

    def __call__(self) -> dict[str, Any]:
        data = self._wrapped()
        return {
            key: value
            for key, value in data.items()
            if not (isinstance(value, str) and value == "")
        }
