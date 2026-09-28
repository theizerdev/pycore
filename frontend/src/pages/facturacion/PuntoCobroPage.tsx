import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CircleDollarSign,
  Plus,
  Trash2,
  Wallet,
  LockOpen,
  Lock,
  Receipt,
  User,
  Calendar,
  CreditCard,
  Coins,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Stethoscope,
  FileCheck,
  Clock,
  Check,
  Activity,
  Search,
  ShoppingCart,
  Minus,
  X,
  Tag
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

  // Tasas de Cambio Oficiales
  const [ratesData, setRatesData] = useState<TasasActualesResponse | null>(null);

  // Datos para el Cobro
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [citasPendientes, setCitasPendientes] = useState<CitaMedica[]>([]);

  // Formulario de Cobro
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>('');
  const [selectedMedicoId, setSelectedMedicoId] = useState<string>('');
  const [selectedCitaId, setSelectedCitaId] = useState<string>('');
  const [selectedConsultaId, setSelectedConsultaId] = useState<string>('');
  const [consultasFinalizadas, setConsultasFinalizadas] = useState<ConsultaMedica[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState<boolean>(false);
  const [descuentoDivisa, setDescuentoDivisa] = useState<number>(0);
  const [notasCobro, setNotasCobro] = useState<string>('');
  const [submittingCobro, setSubmittingCobro] = useState(false);

  // Buscador de Servicios en Tiempo Real y Carrito POS
  const [searchServicioQuery, setSearchServicioQuery] = useState('');
  const [selectedCategoriaFilter, setSelectedCategoriaFilter] = useState('todos');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Ítems a cobrar (Carrito)
  const [detalles, setDetalles] = useState<CobroDetalleItem[]>([
    {
      tipo_concepto: 'consulta',
      descripcion: 'Consulta Médica General',
      cantidad: 1,
      precio_unitario_divisa: 30.00,
      diente_fdi: null
    }
  ]);

  // Medios de pago (Pago Mixto)
  const [pagos, setPagos] = useState<CobroPagoItem[]>([
    {
      metodo: 'efectivo_usd',
      moneda: 'USD',
      monto_moneda_origen: 30.00,
      banco_origen: '',
      referencia: '',
      notas: ''
    }
  ]);

  // Cargar estado inicial
  const loadInitialData = async () => {
    try {
      setLoadingTurno(true);
      const [cajasRes, turnoRes, ratesRes, servRes, medRes] = await Promise.all([
        cajasApi.listCajas(currentSucursalId),
        cajasApi.getActiveTurno(),
        tasasApi.getCurrentRates(),
        serviciosApi.list({ sucursal_id: currentSucursalId, include_global: true, activo: true }),
        medicosApi.list({ sucursal_id: currentSucursalId, activo: true }),
      ]);

      setCajas(cajasRes);
      setTurnoActivo(turnoRes);
      setRatesData(ratesRes);
      setServicios(servRes);
      setMedicos(medRes);
    } catch (err: any) {
      toast.error('Error al inicializar el punto de cobro');
    } finally {
      setLoadingTurno(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [currentSucursalId]);

  // Buscar pacientes al tipear o seleccionar
  const [searchPacienteText, setSearchPacienteText] = useState('');
  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        const res = await pacientesApi.list({ q: searchPacienteText, limit: 15 });
        setPacientes(res);
      } catch (e) {
        // Silencioso
      }
    };
    const timer = setTimeout(fetchPacientes, 300);
    return () => clearTimeout(timer);
  }, [searchPacienteText]);

  // Si cambia el paciente seleccionado, buscar citas pendientes y consultas finalizadas listas para cobro
  useEffect(() => {
    if (!selectedPacienteId) {
      setCitasPendientes([]);
      setConsultasFinalizadas([]);
      setSelectedCitaId('');
      setSelectedConsultaId('');
      return;
    }

    const pacienteIdNum = parseInt(selectedPacienteId, 10);

    // 1. Citas médicas confirmadas pendientes de cobro
    const fetchCitas = async () => {
      try {
        const res = await citasApi.list({
          paciente_id: pacienteIdNum,
          estado: 'confirmada',
        });
        const pendientes = res.filter((c) => c.estado_pago === 'pendiente');
        setCitasPendientes(pendientes);
      } catch (e) {
        // Silencioso
      }
    };

    // 2. Consultas médicas finalizadas asociadas a médicos para recaudación
    const fetchConsultas = async () => {
      try {
        setLoadingConsultas(true);
        const res = await consultasApi.getConsultas({
          paciente_id: pacienteIdNum,
          estado: 'finalizada',
        });
        setConsultasFinalizadas(res || []);
      } catch (e) {
        // Silencioso
      } finally {
        setLoadingConsultas(false);
      }
    };

    fetchCitas();
    fetchConsultas();
  }, [selectedPacienteId]);

  // Auto-completar servicio y médico al vincular una cita médica
  const handleSelectCita = (citaIdStr: string) => {
    setSelectedCitaId(citaIdStr);
    if (!citaIdStr) return;
    const cita = citasPendientes.find((c) => c.id === parseInt(citaIdStr, 10));
    if (cita) {
      if (cita.medico_id) setSelectedMedicoId(String(cita.medico_id));
      const serv = servicios.find((s) => s.id === cita.servicio_id);
      if (serv) {
        setDetalles([
          {
            servicio_id: serv.id,
            tipo_concepto: 'servicio',
            descripcion: serv.nombre,
            cantidad: 1,
            precio_unitario_divisa: Number(serv.precio_base) || 30.00,
            diente_fdi: null,
          }
        ]);
      }
    }
  };

  // Vincular consulta médica finalizada al cobro actual
  const handleSelectConsulta = (consulta: ConsultaMedica) => {
    if (selectedConsultaId === String(consulta.id)) {
      // Si ya estaba seleccionada, deseleccionar
      setSelectedConsultaId('');
      toast.info(`Consulta ${consulta.codigo || `#${consulta.id}`} desvinculada del cobro`);
      return;
    }

    setSelectedConsultaId(String(consulta.id));

    // Asignar médico automáticamente
    if (consulta.medico_id) {
      setSelectedMedicoId(String(consulta.medico_id));
    }

    // Si la consulta tiene cita asociada, vincularla también
    if (consulta.cita_id) {
      setSelectedCitaId(String(consulta.cita_id));
    }

    // Auto-agregar o actualizar concepto en detalles de cobro
    const docNombre = consulta.medico
      ? `${consulta.medico.nombres} ${consulta.medico.apellidos}`.trim()
      : '';
    const espNombre = consulta.especialidad?.nombre || 'Medicina General';
    const conceptoDesc = `Consulta Médica - ${espNombre}${docNombre ? ` (Dr. ${docNombre})` : ''}`;

    // Precio sugerido según la cita o base estándar
    const precioEstimado = consulta.cita?.precio_estimado ? Number(consulta.cita.precio_estimado) : 30.00;

    // Si solo hay un concepto default inicial sin modificar, reemplazarlo; sino agregar el nuevo
    const isDefaultItem =
      detalles.length === 1 &&
      detalles[0].descripcion === 'Consulta Médica General' &&
      detalles[0].precio_unitario_divisa === 30;

    const nuevoDetalle: CobroDetalleItem = {
      tipo_concepto: 'consulta',
      descripcion: conceptoDesc,
      cantidad: 1,
      precio_unitario_divisa: precioEstimado > 0 ? precioEstimado : 30.00,
      diente_fdi: null,
    };

    if (isDefaultItem) {
      setDetalles([nuevoDetalle]);
    } else {
      const yaExiste = detalles.some((d) => d.descripcion === conceptoDesc);
      if (!yaExiste) {
        setDetalles((prev) => [...prev, nuevoDetalle]);
      }
    }

    toast.success(
      `Consulta ${consulta.codigo || `#${consulta.id}`} vinculada. Médico: Dr(a). ${docNombre || 'Asignado'}`
    );
  };

  // Tasa de cambio activa seleccionada (USD o EUR)
  const monedaReferencia = ratesData?.moneda_cobro_activa || 'USD';
  const tasaActiva = useMemo(() => {
    if (ratesData?.tasa_cobro_activa && ratesData.tasa_cobro_activa > 0) {
      return ratesData.tasa_cobro_activa;
    }
    const rateObj = monedaReferencia === 'EUR' ? ratesData?.tasas?.EUR : ratesData?.tasas?.USD;
    return rateObj?.tasa || 1.0;
  }, [ratesData, monedaReferencia]);

  // Cálculos de Totales en Divisa y VES
  const subtotalDivisa = useMemo(() => {
    return detalles.reduce((acc, curr) => acc + (Number(curr.precio_unitario_divisa || 0) * Number(curr.cantidad || 1)), 0);
  }, [detalles]);

  const totalFacturaDivisa = useMemo(() => {
    return Math.max(0, subtotalDivisa - (Number(descuentoDivisa) || 0));
  }, [subtotalDivisa, descuentoDivisa]);

  const totalFacturaVes = useMemo(() => {
    return totalFacturaDivisa * tasaActiva;
  }, [totalFacturaDivisa, tasaActiva]);

  // Cálculo del total abonado a través de pagos mixtos
  const totalPagadoEquivalenteDivisa = useMemo(() => {
    return pagos.reduce((acc, p) => {
      const monto = Number(p.monto_moneda_origen) || 0;
      if (p.moneda === monedaReferencia) {
        return acc + monto;
      }
      if (p.moneda === 'VES') {
        return acc + (tasaActiva > 0 ? monto / tasaActiva : 0);
      }
      return acc + monto;
    }, 0);
  }, [pagos, monedaReferencia, tasaActiva]);

  const saldoPendienteDivisa = useMemo(() => {
    return Math.max(0, totalFacturaDivisa - totalPagadoEquivalenteDivisa);
  }, [totalFacturaDivisa, totalPagadoEquivalenteDivisa]);

  const vueltoDivisa = useMemo(() => {
    return Math.max(0, totalPagadoEquivalenteDivisa - totalFacturaDivisa);
  }, [totalPagadoEquivalenteDivisa, totalFacturaDivisa]);

  // Categorías de servicios disponibles para filtros rápidos
  const categoriasDisponibles = useMemo(() => {
    const cats = new Set<string>();
    servicios.forEach((s) => {
      if (s.categoria && s.categoria.trim()) {
        cats.add(s.categoria.trim());
      }
    });
    return Array.from(cats);
  }, [servicios]);

  // Filtrado de servicios en tiempo real por texto (nombre, código, especialidad) y categoría
  const filteredServicios = useMemo(() => {
    let list = servicios;

    if (selectedCategoriaFilter !== 'todos') {
      list = list.filter(
        (s) => (s.categoria || '').toLowerCase() === selectedCategoriaFilter.toLowerCase()
      );
    }

    const q = searchServicioQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const nombreMatch = s.nombre.toLowerCase().includes(q);
        const codigoMatch = s.codigo ? s.codigo.toLowerCase().includes(q) : false;
        const catMatch = s.categoria ? s.categoria.toLowerCase().includes(q) : false;
        const espMatch = s.especialidad?.nombre ? s.especialidad.nombre.toLowerCase().includes(q) : false;
        return nombreMatch || codigoMatch || catMatch || espMatch;
      });
    }

    return list;
  }, [servicios, selectedCategoriaFilter, searchServicioQuery]);

  // Agregar un servicio del catálogo al carrito (estilo POS)
  const handleAddServicioToCart = (servicio: Servicio) => {
    const existingIndex = detalles.findIndex(
      (d) => (d.servicio_id && d.servicio_id === servicio.id) || d.descripcion.toLowerCase() === servicio.nombre.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Incrementar cantidad si ya existe
      const copy = [...detalles];
      copy[existingIndex] = {
        ...copy[existingIndex],
        cantidad: (copy[existingIndex].cantidad || 1) + 1,
      };
      setDetalles(copy);
      toast.success(`+1 "${servicio.nombre}" agregado al carrito (Cant: ${copy[existingIndex].cantidad})`);
    } else {
      // Si el carrito solo contiene el concepto genérico por defecto sin editar, reemplazarlo
      const isDefaultItem =
        detalles.length === 1 &&
        detalles[0].descripcion === 'Consulta Médica General' &&
        detalles[0].precio_unitario_divisa === 30 &&
        !detalles[0].servicio_id;

      const catLower = (servicio.categoria || '').toLowerCase();
      const tipoConcepto = catLower.includes('odontolog')
        ? 'odontologia'
        : catLower.includes('consulta')
        ? 'consulta'
        : catLower.includes('estudio') || catLower.includes('laboratorio')
        ? 'estudio'
        : 'servicio';

      const newItem: CobroDetalleItem = {
        servicio_id: servicio.id,
        tipo_concepto: tipoConcepto,
        descripcion: servicio.nombre,
        cantidad: 1,
        precio_unitario_divisa: Number(servicio.precio_base) || 0,
        diente_fdi: tipoConcepto === 'odontologia' ? 16 : null,
      };

      if (isDefaultItem) {
        setDetalles([newItem]);
      } else {
        setDetalles((prev) => [...prev, newItem]);
      }

      toast.success(`"${servicio.nombre}" agregado al carrito`);
    }

    setSearchServicioQuery('');
    setIsSearchDropdownOpen(false);
  };

  // Manejadores del Carrito (Steppers, ediciones y borrado)
  const handleIncrementCantidad = (index: number) => {
    const copy = [...detalles];
    copy[index] = { ...copy[index], cantidad: (copy[index].cantidad || 1) + 1 };
    setDetalles(copy);
  };

  const handleDecrementCantidad = (index: number) => {
    const copy = [...detalles];
    if ((copy[index].cantidad || 1) > 1) {
      copy[index] = { ...copy[index], cantidad: (copy[index].cantidad || 1) - 1 };
      setDetalles(copy);
    } else {
      handleRemoveDetalle(index);
    }
  };

  const handleUpdateCantidad = (index: number, val: number) => {
    const copy = [...detalles];
    copy[index] = { ...copy[index], cantidad: Math.max(1, isNaN(val) ? 1 : val) };
    setDetalles(copy);
  };

  const handleUpdatePrecio = (index: number, val: number) => {
    const copy = [...detalles];
    copy[index] = { ...copy[index], precio_unitario_divisa: Math.max(0, isNaN(val) ? 0 : val) };
    setDetalles(copy);
  };

  const handleUpdateDescripcion = (index: number, val: string) => {
    const copy = [...detalles];
    copy[index] = { ...copy[index], descripcion: val };
    setDetalles(copy);
  };

  const handleUpdateDienteFdi = (index: number, val: number | null) => {
    const copy = [...detalles];
    copy[index] = { ...copy[index], diente_fdi: val };
    setDetalles(copy);
  };

  const handleRemoveDetalle = (index: number) => {
    const itemEliminado = detalles[index];
    setDetalles(detalles.filter((_, i) => i !== index));
    if (itemEliminado) {
      toast.info(`"${itemEliminado.descripcion}" eliminado del carrito`);
    }
  };

  const handleClearCart = () => {
    setDetalles([]);
    toast.info('Carrito de conceptos vaciado');
  };

  const handleAddDetalle = (tipo: string = 'servicio') => {
    setDetalles([
      ...detalles,
      {
        tipo_concepto: tipo,
        descripcion: tipo === 'odontologia' ? 'Procedimiento Dental' : 'Servicio Clínico',
        cantidad: 1,
        precio_unitario_divisa: 25.00,
        diente_fdi: tipo === 'odontologia' ? 16 : null,
      }
    ]);
  };

  // Manejadores de Pagos
  const handleAddPago = () => {
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
      }
    ]);
  };

  const handleRemovePago = (index: number) => {
    if (pagos.length === 1) {
      toast.info('Debe haber al menos un medio de pago');
      return;
    }
    setPagos(pagos.filter((_, i) => i !== index));
  };

  // Procesar Cobro
  const handleProcesarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoActivo) {
      toast.error('Debe tener un turno de caja abierto para registrar cobros');
      setAperturaModalOpen(true);
      return;
    }

    if (!selectedPacienteId) {
      toast.error('Seleccione o ingrese un paciente para emitir el cobro');
      return;
    }

    if (detalles.length === 0) {
      toast.error('El carrito de conceptos está vacío. Agregue al menos un servicio o procedimiento.');
      return;
    }

    if (totalFacturaDivisa <= 0) {
      toast.error('El total a cobrar debe ser mayor a cero');
      return;
    }

    if (saldoPendienteDivisa > 0.01) {
      toast.error(`Aún queda un saldo pendiente de $${saldoPendienteDivisa.toFixed(2)} por cubrir`);
      return;
    }

    try {
      setSubmittingCobro(true);
      const cobroGenerado = await cajasApi.createCobro({
        turno_caja_id: turnoActivo.id,
        sucursal_id: currentSucursalId,
        paciente_id: parseInt(selectedPacienteId, 10),
        medico_id: selectedMedicoId ? parseInt(selectedMedicoId, 10) : undefined,
        cita_id: selectedCitaId ? parseInt(selectedCitaId, 10) : undefined,
        consulta_id: selectedConsultaId ? parseInt(selectedConsultaId, 10) : undefined,
        descuento_divisa: descuentoDivisa,
        notas: notasCobro.trim() || undefined,
        detalles,
        pagos,
      });

      toast.success(`¡Cobro exitoso! Recibo ${cobroGenerado.numero_recibo} generado.`);
      setUltimoCobro(cobroGenerado);
      setReciboModalOpen(true);

      // Limpiar formulario para nuevo cobro
      setSelectedPacienteId('');
      setSelectedCitaId('');
      setSelectedConsultaId('');
      setSelectedMedicoId('');
      setDescuentoDivisa(0);
      setNotasCobro('');
      setDetalles([
        {
          tipo_concepto: 'consulta',
          descripcion: 'Consulta Médica General',
          cantidad: 1,
          precio_unitario_divisa: 30.00,
          diente_fdi: null
        }
      ]);
      setPagos([
        {
          metodo: 'efectivo_usd',
          moneda: 'USD',
          monto_moneda_origen: 30.00,
          referencia: '',
        }
      ]);

      // Refrescar turno activo
      const turnoActualizado = await cajasApi.getActiveTurno();
      setTurnoActivo(turnoActualizado);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al procesar el cobro');
    } finally {
      setSubmittingCobro(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <ModuleHeader
        title="Terminal de Cobro & Caja POS"
        description="Gestión integral de recaudación médica y odontológica con cálculo en tiempo real según tasa oficial BCV."
        icon={<CircleDollarSign className="h-6 w-6 text-white" />}
      >
        <div className="flex items-center gap-3">
          {turnoActivo ? (
            <Button
              variant="outline"
              onClick={() => setCierreModalOpen(true)}
              className="gap-2 cursor-pointer border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Lock className="w-4 h-4" />
              Cerrar Turno & Arqueo
            </Button>
          ) : (
            <Button
              onClick={() => setAperturaModalOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <LockOpen className="w-4 h-4" />
              Abrir Turno de Caja
            </Button>
          )}
        </div>
      </ModuleHeader>

      {/* Barra de Estado del Turno y Tasa Oficial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estado del Turno */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              turnoActivo ? "bg-emerald-500/20 text-emerald-600" : "bg-amber-500/20 text-amber-600"
            )}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Estado de Caja</span>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                {turnoActivo ? (
                  <>
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Turno Abierto ({turnoActivo.caja_nombre || 'Caja Principal'})
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-amber-500" />
                    Caja Cerrada (Requiere Apertura)
                  </>
                )}
              </span>
            </div>
          </div>
          {turnoActivo && (
            <div className="text-right text-xs">
              <span className="text-slate-400 block text-[10px]">Cajero:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{turnoActivo.cajero_nombre}</span>
            </div>
          )}
        </div>

        {/* Tasa Oficial BCV de Cobro */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-900/5 to-transparent border border-indigo-500/20 shadow-xs flex items-center justify-between md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              {monedaReferencia === 'EUR' ? '€' : '$'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                  Tasa Oficial Activa para Cobros
                </span>
                <Badge className="bg-indigo-600 text-white text-[9px] py-0">BCV Oficial</Badge>
              </div>
              <span className="font-black text-lg text-slate-900 dark:text-white font-mono">
                1 {monedaReferencia} = Bs. {tasaActiva.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block">Base de conversión:</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {monedaReferencia === 'EUR' ? 'Euro Oficial BCV' : 'Dólar Oficial BCV'}
            </span>
          </div>
        </div>
      </div>

      {/* Si la caja no está abierta, mostrar aviso amigable */}
      {!turnoActivo && !loadingTurno && (
        <div className="p-8 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Turno de Caja Requerido
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Para registrar cobros y emitir recibos a pacientes, debes iniciar tu turno de trabajo con el fondo inicial de sencillo.
            </p>
          </div>
          <Button
            onClick={() => setAperturaModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <LockOpen className="w-4 h-4" />
            Abrir Turno de Caja Ahora
          </Button>
        </div>
      )}

      {/* Terminal POS Principal */}
      <form onSubmit={handleProcesarCobro} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Paciente, Cita y Conceptos (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card 1: Paciente & Cita */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <User className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                1. Datos del Paciente & Consulta
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Selector de Paciente */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Paciente *</Label>
                <Select
                  value={selectedPacienteId}
                  onValueChange={setSelectedPacienteId}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Seleccione o busque un paciente" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {pacientes.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombres} {p.apellidos} {p.documento_identidad ? `(CI: ${p.documento_identidad})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Médico Tratante (para honorarios) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Médico / Especialista</Label>
                <Select
                  value={selectedMedicoId}
                  onValueChange={setSelectedMedicoId}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Opcional: vincular médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        Dr. {m.nombres} {m.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Consultas médicas finalizadas del paciente */}
            {selectedPacienteId && (
              <div className="space-y-2 pt-1">
                {loadingConsultas ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <Activity className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Buscando consultas finalizadas del paciente...</span>
                  </div>
                ) : consultasFinalizadas.length > 0 ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Consultas Médicas Finalizadas (Listas para Cobro):
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                        {consultasFinalizadas.length} {consultasFinalizadas.length === 1 ? 'disponible' : 'disponibles'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {consultasFinalizadas.map((consulta) => {
                        const isSelected = selectedConsultaId === String(consulta.id);
                        const doctorName = consulta.medico
                          ? `${consulta.medico.nombres} ${consulta.medico.apellidos}`.trim()
                          : 'Médico Asignado';
                        const fechaFormateada = (() => {
                          try {
                            const d = new Date(consulta.fecha_consulta);
                            return d.toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch {
                            return consulta.fecha_consulta;
                          }
                        })();

                        return (
                          <button
                            key={consulta.id}
                            type="button"
                            onClick={() => handleSelectConsulta(consulta)}
                            className={cn(
                              "p-3 rounded-xl border text-left text-xs transition-all relative overflow-hidden flex flex-col justify-between gap-2 cursor-pointer group shadow-2xs",
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/40"
                                : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-800 dark:text-slate-100"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9.5px] font-mono px-1.5 py-0 h-4.5 font-bold",
                                      isSelected
                                        ? "border-white/50 text-white bg-white/20"
                                        : "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                                    )}
                                  >
                                    {consulta.codigo || `CON-#${consulta.id}`}
                                  </Badge>
                                  <span
                                    className={cn(
                                      "text-[10px] font-medium flex items-center gap-1",
                                      isSelected ? "text-emerald-100" : "text-slate-400"
                                    )}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {fechaFormateada}
                                  </span>
                                </div>
                                <span className="font-bold text-xs block truncate">
                                  Dr(a). {doctorName}
                                </span>
                                <span
                                  className={cn(
                                    "text-[11px] block truncate font-medium",
                                    isSelected ? "text-emerald-100" : "text-teal-700 dark:text-teal-400"
                                  )}
                                >
                                  {consulta.especialidad?.nombre || 'Medicina General'}
                                </span>
                              </div>

                              <div className="shrink-0 pt-0.5">
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-emerald-800 font-bold text-[10px] shadow-xs">
                                    <Check className="w-3 h-3" /> Vinculada
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    Vincular
                                  </span>
                                )}
                              </div>
                            </div>

                            {(consulta.diagnostico_principal || consulta.motivo_consulta) && (
                              <div
                                className={cn(
                                  "pt-1.5 border-t text-[10px] truncate",
                                  isSelected
                                    ? "border-emerald-500/40 text-emerald-100"
                                    : "border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400"
                                )}
                              >
                                <span className="font-semibold">
                                  {consulta.diagnostico_principal ? 'Diagnóstico: ' : 'Motivo: '}
                                </span>
                                {consulta.diagnostico_principal || consulta.motivo_consulta}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                      Sin consultas finalizadas registradas para este paciente. Puedes ingresar los conceptos manualmente.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Citas pendientes del paciente si existen */}
            {citasPendientes.length > 0 && (
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 space-y-2">
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  El paciente tiene citas agendadas por cobrar:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {citasPendientes.map((cita) => (
                    <button
                      key={cita.id}
                      type="button"
                      onClick={() => handleSelectCita(String(cita.id))}
                      className={cn(
                        "p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer",
                        selectedCitaId === String(cita.id)
                          ? "bg-teal-600 text-white border-teal-700 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-teal-500/30 hover:bg-teal-50 text-slate-700 dark:text-slate-200"
                      )}
                    >
                      <div>
                        <span className="font-bold block">{cita.motivo}</span>
                        <span className="text-[10px] opacity-80">{cita.hora_inicio} - Dr. {cita.medico_nombre || 'Asignado'}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px]">
                        {selectedCitaId === String(cita.id) ? 'Seleccionada' : 'Vincular'}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Conceptos y Servicios a Cobrar - Carrito POS con Buscador en Tiempo Real */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Header del Carrito */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      2. Carrito de Servicios, Procedimientos & Odontología
                    </h3>
                    <Badge variant="secondary" className="text-[10px] font-mono px-2 h-5">
                      {detalles.reduce((acc, d) => acc + (d.cantidad || 1), 0)} {detalles.reduce((acc, d) => acc + (d.cantidad || 1), 0) === 1 ? 'ítem' : 'ítems'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Búsqueda instantánea en catálogo clínico y gestión ágil de ítems estilo punto de venta.
                  </p>
                </div>
              </div>

              {/* Botones de acción rápida */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddDetalle('servicio')}
                  className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Manual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddDetalle('odontologia')}
                  className="h-8 text-xs gap-1.5 text-teal-600 border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Odontología (FDI)
                </Button>
                {detalles.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearCart}
                    className="h-8 text-xs gap-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    title="Vaciar todo el carrito"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Vaciar
                  </Button>
                )}
              </div>
            </div>

            {/* BUSCADOR EN TIEMPO REAL CON FILTRO Y AUTOCOMPLETADO */}
            <div ref={searchContainerRef} className="relative space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={searchServicioQuery}
                  onChange={(e) => {
                    setSearchServicioQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  placeholder="🔍 Buscar servicio por nombre o código (Ej: Consulta, ECO-01, Limpieza, Biopsia, Resina...)"
                  className="pl-9 pr-9 h-10 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium rounded-xl shadow-2xs"
                />
                {searchServicioQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchServicioQuery('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Pills / Chips de Categorías */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1 mr-1 shrink-0">
                  <Tag className="w-3 h-3" /> Categoría:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoriaFilter('todos')}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer",
                    selectedCategoriaFilter === 'todos'
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 font-bold shadow-2xs"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  )}
                >
                  Todos ({servicios.length})
                </button>
                {categoriasDisponibles.map((cat) => {
                  const countInCat = servicios.filter(s => (s.categoria || '').toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategoriaFilter(cat);
                        setIsSearchDropdownOpen(true);
                      }}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer",
                        selectedCategoriaFilter.toLowerCase() === cat.toLowerCase()
                          ? "bg-emerald-600 text-white border-emerald-700 font-bold shadow-2xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                      )}
                    >
                      {cat} ({countInCat})
                    </button>
                  );
                })}
              </div>

              {/* DROPDOWN FLOTANTE DE RESULTADOS DE BÚSQUEDA */}
              {isSearchDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  {filteredServicios.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        No se encontraron servicios que coincidan con &ldquo;{searchServicioQuery}&rdquo;.
                      </p>
                      {searchServicioQuery && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleAddDetalle('servicio');
                            const copy = [...detalles];
                            copy[copy.length - 1].descripcion = searchServicioQuery;
                            setDetalles(copy);
                            setSearchServicioQuery('');
                            setIsSearchDropdownOpen(false);
                          }}
                          className="h-7 text-xs gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar como concepto personalizado &ldquo;{searchServicioQuery}&rdquo;
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredServicios.map((s) => {
                      const inCart = detalles.find(
                        (d) => (d.servicio_id && d.servicio_id === s.id) || d.descripcion.toLowerCase() === s.nombre.toLowerCase()
                      );
                      const precioDivisa = Number(s.precio_base || 0);
                      const precioVes = precioDivisa * tasaActiva;

                      return (
                        <div
                          key={s.id}
                          onClick={() => handleAddServicioToCart(s)}
                          className={cn(
                            "p-3 flex items-center justify-between gap-3 hover:bg-emerald-50/60 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group",
                            inCart ? "bg-emerald-50/20 dark:bg-emerald-950/10" : ""
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              {s.codigo && (
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {s.codigo}
                                </span>
                              )}
                              <Badge variant="outline" className="text-[9px] font-medium py-0 h-4 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50">
                                {s.categoria || 'Servicio'}
                              </Badge>
                              {s.especialidad?.nombre && (
                                <span className="text-[10px] text-slate-400">
                                  • {s.especialidad.nombre}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                              {s.nombre}
                            </span>
                            {s.descripcion && (
                              <p className="text-[10px] text-slate-400 truncate max-w-md">
                                {s.descripcion}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="font-extrabold text-xs text-slate-900 dark:text-white block font-mono">
                                {monedaReferencia === 'EUR' ? '€' : '$'}{precioDivisa.toFixed(2)}
                              </span>
                              <span className="text-[9.5px] text-slate-400 block font-mono">
                                Bs. {precioVes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              className={cn(
                                "h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg cursor-pointer transition-all",
                                inCart
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddServicioToCart(s);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {inCart ? `Agregar (${inCart.cantidad})` : 'Agregar'}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* TABLA / CARRITO DE COMPRAS */}
            <div className="space-y-2 pt-1">
              {detalles.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    El carrito de cobro está vacío
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Busca servicios por nombre o código en la barra superior o pulsa &ldquo;+ Manual&rdquo; para agregar un concepto libre.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddDetalle('servicio')}
                    className="mt-2 h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Agregar Concepto Libre
                  </Button>
                </div>
              ) : (
                <div className="border rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {/* Encabezado de la tabla del carrito */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 grid grid-cols-12 gap-2 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider items-center">
                    <div className="col-span-12 sm:col-span-5">Servicio / Concepto</div>
                    <div className="hidden sm:block sm:col-span-2 text-center">Pieza FDI</div>
                    <div className="col-span-4 sm:col-span-2 text-center">Cantidad</div>
                    <div className="col-span-4 sm:col-span-2 text-right">P. Unitario ($)</div>
                    <div className="col-span-4 sm:col-span-1 text-right">Subtotal</div>
                  </div>

                  {/* Filas del carrito */}
                  {detalles.map((det, index) => {
                    const subtotalItem = Number(det.precio_unitario_divisa || 0) * Number(det.cantidad || 1);
                    const subtotalVes = subtotalItem * tasaActiva;

                    return (
                      <div
                        key={index}
                        className="p-3 sm:px-3.5 sm:py-2.5 grid grid-cols-12 gap-2.5 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Concepto / Nombre editable */}
                        <div className="col-span-12 sm:col-span-5 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-mono px-1.5 py-0 h-4 uppercase",
                                det.tipo_concepto === 'odontologia'
                                  ? "border-teal-500/40 text-teal-700 dark:text-teal-400 bg-teal-50/50"
                                  : det.tipo_concepto === 'consulta'
                                  ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50"
                                  : "border-slate-300 text-slate-600 dark:text-slate-400"
                              )}
                            >
                              {det.tipo_concepto}
                            </Badge>
                          </div>
                          <Input
                            value={det.descripcion}
                            onChange={(e) => handleUpdateDescripcion(index, e.target.value)}
                            className="h-8 text-xs font-semibold text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 focus:bg-white"
                            placeholder="Descripción del concepto"
                            required
                          />
                        </div>

                        {/* Pieza FDI (solo si aplica o campo libre) */}
                        <div className="col-span-4 sm:col-span-2 flex items-center justify-center">
                          {det.tipo_concepto === 'odontologia' ? (
                            <div className="w-full max-w-[85px] text-center space-y-0.5">
                              <span className="text-[9px] text-slate-400 sm:hidden block uppercase font-bold">FDI:</span>
                              <Input
                                type="number"
                                min="11"
                                max="85"
                                value={det.diente_fdi || ''}
                                onChange={(e) => handleUpdateDienteFdi(index, parseInt(e.target.value, 10) || null)}
                                className="h-8 text-xs font-bold text-center font-mono border-teal-500/40 bg-teal-50/20 text-teal-800 dark:text-teal-300"
                                placeholder="FDI"
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-300 dark:text-slate-600 hidden sm:inline">—</span>
                          )}
                        </div>

                        {/* Cantidad con Stepper (+) y (-) */}
                        <div className="col-span-4 sm:col-span-2 flex items-center justify-center">
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleDecrementCantidad(index)}
                              className="size-7 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                              title="Reducir cantidad"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={det.cantidad}
                              onChange={(e) => handleUpdateCantidad(index, parseInt(e.target.value, 10))}
                              className="w-9 h-7 text-xs font-extrabold text-center bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleIncrementCantidad(index)}
                              className="size-7 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                              title="Aumentar cantidad"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Precio Unitario */}
                        <div className="col-span-4 sm:col-span-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                              {monedaReferencia === 'EUR' ? '€' : '$'}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={det.precio_unitario_divisa}
                              onChange={(e) => handleUpdatePrecio(index, parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs font-bold pl-6 text-right font-mono"
                              required
                            />
                          </div>
                        </div>

                        {/* Subtotal & Borrar */}
                        <div className="col-span-12 sm:col-span-1 flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-right sm:hidden">
                            <span className="text-[10px] text-slate-400">Subtotal:</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black block text-slate-900 dark:text-white font-mono">
                              {monedaReferencia === 'EUR' ? '€' : '$'}{subtotalItem.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-mono">
                              Bs. {subtotalVes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveDetalle(index)}
                            className="size-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer shrink-0"
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Descuento Especial */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Descuento Especial ($ / Divisa):
                </Label>
                {descuentoDivisa > 0 && subtotalDivisa > 0 && (
                  <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/30">
                    -{((descuentoDivisa / subtotalDivisa) * 100).toFixed(1)}% aplicado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                    {monedaReferencia === 'EUR' ? '€' : '$'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={descuentoDivisa}
                    onChange={(e) => setDescuentoDivisa(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-bold text-right pl-6 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Pago Mixto & Liquidación (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card Resumen de Totales */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-4">
            <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">
              Total de la Transacción
            </span>

            <div className="space-y-1">
              <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
                <span>{monedaReferencia === 'EUR' ? '€' : '$'}</span>
                <span>{totalFacturaDivisa.toFixed(2)}</span>
              </div>
              <div className="text-sm font-semibold text-emerald-400 font-mono">
                Bs. {totalFacturaVes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Abonado:</span>
                <span className="font-bold">${totalPagadoEquivalenteDivisa.toFixed(2)}</span>
              </div>
              {saldoPendienteDivisa > 0.01 ? (
                <div className="flex justify-between font-bold text-amber-400">
                  <span>Pendiente por Pagar:</span>
                  <span>${saldoPendienteDivisa.toFixed(2)} (Bs. {(saldoPendienteDivisa * tasaActiva).toLocaleString('es-ES', { minimumFractionDigits: 2 })})</span>
                </div>
              ) : (
                <div className="flex justify-between font-bold text-emerald-400">
                  <span>Vuelto / Cambio:</span>
                  <span>${vueltoDivisa.toFixed(2)} (Bs. {(vueltoDivisa * tasaActiva).toLocaleString('es-ES', { minimumFractionDigits: 2 })})</span>
                </div>
              )}
            </div>
          </div>

          {/* Card Medios de Pago (Pago Mixto) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  3. Medios de Pago
                </h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddPago}
                className="h-7 text-[11px] gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                + Agregar Pago
              </Button>
            </div>

            {/* Lista de Tramos de Pago */}
            <div className="space-y-3">
              {pagos.map((pago, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Select
                      value={pago.metodo}
                      onValueChange={(val) => {
                        const copy = [...pagos];
                        copy[idx].metodo = val;
                        if (val === 'pago_movil' || val === 'punto_venta') copy[idx].moneda = 'VES';
                        if (val === 'efectivo_usd') copy[idx].moneda = 'USD';
                        if (val === 'efectivo_eur') copy[idx].moneda = 'EUR';
                        setPagos(copy);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo_usd">Efectivo Dólares ($)</SelectItem>
                        <SelectItem value="efectivo_eur">Efectivo Euros (€)</SelectItem>
                        <SelectItem value="efectivo_ves">Efectivo Bolívares (Bs.)</SelectItem>
                        <SelectItem value="pago_movil">Pago Móvil (VES)</SelectItem>
                        <SelectItem value="punto_venta">Punto de Venta / Tarjeta</SelectItem>
                        <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                        <SelectItem value="zelle">Zelle (USD)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemovePago(idx)}
                      className="size-7 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 uppercase font-bold">Monto</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pago.monto_moneda_origen}
                        onChange={(e) => {
                          const copy = [...pagos];
                          copy[idx].monto_moneda_origen = parseFloat(e.target.value) || 0;
                          setPagos(copy);
                        }}
                        className="h-8 text-xs font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 uppercase font-bold">Moneda</Label>
                      <Select
                        value={pago.moneda}
                        onValueChange={(val: any) => {
                          const copy = [...pagos];
                          copy[idx].moneda = val;
                          setPagos(copy);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="VES">VES (Bs.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Referencia Bancaria si aplica */}
                  {['pago_movil', 'punto_venta', 'transferencia', 'zelle'].includes(pago.metodo) && (
                    <Input
                      value={pago.referencia || ''}
                      onChange={(e) => {
                        const copy = [...pagos];
                        copy[idx].referencia = e.target.value;
                        setPagos(copy);
                      }}
                      className="h-7 text-[11px]"
                      placeholder="Nro. de Referencia o Aprobación"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Botón Principal de Cobro */}
            <Button
              type="submit"
              disabled={submittingCobro || !turnoActivo || saldoPendienteDivisa > 0.01}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 cursor-pointer gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {submittingCobro ? 'Emitiendo Recibo...' : 'Procesar Cobro & Emitir Recibo'}
            </Button>
          </div>
        </div>
      </form>

      {/* Modales de Control de Turno y Recibo */}
      {aperturaModalOpen && (
        <TurnoAperturaModal
          open={aperturaModalOpen}
          onOpenChange={setAperturaModalOpen}
          cajas={cajas}
          sucursalId={currentSucursalId}
          onTurnoOpened={(t) => setTurnoActivo(t)}
        />
      )}

      {cierreModalOpen && turnoActivo && (
        <TurnoCierreModal
          open={cierreModalOpen}
          onOpenChange={setCierreModalOpen}
          turno={turnoActivo}
          onTurnoClosed={() => setTurnoActivo(null)}
        />
      )}

      {reciboModalOpen && ultimoCobro && (
        <CobroReciboModal
          open={reciboModalOpen}
          onOpenChange={setReciboModalOpen}
          cobro={ultimoCobro}
        />
      )}
    </div>
  );
};

export default PuntoCobroPage;
