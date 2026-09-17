import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Droplet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Baby,
  User,
  Eye,
  Sparkles,
  Play,
  RotateCcw,
  ShieldAlert,
  BellRing,
} from 'lucide-react';
import { toast } from 'sonner';

export interface InstilacionGotaItem {
  numero_gota: number;
  hora_aplicacion: string; // HH:mm:ss
  timestamp: number; // ms
}

export interface InstilacionGotasData {
  activo: boolean;
  tipo: 'Midriática' | 'Ciclopléjica' | 'Anestésica' | 'Tinción' | 'Otra';
  farmaco: string;
  ojo: 'Derecho' | 'Izquierdo' | 'Ambos';
  es_pediatrico: boolean;
  instilaciones: InstilacionGotaItem[];
  quien_instilo: string;
  hora_primera_gota?: string;
  hora_ultima_gota?: string;
  estado_midriasis: 'en_espera' | 'dilatado_listo' | 'midriasis_insuficiente';
  observaciones?: string;
}

interface InstilacionGotasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente?: {
    nombres?: string;
    apellidos?: string;
    fecha_nacimiento?: string;
    edad?: number;
    alergias?: string;
  };
  currentUserNombre?: string;
  initialData?: InstilacionGotasData;
  onSave: (data: InstilacionGotasData) => void;
  readOnly?: boolean;
}

const FARMACOS_CATALOGO = [
  // Ciclopléjicos y Midriáticos
  { nombre: 'Ciclopentolato 1%', tipo: 'Ciclopléjica', nota: 'Elección en pediatría y refracción (~30-45 min efecto)' },
  { nombre: 'Tropicamida 1%', tipo: 'Midriática', nota: 'Midriático rápido de corta duración (~20-30 min)' },
  { nombre: 'Tropicamida 0.8% + Fenilefrina 5%', tipo: 'Midriática', nota: 'Midriasis máxima sinergística' },
  { nombre: 'Fenilefrina 10%', tipo: 'Midriática', nota: 'Simpaticomimético (precaución en hipertensos/cardiópatas)' },
  { nombre: 'Atropina 1%', tipo: 'Ciclopléjica', nota: 'Cicloplejía profunda prolongada' },
  // Anestésicos
  { nombre: 'Tetracaína 0.5%', tipo: 'Anestésica', nota: 'Anestésico tópico para tonometría y procedimientos' },
  { nombre: 'Proparacaína 0.5%', tipo: 'Anestésica', nota: 'Anestesia de superficie suave' },
  // Tinciones
  { nombre: 'Fluoresceína Sódica 0.25% + Anestésico', tipo: 'Tinción', nota: 'Tonometría Goldman y examen corneal' },
  { nombre: 'Fluoresceína Sódica 2%', tipo: 'Tinción', nota: 'Tinción epitelial corneal y BUT' },
  { nombre: 'Rosa de Bengala / Lisamina', tipo: 'Tinción', nota: 'Ojo seco y daño celular mucoso' },
  { nombre: 'Otro', tipo: 'Otra', nota: 'Fármaco personalizado' },
];

