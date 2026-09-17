import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  Calculator,
  Baby,
  HeartPulse,
  Scale,
  Calendar,
  Sparkles,
  Copy,
  PlusCircle,
  Activity,
  Check,
  Stethoscope,
} from 'lucide-react';

interface CalculadorasClinicasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signosVitales?: {
    peso?: string | number;
    talla?: string | number;
    presion_sistolica?: string | number;
    presion_diastolica?: string | number;
    frecuencia_cardiaca?: string | number;
  };
  especialidadNombre?: string;
  onInsertarEnEvaluacion?: (texto: string) => void;
}

export const CalculadorasClinicasModal: React.FC<CalculadorasClinicasModalProps> = ({
  open,
  onOpenChange,
  signosVitales,
  especialidadNombre = '',
  onInsertarEnEvaluacion,
}) => {
  // Pestaña predeterminada según especialidad
  const defaultTab = useMemo(() => {
    const esp = especialidadNombre.toLowerCase();
    if (esp.includes('gineco') || esp.includes('obste')) return 'obstetricia';
    if (esp.includes('pedia') || esp.includes('pueri')) return 'pediatria';
    if (esp.includes('cardio') || esp.includes('interna')) return 'hemodinamica';
    return 'obstetricia';
  }, [especialidadNombre]);

  // -------------------------------------------------------------
  // 1. CALCULADORA OBSTÉTRICA (Regla de Naegele)
  // -------------------------------------------------------------
  const [fum, setFum] = useState<string>('');

  const obstetricoCalc = useMemo(() => {
    if (!fum) return null;
    const fumDate = new Date(fum + 'T00:00:00');
    if (isNaN(fumDate.getTime())) return null;

    // Regla de Naegele: FUM + 7 días - 3 meses + 1 año
    const fppDate = new Date(fumDate);
    fppDate.setDate(fppDate.getDate() + 7);
    fppDate.setMonth(fppDate.getMonth() - 3);
    fppDate.setFullYear(fppDate.getFullYear() + 1);

    // Semanas de gestación hoy
    const hoy = new Date();
    const diffTime = hoy.getTime() - fumDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;

    const semanas = Math.floor(diffDays / 7);
    const diasRestantes = diffDays % 7;

    let trimestre = 'Primer Trimestre (1 - 13.6 sem)';
    if (semanas >= 14 && semanas < 28) {
      trimestre = 'Segundo Trimestre (14 - 27.6 sem)';
    } else if (semanas >= 28) {
      trimestre = 'Tercer Trimestre (28 - 40+ sem)';
    }

    const formatDate = (d: Date) =>
      d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return {
      fpp: formatDate(fppDate),
      fppRaw: fppDate,
      semanas,
      dias: diasRestantes,
      totalDias: diffDays,
      trimestre,
      textoResumen: `FUM: ${formatDate(fumDate)} | EG: ${semanas} sem + ${diasRestantes} días (${trimestre.split(' ')[0]} Trimestre) | FPP estimada: ${formatDate(fppDate)}`,
    };
  }, [fum]);

  // -------------------------------------------------------------
  // 2. CALCULADORA PEDIÁTRICA (Dosis por Peso)
  // -------------------------------------------------------------
  const [pesoPed, setPesoPed] = useState<string>(String(signosVitales?.peso || ''));
  const [tallaPed, setTallaPed] = useState<string>(String(signosVitales?.talla || ''));
  const [dosisObjetivo, setDosisObjetivo] = useState<string>('15'); // mg/kg/dosis o día
  const [tipoCalculo, setTipoCalculo] = useState<'por_dosis' | 'por_dia'>('por_dosis');
  const [concentracionMg, setConcentracionMg] = useState<string>('250'); // mg
  const [concentracionMl, setConcentracionMl] = useState<string>('5'); // en X ml
  const [frecuenciaPed, setFrecuenciaPed] = useState<number>(3); // tomas al día (cada 8h = 3)

  const pedCalc = useMemo(() => {
    const p = parseFloat(pesoPed);
    const d = parseFloat(dosisObjetivo);
    const mg = parseFloat(concentracionMg);
    const ml = parseFloat(concentracionMl);

    if (!p || p <= 0 || !d || d <= 0) return null;

    let mgPorToma = 0;
    let mgTotalDia = 0;

    if (tipoCalculo === 'por_dosis') {
      mgPorToma = p * d;
      mgTotalDia = mgPorToma * frecuenciaPed;
    } else {
      mgTotalDia = p * d;
      mgPorToma = mgTotalDia / (frecuenciaPed || 1);
    }

    let mlPorToma = 0;
    if (mg > 0 && ml > 0) {
      mlPorToma = (mgPorToma * ml) / mg;
    }

    // Superficie corporal Mosteller: sqrt((peso * talla) / 3600)
    let bsa = null;
    const t = parseFloat(tallaPed);
    if (t > 0) {
      const cm = t > 3 ? t : t * 100;
      bsa = Math.sqrt((p * cm) / 3600);
    }

    return {
      mgPorToma: Math.round(mgPorToma * 10) / 10,
      mgTotalDia: Math.round(mgTotalDia * 10) / 10,
      mlPorToma: Math.round(mlPorToma * 100) / 100,
      bsa: bsa ? Math.round(bsa * 100) / 100 : null,
      resumenTexto: `Dosis: ${Math.round(mgPorToma)} mg (${Math.round(mlPorToma * 10) / 10} ml) cada ${24 / frecuenciaPed} horas (Total: ${Math.round(mgTotalDia)} mg/día para peso de ${p} kg)`,
    };
  }, [pesoPed, tallaPed, dosisObjetivo, tipoCalculo, concentracionMg, concentracionMl, frecuenciaPed]);

  // -------------------------------------------------------------
  // 3. CALCULADORA HEMODINÁMICA (PAM & Presión de Pulso)
  // -------------------------------------------------------------
  const [pas, setPas] = useState<string>(String(signosVitales?.presion_sistolica || ''));
  const [pad, setPad] = useState<string>(String(signosVitales?.presion_diastolica || ''));
  const [fc, setFc] = useState<string>(String(signosVitales?.frecuencia_cardiaca || ''));

  const cardioCalc = useMemo(() => {
    const s = parseFloat(pas);
    const d = parseFloat(pad);
    if (!s || !d || s <= d) return null;

    // Presión Arterial Media (PAM) = (2 * PAD + PAS) / 3
    const pam = Math.round(((2 * d + s) / 3) * 10) / 10;
    // Presión de Pulso (PP) = PAS - PAD
    const pp = s - d;

    // Clasificación AHA / JNC8
    let clasificacion = 'Normal';
    let clasColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300';

    if (s >= 180 || d >= 120) {
      clasificacion = 'Crisis Hipertensiva (Emergencia/Urgencia)';
      clasColor = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300';
    } else if (s >= 140 || d >= 90) {
      clasificacion = 'Hipertensión Grado 2';
      clasColor = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300';
    } else if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) {
      clasificacion = 'Hipertensión Grado 1';
      clasColor = 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300';
    } else if (s >= 120 && s <= 129 && d < 80) {
      clasificacion = 'Presión Arterial Elevada';
      clasColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300';
    } else if (s < 90 || d < 60) {
      clasificacion = 'Hipotensión Arterial';
      clasColor = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300';
    }

    let perfusionStatus = 'Adecuada (70 - 105 mmHg)';
    if (pam < 65) perfusionStatus = 'Bajo flujo / Hipoperfusión orgánica (<65 mmHg)';
    if (pam > 110) perfusionStatus = 'Sobrecarga hemodinámica elevada';

    return {
      pam,
      pp,
      clasificacion,
      clasColor,
      perfusionStatus,
      resumenTexto: `PA: ${s}/${d} mmHg | PAM: ${pam} mmHg | Presión de Pulso: ${pp} mmHg | Clasificación: ${clasificacion}`,
    };
  }, [pas, pad]);

  // -------------------------------------------------------------
  // 4. CALCULADORA ANTROPOMÉTRICA (IMC & Superficie Corporal)
  // -------------------------------------------------------------
  const [pesoAntro, setPesoAntro] = useState<string>(String(signosVitales?.peso || ''));
  const [tallaAntro, setTallaAntro] = useState<string>(String(signosVitales?.talla || ''));

  const antroCalc = useMemo(() => {
    const p = parseFloat(pesoAntro);
    const t = parseFloat(tallaAntro);
    if (!p || !t || p <= 0 || t <= 0) return null;

    const tMetros = t > 3 ? t / 100 : t;
    const imc = Math.round((p / (tMetros * tMetros)) * 10) / 10;

    // Rango de peso ideal para la talla (IMC 18.5 - 24.9)
    const pesoMinIdeal = Math.round(18.5 * tMetros * tMetros * 10) / 10;
    const pesoMaxIdeal = Math.round(24.9 * tMetros * tMetros * 10) / 10;

    // BSA Mosteller
    const bsa = Math.round(Math.sqrt((p * (tMetros * 100)) / 3600) * 100) / 100;

    let cat = 'Peso saludable';
    let catColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300';

    if (imc < 18.5) {
      cat = 'Bajo peso';
      catColor = 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (imc >= 25 && imc < 30) {
      cat = 'Sobrepeso';
      catColor = 'bg-orange-100 text-orange-800 border-orange-300';
    } else if (imc >= 30 && imc < 35) {
      cat = 'Obesidad Grado I';
      catColor = 'bg-rose-100 text-rose-800 border-rose-300';
    } else if (imc >= 35 && imc < 40) {
      cat = 'Obesidad Grado II';
      catColor = 'bg-rose-200 text-rose-900 border-rose-400';
    } else if (imc >= 40) {
      cat = 'Obesidad Mórbida (Grado III)';
      catColor = 'bg-red-200 text-red-900 border-red-400';
    }

    return {
      imc,
      cat,
      catColor,
      pesoMinIdeal,
      pesoMaxIdeal,
      bsa,
      resumenTexto: `Peso: ${p} kg | Talla: ${tMetros * 100} cm | IMC: ${imc} kg/m² (${cat}) | Peso ideal: ${pesoMinIdeal}-${pesoMaxIdeal} kg | Superficie Corporal: ${bsa} m²`,
    };
  }, [pesoAntro, tallaAntro]);

  const handleCopiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success('Copiado al portapapeles');
  };

  const handleInsertar = (texto: string) => {
    if (onInsertarEnEvaluacion) {
      onInsertarEnEvaluacion(texto);
      toast.success('Insertado en el examen clínico');
      onOpenChange(false);
    } else {
      handleCopiarTexto(texto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-border bg-background shadow-2xl">
        {/* Header con gradiente clínico */}
        <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Calculadoras y Utilidades Clínicas
                </DialogTitle>
                <DialogDescription className="text-white/80 text-xs mt-0.5">
                  Herramientas de cálculo rápido según la especialidad de la atención
                </DialogDescription>
              </div>
            </div>
            {especialidadNombre && (
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs">
                {especialidadNombre}
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs de Calculadoras */}
        <div className="p-6">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-4 bg-muted/60 p-1">
              <TabsTrigger value="obstetricia" className="gap-1.5 text-xs py-1.5">
                <Baby className="h-3.5 w-3.5 text-rose-500" />
                <span>Obstetricia</span>
              </TabsTrigger>
              <TabsTrigger value="pediatria" className="gap-1.5 text-xs py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Pediatría</span>
              </TabsTrigger>
              <TabsTrigger value="hemodinamica" className="gap-1.5 text-xs py-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-red-500" />
                <span>Cardio / PAM</span>
              </TabsTrigger>
              <TabsTrigger value="antropometria" className="gap-1.5 text-xs py-1.5">
                <Scale className="h-3.5 w-3.5 text-teal-500" />
                <span>IMC / BSA</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OBSTETRICIA */}
            <TabsContent value="obstetricia" className="space-y-4 pt-1">
              <div className="p-4 rounded-xl border border-rose-200/60 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-xs">
                  <Calendar className="h-4 w-4" />
                  <span>Regla de Naegele: Fecha de Última Menstruación (FUM)</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">FUM del paciente:</Label>
                  <Input
                    type="date"
                    value={fum}
                    onChange={(e) => setFum(e.target.value)}
                    className="h-10 mt-1 max-w-xs font-medium"
                  />
                </div>
              </div>

              {obstetricoCalc ? (
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 animate-in fade-in-50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-background border border-border">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Edad Gestacional:
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {obstetricoCalc.semanas}{' '}
                        <span className="text-xs font-normal text-muted-foreground">sem</span> +{' '}
                        {obstetricoCalc.dias}{' '}
                        <span className="text-xs font-normal text-muted-foreground">días</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        ({obstetricoCalc.totalDias} días)
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Fecha Probable de Parto (FPP):
                      </span>
                      <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                        {obstetricoCalc.fpp}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Regla de Naegele (+7d -3m +1a)
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Trimestre:
                      </span>
                      <Badge variant="outline" className="mt-1 font-semibold text-xs border-rose-300 text-rose-700 dark:text-rose-300">
                        {obstetricoCalc.trimestre.split(' ')[0]} Trimestre
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[340px]">
                      {obstetricoCalc.textoResumen}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopiarTexto(obstetricoCalc.textoResumen)}
                        className="gap-1.5 text-xs h-8 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleInsertar(obstetricoCalc.textoResumen)}
                        className="gap-1.5 text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Pegar en Evaluación</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border">
                  Indique la FUM para calcular edad gestacional y fecha probable de parto automáticamente.
                </div>
              )}
            </TabsContent>

            {/* TAB 2: PEDIATRÍA */}
            <TabsContent value="pediatria" className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-amber-200/60 dark:border-amber-950/60 bg-amber-50/30 dark:bg-amber-950/20">
                <div>
                  <Label className="text-xs text-muted-foreground">Peso del Paciente (kg) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={pesoPed}
                    onChange={(e) => setPesoPed(e.target.value)}
                    placeholder="Ej. 14.5"
                    className="h-9 mt-1 font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dosis Objetivo (mg/kg)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={dosisObjetivo}
                    onChange={(e) => setDosisObjetivo(e.target.value)}
                    placeholder="Ej. 15"
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Frecuencia al día</Label>
                  <select
                    value={frecuenciaPed}
                    onChange={(e) => setFrecuenciaPed(Number(e.target.value))}
                    className="h-9 w-full mt-1 rounded-md border border-input bg-background px-3 text-xs font-medium"
                  >
                    <option value={1}>Cada 24 horas (1 vez al día)</option>
                    <option value={2}>Cada 12 horas (2 veces al día)</option>
                    <option value={3}>Cada 8 horas (3 veces al día)</option>
                    <option value={4}>Cada 6 horas (4 veces al día)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <span className="text-xs font-bold text-foreground block">
                  Concentración de la Presentación (Jarabe / Suspensión)
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-[11px] text-muted-foreground">Miligramos (mg)</Label>
                    <Input
                      type="number"
                      value={concentracionMg}
                      onChange={(e) => setConcentracionMg(e.target.value)}
                      placeholder="250"
                      className="h-9 mt-0.5"
                    />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground pt-4">en</span>
                  <div className="flex-1">
                    <Label className="text-[11px] text-muted-foreground">Mililitros (ml)</Label>
                    <Input
                      type="number"
                      value={concentracionMl}
                      onChange={(e) => setConcentracionMl(e.target.value)}
                      placeholder="5"
                      className="h-9 mt-0.5"
                    />
                  </div>
                </div>
              </div>

              {pedCalc ? (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 space-y-3 animate-in fade-in-50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-background border border-border">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Volumen por Toma:
                      </span>
                      <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                        {pedCalc.mlPorToma} <span className="text-xs">ml</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        cada {24 / frecuenciaPed} horas
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Dosis por Toma:
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {pedCalc.mgPorToma} <span className="text-xs">mg</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Total día: {pedCalc.mgTotalDia} mg
                      </span>
                    </div>

                    {pedCalc.bsa && (
                      <div className="p-3 rounded-lg bg-background border border-border">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          Superficie Corporal:
                        </span>
                        <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                          {pedCalc.bsa} <span className="text-xs">m²</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Mosteller
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 dark:border-amber-900/60">
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[340px]">
                      {pedCalc.resumenTexto}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleInsertar(pedCalc.resumenTexto)}
                      className="gap-1.5 text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Copiar / Insertar</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Ingrese el peso del paciente y la dosis deseada para calcular la dosis pediátrica.
                </div>
              )}
            </TabsContent>

            {/* TAB 3: HEMODINÁMICA */}
            <TabsContent value="hemodinamica" className="space-y-4 pt-1">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-red-200/60 dark:border-red-950/60 bg-red-50/30 dark:bg-red-950/20">
                <div>
                  <Label className="text-xs text-muted-foreground">Sistólica (PAS)</Label>
                  <Input
                    type="number"
                    value={pas}
                    onChange={(e) => setPas(e.target.value)}
                    placeholder="120"
                    className="h-9 mt-1 font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Diastólica (PAD)</Label>
                  <Input
                    type="number"
                    value={pad}
                    onChange={(e) => setPad(e.target.value)}
                    placeholder="80"
                    className="h-9 mt-1 font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">FC (lpm)</Label>
                  <Input
                    type="number"
                    value={fc}
                    onChange={(e) => setFc(e.target.value)}
                    placeholder="75"
                    className="h-9 mt-1"
                  />
                </div>
              </div>

              {cardioCalc ? (
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 animate-in fade-in-50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-background border border-border">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Presión Arterial Media (PAM):
                      </span>
                      <span className="text-2xl font-extrabold text-foreground">
                        {cardioCalc.pam}{' '}
                        <span className="text-xs font-normal text-muted-foreground">mmHg</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Fórmula: (2×PAD + PAS) / 3
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Presión de Pulso (PP):
                      </span>
                      <span className="text-xl font-bold text-foreground">
                        {cardioCalc.pp}{' '}
                        <span className="text-xs font-normal text-muted-foreground">mmHg</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        PAS - PAD (Rigidez arterial)
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Clasificación AHA/ACC:
                      </span>
                      <span
                        className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-bold border mt-1 ${cardioCalc.clasColor}`}
                      >
                        {cardioCalc.clasificacion}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-background border border-border text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">Perfusión Orgánica Estimada:</span>
                    <strong className="text-foreground font-semibold">
                      {cardioCalc.perfusionStatus}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[340px]">
                      {cardioCalc.resumenTexto}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleInsertar(cardioCalc.resumenTexto)}
                      className="gap-1.5 text-xs h-8 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Insertar en Evaluación</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Ingrese las presiones sistólica y diastólica para calcular la PAM y clasificar la tensión arterial.
                </div>
              )}
            </TabsContent>

            {/* TAB 4: IMC & BSA */}
            <TabsContent value="antropometria" className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-teal-200/60 dark:border-teal-950/60 bg-teal-50/30 dark:bg-teal-950/20">
                <div>
                  <Label className="text-xs text-muted-foreground">Peso (kg) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={pesoAntro}
                    onChange={(e) => setPesoAntro(e.target.value)}
                    placeholder="Ej. 70"
                    className="h-9 mt-1 font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Talla / Estatura (cm) *</Label>
                  <Input
                    type="number"
                    value={tallaAntro}
                    onChange={(e) => setTallaAntro(e.target.value)}
                    placeholder="Ej. 170"
                    className="h-9 mt-1 font-semibold"
                  />
                </div>
              </div>

              {antroCalc ? (
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 animate-in fade-in-50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-background border border-border">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Índice Masa Corporal (IMC):
                      </span>
                      <span className="text-2xl font-extrabold text-foreground">
                        {antroCalc.imc}{' '}
                        <span className="text-xs font-normal text-muted-foreground">kg/m²</span>
                      </span>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border mt-1 ${antroCalc.catColor}`}
                      >
                        {antroCalc.cat}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Rango de Peso Ideal:
                      </span>
                      <span className="text-base font-bold text-foreground">
                        {antroCalc.pesoMinIdeal} - {antroCalc.pesoMaxIdeal}{' '}
                        <span className="text-xs font-normal text-muted-foreground">kg</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Para IMC saludable (18.5 - 24.9)
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Superficie Corporal (BSA):
                      </span>
                      <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                        {antroCalc.bsa}{' '}
                        <span className="text-xs font-normal text-muted-foreground">m²</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Mosteller formula
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[340px]">
                      {antroCalc.resumenTexto}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleInsertar(antroCalc.resumenTexto)}
                      className="gap-1.5 text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Insertar en Evaluación</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Ingrese el peso y la talla para obtener el informe antropométrico completo.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalculadorasClinicasModal;
