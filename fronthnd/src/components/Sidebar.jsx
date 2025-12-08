import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ACCESS_TOKEN } from "../services/constant";
import "../styles/Sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    navigate("/");
  };

  const menuItems = [
    {
      id: 1,
      name: "Ana Sayfa",
      icon: "",
      path: "/home",
      description: "Dashboard ve istatistikler"
    },
    {
      id: 2,
      name: "Görevlerim",
      icon: "",
      path: "/dashboard", 
      description: "Yaklaşan görevler",
      state: { scrollToUpcoming: true } 
    },
    {
      id: 3,
      name: "Yeni Görev",
      icon: "",
      path: "/add-task",
      description: "Görev oluştur",
      state: { openTab: 'assign' }
    },
    {
      id: 4,
      name: "İstatistiklerim",
      icon: "",
      path: "/statistics",
      description: "Performans ve raporlar"
    },
    {
      id: 5,
      name: "Arşivim",
      icon: "",
      path: "/arsiv",
      description: "Geçmiş görevlerim"
    },
    {
      id: 6,
      name: "Şirket'im",
      icon: "",
      path: "/org",
      description: "Organizasyon"
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
    <nav className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-brand">
        <div className="logo-content">
          <span className="logo-icon"></span>
          <h2 className="logo-text">Atasan A.Ş</h2>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavigation(item)}
            title={item.description}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-name">{item.name}</span>
          </button>
        ))}
      </div>

      {/* Right Section (Profile & Logout) */}
      <div className="sidebar-actions">
        <button
          className="nav-item profile-item"
          onClick={() => navigate("/profil")}
          title="Profilim"
        >
          <span className="nav-icon"></span>
          <span className="nav-name">Ayarlar</span>
        </button>
        
        <button
          className="nav-item logout-item"
          onClick={handleLogout}
          title="Çıkış Yap"
        >
          <span className="nav-icon"></span>
          <span className="nav-name">Çıkış</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;