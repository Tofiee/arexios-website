import React, { createContext, useState, useEffect } from 'react';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
  const checkAuth = async () => {
    // Check if we are redirected from an OAuth success callback
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
       localStorage.setItem('access_token', urlToken);
       // Wipe the token from the URL bar for security and cleanliness
       window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = localStorage.getItem('access_token');
    console.log('[AuthContext] checkAuth: token exists:', !!token);
    if (token) {
      try {
        const response = await api.get('/users/me');
        console.log('[AuthContext] checkAuth: user data:', response.data);
        console.log('[AuthContext] checkAuth: steam_id:', response.data?.steam_id);
        setUser(response.data);
      } catch (error) {
        console.error("[AuthContext] Token invalid or expired", error);
        localStorage.removeItem('access_token');
        setUser(null);
      }
    }
    setLoading(false);
    console.log('[AuthContext] checkAuth: loading set to false, user:', user);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // We no longer manually login/register because of OAuth redirects.
  // Instead, the components will redirect to the backend auth URLs.

  const logoutUser = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
