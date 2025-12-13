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
    const [activeTab, setActiveTab] = useState('tasks'); // tasks, members, settings
    const [loading, setLoading] = useState(true);

    // Invite & Users State
    const [assignableUsers, setAssignableUsers] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [searchUserText, setSearchUserText] = useState("");

    useEffect(() => {
        fetchProjectDetails();
        fetchProjectTasks();
        fetchAssignableUsers();
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

    const fetchProjectTasks = async () => {
        try {
            const res = await api.get(`/api/missions/?project_id=${id}`);
            setTasks(res.data.results || (Array.isArray(res.data) ? res.data : []));
        } catch (err) {
            console.error(err);
            setTasks([]);
        }
    };

    const fetchAssignableUsers = async () => {
        try {
            const res = await api.get('/api/users/assignable_users/');
            setAssignableUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Kullanıcılar yüklenemedi", err);
        }
    };

    const handleRefresh = () => {
        fetchProjectDetails();
        fetchProjectTasks();
    };

    const handleInviteUser = async (userId) => {
        try {
            await api.post(`/api/projects/${id}/invite_member/`, { user_id: userId });
            alert("Davet gönderildi!");
            // Refresh details to potentially update invite status logic etc if needed
            fetchProjectDetails();
        } catch (err) {
            alert(err.response?.data?.detail || "Davet gönderilemedi.");
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Bu üyeyi projeden çıkarmak istediğinize emin misiniz?")) return;

        try {
            await api.post(`/api/projects/${id}/remove_member/`, { member_id: memberId });
            alert("Üye çıkarıldı.");
            fetchProjectDetails(); // Refresh list
        } catch (err) {
            alert(err.response?.data?.detail || "Üye çıkarılamadı.");
        }
    };

    // Group Users by Department
    const getGroupedUsers = () => {
        const grouped = {};
        assignableUsers.forEach(user => {
            // Filter out existing members (optional, but requested feature implies selecting new people)
            // If user wants to see "tum userler" regardless, we can skip filtering. 
            // Usually you don't invite existing members. Let's start by filtering existing members out visually or marking them.
            // Let's filter out ALREADY ADDED members from the list to avoid clutter.
            const isMember = project?.members?.some(m => m.user.id === user.id);
            if (isMember) return;

            // Search filter
            if (searchUserText) {
                const lowerSearch = searchUserText.toLowerCase();
                const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
                if (!user.username.toLowerCase().includes(lowerSearch) && !fullName.includes(lowerSearch)) {
                    return;
                }
            }

            const dept = user.department || 'Diğer';
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push(user);
        });
        return grouped;
    };

    if (loading) return <div className="loading-state">Yükleniyor...</div>;

    const groupedUsers = getGroupedUsers();

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
                                <div className="member-info">
                                    <div className="member-name">{member.user.full_name || member.user.username}</div>
                                    <div className="member-email">{member.user.email}</div>
                                    <div className={`member-role ${member.role === 'ADMIN' ? 'role-admin' : 'role-member'}`}>
                                        {member.role === 'ADMIN' ? 'Yönetici' : 'Üye'}
                                    </div>
                                </div>
                                {project.my_role === 'ADMIN' && member.user.id !== project.created_by && ( // Admin can remove others, but creator usually special
                                    <button
                                        className="remove-member-btn"
                                        onClick={() => handleRemoveMember(member.id)}
                                        title="Üyeyi Çıkar"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="settings-section">
                    <div className="invite-section-header">
                        <h3 className="settings-title">Yeni Üye Davet Et</h3>
                        <div className="invite-search-box">
                            <input
                                type="text"
                                placeholder="Kullanıcı Ara..."
                                value={searchUserText}
                                onChange={(e) => setSearchUserText(e.target.value)}
                                className="filter-input"
                            />
                        </div>
                    </div>

                    <div className="users-list-container">
                        {Object.keys(groupedUsers).length === 0 ? (
                            <p className="no-users-msg">Eklenecek kullanıcı bulunamadı.</p>
                        ) : (
                            Object.entries(groupedUsers).map(([dept, users]) => (
                                <div key={dept} className="dept-group">
                                    <h4 className="dept-title">{dept}</h4>
                                    <div className="dept-users-grid">
                                        {users.map(user => (
                                            <div key={user.id} className="user-invite-card">
                                                <div className="user-invite-info">
                                                    <span className="user-invite-name">{user.full_name || user.username}</span>
                                                    <span className="user-invite-title">{user.unvan || user.role}</span>
                                                </div>
                                                <button
                                                    className="invite-action-btn"
                                                    onClick={() => handleInviteUser(user.id)}
                                                >
                                                    Davet Et
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
