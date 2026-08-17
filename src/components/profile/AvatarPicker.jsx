import React, { useState } from 'react';
import { Check, Upload, RotateCcw } from 'lucide-react';
import { AVATAR_PRESETS, getAvatarById } from '../../data/avatars';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storageService } from '../../services/storageService';

export const AvatarPicker = () => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [selectedAvatarId, setSelectedAvatarId] = useState(user?.avatar || 'avatar-scholar');
  const [customImage, setCustomImage] = useState(user?.customAvatarImage || null);
  const [isCustomMode, setIsCustomMode] = useState(Boolean(user?.customAvatarImage));
  const [isEditing, setIsEditing] = useState(false);

  const activePreset = getAvatarById(selectedAvatarId);

  const handleSelectAvatar = (avatarId) => {
    setSelectedAvatarId(avatarId);
    setIsCustomMode(false);
  };

  const handleCustomImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size must be less than 2MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setCustomImage(dataUrl);
      setIsCustomMode(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const updatedUser = {
      ...user,
      avatar: selectedAvatarId,
      customAvatarImage: isCustomMode ? customImage : null,
    };
    storageService.set(storageService.KEYS.USER, updatedUser);
    if (setUser) setUser(updatedUser);
    setIsEditing(false);
    showToast('Profile avatar updated successfully!');
  };

  const handleCancel = () => {
    setSelectedAvatarId(user?.avatar || 'avatar-scholar');
    setCustomImage(user?.customAvatarImage || null);
    setIsCustomMode(Boolean(user?.customAvatarImage));
    setIsEditing(false);
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Netflix-Style Profile Avatar</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose your academic persona avatar or upload a custom image
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            Change Avatar
          </button>
        )}
      </div>

      {/* Current Active Preview */}
      <div className="flex items-center space-x-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
        <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 shadow-lg ring-4 ring-brand-500/30">
          {isCustomMode && customImage ? (
            <img src={customImage} alt="Custom Profile Avatar" className="w-full h-full object-cover" />
          ) : (
            activePreset.svgContent
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {isCustomMode ? 'Custom Uploaded Avatar' : activePreset.name}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isCustomMode ? 'Personal image uploaded' : activePreset.alt}
          </p>
          <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-md">
            Active Everywhere
          </span>
        </div>
      </div>

      {/* Avatar Picker Grid Modal/Section (when editing) */}
      {isEditing && (
        <div className="space-y-6 pt-2">
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Select Preset Avatar
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = !isCustomMode && selectedAvatarId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectAvatar(preset.id)}
                    aria-label={`Select ${preset.name}: ${preset.alt}`}
                    className={`relative p-3 rounded-2xl border-2 transition-all text-center flex flex-col items-center group cursor-pointer ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10 scale-105'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden shadow-md mb-2 transition-transform group-hover:scale-110">
                      {preset.svgContent}
                    </div>

                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-full">
                      {preset.name}
                    </span>

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar Upload option */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Custom Image Option
            </h4>
            <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-300 dark:border-slate-700">
              <Upload className="w-4 h-4" />
              <span>Upload Custom Image</span>
              <input type="file" accept="image/*" onChange={handleCustomImageUpload} className="hidden" />
            </label>
          </div>

          {/* Controls: Preview, Save, Cancel */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition-all"
            >
              Save Avatar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
