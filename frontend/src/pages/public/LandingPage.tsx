import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTemplateSettings } from '../../context/TemplateSettingsContext';
import {
  CalendarDays,
  Stethoscope,
  Activity,
  Tv,
  QrCode,
  MessageSquare,
  Mic,
  Building2,
  HeartPulse,
  Sparkles,
  Baby,
  Users,
  Heart,
  ShieldCheck,
  TrendingDown,
  Clock,
  FileCheck,
  CheckCircle2,
  Star,
  ChevronDown,
  ArrowRight,
  Sun,
  Moon,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Menu,
  X,
  Layers,
  Check,
  Zap,
  Send,
  Loader2,
  Award,
  BellRing,
  Laptop,
  Play,
  FileText,
  CheckCheck,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { landingApi } from '../../api/landing';
import type { LandingContent, ContactMessagePayload } from '../../api/landing';
import { planesApi } from '../../api/planes';
import type { Plan } from '../../types';

// Mapa de iconos seguros por nombre
const iconMap: Record<string, React.ElementType> = {
  CalendarDays,
  Stethoscope,
  Activity,
  Tv,
  QrCode,
  MessageSquare,
  Mic,
  Building2,
  HeartPulse,
  Sparkles,
  Baby,
  Users,
  Heart,
  ShieldCheck,
  TrendingDown,
  Clock,
  FileCheck,
  CheckCircle2,
  Layers,
  Zap,
};

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { resolvedAppearance, updateAppearance } = useTemplateSettings();
  const isDarkMode = resolvedAppearance === 'dark';
  const toggleTheme = () => updateAppearance(isDarkMode ? 'light' : 'dark');
  const navigate = useNavigate();

  const [content, setContent] = useState<LandingContent | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTabPreview, setActiveTabPreview] = useState<'agenda' | 'consulta' | 'turnero'>('agenda');

  // Estado del Formulario de Contacto
  const [contactForm, setContactForm] = useState<ContactMessagePayload>({
    nombre: '',
    email: '',
    telefono: '',
    institucion: '',
    mensaje: '',
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.nombre.trim() || !contactForm.email.trim() || !contactForm.mensaje.trim()) {
      toast.error('Por favor completa todos los campos obligatorios (nombre, correo y mensaje).');
      return;
    }

    setContactSubmitting(true);
    try {
      const res = await landingApi.sendContactMessage(contactForm);
      toast.success(res.message || 'Mensaje enviado con éxito');
      setContactSuccess(true);
      setContactForm({
        nombre: '',
        email: '',
        telefono: '',
        institucion: '',
        mensaje: '',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al enviar el mensaje. Intenta nuevamente.');
    } finally {
      setContactSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [landingData, plansData] = await Promise.all([
          landingApi.getLandingContent().catch(() => null),
          planesApi.list().catch(() => []),
        ]);
        if (landingData) setContent(landingData);
        if (plansData && plansData.length > 0) setPlans(plansData);
      } catch (err) {
        console.error('Error cargando landing page:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hero = content?.hero;
  const features = (content?.features || []).filter((f) => f.enabled);
  const specialties = (content?.specialties || []).filter((s) => s.enabled);
  const benefits = content?.benefits || [];
  const testimonials = (content?.testimonials || []).filter((t) => t.enabled);
  const clients = (content?.clients || []).filter((c) => c.enabled);
  const faqs = (content?.faqs || []).filter((f) => f.enabled);
  const contact = content?.contact;
  const ctaBanner = content?.cta_banner;

  // Categorías de módulos para filtrado
  const categories = ['Todos', ...Array.from(new Set(features.map((f) => f.category)))];
  const filteredFeatures =
    selectedCategory === 'Todos'
      ? features
      : features.filter((f) => f.category === selectedCategory);

  const getDynamicIcon = (name: string) => {
    const IconComp = iconMap[name] || Stethoscope;
    return <IconComp className="size-6" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-teal-500 selection:text-white transition-colors duration-300">
      {/* ========================================================================= */}
      {/* 1. NAVBAR DE NAVEGACIÓN                                                   */}
      {/* ========================================================================= */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 dark:bg-slate-950/85 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={isDarkMode ? '/medisoft_logo_dark.png' : '/medisoft_logo_light.png'}
              alt="MediSoft Suite"
              className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>

          {/* Enlaces de Navegación de Escritorio */}
          <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#modulos" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Módulos
            </a>
            <a href="#especialidades" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Especialidades
            </a>
            <a href="#beneficios" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Ventajas
            </a>
            <a href="#planes" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Planes
            </a>
            <a href="#clientes" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Clientes
            </a>
            <a href="#testimonios" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Testimonios
            </a>
            <a href="#faq" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Preguntas
            </a>
            <a href="#contacto" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Contacto
            </a>
          </div>

          {/* Botones de Acción y Tema */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar tema"
            >
              {isDarkMode ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-600" />}
            </button>

            {user ? (
              <Link
                to={user.rol?.slug === 'medico' ? '/medico/dashboard' : '/dashboard'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
              >
                <span>Ir al Panel</span>
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
                >
                  <span>Prueba Gratis</span>
                  <ArrowRight className="size-4" />
                </Link>
              </>
            )}
          </div>

          {/* Botón Menú Móvil */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              {isDarkMode ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Menú Desplegable Móvil */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-4 pt-3 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col gap-3">
            <a
              href="#modulos"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Módulos
            </a>
            <a
              href="#especialidades"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Especialidades
            </a>
            <a
              href="#beneficios"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Ventajas
            </a>
            <a
              href="#planes"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Planes
            </a>
            <a
              href="#clientes"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Nuestros Clientes
            </a>
            <a
              href="#testimonios"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Testimonios
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Preguntas Frecuentes
            </a>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-900"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="w-full text-center py-2.5 rounded-xl font-semibold text-sm text-white bg-teal-600"
              >
                Comenzar Prueba Gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION CON GRÁFICOS Y MÉTRICAS                                  */}
      {/* ========================================================================= */}
      <header className="relative pt-10 pb-20 lg:pt-16 lg:pb-32 overflow-hidden">
        {/* Luces de fondo ambientales y esferas de brillo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-50 dark:opacity-30 blur-3xl -z-10">
          <div className="w-[650px] h-[400px] bg-gradient-to-tr from-cyan-400 via-teal-500 to-emerald-400 rounded-full mx-auto animate-pulse-glow" />
        </div>
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none -z-10 animate-float-slow" />
        <div className="absolute top-1/2 right-10 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none -z-10 animate-float-reverse" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge Píldora con haz de luz (Beam) */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50/90 dark:bg-teal-950/80 border border-teal-300/80 dark:border-teal-700/80 text-teal-800 dark:text-teal-200 text-xs sm:text-sm font-bold mb-6 shadow-sm badge-beam-container">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <Sparkles className="size-4 text-teal-600 dark:text-teal-400" />
              <span>{hero?.badge || '✨ Suite Médica Todo-en-Uno para Clínicas y Consultorios'}</span>
            </div>

            {/* Título Principal H1 con Shimmer degradado */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
              {hero?.title || 'La Plataforma Médica en la Nube que Impulsa tu'}{' '}
              <span className="shimmer-text">
                {hero?.title_highlight || 'Práctica Clínica y Hospitalaria'}
              </span>
            </h1>

            {/* Subtítulo Descriptivo */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
              {hero?.subtitle ||
                'Digitaliza tus consultas médicas, agenda inteligente, turnero en pantalla, odontograma y recordatorios por WhatsApp con la plataforma SaaS más avanzada y segura.'}
            </p>

            {/* Botones de Llamada a la Acción (CTA) interactivos */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to={hero?.cta_primary_link || '/register'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-xl shadow-teal-500/25 transition-all hover:scale-105 active:scale-95 group"
              >
                <span>{hero?.cta_primary_text || 'Comenzar Prueba Gratis'}</span>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={hero?.cta_secondary_link || '#modulos'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/90 shadow-sm transition-all hover:scale-[1.02]"
              >
                <span>{hero?.cta_secondary_text || 'Explorar Módulos'}</span>
                <ChevronDown className="size-5" />
              </a>
            </div>

            {/* Métricas / Estadísticas Clave con Efecto Glass & Hover */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { val: hero?.stat_1_val || '+50,000', label: hero?.stat_1_label || 'Pacientes Atendidos', icon: Users },
                { val: hero?.stat_2_val || '99.9%', label: hero?.stat_2_label || 'Disponibilidad Cloud', icon: ShieldCheck },
                { val: hero?.stat_3_val || '-65%', label: hero?.stat_3_label || 'Inasistencias con WhatsApp', icon: TrendingDown },
                { val: hero?.stat_4_val || '+120', label: hero?.stat_4_label || 'Centros Médicos Activos', icon: Building2 },
              ].map((stat, idx) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-sm text-center glass-card-glow group"
                  >
                    <div className="size-8 mx-auto mb-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <StatIcon className="size-4" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-teal-600 dark:text-teal-400">
                      {stat.val}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Maqueta Interactiva del Panel Clínico con Tarjetas Flotantes */}
          <div className="mt-16 max-w-5xl mx-auto relative">
            
            {/* Widget Flotante 1: Notificación WhatsApp en vivo */}
            <div className="hidden lg:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md absolute -left-12 top-20 z-20 animate-float-slow max-w-[260px]">
              <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                <MessageSquare className="size-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white">Recordatorio Automático</span>
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  "Sr. Morales, su cita de Cardiología está confirmada para las 08:30 AM."
                </p>
              </div>
            </div>

            {/* Widget Flotante 2: Diagnóstico CIE-10 Instantáneo */}
            <div className="hidden lg:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md absolute -right-12 bottom-12 z-20 animate-float-reverse max-w-[260px]">
              <div className="size-10 rounded-xl bg-cyan-500/20 text-cyan-600 flex items-center justify-center shrink-0">
                <Activity className="size-5" />
              </div>
              <div className="text-left">
                <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <span>Diagnóstico CIE-10</span>
                  <CheckCheck className="size-3 text-cyan-500" />
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  Búsqueda rápida y récipe digital firmado en segundos.
                </p>
              </div>
            </div>

            {/* Contenedor Principal de la Maqueta */}
            <div className="rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-slate-200/90 via-slate-100/60 to-transparent dark:from-slate-800 dark:via-slate-900/80 dark:to-transparent border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
                {/* Barra de cabecera de la maqueta */}
                <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-rose-500" />
                    <div className="size-3 rounded-full bg-amber-500" />
                    <div className="size-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-mono text-slate-400 ml-2">medisoft.theizerdev.com/clinica</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTabPreview('agenda')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTabPreview === 'agenda'
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      Agenda Médica
                    </button>
                    <button
                      onClick={() => setActiveTabPreview('consulta')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTabPreview === 'consulta'
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      Expediente EMR
                    </button>
                    <button
                      onClick={() => setActiveTabPreview('turnero')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTabPreview === 'turnero'
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      Turnero Sala
                    </button>
                  </div>
                </div>

              {/* Vista previa simulada según pestaña */}
              <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-950 min-h-[320px] flex flex-col justify-center">
                {activeTabPreview === 'agenda' && (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-semibold text-teal-600 mb-2">
                        <span>08:30 AM</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-[10px]">
                          Confirmada
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">Alejandro Morales</h4>
                      <p className="text-xs text-slate-500 mt-1">Dra. Mariana V. • Cardiología</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Consultorio 102</span>
                        <span className="text-emerald-500 font-medium">WhatsApp Enviado ✓</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-teal-500 shadow-md">
                      <div className="flex items-center justify-between text-xs font-semibold text-teal-600 mb-2">
                        <span>09:15 AM</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 text-[10px] animate-pulse">
                          En Consulta
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">Camila Sánchez</h4>
                      <p className="text-xs text-slate-500 mt-1">Dr. Carlos M. • Odontología</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Sillón Dental 1</span>
                        <span className="text-teal-600 font-medium">Odontograma Activo</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-semibold text-teal-600 mb-2">
                        <span>10:00 AM</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 text-[10px]">
                          En Sala de Espera
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">Eduardo Méndez</h4>
                      <p className="text-xs text-slate-500 mt-1">Dra. Sofía R. • Pediatría</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Turno #04</span>
                        <span className="text-amber-500 font-medium">Llamado por Voz</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTabPreview === 'consulta' && (
                  <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400">Paciente en Atención:</span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          Roberto Gómez - 34 años (A Positivo)
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 text-xs font-semibold">
                          TA: 120/80 mmHg
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 text-xs font-semibold">
                          FC: 72 lpm
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 text-xs font-semibold">
                          IMC: 22.8 (Normal)
                        </span>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Diagnóstico CIE-10:</span>
                        <p className="text-slate-500 mt-1">J00 - Rinofaringitis aguda (Resfriado común)</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Plan de Tratamiento:</span>
                        <p className="text-slate-500 mt-1">Paracetamol 500mg c/8h + Hidratación oral abundante</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTabPreview === 'turnero' && (
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white text-center border border-teal-500/40 shadow-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-3">
                      <Tv className="size-3.5" />
                      <span>SALA DE ESPERA EN VIVO</span>
                    </div>
                    <div className="text-5xl font-black tracking-widest text-teal-400 mb-2">TURNO 04</div>
                    <h3 className="text-xl font-bold">Eduardo Méndez</h3>
                    <p className="text-slate-400 text-sm mt-1">
                      Favor pasar a: <strong className="text-emerald-400">Consultorio 3 - Pediatría</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

      {/* ========================================================================= */}
      {/* 3. MÓDULOS Y FUNCIONALIDADES CLÍNICAS                                     */}
      {/* ========================================================================= */}
      <section id="modulos" className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase mb-2">
              Ecosistema Integral
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Todo lo que necesita tu clínica para operar con excelencia
            </h3>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-base sm:text-lg">
              Diseñado pensando tanto en los médicos y especialistas como en el personal de recepción y los pacientes.
            </p>

            {/* Filtros de Categoría */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Rejilla de Módulos */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredFeatures.map((feat) => (
              <div
                key={feat.id}
                className="group relative p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-teal-500/60 dark:hover:border-teal-400/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-teal-500/10 glass-card-glow overflow-hidden"
              >
                {/* Acento sutil en la esquina superior */}
                <div className="absolute -top-12 -right-12 size-24 bg-gradient-to-br from-teal-500/10 to-cyan-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform" />

                <div className="flex items-center justify-between mb-5 relative z-10">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300 shadow-sm">
                    {getDynamicIcon(feat.icon)}
                  </div>
                  {feat.badge && (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 shadow-xs">
                      {feat.badge}
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors relative z-10">
                  {feat.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed relative z-10">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. ESPECIALIDADES Y PLANTILLAS MÉDICAS                                    */}
      {/* ========================================================================= */}
      <section id="especialidades" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase mb-2">
              Adaptado a Cada Rama Médica
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Especialidades con Formularios y Plantillas a la Medida
            </h3>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-base sm:text-lg">
              Desde odontogramas para odontólogos hasta percentiles para pediatras y controles prenatales para ginecólogos.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialties.map((spec) => (
              <div
                key={spec.id}
                className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-1.5 glass-card-glow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    {getDynamicIcon(spec.icon)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {spec.name}
                    </h4>
                    {spec.badge && (
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100/70 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {spec.badge}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {spec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PROPUESTA DE VALOR & BENEFICIOS                                       */}
      {/* ========================================================================= */}
      <section id="beneficios" className="py-24 bg-gradient-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase mb-2">
              Resultados Comprobados
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿Por qué las instituciones de salud eligen MediSoft?
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div
                key={b.id}
                className="group p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between text-center hover:-translate-y-2 glass-card-glow"
              >
                <div>
                  <div className="size-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                    {getDynamicIcon(b.icon)}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {b.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {b.description}
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-400">
                    {b.stat}
                  </div>
                  <div className="text-xs font-semibold text-slate-400 mt-1">{b.stat_label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. PLANES Y TARIFAS SAAS                                                 */}
      {/* ========================================================================= */}
      <section id="planes" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase mb-2">
              Inversión Transparente
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Planes Flexibles que Crecen con tu Clínica
            </h3>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-base sm:text-lg">
              Sin contratos forzosos. Cancela o cambia de plan en cualquier momento.
            </p>

            {/* Selector Mensual / Anual */}
            <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 mt-8">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Facturación Mensual
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                  billingPeriod === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Facturación Anual</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white">
                  -20% Ahorro
                </span>
              </button>
            </div>
          </div>

          {/* Tarjetas de Planes */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => {
              const price = billingPeriod === 'monthly' ? p.precio_mensual : Math.round(p.precio_anual / 12);
              const isPopular = p.nombre.toLowerCase().includes('profesional');

              return (
                <div
                  key={p.id}
                  className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-200 ${
                    isPopular
                      ? 'bg-gradient-to-b from-teal-900/10 via-white to-white dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-teal-500 shadow-xl scale-[1.03]'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-teal-600 to-emerald-600 shadow-md">
                      Más Popular
                    </div>
                  )}

                  <div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{p.nombre}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
                      {p.descripcion || 'Plan integral para gestión médica digital.'}
                    </p>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${price}</span>
                      <span className="text-xs text-slate-400 font-semibold">/ mes</span>
                    </div>

                    <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 mb-8">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>Hasta <strong>{p.max_usuarios} usuarios/médicos</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>Hasta <strong>{p.max_sucursales} sede(s) clínicas</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>Agenda & Calendario en tiempo real</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>Consultas, Signos Vitales & CIE-10</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>Turnero digital en pantalla</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>Recordatorios automáticos de WhatsApp</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to="/register"
                    className={`w-full py-3 rounded-xl text-xs font-bold text-center transition-all ${
                      isPopular
                        ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {price === 0 ? 'Comenzar Gratis (7 Días)' : 'Seleccionar Plan'}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. NUESTROS CLIENTES & CENTROS MÉDICOS ALIADOS                           */}
      {/* ========================================================================= */}
      {clients.length > 0 && (
        <section id="clientes" className="py-24 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900/40 dark:to-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden">
          {/* Luz ambiental sutil */}
          <div className="absolute top-1/3 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow" />
          <div className="absolute bottom-10 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-float-slow" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Encabezado */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 uppercase tracking-wider mb-4 shadow-sm">
                <Building2 className="size-4 text-teal-600 dark:text-teal-400" />
                <span>Nuestros Clientes & Centros Aliados</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Instituciones Médicas que <span className="shimmer-text">Transforman su Gestión</span> con MediSoft
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300 text-base sm:text-lg">
                Clínicas, policlínicas, consultorios privados y centros de diagnóstico confían a diario en nuestra infraestructura para brindar una atención médica de excelencia.
              </p>
            </div>

            {/* Grid de Centros Médicos */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="group relative p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-2xl hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between hover:-translate-y-2 glass-card-glow"
                >
                  <div>
                    {/* Header: Logo / Avatar + Category badge */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="relative">
                        {c.logo_url ? (
                          <div className="size-16 rounded-2xl overflow-hidden border-2 border-teal-500/20 bg-slate-50 dark:bg-slate-800 shadow-inner group-hover:scale-105 group-hover:border-teal-500/60 transition-all duration-300">
                            <img
                              src={c.logo_url}
                              alt={c.name}
                              className="size-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="size-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-105 transition-all">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm" title="Centro Verificado">
                          <CheckCircle2 className="size-3.5" />
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                          {c.category}
                        </span>
                        <div className="flex items-center justify-end gap-1 mt-2 text-amber-400">
                          {[...Array(Math.floor(c.rating || 5))].map((_, i) => (
                            <Star key={i} className="size-3.5 fill-amber-400" />
                          ))}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                            {(c.rating || 5).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Nombre y descripción */}
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {c.name}
                    </h3>
                    {c.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Footer card: Estado de Implementación / Verified */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      Activo en MediSoft Cloud
                    </span>
                    <span className="font-semibold text-slate-400">
                      Multi-Especialidad
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Banner de invitación para nuevas clínicas */}
            <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="flex items-center gap-4 text-left">
                <div className="size-14 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
                  <Building2 className="size-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">¿Diriges un Centro Médico o Grupo Hospitalario?</h4>
                  <p className="text-sm text-teal-100/80 mt-1">
                    Únete a la red de salud moderna. Gestionamos la migración de tus historias clínicas sin costo de bienvenida.
                  </p>
                </div>
              </div>
              <a
                href="#contacto"
                className="shrink-0 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-lg shadow-teal-500/20 transition-all hover:scale-105"
              >
                Solicitar Demostración Institucional
              </a>
            </div>
          </div>
        </section>
      )}


      {/* ========================================================================= */}
      {/* 8. TESTIMONIOS MÉDICOS                                                   */}
      {/* ========================================================================= */}
      <section id="testimonios" className="py-24 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 relative overflow-hidden">
        {/* Luz ambiental sutil */}
        <div className="absolute top-1/2 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 uppercase tracking-wider mb-3">
              <Award className="size-3.5" />
              <span>Opiniones Reales</span>
            </span>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Lo que dicen los médicos que usan MediSoft Suite
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="group p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5 glass-card-glow"
              >
                <div>
                  <div className="flex items-center gap-1 mb-4 text-amber-400">
                    {[...Array(t.rating || 5)].map((_, i) => (
                      <Star key={i} className="size-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed mb-6">
                    "{t.content}"
                  </p>
                </div>
                <div className="flex items-center gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <img
                    src={t.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100'}
                    alt={t.author}
                    className="size-12 rounded-full object-cover border-2 border-teal-500/40 shadow-sm group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {t.author}
                    </h5>
                    <p className="text-xs text-slate-500">
                      {t.role} • {t.clinic}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. PREGUNTAS FRECUENTES (FAQ)                                            */}
      {/* ========================================================================= */}
      <section id="faq" className="py-24 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 uppercase tracking-wider mb-3">
              <HelpCircle className="size-3.5" />
              <span>Resuelve tus Dudas</span>
            </span>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Preguntas Frecuentes
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'bg-white dark:bg-slate-900 border-teal-500/50 shadow-md ring-2 ring-teal-500/10'
                      : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
                  >
                    <span className={`font-bold text-base transition-colors ${isOpen ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`size-5 text-slate-400 transition-transform duration-300 shrink-0 ${
                        isOpen ? 'rotate-180 text-teal-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. BANNER CTA FINAL CON BEAM DE LUZ & RESPLANDOR                         */}
      {/* ========================================================================= */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="rounded-3xl p-10 sm:p-16 bg-gradient-to-r from-teal-700 via-cyan-700 to-emerald-700 text-white text-center shadow-2xl relative overflow-hidden border border-teal-400/30">
          {/* Ondas decorativas de fondo */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-5 backdrop-blur-md badge-beam-container">
              <span>{ctaBanner?.badge || '🚀 Comienza Hoy Mismo'}</span>
            </span>
            <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
              {ctaBanner?.title || '¿Listo para modernizar la gestión de tu centro médico?'}
            </h3>
            <p className="text-teal-100 text-base sm:text-lg mb-8 leading-relaxed font-normal">
              {ctaBanner?.subtitle ||
                'Únete a cientos de profesionales de la salud que ya optimizan su tiempo, reducen ausencias y brindan una mejor experiencia a sus pacientes.'}
            </p>
            <Link
              to={ctaBanner?.button_link || '/register'}
              className="inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl text-base font-bold text-teal-900 bg-white hover:bg-teal-50 shadow-2xl transition-all hover:scale-105 active:scale-95 group"
            >
              <span>{ctaBanner?.button_text || 'Registrar mi Clínica Gratis'}</span>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. SECCIÓN: FORMULARIO DE CONTACTO & ASESORÍA CLÍNICA                    */}
      {/* ========================================================================= */}
      <section id="contacto" className="py-24 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Información y Beneficios de Contacto */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase">
                  Atención Directa
                </span>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
                  ¿Tienes dudas o deseas una demostración personalizada?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mt-4 leading-relaxed text-sm sm:text-base">
                  Nuestro equipo de especialistas en tecnología médica está listo para asesorarte en la implementación de MediSoft Suite en tu consultorio o clínica.
                </p>
              </div>

              {/* Canales Rápidos */}
              <div className="space-y-4 pt-2">
                <a
                  href={`https://wa.me/${(contact?.whatsapp || '+584121234567').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 transition-colors group"
                >
                  <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare className="size-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">Chat Inmediato por WhatsApp</h5>
                    <p className="text-xs text-slate-500">{contact?.whatsapp || '+58 412 1234567'} • Respuesta en minutos</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="size-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Mail className="size-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">Correo Oficial</h5>
                    <p className="text-xs text-slate-500">{contact?.email || 'contacto@medisoft.theizerdev.com'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="size-12 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Phone className="size-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">Línea Telefónica</h5>
                    <p className="text-xs text-slate-500">{contact?.phone || '+58 212 555-0199'} • {contact?.schedule || 'Lun - Vie 8am-6pm'}</p>
                  </div>
                </div>
              </div>

              {/* Distintivos de confianza */}
              <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 text-xs text-teal-800 dark:text-teal-300 flex items-center gap-3">
                <ShieldCheck className="size-5 text-teal-600 shrink-0" />
                <span>Tratamiento confidencial de datos y acompañamiento técnico continuo para tu personal médico.</span>
              </div>
            </div>

            {/* Formulario Interactivo */}
            <div className="lg:col-span-7">
              <div className="p-8 sm:p-10 rounded-3xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                    Envíanos tu consulta
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Completa el formulario y te contactaremos en menos de 24 horas con toda la información requerida.
                  </p>
                </div>

                {contactSuccess ? (
                  <div className="p-8 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-center space-y-4">
                    <div className="size-14 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <h4 className="text-lg font-bold text-teal-900 dark:text-teal-200">
                      ¡Mensaje enviado con éxito!
                    </h4>
                    <p className="text-sm text-teal-700 dark:text-teal-300 max-w-md mx-auto">
                      Hemos recibido tu solicitud. Nuestro equipo de soporte y asesores médicos revisará tu requerimiento y se pondrá en contacto contigo pronto.
                    </p>
                    <button
                      onClick={() => setContactSuccess(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors inline-block"
                    >
                      Enviar otro mensaje
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nombre */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Nombre y Apellido <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.nombre}
                          onChange={(e) => setContactForm({ ...contactForm, nombre: e.target.value })}
                          placeholder="Dr. Juan Pérez"
                          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Correo Electrónico <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="doctor@miclinica.com"
                          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Teléfono / WhatsApp */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Teléfono o WhatsApp
                        </label>
                        <input
                          type="tel"
                          value={contactForm.telefono || ''}
                          onChange={(e) => setContactForm({ ...contactForm, telefono: e.target.value })}
                          placeholder="+58 412 0000000"
                          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        />
                      </div>

                      {/* Centro Médico / Especialidad */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Clínica o Especialidad
                        </label>
                        <input
                          type="text"
                          value={contactForm.institucion || ''}
                          onChange={(e) => setContactForm({ ...contactForm, institucion: e.target.value })}
                          placeholder="Ej. Centro Médico San José / Odontología"
                          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Mensaje */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mensaje o Consulta <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={contactForm.mensaje}
                        onChange={(e) => setContactForm({ ...contactForm, mensaje: e.target.value })}
                        placeholder="Escribe aquí tus dudas, requerimientos específicos para tu centro médico o solicita una demostración guiada..."
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Botón de Enviar */}
                    <button
                      type="submit"
                      disabled={contactSubmitting}
                      className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                    >
                      {contactSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Enviando consulta...</span>
                        </>
                      ) : (
                        <>
                          <Send className="size-4" />
                          <span>Enviar Mensaje de Contacto</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. FOOTER CORPORATIVO                                                    */}
      {/* ========================================================================= */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Columna Marca */}
            <div className="md:col-span-1">
              <img
                src="/medisoft_logo_dark.png"
                alt="MediSoft Suite"
                className="h-10 w-auto object-contain mb-4"
              />
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Plataforma integral en la nube para la gestión médica, agendas inteligentes, historia clínica y turneros digitales.
              </p>
              <div className="text-xs text-slate-500">
                © {new Date().getFullYear()} MediSoft Suite. Todos los derechos reservados.
              </div>
            </div>

            {/* Enlaces Rápidos */}
            <div>
              <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Navegación</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="#modulos" className="hover:text-white transition-colors">Módulos Clínicos</a></li>
                <li><a href="#especialidades" className="hover:text-white transition-colors">Especialidades</a></li>
                <li><a href="#planes" className="hover:text-white transition-colors">Planes y Precios</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Preguntas Frecuentes</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Ingresar al Sistema</Link></li>
              </ul>
            </div>

            {/* Módulos Destacados */}
            <div>
              <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Módulos</h5>
              <ul className="space-y-2 text-xs">
                <li><span>Agenda con FullCalendar</span></li>
                <li><span>Consultas EMR & CIE-10</span></li>
                <li><span>Odontograma 2D Interactivo</span></li>
                <li><span>Turnero en Pantalla con Audio</span></li>
                <li><span>WhatsApp Business Automático</span></li>
              </ul>
            </div>

            {/* Contacto Directo */}
            <div>
              <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Contacto & Soporte</h5>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-center gap-2">
                  <Phone className="size-4 text-teal-400 shrink-0" />
                  <span>{contact?.phone || '+58 212 555-0199'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-emerald-400 shrink-0" />
                  <a
                    href={`https://wa.me/${(contact?.whatsapp || '+584121234567').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors underline"
                  >
                    WhatsApp: {contact?.whatsapp || '+58 412 1234567'}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="size-4 text-teal-400 shrink-0" />
                  <span>{contact?.email || 'contacto@medisoft.theizerdev.com'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="size-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>{contact?.address || 'Torre Médica Titanium, Piso 5'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
