// All calls go same-origin (frontend and API share one Vercel domain in production), so the
// httpOnly session cookie rides along automatically with credentials: 'include'.
async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) { /* not JSON */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}

export const api = {
  requestLink: (email) => request('/api/auth/request-link', { method: 'POST', body: JSON.stringify({ email }) }),
  verify: (token) => request('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  buildings: () => request('/api/buildings'),
  addZone: (buildingId, label, color) =>
    request(`/api/buildings/${buildingId}/zones`, { method: 'POST', body: JSON.stringify({ label, color }) }),
  renameZone: (zoneId, label, color) =>
    request(`/api/zones/${zoneId}`, { method: 'PATCH', body: JSON.stringify({ label, color }) }),
  deleteZone: (zoneId) => request(`/api/zones/${zoneId}`, { method: 'DELETE' }),

  incidents: () => request('/api/incidents'),
  createIncident: (payload) => request('/api/incidents', { method: 'POST', body: JSON.stringify(payload) }),
  patchIncident: (id, patch) => request(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteIncident: (id) => request(`/api/incidents/${id}`, { method: 'DELETE' }),
  attachPhoto: (incidentId, blobUrl, filename) =>
    request(`/api/incidents/${incidentId}/photos`, { method: 'POST', body: JSON.stringify({ blob_url: blobUrl, filename }) }),
  exportCsvUrl: () => '/api/incidents/export.csv',

  users: () => request('/api/users'),
  addUser: (payload) => request('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deactivateUser: (id) => request(`/api/users/${id}/deactivate`, { method: 'POST' }),
  reactivateUser: (id) => request(`/api/users/${id}/reactivate`, { method: 'POST' }),
};

export const ROLE_CAPS = {
  admin: { create_incident: true, edit_full: true, edit_repair: true, delete: true, manage_zones: true, manage_users: true },
  editor: { create_incident: true, edit_full: true, edit_repair: true, delete: false, manage_zones: true, manage_users: false },
  reporter_repairer: { create_incident: true, edit_full: false, edit_repair: true, delete: false, manage_zones: false, manage_users: false },
  repairer: { create_incident: false, edit_full: false, edit_repair: true, delete: false, manage_zones: false, manage_users: false },
};

export function can(role, capability) {
  return !!(ROLE_CAPS[role] && ROLE_CAPS[role][capability]);
}

export const ROLE_LABELS = {
  admin: 'Admin',
  editor: 'Editor',
  reporter_repairer: 'Reporter + repairer',
  repairer: 'Repairer',
};
