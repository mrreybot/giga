import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import Timeline from "../../components/Timeline";
import "../../styles/Projects.css";
import { X, UserPlus, Settings, Users, Calendar, Layout, User, Trash2, AlertTriangle, Save, Edit2 } from "lucide-react";

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('tasks'); // tasks, members, settings
    const [loading, setLoading] = useState(true);

    // Edit State
    const [editMode, setEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editTopic, setEditTopic] = useState("");
    const [editDept, setEditDept] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");

    const departments = ["Yönetim", "İnsan Kaynakları", "Yazılım", "Pazarlama", "Finans", "Operasyon", "Diğer"];

    // Invite & Users State
    const [assignableUsers, setAssignableUsers] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [searchUserText, setSearchUserText] = useState("");

    useEffect(() => {
        fetchProjectDetails();
        fetchProjectTasks();
        fetchAssignableUsers();
    }, [id]);

    useEffect(() => {
        if (project) {
            setEditTitle(project.title || "");
            setEditDesc(project.description || "");
            setEditTopic(project.topic || "");
            setEditDept(project.department || "");
            setEditStartDate(project.start_date || "");
            setEditEndDate(project.end_date || "");
        }
    }, [project]);

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

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/api/projects/${id}/`, {
                title: editTitle,
                description: editDesc,
                topic: editTopic,
                department: editDept,
                start_date: editStartDate,
                end_date: editEndDate
            });
            alert("Proje güncellendi.");
            fetchProjectDetails();
        } catch (err) {
            console.error(err);
            alert("Güncelleme başarısız.");
        }
    };

    // ... (rest of the functions remain the same) ...

    /* ... inside return ... */
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

    const handleDeleteProject = async () => {
        if (!window.confirm("DİKKAT! Bu projeyi ve tüm verilerini silmek üzeresiniz. Bu işlem GERİ ALINAMAZ. Emin misiniz?")) return;

        try {
            await api.delete(`/api/projects/${id}/`);
            alert("Proje başarıyla silindi.");
            navigate('/projects');
        } catch (err) {
            console.error("Proje silinemedi:", err);
            alert("Proje silinirken bir hata oluştu: " + (err.response?.data?.detail || err.message));
        }
    };

    // Group Users by Department
    const getGroupedUsers = () => {
        const grouped = {};
        assignableUsers.forEach(user => {
            // Filter out existing members
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

    // Helper to get initials
    const getInitials = (name) => {
        return name
            ? name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
            : '';
    };

    const groupedUsers = getGroupedUsers();

    if (loading) {
        return <div className="loading-spinner">Yükleniyor...</div>;
    }

    if (!project) {
        return <div className="error-message">Proje bulunamadı.</div>;
    }

    return (
        <div className="project-detail-container">
            <div className="detail-header">
                <div className="detail-title-row">
                    <h1 className="detail-title">{project.title}</h1>
                    <span className="project-role-badge">
                        {project.my_role === 'ADMIN' ? 'Yönetici' : 'Üye'}
                    </span>
                </div>
            </div>

            {/* TABS */}
            <div className="project-tabs">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                >
                    <Layout size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Zaman Çizelgesi & Görevler
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                >
                    <Users size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Üyeler
                </button>
                <button
                    onClick={() => setActiveTab('invite')}
                    className={`tab-btn ${activeTab === 'invite' ? 'active' : ''}`}
                >
                    <UserPlus size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Davet Et
                </button>
                {project.my_role === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                    >
                        <Settings size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
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
                <div style={{ marginTop: '30px' }}> {/* Added margin to prevent overlap */}
                    <div className="members-grid">
                        {project.members && project.members.map(member => (
                            <div key={member.id} className="member-card">
                                <div className="member-header">
                                    <div className="member-avatar">
                                        {member.user.profile_photo ? (
                                            <img src={member.user.profile_photo} alt={member.user.username} />
                                        ) : (
                                            getInitials(member.user.full_name || member.user.username)
                                        )}
                                    </div>
                                    <div className="member-info">
                                        <div className="member-name font-bold text-lg">{member.user.full_name || member.user.username}</div>
                                        <div className="member-email text-sm text-gray-500">{member.user.email}</div>
                                        <div className={`member-role ${member.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'}`}>
                                            {member.role === 'ADMIN' ? 'Yönetici' : 'Üye'}
                                        </div>
                                    </div>
                                </div>

                                {project.my_role === 'ADMIN' && member.user.id !== project.created_by && (
                                    <div className="member-actions">
                                        <button
                                            className="remove-member-btn"
                                            onClick={() => handleRemoveMember(member.id)}
                                            title="Üyeyi Çıkar"
                                        >
                                            <X size={16} /> Çıkar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'invite' && (
                <div className="invite-section" style={{ marginTop: '20px' }}>
                    <div className="invite-section-header" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="settings-title"><UserPlus size={20} style={{ marginRight: 8 }} /> Yeni Üye Davet Et</h3>
                            <div className="invite-search-box">
                                <input
                                    type="text"
                                    placeholder="Kullanıcı Ara..."
                                    value={searchUserText}
                                    onChange={(e) => setSearchUserText(e.target.value)}
                                    className="filter-input"
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e5e5e5' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="users-list-container">
                        {Object.keys(groupedUsers).length === 0 ? (
                            <p className="no-users-msg">Eklenecek kullanıcı bulunamadı.</p>
                        ) : (
                            Object.entries(groupedUsers).map(([dept, users]) => (
                                <div key={dept} className="dept-group" style={{ marginBottom: '24px' }}>
                                    <h4 className="dept-title" style={{ fontSize: '1.1rem', fontWeight: '600', color: '#171717', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>{dept}</h4>
                                    <div className="dept-users-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                        {users.map(user => (
                                            <div key={user.id} className="user-invite-card" style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '20px',
                                                background: 'white',
                                                borderRadius: '16px',
                                                border: '1px solid #f0f0f0',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                                transition: 'transform 0.2s, box-shadow 0.2s'
                                            }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
                                                }}
                                            >
                                                <div className="user-invite-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <div style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '12px',
                                                        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: '700',
                                                        color: '#374151',
                                                        fontSize: '1.rem'
                                                    }}>
                                                        {getInitials(user.full_name || user.username)}
                                                    </div>
                                                    <div>
                                                        <span className="user-invite-name" style={{ fontWeight: '600', display: 'block', color: '#111827', fontSize: '1rem', marginBottom: '2px' }}>
                                                            {user.full_name || user.username}
                                                        </span>
                                                        <span className="user-invite-title" style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <User size={14} />
                                                            {user.unvan || user.role}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    className="invite-action-btn"
                                                    onClick={() => handleInviteUser(user.id)}
                                                    style={{
                                                        background: 'black',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '10px 24px',
                                                        borderRadius: '9999px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        transition: 'all 0.2s',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.target.style.transform = 'scale(1.05)';
                                                        e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.target.style.transform = 'scale(1)';
                                                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                                                    }}
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

            {activeTab === 'settings' && (
                <div className="settings-section">

                    {/* General Settings */}
                    <div className="settings-block" style={{ marginBottom: '40px' }}>
                        <h3 className="settings-title"><Settings size={20} style={{ marginRight: 8 }} /> Genel Ayarlar</h3>
                        <form onSubmit={handleUpdateProject} className="edit-project-form" style={{ marginTop: '20px' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Proje Adı</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e5e5' }}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Konu</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editTopic}
                                    onChange={e => setEditTopic(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e5e5' }}
                                />
                            </div>

                            <div className="form-row" style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Departman</label>
                                    <select
                                        className="form-select"
                                        value={editDept}
                                        onChange={e => setEditDept(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e5e5', backgroundColor: 'white' }}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {departments.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}></div>
                            </div>

                            <div className="form-row" style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Başlangıç Tarihi</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editStartDate}
                                        onChange={e => setEditStartDate(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e5e5' }}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Bitiş Tarihi</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editEndDate}
                                        onChange={e => setEditEndDate(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e5e5' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Açıklama</label>
                                <textarea
                                    className="form-textarea"
                                    value={editDesc}
                                    onChange={e => setEditDesc(e.target.value)}
                                    rows="4"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e5e5' }}
                                />
                            </div>

                            <div className="form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="save-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '8px', background: '#171717', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                    <Save size={18} /> Değişiklikleri Kaydet
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Danger Zone */}
                    {project.am_i_creator && (
                        <div className="danger-zone-section" style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' }}>
                            <h3 className="settings-title text-red-600" style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                                <AlertTriangle size={20} style={{ marginRight: 8 }} /> Tehlikeli Bölge
                            </h3>
                            <div className="danger-zone-card" style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                <div className="danger-info">
                                    <h4 style={{ color: '#991b1b', fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>Projeyi Sil</h4>
                                    <p style={{ color: '#b91c1c', fontSize: '0.9rem', margin: 0 }}>
                                        Bu işlem geri alınamaz. Projeye ait tüm görevler ve veriler kalıcı olarak silinecektir.
                                    </p>
                                </div>
                                <button
                                    onClick={handleDeleteProject}
                                    style={{
                                        background: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                                    onMouseOut={(e) => e.target.style.background = '#dc2626'}
                                >
                                    <Trash2 size={18} /> Projeyi Sil
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
