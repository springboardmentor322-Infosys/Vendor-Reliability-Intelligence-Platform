from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class KPISummary(BaseModel):
    label: str
    value: str
    trend: str
    is_up: bool

class DashboardSummaryResponse(BaseModel):
    role: str
    kpis: List[KPISummary] = []
    recent_vendors: Optional[List[Dict[str, Any]]] = None
    recent_prs: Optional[List[Dict[str, Any]]] = None
    active_pos: Optional[List[Dict[str, Any]]] = None
    recent_pos: List[Any] = []
    upcoming_contracts: List[Any] = []
    alerts: List[Any] = []
    unread_messages_count: int = 0
    recent_communications: Optional[List[Dict[str, Any]]] = None
