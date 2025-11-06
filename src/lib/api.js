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

export default api;
