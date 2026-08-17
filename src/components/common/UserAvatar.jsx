import React from 'react';
import { getAvatarById } from '../../data/avatars';

export const UserAvatar = ({ user, size = 'md', className = '', alt }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-2xl',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const avatarKey = user?.avatar || 'avatar-scholar';
  const customImage = user?.customAvatarImage || user?.profileImage;

  // Case 1: Custom image URL or Base64 upload
  if (customImage) {
    return (
      <img
        src={customImage}
        alt={alt || user?.name || 'User Profile Avatar'}
        className={`${currentSizeClass} rounded-full object-cover shadow-sm ring-2 ring-brand-500/30 ${className}`}
      />
    );
  }

  // Case 2: Selected local SVG Avatar preset
  const avatarPreset = getAvatarById(avatarKey);
  if (avatarPreset) {
    return (
      <div
        className={`${currentSizeClass} rounded-full overflow-hidden shrink-0 shadow-md ring-2 ring-brand-500/20 ${className}`}
        title={avatarPreset.name}
        aria-label={alt || avatarPreset.alt}
      >
        {avatarPreset.svgContent}
      </div>
    );
  }

  // Case 3: Initials fallback
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'CU';
  return (
    <div
      className={`${currentSizeClass} rounded-full bg-brand-600 text-white font-extrabold flex items-center justify-center shrink-0 shadow-md ${className}`}
      aria-label={alt || user?.name || 'User initials'}
    >
      {initials}
    </div>
  );
};
