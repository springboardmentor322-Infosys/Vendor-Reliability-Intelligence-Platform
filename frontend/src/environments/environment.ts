const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  // Local Angular development uses the local FastAPI server.
  // A deployed frontend can continue using the hosted Render API.
  apiUrl:
    host === 'localhost' || host === '127.0.0.1'
      ? 'http://127.0.0.1:8000'
      : 'https://vendor-reliability-intelligence-platform-2h9h.onrender.com',
};
