# VendorIntel Dataset

This folder contains snapshots of the mock dataset used to run and test the VendorIntel platform. These files are provided so that mentors and evaluators can easily understand the data schema and the initial data the application is working with.

## Included Files:

- **`vendors_dataset.csv`**: Contains the registered vendors on the platform, along with their risk levels, reliability ratings, delivery rates, and quality scores. 
- **`procurement_requests_dataset.csv`**: Contains the sample Procurement Requests (PRs) created across different departments, their estimated costs, and current approval statuses.
- **`purchase_orders_dataset.csv`**: Contains the Purchase Orders (POs) generated from approved PRs, linked to specific vendors, and tracks their fulfillment status.

## How to Update
To regenerate or update these dataset files after you've used the platform (e.g. adding new vendors or updating risk levels), simply run the `update_dataset.py` script located in the root directory:

```bash
python update_dataset.py
```
This will fetch the latest live data from the SQLite database and overwrite the CSV files in this folder.
