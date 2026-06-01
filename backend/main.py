from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pickle
import pandas as pd
import os
import datetime
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import db_models
import threading
from simulator import start_simulator

from dotenv import load_dotenv
from groq import Groq
import json
import sys
import logging

# Voice router
sys.path.insert(0, os.path.dirname(__file__))
from app.routers.voice import router as voice_router
from auth import router as auth_router

load_dotenv()
try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except Exception as e:
    groq_client = None
    print(f"Warning: Failed to init Groq client: {e}")

# Ensure database tables exist on startup
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Mei Arivu — Smart Waste Intelligence API",
    description=(
        "Backend API for the Mei Arivu Smart Waste platform. "
        "Includes ML-driven bioremediation prediction, geospatial command centre, "
        "pathogen radar, bio-supply inventory, and the Voice Pipeline (Bhashini-ready)."
    ),
    version="1.2.0",
)

@app.on_event("startup")
def startup_event():
    thread = threading.Thread(target=start_simulator, daemon=True)
    thread.start()


# Setup CORS for frontend
app.add_middleware(
CORSMiddleware,
allow_origins=[
"http://localhost:5173",
"http://localhost:3000",
"https://mei-arivu-2-0.vercel.app",
],
allow_credentials=True,
allow_methods=[""],
allow_headers=[""],
)

# Voice pipeline router — /api/voice/*
app.include_router(voice_router, prefix="/api/voice")

# Auth router
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# Load models and encoders with safety checks
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
REQUIRED_MODELS = ["regressor.pkl", "classifier.pkl", "waste_encoder.pkl", "action_encoder.pkl"]

for model_file in REQUIRED_MODELS:
    path = os.path.join(MODEL_DIR, model_file)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Missing model file: {path}. Run 'python generate_mock_data.py' then 'python train_model.py' first."
        )

with open(os.path.join(MODEL_DIR, "regressor.pkl"), "rb") as f:
    regressor = pickle.load(f)
with open(os.path.join(MODEL_DIR, "classifier.pkl"), "rb") as f:
    classifier = pickle.load(f)
with open(os.path.join(MODEL_DIR, "waste_encoder.pkl"), "rb") as f:
    waste_encoder = pickle.load(f)
with open(os.path.join(MODEL_DIR, "action_encoder.pkl"), "rb") as f:
    action_encoder = pickle.load(f)

VALID_WASTE_TYPES = list(waste_encoder.classes_)

class PredictRequest(BaseModel):
    temperature_celsius: float
    moisture_percent: float
    ph_level: float
    carbon_nitrogen_ratio: float
    waste_type: str
    lang: str = "en-US"

class TelemetryIngestRequest(BaseModel):
    site_id: int
    temperature_celsius: float
    moisture_percent: float
    ph_level: float
    carbon_nitrogen_ratio: float
    waste_type: str
    lang: str = "en-US"

class ReorderRequest(BaseModel):
    item_id: int

class AlertRequest(BaseModel):
    site_id: int
    disease: str
    risk_level: str

from typing import List
class DispatchRequest(BaseModel):
    site_ids: List[int]

class InventoryItemCreate(BaseModel):
    name: str
    category: str
    stock: float
    unit: str
    capacity: float
    status: str
    supplier: str
    last_restock: str
    cost_per_unit: str
    reorder_threshold: float

class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    stock: float | None = None
    unit: str | None = None
    capacity: float | None = None
    status: str | None = None
    supplier: str | None = None
    last_restock: str | None = None
    cost_per_unit: str | None = None
    reorder_threshold: float | None = None

class ProfileUpdateRequest(BaseModel):
    name: str
    role: str
    email: str
    phone: str
    department: str
    location: str
    theme: str
    email_notif: bool
    sms_notif: bool
    push_notif: bool
    health_notif: bool

