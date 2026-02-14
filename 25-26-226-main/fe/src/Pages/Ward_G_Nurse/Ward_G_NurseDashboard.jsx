import React, { useState, useEffect } from 'react';
import { CloudRain, AlertTriangle, Thermometer, Wind, BellRing, ArrowRight, Loader } from 'lucide-react';

const Ward_G_NurseDashboard = () => {
  // 1. Local Ward Data State (Static for now)
  const [wardData, setWardData] = useState({
    capacity: 100,
    occupancy: 85,
    discharges: 10,
    deaths: 0
  });

  // 2. AI Optimization Data State
  const [incomingCount, setIncomingCount] = useState(0);
  const [loadingAI, setLoadingAI] = useState(true);

  // 3. External Alerts (Mock Data)
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

  // --- FETCH REAL AI PLAN ---
  useEffect(() => {
    const fetchAIPlan = async () => {
      try {
        setLoadingAI(true);
        // Connect to your Python Backend
        const res = await fetch('http://localhost:5001/predict'); 
        if (res.ok) {
          const data = await res.json();
          // Extract specifically the transfer count for GENERAL WARD
          // Backend sends: "action_plan_transfers": { "general": X, ... }
          if (data.action_plan_transfers) {
            setIncomingCount(data.action_plan_transfers.general || 0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch AI Optimization Plan", err);
      } finally {
        setLoadingAI(false);
      }
    };

    fetchAIPlan();
  }, []);

  // Availability Calculation
  const availableBeds = wardData.capacity - (wardData.occupancy - wardData.discharges);
  
  // Is the incoming load manageable?
  const isCritical = incomingCount > availableBeds;

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '24px auto', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ marginBottom: 32, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: '#1e293b' }}>General Ward Portal</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontWeight: 500 }}>Live Resource Management System</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>

        {/* 1. PRE-PREPARE NOTIFICATION CARD (AI DRIVEN) */}
        <div style={{ 
          background: '#fff', 
          padding: 24, 
          borderRadius: 16, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
          borderLeft: `6px solid ${incomingCount > 0 ? '#f97316' : '#10b981'}`, 
          border: '1px solid #e2e8f0' 
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BellRing size={20} />
              {incomingCount > 0 ? "Incoming Transfer Request" : "Status Normal"}
            </h2>
            
            {incomingCount > 0 && (
              <span style={{ background: '#ffedd5', color: '#c2410c', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                ACTION REQUIRED
              </span>
            )}
          </div>

          {loadingAI ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
              <Loader className="animate-spin" size={24} style={{ margin: '0 auto 8px' }}/>
              Checking ETU Status...
            </div>
          ) : (
            <>
              {incomingCount > 0 ? (
                // --- ACTIVE REQUEST ---
                <div style={{ background: '#fff7ed', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>FROM: ETU (AI OPTIMIZED)</span>
                    <span>ETA: &lt; 30 MINS</span>
                  </p>
                  
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '12px 0' }}>
                    <span style={{ fontSize: 42, fontWeight: 800, color: '#ea580c', lineHeight: 1 }}>{incomingCount}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#9a3412' }}>Patient(s) Allocated</span>
                  </div>
                  
                  <p style={{ margin: 0, fontSize: 13, color: '#c2410c', fontStyle: 'italic' }}>
                    "AI has identified {incomingCount} stable patients suitable for General Ward based on current ETU load."
                  </p>
                </div>
              ) : (
                // --- NO REQUESTS ---
                <div style={{ background: '#ecfdf5', padding: 20, borderRadius: 12, marginBottom: 20, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#047857' }}>No incoming transfers from ETU.</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#059669' }}>Optimization engine is monitoring load.</p>
                </div>
              )}

              {/* ACTION BUTTONS (Only if requests exist) */}
              {incomingCount > 0 && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    disabled={isCritical}
                    style={{ flex: 2, background: !isCritical ? '#059669' : '#94a3b8', color: '#fff', padding: '12px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: !isCritical ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {!isCritical ? 'Prepare Beds' : 'Insufficient Capacity'} <ArrowRight size={16} />
                  </button>
                  <button style={{ flex: 1, border: '2px solid #e2e8f0', padding: '12px', borderRadius: 8, fontWeight: 700, background: '#fff', color: '#64748b', cursor: 'pointer' }}>
                    Deny
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 2. EXTERNAL FACTORS & ALERTS */}
        <div style={{ display: 'grid', gap: 16 }}>
          
          {/* Weather Alert */}
          <div style={{ background: '#eff6ff', padding: 20, borderRadius: 16, border: '1px solid #dbeafe', display: 'flex', alignItems: 'start', gap: 16 }}>
            <div style={{ background: '#3b82f6', padding: 10, borderRadius: 10, color: 'white' }}>
              <CloudRain size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', margin: '0 0 4px 0' }}>Weather Impact</h3>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{alerts.weather.condition}</p>
              <p style={{ fontSize: 13, color: '#3b82f6', marginTop: 4, lineHeight: '1.4' }}>{alerts.weather.impact}</p>
            </div>
          </div>

          {/* Disease Outbreak Alert */}
          <div style={{ background: '#fef2f2', padding: 20, borderRadius: 16, border: '1px solid #fee2e2', display: 'flex', alignItems: 'start', gap: 16 }}>
            <div style={{ background: '#ef4444', padding: 10, borderRadius: 10, color: 'white' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#991b1b', margin: '0 0 4px 0' }}>Outbreak Alert</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#7f1d1d', margin: 0 }}>{alerts.outbreak.disease}</p>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 12, border: '1px solid #fecaca' }}>{alerts.outbreak.status}</span>
              </div>
              <p style={{ fontSize: 13, color: '#b91c1c', marginTop: 4, lineHeight: '1.4' }}>{alerts.outbreak.note}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Ward_G_NurseDashboard;