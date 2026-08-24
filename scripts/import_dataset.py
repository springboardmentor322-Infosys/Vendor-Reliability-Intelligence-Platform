import pandas as pd
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models


# Load CSV file
df = pd.read_csv("dataset/supply_chain_data.csv")


db: Session = SessionLocal()


for _, row in df.iterrows():

    supplier = row["Supplier name"]

    # Reliability calculation
    defect_rate = row["Defect rates"]

    quality_score = max(0, 100 - (defect_rate * 10))

    delivery_score = max(
        0,
        100 - (row["Lead time"] * 2)
    )


    overall_score = int(
        (delivery_score * 0.4)
        +
        (quality_score * 0.4)
        +
        (80 * 0.2)
    )


    vendor = models.VendorPerformance(

        vendor_name=supplier,

        delivery_score=int(delivery_score),

        quality_score=int(quality_score),

        reliability_score=int(overall_score),

        overall_score=int(overall_score)

    )


    db.add(vendor)



db.commit()

db.close()


print("Dataset imported successfully")