import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '../ui/button';
import { getFullMediaUrl } from '../../api/chat';

interface AudioMessagePlayerProps {
  src: string;
  duration?: number | null;
  isSelf?: boolean;
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  src,
  duration: initialDuration,
  isSelf = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Normalizar URL apuntando al backend real si es relativa
  const fullSrc = getFullMediaUrl(src);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [fullSrc]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Pausar cualquier otro reproductor activo en la pantalla
      document.querySelectorAll('audio').forEach((el) => {
        if (el !== audio) {
          el.pause();
        }
      });
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Error reproduciendo nota de voz:', fullSrc, err);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 py-1 px-1 min-w-[210px] max-w-[280px]">
      <audio ref={audioRef} src={fullSrc} preload="metadata" />

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className={`h-9 w-9 rounded-full shrink-0 cursor-pointer shadow-xs transition-transform active:scale-95 ${
          isSelf
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </Button>

      <div className="flex-1 space-y-1">
        {/* Barra de Progreso Deslizable */}
        <div className="relative flex items-center h-3">
          <input
            type="range"
            min="0"
            max={totalDuration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-black/10 dark:bg-white/20"
          />
        </div>

        <div
          className={`flex justify-between text-[10px] font-mono leading-none ${
            isSelf ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <span>{formatTime(currentTime)}</span>
          <span className="flex items-center gap-0.5">
            <Volume2 className="h-2.5 w-2.5 opacity-60" />
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>
    </div>
  );
};
