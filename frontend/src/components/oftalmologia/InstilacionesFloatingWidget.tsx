import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Eye,
  X,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  Droplets,
  Droplet,
  UserCheck,
  Send,
  MessageCircle,
  Building2,
  Calendar,
  Search,
  Loader2,
  Baby,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { instilacionesApi, type InstilacionOftalmica } from '../../api/instilaciones';
import { medicosApi } from '../../api/medicos';
import { citasApi } from '../../api/citas';
import { pacientesApi } from '../../api/pacientes';
import { oftalmoSound } from '../../lib/oftalmoSounds';
import { API_BASE_URL } from '../../api/client';
import type { Medico, CitaMedica, Paciente } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const FARMACOS_PRESET = [
  { nombre: 'Tropicamida 1%', nota: 'Midriático rápido estándar (~20-30 min)' },
  { nombre: 'Tropicamida 0.8% + Fenilefrina 5%', nota: 'Midriasis máxima sinergística' },
  { nombre: 'Ciclopentolato 1%', nota: 'Cicloplejía / Refracción pediátrica (~30-45 min)' },
  { nombre: 'Fenilefrina 10%', nota: 'Simpaticomimético dilatador potente' },
  { nombre: 'Atropina 1%', nota: 'Cicloplejía profunda y prolongada' },
  { nombre: 'Tetracaína 0.5%', nota: 'Anestésico previo a instilación' },
  { nombre: 'Otro fármaco personalizado', nota: 'Personalizado' },
];

