import React, { useEffect, useState } from 'react';
import type { Plan, SuscripcionEmpresa } from '../../types';
import { planesApi } from '../../api/planes';
import { suscripcionesApi, type PagoSuscripcion } from '../../api/suscripciones';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Upload,
  Calendar,
  Zap,
  Sparkles,
  Building2,
  Plus,
  Minus,
  Receipt,
  Check,
  Landmark,
  Smartphone,
  Copy
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';

export const PlanesBillingPage: React.FC = () => {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [suscripcion, setSuscripcion] = useState<SuscripcionEmpresa | null>(null);
  const [pagos, setPagos] = useState<PagoSuscripcion[]>([]);

  // Selección de Formulario
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [extraSucursales, setExtraSucursales] = useState<number>(1);
  const [metodoPago, setMetodoPago] = useState<string>('transferencia');
  const [referenciaPago, setReferenciaPago] = useState<string>('');
  const [notasPago, setNotasPago] = useState<string>('');
  const [comprobanteBase64, setComprobanteBase64] = useState<string | null>(null);
  const [comprobanteNombre, setComprobanteNombre] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [planesData, subData, pagosData] = await Promise.all([
        planesApi.list(),
        planesApi.getMiSuscripcion(),
        suscripcionesApi.getMisPagos()
      ]);
      setPlanes(planesData);
      setSuscripcion(subData);
      setPagos(pagosData);

      if (subData.plan_activo?.id) {
        setSelectedPlanId(subData.plan_activo.id);
      } else if (planesData.length > 0) {
        setSelectedPlanId(planesData[0].id);
      }

      setExtraSucursales(subData.metricas.max_sucursales || 1);
    } catch (err) {
      console.error('Error cargando suscripción:', err);
      toast.error('No se pudo cargar la información de la suscripción');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeSelectedPlan = planes.find((p) => p.id === selectedPlanId) || planes[0] || null;

  const isExempt = suscripcion?.empresa_id === 1;
  const isPaidActive = suscripcion?.plan_estado === 'activo' && !isExempt;

  // Cálculo financiero dinámico
  const baseMonthlyPrice = activeSelectedPlan?.precio_mensual || 0;
  const sucursalesExtrasCount = isPaidActive
    ? Math.max(0, extraSucursales - (suscripcion?.metricas.max_sucursales || 1))
    : Math.max(0, extraSucursales - (activeSelectedPlan?.sucursales_incluidas || 1));

  const precioSucursalExtra = activeSelectedPlan?.precio_sucursal_extra_mensual || 15.0;
  const costoExtraSucursales = sucursalesExtrasCount * precioSucursalExtra;
  const precioFinalEstimado = (isPaidActive ? 0 : baseMonthlyPrice) + costoExtraSucursales;

  const formatPrice = (usdAmount: number) => {
    return `$${usdAmount.toFixed(2)} USD`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El comprobante no debe superar los 5 MB');
      return;
    }

    setComprobanteNombre(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setComprobanteBase64(result);
      if (file.type.startsWith('image/')) {
        setImagePreviewUrl(result);
      } else {
        setImagePreviewUrl(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error('Por favor selecciona un plan');
      return;
    }

    try {
      setSubmitting(true);
      await suscripcionesApi.reportarPago({
        plan_id: selectedPlanId,
        ciclo_meses: 1,
        sucursales_contratadas: extraSucursales,
        metodo_pago: metodoPago,
        referencia_pago: referenciaPago,
        comprobante_base64: comprobanteBase64 || undefined,
        notas: notasPago
      });

      toast.success('🎉 Tu comprobante de pago ha sido registrado exitosamente. Será revisado y aprobado a la brevedad.');
      setReferenciaPago('');
      setNotasPago('');
      setComprobanteBase64(null);
      setImagePreviewUrl(null);
      await loadData();
    } catch (err: any) {
      console.error('Error reportando pago:', err);
      toast.error(err.response?.data?.detail || 'Error al enviar la solicitud de renovación');
    } finally {
      setSubmitting(false);
    }
  };

  // ── CÁLCULO DE VIGENCIA REAL Y DÍAS RESTANTES ──────────────────────
  const fechaInicio = suscripcion?.fecha_inicio ? new Date(suscripcion.fecha_inicio) : null;
  const fechaVencimiento = suscripcion?.plan_vencimiento ? new Date(suscripcion.plan_vencimiento) : null;

  const diasRestantes = fechaVencimiento
    ? Math.max(0, Math.ceil((fechaVencimiento.getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
    : 999;

  const totalDays = (fechaInicio && fechaVencimiento)
    ? Math.max(1, Math.round((fechaVencimiento.getTime() - fechaInicio.getTime()) / (1000 * 3600 * 24)))
    : (suscripcion?.plan_estado === 'prueba' ? 7 : 30);

  const progressPercent = Math.min(100, Math.max(0, (diasRestantes / totalDays) * 100));

  const getProgressColorClass = () => {
    if (diasRestantes <= 0) return 'bg-destructive';
    if (progressPercent > 30) return 'bg-emerald-500';
    if (progressPercent > 15) return 'bg-amber-500';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. BANNER HERO PRINCIPAL FIXSALE POS ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 h-56 w-56 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Plan SaaS Full Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Estado del Servicio y Suscripción
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Administra tu plan empresarial, renovaciones, capacidad de sucursales e historial de comprobantes de pago.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 border backdrop-blur-md shadow-inner ${
                isExempt
                  ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40'
                  : suscripcion?.plan_estado === 'activo'
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                  : suscripcion?.plan_estado === 'prueba'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-200 border-rose-500/40'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full animate-ping ${
                  isExempt ? 'bg-indigo-400' : suscripcion?.plan_estado === 'activo' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>
                {isExempt
                  ? 'Acceso Ilimitado (Owner)'
                  : suscripcion?.plan_estado === 'activo'
                  ? `Activo (${diasRestantes} días restantes)`
                  : 'Prueba Gratis'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. GRID DE ESTADO Y MÓDULOS INCLUIDOS ────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card de Estado Principal */}
        <Card className="md:col-span-2 shadow-sm border border-border">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                  {suscripcion?.empresa_nombre || 'PyCore Client'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Plan Actual: <span className="font-bold text-foreground">{suscripcion?.plan_activo?.nombre || 'Plan Profesional'}</span>
                </CardDescription>
              </div>
              <div className="text-left sm:text-right p-2 sm:p-0 rounded-lg bg-emerald-500/5 sm:bg-transparent">
                <span className="text-xs text-muted-foreground font-medium block">Capacidad Autorizada</span>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {suscripcion?.metricas.sucursales_usadas} / {suscripcion?.metricas.max_sucursales} Sucursal(es)
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Estado</p>
                <p className="text-sm font-bold capitalize text-foreground">
                  {isExempt ? 'Exento (Owner)' : suscripcion?.plan_estado}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Días Restantes</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {isExempt ? '∞' : `${diasRestantes} días`}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vencimiento</p>
                <p className="text-xs font-bold text-foreground">
                  {isExempt
                    ? 'Permanente'
                    : suscripcion?.plan_vencimiento
                    ? new Date(suscripcion.plan_vencimiento).toLocaleDateString()
                    : 'Indefinido'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sucursales Activas</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {suscripcion?.metricas.sucursales_usadas} activas
                </p>
              </div>
            </div>

            {/* Barra de Progreso de Vigencia */}
            {!isExempt && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Vigencia del Período</span>
                  <span className={progressPercent <= 15 ? 'text-destructive font-bold' : progressPercent <= 30 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {diasRestantes} días restantes ({Math.round(progressPercent)}% disponible)
                  </span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden p-0.5 border">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${getProgressColorClass()}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Módulos Incluidos */}
        <Card className="shadow-sm border border-border">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
              Módulos Incluidos (Plan Full)
            </CardTitle>
            <CardDescription className="text-xs">
              Todo el ecosistema de PyCore a tu disposición:
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-3 text-xs">
              {[
                'Gestión de Pacientes & Historias Clínicas',
                'Agenda Médica & Citas Automatizadas',
                'Recetas Médicas Electrónicas',
                'Bot WhatsApp & Notificaciones Masivas',
                'Multi-Moneda & Tasas BCV / Binance',
                'Sucursales & Sedes Multi-Tenant'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5 font-medium text-foreground">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. FORMULARIO DE RENOVACIÓN Y SELECCIÓN DE PLAN FIXSALE ───────────── */}
      {!isExempt && (
        <Card className="shadow-md border-2 border-emerald-500/20 overflow-hidden">
          <CardHeader className="bg-muted/40 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Renovar o Ampliar Suscripción</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Elige el nivel de tu plan y ajusta las sucursales requeridas para tu centro médico.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitRenewal} className="space-y-8">
              {/* Paso 1. Selección de Plan */}
              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Selecciona tu Plan Mensual
                </Label>
                <div className="grid gap-6 sm:grid-cols-3">
                  {planes.map((pItem) => {
                    const isSelected = selectedPlanId === pItem.id;
                    const isLocked = isPaidActive && !isSelected;

                    return (
                      <div
                        key={pItem.id}
                        onClick={() => {
                          if (!isLocked) setSelectedPlanId(pItem.id);
                        }}
                        className={`rounded-2xl border-2 p-5 transition-all relative flex flex-col justify-between ${
                          isLocked
                            ? 'opacity-50 cursor-not-allowed border-dashed border-border bg-muted/20 grayscale-[30%]'
                            : 'cursor-pointer'
                        } ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-500/5 shadow-md ring-2 ring-emerald-500/20 scale-[1.02]'
                            : 'border-border hover:border-muted-foreground/30 bg-card'
                        }`}
                      >
                        {isSelected && isPaidActive ? (
                          <Badge className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 shadow-sm">
                            ✓ Plan Activo
                          </Badge>
                        ) : pItem.destacado ? (
                          <Badge className="absolute -top-3 right-4 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 shadow-sm">
                            ⭐ Más Popular
                          </Badge>
                        ) : pItem.badge_promocion ? (
                          <Badge className="absolute -top-3 right-4 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 shadow-sm">
                            {pItem.badge_promocion}
                          </Badge>
                        ) : null}

                        <div className="space-y-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{pItem.nombre}</span>
                          <p className="text-xs text-muted-foreground min-h-[32px]">{pItem.descripcion}</p>

                          <div className="pt-2">
                            <h3 className="text-2xl sm:text-3xl font-black text-foreground flex items-baseline gap-1 flex-wrap">
                              {formatPrice(pItem.precio_mensual)} <span className="text-xs font-semibold text-muted-foreground">/ mes</span>
                            </h3>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t space-y-2">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase">Incluye:</span>
                          <ul className="space-y-1.5 text-xs">
                            <li className="flex items-start gap-2 text-foreground font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-tight">{pItem.sucursales_incluidas || 1} Sucursal incluida</span>
                            </li>
                            <li className="flex items-start gap-2 text-foreground font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-tight">Sucursal extra: {formatPrice(pItem.precio_sucursal_extra_mensual || 15)}/mes</span>
                            </li>
                            <li className="flex items-start gap-2 text-foreground font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-tight">Acceso completo PyCore PRO</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2. Selección de Sucursales y Resumen Financiero */}
              <div className="grid gap-6 md:grid-cols-2 pt-4 border-t">
                <div className="space-y-4">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                    Cantidad de Sucursales a Contratar
                  </Label>

                  <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
                    <p className="text-xs text-muted-foreground">
                      El plan base incluye <strong>{activeSelectedPlan?.sucursales_incluidas || 1} sucursal(es)</strong>. Cada sucursal adicional suma +<strong className="text-emerald-600 font-bold">{formatPrice(activeSelectedPlan?.precio_sucursal_extra_mensual || 15)}/mes</strong>.
                    </p>

                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setExtraSucursales((prev) => Math.max(1, prev - 1))}
                        disabled={extraSucursales <= 1}
                        className="h-10 w-10 rounded-lg cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>

                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={extraSucursales}
                        onChange={(e) => setExtraSucursales(parseInt(e.target.value) || 1)}
                        className="text-center font-bold text-lg h-10 w-24"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setExtraSucursales((prev) => prev + 1)}
                        className="h-10 w-10 rounded-lg cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>

                      <span className="text-xs text-muted-foreground font-medium">
                        {sucursalesExtrasCount === 0
                          ? '(Sin sucursales extras)'
                          : `+${sucursalesExtrasCount} sucursal(es) extra`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumen Sticky Card Dark */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden border border-slate-800">
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Resumen de Inversión</span>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                        Cobro Mensual
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>{activeSelectedPlan?.nombre || 'Plan Mensual'}:</span>
                        <span className="font-mono font-semibold">
                          {isPaidActive ? <span className="text-emerald-400 font-bold">✓ Pagado</span> : formatPrice(baseMonthlyPrice)}
                        </span>
                      </div>
                      {sucursalesExtrasCount > 0 && (
                        <div className="flex justify-between text-teal-300">
                          <span>{sucursalesExtrasCount} Sucursal(es) Extra:</span>
                          <span className="font-mono font-semibold">+{formatPrice(costoExtraSucursales)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 mt-4 relative z-10 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Total a Transferir / Pagar:</p>
                        <p className="text-3xl font-black font-mono text-emerald-400">
                          {formatPrice(precioFinalEstimado)}
                        </p>
                      </div>
                    </div>

                    {/* Conversión Oficial a Bolívares Integrada (Tasa BCV Euro) */}
                    {(metodoPago === 'transferencia' || metodoPago === 'pago_movil') && (
                      <div className="mt-2 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Tasa Oficial BCV Euro:</span>
                          <span className="font-mono font-semibold text-slate-200">
                            {(suscripcion?.tasa_bcv_eur || 926.5531).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs./EUR
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between pt-1">
                          <span className="text-slate-300 font-bold">Total a Pagar (VES):</span>
                          <span className="font-mono font-black text-xl text-emerald-400">
                            Bs. {(precioFinalEstimado * (suscripcion?.tasa_bcv_eur || 926.5531)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Paso 3. Registro del Pago */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  Registro del Pago y Comprobante
                </Label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="metodo_pago" className="text-xs font-semibold">Método de Pago Utilizado</Label>
                    <Select value={metodoPago} onValueChange={setMetodoPago}>
                      <SelectTrigger id="metodo_pago" className="mt-1 h-10 text-xs">
                        <SelectValue placeholder="Seleccionar Método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferencia">🏦 Transferencia Bancaria (VES - BCV Euro)</SelectItem>
                        <SelectItem value="pago_movil">📱 Pago Móvil (VES - BCV Euro)</SelectItem>
                        <SelectItem value="zelle">💵 Zelle</SelectItem>
                        <SelectItem value="paypal">💳 PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="referencia" className="text-xs font-semibold">Número de Referencia</Label>
                    <Input
                      id="referencia"
                      placeholder="Ej: 987654321"
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      className="mt-1 h-10 text-xs"
                    />
                  </div>

                  {/* Datos Bancarios y Pago Móvil de Empresa 1 */}
                  {(metodoPago === 'transferencia' || metodoPago === 'pago_movil') && suscripcion?.metodos_pago_master && (
                    <div className="sm:col-span-2 space-y-3 animate-fade-in">
                      {metodoPago === 'transferencia' && (
                        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-500/20">
                            <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                              <Landmark className="h-4 w-4 text-emerald-600" />
                              <span>Cuenta para Transferencia Bancaria (Empresa Principal)</span>
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-bold gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer self-start sm:self-auto"
                              onClick={() => {
                                const m = suscripcion.metodos_pago_master;
                                const totalBs = (precioFinalEstimado * (suscripcion?.tasa_bcv_eur || 926.5531)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                const text = `🏦 DATOS PARA TRANSFERENCIA BANCARIA:\n• Banco: ${m?.banco_nombre || 'N/A'}\n• Tipo de Cuenta: ${m?.banco_tipo_cuenta || 'Cuenta Corriente'}\n• N° de Cuenta: ${m?.banco_numero_cuenta || 'N/A'}\n• Titular: ${m?.banco_titular || 'N/A'}\n• RIF/Cédula: ${m?.banco_doc_identidad || 'N/A'}\n• Monto Total a Pagar (VES): Bs. ${totalBs}`;
                                navigator.clipboard.writeText(text);
                                toast.success('✓ Todos los datos de transferencia copiados al portapapeles');
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" /> Copiar Todos los Datos
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground pt-1">
                            <p className="flex items-center justify-between">
                              <span><strong>Banco:</strong> {suscripcion.metodos_pago_master.banco_nombre || 'No configurado'}</span>
                            </p>
                            <p><strong>Tipo Cuenta:</strong> {suscripcion.metodos_pago_master.banco_tipo_cuenta || 'Cuenta Corriente'}</p>
                            <p><strong>Titular:</strong> {suscripcion.metodos_pago_master.banco_titular || 'No configurado'}</p>
                            <p className="flex items-center justify-between">
                              <span><strong>RIF/CI:</strong> {suscripcion.metodos_pago_master.banco_doc_identidad || 'No configurado'}</span>
                              {suscripcion.metodos_pago_master.banco_doc_identidad && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-[10px] gap-1 text-emerald-600 hover:text-emerald-700"
                                  onClick={() => {
                                    navigator.clipboard.writeText(suscripcion.metodos_pago_master?.banco_doc_identidad || '');
                                    toast.success('RIF/Cédula copiado');
                                  }}
                                >
                                  <Copy className="h-3 w-3" /> Copiar RIF
                                </Button>
                              )}
                            </p>
                          </div>
                          {suscripcion.metodos_pago_master.banco_numero_cuenta && (
                            <div className="font-mono text-foreground font-bold text-xs bg-background/80 p-2.5 rounded-lg border flex items-center justify-between mt-1">
                              <span>N° Cuenta: {suscripcion.metodos_pago_master.banco_numero_cuenta}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1 font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                                onClick={() => {
                                  navigator.clipboard.writeText(suscripcion.metodos_pago_master?.banco_numero_cuenta || '');
                                  toast.success('Número de cuenta copiado al portapapeles');
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" /> Copiar N° Cuenta
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {metodoPago === 'pago_movil' && (
                        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-500/20">
                            <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                              <Smartphone className="h-4 w-4 text-emerald-600" />
                              <span>Datos para Pago Móvil (Empresa Principal)</span>
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-bold gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer self-start sm:self-auto"
                              onClick={() => {
                                const m = suscripcion.metodos_pago_master;
                                const totalBs = (precioFinalEstimado * (suscripcion?.tasa_bcv_eur || 926.5531)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                const text = `📱 DATOS PARA PAGO MÓVIL:\n• Banco: ${m?.pagomovil_banco || 'N/A'}\n• Teléfono: ${m?.pagomovil_telefono || 'N/A'}\n• Cédula/RIF: ${m?.pagomovil_doc_identidad || 'N/A'}\n• Monto Total a Pagar (VES): Bs. ${totalBs}`;
                                navigator.clipboard.writeText(text);
                                toast.success('✓ Todos los datos de Pago Móvil copiados al portapapeles');
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" /> Copiar Todos los Datos
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-muted-foreground pt-1">
                            <p><strong>Banco:</strong> {suscripcion.metodos_pago_master.pagomovil_banco || 'No configurado'}</p>
                            <p className="flex items-center justify-between sm:block">
                              <span><strong>Teléfono:</strong> {suscripcion.metodos_pago_master.pagomovil_telefono || 'No configurado'}</span>
                              {suscripcion.metodos_pago_master.pagomovil_telefono && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-[10px] gap-1 text-emerald-600 hover:text-emerald-700 sm:hidden"
                                  onClick={() => {
                                    navigator.clipboard.writeText(suscripcion.metodos_pago_master?.pagomovil_telefono || '');
                                    toast.success('Teléfono copiado');
                                  }}
                                >
                                  <Copy className="h-3 w-3" /> Copiar
                                </Button>
                              )}
                            </p>
                            <p className="flex items-center justify-between">
                              <span><strong>Cédula/RIF:</strong> {suscripcion.metodos_pago_master.pagomovil_doc_identidad || 'No configurado'}</span>
                              {suscripcion.metodos_pago_master.pagomovil_doc_identidad && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-[10px] gap-1 text-emerald-600 hover:text-emerald-700"
                                  onClick={() => {
                                    navigator.clipboard.writeText(suscripcion.metodos_pago_master?.pagomovil_doc_identidad || '');
                                    toast.success('Cédula/RIF copiado');
                                  }}
                                >
                                  <Copy className="h-3 w-3" /> Copiar RIF
                                </Button>
                              )}
                            </p>
                          </div>
                          {suscripcion.metodos_pago_master.pagomovil_telefono && (
                            <div className="font-mono text-foreground font-bold text-xs bg-background/80 p-2.5 rounded-lg border flex items-center justify-between mt-1">
                              <span>Teléfono Pago Móvil: {suscripcion.metodos_pago_master.pagomovil_telefono}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1 font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                                onClick={() => {
                                  navigator.clipboard.writeText(suscripcion.metodos_pago_master?.pagomovil_telefono || '');
                                  toast.success('Teléfono de Pago Móvil copiado');
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" /> Copiar Teléfono
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <Label htmlFor="comprobante" className="text-xs font-semibold">Adjuntar Captura / Comprobante (Imagen o PDF)</Label>
                    <Input
                      id="comprobante"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="mt-1 cursor-pointer h-10 pt-1.5 text-xs"
                    />
                    {imagePreviewUrl && (
                      <div className="mt-3 p-2 bg-muted rounded-lg border w-32 h-32 relative">
                        <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover rounded" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full sm:w-auto gap-2 font-bold px-8 shadow-md h-11 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <Upload className="h-5 w-5" />
                {submitting ? 'Enviando...' : 'Enviar Solicitud de Renovación'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── 4. HISTORIAL DE PAGOS Y COMPROBANTES ─────────────────────────────── */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <div>
              <CardTitle className="text-lg font-bold">Historial de Renovaciones y Comprobantes</CardTitle>
              <CardDescription className="text-xs">Seguimiento de pagos enviados y su estado de aprobación.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-[10px] uppercase font-bold">
                <TableHead className="font-bold">Fecha</TableHead>
                <TableHead className="font-bold">Duración</TableHead>
                <TableHead className="font-bold">Sucursales</TableHead>
                <TableHead className="font-bold">Monto Total</TableHead>
                <TableHead className="font-bold">Método</TableHead>
                <TableHead className="font-bold">Referencia</TableHead>
                <TableHead className="font-bold text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {pagos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No se han registrado comprobantes de pago.
                  </TableCell>
                </TableRow>
              ) : (
                pagos.map((pago) => (
                  <TableRow key={pago.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-[11px]">{new Date(pago.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{pago.ciclo_meses} {pago.ciclo_meses === 1 ? 'Mes' : 'Meses'}</TableCell>
                    <TableCell>{pago.sucursales_contratadas} sedes</TableCell>
                    <TableCell className="font-bold text-foreground">${pago.monto.toFixed(2)} USD</TableCell>
                    <TableCell className="uppercase font-semibold text-[10px]">{pago.metodo_pago}</TableCell>
                    <TableCell className="font-mono text-[10px]">{pago.referencia_pago || 'Sin referencia'}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="default"
                        className={`text-[10px] font-bold ${
                          pago.estado === 'approved'
                            ? 'bg-emerald-600 text-white'
                            : pago.estado === 'pending'
                            ? 'bg-amber-600 text-white'
                            : 'bg-destructive text-white'
                        }`}
                      >
                        {pago.estado === 'approved' ? 'APROBADO' : pago.estado === 'pending' ? 'PENDIENTE' : 'RECHAZADO'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
