import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  User,
  DollarSign,
  Printer,
  Ban,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

import { ModuleHeader } from '../../components/common/ModuleHeader';
import { FilterBar, FilterField } from '../../components/common/FilterBar';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { cajasApi, type Cobro } from '../../api/cajas';
import { CobroReciboModal } from '../../components/facturacion/CobroReciboModal';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const RecibosHistorialPage: React.FC = () => {
  const { user, sucursalActiva } = useAuth();
  const currentSucursalId = sucursalActiva?.id || 1;

  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');

  // Modal Ver/Imprimir Recibo
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [reciboModalOpen, setReciboModalOpen] = useState(false);

  // Modal Anulación
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [cobroToAnular, setCobroToAnular] = useState<Cobro | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  const fetchCobros = async () => {
    try {
      setLoading(true);
      const res = await cajasApi.listCobros({
        sucursal_id: currentSucursalId,
        fecha_desde: fechaFiltro || undefined,
        limit: 100,
      });
      setCobros(res);
    } catch (err: any) {
      toast.error('Error al cargar historial de cobros y recibos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCobros();
  }, [currentSucursalId, fechaFiltro]);

  const handleOpenRecibo = (c: Cobro) => {
    setSelectedCobro(c);
    setReciboModalOpen(true);
  };

  const handleConfirmAnulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobroToAnular) return;
    if (!motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo para anular el cobro');
      return;
    }

    try {
      setAnulando(true);
      await cajasApi.anularCobro(cobroToAnular.id, motivoAnulacion);
      toast.success(`Recibo ${cobroToAnular.numero_recibo} anulado correctamente`);
      setAnularModalOpen(false);
      setCobroToAnular(null);
      setMotivoAnulacion('');
      await fetchCobros();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al anular el recibo');
    } finally {
      setAnulando(false);
    }
  };

  // Filtrado en memoria
  const filteredCobros = useMemo(() => {
    return cobros.filter((c) => {
      const matchSearch =
        c.numero_recibo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.paciente_nombre && c.paciente_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.paciente_documento && c.paciente_documento.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.cajero_nombre && c.cajero_nombre.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [cobros, searchTerm]);

  const columns: ColumnDef<Cobro>[] = [
    {
      header: 'Nro. Recibo',
      accessorKey: 'numero_recibo',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-400" />
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
            {item.numero_recibo}
          </span>
        </div>
      ),
    },
    {
      header: 'Fecha & Hora',
      accessorKey: 'fecha_emision',
      cell: (item) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {new Date(item.fecha_emision).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      ),
    },
    {
      header: 'Paciente',
      accessorKey: 'paciente_nombre',
      cell: (item) => (
        <div>
          <span className="font-semibold text-xs block text-slate-800 dark:text-slate-200">
            {item.paciente_nombre || 'Particular'}
          </span>
          {item.paciente_documento && (
            <span className="text-[10px] text-slate-400 block font-mono">CI: {item.paciente_documento}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Total Facturado',
      accessorKey: 'total_divisa',
      cell: (item) => (
        <div>
          <span className="font-bold text-xs block text-slate-900 dark:text-white font-mono">
            {item.moneda_referencia === 'EUR' ? '€' : '$'}{' '}
            {Number(item.total_divisa).toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Bs. {Number(item.total_ves).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ),
    },
    {
      header: 'Tasa BCV',
      accessorKey: 'tasa_bcv_aplicada',
      cell: (item) => (
        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
          Bs. {Number(item.tasa_bcv_aplicada).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: (item) => (
        <Badge
          className={cn(
            'text-[10px] font-semibold gap-1',
            item.estado === 'completado'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          )}
        >
          {item.estado === 'completado' ? (
            <><CheckCircle2 className="w-3 h-3" /> Pagado</>
          ) : (
            <><XCircle className="w-3 h-3" /> Anulado</>
          )}
        </Badge>
      ),
    },
    {
      header: 'Cajero',
      accessorKey: 'cajero_nombre',
      cell: (item) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {item.cajero_nombre || 'Sistema'}
        </span>
      ),
    },
    {
      header: 'Acciones',
      accessorKey: 'id',
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenRecibo(item)}
            className="h-7 text-xs gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Recibo
          </Button>
          {item.estado === 'completado' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCobroToAnular(item);
                setAnularModalOpen(true);
              }}
              className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <ModuleHeader
        title="Historial de Cobros & Recibos"
        description="Auditoría y registro inmutable de todos los comprobantes emitidos por consulta, citas y tratamientos."
        icon={<Receipt className="h-6 w-6 text-white" />}
      />

      <FilterBar>
        <FilterField label="Buscar Recibo / Paciente">
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por Nro. de recibo, paciente o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </FilterField>

        <FilterField label="Fecha de Emisión">
          <Input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="h-9 text-xs min-w-[160px]"
          />
        </FilterField>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredCobros}
        isLoading={loading}
      />

      {/* Modal de Impresión y Envío de Recibo */}
      {selectedCobro && (
        <CobroReciboModal
          open={reciboModalOpen}
          onOpenChange={setReciboModalOpen}
          cobro={selectedCobro}
        />
      )}

      {/* Modal de Confirmación de Anulación */}
      <Dialog open={anularModalOpen} onOpenChange={setAnularModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              <DialogTitle>Anular Recibo de Cobro</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              ¿Estás seguro de anular el recibo <strong>{cobroToAnular?.numero_recibo}</strong>?
              Si está vinculado a una cita médica, su estado de pago volverá a quedar pendiente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmAnulacion} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo de Anulación *</Label>
              <Textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Ej: Error en medio de pago, paciente reprogramó la cita..."
                className="text-xs resize-none"
                rows={3}
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAnularModalOpen(false)}
                disabled={anulando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={anulando}
                className="bg-rose-600 hover:bg-rose-700 text-white gap-2 cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                {anulando ? 'Anulando...' : 'Confirmar Anulación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecibosHistorialPage;
