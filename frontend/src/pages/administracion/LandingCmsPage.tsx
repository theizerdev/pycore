import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  LayoutTemplate,
  Layers,
  HeartPulse,
  MessageSquare,
  Star,
  Phone,
  Settings,
  Inbox,
  Mail,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { landingApi } from '../../api/landing';
import type {
  LandingContent,
  FeatureItem,
  SpecialtyItem,
  TestimonialItem,
  FaqItem,
  ContactMessageItem,
} from '../../api/landing';
import { ModuleHeader } from '../../components/common/ModuleHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

export const LandingCmsPage: React.FC = () => {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'hero' | 'features' | 'specialties' | 'benefits' | 'testimonials' | 'faqs' | 'contact' | 'messages'
  >('hero');

  // Mensajes de contacto recibidos
  const [contactMessages, setContactMessages] = useState<ContactMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Modales
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureItem | null>(null);

  const [specialtyModalOpen, setSpecialtyModalOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<SpecialtyItem | null>(null);

  const [testimonialModalOpen, setTestimonialModalOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialItem | null>(null);

  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    fetchContent();
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const data = await landingApi.getContactMessages();
      setContactMessages(data);
    } catch {
      // Si no tiene permisos o error, silencioso
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleToggleMessageRead = async (id: number) => {
    try {
      const res = await landingApi.toggleMessageRead(id);
      setContactMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, leido: res.leido } : m))
      );
      toast.success(res.leido ? 'Marcado como leído' : 'Marcado como no leído');
    } catch {
      toast.error('Error al actualizar estado del mensaje');
    }
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      const data = await landingApi.getLandingContent();
      setContent(data);
    } catch (err: any) {
      toast.error('Error al cargar la configuración de la Landing Page');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!content) return;
    setSaving(true);
    try {
      const updated = await landingApi.updateLandingContent(content);
      setContent(updated);
      toast.success('¡Contenido de la Landing Page guardado y publicado con éxito!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar los cambios en la Landing Page');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setSaving(true);
    try {
      const resetData = await landingApi.resetLandingContent();
      setContent(resetData);
      toast.success('Contenido restaurado a los valores predeterminados');
    } catch (err: any) {
      toast.error('Error al restaurar el contenido por defecto');
    } finally {
      setSaving(false);
      setResetDialogOpen(false);
    }
  };

  // --- Manejadores de Módulos (Features) ---
  const handleSaveFeature = (feature: FeatureItem) => {
    if (!content) return;
    const exists = content.features.some((f) => f.id === feature.id);
    let updatedFeatures: FeatureItem[];
    if (exists) {
      updatedFeatures = content.features.map((f) => (f.id === feature.id ? feature : f));
    } else {
      updatedFeatures = [...content.features, feature];
    }
    setContent({ ...content, features: updatedFeatures });
    setFeatureModalOpen(false);
    setEditingFeature(null);
  };

  const handleDeleteFeature = (id: string) => {
    if (!content) return;
    setContent({
      ...content,
      features: content.features.filter((f) => f.id !== id),
    });
    toast.info('Módulo eliminado de la lista');
  };

  // --- Manejadores de Especialidades ---
  const handleSaveSpecialty = (specialty: SpecialtyItem) => {
    if (!content) return;
    const exists = content.specialties.some((s) => s.id === specialty.id);
    let updated: SpecialtyItem[];
    if (exists) {
      updated = content.specialties.map((s) => (s.id === specialty.id ? specialty : s));
    } else {
      updated = [...content.specialties, specialty];
    }
    setContent({ ...content, specialties: updated });
    setSpecialtyModalOpen(false);
    setEditingSpecialty(null);
  };

  const handleDeleteSpecialty = (id: string) => {
    if (!content) return;
    setContent({
      ...content,
      specialties: content.specialties.filter((s) => s.id !== id),
    });
    toast.info('Especialidad eliminada');
  };

  // --- Manejadores de Testimonios ---
  const handleSaveTestimonial = (testimonial: TestimonialItem) => {
    if (!content) return;
    const exists = content.testimonials.some((t) => t.id === testimonial.id);
    let updated: TestimonialItem[];
    if (exists) {
      updated = content.testimonials.map((t) => (t.id === testimonial.id ? testimonial : t));
    } else {
      updated = [...content.testimonials, testimonial];
    }
    setContent({ ...content, testimonials: updated });
    setTestimonialModalOpen(false);
    setEditingTestimonial(null);
  };

  const handleDeleteTestimonial = (id: string) => {
    if (!content) return;
    setContent({
      ...content,
      testimonials: content.testimonials.filter((t) => t.id !== id),
    });
    toast.info('Testimonio eliminado');
  };

  // --- Manejadores de FAQs ---
  const handleSaveFaq = (faq: FaqItem) => {
    if (!content) return;
    const exists = content.faqs.some((f) => f.id === faq.id);
    let updated: FaqItem[];
    if (exists) {
      updated = content.faqs.map((f) => (f.id === faq.id ? faq : f));
    } else {
      updated = [...content.faqs, faq];
    }
    setContent({ ...content, faqs: updated });
    setFaqModalOpen(false);
    setEditingFaq(null);
  };

  const handleDeleteFaq = (id: string) => {
    if (!content) return;
    setContent({
      ...content,
      faqs: content.faqs.filter((f) => f.id !== id),
    });
    toast.info('Pregunta frecuente eliminada');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-600" />
          <span className="text-sm text-slate-500 font-medium">Cargando gestor de contenidos (CMS)...</span>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="size-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold">No se pudo cargar la configuración de la Landing Page</h3>
        <button
          onClick={fetchContent}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Cabecera del Módulo */}
      <ModuleHeader
        icon={<Sparkles className="size-6 text-white" />}
        title="Gestor de Contenido de Landing Page (CMS)"
        description="Administra, crea, modifica y elimina el contenido público que ven tus futuros clientes en medisoft.theizerdev.com"
      >
        <div className="flex items-center gap-2">
          <a
            href="/landing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <ExternalLink className="size-4" />
            <span>Ver Landing en Vivo</span>
          </a>
          <button
            onClick={() => setResetDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-rose-100 bg-rose-500/30 hover:bg-rose-500/40 transition-colors"
            title="Restaurar contenidos iniciales"
          >
            <RotateCcw className="size-4" />
            <span>Restaurar</span>
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-teal-900 bg-white hover:bg-teal-50 shadow-md transition-all disabled:opacity-50"
          >
            <Save className="size-4" />
            <span>{saving ? 'Guardando...' : 'Publicar Cambios'}</span>
          </button>
        </div>
      </ModuleHeader>

      {/* Selector de Pestañas de Secciones */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {[
          { id: 'hero', label: '1. Hero & Cabecera', icon: LayoutTemplate },
          { id: 'features', label: '2. Módulos Clínicos', icon: Layers },
          { id: 'specialties', label: '3. Especialidades', icon: HeartPulse },
          { id: 'benefits', label: '4. Ventajas & Métricas', icon: CheckCircle2 },
          { id: 'testimonials', label: '5. Testimonios Médicos', icon: Star },
          { id: 'faqs', label: '6. Preguntas FAQ', icon: HelpCircle },
          { id: 'contact', label: '7. Configuración Contacto', icon: Phone },
          { id: 'messages', label: '8. Mensajes Recibidos', icon: Inbox },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const unreadCount = contactMessages.filter((m) => !m.leido).length;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'messages') fetchMessages();
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: HERO & CABECERA                                                */}
      {/* ========================================================================= */}
      {activeTab === 'hero' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutTemplate className="size-5 text-teal-600" />
            <span>Configuración de la Cabecera Principal (Hero)</span>
          </h3>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Badge Superior (Píldora destacada)
              </label>
              <input
                type="text"
                value={content.hero.badge}
                onChange={(e) =>
                  setContent({ ...content, hero: { ...content.hero, badge: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Título Principal
              </label>
              <input
                type="text"
                value={content.hero.title}
                onChange={(e) =>
                  setContent({ ...content, hero: { ...content.hero, title: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Texto Resaltado en Gradiente
              </label>
              <input
                type="text"
                value={content.hero.title_highlight}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, title_highlight: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Subtítulo Descriptivo
              </label>
              <textarea
                rows={3}
                value={content.hero.subtitle}
                onChange={(e) =>
                  setContent({ ...content, hero: { ...content.hero, subtitle: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Texto Botón Primario (CTA)
              </label>
              <input
                type="text"
                value={content.hero.cta_primary_text}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, cta_primary_text: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Enlace Botón Primario
              </label>
              <input
                type="text"
                value={content.hero.cta_primary_link}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, cta_primary_link: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          {/* Métricas / Estadísticas del Hero */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Estadísticas / Métricas Destacadas
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((num) => {
                const valKey = `stat_${num}_val` as keyof typeof content.hero;
                const labelKey = `stat_${num}_label` as keyof typeof content.hero;
                return (
                  <div key={num} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Métrica #{num}</label>
                    <input
                      type="text"
                      placeholder="+50,000"
                      value={content.hero[valKey] as string}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          hero: { ...content.hero, [valKey]: e.target.value },
                        })
                      }
                      className="w-full font-bold text-base bg-transparent border-b border-slate-300 dark:border-slate-700 text-teal-600 focus:outline-none mb-2"
                    />
                    <input
                      type="text"
                      placeholder="Etiqueta"
                      value={content.hero[labelKey] as string}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          hero: { ...content.hero, [labelKey]: e.target.value },
                        })
                      }
                      className="w-full text-xs text-slate-600 dark:text-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: MÓDULOS CLÍNICOS (FEATURES)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'features' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Módulos y Funcionalidades del Sistema ({content.features.length})
              </h3>
              <p className="text-xs text-slate-500">
                Agrega, edita o desactiva las tarjetas clínicas que se muestran en la Landing Page.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingFeature({
                  id: `mod-${Date.now()}`,
                  title: '',
                  description: '',
                  icon: 'Stethoscope',
                  badge: 'Nuevo',
                  category: 'Asistencial',
                  enabled: true,
                });
                setFeatureModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              <Plus className="size-4" />
              <span>Añadir Módulo</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.features.map((feat) => (
              <div
                key={feat.id}
                className={`p-4 rounded-xl border transition-all ${
                  feat.enabled
                    ? 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800'
                    : 'bg-slate-100/50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 dark:bg-teal-950 text-teal-600">
                    {feat.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setContent({
                          ...content,
                          features: content.features.map((f) =>
                            f.id === feat.id ? { ...f, enabled: !f.enabled } : f
                          ),
                        });
                      }}
                      className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                        feat.enabled
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {feat.enabled ? 'Activo' : 'Oculto'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingFeature(feat);
                        setFeatureModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFeature(feat.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{feat.title}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{feat.description}</p>
                <div className="mt-2 text-[10px] text-slate-400 font-mono">Icono: {feat.icon}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: ESPECIALIDADES MÉDICAS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'specialties' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Especialidades Destacadas ({content.specialties.length})
              </h3>
              <p className="text-xs text-slate-500">
                Personaliza las especialidades médicas que aparecen en la sección informativa.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingSpecialty({
                  id: `spec-${Date.now()}`,
                  name: '',
                  description: '',
                  icon: 'HeartPulse',
                  badge: 'Especializada',
                  enabled: true,
                });
                setSpecialtyModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              <Plus className="size-4" />
              <span>Añadir Especialidad</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {content.specialties.map((spec) => (
              <div
                key={spec.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-600">{spec.badge}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSpecialty(spec);
                        setSpecialtyModalOpen(true);
                      }}
                      className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSpecialty(spec.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{spec.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{spec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: VENTAJAS & PROPUESTA DE VALOR                                  */}
      {/* ========================================================================= */}
      {activeTab === 'benefits' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Ventajas Competitivas & Propuesta de Valor
            </h3>
            <p className="text-xs text-slate-500">
              Modifica los 4 pilares de impacto y sus porcentajes o métricas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {content.benefits.map((b, idx) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-teal-600">Pilar #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Métrica (ej: -65%)"
                      value={b.stat}
                      onChange={(e) => {
                        const updated = [...content.benefits];
                        updated[idx].stat = e.target.value;
                        setContent({ ...content, benefits: updated });
                      }}
                      className="px-2 py-1 rounded-lg text-xs font-extrabold text-teal-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center w-24"
                    />
                    <input
                      type="text"
                      placeholder="Etiqueta"
                      value={b.stat_label}
                      onChange={(e) => {
                        const updated = [...content.benefits];
                        updated[idx].stat_label = e.target.value;
                        setContent({ ...content, benefits: updated });
                      }}
                      className="px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-32"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) => {
                    const updated = [...content.benefits];
                    updated[idx].title = e.target.value;
                    setContent({ ...content, benefits: updated });
                  }}
                  className="w-full text-sm font-bold bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                />
                <textarea
                  rows={2}
                  value={b.description}
                  onChange={(e) => {
                    const updated = [...content.benefits];
                    updated[idx].description = e.target.value;
                    setContent({ ...content, benefits: updated });
                  }}
                  className="w-full text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 5: TESTIMONIOS MÉDICOS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'testimonials' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Testimonios de Médicos y Clínicas ({content.testimonials.length})
              </h3>
              <p className="text-xs text-slate-500">
                Gestiona las opiniones y casos de éxito mostrados en la Landing Page.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTestimonial({
                  id: `test-${Date.now()}`,
                  author: '',
                  role: 'Médico Tratante',
                  clinic: '',
                  rating: 5,
                  content: '',
                  avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
                  enabled: true,
                });
                setTestimonialModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              <Plus className="size-4" />
              <span>Añadir Testimonio</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {content.testimonials.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex text-amber-400">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTestimonial(t);
                          setTestimonialModalOpen(true);
                        }}
                        className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTestimonial(t.id)}
                        className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic mb-4">
                    "{t.content}"
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <img
                    src={t.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100'}
                    alt={t.author}
                    className="size-9 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">{t.author}</h5>
                    <p className="text-[11px] text-slate-500">
                      {t.role} • {t.clinic}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 6: PREGUNTAS FRECUENTES (FAQ)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'faqs' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Preguntas Frecuentes (FAQ) ({content.faqs.length})
              </h3>
              <p className="text-xs text-slate-500">
                Agrega respuestas claras a las dudas habituales de directores y médicos.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingFaq({
                  id: `faq-${Date.now()}`,
                  question: '',
                  answer: '',
                  category: 'General',
                  enabled: true,
                });
                setFaqModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              <Plus className="size-4" />
              <span>Añadir Pregunta</span>
            </button>
          </div>

          <div className="space-y-3">
            {content.faqs.map((faq) => (
              <div
                key={faq.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {faq.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{faq.question}</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingFaq(faq);
                      setFaqModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 7: CONTACTO & FOOTER                                              */}
      {/* ========================================================================= */}
      {activeTab === 'contact' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Información de Contacto y Pie de Página
          </h3>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                WhatsApp Oficial de Ventas (Formato internacional)
              </label>
              <input
                type="text"
                value={content.contact.whatsapp}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, whatsapp: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Teléfono de Atención
              </label>
              <input
                type="text"
                value={content.contact.phone}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, phone: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Correo Electrónico de Contacto
              </label>
              <input
                type="email"
                value={content.contact.email}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, email: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Horario de Atención
              </label>
              <input
                type="text"
                value={content.contact.schedule}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, schedule: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Dirección Física
              </label>
              <input
                type="text"
                value={content.contact.address}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, address: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 8: MENSAJES DE CONTACTO RECIBIDOS                                 */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Inbox className="size-5 text-teal-600" />
                <span>Bandeja de Mensajes de la Landing Page</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Médicos, especialistas y clínicas que han completado el formulario de contacto público.
              </p>
            </div>
            <button
              onClick={fetchMessages}
              disabled={loadingMessages}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className={`size-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
              <span>Actualizar Bandeja</span>
            </button>
          </div>

          {loadingMessages ? (
            <div className="py-12 text-center text-xs text-slate-500">Cargando mensajes recibidos...</div>
          ) : contactMessages.length === 0 ? (
            <div className="py-16 text-center">
              <Mail className="size-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                No hay mensajes aún
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Cuando los visitantes de la landing page envíen una consulta, aparecerán listados aquí en tiempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contactMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    msg.leido
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                      : 'bg-teal-500/5 dark:bg-teal-500/10 border-teal-500/30 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`size-2.5 rounded-full ${
                          msg.leido ? 'bg-slate-400' : 'bg-teal-500 animate-ping'
                        }`}
                      />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {msg.nombre}
                      </h4>
                      {msg.institucion && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {msg.institucion}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">
                        {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Reciente'}
                      </span>
                      <button
                        onClick={() => handleToggleMessageRead(msg.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          msg.leido
                            ? 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        <Check className="size-3" />
                        <span>{msg.leido ? 'Marcar No Leído' : 'Marcar Leído'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Datos de contacto */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3.5 text-teal-600" />
                      <a href={`mailto:${msg.email}`} className="hover:underline text-teal-600 dark:text-teal-400 font-medium">
                        {msg.email}
                      </a>
                    </div>
                    {msg.telefono && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3.5 text-emerald-600" />
                        <a
                          href={`https://wa.me/${msg.telefono.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-emerald-600 dark:text-emerald-400 font-medium"
                        >
                          {msg.telefono} (WhatsApp)
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Mensaje */}
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    {msg.mensaje}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AÑADIR / EDITAR MÓDULO (FEATURE)                                   */}
      {/* ========================================================================= */}
      {featureModalOpen && editingFeature && (
        <Dialog open={featureModalOpen} onOpenChange={setFeatureModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {content.features.some((f) => f.id === editingFeature.id)
                  ? 'Editar Módulo'
                  : 'Añadir Nuevo Módulo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Título del Módulo
                </label>
                <input
                  type="text"
                  value={editingFeature.title}
                  onChange={(e) => setEditingFeature({ ...editingFeature, title: e.target.value })}
                  placeholder="Ej. Odontograma 2D Interactivo"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Categoría
                </label>
                <select
                  value={editingFeature.category}
                  onChange={(e) =>
                    setEditingFeature({ ...editingFeature, category: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                >
                  <option value="Asistencial">Asistencial</option>
                  <option value="Especialidades">Especialidades</option>
                  <option value="Recepción">Recepción</option>
                  <option value="Pacientes">Pacientes</option>
                  <option value="Comunicación">Comunicación</option>
                  <option value="Gestión">Gestión</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Badge / Etiqueta Píldora
                </label>
                <input
                  type="text"
                  value={editingFeature.badge || ''}
                  onChange={(e) => setEditingFeature({ ...editingFeature, badge: e.target.value })}
                  placeholder="Ej. FullCalendar, Exclusivo, En Vivo"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Icono (Nombre Lucide)
                </label>
                <select
                  value={editingFeature.icon}
                  onChange={(e) => setEditingFeature({ ...editingFeature, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono"
                >
                  <option value="CalendarDays">CalendarDays (Agenda)</option>
                  <option value="Stethoscope">Stethoscope (Consultas)</option>
                  <option value="Activity">Activity (Odontograma/Monitoreo)</option>
                  <option value="Tv">Tv (Turnero en Pantalla)</option>
                  <option value="QrCode">QrCode (Preconsulta)</option>
                  <option value="MessageSquare">MessageSquare (WhatsApp)</option>
                  <option value="Mic">Mic (Notas de Voz)</option>
                  <option value="Building2">Building2 (Multi-Sede)</option>
                  <option value="HeartPulse">HeartPulse (Salud)</option>
                  <option value="Sparkles">Sparkles (Inteligencia)</option>
                  <option value="ShieldCheck">ShieldCheck (Seguridad)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Descripción Detallada
                </label>
                <textarea
                  rows={3}
                  value={editingFeature.description}
                  onChange={(e) =>
                    setEditingFeature({ ...editingFeature, description: e.target.value })
                  }
                  placeholder="Describe qué beneficios y funciones ofrece este módulo..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setFeatureModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveFeature(editingFeature)}
                disabled={!editingFeature.title.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white disabled:opacity-50"
              >
                Guardar Módulo
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AÑADIR / EDITAR ESPECIALIDAD                                       */}
      {/* ========================================================================= */}
      {specialtyModalOpen && editingSpecialty && (
        <Dialog open={specialtyModalOpen} onOpenChange={setSpecialtyModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {content.specialties.some((s) => s.id === editingSpecialty.id)
                  ? 'Editar Especialidad'
                  : 'Añadir Especialidad'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Nombre de la Especialidad
                </label>
                <input
                  type="text"
                  value={editingSpecialty.name}
                  onChange={(e) =>
                    setEditingSpecialty({ ...editingSpecialty, name: e.target.value })
                  }
                  placeholder="Ej. Ginecología y Obstetricia"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Etiqueta / Badge
                </label>
                <input
                  type="text"
                  value={editingSpecialty.badge || ''}
                  onChange={(e) =>
                    setEditingSpecialty({ ...editingSpecialty, badge: e.target.value })
                  }
                  placeholder="Ej. Especializada, Quirúrgica"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={editingSpecialty.description}
                  onChange={(e) =>
                    setEditingSpecialty({ ...editingSpecialty, description: e.target.value })
                  }
                  placeholder="Descripción de la atención..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setSpecialtyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveSpecialty(editingSpecialty)}
                disabled={!editingSpecialty.name.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white disabled:opacity-50"
              >
                Guardar Especialidad
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AÑADIR / EDITAR TESTIMONIO                                         */}
      {/* ========================================================================= */}
      {testimonialModalOpen && editingTestimonial && (
        <Dialog open={testimonialModalOpen} onOpenChange={setTestimonialModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {content.testimonials.some((t) => t.id === editingTestimonial.id)
                  ? 'Editar Testimonio'
                  : 'Añadir Testimonio'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Nombre del Médico / Director
                </label>
                <input
                  type="text"
                  value={editingTestimonial.author}
                  onChange={(e) =>
                    setEditingTestimonial({ ...editingTestimonial, author: e.target.value })
                  }
                  placeholder="Dra. Mariana Valenzuela"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Cargo / Especialidad
                </label>
                <input
                  type="text"
                  value={editingTestimonial.role}
                  onChange={(e) =>
                    setEditingTestimonial({ ...editingTestimonial, role: e.target.value })
                  }
                  placeholder="Directora Médica"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Clínica o Centro Médico
                </label>
                <input
                  type="text"
                  value={editingTestimonial.clinic}
                  onChange={(e) =>
                    setEditingTestimonial({ ...editingTestimonial, clinic: e.target.value })
                  }
                  placeholder="Centro Médico Las Mercedes"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  URL de Foto / Avatar
                </label>
                <input
                  type="text"
                  value={editingTestimonial.avatar_url || ''}
                  onChange={(e) =>
                    setEditingTestimonial({ ...editingTestimonial, avatar_url: e.target.value })
                  }
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Testimonio / Reseña
                </label>
                <textarea
                  rows={3}
                  value={editingTestimonial.content}
                  onChange={(e) =>
                    setEditingTestimonial({ ...editingTestimonial, content: e.target.value })
                  }
                  placeholder="Escribe el comentario del doctor..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setTestimonialModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveTestimonial(editingTestimonial)}
                disabled={!editingTestimonial.author.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white disabled:opacity-50"
              >
                Guardar Testimonio
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AÑADIR / EDITAR FAQ                                                */}
      {/* ========================================================================= */}
      {faqModalOpen && editingFaq && (
        <Dialog open={faqModalOpen} onOpenChange={setFaqModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {content.faqs.some((f) => f.id === editingFaq.id) ? 'Editar FAQ' : 'Añadir FAQ'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Pregunta
                </label>
                <input
                  type="text"
                  value={editingFaq.question}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  placeholder="¿Cómo funciona...?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Categoría
                </label>
                <input
                  type="text"
                  value={editingFaq.category}
                  onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                  placeholder="General, Clínico, WhatsApp, Seguridad"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Respuesta
                </label>
                <textarea
                  rows={4}
                  value={editingFaq.answer}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  placeholder="Redacta la respuesta explicativa..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setFaqModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveFaq(editingFaq)}
                disabled={!editingFaq.question.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white disabled:opacity-50"
              >
                Guardar Pregunta
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* DIÁLOGO: RESTAURAR POR DEFECTO                                            */}
      {/* ========================================================================= */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar contenidos por defecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción restablecerá todas las secciones, módulos, especialidades y textos de la
              Landing Page a los valores oficiales iniciales del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetDefaults}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Sí, restaurar por defecto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LandingCmsPage;
