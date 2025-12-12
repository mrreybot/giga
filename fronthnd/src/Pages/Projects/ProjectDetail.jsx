import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import Timeline from "../../components/Timeline";
import "../../styles/Projects.css";

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('tasks'); // tasks (timeline), members, settings
    const [inviteEmail, setInviteEmail] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjectDetails();
        fetchProjectTasks();
    }, [id]);

    const fetchProjectDetails = async () => {
        try {
            const res = await api.get(`/api/projects/${id}/`);
            setProject(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            navigate('/projects');
        }
    };

    // Refresh function for timeline updates
    const handleRefresh = () => {
        fetchProjectDetails();
        fetchProjectTasks();
    };

    const fetchProjectTasks = async () => {
        try {
            const res = await api.get(`/api/missions/?project_id=${id}`);
            // Handle pagination (results array) or direct array
            setTasks(res.data.results || (Array.isArray(res.data) ? res.data : []));
        } catch (err) {
            console.error(err);
            setTasks([]);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/projects/${id}/invite_member/`, { email: inviteEmail });
            alert("Davet gönderildi!");
            setInviteEmail("");
        } catch (err) {
            alert(err.response?.data?.detail || "Davet gönderilemedi.");
        }
    };

    if (loading) return <div className="loading-state">Yükleniyor...</div>;

    return (
        <div className="project-detail-container">
            <div className="detail-header">
                <div className="detail-title-row">
                    <h1 className="detail-title">{project.title}</h1>
                    <span className="project-role-badge">
                        {project.my_role === 'ADMIN' ? 'Yönetici' : 'Üye'}
                    </span>
                </div>
                <p className="detail-description">{project.description}</p>
            </div>

            {/* TABS */}
            <div className="project-tabs">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                >
                    Zaman Çizelgesi & Görevler
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                >
                    Üyeler
                </button>
                {project.my_role === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                    >
                        Ayarlar
                    </button>
                )}
            </div>

            {/* CONTENTS */}
            {activeTab === 'tasks' && (
                <div>
                    <Timeline
                        tasks={tasks}
                        comments={project.comments || []}
                        projectId={project.id}
                        onRefresh={handleRefresh}
                    />
                </div>
            )}

            {activeTab === 'members' && (
                <div>
                    <div className="members-grid">
                        {project.members && project.members.map(member => (
                            <div key={member.id} className="member-card">
                                <div className="member-name">{member.user.full_name || member.user.username}</div>
                                <div className="member-email">{member.user.email}</div>
                                <div className={`member-role ${member.role === 'ADMIN' ? 'role-admin' : 'role-member'}`}>
                                    {member.role === 'ADMIN' ? 'Yönetici' : 'Üye'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="settings-section">
                    <h3 className="settings-title">Yeni Üye Davet Et</h3>
                    <form onSubmit={handleInvite} className="invite-form">
                        <input
                            type="email"
                            placeholder="E-posta adresi"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            required
                            className="invite-input"
                        />
                        <button type="submit" className="invite-btn">Davet Et</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
