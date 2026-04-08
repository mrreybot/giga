import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
import api from "../../src/services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../src/services/constant";
import "../styles/Login.css";
=======
import api from "../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../services/constant";
import "../styles/Login.css";
import "../styles/Register.css";
import logo from '../assets/tca_logo.png'; // logo ekleme

>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
<<<<<<< HEAD
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
=======
  // Kayıt formu için genişletilmiş state'ler
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regDepartment, setRegDepartment] = useState("");
  const [regPhone, setRegPhone] = useState("");
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    
    try {
      const res = await api.post("/api/token/", { 
        username: email, 
=======

    try {
      const res = await api.post("/api/token/", {
        username: email,
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
        password
      });

      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

<<<<<<< HEAD
      console.log("Login successful:", res.data);
      navigate("/dashboard");
    } catch (error) {
      alert(error);
=======
      console.log("Giriş başarılı:", res.data);
      navigate("/home");
    } catch {
      alert("Giriş başarısız! E-posta veya şifre hatalı.");
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    
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
=======

    if (!regEmail.endsWith("@tuca.gov.tr")) {
      alert("Lütfen geçerli bir TUCA e-posta adresi girin (@tuca.gov.tr)");
      return;
    }

    // Telefon numarası basit kontrolü (opsiyonel)
    if (regPhone && regPhone.length < 10) {
      alert("Lütfen geçerli bir telefon numarası girin");
      return;
    }

    try {
      await api.post("/api/user/register/", {
        username: regEmail,
        password: regPassword,
        first_name: regFirstName,
        last_name: regLastName,
        email: regEmail,
        department: regDepartment,
        phone: regPhone
      });
      // Başarılı kayıt sonrası formu temizle ve login ekranına geç
      alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
      setIsRegister(false);
      setRegFirstName("");
      setRegLastName("");
      setRegEmail("");
      setRegPassword("");
      setRegDepartment("");
      setRegPhone("");
    } catch (error) {
      console.error("Hata detayı:", error.response?.data);
      // Daha anlaşılır hata mesajı
      if (error.response?.data) {
        const errors = error.response.data;
        let errorMessage = "Kayıt başarısız:\n";

        Object.keys(errors).forEach(key => {
          errorMessage += `${key}: ${errors[key]}\n`;
        });

        alert(errorMessage);
      } else {
        alert("Kayıt sırasında bir hata oluştu!");
      }
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
    }
  };

  return (
    <div className="login-container">
<<<<<<< HEAD
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
=======
      {/* LOGIN PANEL */}
      {/* logo eklendi  */}
      {!isRegister && (
        
        <div className="login-card">
          <div className="logo-container">
            <img src={logo} alt="Uygulama Logosu" className="auth-logo" />
          </div>
          <h2>Hoşgeldiniz</h2>
          <p className="subtitle">Görevlerinize erişmek için giriş yapın</p>

          <form onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="example@tuca.gov.tr"
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

      {/* REGISTER PANEL - Genişletilmiş  */}
       {/* logo eklendi  */}
      {isRegister && (
        <div className="login-card register-extended">
           <div className="logo-container">
            <img src={logo} alt="Uygulama Logosu" className="auth-logo" />
          </div>
          
          <h2>Hesabınızı oluşturalım</h2>
          <p className="subtitle">Devam etmek için bilgilerinizi girin</p>

          <form onSubmit={handleRegister}>
            {/* Ad Soyad - Yan yana */}
            <div className="form-row">
              <div className="form-group">
                <label>Ad *</label>
                <input
                  type="text"
                  placeholder="Adınız"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Soyad *</label>
                <input
                  type="text"
                  placeholder="Soyadınız"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <label>Email *</label>
            <input
              type="email"
              placeholder="example@tuca.gov.tr"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />

            {/* Departman ve Telefon - Yan yana */}
            <div className="form-row">
              <div className="form-group">
                <label>Departman *</label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  required
                >
                  <option value="">Departman Seçiniz</option>
                  <option value="Yönetim">Yönetim</option>
                  <option value="Depozito Yönetim Sistemi">Depozito Yönetim Sistemi</option>
                  <option value="Geri Kazanım ve Üretici">Geri Kazanım ve Üretici</option>
                  <option value="Çevre Koruma">Çevre Koruma</option>
                  <option value="Bilgi Teknolojileri">Bilgi Teknolojileri</option>
                  <option value="İnsan Kaynakları">İnsan Kaynakları</option>
                </select>
              </div>

              <div className="form-group">
                <label>Telefon</label>
                <input
                  type="tel"
                  placeholder="+90 5XX XXX XX XX"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Şifre */}
            <label>Şifre *</label>
            <input
              type="password"
              placeholder="••••••••"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
              minLength="8"
            />
            <small className="helper-text">En az 8 karakter olmalıdır</small>

            <button type="submit" className="login-btn">Kayıt Ol</button>
          </form>

          <p className="login-footer">
            Zaten hesabınız var mı?{" "}
            <span className="register-link" onClick={() => setIsRegister(false)}>
              Giriş Yap
            </span>
          </p>
        </div>
      )}
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
    </div>
  );
};

<<<<<<< HEAD
export default LoginPage;
=======
export default LoginPage;
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
