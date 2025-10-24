import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // Şimdilik geçici login → backend bağlanınca değiştirilecek
    if (email === "test@test.com" && password === "123456") {
      navigate("/dashboard");
    } else {
      alert("Email veya şifre hatalı!");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome Back 👋</h2>
        <p className="subtitle">Sign in to continue</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="login-btn">Log In</button>
        </form>

        <div className="login-footer">
          <a href="#">Forgot Password?</a>
          <p>
            Don’t have an account?{" "}
            <span className="register-link">Sign Up</span>
          </p>
        </div>
      </div>

      {/* Sağ taraf görsel kısmı */}
      <div className="login-side">
        <h1>Task Manager</h1>
        <p>Organize your work efficiently and boost productivity 📈</p>
      </div>
    </div>
  );
};

export default LoginPage;
