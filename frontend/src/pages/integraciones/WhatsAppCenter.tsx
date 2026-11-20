import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  integracionesApi,
  type QueueStats,
  type WhatsAppDiagnostic,
  type BroadcastRecipient,
  type MessagesResponse,
} from '../../api/integraciones';
import type {
  WhatsAppStatus,
  WhatsAppInstanceSummary,
  WhatsAppTemplate,
  WhatsAppMessage,
} from '../../types';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  Building2,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Edit2,
  FileText,
  Flame,
  Hash,
  Inbox,
  Keyboard,
  Loader2,
  Megaphone,
  MessageSquare,
  Pause,
  Phone,
  Play,
  Plus,
  Power,
  QrCode,
  Radio,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
  WifiOff,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Checkbox } from '../../components/ui/checkbox';
import { Separator } from '../../components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ModuleHeader } from '../../components/common/ModuleHeader';
import { cn } from '../../lib/utils';

const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string }> = {
  recordatorio_cita: { label: 'Recordatorio de Cita', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  confirmacion_turno: { label: 'Confirmación de Turno', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  receta_medica: { label: 'Receta / Indicaciones', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  resultado_estudio: { label: 'Resultados / Estudios', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  general: { label: 'General / Comunicación', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20' },
};

const WARMUP_STAGES = [
  { label: 'Días 1–2', limit: 20, minDay: 1, maxDay: 2 },
  { label: 'Días 3–4', limit: 40, minDay: 3, maxDay: 4 },
  { label: 'Días 5–7', limit: 80, minDay: 5, maxDay: 7 },
  { label: 'Días 8–14', limit: 150, minDay: 8, maxDay: 14 },
  { label: 'Día 15+', limit: null, minDay: 15, maxDay: 9999 },
];

export const WhatsAppCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('connection');

  // Multi-instancia (Principal + Sucursales)
  const [instances, setInstances] = useState<WhatsAppInstanceSummary[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);

  // Estado actual de la instancia seleccionada
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messagesData, setMessagesData] = useState<MessagesResponse | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Modo de vinculación: QR o Código de 8 dígitos
  const [linkMode, setLinkMode] = useState<'qr' | 'phone'>('qr');
  const [pairPhoneInput, setPairPhoneInput] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Envío de prueba y verificador de número
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(
    '{Hola|Buen día|Saludos}, este es un mensaje de prueba directo desde el motor Python de *MediSoft Suite*. ✅'
  );
  const [testSimulateTyping, setTestSimulateTyping] = useState(true);
  const [testUseQueue, setTestUseQueue] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    exists: boolean;
    phone: string;
    verified_live?: boolean;
    verified_name?: string;
    reason?: string;
  } | null>(null);

  // Formulario de Políticas Anti-Baneo & Control de Envíos
  const [abDailyLimit, setAbDailyLimit] = useState(200);
  const [abHourlyLimit, setAbHourlyLimit] = useState(25);
  const [abWarmupMode, setAbWarmupMode] = useState(true);
  const [abWorkingHoursEnabled, setAbWorkingHoursEnabled] = useState(true);
  const [abWorkingHoursStart, setAbWorkingHoursStart] = useState('08:00');
  const [abWorkingHoursEnd, setAbWorkingHoursEnd] = useState('20:00');
  const [abSimulateTyping, setAbSimulateTyping] = useState(true);
  const [abTypingMinSec, setAbTypingMinSec] = useState(2.0);
  const [abTypingMaxSec, setAbTypingMaxSec] = useState(6.0);
  const [abDelayMinSec, setAbDelayMinSec] = useState(8);
  const [abDelayMaxSec, setAbDelayMaxSec] = useState(20);
  const [abBatchSize, setAbBatchSize] = useState(10);
  const [abBatchPauseSec, setAbBatchPauseSec] = useState(60);
  const [abVerifyNumber, setAbVerifyNumber] = useState(true);
  const [abProxyUrl, setAbProxyUrl] = useState('');
  const [savingAntiBan, setSavingAntiBan] = useState(false);

  // Difusión Segura (Cola Anti-Ban)
  const [bcTarget, setBcTarget] = useState<'pacientes' | 'medicos' | 'usuarios'>('pacientes');
  const [bcRecipients, setBcRecipients] = useState<BroadcastRecipient[]>([]);
  const [bcSelectedIds, setBcSelectedIds] = useState<number[]>([]);
  const [bcSearch, setBcSearch] = useState('');
  const [bcMessage, setBcMessage] = useState(
    '{Hola|Buen día|Estimado/a} *{paciente}*, le {recordamos|informamos} que en *{empresa}* seguimos atentos a su salud.'
  );
  const [bcPreviews, setBcPreviews] = useState<string[]>([]);
  const [bcLoadingRecipients, setBcLoadingRecipients] = useState(false);
  const [bcDispatching, setBcDispatching] = useState(false);

  // Plantillas CRUD
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<WhatsAppTemplate | null>(null);
  const [tplNombre, setTplNombre] = useState('');
  const [tplCategoria, setTplCategoria] = useState('recordatorio_cita');
  const [tplContenido, setTplContenido] = useState('');
  const [tplActivo, setTplActivo] = useState(true);
  const [tplPreviews, setTplPreviews] = useState<string[]>([]);
  const [savingTpl, setSavingTpl] = useState(false);

  // Bitácora / Cola
  const [msgPage, setMsgPage] = useState(1);
  const [msgSearch, setMsgSearch] = useState('');
  const [msgStatusFilter, setMsgStatusFilter] = useState('all');
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // Diagnóstico del Motor Python
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<WhatsAppDiagnostic | null>(null);

  // Cargar resumen de todas las instancias (por sucursal)
  const loadInstances = useCallback(async () => {
    try {
      const list = await integracionesApi.getWhatsAppInstances();
      setInstances(list);
      // Seleccionar automáticamente la primera sucursal disponible si aún no hay una seleccionada
      if (list.length > 0) {
        setSelectedSucursalId((prev) => {
          if (prev !== null && list.some((i) => i.sucursal_id === prev)) {
            return prev;
          }
          return list[0].sucursal_id ?? null;
        });
      }
    } catch {
      // silencioso
    }
  }, []);

  // Cargar datos completos de la instancia seleccionada
  const loadSelectedInstanceData = useCallback(
    async (syncForm: boolean = false) => {
      try {
        const [st, qs] = await Promise.all([
          integracionesApi.getWhatsAppStatus(selectedSucursalId),
          integracionesApi.getQueueStats(selectedSucursalId),
        ]);
        setStatus(st);
        setQueueStats(qs);
        if (syncForm && qs) {
          setAbDailyLimit(qs.dailyLimit);
          setAbHourlyLimit(qs.hourlyLimit);
          setAbWarmupMode(qs.warmupMode);
          setAbWorkingHoursEnabled(qs.workingHoursEnabled);
          setAbWorkingHoursStart(qs.workingHoursStart);
          setAbWorkingHoursEnd(qs.workingHoursEnd);
          setAbSimulateTyping(qs.simulateTyping);
          setAbTypingMinSec(qs.typingMinSec);
          setAbTypingMaxSec(qs.typingMaxSec);
          setAbDelayMinSec(qs.delayMinSec);
          setAbDelayMaxSec(qs.delayMaxSec);
          setAbBatchSize(qs.batchSize);
          setAbBatchPauseSec(qs.batchPauseSec);
          setAbVerifyNumber(qs.verifyNumber);
          setAbProxyUrl(qs.proxyUrl || '');
        }
      } catch {
        // silencioso
      }
    },
    [selectedSucursalId]
  );

  const loadTemplates = useCallback(async () => {
    try {
      const list = await integracionesApi.getTemplates();
      setTemplates(list);
    } catch {
      // silencioso
    }
  }, []);

  const loadMessages = useCallback(
    async (page = msgPage, search = msgSearch, st = msgStatusFilter) => {
      try {
        const data = await integracionesApi.getMessages(page, search, st, 12, selectedSucursalId);
        setMessagesData(data);
      } catch {
        // silencioso
      }
    },
    [msgPage, msgSearch, msgStatusFilter, selectedSucursalId]
  );

  const loadBroadcastRecipients = useCallback(async (target: string) => {
    setBcLoadingRecipients(true);
    try {
      const list = await integracionesApi.getBroadcastRecipients(target);
      setBcRecipients(list);
      setBcSelectedIds([]);
    } catch {
      toast.error('Error cargando destinatarios');
    } finally {
      setBcLoadingRecipients(false);
    }
  }, []);

  // Carga inicial y al cambiar de instancia
  useEffect(() => {
    setPairingCode(null);
    setCheckResult(null);
    loadInstances();
    loadSelectedInstanceData(true);
    loadTemplates();
    loadMessages(1, msgSearch, msgStatusFilter);
    setMsgPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSucursalId]);

  // Polling inteligente en vivo: cada 2.5s mientras espera QR/conexión/reconexión o hay mensajes en cola, si no cada 10s
  useEffect(() => {
    const fastMode =
      status?.connection_state === 'QR_READY' ||
      status?.connection_state === 'CONNECTING' ||
      status?.connection_state === 'RECONNECTING' ||
      (queueStats?.queued ?? 0) > 0 ||
      Boolean(status?.currently_typing_to);

    const interval = setInterval(() => {
      loadSelectedInstanceData(false);
      loadInstances();
      if (activeTab === 'logs' || (queueStats?.queued ?? 0) > 0) {
        loadMessages(msgPage, msgSearch, msgStatusFilter);
      }
    }, fastMode ? 2500 : 10000);

    return () => clearInterval(interval);
  }, [
    status?.connection_state,
    status?.currently_typing_to,
    queueStats?.queued,
    activeTab,
    msgPage,
    msgSearch,
    msgStatusFilter,
    loadSelectedInstanceData,
    loadInstances,
    loadMessages,
  ]);

  // Cargar destinatarios cuando se abre el tab de difusión o cambia audiencia
  useEffect(() => {
    if (activeTab === 'broadcast') {
      loadBroadcastRecipients(bcTarget);
    }
  }, [activeTab, bcTarget, loadBroadcastRecipients]);

  // Recargar mensajes al cambiar filtros
  useEffect(() => {
    if (activeTab === 'logs') {
      loadMessages(msgPage, msgSearch, msgStatusFilter);
    }
  }, [activeTab, msgPage, msgSearch, msgStatusFilter, loadMessages]);

  // Acciones de Conexión
  const handleConnect = async () => {
    setLoadingAction(true);
    setPairingCode(null);
    try {
      const res = await integracionesApi.connectWhatsApp(selectedSucursalId);
      setStatus(res);
      await loadInstances();
      if (res.is_connected) {
        toast.success(`Instancia ${res.instance_name} conectada (+${res.phone_number || ''})`);
      } else if (res.qr_data_url) {
        toast.success('Código QR generado directamente desde Python. Escanéalo con tu WhatsApp.');
      } else {
        toast.info('Iniciando sesión nativa de WhatsApp...');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo iniciar la instancia WhatsApp');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReconnect = async () => {
    setLoadingAction(true);
    setPairingCode(null);
    try {
      const res = await integracionesApi.reconnectWhatsApp(selectedSucursalId);
      setStatus(res);
      await loadInstances();
      toast.success('Sesión reiniciada. Nuevo código QR listo.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error regenerando QR');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDisconnect = async () => {
    setLoadingAction(true);
    setPairingCode(null);
    try {
      const res = await integracionesApi.disconnectWhatsApp(selectedSucursalId);
      setStatus(res);
      await loadInstances();
      toast.success('Instancia desvinculada y sesión local eliminada.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al desconectar la instancia');
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePairPhone = async () => {
    if (!pairPhoneInput.trim()) {
      toast.error('Ingresa tu número de WhatsApp con código de país (ej. +584121234567)');
      return;
    }
    setPairLoading(true);
    setPairingCode(null);
    try {
      const res = await integracionesApi.pairWhatsAppPhone(pairPhoneInput.trim(), selectedSucursalId);
      if (res.already_connected) {
        toast.success('Esta instancia ya está conectada.');
        loadSelectedInstanceData(false);
      } else if (res.pairing_code) {
        setPairingCode(res.pairing_code);
        toast.success('Código de 8 dígitos generado. Ingrésalo en WhatsApp → Dispositivos vinculados.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo generar el código de emparejamiento');
    } finally {
      setPairLoading(false);
    }
  };

  const handleCopyPairingCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    toast.success('Código copiado al portapapeles');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Diagnóstico
  const handleRunDiagnostic = async () => {
    setDiagOpen(true);
    setDiagLoading(true);
    try {
      const res = await integracionesApi.runDiagnostic(selectedSucursalId);
      setDiagnostic(res);
    } catch {
      toast.error('Error ejecutando diagnóstico del motor Python');
    } finally {
      setDiagLoading(false);
    }
  };

  // Verificador de número real
  const handleCheckNumber = async () => {
    if (!testPhone.trim()) {
      toast.error('Ingresa un número telefónico para verificar');
      return;
    }
    setCheckLoading(true);
    setCheckResult(null);
    try {
      const res = await integracionesApi.checkNumber(testPhone.trim(), selectedSucursalId);
      if (res.result) {
        setCheckResult(res.result);
        if (res.result.exists) {
          toast.success(`+${res.result.phone} tiene WhatsApp activo`);
        } else {
          toast.warning(`+${res.result.phone} NO está registrado en WhatsApp`);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error verificando número');
    } finally {
      setCheckLoading(false);
    }
  };

  // Envío de prueba
  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error('Completa el número destino y el mensaje de prueba');
      return;
    }
    setSendingTest(true);
    try {
      const res = await integracionesApi.sendWhatsAppTest(
        {
          phone: testPhone.trim(),
          message: testMessage,
          sync: !testUseQueue,
          simulate_typing: testSimulateTyping,
          verify_number: abVerifyNumber,
        },
        selectedSucursalId
      );
      toast.success(res.mensaje);
      loadSelectedInstanceData(false);
      loadInstances();
      loadMessages(1, msgSearch, msgStatusFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo enviar el mensaje de prueba');
    } finally {
      setSendingTest(false);
    }
  };

  // Guardar Políticas Anti-Baneo
  const handleSaveAntiBan = async () => {
    setSavingAntiBan(true);
    try {
      const res = await integracionesApi.updateAntiBan(
        {
          dailyLimit: abDailyLimit,
          hourlyLimit: abHourlyLimit,
          warmupMode: abWarmupMode,
          workingHoursEnabled: abWorkingHoursEnabled,
          workingHoursStart: abWorkingHoursStart,
          workingHoursEnd: abWorkingHoursEnd,
          simulateTyping: abSimulateTyping,
          typingMinSec: abTypingMinSec,
          typingMaxSec: abTypingMaxSec,
          delayMinSec: abDelayMinSec,
          delayMaxSec: abDelayMaxSec,
          batchSize: abBatchSize,
          batchPauseSec: abBatchPauseSec,
          verifyNumber: abVerifyNumber,
          proxyUrl: abProxyUrl.trim() || null,
        },
        selectedSucursalId
      );
      toast.success(res.mensaje);
      await loadSelectedInstanceData(true);
      await loadInstances();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error guardando políticas Anti-Baneo');
    } finally {
      setSavingAntiBan(false);
    }
  };

  // Pausar / Reanudar Cola
  const handleToggleQueuePause = async () => {
    const nextPaused = !(queueStats?.queuePaused || status?.queue_paused);
    try {
      const res = await integracionesApi.toggleQueuePause(nextPaused, selectedSucursalId);
      toast.success(res.mensaje);
      await loadSelectedInstanceData(false);
      await loadInstances();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error cambiando estado de la cola');
    }
  };

  const handleClearQueue = async () => {
    try {
      const res = await integracionesApi.clearQueue(selectedSucursalId);
      toast.success(res.mensaje);
      await loadSelectedInstanceData(false);
      await loadMessages(1, msgSearch, msgStatusFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error vaciando la cola');
    }
  };

  // Preview Spintax
  const handlePreviewSpintax = async (text: string, target: 'broadcast' | 'template') => {
    if (!text.trim()) return;
    try {
      const res = await integracionesApi.previewSpintax(text, 3);
      if (target === 'broadcast') setBcPreviews(res.variations);
      else setTplPreviews(res.variations);
    } catch {
      toast.error('No se pudo previsualizar el Spintax');
    }
  };

  // Difusión masiva en cola segura
  const filteredRecipients = useMemo(() => {
    const q = bcSearch.trim().toLowerCase();
    if (!q) return bcRecipients;
    return bcRecipients.filter(
      (r) => r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q)
    );
  }, [bcRecipients, bcSearch]);

  const validFilteredIds = useMemo(
    () => filteredRecipients.filter((r) => r.is_valid_phone).map((r) => r.id),
    [filteredRecipients]
  );

  const toggleSelectAllValid = (checked: boolean) => {
    if (checked) {
      setBcSelectedIds(validFilteredIds);
    } else {
      setBcSelectedIds([]);
    }
  };

  const toggleRecipient = (id: number) => {
    setBcSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const estimatedBroadcastMinutes = useMemo(() => {
    const count = bcSelectedIds.length;
    if (count === 0) return 0;
    const avgDelay = (abDelayMinSec + abDelayMaxSec) / 2;
    const avgTyping = abSimulateTyping ? (abTypingMinSec + abTypingMaxSec) / 2 : 0;
    const batches = Math.floor(count / Math.max(2, abBatchSize));
    const totalSec = count * (avgDelay + avgTyping) + batches * abBatchPauseSec;
    return Math.max(1, Math.ceil(totalSec / 60));
  }, [bcSelectedIds.length, abDelayMinSec, abDelayMaxSec, abSimulateTyping, abTypingMinSec, abTypingMaxSec, abBatchSize, abBatchPauseSec]);

  const handleDispatchBroadcast = async () => {
    if (bcSelectedIds.length === 0) {
      toast.error('Selecciona al menos un destinatario con teléfono válido');
      return;
    }
    if (!bcMessage.trim()) {
      toast.error('Escribe el mensaje a encolar');
      return;
    }
    setBcDispatching(true);
    try {
      const res = await integracionesApi.dispatchBroadcast(
        {
          recipient_ids: bcSelectedIds,
          target_type: bcTarget,
          message: bcMessage,
          delay_seconds: abDelayMinSec,
        },
        selectedSucursalId
      );
      toast.success(res.message);
      setBcSelectedIds([]);
      setActiveTab('logs');
      await loadSelectedInstanceData(false);
      await loadMessages(1, '', 'all');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al encolar la difusión');
    } finally {
      setBcDispatching(false);
    }
  };

  // Plantillas CRUD
  const openNewTemplate = () => {
    setEditingTpl(null);
    setTplNombre('');
    setTplCategoria('recordatorio_cita');
    setTplContenido(
      '{Hola|Buen día} *{paciente}*, le {recordamos|confirmamos} su cita el *{fecha}* a las *{hora}* con el Dr(a). *{medico}*.'
    );
    setTplActivo(true);
    setTplPreviews([]);
    setTplDialogOpen(true);
  };

  const openEditTemplate = (tpl: WhatsAppTemplate) => {
    setEditingTpl(tpl);
    setTplNombre(tpl.nombre);
    setTplCategoria(tpl.categoria);
    setTplContenido(tpl.contenido);
    setTplActivo(tpl.activo);
    setTplPreviews([]);
    setTplDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!tplNombre.trim() || !tplContenido.trim()) {
      toast.error('Nombre y contenido son obligatorios');
      return;
    }
    setSavingTpl(true);
    try {
      if (editingTpl) {
        await integracionesApi.updateTemplate(editingTpl.id, {
          nombre: tplNombre.trim(),
          categoria: tplCategoria,
          contenido: tplContenido,
          activo: tplActivo,
        });
        toast.success('Plantilla actualizada');
      } else {
        await integracionesApi.createTemplate({
          nombre: tplNombre.trim(),
          categoria: tplCategoria,
          contenido: tplContenido,
          activo: tplActivo,
        });
        toast.success('Plantilla creada');
      }
      setTplDialogOpen(false);
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error guardando plantilla');
    } finally {
      setSavingTpl(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await integracionesApi.deleteTemplate(id);
      toast.success('Plantilla eliminada');
      loadTemplates();
    } catch {
      toast.error('No se pudo eliminar la plantilla');
    }
  };

  const handleRetryMessage = async (id: number) => {
    setRetryingId(id);
    try {
      const res = await integracionesApi.retryMessage(id);
      toast.success(res.mensaje || 'Mensaje reenviado');
      loadMessages(msgPage, msgSearch, msgStatusFilter);
      loadSelectedInstanceData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Fallo al reintentar');
    } finally {
      setRetryingId(null);
    }
  };

  // Helpers visuales
  const selectedInstance = useMemo(
    () =>
      instances.find((inst) =>
        selectedSucursalId === null ? !inst.is_sucursal : inst.sucursal_id === selectedSucursalId
      ) || null,
    [instances, selectedSucursalId]
  );

  const isConnected = status?.connection_state === 'CONNECTED';
  const isQrReady = status?.connection_state === 'QR_READY';
  const isConnecting = status?.connection_state === 'CONNECTING' || status?.connection_state === 'RECONNECTING';
  const isReconnecting = status?.connection_state === 'RECONNECTING';
  const isBannedCooldown = status?.connection_state === 'BANNED_COOLDOWN';
  const isPaused = Boolean(queueStats?.queuePaused || status?.queue_paused);

  const safetyScore = queueStats?.safetyScore ?? 100;
  const dailyPct = queueStats
    ? Math.min(100, Math.round((queueStats.sentToday / Math.max(1, queueStats.effectiveDailyLimit)) * 100))
    : 0;
  const hourlyPct = queueStats
    ? Math.min(100, Math.round((queueStats.sentThisHour / Math.max(1, queueStats.hourlyLimit)) * 100))
    : 0;

  const renderStateBadge = (state: string, compact = false) => {
    switch (state) {
      case 'CONNECTED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {compact ? 'En línea' : 'Conectado'}
          </Badge>
        );
      case 'QR_READY':
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 font-semibold">
            <QrCode className="size-3" />
            Esperando QR
          </Badge>
        );
      case 'RECONNECTING':
        return (
          <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 gap-1.5 font-semibold">
            <Loader2 className="size-3 animate-spin" />
            Reconectando
          </Badge>
        );
      case 'CONNECTING':
        return (
          <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 gap-1.5 font-semibold">
            <Loader2 className="size-3 animate-spin" />
            Conectando
          </Badge>
        );
      case 'BANNED_COOLDOWN':
        return (
          <Badge variant="destructive" className="gap-1.5 font-semibold">
            <ShieldAlert className="size-3" />
            Pausa Anti-Ban
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1.5 font-medium">
            <WifiOff className="size-3" />
            Desconectado
          </Badge>
        );
    }
  };

  const renderMsgStatus = (m: WhatsAppMessage) => {
    switch (m.status) {
      case 'read':
        return (
          <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 gap-1 text-[11px]">
            <CheckCheck className="size-3" /> Leído
          </Badge>
        );
      case 'delivered':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-[11px]">
            <CheckCheck className="size-3" /> Entregado
          </Badge>
        );
      case 'sent':
        return (
          <Badge className="bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 gap-1 text-[11px]">
            <Check className="size-3" /> Enviado
          </Badge>
        );
      case 'sending':
        return (
          <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 gap-1 text-[11px]">
            <Keyboard className="size-3 animate-pulse" /> Escribiendo...
          </Badge>
        );
      case 'queued':
      case 'pending':
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 text-[11px]">
            <Clock className="size-3" /> En cola
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-muted-foreground text-[11px]">
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <AlertTriangle className="size-3" /> Fallido
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* ── ENCABEZADO PRINCIPAL ── */}
      <ModuleHeader
        icon={<MessageSquare className="size-6 text-white" />}
        title="Centro de WhatsApp Nativo (Python)"
        description="Conexión multi-instancia directa sin intermediarios, simulación de escritura humana y escudo Anti-Baneo en tiempo real."
        colorClassName="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-700 dark:via-teal-700 dark:to-cyan-800"
      >
        <Badge className="bg-white/15 hover:bg-white/20 text-white border-white/25 gap-1.5 px-2.5 py-1 text-xs">
          <Cpu className="size-3.5" />
          Motor Python · Sin Intermediarios
        </Badge>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRunDiagnostic}
          className="bg-white/15 hover:bg-white/25 text-white border border-white/20 gap-1.5"
        >
          <Activity className="size-4" />
          <span className="hidden sm:inline">Diagnóstico</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            loadInstances();
            loadSelectedInstanceData(false);
            toast.info('Estado sincronizado con el motor Python');
          }}
          className="bg-white/15 hover:bg-white/25 text-white border border-white/20 gap-1.5"
        >
          <RefreshCw className="size-4" />
        </Button>
      </ModuleHeader>

      {/* ── SELECTOR MULTI-INSTANCIA POR SUCURSAL ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="size-3.5" />
            <span>Instancias por Sucursal ({instances.length || 1})</span>
          </div>
          {status?.currently_typing_to && (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 animate-pulse">
              <Keyboard className="size-3.5" />
              Escribiendo a +{status.currently_typing_to}...
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {instances.map((inst) => {
            const isSelected = selectedSucursalId === null ? !inst.is_sucursal : inst.sucursal_id === selectedSucursalId;
            const pct = Math.min(100, Math.round((inst.sent_today / Math.max(1, inst.effective_daily_limit)) * 100));
            return (
              <button
                key={inst.instance_name}
                type="button"
                onClick={() => setSelectedSucursalId(inst.is_sucursal ? (inst.sucursal_id ?? null) : null)}
                className={cn(
                  'text-left rounded-xl border p-3.5 transition-all cursor-pointer bg-card hover:border-primary/50',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                    : 'border-border/80 hover:bg-muted/30'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{inst.label}</p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      {inst.phone_number ? `+${inst.phone_number}` : inst.instance_name}
                    </p>
                  </div>
                  {renderStateBadge(inst.connection_state, true)}
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Hoy: {inst.sent_today}/{inst.effective_daily_limit}</span>
                    <span className="flex items-center gap-1">
                      {inst.queued > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {inst.queued} cola
                        </span>
                      )}
                      {inst.queue_paused && <Pause className="size-3 text-rose-500" />}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ALERTA CIRCUIT BREAKER / PAUSA ── */}
      {(isPaused || isBannedCooldown) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">
                {isBannedCooldown ? 'Circuit Breaker Anti-Ban Activado' : 'Cola de Envíos en Pausa'}
              </p>
              <p className="text-xs text-muted-foreground">
                {queueStats?.pauseReason ||
                  status?.pause_reason ||
                  'Los envíos automáticos y difusiones en cola están retenidos para esta instancia.'}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleToggleQueuePause} className="gap-1.5 shrink-0">
            <Play className="size-3.5" />
            Reanudar Cola
          </Button>
        </div>
      )}

      {/* ── KPIs EN TIEMPO REAL ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-border/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Instancia Activa</span>
              <Radio className={cn('size-4', isConnected ? 'text-emerald-500' : 'text-muted-foreground')} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-bold text-foreground truncate">
                {status?.phone_number ? `+${status.phone_number}` : status?.instance_name || '—'}
              </span>
              {renderStateBadge(status?.connection_state || 'DISCONNECTED', true)}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {status?.push_name
                ? `Perfil: ${status.push_name}`
                : status?.using_fallback
                ? 'Usando línea principal como respaldo'
                : 'Sesión local cifrada en Python'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cuota Diaria / Horaria</span>
              <Flame className="size-4 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-foreground">
                {queueStats?.sentToday ?? 0}
                <span className="text-xs font-normal text-muted-foreground">
                  {' '}/ {queueStats?.effectiveDailyLimit ?? 200}
                </span>
              </span>
              {queueStats?.warmupMode && (
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                  Warm-up Día {queueStats.warmupDay}
                </Badge>
              )}
            </div>
            <Progress value={dailyPct} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              Última hora: <strong>{queueStats?.sentThisHour ?? 0}/{queueStats?.hourlyLimit ?? 25}</strong> ({hourlyPct}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Control de Cola</span>
              <Clock className="size-4 text-sky-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-foreground">{queueStats?.queued ?? 0} en cola</span>
              <Button
                size="sm"
                variant={isPaused ? 'default' : 'outline'}
                onClick={handleToggleQueuePause}
                className="h-7 px-2.5 text-xs gap-1"
              >
                {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
                {isPaused ? 'Reanudar' : 'Pausar'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span
                className={cn(
                  'size-2 rounded-full',
                  queueStats?.withinWorkingHours ? 'bg-emerald-500' : 'bg-amber-500'
                )}
              />
              {queueStats?.workingHoursEnabled
                ? queueStats.withinWorkingHours
                  ? `En horario laboral (${queueStats.workingHoursStart}–${queueStats.workingHoursEnd})`
                  : `Fuera de horario (retiene hasta ${queueStats.workingHoursStart})`
                : 'Despacho habilitado 24/7'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Escudo Anti-Baneo</span>
              <ShieldCheck
                className={cn(
                  'size-4',
                  safetyScore >= 80 ? 'text-emerald-500' : safetyScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                )}
              />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-foreground">{safetyScore}%</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  safetyScore >= 80
                    ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : safetyScore >= 50
                    ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                    : 'border-rose-500/40 text-rose-600 dark:text-rose-400'
                )}
              >
                {safetyScore >= 80 ? 'Blindaje Alto' : safetyScore >= 50 ? 'Moderado' : 'Riesgo Alto'}
              </Badge>
            </div>
            <Progress value={safetyScore} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground truncate">
              {queueStats?.simulateTyping
                ? `Typing activo (${queueStats.typingMinSec}–${queueStats.typingMaxSec}s) · Delay ${queueStats.delayMinSec}–${queueStats.delayMaxSec}s`
                : 'Activa Typing y Warm-up para máxima protección'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── PESTAÑAS PRINCIPALES (RADIX TABS) ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/60 p-1 h-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger value="connection" className="gap-1.5 text-xs py-2 cursor-pointer">
            <QrCode className="size-3.5" />
            <span>Instancia & Conexión</span>
          </TabsTrigger>
          <TabsTrigger value="antiban" className="gap-1.5 text-xs py-2 cursor-pointer">
            <Shield className="size-3.5" />
            <span>Seguridad Anti-Baneo</span>
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5 text-xs py-2 cursor-pointer">
            <Megaphone className="size-3.5" />
            <span>Difusión Segura</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs py-2 cursor-pointer">
            <FileText className="size-3.5" />
            <span>Plantillas & Spintax</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs py-2 cursor-pointer">
            <Inbox className="size-3.5" />
            <span>Cola & Bitácora</span>
            {(queueStats?.queued ?? 0) > 0 && (
              <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-amber-500 text-white">
                {queueStats?.queued}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: INSTANCIA, VINCULACIÓN DIRECTA & PRUEBAS EN VIVO         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="connection" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Tarjeta de Vinculación QR / Teléfono */}
            <Card className="lg:col-span-6 border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Smartphone className="size-4 text-primary" />
                      Vincular: {selectedInstance?.label || status?.instance_name || 'Instancia'}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Sesión Multi-Dispositivo ejecutada directamente en Python (sin servidores externos).
                    </CardDescription>
                  </div>
                  {renderStateBadge(status?.connection_state || 'DISCONNECTED')}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {isConnected ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
                    <div className="mx-auto size-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                      <CheckCircle2 className="size-8 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">WhatsApp Conectado</h3>
                      <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        +{status?.phone_number || 'Línea vinculada'}
                      </p>
                      {status?.push_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Cuenta: <strong>{status.push_name}</strong> · Instancia: <span className="font-mono">{status.instance_name}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReconnect}
                        disabled={loadingAction}
                        className="gap-1.5"
                      >
                        <RotateCw className="size-3.5" />
                        Cambiar Línea
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={loadingAction}
                        className="gap-1.5"
                      >
                        <Power className="size-3.5" />
                        Desvincular Sesión
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selector de método de emparejamiento */}
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/50 border border-border/70">
                      <button
                        type="button"
                        onClick={() => setLinkMode('qr')}
                        className={cn(
                          'flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition cursor-pointer',
                          linkMode === 'qr'
                            ? 'bg-card text-foreground shadow-xs border border-border/80'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <QrCode className="size-3.5" />
                        Código QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkMode('phone')}
                        className={cn(
                          'flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition cursor-pointer',
                          linkMode === 'phone'
                            ? 'bg-card text-foreground shadow-xs border border-border/80'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Hash className="size-3.5" />
                        Código de 8 Dígitos
                      </button>
                    </div>

                    {linkMode === 'qr' ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-5 min-h-[280px] space-y-4">
                        {isQrReady && status?.qr_data_url ? (
                          <>
                            <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200">
                              <img
                                src={status.qr_data_url}
                                alt="Código QR WhatsApp"
                                className="size-52 object-contain"
                              />
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-xs font-semibold text-foreground">
                                Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
                              </p>
                              {typeof status.qr_expires_in === 'number' && (
                                <p className="text-[11px] text-muted-foreground">
                                  Actualización automática activa · Expira en aprox.{' '}
                                  <strong className="text-amber-600 dark:text-amber-400">
                                    {status.qr_expires_in}s
                                  </strong>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleReconnect}
                                disabled={loadingAction}
                                className="gap-1.5 text-xs"
                              >
                                <RotateCw className="size-3.5" />
                                Regenerar QR
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleDisconnect}
                                disabled={loadingAction}
                                className="text-xs text-muted-foreground"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </>
                        ) : isConnecting || loadingAction ? (
                          <div className="text-center space-y-3 py-8">
                            <Loader2 className="size-10 animate-spin text-primary mx-auto" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {isReconnecting
                                  ? 'Restaurando sesión de WhatsApp automáticamente...'
                                  : 'Negociando sesión cifrada con WhatsApp...'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isReconnecting
                                  ? 'No hace falta volver a escanear; reconectando el socket cifrado.'
                                  : 'Generando código QR desde el motor nativo en Python'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-4 py-6 max-w-xs">
                            <div className="mx-auto size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <QrCode className="size-7 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-foreground">Instancia sin vincular</p>
                              <p className="text-xs text-muted-foreground">
                                Genera un código QR directo para vincular el WhatsApp de esta sede sin intermediarios.
                              </p>
                            </div>
                            <Button onClick={handleConnect} disabled={loadingAction} className="gap-2 w-full">
                              <Zap className="size-4" />
                              Iniciar Instancia y Generar QR
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">Vincular sin Cámara (Código de 8 dígitos)</p>
                          <p className="text-xs text-muted-foreground">
                            Ingresa el número de WhatsApp que deseas vincular. WhatsApp te enviará una notificación para introducir el código.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Input
                            value={pairPhoneInput}
                            onChange={(e) => setPairPhoneInput(e.target.value)}
                            placeholder="Ej: +584121234567"
                            className="h-10 text-xs font-mono"
                          />
                          <Button onClick={handlePairPhone} disabled={pairLoading} className="gap-1.5 shrink-0">
                            {pairLoading ? <Loader2 className="size-4 animate-spin" /> : <Hash className="size-4" />}
                            Generar Código
                          </Button>
                        </div>

                        {pairingCode && (
                          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                              Código de Vinculación WhatsApp
                            </p>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-2xl font-mono font-black tracking-[0.25em] text-primary">
                                {pairingCode}
                              </span>
                              <Button size="icon" variant="ghost" onClick={handleCopyPairingCode}>
                                {copiedCode ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                              </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              En tu móvil: WhatsApp → Dispositivos vinculados → Vincular con número de teléfono
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {status?.last_error && (
                      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        <span>{status.last_error}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tarjeta de Envío de Prueba Humanizado + Verificador de Números */}
            <Card className="lg:col-span-6 border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="size-4 text-primary" />
                  Probador en Vivo & Verificador WhatsApp
                </CardTitle>
                <CardDescription className="text-xs">
                  Verifica si un número existe en WhatsApp y prueba la simulación real de "Escribiendo..." y Spintax.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Número + Verificar */}
                <div className="space-y-1.5">
                  <Label htmlFor="test-phone" className="text-xs font-semibold">
                    Número Destino (con código de país)
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="test-phone"
                        value={testPhone}
                        onChange={(e) => {
                          setTestPhone(e.target.value);
                          setCheckResult(null);
                        }}
                        placeholder="+584121234567"
                        className="pl-9 h-10 text-xs font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCheckNumber}
                      disabled={checkLoading || !testPhone.trim()}
                      className="gap-1.5 text-xs shrink-0 h-10"
                    >
                      {checkLoading ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                      Verificar
                    </Button>
                  </div>

                  {checkResult && (
                    <div
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs flex items-center justify-between gap-2',
                        checkResult.exists
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {checkResult.exists ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                        +{checkResult.phone}: {checkResult.exists ? 'Cuenta activa en WhatsApp' : 'No registrado en WhatsApp'}
                        {checkResult.verified_name ? ` (${checkResult.verified_name})` : ''}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {checkResult.verified_live ? 'Consulta en vivo' : 'Solo formato'}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Mensaje con Spintax */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="test-msg" className="text-xs font-semibold">
                      Mensaje de Prueba (soporta Spintax {'{a|b}'})
                    </Label>
                    <span className="text-[11px] text-muted-foreground">{testMessage.length} caracteres</span>
                  </div>
                  <Textarea
                    id="test-msg"
                    rows={4}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="{Hola|Buen día}, mensaje de prueba..."
                    className="text-xs resize-none"
                  />
                </div>

                {/* Opciones de Envío de Prueba */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/20">
                    <div className="space-y-0.5 pr-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Keyboard className="size-3.5 text-primary" />
                        Simular "Escribiendo..."
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Envía presencia real antes del texto
                      </p>
                    </div>
                    <Switch checked={testSimulateTyping} onCheckedChange={setTestSimulateTyping} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/20">
                    <div className="space-y-0.5 pr-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="size-3.5 text-amber-500" />
                        Enviar vía Cola
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Aplica horario y retardo del worker
                      </p>
                    </div>
                    <Switch checked={testUseQueue} onCheckedChange={setTestUseQueue} />
                  </div>
                </div>

                <Button
                  onClick={handleSendTest}
                  disabled={sendingTest || !isConnected}
                  className="w-full h-10 gap-2 font-semibold"
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {testSimulateTyping && !testUseQueue
                        ? 'Simulando "Escribiendo..." y enviando...'
                        : 'Despachando...'}
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      {testUseQueue ? 'Encolar Mensaje de Prueba' : 'Enviar Prueba con Simulación Real'}
                    </>
                  )}
                </Button>

                {!isConnected && (
                  <p className="text-[11px] text-center text-muted-foreground">
                    Conecta la instancia escaneando el QR o mediante código de 8 dígitos para habilitar el envío.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SEGURIDAD ANTI-BANEO & CONTROL DE ENVÍOS                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="antiban" className="space-y-4">
          {/* Score + Recomendaciones */}
          <Card className="border-border/80">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'size-14 rounded-2xl flex flex-col items-center justify-center font-black text-lg border',
                    safetyScore >= 80
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : safetyScore >= 50
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  )}
                >
                  {safetyScore}%
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Índice de Protección Anti-Baneo ({selectedInstance?.label || 'Instancia'})
                  </h3>
                  {queueStats?.safetyTips && queueStats.safetyTips.length > 0 ? (
                    <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                      {queueStats.safetyTips.slice(0, 3).map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Todas las capas de seguridad humana están configuradas de forma óptima.
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={handleSaveAntiBan} disabled={savingAntiBan} className="gap-2 shrink-0">
                {savingAntiBan ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Guardar Políticas Anti-Ban
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Simulación Humana ("Escribiendo...") */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Keyboard className="size-4 text-primary" />
                  Simulación de Comportamiento Humano ("Escribiendo...")
                </CardTitle>
                <CardDescription className="text-xs">
                  Emite presencia real <code>composing</code> proporcional a la longitud del mensaje antes de despacharlo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/20">
                  <div>
                    <Label className="text-xs font-semibold">Simular "Escribiendo..." en cada envío</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Abre presencia online, muestra indicador de escritura y pausa antes de enviar.
                    </p>
                  </div>
                  <Switch checked={abSimulateTyping} onCheckedChange={setAbSimulateTyping} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Duración mínima (seg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min={1}
                      max={15}
                      disabled={!abSimulateTyping}
                      value={abTypingMinSec}
                      onChange={(e) => setAbTypingMinSec(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Duración máxima (seg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min={1.5}
                      max={25}
                      disabled={!abSimulateTyping}
                      value={abTypingMaxSec}
                      onChange={(e) => setAbTypingMaxSec(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/20">
                  <div>
                    <Label className="text-xs font-semibold">Verificar número en WhatsApp antes de enviar</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Consulta <code>is_on_whatsapp</code> con caché de 10 min para bloquear rebotes a líneas inexistentes.
                    </p>
                  </div>
                  <Switch checked={abVerifyNumber} onCheckedChange={setAbVerifyNumber} />
                </div>
              </CardContent>
            </Card>

            {/* 2. Control de Cuotas, Retardo Gaussiano & Lotes */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="size-4 text-amber-500" />
                  Control de Envíos, Retardos & Pausas de Enfriamiento
                </CardTitle>
                <CardDescription className="text-xs">
                  El worker de Python aplica retardos gaussianos aleatorios y descansos por lote para evitar patrones de bot.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Límite diario máximo</Label>
                    <Input
                      type="number"
                      min={10}
                      max={2000}
                      value={abDailyLimit}
                      onChange={(e) => setAbDailyLimit(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Límite por hora</Label>
                    <Input
                      type="number"
                      min={5}
                      max={200}
                      value={abHourlyLimit}
                      onChange={(e) => setAbHourlyLimit(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Retardo entre envíos mín. (seg)</Label>
                    <Input
                      type="number"
                      min={3}
                      max={120}
                      value={abDelayMinSec}
                      onChange={(e) => setAbDelayMinSec(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Retardo entre envíos máx. (seg)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      value={abDelayMaxSec}
                      onChange={(e) => setAbDelayMaxSec(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tamaño de lote (mensajes)</Label>
                    <Input
                      type="number"
                      min={3}
                      max={100}
                      value={abBatchSize}
                      onChange={(e) => setAbBatchSize(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Pausa de enfriamiento (seg)</Label>
                    <Input
                      type="number"
                      min={15}
                      max={600}
                      value={abBatchPauseSec}
                      onChange={(e) => setAbBatchPauseSec(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Modo Calentamiento (Warm-up Progresivo) */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="size-4 text-orange-500" />
                  Modo Calentamiento (Warm-up Progresivo)
                </CardTitle>
                <CardDescription className="text-xs">
                  Incrementa automáticamente la cuota diaria según la antigüedad de la sesión para proteger líneas nuevas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/20">
                  <div>
                    <Label className="text-xs font-semibold">Activar Warm-up Progresivo</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Día actual de esta línea: <strong>Día {queueStats?.warmupDay ?? 1}</strong> · Límite hoy:{' '}
                      <strong>{queueStats?.effectiveDailyLimit ?? 20} msgs</strong>
                    </p>
                  </div>
                  <Switch checked={abWarmupMode} onCheckedChange={setAbWarmupMode} />
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {WARMUP_STAGES.map((st) => {
                    const day = queueStats?.warmupDay ?? 1;
                    const active = abWarmupMode && day >= st.minDay && day <= st.maxDay;
                    return (
                      <div
                        key={st.label}
                        className={cn(
                          'rounded-lg border p-2 text-center transition',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/70 bg-muted/20 text-muted-foreground'
                        )}
                      >
                        <p className="text-[10px] font-semibold">{st.label}</p>
                        <p className="text-xs font-black mt-0.5">
                          {st.limit ? `${Math.min(st.limit, abDailyLimit)}` : `${abDailyLimit}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 4. Ventana Horaria Laboral & Proxy */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="size-4 text-sky-500" />
                  Ventana Horaria Laboral & Red Privada
                </CardTitle>
                <CardDescription className="text-xs">
                  Retiene automáticamente mensajes fuera de horario y los libera al iniciar la jornada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/20">
                  <div>
                    <Label className="text-xs font-semibold">Restringir despachos a horario laboral</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Evita molestar pacientes de madrugada y reduce reportes de spam.
                    </p>
                  </div>
                  <Switch checked={abWorkingHoursEnabled} onCheckedChange={setAbWorkingHoursEnabled} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Hora de inicio</Label>
                    <Input
                      type="time"
                      disabled={!abWorkingHoursEnabled}
                      value={abWorkingHoursStart}
                      onChange={(e) => setAbWorkingHoursStart(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Hora de cierre</Label>
                    <Input
                      type="time"
                      disabled={!abWorkingHoursEnabled}
                      value={abWorkingHoursEnd}
                      onChange={(e) => setAbWorkingHoursEnd(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Proxy SOCKS5 / HTTP Residencial (Opcional)</Label>
                  <Input
                    value={abProxyUrl}
                    onChange={(e) => setAbProxyUrl(e.target.value)}
                    placeholder="socks5://usuario:clave@host:1080"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Útil si operas muchas sucursales desde un mismo servidor para aislar la IP de cada línea.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: DIFUSIÓN SEGURA EN COLA ANTI-BANEO                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="broadcast" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Selector de Destinatarios */}
            <Card className="lg:col-span-5 border-border/80 flex flex-col">
              <CardHeader className="pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    Destinatarios ({bcSelectedIds.length} seleccionados)
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {validFilteredIds.length} válidos
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={bcTarget}
                    onValueChange={(v) => setBcTarget(v as 'pacientes' | 'medicos' | 'usuarios')}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pacientes" className="text-xs">Pacientes</SelectItem>
                      <SelectItem value="medicos" className="text-xs">Médicos</SelectItem>
                      <SelectItem value="usuarios" className="text-xs">Personal Clínico</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      value={bcSearch}
                      onChange={(e) => setBcSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="select-all-valid"
                    checked={validFilteredIds.length > 0 && bcSelectedIds.length === validFilteredIds.length}
                    onCheckedChange={(c) => toggleSelectAllValid(c === true)}
                  />
                  <Label htmlFor="select-all-valid" className="text-xs font-medium cursor-pointer">
                    Seleccionar todos los contactos con teléfono válido
                  </Label>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto max-h-[380px] space-y-1.5 pr-3">
                {bcLoadingRecipients ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Cargando contactos...
                  </div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    No se encontraron contactos en esta categoría.
                  </div>
                ) : (
                  filteredRecipients.map((r) => {
                    const checked = bcSelectedIds.includes(r.id);
                    return (
                      <div
                        key={`${r.type}-${r.id}`}
                        onClick={() => r.is_valid_phone && toggleRecipient(r.id)}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition',
                          r.is_valid_phone
                            ? checked
                              ? 'border-primary bg-primary/5 cursor-pointer'
                              : 'border-border/60 hover:bg-muted/40 cursor-pointer'
                            : 'border-border/40 opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={checked}
                            disabled={!r.is_valid_phone}
                            onCheckedChange={() => r.is_valid_phone && toggleRecipient(r.id)}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{r.name}</p>
                            <p className="text-[11px] font-mono text-muted-foreground truncate">
                              {r.is_valid_phone ? r.formatted_phone : 'Sin teléfono válido'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {r.role}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Redactor Spintax + Encolado Seguro */}
            <Card className="lg:col-span-7 border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Redactor con Spintax & Despacho Seguro por Cola
                </CardTitle>
                <CardDescription className="text-xs">
                  Los mensajes se encolan en segundo plano y el worker de Python los despacha uno a uno con simulación de escritura y pausas aleatorias.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {templates.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Cargar desde Plantilla</Label>
                    <Select
                      onValueChange={(tplId) => {
                        const found = templates.find((t) => String(t.id) === tplId);
                        if (found) setBcMessage(found.contenido);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Seleccionar una plantilla guardada..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                            {t.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-semibold">Contenido del Mensaje</Label>
                    <div className="flex items-center gap-1">
                      {['{paciente}', '{empresa}', '{Hola|Buen día|Saludos}'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setBcMessage((prev) => `${prev} ${chip}`.trim())}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted hover:bg-primary/15 hover:text-primary transition cursor-pointer"
                        >
                          +{chip}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    rows={5}
                    value={bcMessage}
                    onChange={(e) => setBcMessage(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Vista Previa Spintax */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewSpintax(bcMessage, 'broadcast')}
                    className="gap-1.5 text-xs"
                  >
                    <Sparkles className="size-3.5" />
                    Probar Variaciones Spintax
                  </Button>
                  {bcPreviews.length > 0 && (
                    <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/20 p-3">
                      {bcPreviews.map((v, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground border-b last:border-0 border-border/50 pb-1.5 last:pb-0">
                          <span className="font-bold text-primary mr-1.5">#{idx + 1}</span>
                          {v}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumen de Seguridad Anti-Ban */}
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-xs space-y-1">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-primary" />
                    Protección Activa para esta Difusión
                  </p>
                  <p className="text-muted-foreground">
                    • Retardo aleatorio: <strong>{abDelayMinSec}–{abDelayMaxSec}s</strong> · Pausa cada{' '}
                    <strong>{abBatchSize}</strong> mensajes: <strong>{abBatchPauseSec}s</strong>
                  </p>
                  <p className="text-muted-foreground">
                    • Simulación "Escribiendo...": <strong>{abSimulateTyping ? 'Activa' : 'Desactivada'}</strong> ·
                    Duración estimada para {bcSelectedIds.length} contacto(s):{' '}
                    <strong>~{estimatedBroadcastMinutes} min</strong>
                  </p>
                </div>

                <Button
                  onClick={handleDispatchBroadcast}
                  disabled={bcDispatching || bcSelectedIds.length === 0 || !isConnected}
                  className="w-full h-10 gap-2 font-semibold"
                >
                  {bcDispatching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Megaphone className="size-4" />
                  )}
                  Encolar Difusión Segura ({bcSelectedIds.length} destinatarios)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 4: PLANTILLAS & SPINTAX                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Biblioteca de Plantillas Clínicas</h3>
              <p className="text-xs text-muted-foreground">
                Usa sintaxis Spintax {'{Opción A|Opción B}'} para generar mensajes únicos en cada envío.
              </p>
            </div>
            <Button size="sm" onClick={openNewTemplate} className="gap-1.5">
              <Plus className="size-4" />
              Nueva Plantilla
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-3">
                <FileText className="size-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold text-foreground">Aún no tienes plantillas registradas</p>
                <p className="text-xs text-muted-foreground">
                  Crea plantillas con Spintax para recordatorios de citas, resultados y difusión segura.
                </p>
                <Button size="sm" onClick={openNewTemplate} className="gap-1.5">
                  <Plus className="size-4" />
                  Crear Primera Plantilla
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => {
                const cat = TEMPLATE_CATEGORIES[tpl.categoria] || TEMPLATE_CATEGORIES.general;
                return (
                  <Card key={tpl.id} className="border-border/80 flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <CardTitle className="text-sm truncate">{tpl.nombre}</CardTitle>
                          <Badge variant="outline" className={cn('text-[10px]', cat.color)}>
                            {cat.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditTemplate(tpl)}>
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-rose-500 hover:text-rose-600"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 bg-muted/30 rounded-lg p-2.5 border border-border/50">
                        {tpl.contenido}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 5: COLA DE SALIDA & BITÁCORA DE MENSAJES                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-56">
                    <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={msgSearch}
                      onChange={(e) => {
                        setMsgSearch(e.target.value);
                        setMsgPage(1);
                      }}
                      placeholder="Buscar teléfono o texto..."
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  <Select
                    value={msgStatusFilter}
                    onValueChange={(v) => {
                      setMsgStatusFilter(v);
                      setMsgPage(1);
                    }}
                  >
                    <SelectTrigger className="w-40 h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
                      <SelectItem value="queued" className="text-xs">En Cola / Enviando</SelectItem>
                      <SelectItem value="sent" className="text-xs">Enviados</SelectItem>
                      <SelectItem value="delivered" className="text-xs">Entregados (✓✓)</SelectItem>
                      <SelectItem value="read" className="text-xs">Leídos (✓✓ azul)</SelectItem>
                      <SelectItem value="failed" className="text-xs">Fallidos</SelectItem>
                      <SelectItem value="cancelled" className="text-xs">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {messagesData?.stats && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
                      <span>Entrega: <strong>{messagesData.stats.deliveryRate}%</strong></span>
                      <span>·</span>
                      <span>Lectura: <strong>{messagesData.stats.readRate}%</strong></span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant={isPaused ? 'default' : 'outline'}
                    onClick={handleToggleQueuePause}
                    className="h-8 text-xs gap-1.5"
                  >
                    {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                    {isPaused ? 'Reanudar Cola' : 'Pausar Cola'}
                  </Button>
                  {(queueStats?.queued ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearQueue}
                      className="h-8 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      Cancelar Cola ({queueStats?.queued})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => loadMessages(msgPage, msgSearch, msgStatusFilter)}
                    className="h-8 px-2"
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-y border-border/80 bg-muted/30 text-muted-foreground">
                      <th className="text-left font-semibold py-2.5 px-4">Destinatario</th>
                      <th className="text-left font-semibold py-2.5 px-4">Mensaje</th>
                      <th className="text-left font-semibold py-2.5 px-4">Estado</th>
                      <th className="text-left font-semibold py-2.5 px-4">Fecha</th>
                      <th className="text-right font-semibold py-2.5 px-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {!messagesData || messagesData.messages.data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-muted-foreground">
                          No hay registros de mensajes con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      messagesData.messages.data.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/20 transition">
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <p className="font-semibold text-foreground">{m.recipient_name || 'Contacto'}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">+{m.recipient_phone.replace(/^\+/, '')}</p>
                          </td>
                          <td className="py-3 px-4 align-top max-w-md">
                            <p className="text-foreground/90 line-clamp-2 whitespace-pre-wrap">{m.message_content}</p>
                            {m.error_message && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                                <AlertTriangle className="size-3 shrink-0" />
                                {m.error_message}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top whitespace-nowrap">{renderMsgStatus(m)}</td>
                          <td className="py-3 px-4 align-top whitespace-nowrap text-muted-foreground">
                            {new Date(m.sent_at || m.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                            {(m.status === 'failed' || m.status === 'cancelled') && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={retryingId === m.id}
                                onClick={() => handleRetryMessage(m.id)}
                                className="h-7 px-2.5 text-[11px] gap-1"
                              >
                                {retryingId === m.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <RotateCw className="size-3" />
                                )}
                                Reintentar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {messagesData && messagesData.messages.last_page > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/70 text-xs">
                  <span className="text-muted-foreground">
                    Página {messagesData.messages.current_page} de {messagesData.messages.last_page} ({messagesData.messages.total} registros)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={msgPage <= 1}
                      onClick={() => setMsgPage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs"
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={msgPage >= messagesData.messages.last_page}
                      onClick={() => setMsgPage((p) => p + 1)}
                      className="h-7 text-xs"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── MODAL CREAR / EDITAR PLANTILLA ── */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTpl ? 'Editar Plantilla' : 'Nueva Plantilla con Spintax'}</DialogTitle>
            <DialogDescription className="text-xs">
              Combina variables como {'{paciente}'}, {'{medico}'}, {'{fecha}'}, {'{hora}'} con Spintax {'{Hola|Buen día}'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nombre *</Label>
                <Input
                  value={tplNombre}
                  onChange={(e) => setTplNombre(e.target.value)}
                  placeholder="Ej: Recordatorio 24h"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoría</Label>
                <Select value={tplCategoria} onValueChange={setTplCategoria}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, meta]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contenido del Mensaje *</Label>
              <Textarea
                rows={5}
                value={tplContenido}
                onChange={(e) => setTplContenido(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handlePreviewSpintax(tplContenido, 'template')}
                className="text-xs gap-1.5"
              >
                <Sparkles className="size-3.5" />
                Probar Spintax
              </Button>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Activa</Label>
                <Switch checked={tplActivo} onCheckedChange={setTplActivo} />
              </div>
            </div>

            {tplPreviews.length > 0 && (
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1.5">
                {tplPreviews.map((v, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    <strong className="text-primary">#{i + 1}</strong> {v}
                  </p>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTplDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveTemplate} disabled={savingTpl}>
              {savingTpl && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Guardar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DIAGNÓSTICO DEL MOTOR PYTHON ── */}
      <Dialog open={diagOpen} onOpenChange={setDiagOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="size-5 text-primary" />
              Diagnóstico del Motor Python Nativo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Telemetría en tiempo real de Neonize / WhatsMeow embebido en FastAPI (cero intermediarios).
            </DialogDescription>
          </DialogHeader>

          {diagLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
              Consultando estado interno del motor...
            </div>
          ) : diagnostic ? (
            <div className="space-y-2.5 text-xs">
              {[
                ['Motor', diagnostic.api_url],
                ['Instancia', diagnostic.instance],
                ['Estado del Socket', diagnostic.socket_state],
                ['Hilo Nativo Activo', diagnostic.thread_alive ? 'Sí (Daemon Activo)' : 'Detenido'],
                ['Línea Vinculada', diagnostic.phone_number ? `+${diagnostic.phone_number}` : 'Sin vincular'],
                ['Latencia Local', `${diagnostic.latency_ms} ms`],
                ['Memoria', diagnostic.memory_usage],
                ['Tamaño Sesión SQLite', `${diagnostic.session_size_kb ?? 0} KB`],
                ['Instancias Cargadas', String(diagnostic.active_instances_count ?? 1)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono font-semibold text-foreground">{v}</span>
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button size="sm" onClick={() => setDiagOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
