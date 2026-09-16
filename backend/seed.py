"""Run VendorIQ's idempotent development-data seeder from the backend directory."""
from app.seed import seed

if __name__ == "__main__":
    seed()
