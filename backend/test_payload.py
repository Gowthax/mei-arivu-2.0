import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
from main import app, chat_mentor, MentorChatRequest
from database import SessionLocal

import json
from main import db_models

db = SessionLocal()

active_sites_count = db.query(db_models.BioremediationSite).filter(db_models.BioremediationSite.status != 'Closed').count()
weather_condition = "32°C, வெயிலோடு (Sunny)"

critical_site = db.query(db_models.BioremediationSite).filter(db_models.BioremediationSite.status == 'Critical').first()
telemetry_data = "தற்போது எந்த முக்கியமான windrow பாதிப்பும் இல்லை."

open_alerts = db.query(db_models.PathogenAlertLog).filter(db_models.PathogenAlertLog.status == 'OPEN').all()
threat_alerts = [f"{a.disease} — {a.zone_name} (அபாய நிலை: {a.risk_level})" for a in open_alerts] if open_alerts else ["தற்போது எந்த நோய் அபாயமும் இல்லை."]

inventory = db.query(db_models.InventoryItem).all()
low_stock = [
    f"{item.name}: {item.stock}/{item.capacity} {item.unit} (குறைவு)"
    for item in inventory if item.capacity > 0 and (item.stock / item.capacity) < 0.2
] if inventory else []
if not low_stock:
    low_stock = ["அனைத்து பொருட்களும் 20% அதிகமாக உள்ளன."]

context = {
    "Madurai Command Center": {"செயலில் உள்ள தளங்கள்": active_sites_count, "வானிலை": weather_condition},
    "Telemetry & Diagnostics": telemetry_data,
    "Pathogen Radar": threat_alerts,
    "Bio-Supply Inventory": low_stock
}

print(len(json.dumps(context, ensure_ascii=False)))
print(json.dumps(context, ensure_ascii=False))
