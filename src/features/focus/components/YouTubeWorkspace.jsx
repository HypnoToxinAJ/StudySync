import React, { useState } from 'react';
import {
  Youtube,
  ArrowLeft,
  Play,
  Maximize2,
  Minimize2,
  BookmarkPlus,
  Trash2,
  FileEdit,
  Sparkles,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  X,
  Plus,
  History,
  Layers,
  AlertCircle
} from 'lucide-react';
import { useYouTubeResource } from '../hooks/useYouTubeResource';
import { Badge } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';

export const YouTubeWorkspace = ({ onBackToTools }) => {
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
    deleteWishlistItem
  } = useYouTubeResource();

  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [wishlistForm, setWishlistForm] = useState({ title: '', url: '', description: '' });

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const success = loadVideoUrl(urlInput);
    if (success) {
      setUrlInput('');
    }
  };

  const handleSaveToWishlistSubmit = (e) => {
    e.preventDefault();
    if (!wishlistForm.url.trim()) return;
    const success = saveToWishlist(wishlistForm);
    if (success) {
      setWishlistForm({ title: '', url: '', description: '' });
      setIsWishlistModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Top Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToTools}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center space-x-1.5 text-xs font-bold"
            title="Return to focus workspace selection"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to tools</span>
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
                <Youtube className="w-6 h-6 text-rose-500" />
                <span>Distraction-Free YouTube</span>
              </h2>
              <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold border border-rose-500/20">
                <span>Distraction-free viewing</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Watch lectures, playlists, and tutorials with zero algorithmic distractions or comments
            </p>
          </div>
        </div>

        {/* Quick Toolbar Actions */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              isNotesOpen
                ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>{isNotesOpen ? 'Hide Notes' : 'Study Notes'}</span>
          </button>

          <button
            onClick={() => setIsWishlistModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>Wishlist ({wishlist.length})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (Player + Optional Notes Side-Panel) */}
      <div className={`grid grid-cols-1 ${isNotesOpen ? 'lg:grid-cols-12' : 'grid-cols-1'} gap-6 items-start`}>
        {/* PLAYER SECTION */}
        <div className={`${isNotesOpen ? 'lg:col-span-8' : 'w-full'} space-y-4`}>
          {/* URL Input Form */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <form onSubmit={handleUrlSubmit} className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Load Video, Shorts, or Playlist
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="Paste YouTube video or playlist URL (e.g., https://youtu.be/... or youtube.com/watch?v=...)"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Now</span>
                  </button>

                  {activeEmbed && (
                    <button
                      type="button"
                      onClick={() => {
                        setWishlistForm({
                          title: activeEmbed.title || '',
                          url: activeEmbed.url,
                          description: ''
                        });
                        setIsWishlistModalOpen(true);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Save active video to study wishlist"
                    >
                      <BookmarkPlus className="w-4 h-4 text-amber-500" />
                    </button>
                  )}
                </div>
              </div>

              {urlError && (
                <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-500 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}
            </form>
          </div>

          {/* ACTIVE EMBED PLAYER OR EMPTY STATE */}
          {activeEmbed ? (
            <div className={`p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-4 ${
              isTheaterMode ? 'max-w-none' : ''
            }`}>
              {/* Player Header Bar */}
              <div className="flex items-center justify-between text-white text-xs pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2 truncate pr-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <h4 className="font-extrabold truncate text-sm">
                    {activeEmbed.title}
                  </h4>
                  <Badge variant="rose" size="sm">
                    {activeEmbed.type.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
                  >
                    {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={clearActiveVideo}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 transition-colors"
                    title="Close Video"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Iframe Video Container */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner">
                <iframe
                  src={activeEmbed.embedUrl}
                  title={activeEmbed.title || 'YouTube Study Player'}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Resource Footer Info */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
                <span className="truncate max-w-md">Source: {activeEmbed.url}</span>
                <a
                  href={activeEmbed.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-rose-400 flex items-center space-x-1 font-semibold"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            /* EMPTY STATE WITH QUICK SUGGESTIONS */
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  No video currently loaded
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Paste a lecture, MIT OCW playlist, tutorial, or course video link above to begin distraction-free study.
                </p>
              </div>

              {/* Quick Preset Samples */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => loadVideoUrl('https://www.youtube.com/watch?v=kqtD5dpn9C8', 'Python for Beginners')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  ▶ Python 1-Hour Tutorial
                </button>
                <button
                  onClick={() => loadVideoUrl('https://www.youtube.com/watch?v=aircAruvnKk', '3Blue1Brown: Neural Networks')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  ▶ 3Blue1Brown: Neural Networks
                </button>
              </div>
            </div>
          )}

          {/* RECENTLY WATCHED RESOURCES */}
          {recentResources.length > 0 && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 dark:text-white">
                <History className="w-4 h-4 text-brand-500" />
                <span>Recently Opened Study Videos ({recentResources.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentResources.slice(0, 4).map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => loadVideoUrl(rec.url, rec.title)}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-500/5 hover:border-rose-500/30 border border-slate-200/60 dark:border-slate-700/60 text-left transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-rose-500 transition-colors">
                        {rec.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {rec.type.toUpperCase()} • {new Date(rec.openedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 shrink-0 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDE STUDY NOTES PANEL (COLLAPSIBLE) */}
        {isNotesOpen && (
          <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 sticky top-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 font-extrabold text-xs text-slate-900 dark:text-white">
                <FileEdit className="w-4 h-4 text-brand-500" />
                <span>Active Study Notes</span>
              </div>
              <button
                onClick={() => setIsNotesOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Jot down quick thoughts, timestamps, and lecture takeaways while watching:
            </p>

            <textarea
              rows={12}
              value={activeNotes}
              onChange={(e) => setActiveNotes(e.target.value)}
              placeholder="e.g. 04:15 - Explanation of Dijkstra algorithm&#10;Key takeaway: Greedy relaxation step..."
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none resize-none font-mono leading-relaxed focus:border-brand-500"
            />
          </div>
        )}
      </div>

      {/* WISHLIST MODAL */}
      <Modal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        title="Study Video Wishlist"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Add New Wishlist Item Form */}
          <form onSubmit={handleSaveToWishlistSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-brand-500" />
              <span>Add YouTube Resource to Wishlist</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford CS229 Lecture 1"
                  value={wishlistForm.title}
                  onChange={(e) => setWishlistForm({ ...wishlistForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">YouTube URL</label>
                <input
                  type="url"
                  placeholder="https://youtu.be/..."
                  value={wishlistForm.url}
                  onChange={(e) => setWishlistForm({ ...wishlistForm, url: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Add to Wishlist
            </button>
          </form>

          {/* Wishlist Items List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {wishlist.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Your study wishlist is currently empty. Save lectures and tutorials to watch later.
              </p>
            ) : (
              wishlist.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h5>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.url}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        loadVideoUrl(item.url, item.title);
                        setIsWishlistModalOpen(false);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Watch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteWishlistItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
