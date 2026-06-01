import time
import random
import datetime
from database import SessionLocal
import db_models

def run_simulator_tick():
    db = SessionLocal()
    
    # 0. Predictive weather mock (10% chance per tick to forecast heavy rain)
    rain_forecast = random.random() < 0.10
    if rain_forecast:
        print("[Simulator] 🌧️ PREDICTIVE WEATHER EVENT: Heavy rain forecast detected. Spiking moisture levels globally.")

    try:
        # 1. Update Telemetry for all sites
        sites = db.query(db_models.BioremediationSite).all()
        for site in sites:
            # Fetch latest telemetry to base drift on
            latest_log = db.query(db_models.SensorLog).filter(
                db_models.SensorLog.site_id == site.id
            ).order_by(db_models.SensorLog.timestamp.desc()).first()

            if latest_log:
                temp = latest_log.temperature_celsius
                moisture = latest_log.moisture_percent
                ph = latest_log.ph_level
                cn = latest_log.carbon_nitrogen_ratio
                waste_type = latest_log.waste_type
            else:
                # Baselines
                temp = 45.0
                moisture = 50.0
                ph = 7.0
                cn = 28.0
                waste_type = 'Mixed_Household'

            # Add noise / drift
            temp_drift = random.uniform(-1.0, 1.0)
            
            # Predictive weather mock: if rain is forecast, drastically increase moisture
            if rain_forecast:
                moisture_drift = random.uniform(5.0, 15.0)
            else:
                moisture_drift = random.uniform(-2.0, 2.0)
                
            ph_drift = random.uniform(-0.15, 0.15)
            cn_drift = random.uniform(-0.3, 0.3)

            new_temp = max(30.0, min(75.0, temp + temp_drift))
            new_moisture = max(20.0, min(80.0, moisture + moisture_drift))
            new_ph = max(4.5, min(8.5, ph + ph_drift))
            new_cn = max(15.0, min(45.0, cn + cn_drift))

            # Create new log
            new_log = db_models.SensorLog(
                site_id=site.id,
                timestamp=datetime.datetime.utcnow(),
                temperature_celsius=new_temp,
                moisture_percent=new_moisture,
                ph_level=new_ph,
                carbon_nitrogen_ratio=new_cn,
                waste_type=waste_type
            )
            db.add(new_log)
            db.flush()

            # Calculate risk dynamically
            # Severe: moisture > 70% and temp 30-40
            if new_moisture > 70.0 and 30.0 <= new_temp <= 40.0:
                site.risk = "Severe"
            elif new_moisture > 60.0 and 30.0 <= new_temp <= 45.0:
                site.risk = "High"
            elif new_moisture > 50.0 and 30.0 <= new_temp <= 50.0:
                site.risk = "Moderate"
            else:
                site.risk = "Low"

            # Status determination
            if site.risk in ["Severe", "High"] or site.piles_count > 30:
                site.status = "Overloaded" if site.piles_count > 30 else "Critical"
            else:
                site.status = "Active"

            db.add(site)

            # Trigger automated dispatch alert if risk is Severe or High and no recent alert in the last 2 minutes
            if site.risk in ["Severe", "High"]:
                disease = "Dengue / Aedes Breeding" if site.risk == "Severe" else "Malaria / Anopheles Risk"
                two_minutes_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=2)
                recent_alert = db.query(db_models.PathogenAlertLog).filter(
                    db_models.PathogenAlertLog.zone_name == site.name,
                    db_models.PathogenAlertLog.risk_level == site.risk,
                    db_models.PathogenAlertLog.timestamp >= two_minutes_ago
                ).first()

                if not recent_alert:
                    alert = db_models.PathogenAlertLog(
                        zone_name=site.name,
                        timestamp=datetime.datetime.utcnow(),
                        disease=disease,
                        risk_level=site.risk,
                        status="OPEN"
                    )
                    db.add(alert)
                    print(f"[Simulator] [ALERT] AUTOMATED INCIDENT CREATED - Site: {site.name}, Risk: {site.risk}, Disease: {disease}")
        # 2. Inventory depletion
        items = db.query(db_models.InventoryItem).all()
        for item in items:
            # Deplete stock
            # Rate of depletion is 0.5% to 1.5% of capacity
            depletion = item.capacity * random.uniform(0.005, 0.015)
            item.stock = max(0.0, item.stock - depletion)

            # Calculate status
            pct = (item.stock / item.capacity) * 100.0
            if pct < 10.0:
                item.status = "Critical"
            elif pct < 20.0:
                item.status = "Low"
            elif pct < 50.0:
                item.status = "Moderate"
            else:
                item.status = "Optimal"

            db.add(item)

            # Trigger auto-reorder if stock falls below reorder_threshold (which is 20%)
            if item.stock < item.reorder_threshold:
                old_stock = item.stock
                item.stock = item.capacity
                item.status = "Optimal"
                item.last_restock = datetime.date.today().isoformat()
                db.add(item)
                print(f"[Simulator] [REORDER] AUTO-REORDER TRIGGERED - Item: {item.name}, Restocked: {item.capacity - old_stock:.1f} {item.unit}")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Simulator] Error in simulator loop: {e}")
    finally:
        db.close()

def start_simulator():
    print("[Simulator] Live Simulator Engine Started...")
    while True:
        try:
            run_simulator_tick()
        except Exception as e:
            print(f"[Simulator] Fatal simulator error: {e}")
        time.sleep(10)
