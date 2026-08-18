/**
 * Utility functions for YouTube URL validation, ID extraction, and safe embed URL generation.
 */

export const youtubeUrlUtils = {
  getLinkType: (url) => {
    if (!url || typeof url !== 'string') return 'unknown';
    const trimmed = url.trim();
    if (/\/shorts\//.test(trimmed)) return 'shorts';
    if (/[?&]list=/.test(trimmed)) return 'playlist';
    if (/youtu\.be\/|youtube\.com\/watch|youtube\.com\/embed|youtube\.com\/v\//.test(trimmed)) return 'video';
    return 'unknown';
  },

  extractVideoId: (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();

    // Shorts match: youtube.com/shorts/VIDEO_ID
    const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    // Embed match: youtube.com/embed/VIDEO_ID
    const embedMatch = trimmed.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    // Short URL match: youtu.be/VIDEO_ID
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];

    // Standard watch match: youtube.com/watch?v=VIDEO_ID
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];

    // Old v match: youtube.com/v/VIDEO_ID
    const vMatch = trimmed.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];

    return null;
  },

  extractPlaylistId: (url) => {
    if (!url || typeof url !== 'string') return null;
    const match = url.trim().match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  },

  getEmbedUrl: (url) => {
    if (!url || typeof url !== 'string') return null;

    const playlistId = youtubeUrlUtils.extractPlaylistId(url);
    const videoId = youtubeUrlUtils.extractVideoId(url);

    // Standard privacy-enhanced embed parameters
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

  isValidUrl: (url) => {
    return youtubeUrlUtils.getEmbedUrl(url) !== null;
  },

  extractDefaultTitle: (url) => {
    const type = youtubeUrlUtils.getLinkType(url);
    if (type === 'shorts') return 'YouTube Short';
    if (type === 'playlist') return 'YouTube Playlist';
    if (type === 'video') return 'YouTube Video';
    return 'YouTube Study Resource';
  }
};
