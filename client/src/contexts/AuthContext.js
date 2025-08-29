import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('pos_token');
    const userData = localStorage.getItem('pos_user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        
        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Set up axios interceptor to handle token expiration
        setupAxiosInterceptors();
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
      }
    }
    
    setLoading(false);
  }, []);

  const setupAxiosInterceptors = () => {
    // Add response interceptor to handle token expiration
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 403 && error.response?.data?.error === 'Invalid or expired token') {
          // Token expired, try to refresh
          try {
            const response = await axios.post('/api/refresh-token');
            const { token, user } = response.data;
            
            // Update stored data
            localStorage.setItem('pos_token', token);
            localStorage.setItem('pos_user', JSON.stringify(user));
            
            // Update authorization header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Update user state
            setUser(user);
            
            // Retry the original request
            const originalRequest = error.config;
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            logout();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/login', { username, password });
      const { token, user } = response.data;

      // Store token and user data
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(user));

      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Set up axios interceptor to handle token expiration
      setupAxiosInterceptors();

      setUser(user);
      toast.success(`Welcome back, ${user.username}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    // Remove stored data
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    
    // Remove authorization header
    delete axios.defaults.headers.common['Authorization'];
    
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('pos_user', JSON.stringify(updatedUser));
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isCashier = () => {
    return user?.role === 'cashier';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    isCashier,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
