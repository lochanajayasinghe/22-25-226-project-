// import React, { useState } from 'react';
// import { ClipboardList, Calendar, Clock, Save, RotateCcw, Activity } from 'lucide-react';
// import styles from './ETU_NurseDailyInput.module.css';

// const ETU_NurseDailyInput = () => {
//   const [loading, setLoading] = useState(false);
//   const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
//   const [shift, setShift] = useState('Day'); 
//   const [data, setData] = useState({ admissions: 0, discharges: 0, transfersOut: 0, deaths: 0 });

//   const updateField = (field, value) => {
//     const numValue = Math.max(0, Number(value) || 0);
//     setData(prev => ({ ...prev, [field]: numValue }));
//   };

//   const handleClear = () => {
//     if(window.confirm("Clear form?")) setData({ admissions: 0, discharges: 0, transfersOut: 0, deaths: 0 });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       // 1. Calculate Occupancy
//       const departures = data.discharges + data.transfersOut + data.deaths;
//       const calculatedOccupancy = Math.max(0, 20 + data.admissions - departures);

//       // 2. FIX THE CRASH HERE: 'long' must be lowercase
//       const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

//       // 3. Prepare Payload
//       const payload = {
//         Date: date,
//         Shift_ID: shift,
//         ETU_Admissions: data.admissions,
//         ETU_Discharges: data.discharges,
//         ETU_OccupiedBeds: calculatedOccupancy,
//         transfersOut: data.transfersOut,       
//         deaths: data.deaths,                   
//         ETU_BedCapacity: 25,
//         Weather: 'Sunny',       
//         SpecialEvent: 'None',
//         IsHoliday: 'No',
//         DayOfWeek: dayName, 
//         PublicTransportStatus: 'Normal',
//         OutbreakAlert: 'No'
//       };

//       console.log("📤 Sending Payload:", payload);

//       // 4. Send to Backend (Port 5001)
//       const response = await fetch('http://localhost:5001/api/add-record', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });

//       if (response.ok) {
//         alert(`✅ Data Saved!`);
//         setData({ admissions: 0, discharges: 0, transfersOut: 0, deaths: 0 }); 
//       } else {
//         const err = await response.json();
//         alert(`❌ Server Error: ${err.error}`);
//       }
//     } catch (error) {
//       console.error("Connection Error:", error);
//       alert(`❌ Connection Failed. Make sure app.py is running on port 5001.`);
//     }
//     setLoading(false);
//   };

//   return (
//     <div className={styles.container}>
//         <div className={styles.header}>
//           <div><h1 className={styles.title}>ETU Shift Data Entry</h1></div>
//           <div className={styles.badge}><ClipboardList size={18} /><span>Manual Entry</span></div>
//         </div>
//         <form onSubmit={handleSubmit} className={styles.formCard}>
//           <div className={styles.controlsGrid}>
//             <div className={styles.controlGroup}>
//               <label className={styles.label}><Calendar size={14} /> Date</label>
//               <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} />
//             </div>
//             <div className={styles.controlGroup}>
//               <label className={styles.label}><Clock size={14} /> Shift</label>
//               <select value={shift} onChange={(e) => setShift(e.target.value)} className={styles.select}>
//                 <option value="Day">Day Shift</option>
//                 <option value="Night">Night Shift</option>
//               </select>
//             </div>
//           </div>
//           <div className={styles.gridInput}>
//             <div className={styles.inputCard}>
//               <label>New Arrivals</label>
//               <input type="number" value={data.admissions} onChange={(e) => updateField('admissions', e.target.value)} className={styles.bigInput} />
//             </div>
//             <div className={styles.inputCard}>
//               <label>Discharges</label>
//               <input type="number" value={data.discharges} onChange={(e) => updateField('discharges', e.target.value)} className={styles.bigInput} />
//             </div>
//             <div className={styles.inputCard}>
//               <label>Transfers</label>
//               <input type="number" value={data.transfersOut} onChange={(e) => updateField('transfersOut', e.target.value)} className={styles.bigInput} />
//             </div>
//             <div className={styles.inputCard}>
//               <label className={styles.dangerLabel}>Deaths</label>
//               <input type="number" value={data.deaths} onChange={(e) => updateField('deaths', e.target.value)} className={`${styles.bigInput} ${styles.dangerInput}`} />
//             </div>
//           </div>
//           <div className={styles.actions}>
//             <button type="button" onClick={handleClear} className={styles.btnGhost}><RotateCcw size={16} /> Clear</button>
//             <button type="submit" className={styles.btnPrimary} disabled={loading}>{loading ? 'Saving...' : 'Submit Data'}</button>
//           </div>
//         </form>
//       </div>
//   );
// };
// export default ETU_NurseDailyInput;


