import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';

export const PdfStudyNotesPanel = ({
  isOpen,
  onClose,
  currentPage,
  selectedText,
  onAddNote
}) => {
  const [title, setTitle] = useState(`Note for Page ${currentPage}`);
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    onAddNote({
      page: currentPage,
      title: title || `Note for Page ${currentPage}`,
      content: content.trim(),
      selectedText: selectedText || ''
    });

    setContent('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Study Note (Page ${currentPage})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Note Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. B-Tree Node Insertion Algorithm"
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            required
          />
        </div>

        {selectedText && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Referenced Selected Text:
            </span>
            <p className="text-slate-700 dark:text-slate-200 italic">
              "{selectedText}"
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Study Notes & Insights
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your explanation, summary, or questions for this page..."
            rows={4}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none text-slate-900 dark:text-white"
            required
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md"
          >
            Save Note
          </button>
        </div>
      </form>
    </Modal>
  );
};
