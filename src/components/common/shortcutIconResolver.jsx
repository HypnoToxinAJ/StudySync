import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import {
  siGithub,
  siGoogle,
  siGoogledrive,
  siGooglecalendar,
  siGooglemeet,
  siGmail,
  siGoogledocs,
  siAnthropic,
  siYoutube,
  siFacebook,
  siInstagram,
  siX,
  siNotion,
  siDiscord,
  siStackoverflow,
  siCoursera
} from 'simple-icons';
import {
  Globe,
  Mail,
  Calendar,
  GraduationCap,
  Code2,
  Brain,
  FileText
} from 'lucide-react';

// Custom inline SVG paths for brand icons not present in simple-icons
const ChatGPTPath = "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9013 6.066 6.066 0 0 0-4.4372-1.97 6.0462 6.0462 0 0 0-5.7725 4.1485 6.0117 6.0117 0 0 0-4.0044 2.9013 6.0462 6.0462 0 0 0 .7362 7.0707 5.98 5.98 0 0 0 .5156 4.9108 6.0462 6.0462 0 0 0 6.5098 2.9013 6.066 6.066 0 0 0 4.4373 1.97 6.0462 6.0462 0 0 0 5.7724-4.1485 6.0117 6.0117 0 0 0 4.0044-2.9013 6.0462 6.0462 0 0 0-.7362-7.0707Zm-8.986 12.0016a4.457 4.457 0 0 1-2.9209-1.0924l.1428-.0825 4.858-2.8049a.808.808 0 0 0 .4083-.7071v-6.8436l2.0628 1.191a.084.084 0 0 1 .042.0694v5.7797a4.4842 4.4842 0 0 1-4.593 4.4904Zm-9.1415-4.4716a4.457 4.457 0 0 1-.5279-3.0765l.1478.0858 4.858 2.8049a.808.808 0 0 0 .8083 0l5.9268-3.422V16.126a.084.084 0 0 1-.042.0728l-5.0055 2.89a4.4842 4.4842 0 0 1-6.1655-1.7377Zm-1.708-9.8242a4.457 4.457 0 0 1 2.393-2.02l-.0049.1683v5.6097a.808.808 0 0 0 .4083.7072l5.9268 3.4219-2.0628 1.191a.084.084 0 0 1-.084 0l-5.0055-2.89a4.4842 4.4842 0 0 1-1.5709-6.1881Zm16.713 3.6308-5.9268-3.422 2.0628-1.191a.084.084 0 0 1 .084 0l5.0055 2.89a4.4842 4.4842 0 0 1 1.5709 6.1882 4.457 4.457 0 0 1-2.393 2.02l.0049-.1683V12.574a.808.808 0 0 0-.4083-.7072Zm2.5517-3.0805a4.457 4.457 0 0 1 .5279 3.0765l-.1478-.0858-4.858-2.8049a.808.808 0 0 0-.8083 0l-5.9268 3.422V7.874a.084.084 0 0 1 .042-.0728l5.0055-2.89a4.4842 4.4842 0 0 1 6.1655 1.7377Zm-12.8711-2.9097a4.4842 4.4842 0 0 1 4.593-4.4904 4.457 4.457 0 0 1 2.9209 1.0924l-.1428.0825-4.858 2.8049a.808.808 0 0 0-.4083.7071v6.8436l-2.0628-1.191a.084.084 0 0 1-.042-.0694V5.1662Zm.9351 7.2346 2.6592-1.5354 2.6592 1.5354v3.0708l-2.6592 1.5354-2.6592-1.5354Z";

const TeamsPath = "M19.5 7.5A2.5 2.5 0 1 0 17 5a2.5 2.5 0 0 0 2.5 2.5zm-15 0A2.5 2.5 0 1 0 2 5a2.5 2.5 0 0 0 2.5 2.5zm11.5 2h-4a2.5 2.5 0 0 0-2.5 2.5V18a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-6a2.5 2.5 0 0 0-2.5-2.5zm-9 1H4a2.5 2.5 0 0 0-2.5 2.5V18a2 2 0 0 0 2 2h3.5v-7A2.5 2.5 0 0 1 7 10.5z";

const OneDrivePath = "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z";