export const InstilacionesFloatingWidget: React.FC = () => {
  const { user, sucursalActiva } = useAuth();
  const currentSucursalId = sucursalActiva?.id || user?.sucursal_defecto_id;

  const [isOpen, setIsOpen] = useState(false);
  const [instilaciones, setInstilaciones] = useState<InstilacionOftalmica[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundActive, setSoundActive] = useState(true);

  // Médicos oftalmólogos disponibles
  const [medicosOftalmologos, setMedicosOftalmologos] = useState<Medico[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isAddDropModalOpen, setIsAddDropModalOpen] = useState(false);
  const [selectedInstilacion, setSelectedInstilacion] = useState<InstilacionOftalmica | null>(null);
  const [nextDropType, setNextDropType] = useState<string>('2da Gota');
  const [dropObservaciones, setDropObservaciones] = useState('');
  const [submittingGota, setSubmittingGota] = useState(false);

  // Formulario Nueva Instilación
  const [citasHoy, setCitasHoy] = useState<CitaMedica[]>([]);
  const [selectedCitaId, setSelectedCitaId] = useState<string>('manual');
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [pacientesResult, setPacientesResult] = useState<Paciente[]>([]);
  const [searchingPacientes, setSearchingPacientes] = useState(false);

  const [newPacienteNombre, setNewPacienteNombre] = useState('');
  const [newPacienteDocumento, setNewPacienteDocumento] = useState('');
  const [newPacienteEdad, setNewPacienteEdad] = useState<number | undefined>(undefined);
  const [newAlergias, setNewAlergias] = useState('');
  const [newMedicoId, setNewMedicoId] = useState<string>('');
  const [newFarmaco, setNewFarmaco] = useState('Tropicamida 1%');
  const [newOjo, setNewOjo] = useState('Ambos');
  const [newEsPediatrico, setNewEsPediatrico] = useState(false);
  const [newTiempoMin, setNewTiempoMin] = useState(25);
  const [newObservaciones, setNewObservaciones] = useState('');
  const [submittingNew, setSubmittingNew] = useState(false);

  // Ticker de 1 segundo para actualizar cronómetros
  const [, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. VERIFICAR AUTORIZACIÓN: Solo Secretaria / Recepción / Admin / Superadmin y Médico Oftalmólogo
  useEffect(() => {
    if (!user) {
      setIsAuthorized(false);
      return;
    }

    if (user.es_superadmin) {
      setIsAuthorized(true);
      return;
    }

    const rolSlug = (user.rol?.slug || '').toLowerCase();
    const rolesStaff = ['recepcion', 'secretaria', 'enfermeria', 'admin-clinica'];
    if (rolesStaff.includes(rolSlug)) {
      setIsAuthorized(true);
      return;
    }

    if (rolSlug === 'medico') {
      // Validar si este médico tiene especialidad Oftalmología
      medicosApi
        .list({ activo: true })
        .then((meds) => {
          const miMedico = meds.find((m) => m.usuario_id === user.id);
          if (miMedico) {
            const espNom = (miMedico.especialidad_nombre || (miMedico as any).especialidad?.nombre || '').toLowerCase();
            const espCod = (miMedico.especialidad_codigo || (miMedico as any).especialidad?.codigo || '').toLowerCase();
            const esOftalmo = espNom.includes('oftalmo') || espCod.includes('oftal');
            setIsAuthorized(esOftalmo);
          } else {
            setIsAuthorized(false);
          }
        })
        .catch(() => setIsAuthorized(false));
      return;
    }

    setIsAuthorized(false);
  }, [user]);

  // 2. Cargar Médicos Oftalmólogos de la Empresa/Sede
  useEffect(() => {
    if (!isAuthorized) return;
    medicosApi
      .list({ activo: true })
      .then((meds) => {
        const oftalmos = meds.filter((m) => {
          const espNom = (m.especialidad_nombre || (m as any).especialidad?.nombre || '').toLowerCase();
          const espCod = (m.especialidad_codigo || (m as any).especialidad?.codigo || '').toLowerCase();
          return espNom.includes('oftalmo') || espCod.includes('oftal');
        });
        setMedicosOftalmologos(oftalmos);
        if (oftalmos.length > 0 && !newMedicoId) {
          // Pre-seleccionar si el usuario logueado es uno de ellos
          const propio = oftalmos.find((m) => m.usuario_id === user?.id);
          setNewMedicoId(propio ? String(propio.id) : String(oftalmos[0].id));
        }
      })
      .catch((err) => console.error('Error cargando oftalmólogos:', err));
  }, [isAuthorized, user]);

  // 3. Cargar Instilaciones de la Sede Actual (Estricto por sede)
  const fetchInstilaciones = useCallback(async () => {
    if (!currentSucursalId || !isAuthorized) return;
    try {
      setLoading(true);
      const data = await instilacionesApi.list(currentSucursalId, true);
      setInstilaciones(data);
    } catch (err) {
      console.error('Error al listar instilaciones oftálmicas:', err);
    } finally {
      setLoading(false);
    }
  }, [currentSucursalId, isAuthorized]);

  useEffect(() => {
    fetchInstilaciones();
  }, [fetchInstilaciones]);

  // 4. WebSocket para Notificaciones en Tiempo Real y Sonido Bip
  useEffect(() => {
    if (!user || !currentSucursalId || !isAuthorized) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsUrlStr = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsUrlStr}/chat/ws?token=${token}&sucursal_id=${currentSucursalId}`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'instilacion_oftalmica_actualizada') {
              // Sonar Bip Clínico
              oftalmoSound.playInstilacionBeep();

              // Mostrar alerta visual
              if (data.tipo_evento === 'gota_aplicada') {
                toast.info(
                  `👁️ ${data.paciente_nombre} ha sido instilado (${data.tipo_gota}) por ${data.quien_instilo}.`,
                  {
                    description: `Fármaco: ${data.farmaco || ''} (${data.ojo || ''}) • Hora: ${data.hora || ''}`,
                    duration: 6000,
                  }
                );
              }

              // Recargar listado en vivo
              fetchInstilaciones();
            }
          } catch (e) {
            // No-op
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 8000);
        };
      } catch (err) {
        // Fallback silencioso
      }
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, currentSucursalId, isAuthorized, fetchInstilaciones]);

  // Cargar citas de hoy cuando se abre el modal de registro
  useEffect(() => {
    if (isNewModalOpen && currentSucursalId) {
      const hoyStr = new Date().toISOString().split('T')[0];
      citasApi
        .list({
          sucursal_id: currentSucursalId,
          fecha_inicio: hoyStr,
          fecha_fin: hoyStr,
        })
        .then((citas) => {
          // Filtrar o mostrar todas las citas del día en la sede
          setCitasHoy(citas);
        })
        .catch(() => {});
    }
  }, [isNewModalOpen, currentSucursalId]);

  // Selección de cita del día para auto-llenar
  const handleSelectCita = (val: string) => {
    setSelectedCitaId(val);
    if (val === 'manual') {
      setNewPacienteNombre('');
      setNewPacienteDocumento('');
      setNewPacienteEdad(undefined);
      setNewAlergias('');
      return;
    }
    const cita = citasHoy.find((c) => String(c.id) === val);
    if (cita) {
      setNewPacienteNombre(cita.paciente_nombre || '');
      setNewPacienteDocumento(cita.paciente_documento || '');
      if (cita.medico_id) {
        setNewMedicoId(String(cita.medico_id));
      }
      // Consultar edad y alergias si tiene paciente_id
      if (cita.paciente_id) {
        pacientesApi
          .getById(cita.paciente_id)
          .then((p) => {
            if (p.edad) {
              setNewPacienteEdad(p.edad);
              setNewEsPediatrico(p.edad < 12);
              if (p.edad < 12) setNewFarmaco('Ciclopentolato 1%');
            }
            if (p.alergias) {
              const alTxt = Array.isArray(p.alergias)
                ? p.alergias.join(', ')
                : String(p.alergias);
              setNewAlergias(alTxt);
            }
          })
          .catch(() => {});
      }
    }
  };

  // Buscar paciente si es ingreso manual
  const handleSearchPaciente = async (q: string) => {
    setPacienteSearch(q);
    if (q.trim().length < 2) {
      setPacientesResult([]);
      return;
    }
    try {
      setSearchingPacientes(true);
      const res = await pacientesApi.list({ q, limit: 6 });
      setPacientesResult(res);
    } catch {
      // Ignorar
    } finally {
      setSearchingPacientes(false);
    }
  };

  const handlePickPacienteSearchResult = (p: Paciente) => {
    setNewPacienteNombre(`${p.nombres} ${p.apellidos}`.trim());
    setNewPacienteDocumento(p.documento_identidad || '');
    if (p.edad) {
      setNewPacienteEdad(p.edad);
      setNewEsPediatrico(p.edad < 12);
      if (p.edad < 12) setNewFarmaco('Ciclopentolato 1%');
    }
    if (p.alergias) {
      const alTxt = Array.isArray(p.alergias) ? p.alergias.join(', ') : String(p.alergias);
      setNewAlergias(alTxt);
    }
    setPacientesResult([]);
    setPacienteSearch('');
  };

  // Crear 1ra Instilación
  const handleCreateInstilacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursalId) {
      toast.error('No se ha detectado una sucursal activa.');
      return;
    }
    if (!newPacienteNombre.trim()) {
      toast.error('Indique el nombre del paciente a instilar.');
      return;
    }

    try {
      setSubmittingNew(true);
      const medObj = medicosOftalmologos.find((m) => String(m.id) === newMedicoId);
      const quien = `${user?.nombre || 'Personal'} ${user?.apellido || 'Clínico'}`.trim();

      await instilacionesApi.create({
        sucursal_id: currentSucursalId,
        paciente_nombre: newPacienteNombre.trim(),
        paciente_documento: newPacienteDocumento || undefined,
        paciente_edad: newPacienteEdad,
        alergias: newAlergias || undefined,
        medico_id: newMedicoId ? parseInt(newMedicoId, 10) : undefined,
        medico_nombre: medObj ? `Dr(a). ${medObj.nombres} ${medObj.apellidos}` : undefined,
        tipo: 'Midriática',
        farmaco: newFarmaco,
        ojo: newOjo,
        es_pediatrico: newEsPediatrico,
        quien_instilo: quien,
        observaciones: newObservaciones || undefined,
        tiempo_recomendado_min: newTiempoMin,
      });

      oftalmoSound.playInstilacionBeep();
      toast.success(
        `1ª Gota registrada para ${newPacienteNombre}. Se ha notificado al médico oftalmólogo por chat y WhatsApp.`
      );

      setIsNewModalOpen(false);
      resetNewForm();
      fetchInstilaciones();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al registrar instilación.');
    } finally {
      setSubmittingNew(false);
    }
  };

  const resetNewForm = () => {
    setSelectedCitaId('manual');
    setNewPacienteNombre('');
    setNewPacienteDocumento('');
    setNewPacienteEdad(undefined);
    setNewAlergias('');
    setNewFarmaco('Tropicamida 1%');
    setNewOjo('Ambos');
    setNewEsPediatrico(false);
    setNewObservaciones('');
  };

  // Abrir Modal para Siguiente Gota o Refuerzo
  const handleOpenAddDrop = (inst: InstilacionOftalmica, tipoSugerido?: string) => {
    setSelectedInstilacion(inst);
    const n = (inst.total_gotas || 1) + 1;
    if (tipoSugerido) {
      setNextDropType(tipoSugerido);
    } else if (n === 2) {
      setNextDropType('2da Gota');
    } else if (n === 3) {
      setNextDropType('3ra Gota');
    } else {
      setNextDropType('Gota Refuerzo');
    }
    setDropObservaciones('');
    setIsAddDropModalOpen(true);
  };

  // Confirmar Siguiente Gota
  const handleConfirmAddDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstilacion) return;

    try {
      setSubmittingGota(true);
      const quien = `${user?.nombre || 'Personal'} ${user?.apellido || 'Clínico'}`.trim();
      await instilacionesApi.addGota(selectedInstilacion.id, {
        tipo_gota: nextDropType,
        quien_instilo: quien,
        observaciones: dropObservaciones || undefined,
      });

      oftalmoSound.playInstilacionBeep();
      toast.success(
        `${nextDropType} registrada exitosamente para ${selectedInstilacion.paciente_nombre}. Notificación despachada al doctor.`
      );

      setIsAddDropModalOpen(false);
      fetchInstilaciones();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al aplicar gota adicional.');
    } finally {
      setSubmittingGota(false);
    }
  };

  // Cambiar Estado (Marcar listo / Finalizar)
  const handleChangeEstado = async (inst: InstilacionOftalmica, nuevoEstado: any) => {
    try {
      await instilacionesApi.updateEstado(inst.id, nuevoEstado);
      if (nuevoEstado === 'dilatado_listo') {
        oftalmoSound.playInstilacionBeep();
        toast.success(`${inst.paciente_nombre} marcado como LISTO para fondo de ojo.`);
      } else {
        toast.info(`Instilación de ${inst.paciente_nombre} actualizada.`);
      }
      fetchInstilaciones();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al cambiar estado.');
    }
  };

  // Cálculo de tiempo transcurrido
  const formatTimer = (inst: InstilacionOftalmica) => {
    const primeraGota = inst.gotas?.[0];
    const ts = primeraGota?.timestamp || (inst.created_at ? new Date(inst.created_at).getTime() : Date.now());
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    const targetMin = inst.tiempo_recomendado_min || 25;
    const isReady = m >= targetMin;

    return {
      elapsedText: `${m}m ${s < 10 ? '0' : ''}${s}s`,
      minutos: m,
      targetMin,
      isReady,
      percent: Math.min(100, Math.round((m / targetMin) * 100)),
    };
  };

  // Filtros de activas
  const activasCount = useMemo(() => {
    return instilaciones.filter((i) => i.estado === 'en_espera' || i.estado === 'dilatado_listo').length;
  }, [instilaciones]);

  // Si no está autorizado, no renderizar nada
  if (isAuthorized === false || isAuthorized === null) {
    return null;
  }

  return (
    <>
      {/* ══ BOTÓN LATERAL FLOTANTE DEBAJO DEL CHAT (IMAGEN 2) ═══════════════ */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-[calc(50%+5.7rem)] -translate-y-1/2 z-40 flex h-10 w-10 items-center justify-center rounded-l-md bg-teal-600 hover:bg-teal-700 text-white shadow-xl border-l border-t border-b border-white/20 focus:outline-none cursor-pointer transition-all hover:pr-1 group"
        title={isOpen ? 'Cerrar Instilaciones Oftálmicas' : 'Control de Dilatación Oftálmica'}
        aria-label="Instilaciones Oftálmicas"
      >
        {isOpen ? (
          <X className="size-5 transition-transform group-hover:rotate-90" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Eye className="size-5 group-hover:scale-110 transition-transform" />
            <Droplet className="size-2.5 text-cyan-200 absolute -bottom-1 -right-1" />
          </div>
        )}

        {/* Badge con conteo de pacientes dilatando */}
        {activasCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center px-1 rounded-full bg-cyan-500 text-[10px] font-black text-white shadow-md animate-pulse border-2 border-background">
            {activasCount}
          </span>
        )}
      </button>

      {/* ══ PANEL FLOTANTE DE INSTILACIONES ═════════════════════════════════ */}
      {isOpen && (
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-12 z-50 w-[calc(100vw-1.5rem)] sm:w-[440px] h-[600px] max-h-[calc(100dvh-5rem)] bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          
          {/* Header del Panel */}
          <div className="bg-teal-600 text-white p-3.5 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold truncate leading-tight flex items-center gap-1.5">
                  Dilatación Oftálmica
                  <span className="text-[10px] bg-teal-700/80 px-1.5 py-0.5 rounded-full font-mono text-cyan-200">
                    Sede
                  </span>
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-teal-100 truncate mt-0.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{sucursalActiva?.nombre || 'Sede Actual'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  const next = !soundActive;
                  setSoundActive(next);
                  oftalmoSound.enabled = next;
                  if (next) oftalmoSound.playInstilacionBeep();
                }}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full cursor-pointer"
                title={soundActive ? 'Silenciar bip de alertas' : 'Activar bip de alertas'}
              >
                {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-white/60" />}
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={fetchInstilaciones}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full cursor-pointer"
                title="Actualizar lista"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full cursor-pointer"
                title="Cerrar panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Barra de Acciones y Estadísticas */}
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                {activasCount} en proceso
              </span>
              <span className="text-muted-foreground text-[10px]">•</span>
              <span className="text-[11px] text-muted-foreground">
                Recomendado: 20-30 min
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsNewModalOpen(true)}
              className="h-7 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Instilación
            </Button>
          </div>

          {/* Listado de Pacientes en Dilatación */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loading && instilaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span>Cargando instilaciones de la sede...</span>
              </div>
            ) : instilaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-center text-muted-foreground p-4">
                <div className="h-12 w-12 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mb-2">
                  <Droplets className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-foreground">No hay pacientes dilatando</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
                  Cuando la secretaria o asistente instile a un paciente, aparecerá aquí con su temporizador y el doctor será notificado.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNewModalOpen(true)}
                  className="mt-3 text-xs text-teal-600 border-teal-300 dark:border-teal-800"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Registrar 1ª Gota
                </Button>
              </div>
            ) : (
              instilaciones.map((inst) => {
                const timer = formatTimer(inst);
                const isListo = inst.estado === 'dilatado_listo' || timer.isReady;

                return (
                  <div
                    key={inst.id}
                    className={cn(
                      "p-3 rounded-xl border transition-all text-xs relative overflow-hidden",
                      isListo
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 shadow-xs"
                        : "bg-card border-border hover:border-teal-300 dark:hover:border-teal-800"
                    )}
                  >
                    {/* Barra de progreso de dilatación superior */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-1000",
                          isListo ? "bg-emerald-500" : "bg-teal-500"
                        )}
                        style={{ width: `${timer.percent}%` }}
                      />
                    </div>

                    {/* Cabecera del Paciente */}
                    <div className="flex items-start justify-between gap-2 pt-0.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground text-[13px] truncate">
                            {inst.paciente_nombre}
                          </span>
                          {inst.es_pediatrico && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              <Baby className="h-2.5 w-2.5 mr-0.5" /> Pediátrico
                            </Badge>
                          )}
                          {inst.paciente_edad !== undefined && inst.paciente_edad !== null && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({inst.paciente_edad} años)
                            </span>
                          )}
                        </div>

                        {inst.alergias && (
                          <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                            <ShieldAlert className="h-3 w-3 shrink-0" />
                            <span className="truncate">Alergias: {inst.alergias}</span>
                          </div>
                        )}

                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                          <span className="text-teal-700 dark:text-teal-400 font-medium">{inst.farmaco}</span>
                          <span>•</span>
                          <span>{inst.ojo === 'Ambos' ? 'Ambos Ojos (AO)' : inst.ojo}</span>
                          {inst.medico_nombre && (
                            <>
                              <span>•</span>
                              <span className="truncate text-foreground font-medium">{inst.medico_nombre}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Temporizador en Vivo */}
                      <div className="shrink-0 text-right">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold text-[11px]",
                            isListo
                              ? "bg-emerald-600 text-white animate-pulse"
                              : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{timer.elapsedText}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          Meta: {timer.targetMin} min
                        </div>
                      </div>
                    </div>

                    {/* Historial de Gotas */}
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium mr-1">
                        Gotas ({inst.total_gotas || 1}):
                      </span>
                      {(inst.gotas || []).map((g, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-foreground border border-border/80 font-mono"
                          title={`Aplicado a las ${g.hora} por ${g.quien_instilo}`}
                        >
                          <Droplet className="h-2.5 w-2.5 text-teal-600" />
                          {g.tipo_gota || `Gota ${g.numero}`} ({g.hora?.slice(0, 5)})
                        </span>
                      ))}

                      {/* Indicadores de Envío */}
                      <div className="ml-auto flex items-center gap-1 text-[10px]">
                        {inst.notificado_chat && (
                          <span className="text-emerald-600 flex items-center gap-0.5" title="Notificado al chat interno">
                            <MessageCircle className="h-3 w-3" /> Chat ✓
                          </span>
                        )}
                        {inst.notificado_whatsapp && (
                          <span className="text-green-600 flex items-center gap-0.5" title="WhatsApp enviado al médico">
                            <Send className="h-3 w-3" /> WA ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botonera de Acciones de Gota y Estado */}
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        {/* Botón para siguiente gota */}
                        {inst.total_gotas === 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAddDrop(inst, '2da Gota')}
                            className="h-6 text-[10px] px-2 text-teal-700 border-teal-300 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950 cursor-pointer"
                          >
                            + 2da Gota
                          </Button>
                        )}
                        {inst.total_gotas === 2 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAddDrop(inst, '3ra Gota')}
                            className="h-6 text-[10px] px-2 text-teal-700 border-teal-300 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950 cursor-pointer"
                          >
                            + 3ra Gota
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenAddDrop(inst, 'Gota Refuerzo')}
                          className="h-6 text-[10px] px-1.5 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                        >
                          + Refuerzo
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        {inst.estado === 'en_espera' ? (
                          <Button
                            size="sm"
                            onClick={() => handleChangeEstado(inst, 'dilatado_listo')}
                            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                          >
                            ✓ Listo para Pasar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChangeEstado(inst, 'finalizado')}
                            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Finalizar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL DE REGISTRO: NUEVA INSTILACIÓN ════════════════════════════ */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 duration-150">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col">
            <div className="p-4 bg-teal-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Registrar Instilación Oftálmica (1ª Gota)</h3>
                  <p className="text-[11px] text-teal-100">
                    Notificará de inmediato al doctor asignado vía chat y WhatsApp
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setIsNewModalOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateInstilacion} className="p-4 overflow-y-auto space-y-3.5 text-xs">
              {/* Opción 1: Seleccionar de Citas de Hoy */}
              {citasHoy.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Citas del Día en Oftalmología (Selección rápida)
                  </Label>
                  <Select value={selectedCitaId} onValueChange={handleSelectCita}>
                    <SelectTrigger className="w-full mt-1 h-8 text-xs">
                      <SelectValue placeholder="Seleccionar de agenda del día..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">-- Escribir o buscar manualmente --</SelectItem>
                      {citasHoy.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.hora_inicio} - {c.paciente_nombre} ({c.medico_nombre || 'Sin doctor'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Si es manual: Búsqueda rápida de paciente */}
              {selectedCitaId === 'manual' && (
                <div className="relative">
                  <Label className="text-xs font-semibold">Buscar Paciente en Base de Datos</Label>
                  <div className="relative mt-1">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Escribe cédula o nombre del paciente..."
                      value={pacienteSearch}
                      onChange={(e) => handleSearchPaciente(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                    {searchingPacientes && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin absolute right-2.5 top-2.5 text-teal-600" />
                    )}
                  </div>

                  {pacientesResult.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto p-1">
                      {pacientesResult.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handlePickPacienteSearchResult(p)}
                          className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-xs flex items-center justify-between"
                        >
                          <span className="font-medium text-foreground">
                            {p.nombres} {p.apellidos}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {p.documento_identidad || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Datos del Paciente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Nombre Completo del Paciente *</Label>
                  <Input
                    required
                    placeholder="Ej. Juan Pérez"
                    value={newPacienteNombre}
                    onChange={(e) => setNewPacienteNombre(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Documento / Cédula</Label>
                  <Input
                    placeholder="Ej. V-18234567"
                    value={newPacienteDocumento}
                    onChange={(e) => setNewPacienteDocumento(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Edad (Años)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    placeholder="Ej. 45"
                    value={newPacienteEdad ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      setNewPacienteEdad(val);
                      if (val !== undefined) {
                        setNewEsPediatrico(val < 12);
                        if (val < 12) setNewFarmaco('Ciclopentolato 1%');
                      }
                    }}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Alergias Conocidas</Label>
                  <Input
                    placeholder="Ej. Ninguna o Alérgico a sulfas"
                    value={newAlergias}
                    onChange={(e) => setNewAlergias(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Médico Oftalmólogo Destinatario */}
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Médico Oftalmólogo Responsable *
                </Label>
                <Select value={newMedicoId} onValueChange={setNewMedicoId}>
                  <SelectTrigger className="w-full mt-1 h-8 text-xs">
                    <SelectValue placeholder="Seleccionar doctor oftalmólogo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicosOftalmologos.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        Dr(a). {m.nombres} {m.apellidos} ({m.telefono || 'Sin teléfono'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fármaco y Ojo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Fármaco de Dilatación</Label>
                  <Select value={newFarmaco} onValueChange={setNewFarmaco}>
                    <SelectTrigger className="w-full mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FARMACOS_PRESET.map((f) => (
                        <SelectItem key={f.nombre} value={f.nombre}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Ojo a Instilar</Label>
                  <Select value={newOjo} onValueChange={setNewOjo}>
                    <SelectTrigger className="w-full mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ambos">Ambos Ojos (AO)</SelectItem>
                      <SelectItem value="Derecho">Ojo Derecho (OD)</SelectItem>
                      <SelectItem value="Izquierdo">Ojo Izquierdo (OI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Opciones Adicionales */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1">
                    <Baby className="h-3.5 w-3.5 text-sky-500" /> Protocolo Pediátrico
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Ajusta los tiempos de latencia y fármacos de refracción infantil.
                  </p>
                </div>
                <Switch checked={newEsPediatrico} onCheckedChange={setNewEsPediatrico} />
              </div>

              <div>
                <Label className="text-xs font-semibold">Observaciones Clínicas de la Aplicación</Label>
                <Textarea
                  placeholder="Consigne si hubo ardor, poca tolerancia, lagrimeo o condiciones previas..."
                  value={newObservaciones}
                  onChange={(e) => setNewObservaciones(e.target.value)}
                  className="h-16 text-xs mt-1"
                />
              </div>

              {/* Botones */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsNewModalOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingNew}
                  className="h-8 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs cursor-pointer shadow-xs gap-1.5"
                >
                  {submittingNew ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Droplet className="h-3.5 w-3.5" />
                  )}
                  Instilar 1ª Gota y Notificar Médico
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL PARA AGREGAR 2DA, 3RA O GOTA DE REFUERZO ══════════════════ */}
      {isAddDropModalOpen && selectedInstilacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 duration-150">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 bg-teal-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Droplets className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Aplicar Gota Adicional</h3>
                  <p className="text-[11px] text-teal-100">{selectedInstilacion.paciente_nombre}</p>
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setIsAddDropModalOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleConfirmAddDrop} className="p-4 space-y-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">Tipo de Gota a Registrar *</Label>
                <Select value={nextDropType} onValueChange={setNextDropType}>
                  <SelectTrigger className="w-full mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2da Gota">2da Gota (Segunda Gota)</SelectItem>
                    <SelectItem value="3ra Gota">3ra Gota (Tercera Gota)</SelectItem>
                    <SelectItem value="Gota Refuerzo">Gota de Refuerzo (Midriasis Lenta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/60 border border-border space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fármaco:</span>
                  <span className="font-semibold">{selectedInstilacion.farmaco}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ojo:</span>
                  <span className="font-semibold">{selectedInstilacion.ojo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gotas Previas:</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400 font-mono">
                    {selectedInstilacion.total_gotas || 1}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Nota u Observación (Opcional)</Label>
                <Textarea
                  placeholder="Ej. Pupila poco reactiva, se aplica refuerzo..."
                  value={dropObservaciones}
                  onChange={(e) => setDropObservaciones(e.target.value)}
                  className="h-16 text-xs mt-1"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddDropModalOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingGota}
                  className="h-8 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs cursor-pointer shadow-xs gap-1.5"
                >
                  {submittingGota ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Instilar y Notificar al Médico
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default InstilacionesFloatingWidget;
