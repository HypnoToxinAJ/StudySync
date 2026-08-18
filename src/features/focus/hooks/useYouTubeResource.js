import { useState, useEffect, useCallback } from 'react';
import { youtubeService } from '../../../services/youtubeService';
import { youtubeUrlUtils } from '../utils/youtubeUrlUtils';
import { storageService } from '../../../services/storageService';

const RECENT_YT_RESOURCES_KEY = 'studysync_recent_youtube_resources';

export const useYouTubeResource = () => {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [activeEmbed, setActiveEmbed] = useState(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [activeNotes, setActiveNotes] = useState('');

  // Load wishlist and recent resources on mount
  useEffect(() => {
    setWishlist(youtubeService.getWishlist());
    setRecentResources(storageService.get(RECENT_YT_RESOURCES_KEY, []));
  }, []);

  const addRecentResource = useCallback((resource) => {
    setRecentResources((prev) => {
      const filtered = prev.filter((item) => item.url !== resource.url);
      const updated = [
        {
          id: `yt-rec-${Date.now()}`,
          url: resource.url,
          title: resource.title || youtubeUrlUtils.extractDefaultTitle(resource.url),
          embedUrl: resource.embedUrl,
          type: youtubeUrlUtils.getLinkType(resource.url),
          openedAt: new Date().toISOString()
        },
        ...filtered
      ].slice(0, 8); // Keep top 8 recent

      storageService.set(RECENT_YT_RESOURCES_KEY, updated);
      return updated;
    });
  }, []);

  const loadVideoUrl = useCallback((url, customTitle = '') => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();

    if (!youtubeUrlUtils.isValidUrl(trimmed)) {
      setUrlError('Please enter a valid YouTube video, Shorts, or playlist URL.');
      return false;
    }

    setUrlError('');
    const embedUrl = youtubeUrlUtils.getEmbedUrl(trimmed);
    const linkType = youtubeUrlUtils.getLinkType(trimmed);
    const title = customTitle || youtubeUrlUtils.extractDefaultTitle(trimmed);

    const embedObj = {
      url: trimmed,
      embedUrl,
      type: linkType,
      title
    };

    setActiveEmbed(embedObj);
    addRecentResource(embedObj);
    return true;
  }, [addRecentResource]);

  const clearActiveVideo = () => {
    setActiveEmbed(null);
    setIsTheaterMode(false);
  };

  const refreshWishlist = () => {
    setWishlist(youtubeService.getWishlist());
  };

  const saveToWishlist = (item) => {
    if (!youtubeUrlUtils.isValidUrl(item.url)) {
      setUrlError('Invalid YouTube URL.');
      return false;
    }
    youtubeService.addToWishlist(item);
    refreshWishlist();
    return true;
  };

  const updateWishlistItem = (id, updates) => {
    youtubeService.updateWishlistItem(id, updates);
    refreshWishlist();
  };

  const deleteWishlistItem = (id) => {
    youtubeService.removeFromWishlist(id);
    refreshWishlist();
  };

  return {
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
  };
};
