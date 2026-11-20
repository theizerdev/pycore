import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Image as ImageIcon,
  Plus,
  Search,
  Calendar,
  Trash2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Sparkles,
  History,
  Stethoscope,
  MessageSquare,
  Radio,
  FileText,
  Send,
  Inbox,
  Check,
  X,
  Phone,
  Bot,
  Loader2,
  WifiOff,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Card, CardContent } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import {
  estudiosApi,
  type EstudioAdjunto,
  type WhatsAppEstudioPendienteItem,
  type WhatsAppPendientesResponse,
} from '../../api/estudios';
import { EstudioDetalleModal } from './EstudioDetalleModal';
import { cn, getLocalDateString } from '../../lib/utils';

interface EstudiosArchivosTabProps {
  pacienteId: number;
  consultaId?: number;
  medicoId?: number;
  sucursalId?: number | null;
  pacienteNombre?: string;
  pacienteTelefono?: string | null;
  whatsappRefreshTick?: number;
  autoOpenEstudioId?: number | null;
  highlightedEstudioIds?: number[];
  onAutoOpenHandled?: () => void;
  onPendientesCountChange?: (count: number) => void;
  onApplyDiagnosticoPrincipal?: (texto: string) => void;
  onAddDiagnosticoSecundario?: (texto: string) => void;
}

