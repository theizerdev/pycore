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
  Check,
  Activity,
  Search,
  ShoppingCart,
  Minus,
  X,
  Tag,
  Maximize2,
  Minimize2,
  History,
  Eye,
  AlertCircle,
  HelpCircle,
  QrCode,
  Share2,
  Printer,
  ChevronRight,
  Layers,
  CalendarCheck,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

import { ModuleHeader } from '../../components/common/ModuleHeader';
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
import { cajasApi, type Caja, type TurnoCaja, type Cobro, type CobroDetalleItem, type CobroPagoItem } from '../../api/cajas';
import { tasasApi, type TasasActualesResponse } from '../../api/tasas';
import { pacientesApi } from '../../api/pacientes';
import { serviciosApi } from '../../api/servicios';
import medicosApi from '../../api/medicos';
import { citasApi } from '../../api/citas';
import { consultasApi, type ConsultaMedica } from '../../api/consultas';
import { TurnoAperturaModal } from '../../components/facturacion/TurnoAperturaModal';
import { TurnoCierreModal } from '../../components/facturacion/TurnoCierreModal';
import { CobroReciboModal } from '../../components/facturacion/CobroReciboModal';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import type { Paciente, Servicio, Medico, CitaMedica } from '../../types';

// ==========================================
// Estructura de Pestaña Multi-Ticket (Estilo Quadralo)
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

