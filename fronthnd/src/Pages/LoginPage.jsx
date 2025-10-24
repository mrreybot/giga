// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import "../styles/Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      // data.token beklentisi
      localStorage.setItem("token", data.token);
      // isteğe bağlı: kullanıcı bilgileri de kaydet
      // localStorage.setItem("user", JSON.stringify(data.user));
      setLoading(false);
      // Login başarılı -> dashboard (henüz yoksa /home veya /)
      navigate("/dashboard");
    } catch (err) {
      setLoading(false);
      setError(err?.response?.data?.message || err.message || "Giriş başarısız");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Giriş Yap</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
