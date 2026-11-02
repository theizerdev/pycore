import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { citasApi } from '../../api/citas';
import type { TeleconsultaPublicInfo } from '../../types';
import { JitsiMeetingEmbed } from '../../components/telemedicina/JitsiMeetingEmbed';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HeartPulse,
  Info,
  Lock,
  Mic,
  MicOff,
  Phone,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

export const TeleconsultaPublicPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeleconsultaPublicInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados de la antesala clínica
  const [joined, setJoined] = useState(false);
  const [ended, setEnded] = useState(false);
  const [endedDuration, setEndedDuration] = useState(0);
  const [consentAccepted, setConsentAccepted] = useState(true);

  // Prueba de dispositivos (Cámara y Micrófono locales)
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [devicePermissionError, setDevicePermissionError] = useState<string | null>(null);
  const [testingDevices, setTestingDevices] = useState(false);

  // Carga inicial de datos de la cita y validación de token
  const loadTeleconsulta = useCallback(async (showLoading = true) => {
    const cleanToken = (token || '').split('?')[0].split('#')[0].trim();
    if (!cleanToken) {
      setErrorMsg('Enlace de teleconsulta inválido.');
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const res = await citasApi.getTeleconsultaPublica(cleanToken);
      setData(res);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Error cargando sala de teleconsulta:', err);
      const detail =
        err.response?.data?.detail ||
        'La sala virtual no está disponible o el enlace ha caducado. Comuníquese con la clínica.';
      setErrorMsg(detail);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTeleconsulta();
  }, [loadTeleconsulta]);

  // Ping periódico de presencia en sala de espera mientras no se haya terminado
  useEffect(() => {
    const cleanToken = (token || '').split('?')[0].split('#')[0].trim();
    if (!cleanToken || ended) return;

    const interval = window.setInterval(async () => {
      try {
        await citasApi.confirmarPresenciaTeleconsulta(cleanToken);
      } catch {
        // Ping silencioso en segundo plano
      }
    }, 40000);

    return () => clearInterval(interval);
  }, [token, ended]);

  // Manejo de la cámara y micrófono para la prueba de dispositivos
  const startDeviceTest = async () => {
    setDevicePermissionError(null);
    setTestingDevices(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setCameraActive(true);
      setMicActive(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      toast.success('Cámara y micrófono detectados correctamente');
    } catch (err: any) {
      console.warn('Error al acceder a dispositivos multimedia:', err);
      setDevicePermissionError(
        'No se pudo acceder a la cámara o micrófono. Verifique los permisos en su navegador.'
      );
    } finally {
      setTestingDevices(false);
    }
  };

  const stopDeviceTest = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setCameraActive(false);
    setMicActive(false);
  };

  const toggleCameraPreview = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraActive(videoTrack.enabled);
      }
    } else {
      startDeviceTest();
    }
  };

  const toggleMicPreview = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
      }
    }
  };

  // Limpiar stream al desmontar el componente o entrar a Jitsi
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleEntrarVideoconsulta = () => {
    if (!consentAccepted) {
      toast.error('Debe aceptar el consentimiento para ingresar a la videoconsulta.');
      return;
    }
    // Liberar dispositivos de prueba para que Jitsi tome control exclusivo
    stopDeviceTest();
    setJoined(true);
  };

  const handleHangup = (durationSeconds: number) => {
    setEndedDuration(durationSeconds);
    setJoined(false);
    setEnded(true);
  };

  // Render: Pantalla de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="size-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center animate-pulse">
            <HeartPulse className="size-8 animate-bounce" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Conectando con la Sala Médica
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Verificando cita y configurando canal seguro de telemedicina...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render: Error o Token Inválido
  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-200 dark:border-rose-900/50 shadow-lg">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
            <div className="size-14 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
              <AlertCircle className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Acceso a Teleconsulta no disponible
              </h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {errorMsg || 'No se pudo encontrar la cita médica vinculada a este enlace.'}
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => loadTeleconsulta(true)}
                className="gap-2 text-xs"
              >
                <RefreshCw className="size-3.5" />
                Reintentar conexión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render: Cita Bloqueada por Pago o Cancelada
  if (!data.autorizado) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-amber-300 dark:border-amber-800/50 shadow-xl overflow-hidden">
          <div className="p-4 bg-amber-500/10 border-b border-amber-200 dark:border-amber-900/40 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Ingreso a Videoconsulta Restringido
              </h3>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                {data.empresa_nombre} • Cita #{data.cita_id}
              </p>
            </div>
          </div>

          <CardContent className="pt-6 pb-6 px-6 space-y-5">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Paciente:</span>
                <span className="font-semibold text-foreground">{data.paciente_nombre}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Especialista:</span>
                <span className="font-semibold text-foreground">{data.medico_nombre}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Horario:</span>
                <span className="font-semibold text-foreground">
                  {data.fecha_formateada} • {data.hora_inicio}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Estado del Pago:</span>
                <Badge
                  variant="outline"
                  className="capitalize font-semibold text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300"
                >
                  {data.estado_pago}
                </Badge>
              </div>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed">
              {data.mensaje_bloqueo ||
                'Su cita requiere confirmación o registro de pago para habilitar el ingreso a la videoconsulta.'}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {data.empresa_telefono && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2"
                  onClick={() => {
                    const clean = data.empresa_telefono?.replace(/[^0-9]/g, '') || '';
                    const msg = `Hola, soy ${data.paciente_nombre}. Tengo cita de telemedicina #${data.cita_id} hoy y deseo confirmar mi pago para ingresar a la sala.`;
                    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                >
                  <Phone className="size-3.5" />
                  Contactar Recepción por WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => loadTeleconsulta(true)}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Actualizar Estado
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render: Videoconsulta Finalizada
  if (ended) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-teal-200 dark:border-teal-900/50 shadow-xl text-center overflow-hidden">
          <div className="p-6 bg-linear-to-b from-teal-500/10 to-transparent flex flex-col items-center gap-3">
            <div className="size-16 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="size-9" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Videoconsulta Finalizada</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Gracias por atenderse con el equipo de {data.empresa_nombre}.
              </p>
            </div>
          </div>

          <CardContent className="px-6 pb-6 pt-0 space-y-4">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Especialista:</span>
                <span className="font-semibold text-foreground">{data.medico_nombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Especialidad:</span>
                <span className="font-medium text-foreground">{data.especialidad_nombre}</span>
              </div>
              {endedDuration > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Duración en llamada:</span>
                  <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                    {Math.floor(endedDuration / 60)} min {endedDuration % 60} seg
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-teal-500/5 border border-teal-500/20 text-[11px] text-teal-800 dark:text-teal-300 leading-relaxed">
              Su especialista registrará el informe clínico y prescripciones correspondientes en el sistema.
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setEnded(false);
                setJoined(false);
              }}
              className="w-full text-xs"
            >
              Volver a la Antesala
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render: Videoconsulta Activa (Full Jitsi Embed)
  if (joined && data.jitsi_session) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
        {/* Barra superior clínica flotante */}
        <header className="h-12 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-white z-20">
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-lg bg-teal-500 flex items-center justify-center text-white">
              <Video className="size-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold leading-tight truncate">
                {data.empresa_nombre} • Telemedicina
              </h1>
              <p className="text-[10px] text-slate-400 truncate">
                {data.medico_nombre} ({data.especialidad_nombre}) • Paciente: {data.paciente_nombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold py-0.5 px-2">
              ● En Vivo
            </Badge>

            {data.preconsulta_token && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`/preconsulta/${data.preconsulta_token}`, '_blank')
                }
                className="h-7 text-[11px] bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 gap-1.5"
              >
                <FileText className="size-3" />
                <span className="hidden sm:inline">Ver Preconsulta</span>
              </Button>
            )}
          </div>
        </header>

        {/* Contenedor Jitsi External API */}
        <div className="flex-1 w-full min-h-0 bg-black relative">
          <JitsiMeetingEmbed
            session={data.jitsi_session}
            className="w-full h-full"
            showStatusBar={true}
            onHangup={handleHangup}
          />
        </div>
      </div>
    );
  }

  // Render: Antesala y Verificación Previa (Waiting Room)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col">
      {/* Cabecera Clínica */}
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md sticky top-0 z-10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {data.empresa_logo ? (
            <img
              src={data.empresa_logo}
              alt={data.empresa_nombre}
              className="h-8 max-w-[120px] object-contain rounded-sm"
            />
          ) : (
            <div className="size-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Stethoscope className="size-4" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">
              {data.empresa_nombre}
            </h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Portal de Telemedicina</span>
              <span>•</span>
              <span className="text-teal-600 dark:text-teal-400 font-medium">
                {data.sucursal_nombre || 'Sede Principal'}
              </span>
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5"
        >
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          Sala de Espera Conectada
        </Badge>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Banner de Bienvenida y Cita */}
        <div className="rounded-3xl p-5 sm:p-7 bg-linear-to-r from-teal-500/10 via-sky-500/10 to-teal-500/5 border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
              Cita Médica Online • MediSoft WorkSpace
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              ¡Hola, {data.paciente_nombre}!
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Su sala virtual está configurada y lista. Antes de ingresar a la videoconsulta con su especialista,
              puede verificar su cámara y micrófono a continuación.
            </p>
          </div>

          <div className="shrink-0 p-4 rounded-2xl bg-background/90 border border-border shadow-xs space-y-1.5 text-xs min-w-[240px]">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Clock className="size-4 text-teal-600" />
              <span>{data.hora_inicio} - {data.hora_fin}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {data.fecha_formateada}
            </div>
            <div className="pt-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
              Dr(a). {data.medico_nombre}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {data.especialidad_nombre}
            </div>
          </div>
        </div>

        {/* Grid de 2 Columnas: Verificación de Dispositivos & Preconsulta/Consentimiento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Prueba de Dispositivos (Cámara y Mic) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-border/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="size-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-foreground">
                    Verificación de Cámara y Audio
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Autochequeo previo
                </span>
              </div>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Ventana de Video Preview */}
                <div className="relative aspect-video w-full rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] ${
                      cameraActive ? 'block' : 'hidden'
                    }`}
                  />

                  {!cameraActive && (
                    <div className="text-center p-6 space-y-2 text-slate-400">
                      <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <CameraOff className="size-6" />
                      </div>
                      <p className="text-xs font-medium">Cámara en reposo o inactiva</p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Haga clic en el botón inferior para comprobar su video antes de ingresar a la consulta.
                      </p>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium py-1 px-2.5 rounded-full flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      Vista previa local
                    </div>
                  )}
                </div>

                {devicePermissionError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{devicePermissionError}</span>
                  </div>
                )}

                {/* Controles de Dispositivos */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  {!cameraActive && !micActive ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={startDeviceTest}
                      disabled={testingDevices}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
                    >
                      <Camera className="size-3.5" />
                      {testingDevices ? 'Iniciando dispositivos...' : 'Probar Cámara y Micrófono'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={cameraActive ? 'default' : 'secondary'}
                        onClick={toggleCameraPreview}
                        className="text-xs gap-1.5"
                      >
                        {cameraActive ? <Camera className="size-3.5" /> : <CameraOff className="size-3.5" />}
                        {cameraActive ? 'Cámara Activa' : 'Encender Cámara'}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={micActive ? 'default' : 'secondary'}
                        onClick={toggleMicPreview}
                        className="text-xs gap-1.5"
                      >
                        {micActive ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
                        {micActive ? 'Micrófono Activo' : 'Encender Mic'}
                      </Button>
                    </div>
                  )}

                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="size-3 text-emerald-600" />
                    Transmisión encriptada WebRTC
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Consejos para la videoconsulta */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-sky-600" />
                Recomendaciones para una mejor consulta médica:
              </span>
              <ul className="text-muted-foreground text-[11px] space-y-1 list-disc list-inside">
                <li>Utilice auriculares con micrófono para evitar ruidos de fondo.</li>
                <li>Ubíquese en un ambiente iluminado, preferiblemente con luz de frente.</li>
                <li>Tenga a mano resultados de exámenes, informes previos o medicamentos que esté tomando.</li>
              </ul>
            </div>
          </div>

          {/* Columna Derecha: Ingreso, Consentimiento y Preconsulta */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tarjeta de Acción Principal: Entrar a la Consulta */}
            <Card className="border-teal-500/40 shadow-md bg-linear-to-b from-card to-teal-500/5">
              <CardContent className="p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Ingreso a la Consulta
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Su médico está notificado de su presencia en la sala virtual.
                  </p>
                </div>

                {/* Consentimiento Informado */}
                <div className="p-3.5 rounded-xl bg-background border border-border/80 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="mt-0.5 size-4 rounded text-teal-600 focus:ring-teal-500 border-border cursor-pointer"
                    />
                    <span className="text-xs text-foreground font-medium leading-snug">
                      Acepto participar en esta videoconsulta médica y declaro estar de acuerdo con las condiciones de Telemedicina.
                    </span>
                  </label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed pl-6">
                    {data.consentimiento_texto}
                  </p>
                </div>

                {/* Botón Principal de Entrada */}
                <Button
                  type="button"
                  size="lg"
                  disabled={!consentAccepted}
                  onClick={handleEntrarVideoconsulta}
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md cursor-pointer gap-2"
                >
                  <Video className="size-4" />
                  <span>Entrar a la Videoconsulta Ahora</span>
                </Button>

                <p className="text-[10px] text-center text-muted-foreground">
                  Al pulsar el botón se conectará automáticamente sin necesidad de instalar programas adicionales.
                </p>
              </CardContent>
            </Card>

            {/* Tarjeta de Preconsulta Clínica */}
            {data.preconsulta_token && (
              <Card className="border-border/80 shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          Formulario de Preconsulta
                        </h4>
                        <span className="text-[10px] text-muted-foreground">
                          Antecedentes e información sintomática previa
                        </span>
                      </div>
                    </div>
                    {data.preconsulta_estado === 'completada' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                        Completado ✓
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                        Pendiente
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Completar este breve cuestionario ayuda a su especialista a revisar sus motivos y antecedentes antes de iniciar.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`/preconsulta/${data.preconsulta_token}`, '_blank')
                    }
                    className="w-full text-xs gap-1.5 h-8 font-medium hover:bg-accent cursor-pointer"
                  >
                    <span>
                      {data.preconsulta_estado === 'completada'
                        ? 'Ver mis respuestas enviadas'
                        : 'Llenar Formulario de Preconsulta'}
                    </span>
                    <ExternalLink className="size-3" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Asistencia Técnica / Contacto */}
            {data.empresa_telefono && (
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-foreground text-[11px] block">
                    ¿Problemas de conexión o audio?
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Soporte directo con recepción de {data.empresa_nombre}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const clean = data.empresa_telefono?.replace(/[^0-9]/g, '') || '';
                    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(`Hola, tengo una duda técnica con mi teleconsulta médica #${data.cita_id}`)}`, '_blank');
                  }}
                  className="h-7 text-[11px] text-teal-600 hover:text-teal-700 hover:bg-teal-500/10 gap-1 px-2.5 font-semibold cursor-pointer"
                >
                  <Phone className="size-3" />
                  Ayuda WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeleconsultaPublicPage;
