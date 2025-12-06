import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import "../styles/Statistics.css"; // Stil dosyasının var olduğu varsayılmıştır

// API Uç Noktaları
const MISSIONS_ENDPOINT = "/api/missions/";
const USERS_ENDPOINT = "/api/users/assignable_users/";
const PROFILE_ENDPOINT = "/api/user/profile/";

// Renk Şeması
const COLORS = {
  completed: "#10b981", // Emerald Green
  pending: "#f59e0b", // Amber Orange
  overdue: "#ef4444", // Red
  primary: "#3b82f6", // Blue
  secondary: "#8b5cf6", // Violet
  accent: "#ec4899" // Pink
};

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444"];

const Statistics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * API'den kullanıcı profilini, görevleri ve atanabilir kullanıcıları çeker.
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, missionsRes, usersRes] = await Promise.all([
        api.get(PROFILE_ENDPOINT),
        api.get(MISSIONS_ENDPOINT),
        api.get(USERS_ENDPOINT)
      ]);

      setCurrentUser(profileRes.data);
      // Görev verisinin results içinde array olarak gelmesi beklenir
      setMissions(Array.isArray(missionsRes.data.results) ? missionsRes.data.results : []);
      
      // Kullanıcı verisinin işlenmesi
      let userData = [];
      if (Array.isArray(usersRes.data)) {
        userData = usersRes.data;
      } else if (usersRes.data && typeof usersRes.data === 'object') {
        // Django'dan dönen {role: [users]} yapısını düzleştirir
        userData = Object.values(usersRes.data).flat();
      }
      setUsers(userData);
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
      alert("İstatistikler yüklenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Kullanıcı adını biçimlendirir.
   */
  const formatUserName = (user) => {
    if (!user) return 'İsimsiz';
    if (user.full_name) return user.full_name;
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.username || 'İsimsiz';
  };

  /**
   * Rol etiketini Türkçe'ye çevirir.
   */
  const getRoleLabel = (role) => {
    switch(role) {
      case 'CEO': return 'CEO';
      case 'MANAGER': return 'Yönetici';
      case 'EMPLOYEE': return 'Çalışan';
      default: return role;
    }
  };

  /**
   * Görevleri kullanıcıya göre filtreler.
   */
  const getFilteredMissions = (userId = null) => {
    if (!userId) return missions;
    return missions.filter(m => 
      m.assigned_users?.some(u => u.id === userId) || m.assigner?.id === userId // Hem atanmış hem de atayan kişi olarak görevleri dahil edebiliriz
    );
  };

  /**
   * Görev listesine göre temel istatistikleri hesaplar.
   */
  const calculateStats = (userMissions) => {
    const total = userMissions.length;
    const completed = userMissions.filter(m => m.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

    const now = new Date();
    // Tamamlanmamış ve bitiş tarihi geçmiş görevler
    const overdue = userMissions.filter(m => 
      !m.completed && m.end_date && new Date(m.end_date) < now
    ).length;

    return { total, completed, pending, overdue, completionRate: parseFloat(completionRate) };
  };

  /**
   * Son 6 aylık tamamlanma trendini hazırlar.
   */
  const getMonthlyTrend = (userMissions) => {
    const months = {};
    const now = new Date();
    
    // Son 6 ayı oluştur
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[monthKey] = { completed: 0, total: 0 };
    }

    userMissions.forEach(mission => {
      // Görevin tamamlandığı veya atandığı/oluşturulduğu ayı kullanabiliriz.
      // Burada bitiş tarihini (end_date) baz alıyoruz.
      const endDate = mission.end_date ? new Date(mission.end_date) : new Date();
      const monthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (months[monthKey]) {
        months[monthKey].total++;
        if (mission.completed) {
          months[monthKey].completed++;
        }
      }
    });

    return Object.entries(months).map(([key, value]) => {
      const [month] = key.split('-');
      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return {
        month: monthNames[parseInt(month) - 1],
        tamamlanan: value.completed,
        toplam: value.total,
        oran: value.total > 0 ? ((value.completed / value.total) * 100).toFixed(0) : 0
      };
    });
  };

  /**
   * Tamamlanan görevlerin süre aralıklarına göre dağılımını hesaplar.
   */
  const getCompletionTimes = (userMissions) => {
    const completedMissions = userMissions.filter(m => m.completed && m.assigned_date);
    const times = {
      '0-3 gün': 0,
      '4-7 gün': 0,
      '8-14 gün': 0,
      '15-30 gün': 0,
      '30+ gün': 0
    };

    completedMissions.forEach(mission => {
      // API'den dönen verinin start/completion tarihini kullanmak daha doğru olur.
      // Örnekte `assigned_date` ve `end_date` kullanılıyor, bu süre farkı görev süresi olarak ele alınır.
      const start = new Date(mission.assigned_date);
      const end = new Date(mission.end_date);
      // Görev atandığı ve bittiği tarih arasındaki farkı gün olarak hesaplar
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      if (days <= 3) times['0-3 gün']++;
      else if (days <= 7) times['4-7 gün']++;
      else if (days <= 14) times['8-14 gün']++;
      else if (days <= 30) times['15-30 gün']++;
      else times['30+ gün']++;
    });

    return Object.entries(times).map(([name, value]) => ({ name, value }));
  };

  /**
   * Kullanıcılar arası performans karşılaştırmasını hazırlar.
   */
  const getUserComparison = () => {
    return users.map(user => {
      const userMissions = getFilteredMissions(user.id);
      const stats = calculateStats(userMissions);
      return {
        id: user.id,
        name: formatUserName(user).split(' ')[0], // Sadece ilk ad
        tamamlanan: stats.completed,
        devamEden: stats.pending,
        oran: stats.completionRate
      };
    }).sort((a, b) => b.oran - a.oran); // Tamamlanma oranına göre sırala
  };

  /**
   * Radar Chart için çoklu metrik verisini hazırlar.
   */
  const getRadarData = (userMissions) => {
    const stats = calculateStats(userMissions);
    const completedMissions = userMissions.filter(m => m.completed && m.assigned_date);

    // Ortalama Tamamlanma Süresi (Gün)
    const totalCompletionDays = completedMissions.reduce((acc, m) => {
        const start = new Date(m.assigned_date);
        const end = new Date(m.end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return acc + days;
      }, 0);
    const avgCompletionTime = completedMissions.length > 0
      ? totalCompletionDays / completedMissions.length
      : 0;

    // Metrikleri 0-100 arasında normalize etme (Basitleştirilmiş)
    const totalMissions = Math.max(1, stats.total);
    const completedRate = stats.completionRate;
    const onTimeRate = 100 - (stats.overdue / totalMissions) * 100;
    
    // Verimlilik: Tamamlanan görev sayısı / (Ortalama süre + 1) * Ölçeklendirme faktörü
    const productivity = Math.min(100, (stats.completed / Math.max(1, avgCompletionTime)) * 20);
    // Aktiflik: Toplam görev sayısı / Maksimum görev sayısı * 100 (Maksimum görev 20 kabul edildi)
    const activity = Math.min(100, (stats.total / 20) * 100);
    // Hata/Gecikme Düşüklüğü (Başarı): Gecikme sayısına göre ceza
    const successRate = stats.overdue === 0 ? 100 : Math.max(0, 100 - (stats.overdue * 10));

    return [
      { metric: 'Tamamlanma', value: completedRate, fullMark: 100 },
      { metric: 'Verimlilik', value: productivity, fullMark: 100 },
      { metric: 'Zamanında', value: onTimeRate, fullMark: 100 },
      { metric: 'Aktiflik', value: activity, fullMark: 100 },
      { metric: 'Başarı', value: successRate, fullMark: 100 }
    ];
  };

  /**
   * Mevcut ayın genel görev istatistiklerini hesaplar.
   */
  const getCurrentMonthReport = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthMissions = missions.filter(m => {
      const endDate = m.end_date ? new Date(m.end_date) : new Date();
      return endDate >= monthStart && endDate <= monthEnd;
    });

    return calculateStats(monthMissions);
  };

  /**
   * Görev durumlarının (Tamamlanan, Devam Eden, Gecikmiş) dağılımını hazırlar.
   */
  const getStatusDistribution = (userMissions) => {
    const stats = calculateStats(userMissions);
    // Devam Eden (Pending) = Toplam Devam Eden - Gecikmiş
    const inProgress = stats.pending - stats.overdue;

    return [
      { name: 'Tamamlanan', value: stats.completed, color: COLORS.completed },
      { name: 'Devam Eden', value: inProgress > 0 ? inProgress : 0, color: COLORS.pending },
      { name: 'Gecikmiş', value: stats.overdue, color: COLORS.overdue }
    ].filter(item => item.value > 0);
  };

  if (loading) {
    return (
      <div className="statistics-loading">
        <div className="spinner">📊</div>
        <p>İstatistikler yükleniyor...</p>
      </div>
    );
  }

  // Görüntülenecek görevler, seçili kullanıcıya veya genel görevlere göre belirlenir
  let displayMissions;
  if (selectedUser) {
    displayMissions = getFilteredMissions(selectedUser.id);
  } else if (currentUser?.role === 'EMPLOYEE') {
    displayMissions = getFilteredMissions(currentUser.id);
  } else {
    displayMissions = missions;
  }

  const displayStats = calculateStats(displayMissions);
  const monthReport = getCurrentMonthReport();

  // Erişim kontrolü
  const canViewAllUsers = currentUser?.role === 'CEO';
  const canViewEmployees = currentUser?.role === 'CEO' || currentUser?.role === 'MANAGER';
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  // Çalışanın sadece kendini görmesini sağlar
  const visibleUsers = isEmployee 
    ? [currentUser]
    : canViewAllUsers 
      ? users 
      : users.filter(u => u.role === 'EMPLOYEE'); // Manager sadece çalışanları görür (varsayım)

  // Eğer çalışan kendi sayfasındaysa, selectedUser'ı kendi olarak ayarla
   
  
  // Çalışan kendi sayfasını gördüğünde, başlıklar ve kartlar onun kişisel verilerini gösterir.
  
  // CEO ve MANAGER ana sayfada (selectedUser=null) şirket genelini,
  // Employee ise her zaman kendi detaylarını görür.

  return (
    <div className="statistics-page">
      {/* Header */}
      <header className="stats-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Geri
          </button>
          <div className="header-title">
            <h1> İstatistikler & Raporlar</h1>
            <p className="header-subtitle">
              {isEmployee || selectedUser 
                ? `${formatUserName(selectedUser || currentUser)}'ın performans raporu`
                : canViewAllUsers 
                  ? 'Şirket geneli istatistikler'
                  : 'Çalışan istatistikleri'}
            </p>
          </div>
        </div>
        <div className="header-right">
          <span className="role-badge">{getRoleLabel(currentUser?.role)}</span>
        </div>
      </header>

      <div className="statistics-container">
        
        {/* CEO/MANAGER Genel Özet ve Grafikler (selectedUser yoksa) */}
        {!selectedUser && !isEmployee && (
          <>
            <div className="section-header">
              <h2> Şirket Geneli - {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</h2>
            </div>

            <div className="stats-cards-grid">
              <div className="stat-card card-total">
                <div className="card-icon"></div>
                <div className="card-content">
                  <h3>Toplam Görev</h3>
                  <p className="card-number">{monthReport.total}</p>
                  <span className="card-label">Bu ay</span>
                </div>
              </div>

              <div className="stat-card card-completed">
                <div className="card-icon"></div>
                <div className="card-content">
                  <h3>Tamamlanan</h3>
                  <p className="card-number">{monthReport.completed}</p>
                  <span className="card-label">{monthReport.completionRate}% başarı</span>
                </div>
              </div>

              <div className="stat-card card-pending">
                <div className="card-icon"></div>
                <div className="card-content">
                  <h3>Devam Eden</h3>
                  <p className="card-number">{monthReport.pending}</p>
                  <span className="card-label">Aktif görevler</span>
                </div>
              </div>

              <div className="stat-card card-overdue">
                <div className="card-icon"></div>
                <div className="card-content">
                  <h3>Gecikmiş</h3>
                  <p className="card-number">{monthReport.overdue}</p>
                  <span className="card-label">Dikkat gerekli</span>
                </div>
              </div>
            </div>

            {/* Ana Grafikler */}
            <div className="charts-grid">
              {/* Aylık Trend */}
              <div className="chart-card large">
                <h3> Son 6 Ay Tamamlanma Trendi</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getMonthlyTrend(missions)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="toplam" 
                      stackId="1"
                      stroke={COLORS.primary} 
                      fill={COLORS.primary}
                      fillOpacity={0.4}
                      name="Toplam Görev"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="tamamlanan" 
                      stackId="2"
                      stroke={COLORS.completed} 
                      fill={COLORS.completed}
                      fillOpacity={0.8}
                      name="Tamamlanan"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Kullanıcı Karşılaştırması */}
              {canViewEmployees && (
                <div className="chart-card large">
                  <h3>👥 Kullanıcı Performans Karşılaştırması</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getUserComparison()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="tamamlanan" fill={COLORS.completed} name="Tamamlanan Görev" />
                      <Bar dataKey="devamEden" fill={COLORS.pending} name="Devam Eden Görev" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Durum Dağılımı */}
              <div className="chart-card">
                <h3> Görev Durum Dağılımı</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getStatusDistribution(missions)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getStatusDistribution(missions).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Tamamlanma Süreleri */}
              <div className="chart-card">
                <h3> Görev Tamamlanma Süreleri</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getCompletionTimes(missions)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill={COLORS.secondary} name="Görev Sayısı" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <hr />
          </>
        )}

        {/* Kullanıcı Listesi veya Seçili Kullanıcı Detayları (CEO/MANAGER) */}
        {!isEmployee && (
          <div className="users-section">
            {selectedUser ? (
              <>
                {/* Seçili Kullanıcı Detayları */}
                <div className="section-header">
                  <div className="header-with-back">
                    <button className="user-back-btn" onClick={() => setSelectedUser(null)}>
                      ← Geri
                    </button>
                    <h2>{formatUserName(selectedUser)} - Detaylı İstatistikler</h2>
                  </div>
                </div>

                <div className="stats-cards-grid">
                  <div className="stat-card card-user">
                    <div className="card-icon"></div>
                    <div className="card-content">
                      <h3>Tamamlanma Oranı</h3>
                      <p className="card-number">{displayStats.completionRate}%</p>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${displayStats.completionRate}%`, backgroundColor: COLORS.primary }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="stat-card card-completed">
                    <div className="card-icon"></div>
                    <div className="card-content">
                      <h3>Tamamlanan</h3>
                      <p className="card-number">{displayStats.completed}</p>
                    </div>
                  </div>

                  <div className="stat-card card-pending">
                    <div className="card-icon"></div>
                    <div className="card-content">
                      <h3>Devam Eden</h3>
                      <p className="card-number">{displayStats.pending - displayStats.overdue}</p>
                    </div>
                  </div>

                  <div className="stat-card card-overdue">
                    <div className="card-icon"> </div>
                    <div className="card-content">
                      <h3>Gecikmiş</h3>
                      <p className="card-number">{displayStats.overdue}</p>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  {/* Kullanıcı Trend */}
                  <div className="chart-card large">
                    <h3> Aylık Performans Trendi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMonthlyTrend(displayMissions)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="tamamlanan" 
                          stroke={COLORS.completed} 
                          strokeWidth={3}
                          name="Tamamlanan"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="toplam" 
                          stroke={COLORS.primary} 
                          strokeWidth={3}
                          name="Toplam Görev"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Radar Chart */}
                  <div className="chart-card">
                    <h3> Performans Metrikleri</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={getRadarData(displayMissions)}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="metric" stroke="#6b7280" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                        <Radar 
                          name="Performans Değeri" 
                          dataKey="value" 
                          stroke={COLORS.primary} 
                          fill={COLORS.primary} 
                          fillOpacity={0.6}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Durum Dağılımı */}
                  <div className="chart-card">
                    <h3> Görev Durumu</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getStatusDistribution(displayMissions)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getStatusDistribution(displayMissions).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tamamlanma Süreleri */}
                  <div className="chart-card">
                    <h3> Tamamlanma Süreleri</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getCompletionTimes(displayMissions)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Bar dataKey="value" fill={COLORS.accent} name="Görev Sayısı" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Kullanıcı Listesi */}
                <div className="section-header">
                  <h2> Kullanıcılar - Detaylı İstatistikler İçin Tıklayın</h2>
                </div>

                <div className="users-grid">
                  {visibleUsers.map(user => {
                    const userMissions = getFilteredMissions(user.id);
                    const userStats = calculateStats(userMissions);
                    
                    return (
                      <div 
                        key={user.id} 
                        className="user-stat-card"
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="user-header">
                          <div className="user-avatar-large">
                            {formatUserName(user).charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info">
                            <h3>{formatUserName(user)}</h3>
                            <p className="user-email">{user.email}</p>
                            <span className={`role-badge-small role-${user.role?.toLowerCase()}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </div>
                        </div>

                        <div className="user-quick-stats">
                          <div className="quick-stat">
                            <span className="stat-label">Tamamlanma Oranı</span>
                            <span className="stat-value">{userStats.completionRate}%</span>
                            <div className="mini-progress">
                              <div 
                                className="mini-progress-fill"
                                style={{ 
                                  width: `${userStats.completionRate}%`,
                                  backgroundColor: COLORS.completed 
                                }}
                              />
                            </div>
                          </div>

                          <div className="stats-row">
                            <div className="mini-stat">
                              <span className="mini-icon"></span>
                              <div>
                                <p className="mini-label">Tamamlanan</p>
                                <p className="mini-value">{userStats.completed}</p>
                              </div>
                            </div>
                            <div className="mini-stat">
                              <span className="mini-icon"></span>
                              <div>
                                <p className="mini-label">Devam Eden</p>
                                <p className="mini-value">{userStats.pending}</p>
                              </div>
                            </div>
                            <div className="mini-stat">
                              <span className="mini-icon"></span>
                              <div>
                                <p className="mini-label">Gecikmiş</p>
                                <p className="mini-value">{userStats.overdue}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="user-card-footer">
                          <span className="view-details">Detaylı İstatistikler →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Employee Sadece Kendi İstatistiklerini Görür */}
        {isEmployee && (
          <>
            <div className="section-header">
              <h2>Kişisel İstatistikleriniz</h2>
            </div>

            <div className="stats-cards-grid">
              <div className="stat-card card-user">
                <div className="card-icon"></div>
                <div className="card-content">
                  <h3>Tamamlanma Oranı</h3>
                  <p className="card-number">{displayStats.completionRate}%</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${displayStats.completionRate}%`, backgroundColor: COLORS.primary }}
                    />
                  </div>
                </div>
              </div>

              <div className="stat-card card-completed">
                <div className="card-icon"></div>
                <div className="card-content">
                  <h3>Tamamlanan</h3>
                  <p className="card-number">{displayStats.completed}</p>
                </div>
              </div>

              <div className="stat-card card-pending">
                <div className="card-icon"></div>
                <div className="card-content">
                  <h3>Devam Eden</h3>
                  <p className="card-number">{displayStats.pending - displayStats.overdue}</p>
                </div>
              </div>

              <div className="stat-card card-overdue">
                <div className="card-icon"></div>
                <div className="card-content">
                  <h3>Gecikmiş</h3>
                  <p className="card-number">{displayStats.overdue}</p>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card large">
                <h3> Aylık Performans Trendiniz</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getMonthlyTrend(displayMissions)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    /> 
                     <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="toplam" 
                      stackId="1"
                      stroke={COLORS.primary} 
                      fill={COLORS.primary}
                      fillOpacity={0.4}
                      name="Toplam Görev"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="tamamlanan" 
                      stackId="2"
                      stroke={COLORS.completed} 
                      fill={COLORS.completed}
                      fillOpacity={0.8}
                      name="Tamamlanan"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                  <h3>Performans Metrikleriniz</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={getRadarData(displayMissions)}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="metric" stroke="#6b7280" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                      <Radar 
                        name="Performans Değeri" 
                        dataKey="value" 
                        stroke={COLORS.primary} 
                        fill={COLORS.primary} 
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Görev Durumu</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getStatusDistribution(displayMissions)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getStatusDistribution(displayMissions).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Tamamlanma Süreleri</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getCompletionTimes(displayMissions)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" fill={COLORS.accent} name="Görev Sayısı" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Statistics;