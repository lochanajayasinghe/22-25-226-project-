import React, { useState, useEffect } from 'react';
import { 
  CloudRain, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  BedDouble,
  Calendar,
  Activity
} from 'lucide-react';
import styles from './ETU_BedOptimization.module.css';

const ETU_BedOptimization = () => {
  const [forecastData, setForecastData] = useState(null);
  const [actionPlan, setActionPlan] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- HELPER 1: EXTRACT NUMBERS FROM YOUR TEXT STRINGS ---
  // Example Input: "Ward A: 5 | Ward B: 8 | General: 2"
  const parseWardString = (str) => {
    if (!str) return { wardA: 0, wardB: 0, general: 0 };
    
    // We use "Regular Expressions" to find the number after each name
    const wardA = str.match(/Ward A: (\d+)/)?.[1] || 0;
    const wardB = str.match(/Ward B: (\d+)/)?.[1] || 0;
    const general = str.match(/General: (\d+)/)?.[1] || 0;
    
    return {
      wardA: parseInt(wardA),
      wardB: parseInt(wardB),
      general: parseInt(general)
    };
  };

  // --- HELPER 2: CALCULATE TOTAL SURGE ---
  // Example Input: "Ward A Surge: 0 | General Surge: 3 | Ward B Surge: 0"
  const parseSurgeString = (str) => {
    if (!str) return 0;
    // Find ALL numbers in the string and add them up
    const matches = str.match(/(\d+)/g); 
    if (!matches) return 0;
    return matches.reduce((sum, val) => sum + parseInt(val), 0);
  };

  // --- MAIN FETCH FUNCTION ---
  useEffect(() => {
    setLoading(true);

    // Fetch from the endpoint that returns the text strings (Port 5001)
    fetch('http://127.0.0.1:5001/predict')
      .then(res => {
        if (!res.ok) throw new Error("Failed to connect to AI Backend");
        return res.json();
      })
      .then(data => {
        console.log("Raw ML Output:", data);

        // 1. GET PREDICTION & SHORTAGE
        const predicted = data.prediction.predicted_arrivals; // e.g., 20
        
        // Extract "18" from "18 patients"
        const shortageStr = data.optimization_plan.total_shortage || "0";
        const shortage = parseInt(shortageStr.match(/(\d+)/)?.[1] || 0);
        
        // Logic: Keep in ETU = Total Prediction - Shortage
        // (e.g., 20 - 18 = 2 people stay in ETU)
        const keepInEtuCount = Math.max(0, predicted - shortage);

        // 2. PARSE THE TEXT STRINGS
        const transfers = parseWardString(data.optimization_plan.action_1_normal_admission);
        const totalSurge = parseSurgeString(data.optimization_plan.action_2_surge_activation);

        // 3. SET DATA FOR UI
        setForecastData({
          date: new Date().toISOString().split('T')[0],
          shift: data.prediction.target_shift || 'Night Shift',
          expectedPatients: predicted,
          capacity: "50", // Standard ETU capacity
          driver: 'Heavy Rainfall Alert', 
          driverIcon: CloudRain,
          confidence: data.prediction.confidence_interval
        });

        setActionPlan({
          keepInETU: keepInEtuCount,
          transfers: [
            { ward: 'Ward A (Medical)', count: transfers.wardA, type: 'Internal' },
            { ward: 'Ward B (Surgical)', count: transfers.wardB, type: 'Internal' },
            { ward: 'General Ward', count: transfers.general, type: 'Internal' }
          ],
          surge: totalSurge,
          external: 0 // Default for now
        });

        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching optimization:", err);
        setError("Could not load ML data. Check if backend is running on port 5001.");
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className={styles.container}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh'}}>
        <Activity className="animate-spin" size={48} color="#2563eb" />
        <h3 style={{marginTop: 20, color: '#64748b'}}>Processing ML Output...</h3>
      </div>
    </div>
  );

  if (error) return (
    <div className={styles.container}>
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'50vh', color:'#ef4444'}}>
            <h3>⚠️ {error}</h3>
        </div>
    </div>
  );

  // Calculate Total Transfers
  const totalTransfers = actionPlan ? actionPlan.transfers.reduce((sum, item) => sum + item.count, 0) : 0;

  return (
      <div className={styles.container}>
        
        {/* --- HEADER --- */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Daily Command Sheet</h1>
            <p className={styles.subtitle}>
              <Calendar size={14} style={{display:'inline', marginRight:4}}/> 
              {forecastData?.date} • {forecastData?.shift}
            </p>
          </div>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot}></span>
            ML Solution Ready
          </div>
        </div>

        <div className={styles.grid}>
          
          {/* --- LEFT PANEL: FORECAST --- */}
          <section className={styles.forecastCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Forecast Context (TFT Model)</h3>
            </div>
            
            <div className={styles.bigNumberContainer}>
              <span className={styles.label}>Expected Total Patients</span>
              <div className={styles.bigNumber}>{forecastData?.expectedPatients}</div>
              <span className={styles.subLabel}>vs. {forecastData?.capacity} Bed Capacity</span>
            </div>

            <div className={styles.driverBox}>
              <h4 className={styles.driverTitle}>Primary Driver Identified:</h4>
              <div className={styles.driverContent}>
                <CloudRain size={24} className={styles.driverIcon} />
                <span>{forecastData?.driver}</span>
              </div>
              <p className={styles.driverDesc}>
                Historical data shows a <strong>35% surge</strong> in admissions during similar weather patterns.
              </p>
            </div>

            <div className={styles.confidenceBox}>
              AI Confidence: <strong>{forecastData?.confidence}</strong>
            </div>
          </section>

          {/* --- RIGHT PANEL: ACTION PLAN --- */}
          <section className={styles.actionCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recommended Action Plan (MILP)</h3>
            </div>

            <div className={styles.planList}>
              
              {/* 1. Retention */}
              <div className={styles.planItem}>
                <div className={styles.planIconGreen}>
                  <BedDouble size={20} />
                </div>
                <div className={styles.planDetails}>
                  <h4>1. Keep in ETU</h4>
                  <p>Retain stable patients for observation.</p>
                </div>
                <div className={styles.planCountGreen}>{actionPlan?.keepInETU}</div>
              </div>

              {/* 2. Transfers */}
              <div className={styles.planItem}>
                <div className={styles.planIconBlue}>
                  <ArrowRight size={20} />
                </div>
                <div className={styles.planDetails}>
                  <h4>2. Internal Transfers</h4>
                  <p>Move to Wards (Confirmed Availability)</p>
                  <ul className={styles.transferList}>
                    {actionPlan?.transfers.map((t, i) => (
                      t.count > 0 && (
                        <li key={i}>
                          <span>{t.ward}</span>
                          <strong>{t.count.toString().padStart(2, '0')}</strong>
                        </li>
                      )
                    ))}
                  </ul>
                </div>
                <div className={styles.planCountBlue}>
                  {totalTransfers}
                </div>
              </div>

              {/* 3. Surge */}
              {actionPlan?.surge > 0 ? (
                <div className={styles.surgeBox}>
                  <div className={styles.surgeHeader}>
                    <AlertTriangle size={20} />
                    <h4>3. CRITICAL: Open Surge Beds</h4>
                  </div>
                  <div className={styles.surgeContent}>
                    <p>Activate Corridor C Protocols.</p>
                    <div className={styles.surgeCount}>{actionPlan.surge.toString().padStart(2, '0')}</div>
                  </div>
                </div>
              ) : (
                <div className={styles.planItem} style={{opacity: 0.5}}>
                    <div className={styles.planIconGreen} style={{background:'#f1f5f9', color:'#94a3b8'}}>
                        <CheckCircle size={20}/>
                    </div>
                    <div className={styles.planDetails}>
                        <h4>3. Surge Capacity</h4>
                        <p>No surge beds required.</p>
                    </div>
                    <div className={styles.planCountGreen} style={{background:'#f1f5f9', color:'#94a3b8'}}>0</div>
                </div>
              )}

            </div>

            <div className={styles.actionFooter}>
              {isApproved ? (
                <button className={styles.btnApproved} disabled>
                  <CheckCircle size={18} /> Plan Activated
                </button>
              ) : (
                <button className={styles.btnApprove} onClick={() => setIsApproved(true)}>
                  Approve Allocation Plan
                </button>
              )}
            </div>
          </section>

        </div>
      </div>
  );
};

export default ETU_BedOptimization;