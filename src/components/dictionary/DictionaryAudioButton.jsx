import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

export const DictionaryAudioButton = ({ audioUrl, word }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  if (!audioUrl) return null;

  const handlePlayAudio = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    setHasError(false);
    setIsLoading(true);

    try {
      if (!audioRef.current) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.addEventListener('playing', () => {
          setIsLoading(false);
          setIsPlaying(true);
        });

        audio.addEventListener('ended', () => {
          setIsPlaying(false);
        });

        audio.addEventListener('error', () => {
          setIsLoading(false);
          setIsPlaying(false);
          setHasError(true);
        });
      }

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoading(false);
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Audio play error:', err);
            setIsLoading(false);
            setIsPlaying(false);
            setHasError(true);
          });
      }
    } catch (e) {
      setIsLoading(false);
      setIsPlaying(false);
      setHasError(true);
    }
  };

  return (
    <div className="inline-flex items-center space-x-1.5">
      <button
        type="button"
        onClick={handlePlayAudio}
        aria-label={`Play pronunciation for ${word || 'word'}`}
        disabled={hasError}
        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
          hasError
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : isPlaying
            ? 'bg-brand-600 text-white ring-2 ring-brand-500/40 animate-pulse'
            : 'bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400'
        }`}
        title={hasError ? 'Audio unavailable' : `Play pronunciation for ${word}`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : hasError ? (
          <VolumeX className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce' : ''}`} />
        )}
        <span>{isPlaying ? 'Playing...' : hasError ? 'Audio error' : 'Listen'}</span>
      </button>

      {hasError && (
        <span className="text-[10px] text-slate-400 italic">
          (Audio unavailable)
        </span>
      )}
    </div>
  );
};
