from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


def get_all_products(db: Session):
    return db.query(Product).order_by(Product.id.desc()).all()


def get_product_by_id(db: Session, product_id: int):
    return (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )


def create_product(db: Session, product: ProductCreate):

    db_product = Product(
        vendor_id=product.vendor_id,
        product_name=product.product_name,
        category=product.category,
        unit_price=product.unit_price,
        stock_unit=product.stock_unit,
        lead_time_days=product.lead_time_days,
        warranty_months=product.warranty_months
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    return db_product


def update_product(
    db: Session,
    product_id: int,
    product: ProductUpdate
):

    db_product = get_product_by_id(db, product_id)

    if not db_product:
        return None

    update_data = product.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_product, key, value)

    db.commit()
    db.refresh(db_product)

    return db_product


def delete_product(
    db: Session,
    product_id: int
):

    db_product = get_product_by_id(db, product_id)

    if not db_product:
        return None

    db.delete(db_product)
    db.commit()

    return {
        "message": "Product deleted successfully"
    }