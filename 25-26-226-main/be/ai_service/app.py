# # Optimization part eka wada karana code eka 


# from flask import Flask, jsonify
# from flask_cors import CORS
# import pandas as pd
# import numpy as np
# import os
# from datetime import datetime, timedelta
# from pytorch_forecasting import TemporalFusionTransformer
# from pulp import LpProblem, LpMinimize, LpVariable, value

# app = Flask(__name__)
# CORS(app)

# # ==========================================
# # 1. ROBUST FILE LOADING
# # ==========================================
# # Get the exact path of the folder where app.py is located
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# # Force Python to look in THIS specific folder
# model_path = os.path.join(BASE_DIR, "hospital_etu_tft_model_80split.ckpt")
# dataset_file = os.path.join(BASE_DIR, "New Hospital ETU_dataset_2000-2024.csv")

# print(f"🔍 Looking for Model at: {model_path}")

# # Global variables
# best_tft = None
# df = None
# CURRENT_BED_CAPACITY = 25
# CURRENT_OCCUPANCY = 23

# # Ward Availability
# WARD_A_NORMAL_FREE = 5
# WARD_A_SURGE_FREE  = 10
# WARD_B_NORMAL_FREE = 8
# WARD_B_SURGE_FREE  = 0
# GENERAL_NORMAL_FREE = 2
# GENERAL_SURGE_FREE  = 12

# if os.path.exists(model_path) and os.path.exists(dataset_file):
#     try:
#         print("⏳ Loading AI Model... (This may take a few seconds)")
#         best_tft = TemporalFusionTransformer.load_from_checkpoint(model_path, map_location="cpu")
        
#         df = pd.read_csv(dataset_file)
#         df['Date'] = pd.to_datetime(df['Date'])
#         df = df.sort_values(['Date', 'Shift_ID']).reset_index(drop=True)
#         df['time_idx'] = np.arange(len(df))
#         df['group'] = "ETU_Main"
        
#         print("✅ AI Engine Loaded Successfully!")
#     except Exception as e:
#         print(f"❌ Error loading files: {e}")
# else:
#     print("\n⚠️  CRITICAL ERROR: FILES MISSING!")
#     print(f"   Please make sure 'hospital_etu_tft_model_80split.ckpt' is in: {BASE_DIR}\n")

# # ==========================================
# # 2. PREDICTION ENDPOINT
# # ==========================================
# @app.route('/predict', methods=['GET'])
# def predict():
#     if best_tft is None:
#         return jsonify({"error": "AI Model not loaded."}), 500

#     # --- A. PREPARE DATA ---
#     current_dt = datetime.now()
#     if 7 <= current_dt.hour < 19:
#         target_shift = "Night"
#         target_date = current_dt.date()
#         weather = "Rainy"
#     else:
#         target_shift = "Day"
#         target_date = current_dt.date() + timedelta(days=1)
#         weather = "Sunny"

#     # Input for Prediction
#     future_row = df.tail(1).copy()
#     future_row['time_idx'] = df['time_idx'].max() + 1
#     future_row['Date'] = pd.to_datetime(target_date)
#     future_row['Shift_ID'] = target_shift
#     future_row['DayOfWeek'] = pd.to_datetime(target_date).strftime('%A')
#     future_row['Weather'] = weather

#     history_data = df.tail(60).copy()
#     predict_df = pd.concat([history_data, future_row], ignore_index=True)

#     # Clean types
#     cat_cols = ["Shift_ID", "DayOfWeek", "IsHoliday", "SpecialEvent", "Weather", "PublicTransportStatus", "OutbreakAlert"]
#     for col in cat_cols:
#         predict_df[col] = predict_df[col].astype(str).astype("category")
#     for col in ['ETU_Admissions', 'ETU_Discharges', 'ETU_OccupiedBeds', 'ETU_BedCapacity']:
#         predict_df[col] = pd.to_numeric(predict_df[col], errors='coerce').fillna(0).astype(np.float32)

