
from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
from pathlib import Path

router = APIRouter(
    prefix="/supply-chain",
    tags=["Supply Chain Analytics"]
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_FILE = BASE_DIR / "data" / "supply_chain_dataset.csv"



def calculate_analytics(df: pd.DataFrame):

    required_columns = [
        "PO_ID",
        "Supplier",
        "Order_Date",
        "Delivery_Date",
        "Item_Category",
        "Order_Status",
        "Quantity",
        "Unit_Price",
        "Negotiated_Price",
        "Defective_Units",
        "Compliance"
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Required columns are missing",
                "missing_columns": missing_columns
            }
        )

    df["Quantity"] = pd.to_numeric(
        df["Quantity"],
        errors="coerce"
    ).fillna(0)

    df["Defective_Units"] = pd.to_numeric(
        df["Defective_Units"],
        errors="coerce"
    ).fillna(0)

    df["Negotiated_Price"] = pd.to_numeric(
        df["Negotiated_Price"],
        errors="coerce"
    ).fillna(0)

    total_orders = len(df)

    total_suppliers = df["Supplier"].nunique()

    total_quantity = df["Quantity"].sum()

    total_defective_units = df["Defective_Units"].sum()

    total_purchase_value = (
        df["Quantity"] *
        df["Negotiated_Price"]
    ).sum()

    order_status = (
        df["Order_Status"]
        .fillna("Unknown")
        .value_counts()
        .to_dict()
    )

    supplier_orders = (
        df["Supplier"]
        .fillna("Unknown")
        .value_counts()
        .to_dict()
    )

    category_orders = (
        df["Item_Category"]
        .fillna("Unknown")
        .value_counts()
        .to_dict()
    )

    compliance = (
        df["Compliance"]
        .fillna("Unknown")
        .value_counts()
        .to_dict()
    )

    supplier_quantity = (
        df.groupby("Supplier")["Quantity"]
        .sum()
        .sort_values(ascending=False)
        .to_dict()
    )

    defective_by_supplier = (
        df.groupby("Supplier")["Defective_Units"]
        .sum()
        .sort_values(ascending=False)
        .to_dict()
    )

    return {
        "total_orders": int(total_orders),
        "total_suppliers": int(total_suppliers),
        "total_quantity": int(total_quantity),
        "total_defective_units": int(total_defective_units),
        "total_purchase_value": round(
            float(total_purchase_value),
            2
        ),
        "order_status": {
            str(key): int(value)
            for key, value in order_status.items()
        },
        "supplier_orders": {
            str(key): int(value)
            for key, value in supplier_orders.items()
        },
        "category_orders": {
            str(key): int(value)
            for key, value in category_orders.items()
        },
        "compliance": {
            str(key): int(value)
            for key, value in compliance.items()
        },
        "supplier_quantity": {
            str(key): int(value)
            for key, value in supplier_quantity.items()
        },
        "defective_by_supplier": {
            str(key): int(value)
            for key, value in defective_by_supplier.items()
        }
    }


@router.get("/analytics")
def get_supply_chain_analytics():

    if not DATA_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Supply-chain dataset not found"
        )

    try:
        df = pd.read_csv(DATA_FILE)
        return calculate_analytics(df)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to process dataset: {str(e)}"
        )


@router.post("/analytics")
async def upload_supply_chain_data(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file"
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    try:
        contents = await file.read()

        df = pd.read_csv(
            io.BytesIO(contents)
        )

        return calculate_analytics(df)

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to read the CSV file"
        )