export const PuntoCobroPage: React.FC = () => {
  const { user, sucursalActiva } = useAuth();
  const currentSucursalId = sucursalActiva?.id || 1;

  // Estado del Turno de Caja y Cajas disponibles
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [turnoActivo, setTurnoActivo] = useState<TurnoCaja | null>(null);
  const [loadingTurno, setLoadingTurno] = useState(true);

  // Modales de Turno y Recibo
  const [aperturaModalOpen, setAperturaModalOpen] = useState(false);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [reciboModalOpen, setReciboModalOpen] = useState(false);
  const [ultimoCobro, setUltimoCobro] = useState<Cobro | null>(null);

  // Modal de Pago Procesado (Quadralo Style)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [submittingCobro, setSubmittingCobro] = useState(false);

  // Modo Kiosco / Pantalla Completa
  const [isKioskMode, setIsKioskMode] = useState(false);

  // Tasas de Cambio Oficiales
  const [ratesData, setRatesData] = useState<TasasActualesResponse | null>(null);

  // Catálogo y Datos Maestros
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  // Datos Clínicos del Paciente Activo
  const [citasPendientes, setCitasPendientes] = useState<CitaMedica[]>([]);
  const [consultasFinalizadas, setConsultasFinalizadas] = useState<ConsultaMedica[]>([]);
  const [tabConsultas, setTabConsultas] = useState<'pendientes' | 'pagadas'>('pendientes');
  const [loadingConsultas, setLoadingConsultas] = useState<boolean>(false);
  const [showConsultasDrawer, setShowConsultasDrawer] = useState<boolean>(false);

  // Buscador y Filtro del Catálogo Táctil
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('todos');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // Pestañas Multi-Ticket (Quadralo System)
  // ==========================================
  const [tickets, setTickets] = useState<PosTicket[]>([
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
  ]);
  const [activeTicketId, setActiveTicketId] = useState<string>('ticket-1');

  // Ticket actualmente seleccionado
  const activeTicket = useMemo(() => {
    return tickets.find((t) => t.id === activeTicketId) || tickets[0];
  }, [tickets, activeTicketId]);

  // Actualizador de campos del ticket activo
  const updateActiveTicket = useCallback(
    (updates: Partial<PosTicket>) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === activeTicketId ? { ...t, ...updates } : t))
      );
    },
    [activeTicketId]
  );

  // Medios de pago para el modal de cobro
  const [pagos, setPagos] = useState<CobroPagoItem[]>([
    {
      metodo: 'efectivo_usd',
      moneda: 'USD',
      monto_moneda_origen: 30.0,
      banco_origen: '',
      referencia: '',
      notas: '',
    },
  ]);

  // Cargar estado inicial y maestros
  const loadInitialData = async () => {
    try {
      setLoadingTurno(true);
      const [cajasRes, turnoRes, ratesRes, servRes, medRes, pacRes] = await Promise.all([
        cajasApi.listCajas(currentSucursalId),
        cajasApi.getActiveTurno(),
        tasasApi.getCurrentRates(),
        serviciosApi.list({ activo: true }),
        medicosApi.list(),
        pacientesApi.list(),
      ]);

      setCajas(cajasRes || []);
      setTurnoActivo(turnoRes || null);
      setRatesData(ratesRes || null);
      setServicios(servRes || []);
      setMedicos(medRes || []);
      setPacientes(pacRes || []);
    } catch (err: any) {
      console.error('Error cargando datos iniciales del POS:', err);
      toast.error('Error al inicializar la terminal de cobro');
    } finally {
      setLoadingTurno(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [currentSucursalId]);

  // Tasa Oficial BCV activa y Moneda de Cobro
  const monedaReferencia = ratesData?.moneda_cobro_activa || 'USD';
  const tasaActiva = useMemo(() => {
    if (!ratesData) return 1.0;
    if (ratesData.tasa_cobro_activa) return ratesData.tasa_cobro_activa;
    const detail = ratesData.tasas?.[ratesData.moneda_cobro_activa];
    return detail?.tasa || 1.0;
  }, [ratesData]);

  // ==========================================
  // AUTO-CARGA DEL SERVICIO DESDE LA CITA MÉDICA
  // ==========================================
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
      setCitasPendientes([]);
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

    const pacienteIdNum = parseInt(pacienteIdStr, 10);
    try {
      setLoadingConsultas(true);
      const [citasRes, consultasRes] = await Promise.all([
        citasApi.list({ paciente_id: pacienteIdNum }),
        consultasApi.getConsultas({ paciente_id: pacienteIdNum, estado: 'finalizada' }),
      ]);

      setConsultasFinalizadas(consultasRes || []);

      // Filtrar citas pendientes de pago no canceladas
      const pendingCitas = (citasRes || []).filter(
        (c) => c.estado_pago === 'pendiente' && c.estado !== 'cancelada'
      );
      setCitasPendientes(pendingCitas);

      // ¡MAGIA DE AUTO-CARGA!:
      // Si el paciente tiene una cita médica con servicio asignado, precargar automáticamente en el ticket
      if (pendingCitas.length > 0) {
        const targetCita = pendingCitas[0];
        const servFound = servicios.find((s) => s.id === targetCita.servicio_id);
        const servNombre =
          servFound?.nombre || targetCita.servicio_nombre || 'Consulta Médica Especializada';
        const precioUnit = Number(targetCita.precio_estimado || servFound?.precio_base || 30.0);
        const tipo = (servFound?.categoria || '').toLowerCase().includes('odont')
          ? 'odontologia'
          : 'servicio';

        const autoItem: CobroDetalleItem = {
          servicio_id: targetCita.servicio_id || servFound?.id,
          tipo_concepto: tipo,
          descripcion: servNombre,
          cantidad: 1,
          precio_unitario_divisa: precioUnit,
          diente_fdi: null,
        };

        updateActiveTicket({
          pacienteId: pacienteIdStr,
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
          `✓ Servicio "${servNombre}" cargado automáticamente desde la cita médica del paciente.`,
          { duration: 4000 }
        );
      } else {
        updateActiveTicket({
          pacienteId: pacienteIdStr,
          autoLoadedInfo: null,
        });
      }
    } catch (err) {
      console.error('Error al consultar datos clínicos del paciente:', err);
    } finally {
      setLoadingConsultas(false);
    }
  };

  // Consultas pendientes y pagadas
  const consultasPendientes = useMemo(() => {
    return consultasFinalizadas.filter((c) => c.estado_pago !== 'pagado');
  }, [consultasFinalizadas]);

  const consultasPagadas = useMemo(() => {
    return consultasFinalizadas.filter((c) => c.estado_pago === 'pagado');
  }, [consultasFinalizadas]);

  // ==========================================
  // Manejador de Pestañas Multi-Ticket
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
    toast.info(`Nuevo Ticket #${nextNum} abierto en la terminal`);
  };

  const handleCloseTicket = (ticketId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tickets.length <= 1) {
      toast.info('Debe haber al menos un ticket activo en la terminal.');
      return;
    }
    const tToClose = tickets.find((t) => t.id === ticketId);
    if (tToClose && tToClose.detalles.length > 0) {
      if (
        !window.confirm(
          `¿Cerrar ${tToClose.name}? Tiene ${tToClose.detalles.length} concepto(s) en espera.`
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

  // ==========================================
  // Catálogo Táctil (Categorías y Búsqueda)
  // ==========================================
  const categoriasDisponibles = useMemo(() => {
    const cats = new Set<string>();
    servicios.forEach((s) => {
      if (s.categoria) cats.add(s.categoria);
    });
    return ['todos', ...Array.from(cats)];
  }, [servicios]);

  const filteredServicios = useMemo(() => {
    return servicios.filter((serv) => {
      const matchCat =
        selectedCategoria === 'todos' ||
        (serv.categoria && serv.categoria.toLowerCase() === selectedCategoria.toLowerCase());
      const query = searchCatalogQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        serv.nombre.toLowerCase().includes(query) ||
        (serv.codigo && serv.codigo.toLowerCase().includes(query));
      return matchCat && matchQuery;
    });
  }, [servicios, selectedCategoria, searchCatalogQuery]);

  // Agregar ítem desde el Catálogo Táctil al Carrito
  const handleAddServicioToCart = (serv: Servicio) => {
    const isOdonto = (serv.categoria || '').toLowerCase().includes('odont');
    const existingIndex = activeTicket.detalles.findIndex(
      (d) => d.servicio_id === serv.id && (!isOdonto || !d.diente_fdi)
    );

    if (existingIndex >= 0) {
      // Si ya está en el carrito, incrementar cantidad
      const newDetalles = [...activeTicket.detalles];
      newDetalles[existingIndex].cantidad += 1;
      updateActiveTicket({ detalles: newDetalles });
      toast.success(`+1 ${serv.nombre} agregado al ticket`);
    } else {
      // Agregar nuevo concepto
      const newItem: CobroDetalleItem = {
        servicio_id: serv.id,
        tipo_concepto: isOdonto ? 'odontologia' : 'servicio',
        descripcion: serv.nombre,
        cantidad: 1,
        precio_unitario_divisa: Number(serv.precio_base) || 30.0,
        diente_fdi: null,
      };
      updateActiveTicket({ detalles: [...activeTicket.detalles, newItem] });
      toast.success(`${serv.nombre} agregado al ticket`);
    }
  };

  // Modificar cantidad en carrito
  const handleUpdateItemQty = (index: number, delta: number) => {
    const newDetalles = [...activeTicket.detalles];
    const newQty = newDetalles[index].cantidad + delta;
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    newDetalles[index].cantidad = newQty;
    updateActiveTicket({ detalles: newDetalles });
  };

  // Eliminar ítem del carrito
  const handleRemoveItem = (index: number) => {
    const newDetalles = activeTicket.detalles.filter((_, i) => i !== index);
    updateActiveTicket({ detalles: newDetalles });
  };

  // Modificar precio unitario en carrito
  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const newDetalles = [...activeTicket.detalles];
    newDetalles[index].precio_unitario_divisa = Math.max(0, newPrice);
    updateActiveTicket({ detalles: newDetalles });
  };

  // Modificar diente FDI
  const handleUpdateItemTooth = (index: number, tooth: number | null) => {
    const newDetalles = [...activeTicket.detalles];
    newDetalles[index].diente_fdi = tooth;
    updateActiveTicket({ detalles: newDetalles });
  };

  // Vincular consulta médica
  const handleSelectConsulta = (consulta: ConsultaMedica) => {
    if (consulta.estado_pago === 'pagado') {
      toast.warning(`Esta consulta ya fue cobrada (${consulta.codigo || '#' + consulta.id}).`);
      return;
    }

    if (activeTicket.consultaId === String(consulta.id)) {
      updateActiveTicket({ consultaId: '' });
      toast.info(`Consulta ${consulta.codigo || '#' + consulta.id} desvinculada del ticket`);
      return;
    }

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

    toast.success(`Consulta ${consulta.codigo || '#' + consulta.id} vinculada al ticket`);
  };

  // ==========================================
  // Cálculos Financieros del Ticket Activo
  // ==========================================
  const subtotalFacturaDivisa = useMemo(() => {
    return activeTicket.detalles.reduce((acc, it) => {
      return acc + (Number(it.precio_unitario_divisa) || 0) * (Number(it.cantidad) || 1);
    }, 0);
  }, [activeTicket.detalles]);

  const totalFacturaDivisa = useMemo(() => {
    return Math.max(0, subtotalFacturaDivisa - (Number(activeTicket.descuentoDivisa) || 0));
  }, [subtotalFacturaDivisa, activeTicket.descuentoDivisa]);

  const totalFacturaVes = useMemo(() => {
    return totalFacturaDivisa * tasaActiva;
  }, [totalFacturaDivisa, tasaActiva]);

  // Cálculos de Pagos y Vueltos
  const totalAbonadoDivisa = useMemo(() => {
    return pagos.reduce((acc, p) => {
      const orig = Number(p.monto_moneda_origen) || 0;
      if (p.moneda === monedaReferencia) return acc + orig;
      if (p.moneda === 'VES') return acc + (tasaActiva > 0 ? orig / tasaActiva : 0);
      return acc + orig;
    }, 0);
  }, [pagos, monedaReferencia, tasaActiva]);

  const saldoPendienteDivisa = useMemo(() => {
    return Math.max(0, totalFacturaDivisa - totalAbonadoDivisa);
  }, [totalFacturaDivisa, totalAbonadoDivisa]);

  const vueltoDivisa = useMemo(() => {
    return Math.max(0, totalAbonadoDivisa - totalFacturaDivisa);
  }, [totalAbonadoDivisa, totalFacturaDivisa]);

  const vueltoVes = useMemo(() => {
    return vueltoDivisa * tasaActiva;
  }, [vueltoDivisa, tasaActiva]);

  // ==========================================
  // Atajos de Teclado (Quadralo Hotkeys)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        setIsKioskMode((prev) => !prev);
      } else if (e.key === 'F10') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (activeTicket.detalles.length > 0 && turnoActivo) {
          handleOpenPaymentModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTicket.detalles, turnoActivo, totalFacturaDivisa]);

  // Abrir Modal de Pagos
  const handleOpenPaymentModal = () => {
    if (!turnoActivo) {
      toast.error('Debe haber un turno de caja abierto para registrar cobros');
      setAperturaModalOpen(true);
      return;
    }
    if (!activeTicket.pacienteId) {
      toast.error('Seleccione un paciente para emitir el cobro');
      return;
    }
    if (activeTicket.detalles.length === 0) {
      toast.error('El ticket está vacío. Agregue al menos un servicio.');
      return;
    }
    if (totalFacturaDivisa <= 0) {
      toast.error('El total a cobrar debe ser mayor a cero.');
      return;
    }

    // Inicializar pago con el monto exacto en divisa
    setPagos([
      {
        metodo: monedaReferencia === 'EUR' ? 'efectivo_eur' : 'efectivo_usd',
        moneda: monedaReferencia as any,
        monto_moneda_origen: totalFacturaDivisa,
        referencia: '',
        banco_origen: '',
        notas: '',
      },
    ]);
    setIsPaymentModalOpen(true);
  };

  // Botones Rápidos de Denominaciones en Efectivo (Quadralo Style)
  const handleQuickAmount = (amount: number) => {
    setPagos([
      {
        metodo: monedaReferencia === 'EUR' ? 'efectivo_eur' : 'efectivo_usd',
        moneda: monedaReferencia as any,
        monto_moneda_origen: amount,
        referencia: '',
        banco_origen: '',
        notas: '',
      },
    ]);
  };

  // Agregar línea de pago mixto
  const handleAddPagoRow = () => {
    const falta = Math.round(saldoPendienteDivisa * 100) / 100;
    setPagos([
      ...pagos,
      {
        metodo: 'pago_movil',
        moneda: 'VES',
        monto_moneda_origen: Math.round(falta * tasaActiva * 100) / 100,
        referencia: '',
        banco_origen: '',
        notas: '',
      },
    ]);
  };

  const handleRemovePagoRow = (index: number) => {
    if (pagos.length <= 1) {
      toast.info('Debe mantenerse al menos un medio de pago');
      return;
    }
    setPagos(pagos.filter((_, i) => i !== index));
  };

  // Confirmar y Procesar Cobro
  const handleConfirmarCobro = async () => {
    if (!turnoActivo) return;
    if (saldoPendienteDivisa > 0.01) {
      toast.error(`Aún queda un saldo pendiente de ${monedaReferencia === 'EUR' ? '€' : '$'}${saldoPendienteDivisa.toFixed(2)} por cubrir.`);
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
        pagos,
      });

      toast.success(`¡Cobro exitoso! Recibo ${cobroGenerado.numero_recibo} emitido.`);
      setUltimoCobro(cobroGenerado);
      setIsPaymentModalOpen(false);
      setReciboModalOpen(true);

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

      // Refrescar turno
      const turnoUp = await cajasApi.getActiveTurno();
      setTurnoActivo(turnoUp);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al procesar el cobro');
    } finally {
      setSubmittingCobro(false);
    }
  };

  return (
    <div
      className={cn(
        'transition-all duration-200 select-none pb-12',
        isKioskMode
          ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 w-screen h-screen overflow-y-auto'
          : 'p-4 sm:p-6 space-y-4 max-w-[1750px] mx-auto'
      )}
    >
      {/* Banner de Kiosco Activo */}
      {isKioskMode && (
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md mb-2 shrink-0 border border-emerald-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wide">Terminal Kiosco POS Activo</span>
            <span className="text-[11px] text-emerald-200 hidden sm:inline">
              • Modo inmersivo de cobranza médica y odontológica
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs font-bold text-white hover:bg-white/20 gap-1.5 cursor-pointer rounded-lg"
            onClick={() => setIsKioskMode(false)}
          >
            <Minimize2 className="size-3.5" />
            Salir de Pantalla Completa [F11]
          </Button>
        </div>
      )}

      {/* Header estándar (oculto en modo kiosco) */}
      {!isKioskMode && (
        <ModuleHeader
          title="Terminal de Cobro & Caja POS"
          description="Gestión integral de recaudación médica y odontológica con cálculo en tiempo real según tasa oficial BCV."
          icon={<CircleDollarSign className="h-6 w-6 text-white" />}
        >
          <div className="flex items-center gap-2">
            {turnoActivo ? (
              <Button
                variant="outline"
                onClick={() => setCierreModalOpen(true)}
                className="gap-2 cursor-pointer border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs h-9"
              >
                <Lock className="w-3.5 h-3.5" />
                Cerrar Turno & Arqueo
              </Button>
            ) : (
              <Button
                onClick={() => setAperturaModalOpen(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-500/20 text-xs h-9"
              >
                <LockOpen className="w-3.5 h-3.5" />
                Abrir Turno de Caja
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setIsKioskMode(true)}
              className="gap-1.5 text-xs h-9 cursor-pointer text-slate-700 dark:text-slate-200"
              title="Modo pantalla completa [F11]"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Kiosco</span> [F11]
            </Button>
          </div>
        </ModuleHeader>
      )}

      {/* Barra de Estado Rápida: Caja + Tasa Oficial BCV + Botón Cobro Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Estado de Turno */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                turnoActivo ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
              )}
            >
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-medium">Estado de Caja</span>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                {turnoActivo ? (
                  <>
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    Turno Abierto ({turnoActivo.caja_nombre || 'Caja Principal'})
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                    Caja Cerrada
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Tasa Oficial BCV */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 via-slate-900/5 to-transparent border border-indigo-500/20 shadow-2xs flex items-center justify-between md:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 text-sm">
              {monedaReferencia === 'EUR' ? '€' : '$'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                  Tasa Oficial Activa (BCV)
                </span>
                <Badge className="bg-indigo-600 text-white text-[8.5px] py-0 h-4">Oficial</Badge>
              </div>
              <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white font-mono">
                1 {monedaReferencia} = Bs.{' '}
                {tasaActiva.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 block">Base de recaudación:</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {monedaReferencia === 'EUR' ? 'Euro Oficial BCV' : 'Dólar Oficial BCV'}
            </span>
          </div>
        </div>

        {/* Acceso Rápido F12 Cobro */}
        <div className="flex items-center">
          <Button
            type="button"
            onClick={handleOpenPaymentModal}
            disabled={activeTicket.detalles.length === 0 || !turnoActivo}
            className="w-full h-full min-h-[50px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm gap-2 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            <Coins className="w-5 h-5 text-emerald-200" />
            <div className="text-left">
              <span className="block text-[10px] uppercase font-bold text-emerald-100">
                [F12] Cobro Rápido
              </span>
              <span>
                {monedaReferencia === 'EUR' ? '€' : '$'}
                {totalFacturaDivisa.toFixed(2)}
              </span>
            </div>
          </Button>
        </div>
      </div>

      {/* PESTAÑAS MULTI-TICKET (QUADRALO SYSTEM) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {tickets.map((ticket) => {
            const isSelected = activeTicketId === ticket.id;
            const itemsCount = ticket.detalles.reduce((a, b) => a + (b.cantidad || 1), 0);
            return (
              <div
                key={ticket.id}
                onClick={() => setActiveTicketId(ticket.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-bold cursor-pointer transition-all border border-b-0 whitespace-nowrap',
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                )}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{ticket.name}</span>
                {itemsCount > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'px-1.5 py-0 text-[9.5px] font-mono h-4',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {itemsCount}
                  </Badge>
                )}
                {tickets.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTicket(ticket.id, e)}
                    className="ml-1 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Cerrar ticket"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddTicket}
          className="h-8 text-xs font-bold gap-1 cursor-pointer shrink-0 border-dashed border-emerald-400 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo Ticket</span>
        </Button>
      </div>

      {/* CONTENEDOR PRINCIPAL POS: CATÁLOGO TÁCTIL (IZQUIERDA) + TICKET EN CURSO (DERECHA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ==================================================== */}
        {/* COLUMNA IZQUIERDA: CATÁLOGO TÁCTIL Y BUSCADOR (7 cols) */}
        {/* ==================================================== */}
        <div className="lg:col-span-7 space-y-3 flex flex-col">
          {/* Barra de Búsqueda Rápida + Atajo F10 */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
            <Input
              ref={searchInputRef}
              value={searchCatalogQuery}
              onChange={(e) => setSearchCatalogQuery(e.target.value)}
              placeholder="Buscar servicio por nombre, código o procedimiento... [F10]"
              className="pl-10 pr-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs font-medium"
            />
            {searchCatalogQuery && (
              <button
                type="button"
                onClick={() => setSearchCatalogQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Categorías en Chips Horizontales (Quadralo Style) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
            {categoriasDisponibles.map((cat) => {
              const isSelected = selectedCategoria.toLowerCase() === cat.toLowerCase();
              const count =
                cat === 'todos'
                  ? servicios.length
                  : servicios.filter(
                      (s) => s.categoria && s.categoria.toLowerCase() === cat.toLowerCase()
                    ).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoria(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5',
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  <span className="capitalize">{cat === 'todos' ? 'Todos los Servicios' : cat}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Banner de Consultas del Paciente (si tiene finalizadas) */}
          {activeTicket.pacienteId && (consultasPendientes.length > 0 || consultasPagadas.length > 0) && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Consultas Médicas Registradas:
                </span>
                <Badge className="bg-emerald-600 text-white text-[9.5px]">
                  {consultasPendientes.length} Pendientes
                </Badge>
                {consultasPagadas.length > 0 && (
                  <Badge variant="outline" className="text-teal-700 border-teal-300 text-[9.5px]">
                    {consultasPagadas.length} Pagadas
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConsultasDrawer((prev) => !prev)}
                className="h-6 px-2 text-[10px] font-bold text-teal-700 border-teal-300 hover:bg-teal-50 cursor-pointer"
              >
                {showConsultasDrawer ? 'Ocultar Consultas' : 'Ver Consultas'}
              </Button>
            </div>
          )}

          {/* Acordeón de Consultas Médicas del Paciente */}
          {showConsultasDrawer && activeTicket.pacienteId && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  Consultas Médicas del Paciente
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTabConsultas('pendientes')}
                    className={cn(
                      'px-2 py-0.5 rounded font-bold transition-all',
                      tabConsultas === 'pendientes'
                        ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-2xs'
                        : 'text-slate-500'
                    )}
                  >
                    Listas para Cobro ({consultasPendientes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabConsultas('pagadas')}
                    className={cn(
                      'px-2 py-0.5 rounded font-bold transition-all',
                      tabConsultas === 'pagadas'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 shadow-2xs'
                        : 'text-slate-500'
                    )}
                  >
                    Ya Cobradas ({consultasPagadas.length})
                  </button>
                </div>
              </div>

              {tabConsultas === 'pendientes' ? (
                consultasPendientes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">
                    No hay consultas pendientes de cobro para este paciente.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {consultasPendientes.map((c) => {
                      const isLinked = activeTicket.consultaId === String(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelectConsulta(c)}
                          className={cn(
                            'p-2.5 rounded-lg border text-left text-xs cursor-pointer transition-all flex flex-col justify-between gap-1.5',
                            isLinked
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50/50 border-slate-200 dark:border-slate-700'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[10px]">
                              {c.codigo || `CON-#${c.id}`}
                            </span>
                            <span
                              className={cn(
                                'text-[9.5px] px-1.5 py-0.2 rounded font-bold',
                                isLinked ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                              )}
                            >
                              {isLinked ? '✓ Vinculada' : '+ Vincular'}
                            </span>
                          </div>
                          <span className="font-semibold block truncate">
                            Dr(a). {c.medico ? `${c.medico.nombres} ${c.medico.apellidos}` : 'Médico'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {c.especialidad?.nombre || 'General'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : consultasPagadas.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  No hay consultas cobradas previamente registradas.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {consultasPagadas.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg border border-teal-500/20 bg-teal-50/20 text-left text-xs flex flex-col justify-between gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[10px] text-teal-800">
                          {c.codigo || `CON-#${c.id}`}
                        </span>
                        <Badge className="bg-teal-600 text-white text-[9px] py-0 h-4">✓ Pagada</Badge>
                      </div>
                      <span className="font-semibold text-slate-700 block truncate">
                        Dr(a). {c.medico ? `${c.medico.nombres} ${c.medico.apellidos}` : 'Médico'}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {c.especialidad?.nombre || 'General'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grilla de Servicios Táctil (Quadralo Style) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto max-h-[580px] pr-1 pb-4">
            {filteredServicios.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 border rounded-xl text-slate-400 text-xs">
                No se encontraron servicios que coincidan con la búsqueda.
              </div>
            ) : (
              filteredServicios.map((serv) => {
                const precioDiv = Number(serv.precio_base) || 0;
                const precioBs = precioDiv * tasaActiva;
                const enTicketCount = activeTicket.detalles
                  .filter((d) => d.servicio_id === serv.id)
                  .reduce((a, b) => a + (b.cantidad || 1), 0);

                return (
                  <div
                    key={serv.id}
                    onClick={() => handleAddServicioToCart(serv)}
                    className={cn(
                      'p-3 rounded-xl border bg-white dark:bg-slate-900 flex flex-col justify-between gap-2 cursor-pointer transition-all duration-150 select-none group shadow-2xs hover:shadow-md hover:border-emerald-500 dark:hover:border-emerald-500 active:scale-97 relative overflow-hidden',
                      enTicketCount > 0 ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'
                    )}
                  >
                    {/* Badge contador de ítems en carrito */}
                    {enTicketCount > 0 && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[9px] shadow-xs">
                        {enTicketCount} en ticket
                      </span>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 block truncate">
                          {serv.codigo || `SKU-${serv.id}`}
                        </span>
                        {serv.categoria && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold truncate">
                            {serv.categoria}
                          </span>
                        )}
                      </div>
                      <h4
                        className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-2 leading-tight"
                        title={serv.nombre}
                      >
                        {serv.nombre}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                      <div>
                        <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                          {monedaReferencia === 'EUR' ? '€' : '$'}
                          {precioDiv.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Bs. {precioBs.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        +
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* COLUMNA DERECHA: TICKET ACTIVO Y CARRITO POS (5 cols) */}
        {/* ==================================================== */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
            {/* Header del Ticket Activo */}
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {activeTicket.name}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-50">
                  {activeTicket.detalles.length} concepto(s)
                </Badge>
              </div>

              {activeTicket.detalles.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateActiveTicket({ detalles: [] })}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Vaciar ticket
                </button>
              )}
            </div>

            {/* Selector de Paciente */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Paciente *</span>
                {activeTicket.pacienteId && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Paciente Activo
                  </span>
                )}
              </Label>
              <Select
                value={activeTicket.pacienteId}
                onValueChange={handleSelectPaciente}
              >
                <SelectTrigger className="h-10 text-xs bg-slate-50 dark:bg-slate-800/80 rounded-xl">
                  <SelectValue placeholder="Seleccione o busque paciente..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.nombres} {p.apellidos} {p.documento_identidad ? `(CI: ${p.documento_identidad})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aviso de Auto-Carga desde Cita Médica */}
            {activeTicket.autoLoadedInfo && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Auto-cargado desde cita: <strong>{activeTicket.autoLoadedInfo.servicioNombre}</strong>
                  </span>
                </span>
                <span className="text-[10px] font-bold font-mono">
                  {monedaReferencia === 'EUR' ? '€' : '$'}
                  {activeTicket.autoLoadedInfo.precio.toFixed(2)}
                </span>
              </div>
            )}

            {/* Selector Opcional de Médico Asignado */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Médico / Especialista (Opcional)
              </Label>
              <Select
                value={activeTicket.medicoId}
                onValueChange={(val) => updateActiveTicket({ medicoId: val })}
              >
                <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-800/80 rounded-xl">
                  <SelectValue placeholder="Vincular médico a la transacción..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="">Ninguno / Particular</SelectItem>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                      Dr(a). {m.nombres} {m.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Carrito: Lista de Conceptos a Cobrar */}
            <div className="space-y-2 pt-1">
              <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Conceptos a Cobrar</span>
                <span className="text-[10px] text-slate-400">Total ítems: {activeTicket.detalles.length}</span>
              </Label>

              {activeTicket.detalles.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">El carrito está vacío</p>
                  <p className="text-[10px]">
                    Selecciona un paciente con cita previa o haz clic en cualquier servicio del catálogo para agregarlo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {activeTicket.detalles.map((it, idx) => {
                    const subtotal = (Number(it.precio_unitario_divisa) || 0) * (Number(it.cantidad) || 1);
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">
                              {it.descripcion}
                            </span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                                {it.tipo_concepto}
                              </Badge>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {monedaReferencia === 'EUR' ? '€' : '$'}
                                {Number(it.precio_unitario_divisa).toFixed(2)} c/u
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                            title="Eliminar del ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Selector de Diente FDI si es odontología */}
                        {it.tipo_concepto === 'odontologia' && (
                          <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                            <span className="text-slate-500 font-medium">Diente FDI:</span>
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
                              className="h-6 w-18 text-xs font-mono"
                            />
                          </div>
                        )}

                        {/* Controles de Cantidad y Subtotal */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, -1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold font-mono text-xs">
                              {it.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                              {monedaReferencia === 'EUR' ? '€' : '$'}
                              {subtotal.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Bs. {(subtotal * tasaActiva).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Descuento Opcional */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-semibold text-slate-600">Descuento ({monedaReferencia}):</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={activeTicket.descuentoDivisa || ''}
                onChange={(e) =>
                  updateActiveTicket({ descuentoDivisa: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
                className="h-7 w-24 text-right font-mono text-xs"
              />
            </div>

            {/* Bloque Resumen de Totales */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1.5 shadow-md">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Subtotal:</span>
                <span className="font-mono">
                  {monedaReferencia === 'EUR' ? '€' : '$'}
                  {subtotalFacturaDivisa.toFixed(2)}
                </span>
              </div>
              {activeTicket.descuentoDivisa > 0 && (
                <div className="flex justify-between text-xs text-rose-300">
                  <span>Descuento:</span>
                  <span className="font-mono">
                    -{monedaReferencia === 'EUR' ? '€' : '$'}
                    {activeTicket.descuentoDivisa.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-2 flex items-baseline justify-between">
                <span className="font-extrabold text-sm uppercase tracking-wide">TOTAL A COBRAR:</span>
                <span className="font-black text-2xl font-mono text-emerald-400">
                  {monedaReferencia === 'EUR' ? '€' : '$'}
                  {totalFacturaDivisa.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-300 pt-0.5">
                <span>Equivalente BCV:</span>
                <span className="font-bold text-white">
                  Bs. {totalFacturaVes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Botón Principal para Emitir y Cobrar */}
            <Button
              type="button"
              onClick={handleOpenPaymentModal}
              disabled={activeTicket.detalles.length === 0 || !turnoActivo}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm gap-2 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              <Coins className="w-5 h-5 text-emerald-200" />
              <span>[F12] Procesar Cobro & Emitir Recibo</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL DE PROCESAMIENTO DE PAGO (QUADRALO STYLE) */}
      {/* ==================================================== */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-lg font-black">
              <Coins className="w-5 h-5 text-emerald-600" />
              Procesar Cobro & Emisión de Recibo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Transacción para {activeTicket.name} • Tasa Oficial BCV: Bs. {tasaActiva.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>

          {/* Hero Banner del Total */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">
                TOTAL A PAGAR
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {monedaReferencia === 'EUR' ? '€' : '$'}
                {totalFacturaDivisa.toFixed(2)}
              </span>
              <span className="text-xs text-slate-300 block font-mono">
                Bs. {totalFacturaVes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">
                {saldoPendienteDivisa > 0 ? 'FALTA POR PAGAR' : 'VUELTO / CAMBIO'}
              </span>
              <span
                className={cn(
                  'text-xl sm:text-2xl font-black font-mono',
                  saldoPendienteDivisa > 0 ? 'text-amber-400' : 'text-emerald-400'
                )}
              >
                {monedaReferencia === 'EUR' ? '€' : '$'}
                {saldoPendienteDivisa > 0 ? saldoPendienteDivisa.toFixed(2) : vueltoDivisa.toFixed(2)}
              </span>
              {vueltoDivisa > 0 && (
                <span className="text-xs text-emerald-200 block font-mono">
                  (Bs. {vueltoVes.toLocaleString('es-ES', { minimumFractionDigits: 2 })})
                </span>
              )}
            </div>
          </div>

          {/* Botonera Rápida de Billetes en Efectivo (Quadralo Style) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Billetes Rápidos en Efectivo ({monedaReferencia}):
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickAmount(totalFacturaDivisa)}
                className="py-1.5 px-2 rounded-lg bg-emerald-600 text-white font-extrabold text-xs cursor-pointer hover:bg-emerald-700 shadow-2xs"
              >
                Exacto
              </button>
              {[5, 10, 20, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs cursor-pointer hover:bg-slate-200 shadow-2xs font-mono"
                >
                  {monedaReferencia === 'EUR' ? '€' : '$'}{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Desglose de Medios de Pago Mixto */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                Medios de Pago Aplicados:
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddPagoRow}
                className="h-7 text-[11px] gap-1 font-bold text-emerald-700 border-emerald-300"
              >
                <Plus className="w-3 h-3" />
                Agregar Medio
              </Button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {pagos.map((p, pIdx) => (
                <div
                  key={pIdx}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Método de Pago */}
                    <div className="sm:col-span-5">
                      <Select
                        value={p.metodo}
                        onValueChange={(val) => {
                          const newPagos = [...pagos];
                          newPagos[pIdx].metodo = val;
                          if (val === 'efectivo_usd' || val === 'zelle') {
                            newPagos[pIdx].moneda = 'USD';
                          } else if (val === 'efectivo_eur') {
                            newPagos[pIdx].moneda = 'EUR';
                          } else {
                            newPagos[pIdx].moneda = 'VES';
                          }
                          setPagos(newPagos);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="efectivo_usd">Efectivo Dólares ($)</SelectItem>
                          <SelectItem value="efectivo_eur">Efectivo Euros (€)</SelectItem>
                          <SelectItem value="efectivo_ves">Efectivo Bolívares (Bs.)</SelectItem>
                          <SelectItem value="pago_movil">Pago Móvil (VES)</SelectItem>
                          <SelectItem value="punto_venta">Punto de Venta / Tarjeta</SelectItem>
                          <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                          <SelectItem value="zelle">Zelle ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Monto en Moneda Origen */}
                    <div className="sm:col-span-4 flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={p.monto_moneda_origen || ''}
                        onChange={(e) => {
                          const newPagos = [...pagos];
                          newPagos[pIdx].monto_moneda_origen = parseFloat(e.target.value) || 0;
                          setPagos(newPagos);
                        }}
                        className="h-8 text-xs font-mono font-bold text-right"
                      />
                      <span className="text-[10px] font-bold font-mono text-slate-500 w-10">
                        {p.moneda}
                      </span>
                    </div>

                    {/* Referencia opcional y Botón Eliminar */}
                    <div className="sm:col-span-3 flex items-center gap-1">
                      <Input
                        type="text"
                        placeholder="Ref..."
                        value={p.referencia || ''}
                        onChange={(e) => {
                          const newPagos = [...pagos];
                          newPagos[pIdx].referencia = e.target.value;
                          setPagos(newPagos);
                        }}
                        className="h-8 text-[11px]"
                      />
                      {pagos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePagoRow(pIdx)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentModalOpen(false)}
              className="text-xs"
            >
              Regresar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarCobro}
              disabled={submittingCobro || saldoPendienteDivisa > 0.01}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              {submittingCobro ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Emitiendo Recibo...
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  Confirmar Pago & Imprimir Ticket 80mm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modales de Gestión de Caja y Recibo Térmico */}
      <TurnoAperturaModal
        open={aperturaModalOpen}
        onOpenChange={setAperturaModalOpen}
        cajas={cajas}
        sucursalId={currentSucursalId}
        onTurnoOpened={(t) => setTurnoActivo(t)}
      />

      {turnoActivo && (
        <TurnoCierreModal
          open={cierreModalOpen}
          onOpenChange={setCierreModalOpen}
          turno={turnoActivo}
          onTurnoClosed={() => setTurnoActivo(null)}
        />
      )}

      <CobroReciboModal
        open={reciboModalOpen}
        onOpenChange={setReciboModalOpen}
        cobro={ultimoCobro}
      />
    </div>
  );
};

export default PuntoCobroPage;
