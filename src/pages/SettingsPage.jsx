import React, { useState } from 'react';
import {
  User,
  Moon,
  Sun,
  Download,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { storageService } from '../services/storageService';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { AvatarPicker } from '../components/profile/AvatarPicker';
import { ResetSemesterCard } from '../features/settings/components/ResetSemesterCard';
import { SidebarSectionsSettings } from '../features/settings/components/SidebarSectionsSettings';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { refreshData } = useData();

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleExportData = () => {
    const data = {
      user: storageService.get(storageService.KEYS.USER),
      courses: storageService.get(storageService.KEYS.COURSES),
      routines: storageService.get(storageService.KEYS.ROUTINES),
      archivedRoutineEvents: storageService.get(storageService.KEYS.ARCHIVED_ROUTINE_EVENTS),
      assessments: storageService.get(storageService.KEYS.ASSESSMENTS),
      semesters: storageService.get(storageService.KEYS.SEMESTERS),
      tuitions: storageService.get(storageService.KEYS.TUITIONS),
      expenses: storageService.get(storageService.KEYS.EXPENSES),
      shortcuts: storageService.get(storageService.KEYS.SHORTCUTS),
      tasks: storageService.get(storageService.KEYS.TASKS),
      notes: storageService.get(storageService.KEYS.NOTES),
      sidebarPreferences: storageService.get(storageService.KEYS.SIDEBAR_PREFERENCES),
      exportDate: new Date().toISOString()
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `StudySync_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleResetConfirm = () => {
    storageService.resetAll();
    refreshData();
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
          <User className="w-6 h-6 text-brand-500" />
          <span>Profile & Settings</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your student avatar persona, theme appearance, navigation layout, semester reset, and data backups
        </p>
      </div>

      {/* 1. AVATAR SELECTION SECTION */}
      <AvatarPicker />

      {/* 2. THEME & VISUAL PREFERENCES */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Theme & Appearance</h3>
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Active Theme Mode</h4>
            <p className="text-xs text-slate-500">Currently using {theme.toUpperCase()} theme</p>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:bg-brand-700"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </button>
        </div>
      </div>

      {/* 3. SIDEBAR SECTIONS CUSTOMIZATION */}
      <SidebarSectionsSettings />

      {/* 4. ACADEMIC SEMESTER RESET */}
      <ResetSemesterCard />

      {/* 5. DATA BACKUP & FULL WORKSPACE RESET */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Data Portability & Workspace Reset</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Export all your routines, courses, attendance history, CGPA records, and tuition logs as a single JSON file.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportData}
            className="flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Full Backup JSON</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-bold text-xs rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Workspace to Default Mock Data</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset StudySync Workspace?"
        message="This action will clear your custom entries and reset your workspace to pre-seeded mock university student data."
      />
    </div>
  );
};

export default SettingsPage;
