import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Dashboard.css";

const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const Dashboard = () => {
  const [missions, setMissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingMission, setCompletingMission] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    searchText: '',
    selectedUser: 'all',
    dateFrom: '',
    dateTo: '',
    assignmentType: 'assigned_to_me'
  });

  useEffect(() => {
    if (location.state?.filterStatus) {
      setFilters(prev => ({ ...prev, status: location.state.filterStatus }));
    }
    loadDashboardData();
  }, [location.state]);

  const loadDashboardData = async () => {
    try {
      await fetchMissions();
      await fetchUsers();
    } catch (error) {
      console.error("❌ Dashboard yüklenemedi:", error);
    }
  };

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const response = await api.get(MISSIONS_ENDPOINT);
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
      const userData = Array.isArray(response.data) ? response.data : [];
      setUsers(userData);
    } catch (error) {
      console.error("❌ Kullanıcılar yüklenemedi:", error);
      setUsers([]);
    }
  };

  // --- Filtering Logic ---
  const filteredMissions = missions.filter(mission => {
    if (!mission) return false;
    const isAssignedToMe = mission.can_complete;
    const isAssignedByMe = mission.can_edit;

    if (filters.assignmentType === 'assigned_to_me' && !isAssignedToMe) return false;
    if (filters.assignmentType === 'assigned_by_me' && !isAssignedByMe) return false;

    // Note: 'status' filter might overlap with columns, but keeping it allows filtering e.g. "Only see Completed"
    // However, in a Kanban board, usually you see all statuses in columns.
    // Let's relax the status filter if it is 'all', otherwise it will just show empty columns for mismatched statuses.
    if (filters.status === 'completed' && mission.status !== 'COMPLETED' && !mission.completed) return false;
    if (filters.status === 'pending') {
      // "Pending" might mean PENDING or IN_PROGRESS
      if (mission.status === 'COMPLETED' || mission.completed) return false;
    }

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

  // --- Kanban Columns Logic ---
  const getColumns = () => {
    const columns = {
      PENDING: { id: 'PENDING', title: 'Yapılacak', items: [] },
      IN_PROGRESS: { id: 'IN_PROGRESS', title: 'Devam Ediyor', items: [] },
      COMPLETED: { id: 'COMPLETED', title: 'Tamamlandı', items: [] }
    };

    filteredMissions.forEach(mission => {
      // Fallback or mapping logic
      let status = mission.status || (mission.completed ? 'COMPLETED' : 'PENDING');
      // Ensure valid status
      if (!columns[status]) status = 'PENDING';
      columns[status].items.push(mission);
    });

    return columns;
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    const missionId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Optimistic Update
    const originalMissions = [...missions];
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: newStatus, completed: newStatus === 'COMPLETED' } : m));

    try {
      await api.patch(`/api/missions/${missionId}/`, { status: newStatus });
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Durum güncellenemedi.");
      setMissions(originalMissions); // Revert
    }
  };


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

  const handleMissionClick = (mission) => {
    setSelectedMission(mission);
  };

  const closeMissionModal = () => {
    setSelectedMission(null);
    setIsEditing(false);
  };

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

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'HIGH': return 'priority-badge-high';
      case 'MEDIUM': return 'priority-badge-medium';
      case 'LOW': return 'priority-badge-low';
      default: return 'priority-badge-medium';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'HIGH': return 'Yüksek Öncelik';
      case 'MEDIUM': return 'Orta Öncelik';
      case 'LOW': return 'Düşük Öncelik';
      default: return 'Orta Öncelik';
    }
  };

  const getAssignmentTypeTitle = () => {
    const totalCount = filteredMissions.length;
    if (filters.assignmentType === 'assigned_by_me') {
      return `📋 Benim Atadığım Görevler (${totalCount})`;
    } else {
      return `📋 Bana Atanan Görevler (${totalCount})`;
    }
  };

  const getCompletedCount = (type) => {
    const filtered = missions.filter(m => {
      if (!m) return false;
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

  // --- Edit Mode State ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "",
    priority: "MEDIUM",
    end_date: ""
  });

  const handleCompleteClick = (mission, e) => {
    e.stopPropagation();
    setCompletingMission(mission);
    setFeedbackText("");
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async () => {
    if (!completingMission) return;

    try {
      const payload = { comment: feedbackText };
      const res = await api.post(`/api/missions/${completingMission.id}/complete_with_feedback/`, payload);
      setMissions(prev => prev.map(m => m.id === completingMission.id ? { ...res.data, status: 'COMPLETED' } : m)); // Force status update on complete
      setShowCompleteModal(false);
      setCompletingMission(null);
      setFeedbackText("");
    } catch (err) {
      console.error("Tamamlama hatası:", err);
      alert(err.response?.data?.detail || "Tamamlama sırasında hata oluştu");
    }
  };

  const handleEditClick = () => {
    if (!selectedMission) return;
    setEditForm({
      description: selectedMission.description || "",
      priority: selectedMission.priority || "MEDIUM",
      end_date: selectedMission.end_date ? selectedMission.end_date.split('T')[0] : ""
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMission) return;
    try {
      const res = await api.patch(`/api/missions/${selectedMission.id}/`, editForm);
      setMissions(prev => prev.map(m => m.id === selectedMission.id ? res.data : m));
      setSelectedMission(res.data);
      setIsEditing(false);
      alert("Görev güncellendi!");
    } catch (err) {
      console.error("Güncelleme hatası", err);
      alert("Güncelleme başarısız.");
    }
  };

  const columns = getColumns();

  return (
    <div className="modern-dashboard">
      <header className="dashboard-header">
        <h1>Görev Paneli</h1>
      </header>

      {/* Modals remain mostly the same... */}
      {selectedMission && (
        <div className="modal-overlay" onClick={closeMissionModal}>
          <div className="mission-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* ... (Existing modal content) ... */}
            <div className="modal-header">
              <h2>{isEditing ? '✏️ Görevi Düzenle' : `📋 Görev Detayı #${selectedMission.id}`}</h2>
              <button className="close-modal" onClick={closeMissionModal}>✕</button>
            </div>

            <div className="modal-content">
              {isEditing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Açıklama</label>
                    <textarea
                      className="filter-input"
                      rows={3}
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Öncelik</label>
                    <select
                      className="filter-select"
                      value={editForm.priority}
                      onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                    >
                      <option value="LOW">Düşük</option>
                      <option value="MEDIUM">Orta</option>
                      <option value="HIGH">Yüksek</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bitiş Tarihi</label>
                    <input
                      type="date"
                      className="filter-input"
                      value={editForm.end_date}
                      onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="detail-section">
                    <label>Açıklama:</label>
                    <p>{selectedMission.description || "Açıklama yok"}</p>
                  </div>
                  <div className="detail-row">
                    <div className="detail-section">
                      <label>Öncelik:</label>
                      <span className={`priority-badge ${getPriorityBadgeClass(selectedMission.priority)}`}>
                        {getPriorityLabel(selectedMission.priority)}
                      </span>
                    </div>
                    <div className="detail-section">
                      <label>Bitiş Tarihi:</label>
                      <span>{formatDate(selectedMission.end_date)}</span>
                    </div>
                    <div className="detail-section">
                      <label>Durum:</label>
                      <span>{selectedMission.status === 'COMPLETED' ? '✅ Bitti' : selectedMission.status === 'IN_PROGRESS' ? '⏳ Devam Ediyor' : '📅 Yapılacak'}</span>
                    </div>
                  </div>
                  <div className="detail-section">
                    <label>👥 Atananlar:</label>
                    <div className="assigned-users-grid">
                      {selectedMission.assigned_users?.map(user => (
                        <div key={user.id} className="user-chip">
                          <span>{formatUserName(user)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="close-modal-btn">İptal</button>
                  <button onClick={handleSaveEdit} className="logout-btn">Kaydet</button>
                </>
              ) : (
                <>
                  {selectedMission.can_edit && (
                    <button onClick={handleEditClick} className="edit-btn" style={{ marginRight: 'auto', background: '#FFC107', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
                      ✏️ Düzenle
                    </button>
                  )}
                  <button onClick={closeMissionModal} className="close-modal-btn">Kapat</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && completingMission && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="mission-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✅ Görevi Tamamla</h2>
              <button className="close-modal" onClick={() => setShowCompleteModal(false)}>✕</button>
            </div>
            <div className="modal-content">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Yorumunuz..."
                className="filter-input"
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <button className="logout-btn" onClick={handleCompleteSubmit}>Tamamla</button>
            </div>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        {/* Filter Panel (Simplified) */}
        <div className="task-list-view">
          <div className="filter-panel">
            <div className="filter-header">
              <h3>🔍 Filtrele</h3>
              {hasActiveFilters() && <button onClick={clearFilters} className="clear-filters-btn">Temizle</button>}
            </div>
            <div className="filter-grid">
              {/* Keeping essential filters */}
              <div className="filter-group">
                <label>Arama</label>
                <input value={filters.searchText} onChange={(e) => handleFilterChange('searchText', e.target.value)} className="filter-input" placeholder="Ara..." />
              </div>
              <div className="filter-group">
                <label>Görev Türü</label>
                <select value={filters.assignmentType} onChange={(e) => handleFilterChange('assignmentType', e.target.value)} className="filter-select">
                  <option value="assigned_to_me">Bana Atananlar</option>
                  <option value="assigned_by_me">Benim Atadıklarım</option>
                </select>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="kanban-board" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }}>
            <DragDropContext onDragEnd={onDragEnd}>
              {Object.values(columns).map(column => (
                <div key={column.id} className="kanban-column" style={{
                  flex: '1',
                  minWidth: '300px',
                  backgroundColor: '#f4f5f7',
                  borderRadius: '8px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <h3 style={{ marginBottom: '10px', color: '#172b4d', fontSize: '1rem', fontWeight: '600', paddingLeft: '8px' }}>
                    {column.title} <span style={{ color: '#6b778c', fontSize: '0.8rem', marginLeft: '5px' }}>({column.items.length})</span>
                  </h3>
                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={{ minHeight: '100px', flex: 1 }}
                      >
                        {column.items.map((mission, index) => (
                          <Draggable key={mission.id} draggableId={mission.id.toString()} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mission-card ${mission.priority ? 'priority-' + mission.priority.toLowerCase() : ''}`}
                                onClick={() => handleMissionClick(mission)}
                                style={{
                                  userSelect: 'none',
                                  padding: '12px',
                                  margin: '0 0 8px 0',
                                  backgroundColor: 'white',
                                  borderRadius: '6px',
                                  boxShadow: '0 1px 2px rgba(9, 30, 66, 0.25)',
                                  ...provided.draggableProps.style
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span className={`priority-dot ${mission.priority ? mission.priority.toLowerCase() : 'medium'}`}></span>
                                  <span style={{ fontSize: '11px', color: '#6b778c' }}>{formatDate(mission.end_date)}</span>
                                </div>
                                <div style={{ marginBottom: '8px', fontSize: '14px', color: '#172b4d', fontWeight: 500 }}>
                                  {mission.description}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  {mission.assigned_users?.map(u => (
                                    <span key={u.id} className="user-avatar-tiny" title={formatUserName(u)} style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#dfe1e6', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {formatUserName(u).charAt(0)}
                                    </span>
                                  )).slice(0, 3)}
                                  {mission.assigned_users?.length > 3 && <span style={{ fontSize: '10px', color: '#6b778c' }}>+{mission.assigned_users.length - 3}</span>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </DragDropContext>
          </div>
        </div>
      </main>
    </div>
  );
};
export default Dashboard;