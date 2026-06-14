import React from 'react';
import { downloadGcode } from '../machine/gcodeGenerator';

export default function ExportBar({
  job, profile, faceNumber, fits, canDownload, hasOrderNumber,
  slotPatternsSorted, handleSaveToDrive, handleResetJob, saveMessage,
}) {
  return (
    <div className="form-section export-bar">
      <div className="export-actions">
        <button className="btn-primary"
          onClick={() => downloadGcode(job)}
          disabled={!fits || slotPatternsSorted.length === 0 || !hasOrderNumber}
        >
          Download {job.name.split('-')[0]}-{profile.name.replace(/×/g, 'x')}_1-F{faceNumber}
        </button>
        <button
          className="btn-secondary"
          onClick={handleSaveToDrive}
          disabled={!fits || slotPatternsSorted.length === 0 || !hasOrderNumber}
        >
          Save to drive (choose Z:)
        </button>
        <button
          className="btn-secondary"
          onClick={handleResetJob}
        >
          New job (clear saved state)
        </button>
      </div>
      {saveMessage && <div className="save-message">{saveMessage}</div>}
    </div>
  );
}