# Local deterministic diagnosis using existing scikit-learn models
def run_local_diagnosis(temp: float, moisture: float, ph: float, cn: float, waste: str):
    """Always works — uses the trained local ML models."""
    try:
        import pandas as pd
        if waste not in VALID_WASTE_TYPES:
            waste = VALID_WASTE_TYPES[0]
        waste_encoded = waste_encoder.transform([waste])[0]
        features = pd.DataFrame([{
            'temperature_celsius': temp,
            'moisture_percent': moisture,
            'ph_level': ph,
            'carbon_nitrogen_ratio': cn,
            'waste_type_encoded': waste_encoded
        }])
        days_pred = int(regressor.predict(features)[0])
        action_pred_encoded = classifier.predict(features)[0]
        action_pred = action_encoder.inverse_transform([action_pred_encoded])[0]
    except Exception:
        days_pred = 28
        action_pred = 'Optimal_No_Action'

    # Build rich step-by-step plan based on action
    action_steps_map = {
        'Add_Sawdust_Carbon': {
            'overall_status': f'High nitrogen levels detected (C:N Ratio: {cn:.1f}). The pile is producing ammonia and needs carbon amendment to restore microbial balance.',
            'steps': [
                {'step_number': 1, 'title': 'Add Carbon Material (Sawdust)', 'description': f'Mix in dry sawdust or wood chips to raise the C:N ratio from {cn:.1f} toward the ideal range of 25–30:1. Use approximately 2–3 kg per 10 kg of wet waste.', 'icon': 'Leaf'},
                {'step_number': 2, 'title': 'Turn the Pile for Aeration', 'description': 'After adding carbon material, thoroughly turn the pile using a fork or loader to distribute the amendment evenly and restore oxygen flow.', 'icon': 'Wind'},
                {'step_number': 3, 'title': 'Monitor Temperature', 'description': f'Current temperature is {temp:.1f}°C. After turning, expect a 2–5°C rise within 24 hours as microbial activity restores. Target 50–65°C for optimal composting.', 'icon': 'Thermometer'},
                {'step_number': 4, 'title': 'Recheck in 48 Hours', 'description': 'Re-sample the pile after 48 hours. The ammonia smell should subside significantly. If not, repeat the carbon addition step.', 'icon': 'CheckCircle'},
            ]
        },
        'Add_Water': {
            'overall_status': f'Critically low moisture detected ({moisture:.1f}%). Microbial decomposition has stalled. The pile requires immediate hydration.',
            'steps': [
                {'step_number': 1, 'title': 'Add Water Gradually', 'description': f'Spray or pour water evenly across the pile surface. Target moisture between 50–60%. Current level is {moisture:.1f}% — apply water in 10-minute intervals to avoid waterlogging.', 'icon': 'Droplets'},
                {'step_number': 2, 'title': 'Turn While Moistening', 'description': 'Use a fork or turning machine to turn the pile as you add water. This ensures uniform moisture distribution through all layers.', 'icon': 'Wind'},
                {'step_number': 3, 'title': 'Check Squeeze Test', 'description': 'Squeeze a handful of compost material. It should feel like a wrung-out sponge — damp but not dripping. Adjust water application accordingly.', 'icon': 'Activity'},
                {'step_number': 4, 'title': 'Monitor Over 24 Hours', 'description': 'Monitor the pile temperature. You should see an increase within 24 hours as the microbial community reactivates with the available moisture.', 'icon': 'Thermometer'},
            ]
        },
        'Add_Bacillus_Enzyme': {
            'overall_status': f'Temperature at {temp:.1f}°C is suboptimal. Microbial activity is sluggish. Enzyme inoculation is required to accelerate decomposition.',
            'steps': [
                {'step_number': 1, 'title': 'Prepare Bacillus Enzyme Solution', 'description': 'Mix Bacillus subtilis enzyme concentrate (available from bio-supply inventory) with water at a 1:50 dilution ratio. Prepare approximately 20 liters per tonne of compost.', 'icon': 'Activity'},
                {'step_number': 2, 'title': 'Apply Enzyme Inoculant', 'description': 'Using a watering can or spray pump, apply the enzyme solution evenly across the pile surface. Ensure the inoculant penetrates at least 30 cm into the pile.', 'icon': 'Droplets'},
                {'step_number': 3, 'title': 'Cover and Insulate the Pile', 'description': 'Cover the pile with a breathable tarp or burlap sacking to retain heat and moisture while still allowing gas exchange. This creates optimal incubation conditions.', 'icon': 'Leaf'},
                {'step_number': 4, 'title': 'Monitor Temperature Rise', 'description': f'Expect temperature to rise from {temp:.1f}°C to 45–55°C within 48–72 hours as the Bacillus enzymes activate cellulose digestion. If no rise occurs, re-apply inoculant.', 'icon': 'Thermometer'},
            ]
        },
        'Turn_Pile_Aeration': {
            'overall_status': f'Anaerobic conditions or overheating detected. Temp: {temp:.1f}°C, Moisture: {moisture:.1f}%. Immediate pile turning is required to prevent methanogenesis.',
            'steps': [
                {'step_number': 1, 'title': 'Immediately Turn the Pile', 'description': f'The pile is showing signs of anaerobic decomposition (high moisture: {moisture:.1f}% or temp: {temp:.1f}°C). Begin turning immediately to restore aerobic conditions.', 'icon': 'Wind'},
                {'step_number': 2, 'title': 'Remove Compacted Layers', 'description': 'Break up any dense, matted, or compacted sections in the pile. These pockets are the source of anaerobic activity and methane production.', 'icon': 'Activity'},
                {'step_number': 3, 'title': 'Adjust Moisture if Needed', 'description': f'Current moisture is {moisture:.1f}%. If above 65%, add dry bulking agents (straw, woodchips) as you turn. Target 50–60% moisture.', 'icon': 'Droplets'},
                {'step_number': 4, 'title': 'Establish Turning Schedule', 'description': 'After the initial emergency turn, establish a regular turning schedule — every 3 days for the next 2 weeks — to prevent recurrence of anaerobic pockets.', 'icon': 'CheckCircle'},
            ]
        },
        'Optimal_No_Action': {
            'overall_status': f'All parameters are within optimal range. Temp: {temp:.1f}°C, Moisture: {moisture:.1f}%, pH: {ph:.1f}, C:N: {cn:.1f}. The microbial consortium is operating at peak efficiency.',
            'steps': [
                {'step_number': 1, 'title': 'Continue Regular Monitoring', 'description': 'Parameters are optimal. Continue standard monitoring every 48–72 hours. Maintain temperature logs and moisture readings.', 'icon': 'CheckCircle'},
                {'step_number': 2, 'title': 'Maintain Turning Schedule', 'description': 'Continue the established turning schedule (every 5–7 days) to maintain aerobic conditions throughout the pile volume.', 'icon': 'Wind'},
                {'step_number': 3, 'title': 'Assess Maturity Indicators', 'description': f'With {days_pred} days remaining, begin assessing compost maturity: dark colour, earthy smell, crumbly texture, and stable temperature below 40°C are key indicators.', 'icon': 'Leaf'},
            ]
        }
    }

    plan = action_steps_map.get(action_pred, action_steps_map['Optimal_No_Action'])
    return {
        'days_to_degrade': days_pred,
        'overall_status': plan['overall_status'],
        'steps': plan['steps']
    }

