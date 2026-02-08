import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { AlertTriangle, Activity } from 'lucide-react';
import styles from './ETU_BedTrend.module.css';

const ETU_BedTrend = () => {
  const [timeframe, setTimeframe] = useState('Next Shift');
  const [chartData, setChartData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capacity, setCapacity] = useState(50);

  // --- FETCH REAL DATA FROM PYTHON BACKEND ---
  useEffect(() => {
    setLoading(true);

    // Fetch from your Universal AI Endpoint
    fetch('http://127.0.0.1:5001/predict')
      .then((res) => res.json())
      .then((data) => {
        console.log("Trend Data Received:", data);

        // 1. Setup Capacity Line
        setCapacity(data.capacity_line || 50);

        // 2. Map Backend Lists to Recharts Format
        // Backend sends: labels: ["Dec 30", ...], observed: [16, ...], predicted: [null, ..., 15]
        if (data.graph_labels) {
          const formattedData = data.graph_labels.map((label, index) => {
            return {
              name: label,
              // If observed exists, use it. If not, use predicted.
              // This creates a continuous single line for "Total Volume"
              Total: data.observed_history[index] !== null ? data.observed_history[index] : data.ai_prediction[index],
              // We also keep them separate if you ever want to style them differently (dashed line)
              Observed: data.observed_history[index],
              Predicted: data.ai_prediction[index]
            };
          });
          setChartData(formattedData);

          // 3. Map Backend Risk Levels to Heatmap
          // Backend sends: ["Low", "Medium", "High", "Normal"]
          const risks = data.heatmap_risk_levels || [];
          const heat = data.graph_labels.map((label, index) => ({
             label: label,
             risk: risks[index] || "Low" // Default to Low if missing
          }));
          setHeatmapData(heat);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading trend data:", err);
        setLoading(false);
      });

  }, [timeframe]);

  // Helper for Heatmap Colors
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Critical': return '#ef4444'; // Red
      case 'High': return '#f97316';     // Orange
      case 'Medium': return '#eab308';   // Yellow
      default: return '#22c55e';         // Green (Low/Normal)
    }
  };

  if (loading) return (
    <div className={styles.container}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%'}}>
        <Activity className="animate-spin" size={32} color="#2563eb" />
        <p style={{marginTop:10, color:'#64748b'}}>Loading AI Trends...</p>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>

      {/* --- HEADER --- */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Predicted ETU Patterns</h1>
          <p style={{color: '#64748b', margin: '4px 0 0 0', fontSize: '14px'}}>
            Analyze future risk intensity for roster planning
          </p>
        </div>

        <div className={styles.controls}>
          <label className={styles.label} htmlFor="time-range">Time Range:</label>
          <select 
            id="time-range" 
            className={styles.select} 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option>Next Shift</option>
            <option>Next Day</option>
            {/* Note: Backend currently simulates data. This dropdown won't change data yet, but keeps UI ready. */}
          </select>
        </div>
      </div>

      {/* --- CHART SECTION --- */}
      <section className={styles.card}>
          <div className={styles.centerTitle}>
            <h3 style={{fontSize:16, fontWeight:600, color:'#334155', margin:0}}>
               Total Patient Volume Trend
            </h3>
            <span style={{fontSize:12, color:'#94a3b8'}}>
              (Historical vs. AI Prediction)
            </span>
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6eef6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 11 }} 
                  dy={10} 
                  interval="preserveStartEnd"
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
                <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 6px 18px rgba(2,6,23,0.06)' }}
                    itemStyle={{ color: '#1e293b' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle"/>
                
                {/* Capacity Reference Line */}
                <ReferenceLine y={capacity} label="Max Capacity" stroke="#94a3b8" strokeDasharray="3 3" />

                {/* Main Data Line */}
                <Line 
                  type="monotone" 
                  dataKey="Total" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 6 }}
                  name="Patient Load" 
                  connectNulls={true} // Ensures the line connects even if backend sends separated lists
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* --- HEATMAP SECTION --- */}
        <section className={styles.card}>
          <div className={styles.heatmapHeader}>
            <h4 style={{fontSize:15, fontWeight:600, color:'#334155', margin:0}}>Risk Intensity Heatmap</h4>
            <div className={styles.legend}>
              <span className={styles.legendItem}><span className={styles.dot} style={{background: '#ef4444'}}></span> Critical</span>
              <span className={styles.legendItem}><span className={styles.dot} style={{background: '#f97316'}}></span> High</span>
              <span className={styles.legendItem}><span className={styles.dot} style={{background: '#eab308'}}></span> Medium</span>
              <span className={styles.legendItem}><span className={styles.dot} style={{background: '#22c55e'}}></span> Low</span>
            </div>
          </div>

          <div className={styles.heatmapGrid}>
            {heatmapData.map((item, index) => (
              <div key={index} className={styles.heatItem}>
                <div 
                  className={styles.heatBox} 
                  style={{ backgroundColor: getRiskColor(item.risk) }}
                >
                  {item.risk}
                </div>
                <span className={styles.heatLabel}>{item.label}</span>
              </div>
            ))}
          </div>

          <div className={styles.insightBox}>
            <AlertTriangle size={18} className={styles.alertIcon} />
            <p>
              <strong>AI Recommendation:</strong> 
              {heatmapData.some(h => h.risk === 'Critical') 
                ? ' Critical load forecasted. Activate overflow protocols.' 
                : heatmapData.some(h => h.risk === 'High') 
                ? ' High load expected. Ensure full staff roster.'
                : ' Load is within normal capacity limits.'
              }
            </p>
          </div>
        </section>
    </div>
  );
};

export default ETU_BedTrend;