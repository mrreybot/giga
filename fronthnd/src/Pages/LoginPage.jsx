import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../services/constant";
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

      console.log("Giriş başarılı:", res.data);
      navigate("/home");
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
      console.log("Kayıt başarılı! Giriş yapabilirsiniz!");
    } catch (error) {
      // Detaylı hata mesajını görelim
      console.error("Hata detayı:", error.response?.data);
      alert(JSON.stringify(error.response?.data, null, 2));
    }
  };

  return (
    <div className="login-container">
      {/* LOGIN PANEL - Sadece bu görünecek */}
      {!isRegister && (
        <div className="login-card">
          <h2>Hoşgeldiniz</h2>
          <p className="subtitle">Görevlerinize erişmek için giriş yapın</p>

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

          <p className="login-footer">
            Hesabınız yok mu?{" "}
            <span className="register-link" onClick={() => setIsRegister(true)}>
              Kayıt Ol
            </span>
          </p>
        </div>
      )}

      {/* REGISTER PANEL - İstendiğinde görünecek */}
      {isRegister && (
        <div className="login-card">
          <h2>Hesabınızı oluşturalım</h2>
          <p className="subtitle">Devam etmek için kayıt olun</p>

          <form onSubmit={handleRegister}>
            <label>Name</label>
            <input
              type="text"
              placeholder="kullanıcı adı"
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

          <p className="login-footer">
            Zaten hesabınız var mı?{" "}
            <span className="register-link" onClick={() => setIsRegister(false)}>
              Giriş Yap
            </span>
          </p>
        </div>
      )}

      {/* SAĞ TARAF GRADIENT ALAN */}
      <div className="login-side">
        <div className="sidebar-content">
        <span className="collapsed-title">Görev Yönetimi</span>
        <p>Şirketinizi tek bir platformdan kontrol edin</p>
        <p>Her tıklamada düzen, her adımda ilerleme</p>
        <p>Her şey yerli yerinde.</p>
        <p>Değerinize değer katın.</p>
      </div>
    </div>
  </div>
  );
};

export default LoginPage;