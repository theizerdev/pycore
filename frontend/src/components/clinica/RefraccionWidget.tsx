import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import {
  Eye,
  Glasses,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export interface RefraccionData {
  agudeza_od_sc?: string;
  agudeza_od_cc?: string;
  agudeza_od_ph?: string;
  agudeza_oi_sc?: string;
  agudeza_oi_cc?: string;
  agudeza_oi_ph?: string;

  esfera_od?: string;
  cilindro_od?: string;
  eje_od?: string;
  adicion_od?: string;

  esfera_oi?: string;
  cilindro_oi?: string;
  eje_oi?: string;
  adicion_oi?: string;

  distancia_pupilar?: string;
  distancia_pupilar_cerca?: string;
  tipo_lente?: string;
  material_filtro?: string;

  pio_od?: string | number;
  pio_oi?: string | number;
  metodo_tonometria?: string;

  observaciones_refraccion?: string;
}

interface RefraccionWidgetProps {
  initialData?: RefraccionData;
  onChange?: (data: RefraccionData) => void;
  readOnly?: boolean;
}

const OPCIONES_SNELLEN = [
  '20/15 (1.33)',
  '20/20 (1.00 - Normal)',
  '20/25 (0.80)',
  '20/30 (0.67)',
  '20/40 (0.50)',
  '20/50 (0.40)',
  '20/70 (0.30)',
  '20/100 (0.20)',
  '20/200 (0.10)',
  'Cuenta Dedos (CD)',
  'Movimiento de Manos (MM)',
  'Percepción de Luz (PL)',
  'No Percepción de Luz (NPL)',
];

const TIPOS_LENTE = [
  'Monofocal (Visión Lejana)',
  'Monofocal (Visión Cercana)',
  'Bifocal con Película (Kryptok)',
  'Bifocal Invisible (Ultex)',
  'Progresivo / Multifocal Digital',
  'Ocupacional / De Oficina',
];

const MATERIALES_FILTROS = [
  'Orgánico Estándar (CR-39)',
  'Policarbonato (Alto Impacto)',
  'Alto Índice 1.67 / 1.74 (Ultra Delgado)',
  'Antirreflejo Multicapa (AR)',
  'Filtro Luz Azul (Blue Block / Pantallas)',
  'Fotocromático (Transitions)',
  'Polarizado UV400',
];

export const RefraccionWidget: React.FC<RefraccionWidgetProps> = ({
  initialData,
  onChange,
  readOnly = false,
}) => {
  const [data, setData] = useState<RefraccionData>(initialData || {});

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const updateField = (field: keyof RefraccionData, value: any) => {
    if (readOnly) return;
    const next = { ...data, [field]: value };
    setData(next);
    if (onChange) {
      onChange(next);
    }
  };

  const pioOdNum = Number(data.pio_od);
  const pioOiNum = Number(data.pio_oi);
  const hasHighPio = (data.pio_od && pioOdNum > 21) || (data.pio_oi && pioOiNum > 21);

  const handleCopiarFormula = () => {
    const formulaText = `FÓRMULA DE REFRACCIÓN ÓPTICA:
• Ojo Derecho (OD): Esf: ${data.esfera_od || 'Plano'} | Cil: ${data.cilindro_od || '0.00'} | Eje: ${data.eje_od || '0'}° | Add: ${data.adicion_od || '+0.00'}
• Ojo Izquierdo (OI): Esf: ${data.esfera_oi || 'Plano'} | Cil: ${data.cilindro_oi || '0.00'} | Eje: ${data.eje_oi || '0'}° | Add: ${data.adicion_oi || '+0.00'}
• Distancia Pupilar (DP): ${data.distancia_pupilar || '62'} mm
• Tipo de Lente: ${data.tipo_lente || 'Monofocal'} | Tratamiento: ${data.material_filtro || 'Antirreflejo'}`;

    navigator.clipboard.writeText(formulaText);
    toast.success('Fórmula óptica copiada al portapapeles');
  };

  const handlePresetsEmétrope = () => {
    if (readOnly) return;
    const next: RefraccionData = {
      ...data,
      agudeza_od_sc: '20/20 (1.00 - Normal)',
      agudeza_oi_sc: '20/20 (1.00 - Normal)',
      esfera_od: 'Plano',
      cilindro_od: '0.00',
      eje_od: '0',
      esfera_oi: 'Plano',
      cilindro_oi: '0.00',
      eje_oi: '0',
      pio_od: 15,
      pio_oi: 15,
      metodo_tonometria: 'Tonómetro de Goldman',
    };
    setData(next);
    if (onChange) onChange(next);
    toast.success('Valores de emetropía y agudeza 20/20 cargados');
  };

  return (
    <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
      <CardContent className="p-5 space-y-6">
        {/* Cabecera del Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Eye className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">
                  Gabinete de Refracción & Agudeza Visual Snellen
                </h4>
                <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300">
                  Oftalmología & Optometría
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Examen optométrico, cartilla Snellen OD/OI, tonometría intraocular y prescripción de lentes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePresetsEmétrope}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Sparkles className="size-3.5 text-sky-500" />
                <span>Cargar Normal (20/20)</span>
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
              <span>Copiar Fórmula</span>
            </Button>
          </div>
        </div>

        {/* 1. AGUDEZA VISUAL SNELLEN */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="size-3.5 text-sky-500" />
              <span>1. Agudeza Visual (Cartilla de Snellen)</span>
            </h5>
            <span className="text-[11px] text-muted-foreground font-medium">Distancia estándar 6 metros / 20 pies</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ojo Derecho (OD) */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-sky-500" />
                  Ojo Derecho (OD)
                </span>
                <Badge variant="outline" className="text-[10px]">OD</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Sin Corrección (SC)</Label>
                  <Select
                    value={data.agudeza_od_sc || ''}
                    onValueChange={(val) => updateField('agudeza_od_sc', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES_SNELLEN.map((opc) => (
                        <SelectItem key={opc} value={opc} className="text-xs">
                          {opc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Con Corrección (CC)</Label>
                  <Select
                    value={data.agudeza_od_cc || ''}
                    onValueChange={(val) => updateField('agudeza_od_cc', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES_SNELLEN.map((opc) => (
                        <SelectItem key={opc} value={opc} className="text-xs">
                          {opc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Estenopeico (PH)</Label>
                  <Select
                    value={data.agudeza_od_ph || ''}
                    onValueChange={(val) => updateField('agudeza_od_ph', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Mejora con PH..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No mejora" className="text-xs">No mejora</SelectItem>
                      {OPCIONES_SNELLEN.slice(0, 6).map((opc) => (
                        <SelectItem key={`ph_${opc}`} value={opc} className="text-xs">
                          Mejora a {opc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Ojo Izquierdo (OI) */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-teal-500" />
                  Ojo Izquierdo (OI)
                </span>
                <Badge variant="outline" className="text-[10px]">OI</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Sin Corrección (SC)</Label>
                  <Select
                    value={data.agudeza_oi_sc || ''}
                    onValueChange={(val) => updateField('agudeza_oi_sc', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES_SNELLEN.map((opc) => (
                        <SelectItem key={opc} value={opc} className="text-xs">
                          {opc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Con Corrección (CC)</Label>
                  <Select
                    value={data.agudeza_oi_cc || ''}
                    onValueChange={(val) => updateField('agudeza_oi_cc', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES_SNELLEN.map((opc) => (
                        <SelectItem key={opc} value={opc} className="text-xs">
                          {opc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Estenopeico (PH)</Label>
                  <Select
                    value={data.agudeza_oi_ph || ''}
                    onValueChange={(val) => updateField('agudeza_oi_ph', val)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Mejora con PH..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No mejora" className="text-xs">No mejora</SelectItem>
                      {OPCIONES_SNELLEN.slice(0, 6).map((opc) => (
                        <SelectItem key={`ph_oi_${opc}`} value={opc} className="text-xs">
                          Mejora a {opc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. REFRACCIÓN SUBJETIVA / FÓRMULA DE LENTES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Glasses className="size-3.5 text-primary" />
              <span>2. Refracción Subjetiva & Prescripción de Lentes</span>
            </h5>
            <span className="text-[11px] text-muted-foreground">Valores en Dioptrías (D) y Grados (°)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/80">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                <tr>
                  <th className="p-2.5 text-left w-24">Ojo</th>
                  <th className="p-2.5 text-left">Esfera (Esf)</th>
                  <th className="p-2.5 text-left">Cilindro (Cil)</th>
                  <th className="p-2.5 text-left">Eje (°)</th>
                  <th className="p-2.5 text-left">Adición (ADD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/* Ojo Derecho */}
                <tr className="hover:bg-muted/10">
                  <td className="p-2.5 font-bold text-sky-600 dark:text-sky-400">
                    O.D. (Derecho)
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      value={data.esfera_od || ''}
                      onChange={(e) => updateField('esfera_od', e.target.value)}
                      placeholder="Ej: -1.75 / +0.50"
                      disabled={readOnly}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      value={data.cilindro_od || ''}
                      onChange={(e) => updateField('cilindro_od', e.target.value)}
                      placeholder="Ej: -0.75"
                      disabled={readOnly}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={0}
                      max={180}
                      value={data.eje_od || ''}
                      onChange={(e) => updateField('eje_od', e.target.value)}
                      placeholder="0° a 180°"
                      disabled={readOnly}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      value={data.adicion_od || ''}
                      onChange={(e) => updateField('adicion_od', e.target.value)}
                      placeholder="Ej: +1.75"
                      disabled={readOnly}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                </tr>

                {/* Ojo Izquierdo */}
                <tr className="hover:bg-muted/10">
                  <td className="p-2.5 font-bold text-teal-600 dark:text-teal-400">
                    O.I. (Izquierdo)
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      value={data.esfera_oi || ''}
                      onChange={(e) => updateField('esfera_oi', e.target.value)}
                      placeholder="Ej: -2.00 / +1.00"
                      disabled={readOnly}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      value={data.cilindro_oi || ''}
                      onChange={(e) => updateField('cilindro_oi', e.target.value)}
                      placeholder="Ej: -0.50"
                      disabled={readOnly}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={0}
                      max={180}
                      value={data.eje_oi || ''}
                      onChange={(e) => updateField('eje_oi', e.target.value)}
                      placeholder="0° a 180°"
                      disabled={readOnly}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      value={data.adicion_oi || ''}
                      onChange={(e) => updateField('adicion_oi', e.target.value)}
                      placeholder="Ej: +1.75"
                      disabled={readOnly}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Parámetros de confección óptica */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Distancia Pupilar (DP Lejos)</Label>
              <Input
                type="text"
                value={data.distancia_pupilar || ''}
                onChange={(e) => updateField('distancia_pupilar', e.target.value)}
                placeholder="Ej: 62 mm (OD 31 / OI 31)"
                disabled={readOnly}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">DP Cerca</Label>
              <Input
                type="text"
                value={data.distancia_pupilar_cerca || ''}
                onChange={(e) => updateField('distancia_pupilar_cerca', e.target.value)}
                placeholder="Ej: 59 mm"
                disabled={readOnly}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Diseño de Lente Sugerido</Label>
              <Select
                value={data.tipo_lente || ''}
                onValueChange={(val) => updateField('tipo_lente', val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccione diseño..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_LENTE.map((tl) => (
                    <SelectItem key={tl} value={tl} className="text-xs">
                      {tl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Material / Filtro Óptico</Label>
              <Select
                value={data.material_filtro || ''}
                onValueChange={(val) => updateField('material_filtro', val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccione filtro..." />
                </SelectTrigger>
                <SelectContent>
                  {MATERIALES_FILTROS.map((mf) => (
                    <SelectItem key={mf} value={mf} className="text-xs">
                      {mf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 3. TONOMETRÍA / PRESIÓN INTRAOCULAR (PIO) */}
        <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h5 className="text-xs font-bold text-foreground">
                3. Tonometría Ocular — Presión Intraocular (PIO)
              </h5>
            </div>
            {hasHighPio ? (
              <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                <AlertTriangle className="size-3" />
                <span>Hipertensión Ocular (&gt; 21 mmHg) — Riesgo Glaucoma</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                <CheckCircle2 className="size-3 mr-1" />
                Rango fisiológico: 10 a 21 mmHg
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>PIO Ojo Derecho (OD)</span>
                <span className="text-[10px] text-muted-foreground">mmHg</span>
              </Label>
              <Input
                type="number"
                min={4}
                max={60}
                value={data.pio_od ?? ''}
                onChange={(e) => updateField('pio_od', e.target.value)}
                placeholder="Ej: 14"
                disabled={readOnly}
                className={`h-8 text-xs font-mono ${pioOdNum > 21 ? 'border-destructive text-destructive font-bold' : ''}`}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>PIO Ojo Izquierdo (OI)</span>
                <span className="text-[10px] text-muted-foreground">mmHg</span>
              </Label>
              <Input
                type="number"
                min={4}
                max={60}
                value={data.pio_oi ?? ''}
                onChange={(e) => updateField('pio_oi', e.target.value)}
                placeholder="Ej: 15"
                disabled={readOnly}
                className={`h-8 text-xs font-mono ${pioOiNum > 21 ? 'border-destructive text-destructive font-bold' : ''}`}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Método Tonometría</Label>
              <Select
                value={data.metodo_tonometria || 'Tonómetro de Goldman'}
                onValueChange={(val) => updateField('metodo_tonometria', val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Método..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tonómetro de Goldman" className="text-xs">Tonómetro de Goldman (Aplanación)</SelectItem>
                  <SelectItem value="Tonometría de No Contacto (Aire)" className="text-xs">Tonometría de No Contacto (Aire)</SelectItem>
                  <SelectItem value="Tono-Pen / Portátil" className="text-xs">Tono-Pen / Portátil</SelectItem>
                  <SelectItem value="Tonómetro de Rebote (Icare)" className="text-xs">Tonómetro de Rebote (Icare)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 4. NOTAS / OBSERVACIONES DE LA REFRACCIÓN */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-muted-foreground">
            Observaciones Optométricas y Recomendaciones de Uso
          </Label>
          <Textarea
            value={data.observaciones_refraccion || ''}
            onChange={(e) => updateField('observaciones_refraccion', e.target.value)}
            placeholder="Ej: Paciente refiere astenopía vespertina, buena adaptación con corrección actual, control en 12 meses..."
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
