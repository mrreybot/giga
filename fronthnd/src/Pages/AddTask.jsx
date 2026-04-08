import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/AddTask.css";

const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";
const PROFILE_ENDPOINT = "/api/user/profile/";

const AddTask = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editingMission = location.state?.mission || null;

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    description: '',
    assigned_date: '',
    end_date: '',
    from_to: '',
    due_to: [],
    attachments: [],
    project: '',
    priority: 'MEDIUM',
    department: ''
  });

  // 1. İlk Yükleme (Profil ve Projeler)
  useEffect(() => {
    fetchCurrentUser();
    fetchProjects();

    if (editingMission) {
      setFormData({
        description: editingMission.description || '',
        assigned_date: editingMission.assigned_date || '',
        end_date: editingMission.end_date || '',
        from_to: editingMission.from_to || '',
        due_to: editingMission.assigned_users?.map(u => u.id) || [],
        attachments: [],
        project: editingMission.project || '',
        priority: editingMission.priority || 'MEDIUM',
        department: editingMission.department || ''
      });
    }
    // NOT: fetchUsers'ı buradan kaldırdık, aşağıda project dependency'si ile çağıracağız.
  }, [editingMission]);

  // 2. Proje Değiştiğinde Kullanıcıları Sunucudan Çek (Server-Side Filtering)
  useEffect(() => {
    fetchUsers(formData.project);
  }, [formData.project]);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get(PROFILE_ENDPOINT);
      setCurrentUser(response.data);
    } catch (error) {
      console.error("❌ Kullanıcı bilgisi alınamadı:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects/');
      const projectList = res.data.results || (Array.isArray(res.data) ? res.data : []);
      setProjects(projectList);
    } catch (error) {
      console.error("❌ Projeler yüklenemedi:", error);
    }
  };

  // ✅ GÜNCELLENDİ: Proje ID'sine göre backend'e istek atar
  const fetchUsers = async (projectId = '') => {
    setLoading(true);
    try {
      // URL'i dinamik oluşturuyoruz
      let url = USERS_ENDPOINT;
      if (projectId) {
        url += `?project_id=${projectId}`;
      }

      const response = await api.get(url);

      let userData = [];
      if (Array.isArray(response.data)) {
        userData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        userData = Object.values(response.data).flat();
      }

      setUsers(userData);

      // Departmanları statik olarak set ediyoruz (İsterseniz bunu da backend'den çekebilirsiniz)
      const standardizedDepts = [
        "Yönetim",
        "Depozito Yönetim Sistemi",
        "Geri Kazanım ve Üretici",
        "Çevre Koruma",
        "Bilgi Teknolojileri",
        "İnsan Kaynakları"
      ];
      setDepartments(standardizedDepts);

    } catch (error) {
      console.error("❌ Kullanıcılar yüklenemedi:", error);
      // Hata durumunda listeyi temizle ama alert ile kullanıcıyı çok sıkma (opsiyonel)
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

// AddTask.jsx dosyanızda bu bloğu bulun ve değiştirin:

// ⭐ GÜNCELLENDİ: Proje filtresi buradan tamamen kaldırıldı!
const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // NOT: 'users' state'i artık Backend'den (fetchUsers içinde) 
    // projenin ID'sine göre filtrelenmiş olarak gelmektedir.

    // Departman filtresi (Client-side devam ediyor)
    if (formData.department) {
        filtered = filtered.filter(user => 
            user.department === formData.department
        );
    }

    // Öncelik seviyesi filtresi (Client-side devam ediyor)
    if (formData.priority && formData.priority !== 'MEDIUM') {
        // Kullanıcı modelinizde priority_level varsa çalışır
        if (filtered.some(u => u.priority_level)) {
           filtered = filtered.filter(user => user.priority_level === formData.priority);
        }
    }

    return filtered;
}, [users, formData.department, formData.priority]);

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
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: files
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
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

    const startDate = new Date(formData.assigned_date);
    const endDate = new Date(formData.end_date);
    if (endDate < startDate) {
      alert("Bitiş tarihi başlangıç tarihinden önce olamaz!");
      return;
    }

    setSaving(true);
    try {
      const submitData = new FormData();
      submitData.append('description', formData.description);
      submitData.append('assigned_date', formData.assigned_date);
      submitData.append('end_date', formData.end_date);

      if (formData.from_to && formData.from_to.trim()) {
        submitData.append('from_to', formData.from_to);
      }

      if (formData.project) {
        submitData.append('project', formData.project);
      }

      submitData.append('priority', formData.priority);
      if (formData.department) {
        submitData.append('department', formData.department);
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
        alert("✅ Görev başarıyla güncellendi!");
      } else {
        await api.post(MISSIONS_ENDPOINT, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("✅ Görev başarıyla oluşturuldu!");
      }

      navigate('/dashboard');

    } catch (error) {
      console.error("❌ Görev kaydedilemedi:", error);
      let errorMessage = "Görev kaydedilirken hata oluştu!";
      if (error.response?.data?.detail) {
        errorMessage += `\n\n${error.response.data.detail}`;
      }
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatUserName = (user) => {
    if (!user) return 'İsimsiz Kullanıcı';
    if (user.full_name) return user.full_name;
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (fullName) return fullName;
    return user.username || 'İsimsiz Kullanıcı';
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'CEO': return 'role-badge-ceo';
      case 'MANAGER': return 'role-badge-manager';
      case 'EMPLOYEE': return 'role-badge-employee';
      default: return 'role-badge-default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'CEO': return 'CEO';
      case 'MANAGER': return 'Yönetici';
      case 'EMPLOYEE': return 'Çalışan';
      default: return role;
    }
  };

  return (
    <div className="add-task-page">
      <header className="page-header">
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
            {/* GÖREV DETAYLARI */}
            <div className="form-section">
              <h2 className="section-title">Görev Detayları</h2>
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

              {/* ⭐ PROJE - Bu alan değiştiğinde backend isteği tetiklenir */}
              <div className="form-group">
                <label htmlFor="project" className="form-label">
                  Proje <span className="optional">(Opsiyonel)</span>
                </label>
                <select
                  id="project"
                  name="project"
                  value={formData.project}
                  onChange={handleInputChange}
                  className="form-input"
                  style={{ background: '#1a1a2e', color: 'white' }}
                >
                  <option value="">Proje Seçiniz (Yok)</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.title}</option>
                  ))}
                </select>
                {formData.project && (
                  <small className="filter-hint">
                    💡 Seçili projeye ait kullanıcılar getiriliyor...
                  </small>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority" className="form-label">
                    Öncelik Seviyesi <span className="optional">(Opsiyonel)</span>
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="form-input"
                    style={{ background: '#1a1a2e', color: 'white' }}
                  >
                    <option value="LOW">Düşük</option>
                    <option value="MEDIUM">Orta</option>
                    <option value="HIGH">Yüksek</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="department" className="form-label">
                    İlgilenen Departman <span className="optional">(Opsiyonel)</span>
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    list="department-options"
                    placeholder="Örn: İnsan Kaynakları"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                  <datalist id="department-options">
                    {departments.map((dept, index) => (
                      <option key={index} value={dept} />
                    ))}
                  </datalist>
                  {formData.department && (
                    <small className="filter-hint">
                      💡 Seçili departmana göre kullanıcılar filtreleniyor
                    </small>
                  )}
                </div>
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
                    onChange={handleFileChange}
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
                          onClick={() => removeFile(index)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ⭐ GÖREV ATAMA LİSTESİ */}
            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">Görev Atama</h2>
                <span className="selection-count">
                  {formData.due_to.length} kişi seçildi
                </span>
              </div>

              {(formData.project || formData.department) && (
                <div className="active-filters">
                  <span className="filter-indicator">
                    🔍 {filteredUsers.length} kullanıcı listeleniyor
                  </span>
                  {formData.project && (
                    <span className="filter-tag">
                      Proje: {projects.find(p => p.id === parseInt(formData.project))?.title || 'Yükleniyor...'}
                    </span>
                  )}
                  {formData.department && (
                    <span className="filter-tag">
                      Departman: {formData.department}
                    </span>
                  )}
                </div>
              )}

              {loading ? (
                <div className="loading-users">
                  <div className="spinner">⏳</div>
                  <p>Kullanıcılar yükleniyor...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="no-users">
                  <p>🔍 Aradığınız kriterlere uygun kullanıcı bulunamadı.</p>
                  {(formData.project || formData.department) && (
                    <small style={{ color: '#9ca3af', marginTop: '0.5rem', display: 'block' }}>
                      Filtreleri değiştirerek tekrar deneyebilirsiniz.
                    </small>
                  )}
                </div>
              ) : (
                <div className="users-grid">
                  {filteredUsers.map(user => (
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
                          {user.profile_photo ? (
                            <img src={user.profile_photo} alt={formatUserName(user)} className="avatar-image" />
                          ) : (
                            formatUserName(user).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="user-details">
                          <h4 className="user-name">
                            {formatUserName(user)}
                          </h4>
                          <p className="user-email">{user.email}</p>
                          <div className="user-badges">
                            <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                            {user.department && (
                              <span className="dept-badge">
                                {user.department}
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
                    <span className="btn-spinner"></span>
                    Kaydediliyor...
                  </>
                ) : editingMission ? (
                  <>
                    <span className="btn-icon">💾</span>
                    Değişiklikleri Kaydet
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✓</span>
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