import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constant.js";

const apiUrl = "/choreo-apis/awbo/backend/rest-api-be2/v1.0";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : apiUrl,
  timeout: 10000,
});

// Refresh token fonksiyonu
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await axios.post(`${apiUrl}/token/refresh/`, {
      refresh: refreshToken
    });

    const { access } = response.data;
    
    // Yeni access token'ı kaydet
    localStorage.setItem(ACCESS_TOKEN, access);
    
    return access;
  } catch (error) {
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
    console.log("Token:", token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Eğer token expire olduysa ve daha önce refresh denenmediyse
    if (
      error.response?.status === 401 && 
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Yeni access token al
        const newAccessToken = await refreshAccessToken();

        // Orijinal isteğin header'ını güncelle
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // İsteği tekrar dene
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token'ı da geçersizse çıkış yap
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;