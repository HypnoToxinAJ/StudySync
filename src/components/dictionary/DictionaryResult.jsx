import React, { useState } from 'react';
import { DictionaryAudioButton } from './DictionaryAudioButton';
import { DictionaryMeaning } from './DictionaryMeaning';
import { ExternalLink, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export const DictionaryResult = ({ result, onWordClick }) => {
  const [showOrigin, setShowOrigin] = useState(false);

  if (!result) return null;

  const { word, phonetic, audioUrl, origin, meanings, sourceUrls } = result;

  return (
    <div className="space-y-4 p-4">
      {/* WORD HEADER */}
      <div className="pb-3 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
            {word}
          </h3>

          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            {phonetic && (
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-mono">
                {phonetic}
              </span>
            )}

            {audioUrl && (
              <DictionaryAudioButton audioUrl={audioUrl} word={word} />
            )}
          </div>
        </div>
      </div>

      {/* ORIGIN / ETYMOLOGY SECTION */}
      {origin && (
        <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1.5">
          <button
            type="button"
            onClick={() => setShowOrigin(!showOrigin)}
            className="w-full flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300"
          >
            <span className="flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>Word Origin & Etymology</span>
            </span>
            {showOrigin ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showOrigin && (
            <p className="text-xs text-slate-700 dark:text-slate-300 pt-1 leading-relaxed border-t border-amber-500/10">
              {origin}
            </p>
          )}
        </div>
      )}

      {/* MEANINGS GROUPED BY PART OF SPEECH */}
      <div className="space-y-3">
        {(meanings || []).map((meaning, idx) => (
          <DictionaryMeaning
            key={`${meaning.partOfSpeech}-${idx}`}
            meaning={meaning}
            onWordClick={onWordClick}
          />
        ))}
      </div>

      {/* SOURCES SECTION */}
      {sourceUrls && sourceUrls.length > 0 && (
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
          <span className="font-bold uppercase tracking-wider block text-[10px]">Sources</span>
          <div className="space-y-0.5">
            {sourceUrls.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline truncate max-w-full"
              >
                <span className="truncate">{url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
