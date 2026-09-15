import React, { useMemo } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  HeartPulse,
  Activity,
  Thermometer,
  Droplets,
  Scale,
  Ruler,
  Info,
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
  onChange?: (key: string, value: any) => void;
  readOnly?: boolean;
}

export const SignosVitalesWidget: React.FC<SignosVitalesWidgetProps> = ({
  signos,
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

  const handleChange = (key: string, val: string) => {
    if (readOnly || !onChange) return;
    onChange(key, val);
  };

  return (
    <div className="space-y-6">
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
