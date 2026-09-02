import React, { useEffect, useState } from 'react';
import type { Plan } from '../../types';
import { planesApi } from '../../api/planes';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Check,
  Tag,
  DollarSign,
  Building2,
  Users,
  Layers,
  Flame,
  Zap,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Star,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';

export const PlanesAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Estado del Modal de Edición / Creación
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio_regular_mensual: 15,
    precio_promocional_mensual: 15,
    tiene_promocion: false,
    badge_promocion: '',
    destacado: false,
    orden: 1,
    sucursales_incluidas: 1,
    precio_sucursal_extra_mensual: 15,
    activo: true
  });

  const loadPlanes = async () => {
    try {
      setLoading(true);
      const data = await planesApi.list();
      setPlanes(data);
    } catch (err) {
      console.error('Error cargando planes:', err);
      toast.error('No se pudieron cargar los planes de suscripción');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanes();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      codigo: `plan_${Date.now()}`,
      nombre: '',
      descripcion: '',
      precio_regular_mensual: 15,
      precio_promocional_mensual: 15,
      tiene_promocion: false,
      badge_promocion: '',
      destacado: false,
      orden: planes.length + 1,
      sucursales_incluidas: 1,
      precio_sucursal_extra_mensual: 15,
      activo: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    const reg = plan.precio_regular_mensual || plan.precio_mensual || 15;
    const promo = plan.precio_promocional_mensual || reg;
    setFormData({
      codigo: plan.codigo || `plan_${plan.id}`,
      nombre: plan.nombre,
      descripcion: plan.descripcion || '',
      precio_regular_mensual: reg,
      precio_promocional_mensual: promo,
      tiene_promocion: Boolean(plan.tiene_promocion),
      badge_promocion: plan.badge_promocion || '',
      destacado: Boolean(plan.destacado),
      orden: plan.orden || 1,
      sucursales_incluidas: plan.sucursales_incluidas || 1,
      precio_sucursal_extra_mensual: plan.precio_sucursal_extra_mensual || 15,
      activo: Boolean(plan.activo)
    });
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre del plan es obligatorio');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        precio_mensual: formData.precio_regular_mensual,
        precio_3_meses: formData.precio_promocional_mensual,
        precio_6_meses: formData.precio_promocional_mensual,
        precio_12_meses: formData.precio_promocional_mensual,
        modulos_permitidos: ['todos']
      };

      if (editingPlan) {
        await planesApi.update(editingPlan.id, payload);
        toast.success(`Plan "${formData.nombre}" actualizado correctamente`);
      } else {
        await planesApi.create(payload);
        toast.success(`Plan "${formData.nombre}" creado exitosamente`);
      }

      setIsModalOpen(false);
      await loadPlanes();
    } catch (err: any) {
      console.error('Error al guardar el plan:', err);
      toast.error(err.response?.data?.detail || 'No se pudo guardar el plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    try {
      await planesApi.toggleStatus(plan.id);
      toast.success(`Plan "${plan.nombre}" ${!plan.activo ? 'activado' : 'desactivado'}`);
      await loadPlanes();
    } catch (err) {
      toast.error('Error al cambiar el estado del plan');
    }
  };

  const handleTogglePromo = async (plan: Plan) => {
    try {
      await planesApi.togglePromo(plan.id);
      toast.success(`Promoción de "${plan.nombre}" ${!plan.tiene_promocion ? 'activada' : 'desactivada'}`);
      await loadPlanes();
    } catch (err) {
      toast.error('Error al cambiar promoción');
    }
  };

  const handleToggleDestacado = async (plan: Plan) => {
    try {
      await planesApi.toggleDestacado(plan.id);
      toast.success(`Insignia destacado de "${plan.nombre}" actualizada`);
      await loadPlanes();
    } catch (err) {
      toast.error('Error al cambiar estado de destacado');
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    if (!confirm(`¿Estás seguro de eliminar o desactivar el plan "${plan.nombre}"?`)) return;
    try {
      const res = await planesApi.delete(plan.id);
      toast.info(res.detail || 'Operación realizada');
      await loadPlanes();
    } catch (err) {
      toast.error('Error al eliminar el plan');
    }
  };

  const totalPlanes = planes.length;
  const planesActivos = planes.filter((p) => p.activo).length;
  const planesConPromo = planes.filter((p) => p.tiene_promocion).length;

  return (
    <div className="space-y-8 pb-12">
      {/* ── 1. HERO BANNER FIXSALE POS ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            Configuración Global SaaS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Planes de Suscripción</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Administra las tarifas, precios promocionales, capacidad de sucursales e insignias destacadas de los planes del sistema.
          </p>
        </div>

        <div className="relative z-10">
          <Button
            onClick={handleOpenCreate}
            size="lg"
            className="font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Crear Nuevo Plan
          </Button>
        </div>
      </div>

      {/* ── 2. STATS KPI HEADER (FIXSALE POS) ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Planes</p>
              <p className="text-2xl font-black">{totalPlanes}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Planes Activos</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{planesActivos}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Con Oferta / Promo</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{planesConPromo}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Planes Destacados</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {planes.filter((p) => p.destacado).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. TOOLBAR Y SWITCH DE VISTA ────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-muted/40 p-2 rounded-xl border">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
          Catálogo de Ofertas Disponibles
        </span>

        <div className="flex items-center gap-1 bg-background p-1 rounded-lg border">
          <Button
            type="button"
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-3 text-xs cursor-pointer gap-1.5 font-semibold"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="size-3.5" /> Tarjetas
          </Button>
          <Button
            type="button"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-3 text-xs cursor-pointer gap-1.5 font-semibold"
            onClick={() => setViewMode('table')}
          >
            <TableIcon className="size-3.5" /> Tabla
          </Button>
        </div>
      </div>

      {/* ── 4. CARDS GRID O VISTA TABLA (FIXSALE POS) ────────────────────────── */}
      {viewMode === 'cards' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {planes.map((p) => {
            const regularMensual = p.precio_regular_mensual || p.precio_mensual || 15;
            const promoMensual = p.precio_promocional_mensual || regularMensual;
            const tienePromo = Boolean(p.tiene_promocion) && promoMensual < regularMensual;

            return (
              <Card
                key={p.id}
                className={`relative flex flex-col justify-between border-2 shadow-sm transition-all ${
                  !p.activo
                    ? 'opacity-60 bg-muted/30 border-dashed'
                    : p.destacado
                    ? 'border-emerald-600 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                {p.destacado ? (
                  <Badge className="absolute -top-3 right-4 bg-amber-500 text-slate-950 font-bold text-[10px] shadow-sm">
                    ⭐ Más Popular
                  </Badge>
                ) : tienePromo ? (
                  <Badge className="absolute -top-3 right-4 bg-red-600 text-white font-bold text-[10px] shadow-sm">
                    {p.badge_promocion || 'OFERTA'}
                  </Badge>
                ) : null}

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      {p.nombre}
                    </span>
                    <Badge variant={p.activo ? 'default' : 'secondary'} className="text-[10px]">
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs min-h-[36px] mt-1">
                    {p.descripcion || 'Acceso completo a las herramientas del sistema.'}
                  </CardDescription>

                  <div className="pt-3">
                    {tienePromo && (
                      <span className="text-xs text-muted-foreground line-through block font-mono">
                        ${regularMensual.toFixed(2)} USD
                      </span>
                    )}
                    <h3 className="text-3xl font-black text-foreground font-mono flex items-baseline gap-1">
                      ${(tienePromo ? promoMensual : regularMensual).toFixed(2)}{' '}
                      <span className="text-xs font-semibold text-muted-foreground font-sans">/ mes</span>
                    </h3>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-2 border-t mt-2">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Sucursales Incluidas:</span>
                      <span className="font-bold text-foreground">{p.sucursales_incluidas || 1} sede(s)</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Costo Sucursal Extra:</span>
                      <span className="font-bold font-mono text-emerald-600">
                        +${(p.precio_sucursal_extra_mensual || 15).toFixed(2)} USD/mes
                      </span>
                    </div>
                  </div>

                  {/* Switches de Control Rápido */}
                  <div className="p-3 bg-muted/40 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground">Plan Activo</span>
                      <Switch checked={p.activo} onCheckedChange={() => handleToggleStatus(p)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground">Promoción</span>
                      <Switch checked={p.tiene_promocion} onCheckedChange={() => handleTogglePromo(p)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground">Destacado (⭐)</span>
                      <Switch checked={p.destacado} onCheckedChange={() => handleToggleDestacado(p)} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold gap-1 cursor-pointer"
                      onClick={() => handleOpenEdit(p)}
                    >
                      <Edit className="size-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
                      onClick={() => handleDeletePlan(p)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm border">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[10px] uppercase font-bold">
                  <TableHead className="font-bold">Nombre del Plan</TableHead>
                  <TableHead className="font-bold">Precio Regular</TableHead>
                  <TableHead className="font-bold">Precio Promo</TableHead>
                  <TableHead className="font-bold">Sucursales</TableHead>
                  <TableHead className="font-bold">Sucursal Extra</TableHead>
                  <TableHead className="font-bold">Estatus</TableHead>
                  <TableHead className="font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {planes.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold text-foreground">
                      {p.nombre}
                      {p.destacado && <span className="ml-1 text-amber-500">⭐</span>}
                    </TableCell>
                    <TableCell className="font-mono">${(p.precio_regular_mensual || 15).toFixed(2)} USD</TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600">
                      ${(p.precio_promocional_mensual || p.precio_regular_mensual || 15).toFixed(2)} USD
                    </TableCell>
                    <TableCell>{p.sucursales_incluidas || 1} sedes</TableCell>
                    <TableCell className="font-mono">+${(p.precio_sucursal_extra_mensual || 15).toFixed(2)} USD</TableCell>
                    <TableCell>
                      <Badge variant={p.activo ? 'default' : 'secondary'} className="text-[10px]">
                        {p.activo ? 'ACTIVO' : 'INACTIVO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1 cursor-pointer"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <Edit className="size-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-rose-600 cursor-pointer"
                        onClick={() => handleDeletePlan(p)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── 5. MODAL DE CREACIÓN / EDICIÓN FIXSALE POS ───────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="size-5 text-emerald-600" />
              <span>{editingPlan ? 'Editar Plan de Suscripción' : 'Crear Nuevo Plan de Suscripción'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura los valores de cobro, promoción e inclusiones del plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 py-2 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="font-bold">Nombre del Plan *</Label>
                <Input
                  id="nombre"
                  required
                  placeholder="Ej: Plan Mensual"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="codigo" className="font-bold">Código Interno</Label>
                <Input
                  id="codigo"
                  required
                  placeholder="Ej: mensual"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="descripcion" className="font-bold">Descripción del Plan</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describe brevemente las ventajas..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="text-xs h-16"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="precio_regular" className="font-bold">Precio Regular Mensual ($ USD)</Label>
                <Input
                  id="precio_regular"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.precio_regular_mensual}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      precio_regular_mensual: parseFloat(e.target.value) || 0
                    })
                  }
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="precio_promo" className="font-bold">Precio Promocional Mensual ($ USD)</Label>
                <Input
                  id="precio_promo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precio_promocional_mensual}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      precio_promocional_mensual: parseFloat(e.target.value) || 0
                    })
                  }
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sucursales_incluidas" className="font-bold">Sucursales Incluidas Base</Label>
                <Input
                  id="sucursales_incluidas"
                  type="number"
                  min="1"
                  required
                  value={formData.sucursales_incluidas}
                  onChange={(e) => setFormData({ ...formData, sucursales_incluidas: parseInt(e.target.value) || 1 })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="precio_sucursal_extra" className="font-bold">Costo Sucursal Extra Mensual ($)</Label>
                <Input
                  id="precio_sucursal_extra"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.precio_sucursal_extra_mensual}
                  onChange={(e) => setFormData({ ...formData, precio_sucursal_extra_mensual: parseFloat(e.target.value) || 0 })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="badge_promocion" className="font-bold">Badge / Insignia de Oferta (Opcional)</Label>
                <Input
                  id="badge_promocion"
                  placeholder="Ej: -20% OFF / Prueba Gratuita"
                  value={formData.badge_promocion}
                  onChange={(e) => setFormData({ ...formData, badge_promocion: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Toggles de Configuración */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-3 pt-3 border">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer font-bold">Activar Promoción</Label>
                <Switch
                  checked={formData.tiene_promocion}
                  onCheckedChange={(val) => setFormData({ ...formData, tiene_promocion: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer font-bold">Marcar como Destacado ⭐ (Más Popular)</Label>
                <Switch
                  checked={formData.destacado}
                  onCheckedChange={(val) => setFormData({ ...formData, destacado: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer font-bold">Plan Activo & Visible</Label>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(val) => setFormData({ ...formData, activo: val })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs cursor-pointer">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

