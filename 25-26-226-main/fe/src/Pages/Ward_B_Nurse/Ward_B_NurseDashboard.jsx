import React, { useState, useEffect } from 'react';
import { 
  CloudRain, 
  AlertTriangle, 
  BellRing, 
  ArrowRight, 
  Loader, 
  BedDouble, 
  CheckCircle2,
  Clock,
  Activity
} from 'lucide-react';

const Ward_B_NurseDashboard = () => {
  // --- STATE MANAGEMENT ---
  const [wardData, setWardData] = useState({
    capacity: 0,   // Total Functional Beds (from Inventory DB)
    occupancy: 0,  // Real-time Occupied Beds (from Daily Census DB)
    available: 0   // Calculated: Capacity - Occupancy
  });

  const [incomingCount, setIncomingCount] = useState(0); // AI Plan Count
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // --- MOCK ALERTS ---
  const alerts = {
    weather: {
      condition: "Heavy Rain",
      temp: "24°C",
      impact: "High risk of road accidents & slip/fall cases."
    },
    outbreak: {
      disease: "Seasonal Flu",
      status: "Moderate",
      note: "Respiratory ward admissions rising by 15%."
    }
  };

  // --- 1. FETCH WARD REAL-TIME STATUS (WARD B) ---
  useEffect(() => {
    const fetchWardStatus = async () => {
      try {
        setLoadingStats(true);
        // Using the new API endpoint for accurate "Available" calculation
        const response = await fetch('http://localhost:5001/api/ward-status/WARD-B');
        
        if (response.ok) {
          const data = await response.json();
          setWardData({
            capacity: data.capacity,
            available: data.available, // Directly from backend logic
            occupancy: data.occupied
          });
        }
      } catch (error) {
        console.error("Failed to fetch ward stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchWardStatus();
  }, []);

  // --- 2. FETCH AI OPTIMIZATION PLAN (WARD B) ---
  useEffect(() => {
    const fetchAIPlan = async () => {
      try {
        setLoadingAI(true);
        const res = await fetch('http://localhost:5001/predict'); 
        if (res.ok) {
          const data = await res.json();
          // Extract count specifically for WARD B
          if (data.action_plan_transfers) {
            setIncomingCount(data.action_plan_transfers.ward_b || 0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch AI Plan", err);
      } finally {
        setLoadingAI(false);
      }
    };
    fetchAIPlan();
  }, []);

  // Calculations
  const isCritical = incomingCount > wardData.available;
  const occupancyRate = wardData.capacity > 0 
    ? Math.round((wardData.occupancy / wardData.capacity) * 100) 
    : 0;

  // --- STYLES (Modern UI) ---
  const styles = {
    container: {
      padding: '40px',
      maxWidth: '1280px',
      margin: '0 auto',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#1e293b',
      background: '#f8fafc',
      minHeight: '100vh',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'end',
      marginBottom: '40px',
    },
    title: { fontSize: '36px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
    subtitle: { color: '#64748b', fontSize: '15px', fontWeight: '500', marginTop: '6px' },
    
    // Grid Layouts
    mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' },
    colLeft: { gridColumn: 'span 8' }, 
    colRight: { gridColumn: 'span 4' },

    // Cards
    card: {
      background: 'white',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f5f9',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden'
    },
    
    // Notification Specifics
    notificationCard: {
      background: incomingCount > 0 ? 'linear-gradient(135deg, #fff7ed 0%, #fff 100%)' : 'white',
      borderLeft: incomingCount > 0 ? '6px solid #f97316' : '6px solid #10b981',
    },
    actionBtn: {
      padding: '14px 24px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: '600',
      fontSize: '15px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
    },
    
    // Stats
    statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' },
    statBox: { background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' },
    statLabel: { fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
    statValue: { fontSize: '32px', fontWeight: '800', color: '#0f172a', marginTop: '8px' },
  };

  return (
    <div style={styles.container}>
      
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Ward B Command Center</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            <p style={styles.subtitle}>System Online • AI Optimization Active</p>
          </div>
        </div>
        
        {/* Occupancy Indicator */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Live Occupancy</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: occupancyRate > 90 ? '#ef4444' : '#0f172a' }}>
              {loadingStats ? '...' : `${occupancyRate}%`}
            </span>
            <div style={{ width: '100px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${occupancyRate}%`, height: '100%', background: occupancyRate > 90 ? '#ef4444' : '#10b981', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>
      </header>

      <div style={styles.mainGrid}>
        
        {/* --- LEFT COLUMN (Main Notification & Stats) --- */}
        <div style={{ ...styles.colLeft, gridColumn: window.innerWidth < 1024 ? 'span 12' : 'span 8' }}>
          
          {/* 1. AI PRE-PREPARE NOTIFICATION */}
          <div style={{ ...styles.card, ...styles.notificationCard }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BellRing size={22} color={incomingCount > 0 ? '#ea580c' : '#10b981'} />
                  {incomingCount > 0 ? "Optimization Plan: Incoming Transfers" : "Optimization Status: Clear"}
                </h2>
                <p style={{ color: '#64748b', marginTop: '6px' }}>Real-time bed allocation requests from ETU via AI Engine.</p>
              </div>
              {incomingCount > 0 && (
                <span style={{ background: '#fff7ed', color: '#c2410c', padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', border: '1px solid #ffedd5' }}>
                  ACTION REQUIRED
                </span>
              )}
            </div>

            {loadingAI ? (
              <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
                <Loader className="animate-spin" size={32} style={{ marginBottom: '16px', color: '#3b82f6' }} />
                <p>Analyzing Patient Flow...</p>
              </div>
            ) : (
              <>
                {incomingCount > 0 ? (
                  /* ACTIVE ALERT UI */
                  <div style={{ display: 'flex', gap: '32px', alignItems: 'center', background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #fed7aa', boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.1)' }}>
                    <div style={{ textAlign: 'center', paddingRight: '32px', borderRight: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#9a3412', textTransform: 'uppercase' }}>Incoming</p>
                      <p style={{ fontSize: '48px', fontWeight: '800', color: '#ea580c', lineHeight: '1', margin: '8px 0' }}>{incomingCount}</p>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Patients</p>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Clock size={16} color="#ea580c" />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#c2410c' }}>ETA: Less than 30 minutes</span>
                      </div>
                      <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.5' }}>
                        AI has identified <strong>{incomingCount} stable patients</strong> in ETU suitable for Ward B. 
                        Please prepare beds immediately.
                      </p>
                      
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button 
                          disabled={isCritical}
                          style={{ 
                            ...styles.actionBtn, 
                            background: isCritical ? '#94a3b8' : '#0f172a', 
                            color: 'white', 
                            flex: 1 
                          }}
                        >
                          {isCritical ? 'Insufficient Capacity' : 'Accept & Prepare Beds'} <ArrowRight size={18} />
                        </button>
                        <button style={{ ...styles.actionBtn, background: 'white', border: '1px solid #cbd5e1', color: '#475569' }}>
                          Defer
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* NO ALERT UI */
                  <div style={{ background: '#f0fdf4', padding: '32px', borderRadius: '16px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                    <div style={{ background: '#dcfce7', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <CheckCircle2 size={24} color="#16a34a" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#166534', margin: 0 }}>No Pending Transfers</h3>
                    <p style={{ color: '#15803d', marginTop: '8px' }}>Ward B is optimized. No immediate transfers required from ETU.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 2. WARD STATS OVERVIEW */}
          <div style={styles.card}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>Ward Statistics</h3>
            
            {loadingStats ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading Bed Data...</div>
            ) : (
              <div style={styles.statGrid}>
                {/* Total Capacity Card */}
                <div style={styles.statBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <span style={styles.statLabel}>Total Capacity</span>
                    <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>
                      <BedDouble size={20} color="#3b82f6" />
                    </div>
                  </div>
                  <p style={styles.statValue}>{wardData.capacity}</p>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Functional Beds Only</p>
                </div>
                
                {/* Available Beds Card */}
                <div style={styles.statBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <span style={styles.statLabel}>Available Beds</span>
                    <div style={{ background: '#dcfce7', padding: '4px 8px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a' }}>Live</span>
                    </div>
                  </div>
                  <p style={{ ...styles.statValue, color: wardData.available < 5 ? '#dc2626' : '#16a34a' }}>
                    {wardData.available}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Free & Ready (Cap - Occ)</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* --- RIGHT COLUMN (External Factors) --- */}
        <div style={{ ...styles.colRight, gridColumn: window.innerWidth < 1024 ? 'span 12' : 'span 4' }}>
          
          <div style={styles.card}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px' }}>
              External Risk Factors
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Weather Widget */}
              <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #dbeafe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ background: '#3b82f6', padding: '8px', borderRadius: '10px', color: 'white' }}>
                    <CloudRain size={20} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa' }}>Weather Impact</p>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: '#1e40af' }}>{alerts.weather.condition}</p>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{alerts.weather.impact}</p>
              </div>

              {/* Outbreak Widget */}
              <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '16px', border: '1px solid #fee2e2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ background: '#ef4444', padding: '8px', borderRadius: '10px', color: 'white' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#f87171' }}>Outbreak Alert</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#991b1b' }}>{alerts.outbreak.disease}</p>
                      <span style={{ fontSize: '10px', fontWeight: '700', background: 'white', color: '#ef4444', padding: '2px 6px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                        {alerts.outbreak.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#7f1d1d', lineHeight: '1.5' }}>{alerts.outbreak.note}</p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Ward_B_NurseDashboard;