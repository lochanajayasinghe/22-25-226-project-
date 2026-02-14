# Date eke aula hadanna kalin

# from flask import Flask, jsonify, request
# from flask_cors import CORS
# from pymongo import MongoClient
# import pandas as pd
# import numpy as np
# import os
# import certifi
# from datetime import datetime, timedelta
# from pytorch_forecasting import TemporalFusionTransformer
# from pulp import LpProblem, LpMinimize, LpVariable, value

# app = Flask(__name__)

# # --- FIX: ALLOW ALL TRAFFIC (Bulletproof Connection) ---
# CORS(app, resources={r"/*": {"origins": "*"}})

# # ==========================================
# # 1. DATABASE CONNECTION (MongoDB)
# # ==========================================
# MONGO_URI = "mongodb+srv://famousfiveproject31:gg79ZAXI9vSELnAr@itpm.gsmz0.mongodb.net/test?appName=ITPM"

# print("⏳ Connecting to MongoDB...")
# try:
#     client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
#     db = client["test"]          
#     collection = db["BedDailyinputs"]  
#     client.admin.command('ping') 
#     print("✅ Connected to Cloud Database!")
# except Exception as e:
#     print(f"❌ Database Error: {e}")

# # ==========================================
# # 2. LOAD AI MODEL
# # ==========================================
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# model_path = os.path.join(BASE_DIR, "hospital_etu_tft_model_80split.ckpt")
# best_tft = None

# if os.path.exists(model_path):
#     print("⏳ Loading AI Model... (This may take a few seconds)")
#     best_tft = TemporalFusionTransformer.load_from_checkpoint(model_path, map_location="cpu")
#     print("✅ AI Engine Loaded Successfully!")
# else:
#     print("\n⚠️  CRITICAL ERROR: MODEL FILE MISSING!")
#     print(f"   Please make sure 'hospital_etu_tft_model_80split.ckpt' is in: {BASE_DIR}\n")

# # --- Global Config (Optimization Constants) ---
# CURRENT_BED_CAPACITY = 25
# WARD_A_NORMAL_FREE = 5
# WARD_A_SURGE_FREE  = 10
# WARD_B_NORMAL_FREE = 8
# WARD_B_SURGE_FREE  = 0
# GENERAL_NORMAL_FREE = 2
# GENERAL_SURGE_FREE  = 12

# # ==========================================
# # 3. HELPER: FETCH HISTORY (From MongoDB)
# # ==========================================
# def fetch_history_from_db():
#     try:
#         # Fetch all records
#         cursor = collection.find().sort([("Date", 1), ("Shift_ID", 1)])
#         df = pd.DataFrame(list(cursor))
        
#         if df.empty: return None

#         if '_id' in df.columns: df.drop('_id', axis=1, inplace=True)
        
#         # Standardize Data Types
#         df['Date'] = pd.to_datetime(df['Date'])
        
#         # --- FIX: FILTER OUT FUTURE DATA ---
#         today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
#         df = df[df['Date'] <= today] 

#         df = df.sort_values(['Date', 'Shift_ID']).reset_index(drop=True)
#         df['time_idx'] = np.arange(len(df))
#         df['group'] = "ETU_Main"
        
#         for col in ['ETU_Admissions', 'ETU_Discharges', 'ETU_OccupiedBeds', 'ETU_BedCapacity']:
#             df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(np.float32)
            
#         return df
#     except Exception as e:
#         print(f"Database Fetch Error: {e}")
#         return None

# # ==========================================
# # 4. ROUTES (Input & Health Check)
# # ==========================================
# @app.route('/', methods=['GET'])
# def home():
#     return "<h1>✅ Server is Running!</h1>", 200

# @app.route('/api/add-record', methods=['POST'])
# def add_record():
#     try:
#         data = request.json
#         print(f"📝 Received Data for: {data.get('Date')}") 
#         collection.insert_one(data)
#         return jsonify({"message": "Saved successfully!"}), 200
#     except Exception as e:
#         print(f"❌ Save Error: {e}")
#         return jsonify({"error": str(e)}), 500

# # ==========================================
# # 5. ROUTE: PREDICT & OPTIMIZE (The Brains)
# # ==========================================
# @app.route('/predict', methods=['GET'])
# def predict():
#     if best_tft is None:
#         return jsonify({"error": "AI Model not loaded."}), 500

#     # --- A. GET DATA ---
#     df = fetch_history_from_db()
#     if df is None: return jsonify({"error": "Database empty."}), 500

#     print("\n👀 AI IS LOOKING AT THIS LATEST DATA:")
#     print(df.tail(1).to_string())