# Helper to run agentic diagnosis via Groq (with local ML fallback)
def run_agentic_prediction(temp: float, moisture: float, ph: float, cn: float, waste: str, lang: str = "en-US"):
    # Try Groq AI first if key is properly configured
    api_key = os.environ.get("GROQ_API_KEY", "")
    if groq_client and api_key and api_key != "your_groq_api_key_here":
        prompt = f"""You are the Chief Bioremediation AI for the 'Mei Arivu' system.
Analyze the following compost telemetry:
- Temperature: {temp}\u00b0C
- Moisture: {moisture}%
- pH Level: {ph}
- C:N Ratio: {cn}
- Waste Type: {waste}

Provide a step-by-step diagnosis and remediation plan in strictly valid JSON format. Do NOT wrap it in markdown block quotes. Use only these Lucide React icon names for steps: ['Thermometer', 'Droplets', 'Wind', 'Leaf', 'Activity', 'AlertCircle', 'CheckCircle']

CRITICAL LANGUAGE INSTRUCTION:
The user interface language code is "{lang}".
If "{lang}" starts with "ta", translate ALL text values (overall_status, title, description) to pure TAMIL.
If "{lang}" starts with "hi", translate ALL text values (overall_status, title, description) to pure HINDI.
Otherwise, use English.
IMPORTANT: Keep the JSON KEYS in English exactly as specified. Only translate the VALUES.

Required JSON schema:
{{
  "days_to_degrade": int (estimated days remaining),
  "overall_status": "string (a brief summary of the pile's health in the requested language)",
  "steps": [
    {{
      "step_number": int,
      "title": "string (action name in the requested language)",
      "description": "string (detailed instruction in the requested language)",
      "icon": "string (from allowed list)"
    }}
  ]
}}"""
        try:
            completion = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=600,
                response_format={"type": "json_object"}
            )
            response_text = completion.choices[0].message.content
            result = json.loads(response_text)
            if result.get("steps") and len(result["steps"]) > 0:
                return result
        except Exception as e:
            print(f"Groq API call failed, falling back to local ML: {e}")

    # Always fall back to the deterministic local ML model
    return run_local_diagnosis(temp, moisture, ph, cn, waste)

# Helper to calculate site status and risk dynamically
def update_site_status_risk(db: Session, site: db_models.BioremediationSite):
    # Fetch latest log
    latest_log = db.query(db_models.SensorLog).filter(
        db_models.SensorLog.site_id == site.id
    ).order_by(db_models.SensorLog.timestamp.desc()).first()

    if not latest_log:
        return

    # Calculate pathogen risk
    # Severe: moisture > 70% and temp 30-40 sustained for multiple days. Let's inspect latest log
    m = latest_log.moisture_percent
    t = latest_log.temperature_celsius

    if m > 70 and 30 <= t <= 40:
        # Check logs count in last 5 days
        past_5_days = datetime.datetime.utcnow() - datetime.timedelta(days=5)
        recent_logs = db.query(db_models.SensorLog).filter(
            db_models.SensorLog.site_id == site.id,
            db_models.SensorLog.timestamp >= past_5_days
        ).all()
        
        sustained = all(log.moisture_percent > 70 and 30 <= log.temperature_celsius <= 40 for log in recent_logs) if recent_logs else False
        if sustained or len(recent_logs) >= 4:
            site.risk = "Severe"
        else:
            site.risk = "High"
    elif m > 60 and 30 <= t <= 45:
        site.risk = "Moderate"
    else:
        site.risk = "Low"

    # Status determination
    if site.risk == "Severe" or site.piles_count > 30:
        site.status = "Overloaded" if site.piles_count > 30 else "Critical"
    else:
        site.status = "Active"

    db.add(site)
    db.commit()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "models_loaded": True, "valid_waste_types": VALID_WASTE_TYPES}


# ── VOICE CHAT STREAMING ENDPOINT ────────────────────────────────────────────
class ChatStreamRequest(BaseModel):
    message: str
    language: str = "en-US"

LANG_SYSTEM_PROMPTS = {
    "ta-IN": (
        "நீங்கள் மேய் அறிவு செயற்கை நுண்ணறிவு உதவியாளர். "
        "தமிழில் சுருக்கமாக, தெளிவாக பதிலளிக்கவும். "
        "கழிவு மேலாண்மை, கம்போஸ்டிங், உயிர்சீரமைப்பு ஆகியவற்றில் கவனம் செலுத்துங்கள்."
    ),
    "hi-IN": (
        "आप मेई अरिवु AI सहायक हैं। "
        "हिंदी में संक्षिप्त और स्पष्ट उत्तर दें। "
        "अपशिष्ट प्रबंधन, खाद, और जैव उपचार पर ध्यान दें।"
    ),
    "en-US": (
        "You are Mei Arivu, the AI assistant for the Madurai Smart Waste Intelligence Platform. "
        "Give concise, actionable answers about waste management, composting, bioremediation, "
        "and site operations. Be direct and field-worker friendly."
    ),
}

