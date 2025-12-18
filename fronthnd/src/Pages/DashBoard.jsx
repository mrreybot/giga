// dashboard.jsx

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Trash2,
  AlertCircle,
  MessageSquare,
  FileText
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

  const [filters, setFilters] = useState({
    status: 'all',
    searchText: '',
    selectedUser: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "",
    priority: "MEDIUM",
    end_date: ""
  });

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
      await fetchCurrentUser();
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

  const applyCommonFilters = (missionList) => {
    return missionList.filter(mission => {
      if (!mission) return false;

      if (filters.status === 'completed' && mission.status !== 'COMPLETED' && !mission.completed) return false;
      if (filters.status === 'pending') {
        if (mission.status === 'COMPLETED' || mission.completed) return false;
      }

      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const descMatch = mission.description?.toLowerCase().includes(searchLower);
        const locationMatch = mission.from_to?.toLowerCase().includes(searchLower);
        const creatorMatch = formatUserName(mission.created_by_info)?.toLowerCase().includes(searchLower);
        const assigneeMatch = mission.assigned_users?.some(u => formatUserName(u).toLowerCase().includes(searchLower));

        if (!descMatch && !locationMatch && !creatorMatch && !assigneeMatch) return false;
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
  };

  const myKanbanMissions = applyCommonFilters(
    missions.filter(m => currentUser && m.assigned_users?.some(u => u.id === currentUser.id))
  );

  const myOutgoingMissions = applyCommonFilters(
    missions.filter(m => currentUser && m.created_by_info?.id === currentUser.id)
  );

  const getGroupedOutgoingMissions = () => {
    const grouped = {};

    myOutgoingMissions.forEach(mission => {
      if (!mission.assigned_users || mission.assigned_users.length === 0) {
        const dept = "Atanmamış";
        if (!grouped[dept]) grouped[dept] = {};
        if (!grouped[dept]["Bilinmiyor"]) grouped[dept]["Bilinmiyor"] = [];
        grouped[dept]["Bilinmiyor"].push(mission);
        return;
      }

      mission.assigned_users.forEach(user => {
        const dept = user.department || "Diğer";
        const userName = formatUserName(user);

        if (!grouped[dept]) grouped[dept] = {};
        if (!grouped[dept][userName]) grouped[dept][userName] = [];

        if (!grouped[dept][userName].find(m => m.id === mission.id)) {
          grouped[dept][userName].push(mission);
        }
      });
    });

    return grouped;
  };

  const groupedOutgoing = getGroupedOutgoingMissions();

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

    const originalMissions = [...missions];
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: newStatus, completed: newStatus === 'COMPLETED' } : m));

    try {
      await api.patch(`/api/missions/${missionId}/`, { status: newStatus });
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Durum güncellenemedi.");
      setMissions(originalMissions);
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

  const KanbanBoard = () => (
    <div className="kanban-section">
      <h2 className="section-title-sticky">
        <ClipboardList size={22} /> Bana Atanan Görevler
      </h2>
      <div className="kanban-board">
        <DragDropContext onDragEnd={onDragEnd}>
          {Object.values(columns).map(column => (
            <div key={column.id} className="kanban-column">
              <h3 className="kanban-column-title">
                {column.title} <span className="kanban-count">({column.items.length})</span>
              </h3>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="kanban-column-content">
                    {column.items.map((mission, index) => (
                      <Draggable key={mission.id} draggableId={mission.id.toString()} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mission-card ${mission.priority ? 'priority-' + mission.priority.toLowerCase() : ''}`}
                            onClick={() => handleMissionClick(mission)}
                            style={provided.draggableProps.style}
                          >
                            <div className="kanban-card-header">
                              <span className={`priority-dot ${mission.priority ? mission.priority.toLowerCase() : 'medium'}`}></span>
                              <span className="kanban-card-date">{formatDate(mission.end_date)}</span>
                            </div>
                            <div className="kanban-card-body">
                              {mission.description}
                            </div>
                            <div className="kanban-card-footer">
                              {mission.assigned_users?.slice(0, 3).map(u => (
                                <span key={u.id} className="user-avatar-tiny" title={formatUserName(u)}>
                                  {formatUserName(u).charAt(0)}
                                </span>
                              ))}
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
      <h2 className="section-title-sticky">
        <Upload size={22} /> Benim Atadığım Görevler
      </h2>
      {Object.keys(groupedOutgoing).length === 0 ? (
        <p className="no-data-text">Henüz atadığınız bir görev bulunmuyor.</p>
      ) : (
        Object.entries(groupedOutgoing).map(([dept, usersObj]) => (
          <div key={dept} className="dept-group">
            <h3 className="dept-header">{dept}</h3>
            <div className="dept-content">
              {Object.entries(usersObj).map(([userName, missions]) => (
                <div key={userName} className="user-group">
                  <h4 className="user-header">
                    <User size={16} /> {userName} <span className="count-badge">{missions.length}</span>
                  </h4>
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

  const isManagerOrCEO = currentUser && (currentUser.role === 'CEO' || currentUser.role === 'MANAGER');

  return (
    <div className="modern-dashboard">
      <header className="dashboard-header">
        <h1>Görev Paneli</h1>
      </header>

      {/* Mission Detail Modal */}
      {/* Selimhan buraları düzeltti */}
      {selectedMission && (
        <div className="modal-overlay" onClick={closeMissionModal}>
          <div className="mission-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeMissionModal}>
              <X size={20} />
            </button>

            <div className="modal-hero">
              <div className="modal-hero-icon">
                <ClipboardList size={28} />
              </div>
              <div className="modal-hero-content">
                <h2 className="modal-title">
                  {isEditing ? 'Görevi Düzenle' : `Görev #${selectedMission.id}`}
                </h2>
                <div className="modal-subtitle">
                  <span className={`status-badge status-${selectedMission.status?.toLowerCase() || 'pending'}`}>
                    {selectedMission.status === 'COMPLETED' ? (
                      <>
                        <CheckCircle size={14} /> Tamamlandı
                      </>
                    ) : selectedMission.status === 'IN_PROGRESS' ? (
                      <>
                        <Clock size={14} /> Devam Ediyor
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} /> Bekliyor
                      </>
                    )}
                  </span>
                  <span className={`priority-badge ${getPriorityBadgeClass(selectedMission.priority)}`}>
                    {getPriorityLabel(selectedMission.priority)}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-content">
              {isEditing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label className="form-label">
                      <FileText size={16} />
                      Açıklama
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Görev açıklamasını girin..."
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        <AlertCircle size={16} />
                        Öncelik
                      </label>
                      <select
                        className="form-select"
                        value={editForm.priority}
                        onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                      >
                        <option value="LOW">Düşük</option>
                        <option value="MEDIUM">Orta</option>
                        <option value="HIGH">Yüksek</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <Calendar size={16} />
                        Bitiş Tarihi
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={editForm.end_date}
                        onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="detail-card">
                    <div className="detail-card-header">
                      <FileText size={18} />
                      <span>Açıklama</span>
                    </div>
                    <p className="detail-card-text">{selectedMission.description}</p>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-card">
                      <div className="detail-card-header">
                        <Calendar size={18} />
                        <span>Bitiş Tarihi</span>
                      </div>
                      <p className="detail-card-value">{formatDate(selectedMission.end_date)}</p>
                    </div>

                    <div className="detail-card">
                      <div className="detail-card-header">
                        <User size={18} />
                        <span>Oluşturan</span>
                      </div>
                      <p className="detail-card-value">{formatUserName(selectedMission.created_by_info)}</p>
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-card-header">
                      <Users size={18} />
                      <span>Atanan Kullanıcılar</span>
                    </div>
                    <div className="assigned-users-grid">
                      {selectedMission.assigned_users?.map(user => (
                        <div key={user.id} className="user-chip-modern">
                          <div className="user-avatar-modern">
                            {formatUserName(user).charAt(0)}
                          </div>
                          <div className="user-chip-info">
                            <span className="user-chip-name">{formatUserName(user)}</span>
                            {user.department && (
                              <span className="user-chip-dept">{user.department}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary btn-compact">
                    <X size={16} />
                    İptal
                  </button>
                  <button onClick={handleSaveEdit} className="btn-primary btn-compact">
                    <CheckCircle size={16} />
                    Kaydet
                  </button>
                </>
              ) : (
                <>
                  {/* İlk Satır: Düzenle ve Sil */}
                  {selectedMission.can_edit && (
                    <button onClick={handleEditClick} className="btn-edit btn-compact">
                      <Edit size={16} />
                      Düzenle
                    </button>
                  )}

                  {currentUser && selectedMission.created_by_info?.id === currentUser.id && (
                    <button onClick={handleDeleteMission} className="btn-delete btn-compact">
                      <Trash2 size={16} />
                      Sil
                    </button>
                  )}

                  {/* İkinci Satır: Tamamla ve Kapat */}
                  {selectedMission.can_complete && !selectedMission.completed && (
                    <button onClick={(e) => handleCompleteClick(selectedMission, e)} className="btn-success btn-compact">
                      <CheckCircle size={16} />
                      Tamamla
                    </button>
                  )}

                  <button onClick={closeMissionModal} className="btn-secondary btn-compact">
                    <X size={16} />
                    Kapat
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && completingMission && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="complete-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowCompleteModal(false)}>
              <X size={20} />
            </button>

            <div className="modal-hero">
              <div className="modal-hero-icon success">
                <CheckCircle size={28} />
              </div>
              <div className="modal-hero-content">
                <h2 className="modal-title">Görevi Tamamla</h2>
                <p className="modal-subtitle-text">Bu görevi tamamlamak üzeresiniz. Yorumunuzu ekleyebilirsiniz.</p>
              </div>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">
                  <MessageSquare size={16} />
                  Yorumunuz (Opsiyonel)
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Görev hakkında notlarınızı ekleyin..."
                  className="form-textarea"
                  rows={5}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCompleteModal(false)}>
                İptal
              </button>
              <button className="btn-success" onClick={handleCompleteSubmit}>
                <CheckCircle size={18} />
                Tamamla
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        <div className="task-list-view">
          <div className="filter-panel">
            <div className="filter-header">
              <h3>Filtrele</h3> {/* Selimhan buraları düzeltti */}
              {hasActiveFilters() && <button onClick={clearFilters} className="clear-filters-btn">Temizle</button>}
            </div>
            <div className="filter-grid">
              <div className="filter-group">
                <label>Arama</label>
                <div className="input-with-icon">
                  <Search size={16} className="input-icon" />
                  <input
                    value={filters.searchText}
                    onChange={(e) => handleFilterChange('searchText', e.target.value)}
                    className="filter-input"
                    placeholder="Görev, kişi veya konum ara..."
                  />
                </div>
              </div>
              <div className="filter-group">
                <label>Tarih Aralığı</label>
                <div className="date-range-inputs">
                  <input
                    type="date"
                    className="filter-input"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                  <input
                    type="date"
                    className="filter-input"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner">
                <Loader size={32} className="spin-animation" />
              </div>
              <p>Yükleniyor...</p>
            </div>
          ) : isManagerOrCEO ? (
            <>
              <GroupedList />
              <div className="divider-line"></div>
              <KanbanBoard />
            </>
          ) : (
            <>
              <KanbanBoard />
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