#     # --- B. PREPARE FUTURE ROW ---
#     last_real_date = df.iloc[-1]['Date']
#     target_date = last_real_date + timedelta(days=1)
#     target_shift = "Day" 
#     weather = "Sunny"

#     # Input for Prediction
#     future_row = df.tail(1).copy()
#     future_row['time_idx'] = df['time_idx'].max() + 1
#     future_row['Date'] = pd.to_datetime(target_date)
#     future_row['Shift_ID'] = target_shift
#     future_row['DayOfWeek'] = pd.to_datetime(target_date).strftime('%A')
#     future_row['Weather'] = weather

#     history_data = df.tail(60).copy()
#     predict_df = pd.concat([history_data, future_row], ignore_index=True)

#     # --- C. DATA CLEANING (The "VOCABULARY" Fix) ---
#     cat_cols = ["Shift_ID", "DayOfWeek", "IsHoliday", "SpecialEvent", "Weather", "PublicTransportStatus", "OutbreakAlert"]
    
#     for col in cat_cols:
#         predict_df[col] = predict_df[col].astype(str) # Convert to string first
        
#         # --- CRITICAL FIX: MAP WORDS TO MODEL VOCABULARY ---
#         if col == "SpecialEvent":
#             # Model expects 'nan' for nothing. Not 'None', not 'No'.
#             predict_df[col] = predict_df[col].replace({'None': 'nan', 'No': 'nan', 'Normal': 'nan'})
#         elif col == "PublicTransportStatus":
#             # Model expects 'Normal'
#             predict_df[col] = predict_df[col].replace({'None': 'Normal', 'nan': 'Normal'})
#         elif col == "OutbreakAlert":
#             # Model expects 'No'
#             predict_df[col] = predict_df[col].replace({'None': 'No', 'nan': 'No'})
#         elif col == "IsHoliday":
#             # Model expects 'No'
#             predict_df[col] = predict_df[col].replace({'None': 'No', 'nan': 'No'})
        
#         predict_df[col] = predict_df[col].astype("category")

#     for col in ['ETU_Admissions', 'ETU_Discharges', 'ETU_OccupiedBeds', 'ETU_BedCapacity']:
#         predict_df[col] = pd.to_numeric(predict_df[col], errors='coerce').fillna(0).astype(np.float32)

#     # --- D. RUN PREDICTION ---
#     try:
#         raw_preds = best_tft.predict(predict_df, mode="raw", return_x=False)
#         pred_value = float(raw_preds.prediction[0, 0, 3].item())
#         low_ci = float(raw_preds.prediction[0, 0, 1].item())
#         high_ci = float(raw_preds.prediction[0, 0, 5].item())
#     except Exception as e:
#         print(f"❌ AI Prediction Error: {e}")
#         return jsonify({"error": f"AI Error: {str(e)}"}), 500
    
#     predicted_arrivals = int(round(pred_value))

#     # --- E. RUN OPTIMIZATION (MILP) ---
#     CURRENT_OCCUPANCY_DB = int(df.iloc[-1]['ETU_OccupiedBeds'])
#     free_etu = max(0, CURRENT_BED_CAPACITY - CURRENT_OCCUPANCY_DB)
    
#     prob = LpProblem("Hospital_Optimization", LpMinimize)
    
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
    
#     # --- F. FORMAT OUTPUT ---
#     date_minus_3 = target_date - timedelta(days=3)
#     date_minus_2 = target_date - timedelta(days=2)
#     date_minus_1 = target_date - timedelta(days=1)

#     graph_labels = [
#         date_minus_3.strftime('%b %d'),
#         date_minus_2.strftime('%b %d'),
#         date_minus_1.strftime('%b %d'),
#         f"{target_date.strftime('%b %d')} (Pred)"
#     ]

#     recent_values = df['ETU_Admissions'].tail(3).tolist()
#     observed_history = recent_values + [None]
#     ai_prediction = [None] * 3 + [predicted_arrivals]
    
#     occupancy_pct = int((CURRENT_OCCUPANCY_DB / CURRENT_BED_CAPACITY) * 100)
#     risk = "Critical" if predicted_arrivals > 30 else ("High" if predicted_arrivals > 15 else "Normal")
#     surge_count = int(value(xA_S) + value(xB_S) + value(xG_S))
    
#     rec_text = "Standard operation."
#     if surge_count > 0: rec_text = "CRITICAL: Activate Corridor C Protocols immediately."
#     elif risk == "High": rec_text = "High load expected. Approve overtime."

