from pydantic import BaseModel, Field


class ReliabilityFactorBreakdown(BaseModel):
    factor: str
    weight_pct: float = Field(description="Weight applied to this factor (e.g. 30 for 30%)")
    raw_score: float = Field(description="Factor score before weighting (0-100)")
    weighted_score: float = Field(description="Contribution to overall score")


class VendorReliabilityScore(BaseModel):
    vendor_id: int
    vendor_name: str
    overall_score: float = Field(ge=0, le=100)
    risk_level: str = Field(description="Low, Medium, or High")
    factors: list[ReliabilityFactorBreakdown]


class VendorRankingEntry(BaseModel):
    rank: int
    vendor_id: int
    vendor_name: str
    overall_score: float = Field(ge=0, le=100)
    risk_level: str
