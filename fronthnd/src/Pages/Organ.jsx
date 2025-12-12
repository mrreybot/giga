import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Organ.css";

const ORG_CHART_ENDPOINT = "/api/users/organization/";

const Organ = () => {
  const [orgData, setOrgData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState({});

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    setLoading(true);
    try {
      const response = await api.get(ORG_CHART_ENDPOINT);
      processOrgData(response.data);
    } catch (error) {
      console.error("❌ Organizasyon şeması yüklenemedi:", error);
      alert("Organizasyon şeması yüklenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  const processOrgData = (data) => {
    // 1. Flatten all users from the response roles
    const allUsers = [
      ...(data.CEO || []),
      ...(data.MANAGER || []),
      ...(data.EMPLOYEE || [])
    ];

    // 2. Identification
    // CEO: Role 'CEO' OR Department 'Yönetim'
    const ceoUsers = allUsers.filter(u => u.role === 'CEO' || u.department === 'Yönetim');

    // Departments List (excluding Yönetim)
    const departments = [
      "Depozito Yönetim Sistemi",
      "Geri Kazanım ve Üretici",
      "Çevre Koruma",
      "Bilgi Teknolojileri",
      "İnsan Kaynakları"
    ];

    // 3. Build Hierarchy per Department
    const deptHierarchy = departments.map(deptName => {
      // Find Director: Role MANAGER and Department matches
      // If multiple managers, take the first one (or list all, simplified to first for now or list)
      const directors = allUsers.filter(u => u.role === 'MANAGER' && u.department === deptName);

      // Find Employees: Department matches AND NOT Manager (or Manager but not strictly the director if we had separate Director role, but here Manager is the director)
      // Any user in department who is not the 'Director' we picked? 
      // Actually Logic: 
      // Director = Managers of that dept.
      // Employees = Employees of that dept.
      const employees = allUsers.filter(u => u.department === deptName && u.role !== 'MANAGER' && u.role !== 'CEO');

      return {
        name: deptName,
        directors: directors,
        employees: employees
      };
    });

    setOrgData({
      ceo: ceoUsers,
      departments: deptHierarchy
    });
  };

  const formatUserName = (user) => {
    if (!user) return 'İsimsiz';
    return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const toggleDeptExpand = (deptName) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptName]: !prev[deptName]
    }));
  };

  return (
    <div className="organ-container">
      <div className="org-structure">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Organizasyon yapısı yükleniyor...</p>
          </div>
        ) : (
          <div className="org-tree-wrapper">

            {/* 1. LEVEL: CEO / YÖNETİM */}
            <div className="level-ceo-container">
              {orgData.ceo?.map(ceo => (
                <div key={ceo.id} className="org-card ceo-card" onClick={() => handleUserClick(ceo)}>
                  <div className="card-role">GENEL MÜDÜR</div>
                  <div className="card-avatar">
                    {ceo.profile_photo ? <img src={ceo.profile_photo} alt={ceo.username} /> : <span>{ceo.first_name?.[0]}</span>}
                  </div>
                  <div className="card-name">{formatUserName(ceo)}</div>
                </div>
              ))}
              <div className="vertical-line-central"></div>
            </div>

            {/* 2. LEVEL: DEPARTMENTS ROW */}
            <div className="level-depts-container">
              {/* Horizontal Connector */}
              <div className="connector-line-horizontal"></div>

              <div className="depts-grid">
                {orgData.departments?.map((dept, index) => (
                  <div key={index} className="dept-column">
                    <div className="vertical-line-connector"></div>

                    {/* Department Director Card */}
                    <div className="dept-header-card">
                      <div className="dept-title">{dept.name}</div>
                      {dept.directors.length > 0 ? (
                        dept.directors.map(dir => (
                          <div key={dir.id} className="org-card director-card" onClick={() => handleUserClick(dir)}>
                            <div className="card-role">DAİRE BAŞKANI</div>
                            <div className="card-name">{formatUserName(dir)}</div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-director">
                          <span>Atanmamış</span>
                        </div>
                      )}
                    </div>

                    {/* Connector to Employees */}
                    {dept.employees.length > 0 && <div className="vertical-line-short"></div>}

                    {/* Employees List */}
                    {dept.employees.length > 0 && (
                      <div className="employees-container">
                        <button className="employee-toggle-btn" onClick={() => toggleDeptExpand(dept.name)}>
                          {dept.employees.length} Çalışan {expandedDepts[dept.name] ? '▼' : '▶'}
                        </button>

                        {expandedDepts[dept.name] && (
                          <div className="employee-list">
                            {dept.employees.map(emp => (
                              <div key={emp.id} className="employee-item" onClick={() => handleUserClick(emp)}>
                                <div className="emp-avatar-small">
                                  {emp.first_name?.[0] || '?'}
                                </div>
                                <span className="emp-name">{formatUserName(emp)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Modal - Same as before */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Kullanıcı Detayları</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-avatar">
                {selectedUser.profile_photo ? (
                  <img src={selectedUser.profile_photo} alt={formatUserName(selectedUser)} />
                ) : (
                  <div className="avatar-placeholder">
                    {formatUserName(selectedUser).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="modal-name">{formatUserName(selectedUser)}</h3>
              <div className="modal-role-badge">{selectedUser.role}</div>

              <div className="modal-info">
                {selectedUser.email && (
                  <div className="modal-info-item">
                    <span className="info-label">📧 E-posta:</span>
                    <span className="info-value">{selectedUser.email}</span>
                  </div>
                )}
                <div className="modal-info-item">
                  <span className="info-label">🏢 Departman:</span>
                  <span className="info-value">{selectedUser.department || '-'}</span>
                </div>
                {selectedUser.phone && (
                  <div className="modal-info-item">
                    <span className="info-label">📞 Telefon:</span>
                    <span className="info-value">{selectedUser.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organ;