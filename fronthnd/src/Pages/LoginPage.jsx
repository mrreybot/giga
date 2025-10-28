import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../src/services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../src/services/constant";
import "../styles/Login.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const res = await api.post("/api/token/", { 
        username: email, 
        password
      });

      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

      console.log("Login successful:", res.data);
      navigate("/dashboard");
    } catch (error) {
      alert(error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    try {
      await api.post("/api/user/register/", { 
        username: regEmail,
        password: regPassword
      });
      
      setIsRegister(false);
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      navigate("/login");
    } catch (error) {
      alert(error);
    }
  };

  return (
    <div className="login-container">
      <div className={`login-card transition-transform duration-500 ${isRegister ? "-translate-x-full" : "translate-x-0"}`}>
        {/* LOGIN PANEL */}
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
      </div>

      {/* REGISTER PANEL */}
      <div className={`login-card absolute top-0 left-0 transition-transform duration-500 ${isRegister ? "translate-x-0" : "translate-x-full"}`}>
        <h2>Create Account</h2>
        <p className="subtitle">Sign up to start managing tasks</p>

        <form onSubmit={handleRegister}>
          <label>Name</label>
          <input
            type="text"
            placeholder="Your Name"
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            required
          />

          <label>Email</label>
          <input
            type="email"
            placeholder="example@mail.com"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            required
          />

          <button type="submit" className="login-btn">Register</button>
        </form>

        <p className="login-footer mt-4 text-center">
          Already have an account? 
          <button className="text-blue-600 ml-1 font-semibold" onClick={() => setIsRegister(false)}>Login</button>
        </p>
      </div>

      {/* Sağ taraf görsel kısmı */}
      <div className="login-side">
        <h1>Task Manager</h1>
        <p>Organize your work efficiently and boost productivity 📈</p>
        <button
          className="mt-6 px-4 py-2 bg-white text-blue-600 font-semibold rounded shadow hover:bg-gray-200 transition-all"
          onClick={() => setIsRegister(true)}
        >
          Create Account
        </button>
      </div>
    </div>
  );
};

export default LoginPage;