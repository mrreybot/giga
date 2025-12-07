import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Organ.css";
const ORG_CHART_ENDPOINT = "/api/users/organization/";

const Organ = () => {
  const [orgChart, setOrgChart] = useState({ CEO: [], MANAGER: [], EMPLOYEE: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    setLoading(true);
    try {
      const response = await api.get(ORG_CHART_ENDPOINT);
      setOrgChart(response.data);
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

  const getTotalUsers = () => {
    return orgChart.CEO.length + orgChart.MANAGER.length + orgChart.EMPLOYEE.length;
  };

  return (
    <div className="organ-container">
      <header className="organ-header">
        <h1>🏢 Organizasyon Yapısı</h1>
        <div className="organ-stats">
          <div className="stat-card">
            <span className="stat-number">{getTotalUsers()}</span>
            <span className="stat-label">Toplam Çalışan</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{orgChart.CEO.length}</span>
            <span className="stat-label">CEO</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{orgChart.MANAGER.length}</span>
            <span className="stat-label">Yönetici</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{orgChart.EMPLOYEE.length}</span>
            <span className="stat-label">Çalışan</span>
          </div>
        </div>
      </header>

      <main className="organ-main">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Organizasyon yapısı yükleniyor...</p>
          </div>
        ) : (
          <>
            {/* CEO Section */}
            <div className="org-section">
              <div className="section-header ceo-header">
                <h2> CEO</h2>
                <span className="section-count">{orgChart.CEO.length}</span>
              </div>
              <div className="org-grid">
                {orgChart.CEO.length === 0 ? (
                  <div className="empty-role">
                    <span className="empty-icon">👤</span>
                    <p>Henüz CEO tanımlanmamış</p>
                  </div>
                ) : (
                  orgChart.CEO.map(user => (
                    <div key={user.id} className="org-card ceo-card">
                      <div className="card-header">
                        <div className="org-avatar ceo-avatar">
                          {formatUserName(user).charAt(0).toUpperCase()}
                        </div>
                        <div className="role-badge ceo-badge">CEO</div>
                      </div>
                      <div className="card-body">
                        <h3 className="user-name">{formatUserName(user)}</h3>
                        <div className="user-info">
                          {user.email && (
                            <div className="info-item">
                              <span className="info-icon">📧</span>
                              <span className="info-text">{user.email}</span>
                            </div>
                          )}
                          {user.unvan && (
                            <div className="info-item">
                              <span className="info-icon">🏷️</span>
                              <span className="info-text">{user.unvan}</span>
                            </div>
                          )}
                          {user.department && (
                            <div className="info-item">
                              <span className="info-icon">🏢</span>
                              <span className="info-text">{user.department}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="info-item">
                              <span className="info-icon">📞</span>
                              <span className="info-text">{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Manager Section */}
            <div className="org-section">
              <div className="section-header manager-header">
                <h2> Yöneticiler</h2>
                <span className="section-count">{orgChart.MANAGER.length}</span>
              </div>
              <div className="org-grid">
                {orgChart.MANAGER.length === 0 ? (
                  <div className="empty-role">
                    <span className="empty-icon">👥</span>
                    <p>Henüz yönetici tanımlanmamış</p>
                  </div>
                ) : (
                  orgChart.MANAGER.map(user => (
                    <div key={user.id} className="org-card manager-card">
                      <div className="card-header">
                        <div className="org-avatar manager-avatar">
                          {formatUserName(user).charAt(0).toUpperCase()}
                        </div>
                        <div className="role-badge manager-badge">Yönetici</div>
                      </div>
                      <div className="card-body">
                        <h3 className="user-name">{formatUserName(user)}</h3>
                        <div className="user-info">
                          {user.email && (
                            <div className="info-item">
                              <span className="info-icon">📧</span>
                              <span className="info-text">{user.email}</span>
                            </div>
                          )}
                          {user.unvan && (
                            <div className="info-item">
                              <span className="info-icon">🏷️</span>
                              <span className="info-text">{user.unvan}</span>
                            </div>
                          )}
                          {user.department && (
                            <div className="info-item">
                              <span className="info-icon">🏢</span>
                              <span className="info-text">{user.department}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="info-item">
                              <span className="info-icon">📞</span>
                              <span className="info-text">{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Employee Section */}
            <div className="org-section">
              <div className="section-header employee-header">
                <h2>Çalışanlar</h2>
                <span className="section-count">{orgChart.EMPLOYEE.length}</span>
              </div>
              <div className="org-grid">
                {orgChart.EMPLOYEE.length === 0 ? (
                  <div className="empty-role">
                    <span className="empty-icon">👷</span>
                    <p>Henüz çalışan tanımlanmamış</p>
                  </div>
                ) : (
                  orgChart.EMPLOYEE.map(user => (
                    <div key={user.id} className="org-card employee-card">
                      <div className="card-header">
                        <div className="org-avatar employee-avatar">
                          {formatUserName(user).charAt(0).toUpperCase()}
                        </div>
                        <div className="role-badge employee-badge">Çalışan</div>
                      </div>
                      <div className="card-body">
                        <h3 className="user-name">{formatUserName(user)}</h3>
                        <div className="user-info">
                          {user.email && (
                            <div className="info-item">
                              <span className="info-icon">📧</span>
                              <span className="info-text">{user.email}</span>
                            </div>
                          )}
                          {user.unvan && (
                            <div className="info-item">
                              <span className="info-icon">🏷️</span>
                              <span className="info-text">{user.unvan}</span>
                            </div>
                          )}
                          {user.department && (
                            <div className="info-item">
                              <span className="info-icon">🏢</span>
                              <span className="info-text">{user.department}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="info-item">
                              <span className="info-icon">📞</span>
                              <span className="info-text">{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Organ;