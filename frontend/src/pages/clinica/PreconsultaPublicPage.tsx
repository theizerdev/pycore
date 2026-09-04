import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { preconsultaApi, type PreconsultaPublicData } from '../../api/preconsulta';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  Building2,
  MapPin,
  Calendar,
  Send,
  AlertCircle,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';
import { toast } from 'sonner';

export const PreconsultaPublicPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<PreconsultaPublicData | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Token de preconsulta no proporcionado.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const res = await preconsultaApi.getPublic(token);
        setData(res);
        setRespuestas(res.respuestas || {});
        if (res.estado === 'completada') {
          setCompleted(true);
        }
      } catch (err: any) {
        console.error('Error cargando preconsulta:', err);
        setErrorMsg(
          err.response?.data?.detail || 'El formulario de preconsulta no está disponible o ha expirado.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const handleFieldChange = (key: string, value: any) => {
    setRespuestas((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      await preconsultaApi.responder(token, respuestas);
      setCompleted(true);
      toast.success('¡Preconsulta completada exitosamente!');
    } catch (err: any) {
      console.error('Error enviando preconsulta:', err);
      toast.error(err.response?.data?.detail || 'Error al guardar la preconsulta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center animate-pulse">
            <HeartPulse className="size-6 animate-bounce" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Cargando su formulario médico...
          </h2>
          <p className="text-xs text-slate-500">Por favor espere un momento</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-200 dark:border-rose-900/50 shadow-xl bg-white dark:bg-slate-900">
          <CardContent className="p-6 text-center space-y-4">
            <div className="size-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 mx-auto flex items-center justify-center">
              <AlertCircle className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Enlace no disponible
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {errorMsg || 'No se pudo encontrar la preconsulta solicitada.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de Éxito / Preconsulta Completada
  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/50 rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="size-16 rounded-3xl bg-teal-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-teal-500/30">
            <CheckCircle2 className="size-9 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 text-[11px] font-semibold py-0.5 px-3">
              Información Enviada al Consultorio
            </Badge>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              ¡Muchas gracias, {data.paciente.nombres}!
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Su preconsulta ha sido registrada exitosamente. El{' '}
              <span className="font-semibold text-teal-600 dark:text-teal-400">
                Dr(a). {data.medico.nombres} {data.medico.apellidos}
              </span>{' '}
              ya cuenta con sus respuestas para agilizar su atención en cuanto sea llamado a su turno.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
              <Stethoscope className="size-4 text-teal-600 shrink-0" />
              <span>{data.especialidad.nombre}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Building2 className="size-4 text-slate-400 shrink-0" />
              <span>{data.empresa.nombre} • {data.sucursal.nombre}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Clock className="size-4 text-slate-400 shrink-0" />
              <span>Turno actual: En Sala de Espera</span>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="size-3.5 text-teal-500" /> Datos clínicos protegidos y confidenciales
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between py-6 px-3 sm:px-6">
      <div className="max-w-2xl w-full mx-auto space-y-5">
        {/* Cabecera / Banner de la Clínica */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden">
          <div
            className="h-3 w-full"
            style={{ backgroundColor: data.especialidad.color || '#0d9488' }}
          />
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {data.empresa.logo_mini_url || data.empresa.logo_url ? (
                  <img
                    src={data.empresa.logo_mini_url || data.empresa.logo_url || ''}
                    alt={data.empresa.nombre}
                    className="h-10 w-auto max-w-[120px] object-contain rounded-lg"
                  />
                ) : (
                  <div className="size-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black text-sm">
                    {data.empresa.nombre.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    {data.empresa.nombre}
                  </h1>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="size-3 text-slate-400" />
                    {data.sucursal.nombre}
                  </span>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[10px] font-bold px-2.5 py-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1 shrink-0"
              >
                <Clock className="size-3 animate-spin" /> En Sala de Espera
              </Badge>
            </div>

            {/* Datos de la Cita */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="size-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                  style={{ backgroundColor: data.especialidad.color || '#0d9488' }}
                >
                  <Stethoscope className="size-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    {data.especialidad.nombre}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Dr(a). {data.medico.nombres} {data.medico.apellidos}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                  Paciente: {data.paciente.nombres} {data.paciente.apellidos}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Doc: {data.paciente.documento}
                </span>
              </div>
            </div>

            <div className="text-center pt-1">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Cuestionario de Preconsulta
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Por favor complete estas preguntas mientras espera a ser llamado por su médico.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario Dinámico de Preguntas */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {data.secciones.length === 0 ? (
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 p-6 text-center">
              <CardContent className="p-0 space-y-3">
                <p className="text-xs text-slate-500">
                  No hay preguntas específicas configuradas para esta especialidad. Por favor confirme su motivo de consulta.
                </p>
                <div className="text-left space-y-1">
                  <Label className="text-xs font-semibold">Motivo principal de su consulta</Label>
                  <Textarea
                    value={respuestas['motivo_consulta'] || data.cita.motivo || ''}
                    onChange={(e) => handleFieldChange('motivo_consulta', e.target.value)}
                    placeholder="Describa brevemente qué síntoma o molestia presenta..."
                    className="text-xs"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            data.secciones.map((sec, secIdx) => (
              <Card
                key={sec.id || secIdx}
                className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-md rounded-3xl overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      {secIdx + 1}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {sec.titulo}
                      </h3>
                      {sec.descripcion && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {sec.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-12 gap-3.5">
                    {sec.campos.map((campo) => {
                      const val = respuestas[campo.key] !== undefined ? respuestas[campo.key] : '';
                      const colSpan =
                        campo.grid_cols === 6
                          ? 'col-span-12 sm:col-span-6'
                          : campo.grid_cols === 4
                          ? 'col-span-12 sm:col-span-4'
                          : 'col-span-12';

                      return (
                        <div key={campo.key} className={colSpan}>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                              <span>
                                {campo.label}{' '}
                                {campo.requerido && (
                                  <span className="text-rose-500 font-bold">*</span>
                                )}
                              </span>
                              {campo.unidad && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({campo.unidad})
                                </span>
                              )}
                            </Label>

                            {/* Renderizado según tipo de campo */}
                            {campo.tipo === 'textarea' ? (
                              <Textarea
                                value={val}
                                onChange={(e) => handleFieldChange(campo.key, e.target.value)}
                                placeholder={campo.placeholder || 'Escriba aquí...'}
                                required={campo.requerido}
                                className="text-xs rounded-xl border-slate-200 dark:border-slate-700 focus:ring-teal-500"
                                rows={3}
                              />
                            ) : campo.tipo === 'number' ? (
                              <Input
                                type="number"
                                value={val}
                                onChange={(e) => handleFieldChange(campo.key, e.target.value)}
                                placeholder={campo.placeholder || '0'}
                                min={campo.min_val ?? undefined}
                                max={campo.max_val ?? undefined}
                                required={campo.requerido}
                                className="text-xs rounded-xl h-9"
                              />
                            ) : campo.tipo === 'date' ? (
                              <Input
                                type="date"
                                value={val}
                                onChange={(e) => handleFieldChange(campo.key, e.target.value)}
                                required={campo.requerido}
                                className="text-xs rounded-xl h-9"
                              />
                            ) : campo.tipo === 'select' ? (
                              <select
                                value={val}
                                onChange={(e) => handleFieldChange(campo.key, e.target.value)}
                                required={campo.requerido}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 h-9 px-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              >
                                <option value="">Seleccione una opción...</option>
                                {(campo.opciones || []).map((opc) => (
                                  <option key={opc} value={opc}>
                                    {opc}
                                  </option>
                                ))}
                              </select>
                            ) : campo.tipo === 'boolean' ? (
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={val === true || val === 'si' ? 'default' : 'outline'}
                                  onClick={() => handleFieldChange(campo.key, true)}
                                  className={`h-8 text-xs rounded-xl px-4 cursor-pointer font-bold ${
                                    val === true || val === 'si'
                                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                      : ''
                                  }`}
                                >
                                  Sí
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={val === false || val === 'no' ? 'default' : 'outline'}
                                  onClick={() => handleFieldChange(campo.key, false)}
                                  className={`h-8 text-xs rounded-xl px-4 cursor-pointer font-bold ${
                                    val === false || val === 'no'
                                      ? 'bg-slate-700 hover:bg-slate-800 text-white'
                                      : ''
                                  }`}
                                >
                                  No
                                </Button>
                              </div>
                            ) : campo.tipo === 'scale_1_10' ? (
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() => handleFieldChange(campo.key, num)}
                                      className={`size-8 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                        val === num
                                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm scale-105'
                                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400">
                                  <span>Leve / Ninguno</span>
                                  <span>Moderado</span>
                                  <span>Severo</span>
                                </div>
                              </div>
                            ) : (
                              <Input
                                type="text"
                                value={val}
                                onChange={(e) => handleFieldChange(campo.key, e.target.value)}
                                placeholder={campo.placeholder || 'Escriba su respuesta...'}
                                required={campo.requerido}
                                className="text-xs rounded-xl h-9"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Botón de Envío */}
          <div className="pt-2 pb-6">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xl shadow-teal-600/25 cursor-pointer gap-2"
            >
              {submitting ? (
                <span>Guardando respuestas...</span>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>Enviar Respuestas al Doctor</span>
                </>
              )}
            </Button>
            <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="size-3.5 text-teal-500" /> Información protegida por secreto médico
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PreconsultaPublicPage;
