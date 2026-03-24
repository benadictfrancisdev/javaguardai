import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch dashboard summary: total errors, errors by service, recent errors.
 */
export const getDashboard = async () => {
  const response = await client.get('/dashboard');
  return response.data;
};

/**
 * Fetch a single error by ID (includes analysis).
 */
export const getError = async (id) => {
  const response = await client.get(`/errors/${id}`);
  return response.data;
};

/**
 * Health check.
 */
export const healthCheck = async () => {
  const response = await client.get('/health');
  return response.data;
};

export default client;