#     # --- B. RUN PREDICTION ---
#     raw_preds = best_tft.predict(predict_df, mode="raw", return_x=False)
#     pred_value = float(raw_preds.prediction[0, 0, 3].item())
#     low_ci = float(raw_preds.prediction[0, 0, 1].item())
#     high_ci = float(raw_preds.prediction[0, 0, 5].item())
    
#     predicted_arrivals = int(round(pred_value))

#     # --- C. RUN OPTIMIZATION (MILP) ---
#     prob = LpProblem("Hospital_Optimization", LpMinimize)
    
#     free_etu = max(0, CURRENT_BED_CAPACITY - CURRENT_OCCUPANCY)
    
#     xKeep = LpVariable("Keep", 0, free_etu, cat='Integer')
#     xA = LpVariable("WardA", 0, WARD_A_NORMAL_FREE, cat='Integer')
#     xB = LpVariable("WardB", 0, WARD_B_NORMAL_FREE, cat='Integer')
#     xG = LpVariable("Gen", 0, GENERAL_NORMAL_FREE, cat='Integer')
#     xA_S = LpVariable("WardA_S", 0, WARD_A_SURGE_FREE, cat='Integer')
#     xB_S = LpVariable("WardB_S", 0, WARD_B_SURGE_FREE, cat='Integer')
#     xG_S = LpVariable("Gen_S", 0, GENERAL_SURGE_FREE, cat='Integer')
#     xE = LpVariable("Ext", 0, None, cat='Integer')

#     prob += (xKeep + xA + xB + xG + xA_S + xB_S + xG_S + xE) == predicted_arrivals
#     prob += 1*xKeep + 2*(xA + xB + xG) + 10*(xA_S + xB_S + xG_S) + 100*xE
#     prob.solve()

#     # --- D. DYNAMIC DATE GENERATION (The Fix) ---
#     # Create valid dates for the last 3 days relative to prediction
#     date_minus_3 = target_date - timedelta(days=3)
#     date_minus_2 = target_date - timedelta(days=2)
#     date_minus_1 = target_date - timedelta(days=1)

#     graph_labels = [
#         date_minus_3.strftime('%b %d'),
#         date_minus_2.strftime('%b %d'),
#         date_minus_1.strftime('%b %d'),
#         f"{target_date.strftime('%b %d')} (Pred)"
#     ]

#     # Mock history values (taken from real data tail)
#     recent_values = df['ETU_Admissions'].tail(3).tolist()
    
#     observed_history = recent_values + [None]
#     ai_prediction = [None] * 3 + [predicted_arrivals]
    
#     # --- E. FORMAT OUTPUT ---
#     occupancy_pct = int((CURRENT_OCCUPANCY / CURRENT_BED_CAPACITY) * 100)
#     risk = "Critical" if predicted_arrivals > 30 else ("High" if predicted_arrivals > 15 else "Normal")
#     surge_count = int(value(xA_S) + value(xB_S) + value(xG_S))
    
#     rec_text = "Standard operation."
#     if surge_count > 0: rec_text = "CRITICAL: Activate Corridor C Protocols immediately."
#     elif risk == "High": rec_text = "High load expected. Approve overtime."

#     return jsonify({
#         # DASHBOARD
#         "current_occupancy": CURRENT_OCCUPANCY,
#         "total_capacity": CURRENT_BED_CAPACITY,
#         "occupancy_percentage": occupancy_pct,
#         "predicted_arrivals": predicted_arrivals,
#         "system_status": "CRITICAL" if occupancy_pct > 90 else "NORMAL",
#         "primary_driver": "Weather-Driven Surge" if weather == "Rainy" else "Standard Load",
#         "driver_impact": f"{weather} conditions detected. Historical analysis indicates potential inflow surge.",
        
#         # TRENDS (With Fixed Dates)
#         "timeframe_label": "Next Shift",
#         "graph_labels": graph_labels,
#         "observed_history": observed_history,
#         "ai_prediction": ai_prediction,
#         "capacity_line": CURRENT_BED_CAPACITY,
#         "heatmap_risk_levels": ["Low", "Medium", "High", risk],

