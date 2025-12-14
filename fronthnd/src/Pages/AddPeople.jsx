import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../services/constant";
import "../styles/AddPeople.css";
import { UserPlus } from "lucide-react";

const AddPeople = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [userDepartment, setUserDepartment] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const navigate = useNavigate();

  // Kullanıcının departmanını kontrol et
  useEffect(() => {
    const checkUserDepartment = async () => {

      console.log("🔍 Checking user authorization...");

      // Önce token'ın var olduğundan emin ol - constant'tan import edilen değeri kullan
      const token = localStorage.getItem(ACCESS_TOKEN);
      console.log("🔑 Token check:", token ? "Token exists" : "No token found");

      if (!token) {
        console.warn("⚠️ No token found, redirecting to login");
        navigate("/");
        return;
      }

      // Backend'inizdeki UserProfileView endpoint'i
      const response = await api.get("/api/user/profile/");

      console.log("✅ User data received:", response.data);

      // Backend'den gelen departman bilgisi
      const dept = response.data.department || "";

      console.log("👤 User department:", dept);
      setUserDepartment(dept);
      setCheckingAuth(false);



    };

    checkUserDepartment();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // E-posta doğrulama
    if (!email.endsWith("@tuca.gov.tr")) {
      alert("Lütfen geçerli bir tuca adresi girin (@tuca.gov.tr)");
      return;
    }

    // Telefon numarası kontrolü
    if (phone && phone.length < 10) {
      alert("Lütfen geçerli bir telefon numarası girin");
      return;
    }

    setLoading(true);
    setSuccessMessage("");

    try {
      console.log("📤 Adding new user...");

      await api.post("/api/user/register/", {
        username: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
        email: email,
        department: department,
        phone: phone,
        role: role
      });


      // Başarılı kayıt sonrası formu temizle
      setSuccessMessage("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setDepartment("");
      setPhone("");
      setRole("");

      // 3 saniye sonra mesajı kaldır
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (error) {
      console.error("❌ Add user failed:", error.response?.data);

      if (error.response?.data) {
        const errors = error.response.data;
        let errorMessage = "Kullanıcı eklenemedi:\n";

        Object.keys(errors).forEach(key => {
          errorMessage += `${key}: ${errors[key]}\n`;
        });

        alert(errorMessage);
      } else {
        alert("Kullanıcı eklenirken bir hata oluştu!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setDepartment("");
    setPhone("");
    setRole("");
    setSuccessMessage("");
  };

  // Yetki kontrolü yapılırken loading göster
  if (checkingAuth) {
    return (
      <div className="add-people-container">
        <div className="add-people-card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Yetki kontrol ediliyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-people-container">
      <div className="add-people-card">
        <div className="card-header">
          <div className="icon-wrapper">
            <UserPlus size={32} />
          </div>
          <p className="subtitle">Sisteme yeni bir kullanıcı eklemek için bilgileri doldurun</p>
          {userDepartment && (
            <p className="user-dept-info">👤 Departmanınız: {userDepartment}</p>
          )}
        </div>

        {successMessage && (
          <div className="success-banner">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-people-form">
          {/* Ad ve Soyad */}
          <div className="form-row">
            <div className="form-group">
              <label>
                Ad <span className="required">*</span>
              </label>
              <input
                type="text"
                placeholder="Adı"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>
                Soyad <span className="required">*</span>
              </label>
              <input
                type="text"
                placeholder="Soyadı"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label>
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              placeholder="example@tuca.gov.tr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Departman ve Telefon */}
          <div className="form-row">
            <div className="form-group">
              <label>
                Departman <span className="required">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                disabled={loading}
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Rol Seçimi */}
          <div className="form-group">
            <label>
              Rol <span className="required">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Rol Seçiniz</option>
              <option value="CEO">CEO</option>
              <option value="MANAGER">Manager </option>
              <option value="EMPLOYEE">Employee </option>
            </select>
            <small className="helper-text">
            </small>
          </div>

          {/* Şifre */}
          <div className="form-group">
            <label>
              Şifre <span className="required">*</span>
            </label>
            <input
              type="password"
              placeholder="En az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="8"
              disabled={loading}
            />
            <small className="helper-text">Şifre en az 8 karakter içermelidir</small>
          </div>

          {/* Butonlar */}
          <div className="button-group">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Temizle
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Ekleniyor...
                </>
              ) : (
                "Kullanıcı Ekle"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPeople;