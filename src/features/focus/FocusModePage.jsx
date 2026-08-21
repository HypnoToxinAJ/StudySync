import React, { useState } from 'react';
import { FocusToolSelector } from './components/FocusToolSelector';
import { YouTubeWorkspace } from './components/YouTubeWorkspace';
import { PdfWorkspaceLazy } from './components/PdfWorkspace.lazy';
import { focusPreferenceService } from './services/focusPreferenceService';

export const FocusModePage = () => {
  const [selectedTool, setSelectedTool] = useState(null); // null | 'youtube' | 'pdf'

  const handleSelectTool = (tool) => {
    focusPreferenceService.setLastSelectedTool(tool);
    setSelectedTool(tool);
  };

  const handleBackToTools = () => {
    setSelectedTool(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Tool Selection Screen (Only displayed when no tool is active) */}
      {selectedTool === null && (
        <FocusToolSelector onSelectTool={handleSelectTool} />
      )}

      {/* 2. Distraction-Free YouTube Workspace (Only mounted when selected) */}
      {selectedTool === 'youtube' && (
        <YouTubeWorkspace onBackToTools={handleBackToTools} />
      )}

      {/* 3. PDF Study Workspace (Only mounted and lazy-loaded when selected) */}
      {selectedTool === 'pdf' && (
        <PdfWorkspaceLazy onBackToTools={handleBackToTools} />
      )}
    </div>
  );
};

export default FocusModePage;
