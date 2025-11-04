import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../src/services/api";
import { ACCESS_TOKEN } from "../../src/services/constant";
// CSS dosyasını import ediyoruz (içeriği aşağıda verilecek)
import "../styles/Dashboard.css"; 

const TASKS_ENDPOINT = "/api/tasks/";

const Dashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Hangi sekmenin aktif olduğunu tutmak için yeni state
  const [activeTab, setActiveTab] = useState('list'); // 'list' veya 'assign'

  // --- Orijinal Fonksiyonlar (Değişiklik Yok) ---

  const attachAuth = () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    else delete api.defaults.headers.common["Authorization"];
  };

  useEffect(() => {
    attachAuth();
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(TASKS_ENDPOINT);
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    navigate("/");
  };

  // Bu fonksiyon SADECE "Görev Listesi" sekmesindeki hızlı ekleme formunu yönetir
  const handleAddTask = async (e) => {
    e.preventDefault();
    const title = newText.trim();
    if (!title) return;
    setSaving(true);

    const tempId = `temp-${Date.now()}`;
    const tempTask = { id: tempId, title, completed: false, isTemp: true, isUpdating: true };
    setTasks((t) => [tempTask, ...t]);
    setNewText("");

    try {
      const res = await api.post(TASKS_ENDPOINT, { title });
      setTasks((prev) =>
        prev.map((tk) => (tk.id === tempId ? { ...res.data } : tk))
      );
    } catch (err) {
      console.error("Create task failed:", err);
      setTasks((prev) => prev.filter((tk) => tk.id !== tempId));
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (task) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: !t.completed, isUpdating: true } : t
      )
    );

    try {
      await api.patch(`${TASKS_ENDPOINT}${task.id}/`, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, isUpdating: false } : t)));
    } catch (err) {
      console.error("Toggle failed, reverting:", err);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed, isUpdating: false } : t))
      );
    }
  };

  // --- YENİ RENDER (Görünüm) ---

  return (
    <div className="modern-dashboard">
      {/* 1. Lacivert Üst Kısım */}
      <header className="dashboard-header">
        <h1>Görev Paneli</h1>
        <div>
          <button className="refresh-btn" onClick={fetchTasks} disabled={loading}>
            {loading ? "Yenileniyor..." : "Yenile"}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Çıkış Yap
          </button>
        </div>
      </header>

      {/* 2. Sekme Navigasyonu (Siyah) */}
      <nav className="dashboard-nav">
        <button
          className={`nav-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Görev Listesi
        </button>
        <button
          className={`nav-tab ${activeTab === 'assign' ? 'active' : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          Yeni Görev Ata
        </button>
      </nav>

      {/* 3. Ana İçerik Alanı */}
      <main className="dashboard-main">
        
        {/* SEKME 1: Görev Listesi (Fonksiyonel) */}
        {activeTab === 'list' && (
          <div className="task-list-view">
            {/* Orijinal Hızlı Ekleme Formu (Stili güncellendi) */}
            <form className="quick-add-form" onSubmit={handleAddTask}>
              <input
                type="text"
                placeholder="Hızlı yeni görev başlığı..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <button type="submit" disabled={!newText.trim() || saving}>
                {saving ? "Ekleniyor..." : "Ekle"}
              </button>
            </form>

            {/* Orijinal Görev Listesi (Stili güncellendi) */}
            <div className="tasks-list-container">
              {loading ? (
                <div className="empty-state">Görevler yükleniyor...</div>
              ) : tasks.length === 0 ? (
                <div className="empty-state">Henüz görev yok.</div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-item ${task.completed ? "done" : ""} ${task.isUpdating ? "updating" : ""}`}
                  >
                    <label className="task-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={!!task.completed}
                        onChange={() => toggleDone(task)}
                        disabled={task.isUpdating}
                      />
                      <span className="checkbox-ui" />
                    </label>
                    <span className="task-title">{task.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEKME 2: Yeni Görev Atama (Görsel Arayüz) */}
        {activeTab === 'assign' && (
          <div className="assign-task-view">
            <form className="modern-form" onSubmit={(e) => e.preventDefault()}>
              <h2>Detaylı Görev Oluştur</h2>
              
              <div className="form-group">
                <label htmlFor="desc">Description (Açıklama)</label>
                <textarea id="desc" rows="4" placeholder="Görevin detayları... (Bu form şu an görseldir)"></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Başlangıç Tarihi</label>
                  <input type="date" id="date" />
                </div>
                <div className="form-group">
                  <label htmlFor="deadline">Son Teslim Tarihi</label>
                  <input type="date" id="deadline" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="assignee">Kime</label>
                <select id="assignee">
                  <option value="">Seçiniz...</option>
                  <option value="ali">Ali Yılmaz</option>
                  <option value="veli">Veli Kaya</option>
                  <option value="ayse">Ayşe Demir</option>
                </select>
              </div>

              <button type="submit" className="submit-task-btn" disabled>
                Görevi Ata (Devre Dışı)
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;