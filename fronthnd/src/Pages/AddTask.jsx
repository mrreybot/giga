import React, { useState, useEffect } from 'react';
import '../styles/AddTask.css';

const AddTask = ({
  users = [],
  editingMission = null,
  onSubmit,
  onCancel,
  onSuccess,
  api,
  missionsEndpoint
}) => {
  // === STATE ===
  const [formData, setFormData] = useState({
    description: '',
    assigned_date: '',
    end_date: '',
    from_to: '',
    due_to: [],
    attachments: [],
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // === EFFECTS ===
  useEffect(() => {
    if (editingMission) {
      setFormData({
        description: editingMission.description || '',
        assigned_date: editingMission.assigned_date || '',
        end_date: editingMission.end_date || '',
        from_to: editingMission.from_to || '',
        due_to: editingMission.assigned_users?.map(u => u.id) || [],
        attachments: []
      });
    } else {
      resetForm();
    }
  }, [editingMission]);

  // === HANDLERS ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleUserSelection = (userId) => {
    setFormData(prev => {
      const isSelected = prev.due_to.includes(userId);
      return {
        ...prev,
        due_to: isSelected
          ? prev.due_to.filter(id => id !== userId)
          : [...prev.due_to, userId]
      };
    });
    
    // Clear error when user selects someone
    if (errors.due_to) {
      setErrors(prev => ({ ...prev, due_to: null }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: files
    }));
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setFormData({
      description: '',
      assigned_date: '',
      end_date: '',
      from_to: '',
      due_to: [],
      attachments: [],
    });
    setErrors({});
    
    // Reset file input
    const fileInput = document.getElementById('mission-attachments');
    if (fileInput) fileInput.value = '';
  };

  // === VALIDATION ===
  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Lütfen açıklama giriniz!';
    }

    if (!formData.assigned_date) {
      newErrors.assigned_date = 'Başlangıç tarihi zorunludur!';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'Bitiş tarihi zorunludur!';
    }

    if (formData.assigned_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.assigned_date)) {
        newErrors.end_date = 'Bitiş tarihi başlangıç tarihinden önce olamaz!';
      }
    }

    if (formData.due_to.length === 0) {
      newErrors.due_to = 'Lütfen en az bir kullanıcı seçiniz!';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // === SUBMIT ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    
    try {
      const submitData = new FormData();
      submitData.append('description', formData.description);
      submitData.append('assigned_date', formData.assigned_date);
      submitData.append('end_date', formData.end_date);
      
      if (formData.from_to) {
        submitData.append('from_to', formData.from_to);
      }
      
      formData.due_to.forEach(userId => {
        submitData.append('due_to', userId);
      });
      
      formData.attachments.forEach(file => {
        submitData.append('new_attachments', file);
      });
      
      if (editingMission) {
        // UPDATE
        await api.patch(`${missionsEndpoint}${editingMission.id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (onSuccess) {
          onSuccess('update', 'Görev başarıyla güncellendi!');
        }
      } else {
        // CREATE
        await api.post(missionsEndpoint, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (onSuccess) {
          onSuccess('create', 'Görev başarıyla oluşturuldu!');
        }
      }
      
      resetForm();
      
      if (onSubmit) {
        onSubmit();
      }
      
    } catch (error) {
      console.error("❌ Failed to save mission:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message;
      alert(`Görev kaydedilirken hata oluştu!\n${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      onCancel();
    }
  };

  // === HELPERS ===
  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'CEO': return 'mf-role-badge-ceo';
      case 'MANAGER': return 'mf-role-badge-manager';
      case 'EMPLOYEE': return 'mf-role-badge-employee';
      default: return 'mf-role-badge-default';
    }
  };

  const getUserDisplayName = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.full_name || user.username;
  };

  // === RENDER ===
  return (
    <div className="mission-form-container">
      <form className="mission-form" onSubmit={handleSubmit}>
        <h2 className="mission-form-title">
          {editingMission ? '✏️ Görevi Düzenle' : '✍️ Detaylı Görev Oluştur'}
        </h2>
        
        {/* Edit Notice */}
        {editingMission && (
          <div className="mf-edit-notice">
            <p>🔔 Görev #{editingMission.id} düzenleniyor</p>
            <button 
              type="button" 
              className="mf-cancel-edit-btn"
              onClick={handleCancel}
            >
              ✕ İptal
            </button>
          </div>
        )}
        
        {/* Description */}
        <div className={`mf-form-group ${errors.description ? 'has-error' : ''}`}>
          <label htmlFor="mission-desc">
            Açıklama <span className="required">*</span>
          </label>
          <textarea 
            id="mission-desc"
            name="description"
            rows="5" 
            placeholder="Görevin detaylarını yazınız..."
            value={formData.description}
            onChange={handleInputChange}
            className={errors.description ? 'input-error' : ''}
          />
          {errors.description && (
            <span className="mf-error-message">{errors.description}</span>
          )}
        </div>

        {/* Date Row */}
        <div className="mf-form-row">
          <div className={`mf-form-group ${errors.assigned_date ? 'has-error' : ''}`}>
            <label htmlFor="mission-assigned-date">
              Başlangıç Tarihi <span className="required">*</span>
            </label>
            <input 
              type="date" 
              id="mission-assigned-date"
              name="assigned_date"
              value={formData.assigned_date}
              onChange={handleInputChange}
              className={errors.assigned_date ? 'input-error' : ''}
            />
            {errors.assigned_date && (
              <span className="mf-error-message">{errors.assigned_date}</span>
            )}
          </div>
          
          <div className={`mf-form-group ${errors.end_date ? 'has-error' : ''}`}>
            <label htmlFor="mission-end-date">
              Bitiş Tarihi <span className="required">*</span>
            </label>
            <input 
              type="date" 
              id="mission-end-date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              min={formData.assigned_date}
              className={errors.end_date ? 'input-error' : ''}
            />
            {errors.end_date && (
              <span className="mf-error-message">{errors.end_date}</span>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="mf-form-group">
          <label htmlFor="mission-from-to">
            Konum / Rota <span className="optional">(Opsiyonel)</span>
          </label>
          <input 
            type="text" 
            id="mission-from-to"
            name="from_to"
            placeholder="Örn: Ankara - İstanbul"
            value={formData.from_to}
            onChange={handleInputChange}
          />
        </div>

        {/* Attachments */}
        <div className="mf-form-group">
          <label htmlFor="mission-attachments">
            Dosya Ekle <span className="optional">(Opsiyonel)</span>
          </label>
          <div className="mf-file-input-wrapper">
            <input
              type="file"
              id="mission-attachments"
              name="attachments"
              multiple
              onChange={handleFileChange}
              className="mf-file-input"
            />
            <label htmlFor="mission-attachments" className="mf-file-input-label">
              📁 Dosya Seç
            </label>
          </div>
          
          {formData.attachments.length > 0 && (
            <ul className="mf-attachment-list">
              {formData.attachments.map((file, index) => (
                <li key={index} className="mf-attachment-item">
                  <span>📎 {file.name}</span>
                  <button 
                    type="button"
                    className="mf-remove-attachment"
                    onClick={() => removeAttachment(index)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          
          {/* Show existing attachments when editing */}
          {editingMission?.attachments?.length > 0 && (
            <div className="mf-existing-attachments">
              <p className="mf-existing-title">Mevcut Dosyalar:</p>
              <ul className="mf-attachment-list">
                {editingMission.attachments.map((att, index) => (
                  <li key={index} className="mf-attachment-item existing">
                    <a href={att.file} target="_blank" rel="noopener noreferrer">
                      📄 {att.file_name || `Dosya ${index + 1}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* User Selection */}
        <div className={`mf-form-group ${errors.due_to ? 'has-error' : ''}`}>
          <label>
            Atanacak Kullanıcılar <span className="required">*</span>
            <span className="mf-selection-count">
              ({formData.due_to.length} kişi seçildi)
            </span>
          </label>
          
          {errors.due_to && (
            <span className="mf-error-message">{errors.due_to}</span>
          )}
          
          <div className="mf-user-selection-grid">
            {users.length === 0 ? (
              <p className="mf-loading-text">⏳ Kullanıcılar yükleniyor...</p>
            ) : (
              users.map(user => (
                <label 
                  key={user.id} 
                  className={`mf-user-checkbox-card ${
                    formData.due_to.includes(user.id) ? 'selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.due_to.includes(user.id)}
                    onChange={() => handleUserSelection(user.id)}
                    className="mf-user-checkbox"
                  />
                  <div className="mf-user-info">
                    <strong className="mf-user-name">
                      {getUserDisplayName(user)}
                    </strong>
                    <span className={`mf-role-badge ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                    {user.unvan && (
                      <span className="mf-user-unvan">
                        🏷️ {user.unvan}
                      </span>
                    )}
                    <small className="mf-user-email">{user.email}</small>
                  </div>
                  <div className="mf-checkbox-indicator">
                    {formData.due_to.includes(user.id) ? '✓' : ''}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="mf-button-group">
          {editingMission && (
            <button 
              type="button" 
              className="mf-cancel-btn"
              onClick={handleCancel}
              disabled={saving}
            >
              İptal
            </button>
          )}
          
          <button 
            type="submit" 
            className="mf-submit-btn"
            disabled={saving || formData.due_to.length === 0}
          >
            {saving 
              ? "⏳ Kaydediliyor..." 
              : editingMission 
                ? "💾 Değişiklikleri Kaydet" 
                : "✅ Görevi Ata"
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTask;