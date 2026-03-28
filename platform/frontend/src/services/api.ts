import axios from 'axios';
import type { AuthResponse, SubmitResponse, DashboardStats, Project, CodeSnippet } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (_) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  getMe: () => api.get<{ user: AuthResponse['user'] }>('/auth/me'),
  updateProfile: (data: { full_name?: string; username?: string }) =>
    api.put('/auth/profile', data),
};

// Code
export const codeAPI = {
  submit: (data: { source_code: string; title?: string; project_id?: string }) =>
    api.post<SubmitResponse>('/code/submit', data),
  upload: (file: File, projectId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('project_id', projectId);
    return api.post<SubmitResponse>('/code/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getSnippets: (params?: { page?: number; limit?: number; status?: string; project_id?: string }) =>
    api.get<{ snippets: CodeSnippet[]; pagination: { total: number; page: number; totalPages: number } }>('/code/snippets', { params }),
  getSnippet: (id: string) =>
    api.get<{ snippet: CodeSnippet }>(`/code/snippets/${id}`),
  getFix: (id: string) =>
    api.post<{ fixedCode: string; changes: string[]; explanation: string }>(`/code/${id}/fix`),
  optimize: (id: string) =>
    api.post<{ optimizedCode: string; changes: string[]; explanation: string }>(`/code/${id}/optimize`),
  applyFix: (id: string, fixedCode: string) =>
    api.post<SubmitResponse>(`/code/${id}/apply-fix`, { fixedCode }),
};

// Projects
export const projectAPI = {
  list: (params?: { page?: number; limit?: number; archived?: boolean }) =>
    api.get<{ projects: Project[]; pagination: { total: number; page: number; totalPages: number } }>('/projects', { params }),
  create: (data: { name: string; description?: string }) =>
    api.post<{ project: Project }>('/projects', data),
  get: (id: string) =>
    api.get<{ project: Project }>(`/projects/${id}`),
  update: (id: string, data: { name: string; description?: string }) =>
    api.put<{ project: Project }>(`/projects/${id}`, data),
  delete: (id: string) =>
    api.delete(`/projects/${id}`),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getRecentErrors: () => api.get<{ errors: Array<{ id: string; error_type: string; error_message: string; severity: string; snippet: { id: string; title: string } }> }>('/dashboard/recent-errors'),
  getAIHistory: (params?: { page?: number; limit?: number }) =>
    api.get('/dashboard/ai-history', { params }),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
