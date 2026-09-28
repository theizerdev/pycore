import React, { useState, useEffect, useMemo } from 'react';
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
  Stethoscope
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
  const [descuentoDivisa, setDescuentoDivisa] = useState<number>(0);
  const [notasCobro, setNotasCobro] = useState<string>('');
  const [submittingCobro, setSubmittingCobro] = useState(false);

  // Ítems a cobrar
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
        serviciosApi.list({ sucursal_id: currentSucursalId, activo: true }),
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

  // Si cambia el paciente seleccionado, buscar citas pendientes de pago
  useEffect(() => {
    if (!selectedPacienteId) {
      setCitasPendientes([]);
      setSelectedCitaId('');
      return;
    }

    const fetchCitas = async () => {
      try {
        const res = await citasApi.list({
          paciente_id: parseInt(selectedPacienteId, 10),
          estado: 'confirmada',
        });
        const pendientes = res.filter((c) => c.estado_pago === 'pendiente');
        setCitasPendientes(pendientes);
      } catch (e) {
        // Silencioso
      }
    };
    fetchCitas();
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

  // Manejadores de Conceptos
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

  const handleRemoveDetalle = (index: number) => {
    if (detalles.length === 1) {
      toast.info('Debe haber al menos un concepto a facturar');
      return;
    }
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleSelectPresetServicio = (index: number, servicioIdStr: string) => {
    const serv = servicios.find((s) => s.id === parseInt(servicioIdStr, 10));
    if (!serv) return;
    const newDetalles = [...detalles];
    newDetalles[index] = {
      ...newDetalles[index],
      servicio_id: serv.id,
      descripcion: serv.nombre,
      precio_unitario_divisa: Number(serv.precio_base) || 0.00,
    };
    setDetalles(newDetalles);
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

            {/* Citas pendientes del paciente si existen */}
            {citasPendientes.length > 0 && (
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 space-y-2">
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  El paciente tiene citas pendientes por cobrar hoy:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {citasPendientes.map((cita) => (
                    <button
                      key={cita.id}
                      type="button"
                      onClick={() => handleSelectCita(String(cita.id))}
                      className={cn(
                        "p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between",
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

          {/* Card 2: Conceptos y Servicios a Cobrar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  2. Conceptos, Procedimientos & Odontología
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddDetalle('servicio')}
                  className="h-7 text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Servicio
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddDetalle('odontologia')}
                  className="h-7 text-xs gap-1.5 text-teal-600 border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Odontología (FDI)
                </Button>
              </div>
            </div>

            {/* Lista de Conceptos */}
            <div className="space-y-3">
              {detalles.map((det, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  {/* Selector o Nombre */}
                  <div className="sm:col-span-5 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-slate-400 uppercase font-bold">
                        {det.tipo_concepto === 'odontologia' ? 'Procedimiento Dental' : 'Descripción / Catálogo'}
                      </Label>
                      {servicios.length > 0 && det.tipo_concepto !== 'odontologia' && (
                        <Select onValueChange={(val) => handleSelectPresetServicio(index, val)}>
                          <SelectTrigger className="h-5 text-[10px] border-none p-0 text-teal-600 font-semibold underline">
                            Catálogo
                          </SelectTrigger>
                          <SelectContent>
                            {servicios.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.nombre} (${Number(s.precio_base).toFixed(2)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Input
                      value={det.descripcion}
                      onChange={(e) => {
                        const copy = [...detalles];
                        copy[index].descripcion = e.target.value;
                        setDetalles(copy);
                      }}
                      className="h-8 text-xs font-medium"
                      placeholder="Descripción del concepto"
                      required
                    />
                  </div>

                  {/* Pieza Dental FDI si es odontología */}
                  {det.tipo_concepto === 'odontologia' && (
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[10px] text-slate-400 uppercase font-bold">Pieza FDI</Label>
                      <Input
                        type="number"
                        min="11"
                        max="85"
                        value={det.diente_fdi || ''}
                        onChange={(e) => {
                          const copy = [...detalles];
                          copy[index].diente_fdi = parseInt(e.target.value, 10) || null;
                          setDetalles(copy);
                        }}
                        className="h-8 text-xs font-bold text-center"
                        placeholder="Ej: 16"
                      />
                    </div>
                  )}

                  {/* Cantidad */}
                  <div className={cn("space-y-1", det.tipo_concepto === 'odontologia' ? "sm:col-span-1" : "sm:col-span-2")}>
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Cant.</Label>
                    <Input
                      type="number"
                      min="1"
                      value={det.cantidad}
                      onChange={(e) => {
                        const copy = [...detalles];
                        copy[index].cantidad = parseInt(e.target.value, 10) || 1;
                        setDetalles(copy);
                      }}
                      className="h-8 text-xs font-bold text-center"
                      required
                    />
                  </div>

                  {/* Precio Unitario */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Precio Unit. ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={det.precio_unitario_divisa}
                      onChange={(e) => {
                        const copy = [...detalles];
                        copy[index].precio_unitario_divisa = parseFloat(e.target.value) || 0;
                        setDetalles(copy);
                      }}
                      className="h-8 text-xs font-bold"
                      required
                    />
                  </div>

                  {/* Subtotal & Borrar */}
                  <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-3 sm:pt-0">
                    <div className="text-right flex-1">
                      <span className="text-xs font-black block text-slate-900 dark:text-white">
                        ${(Number(det.precio_unitario_divisa || 0) * Number(det.cantidad || 1)).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Bs. {((Number(det.precio_unitario_divisa || 0) * Number(det.cantidad || 1)) * tasaActiva).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveDetalle(index)}
                      className="size-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Descuento */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <Label className="text-xs font-semibold text-slate-600">Descuento Especial ($):</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={descuentoDivisa}
                onChange={(e) => setDescuentoDivisa(parseFloat(e.target.value) || 0)}
                className="w-32 h-8 text-xs font-bold text-right"
                placeholder="0.00"
              />
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
