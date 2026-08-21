import React, { useState } from 'react';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { normalizeHttpUrl } from '../../utils/assessmentUtils';

const LINK_TYPES = [
  'Study material', 'Syllabus', 'Class recording', 'Google Drive',
  'Document', 'Reference', 'Meeting link', 'Other'
];

const EMPTY_LINK = { label: '', url: '', type: 'Study material' };

export const RelatedLinksManager = ({ links = [], onChange }) => {
  const [draft, setDraft] = useState(EMPTY_LINK);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});

  const resetDraft = () => {
    setDraft(EMPTY_LINK);
    setEditingId(null);
    setErrors({});
  };

  const saveLink = () => {
    const label = draft.label.trim();
    const normalized = normalizeHttpUrl(draft.url);
    const nextErrors = {};
    if (!label) nextErrors.label = 'Enter a descriptive label.';
    if (normalized.error) nextErrors.url = normalized.error;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const now = new Date().toISOString();
    if (editingId) {
      onChange(links.map(link => link.id === editingId ? {
        ...link,
        label,
        url: normalized.value,
        type: draft.type || 'Other',
        updatedAt: now
      } : link));
    } else {
      onChange([...links, {
        id: `lnk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label,
        url: normalized.value,
        type: draft.type || 'Other',
        createdAt: now,
        updatedAt: now
      }]);
    }
    resetDraft();
  };

  const editLink = (link) => {
    setEditingId(link.id);
    setDraft({ label: link.label, url: link.url, type: link.type || 'Other' });
    setErrors({});
  };

  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 min-w-0">
      <legend className="px-1 text-xs font-bold text-slate-700 dark:text-slate-300">Related Links</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="related-link-label" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Link label</label>
          <input
            id="related-link-label"
            value={draft.label}
            onChange={event => setDraft({ ...draft, label: event.target.value })}
            aria-invalid={Boolean(errors.label)}
            aria-describedby={errors.label ? 'related-link-label-error' : undefined}
            placeholder="e.g. Week 4 lecture notes"
            className="w-full min-h-10 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
          />
          {errors.label && <p id="related-link-label-error" role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.label}</p>}
        </div>
        <div>
          <label htmlFor="related-link-type" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Link type</label>
          <select
            id="related-link-type"
            value={draft.type}
            onChange={event => setDraft({ ...draft, type: event.target.value })}
            className="w-full min-h-10 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            {LINK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="related-link-url" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">URL</label>
        <input
          id="related-link-url"
          type="text"
          inputMode="url"
          value={draft.url}
          onChange={event => setDraft({ ...draft, url: event.target.value })}
          aria-invalid={Boolean(errors.url)}
          aria-describedby={errors.url ? 'related-link-url-error' : 'related-link-url-help'}
          placeholder="https://example.com/resource"
          className="w-full min-h-10 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
        />
        {errors.url ? (
          <p id="related-link-url-error" role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.url}</p>
        ) : (
          <p id="related-link-url-help" className="mt-1 text-[10px] text-slate-400">HTTP and HTTPS links only. Missing https:// is added automatically.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={saveLink} className="min-h-10 px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl">
          {editingId ? 'Save link changes' : 'Add related link'}
        </button>
        {editingId && <button type="button" onClick={resetDraft} className="min-h-10 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">Cancel link edit</button>}
      </div>

      {links.length > 0 && (
        <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {links.map(link => {
            const safeUrl = normalizeHttpUrl(link.url);
            return (
            <li key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 min-w-0">
              <div className="min-w-0">
                {!safeUrl.error ? <a href={safeUrl.value} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                  <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{link.label}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a> : <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{link.label} · Unsafe URL blocked</p>}
                <p className="text-[10px] text-slate-400 mt-0.5">{link.type || 'Other'}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button" onClick={() => editLink(link)} aria-label={`Edit related link ${link.label}`} className="min-h-9 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">Edit</button>
                <button type="button" onClick={() => onChange(links.filter(item => item.id !== link.id))} aria-label={`Remove related link ${link.label}`} className="min-h-9 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30">Remove</button>
              </div>
            </li>
          );})}
        </ul>
      )}
    </fieldset>
  );
};
