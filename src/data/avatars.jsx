import React from 'react';

// Collection of Netflix-style student & academic SVG avatars
export const AVATAR_PRESETS = [
  {
    id: 'avatar-scholar',
    name: 'Academic Scholar',
    alt: 'Avatar illustration of a scholar with round glasses and a graduation mortarboard cap',
    bgGradient: 'from-indigo-600 to-purple-600',
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="50" fill="url(#scholar-grad)" />
        <defs>
          <linearGradient id="scholar-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        {/* Head */}
        <circle cx="50" cy="45" r="22" fill="#FDE047" />
        {/* Hair */}
        <path d="M 30 40 C 30 25, 70 25, 70 40 C 65 30, 35 30, 30 40 Z" fill="#1E1B4B" />
        {/* Glasses */}
        <circle cx="42" cy="45" r="7" fill="none" stroke="#1E1B4B" strokeWidth="2.5" />
        <circle cx="58" cy="45" r="7" fill="none" stroke="#1E1B4B" strokeWidth="2.5" />
        <line x1="49" y1="45" x2="51" y2="45" stroke="#1E1B4B" strokeWidth="2" />
        {/* Eyes & Smile */}
        <circle cx="42" cy="45" r="2" fill="#1E1B4B" />
        <circle cx="58" cy="45" r="2" fill="#1E1B4B" />
        <path d="M 44 54 Q 50 59 56 54" fill="none" stroke="#1E1B4B" strokeWidth="2" strokeLinecap="round" />
        {/* Mortarboard Cap */}
        <polygon points="50,15 80,27 50,39 20,27" fill="#0F172A" />
        <rect x="42" y="18" width="16" height="7" rx="2" fill="#312E81" />
        <path d="M 75 29 L 75 42 L 72 45 L 75 42 L 78 45" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <circle cx="75" cy="29" r="2" fill="#F59E0B" />
        {/* Body / Hoodie */}
        <path d="M 22 90 C 22 70, 78 70, 78 90 Z" fill="#312E81" />
      </svg>
    )
  },
  {
    id: 'avatar-coder',
    name: 'Code Wizard',
    alt: 'Avatar illustration of a programmer wearing a dark hoodie and green neon glasses',
    bgGradient: 'from-cyan-600 to-blue-700',
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="50" fill="url(#coder-grad)" />
        <defs>
          <linearGradient id="coder-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891B2" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        {/* Head */}
        <circle cx="50" cy="46" r="21" fill="#FCA5A5" />
        {/* Hoodie Back */}
        <path d="M 25 35 C 25 20, 75 20, 75 35 L 78 85 L 22 85 Z" fill="#0F172A" />
        {/* Face Cutout */}
        <circle cx="50" cy="46" r="18" fill="#FDBA74" />
        {/* Neon Glasses */}
        <rect x="33" y="40" width="14" height="10" rx="3" fill="#10B981" opacity="0.9" />
        <rect x="53" y="40" width="14" height="10" rx="3" fill="#10B981" opacity="0.9" />
        <line x1="47" y1="45" x2="53" y2="45" stroke="#10B981" strokeWidth="2" />
        {/* Code brackets overlay on glasses */}
        <path d="M 37 43 L 35 45 L 37 47" fill="none" stroke="#ECFDF5" strokeWidth="1.5" />
        <path d="M 63 43 L 65 45 L 63 47" fill="none" stroke="#ECFDF5" strokeWidth="1.5" />
        {/* Confident Smile */}
        <path d="M 45 55 Q 50 60 55 55" fill="none" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" />
        {/* Hoodie Strings */}
        <line x1="40" y1="65" x2="40" y2="80" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="65" x2="60" y2="80" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'avatar-gamer',
    name: 'Cyber Champion',
    alt: 'Avatar illustration of a gamer student wearing a gaming headset with glowing mic',
    bgGradient: 'from-fuchsia-600 to-rose-600',
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="50" fill="url(#gamer-grad)" />
        <defs>
          <linearGradient id="gamer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C026D3" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>
        </defs>
        {/* Head */}
        <circle cx="50" cy="46" r="22" fill="#FED7AA" />
        {/* Cool Hair */}
        <path d="M 28 42 Q 35 18 55 22 Q 72 26 70 42 Q 62 30 50 32 Q 36 34 28 42 Z" fill="#E11D48" />
        {/* Headset Band */}
        <path d="M 24 45 C 24 15, 76 15, 76 45" fill="none" stroke="#1E293B" strokeWidth="5" />
        {/* Earcups */}
        <rect x="20" y="38" width="10" height="18" rx="4" fill="#0284C7" />
        <rect x="70" y="38" width="10" height="18" rx="4" fill="#0284C7" />
        {/* Eyes */}
        <ellipse cx="41" cy="46" rx="2.5" ry="3.5" fill="#1E293B" />
        <ellipse cx="59" cy="46" rx="2.5" ry="3.5" fill="#1E293B" />
        {/* Mic */}
        <path d="M 25 52 Q 22 64 38 64" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="38" cy="64" r="3" fill="#38BDF8" />
        {/* Smile */}
        <path d="M 44 54 Q 50 58 56 54" fill="none" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
        {/* Jacket */}
        <path d="M 20 90 Q 50 72 80 90 Z" fill="#0F172A" />
      </svg>
    )
  },
  {
    id: 'avatar-researcher',
    name: 'Mindful Researcher',
    alt: 'Avatar illustration of a serene researcher with stylish hair and gold earrings',
    bgGradient: 'from-emerald-600 to-teal-700',
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="50" fill="url(#res-grad)" />
        <defs>
          <linearGradient id="res-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
        </defs>
        {/* Hair Back */}
        <circle cx="50" cy="48" r="28" fill="#451A03" />
        {/* Face */}
        <circle cx="50" cy="46" r="20" fill="#FDBA74" />
        {/* Stylish Bangs */}
        <path d="M 30 40 Q 50 24 70 38 Q 60 28 50 30 Q 40 30 30 40 Z" fill="#451A03" />
        {/* Eyes */}
        <path d="M 39 45 Q 43 42 45 45" fill="none" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 55 45 Q 57 42 61 45" fill="none" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
        {/* Gentle Smile */}
        <path d="M 44 54 Q 50 59 56 54" fill="none" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
        {/* Earrings */}
        <circle cx="30" cy="50" r="3" fill="#F59E0B" />
        <circle cx="70" cy="50" r="3" fill="#F59E0B" />
        {/* Sweater */}
        <path d="M 22 90 C 22 72, 78 72, 78 90 Z" fill="#ECFDF5" />
      </svg>
    )
  },
  {
    id: 'avatar-astronaut',
    name: 'Cosmic Explorer',
    alt: 'Avatar illustration of an astronaut student in a white space helmet with reflective visor',
    bgGradient: 'from-slate-800 to-indigo-950',
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="50" fill="url(#astro-grad)" />
        <defs>
          <linearGradient id="astro-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0B0F19" />
          </linearGradient>
        </defs>
        {/* Stars */}
        <circle cx="20" cy="25" r="1.5" fill="#F8FAFC" opacity="0.8" />
        <circle cx="80" cy="20" r="1" fill="#F8FAFC" opacity="0.9" />
        <circle cx="75" cy="75" r="1.5" fill="#F8FAFC" opacity="0.7" />
        <circle cx="25" cy="70" r="1" fill="#F8FAFC" opacity="0.8" />
        {/* Helmet Outer */}
        <circle cx="50" cy="46" r="26" fill="#F8FAFC" />
        {/* Visor */}
        <ellipse cx="50" cy="45" rx="20" ry="15" fill="#0EA5E9" />
        {/* Visor Reflection */}
        <path d="M 36 38 C 42 32, 58 32, 60 36 C 50 34, 40 38, 36 38 Z" fill="#E0F2FE" opacity="0.8" />
        {/* Space Suit Shoulders */}
        <path d="M 18 90 C 18 68, 82 68, 82 90 Z" fill="#F1F5F9" />
        <rect x="42" y="72" width="16" height="14" rx="3" fill="#3B82F6" />
        <circle cx="50" cy="79" r="3" fill="#EF4444" />
      </svg>
    )
  },
  {
    id: 'avatar-artist',
    name: 'Creative Designer',
    alt: 'Avatar illustration of an artist student wearing a yellow beret hat and paintbrush',
    bgGradient: 'from-amber-500 to-orange-600',
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="50" fill="url(#art-grad)" />
        <defs>
          <linearGradient id="art-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>
        {/* Head */}
        <circle cx="50" cy="48" r="21" fill="#FED7AA" />
        {/* Beret */}
        <path d="M 24 35 Q 50 16 78 32 Q 74 42 46 38 Q 28 40 24 35 Z" fill="#FACC15" />
        <circle cx="50" cy="22" r="3" fill="#EAB308" />
        {/* Eyes */}
        <circle cx="42" cy="48" r="2.5" fill="#431407" />
        <circle cx="58" cy="48" r="2.5" fill="#431407" />
        {/* Smile */}
        <path d="M 44 56 Q 50 61 56 56" fill="none" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
        {/* Artist Apron */}
        <path d="M 22 90 L 32 68 L 68 68 L 78 90 Z" fill="#1E293B" />
        <circle cx="45" cy="76" r="3" fill="#38BDF8" />
        <circle cx="55" cy="80" r="2.5" fill="#EC4899" />
      </svg>
    )
  },
  {
    id: 'avatar-bookworm',
    name: 'Bookworm Scholar',
    alt: 'Avatar illustration of a friendly owl wearing reading glasses and a graduation tassel',
    bgGradient: 'from-violet-600 to-blue-700',
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="50" fill="url(#owl-grad)" />
        <defs>
          <linearGradient id="owl-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        {/* Body/Head */}
        <ellipse cx="50" cy="52" rx="28" ry="26" fill="#D97706" />
        <ellipse cx="50" cy="55" rx="20" ry="18" fill="#FEF3C7" />
        {/* Eyes Surround */}
        <circle cx="38" cy="46" r="12" fill="#FFF" />
        <circle cx="62" cy="46" r="12" fill="#FFF" />
        {/* Pupils */}
        <circle cx="40" cy="46" r="5" fill="#1E1B4B" />
        <circle cx="60" cy="46" r="5" fill="#1E1B4B" />
        <circle cx="38" cy="44" r="1.5" fill="#FFF" />
        <circle cx="58" cy="44" r="1.5" fill="#FFF" />
        {/* Glasses */}
        <circle cx="38" cy="46" r="13" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
        <circle cx="62" cy="46" r="13" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
        <line x1="51" y1="46" x2="51" y2="46" stroke="#F59E0B" strokeWidth="3" />
        {/* Beak */}
        <polygon points="50,53 45,60 55,60" fill="#EA580C" />
      </svg>
    )
  },
  {
    id: 'avatar-champion',
    name: 'Academic Champion',
    alt: 'Avatar illustration of a victorious student holding a gold star badge',
    bgGradient: 'from-rose-500 to-amber-600',
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="50" fill="url(#champ-grad)" />
        <defs>
          <linearGradient id="champ-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        {/* Head */}
        <circle cx="50" cy="44" r="21" fill="#FDE047" />
        {/* Hair */}
        <path d="M 28 38 C 28 20, 72 20, 72 38 Z" fill="#78350F" />
        {/* Eyes */}
        <circle cx="42" cy="44" r="2.5" fill="#451A03" />
        <circle cx="58" cy="44" r="2.5" fill="#451A03" />
        {/* Big Smile */}
        <path d="M 42 52 Q 50 60 58 52 Z" fill="#991B1B" />
        {/* Jacket */}
        <path d="M 20 90 Q 50 66 80 90 Z" fill="#15803D" />
        {/* Gold Medal */}
        <circle cx="50" cy="74" r="7" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
        <polygon points="50,69 52,72 55,72 53,74 54,77 50,75 46,77 47,74 45,72 48,72" fill="#FFF" />
      </svg>
    )
  }
];

export const getAvatarById = (id) => {
  return AVATAR_PRESETS.find(a => a.id === id) || AVATAR_PRESETS[0];
};