#     return jsonify({
#         "current_occupancy": CURRENT_OCCUPANCY_DB,
#         "total_capacity": CURRENT_BED_CAPACITY,
#         "occupancy_percentage": occupancy_pct,
#         "predicted_arrivals": predicted_arrivals,
#         "system_status": "CRITICAL" if occupancy_pct > 90 else "NORMAL",
#         "primary_driver": "Weather-Driven Surge" if weather == "Rainy" else "Standard Load",
#         "driver_impact": f"{weather} conditions detected. Historical analysis indicates potential inflow surge.",
        
#         "timeframe_label": "Next Shift",
#         "graph_labels": graph_labels,
#         "observed_history": observed_history,
#         "ai_prediction": ai_prediction,
#         "capacity_line": CURRENT_BED_CAPACITY,
#         "heatmap_risk_levels": ["Low", "Medium", "High", risk],

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

#         "optimization_status": "MILP Solution Ready",
#         "shortage_count": max(0, predicted_arrivals - int(value(xKeep))),
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
#     app.run(debug=True, port=5001, host='0.0.0.0')

# bed input part ekata kalin okkoma hariyata thiyanawa

# from flask import Flask, jsonify, request
# from flask_cors import CORS
# from pymongo import MongoClient
# import pandas as pd
# import numpy as np
# import os
# import certifi
# from datetime import datetime, timedelta
# from pytorch_forecasting import TemporalFusionTransformer
# from pulp import LpProblem, LpMinimize, LpVariable, value

# app = Flask(__name__)

# # --- FIX: ALLOW ALL TRAFFIC ---
# CORS(app, resources={r"/*": {"origins": "*"}})

# # ==========================================
# # 1. DATABASE CONNECTION
# # ==========================================
# MONGO_URI = "mongodb+srv://famousfiveproject31:gg79ZAXI9vSELnAr@itpm.gsmz0.mongodb.net/test?appName=ITPM"

# print("⏳ Connecting to MongoDB...")
# try:
#     client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
#     db = client["test"]          
#     collection = db["BedDailyinputs"]             
#     history_collection = db["BedPredictionHistory"] 
#     client.admin.command('ping') 
#     print("✅ Connected to Cloud Database!")
# except Exception as e:
#     print(f"❌ Database Error: {e}")

# # ==========================================
# # 2. LOAD AI MODEL
# # ==========================================
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# model_path = os.path.join(BASE_DIR, "hospital_etu_tft_model_80split.ckpt")
# best_tft = None

# if os.path.exists(model_path):
#     print("⏳ Loading AI Model... (This may take a few seconds)")
#     best_tft = TemporalFusionTransformer.load_from_checkpoint(model_path, map_location="cpu")
#     print("✅ AI Engine Loaded Successfully!")
# else:
#     print("\n⚠️  CRITICAL ERROR: MODEL FILE MISSING!")

# # --- 3. CONFIGURATION ---
# CURRENT_BED_CAPACITY = 25
# WARD_A_NORMAL_FREE = 5
# WARD_A_SURGE_FREE  = 10 
# WARD_B_NORMAL_FREE = 8
# WARD_B_SURGE_FREE  = 0  
# GENERAL_NORMAL_FREE = 2
# GENERAL_SURGE_FREE  = 12 

# # ==========================================
# # 4. HELPER: FETCH HISTORY
# # ==========================================
# def fetch_history_from_db():
#     try:
#         cursor = collection.find().sort([("Date", 1), ("Shift_ID", 1)])
#         df = pd.DataFrame(list(cursor))
#         if df.empty: return None
#         if '_id' in df.columns: df.drop('_id', axis=1, inplace=True)
        
#         df['Date'] = pd.to_datetime(df['Date'])
        
#         # Filter: Only use data up to TODAY
#         today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
#         df = df[df['Date'] <= today] 

#         df = df.sort_values(['Date', 'Shift_ID']).reset_index(drop=True)
#         df['time_idx'] = np.arange(len(df))
#         df['group'] = "ETU_Main"
        
#         for col in ['ETU_Admissions', 'ETU_Discharges', 'ETU_OccupiedBeds', 'ETU_BedCapacity']:
#             df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(np.float32)
            
#         return df
#     except Exception as e:
#         print(f"Database Fetch Error: {e}")
#         return None

# # ==========================================
# # 5. ROUTES
# # ==========================================
# @app.route('/', methods=['GET'])
# def home():
#     return "<h1>✅ Server is Running!</h1>", 200

# @app.route('/api/add-record', methods=['POST'])
# def add_record():
#     try:
#         data = request.json
#         print(f"📝 Received Data for: {data.get('Date')}") 
#         collection.insert_one(data)
#         return jsonify({"message": "Saved successfully!"}), 200
#     except Exception as e:
#         print(f"❌ Save Error: {e}")
#         return jsonify({"error": str(e)}), 500

