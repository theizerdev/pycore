import React, { useState, useEffect, useMemo } from 'react';
import {
  integracionesApi,
  type QueueStats,
  type WhatsAppDiagnostic,
  type BroadcastRecipient,
  type MessagesResponse
} from '../../api/integraciones';
import type { WhatsAppStatus, WhatsAppTemplate, IntegracionesConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  MessageSquare,
  QrCode,
  Power,
  Send,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  RotateCw,
  FileText,
  Activity,
  Flame,
  ListOrdered,
  Shield,
  Megaphone,
  Inbox,
  Settings2,
  Radio,
  Heart,
  WifiOff,
  HelpCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Search,
  Users,
  Sparkles,
  Play
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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

export const WhatsAppCenter: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.es_superadmin);

  const [activeTab, setActiveTab] = useState('connection');
  const [config, setConfig] = useState<IntegracionesConfig | null>(null);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messagesData, setMessagesData] = useState<MessagesResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Modal de Diagnóstico de Salud
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<WhatsAppDiagnostic | null>(null);

  // Copiado
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Probador & Spintax
  const [testCountry, setTestCountry] = useState('+58');
  const [testPhone, setTestPhone] = useState('4121234567');
  const [testMessage, setTestMessage] = useState('{Hola|Buen día|Estimado(a)} {paciente}, le confirmamos su cita médica en {empresa} para mañana. Código de validación: {random}.');
  const [checkingNumber, setCheckingNumber] = useState(false);
  const [numberCheckResult, setNumberCheckResult] = useState<{ checked: boolean; exists?: boolean; jid?: string; error?: string } | null>(null);
  const [spintaxPreviews, setSpintaxPreviews] = useState<string[]>([]);
  const [previewingSpintax, setPreviewingSpintax] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testAlert, setTestAlert] = useState<{ success: boolean; text: string } | null>(null);

  // Anti-Baneo Form
  const [dailyLimit, setDailyLimit] = useState(300);
  const [warmupMode, setWarmupMode] = useState(true);
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(true);
  const [workingHoursStart, setWorkingHoursStart] = useState('08:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('20:00');
  const [proxyUrl, setProxyUrl] = useState('');
  const [savingAntiBan, setSavingAntiBan] = useState(false);
  const [antiBanAlert, setAntiBanAlert] = useState<string | null>(null);

  // Servidor & Settings Form
  const [serverUrl, setServerUrl] = useState('https://whatsapp.theizerdev.com');
  const [serverInstance, setServerInstance] = useState('empresa_1');
  const [serverApiKey, setServerApiKey] = useState('');
  const [serverActive, setServerActive] = useState(true);
  const [savingServer, setSavingServer] = useState(false);
  const [serverAlert, setServerAlert] = useState<string | null>(null);

  // Plantillas
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [tplNombre, setTplNombre] = useState('');
  const [tplCategoria, setTplCategoria] = useState('recordatorio_cita');
  const [tplContenido, setTplContenido] = useState('');
  const [savingTpl, setSavingTpl] = useState(false);

  // Historial & Bitácora
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // Difusión Masiva (Broadcast)
  const [broadcastTarget, setBroadcastTarget] = useState('usuarios');
  const [broadcastRecipients, setBroadcastRecipients] = useState<BroadcastRecipient[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastDelaySeconds, setBroadcastDelaySeconds] = useState(15);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastAlert, setBroadcastAlert] = useState<{ success: boolean; text: string } | null>(null);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/webhooks/whatsapp`
    : '/api/v1/webhooks/whatsapp';

  // Carga inicial
  const loadInitialData = async () => {
    try {
      setLoadingStatus(true);
      const [cfg, wa, qStats, tpls] = await Promise.all([
        integracionesApi.getConfig(),
        integracionesApi.getWhatsAppStatus(),
        integracionesApi.getQueueStats(),
        integracionesApi.getTemplates(),
      ]);
      setConfig(cfg);
      setStatus(wa);
      setQueueStats(qStats);
      setTemplates(tpls);

      // Pre-llenar configuraciones
      setDailyLimit(cfg.whatsapp_rate_limit || 300);
      setWarmupMode(cfg.whatsapp_warmup_mode !== false);
      setWorkingHoursEnabled(cfg.whatsapp_working_hours_enabled !== false);
      setWorkingHoursStart(cfg.whatsapp_working_hours_start || '08:00');
      setWorkingHoursEnd(cfg.whatsapp_working_hours_end || '20:00');
      setProxyUrl(cfg.whatsapp_proxy_url || '');

      setServerUrl(cfg.whatsapp_api_url || 'https://whatsapp.theizerdev.com');
      setServerInstance(cfg.whatsapp_instance || 'empresa_1');
      setServerApiKey(cfg.whatsapp_api_key || '');
      setServerActive(cfg.whatsapp_active);
    } catch (err) {
      console.error('Error cargando datos de WhatsApp:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Polling dinámico cada 4 segundos si la pestaña o WhatsApp está activa
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [wa, qStats] = await Promise.all([
          integracionesApi.getWhatsAppStatus(),
          integracionesApi.getQueueStats(),
        ]);
        setStatus(wa);
        setQueueStats(qStats);
      } catch (err) {
        // En silencio
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cargar historial
  const fetchMessages = async (page = 1, search = historySearch, statusFilter = historyStatus) => {
    setHistoryLoading(true);
    try {
      const data = await integracionesApi.getMessages(page, search, statusFilter, 15);
      setMessagesData(data);
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchMessages(historyPage, historySearch, historyStatus);
    }
  }, [activeTab, historyPage, historyStatus]);

  // Cargar destinatarios para Broadcast
  const fetchBroadcastRecipients = async (target = broadcastTarget) => {
    setBroadcastLoading(true);
    try {
      const data = await integracionesApi.getBroadcastRecipients(target);
      setBroadcastRecipients(data);
      const valid = data.filter((r) => r.is_valid_phone).map((r) => r.id);
      setSelectedRecipientIds(valid);
    } catch (err) {
      console.error('Error cargando destinatarios:', err);
    } finally {
      setBroadcastLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'broadcast') {
      fetchBroadcastRecipients(broadcastTarget);
    }
  }, [activeTab, broadcastTarget]);

  // Horario seguro actual
  const isWithinWorkingHours = useMemo(() => {
    if (!workingHoursEnabled) return true;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = (workingHoursStart || '08:00').split(':').map(Number);
    const [endH, endM] = (workingHoursEnd || '20:00').split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    return currentMins >= startMins && currentMins <= endMins;
  }, [workingHoursEnabled, workingHoursStart, workingHoursEnd]);

  // Estadísticas calculadas
  const sentTodayCount = queueStats?.sentToday ?? 0;
  const dailyLimitCount = queueStats?.dailyLimit ?? dailyLimit ?? 300;
  const quotaPercentage = Math.min(100, Math.round((sentTodayCount / (dailyLimitCount || 1)) * 100));

  const isConnected = Boolean(status?.is_connected);
  const isQrReady = status?.connection_state === 'QR_READY' || Boolean(status?.qr_code || status?.qr_data_url);
  const isConnecting = status?.connection_state === 'CONNECTING' || loadingStatus;

  // Acciones de Conexión
  const handleConnect = async () => {
    try {
      setLoadingStatus(true);
      const res = await integracionesApi.connectWhatsApp();
      setStatus(res);
    } catch (err) {
      console.error('Error conectando WhatsApp:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSimulateScan = async () => {
    try {
      setLoadingStatus(true);
      const res = await integracionesApi.simulateScan();
      setStatus(res);
    } catch (err) {
      console.error('Error simulando escaneo de WhatsApp:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleReconnect = async () => {
    try {
      setLoadingStatus(true);
      const res = await integracionesApi.reconnectWhatsApp();
      setStatus(res);
    } catch (err) {
      console.error('Error reiniciando sesión:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoadingStatus(true);
      const res = await integracionesApi.disconnectWhatsApp();
      setStatus(res);
    } catch (err) {
      console.error('Error desconectando WhatsApp:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Diagnóstico
  const handleRunDiagnostic = async () => {
    setDiagnosticOpen(true);
    setDiagnosticLoading(true);
    try {
      const data = await integracionesApi.runDiagnostic();
      setDiagnosticData(data);
    } catch (err) {
      console.error('Error ejecutando diagnóstico:', err);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // Anti-Baneo
  const handleSaveAntiBan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAntiBan(true);
    setAntiBanAlert(null);
    try {
      await integracionesApi.updateAntiBan({
        dailyLimit,
        warmupMode,
        workingHoursEnabled,
        workingHoursStart,
        workingHoursEnd,
        proxyUrl: proxyUrl.trim() || null,
      });
      setAntiBanAlert('¡Políticas de protección Anti-Baneo actualizadas correctamente!');
    } catch (err: any) {
      setAntiBanAlert('Error al guardar políticas Anti-Baneo');
    } finally {
      setSavingAntiBan(false);
    }
  };

  // Servidor & Settings
  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingServer(true);
    setServerAlert(null);
    try {
      await integracionesApi.updateWhatsAppServer({
        whatsapp_api_url: serverUrl,
        whatsapp_instance: serverInstance,
        whatsapp_api_key: serverApiKey,
        whatsapp_active: serverActive,
      });
      const [newCfg, newStatus] = await Promise.all([
        integracionesApi.getConfig(),
        integracionesApi.getWhatsAppStatus()
      ]);
      setConfig(newCfg);
      setStatus(newStatus);
      toast.success('¡Configuración de servidor y credenciales guardada exitosamente!');
      setServerAlert('¡Configuración de servidor y credenciales guardada exitosamente!');
    } catch (err: any) {
      toast.error('Error al guardar la configuración del servidor');
      setServerAlert('Error al guardar configuración del servidor');
    } finally {
      setSavingServer(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!confirm('¿Deseas regenerar el token de API? El token anterior quedará invalidado.')) return;
    try {
      const res = await integracionesApi.generateToken();
      setServerApiKey(res.token);
    } catch (err) {
      console.error('Error generando token:', err);
    }
  };

  // Verificador de Números & Spintax
  const handleCheckNumber = async () => {
    const fullPhone = `${testCountry}${testPhone}`.replace('+', '');
    setCheckingNumber(true);
    setNumberCheckResult(null);
    try {
      const res = await integracionesApi.checkNumber(fullPhone);
      setNumberCheckResult({
        checked: true,
        exists: res.result?.exists ?? true,
        jid: res.result?.jid,
      });
    } catch (err) {
      setNumberCheckResult({
        checked: true,
        exists: false,
        error: 'Error al consultar número con el gateway.',
      });
    } finally {
      setCheckingNumber(false);
    }
  };

  const handlePreviewSpintax = async () => {
    if (!testMessage.trim()) return;
    setPreviewingSpintax(true);
    try {
      const res = await integracionesApi.previewSpintax(testMessage, 4, {
        paciente: 'Carlos Rodríguez',
        empresa: config ? 'PyCore PRO' : 'Empresa Principal',
        random: String(Math.floor(1000 + Math.random() * 9000)),
      });
      setSpintaxPreviews(res.variations);
    } catch (err) {
      console.error('Error generando Spintax:', err);
    } finally {
      setPreviewingSpintax(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setTestAlert(null);

    let cleanPhone = testPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    const cleanCountry = testCountry.replace(/\D/g, '') || '58';
    let fullPhone = cleanPhone;
    if (!cleanPhone.startsWith(cleanCountry)) {
      fullPhone = `${cleanCountry}${cleanPhone}`;
    }

    try {
      const res = await integracionesApi.sendWhatsAppTest({
        phone: fullPhone,
        message: testMessage,
        variables: {
          paciente: 'Carlos Rodríguez',
          empresa: 'PyCore PRO',
          random: String(Math.floor(1000 + Math.random() * 9000)),
        },
      });
      setTestAlert({ success: true, text: res.mensaje || '¡Mensaje despachado con éxito al servidor de WhatsApp!' });
    } catch (err: any) {
      setTestAlert({ success: false, text: err.response?.data?.detail || 'Error al despachar mensaje de prueba' });
    } finally {
      setSendingTest(false);
    }
  };

  // Plantillas CRUD
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTplNombre('');
    setTplCategoria('recordatorio_cita');
    setTplContenido('');
    setTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (t: WhatsAppTemplate) => {
    setEditingTemplate(t);
    setTplNombre(t.nombre);
    setTplCategoria(t.categoria);
    setTplContenido(t.contenido);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTpl(true);
    try {
      if (editingTemplate) {
        await integracionesApi.updateTemplate(editingTemplate.id, {
          nombre: tplNombre,
          categoria: tplCategoria,
          contenido: tplContenido,
        });
      } else {
        await integracionesApi.createTemplate({
          nombre: tplNombre,
          categoria: tplCategoria,
          contenido: tplContenido,
          activo: true,
        });
      }
      setTemplateModalOpen(false);
      const tpls = await integracionesApi.getTemplates();
      setTemplates(tpls);
    } catch (err) {
      console.error('Error guardando plantilla:', err);
    } finally {
      setSavingTpl(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;
    try {
      await integracionesApi.deleteTemplate(id);
      const tpls = await integracionesApi.getTemplates();
      setTemplates(tpls);
    } catch (err) {
      console.error('Error eliminando plantilla:', err);
    }
  };

  const handleUseTemplateInSandbox = (t: WhatsAppTemplate) => {
    setTestMessage(t.contenido);
    setActiveTab('dispatcher');
  };

  const filteredTemplates = useMemo(() => {
    if (templateCategoryFilter === 'all') return templates;
    return templates.filter((t) => t.categoria === templateCategoryFilter);
  }, [templates, templateCategoryFilter]);

  // Reintento
  const handleRetryMessage = async (id: number) => {
    setRetryingId(id);
    try {
      await integracionesApi.retryMessage(id);
      fetchMessages(historyPage, historySearch, historyStatus);
    } catch (err) {
      console.error('Error reenviando mensaje:', err);
    } finally {
      setRetryingId(null);
    }
  };

  // Broadcast acciones
  const toggleRecipient = (id: number) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAllRecipients = () => {
    const valid = broadcastRecipients.filter((r) => r.is_valid_phone).map((r) => r.id);
    if (selectedRecipientIds.length === valid.length) {
      setSelectedRecipientIds([]);
    } else {
      setSelectedRecipientIds(valid);
    }
  };

  const handleDispatchBroadcast = async () => {
    if (selectedRecipientIds.length === 0) {
      toast.warning('Por favor selecciona al menos un destinatario.');
      return;
    }
    if (!broadcastMessage.trim()) {
      toast.warning('Por favor redacta el mensaje de difusión.');
      return;
    }
    setBroadcastSending(true);
    setBroadcastAlert(null);
    try {
      const res = await integracionesApi.dispatchBroadcast({
        recipient_ids: selectedRecipientIds,
        target_type: broadcastTarget,
        message: broadcastMessage,
        delay_seconds: broadcastDelaySeconds,
      });
      setBroadcastAlert({ success: true, text: res.message });
      toast.success(res.message || 'Difusión encolada exitosamente');
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Error despachando difusión masiva';
      setBroadcastAlert({ success: false, text: errorMsg });
      toast.error(errorMsg);
    } finally {
      setBroadcastSending(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ══ HEADER DE MÓDULO ════════════════════════════════════════════ */}
      <ModuleHeader
        icon={<MessageSquare className="size-6 text-white" />}
        title="Módulo de Integración WhatsApp API"
        description={`Motor Multi-Instancia Baileys para PyCore PRO`}
        colorClassName="bg-emerald-600 dark:bg-emerald-700"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-black/20 text-white border-white/20 font-mono text-xs">
            {serverInstance}
          </Badge>

          <Badge
            className={cn(
              "gap-1.5 text-xs text-white",
              isConnected
                ? "bg-emerald-500 hover:bg-emerald-500"
                : isConnecting || isQrReady
                ? "bg-amber-500 hover:bg-amber-500"
                : "bg-rose-500 hover:bg-rose-500"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-white animate-pulse" : isConnecting || isQrReady ? "bg-white animate-ping" : "bg-white"
              )}
            />
            {isConnected ? "Conectado" : isQrReady ? "Esperando Escaneo" : isConnecting ? "Conectando..." : "Desconectado"}
          </Badge>

          {/* Botón de Diagnóstico / Heartbeat */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunDiagnostic}
            className="h-8 bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs gap-1.5 cursor-pointer"
          >
            <Heart className="h-3.5 w-3.5 text-rose-300 fill-rose-300" />
            <span>Diagnóstico</span>
          </Button>

          {isConnected ? (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReconnect}
                className="h-8 bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs gap-1.5 cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Reiniciar</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDisconnect}
                className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 cursor-pointer"
              >
                <Power className="h-3.5 w-3.5" />
                <span>Desconectar</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={loadingStatus}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Vincular WhatsApp</span>
            </Button>
          )}
        </div>
      </ModuleHeader>

      {/* ══ ALERT BANNER: SESIÓN DESCONECTADA ═══════════════════════════ */}
      {!isConnected && (
        <Card className="border-amber-400/80 bg-amber-500/10 dark:bg-amber-950/20 backdrop-blur-xs shadow-xs">
          <CardContent className="flex items-center justify-between p-4 flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <WifiOff className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-300 text-sm">
                  Sesión de WhatsApp Desconectada
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-400/90 mt-0.5">
                  Tu línea de WhatsApp no está activa. Los mensajes salientes automáticos de citas y turnos quedarán en cola hasta que te vincules.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setActiveTab('connection')}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 h-8 cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Vincular / Escanear QR Ahora</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══ 4 SHADCN STAT CARDS SUPERIORES ══════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Estado del Socket */}
        <Card className="p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Estado del Socket
            </span>
            <div
              className={cn(
                "p-2 rounded-xl",
                isConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : isConnecting || isQrReady
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-bold tracking-tight text-foreground">
              {isConnected ? "Conectado" : isQrReady ? "Esperando Escaneo" : isConnecting ? "Conectando..." : "Desconectado"}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Phone className="h-3 w-3 text-emerald-500" />
              {status?.phone_number ? `+${status.phone_number}` : "Sin línea vinculada"}
            </p>
          </div>
        </Card>

        {/* Card 2: Límite Diario 24H */}
        <Card className="p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Límite Diario 24H
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{sentTodayCount}</span>
              <span className="text-xs text-muted-foreground font-medium">/ {dailyLimitCount} mensajes</span>
            </div>
            <Progress value={quotaPercentage} className="h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Restantes: {Math.max(0, dailyLimitCount - sentTodayCount)}</span>
              <span>{dailyLimitCount} máx</span>
            </div>
          </div>
        </Card>

        {/* Card 3: En Cola de Salida */}
        <Card className="p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              En Cola de Salida
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ListOrdered className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{queueStats?.queued ?? 0}</span>
              <span className="text-xs text-muted-foreground font-medium">en cola</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3 text-indigo-500" />
              <span>Anti-Ban Jitter: 20-40s</span>
            </p>
          </div>
        </Card>

        {/* Card 4: Horario Seguro Anti-Ban */}
        <Card className="p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Horario Anti-Ban
            </span>
            <div
              className={cn(
                "p-2 rounded-xl",
                isWithinWorkingHours
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-base font-bold text-foreground">
              {workingHoursStart} - {workingHoursEnd}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", isWithinWorkingHours ? "bg-emerald-500" : "bg-amber-500")} />
              <span>{isWithinWorkingHours ? "Ventana Segura Abierta" : "Pausa Nocturna Activa"}</span>
            </p>
          </div>
        </Card>
      </div>

      {/* ══ INTERFAZ PRINCIPAL DE 7 PESTAÑAS ════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={cn(
          "grid h-auto p-1.5 bg-muted/80 rounded-xl gap-1 border",
          isSuperAdmin ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-7" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
        )}>
          <TabsTrigger value="connection" className="py-2.5 gap-1.5 text-xs md:text-sm font-medium rounded-lg cursor-pointer">
            <QrCode className="h-4 w-4" />
            <span>Conexión & QR</span>
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="py-2.5 gap-1.5 text-xs md:text-sm font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 cursor-pointer">
            <Megaphone className="h-4 w-4" />
            <span>Difusión Masiva</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="py-2.5 gap-1.5 text-xs md:text-sm font-medium rounded-lg cursor-pointer">
            <FileText className="h-4 w-4" />
            <span>Plantillas</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="py-2.5 gap-1.5 text-xs md:text-sm font-medium rounded-lg cursor-pointer">
            <Inbox className="h-4 w-4" />
            <span>Historial & Logs</span>
          </TabsTrigger>
          <TabsTrigger value="antiban" className="py-2.5 gap-1.5 text-xs md:text-sm font-medium rounded-lg cursor-pointer">
            <Shield className="h-4 w-4" />
            <span>Anti-Baneo</span>
          </TabsTrigger>
          <TabsTrigger value="dispatcher" className="py-2.5 gap-1.5 text-xs md:text-sm font-medium rounded-lg cursor-pointer">
            <Send className="h-4 w-4" />
            <span>Pruebas & Spintax</span>
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="settings" className="py-2.5 gap-1.5 text-xs md:text-sm font-medium rounded-lg cursor-pointer">
              <Settings2 className="h-4 w-4" />
              <span>Servidor & Webhook</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── 1. CONEXIÓN & QR CODE ────────────────────────────────────── */}
        <TabsContent value="connection" className="space-y-6">
          <div className="grid md:grid-cols-12 gap-6">
            {/* Lado Izquierdo: Display de QR */}
            <div className="md:col-span-7">
              <Card className="shadow-xs h-full flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Radio className="h-5 w-5 text-emerald-600" />
                    <span>Vinculación de Dispositivo WhatsApp</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Escanea el código QR con tu aplicación móvil de WhatsApp para emparejar la línea clínica.
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center justify-center min-h-[320px] text-center p-6">
                  {isConnected ? (
                    <div className="space-y-4 max-w-sm">
                      <div className="size-24 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                        <CheckCircle2 className="size-12" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">WhatsApp Conectado & Sincronizado</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tu línea telefónica está emparejada y lista para procesar mensajes clínicos automáticos.
                        </p>
                      </div>
                      <div className="p-3 bg-muted/40 rounded-xl border text-xs font-mono space-y-1">
                        <div><strong>JID:</strong> {status?.phone_number ? `${status.phone_number}@s.whatsapp.net` : "empresa_1@s.whatsapp.net"}</div>
                        <div><strong>Instancia:</strong> {serverInstance}</div>
                      </div>
                    </div>
                  ) : isQrReady && (status?.qr_data_url || status?.qr_code) ? (
                    <div className="space-y-4 flex flex-col items-center">
                      <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-emerald-500/30 inline-block animate-in zoom-in-95">
                        <img
                          src={status.qr_data_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(status.qr_code || '')}`}
                          alt="WhatsApp QR Code"
                          className="size-56 object-contain rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 gap-1.5 animate-pulse text-xs">
                          <Clock className="h-3 w-3" />
                          <span>Código QR Activo - Escanea desde tu WhatsApp</span>
                        </Badge>
                        <p className="text-xs text-muted-foreground">Auto-refresca cada 20 segundos. Mantén esta pantalla abierta.</p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDisconnect}
                          disabled={loadingStatus}
                          className="text-xs cursor-pointer"
                        >
                          <span>Cancelar</span>
                        </Button>
                      </div>
                    </div>
                  ) : isConnecting ? (
                    <div className="space-y-4 flex flex-col items-center">
                      <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center animate-spin">
                        <RotateCw className="size-8" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base">Generando Código QR...</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mt-1">
                          Iniciando socket Baileys y conectando con los servidores de WhatsApp. Por favor espera unos segundos...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="size-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto">
                        <QrCode className="size-8" />
                      </div>
                      <h3 className="font-semibold text-foreground">Sin sesión activa vinculada</h3>
                      <p className="text-xs text-muted-foreground max-w-sm">Haz clic en Vincular para generar un nuevo código QR de emparejamiento.</p>
                      <Button onClick={handleConnect} disabled={loadingStatus} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs">
                        <QrCode className="size-4" />
                        <span>Generar Código QR</span>
                      </Button>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t bg-muted/20 px-6 py-3 flex justify-between items-center text-xs text-muted-foreground">
                  <span>Motor: Baileys Multi-Instancia</span>
                  <span>Estado: <strong className="text-foreground">{isConnected ? "Conectado" : "Esperando"}</strong></span>
                </CardFooter>
              </Card>
            </div>

            {/* Lado Derecho: Instrucciones Paso a Paso */}
            <div className="md:col-span-5">
              <Card className="shadow-xs h-full flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-indigo-600" />
                    <span>Cómo Vincular WhatsApp</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Sigue estos pasos en el teléfono institucional de la clínica.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start p-3 border rounded-xl bg-card">
                      <div className="size-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                      <div>
                        <h4 className="font-semibold text-foreground">Abre WhatsApp en tu Teléfono</h4>
                        <p className="text-muted-foreground mt-0.5">Toca el botón Menú (Android) o Configuración (iOS).</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3 border rounded-xl bg-card">
                      <div className="size-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                      <div>
                        <h4 className="font-semibold text-foreground">Selecciona Dispositivos Vinculados</h4>
                        <p className="text-muted-foreground mt-0.5">Dirígete a Dispositivos Vinculados &gt; Vincular un Dispositivo y escanea el QR.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3 border rounded-xl bg-card">
                      <div className="size-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                      <div>
                        <h4 className="font-semibold text-foreground">La Sesión se Mantiene Activa</h4>
                        <p className="text-muted-foreground mt-0.5">Una vez emparejado, las credenciales quedan almacenadas de forma persistente.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t bg-muted/20 px-6 py-3 flex justify-between items-center text-xs text-muted-foreground">
                  <span>Protección Anti-Baneo activa</span>
                  <Badge variant="secondary" className="text-[10px]">Seguro</Badge>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── 2. DIFUSIÓN MASIVA (BROADCAST) ───────────────────────────── */}
        <TabsContent value="broadcast" className="space-y-6">
          <div className="grid md:grid-cols-12 gap-6">
            {/* Lista de Destinatarios */}
            <div className="md:col-span-5">
              <Card className="shadow-xs h-full flex flex-col justify-between">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Users className="size-4 text-indigo-600" />
                        <span>Destinatarios ({selectedRecipientIds.length}/{broadcastRecipients.length})</span>
                      </CardTitle>
                      <CardDescription className="text-xs">Selecciona el grupo objetivo.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                        <SelectTrigger className="h-7 text-[11px] w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usuarios">Usuarios</SelectItem>
                          <SelectItem value="pacientes">Pacientes</SelectItem>
                          <SelectItem value="medicos">Médicos</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={toggleAllRecipients} className="h-7 text-[11px] cursor-pointer">
                        {selectedRecipientIds.length === broadcastRecipients.length ? "Deseleccionar" : "Seleccionar Todos"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 space-y-2 max-h-[380px] overflow-y-auto">
                  {broadcastLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Cargando contactos...</p>
                  ) : broadcastRecipients.length > 0 ? (
                    broadcastRecipients.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => toggleRecipient(r.id)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors",
                          selectedRecipientIds.includes(r.id) ? "bg-indigo-500/10 border-indigo-500/30" : "bg-card hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={selectedRecipientIds.includes(r.id)}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-indigo-600"
                          />
                          <div>
                            <p className="font-semibold text-foreground">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{r.phone}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{r.role}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">No se encontraron contactos con teléfono válido.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Redactor de Difusión */}
            <div className="md:col-span-7">
              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Megaphone className="size-4 text-indigo-600" />
                    <span>Redactar Difusión Masiva</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Los mensajes se enviarán uno a uno con el retardo configurado para evitar bloqueos.
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {broadcastAlert && (
                    <div
                      className={cn(
                        "p-3 rounded-xl text-xs flex items-center gap-2 border",
                        broadcastAlert.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-rose-500/10 border-rose-500/30 text-rose-600"
                      )}
                    >
                      {broadcastAlert.success ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                      <span>{broadcastAlert.text}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Mensaje de Difusión *</Label>
                      <div className="flex gap-1">
                        {['paciente', 'empresa', 'random'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setBroadcastMessage((prev) => prev + ` {${v}}`)}
                            className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono hover:bg-primary/20 cursor-pointer"
                          >
                            +{v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      rows={5}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Hola {paciente}, le informamos sobre..."
                      className="text-xs leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl bg-muted/20 border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold flex items-center gap-1">
                        <Clock className="size-3.5 text-indigo-600" />
                        <span>Retardo Anti-Baneo entre Mensajes:</span>
                      </span>
                      <Badge variant="outline" className="font-mono text-xs font-bold bg-card">
                        {broadcastDelaySeconds} Segundos
                      </Badge>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      value={broadcastDelaySeconds}
                      onChange={(e) => setBroadcastDelaySeconds(Number(e.target.value))}
                      className="w-full cursor-pointer accent-indigo-600"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Recomendamos al menos 15 segundos entre envíos para proteger la reputación del número ante WhatsApp.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleDispatchBroadcast}
                      disabled={broadcastSending || selectedRecipientIds.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 cursor-pointer shadow-xs"
                    >
                      {broadcastSending ? (
                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      <span>Despachar a {selectedRecipientIds.length} Contactos</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── 3. PLANTILLAS MÉDICAS ────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Plantillas de Notificación Clínica</h3>
              <p className="text-xs text-muted-foreground">Mensajes predefinidos con variables dinámicas.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="recordatorio_cita">Recordatorio de Cita</SelectItem>
                  <SelectItem value="confirmacion_turno">Turno en Sala</SelectItem>
                  <SelectItem value="receta_medica">Receta Médica</SelectItem>
                  <SelectItem value="resultado_estudio">Resultados Lab</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleOpenCreateTemplate} className="h-8 text-xs font-bold gap-1.5 cursor-pointer">
                <Plus className="size-3.5" />
                <span>Nueva Plantilla</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((tpl) => (
              <Card key={tpl.id} className="shadow-xs border flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">{tpl.nombre}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] uppercase font-semibold mt-1">
                        {tpl.categoria}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUseTemplateInSandbox(tpl)}
                        className="h-7 w-7 text-primary hover:bg-primary/10 cursor-pointer"
                        title="Probar en Sandbox"
                      >
                        <Send className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditTemplate(tpl)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans relative">
                    <div className="absolute -top-2 left-4 px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
                      Vista previa
                    </div>
                    {tpl.contenido}
                  </div>

                  {tpl.variables && tpl.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center pt-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Variables:</span>
                      {tpl.variables.map((v) => (
                        <Badge key={v} variant="outline" className="text-[10px] font-mono bg-muted/40">
                          {`{${v}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-2.5 pb-3 border-t text-[10px] text-muted-foreground flex justify-between">
                  <span>Actualizado: {new Date(tpl.created_at).toLocaleDateString()}</span>
                  <Badge variant={tpl.activo ? "default" : "secondary"} className="text-[9px]">
                    {tpl.activo ? "Activa" : "Inactiva"}
                  </Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── 4. HISTORIAL & LOGS ──────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          {/* Métricas de Historial */}
          {messagesData?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border bg-card text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Total Enviados</span>
                <p className="text-xl font-bold text-foreground mt-0.5">{messagesData.stats.totalSent}</p>
              </div>
              <div className="p-3 rounded-xl border bg-card text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tasa Entrega</span>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">{messagesData.stats.deliveryRate}%</p>
              </div>
              <div className="p-3 rounded-xl border bg-card text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tasa Lectura</span>
                <p className="text-xl font-bold text-primary mt-0.5">{messagesData.stats.readRate}%</p>
              </div>
              <div className="p-3 rounded-xl border bg-card text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Fallidos</span>
                <p className="text-xl font-bold text-rose-600 mt-0.5">{messagesData.stats.totalFailed}</p>
              </div>
            </div>
          )}

          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Search className="size-4 text-muted-foreground" />
                  <Input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar por teléfono o texto..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={historyStatus} onValueChange={setHistoryStatus}>
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sent">Enviados</SelectItem>
                      <SelectItem value="delivered">Entregados</SelectItem>
                      <SelectItem value="failed">Fallidos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => fetchMessages(historyPage, historySearch, historyStatus)} className="h-8 text-xs cursor-pointer">
                    <RotateCw className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y text-xs">
                {historyLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Cargando historial de mensajes...</p>
                ) : messagesData?.messages?.data && messagesData.messages.data.length > 0 ? (
                  messagesData.messages.data.map((msg) => (
                    <div key={msg.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground font-mono">{msg.recipient_phone}</span>
                          {msg.recipient_name && <span className="text-muted-foreground">({msg.recipient_name})</span>}
                          <Badge
                            className={cn(
                              "text-[9px] uppercase font-bold px-1.5 py-0",
                              msg.status === 'sent'
                                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                : msg.status === 'failed'
                                ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground line-clamp-1">{msg.message_content}</p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                        {msg.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetryMessage(msg.id)}
                            disabled={retryingId === msg.id}
                            className="h-6 text-[10px] px-2 text-rose-600 border-rose-200 cursor-pointer"
                          >
                            {retryingId === msg.id ? "Reenviando..." : "Reintentar"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">No hay registros en la bitácora.</p>
                )}
              </div>
            </CardContent>

            {messagesData?.messages && messagesData.messages.last_page > 1 && (
              <CardFooter className="border-t px-4 py-2.5 flex justify-between items-center text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Página {messagesData.messages.current_page} de {messagesData.messages.last_page} ({messagesData.messages.total} registros)
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={messagesData.messages.current_page <= 1}
                    onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                    className="h-7 text-xs px-2.5 cursor-pointer"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={messagesData.messages.current_page >= messagesData.messages.last_page}
                    onClick={() => setHistoryPage((prev) => prev + 1)}
                    className="h-7 text-xs px-2.5 cursor-pointer"
                  >
                    Siguiente
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* ── 5. ANTI-BANEO & POLÍTICAS ───────────────────────────────── */}
        <TabsContent value="antiban" className="space-y-6">
          {!isSuperAdmin && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs flex items-center gap-2 mb-2 font-medium">
              <Shield className="size-4 shrink-0 text-amber-500" />
              <span>Las políticas globales Anti-Baneo son administradas por la Empresa Matriz. Los parámetros mostrados a continuación son de solo lectura.</span>
            </div>
          )}

          {antiBanAlert && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-semibold text-xs flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>{antiBanAlert}</span>
            </div>
          )}

          <form onSubmit={handleSaveAntiBan} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Flame className="size-4 text-amber-500" />
                    <span>Límites Diarios & Calentamiento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Límite Máximo Diario (Mensajes/Día)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={5000}
                      disabled={!isSuperAdmin}
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Recomendado para números clínicos: 300 a 500 msgs/día.</p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div>
                      <p className="font-semibold text-foreground">Modo Calentamiento Gradual (Warmup)</p>
                      <p className="text-[10px] text-muted-foreground">Incremente automáticamente la cuota diaria para prevenir bloqueos de Meta.</p>
                    </div>
                    <Switch disabled={!isSuperAdmin} checked={warmupMode} onCheckedChange={setWarmupMode} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="size-4 text-indigo-500" />
                    <span>Ventana de Trabajo Anti-Baneo Nocturna</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div>
                      <p className="font-semibold text-foreground">Restringir Envíos Nocturnos</p>
                      <p className="text-[10px] text-muted-foreground">Pausa los envíos automáticos fuera de la ventana operativa.</p>
                    </div>
                    <Switch disabled={!isSuperAdmin} checked={workingHoursEnabled} onCheckedChange={setWorkingHoursEnabled} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Hora de Inicio</Label>
                      <Input
                        type="time"
                        disabled={!isSuperAdmin}
                        value={workingHoursStart}
                        onChange={(e) => setWorkingHoursStart(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Hora de Cierre</Label>
                      <Input
                        type="time"
                        disabled={!isSuperAdmin}
                        value={workingHoursEnd}
                        onChange={(e) => setWorkingHoursEnd(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isSuperAdmin && (
              <div className="flex justify-end">
                <Button type="submit" disabled={savingAntiBan} className="h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-xs">
                  {savingAntiBan ? "Guardando..." : "Guardar Políticas Anti-Baneo"}
                </Button>
              </div>
            )}
          </form>
        </TabsContent>

        {/* ── 6. PRUEBAS & SPINTAX ─────────────────────────────────────── */}
        <TabsContent value="dispatcher" className="space-y-6">
          {testAlert && (
            <div
              className={cn(
                "p-3.5 rounded-xl text-xs flex items-center gap-2 border",
                testAlert.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-semibold" : "bg-rose-500/10 border-rose-500/30 text-rose-600 font-semibold"
              )}
            >
              {testAlert.success ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
              <span>{testAlert.text}</span>
            </div>
          )}

          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-7">
              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Send className="size-4 text-primary" />
                    <span>Probador de Envíos & Motor Spintax</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 text-xs">
                  <form onSubmit={handleSendTest} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Número Telefónico Destino</Label>
                      <div className="flex gap-2">
                        <Select value={testCountry} onValueChange={setTestCountry}>
                          <SelectTrigger className="w-28 h-9 text-xs font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+58">🇻🇪 +58 (VE)</SelectItem>
                            <SelectItem value="+57">🇨🇴 +57 (CO)</SelectItem>
                            <SelectItem value="+1">🇺🇸 +1 (US)</SelectItem>
                            <SelectItem value="+34">🇪🇸 +34 (ES)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          required
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          placeholder="4121234567"
                          className="h-9 text-xs font-mono flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCheckNumber}
                          disabled={checkingNumber}
                          className="h-9 text-xs cursor-pointer"
                        >
                          {checkingNumber ? "..." : "Verificar"}
                        </Button>
                      </div>

                      {numberCheckResult && (
                        <p className={cn("text-[11px] font-semibold mt-1", numberCheckResult.exists ? "text-emerald-600" : "text-rose-600")}>
                          {numberCheckResult.exists ? "✓ Número verificado y activo en WhatsApp." : "✕ Número no registrado en WhatsApp."}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Cuerpo del Mensaje (con Spintax)</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">{`{Hola|Buen día}`}</span>
                      </div>
                      <Textarea
                        rows={4}
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="text-xs leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePreviewSpintax}
                        disabled={previewingSpintax}
                        className="h-8 text-xs gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="size-3.5 text-primary" />
                        <span>Generar 4 Variaciones Spintax</span>
                      </Button>

                      <Button
                        type="submit"
                        disabled={sendingTest}
                        className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Send className="size-3.5" />
                        <span>{sendingTest ? "Enviando..." : "Despachar Prueba"}</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Variaciones Spintax Generadas */}
            <div className="md:col-span-5">
              <Card className="shadow-xs h-full">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <span>Variaciones Spintax en Vivo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-2.5 max-h-[360px] overflow-y-auto text-xs">
                  {spintaxPreviews.length > 0 ? (
                    spintaxPreviews.map((v, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-emerald-950/10 border-emerald-500/20 text-foreground leading-relaxed">
                        <span className="text-[9px] font-bold uppercase text-emerald-600 block mb-1">Variación #{i + 1}</span>
                        {v}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-10 italic">
                      Haz clic en "Generar 4 Variaciones" para observar cómo cambia el mensaje aleatoriamente.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── 7. SERVIDOR & WEBHOOK (EXCLUSIVO SUPERADMIN) ────────────── */}
        {isSuperAdmin && (
          <TabsContent value="settings" className="space-y-6">
            {serverAlert && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-semibold text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                <span>{serverAlert}</span>
              </div>
            )}

            <form onSubmit={handleSaveServer} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-xs">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-bold">Servidor Microservicio Baileys</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">URL de la API Gateway</Label>
                      <Input
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder="https://whatsapp.theizerdev.com"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nombre de Instancia</Label>
                      <Input
                        value={serverInstance}
                        onChange={(e) => setServerInstance(e.target.value)}
                        placeholder="empresa_1"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <div>
                        <p className="font-semibold text-foreground">Habilitar Integración WhatsApp</p>
                        <p className="text-[10px] text-muted-foreground">Permite la conexión con el microservicio.</p>
                      </div>
                      <Switch checked={serverActive} onCheckedChange={setServerActive} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-xs">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-bold">Credenciales & Webhook</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">API Key Institucional</Label>
                        <button
                          type="button"
                          onClick={handleGenerateToken}
                          className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Regenerar Token
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          value={serverApiKey}
                          onChange={(e) => setServerApiKey(e.target.value)}
                          className="h-9 text-xs font-mono pr-16"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="text-muted-foreground hover:text-foreground">
                            {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(serverApiKey);
                              setCopiedToken(true);
                              setTimeout(() => setCopiedToken(false), 2000);
                            }}
                            className="text-muted-foreground hover:text-foreground ml-1"
                          >
                            {copiedToken ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Webhook Entrante (Eventos de Mensajes)</Label>
                      <div className="relative">
                        <Input readOnly value={webhookUrl} className="h-9 text-xs font-mono pr-8 bg-muted/40" />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(webhookUrl);
                            setCopiedWebhook(true);
                            setTimeout(() => setCopiedWebhook(false), 2000);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {copiedWebhook ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={savingServer} className="h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-xs">
                  {savingServer ? "Guardando..." : "Guardar Configuración del Servidor"}
                </Button>
              </div>
            </form>
          </TabsContent>
        )}
      </Tabs>

      {/* ══ MODAL DE DIAGNÓSTICO DE SALUD ════════════════════════════════ */}
      <Dialog open={diagnosticOpen} onOpenChange={setDiagnosticOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Heart className="size-5 text-rose-500 fill-rose-500" />
              <span>Diagnóstico de Salud WhatsApp API</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Monitoreo de latencia, memoria del socket y conectividad.
            </DialogDescription>
          </DialogHeader>

          {diagnosticLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Midiendo latencia y sockets...</span>
            </div>
          ) : diagnosticData ? (
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 rounded-lg border bg-card flex justify-between items-center">
                <span className="text-muted-foreground">Latencia de Conexión:</span>
                <Badge variant="outline" className="font-mono font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                  {diagnosticData.latency_ms} ms
                </Badge>
              </div>

              <div className="p-3 rounded-lg border bg-card flex justify-between items-center">
                <span className="text-muted-foreground">Uso de Memoria Microservicio:</span>
                <span className="font-mono font-semibold text-foreground">{diagnosticData.memory_usage}</span>
              </div>

              <div className="p-3 rounded-lg border bg-card flex justify-between items-center">
                <span className="text-muted-foreground">Estado de Sockets:</span>
                <span className="font-semibold text-emerald-600">{diagnosticData.socket_state}</span>
              </div>

              <div className="p-3 rounded-lg border bg-card flex justify-between items-center">
                <span className="text-muted-foreground">Instancia Evaluada:</span>
                <span className="font-mono font-semibold">{diagnosticData.instance}</span>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-3 border-t">
            <Button size="sm" onClick={() => setDiagnosticOpen(false)} className="h-8 text-xs">
              Cerrar Diagnóstico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL DE CREAR / EDITAR PLANTILLA ════════════════════════════ */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingTemplate ? "Editar Plantilla de WhatsApp" : "Nueva Plantilla de WhatsApp"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define el mensaje y añade variables dinámicas que se reemplazarán al despachar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre de la Plantilla *</Label>
              <Input
                required
                value={tplNombre}
                onChange={(e) => setTplNombre(e.target.value)}
                placeholder="Ej. Recordatorio de Consulta"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoría *</Label>
              <Select value={tplCategoria} onValueChange={setTplCategoria}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recordatorio_cita">Recordatorio de Cita Médica</SelectItem>
                  <SelectItem value="confirmacion_turno">Llamado de Turno en Sala</SelectItem>
                  <SelectItem value="receta_medica">Entrega de Receta Médica</SelectItem>
                  <SelectItem value="resultado_estudio">Resultados de Laboratorio / Estudios</SelectItem>
                  <SelectItem value="general">Mensaje General / Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Contenido del Mensaje *</Label>
                <span className="text-[10px] text-muted-foreground">Soporta negritas con *texto*</span>
              </div>
              <Textarea
                required
                rows={4}
                value={tplContenido}
                onChange={(e) => setTplContenido(e.target.value)}
                placeholder="Hola *{paciente}*, le recordamos..."
                className="text-xs leading-relaxed"
              />

              <div className="pt-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Insertar Variable Clínica:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['paciente', 'fecha_cita', 'hora', 'medico', 'sede', 'turno', 'consultorio', 'enlace_receta', 'random'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTplContenido((prev) => prev + ` {${v}}`)}
                      className="px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-mono font-semibold transition-colors cursor-pointer border border-primary/20"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setTemplateModalOpen(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={savingTpl} className="h-9 text-xs font-bold">
                {savingTpl ? "Guardando..." : "Guardar Plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppCenter;
