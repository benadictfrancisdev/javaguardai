import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const client = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add Authorization header from localStorage
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: redirect to /login on 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fg_token');
      localStorage.removeItem('fg_customer');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth functions
export const login = async (email, password) => {
  const response = await client.post('/auth/login', { email, password });
  const { token, customer } = response.data;
  localStorage.setItem('fg_token', token);
  localStorage.setItem('fg_customer', JSON.stringify(customer));
  return response.data;
};

export const register = async (email, password, company_name) => {
  const response = await client.post('/auth/register', { email, password, company_name });
  const { token, customer } = response.data;
  localStorage.setItem('fg_token', token);
  localStorage.setItem('fg_customer', JSON.stringify(customer));
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await client.get('/auth/me');
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('fg_token');
  localStorage.removeItem('fg_customer');
  window.location.href = '/login';
};

// Incidents functions
export const getIncidents = async (status = null, limit = 50) => {
  const params = new URLSearchParams({ limit });
  if (status && status !== 'all') params.append('status', status);
  const response = await client.get(`/incidents?${params}`);
  return response.data;
};

export const getIncident = async (id) => {
  const response = await client.get(`/incidents/${id}`);
  return response.data;
};

export const resolveIncident = async (id) => {
  const response = await client.patch(`/incidents/${id}/resolve`);
  return response.data;
};

export const reanalyseIncident = async (id) => {
  const response = await client.post(`/incidents/${id}/reanalyse`);
  return response.data;
};

// Submit stack trace for analysis (uses API key)
export const submitStackTrace = async (data) => {
  const customer = JSON.parse(localStorage.getItem('fg_customer') || '{}');
  const response = await axios.post(`${API_URL}/api/incidents/exceptions`, {
    api_key: customer.api_key,
    ...data
  });
  return response.data;
};

// Metrics functions
export const getMetrics = async (limit = 60) => {
  const response = await client.get(`/metrics/latest?limit=${limit}`);
  return response.data;
};

export const getMetricsSummary = async (hours = 24) => {
  const response = await client.get(`/metrics/summary?hours=${hours}`);
  return response.data;
};

// Health check
export const healthCheck = async () => {
  const response = await client.get('/health');
  return response.data;
};

export default client;
