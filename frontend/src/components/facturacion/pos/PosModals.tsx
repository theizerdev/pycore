import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Eye,
  Plus,
  History,
  Clock,
  Printer,
  Ban,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeftRight,
  Stethoscope,
  CalendarCheck,
  Tag,
  ShieldCheck,
  Activity,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import type { Cobro, CobroDetalleItem } from '../../../api/cajas';
import type { ConsultaMedica } from '../../../api/consultas';
import type { CitaMedica, Servicio } from '../../../types';
import {
  type PosPrinterConfig,
  savePosPrinterConfig,
} from './posPrinterConfig';
import { cn } from '../../../lib/utils';

const formatBs = (val: number) =>
  `Bs. ${(Number.isFinite(val) ? val : 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ============================================================================
// 1. [F10] BUSCADOR AVANZADO DE CATÁLOGO, CITAS DEL DÍA Y CONSULTAS
// ============================================================================
interface PosCatalogSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicios: Servicio[];
  todayPendingCitas: CitaMedica[];
  consultasPendientes: ConsultaMedica[];
  monedaReferencia: 'USD' | 'EUR';
  tasaActiva: number;
  onAddServicio: (serv: Servicio) => void;
  onLoadCita: (cita: CitaMedica) => void;
  onLinkConsulta: (consulta: ConsultaMedica) => void;
}

export const PosCatalogSearchModal: React.FC<PosCatalogSearchModalProps> = ({
  open,
  onOpenChange,
  servicios,
  todayPendingCitas,
  consultasPendientes,
  monedaReferencia,
  tasaActiva,
  onAddServicio,
  onLoadCita,
  onLinkConsulta,
}) => {
  const [tab, setTab] = useState<'servicios' | 'citas' | 'consultas'>('servicios');
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState('todos');
  const refSym = monedaReferencia === 'EUR' ? '€' : '$';
  const safeTasa = tasaActiva > 0 ? tasaActiva : 1;

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    servicios.forEach((s) => {
      if (s.categoria) set.add(s.categoria);
    });
    return ['todos', ...Array.from(set)];
  }, [servicios]);

  const filteredServicios = useMemo(() => {
    const q = query.trim().toLowerCase();
    return servicios.filter((s) => {
      const matchCat =
        categoria === 'todos' ||
        (s.categoria && s.categoria.toLowerCase() === categoria.toLowerCase());
      const matchQ =
        !q ||
        s.nombre.toLowerCase().includes(q) ||
        (s.codigo && s.codigo.toLowerCase().includes(q)) ||
        (s.categoria && s.categoria.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [servicios, query, categoria]);

  const filteredCitas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return todayPendingCitas;
    return todayPendingCitas.filter(
      (c) =>
        (c.paciente_nombre || '').toLowerCase().includes(q) ||
        (c.paciente_documento || '').toLowerCase().includes(q) ||
        (c.servicio_nombre || '').toLowerCase().includes(q) ||
        (c.medico_nombre || '').toLowerCase().includes(q)
    );
  }, [todayPendingCitas, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[88vh] flex flex-col p-4 sm:p-5 rounded-2xl bg-card text-card-foreground">
        <DialogHeader className="pb-2 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <Search className="w-4 h-4 text-primary" />
            [F10] Explorador de Servicios, Citas y Consultas
          </DialogTitle>
          <DialogDescription className="text-xs">
            Busque servicios médicos/odontológicos o cargue en 1 clic citas pendientes de cobro de hoy.
          </DialogDescription>
        </DialogHeader>

        {/* Pestañas de origen */}
        <div className="flex items-center gap-1.5 pt-1 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setTab('servicios')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border',
              tab === 'servicios'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            Catálogo de Servicios ({servicios.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('citas')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border',
              tab === 'citas'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            )}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Citas por Cobrar Hoy ({todayPendingCitas.length})
          </button>
          {consultasPendientes.length > 0 && (
            <button
              type="button"
              onClick={() => setTab('consultas')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border',
                tab === 'consultas'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
              )}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Consultas del Paciente ({consultasPendientes.length})
            </button>
          )}
        </div>

        {/* Buscador rápido */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tab === 'servicios' && filteredServicios.length > 0) {
                e.preventDefault();
                onAddServicio(filteredServicios[0]);
              }
            }}
            placeholder={
              tab === 'servicios'
                ? 'Escriba nombre, código o especialidad y presione [Enter] para agregar...'
                : 'Filtrar por paciente, cédula, médico o servicio...'
            }
            className="pl-9 h-9 text-xs"
            autoFocus
          />
        </div>

        {/* Chips de Categorías (solo en servicios) */}
        {tab === 'servicios' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border cursor-pointer transition-colors',
                  categoria === c
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {c === 'todos' ? 'Todas las categorías' : c}
              </button>
            ))}
          </div>
        )}

        {/* Tabla / Lista de Resultados */}
        <div className="flex-1 overflow-y-auto border border-border rounded-xl divide-y divide-border min-h-[260px]">
          {tab === 'servicios' &&
            (filteredServicios.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No se encontraron servicios con ese criterio.
              </div>
            ) : (
              filteredServicios.map((s) => {
                const divPrice = Number(s.precio_base) || 0;
                const bsPrice = divPrice * safeTasa;
                return (
                  <div
                    key={s.id}
                    onClick={() => onAddServicio(s)}
                    className="p-2.5 px-3 hover:bg-primary/5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {s.codigo || `SRV-${s.id}`}
                        </span>
                        {s.categoria && (
                          <Badge variant="outline" className="text-[9.5px] py-0 h-4">
                            {s.categoria}
                          </Badge>
                        )}
                      </div>
                      <div className="font-bold text-xs text-foreground mt-0.5 truncate">
                        {s.nombre}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-black font-mono text-xs sm:text-sm text-foreground block">
                          {formatBs(bsPrice)}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground block">
                          Ref: {refSym}
                          {divPrice.toFixed(2)}
                        </span>
                      </div>
                      <Button size="sm" className="h-7 px-2.5 text-xs font-bold gap-1 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                );
              })
            ))}

          {tab === 'citas' &&
            (filteredCitas.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay citas pendientes de cobro para hoy.
              </div>
            ) : (
              filteredCitas.map((cita) => {
                const divPrice = Number(cita.precio_estimado) || 30;
                const bsPrice = divPrice * safeTasa;
                return (
                  <div
                    key={cita.id}
                    onClick={() => {
                      onLoadCita(cita);
                      onOpenChange(false);
                    }}
                    className="p-3 hover:bg-primary/5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9.5px] font-mono">
                          {cita.hora_inicio}
                        </Badge>
                        <span className="font-extrabold text-xs text-foreground">
                          {cita.paciente_nombre}
                        </span>
                        {cita.paciente_documento && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            CI: {cita.paciente_documento}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {cita.servicio_nombre || cita.motivo} • Dr(a). {cita.medico_nombre}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-black font-mono text-xs text-foreground block">
                          {formatBs(bsPrice)}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground block">
                          Ref: {refSym}
                          {divPrice.toFixed(2)}
                        </span>
                      </div>
                      <Button size="sm" className="h-7 px-2.5 text-xs font-bold cursor-pointer">
                        Cargar Cita
                      </Button>
                    </div>
                  </div>
                );
              })
            ))}

          {tab === 'consultas' &&
            consultasPendientes.map((cons) => {
              const divPrice = cons.cita?.precio_estimado ? Number(cons.cita.precio_estimado) : 30;
              const bsPrice = divPrice * safeTasa;
              return (
                <div
                  key={cons.id}
                  onClick={() => {
                    onLinkConsulta(cons);
                    onOpenChange(false);
                  }}
                  className="p-3 hover:bg-primary/5 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-[10px] text-primary block">
                      {cons.codigo || `CON-#${cons.id}`}
                    </span>
                    <span className="font-bold text-xs text-foreground block truncate">
                      {cons.especialidad?.nombre || 'Consulta Médica'} — Dr(a).{' '}
                      {cons.medico ? `${cons.medico.nombres} ${cons.medico.apellidos}` : 'Médico'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black font-mono text-xs">{formatBs(bsPrice)}</span>
                    <Button size="sm" className="h-7 text-xs font-bold cursor-pointer">
                      Vincular
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 2. [F9] VERIFICADOR INSTANTÁNEO DE PRECIOS (FIXSALE STYLE)
// ============================================================================
interface PosPriceVerifierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicios: Servicio[];
  monedaReferencia: 'USD' | 'EUR';
  tasaActiva: number;
  onAddServicio: (serv: Servicio) => void;
}

