import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { ACCESS_TOKEN } from "../services/constant";
import "../styles/HomePage.css";

const MISSIONS_ENDPOINT = "/api/missions/";

const HomePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const upcomingMissionsRef = useRef(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [hoveredMission, setHoveredMission] = useState(null);
  // View Selection
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'gantt'

  // Ay ve yıl navigation için
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());





  useEffect(() => {
    fetchMissions();
  }, []);

  useEffect(() => {
    if (location.state?.scrollToUpcoming && upcomingMissionsRef.current) {
      setTimeout(() => {
        upcomingMissionsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [location.state]);

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const response = await api.get(MISSIONS_ENDPOINT);
      setMissions(Array.isArray(response.data.results) ? response.data.results : []);
    } catch (error) {
      console.error("❌ Failed to fetch missions:", error);
      alert("Görevler yüklenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  // Takvim hesaplamaları
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Pazartesi = 0
  };

  const formatUserName = (user) => {
    if (!user) return '';
    return user.full_name || user.username;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  // Belirli bir tarihteki görevleri bul
  const getMissionsForDate = (day, month, year) => {
    return missions.filter(mission => {
      if (!mission) return false;
      const startDate = new Date(mission.assigned_date);
      const endDate = new Date(mission.end_date);
      const checkDate = new Date(year, month, day);

      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  // Bir görevin takvimde hangi tarihleri kapladığını kontrol et
  const isMissionStartDate = (day, month, year, mission) => {
    const startDate = new Date(mission.assigned_date);
    return (
      startDate.getDate() === day &&
      startDate.getMonth() === month &&
      startDate.getFullYear() === year
    );
  };

  const isMissionEndDate = (day, month, year, mission) => {
    const endDate = new Date(mission.end_date);
    return (
      endDate.getDate() === day &&
      endDate.getMonth() === month &&
      endDate.getFullYear() === year
    );
  };

  // Takvim günlerini oluştur
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const days = [];

    // Önceki ayın son günleri
    const prevMonthDays = getDaysInMonth(viewMonth - 1, viewYear);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        month: viewMonth - 1,
        year: viewYear
      });
    }

    // Bu ayın günleri
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        month: viewMonth,
        year: viewYear
      });
    }

    // Sonraki ayın ilk günleri
    const remainingDays = 42 - days.length; // 6 hafta = 42 gün
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        month: viewMonth + 1,
        year: viewYear
      });
    }

    return days;
  };

  const changeMonth = (direction) => {
    if (direction === 'prev') {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    } else {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    }
  };

  const goToToday = () => {
    const today = new Date();
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  const isToday = (day, month, year) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isWeekend = (day, month, year) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const calendarDays = generateCalendarDays();

  // --- GANTT LOGIC ---
  const getGanttPosition = (mission) => {
    // 1. Define View Boundaries from calendarDays
    if (!calendarDays.length) return null;

    const first = calendarDays[0];
    const last = calendarDays[calendarDays.length - 1];

    const viewStart = new Date(first.year, first.month, first.day, 0, 0, 0, 0);
    const viewEnd = new Date(last.year, last.month, last.day, 23, 59, 59, 999);

    // 2. Mission Boundaries
    const mStart = new Date(mission.assigned_date);
    const mEnd = new Date(mission.end_date);
    mStart.setHours(0, 0, 0, 0);
    mEnd.setHours(23, 59, 59, 999);

    // 3. Check Overlap
    if (mEnd < viewStart || mStart > viewEnd) return null;

    // 4. Calculate Coordinates (Percentages)
    const totalViewMs = viewEnd.getTime() - viewStart.getTime();

    // Clamp start
    const visibleStart = mStart < viewStart ? viewStart : mStart;
    const offsetMs = visibleStart.getTime() - viewStart.getTime();
    const leftPercent = (offsetMs / totalViewMs) * 100;

    // Clamp end
    const visibleEnd = mEnd > viewEnd ? viewEnd : mEnd;
    // Duration is visibleEnd - visibleStart. 
    // Add roughly 1 day (86400000ms) to include the last day fully in visual block? 
    // Actually viewEnd includes the full last day (23:59).
    // Let's use duration ms.
    const durationMs = visibleEnd.getTime() - visibleStart.getTime();
    // To prevent 0 width for same day, ensure min width of 1 day equivalent
    // actually totalViewMs is roughly 42 days.
    // 1 day percent = (1 / 42) * 100 ~= 2.3%
    const widthPercent = (durationMs / totalViewMs) * 100;

    // Correction: If start==end (1 day), durationMs is ~24h (due to 00:00 vs 23:59 setup above? No mEnd is 23:59)
    // mStart 00:00, mEnd 23:59 -> diff is 23h59m -> ~1 day. 
    // So widthPercent should be correct.

    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  const ganttMissions = missions.filter(m => getGanttPosition(m) !== null);
  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  // İstatistikler
  const totalMissions = missions.length;
  const completedMissions = missions.filter(m => m && m.completed).length;
  const pendingMissions = totalMissions - completedMissions;
  const completionRate = totalMissions > 0 ? ((completedMissions / totalMissions) * 100).toFixed(0) : 0;

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <div className="header-actions">

          </div>
        </div>
      </header>

      <div className="home-container">
        {/* İstatistik Kartları */}
        <div className="stats-grid">
          <div className="stat-card total-card" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <h3>Toplam Görev</h3>
              <p className="stat-number">{totalMissions}</p>
            </div>
          </div>

          <div className="stat-card completed-card" onClick={() => navigate('/dashboard', { state: { filterStatus: 'completed' } })} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <h3>Tamamlanan</h3>
              <p className="stat-number">{completedMissions}</p>
            </div>
          </div>


          <div className="stat-card pending-card" onClick={() => navigate('/dashboard', { state: { filterStatus: 'pending' } })} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <h3>Devam Eden</h3>
              <p className="stat-number">{pendingMissions}</p>
            </div>
          </div>

          <div className="stat-card rate-card">
            <div className="stat-info">
              <h3>Tamamlanma Oranı</h3>
              <p className="stat-number">{completionRate}%</p>
            </div>
          </div>
        </div>

        {/* Kocaman Takvim */}
        <div className="calendar-section">
          <div className="calendar-header">
            <div className="calendar-controls-left">
              <button className="month-nav-btn" onClick={() => changeMonth('prev')}>‹</button>
              <div className="calendar-title">
                <h2>{monthNames[viewMonth]} {viewYear}</h2>
                <button className="today-btn" onClick={goToToday}>Bugüne Git</button>
              </div>
              <button className="month-nav-btn" onClick={() => changeMonth('next')}>›</button>
            </div>

            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
              >
                 Takvim
              </button>
              <button
                className={`view-btn ${viewMode === 'gantt' ? 'active' : ''}`}
                onClick={() => setViewMode('gantt')}
              >
                 Gantt
              </button>
            </div>
          </div>

          <div className="calendar-wrapper">
            {loading ? (
              <div className="calendar-loading">
                <div className="spinner">⏳</div>
                <p>Takvim yükleniyor...</p>
              </div>
            ) : (
              <>
                {viewMode === 'calendar' ? (
                  /* === CALENDAR VIEW === */
                  <>
                    <div className="calendar-days-header">
                      {dayNames.map(day => (
                        <div key={day} className="day-name">{day}</div>
                      ))}
                    </div>

                    <div className="calendar-grid">
                      {calendarDays.map((dateObj, index) => {
                        const dayMissions = getMissionsForDate(dateObj.day, dateObj.month, dateObj.year);
                        const hasStartMission = dayMissions.some(m =>
                          isMissionStartDate(dateObj.day, dateObj.month, dateObj.year, m)
                        );
                        const hasEndMission = dayMissions.some(m =>
                          isMissionEndDate(dateObj.day, dateObj.month, dateObj.year, m)
                        );

                        return (
                          <div
                            key={index}
                            className={`calendar-day ${!dateObj.isCurrentMonth ? 'other-month' : ''} ${isToday(dateObj.day, dateObj.month, dateObj.year) ? 'today' : ''
                              } ${dayMissions.length > 0 ? 'has-missions' : ''}`}
                            onClick={() => setSelectedDate(dateObj)}
                          >
                            <div className={`day-number ${isWeekend(dateObj.day, dateObj.month, dateObj.year) ? 'weekend-day' : ''}`}>
                              {dateObj.day}
                            </div>

                            {dayMissions.length > 0 && (
                              <div className="mission-indicators">
                                {dayMissions.slice(0, 3).map(mission => (
                                  <div
                                    key={mission.id}
                                    className={`mission-indicator ${mission.completed ? 'completed' : 'pending'}`}
                                    onMouseEnter={() => setHoveredMission(mission)}
                                    onMouseLeave={() => setHoveredMission(null)}
                                    title={mission.description}
                                  >
                                    {!isMissionStartDate(dateObj.day, dateObj.month, dateObj.year, mission) && !isMissionEndDate(dateObj.day, dateObj.month, dateObj.year, mission) && <span className="middle-dot">●</span>}
                                    {isMissionStartDate(dateObj.day, dateObj.month, dateObj.year, mission) && <span className="start-flag">🚩</span>}
                                    {isMissionEndDate(dateObj.day, dateObj.month, dateObj.year, mission) && <span className="end-flag">🏁</span>}
                                  </div>
                                ))}
                                {dayMissions.length > 3 && (
                                  <div className="more-indicator">+{dayMissions.length - 3}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* === GANTT VIEW === */
                  <div className="gantt-container">
                    <div className="gantt-timeline-header">
                      {calendarDays.map((date, idx) => (
                        <div key={idx} className={`gantt-header-cell ${!date.isCurrentMonth ? 'other' : ''} ${isToday(date.day, date.month, date.year) ? 'today' : ''}`}>
                          <span className="gantt-day-num">{date.day}</span>
                          <span className="gantt-day-name">{dayNames[idx % 7]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="gantt-body">
                      {ganttMissions.length === 0 ? (
                        <div className="no-missions-gantt">Bu aralıkta görüntülenecek görev yok.</div>
                      ) : (
                        ganttMissions.map(mission => {
                          const pos = getGanttPosition(mission);
                          if (!pos) return null;
                          return (
                            <div key={mission.id} className="gantt-row">
                              <div
                                className={`gantt-bar ${mission.completed ? 'completed' : 'pending'} ${mission.priority ? mission.priority.toLowerCase() : ''}`}
                                style={{ left: pos.left, width: pos.width }}
                                onMouseEnter={() => setHoveredMission(mission)}
                                onMouseLeave={() => setHoveredMission(null)}
                              >
                                <span className="gantt-bar-label">{mission.description}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {/* Background Grid Lines (Optional visual guide) */}
                    <div className="gantt-grid-overlay">
                      {calendarDays.map((_, idx) => (
                        <div key={idx} className="gantt-grid-col"></div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredMission && (
          <div className="mission-tooltip">
            <h4>{hoveredMission.description}</h4>
            <p>📅 {formatDate(hoveredMission.assigned_date)} - {formatDate(hoveredMission.end_date)}</p>
            <p className={`status ${hoveredMission.completed ? 'completed' : 'pending'}`}>
              {hoveredMission.completed ? '✅ Tamamlandı' : '⏳ Devam Ediyor'}
            </p>
          </div>
        )}

        {/* Seçili Gün Detayları */}
        {selectedDate && (
          <div className="selected-date-modal" onClick={() => setSelectedDate(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {selectedDate.day} {monthNames[selectedDate.month]} {selectedDate.year}
                </h3>
                <button className="close-btn" onClick={() => setSelectedDate(null)}>✕</button>
              </div>

              <div className="modal-body">
                {getMissionsForDate(selectedDate.day, selectedDate.month, selectedDate.year).length === 0 ? (
                  <p className="no-missions">Bu tarihte görev bulunmamaktadır.</p>
                ) : (
                  <div className="date-missions-list">
                    {getMissionsForDate(selectedDate.day, selectedDate.month, selectedDate.year).map(mission => (
                      <div key={mission.id} className={`date-mission-card ${mission.completed ? 'completed' : ''}`}>
                        <div className="mission-card-header">
                          <h4>{mission.description}</h4>
                          {mission.completed && <span className="completed-badge">✓ Tamamlandı</span>}
                        </div>

                        <div className="mission-card-body">
                          <p className="mission-dates">
                            {formatDate(mission.assigned_date)} - {formatDate(mission.end_date)}
                          </p>

                          {mission.from_to && (
                            <p className="mission-location">📍 {mission.from_to}</p>
                          )}

                          {mission.assigned_users && mission.assigned_users.length > 0 && (
                            <div className="mission-users">
                              <strong>👤 Atanan:</strong>
                              {mission.assigned_users.map(user => (
                                <span key={user.id} className="user-badge">
                                  {formatUserName(user)}
                                </span>
                              ))}
                            </div>
                          )}

                          {isMissionStartDate(selectedDate.day, selectedDate.month, selectedDate.year, mission) && (
                            <span className="date-marker start-marker">🚩 Başlangıç Tarihi</span>
                          )}

                          {isMissionEndDate(selectedDate.day, selectedDate.month, selectedDate.year, mission) && (
                            <span className="date-marker end-marker">🏁 Bitiş Tarihi</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Yaklaşan Görevler */}
        <div className="upcoming-missions" ref={upcomingMissionsRef}>
          <h2>Yaklaşan Görevler</h2>
          <div className="upcoming-list">
            {missions
              .filter(m => m && !m.completed && new Date(m.end_date) >= new Date())
              .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
              .slice(0, 5)
              .map(mission => (
                <div key={mission.id} className="upcoming-card">
                  <div className="upcoming-date">
                    <span className="date-day">{new Date(mission.end_date).getDate()}</span>
                    <span className="date-month">
                      {monthNames[new Date(mission.end_date).getMonth()].slice(0, 3)}
                    </span>
                  </div>
                  <div className="upcoming-info">
                    <h4>{mission.description}</h4>
                    <p>📅 Bitiş: {formatDate(mission.end_date)}</p>
                    {mission.assigned_users && mission.assigned_users.length > 0 && (
                      <p className="assigned-to">
                        👤 {mission.assigned_users.map(u => formatUserName(u)).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}

            {missions.filter(m => m && !m.completed && new Date(m.end_date) >= new Date()).length === 0 && (
              <p className="no-upcoming">Yaklaşan görev bulunmamaktadır.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;