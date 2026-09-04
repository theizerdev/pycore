import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  UserPlus,
  UserX,
  Users,
  Stethoscope,
  Building2,
  Phone,
  Mail,
  Clock,
  Sparkles,
  Download,
  AlertCircle,
  Check,
  HeartHandshake,
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

  // Estados para Acompañante en Constancia de Asistencia
  const [modalAcompananteOpen, setModalAcompananteOpen] = useState(false);
  const [tieneAcompanante, setTieneAcompanante] = useState(false);
  const [datosAcompanante, setDatosAcompanante] = useState({
    nombres: '',
    apellidos: '',
    documento: '',
    parentesco: 'Familiar',
    otroParentesco: '',
  });

  // Estado temporal de edición para la ventana modal
  const [tempTieneAcompanante, setTempTieneAcompanante] = useState(false);
  const [tempDatosAcompanante, setTempDatosAcompanante] = useState({
    nombres: '',
    apellidos: '',
    documento: '',
    parentesco: 'Familiar',
    otroParentesco: '',
  });

  // Sincronizar documento inicial cuando se abre el modal
  React.useEffect(() => {
    if (open) {
      setDocumentoActivo(initialDocumento);
      if (initialDocumento === 'constancia') {
        setTempTieneAcompanante(tieneAcompanante);
        setTempDatosAcompanante(datosAcompanante);
        setModalAcompananteOpen(true);
      }
    }
  }, [open, initialDocumento]);

  const handleSelectDocumento = (docId: TipoDocumentoClinico) => {
    setDocumentoActivo(docId);
    if (docId === 'constancia') {
      setTempTieneAcompanante(tieneAcompanante);
      setTempDatosAcompanante(datosAcompanante);
      setModalAcompananteOpen(true);
    }
  };

  const handleGuardarAcompanante = () => {
    setTieneAcompanante(tempTieneAcompanante);
    setDatosAcompanante(tempDatosAcompanante);
    setModalAcompananteOpen(false);
  };

  const handleCargarContactoEmergencia = () => {
    if (!consulta?.paciente?.contacto_emergencia_nombre) return;
    const nombreCompleto = consulta.paciente.contacto_emergencia_nombre.trim();
    const partes = nombreCompleto.split(' ');
    let nombres = '';
    let apellidos = '';
    if (partes.length === 1) {
      nombres = partes[0];
    } else if (partes.length === 2) {
      nombres = partes[0];
      apellidos = partes[1];
    } else {
      nombres = partes.slice(0, -1).join(' ');
      apellidos = partes.slice(-1).join(' ');
    }

    setTempTieneAcompanante(true);
    setTempDatosAcompanante((prev) => ({
      ...prev,
      nombres: nombres || nombreCompleto,
      apellidos: apellidos || '',
      parentesco: consulta.paciente?.contacto_emergencia_parentesco || 'Familiar',
    }));
  };

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

  const edadPacienteFormateada = (() => {
    if (!paciente) return 'N/E';
    if (paciente.edad_texto && paciente.edad_texto.trim()) {
      return paciente.edad_texto;
    }
    if (paciente.edad !== undefined && paciente.edad !== null && paciente.edad > 0) {
      return `${paciente.edad} ${paciente.edad === 1 ? 'año' : 'años'}`;
    }
    if (paciente.fecha_nacimiento) {
      try {
        const rawDate = String(paciente.fecha_nacimiento).split('T')[0];
        const parts = rawDate.split('-');
        if (parts.length === 3) {
          const birthYear = parseInt(parts[0], 10);
          const birthMonth = parseInt(parts[1], 10) - 1;
          const birthDay = parseInt(parts[2], 10);
          const birth = new Date(birthYear, birthMonth, birthDay);
          const today = new Date();

          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          if (age > 0) {
            return `${age} ${age === 1 ? 'año' : 'años'}`;
          }
          // Menor a 1 año: calcular meses
          let months =
            (today.getFullYear() - birth.getFullYear()) * 12 +
            (today.getMonth() - birth.getMonth());
          if (today.getDate() < birth.getDate()) {
            months--;
          }
          if (months > 0) {
            return `${months} ${months === 1 ? 'mes' : 'meses'}`;
          }
          const diffTime = Math.abs(today.getTime() - birth.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return `${diffDays > 0 ? diffDays : 1} ${diffDays === 1 ? 'día' : 'días'}`;
        }
      } catch (e) {
        console.error('Error calculando edad:', e);
      }
    }
    return paciente.edad ? `${paciente.edad} años` : 'N/E';
  })();

  const nombreMedico = medico
    ? `Dr(a). ${medico.nombres} ${medico.apellidos}`
    : `Dr(a). ${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Médico Tratante';

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
    const printableElement = document.getElementById('area-imprimible-clinica');
    if (!printableElement) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=900,height=1050');
    if (!printWin) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    const tituloDocumento =
      {
        informe: `Informe_Medico_${consulta.codigo || consulta.id}`,
        receta: `Receta_Medica_${consulta.codigo || consulta.id}`,
        estudios: `Orden_Estudios_${consulta.codigo || consulta.id}`,
        reposo: `Reposo_Medico_${consulta.codigo || consulta.id}`,
        constancia: `Constancia_Asistencia_${consulta.codigo || consulta.id}`,
      }[documentoActivo] || 'Documento_Clinico';

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${tituloDocumento}</title>
          ${styles}
          <style>
            @page {
              size: letter portrait;
              margin: 6mm 10mm 6mm 10mm;
            }
            body {
              background-color: white !important;
              color: #18181b !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #area-imprimible-clinica {
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
              min-height: auto !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          </style>
        </head>
        <body class="bg-white text-zinc-900">
          <div id="area-imprimible-clinica" class="p-4">
            ${printableElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
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
                onClick={() => handleSelectDocumento(doc.id)}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          {/* Banner informativo de acompañante para constancia (No imprimible) */}
          {documentoActivo === 'constancia' && (
            <div className="w-full max-w-[780px] mb-3 p-3.5 rounded-xl border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-xl shrink-0 shadow-xs flex items-center justify-center',
                    tieneAcompanante
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  {tieneAcompanante ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">
                      {tieneAcompanante
                        ? `Constancia con Acompañante: ${datosAcompanante.nombres} ${datosAcompanante.apellidos}`.trim()
                        : 'Constancia Individual (Sin Acompañante)'}
                    </p>
                    <Badge
                      variant={tieneAcompanante ? 'default' : 'secondary'}
                      className={cn(
                        'text-[10px] px-2 py-0.2',
                        tieneAcompanante ? 'bg-indigo-600 hover:bg-indigo-600 text-white' : ''
                      )}
                    >
                      {tieneAcompanante ? 'Con Acompañante' : 'Solo Paciente'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {tieneAcompanante
                      ? `C.I / Doc: ${datosAcompanante.documento || 'No especificado'} • Parentesco: ${
                          datosAcompanante.parentesco === 'Otro'
                            ? datosAcompanante.otroParentesco || 'Acompañante'
                            : datosAcompanante.parentesco
                        }`
                      : 'La constancia solo acredita al paciente. Si acudió con un familiar o tutor, puede incluirlo aquí.'}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant={tieneAcompanante ? 'outline' : 'default'}
                onClick={() => {
                  setTempTieneAcompanante(tieneAcompanante);
                  setTempDatosAcompanante(datosAcompanante);
                  setModalAcompananteOpen(true);
                }}
                className={cn(
                  'shrink-0 font-bold gap-1.5 shadow-xs cursor-pointer',
                  tieneAcompanante
                    ? 'border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                )}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{tieneAcompanante ? 'Modificar Acompañante' : 'Configurar Acompañante'}</span>
              </Button>
            </div>
          )}

          {/* ── HOJA IMPRIMIBLE (ESTILO HOJA MEMBRETADA COMPACTA 1 PÁGINA) ── */}
          <div
            id="area-imprimible-clinica"
            className="w-full max-w-[780px] bg-white text-zinc-900 dark:bg-white dark:text-zinc-900 p-6 sm:p-8 rounded-xl shadow-xl print:shadow-none print:p-4 print:max-w-none print:w-full border border-zinc-200 print:border-none space-y-3.5 flex flex-col justify-between text-[11px]"
          >
            {/* ── CABECERA / MEMBRETE CLÍNICO ── */}
            <div>
              <div className="flex items-start justify-between border-b-2 border-primary/40 pb-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black text-xl shadow-sm">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-black text-zinc-900 tracking-tight uppercase leading-tight">
                      {empresaNombre}
                    </h1>
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                      Centro de Especialidades Médicas & Salud Integral
                    </p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                      <span>{sucursal?.nombre || 'Sede Principal'}</span>
                      <span>•</span>
                      <span>Atención Especializada</span>
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary font-bold text-[10px] rounded-md uppercase tracking-wider border border-primary/20">
                    {documentoActivo === 'informe' && 'INFORME MÉDICO CLÍNICO'}
                    {documentoActivo === 'receta' && 'RECETA MÉDICA / PRESCRIPCIÓN'}
                    {documentoActivo === 'estudios' && 'ORDEN DE ESTUDIOS Y EXÁMENES'}
                    {documentoActivo === 'reposo' && 'CERTIFICADO DE REPOSO MÉDICO'}
                    {documentoActivo === 'constancia' && 'CONSTANCIA DE ASISTENCIA'}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Folio: <strong>{consulta.codigo || `CON-${consulta.id}`}</strong>
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Fecha: <strong>{fechaConsultaFormateada}</strong>
                  </p>
                </div>
              </div>

              {/* ── DATOS DEL PACIENTE Y MÉDICO ── */}
              <div className="grid grid-cols-2 gap-3 py-2.5 px-3 my-2.5 bg-zinc-50 rounded-lg border border-zinc-200/80 text-[10.5px]">
                {/* Columna Paciente */}
                <div className="space-y-0.5">
                  <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                    Datos del Paciente
                  </p>
                  <p className="font-bold text-xs text-zinc-900">{nombrePaciente}</p>
                  <div className="grid grid-cols-2 gap-x-2 text-zinc-600 text-[10px]">
                    <p>
                      <strong className="text-zinc-700">Documento:</strong> {tipoDoc} {documentoPaciente}
                    </p>
                    <p>
                      <strong className="text-zinc-700">Edad:</strong> {edadPacienteFormateada}
                    </p>
                    <p>
                      <strong className="text-zinc-700">Género:</strong> {paciente?.genero || 'N/E'}
                    </p>
                    {paciente?.telefono && (
                      <p>
                        <strong className="text-zinc-700">Tel:</strong> {paciente.telefono}
                      </p>
                    )}
                  </div>
                </div>

                {/* Columna Médico */}
                <div className="space-y-0.5 border-l border-zinc-200 pl-3">
                  <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                    Médico Especialista
                  </p>
                  <p className="font-bold text-xs text-zinc-900">{nombreMedico}</p>
                  <div className="space-y-0 text-zinc-600 text-[10px]">
                    <p>
                      <strong className="text-zinc-700">Especialidad:</strong> {especialidadNombre}
                    </p>
                    <p>
                      <strong className="text-zinc-700">C.M. / Lic:</strong> {colegiadoMedico}
                    </p>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── CUERPO ESPECÍFICO SEGÚN EL TIPO DE DOCUMENTO ───────── */}
              {/* ══════════════════════════════════════════════════════════ */}

              {/* ── 1. INFORME MÉDICO ── */}
              {documentoActivo === 'informe' && (() => {
                // Consolidación de Signos Vitales
                const sv = {
                  peso: consulta.signos_vitales?.peso || consulta.datos_plantilla?.peso,
                  talla: consulta.signos_vitales?.talla || consulta.datos_plantilla?.talla,
                  temperatura: consulta.signos_vitales?.temperatura || consulta.datos_plantilla?.temperatura,
                  presion_sistolica:
                    consulta.signos_vitales?.presion_sistolica ||
                    consulta.datos_plantilla?.presion_sistolica ||
                    consulta.datos_plantilla?.ta_sistolica,
                  presion_diastolica:
                    consulta.signos_vitales?.presion_diastolica ||
                    consulta.datos_plantilla?.presion_diastolica ||
                    consulta.datos_plantilla?.ta_diastolica,
                  frecuencia_cardiaca:
                    consulta.signos_vitales?.frecuencia_cardiaca ||
                    consulta.datos_plantilla?.frecuencia_cardiaca,
                  frecuencia_respiratoria:
                    consulta.signos_vitales?.frecuencia_respiratoria ||
                    consulta.datos_plantilla?.frecuencia_respiratoria,
                  saturacion_oxigeno:
                    consulta.signos_vitales?.saturacion_oxigeno ||
                    consulta.datos_plantilla?.saturacion_oxigeno ||
                    consulta.datos_plantilla?.saturacion_o2,
                  imc: consulta.signos_vitales?.imc || consulta.datos_plantilla?.imc,
                };

                if (!sv.imc && sv.peso && sv.talla) {
                  const tM = Number(sv.talla) > 3 ? Number(sv.talla) / 100 : Number(sv.talla);
                  const pKg = Number(sv.peso);
                  if (tM > 0 && pKg > 0) {
                    sv.imc = (pKg / (tM * tM)).toFixed(1);
                  }
                }

                const tieneSignosVitales = Object.values(sv).some(
                  (v) => v !== undefined && v !== null && String(v).trim() !== ''
                );

                // Claves de sistema / anamnesis / signos vitales que NO deben duplicarse en "Hallazgos de Especialidad"
                const CLAVES_IGNORADAS = new Set([
                  'peso',
                  'talla',
                  'temperatura',
                  'ta_sistolica',
                  'ta_diastolica',
                  'presion_sistolica',
                  'presion_diastolica',
                  'frecuencia_cardiaca',
                  'frecuencia_respiratoria',
                  'saturacion_oxigeno',
                  'saturacion_o2',
                  'imc',
                  'masa_corporal',
                  'signos_vitales',
                  'pa',
                  'pulso',
                  'motivo_consulta',
                  'enfermedad_actual',
                  'preconsulta_completada_at',
                  'preconsulta_id',
                  'token',
                  'referido_para',
                  'observaciones_adicionales',
                  'estado',
                  'created_at',
                  'updated_at',
                  'id',
                  'empresa_id',
                  'paciente_id',
                  'medico_id',
                  'especialidad_id',
                  'sucursal_id',
                  'cita_id',
                ]);

                const isValidVal = (val: any) => {
                  if (val === null || val === undefined) return false;
                  if (typeof val === 'object') return false;
                  const s = String(val).trim();
                  if (!s) return false;
                  const lower = s.toLowerCase();
                  return !['n/a', 'na', 'none', 'null', 'ninguna', 'ninguno', '-', 'sin observaciones', 'no aplica'].includes(lower);
                };

                const formatKeyLabel = (key: string) => {
                  const clean = key.replace(/_/g, ' ');
                  return clean
                    .split(' ')
                    .map((word) => {
                      if (['od', 'oi', 'pa', 'fc', 'fr', 'cie10', 'imc'].includes(word.toLowerCase())) {
                        return word.toUpperCase();
                      }
                      return word.charAt(0).toUpperCase() + word.slice(1);
                    })
                    .join(' ');
                };

                const camposEspecialidad = Object.entries(consulta.datos_plantilla || {}).filter(
                  ([key, val]) => !CLAVES_IGNORADAS.has(key.toLowerCase()) && isValidVal(val)
                );

                const referidoTexto = consulta.referido_para || consulta.datos_plantilla?.referido_para;
                const observacionesTexto =
                  consulta.observaciones_adicionales || consulta.datos_plantilla?.observaciones_adicionales;

                const tieneReferido = isValidVal(referidoTexto);
                const tieneObservaciones = isValidVal(observacionesTexto);

                return (
                  <div className="space-y-2.5 text-[10.5px] text-zinc-800">
                    {/* 1. Motivo de Consulta & Anamnesis / Enfermedad Actual */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-zinc-900 uppercase text-[10px] border-b border-zinc-200 pb-0.5 flex items-center gap-1">
                        <FileText className="h-3 w-3 text-primary" />
                        1. Motivo de Consulta & Anamnesis
                      </h3>
                      <div className="bg-zinc-50/70 p-2 rounded-lg border border-zinc-200/80 space-y-0.5">
                        <p className="text-zinc-800 font-medium">
                          <strong className="text-zinc-900">Motivo:</strong> {consulta.motivo_consulta || 'Control facultativo de rutina.'}
                        </p>
                        {consulta.enfermedad_actual && (
                          <p className="text-zinc-700 text-[10px] leading-tight">
                            <strong className="text-zinc-900">Enfermedad Actual / Semiología:</strong> {consulta.enfermedad_actual}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 2. Signos Vitales y Parámetros Basales */}
                    {tieneSignosVitales && (
                      <div className="space-y-1">
                        <h3 className="font-bold text-zinc-900 uppercase text-[10px] border-b border-zinc-200 pb-0.5">
                          2. Signos Vitales y Constantes Biológicas
                        </h3>
                        <div className="grid grid-cols-4 gap-1.5 p-2 bg-zinc-50/70 rounded-lg border border-zinc-200/80 text-[10px]">
                          {sv.presion_sistolica && sv.presion_diastolica && (
                            <div>
                              <span className="text-zinc-500 font-medium">P. Arterial:</span>{' '}
                              <strong className="text-zinc-900">
                                {sv.presion_sistolica}/{sv.presion_diastolica}
                              </strong>
                            </div>
                          )}
                          {sv.frecuencia_cardiaca && (
                            <div>
                              <span className="text-zinc-500 font-medium">F. Cardíaca:</span>{' '}
                              <strong className="text-zinc-900">{sv.frecuencia_cardiaca} lpm</strong>
                            </div>
                          )}
                          {sv.frecuencia_respiratoria && (
                            <div>
                              <span className="text-zinc-500 font-medium">F. Resp:</span>{' '}
                              <strong className="text-zinc-900">{sv.frecuencia_respiratoria} rpm</strong>
                            </div>
                          )}
                          {sv.temperatura && (
                            <div>
                              <span className="text-zinc-500 font-medium">Temp:</span>{' '}
                              <strong className="text-zinc-900">{sv.temperatura} °C</strong>
                            </div>
                          )}
                          {sv.saturacion_oxigeno && (
                            <div>
                              <span className="text-zinc-500 font-medium">SpO2:</span>{' '}
                              <strong className="text-zinc-900">{sv.saturacion_oxigeno}%</strong>
                            </div>
                          )}
                          {sv.peso && (
                            <div>
                              <span className="text-zinc-500 font-medium">Peso:</span>{' '}
                              <strong className="text-zinc-900">{sv.peso} kg</strong>
                            </div>
                          )}
                          {sv.talla && (
                            <div>
                              <span className="text-zinc-500 font-medium">Talla:</span>{' '}
                              <strong className="text-zinc-900">{sv.talla} cm</strong>
                            </div>
                          )}
                          {sv.imc && (
                            <div>
                              <span className="text-zinc-500 font-medium">IMC:</span>{' '}
                              <strong className="text-zinc-900">{sv.imc} kg/m²</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3. Examen Físico y Hallazgos Clínicos de la Especialidad */}
                    {camposEspecialidad.length > 0 && (
                      <div className="space-y-1">
                        <h3 className="font-bold text-zinc-900 uppercase text-[10px] border-b border-zinc-200 pb-0.5">
                          3. Examen Físico y Hallazgos Clínicos ({especialidadNombre})
                        </h3>
                        <div className="grid grid-cols-2 gap-1.5 p-2 bg-zinc-50/70 rounded-lg border border-zinc-200/80 text-[10px]">
                          {camposEspecialidad.map(([key, val]) => (
                            <div key={key} className="p-1 rounded bg-white border border-zinc-200/60 leading-tight">
                              <span className="text-zinc-500 font-semibold block text-[9px] uppercase">
                                {formatKeyLabel(key)}
                              </span>
                              <p className="text-zinc-900 font-medium text-[10.5px] truncate">
                                {String(val)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Impresión Diagnóstica (CIE-10) */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-zinc-900 uppercase text-[10px] border-b border-zinc-200 pb-0.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        4. Impresión Diagnóstica (CIE-10)
                      </h3>
                      <div className="space-y-1">
                        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="font-bold text-primary text-[11px]">
                            Diagnóstico Principal: {consulta.diagnostico_principal || 'Sin diagnóstico registrado'}
                          </p>
                        </div>
                        {consulta.diagnosticos_secundarios && consulta.diagnosticos_secundarios.length > 0 && (
                          <div className="p-1.5 rounded-lg bg-zinc-50/70 border border-zinc-200/80 text-[10px]">
                            <span className="font-bold text-zinc-500 uppercase tracking-wider text-[9px] block">
                              Secundarios / Comorbilidades:
                            </span>
                            {consulta.diagnosticos_secundarios.map((diag, idx) => (
                              <p key={idx} className="text-zinc-700 font-medium pl-1">
                                • {typeof diag === 'string' ? diag : diag?.descripcion || diag?.codigo}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Plan de Tratamiento y Conducta Médica */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-zinc-900 uppercase text-[10px] border-b border-zinc-200 pb-0.5">
                        5. Plan de Tratamiento y Conducta Médica
                      </h3>
                      <div className="p-2 rounded-lg bg-zinc-50/70 border border-zinc-200/80 space-y-1 text-[10.5px]">
                        <p className="text-zinc-800 leading-tight">
                          {consulta.plan_tratamiento || 'Tratamiento y conducta según prescripción facultativa adjunta.'}
                        </p>
                        {consulta.indicaciones_generales && (
                          <p className="text-zinc-700 text-[10px] border-t border-zinc-200 pt-1 leading-tight">
                            <strong className="text-zinc-900">Indicaciones:</strong> {consulta.indicaciones_generales}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 6. Interconsulta / Derivación y Observaciones (Condicional) */}
                    {(tieneReferido || tieneObservaciones) && (
                      <div className="space-y-1">
                        <h3 className="font-bold text-zinc-900 uppercase text-[10px] border-b border-zinc-200 pb-0.5">
                          6. Interconsulta & Observaciones
                        </h3>
                        <div className="grid grid-cols-2 gap-1.5">
                          {tieneReferido && (
                            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px]">
                              <strong className="font-bold text-amber-800 uppercase tracking-wider text-[9px] block">
                                Referido para:
                              </strong>
                              <p className="text-zinc-800 leading-tight font-medium">
                                {referidoTexto}
                              </p>
                            </div>
                          )}

                          {tieneObservaciones && (
                            <div className="p-2 rounded-lg bg-zinc-50/70 border border-zinc-200/80 text-[10px]">
                              <strong className="font-bold text-zinc-500 uppercase tracking-wider text-[9px] block">
                                Observaciones:
                              </strong>
                              <p className="text-zinc-700 leading-tight">
                                {observacionesTexto}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── 2. RECETA MÉDICA (RX) ── */}
              {documentoActivo === 'receta' && (
                <div className="space-y-4 text-[10.5px] text-zinc-800">
                  <div className="flex items-center justify-between border-b-2 border-primary/30 pb-1.5">
                    <span className="font-serif font-black text-2xl text-primary tracking-tighter">
                      ℞
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Prescripción Farmacológica
                    </span>
                  </div>

                  {/* Tabla / Lista de Medicamentos */}
                  {consulta.receta_medica && consulta.receta_medica.length > 0 ? (
                    <div className="space-y-2.5">
                      {consulta.receta_medica.map((med: MedicamentoPrescrito, idx: number) => (
                        <div
                          key={med.id || idx}
                          className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 space-y-1"
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="font-bold text-xs text-zinc-900">
                              {idx + 1}. {med.medicamento}
                            </span>
                            {med.presentacion && (
                              <span className="text-[10px] font-semibold text-primary">
                                {med.presentacion}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 text-[10px] text-zinc-700 bg-white p-1.5 rounded border border-zinc-200/60">
                            <div>
                              <span className="text-zinc-500">Dosis:</span>{' '}
                              <strong>{med.dosis || '1 un.'}</strong>
                            </div>
                            <div>
                              <span className="text-zinc-500">Vía:</span>{' '}
                              <strong>{med.via_administracion || 'Oral'}</strong>
                            </div>
                            <div>
                              <span className="text-zinc-500">Frecuencia:</span>{' '}
                              <strong>{med.frecuencia || 'Indicada'}</strong>
                            </div>
                            {med.duracion && (
                              <div>
                                <span className="text-zinc-500">Duración:</span>{' '}
                                <strong>{med.duracion}</strong>
                              </div>
                            )}
                          </div>

                          {med.instrucciones && (
                            <p className="text-[10px] text-zinc-600 italic">
                              <strong>Instrucciones:</strong> {med.instrucciones}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-lg text-zinc-500">
                      <AlertCircle className="h-5 w-5 mx-auto mb-1.5 text-zinc-400" />
                      <p className="font-semibold text-xs">No se registraron medicamentos en esta consulta.</p>
                    </div>
                  )}

                  {/* Indicaciones Generales */}
                  {consulta.indicaciones_generales && (
                    <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[10px]">
                      <h4 className="font-bold text-zinc-900 uppercase mb-0.5 text-[9px]">
                        Indicaciones Generales
                      </h4>
                      <p className="text-zinc-700 leading-tight">
                        {consulta.indicaciones_generales}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. ORDEN DE ESTUDIOS ── */}
              {documentoActivo === 'estudios' && (
                <div className="space-y-4 text-[10.5px] text-zinc-800">
                  <div className="border-b-2 border-primary/30 pb-1.5">
                    <h3 className="font-bold text-xs text-zinc-900 uppercase flex items-center gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5 text-primary" />
                      Solicitud de Exámenes y Estudios Complementarios
                    </h3>
                  </div>

                  {consulta.estudios_solicitados && consulta.estudios_solicitados.length > 0 ? (
                    <div className="space-y-2">
                      {consulta.estudios_solicitados.map((est: EstudioSolicitado, idx: number) => (
                        <div
                          key={est.id || idx}
                          className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-zinc-900">
                              {idx + 1}. {est.nombre}
                            </span>
                            <div className="flex items-center gap-1">
                              {est.urgente && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                                  URGENTE
                                </span>
                              )}
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {est.categoria || 'Laboratorio'}
                              </span>
                            </div>
                          </div>

                          {est.justificacion_clinica && (
                            <p className="text-[10px] text-zinc-600">
                              <strong>Justificación:</strong> {est.justificacion_clinica}
                            </p>
                          )}

                          {est.indicaciones_preparacion && (
                            <p className="text-[10px] text-zinc-600 italic">
                              <strong>Preparación:</strong> {est.indicaciones_preparacion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-lg text-zinc-500">
                      <FlaskConical className="h-5 w-5 mx-auto mb-1.5 text-zinc-400" />
                      <p className="font-semibold text-xs">No se solicitaron estudios en esta consulta.</p>
                    </div>
                  )}

                  {consulta.diagnostico_principal && (
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-[10.5px]">
                      <strong>Diagnóstico Presuntivo:</strong> {consulta.diagnostico_principal}
                    </div>
                  )}
                </div>
              )}

              {/* ── 4. REPOSO MÉDICO ── */}
              {documentoActivo === 'reposo' && (
                <div className="space-y-4 text-[11px] text-zinc-800 py-2">
                  <div className="text-center space-y-0.5 pb-2 border-b border-zinc-200">
                    <h2 className="text-sm font-black uppercase text-zinc-900 tracking-wider">
                      CERTIFICADO DE REPOSO MÉDICO
                    </h2>
                    <p className="text-[10px] text-zinc-500">
                      Constancia de Incapacidad Temporal para Labores y/o Actividades Académicas
                    </p>
                  </div>

                  <div className="text-justify leading-relaxed text-xs text-zinc-800 space-y-3 px-1">
                    <p>
                      El que suscribe, <strong className="text-zinc-950 font-bold">{nombreMedico}</strong>, médico especialista en{' '}
                      <strong className="text-zinc-950 font-bold">{especialidadNombre}</strong>, debidamente registrado ante las autoridades sanitarias bajo la credencial / colegiatura{' '}
                      <strong className="text-zinc-950 font-bold">{colegiadoMedico}</strong>:
                    </p>

                    <p className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                      <strong>HACE CONSTAR QUE:</strong>
                      <br />
                      Habiendo evaluado clínicamente en la fecha al paciente{' '}
                      <strong className="text-zinc-950 font-bold">{nombrePaciente}</strong>, titular del documento de identidad{' '}
                      <strong className="text-zinc-950 font-bold">{tipoDoc} {documentoPaciente}</strong>, de{' '}
                      <strong>{edadPacienteFormateada !== 'N/E' ? edadPacienteFormateada : 'edad no registrada'}</strong>, quien presenta un cuadro clínico compatible con{' '}
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
                      <p className="text-[10px] text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                        <strong>Observaciones:</strong> {consulta.reposo_medico.observaciones}
                      </p>
                    )}

                    <p className="text-[10px] text-zinc-500 pt-1">
                      Constancia que se expide a solicitud de la parte interesada, en fecha {fechaHoyFormateada}.
                    </p>
                  </div>
                </div>
              )}

              {/* ── 5. CONSTANCIA DE ASISTENCIA ── */}
              {documentoActivo === 'constancia' && (
                <div className="space-y-4 text-[11px] text-zinc-800 py-2">
                  <div className="text-center space-y-0.5 pb-2 border-b border-zinc-200">
                    <h2 className="text-sm font-black uppercase text-zinc-900 tracking-wider">
                      CONSTANCIA DE ASISTENCIA A CONSULTA MÉDICA
                    </h2>
                    <p className="text-[10px] text-zinc-500">
                      Justificante de Atención Facultativa {tieneAcompanante ? 'y Acompañamiento' : 'en Consulta Externa'}
                    </p>
                  </div>

                  <div className="text-justify leading-relaxed text-xs text-zinc-800 space-y-3 px-1">
                    <p>
                      Por medio de la presente, el servicio de <strong className="text-zinc-950 font-bold">{especialidadNombre}</strong> de{' '}
                      <strong className="text-zinc-950 font-bold">{empresaNombre}</strong> ({sucursal?.nombre || 'Sede Principal'}):
                    </p>

                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2.5">
                      <div>
                        <p className="font-bold text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                          CERTIFICA QUE:
                        </p>
                        <p className="text-zinc-900 leading-normal">
                          El(la) ciudadano(a) <strong className="text-zinc-950 font-bold">{nombrePaciente}</strong>, titular del documento de identidad{' '}
                          <strong className="text-zinc-950 font-bold">{tipoDoc} {documentoPaciente}</strong>, acudió y permaneció en nuestras instalaciones el día{' '}
                          <strong className="text-zinc-950 font-bold">{fechaConsultaFormateada}</strong> a fin de recibir atención médica especializada, habiendo sido evaluado(a) y atendido(a) por el profesional médico{' '}
                          <strong className="text-zinc-950 font-bold">{nombreMedico}</strong> (Colegiado / Matrícula: {colegiadoMedico}).
                        </p>
                      </div>

                      {tieneAcompanante && (datosAcompanante.nombres || datosAcompanante.apellidos) && (
                        <div className="pt-2 border-t border-zinc-200">
                          <p className="font-bold text-[10px] uppercase tracking-wider text-indigo-700 mb-1">
                            ACREDITACIÓN DEL ACOMPAÑANTE:
                          </p>
                          <p className="text-zinc-900 leading-normal">
                            Asimismo, se hace constar formalmente que el(la) paciente acudió en compañía del(de la) ciudadano(a){' '}
                            <strong className="text-zinc-950 font-bold">
                              {`${datosAcompanante.nombres} ${datosAcompanante.apellidos}`.trim()}
                            </strong>
                            {datosAcompanante.documento?.trim() ? (
                              <>
                                , titular del documento de identidad <strong className="text-zinc-950 font-bold">{datosAcompanante.documento.trim()}</strong>
                              </>
                            ) : null}
                            {datosAcompanante.parentesco ? (
                              <>
                                , en calidad de <strong className="text-zinc-950 font-bold">{datosAcompanante.parentesco === 'Otro' ? (datosAcompanante.otroParentesco || 'Acompañante') : datosAcompanante.parentesco}</strong>
                              </>
                            ) : null}
                            , habiendo permanecido presente durante el proceso de atención, valoración y consulta médica facultativa.
                          </p>
                        </div>
                      )}
                    </div>

                    <p>
                      Se deja constancia de que el paciente asistió a consulta médica para su correspondiente evaluación clínica, diagnóstico y prescripción facultativa.
                    </p>

                    <p className="text-[10px] text-zinc-500 pt-1">
                      Se expide la presente constancia a petición de la parte interesada para los fines legales, laborales, académicos o de justificación correspondientes, en fecha {fechaHoyFormateada}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── PIE DE PÁGINA: FIRMA Y SELLO MÉDICO ── */}
            <div className="pt-3 border-t border-zinc-200">
              <div className="grid grid-cols-2 gap-6 items-end">
                {/* Leyenda y Sello institucional */}
                <div className="text-[9px] text-zinc-500 space-y-0.5">
                  <p className="font-bold text-zinc-700">{empresaNombre}</p>
                  <p>{sucursal?.nombre || 'Atención Médica Integral'}</p>
                  <p className="font-mono text-[8.5px] text-zinc-400">Verificación: {consulta.codigo || `CON-${consulta.id}`}</p>
                </div>

                {/* Firma y Sello del Médico */}
                <div className="text-center space-y-0.5">
                  <div className="w-48 mx-auto border-b border-zinc-400 pb-7 mb-0.5" />
                  <p className="font-bold text-[11px] text-zinc-900">{nombreMedico}</p>
                  <p className="text-[10px] text-zinc-600">{especialidadNombre}</p>
                  <p className="text-[9px] text-zinc-500 font-mono">C.M. / Lic: {colegiadoMedico}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* ── MODAL DE CONFIGURACIÓN DE ACOMPAÑANTE PARA CONSTANCIA ── */}
      <Dialog open={modalAcompananteOpen} onOpenChange={setModalAcompananteOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Constancia de Asistencia Médica
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  ¿El paciente asistió a la consulta con un acompañante?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Opciones Principales: Tarjetas Interactivas Sí / No */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTempTieneAcompanante(false)}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer',
                  !tempTieneAcompanante
                    ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-xs'
                    : 'bg-card border-border/80 hover:border-border hover:bg-muted/30 text-muted-foreground'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn('p-1.5 rounded-lg', !tempTieneAcompanante ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    <User className="h-4 w-4" />
                  </div>
                  {!tempTieneAcompanante && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <h4 className={cn('text-xs font-bold', !tempTieneAcompanante ? 'text-foreground' : 'text-foreground/80')}>
                    No (Solo Paciente)
                  </h4>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    Se emite constancia individual únicamente para el paciente.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTempTieneAcompanante(true)}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer',
                  tempTieneAcompanante
                    ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-card border-border/80 hover:border-border hover:bg-muted/30 text-muted-foreground'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn('p-1.5 rounded-lg', tempTieneAcompanante ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground')}>
                    <Users className="h-4 w-4" />
                  </div>
                  {tempTieneAcompanante && <Check className="h-4 w-4 text-indigo-600" />}
                </div>
                <div>
                  <h4 className={cn('text-xs font-bold', tempTieneAcompanante ? 'text-foreground' : 'text-foreground/80')}>
                    Sí (Con Acompañante)
                  </h4>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    Se acredita e incluye al acompañante en el justificante.
                  </p>
                </div>
              </button>
            </div>

            {/* Formulario de Datos del Acompañante (Si la respuesta es Sí) */}
            {tempTieneAcompanante && (
              <div className="space-y-3.5 pt-2 border-t border-border/60 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                    Datos del Acompañante
                  </span>

                  {consulta?.paciente?.contacto_emergencia_nombre && (
                    <button
                      type="button"
                      onClick={handleCargarContactoEmergencia}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <HeartHandshake className="h-3 w-3" />
                      <span>Cargar contacto de emergencia</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Nombre(s) del Acompañante <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. María Elena"
                      value={tempDatosAcompanante.nombres}
                      onChange={(e) =>
                        setTempDatosAcompanante({ ...tempDatosAcompanante, nombres: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Apellido(s) del Acompañante <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Rodríguez López"
                      value={tempDatosAcompanante.apellidos}
                      onChange={(e) =>
                        setTempDatosAcompanante({ ...tempDatosAcompanante, apellidos: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Documento de Identidad (Cédula / DNI)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. V-14.234.567 / 12345678"
                      value={tempDatosAcompanante.documento}
                      onChange={(e) =>
                        setTempDatosAcompanante({ ...tempDatosAcompanante, documento: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Parentesco con el Paciente <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tempDatosAcompanante.parentesco}
                      onChange={(e) =>
                        setTempDatosAcompanante({ ...tempDatosAcompanante, parentesco: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="Madre">Madre</option>
                      <option value="Padre">Padre</option>
                      <option value="Cónyuge / Esposo(a)">Cónyuge / Esposo(a)</option>
                      <option value="Hijo / Hija">Hijo / Hija</option>
                      <option value="Hermano / Hermana">Hermano / Hermana</option>
                      <option value="Tutor / Representante Legal">Tutor / Representante Legal</option>
                      <option value="Abuelo / Abuela">Abuelo / Abuela</option>
                      <option value="Tío / Tía">Tío / Tía</option>
                      <option value="Familiar">Familiar</option>
                      <option value="Acompañante">Acompañante</option>
                      <option value="Otro">Otro (Especificar)</option>
                    </select>
                  </div>
                </div>

                {tempDatosAcompanante.parentesco === 'Otro' && (
                  <div className="space-y-1 animate-in fade-in-50 duration-150">
                    <label className="text-[11px] font-semibold text-foreground">
                      Especifique el Parentesco o Relación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Prima / Vecino / Cuidador"
                      value={tempDatosAcompanante.otroParentesco}
                      onChange={(e) =>
                        setTempDatosAcompanante({ ...tempDatosAcompanante, otroParentesco: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 flex sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalAcompananteOpen(false)}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGuardarAcompanante}
              disabled={
                tempTieneAcompanante &&
                (!tempDatosAcompanante.nombres.trim() || !tempDatosAcompanante.apellidos.trim())
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>Guardar y Ver Constancia</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default DocumentosImpresionModal;

