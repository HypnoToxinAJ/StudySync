import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDesmos } from '../hooks/useDesmos';
import { MathToolsHeader } from './MathToolsHeader';
import { DesmosCalculator } from './DesmosCalculator';
import { DesmosLoadingState } from './DesmosLoadingState';
import { DesmosErrorState } from './DesmosErrorState';
import { desmosStateUtils } from '../utils/desmosStateUtils';

export const MathToolsWorkspace = ({
  activeTool,
  onSelectTool,
  onBackToSelector
}) => {
  const { isLoaded, isLoading, error, retry } = useDesmos();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceContainerRef = useRef(null);
  const calculatorRef = useRef(null);

  const metadata = desmosStateUtils.getToolMetadata(activeTool);

  // Fullscreen change listener to sync state and trigger calculator resize
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);

      // Trigger calculator resize after layout transition
      setTimeout(() => {
        if (calculatorRef.current && typeof calculatorRef.current.resize === 'function') {
          calculatorRef.current.resize();
        }
      }, 150);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fullscreen Toggle
  const toggleFullscreen = useCallback(async () => {
    const container = workspaceContainerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Error toggling fullscreen mode:', err);
    }
  }, []);

  const handleReset = () => {
    if (calculatorRef.current && typeof calculatorRef.current.reset === 'function') {
      calculatorRef.current.reset();
    }
  };

  return (
    <div
      ref={workspaceContainerRef}
      className={`space-y-4 max-w-7xl mx-auto flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-900 p-4 sm:p-6 overflow-hidden h-screen w-screen space-y-3'
          : 'h-[calc(100vh-8.5rem)] min-h-[660px]'
      }`}
    >
      {/* Header & Controls */}
      <MathToolsHeader
        activeTool={activeTool}
        onSelectTool={onSelectTool}
        onBackToSelector={onBackToSelector}
        onResetWorkspace={handleReset}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800/90 shadow-2xl bg-white dark:bg-slate-900 relative">
        {isLoading && (
          <DesmosLoadingState toolName={metadata.name} />
        )}

        {error && !isLoading && (
          <DesmosErrorState
            error={error}
            onRetry={retry}
            onBackToSelector={onBackToSelector}
          />
        )}

        {isLoaded && !isLoading && !error && (
          <DesmosCalculator
            ref={calculatorRef}
            type={activeTool}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
};
