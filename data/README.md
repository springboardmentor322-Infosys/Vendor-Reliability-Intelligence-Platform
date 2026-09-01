# VendorIQ Dataset

Primary dataset: **DataCo Smart Supply Chain Dataset**.

- `DataCoSupplyChainDataset.csv` — primary operational supply-chain data.
- `DescriptionDataCoSupplyChain.csv` — field descriptions supplied with the dataset.

The DataCo file is an order-line dataset. VendorIQ imports unique orders and products from it, then derives delivery and performance metrics. VendorIQ-only entities such as vendor master details, contracts, invoices, communications, certifications, notifications and quality inspections are generated as supplemental demo/business data because those fields do not exist in DataCo.

Run the importer from `VendorIQ/backend`:

```powershell
python seed_database.py
```
