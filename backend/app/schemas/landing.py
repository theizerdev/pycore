from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class HeroSection(BaseModel):
    badge: str = "✨ Plataforma Médica Todo-en-Uno"
    title: str = "Gestión Clínica y Hospitalaria de Nueva Generación"
    title_highlight: str = "Inteligente, Rápida y Multi-Sede"
    subtitle: str = "Digitaliza tus consultas médicas, agenda interactiva, turnero en pantalla, odontograma y recordatorios automáticos por WhatsApp en una sola plataforma en la nube."
    cta_primary_text: str = "Comenzar Prueba Gratis"
    cta_primary_link: str = "/register"
    cta_secondary_text: str = "Acceso al Sistema"
    cta_secondary_link: str = "/login"
    stat_1_val: str = "+50,000"
    stat_1_label: str = "Pacientes Atendidos"
    stat_2_val: str = "99.9%"
    stat_2_label: str = "Disponibilidad SLA"
    stat_3_val: str = "30 min"
    stat_3_label: str = "Ahorro por Consulta"
    stat_4_val: str = "+120"
    stat_4_label: str = "Clínicas & Consultorios"

class FeatureItem(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    badge: Optional[str] = None
    category: str = "Clínica"
    enabled: bool = True

class SpecialtyItem(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    badge: Optional[str] = None
    enabled: bool = True

class BenefitItem(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    stat: str
    stat_label: str

class TestimonialItem(BaseModel):
    id: str
    author: str
    role: str
    clinic: str
    avatar_url: Optional[str] = None
    rating: int = 5
    content: str
    enabled: bool = True

class FaqItem(BaseModel):
    id: str
    question: str
    answer: str
    category: str = "General"
    enabled: bool = True

class ClientItem(BaseModel):
    id: str
    name: str
    category: str = "Clínica"
    logo_url: Optional[str] = None
    description: Optional[str] = None
    rating: Optional[float] = 5.0
    enabled: bool = True

class SocialLinks(BaseModel):
    instagram: Optional[str] = "https://instagram.com"
    facebook: Optional[str] = "https://facebook.com"
    linkedin: Optional[str] = "https://linkedin.com"
    twitter: Optional[str] = "https://x.com"

class ContactInfo(BaseModel):
    whatsapp: str = "+58 412 1234567"
    phone: str = "+58 212 555-0199"
    email: str = "contacto@medisoft.com"
    address: str = "Av. Principal Empresarial, Torre Médica Titanium, Piso 5"
    schedule: str = "Lunes a Viernes: 8:00 AM - 6:00 PM"
    social: SocialLinks = Field(default_factory=SocialLinks)

class CtaBanner(BaseModel):
    badge: str = "🚀 Comienza Hoy Mismo"
    title: str = "¿Listo para transformar la gestión de tu centro médico?"
    subtitle: str = "Únete a cientos de profesionales de la salud que ya optimizan su tiempo, reducen ausencias y brindan una mejor experiencia a sus pacientes."
    button_text: str = "Crear Cuenta de Clínica Gratis"
    button_link: str = "/register"

class LandingContentSchema(BaseModel):
    hero: HeroSection
    features: List[FeatureItem]
    specialties: List[SpecialtyItem]
    benefits: List[BenefitItem]
    testimonials: List[TestimonialItem]
    faqs: List[FaqItem]
    clients: Optional[List[ClientItem]] = Field(default_factory=list)
    contact: ContactInfo
    cta_banner: CtaBanner
    is_active: bool = True

class ContactMessageCreate(BaseModel):
    nombre: str
    email: str
    telefono: Optional[str] = None
    institucion: Optional[str] = None
    mensaje: str

class ContactMessageOut(BaseModel):
    id: int
    nombre: str
    email: str
    telefono: Optional[str] = None
    institucion: Optional[str] = None
    mensaje: str
    leido: bool
    created_at: Optional[Any] = None

    class Config:
        from_attributes = True
