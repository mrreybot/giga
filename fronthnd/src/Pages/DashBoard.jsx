import React, { useEffect, useState } from "react";
import api from "../services/api";
import { ACCESS_TOKEN } from "../services/constant";
import "../styles/Dashboard.css"; // Stil dosyanızın var olduğunu varsayıyorum

const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";
const ORG_CHART_ENDPOINT = "/api/users/organization_chart/";

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
    // YENİ EK: Görev türü filtresi
    assignmentType: 'assigned_to_me' // Varsayılan: Bana Atananlar
  });

  // Görev düzenleme state'leri kaldırıldı
  // Form state'leri kaldırıldı

  // === INITIALIZATION ===
  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      // Görev atama/düzenleme kaldırıldığı için tüm görevleri çekmek daha mantıklı olabilir.
      // Ancak mevcut endpoint'i koruyoruz. Backend'den gelen veriye göre filtreleme yapacağız.
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
      // Not: Backend'iniz sadece kullanıcının gördüğü görevleri getiriyorsa sorun yok.
      // Eğer tüm görevleri getiriyorsa, bu kodda sadece listeleme yapıldığı için uygundur.
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
      const response = await api.get(USERS_ENDPOINT);
      const userData = response.data.results || response.data;
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error) {
      console.error("❌ Failed to fetch users:", error);
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
    // 1. Assignment Type Filtresi (Bana Atananlar vs. Benim Atadıklarım)
    // Not: Bu filtreleme, mevcut kullanıcının kimliğini (API'dan gelmeli) veya
    // mission objesinde bulunan 'is_assigned_to_me' / 'is_created_by_me' gibi
    // bir alanı kullanarak yapılmalıdır. Backend'i bozmamak için, görev oluşturan
    // veya atanan kişi listesinden bir tahmin yapmaya çalışacağız, ancak
    // en doğru yöntem backend'den gelen bir flag kullanmaktır.
    
    // Varsayım: `mission.can_complete` true ise bana atanmıştır.
    // Varsayım: `mission.can_edit` true ise ben atamışımdır (created_by_me).
    const isAssignedToMe = mission.can_complete;
    const isAssignedByMe = mission.can_edit; 

    if (filters.assignmentType === 'assigned_to_me' && !isAssignedToMe) return false;
    if (filters.assignmentType === 'assigned_by_me' && !isAssignedByMe) return false;
    
    // 2. Diğer Filtreler
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
      dateTo: '',
      assignmentType: 'assigned_to_me' // Sadece bu filtreyi koru veya ilk varsayılana dön
    });
  };

  const hasActiveFilters = () => {
    return filters.status !== 'all' || 
           filters.searchText !== '' || 
           filters.selectedUser !== 'all' ||
           filters.dateFrom !== '' ||
           filters.dateTo !== '';
  };
  
  

  // === MODAL LOGIC (Korumak istedikleriniz) ===
  const handleMissionClick = (mission) => { 
    setSelectedMission(mission);
  };

  const closeMissionModal = () => { 
    setSelectedMission(null);
  };
  
  // Düzenleme fonksiyonu çağrılmayacak ama kodda kalabilir, tıklanmayacak.
 

  // Tamamlama mantığı korundu.
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

  // Mevcut görev sayısına göre başlık belirleme
  const getAssignmentTypeTitle = () => {
    const totalCount = filteredMissions.length;
    if (filters.assignmentType === 'assigned_by_me') {
      return `📌 Benim Atadığım Görevler (${totalCount})`;
    } else {
      return `📋 Bana Atanan Görevler (${totalCount})`;
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
          
          
        </div>
      </header>
      
      {/* Görev Detay Modalı - Seçili görev varsa açılır */}
      {selectedMission && (
        <div className="modal-overlay" onClick={closeMissionModal}>
          <div className="mission-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Görev Detayı</h2>
              <button className="close-modal" onClick={closeMissionModal}>✕</button>
            </div>
            <div className="modal-content">
              <p><strong>Açıklama:</strong> {selectedMission.description}</p>
              <p><strong>Atanan Tarih:</strong> {formatDate(selectedMission.assigned_date)}</p>
              <p><strong>Bitiş Tarihi:</strong> {formatDate(selectedMission.end_date)}</p>
              <p><strong>Konum:</strong> {selectedMission.from_to || "Belirtilmemiş"}</p>
              <p><strong>Durum:</strong> 
                <span className={selectedMission.completed ? "completed-text" : "pending-text"}>
                  {selectedMission.completed ? 'Tamamlandı' : 'Devam Ediyor'}
                </span>
              </p>
              <p><strong>Oluşturan:</strong> {formatUserName(selectedMission.created_by_info)}</p>
              
              <div className="assigned-users-list">
                <strong>Atananlar:</strong>
                <ul>
                  {selectedMission.assigned_users?.map(user => (
                    <li key={user.id}>
                      {formatUserName(user)}
                      <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedMission.attachments?.length > 0 && (
                <div className="mission-attachments-modal">
                  <strong>📎 Ekler:</strong>
                  <ul className="attachment-list">
                    {selectedMission.attachments.map((file) => (
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
              <h2>🏢 Organizasyon Yapısı</h2>
              <button className="close-modal" onClick={() => setShowOrgChart(false)}>✕</button>
            </div>
            
            <div className="org-chart-content">
              {/* Organizasyon şeması içeriği buraya gelir */}
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

      {/* Main Content - Artık sadece görev listesi var */}
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
              
              {/* YENİ FİLTRE: Atama Türü */}
              <div className="filter-group">
                <label>Görev Türü</label>
                <select 
                  value={filters.assignmentType}
                  onChange={(e) => handleFilterChange('assignmentType', e.target.value)}
                  className="filter-select"
                >
                  <option value="assigned_to_me">Bana Atananlar</option>
                  <option value="assigned_by_me">Benim Atadıklarım</option>
                </select>
              </div>

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
                {getAssignmentTypeTitle()} - {filteredMissions.length} görev gösteriliyor
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
                  {hasActiveFilters() || filters.assignmentType === 'assigned_by_me' ? '🔍' : '📭'}
                </div>
                {filters.assignmentType === 'assigned_by_me' 
                    ? 'Henüz kimseye görev atamamışsınız.'
                    : 'Size atanmış aktif görev bulunmamaktadır.'}
              </div>
            ) : (
              filteredMissions.map((mission) => (
                <div
                  key={mission.id}
                  className={`mission-card ${mission.completed ? "completed" : ""} ${mission.isUpdating ? "updating" : ""}`}
                >
                  <div className="mission-header">
                    
                    {/* Tamamlama Butonu */}
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
                        {/* Ek listesi burada */}
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
      </main>
    
    </div>
  );
};

export default Dashboard;