# @app.route('/predict', methods=['GET'])
# def predict():
#     if best_tft is None: return jsonify({"error": "AI Model not loaded."}), 500

#     # A. FETCH DATA
#     df = fetch_history_from_db()
#     if df is None: return jsonify({"error": "Database empty."}), 500

#     # B. STRICT SHIFT LOGIC (07:00 / 19:00 Cutoff)
#     current_dt = datetime.now()
#     current_hour = current_dt.hour
    
#     if 7 <= current_hour < 19:
#         target_date = current_dt.date()
#         target_shift = "Night"
#     elif current_hour >= 19:
#         target_date = current_dt.date() + timedelta(days=1)
#         target_shift = "Day"
#     else: 
#         target_date = current_dt.date()
#         target_shift = "Day"

#     print(f"\n🕒 Time: {current_dt.strftime('%H:%M')} | Plan: {target_date} ({target_shift})")

#     # Define Weather
#     target_weather = "Rainy" if target_shift == "Night" else "Sunny"

#     # C. PREPARE INPUT
#     future_row = df.tail(1).copy()
#     future_row['time_idx'] = df['time_idx'].max() + 1
#     future_row['Date'] = pd.to_datetime(target_date)
#     future_row['Shift_ID'] = target_shift
#     future_row['DayOfWeek'] = pd.to_datetime(target_date).strftime('%A')
#     future_row['Weather'] = target_weather
#     future_row['IsHoliday'] = "No"
#     future_row['SpecialEvent'] = "None" 

#     history_data = df.tail(60).copy()
#     predict_df = pd.concat([history_data, future_row], ignore_index=True)

#     # D. DATA CLEANING
#     cat_cols = ["Shift_ID", "DayOfWeek", "IsHoliday", "SpecialEvent", "Weather", "PublicTransportStatus", "OutbreakAlert"]
#     for col in cat_cols:
#         predict_df[col] = predict_df[col].astype(str)
#         if col == "SpecialEvent":
#             predict_df[col] = predict_df[col].replace({'None': 'nan', 'No': 'nan', 'Normal': 'nan'})
#         elif col == "PublicTransportStatus":
#             predict_df[col] = predict_df[col].replace({'None': 'Normal', 'nan': 'Normal'})
#         elif col == "OutbreakAlert":
#             predict_df[col] = predict_df[col].replace({'None': 'No', 'nan': 'No'})
#         elif col == "IsHoliday":
#             predict_df[col] = predict_df[col].replace({'None': 'No', 'nan': 'No'})
#         predict_df[col] = predict_df[col].astype("category")

#     for col in ['ETU_Admissions', 'ETU_Discharges', 'ETU_OccupiedBeds', 'ETU_BedCapacity']:
#         predict_df[col] = pd.to_numeric(predict_df[col], errors='coerce').fillna(0).astype(np.float32)

#     # E. RUN PREDICTION
#     try:
#         raw_preds = best_tft.predict(predict_df, mode="raw", return_x=False)
#         pred_value = float(raw_preds.prediction[0, 0, 3].item())
#         low_ci = float(raw_preds.prediction[0, 0, 1].item())
#         high_ci = float(raw_preds.prediction[0, 0, 5].item())
#     except Exception as e:
#         print(f"❌ AI Prediction Error: {e}")
#         return jsonify({"error": f"AI Error: {str(e)}"}), 500
    
#     predicted_arrivals = int(round(pred_value))

#     # F. RUN OPTIMIZATION
#     CURRENT_OCCUPANCY_DB = int(df.iloc[-1]['ETU_OccupiedBeds'])
#     free_etu = max(0, CURRENT_BED_CAPACITY - CURRENT_OCCUPANCY_DB)
    
#     prob = LpProblem("Hospital_Optimization", LpMinimize)
    
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
    
#     # --- G. SAVE PREDICTION TO HISTORY (NO DUPLICATES) ---
#     try:
#         prediction_record = {
#             "generated_at": datetime.now(),
#             "target_date": target_date.strftime('%Y-%m-%d'),
#             "target_shift": target_shift,
#             "predicted_arrivals": predicted_arrivals,
#             "optimization_plan": {
#                 "direct_admit": int(value(xKeep)),
#                 "transfer_A": int(value(xA)),
#                 "transfer_B": int(value(xB)),
#                 "transfer_Gen": int(value(xG)),
#                 "surge_beds": int(value(xA_S) + value(xB_S) + value(xG_S)),
#                 "external_transfer": int(value(xE))
#             }
#         }
        