export const EstudiosArchivosTab: React.FC<EstudiosArchivosTabProps> = ({
  pacienteId,
  consultaId,
  medicoId,
  sucursalId,
  pacienteNombre,
  pacienteTelefono,
  whatsappRefreshTick = 0,
  autoOpenEstudioId = null,
  highlightedEstudioIds = [],
  onAutoOpenHandled,
  onPendientesCountChange,
  onApplyDiagnosticoPrincipal,
  onAddDiagnosticoSecundario,
}) => {
  const [estudios, setEstudios] = useState<EstudioAdjunto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [alcance, setAlcance] = useState<'esta_consulta' | 'historial_previo' | 'todos'>(
    consultaId ? 'esta_consulta' : 'todos'
  );

  // Estado WhatsApp en Vivo (Recepción Paso 4)
  const [waInfo, setWaInfo] = useState<WhatsAppPendientesResponse | null>(null);
  const [modalSolicitarWaOpen, setModalSolicitarWaOpen] = useState(false);
  const [waTelefonoDestino, setWaTelefonoDestino] = useState(pacienteTelefono || '');
  const [waEnviarMensaje, setWaEnviarMensaje] = useState(true);
  const [waMensajeCustom, setWaMensajeCustom] = useState('');
  const [waSolicitando, setWaSolicitando] = useState(false);

  // Asignación de archivo entrante desde bandeja WhatsApp (ej. enviado por familiar)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPendiente, setSelectedPendiente] = useState<WhatsAppEstudioPendienteItem | null>(null);
  const [assignTitulo, setAssignTitulo] = useState('');
  const [assignCategoria, setAssignCategoria] = useState<'laboratorio' | 'imagenologia' | 'informe' | 'otro'>('laboratorio');
  const [assignNotas, setAssignNotas] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Modal de Detalle / Visor Inteligente
  const [selectedEstudioId, setSelectedEstudioId] = useState<number | null>(null);
  const [modalViewerOpen, setModalViewerOpen] = useState<boolean>(false);

  // Confirmación de eliminación con Radix AlertDialog
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Modal de Subida / Nuevo Estudio Manual
  const [modalUploadOpen, setModalUploadOpen] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [titulo, setTitulo] = useState<string>('');
  const [categoria, setCategoria] = useState<'laboratorio' | 'imagenologia' | 'informe' | 'otro'>('laboratorio');
  const [subtipo, setSubtipo] = useState<string>('');
  const [fechaEstudio, setFechaEstudio] = useState<string>(getLocalDateString());
  const [notas, setNotas] = useState<string>('');
  const [archivoBase64, setArchivoBase64] = useState<string>('');
  const [archivoNombre, setArchivoNombre] = useState<string>('');
  const [archivoTipo, setArchivoTipo] = useState<string>('');
  const [archivoTamano, setArchivoTamano] = useState<number>(0);

  const fetchEstudios = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const data = await estudiosApi.listarPorPaciente(pacienteId, categoriaFiltro);
      setEstudios(data);
    } catch {
      toast.error('Error al cargar estudios del paciente');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, categoriaFiltro]);

  const fetchWaPendientes = useCallback(async () => {
    if (!consultaId) return;
    try {
      const res = await estudiosApi.listarPendientesWhatsApp(consultaId, sucursalId);
      setWaInfo(res);
      onPendientesCountChange?.(res.pendientes.length);
    } catch {
      // silencioso
    }
  }, [consultaId, sucursalId, onPendientesCountChange]);

  useEffect(() => {
    setWaTelefonoDestino(pacienteTelefono || '');
  }, [pacienteTelefono]);

  useEffect(() => {
    setAlcance(consultaId ? 'esta_consulta' : 'todos');
  }, [consultaId]);

  useEffect(() => {
    if (pacienteId) {
      fetchEstudios();
    }
  }, [pacienteId, categoriaFiltro, fetchEstudios]);

  useEffect(() => {
    if (consultaId) {
      fetchWaPendientes();
    }
  }, [consultaId, sucursalId, fetchWaPendientes]);

  // Refrescar automáticamente cuando llega un evento WebSocket de WhatsApp
  useEffect(() => {
    if (whatsappRefreshTick > 0) {
      fetchEstudios();
      fetchWaPendientes();
      if (consultaId) {
        setAlcance('esta_consulta');
      }
    }
  }, [whatsappRefreshTick, consultaId, fetchEstudios, fetchWaPendientes]);

  // Abrir visor automáticamente cuando el doctor pulsa "Ver ahora" desde el toast en tiempo real
  useEffect(() => {
    if (autoOpenEstudioId) {
      setSelectedEstudioId(autoOpenEstudioId);
      setModalViewerOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenEstudioId, onAutoOpenHandled]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoNombre(file.name);
    setArchivoTipo(file.type);
    setArchivoTamano(file.size);

    if (!titulo) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitulo(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const base64 = loadEvt.target?.result as string;
      setArchivoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarEstudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Debe ingresar un título descriptivo para el estudio');
      return;
    }
    if (!archivoBase64) {
      toast.error('Debe seleccionar un archivo (imagen o documento)');
      return;
    }

    setUploadLoading(true);
    try {
      await estudiosApi.crear({
        paciente_id: pacienteId,
        consulta_id: consultaId,
        medico_id: medicoId,
        titulo: titulo.trim(),
        categoria,
        subtipo: subtipo.trim() || undefined,
        archivo_url: archivoBase64,
        archivo_nombre: archivoNombre,
        archivo_tipo: archivoTipo,
        archivo_tamano: archivoTamano,
        fecha_estudio: fechaEstudio,
        notas: notas.trim() || undefined,
      });

      toast.success('Estudio guardado y analizado por el Asistente Clínico');
      setModalUploadOpen(false);
      setTitulo('');
      setArchivoBase64('');
      setArchivoNombre('');
      setNotas('');
      if (consultaId) setAlcance('esta_consulta');
      fetchEstudios();
    } catch {
      toast.error('Error al guardar el estudio adjunto');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleConfirmEliminar = async () => {
    if (!deleteTargetId) return;
    try {
      await estudiosApi.eliminar(deleteTargetId);
      toast.success('Estudio eliminado');
      setDeleteTargetId(null);
      fetchEstudios();
    } catch {
      toast.error('Error al eliminar estudio');
    }
  };

  // Solicitar estudio al paciente por WhatsApp / Activar escucha
  const handleSolicitarPorWhatsApp = async () => {
    if (!consultaId) return;
    setWaSolicitando(true);
    try {
      const res = await estudiosApi.solicitarPorWhatsApp(consultaId, {
        enviar_mensaje: waEnviarMensaje,
        telefono_destino: waTelefonoDestino.trim() || undefined,
        mensaje_personalizado: waMensajeCustom.trim() || undefined,
      });
      toast.success(res.message);
      setModalSolicitarWaOpen(false);
      setWaMensajeCustom('');
      fetchWaPendientes();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo activar la solicitud por WhatsApp');
    } finally {
      setWaSolicitando(false);
    }
  };

  const openAssignDialog = (item: WhatsAppEstudioPendienteItem) => {
    setSelectedPendiente(item);
    const baseTitle =
      (item.caption && item.caption.trim()) ||
      item.archivo_nombre.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
    setAssignTitulo(baseTitle.charAt(0).toUpperCase() + baseTitle.slice(1));
    const cat = (item.categoria_sugerida || 'laboratorio') as 'laboratorio' | 'imagenologia' | 'informe' | 'otro';
    setAssignCategoria(['laboratorio', 'imagenologia', 'informe', 'otro'].includes(cat) ? cat : 'laboratorio');
    setAssignNotas('');
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedPendiente || !consultaId) return;
    setAssignLoading(true);
    try {
      const res = await estudiosApi.asignarPendienteWhatsApp(selectedPendiente.id, {
        consulta_id: consultaId,
        paciente_id: pacienteId,
        medico_id: medicoId,
        titulo: assignTitulo.trim() || undefined,
        categoria: assignCategoria,
        notas: assignNotas.trim() || undefined,
      });
      toast.success(res.message);
      setAssignModalOpen(false);
      setSelectedPendiente(null);
      setAlcance('esta_consulta');
      await Promise.all([fetchEstudios(), fetchWaPendientes()]);
      if (res.estudio_id) {
        setSelectedEstudioId(res.estudio_id);
        setModalViewerOpen(true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al asignar y analizar el estudio');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDescartarPendiente = async (pendId: number) => {
    try {
      await estudiosApi.descartarPendienteWhatsApp(pendId);
      toast.info('Archivo descartado de la bandeja entrante');
      fetchWaPendientes();
    } catch {
      toast.error('No se pudo descartar el archivo');
    }
  };

  const estudiosEstaConsulta = estudios.filter((e) => e.consulta_id === consultaId);
  const estudiosHistorial = estudios.filter((e) => !consultaId || e.consulta_id !== consultaId);
  const estudiosSegunAlcance = consultaId
    ? alcance === 'esta_consulta'
      ? estudiosEstaConsulta
      : estudiosHistorial
    : estudios;

  const estudiosFiltrados = estudiosSegunAlcance.filter(
    (e) =>
      e.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notas && e.notas.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.whatsapp_remitente && e.whatsapp_remitente.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* ── PANEL DE RECEPCIÓN EN VIVO VÍA WHATSAPP + BOT CLÍNICO (SOLO EN CONSULTA) ── */}
      {consultaId && (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.06] via-teal-500/[0.04] to-transparent shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={cn(
                  'size-10 rounded-xl flex items-center justify-center shrink-0 border',
                  waInfo?.whatsapp_connected
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                <MessageSquare className="size-5" />
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    Recepción Directa de Estudios por WhatsApp
                  </span>
                  {waInfo?.whatsapp_connected ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] gap-1 font-semibold">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      En línea {waInfo.whatsapp_phone ? `(+${waInfo.whatsapp_phone})` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                      <WifiOff className="size-3" />
                      WhatsApp sin vincular
                    </Badge>
                  )}

                  {waInfo?.listening_active && (
                    <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-[10px] gap-1 animate-pulse">
                      <Radio className="size-3" />
                      Esperando archivo del paciente
                    </Badge>
                  )}

                  <Badge variant="outline" className="text-[10px] gap-1 border-primary/35 text-primary bg-primary/5 font-semibold">
                    <Bot className="size-3" />
                    MediCore AI Local · OCR + Visión ONNX + {waInfo?.agent_info?.biomarkers_catalog_size || 96} Biomarcadores
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground leading-snug">
                  Cuando el paciente envíe un <strong>PDF o fotografía de sus exámenes</strong> al WhatsApp de la sede, el sistema lo capturará, lo analizará con el Bot Clínico y lo mostrará aquí al instante.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  fetchEstudios();
                  fetchWaPendientes();
                }}
                className="h-9 px-2.5 text-xs"
                title="Actualizar estudios y bandeja entrante"
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setModalSolicitarWaOpen(true)}
                className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Solicitar por WhatsApp</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── BANDEJA ENTRANTE DE WHATSAPP (ARCHIVOS ENVIADOS DESDE TELÉFONO DE FAMILIAR / OTRO NÚMERO) ── */}
      {consultaId && waInfo && waInfo.pendientes.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/[0.06] shadow-xs">
          <CardContent className="p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Inbox className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-foreground">
                  Archivos Recientes por WhatsApp pendientes por asignar ({waInfo.pendientes.length})
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Enviados desde números no asociados directamente al paciente (ej. familiar)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {waInfo.pendientes.map((item) => {
                const isPdf = item.archivo_tipo.includes('pdf');
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-card p-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.archivo_url && !isPdf ? (
                        <img
                          src={item.archivo_url}
                          alt={item.archivo_nombre}
                          className="size-11 rounded-lg object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="size-11 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                          {isPdf ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {item.caption || item.archivo_nombre}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          De: <span className="font-mono">+{item.remitente_telefono}</span>
                          {item.remitente_nombre ? ` (${item.remitente_nombre})` : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {Math.max(1, Math.round(item.archivo_tamano / 1024))} KB ·{' '}
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openAssignDialog(item)}
                        className="h-8 text-[11px] gap-1 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <Check className="size-3.5" />
                        <span>Asignar y Analizar</span>
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDescartarPendiente(item.id)}
                        className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Descartar archivo"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SELECTOR DE ALCANCE: DE ESTA CONSULTA VS HISTORIAL PREVIO ── */}
      {consultaId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-muted/40 rounded-2xl border border-border">
          <div className="flex items-center gap-1.5 p-1 bg-background rounded-xl border border-border shadow-xs text-xs">
            <button
              type="button"
              onClick={() => setAlcance('esta_consulta')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer',
                alcance === 'esta_consulta'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>De esta Consulta</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  alcance === 'esta_consulta'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {estudiosEstaConsulta.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAlcance('historial_previo')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer',
                alcance === 'historial_previo'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial del Paciente</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  alcance === 'historial_previo'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {estudiosHistorial.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground px-2">
            {alcance === 'esta_consulta' ? (
              <span>Exámenes recibidos por WhatsApp o cargados manualmente en esta atención.</span>
            ) : (
              <span>Estudios previos del paciente para consulta de antecedentes clínicos.</span>
            )}
          </div>
        </div>
      )}

      {/* ── BARRA SUPERIOR DE ACCIONES Y FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border text-xs">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'laboratorio', label: 'Laboratorio' },
            { key: 'imagenologia', label: 'Imagenología' },
            { key: 'informe', label: 'Informes' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoriaFiltro(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer',
                categoriaFiltro === tab.key
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar estudio..."
              className="pl-9 h-9 text-xs bg-card border-border text-foreground"
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setModalUploadOpen(true)}
            className="h-9 gap-1.5 font-semibold shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adjuntar Estudio</span>
          </Button>
        </div>
      </div>

      {/* ── LISTADO / GRID DE ESTUDIOS ── */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Cargando estudios clínicos del paciente...</p>
        </div>
      ) : estudiosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {estudiosFiltrados.map((est) => {
            const isLab = est.categoria === 'laboratorio';
            const isAlterado = est.estado_analisis === 'analizado_alterado';
            const isPendienteAnalisis = est.estado_analisis === 'pendiente';
            const esDeConsultaPrevia = Boolean(consultaId && est.consulta_id !== consultaId);
            const esWhatsApp = est.origen === 'whatsapp';
            const isHighlighted = highlightedEstudioIds.includes(est.id);

            return (
              <div
                key={est.id}
                className={cn(
                  'group relative bg-card border rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between',
                  isHighlighted
                    ? 'border-emerald-500 ring-2 ring-emerald-500/25'
                    : esDeConsultaPrevia
                    ? 'border-border/70 bg-muted/20 hover:border-border'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1 text-[11px] font-semibold',
                          isLab
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                            : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                        )}
                      >
                        {isLab ? <FlaskConical className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                        <span className="capitalize">{est.categoria}</span>
                      </Badge>

                      {esWhatsApp && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] gap-1 font-semibold">
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp
                        </Badge>
                      )}

                      {isHighlighted && (
                        <Badge className="bg-emerald-600 text-white text-[10px] animate-pulse">
                          Nuevo
                        </Badge>
                      )}

                      {esDeConsultaPrevia && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                          <History className="w-3 h-3" />
                          Previo
                        </Badge>
                      )}
                    </div>

                    {isAlterado ? (
                      <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] gap-1">
                        <AlertTriangle className="w-3 h-3" /> Alterado
                      </Badge>
                    ) : isPendienteAnalisis ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1">
                        <Bot className="w-3 h-3" /> Por revisar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Normal
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                    {est.titulo}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{est.fecha_estudio}</span>
                    <span>•</span>
                    <span className="truncate max-w-[150px]">{est.archivo_nombre}</span>
                  </div>

                  {esWhatsApp && est.whatsapp_remitente && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mb-2.5 truncate">
                      Remitente: {est.whatsapp_remitente}
                    </p>
                  )}

                  {est.analisis_agente?.cie10_sugeridos && est.analisis_agente.cie10_sugeridos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {est.analisis_agente.cie10_sugeridos.slice(0, 2).map((cie, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] font-mono bg-primary/5 border-primary/30 text-primary px-1.5 py-0"
                        >
                          {cie.codigo} · {cie.descripcion.slice(0, 26)}
                          {cie.descripcion.length > 26 ? '…' : ''}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {est.alertas_detectadas && est.alertas_detectadas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {est.alertas_detectadas.slice(0, 3).map((alt, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-300 text-[11px] font-medium truncate max-w-[240px]"
                        >
                          {alt}
                        </span>
                      ))}
                      {est.alertas_detectadas.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{est.alertas_detectadas.length - 3} más
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEstudioId(est.id);
                      setModalViewerOpen(true);
                    }}
                    className="flex-1 text-xs gap-1.5 h-8 font-medium cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>Abrir Visor & Bot</span>
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteTargetId(est.id)}
                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Eliminar estudio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border/80 rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3 text-muted-foreground">
            <FlaskConical className="w-7 h-7 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">
            {consultaId && alcance === 'esta_consulta'
              ? 'Sin Estudios en esta Consulta'
              : consultaId && alcance === 'historial_previo'
              ? 'Sin Estudios Previos'
              : 'Sin Estudios Registrados'}
          </h3>
          <p className="text-muted-foreground text-xs max-w-md mb-5">
            {consultaId && alcance === 'esta_consulta'
              ? 'Solicite al paciente que envíe sus resultados por WhatsApp o adjunte manualmente PDFs e imágenes para que el Bot Clínico los analice.'
              : consultaId && alcance === 'historial_previo'
              ? 'El paciente no posee estudios registrados en consultas anteriores.'
              : 'Adjunte exámenes de laboratorio o imágenes (ecos, panorámicas dentales, rayos X) para visualizarlos en el visor clínico.'}
          </p>

          {(!consultaId || alcance === 'esta_consulta') && (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {consultaId && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setModalSolicitarWaOpen(true)}
                  className="text-xs gap-1.5 cursor-pointer font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Solicitar al Paciente por WhatsApp</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setModalUploadOpen(true)}
                className="text-xs gap-1.5 cursor-pointer font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Subir Archivo Manualmente</span>
              </Button>
            </div>
          )}

          {consultaId && alcance === 'esta_consulta' && estudiosHistorial.length > 0 && (
            <div className="mt-6 p-3 bg-muted/40 rounded-xl border border-border flex items-center gap-3 text-xs text-muted-foreground max-w-md">
              <History className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 text-left">
                El paciente tiene <strong>{estudiosHistorial.length}</strong>{' '}
                {estudiosHistorial.length === 1 ? 'estudio previo' : 'estudios previos'} de consultas anteriores.
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAlcance('historial_previo')}
                className="text-xs h-7 text-primary hover:text-primary font-semibold p-1"
              >
                Ver Historial →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL SOLICITAR ESTUDIO POR WHATSAPP (RADIX DIALOG) ── */}
      <Dialog open={modalSolicitarWaOpen} onOpenChange={setModalSolicitarWaOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-5 text-emerald-600" />
              Solicitar Estudio al Paciente por WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Activa la recepción automática para <strong>{pacienteNombre || 'este paciente'}</strong> y opcionalmente envíale un mensaje invitándolo a responder con su PDF o foto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-target-phone" className="text-xs font-semibold">
                WhatsApp del Paciente (o Familiar acompañante)
              </Label>
              <div className="relative">
                <Phone className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="wa-target-phone"
                  value={waTelefonoDestino}
                  onChange={(e) => setWaTelefonoDestino(e.target.value)}
                  placeholder="+584121234567"
                  className="pl-9 h-9 text-xs font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cualquier PDF o imagen que llegue desde este número se insertará y analizará automáticamente en el Paso 4.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3">
              <div className="space-y-0.5 pr-3">
                <Label className="text-xs font-semibold">Enviar mensaje de invitación por WhatsApp ahora</Label>
                <p className="text-[11px] text-muted-foreground">
                  Si se desactiva, solo se activa la escucha silenciosa sin escribirle al paciente.
                </p>
              </div>
              <Switch checked={waEnviarMensaje} onCheckedChange={setWaEnviarMensaje} />
            </div>

            {waEnviarMensaje && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mensaje personalizado (opcional)</Label>
                <Textarea
                  rows={3}
                  value={waMensajeCustom}
                  onChange={(e) => setWaMensajeCustom(e.target.value)}
                  placeholder="Déjalo vacío para usar el mensaje clínico predeterminado con Spintax y simulación 'escribiendo...'."
                  className="text-xs resize-none"
                />
              </div>
            )}

            {waInfo?.whatsapp_phone && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-muted-foreground">
                Línea WhatsApp de esta sede: <strong className="font-mono text-foreground">+{waInfo.whatsapp_phone}</strong>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setModalSolicitarWaOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={waSolicitando}
              onClick={handleSolicitarPorWhatsApp}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {waSolicitando ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {waEnviarMensaje ? 'Enviar Invitación y Escuchar' : 'Activar Escucha en Vivo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL ASIGNAR ARCHIVO ENTRANTE DE WHATSAPP A ESTA CONSULTA ── */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-5 text-emerald-600" />
              Asignar y Analizar Estudio de WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              El archivo se vinculará a <strong>{pacienteNombre || 'la consulta actual'}</strong> y el Bot Clínico lo analizará inmediatamente.
            </DialogDescription>
          </DialogHeader>

          {selectedPendiente && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-semibold text-foreground truncate">{selectedPendiente.archivo_nombre}</p>
                <p className="text-muted-foreground">
                  Enviado por: <span className="font-mono">+{selectedPendiente.remitente_telefono}</span>
                  {selectedPendiente.remitente_nombre ? ` (${selectedPendiente.remitente_nombre})` : ''}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Título del Estudio *</Label>
                <Input
                  value={assignTitulo}
                  onChange={(e) => setAssignTitulo(e.target.value)}
                  className="h-9 text-xs"
                  placeholder="Ej: Hematología Completa, Eco Abdominal..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoría *</Label>
                <Select
                  value={assignCategoria}
                  onValueChange={(v) => setAssignCategoria(v as any)}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laboratorio" className="text-xs">Laboratorio Clínico</SelectItem>
                    <SelectItem value="imagenologia" className="text-xs">Imagenología (Eco, Rx, TAC, Panorámica)</SelectItem>
                    <SelectItem value="informe" className="text-xs">Informe Médico</SelectItem>
                    <SelectItem value="otro" className="text-xs">Otro Adjunto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notas adicionales (opcional)</Label>
                <Input
                  value={assignNotas}
                  onChange={(e) => setAssignNotas(e.target.value)}
                  className="h-9 text-xs"
                  placeholder="Observaciones médicas..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={assignLoading}
              onClick={handleConfirmAssign}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {assignLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
              Asignar y Analizar con Bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL SUBIR NUEVO ESTUDIO MANUAL (RADIX SELECT + DIALOG) ── */}
      <Dialog open={modalUploadOpen} onOpenChange={setModalUploadOpen}>
        <DialogContent className="max-w-xl bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Adjuntar Examen o Estudio Médico
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGuardarEstudio} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título del Estudio / Examen *</Label>
              <Input
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Hematología Completa, Panorámica Dental, Eco Abdominal"
                className="text-sm bg-background border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoría *</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as any)}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laboratorio" className="text-xs">Laboratorio Clínico</SelectItem>
                    <SelectItem value="imagenologia" className="text-xs">Imagenología (Eco, Panorámica, Rx)</SelectItem>
                    <SelectItem value="informe" className="text-xs">Informe Médico</SelectItem>
                    <SelectItem value="otro" className="text-xs">Otro Adjunto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Fecha del Estudio *</Label>
                <Input
                  type="date"
                  required
                  value={fechaEstudio}
                  onChange={(e) => setFechaEstudio(e.target.value)}
                  className="text-xs bg-background border-border text-foreground h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subtipo / Especialidad (Opcional)</Label>
              <Input
                value={subtipo}
                onChange={(e) => setSubtipo(e.target.value)}
                placeholder="Ej. hemograma, perfil_lipidico, panoramica_dental, ecografia"
                className="text-xs bg-background border-border text-foreground h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Archivo de Imagen o Documento *</Label>
              <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-muted/30 relative">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  required={!archivoBase64}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {archivoNombre ? (
                  <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="truncate max-w-xs">{archivoNombre}</span>
                    <span className="text-xs text-muted-foreground">({Math.round(archivoTamano / 1024)} KB)</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-xs">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">Haga clic o arrastre el archivo aquí</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Imágenes (PNG, JPG, WEBP) o PDF</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas Médicas / Observaciones (Opcional)</Label>
              <Input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Detalles sobre la orden o indicaciones previas"
                className="text-xs bg-background border-border text-foreground h-9"
              />
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2.5 text-xs text-foreground">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>
                Al guardar, <strong>MediCore AI Local</strong> leerá el PDF o fotografía con OCR neuronal propio, calculará índices clínicos, detectará síndromes y sugerirá códigos CIE-10 sin costos externos.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalUploadOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadLoading} className="text-xs gap-1.5 cursor-pointer font-semibold">
                {uploadLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando y Analizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Guardar y Analizar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ALERT DIALOG CONFIRMAR ELIMINACIÓN (RADIX) ── */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudio clínico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción retirará permanentemente el archivo adjunto y el análisis generado por el asistente de la historia del paciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEliminar} className="bg-destructive text-white hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL VISOR INTELIGENTE ── */}
      <EstudioDetalleModal
        estudioId={selectedEstudioId}
        open={modalViewerOpen}
        onClose={() => {
          setModalViewerOpen(false);
          setSelectedEstudioId(null);
        }}
        onEstudioUpdated={fetchEstudios}
        onApplyDiagnosticoPrincipal={onApplyDiagnosticoPrincipal}
        onAddDiagnosticoSecundario={onAddDiagnosticoSecundario}
      />
    </div>
  );
};

export default EstudiosArchivosTab;
