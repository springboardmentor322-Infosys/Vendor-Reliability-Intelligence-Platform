from pydantic import BaseModel

class VendorCreate(BaseModel):
    name: str
    delivery: str
    category: str
    status: str
    score: int
    quality: int
    response_time: int
    
class VendorResponse(VendorCreate):
    id: int

    class Config:
        from_attributes = True    