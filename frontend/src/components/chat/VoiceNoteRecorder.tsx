import React, { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { chatApi } from '../../api/chat';
import type { ChatUploadResponse } from '../../types/chat';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (uploadedAudio: ChatUploadResponse, durationSeconds: number) => Promise<void>;
  onCancel: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
      }

      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 64000,
      };
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Iniciar sin timeslice para generar un contenedor de audio unificado sin saltos de paquetes
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error al acceder al micrófono:', err);
      toast.error('No se pudo acceder al micrófono. Verifica los permisos de tu navegador.');
      onCancel();
    }
  };

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    audioChunksRef.current = [];
    setIsRecording(false);
    onCancel();
  };

  const handleFinishAndSend = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      handleCancel();
      return;
    }

    setUploading(true);

    recorder.onstop = async () => {
      stopTracks();
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const finalDuration = Math.max(1, duration);

        if (audioBlob.size === 0) {
          toast.warning('La nota de voz está vacía.');
          onCancel();
          return;
        }

        const audioFile = new File([audioBlob], `nota_voz_${Date.now()}.webm`, {
          type: 'audio/webm',
        });

        const uploadRes = await chatApi.uploadFile(audioFile);
        await onSendVoiceNote(uploadRes, finalDuration);
      } catch (err: any) {
        console.error('Error subiendo nota de voz:', err);
        toast.error(err.message || 'Error al enviar la nota de voz.');
      } finally {
        setUploading(false);
        setIsRecording(false);
      }
    };

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2 animate-in fade-in-50">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>
        <Mic className="h-4 w-4 text-rose-600 dark:text-rose-400 animate-pulse" />
        <span className="text-xs font-mono font-semibold text-rose-700 dark:text-rose-300">
          {formatTimer(duration)}
        </span>
      </div>

      <div className="flex-1 text-xs text-rose-600/80 dark:text-rose-400/80 italic truncate">
        Grabando nota de voz clínica...
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          disabled={uploading}
          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg cursor-pointer"
          title="Cancelar nota de voz"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleFinishAndSend}
          disabled={uploading}
          className="h-8 bg-rose-600 hover:bg-rose-700 text-white gap-1.5 px-3 rounded-lg text-xs cursor-pointer shadow-xs"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>{uploading ? 'Subiendo...' : 'Enviar'}</span>
        </Button>
      </div>
    </div>
  );
};
