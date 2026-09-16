import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Volume2, VolumeX, Maximize2, Minimize2, Clock, 
  Activity, Bell, User, Stethoscope, MapPin, Building2, CheckCircle2 
} from 'lucide-react';
import { API_BASE_URL } from '../../api/client';

interface SucursalInfo {
  id: number;
  nombre: string;
  codigo: string;
  direccion?: string;
  ciudad?: string;
  empresa_nombre: string;
  empresa_logo?: string;
}

interface Turno {
  id: number;
  numero_turno?: string;
  paciente_nombre: string;
  medico_nombre: string;
  consultorio: string;
  especialidad?: string;
  estado: string;
  llamado_at: string;
}

export const TurneroPantallaPage: React.FC = () => {
  const { codigoSucursal } = useParams<{ codigoSucursal: string }>();

  const [sucursal, setSucursal] = useState<SucursalInfo | null>(null);
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);
  const [ultimosTurnos, setUltimosTurnos] = useState<Turno[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isNewCall, setIsNewCall] = useState<boolean>(false);

  // Referencias para evitar anuncios duplicados
  const lastAnnouncedTurnId = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Función Web Audio API para timbre de hospital/aeropuerto sin archivos externos
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Nota 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.65);

      // Nota 2: G5 (783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.25);
      gain2.gain.setValueAtTime(0, now + 0.25);
      gain2.gain.linearRampToValueAtTime(0.35, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.25);
    } catch (e) {
      console.warn('Audio Chime error:', e);
    }
  };

  // Anunciar por voz sintetizada en español
  const speakPatientCall = (turno: Turno) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Detener audios anteriores

    const mensaje = `Paciente ${turno.paciente_nombre}, favor pasar al ${turno.consultorio}. Doctor ${turno.medico_nombre}.`;
    const utterance = new SpeechSynthesisUtterance(mensaje);
    utterance.lang = 'es-ES';
    utterance.rate = 0.92; // Velocidad pausada y clara
    utterance.pitch = 1.05;

    // Buscar voz nativa en español
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es') || v.lang.includes('Spanish'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    // Esperar a que el timbre termine (750ms) antes de hablar
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 750);
  };

  // Polling para traer los datos del turnero
  useEffect(() => {
    if (!codigoSucursal) return;

    const fetchTurnero = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/turnero/public/${codigoSucursal}`);
        if (!res.ok) {
          throw new Error(`Sucursal con código '${codigoSucursal}' no encontrada`);
        }
        const data = await res.json();
        setSucursal(data.sucursal);
        setUltimosTurnos(data.ultimos_turnos || []);

        const nuevoActual: Turno | null = data.turno_actual;
        setTurnoActual(nuevoActual);
        setErrorMsg(null);

        // Si hay un nuevo llamado que no hemos anunciado
        if (nuevoActual && nuevoActual.id !== lastAnnouncedTurnId.current) {
          lastAnnouncedTurnId.current = nuevoActual.id;
          setIsNewCall(true);
          setTimeout(() => setIsNewCall(false), 8000);

          if (audioEnabled) {
            playChime();
            speakPatientCall(nuevoActual);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMsg(err.message);
        }
      }
    };

    fetchTurnero();
    const interval = setInterval(fetchTurnero, 4000); // Polling cada 4s
    return () => clearInterval(interval);
  }, [codigoSucursal, audioEnabled]);

  // Manejador de Pantalla Completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleEnableAudio = () => {
    setAudioEnabled(true);
    playChime();
  };

  if (errorMsg && !sucursal) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <Activity className="w-16 h-16 text-red-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-red-300 mb-2">Turnero Fuera de Línea</h2>
          <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
          <p className="text-xs text-slate-500">
            Verifique que el código de sucursal en la URL sea correcto (ej: <code className="text-cyan-400">/turnero/SEDE-01</code> o ID de sucursal).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Barra de Notificación de Audio (si no está activado) */}
      {!audioEnabled && (
        <div 
          onClick={handleEnableAudio}
          className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all hover:brightness-110 shadow-lg"
        >
          <div className="flex items-center gap-2 text-sm font-semibold mx-auto">
            <Volume2 className="w-5 h-5 animate-bounce" />
            <span>Haz clic aquí para activar el audio del Turnero (Timbre y Llamado por Voz)</span>
          </div>
        </div>
      )}

      {/* HEADER SUPERIOR SMART TV */}
      <header className="bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide text-white flex items-center gap-3">
              {sucursal?.empresa_nombre || 'MediSoftSuite'}
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SALA DE ESPERA
              </span>
            </h1>
            <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              {sucursal?.nombre} {sucursal?.ciudad ? `• ${sucursal.ciudad}` : ''}
            </p>
          </div>
        </div>

        {/* Reloj Digital & Botones de Control */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-mono font-bold tracking-wider text-cyan-400 flex items-center gap-2">
              <Clock className="w-6 h-6 text-cyan-500" />
              {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
            <button
              onClick={() => {
                if (!audioEnabled) handleEnableAudio();
                else setAudioEnabled(false);
              }}
              title={audioEnabled ? 'Desactivar audio' : 'Activar audio'}
              className={`p-3 rounded-xl transition-all ${
                audioEnabled 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>
            <button
              onClick={toggleFullscreen}
              title="Pantalla Completa"
              className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL EN 2 COLUMNAS (65% LLAMADO ACTUAL - 35% LISTA HISTORIAL) */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8 items-stretch overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: LLAMADO DESTACADO ACTUAL */}
        <div className="col-span-12 lg:col-span-8 flex flex-col justify-center">
          {turnoActual ? (
            <div className={`relative rounded-3xl p-10 border transition-all duration-700 shadow-2xl flex flex-col justify-between min-h-[500px] ${
              isNewCall 
                ? 'bg-gradient-to-br from-cyan-950/90 via-slate-900 to-blue-950/90 border-cyan-400 ring-4 ring-cyan-400/40 animate-pulse' 
                : 'bg-slate-900/90 border-slate-700 shadow-cyan-950/30'
            }`}>
              {/* Badge Superior */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-6 mb-8">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                  </span>
                  <span className="text-sm font-black uppercase tracking-widest text-cyan-300">
                    PACIENTE LLAMADO A CONSULTA
                  </span>
                </div>
                {turnoActual.numero_turno && (
                  <span className="text-2xl font-mono font-black px-4 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-inner">
                    TURNO {turnoActual.numero_turno}
                  </span>
                )}
              </div>

              {/* Nombre Paciente (Texto Gigante) */}
              <div className="my-auto py-4 text-center">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  Nombre del Paciente
                </p>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase drop-shadow-md">
                  {turnoActual.paciente_nombre}
                </h2>
              </div>

              {/* Tarjeta de Destino: Consultorio y Especialista */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-slate-800/80">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-center">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-100 mb-1">
                    DIRIGIRSE A:
                  </span>
                  <span className="text-3xl md:text-4xl font-black tracking-wide drop-shadow">
                    {turnoActual.consultorio}
                  </span>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 flex flex-col justify-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-cyan-400" />
                    Médico Especialista
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {turnoActual.medico_nombre}
                  </span>
                  {turnoActual.especialidad && (
                    <span className="text-sm font-semibold text-cyan-400 mt-0.5">
                      {turnoActual.especialidad}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
              <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6">
                <Bell className="w-12 h-12 text-slate-500 animate-pulse" />
              </div>
              <h3 className="text-3xl font-bold text-slate-300 mb-2">Sala de Espera Activa</h3>
              <p className="text-slate-400 text-lg max-w-md">
                Por favor permanezca atento a esta pantalla. Su nombre y consultorio serán anunciados en breve.
              </p>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: ÚLTIMOS TURNOS LLAMADOS */}
        <div className="col-span-12 lg:col-span-4 flex flex-col">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex-1 flex flex-col shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                Turnos en Atención
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                Últimos llamados
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {ultimosTurnos.length > 0 ? (
                ultimosTurnos.map((turno, idx) => (
                  <div
                    key={turno.id}
                    className={`rounded-2xl p-4 border transition-all flex items-center justify-between ${
                      idx === 0 && turnoActual?.id === turno.id
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-100'
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        {turno.numero_turno && (
                          <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 bg-slate-900 rounded">
                            {turno.numero_turno}
                          </span>
                        )}
                        <h4 className="font-bold text-base truncate text-white uppercase">
                          {turno.paciente_nombre}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {turno.medico_nombre} {turno.especialidad ? `• ${turno.especialidad}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                        {turno.consultorio}
                      </span>
                      <span className="block text-[11px] font-mono text-slate-400 mt-1">
                        {turno.llamado_at}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                  <CheckCircle2 className="w-10 h-10 mb-2 opacity-30" />
                  <span>Aún no hay turnos registrados el día de hoy</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER SMART TV */}
      <footer className="bg-[#0f172a]/90 border-t border-slate-800 px-8 py-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Sincronización en vivo
          </span>
          <span>•</span>
          <span>MediSoftSuite Healthcare TV Display</span>
        </div>
        <div>
          <span>Por favor tenga a mano su documento de identidad y orden médica</span>
        </div>
      </footer>
    </div>
  );
};

export default TurneroPantallaPage;
