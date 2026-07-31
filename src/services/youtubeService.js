import { storageService } from './storageService';

const WISHLIST_KEY = 'studysync_youtube_wishlist';

export const youtubeService = {
  getWishlist: () => storageService.get(WISHLIST_KEY, []),

  saveWishlist: (items) => storageService.set(WISHLIST_KEY, items),

  addToWishlist: (item) => {
    const list = youtubeService.getWishlist();
    const newItem = {
      id: `yt-${Date.now()}`,
      url: item.url,
      title: item.title || youtubeService.extractTitle(item.url),
      description: item.description || '',
      type: youtubeService.getLinkType(item.url),
      addedAt: new Date().toISOString()
    };
    list.unshift(newItem);
    youtubeService.saveWishlist(list);
    return newItem;
  },

  updateWishlistItem: (id, updates) => {
    const list = youtubeService.getWishlist();
    const index = list.findIndex(i => i.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      youtubeService.saveWishlist(list);
      return list[index];
    }
    return null;
  },

  removeFromWishlist: (id) => {
    const filtered = youtubeService.getWishlist().filter(i => i.id !== id);
    youtubeService.saveWishlist(filtered);
    return filtered;
  },

  getLinkType: (url) => {
    if (!url) return 'unknown';
    if (/[?&]list=/.test(url)) return 'playlist';
    if (/youtu\.be\/|youtube\.com\/watch|youtube\.com\/embed|youtube\.com\/v\//.test(url)) return 'video';
    return 'unknown';
  },

  extractVideoId: (url) => {
    if (!url) return null;
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];
    return null;
  },

  extractPlaylistId: (url) => {
    if (!url) return null;
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  },

  extractTitle: (url) => {
    const type = youtubeService.getLinkType(url);
    if (type === 'playlist') return 'YouTube Playlist';
    if (type === 'video') return 'YouTube Video';
    return 'YouTube Link';
  },

  getEmbedUrl: (url) => {
    const playlistId = youtubeService.extractPlaylistId(url);
    const videoId = youtubeService.extractVideoId(url);
    const params = 'modestbranding=1&rel=0&iv_load_policy=3&fs=1&disablekb=0';

    if (playlistId && !videoId) {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&${params}`;
    }
    if (videoId) {
      const listParam = playlistId ? `&list=${playlistId}` : '';
      return `https://www.youtube-nocookie.com/embed/${videoId}?${params}${listParam}`;
    }
    return null;
  },

  isValidUrl: (url) => youtubeService.getEmbedUrl(url) !== null
};
