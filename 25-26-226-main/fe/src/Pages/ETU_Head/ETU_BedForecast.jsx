import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Info, Activity } from 'lucide-react';
import styles from './ETU_BedForecast.module.css';

const ETU_BedForecast = () => {
  // --- STATE ---
  const [timeframe, setTimeframe] = useState('Next Shift');
  const [model, setModel] = useState('TFT (Transformer)'); 
  const [chartData, setChartData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [summary, setSummary] = useState(null); // Stores the prediction number & driver
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA FROM PYTHON BACKEND ---
  useEffect(() => {
    setLoading(true);

    // 1. Call your Universal AI Endpoint
    fetch('http://127.0.0.1:5001/predict')
      .then((res) => res.json())
      .then((data) => {
        console.log("Forecast Data Received:", data);

        // 2. PROCESS CHART DATA
        // Backend sends separate lists. We zip them into one object per X-axis point.
        if (data.graph_labels) {
          const formattedChartData = data.graph_labels.map((label, index) => {
            const low = data.confidence_lower[index];
            const high = data.confidence_upper[index];

            return {
              name: label,
              historical: data.observed_history[index], // Blue Line
              predicted: data.ai_prediction[index],     // Orange Dotted Line
              // Range Area: [min, max]. Only exist if we have prediction bounds.
              range: (low !== null && high !== null) ? [low, high] : null 
            };
          });
          setChartData(formattedChartData);
        }

        // 3. PROCESS TABLE DATA
        // Use the pre-calculated rows from backend
        if (data.forecast_table_rows) {
          setTableData(data.forecast_table_rows);
        }

        // 4. SET SUMMARY TEXT DATA
        setSummary({
            predicted_arrivals: data.predicted_arrivals,
            primary_driver: data.primary_driver
        });

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch forecast:", err);
        setLoading(false);
      });

  }, [timeframe]); // Re-run if timeframe changes (Backend logic can be expanded later)

  if (loading) return (
    <div className={styles.container}>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh'}}>
            <Activity className="animate-spin" size={32} color="#2563eb" />
            <h3 style={{marginTop: 20, color: '#64748b'}}>Generating AI Forecast...</h3>
        </div>
    </div>
  );

  return (
    <div className={styles.container}>
        
        {/* --- HEADER --- */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Total ETU Demand Forecast</h1>
            <p className={styles.subtitle}>AI-Powered prediction for overall unit volume</p>
          </div>

          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <span className={styles.label}>Timeframe:</span>
              <select 
                className={styles.select}
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option>Next Shift</option>
                <option>Next Day</option>
                <option>Next Month</option>
              </select>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.label}>Model:</span>
              <select 
                className={`${styles.select} ${styles.modelSelect}`}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option>TFT (Transformer)</option>
                <option>LSTM</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- MAIN CHART CARD --- */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Total ETU Volume: {timeframe}</h3>
              <span className={styles.cardSub}>
                {timeframe === 'Next Shift' ? 'Shift-by-Shift Analysis' : 
                 timeframe === 'Next Day' ? 'Daily Total Analysis' : 
                 'Monthly Total Analysis'}
              </span>
            </div>
          </div>

          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                  interval="preserveStartEnd" 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }}/>
                
                {/* Confidence Range (Area) */}
                <Area 
                  type="monotone" 
                  dataKey="range" 
                  stroke="none" 
                  fill="url(#colorCi)" 
                  name="Confidence Range"
                />

                {/* Historical Data (Blue Line) */}
                <Line 
                  type="monotone" 
                  dataKey="historical" 
                  stroke="#0ea5e9" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6 }}
                  name="Observed Data" 
                  connectNulls={true}
                />

                {/* Prediction (Orange Dotted Line) */}
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} 
                  name="AI Prediction" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* --- ANALYSIS BOX --- */}
          <div className={styles.analysisBox}>
            <Info className={styles.analysisIcon} size={20} />
            <p>
              <strong>Analysis:</strong> Based on the <strong>{model}</strong> model, the 
              <strong> {timeframe}</strong> prediction indicates a total load of <strong>{summary?.predicted_arrivals}</strong> patients. 
              Prepare for increased intake due to <strong>{summary?.primary_driver}</strong>.
            </p>
          </div>
        </section>

        {/* --- DETAILS TABLE --- */}
        <section className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Forecast Details</h3>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Predicted Total</th>
                  <th>Lower Bound</th>
                  <th>Upper Bound</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr key={index}>
                    <td>{row.period}</td>
                    <td className={styles.bold}>{row.prediction}</td>
                    <td className={styles.subtle}>{row.min}</td>
                    <td className={styles.subtle}>{row.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
    </div>
  );
};

export default ETU_BedForecast;