import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../services/constant";
import "../styles/Profile.css";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // profile, security, notifications
  
  // Profil bilgileri
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    unvan: "",
    role: "",
    phone: "",
    department: "",
    profile_photo: null
  });

  // Güvenlik bilgileri
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Bildirim ayarları
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    task_reminders: true,
    deadline_alerts: true,
    notification_email: ""
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get("/api/user/profile/");
      setProfileData({
        first_name: response.data.first_name || "",
        last_name: response.data.last_name || "",
        email: response.data.email || "",
        unvan: response.data.unvan || "",
        role: response.data.role || "",
        phone: response.data.phone || "",
        department: response.data.department || "",
        profile_photo: response.data.profile_photo || null
      });
      
      setNotificationSettings({
        email_notifications: response.data.email_notifications ?? true,
        task_reminders: response.data.task_reminders ?? true,
        deadline_alerts: response.data.deadline_alerts ?? true,
        notification_email: response.data.notification_email || response.data.email || ""
      });

      if (response.data.profile_photo) {
        setPreviewImage(response.data.profile_photo);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Profil yüklenemedi:", error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Dosya boyutu 5MB'dan küçük olmalıdır!");
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("first_name", profileData.first_name);
      formData.append("last_name", profileData.last_name);
      formData.append("unvan", profileData.unvan);
      formData.append("phone", profileData.phone);
      formData.append("department", profileData.department);
      
      if (photoFile) {
        formData.append("profile_photo", photoFile);
      }

      await api.patch("/api/user/profile/", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      alert("Profil başarıyla güncellendi!");
      fetchUserProfile();
    } catch (error) {
      console.error("Profil güncellenemedi:", error);
      alert("Profil güncellenirken bir hata oluştu!");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (securityData.newPassword !== securityData.confirmPassword) {
      alert("Yeni şifreler eşleşmiyor!");
      return;
    }

    if (securityData.newPassword.length < 8) {
      alert("Şifre en az 8 karakter olmalıdır!");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/user/change-password/", {
        old_password: securityData.currentPassword,
        new_password: securityData.newPassword
      });

      alert("Şifre başarıyla güncellendi!");
      setSecurityData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Şifre güncellenemedi:", error);
      alert(error.response?.data?.detail || "Şifre güncellenirken bir hata oluştu!");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.patch("/api/user/profile/", notificationSettings);
      alert("Bildirim ayarları güncellendi!");
    } catch (error) {
      console.error("Ayarlar güncellenemedi:", error);
      alert("Ayarlar güncellenirken bir hata oluştu!");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Profil yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profil Ayarları</h1>
      </div>

      <div className="profile-content">
        {/* Sol panel - Profil kartı */}
        <div className="profile-sidebar">
          <div className="profile-card">
            <div className="profile-photo-section">
              <div className="photo-wrapper">
                {previewImage ? (
                  <img src={previewImage} alt="Profil" className="profile-photo" />
                ) : (
                  <div className="photo-placeholder">
                    <span>{profileData.first_name?.charAt(0) || "?"}{profileData.last_name?.charAt(0) || ""}</span>
                  </div>
                )}
                <label htmlFor="photo-upload" className="photo-upload-btn">
                  ➕
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
            
            <div className="profile-info">
              <h2>{profileData.first_name} {profileData.last_name}</h2>
              <p className="profile-email">{profileData.email}</p>
              {profileData.unvan && (
                <span className="profile-badge">{profileData.unvan}</span>
              )}
              <span className={`role-badge ${profileData.role?.toLowerCase()}`}>
                {profileData.role}
              </span>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              Çıkış Yap
            </button>
          </div>
        </div>

        {/* Sağ panel - Tabs */}
        <div className="profile-main">
          <div className="profile-tabs">
            <button
              className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
               Profil Bilgileri
            </button>
            <button
              className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
               Güvenlik
            </button>
            <button
              className={`tab-btn ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
               Bildirimler
            </button>
          </div>

          <div className="tab-content">
            {/* Profil Bilgileri Tab */}
            {activeTab === "profile" && (
              <form onSubmit={handleProfileUpdate} className="profile-form">
                <h3>Kişisel Bilgiler</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Ad</label>
                    <input
                      type="text"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleInputChange}
                      placeholder="Adınız"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Soyad</label>
                    <input
                      type="text"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleInputChange}
                      placeholder="Soyadınız"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>E-posta</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="disabled-input"
                  />
                  <small>E-posta adresi değiştirilemez</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Ünvan</label>
                    <input
                      type="text"
                      name="unvan"
                      value={profileData.unvan}
                      onChange={handleInputChange}
                      placeholder="Ör: Yazılım Geliştirici"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Departman</label>
                    <input
                      type="text"
                      name="department"
                      value={profileData.department}
                      onChange={handleInputChange}
                      placeholder="Ör: IT"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    placeholder="+90 5XX XXX XX XX"
                  />
                </div>

                <div className="form-group">
                  <label>Rol</label>
                  <input
                    type="text"
                    value={profileData.role}
                    disabled
                    className="disabled-input"
                  />
                  <small>Rol bilgisi yönetici tarafından değiştirilir</small>
                </div>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Kaydediliyor..." : " Değişiklikleri Kaydet"}
                </button>
              </form>
            )}

            {/* Güvenlik Tab */}
            {activeTab === "security" && (
              <form onSubmit={handlePasswordUpdate} className="profile-form">
                <h3>Şifre Değiştir</h3>
                
                <div className="form-group">
                  <label>Mevcut Şifre</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={securityData.currentPassword}
                    onChange={handleSecurityChange}
                    placeholder="Mevcut şifreniz"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Yeni Şifre</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={securityData.newPassword}
                    onChange={handleSecurityChange}
                    placeholder="Yeni şifre (min 8 karakter)"
                    required
                    minLength="8"
                  />
                </div>

                <div className="form-group">
                  <label>Yeni Şifre (Tekrar)</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={securityData.confirmPassword}
                    onChange={handleSecurityChange}
                    placeholder="Yeni şifrenizi tekrar girin"
                    required
                    minLength="8"
                  />
                </div>

                <div className="password-requirements">
                  <p><strong>Şifre gereksinimleri:</strong></p>
                  <ul>
                    <li>En az 8 karakter uzunluğunda olmalı</li>
                    <li>Büyük ve küçük harf içermeli</li>
                    <li>En az bir rakam içermeli</li>
                  </ul>
                </div>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Güncelleniyor..." : "🔒 Şifreyi Güncelle"}
                </button>
              </form>
            )}

            {/* Bildirimler Tab */}
            {activeTab === "notifications" && (
              <form onSubmit={handleNotificationUpdate} className="profile-form">
                <h3>Bildirim Tercihleri</h3>
                
                <div className="form-group">
                  <label>Bildirim E-posta Adresi</label>
                  <input
                    type="email"
                    name="notification_email"
                    value={notificationSettings.notification_email}
                    onChange={handleNotificationChange}
                    placeholder="bildirimler@mail.com"
                  />
                  <small>Bildirimlerin gönderileceği e-posta adresi</small>
                </div>

                <div className="notification-toggles">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <strong>📧 E-posta Bildirimleri</strong>
                      <p>Önemli güncellemeler için e-posta al</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="email_notifications"
                        checked={notificationSettings.email_notifications}
                        onChange={handleNotificationChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <strong>⏰ Görev Hatırlatıcıları</strong>
                      <p>Bekleyen görevler için hatırlatma al</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="task_reminders"
                        checked={notificationSettings.task_reminders}
                        onChange={handleNotificationChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <strong> Termin Uyarıları</strong>
                      <p>Yaklaşan son tarihler için uyarı al</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="deadline_alerts"
                        checked={notificationSettings.deadline_alerts}
                        onChange={handleNotificationChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Kaydediliyor..." : "💾 Ayarları Kaydet"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;