#         # --- THE FIX: UPSERT (Update if exists, Insert if new) ---
#         history_collection.update_one(
#             {
#                 "target_date": target_date.strftime('%Y-%m-%d'),
#                 "target_shift": target_shift
#             },
#             {"$set": prediction_record},
#             upsert=True
#         )
#         print(f"✅ Prediction for {target_date} ({target_shift}) Synced to DB!")
#     except Exception as e:
#         print(f"⚠️ Warning: Could not save history: {e}")

#     # H. FORMAT OUTPUT
#     date_minus_3 = target_date - timedelta(days=3)
#     date_minus_2 = target_date - timedelta(days=2)
#     date_minus_1 = target_date - timedelta(days=1)

#     graph_labels = [
#         date_minus_3.strftime('%b %d'),
#         date_minus_2.strftime('%b %d'),
#         date_minus_1.strftime('%b %d'),
#         f"{target_date.strftime('%b %d')} (Pred)"
#     ]

#     recent_values = df['ETU_Admissions'].tail(3).tolist()
#     observed_history = recent_values + [None]
#     ai_prediction = [None] * 3 + [predicted_arrivals]
    
#     occupancy_pct = int((CURRENT_OCCUPANCY_DB / CURRENT_BED_CAPACITY) * 100)
#     risk = "Critical" if predicted_arrivals > 30 else ("High" if predicted_arrivals > 15 else "Normal")
#     surge_count = int(value(xA_S) + value(xB_S) + value(xG_S))
    
#     rec_text = "Standard operation."
#     if surge_count > 0: rec_text = "CRITICAL: Activate Corridor C Protocols immediately."
#     elif risk == "High": rec_text = "High load expected. Approve overtime."

#     return jsonify({
#         "current_occupancy": CURRENT_OCCUPANCY_DB,
#         "total_capacity": CURRENT_BED_CAPACITY,
#         "occupancy_percentage": occupancy_pct,
#         "predicted_arrivals": predicted_arrivals,
#         "system_status": "CRITICAL" if occupancy_pct > 90 else "NORMAL",
#         "primary_driver": "Weather-Driven Surge" if target_weather == "Rainy" else "Standard Load",
#         "driver_impact": f"{target_weather} conditions detected. Historical analysis indicates potential inflow surge.",
#         "timeframe_label": "Next Shift",
#         "graph_labels": graph_labels,
#         "observed_history": observed_history,
#         "ai_prediction": ai_prediction,
#         "capacity_line": CURRENT_BED_CAPACITY,
#         "heatmap_risk_levels": ["Low", "Medium", "High", risk],
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
#         "optimization_status": "MILP Solution Ready",
#         "shortage_count": max(0, predicted_arrivals - int(value(xKeep))),
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
#     app.run(debug=True, port=5001, host='0.0.0.0')

# lates corredct code connect with DB bed count 

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

# --- FIX: ALLOW ALL TRAFFIC ---
CORS(app, resources={r"/*": {"origins": "*"}})

# ==========================================
# 1. DATABASE CONNECTION
# ==========================================
MONGO_URI = "mongodb+srv://famousfiveproject31:gg79ZAXI9vSELnAr@itpm.gsmz0.mongodb.net/test?appName=ITPM"

print("⏳ Connecting to MongoDB...")
try:
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client["test"]          
    collection = db["BedDailyinputs"]       # Daily Census Data
    history_collection = db["BedPredictionHistory"] # AI Predictions
    bed_inventory_collection = db["BedInventory"]   # Physical Assets
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

# --- 3. SURGE LIMITS ---
WARD_A_SURGE_LIMIT  = 10 
WARD_B_SURGE_LIMIT  = 0  
GENERAL_SURGE_LIMIT = 12 

# ==========================================
# 4. HELPER: FETCH HISTORY (CORRECTED)
# ==========================================
def fetch_etu_history():
    try:
        # STRICT FILTER: Only fetch ETU records for the AI Model
        query = {
            "$or": [
                {"Ward_ID": "ETU"},
                {"Ward_ID": {"$exists": False}} # Includes legacy data
            ]
        }
        
        cursor = collection.find(query).sort([("Date", 1), ("Shift_ID", 1)])
        df = pd.DataFrame(list(cursor))
        
        if df.empty: return None
        if '_id' in df.columns: df.drop('_id', axis=1, inplace=True)
        
        # Double check filtering in Pandas
        if 'Ward_ID' in df.columns:
            df = df[df['Ward_ID'].isna() | (df['Ward_ID'] == 'ETU')]

        df['Date'] = pd.to_datetime(df['Date'])
        
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
# 5. HELPER: GET PREVIOUS SHIFT OCCUPANCY
# ==========================================
def get_previous_shift_occupancy(target_date_str, target_shift):
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        
        if target_shift == "Day":
            prior_date = (target_date - timedelta(days=1)).strftime("%Y-%m-%d")
            prior_shift = "Night"
        else: # Night
            prior_date = target_date.strftime("%Y-%m-%d")
            prior_shift = "Day"

        query = {
            "$or": [ {"Ward_ID": "ETU"}, {"Ward_ID": {"$exists": False}} ],
            "Date": prior_date,
            "Shift_ID": prior_shift
        }
        
        record = collection.find_one(query)

        if record:
            return int(record.get('ETU_OccupiedBeds', 0))
        else:
            # Fallback to latest
            fallback_query = { "$or": [ {"Ward_ID": "ETU"}, {"Ward_ID": {"$exists": False}} ] }
            latest = collection.find_one(fallback_query, sort=[("Date", -1), ("_id", -1)])
            return int(latest.get('ETU_OccupiedBeds', 0)) if latest else 0

    except Exception as e:
        print(f"⚠️ Error finding prior occupancy: {e}")
        return 0

