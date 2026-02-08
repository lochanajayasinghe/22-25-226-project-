import React, { useState, useEffect } from 'react';
import { 
  CloudRain, 
  Sun,
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  BedDouble,
  Calendar,
  Activity
} from 'lucide-react';
import styles from './ETU_BedOptimization.module.css';

const ETU_BedOptimization = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:5001/predict')
      .then(res => res.json())
      .then(jsonData => {
        console.log("Master JSON Received:", jsonData);
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error connecting to AI:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className={styles.container}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh'}}>
        <Activity className="animate-spin" size={48} color="#2563eb" />
        <h3 style={{marginTop: 20, color: '#64748b'}}>Calculating Optimal Bed Allocation...</h3>
      </div>
    </div>
  );

  if (!data) return <div className={styles.container}><h3>⚠️ Backend Offline</h3></div>;

  // --- MAPPING NEW JSON TO UI ---
  const totalTransfers = (data.action_plan_transfers?.ward_a || 0) + 
                         (data.action_plan_transfers?.ward_b || 0) + 
                         (data.action_plan_transfers?.general || 0);

  // Dynamic Icon based on the "Primary Driver" text
  const DriverIcon = data.primary_driver.includes("Rain") ? CloudRain : Sun;

  return (
      <div className={styles.container}>
        
        {/* --- HEADER --- */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Daily Command Sheet</h1>
            <p className={styles.subtitle}>
              <Calendar size={14} style={{display:'inline', marginRight:4}}/> 
              {data.forecast_table_rows?.[0]?.period || "Upcoming Shift"}
            </p>
          </div>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot}></span>
            {data.optimization_status || "AI Ready"}
          </div>
        </div>

        <div className={styles.grid}>
          
          {/* --- LEFT: PREDICTION CONTEXT --- */}
          <section className={styles.forecastCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Forecast Context (TFT Model)</h3>
            </div>
            
            <div className={styles.bigNumberContainer}>
              <span className={styles.label}>Expected Total Patients</span>
              <div className={styles.bigNumber}>{data.predicted_arrivals}</div>
              <span className={styles.subLabel}>vs. {data.total_capacity} Bed Capacity</span>
            </div>

            <div className={styles.driverBox}>
              <h4 className={styles.driverTitle}>Primary Driver Identified:</h4>
              <div className={styles.driverContent}>
                <DriverIcon size={24} className={styles.driverIcon} />
                <span>{data.primary_driver}</span>
              </div>
              <p className={styles.driverDesc}>{data.driver_impact}</p>
            </div>

            <div className={styles.confidenceBox}>
              AI Confidence: <strong>{data.confidence_score}</strong>
            </div>
          </section>

          {/* --- RIGHT: OPTIMIZATION PLAN --- */}
          <section className={styles.actionCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recommended Action Plan (MILP)</h3>
            </div>

            <div className={styles.planList}>
              
              {/* 1. KEEP IN ETU (Green) */}
              <div className={styles.planItem}>
                <div className={styles.planIconGreen}>
                  <BedDouble size={20} />
                </div>
                <div className={styles.planDetails}>
                  <h4>1. Keep in ETU</h4>
                  <p>Retain stable patients for observation.</p>
                </div>
                <div className={styles.planCountGreen}>{data.action_plan_keep_etu}</div>
              </div>

              {/* 2. TRANSFERS (Blue) */}
              <div className={styles.planItem}>
                <div className={styles.planIconBlue}>
                  <ArrowRight size={20} />
                </div>
                <div className={styles.planDetails}>
                  <h4>2. Internal Transfers</h4>
                  <p>Move to Wards (Confirmed Availability)</p>
                  <ul className={styles.transferList}>
                    {data.action_plan_transfers?.ward_a > 0 && <li><span>Ward A (Medical)</span><strong>{data.action_plan_transfers.ward_a.toString().padStart(2,'0')}</strong></li>}
                    {data.action_plan_transfers?.ward_b > 0 && <li><span>Ward B (Surgical)</span><strong>{data.action_plan_transfers.ward_b.toString().padStart(2,'0')}</strong></li>}
                    {data.action_plan_transfers?.general > 0 && <li><span>General Ward</span><strong>{data.action_plan_transfers.general.toString().padStart(2,'0')}</strong></li>}
                  </ul>
                </div>
                <div className={styles.planCountBlue}>{totalTransfers}</div>
              </div>

              {/* 3. SURGE (Red or Gray) */}
              {data.action_plan_surge > 0 ? (
                <div className={styles.surgeBox}>
                  <div className={styles.surgeHeader}>
                    <AlertTriangle size={20} />
                    <h4>3. CRITICAL: Open Surge Beds</h4>
                  </div>
                  <div className={styles.surgeContent}>
                    <p>Activate Corridor C Protocols.</p>
                    <div className={styles.surgeCount}>{data.action_plan_surge.toString().padStart(2, '0')}</div>
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