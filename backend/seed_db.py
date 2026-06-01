import datetime
from database import engine, Base, SessionLocal
from db_models import BioremediationSite, SensorLog, InventoryItem, UserProfile, PathogenAlertLog

def seed():
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

    db = SessionLocal()
    try:
        # Check if sites are already seeded
        if db.query(BioremediationSite).count() == 0:
            print("Seeding sites and historical telemetry...")
            
            # Hotspots data
            hotspots = [
                { "name": 'Thirupparankundram Plant', "latitude": 9.8765, "longitude": 78.0648, "status": 'Active', "piles_count": 14, "backlog": '2.3 tonnes', "risk": 'Low' },
                { "name": 'Mattuthavani Market', "latitude": 9.9312, "longitude": 78.1432, "status": 'Overloaded', "piles_count": 31, "backlog": '8.7 tonnes', "risk": 'Severe' },
                { "name": 'Vaigai Riverbanks', "latitude": 9.9195, "longitude": 78.1010, "status": 'Active', "piles_count": 9, "backlog": '1.1 tonnes', "risk": 'Moderate' },
                { "name": 'Tallakulam Zone', "latitude": 9.9250, "longitude": 78.1200, "status": 'Active', "piles_count": 7, "backlog": '0.8 tonnes', "risk": 'Low' },
                { "name": 'Periyar Bus Stand', "latitude": 9.9190, "longitude": 78.1280, "status": 'Critical', "piles_count": 22, "backlog": '6.2 tonnes', "risk": 'High' },
            ]
            
            # Seeding sites and logs
            for h in hotspots:
                site = BioremediationSite(
                    name=h["name"],
                    latitude=h["latitude"],
                    longitude=h["longitude"],
                    status=h["status"],
                    piles_count=h["piles_count"],
                    backlog=h["backlog"],
                    risk=h["risk"]
                )
                db.add(site)
                db.commit()
                db.refresh(site)

                # Seed some historical logs
                # Mattuthavani Market: severe, moisture ~78%, temp ~36, 7 days
                if site.name == 'Mattuthavani Market':
                    m_val, t_val = 78.0, 36.0
                    days = 7
                elif site.name == 'Periyar Bus Stand':
                    m_val, t_val = 74.0, 34.0
                    days = 6
                elif site.name == 'Vaigai Riverbanks':
                    m_val, t_val = 65.0, 38.0
                    days = 3
                elif site.name == 'Thirupparankundram Plant':
                    m_val, t_val = 52.0, 55.0
                    days = 2
                else: # Tallakulam Zone
                    m_val, t_val = 48.0, 42.0
                    days = 1

                for d in range(days, -1, -1):
                    log = SensorLog(
                        site_id=site.id,
                        timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=d),
                        temperature_celsius=t_val + (d * 0.1),
                        moisture_percent=m_val + (d * 0.2),
                        ph_level=7.2,
                        carbon_nitrogen_ratio=28.0,
                        waste_type='Mixed_Household'
                    )
                    db.add(log)
            db.commit()
            print("Sites and telemetry seeded.")

        # Seed inventory
        if db.query(InventoryItem).count() == 0:
            print("Seeding inventory items...")
            inventory = [
                { "name": 'Bacillus Subtilis Culture', "category": 'Microbial Inoculant', "stock": 12.0, "unit": 'litres', "capacity": 100.0, "status": 'Low', "supplier": 'BioGreen Labs, Chennai', "last_restock": '2026-02-14', "cost_per_unit": '₹850', "reorder_threshold": 20.0 },
                { "name": 'Dry Sawdust / Carbon Matter', "category": 'Carbon Amendment', "stock": 680.0, "unit": 'kg', "capacity": 1000.0, "status": 'Optimal', "supplier": 'Madurai Timber Co-op', "last_restock": '2026-02-22', "cost_per_unit": '₹12', "reorder_threshold": 200.0 },
                { "name": 'Liquid Odor Suppressant', "category": 'Chemical Agent', "stock": 4.0, "unit": 'litres', "capacity": 50.0, "status": 'Critical', "supplier": 'EcoShield Chemicals, Trichy', "last_restock": '2026-01-28', "cost_per_unit": '₹1,200', "reorder_threshold": 10.0 },
                { "name": 'EM Bokashi Compost Starter', "category": 'Microbial Inoculant', "stock": 35.0, "unit": 'kg', "capacity": 80.0, "status": 'Moderate', "supplier": 'Annamalai BioFarms', "last_restock": '2026-02-10', "cost_per_unit": '₹320', "reorder_threshold": 16.0 },
                { "name": 'Lime Powder (CaCO3)', "category": 'pH Amendment', "stock": 220.0, "unit": 'kg', "capacity": 500.0, "status": 'Optimal', "supplier": 'Sivagangai Minerals', "last_restock": '2026-02-18', "cost_per_unit": '₹28', "reorder_threshold": 100.0 },
                { "name": 'Protective PPE Kits', "category": 'Safety Gear', "stock": 8.0, "unit": 'sets', "capacity": 50.0, "status": 'Low', "supplier": 'SafeWork India Pvt Ltd', "last_restock": '2026-02-01', "cost_per_unit": '₹2,400', "reorder_threshold": 10.0 },
            ]
            for item in inventory:
                inv = InventoryItem(
                    name=item["name"],
                    category=item["category"],
                    stock=item["stock"],
                    unit=item["unit"],
                    capacity=item["capacity"],
                    status=item["status"],
                    supplier=item["supplier"],
                    last_restock=item["last_restock"],
                    cost_per_unit=item["cost_per_unit"],
                    reorder_threshold=item["reorder_threshold"]
                )
                db.add(inv)
            db.commit()
            print("Inventory items seeded.")

        # Seed profile
        if db.query(UserProfile).count() == 0:
            print("Seeding default profile...")
            profile = UserProfile(
                name="Dr. Meiyazhagan R.",
                role="Chief Plant Operator",
                email="meiyazhagan@meiinnovations.in",
                phone="+91 98765 43210",
                department="Bioremediation Division",
                location="Madurai, Tamil Nadu",
                theme="dark",
                email_notif=True,
                sms_notif=False,
                push_notif=True,
                health_notif=True
            )
            db.add(profile)
            db.commit()
            print("Default profile seeded.")

    finally:
        db.close()

if __name__ == '__main__':
    seed()