export const PosPriceVerifierModal: React.FC<PosPriceVerifierModalProps> = ({
  open,
  onOpenChange,
  servicios,
  monedaReferencia,
  tasaActiva,
  onAddServicio,
}) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Servicio | null>(null);
  const refSym = monedaReferencia === 'EUR' ? '€' : '$';
  const safeTasa = tasaActiva > 0 ? tasaActiva : 1;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(servicios[0] || null);
    }
  }, [open, servicios]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return servicios.slice(0, 8);
    return servicios
      .filter(
        (s) =>
          s.nombre.toLowerCase().includes(q) ||
          (s.codigo && s.codigo.toLowerCase().includes(q)) ||
          (s.categoria && s.categoria.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [servicios, query]);

  useEffect(() => {
    if (matches.length > 0) setSelected(matches[0]);
    else setSelected(null);
  }, [matches]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-5 rounded-2xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <Eye className="w-5 h-5 text-primary" />
            [F9] Verificador Rápido de Tarifas y Precios
          </DialogTitle>
          <DialogDescription className="text-xs">
            Consulte al instante el valor exacto en Bolívares (Bs.) antes de facturar al paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selected) {
                  e.preventDefault();
                  onAddServicio(selected);
                  onOpenChange(false);
                }
              }}
              placeholder="Escriba código o nombre del estudio / consulta..."
              className="pl-9 h-10 text-xs font-medium"
              autoFocus
            />
          </div>

          {selected && (
            <div className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 space-y-2 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  {selected.codigo || `SRV-${selected.id}`}
                </span>
                {selected.categoria && (
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    {selected.categoria}
                  </Badge>
                )}
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white leading-snug">
                {selected.nombre}
              </h3>
              <div className="pt-2 border-t border-slate-800 flex items-end justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                    PRECIO OFICIAL EN BOLÍVARES
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    {formatBs((Number(selected.precio_base) || 0) * safeTasa)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Ref. Interna</span>
                  <span className="text-sm font-bold font-mono text-slate-200">
                    {refSym}
                    {(Number(selected.precio_base) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => {
                  onAddServicio(selected);
                  onOpenChange(false);
                }}
                className="w-full h-9 mt-1 text-xs font-extrabold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Agregar al Ticket Activo [Enter]
              </Button>
            </div>
          )}

          {/* Lista rápida de coincidencias */}
          <div className="max-h-[160px] overflow-y-auto divide-y divide-border border border-border rounded-xl">
            {matches.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelected(m)}
                className={cn(
                  'p-2 px-3 text-xs flex items-center justify-between cursor-pointer transition-colors',
                  selected?.id === m.id ? 'bg-primary/10 font-bold' : 'hover:bg-muted/50'
                )}
              >
                <span className="truncate pr-2">{m.nombre}</span>
                <span className="font-mono font-bold shrink-0">
                  {formatBs((Number(m.precio_base) || 0) * safeTasa)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 3. [INS] AGREGAR CONCEPTO CLÍNICO VARIO / LIBRE (FIXSALE STYLE)
// ============================================================================
interface PosCustomConceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monedaReferencia: 'USD' | 'EUR';
  tasaActiva: number;
  onAddCustomItem: (item: CobroDetalleItem) => void;
}

export const PosCustomConceptModal: React.FC<PosCustomConceptModalProps> = ({
  open,
  onOpenChange,
  monedaReferencia,
  tasaActiva,
  onAddCustomItem,
}) => {
  const [tipoConcepto, setTipoConcepto] = useState('servicio');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [dienteFdi, setDienteFdi] = useState('');
  const [monedaInput, setMonedaInput] = useState<'VES' | 'DIVISA'>('VES');
  const [precioInput, setPrecioInput] = useState('');

  const refSym = monedaReferencia === 'EUR' ? '€' : '$';
  const safeTasa = tasaActiva > 0 ? tasaActiva : 1;

  const precioNum = parseFloat(precioInput) || 0;
  const precioUnitDivisa =
    monedaInput === 'VES'
      ? Math.round((precioNum / safeTasa) * 10000) / 10000
      : precioNum;
  const precioUnitVes =
    monedaInput === 'VES' ? precioNum : Math.round(precioNum * safeTasa * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      toast.error('Ingrese la descripción del concepto clínico');
      return;
    }
    if (precioUnitDivisa <= 0) {
      toast.error('Ingrese un monto válido mayor a cero');
      return;
    }
    const qty = Math.max(1, parseInt(cantidad, 10) || 1);

    onAddCustomItem({
      servicio_id: null,
      tipo_concepto: tipoConcepto,
      descripcion: descripcion.trim(),
      cantidad: qty,
      precio_unitario_divisa: Math.round(precioUnitDivisa * 100) / 100,
      diente_fdi:
        tipoConcepto === 'odontologia' && dienteFdi ? parseInt(dienteFdi, 10) : null,
    });

    setDescripcion('');
    setPrecioInput('');
    setCantidad('1');
    setDienteFdi('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-5 rounded-2xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <Stethoscope className="w-5 h-5 text-primary" />
            [INS] Agregar Concepto Clínico / Insumo Libre
          </DialogTitle>
          <DialogDescription className="text-xs">
            Facture procedimientos especiales, curas, insumos médicos o estudios personalizados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Clasificación Clínica</Label>
              <Select value={tipoConcepto} onValueChange={setTipoConcepto}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="servicio">Procedimiento / Servicio</SelectItem>
                  <SelectItem value="consulta">Consulta Médica</SelectItem>
                  <SelectItem value="odontologia">Tratamiento Odontológico</SelectItem>
                  <SelectItem value="estudio">Estudio / Diagnóstico</SelectItem>
                  <SelectItem value="insumo">Insumo / Material Médico</SelectItem>
                  <SelectItem value="otro">Otro Concepto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="h-9 text-xs font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Descripción del Concepto *</Label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Sutura menor, Férula, Insumo quirúrgico..."
              className="h-9 text-xs"
              autoFocus
              required
            />
          </div>

          {tipoConcepto === 'odontologia' && (
            <div className="space-y-1">
              <Label className="text-xs font-bold">🦷 Pieza Dental FDI (Opcional)</Label>
              <Input
                type="number"
                min="11"
                max="85"
                value={dienteFdi}
                onChange={(e) => setDienteFdi(e.target.value)}
                placeholder="Ej. 16, 24, 36..."
                className="h-9 text-xs font-mono"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold">Precio Unitario *</Label>
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setMonedaInput('VES')}
                  className={cn(
                    'px-2 py-0.5 rounded font-bold cursor-pointer transition-colors',
                    monedaInput === 'VES' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  Ingresar en Bs.
                </button>
                <button
                  type="button"
                  onClick={() => setMonedaInput('DIVISA')}
                  className={cn(
                    'px-2 py-0.5 rounded font-bold cursor-pointer transition-colors',
                    monedaInput === 'DIVISA'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  Ingresar en {monedaReferencia}
                </button>
              </div>
            </div>

            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={precioInput}
              onChange={(e) => setPrecioInput(e.target.value)}
              placeholder="0.00"
              className="h-10 text-sm font-mono font-black"
              required
            />

            {precioNum > 0 && (
              <div className="text-[11px] font-mono text-muted-foreground flex justify-between px-1">
                <span>Monto en Ticket: {formatBs(precioUnitVes)}</span>
                <span>
                  Ref: {refSym}
                  {precioUnitDivisa.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button type="submit" className="text-xs font-extrabold gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              Añadir al Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 4. [F5] PONER COBRO EN ESPERA (HOLD TICKET - FIXSALE STYLE)
// ============================================================================
interface PosHoldTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketName: string;
  itemsCount: number;
  totalVes: number;
  onConfirmHold: (note: string) => void;
}

export const PosHoldTicketModal: React.FC<PosHoldTicketModalProps> = ({
  open,
  onOpenChange,
  ticketName,
  itemsCount,
  totalVes,
  onConfirmHold,
}) => {
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmHold(note.trim());
    setNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-5 rounded-2xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <Clock className="w-5 h-5 text-amber-500" />
            [F5] Poner Cobro en Espera
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pause temporalmente la cuenta actual para atender a otro paciente en recepción.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-800 text-xs flex items-center justify-between">
            <div>
              <span className="font-extrabold block text-foreground">{ticketName}</span>
              <span className="text-muted-foreground">{itemsCount} concepto(s) cargados</span>
            </div>
            <span className="font-black font-mono text-sm text-amber-700 dark:text-amber-300">
              {formatBs(totalVes)}
            </span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Nota o Referencia Rápida (Opcional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Esperando transferencia, fue al vehículo..."
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              Retener en Espera
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 5. [F4] HISTORIAL Y AUDITORÍA DE ÚLTIMOS COBROS (FIXSALE STYLE)
// ============================================================================
interface PosRecentSalesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cobros: Cobro[];
  loading: boolean;
  activeTurnoId?: number | null;
  onReprint: (cobro: Cobro) => void;
  onAnularCobro: (cobroId: number, motivo: string) => Promise<void>;
  onRefresh: () => void;
}

export const PosRecentSalesModal: React.FC<PosRecentSalesModalProps> = ({
  open,
  onOpenChange,
  cobros,
  loading,
  activeTurnoId,
  onReprint,
  onAnularCobro,
  onRefresh,
}) => {
  const [scope, setScope] = useState<'turno' | 'hoy' | 'todos'>('hoy');
  const [search, setSearch] = useState('');
  const [anularTarget, setAnularTarget] = useState<Cobro | null>(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [submittingAnular, setSubmittingAnular] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cobros.filter((c) => {
      if (scope === 'turno' && activeTurnoId && c.turno_caja_id !== activeTurnoId) {
        return false;
      }
      if (scope === 'hoy') {
        const emisionDate = (c.fecha_emision || '').slice(0, 10);
        if (emisionDate && emisionDate !== todayStr) return false;
      }
      if (!q) return true;
      return (
        c.numero_recibo.toLowerCase().includes(q) ||
        (c.paciente_nombre || '').toLowerCase().includes(q) ||
        (c.paciente_documento || '').toLowerCase().includes(q) ||
        (c.medico_nombre || '').toLowerCase().includes(q) ||
        c.detalles.some((d) => d.descripcion.toLowerCase().includes(q))
      );
    });
  }, [cobros, scope, activeTurnoId, search, todayStr]);

  const validCobros = useMemo(
    () => filtered.filter((c) => c.estado === 'completado'),
    [filtered]
  );

  const totalRecaudadoBs = useMemo(
    () => validCobros.reduce((acc, c) => acc + (Number(c.total_ves) || 0), 0),
    [validCobros]
  );

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anularTarget || !motivoAnular.trim()) {
      toast.error('Indique el motivo de la anulación');
      return;
    }
    try {
      setSubmittingAnular(true);
      await onAnularCobro(anularTarget.id, motivoAnular.trim());
      setAnularTarget(null);
      setMotivoAnular('');
    } finally {
      setSubmittingAnular(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[880px] max-h-[90vh] flex flex-col p-4 sm:p-5 rounded-2xl bg-card text-card-foreground">
        <DialogHeader className="pb-2 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <History className="w-5 h-5 text-primary" />
              [F4] Últimos Cobros y Reimpresión Térmica
            </DialogTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRefresh}
              className="h-7 text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
          <DialogDescription className="text-xs">
            Reimprima comprobantes en Bolívares (Bs.) o anule operaciones con reversión automática de cita.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros de alcance + KPI Resumen */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 shrink-0">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
            {activeTurnoId && (
              <button
                type="button"
                onClick={() => setScope('turno')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all',
                  scope === 'turno'
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Turno en Curso
              </button>
            )}
            <button
              type="button"
              onClick={() => setScope('hoy')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all',
                scope === 'hoy'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Cobros de Hoy
            </button>
            <button
              type="button"
              onClick={() => setScope('todos')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all',
                scope === 'todos'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Todos ({cobros.length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="font-mono py-1 px-2.5">
              Válidos: {validCobros.length}
            </Badge>
            <Badge className="bg-emerald-600 text-white font-mono py-1 px-2.5">
              Total: {formatBs(totalRecaudadoBs)}
            </Badge>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por Nro. Recibo, paciente, cédula, médico o concepto..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Modal interno de anulación */}
        {anularTarget && (
          <form
            onSubmit={handleConfirmVoid}
            className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 space-y-2 shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Ban className="w-4 h-4" />
                Anular Comprobante {anularTarget.numero_recibo} ({anularTarget.paciente_nombre})
              </span>
              <button
                type="button"
                onClick={() => setAnularTarget(null)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancelar
              </button>
            </div>
            <div className="flex gap-2">
              <Textarea
                rows={1}
                value={motivoAnular}
                onChange={(e) => setMotivoAnular(e.target.value)}
                placeholder="Motivo obligatorio de anulación..."
                className="text-xs min-h-[36px] bg-background"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={submittingAnular}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer h-9"
              >
                {submittingAnular ? 'Anulando...' : 'Confirmar Anulación'}
              </Button>
            </div>
          </form>
        )}

        {/* Lista detallada estilo FixSale */}
        <div className="flex-1 overflow-y-auto border border-border rounded-xl divide-y divide-border min-h-[260px]">
          {loading ? (
            <div className="p-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Activity className="w-4 h-4 animate-spin text-primary" />
              Cargando comprobantes...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No se encontraron cobros para el filtro seleccionado.
            </div>
          ) : (
            filtered.map((rc) => (
              <div
                key={rc.id}
                className={cn(
                  'p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30 transition-colors',
                  rc.estado === 'anulado' && 'opacity-65 bg-rose-50/20 dark:bg-rose-950/10'
                )}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-foreground">{rc.numero_recibo}</span>
                    <Badge
                      className={cn(
                        'text-[9.5px] py-0 h-4 gap-1',
                        rc.estado === 'completado'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                      )}
                    >
                      {rc.estado === 'completado' ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" /> Pagado
                        </>
                      ) : (
                        <>
                          <XCircle className="w-2.5 h-2.5" /> Anulado
                        </>
                      )}
                    </Badge>
                    <span className="text-[10.5px] font-mono text-muted-foreground">
                      {new Date(rc.fecha_emision).toLocaleString('es-VE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="font-bold text-foreground truncate">
                    {rc.paciente_nombre || 'Particular'}
                    {rc.paciente_documento ? ` (${rc.paciente_documento})` : ''}
                    {rc.medico_nombre ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        • Dr(a). {rc.medico_nombre}
                      </span>
                    ) : null}
                  </div>

                  {/* Chips de Conceptos Vendidos (FixSale Detail Column) */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {rc.detalles.map((d, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium truncate max-w-[240px]"
                      >
                        {d.cantidad}x {d.descripcion}
                        {d.diente_fdi ? ` [FDI ${d.diente_fdi}]` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <span className="font-black font-mono text-sm text-foreground block">
                      {formatBs(Number(rc.total_ves) || 0)}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Ref: {rc.moneda_referencia === 'EUR' ? '€' : '$'}
                      {Number(rc.total_divisa).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onReprint(rc)}
                      className="h-8 px-2.5 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Ticket Bs.
                    </Button>

                    {rc.estado === 'completado' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setAnularTarget(rc)}
                        className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        title="Anular comprobante"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 6. CONFIGURACIÓN DE IMPRESORA TÉRMICA / TICKETERA POS (80MM / 58MM)
// ============================================================================
interface PosPrinterConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PosPrinterConfig;
  onSaveConfig: (next: PosPrinterConfig) => void;
}

export const PosPrinterConfigModal: React.FC<PosPrinterConfigModalProps> = ({
  open,
  onOpenChange,
  config,
  onSaveConfig,
}) => {
  const [draft, setDraft] = useState<PosPrinterConfig>(config);

  useEffect(() => {
    if (open) setDraft(config);
  }, [open, config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePosPrinterConfig(draft);
    onSaveConfig(draft);
    toast.success('Configuración de ticketera térmica guardada');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-5 rounded-2xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <Printer className="w-5 h-5 text-primary" />
            Configuración de Ticketera Térmica POS
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ajuste el ancho del papel térmico y mensajes del comprobante.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* Aviso de Cumplimiento Legal */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>
              <strong>Modo Legal Bolívares (Bs.) Activo:</strong> Todos los tickets impresos omiten referencias en divisas y expresan cada precio, subtotal y vuelto estrictamente en Bolívares.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Ancho de Papel Térmico</Label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, paperSize: '80mm' }))}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer',
                  draft.paperSize === '80mm'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span>80 mm</span>
                  <span className="text-[10px] text-primary">Estándar</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Impresora térmica de recepción / escritorio.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, paperSize: '58mm' }))}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer',
                  draft.paperSize === '58mm'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span>58 mm</span>
                  <span className="text-[10px] text-emerald-600">Compacta</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ticketera portátil USB o Bluetooth.
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border gap-3">
            <div>
              <Label className="text-xs font-bold">Impresión Automática al Cobrar [F11]</Label>
              <p className="text-[10.5px] text-muted-foreground">
                Abre automáticamente la ventana de impresión al confirmar con Ticket.
              </p>
            </div>
            <Switch
              checked={draft.autoPrintOnSale}
              onCheckedChange={(checked) => setDraft((d) => ({ ...d, autoPrintOnSale: checked }))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Línea de Encabezado Adicional (Opcional)</Label>
            <Input
              value={draft.headerMsg}
              onChange={(e) => setDraft((d) => ({ ...d, headerMsg: e.target.value }))}
              placeholder="Ej. Horario Lun a Vie 7:30am - 5:00pm"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Mensaje de Pie de Ticket</Label>
            <Input
              value={draft.footerMsg}
              onChange={(e) => setDraft((d) => ({ ...d, footerMsg: e.target.value }))}
              placeholder="¡GRACIAS POR CONFIAR EN NUESTRA ATENCIÓN DE SALUD!"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button type="submit" className="text-xs font-extrabold cursor-pointer">
              Guardar Preferencias
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 7. TASA OFICIAL BCV Y CONVERSOR RÁPIDO BIDIRECCIONAL DE CAJA
// ============================================================================
interface PosExchangeRateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monedaReferencia: 'USD' | 'EUR';
  tasaActiva: number;
  sincronizadoAt?: string;
  onSyncRates: () => Promise<void>;
  syncingRates: boolean;
}

export const PosExchangeRateModal: React.FC<PosExchangeRateModalProps> = ({
  open,
  onOpenChange,
  monedaReferencia,
  tasaActiva,
  sincronizadoAt,
  onSyncRates,
  syncingRates,
}) => {
  const [divisaInput, setDivisaInput] = useState('10');
  const [vesInput, setVesInput] = useState('');
  const safeTasa = tasaActiva > 0 ? tasaActiva : 1;
  const refSym = monedaReferencia === 'EUR' ? '€' : '$';

  useEffect(() => {
    if (open) {
      setDivisaInput('10');
      setVesInput((10 * safeTasa).toFixed(2));
    }
  }, [open, safeTasa]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-5 rounded-2xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Tasa Oficial BCV & Calculadora de Caja
          </DialogTitle>
          <DialogDescription className="text-xs">
            Consulte equivalencias rápidas en taquilla o sincronice la tasa oficial vigente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Tasa Activa ({monedaReferencia})
              </span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatBs(safeTasa)}
              </span>
              {sincronizadoAt && (
                <span className="text-[9.5px] text-slate-400 block mt-0.5">
                  Sincronizado: {new Date(sincronizadoAt).toLocaleString('es-VE')}
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onSyncRates}
              disabled={syncingRates}
              className="gap-1.5 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', syncingRates && 'animate-spin')} />
              {syncingRates ? 'Sincronizando...' : 'Sincronizar BCV'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold">
                Monto en {monedaReferencia} ({refSym})
              </Label>
              <Input
                type="number"
                step="0.01"
                value={divisaInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setDivisaInput(v);
                  const n = parseFloat(v);
                  setVesInput(Number.isFinite(n) ? (n * safeTasa).toFixed(2) : '');
                }}
                className="h-9 font-mono font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Equivalente en Bolívares (Bs.)</Label>
              <Input
                type="number"
                step="0.01"
                value={vesInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setVesInput(v);
                  const n = parseFloat(v);
                  setDivisaInput(Number.isFinite(n) ? (n / safeTasa).toFixed(2) : '');
                }}
                className="h-9 font-mono font-bold text-sm"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
