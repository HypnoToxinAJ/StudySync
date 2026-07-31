import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { youtubeService } from '../../services/youtubeService';
import { Modal } from '../common/Modal';

export const YouTubeFocusCard = () => {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [wishlist, setWishlist] = useState([]);
  const [activeEmbed, setActiveEmbed] = useState(null);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [wishlistForm, setWishlistForm] = useState({ url: '', title: '', description: '' });

  useEffect(() => {
    setWishlist(youtubeService.getWishlist());
  }, []);

  const refreshWishlist = () => setWishlist(youtubeService.getWishlist());

  const handleWatch = (url) => {
    if (!youtubeService.isValidUrl(url)) {
      setUrlError('Please enter a valid YouTube video or playlist link.');
      return;
    }
    setUrlError('');
    setActiveEmbed({
      url,
      embedUrl: youtubeService.getEmbedUrl(url),
      type: youtubeService.getLinkType(url)
    });
  };

  const handleSubmitUrl = (e) => {
    e.preventDefault();
    handleWatch(urlInput.trim());
  };

  const openWishlistAdd = (prefillUrl = '') => {
    setEditingItem(null);
    setWishlistForm({ url: prefillUrl, title: '', description: '' });
    setIsWishlistModalOpen(true);
  };

  const openWishlistEdit = (item) => {
    setEditingItem(item);
    setWishlistForm({ url: item.url, title: item.title, description: item.description });
    setIsWishlistModalOpen(true);
  };

  const handleSaveWishlist = (e) => {
    e.preventDefault();
    if (!youtubeService.isValidUrl(wishlistForm.url)) {
      return;
    }
    if (editingItem) {
      youtubeService.updateWishlistItem(editingItem.id, wishlistForm);
    } else {
      youtubeService.addToWishlist(wishlistForm);
    }
    refreshWishlist();
    setIsWishlistModalOpen(false);
  };

  const handleDeleteWishlist = (id) => {
    youtubeService.removeFromWishlist(id);
    refreshWishlist();
  };

  return (
    <>
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-red-500/10 rounded-xl">
            <Youtube className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Distraction-Free YouTube
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Watch videos and playlists with a clean, ad-minimized player — no sidebar, no comments, no recommendations clutter.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitUrl} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
            placeholder="Paste YouTube video or playlist link..."
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <Play className="w-4 h-4" />
              Watch
            </button>
            <button
              type="button"
              onClick={() => openWishlistAdd(urlInput.trim())}
              disabled={!urlInput.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            >
              <Bookmark className="w-4 h-4" />
              Save
            </button>
          </div>
        </form>

        {urlError && (
          <p className="text-xs font-semibold text-rose-500">{urlError}</p>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ListVideo className="w-4 h-4 text-brand-500" />
              Video Wishlist
            </h4>
            <button
              onClick={() => openWishlistAdd()}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Link
            </button>
          </div>

          {wishlist.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 italic">
              No saved videos yet. Paste a link above or add one to your wishlist.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {wishlist.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.type === 'playlist' ? (
                        <ListVideo className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      ) : (
                        <Film className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleWatch(item.url)} title="Watch">
                        <Play className="w-3.5 h-3.5 text-brand-600" />
                      </button>
                      <button onClick={() => openWishlistEdit(item)} title="Edit">
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button onClick={() => handleDeleteWishlist(item.id)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <button
                    onClick={() => handleWatch(item.url)}
                    className="mt-2 text-[10px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Watch in focus mode
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeEmbed && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 sm:p-8"
          onClick={() => setActiveEmbed(null)}
        >
          <div
            className="w-full max-w-5xl aspect-video relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveEmbed(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <X className="w-5 h-5" />
              Exit Focus Mode
            </button>
            <iframe
              src={`${activeEmbed.embedUrl}&autoplay=1`}
              title="YouTube Focus Player Fullscreen"
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <Modal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        title={editingItem ? 'Edit Wishlist Item' : 'Add to Wishlist'}
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={wishlistForm.title}
              onChange={(e) => setWishlistForm({ ...wishlistForm, title: e.target.value })}
              placeholder="e.g. DBMS Lecture Series"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={wishlistForm.description}
              onChange={(e) => setWishlistForm({ ...wishlistForm, description: e.target.value })}
              placeholder="Why you want to watch this, topics covered, etc."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
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
              {editingItem ? 'Update' : 'Add to Wishlist'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
