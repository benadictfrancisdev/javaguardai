import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fg_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    });
    const { token: newToken, customer } = response.data;
    localStorage.setItem('fg_token', newToken);
    setToken(newToken);
    setUser(customer);
    return customer;
  };

  const register = async (email, password, companyName) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, {
      email,
      password,
      company_name: companyName
    });
    const customer = response.data;
    // Auto-login after registration
    await login(email, password);
    return customer;
  };

  const logout = () => {
    localStorage.removeItem('fg_token');
    setToken(null);
    setUser(null);
  };

  const regenerateApiKey = async () => {
    const response = await axios.post(
      `${API_URL}/api/auth/regenerate-api-key`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setUser(prev => ({ ...prev, api_key: response.data.api_key }));
    return response.data.api_key;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    regenerateApiKey,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
