import { storageService } from './storageService';

export const shortcutService = {
  getAll: () => {
    return storageService.get(storageService.KEYS.SHORTCUTS, []);
  },

  saveAll: (shortcuts) => {
    storageService.set(storageService.KEYS.SHORTCUTS, shortcuts);
  },

  add: (shortcutData) => {
    const shortcuts = shortcutService.getAll();
    const newShortcut = {
      id: `sc-${Date.now()}`,
      pinned: false,
      color: "#4F46E5",
      category: "Personal",
      ...shortcutData
    };
    shortcuts.push(newShortcut);
    shortcutService.saveAll(shortcuts);
    return newShortcut;
  },

  update: (id, updatedData) => {
    const shortcuts = shortcutService.getAll();
    const index = shortcuts.findIndex(s => s.id === id);
    if (index !== -1) {
      shortcuts[index] = { ...shortcuts[index], ...updatedData };
      shortcutService.saveAll(shortcuts);
      return shortcuts[index];
    }
    return null;
  },

  delete: (id) => {
    const shortcuts = shortcutService.getAll();
    const filtered = shortcuts.filter(s => s.id !== id);
    shortcutService.saveAll(filtered);
    return filtered;
  },

  togglePin: (id) => {
    const shortcuts = shortcutService.getAll();
    const index = shortcuts.findIndex(s => s.id === id);
    if (index !== -1) {
      shortcuts[index].pinned = !shortcuts[index].pinned;
      shortcutService.saveAll(shortcuts);
    }
  },

  // Smart icon suggestion based on URL domain
  suggestIconAndColor: (urlStr) => {
    const url = (urlStr || '').toLowerCase();
    if (url.includes('chatgpt') || url.includes('openai')) return { icon: 'brain', color: '#10B981' };
    if (url.includes('claude') || url.includes('anthropic')) return { icon: 'sparkles', color: '#D97706' };
    if (url.includes('drive.google') || url.includes('dropbox')) return { icon: 'hard-drive', color: '#3B82F6' };
    if (url.includes('github') || url.includes('gitlab')) return { icon: 'code', color: '#64748B' };
    if (url.includes('mail.google') || url.includes('outlook')) return { icon: 'mail', color: '#EF4444' };
    if (url.includes('calendar')) return { icon: 'calendar', color: '#8B5CF6' };
    if (url.includes('overleaf') || url.includes('notion')) return { icon: 'file-text', color: '#06B6D4' };
    if (url.includes('youtube') || url.includes('coursera')) return { icon: 'play-circle', color: '#FF0000' };
    return { icon: 'globe', color: '#4F46E5' };
  }
};
