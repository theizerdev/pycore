import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { citasApi } from '../../api/citas';
import { integracionesApi } from '../../api/integraciones';
import type { CitaMedica, JitsiSessionConfig, JitsiDiagnostic } from '../../types';
import { JitsiMeetingEmbed } from '../../components/telemedicina/JitsiMeetingEmbed';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  Copy,
  MessageCircle,
  Mic,
  RefreshCw,
  Server,
  Share2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getLocalDateString } from '../../lib/utils';

export const WorkSpaceHubPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [citasTelemedicina, setCitasTelemedicina] = useState<CitaMedica[]>([]);
  const [diagnostic, setDiagnostic] = useState<JitsiDiagnostic | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  // Sesión activa en la cabina integrada de WorkSpace
  const [activeSession, setActiveSession] = useState<JitsiSessionConfig | null>(null);
  const [activeCitaId, setActiveCitaId] = useState<number | null>(null);

  // Formulario de sala rápida / espontánea
  const [quickRoomName, setQuickRoomName] = useState('');
  const [quickRoomSubject, setQuickRoomSubject] = useState('');
  const [creatingQuickRoom, setCreatingQuickRoom] = useState(false);

  // Autochequeo local de dispositivos (cámara / mic)
  const videoTestRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const todayStr = getLocalDateString();

  // Carga de citas de telemedicina de hoy y diagnóstico Jitsi
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const citas = await citasApi.list({
        modalidad: 'telemedicina',
        fecha_inicio: todayStr,
        fecha_fin: todayStr,
      });
      setCitasTelemedicina(citas);
    } catch (err: any) {
      console.error('Error cargando citas de telemedicina:', err);
      toast.error('No se pudieron cargar las citas de telemedicina de hoy');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  const runDiagnostic = async () => {
    setDiagnosticLoading(true);
    try {
      const res = await integracionesApi.diagnoseJitsi();
      setDiagnostic(res);
      if (res.healthy) {
        toast.success(`Servidor Jitsi en línea (${res.latency_ms} ms)`, {
          description: `Nodo: ${res.domain} • Proveedor: ${res.provider}`,
        });
      } else {
        toast.warning('Aviso en diagnóstico de Jitsi Meet', {
          description: res.error || 'Verifique credenciales y conectividad.',
        });
      }
    } catch (err: any) {
      toast.error('Error al diagnosticar Jitsi Meet');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    runDiagnostic();
  }, [loadInitialData]);

  // Manejo de dispositivos de prueba
  const startDeviceTest = async () => {
    setDeviceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setCameraActive(true);
      setMicActive(true);
      if (videoTestRef.current) {
        videoTestRef.current.srcObject = stream;
      }
      toast.success('Cámara y micrófono locales activos');
    } catch (err: any) {
      setDeviceError('No se pudo acceder a dispositivos multimedia. Verifique permisos.');
    }
  };

  const stopDeviceTest = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (videoTestRef.current) {
      videoTestRef.current.srcObject = null;
    }
    setCameraActive(false);
    setMicActive(false);
  };

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Abrir cabina Jitsi para una cita médica específica
  const handleAbrirCabinaCita = async (cita: CitaMedica) => {
    stopDeviceTest();
    try {
      const session = await citasApi.crearSesionTeleconsulta(cita.id);
      setActiveSession(session);
      setActiveCitaId(cita.id);
      toast.success(`Cabina de telemedicina abierta para cita #${cita.id}`, {
        description: `Paciente: ${cita.paciente_nombre}`,
      });
      // Scroll al visor
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'No se pudo iniciar la sesión de teleconsulta';
      toast.error(msg);
    }
  };

  // Crear sala rápida / ad-hoc para junta médica o ateneo
  const handleCrearSalaRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    stopDeviceTest();
    setCreatingQuickRoom(true);
    try {
      const roomSlug = quickRoomName.trim()
        ? `sala-${quickRoomName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`
        : null;
      const session = await integracionesApi.createJitsiSession({
        context_type: 'workspace',
        custom_room: roomSlug,
        subject: quickRoomSubject.trim() || 'Junta Médica — MediSoft WorkSpace',
        as_moderator: true,
      });
      setActiveSession(session);
      setActiveCitaId(null);
      toast.success('Sala rápida de WorkSpace creada', {
        description: `Sala: ${session.room_name}`,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'No se pudo inicializar la sala rápida');
    } finally {
      setCreatingQuickRoom(false);
    }
  };

  // Copiar enlace del paciente
  const handleCopiarLinkPaciente = (cita: CitaMedica) => {
    const url =
      cita.teleconsulta_url ||
      (cita.teleconsulta_token
        ? `${window.location.origin}/teleconsulta/${cita.teleconsulta_token}`
        : null);
    if (!url) {
      toast.error('Esta cita no posee un enlace generado aún');
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success('Enlace de teleconsulta copiado', {
      description: url,
    });
  };

  // Copiar enlace de moderador/invitado a sala rápida
  const handleCopiarLinkSalaRapida = () => {
    if (!activeSession) return;
    navigator.clipboard.writeText(activeSession.meeting_url);
    toast.success('Enlace de la reunión copiado al portapapeles', {
      description: activeSession.meeting_url,
    });
  };

  // Reenviar WhatsApp
  const handleEnviarWhatsApp = async (citaId: number) => {
    try {
      const res = await citasApi.enviarLinkTeleconsulta(citaId);
      if (res.success) {
        toast.success('Enlace enviado por WhatsApp al paciente', {
          description: `Destinatario: ${res.destinatario}`,
        });
        loadInitialData();
      } else {
        toast.warning(res.detalle, {
          action: res.whatsapp_direct_url
            ? {
                label: 'Abrir Web',
                onClick: () => window.open(res.whatsapp_direct_url, '_blank'),
              }
            : undefined,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'No se pudo despachar el mensaje');
    }
  };

  // Contadores métricos
  const totalHoy = citasTelemedicina.length;
  const pacientesConectados = citasTelemedicina.filter((c) => Boolean(c.paciente_conectado_at)).length;
  const citasPagadas = citasTelemedicina.filter((c) => c.estado_pago === 'pagado').length;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* ── CABECERA PRINCIPAL DE WORKSPACE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-linear-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Video className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                MediSoft WorkSpace
                <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] font-bold">
                  Telemedicina & Jitsi
                </Badge>
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Plataforma clínica en tiempo real para videoconsultas médicas, interconsultas y ateneos clínicos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runDiagnostic}
            disabled={diagnosticLoading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`size-3.5 ${diagnosticLoading ? 'animate-spin' : ''}`} />
            <span>Diagnosticar Jitsi</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const el = document.getElementById('tab-quick-room');
              if (el) el.click();
            }}
            className="text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 h-9 font-semibold shadow-xs"
          >
            <Sparkles className="size-3.5" />
            <span>+ Nueva Junta Médica</span>
          </Button>
        </div>
      </div>

      {/* ── MÉTRICAS DE TELEMEDICINA DE HOY ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Citas Online Hoy
              </span>
              <span className="text-2xl font-bold text-foreground mt-0.5 block">
                {totalHoy}
              </span>
            </div>
            <div className="size-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Calendar className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                En Sala Virtual
              </span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block flex items-center gap-2">
                {pacientesConectados}
                {pacientesConectados > 0 && (
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </span>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Pagadas / Cobertura
              </span>
              <span className="text-2xl font-bold text-foreground mt-0.5 block">
                {citasPagadas} / {totalHoy}
              </span>
            </div>
            <div className="size-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block truncate">
                Motor WebRTC
              </span>
              <span className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5 truncate">
                <span
                  className={`size-2 rounded-full ${
                    diagnostic?.healthy ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="capitalize">{diagnostic?.provider || 'Jitsi'}</span>
                {diagnostic?.latency_ms ? ` (${diagnostic.latency_ms}ms)` : ''}
              </span>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Server className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── CABINA INTEGRADA ACTIVA (SI HAY REUNIÓN EN CURSO) ── */}
      {activeSession && (
        <Card className="border-2 border-sky-500/60 shadow-xl overflow-hidden bg-slate-950">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white flex-wrap gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-sky-600 flex items-center justify-center shrink-0">
                <Video className="size-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold truncate">
                  {activeSession.subject || 'Cabina Activa — MediSoft WorkSpace'}
                </h3>
                <p className="text-[10px] text-slate-400 truncate">
                  Sala: {activeSession.room_name} • Moderador: {user?.nombre || 'Médico'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                ● En Llamada
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopiarLinkSalaRapida}
                className="h-7 text-[11px] bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 gap-1.5"
                title="Copiar URL directa de la reunión"
              >
                <Share2 className="size-3" />
                <span className="hidden sm:inline">Copiar Enlace</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setActiveSession(null);
                  setActiveCitaId(null);
                  toast.info('Cabina cerrada');
                }}
                className="h-7 text-[11px] gap-1"
              >
                <X className="size-3" />
                <span>Cerrar Cabina</span>
              </Button>
            </div>
          </div>

          <div className="h-[600px] w-full bg-black relative">
            <JitsiMeetingEmbed
              session={activeSession}
              className="w-full h-full"
              onHangup={(duration) => {
                toast.info(`Videoconsulta finalizada (${Math.floor(duration / 60)} min)`);
                setActiveSession(null);
                setActiveCitaId(null);
              }}
            />
          </div>
        </Card>
      )}

      {/* ── TABS: CITAS DE HOY / SALA RÁPIDA / DIAGNÓSTICO ── */}
      <Tabs defaultValue="citas-hoy" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/60">
          <TabsTrigger value="citas-hoy" className="text-xs gap-1.5 font-medium">
            <Calendar className="size-3.5" />
            <span>Teleconsultas de Hoy</span>
            {totalHoy > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0 h-4">
                {totalHoy}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            id="tab-quick-room"
            value="sala-rapida"
            className="text-xs gap-1.5 font-medium"
          >
            <Sparkles className="size-3.5" />
            <span>Sala Rápida / Junta Médica</span>
          </TabsTrigger>

          <TabsTrigger value="dispositivos" className="text-xs gap-1.5 font-medium">
            <Camera className="size-3.5" />
            <span>Chequeo de Audio & Video</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: LISTADO DE TELECONSULTAS DE HOY ── */}
        <TabsContent value="citas-hoy" className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-3">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <span>Cargando agenda de telemedicina...</span>
            </div>
          ) : citasTelemedicina.length === 0 ? (
            <Card className="border-dashed border-border text-center p-8">
              <CardContent className="space-y-3 p-0">
                <div className="size-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center mx-auto">
                  <VideoOff className="size-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    No hay citas de telemedicina programadas para hoy
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Al agendar una nueva cita seleccionando la modalidad <b>Telemedicina</b>,
                    aparecerá automáticamente aquí con su sala virtual y enlace WhatsApp.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/clinica/agenda')}
                  className="text-xs gap-1.5 mt-2"
                >
                  <Calendar className="size-3.5" />
                  Ir a Agenda Calendario
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {citasTelemedicina.map((cita) => {
                const isConnected = Boolean(cita.paciente_conectado_at);
                const isPaid = cita.estado_pago === 'pagado';
                const isRunningThisCita = activeCitaId === cita.id;

                return (
                  <Card
                    key={cita.id}
                    className={`border transition-all hover:shadow-md ${
                      isRunningThisCita
                        ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/5'
                        : isConnected
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-border/80'
                    }`}
                  >
                    <CardHeader className="p-4 pb-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Cita #{cita.id} • {cita.hora_inicio} - {cita.hora_fin}
                          </span>
                          <CardTitle className="text-sm font-bold text-foreground truncate">
                            {cita.paciente_nombre}
                          </CardTitle>
                          <span className="text-[11px] text-muted-foreground block">
                            {cita.paciente_documento || 'S/D'} • Tel: {cita.paciente_telefono || 'S/T'}
                          </span>
                        </div>

                        {isConnected ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 shrink-0">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            En Sala
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                            Esperando
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                        <Stethoscope className="size-3 text-sky-600 shrink-0" />
                        <span className="truncate">{cita.especialidad_nombre}</span>
                        <span>•</span>
                        <span className="truncate font-medium">{cita.medico_nombre}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-3">
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted-foreground text-[11px]">Pago:</span>
                        <Badge
                          variant="outline"
                          className={`capitalize text-[10px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300'
                          }`}
                        >
                          {cita.estado_pago || 'Pendiente'}
                        </Badge>
                      </div>

                      {/* Acciones de la Cita */}
                      <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-border/60">
                        <Button
                          size="sm"
                          onClick={() => handleAbrirCabinaCita(cita)}
                          className="flex-1 h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold gap-1.5 shadow-2xs"
                        >
                          <Video className="size-3.5" />
                          <span>{isRunningThisCita ? 'En Cabina' : 'Abrir Cabina'}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopiarLinkPaciente(cita)}
                          className="h-8 text-xs px-2.5"
                          title="Copiar enlace para el paciente"
                        >
                          <Copy className="size-3" />
                        </Button>

                        {cita.paciente_telefono && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnviarWhatsApp(cita.id)}
                            className="h-8 text-xs px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="Reenviar link por WhatsApp"
                          >
                            <MessageCircle className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: SALA RÁPIDA / JUNTA MÉDICA ESPONTÁNEA ── */}
        <TabsContent value="sala-rapida">
          <Card className="border-border/80 shadow-xs max-w-2xl">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-sky-600" />
                Iniciar Reunión Instantánea o Ateneo
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Cree una sala virtual privada para debatir casos con colegas, juntas médicas o ateneos clínicos.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-2">
              <form onSubmit={handleCrearSalaRapida} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Nombre o Código de la Sala (Opcional)
                  </Label>
                  <Input
                    placeholder="Ej. comite-pediatrico-octubre (deje en blanco para auto-generar)"
                    value={quickRoomName}
                    onChange={(e) => setQuickRoomName(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Se convertirá en un identificador seguro y encriptado.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Asunto o Título de la Reunión
                  </Label>
                  <Input
                    placeholder="Ej. Discusión de caso clínico: Cirugía de la mano"
                    value={quickRoomSubject}
                    onChange={(e) => setQuickRoomSubject(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-xs space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span>Seguridad y Privacidad Clínica:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Usted ingresará con privilegios de Moderador. Podrá compartir pantalla, silenciar participantes o compartir el enlace directo con médicos externos.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={creatingQuickRoom}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold gap-2 h-9 px-5 shadow-xs"
                  >
                    <Video className="size-4" />
                    <span>{creatingQuickRoom ? 'Iniciando sala...' : 'Crear e Ingresar a la Sala'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: DIAGNÓSTICO Y CHEQUEO DE DISPOSITIVOS ── */}
        <TabsContent value="dispositivos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Prueba de Cámara y Micrófono */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Camera className="size-4 text-teal-600" />
                  Prueba de Cámara y Micrófono Local
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Verifique su imagen y niveles de audio antes de iniciar una teleconsulta.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                <div className="relative aspect-video w-full rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoTestRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] ${
                      cameraActive ? 'block' : 'hidden'
                    }`}
                  />
                  {!cameraActive && (
                    <div className="text-center p-4 text-slate-500 text-xs space-y-1">
                      <CameraOff className="size-8 mx-auto opacity-40" />
                      <p>Dispositivos en reposo</p>
                    </div>
                  )}
                </div>

                {deviceError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                    {deviceError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  {!cameraActive ? (
                    <Button
                      size="sm"
                      onClick={startDeviceTest}
                      className="text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1.5 h-8"
                    >
                      <Camera className="size-3.5" />
                      <span>Encender Dispositivos</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={stopDeviceTest}
                      className="text-xs gap-1.5 h-8 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <CameraOff className="size-3.5" />
                      <span>Apagar Prueba</span>
                    </Button>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {micActive && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Mic className="size-3" />
                        Mic Activo
                      </span>
                    )}
                    <span>HTML5 WebRTC</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diagnóstico del Servidor Jitsi */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Server className="size-4 text-sky-600" />
                  Estado del Servidor Jitsi
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Parámetros de conexión y latencia criptográfica.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {diagnostic ? (
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estado General:</span>
                        <Badge
                          className={`text-[10px] font-bold ${
                            diagnostic.healthy
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300'
                          }`}
                        >
                          {diagnostic.healthy ? '🟢 Operativo' : '⚠️ Observación'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Proveedor:</span>
                        <span className="font-semibold text-foreground uppercase">{diagnostic.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dominio Servidor:</span>
                        <span className="font-mono text-foreground">{diagnostic.domain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Latencia de Red:</span>
                        <span className="font-mono font-bold text-teal-600">{diagnostic.latency_ms} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Firma JWT:</span>
                        <span className="font-medium text-foreground">{diagnostic.jwt_status_message}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={runDiagnostic}
                      disabled={diagnosticLoading}
                      className="w-full text-xs gap-1.5 h-8"
                    >
                      <RefreshCw className={`size-3 ${diagnosticLoading ? 'animate-spin' : ''}`} />
                      <span>Volver a Probar Conexión</span>
                    </Button>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Cargando diagnóstico...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkSpaceHubPage;
