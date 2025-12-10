import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../services/constant";
import "../styles/Admin.css";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const navigate = useNavigate();

  // Admin yetkisi kontrolü
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (!token) {
          navigate("/");
          return;
        }

        const response = await api.get("/api/user/profile/");
        const userRole = response.data.role;
        
        if (userRole !== "CEO") {
          alert("Bu sayfaya erişim yetkiniz yok! Sadece CEO erişebilir.");
          navigate("/home");
        }
      } catch (error) {
        console.error("❌ Authorization check failed:", error);
        if (error.response?.status === 401) {
          alert("Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.");
          localStorage.removeItem(ACCESS_TOKEN);
          localStorage.removeItem(REFRESH_TOKEN);
          navigate("/");
        } else {
          alert("Yetki kontrolü yapılamadı!");
          navigate("/home");
        }
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAdminAuth();
  }, [navigate]);

  // Kullanıcıları yükle
  useEffect(() => {
    if (!checkingAuth) {
      fetchUsers();
    }
  }, [checkingAuth]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/users/organization/");
      
      // Tüm rolleri birleştir
      const allUsers = [
        ...(response.data.CEO || []),
        ...(response.data.MANAGER || []),
        ...(response.data.EMPLOYEE || [])
      ];
      
      setUsers(allUsers);
    } catch (error) {
      console.error("❌ Data fetch failed:", error);
      alert("Kullanıcılar yüklenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    try {
      console.log("💾 Updating user:", editingUser.id, editingUser);
      
      const updateData = {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        email: editingUser.email,
        department: editingUser.department,
        phone: editingUser.phone,
        role: editingUser.role,
        is_active: editingUser.is_active
      };
      
      console.log("📤 Update data:", updateData);
      
      const response = await api.patch(`/api/user/${editingUser.id}/`, updateData);
      
      console.log("✅ Update response:", response.data);
      alert("Kullanıcı başarıyla güncellendi!");
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("❌ User update failed:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      
      if (error.response?.status === 403) {
        alert(error.response?.data?.detail || "Bu kullanıcıyı güncelleme yetkiniz yok!");
      } else if (error.response?.status === 404) {
        alert("Kullanıcı bulunamadı!");
      } else if (error.response?.data) {
        // Backend'den gelen detaylı hata mesajı
        const errorMsg = JSON.stringify(error.response.data);
        alert(`Güncelleme hatası: ${errorMsg}`);
      } else {
        alert("Kullanıcı güncellenirken hata oluştu!");
      }
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`"${username}" kullanıcısını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    try {
      await api.delete(`/api/user/${userId}/`);
      alert("Kullanıcı başarıyla silindi!");
      fetchUsers();
    } catch (error) {
      console.error("❌ User deletion failed:", error);
      
      if (error.response?.status === 404) {
        alert("Kullanıcı bulunamadı!");
      } else if (error.response?.status === 403) {
        alert(error.response?.data?.detail || "Bu kullanıcıyı silme yetkiniz yok!");
      } else if (error.response?.status === 400) {
        alert(error.response?.data?.detail || "Kendi hesabınızı silemezsiniz!");
      } else {
        alert("Kullanıcı silinirken hata oluştu!");
      }
    }
  };



  const getRoleBadgeClass = (role) => {
    switch(role) {
      case "CEO": return "badge-ceo";
      case "MANAGER": return "badge-manager";
      case "EMPLOYEE": return "badge-employee";
      default: return "badge-default";
    }
  };

  const getRoleText = (role) => {
    switch(role) {
      case "CEO": return "CEO";
      case "MANAGER": return "Yönetici";
      case "EMPLOYEE": return "Çalışan";
      default: return role;
    }
  };

  if (checkingAuth) {
    return (
      <div className="admin-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Yetki kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <main className="admin-main">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Yükleniyor...</p>
          </div>
        ) : (
          <div className="users-section">
            <div className="section-header">
              <button className="btn-primary" onClick={() => navigate("/addpeople")}>
                 Yeni Kullanıcı Ekle
              </button>
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Kullanıcı</th>
                    <th>Ad Soyad</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Departman</th>
                    <th>Telefon</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map(user => (
                      <tr key={user.id} className={!user.is_active ? "inactive-row" : ""}>
                        <td>{user.id}</td>
                        <td className="username-cell">
                          {user.profile_photo ? (
                            <img src={user.profile_photo} alt={user.username} className="user-avatar" />
                          ) : (
                            <div className="user-avatar-placeholder">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{user.username}</span>
                        </td>
                        <td>{user.first_name} {user.last_name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td>{user.department || "-"}</td>
                        <td>{user.phone || "-"}</td>
                        <td>
                          
                        </td>
                        <td className="actions-cell">
                          <button 
                            className="btn-icon btn-edit" 
                            onClick={() => handleEditUser(user)}
                            title="Düzenle"
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-icon btn-delete" 
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            title="Sil"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="no-data">
                        <div className="no-data-message">
                          <span className="no-data-icon">🔍</span>
                          <p>Kullanıcı bulunamadı</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* DÜZENLEME MODAL */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Kullanıcı Düzenle</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Ad</label>
                  <input
                    type="text"
                    value={editingUser.first_name || ""}
                    onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                    placeholder="Ad"
                  />
                </div>
                <div className="form-group">
                  <label>Soyad</label>
                  <input
                    type="text"
                    value={editingUser.last_name || ""}
                    onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                    placeholder="Soyad"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  placeholder="example@tuca.gov.tr"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Departman</label>
                  <select
                    value={editingUser.department || ""}
                    onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                  >
                    <option value="">Departman Seçiniz</option>
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
                    value={editingUser.phone || ""}
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    placeholder="+90 5XX XXX XX XX"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Rol</label>
                <select
                  value={editingUser.role || ""}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                >
                  <option value="CEO">CEO</option>
                  <option value="MANAGER">Manager (Yönetici)</option>
                  <option value="EMPLOYEE">Employee (Çalışan)</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingUser.is_active || false}
                    onChange={(e) => setEditingUser({...editingUser, is_active: e.target.checked})}
                  />
                  {" "}Aktif Kullanıcı
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                İptal
              </button>
              <button className="btn-primary" onClick={handleSaveUser}>
                💾 Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;