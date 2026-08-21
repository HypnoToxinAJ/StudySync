/**
 * State persistence and configuration utilities for Desmos calculators
 */

export const MATH_TOOLS_KEYS = {
  SELECTED: 'studysync.mathTools.selected',
  GRAPHING_STATE: 'studysync.mathTools.graphingState',
  CALCULATOR_3D_STATE: 'studysync.mathTools.calculator3dState'
};

const SCHEMA_VERSION = '1.0';
const MAX_STATE_SIZE_BYTES = 500 * 1024; // 500 KB limit

export const desmosStateUtils = {
  /**
   * Retrieves the last selected math tool
   */
  getSelectedTool: () => {
    try {
      const stored = localStorage.getItem(MATH_TOOLS_KEYS.SELECTED);
      if (stored === 'graphing' || stored === 'scientific' || stored === '3d') {
        return stored;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Persists the selected math tool
   */
  setSelectedTool: (tool) => {
    try {
      if (tool) {
        localStorage.setItem(MATH_TOOLS_KEYS.SELECTED, tool);
      } else {
        localStorage.removeItem(MATH_TOOLS_KEYS.SELECTED);
      }
    } catch (e) {
      console.warn('Unable to save selected math tool to localStorage:', e);
    }
  },

  /**
   * Retrieves saved state for a specific calculator type
   */
  getSavedState: (type) => {
    const key = type === 'graphing'
      ? MATH_TOOLS_KEYS.GRAPHING_STATE
      : type === '3d'
        ? MATH_TOOLS_KEYS.CALCULATOR_3D_STATE
        : null;

    if (!key) return null;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (parsed && parsed.schemaVersion === SCHEMA_VERSION && parsed.state) {
        return parsed.state;
      }
      return null;
    } catch (err) {
      console.warn(`Failed to parse saved state for ${type} calculator:`, err);
      return null;
    }
  },

  /**
   * Persists state for Graphing or 3D calculator with size check
   */
  saveState: (type, state) => {
    const key = type === 'graphing'
      ? MATH_TOOLS_KEYS.GRAPHING_STATE
      : type === '3d'
        ? MATH_TOOLS_KEYS.CALCULATOR_3D_STATE
        : null;

    if (!key || !state) return;

    try {
      const payload = {
        schemaVersion: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        state
      };

      const serialized = JSON.stringify(payload);
      if (serialized.length > MAX_STATE_SIZE_BYTES) {
        console.warn(`Calculator state exceeds max size limit (${serialized.length} bytes), skipping save.`);
        return;
      }

      localStorage.setItem(key, serialized);
    } catch (err) {
      console.warn(`Unable to save ${type} calculator state:`, err);
    }
  },

  /**
   * Clears saved state for a calculator type
   */
  clearState: (type) => {
    const key = type === 'graphing'
      ? MATH_TOOLS_KEYS.GRAPHING_STATE
      : type === '3d'
        ? MATH_TOOLS_KEYS.CALCULATOR_3D_STATE
        : null;

    if (!key) return;

    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn(`Unable to clear state for ${type}:`, err);
    }
  },

  /**
   * Metadata & UI configuration for each calculator type
   */
  getToolMetadata: (type) => {
    switch (type) {
      case 'graphing':
        return {
          id: 'graphing',
          name: 'Graphing Calculator',
          shortName: 'Graphing',
          description: 'Plot functions, inspect points, use sliders, and visualize equations.',
          accentColor: 'indigo',
          badgeText: '2D Plotting',
          hint: 'Type equations like y = sin(x) or y = x^2 - 4x + 3 to plot dynamic curves and test sliders.'
        };
      case 'scientific':
        return {
          id: 'scientific',
          name: 'Scientific Calculator',
          shortName: 'Scientific',
          description: 'Perform scientific, trigonometric, logarithmic, statistical, and numerical calculations.',
          accentColor: 'violet',
          badgeText: 'Numeric & Trig',
          hint: 'Perform degrees/radians calculations, powers, factorials, square roots, and logarithms.'
        };
      case '3d':
        return {
          id: '3d',
          name: '3D Calculator',
          shortName: '3D Math',
          description: 'Explore surfaces, curves, vectors, and equations in three dimensions.',
          accentColor: 'emerald',
          badgeText: '3D Surfaces',
          hint: 'Type multi-variable surfaces like z = sin(x) * cos(y) or z = x^2 - y^2 and drag to rotate the 3D space.'
        };
      default:
        return {
          id: 'unknown',
          name: 'Math Calculator',
          shortName: 'Calculator',
          description: 'Interactive mathematical exploration tool.',
          accentColor: 'brand',
          badgeText: 'Math Tool',
          hint: 'Enter expressions to calculate.'
        };
    }
  }
};
