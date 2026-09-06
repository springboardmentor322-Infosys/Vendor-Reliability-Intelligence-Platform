from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None

    action: str
    module: str

    entity_type: Optional[str] = None
    entity_id: Optional[str] = None

    description: str

    old_values: Optional[Any] = None
    new_values: Optional[Any] = None

    ip_address: Optional[str] = None

    created_at: datetime