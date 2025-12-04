import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ACCESS_TOKEN } from "../services/constant";
import "../styles/Sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    navigate("/");
  };

  const menuItems = [
    {
      id: 1,
      name: "Ana Sayfa",
      icon: "🏠",
      path: "/home",
      description: "Dashboard ve istatistikler"
    },
    {
      id: 2,
      name: "Görevlerim",
      icon: "📋",
      path: "/dashboard",
      description: "Tüm görevleriniz"
    },
    {
      id: 3,
      name: "Yeni Görev",
      icon: "➕",
      path: "/dashboard",
      description: "Görev oluştur",
      state: { openTab: 'assign' }
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleNavigation = (item) => {
    if (item.state) {
      navigate(item.path, { state: item.state });
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo & Toggle */}
      <div className="sidebar-header">
        <div className="logo-section">
          {!isCollapsed && (
            <div className="logo-content">
              <div className="logo-icon">📊</div>
              <h2 className="logo-text">Görev Yönetimi</h2>
            </div>
          )}
        </div>
        <button 
          className="toggle-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Menüyü Aç" : "Menüyü Kapat"}
        >
          {isCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          {!isCollapsed && <p className="nav-label">MENÜ</p>}
          
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavigation(item)}
              title={isCollapsed ? item.name : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && (
                <div className="nav-content">
                  <span className="nav-name">{item.name}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Settings & Logout */}
        <div className="nav-section bottom-section">
          {!isCollapsed && <p className="nav-label">DİĞER</p>}
          
          <button
            className="nav-item settings-item"
            onClick={() => navigate("/settings")}
            title={isCollapsed ? "Ayarlar" : ''}
          >
            <span className="nav-icon">⚙️</span>
            {!isCollapsed && (
              <div className="nav-content">
                <span className="nav-name">Ayarlar</span>
                <span className="nav-description">Uygulama ayarları</span>
              </div>
            )}
          </button>

          <button
            className="nav-item logout-item"
            onClick={handleLogout}
            title={isCollapsed ? "Çıkış Yap" : ''}
          >
            <span className="nav-icon">👋</span>
            {!isCollapsed && (
              <div className="nav-content">
                <span className="nav-name">Çıkış Yap</span>
                <span className="nav-description">Oturumu kapat</span>
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* User Info (Collapsed state) */}
      {isCollapsed && (
        <div className="sidebar-footer-collapsed">
          <div className="user-avatar">👤</div>
        </div>
      )}

      {/* User Info (Expanded state) */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <p className="user-name">Hoşgeldiniz!</p>
              <p className="user-role">Kullanıcı</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;