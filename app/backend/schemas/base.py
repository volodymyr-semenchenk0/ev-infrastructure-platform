"""Base DTO class with the shared Pydantic configuration for the EV-charging DSS.

camelCase JSON wire format (per spec 2.1.6), snake_case Python attributes, and
ORM-compatible construction via from_attributes=True.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Shared base class for all request/response DTOs.

    Subclasses get camelCase JSON aliases automatically, may be constructed
    from ORM objects (`from_attributes=True`), and accept either the snake_case
    Python field name or the camelCase alias on input (`populate_by_name=True`).
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