@app.post(
    "/api/chat/stream",
    summary="Stream a conversational AI response (Voice Pipeline)",
    description=(
        "Accepts a natural-language query from the VoiceController frontend component and "
        "streams a Server-Sent Events (SSE) response using the Groq LLaMA-3 model. "
        "The language parameter controls the system prompt language (ta-IN, hi-IN, en-US)."
    ),
    tags=["Voice Pipeline"],
)
async def chat_stream(request: ChatStreamRequest):
    """
    SSE streaming chat for the voice interface.
    Each chunk is sent as: data: <text>\n\n
    Terminated with: data: [DONE]\n\n
    """
    if not groq_client:
        async def _error():
            yield "data: Groq client not configured. Please check GROQ_API_KEY.\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(_error(), media_type="text/event-stream")

    system_prompt = LANG_SYSTEM_PROMPTS.get(request.language, LANG_SYSTEM_PROMPTS["en-US"])

    async def _stream_groq():
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.message},
                ],
                temperature=0.4,
                max_tokens=400,
                stream=True,
            )
            for chunk in completion:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    # Yield each text piece as an SSE event
                    yield f"data: {delta.content}\n\n"
        except Exception as e:
            logger.error("chat/stream error: %s", e)
            yield f"data: Error: {str(e)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        _stream_groq(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

class MentorChatRequest(BaseModel):
    message: str
    lang: str = "ta-IN"   # ta-IN (default) or en-US

