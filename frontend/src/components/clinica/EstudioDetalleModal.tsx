import React, { useState } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Contrast,
  Download,
  Sparkles,
  FlaskConical,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  UserCheck,
  Stethoscope,
  Eye,
  ShieldAlert,
  FileText,
  MessageSquare,
  Cpu,
  Calculator,
  ScanText,
  Activity,
  PlusCircle,
  Copy,
  Check,
  Ruler,
  Award,
  Siren,
  Pencil,
  Save,
  Brain,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { estudiosApi, type EstudioAdjunto, type SindromeDetectado } from '../../api/estudios';
import { cn } from '../../lib/utils';

interface EstudioDetalleModalProps {
  estudioId: number | null;
  open: boolean;
  onClose: () => void;
  onEstudioUpdated?: () => void;
  onApplyDiagnosticoPrincipal?: (texto: string) => void;
  onAddDiagnosticoSecundario?: (texto: string) => void;
}

const EXTRACTION_METHOD_LABELS: Record<string, string> = {
  pdfplumber_tables: 'Tablas PDF Nativas',
  pdfplumber_text: 'Texto PDF Estructurado',
  pypdf_text: 'Texto PDF Local',
  rapidocr_image: 'OCR Neuronal (Foto)',
  rapidocr_scanned_pdf: 'OCR Neuronal (PDF Escaneado)',
  visual_image_only: 'Placa Visual (Sin Texto)',
};

const SEVERITY_BADGE_STYLES: Record<string, string> = {
  critico: 'bg-red-600 text-white border-red-600',
  alto: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
  moderado: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  leve: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
  informativo: 'bg-muted text-muted-foreground border-border',
};

