import { useEffect, useMemo, useState } from 'react';
import { EXTRUSION_PROFILES, HOLE_TYPES, FEATURE_CONFIG, MACHINE_CONFIG } from '../machine/config';

const STORAGE_KEY = 'drilling-machine-ui-state-v3';
const MODE_KEY = 'drilling-machine-mode';

let _patternIdCounter = 0;
export const generatePatternId = () => `p${++_patternIdCounter}-${Date.now().toString(36)}`;

export function createDefaultPattern(slotId) {
  /* WHY 'start': new patterns default to measuring from the 0mm end.
   * This matches the historical behavior where "from end" always meant
   * distance from the start of the extrusion. Operators who need the
   * other end can toggle it — but the default should feel familiar. */
  return {
    slotId,
    /* Fixed end fittings: Central Connector (16mm) and Anchor Fast (18mm)
     * are positioned at a specific distance from the end and can only be
     * added once per end. They're not repeatable patterns. */
    endFittings: {
      start: { centralConnector: false, anchorFast: false },
      end: { centralConnector: false, anchorFast: false },
    },
    patterns: [
      {
        id: generatePatternId(),
        holeType: 'single-hole',
        fromEnd: MACHINE_CONFIG.defaultFromEnd,
        count: 1,
        spacing: 0,
        referenceEnd: 'start',
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
      /* WHY inherit: when an operator adds a pattern via "+ Add pattern",
       * they typically want the same reference end as the previous pattern
       * in that slot. If they were measuring from the far end for one
       * pattern, the next pattern in the same slot almost certainly uses
       * the same convention. */
      referenceEnd: prevPattern ? prevPattern.referenceEnd : 'start',
    };
    return { ...slot, patterns: [...slot.patterns, newPattern] };
  });
}

function removePatternFromSlot(slotPatterns, slotId, patternId) {
  return slotPatterns.map(slot => {
    if (slot.slotId !== slotId) return slot;
    if (slot.patterns.length <= 1) return slot;
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
    orderNumber: '',
    selectedFaceIndex: fallbackFaceIndex,
    slotPatterns: [createDefaultPattern(fallbackFace.slots[0].id)],
    repetitions: 1,
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const savedMode = window.localStorage.getItem(MODE_KEY);
    const mode = (savedMode === 'simple' || savedMode === 'advanced') ? savedMode : 'simple';
    const enabledProfiles = FEATURE_CONFIG[mode].profiles;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults, mode };
    const parsed = JSON.parse(raw);
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
            if (row.patterns && Array.isArray(row.patterns)) {
              return {
                slotId: row.slotId,
                /* Preserve endFittings if present, otherwise default to
                 * no fixed fittings (all toggles off). */
                endFittings: row.endFittings ?? {
                  start: { centralConnector: false, anchorFast: false },
                  end: { centralConnector: false, anchorFast: false },
                },
                patterns: row.patterns.map(p => ({
                  id: p.id || generatePatternId(),
                  holeType: typeof p.holeType === 'string' ? p.holeType : 'single-hole',
                  fromEnd: Math.max(0, Number(p.fromEnd) || MACHINE_CONFIG.defaultFromEnd),
                  count: Math.max(1, Number(p.count) || 1),
                  spacing: Math.max(0, Number(p.spacing) || 0),
                  /* WHY default 'start': old localStorage data predates the
                   * referenceEnd feature. Without this, migrated patterns would
                   * have undefined referenceEnd, breaking position resolution.
                   * Defaulting to 'start' preserves the old behavior exactly. */
                  referenceEnd: p.referenceEnd === 'end' ? 'end' : 'start',
                })),
              };
            } else {
              const holeCount = Math.max(1, Number(row.holeCount) || MACHINE_CONFIG.defaultHoleCount);
              const fromEnd = Math.max(0, Number(row.fromEnd) || MACHINE_CONFIG.defaultFromEnd);
              const spacing = Math.max(1, Number(row.spacing) || MACHINE_CONFIG.defaultSpacing);
              const patterns = Array.from({ length: holeCount }, (_, i) => ({
                id: generatePatternId(),
                holeType: typeof row.holeType === 'string' ? row.holeType : 'single-hole',
                fromEnd: fromEnd + i * spacing,
                count: 1,
                spacing: 0,
                referenceEnd: 'start',
              }));
              return { slotId: row.slotId, patterns };
            }
          })
      : [];

    return {
      mode,
      profileId: profile.id,
      materialLength: Math.max(10, Number(parsed.materialLength) || MACHINE_CONFIG.defaultMaterialLength),
      orderNumber: typeof parsed.orderNumber === 'string' && parsed.orderNumber.trim() !== '180000' && parsed.orderNumber.trim().length > 0 ? parsed.orderNumber : '',
      selectedFaceIndex: faceIndex,
      slotPatterns: slotPatterns.length > 0 ? slotPatterns : [createDefaultPattern(face.slots[0].id)],
      repetitions: Math.max(1, Number(parsed.repetitions) || 1),
    };
  } catch {
    return defaults;
  }
}