// Brand SVG Mapping table by host/domain keywords
const BRAND_DOMAINS = [
  { keywords: ['github.com', 'gist.github.com'], icon: siGithub, color: '#181717' },
  { keywords: ['drive.google.com'], icon: siGoogledrive, color: '#4285F4' },
  { keywords: ['calendar.google.com'], icon: siGooglecalendar, color: '#4285F4' },
  { keywords: ['meet.google.com'], icon: siGooglemeet, color: '#00897B' },
  { keywords: ['mail.google.com', 'gmail.com'], icon: siGmail, color: '#EA4335' },
  { keywords: ['docs.google.com', 'sheets.google.com', 'slides.google.com'], icon: siGoogledocs, color: '#4285F4' },
  { keywords: ['google.com'], icon: siGoogle, color: '#4285F4' },
  { keywords: ['linkedin.com'], faIcon: faLinkedin, color: '#0A66C2', name: 'LinkedIn' },
  { keywords: ['chatgpt.com', 'chat.openai.com', 'openai.com'], customSvgPath: ChatGPTPath, color: '#10A37F', name: 'ChatGPT' },
  { keywords: ['claude.ai', 'anthropic.com'], icon: siAnthropic, color: '#D97706' },
  { keywords: ['youtube.com', 'youtu.be'], icon: siYoutube, color: '#FF0000' },
  { keywords: ['facebook.com', 'fb.com'], icon: siFacebook, color: '#1877F2' },
  { keywords: ['instagram.com'], icon: siInstagram, color: '#E4405F' },
  { keywords: ['x.com', 'twitter.com'], icon: siX, color: '#000000' },
  { keywords: ['teams.microsoft.com', 'teams.live.com'], customSvgPath: TeamsPath, color: '#6264A7', name: 'Microsoft Teams' },
  { keywords: ['onedrive.live.com', 'onedrive.com'], customSvgPath: OneDrivePath, color: '#0078D4', name: 'OneDrive' },
  { keywords: ['notion.so', 'notion.site'], icon: siNotion, color: '#000000' },
  { keywords: ['discord.com', 'discord.gg'], icon: siDiscord, color: '#5865F2' },
  { keywords: ['stackoverflow.com'], icon: siStackoverflow, color: '#F48024' },
  { keywords: ['coursera.org'], icon: siCoursera, color: '#0056D2' }
];

export const resolveShortcutIcon = (urlStr = '', category = '') => {
  if (!urlStr) {
    return { type: 'fallback', Component: Globe, color: '#4F46E5', name: 'Globe' };
  }

  let hostname = '';
  try {
    const parsed = new URL(urlStr.includes('://') ? urlStr : `https://${urlStr}`);
    hostname = parsed.hostname.toLowerCase();
  } catch {
    hostname = urlStr.toLowerCase();
  }

  // Priority 1: Exact detected brand SVG from simple-icons or FA table
  const matchedBrand = BRAND_DOMAINS.find(item =>
    item.keywords.some(kw => hostname === kw || hostname.endsWith(`.${kw}`))
  );

  if (matchedBrand) {
    if (matchedBrand.icon) {
      return {
        type: 'simple-icon',
        iconData: matchedBrand.icon,
        color: matchedBrand.color || `#${matchedBrand.icon.hex}`,
        name: matchedBrand.icon.title
      };
    }
    if (matchedBrand.faIcon) {
      return {
        type: 'fa-icon',
        faIcon: matchedBrand.faIcon,
        color: matchedBrand.color,
        name: matchedBrand.name
      };
    }
    if (matchedBrand.customSvgPath) {
      return {
        type: 'custom-path',
        path: matchedBrand.customSvgPath,
        color: matchedBrand.color,
        name: matchedBrand.name
      };
    }
  }

  // Priority 2: Domain category detection (University portals / LMS)
  if (hostname.includes('.edu') || hostname.includes('.ac.bd') || hostname.includes('university') || hostname.includes('portal') || hostname.includes('lms') || hostname.includes('moodle') || hostname.includes('canvas')) {
    return {
      type: 'lucide',
      Component: GraduationCap,
      color: '#4F46E5',
      name: 'University Portal'
    };
  }

  // Priority 3: Category fallback icon
  const lowerCat = (category || '').toLowerCase();
  if (lowerCat.includes('ai')) return { type: 'lucide', Component: Brain, color: '#10B981', name: 'AI Tool' };
  if (lowerCat.includes('code') || lowerCat.includes('programming')) return { type: 'lucide', Component: Code2, color: '#6366F1', name: 'Coding' };
  if (lowerCat.includes('email') || lowerCat.includes('mail')) return { type: 'lucide', Component: Mail, color: '#EF4444', name: 'Email' };
  if (lowerCat.includes('planning') || lowerCat.includes('calendar')) return { type: 'lucide', Component: Calendar, color: '#F59E0B', name: 'Planning' };
  if (lowerCat.includes('academic') || lowerCat.includes('doc')) return { type: 'lucide', Component: FileText, color: '#06B6D4', name: 'Document' };

  // Priority 4: Generic Globe / ExternalLink fallback
  return {
    type: 'fallback',
    Component: Globe,
    color: '#64748B',
    name: 'Website'
  };
};

export const ShortcutIconResolver = ({ shortcut, className = 'w-5 h-5' }) => {
  const resolved = resolveShortcutIcon(shortcut?.url, shortcut?.category);

  if (resolved.type === 'simple-icon') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        style={{ color: '#FFFFFF' }}
        aria-label={`${resolved.name} icon`}
      >
        <path d={resolved.iconData.path} />
      </svg>
    );
  }

  if (resolved.type === 'fa-icon') {
    return <FontAwesomeIcon icon={resolved.faIcon} className={`${className} text-white`} aria-label={`${resolved.name} icon`} />;
  }

  if (resolved.type === 'custom-path') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        style={{ color: '#FFFFFF' }}
        aria-label={`${resolved.name} icon`}
      >
        <path d={resolved.path} />
      </svg>
    );
  }

  const IconComponent = resolved.Component || Globe;
  return <IconComponent className={`${className} text-white`} aria-label={`${resolved.name} icon`} />;
};
