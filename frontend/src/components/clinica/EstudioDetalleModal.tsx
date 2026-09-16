import React, { useState } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCw, Contrast, Download, Sparkles,
  FlaskConical, Image as ImageIcon, AlertTriangle, CheckCircle2,
  ArrowDown, ArrowUp, RefreshCw, UserCheck, Stethoscope,
  Eye, ShieldAlert
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { estudiosApi, type EstudioAdjunto } from '../../api/estudios';
import { cn } from '../../lib/utils';

interface EstudioDetalleModalProps {
  estudioId: number | null;
  open: boolean;
  onClose: () => void;
  onEstudioUpdated?: () => void;
}

export const EstudioDetalleModal: React.FC<EstudioDetalleModalProps> = ({
  estudioId,
  open,
  onClose,
  onEstudioUpdated
}) => {
  const [estudio, setEstudio] = useState<EstudioAdjunto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzingBot, setAnalyzingBot] = useState<boolean>(false);

  // Estados para el visor de imagenología
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [invertContrast, setInvertContrast] = useState<boolean>(false);

  // Cargar estudio al abrir
  React.useEffect(() => {
    if (!estudioId || !open) {
      setEstudio(null);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await estudiosApi.obtenerDetalle(estudioId);
        setEstudio(data);
      } catch (err: unknown) {
        toast.error('Error al cargar la información del estudio');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Resetear visor de imagen
    setZoomLevel(1);
    setRotation(0);
    setInvertContrast(false);
  }, [estudioId, open]);

  // Disparar re-análisis del Bot
  const handleEjecutarBot = async () => {
    if (!estudio) return;
    setAnalyzingBot(true);
    try {
      const res = await estudiosApi.reanalizarConBot(estudio.id);
      setEstudio(prev => prev ? {
        ...prev,
        valores_laboratorio: res.valores_laboratorio || prev.valores_laboratorio,
        datos_imagenologia: res.datos_imagenologia || prev.datos_imagenologia,
        alertas_detectadas: res.alertas_detectadas || prev.alertas_detectadas,
        interpretacion_clinica: res.interpretacion_clinica || prev.interpretacion_clinica,
        estado_analisis: res.estado_analisis || prev.estado_analisis,
      } : null);

      toast.success('¡Análisis clínico del Asistente actualizado con éxito!');
      onEstudioUpdated?.();
    } catch (err: unknown) {
      toast.error('Ocurrió un error al procesar el análisis con el bot');
    } finally {
      setAnalyzingBot(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-foreground border-border shadow-2xl">
        
        {/* HEADER DEL MODAL */}
        <div className="bg-muted/40 border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className={cn(
              'p-2.5 rounded-xl border shadow-xs',
              estudio?.categoria === 'laboratorio' 
                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30' 
                : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
            )}>
              {estudio?.categoria === 'laboratorio' ? (
                <FlaskConical className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ) : (
                <ImageIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                {estudio?.titulo || 'Visor de Estudio Médico'}
                {estudio?.estado_analisis === 'analizado_alterado' ? (
                  <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 text-xs gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Valores Alterados
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Normal
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                <span>Categoría: <strong className="text-foreground uppercase">{estudio?.categoria}</strong></span>
                <span>•</span>
                <span>Fecha del Estudio: <strong className="text-foreground">{estudio?.fecha_estudio}</strong></span>
                <span>•</span>
                <span>Archivo: <strong className="text-foreground">{estudio?.archivo_nombre}</strong></span>
              </DialogDescription>
            </div>
          </div>

          {/* ACCIONES SUPERIORES */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={analyzingBot}
              onClick={handleEjecutarBot}
              className="text-xs gap-1.5 h-8 cursor-pointer font-semibold"
            >
              <Sparkles className={cn('w-3.5 h-3.5 text-primary', analyzingBot && 'animate-spin')} />
              <span>{analyzingBot ? 'Analizando...' : 'Asistente Clínico Bot'}</span>
            </Button>

            {estudio?.archivo_url && (
              <a
                href={estudio.archivo_url}
                download={estudio.archivo_nombre || 'estudio_medico'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Descargar o ver archivo original"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CUERPO DEL MODAL (SEGÚN CATEGORÍA) */}
        <div className="flex-1 overflow-hidden flex flex-col p-5 sm:p-6">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Cargando datos y analítica del estudio...</p>
            </div>
          ) : !estudio ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <p className="text-sm">No se encontró la información del estudio.</p>
            </div>
          ) : estudio.categoria === 'laboratorio' ? (
            
            /* ========================================================== */
            /* VISTA DE LABORATORIO: BIOMARCADORES Y RESUMEN PARA PACIENTE */
            /* ========================================================== */
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-5">
              
              {/* Alertas rápidas */}
              {estudio.alertas_detectadas && estudio.alertas_detectadas.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm font-bold mb-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Parámetros Alterados para Atención del Médico y Paciente:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {estudio.alertas_detectadas.map((alerta, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/30 text-xs font-semibold"
                      >
                        {alerta}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* TABLA DE BIOMARCADORES Y VALORES */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    Panel de Analitos y Valores de Referencia
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {estudio.valores_laboratorio?.length || 0} parámetros analizados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider bg-muted/20">
                        <th className="p-3.5">Parámetro / Prueba</th>
                        <th className="p-3.5 text-right">Resultado</th>
                        <th className="p-3.5 text-center">Rango de Referencia</th>
                        <th className="p-3.5 text-center">Nivel</th>
                        <th className="p-3.5">Interpretación Clínica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {estudio.valores_laboratorio && estudio.valores_laboratorio.length > 0 ? (
                        estudio.valores_laboratorio.map((bio, idx) => {
                          const isHigh = bio.estado === 'alto';
                          const isLow = bio.estado === 'bajo';
                          return (
                            <tr
                              key={idx}
                              className={cn(
                                'transition-colors',
                                isHigh
                                  ? 'bg-rose-500/5 hover:bg-rose-500/10'
                                  : isLow
                                  ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                  : 'hover:bg-muted/30'
                              )}
                            >
                              <td className="p-3.5 font-medium text-foreground">
                                {bio.parametro}
                              </td>

                              {/* Valor numérico */}
                              <td className="p-3.5 text-right font-mono font-bold text-base">
                                <span className={
                                  isHigh
                                    ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                    : isLow
                                    ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }>
                                  {bio.valor}
                                </span>{' '}
                                <span className="text-xs font-normal text-muted-foreground">{bio.unidad}</span>
                              </td>

                              {/* Rango de Referencia */}
                              <td className="p-3.5 text-center font-mono text-xs text-muted-foreground">
                                {bio.ref_min} - {bio.ref_max} {bio.unidad}
                              </td>

                              {/* Badge de Estado */}
                              <td className="p-3.5 text-center">
                                {isHigh ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                    <ArrowUp className="w-3 h-3" /> Elevado
                                  </span>
                                ) : isLow ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                    <ArrowDown className="w-3 h-3" /> Bajo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" /> Normal
                                  </span>
                                )}
                              </td>

                              {/* Interpretación */}
                              <td className="p-3.5 text-xs text-muted-foreground">
                                {bio.interpretacion || 'En rango esperado'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">
                            No se extrajeron parámetros numéricos automáticos. Haga clic en <strong>Asistente Clínico Bot</strong> para procesar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PANEL DEL ASISTENTE CLÍNICO: CONSIDERACIONES MÉDICAS Y GUÍA PARA EL PACIENTE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resumen para el Médico */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-3">
                    <Stethoscope className="w-4 h-4" />
                    <span>Consideraciones Clínicas (Para el Médico)</span>
                  </div>
                  <div className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
                    {estudio.interpretacion_clinica || 'Sin interpretación registrada. Use el asistente para generar un informe orientativo.'}
                  </div>
                </div>

                {/* Guía Explicativa para el Paciente */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-3">
                    <UserCheck className="w-4 h-4" />
                    <span>Guía de Comunicación al Paciente</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Puntos clave para indicarle al paciente de forma clara y sin tecnicismos el estado de sus valores, cómo controlarlos y la conducta preventiva a seguir para su tranquilidad.
                  </p>
                  <div className="mt-3 p-3 bg-card border border-border rounded-xl text-xs text-primary font-medium italic shadow-2xs">
                    "{estudio.valores_laboratorio?.some(v => v.alerta) 
                      ? 'Estimado paciente, sus exámenes muestran ligeras variaciones que ya hemos identificado. Con los ajustes indicados en su consulta mantendremos sus valores en niveles seguros y protegidos.'
                      : 'Estimado paciente, sus exámenes de laboratorio han salido dentro de los rangos de referencia saludables. Continuaremos con sus controles habituales de mantenimiento.'}"
                  </div>
                </div>
              </div>

            </div>

          ) : (
            
            /* ========================================================== */
            /* VISTA DE IMAGENOLOGÍA: ECOS, PANORÁMICAS DENTALES Y RAYOS X */
            /* ========================================================== */
            <div className="flex-1 grid grid-cols-12 gap-5 overflow-hidden">
              
              {/* VISOR CLÍNICO DE IMAGEN (COLUMNA IZQUIERDA 65%) */}
              <div className="col-span-12 lg:col-span-7 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                {/* BARRA DE HERRAMIENTAS DEL VISOR */}
                <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 4))}
                      className="h-8 px-2.5 cursor-pointer"
                      title="Acercar (Zoom In)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                      className="h-8 px-2.5 cursor-pointer"
                      title="Alejar (Zoom Out)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="font-mono text-xs text-muted-foreground px-1">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      className="h-8 px-2.5 cursor-pointer"
                      title="Rotar 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={invertContrast ? 'default' : 'ghost'}
                      onClick={() => setInvertContrast(prev => !prev)}
                      className="h-8 px-2.5 gap-1.5 text-xs cursor-pointer font-medium"
                      title="Invertir Contraste / Negativo Rx (Ideal para Panorámicas Dentales y Radiografías)"
                    >
                      <Contrast className="w-4 h-4" />
                      <span>Modo Negativo Rx</span>
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setZoomLevel(1);
                      setRotation(0);
                      setInvertContrast(false);
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Restablecer
                  </Button>
                </div>

                {/* LIENZO DE VISUALIZACIÓN */}
                <div className="flex-1 bg-zinc-900 dark:bg-black/90 flex items-center justify-center overflow-auto p-4 relative">
                  {estudio.archivo_url ? (
                    <img
                      src={estudio.archivo_url}
                      alt={estudio.titulo}
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        filter: invertContrast ? 'invert(100%) contrast(135%)' : 'none',
                        transition: 'transform 0.15s ease-out, filter 0.2s ease',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                      }}
                      className="rounded shadow-2xl"
                    />
                  ) : (
                    <div className="text-center text-zinc-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Sin imagen adjunta</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PANEL LATERAL DE HALLAZGOS Y DATOS CLÍNICOS (COLUMNA DERECHA 35%) */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-3.5 overflow-y-auto pr-1">
                
                {/* Región y Técnica */}
                <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Región Anatómica Evaluada
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {estudio.datos_imagenologia?.region_anatomica || 'Área general evaluada'}
                  </p>

                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Técnica:</span>
                      <span className="text-foreground font-medium">
                        {estudio.datos_imagenologia?.tecnica || 'Imagenología'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Calidad Imagen:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {estudio.datos_imagenologia?.calidad_estudio || 'Óptima'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hallazgos Radiológicos / Odontológicos */}
                <div className="bg-card border border-border rounded-2xl p-4 flex-1 shadow-xs">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                    <Eye className="w-4 h-4" />
                    <span>Hallazgos Radiológicos / Ecográficos</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {estudio.datos_imagenologia?.hallazgos || 'Estudio evaluado sin hallazgos patológicos relevantes.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-border">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                      Conclusión Diagnóstica:
                    </span>
                    <p className="text-xs text-foreground font-medium">
                      {estudio.datos_imagenologia?.conclusion || 'Estudio dentro de la normalidad.'}
                    </p>
                  </div>
                </div>

                {/* Guía para Explicar al Paciente */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs mb-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span>Guía Explicativa para el Paciente</span>
                  </div>
                  <p className="text-xs text-foreground/90 italic leading-relaxed">
                    "{estudio.datos_imagenologia?.guia_paciente || 'El estudio permite verificar que las estructuras anatómicas evaluadas conservan buena integridad.'}"
                  </p>
                </div>

              </div>

            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default EstudioDetalleModal;
