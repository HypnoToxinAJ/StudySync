import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Home, Sparkles, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { navigationPreferenceUtils } from '../../features/settings/utils/navigationPreferenceUtils';
import { useToast } from '../../context/ToastContext';

// Map routes to section IDs
const ROUTE_TO_SECTION_ID = {
  '/routine': 'routine',
  '/attendance': 'attendance',
  '/assessments': 'assessments',
  '/cgpa': 'cgpa',
  '/math-tools': 'math-tools',
  '/app/math-tools': 'math-tools',
  '/tuition': 'tuition',
  '/expenses': 'expenses',
  '/focus': 'focus'
};

export const HiddenSectionBanner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarPreferences, updateSidebarPreferences } = useData();
  const { showToast } = useToast();

  const sectionId = ROUTE_TO_SECTION_ID[location.pathname];
  if (!sectionId) return null;

  const hiddenSections = sidebarPreferences?.hiddenSections || [];
  const isHidden = hiddenSections.includes(sectionId);

  if (!isHidden) return null;

  const handleRestore = () => {
    const updated = navigationPreferenceUtils.toggleSectionVisibility(sectionId, true);
    if (updateSidebarPreferences) {
      updateSidebarPreferences(updated);
    }
    showToast('Section restored to your sidebar navigation', 'success');
  };

  return (
    <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-fadeIn">
      <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-medium">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>This section is currently hidden from your sidebar navigation. All features and data remain fully available.</span>
      </div>

      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
        <button
          onClick={handleRestore}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] shadow-sm transition-all flex items-center space-x-1"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Show in sidebar</span>
        </button>

        <button
          onClick={() => navigate('/')}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-[11px] transition-colors flex items-center space-x-1"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
      </div>
    </div>
  );
};

export default HiddenSectionBanner;