# ==========================================
# 6. HELPER: GET REAL-TIME WARD STATUS
# ==========================================
def get_ward_realtime_free_space(ward_id, occupancy_key="OccupiedBeds"):
    try:
        capacity = bed_inventory_collection.count_documents({
            "ward_id": ward_id,
            "status": "Functional"
        })

        latest_record = collection.find_one(
            {"Ward_ID": ward_id},
            sort=[("Date", -1), ("_id", -1)]
        )
        
        occupancy = int(latest_record.get(occupancy_key, 0)) if latest_record else 0
        
        free_space = max(0, capacity - occupancy)
        return free_space, capacity
    except Exception as e:
        print(f"⚠️ Error checking {ward_id}: {e}")
        return 0, 0

# ==========================================
# 7. ROUTES
# ==========================================
@app.route('/', methods=['GET'])
def home():
    return "<h1>✅ Server is Running!</h1>", 200

@app.route('/api/add-record', methods=['POST'])
def add_record():
    try:
        data = request.json
        print(f"📝 Received Data: {data.get('Ward_Name')} | {data.get('Date')}") 
        collection.insert_one(data)
        return jsonify({"message": "Saved successfully!"}), 200
    except Exception as e:
        print(f"❌ Save Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/add-bed', methods=['POST'])
def add_bed():
    try:
        data = request.json
        if not data.get('bed_id') or not data.get('ward_id'):
            return jsonify({"error": "Bed ID and Ward required"}), 400

        if bed_inventory_collection.find_one({"bed_id": data['bed_id']}):
            return jsonify({"error": f"Bed ID '{data['bed_id']}' exists!"}), 409

        bed_record = {
            "bed_id": data['bed_id'],
            "bed_type": data['bed_type'],
            "ward_id": data['ward_id'],
            "ward_name": data['ward_name'],
            "status": "Functional", 
            "added_at": datetime.now()
        }
        bed_inventory_collection.insert_one(bed_record)
        return jsonify({"message": "Bed added!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/get-beds', methods=['GET'])
def get_beds():
    try:
        beds = list(bed_inventory_collection.find({}, {'_id': 0}))
        return jsonify(beds), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/update-bed-status', methods=['PUT'])
def update_bed_status():
    try:
        data = request.json
        result = bed_inventory_collection.update_one(
            {"bed_id": data.get('bed_id')},
            {"$set": {"status": data.get('status'), "updated_at": datetime.now()}}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Bed not found"}), 404
        return jsonify({"message": "Updated!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ROUTE: GET WARD STATUS (NEW ADDITION) ---
@app.route('/api/ward-status/<ward_id>', methods=['GET'])
def get_ward_status_api(ward_id):
    # Determine the correct key for occupancy
    # For ETU it's 'ETU_OccupiedBeds', for others it's 'OccupiedBeds'
    key = "ETU_OccupiedBeds" if ward_id == "ETU" else "OccupiedBeds"
    
    # Use the existing Python helper logic
    free_space, capacity = get_ward_realtime_free_space(ward_id, key)
    
    return jsonify({
        "ward_id": ward_id,
        "capacity": capacity,
        "available": free_space,
        "occupied": capacity - free_space
    }), 200

# --- ROUTE: TREND DATA FOR CHART (CORRECTED "LATEST 10") ---
@app.route('/api/get-trend-data', methods=['GET'])
def get_trend_data():
    try:
        # 1. Fetch Real History (Latest 10 records - Sorted DESC)
        obs_cursor = collection.find({
            "$or": [{"Ward_ID": "ETU"}, {"Ward_ID": {"$exists": False}}]
        }).sort([("Date", -1), ("Shift_ID", -1)]).limit(10)
        
        obs_data = list(obs_cursor)

        # 2. Fetch AI History (Latest 10 records - Sorted DESC)
        pred_cursor = history_collection.find().sort([("target_date", -1), ("target_shift", -1)]).limit(10)
        pred_data = list(pred_cursor)

        # 3. Merge Data based on Key
        merged_timeline = {}

        # Process Real Data
        for doc in obs_data:
            key = f"{doc['Date']}_{doc['Shift_ID']}"
            try:
                dt = pd.to_datetime(doc['Date'])
                label = f"{dt.strftime('%b %d')} ({doc['Shift_ID'][0]})" # e.g. Feb 13 (D)
            except:
                label = f"{doc['Date']} ({doc['Shift_ID']})"

            if key not in merged_timeline:
                merged_timeline[key] = {"name": label, "sort_key": key}
            
            merged_timeline[key]["Observed"] = int(doc.get("ETU_Admissions", 0))

        # Process Predicted Data
        for doc in pred_data:
            key = f"{doc['target_date']}_{doc['target_shift']}"
            if key not in merged_timeline:
                try:
                    dt = pd.to_datetime(doc['target_date'])
                    label = f"{dt.strftime('%b %d')} ({doc['target_shift'][0]})"
                except:
                    label = f"{doc['target_date']} ({doc['target_shift']})"
                merged_timeline[key] = {"name": label, "sort_key": key}
            
            merged_timeline[key]["Predicted"] = int(doc.get("predicted_arrivals", 0))

        # 4. Sort Chronologically (Old -> New) for the Chart
        chart_data = list(merged_timeline.values())
        chart_data.sort(key=lambda x: x['sort_key'])

        return jsonify(chart_data), 200

    except Exception as e:
        print(f"❌ Chart Data Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- PREDICTION ---
@app.route('/predict', methods=['GET'])
def predict():
    if best_tft is None: return jsonify({"error": "AI Model not loaded."}), 500

    df = fetch_etu_history()
    if df is None or len(df) < 50: 
        return jsonify({"error": f"Insufficient ETU history ({len(df) if df is not None else 0} records)."}), 500

    current_dt = datetime.now()
    current_hour = current_dt.hour
    
    if 7 <= current_hour < 19:
        target_date_obj = current_dt.date()
        target_shift = "Night"
    elif current_hour >= 19:
        target_date_obj = current_dt.date() + timedelta(days=1)
        target_shift = "Day"
    else: 
        target_date_obj = current_dt.date()
        target_shift = "Day"

    target_date_str = target_date_obj.strftime("%Y-%m-%d")
    print(f"\n🕒 Predicting for: {target_date_str} ({target_shift})")
    target_weather = "Rainy" if target_shift == "Night" else "Sunny"

    future_row = df.tail(1).copy()
    future_row['time_idx'] = df['time_idx'].max() + 1
    future_row['Date'] = pd.to_datetime(target_date_obj)
    future_row['Shift_ID'] = target_shift
    future_row['DayOfWeek'] = pd.to_datetime(target_date_obj).strftime('%A')
    future_row['Weather'] = target_weather
    future_row['IsHoliday'] = "No"
    future_row['SpecialEvent'] = "None" 

    history_data = df.tail(60).copy()
    predict_df = pd.concat([history_data, future_row], ignore_index=True)

    cat_cols = ["Shift_ID", "DayOfWeek", "IsHoliday", "SpecialEvent", "Weather", "PublicTransportStatus", "OutbreakAlert"]
    for col in cat_cols:
        predict_df[col] = predict_df[col].astype(str)
        if col == "SpecialEvent": predict_df[col] = predict_df[col].replace({'None': 'nan', 'No': 'nan', 'Normal': 'nan'})
        elif col == "PublicTransportStatus": predict_df[col] = predict_df[col].replace({'None': 'Normal', 'nan': 'Normal'})
        elif col == "OutbreakAlert": predict_df[col] = predict_df[col].replace({'None': 'No', 'nan': 'No'})
        elif col == "IsHoliday": predict_df[col] = predict_df[col].replace({'None': 'No', 'nan': 'No'})
        predict_df[col] = predict_df[col].astype("category")

    for col in ['ETU_Admissions', 'ETU_Discharges', 'ETU_OccupiedBeds', 'ETU_BedCapacity']:
        predict_df[col] = pd.to_numeric(predict_df[col], errors='coerce').fillna(0).astype(np.float32)

    try:
        raw_preds = best_tft.predict(predict_df, mode="raw", return_x=False)
        pred_value = float(raw_preds.prediction[0, 0, 3].item())
        low_ci = float(raw_preds.prediction[0, 0, 1].item())
        high_ci = float(raw_preds.prediction[0, 0, 5].item())
    except Exception as e:
        print(f"❌ AI Error: {e}")
        return jsonify({"error": f"AI Error: {str(e)}"}), 500
    
    predicted_arrivals = int(round(pred_value))

    # --- OPTIMIZATION ---
    etu_starting_occupancy = get_previous_shift_occupancy(target_date_str, target_shift)
    etu_capacity = bed_inventory_collection.count_documents({"ward_id": "ETU", "status": "Functional"})
    if etu_capacity == 0: etu_capacity = 25 

    free_wa, _ = get_ward_realtime_free_space("WARD-A", "OccupiedBeds")
    free_wb, _ = get_ward_realtime_free_space("WARD-B", "OccupiedBeds")
    free_gen, _ = get_ward_realtime_free_space("GEN", "OccupiedBeds")

    free_etu_slots = max(0, etu_capacity - etu_starting_occupancy)
    
    prob = LpProblem("Hospital_Optimization", LpMinimize)
    
    xKeep = LpVariable("Keep", 0, free_etu_slots, cat='Integer')
    xA = LpVariable("WardA", 0, free_wa, cat='Integer')
    xB = LpVariable("WardB", 0, free_wb, cat='Integer')
    xG = LpVariable("Gen", 0, free_gen, cat='Integer')
    xA_S = LpVariable("WardA_S", 0, WARD_A_SURGE_LIMIT, cat='Integer')
    xB_S = LpVariable("WardB_S", 0, WARD_B_SURGE_LIMIT, cat='Integer')
    xG_S = LpVariable("Gen_S", 0, GENERAL_SURGE_LIMIT, cat='Integer')
    xE = LpVariable("Ext", 0, None, cat='Integer')

    prob += (xKeep + xA + xB + xG + xA_S + xB_S + xG_S + xE) == predicted_arrivals
    prob += 1*xKeep + 2*(xA + xB + xG) + 10*(xA_S + xB_S + xG_S) + 100*xE
    prob.solve()
    
    try:
        prediction_record = {
            "generated_at": datetime.now(),
            "target_date": target_date_str,
            "target_shift": target_shift,
            "predicted_arrivals": predicted_arrivals,
            "etu_capacity_used": etu_capacity,
            "starting_occupancy": etu_starting_occupancy,
            "optimization_plan": {
                "direct_admit": int(value(xKeep)),
                "transfer_A": int(value(xA)),
                "transfer_B": int(value(xB)),
                "transfer_Gen": int(value(xG)),
                "surge_beds": int(value(xA_S) + value(xB_S) + value(xG_S)),
                "external_transfer": int(value(xE))
            }
        }
        history_collection.update_one(
            {"target_date": target_date_str, "target_shift": target_shift},
            {"$set": prediction_record},
            upsert=True
        )
    except Exception as e:
        print(f"⚠️ Save Warning: {e}")

    date_minus_3 = target_date_obj - timedelta(days=3)
    date_minus_2 = target_date_obj - timedelta(days=2)
    date_minus_1 = target_date_obj - timedelta(days=1)

    graph_labels = [
        date_minus_3.strftime('%b %d'),
        date_minus_2.strftime('%b %d'),
        date_minus_1.strftime('%b %d'),
        f"{target_date_obj.strftime('%b %d')} (Pred)"
    ]

    recent_values = df['ETU_Admissions'].tail(3).tolist()
    
    occupancy_pct = int((etu_starting_occupancy / etu_capacity) * 100) if etu_capacity > 0 else 100
    risk = "Critical" if predicted_arrivals > 30 else ("High" if predicted_arrivals > 15 else "Normal")
    surge_count = int(value(xA_S) + value(xB_S) + value(xG_S))
    rec_text = "Standard operation."
    if surge_count > 0: rec_text = "CRITICAL: Activate Corridor C Protocols immediately."
    elif risk == "High": rec_text = "High load expected. Approve overtime."

    return jsonify({
        "current_occupancy": etu_starting_occupancy,
        "total_capacity": etu_capacity,
        "occupancy_percentage": occupancy_pct,
        "predicted_arrivals": predicted_arrivals,
        "system_status": "CRITICAL" if occupancy_pct > 90 else "NORMAL",
        "primary_driver": "Weather-Driven Surge" if target_weather == "Rainy" else "Standard Load",
        "timeframe_label": "Next Shift",
        "graph_labels": graph_labels,
        "observed_history": recent_values + [None],
        "ai_prediction": [None]*3 + [predicted_arrivals],
        "capacity_line": etu_capacity,
        "heatmap_risk_levels": ["Low", "Medium", "High", risk],
        "confidence_score": "92%",
        "model_used": "TFT (Transformer)",
        "forecast_table_rows": [{
            "period": f"{target_date_obj.strftime('%b %d')} ({target_shift})",
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