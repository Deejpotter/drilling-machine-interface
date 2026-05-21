import React, { useMemo, useState } from 'react';
import { generateGcode, downloadGcode } from './machine/gcodeGenerator';

/* ────────────────────────────────────────────
   Maker Store extrusion catalog
   ──────────────────────────────────────────── */
const PROFILES = [
  { id: '20-2020', name: '20×20', series: 20, slotWidth: 6 },
  { id: '20-2040', name: '20×40', series: 20, slotWidth: 6 },
  { id: '20-2060', name: '20×60', series: 20, slotWidth: 6 },
  { id: '20-2080', name: '20×80', series: 20, slotWidth: 6 },
  { id: '20-cbeam', name: 'C-Beam 40×80', series: 20, slotWidth: 6 },
  { id: '30-3030', name: '30×30', series: 30, slotWidth: 8 },
  { id: '40-4040', name: '40×40', series: 40, slotWidth: 8 },
  { id: '40-4080', name: '40×80', series: 40, slotWidth: 8 },
];

const HOLE_TYPES = [
  { id: 'through', label: 'Through hole', minSlot: 6 },
  { id: 'slot5', label: '5mm slot', minSlot: 6 },
  { id: 'offset', label: 'Offset hole', minSlot: 6 },
  { id: 'cbore-m8', label: 'M8 counterbore', minSlot: 8 },
];

const DEFAULT_NAME = `drill-job-${Date.now()}`;

/* ────────────────────────────────────────────
   Main App
   ──────────────────────────────────────────── */
export default function App() {
  const [profileId, setProfileId] = useState('20-2040');
  const [materialLength, setMaterialLength] = useState(1000);
  const [holeCount, setHoleCount] = useState(4);
  const [fromEnd, setFromEnd] = useState(20);
  const [spacing, setSpacing] = useState(50);
  const [holeType, setHoleType] = useState('through');
  const [jobName, setJobName] = useState('');

  const profile = PROFILES.find(p => p.id === profileId) || PROFILES[0];
  const availableHoles = HOLE_TYPES.filter(h => h.minSlot <= profile.slotWidth);

  /* Build job object */
  const job = useMemo(() => {
    const holes = Array.from({ length: holeCount }, (_, i) => ({
      step: i + 1,
      holeType,
      distance_from_end_mm: fromEnd + i * spacing,
    }));
    const name = jobName.trim() || DEFAULT_NAME;
    return {
      name,
      materialLength,
      createdAt: new Date().toISOString(),
      operations: [{
        profile: profile.name,
        face: '—',
        slot: 1,
        slot_width_mm: profile.slotWidth,
        holes,
      }],
      holes,
    };
  }, [profileId, materialLength, holeCount, fromEnd, spacing, holeType, jobName, profile]);

  const gcode = useMemo(() => {
    if (job.holes.length === 0) return '';
    return generateGcode(job);
  }, [job]);

  /* Validity */
  const lastHoleEnd = fromEnd + (holeCount - 1) * spacing + 20;
  const fits = materialLength >= lastHoleEnd;
  const clearanceEnd = materialLength - lastHoleEnd;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Drilling Machine Interface</h1>
      </header>

      <main className="main-content">
        <div className="form">
          {/* Profile */}
          <div className="form-section">
            <label htmlFor="sel-profile">Profile</label>
            <select id="sel-profile" className="select"
              value={profileId}
              onChange={e => setProfileId(e.target.value)}
            >
              {PROFILES.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.series}-series · {p.slotWidth}mm slot
                </option>
              ))}
            </select>
          </div>

          {/* Material length + Hole type row */}
          <div className="form-section form-row-group">
            <div className="form-row">
              <label htmlFor="length-input">Material length (mm)</label>
              <input id="length-input" type="number" min={10} max={6000}
                value={materialLength}
                onChange={e => setMaterialLength(Math.max(10, Number(e.target.value)))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="sel-hole">Hole type</label>
              <select id="sel-hole" className="select"
                value={holeType}
                onChange={e => setHoleType(e.target.value)}
              >
                {availableHoles.map(h => (
                  <option key={h.id} value={h.id}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Count + From end + Spacing row */}
          <div className="form-section form-row-group">
            <div className="form-row">
              <label htmlFor="count-input">Number of holes</label>
              <input id="count-input" type="number" min={1} max={50}
                value={holeCount}
                onChange={e => setHoleCount(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="from-input">From end (mm)</label>
              <input id="from-input" type="number" min={0}
                value={fromEnd}
                onChange={e => setFromEnd(Number(e.target.value))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="spacing-input">Spacing (mm)</label>
              <input id="spacing-input" type="number" min={1}
                value={spacing}
                onChange={e => setSpacing(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          {/* Job name */}
          <div className="form-section">
            <label htmlFor="job-name">Job name (optional)</label>
            <input id="job-name" type="text" className="select"
              placeholder={DEFAULT_NAME}
              value={jobName}
              onChange={e => setJobName(e.target.value)}
            />
          </div>

          {/* Validity */}
          {!fits && (
            <div className="validity-error">
              Pattern overruns extrusion by {(-clearanceEnd).toFixed(0)}mm — reduce holes, spacing, or increase length
            </div>
          )}
          {fits && clearanceEnd < 20 && (
            <div className="validity-warning">
              Last hole ends {clearanceEnd.toFixed(0)}mm from end — tight clearance
            </div>
          )}

          {/* Generate */}
          <div className="form-section export-bar">
            <button className="btn-primary"
              onClick={() => downloadGcode(job)}
              disabled={!fits || holeCount === 0}
            >
              Download G-code (.NC)
            </button>
          </div>

          {/* Preview */}
          {gcode && (
            <div className="gcode-section">
              <div className="gcode-header">
                <h3>Preview</h3>
                <span className="gcode-summary">
                  {holeCount} hole{holeCount !== 1 ? 's' : ''} · {materialLength}mm extrusion
                </span>
              </div>
              <pre className="gcode-preview">{gcode}</pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
