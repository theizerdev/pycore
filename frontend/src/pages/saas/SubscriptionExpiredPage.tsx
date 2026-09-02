import React, { useEffect, useState } from 'react';
import type { Plan, SuscripcionEmpresa } from '../../types';
import { planesApi } from '../../api/planes';
import { suscripcionesApi } from '../../api/suscripciones';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  Lock,
  CreditCard,
  Zap,
  CheckCircle2,
  Minus,
  Plus,
  Upload,
  LogOut
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';

export const SubscriptionExpiredPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [suscripcion, setSuscripcion] = useState<SuscripcionEmpresa | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [extraSucursales, setExtraSucursales] = useState<number>(1);
  const [metodoPago, setMetodoPago] = useState<string>('transferencia');
  const [referenciaPago, setReferenciaPago] = useState<string>('');
  const [notasPago, setNotasPago] = useState<string>('');
  const [comprobanteBase64, setComprobanteBase64] = useState<string | null>(null);
  const [comprobanteNombre, setComprobanteNombre] = useState<string>('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subData, planesData] = await Promise.all([
        planesApi.getMiSuscripcion(),
        planesApi.list()
      ]);
      setSuscripcion(subData);

      // Filtrar el plan prueba de las opciones de pago
      const paidPlanes = planesData.filter((p) => p.codigo !== 'prueba');
      setPlanes(paidPlanes);

      if (paidPlanes.length > 0) {
        setSelectedPlanId(paidPlanes[0].id);
      }
      setExtraSucursales(subData.metricas.max_sucursales || 1);
    } catch (err) {
      console.error('Error cargando suscripción vencida:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentPlan = planes.find((p) => p.id === selectedPlanId) || planes[0] || null;
  const basePrice = currentPlan?.precio_mensual || 15.0;
  const precioExtra = currentPlan?.precio_sucursal_extra_mensual || 15.0;
  const sucursalesExtrasCount = Math.max(0, extraSucursales - (currentPlan?.sucursales_incluidas || 1));
  const costoExtraSucursales = sucursalesExtrasCount * precioExtra;
  const precioFinalEstimado = basePrice + costoExtraSucursales;

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
      toast.error('Selecciona un plan de suscripción');
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

      toast.success('🎉 Tu comprobante de pago ha sido registrado. Un administrador activará tu acceso a la brevedad.');
      setReferenciaPago('');
      setNotasPago('');
      setComprobanteBase64(null);
      setImagePreviewUrl(null);
      await loadData();
    } catch (err: any) {
      console.error('Error reportando pago:', err);
      toast.error(err.response?.data?.detail || 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header Bloqueo Expirado (Estilo FixSale POS) */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-1">
            <Lock className="h-8 w-8 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Período de Prueba o Suscripción Caducado
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">
            El acceso a los módulos operativos de <strong className="text-white">{suscripcion?.empresa_nombre || 'tu organización'}</strong> ha sido pausado. Selecciona un plan de renovación para reactivar el servicio inmediatamente.
          </p>

          <div className="flex justify-center pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs border-slate-700 text-slate-300 hover:text-white bg-slate-900 cursor-pointer gap-1.5"
            >
              <LogOut className="size-3.5" /> Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Card Formulario de Renovación FixSale POS */}
        <Card className="shadow-2xl border-2 border-rose-500/20 bg-slate-900 text-slate-100 overflow-hidden">
          <CardHeader className="pb-4 bg-slate-950/60 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white">Selecciona tu Plan de Renovación</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Tus datos y registros médicos se encuentran resguardados de forma 100% segura.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmitRenewal} className="space-y-6">
              {/* Paso 1. Selección de Plan Mensual */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  1. Selecciona tu Plan de Renovación
                </Label>

                <div className="grid gap-6 sm:grid-cols-2">
                  {planes.map((pItem) => {
                    const isSelected = selectedPlanId === pItem.id;
                    const price = pItem.precio_regular_mensual || pItem.precio_mensual || 15.0;

                    return (
                      <div
                        key={pItem.id}
                        onClick={() => setSelectedPlanId(pItem.id)}
                        className={`cursor-pointer rounded-2xl border-2 p-5 transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-lg ring-2 ring-emerald-500/20 scale-[1.02]'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                        }`}
                      >
                        {pItem.destacado && (
                          <Badge className="absolute -top-3 right-4 bg-amber-500 text-slate-950 text-[10px] font-bold px-2.5 py-0.5 shadow-sm">
                            ⭐ Más Popular
                          </Badge>
                        )}

                        <div className="space-y-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">{pItem.nombre}</span>
                          <p className="text-xs text-slate-400 min-h-[32px]">{pItem.descripcion}</p>

                          <div className="pt-2">
                            <h3 className="text-3xl font-black text-white font-mono">
                              ${price.toFixed(2)} <span className="text-xs font-semibold text-slate-400 font-sans">/ mes</span>
                            </h3>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Incluye:</span>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            <li className="flex items-start gap-2 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-tight">{pItem.sucursales_incluidas || 1} Sucursal incluida</span>
                            </li>
                            <li className="flex items-start gap-2 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-tight">Sucursal extra: +${(pItem.precio_sucursal_extra_mensual || 15).toFixed(2)}/mes</span>
                            </li>
                            <li className="flex items-start gap-2 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-tight">Acceso ilimitado a todos los módulos</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2. Sucursales & Resumen de Inversión */}
              <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-slate-800">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    2. Cantidad de Sucursales a Contratar
                  </Label>
                  <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                    <p className="text-xs text-slate-400">
                      El plan base incluye <strong>{currentPlan?.sucursales_incluidas || 1} sucursal(es)</strong>. Cada sucursal adicional suma +<strong className="text-emerald-400 font-bold">${precioExtra.toFixed(2)} USD/mes</strong>.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setExtraSucursales((prev) => Math.max(1, prev - 1))}
                        disabled={extraSucursales <= 1}
                        className="h-10 w-10 rounded-lg border-slate-700 bg-slate-900 cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>

                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={extraSucursales}
                        onChange={(e) => setExtraSucursales(parseInt(e.target.value) || 1)}
                        className="text-center font-bold text-lg h-10 w-24 bg-slate-950 border-slate-700 text-white"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setExtraSucursales((prev) => prev + 1)}
                        className="h-10 w-10 rounded-lg border-slate-700 bg-slate-900 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>

                      <span className="text-xs text-slate-400 font-medium">
                        {sucursalesExtrasCount === 0
                          ? '(Sin sucursales extras)'
                          : `+${sucursalesExtrasCount} sucursal(es) extra`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumen Sticky Dark Card */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Resumen de Inversión</span>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                        Cobro Mensual
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>{currentPlan?.nombre || 'Plan Mensual'}:</span>
                        <span className="font-mono font-semibold">${basePrice.toFixed(2)} USD</span>
                      </div>
                      {sucursalesExtrasCount > 0 && (
                        <div className="flex justify-between text-teal-300">
                          <span>{sucursalesExtrasCount} Sucursal(es) Extra:</span>
                          <span className="font-mono font-semibold">+${costoExtraSucursales.toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 mt-4 flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Total a Pagar / Transferir:</p>
                      <p className="text-3xl font-black font-mono text-emerald-400">
                        ${precioFinalEstimado.toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paso 3. Registro del Pago */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  3. Registro del Pago y Comprobante
                </Label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="metodo_pago" className="text-xs font-semibold text-slate-300">Método de Pago Utilizado</Label>
                    <Select value={metodoPago} onValueChange={setMetodoPago}>
                      <SelectTrigger id="metodo_pago" className="mt-1 h-10 bg-slate-950 border-slate-700 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="transferencia">🏦 Transferencia Bancaria</SelectItem>
                        <SelectItem value="pago_movil">📱 Pago Móvil</SelectItem>
                        <SelectItem value="zelle">💵 Zelle</SelectItem>
                        <SelectItem value="paypal">💳 PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="referencia" className="text-xs font-semibold text-slate-300">Número de Referencia</Label>
                    <Input
                      id="referencia"
                      placeholder="Ej: 987654321"
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      className="mt-1 h-10 bg-slate-950 border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="comprobante" className="text-xs font-semibold text-slate-300">
                      Adjuntar Captura / Comprobante (Imagen o PDF)
                    </Label>
                    <Input
                      id="comprobante"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="mt-1 cursor-pointer h-10 pt-1.5 bg-slate-950 border-slate-700 text-xs text-slate-300"
                    />
                    {imagePreviewUrl && (
                      <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-slate-800 w-32 h-32 relative">
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
                className="w-full font-bold h-12 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl cursor-pointer gap-2"
              >
                <Upload className="h-5 w-5" />
                {submitting ? 'Enviando...' : 'Enviar Solicitud de Renovación'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

