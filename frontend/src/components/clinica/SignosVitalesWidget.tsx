import React, { useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  HeartPulse,
  Activity,
  Thermometer,
  Droplets,
  Droplet,
  Scale,
  Ruler,
  Info,
  Sparkles,
  Copy,
  FileText,
  Baby,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
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
  escala_dolor?: string | number;
  perimetro_cefalico?: string | number;
  perimetro_abdominal?: string | number;
  observaciones_triaje?: string;
  [key: string]: any;
}

interface SignosVitalesWidgetProps {
  signos: SignosVitalesData;
  signosAnteriores?: SignosVitalesData | null;
  onChange?: (key: string, value: any) => void;
  readOnly?: boolean;
  esPediatrico?: boolean;
  onCopiarResumen?: (resumen: string) => void;
  onInsertarEnEvolucion?: (resumen: string) => void;
}

export const SignosVitalesWidget: React.FC<SignosVitalesWidgetProps> = ({
  signos,
  signosAnteriores,
  onChange,
  readOnly = false,
  esPediatrico = false,
  onCopiarResumen,
  onInsertarEnEvolucion,
}) => {
  const [mostrarMedidasExtra, setMostrarMedidasExtra] = useState<boolean>(Boolean(esPediatrico || signos.perimetro_cefalico || signos.perimetro_abdominal));

  const handleChange = (key: string, val: string | number) => {
    if (readOnly || !onChange) return;
    onChange(key, val);
  };

  // ── 1. CÁLCULO E INTERPRETACIÓN DE IMC Y BSA ──
  const imcInfo = useMemo(() => {
    const peso = parseFloat(String(signos.peso || ''));
    const talla = parseFloat(String(signos.talla || ''));

    if (!peso || !talla || talla <= 0) return null;

    const tallaMetros = talla > 3 ? talla / 100 : talla;
    const imc = peso / (tallaMetros * tallaMetros);
    const imcRedondeado = Math.round(imc * 10) / 10;

    let categoria = 'Normal';
    let colorClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';

    if (imcRedondeado < 18.5) {
      categoria = 'Bajo peso';
      colorClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    } else if (imcRedondeado < 25) {
      categoria = 'Peso saludable';
      colorClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    } else if (imcRedondeado < 30) {
      categoria = 'Sobrepeso';
      colorClass = 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30';
    } else if (imcRedondeado < 35) {
      categoria = 'Obesidad Grado I';
      colorClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    } else {
      categoria = 'Obesidad Severa';
      colorClass = 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 font-bold';
    }

    return { valor: imcRedondeado, categoria, colorClass };
  }, [signos.peso, signos.talla]);

  // Superficie corporal (Mosteller)
  const bsa = useMemo(() => {
    const peso = parseFloat(String(signos.peso || ''));
    const talla = parseFloat(String(signos.talla || ''));
    if (!peso || !talla || talla <= 0) return null;
    const cm = talla > 3 ? talla : talla * 100;
    return Math.round(Math.sqrt((peso * cm) / 3600) * 100) / 100;
  }, [signos.peso, signos.talla]);

  // ── 2. PRESIÓN ARTERIAL: PAM, PP Y CLASIFICACIÓN AHA ──
  const paInfo = useMemo(() => {
    const pas = parseFloat(String(signos.presion_sistolica || ''));
    const pad = parseFloat(String(signos.presion_diastolica || ''));
    if (!pas && !pad) return null;

    const pam = pas && pad && pas > pad ? Math.round(((2 * pad + pas) / 3) * 10) / 10 : null;
    const pp = pas && pad && pas > pad ? Math.round((pas - pad) * 10) / 10 : null;

    if (!pas || !pad) {
      return { pam, pp, categoria: 'Incompleta', colorClass: 'text-muted-foreground', isAlert: false, isCritical: false };
    }

    if (pas >= 180 || pad >= 120) {
      return { pam, pp, categoria: 'Crisis Hipertensiva', colorClass: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 font-bold animate-pulse', isAlert: true, isCritical: true };
    }
    if (pas < 90 || pad < 60) {
      return { pam, pp, categoria: 'Hipotensión', colorClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30', isAlert: true, isCritical: false };
    }
    if (pas >= 140 || pad >= 90) {
      return { pam, pp, categoria: 'HTA Grado 2', colorClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30', isAlert: true, isCritical: false };
    }
    if ((pas >= 130 && pas <= 139) || (pad >= 80 && pad <= 89)) {
      return { pam, pp, categoria: 'HTA Grado 1', colorClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30', isAlert: true, isCritical: false };
    }
    if (pas >= 120 && pas <= 129 && pad < 80) {
      return { pam, pp, categoria: 'Elevada / Pre-HTA', colorClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', isAlert: false, isCritical: false };
    }
    return { pam, pp, categoria: 'Normal / Óptima', colorClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', isAlert: false, isCritical: false };
  }, [signos.presion_sistolica, signos.presion_diastolica]);

  // ── 3. FRECUENCIA CARDÍACA (LPM) ──
  const fcInfo = useMemo(() => {
    const fc = parseFloat(String(signos.frecuencia_cardiaca || ''));
    if (!fc || fc <= 0) return null;

    if (esPediatrico) {
      if (fc < 70) return { categoria: 'Bradicardia', colorClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30', isAlert: true, isCritical: false };
      if (fc > 140) return { categoria: 'Taquicardia', colorClass: 'bg-rose-500/15 text-rose-700 border-rose-500/30', isAlert: true, isCritical: fc > 170 };
      return { categoria: 'Normal Pediátrico', colorClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', isAlert: false, isCritical: false };
    }

    if (fc < 60) return { categoria: 'Bradicardia', colorClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30', isAlert: true, isCritical: fc < 45 };
    if (fc > 100) return { categoria: fc > 130 ? 'Taquicardia Severa' : 'Taquicardia', colorClass: fc > 130 ? 'bg-red-500/20 text-red-700 border-red-500/40 font-bold' : 'bg-orange-500/15 text-orange-700 border-orange-500/30', isAlert: true, isCritical: fc > 130 };
    return { categoria: 'Normocárdico', colorClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', isAlert: false, isCritical: false };
  }, [signos.frecuencia_cardiaca, esPediatrico]);

  // ── 4. FRECUENCIA RESPIRATORIA (RPM) ──
  const frInfo = useMemo(() => {
    const fr = parseFloat(String(signos.frecuencia_respiratoria || ''));
    if (!fr || fr <= 0) return null;

    if (esPediatrico) {
      if (fr < 18) return { categoria: 'Bradipnea', colorClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30', isAlert: true, isCritical: false };
      if (fr > 35) return { categoria: 'Taquipnea', colorClass: 'bg-rose-500/15 text-rose-700 border-rose-500/30', isAlert: true, isCritical: false };
      return { categoria: 'Normal Pediátrico', colorClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', isAlert: false, isCritical: false };
    }

    if (fr < 12) return { categoria: 'Bradipnea', colorClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30', isAlert: true, isCritical: false };
    if (fr > 20) return { categoria: fr > 28 ? 'Taquipnea Severa' : 'Taquipnea', colorClass: fr > 28 ? 'bg-red-500/20 text-red-700 border-red-500/40 font-bold' : 'bg-orange-500/15 text-orange-700 border-orange-500/30', isAlert: true, isCritical: fr > 28 };
    return { categoria: 'Eupneico / Normal', colorClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', isAlert: false, isCritical: false };
  }, [signos.frecuencia_respiratoria, esPediatrico]);

  // ── 5. TEMPERATURA CORPORAL (°C) ──
  const tempInfo = useMemo(() => {
    const temp = parseFloat(String(signos.temperatura || ''));
    if (!temp || temp <= 0) return null;

    if (temp < 35.0) return { categoria: 'Hipotermia Severa', colorClass: 'bg-blue-500/20 text-blue-700 border-blue-500/40 font-bold', isAlert: true, isCritical: true };
    if (temp < 36.0) return { categoria: 'Hipotermia Leve', colorClass: 'bg-sky-500/15 text-sky-700 border-sky-500/30', isAlert: true, isCritical: false };
    if (temp <= 37.2) return { categoria: 'Afebril / Normal', colorClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', isAlert: false, isCritical: false };
    if (temp <= 37.9) return { categoria: 'Febrícula', colorClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30', isAlert: true, isCritical: false };
    if (temp < 39.0) return { categoria: 'Fiebre', colorClass: 'bg-rose-500/15 text-rose-700 border-rose-500/30', isAlert: true, isCritical: false };
    return { categoria: 'Hiperpirexia / Fiebre Alta', colorClass: 'bg-red-500/20 text-red-700 border-red-500/40 font-bold animate-pulse', isAlert: true, isCritical: true };
  }, [signos.temperatura]);

  // ── 6. SATURACIÓN DE OXÍGENO (%) ──
  const spo2Info = useMemo(() => {
    const spo2 = parseFloat(String(signos.saturacion_oxigeno || ''));
    if (!spo2 || spo2 <= 0) return null;

    if (spo2 >= 95) return { categoria: 'Eusaturación / Normal', colorClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', isAlert: false, isCritical: false };
    if (spo2 >= 90) return { categoria: 'Hipoxia Leve', colorClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30', isAlert: true, isCritical: false };
    if (spo2 >= 85) return { categoria: 'Hipoxia Moderada', colorClass: 'bg-rose-500/15 text-rose-700 border-rose-500/30', isAlert: true, isCritical: true };
    return { categoria: 'Hipoxia Severa', colorClass: 'bg-red-500/20 text-red-700 border-red-500/40 font-bold animate-pulse', isAlert: true, isCritical: true };
  }, [signos.saturacion_oxigeno]);

  // ── 7. GLUCEMIA CAPILAR (mg/dL) ──
  const glucosaInfo = useMemo(() => {
    const glu = parseFloat(String(signos.glucosa_capilar || ''));
    if (!glu || glu <= 0) return null;

    if (glu < 70) return { categoria: 'Hipoglucemia', colorClass: 'bg-red-500/20 text-red-700 border-red-500/40 font-bold animate-pulse', isAlert: true, isCritical: true };
    if (glu <= 99) return { categoria: 'Normal (Ayuno)', colorClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', isAlert: false, isCritical: false };
    if (glu <= 125) return { categoria: 'Glucemia Alterada', colorClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30', isAlert: true, isCritical: false };
    if (glu < 200) return { categoria: 'Hiperglucemia', colorClass: 'bg-orange-500/15 text-orange-700 border-orange-500/30', isAlert: true, isCritical: false };
    return { categoria: 'Hiperglucemia Severa', colorClass: 'bg-red-500/20 text-red-700 border-red-500/40 font-bold', isAlert: true, isCritical: true };
  }, [signos.glucosa_capilar]);

  // ── 8. ESCALA DE DOLOR (EVA 0–10) ──
  const dolorActual = signos.escala_dolor !== undefined && signos.escala_dolor !== '' ? Number(signos.escala_dolor) : null;
  const dolorInfo = useMemo(() => {
    if (dolorActual === null || isNaN(dolorActual)) return null;
    if (dolorActual === 0) return { categoria: 'Sin dolor', colorClass: 'text-emerald-700 bg-emerald-500/15 border-emerald-500/30' };
    if (dolorActual <= 3) return { categoria: 'Dolor Leve', colorClass: 'text-teal-700 bg-teal-500/15 border-teal-500/30' };
    if (dolorActual <= 6) return { categoria: 'Dolor Moderado', colorClass: 'text-amber-700 bg-amber-500/15 border-amber-500/30' };
    if (dolorActual <= 9) return { categoria: 'Dolor Severo', colorClass: 'text-rose-700 bg-rose-500/15 border-rose-500/30' };
    return { categoria: 'Dolor Insoportable', colorClass: 'text-red-700 bg-red-500/20 border-red-500/40 font-bold' };
  }, [dolorActual]);

  // ── 9. ESTADO GLOBAL DE ALERTA DE TRIAJE ──
  const estadoTriajeGlobal = useMemo(() => {
    const alerts: string[] = [];
    let hasCritical = false;

    if (paInfo?.isCritical) { alerts.push('Crisis HTA'); hasCritical = true; }
    else if (paInfo?.isAlert) { alerts.push(paInfo.categoria); }

    if (fcInfo?.isCritical) { alerts.push('Taquicardia severa'); hasCritical = true; }
    else if (fcInfo?.isAlert) { alerts.push(fcInfo.categoria); }

    if (frInfo?.isCritical) { alerts.push('Taquipnea severa'); hasCritical = true; }
    else if (frInfo?.isAlert) { alerts.push(frInfo.categoria); }

    if (tempInfo?.isCritical) { alerts.push(tempInfo.categoria); hasCritical = true; }
    else if (tempInfo?.isAlert) { alerts.push(tempInfo.categoria); }

    if (spo2Info?.isCritical) { alerts.push(spo2Info.categoria); hasCritical = true; }
    else if (spo2Info?.isAlert) { alerts.push(spo2Info.categoria); }

    if (glucosaInfo?.isCritical) { alerts.push(glucosaInfo.categoria); hasCritical = true; }
    else if (glucosaInfo?.isAlert) { alerts.push(glucosaInfo.categoria); }

    const numFilled = [
      signos.presion_sistolica,
      signos.frecuencia_cardiaca,
      signos.frecuencia_respiratoria,
      signos.temperatura,
      signos.saturacion_oxigeno,
      signos.peso,
    ].filter((v) => v !== '' && v !== undefined && v !== null).length;

    if (numFilled === 0) {
      return {
        label: 'Sin registros aún',
        colorClass: 'text-muted-foreground border-border bg-muted/40',
        icono: Info,
      };
    }

    if (hasCritical) {
      return {
        label: `🚨 Alerta Crítica: ${alerts.join(' · ')}`,
        colorClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40 font-bold animate-pulse',
        icono: AlertTriangle,
      };
    }

    if (alerts.length > 0) {
      return {
        label: `⚠️ Parámetros Alterados (${alerts.length}): ${alerts.slice(0, 2).join(' · ')}${alerts.length > 2 ? '...' : ''}`,
        colorClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 font-semibold',
        icono: AlertTriangle,
      };
    }

    return {
      label: '✓ Constantes Biológicas Estables',
      colorClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 font-semibold',
      icono: CheckCircle2,
    };
  }, [paInfo, fcInfo, frInfo, tempInfo, spo2Info, glucosaInfo, signos]);

  // ── ACCIÓN: RELLENO RÁPIDO DE CONSTANTES NORMALES ──
  const handleCargarValoresNormales = () => {
    if (readOnly || !onChange) return;
    onChange('presion_sistolica', '120');
    onChange('presion_diastolica', '80');
    onChange('frecuencia_cardiaca', esPediatrico ? '95' : '75');
    onChange('frecuencia_respiratoria', esPediatrico ? '24' : '18');
    onChange('temperatura', '36.5');
    onChange('saturacion_oxigeno', '98');
    if (signos.escala_dolor === '' || signos.escala_dolor === undefined) {
      onChange('escala_dolor', 0);
    }
    toast.success('Constantes vitales normales estándar cargadas');
  };

  // ── GENERADOR DE RESUMEN CLÍNICO EN TEXTO ──
  const generarResumenTexto = () => {
    const partes: string[] = [];
    if (signos.presion_sistolica && signos.presion_diastolica) {
      partes.push(`PA: ${signos.presion_sistolica}/${signos.presion_diastolica} mmHg${paInfo ? ` (${paInfo.categoria})` : ''}`);
    }
    if (signos.frecuencia_cardiaca) {
      partes.push(`FC: ${signos.frecuencia_cardiaca} lpm`);
    }
    if (signos.frecuencia_respiratoria) {
      partes.push(`FR: ${signos.frecuencia_respiratoria} rpm`);
    }
    if (signos.temperatura) {
      partes.push(`Temp: ${signos.temperatura} °C`);
    }
    if (signos.saturacion_oxigeno) {
      partes.push(`SpO2: ${signos.saturacion_oxigeno}%`);
    }
    if (signos.glucosa_capilar) {
      partes.push(`Glicemia: ${signos.glucosa_capilar} mg/dL${glucosaInfo ? ` (${glucosaInfo.categoria})` : ''}`);
    }
    if (signos.peso) {
      partes.push(`Peso: ${signos.peso} kg`);
    }
    if (signos.talla) {
      partes.push(`Talla: ${signos.talla} cm`);
    }
    if (imcInfo) {
      partes.push(`IMC: ${imcInfo.valor} (${imcInfo.categoria})`);
    }
    if (signos.escala_dolor !== undefined && signos.escala_dolor !== '') {
      partes.push(`Dolor (EVA): ${signos.escala_dolor}/10`);
    }
    if (signos.perimetro_cefalico) {
      partes.push(`P. Cefálico: ${signos.perimetro_cefalico} cm`);
    }
    if (signos.perimetro_abdominal) {
      partes.push(`P. Abdominal: ${signos.perimetro_abdominal} cm`);
    }
    return partes.join(' | ');
  };

  const handleCopiarResumen = () => {
    const txt = generarResumenTexto();
    if (!txt) {
      toast.info('No hay signos vitales registrados para copiar');
      return;
    }
    navigator.clipboard.writeText(txt);
    toast.success('Resumen de signos vitales copiado al portapapeles');
    onCopiarResumen?.(txt);
  };

  const handleInsertarResumen = () => {
    const txt = generarResumenTexto();
    if (!txt) {
      toast.info('No hay signos vitales registrados para insertar');
      return;
    }
    onInsertarEnEvolucion?.(txt);
  };

  const IconoTriaje = estadoTriajeGlobal.icono;

  return (
    <div className="space-y-5">
      {/* ── BARRA SUPERIOR DE ACCIONES RÁPIDAS Y ESTADO DE TRIAJE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-xs px-2.5 py-1 gap-1.5 border', estadoTriajeGlobal.colorClass)}>
            <IconoTriaje className="size-3.5" />
            <span>{estadoTriajeGlobal.label}</span>
          </Badge>
          {esPediatrico && (
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 gap-1">
              <Baby className="size-3.5 text-amber-600" />
              <span>Rangos Pediátricos</span>
            </Badge>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCargarValoresNormales}
              className="h-8 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 gap-1.5 cursor-pointer shadow-2xs"
              title="Prellenar PA 120/80, FC 75, FR 18, Temp 36.5, Sat 98% y Dolor 0"
            >
              <Zap className="size-3.5 text-amber-500" />
              <span>Valores Normales Estándar</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopiarResumen}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
              title="Copiar constantes en texto con formato médico"
            >
              <Copy className="size-3.5" />
              <span className="hidden md:inline">Copiar</span>
            </Button>

            {onInsertarEnEvolucion && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleInsertarResumen}
                className="h-8 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 gap-1.5 cursor-pointer"
                title="Insertar resumen en la anamnesis / evolución médica"
              >
                <FileText className="size-3.5" />
                <span>Insertar en Evolución</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Banner de Consulta de Control / Comparativa */}
      {signosAnteriores && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 text-xs text-teal-800 dark:text-teal-300 animate-in fade-in-50">
          <Activity className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <span>
            <strong>Modo Comparativo de Control:</strong> Mostrando comparativa evolutiva con los signos vitales registrados en la consulta previa.
          </span>
        </div>
      )}

      {/* ── GRID 1: ANTROPOMETRÍA Y METABOLISMO ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peso */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
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
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>Anterior: <strong className="text-foreground">{signosAnteriores.peso} kg</strong></span>
              {Number(signos.peso) > 0 && Number(signosAnteriores.peso) > 0 && (
                <span className={cn(
                  "font-semibold px-1.5 py-0.5 rounded text-[10px]",
                  Number(signos.peso) > Number(signosAnteriores.peso)
                    ? "text-amber-700 bg-amber-100/80 dark:bg-amber-950/60 dark:text-amber-300"
                    : Number(signos.peso) < Number(signosAnteriores.peso)
                    ? "text-emerald-700 bg-emerald-100/80 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "text-muted-foreground bg-muted"
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
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
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
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Anterior: <strong className="text-foreground">{signosAnteriores.talla} cm</strong></span>
            </div>
          )}
        </div>

        {/* IMC Calculado */}
        <div className="p-4 rounded-xl border border-border/80 bg-muted/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Info className="size-4 text-indigo-500" />
              IMC (Masa Corporal)
            </Label>
          </div>
          <div className="flex items-center gap-2.5 h-10">
            {imcInfo ? (
              <>
                <span className="text-2xl font-bold text-foreground">
                  {imcInfo.valor}
                </span>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold border', imcInfo.colorClass)}>
                  {imcInfo.categoria}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Requiere peso y talla
              </span>
            )}
          </div>
          {bsa && (
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Sup. Corporal: <strong className="text-foreground">{bsa} m²</strong></span>
            </div>
          )}
        </div>

        {/* Glucosa Capilar / Dextrostix */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Droplet className="size-4 text-purple-500" />
              Glucemia Capilar (mg/dL)
            </Label>
            {glucosaInfo && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold border', glucosaInfo.colorClass)}>
                {glucosaInfo.categoria}
              </span>
            )}
          </div>
          <Input
            type="number"
            step="1"
            placeholder="Ej. 95 (Ayunas)"
            value={signos.glucosa_capilar ?? ''}
            onChange={(e) => handleChange('glucosa_capilar', e.target.value)}
            disabled={readOnly}
            className="font-medium text-base h-10"
          />
          {signosAnteriores?.glucosa_capilar && (
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Anterior: <strong className="text-foreground">{signosAnteriores.glucosa_capilar} mg/dL</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* ── GRID 2: SIGNOS HEMODINÁMICOS Y CONSTANTES VITALES ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Presión Arterial */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Activity className="size-4 text-rose-500" />
              Presión Arterial (mmHg)
            </Label>
            {paInfo && paInfo.categoria !== 'Incompleta' && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold border', paInfo.colorClass)}>
                {paInfo.categoria}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Sistólica (120)"
              value={signos.presion_sistolica ?? ''}
              onChange={(e) => handleChange('presion_sistolica', e.target.value)}
              disabled={readOnly}
              className="h-10 text-center font-medium"
            />
            <span className="text-muted-foreground font-bold">/</span>
            <Input
              type="number"
              placeholder="Diastólica (80)"
              value={signos.presion_diastolica ?? ''}
              onChange={(e) => handleChange('presion_diastolica', e.target.value)}
              disabled={readOnly}
              className="h-10 text-center font-medium"
            />
          </div>
          {paInfo?.pam && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>PAM: <strong className="text-foreground">{paInfo.pam} mmHg</strong></span>
              <span className="text-[10px] text-muted-foreground">PP: {paInfo.pp}</span>
            </div>
          )}
          {(signosAnteriores?.presion_sistolica || signosAnteriores?.presion_diastolica) && (
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Anterior: <strong className="text-foreground">{signosAnteriores.presion_sistolica || '-'}/{signosAnteriores.presion_diastolica || '-'} mmHg</strong></span>
            </div>
          )}
        </div>

        {/* Frecuencia Cardíaca */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <HeartPulse className="size-4 text-red-500" />
              Frecuencia Cardíaca (LPM)
            </Label>
            {fcInfo && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold border', fcInfo.colorClass)}>
                {fcInfo.categoria}
              </span>
            )}
          </div>
          <Input
            type="number"
            placeholder="Ej. 75"
            value={signos.frecuencia_cardiaca ?? ''}
            onChange={(e) => handleChange('frecuencia_cardiaca', e.target.value)}
            disabled={readOnly}
            className="h-10 font-medium"
          />
          {signosAnteriores?.frecuencia_cardiaca && (
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Anterior: <strong className="text-foreground">{signosAnteriores.frecuencia_cardiaca} LPM</strong></span>
            </div>
          )}
        </div>

        {/* Frecuencia Respiratoria */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Activity className="size-4 text-sky-500" />
              Frecuencia Resp. (RPM)
            </Label>
            {frInfo && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold border', frInfo.colorClass)}>
                {frInfo.categoria}
              </span>
            )}
          </div>
          <Input
            type="number"
            placeholder="Ej. 18"
            value={signos.frecuencia_respiratoria ?? ''}
            onChange={(e) => handleChange('frecuencia_respiratoria', e.target.value)}
            disabled={readOnly}
            className="h-10 font-medium"
          />
          {signosAnteriores?.frecuencia_respiratoria && (
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Anterior: <strong className="text-foreground">{signosAnteriores.frecuencia_respiratoria} RPM</strong></span>
            </div>
          )}
        </div>

        {/* Temperatura */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Thermometer className="size-4 text-amber-500" />
              Temperatura (°C)
            </Label>
            {tempInfo && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold border', tempInfo.colorClass)}>
                {tempInfo.categoria}
              </span>
            )}
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
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Anterior: <strong className="text-foreground">{signosAnteriores.temperatura} °C</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* ── FILA INTERMEDIA: SATURACIÓN DE OXÍGENO Y ESCALA DE DOLOR EVA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Saturación O2 */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Droplets className="size-4 text-blue-500" />
              Saturación de Oxígeno (%)
            </Label>
            {spo2Info && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold border', spo2Info.colorClass)}>
                {spo2Info.categoria}
              </span>
            )}
          </div>
          <Input
            type="number"
            placeholder="Ej. 98"
            value={signos.saturacion_oxigeno ?? ''}
            onChange={(e) => handleChange('saturacion_oxigeno', e.target.value)}
            disabled={readOnly}
            className="h-10 font-medium text-base"
          />
          {signosAnteriores?.saturacion_oxigeno && (
            <div className="text-[11px] text-muted-foreground pt-0.5">
              <span>Anterior: <strong className="text-foreground">{signosAnteriores.saturacion_oxigeno}%</strong></span>
            </div>
          )}
        </div>

        {/* Escala Visual Analógica del Dolor (EVA 0–10) */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-500" />
              <span>Escala de Dolor (EVA - 5to Signo Vital)</span>
            </Label>
            {dolorInfo && (
              <Badge variant="outline" className={cn('text-xs font-semibold border px-2 py-0.5', dolorInfo.colorClass)}>
                {dolorActual} / 10 · {dolorInfo.categoria}
              </Badge>
            )}
          </div>

          {/* Selector de Chips 0 - 10 */}
          <div className="grid grid-cols-11 gap-1 pt-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const isSelected = dolorActual === num;
              let btnColor = 'hover:bg-muted text-muted-foreground border-border';
              if (num === 0) {
                btnColor = isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'hover:border-emerald-500/50';
              } else if (num <= 3) {
                btnColor = isSelected ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'hover:border-teal-500/50';
              } else if (num <= 6) {
                btnColor = isSelected ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'hover:border-amber-500/50';
              } else if (num <= 9) {
                btnColor = isSelected ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'hover:border-rose-500/50';
              } else {
                btnColor = isSelected ? 'bg-red-700 text-white border-red-700 shadow-xs animate-pulse font-bold' : 'hover:border-red-500/50';
              }

              return (
                <button
                  key={num}
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleChange('escala_dolor', isSelected ? '' : num)}
                  className={cn(
                    'h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center',
                    btnColor
                  )}
                  title={`Dolor Nivel ${num}`}
                >
                  <span>{num}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5 pt-0.5">
            <span>0: Sin Dolor</span>
            <span>1-3: Leve</span>
            <span>4-6: Moderado</span>
            <span>7-9: Severo</span>
            <span className="text-red-600 font-semibold">10: Insoportable</span>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN COLAPSABLE: MEDIDAS ANTROPOMÉTRICAS COMPLEMENTARIAS ── */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setMostrarMedidasExtra(!mostrarMedidasExtra)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Ruler className="size-3.5 text-primary" />
            <span>Medidas Complementarias (Perímetro Cefálico / Abdominal)</span>
            {esPediatrico && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-300">
                Recomendado en Pediatría
              </Badge>
            )}
          </span>
          {mostrarMedidasExtra ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {mostrarMedidasExtra && (
          <div className="p-4 pt-2 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in-50">
            {/* Perímetro Cefálico */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Baby className="size-4 text-sky-500" />
                  Perímetro Cefálico (cm)
                </Label>
                <span className="text-[10px] text-muted-foreground">Lactantes / Niños</span>
              </div>
              <Input
                type="number"
                step="0.1"
                placeholder="Ej. 42.5"
                value={signos.perimetro_cefalico ?? ''}
                onChange={(e) => handleChange('perimetro_cefalico', e.target.value)}
                disabled={readOnly}
                className="h-9 font-medium"
              />
            </div>

            {/* Perímetro Abdominal / Cintura */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Ruler className="size-4 text-emerald-500" />
                  Perímetro Abdominal / Cintura (cm)
                </Label>
                <span className="text-[10px] text-muted-foreground">Riesgo cardiovascular</span>
              </div>
              <Input
                type="number"
                step="0.5"
                placeholder="Ej. 84.0"
                value={signos.perimetro_abdominal ?? ''}
                onChange={(e) => handleChange('perimetro_abdominal', e.target.value)}
                disabled={readOnly}
                className="h-9 font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── OBSERVACIONES DE TRIAJE ── */}
      <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          Observaciones del Triaje / Notas de Signos Vitales
        </Label>
        <Textarea
          rows={2}
          placeholder="Comentarios adicionales sobre el estado hemodinámico, hidratación, marcha o conducta del paciente durante la toma de constantes..."
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