@app.post("/api/chat/mentor")
def chat_mentor(request: MentorChatRequest, db: Session = Depends(get_db)):
    # 1. Madurai Command Center
    active_sites_count = db.query(db_models.BioremediationSite).filter(db_models.BioremediationSite.status != 'Closed').count()
    weather_condition = "32°C, Sunny"

    # 2. Telemetry & Diagnostics — most critical windrow
    critical_site = db.query(db_models.BioremediationSite).filter(db_models.BioremediationSite.status == 'Critical').first()
    if not critical_site:
        critical_site = db.query(db_models.BioremediationSite).filter(db_models.BioremediationSite.risk.in_(['Severe', 'High'])).first()
    telemetry_data = "No critical windrow issues detected currently."
    if critical_site:
        latest_log = db.query(db_models.SensorLog).filter(db_models.SensorLog.site_id == critical_site.id).order_by(db_models.SensorLog.timestamp.desc()).first()
        if latest_log:
            telemetry_data = (
                f"Site: {critical_site.name}, "
                f"Temperature: {latest_log.temperature_celsius:.1f}°C, "
                f"Moisture: {latest_log.moisture_percent:.1f}%, "
                f"pH: {latest_log.ph_level:.1f}, "
                f"Risk: {critical_site.risk}"
            )

    # 3. Pathogen Radar (limit to top 5 to avoid token bloat)
    open_alerts = db.query(db_models.PathogenAlertLog).filter(db_models.PathogenAlertLog.status == 'OPEN').limit(5).all()
    threat_alerts = [f"{a.disease} — {a.zone_name} (Risk: {a.risk_level})" for a in open_alerts] if open_alerts else ["No active disease threats detected."]

    # 4. Bio-Supply — items below 20% (limit to top 10)
    inventory = db.query(db_models.InventoryItem).all()
    low_stock = [
        f"{item.name}: {item.stock}/{item.capacity} {item.unit} (Low)"
        for item in inventory if item.capacity > 0 and (item.stock / item.capacity) < 0.2
    ][:10] if inventory else []
    if not low_stock:
        low_stock = ["All items are above 20% capacity."]

    context = {
        "Madurai Command Center": {"Active Sites": active_sites_count, "Weather": weather_condition},
        "Telemetry & Diagnostics": telemetry_data,
        "Pathogen Radar": threat_alerts,
        "Bio-Supply Inventory": low_stock
    }

    is_tamil = request.lang.startswith("ta")
    system_prompt = (
        "You are 'Mei Arivu', the intelligent AI assistant built into the Mei Arivu Smart City Waste Intelligence Platform. "
        "You are NOT called 'Mei BioRA', 'Valtrix', or any other name. Your name is ONLY 'Mei Arivu'. "
        "\n\n"
        "LANGUAGE RULES (CRITICAL — follow strictly): "
        "1. DEFAULT: Always respond in ENGLISH unless the user explicitly writes in another language. "
        "2. If the user types in Tanglish (Tamil words written in English letters like 'enna pandra', 'epdi use pannradhu'), "
        "respond in Tanglish ONLY — use Tamil words written in English letters. NEVER respond in pure Tamil script. "
        "Example: If user says 'telemetry epdi use pannradhu?', reply like 'Telemetry use panna, first temperature value enter pannunga, aprom Analyze button click pannunga.' "
        "3. NEVER generate pure Tamil (Unicode Tamil script) unless the user themselves types in pure Tamil script. "
        "\n\n"
        "YOUR KNOWLEDGE — MEI ARIVU PLATFORM MODULES: "
        "\n"
        "**Module 1: Telemetry & Diagnostics** "
        "Purpose: ML-powered single-pile bioremediation analysis. "
        "How to use: "
        "Step 1: Navigate to the 'Telemetry & Diagnostics' tab from the sidebar. "
        "Step 2: In the input panel, enter the environmental parameters — Temperature (°C), Moisture (%), pH Level, and C:N Ratio. "
        "Step 3: Select the Waste Type from the dropdown (e.g., Food Waste, Agricultural, Mixed). "
        "Step 4: Click the 'Analyze Stack' button. "
        "Step 5: The ML engine will return a Diagnostic Overview showing predicted degradation days, health status, and recommended actions. "
        "\n"
        "**Module 2: Madurai Command Center** "
        "Purpose: City-wide geospatial live feed of all active bioremediation sites in Madurai District. "
        "How to use: "
        "Step 1: Click 'Madurai Command Center' in the sidebar. "
        "Step 2: View the interactive map showing all active bioremediation site locations. "
        "Step 3: Check the top dashboard cards for Total Active Sites, Waste Backlog, Average Degradation %, and Active Alerts. "
        "Step 4: Click on any site marker on the map to view its real-time sensor data. "
        "\n"
        "**Module 3: Pathogen & Vector Radar** "
        "Purpose: Predicts disease vector breeding grounds (Dengue, Malaria) based on waste pile conditions. "
        "How to use: "
        "Step 1: Navigate to 'Pathogen & Vector Radar' from the sidebar. "
        "Step 2: Review the High Risk Zone Registry table showing zones, temperatures, risk levels, and disease threats. "
        "Step 3: Check the Weekly Incident Trend chart for outbreak patterns. "
        "Step 4: Use the 'Alert Madurai Health Department' button to dispatch an emergency anti-larval spraying alert. "
        "\n"
        "**Module 4: Bio-Supply Inventory** "
        "Purpose: Tracks biological supplies and auto-reorders when stock drops below 20%. "
        "How to use: "
        "Step 1: Click 'Bio-Supply Inventory' in the sidebar. "
        "Step 2: View the dashboard showing Total Items, Critical items, Low Stock alerts, and total Inventory Value. "
        "Step 3: Browse the Bio-Supply Chain Registry table listing all materials, categories, stock levels, and suppliers. "
        "Step 4: Items below 20% capacity will show an 'Auto-Reorder' button — click it to trigger automatic procurement. "
        "\n\n"
        "SCOPE RESTRICTION (CRITICAL — NEVER VIOLATE): "
        "You are ONLY allowed to answer questions about: "
        "1. The Mei Arivu platform, its modules, and how to use them. "
        "2. Live operational data (site status, alerts, inventory, telemetry readings). "
        "3. Basic greetings (Hi, Hello, How are you, etc.) — respond briefly and ask how you can help with the platform. "
        "4. Questions about waste management, bioremediation, or smart city operations relevant to this platform. "
        "For ANY other question (recipes, general knowledge, coding, math, personal advice, weather outside Madurai, etc.), "
        "you MUST politely decline by saying: "
        "'I appreciate your curiosity! However, I'm specifically designed to assist with the Mei Arivu platform. "
        "I can help you with Telemetry, Command Center, Pathogen Radar, or Bio-Supply Inventory. What would you like to know?' "
        "NEVER answer off-topic questions. NEVER provide recipes, stories, general trivia, or anything outside the platform scope."
        "\n\n"
        "RESPONSE FORMATTING RULES: "
        "1. Always respond in a professional, clear, and structured manner. "
        "2. Use Markdown formatting: **bold** for emphasis, numbered lists (1. 2. 3.) for steps, bullet points (- ) for features. "
        "3. When explaining how to use a feature, ALWAYS provide a numbered step-by-step guide. "
        "4. Keep answers focused and concise. No filler or rambling. "
        "5. If the user greets you, greet back briefly and ask how you can help with the platform.\n"
        "6. NEVER output raw JSON or code blocks containing JSON to the user. Always convert the information provided in the LIVE JSON CONTEXT into natural conversational language."
    )

    context_str = json.dumps(context, ensure_ascii=False)
    full_prompt = f"{system_prompt}\n\nLIVE JSON CONTEXT (Convert this to natural language, do NOT output JSON):\n{context_str}"

    if not groq_client:
        fallback = "மே அறிவு இப்போது கிடைக்கவில்லை." if is_tamil else "Mei Arivu is not available right now."
        return {"reply": fallback, "lang": request.lang}

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": full_prompt},
                {"role": "user",   "content": request.message},
            ],
            temperature=0.5,
            max_tokens=500,   # Increased for detailed text responses
        )
        reply = completion.choices[0].message.content.strip()
        return {"reply": reply, "lang": request.lang}
    except Exception as e:
        logger.error("chat/mentor error: %s", e)
        err_msg = "மன்னிக்கவும், ஒரு பிழை ஏற்பட்டது." if is_tamil else f"Sorry, an error occurred: {str(e)}"
        return {"reply": err_msg, "lang": request.lang}


