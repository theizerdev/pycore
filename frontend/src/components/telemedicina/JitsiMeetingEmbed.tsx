import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react';
import type { JitsiSessionConfig } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, any>) => JitsiExternalApiInstance;
  }
}

export interface JitsiExternalApiInstance {
  addEventListener: (event: string, listener: (...args: any[]) => void) => void;
  removeEventListener: (event: string, listener: (...args: any[]) => void) => void;
  executeCommand: (command: string, ...args: any[]) => void;
  getNumberOfParticipants?: () => number;
  getIFrame?: () => HTMLIFrameElement | null;
  dispose: () => void;
}

const scriptLoadCache = new Map<string, Promise<void>>();

function loadJitsiExternalScript(scriptUrl: string): Promise<void> {
  const existingPromise = scriptLoadCache.get(scriptUrl);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existingTag = document.querySelector<HTMLScriptElement>(
      `script[data-jitsi-external-url="${scriptUrl}"]`
    );
    if (existingTag && window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.jitsiExternalUrl = scriptUrl;

    script.onload = () => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
      } else {
        scriptLoadCache.delete(scriptUrl);
        reject(new Error('El script external_api.js cargó pero JitsiMeetExternalAPI no está disponible.'));
      }
    };

    script.onerror = () => {
      scriptLoadCache.delete(scriptUrl);
      script.remove();
      reject(new Error(`No se pudo cargar Jitsi External API desde ${scriptUrl}`));
    };

    document.head.appendChild(script);
  });

  scriptLoadCache.set(scriptUrl, promise);
  return promise;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface JitsiMeetingEmbedProps {
  session: JitsiSessionConfig;
  className?: string;
  showStatusBar?: boolean;
  onJoined?: () => void;
  onHangup?: (durationSeconds: number) => void;
  onParticipantCountChange?: (count: number) => void;
}

export const JitsiMeetingEmbed: React.FC<JitsiMeetingEmbedProps> = ({
  session,
  className,
  showStatusBar = true,
  onJoined,
  onHangup,
  onParticipantCountChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiExternalApiInstance | null>(null);
  const elapsedRef = useRef(0);

  const [status, setStatus] = useState<'loading' | 'ready' | 'joined' | 'ended' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Cronómetro de duración activa en videoconsulta
  useEffect(() => {
    if (status !== 'joined') return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    setElapsedSeconds(0);
    elapsedRef.current = 0;

    const initMeeting = async () => {
      try {
        await loadJitsiExternalScript(session.external_api_url);
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        // Limpiar contenedor previo si existiera
        containerRef.current.innerHTML = '';

        const options: Record<string, any> = {
          roomName: session.room_name,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          lang: 'es',
          userInfo: {
            displayName: session.user_info.displayName,
            email: session.user_info.email || undefined,
          },
          configOverwrite: session.config_overwrite,
          interfaceConfigOverwrite: session.interface_config_overwrite,
        };

        if (session.jwt) {
          options.jwt = session.jwt;
        }

        const api = new window.JitsiMeetExternalAPI(session.domain, options);
        apiRef.current = api;

        const iframe = api.getIFrame?.();
        if (iframe) {
          iframe.allow =
            'camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; speaker-selection';
          iframe.style.border = '0';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
        }

        setStatus('ready');

        const syncCount = () => {
          const total = api.getNumberOfParticipants?.() ?? 1;
          setParticipantCount(total);
          onParticipantCountChange?.(total);
        };

        api.addEventListener('videoConferenceJoined', () => {
          if (cancelled) return;
          setStatus('joined');
          if (session.subject && session.is_moderator) {
            try {
              api.executeCommand('subject', session.subject);
            } catch {
              // Ignorar si el servidor restringe cambio de asunto
            }
          }
          if (session.user_info.avatarURL) {
            try {
              api.executeCommand('avatarUrl', session.user_info.avatarURL);
            } catch {
              // Ignorar si no aplica
            }
          }
          syncCount();
          onJoined?.();
        });

        api.addEventListener('participantJoined', syncCount);
        api.addEventListener('participantLeft', syncCount);

        api.addEventListener('readyToClose', () => {
          if (cancelled) return;
          setStatus('ended');
          onHangup?.(elapsedRef.current);
        });

        api.addEventListener('videoConferenceLeft', () => {
          if (cancelled) return;
          setStatus('ended');
          onHangup?.(elapsedRef.current);
        });
      } catch (err: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          err?.message || 'No se pudo inicializar el motor WebRTC de Jitsi Meet.'
        );
      }
    };

    initMeeting();

    return () => {
      cancelled = true;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          // Limpieza silenciosa al desmontar
        }
        apiRef.current = null;
      }
    };
  }, [
    session.external_api_url,
    session.domain,
    session.room_name,
    session.jwt,
    reloadNonce,
  ]);

  return (
    <div className={cn('flex flex-col w-full h-full min-h-[420px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800', className)}>
      {showStatusBar && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-slate-200 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'size-2 rounded-full shrink-0',
                status === 'joined'
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'ready' || status === 'loading'
                    ? 'bg-amber-400 animate-pulse'
                    : status === 'error'
                      ? 'bg-rose-500'
                      : 'bg-slate-500'
              )}
            />
            <span className="font-semibold truncate">{session.subject}</span>
            <Badge
              variant="outline"
              className="border-slate-700 text-slate-300 font-mono text-[10px] hidden sm:inline-flex"
            >
              {session.domain}
            </Badge>
            {session.jwt && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] gap-1">
                <ShieldCheck className="size-3" />
                JWT
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {status === 'joined' && (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded">
                  <Users className="size-3 text-teal-400" />
                  {participantCount}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  {formatDuration(elapsedSeconds)}
                </span>
              </>
            )}
            <a
              href={session.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 hover:underline font-medium"
              title="Abrir sala en pestaña independiente"
            >
              <span>Ventana externa</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      )}

      <div className="relative flex-1 w-full h-full min-h-[380px]">
        {/* Contenedor nativo donde Jitsi monta su iframe */}
        <div ref={containerRef} className="w-full h-full" />

        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-slate-200 z-10">
            <Loader2 className="size-8 animate-spin text-teal-400" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">Inicializando cabina WebRTC Jitsi Meet...</p>
              <p className="text-xs text-slate-400 font-mono">{session.domain}</p>
            </div>
          </div>
        )}

        {status === 'ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95 text-slate-200 p-6 z-10">
            <div className="p-3 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Video className="size-7" />
            </div>
            <div className="text-center space-y-1 max-w-md">
              <h4 className="text-base font-bold">Sesión de video finalizada</h4>
              <p className="text-xs text-slate-400">
                Duración activa registrada: <span className="font-mono text-slate-200">{formatDuration(elapsedSeconds)}</span>
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReloadNonce((n) => n + 1)}
              className="gap-1.5 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              Volver a conectar a la sala
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95 text-slate-200 p-6 z-10">
            <div className="p-3 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <AlertCircle className="size-7" />
            </div>
            <div className="text-center space-y-1.5 max-w-md">
              <h4 className="text-base font-bold text-rose-300">No se pudo cargar el servidor Jitsi</h4>
              <p className="text-xs text-slate-400">{errorMessage}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setReloadNonce((n) => n + 1)}
                className="gap-1.5 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                Reintentar
              </Button>
              <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer">
                <a href={session.meeting_url} target="_blank" rel="noreferrer">
                  <span>Abrir en navegador</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JitsiMeetingEmbed;

