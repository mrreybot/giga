import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../src/services/api";
import { ACCESS_TOKEN } from "../../src/services/constant";
import "../styles/Dashboard.css";

const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";
const ORG_CHART_ENDPOINT = "/api/users/organization_chart/";

const Dashboard = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [orgChart, setOrgChart] = useState({ CEO: [], MANAGER: [], EMPLOYEE: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedMission, setSelectedMission] = useState(null);
  const [showOrgChart, setShowOrgChart] = useState(false);
  
  const [filters, setFilters] = useState({
    status: 'all', 
    searchText: '',
    selectedUser: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [formData, setFormData] = useState({
    description: '',
    assigned_date: '',
    end_date: '',
    from_to: '',
    due_to: [],
    attachments: []
  });

  const [editingMission, setEditingMission] = useState(null);

  // === INITIALIZATION ===
  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      await fetchMissions();
      await fetchUsers();
      await fetchOrgChart();
    } catch (error) {
      console.error("❌ Failed to load dashboard data:", error);
    }
  };

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const response = await api.get(MISSIONS_ENDPOINT);
      setMissions(Array.isArray(response.data.results) ? response.data.results : []);
    } catch (error) {
      console.error("❌ Failed to fetch missions:", error);
      alert(`Görevler yüklenirken hata oluştu!\n${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

 const fetchUsers = async () => {
  try {
    console.log("🔍 Fetching users from:", USERS_ENDPOINT);
    const response = await api.get(USERS_ENDPOINT);
    console.log("✅ Users response:", response);
    console.log("📦 Users data:", response.data);
    
    // Backend'den gelen data formatını kontrol et
    const userData = response.data.results || response.data;
    setUsers(Array.isArray(userData) ? userData : []);
    
  } catch (error) {
    console.error("❌ Failed to fetch users:", error);
    console.error("📍 Error response:", error.response);
    alert(`Kullanıcılar yüklenirken hata oluştu!\n${error.response?.data?.detail || error.message}`);
  }
};

  const fetchOrgChart = async () => {
    try {
      const response = await api.get(ORG_CHART_ENDPOINT);
      setOrgChart(response.data);
    } catch (error) {
      console.error("❌ Failed to fetch org chart:", error);
    }
  };

  // === FILTER LOGIC ===
  const filteredMissions = missions.filter(mission => {
    if (filters.status === 'completed' && !mission.completed) return false;
    if (filters.status === 'pending' && mission.completed) return false;

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const descMatch = mission.description?.toLowerCase().includes(searchLower);
      const locationMatch = mission.from_to?.toLowerCase().includes(searchLower);
      const creatorMatch = formatUserName(mission.created_by_info)?.toLowerCase().includes(searchLower);
      
      if (!descMatch && !locationMatch && !creatorMatch) return false;
    }

    if (filters.selectedUser !== 'all') {
      const hasUser = mission.assigned_users?.some(u => u.id === parseInt(filters.selectedUser));
      if (!hasUser) return false;
    }

    if (filters.dateFrom) {
      const missionDate = new Date(mission.assigned_date);
      const filterDate = new Date(filters.dateFrom);
      if (missionDate < filterDate) return false;
    }

    if (filters.dateTo) {
      const missionDate = new Date(mission.end_date);
      const filterDate = new Date(filters.dateTo);
      if (missionDate > filterDate) return false;
    }

    return true;
  });

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      searchText: '',
      selectedUser: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.status !== 'all' || 
           filters.searchText !== '' || 
           filters.selectedUser !== 'all' ||
           filters.dateFrom !== '' ||
           filters.dateTo !== '';
  };

  // === LOGOUT ===
  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    navigate("/");
  };

  // === FORM HANDLERS ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

const handleMissionClick = (mission) => { 
  setSelectedMission(mission);
};

const closeMissionModal = () => { 
  setSelectedMission(null);
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

  // === CREATE/UPDATE MISSION ===
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
        // GÜNCELLEME
        await api.patch(`${MISSIONS_ENDPOINT}${editingMission.id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Görev başarıyla güncellendi!");
        setEditingMission(null);
      } else {
        // YENİ OLUŞTURMA
        await api.post(MISSIONS_ENDPOINT, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Görev başarıyla oluşturuldu!");
      }
      
      // Reset form
      setFormData({
        description: '',
        assigned_date: '',
        end_date: '',
        from_to: '',
        due_to: [],
        attachments: [],
      });
      
      const fileInput = document.getElementById('attachments');
      if (fileInput) fileInput.value = '';
      
      await fetchMissions();
      setActiveTab('list');
      
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

  // === EDIT MISSION ===
  const handleEditMission = (mission) => {
    setEditingMission(mission);
    setFormData({
      description: mission.description,
      assigned_date: mission.assigned_date,
      end_date: mission.end_date,
      from_to: mission.from_to || '',
      due_to: mission.assigned_users?.map(u => u.id) || [],
      attachments: []
    });
    setActiveTab('assign');
  };

  // === TOGGLE COMPLETE ===
  const toggleComplete = async (mission) => {
    setMissions(prev =>
      prev.map(m =>
        m.id === mission.id ? { ...m, completed: !m.completed, isUpdating: true } : m
      )
    );

    try {
      await api.patch(
        `${MISSIONS_ENDPOINT}${mission.id}/toggle_complete/`
      );
      
      setMissions(prev => 
        prev.map(m => (m.id === mission.id ? { ...m, isUpdating: false } : m))
      );
      
    } catch (error) {
      console.error("❌ Failed to toggle mission:", error);
      alert(error.response?.data?.detail || "Görev durumu güncellenemedi!");
      
      setMissions(prev =>
        prev.map(m => 
          m.id === mission.id 
            ? { ...m, completed: mission.completed, isUpdating: false } 
            : m
        )
      );
    }
  };

  // === HELPERS ===
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const formatUserName = (user) => {
    if (!user) return '';
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

  return (
    <div className="modern-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Görev Paneli</h1>
        <div>
          <button 
            className="org-chart-btn" 
            onClick={() => setShowOrgChart(!showOrgChart)}
          >
            👥 Organizasyon
          </button>
          <button className="refresh-btn" onClick={fetchMissions} disabled={loading}>
            {loading ? "Yenileniyor..." : "🔄 Yenile"}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            👋 Çıkış Yap
          </button>
        </div>
      </header>

      {/* 💥 YENİ: GÖREV DETAY MODALI 💥 */}
      {selectedMission && (
        <div className="modal-overlay" onClick={closeMissionModal}>
          <div className="mission-detail-modal" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h2>{selectedMission.description}</h2>
              <button className="close-modal" onClick={closeMissionModal}>✕</button>
            </div>
            
            <div className="modal-content">
              
              <div className="detail-status">
                <span className="date-badge">
                  📅 {formatDate(selectedMission.assigned_date)} - {formatDate(selectedMission.end_date)}
                </span>
                {selectedMission.completed ? (
                  <span className="completed-badge">✓ Tamamlandı</span>
                ) : (
                  <span className="pending-badge">... Devam Ediyor</span>
                )}
              </div>
              
              <p className="detail-description">
                **Açıklama:** {selectedMission.description || "Açıklama yok"}
              </p>
              
              {/* Atanan Kullanıcılar */}
              <div className="detail-users">
                <strong>👤 Atanan Kişiler:</strong>
                <div className="user-badge-list">
                  {selectedMission.assigned_users?.map(user => (
                    <span key={user.id} className="user-detail-badge">
                      {formatUserName(user)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ekler */}
              {selectedMission.attachments && selectedMission.attachments.length > 0 && (
                <div className="mission-attachments detail-attachments">
                  <strong>📎 Ekler ({selectedMission.attachments.length}):</strong>
                  <ul className="attachment-list">
                    {selectedMission.attachments.map((file) => (
                      <li key={file.id}>
                        <a href={file.file} target="_blank" rel="noopener noreferrer" className="attachment-link" download>
                          📄 {file.file.split("/").pop()}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Oluşturan Bilgisi */}
              {selectedMission.created_by_info && (
                <div className="detail-creator">
                  Oluşturan: <strong>{formatUserName(selectedMission.created_by_info)}</strong>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Organization Chart Modal */}
      {showOrgChart && (
        <div className="modal-overlay" onClick={() => setShowOrgChart(false)}>
          <div className="org-chart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏢 Organizasyon Yapısı</h2>
              <button className="close-modal" onClick={() => setShowOrgChart(false)}>✕</button>
            </div>
            
            <div className="org-chart-content">
              {/* CEO Section */}
              <div className="org-section">
                <h3 className="org-title ceo-title">👑 CEO</h3>
                <div className="org-grid">
                  {orgChart.CEO.length === 0 ? (
                    <p className="empty-role">Henüz CEO tanımlanmamış</p>
                  ) : (
                    orgChart.CEO.map(user => (
                      <div key={user.id} className="org-card ceo-card">
                        <div className="org-card-header">
                          <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                        <h4>{formatUserName(user)}</h4>
                        <p className="user-email">{user.email}</p>
                        {user.unvan && <p className="user-unvan">🏷️ {user.unvan}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Manager Section */}
              <div className="org-section">
                <h3 className="org-title manager-title">👔 Yöneticiler</h3>
                <div className="org-grid">
                  {orgChart.MANAGER.length === 0 ? (
                    <p className="empty-role">Henüz yönetici tanımlanmamış</p>
                  ) : (
                    orgChart.MANAGER.map(user => (
                      <div key={user.id} className="org-card manager-card">
                        <div className="org-card-header">
                          <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                        <h4>{formatUserName(user)}</h4>
                        <p className="user-email">{user.email}</p>
                        {user.unvan && <p className="user-unvan">🏷️ {user.unvan}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Employee Section */}
              <div className="org-section">
                <h3 className="org-title employee-title">💼 Çalışanlar</h3>
                <div className="org-grid">
                  {orgChart.EMPLOYEE.length === 0 ? (
                    <p className="empty-role">Henüz çalışan tanımlanmamış</p>
                  ) : (
                    orgChart.EMPLOYEE.map(user => (
                      <div key={user.id} className="org-card employee-card">
                        <div className="org-card-header">
                          <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                        <h4>{formatUserName(user)}</h4>
                        <p className="user-email">{user.email}</p>
                        {user.unvan && <p className="user-unvan">🏷️ {user.unvan}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="dashboard-nav">
        <button
          className={`nav-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('list');
            setEditingMission(null);
          }}
        >
          📋 Görevlerim ({missions.length})
        </button>
        <button
          className={`nav-tab ${activeTab === 'assign' ? 'active' : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          {editingMission ? '✏️ Görevi Düzenle' : '➕ Yeni Görev Ata'}
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        
        {/* SEKME 1: Görev Listesi */}
        {activeTab === 'list' && (
          <div className="task-list-view">
            {/* Filtre Paneli */}
            <div className="filter-panel">
              <div className="filter-header">
                <h3>🔍 Filtrele</h3>
                {hasActiveFilters() && (
                  <button className="clear-filters-btn" onClick={clearFilters}>
                    ✕ Filtreleri Temizle
                  </button>
                )}
              </div>

              <div className="filter-grid">
                <div className="filter-group">
                  <label>Durum</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">Tümü ({missions.length})</option>
                    <option value="pending">Devam Eden ({missions.filter(m => !m.completed).length})</option>
                    <option value="completed">Tamamlanan ({missions.filter(m => m.completed).length})</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Arama</label>
                  <input
                    type="text"
                    placeholder="Açıklama, konum veya oluşturan..."
                    value={filters.searchText}
                    onChange={(e) => handleFilterChange('searchText', e.target.value)}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label>Atanan Kişi</label>
                  <select
                    value={filters.selectedUser}
                    onChange={(e) => handleFilterChange('selectedUser', e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">Tüm Kullanıcılar</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {formatUserName(user) || user.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label>Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="filter-input"
                  />
                </div>
              </div>

              <div className="filter-results">
                <span className="results-count">
                  {filteredMissions.length} görev gösteriliyor
                  {hasActiveFilters() && ` (${missions.length} toplam)`}
                </span>
              </div>
            </div>

            {/* Görev Listesi */}
            <div className="missions-list-container">
              {loading ? (
                <div className="empty-state">
                  <div className="spinner">⏳</div>
                  Görevler yükleniyor...
                </div>
              ) : filteredMissions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    {hasActiveFilters() ? '🔍' : '📭'}
                  </div>
                  {hasActiveFilters() 
                    ? 'Filtrelere uygun görev bulunamadı.'
                    : 'Size atanmış görev bulunmamaktadır.'}
                </div>
              ) : (
                filteredMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className={`mission-card ${mission.completed ? "completed" : ""} ${mission.isUpdating ? "updating" : ""}`}
                  >
                    <div className="mission-header">
                      {mission.can_complete && (
                        <label className="task-checkbox-wrap">
                          <input
                            type="checkbox"
                            checked={!!mission.completed}
                            onChange={() => toggleComplete(mission)}
                            disabled={mission.isUpdating}
                          />
                          <span className="checkbox-ui" />
                        </label>
                      )}
                      
                      <div className="mission-dates">
                        <span className="date-badge">
                          📅 {formatDate(mission.assigned_date)} - {formatDate(mission.end_date)}
                        </span>
                        {mission.completed && (
                          <span className="completed-badge">✓ Tamamlandı</span>
                        )}
                      </div>

                      {mission.can_edit && (
                        <button 
                          className="edit-mission-btn"
                          onClick={() => handleEditMission(mission)}
                          title="Görevi Düzenle"
                        >
                          ✏️ Düzenle
                        </button>
                      )}
                    </div>
                    
                    <div className="mission-body" 
                      onClick={() => handleMissionClick(mission)}>
                      <p className="mission-description">
                        {mission.description || "Açıklama yok"}
                      </p>
                      
                      {mission.from_to && (
                        <p className="mission-location">
                          📍 {mission.from_to}
                        </p>
                      )}
                      
                      {mission.attachments && mission.attachments.length > 0 && (
                        <div className="mission-attachments">
                          <strong>📎 Ekler ({mission.attachments.length}):</strong>
                          <ul className="attachment-list">
                            {mission.attachments.map((file) => (
                              <li key={file.id}>
                                <a
                                  href={file.file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="attachment-link"
                                  download
                                >
                                  📄 {file.file.split("/").pop()}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      
                      {mission.created_by_info && (
                        <div className="mission-creator">
                          <small>
                            Oluşturan: <strong>{formatUserName(mission.created_by_info)}</strong>
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEKME 2: Yeni Görev Atama / Düzenleme */}
        {activeTab === 'assign' && (
          <div className="assign-task-view">
            <form className="modern-form" onSubmit={handleSubmitMission}>
              <h2>{editingMission ? '✏️ Görevi Düzenle' : '✍️ Detaylı Görev Oluştur'}</h2>
              
              {editingMission && (
                <div className="edit-notice">
                  <p>🔔 Görev #{editingMission.id} düzenleniyor</p>
                  <button 
                    type="button" 
                    className="cancel-edit-btn"
                    onClick={() => {
                      setEditingMission(null);
                      setFormData({
                        description: '',
                        assigned_date: '',
                        end_date: '',
                        from_to: '',
                        due_to: [],
                        attachments: []
                      });
                    }}
                  >
                    ✕ İptal
                  </button>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="desc">Açıklama *</label>
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="assigned_date">Başlangıç Tarihi *</label>
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
                  <label htmlFor="end_date">Bitiş Tarihi *</label>
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

              <div className="form-group">
                <label htmlFor="attachments">Dosya Ekle (Opsiyonel)</label>
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
                />
                {formData.attachments.length > 0 && (
                  <ul className="attachment-list">
                    {formData.attachments.map((file, index) => (
                      <li key={index}>📎 {file.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label>
                  Atanacak Kullanıcılar * 
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
                          <strong>
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : user.username}
                          </strong>
                          <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                          {user.unvan && (
                            <span className="user-unvan">
                              🏷️ {user.unvan}
                            </span>
                          )}
                          <small>{user.email}</small>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="submit-task-btn"
                disabled={saving || formData.due_to.length === 0}
              >
                {saving ? "⏳ Kaydediliyor..." : editingMission ? "💾 Değişiklikleri Kaydet" : "✅ Görevi Ata"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;