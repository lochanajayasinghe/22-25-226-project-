import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, ArrowRight, Bed, Activity, Calendar, Clock } from 'lucide-react';

const ETU_BedOptimization = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // --- FETCH DATA FROM BACKEND ---
  const fetchOptimization = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/predict');
      
      if (!response.ok) {
        throw new Error('Server connection failed');
      }

      const result = await response.json();
      setData(result);
      setError(false);
    } catch (err) {
      console.error("Optimization Fetch Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimization();
  }, []);

  // --- RENDERING STATES ---
  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center text-gray-500">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
      <h2 className="text-xl font-semibold">Running MILP Optimization...</h2>
      <p>Calculating best bed allocation strategy.</p>
    </div>
  );

  if (error || !data) return (
    <div className="p-10 flex flex-col items-center justify-center text-red-500 bg-red-50 rounded-xl border border-red-200 m-6">
      <AlertTriangle size={48} className="mb-4" />
      <h2 className="text-2xl font-bold mb-2">Optimization Engine Offline</h2>
      <p className="text-gray-700">Please ensure <b>app_v2.py</b> is running on port <b>5001</b>.</p>
      <button 
        onClick={fetchOptimization}
        className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
      >
        Retry Connection
      </button>
    </div>
  );

  // --- EXTRACT DATE & SHIFT ---
  // The backend sends "Feb 12 (Day)" or similar in forecast_table_rows[0].period
  const forecastPeriod = data.forecast_table_rows?.[0]?.period || "Upcoming Shift";

  // --- MAIN DASHBOARD UI ---
  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      
      {/* HEADER WITH DATE & SHIFT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Daily Command Sheet</h1>
          <div className="flex items-center gap-4 mt-2 text-gray-500">
             <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-md text-sm font-medium">
                <Calendar size={16} className="text-blue-500" />
                {forecastPeriod}
             </div>
             <p className="text-sm">AI-Driven Bed Allocation Strategy</p>
          </div>
        </div>
        
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full flex items-center gap-2 font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          {data.optimization_status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: FORECAST CONTEXT */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-400 font-bold tracking-wider text-sm mb-6 uppercase">Forecast Context (TFT Model)</h3>
          
          <div className="text-center py-8">
            <span className="text-gray-500 text-sm">Expected Total Patients</span>
            <div className="text-6xl font-black text-blue-600 my-2">{data.predicted_arrivals}</div>
            <span className="text-gray-400 text-sm">vs {data.total_capacity} Bed Capacity</span>
          </div>

          <div className={`mt-6 p-4 rounded-xl border-l-4 ${data.system_status === 'CRITICAL' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
            <h4 className={`font-bold ${data.system_status === 'CRITICAL' ? 'text-red-700' : 'text-blue-700'} mb-1`}>
              Primary Driver: {data.primary_driver}
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {data.driver_impact}
            </p>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            AI Confidence: {data.confidence_score}
          </div>
        </div>

        {/* RIGHT COLUMN: OPTIMIZATION PLAN (MILP) */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-gray-400 font-bold tracking-wider text-sm mb-6 uppercase">Recommended Action Plan (MILP)</h3>
          
          <div className="space-y-6">
            
            {/* 1. Keep in ETU */}
            <div className="flex justify-between items-start group">
              <div className="flex gap-4">
                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                  <Bed size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">1. Keep in ETU</h4>
                  <p className="text-sm text-gray-500">Retain stable patients for observation.</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">{data.action_plan_keep_etu}</span>
            </div>

            <hr className="border-dashed border-gray-200" />

            {/* 2. Transfers */}
            <div className="flex justify-between items-start group">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <ArrowRight size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">2. Internal Transfers</h4>
                  <p className="text-sm text-gray-500">Move to Wards (Confirmed Availability)</p>
                  
                  <div className="mt-3 space-y-2 pl-2">
                    <div className="flex justify-between w-48 text-sm">
                      <span className="text-gray-600">Ward A (Medical)</span>
                      <span className="font-bold text-gray-800">{data.action_plan_transfers.ward_a}</span>
                    </div>
                    <div className="flex justify-between w-48 text-sm">
                      <span className="text-gray-600">Ward B (Surgical)</span>
                      <span className="font-bold text-gray-800">{data.action_plan_transfers.ward_b}</span>
                    </div>
                    <div className="flex justify-between w-48 text-sm">
                      <span className="text-gray-600">General Ward</span>
                      <span className="font-bold text-gray-800">{data.action_plan_transfers.general}</span>
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {data.action_plan_transfers.ward_a + data.action_plan_transfers.ward_b + data.action_plan_transfers.general}
              </span>
            </div>

            <hr className="border-dashed border-gray-200" />

            {/* 3. Surge */}
            <div className={`flex justify-between items-start ${data.action_plan_surge > 0 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
              <div className="flex gap-4">
                <div className={`p-2 rounded-lg ${data.action_plan_surge > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">3. Surge Capacity</h4>
                  <p className="text-sm text-gray-500">{data.action_plan_surge > 0 ? "Activate Corridor Protocols" : "No surge beds required."}</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${data.action_plan_surge > 0 ? 'text-red-600' : 'text-gray-400'}`}>{data.action_plan_surge}</span>
            </div>

          </div>

          <button className="w-full mt-8 bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition shadow-lg flex justify-center items-center gap-2">
             <CheckCircle size={20} /> Approve Allocation Plan
          </button>
        </div>

      </div>
    </div>
  );
};

export default ETU_BedOptimization;