export default function useJobState() {
  const initialState = useMemo(() => getInitialState(), []);

  const [mode, setMode] = useState(initialState.mode);
  const [profileId, setProfileId] = useState(initialState.profileId);
  const [materialLength, setMaterialLength] = useState(initialState.materialLength);
  const [orderNumber, setOrderNumber] = useState(initialState.orderNumber);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(initialState.selectedFaceIndex);
  const [slotPatterns, setSlotPatterns] = useState(initialState.slotPatterns);
  const [slotToAdd, setSlotToAdd] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [repetitions, setRepetitions] = useState(initialState.repetitions);

  const enabledProfileIds = FEATURE_CONFIG[mode].profiles;
  const enabledHoleTypeIds = FEATURE_CONFIG[mode].holeTypes;
  const filteredProfiles = EXTRUSION_PROFILES.filter(p => enabledProfileIds.includes(p.id));
  const filteredHoleTypes = HOLE_TYPES.filter(h => enabledHoleTypeIds.includes(h.id));

  const profile = filteredProfiles.find(p => p.id === profileId) || filteredProfiles[0];
  const face = profile.faces[selectedFaceIndex];
  const faceNumber = selectedFaceIndex + 1;
  const slotMap = new Map(face.slots.map(s => [s.id, s]));
  const slotPatternsSorted = [...slotPatterns].sort((a, b) => a.slotId - b.slotId);
  const selectedSlotTags = slotPatternsSorted.map(p => `S${p.slotId}`);

  const hasOrderNumber = orderNumber.trim().length > 0 && orderNumber.trim() !== '180000';
  const orderLabel = hasOrderNumber ? orderNumber.trim() : 'Job';
  const availableHolesForFace = filteredHoleTypes.filter(h => h.maxSlots >= face.slots.length);
  const faceWidth = face.width || 40;
  const vizScale = faceWidth / 40;

  // Mode change: ensure profile is valid
  useEffect(() => {
    if (!enabledProfileIds.includes(profileId)) {
      setProfileId(enabledProfileIds[0]);
      setSelectedFaceIndex(0);
    }
  }, [mode, enabledProfileIds, profileId]);

  // Persist mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  // Profile/face change: prune slot patterns
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

  // Persist job state
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
        repetitions,
      })
    );
  }, [profile.id, materialLength, orderNumber, selectedFaceIndex, slotPatterns, repetitions]);

  // Clear save message on state change
  useEffect(() => {
    if (!saveMessage) return;
    setSaveMessage('');
  }, [profile.id, materialLength, orderNumber, selectedFaceIndex, slotPatterns]);

  // Hole type reset on face change
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

  // SlotToAdd sync
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

  const toggleMode = () => {
    setMode(m => m === 'simple' ? 'advanced' : 'simple');
  };

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
    const patternsToCopy = prevSlot.patterns.map(p => ({
      id: generatePatternId(),
      holeType: p.holeType,
      fromEnd: p.fromEnd,
      count: p.count,
      spacing: p.spacing,
      /* WHY preserve: "Copy prev slot" duplicates the previous slot's
       * patterns exactly. If those patterns measured from the far end,
       * the copies should too — otherwise the operator would have to
       * re-toggle every copied pattern. */
      referenceEnd: p.referenceEnd,
    }));
    setSlotPatterns(prev => {
      return prev.map(slot => {
        if (slot.slotId !== slotId) return slot;
        return { ...slot, patterns: [...slot.patterns, ...patternsToCopy] };
      });
    });
  };

  const remainingSlots = face.slots.filter(slot => !slotPatterns.some(pattern => pattern.slotId === slot.id));

  const handleProfileChange = (e) => {
    const nextProfile = filteredProfiles.find(p => p.id === e.target.value) || filteredProfiles[0];
    setProfileId(nextProfile.id);
    setSelectedFaceIndex(0);
    setSlotPatterns([createDefaultPattern(nextProfile.faces[0].slots[0].id)]);
  };

  const handleFaceChange = (e) => {
    setSelectedFaceIndex(Number(e.target.value));
  };

  return {
    mode, toggleMode,
    profileId, setProfileId,
    profile, face, faceNumber,
    materialLength, setMaterialLength,
    orderNumber, setOrderNumber,
    selectedFaceIndex, setSelectedFaceIndex,
    repetitions, setRepetitions,
    slotPatterns, setSlotPatterns,
    slotPatternsSorted,
    slotMap, selectedSlotTags,
    filteredProfiles, filteredHoleTypes,
    enabledProfileIds, enabledHoleTypeIds,
    availableHolesForFace, faceWidth, vizScale,
    hasOrderNumber, orderLabel,
    slotToAdd, setSlotToAdd,
    remainingSlots,
    saveMessage, setSaveMessage,
    handleProfileChange, handleFaceChange,
    updatePattern,
    addSlotPattern, removeSlotPattern,
    addPatternToSlotHandler, removePatternFromSlotHandler,
    copyPreviousPattern,
  };
}
