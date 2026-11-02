import React, { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  Calculator,
  Calendar,
  User,
  Users,
  Settings2,
  CheckCircle2,
  Clock,
  Ban,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building2,
  ShieldCheck,
  RefreshCw,
  Printer,
  ChevronRight,
  Eye,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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
import { toast } from 'sonner';
import { medicosApi } from '../../api/medicos';
import type { Medico } from '../../types';
import {
  honorariosApi,
  type ResumenCalculoHonorariosResponse,
  type LiquidacionHonorarioResponse,
  type ItemCalculoCobro,
} from '../../api/honorarios';
import { LiquidacionReciboModal } from '../../components/facturacion/LiquidacionReciboModal';
import { useAuth } from '../../context/AuthContext';
import { ModuleHeader } from '../../components/common/ModuleHeader';
import { cn } from '../../lib/utils';

export const HonorariosMedicosPage: React.FC = () => {
  const { user, sucursalActiva } = useAuth();

  // Estados de navegación y carga
  const [activeTab, setActiveTab] = useState<'calculadora' | 'historial'>('calculadora');
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [selectedMedicoId, setSelectedMedicoId] = useState<number | null>(null);

  // Filtros de fecha para cálculo
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [fechaDesde, setFechaDesde] = useState(firstDayMonthStr);
  const [fechaHasta, setFechaHasta] = useState(todayStr);

  // Estados de cálculo
  const [calculando, setCalculando] = useState(false);
  const [resumenCalculo, setResumenCalculo] = useState<ResumenCalculoHonorariosResponse | null>(null);
  const [selectedCobrosIds, setSelectedCobrosIds] = useState<number[]>([]);

  // Modal de Liquidación
  const [modalLiquidarOpen, setModalLiquidarOpen] = useState(false);
  const [liquidando, setLiquidando] = useState(false);
  const [montoDeduccion, setMontoDeduccion] = useState<number>(0);
  const [motivoDeduccion, setMotivoDeduccion] = useState('');
  const [marcarComoPagado, setMarcarComoPagado] = useState(false);
  const [metodoPago, setMetodoPago] = useState('transferencia');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [bancoDestino, setBancoDestino] = useState('');
  const [notasLiquidacion, setNotasLiquidacion] = useState('');

  // Modal de Comprobante / Recibo
  const [modalReciboOpen, setModalReciboOpen] = useState(false);
  const [liquidacionSeleccionada, setLiquidacionSeleccionada] =
    useState<LiquidacionHonorarioResponse | null>(null);

  // Modal de Configuración de Comisión del Médico
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [configTipo, setConfigTipo] = useState<'porcentaje' | 'fijo'>('porcentaje');
  const [configPorcentaje, setConfigPorcentaje] = useState<number>(70);
  const [configFijo, setConfigFijo] = useState<number>(0);
  const [configBanco, setConfigBanco] = useState('');
  const [configCuenta, setConfigCuenta] = useState('');
  const [configTitular, setConfigTitular] = useState('');
  const [configPagoMovil, setConfigPagoMovil] = useState('');
  const [configZelle, setConfigZelle] = useState('');

  // Estados del Historial de Liquidaciones
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionHonorarioResponse[]>([]);
  const [historialStats, setHistorialStats] = useState({
    total_liquidado_usd: 0,
    total_pagado_usd: 0,
    total_pendiente_usd: 0,
    total_liquidaciones: 0,
  });
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroSearch, setFiltroSearch] = useState<string>('');

  // Modal Registrar Pago desde Historial
  const [modalPagarOpen, setModalPagarOpen] = useState(false);
  const [pagoSubmitting, setPagoSubmitting] = useState(false);
  const [pagoMetodo, setPagoMetodo] = useState('transferencia');
  const [pagoRef, setPagoRef] = useState('');
  const [pagoNotas, setPagoNotas] = useState('');

  // Cargar lista de médicos activos
  useEffect(() => {
    fetchMedicos();
    fetchHistorial();
  }, []);

  const fetchMedicos = async () => {
    setLoadingMedicos(true);
    try {
      const data = await medicosApi.list({ activo: true });
      setMedicos(data);
      if (data.length > 0 && !selectedMedicoId) {
        setSelectedMedicoId(data[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar la lista de médicos');
    } finally {
      setLoadingMedicos(false);
    }
  };

  const fetchHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const res = await honorariosApi.listarLiquidaciones({
        estado: filtroEstado || undefined,
        search: filtroSearch || undefined,
      });
      setLiquidaciones(res.items);
      setHistorialStats(res.stats);
    } catch (error) {
      toast.error('Error al cargar historial de liquidaciones');
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleCalcularHonorarios = async () => {
    if (!selectedMedicoId) {
      toast.error('Seleccione un especialista médico');
      return;
    }
    setCalculando(true);
    try {
      const data = await honorariosApi.resumenCalculo({
        medico_id: selectedMedicoId,
        sucursal_id: sucursalActiva?.id,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      });
      setResumenCalculo(data);
      // Por defecto, preseleccionar todos los cobros pendientes
      setSelectedCobrosIds(data.cobros_pendientes.map((c) => c.cobro_id));
      if (data.cobros_pendientes.length === 0) {
        toast.info('No se encontraron cobros pendientes en el rango de fechas seleccionado.');
      } else {
        toast.success(`Cálculo completado: ${data.cobros_pendientes.length} consultas encontradas.`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al calcular honorarios');
    } finally {
      setCalculando(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (!resumenCalculo) return;
    if (selectedCobrosIds.length === resumenCalculo.cobros_pendientes.length) {
      setSelectedCobrosIds([]);
    } else {
      setSelectedCobrosIds(resumenCalculo.cobros_pendientes.map((c) => c.cobro_id));
    }
  };

  const handleToggleCobro = (id: number) => {
    setSelectedCobrosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Cálculo dinámico de lo seleccionado
  const selectedItems = resumenCalculo
    ? resumenCalculo.cobros_pendientes.filter((c) => selectedCobrosIds.includes(c.cobro_id))
    : [];

  const subtotalRecaudadoSelected = selectedItems.reduce((acc, c) => acc + c.monto_total_usd, 0);
  const subtotalHonorariosSelected = selectedItems.reduce((acc, c) => acc + c.honorario_medico_usd, 0);
  const subtotalRetencionSelected = selectedItems.reduce((acc, c) => acc + c.retencion_clinica_usd, 0);
  const netoPagarFinalUSD = Math.max(0, subtotalHonorariosSelected - (montoDeduccion || 0));
  const netoPagarFinalVES = resumenCalculo
    ? Math.round(netoPagarFinalUSD * resumenCalculo.tasa_bcv * 100) / 100
    : 0;

  // Abrir modal de configuración de comisiones
  const handleOpenConfigModal = () => {
    if (!resumenCalculo?.medico) return;
    const med = resumenCalculo.medico;
    setConfigTipo((med.tipo_comision as 'porcentaje' | 'fijo') || 'porcentaje');
    setConfigPorcentaje(med.porcentaje_honorario || 70);
    setConfigFijo(med.monto_fijo_honorario || 0);
    const b = med.datos_bancarios || {};
    setConfigBanco(b.banco || '');
    setConfigCuenta(b.numero_cuenta || '');
    setConfigTitular(b.titular || '');
    setConfigPagoMovil(b.pago_movil || '');
    setConfigZelle(b.zelle || '');
    setModalConfigOpen(true);
  };

  const handleGuardarConfiguracion = async () => {
    if (!selectedMedicoId) return;
    setGuardandoConfig(true);
    try {
      await honorariosApi.actualizarConfiguracionMedico(selectedMedicoId, {
        tipo_comision: configTipo,
        porcentaje_honorario: Number(configPorcentaje),
        monto_fijo_honorario: Number(configFijo),
        datos_bancarios: {
          banco: configBanco,
          numero_cuenta: configCuenta,
          titular: configTitular,
          pago_movil: configPagoMovil,
          zelle: configZelle,
        },
      });
      toast.success('Reglas de comisión y datos bancarios actualizados');
      setModalConfigOpen(false);
      // Recalcular con las nuevas reglas
      handleCalcularHonorarios();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al actualizar configuración');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const handleGenerarLiquidacion = async () => {
    if (!selectedMedicoId || selectedCobrosIds.length === 0) {
      toast.error('Debe seleccionar al menos un recibo de cobro para liquidar');
      return;
    }
    setLiquidando(true);
    try {
      const res = await honorariosApi.liquidar({
        medico_id: selectedMedicoId,
        sucursal_id: sucursalActiva?.id,
        periodo_desde: fechaDesde,
        periodo_hasta: fechaHasta,
        cobros_ids: selectedCobrosIds,
        monto_deducciones_usd: montoDeduccion,
        motivo_deduccion: motivoDeduccion.trim() || undefined,
        metodo_pago: metodoPago,
        referencia_pago: referenciaPago.trim() || undefined,
        banco_origen: bancoOrigen.trim() || undefined,
        banco_destino: bancoDestino.trim() || undefined,
        marcar_como_pagado: marcarComoPagado,
        notas: notasLiquidacion.trim() || undefined,
      });

      toast.success(`Liquidación formal ${res.codigo_liquidacion} generada exitosamente`);
      setModalLiquidarOpen(false);
      setLiquidacionSeleccionada(res);
      setModalReciboOpen(true);

      // Limpiar y refrescar
      handleCalcularHonorarios();
      fetchHistorial();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al procesar liquidación');
    } finally {
      setLiquidando(false);
    }
  };

  const handleRegistrarPago = async () => {
    if (!liquidacionSeleccionada) return;
    setPagoSubmitting(true);
    try {
      const res = await honorariosApi.pagarLiquidacion(liquidacionSeleccionada.id, {
        metodo_pago: pagoMetodo,
        referencia_pago: pagoRef.trim() || undefined,
        notas: pagoNotas.trim() || undefined,
      });
      toast.success(`Liquidación ${res.codigo_liquidacion} marcada como PAGADA.`);
      setModalPagarOpen(false);
      setLiquidacionSeleccionada(res);
      fetchHistorial();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al registrar pago');
    } finally {
      setPagoSubmitting(false);
    }
  };

  const handleAnularLiquidacion = async (liq: LiquidacionHonorarioResponse) => {
    const motivo = window.prompt(`¿Desea anular la liquidación ${liq.codigo_liquidacion}? Ingrese el motivo:`);
    if (motivo === null) return;

    try {
      await honorariosApi.anularLiquidacion(liq.id, motivo);
      toast.success('Liquidación anulada y recibos liberados correctamente.');
      fetchHistorial();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al anular liquidación');
    }
  };

  const formatUSD = (val: number) => `$${(val || 0).toFixed(2)}`;
  const formatVES = (val: number) => `Bs. ${(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Cabecera Principal con ModuleHeader Institucional ── */}
      <ModuleHeader
        title="Honorarios Médicos & Comisiones"
        description="Liquidación, cálculo automático de porcentajes y emisión de comprobantes contables a especialistas."
        icon={<Calculator className="h-6 w-6 text-white" />}
      >
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/15 border border-white/20">
          <button
            type="button"
            onClick={() => setActiveTab('calculadora')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              activeTab === 'calculadora'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Calculator className="h-4 w-4" />
            <span>Calcular & Liquidar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('historial');
              fetchHistorial();
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              activeTab === 'historial'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Historial Liquidaciones</span>
          </button>
        </div>
      </ModuleHeader>

      {/* ── KPIs Globales ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Liquidado
            </p>
            <h3 className="text-xl font-black text-foreground mt-0.5 font-mono">
              {formatUSD(historialStats.total_liquidado_usd)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Monto global acumulado</p>
          </div>
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Pagado
            </p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
              {formatUSD(historialStats.total_pagado_usd)}
            </h3>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              Honorarios desembolsados
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Pendiente por Pagar
            </p>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
              {formatUSD(historialStats.total_pendiente_usd)}
            </h3>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Liquidado sin pagar
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Comprobantes
            </p>
            <h3 className="text-xl font-black text-foreground mt-0.5 font-mono">
              {historialStats.total_liquidaciones}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Liquidaciones emitidas</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <FileText className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── CONTENIDO: PESTAÑA 1 CALCULADORA & NUEVA LIQUIDACIÓN ── */}
      {activeTab === 'calculadora' && (
        <div className="space-y-6">
          {/* Barra de Filtros y Selección de Especialista */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              {/* Selector de Médico */}
              <div className="md:col-span-5 space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4 text-teal-600" />
                  Especialista Médico a Liquidar <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedMedicoId ? String(selectedMedicoId) : ''}
                  onValueChange={(val) => setSelectedMedicoId(Number(val) || null)}
                >
                  <SelectTrigger className="w-full text-xs font-semibold h-9 rounded-xl">
                    <SelectValue placeholder="Seleccione un especialista..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        Dr(a). {m.nombres} {m.apellidos} - {m.especialidad_nombre || 'Especialista'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rango de Fechas */}
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha Desde
                </Label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full text-xs h-9 rounded-xl"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha Hasta
                </Label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full text-xs h-9 rounded-xl"
                />
              </div>

              {/* Botón Calcular */}
              <div className="md:col-span-3">
                <Button
                  onClick={handleCalcularHonorarios}
                  disabled={calculando || !selectedMedicoId}
                  className="w-full h-10 gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Calculator className="h-4 w-4" />
                  <span>{calculando ? 'Calculando...' : 'Calcular Pendientes'}</span>
                </Button>
              </div>
            </div>

            {/* Ficha Resumen del Médico Seleccionado */}
            {resumenCalculo?.medico && (
              <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Badge
                    variant="outline"
                    className="border-teal-500/40 text-teal-700 dark:text-teal-400 bg-teal-500/10 font-bold"
                  >
                    Régimen:{' '}
                    {resumenCalculo.medico.tipo_comision === 'porcentaje'
                      ? `${resumenCalculo.medico.porcentaje_honorario}% Honorarios`
                      : `$${resumenCalculo.medico.monto_fijo_honorario} Fijo / Consulta`}
                  </Badge>
                  {resumenCalculo.medico.documento && (
                    <span className="text-muted-foreground font-mono">
                      Doc: {resumenCalculo.medico.documento}
                    </span>
                  )}
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Tasa Oficial BCV: <strong>{resumenCalculo.tasa_bcv} Bs/$</strong>
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenConfigModal}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                >
                  <Settings2 className="h-3.5 w-3.5 text-teal-600" />
                  <span>Configurar Reglas de Comisión</span>
                </Button>
              </div>
            )}
          </div>

          {/* Tarjeta de Resumen Numérico y Acción de Liquidación */}
          {resumenCalculo && (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-500/5 shadow-xs space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Recaudado (Consultas)
                  </p>
                  <h4 className="text-lg font-black text-foreground font-mono mt-0.5">
                    {formatUSD(subtotalRecaudadoSelected)}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    De {selectedItems.length} recibos seleccionados
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    Honorarios Brutos Médico
                  </p>
                  <h4 className="text-lg font-black text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                    {formatUSD(subtotalHonorariosSelected)}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">Antes de deducciones</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Retención Institucional (Clínica)
                  </p>
                  <h4 className="text-lg font-black text-foreground/80 font-mono mt-0.5">
                    {formatUSD(subtotalRetencionSelected)}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">Participación clínica</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Neto a Percibir Médico
                  </p>
                  <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {formatUSD(netoPagarFinalUSD)}
                  </h4>
                  <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 font-mono font-semibold">
                    {formatVES(netoPagarFinalVES)}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    {selectedCobrosIds.length === resumenCalculo.cobros_pendientes.length
                      ? 'Deseleccionar todos'
                      : 'Seleccionar todos los recibos'}
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({selectedCobrosIds.length} de {resumenCalculo.cobros_pendientes.length}{' '}
                    recibos marcados)
                  </span>
                </div>

                <Button
                  onClick={() => {
                    setMontoDeduccion(0);
                    setMotivoDeduccion('');
                    setModalLiquidarOpen(true);
                  }}
                  disabled={selectedCobrosIds.length === 0}
                  className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 h-10 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Generar Liquidación Formal ({selectedCobrosIds.length})</span>
                </Button>
              </div>
            </div>
          )}

          {/* Tabla de Cobros Pendientes */}
          {resumenCalculo && (
            <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Consultas y Cobros Pendientes por Liquidar
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Marque o desmarque los recibos que desea incluir en este corte contable
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/80">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedCobrosIds.length > 0 &&
                            selectedCobrosIds.length === resumenCalculo.cobros_pendientes.length
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded border-border text-teal-600 focus:ring-teal-500"
                        />
                      </th>
                      <th className="py-2.5 px-3">Recibo</th>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Paciente</th>
                      <th className="py-2.5 px-3">Concepto / Servicio</th>
                      <th className="py-2.5 px-3 text-right">Cobro ($)</th>
                      <th className="py-2.5 px-3 text-right">Comisión</th>
                      <th className="py-2.5 px-3 text-right">Retención ($)</th>
                      <th className="py-2.5 px-3 text-right">Honorario ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {resumenCalculo.cobros_pendientes.map((item) => {
                      const isSelected = selectedCobrosIds.includes(item.cobro_id);
                      return (
                        <tr
                          key={item.cobro_id}
                          onClick={() => handleToggleCobro(item.cobro_id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-500/5 font-medium' : 'hover:bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCobro(item.cobro_id)}
                              className="rounded border-border text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                            {item.numero_recibo}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{item.fecha}</td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {item.paciente_nombre}
                            {item.paciente_documento && (
                              <span className="block text-[10px] text-muted-foreground font-mono">
                                {item.paciente_documento}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px] truncate text-foreground/80">
                            {item.concepto}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                            {formatUSD(item.monto_total_usd)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 font-mono border-teal-500/30 text-teal-700 dark:text-teal-300"
                            >
                              {item.porcentaje_aplicado}%
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {formatUSD(item.retencion_clinica_usd)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                            {formatUSD(item.honorario_medico_usd)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONTENIDO: PESTAÑA 2 HISTORIAL DE LIQUIDACIONES ── */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          {/* Barra de Filtros del Historial */}
          <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por código (LIQ-...) o médico..."
                  value={filtroSearch}
                  onChange={(e) => setFiltroSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchHistorial()}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <Select
                value={filtroEstado || 'todos'}
                onValueChange={(val) => {
                  setFiltroEstado(val === 'todos' ? '' : val);
                  fetchHistorial();
                }}
              >
                <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Todos los Estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="anulado">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistorial}
              className="gap-1.5 text-xs cursor-pointer self-end sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualizar Historial</span>
            </Button>
          </div>

          {/* Tabla del Historial */}
          <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/80">
                  <tr>
                    <th className="py-3 px-4">Comprobante</th>
                    <th className="py-3 px-4">Emisión</th>
                    <th className="py-3 px-4">Especialista Médico</th>
                    <th className="py-3 px-4">Período</th>
                    <th className="py-3 px-4 text-center">Consultas</th>
                    <th className="py-3 px-4 text-right">Total Neto ($)</th>
                    <th className="py-3 px-4 text-right">Neto (Bs.)</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loadingHistorial ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        Cargando historial de liquidaciones...
                      </td>
                    </tr>
                  ) : liquidaciones.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        No se han generado liquidaciones de honorarios aún.
                      </td>
                    </tr>
                  ) : (
                    liquidaciones.map((liq) => {
                      return (
                        <tr key={liq.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                            {liq.codigo_liquidacion}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                            {new Date(liq.fecha_emision).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {liq.medico_nombre_completo}
                            {liq.medico_documento && (
                              <span className="block text-[10px] text-muted-foreground font-mono">
                                {liq.medico_documento}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                            {String(liq.periodo_desde).split('T')[0]} /{' '}
                            {String(liq.periodo_hasta).split('T')[0]}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {liq.total_cobros}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-foreground">
                            {formatUSD(liq.monto_neto_pagar_usd)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                            {formatVES(liq.monto_neto_pagar_ves)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                                liq.estado === 'pagado'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : liq.estado === 'anulado'
                                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              }`}
                            >
                              {liq.estado}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setLiquidacionSeleccionada(liq);
                                  setModalReciboOpen(true);
                                }}
                                className="h-7 px-2.5 text-xs font-semibold gap-1 text-teal-700 dark:text-teal-400 border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Ver / Imprimir</span>
                              </Button>

                              {liq.estado === 'pendiente' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setLiquidacionSeleccionada(liq);
                                    setPagoMetodo('transferencia');
                                    setPagoRef('');
                                    setPagoNotas('');
                                    setModalPagarOpen(true);
                                  }}
                                  className="h-7 px-2.5 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                >
                                  <DollarSign className="h-3.5 w-3.5" />
                                  <span>Pagar</span>
                                </Button>
                              )}

                              {liq.estado !== 'anulado' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAnularLiquidacion(liq)}
                                  className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE GENERACIÓN DE LIQUIDACIÓN FORMAL ── */}
      <Dialog open={modalLiquidarOpen} onOpenChange={setModalLiquidarOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-teal-500/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Confirmar Liquidación de Honorarios
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Se generará el comprobante contable y se bloquearán los recibos seleccionados
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            {/* Resumen */}
            <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Médico Especialista:</span>
                <strong className="text-foreground">
                  {resumenCalculo?.medico?.nombre_completo}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recibos a Liquidar:</span>
                <strong className="font-mono text-foreground">{selectedItems.length} consultas</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Honorarios Brutos:</span>
                <strong className="font-mono text-teal-600 dark:text-teal-400">
                  {formatUSD(subtotalHonorariosSelected)}
                </strong>
              </div>
            </div>

            {/* Deducciones */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Deducciones / Anticipos ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoDeduccion}
                  onChange={(e) => setMontoDeduccion(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Motivo Deducción</label>
                <input
                  type="text"
                  placeholder="Ej. Insumos odontológicos / Anticipo"
                  value={motivoDeduccion}
                  onChange={(e) => setMotivoDeduccion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Total Neto Preview */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-baseline justify-between">
              <span className="font-bold text-foreground">Total Neto a Percibir:</span>
              <div className="text-right">
                <span className="text-base font-black text-teal-700 dark:text-teal-400 font-mono block">
                  {formatUSD(netoPagarFinalUSD)}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                  {formatVES(netoPagarFinalVES)}
                </span>
              </div>
            </div>

            {/* Opción de Pago Inmediato */}
            <div className="pt-2 border-t border-border/60 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marcarComoPagado}
                  onChange={(e) => setMarcarComoPagado(e.target.checked)}
                  className="rounded border-border text-teal-600 focus:ring-teal-500"
                />
                <span className="font-bold text-foreground">
                  Registrar pago de inmediato (Desembolsado hoy)
                </span>
              </label>

              {marcarComoPagado && (
                <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2.5 animate-in fade-in-50">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Método de Pago</Label>
                      <Select
                        value={metodoPago}
                        onValueChange={(val) => setMetodoPago(val)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs rounded-lg">
                          <SelectValue placeholder="Método de Pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                          <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                          <SelectItem value="zelle">Zelle</SelectItem>
                          <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
                          <SelectItem value="efectivo_ves">Efectivo VES</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Nro. de Referencia</label>
                      <input
                        type="text"
                        placeholder="Ej. 984512"
                        value={referenciaPago}
                        onChange={(e) => setReferenciaPago(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-muted-foreground">Notas u Observaciones</Label>
              <Textarea
                rows={2}
                placeholder="Observaciones de la liquidación..."
                value={notasLiquidacion}
                onChange={(e) => setNotasLiquidacion(e.target.value)}
                className="w-full text-xs rounded-lg min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 flex sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalLiquidarOpen(false)}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerarLiquidacion}
              disabled={liquidando}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{liquidando ? 'Procesando...' : 'Confirmar y Emitir'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE CONFIGURACIÓN DE REGLAS DE COMISIÓN ── */}
      <Dialog open={modalConfigOpen} onOpenChange={setModalConfigOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Reglas de Comisión y Datos Bancarios
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {resumenCalculo?.medico?.nombre_completo}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            {/* Modalidad de Comisión */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Modalidad de Comisión</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfigTipo('porcentaje')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    configTipo === 'porcentaje'
                      ? 'bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/20'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  Porcentaje (%)
                </button>
                <button
                  type="button"
                  onClick={() => setConfigTipo('fijo')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    configTipo === 'fijo'
                      ? 'bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/20'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  Monto Fijo ($)
                </button>
              </div>
            </div>

            {configTipo === 'porcentaje' ? (
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">
                  Porcentaje correspondiente al Médico (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={configPorcentaje}
                    onChange={(e) => setConfigPorcentaje(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  La clínica retendrá automáticamente el restante {(100 - (configPorcentaje || 0)).toFixed(1)}%.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">
                  Monto Fijo por Consulta / Recibo ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={configFijo}
                  onChange={(e) => setConfigFijo(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            {/* Datos Bancarios */}
            <div className="pt-3 border-t border-border/60 space-y-2.5">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-teal-600" />
                Datos para Pago de Honorarios
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Banco</label>
                  <input
                    type="text"
                    placeholder="Ej. Banesco / Mercantil"
                    value={configBanco}
                    onChange={(e) => setConfigBanco(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Titular</label>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={configTitular}
                    onChange={(e) => setConfigTitular(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Número de Cuenta</label>
                <input
                  type="text"
                  placeholder="0134-..."
                  value={configCuenta}
                  onChange={(e) => setConfigCuenta(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Pago Móvil</label>
                  <input
                    type="text"
                    placeholder="0412-1234567 / V-12345678"
                    value={configPagoMovil}
                    onChange={(e) => setConfigPagoMovil(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-[11px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Zelle</label>
                  <input
                    type="text"
                    placeholder="correo@zelle.com"
                    value={configZelle}
                    onChange={(e) => setConfigZelle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 flex sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalConfigOpen(false)}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGuardarConfiguracion}
              disabled={guardandoConfig}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              <span>{guardandoConfig ? 'Guardando...' : 'Guardar Parámetros'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL REGISTRAR PAGO DESDE HISTORIAL ── */}
      <Dialog open={modalPagarOpen} onOpenChange={setModalPagarOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-emerald-500/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Registrar Desembolso de Honorarios
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Liquidación {liquidacionSeleccionada?.codigo_liquidacion} | Monto:{' '}
                  <strong className="text-foreground">
                    {formatUSD(liquidacionSeleccionada?.monto_neto_pagar_usd || 0)}
                  </strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label className="font-bold text-foreground">Forma de Pago Empleada</Label>
              <Select
                value={pagoMetodo}
                onValueChange={(val) => setPagoMetodo(val)}
              >
                <SelectTrigger className="w-full h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Forma de Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                  <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
                  <SelectItem value="efectivo_ves">Efectivo VES</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Nro. de Referencia / Comprobante</label>
              <input
                type="text"
                placeholder="Ej. REF-981240"
                value={pagoRef}
                onChange={(e) => setPagoRef(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-foreground">Notas Contables</Label>
              <Textarea
                rows={2}
                placeholder="Detalle o notas adicionales del pago..."
                value={pagoNotas}
                onChange={(e) => setPagoNotas(e.target.value)}
                className="w-full text-xs rounded-lg min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 flex sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalPagarOpen(false)}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRegistrarPago}
              disabled={pagoSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              <span>{pagoSubmitting ? 'Registrando...' : 'Confirmar Pago'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL IMPRIMIBLE DE COMPROBANTE DE LIQUIDACIÓN ── */}
      <LiquidacionReciboModal
        open={modalReciboOpen}
        onOpenChange={setModalReciboOpen}
        liquidacion={liquidacionSeleccionada}
      />
    </div>
  );
};

export default HonorariosMedicosPage;
