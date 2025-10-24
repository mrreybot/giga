// src/services/authService.js
import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// optional: interceptors ile token ekleme (protected istekler için)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const login = async (credentials) => {
  const res = await API.post("/auth/login", credentials);
  return res.data;
};

const authService = { login };

export default authService;
