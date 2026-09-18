import pandas as pd
from pathlib import Path

data = [
    [1, "Alpha_Inc", "2026-01-05", "2026-01-10", "Office Supplies", "Delivered", 100, 50, 47, 2, "Compliant"],
    [2, "Beta_Supplies", "2026-01-07", "2026-01-15", "Electronics", "Delivered", 50, 500, 475, 1, "Compliant"],
    [3, "Gamma_Co", "2026-01-10", "2026-01-18", "Packaging", "Pending", 200, 20, 18, 5, "Compliant"],
    [4, "Delta_Logistics", "2026-01-12", "2026-01-20", "MRO", "Partially Delivered", 150, 80, 75, 8, "Non-Compliant"],
    [5, "Epsilon_Group", "2026-01-15", "2026-01-25", "Raw Materials", "Delivered", 300, 100, 92, 4, "Compliant"],
    [6, "Alpha_Inc", "2026-01-18", "2026-01-28", "Electronics", "Delivered", 75, 450, 430, 2, "Compliant"],
    [7, "Beta_Supplies", "2026-01-20", "2026-01-30", "Office Supplies", "Cancelled", 120, 40, 38, 0, "Non-Compliant"],
    [8, "Gamma_Co", "2026-01-22", "2026-02-02", "Packaging", "Delivered", 250, 25, 23, 6, "Compliant"],
    [9, "Delta_Logistics", "2026-01-25", "2026-02-05", "Raw Materials", "Pending", 180, 90, 85, 3, "Compliant"],
    [10, "Epsilon_Group", "2026-01-28", "2026-02-08", "MRO", "Delivered", 90, 120, 112, 2, "Compliant"],
    [11, "Alpha_Inc", "2026-02-01", "2026-02-12", "Packaging", "Delivered", 220, 30, 28, 4, "Compliant"],
    [12, "Beta_Supplies", "2026-02-03", "2026-02-15", "Electronics", "Partially Delivered", 60, 600, 570, 5, "Non-Compliant"],
    [13, "Gamma_Co", "2026-02-05", "2026-02-18", "Office Supplies", "Delivered", 140, 55, 52, 2, "Compliant"],
    [14, "Delta_Logistics", "2026-02-08", "2026-02-20", "MRO", "Delivered", 110, 95, 90, 3, "Compliant"],
    [15, "Epsilon_Group", "2026-02-10", "2026-02-22", "Raw Materials", "Pending", 350, 105, 98, 7, "Compliant"],
]

columns = [
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

df = pd.DataFrame(data, columns=columns)

data_folder = Path("data")
data_folder.mkdir(exist_ok=True)

file_path = data_folder / "supply_chain_dataset.csv"

df.to_csv(file_path, index=False)

print(f"Dataset created successfully: {file_path}")
print(f"Total records: {len(df)}")
