# Vendor Reliability Platform - Fixed Project

## Run backend
From the project root:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

The backend uses `vendor.db` by default when no PostgreSQL environment variables are configured.

## Run frontend
In another terminal:

```powershell
cd frontend
npm install
npm start
```

Open the Angular URL shown by the terminal (normally http://localhost:4200).

## Demo accounts
The backend creates these accounts if they are missing:

- Administrator: `admin@gmail.com` / `admin123`
- Vendor: `santhu2711@gmail.com` / `santhu123`
- Procurement Manager: `procurement@gmail.com` / `procure123`
- Supply Chain Manager: `supplychain@gmail.com` / `supply123`
- Finance Officer: `finance@gmail.com` / `finance123`
- Auditor: `auditor@gmail.com` / `audit123`

## Important
- Existing database data is preserved.
- `dataset/supply_chain_data.csv` contains the full 100-row dataset.
- `dataset/supply_chain_data_backup.csv` is a backup copy.
- `vendor.db` is preserved.
- `vendor_backup.db` is a backup copy.
- Angular API URLs are centralized through `environment.apiUrl`; local frontend uses the local FastAPI server and a non-local host can use the Render API.
- Vendor pages use `/vendors/me`, so the logged-in vendor is resolved consistently instead of relying on an email match in the dataset.
