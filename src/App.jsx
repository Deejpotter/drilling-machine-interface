import React, { useEffect, useMemo, useState } from 'react';
import { generateGcode, downloadGcode, saveGcodeWithPicker } from './machine/gcodeGenerator';
import { EXTRUSION_PROFILES, HOLE_TYPES, FEATURE_CONFIG, MACHINE_CONFIG } from './machine/config';

const STORAGE_KEY = 'drilling-machine-ui-state-v2';
const MODE_KEY = 'drilling-machine-mode';

function createDefaultPattern(slotId) {
  return {
    slotId,
    holeType: 'single-hole',
    holeCount: MACHINE_CONFIG.defaultHoleCount,
    fromEnd: MACHINE_CONFIG.defaultFromEnd,
    spacing: MACHINE_CONFIG.defaultSpacing,
  };
}

function getInitialState() {
  const fallbackProfile = EXTRUSION_PROFILES.find(p => p.id === '40-4040') || EXTRUSION_PROFILES.find(p => p.id === '20-2040') || EXTRUSION_PROFILES[0];
  const fallbackFaceIndex = 0;
  const fallbackFace = fallbackProfile.faces[fallbackFaceIndex];
  const defaults = {
    mode: 'simple',
    profileId: fallbackProfile.id,
    materialLength: MACHINE_CONFIG.defaultMaterialLength,
    orderNumber: '180000',
    selectedFaceIndex: fallbackFaceIndex,
    slotPatterns: [createDefaultPattern(fallbackFace.slots[0].id)],
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const savedMode = window.localStorage.getItem(MODE_KEY);
    const mode = (savedMode === 'simple' || savedMode === 'advanced') ? savedMode : 'simple';
    const enabledProfiles = FEATURE_CONFIG[mode].profiles;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults, mode };
    const parsed = JSON.parse(raw);
    // If saved profile isn't in current mode's allowed list, fall back
    const profile = enabledProfiles.includes(parsed.profileId)
      ? EXTRUSION_PROFILES.find(p => p.id === parsed.profileId)
      : EXTRUSION_PROFILES.find(p => p.id === enabledProfiles[0]) || fallbackProfile;
    const faceIndex = Number.isInteger(parsed.selectedFaceIndex)
      ? Math.min(Math.max(parsed.selectedFaceIndex, 0), profile.faces.length - 1)
      : 0;
    const face = profile.faces[faceIndex];
    const allowedSlots = new Set(face.slots.map(s => s.id));
    const seen = new Set();
    const slotPatterns = Array.isArray(parsed.slotPatterns)
      ? parsed.slotPatterns
          .filter(row => row && allowedSlots.has(row.slotId) && !seen.has(row.slotId))
          .map(row => {
            seen.add(row.slotId);
            return {
              slotId: row.slotId,
              holeType: typeof row.holeType === 'string' ? row.holeType : 'single-hole',
              holeCount: Math.max(1, Number(row.holeCount) || MACHINE_CONFIG.defaultHoleCount),
              fromEnd: Math.max(0, Number(row.fromEnd) || MACHINE_CONFIG.defaultFromEnd),
              spacing: Math.max(1, Number(row.spacing) || MACHINE_CONFIG.defaultSpacing),
            };
          })
      : [];

    return {
      mode,
      profileId: profile.id,
      materialLength: Math.max(10, Number(parsed.materialLength) || MACHINE_CONFIG.defaultMaterialLength),
      orderNumber: typeof parsed.orderNumber === 'string' && parsed.orderNumber.trim().length > 0 ? parsed.orderNumber : '180000',
      selectedFaceIndex: faceIndex,
      slotPatterns: slotPatterns.length > 0 ? slotPatterns : [createDefaultPattern(face.slots[0].id)],
    };
  } catch {
    return defaults;
  }
}

/* ────────────────────────────────────────────
   Main App
   ──────────────────────────────────────────── */
