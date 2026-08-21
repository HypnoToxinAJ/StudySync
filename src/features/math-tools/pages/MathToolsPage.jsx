import React, { useState } from 'react';
import { MathToolsSelector } from '../components/MathToolsSelector';
import { MathToolsWorkspace } from '../components/MathToolsWorkspace';
import { desmosStateUtils } from '../utils/desmosStateUtils';

export const MathToolsPage = () => {
  const [selectedTool, setSelectedTool] = useState(() => {
    return desmosStateUtils.getSelectedTool();
  });

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    desmosStateUtils.setSelectedTool(tool);
  };

  const handleBackToSelector = () => {
    setSelectedTool(null);
    desmosStateUtils.setSelectedTool(null);
  };

  return (
    <div className="space-y-6">
      {selectedTool === null ? (
        <MathToolsSelector onSelectTool={handleSelectTool} />
      ) : (
        <MathToolsWorkspace
          activeTool={selectedTool}
          onSelectTool={handleSelectTool}
          onBackToSelector={handleBackToSelector}
        />
      )}
    </div>
  );
};

export default MathToolsPage;
