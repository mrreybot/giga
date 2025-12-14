import React, { useState } from "react";
import api from "../services/api";
import "../styles/Timeline.css";
import { Calendar } from "lucide-react";

const Timeline = ({ tasks, comments, projectId, onRefresh }) => {
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Combine tasks and comments into a single list sorted by date
    const timelineItems = [
        ...tasks
            .filter(task => task && task.assigned_date)
            .map(task => ({
                type: 'task',
                date: new Date(task.assigned_date),
                data: task
            })),
        ...comments.map(comment => ({
            type: 'comment',
            date: new Date(comment.created_at),
            data: comment
        }))
    ].sort((a, b) => b.date - a.date); // Newest first

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await api.post(`/api/projects/${projectId}/add_comment/`, { content: newComment });
            setNewComment("");
            onRefresh();
        } catch (error) {
            console.error("Yorum eklenemedi:", error);
            alert("Yorum eklenirken hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCompleteTask = async (taskId) => {
        if (!window.confirm("Bu görevi tamamlamak istediğinize emin misiniz?")) return;

        try {
            // Assuming we have an endpoint or method to complete task. 
            // Usually PATCH /api/missions/{id}/ with {completed: true}
            await api.patch(`/api/missions/${taskId}/`, { completed: true });
            onRefresh();
        } catch (error) {
            console.error("Görev tamamlanamadı:", error);
            alert("Görev durumu güncellenemedi.");
        }
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="timeline-container">
            <div className="timeline-input-area">
                <form onSubmit={handleAddComment} className="timeline-comment-form">
                    <input
                        type="text"
                        placeholder="Timeline'a bir not veya yorum ekle..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="timeline-input"
                    />
                    <button type="submit" disabled={submitting} className="timeline-submit-btn">
                        {submitting ? '...' : 'Ekle'}
                    </button>
                </form>
            </div>

            <div className="timeline">
                {timelineItems.map((item, index) => (
                    <div key={index} className={`timeline-item ${item.type}`}>
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                            <span className="timeline-date">
                                <Calendar size={12} /> {formatDate(item.date)}  {/* Seliimhan buradaydı, Tarihi düzelttim */}
                            </span>

                            {item.type === 'task' ? (
                                <div className={`timeline-card task-card ${item.data.completed ? 'completed' : ''}`}>
                                    <div className="timeline-card-header">
                                        <h4>{item.data.description}</h4>
                                        {item.data.completed ? (
                                            <span className="status-badge completed">Tamamlandı</span>
                                        ) : item.data.can_complete && (
                                            <button
                                                onClick={() => handleCompleteTask(item.data.id)}
                                                className="complete-btn"
                                            >
                                                Tamamla
                                            </button>
                                        )}
                                    </div>
                                    <div className="timeline-card-body">
                                        <p>Atanan: {item.data.assigned_users?.map(u => u.full_name || u.username).join(', ')}</p>
                                        <p>Bitiş: {new Date(item.data.end_date).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="timeline-card comment-card">
                                    <div className="comment-header">
                                        <strong>{item.data.user_details?.full_name || item.data.user_details?.username}</strong>
                                    </div>
                                    <p className="comment-text">{item.data.content}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {timelineItems.length === 0 && (
                    <div className="timeline-empty">
                        <p>Henüz bir aktivite yok.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Timeline;
