import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CircleDollarSign,
  Plus,
  Trash2,
  Wallet,
  LockOpen,
  Lock,
  Receipt,
  User,
  CreditCard,
  Coins,
  CheckCircle2,
  Sparkles,
  Stethoscope,
  FileCheck,
  Clock,
  Activity,
  Search,
  ShoppingCart,
  Minus,
  X,
  Maximize2,
  Minimize2,
  History,
  Eye,
  AlertCircle,
  Printer,
  CalendarCheck,
  Volume2,
  VolumeX,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Smartphone,
  ShieldCheck,
  Percent,
  Phone,
  Users,
  LayoutGrid,
  Table2,
  Play,
  Settings2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  cajasApi,
  type Caja,
  type TurnoCaja,
  type Cobro,
  type CobroDetalleItem,
  type CobroPagoItem,
} from '../../api/cajas';
import { tasasApi, type TasasActualesResponse } from '../../api/tasas';
import { pacientesApi } from '../../api/pacientes';
import { serviciosApi } from '../../api/servicios';
import medicosApi from '../../api/medicos';
import { citasApi } from '../../api/citas';
import { consultasApi, type ConsultaMedica } from '../../api/consultas';
import { TurnoAperturaModal } from '../../components/facturacion/TurnoAperturaModal';
import { TurnoCierreModal } from '../../components/facturacion/TurnoCierreModal';
import { CorteCajaTicketModal } from '../../components/facturacion/CorteCajaTicketModal';
import { CobroReciboModal } from '../../components/facturacion/CobroReciboModal';
import {
  loadPosPrinterConfig,
  type PosPrinterConfig,
} from '../../components/facturacion/pos/posPrinterConfig';
import { PosPaymentModal } from '../../components/facturacion/pos/PosPaymentModal';
import {
  PosCatalogSearchModal,
  PosPriceVerifierModal,
  PosCustomConceptModal,
  PosHoldTicketModal,
  PosRecentSalesModal,
  PosPrinterConfigModal,
  PosExchangeRateModal,
} from '../../components/facturacion/pos/PosModals';
import { PatientFormModal } from '../clinica/PatientFormModal';
import { posSound } from '../../lib/posSounds';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import type { Paciente, Servicio, Medico, CitaMedica } from '../../types';

// ==========================================
// Estructuras del Terminal POS (Estilo FixSale adaptado a MediSoft)
// ==========================================
interface PosTicket {
  id: string;
  name: string;
  pacienteId: string;
  medicoId: string;
  citaId: string;
  consultaId: string;
  detalles: CobroDetalleItem[];
  descuentoDivisa: number;
  notasCobro: string;
  autoLoadedInfo?: {
    citaId: number;
    servicioNombre: string;
    precio: number;
    medicoNombre?: string;
  } | null;
}

interface HeldPosTicket extends PosTicket {
  heldAt: string;
  holdNote: string;
}

type PredictiveSuggestion =
  | { kind: 'cita'; cita: CitaMedica }
  | { kind: 'servicio'; servicio: Servicio };

const STORAGE_TICKETS_KEY = 'medisoft_pos_tickets_v2';
const STORAGE_ACTIVE_TICKET_KEY = 'medisoft_pos_active_ticket_id_v2';
const STORAGE_HELD_TICKETS_KEY = 'medisoft_pos_held_tickets_v1';
const STORAGE_SOUND_KEY = 'medisoft_pos_sound_enabled';
const STORAGE_CATALOG_PANEL_KEY = 'medisoft_pos_show_catalog_panel';

