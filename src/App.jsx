import React, { useMemo, useState } from 'react';
import { generateGcode, downloadGcode } from './machine/gcodeGenerator';
import { EXTRUSION_PROFILES, HOLE_TYPES, MACHINE_CONFIG } from './machine/config';

const DEFAULT_NAME = `drill-job-${Date.now()}`;

/* ────────────────────────────────────────────
   Main App
   ──────────────────────────────────────────── */
export default function App() {
  const [profileId, setProfileId] = useState('20-2040');
  const [materialLength, setMaterialLength] = useState(MACHINE_CONFIG.defaultMaterialLength);
  const [holeCount, setHoleCount] = useState(MACHINE_CONFIG.defaultHoleCount);
  const [fromEnd, setFromEnd] = useState(MACHINE_CONFIG.defaultFromEnd);
  const [spacing, setSpacing] = useState(MACHINE_CONFIG.defaultSpacing);
  const [holeType, setHoleType] = useState('hole5');
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);

  const profile = EXTRUSION_PROFILES.find(p => p.id === profileId) || EXTRUSION_PROFILES[0];
  const face = profile.faces[selectedFaceIndex];
  const slot = face.slots[selectedSlotIndex];
  const availableHoles = HOLE_TYPES.filter(h => h.minSlot <= slot.width);

  /* Build job object for current face/slot */
  const job = useMemo(() => {
    const holes = Array.from({ length: holeCount }, (_, i) => ({
      step: i + 1,
      holeType,
      distance_from_end_mm: fromEnd + i * spacing,
    }));
    
    // Generate name: OrderNumber-Profile-Face-Slot-Date
    // If no order number, use timestamp-based default
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const name = orderNumber.trim() 
      ? `${orderNumber.trim()}-${profile.name.replace(/×/g, 'x')}-F${face.id}-S${slot.id}-${dateStr}`
      : `${DEFAULT_NAME}-${profile.name.replace(/×/g, 'x')}-F${face.id}-S${slot.id}-${dateStr}`;
    
    return {
      name,
      materialLength,
      createdAt: new Date().toISOString(),
      operations: [{
        profile: profile.name,
        face: face.label,
        faceId: face.id,
        slot: slot.id,
        slotPosition: slot.position,
        slot_width_mm: slot.width,
        holes,
      }],
      holes,
    };
  }, [profileId, materialLength, holeCount, fromEnd, spacing, holeType, orderNumber, profile, face, slot]);

  const gcode = useMemo(() => {
    if (job.holes.length === 0) return '';
    return generateGcode(job);
  }, [job]);

  /* Positions for viz */
  const holePositions = useMemo(() => {
    return Array.from({ length: holeCount }, (_, i) => fromEnd + i * spacing);
  }, [holeCount, fromEnd, spacing]);

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
          {/* Order number */}
          <div className="form-section">
            <label htmlFor="order-input">Order Number</label>
            <input id="order-input" type="text" className="select"
              placeholder="e.g., ORD-12345"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
            />
          </div>

          {/* Profile */}
          <div className="form-section">
            <label htmlFor="sel-profile">Profile</label>
            <select id="sel-profile" className="select"
              value={profileId}
              onChange={e => setProfileId(e.target.value)}
            >
              {EXTRUSION_PROFILES.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.series}-series
                </option>
              ))}
            </select>
          </div>

          {/* Face selection */}
          <div className="form-section">
            <label htmlFor="sel-face">Face</label>
            <select id="sel-face" className="select"
              value={selectedFaceIndex}
              onChange={e => {
                setSelectedFaceIndex(Number(e.target.value));
                setSelectedSlotIndex(0);
              }}
            >
              {profile.faces.map((f, idx) => (
                <option key={f.id} value={idx}>
                  {f.label} ({f.slots.length} slot{f.slots.length !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Slot selection */}
          <div className="form-section">
            <label htmlFor="sel-slot">Slot</label>
            <select id="sel-slot" className="select"
              value={selectedSlotIndex}
              onChange={e => setSelectedSlotIndex(Number(e.target.value))}
            >
              {face.slots.map((s, idx) => (
                <option key={s.id} value={idx}>
                  Slot {s.id} @ {s.position}mm from end ({s.width}mm wide)
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

          {/* Extrusion visualisation */}
          {holeCount > 0 && (
            <div className="form-section">
              <label>Visualisation — {materialLength}mm extrusion, {holeCount} hole{holeCount !== 1 ? 's' : ''}</label>
              <svg viewBox="0 0 340 64" className="extrusion-viz">
                {/* Extrusion body */}
                <rect x="6" y="4" width="328" height="56" rx="4" fill={fits ? '#e2e8f0' : '#fee2e2'} stroke={fits ? '#94a3b8' : '#fca5a5'} strokeWidth="1" />
                {/* Extrusion end markers */}
                <rect x="4" y="0" width="4" height="64" rx="1" fill={fits ? '#64748b' : '#ef4444'} />
                <rect x="332" y="0" width="4" height="64" rx="1" fill={fits ? '#64748b' : '#ef4444'} />
                {/* Hole dots — scale from 0 to materialLength across 328px */}
                {holePositions.map((pos, i) => {
                  const pct = pos / materialLength;
                  const x = 4 + 328 * pct;
                  const overrun = pos > materialLength;
                  const holeDiameter = holeType === 'hole12' ? 12 : holeType === 'hole8' ? 8 : holeType === 'slot5' ? 5 : 6;
                  const r = Math.max(4, holeDiameter * 0.5);
                  return (
                    <g key={i}>
                      <circle cx={Math.min(x, 332)} cy="32" r={r}
                        fill={overrun ? '#ef4444' : '#3b82f6'}
                        stroke="white" strokeWidth="2"
                      />
                      <text x={Math.min(x, 332)} y="62" textAnchor="middle"
                        fontSize="9" fill="#64748b" fontFamily="sans-serif">
                        {pos}mm
                      </text>
                    </g>
                  );
                })}
                {/* Material length label */}
                <text x="170" y="49" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">
                  {materialLength}mm
                </text>
              </svg>
              <div className="viz-legend">
                <span className="viz-legend-dot" style={{ background: '#3b82f6' }} /> {holeType === 'hole5' ? '5mm hole' : holeType === 'hole8' ? '8mm hole' : holeType === 'hole12' ? '12mm hole' : '5mm slot'}
                <span className="viz-legend-label">{holeCount} × {spacing}mm spacing · first at {fromEnd}mm</span>
              </div>
            </div>
          )}

          {/* Generate */}
          <div className="form-section export-bar">
            <button className="btn-primary"
              onClick={() => downloadGcode(job)}
              disabled={!fits || holeCount === 0}
            >
              Download {face.label} - Slot {slot.id} (.NC)
            </button>
          </div>

          {/* Preview */}
          {gcode && (
            <div className="gcode-section">
              <div className="gcode-header">
                <h3>Preview — {face.label}, Slot {slot.id}</h3>
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
