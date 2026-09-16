import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Mic,
  Smile,
  ChevronLeft,
  Users,
  Search,
  FileText,
  Image as ImageIcon,
  CheckCheck,
  Check,
  Building2,
  Stethoscope,
  Syringe,
  ClipboardList,
  ShieldAlert,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatApi, MAX_CHAT_FILE_SIZE_BYTES } from '../../api/chat';
import { API_BASE_URL } from '../../api/client';
import { sucursalesApi } from '../../api/sucursales';
import type {
  ChatCanal,
  ChatMensaje,
  ChatPersonalItem,
  ChatUploadResponse,
} from '../../types/chat';
import type { Sucursal } from '../../types';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const EMOJIS_PRESET = ['👍', '🩺', '💉', '📋', '✅', '⏰', '⚠️', '💊', '🙏', '😊', '👋', '🚨'];

export const ChatFloatingWidget: React.FC = () => {
  const { user, sucursalActiva } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'personal'>('chats');
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);

  // Canales y Personal
  const [canales, setCanales] = useState<ChatCanal[]>([]);
  const [activeCanal, setActiveCanal] = useState<ChatCanal | null>(null);
  const [personal, setPersonal] = useState<ChatPersonalItem[]>([]);
  const [personalFilterRole, setPersonalFilterRole] = useState<string>('todos');
  const [personalSearch, setPersonalSearch] = useState('');

  // Mensajes del canal activo
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [inputTexto, setInputTexto] = useState('');
  const [totalNoLeidos, setTotalNoLeidos] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Referencias para evitar problemas de closure en WebSockets
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeCanalRef = useRef<ChatCanal | null>(null);
  const isOpenRef = useRef<boolean>(isOpen);

  useEffect(() => {
    activeCanalRef.current = activeCanal;
  }, [activeCanal]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // 1. Cargar sucursales del usuario al montar y sincronizar con sucursalActiva
  useEffect(() => {
    const loadSucursales = async () => {
      try {
        const sucs = await sucursalesApi.list();
        setSucursales(sucs);
        if (sucs.length > 0) {
          const defaultId = sucursalActiva?.id || user?.sucursal_defecto_id || sucs[0].id;
          setSelectedSucursalId(defaultId);
        }
      } catch (err) {
        console.error('Error cargando sucursales para chat:', err);
      }
    };
    loadSucursales();
  }, [user, sucursalActiva]);

  // 2. Conectar WebSocket bi-direccional en tiempo real
  useEffect(() => {
    if (!selectedSucursalId) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;

    const token = localStorage.getItem('pycore_token');
    if (!token) return;

    const connectWs = () => {
      if (!isMounted) return;

      // Derivar protocolo y host a partir de API_BASE_URL
      let base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
        base = `${proto}//${window.location.host}${base}`;
      }
      const wsBase = base.startsWith('https://')
        ? base.replace('https://', 'wss://')
        : base.replace('http://', 'ws://');

      const wsUrl = `${wsBase}/api/v1/chat/ws?token=${encodeURIComponent(token)}&sucursal_id=${selectedSucursalId}`;

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log('🟢 [CHAT WS] Conectado en tiempo real a la sucursal', selectedSucursalId);
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'nuevo_mensaje') {
              const nuevoMsg: ChatMensaje = data.mensaje;
              const currentCanal = activeCanalRef.current;
              const currentIsOpen = isOpenRef.current;

              // 1. Si el canal está actualmente abierto en pantalla:
              if (currentIsOpen && currentCanal && currentCanal.id === data.canal_id) {
                setMensajes((prev) => {
                  if (prev.some((m) => m.id === nuevoMsg.id)) return prev;
                  return [...prev, nuevoMsg];
                });
                // Marcar como leído en backend
                chatApi.markAsRead(currentCanal.id).catch(() => {});
              } else {
                // Si no estamos viendo este canal y no fue enviado por este usuario, incrementar badge
                if (nuevoMsg.remitente_id !== user?.id) {
                  setTotalNoLeidos((prev) => prev + 1);
                }
              }

              // 2. Actualizar el canal en la lista lateral
              setCanales((prev) => {
                const canalExiste = prev.some((c) => c.id === data.canal_id);
                if (!canalExiste) {
                  fetchCanalesYContadores();
                  return prev;
                }

                const isViewing = currentIsOpen && currentCanal && currentCanal.id === data.canal_id;
                return prev.map((c) => {
                  if (c.id === data.canal_id) {
                    const addUnread = (!isViewing && nuevoMsg.remitente_id !== user?.id) ? 1 : 0;
                    return {
                      ...c,
                      ultimo_mensaje: nuevoMsg,
                      no_leidos: isViewing ? 0 : c.no_leidos + addUnread,
                      updated_at: nuevoMsg.created_at,
                    };
                  }
                  return c;
                });
              });
            }
          } catch (err) {
            console.error('Error procesando evento WebSocket de chat:', err);
          }
        };

        socket.onerror = (e) => {
          console.warn('⚠️ [CHAT WS] Error en socket:', e);
        };

        socket.onclose = () => {
          setWsConnected(false);
          if (isMounted) {
            console.log('🔴 [CHAT WS] Conexión cerrada. Reconectando en 3s...');
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };
      } catch (err) {
        console.error('Error iniciando WebSocket de chat:', err);
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWs, 4000);
        }
      }
    };

    connectWs();

    // Ping cada 25 segundos para evitar timeouts de proxies
    const pingInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: 'ping' }));
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [selectedSucursalId, user?.id]);

  // 3. Cargar canales y no leídos al cambiar de sucursal
  const fetchCanalesYContadores = async () => {
    if (!selectedSucursalId) return;
    try {
      const [channelsData, unreadData] = await Promise.all([
        chatApi.getCanales(selectedSucursalId),
        chatApi.getNoLeidos(selectedSucursalId),
      ]);
      setCanales(channelsData);
      setTotalNoLeidos(unreadData.total_no_leidos);
    } catch (err) {
      console.error('Error cargando canales de chat:', err);
    }
  };

  useEffect(() => {
    fetchCanalesYContadores();
    const interval = setInterval(fetchCanalesYContadores, 12000);
    return () => clearInterval(interval);
  }, [selectedSucursalId]);

  // 4. Sincronizador de respaldo: sondeo periódico si una conversación está abierta
  useEffect(() => {
    if (!isOpen || !activeCanal) return;

    const syncInterval = setInterval(async () => {
      try {
        const msgs = await chatApi.getMensajes(activeCanal.id);
        setMensajes((prev) => {
          const prevLastId = prev.length > 0 ? prev[prev.length - 1].id : null;
          const newLastId = msgs.length > 0 ? msgs[msgs.length - 1].id : null;
          if (msgs.length !== prev.length || newLastId !== prevLastId) {
            return msgs;
          }
          return prev;
        });
      } catch (err) {
        // Silencioso
      }
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [isOpen, activeCanal?.id]);

  // 5. Cargar personal de la sucursal
  const fetchPersonal = async () => {
    if (!selectedSucursalId) return;
    try {
      const data = await chatApi.getPersonal(selectedSucursalId);
      setPersonal(data);
    } catch (err) {
      console.error('Error cargando personal para chat:', err);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'personal') {
      fetchPersonal();
    }
  }, [isOpen, activeTab, selectedSucursalId]);

  // 6. Cargar mensajes cuando se abre un canal
  useEffect(() => {
    if (!activeCanal) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await chatApi.getMensajes(activeCanal.id);
        setMensajes(msgs);
        await chatApi.markAsRead(activeCanal.id);

        // Disminuir contador
        setTotalNoLeidos((prev) => Math.max(0, prev - activeCanal.no_leidos));
        setCanales((prev) =>
          prev.map((c) => (c.id === activeCanal.id ? { ...c, no_leidos: 0 } : c))
        );
      } catch (err) {
        console.error('Error cargando mensajes:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [activeCanal?.id]);

  // Auto-scroll al fondo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length]);

  // Enviar mensaje de texto
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim() || !activeCanal) return;

    const texto = inputTexto.trim();
    setInputTexto('');
    setShowEmojiPicker(false);

    try {
      const msg = await chatApi.sendMensaje(activeCanal.id, {
        contenido: texto,
        tipo: 'texto',
      });
      setMensajes((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setCanales((prev) =>
        prev.map((c) => (c.id === activeCanal.id ? { ...c, ultimo_mensaje: msg, updated_at: msg.created_at } : c))
      );
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      toast.error('No se pudo enviar el mensaje.');
    }
  };

  // Enviar nota de voz
  const handleSendVoiceNote = async (uploadRes: ChatUploadResponse, durationSeconds: number) => {
    if (!activeCanal) return;
    try {
      const msg = await chatApi.sendMensaje(activeCanal.id, {
        tipo: 'audio',
        archivo_url: uploadRes.archivo_url,
        archivo_nombre: uploadRes.archivo_nombre,
        archivo_tamano: uploadRes.archivo_tamano,
        archivo_tipo: uploadRes.archivo_tipo,
        duracion_audio: durationSeconds,
      });
      setMensajes((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setCanales((prev) =>
        prev.map((c) => (c.id === activeCanal.id ? { ...c, ultimo_mensaje: msg, updated_at: msg.created_at } : c))
      );
      setIsRecordingVoice(false);
    } catch (err) {
      console.error('Error guardando nota de voz:', err);
      toast.error('Error guardando nota de voz.');
    }
  };

  // Subir adjunto (imagen o documento <= 4 MB)
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCanal) return;

    // Validación estricta en el cliente (4 MB)
    if (file.size > MAX_CHAT_FILE_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`El archivo pesa ${mb} MB. El límite máximo permitido es de 4 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingFile(true);
    try {
      const uploadRes = await chatApi.uploadFile(file);
      const isImage = file.type.startsWith('image/');
      const tipo = isImage ? 'imagen' : 'documento';

      const msg = await chatApi.sendMensaje(activeCanal.id, {
        tipo,
        archivo_url: uploadRes.archivo_url,
        archivo_nombre: uploadRes.archivo_nombre,
        archivo_tamano: uploadRes.archivo_tamano,
        archivo_tipo: uploadRes.archivo_tipo,
        contenido: file.name,
      });
      setMensajes((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setCanales((prev) =>
        prev.map((c) => (c.id === activeCanal.id ? { ...c, ultimo_mensaje: msg, updated_at: msg.created_at } : c))
      );
      toast.success('Archivo adjuntado correctamente');
    } catch (err: any) {
      console.error('Error subiendo archivo:', err);
      toast.error(err.message || 'Error al subir el archivo.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Iniciar chat directo con un colega
  const handleStartDirectChat = async (colleagueId: number) => {
    if (!selectedSucursalId) return;
    try {
      const canal = await chatApi.openDirectChannel(colleagueId, selectedSucursalId);
      setActiveCanal(canal);
      setActiveTab('chats');
      fetchCanalesYContadores();
    } catch (err) {
      console.error('Error abriendo chat directo:', err);
      toast.error('No se pudo iniciar el chat con este usuario.');
    }
  };

  // Helper para badge de rol
  const renderRoleBadge = (rolSlug: string, rolNombre: string) => {
    if (rolSlug === 'medico') {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-medium py-0">
          <Stethoscope className="h-2.5 w-2.5" />
          {rolNombre}
        </Badge>
      );
    }
    if (rolSlug === 'enfermeria') {
      return (
        <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 gap-1 text-[10px] font-medium py-0">
          <Syringe className="h-2.5 w-2.5" />
          {rolNombre}
        </Badge>
      );
    }
    if (rolSlug === 'recepcion') {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px] font-medium py-0">
          <ClipboardList className="h-2.5 w-2.5" />
          {rolNombre}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 gap-1 text-[10px] font-medium py-0">
        <ShieldAlert className="h-2.5 w-2.5" />
        {rolNombre}
      </Badge>
    );
  };

  // Filtrado de personal
  const filteredPersonal = personal.filter((p) => {
    const matchesSearch = `${p.nombre} ${p.apellido} ${p.rol}`.toLowerCase().includes(personalSearch.toLowerCase());
    if (personalFilterRole === 'todos') return matchesSearch;
    return matchesSearch && p.rol_slug === personalFilterRole;
  });

  return (
    <>
      {/* ══ BOTÓN FLOTANTE PERSISTENTE EN TODAS LAS PANTALLAS ══════════════ */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative group flex items-center justify-center h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus:outline-hidden focus:ring-4 focus:ring-emerald-500/30"
          title="Abrir Chat Clínico Interno"
          aria-label="Abrir Chat Clínico"
        >
          {isOpen ? (
            <X className="h-6 w-6 transition-transform group-hover:rotate-90" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}

          {/* Badge de mensajes no leídos con pulso */}
          {totalNoLeidos > 0 && !isOpen && (
            <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center px-1.5 rounded-full bg-rose-600 text-[11px] font-bold text-white shadow-md animate-bounce border-2 border-white dark:border-zinc-900">
              {totalNoLeidos > 99 ? '99+' : totalNoLeidos}
            </span>
          )}
        </button>
      </div>

      {/* ══ VENTANA FLOTANTE DE CHAT ══════════════════════════════════════ */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[95vw] sm:w-[410px] h-[580px] max-h-[82vh] bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          
          {/* Header de la Ventana */}
          <div className="bg-emerald-600 text-white p-3.5 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeCanal ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveCanal(null)}
                  className="h-8 w-8 text-white hover:bg-white/20 rounded-full shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-4 w-4" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold truncate leading-tight">
                    {activeCanal ? activeCanal.nombre : 'Comunicación Clínica'}
                  </h4>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      wsConnected ? "bg-emerald-300 animate-pulse" : "bg-amber-300"
                    )}
                    title={wsConnected ? "Conectado en tiempo real (WebSockets)" : "Sincronizando..."}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-100 mt-0.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {sucursales.find((s) => s.id === selectedSucursalId)?.nombre || 'Sede'}
                  </span>
                </div>
              </div>
            </div>

            {/* Selector de Sucursal y Cerrar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!activeCanal && sucursales.length > 1 && (
                <select
                  value={selectedSucursalId || ''}
                  onChange={(e) => setSelectedSucursalId(Number(e.target.value))}
                  className="text-[11px] bg-emerald-700 text-white border border-emerald-500/40 rounded-lg px-2 py-1 outline-hidden cursor-pointer"
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-800 text-white">
                      {s.nombre}
                    </option>
                  ))}
                </select>
              )}

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Si no hay canal activo: Selector de Pestañas (Chats vs Personal) */}
          {!activeCanal ? (
            <div className="flex flex-col flex-1 min-h-0 bg-background">
              <div className="flex border-b border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('chats')}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                    activeTab === 'chats'
                      ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Canales & Chats</span>
                  {totalNoLeidos > 0 && (
                    <Badge variant="destructive" className="h-4 px-1 text-[10px] ml-1">
                      {totalNoLeidos}
                    </Badge>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                    activeTab === 'personal'
                      ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Personal de Sede</span>
                </button>
              </div>

              {/* Contenido Pestaña 1: Canales Activos */}
              {activeTab === 'chats' && (
                <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border/40">
                  {canales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs text-center p-4">
                      <MessageCircle className="h-8 w-8 opacity-40 mb-2" />
                      <p>No hay conversaciones activas.</p>
                      <p className="mt-1 text-[11px]">Ve a "Personal de Sede" para iniciar un chat.</p>
                    </div>
                  ) : (
                    canales.map((canal) => (
                      <div
                        key={canal.id}
                        onClick={() => setActiveCanal(canal)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer pt-2.5"
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                          canal.tipo === 'canal_sucursal'
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                        )}>
                          {canal.tipo === 'canal_sucursal' ? (
                            <Building2 className="h-5 w-5" />
                          ) : (
                            canal.nombre.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="text-xs font-semibold text-foreground truncate">
                              {canal.nombre}
                            </h5>
                            {canal.ultimo_mensaje && (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(canal.ultimo_mensaje.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p className="text-[11px] text-muted-foreground truncate">
                              {canal.ultimo_mensaje
                                ? (canal.ultimo_mensaje.tipo === 'audio' ? '🎤 Nota de voz' : canal.ultimo_mensaje.contenido || 'Archivo adjunto')
                                : 'Sin mensajes aún'}
                            </p>

                            {canal.no_leidos > 0 && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] h-4 min-w-4 px-1 flex items-center justify-center shrink-0">
                                {canal.no_leidos}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Contenido Pestaña 2: Personal Médico de la Sede */}
              {activeTab === 'personal' && (
                <div className="flex flex-col flex-1 min-h-0 p-2 space-y-2">
                  {/* Buscador de personal */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar médico, enfermería o recepción..."
                      value={personalSearch}
                      onChange={(e) => setPersonalSearch(e.target.value)}
                      className="w-full bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Filtro por Rol */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {['todos', 'medico', 'enfermeria', 'recepcion'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setPersonalFilterRole(r)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap cursor-pointer transition-colors",
                          personalFilterRole === r
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {r === 'todos' ? 'Todos' : r === 'medico' ? '🩺 Doctores' : r === 'enfermeria' ? '💉 Enfermería' : '📋 Recepción'}
                      </button>
                    ))}
                  </div>

                  {/* Lista de Personal */}
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {filteredPersonal.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        No se encontró personal clínico en esta categoría.
                      </div>
                    ) : (
                      filteredPersonal.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleStartDirectChat(p.id)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs shrink-0 text-foreground">
                              {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {p.nombre} {p.apellido}
                              </p>
                              <div className="mt-0.5">
                                {renderRoleBadge(p.rol_slug, p.rol)}
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          >
                            Chat
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ══ VISTA DE CONVERSACIÓN ACTIVA ══════════════════════════════ */
            <div className="flex flex-col flex-1 min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">
              {/* Aviso de retención de 1 mes */}
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1 flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-300">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>Los mensajes y multimedia expiran automáticamente a los 30 días.</span>
                </span>
                <span className="font-mono text-[9px] opacity-75">Retención 1M</span>
              </div>

              {/* Flujo de Mensajes */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    ¡Comienza la conversación! Puedes enviar texto, notas de voz, imágenes o documentos (máx 4 MB).
                  </div>
                ) : (
                  mensajes.map((m) => {
                    const isSelf = m.remitente_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex flex-col max-w-[85%]",
                          isSelf ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        {!isSelf && (
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[11px] font-bold text-foreground">
                              {m.remitente_nombre}
                            </span>
                            {renderRoleBadge(m.remitente_rol_slug, m.remitente_rol)}
                          </div>
                        )}

                        <div
                          className={cn(
                            "rounded-2xl px-3 py-2 text-xs shadow-xs break-words",
                            isSelf
                              ? "bg-emerald-600 text-white rounded-tr-xs"
                              : "bg-white dark:bg-zinc-800 text-foreground border border-border rounded-tl-xs"
                          )}
                        >
                          {/* Mensaje de tipo Audio (Nota de voz) */}
                          {m.tipo === 'audio' && m.archivo_url && (
                            <AudioMessagePlayer
                              src={m.archivo_url}
                              duration={m.duracion_audio}
                              isSelf={isSelf}
                            />
                          )}

                          {/* Mensaje de tipo Imagen */}
                          {m.tipo === 'imagen' && m.archivo_url && (
                            <div className="space-y-1">
                              <img
                                src={m.archivo_url}
                                alt="Adjunto de chat"
                                className="rounded-lg max-h-48 w-auto object-cover cursor-pointer hover:opacity-95"
                                onClick={() => window.open(m.archivo_url!, '_blank')}
                              />
                              {m.contenido && m.contenido !== m.archivo_nombre && (
                                <p className="mt-1">{m.contenido}</p>
                              )}
                            </div>
                          )}

                          {/* Mensaje de tipo Documento */}
                          {m.tipo === 'documento' && m.archivo_url && (
                            <a
                              href={m.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2.5 p-2 rounded-xl border transition-colors",
                                isSelf
                                  ? "bg-emerald-700/60 border-emerald-500 text-white hover:bg-emerald-700"
                                  : "bg-muted/50 border-border hover:bg-muted text-foreground"
                              )}
                            >
                              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/10 shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="font-semibold truncate max-w-[160px]">
                                  {m.archivo_nombre || 'Documento'}
                                </p>
                                <span className="text-[10px] opacity-75">
                                  {m.archivo_tamano ? `${(m.archivo_tamano / (1024 * 1024)).toFixed(2)} MB` : 'Archivo'}
                                </span>
                              </div>
                              <Download className="h-3.5 w-3.5 ml-auto opacity-70 shrink-0" />
                            </a>
                          )}

                          {/* Mensaje de tipo Texto */}
                          {m.tipo === 'texto' && (
                            <p className="whitespace-pre-wrap">{m.contenido}</p>
                          )}

                          {/* Timestamp y Visto */}
                          <div
                            className={cn(
                              "flex items-center justify-end gap-1 mt-1 text-[9px] font-mono leading-none",
                              isSelf ? "text-emerald-100" : "text-muted-foreground"
                            )}
                          >
                            <span>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isSelf && <CheckCheck className="h-3 w-3 opacity-90" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Selector de Emojis Rápido */}
              {showEmojiPicker && (
                <div className="bg-background border-t border-border p-2 flex flex-wrap gap-2 animate-in fade-in-50">
                  {EMOJIS_PRESET.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInputTexto((prev) => prev + emoji)}
                      className="text-base hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Footer: Grabador de Voz o Barra de Texto */}
              <div className="p-2 bg-background border-t border-border">
                {isRecordingVoice ? (
                  <VoiceNoteRecorder
                    onSendVoiceNote={handleSendVoiceNote}
                    onCancel={() => setIsRecordingVoice(false)}
                  />
                ) : (
                  <form onSubmit={handleSendText} className="flex items-center gap-1.5">
                    {/* Input file oculto con límite estricto de 4 MB */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelected}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg cursor-pointer"
                      title="Adjuntar archivo o imagen (máx 4 MB)"
                    >
                      {uploadingFile ? (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg cursor-pointer"
                      title="Emojis clínicos"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>

                    <input
                      type="text"
                      placeholder="Escribe un mensaje..."
                      value={inputTexto}
                      onChange={(e) => setInputTexto(e.target.value)}
                      className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />

                    {inputTexto.trim() ? (
                      <Button
                        type="submit"
                        size="icon"
                        className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 rounded-xl cursor-pointer shadow-xs"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsRecordingVoice(true)}
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 rounded-xl cursor-pointer"
                        title="Grabar nota de voz"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
