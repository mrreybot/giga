import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../services/constant";
import "../styles/Login.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  
  // Kayıt formu için genişletilmiş state'ler
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regDepartment, setRegDepartment] = useState("");
  const [regPhone, setRegPhone] = useState("");
  
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
    } catch {
      alert("Giriş başarısız! E-posta veya şifre hatalı.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // E-posta doğrulama - @gmail.com kontrolü
    if (!regEmail.endsWith("@gmail.com")) {
      alert("Lütfen geçerli bir Gmail adresi girin (@gmail.com)");
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
    }
  };

  return (
    <div className="login-container">
      {/* LOGIN PANEL */}
      {!isRegister && (
        <div className="login-card">
          <h2>Hoşgeldiniz</h2>
          <p className="subtitle">Görevlerinize erişmek için giriş yapın</p>

          <form onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="example@gmail.com"
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

      {/* REGISTER PANEL - Genişletilmiş */}
      {isRegister && (
        <div className="login-card register-extended">
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
              placeholder="example@gmail.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />

            {/* Departman ve Telefon - Yan yana */}
            <div className="form-row">
              <div className="form-group">
                <label>Departman</label>
                <input
                  type="text"
                  placeholder="Ör: IT, İnsan Kaynakları"
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                />
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