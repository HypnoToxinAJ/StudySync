import { NAVIGATION_SECTIONS, DEFAULT_SECTION_ORDER } from '../../features/settings/utils/navigationPreferenceUtils';

export const navigationSelectors = {
  /**
   * Returns list of visible navigation items in the configured order
   */
  getVisibleNavigationSections: (preferences) => {
    const order = preferences?.sectionOrder || DEFAULT_SECTION_ORDER;
    const hidden = preferences?.hiddenSections || [];

    const sectionMap = new Map();
    NAVIGATION_SECTIONS.forEach(sec => sectionMap.set(sec.id, sec));

    const visibleItems = [];
    order.forEach(id => {
      if (!hidden.includes(id) && sectionMap.has(id)) {
        visibleItems.push(sectionMap.get(id));
      }
    });

    return visibleItems;
  },

  /**
   * Returns list of hidden navigation items
   */
  getHiddenNavigationSections: (preferences) => {
    const hidden = preferences?.hiddenSections || [];
    return NAVIGATION_SECTIONS.filter(sec => hidden.includes(sec.id));
  },

  /**
   * Check if a specific section is visible
   */
  isSectionVisible: (sectionId, preferences) => {
    if (sectionId === 'dashboard') return true;
    const hidden = preferences?.hiddenSections || [];
    return !hidden.includes(sectionId);
  },

  /**
   * Returns all sections decorated with current visibility and locked status
   */
  getAllSections: (preferences) => {
    const order = preferences?.sectionOrder || DEFAULT_SECTION_ORDER;
    const hidden = preferences?.hiddenSections || [];

    const sectionMap = new Map();
    NAVIGATION_SECTIONS.forEach(sec => sectionMap.set(sec.id, sec));

    const result = [];
    // First in order
    order.forEach(id => {
      if (sectionMap.has(id)) {
        const sec = sectionMap.get(id);
        result.push({
          ...sec,
          isVisible: !hidden.includes(id)
        });
      }
    });

    return result;
  }
};

export default navigationSelectors;