export const EstudioDetalleModal: React.FC<EstudioDetalleModalProps> = ({
  estudioId,
  open,
  onClose,
  onEstudioUpdated,
  onApplyDiagnosticoPrincipal,
  onAddDiagnosticoSecundario,
}) => {
  const [estudio, setEstudio] = useState<EstudioAdjunto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzingBot, setAnalyzingBot] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Estados para el visor de imagenología
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [invertContrast, setInvertContrast] = useState<boolean>(false);

  // Edición / validación médica de hallazgos radiológicos
  const [editingReport, setEditingReport] = useState<boolean>(false);
  const [savingReport, setSavingReport] = useState<boolean>(false);
  const [editRegion, setEditRegion] = useState<string>('');
  const [editHallazgos, setEditHallazgos] = useState<string>('');
  const [editConclusion, setEditConclusion] = useState<string>('');
  const [editRecomendaciones, setEditRecomendaciones] = useState<string>('');

  React.useEffect(() => {
    if (!estudioId || !open) {
      setEstudio(null);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await estudiosApi.obtenerDetalle(estudioId);
        setEstudio(data);
      } catch {
        toast.error('Error al cargar la información del estudio');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadData();
    setZoomLevel(1);
    setRotation(0);
    setInvertContrast(false);
    setEditingReport(false);
  }, [estudioId, open]);

  const handleStartEditReport = () => {
    setEditRegion(estudio?.datos_imagenologia?.region_anatomica || '');
    setEditHallazgos(estudio?.datos_imagenologia?.hallazgos || '');
    setEditConclusion(estudio?.datos_imagenologia?.conclusion || '');
    setEditRecomendaciones(estudio?.datos_imagenologia?.recomendaciones || '');
    setEditingReport(true);
  };

  const handleSaveReportValidation = async () => {
    if (!estudio) return;
    setSavingReport(true);
    try {
      const updatedImg = {
        ...(estudio.datos_imagenologia || {}),
        region_anatomica: editRegion.trim() || estudio.datos_imagenologia?.region_anatomica,
        hallazgos: editHallazgos.trim(),
        conclusion: editConclusion.trim(),
        recomendaciones: editRecomendaciones.trim(),
      };
      await estudiosApi.actualizar(estudio.id, {
        datos_imagenologia: updatedImg,
        estado_analisis: 'revisado_medico',
      });
      setEstudio((prev) =>
        prev
          ? {
              ...prev,
              datos_imagenologia: updatedImg,
              estado_analisis: 'revisado_medico',
            }
          : null
      );
      setEditingReport(false);
      toast.success('Informe radiológico validado y guardado en la historia clínica');
      onEstudioUpdated?.();
    } catch {
      toast.error('No se pudo guardar la validación del informe');
    } finally {
      setSavingReport(false);
    }
  };

  const handleEjecutarBot = async () => {
    if (!estudio) return;
    setAnalyzingBot(true);
    try {
      const res = await estudiosApi.reanalizarConBot(estudio.id);
      setEstudio((prev) =>
        prev
          ? {
              ...prev,
              titulo: res.titulo || prev.titulo,
              categoria: res.categoria || prev.categoria,
              valores_laboratorio: res.valores_laboratorio ?? prev.valores_laboratorio,
              datos_imagenologia: res.datos_imagenologia ?? prev.datos_imagenologia,
              alertas_detectadas: res.alertas_detectadas || prev.alertas_detectadas,
              interpretacion_clinica: res.interpretacion_clinica || prev.interpretacion_clinica,
              estado_analisis: res.estado_analisis || prev.estado_analisis,
              analisis_agente: res.analisis_agente ?? prev.analisis_agente,
            }
          : null
      );

      toast.success('Análisis actualizado por MediCore AI Local');
      onEstudioUpdated?.();
    } catch {
      toast.error('Ocurrió un error al ejecutar el Agente Clínico');
    } finally {
      setAnalyzingBot(false);
    }
  };

  const handleCopyCie10 = (code: string, desc: string) => {
    const label = `${code} - ${desc}`;
    navigator.clipboard?.writeText(label);
    setCopiedCode(code);
    toast.success(`Copiado: ${label}`);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  if (!open) return null;

  const agente = estudio?.analisis_agente;
  const criticalAlerts = agente?.critical_alerts || [];
  const calculos = agente?.calculos_derivados || [];
  const sindromes: SindromeDetectado[] = agente?.sindromes_detectados || [];
  const cualitativos = agente?.hallazgos_cualitativos || [];
  const escalas = agente?.escalas_detectadas || [];
  const medidas = agente?.medidas_detectadas || [];
  const methodLabel = agente?.vision_radiologica
    ? `Visión Neuronal (${agente.vision_radiologica.modelo_usado || 'ONNX'})`
    : agente?.extraction_method
    ? EXTRACTION_METHOD_LABELS[agente.extraction_method] || agente.extraction_method
    : null;
  const isPdf =
    Boolean(estudio?.archivo_tipo?.toLowerCase().includes('pdf')) ||
    Boolean(estudio?.archivo_url?.startsWith('data:application/pdf'));

  const renderSyndromeCard = (s: SindromeDetectado, idx: number) => {
    const diagText = `${s.codigo_cie10} - ${s.nombre}`;
    return (
      <div
        key={`${s.codigo_cie10}-${idx}`}
        className={cn(
          'rounded-xl border p-3.5 space-y-2 bg-card shadow-2xs',
          s.severidad === 'critico'
            ? 'border-red-500/50 bg-red-500/[0.04]'
            : s.severidad === 'alto'
            ? 'border-rose-500/35 bg-rose-500/[0.03]'
            : 'border-border'
        )}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="font-mono text-[11px] font-bold bg-primary/15 text-primary border border-primary/30">
              CIE-10: {s.codigo_cie10}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px] uppercase font-bold', SEVERITY_BADGE_STYLES[s.severidad] || SEVERITY_BADGE_STYLES.informativo)}
            >
              {s.severidad}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {onApplyDiagnosticoPrincipal && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onApplyDiagnosticoPrincipal(diagText)}
                className="h-6 px-2 text-[10px] gap-1 font-semibold cursor-pointer border-primary/40 text-primary hover:bg-primary/10"
                title="Establecer como Diagnóstico Principal en el Paso 6"
              >
                <Stethoscope className="size-3" />
                Dx Principal
              </Button>
            )}
            {onAddDiagnosticoSecundario && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onAddDiagnosticoSecundario(diagText)}
                className="h-6 px-2 text-[10px] gap-1 font-semibold cursor-pointer"
                title="Agregar a Diagnósticos Secundarios en el Paso 6"
              >
                <PlusCircle className="size-3" />
                + Secundario
              </Button>
            )}
            {!onApplyDiagnosticoPrincipal && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleCopyCie10(s.codigo_cie10, s.nombre)}
                className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
              >
                {copiedCode === s.codigo_cie10 ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                Copiar
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs font-bold text-foreground leading-snug">{s.nombre}</p>

        {s.evidencia && s.evidencia.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {s.evidencia.map((ev, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
              >
                {ev}
              </span>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-2">
          <strong className="text-foreground">Conducta orientativa:</strong> {s.conducta_sugerida}
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex flex-col p-0 gap-0 overflow-hidden bg-card text-foreground"
      >
        {/* HEADER PANTALLA COMPLETA */}
        <div className="bg-muted/40 border-b border-border px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0 cursor-pointer bg-card hover:bg-muted"
              title="Volver a la consulta (Esc)"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Volver</span>
            </Button>

            <div
              className={cn(
                'p-2.5 rounded-xl border shadow-xs shrink-0',
                estudio?.categoria === 'laboratorio'
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                  : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
              )}
            >
              {estudio?.categoria === 'laboratorio' ? (
                <FlaskConical className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ) : (
                <ImageIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                <span className="truncate">{estudio?.titulo || 'Visor de Estudio Médico'}</span>

                {estudio?.origen === 'whatsapp' && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Vía WhatsApp
                  </Badge>
                )}

                {criticalAlerts.length > 0 && (
                  <Badge className="bg-red-600 text-white text-[11px] gap-1 animate-pulse">
                    <Siren className="w-3 h-3" />
                    Valor Crítico
                  </Badge>
                )}

                {estudio?.estado_analisis === 'analizado_alterado' ? (
                  <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 text-[11px] gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Hallazgos Alterados
                  </Badge>
                ) : estudio?.estado_analisis === 'pendiente' ? (
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[11px] gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Revisión Médica
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[11px] gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Normal
                  </Badge>
                )}
              </DialogTitle>

              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                  <Cpu className="size-3" />
                  {agente?.agent_name || 'MediCore AI Local'} v{agente?.agent_version || '2.0'}
                </span>
                {methodLabel && (
                  <>
                    <span>•</span>
                    <span>{methodLabel}</span>
                  </>
                )}
                {agente?.vision_radiologica && typeof agente.vision_radiologica.region_confianza === 'number' ? (
                  <>
                    <span>•</span>
                    <span>Confianza Visión: {Math.round(agente.vision_radiologica.region_confianza)}%</span>
                  </>
                ) : typeof agente?.ocr_confidence === 'number' ? (
                  <>
                    <span>•</span>
                    <span>Confianza OCR: {Math.round(agente.ocr_confidence * 100)}%</span>
                  </>
                ) : null}
                {typeof agente?.processing_ms === 'number' && (
                  <>
                    <span>•</span>
                    <span>{(agente.processing_ms / 1000).toFixed(2)}s</span>
                  </>
                )}
                <span>•</span>
                <span>{estudio?.fecha_estudio}</span>
                {estudio?.whatsapp_remitente && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {estudio.whatsapp_remitente}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>

          {/* ACCIONES SUPERIORES */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              disabled={analyzingBot}
              onClick={handleEjecutarBot}
              className="text-xs gap-1.5 h-8 cursor-pointer font-semibold border-primary/30 hover:bg-primary/10"
            >
              <Sparkles className={cn('w-3.5 h-3.5 text-primary', analyzingBot && 'animate-spin')} />
              <span className="hidden sm:inline">{analyzingBot ? 'Procesando...' : 'Re-analizar con MediCore AI'}</span>
              <span className="sm:hidden">{analyzingBot ? '...' : 'Re-analizar'}</span>
            </Button>

            {estudio?.archivo_url && (
              <a
                href={estudio.archivo_url}
                download={estudio.archivo_nombre || 'estudio_medico'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
                title="Descargar archivo original"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Descargar</span>
              </a>
            )}
          </div>
        </div>

        {/* BANNER DE ALERTAS CRÍTICAS DE PÁNICO CLÍNICO */}
        {criticalAlerts.length > 0 && (
          <div className="bg-red-600 text-white px-6 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
              <Siren className="size-4 animate-bounce" />
              <span>Prioridad Clínica Inmediata:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {criticalAlerts.map((c, idx) => (
                <span key={idx} className="px-2.5 py-0.5 rounded-md bg-white/15 text-white text-xs font-semibold">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CUERPO DEL MODAL */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Cargando análisis de MediCore AI Local...</p>
            </div>
          ) : !estudio ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <p className="text-sm">No se encontró la información del estudio.</p>
            </div>
          ) : estudio.categoria === 'laboratorio' ? (
            /* ========================================================== */
            /* VISTA DE LABORATORIO (CON TABS RADIX UI)                   */
            /* ========================================================== */
            <Tabs defaultValue="clinico" className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap shrink-0">
                <TabsList className="bg-muted/60">
                  <TabsTrigger value="clinico" className="text-xs gap-1.5 cursor-pointer">
                    <FlaskConical className="size-3.5" />
                    Análisis Clínico ({estudio.valores_laboratorio?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="documento" className="text-xs gap-1.5 cursor-pointer">
                    <FileText className="size-3.5" />
                    Documento Original
                  </TabsTrigger>
                  <TabsTrigger value="auditoria" className="text-xs gap-1.5 cursor-pointer">
                    <ScanText className="size-3.5" />
                    Auditoría OCR / Texto
                  </TabsTrigger>
                </TabsList>

                {agente?.patient_context_applied?.rangos_personalizados && (
                  <Badge variant="outline" className="text-[11px] gap-1 border-primary/30 text-primary bg-primary/5">
                    <UserCheck className="size-3" />
                    Rangos ajustados a paciente (
                    {agente.patient_context_applied.genero === 'F'
                      ? 'Femenino'
                      : agente.patient_context_applied.genero === 'M'
                      ? 'Masculino'
                      : 'N/E'}
                    {agente.patient_context_applied.edad != null ? `, ${agente.patient_context_applied.edad} años` : ''})
                  </Badge>
                )}
              </div>

              {/* TAB 1: ANÁLISIS CLÍNICO COMPLETO */}
              <TabsContent value="clinico" className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-5 mt-0">
                {/* Síndromes Correlacionados y CIE-10 Sugeridos */}
                {sindromes.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Activity className="size-4" />
                        Correlación Sindrómica & Sugerencias CIE-10 ({sindromes.length})
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        Orientación clínica automática — validación exclusiva del médico
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sindromes.map((s, idx) => renderSyndromeCard(s, idx))}
                    </div>
                  </div>
                )}

                {/* Calculadoras Clínicas Derivadas */}
                {calculos.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Calculator className="size-4 text-primary" />
                      Índices & Fórmulas Clínicas Derivadas Automáticamente
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {calculos.map((calc, idx) => (
                        <Card
                          key={calc.key || idx}
                          className={cn(
                            'shadow-2xs',
                            calc.estado === 'critico'
                              ? 'border-red-500/50 bg-red-500/5'
                              : calc.estado === 'alerta'
                              ? 'border-amber-500/40 bg-amber-500/5'
                              : 'border-border'
                          )}
                        >
                          <CardContent className="p-3.5 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-foreground">{calc.nombre}</span>
                              <span className="font-mono text-sm font-extrabold text-primary">
                                {calc.valor}{' '}
                                <span className="text-[10px] font-normal text-muted-foreground">{calc.unidad}</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">{calc.interpretacion}</p>
                            {calc.formula && (
                              <p className="text-[10px] font-mono text-muted-foreground/80 pt-0.5">{calc.formula}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alertas rápidas si no hubo síndromes pero sí valores alterados */}
                {estudio.alertas_detectadas && estudio.alertas_detectadas.length > 0 && sindromes.length === 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm font-bold mb-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Parámetros Fuera de Rango Detectados:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {estudio.alertas_detectadas.map((alerta, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-lg bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/30 text-xs font-semibold"
                        >
                          {alerta}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* TABLA DE BIOMARCADORES */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-primary" />
                      Panel de Biomarcadores Extraídos
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {estudio.valores_laboratorio?.length || 0} parámetros cuantitativos
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider bg-muted/20">
                          <th className="p-3.5">Parámetro / Panel</th>
                          <th className="p-3.5 text-right">Resultado</th>
                          <th className="p-3.5 text-center">Rango Referencia</th>
                          <th className="p-3.5 text-center">Nivel</th>
                          <th className="p-3.5">Interpretación Clínica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {estudio.valores_laboratorio && estudio.valores_laboratorio.length > 0 ? (
                          estudio.valores_laboratorio.map((bio, idx) => {
                            const isHigh = bio.estado === 'alto';
                            const isLow = bio.estado === 'bajo';
                            return (
                              <tr
                                key={idx}
                                className={cn(
                                  'transition-colors',
                                  bio.critico
                                    ? 'bg-red-500/10 hover:bg-red-500/15'
                                    : isHigh
                                    ? 'bg-rose-500/5 hover:bg-rose-500/10'
                                    : isLow
                                    ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                    : 'hover:bg-muted/30'
                                )}
                              >
                                <td className="p-3.5">
                                  <div className="font-semibold text-foreground text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                                    <span>{bio.parametro}</span>
                                    {bio.critico && (
                                      <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0">CRÍTICO</Badge>
                                    )}
                                  </div>
                                  {bio.panel && (
                                    <span className="text-[10px] text-muted-foreground">{bio.panel}</span>
                                  )}
                                </td>

                                <td className="p-3.5 text-right font-mono font-bold text-base">
                                  <span
                                    className={
                                      bio.critico
                                        ? 'text-red-600 dark:text-red-400 font-black'
                                        : isHigh
                                        ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                        : isLow
                                        ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }
                                  >
                                    {bio.valor}
                                  </span>{' '}
                                  <span className="text-xs font-normal text-muted-foreground">{bio.unidad}</span>
                                </td>

                                <td className="p-3.5 text-center font-mono text-xs text-muted-foreground">
                                  <div>
                                    {bio.ref_min} - {bio.ref_max} {bio.unidad}
                                  </div>
                                  {bio.rango_origen === 'laboratorio' && (
                                    <span className="text-[9px] text-sky-600 dark:text-sky-400 font-sans">Rango impreso</span>
                                  )}
                                  {bio.rango_origen === 'paciente_edad_sexo' && (
                                    <span className="text-[9px] text-primary font-sans">Ajustado edad/sexo</span>
                                  )}
                                </td>

                                <td className="p-3.5 text-center">
                                  {isHigh ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                      <ArrowUp className="w-3 h-3" /> Elevado
                                    </span>
                                  ) : isLow ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                      <ArrowDown className="w-3 h-3" /> Bajo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                      <CheckCircle2 className="w-3 h-3" /> Normal
                                    </span>
                                  )}
                                </td>

                                <td className="p-3.5 text-xs text-muted-foreground">
                                  {bio.interpretacion || 'En rango esperado'}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">
                              No se extrajeron biomarcadores numéricos estándar de este archivo. Revise la pestaña{' '}
                              <strong>Documento Original</strong> o <strong>Auditoría OCR</strong>.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Hallazgos Cualitativos (Uroanálisis / Serología / Heces) */}
                {cualitativos.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Parámetros Cualitativos (Uroanálisis / Serología / Sedimento)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {cualitativos.map((q, idx) => (
                        <div
                          key={q.key || idx}
                          className={cn(
                            'flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs',
                            q.alerta
                              ? 'border-rose-500/35 bg-rose-500/5 text-rose-700 dark:text-rose-300 font-semibold'
                              : 'border-border bg-muted/20 text-foreground'
                          )}
                        >
                          <span>{q.parametro}</span>
                          <Badge variant={q.alerta ? 'destructive' : 'outline'} className="text-[10px]">
                            {q.resultado}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Síntesis Médica & Guía Empática al Paciente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm mb-3">
                      <Stethoscope className="w-4 h-4" />
                      <span>Síntesis Clínica (Para el Médico)</span>
                    </div>
                    <div className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
                      {agente?.resumen_medico ||
                        estudio.interpretacion_clinica ||
                        'Sin interpretación registrada. Pulse Re-analizar con MediCore AI.'}
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-3">
                        <UserCheck className="w-4 h-4" />
                        <span>Guía de Comunicación al Paciente</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        Explicación personalizada generada a partir de los resultados reales para transmitir claridad y
                        tranquilidad durante la consulta:
                      </p>
                      <div className="p-3.5 bg-card border border-border rounded-xl text-xs text-foreground font-medium italic leading-relaxed shadow-2xs">
                        "
                        {agente?.guia_paciente ||
                          (estudio.valores_laboratorio?.some((v) => v.alerta)
                            ? 'Sus exámenes muestran variaciones identificadas que revisaremos juntos para indicarle el plan preventivo o terapéutico adecuado.'
                            : 'Sus resultados se encuentran dentro de los parámetros saludables esperados.')}
                        "
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: DOCUMENTO ORIGINAL */}
              <TabsContent value="documento" className="flex-1 overflow-hidden mt-0">
                {estudio.archivo_url ? (
                  <div className="h-full bg-muted/20 border border-border rounded-2xl p-3 flex items-center justify-center overflow-auto">
                    {isPdf ? (
                      <iframe
                        src={estudio.archivo_url}
                        title={estudio.titulo}
                        className="w-full h-full min-h-[460px] rounded-xl border border-border bg-white"
                      />
                    ) : (
                      <img
                        src={estudio.archivo_url}
                        alt={estudio.titulo}
                        className="max-h-full max-w-full object-contain rounded-xl border border-border shadow-sm"
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Sin archivo adjunto
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: AUDITORÍA OCR / TEXTO REAL EXTRAÍDO */}
              <TabsContent value="auditoria" className="flex-1 overflow-y-auto mt-0 space-y-4 pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="shadow-2xs">
                    <CardContent className="p-3">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Motor</span>
                      <span className="text-xs font-bold text-foreground">{agente?.engine_used || 'medicore-local'}</span>
                    </CardContent>
                  </Card>
                  <Card className="shadow-2xs">
                    <CardContent className="p-3">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Método</span>
                      <span className="text-xs font-bold text-foreground">{methodLabel || 'Extracción Local'}</span>
                    </CardContent>
                  </Card>
                  <Card className="shadow-2xs">
                    <CardContent className="p-3">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Confianza OCR</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {typeof agente?.ocr_confidence === 'number'
                          ? `${Math.round(agente.ocr_confidence * 100)}%`
                          : 'N/A'}
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="shadow-2xs">
                    <CardContent className="p-3">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Páginas / Tiempo</span>
                      <span className="text-xs font-bold text-foreground">
                        {agente?.pages_processed || 1} pág ·{' '}
                        {typeof agente?.processing_ms === 'number' ? `${agente.processing_ms} ms` : '—'}
                      </span>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ScanText className="size-3.5 text-primary" />
                      Texto Real Extraído del Documento (Auditoría Transparente)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      100% procesado en tu servidor · $0 APIs externas
                    </span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-foreground/85 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto bg-muted/10">
                    {agente?.extracted_text_preview ||
                      'No hay texto extraído almacenado aún. Pulsa "Re-analizar con MediCore AI" para ejecutar el motor OCR/PDF sobre este archivo.'}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* ========================================================== */
            /* VISTA DE IMAGENOLOGÍA E INFORMES MÉDICOS                   */
            /* ========================================================== */
            <div className="flex-1 grid grid-cols-12 gap-5 overflow-hidden">
              {/* VISOR CLÍNICO DE IMAGEN / PDF (COLUMNA IZQUIERDA) */}
              <div className="col-span-12 lg:col-span-7 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {!isPdf && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 4))}
                          className="h-8 px-2.5 cursor-pointer"
                          title="Acercar"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
                          className="h-8 px-2.5 cursor-pointer"
                          title="Alejar"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className="font-mono text-xs text-muted-foreground px-1">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRotation((prev) => (prev + 90) % 360)}
                          className="h-8 px-2.5 cursor-pointer"
                          title="Rotar 90°"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={invertContrast ? 'default' : 'ghost'}
                          onClick={() => setInvertContrast((prev) => !prev)}
                          className="h-8 px-2.5 gap-1.5 text-xs cursor-pointer font-medium"
                          title="Modo Negativo Rx (Ideal para Radiografías y Panorámicas)"
                        >
                          <Contrast className="w-4 h-4" />
                          <span>Negativo Rx</span>
                        </Button>
                      </>
                    )}
                    {isPdf && (
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 px-1">
                        <FileText className="size-3.5 text-primary" />
                        Visor PDF Integrado
                      </span>
                    )}
                  </div>

                  {!isPdf && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                        setInvertContrast(false);
                      }}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Restablecer
                    </Button>
                  )}
                </div>

                <div className="flex-1 bg-zinc-900 dark:bg-black/90 flex items-center justify-center overflow-auto p-4 relative">
                  {estudio.archivo_url ? (
                    isPdf ? (
                      <iframe
                        src={estudio.archivo_url}
                        title={estudio.titulo}
                        className="w-full h-full min-h-[420px] rounded-lg bg-white border-0"
                      />
                    ) : (
                      <img
                        src={estudio.archivo_url}
                        alt={estudio.titulo}
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                          filter: invertContrast ? 'invert(100%) contrast(135%)' : 'none',
                          transition: 'transform 0.15s ease-out, filter 0.2s ease',
                          maxHeight: '100%',
                          maxWidth: '100%',
                          objectFit: 'contain',
                        }}
                        className="rounded shadow-2xl"
                      />
                    )
                  ) : (
                    <div className="text-center text-zinc-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Sin archivo adjunto</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PANEL DERECHO: ANÁLISIS NLP / CALIDAD / CIE-10 / AUDITORÍA OCR */}
              <div className="col-span-12 lg:col-span-5 flex flex-col overflow-hidden">
                <Tabs defaultValue="hallazgos" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="bg-muted/60 w-full justify-start mb-3 shrink-0">
                    <TabsTrigger value="hallazgos" className="text-xs gap-1.5 flex-1 cursor-pointer">
                      <Eye className="size-3.5" />
                      Análisis MediCore AI
                    </TabsTrigger>
                    <TabsTrigger value="ocr" className="text-xs gap-1.5 flex-1 cursor-pointer">
                      <ScanText className="size-3.5" />
                      Auditoría OCR
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="hallazgos" className="flex-1 overflow-y-auto pr-1 space-y-3.5 mt-0">
                    {/* Panel de Visión Neuronal ONNX (Radiografía de Tórax / Clasificación Anatómica + Radiometría) */}
                    {agente?.vision_radiologica && (
                      <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                            <Brain className="size-4" />
                            <span>MediCore AI Vision (Red Neuronal Local)</span>
                          </div>
                          {agente.vision_radiologica.region_anatomica_detectada && (
                            <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-semibold">
                              {agente.vision_radiologica.region_anatomica_detectada}
                              {typeof agente.vision_radiologica.region_confianza === 'number'
                                ? ` · ${Math.round(agente.vision_radiologica.region_confianza)}%`
                                : ''}
                            </Badge>
                          )}
                        </div>

                        {agente.vision_radiologica.patologias_evaluadas &&
                          agente.vision_radiologica.patologias_evaluadas.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Tamizaje Neuronal (DenseNet-121 NIH ChestX-ray14)
                              </span>
                              <div className="space-y-1.5">
                                {agente.vision_radiologica.patologias_evaluadas.slice(0, 6).map((pat) => (
                                  <div key={pat.key} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span
                                        className={cn(
                                          'font-medium',
                                          pat.sospechoso
                                            ? 'text-rose-700 dark:text-rose-300 font-bold'
                                            : 'text-foreground/85'
                                        )}
                                      >
                                        {pat.nombre}{' '}
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                          ({pat.codigo_cie10})
                                        </span>
                                      </span>
                                      <span
                                        className={cn(
                                          'font-mono font-bold text-[11px]',
                                          pat.sospechoso
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-muted-foreground'
                                        )}
                                      >
                                        {pat.probabilidad.toFixed(1)}%
                                      </span>
                                    </div>
                                    <Progress
                                      value={Math.min(100, Math.max(2, pat.probabilidad))}
                                      className={cn(
                                        'h-1.5',
                                        pat.sospechoso ? '[&>div]:bg-rose-500' : '[&>div]:bg-emerald-500/70'
                                      )}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {agente.vision_radiologica.metricas_radiometricas &&
                          agente.vision_radiologica.metricas_radiometricas.length > 0 && (
                            <div className="pt-2 border-t border-border/70 grid grid-cols-1 gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Radiometría Digital (OpenCV)
                              </span>
                              {agente.vision_radiologica.metricas_radiometricas.map((m, i) => (
                                <div
                                  key={i}
                                  className="flex items-start justify-between gap-2 text-[11px] bg-muted/30 rounded-lg px-2.5 py-1.5"
                                >
                                  <div>
                                    <span className="font-semibold text-foreground">{m.nombre}:</span>{' '}
                                    <span className="text-muted-foreground">{m.interpretacion}</span>
                                  </div>
                                  <span className="font-mono font-bold text-primary shrink-0">{m.valor}</span>
                                </div>
                              ))}
                            </div>
                          )}

                        {agente.vision_radiologica.nota_seguridad && (
                          <p className="text-[10px] text-muted-foreground italic leading-snug pt-1 border-t border-border/50">
                            {agente.vision_radiologica.nota_seguridad}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Aviso transparente solo si no hubo ni texto ni visión neuronal */}
                    {agente?.requiere_revision_visual && !agente?.vision_radiologica && (
                      <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                        <strong>Placa visual sin informe escrito:</strong> Utilice el visor interactivo (Zoom / Negativo Rx)
                        y pulse <em>Editar / Validar</em> para documentar su lectura clínica.
                      </div>
                    )}

                    {/* Región y Técnica */}
                    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Región Anatómica Evaluada
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {estudio.datos_imagenologia?.region_anatomica || 'Área general evaluada'}
                      </p>

                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Modalidad / Técnica:</span>
                          <span className="text-foreground font-medium">
                            {estudio.datos_imagenologia?.tecnica || 'Imagenología'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Calidad Técnica:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {estudio.datos_imagenologia?.calidad_estudio ||
                              agente?.image_quality?.calidad_label ||
                              'Adecuada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Escalas y Medidas Extraídas */}
                    {(escalas.length > 0 || medidas.length > 0) && (
                      <div className="bg-card border border-border rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                        {escalas.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1 mb-1.5">
                              <Award className="size-3" /> Clasificaciones / Escalas Detectadas
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {escalas.map((esc, i) => (
                                <Badge key={i} className="bg-primary/15 text-primary border border-primary/30 text-[11px]">
                                  {esc}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {medidas.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                              <Ruler className="size-3" /> Medidas Extraídas del Informe
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {medidas.map((med, i) => (
                                <Badge key={i} variant="outline" className="font-mono text-[10px]">
                                  {med}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hallazgos Positivos & CIE-10 Sugeridos */}
                    {sindromes.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Activity className="size-3.5" /> Hallazgos Positivos & CIE-10 Sugeridos
                        </span>
                        {sindromes.map((s, idx) => renderSyndromeCard(s, idx))}
                      </div>
                    )}

                    {/* Hallazgos & Conclusión (Con edición y validación médica en vivo) */}
                    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Hallazgos Radiológicos / Clínicos</span>
                        </div>
                        {!editingReport ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleStartEditReport}
                            className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <Pencil className="size-3" />
                            Editar / Validar
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingReport(false)}
                              className="h-6 px-2 text-[11px]"
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={savingReport}
                              onClick={handleSaveReportValidation}
                              className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
                            >
                              <Save className="size-3" />
                              {savingReport ? 'Guardando...' : 'Guardar'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingReport ? (
                        <div className="space-y-2.5">
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Región Anatómica
                            </span>
                            <Input
                              value={editRegion}
                              onChange={(e) => setEditRegion(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Hallazgos
                            </span>
                            <Textarea
                              value={editHallazgos}
                              onChange={(e) => setEditHallazgos(e.target.value)}
                              rows={4}
                              className="text-xs resize-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Conclusión Diagnóstica
                            </span>
                            <Textarea
                              value={editConclusion}
                              onChange={(e) => setEditConclusion(e.target.value)}
                              rows={2}
                              className="text-xs resize-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Recomendaciones
                            </span>
                            <Input
                              value={editRecomendaciones}
                              onChange={(e) => setEditRecomendaciones(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                            {estudio.datos_imagenologia?.hallazgos || 'Pendiente de lectura clínica.'}
                          </p>

                          <div className="pt-3 border-t border-border">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                              Conclusión Diagnóstica:
                            </span>
                            <p className="text-xs text-foreground font-medium whitespace-pre-line">
                              {estudio.datos_imagenologia?.conclusion || 'Sin conclusión registrada.'}
                            </p>
                          </div>

                          {estudio.datos_imagenologia?.recomendaciones && (
                            <div className="pt-2.5 border-t border-border/60">
                              <span className="text-[11px] font-bold text-muted-foreground block mb-0.5">
                                Recomendaciones:
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {estudio.datos_imagenologia.recomendaciones}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Guía al Paciente */}
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-xs">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs mb-2">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <span>Guía Explicativa para el Paciente</span>
                      </div>
                      <p className="text-xs text-foreground/90 italic leading-relaxed">
                        "
                        {agente?.guia_paciente ||
                          estudio.datos_imagenologia?.guia_paciente ||
                          'Su estudio ha sido cargado en alta resolución para su valoración médica.'}
                        "
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="ocr" className="flex-1 overflow-y-auto mt-0 pr-1 space-y-3">
                    {agente?.image_quality && (
                      <div className="bg-card border border-border rounded-xl p-3 text-xs grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Resolución</span>
                          <span className="font-mono font-semibold">
                            {agente.image_quality.width}×{agente.image_quality.height} ({agente.image_quality.megapixels} MP)
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Nitidez / Brillo</span>
                          <span className="font-mono font-semibold">
                            {agente.image_quality.sharpness} / {agente.image_quality.brightness}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="px-3.5 py-2 bg-muted/40 border-b border-border text-xs font-bold flex items-center justify-between">
                        <span>Texto Leído ({methodLabel || 'Local'})</span>
                        {typeof agente?.ocr_confidence === 'number' && (
                          <Badge variant="outline" className="text-[10px]">
                            OCR {Math.round(agente.ocr_confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <pre className="p-3.5 text-[11px] font-mono text-foreground/85 whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto">
                        {agente?.extracted_text_preview ||
                          'No se detectó texto impreso significativo en esta imagen.'}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EstudioDetalleModal;