const formatBs = (val: number) =>
  `Bs. ${(Number.isFinite(val) ? val : 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const PuntoCobroPage: React.FC = () => {
  const { sucursalActiva } = useAuth();
  const currentSucursalId = sucursalActiva?.id || 1;
  const navigate = useNavigate();

  // Estado de Cajas y Turno Activo
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [turnoActivo, setTurnoActivo] = useState<TurnoCaja | null>(null);
  const [loadingTurno, setLoadingTurno] = useState(true);

  // Configuración de Ticketera Térmica (80mm / 58mm, Auto-Print, Mensajes)
  const [printerConfig, setPrinterConfig] = useState<PosPrinterConfig>(() =>
    loadPosPrinterConfig()
  );
  const [isPrinterConfigOpen, setIsPrinterConfigOpen] = useState(false);
  const [autoTriggerPrint, setAutoTriggerPrint] = useState(false);

  // Modales de Turno y Recibo Térmico (100% en Bolívares)
  const [aperturaModalOpen, setAperturaModalOpen] = useState(false);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [reciboModalOpen, setReciboModalOpen] = useState(false);
  const [ultimoCobro, setUltimoCobro] = useState<Cobro | null>(null);

  // Modal de Cobro Inteligente (FixSale Style)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preferredSubmitMode, setPreferredSubmitMode] = useState<'ticket' | 'solo_cobrar'>(
    'ticket'
  );
  const [submittingCobro, setSubmittingCobro] = useState(false);

  // Modales de Función POS ([F10], [F9], [INS], [F6], [F5], [F4], Tasa BCV)
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isVerifierModalOpen, setIsVerifierModalOpen] = useState(false);
  const [isCustomConceptOpen, setIsCustomConceptOpen] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [syncingRates, setSyncingRates] = useState(false);

  // Búsqueda Rápida de Pacientes [F6] y Paciente Exprés
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  // Historial de Últimos Cobros [F4]
  const [isRecentCobrosOpen, setIsRecentCobrosOpen] = useState(false);
  const [recentCobros, setRecentCobros] = useState<Cobro[]>([]);
  const [loadingRecentCobros, setLoadingRecentCobros] = useState(false);

  // Movimientos Extraordinarios de Caja (+/- Efectivo) y Comprobante de Corte Z
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<'egreso' | 'ingreso'>('egreso');
  const [movCategoria, setMovCategoria] = useState<string>('Gasto Operacional');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMoneda, setMovMoneda] = useState<'USD' | 'VES' | 'EUR'>('VES');
  const [movMonto, setMovMonto] = useState<number | ''>('');
  const [submittingMovimiento, setSubmittingMovimiento] = useState(false);

  const [corteTicketOpen, setCorteTicketOpen] = useState(false);
  const [corteTicketTurno, setCorteTicketTurno] = useState<TurnoCaja | null>(null);
  const [corteTicketAutoPrint, setCorteTicketAutoPrint] = useState(false);

  // Modo Kiosco [F2] y Panel Táctil Opcional
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [showTactileCatalog, setShowTactileCatalog] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CATALOG_PANEL_KEY);
      return saved ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const toggleCatalogPanel = () => {
    setShowTactileCatalog((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_CATALOG_PANEL_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Sonidos POS
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SOUND_KEY);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    posSound.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    posSound.enabled = next;
    try {
      localStorage.setItem(STORAGE_SOUND_KEY, String(next));
    } catch {}
    if (next) {
      posSound.playBeep();
      toast.success('Sonidos del terminal POS activados');
    } else {
      toast.info('Terminal POS silenciada');
    }
  };

  // Tasas Oficiales BCV y Maestros Clínicos
  const [ratesData, setRatesData] = useState<TasasActualesResponse | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [todayPendingCitas, setTodayPendingCitas] = useState<CitaMedica[]>([]);

  // Datos Clínicos del Paciente Seleccionado
  const [citasPacientePendientes, setCitasPacientePendientes] = useState<CitaMedica[]>([]);
  const [consultasFinalizadas, setConsultasFinalizadas] = useState<ConsultaMedica[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState('todos');

  // Barra Escáner / Búsqueda Predictiva Estilo FixSale
  const [scannerQuery, setScannerQuery] = useState('');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // Pestañas Multi-Ticket + Cobros en Espera (Anti-F5)
  // ==========================================
  const [tickets, setTickets] = useState<PosTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TICKETS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'ticket-1',
        name: 'Ticket 1',
        pacienteId: '',
        medicoId: '',
        citaId: '',
        consultaId: '',
        detalles: [],
        descuentoDivisa: 0,
        notasCobro: '',
        autoLoadedInfo: null,
      },
    ];
  });

  const [activeTicketId, setActiveTicketId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_ACTIVE_TICKET_KEY) || 'ticket-1';
    } catch {
      return 'ticket-1';
    }
  });

  const [heldTickets, setHeldTickets] = useState<HeldPosTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HELD_TICKETS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(tickets));
      localStorage.setItem(STORAGE_ACTIVE_TICKET_KEY, activeTicketId);
    } catch {}
  }, [tickets, activeTicketId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HELD_TICKETS_KEY, JSON.stringify(heldTickets));
    } catch {}
  }, [heldTickets]);

  const activeTicket = useMemo(() => {
    return (
      tickets.find((t) => t.id === activeTicketId) ||
      tickets[0] || {
        id: 'ticket-1',
        name: 'Ticket 1',
        pacienteId: '',
        medicoId: '',
        citaId: '',
        consultaId: '',
        detalles: [],
        descuentoDivisa: 0,
        notasCobro: '',
        autoLoadedInfo: null,
      }
    );
  }, [tickets, activeTicketId]);

  const updateActiveTicket = useCallback(
    (updates: Partial<PosTicket>) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === activeTicketId ? { ...t, ...updates } : t))
      );
    },
    [activeTicketId]
  );

  // Cobertura de Seguro y Pagos del Modal de Cobro
  const [tieneSeguro, setTieneSeguro] = useState(false);
  const [seguroNombre, setSeguroNombre] = useState('Seguros Caracas');
  const [seguroPorcentaje, setSeguroPorcentaje] = useState(80);
  const [pagos, setPagos] = useState<CobroPagoItem[]>([
    {
      metodo: 'pago_movil',
      moneda: 'VES',
      monto_moneda_origen: 0,
      banco_origen: '',
      referencia: '',
      notas: '',
    },
  ]);

  // Carga inicial de datos maestros + citas pendientes del día
  const refreshTodayPendingCitas = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const citasHoy = await citasApi.list({
        fecha_inicio: todayStr,
        fecha_fin: todayStr,
        sucursal_id: currentSucursalId,
      });
      const pending = (citasHoy || []).filter(
        (c) => c.estado_pago === 'pendiente' && c.estado !== 'cancelada'
      );
      setTodayPendingCitas(pending);
    } catch {
      // Silencioso en caso de fallo de red secundario
    }
  }, [currentSucursalId]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingTurno(true);
      const todayStr = new Date().toISOString().slice(0, 10);
      const [cajasRes, turnoRes, ratesRes, servRes, medRes, pacRes, citasHoyRes] =
        await Promise.all([
          cajasApi.listCajas(currentSucursalId),
          cajasApi.getActiveTurno(),
          tasasApi.getCurrentRates(),
          serviciosApi.list({ activo: true }),
          medicosApi.list(),
          pacientesApi.list(),
          citasApi
            .list({
              fecha_inicio: todayStr,
              fecha_fin: todayStr,
              sucursal_id: currentSucursalId,
            })
            .catch(() => []),
        ]);

      setCajas(cajasRes || []);
      setTurnoActivo(turnoRes || null);
      setRatesData(ratesRes || null);
      setServicios(servRes || []);
      setMedicos(medRes || []);
      setPacientes(pacRes || []);
      setTodayPendingCitas(
        (citasHoyRes || []).filter(
          (c) => c.estado_pago === 'pendiente' && c.estado !== 'cancelada'
        )
      );
    } catch (err) {
      console.error('Error cargando datos iniciales del POS:', err);
      toast.error('Error al inicializar la terminal de cobro');
    } finally {
      setLoadingTurno(false);
    }
  }, [currentSucursalId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Cerrar dropdown predictivo al hacer clic afuera
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        scannerContainerRef.current &&
        !scannerContainerRef.current.contains(e.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Tasa Oficial BCV activa
  const monedaReferencia: 'USD' | 'EUR' = ratesData?.moneda_cobro_activa || 'USD';
  const refSym = monedaReferencia === 'EUR' ? '€' : '$';
  const tasaActiva = useMemo(() => {
    if (!ratesData) return 1.0;
    if (ratesData.tasa_cobro_activa && ratesData.tasa_cobro_activa > 0) {
      return ratesData.tasa_cobro_activa;
    }
    const detail = ratesData.tasas?.[ratesData.moneda_cobro_activa];
    return detail?.tasa && detail.tasa > 0 ? detail.tasa : 1.0;
  }, [ratesData]);

  const handleSyncRates = async () => {
    try {
      setSyncingRates(true);
      await tasasApi.syncRates();
      const updated = await tasasApi.getCurrentRates();
      setRatesData(updated);
      posSound.playSuccess();
      toast.success('Tasa Oficial BCV sincronizada exitosamente');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo sincronizar la tasa con BCV');
    } finally {
      setSyncingRates(false);
    }
  };

  // ==========================================
  // Selección de Paciente y Auto-Carga Clínica
  // ==========================================
  const loadClinicalContextForPatient = useCallback(
    async (pacienteIdNum: number) => {
      try {
        const [citasRes, consultasRes] = await Promise.all([
          citasApi.list({ paciente_id: pacienteIdNum }),
          consultasApi.getConsultas({ paciente_id: pacienteIdNum, estado: 'finalizada' }),
        ]);
        setConsultasFinalizadas(consultasRes || []);
        const pendingCitas = (citasRes || []).filter(
          (c) => c.estado_pago === 'pendiente' && c.estado !== 'cancelada'
        );
        setCitasPacientePendientes(pendingCitas);
        return pendingCitas;
      } catch {
        setConsultasFinalizadas([]);
        setCitasPacientePendientes([]);
        return [];
      }
    },
    []
  );

  useEffect(() => {
    if (activeTicket.pacienteId) {
      loadClinicalContextForPatient(parseInt(activeTicket.pacienteId, 10));
    } else {
      setCitasPacientePendientes([]);
      setConsultasFinalizadas([]);
    }
  }, [activeTicket.pacienteId, loadClinicalContextForPatient]);

  const handleLoadCitaIntoTicket = useCallback(
    (targetCita: CitaMedica) => {
      posSound.playBeep();
      const pac = pacientes.find((p) => p.id === targetCita.paciente_id);
      const shortName = pac
        ? `${pac.nombres.split(' ')[0]} ${pac.apellidos ? pac.apellidos[0] + '.' : ''}`.trim()
        : targetCita.paciente_nombre?.split(' ')[0] || 'Ticket';

      const servFound = servicios.find((s) => s.id === targetCita.servicio_id);
      const servNombre =
        servFound?.nombre || targetCita.servicio_nombre || 'Consulta Médica Especializada';
      const precioUnit = Number(targetCita.precio_estimado || servFound?.precio_base || 30.0);
      const tipo = (servFound?.categoria || '').toLowerCase().includes('odont')
        ? 'odontologia'
        : 'consulta';

      const autoItem: CobroDetalleItem = {
        servicio_id: targetCita.servicio_id || servFound?.id || null,
        tipo_concepto: tipo,
        descripcion: servNombre,
        cantidad: 1,
        precio_unitario_divisa: precioUnit,
        diente_fdi: null,
      };

      updateActiveTicket({
        pacienteId: String(targetCita.paciente_id),
        name: shortName,
        citaId: String(targetCita.id),
        medicoId: targetCita.medico_id ? String(targetCita.medico_id) : '',
        detalles: [autoItem],
        autoLoadedInfo: {
          citaId: targetCita.id,
          servicioNombre: servNombre,
          precio: precioUnit,
          medicoNombre: targetCita.medico_nombre,
        },
      });

      toast.success(
        `Cita de ${targetCita.paciente_nombre} (${servNombre}) cargada al ticket.`
      );
    },
    [pacientes, servicios, updateActiveTicket]
  );

  const handleSelectPaciente = async (pacienteIdStr: string) => {
    if (!pacienteIdStr) {
      updateActiveTicket({
        pacienteId: '',
        citaId: '',
        consultaId: '',
        medicoId: '',
        autoLoadedInfo: null,
        name: `Ticket ${tickets.findIndex((t) => t.id === activeTicketId) + 1}`,
      });
      setCitasPacientePendientes([]);
      setConsultasFinalizadas([]);
      return;
    }

    const pac = pacientes.find((p) => p.id === parseInt(pacienteIdStr, 10));
    const shortName = pac
      ? `${pac.nombres.split(' ')[0]} ${pac.apellidos ? pac.apellidos[0] + '.' : ''}`.trim()
      : 'Ticket';

    updateActiveTicket({
      pacienteId: pacienteIdStr,
      name: shortName,
    });

    const pendingCitas = await loadClinicalContextForPatient(parseInt(pacienteIdStr, 10));

    // Si el ticket está vacío y el paciente tiene una cita pendiente, auto-cargarla
    if (pendingCitas.length > 0 && activeTicket.detalles.length === 0) {
      handleLoadCitaIntoTicket(pendingCitas[0]);
    }
  };

  const consultasPendientes = useMemo(
    () => consultasFinalizadas.filter((c) => c.estado_pago !== 'pagado'),
    [consultasFinalizadas]
  );

  const selectedPaciente = useMemo(() => {
    if (!activeTicket.pacienteId) return null;
    return pacientes.find((p) => p.id === parseInt(activeTicket.pacienteId, 10)) || null;
  }, [pacientes, activeTicket.pacienteId]);

  const selectedMedico = useMemo(() => {
    if (!activeTicket.medicoId) return null;
    return medicos.find((m) => m.id === parseInt(activeTicket.medicoId, 10)) || null;
  }, [medicos, activeTicket.medicoId]);

  // ==========================================
  // Gestión de Tickets Múltiples y Cobros en Espera [F5]
  // ==========================================
  const handleAddTicket = () => {
    const nextNum = tickets.length + 1;
    const newId = `ticket-${Date.now()}`;
    const newTicket: PosTicket = {
      id: newId,
      name: `Ticket ${nextNum}`,
      pacienteId: '',
      medicoId: '',
      citaId: '',
      consultaId: '',
      detalles: [],
      descuentoDivisa: 0,
      notasCobro: '',
      autoLoadedInfo: null,
    };
    setTickets((prev) => [...prev, newTicket]);
    setActiveTicketId(newId);
    posSound.playBeep();
  };

  const handleCloseTicket = (ticketId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tickets.length <= 1) {
      toast.info('Debe permanecer al menos un ticket abierto en la terminal.');
      return;
    }
    const tToClose = tickets.find((t) => t.id === ticketId);
    if (tToClose && tToClose.detalles.length > 0) {
      if (
        !window.confirm(
          `¿Cerrar ${tToClose.name}? Contiene ${tToClose.detalles.length} concepto(s) sin cobrar.`
        )
      ) {
        return;
      }
    }
    const remaining = tickets.filter((t) => t.id !== ticketId);
    setTickets(remaining);
    if (activeTicketId === ticketId) {
      setActiveTicketId(remaining[0].id);
    }
  };

  const handleConfirmHoldTicket = (note: string) => {
    if (activeTicket.detalles.length === 0) {
      toast.info('El ticket actual no tiene conceptos para poner en espera.');
      return;
    }
    const heldEntry: HeldPosTicket = {
      ...activeTicket,
      id: `held-${Date.now()}`,
      heldAt: new Date().toISOString(),
      holdNote: note,
    };
    setHeldTickets((prev) => [heldEntry, ...prev]);
    updateActiveTicket({
      pacienteId: '',
      medicoId: '',
      citaId: '',
      consultaId: '',
      detalles: [],
      descuentoDivisa: 0,
      notasCobro: '',
      autoLoadedInfo: null,
      name: `Ticket ${tickets.findIndex((t) => t.id === activeTicketId) + 1}`,
    });
    posSound.playBeep();
    toast.success('Cobro retenido en espera. Puede retomarlo cuando el paciente esté listo.');
  };

  const handleResumeHeldTicket = (held: HeldPosTicket) => {
    posSound.playBeep();
    const { heldAt: _heldAt, holdNote, ...ticketData } = held;
    if (activeTicket.detalles.length === 0 && !activeTicket.pacienteId) {
      updateActiveTicket({
        ...ticketData,
        id: activeTicket.id,
        notasCobro: ticketData.notasCobro || holdNote || '',
      });
    } else {
      const resumedId = `ticket-${Date.now()}`;
      setTickets((prev) => [
        ...prev,
        {
          ...ticketData,
          id: resumedId,
          notasCobro: ticketData.notasCobro || holdNote || '',
        },
      ]);
      setActiveTicketId(resumedId);
    }
    setHeldTickets((prev) => prev.filter((h) => h.id !== held.id));
    toast.success(`Cobro de ${held.name} retomado en la terminal.`);
  };

  // ==========================================
  // Operaciones del Carrito / Tabla POS
  // ==========================================
  const handleAddServicioToCart = useCallback(
    (serv: Servicio) => {
      posSound.playBeep();
      const catLower = (serv.categoria || '').toLowerCase();
      const isOdonto = catLower.includes('odont');
      const isConsulta = catLower.includes('consulta');
      const isEstudio = catLower.includes('estudio') || catLower.includes('laboratorio');

      const tipoConcepto = isOdonto
        ? 'odontologia'
        : isConsulta
        ? 'consulta'
        : isEstudio
        ? 'estudio'
        : 'servicio';

      const existingIndex = activeTicket.detalles.findIndex(
        (d) => d.servicio_id === serv.id && (!isOdonto || !d.diente_fdi)
      );

      if (existingIndex >= 0) {
        const nextDetalles = activeTicket.detalles.map((item, idx) =>
          idx === existingIndex ? { ...item, cantidad: item.cantidad + 1 } : item
        );
        updateActiveTicket({ detalles: nextDetalles });
      } else {
        const newItem: CobroDetalleItem = {
          servicio_id: serv.id,
          tipo_concepto: tipoConcepto,
          descripcion: serv.nombre,
          cantidad: 1,
          precio_unitario_divisa: Number(serv.precio_base) || 30.0,
          diente_fdi: null,
        };
        updateActiveTicket({ detalles: [...activeTicket.detalles, newItem] });
      }
    },
    [activeTicket.detalles, updateActiveTicket]
  );

  const handleAddCustomItem = (item: CobroDetalleItem) => {
    posSound.playBeep();
    updateActiveTicket({ detalles: [...activeTicket.detalles, item] });
    toast.success(`"${item.descripcion}" añadido al ticket`);
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    posSound.playBeep();
    const current = activeTicket.detalles[index];
    if (!current) return;
    const nextQty = current.cantidad + delta;
    if (nextQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const nextDetalles = activeTicket.detalles.map((d, i) =>
      i === index ? { ...d, cantidad: nextQty } : d
    );
    updateActiveTicket({ detalles: nextDetalles });
  };

  const handleRemoveItem = (index: number) => {
    posSound.playBeep();
    updateActiveTicket({
      detalles: activeTicket.detalles.filter((_, i) => i !== index),
    });
  };

  const handleUpdateItemTooth = (index: number, tooth: number | null) => {
    const nextDetalles = activeTicket.detalles.map((d, i) =>
      i === index ? { ...d, diente_fdi: tooth } : d
    );
    updateActiveTicket({ detalles: nextDetalles });
  };

  const handleSelectConsulta = (consulta: ConsultaMedica) => {
    if (consulta.estado_pago === 'pagado') {
      posSound.playError();
      toast.warning(`Esta consulta ya figura como pagada.`);
      return;
    }

    if (activeTicket.consultaId === String(consulta.id)) {
      updateActiveTicket({ consultaId: '' });
      toast.info(`Consulta desvinculada del ticket`);
      return;
    }

    posSound.playBeep();
    const docNombre = consulta.medico
      ? `${consulta.medico.nombres} ${consulta.medico.apellidos}`.trim()
      : '';
    const espNombre = consulta.especialidad?.nombre || 'Medicina General';
    const conceptoDesc = `Consulta Médica - ${espNombre}${docNombre ? ` (Dr. ${docNombre})` : ''}`;
    const precio = consulta.cita?.precio_estimado ? Number(consulta.cita.precio_estimado) : 30.0;

    const consultaItem: CobroDetalleItem = {
      tipo_concepto: 'consulta',
      descripcion: conceptoDesc,
      cantidad: 1,
      precio_unitario_divisa: precio,
      diente_fdi: null,
    };

    updateActiveTicket({
      consultaId: String(consulta.id),
      citaId: consulta.cita_id ? String(consulta.cita_id) : activeTicket.citaId,
      medicoId: consulta.medico_id ? String(consulta.medico_id) : activeTicket.medicoId,
      detalles: [...activeTicket.detalles, consultaItem],
    });
    toast.success(`Consulta ${consulta.codigo || '#' + consulta.id} añadida al ticket`);
  };

  // ==========================================
  // Sugerencias Predictivas de la Barra Escáner (Servicios + Citas de Hoy)
  // ==========================================
  const scannerSuggestions = useMemo<PredictiveSuggestion[]>(() => {
    const q = scannerQuery.trim().toLowerCase();
    if (!q) return [];

    const citaMatches: PredictiveSuggestion[] = todayPendingCitas
      .filter(
        (c) =>
          (c.paciente_nombre || '').toLowerCase().includes(q) ||
          (c.paciente_documento || '').toLowerCase().includes(q) ||
          (c.servicio_nombre || '').toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((cita) => ({ kind: 'cita', cita }));

    const servicioMatches: PredictiveSuggestion[] = servicios
      .filter(
        (s) =>
          (s.codigo && s.codigo.toLowerCase().includes(q)) ||
          s.nombre.toLowerCase().includes(q) ||
          (s.categoria && s.categoria.toLowerCase().includes(q))
      )
      .slice(0, 8)
      .map((servicio) => ({ kind: 'servicio', servicio }));

    return [...citaMatches, ...servicioMatches];
  }, [scannerQuery, todayPendingCitas, servicios]);

  const handleSelectSuggestion = (item: PredictiveSuggestion) => {
    if (item.kind === 'cita') {
      handleLoadCitaIntoTicket(item.cita);
    } else {
      handleAddServicioToCart(item.servicio);
    }
    setScannerQuery('');
    setIsSuggestionsOpen(false);
    setHighlightedIdx(0);
    scannerInputRef.current?.focus();
  };

  const handleScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = scannerQuery.trim();
    if (!q) return;

    // 1. Coincidencia exacta por código de servicio
    const exactCode = servicios.find(
      (s) => s.codigo && s.codigo.toLowerCase() === q.toLowerCase()
    );
    if (exactCode) {
      handleAddServicioToCart(exactCode);
      setScannerQuery('');
      setIsSuggestionsOpen(false);
      return;
    }

    // 2. Selección resaltada en la lista predictiva
    if (scannerSuggestions.length > 0) {
      const target = scannerSuggestions[highlightedIdx] || scannerSuggestions[0];
      handleSelectSuggestion(target);
      return;
    }

    posSound.playError();
    toast.warning(`No se encontró servicio o cita pendiente para "${q}"`);
  };

  // ==========================================
  // Categorías para Panel Táctil Opcional
  // ==========================================
  const categoriasDisponibles = useMemo(() => {
    const cats = new Set<string>();
    servicios.forEach((s) => {
      if (s.categoria) cats.add(s.categoria);
    });
    return ['todos', ...Array.from(cats)];
  }, [servicios]);

  const tactileServicios = useMemo(() => {
    return servicios.filter((serv) => {
      if (selectedCategoria === 'todos') return true;
      return serv.categoria && serv.categoria.toLowerCase() === selectedCategoria.toLowerCase();
    });
  }, [servicios, selectedCategoria]);

  // ==========================================
  // Cálculos Financieros del Ticket Activo
  // ==========================================
  const totalUnidades = useMemo(
    () => activeTicket.detalles.reduce((acc, it) => acc + (Number(it.cantidad) || 1), 0),
    [activeTicket.detalles]
  );

  const subtotalFacturaDivisa = useMemo(() => {
    return activeTicket.detalles.reduce(
      (acc, it) => acc + (Number(it.precio_unitario_divisa) || 0) * (Number(it.cantidad) || 1),
      0
    );
  }, [activeTicket.detalles]);

  const subtotalFacturaVes = subtotalFacturaDivisa * tasaActiva;

  const totalFacturaDivisa = useMemo(() => {
    return Math.max(0, subtotalFacturaDivisa - (Number(activeTicket.descuentoDivisa) || 0));
  }, [subtotalFacturaDivisa, activeTicket.descuentoDivisa]);

  const totalFacturaVes = totalFacturaDivisa * tasaActiva;

  const applyDiscountPercent = (pct: number) => {
    posSound.playBeep();
    if (pct === 0) {
      updateActiveTicket({ descuentoDivisa: 0 });
      return;
    }
    const discountVal = Math.round(subtotalFacturaDivisa * (pct / 100) * 100) / 100;
    updateActiveTicket({ descuentoDivisa: discountVal });
  };

  // ==========================================
  // Apertura del Modal de Cobro + División por Seguro Médico
  // ==========================================
  const handleOpenPaymentModal = useCallback(
    (
      defaultMethod?: 'efectivo_ves' | 'punto' | 'pagomovil' | 'seguro' | 'divisa',
      submitMode: 'ticket' | 'solo_cobrar' = 'ticket'
    ) => {
      if (!turnoActivo) {
        posSound.playError();
        toast.error('Debe aperturar un turno de caja antes de procesar cobros');
        setAperturaModalOpen(true);
        return;
      }
      if (!activeTicket.pacienteId) {
        posSound.playError();
        toast.error('Asigne un paciente al ticket antes de cobrar [F6]');
        setIsPatientSearchOpen(true);
        return;
      }
      if (activeTicket.detalles.length === 0) {
        posSound.playError();
        toast.error('El ticket está vacío. Agregue al menos un concepto clínico.');
        scannerInputRef.current?.focus();
        return;
      }
      if (totalFacturaDivisa <= 0) {
        posSound.playError();
        toast.error('El monto total a cobrar debe ser mayor a cero.');
        return;
      }

      setPreferredSubmitMode(submitMode);
      const exactBs = Math.round(totalFacturaVes * 100) / 100;

      if (defaultMethod === 'seguro') {
        const aseguradora = selectedPaciente?.seguro_medico || seguroNombre || 'Aseguradora';
        setSeguroNombre(aseguradora);
        setSeguroPorcentaje(80);
        setTieneSeguro(true);
      } else if (defaultMethod === 'punto') {
        setTieneSeguro(false);
        setPagos([
          {
            metodo: 'punto_venta',
            moneda: 'VES',
            monto_moneda_origen: exactBs,
            referencia: '',
            banco_origen: '',
            notas: '',
          },
        ]);
      } else if (defaultMethod === 'efectivo_ves') {
        setTieneSeguro(false);
        setPagos([
          {
            metodo: 'efectivo_ves',
            moneda: 'VES',
            monto_moneda_origen: exactBs,
            referencia: '',
            banco_origen: '',
            notas: '',
          },
        ]);
      } else if (defaultMethod === 'divisa') {
        setTieneSeguro(false);
        setPagos([
          {
            metodo: monedaReferencia === 'EUR' ? 'efectivo_eur' : 'efectivo_usd',
            moneda: monedaReferencia,
            monto_moneda_origen: Math.round(totalFacturaDivisa * 100) / 100,
            referencia: '',
            banco_origen: '',
            notas: '',
          },
        ]);
      } else {
        setTieneSeguro(false);
        setPagos([
          {
            metodo: 'pago_movil',
            moneda: 'VES',
            monto_moneda_origen: exactBs,
            referencia: '',
            banco_origen: '',
            notas: '',
          },
        ]);
      }

      setIsPaymentModalOpen(true);
    },
    [
      turnoActivo,
      activeTicket.pacienteId,
      activeTicket.detalles.length,
      totalFacturaDivisa,
      totalFacturaVes,
      selectedPaciente,
      seguroNombre,
      monedaReferencia,
    ]
  );

  // Recalcular división cuando está activa la Cobertura de Póliza / Seguro
  useEffect(() => {
    if (!isPaymentModalOpen || !tieneSeguro || totalFacturaDivisa <= 0) return;

    const montoSeguro = Math.round(totalFacturaDivisa * (seguroPorcentaje / 100) * 100) / 100;
    const deducibleDiv = Math.max(0, Math.round((totalFacturaDivisa - montoSeguro) * 100) / 100);
    const deducibleBs = Math.round(deducibleDiv * tasaActiva * 100) / 100;

    const rows: CobroPagoItem[] = [
      {
        metodo: 'seguro_medico',
        moneda: monedaReferencia,
        monto_moneda_origen: montoSeguro,
        referencia: `Carta Aval ${seguroNombre}`,
        banco_origen: seguroNombre,
        notas: `Cobertura Póliza ${seguroPorcentaje}%`,
      },
    ];

    if (deducibleBs > 0.01) {
      rows.push({
        metodo: 'pago_movil',
        moneda: 'VES',
        monto_moneda_origen: deducibleBs,
        referencia: '',
        banco_origen: '',
        notas: 'Deducible Paciente',
      });
    }

    setPagos(rows);
  }, [
    tieneSeguro,
    seguroPorcentaje,
    seguroNombre,
    totalFacturaDivisa,
    tasaActiva,
    monedaReferencia,
    isPaymentModalOpen,
  ]);

  // ==========================================
  // Historial de Últimos Cobros [F4] y Anulación
  // ==========================================
  const handleOpenRecentCobros = useCallback(async () => {
    setIsRecentCobrosOpen(true);
    setLoadingRecentCobros(true);
    try {
      const list = await cajasApi.listCobros({
        sucursal_id: currentSucursalId,
        limit: 40,
      });
      setRecentCobros(list || []);
    } catch {
      toast.error('Error al cargar historial de últimos cobros');
    } finally {
      setLoadingRecentCobros(false);
    }
  }, [currentSucursalId]);

  const handleAnularCobroFromModal = async (cobroId: number, motivo: string) => {
    try {
      await cajasApi.anularCobro(cobroId, motivo);
      posSound.playSuccess();
      toast.success('Comprobante anulado correctamente');
      await Promise.all([handleOpenRecentCobros(), refreshTodayPendingCitas()]);
      const turnoUp = await cajasApi.getActiveTurno();
      setTurnoActivo(turnoUp);
    } catch (err: any) {
      posSound.playError();
      toast.error(err?.response?.data?.detail || 'No se pudo anular el comprobante');
      throw err;
    }
  };

  // ==========================================
  // Atajos Globales de Teclado Estilo FixSale POS
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // No interceptar si ya está abierto el modal de pago (el modal maneja sus propios F11/F12)
      if (isPaymentModalOpen) return;

      if (e.key === 'F10') {
        e.preventDefault();
        setIsCatalogModalOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        setIsVerifierModalOpen(true);
      } else if (e.key === 'Insert') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          setIsCustomConceptOpen(true);
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsPatientSearchOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (activeTicket.detalles.length > 0) {
          setIsHoldModalOpen(true);
        } else {
          toast.info('Agregue conceptos al ticket antes de ponerlo en espera [F5]');
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleOpenRecentCobros();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (turnoActivo) {
          setCierreModalOpen(true);
        } else {
          setAperturaModalOpen(true);
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        setIsKioskMode((prev) => !prev);
      } else if (e.key === 'F11') {
        e.preventDefault();
        handleOpenPaymentModal(undefined, 'ticket');
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleOpenPaymentModal(undefined, 'solo_cobrar');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPaymentModalOpen,
    activeTicket.detalles.length,
    turnoActivo,
    handleOpenRecentCobros,
    handleOpenPaymentModal,
  ]);

  // ==========================================
  // Confirmar y Emitir Cobro (Solo Cobrar o Cobrar + Ticket en Bs.)
  // ==========================================
  const handleConfirmarCobro = async (emitirTicket: boolean) => {
    if (!turnoActivo) return;

    const validPagos = pagos.filter((p) => Number(p.monto_moneda_origen) > 0);
    if (validPagos.length === 0) {
      posSound.playError();
      toast.error('Ingrese un monto de pago mayor a cero.');
      return;
    }

    try {
      setSubmittingCobro(true);
      const cobroGenerado = await cajasApi.createCobro({
        turno_caja_id: turnoActivo.id,
        sucursal_id: currentSucursalId,
        paciente_id: parseInt(activeTicket.pacienteId, 10),
        medico_id: activeTicket.medicoId ? parseInt(activeTicket.medicoId, 10) : undefined,
        cita_id: activeTicket.citaId ? parseInt(activeTicket.citaId, 10) : undefined,
        consulta_id: activeTicket.consultaId ? parseInt(activeTicket.consultaId, 10) : undefined,
        descuento_divisa: activeTicket.descuentoDivisa,
        notas: activeTicket.notasCobro.trim() || undefined,
        detalles: activeTicket.detalles,
        pagos: validPagos,
      });

      posSound.playSuccess();
      setUltimoCobro(cobroGenerado);
      setIsPaymentModalOpen(false);

      if (emitirTicket) {
        const latestPrinterCfg = loadPosPrinterConfig();
        setPrinterConfig(latestPrinterCfg);
        setAutoTriggerPrint(latestPrinterCfg.autoPrintOnSale);
        setReciboModalOpen(true);
        toast.success(`¡Cobro completado! Comprobante ${cobroGenerado.numero_recibo} listo en Bs.`);
      } else {
        setAutoTriggerPrint(false);
        toast.success(
          `¡Cobro registrado exitosamente! Folio ${cobroGenerado.numero_recibo} (${formatBs(
            cobroGenerado.total_ves
          )})`
        );
      }

      // Limpiar ticket cobrado
      updateActiveTicket({
        pacienteId: '',
        citaId: '',
        consultaId: '',
        medicoId: '',
        detalles: [],
        descuentoDivisa: 0,
        notasCobro: '',
        autoLoadedInfo: null,
        name: `Ticket ${tickets.findIndex((t) => t.id === activeTicketId) + 1}`,
      });

      // Actualizar estado del turno y citas del día
      const [turnoUp] = await Promise.all([
        cajasApi.getActiveTurno(),
        refreshTodayPendingCitas(),
      ]);
      setTurnoActivo(turnoUp);
      setTimeout(() => scannerInputRef.current?.focus(), 180);
    } catch (err: any) {
      posSound.playError();
      toast.error(err?.response?.data?.detail || 'Error al procesar el cobro');
    } finally {
      setSubmittingCobro(false);
    }
  };

  // Registrar Entrada / Salida de Efectivo en Caja
  const handleGuardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoActivo) return;
    const montoNum = Number(movMonto);
    if (!montoNum || montoNum <= 0) {
      toast.error('Ingrese un monto válido mayor a cero');
      return;
    }

    const detalleTxt = movConcepto.trim();
    const conceptoFinal = detalleTxt ? `${movCategoria}: ${detalleTxt}` : movCategoria;

    try {
      setSubmittingMovimiento(true);
      await cajasApi.createMovimiento({
        turno_caja_id: turnoActivo.id,
        sucursal_id: currentSucursalId,
        tipo: movTipo,
        concepto: conceptoFinal,
        moneda: movMoneda,
        monto: montoNum,
      });

      posSound.playSuccess();
      toast.success(`Movimiento de ${movTipo.toUpperCase()} registrado en caja`);
      setIsMovimientoModalOpen(false);
      setMovConcepto('');
      setMovMonto('');

      const turnoUp = await cajasApi.getActiveTurno();
      setTurnoActivo(turnoUp);
    } catch (err: any) {
      posSound.playError();
      toast.error(err?.response?.data?.detail || 'Error al registrar movimiento');
    } finally {
      setSubmittingMovimiento(false);
    }
  };

  const filteredModalPacientes = useMemo(() => {
    const q = patientSearchTerm.trim().toLowerCase();
    if (!q) return pacientes.slice(0, 18);
    return pacientes
      .filter((p) => {
        const doc = (p.documento_identidad || '').toLowerCase();
        const nom = `${p.nombres} ${p.apellidos}`.toLowerCase();
        const tel = (p.telefono || '').toLowerCase();
        return nom.includes(q) || doc.includes(q) || tel.includes(q);
      })
      .slice(0, 25);
  }, [pacientes, patientSearchTerm]);

  return (
    <div
      className={cn(
        'flex flex-col select-none bg-muted/20 dark:bg-background text-foreground transition-all',
        isKioskMode
          ? 'fixed inset-0 z-50 w-screen h-dvh p-3 sm:p-4 gap-2 overflow-hidden'
          : 'flex-1 min-h-0 w-full h-full p-2.5 sm:p-3.5 pb-3.5 sm:pb-4 gap-2 overflow-hidden'
      )}
    >
      {/* 1. ALERTA ROJA SI NO HAY CAJA ABIERTA (FIXSALE POS) */}
      {!loadingTurno && !turnoActivo && (
        <div className="w-full px-3 py-2 rounded-xl bg-rose-600 text-white flex items-center justify-between gap-2 shadow-sm shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              Sin Turno de Caja Abierto: Debe aperturar una caja registradora antes de emitir cobros.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setAperturaModalOpen(true)}
            className="h-7 px-3 text-xs font-extrabold bg-white text-rose-700 hover:bg-rose-50 cursor-pointer shrink-0"
          >
            <LockOpen className="w-3.5 h-3.5 mr-1" />
            Aperturar Caja [F8]
          </Button>
        </div>
      )}

      {/* 2. BARRA SUPERIOR DE COMANDOS Y TECLAS DE FUNCIÓN POS (FIXSALE TERMINAL HEADER) */}
      <div className="w-full p-2 px-3 rounded-xl bg-card border border-border shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Izquierda: Identidad Terminal + Estado Caja + Tasa Oficial BCV + Citas Pendientes */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 pr-2 border-r border-border">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <CircleDollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black leading-none tracking-tight flex items-center gap-1.5">
                <span>POS Cobranza</span>
                {isKioskMode && (
                  <Badge className="bg-primary/15 text-primary text-[9px] py-0 h-4">Kiosco</Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  turnoActivo ? navigate('/facturacion/cajas') : setAperturaModalOpen(true)
                }
                className="text-[10.5px] font-bold flex items-center gap-1 mt-0.5 cursor-pointer hover:underline"
              >
                {turnoActivo ? (
                  <>
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {turnoActivo.caja_nombre || `Caja #${turnoActivo.caja_id}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="size-1.5 rounded-full bg-rose-500" />
                    <span className="text-rose-600 dark:text-rose-400">Caja Cerrada</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Píldora Tasa Oficial BCV */}
          <button
            type="button"
            onClick={() => setIsRateModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/25 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Ver calculadora de cambio o sincronizar tasa BCV"
          >
            <RefreshCw className="w-3 h-3 text-primary" />
            <span className="text-[10.5px] font-extrabold text-primary">BCV:</span>
            <span className="text-xs font-black font-mono text-foreground">
              {formatBs(tasaActiva)}
            </span>
          </button>

          {/* Píldora Citas Pendientes de Hoy */}
          {todayPendingCitas.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer transition-colors"
              title="Cargar citas pendientes de cobro de hoy"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>{todayPendingCitas.length} Cita(s) por Cobrar</span>
            </button>
          )}
        </div>

        {/* Derecha: Botonera de Teclas Rápidas Estilo FixSale POS */}
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCatalogModalOpen(true)}
            className="h-8 px-2.5 text-[11px] font-bold gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-[10px] text-primary">[F10]</span>
            <span className="hidden sm:inline">Buscar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsVerifierModalOpen(true)}
            className="h-8 px-2 text-[11px] font-bold gap-1 cursor-pointer"
            title="Verificador de Precios [F9]"
          >
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-mono text-[10px] text-sky-600">[F9]</span>
            <span className="hidden xl:inline">Verificador</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCustomConceptOpen(true)}
            className="h-8 px-2 text-[11px] font-bold gap-1 cursor-pointer"
            title="Concepto Clínico Libre [INS]"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono text-[10px] text-emerald-600">[INS]</span>
            <span className="hidden 2xl:inline">Concepto</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPatientSearchOpen(true)}
            className="h-8 px-2 text-[11px] font-bold gap-1 cursor-pointer"
            title="Asignar Paciente [F6]"
          >
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-mono text-[10px] text-indigo-600">[F6]</span>
            <span className="hidden lg:inline">Paciente</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={activeTicket.detalles.length === 0}
            onClick={() => setIsHoldModalOpen(true)}
            className="h-8 px-2 text-[11px] font-bold gap-1 cursor-pointer"
            title="Poner Cobro en Espera [F5]"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-mono text-[10px] text-amber-600">[F5]</span>
            <span className="hidden 2xl:inline">Espera</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenRecentCobros}
            className="h-8 px-2 text-[11px] font-bold gap-1 cursor-pointer"
            title="Últimos Recibos y Reimpresión [F4]"
          >
            <History className="w-3.5 h-3.5 text-violet-600" />
            <span className="font-mono text-[10px] text-violet-600">[F4]</span>
            <span className="hidden xl:inline">Recibos</span>
          </Button>

          {turnoActivo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMovimientoModalOpen(true)}
              className="h-8 px-2 text-[11px] font-bold gap-1 cursor-pointer"
              title="Registrar Entrada o Salida de Efectivo en Caja Chica"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden xl:inline">Efectivo</span>
              <span className="font-mono text-[10px]">+/-</span>
            </Button>
          )}

          {turnoActivo ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCierreModalOpen(true)}
              className="h-8 px-2.5 text-[11px] font-bold gap-1 border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px]">[F8]</span>
              <span className="hidden sm:inline">Corte</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setAperturaModalOpen(true)}
              className="h-8 px-2.5 text-[11px] font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <LockOpen className="w-3.5 h-3.5" />
              <span>Abrir Caja</span>
            </Button>
          )}

          {/* Controles utilitarios compactos: Catálogo Táctil, Impresora, Sonido, Kiosco */}
          <div className="flex items-center gap-1 pl-1 border-l border-border">
            <Button
              type="button"
              variant={showTactileCatalog ? 'default' : 'ghost'}
              size="sm"
              onClick={toggleCatalogPanel}
              className="h-8 px-2 text-[11px] gap-1 cursor-pointer"
              title={
                showTactileCatalog
                  ? 'Cambiar a Vista Tabla Completa (FixSale)'
                  : 'Mostrar Panel de Catálogo Táctil Lateral'
              }
            >
              {showTactileCatalog ? (
                <Table2 className="w-3.5 h-3.5" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5" />
              )}
              <span className="hidden 2xl:inline">Catálogo</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPrinterConfigOpen(true)}
              className="h-8 px-2 text-[11px] gap-1 cursor-pointer"
              title={`Configurar Ticketera (${printerConfig.paperSize} • Solo Bs.)`}
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-mono hidden sm:inline">
                {printerConfig.paperSize}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className="h-8 w-8 p-0 cursor-pointer"
              title={soundEnabled ? 'Silenciar sonidos POS' : 'Activar sonidos POS'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsKioskMode((prev) => !prev)}
              className="h-8 w-8 p-0 cursor-pointer"
              title="Alternar pantalla completa Kiosco [F2]"
            >
              {isKioskMode ? (
                <Minimize2 className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. BARRA MULTI-TICKET + COBROS RETENIDOS EN ESPERA (FIXSALE WORKSPACE BAR) */}
      <div className="w-full flex items-center justify-between gap-2 shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {tickets.map((ticket) => {
            const isSelected = activeTicketId === ticket.id;
            const count = ticket.detalles.reduce((a, b) => a + (b.cantidad || 1), 0);
            return (
              <div
                key={ticket.id}
                onClick={() => {
                  setActiveTicketId(ticket.id);
                  posSound.playBeep();
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-all border whitespace-nowrap',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground hover:text-foreground border-border'
                )}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{ticket.name}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0 rounded-full text-[9.5px] font-mono font-black',
                      isSelected ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {count}
                  </span>
                )}
                {tickets.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTicket(ticket.id, e)}
                    className="ml-0.5 opacity-75 hover:opacity-100 cursor-pointer"
                    title="Cerrar pestaña"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddTicket}
            className="px-2.5 py-1 rounded-lg text-xs font-bold border border-dashed border-primary/50 text-primary hover:bg-primary/10 flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Ticket
          </button>
        </div>

        {/* Cobros en Espera [F5] */}
        {heldTickets.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10.5px] font-extrabold text-amber-600 dark:text-amber-400 uppercase whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3 h-3" />
              En Espera ({heldTickets.length}):
            </span>
            {heldTickets.map((ht) => {
              const htDiv = ht.detalles.reduce(
                (a, b) => a + (Number(b.precio_unitario_divisa) || 0) * (Number(b.cantidad) || 1),
                0
              );
              return (
                <div
                  key={ht.id}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] whitespace-nowrap"
                >
                  <span className="font-bold">{ht.name}</span>
                  {ht.holdNote && (
                    <span className="text-[10px] opacity-80 max-w-[110px] truncate">
                      ({ht.holdNote})
                    </span>
                  )}
                  <span className="font-mono font-bold text-[10px]">
                    {formatBs(htDiv * tasaActiva)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleResumeHeldTicket(ht)}
                    className="px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Retomar cobro"
                  >
                    <Play className="w-2.5 h-2.5" />
                    Retomar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setHeldTickets((prev) => prev.filter((item) => item.id !== ht.id))
                    }
                    className="text-amber-700 dark:text-amber-300 hover:text-rose-600 cursor-pointer"
                    title="Descartar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. BARRA ESCÁNER Y BUSCADOR PREDICTIVO EN TIEMPO REAL (FIXSALE ENTER-TO-ADD BAR) */}
      <div ref={scannerContainerRef} className="w-full relative shrink-0">
        <form onSubmit={handleScannerSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
            <Input
              ref={scannerInputRef}
              value={scannerQuery}
              onChange={(e) => {
                setScannerQuery(e.target.value);
                setIsSuggestionsOpen(true);
                setHighlightedIdx(0);
              }}
              onFocus={() => {
                if (scannerQuery.trim()) setIsSuggestionsOpen(true);
              }}
              onKeyDown={(e) => {
                if (!isSuggestionsOpen || scannerSuggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIdx((prev) => (prev + 1) % scannerSuggestions.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIdx((prev) =>
                    prev <= 0 ? scannerSuggestions.length - 1 : prev - 1
                  );
                } else if (e.key === 'Escape') {
                  setIsSuggestionsOpen(false);
                }
              }}
              placeholder="Escriba código, nombre del servicio/procedimiento o paciente con cita hoy y presione [ENTER]..."
              className="pl-10 pr-9 h-10 text-xs sm:text-sm font-semibold rounded-xl bg-card border-primary/35 focus-visible:ring-primary shadow-2xs"
            />
            {scannerQuery && (
              <button
                type="button"
                onClick={() => {
                  setScannerQuery('');
                  setIsSuggestionsOpen(false);
                  scannerInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Button
            type="submit"
            className="h-10 px-4 rounded-xl text-xs font-black gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ENTER - Agregar</span>
          </Button>
        </form>

        {/* Menú Desplegable Predictivo (Citas Hoy + Catálogo) */}
        {isSuggestionsOpen && scannerSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-11 z-40 rounded-xl bg-card border border-border shadow-2xl max-h-[320px] overflow-y-auto divide-y divide-border">
            {scannerSuggestions.map((sug, idx) => {
              const isHighlighted = idx === highlightedIdx;
              if (sug.kind === 'cita') {
                const c = sug.cita;
                const divP = Number(c.precio_estimado) || 30;
                return (
                  <div
                    key={`cita-${c.id}`}
                    onClick={() => handleSelectSuggestion(sug)}
                    className={cn(
                      'p-2.5 px-3.5 flex items-center justify-between gap-3 cursor-pointer text-xs transition-colors',
                      isHighlighted ? 'bg-primary/15' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Badge className="bg-amber-500 text-white text-[9.5px] shrink-0">
                        CITA HOY {c.hora_inicio}
                      </Badge>
                      <div className="min-w-0">
                        <span className="font-extrabold text-foreground block truncate">
                          {c.paciente_nombre}{' '}
                          {c.paciente_documento ? `(CI: ${c.paciente_documento})` : ''}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground block truncate">
                          {c.servicio_nombre || c.motivo} • Dr(a). {c.medico_nombre}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black font-mono text-xs text-foreground block">
                        {formatBs(divP * tasaActiva)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Ref: {refSym}
                        {divP.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              }

              const s = sug.servicio;
              const divP = Number(s.precio_base) || 0;
              return (
                <div
                  key={`srv-${s.id}`}
                  onClick={() => handleSelectSuggestion(sug)}
                  className={cn(
                    'p-2.5 px-3.5 flex items-center justify-between gap-3 cursor-pointer text-xs transition-colors',
                    isHighlighted ? 'bg-primary/15' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {s.codigo || `SRV-${s.id}`}
                    </span>
                    <span className="font-bold text-foreground truncate">{s.nombre}</span>
                    {s.categoria && (
                      <Badge variant="outline" className="text-[9.5px] py-0 h-4 shrink-0">
                        {s.categoria}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black font-mono text-xs text-foreground block">
                      {formatBs(divP * tasaActiva)}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Ref: {refSym}
                      {divP.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. ÁREA CENTRAL EXPANSIBLE: TABLA POS ESTILO FIXSALE/ELEVENTA (+ PANEL TÁCTIL OPCIONAL) */}
      <div className="w-full flex-1 min-h-0 flex gap-2.5 overflow-hidden">
        {/* Panel Lateral de Catálogo Táctil (solo si el cajero lo activa) */}
        {showTactileCatalog && (
          <div className="hidden lg:flex lg:w-[37%] xl:w-[35%] flex-col rounded-2xl bg-card border border-border p-3 overflow-hidden shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-border scrollbar-none shrink-0">
              {categoriasDisponibles.map((cat) => {
                const active = selectedCategoria.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoria(cat)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer border transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    {cat === 'todos' ? 'Todos' : cat}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 content-start">
              {tactileServicios.map((serv) => {
                const divP = Number(serv.precio_base) || 0;
                const inCart = activeTicket.detalles
                  .filter((d) => d.servicio_id === serv.id)
                  .reduce((a, b) => a + (b.cantidad || 1), 0);
                return (
                  <button
                    key={serv.id}
                    type="button"
                    onClick={() => handleAddServicioToCart(serv)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer hover:border-primary active:scale-[0.98] relative',
                      inCart > 0
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border bg-background hover:bg-muted/30'
                    )}
                  >
                    {inCart > 0 && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-bold">
                        {inCart}
                      </span>
                    )}
                    <div>
                      <span className="text-[9.5px] font-mono text-muted-foreground block">
                        {serv.codigo || `SRV-${serv.id}`}
                      </span>
                      <span className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                        {serv.nombre}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-border/60">
                      <span className="text-xs font-black font-mono text-foreground block">
                        {formatBs(divP * tasaActiva)}
                      </span>
                      <span className="text-[9.5px] font-mono text-muted-foreground">
                        Ref: {refSym}
                        {divP.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTENEDOR PRINCIPAL DEL TICKET (ESTILO FIXSALE TERMINAL) */}
        <div className="flex-1 min-w-0 flex flex-col rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
          {/* Franja de Contexto Clínico: Paciente + Citas/Consultas + Médico + Vaciar */}
          <div className="p-2.5 px-3.5 bg-muted/35 border-b border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Selector / Ficha Compacta de Paciente */}
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              {selectedPaciente ? (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-background border border-primary/30 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-xs shrink-0">
                    {(
                      (selectedPaciente.nombres?.[0] || '') +
                      (selectedPaciente.apellidos?.[0] || '')
                    ).toUpperCase() || 'P'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-foreground truncate max-w-[190px]">
                        {selectedPaciente.nombres} {selectedPaciente.apellidos}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0 rounded bg-muted text-muted-foreground">
                        CI: {selectedPaciente.documento_identidad || 'S/D'}
                      </span>
                      {selectedPaciente.seguro_medico && (
                        <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[9.5px] py-0 h-4">
                          <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                          {selectedPaciente.seguro_medico}
                        </Badge>
                      )}
                    </div>
                    {selectedPaciente.telefono && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {selectedPaciente.telefono}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsPatientSearchOpen(true)}
                    className="h-6 px-2 text-[10px] font-bold text-primary cursor-pointer"
                  >
                    [F6] Cambiar
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleSelectPaciente('')}
                    className="text-muted-foreground hover:text-rose-500 cursor-pointer p-0.5"
                    title="Quitar paciente"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsPatientSearchOpen(true)}
                    className="h-8 text-xs font-extrabold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    [F6] Asignar Paciente
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsNewPatientModalOpen(true)}
                    className="h-8 text-xs font-bold gap-1 rounded-xl cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                    + Paciente Exprés
                  </Button>
                </div>
              )}

              {/* Píldoras de Citas o Consultas Pendientes del Paciente Activo */}
              {citasPacientePendientes.length > 0 && !activeTicket.citaId && (
                <button
                  type="button"
                  onClick={() => handleLoadCitaIntoTicket(citasPacientePendientes[0])}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-500/25"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  + Cargar Cita Pendiente ({citasPacientePendientes.length})
                </button>
              )}

              {consultasPendientes.map((cons) => {
                const isLinked = activeTicket.consultaId === String(cons.id);
                return (
                  <button
                    key={cons.id}
                    type="button"
                    onClick={() => handleSelectConsulta(cons)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer border transition-colors',
                      isLinked
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20'
                    )}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    {isLinked
                      ? `✓ Consulta ${cons.codigo || '#' + cons.id}`
                      : `+ Vincular Consulta ${cons.codigo || '#' + cons.id}`}
                  </button>
                );
              })}
            </div>

            {/* Derecha: Selector Médico Tratante + Vaciar Ticket */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0" />
                <Select
                  value={activeTicket.medicoId || 'none'}
                  onValueChange={(val) =>
                    updateActiveTicket({ medicoId: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="h-8 text-xs min-w-[180px] max-w-[230px] bg-background">
                    <SelectValue placeholder="Médico Tratante" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 text-xs">
                    <SelectItem value="none">
                      {selectedMedico ? 'Quitar médico' : 'Particular / Sin médico'}
                    </SelectItem>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        Dr(a). {m.nombres} {m.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeTicket.detalles.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    updateActiveTicket({
                      detalles: [],
                      autoLoadedInfo: null,
                      descuentoDivisa: 0,
                      citaId: '',
                      consultaId: '',
                    });
                    posSound.playBeep();
                  }}
                  className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vaciar
                </Button>
              )}
            </div>
          </div>

          {/* TABLA DE CONCEPTOS ESTILO ELEVENTA / FIXSALE POS */}
          <div className="flex-1 overflow-y-auto">
            {activeTicket.detalles.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <p className="text-sm font-extrabold text-foreground">
                  Ticket de cobro listo para facturar
                </p>
                <p className="text-xs text-muted-foreground max-w-md mt-1">
                  Escriba en el buscador superior, seleccione un paciente con{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-[10px]">
                    F6
                  </kbd>{' '}
                  para cargar su cita médica automáticamente, o explore el catálogo con{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-[10px]">
                    F10
                  </kbd>
                  .
                </p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-muted/85 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10.5px] font-extrabold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-28"># / Tipo</th>
                    <th className="py-2.5 px-3 text-left">Concepto / Servicio Clínico</th>
                    <th className="py-2.5 px-3 text-right w-36">Precio Unit. (Bs.)</th>
                    <th className="py-2.5 px-3 text-center w-32">Cantidad</th>
                    <th className="py-2.5 px-3 text-right w-40">Importe (Bs.)</th>
                    <th className="py-2.5 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeTicket.detalles.map((it, idx) => {
                    const unitDiv = Number(it.precio_unitario_divisa) || 0;
                    const unitBs = unitDiv * tasaActiva;
                    const qty = Number(it.cantidad) || 1;
                    const subDiv = unitDiv * qty;
                    const subBs = subDiv * tasaActiva;

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-primary/5 transition-colors group"
                      >
                        {/* # y Tipo Clínico */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-muted-foreground">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] px-1.5 py-0 uppercase font-extrabold',
                                it.tipo_concepto === 'consulta'
                                  ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                  : it.tipo_concepto === 'odontologia'
                                  ? 'border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10'
                                  : 'border-border text-muted-foreground'
                              )}
                            >
                              {it.tipo_concepto}
                            </Badge>
                          </div>
                        </td>

                        {/* Descripción + Diente FDI si aplica */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="font-extrabold text-xs sm:text-sm text-foreground leading-snug">
                            {it.descripcion}
                          </div>
                          {it.tipo_concepto === 'odontologia' && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10.5px] text-muted-foreground font-semibold">
                                🦷 Pieza FDI:
                              </span>
                              <Input
                                type="number"
                                min="11"
                                max="85"
                                placeholder="Ej. 16"
                                value={it.diente_fdi ?? ''}
                                onChange={(e) =>
                                  handleUpdateItemTooth(
                                    idx,
                                    e.target.value ? parseInt(e.target.value, 10) : null
                                  )
                                }
                                className="h-6 w-20 text-xs font-mono font-bold px-2"
                              />
                            </div>
                          )}
                        </td>

                        {/* Precio Unitario (Bs. principal + Ref interna) */}
                        <td className="py-2.5 px-3 text-right align-middle font-mono">
                          <span className="font-bold text-xs text-foreground block">
                            {formatBs(unitBs)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Ref: {refSym}
                            {unitDiv.toFixed(2)}
                          </span>
                        </td>

                        {/* Controles de Cantidad */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, -1)}
                              className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center font-bold cursor-pointer transition-colors"
                              title="Disminuir cantidad"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-black font-mono text-xs sm:text-sm">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, 1)}
                              className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center font-bold cursor-pointer transition-colors"
                              title="Aumentar cantidad"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Subtotal / Importe */}
                        <td className="py-2.5 px-3 text-right align-middle font-mono">
                          <span className="font-black text-xs sm:text-sm text-foreground block">
                            {formatBs(subBs)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Ref: {refSym}
                            {subDiv.toFixed(2)}
                          </span>
                        </td>

                        {/* Eliminar */}
                        <td className="py-2.5 pl-2 pr-4 sm:pr-6 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                            title="Quitar concepto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 6. FOOTER DE ANCHO COMPLETO ADAPTADO A LA PANTALLA (SEPARADO Y NO PEGADO A LA BARRA) */}
      <footer className="w-full shrink-0 rounded-2xl bg-card border border-border p-2.5 sm:px-4 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Izquierda: Contador + Descuento Rápido + Atajos Directos de Medio de Pago */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-1.5 rounded-xl bg-muted/50 border border-border text-xs font-bold flex items-center gap-1.5">
            <span className="text-muted-foreground">Ítems:</span>
            <span className="font-mono font-black text-foreground">
              {activeTicket.detalles.length} ({totalUnidades} unid.)
            </span>
          </div>

          {/* Control Compacto de Descuento */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-muted/50 border border-border">
            <Percent className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground">Dcto:</span>
            {[0, 5, 10, 15, 20].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyDiscountPercent(pct)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold cursor-pointer transition-colors',
                  pct === 0 && !activeTicket.descuentoDivisa
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                {pct === 0 ? '0%' : `${pct}%`}
              </button>
            ))}
            <Input
              type="number"
              min="0"
              step="0.01"
              value={activeTicket.descuentoDivisa || ''}
              onChange={(e) =>
                updateActiveTicket({ descuentoDivisa: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
              title={`Descuento manual en ${monedaReferencia}`}
              className="h-6 w-16 text-right font-mono text-[11px] px-1.5 bg-background"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{refSym}</span>
          </div>

          {/* Botones Directos 1-Clic de Método de Pago */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              type="button"
              disabled={activeTicket.detalles.length === 0 || !turnoActivo}
              onClick={() => handleOpenPaymentModal('pagomovil', 'ticket')}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:border-amber-400 hover:bg-amber-500/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              Pago Móvil
            </button>
            <button
              type="button"
              disabled={activeTicket.detalles.length === 0 || !turnoActivo}
              onClick={() => handleOpenPaymentModal('punto', 'ticket')}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:border-sky-400 hover:bg-sky-500/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-sky-600" />
              Punto POS
            </button>
            <button
              type="button"
              disabled={activeTicket.detalles.length === 0 || !turnoActivo}
              onClick={() => handleOpenPaymentModal('efectivo_ves', 'ticket')}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:border-emerald-400 hover:bg-emerald-500/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
            >
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              Efectivo
            </button>
            <button
              type="button"
              disabled={activeTicket.detalles.length === 0 || !turnoActivo}
              onClick={() => handleOpenPaymentModal('seguro', 'ticket')}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:border-indigo-400 hover:bg-indigo-500/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Seguro
            </button>
          </div>
        </div>

        {/* Derecha: Total Ejecutivo en Bolívares + Botones Dobles [F12] Solo Cobrar y [F11] Cobrar y Ticket */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 ml-auto">
          <div className="text-right">
            {activeTicket.descuentoDivisa > 0 && (
              <div className="text-[10.5px] font-mono text-rose-600 dark:text-rose-400 leading-none mb-0.5">
                Subt: {formatBs(subtotalFacturaVes)} | Dcto: -
                {formatBs(activeTicket.descuentoDivisa * tasaActiva)}
              </div>
            )}
            <div className="flex items-baseline justify-end gap-2 leading-none">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                TOTAL:
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-foreground tracking-tight">
                {formatBs(totalFacturaVes)}
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5 leading-none">
              Ref. Interna: {refSym}
              {totalFacturaDivisa.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={activeTicket.detalles.length === 0 || !turnoActivo}
              onClick={() => handleOpenPaymentModal(undefined, 'solo_cobrar')}
              className="h-10 sm:h-11 px-3.5 rounded-xl font-extrabold text-xs gap-1.5 border border-border cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>[F12] Solo Cobrar</span>
            </Button>

            <Button
              type="button"
              disabled={activeTicket.detalles.length === 0 || !turnoActivo}
              onClick={() => handleOpenPaymentModal(undefined, 'ticket')}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs sm:text-sm gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>[F11] Cobrar y Ticket</span>
            </Button>
          </div>
        </div>
      </footer>

      {/* ================================================================= */}
      {/* MODALES DEL SISTEMA POS (FIXSALE + MEDISOFT) */}
      {/* ================================================================= */}

      {/* Modal de Procesamiento de Pago y Calculadora de Vuelto */}
      <PosPaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        ticketName={activeTicket.name}
        pacienteNombre={
          selectedPaciente
            ? `${selectedPaciente.nombres} ${selectedPaciente.apellidos}`
            : undefined
        }
        pacienteSeguro={selectedPaciente?.seguro_medico}
        monedaReferencia={monedaReferencia}
        tasaActiva={tasaActiva}
        totalFacturaDivisa={totalFacturaDivisa}
        totalFacturaVes={totalFacturaVes}
        pagos={pagos}
        setPagos={setPagos}
        tieneSeguro={tieneSeguro}
        setTieneSeguro={setTieneSeguro}
        seguroNombre={seguroNombre}
        setSeguroNombre={setSeguroNombre}
        seguroPorcentaje={seguroPorcentaje}
        setSeguroPorcentaje={setSeguroPorcentaje}
        submittingCobro={submittingCobro}
        preferredSubmitMode={preferredSubmitMode}
        onConfirmCobro={handleConfirmarCobro}
        onPlayBeep={() => posSound.playBeep()}
      />

      {/* [F10] Explorador de Catálogo, Citas del Día y Consultas */}
      <PosCatalogSearchModal
        open={isCatalogModalOpen}
        onOpenChange={setIsCatalogModalOpen}
        servicios={servicios}
        todayPendingCitas={todayPendingCitas}
        consultasPendientes={consultasPendientes}
        monedaReferencia={monedaReferencia}
        tasaActiva={tasaActiva}
        onAddServicio={handleAddServicioToCart}
        onLoadCita={handleLoadCitaIntoTicket}
        onLinkConsulta={handleSelectConsulta}
      />

      {/* [F9] Verificador Instantáneo de Tarifas en Bs. */}
      <PosPriceVerifierModal
        open={isVerifierModalOpen}
        onOpenChange={setIsVerifierModalOpen}
        servicios={servicios}
        monedaReferencia={monedaReferencia}
        tasaActiva={tasaActiva}
        onAddServicio={handleAddServicioToCart}
      />

      {/* [INS] Concepto Clínico Libre / Vario */}
      <PosCustomConceptModal
        open={isCustomConceptOpen}
        onOpenChange={setIsCustomConceptOpen}
        monedaReferencia={monedaReferencia}
        tasaActiva={tasaActiva}
        onAddCustomItem={handleAddCustomItem}
      />

      {/* [F5] Poner Cobro en Espera */}
      <PosHoldTicketModal
        open={isHoldModalOpen}
        onOpenChange={setIsHoldModalOpen}
        ticketName={activeTicket.name}
        itemsCount={activeTicket.detalles.length}
        totalVes={totalFacturaVes}
        onConfirmHold={handleConfirmHoldTicket}
      />

      {/* [F4] Últimos Cobros, Reimpresión en Bs. y Anulación */}
      <PosRecentSalesModal
        open={isRecentCobrosOpen}
        onOpenChange={setIsRecentCobrosOpen}
        cobros={recentCobros}
        loading={loadingRecentCobros}
        activeTurnoId={turnoActivo?.id}
        onReprint={(rc) => {
          setUltimoCobro(rc);
          setAutoTriggerPrint(false);
          setReciboModalOpen(true);
        }}
        onAnularCobro={handleAnularCobroFromModal}
        onRefresh={handleOpenRecentCobros}
      />

      {/* Configuración de Ticketera 80mm / 58mm */}
      <PosPrinterConfigModal
        open={isPrinterConfigOpen}
        onOpenChange={setIsPrinterConfigOpen}
        config={printerConfig}
        onSaveConfig={setPrinterConfig}
      />

      {/* Tasa Oficial BCV y Calculadora Bidireccional */}
      <PosExchangeRateModal
        open={isRateModalOpen}
        onOpenChange={setIsRateModalOpen}
        monedaReferencia={monedaReferencia}
        tasaActiva={tasaActiva}
        sincronizadoAt={ratesData?.sincronizado_at}
        onSyncRates={handleSyncRates}
        syncingRates={syncingRates}
      />

      {/* [F6] Selector Rápido de Paciente */}
      <Dialog open={isPatientSearchOpen} onOpenChange={setIsPatientSearchOpen}>
        <DialogContent className="sm:max-w-[560px] p-5 rounded-2xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base font-black">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                [F6] Seleccionar Paciente para el Ticket
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsPatientSearchOpen(false);
                  setIsNewPatientModalOpen(true);
                }}
                className="text-xs gap-1 font-bold text-primary border-primary/40 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Nuevo Paciente
              </Button>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Busque por cédula, nombre o teléfono. Si tiene cita pendiente, su servicio se cargará automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="relative pt-1">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              value={patientSearchTerm}
              onChange={(e) => setPatientSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredModalPacientes.length > 0) {
                  e.preventDefault();
                  handleSelectPaciente(String(filteredModalPacientes[0].id));
                  setIsPatientSearchOpen(false);
                  setPatientSearchTerm('');
                }
              }}
              placeholder="Ej. 18452910 o María Pérez..."
              className="pl-10 h-10 text-xs rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1 pt-1">
            {filteredModalPacientes.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No se encontraron pacientes registrados con ese criterio.
              </div>
            ) : (
              filteredModalPacientes.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    handleSelectPaciente(String(p.id));
                    setIsPatientSearchOpen(false);
                    setPatientSearchTerm('');
                  }}
                  className="p-2.5 px-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-all"
                >
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      {p.nombres} {p.apellidos}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground font-mono">
                      CI: {p.documento_identidad || 'Sin documento'}
                      {p.telefono ? ` • Tel: ${p.telefono}` : ''}
                      {p.seguro_medico ? ` • Seguro: ${p.seguro_medico}` : ''}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9.5px] text-primary border-primary/40">
                    Asignar
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Movimiento Extraordinario de Caja Chica (+/- Efectivo) */}
      <Dialog open={isMovimientoModalOpen} onOpenChange={setIsMovimientoModalOpen}>
        <DialogContent className="sm:max-w-[460px] p-5 rounded-2xl bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Wallet className="w-4 h-4 text-amber-500" />
              Entrada / Salida de Efectivo en Caja
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre ingresos de sencillo o salidas por gastos operativos menores del turno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarMovimiento} className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMovTipo('egreso');
                  if (movCategoria === 'Aporte de Sencillo') {
                    setMovCategoria('Gasto Operacional');
                  }
                }}
                className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all',
                  movTipo === 'egreso'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                    : 'bg-background border-border text-muted-foreground'
                )}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Salida / Gasto (-)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovTipo('ingreso');
                  setMovCategoria('Aporte de Sencillo');
                }}
                className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all',
                  movTipo === 'ingreso'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-background border-border text-muted-foreground'
                )}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                Entrada / Sencillo (+)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Categoría</Label>
                <Select value={movCategoria} onValueChange={setMovCategoria}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Gasto Operacional">Gasto Operacional</SelectItem>
                    <SelectItem value="Compra de Insumos">Compra de Insumos</SelectItem>
                    <SelectItem value="Aporte de Sencillo">Aporte de Sencillo</SelectItem>
                    <SelectItem value="Retiro Parcial / Bóveda">Retiro Parcial / Bóveda</SelectItem>
                    <SelectItem value="Ajuste de Caja">Ajuste de Caja</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Gaveta / Moneda</Label>
                <Select value={movMoneda} onValueChange={(val: any) => setMovMoneda(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="VES">Bolívares (Bs.)</SelectItem>
                    <SelectItem value="USD">Dólares ($)</SelectItem>
                    <SelectItem value="EUR">Euros (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Monto *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={movMonto}
                onChange={(e) => setMovMonto(parseFloat(e.target.value) || '')}
                placeholder="0.00"
                className="h-9 text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Detalle / Justificación</Label>
              <Input
                value={movConcepto}
                onChange={(e) => setMovConcepto(e.target.value)}
                placeholder="Ej. Compra de papelería, agua mineral, sencillo..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMovimientoModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingMovimiento}
                className={cn(
                  'text-white font-bold text-xs cursor-pointer',
                  movTipo === 'egreso'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {submittingMovimiento ? 'Registrando...' : 'Guardar Movimiento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Registro Exprés de Nuevo Paciente */}
      <PatientFormModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
        onSaved={(newPac) => {
          if (newPac) {
            setPacientes((prev) => [newPac, ...prev]);
            handleSelectPaciente(String(newPac.id));
            setIsNewPatientModalOpen(false);
          }
        }}
      />

      {/* Apertura y Cierre / Arqueo de Turno */}
      <TurnoAperturaModal
        open={aperturaModalOpen}
        onOpenChange={setAperturaModalOpen}
        cajas={cajas}
        sucursalId={currentSucursalId}
        onTurnoOpened={(t) => setTurnoActivo(t)}
      />

      <TurnoCierreModal
        open={cierreModalOpen}
        onOpenChange={setCierreModalOpen}
        turno={turnoActivo}
        onTurnoClosed={() => setTurnoActivo(null)}
        onRequestPrintCorte={(turnoCerrado, autoPrint) => {
          setCorteTicketTurno(turnoCerrado);
          setCorteTicketAutoPrint(autoPrint);
          setCorteTicketOpen(true);
        }}
      />

      {/* Comprobante Térmico 80mm / 58mm de Corte Z o Arqueo X (100% en Bs.) */}
      <CorteCajaTicketModal
        open={corteTicketOpen}
        onOpenChange={setCorteTicketOpen}
        turnoId={corteTicketTurno?.id || null}
        fallbackTurno={corteTicketTurno}
        autoTriggerPrint={corteTicketAutoPrint}
        onAutoPrintHandled={() => setCorteTicketAutoPrint(false)}
      />

      {/* Ticket Térmico 80mm / 58mm Estrictamente en Bolívares (Bs.) */}
      <CobroReciboModal
        open={reciboModalOpen}
        onOpenChange={setReciboModalOpen}
        cobro={ultimoCobro}
        autoTriggerPrint={autoTriggerPrint}
        onAutoPrintHandled={() => setAutoTriggerPrint(false)}
      />
    </div>
  );
};

export default PuntoCobroPage;
