import { API_ENDPOINTS, MAX_PROFILE_UPLOAD_BYTES, apiUrl } from '../config/api';

// FastAPI puts errors in `detail`: a string, or a list of validation errors.
function readErrorDetail(body) {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).filter(Boolean).join('; ');
  return '';
}

// Sends a CSV to the profiling API and returns its JSON response
// ({ profile_id, filename, status, profiling_report }).
// Throws an Error with a message that is safe to show to the user.
export async function profileCsvFile(file, { signal } = {}) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Please choose a .csv file.');
  }

  if (file.size > MAX_PROFILE_UPLOAD_BYTES) {
    throw new Error(`${file.name} is larger than the 10 MB profiling limit.`);
  }

  const formData = new FormData();
  formData.append('file', file);

  const url = apiUrl(API_ENDPOINTS.profileCsv);
  const unreachable = new Error(
    `Could not reach the profiling service at ${url}. Check that the backend is running and reachable from this browser.`
  );
  let response;

  try {
    // No Content-Type header: the browser sets multipart/form-data with its boundary
    response = await fetch(url, { method: 'POST', body: formData, signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw unreachable;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = readErrorDetail(body);
    // 502-504 without a FastAPI detail come from the dev proxy or a gateway:
    // the backend itself did not answer
    if (!detail && [502, 503, 504].includes(response.status)) throw unreachable;
    throw new Error(detail || `The profiling service returned an error (HTTP ${response.status}).`);
  }

  if (!body?.profiling_report) {
    throw new Error('The profiling service returned an unexpected response.');
  }

  return body;
}
