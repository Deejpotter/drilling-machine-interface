import React, { useState } from 'react';

const TOOL_TYPES = [
  { id: 'drill-6mm', name: '6mm Drill Bit', diameter: 6, type: 'drill' },
  { id: 'drill-8mm', name: '8mm Drill Bit', diameter: 8, type: 'drill' },
  { id: 'drill-11mm', name: '11mm Drill Bit', diameter: 11, type: 'drill' },
  { id: 'slot-5mm', name: '5mm Slot Cutter', diameter: 5, type: 'slot' },
  { id: 'cbore-m8', name: 'M8 Counterbore', diameter: 8, counterbore: 15, type: 'counterbore' },
];

export default function ToolManagement({ machine }) {
  const [selectedTool, setSelectedTool] = useState(machine.tool?.id || 'drill-11mm');
  const [toolHistory, setToolHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('tool-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const currentTool = TOOL_TYPES.find(t => t.id === selectedTool) || TOOL_TYPES[2];
  const wearPercent = Math.round((machine.tool?.wear || 0) / (machine.tool?.maxWear || 100) * 100);
  const wearColor = wearPercent < 50 ? '#059669' : wearPercent < 80 ? '#d97706' : '#dc2626';

  function handleToolChange(id) {
    setSelectedTool(id);
    const entry = {
      toolId: id,
      changedAt: new Date().toISOString(),
      previousWear: machine.tool?.wear || 0,
    };
    const updated = [entry, ...toolHistory].slice(0, 50);
    setToolHistory(updated);
    localStorage.setItem('tool-history', JSON.stringify(updated));
  }

  function handleResetWear() {
    // In a real app, this would communicate with the machine
    localStorage.setItem('tool-reset', JSON.stringify({
      toolId: selectedTool,
      resetAt: new Date().toISOString(),
    }));
  }

  return (
    <div className="tool-management">
      <h3>Tool Management</h3>

      <div className="tool-selector">
        <label htmlFor="tool-select">Active Tool</label>
        <select
          id="tool-select"
          className="select"
          value={selectedTool}
          onChange={e => handleToolChange(e.target.value)}
        >
          {TOOL_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="tool-info">
        <div className="tool-specs">
          <span>Diameter: {currentTool.diameter}mm</span>
          {currentTool.counterbore && <span>Counterbore: {currentTool.counterbore}mm</span>}
          <span>Type: {currentTool.type}</span>
        </div>

        <div className="tool-wear">
          <span className="wear-label">Tool Wear</span>
          <div className="wear-bar">
            <div className="wear-fill" style={{ width: `${wearPercent}%`, background: wearColor }} />
          </div>
          <span className="wear-percent">{wearPercent}%</span>
        </div>

        {wearPercent >= 80 && (
          <div className="tool-warning">
            ! Tool wear is high. Consider replacement.
          </div>
        )}

        <button className="btn-control btn-reset-wear" onClick={handleResetWear}>
          Reset Wear Counter
        </button>
      </div>

      {toolHistory.length > 0 && (
        <div className="tool-history">
          <h4>Tool Change History</h4>
          <ul>
            {toolHistory.slice(0, 5).map((entry, i) => (
              <li key={i}>
                <span>{TOOL_TYPES.find(t => t.id === entry.toolId)?.name || entry.toolId}</span>
                <span>{new Date(entry.changedAt).toLocaleString()}</span>
                <span>Wear at change: {Math.round(entry.previousWear)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