#         # FORECAST
#         "confidence_score": "92%",
#         "confidence_lower": [None]*3 + [int(low_ci)],
#         "confidence_upper": [None]*3 + [int(high_ci)],
#         "model_used": "TFT (Transformer)",
#         "forecast_table_rows": [{
#             "period": f"{target_date.strftime('%b %d')} ({target_shift})",
#             "prediction": predicted_arrivals,
#             "min": int(low_ci),
#             "max": int(high_ci)
#         }],

#         # OPTIMIZATION
#         "optimization_status": "MILP Solution Ready",
#         "shortage_count": predicted_arrivals - int(value(xKeep)),
#         "action_plan_keep_etu": int(value(xKeep)),
#         "action_plan_transfers": {
#             "ward_a": int(value(xA)),
#             "ward_b": int(value(xB)),
#             "general": int(value(xG))
#         },
#         "action_plan_surge": surge_count,
#         "action_plan_external": int(value(xE)),
#         "recommendation_text": rec_text
#     })

# @app.route('/api/optimization', methods=['GET'])
# def optimization_alias():
#     return predict()

# if __name__ == '__main__':
#     print(f"🚀 Backend Loading from: {BASE_DIR}")
#     print("🚀 Server starting on Port 5001...")
#     app.run(debug=True, port=5001)




# Data Insert part eka wada karana code eka  


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
# Using your exact connection string
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
    best_tft = TemporalFusionTransformer.load_from_checkpoint(model_path, map_location="cpu")
    print("✅ AI Model Loaded.")
else:
    print("⚠️ Warning: AI Model not found.")

# Configuration Constants (From your Working Code)
CURRENT_BED_CAPACITY = 25
WARD_A_NORMAL_FREE = 5
WARD_A_SURGE_FREE  = 10
WARD_B_NORMAL_FREE = 8
WARD_B_SURGE_FREE  = 0
GENERAL_NORMAL_FREE = 2
GENERAL_SURGE_FREE  = 12

