import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Plus,
  Coins,
  ArrowRightLeft,
  Calendar,
  ShieldCheck,
  Search,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

import { ModuleHeader } from '../../components/common/ModuleHeader';
import { FilterBar, FilterField } from '../../components/common/FilterBar';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { tasasApi, type TasasActualesResponse, type TasaHistoricoItem } from '../../api/tasas';
import { cn } from '../../lib/utils';

export const TasasCambioPage: React.FC = () => {
  const [ratesData, setRatesData] = useState<TasasActualesResponse | null>(null);
  const [history, setHistory] = useState<TasaHistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filtros de Historial
  const [currencyFilter, setCurrencyFilter] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Ajuste Manual
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualCurrency, setManualCurrency] = useState('USD');
  const [manualRate, setManualRate] = useState<string>('');
  const [savingManual, setSavingManual] = useState(false);

  // Calculadora en Vivo
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcCurrency, setCalcCurrency] = useState<'USD' | 'EUR' | 'USDT' | 'VES'>('USD');

  const fetchRatesAndHistory = async () => {
    try {
      setLoading(true);
      const [currentRes, historyRes] = await Promise.all([
        tasasApi.getCurrentRates(),
        tasasApi.getHistory(currencyFilter, 100)
      ]);
      setRatesData(currentRes);
      setHistory(historyRes);
    } catch (err: any) {
      toast.error('Error al cargar la información de tasas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatesAndHistory();
  }, [currencyFilter]);

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      const res = await tasasApi.syncRates();
      toast.success(res.message || 'Tasas actualizadas exitosamente');
      await fetchRatesAndHistory();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al sincronizar con BCV y Binance');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateVal = parseFloat(manualRate);
    if (!rateVal || rateVal <= 0) {
      toast.error('Ingrese un valor de tasa válido mayor a 0');
      return;
    }

    try {
      setSavingManual(true);
      await tasasApi.setManualRate({
        moneda: manualCurrency,
        tasa: rateVal
      });
      toast.success(`Tasa de ${manualCurrency} registrada correctamente`);
      setManualModalOpen(false);
      setManualRate('');
      await fetchRatesAndHistory();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al registrar tasa manual');
    } finally {
      setSavingManual(false);
    }
  };

  // Conversiones en vivo
  const calculatedValues = useMemo(() => {
    const usdRate = ratesData?.tasas?.USD?.tasa || 1;
    const eurRate = ratesData?.tasas?.EUR?.tasa || 1;
    const usdtRate = ratesData?.tasas?.USDT?.tasa || 1;

    let baseInVES = 0;
    if (calcCurrency === 'VES') baseInVES = calcAmount;
    else if (calcCurrency === 'USD') baseInVES = calcAmount * usdRate;
    else if (calcCurrency === 'EUR') baseInVES = calcAmount * eurRate;
    else if (calcCurrency === 'USDT') baseInVES = calcAmount * usdtRate;

    return {
      VES: baseInVES,
      USD: baseInVES / usdRate,
      EUR: baseInVES / eurRate,
      USDT: baseInVES / usdtRate,
    };
  }, [calcAmount, calcCurrency, ratesData]);

  // Filtrado de Historial
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchSearch =
        item.fuente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.moneda.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.usuario && item.usuario.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [history, searchTerm]);

  const historyColumns: ColumnDef<TasaHistoricoItem>[] = [
    {
      header: 'Fecha & Hora',
      accessorKey: 'fecha_tasa',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-xs text-slate-700 dark:text-slate-200">
            {item.fecha_tasa ? new Date(item.fecha_tasa).toLocaleString('es-ES') : 'Reciente'}
          </span>
        </div>
      ),
    },
    {
      header: 'Divisa',
      accessorKey: 'moneda',
      cell: (item) => {
        let badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        if (item.moneda === 'EUR') badgeColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        if (item.moneda === 'USDT') badgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        return (
          <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border', badgeColor)}>
            {item.moneda} / VES
          </span>
        );
      },
    },
    {
      header: 'Valor de la Tasa',
      accessorKey: 'tasa',
      cell: (item) => (
        <div className="font-bold text-sm text-slate-900 dark:text-white">
          Bs. {item.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </div>
      ),
    },
    {
      header: 'Variación 24h',
      accessorKey: 'variacion_24h',
      cell: (item) => {
        const varVal = item.variacion_24h || 0;
        const isPositive = varVal > 0;
        const isZero = varVal === 0;
        return (
          <div className="flex items-center gap-1 text-xs font-semibold">
            {isZero ? (
              <span className="text-slate-400">0.00%</span>
            ) : isPositive ? (
              <span className="flex items-center text-rose-500">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                +{varVal}%
              </span>
            ) : (
              <span className="flex items-center text-emerald-500">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                {varVal}%
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Fuente & Tipo',
      accessorKey: 'fuente',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Badge variant={item.es_oficial ? 'default' : 'secondary'} className="text-[10px]">
            {item.es_oficial ? 'Oficial' : 'Mercado'}
          </Badge>
          <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
            {item.fuente}
          </span>
        </div>
      ),
    },
    {
      header: 'Registrado Por',
      accessorKey: 'usuario',
      cell: (item) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {item.usuario || 'Sistema'}
        </span>
      ),
    },
  ];

  const handleExportCSV = () => {
    if (!history.length) {
      toast.info('No hay registros en el histórico para exportar');
      return;
    }
    const headers = ['ID', 'Fecha', 'Moneda', 'Tasa (VES)', 'Variacion %', 'Fuente', 'Es Oficial', 'Usuario'];
    const rows = history.map((h) => [
      h.id,
      h.fecha_tasa ? new Date(h.fecha_tasa).toLocaleString('es-ES') : '',
      h.moneda,
      h.tasa,
      h.variacion_24h || 0,
      `"${h.fuente}"`,
      h.es_oficial ? 'SI' : 'NO',
      `"${h.usuario || 'Sistema'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_tasas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Histórico exportado a CSV exitosamente');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <ModuleHeader
        title="Tasas & Divisas del Día"
        description="Sincronización automática de divisas oficiales del BCV (Dólar, Euro) y liquidez Binance P2P (USDT) con registro histórico permanente."
        icon={<Coins className="h-6 w-6 text-white" />}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setManualModalOpen(true)}
            className="cursor-pointer gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            Ajuste Manual
          </Button>
          <Button
            onClick={handleSyncAll}
            disabled={syncing}
            className="cursor-pointer gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
          >
            <RotateCcw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando...' : 'Sincronizar en Vivo'}
          </Button>
        </div>
      </ModuleHeader>

      {/* 3 Main Currency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Dólar BCV */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 relative overflow-hidden shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  Dólar Oficial BCV
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">USD / VES Oficial</p>
              </div>
            </div>
            <Badge className="bg-emerald-500 text-white text-[10px]">BCV Oficial</Badge>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Bs. {ratesData?.tasas?.USD?.tasa ? ratesData.tasas.USD.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : 'Consultando...'}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/10 text-xs">
              <span className="text-slate-500 truncate max-w-[180px]">
                {ratesData?.tasas?.USD?.fuente || 'DolarAPI Oficial'}
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {ratesData?.tasas?.USD?.variacion_24h ? `${ratesData.tasas.USD.variacion_24h > 0 ? '+' : ''}${ratesData.tasas.USD.variacion_24h}%` : '0.00%'}
              </span>
            </div>
          </div>
        </div>

        {/* Euro BCV */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 relative overflow-hidden shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                €
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  Euro Oficial BCV
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">EUR / VES Oficial</p>
              </div>
            </div>
            <Badge className="bg-blue-600 text-white text-[10px]">BCV Euro</Badge>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Bs. {ratesData?.tasas?.EUR?.tasa ? ratesData.tasas.EUR.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : 'Consultando...'}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-500/10 text-xs">
              <span className="text-slate-500 truncate max-w-[180px]">
                {ratesData?.tasas?.EUR?.fuente || 'BCV Euro Oficial'}
              </span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {ratesData?.tasas?.EUR?.variacion_24h ? `${ratesData.tasas.EUR.variacion_24h > 0 ? '+' : ''}${ratesData.tasas.EUR.variacion_24h}%` : '0.00%'}
              </span>
            </div>
          </div>
        </div>

        {/* Binance USDT */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 relative overflow-hidden shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  Tasa USDT Binance
                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">P2P</Badge>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">USDT / VES Mercado</p>
              </div>
            </div>
            <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">Binance Live</Badge>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Bs. {ratesData?.tasas?.USDT?.tasa ? ratesData.tasas.USDT.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : 'Consultando...'}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/10 text-xs">
              <span className="text-slate-500 truncate max-w-[180px]">
                {ratesData?.tasas?.USDT?.fuente || 'Binance P2P'}
              </span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {ratesData?.tasas?.USDT?.variacion_24h ? `${ratesData.tasas.USDT.variacion_24h > 0 ? '+' : ''}${ratesData.tasas.USDT.variacion_24h}%` : '0.00%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversor / Calculadora Multimoneda */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Conversor Multimoneda en Vivo para Cobros & Facturación
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Última sync: {ratesData?.sincronizado_at ? new Date(ratesData.sincronizado_at).toLocaleTimeString('es-ES') : 'Reciente'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* Monto Entrada */}
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs text-slate-500">Monto a Convertir</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                className="text-lg font-bold"
                placeholder="100.00"
              />
              <Select
                value={calcCurrency}
                onValueChange={(val: any) => setCalcCurrency(val)}
              >
                <SelectTrigger className="w-[120px] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USDT">USDT (₮)</SelectItem>
                  <SelectItem value="VES">VES (Bs.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resultados de Conversión */}
          <div className="md:col-span-3 grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <span className="text-[11px] font-medium text-slate-500">En Bolívares (VES)</span>
              <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                Bs. {calculatedValues.VES.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <span className="text-[11px] font-medium text-slate-500">En Dólares (USD)</span>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                $ {calculatedValues.USD.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <span className="text-[11px] font-medium text-slate-500">En Binance (USDT)</span>
              <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-1">
                ₮ {calculatedValues.USDT.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Tasas */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-500" />
              Histórico & Auditoría de Tasas de Cambio
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro inmutable de todas las tasas oficiales consultadas y ajustes aplicados en el sistema.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 cursor-pointer border-slate-300 dark:border-slate-700"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* FilterBar */}
        <FilterBar>
          <FilterField label="Buscar">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por fuente o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </FilterField>

          <FilterField label="Filtrar Divisa">
            <Select value={currencyFilter} onValueChange={(val) => setCurrencyFilter(val)}>
              <SelectTrigger className="h-9 text-xs min-w-[180px]">
                <SelectValue placeholder="Todas las Divisas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas las Divisas</SelectItem>
                <SelectItem value="USD">Dólar BCV (USD)</SelectItem>
                <SelectItem value="EUR">Euro BCV (EUR)</SelectItem>
                <SelectItem value="USDT">Binance (USDT)</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>

        {/* DataTable */}
        <DataTable
          columns={historyColumns}
          data={filteredHistory}
          isLoading={loading}
          emptyMessage="No se encontraron registros de tasas de cambio en el histórico"
        />
      </div>

      {/* Modal Ajuste Manual */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSaveManual}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Coins className="w-5 h-5 text-teal-600" />
                Ajuste Manual de Tasa de Cambio
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Ingrese el valor de tasa que se aplicará para la clínica. Quedará registrado en la bitácora con su usuario.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Moneda a Ajustar</Label>
                <Select value={manualCurrency} onValueChange={setManualCurrency}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">Dólar Oficial (USD / VES)</SelectItem>
                    <SelectItem value="EUR">Euro Oficial (EUR / VES)</SelectItem>
                    <SelectItem value="USDT">Binance Tether (USDT / VES)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Nuevo Valor en Bolívares (VES)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="Ej: 798.50"
                  value={manualRate}
                  onChange={(e) => setManualRate(e.target.value)}
                  className="font-bold text-sm"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setManualModalOpen(false)}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingManual}
                className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
              >
                {savingManual ? 'Guardando...' : 'Guardar Tasa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default TasasCambioPage;
