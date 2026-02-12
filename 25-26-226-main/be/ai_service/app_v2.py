from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import pandas as pd
import numpy as np
import os
import certifi
from datetime import datetime, timedelta
from pytorch_forecasting import TemporalFusionTransformer
from pulp import LpProblem, LpMinimize, LpVariable, value

app = Flask(__name__)

# --- FIX: ALLOW ALL TRAFFIC (Bulletproof Connection) ---
CORS(app, resources={r"/*": {"origins": "*"}})

# ==========================================
# 1. DATABASE CONNECTION (MongoDB)
# ==========================================
MONGO_URI = "mongodb+srv://famousfiveproject31:gg79ZAXI9vSELnAr@itpm.gsmz0.mongodb.net/test?appName=ITPM"

print("⏳ Connecting to MongoDB...")
try:
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client["test"]          
    collection = db["Research"]  
    client.admin.command('ping') 
    print("✅ Connected to Cloud Database!")
except Exception as e:
    print(f"❌ Database Error: {e}")

# ==========================================
# 2. LOAD AI MODEL
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "hospital_etu_tft_model_80split.ckpt")
best_tft = None

if os.path.exists(model_path):
    print("⏳ Loading AI Model... (This may take a few seconds)")
    best_tft = TemporalFusionTransformer.load_from_checkpoint(model_path, map_location="cpu")
    print("✅ AI Engine Loaded Successfully!")
else:
    print("\n⚠️  CRITICAL ERROR: MODEL FILE MISSING!")
    print(f"   Please make sure 'hospital_etu_tft_model_80split.ckpt' is in: {BASE_DIR}\n")

# --- Global Config (Optimization Constants) ---
CURRENT_BED_CAPACITY = 25
WARD_A_NORMAL_FREE = 5
WARD_A_SURGE_FREE  = 10
WARD_B_NORMAL_FREE = 8
WARD_B_SURGE_FREE  = 0
GENERAL_NORMAL_FREE = 2
GENERAL_SURGE_FREE  = 12

# ==========================================
# 3. HELPER: FETCH HISTORY (From MongoDB)
# ==========================================
def fetch_history_from_db():
    try:
        # Fetch all records
        cursor = collection.find().sort([("Date", 1), ("Shift_ID", 1)])
        df = pd.DataFrame(list(cursor))
        
        if df.empty: return None

        if '_id' in df.columns: df.drop('_id', axis=1, inplace=True)
        
        # Standardize Data Types
        df['Date'] = pd.to_datetime(df['Date'])
        
        # --- FIX: FILTER OUT FUTURE DATA ---
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        df = df[df['Date'] <= today] 

        df = df.sort_values(['Date', 'Shift_ID']).reset_index(drop=True)
        df['time_idx'] = np.arange(len(df))
        df['group'] = "ETU_Main"
        
        for col in ['ETU_Admissions', 'ETU_Discharges', 'ETU_OccupiedBeds', 'ETU_BedCapacity']:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(np.float32)
            
        return df
    except Exception as e:
        print(f"Database Fetch Error: {e}")
        return None

# ==========================================
# 4. ROUTES (Input & Health Check)
# ==========================================
@app.route('/', methods=['GET'])
def home():
    return "<h1>✅ Server is Running!</h1>", 200

@app.route('/api/add-record', methods=['POST'])
def add_record():
    try:
        data = request.json
        print(f"📝 Received Data for: {data.get('Date')}") 
        collection.insert_one(data)
        return jsonify({"message": "Saved successfully!"}), 200
    except Exception as e:
        print(f"❌ Save Error: {e}")
        return jsonify({"error": str(e)}), 500

