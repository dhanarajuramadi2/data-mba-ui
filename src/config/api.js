// Single place to configure the DataMBA backend address.
//
// VITE_API_BASE_URL (set in .env.local, see .env.example):
//   - Empty (default): requests go to /api on the Vite dev server, which
//     proxies them to the local FastAPI backend. No CORS setup needed.
//   - A full URL, e.g. https://datamba-dev.example.com: requests go straight
//     to that server, which must allow this site's origin (CORS).
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const API_ENDPOINTS = {
  profileCsv: '/api/v1/files/profile',
};

// The backend's limit for profiling uploads
export const MAX_PROFILE_UPLOAD_BYTES = 10 * 1024 * 1024;

export const apiUrl = (path) => `${API_BASE_URL}${path}`;