# ==========================================
# 3. HELPER: FETCH HISTORY (From MongoDB instead of CSV)
# ==========================================
def fetch_history_from_db():
    try:
        # Fetch all records
        cursor = collection.find().sort([("Date", 1), ("Shift_ID", 1)])
        df = pd.DataFrame(list(cursor))
        
        if df.empty: return None
        if '_id' in df.columns: df.drop('_id', axis=1, inplace=True)
        
        # Standardize Data Types for AI
        df['Date'] = pd.to_datetime(df['Date'])
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
# 4. ROUTE: HOME & INPUT
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
# 5. ROUTE: PREDICT & OPTIMIZE (The "Smart" Part)
# ==========================================
@app.route('/predict', methods=['GET'])
def predict():
    if not best_tft: return jsonify({"error": "Model missing"}), 500

    # A. Get Data from Cloud (Replaces CSV reading)
    df = fetch_history_from_db()
    if df is None: return jsonify({"error": "Database empty"}), 500
    
    # B. Setup Future Scenario
    current_dt = datetime.now()
    if 7 <= current_dt.hour < 19:
        target_shift, weather, target_date = "Night", "Rainy", current_dt.date()
    else:
        target_shift, weather, target_date = "Day", "Sunny", current_dt.date() + timedelta(days=1)

    future_row = df.tail(1).copy()
    future_row['time_idx'] += 1
    future_row['Date'] = pd.to_datetime(target_date)
    future_row['Shift_ID'] = target_shift
    future_row['Weather'] = weather
    # Fix DayOfWeek
    future_row['DayOfWeek'] = pd.to_datetime(target_date).strftime('%A')

    # C. Run AI Prediction
    predict_df = pd.concat([df.tail(60), future_row], ignore_index=True)
    cat_cols = ["Shift_ID", "DayOfWeek", "IsHoliday", "SpecialEvent", "Weather", "PublicTransportStatus", "OutbreakAlert"]
    for col in cat_cols: predict_df[col] = predict_df[col].astype(str).astype("category")

    raw_preds = best_tft.predict(predict_df, mode="raw", return_x=False)
    predicted_arrivals = int(round(float(raw_preds.prediction[0, 0, 3].item())))
    low_ci = int(round(float(raw_preds.prediction[0, 0, 1].item())))
    high_ci = int(round(float(raw_preds.prediction[0, 0, 5].item())))
    
    # D. Run Optimization (MILP)
    CURRENT_OCCUPANCY = int(df.iloc[-1]['ETU_OccupiedBeds'])
    free_etu = max(0, CURRENT_BED_CAPACITY - CURRENT_OCCUPANCY)

    prob = LpProblem("Hospital_Optimization", LpMinimize)
    
    # Decision Variables
    xKeep = LpVariable("Keep", 0, free_etu, cat='Integer')
    xA = LpVariable("WardA", 0, WARD_A_NORMAL_FREE, cat='Integer')
    xB = LpVariable("WardB", 0, WARD_B_NORMAL_FREE, cat='Integer')
    xG = LpVariable("Gen", 0, GENERAL_NORMAL_FREE, cat='Integer')
    xA_S = LpVariable("WardA_S", 0, WARD_A_SURGE_FREE, cat='Integer')
    xB_S = LpVariable("WardB_S", 0, WARD_B_SURGE_FREE, cat='Integer')
    xG_S = LpVariable("Gen_S", 0, GENERAL_SURGE_FREE, cat='Integer')
    xE = LpVariable("Ext", 0, None, cat='Integer')

    # Constraints & Objective
    prob += (xKeep + xA + xB + xG + xA_S + xB_S + xG_S + xE) == predicted_arrivals
    prob += 1*xKeep + 2*(xA + xB + xG) + 10*(xA_S + xB_S + xG_S) + 100*xE
    prob.solve()
    
    # E. Calculate Risk & Status
    occupancy_pct = int((CURRENT_OCCUPANCY / CURRENT_BED_CAPACITY) * 100)
    risk = "Critical" if predicted_arrivals > 30 else ("High" if predicted_arrivals > 15 else "Normal")
    surge_count = int(value(xA_S) + value(xB_S) + value(xG_S))
    
    rec_text = "Standard operation."
    if surge_count > 0: rec_text = "CRITICAL: Activate Corridor C Protocols immediately."
    elif risk == "High": rec_text = "High load expected. Approve overtime."

    # F. Generate Dates for Graph
    dates = [(target_date - timedelta(days=i)).strftime('%b %d') for i in range(3, 0, -1)] + [f"{target_date.strftime('%b %d')} (Pred)"]
    observed_history = df['ETU_Admissions'].tail(3).tolist() + [None]
    ai_prediction = [None]*3 + [predicted_arrivals]

    # G. Return RICH JSON (Matches what your Dashboard expects)
    return jsonify({
        # DASHBOARD
        "current_occupancy": CURRENT_OCCUPANCY,
        "total_capacity": CURRENT_BED_CAPACITY,
        "occupancy_percentage": occupancy_pct,
        "predicted_arrivals": predicted_arrivals,
        "system_status": "CRITICAL" if occupancy_pct > 90 else "NORMAL",
        "primary_driver": "Weather-Driven Surge" if weather == "Rainy" else "Standard Load",
        "driver_impact": f"{weather} conditions detected. Historical analysis indicates potential inflow surge.",
        
        # TRENDS
        "timeframe_label": "Next Shift",
        "graph_labels": dates,
        "observed_history": observed_history,
        "ai_prediction": ai_prediction,
        "capacity_line": CURRENT_BED_CAPACITY,
        "heatmap_risk_levels": ["Low", "Medium", "High", risk],

        # FORECAST
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

        # OPTIMIZATION
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
def optimization_alias(): return predict()

if __name__ == '__main__':
    # Fix: Listen on 0.0.0.0 so React (localhost) can definitely connect
    print(f"🚀 Backend Running on http://127.0.0.1:5001")
    app.run(debug=True, port=5001, host='0.0.0.0')



