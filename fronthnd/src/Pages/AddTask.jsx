import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/AddTask.css";

const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";

const AddTask = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editingMission = location.state?.mission || null;

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

  useEffect(() => {
    fetchUsers();
    
    if (editingMission) {
      setFormData({
        description: editingMission.description,
        assigned_date: editingMission.assigned_date,
        end_date: editingMission.end_date,
        from_to: editingMission.from_to || '',
        due_to: editingMission.assigned_users?.map(u => u.id) || [],
        attachments: []
      });
    }
  }, [editingMission]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get(USERS_ENDPOINT);
      const userData = response.data.results || response.data;
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error) {
      console.error("❌ Failed to fetch users:", error);
      alert(`Kullanıcılar yüklenirken hata oluştu!\n${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
      
      if (editingMission) {
        await api.patch(`${MISSIONS_ENDPOINT}${editingMission.id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Görev başarıyla güncellendi!");
      } else {
        await api.post(MISSIONS_ENDPOINT, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Görev başarıyla oluşturuldu!");
      }
      
      navigate('/dashboard');
      
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

  const formatUserName = (user) => {
    if (!user) return '';
    return user.full_name || user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim();
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'CEO': return 'role-badge-ceo';
      case 'MANAGER': return 'role-badge-manager';
      case 'EMPLOYEE': return 'role-badge-employee';
      default: return 'role-badge-default';
    }
  };

  return (
    <div className="add-task-page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Geri Dön
        </button>
        <h1>{editingMission ? ' Görevi Düzenle' : ' Yeni Görev Oluştur'}</h1>
      </header>

      <main className="add-task-container">
        <div className="task-form-wrapper">
          {editingMission && (
            <div className="edit-notice">
              <span className="notice-icon">🔔</span>
              <span className="notice-text">Görev #{editingMission.id} düzenleniyor</span>
            </div>
          )}

          <form className="task-form" onSubmit={handleSubmitMission}>
            <div className="form-section">
              <h2 className="section-title"> Görev Detayları</h2>
              
              <div className="form-group">
                <label htmlFor="desc" className="form-label">
                  Görev Açıklaması <span className="required">*</span>
                </label>
                <textarea 
                  id="desc"
                  name="description"
                  rows="5" 
                  placeholder="Görevin detaylarını açıklayın..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-textarea"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="assigned_date" className="form-label">
                    Başlangıç Tarihi <span className="required">*</span>
                  </label>
                  <input 
                    type="date" 
                    id="assigned_date"
                    name="assigned_date"
                    value={formData.assigned_date}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end_date" className="form-label">
                    Bitiş Tarihi <span className="required">*</span>
                  </label>
                  <input 
                    type="date" 
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    min={formData.assigned_date}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="from_to" className="form-label">
                  Konum / Rota <span className="optional">(Opsiyonel)</span>
                </label>
                <input 
                  type="text" 
                  id="from_to"
                  name="from_to"
                  placeholder="Örn: Ankara → İstanbul"
                  value={formData.from_to}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="attachments" className="form-label">
                  Dosya Ekle <span className="optional">(Opsiyonel)</span>
                </label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id="attachments"
                    name="attachments"
                    multiple
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        attachments: Array.from(e.target.files)
                      }))
                    }
                    className="file-input"
                  />
                  <label htmlFor="attachments" className="file-label">
                    <span className="file-icon">📎</span>
                    <span className="file-text">
                      {formData.attachments.length > 0 
                        ? `${formData.attachments.length} dosya seçildi`
                        : 'Dosya seçin veya sürükleyin'}
                    </span>
                  </label>
                </div>
                
                {formData.attachments.length > 0 && (
                  <div className="selected-files">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="file-item">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{file.name}</span>
                        <button
                          type="button"
                          className="remove-file"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              attachments: prev.attachments.filter((_, i) => i !== index)
                            }));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">Görev Atama </h2>
                <span className="selection-count">
                  {formData.due_to.length} kişi seçildi
                </span>
              </div>

              {loading ? (
                <div className="loading-users">
                  <div className="spinner">⏳</div>
                  <p>Kullanıcılar yükleniyor...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="no-users">
                  <p>⚠️ Atanabilir kullanıcı bulunamadı</p>
                </div>
              ) : (
                <div className="users-grid">
                  {users.map(user => (
                    <label 
                      key={user.id} 
                      className={`user-card ${formData.due_to.includes(user.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.due_to.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                        className="user-checkbox"
                      />
                      <div className="user-card-content">
                        <div className="user-avatar">
                          {formatUserName(user).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <h4 className="user-name">
                            {formatUserName(user)}
                          </h4>
                          <p className="user-email">{user.email}</p>
                          <div className="user-badges">
                            <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                              {user.role}
                            </span>
                            {user.unvan && (
                              <span className="unvan-badge">
                                {user.unvan}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="check-indicator">✓</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button 
                type="button"
                className="btn btn-cancel"
                onClick={() => navigate('/dashboard')}
                disabled={saving}
              >
                ✕ İptal
              </button>
              <button 
                type="submit" 
                className="btn btn-submit"
                disabled={saving || formData.due_to.length === 0}
              >
                {saving ? (
                  <>
                    <span className="btn-spinner">⏳</span>
                    Kaydediliyor...
                  </>
                ) : editingMission ? (
                  <>
                    <span className="btn-icon">💾</span>
                    Değişiklikleri Kaydet
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✅</span>
                    Görevi Oluştur
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddTask;