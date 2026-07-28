import axios from 'axios';

const api = axios.create({
  baseURL: '/',
});

api.interceptors.request.use((config) => {
  // Prefer staff token if available, or visitor token for /api/app-auth, /api/checkins, /api/bookings, /api/issues
  const staffToken = localStorage.getItem('token');
  const hubToken = localStorage.getItem('hub_token');

  if (config.url?.includes('app-auth') || config.url?.includes('/checkins') || config.url?.includes('/bookings') || config.url?.includes('/issues')) {
    if (hubToken) {
      config.headers.Authorization = `Bearer ${hubToken}`;
      return config;
    }
  }

  if (staffToken) {
    config.headers.Authorization = `Bearer ${staffToken}`;
  } else if (hubToken) {
    config.headers.Authorization = `Bearer ${hubToken}`;
  }

  return config;
});

export default api;
