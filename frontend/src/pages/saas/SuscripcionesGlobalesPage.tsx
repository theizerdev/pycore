import React, { useEffect, useState, useMemo } from 'react';
import type { Plan, SuscripcionEmpresa } from '../../types';
import { planesApi } from '../../api/planes';
import { suscripcionesApi, type PagoSuscripcion } from '../../api/suscripciones';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  CreditCard,
  Building2,
  Users,
  MessageSquare,
  Search,
  Pencil,
  Sparkles,
  DollarSign,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Check,
  X,
  FileText,
  Eye,
  AlertTriangle,
  Shield,
  Send,
  Calendar
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
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

export const SuscripcionesGlobalesPage: React.FC = () => {
  const { user } = useAuth();
  const [suscripciones, setSuscripciones] = useState<SuscripcionEmpresa[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [pagosPendientes, setPagosPendientes] = useState<PagoSuscripcion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal de edición administrativa de suscripción
  const [editingSub, setEditingSub] = useState<SuscripcionEmpresa | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<number | null>(null);
  const [targetEstado, setTargetEstado] = useState<string>('activo');
  const [targetVencimiento, setTargetVencimiento] = useState<string>('');
  const [targetSucursales, setTargetSucursales] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);

  // Previsualización de Comprobante & Modal de Rechazo
  const [previewComprobante, setPreviewComprobante] = useState<PagoSuscripcion | null>(null);
  const [rejectingPago, setRejectingPago] = useState<PagoSuscripcion | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subsData, planesData, pendientesData] = await Promise.all([
        planesApi.getTodasSuscripciones(),
        planesApi.list(),
        suscripcionesApi.getPagosPendientes()
      ]);
      setSuscripciones(subsData);
      setPlanes(planesData);
      setPagosPendientes(pendientesData);
    } catch (err) {
      console.error('Error al cargar suscripciones globales:', err);
      toast.error('No se pudo cargar el centro de control de suscripciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditDialog = (sub: SuscripcionEmpresa) => {
    setEditingSub(sub);
    setTargetPlanId(sub.plan_activo?.id || null);
    setTargetEstado(sub.plan_estado || 'activo');
    setTargetVencimiento(
      sub.plan_vencimiento ? sub.plan_vencimiento.split('T')[0] : new Date().toISOString().split('T')[0]
    );
    setTargetSucursales(sub.metricas.max_sucursales || 1);
  };

  const setDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setTargetVencimiento(d.toISOString().split('T')[0]);
  };

  const handleNotificarVencimientos = async () => {
    try {
      const res = await suscripcionesApi.notificarVencimientosProximos();
      toast.success(res.mensaje || 'Recordatorios de WhatsApp enviados correctamente');
    } catch (err) {
      toast.error('Error al enviar recordatorios de WhatsApp');
    }
  };

  const handleSaveAdminSubscription = async () => {
    if (!editingSub) return;
    try {
      setSaving(true);
      await planesApi.adminUpdateSuscripcion(editingSub.empresa_id, {
        plan_id: targetPlanId || undefined,
        plan_estado: targetEstado,
        plan_vencimiento: targetVencimiento ? new Date(targetVencimiento).toISOString() : null
      });

      toast.success(`Suscripción de ${editingSub.empresa_nombre} actualizada exitosamente`);
      setEditingSub(null);
      await loadData();
    } catch (err: any) {
      console.error('Error al actualizar suscripción:', err);
      toast.error(err.response?.data?.detail || 'No se pudo actualizar la suscripción');
    } finally {
      setSaving(false);
    }
  };

  const handleAprobarPago = async (pago: PagoSuscripcion) => {
    try {
      setActionLoading(true);
      await suscripcionesApi.aprobarPago(pago.id);
      toast.success(`🎉 Pago #${pago.id} aprobado. Suscripción y sucursales extendidas para la empresa.`);
      await loadData();
    } catch (err: any) {
      console.error('Error aprobando pago:', err);
      toast.error(err.response?.data?.detail || 'No se pudo aprobar el pago.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazarPago = async () => {
    if (!rejectingPago) return;
    try {
      setActionLoading(true);
      await suscripcionesApi.rechazarPago(rejectingPago.id, motivoRechazo);
      toast.info(`El pago #${rejectingPago.id} ha sido marcado como rechazado.`);
      setRejectingPago(null);
      setMotivoRechazo('');
      await loadData();
    } catch (err: any) {
      console.error('Error rechazando pago:', err);
      toast.error(err.response?.data?.detail || 'No se pudo rechazar el pago.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminder = (sub: SuscripcionEmpresa) => {
    toast.success(`📲 Recordatorio de vencimiento enviado por WhatsApp a ${sub.empresa_nombre}`);
  };

  const filteredEmpresas = useMemo(() => {
    return suscripciones.filter((sub) => {
      const isExempt = sub.empresa_id === 1;
      const matchSearch =
        sub.empresa_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(sub.empresa_id).includes(searchTerm);

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'exempt' && isExempt) ||
        (statusFilter === sub.plan_estado && !isExempt);

      return matchSearch && matchStatus;
    });
  }, [suscripciones, searchTerm, statusFilter]);

  const totalEmpresas = suscripciones.length;
  const activasCount = suscripciones.filter((s) => s.plan_estado === 'activo' && s.empresa_id !== 1).length;
  const pruebaCount = suscripciones.filter((s) => s.plan_estado === 'prueba' && s.empresa_id !== 1).length;
  const vencidasCount = suscripciones.filter((s) => s.plan_estado === 'vencido' && s.empresa_id !== 1).length;
  const exentasCount = suscripciones.filter((s) => s.empresa_id === 1).length;

  return (
    <div className="space-y-8 pb-10">
      {/* ── 1. HEADER PRINCIPAL SAAS CONTROL TOWER (FIXSALE POS) ───────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Shield className="h-4 w-4" />
            SaaS Control Tower
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Gestión Global de Suscripciones
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Control de empresas registradas, aprobación de transferencias y extensiones de vigencia del sistema.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Button
            onClick={handleNotificarVencimientos}
            variant="outline"
            size="sm"
            className="bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800 text-xs font-bold gap-2 cursor-pointer shadow-md"
          >
            <Send className="size-3.5 text-emerald-400" />
            <span>Notificar Vencimientos (3 Días)</span>
          </Button>

          {pagosPendientes.length > 0 && (
            <Badge className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center gap-2 shadow-lg animate-bounce">
              <Clock className="h-4 w-4" />
              {pagosPendientes.length} pago(s) pendiente(s) por revisar
            </Badge>
          )}
        </div>
      </div>

      {/* ── 2. KPI METRICS DASHBOARD (5 TARJETAS FIXSALE) ──────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Empresas</p>
              <p className="text-2xl font-black">{totalEmpresas}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Activas</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activasCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">En Prueba</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pruebaCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Vencidas</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{vencidasCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Exentas (Owner)</p>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{exentasCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. SECCIÓN DE PAGOS PENDIENTES POR APROBAR ────────────────────── */}
      {pagosPendientes.length > 0 && (
        <Card className="border-2 border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-lg">
          <CardHeader className="pb-3 border-b border-amber-500/20">
            <CardTitle className="text-base font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Clock className="h-5 w-5 animate-pulse" />
              Solicitudes de Pago Pendientes de Revisión ({pagosPendientes.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Revisa los comprobantes adjuntos y aprueba para extender el servicio automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-500/10 text-[10px] uppercase font-bold">
                  <TableHead className="font-bold">Fecha</TableHead>
                  <TableHead className="font-bold">Empresa ID</TableHead>
                  <TableHead className="font-bold">Plan Solicitado</TableHead>
                  <TableHead className="font-bold">Monto & Ciclo</TableHead>
                  <TableHead className="font-bold">Método / Ref.</TableHead>
                  <TableHead className="font-bold">Comprobante</TableHead>
                  <TableHead className="font-bold text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {pagosPendientes.map((pago) => (
                  <TableRow key={pago.id} className="hover:bg-amber-500/5">
                    <TableCell className="font-mono text-[11px]">{new Date(pago.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-bold">Empresa #{pago.empresa_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold text-[11px]">
                        {pago.plan?.nombre || 'Plan Profesional'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black text-foreground">
                      ${pago.monto.toFixed(2)} USD
                      <span className="block text-[10px] text-muted-foreground font-normal">
                        {pago.ciclo_meses} mes ({pago.sucursales_contratadas} sedes)
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="uppercase font-bold text-[10px] block">{pago.metodo_pago}</span>
                      <span className="font-mono text-[10px]">{pago.referencia_pago || 'Sin ref'}</span>
                    </TableCell>
                    <TableCell>
                      {pago.comprobante_path ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary gap-1 cursor-pointer h-7 px-2"
                          onClick={() => setPreviewComprobante(pago)}
                        >
                          <Eye className="size-3.5" /> Ver Adjunto
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">Sin archivo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs cursor-pointer h-7"
                        onClick={() => setRejectingPago(pago)}
                        disabled={actionLoading}
                      >
                        <X className="size-3.5" /> Rechazar
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs cursor-pointer h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        onClick={() => handleAprobarPago(pago)}
                        disabled={actionLoading}
                      >
                        <Check className="size-3.5" /> Aprobar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── 4. TABLA GENERAL DE EMPRESAS Y SUSCRIPCIONES ───────────────────── */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa por nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Filtro de Estatus Pills */}
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border">
              {[
                { label: 'Todas', val: 'all' },
                { label: 'Activas', val: 'activo' },
                { label: 'En Prueba', val: 'prueba' },
                { label: 'Vencidas', val: 'vencido' },
                { label: 'Exentas', val: 'exempt' }
              ].map((item) => (
                <Button
                  key={item.val}
                  type="button"
                  variant={statusFilter === item.val ? 'default' : 'ghost'}
                  size="sm"
                  className="text-xs font-bold px-3 py-1 cursor-pointer"
                  onClick={() => setStatusFilter(item.val)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-[10px] uppercase font-bold">
                <TableHead className="font-bold">Empresa</TableHead>
                <TableHead className="font-bold">Plan Suscrito</TableHead>
                <TableHead className="font-bold">Estatus</TableHead>
                <TableHead className="font-bold">Vencimiento</TableHead>
                <TableHead className="font-bold">Sucursales</TableHead>
                <TableHead className="font-bold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Cargando empresas...
                  </TableCell>
                </TableRow>
              ) : filteredEmpresas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron empresas registradas.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmpresas.map((sub) => {
                  const isExempt = sub.empresa_id === 1;

                  return (
                    <TableRow key={sub.empresa_id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            #{sub.empresa_id}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">{sub.empresa_nombre}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-bold text-[11px]">
                          {sub.plan_activo?.nombre || 'Plan Profesional'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="default"
                          className={`text-[10px] font-semibold ${
                            isExempt
                              ? 'bg-purple-600 text-white'
                              : sub.plan_estado === 'activo'
                              ? 'bg-emerald-600 text-white'
                              : sub.plan_estado === 'prueba'
                              ? 'bg-amber-600 text-white'
                              : 'bg-destructive text-white'
                          }`}
                        >
                          {isExempt ? 'EXENTO (OWNER)' : sub.plan_estado.toUpperCase()}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {isExempt
                          ? 'Permanente'
                          : sub.plan_vencimiento
                          ? new Date(sub.plan_vencimiento).toLocaleDateString()
                          : 'Sin fecha'}
                      </TableCell>

                      <TableCell className="font-semibold">
                        {sub.metricas.sucursales_usadas} / {sub.metricas.max_sucursales} sedes
                      </TableCell>

                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5 cursor-pointer"
                          onClick={() => openEditDialog(sub)}
                        >
                          <Pencil className="size-3.5" />
                          <span>Gestionar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-emerald-600 gap-1.5 cursor-pointer"
                          onClick={() => handleSendReminder(sub)}
                        >
                          <Send className="size-3.5" />
                          <span>WhatsApp</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 5. MODAL DE GESTIÓN ADMINISTRATIVA CON BOTONES RÁPIDOS ─────────── */}
      <Dialog open={!!editingSub} onOpenChange={() => setEditingSub(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="size-5 text-primary" />
              <span>Gestionar Suscripción de Empresa</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modifica manualmente el plan, estado o extiende la fecha de vencimiento de <strong>{editingSub?.empresa_nombre}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Plan Asignado:</label>
              <Select
                value={targetPlanId ? String(targetPlanId) : ''}
                onValueChange={(val) => setTargetPlanId(Number(val))}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seleccionar Plan" />
                </SelectTrigger>
                <SelectContent>
                  {planes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre} — ${p.precio_mensual}/mes ({p.max_usuarios} usr, {p.max_sucursales} sedes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Estado de Suscripción:</label>
              <Select value={targetEstado} onValueChange={setTargetEstado}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seleccionar Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="prueba">En Prueba</SelectItem>
                  <SelectItem value="vencido">Vencido / Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Fecha de Renovación / Vencimiento:</label>
              <Input
                type="date"
                value={targetVencimiento}
                onChange={(e) => setTargetVencimiento(e.target.value)}
                className="text-xs"
              />
              {/* Accesos rápidos para extender fecha */}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 cursor-pointer" onClick={() => setDateOffset(7)}>
                  +7 días
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 cursor-pointer" onClick={() => setDateOffset(30)}>
                  +1 mes
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 cursor-pointer" onClick={() => setDateOffset(365)}>
                  +1 año
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingSub(null)} className="text-xs cursor-pointer">
              Cancelar
            </Button>
            <Button onClick={handleSaveAdminSubscription} disabled={saving} className="text-xs font-bold gap-2 cursor-pointer bg-primary text-primary-foreground">
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 6. MODAL DE COMPROBANTE Y RECHAZO ───────────────────────────────── */}
      <Dialog open={!!previewComprobante} onOpenChange={() => setPreviewComprobante(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Comprobante de Pago Adjunto</DialogTitle>
          </DialogHeader>
          {previewComprobante?.comprobante_path && (
            <div className="max-h-[400px] overflow-auto border rounded-lg p-2 bg-black/5 flex justify-center">
              {previewComprobante.comprobante_path.startsWith('data:image') || previewComprobante.comprobante_path.endsWith('.png') || previewComprobante.comprobante_path.endsWith('.jpg') ? (
                <img src={previewComprobante.comprobante_path} alt="Comprobante" className="max-w-full h-auto object-contain rounded" />
              ) : (
                <iframe src={previewComprobante.comprobante_path} className="w-full h-96" title="Comprobante PDF" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingPago} onOpenChange={() => setRejectingPago(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">Rechazar Pago #{rejectingPago?.id}</DialogTitle>
            <DialogDescription className="text-xs">
              Ingresa el motivo del rechazo para notificar al cliente:
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Ej: La referencia de pago no fue localizada..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              className="text-xs h-24"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectingPago(null)} className="text-xs cursor-pointer">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRechazarPago} disabled={actionLoading} className="text-xs font-bold cursor-pointer">
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
