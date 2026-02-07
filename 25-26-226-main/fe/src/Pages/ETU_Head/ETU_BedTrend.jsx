import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import styles from './ETU_BedTrend.module.css';

const ETU_BedTrend = () => {
  const [timeframe, setTimeframe] = useState('Next Shift');
  const [chartData, setChartData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FETCH REAL DATA ---
  useEffect(() => {
    setLoading(true);

    // Call your Python Backend
    fetch(`http://127.0.0.1:5001/api/dashboard?timeframe=${timeframe}`)
      .then((res) => res.json())
      .then((data) => {
        const graph = data.graph;
        
        // 1. DEFINE CAPACITY (Based on timeframe scale)
        // (In a real app, this might come from the DB, but we set baselines here)
        let capacityLimit = 50; 
        if (timeframe === 'Next Day') capacityLimit = 100;
        if (timeframe === 'Next Month') capacityLimit = 3000;

        // 2. PROCESS CHART DATA
        // Merge "observed" and "predicted" into one continuous "Total" line
        const formattedData = graph.labels.map((label, index) => {
          const obs = graph.datasets.observed[index];
          const pred = graph.datasets.predicted[index];
          
          // Use observed if available, otherwise use predicted
          const totalVal = obs !== null ? obs : pred;

          return {
            name: label,
            Total: totalVal,
            Capacity: capacityLimit
          };
        });

        setChartData(formattedData);

        // 3. GENERATE HEATMAP (Dynamic Risk Calculation)
        // We look at the data points and decide if they are Critical/High/Low
        const heat = formattedData.map(item => {
          const val = item.Total;
          const cap = item.Capacity;
          
          let riskLevel = 'Low';
          if (val > cap * 1.1) riskLevel = 'Critical';    // > 110% capacity
          else if (val > cap * 0.9) riskLevel = 'High';   // > 90% capacity
          else if (val > cap * 0.7) riskLevel = 'Medium'; // > 70% capacity

          return {
            label: item.name,
            risk: riskLevel
          };
        });

        setHeatmapData(heat);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading trend data:", err);
        setLoading(false);
      });

  }, [timeframe]);

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Critical': return '#ef4444'; 
      case 'High': return '#f97316';     
      case 'Medium': return '#eab308';   
      default: return '#22c55e';         
    }
  };

  if (loading) return (
    <div className={styles.container}>
      <div className="flex h-full items-center justify-center">
        <h3 className="text-gray-500 animate-pulse">Loading Trends...</h3>
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
            <option>Next Month</option>
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
              {timeframe === 'Next Shift' ? '(Shift-by-Shift Breakdown)' : 
               timeframe === 'Next Day' ? '(Daily Total Breakdown)' : 
               '(Monthly Breakdown)'}
            </span>
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 24, left: 12, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6eef6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 12 }} 
                  dy={10} 
                  interval={0}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 6px 18px rgba(2,6,23,0.06)' }} />
                <Legend verticalAlign="top" align="right" />
                
                {/* Total Load Line */}
                <Line 
                  type="monotone" 
                  dataKey="Total" 
                  stroke="#2563eb" 
                  strokeWidth={4} 
                  dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 7 }}
                  name="Total Patient Load" 
                />
                
                {/* Capacity Reference Line */}
                <Line 
                  type="monotone" 
                  dataKey="Capacity" 
                  stroke="#94a3b8" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={false} 
                  name="Safe Capacity Limit" 
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
              <strong>Roster Recommendation:</strong> 
              {heatmapData.some(h => h.risk === 'Critical') 
                ? ' Critical load detected in forecast period. Activate overflow protocols immediately.' 
                : heatmapData.some(h => h.risk === 'High') 
                ? ' High load expected. Consider approving overtime for staff.'
                : ' Operations appear normal. Standard rostering applies.'
              }
            </p>
          </div>
        </section>
    </div>
  );
};

export default ETU_BedTrend;