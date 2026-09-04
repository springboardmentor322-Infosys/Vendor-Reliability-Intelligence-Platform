// Central place to point the frontend at the backend.
// Change this if your FastAPI server runs somewhere else.
// VendorIQ deliberately uses its own API port so it can run beside another
// localhost project without sharing its frontend or backend connection.
const API_BASE_URL = "http://localhost:18081/api/v1";
