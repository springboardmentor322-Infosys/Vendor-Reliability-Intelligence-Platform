# VendorIntel Platform

This project includes a backend API powered by FastAPI and a frontend dashboard. It features role-based authentication (`admin`, `procumentor`, `auditor`, `vendor`), secure password hashing using `bcrypt` and JWT authentication.

## How to Run the Project (Every Time)

Whenever you close the project and need to run it again, you must start both the backend server and open the frontend dashboard.

### 1. Start the Backend API (Do this FIRST!)

The backend needs to run so the frontend can retrieve data and log users in. **You MUST start the backend before going live with `index.html` or `login.html`.** 

> [!IMPORTANT]
> **Prerequisite:** This project uses a **MySQL** database. Make sure you have a local MySQL server (like XAMPP or MySQL Server) running with the default username `root` and password `1234` on port `3306`. If your credentials differ, update them in `backend/database.py`.

**First Time Setup:**
Before running the server for the first time, you must install dependencies and initialize the database. Open a terminal in the main project directory (`VendorIntel`) and run:

```bash
cd backend
# 1. Create and activate a virtual environment (Windows)
 venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000

# (If you are on Mac/Linux, use: source venv/bin/activate)

# 2. Install required Python packages
pip install -r requirements.txt

# 3. Initialize and seed the MySQL Database
python init_db.py
python seed_db.py
```

**Running the Server (Every Time):**
Once setup is complete, you simply need to start the Uvicorn server:

```bash
# From the backend folder with your virtual environment activated:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Keep this terminal window open. The backend API server will run at `http://127.0.0.cd1:8000`.

### 2. Open the Frontend Dashboard

The frontend doesn't require a complex build process. You have two options to open it:

**Option A (Easiest):**
Open your File Explorer, navigate to the `frontend` folder, and simply double-click on the `login.html` file. It will open directly in your web browser.

**Option B (Local Web Server):**
If you prefer to run it on a local web server (useful if you encounter any CORS issues):
1. Open a *new* terminal or command prompt (keep the backend one running).
2. Navigate to the frontend folder:
```bash
cd frontend
```
3. Start a simple Python web server:
```bash
python -m http.server 3000
```
4. Open your web browser and go to `http://localhost:3000/login.html`.

### 3. Testing Authentication & Roles

The database is seeded with test users across different roles. The system enforces strict Role-Based Access Control (RBAC) both in the frontend and backend APIs.

- **Admin Account**: 
  - Email: `admin@vendorintel.com`
  - Password: `1234`
  - *Role Profile*: The Admin is the technical manager of the platform itself. They handle system maintenance, set up new user accounts, and enforce security protocols.
  - *Permissions*: Absolute, unrestricted control (full Read, Write, Update, and Delete access) over all endpoints. Routes to the Executive Console.

- **Procurement Officer**:
  - Email: `procumentor@vendorintel.com`
  - Password: `1234`
  - *Role Profile*: The business-focused user who manages the day-to-day relationships with vendor companies (registering vendors, tracking deliveries).
  - *Permissions*: Full editing rights (CRUD) for vendor profiles, evaluation logs, and dispute histories. Routes to the Procurement Console.

- **Risk Auditor**:
  - Email: `auditor@vendorintel.com`
  - Password: `1234`
  - *Role Profile*: An independent user who monitors supply chain compliance and checks historical performance trends.
  - *Permissions*: Strictly Read-Only access to dashboards, vendor profiles, and risk matrices. Any write API calls are blocked. Routes to the Auditor Console.

- **Vendor Account**:
  - Email: `vendor@vendorintel.com`
  - Password: `1234`
  - *Routes to the simplified Vendor Dashboard.*

### 4. Forgot Password Flow

1. On the login page, click the **Forgot key?** link.
2. Enter any registered email (e.g., `vendor@vendorintel.com`) and click submit.
3. Because we don't have an email server configured, the application will display a demo "Click here to reset password" link on the page.
4. Click the link to go to the Reset Password page.
5. Enter a new password and submit. You can now return to the login page and sign in with the new password.
