import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Dashboard.css";

const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";
const ORG_CHART_ENDPOINT = "/api/users/organization/";

const Dashboard = () => {
  const [missions, setMissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [orgChart, setOrgChart] = useState({ CEO: [], MANAGER: [], EMPLOYEE: [] });
  const [loading, setLoading] = useState(true);
 
  const [selectedMission, setSelectedMission] = useState(null);
  const [showOrgChart, setShowOrgChart] = useState(false);
  
  const [filters, setFilters] = useState({
    status: 'all', 
    searchText: '',
    selectedUser: 'all',
    dateFrom: '',
    dateTo: '',
    assignmentType: 'assigned_to_me' // Bana Atananlar / Benim Atadıklarım
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await fetchMissions();
      await fetchUsers();
      await fetchOrgChart();
    } catch (error) {
      console.error("❌ Dashboard yüklenemedi:", error);
    }
  };

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const response = await api.get(MISSIONS_ENDPOINT);
      // Backend direkt array veya results içinde array dönebilir
      const missionData = response.data.results || response.data;
      setMissions(Array.isArray(missionData) ? missionData : []);
    } catch (error) {
      console.error("❌ Görevler yüklenemedi:", error);
      alert(`Görevler yüklenirken hata oluştu!\n${error.response?.data?.detail || error.message}`);
      setMissions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get(USERS_ENDPOINT);
      // Backend direkt array dönüyor
      const userData = Array.isArray(response.data) ? response.data : [];
      setUsers(userData);
    } catch (error) {
      console.error("❌ Kullanıcılar yüklenemedi:", error);
      setUsers([]);
    }
  };

  const fetchOrgChart = async () => {
    try {
      const response = await api.get(ORG_CHART_ENDPOINT);
      setOrgChart(response.data);
    } catch (error) {
      console.error("❌ Organizasyon şeması yüklenemedi:", error);
    }
  };

  // === FILTER LOGIC ===
  const filteredMissions = missions.filter(mission => {
    // 1. Assignment Type Filtresi
    // can_complete: true -> Bana atanmış
    // can_edit: true -> Ben oluşturmuşum
    const isAssignedToMe = mission.can_complete;
    const isAssignedByMe = mission.can_edit; 

    if (filters.assignmentType === 'assigned_to_me' && !isAssignedToMe) return false;
    if (filters.assignmentType === 'assigned_by_me' && !isAssignedByMe) return false;
    
    // 2. Status Filtresi
    if (filters.status === 'completed' && !mission.completed) return false;
    if (filters.status === 'pending' && mission.completed) return false;

    // 3. Arama Filtresi
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const descMatch = mission.description?.toLowerCase().includes(searchLower);
      const locationMatch = mission.from_to?.toLowerCase().includes(searchLower);
      const creatorMatch = formatUserName(mission.created_by_info)?.toLowerCase().includes(searchLower);
      
      if (!descMatch && !locationMatch && !creatorMatch) return false;
    }

    // 4. Kullanıcı Filtresi
    if (filters.selectedUser !== 'all') {
      const hasUser = mission.assigned_users?.some(u => u.id === parseInt(filters.selectedUser));
      if (!hasUser) return false;
    }

    // 5. Tarih Filtreleri
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
      dateTo: '',
      assignmentType: 'assigned_to_me'
    });
  };

  const hasActiveFilters = () => {
    return filters.status !== 'all' || 
           filters.searchText !== '' || 
           filters.selectedUser !== 'all' ||
           filters.dateFrom !== '' ||
           filters.dateTo !== '';
  };

  // === MODAL LOGIC ===
  const handleMissionClick = (mission) => { 
    setSelectedMission(mission);
  };

  const closeMissionModal = () => { 
    setSelectedMission(null);
  };

  // === TOGGLE COMPLETE ===
  const toggleComplete = async (mission) => {
    // Optimistic update
    setMissions(prev =>
      prev.map(m =>
        m.id === mission.id ? { ...m, completed: !m.completed, isUpdating: true } : m
      )
    );

    try {
      await api.patch(`${MISSIONS_ENDPOINT}${mission.id}/toggle_complete/`);
      
      // İşlem başarılı, isUpdating'i kaldır
      setMissions(prev => 
        prev.map(m => (m.id === mission.id ? { ...m, isUpdating: false } : m))
      );
      
    } catch (error) {
      console.error("❌ Görev durumu güncellenemedi:", error);
      alert(error.response?.data?.detail || "Görev durumu güncellenemedi!");
      
      // Hata oldu, eski haline çevir
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
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatUserName = (user) => {
    if (!user) return 'İsimsiz';
    return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'CEO': return 'role-badge-ceo';
      case 'MANAGER': return 'role-badge-manager';
      case 'EMPLOYEE': return 'role-badge-employee';
      default: return 'role-badge-default';
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'CEO': return 'CEO';
      case 'MANAGER': return 'Yönetici';
      case 'EMPLOYEE': return 'Çalışan';
      default: return role;
    }
  };

  const getAssignmentTypeTitle = () => {
    const totalCount = filteredMissions.length;
    if (filters.assignmentType === 'assigned_by_me') {
      return `📌 Benim Atadığım Görevler (${totalCount})`;
    } else {
      return `📋 Bana Atanan Görevler (${totalCount})`;
    }
  };

  const getCompletedCount = (type) => {
    const filtered = missions.filter(m => {
      if (type === 'assigned_to_me') return m.can_complete;
      if (type === 'assigned_by_me') return m.can_edit;
      return true;
    });
    return {
      total: filtered.length,
      completed: filtered.filter(m => m.completed).length,
      pending: filtered.filter(m => !m.completed).length
    };
  };

  return (
    <div className="modern-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Görev Paneli</h1>
        <button 
          className="org-chart-btn" 
          onClick={() => setShowOrgChart(!showOrgChart)}
        >
           Organizasyon
        </button>
      </header>
      
      {/* Görev Detay Modalı */}
      {selectedMission && (
        <div className="modal-overlay" onClick={closeMissionModal}>
          <div className="mission-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Görev Detayı #{selectedMission.id}</h2>
              <button className="close-modal" onClick={closeMissionModal}>✕</button>
            </div>
            <div className="modal-content">
              <div className="detail-section">
                <label>📝 Açıklama:</label>
                <p>{selectedMission.description || "Açıklama yok"}</p>
              </div>

              <div className="detail-row">
                <div className="detail-section">
                  <label>📅 Başlangıç:</label>
                  <p>{formatDate(selectedMission.assigned_date)}</p>
                </div>
                <div className="detail-section">
                  <label>🏁 Bitiş:</label>
                  <p>{formatDate(selectedMission.end_date)}</p>
                </div>
              </div>

              {selectedMission.from_to && (
                <div className="detail-section">
                  <label>📍 Konum/Rota:</label>
                  <p>{selectedMission.from_to}</p>
                </div>
              )}

              <div className="detail-section">
                <label>📊 Durum:</label>
                <span className={selectedMission.completed ? "status-completed" : "status-pending"}>
                  {selectedMission.completed ? ' Tamamlandı' : ' Devam Ediyor'}
                </span>
              </div>

              <div className="detail-section">
                <label>👤 Oluşturan:</label>
                <p>{formatUserName(selectedMission.created_by_info)}</p>
              </div>
              
              <div className="detail-section">
                <label>👥 Atananlar ({selectedMission.assigned_users?.length || 0}):</label>
                <div className="assigned-users-grid">
                  {selectedMission.assigned_users?.map(user => (
                    <div key={user.id} className="user-chip">
                      <span className="user-avatar-small">
                        {formatUserName(user).charAt(0).toUpperCase()}
                      </span>
                      <div className="user-chip-info">
                        <span className="user-chip-name">{formatUserName(user)}</span>
                        <span className={`role-badge-small ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedMission.attachments?.length > 0 && (
                <div className="detail-section">
                  <label>📎 Ekler ({selectedMission.attachments.length}):</label>
                  <div className="attachment-list">
                    {selectedMission.attachments.map((file) => (
                      <a
                        key={file.id}
                        href={file.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-item"
                        download
                      >
                        <span className="attachment-icon">📄</span>
                        <span className="attachment-name">
                          {file.file.split("/").pop()}
                        </span>
                        <span className="attachment-action">⬇️</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closeMissionModal} className="close-modal-btn">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Chart Modal */}
      {showOrgChart && (
        <div className="modal-overlay" onClick={() => setShowOrgChart(false)}>
          <div className="org-chart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2> Organizasyon Yapısı</h2>
              <button className="close-modal" onClick={() => setShowOrgChart(false)}>✕</button>
            </div>
            
            <div className="org-chart-content">
              {/* CEO Section */}
              <div className="org-section">
                <h3 className="org-title ceo-title"> CEO</h3>
                <div className="org-grid">
                  {orgChart.CEO.length === 0 ? (
                    <p className="empty-role">Henüz CEO tanımlanmamış</p>
                  ) : (
                    orgChart.CEO.map(user => (
                      <div key={user.id} className="org-card ceo-card">
                        <div className="org-avatar">
                          {formatUserName(user).charAt(0).toUpperCase()}
                        </div>
                        <h4>{formatUserName(user)}</h4>
                        <p className="user-email">{user.email}</p>
                        {user.unvan && <p className="user-unvan">🏷️ {user.unvan}</p>}
                        {user.department && <p className="user-department">🏢 {user.department}</p>}
                        {user.phone && <p className="user-phone">📞 {user.phone}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Manager Section */}
              <div className="org-section">
                <h3 className="org-title manager-title">Yöneticiler</h3>
                <div className="org-grid">
                  {orgChart.MANAGER.length === 0 ? (
                    <p className="empty-role">Henüz yönetici tanımlanmamış</p>
                  ) : (
                    orgChart.MANAGER.map(user => (
                      <div key={user.id} className="org-card manager-card">
                        <div className="org-avatar">
                          {formatUserName(user).charAt(0).toUpperCase()}
                        </div>
                        <h4>{formatUserName(user)}</h4>
                        <p className="user-email">{user.email}</p>
                        {user.unvan && <p className="user-unvan">🏷️ {user.unvan}</p>}
                        {user.department && <p className="user-department">🏢 {user.department}</p>}
                        {user.phone && <p className="user-phone">📞 {user.phone}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Employee Section */}
              <div className="org-section">
                <h3 className="org-title employee-title">Çalışanlar</h3>
                <div className="org-grid">
                  {orgChart.EMPLOYEE.length === 0 ? (
                    <p className="empty-role">Henüz çalışan tanımlanmamış</p>
                  ) : (
                    orgChart.EMPLOYEE.map(user => (
                      <div key={user.id} className="org-card employee-card">
                        <div className="org-avatar">
                          {formatUserName(user).charAt(0).toUpperCase()}
                        </div>
                        <h4>{formatUserName(user)}</h4>
                        <p className="user-email">{user.email}</p>
                        {user.unvan && <p className="user-unvan">🏷️ {user.unvan}</p>}
                        {user.department && <p className="user-department">🏢 {user.department}</p>}
                        {user.phone && <p className="user-phone">📞 {user.phone}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-main">
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
              
              {/* Atama Türü Filtresi */}
              <div className="filter-group">
                <label>Görev Türü</label>
                <select 
                  value={filters.assignmentType}
                  onChange={(e) => handleFilterChange('assignmentType', e.target.value)}
                  className="filter-select"
                >
                  <option value="assigned_to_me">
                    Bana Atananlar ({getCompletedCount('assigned_to_me').total})
                  </option>
                  <option value="assigned_by_me">
                    Benim Atadıklarım ({getCompletedCount('assigned_by_me').total})
                  </option>
                </select>
              </div>

              {/* Durum Filtresi */}
              <div className="filter-group">
                <label>Durum</label>
                <select 
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Tümü</option>
                  <option value="pending">Devam Eden</option>
                  <option value="completed">Tamamlanan</option>
                </select>
              </div>

              {/* Arama */}
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

              {/* Atanan Kişi */}
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
                      {formatUserName(user)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tarih Filtreleri */}
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
                {getAssignmentTypeTitle()}
              </span>
            </div>
          </div>

          {/* Görev Listesi */}
          <div className="missions-list-container">
            {loading ? (
              <div className="empty-state">
                <div className="spinner">⏳</div>
                <p>Görevler yükleniyor...</p>
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  {hasActiveFilters() ? '' : ''}
                </div>
                <h3>
                  {hasActiveFilters() 
                    ? 'Filtreye uygun görev bulunamadı' 
                    : filters.assignmentType === 'assigned_by_me'
                      ? 'Henüz kimseye görev atamamışsınız'
                      : 'Size atanmış aktif görev bulunmamaktadır'}
                </h3>
                {hasActiveFilters() && (
                  <button onClick={clearFilters} className="clear-filters-btn">
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            ) : (
              filteredMissions.map((mission) => (
                <div
                  key={mission.id}
                  className={`mission-card ${mission.completed ? "completed" : ""} ${mission.isUpdating ? "updating" : ""}`}
                >
                  <div className="mission-header">
                    
                    {/* Tamamlama Checkbox - Sadece atananlar görebilir */}
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
                  </div>
                  
                  <div 
                    className="mission-body" 
                    onClick={() => handleMissionClick(mission)}
                    style={{ cursor: 'pointer' }}
                  >
                    <p className="mission-description">
                      {mission.description || "Açıklama yok"}
                    </p>
                    
                    {mission.from_to && (
                      <p className="mission-location">
                        📍 {mission.from_to}
                      </p>
                    )}
                    
                    {mission.attachments && mission.attachments.length > 0 && (
                      <div className="mission-attachments-preview">
                        <span className="attachment-count">
                          📎 {mission.attachments.length} ek dosya
                        </span>
                      </div>
                    )}

                    <div className="mission-footer">
                      {mission.created_by_info && (
                        <div className="mission-creator">
                          <small>
                            Oluşturan: <strong>{formatUserName(mission.created_by_info)}</strong>
                          </small>
                        </div>
                      )}
                      
                      {mission.assigned_users && mission.assigned_users.length > 0 && (
                        <div className="assigned-users-preview">
                          <small>
                            Atananlar: <strong>{mission.assigned_users.length} kişi</strong>
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;