# ── ML PREDICTION ENDPOINT ──────────────────────────────────────────────────
@app.post("/api/predict")
def predict(request: PredictRequest):
    try:
        result = run_agentic_prediction(
            request.temperature_celsius,
            request.moisture_percent,
            request.ph_level,
            request.carbon_nitrogen_ratio,
            request.waste_type,
            request.lang
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# ── SITES ENDPOINTS ──────────────────────────────────────────────────────────
@app.get("/api/sites")
def get_sites(db: Session = Depends(get_db)):
    sites = db.query(db_models.BioremediationSite).all()
    result = []
    for site in sites:
        # Get latest sensor log
        latest_log = db.query(db_models.SensorLog).filter(
            db_models.SensorLog.site_id == site.id
        ).order_by(db_models.SensorLog.timestamp.desc()).first()

        log_data = None
        if latest_log:
            # We omit dynamic AI prediction here to prevent latency on GET /sites
            # The frontend TelemetryView will call /api/predict explicitly when selected.
            pred_data = {
                "days_to_degrade": 28,
                "overall_status": "Awaiting Agentic Analysis. Please click Ingest & Analyze.",
                "steps": []
            }
            log_data = {
                "temperature_celsius": latest_log.temperature_celsius,
                "moisture_percent": latest_log.moisture_percent,
                "ph_level": latest_log.ph_level,
                "carbon_nitrogen_ratio": latest_log.carbon_nitrogen_ratio,
                "waste_type": latest_log.waste_type,
                "timestamp": latest_log.timestamp.isoformat(),
                "prediction": pred_data
            }
        
        result.append({
            "id": site.id,
            "name": site.name,
            "lat": str(site.latitude),
            "lng": str(site.longitude),
            "status": site.status,
            "piles": site.piles_count,
            "backlog": site.backlog,
            "risk": site.risk,
            "latest_telemetry": log_data
        })
    return result

@app.get("/api/sites/stats")
def get_sites_stats(db: Session = Depends(get_db)):
    sites = db.query(db_models.BioremediationSite).all()
    
    total_active = len([s for s in sites if s.status != 'Closed'])
    
    # Calculate total backlog
    total_backlog_val = 0.0
    for s in sites:
        try:
            # Parse e.g. "2.3 tonnes"
            val = float(s.backlog.split()[0])
            total_backlog_val += val
        except Exception:
            pass
            
    # Calculate average degradation days using ML prediction on latest telemetry
    degradation_days = []
    for s in sites:
        latest_log = db.query(db_models.SensorLog).filter(
            db_models.SensorLog.site_id == s.id
        ).order_by(db_models.SensorLog.timestamp.desc()).first()
        if latest_log:
            pred_result = run_agentic_prediction(
                latest_log.temperature_celsius,
                latest_log.moisture_percent,
                latest_log.ph_level,
                latest_log.carbon_nitrogen_ratio,
                latest_log.waste_type
            )
            degradation_days.append(pred_result.get("days_to_degrade", 28))
            
    avg_degradation = int(sum(degradation_days) / len(degradation_days)) if degradation_days else 28
    
    active_alerts = len([s for s in sites if s.risk in ['Severe', 'High']])
    
    return {
        "totalActiveSites": str(total_active),
        "wasteBacklog": f"{round(total_backlog_val, 1)} T",
        "avgDegradation": f"{avg_degradation} Days",
        "alertsActive": str(active_alerts)
    }

@app.get("/api/sites/{site_id}/history")
def get_site_history(site_id: int, db: Session = Depends(get_db)):
    # Fetch last 24 logs
    logs = db.query(db_models.SensorLog).filter(
        db_models.SensorLog.site_id == site_id
    ).order_by(db_models.SensorLog.timestamp.desc()).limit(24).all()
    
    result = []
    for log in reversed(logs):
        result.append({
            "timestamp": log.timestamp.isoformat(),
            "time_label": log.timestamp.strftime("%H:%M"),
            "temperature_celsius": log.temperature_celsius,
            "moisture_percent": log.moisture_percent,
            "ph_level": log.ph_level,
            "carbon_nitrogen_ratio": log.carbon_nitrogen_ratio
        })
    return result

@app.post("/api/sites/{site_id}/dispatch")
def dispatch_site_action(site_id: int, db: Session = Depends(get_db)):
    site = db.query(db_models.BioremediationSite).filter(db_models.BioremediationSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    print(f"==================================================")
    print(f"🚛 FIELD TEAM DISPATCHED")
    print(f"Destination: {site.name}")
    print(f"Current Status: {site.status} (Risk: {site.risk})")
    print(f"Action: Emergency remediation & capacity offload")
    print(f"==================================================")
    
    # Simulate status improvement
    site.status = "Active"
    if site.risk == "Severe" or site.risk == "High":
        site.risk = "Moderate"
        
    db.add(site)
    db.commit()
    
    return {"status": "dispatched", "site_name": site.name, "new_risk": site.risk}

# ── TELEMETRY INGESTION ENDPOINT ─────────────────────────────────────────────
@app.post("/api/telemetry/ingest")
def ingest_telemetry(request: TelemetryIngestRequest, db: Session = Depends(get_db)):
    site = db.query(db_models.BioremediationSite).filter(db_models.BioremediationSite.id == request.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    # Add new sensor log
    log = db_models.SensorLog(
        site_id=request.site_id,
        temperature_celsius=request.temperature_celsius,
        moisture_percent=request.moisture_percent,
        ph_level=request.ph_level,
        carbon_nitrogen_ratio=request.carbon_nitrogen_ratio,
        waste_type=request.waste_type
    )
    db.add(log)
    db.commit()
    
    # Recalculate status and risk
    update_site_status_risk(db, site)
    
    # Run agentic prediction on new reading
    result = run_agentic_prediction(
        request.temperature_celsius,
        request.moisture_percent,
        request.ph_level,
        request.carbon_nitrogen_ratio,
        request.waste_type,
        request.lang
    )
    
    return {
        "status": "success",
        "log_id": log.id,
        "site_updated": {
            "name": site.name,
            "status": site.status,
            "risk": site.risk
        },
        "prediction": result
    }

# ── PATHOGEN RADAR ENDPOINTS ─────────────────────────────────────────────────
@app.get("/api/pathogens/radar")
def get_pathogens_radar(db: Session = Depends(get_db)):
    sites = db.query(db_models.BioremediationSite).all()
    risk_zones = []
    
    for s in sites:
        latest_log = db.query(db_models.SensorLog).filter(
            db_models.SensorLog.site_id == s.id
        ).order_by(db_models.SensorLog.timestamp.desc()).first()
        
        if latest_log:
            # Map risk to disease threat
            disease = "No Vector Threat"
            if s.risk == "Severe":
                disease = "Dengue / Aedes Breeding"
            elif s.risk == "High":
                disease = "Malaria / Anopheles Risk"
            elif s.risk == "Moderate":
                disease = "Leptospirosis Risk"
                
            # Count days sustained high moisture
            # Check last logs to find how many consecutive days moisture > 60%
            logs = db.query(db_models.SensorLog).filter(
                db_models.SensorLog.site_id == s.id
            ).order_by(db_models.SensorLog.timestamp.desc()).limit(10).all()
            
            days_sustained = 0
            for log in logs:
                if log.moisture_percent > 60:
                    days_sustained += 1
                else:
                    break
            
            # Check for active open tickets for this zone
            open_alert = db.query(db_models.PathogenAlertLog).filter(
                db_models.PathogenAlertLog.zone_name == s.name,
                db_models.PathogenAlertLog.status == "OPEN"
            ).first()
            alert_status = "OPEN" if open_alert else "NONE"
            
            risk_zones.append({
                "site_id": s.id,
                "zone": s.name,
                "moisture": int(latest_log.moisture_percent),
                "temp": int(latest_log.temperature_celsius),
                "days": max(1, days_sustained),
                "risk": s.risk.upper(),
                "disease": disease,
                "lat": f"{round(s.latitude, 2)}N",
                "alert_status": alert_status
            })
            
    # Sort so high risk zones appear first
    severity_order = {"SEVERE": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
    risk_zones.sort(key=lambda z: severity_order.get(z["risk"], 4))
    
    # Weekly trend: Count alert logs per day for the last 7 days
    today = datetime.date.today()
    weekly_trend = []
    days_of_week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    # Generate weekly trend dynamically: count alerts in the database per day
    for i in range(6, -1, -1):
        target_date = today - datetime.timedelta(days=i)
        day_name = days_of_week[target_date.weekday()]
        
        # Count alert logs on this day
        count = db.query(db_models.PathogenAlertLog).filter(
            db_models.PathogenAlertLog.timestamp >= datetime.datetime.combine(target_date, datetime.time.min),
            db_models.PathogenAlertLog.timestamp <= datetime.datetime.combine(target_date, datetime.time.max)
        ).count()
        
        # Add a baseline of static mock data for visualization, plus the real database logs
        baseline_cases = [3, 5, 8, 12, 9, 14, 11]
        cases = baseline_cases[target_date.weekday() % len(baseline_cases)] + count
        weekly_trend.append({"day": day_name, "cases": cases})
        
    return {
        "riskZones": risk_zones,
        "weeklyTrend": weekly_trend
    }

@app.post("/api/pathogen-alerts/dispatch")
def dispatch_pathogen_alerts_bulk(request: DispatchRequest, db: Session = Depends(get_db)):
    dispatched_count = 0
    for sid in request.site_ids:
        site = db.query(db_models.BioremediationSite).filter(db_models.BioremediationSite.id == sid).first()
        if site:
            # Find open alerts for this zone
            open_alerts = db.query(db_models.PathogenAlertLog).filter(
                db_models.PathogenAlertLog.zone_name == site.name,
                db_models.PathogenAlertLog.status == "OPEN"
            ).all()
            
            for alert in open_alerts:
                alert.status = "DISPATCHED"
                db.add(alert)
                dispatched_count += 1
                
            # If no existing alert, simulate creating one as dispatched
            if not open_alerts:
                new_alert = db_models.PathogenAlertLog(
                    zone_name=site.name,
                    disease="Manual Dispatch",
                    risk_level=site.risk,
                    status="DISPATCHED"
                )
                db.add(new_alert)
                dispatched_count += 1
                
            print(f"==================================================")
            print(f"🚨 EMERGENCY ALERT DISPATCHED")
            print(f"To: Madurai Municipal Health Department")
            print(f"Zone: {site.name}")
            print(f"Action Required: Emergency anti-larval spraying.")
            print(f"==================================================")
            
    db.commit()
    return {"status": "success", "dispatched_count": dispatched_count}

# ── INVENTORY ENDPOINTS ──────────────────────────────────────────────────────
@app.get("/api/inventory")
def get_inventory(db: Session = Depends(get_db)):
    items = db.query(db_models.InventoryItem).all()
    result = []
    for item in items:
        # Determine status dynamically based on current stock pct
        pct = (item.stock / item.capacity) * 100
        if pct < 10:
            item.status = "Critical"
        elif pct < 20:
            item.status = "Low"
        elif pct < 50:
            item.status = "Moderate"
        else:
            item.status = "Optimal"
        db.add(item)
        
        result.append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "stock": item.stock,
            "unit": item.unit,
            "capacity": item.capacity,
            "status": item.status,
            "supplier": item.supplier,
            "lastRestock": item.last_restock,
            "costPerUnit": item.cost_per_unit,
            "reorderThreshold": item.reorder_threshold
        })
    db.commit()
    return result

@app.post("/api/inventory")
def create_inventory_item(item: InventoryItemCreate, db: Session = Depends(get_db)):
    new_item = db_models.InventoryItem(**item.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.put("/api/inventory/{item_id}")
def update_inventory_item(item_id: int, item: InventoryItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(db_models.InventoryItem).filter(db_models.InventoryItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = item.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/inventory/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(db_models.InventoryItem).filter(db_models.InventoryItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_item)
    db.commit()
    return {"status": "deleted"}

@app.get("/api/wholesalers")
def get_wholesalers(item_category: str):
    # Mock data for Indian B2B suppliers based on category
    suppliers = {
        "Enzymes": [
            {"name": "BioTech India", "contact": "+91-9876543210", "email": "sales@biotechindia.in", "location": "Chennai", "rating": 4.8},
            {"name": "Microbial Solutions Ltd", "contact": "+91-9123456789", "email": "info@microbialsol.com", "location": "Coimbatore", "rating": 4.5}
        ],
        "Bulking Agents": [
            {"name": "TN Agri Supplies", "contact": "+91-8888888888", "email": "orders@tnagri.in", "location": "Madurai", "rating": 4.2},
            {"name": "South India Woodworks", "contact": "+91-7777777777", "email": "timber@siw.com", "location": "Salem", "rating": 4.0}
        ]
    }
    # Fallback default suppliers
    default_suppliers = [
        {"name": "Global BioSupplies", "contact": "+91-9999999999", "email": "contact@globalbio.in", "location": "Bangalore", "rating": 4.6},
        {"name": "IndiaMART Top Seller", "contact": "+91-8000000000", "email": "seller@indiamart.com", "location": "Mumbai", "rating": 4.3}
    ]
    
    return suppliers.get(item_category, default_suppliers)

@app.post("/api/inventory/reorder")
def reorder_inventory(request: ReorderRequest, db: Session = Depends(get_db)):
    item = db.query(db_models.InventoryItem).filter(db_models.InventoryItem.id == request.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Reorder fills stock back to capacity
    old_stock = item.stock
    item.stock = item.capacity
    item.status = "Optimal"
    item.last_restock = datetime.date.today().isoformat()
    db.add(item)
    db.commit()
    
    # Simulate PO dispatch
    print(f"==================================================")
    print(f"📦 PURCHASE ORDER GENERATED")
    print(f"Supplier: {item.supplier}")
    print(f"Material: {item.name}")
    print(f"Quantity: {item.capacity - old_stock} {item.unit}")
    print(f"Unit Cost: {item.cost_per_unit}")
    print(f"Status: Auto-dispatched via reorder protocol")
    print(f"==================================================")
    
    return {
        "status": "ordered",
        "item_id": item.id,
        "restocked_qty": item.capacity - old_stock,
        "current_stock": item.stock
    }

# ── USER PROFILE ENDPOINTS ───────────────────────────────────────────────────
@app.get("/api/profile")
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(db_models.UserProfile).first()
    if not profile:
        # Return fallback
        return {
            "name": "Dr. Meiyazhagan R.",
            "role": "Chief Plant Operator",
            "email": "meiyazhagan@meiinnovations.in",
            "phone": "+91 98765 43210",
            "department": "Bioremediation Division",
            "location": "Madurai, Tamil Nadu",
            "theme": "dark",
            "email_notif": True,
            "sms_notif": False,
            "push_notif": True,
            "health_notif": True
        }
    return {
        "name": profile.name,
        "role": profile.role,
        "email": profile.email,
        "phone": profile.phone,
        "department": profile.department,
        "location": profile.location,
        "theme": profile.theme,
        "email_notif": profile.email_notif,
        "sms_notif": profile.sms_notif,
        "push_notif": profile.push_notif,
        "health_notif": profile.health_notif
    }

@app.put("/api/profile")
def update_profile(request: ProfileUpdateRequest, db: Session = Depends(get_db)):
    profile = db.query(db_models.UserProfile).first()
    if not profile:
        profile = db_models.UserProfile()
        
    profile.name = request.name
    profile.role = request.role
    profile.email = request.email
    profile.phone = request.phone
    profile.department = request.department
    profile.location = request.location
    profile.theme = request.theme
    profile.email_notif = request.email_notif
    profile.sms_notif = request.sms_notif
    profile.push_notif = request.push_notif
    profile.health_notif = request.health_notif
    
    db.add(profile)
    db.commit()
    return {"status": "updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
