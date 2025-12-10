import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../services/constant";
import "../styles/Admin.css";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users"); // users, missions
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
        
        // Sadece CEO erişebilir
        if (userRole !== "CEO") {
          alert("Bu sayfaya erişim yetkiniz yok! Sadece CEO erişebilir.");
          navigate("/home");
        }
      } catch (error) {
        console.error("Authorization check failed:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem(ACCESS_TOKEN);
          localStorage.removeItem(REFRESH_TOKEN);
          navigate("/");
        } else {
          navigate("/home");
        }
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAdminAuth();
  }, [navigate]);

  // Verileri yükle
  useEffect(() => {
    if (!checkingAuth) {
      fetchData();
    }
  }, [checkingAuth, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "users") {
        const response = await api.get("/api/users/organization/");
        // Tüm rolleri birleştir
        const allUsers = [
          ...response.data.CEO,
          ...response.data.MANAGER,
          ...response.data.EMPLOYEE
        ];
        setUsers(allUsers);
      } else {
        const response = await api.get("/api/missions/");
        setMissions(response.data);
      }
    } catch (error) {
      console.error("Veri yüklenemedi:", error);
      alert("Veriler yüklenirken hata oluştu!");
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
      await api.patch(`/api/user/${editingUser.id}/`, {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        email: editingUser.email,
        department: editingUser.department,
        phone: editingUser.phone,
        role: editingUser.role,
        is_active: editingUser.is_active
      });
      
      alert("Kullanıcı başarıyla güncellendi!");
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error("Kullanıcı güncellenemedi:", error);
      alert("Kullanıcı güncellenirken hata oluştu!");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      await api.delete(`/api/user/${userId}/`);
      alert("Kullanıcı başarıyla silindi!");
      fetchData();
    } catch (error) {
      console.error("Kullanıcı silinemedi:", error);
      alert("Kullanıcı silinirken hata oluştu!");
    }
  };

  const handleToggleUserActive = async (user) => {
    try {
      await api.patch(`/api/user/${user.id}/`, {
        is_active: !user.is_active
      });
      fetchData();
    } catch (error) {
      console.error("Durum değiştirilemedi:", error);
      alert("Durum değiştirilirken hata oluştu!");
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
      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🛡️ Admin Panel</h1>
            <p className="subtitle">Sistem yönetimi ve kullanıcı kontrolü</p>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <span className="stat-number">{users.length}</span>
              <span className="stat-label">Toplam Kullanıcı</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{missions.length}</span>
              <span className="stat-label">Toplam Görev</span>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Kullanıcılar
        </button>
        <button 
          className={`tab-button ${activeTab === "missions" ? "active" : ""}`}
          onClick={() => setActiveTab("missions")}
        >
          📋 Görevler
        </button>
      </div>

      <main className="admin-main">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Yükleniyor...</p>
          </div>
        ) : (
          <>
            {activeTab === "users" && (
              <div className="users-section">
                <div className="section-header">
                  <h2>Kullanıcı Yönetimi</h2>
                  <button className="btn-primary" onClick={() => navigate("/add-people")}>
                    ➕ Yeni Kullanıcı Ekle
                  </button>
                </div>

                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Kullanıcı Adı</th>
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
                      {users.map(user => (
                        <tr key={user.id}>
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
                            <button 
                              className={`status-badge ${user.is_active ? "active" : "inactive"}`}
                              onClick={() => handleToggleUserActive(user)}
                            >
                              {user.is_active ? "✓ Aktif" : "✗ Pasif"}
                            </button>
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
                              onClick={() => handleDeleteUser(user.id)}
                              title="Sil"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "missions" && (
              <div className="missions-section">
                <div className="section-header">
                  <h2>Görev Yönetimi</h2>
                </div>

                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Açıklama</th>
                        <th>Oluşturan</th>
                        <th>Atanan Kişi(ler)</th>
                        <th>Başlangıç</th>
                        <th>Bitiş</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missions.map(mission => (
                        <tr key={mission.id}>
                          <td>{mission.id}</td>
                          <td className="description-cell">
                            {mission.description?.substring(0, 50)}
                            {mission.description?.length > 50 ? "..." : ""}
                          </td>
                          <td>
                            {mission.created_by_info?.first_name} {mission.created_by_info?.last_name}
                          </td>
                          <td>
                            {mission.assigned_users?.map(u => (
                              <span key={u.id} className="assigned-user">
                                {u.first_name} {u.last_name}
                              </span>
                            ))}
                          </td>
                          <td>{new Date(mission.assigned_date).toLocaleDateString('tr-TR')}</td>
                          <td>{new Date(mission.end_date).toLocaleDateString('tr-TR')}</td>
                          <td>
                            <span className={`status-badge ${mission.completed ? "completed" : "pending"}`}>
                              {mission.completed ? "✓ Tamamlandı" : "⏳ Devam Ediyor"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Kullanıcı Düzenle</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Ad</label>
                <input
                  type="text"
                  value={editingUser.first_name || ""}
                  onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Soyad</label>
                <input
                  type="text"
                  value={editingUser.last_name || ""}
                  onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
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
                />
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
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                İptal
              </button>
              <button className="btn-primary" onClick={handleSaveUser}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;