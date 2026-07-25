import { storageService } from './storageService';

const BRAND_ICON_MAP = [
  {
    hosts: ['github.com', 'www.github.com', 'gist.github.com'],
    icon: { type: 'brand', name: 'github' },
    color: '#111827',
  },
  {
    hosts: ['drive.google.com', 'docs.google.com', 'sheets.google.com', 'slides.google.com', 'calendar.google.com', 'mail.google.com'],
    icon: { type: 'brand', name: 'google-drive' },
    color: '#3B82F6',
  },
  {
    hosts: ['linkedin.com', 'www.linkedin.com'],
    icon: { type: 'brand', name: 'linkedin' },
    color: '#0A66C2',
  },
  {
    hosts: ['discord.com', 'discord.gg'],
    icon: { type: 'brand', name: 'discord' },
    color: '#5865F2',
  },
  {
    hosts: ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'],
    icon: { type: 'brand', name: 'x-twitter' },
    color: '#111827',
  },
  {
    hosts: ['stackoverflow.com'],
    icon: { type: 'brand', name: 'stack-overflow' },
    color: '#F97316',
  },
  {
    hosts: ['openai.com', 'chatgpt.com'],
    icon: { type: 'brand', name: 'openai' },
    color: '#10B981',
  },
  {
    hosts: ['claude.ai', 'anthropic.com'],
    icon: { type: 'solid', name: 'sparkles' },
    color: '#D97706',
  },
  {
    hosts: ['notion.so', 'www.notion.so'],
    icon: { type: 'solid', name: 'note-sticky' },
    color: '#111827',
  },
  {
    hosts: ['overleaf.com', 'www.overleaf.com'],
    icon: { type: 'solid', name: 'file-lines' },
    color: '#06B6D4',
  },
];

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
  if (hostname.includes('github') || hostname.includes('gitlab') || hostname.includes('bitbucket')) return 'Coding';
  if (hostname.includes('google') || hostname.includes('drive') || hostname.includes('docs')) return 'Academic Cloud';
  if (hostname.includes('mail') || hostname.includes('outlook') || hostname.includes('gmail')) return 'Email';
  if (hostname.includes('calendar')) return 'Planning';
  if (hostname.includes('edu') || hostname.includes('ac.bd') || hostname.includes('university')) return 'University Portal';
  return 'Personal';
};

const platformFromUrl = (urlStr) => {
  const parsed = normalizeShortcutUrl(urlStr);
  if (!parsed) {
    return {
      platform: 'unknown',
      hostname: '',
      displayName: urlStr || 'Shortcut',
      category: 'Personal',
      icon: { type: 'solid', name: 'globe' },
      color: '#4F46E5',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const matched = BRAND_ICON_MAP.find(entry => entry.hosts.some(host => hostname === host || hostname.endsWith(`.${host}`)));
  const slug = slugifyHostname(hostname);

  return {
    platform: matched?.icon?.name || slug,
    hostname,
    displayName: slug,
    category: inferCategoryFromHost(hostname),
    icon: matched?.icon || { type: 'solid', name: 'globe' },
    color: matched?.color || '#4F46E5',
  };
};

const applyDetectedMetadata = (shortcutData) => {
  const detection = platformFromUrl(shortcutData.url);
  return {
    ...shortcutData,
    color: detection.color,
    category: shortcutData.category || detection.category,
    icon: detection.icon,
    displayName: detection.displayName,
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

  // Smart icon suggestion based on URL domain
  suggestIconAndColor: (urlStr) => {
    const detection = platformFromUrl(urlStr);
    return {
      icon: detection.icon,
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
