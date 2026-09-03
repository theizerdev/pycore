import React, { useState, useEffect } from 'react';
import { pacientesApi } from '../../api/pacientes';
import type { Paciente, PacienteHistorialResponse, ConsultaMedicaHistorial } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatCleanWhatsAppNumber } from './DoctorWelcomeModal';
import { getCountryFlagEmoji } from '../../context/RegionalContext';
import {
  User,
  Heart,
  AlertTriangle,
  FileText,
  Pill,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Activity,
  Edit,
  ShieldCheck,
  PhoneCall,
  ChevronRight,
  Stethoscope,
  Weight,
  Thermometer,
  Zap,
} from 'lucide-react';

interface PatientRecordDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Paciente | null;
  onEdit?: (paciente: Paciente) => void;
}

export const PatientRecordDrawer: React.FC<PatientRecordDrawerProps> = ({
  open,
  onOpenChange,
  paciente,
  onEdit,
}) => {
  const [loading, setLoading] = useState(false);
  const [historialData, setHistorialData] = useState<PacienteHistorialResponse | null>(null);
  const [activeTab, setActiveTab] = useState('consultas');

  useEffect(() => {
    if (!open || !paciente) {
      setHistorialData(null);
      return;
    }

    const fetchHistorial = async () => {
      setLoading(true);
      try {
        const data = await pacientesApi.getHistorial(paciente.id);
        setHistorialData(data);
      } catch (err) {
        console.error('Error cargando historial de paciente:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [open, paciente]);

  if (!paciente) return null;

  const cleanPhone = formatCleanWhatsAppNumber(
    paciente.telefono || '',
    paciente.pais_codigo_telefonico || '58'
  );

  const openWhatsApp = () => {
    if (!cleanPhone) return;
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const consultas = historialData?.consultas || [];
  const alergias = historialData?.alergias || paciente.alergias || [];

  // Extraer todas las recetas de las consultas
  const todasLasRecetas = consultas.flatMap((c) =>
    (c.receta_medica || []).map((r) => ({
      ...r,
      fecha: c.fecha_consulta,
      medico: c.medico_nombre,
      especialidad: c.especialidad_nombre,
    }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabecera Clínica Integral */}
        <DialogHeader className="p-5 pb-4 border-b border-border/80 bg-gradient-to-r from-muted/30 via-background to-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex size-14 items-center justify-center rounded-2xl text-white font-bold text-lg shadow-sm shrink-0 border-2 border-white/20 ${
                  paciente.genero === 'F' ? 'bg-pink-600' : 'bg-teal-600'
                }`}
              >
                {paciente.nombres.charAt(0)}{paciente.apellidos.charAt(0)}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {paciente.nombres} {paciente.apellidos}
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {paciente.tipo_documento}-{paciente.documento_identidad}
                  </Badge>
                  {paciente.grupo_sanguineo && (
                    <Badge className="bg-rose-600 text-white font-bold text-xs gap-1">
                      <Heart className="size-3 fill-current" />
                      <span>{paciente.grupo_sanguineo}</span>
                    </Badge>
                  )}
                  {paciente.edad_texto && (
                    <Badge variant="secondary" className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 font-semibold">
                      {paciente.edad_texto}
                    </Badge>
                  )}
                </div>

                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                  <span>{paciente.genero === 'F' ? 'Femenino' : 'Masculino'}</span>
                  <span>•</span>
                  <span>{paciente.email || 'Sin correo'}</span>
                  {paciente.ciudad && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {paciente.ciudad}
                      </span>
                    </>
                  )}
                </DialogDescription>

                {/* Banner de Alergias Críticas si existen */}
                {alergias.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="size-3.5" />
                      Alergias:
                    </span>
                    {alergias.map((al, idx) => (
                      <Badge
                        key={idx}
                        className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[11px] font-semibold py-0 px-2"
                      >
                        ⚠️ {al}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {cleanPhone && (
                <Button
                  type="button"
                  size="sm"
                  onClick={openWhatsApp}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1.5"
                >
                  <MessageCircle className="size-3.5" />
                  <span>WhatsApp</span>
                </Button>
              )}

              {onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(paciente);
                  }}
                  className="h-8 text-xs cursor-pointer gap-1.5"
                >
                  <Edit className="size-3.5 text-muted-foreground" />
                  <span>Editar</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Pestañas de la Ficha Integral */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-3 border-b border-border/70 bg-card">
              <TabsList className="grid grid-cols-4 h-9 bg-muted/50 p-1">
                <TabsTrigger value="consultas" className="text-xs gap-1.5 cursor-pointer data-[state=active]:bg-background">
                  <Stethoscope className="size-3.5 text-teal-600" />
                  <span>Historial Consultas ({consultas.length})</span>
                </TabsTrigger>
                <TabsTrigger value="recetas" className="text-xs gap-1.5 cursor-pointer data-[state=active]:bg-background">
                  <Pill className="size-3.5 text-indigo-600" />
                  <span>Recetas ({todasLasRecetas.length})</span>
                </TabsTrigger>
                <TabsTrigger value="ficha" className="text-xs gap-1.5 cursor-pointer data-[state=active]:bg-background">
                  <FileText className="size-3.5 text-rose-500" />
                  <span>Ficha Médica Base</span>
                </TabsTrigger>
                <TabsTrigger value="contacto" className="text-xs gap-1.5 cursor-pointer data-[state=active]:bg-background">
                  <PhoneCall className="size-3.5 text-amber-500" />
                  <span>Emergencia & Seguro</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* ── 1. HISTORIAL DE CONSULTAS PREVIAS ──────────────── */}
              <TabsContent value="consultas" className="space-y-4 m-0">
                {consultas.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Stethoscope className="size-10 mx-auto stroke-1 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No hay consultas registradas para este paciente todavía.</p>
                    <p className="text-xs text-muted-foreground">
                      Cuando el médico atienda una consulta, su diagnóstico y signos vitales aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                    {consultas.map((c) => (
                      <div key={c.id} className="relative group">
                        {/* Dot del timeline */}
                        <div className="absolute -left-6 top-1.5 flex size-5 items-center justify-center rounded-full bg-teal-600 text-white ring-4 ring-background">
                          <Stethoscope className="size-3" />
                        </div>

                        {/* Card de Consulta */}
                        <div className="p-4 rounded-xl border border-border/80 bg-card hover:border-teal-500/40 transition-colors shadow-2xs space-y-3">
                          {/* Cabecera de la consulta */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/60 pb-2.5">
                            <div>
                              <span className="text-sm font-bold text-foreground block">
                                {c.motivo_consulta}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className="font-semibold text-teal-700 dark:text-teal-300">
                                  {c.medico_nombre}
                                </span>
                                <span>•</span>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                                  {c.especialidad_nombre}
                                </Badge>
                                {c.sucursal_nombre && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[11px]">{c.sucursal_nombre}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                              <Calendar className="size-3 text-muted-foreground" />
                              {new Date(c.fecha_consulta).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Signos Vitales de esa consulta */}
                          {c.signos_vitales && Object.keys(c.signos_vitales).length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/25 p-2.5 rounded-lg border border-border/60 text-xs">
                              {c.signos_vitales.peso_kg && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Peso</span>
                                  <span className="font-bold text-foreground">{c.signos_vitales.peso_kg} kg</span>
                                  {c.signos_vitales.talla_cm && (
                                    <span className="text-muted-foreground text-[11px]"> ({c.signos_vitales.talla_cm} cm)</span>
                                  )}
                                </div>
                              )}
                              {c.signos_vitales.imc && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">IMC</span>
                                  <span className="font-bold text-foreground">{c.signos_vitales.imc}</span>
                                  {c.signos_vitales.clasificacion_imc && (
                                    <span className="text-teal-600 dark:text-teal-400 text-[10px] block font-semibold">
                                      {c.signos_vitales.clasificacion_imc}
                                    </span>
                                  )}
                                </div>
                              )}
                              {c.signos_vitales.presion_arterial && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Presión Art.</span>
                                  <span className="font-bold text-foreground">{c.signos_vitales.presion_arterial}</span>
                                </div>
                              )}
                              {c.signos_vitales.frecuencia_cardiaca && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Pulso / FC</span>
                                  <span className="font-bold text-foreground">{c.signos_vitales.frecuencia_cardiaca} lpm</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Diagnóstico CIE-10 */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Diagnóstico Principal
                            </span>
                            <p className="text-xs font-semibold text-foreground bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 rounded-md">
                              🩺 {c.diagnostico_principal}
                            </p>
                            {c.diagnosticos_secundarios?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {c.diagnosticos_secundarios.map((ds, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] text-muted-foreground">
                                    {ds}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Plan de tratamiento */}
                          {c.plan_tratamiento && (
                            <div className="space-y-1 text-xs">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Plan de Tratamiento
                              </span>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {c.plan_tratamiento}
                              </p>
                            </div>
                          )}

                          {/* Receta de la consulta */}
                          {c.receta_medica && c.receta_medica.length > 0 && (
                            <div className="pt-2 border-t border-border/60 space-y-1.5">
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                <Pill className="size-3" />
                                Prescripción Médica:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {c.receta_medica.map((rec, rIdx) => (
                                  <div key={rIdx} className="p-2 rounded-lg bg-muted/30 border border-border/70 text-xs">
                                    <span className="font-bold text-foreground block">{rec.medicamento}</span>
                                    <span className="text-muted-foreground text-[11px] block">{rec.dosis} • {rec.frecuencia}</span>
                                    {rec.duracion && (
                                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold block">{rec.duracion}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── 2. RECETAS CONSOLIDADAS ────────────────────────── */}
              <TabsContent value="recetas" className="space-y-3 m-0">
                {todasLasRecetas.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Pill className="size-10 mx-auto stroke-1 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No se han emitido recetas todavía para este paciente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {todasLasRecetas.map((r, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Pill className="size-3.5 text-indigo-600" />
                            {r.medicamento}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(r.fecha).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.dosis}</p>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                          <span className="text-teal-700 dark:text-teal-300 font-medium">{r.frecuencia}</span>
                          <span className="font-semibold text-muted-foreground">{r.duracion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── 3. FICHA MÉDICA BASE ────────────────────────────── */}
              <TabsContent value="ficha" className="space-y-4 m-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Antecedentes Personales */}
                  <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
                      Antecedentes Personales Patológicos
                    </span>
                    <p className="text-xs text-foreground leading-relaxed">
                      {paciente.antecedentes_patologicos || 'No refiere patologías crónicas conocidas.'}
                    </p>
                  </div>

                  {/* Antecedentes Familiares */}
                  <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
                      Antecedentes Médicos Familiares
                    </span>
                    <p className="text-xs text-foreground leading-relaxed">
                      {paciente.antecedentes_familiares || 'No refiere antecedentes familiares relevantes.'}
                    </p>
                  </div>

                  {/* Cirugías */}
                  <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
                      Intervenciones Quirúrgicas Previas
                    </span>
                    <p className="text-xs text-foreground leading-relaxed">
                      {paciente.antecedentes_quirurgicos || 'No refiere cirugías previas.'}
                    </p>
                  </div>

                  {/* Medicación Habitual */}
                  <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
                      Medicación de Uso Continuo
                    </span>
                    <p className="text-xs text-foreground leading-relaxed">
                      {paciente.medicacion_habitual || 'No toma medicamentos de forma habitual.'}
                    </p>
                  </div>
                </div>

                {paciente.observaciones_medicas && (
                  <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Observaciones Médicas
                    </span>
                    <p className="text-xs text-foreground leading-relaxed">
                      {paciente.observaciones_medicas}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* ── 4. EMERGENCIA Y SEGURO ──────────────────────────── */}
              <TabsContent value="contacto" className="space-y-4 m-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Contacto de Emergencia */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 space-y-2.5 shadow-2xs">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 uppercase">
                      <PhoneCall className="size-4 text-amber-600" />
                      Contacto de Emergencia
                    </span>
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-foreground block">
                        {paciente.contacto_emergencia_nombre || 'No registrado'}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Parentesco: {paciente.contacto_emergencia_parentesco || 'No especificado'}
                      </span>
                      {paciente.contacto_emergencia_telefono && (
                        <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 block pt-1">
                          📞 {paciente.contacto_emergencia_telefono}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cobertura Médica */}
                  <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2.5 shadow-2xs">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase">
                      <ShieldCheck className="size-4 text-teal-600" />
                      Póliza y Aseguradora
                    </span>
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-foreground block">
                        {paciente.seguro_medico || 'Particular / Sin seguro'}
                      </span>
                      {paciente.numero_poliza && (
                        <span className="text-xs text-muted-foreground block font-mono">
                          Póliza: {paciente.numero_poliza}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] mt-1">
                        Sede de Registro: {paciente.sucursal_nombre || 'Sede Central'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientRecordDrawer;
