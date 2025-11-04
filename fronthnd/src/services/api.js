import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constant.js";

// Production URL (opsiyonel)
const apiUrl = "http://localhost:8000";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

console.log("🌐 API Base URL:", api.defaults.baseURL);

// Refresh token fonksiyonu
const refreshAccessToken = async () => {
  try {
    console.log("🔄 Attempting to refresh token...");
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const response = await axios.post(`${apiUrl}/api/token/refresh/`, {
      refresh: refreshToken
    });

    const { access } = response.data;
    localStorage.setItem(ACCESS_TOKEN, access);
    
    console.log("✅ Token refreshed successfully");
    return access;
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    
    // Refresh token'ı da geçersizse çıkış yap
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    
    // Login sayfasına yönlendir
    window.location.href = '/login';
    
    throw error;
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    
    console.log("📤 Request to:", config.url);
    console.log("🔑 Token exists:", !!token);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("✅ Authorization header set");
    } else {
      console.warn("⚠️  No token in localStorage");
    }
    
    console.log("📋 Headers:", config.headers);
    
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("✅ Response success:", response.status, response.statusText);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error("❌ Response error:", error.response?.status);

    // Eğer token expire olduysa ve daha önce refresh denenmediyse
    if (
      error.response?.status === 401 && 
      !originalRequest._retry
    ) {
      console.log("🔐 Token expired, attempting refresh...");
      originalRequest._retry = true;

      try {
        // Yeni access token al
        const newAccessToken = await refreshAccessToken();

        // Orijinal isteğin header'ını güncelle
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // İsteği tekrar dene
        console.log("🔄 Retrying original request with new token...");
        return api(originalRequest);
      } catch (refreshError) {
        console.error("❌ Refresh failed, logout user:", refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;