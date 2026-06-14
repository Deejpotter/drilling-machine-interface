import React from 'react';

export default function GcodePreview({ gcode, orderLabel, faceNumber, selectedSlotTags, job, materialLength, slotPatternsSorted }) {
  if (!gcode) return null;

  return (
    <div className="gcode-section">
      <div className="gcode-header">
        <h3>Preview — {orderLabel} F{faceNumber}, {selectedSlotTags.join(', ')}</h3>
        <span className="gcode-summary">
          {job.holes.length} hole{job.holes.length !== 1 ? 's' : ''} · {materialLength}mm extrusion · {slotPatternsSorted.length} slot{slotPatternsSorted.length !== 1 ? 's' : ''}
        </span>
      </div>
      <pre className="gcode-preview">{gcode}</pre>
    </div>
  );
}
