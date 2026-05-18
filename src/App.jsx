import React, { useMemo, useState } from 'react';
import { useMachine } from './hooks/useMachine';
import MachineStatusDashboard from './components/MachineStatusDashboard';
import JobBuilder from './components/JobBuilder';
import ToolManagement from './components/ToolManagement';
import CalibrationHelper from './components/CalibrationHelper';

/* ────────────────────────────────────────────
   Maker Store extrusion catalog
   All profiles are V+T combo unless noted
   Faces indexed clockwise from top
   ──────────────────────────────────────────── */

const PROFILES = [
  // 20 series — 6mm slot
  { id: '20-2020', name: '20×20', series: 20, size: [20, 20], slotWidth: 6, faces: [
    { id: 'f0', dim: 20, label: 'Top', slots: 1 },
    { id: 'f1', dim: 20, label: 'Right', slots: 1 },
    { id: 'f2', dim: 20, label: 'Bottom', slots: 1 },
    { id: 'f3', dim: 20, label: 'Left', slots: 1 },
  ]},
  { id: '20-2040', name: '20×40', series: 20, size: [20, 40], slotWidth: 6, faces: [
    { id: 'f0', dim: 40, label: 'Top (40mm)', slots: 1 },
    { id: 'f1', dim: 20, label: 'Right (20mm)', slots: 1 },
    { id: 'f2', dim: 40, label: 'Bottom (40mm)', slots: 1 },
    { id: 'f3', dim: 20, label: 'Left (20mm)', slots: 1 },
  ]},
  { id: '20-2060', name: '20×60', series: 20, size: [20, 60], slotWidth: 6, faces: [
    { id: 'f0', dim: 60, label: 'Top (60mm)', slots: 1 },
    { id: 'f1', dim: 20, label: 'Right (20mm)', slots: 1 },
    { id: 'f2', dim: 60, label: 'Bottom (60mm)', slots: 1 },
    { id: 'f3', dim: 20, label: 'Left (20mm)', slots: 1 },
  ]},
  { id: '20-2080', name: '20×80', series: 20, size: [20, 80], slotWidth: 6, faces: [
    { id: 'f0', dim: 80, label: 'Top (80mm)', slots: 1 },
    { id: 'f1', dim: 20, label: 'Right (20mm)', slots: 1 },
    { id: 'f2', dim: 80, label: 'Bottom (80mm)', slots: 1 },
    { id: 'f3', dim: 20, label: 'Left (20mm)', slots: 1 },
  ]},
  { id: '20-cbeam', name: 'C-Beam 40×80', series: 20, size: [40, 80], slotWidth: 6, type: 'C-Channel', faces: [
    { id: 'f0', dim: 40, label: 'Top (40mm)', slots: 2 },
    { id: 'f1', dim: 80, label: 'Right (80mm)', slots: 4 },
    { id: 'f2', dim: 40, label: 'Bottom (40mm)', slots: 2 },
    { id: 'f3', dim: 40, label: 'Left — open', slots: 0, disabled: true },
  ]},
  // 30 series — 8mm slot
  { id: '30-3030', name: '30×30', series: 30, size: [30, 30], slotWidth: 8, faces: [
    { id: 'f0', dim: 30, label: 'Top', slots: 1 },
    { id: 'f1', dim: 30, label: 'Right', slots: 1 },
    { id: 'f2', dim: 30, label: 'Bottom', slots: 1 },
    { id: 'f3', dim: 30, label: 'Left', slots: 1 },
  ]},
  // 40 series — 8mm slot
  { id: '40-4040', name: '40×40', series: 40, size: [40, 40], slotWidth: 8, faces: [
    { id: 'f0', dim: 40, label: 'Top', slots: 1 },
    { id: 'f1', dim: 40, label: 'Right', slots: 1 },
    { id: 'f2', dim: 40, label: 'Bottom', slots: 1 },
    { id: 'f3', dim: 40, label: 'Left', slots: 1 },
  ]},
  { id: '40-4080', name: '40×80', series: 40, size: [40, 80], slotWidth: 8, faces: [
    { id: 'f0', dim: 80, label: 'Top (80mm)', slots: 1 },
    { id: 'f1', dim: 40, label: 'Right (40mm)', slots: 1 },
    { id: 'f2', dim: 80, label: 'Bottom (80mm)', slots: 1 },
    { id: 'f3', dim: 40, label: 'Left (40mm)', slots: 1 },
  ]},
];

