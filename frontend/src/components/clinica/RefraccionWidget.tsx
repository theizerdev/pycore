import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import {
  Eye,
  Glasses,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Sparkles,
  Baby,
  Layers,
  Droplet,
  Info,
  ArrowRight,
  ShieldAlert,
  Compass,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';

export interface RefraccionData {
  // --- BLOQUE A: AGUDEZA VISUAL ---
  // Modalidad Tamiz Neonatal / Pediátrico
  tamiz_activo?: boolean;
  // Conducta visual (si tamiz_activo = true)
  reaccion_luz_od?: string; // Presente · Ausente · Dudosa
  reaccion_luz_oi?: string;
  fijacion_seguimiento_od?: string; // Fija y sigue · Fija sin seguir · No fija ni sigue
  fijacion_seguimiento_oi?: string;
  fijacion_seguimiento_bin?: string;
  rechazo_oclusion?: string; // Simétrico · Rechaza la oclusión de OD · Rechaza la oclusión de OI · No valorable
  reflejo_bruckner?: string; // Presente y simétrico · Asimétrico · Ausente
  reflejo_hirschberg?: string; // Centrado · Descentrado
  reflejo_hirschberg_detalle?: string;

  // Agudeza visual estándar (4 campos por ojo y binocular, lejos y cerca)
  agudeza_od_sc?: string; // Sin corrección (ojo desnudo)
  agudeza_od_cc?: string; // Con corrección actual
  agudeza_od_ph?: string; // Con estenopeico
  agudeza_od_mavc?: string; // Mejor agudeza visual corregida
  agudeza_od_cerca?: string; // Cerca (Jaeger / Snellen equivalente)

  agudeza_oi_sc?: string;
  agudeza_oi_cc?: string;
  agudeza_oi_ph?: string;
  agudeza_oi_mavc?: string;
  agudeza_oi_cerca?: string;

  agudeza_bin_sc?: string;
  agudeza_bin_cc?: string;
  agudeza_bin_mavc?: string;
  agudeza_bin_cerca?: string;

  // --- BLOQUE B: REFRACCIÓN OBJETIVA ---
  // 1. Sin cicloplejía
  obj_sin_ciclo_metodo?: string; // Retinoscopía · Autorrefractoqueratometría · Ambos
  obj_esfera_od?: string;
  obj_cilindro_od?: string;
  obj_eje_od?: string;
  obj_esfera_oi?: string;
  obj_cilindro_oi?: string;
  obj_eje_oi?: string;

  // 2. Bajo cicloplejía
  cicloplejia_aplicada?: boolean;
  obj_con_ciclo_farmaco?: string;
  obj_con_ciclo_metodo?: string; // Retinoscopía · Autorrefractoqueratometría · Ambos
  obj_ciclo_esfera_od?: string;
  obj_ciclo_cilindro_od?: string;
  obj_ciclo_eje_od?: string;
  obj_ciclo_esfera_oi?: string;
  obj_ciclo_cilindro_oi?: string;
  obj_ciclo_eje_oi?: string;

  // 3. Queratometría
  queratometria_metodo?: string; // Autorrefractoqueratometría · Topografía · Ambos
  k1_od?: string | number;
  k2_od?: string | number;
  eje_k_od?: string | number;
  k1_oi?: string | number;
  k2_oi?: string | number;
  eje_k_oi?: string | number;

  // --- BLOQUE C: REFRACCIÓN SUBJETIVA & PRESCRIPCIÓN ---
  // 1. Subjetiva
  esfera_od?: string;
  cilindro_od?: string;
  eje_od?: string;
  adicion_od?: string;
  esfera_oi?: string;
  cilindro_oi?: string;
  eje_oi?: string;
  adicion_oi?: string;

  // 2. Cascada de copiado
  copiar_subjetiva_a_tolerada?: boolean; // true por omisión
  copiar_tolerada_a_prescrita?: boolean; // true por omisión
  igual_al_od?: boolean; // ametropías simétricas

  // 3. Tolerada
  tol_esfera_od?: string;
  tol_cilindro_od?: string;
  tol_eje_od?: string;
  tol_adicion_od?: string;
  tol_esfera_oi?: string;
  tol_cilindro_oi?: string;
  tol_eje_oi?: string;
  tol_adicion_oi?: string;

  // 4. Prescrita Final
  rx_esfera_od?: string;
  rx_cilindro_od?: string;
  rx_eje_od?: string;
  rx_adicion_od?: string;
  rx_esfera_oi?: string;
  rx_cilindro_oi?: string;
  rx_eje_oi?: string;
  rx_adicion_oi?: string;

  // 5. Motivo de divergencia (si prescrita difiere de subjetiva)
  motivo_divergencia?: string; // Intolerancia al cilindro · Ajuste por adaptación previa · Ametropía no corregida en su totalidad · Otro
  motivo_divergencia_detalle?: string;

  // 6. Parámetros de Óptica & Fabricación
  distancia_pupilar?: string; // DP Lejos
  distancia_pupilar_cerca?: string; // DP Cerca
  tipo_lente?: string;
  material_filtro?: string;
  uso_lente?: string;

  // --- TONOMETRÍA & PAQUIMETRÍA ---
  pio_od?: string | number;
  pio_oi?: string | number;
  metodo_tonometria?: string;
  paquimetria_od?: string | number; // micras
  paquimetria_oi?: string | number;
  relacion_excavacion_disco_od?: string | number;
  relacion_excavacion_disco_oi?: string | number;

  // Observaciones
  observaciones_refraccion?: string;
}

interface RefraccionWidgetProps {
  initialData?: RefraccionData;
  onChange?: (data: RefraccionData) => void;
  onOpenInstilacionModal?: () => void;
  readOnly?: boolean;
}

const OPCIONES_SNELLEN = [
  '20/15 (1.33)',
  '20/20 (1.00 - Normal)',
  '20/25 (0.80)',
  '20/30 (0.67)',
  '20/40 (0.50)',
  '20/50 (0.40)',
  '20/60 (0.33)',
  '20/70 (0.28)',
  '20/80 (0.25)',
  '20/100 (0.20)',
  '20/150 (0.13)',
  '20/200 (0.10)',
  '20/400 (0.05)',
  'Cuenta Dedos (CD)',
  'Movimiento de Manos (MM)',
  'Percepción de Luz (PL)',
  'No Percepción de Luz (NPL)',
];

const OPCIONES_CERCA = [
  'J1+ (20/20)',
  'J1 (20/25)',
  'J2 (20/30)',
  'J3 (20/40)',
  'J4 (20/50)',
  'J5 (20/60)',
  'J7 (20/80)',
  'J10 (20/100)',
  'J14 (20/200)',
];

const TIPOS_LENTE = [
  'Monofocal (Visión Lejana)',
  'Monofocal (Visión Cercana)',
  'Bifocal con Película (Kryptok / Flattop)',
  'Bifocal Invisible (Ultex)',
  'Progresivo / Multifocal Digital HD',
  'Ocupacional / De Oficina',
  'Lentes de Contacto Blandos',
  'Lentes de Contacto Rígidos Gas Permeables (RGP)',
  'Lentes de Contacto Esclerales',
];

const MATERIALES_FILTROS = [
  'Orgánico Estándar (CR-39)',
  'Policarbonato (Alto Impacto)',
  'Trivex (Alto Impacto y Calidad Óptica)',
  'Alto Índice 1.60 / 1.67 (Delgado)',
  'Ultra Alto Índice 1.74 (Extra Delgado)',
  'Antirreflejo Multicapa Hidrofóbico (AR)',
  'Filtro Luz Azul (Blue Defense / Pantallas)',
  'Fotocromático (Transitions Signature)',
  'Fotocromático + Filtro Luz Azul',
  'Polarizado UV400',
];

const USOS_LENTE = [
  'Uso permanente (Lejos y Cerca)',
  'Uso exclusivo para visión lejana (Conducir / TV)',
  'Uso exclusivo para lectura / visión próxima',
  'Uso ocupacional / pantallas de computadora',
  'Uso deportivo / protección',
];

const MOTIVOS_DIVERGENCIA = [
  'Intolerancia al cilindro',
  'Ajuste por adaptación previa',
  'Ametropía no corregida en su totalidad',
  'Otro',
];

export const RefraccionWidget: React.FC<RefraccionWidgetProps> = ({
  initialData,
  onChange,
  onOpenInstilacionModal,
  readOnly = false,
}) => {
  const [data, setData] = useState<RefraccionData>(() => ({
    copiar_subjetiva_a_tolerada: true,
    copiar_tolerada_a_prescrita: true,
    ...(initialData || {}),
  }));

  const [activeTab, setActiveTab] = useState<'adulto' | 'tamiz'>(
    initialData?.tamiz_activo ? 'tamiz' : 'adulto'
  );

  const [dialogOpenPediatrico, setDialogOpenPediatrico] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  // Actualización con cascada inteligente
  const updateField = (field: keyof RefraccionData, value: any) => {
    if (readOnly) return;
    setData((prev) => {
      let updated: RefraccionData = { ...prev, [field]: value };

      // Si se activa/desactiva "igual_al_od"
      if (field === 'igual_al_od' && value === true) {
        updated.esfera_oi = updated.esfera_od;
        updated.cilindro_oi = updated.cilindro_od;
        updated.eje_oi = updated.eje_od;
        updated.adicion_oi = updated.adicion_od;
      }

      // Propagación de OD a OI si ametropía simétrica está activa
      if (updated.igual_al_od && ['esfera_od', 'cilindro_od', 'eje_od', 'adicion_od'].includes(field)) {
        if (field === 'esfera_od') updated.esfera_oi = value;
        if (field === 'cilindro_od') updated.cilindro_oi = value;
        if (field === 'eje_od') updated.eje_oi = value;
        if (field === 'adicion_od') updated.adicion_oi = value;
      }

      // Cascada 1: Subjetiva -> Tolerada (si copiar_subjetiva_a_tolerada = true)
      const subFields = ['esfera_od', 'cilindro_od', 'eje_od', 'adicion_od', 'esfera_oi', 'cilindro_oi', 'eje_oi', 'adicion_oi'];
      if (updated.copiar_subjetiva_a_tolerada !== false && (subFields.includes(field) || field === 'copiar_subjetiva_a_tolerada' || field === 'igual_al_od')) {
        updated.tol_esfera_od = updated.esfera_od;
        updated.tol_cilindro_od = updated.cilindro_od;
        updated.tol_eje_od = updated.eje_od;
        updated.tol_adicion_od = updated.adicion_od;
        updated.tol_esfera_oi = updated.esfera_oi;
        updated.tol_cilindro_oi = updated.cilindro_oi;
        updated.tol_eje_oi = updated.eje_oi;
        updated.tol_adicion_oi = updated.adicion_oi;
      }

      // Cascada 2: Tolerada -> Prescrita (si copiar_tolerada_a_prescrita = true)
      const tolFields = ['tol_esfera_od', 'tol_cilindro_od', 'tol_eje_od', 'tol_adicion_od', 'tol_esfera_oi', 'tol_cilindro_oi', 'tol_eje_oi', 'tol_adicion_oi'];
      if (updated.copiar_tolerada_a_prescrita !== false && (tolFields.includes(field) || subFields.includes(field) || field === 'copiar_tolerada_a_prescrita' || field === 'igual_al_od')) {
        updated.rx_esfera_od = updated.tol_esfera_od ?? updated.esfera_od;
        updated.rx_cilindro_od = updated.tol_cilindro_od ?? updated.cilindro_od;
        updated.rx_eje_od = updated.tol_eje_od ?? updated.eje_od;
        updated.rx_adicion_od = updated.tol_adicion_od ?? updated.adicion_od;
        updated.rx_esfera_oi = updated.tol_esfera_oi ?? updated.esfera_oi;
        updated.rx_cilindro_oi = updated.tol_cilindro_oi ?? updated.cilindro_oi;
        updated.rx_eje_oi = updated.tol_eje_oi ?? updated.eje_oi;
        updated.rx_adicion_oi = updated.tol_adicion_oi ?? updated.adicion_oi;
      }

      if (onChange) {
        onChange(updated);
      }
      return updated;
    });
  };

  // Detección de divergencia entre subjetiva y prescrita final
  const isDivergente = useMemo(() => {
    const rxOd = `${data.rx_esfera_od || ''}|${data.rx_cilindro_od || ''}|${data.rx_eje_od || ''}|${data.rx_adicion_od || ''}`;
    const subOd = `${data.esfera_od || ''}|${data.cilindro_od || ''}|${data.eje_od || ''}|${data.adicion_od || ''}`;
    const rxOi = `${data.rx_esfera_oi || ''}|${data.rx_cilindro_oi || ''}|${data.rx_eje_oi || ''}|${data.rx_adicion_oi || ''}`;
    const subOi = `${data.esfera_oi || ''}|${data.cilindro_oi || ''}|${data.eje_oi || ''}|${data.adicion_oi || ''}`;

    const hasSubValues = !!(data.esfera_od || data.cilindro_od || data.esfera_oi || data.cilindro_oi);
    return hasSubValues && (rxOd !== subOd || rxOi !== subOi);
  }, [data]);

  // Rangos de referencia de acuerdo a Sección 7 de especificación Anexo 14
  // 1. PIO: 10 - 21 mmHg (asimetría > 4 mmHg)
  const pioOdNum = data.pio_od !== undefined && data.pio_od !== '' ? Number(data.pio_od) : null;
  const pioOiNum = data.pio_oi !== undefined && data.pio_oi !== '' ? Number(data.pio_oi) : null;
  const pioOdFueraRango = pioOdNum !== null && (pioOdNum < 10 || pioOdNum > 21);
  const pioOiFueraRango = pioOiNum !== null && (pioOiNum < 10 || pioOiNum > 21);
  const pioAsimetria = pioOdNum !== null && pioOiNum !== null && Math.abs(pioOdNum - pioOiNum) > 4;

  // 2. Paquimetría central: 520 - 580 µm
  const paqOdNum = data.paquimetria_od ? Number(data.paquimetria_od) : null;
  const paqOiNum = data.paquimetria_oi ? Number(data.paquimetria_oi) : null;
  const paqOdFueraRango = paqOdNum !== null && (paqOdNum < 520 || paqOdNum > 580);
  const paqOiFueraRango = paqOiNum !== null && (paqOiNum < 520 || paqOiNum > 580);

  // 3. Relación Excavación / Disco: hasta 0.5 (asimetría > 0.2)
  const cdOdNum = data.relacion_excavacion_disco_od ? Number(data.relacion_excavacion_disco_od) : null;
  const cdOiNum = data.relacion_excavacion_disco_oi ? Number(data.relacion_excavacion_disco_oi) : null;
  const cdOdFueraRango = cdOdNum !== null && cdOdNum > 0.5;
  const cdOiFueraRango = cdOiNum !== null && cdOiNum > 0.5;
  const cdAsimetria = cdOdNum !== null && cdOiNum !== null && Math.abs(cdOdNum - cdOiNum) > 0.2;

  // 4. Queratometría: 40 a 47 D (astigmatismo corneal > 3 D)
  const k1Od = data.k1_od ? Number(data.k1_od) : null;
  const k2Od = data.k2_od ? Number(data.k2_od) : null;
  const astigOd = k1Od !== null && k2Od !== null ? Math.abs(k1Od - k2Od) : null;
  const kOdFueraRango = (k1Od !== null && (k1Od < 40 || k1Od > 47)) || (k2Od !== null && (k2Od < 40 || k2Od > 47));
  const astigOdAlto = astigOd !== null && astigOd > 3;

  const k1Oi = data.k1_oi ? Number(data.k1_oi) : null;
  const k2Oi = data.k2_oi ? Number(data.k2_oi) : null;
  const astigOi = k1Oi !== null && k2Oi !== null ? Math.abs(k1Oi - k2Oi) : null;
  const kOiFueraRango = (k1Oi !== null && (k1Oi < 40 || k1Oi > 47)) || (k2Oi !== null && (k2Oi < 40 || k2Oi > 47));
  const astigOiAlto = astigOi !== null && astigOi > 3;

  // Copiar receta formal completa al portapapeles
  const handleCopiarFormula = () => {
    const rxOd = `OD: Esf ${data.rx_esfera_od || data.esfera_od || 'Plano'} | Cil ${data.rx_cilindro_od || data.cilindro_od || '0.00'} | Eje ${data.rx_eje_od || data.eje_od || '0'}° | Add ${data.rx_adicion_od || data.adicion_od || '+0.00'}`;
    const rxOi = `OI: Esf ${data.rx_esfera_oi || data.esfera_oi || 'Plano'} | Cil ${data.rx_cilindro_oi || data.cilindro_oi || '0.00'} | Eje ${data.rx_eje_oi || data.eje_oi || '0'}° | Add ${data.rx_adicion_oi || data.adicion_oi || '+0.00'}`;
    
    const texto = `=== PRESCRIPCIÓN ÓPTICA OFTALMOLÓGICA ===
${rxOd}
${rxOi}
• Distancia Pupilar (DP Lejos): ${data.distancia_pupilar || '62'} mm | DP Cerca: ${data.distancia_pupilar_cerca || '59'} mm
• Tipo de Lente: ${data.tipo_lente || 'Monofocal'}
• Material / Filtro: ${data.material_filtro || 'Antirreflejo Multicapa'}
• Indicación de Uso: ${data.uso_lente || 'Uso permanente'}
${data.motivo_divergencia ? `• Ajuste Clínico: ${data.motivo_divergencia} ${data.motivo_divergencia_detalle ? `(${data.motivo_divergencia_detalle})` : ''}` : ''}`;

    navigator.clipboard.writeText(texto);
    toast.success('Prescripción óptica copiada al portapapeles');
  };

  // Carga rápida de emétrope
  const handlePresetsEmétrope = () => {
    if (readOnly) return;
    const next: RefraccionData = {
      ...data,
      agudeza_od_sc: '20/20 (1.00 - Normal)',
      agudeza_oi_sc: '20/20 (1.00 - Normal)',
      agudeza_bin_sc: '20/20 (1.00 - Normal)',
      agudeza_od_mavc: '20/20 (1.00 - Normal)',
      agudeza_oi_mavc: '20/20 (1.00 - Normal)',
      agudeza_bin_mavc: '20/20 (1.00 - Normal)',
      esfera_od: 'Plano',
      cilindro_od: '0.00',
      eje_od: '0',
      adicion_od: '+0.00',
      esfera_oi: 'Plano',
      cilindro_oi: '0.00',
      eje_oi: '0',
      adicion_oi: '+0.00',
      tol_esfera_od: 'Plano',
      tol_cilindro_od: '0.00',
      tol_eje_od: '0',
      tol_adicion_od: '+0.00',
      tol_esfera_oi: 'Plano',
      tol_cilindro_oi: '0.00',
      tol_eje_oi: '0',
      tol_adicion_oi: '+0.00',
      rx_esfera_od: 'Plano',
      rx_cilindro_od: '0.00',
      rx_eje_od: '0',
      rx_adicion_od: '+0.00',
      rx_esfera_oi: 'Plano',
      rx_cilindro_oi: '0.00',
      rx_eje_oi: '0',
      rx_adicion_oi: '+0.00',
      distancia_pupilar: '62',
      distancia_pupilar_cerca: '59',
      pio_od: 15,
      pio_oi: 15,
      metodo_tonometria: 'Tonómetro de Goldman (Aplanación)',
    };
    setData(next);
    if (onChange) onChange(next);
    toast.success('Valores de emetropía y agudeza 20/20 cargados');
  };

  return (
    <Card className="border-border/80 shadow-xs bg-card/70 backdrop-blur-xs">
      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Cabecera Principal del Módulo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Eye className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Paso 2 — Función Visual y Refracción
                </h3>
                <Badge variant="outline" className="text-[10px] font-semibold bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300">
                  Normativa NOM-004 / Oftalmología
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluación funcional (Bloque A), refracción objetiva (Bloque B) y prescripción clínica en cascada (Bloque C)
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Modal de Umbrales Pediátricos AAO */}
            <Dialog open={dialogOpenPediatrico} onOpenChange={setDialogOpenPediatrico}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 cursor-pointer text-amber-700 dark:text-amber-400 border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <FileSpreadsheet className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Umbrales AAO (&lt; 4 años)</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                    <Baby className="size-4 text-amber-600" />
                    Tabla de Consulta: Umbrales de Corrección Refractiva Pediátrica (&lt; 4 años)
                  </DialogTitle>
                </DialogHeader>
                <div className="text-xs text-muted-foreground space-y-3 pt-2">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/80 flex items-start gap-2">
                    <Info className="size-4 text-sky-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Fuente de consenso: <em>American Academy of Ophthalmology (AAO) Pediatric Eye Evaluations PPP</em>. 
                      Esta tabla se presenta como consulta clínica de apoyo. El sistema no bloquea ni juzga las decisiones del especialista.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border/80">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 font-semibold border-b border-border/70 text-muted-foreground">
                        <tr>
                          <th className="p-2.5 text-left">Condición Clínica</th>
                          <th className="p-2.5 text-center">&lt; 1 año</th>
                          <th className="p-2.5 text-center">1 a &lt; 2 años</th>
                          <th className="p-2.5 text-center">2 a &lt; 3 años</th>
                          <th className="p-2.5 text-center">3 a &lt; 4 años</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        <tr className="bg-sky-500/5 font-semibold text-sky-700 dark:text-sky-300">
                          <td colSpan={5} className="p-2 text-[11px] uppercase tracking-wider">
                            ISOAMETROPÍA — Error refractivo similar en ambos ojos
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Miopía</td>
                          <td className="p-2 text-center font-mono">≥ 5.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 4.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 3.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 2.50 D</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Hipermetropía sin desviación manifiesta</td>
                          <td className="p-2 text-center font-mono">≥ 6.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 5.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 4.50 D</td>
                          <td className="p-2 text-center font-mono">≥ 3.50 D</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Hipermetropía con endotropia</td>
                          <td className="p-2 text-center font-mono">≥ 2.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 2.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 1.50 D</td>
                          <td className="p-2 text-center font-mono">≥ 1.50 D</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Astigmatismo</td>
                          <td className="p-2 text-center font-mono">≥ 3.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 2.50 D</td>
                          <td className="p-2 text-center font-mono">≥ 2.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 1.50 D</td>
                        </tr>

                        <tr className="bg-amber-500/5 font-semibold text-amber-700 dark:text-amber-300">
                          <td colSpan={5} className="p-2 text-[11px] uppercase tracking-wider">
                            ANISOMETROPÍA — Diferencia entre ambos ojos, sin estrabismo
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Miopía</td>
                          <td className="p-2 text-center font-mono">≥ 4.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 3.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 3.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 2.50 D</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Hipermetropía</td>
                          <td className="p-2 text-center font-mono">≥ 2.50 D</td>
                          <td className="p-2 text-center font-mono">≥ 2.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 1.50 D</td>
                          <td className="p-2 text-center font-mono">≥ 1.50 D</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Astigmatismo</td>
                          <td className="p-2 text-center font-mono">≥ 2.50 D</td>
                          <td className="p-2 text-center font-mono">≥ 2.00 D</td>
                          <td className="p-2 text-center font-mono">≥ 1.50 D</td>
                          <td className="p-2 text-center font-mono">≥ 1.00 D</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePresetsEmétrope}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Sparkles className="size-3.5 text-sky-500" />
                <span>Cargar Emétrope (20/20)</span>
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopiarFormula}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Copy className="size-3.5 text-primary" />
              <span>Copiar Prescripción</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BLOQUE A · AGUDEZA VISUAL / CONDUCTA VISUAL (TAMIZ)                      */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold">
                A
              </span>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Agudeza Visual (Cuatro Campos Inequívocos)
              </h4>
            </div>

            {/* Selector de modo Estándar vs Conducta Visual (Tamiz) */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`text-[11px] font-medium ${activeTab === 'adulto' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                Adulto / Pediátrico Respondedor
              </span>
              <Switch
                checked={activeTab === 'tamiz'}
                onCheckedChange={(checked) => {
                  const mode = checked ? 'tamiz' : 'adulto';
                  setActiveTab(mode);
                  updateField('tamiz_activo', checked);
                }}
                disabled={readOnly}
              />
              <span className={`text-[11px] font-medium flex items-center gap-1 ${activeTab === 'tamiz' ? 'text-amber-600 font-bold' : 'text-muted-foreground'}`}>
                <Baby className="size-3.5" />
                Tamiz Neonatal / Conducta
              </span>
            </div>
          </div>

          {activeTab === 'adulto' ? (
            /* TABLA DE LOS 4 CAMPOS: SC, CC, PH, MAVC (OD A LA IZQUIERDA, OI A LA DERECHA) */
            <div className="rounded-xl border border-border/80 overflow-x-auto bg-muted/10">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                  <tr>
                    <th className="p-2.5 text-left min-w-[170px]">Condición Visual</th>
                    <th className="p-2.5 text-center w-1/3 bg-sky-500/5 text-sky-700 dark:text-sky-300 border-r border-border/60">
                      Ojo Derecho (OD)
                    </th>
                    <th className="p-2.5 text-center w-1/3 bg-teal-500/5 text-teal-700 dark:text-teal-300 border-r border-border/60">
                      Ojo Izquierdo (OI)
                    </th>
                    <th className="p-2.5 text-center w-1/4">Binocular (AO)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* 1. Sin Corrección (Ojo desnudo) */}
                  <tr className="hover:bg-muted/20">
                    <td className="p-2.5">
                      <div className="font-semibold text-foreground">Sin Corrección (SC)</div>
                      <div className="text-[10px] text-muted-foreground">Ojo desnudo</div>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-sky-500/5">
                      <Select
                        value={data.agudeza_od_sc || ''}
                        onValueChange={(val) => updateField('agudeza_od_sc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OD Lejos..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={opc} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-teal-500/5">
                      <Select
                        value={data.agudeza_oi_sc || ''}
                        onValueChange={(val) => updateField('agudeza_oi_sc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OI Lejos..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={opc} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select
                        value={data.agudeza_bin_sc || ''}
                        onValueChange={(val) => updateField('agudeza_bin_sc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Binocular..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={opc} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>

                  {/* 2. Con Corrección Actual */}
                  <tr className="hover:bg-muted/20">
                    <td className="p-2.5">
                      <div className="font-semibold text-foreground">Con Corrección Actual (CC)</div>
                      <div className="text-[10px] text-muted-foreground">Lentes con que llegó el paciente</div>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-sky-500/5">
                      <Select
                        value={data.agudeza_od_cc || ''}
                        onValueChange={(val) => updateField('agudeza_od_cc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OD Con Lentes..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No usa lentes" className="text-xs italic text-muted-foreground">No usa lentes / Sin datos</SelectItem>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={`cc_od_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-teal-500/5">
                      <Select
                        value={data.agudeza_oi_cc || ''}
                        onValueChange={(val) => updateField('agudeza_oi_cc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OI Con Lentes..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No usa lentes" className="text-xs italic text-muted-foreground">No usa lentes / Sin datos</SelectItem>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={`cc_oi_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select
                        value={data.agudeza_bin_cc || ''}
                        onValueChange={(val) => updateField('agudeza_bin_cc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Binocular CC..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={`cc_bin_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>

                  {/* 3. Con Agujero Estenopeico (PH) */}
                  <tr className="hover:bg-muted/20">
                    <td className="p-2.5">
                      <div className="font-semibold text-foreground">Con Estenopeico (PH)</div>
                      <div className="text-[10px] text-muted-foreground">Tamiz refractivo vs patológico</div>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-sky-500/5">
                      <Select
                        value={data.agudeza_od_ph || ''}
                        onValueChange={(val) => updateField('agudeza_od_ph', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OD Estenopeico..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No aplica" className="text-xs">No aplica (AV ≥ 20/25)</SelectItem>
                          <SelectItem value="No mejora" className="text-xs font-semibold text-amber-600">No mejora</SelectItem>
                          {OPCIONES_SNELLEN.slice(0, 8).map((opc) => (
                            <SelectItem key={`ph_od_${opc}`} value={opc} className="text-xs">Mejora a {opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-teal-500/5">
                      <Select
                        value={data.agudeza_oi_ph || ''}
                        onValueChange={(val) => updateField('agudeza_oi_ph', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OI Estenopeico..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No aplica" className="text-xs">No aplica (AV ≥ 20/25)</SelectItem>
                          <SelectItem value="No mejora" className="text-xs font-semibold text-amber-600">No mejora</SelectItem>
                          {OPCIONES_SNELLEN.slice(0, 8).map((opc) => (
                            <SelectItem key={`ph_oi_${opc}`} value={opc} className="text-xs">Mejora a {opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 text-center text-[11px] text-muted-foreground italic">
                      Monocular (OD / OI)
                    </td>
                  </tr>

                  {/* 4. Mejor Agudeza Visual Corregida (MAVC) */}
                  <tr className="hover:bg-muted/20 bg-primary/5">
                    <td className="p-2.5">
                      <div className="font-bold text-primary">Mejor Agudeza Corregida (MAVC)</div>
                      <div className="text-[10px] text-muted-foreground">Con refracción del día (Bloque C)</div>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-sky-500/10">
                      <Select
                        value={data.agudeza_od_mavc || ''}
                        onValueChange={(val) => updateField('agudeza_od_mavc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold">
                          <SelectValue placeholder="OD MAVC..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={`mavc_od_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-teal-500/10">
                      <Select
                        value={data.agudeza_oi_mavc || ''}
                        onValueChange={(val) => updateField('agudeza_oi_mavc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold">
                          <SelectValue placeholder="OI MAVC..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={`mavc_oi_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select
                        value={data.agudeza_bin_mavc || ''}
                        onValueChange={(val) => updateField('agudeza_bin_mavc', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold">
                          <SelectValue placeholder="Binocular MAVC..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_SNELLEN.map((opc) => (
                            <SelectItem key={`mavc_bin_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>

                  {/* Agudeza de Cerca (Lectura / Jaeger) */}
                  <tr className="hover:bg-muted/20">
                    <td className="p-2.5">
                      <div className="font-medium text-foreground">Visión de Cerca (33-40 cm)</div>
                      <div className="text-[10px] text-muted-foreground">Cartilla de Jaeger</div>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-sky-500/5">
                      <Select
                        value={data.agudeza_od_cerca || ''}
                        onValueChange={(val) => updateField('agudeza_od_cerca', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OD Jaeger..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_CERCA.map((opc) => (
                            <SelectItem key={`cerca_od_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 border-r border-border/60 bg-teal-500/5">
                      <Select
                        value={data.agudeza_oi_cerca || ''}
                        onValueChange={(val) => updateField('agudeza_oi_cerca', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OI Jaeger..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_CERCA.map((opc) => (
                            <SelectItem key={`cerca_oi_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select
                        value={data.agudeza_bin_cerca || ''}
                        onValueChange={(val) => updateField('agudeza_bin_cerca', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Binocular Jaeger..." />
                        </SelectTrigger>
                        <SelectContent>
                          {OPCIONES_CERCA.map((opc) => (
                            <SelectItem key={`cerca_bin_${opc}`} value={opc} className="text-xs">{opc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            /* CONDUCTA VISUAL (TAMIZ NEONATAL / PEDIÁTRICO NO RESPONDEDOR) */
            <div className="p-4 rounded-xl border border-amber-300/60 dark:border-amber-900/60 bg-amber-500/5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-950">
                <div className="flex items-center gap-2">
                  <Baby className="size-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-foreground">
                    Instrumentos de Conducta Visual (Sustituto en Tamiz)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40">
                  Respuesta Involuntaria y Reflejos
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Reacción a la Luz */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/70 space-y-2">
                  <Label className="text-[11px] font-semibold text-foreground">Reacción a la Luz</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground">OD:</span>
                      <Select
                        value={data.reaccion_luz_od || 'Presente'}
                        onValueChange={(val) => updateField('reaccion_luz_od', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Presente">Presente</SelectItem>
                          <SelectItem value="Ausente">Ausente</SelectItem>
                          <SelectItem value="Dudosa">Dudosa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">OI:</span>
                      <Select
                        value={data.reaccion_luz_oi || 'Presente'}
                        onValueChange={(val) => updateField('reaccion_luz_oi', val)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Presente">Presente</SelectItem>
                          <SelectItem value="Ausente">Ausente</SelectItem>
                          <SelectItem value="Dudosa">Dudosa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 2. Fijación y Seguimiento */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/70 space-y-2">
                  <Label className="text-[11px] font-semibold text-foreground">Fijación y Seguimiento</Label>
                  <Select
                    value={data.fijacion_seguimiento_bin || 'Fija y sigue'}
                    onValueChange={(val) => updateField('fijacion_seguimiento_bin', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fija y sigue">Fija y sigue (Normal)</SelectItem>
                      <SelectItem value="Fija sin seguir">Fija sin seguir</SelectItem>
                      <SelectItem value="No fija ni sigue">No fija ni sigue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Rechazo a la Oclusión */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/70 space-y-2">
                  <Label className="text-[11px] font-semibold text-foreground">Rechazo a la Oclusión</Label>
                  <Select
                    value={data.rechazo_oclusion || 'Simétrico'}
                    onValueChange={(val) => updateField('rechazo_oclusion', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Simétrico">Simétrico (Normal)</SelectItem>
                      <SelectItem value="Rechaza la oclusión de OD">Rechaza oclusión de OD</SelectItem>
                      <SelectItem value="Rechaza la oclusión de OI">Rechaza oclusión de OI</SelectItem>
                      <SelectItem value="No valorable">No valorable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Reflejo Rojo de Brückner */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/70 space-y-2">
                  <Label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                    <span>Reflejo Rojo de Brückner</span>
                    {data.reflejo_bruckner && data.reflejo_bruckner !== 'Presente y simétrico' && (
                      <Badge variant="destructive" className="text-[9px] h-4">¡Alarma!</Badge>
                    )}
                  </Label>
                  <Select
                    value={data.reflejo_bruckner || 'Presente y simétrico'}
                    onValueChange={(val) => updateField('reflejo_bruckner', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Presente y simétrico">Presente y simétrico</SelectItem>
                      <SelectItem value="Asimétrico">Asimétrico</SelectItem>
                      <SelectItem value="Ausente">Ausente (Leucocoria)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Reflejo Corneal de Hirschberg */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/70 space-y-2 lg:col-span-2">
                  <Label className="text-[11px] font-semibold text-foreground">Reflejo Corneal de Hirschberg</Label>
                  <div className="flex gap-2">
                    <Select
                      value={data.reflejo_hirschberg || 'Centrado'}
                      onValueChange={(val) => updateField('reflejo_hirschberg', val)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Centrado">Centrado (Ortotropia)</SelectItem>
                        <SelectItem value="Descentrado">Descentrado</SelectItem>
                      </SelectContent>
                    </Select>
                    {data.reflejo_hirschberg === 'Descentrado' && (
                      <Input
                        type="text"
                        placeholder="Dirección y magnitud estimada (ej. Endotropia 15° OD)..."
                        value={data.reflejo_hirschberg_detalle || ''}
                        onChange={(e) => updateField('reflejo_hirschberg_detalle', e.target.value)}
                        disabled={readOnly}
                        className="h-7 text-xs flex-1"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BLOQUE B · REFRACCIÓN OBJETIVA Y QUERATOMETRÍA                            */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center size-5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold">
              B
            </span>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Refracción Objetiva (Dos Mediciones Independientes) & Queratometría
            </h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Medición Sin Cicloplejía */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Compass className="size-3.5 text-primary" />
                  1. Refracción Sin Cicloplejía
                </span>
                <div className="flex items-center gap-1">
                  <Label className="text-[10px] text-muted-foreground">Método:</Label>
                  <Select
                    value={data.obj_sin_ciclo_metodo || 'Autorrefractoqueratometría'}
                    onValueChange={(val) => updateField('obj_sin_ciclo_metodo', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-6 text-[10px] px-2 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Retinoscopía" className="text-xs">Retinoscopía</SelectItem>
                      <SelectItem value="Autorrefractoqueratometría" className="text-xs">Autorrefractómetro</SelectItem>
                      <SelectItem value="Ambos" className="text-xs">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* OD */}
                <div className="space-y-1.5 p-2 rounded-lg bg-sky-500/5 border border-sky-200/50 dark:border-sky-900/50">
                  <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">Ojo Derecho (OD)</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Esfera</Label>
                      <Input
                        type="text"
                        placeholder="Esf"
                        value={data.obj_esfera_od || ''}
                        onChange={(e) => updateField('obj_esfera_od', e.target.value)}
                        disabled={readOnly}
                        className="h-7 text-xs font-mono px-1.5 text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Cilindro</Label>
                      <Input
                        type="text"
                        placeholder="Cil"
                        value={data.obj_cilindro_od || ''}
                        onChange={(e) => updateField('obj_cilindro_od', e.target.value)}
                        disabled={readOnly}
                        className="h-7 text-xs font-mono px-1.5 text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Eje</Label>
                      <Input
                        type="number"
                        placeholder="°"
                        min={0}
                        max={180}
                        value={data.obj_eje_od || ''}
                        onChange={(e) => updateField('obj_eje_od', e.target.value)}
                        disabled={readOnly}
                        className="h-7 text-xs font-mono px-1.5 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* OI */}
                <div className="space-y-1.5 p-2 rounded-lg bg-teal-500/5 border border-teal-200/50 dark:border-teal-900/50">
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">Ojo Izquierdo (OI)</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Esfera</Label>
                      <Input
                        type="text"
                        placeholder="Esf"
                        value={data.obj_esfera_oi || ''}
                        onChange={(e) => updateField('obj_esfera_oi', e.target.value)}
                        disabled={readOnly}
                        className="h-7 text-xs font-mono px-1.5 text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Cilindro</Label>
                      <Input
                        type="text"
                        placeholder="Cil"
                        value={data.obj_cilindro_oi || ''}
                        onChange={(e) => updateField('obj_cilindro_oi', e.target.value)}
                        disabled={readOnly}
                        className="h-7 text-xs font-mono px-1.5 text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Eje</Label>
                      <Input
                        type="number"
                        placeholder="°"
                        min={0}
                        max={180}
                        value={data.obj_eje_oi || ''}
                        onChange={(e) => updateField('obj_eje_oi', e.target.value)}
                        disabled={readOnly}
                        className="h-7 text-xs font-mono px-1.5 text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Medición Bajo Cicloplejía (Habilitada por instilación de gotas) */}
            <div className={`p-3.5 rounded-xl border transition-all ${data.cicloplejia_aplicada ? 'border-indigo-300/80 dark:border-indigo-800 bg-indigo-500/5' : 'border-border/60 bg-muted/10 opacity-80'}`}>
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Droplet className={`size-3.5 ${data.cicloplejia_aplicada ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-bold text-foreground">2. Bajo Cicloplejía</span>
                </div>
                <div className="flex items-center gap-2">
                  {onOpenInstilacionModal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenInstilacionModal}
                      className="h-6 text-[10px] gap-1 px-2 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                    >
                      <Droplet className="size-2.5" />
                      <span>Registro / Temporizador</span>
                    </Button>
                  )}
                  <Label htmlFor="ciclo_toggle" className="text-[10px] cursor-pointer text-muted-foreground">
                    Gotas aplicadas:
                  </Label>
                  <Switch
                    id="ciclo_toggle"
                    checked={!!data.cicloplejia_aplicada}
                    onCheckedChange={(val) => updateField('cicloplejia_aplicada', val)}
                    disabled={readOnly}
                  />
                </div>
              </div>

              {data.cicloplejia_aplicada ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Fármaco (ej. Ciclopentolato 1% - 3 gotas)..."
                        value={data.obj_con_ciclo_farmaco || ''}
                        onChange={(e) => updateField('obj_con_ciclo_farmaco', e.target.value)}
                        disabled={readOnly}
                        className="h-6 text-[10px]"
                      />
                    </div>
                    <Select
                      value={data.obj_con_ciclo_metodo || 'Retinoscopía'}
                      onValueChange={(val) => updateField('obj_con_ciclo_metodo', val)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-6 text-[10px] px-2 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Retinoscopía" className="text-xs">Retinoscopía</SelectItem>
                        <SelectItem value="Autorrefractoqueratometría" className="text-xs">Autorrefractómetro</SelectItem>
                        <SelectItem value="Ambos" className="text-xs">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* OD Ciclo */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-sky-500/5 border border-sky-200/50 dark:border-sky-900/50">
                      <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">OD Ciclopléjica</span>
                      <div className="grid grid-cols-3 gap-1">
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Esfera</Label>
                          <Input
                            type="text"
                            placeholder="Esf"
                            value={data.obj_ciclo_esfera_od || ''}
                            onChange={(e) => updateField('obj_ciclo_esfera_od', e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs font-mono px-1.5 text-center"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Cilindro</Label>
                          <Input
                            type="text"
                            placeholder="Cil"
                            value={data.obj_ciclo_cilindro_od || ''}
                            onChange={(e) => updateField('obj_ciclo_cilindro_od', e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs font-mono px-1.5 text-center"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Eje</Label>
                          <Input
                            type="number"
                            placeholder="°"
                            min={0}
                            max={180}
                            value={data.obj_ciclo_eje_od || ''}
                            onChange={(e) => updateField('obj_ciclo_eje_od', e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs font-mono px-1.5 text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* OI Ciclo */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-teal-500/5 border border-teal-200/50 dark:border-teal-900/50">
                      <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">OI Ciclopléjica</span>
                      <div className="grid grid-cols-3 gap-1">
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Esfera</Label>
                          <Input
                            type="text"
                            placeholder="Esf"
                            value={data.obj_ciclo_esfera_oi || ''}
                            onChange={(e) => updateField('obj_ciclo_esfera_oi', e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs font-mono px-1.5 text-center"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Cilindro</Label>
                          <Input
                            type="text"
                            placeholder="Cil"
                            value={data.obj_ciclo_cilindro_oi || ''}
                            onChange={(e) => updateField('obj_ciclo_cilindro_oi', e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs font-mono px-1.5 text-center"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Eje</Label>
                          <Input
                            type="number"
                            placeholder="°"
                            min={0}
                            max={180}
                            value={data.obj_ciclo_eje_oi || ''}
                            onChange={(e) => updateField('obj_ciclo_eje_oi', e.target.value)}
                            disabled={readOnly}
                            className="h-7 text-xs font-mono px-1.5 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-5 text-center text-xs text-muted-foreground">
                  Active el interruptor al instilar ciclopléjico para registrar refracción bajo cicloplejía.
                </div>
              )}
            </div>
          </div>

          {/* 3. Queratometría (K1, K2 y Eje por ojo) */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Activity className="size-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">3. Queratometría Corneal</span>
                <span className="text-[11px] text-muted-foreground">
                  (Rango fisiológico: 40 a 47 D | Astigmatismo &gt; 3 D se resalta)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-[10px] text-muted-foreground">Método:</Label>
                <Select
                  value={data.queratometria_metodo || 'Autorrefractoqueratometría'}
                  onValueChange={(val) => updateField('queratometria_metodo', val)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-6 text-[10px] px-2 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Autorrefractoqueratometría" className="text-xs">Autorrefractómetro</SelectItem>
                    <SelectItem value="Topografía" className="text-xs">Topografía Corneal</SelectItem>
                    <SelectItem value="Ambos" className="text-xs">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Queratometría OD */}
              <div className={`p-2.5 rounded-lg border ${kOdFueraRango || astigOdAlto ? 'border-amber-300 bg-amber-500/5 dark:border-amber-900/60' : 'border-border/70 bg-background/50'}`}>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">OD (Derecho)</span>
                  {astigOdAlto && (
                    <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
                      Astigmatismo &gt; 3 D ({astigOd?.toFixed(2)} D)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <Label className="text-[9px] text-muted-foreground">K1 (Plano)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      placeholder="43.00 D"
                      value={data.k1_od ?? ''}
                      onChange={(e) => updateField('k1_od', e.target.value)}
                      disabled={readOnly}
                      className={`h-7 text-xs font-mono text-center ${(k1Od && (k1Od < 40 || k1Od > 47)) ? 'text-amber-600 font-bold' : ''}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">K2 (Curvo)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      placeholder="43.75 D"
                      value={data.k2_od ?? ''}
                      onChange={(e) => updateField('k2_od', e.target.value)}
                      disabled={readOnly}
                      className={`h-7 text-xs font-mono text-center ${(k2Od && (k2Od < 40 || k2Od > 47)) ? 'text-amber-600 font-bold' : ''}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Eje K</Label>
                    <Input
                      type="number"
                      placeholder="0°-180°"
                      min={0}
                      max={180}
                      value={data.eje_k_od ?? ''}
                      onChange={(e) => updateField('eje_k_od', e.target.value)}
                      disabled={readOnly}
                      className="h-7 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Queratometría OI */}
              <div className={`p-2.5 rounded-lg border ${kOiFueraRango || astigOiAlto ? 'border-amber-300 bg-amber-500/5 dark:border-amber-900/60' : 'border-border/70 bg-background/50'}`}>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">OI (Izquierdo)</span>
                  {astigOiAlto && (
                    <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
                      Astigmatismo &gt; 3 D ({astigOi?.toFixed(2)} D)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <Label className="text-[9px] text-muted-foreground">K1 (Plano)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      placeholder="43.00 D"
                      value={data.k1_oi ?? ''}
                      onChange={(e) => updateField('k1_oi', e.target.value)}
                      disabled={readOnly}
                      className={`h-7 text-xs font-mono text-center ${(k1Oi && (k1Oi < 40 || k1Oi > 47)) ? 'text-amber-600 font-bold' : ''}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">K2 (Curvo)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      placeholder="43.75 D"
                      value={data.k2_oi ?? ''}
                      onChange={(e) => updateField('k2_oi', e.target.value)}
                      disabled={readOnly}
                      className={`h-7 text-xs font-mono text-center ${(k2Oi && (k2Oi < 40 || k2Oi > 47)) ? 'text-amber-600 font-bold' : ''}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Eje K</Label>
                    <Input
                      type="number"
                      placeholder="0°-180°"
                      min={0}
                      max={180}
                      value={data.eje_k_oi ?? ''}
                      onChange={(e) => updateField('eje_k_oi', e.target.value)}
                      disabled={readOnly}
                      className="h-7 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BLOQUE C · REFRACCIÓN SUBJETIVA, TOLERADA Y PRESCRITA EN CASCADA         */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                C
              </span>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Refracción Subjetiva & Prescripción con Cascada Inteligente
              </h4>
            </div>

            {/* Checkbox ametropía simétrica */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="igual_al_od"
                checked={!!data.igual_al_od}
                onCheckedChange={(checked) => updateField('igual_al_od', !!checked)}
                disabled={readOnly}
              />
              <Label htmlFor="igual_al_od" className="text-xs font-medium cursor-pointer text-muted-foreground">
                Igual al ojo derecho (Ametropía simétrica)
              </Label>
            </div>
          </div>

          {/* 1. NIVEL 1: REFRACCIÓN SUBJETIVA */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Glasses className="size-3.5 text-primary" />
                1. Refracción Subjetiva (Fórmula Optimizada por Respuestas del Paciente)
              </span>
              <span className="text-[10px] text-muted-foreground">Valores en Dioptrías (D) y Eje (°)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Subjetiva OD */}
              <div className="p-2.5 rounded-lg bg-sky-500/5 border border-sky-200/60 dark:border-sky-900/60 space-y-1.5">
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">Ojo Derecho (OD)</span>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Esfera</Label>
                    <Input
                      type="text"
                      placeholder="-1.50"
                      value={data.esfera_od || ''}
                      onChange={(e) => updateField('esfera_od', e.target.value)}
                      disabled={readOnly}
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Cilindro</Label>
                    <Input
                      type="text"
                      placeholder="-0.75"
                      value={data.cilindro_od || ''}
                      onChange={(e) => updateField('cilindro_od', e.target.value)}
                      disabled={readOnly}
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Eje</Label>
                    <Input
                      type="number"
                      placeholder="180°"
                      min={0}
                      max={180}
                      value={data.eje_od || ''}
                      onChange={(e) => updateField('eje_od', e.target.value)}
                      disabled={readOnly}
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Add (Cerca)</Label>
                    <Input
                      type="text"
                      placeholder="+2.00"
                      value={data.adicion_od || ''}
                      onChange={(e) => updateField('adicion_od', e.target.value)}
                      disabled={readOnly}
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Subjetiva OI */}
              <div className="p-2.5 rounded-lg bg-teal-500/5 border border-teal-200/60 dark:border-teal-900/60 space-y-1.5">
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">Ojo Izquierdo (OI)</span>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Esfera</Label>
                    <Input
                      type="text"
                      placeholder="-1.50"
                      value={data.esfera_oi || ''}
                      onChange={(e) => updateField('esfera_oi', e.target.value)}
                      disabled={readOnly || data.igual_al_od}
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Cilindro</Label>
                    <Input
                      type="text"
                      placeholder="-0.75"
                      value={data.cilindro_oi || ''}
                      onChange={(e) => updateField('cilindro_oi', e.target.value)}
                      disabled={readOnly || data.igual_al_od}
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Eje</Label>
                    <Input
                      type="number"
                      placeholder="180°"
                      min={0}
                      max={180}
                      value={data.eje_oi || ''}
                      onChange={(e) => updateField('eje_oi', e.target.value)}
                      disabled={readOnly || data.igual_al_od}
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Add (Cerca)</Label>
                    <Input
                      type="text"
                      placeholder="+2.00"
                      value={data.adicion_oi || ''}
                      onChange={(e) => updateField('adicion_oi', e.target.value)}
                      disabled={readOnly || data.igual_al_od}
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VÍNCULO DE CASCADA 1: Subjetiva -> Tolerada */}
          <div className="flex items-center justify-center -my-1">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/80 text-xs">
              <Checkbox
                id="copiar_subjetiva_a_tolerada"
                checked={data.copiar_subjetiva_a_tolerada !== false}
                onCheckedChange={(checked) => updateField('copiar_subjetiva_a_tolerada', !!checked)}
                disabled={readOnly}
              />
              <Label htmlFor="copiar_subjetiva_a_tolerada" className="text-[11px] font-medium cursor-pointer flex items-center gap-1">
                <span>Copiar automáticamente Subjetiva</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span>Tolerada</span>
                <span className="text-[10px] text-muted-foreground">(Desmarcar para desacoplar)</span>
              </Label>
            </div>
          </div>

          {/* 2. NIVEL 2: REFRACCIÓN TOLERADA (Prueba de Armazón de Prueba) */}
          <div className={`p-3 rounded-xl border transition-all ${data.copiar_subjetiva_a_tolerada !== false ? 'bg-muted/10 border-border/60' : 'bg-muted/30 border-primary/40'}`}>
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-muted-foreground" />
                2. Refracción Tolerada (Aceptación en Caja / Armazón de Prueba)
              </span>
              {data.copiar_subjetiva_a_tolerada !== false && (
                <Badge variant="outline" className="text-[9px] text-muted-foreground">
                  Vinculada a Subjetiva
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tol OD */}
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <Label className="text-[9px] text-muted-foreground">OD Esf</Label>
                  <Input
                    type="text"
                    value={data.tol_esfera_od || ''}
                    onChange={(e) => updateField('tol_esfera_od', e.target.value)}
                    disabled={readOnly || data.copiar_subjetiva_a_tolerada !== false}
                    className="h-7 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground">OD Cil</Label>
                  <Input
                    type="text"
                    value={data.tol_cilindro_od || ''}
                    onChange={(e) => updateField('tol_cilindro_od', e.target.value)}
                    disabled={readOnly || data.copiar_subjetiva_a_tolerada !== false}
                    className="h-7 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground">OD Eje</Label>
                  <Input
                    type="number"
                    value={data.tol_eje_od || ''}
                    onChange={(e) => updateField('tol_eje_od', e.target.value)}
                    disabled={readOnly || data.copiar_subjetiva_a_tolerada !== false}
                    className="h-7 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground">OD Add</Label>
                  <Input
                    type="text"
                    value={data.tol_adicion_od || ''}
                    onChange={(e) => updateField('tol_adicion_od', e.target.value)}
                    disabled={readOnly || data.copiar_subjetiva_a_tolerada !== false}
                    className="h-7 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Tol OI */}
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <Label className="text-[9px] text-muted-foreground">OI Esf</Label>
                  <Input
                    type="text"
                    value={data.tol_esfera_oi || ''}
                    onChange={(e) => updateField('tol_esfera_oi', e.target.value)}
                    disabled={readOnly || data.copiar_subjetiva_a_tolerada !== false}
                    className="h-7 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground">OI Cil</Label>
                  <Input
                    type="text"
                    value={data.tol_cilindro_oi || ''}
                    onChange={(e) => updateField('tol_cilindro_oi', e.target.value)}
                    disabled={readOnly || data.copiar_subjetiva_a_tolerada !== false}
                    className="h-7 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground">OI Eje</Label>
                  <Input
                    type="number"
                    value={data.tol_eje_oi || ''}
                    onChange={(e) => updateField('tol_eje_oi', e.target.value)}
                    disabled={readOnly || data.copiar_subjetiva_a_tolerada !== false}
                    className="h-7 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <Label className="text-[9px] text-muted-foreground">OI Add</Label>
                  <Input
                    type="text"
                    value={data.tol_adicion_oi || ''}
                    onChange={(e) => updateField('tol_adicion_oi', e.target.value)}
                    disabled={readOnly || data.copiar_subjetiva_a_tolerada !== false}
                    className="h-7 text-xs font-mono text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* VÍNCULO DE CASCADA 2: Tolerada -> Prescrita */}
          <div className="flex items-center justify-center -my-1">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/80 text-xs">
              <Checkbox
                id="copiar_tolerada_a_prescrita"
                checked={data.copiar_tolerada_a_prescrita !== false}
                onCheckedChange={(checked) => updateField('copiar_tolerada_a_prescrita', !!checked)}
                disabled={readOnly}
              />
              <Label htmlFor="copiar_tolerada_a_prescrita" className="text-[11px] font-medium cursor-pointer flex items-center gap-1">
                <span>Copiar automáticamente Tolerada</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span>Prescripción Final</span>
                <span className="text-[10px] text-muted-foreground">(Desmarcar para ajuste fino)</span>
              </Label>
            </div>
          </div>

          {/* 3. NIVEL 3: PRESCRIPCIÓN FINAL (RECETA ÓPTICA DEFINITIVA) */}
          <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  3. Prescripción Óptica Definitiva (Receta para Laboratorio)
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] border-primary/40 bg-background text-primary font-semibold">
                Fórmula de Despacho
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Rx Final OD */}
              <div className="p-2.5 rounded-lg bg-background border border-sky-300 dark:border-sky-800 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">Prescripción OD (Derecho)</span>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <Label className="text-[9px] text-muted-foreground font-semibold">Esfera</Label>
                    <Input
                      type="text"
                      placeholder="Plano"
                      value={data.rx_esfera_od || ''}
                      onChange={(e) => updateField('rx_esfera_od', e.target.value)}
                      disabled={readOnly || data.copiar_tolerada_a_prescrita !== false}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground font-semibold">Cilindro</Label>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={data.rx_cilindro_od || ''}
                      onChange={(e) => updateField('rx_cilindro_od', e.target.value)}
                      disabled={readOnly || data.copiar_tolerada_a_prescrita !== false}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground font-semibold">Eje</Label>
                    <Input
                      type="number"
                      placeholder="0°"
                      min={0}
                      max={180}
                      value={data.rx_eje_od || ''}
                      onChange={(e) => updateField('rx_eje_od', e.target.value)}
                      disabled={readOnly || data.copiar_tolerada_a_prescrita !== false}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground font-semibold">Add</Label>
                    <Input
                      type="text"
                      placeholder="+0.00"
                      value={data.rx_adicion_od || ''}
                      onChange={(e) => updateField('rx_adicion_od', e.target.value)}
                      disabled={readOnly || data.copiar_tolerada_a_prescrita !== false}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Rx Final OI */}
              <div className="p-2.5 rounded-lg bg-background border border-teal-300 dark:border-teal-800 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">Prescripción OI (Izquierdo)</span>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <Label className="text-[9px] text-muted-foreground font-semibold">Esfera</Label>
                    <Input
                      type="text"
                      placeholder="Plano"
                      value={data.rx_esfera_oi || ''}
                      onChange={(e) => updateField('rx_esfera_oi', e.target.value)}
                      disabled={readOnly || data.copiar_tolerada_a_prescrita !== false}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground font-semibold">Cilindro</Label>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={data.rx_cilindro_oi || ''}
                      onChange={(e) => updateField('rx_cilindro_oi', e.target.value)}
                      disabled={readOnly || data.copiar_tolerada_a_prescrita !== false}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground font-semibold">Eje</Label>
                    <Input
                      type="number"
                      placeholder="0°"
                      min={0}
                      max={180}
                      value={data.rx_eje_oi || ''}
                      onChange={(e) => updateField('rx_eje_oi', e.target.value)}
                      disabled={readOnly || data.copiar_tolerada_a_prescrita !== false}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground font-semibold">Add</Label>
                    <Input
                      type="text"
                      placeholder="+0.00"
                      value={data.rx_adicion_oi || ''}
                      onChange={(e) => updateField('rx_adicion_oi', e.target.value)}
                      disabled={readOnly || data.copiar_tolerada_a_prescrita !== false}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN OBLIGATORIA DE DIVERGENCIA: Si Prescrita != Subjetiva */}
            {isDivergente && (
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span className="text-xs font-bold">
                    Justificación Clínica: La fórmula prescrita difiere de la refracción subjetiva
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Conforme a la especificación clínica, registre el motivo de la divergencia para sustentar la adaptación del paciente:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Motivo Estandarizado</Label>
                    <Select
                      value={data.motivo_divergencia || ''}
                      onValueChange={(val) => updateField('motivo_divergencia', val)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Seleccione motivo clínico..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTIVOS_DIVERGENCIA.map((mot) => (
                          <SelectItem key={mot} value={mot} className="text-xs">{mot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Detalle / Aclaración Adicional</Label>
                    <Input
                      type="text"
                      placeholder="Ej: Se reduce -0.50 D de cilindro para evitar astenopía en primer uso..."
                      value={data.motivo_divergencia_detalle || ''}
                      onChange={(e) => updateField('motivo_divergencia_detalle', e.target.value)}
                      disabled={readOnly}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Parámetros Ópticos y Geometría de Fabricación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">DP Lejos (mm)</Label>
                <Input
                  type="text"
                  placeholder="Ej: 62 (OD 31 / OI 31)"
                  value={data.distancia_pupilar || ''}
                  onChange={(e) => updateField('distancia_pupilar', e.target.value)}
                  disabled={readOnly}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">DP Cerca (mm)</Label>
                <Input
                  type="text"
                  placeholder="Ej: 59"
                  value={data.distancia_pupilar_cerca || ''}
                  onChange={(e) => updateField('distancia_pupilar_cerca', e.target.value)}
                  disabled={readOnly}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Diseño de Lente</Label>
                <Select
                  value={data.tipo_lente || ''}
                  onValueChange={(val) => updateField('tipo_lente', val)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Diseño..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_LENTE.map((tl) => (
                      <SelectItem key={tl} value={tl} className="text-xs">{tl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Material / Filtro</Label>
                <Select
                  value={data.material_filtro || ''}
                  onValueChange={(val) => updateField('material_filtro', val)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Tratamiento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIALES_FILTROS.map((mf) => (
                      <SelectItem key={mf} value={mf} className="text-xs">{mf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-semibold text-muted-foreground">Uso Recomendado</Label>
                <Select
                  value={data.uso_lente || ''}
                  onValueChange={(val) => updateField('uso_lente', val)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Uso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {USOS_LENTE.map((ul) => (
                      <SelectItem key={ul} value={ul} className="text-xs">{ul}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TONOMETRÍA (PIO) & PAQUIMETRÍA CENTRAL                                   */}
        {/* ========================================================================= */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h4 className="text-xs font-bold text-foreground">
                Tonometría Intraocular (PIO) & Paquimetría Corneal Central
              </h4>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {pioAsimetria && (
                <Badge variant="destructive" className="text-[10px]">
                  Asimetría de PIO &gt; 4 mmHg
                </Badge>
              )}
              {pioOdFueraRango || pioOiFueraRango ? (
                <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                  <AlertTriangle className="size-3" />
                  <span>PIO fuera de rango (10 - 21 mmHg)</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                  <CheckCircle2 className="size-3 mr-1" />
                  Fisiológico: 10 a 21 mmHg
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* PIO OD */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground flex justify-between">
                <span>PIO OD (Derecho)</span>
                <span>mmHg</span>
              </Label>
              <Input
                type="number"
                min={2}
                max={70}
                placeholder="15"
                value={data.pio_od ?? ''}
                onChange={(e) => updateField('pio_od', e.target.value)}
                disabled={readOnly}
                className={`h-8 text-xs font-mono text-center ${pioOdFueraRango ? 'text-destructive font-bold border-destructive' : ''}`}
              />
            </div>

            {/* PIO OI */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground flex justify-between">
                <span>PIO OI (Izquierdo)</span>
                <span>mmHg</span>
              </Label>
              <Input
                type="number"
                min={2}
                max={70}
                placeholder="15"
                value={data.pio_oi ?? ''}
                onChange={(e) => updateField('pio_oi', e.target.value)}
                disabled={readOnly}
                className={`h-8 text-xs font-mono text-center ${pioOiFueraRango ? 'text-destructive font-bold border-destructive' : ''}`}
              />
            </div>

            {/* Método Tonometría */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground">Método Tonometría</Label>
              <Select
                value={data.metodo_tonometria || 'Tonómetro de Goldman (Aplanación)'}
                onValueChange={(val) => updateField('metodo_tonometria', val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Método..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tonómetro de Goldman (Aplanación)" className="text-xs">Goldman (Aplanación)</SelectItem>
                  <SelectItem value="Tonometría de No Contacto (Aire)" className="text-xs">No Contacto (Aire)</SelectItem>
                  <SelectItem value="Tono-Pen / Portátil" className="text-xs">Tono-Pen</SelectItem>
                  <SelectItem value="Tonómetro de Rebote (Icare)" className="text-xs">Icare (Rebote)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paquimetría OD */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground flex justify-between">
                <span>Paquimetría OD</span>
                <span className="text-[9px]">520-580 µm</span>
              </Label>
              <Input
                type="number"
                placeholder="545 µm"
                value={data.paquimetria_od ?? ''}
                onChange={(e) => updateField('paquimetria_od', e.target.value)}
                disabled={readOnly}
                className={`h-8 text-xs font-mono text-center ${paqOdFueraRango ? 'text-amber-600 font-bold border-amber-300' : ''}`}
              />
            </div>

            {/* Paquimetría OI */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground flex justify-between">
                <span>Paquimetría OI</span>
                <span className="text-[9px]">520-580 µm</span>
              </Label>
              <Input
                type="number"
                placeholder="545 µm"
                value={data.paquimetria_oi ?? ''}
                onChange={(e) => updateField('paquimetria_oi', e.target.value)}
                disabled={readOnly}
                className={`h-8 text-xs font-mono text-center ${paqOiFueraRango ? 'text-amber-600 font-bold border-amber-300' : ''}`}
              />
            </div>
          </div>

          {/* Relación Excavación / Disco (Sección 7 Anexo 14) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-semibold text-muted-foreground shrink-0">
                Relación Excavación/Disco OD:
              </Label>
              <Input
                type="number"
                step="0.05"
                min={0}
                max={1}
                placeholder="≤ 0.50 (ej. 0.3)"
                value={data.relacion_excavacion_disco_od ?? ''}
                onChange={(e) => updateField('relacion_excavacion_disco_od', e.target.value)}
                disabled={readOnly}
                className={`h-7 text-xs font-mono text-center w-28 ${cdOdFueraRango ? 'text-amber-600 font-bold border-amber-300' : ''}`}
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Label className="text-[10px] font-semibold text-muted-foreground shrink-0">
                Relación Excavación/Disco OI:
              </Label>
              <Input
                type="number"
                step="0.05"
                min={0}
                max={1}
                placeholder="≤ 0.50 (ej. 0.3)"
                value={data.relacion_excavacion_disco_oi ?? ''}
                onChange={(e) => updateField('relacion_excavacion_disco_oi', e.target.value)}
                disabled={readOnly}
                className={`h-7 text-xs font-mono text-center w-28 ${cdOiFueraRango ? 'text-amber-600 font-bold border-amber-300' : ''}`}
              />
              {cdAsimetria && (
                <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
                  Asimetría &gt; 0.2
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OBSERVACIONES Y RECOMENDACIONES CLÍNICAS                                  */}
        {/* ========================================================================= */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-muted-foreground">
            Observaciones de Refracción y Recomendaciones Específicas
          </Label>
          <Textarea
            value={data.observaciones_refraccion || ''}
            onChange={(e) => updateField('observaciones_refraccion', e.target.value)}
            placeholder="Consigne anotaciones optométricas adicionales, antecedentes de uso de lentes de contacto, astenopía o recomendaciones ergonómicas..."
            disabled={readOnly}
            rows={2}
            className="text-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default RefraccionWidget;
