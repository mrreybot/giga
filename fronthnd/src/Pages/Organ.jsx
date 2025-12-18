import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Organ.css";
import { Mail, Phone, Building, User, X, MapPin } from "lucide-react";

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

      {/* Modal - Improved UI */}
      {showModal && selectedUser && (
        <div className="organ-modal-overlay" onClick={closeModal}>
          <div className="organ-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="organ-close-btn" onClick={closeModal}>
              <X size={24} />
            </button>

            <div className="organ-modal-header-bg"></div>

            <div className="organ-modal-body">
              <div className="organ-modal-avatar-wrapper">
                {selectedUser.profile_photo ? (
                  <img src={selectedUser.profile_photo} alt={formatUserName(selectedUser)} className="organ-modal-avatar-img" />
                ) : (
                  <div className="organ-modal-avatar-placeholder">
                    {formatUserName(selectedUser).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="organ-modal-main-info">
                <h3 className="organ-modal-name">{formatUserName(selectedUser)}</h3>
                <span className="organ-modal-role">{selectedUser.role}</span>
              </div>

              <div className="organ-modal-details-list">
                <div className="organ-detail-item">
                  <div className="organ-icon-box">
                    <Building size={18} />
                  </div>
                  <div className="organ-detail-text">
                    <span className="organ-label">Departman</span>
                    <span className="organ-value">{selectedUser.department || 'Belirtilmemiş'}</span>
                  </div>
                </div>

                {selectedUser.email && (
                  <div className="organ-detail-item">
                    <div className="organ-icon-box">
                      <Mail size={18} />
                    </div>
                    <div className="organ-detail-text">
                      <span className="organ-label">E-posta</span>
                      <a href={`mailto:${selectedUser.email}`} className="organ-value link">{selectedUser.email}</a>
                    </div>
                  </div>
                )}

                {selectedUser.phone && (
                  <div className="organ-detail-item">
                    <div className="organ-icon-box">
                      <Phone size={18} />
                    </div>
                    <div className="organ-detail-text">
                      <span className="organ-label">Telefon</span>
                      <span className="organ-value">{selectedUser.phone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="organ-modal-footer">
              <span className="organ-company-tag">GIGA Inc.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organ;