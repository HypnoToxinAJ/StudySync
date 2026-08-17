import React, { useState } from 'react';
import { DEFAULT_VISIBLE_DEFINITIONS } from '../../constants/dictionaryConstants';
import { Badge } from '../common/Badge';

export const DictionaryMeaning = ({ meaning, onWordClick }) => {
  const [showAllDefinitions, setShowAllDefinitions] = useState(false);

  if (!meaning) return null;

  const { partOfSpeech, definitions, synonyms, antonyms } = meaning;
  const visibleDefinitions = showAllDefinitions
    ? definitions
    : (definitions || []).slice(0, DEFAULT_VISIBLE_DEFINITIONS);

  const hasMoreDefinitions = (definitions || []).length > DEFAULT_VISIBLE_DEFINITIONS;

  return (
    <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800">
      {/* Part of Speech Badge Header */}
      <div className="flex items-center space-x-2">
        <Badge variant="indigo" size="sm" className="capitalize font-extrabold tracking-wide">
          {partOfSpeech}
        </Badge>
        <span className="text-[11px] font-semibold text-slate-400">
          {(definitions || []).length} definition{(definitions || []).length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Definitions List */}
      <ol className="space-y-2.5 list-none pl-0">
        {visibleDefinitions.map((def, index) => (
          <li key={index} className="text-xs space-y-1 pl-1">
            <div className="flex items-start space-x-2">
              <span className="font-bold text-brand-600 dark:text-brand-400 shrink-0">
                {index + 1}.
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                {def.definition}
              </p>
            </div>

            {/* Example Sentence Callout */}
            {def.example && (
              <div className="ml-5 p-2 bg-brand-500/5 dark:bg-brand-500/10 border-l-2 border-brand-500 rounded-r-xl text-[11px] text-slate-600 dark:text-slate-300 italic">
                “{def.example}”
              </div>
            )}

            {/* Definition-level Synonyms/Antonyms */}
            {def.synonyms && def.synonyms.length > 0 && (
              <div className="ml-5 flex flex-wrap items-center gap-1 text-[11px] pt-1">
                <span className="text-slate-400 font-bold">Synonyms:</span>
                {def.synonyms.map(syn => (
                  <button
                    key={syn}
                    onClick={() => onWordClick && onWordClick(syn)}
                    className="px-2 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 rounded-lg font-semibold transition-all text-[10px]"
                  >
                    {syn}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>

      {/* Show More Definitions Toggle Button */}
      {hasMoreDefinitions && (
        <button
          type="button"
          onClick={() => setShowAllDefinitions(!showAllDefinitions)}
          className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline pt-1"
        >
          {showAllDefinitions ? 'Show fewer definitions' : `Show ${definitions.length - DEFAULT_VISIBLE_DEFINITIONS} more definition${definitions.length - DEFAULT_VISIBLE_DEFINITIONS === 1 ? '' : 's'}`}
        </button>
      )}

      {/* Section-level Synonyms */}
      {synonyms && synonyms.length > 0 && (
        <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Synonyms
          </span>
          <div className="flex flex-wrap gap-1.5">
            {synonyms.slice(0, 12).map(syn => (
              <button
                key={syn}
                onClick={() => onWordClick && onWordClick(syn)}
                className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 rounded-xl text-xs font-semibold transition-all active:scale-95"
              >
                {syn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section-level Antonyms */}
      {antonyms && antonyms.length > 0 && (
        <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Antonyms
          </span>
          <div className="flex flex-wrap gap-1.5">
            {antonyms.slice(0, 12).map(ant => (
              <button
                key={ant}
                onClick={() => onWordClick && onWordClick(ant)}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition-all active:scale-95"
              >
                {ant}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
