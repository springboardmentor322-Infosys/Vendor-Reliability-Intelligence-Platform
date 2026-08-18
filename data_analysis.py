import pandas as pd

FILE_PATH = "data/DataCoSupplyChainDataset.csv"

df = pd.read_csv(
    FILE_PATH,
    encoding="latin1"
)

print("===================================")
print("DATASET BASIC INFORMATION")
print("===================================")

print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\n===================================")
print("COLUMN NAMES")
print("===================================")

print(df.columns.tolist())

print("\n===================================")
print("MISSING VALUES")
print("===================================")

print(df.isnull().sum())

print("\n===================================")
print("DUPLICATE ROWS")
print("===================================")

print(df.duplicated().sum())

print("\n===================================")
print("DELIVERY STATUS")
print("===================================")

print(df["Delivery Status"].value_counts())

print("\n===================================")
print("LATE DELIVERY RISK")
print("===================================")

print(df["Late_delivery_risk"].value_counts())

print("\n===================================")
print("ORDER STATUS")
print("===================================")

print(df["Order Status"].value_counts())

print("\n===================================")
print("SHIPPING MODE")
print("===================================")

print(df["Shipping Mode"].value_counts())