from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user") # 'user', 'viewer', 'admin'

class BioremediationSite(Base):
    __tablename__ = "bioremediation_sites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String) # Active, Overloaded, Critical
    piles_count = Column(Integer)
    backlog = Column(String) # e.g. "2.3 tonnes"
    risk = Column(String) # Low, Medium, High, Severe

    # Relationship to sensor logs
    sensor_logs = relationship("SensorLog", back_populates="site", cascade="all, delete-orphan")

class SensorLog(Base):
    __tablename__ = "sensor_logs"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("bioremediation_sites.id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    temperature_celsius = Column(Float)
    moisture_percent = Column(Float)
    ph_level = Column(Float)
    carbon_nitrogen_ratio = Column(Float)
    waste_type = Column(String) # Market_Vegetable, Mixed_Household, Yard_Waste

    site = relationship("BioremediationSite", back_populates="sensor_logs")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String)
    stock = Column(Float)
    unit = Column(String)
    capacity = Column(Float)
    status = Column(String) # Optimal, Low, Critical, Moderate
    supplier = Column(String)
    last_restock = Column(String) # YYYY-MM-DD
    cost_per_unit = Column(String)
    reorder_threshold = Column(Float)

class PathogenAlertLog(Base):
    __tablename__ = "pathogen_alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    zone_name = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    disease = Column(String)
    risk_level = Column(String)
    status = Column(String, default="OPEN") # OPEN, DISPATCHED, RESOLVED


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Dr. Meiyazhagan R.")
    role = Column(String, default="Chief Plant Operator")
    email = Column(String, default="meiyazhagan@meiinnovations.in")
    phone = Column(String, default="+91 98765 43210")
    department = Column(String, default="Bioremediation Division")
    location = Column(String, default="Madurai, Tamil Nadu")
    theme = Column(String, default="dark")
    email_notif = Column(Boolean, default=True)
    sms_notif = Column(Boolean, default=False)
    push_notif = Column(Boolean, default=True)
    health_notif = Column(Boolean, default=True)
