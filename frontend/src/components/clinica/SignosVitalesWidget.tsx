import React, { useMemo } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  HeartPulse,
  Activity,
  Thermometer,
  Droplets,
  Scale,
  Ruler,
  Info,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export interface SignosVitalesData {
  peso?: string | number;
  talla?: string | number;
  temperatura?: string | number;
  presion_sistolica?: string | number;
  presion_diastolica?: string | number;
  frecuencia_cardiaca?: string | number;
  frecuencia_respiratoria?: string | number;
  saturacion_oxigeno?: string | number;
  glucosa_capilar?: string | number;
  observaciones_triaje?: string;
  [key: string]: any;
}

interface SignosVitalesWidgetProps {
  signos: SignosVitalesData;
  signosAnteriores?: SignosVitalesData | null;
  onChange?: (key: string, value: any) => void;
  readOnly?: boolean;
}

export const SignosVitalesWidget: React.FC<SignosVitalesWidgetProps> = ({
  signos,
  signosAnteriores,
  onChange,
  readOnly = false,
}) => {
  // Cálculo y categorización de IMC
  const imcInfo = useMemo(() => {
    const peso = parseFloat(String(signos.peso || ''));
    const talla = parseFloat(String(signos.talla || ''));

    if (!peso || !talla || talla <= 0) return null;

    // Normalizar talla a metros si viene en cm
    const tallaMetros = talla > 3 ? talla / 100 : talla;
    const imc = peso / (tallaMetros * tallaMetros);
    const imcRedondeado = Math.round(imc * 10) / 10;

    let categoria = 'Normal';
    let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
    let colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300';

    if (imcRedondeado < 18.5) {
      categoria = 'Bajo peso';
      colorClass = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300';
    } else if (imcRedondeado < 25) {
      categoria = 'Peso saludable';
      colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300';
    } else if (imcRedondeado < 30) {
      categoria = 'Sobrepeso';
      colorClass = 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300';
    } else if (imcRedondeado < 35) {
      categoria = 'Obesidad Grado I';
      colorClass = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300';
    } else {
      categoria = 'Obesidad Severa';
      colorClass = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300';
    }

    return { valor: imcRedondeado, categoria, colorClass, variant };
  }, [signos.peso, signos.talla]);

  // Superficie corporal (Mosteller)
  const bsa = useMemo(() => {
    const peso = parseFloat(String(signos.peso || ''));
    const talla = parseFloat(String(signos.talla || ''));
    if (!peso || !talla || talla <= 0) return null;
    const cm = talla > 3 ? talla : talla * 100;
    return Math.round(Math.sqrt((peso * cm) / 3600) * 100) / 100;
  }, [signos.peso, signos.talla]);

  // Presión Arterial Media (PAM) y Presión de Pulso
  const pamInfo = useMemo(() => {
    const pas = parseFloat(String(signos.presion_sistolica || ''));
    const pad = parseFloat(String(signos.presion_diastolica || ''));
    if (!pas || !pad || pas <= pad) return null;
    const pam = Math.round(((2 * pad + pas) / 3) * 10) / 10;
    const pp = pas - pad;
    return { pam, pp };
  }, [signos.presion_sistolica, signos.presion_diastolica]);

  const handleChange = (key: string, val: string) => {
    if (readOnly || !onChange) return;
    onChange(key, val);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Consulta de Control / Comparativa */}
      {signosAnteriores && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 text-xs text-teal-800 dark:text-teal-300 animate-in fade-in-50">
          <Activity className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <span>
            <strong>Modo Comparativo de Control:</strong> Mostrando comparativa evolutiva con los signos vitales registrados en la consulta previa.
          </span>
        </div>
      )}

      {/* Grid de Parámetros Antropométricos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peso */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Scale className="size-4 text-teal-600 dark:text-teal-400" />
              Peso (kg)
            </Label>
          </div>
          <Input
            type="number"
            step="0.1"
            placeholder="Ej. 70.5"
            value={signos.peso ?? ''}
            onChange={(e) => handleChange('peso', e.target.value)}
            disabled={readOnly}
            className="font-medium text-base h-10"
          />
          {signosAnteriores?.peso && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Anterior: <strong className="text-slate-700 dark:text-slate-300">{signosAnteriores.peso} kg</strong></span>
              {Number(signos.peso) > 0 && Number(signosAnteriores.peso) > 0 && (
                <span className={cn(
                  "font-semibold px-1.5 py-0.5 rounded text-[10px]",
                  Number(signos.peso) > Number(signosAnteriores.peso)
                    ? "text-amber-700 bg-amber-100/80 dark:bg-amber-950/60 dark:text-amber-300"
                    : Number(signos.peso) < Number(signosAnteriores.peso)
                    ? "text-emerald-700 bg-emerald-100/80 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "text-slate-500 bg-slate-100 dark:bg-slate-800"
                )}>
                  {(Number(signos.peso) - Number(signosAnteriores.peso)) > 0
                    ? `+${(Number(signos.peso) - Number(signosAnteriores.peso)).toFixed(1)}`
                    : (Number(signos.peso) - Number(signosAnteriores.peso)).toFixed(1)} kg
                </span>
              )}
            </div>
          )}
        </div>

        {/* Talla */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Ruler className="size-4 text-teal-600 dark:text-teal-400" />
              Talla / Estatura (cm)
            </Label>
          </div>
          <Input
            type="number"
            step="1"
            placeholder="Ej. 172"
            value={signos.talla ?? ''}
            onChange={(e) => handleChange('talla', e.target.value)}
            disabled={readOnly}
            className="font-medium text-base h-10"
          />
          {signosAnteriores?.talla && (
            <div className="text-[11px] text-slate-500 pt-0.5">
              <span>Anterior: <strong className="text-slate-700 dark:text-slate-300">{signosAnteriores.talla} cm</strong></span>
            </div>
          )}
        </div>

        {/* IMC Calculado */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Info className="size-4 text-indigo-500" />
              IMC (Índice de Masa Corporal)
            </Label>
          </div>
          <div className="flex items-center gap-3 h-10">
            {imcInfo ? (
              <>
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {imcInfo.valor}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${imcInfo.colorClass}`}>
                  {imcInfo.categoria}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Requiere peso y talla
              </span>
            )}
          </div>
          {bsa && (
            <div className="text-[11px] text-slate-500 pt-0.5">
              <span>Sup. Corporal: <strong className="text-slate-700 dark:text-slate-300">{bsa} m²</strong></span>
            </div>
          )}
        </div>

        {/* Temperatura */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Thermometer className="size-4 text-amber-500" />
              Temperatura (°C)
            </Label>
          </div>
          <Input
            type="number"
            step="0.1"
            placeholder="Ej. 36.6"
            value={signos.temperatura ?? ''}
            onChange={(e) => handleChange('temperatura', e.target.value)}
            disabled={readOnly}
            className="font-medium text-base h-10"
          />
          {signosAnteriores?.temperatura && (
            <div className="text-[11px] text-slate-500 pt-0.5">
              <span>Anterior: <strong className="text-slate-700 dark:text-slate-300">{signosAnteriores.temperatura} °C</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Signos Hemodinámicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Presión Arterial */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Activity className="size-4 text-rose-500" />
            Presión Arterial (mmHg)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Sistólica (120)"
              value={signos.presion_sistolica ?? ''}
              onChange={(e) => handleChange('presion_sistolica', e.target.value)}
              disabled={readOnly}
              className="h-10 text-center font-medium"
            />
            <span className="text-slate-400 font-bold">/</span>
            <Input
              type="number"
              placeholder="Diastólica (80)"
              value={signos.presion_diastolica ?? ''}
              onChange={(e) => handleChange('presion_diastolica', e.target.value)}
              disabled={readOnly}
              className="h-10 text-center font-medium"
            />
          </div>
          {pamInfo && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>PAM: <strong className="text-slate-700 dark:text-slate-300">{pamInfo.pam} mmHg</strong></span>
              <span className="text-[10px] text-slate-400">PP: {pamInfo.pp}</span>
            </div>
          )}
          {(signosAnteriores?.presion_sistolica || signosAnteriores?.presion_diastolica) && (
            <div className="text-[11px] text-slate-500 pt-0.5">
              <span>Anterior: <strong className="text-slate-700 dark:text-slate-300">{signosAnteriores.presion_sistolica || '-'}/{signosAnteriores.presion_diastolica || '-'} mmHg</strong></span>
            </div>
          )}
        </div>

        {/* Frecuencia Cardíaca */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <HeartPulse className="size-4 text-red-500" />
            Frecuencia Cardíaca (LPM)
          </Label>
          <Input
            type="number"
            placeholder="Ej. 75"
            value={signos.frecuencia_cardiaca ?? ''}
            onChange={(e) => handleChange('frecuencia_cardiaca', e.target.value)}
            disabled={readOnly}
            className="h-10 font-medium"
          />
          {signosAnteriores?.frecuencia_cardiaca && (
            <div className="text-[11px] text-slate-500 pt-0.5">
              <span>Anterior: <strong className="text-slate-700 dark:text-slate-300">{signosAnteriores.frecuencia_cardiaca} LPM</strong></span>
            </div>
          )}
        </div>

        {/* Frecuencia Respiratoria */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Activity className="size-4 text-sky-500" />
            Frecuencia Respiratoria (RPM)
          </Label>
          <Input
            type="number"
            placeholder="Ej. 18"
            value={signos.frecuencia_respiratoria ?? ''}
            onChange={(e) => handleChange('frecuencia_respiratoria', e.target.value)}
            disabled={readOnly}
            className="h-10 font-medium"
          />
          {signosAnteriores?.frecuencia_respiratoria && (
            <div className="text-[11px] text-slate-500 pt-0.5">
              <span>Anterior: <strong className="text-slate-700 dark:text-slate-300">{signosAnteriores.frecuencia_respiratoria} RPM</strong></span>
            </div>
          )}
        </div>

        {/* Saturación O2 */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Droplets className="size-4 text-blue-500" />
            Saturación de Oxígeno (%)
          </Label>
          <Input
            type="number"
            placeholder="Ej. 98"
            value={signos.saturacion_oxigeno ?? ''}
            onChange={(e) => handleChange('saturacion_oxigeno', e.target.value)}
            disabled={readOnly}
            className="h-10 font-medium"
          />
          {signosAnteriores?.saturacion_oxigeno && (
            <div className="text-[11px] text-slate-500 pt-0.5">
              <span>Anterior: <strong className="text-slate-700 dark:text-slate-300">{signosAnteriores.saturacion_oxigeno}%</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Observaciones de Triaje */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
        <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Observaciones del Triaje / Notas de Signos Vitales
        </Label>
        <Textarea
          rows={2}
          placeholder="Comentarios adicionales sobre el estado hemodinámico del paciente..."
          value={signos.observaciones_triaje ?? ''}
          onChange={(e) => handleChange('observaciones_triaje', e.target.value)}
          disabled={readOnly}
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default SignosVitalesWidget;
