import { storageService } from './storageService';
import { resolveShortcutIcon } from '../components/common/shortcutIconResolver';

const normalizeShortcutUrl = (value) => {
  if (!value) return null;
  try {
    return new URL(value.includes('://') ? value : `https://${value}`);
  } catch {
    return null;
  }
};

const slugifyHostname = (hostname = '') => hostname.replace(/^www\./, '').split('.').slice(-2).join('.');

const inferCategoryFromHost = (hostname = '') => {
  if (hostname.includes('github') || hostname.includes('gitlab') || hostname.includes('bitbucket') || hostname.includes('stackoverflow')) return 'Coding';
  if (hostname.includes('google') || hostname.includes('drive') || hostname.includes('docs') || hostname.includes('overleaf')) return 'Academic Cloud';
  if (hostname.includes('mail') || hostname.includes('outlook') || hostname.includes('gmail')) return 'Email';
  if (hostname.includes('calendar') || hostname.includes('notion')) return 'Planning';
  if (hostname.includes('chatgpt') || hostname.includes('openai') || hostname.includes('claude') || hostname.includes('anthropic')) return 'AI Tools';
  if (hostname.includes('edu') || hostname.includes('ac.bd') || hostname.includes('university') || hostname.includes('portal') || hostname.includes('lms')) return 'University Portal';
  return 'Personal';
};

const platformFromUrl = (urlStr, category = '') => {
  const parsed = normalizeShortcutUrl(urlStr);
  const resolved = resolveShortcutIcon(urlStr, category);

  if (!parsed) {
    return {
      platform: 'unknown',
      hostname: '',
      displayName: urlStr || 'Shortcut',
      category: category || 'Personal',
      color: resolved.color || '#4F46E5',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const slug = slugifyHostname(hostname);

  return {
    platform: resolved.name || slug,
    hostname,
    displayName: slug,
    category: category || inferCategoryFromHost(hostname),
    color: resolved.color || '#4F46E5',
  };
};

const applyDetectedMetadata = (shortcutData) => {
  const detection = platformFromUrl(shortcutData.url, shortcutData.category);
  return {
    ...shortcutData,
    color: shortcutData.color || detection.color,
    category: shortcutData.category || detection.category,
    displayName: shortcutData.displayName || detection.displayName,
    hostname: detection.hostname,
    platform: detection.platform,
  };
};

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
      ...applyDetectedMetadata(shortcutData),
    };
    shortcuts.push(newShortcut);
    shortcutService.saveAll(shortcuts);
    return newShortcut;
  },

  update: (id, updatedData) => {
    const shortcuts = shortcutService.getAll();
    const index = shortcuts.findIndex(s => s.id === id);
    if (index !== -1) {
      shortcuts[index] = applyDetectedMetadata({ ...shortcuts[index], ...updatedData });
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

  suggestIconAndColor: (urlStr, category = '') => {
    const detection = platformFromUrl(urlStr, category);
    return {
      color: detection.color,
      category: detection.category,
      displayName: detection.displayName,
      hostname: detection.hostname,
      platform: detection.platform,
    };
  },

  detectPlatform: platformFromUrl,

  getShortcutLabel: (shortcut) => {
    if (!shortcut) return 'Shortcut';
    return shortcut.displayName || shortcut.name || 'Shortcut';
  }
};