export const InstilacionGotasModal: React.FC<InstilacionGotasModalProps> = ({
  open,
  onOpenChange,
  paciente,
  currentUserNombre = 'Médico Oftalmólogo',
  initialData,
  onSave,
  readOnly = false,
}) => {
  // Detección automática de edad pediátrica (< 12 años)
  const isPediatricoPorEdad = (() => {
    if (paciente?.edad !== undefined && paciente?.edad !== null && paciente.edad > 0) {
      return paciente.edad < 12;
    }
    if (paciente?.fecha_nacimiento) {
      try {
        const birth = new Date(paciente.fecha_nacimiento);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age >= 0 && age < 12;
      } catch {
        return false;
      }
    }
    return false;
  })();

  const [esPediatrico, setEsPediatrico] = useState<boolean>(() => {
    if (initialData?.es_pediatrico !== undefined) return initialData.es_pediatrico;
    return isPediatricoPorEdad;
  });

  const [tipo, setTipo] = useState<InstilacionGotasData['tipo']>(
    initialData?.tipo || (isPediatricoPorEdad ? 'Ciclopléjica' : 'Midriática')
  );

  const [farmaco, setFarmaco] = useState<string>(
    initialData?.farmaco || (isPediatricoPorEdad ? 'Ciclopentolato 1%' : 'Tropicamida 1%')
  );

  const [farmacoCustom, setFarmacoCustom] = useState<string>('');

  const [ojo, setOjo] = useState<InstilacionGotasData['ojo']>(
    initialData?.ojo || 'Ambos'
  );

  const [quienInstilo, setQuienInstilo] = useState<string>(
    initialData?.quien_instilo || currentUserNombre
  );

  const [instilaciones, setInstilaciones] = useState<InstilacionGotaItem[]>(
    initialData?.instilaciones || []
  );

  const [estadoMidriasis, setEstadoMidriasis] = useState<InstilacionGotasData['estado_midriasis']>(
    initialData?.estado_midriasis || 'en_espera'
  );

  const [observaciones, setObservaciones] = useState<string>(
    initialData?.observaciones || ''
  );

  // Reloj / temporizador local (actualiza cada segundo para cuentas regresivas)
  const [ahora, setAhora] = useState<number>(Date.now());

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [open]);

  // Al abrir con initialData, sincronizar
  useEffect(() => {
    if (initialData) {
      setEsPediatrico(initialData.es_pediatrico ?? isPediatricoPorEdad);
      setTipo(initialData.tipo || (isPediatricoPorEdad ? 'Ciclopléjica' : 'Midriática'));
      setFarmaco(initialData.farmaco || 'Tropicamida 1%');
      setOjo(initialData.ojo || 'Ambos');
      setQuienInstilo(initialData.quien_instilo || currentUserNombre);
      setInstilaciones(initialData.instilaciones || []);
      setEstadoMidriasis(initialData.estado_midriasis || 'en_espera');
      setObservaciones(initialData.observaciones || '');
    }
  }, [initialData, isPediatricoPorEdad]);

  // Manejador para aplicar/registrar una gota en el momento actual
  const handleRegistrarGota = (numGota: number) => {
    if (readOnly) return;
    const now = new Date();
    const horaStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setInstilaciones((prev) => {
      const filtered = prev.filter((i) => i.numero_gota !== numGota);
      const updated = [...filtered, { numero_gota: numGota, hora_aplicacion: horaStr, timestamp: now.getTime() }];
      return updated.sort((a, b) => a.numero_gota - b.numero_gota);
    });

    toast.success(`Gota ${numGota} registrada exitosamente a las ${horaStr}`);
  };

  // Cálculo de temporizadores
  // Protocolo Pediátrico: 3 gotas cada 10 min (600s). Exploración a los 15-20 min tras la 3ª gota.
  const gota1 = instilaciones.find((i) => i.numero_gota === 1);
  const gota2 = instilaciones.find((i) => i.numero_gota === 2);
  const gota3 = instilaciones.find((i) => i.numero_gota === 3);

  // Tiempo transcurrido y cuenta regresiva
  // Para Gota 2: debe aplicarse a gota1.timestamp + 10 min
  const tiempoParaGota2 = gota1 ? Math.max(0, Math.floor((gota1.timestamp + 10 * 60 * 1000 - ahora) / 1000)) : null;
  // Para Gota 3: debe aplicarse a gota2.timestamp + 10 min
  const tiempoParaGota3 = gota2 ? Math.max(0, Math.floor((gota2.timestamp + 10 * 60 * 1000 - ahora) / 1000)) : null;
  // Para Exploración Pediátrica: lista tras 20 min de gota3 (o 35 min de gota 1)
  const tiempoParaExploracionPediatrica = gota3
    ? Math.max(0, Math.floor((gota3.timestamp + 15 * 60 * 1000 - ahora) / 1000))
    : null;

  // Protocolo Adulto: 1 aplicación general, exploración lista tras 25 minutos
  const tiempoParaExploracionAdulto = gota1
    ? Math.max(0, Math.floor((gota1.timestamp + 25 * 60 * 1000 - ahora) / 1000))
    : null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Guardar datos consolidados
  const handleGuardar = () => {
    const farmacoFinal = farmaco === 'Otro' ? farmacoCustom || 'Personalizado' : farmaco;
    const horaPrimera = instilaciones.length > 0 ? instilaciones[0].hora_aplicacion : undefined;
    const horaUltima = instilaciones.length > 0 ? instilaciones[instilaciones.length - 1].hora_aplicacion : undefined;

    const consolidated: InstilacionGotasData = {
      activo: instilaciones.length > 0,
      tipo,
      farmaco: farmacoFinal,
      ojo,
      es_pediatrico: esPediatrico,
      instilaciones,
      quien_instilo: quienInstilo || currentUserNombre,
      hora_primera_gota: horaPrimera,
      hora_ultima_gota: horaUltima,
      estado_midriasis: estadoMidriasis,
      observaciones,
    };

    onSave(consolidated);
    onOpenChange(false);
    toast.success('Registro de instilación actualizado correctamente');
  };

  const handleReiniciarProtocolo = () => {
    if (readOnly) return;
    setInstilaciones([]);
    setEstadoMidriasis('en_espera');
    toast.info('Protocolo de instilación reiniciado');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Droplet className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  Registro de Instilación de Gotas Oftálmicas
                  {esPediatrico && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                      <Baby className="size-3 mr-1" />
                      Protocolo Pediátrico
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sección 8 NOM-004: Control de dilatación pupilar, horas por gota y temporizador clínico
                </p>
              </div>
            </div>

            {instilaciones.length > 0 && !readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReiniciarProtocolo}
                className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Reiniciar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ALERTA DE ALERGIAS DEL PACIENTE (Si existen) */}
        {paciente?.alergias && paciente.alergias.trim() !== '' && (
          <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/5 flex items-start gap-2.5">
            <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-destructive">¡Alerta de Hipersensibilidad / Alergias del Paciente!: </span>
              <span className="text-muted-foreground">{paciente.alergias}</span>
              <p className="text-[10px] text-destructive mt-0.5">
                Verifique que el principio activo a instilar no esté contraindicado antes de la aplicación.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-1">
          {/* CONMUTADOR DE PROTOCOLO: ADULTO VS PEDIÁTRICO */}
          <div className="p-3 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Baby className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Modo de Aplicación y Temporizador
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {esPediatrico
                  ? 'Protocolo Pediátrico estandarizado: 3 gotas cada 10 minutos con avisos sonoros/visuales'
                  : 'Protocolo Adulto / Estándar: Aplicación diagnóstica con temporizador de latencia'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs ${!esPediatrico ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                Adulto
              </span>
              <Switch
                checked={esPediatrico}
                onCheckedChange={(checked) => setEsPediatrico(checked)}
                disabled={readOnly}
              />
              <span className={`text-xs flex items-center gap-1 ${esPediatrico ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                <Baby className="size-3.5" />
                Pediátrico
              </span>
            </div>
          </div>

          {/* PARÁMETROS DEL FÁRMACO, TIPO Y OJO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tipo de Instilación */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Tipo de Instilación</Label>
              <Select
                value={tipo}
                onValueChange={(val: InstilacionGotasData['tipo']) => {
                  setTipo(val);
                  if (val === 'Ciclopléjica' && !farmaco.includes('Ciclopentolato')) {
                    setFarmaco('Ciclopentolato 1%');
                  } else if (val === 'Midriática' && !farmaco.includes('Tropicamida')) {
                    setFarmaco('Tropicamida 1%');
                  } else if (val === 'Anestésica') {
                    setFarmaco('Tetracaína 0.5%');
                  } else if (val === 'Tinción') {
                    setFarmaco('Fluoresceína Sódica 0.25% + Anestésico');
                  }
                }}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Midriática" className="text-xs">Midriática (Dilatación pupilar)</SelectItem>
                  <SelectItem value="Ciclopléjica" className="text-xs">Ciclopléjica (Parálisis acomodativa)</SelectItem>
                  <SelectItem value="Anestésica" className="text-xs">Anestésica tópica</SelectItem>
                  <SelectItem value="Tinción" className="text-xs">Tinción diagnóstica</SelectItem>
                  <SelectItem value="Otra" className="text-xs">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fármaco y Concentración */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Fármaco y Concentración</Label>
              <Select
                value={farmaco}
                onValueChange={(val) => setFarmaco(val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FARMACOS_CATALOGO.map((f) => (
                    <SelectItem key={f.nombre} value={f.nombre} className="text-xs">
                      {f.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ojo a Instilar */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Ojo a Instilar</Label>
              <Select
                value={ojo}
                onValueChange={(val: InstilacionGotasData['ojo']) => setOjo(val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ambos" className="text-xs">Ambos Ojos (AO)</SelectItem>
                  <SelectItem value="Derecho" className="text-xs">Ojo Derecho (OD)</SelectItem>
                  <SelectItem value="Izquierdo" className="text-xs">Ojo Izquierdo (OI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {farmaco === 'Otro' && (
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Especifique Fármaco</Label>
              <Input
                type="text"
                placeholder="Nombre del colirio y porcentaje..."
                value={farmacoCustom}
                onChange={(e) => setFarmacoCustom(e.target.value)}
                disabled={readOnly}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* ===================================================================== */}
          {/* SECCIÓN DE APLICACIÓN Y TEMPORIZADORES (UNA HORA POR GOTA)            */}
          {/* ===================================================================== */}
          {esPediatrico ? (
            /* PROTOCOLO PEDIÁTRICO: 3 GOTAS SEPARADAS POR 10 MINUTOS */
            <div className="p-4 rounded-xl border border-amber-300/80 dark:border-amber-900/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-foreground">
                    Protocolo Pediátrico: 3 Gotas (Separación de 10 min)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300">
                  {instilaciones.length}/3 Gotas Registradas
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Gota 1 */}
                <div className={`p-3 rounded-lg border transition-all ${gota1 ? 'bg-background border-emerald-300 dark:border-emerald-800' : 'bg-background/60 border-border/80'}`}>
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="flex items-center justify-center size-4 rounded-full bg-sky-500 text-white text-[10px] font-bold">1</span>
                      Primera Gota
                    </span>
                    {gota1 ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">Minuto 0</span>
                    )}
                  </div>

                  <div className="pt-2 space-y-2">
                    {gota1 ? (
                      <div className="space-y-1 text-center">
                        <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {gota1.hora_aplicacion}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Instilada con éxito</p>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleRegistrarGota(1)}
                        disabled={readOnly}
                        className="w-full h-8 text-xs gap-1.5 font-semibold cursor-pointer bg-sky-600 hover:bg-sky-700 text-white"
                      >
                        <Play className="size-3" />
                        <span>Instilar Gota 1</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Gota 2 */}
                <div className={`p-3 rounded-lg border transition-all ${gota2 ? 'bg-background border-emerald-300 dark:border-emerald-800' : (!gota1 ? 'opacity-60 bg-muted/20 border-border/60' : (tiempoParaGota2 === 0 ? 'bg-amber-100/70 dark:bg-amber-950/50 border-amber-400 animate-pulse' : 'bg-background border-amber-300/70'))}`}>
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="flex items-center justify-center size-4 rounded-full bg-sky-500 text-white text-[10px] font-bold">2</span>
                      Segunda Gota
                    </span>
                    {gota2 ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">+10 min</span>
                    )}
                  </div>

                  <div className="pt-2 space-y-2">
                    {gota2 ? (
                      <div className="space-y-1 text-center">
                        <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {gota2.hora_aplicacion}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Instilada con éxito</p>
                      </div>
                    ) : gota1 ? (
                      tiempoParaGota2 !== null && tiempoParaGota2 > 0 ? (
                        <div className="text-center space-y-1">
                          <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 animate-pulse">
                            {formatSeconds(tiempoParaGota2)}
                          </div>
                          <p className="text-[10px] text-muted-foreground">Tiempo de espera</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegistrarGota(2)}
                            disabled={readOnly}
                            className="w-full h-7 text-[10px] mt-1"
                          >
                            Forzar Aplicación Ahora
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1 text-amber-600 font-bold text-xs">
                            <BellRing className="size-3 animate-bounce" />
                            <span>¡Corresponde aplicar!</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRegistrarGota(2)}
                            disabled={readOnly}
                            className="w-full h-8 text-xs gap-1.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                          >
                            <Play className="size-3" />
                            <span>Instilar Gota 2</span>
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-2 text-[10px] text-muted-foreground">
                        Requiere gota 1
                      </div>
                    )}
                  </div>
                </div>

                {/* Gota 3 */}
                <div className={`p-3 rounded-lg border transition-all ${gota3 ? 'bg-background border-emerald-300 dark:border-emerald-800' : (!gota2 ? 'opacity-60 bg-muted/20 border-border/60' : (tiempoParaGota3 === 0 ? 'bg-amber-100/70 dark:bg-amber-950/50 border-amber-400 animate-pulse' : 'bg-background border-amber-300/70'))}`}>
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="flex items-center justify-center size-4 rounded-full bg-sky-500 text-white text-[10px] font-bold">3</span>
                      Tercera Gota
                    </span>
                    {gota3 ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">+20 min</span>
                    )}
                  </div>

                  <div className="pt-2 space-y-2">
                    {gota3 ? (
                      <div className="space-y-1 text-center">
                        <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {gota3.hora_aplicacion}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Instilada con éxito</p>
                      </div>
                    ) : gota2 ? (
                      tiempoParaGota3 !== null && tiempoParaGota3 > 0 ? (
                        <div className="text-center space-y-1">
                          <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 animate-pulse">
                            {formatSeconds(tiempoParaGota3)}
                          </div>
                          <p className="text-[10px] text-muted-foreground">Tiempo de espera</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegistrarGota(3)}
                            disabled={readOnly}
                            className="w-full h-7 text-[10px] mt-1"
                          >
                            Forzar Aplicación Ahora
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1 text-amber-600 font-bold text-xs">
                            <BellRing className="size-3 animate-bounce" />
                            <span>¡Corresponde aplicar!</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRegistrarGota(3)}
                            disabled={readOnly}
                            className="w-full h-8 text-xs gap-1.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                          >
                            <Play className="size-3" />
                            <span>Instilar Gota 3</span>
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-2 text-[10px] text-muted-foreground">
                        Requiere gota 2
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Estado final de dilatación tras la 3ª gota */}
              {gota3 && (
                <div className="p-3 rounded-lg bg-background border border-border/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-500" />
                    <div>
                      <span className="text-xs font-bold text-foreground">
                        Tiempo para exploración ciclopléjica óptima:
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {tiempoParaExploracionPediatrica !== null && tiempoParaExploracionPediatrica > 0
                          ? `Esperar ${formatSeconds(tiempoParaExploracionPediatrica)} min para efecto ciclopléjico máximo`
                          : '¡Cicloplejía completa! El paciente ya puede ser explorado y refractado.'}
                      </p>
                    </div>
                  </div>
                  {tiempoParaExploracionPediatrica !== null && tiempoParaExploracionPediatrica > 0 ? (
                    <Badge variant="outline" className="font-mono text-xs text-amber-600 border-amber-300">
                      {formatSeconds(tiempoParaExploracionPediatrica)}
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600 text-white text-xs gap-1">
                      <CheckCircle2 className="size-3" />
                      Listo para Explorar
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* PROTOCOLO ADULTO / ESTÁNDAR */
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Instilación Diagnóstica Adulto / Estándar
                  </span>
                </div>
                {gota1 && (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                    Instilada a las {gota1.hora_aplicacion}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <span className="text-xs font-medium text-foreground">
                    {gota1
                      ? `Primera gota registrada a las ${gota1.hora_aplicacion}`
                      : 'Registre la hora de instilación de la primera gota para calcular la latencia de dilatación'}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Tiempo de espera recomendado para fondo de ojo: 20 a 30 minutos.
                  </p>
                </div>

                {!gota1 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleRegistrarGota(1)}
                    disabled={readOnly}
                    className="h-8 text-xs gap-1.5 font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shrink-0"
                  >
                    <Play className="size-3" />
                    <span>Registrar Instilación Ahora</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    {tiempoParaExploracionAdulto !== null && tiempoParaExploracionAdulto > 0 ? (
                      <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-amber-300">
                        <span className="text-[10px] text-muted-foreground">Dilatando:</span>
                        <span className="font-mono text-xs font-bold text-amber-600">
                          {formatSeconds(tiempoParaExploracionAdulto)}
                        </span>
                      </div>
                    ) : (
                      <Badge className="bg-emerald-600 text-white text-xs gap-1">
                        <CheckCircle2 className="size-3" />
                        Dilatación Alcanzada
                      </Badge>
                    )}

                    {!gota2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegistrarGota(2)}
                        disabled={readOnly}
                        className="h-8 text-xs"
                      >
                        + Gota Refuerzo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QUIÉN INSTILÓ Y EVALUACIÓN DE LA MIDRIASIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <User className="size-3" />
                Quién Instiló (Estampado Automático)
              </Label>
              <Input
                type="text"
                value={quienInstilo}
                onChange={(e) => setQuienInstilo(e.target.value)}
                disabled={readOnly}
                placeholder="Nombre del profesional..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Eye className="size-3" />
                Condición de Midriasis Resultante
              </Label>
              <Select
                value={estadoMidriasis}
                onValueChange={(val: InstilacionGotasData['estado_midriasis']) => setEstadoMidriasis(val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_espera" className="text-xs">
                    ⏳ En proceso de dilatación / Espera
                  </SelectItem>
                  <SelectItem value="dilatado_listo" className="text-xs font-semibold text-emerald-600">
                    ✓ Bajo midriasis completa (Listo para explorar)
                  </SelectItem>
                  <SelectItem value="midriasis_insuficiente" className="text-xs font-semibold text-amber-600">
                    ⚠ Midriasis insuficiente (Pupila rígida / resistencia)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* OBSERVACIONES DE LA INSTILACIÓN */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Observaciones de la Instilación
            </Label>
            <Textarea
              rows={2}
              placeholder="Consigne si hubo ardor, poca tolerancia del menor, lagrimeo abundante que requirió re-instilar..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={readOnly}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cerrar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGuardar}
            disabled={readOnly}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground"
          >
            <CheckCircle2 className="size-4" />
            <span>Guardar Registro y Activar en Consulta</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InstilacionGotasModal;
