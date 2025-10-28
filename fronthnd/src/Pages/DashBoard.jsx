import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css"; // İstersen stiller için ayrı dosya oluşturabilirsin

const Dashboard = () => {
  const navigate = useNavigate();

  // Logout fonksiyonu (opsiyonel)
  const handleLogout = () => {
    // Eğer token veya login state olsaydı burada temizlenebilirdi
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Welcome to Your Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <main className="dashboard-main">
        <div className="card">
          <h2>Tasks</h2>
          <p>You have 12 tasks pending today.</p>
        </div>

        <div className="card">
          <h2>Projects</h2>
          <p>3 projects are in progress.</p>
        </div>

        <div className="card">
          <h2>Analytics</h2>
          <p>Productivity increased by 25% this week.</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
