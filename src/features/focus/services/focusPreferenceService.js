import { storageService } from '../../../services/storageService';

const FOCUS_PREFERENCES_KEY = 'studysync_focus_preferences';
const RECENT_PDFS_KEY = 'studysync_recent_pdfs';
const RECENT_YOUTUBE_KEY = 'studysync_recent_youtube_resources';

export const focusPreferenceService = {
  getPreferences: () => {
    return storageService.get(FOCUS_PREFERENCES_KEY, {
      lastSelectedTool: null, // 'youtube' | 'pdf' | null
      theaterMode: false,
      pdfThemeSync: true
    });
  },

  savePreferences: (updates) => {
    const current = focusPreferenceService.getPreferences();
    const updated = { ...current, ...updates };
    storageService.set(FOCUS_PREFERENCES_KEY, updated);
    return updated;
  },

  setLastSelectedTool: (tool) => {
    focusPreferenceService.savePreferences({ lastSelectedTool: tool });
  },

  getRecentPdfs: () => {
    return storageService.get(RECENT_PDFS_KEY, []);
  },

  addRecentPdf: (fileInfo) => {
    if (!fileInfo || !fileInfo.name) return;
    const current = focusPreferenceService.getRecentPdfs();
    const filtered = current.filter(item => item.name !== fileInfo.name);
    const updated = [
      {
        id: `pdf-${Date.now()}`,
        name: fileInfo.name,
        size: fileInfo.size || 0,
        formattedSize: fileInfo.formattedSize || '',
        lastOpened: new Date().toISOString()
      },
      ...filtered
    ].slice(0, 6); // Keep last 6 recent PDFs metadata
    storageService.set(RECENT_PDFS_KEY, updated);
  },

  clearRecentPdfs: () => {
    storageService.set(RECENT_PDFS_KEY, []);
  },

  getRecentYouTube: () => {
    return storageService.get(RECENT_YOUTUBE_KEY, []);
  }
};
