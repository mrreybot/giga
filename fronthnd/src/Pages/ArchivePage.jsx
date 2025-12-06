import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Archive.css";
 // make sure relative path matches

const Archive = () => {
  const [archivedMissions, setArchivedMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const roleTranslations = {
    CEO: "CEO",
    MANAGER: "Yönetici",
    EMPLOYEE: "Çalışan",
  };

  useEffect(() => {
    fetchArchivedMissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchArchivedMissions = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/missions/");

      const missions = Array.isArray(response.data?.results)
        ? response.data.results
        : Array.isArray(response.data)
        ? response.data
        : [];

      const completed = missions
        .filter((m) => m.completed === true)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      setArchivedMissions(completed);
    } catch (error) {
      console.error("Veri hatası:", error);
      setArchivedMissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm("Bu görevi geri almak istiyor musun?")) return;
    try {
      await api.patch(`/api/missions/${id}/toggle_complete/`);
      setArchivedMissions((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
      alert("İşlem başarısız.");
    }
  };

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "-";

  const formatUserBlock = (user) => {
    if (!user) return <span style={{ color: "#8f9fbf" }}>Bilgi Yok</span>;

    const email = user.email || user.username || "——";
    const role = roleTranslations[user.role] || user.role || "";

    return (
      <div className="user-block" title={email}>
        <span className="user-email">{email}</span>
        {role ? <span className="user-role">({role})</span> : null}
      </div>
    );
  };

  const filtered = archivedMissions.filter((m) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const parts = [
      m.description,
      m.from_to,
      m.created_by_info?.email,
      m.created_by_info?.username,
      ...(m.assigned_users || []).map((u) => u.email || u.username),
    ];
    return parts.some((p) => (p || "").toString().toLowerCase().includes(q));
  });

  return (
    <div className="archive-wrapper">
      <div className="archive-header">
        <div className="archive-title">
          <h1>Görev Arşivi</h1>
          <p className="archive-sub">
            Toplam <strong style={{ color: "#7ff3a0" }}>{archivedMissions.length}</strong> tamamlanmış görev.
          </p>
        </div>

        <div className="archive-controls">
          <input
            className="archive-search"
            placeholder="Ara (konum, açıklama, gönderici, alıcı)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="archive-loading">Veriler yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="archive-empty">Arşivde kayıt bulunamadı.</div>
        ) : (
          <table className="archive-table" role="table" aria-label="Arşivlenmiş görevler">
            <thead>
              <tr>
                <th className="center col-index">#</th>
                <th>Gönderen</th>
                <th>Alıcılar</th>
                <th className="center col-location">Konum/rota</th>
                <th>Açıklama</th>
                <th className="center">Dosya içeriği</th>
                <th className="center">Atanma tarihi</th>
                <th className="center">Planlanan bitiş tarihi</th>
                <th className="center">Bitiş tarihi</th>
                <th className="center"></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((m, idx) => (
                <tr key={m.id}>
                  <td className="col-index">{idx + 1}</td>

                  <td>
                    {formatUserBlock(m.created_by_info)}
                    {/* optional show created_by date or extra info below if needed */}
                  </td>

                  <td className="assigned-list">
                    {m.assigned_users && m.assigned_users.length > 0 ? (
                      m.assigned_users.map((u) => (
                        <div key={u.id} className="assigned-item">
                          {formatUserBlock(u)}
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "#8f9fbf" }}>Boş</span>
                    )}
                  </td>

                  <td className="col-location">{m.from_to || "-"}</td>

                  <td className="col-desc">{m.description || "-"}</td>

                  <td>
                    {m.attachments && m.attachments.length > 0 ? (
                      <div className="attach-list">
                        {m.attachments.map((a, i) => (
                          <a
                            key={i}
                            className="attach-link"
                            href={a.file}
                            target="_blank"
                            rel="noreferrer"
                            title={a.name || a.file}
                          >
                            {a.name || `Dosya ${i + 1}`}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "#8f9fbf" }}>-</span>
                    )}
                  </td>

                  <td className="col-date">{formatDate(m.assigned_date)}</td>
                  <td className="col-date">{formatDate(m.end_date)}</td>
                  <td className="col-date">{formatDate(m.updated_at)}</td>

                  <td className="col-date">
                    <button className="restore-btn" onClick={() => handleRestore(m.id)} title="Geri al">
                      ↩
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Archive;