export default function App() {
  const initialState = useMemo(() => getInitialState(), []);
  const [mode, setMode] = useState(initialState.mode);
  const [profileId, setProfileId] = useState(initialState.profileId);
  const [materialLength, setMaterialLength] = useState(initialState.materialLength);
  const [orderNumber, setOrderNumber] = useState(initialState.orderNumber);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(initialState.selectedFaceIndex);
  const [slotPatterns, setSlotPatterns] = useState(initialState.slotPatterns);
  const [slotToAdd, setSlotToAdd] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Filter profiles and hole types by current mode
  const enabledProfileIds = FEATURE_CONFIG[mode].profiles;
  const enabledHoleTypeIds = FEATURE_CONFIG[mode].holeTypes;
  const filteredProfiles = EXTRUSION_PROFILES.filter(p => enabledProfileIds.includes(p.id));
  const filteredHoleTypes = HOLE_TYPES.filter(h => enabledHoleTypeIds.includes(h.id));

  // If current profile isn't in filtered list, reset to first available
  const profile = filteredProfiles.find(p => p.id === profileId) || filteredProfiles[0];
  const face = profile.faces[selectedFaceIndex];
  const faceNumber = selectedFaceIndex + 1;
  const slotMap = new Map(face.slots.map(s => [s.id, s]));
  const slotPatternsSorted = [...slotPatterns].sort((a, b) => a.slotId - b.slotId);
  const selectedSlotTags = slotPatternsSorted.map(p => `S${p.slotId}`);

  // When mode changes, ensure profile is valid
  useEffect(() => {
    if (!enabledProfileIds.includes(profileId)) {
      setProfileId(enabledProfileIds[0]);
      setSelectedFaceIndex(0);
    }
  }, [mode, enabledProfileIds, profileId]);

  // Persist mode to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  // Toggle mode handler
  const toggleMode = () => {
    setMode(m => m === 'simple' ? 'advanced' : 'simple');
  };

  useEffect(() => {
    const currentProfile = filteredProfiles.find(p => p.id === profileId) || filteredProfiles[0];
    const currentFace = currentProfile.faces[selectedFaceIndex];
    if (!currentFace) return;
    setSlotPatterns(prev => {
      const allowedSlots = new Set(currentFace.slots.map(s => s.id));
      const seen = new Set();
      const filtered = prev
        .filter(row => allowedSlots.has(row.slotId) && !seen.has(row.slotId))
        .map(row => {
          seen.add(row.slotId);
          return row;
        });
      return filtered.length > 0 ? filtered : [createDefaultPattern(currentFace.slots[0].id)];
    });
  }, [profileId, selectedFaceIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profileId: profile.id,
        materialLength,
        orderNumber,
        selectedFaceIndex,
        slotPatterns,
      })
    );
  }, [profile.id, materialLength, orderNumber, selectedFaceIndex, slotPatterns]);

  useEffect(() => {
    if (!saveMessage) return;
    setSaveMessage('');
  }, [profile.id, materialLength, orderNumber, selectedFaceIndex, slotPatterns]);

  const hasOrderNumber = orderNumber.trim().length > 0;
  const orderLabel = hasOrderNumber ? orderNumber.trim() : 'Job';
  const availableHolesForFace = filteredHoleTypes.filter(h => h.maxSlots >= face.slots.length);

  // When face changes, if current hole type isn't available, reset to first available
  useEffect(() => {
    const currentProfile = filteredProfiles.find(p => p.id === profileId) || filteredProfiles[0];
    const currentFace = currentProfile.faces[selectedFaceIndex];
    if (!currentFace) return;
    const currentSlotMap = new Map(currentFace.slots.map(s => [s.id, s]));
    const currentAvailableHoles = HOLE_TYPES.filter(h => FEATURE_CONFIG[mode].holeTypes.includes(h.id) && h.maxSlots >= currentFace.slots.length);
    setSlotPatterns(prev => {
      return prev.map(p => {
        const availableHoles = currentAvailableHoles.filter(h => h.minSlot <= (currentSlotMap.get(p.slotId)?.width || 0));
        if (!availableHoles.find(h => h.id === p.holeType)) {
          return { ...p, holeType: availableHoles[0]?.id || 'single-hole' };
        }
        return p;
      });
    });
  }, [profileId, selectedFaceIndex, mode]);

  /* Build job object for current face with one or more independently-configured slots */
  const job = useMemo(() => {
    // Generate name: OrderNumber-Profile-F#-Date (one file per face)
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
    const fallbackStamp = `${now.toISOString().slice(11,19).replace(/:/g,'')}${String(now.getMilliseconds()).padStart(3, '0')}`;
    const name = orderNumber.trim() 
      ? `${orderNumber.trim()}-${profile.name.replace(/×/g, 'x')}-F${faceNumber}-${dateStr}`
      : `drill-job-${fallbackStamp}-${profile.name.replace(/×/g, 'x')}-F${faceNumber}-${dateStr}`;

    return {
      name,
      materialLength,
      createdAt: new Date().toISOString(),
      operations: slotPatternsSorted.map(pattern => ({
        profile: profile.name,
        face: `F${faceNumber}`,
        faceLabel: face.label,
        slot: pattern.slotId,
        slotPosition: slotMap.get(pattern.slotId)?.position || 0,
        slot_width_mm: slotMap.get(pattern.slotId)?.width || 0,
        holes: Array.from({ length: pattern.holeCount }, (_, i) => ({
          step: i + 1,
          holeType: pattern.holeType,
          distance_from_end_mm: pattern.fromEnd + i * pattern.spacing,
        })),
      })),
      holes: slotPatternsSorted.flatMap(pattern =>
        Array.from({ length: pattern.holeCount }, (_, i) => ({
          step: i + 1,
          holeType: pattern.holeType,
          distance_from_end_mm: pattern.fromEnd + i * pattern.spacing,
          slot: pattern.slotId,
        }))
      ),
    };
  }, [materialLength, orderNumber, profile, face, faceNumber, slotPatternsSorted, slotMap]);

  const gcode = useMemo(() => {
    if (job.holes.length === 0) return '';
    return generateGcode(job);
  }, [job]);

  const isGcodeEmpty = !gcode || gcode.length === 0;

  const vizRows = useMemo(() => {
    return slotPatternsSorted.map((pattern, index) => {
      const slot = slotMap.get(pattern.slotId);
      const holePositions = Array.from({ length: pattern.holeCount }, (_, i) => pattern.fromEnd + i * pattern.spacing);
      const holeDiameter = pattern.holeType === 'm8-counterbore' ? 12 : pattern.holeType === 'double-hole' ? 7 : pattern.holeType === 'slotted-hole' ? 7 : 7;
      const isDoubleHole = pattern.holeType === 'double-hole';
      const rowColor = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4];

      return {
        slotId: pattern.slotId,
        label: `S${pattern.slotId}`,
        slotPosition: slot?.position ?? 0,
        position: slot?.position ?? 0,
        width: slot?.width ?? 0,
        holePositions,
        holeDiameter,
        rowColor,
        pattern,
        isDoubleHole,
      };
    });
  }, [slotPatternsSorted, slotMap]);

  const slotFitChecks = useMemo(() => {
    return slotPatternsSorted.map(pattern => {
      const lastHoleEnd = pattern.fromEnd + (pattern.holeCount - 1) * pattern.spacing + 20;
      return {
        slotId: pattern.slotId,
        clearanceEnd: materialLength - lastHoleEnd,
      };
    });
  }, [slotPatternsSorted, materialLength]);

  /* Validity */
  const fits = slotFitChecks.every(check => check.clearanceEnd >= 0);
  const firstOverrun = slotFitChecks.find(check => check.clearanceEnd < 0);
  const minClearance = slotFitChecks.length > 0
    ? Math.min(...slotFitChecks.map(check => check.clearanceEnd))
    : Infinity;
  const canDownload = fits && hasOrderNumber && !isGcodeEmpty && slotPatternsSorted.length > 0;
  const remainingSlots = face.slots.filter(slot => !slotPatterns.some(pattern => pattern.slotId === slot.id));

  useEffect(() => {
    const currentProfile = filteredProfiles.find(p => p.id === profileId) || filteredProfiles[0];
    const currentFace = currentProfile.faces[selectedFaceIndex];
    if (!currentFace) return;
    const currentRemaining = currentFace.slots.filter(slot => !slotPatterns.some(pattern => pattern.slotId === slot.id));
    if (currentRemaining.length === 0) {
      setSlotToAdd('');
      return;
    }
    const remainingIds = currentRemaining.map(slot => String(slot.id));
    if (!remainingIds.includes(slotToAdd)) {
      setSlotToAdd(remainingIds[0]);
    }
  }, [profileId, selectedFaceIndex, slotPatterns, slotToAdd]);

  const updatePattern = (slotId, patch) => {
    setSlotPatterns(prev => prev.map(pattern =>
      pattern.slotId === slotId ? { ...pattern, ...patch } : pattern
    ));
  };

  const addSlotPattern = (slotId) => {
    setSlotPatterns(prev => {
      if (prev.some(row => row.slotId === slotId)) return prev;
      return [...prev, createDefaultPattern(slotId)];
    });
  };

  const removeSlotPattern = (slotId) => {
    setSlotPatterns(prev => {
      if (prev.length === 1) return prev;
      return prev.filter(row => row.slotId !== slotId);
    });
  };

  const handleSaveToDrive = async () => {
    setSaveMessage('');
    try {
      const fileName = await saveGcodeWithPicker(job);
      setSaveMessage(`Saved ${fileName}.`);
    } catch (error) {
      if (error?.name === 'AbortError') {
        setSaveMessage('Save canceled.');
        return;
      }
      if (error?.code === 'NO_FILE_PICKER_API') {
        setSaveMessage('Save-to-drive is not supported in this browser. Use Download instead.');
        return;
      }
      setSaveMessage('Save failed. Use Download instead.');
    }
  };

  const handleResetJob = () => {
    const defaultProfile = filteredProfiles.find(p => p.id === '40-4040') || filteredProfiles[0];
    const defaultFace = defaultProfile.faces[0];
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setProfileId(defaultProfile.id);
    setMaterialLength(MACHINE_CONFIG.defaultMaterialLength);
    setOrderNumber('');
    setSelectedFaceIndex(0);
    setSlotPatterns([createDefaultPattern(defaultFace.slots[0].id)]);
    setSlotToAdd(defaultFace.slots[1] ? String(defaultFace.slots[1].id) : '');
    setSaveMessage('');
  };

  const copyPreviousPattern = (slotId) => {
    const idx = slotPatternsSorted.findIndex(p => p.slotId === slotId);
    if (idx <= 0) return;
    const prevPattern = slotPatternsSorted[idx - 1];
    if (!prevPattern) return;
    updatePattern(slotId, {
      holeType: prevPattern.holeType,
      holeCount: prevPattern.holeCount,
      fromEnd: prevPattern.fromEnd,
      spacing: prevPattern.spacing,
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Drilling Machine Interface</h1>
        <button
          type="button"
          className="mode-toggle"
          onClick={toggleMode}
          title="Switch between simple and advanced mode"
        >
          {mode === 'simple' ? '⚙ Simple' : '⚙ Advanced'}
        </button>
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
              value={profile.id}
              onChange={e => {
                const nextProfile = filteredProfiles.find(p => p.id === e.target.value) || filteredProfiles[0];
                setProfileId(nextProfile.id);
                setSelectedFaceIndex(0);
                setSlotPatterns([createDefaultPattern(nextProfile.faces[0].slots[0].id)]);
              }}
            >
              {filteredProfiles.map(p => (
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
              }}
            >
              {profile.faces.map((f, idx) => (
                <option key={f.id} value={idx}>
                  F{idx + 1} ({f.slots.length} slot{f.slots.length !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Slot pattern rows */}
          <div className="form-section">
            <label>Slot Patterns on F{faceNumber}</label>
            <div className="slot-controls">
              <select
                id="slot-add-select"
                className="select"
                disabled={remainingSlots.length === 0}
                value={slotToAdd}
                onChange={e => setSlotToAdd(e.target.value)}
              >
                {remainingSlots.length === 0 ? (
                  <option value="">All slots added</option>
                ) : (
                  remainingSlots.map(slot => (
                    <option key={slot.id} value={slot.id}>
                      Add S{slot.id} @ {slot.position}mm ({slot.width}mm)
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                id="slot-add-btn"
                className="slot-mini-btn"
                disabled={remainingSlots.length === 0}
                onClick={() => {
                  const nextId = Number(slotToAdd || remainingSlots[0]?.id);
                  if (nextId) addSlotPattern(nextId);
                }}
              >
                Add slot
              </button>
            </div>
            <div id="slot-multi" className="slot-checklist">
              {slotPatternsSorted.map((pattern, index) => {
                const slot = slotMap.get(pattern.slotId);
                const availableHoles = availableHolesForFace.filter(h => h.minSlot <= (slot?.width || 0));
                const rowClearance = slotFitChecks.find(check => check.slotId === pattern.slotId)?.clearanceEnd ?? 0;
                return (
                  <div key={pattern.slotId} className="slot-pattern-row">
                    <div className="slot-pattern-header">
                      <span className="slot-pattern-title">S{pattern.slotId} @ {slot?.position}mm ({slot?.width}mm)</span>
                      <div className="slot-pattern-actions">
                        <button
                          type="button"
                          className="slot-mini-btn"
                          onClick={() => copyPreviousPattern(pattern.slotId)}
                          disabled={index === 0}
                        >
                          Copy prev
                        </button>
                        <button
                          type="button"
                          className="slot-mini-btn"
                          onClick={() => removeSlotPattern(pattern.slotId)}
                          disabled={slotPatternsSorted.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="slot-pattern-fields">
                      <div className="form-row">
                        <label htmlFor={index === 0 ? 'sel-hole' : `sel-hole-${pattern.slotId}`}>Hole type</label>
                        <select
                          id={index === 0 ? 'sel-hole' : `sel-hole-${pattern.slotId}`}
                          className="select"
                          value={pattern.holeType}
                          onChange={e => updatePattern(pattern.slotId, { holeType: e.target.value })}
                        >
                          {availableHoles.map(h => (
                            <option key={h.id} value={h.id}>{h.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-row">
                        <label htmlFor={index === 0 ? 'count-input' : `count-input-${pattern.slotId}`}>Number of holes</label>
                        <input
                          id={index === 0 ? 'count-input' : `count-input-${pattern.slotId}`}
                          type="number"
                          min={1}
                          max={50}
                          value={pattern.holeCount}
                          onChange={e => updatePattern(pattern.slotId, { holeCount: Math.max(1, Number(e.target.value)) })}
                        />
                      </div>
                      <div className="form-row">
                        <label htmlFor={index === 0 ? 'from-input' : `from-input-${pattern.slotId}`}>From end (mm)</label>
                        <input
                          id={index === 0 ? 'from-input' : `from-input-${pattern.slotId}`}
                          type="number"
                          min={0}
                          value={pattern.fromEnd}
                          onChange={e => updatePattern(pattern.slotId, { fromEnd: Math.max(0, Number(e.target.value)) })}
                        />
                      </div>
                      {pattern.holeCount > 1 && (
                        <div className="form-row">
                          <label htmlFor={index === 0 ? 'spacing-input' : `spacing-input-${pattern.slotId}`}>Spacing (mm)</label>
                          <input
                            id={index === 0 ? 'spacing-input' : `spacing-input-${pattern.slotId}`}
                            type="number"
                            min={1}
                            value={pattern.spacing}
                            onChange={e => updatePattern(pattern.slotId, { spacing: Math.max(1, Number(e.target.value)) })}
                          />
                        </div>
                      )}
                    </div>
                    {rowClearance < 0 && (
                      <div className="slot-row-warning">
                        S{pattern.slotId} overruns by {Math.abs(rowClearance).toFixed(0)}mm
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Material length */}
          <div className="form-section">
            <label htmlFor="length-input">Material length (mm)</label>
            <input id="length-input" type="number" min={10} max={6000}
              value={materialLength}
              onChange={e => setMaterialLength(Math.max(10, Number(e.target.value)))}
            />
          </div>

          {/* Validity */}
          {!hasOrderNumber && (
            <div className="validity-error">
              Order number is required for every job
            </div>
          )}
          {!fits && (
            <div className="validity-error">
              Pattern overruns on S{firstOverrun?.slotId} by {Math.abs(firstOverrun?.clearanceEnd || 0).toFixed(0)}mm — reduce holes, spacing, or increase length
            </div>
          )}
          {fits && minClearance < 20 && (
            <div className="validity-warning">
              Last hole on at least one slot ends {minClearance.toFixed(0)}mm from end — tight clearance
            </div>
          )}

          {/* Extrusion visualisation */}
          {vizRows.length > 0 && (
            <div className="form-section">
              <label>Visualisation — F{faceNumber}, {vizRows.length} slot{vizRows.length !== 1 ? 's' : ''}</label>
              <svg viewBox={`0 0 340 ${Math.max(92, 38 + vizRows.length * 34)}`} className="extrusion-viz">
                {/* Extrusion body */}
                <rect x="6" y="4" width="328" height={Math.max(56, 22 + vizRows.length * 34)} rx="4" fill={fits ? '#e2e8f0' : '#fee2e2'} stroke={fits ? '#94a3b8' : '#fca5a5'} strokeWidth="1" />
                {/* Extrusion end markers */}
                <rect x="4" y="0" width="4" height={Math.max(64, 38 + vizRows.length * 34)} rx="1" fill={fits ? '#64748b' : '#ef4444'} />
                <rect x="332" y="0" width="4" height={Math.max(64, 38 + vizRows.length * 34)} rx="1" fill={fits ? '#64748b' : '#ef4444'} />
                {vizRows.map((row, rowIndex) => {
                  const rowCount = vizRows.length;
                  const bodyHeight = Math.max(56, 22 + rowCount * 34);
                  const baseY = 4 + (bodyHeight / (rowCount + 1)) * (rowIndex + 1);
                  return (
                    <g key={row.slotId}>
                      <line x1="12" y1={baseY} x2="328" y2={baseY} stroke={row.rowColor} strokeWidth="2.5" strokeDasharray="5 4" opacity="0.8" />
                      <text x="16" y={baseY - 9} fontSize="10" fill="#475569" fontFamily="sans-serif">
                        {row.label}
                      </text>
                      {row.holePositions.map((pos, holeIndex) => {
                        const pct = pos / materialLength;
                        const x = 12 + 316 * pct;
                        const overrun = pos > materialLength;
                        const r = Math.max(4, row.holeDiameter * 0.5);
                        const isEdgeHole = holeIndex === 0 || holeIndex === row.holePositions.length - 1;
                        return (
                          <g key={`${row.slotId}-${holeIndex}`}>
                            {row.isDoubleHole ? (
                              <>
                                <circle cx={Math.min(x, 332) - 4} cy={baseY} r={r}
                                  fill={overrun ? '#ef4444' : row.rowColor}
                                  stroke="white" strokeWidth="2"
                                />
                                <circle cx={Math.min(x, 332) + 4} cy={baseY} r={r}
                                  fill={overrun ? '#ef4444' : row.rowColor}
                                  stroke="white" strokeWidth="2"
                                />
                              </>
                            ) : (
                              <circle cx={Math.min(x, 332)} cy={baseY} r={r}
                                fill={overrun ? '#ef4444' : row.rowColor}
                                stroke="white" strokeWidth="2"
                              />
                            )}
                            {isEdgeHole && (
                              <text x={Math.min(x, 332)} y={baseY + 14} textAnchor="middle"
                                fontSize="8" fill="#64748b" fontFamily="sans-serif">
                                {pos}mm
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
                {/* Material length label */}
                <text x="170" y={Math.max(58, 30 + vizRows.length * 34)} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">
                  {materialLength}mm
                </text>
                <text x="8" y={Math.max(58, 30 + vizRows.length * 34)} textAnchor="start" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
                  0
                </text>
              </svg>
              <div className="viz-legend">
                <span className="viz-legend-dot" style={{ background: '#3b82f6' }} />
                <span className="viz-legend-label">Each row is one slot pattern on F{faceNumber}; labels mark first and last hole.</span>
              </div>
            </div>
          )}

          {/* Generate */}
          <div className="form-section export-bar">
            <div className="export-actions">
              <button className="btn-primary"
                onClick={() => downloadGcode(job)}
                disabled={!fits || slotPatternsSorted.length === 0 || !hasOrderNumber}
              >
                Download {orderLabel} F{faceNumber}
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

          {/* Preview */}
          {gcode && (
            <div className="gcode-section">
              <div className="gcode-header">
                <h3>Preview — {orderLabel} F{faceNumber}, {selectedSlotTags.join(', ')}</h3>
                <span className="gcode-summary">
                  {job.holes.length} hole{job.holes.length !== 1 ? 's' : ''} · {materialLength}mm extrusion · {slotPatternsSorted.length} slot{slotPatternsSorted.length !== 1 ? 's' : ''}
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
