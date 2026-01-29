// src/lib/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// keep the auth token in memory (per tab)
let currentToken = null;

export function setAuthToken(token) {
  currentToken = token || null;
  if (currentToken) {
    api.defaults.headers.common.Authorization = `Bearer ${currentToken}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// Add response interceptor to handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth token and session storage
      currentToken = null;
      delete api.defaults.headers.common.Authorization;
      sessionStorage.removeItem('auth_token');

      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Employee Profiles APIs
export async function getMyProfile() {
  const { data } = await api.get('/employee-profiles/me');
  return data;
}

export async function updateMyProfile(payload) {
  const { data } = await api.put('/employee-profiles/me', payload);
  return data;
}

export async function listEmployeeProfiles() {
  const { data } = await api.get('/employee-profiles');
  return data;
}

export async function updateEmployeeProfile(profileId, payload) {
  const { data } = await api.put(`/employee-profiles/${profileId}`, payload);
  return data;
}

export async function updateEmployeeAdminFields(profileId, payload) {
  const { data } = await api.put(`/employee-profiles/${profileId}/admin-fields`, payload);
  return data;
}

export async function deleteEmployeeProfile(profileId) {
  const { data } = await api.delete(`/employee-profiles/${profileId}`);
  return data;
}

// File Upload APIs
export async function uploadEmployeeFile(fileType, file) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post(
    `/employee-profiles/me/upload/${fileType}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

// Get file URL for viewing/downloading (admin)
export function getEmployeeFileUrl(profileId, fileType) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const token = sessionStorage.getItem('auth_token');
  const timestamp = new Date().getTime(); // Cache busting
  return `${baseUrl}/employee-profiles/${profileId}/file/${fileType}?token=${token}&t=${timestamp}`;
}

// Get current user's file URL
export function getMyFileUrl(fileType) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const token = sessionStorage.getItem('auth_token');
  const timestamp = new Date().getTime(); // Cache busting
  return `${baseUrl}/employee-profiles/me/file/${fileType}?token=${token}&t=${timestamp}`;
}