/* Hole types gated by slot width */
const HOLE_TYPES = [
  { id: 'through', label: 'Through hole', minSlot: 6, diameter: 11, advance: 48 },
  { id: 'slot5', label: '5mm slot', minSlot: 6, width: 5, length: 24, advance: 52 },
  { id: 'offset', label: 'Offset hole', minSlot: 6, diameter: 6, advance: 38 },
  { id: 'cbore-m8', label: 'M8 counterbore', minSlot: 8, diameter: 8, counterbore: 15, advance: 54 },
];

/* ────────────────────────────────────────────
   Cross-section diagram — SVG
   ──────────────────────────────────────────── */
function ProfileDiagram({ profile, selectedFace, onFaceSelect }) {
  const [w, h] = profile.size;
  const isCBeam = profile.id === '20-cbeam';
  const scale = 160 / Math.max(w, h);
  const pw = w * scale;
  const ph = h * scale;
  const pad = 32;

  const svgW = pw + pad * 2;
  const svgH = ph + pad * 2;

  const rects = [
    { x: pad, y: pad, w: pw, h: 4, face: 0, label: 'top' },
    { x: pad + pw, y: pad, w: 4, h: ph, face: 1, label: 'right' },
    { x: pad, y: pad + ph, w: pw, h: 4, face: 2, label: 'bottom' },
    { x: pad, y: pad, w: 4, h: ph, face: 3, label: 'left' },
  ];

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="profile-diagram" style={{ maxWidth: svgW }}>
      {isCBeam ? (
        <>
          <rect x={pad} y={pad} width={pw} height={ph * 0.2} fill="#d1d5db" rx={1} />
          <rect x={pad + pw * 0.75} y={pad} width={pw * 0.25} height={ph} fill="#d1d5db" rx={1} />
          <rect x={pad} y={pad + ph * 0.8} width={pw} height={ph * 0.2} fill="#d1d5db" rx={1} />
        </>
      ) : (
        <rect x={pad} y={pad} width={pw} height={ph} fill="#e5e7eb" rx={3} />
      )}

      {profile.faces.map((face, i) => {
        const isSelected = selectedFace?.id === face.id;
        const isDisabled = face.disabled;
        let rx, ry, rw, rh;
        switch (i) {
          case 0: rx = pad; ry = pad - 12; rw = pw; rh = 24; break;
          case 1: rx = pad + pw; ry = pad; rw = 24; rh = ph; break;
          case 2: rx = pad; ry = pad + ph; rw = pw; rh = 24; break;
          case 3: rx = pad - 12; ry = pad; rw = 24; rh = ph; break;
        }
        return (
          <g key={face.id}>
            <rect
              x={rx} y={ry} width={rw} height={rh}
              fill={isSelected ? 'rgba(59,130,246,0.2)' : 'transparent'}
              stroke={isSelected ? '#3b82f6' : isDisabled ? '#fca5a5' : 'transparent'}
              strokeWidth={1.5}
              rx={2}
              style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
              onClick={() => !isDisabled && onFaceSelect(face)}
            />
            {!isDisabled && (
              <text
                x={i === 0 || i === 2 ? rx + rw / 2 : (i === 1 ? rx + rw - 4 : rx + 4)}
                y={i === 0 || i === 2 ? ry - 4 : ry + rh / 2 + 4}
                textAnchor={i === 0 || i === 2 ? 'middle' : (i === 1 ? 'end' : 'start')}
                fontSize={10}
                fill={isSelected ? '#1d4ed8' : '#6b7280'}
                fontWeight={isSelected ? 600 : 400}
              >
                {face.dim}mm · {face.slots} slot{face.slots !== 1 ? 's' : ''}
              </text>
            )}
            {isDisabled && (
              <text
                x={rx + 4} y={ry + rh / 2 + 4}
                textAnchor="start" fontSize={9} fill="#ef4444"
              >
                open
              </text>
            )}
          </g>
        );
      })}

      <text x={pad + pw / 2} y={15} textAnchor="middle" fontSize={8} fill="#9ca3af">
        {w}mm
      </text>
      <text x={pad - 6} y={pad + ph / 2 + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
        {h}mm
      </text>
    </svg>
  );
}

/* ────────────────────────────────────────────
   Tab navigation
   ──────────────────────────────────────────── */
const TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'machine', label: 'Machine' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'tools', label: 'Tools' },
  { id: 'calibrate', label: 'Calibrate' },
];

