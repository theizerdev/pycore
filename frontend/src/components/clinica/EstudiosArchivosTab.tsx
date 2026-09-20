import React, { useState, useEffect } from 'react';
import {
  FlaskConical, Image as ImageIcon, Plus, Search,
  Calendar, Trash2, Upload, AlertTriangle, CheckCircle2,
  RefreshCw, Eye, Sparkles, History, Stethoscope
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';
import { estudiosApi, type EstudioAdjunto } from '../../api/estudios';
import { EstudioDetalleModal } from './EstudioDetalleModal';
import { cn } from '../../lib/utils';

interface EstudiosArchivosTabProps {
  pacienteId: number;
  consultaId?: number;
  medicoId?: number;
}

export const EstudiosArchivosTab: React.FC<EstudiosArchivosTabProps> = ({
  pacienteId,
  consultaId,
  medicoId,
}) => {
  const [estudios, setEstudios] = useState<EstudioAdjunto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [alcance, setAlcance] = useState<'esta_consulta' | 'historial_previo' | 'todos'>(
    consultaId ? 'esta_consulta' : 'todos'
  );

  // Modal de Detalle / Visor Inteligente
  const [selectedEstudioId, setSelectedEstudioId] = useState<number | null>(null);
  const [modalViewerOpen, setModalViewerOpen] = useState<boolean>(false);

  // Modal de Subida / Nuevo Estudio
  const [modalUploadOpen, setModalUploadOpen] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [titulo, setTitulo] = useState<string>('');
  const [categoria, setCategoria] = useState<'laboratorio' | 'imagenologia' | 'informe' | 'otro'>('laboratorio');
  const [subtipo, setSubtipo] = useState<string>('');
  const [fechaEstudio, setFechaEstudio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState<string>('');
  const [archivoBase64, setArchivoBase64] = useState<string>('');
  const [archivoNombre, setArchivoNombre] = useState<string>('');
  const [archivoTipo, setArchivoTipo] = useState<string>('');
  const [archivoTamano, setArchivoTamano] = useState<number>(0);

  const fetchEstudios = async () => {
    setLoading(true);
    try {
      const data = await estudiosApi.listarPorPaciente(pacienteId, categoriaFiltro);
      setEstudios(data);
    } catch (err) {
      toast.error('Error al cargar estudios del paciente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (consultaId) {
      setAlcance('esta_consulta');
    } else {
      setAlcance('todos');
    }
  }, [consultaId]);

  useEffect(() => {
    if (pacienteId) {
      setEstudios([]);
      fetchEstudios();
    }
  }, [pacienteId, categoriaFiltro]);

  // Manejador de selección de archivo local
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoNombre(file.name);
    setArchivoTipo(file.type);
    setArchivoTamano(file.size);

    if (!titulo) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitulo(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const base64 = loadEvt.target?.result as string;
      setArchivoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // Crear y guardar el estudio
  const handleGuardarEstudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Debe ingresar un título descriptivo para el estudio');
      return;
    }
    if (!archivoBase64) {
      toast.error('Debe seleccionar un archivo (imagen o documento)');
      return;
    }

    setUploadLoading(true);
    try {
      await estudiosApi.crear({
        paciente_id: pacienteId,
        consulta_id: consultaId,
        medico_id: medicoId,
        titulo: titulo.trim(),
        categoria,
        subtipo: subtipo.trim() || undefined,
        archivo_url: archivoBase64,
        archivo_nombre: archivoNombre,
        archivo_tipo: archivoTipo,
        archivo_tamano: archivoTamano,
        fecha_estudio: fechaEstudio,
        notas: notas.trim() || undefined,
      });

      toast.success('Estudio guardado y analizado por el Asistente Clínico');
      setModalUploadOpen(false);
      // Reset form
      setTitulo('');
      setArchivoBase64('');
      setArchivoNombre('');
      setNotas('');
      if (consultaId) {
        setAlcance('esta_consulta');
      }
      fetchEstudios();
    } catch (err: unknown) {
      toast.error('Error al guardar el estudio adjunto');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este estudio clínico?')) return;
    try {
      await estudiosApi.eliminar(id);
      toast.success('Estudio eliminado');
      fetchEstudios();
    } catch (err) {
      toast.error('Error al eliminar estudio');
    }
  };

  // Separar estudios de esta consulta vs historial
  const estudiosEstaConsulta = estudios.filter(e => e.consulta_id === consultaId);
  const estudiosHistorial = estudios.filter(e => !consultaId || e.consulta_id !== consultaId);

  const estudiosSegunAlcance = consultaId
    ? (alcance === 'esta_consulta' ? estudiosEstaConsulta : estudiosHistorial)
    : estudios;

  // Filtrar por búsqueda
  const estudiosFiltrados = estudiosSegunAlcance.filter(e =>
    e.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.notas && e.notas.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* SELECTOR DE ALCANCE: DE ESTA CONSULTA VS HISTORIAL PREVIO (Solo dentro de una consulta médica) */}
      {consultaId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-muted/40 rounded-2xl border border-border">
          <div className="flex items-center gap-1.5 p-1 bg-background rounded-xl border border-border shadow-xs text-xs">
            <button
              type="button"
              onClick={() => setAlcance('esta_consulta')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer',
                alcance === 'esta_consulta'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>De esta Consulta</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                alcance === 'esta_consulta'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}>
                {estudiosEstaConsulta.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAlcance('historial_previo')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer',
                alcance === 'historial_previo'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial del Paciente</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                alcance === 'historial_previo'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}>
                {estudiosHistorial.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground px-2">
            {alcance === 'esta_consulta' ? (
              <span>Exámenes y análisis adjuntos exclusivos de la atención médica actual.</span>
            ) : (
              <span>Estudios previos del paciente para consulta de antecedentes clínicos.</span>
            )}
          </div>
        </div>
      )}

      {/* BARRA SUPERIOR DE ACCIONES Y FILTROS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
        {/* Pestañas de Filtro Rápido */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border text-xs">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'laboratorio', label: '🧪 Laboratorio' },
            { key: 'imagenologia', label: '🩻 Imagenología' },
            { key: 'informe', label: '📄 Informes' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoriaFiltro(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer',
                categoriaFiltro === tab.key
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Buscador y Botón Subir */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar estudio..."
              className="pl-9 h-9 text-xs bg-card border-border text-foreground"
            />
          </div>

          <Button
            size="sm"
            onClick={() => setModalUploadOpen(true)}
            className="h-9 gap-1.5 font-semibold shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adjuntar Estudio</span>
          </Button>
        </div>
      </div>

      {/* LISTADO / GRID DE ESTUDIOS */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Cargando estudios clínicos del paciente...</p>
        </div>
      ) : estudiosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {estudiosFiltrados.map(est => {
            const isLab = est.categoria === 'laboratorio';
            const isAlterado = est.estado_analisis === 'analizado_alterado';
            const esDeConsultaPrevia = Boolean(consultaId && est.consulta_id !== consultaId);

            return (
              <div
                key={est.id}
                className={cn(
                  'group relative bg-card border rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between',
                  esDeConsultaPrevia
                    ? 'border-border/70 bg-muted/20 hover:border-border'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div>
                  {/* Categoría, Estado y Badge de Historial */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
                        isLab
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                          : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                      )}>
                        {isLab ? <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <ImageIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                        <span className="capitalize">{est.categoria}</span>
                      </span>

                      {esDeConsultaPrevia && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20">
                          <History className="w-3 h-3 text-slate-500" />
                          Consulta anterior
                        </span>
                      )}
                    </div>

                    {isAlterado ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Alterado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Normal
                      </span>
                    )}
                  </div>

                  {/* Título del Estudio */}
                  <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                    {est.titulo}
                  </h4>

                  {/* Fecha y Archivo */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{est.fecha_estudio}</span>
                    <span>•</span>
                    <span className="truncate max-w-[140px]">{est.archivo_nombre}</span>
                  </div>

                  {/* Alertas Detectadas (si tiene) */}
                  {est.alertas_detectadas && est.alertas_detectadas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {est.alertas_detectadas.slice(0, 3).map((alt, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-300 text-[11px] font-medium truncate max-w-[240px]"
                        >
                          {alt}
                        </span>
                      ))}
                      {est.alertas_detectadas.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{est.alertas_detectadas.length - 3} más
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEstudioId(est.id);
                      setModalViewerOpen(true);
                    }}
                    className="flex-1 text-xs gap-1.5 h-8 font-medium cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>Abrir Visor Clínico</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleEliminar(est.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Eliminar estudio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border/80 rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3 text-muted-foreground">
            <FlaskConical className="w-7 h-7 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">
            {consultaId && alcance === 'esta_consulta'
              ? 'Sin Estudios en esta Consulta'
              : consultaId && alcance === 'historial_previo'
              ? 'Sin Estudios Previos'
              : 'Sin Estudios Registrados'}
          </h3>
          <p className="text-muted-foreground text-xs max-w-md mb-5">
            {consultaId && alcance === 'esta_consulta'
              ? 'Aún no se han adjuntado estudios ni análisis para la atención médica actual. Adjunte exámenes para que el Asistente Clínico los analice.'
              : consultaId && alcance === 'historial_previo'
              ? 'El paciente no posee estudios registrados en consultas anteriores.'
              : 'Adjunte exámenes de laboratorio o imágenes (ecos, panorámicas dentales, rayos X) para visualizarlos en el visor clínico e interpretarlos con el Asistente Bot.'}
          </p>

          {(!consultaId || alcance === 'esta_consulta') && (
            <Button
              size="sm"
              onClick={() => setModalUploadOpen(true)}
              className="text-xs gap-1.5 cursor-pointer font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Adjuntar Estudio a esta Consulta</span>
            </Button>
          )}

          {consultaId && alcance === 'esta_consulta' && estudiosHistorial.length > 0 && (
            <div className="mt-6 p-3 bg-muted/40 rounded-xl border border-border flex items-center gap-3 text-xs text-muted-foreground max-w-md">
              <History className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 text-left">
                El paciente tiene <strong>{estudiosHistorial.length}</strong> {estudiosHistorial.length === 1 ? 'estudio previo' : 'estudios previos'} de consultas anteriores.
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAlcance('historial_previo')}
                className="text-xs h-7 text-primary hover:text-primary font-semibold p-1"
              >
                Ver Historial →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MODAL PARA SUBIR NUEVO ESTUDIO */}
      <Dialog open={modalUploadOpen} onOpenChange={setModalUploadOpen}>
        <DialogContent className="max-w-xl bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Adjuntar Examen o Estudio Médico
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGuardarEstudio} className="space-y-4 mt-2">
            {/* Título */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Título del Estudio / Examen *
              </label>
              <Input
                required
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej. Hematología Completa, Panorámica Dental, Eco Abdominal"
                className="text-sm bg-background border-border text-foreground"
              />
            </div>

            {/* Categoría y Fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Categoría *
                </label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value as any)}
                  className="w-full h-9 rounded-md bg-background border border-border text-foreground text-xs px-3 focus:ring-1 focus:ring-primary focus:outline-hidden"
                >
                  <option value="laboratorio">🧪 Laboratorio Clínico</option>
                  <option value="imagenologia">🩻 Imagenología (Eco, Panorámica, Rx)</option>
                  <option value="informe">📄 Informe Médico</option>
                  <option value="otro">📁 Otro Adjunto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Fecha del Estudio *
                </label>
                <Input
                  type="date"
                  required
                  value={fechaEstudio}
                  onChange={e => setFechaEstudio(e.target.value)}
                  className="text-xs bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Subtipo opcional */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Subtipo / Especialidad (Opcional)
              </label>
              <Input
                value={subtipo}
                onChange={e => setSubtipo(e.target.value)}
                placeholder="Ej. hemograma, perfil_lipidico, panoramica_dental, ecografia"
                className="text-xs bg-background border-border text-foreground"
              />
            </div>

            {/* Archivo Local */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Archivo de Imagen o Documento *
              </label>
              <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-muted/30 relative">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  required={!archivoBase64}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {archivoNombre ? (
                  <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="truncate max-w-xs">{archivoNombre}</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(archivoTamano / 1024)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-xs">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">Haga clic o arrastre el archivo aquí</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Imágenes (PNG, JPG, WEBP) o PDF</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notas opcionales */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Notas Médicas / Observaciones (Opcional)
              </label>
              <Input
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Detalles sobre la orden o indicaciones previas"
                className="text-xs bg-background border-border text-foreground"
              />
            </div>

            {/* Asistente Bot Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2.5 text-xs text-foreground">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>
                Al guardar, el <strong>Asistente Clínico Inteligente</strong> estructurará automáticamente los parámetros, identificará valores alterados y redactará la guía para el paciente.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalUploadOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploadLoading}
                className="text-xs gap-1.5 cursor-pointer font-semibold"
              >
                {uploadLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando y Analizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Guardar y Analizar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL VISOR INTELIGENTE */}
      <EstudioDetalleModal
        estudioId={selectedEstudioId}
        open={modalViewerOpen}
        onClose={() => {
          setModalViewerOpen(false);
          setSelectedEstudioId(null);
        }}
        onEstudioUpdated={fetchEstudios}
      />
    </div>
  );
};

export default EstudiosArchivosTab;