import React, { useState } from 'react';
import { ClipboardList, Calendar, Clock, Save, RotateCcw, Activity } from 'lucide-react';
import styles from './ETU_NurseDailyInput.module.css';

const ETU_NurseDailyInput = () => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState('Day'); 
  const [data, setData] = useState({ admissions: 0, discharges: 0, transfersOut: 0, deaths: 0 });

  const updateField = (field, value) => {
    const numValue = Math.max(0, Number(value) || 0);
    setData(prev => ({ ...prev, [field]: numValue }));
  };

  const handleClear = () => {
    if(window.confirm("Clear form?")) setData({ admissions: 0, discharges: 0, transfersOut: 0, deaths: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Calculate Occupancy
      const departures = data.discharges + data.transfersOut + data.deaths;
      const calculatedOccupancy = Math.max(0, 20 + data.admissions - departures);

      // --- CRITICAL FIX IS HERE ---
      // We changed 'Long' (Capital L) to 'long' (lowercase l).
      // This fixes the "RangeError" crash you saw in the console.
     // MUST BE 'long', NOT 'Long'
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      // 2. Prepare Payload
      const payload = {
        Date: date,
        Shift_ID: shift,
        ETU_Admissions: data.admissions,
        ETU_Discharges: data.discharges,
        ETU_OccupiedBeds: calculatedOccupancy,
        transfersOut: data.transfersOut,       
        deaths: data.deaths,                   
        ETU_BedCapacity: 25,
        Weather: 'Sunny',       
        SpecialEvent: 'None',
        IsHoliday: 'No',
        DayOfWeek: dayName, // Using the fixed variable
        PublicTransportStatus: 'Normal',
        OutbreakAlert: 'No'
      };

      console.log("📤 Sending Payload:", payload);

      // 3. Send to Backend
      // Using 'localhost' matches your browser URL, preventing CORS issues
      const response = await fetch('http://localhost:5001/api/add-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(`✅ Data Saved Successfully!`);
        setData({ admissions: 0, discharges: 0, transfersOut: 0, deaths: 0 }); 
      } else {
        const err = await response.json();
        alert(`❌ Server Error: ${err.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`❌ Connection Failed. Check console (F12) for details.`);
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
        <div className={styles.header}>
          <div><h1 className={styles.title}>ETU Shift Data Entry</h1></div>
          <div className={styles.badge}><ClipboardList size={18} /><span>Manual Entry</span></div>
        </div>
        <form onSubmit={handleSubmit} className={styles.formCard}>
          <div className={styles.controlsGrid}>
            <div className={styles.controlGroup}>
              <label className={styles.label}><Calendar size={14} /> Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.controlGroup}>
              <label className={styles.label}><Clock size={14} /> Shift</label>
              <select value={shift} onChange={(e) => setShift(e.target.value)} className={styles.select}>
                <option value="Day">Day Shift</option>
                <option value="Night">Night Shift</option>
              </select>
            </div>
          </div>
          <div className={styles.gridInput}>
            <div className={styles.inputCard}>
              <label>New Arrivals</label>
              <input type="number" value={data.admissions} onChange={(e) => updateField('admissions', e.target.value)} className={styles.bigInput} />
            </div>
            <div className={styles.inputCard}>
              <label>Discharges</label>
              <input type="number" value={data.discharges} onChange={(e) => updateField('discharges', e.target.value)} className={styles.bigInput} />
            </div>
            <div className={styles.inputCard}>
              <label>Transfers</label>
              <input type="number" value={data.transfersOut} onChange={(e) => updateField('transfersOut', e.target.value)} className={styles.bigInput} />
            </div>
            <div className={styles.inputCard}>
              <label className={styles.dangerLabel}>Deaths</label>
              <input type="number" value={data.deaths} onChange={(e) => updateField('deaths', e.target.value)} className={`${styles.bigInput} ${styles.dangerInput}`} />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>{loading ? 'Saving...' : 'Submit Data'}</button>
          </div>
        </form>
      </div>
  );
};
export default ETU_NurseDailyInput;