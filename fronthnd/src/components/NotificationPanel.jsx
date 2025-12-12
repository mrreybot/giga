import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Sidebar.css';

const NotificationPanel = ({ notifications, onClose, onRead, onReadAll }) => {
    const navigate = useNavigate();

    const handleNotificationClick = async (notification) => {
        // 1. Mark as read in UI (optimistic)
        onRead(notification.id);

        // 2. Mark as read in Backend
        try {
            await api.post(`/api/notifications/${notification.id}/mark_read/`);
        } catch (err) {
            console.error("Failed to mark read", err);
        }

        // 3. Navigation Logic
        switch (notification.type) {
            case 'MISSION_ASSIGN':
            case 'MISSION_COMPLETE':
                // Go to dashboard with filter or search? Or detail modal?
                // For now, go to dashboard
                navigate('/dashboard');
                break;
            case 'PROJECT_INVITE':
                navigate('/projects/my-projects');
                break;
            case 'PROJECT_COMMENT':
                if (notification.related_id) {
                    navigate(`/projects/${notification.related_id}`);
                } else {
                    navigate('/projects/my-projects');
                }
                break;
            default:
                break;
        }

        onClose();
    };

    return (
        <div className="notification-panel">
            <div className="notification-header">
                <h3>Bildirimler</h3>
                {notifications.length > 0 && (
                    <button className="mark-all-read" onClick={onReadAll}>
                        Tümünü Okundu İşaretle
                    </button>
                )}
            </div>

            <div className="notification-list">
                {notifications.length === 0 ? (
                    <div className="no-notifications">
                        Bildiriminiz yok 🎉
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif.id}
                            className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                            onClick={() => handleNotificationClick(notif)}
                        >
                            <div className="notif-icon">
                                {notif.type === 'MISSION_ASSIGN' && '📋'}
                                {notif.type === 'PROJECT_INVITE' && '📩'}
                                {notif.type === 'PROJECT_COMMENT' && '💬'}
                                {notif.type === 'MISSION_COMPLETE' && '✅'}
                            </div>
                            <div className="notif-content">
                                <p className="notif-message">{notif.message}</p>
                                <span className="notif-time">{notif.created_at_formatted}</span>
                            </div>
                            {!notif.is_read && <span className="unread-dot"></span>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
