import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { desmosStateUtils } from '../utils/desmosStateUtils';

export const DesmosCalculator = forwardRef(({
  type = 'graphing',
  className = '',
  onStateChange,
  onInstanceReady
}, ref) => {
  const containerRef = useRef(null);
  const calculatorRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Expose imperative methods to parent (e.g., reset, resize, getState)
  useImperativeHandle(ref, () => ({
    getCalculator: () => calculatorRef.current,
    resize: () => {
      if (calculatorRef.current && typeof calculatorRef.current.resize === 'function') {
        calculatorRef.current.resize();
      }
    },
    reset: () => {
      if (!calculatorRef.current) return;
      try {
        if (typeof calculatorRef.current.setBlank === 'function') {
          calculatorRef.current.setBlank();
        } else if (typeof calculatorRef.current.setDefaultState === 'function') {
          calculatorRef.current.setDefaultState();
        }
        desmosStateUtils.clearState(type);
      } catch (err) {
        console.warn('Error resetting calculator state:', err);
      }
    },
    getState: () => {
      if (calculatorRef.current && typeof calculatorRef.current.getState === 'function') {
        return calculatorRef.current.getState();
      }
      return null;
    }
  }), [type]);

  const saveCurrentState = useCallback(() => {
    if (!calculatorRef.current || (type !== 'graphing' && type !== '3d')) return;
    try {
      if (typeof calculatorRef.current.getState === 'function') {
        const state = calculatorRef.current.getState();
        desmosStateUtils.saveState(type, state);
        if (onStateChange) onStateChange(state);
      }
    } catch (e) {
      console.warn('Error retrieving calculator state for save:', e);
    }
  }, [type, onStateChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.Desmos) return;

    // 1. Destroy any existing instance before initializing
    if (calculatorRef.current) {
      try {
        if (typeof calculatorRef.current.destroy === 'function') {
          calculatorRef.current.destroy();
        }
      } catch (e) {
        console.warn('Error destroying previous Desmos calculator instance:', e);
      }
      calculatorRef.current = null;
    }

    // 2. Configure options according to calculator type
    let instance = null;

    try {
      if (type === 'graphing') {
        if (typeof window.Desmos.GraphingCalculator !== 'function') {
          throw new Error('Desmos.GraphingCalculator is not available.');
        }
        instance = window.Desmos.GraphingCalculator(container, {
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          keypad: true,
          pointsOfInterest: true,
          trace: true,
          expressionsTopbar: true,
          projectorMode: false,
          expressionsCollapsed: false,
          fontSize: 14,
          border: false
        });
      } else if (type === 'scientific') {
        if (typeof window.Desmos.ScientificCalculator !== 'function') {
          throw new Error('Desmos.ScientificCalculator is not available.');
        }
        instance = window.Desmos.ScientificCalculator(container, {
          keypad: true,
          fontSize: 16,
          border: false
        });
      } else if (type === '3d') {
        if (typeof window.Desmos.Calculator3D !== 'function') {
          throw new Error('Desmos.Calculator3D is not available.');
        }
        instance = window.Desmos.Calculator3D(container, {
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          keypad: true,
          expressionsTopbar: true,
          projectorMode: false,
          fontSize: 14,
          border: false
        });
      }

      calculatorRef.current = instance;

      // 3. Restore persisted state if available
      if (instance && (type === 'graphing' || type === '3d')) {
        const savedState = desmosStateUtils.getSavedState(type);
        if (savedState && typeof instance.setState === 'function') {
          try {
            instance.setState(savedState);
          } catch (stateErr) {
            console.warn(`Failed to restore saved state for ${type} calculator:`, stateErr);
            desmosStateUtils.clearState(type);
          }
        }

        // 4. Attach debounced change observer
        if (typeof instance.observe === 'function') {
          instance.observe('change', () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
              saveCurrentState();
            }, 350); // 350ms debounce
          });
        }
      }

      if (onInstanceReady) {
        onInstanceReady(instance);
      }
    } catch (initErr) {
      console.error(`Failed to initialize Desmos ${type} calculator:`, initErr);
    }

    // 5. Setup ResizeObserver to keep calculator accurately sized
    const resizeObserver = new ResizeObserver(() => {
      if (calculatorRef.current && typeof calculatorRef.current.resize === 'function') {
        calculatorRef.current.resize();
      }
    });

    resizeObserver.observe(container);

    // Initial resize trigger
    setTimeout(() => {
      if (calculatorRef.current && typeof calculatorRef.current.resize === 'function') {
        calculatorRef.current.resize();
      }
    }, 100);

    // 6. Cleanup on unmount or type switch
    return () => {
      resizeObserver.disconnect();

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveCurrentState();
      }

      if (calculatorRef.current) {
        try {
          if (typeof calculatorRef.current.destroy === 'function') {
            calculatorRef.current.destroy();
          }
        } catch (destroyErr) {
          console.warn('Error during Desmos calculator destroy:', destroyErr);
        }
        calculatorRef.current = null;
      }
    };
  }, [type, saveCurrentState, onInstanceReady]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[600px] rounded-2xl overflow-hidden bg-white dark:bg-slate-900 ${className}`}
      data-testid={`desmos-${type}-container`}
    />
  );
});

DesmosCalculator.displayName = 'DesmosCalculator';
export default DesmosCalculator;
