from sqlalchemy import Column, Integer, String, Boolean, JSON
from app.core.database import Base
from app.models.base import TimestampMixin

class LandingPageConfig(Base, TimestampMixin):
    __tablename__ = "landing_config"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(50), unique=True, nullable=False, index=True, default="default")
    hero = Column(JSON, nullable=False)
    features = Column(JSON, nullable=False)
    specialties = Column(JSON, nullable=False)
    benefits = Column(JSON, nullable=False)
    testimonials = Column(JSON, nullable=False)
    faqs = Column(JSON, nullable=False)
    clients = Column(JSON, nullable=True)
    contact = Column(JSON, nullable=False)
    cta_banner = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
