from pydantic import BaseModel


class ProductBase(BaseModel):

    vendor_id: int
    product_name: str
    category: str
    unit_price: float
    stock_unit: int
    lead_time_days: int
    warranty_months: int


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):

    vendor_id: int | None = None
    product_name: str | None = None
    category: str | None = None
    unit_price: float | None = None
    stock_unit: int | None = None
    lead_time_days: int | None = None
    warranty_months: int | None = None


class ProductResponse(ProductBase):

    id: int

    class Config:
        from_attributes = True