/* ────────────────────────────────────────────
   Main App
   ──────────────────────────────────────────── */
export default function App() {
  const { machine, error, actions, status } = useMachine();
  const [activeTab, setActiveTab] = useState('setup');

  const [profileId, setProfileId] = useState(PROFILES[0].id);
  const [selectedFace, setSelectedFace] = useState(null);
  const [slotNum, setSlotNum] = useState(1);

  const [holeType, setHoleType] = useState('through');
  const [holeCount, setHoleCount] = useState(4);
  const [fromEnd, setFromEnd] = useState(20);
  const [spacing, setSpacing] = useState(50);

  const [operations, setOperations] = useState([]);
  const [jobName, setJobName] = useState('');

  const profile = PROFILES.find(p => p.id === profileId) || PROFILES[0];
  const face = selectedFace;
  const availableHoles = HOLE_TYPES.filter(h => h.minSlot <= profile.slotWidth);
  const effectiveHole = availableHoles.find(h => h.id === holeType) || availableHoles[0];

  const positions = useMemo(() => {
    if (!face || face.slots === 0) return [];
    return Array.from({ length: holeCount }, (_, i) => ({
      step: i + 1,
      distance: fromEnd + i * spacing,
      type: effectiveHole.label,
    }));
  }, [holeCount, fromEnd, spacing, face, effectiveHole]);

  const currentOperation = useMemo(() => {
    if (!face) return null;
    return {
      profile: profile.name,
      face: face.label,
      slot: slotNum,
      slot_width_mm: profile.slotWidth,
      holes: positions.map((p, i) => ({
        step: i + 1,
        type: 'hole',
        label: effectiveHole.label,
        distance_from_end_mm: p.distance,
        params: HOLE_TYPES.find(h => h.id === holeType),
      })),
    };
  }, [profile, face, slotNum, positions, holeType, effectiveHole]);

  const buildJob = () => {
    const allOps = currentOperation ? [...operations, currentOperation] : operations;
    return {
      name: jobName || `job-${Date.now()}`,
      createdAt: new Date().toISOString(),
      operations: allOps,
      holes: allOps.flatMap(op => op.holes || []),
    };
  };

  function downloadJSON() {
    const job = buildJob();
    const blob = new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.name.replace(/[^a-z0-9]+/gi, '_')}.json`;
    a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function sendToMachine() {
    const job = buildJob();
    actions.startJob(job);
  }

  function handleProfileChange(id) {
    setProfileId(id);
    setSelectedFace(null);
    setSlotNum(1);
  }

  function handleFaceSelect(f) {
    if (f.disabled) return;
    setSelectedFace(f);
    setSlotNum(1);
  }

  function handleAddOperation(op) {
    setOperations([...operations, op]);
  }

  function handleClearOperations() {
    setOperations([]);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Drilling Machine Interface</h1>
      </header>

      {/* Machine error toast */}
      {error && (
        <div className="error-toast">
          <span className="error-icon">!</span>
          <span className="error-message">{error}</span>
        </div>
      )}

      {/* Tab navigation */}
      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {/* Connection hint */}
        {!status.isConnected && (
          <div className="connection-hint">
            <span className="hint-icon">i</span>
            <span className="hint-text">Machine not connected. Go to the <button className="hint-link" onClick={() => setActiveTab('machine')}>Machine</button> tab to connect and home.</span>
          </div>
        )}

        {/* Setup tab */}
        {activeTab === 'setup' && (
          <div className="form">
            {/* Profile selection */}
            <div className="form-section">
              <label htmlFor="sel-profile">Profile</label>
              <select id="sel-profile"
                className="select"
                value={profileId}
                onChange={e => handleProfileChange(e.target.value)}
              >
                {PROFILES.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.series}-series · {p.slotWidth}mm slot{p.type ? ` · ${p.type}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cross-section + face selector */}
            <div className="form-section">
              <label>Select face to drill</label>
              <div className="diagram-wrap">
                <ProfileDiagram
                  profile={profile}
                  selectedFace={selectedFace}
                  onFaceSelect={handleFaceSelect}
                />
              </div>
              {selectedFace && !selectedFace.disabled && (
                <>
                  <div className="face-info">
                    {selectedFace.label} · {selectedFace.dim}mm · {selectedFace.slots} slot{selectedFace.slots !== 1 ? 's' : ''}
                  </div>

                  {selectedFace.slots > 1 && (
                    <div className="form-row" style={{ marginTop: 8 }}>
                      <label htmlFor="sel-slot">Slot number</label>
                      <select id="sel-slot"
                        className="select"
                        value={slotNum}
                        onChange={e => setSlotNum(Number(e.target.value))}
                      >
                        {Array.from({ length: selectedFace.slots }, (_, i) => (
                          <option key={i + 1} value={i + 1}>Slot {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hole parameters */}
            {selectedFace && !selectedFace.disabled && (
              <>
                <div className="form-section">
                  <label htmlFor="sel-hole">Hole type</label>
                  <select id="sel-hole"
                    className="select"
                    value={holeType}
                    onChange={e => setHoleType(e.target.value)}
                  >
                    {availableHoles.map(h => (
                      <option key={h.id} value={h.id}>{h.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-section form-row-group">
                  <div className="form-row">
                    <label htmlFor="count-input">Number of holes</label>
                    <input id="count-input"
                      type="number" min={1} max={50}
                      value={holeCount}
                      onChange={e => setHoleCount(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="from-input">From end (mm)</label>
                    <input id="from-input"
                      type="number" min={0}
                      value={fromEnd}
                      onChange={e => setFromEnd(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="spacing-input">Spacing (mm)</label>
                    <input id="spacing-input"
                      type="number" min={1}
                      value={spacing}
                      onChange={e => setSpacing(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="form-section">
                  <label>Preview — {positions.length} holes on {selectedFace.label}</label>
                  <div className="hole-preview">
                    <div className="hole-bar" style={{ width: '100%', position: 'relative', height: 40, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#d1d5db' }} />
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: '#d1d5db' }} />
                      {positions.map((p, i) => {
                        const maxDist = fromEnd + (holeCount - 1) * spacing;
                        const pct = maxDist > 0 ? (p.distance / maxDist) * 100 : 0;
                        return (
                          <React.Fragment key={i}>
                            <div
                              style={{
                                position: 'absolute',
                                left: `${pct}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 14, height: 14,
                                borderRadius: '50%',
                                background: '#3b82f6',
                                border: '2px solid white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                              title={`${p.distance}mm — ${p.type}`}
                            />
                            <div style={{
                              position: 'absolute',
                              left: `${pct}%`,
                              bottom: 2,
                              transform: 'translateX(-50%)',
                              fontSize: 8,
                              color: '#6b7280',
                            }}>
                              {p.distance}mm
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <div className="preview-legend">
                      <span>← {fromEnd}mm from end</span>
                      <span>{spacing}mm spacing</span>
                      <span>{effectiveHole.label}</span>
                    </div>
                  </div>
                </div>

                {/* Export actions */}
                <div className="form-section export-bar">
                  <div className="export-actions">
                    <button className="btn-secondary" onClick={downloadJSON}>
                      Download JSON
                    </button>
                    <button
                      className="btn-primary"
                      onClick={sendToMachine}
                      disabled={!status.canRun || !face}
                    >
                      {status.isRunning ? 'Running...' : 'Send to Machine'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Machine tab */}
        {activeTab === 'machine' && (
          <div className="machine-panel">
            <MachineStatusDashboard machine={machine} actions={actions} status={status} />
            {/* Machine control buttons */}
            {status.isRunning && (
              <div className="machine-controls">
                <button className="btn-control btn-pause" onClick={actions.pauseJob}>
                  Pause
                </button>
                <button className="btn-control btn-stop" onClick={actions.stopJob}>
                  Stop
                </button>
                <button className="btn-control btn-estop" onClick={actions.emergencyStop}>
                  E-STOP
                </button>
              </div>
            )}
            {status.isPaused && (
              <div className="machine-controls">
                <button className="btn-control btn-resume" onClick={actions.resumeJob}>
                  Resume
                </button>
                <button className="btn-control btn-stop" onClick={actions.stopJob}>
                  Stop
                </button>
              </div>
            )}
          </div>
        )}

        {/* Jobs tab */}
        {activeTab === 'jobs' && (
          <JobBuilder
            currentOperation={currentOperation}
            operations={operations}
            onAddOperation={handleAddOperation}
            onClear={handleClearOperations}
          />
        )}

        {/* Tools tab */}
        {activeTab === 'tools' && (
          <ToolManagement machine={machine} />
        )}

        {/* Calibrate tab */}
        {activeTab === 'calibrate' && (
          <CalibrationHelper
            machine={machine}
            actions={actions}
            status={status}
          />
        )}
      </main>
    </div>
  );
}
