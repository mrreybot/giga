import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constant.js";

<<<<<<< HEAD
const apiUrl = "/choreo-apis/awbo/backend/rest-api-be2/v1.0";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Refresh token fonksiyonu
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await axios.post(`${apiUrl}/token/refresh/`, {
=======
// Production URL (opsiyonel)
const apiUrl = 'http://10.253.235.227:8000';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : apiUrl,
  timeout: 10000,
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
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
      refresh: refreshToken
    });

    const { access } = response.data;
<<<<<<< HEAD
    
    // Yeni access token'ı kaydet
    localStorage.setItem(ACCESS_TOKEN, access);
    
    return access;
  } catch (error) {
    // Refresh token'ı da geçersizse çıkış yap
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    
    // Login sayfasına yönlendir
    window.location.href = '/login';
    
=======
    localStorage.setItem(ACCESS_TOKEN, access);

    console.log("✅ Token refreshed successfully");
    return access;
  } catch (error) {
    console.error("❌ Token refresh failed:", error);

    // Refresh token'ı da geçersizse çıkış yap
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);

    // Login sayfasına yönlendir
    window.location.href = '/';

>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
    throw error;
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
<<<<<<< HEAD
    console.log("Token:", token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
=======

    console.log("📤 Request to:", config.url);
    console.log("🔑 Token exists:", !!token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("✅ Authorization header set");
    } else {
      console.warn("⚠️  No token in localStorage");
    }

    // ✅ FormData için Content-Type'ı KALDIRMA (axios otomatik ekleyecek)
    // Eğer data FormData ise, Content-Type'ı siliyoruz
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log("📦 FormData detected - Content-Type removed (axios will set it automatically)");
    } else {
      // Normal JSON istekleri için
      config.headers['Content-Type'] = 'application/json';
    }

    console.log("📋 Final Headers:", config.headers);

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
<<<<<<< HEAD
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Eğer token expire olduysa ve daha önce refresh denenmediyse
    if (
      error.response?.status === 401 && 
      !originalRequest._retry
    ) {
=======
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
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
      originalRequest._retry = true;

      try {
        // Yeni access token al
        const newAccessToken = await refreshAccessToken();

        // Orijinal isteğin header'ını güncelle
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // İsteği tekrar dene
<<<<<<< HEAD
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token'ı da geçersizse çıkış yap
=======
        console.log("🔄 Retrying original request with new token...");
        return api(originalRequest);
      } catch (refreshError) {
        console.error("❌ Refresh failed, logout user:", refreshError);
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;