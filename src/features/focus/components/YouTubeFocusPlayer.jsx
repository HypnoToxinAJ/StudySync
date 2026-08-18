import React, { useState } from 'react';
import {
  Youtube,
  Play,
  Plus,
  Trash2,
  Edit,
  X,
  ListVideo,
  Film,
  Bookmark,
  ExternalLink,
  Maximize2,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { useYouTubeResource } from '../hooks/useYouTubeResource';
import { youtubeUrlUtils } from '../utils/youtubeUrlUtils';
import { Modal } from '../../../components/common/Modal';

export const YouTubeFocusPlayer = () => {
  const {
    urlInput,
    setUrlInput,
    urlError,
    activeEmbed,
    isTheaterMode,
    setIsTheaterMode,
    wishlist,
    recentResources,
    activeNotes,
    setActiveNotes,
    loadVideoUrl,
    clearActiveVideo,
    saveToWishlist,
    updateWishlistItem,
    deleteWishlistItem
  } = useYouTubeResource();

  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [wishlistForm, setWishlistForm] = useState({ url: '', title: '', description: '' });
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSubmitUrl = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      const success = loadVideoUrl(urlInput.trim());
      if (success) {
        setIsCompleted(false);
      }
    }
  };

  const openWishlistAdd = (prefillUrl = '') => {
    setEditingItem(null);
    setWishlistForm({
      url: prefillUrl,
      title: youtubeUrlUtils.extractDefaultTitle(prefillUrl),
      description: ''
    });
    setIsWishlistModalOpen(true);
  };

  const openWishlistEdit = (item) => {
    setEditingItem(item);
    setWishlistForm({ url: item.url, title: item.title, description: item.description });
    setIsWishlistModalOpen(true);
  };

  const handleSaveWishlist = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateWishlistItem(editingItem.id, wishlistForm);
    } else {
      saveToWishlist(wishlistForm);
    }
    setIsWishlistModalOpen(false);
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-500/10 rounded-2xl shrink-0">
            <Youtube className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Distraction-Free YouTube Station</span>
              <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full font-bold uppercase tracking-wider">
                Focus Mode
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ad-minimized, distraction-free viewing — no comments, no sidebar recommendations clutter
            </p>
          </div>
        </div>

        {activeEmbed && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCompleted(!isCompleted)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                isCompleted
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Completed' : 'Mark Completed'}</span>
            </button>

            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              {isTheaterMode ? 'Standard View' : 'Theater Mode'}
            </button>

            <button
              onClick={clearActiveVideo}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleSubmitUrl} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); }}
            placeholder="Paste YouTube video, Shorts, or playlist link..."
            className="w-full pl-4 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500/30 text-slate-900 dark:text-white font-medium"
          />
          {urlInput && (
            <button
              type="button"
              onClick={() => setUrlInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all"
          >
            <Play className="w-4 h-4" />
            <span>Play Video</span>
          </button>
          <button
            type="button"
            onClick={() => openWishlistAdd(urlInput.trim())}
            disabled={!urlInput.trim()}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </form>

      {urlError && (
        <p className="text-xs font-semibold text-rose-500">{urlError}</p>
      )}

      {/* PLAYER DISPLAY CONTAINER */}
      {activeEmbed ? (
        <div className={`space-y-4 ${isTheaterMode ? 'w-full' : ''}`}>
          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group">
            <iframe
              src={activeEmbed.embedUrl}
              title={activeEmbed.title || 'YouTube Focus Player'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              onClick={() => setIsFullscreenModalOpen(true)}
              aria-label="Fullscreen view"
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Video Notes & Quick Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                <span>Video Study Notes</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Auto-saved</span>
            </div>
            <textarea
              value={activeNotes}
              onChange={(e) => setActiveNotes(e.target.value)}
              placeholder="Jot down key timestamps, formulas, or lecture insights while watching..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none text-slate-900 dark:text-white"
            />
          </div>
        </div>
      ) : (
        /* Empty Player Placeholder */
        <div className="p-8 sm:p-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <Youtube className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No Video Loaded
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Paste a YouTube link above or select a video from your study wishlist below to start distraction-free viewing.
            </p>
          </div>
        </div>
      )}

      {/* WISHLIST & RECENTLY WATCHED TABS/LIST */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <ListVideo className="w-4 h-4 text-brand-500" />
            <span>Learning Wishlist ({wishlist.length})</span>
          </h4>
          <button
            onClick={() => openWishlistAdd()}
            className="flex items-center space-x-1 px-3 py-1 text-[11px] font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </div>

        {wishlist.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4 italic">
            No saved videos in your wishlist. Add links to build your focus playlist.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
            {wishlist.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 group flex flex-col justify-between space-y-2 hover:border-brand-500/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    {item.type === 'playlist' ? (
                      <ListVideo className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    ) : (
                      <Film className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => loadVideoUrl(item.url, item.title)} title="Play">
                      <Play className="w-3.5 h-3.5 text-brand-600 hover:scale-110" />
                    </button>
                    <button onClick={() => openWishlistEdit(item)} title="Edit">
                      <Edit className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                    </button>
                    <button onClick={() => deleteWishlistItem(item.id)} title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 hover:scale-110" />
                    </button>
                  </div>
                </div>

                {item.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {item.description}
                  </p>
                )}

                <button
                  onClick={() => loadVideoUrl(item.url, item.title)}
                  className="text-[10px] font-bold text-brand-600 dark:text-brand-400 flex items-center space-x-1 hover:underline"
                >
                  <Play className="w-3 h-3" />
                  <span>Load in player</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FULLSCREEN PLAYER MODAL */}
      {isFullscreenModalOpen && activeEmbed && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in"
          onClick={() => setIsFullscreenModalOpen(false)}
        >
          <div
            className="w-full max-w-6xl aspect-video relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsFullscreenModalOpen(false)}
              className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-colors flex items-center space-x-1 text-xs font-bold"
            >
              <X className="w-5 h-5" />
              <span>Exit Fullscreen</span>
            </button>
            <iframe
              src={`${activeEmbed.embedUrl}&autoplay=1`}
              title="YouTube Focus Player Fullscreen"
              className="w-full h-full rounded-2xl shadow-2xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* WISHLIST EDIT MODAL */}
      <Modal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        title={editingItem ? 'Edit Wishlist Resource' : 'Add YouTube Resource'}
      >
        <form onSubmit={handleSaveWishlist} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">YouTube Link</label>
            <input
              type="url"
              value={wishlistForm.url}
              onChange={(e) => setWishlistForm({ ...wishlistForm, url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Resource Title</label>
            <input
              type="text"
              value={wishlistForm.title}
              onChange={(e) => setWishlistForm({ ...wishlistForm, title: e.target.value })}
              placeholder="e.g. DBMS Lecture Series - Indexing"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Description</label>
            <textarea
              value={wishlistForm.description}
              onChange={(e) => setWishlistForm({ ...wishlistForm, description: e.target.value })}
              placeholder="Key concepts covered, target topics..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsWishlistModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md"
            >
              {editingItem ? 'Update Item' : 'Add to Wishlist'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
