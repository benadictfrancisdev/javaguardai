import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('fg_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Incidents
  getIncidents: async (status = null, limit = 50, offset = 0) => {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.append('status', status);
    const response = await axios.get(`${API_URL}/api/incidents?${params}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getIncident: async (id) => {
    const response = await axios.get(`${API_URL}/api/incidents/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  resolveIncident: async (id) => {
    const response = await axios.patch(
      `${API_URL}/api/incidents/${id}/resolve`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  reanalyseIncident: async (id) => {
    const response = await axios.post(
      `${API_URL}/api/incidents/${id}/reanalyse`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Metrics
  getLatestMetrics: async (limit = 60) => {
    const response = await axios.get(`${API_URL}/api/metrics/latest?limit=${limit}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getMetricsSummary: async (hours = 24) => {
    const response = await axios.get(`${API_URL}/api/metrics/summary?hours=${hours}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Health
  healthCheck: async () => {
    const response = await axios.get(`${API_URL}/api/health`);
    return response.data;
  }
};
