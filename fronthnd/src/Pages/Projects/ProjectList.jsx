import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../styles/Projects.css"; // New CSS file

const ProjectList = () => {
    const [projects, setProjects] = useState([]);
    const [invites, setInvites] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [newProjectDesc, setNewProjectDesc] = useState("");
    const navigate = useNavigate();

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
            await api.post('/api/projects/', { title: newProjectTitle, description: newProjectDesc });
            setShowCreateModal(false);
            setNewProjectTitle("");
            setNewProjectDesc("");
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
                <button
                    className="new-project-btn"
                    onClick={() => setShowCreateModal(true)}
                >
                    + Yeni Proje
                </button>
            </div>

            {invites.length > 0 && (
                <div className="invites-section">
                    <h3>📩 Bekleyen Davetler ({invites.length})</h3>
                    {invites.map(invite => (
                        <div key={invite.id} className="invite-card">
                            <span><strong>{invite.project_name}</strong> projesine <strong>{invite.invited_by_name}</strong> tarafından davet edildiniz.</span>
                            <div className="invite-actions">
                                <button onClick={() => handleRespondInvite(invite.id, 'ACCEPTED')} className="accept-btn">Kabul Et</button>
                                <button onClick={() => handleRespondInvite(invite.id, 'REJECTED')} className="reject-btn">Reddet</button>
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
                            {project.my_role === 'ADMIN' && <span className="admin-badge">Yönetici</span>}
                        </div>
                        <p className="project-description">{project.description || 'Açıklama yok'}</p>
                        <div className="project-footer">
                            <span className="member-count">👥 {project.members && project.members.length} Üye</span>
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
