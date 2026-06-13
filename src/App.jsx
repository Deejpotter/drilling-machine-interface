import React, { useEffect, useMemo, useState } from 'react';
import { generateGcode, downloadGcode, saveGcodeWithPicker } from './machine/gcodeGenerator';
import { EXTRUSION_PROFILES, HOLE_TYPES, FEATURE_CONFIG, MACHINE_CONFIG } from './machine/config';

const STORAGE_KEY = 'drilling-machine-ui-state-v3';
const MODE_KEY = 'drilling-machine-mode';

// Generate unique pattern IDs
let _patternIdCounter = 0;
const generatePatternId = () => `p${++_patternIdCounter}-${Date.now().toString(36)}`;

function createDefaultPattern(slotId) {
  return {
    slotId,
    patterns: [
      {
        id: generatePatternId(),
        holeType: 'single-hole',
        fromEnd: MACHINE_CONFIG.defaultFromEnd,
        count: 1,
        spacing: 0,
      },
    ],
  };
}

function addPatternToSlot(slotPatterns, slotId, prevPattern = null) {
  const defaultFromEnd = prevPattern ? prevPattern.fromEnd + 25 : MACHINE_CONFIG.defaultFromEnd;
  return slotPatterns.map(slot => {
    if (slot.slotId !== slotId) return slot;
    const newPattern = {
      id: generatePatternId(),
      holeType: prevPattern ? prevPattern.holeType : 'single-hole',
      fromEnd: defaultFromEnd,
      count: 1,
      spacing: 0,
    };
    return { ...slot, patterns: [...slot.patterns, newPattern] };
  });
}

function removePatternFromSlot(slotPatterns, slotId, patternId) {
  return slotPatterns.map(slot => {
    if (slot.slotId !== slotId) return slot;
    if (slot.patterns.length <= 1) return slot; // Keep at least one pattern
    return { ...slot, patterns: slot.patterns.filter(p => p.id !== patternId) };
  });
}

