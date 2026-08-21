import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';
import { SidebarSectionItem } from './SidebarSectionItem';
import { navigationPreferenceUtils } from '../utils/navigationPreferenceUtils';
import { navigationSelectors } from '../../../store/selectors/navigationSelectors';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';

export const SidebarSectionsSettings = () => {
  const { sidebarPreferences, updateSidebarPreferences } = useData();
  const { showToast } = useToast();

  const [prefs, setPrefs] = useState(() => {
    return sidebarPreferences || navigationPreferenceUtils.getPreferences();
  });

  useEffect(() => {
    if (sidebarPreferences) {
      setPrefs(sidebarPreferences);
    }
  }, [sidebarPreferences]);

  const allSections = navigationSelectors.getAllSections(prefs);

  const handleToggleVisibility = useCallback((sectionId, makeVisible) => {
    const updated = navigationPreferenceUtils.toggleSectionVisibility(sectionId, makeVisible);
    setPrefs(updated);
    if (updateSidebarPreferences) {
      updateSidebarPreferences(updated);
    }
    showToast(makeVisible ? 'Section shown in sidebar' : 'Section hidden from sidebar');
  }, [updateSidebarPreferences, showToast]);

  const handleMoveUp = useCallback((sectionId) => {
    const order = [...prefs.sectionOrder];
    const index = order.indexOf(sectionId);
    if (index > 1) { // Cannot move above Dashboard (index 0)
      const temp = order[index - 1];
      order[index - 1] = order[index];
      order[index] = temp;
      const updated = navigationPreferenceUtils.reorderSections(order);
      setPrefs(updated);
      if (updateSidebarPreferences) updateSidebarPreferences(updated);
    }
  }, [prefs, updateSidebarPreferences]);

  const handleMoveDown = useCallback((sectionId) => {
    const order = [...prefs.sectionOrder];
    const index = order.indexOf(sectionId);
    if (index >= 1 && index < order.length - 1) {
      const temp = order[index + 1];
      order[index + 1] = order[index];
      order[index] = temp;
      const updated = navigationPreferenceUtils.reorderSections(order);
      setPrefs(updated);
      if (updateSidebarPreferences) updateSidebarPreferences(updated);
    }
  }, [prefs, updateSidebarPreferences]);

  const handleResetLayout = () => {
    const reset = navigationPreferenceUtils.resetPreferences();
    setPrefs(reset);
    if (updateSidebarPreferences) updateSidebarPreferences(reset);
    showToast('Navigation layout restored to default');
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <LayoutGrid className="w-5 h-5 text-brand-500" />
            <span>Sidebar Sections</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose which modules appear in your sidebar and navigation drawer. Hiding a section affects menu visibility only—all data remains fully safe.
          </p>
        </div>

        <button
          onClick={handleResetLayout}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center space-x-1.5 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Layout</span>
        </button>
      </div>

      {/* Sections List */}
      <div className="space-y-2.5">
        {allSections.map((section, idx) => (
          <SidebarSectionItem
            key={section.id}
            section={section}
            index={idx}
            totalCount={allSections.length}
            onToggleVisibility={handleToggleVisibility}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          Direct URLs to hidden sections remain valid. If you open a hidden section directly, an option to restore it to the sidebar will be displayed.
        </span>
      </div>
    </div>
  );
};

export default SidebarSectionsSettings;
