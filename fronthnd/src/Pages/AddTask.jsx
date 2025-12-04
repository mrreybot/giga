import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/AddTask.css";

const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";

const AddTask = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    assigned_date: '',
    end_date: '',
    from_to: '',
    due_to: [],
    attachments: []
  });

  // === INITIALIZATION ===
  useEffect(() => {
    loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      await fetchUsers();
      if (isEditing) {
        await fetchMissionData();
      }
    } catch (error) {
      console.error("❌ Failed to load form data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log("🔍 Fetching users from:", USERS_ENDPOINT);
      const response = await api.get(USERS_ENDPOINT);
      const userData = response.data.results || response.data;
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error) {
      console.error("❌ Failed to fetch users:", error);
      alert(`Kullanıcılar yüklenirken hata oluştu!\n${error.response?.data?.detail || error.message}`);
    }
  };

  const fetchMissionData = async () => {
    try {
      const response = await api.get(`${MISSIONS_ENDPOINT}${id}/`);
      const mission = response.data;
      
      setFormData({
        description: mission.description || '',
        assigned_date: mission.assigned_date || '',
        end_date: mission.end_date || '',
        from_to: mission.from_to || '',
        due_to: mission.assigned_users?.map(u => u.id) || [],
        attachments: []
      });
    } catch (error) {
      console.error("❌ Failed to fetch mission:", error);
      alert("Görev bilgileri yüklenirken hata oluştu!");
      navigate("/dashboard");
    }
  };

  // === FORM HANDLERS ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserSelection = (userId) => {
    setFormData(prev => {
      const isSelected = prev.due_to.includes(userId);
      return {
        ...prev,
        due_to: isSelected
          ? prev.due_to.filter(id => id !== userId)
          : [...prev.due_to, userId]
      };
    });
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      attachments: Array.from(e.target.files)
    }));
  };

  // === SUBMIT MISSION ===
  const handleSubmitMission = async (e) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      alert("Lütfen açıklama giriniz!");
      return;
    }
    if (!formData.assigned_date || !formData.end_date) {
      alert("Lütfen tarih aralığı seçiniz!");
      return;
    }
    if (formData.due_to.length === 0) {
      alert("Lütfen en az bir kullanıcı seçiniz!");
      return;
    }

    setSaving(true);
    
    try {
      const submitData = new FormData();
      submitData.append('description', formData.description);
      submitData.append('assigned_date', formData.assigned_date);
      submitData.append('end_date', formData.end_date);
      
      if (formData.from_to) {
        submitData.append('from_to', formData.from_to);
      }
      
      formData.due_to.forEach(userId => {
        submitData.append('due_to', userId);
      });
      
      formData.attachments.forEach(file => {
        submitData.append('new_attachments', file);
      });
      
      if (isEditing) {
        await api.patch(`${MISSIONS_ENDPOINT}${id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("✅ Görev başarıyla güncellendi!");
      } else {
        await api.post(MISSIONS_ENDPOINT, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("✅ Görev başarıyla oluşturuldu!");
      }
      
      navigate("/dashboard");
      
    } catch (error) {
      console.error("❌ Failed to save mission:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message;
      alert(`Görev kaydedilirken hata oluştu!\n${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Değişiklikler kaydedilmeyecek. Çıkmak istediğinize emin misiniz?")) {
      navigate("/dashboard");
    }
  };

  // === HELPERS ===
  const formatUserName = (user) => {
    if (!user) return '';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.full_name || user.username;
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'CEO': return 'role-badge-ceo';
      case 'MANAGER': return 'role-badge-manager';
      case 'EMPLOYEE': return 'role-badge-employee';
      default: return 'role-badge-default';
    }
  };

  if (loading) {
    return (
      <div className="add-task-page">
        <div className="loading-container">
          <div className="spinner">⏳</div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-task-page">
      {/* HEADER */}
      <div className="add-task-header">
        <div className="header-content">
          <button onClick={() => navigate("/dashboard")} className="back-btn">
            ← Geri Dön
          </button>
          <h1>{isEditing ? '✏️ Görevi Düzenle' : '➕ Yeni Görev Oluştur'}</h1>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="add-task-content">
        <div className="form-wrapper">
          <form className="task-form" onSubmit={handleSubmitMission}>
            
            {isEditing && (
              <div className="edit-notice">
                <p>🔔 Görev #{id} düzenleniyor</p>
              </div>
            )}
            
            {/* AÇIKLAMA */}
            <div className="form-group">
              <label htmlFor="desc">
                Açıklama <span className="required">*</span>
              </label>
              <textarea 
                id="desc"
                name="description"
                rows="5" 
                placeholder="Görevin detaylarını yazınız..."
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* TARİHLER */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="assigned_date">
                  Başlangıç Tarihi <span className="required">*</span>
                </label>
                <input 
                  type="date" 
                  id="assigned_date"
                  name="assigned_date"
                  value={formData.assigned_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="end_date">
                  Bitiş Tarihi <span className="required">*</span>
                </label>
                <input 
                  type="date" 
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  min={formData.assigned_date}
                  required
                />
              </div>
            </div>

            {/* KONUM */}
            <div className="form-group">
              <label htmlFor="from_to">Konum / Rota (Opsiyonel)</label>
              <input 
                type="text" 
                id="from_to"
                name="from_to"
                placeholder="Örn: Ankara - İstanbul"
                value={formData.from_to}
                onChange={handleInputChange}
              />
            </div>

            {/* DOSYA EKLEME */}
            <div className="form-group">
              <label htmlFor="attachments">Dosya Ekle (Opsiyonel)</label>
              <input
                type="file"
                id="attachments"
                name="attachments"
                multiple
                onChange={handleFileChange}
              />
              {formData.attachments.length > 0 && (
                <ul className="attachment-list">
                  {formData.attachments.map((file, index) => (
                    <li key={index}>📎 {file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* KULLANICI SEÇİMİ */}
            <div className="form-group">
              <label>
                Atanacak Kullanıcılar <span className="required">*</span>
                <span className="selection-count">
                  ({formData.due_to.length} kişi seçildi)
                </span>
              </label>
              <div className="user-selection-grid">
                {users.length === 0 ? (
                  <p className="text-muted">⏳ Kullanıcılar yükleniyor...</p>
                ) : (
                  users.map(user => (
                    <label key={user.id} className="user-checkbox-card">
                      <input
                        type="checkbox"
                        checked={formData.due_to.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                      />
                      <div className="user-info">
                        <strong>{formatUserName(user)}</strong>
                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                        {user.unvan && (
                          <span className="user-unvan">🏷️ {user.unvan}</span>
                        )}
                        <small>{user.email}</small>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* BUTONLAR */}
            <div className="form-actions">
              <button 
                type="button"
                className="cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                ✕ İptal
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={saving || formData.due_to.length === 0}
              >
                {saving ? "⏳ Kaydediliyor..." : isEditing ? "💾 Değişiklikleri Kaydet" : "✅ Görevi Ata"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTask;