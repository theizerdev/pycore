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
} from 'lucide-react';
import { landingApi } from '../../api/landing';
import type { LandingContent } from '../../api/landing';
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
      <header className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Luces de fondo ambientales */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-40 dark:opacity-20 blur-3xl">
          <div className="w-[600px] h-[350px] bg-gradient-to-tr from-teal-400 to-emerald-500 rounded-full mx-auto" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge Píldora */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800/80 text-teal-700 dark:text-teal-300 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
              <Sparkles className="size-4 text-teal-600 dark:text-teal-400" />
              <span>{hero?.badge || '✨ Suite Médica Todo-en-Uno para Clínicas y Consultorios'}</span>
            </div>

            {/* Título Principal H1 */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
              {hero?.title || 'La Plataforma Médica en la Nube que Impulsa tu'}{' '}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                {hero?.title_highlight || 'Práctica Clínica y Hospitalaria'}
              </span>
            </h1>

            {/* Subtítulo Descriptivo */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
              {hero?.subtitle ||
                'Digitaliza tus consultas médicas, agenda inteligente, turnero en pantalla, odontograma y recordatorios por WhatsApp con la plataforma SaaS más avanzada y segura.'}
            </p>

            {/* Botones de Llamada a la Acción (CTA) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to={hero?.cta_primary_link || '/register'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 shadow-xl shadow-teal-500/25 transition-all hover:scale-[1.02]"
              >
                <span>{hero?.cta_primary_text || 'Comenzar Prueba Gratis'}</span>
                <ArrowRight className="size-5" />
              </Link>
              <a
                href={hero?.cta_secondary_link || '#modulos'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
              >
                <span>{hero?.cta_secondary_text || 'Explorar Módulos'}</span>
                <ChevronDown className="size-5" />
              </a>
            </div>

            {/* Métricas / Estadísticas Clave */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { val: hero?.stat_1_val || '+50,000', label: hero?.stat_1_label || 'Pacientes Atendidos' },
                { val: hero?.stat_2_val || '99.9%', label: hero?.stat_2_label || 'Disponibilidad Cloud' },
                { val: hero?.stat_3_val || '-65%', label: hero?.stat_3_label || 'Inasistencias con WhatsApp' },
                { val: hero?.stat_4_val || '+120', label: hero?.stat_4_label || 'Centros Médicos Activos' },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-sm text-center"
                >
                  <div className="text-2xl sm:text-3xl font-extrabold text-teal-600 dark:text-teal-400">
                    {stat.val}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maqueta Interactiva del Panel Clínico (Preview) */}
          <div className="mt-16 max-w-5xl mx-auto rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-slate-200 via-slate-100 to-transparent dark:from-slate-800 dark:via-slate-900 dark:to-transparent border border-slate-200 dark:border-slate-800 shadow-2xl">
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
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeTabPreview === 'agenda'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    Agenda Médica
                  </button>
                  <button
                    onClick={() => setActiveTabPreview('consulta')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeTabPreview === 'consulta'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    Expediente EMR
                  </button>
                  <button
                    onClick={() => setActiveTabPreview('turnero')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeTabPreview === 'turnero'
                        ? 'bg-teal-600 text-white'
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
                className="group relative p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                    {getDynamicIcon(feat.icon)}
                  </div>
                  {feat.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {feat.badge}
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {feat.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
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
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    {getDynamicIcon(spec.icon)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{spec.name}</h4>
                    {spec.badge && (
                      <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
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
                className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between text-center"
              >
                <div>
                  <div className="size-14 mx-auto mb-4 rounded-2xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    {getDynamicIcon(b.icon)}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{b.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {b.description}
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black text-teal-600 dark:text-teal-400">{b.stat}</div>
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
      {/* 7. TESTIMONIOS MÉDICOS                                                   */}
      {/* ========================================================================= */}
      <section id="testimonios" className="py-24 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase mb-2">
              Opiniones Reales
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Lo que dicen los médicos que usan MediSoft Suite
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
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
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <img
                    src={t.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100'}
                    alt={t.author}
                    className="size-11 rounded-full object-cover border border-teal-500/30"
                  />
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{t.author}</h5>
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
      <section id="faq" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase mb-2">
              Resuelve tus Dudas
            </h2>
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
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
                  >
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`size-5 text-slate-400 transition-transform duration-200 shrink-0 ${
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
      {/* 9. BANNER CTA FINAL                                                       */}
      {/* ========================================================================= */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-10 sm:p-16 bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-4">
              {ctaBanner?.badge || '🚀 Comienza Hoy Mismo'}
            </span>
            <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              {ctaBanner?.title || '¿Listo para modernizar la gestión de tu centro médico?'}
            </h3>
            <p className="text-teal-100 text-base sm:text-lg mb-8 leading-relaxed">
              {ctaBanner?.subtitle ||
                'Únete a cientos de profesionales de la salud que ya optimizan su tiempo, reducen ausencias y brindan una mejor experiencia a sus pacientes.'}
            </p>
            <Link
              to={ctaBanner?.button_link || '/register'}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-teal-900 bg-white hover:bg-teal-50 shadow-xl transition-all hover:scale-105"
            >
              <span>{ctaBanner?.button_text || 'Registrar mi Clínica Gratis'}</span>
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FOOTER CORPORATIVO                                                    */}
      {/* ========================================================================= */}
      <footer id="contacto" className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
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
