import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import api from "../services/api";
import "../styles/Dashboard.css";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ClipboardList,
  Upload,
  User,
  Calendar,
  Edit,
  CheckCircle,
  Clock,
  Users,
  Search,
  X,
  Loader,
  Filter,
  Trash2 // Imported Trash2
} from 'lucide-react';

const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingMission, setCompletingMission] = useState(null);

  // Filter state (assignmentType removed as we split the view)
  const [filters, setFilters] = useState({
    status: 'all',
    searchText: '',
    selectedUser: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "",
    priority: "MEDIUM",
    end_date: ""
  });

  // Formatter functions - Moved to top to avoid ReferenceError
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatUserName = (user) => {
    if (!user) return 'İsimsiz';
    return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
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

  useEffect(() => {
    if (location.state?.filterStatus) {
      setFilters(prev => ({ ...prev, status: location.state.filterStatus }));
    }
    loadDashboardData();
  }, [location.state]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await fetchCurrentUser(); // Need user for splitting logic
      await fetchMissions();
      await fetchUsers();
    } catch (error) {
      console.error("❌ Dashboard yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/api/user/profile/');
      setCurrentUser(res.data);
    } catch (error) {
      console.error("Profil yüklenemedi:", error);
    }
  };

  const fetchMissions = async () => {
    try {
      const response = await api.get(MISSIONS_ENDPOINT);
      const missionData = response.data.results || response.data;
      setMissions(Array.isArray(missionData) ? missionData : []);
    } catch (error) {
      console.error("❌ Görevler yüklenemedi:", error);
      alert(`Görevler yüklenirken hata oluştu!\n${error.response?.data?.detail || error.message}`);
      setMissions([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get(USERS_ENDPOINT);
      let userData = [];
      if (Array.isArray(response.data)) {
        userData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        userData = Object.values(response.data).flat();
      }
      setUsers(userData);
    } catch (error) {
      console.error("❌ Kullanıcılar yüklenemedi:", error);
      setUsers([]);
    }
  };

  // --- Splitting Logic ---
  // Helper to filter missions based on common filters (search, date, etc.)
  const applyCommonFilters = (missionList) => {
    return missionList.filter(mission => {
      if (!mission) return false;

      // Status Filter
      if (filters.status === 'completed' && mission.status !== 'COMPLETED' && !mission.completed) return false;
      if (filters.status === 'pending') {
        if (mission.status === 'COMPLETED' || mission.completed) return false;
      }

      // Search Filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const descMatch = mission.description?.toLowerCase().includes(searchLower);
        const locationMatch = mission.from_to?.toLowerCase().includes(searchLower);
        const creatorMatch = formatUserName(mission.created_by_info)?.toLowerCase().includes(searchLower);
        // Check assigned users names too
        const assigneeMatch = mission.assigned_users?.some(u => formatUserName(u).toLowerCase().includes(searchLower));

        if (!descMatch && !locationMatch && !creatorMatch && !assigneeMatch) return false;
      }

      // Selected User Filter
      if (filters.selectedUser !== 'all') {
        const hasUser = mission.assigned_users?.some(u => u.id === parseInt(filters.selectedUser));
        if (!hasUser) return false;
      }

      // Date Filters
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
  };

  // 1. Kanban Missions: Assigned TO Me (Strictly check assigned_users)
  const myKanbanMissions = applyCommonFilters(
    missions.filter(m => currentUser && m.assigned_users?.some(u => u.id === currentUser.id))
  );

  // 2. Outgoing Missions: Assigned BY Me (Created by me)
  const myOutgoingMissions = applyCommonFilters(
    missions.filter(m => currentUser && m.created_by_info?.id === currentUser.id)
  );

  // Grouping Logic for Outgoing Missions
  // Group by Department -> User
  const getGroupedOutgoingMissions = () => {
    const grouped = {};

    myOutgoingMissions.forEach(mission => {
      // If no assigned users, maybe put under 'Atanmamış'
      if (!mission.assigned_users || mission.assigned_users.length === 0) {
        const dept = "Atanmamış";
        if (!grouped[dept]) grouped[dept] = {};
        if (!grouped[dept]["Bilinmiyor"]) grouped[dept]["Bilinmiyor"] = [];
        grouped[dept]["Bilinmiyor"].push(mission);
        return;
      }

      mission.assigned_users.forEach(user => {
        // Use User's department. If missing, use "Genel"
        const dept = user.department || "Diğer";
        const userName = formatUserName(user);

        if (!grouped[dept]) grouped[dept] = {};
        if (!grouped[dept][userName]) grouped[dept][userName] = [];

        // Avoid adding same mission multiple times to the same user list (unlikely unless data issue)
        if (!grouped[dept][userName].find(m => m.id === mission.id)) {
          grouped[dept][userName].push(mission);
        }
      });
    });

    return grouped;
  };

  const groupedOutgoing = getGroupedOutgoingMissions();


  // --- Kanban Columns Logic (Only for My Kanban Missions) ---
  const getColumns = () => {
    const columns = {
      PENDING: { id: 'PENDING', title: 'Yapılacak', items: [] },
      IN_PROGRESS: { id: 'IN_PROGRESS', title: 'Devam Ediyor', items: [] },
      COMPLETED: { id: 'COMPLETED', title: 'Tamamlandı', items: [] }
    };

    myKanbanMissions.forEach(mission => {
      let status = mission.status || (mission.completed ? 'COMPLETED' : 'PENDING');
      if (!columns[status]) status = 'PENDING';
      columns[status].items.push(mission);
    });

    return columns;
  };

  const columns = getColumns();

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

  const handleMissionClick = (mission) => {
    setSelectedMission(mission);
  };

  const closeMissionModal = () => {
    setSelectedMission(null);
    setIsEditing(false);
  };

  const handleDeleteMission = async () => {
    if (!selectedMission || !window.confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/api/missions/${selectedMission.id}/`);
      setMissions(prev => prev.filter(m => m.id !== selectedMission.id));
      closeMissionModal();
      alert("Görev silindi.");
    } catch (err) {
      console.error("Silme hatası:", err);
      alert("Görev silinemedi.");
    }
  };

  /* ... Actions (Complete, Edit) ... */
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
      setMissions(prev => prev.map(m => m.id === completingMission.id ? { ...res.data, status: 'COMPLETED' } : m));
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

  // --- Render Components ---

  const KanbanBoard = () => (
    <div className="kanban-section">
      <h2 className="section-title-sticky"><ClipboardList size={22} style={{ marginRight: 8 }} /> Bana Atanan Görevler (Kanban)</h2>
      <div className="kanban-board" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {Object.values(columns).map(column => (
            <div key={column.id} className="kanban-column" style={{
              flex: '1', minWidth: '300px', backgroundColor: '#f4f5f7', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ marginBottom: '10px', color: '#172b4d', fontSize: '1rem', fontWeight: '600', paddingLeft: '8px' }}>
                {column.title} <span style={{ color: '#6b778c', fontSize: '0.8rem', marginLeft: '5px' }}>({column.items.length})</span>
              </h3>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ minHeight: '100px', flex: 1 }}>
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
                              userSelect: 'none', padding: '12px', margin: '0 0 8px 0', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 2px rgba(9, 30, 66, 0.25)',
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
                            {/* Avatar display logic same as before */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {mission.assigned_users?.map(u => (
                                <span key={u.id} className="user-avatar-tiny" title={formatUserName(u)} style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#dfe1e6', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {formatUserName(u).charAt(0)}
                                </span>
                              )).slice(0, 3)}
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
  );

  const GroupedList = () => (
    <div className="grouped-list-section">
      <h2 className="section-title-sticky"><Upload size={22} style={{ marginRight: 8 }} /> Benim Atadığım Görevler</h2>
      {Object.keys(groupedOutgoing).length === 0 ? (
        <p className="no-data-text">Henüz atadığınız bir görev bulunmuyor.</p>
      ) : (
        Object.entries(groupedOutgoing).map(([dept, usersObj]) => (
          <div key={dept} className="dept-group">
            <h3 className="dept-header">{dept}</h3>
            <div className="dept-content">
              {Object.entries(usersObj).map(([userName, missions]) => (
                <div key={userName} className="user-group">
                  <h4 className="user-header"><User size={16} /> {userName} <span className="count-badge">{missions.length}</span></h4>
                  <div className="missions-grid-list">
                    {missions.map(mission => (
                      <div key={mission.id} className="mission-list-item" onClick={() => handleMissionClick(mission)}>
                        <div className="mission-main-info">
                          <span className={`status-dot status-${mission.status?.toLowerCase() || 'pending'}`}></span>
                          <span className="mission-desc">{mission.description}</span>
                        </div>
                        <div className="mission-meta">
                          <span className={`priority-tag ${mission.priority?.toLowerCase()}`}>{getPriorityLabel(mission.priority)}</span>
                          <span className="mission-date"><Calendar size={14} /> {formatDate(mission.end_date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Role Based Layout
  const isManagerOrCEO = currentUser && (currentUser.role === 'CEO' || currentUser.role === 'MANAGER');

  return (
    <div className="modern-dashboard">
      <header className="dashboard-header">
        <h1>Görev Paneli</h1>
      </header>

      {/* Modal Definitions (Same as before) */}
      {selectedMission && (
        <div className="modal-overlay" onClick={closeMissionModal}>
          <div className="mission-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? <><Edit size={24} /> Görevi Düzenle</> : <><ClipboardList size={24} /> Görev Detayı #{selectedMission.id}</>}</h2>
              <button className="close-modal" onClick={closeMissionModal}><X size={24} /></button>
            </div>
            <div className="modal-content">
              {isEditing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Açıklama</label>
                    <textarea className="filter-input" rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Öncelik</label>
                    <select className="filter-select" value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                      <option value="LOW">Düşük</option>
                      <option value="MEDIUM">Orta</option>
                      <option value="HIGH">Yüksek</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bitiş Tarihi</label>
                    <input type="date" className="filter-input" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="detail-section"><label>Açıklama:</label><p>{selectedMission.description}</p></div>
                  <div className="detail-row">
                    <div className="detail-section"><label>Öncelik:</label><span className={`priority-badge ${getPriorityBadgeClass(selectedMission.priority)}`}>{getPriorityLabel(selectedMission.priority)}</span></div>
                    <div className="detail-section"><label>Bitiş:</label><span>{formatDate(selectedMission.end_date)}</span></div>
                    <div className="detail-section"><label>Durum:</label><span>{selectedMission.status === 'COMPLETED' ? <><CheckCircle size={16} /> Bitti</> : selectedMission.status === 'IN_PROGRESS' ? <><Clock size={16} /> Devam Ediyor</> : <><Calendar size={16} /> Yapılacak</>}</span></div>
                  </div>
                  <div className="detail-section">
                    <label><Users size={16} /> Atananlar:</label>
                    <div className="assigned-users-grid">
                      {selectedMission.assigned_users?.map(user => (
                        <div key={user.id} className="user-chip"><span>{formatUserName(user)}</span></div>
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
                  {selectedMission.can_edit && <button onClick={handleEditClick} className="edit-btn" style={{ marginRight: 'auto', background: '#FFC107', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit size={16} /> Düzenle</button>}

                  {/* Delete Button for Creator */}
                  {currentUser && selectedMission.created_by_info?.id === currentUser.id && (
                    <button onClick={handleDeleteMission} className="delete-btn" style={{ marginLeft: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Trash2 size={16} /> Sil
                    </button>
                  )}

                  {selectedMission.can_complete && !selectedMission.completed && <button onClick={(e) => handleCompleteClick(selectedMission, e)} className="logout-btn">Tamamla</button>}
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
            <div className="modal-header"><h2><CheckCircle size={24} /> Görevi Tamamla</h2><button onClick={() => setShowCompleteModal(false)} className="close-modal"><X size={24} /></button></div>
            <div className="modal-content"><textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Yorumunuz..." className="filter-input" rows={4} /></div>
            <div className="modal-footer"><button className="logout-btn" onClick={handleCompleteSubmit}>Tamamla</button></div>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        <div className="task-list-view">
          {/* Filter Panel */}
          <div className="filter-panel">
            <div className="filter-header">
              <h3><Filter size={18} /> Filtrele</h3>
              {hasActiveFilters() && <button onClick={clearFilters} className="clear-filters-btn">Temizle</button>}
            </div>
            <div className="filter-grid">
              <div className="filter-group">
                <label>Arama</label>
                <div style={{ position: 'relative' }}>
                  <input value={filters.searchText} onChange={(e) => handleFilterChange('searchText', e.target.value)} className="filter-input" placeholder="Görev, kişi veya konum ara..." style={{ paddingLeft: '32px' }} />
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                </div>
              </div>
              <div className="filter-group">
                <label>Tarih Aralığı</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="date" className="filter-input" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} />
                  <input type="date" className="filter-input" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Layout Based on Role */}
          {loading ? (
            <div className="loading-state"><div className="spinner"><Loader size={32} className="spin-animation" /></div><p>Yükleniyor...</p></div>
          ) : isManagerOrCEO ? (
            <>
              <GroupedList />
              <div className="divider-line"></div>
              <KanbanBoard />
            </>
          ) : (
            <>
              <KanbanBoard />
              {/* Even employees might have assigned tasks if they are allowed to assign */}
              {myOutgoingMissions.length > 0 && (
                <>
                  <div className="divider-line"></div>
                  <GroupedList />
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;