function updatePatternInSlot(slotPatterns, slotId, patternId, updates) {
  return slotPatterns.map(slot => {
    if (slot.slotId !== slotId) return slot;
    return {
      ...slot,
      patterns: slot.patterns.map(p => {
        if (p.id !== patternId) return p;
        return { ...p, ...updates };
      }),
    };
  });
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
    
    // Migrate old structure (v2) to new structure (v3)
    const slotPatterns = Array.isArray(parsed.slotPatterns)
      ? parsed.slotPatterns
          .filter(row => row && allowedSlots.has(row.slotId) && !seen.has(row.slotId))
          .map(row => {
            seen.add(row.slotId);
            // Check if this is old structure (has holeCount) or new structure (has patterns array)
            if (row.patterns && Array.isArray(row.patterns)) {
              // New structure - validate and use as-is
              return {
                slotId: row.slotId,
                patterns: row.patterns.map(p => ({
                  id: p.id || generatePatternId(),
                  holeType: typeof p.holeType === 'string' ? p.holeType : 'single-hole',
                  fromEnd: Math.max(0, Number(p.fromEnd) || MACHINE_CONFIG.defaultFromEnd),
                  count: Math.max(1, Number(p.count) || 1),
                  spacing: Math.max(0, Number(p.spacing) || 0),
                })),
              };
            } else {
              // Old structure - migrate to new structure
              const holeCount = Math.max(1, Number(row.holeCount) || MACHINE_CONFIG.defaultHoleCount);
              const fromEnd = Math.max(0, Number(row.fromEnd) || MACHINE_CONFIG.defaultFromEnd);
              const spacing = Math.max(1, Number(row.spacing) || MACHINE_CONFIG.defaultSpacing);
              const patterns = Array.from({ length: holeCount }, (_, i) => ({
                id: generatePatternId(),
                holeType: typeof row.holeType === 'string' ? row.holeType : 'single-hole',
                fromEnd: fromEnd + i * spacing,
                count: 1,
                spacing: 0,
              }));
              return { slotId: row.slotId, patterns };
            }
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
  const faceWidth = face.width || 40; // Default to 40mm if not set
  const vizScale = faceWidth / 40; // Scale relative to 40mm base

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
      profile: profile.name,
      faceLabel: `F${faceNumber}`,
      patternCount: slotPatternsSorted.reduce((sum, slot) => sum + slot.patterns.length, 0),
      operations: slotPatternsSorted.flatMap((slot, slotIndex) =>
        slot.patterns.map((pattern, patternIndex) => ({
          profile: profile.name,
          face: `F${faceNumber}`,
          faceLabel: face.label,
          slot: slot.slotId,
          slotPosition: slotMap.get(slot.slotId)?.position || 0,
          slot_width_mm: slotMap.get(slot.slotId)?.width || 0,
          operationIndex: patternIndex,
          holes: Array.from({ length: pattern.count }, (_, i) => ({
            step: i + 1,
            holeType: pattern.holeType,
            distance_from_end_mm: pattern.fromEnd + i * pattern.spacing,
          })),
        }))
      ),
      holes: slotPatternsSorted.flatMap(slot =>
        slot.patterns.flatMap(pattern =>
          Array.from({ length: pattern.count }, (_, i) => ({
            step: i + 1,
            holeType: pattern.holeType,
            distance_from_end_mm: pattern.fromEnd + i * pattern.spacing,
            slot: slot.slotId,
            patternId: pattern.id,
          }))
        )
      ),
    };
  }, [materialLength, orderNumber, profile, face, faceNumber, slotPatternsSorted, slotMap]);

  const gcode = useMemo(() => {
    if (job.holes.length === 0) return '';
    return generateGcode(job);
  }, [job]);

  const isGcodeEmpty = !gcode || gcode.length === 0;

  const vizRows = useMemo(() => {
    return slotPatternsSorted.map((slot, slotIndex) => {
      const slotInfo = slotMap.get(slot.slotId);
      // Collect all hole positions from all patterns in this slot
      const allHolePositions = [];
      let hasDoubleHole = false;
      let holeDiameter = 7;
      
      for (const pattern of slot.patterns) {
        const positions = Array.from({ length: pattern.count }, (_, i) => pattern.fromEnd + i * pattern.spacing);
        allHolePositions.push(...positions.map(pos => ({ pos, holeType: pattern.holeType })));
        if (pattern.holeType === 'double-hole') hasDoubleHole = true;
        if (pattern.holeType === 'm8-counterbore') holeDiameter = 12;
      }
      
      const rowColor = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][slotIndex % 4];

      return {
        slotId: slot.slotId,
        label: `S${slot.slotId}`,
        slotPosition: slotInfo?.position ?? 0,
        position: slotInfo?.position ?? 0,
        width: slotInfo?.width ?? 0,
        holePositions: allHolePositions,
        holeDiameter,
        rowColor,
        patterns: slot.patterns,
        isDoubleHole: hasDoubleHole,
      };
    });
  }, [slotPatternsSorted, slotMap]);

  const slotFitChecks = useMemo(() => {
    return slotPatternsSorted.map(slot => {
      // Find the last hole position across all patterns in this slot
      let lastHolePos = 0;
      for (const pattern of slot.patterns) {
        const patternLastHole = pattern.fromEnd + (pattern.count - 1) * pattern.spacing;
        if (patternLastHole > lastHolePos) lastHolePos = patternLastHole;
      }
      const lastHoleEnd = lastHolePos + 20; // 20mm clearance
      return {
        slotId: slot.slotId,
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

  const updatePattern = (slotId, patternId, patch) => {
    setSlotPatterns(prev => updatePatternInSlot(prev, slotId, patternId, patch));
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

  const addPatternToSlotHandler = (slotId, prevPattern = null) => {
    setSlotPatterns(prev => addPatternToSlot(prev, slotId, prevPattern));
  };

  const removePatternFromSlotHandler = (slotId, patternId) => {
    setSlotPatterns(prev => removePatternFromSlot(prev, slotId, patternId));
  };

  const copyPreviousPattern = (slotId) => {
    const idx = slotPatternsSorted.findIndex(p => p.slotId === slotId);
    if (idx <= 0) return;
    const prevSlot = slotPatternsSorted[idx - 1];
    if (!prevSlot || !prevSlot.patterns || prevSlot.patterns.length === 0) return;
    // Copy all patterns from previous slot
    const patternsToCopy = prevSlot.patterns.map(p => ({
      id: generatePatternId(),
      holeType: p.holeType,
      fromEnd: p.fromEnd,
      count: p.count,
      spacing: p.spacing,
    }));
    setSlotPatterns(prev => {
      return prev.map(slot => {
        if (slot.slotId !== slotId) return slot;
        return { ...slot, patterns: [...slot.patterns, ...patternsToCopy] };
      });
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
              {slotPatternsSorted.map((slot, slotIndex) => {
                const slotInfo = slotMap.get(slot.slotId);
                const availableHoles = availableHolesForFace.filter(h => h.minSlot <= (slotInfo?.width || 0));
                const slotClearance = slotFitChecks.find(check => check.slotId === slot.slotId);
                
                return (
                  <div key={slot.slotId} className="slot-pattern-row">
                    <div className="slot-pattern-header">
                      <span className="slot-pattern-title">S{slot.slotId} @ {slotInfo?.position}mm ({slotInfo?.width}mm)</span>
                      <div className="slot-pattern-actions">
                        <button
                          type="button"
                          className="slot-mini-btn"
                          onClick={() => copyPreviousPattern(slot.slotId)}
                          disabled={slotIndex === 0}
                        >
                          Copy prev slot
                        </button>
                        <button
                          type="button"
                          className="slot-mini-btn"
                          onClick={() => removeSlotPattern(slot.slotId)}
                          disabled={slotPatternsSorted.length === 1}
                        >
                          Remove slot
                        </button>
                      </div>
                    </div>
                    {/* Patterns within this slot */}
                    <div className="slot-patterns-list">
                      {slot.patterns.map((pattern, patternIndex) => {
                        const prevPattern = patternIndex > 0 ? slot.patterns[patternIndex - 1] : null;
                        return (
                          <div key={pattern.id} className="slot-pattern-subrow">
                            <div className="pattern-index">#{patternIndex + 1}</div>
                            <div className="slot-pattern-fields">
                              <div className="form-row">
                                <label>Hole type</label>
                                <select
                                  className="select"
                                  value={pattern.holeType}
                                  onChange={e => updatePattern(slot.slotId, pattern.id, { holeType: e.target.value })}
                                >
                                  {availableHoles.map(h => (
                                    <option key={h.id} value={h.id}>{h.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-row">
                                <label>From end (mm)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={pattern.fromEnd}
                                  onChange={e => updatePattern(slot.slotId, pattern.id, { fromEnd: Math.max(0, Number(e.target.value)) })}
                                />
                              </div>
                              <div className="form-row">
                                <label>Count</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={pattern.count}
                                  onChange={e => updatePattern(slot.slotId, pattern.id, { count: Math.max(1, Number(e.target.value)) })}
                                />
                              </div>
                              {pattern.count > 1 && (
                                <div className="form-row">
                                  <label>Spacing (mm)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={pattern.spacing}
                                    onChange={e => updatePattern(slot.slotId, pattern.id, { spacing: Math.max(1, Number(e.target.value)) })}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="pattern-actions">
                              {patternIndex === slot.patterns.length - 1 && (
                                <button
                                  type="button"
                                  className="slot-mini-btn"
                                  onClick={() => addPatternToSlotHandler(slot.slotId, prevPattern || pattern)}
                                >
                                  + Add pattern
                                </button>
                              )}
                              {slot.patterns.length > 1 && (
                                <button
                                  type="button"
                                  className="slot-mini-btn danger"
                                  onClick={() => removePatternFromSlotHandler(slot.slotId, pattern.id)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {slotClearance && slotClearance.clearanceEnd < 0 && (
                      <div className="slot-row-warning">
                        S{slot.slotId} overruns by {Math.abs(slotClearance.clearanceEnd).toFixed(0)}mm
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
              <svg viewBox={`0 0 340 ${Math.max(92, (38 + vizRows.length * 34) * vizScale)}`} className="extrusion-viz">
                {/* Extrusion body — height scaled to face width */}
                <rect x="6" y="4" width="328" height={Math.max(56, (22 + vizRows.length * 34) * vizScale)} rx="4" fill={fits ? '#e2e8f0' : '#fee2e2'} stroke={fits ? '#94a3b8' : '#fca5a5'} strokeWidth="1" />
                {/* Extrusion end markers */}
                <rect x="4" y="0" width="4" height={Math.max(64, (38 + vizRows.length * 34) * vizScale)} rx="1" fill={fits ? '#64748b' : '#ef4444'} />
                <rect x="332" y="0" width="4" height={Math.max(64, (38 + vizRows.length * 34) * vizScale)} rx="1" fill={fits ? '#64748b' : '#ef4444'} />
                {vizRows.map((row, rowIndex) => {
                  const rowCount = vizRows.length;
                  const bodyHeight = Math.max(56, (22 + rowCount * 34) * vizScale);
                  // Position slots based on their actual position within the face width
                  const slotPositionRatio = row.position / faceWidth;
                  const baseY = 4 + bodyHeight * slotPositionRatio;
                  return (
                    <g key={row.slotId}>
                      <line x1="12" y1={baseY} x2="328" y2={baseY} stroke={row.rowColor} strokeWidth="2.5" strokeDasharray="5 4" opacity="0.8" />
                      <text x="16" y={baseY - 9} fontSize="10" fill="#475569" fontFamily="sans-serif">
                        {row.label}
                      </text>
                      <text x="334" y={baseY + 4} fontSize="9" fill="#64748b" fontFamily="sans-serif">
                        {row.position}mm
                      </text>
                      {row.holePositions.map((holePos, holeIndex) => {
                        const pos = holePos.pos;
                        const holeType = holePos.holeType;
                        const pct = pos / materialLength;
                        const x = 12 + 316 * pct;
                        const overrun = pos > materialLength;
                        const r = Math.max(4, row.holeDiameter * 0.5);
                        const isEdgeHole = holeIndex === 0 || holeIndex === row.holePositions.length - 1;
                        const isDoubleHole = holeType === 'double-hole';
                        return (
                          <g key={`${row.slotId}-${holeIndex}`}>
                            {isDoubleHole ? (
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
                <text x="170" y={Math.max(58, (30 + vizRows.length * 34) * vizScale) + 20} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">
                  {materialLength}mm
                </text>
                <text x="8" y={Math.max(58, (30 + vizRows.length * 34) * vizScale) + 20} textAnchor="start" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
                  0
                </text>
                {/* Face width dimension label */}
                <text x="345" y={Math.max(58, (30 + vizRows.length * 34) * vizScale) / 2 + 4} textAnchor="start" fontSize="9" fill="#64748b" fontFamily="sans-serif" transform={`rotate(90, 345, ${Math.max(58, (30 + vizRows.length * 34) * vizScale) / 2 + 4})`}>
                  {faceWidth}mm face
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
                Download {job.name.split('-')[0]}-{profile.name.replace(/×/g, 'x')}{job.patternCount > 1 ? `_${job.patternCount}` : ''}-F{faceNumber}
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
