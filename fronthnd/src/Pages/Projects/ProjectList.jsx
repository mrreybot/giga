import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../styles/Projects.css";
import "../../styles/Invites.css";
import {
    Plus,
    Trash2,
    Users,
    Mail,
    Check,
    X,
    Shield
} from "lucide-react";

const ProjectList = () => {
    const [projects, setProjects] = useState([]);
    const [invites, setInvites] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form State
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [newProjectDesc, setNewProjectDesc] = useState("");
    const [newProjectTopic, setNewProjectTopic] = useState("");
    const [newProjectDept, setNewProjectDept] = useState("");
    const [newProjectStartDate, setNewProjectStartDate] = useState("");
    const [newProjectEndDate, setNewProjectEndDate] = useState("");

    const navigate = useNavigate();
    const departments = ["Yönetim", "İnsan Kaynakları", "Yazılım", "Pazarlama", "Finans", "Operasyon", "Diğer"];

    useEffect(() => {
        fetchProjects();
        fetchInvites();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/api/projects/');
            // Handle pagination (results array) or direct array
            setProjects(res.data.results || (Array.isArray(res.data) ? res.data : []));
        } catch (err) {
            console.error(err);
            setProjects([]);
        }
    };

    const fetchInvites = async () => {
        try {
            const res = await api.get('/api/invites/');
            setInvites(res.data.results || (Array.isArray(res.data) ? res.data : []));
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/projects/', {
                title: newProjectTitle,
                description: newProjectDesc,
                topic: newProjectTopic,
                department: newProjectDept,
                start_date: newProjectStartDate,
                end_date: newProjectEndDate
            });
            setShowCreateModal(false);
            // Reset Form
            setNewProjectTitle("");
            setNewProjectDesc("");
            setNewProjectTopic("");
            setNewProjectDept("");
            setNewProjectStartDate("");
            setNewProjectEndDate("");
            fetchProjects();
        } catch (err) {
            alert("Proje oluşturulamadı.");
        }
    };

    const handleRespondInvite = async (id, status) => {
        try {
            await api.post(`/api/invites/${id}/respond/`, { status });
            fetchInvites();
            fetchProjects(); // Projeye katılmış olabilir
        } catch (err) {
            alert("İşlem başarısız.");
        }
    };



    return (
        <div className="projects-container">
            <div className="projects-header">
                <h2>Projelerim</h2>
                <h3>                </h3>
                <button
                    className="new-project-btn"
                    onClick={() => setShowCreateModal(true)}
                >
                    <Plus size={18} /> Yeni Proje
                </button>
            </div>

            {invites.length > 0 && (
                <div className="invites-section">
                    <h3><Mail size={18} /> Bekleyen Davetler ({invites.length})</h3>
                    {invites.map(invite => (
                        <div key={invite.id} className="invite-card">
                            <span className="invite-message"><strong>{invite.project_name}</strong> projesine <strong>{invite.invited_by_name}</strong> tarafından davet edildiniz.</span>
                            <div className="invite-actions">
                                <button onClick={() => handleRespondInvite(invite.id, 'ACCEPTED')} className="accept-btn"><Check size={16} /> Kabul Et</button>
                                <button onClick={() => handleRespondInvite(invite.id, 'REJECTED')} className="reject-btn"><X size={16} /> Reddet</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="projects-grid">
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="project-card"
                    >
                        <div className="project-card-header">
                            <h3 className="project-title">{project.title}</h3>
                            {project.my_role === 'ADMIN' && <span className="admin-badge"><Shield size={12} style={{ marginRight: 4 }} /> Yönetici</span>}
                        </div>
                        <p className="project-description">{project.description || 'Açıklama yok'}</p>

                        {/* Progress Bar */}
                        <div className="project-progress-section">
                            <div className="progress-info">
                                <span>İlerleme</span>
                                <span>%{project.progress || 0}</span>
                            </div>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${project.progress || 0}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="project-footer">
                            <span className="member-count"><Users size={14} /> {project.members && project.members.length} Üye</span>
                        </div>
                    </div>
                ))}
            </div>

            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title">Yeni Proje Oluştur</h3>
                        <form onSubmit={handleCreateProject}>
                            <div className="form-group">
                                <label className="form-label">Proje Adı</label>
                                <input
                                    type="text"
                                    placeholder="Proje Adı"
                                    className="form-input"
                                    value={newProjectTitle}
                                    onChange={e => setNewProjectTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Konu</label>
                                <input
                                    type="text"
                                    placeholder="Proje Konusu"
                                    className="form-input"
                                    value={newProjectTopic}
                                    onChange={e => setNewProjectTopic(e.target.value)}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group half">
                                    <label className="form-label">Departman</label>
                                    <select
                                        className="form-select"
                                        value={newProjectDept}
                                        onChange={e => setNewProjectDept(e.target.value)}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {departments.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group half"></div>
                            </div>

                            <div className="form-row">
                                <div className="form-group half">
                                    <label className="form-label">Başlangıç Tarihi</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={newProjectStartDate}
                                        onChange={e => setNewProjectStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group half">
                                    <label className="form-label">Bitiş Tarihi</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={newProjectEndDate}
                                        onChange={e => setNewProjectEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Açıklama</label>
                                <textarea
                                    placeholder="Açıklama"
                                    className="form-textarea"
                                    value={newProjectDesc}
                                    onChange={e => setNewProjectDesc(e.target.value)}
                                    rows="4"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="cancel-btn">İptal</button>
                                <button type="submit" className="submit-btn">Oluştur</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectList;