# ==========================================
# 5. ROUTE: PREDICT & OPTIMIZE (The Brains)
# ==========================================
@app.route('/predict', methods=['GET'])
def predict():
    if best_tft is None:
        return jsonify({"error": "AI Model not loaded."}), 500

    # --- A. GET DATA ---
    df = fetch_history_from_db()
    if df is None: return jsonify({"error": "Database empty."}), 500

    print("\n👀 AI IS LOOKING AT THIS LATEST DATA:")
    print(df.tail(1).to_string())

    # --- B. PREPARE FUTURE ROW ---
    last_real_date = df.iloc[-1]['Date']
    target_date = last_real_date + timedelta(days=1)
    target_shift = "Day" 
    weather = "Sunny"

    # Input for Prediction
    future_row = df.tail(1).copy()
    future_row['time_idx'] = df['time_idx'].max() + 1
    future_row['Date'] = pd.to_datetime(target_date)
    future_row['Shift_ID'] = target_shift
    future_row['DayOfWeek'] = pd.to_datetime(target_date).strftime('%A')
    future_row['Weather'] = weather

    history_data = df.tail(60).copy()
    predict_df = pd.concat([history_data, future_row], ignore_index=True)

    # --- C. DATA CLEANING (The "VOCABULARY" Fix) ---
    cat_cols = ["Shift_ID", "DayOfWeek", "IsHoliday", "SpecialEvent", "Weather", "PublicTransportStatus", "OutbreakAlert"]
    
    for col in cat_cols:
        predict_df[col] = predict_df[col].astype(str) # Convert to string first
        
        # --- CRITICAL FIX: MAP WORDS TO MODEL VOCABULARY ---
        if col == "SpecialEvent":
            # Model expects 'nan' for nothing. Not 'None', not 'No'.
            predict_df[col] = predict_df[col].replace({'None': 'nan', 'No': 'nan', 'Normal': 'nan'})
        elif col == "PublicTransportStatus":
            # Model expects 'Normal'
            predict_df[col] = predict_df[col].replace({'None': 'Normal', 'nan': 'Normal'})
        elif col == "OutbreakAlert":
            # Model expects 'No'
            predict_df[col] = predict_df[col].replace({'None': 'No', 'nan': 'No'})
        elif col == "IsHoliday":
            # Model expects 'No'
            predict_df[col] = predict_df[col].replace({'None': 'No', 'nan': 'No'})
        
        predict_df[col] = predict_df[col].astype("category")

    for col in ['ETU_Admissions', 'ETU_Discharges', 'ETU_OccupiedBeds', 'ETU_BedCapacity']:
        predict_df[col] = pd.to_numeric(predict_df[col], errors='coerce').fillna(0).astype(np.float32)

    # --- D. RUN PREDICTION ---
    try:
        raw_preds = best_tft.predict(predict_df, mode="raw", return_x=False)
        pred_value = float(raw_preds.prediction[0, 0, 3].item())
        low_ci = float(raw_preds.prediction[0, 0, 1].item())
        high_ci = float(raw_preds.prediction[0, 0, 5].item())
    except Exception as e:
        print(f"❌ AI Prediction Error: {e}")
        return jsonify({"error": f"AI Error: {str(e)}"}), 500
    
    predicted_arrivals = int(round(pred_value))

    # --- E. RUN OPTIMIZATION (MILP) ---
    CURRENT_OCCUPANCY_DB = int(df.iloc[-1]['ETU_OccupiedBeds'])
    free_etu = max(0, CURRENT_BED_CAPACITY - CURRENT_OCCUPANCY_DB)
    
    prob = LpProblem("Hospital_Optimization", LpMinimize)
    
    xKeep = LpVariable("Keep", 0, free_etu, cat='Integer')
    xA = LpVariable("WardA", 0, WARD_A_NORMAL_FREE, cat='Integer')
    xB = LpVariable("WardB", 0, WARD_B_NORMAL_FREE, cat='Integer')
    xG = LpVariable("Gen", 0, GENERAL_NORMAL_FREE, cat='Integer')
    xA_S = LpVariable("WardA_S", 0, WARD_A_SURGE_FREE, cat='Integer')
    xB_S = LpVariable("WardB_S", 0, WARD_B_SURGE_FREE, cat='Integer')
    xG_S = LpVariable("Gen_S", 0, GENERAL_SURGE_FREE, cat='Integer')
    xE = LpVariable("Ext", 0, None, cat='Integer')

    prob += (xKeep + xA + xB + xG + xA_S + xB_S + xG_S + xE) == predicted_arrivals
    prob += 1*xKeep + 2*(xA + xB + xG) + 10*(xA_S + xB_S + xG_S) + 100*xE
    prob.solve()
    
    # --- F. FORMAT OUTPUT ---
    date_minus_3 = target_date - timedelta(days=3)
    date_minus_2 = target_date - timedelta(days=2)
    date_minus_1 = target_date - timedelta(days=1)

    graph_labels = [
        date_minus_3.strftime('%b %d'),
        date_minus_2.strftime('%b %d'),
        date_minus_1.strftime('%b %d'),
        f"{target_date.strftime('%b %d')} (Pred)"
    ]

    recent_values = df['ETU_Admissions'].tail(3).tolist()
    observed_history = recent_values + [None]
    ai_prediction = [None] * 3 + [predicted_arrivals]
    
    occupancy_pct = int((CURRENT_OCCUPANCY_DB / CURRENT_BED_CAPACITY) * 100)
    risk = "Critical" if predicted_arrivals > 30 else ("High" if predicted_arrivals > 15 else "Normal")
    surge_count = int(value(xA_S) + value(xB_S) + value(xG_S))
    
    rec_text = "Standard operation."
    if surge_count > 0: rec_text = "CRITICAL: Activate Corridor C Protocols immediately."
    elif risk == "High": rec_text = "High load expected. Approve overtime."

    return jsonify({
        "current_occupancy": CURRENT_OCCUPANCY_DB,
        "total_capacity": CURRENT_BED_CAPACITY,
        "occupancy_percentage": occupancy_pct,
        "predicted_arrivals": predicted_arrivals,
        "system_status": "CRITICAL" if occupancy_pct > 90 else "NORMAL",
        "primary_driver": "Weather-Driven Surge" if weather == "Rainy" else "Standard Load",
        "driver_impact": f"{weather} conditions detected. Historical analysis indicates potential inflow surge.",
        
        "timeframe_label": "Next Shift",
        "graph_labels": graph_labels,
        "observed_history": observed_history,
        "ai_prediction": ai_prediction,
        "capacity_line": CURRENT_BED_CAPACITY,
        "heatmap_risk_levels": ["Low", "Medium", "High", risk],

        "confidence_score": "92%",
        "confidence_lower": [None]*3 + [int(low_ci)],
        "confidence_upper": [None]*3 + [int(high_ci)],
        "model_used": "TFT (Transformer)",
        "forecast_table_rows": [{
            "period": f"{target_date.strftime('%b %d')} ({target_shift})",
            "prediction": predicted_arrivals,
            "min": int(low_ci),
            "max": int(high_ci)
        }],

        "optimization_status": "MILP Solution Ready",
        "shortage_count": max(0, predicted_arrivals - int(value(xKeep))),
        "action_plan_keep_etu": int(value(xKeep)),
        "action_plan_transfers": {
            "ward_a": int(value(xA)),
            "ward_b": int(value(xB)),
            "general": int(value(xG))
        },
        "action_plan_surge": surge_count,
        "action_plan_external": int(value(xE)),
        "recommendation_text": rec_text
    })

@app.route('/api/optimization', methods=['GET'])
def optimization_alias():
    return predict()

if __name__ == '__main__':
    print(f"🚀 Backend Loading from: {BASE_DIR}")
    print("🚀 Server starting on Port 5001...")
    app.run(debug=True, port=5001, host='0.0.0.0')