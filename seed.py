"""Run the VendorIQ development-data seeder from the repository root."""
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.seed import seed


if __name__ == "__main__":
    seed()
