from pydantic import BaseModel
from typing import List, Optional, Any

class KPISummary(BaseModel):
    label: str
    value: str
    trend: str
    is_up: bool

class DashboardSummaryResponse(BaseModel):
    role: str
    kpis: List[KPISummary] = []
    recent_vendors: List[Any] = []
    recent_prs: List[Any] = []
    recent_pos: List[Any] = []
    upcoming_contracts: List[Any] = []
    alerts: List[Any] = []
