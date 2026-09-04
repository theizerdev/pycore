import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Printer,
  FileText,
  Pill,
  FlaskConical,
  BedDouble,
  FileCheck2,
  Calendar,
  User,
  UserCheck,
  Stethoscope,
  Building2,
  Phone,
  Mail,
  Clock,
  Sparkles,
  Download,
  AlertCircle,
} from 'lucide-react';
import type { ConsultaMedica, MedicamentoPrescrito, EstudioSolicitado } from '../../api/consultas';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export type TipoDocumentoClinico =
  | 'informe'
  | 'receta'
  | 'estudios'
  | 'reposo'
  | 'constancia';

interface DocumentosImpresionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consulta: ConsultaMedica | null;
  initialDocumento?: TipoDocumentoClinico;
}

export const DocumentosImpresionModal: React.FC<DocumentosImpresionModalProps> = ({
  open,
  onOpenChange,
  consulta,
  initialDocumento = 'informe',
}) => {
  const { user, sucursalActiva } = useAuth();
  const [documentoActivo, setDocumentoActivo] = useState<TipoDocumentoClinico>(initialDocumento);

  // Sincronizar documento inicial cuando se abre el modal
  React.useEffect(() => {
    if (open) {
      setDocumentoActivo(initialDocumento);
    }
  }, [open, initialDocumento]);

  if (!consulta) return null;

  const paciente = consulta.paciente;
  const medico = consulta.medico;
  const especialidad = consulta.especialidad;
  const sucursal = consulta.sucursal || sucursalActiva;
  const empresaNombre = user?.empresa?.nombre || 'MEDISOFT CLÍNICA';

  const nombrePaciente = paciente
    ? `${paciente.nombres} ${paciente.apellidos}`.trim()
    : 'Paciente No Identificado';

  const documentoPaciente = paciente?.documento_identidad || paciente?.numero_documento || 'S/N';
  const tipoDoc = paciente?.tipo_documento || 'CI/DNI';

  const nombreMedico = medico
    ? `Dr(a). ${medico.nombres} ${medico.apellidos}`
    : `Dr(a). ${user?.nombres || ''} ${user?.apellidos || ''}`.trim() || 'Médico Tratante';

  const colegiadoMedico = medico?.numero_colegiado || 'C.M. REGISTRADO';
  const especialidadNombre = especialidad?.nombre || 'Medicina General';

  const fechaConsultaFormateada = (() => {
    try {
      const f = consulta.fecha_consulta || new Date().toISOString();
      const parts = f.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return f;
    } catch {
      return consulta.fecha_consulta;
    }
  })();

  const fechaHoyFormateada = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const horaActual = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  const documentosList = [
    {
      id: 'informe' as TipoDocumentoClinico,
      label: 'Informe Médico',
      shortLabel: 'Informe',
      icon: FileText,
      color: 'text-sky-600 bg-sky-500/10 border-sky-500/30',
      description: 'Epicrisis, evolución, diagnóstico CIE-10 y plan de tratamiento',
    },
    {
      id: 'receta' as TipoDocumentoClinico,
      label: 'Receta Médica',
      shortLabel: 'Receta / Rx',
      icon: Pill,
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
      badge: `${consulta.receta_medica?.length || 0} medicamentos`,
      description: 'Prescripción farmacológica con posología y duración',
    },
    {
      id: 'estudios' as TipoDocumentoClinico,
      label: 'Orden de Estudios',
      shortLabel: 'Exámenes',
      icon: FlaskConical,
      color: 'text-violet-600 bg-violet-500/10 border-violet-500/30',
      badge: `${consulta.estudios_solicitados?.length || 0} estudios`,
      description: 'Solicitud de exámenes de laboratorio e imágenes diagnósticas',
    },
    {
      id: 'reposo' as TipoDocumentoClinico,
      label: 'Reposo Médico',
      shortLabel: 'Reposo',
      icon: BedDouble,
      color: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
      badge: consulta.reposo_medico?.requiere_reposo
        ? `${consulta.reposo_medico.dias_reposo || 0} días`
        : 'Opcional',
      description: 'Certificado de incapacidad o reposo médico laboral/académico',
    },
    {
      id: 'constancia' as TipoDocumentoClinico,
      label: 'Constancia de Asistencia',
      shortLabel: 'Asistencia',
      icon: FileCheck2,
      color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/30',
      description: 'Certificado formal de asistencia a consulta médica',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl">
        {/* Cabecera del Modal (No visible en impresión) */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Impresión de Documentos Clínicos
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Paciente: <strong className="text-foreground font-semibold">{nombrePaciente}</strong> | Cédula: {tipoDoc} {documentoPaciente} | Código:{' '}
              <span className="font-mono text-primary">{consulta.codigo || `CON-${consulta.id}`}</span>
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              onClick={handlePrint}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 px-5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Documento</span>
            </Button>
          </div>
        </div>

        {/* Barra de Selector de Documentos (No visible en impresión) */}
        <div className="px-4 sm:px-6 py-2.5 bg-muted/40 border-b border-border/70 flex items-center gap-2 overflow-x-auto shrink-0 print:hidden">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
            Documento:
          </span>
          {documentosList.map((doc) => {
            const Icon = doc.icon;
            const isSelected = documentoActivo === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setDocumentoActivo(doc.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border-border/80'
                )}
              >
                <Icon className={cn('h-4 w-4', isSelected ? 'text-primary-foreground' : 'text-primary')} />
                <span>{doc.label}</span>
                {doc.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                      isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {doc.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenedor Principal con Scroll y Hoja de Impresión */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-100 dark:bg-zinc-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {/* ── HOJA IMPRIMIBLE (ESTILO HOJA MEMBRETADA) ── */}
          <div
            id="area-imprimible-clinica"
            className="w-full max-w-[800px] bg-white text-zinc-900 dark:bg-white dark:text-zinc-900 p-8 sm:p-12 rounded-xl shadow-xl print:shadow-none print:p-6 print:max-w-none print:w-full border border-zinc-200 print:border-none space-y-6 min-h-[900px] flex flex-col justify-between"
          >
            {/* ── CABECERA / MEMBRETE CLÍNICO ── */}
            <div>
              <div className="flex items-start justify-between border-b-2 border-primary/40 pb-5 gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary text-white font-black text-2xl shadow-sm">
                    <Stethoscope className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
                      {empresaNombre}
                    </h1>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                      Centro de Especialidades Médicas & Salud Integral
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                      <span>{sucursal?.nombre || 'Sede Principal'}</span>
                      <span>•</span>
                      <span>Atención Especializada</span>
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="inline-block px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-lg uppercase tracking-wider border border-primary/20">
                    {documentoActivo === 'informe' && 'INFORME MÉDICO CLÍNICO'}
                    {documentoActivo === 'receta' && 'RECETA MÉDICA / PRESCRIPCIÓN'}
                    {documentoActivo === 'estudios' && 'ORDEN DE ESTUDIOS Y EXÁMENES'}
                    {documentoActivo === 'reposo' && 'CERTIFICADO DE REPOSO MÉDICO'}
                    {documentoActivo === 'constancia' && 'CONSTANCIA DE ASISTENCIA'}
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Folio: <strong>{consulta.codigo || `CON-${consulta.id}`}</strong>
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Fecha: <strong>{fechaConsultaFormateada}</strong>
                  </p>
                </div>
              </div>

              {/* ── DATOS DEL PACIENTE Y MÉDICO ── */}
              <div className="grid grid-cols-2 gap-4 py-4 px-4 my-4 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs">
                {/* Columna Paciente */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Datos del Paciente
                  </p>
                  <p className="font-bold text-sm text-zinc-900">{nombrePaciente}</p>
                  <div className="grid grid-cols-2 gap-x-2 text-zinc-600 text-[11px]">
                    <p>
                      <strong className="text-zinc-700">Documento:</strong> {tipoDoc} {documentoPaciente}
                    </p>
                    <p>
                      <strong className="text-zinc-700">Edad:</strong> {paciente?.edad ? `${paciente.edad} años` : 'N/E'}
                    </p>
                    <p>
                      <strong className="text-zinc-700">Género:</strong> {paciente?.genero || 'No especificado'}
                    </p>
                    {paciente?.telefono && (
                      <p>
                        <strong className="text-zinc-700">Teléfono:</strong> {paciente.telefono}
                      </p>
                    )}
                  </div>
                </div>

                {/* Columna Médico */}
                <div className="space-y-1 border-l border-zinc-200 pl-4">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Médico Especialista
                  </p>
                  <p className="font-bold text-sm text-zinc-900">{nombreMedico}</p>
                  <div className="space-y-0.5 text-zinc-600 text-[11px]">
                    <p>
                      <strong className="text-zinc-700">Especialidad:</strong> {especialidadNombre}
                    </p>
                    <p>
                      <strong className="text-zinc-700">C.M. / Licencia:</strong> {colegiadoMedico}
                    </p>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── CUERPO ESPECÍFICO SEGÚN EL TIPO DE DOCUMENTO ───────── */}
              {/* ══════════════════════════════════════════════════════════ */}

              {/* ── 1. INFORME MÉDICO ── */}
              {documentoActivo === 'informe' && (
                <div className="space-y-4 text-xs text-zinc-800">
                  {/* Motivo de Consulta & Enfermedad Actual */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-zinc-900 uppercase text-[11px] border-b border-zinc-200 pb-1 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        Motivo de Consulta & Anamnesis
                      </h3>
                      <p className="mt-1.5 text-zinc-700 leading-relaxed font-medium">
                        <strong className="text-zinc-900">Motivo:</strong> {consulta.motivo_consulta || 'No especificado'}
                      </p>
                      {consulta.enfermedad_actual && (
                        <p className="mt-1 text-zinc-700 leading-relaxed">
                          <strong className="text-zinc-900">Enfermedad Actual:</strong> {consulta.enfermedad_actual}
                        </p>
                      )}
                    </div>

                    {/* Signos Vitales */}
                    {consulta.signos_vitales && Object.keys(consulta.signos_vitales).length > 0 && (
                      <div>
                        <h3 className="font-bold text-zinc-900 uppercase text-[11px] border-b border-zinc-200 pb-1">
                          Signos Vitales y Parámetros Basales
                        </h3>
                        <div className="grid grid-cols-4 gap-2 mt-2 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px]">
                          {consulta.signos_vitales.peso && (
                            <div>
                              <span className="text-zinc-500">Peso:</span>{' '}
                              <strong>{consulta.signos_vitales.peso} kg</strong>
                            </div>
                          )}
                          {consulta.signos_vitales.talla && (
                            <div>
                              <span className="text-zinc-500">Talla:</span>{' '}
                              <strong>{consulta.signos_vitales.talla} cm</strong>
                            </div>
                          )}
                          {consulta.signos_vitales.temperatura && (
                            <div>
                              <span className="text-zinc-500">Temp:</span>{' '}
                              <strong>{consulta.signos_vitales.temperatura} °C</strong>
                            </div>
                          )}
                          {consulta.signos_vitales.presion_sistolica && consulta.signos_vitales.presion_diastolica && (
                            <div>
                              <span className="text-zinc-500">P.A.:</span>{' '}
                              <strong>
                                {consulta.signos_vitales.presion_sistolica}/{consulta.signos_vitales.presion_diastolica} mmHg
                              </strong>
                            </div>
                          )}
                          {consulta.signos_vitales.frecuencia_cardiaca && (
                            <div>
                              <span className="text-zinc-500">F.C.:</span>{' '}
                              <strong>{consulta.signos_vitales.frecuencia_cardiaca} lpm</strong>
                            </div>
                          )}
                          {consulta.signos_vitales.frecuencia_respiratoria && (
                            <div>
                              <span className="text-zinc-500">F.R.:</span>{' '}
                              <strong>{consulta.signos_vitales.frecuencia_respiratoria} rpm</strong>
                            </div>
                          )}
                          {consulta.signos_vitales.saturacion_oxigeno && (
                            <div>
                              <span className="text-zinc-500">SpO2:</span>{' '}
                              <strong>{consulta.signos_vitales.saturacion_oxigeno}%</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Diagnósticos */}
                    <div>
                      <h3 className="font-bold text-zinc-900 uppercase text-[11px] border-b border-zinc-200 pb-1 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Impresión Diagnóstica (CIE-10)
                      </h3>
                      <div className="mt-2 space-y-1">
                        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="font-bold text-primary text-xs">
                            Diagnóstico Principal: {consulta.diagnostico_principal || 'Sin diagnóstico registrado'}
                          </p>
                        </div>
                        {consulta.diagnosticos_secundarios && consulta.diagnosticos_secundarios.length > 0 && (
                          <div className="pl-2 space-y-0.5 mt-1">
                            <span className="text-[11px] font-semibold text-zinc-600">Diagnósticos Secundarios:</span>
                            {consulta.diagnosticos_secundarios.map((diag, idx) => (
                              <p key={idx} className="text-[11px] text-zinc-700">
                                • {typeof diag === 'string' ? diag : diag?.descripcion || diag?.codigo}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Plan de Tratamiento e Indicaciones */}
                    <div>
                      <h3 className="font-bold text-zinc-900 uppercase text-[11px] border-b border-zinc-200 pb-1">
                        Plan de Tratamiento y Conducta Médica
                      </h3>
                      <p className="mt-1.5 text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {consulta.plan_tratamiento || 'Tratamiento sintomático según prescripción adjunta.'}
                      </p>
                      {consulta.indicaciones_generales && (
                        <p className="mt-1.5 text-zinc-700 whitespace-pre-wrap leading-relaxed">
                          <strong className="text-zinc-900">Indicaciones:</strong> {consulta.indicaciones_generales}
                        </p>
                      )}
                    </div>

                    {/* Referencia / Observaciones Adicionales */}
                    {(consulta.referido_para || consulta.observaciones_adicionales) && (
                      <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1 text-[11px]">
                        {consulta.referido_para && (
                          <p>
                            <strong className="text-zinc-900">Referido a:</strong> {consulta.referido_para}
                          </p>
                        )}
                        {consulta.observaciones_adicionales && (
                          <p>
                            <strong className="text-zinc-900">Observaciones:</strong> {consulta.observaciones_adicionales}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 2. RECETA MÉDICA (RX) ── */}
              {documentoActivo === 'receta' && (
                <div className="space-y-5 text-xs text-zinc-800">
                  <div className="flex items-center justify-between border-b-2 border-primary/30 pb-2">
                    <span className="font-serif font-black text-3xl text-primary tracking-tighter">
                      ℞
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase">
                      Prescripción Farmacológica
                    </span>
                  </div>

                  {/* Tabla / Lista de Medicamentos */}
                  {consulta.receta_medica && consulta.receta_medica.length > 0 ? (
                    <div className="space-y-4">
                      {consulta.receta_medica.map((med: MedicamentoPrescrito, idx: number) => (
                        <div
                          key={med.id || idx}
                          className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-1.5"
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="font-bold text-sm text-zinc-900">
                              {idx + 1}. {med.medicamento}
                            </span>
                            {med.presentacion && (
                              <span className="text-xs font-semibold text-primary">
                                {med.presentacion}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-zinc-700 bg-white p-2 rounded-lg border border-zinc-200/60">
                            <div>
                              <span className="text-zinc-500">Dosis:</span>{' '}
                              <strong>{med.dosis || '1 unidad'}</strong>
                            </div>
                            <div>
                              <span className="text-zinc-500">Vía:</span>{' '}
                              <strong>{med.via_administracion || 'Oral'}</strong>
                            </div>
                            <div>
                              <span className="text-zinc-500">Frecuencia:</span>{' '}
                              <strong>{med.frecuencia || 'Según indicación'}</strong>
                            </div>
                            {med.duracion && (
                              <div>
                                <span className="text-zinc-500">Duración:</span>{' '}
                                <strong>{med.duracion}</strong>
                              </div>
                            )}
                          </div>

                          {med.instrucciones && (
                            <p className="text-[11px] text-zinc-600 italic mt-1">
                              <strong>Instrucciones:</strong> {med.instrucciones}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-xl text-zinc-500">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2 text-zinc-400" />
                      <p className="font-semibold text-xs">No se registraron medicamentos en esta consulta médica.</p>
                    </div>
                  )}

                  {/* Indicaciones Generales */}
                  {consulta.indicaciones_generales && (
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <h4 className="font-bold text-[11px] text-zinc-900 uppercase mb-1">
                        Indicaciones y Cuidados Generales
                      </h4>
                      <p className="text-[11px] text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {consulta.indicaciones_generales}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. ORDEN DE ESTUDIOS ── */}
              {documentoActivo === 'estudios' && (
                <div className="space-y-5 text-xs text-zinc-800">
                  <div className="border-b-2 border-primary/30 pb-2">
                    <h3 className="font-bold text-sm text-zinc-900 uppercase flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-primary" />
                      Solicitud de Exámenes y Estudios Complementarios
                    </h3>
                  </div>

                  {consulta.estudios_solicitados && consulta.estudios_solicitados.length > 0 ? (
                    <div className="space-y-3">
                      {consulta.estudios_solicitados.map((est: EstudioSolicitado, idx: number) => (
                        <div
                          key={est.id || idx}
                          className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-zinc-900">
                              {idx + 1}. {est.nombre}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {est.urgente && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                                  URGENTE
                                </span>
                              )}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {est.categoria || 'Laboratorio'}
                              </span>
                            </div>
                          </div>

                          {est.justificacion_clinica && (
                            <p className="text-[11px] text-zinc-600">
                              <strong>Justificación Diagnóstica:</strong> {est.justificacion_clinica}
                            </p>
                          )}

                          {est.indicaciones_preparacion && (
                            <p className="text-[11px] text-zinc-600 italic">
                              <strong>Preparación previa:</strong> {est.indicaciones_preparacion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-xl text-zinc-500">
                      <FlaskConical className="h-6 w-6 mx-auto mb-2 text-zinc-400" />
                      <p className="font-semibold text-xs">No se solicitaron estudios o exámenes en esta consulta.</p>
                    </div>
                  )}

                  {consulta.diagnostico_principal && (
                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                      <strong>Diagnóstico Presuntivo:</strong> {consulta.diagnostico_principal}
                    </div>
                  )}
                </div>
              )}

              {/* ── 4. REPOSO MÉDICO ── */}
              {documentoActivo === 'reposo' && (
                <div className="space-y-6 text-xs text-zinc-800 py-4">
                  <div className="text-center space-y-1 pb-4 border-b border-zinc-200">
                    <h2 className="text-base font-black uppercase text-zinc-900 tracking-wider">
                      CERTIFICADO DE REPOSO MÉDICO
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Constancia de Incapacidad Temporal para Labores y/o Actividades Académicas
                    </p>
                  </div>

                  <div className="text-justify leading-relaxed text-sm text-zinc-800 space-y-4 px-2">
                    <p>
                      El que suscribe, <strong className="text-zinc-950 font-bold">{nombreMedico}</strong>, médico especialista en{' '}
                      <strong className="text-zinc-950 font-bold">{especialidadNombre}</strong>, debidamente registrado ante las autoridades sanitarias bajo la credencial / colegiatura{' '}
                      <strong className="text-zinc-950 font-bold">{colegiadoMedico}</strong>:
                    </p>

                    <p className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                      <strong>HACE CONSTAR QUE:</strong>
                      <br />
                      Habiendo evaluado clínicamente en la fecha al paciente{' '}
                      <strong className="text-zinc-950 font-bold">{nombrePaciente}</strong>, titular del documento de identidad{' '}
                      <strong className="text-zinc-950 font-bold">{tipoDoc} {documentoPaciente}</strong>, de{' '}
                      <strong>{paciente?.edad ? `${paciente.edad} años` : 'edad no registrada'}</strong>, quien presenta un cuadro clínico compatible con{' '}
                      <strong className="text-primary font-bold">
                        {consulta.reposo_medico?.motivo_diagnostico || consulta.diagnostico_principal || 'Afección clínica en estudio'}
                      </strong>.
                    </p>

                    <p>
                      Por tal motivo, se le prescribe <strong className="text-zinc-950 font-bold">REPOSO MÉDICO ABSOLUTO</strong> durante un período de{' '}
                      <strong className="text-zinc-950 font-bold">
                        {consulta.reposo_medico?.dias_reposo || 1} ({consulta.reposo_medico?.dias_reposo === 1 ? 'un día' : `${consulta.reposo_medico?.dias_reposo || 1} días`})
                      </strong>, a partir del{' '}
                      <strong>{consulta.reposo_medico?.fecha_inicio || fechaConsultaFormateada}</strong> hasta el{' '}
                      <strong>{consulta.reposo_medico?.fecha_fin || fechaConsultaFormateada}</strong> inclusive, debiendo reintegrarse a sus actividades habituales al finalizar dicho período, salvo nueva indicación facultativa.
                    </p>

                    {consulta.reposo_medico?.observaciones && (
                      <p className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                        <strong>Observaciones adicionales:</strong> {consulta.reposo_medico.observaciones}
                      </p>
                    )}

                    <p className="text-xs text-zinc-500 pt-2">
                      Constancia que se expide a solicitud de la parte interesada en la ciudad correspondiente, a los{' '}
                      {fechaHoyFormateada}.
                    </p>
                  </div>
                </div>
              )}

              {/* ── 5. CONSTANCIA DE ASISTENCIA ── */}
              {documentoActivo === 'constancia' && (
                <div className="space-y-6 text-xs text-zinc-800 py-4">
                  <div className="text-center space-y-1 pb-4 border-b border-zinc-200">
                    <h2 className="text-base font-black uppercase text-zinc-900 tracking-wider">
                      CONSTANCIA DE ASISTENCIA A CONSULTA MÉDICA
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Justificante de Atención Facultativa en Consulta Externa
                    </p>
                  </div>

                  <div className="text-justify leading-relaxed text-sm text-zinc-800 space-y-4 px-2">
                    <p>
                      Por medio de la presente, el servicio de <strong className="text-zinc-950 font-bold">{especialidadNombre}</strong> de{' '}
                      <strong className="text-zinc-950 font-bold">{empresaNombre}</strong> ({sucursal?.nombre || 'Sede Principal'}):
                    </p>

                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                      <p className="font-bold text-xs uppercase tracking-wider text-zinc-500">
                        CERTIFICA QUE:
                      </p>
                      <p className="text-zinc-900">
                        El(la) ciudadano(a) <strong className="text-zinc-950 font-bold">{nombrePaciente}</strong>, portador(a) del documento de identidad{' '}
                        <strong className="text-zinc-950 font-bold">{tipoDoc} {documentoPaciente}</strong>, acudió y permaneció en nuestras instalaciones el día{' '}
                        <strong className="text-zinc-950 font-bold">{fechaConsultaFormateada}</strong> a fin de recibir atención médica especializada, habiendo sido atendido(a) por el profesional médico{' '}
                        <strong className="text-zinc-950 font-bold">{nombreMedico}</strong> (Colegiado: {colegiadoMedico}).
                      </p>
                    </div>

                    <p>
                      Se deja constancia de que el paciente asistió a consulta médica para evaluación, diagnóstico y prescripción de tratamiento médico respectivo.
                    </p>

                    <p className="text-xs text-zinc-500 pt-4">
                      Se expide la presente constancia a petición de la parte interesada para los fines legales, laborales o académicos que estime convenientes, en fecha {fechaHoyFormateada}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── PIE DE PÁGINA: FIRMA Y SELLO MÉDICO ── */}
            <div className="pt-10 border-t border-zinc-200">
              <div className="grid grid-cols-2 gap-8 items-end">
                {/* Leyenda y Sello institucional */}
                <div className="text-[10px] text-zinc-500 space-y-0.5">
                  <p className="font-bold text-zinc-700">{empresaNombre}</p>
                  <p>{sucursal?.nombre || 'Atención Médica Integral'}</p>
                  <p>Documento de validez clínica y legal emitido a través de sistema digital.</p>
                  <p className="font-mono text-[9px] text-zinc-400">Verificación: {consulta.codigo || `CON-${consulta.id}`}</p>
                </div>

                {/* Firma y Sello del Médico */}
                <div className="text-center space-y-1">
                  <div className="w-56 mx-auto border-b border-zinc-400 pb-12 mb-1" />
                  <p className="font-bold text-xs text-zinc-900">{nombreMedico}</p>
                  <p className="text-[11px] text-zinc-600">{especialidadNombre}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">C.M. / Lic: {colegiadoMedico}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentosImpresionModal;
