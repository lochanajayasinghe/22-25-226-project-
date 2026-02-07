from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
from pulp import LpProblem, LpMinimize, LpVariable, value

app = Flask(__name__)
CORS(app)

# --- 1. GLOBAL SETTINGS ---
print("⏳ Initializing Hospital AI Engine...")

# --- 2. HOME ROUTE (To check if server is alive) ---
@app.route('/', methods=['GET'])
def home():
    return "<h1>✅ AI Server is Running!</h1><p>Available endpoints: /predict, /api/optimization</p>"

# --- 3. PREDICTION ENDPOINT (Text Format for Optimization Page) ---
@app.route('/predict', methods=['GET'])
def predict():
    # A. MOCK PREDICTION (Or use real model if loaded)
    incoming_patients = 20
    
    # B. RUN OPTIMIZATION (MILP)
    ETU_CAPACITY = 50
    CURRENT_OCCUPANCY = 40
    
    prob = LpProblem("Hospital_Allocation", LpMinimize)
    
    # Variables
    x_Keep = LpVariable("Keep_in_ETU", 0, (ETU_CAPACITY - CURRENT_OCCUPANCY), cat='Integer') 
    x_WardA = LpVariable("Ward_A", 0, 5, cat='Integer') 
    x_WardB = LpVariable("Ward_B", 0, 6, cat='Integer') 
    x_Gen = LpVariable("General", 0, 2, cat='Integer')  
    x_Surge = LpVariable("Surge", 0, 10, cat='Integer')
    
    # Objective & Constraints
    prob += 1*x_Keep + 2*(x_WardA + x_WardB + x_Gen) + 10*x_Surge
    prob += (x_Keep + x_WardA + x_WardB + x_Gen + x_Surge) == incoming_patients
    prob.solve()

    # Get values
    val_a = int(value(x_WardA))
    val_b = int(value(x_WardB))
    val_gen = int(value(x_Gen))
    val_surge = int(value(x_Surge))
    
    # C. FORMAT OUTPUT AS TEXT STRINGS (This fixes your Frontend Error!)
    text_normal = f"Ward A: {val_a} | Ward B: {val_b} | General: {val_gen}"
    text_surge = f"Ward A Surge: 0 | General Surge: {val_surge} | Ward B Surge: 0"
    
    return jsonify({
        "prediction": {
            "target_shift": "2026-02-08 - NIGHT",
            "predicted_arrivals": incoming_patients,
            "risk_level": "High",
            "confidence_interval": "19 - 21"
        },
        "optimization_plan": {
            "total_shortage": "13 patients",
            "action_1_normal_admission": text_normal,
            "action_2_surge_activation": text_surge,
            "action_3_external_transfer": "Transfer 0 patients."
        },
        "analysis_text": f"Warning: {incoming_patients} new patients expected."
    })

# --- 4. OPTIMIZATION ENDPOINT (JSON Format for other pages) ---
@app.route('/api/optimization', methods=['GET'])
def optimization_api():
    # This keeps your other pages working if they use this route
    return predict()

if __name__ == '__main__':
    print("🚀 Backend Running on Port 5001")
    app.run(debug=True, port=5001)