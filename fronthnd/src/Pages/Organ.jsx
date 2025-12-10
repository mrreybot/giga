import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Organ.css";

const ORG_CHART_ENDPOINT = "/api/users/organization/";

const Organ = () => {
  const [orgChart, setOrgChart] = useState({ CEO: [], MANAGER: [], EMPLOYEE: [] });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    setLoading(true);
    try {
      const response = await api.get(ORG_CHART_ENDPOINT);
      setOrgChart(response.data);
      console.log("✅ Organizasyon şeması yüklendi:", response.data);
    } catch (error) {
      console.error("❌ Organizasyon şeması yüklenemedi:", error);
      alert("Organizasyon şeması yüklenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
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

  // Departmanlara göre çalışanları grupla
  const departments = [
    "Depozito Yönetim Sistemi",
    "Geri Kazanım ve Üretici",
    "Çevre Koruma",
    "Bilgi Teknolojileri"
  ];

  // Employee'leri departmanlara dağıt (eğer department null ise)
  const getEmployeesByDepartment = () => {
    const employeesWithDept = orgChart.EMPLOYEE.filter(emp => emp.department);
    const employeesWithoutDept = orgChart.EMPLOYEE.filter(emp => !emp.department);
    
    const deptMap = {};
    departments.forEach(dept => {
      deptMap[dept] = employeesWithDept.filter(emp => emp.department === dept);
    });

    // Departmanı olmayanları eşit şekilde dağıt
    employeesWithoutDept.forEach((emp, index) => {
      const deptIndex = index % departments.length;
      deptMap[departments[deptIndex]].push(emp);
    });

    return deptMap;
  };

  const employeesByDept = getEmployeesByDepartment();

  return (
    <div className="organ-container">
      <div className="org-chart-wrapper">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Organizasyon yapısı yükleniyor...</p>
          </div>
        ) : (
          <div className="org-tree">
            {/* Yönetim Kurulu */}
            <div className="org-level level-board">
              <div className="org-node board-node">
                <div className="node-title">YÖNETİM KURULU</div>
              </div>
              <div className="vertical-line"></div>
            </div>

            {/* CEO */}
            <div className="org-level level-ceo">
              {orgChart.CEO.map(ceo => (
                <div key={ceo.id} className="org-node ceo-node" onClick={() => handleUserClick(ceo)}>
                  <div className="node-title">TÜRKİYE ÇEVRE AJANSI BAŞKANI</div>
                  <div className="node-name">{formatUserName(ceo)}</div>
                </div>
              ))}
              <div className="vertical-line"></div>
            </div>

            {/* İletişim Direktörlüğü & Özel Kalem */}
            <div className="org-level level-special">
              <div className="special-units">
                <div className="org-node special-node">
                  <div className="node-name">İLETİŞİM DİREKTÖRLÜĞÜ</div>
                </div>
                <div className="org-node special-node">
                  <div className="node-name">ÖZEL KALEM</div>
                </div>
              </div>
              <div className="vertical-line"></div>
            </div>

            {/* Managers */}
            <div className="org-level level-managers">
              <div className="managers-container">
                {orgChart.MANAGER.map((manager, index) => (
                  <div key={manager.id} className="manager-branch">
                    <div className="vertical-line-manager"></div>
                    <div className="org-node manager-node" onClick={() => handleUserClick(manager)}>
                      <div className="node-title">BAŞKAN YARDIMCISI</div>
                      <div className="node-name">{formatUserName(manager)}</div>
                    </div>
                    
                    {/* Sol Manager için Departmanlar */}
                    {index === 0 && (
                      <div className="departments-container">
                        <div className="horizontal-line"></div>
                        <div className="departments-grid">
                          {departments.map((dept, deptIndex) => (
                            <div key={deptIndex} className="department-branch">
                              <div className="vertical-line-dept"></div>
                              <div className="org-node dept-node">
                                <div className="node-name">{dept}</div>
                              </div>
                              
                              {/* Departman altındaki çalışanlar */}
                              {employeesByDept[dept] && employeesByDept[dept].length > 0 && (
                                <div className="employees-list">
                                  <div className="vertical-line-emp"></div>
                                  {employeesByDept[dept].map(emp => (
                                    <div 
                                      key={emp.id} 
                                      className="org-node employee-node"
                                      onClick={() => handleUserClick(emp)}
                                    >
                                      <div className="node-name">{formatUserName(emp)}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
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
                {selectedUser.username && (
                  <div className="modal-info-item">
                    <span className="info-label">👤 Kullanıcı Adı:</span>
                    <span className="info-value">{selectedUser.username}</span>
                  </div>
                )}
                {selectedUser.unvan && (
                  <div className="modal-info-item">
                    <span className="info-label">🏷️ Ünvan:</span>
                    <span className="info-value">{selectedUser.unvan}</span>
                  </div>
                )}
                {selectedUser.department && (
                  <div className="modal-info-item">
                    <span className="info-label">🏢 Departman:</span>
                    <span className="info-value">{selectedUser.department}</span>
                  </div>
                )}
                {selectedUser.phone && (
                  <div className="modal-info-item">
                    <span className="info-label">📞 Telefon:</span>
                    <span className="info-value">{selectedUser.phone}</span>
                  </div>
                )}
              </div>

              <div className="modal-preferences">
                <h4>Bildirim Ayarları</h4>
                <div className="preferences-grid">
                  <div className="pref-item">
                    <span>E-posta Bildirimleri</span>
                    <span className={selectedUser.email_notifications ? "active" : "inactive"}>
                      {selectedUser.email_notifications ? "✓ Aktif" : "✗ Pasif"}
                    </span>
                  </div>
                  <div className="pref-item">
                    <span>Görev Hatırlatıcıları</span>
                    <span className={selectedUser.task_reminders ? "active" : "inactive"}>
                      {selectedUser.task_reminders ? "✓ Aktif" : "✗ Pasif"}
                    </span>
                  </div>
                  <div className="pref-item">
                    <span>Son Tarih Uyarıları</span>
                    <span className={selectedUser.deadline_alerts ? "active" : "inactive"}>
                      {selectedUser.deadline_alerts ? "✓ Aktif" : "✗ Pasif"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organ;