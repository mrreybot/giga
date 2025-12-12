import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ACCESS_TOKEN } from "../services/constant";
import "../styles/Sidebar.css";
import api from "../services/api";
import { useState, useEffect, useRef } from "react";
import NotificationPanel from "./NotificationPanel";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    navigate("/");
  };

  const [inviteCount, setInviteCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const res = await api.get('/api/invites/');
        setInviteCount(res.data.length);
      } catch (err) {
        console.error("Davetler yüklenemedi", err);
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/api/notifications/');
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setNotifications(data);
        setUnreadNotifCount(data.filter(n => !n.is_read).length);
      } catch (err) {
        console.error("Bildirimler yüklenemedi", err);
      }
    };

    // Sadece logged in ise
    if (localStorage.getItem(ACCESS_TOKEN)) {
      fetchInvites();
      fetchNotifications();

      // Poll every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
        fetchInvites();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [location.pathname]); // Sayfa değiştikçe güncelle (basit çözüm)

  // Click outside to close notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifRef]);

  const handleReadNotification = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadNotifCount(prev => Math.max(0, prev - 1));
  };

  const handleReadAll = async () => {
    try {
      await api.post('/api/notifications/mark_all_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
    } catch (err) {
      console.error("Hata:", err);
    }
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
    },
    {
      id: 7,
      name: "Projelerim",
      icon: "",
      path: "/projects",
      description: "Proje Yönetimi ve Davetler",
      badge: true // Badge gösterilecek mi
    },
    {
      id: 8,
      name: "Admin",
      icon: "",
      path: "/admin",
      description: "admin sayfası"
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
            <span className="nav-name">
              {item.name}
              {item.badge && inviteCount > 0 && (
                <span className="badge" style={{ marginLeft: '10px', backgroundColor: 'red', color: 'white', padding: '2px 6px', borderRadius: '50%', fontSize: '0.8em' }}>
                  {inviteCount}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Right Section (Profile & Logout) */}
      <div className="sidebar-actions">
        {/* Notification Bell */}
        <div className="notification-wrapper" ref={notifRef}>
          <button
            className="nav-item notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Bildirimler"
          >
            <span className="nav-icon">🔔</span>
            {unreadNotifCount > 0 && (
              <span className="notification-badge">{unreadNotifCount}</span>
            )}
          </button>

          {showNotifications && (
            <NotificationPanel
              notifications={notifications}
              onClose={() => setShowNotifications(false)}
              onRead={handleReadNotification}
              onReadAll={handleReadAll}
            />
          )}
        </div>
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