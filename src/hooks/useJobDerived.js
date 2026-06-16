import { useEffect, useMemo } from 'react';
import { generateGcode, saveGcodeWithPicker } from '../machine/gcodeGenerator';
import { HOLE_TYPES } from '../machine/config';

export default function useJobDerived({
  profile, face, faceNumber, materialLength, orderNumber,
  slotPatternsSorted, slotMap, slotPatterns,
  filteredProfiles, profileId, selectedFaceIndex,
  setProfileId, setSelectedFaceIndex, setSlotPatterns, setSlotToAdd,
  setMaterialLength, setOrderNumber, setSaveMessage, setRepetitions, repetitions,
}) {
  /* ── Derived validity flags ───────────────────────────────────── */
  const hasOrderNumber = orderNumber.trim().length > 0;

  /* ────────────────────────────────────────────
     Job object — the bridge between UI state and G-code generation

     This memoised object transforms the raw UI state (profile, face,
     slot patterns) into a structured job that the G-code generator
     can consume. It's recomputed only when its dependencies change,
     avoiding unnecessary regeneration on every render.

     The job contains two representations of holes:
     - `operations`: grouped by slot/pattern for the G-code generator,
       which needs to know the slot for X-offset calculations
     - `holes`: flat list for validation and display, used by the
       visualisation and overrun checks
     ──────────────────────────────────────────── */
  const job = useMemo(() => {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(2)}`; // DDMMYY
    const fallbackStamp = `${now.toISOString().slice(11,19).replace(/:/g,'')}${String(now.getMilliseconds()).padStart(3, '0')}`;
    const repSuffix = repetitions > 1 ? ` ×${repetitions}` : '';
    const name = orderNumber.trim() 
      ? `${orderNumber.trim()}-${profile.name.replace(/×/g, 'x')}_1-F${faceNumber}${repSuffix}-${dateStr}`
      : `drill-job-${fallbackStamp}-${profile.name.replace(/×/g, 'x')}_1-F${faceNumber}${repSuffix}-${dateStr}`;

    /* ── Position resolution ────────────────────────────────────────
     * The UI lets operators measure from either end for convenience,
     * but the machine controller always needs absolute positions from
     * the 0mm end. This helper converts between the two at the
     * boundary — everything downstream (G-code, validation, viz)
     * reads these resolved positions and never sees referenceEnd.
     *
     * WHEN "start": position = fromEnd + i × spacing
     *   (current behavior, holes measure from the 0mm end)
     *
     * WHEN "end": position = materialLength − fromEnd − i × spacing
     *   (holes measure from the far end, so "from end: 20" on a
     *    1000mm extrusion = position 980mm)
     * ────────────────────────────────────────────────────────────── */
    const resolvePosition = (pattern, i) => {
      const base = pattern.referenceEnd === 'end'
        ? materialLength - pattern.fromEnd
        : pattern.fromEnd;
      return base + i * pattern.spacing;
    };

    return {
      name,
      materialLength,
      repetitions,
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
          slotXOffset: slotMap.get(slot.slotId)?.xOffset ?? 0,
          slot_width_mm: slotMap.get(slot.slotId)?.width || 0,
          operationIndex: patternIndex,
          holes: Array.from({ length: pattern.count }, (_, i) => ({
            step: i + 1,
            holeType: pattern.holeType,
            distance_from_end_mm: resolvePosition(pattern, i),
          })),
        }))
      ),
      holes: slotPatternsSorted.flatMap(slot =>
        slot.patterns.flatMap(pattern =>
          Array.from({ length: pattern.count }, (_, i) => ({
            step: i + 1,
            holeType: pattern.holeType,
            distance_from_end_mm: resolvePosition(pattern, i),
            slot: slot.slotId,
            patternId: pattern.id,
          }))
        )
      ),
    };
  }, [materialLength, orderNumber, profile, faceNumber, slotPatternsSorted, slotMap, repetitions]);

  // Generate G-code only when the job object changes.
  // Empty jobs (no holes defined) produce no G-code.
  const gcode = useMemo(() => {
    if (job.holes.length === 0) return '';
    return generateGcode(job);
  }, [job]);

  const isGcodeEmpty = !gcode || gcode.length === 0;

  /* ── Visualisation data ────────────────────────────────────────
   * Transforms slot patterns into drawable rows for the SVG.
   * Each slot becomes one row with its hole positions expanded
   * (double holes → two circles 40mm apart).
   *
   * WHY resolve positions here (again): the viz needs absolute
   * positions to plot holes on the SVG, but it also needs to know
   * the expansion direction for double holes. We resolve positions
   * using the same logic as the job useMemo, then expand double
   * holes in the correct direction based on referenceEnd. */
  const vizRows = useMemo(() => {
    const holeTypeMap = new Map(HOLE_TYPES.map(h => [h.id, h]));
    return slotPatternsSorted.map((slot, slotIndex) => {
      const slotInfo = slotMap.get(slot.slotId);
      const allHolePositions = [];
      let hasDoubleHole = false;
      
      for (const pattern of slot.patterns) {
        const basePositions = Array.from({ length: pattern.count }, (_, i) => {
          return pattern.referenceEnd === 'end'
            ? materialLength - pattern.fromEnd - i * pattern.spacing
            : pattern.fromEnd + i * pattern.spacing;
        });
        /* WHY per-hole diameter: each pattern can have a different hole
         * type (e.g., 7mm single vs 12mm M8 counterbore). A single
         * row can contain mixed types, so the diameter must travel with
         * each hole position, not the row. */
        const holeDia = pattern.holeType === 'm8-counterbore' ? 12 : 7;
        if (pattern.holeType === 'double-hole') {
          hasDoubleHole = true;
          const expanded = pattern.referenceEnd === 'end'
            ? basePositions.flatMap(pos => [pos, pos - 40])
            : basePositions.flatMap(pos => [pos, pos + 40]);
          allHolePositions.push(...expanded.map(pos => ({
            pos,
            holeType: pattern.holeType,
            slotLength: holeTypeMap.get(pattern.holeType)?.slotLength || 0,
            holeDiameter: holeDia,
          })));
        } else {
          allHolePositions.push(...basePositions.map(pos => ({
            pos,
            holeType: pattern.holeType,
            slotLength: holeTypeMap.get(pattern.holeType)?.slotLength || 0,
            holeDiameter: holeDia,
          })));
        }
      }
      
      const rowColor = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][slotIndex % 4];

      return {
        slotId: slot.slotId,
        label: `S${slot.slotId}`,
        xOffset: slotInfo?.xOffset ?? 0,
        position: slotInfo?.position ?? 0,
        width: slotInfo?.width ?? 0,
        holePositions: allHolePositions,
        rowColor,
        patterns: slot.patterns,
        isDoubleHole: hasDoubleHole,
      };
    });
  }, [slotPatternsSorted, slotMap, materialLength]);

  /* ── Validation ─────────────────────────────────────────────────
   * Check that the hole pattern fits within the material length
   * on BOTH ends. We add 20mm clearance — this accounts for the
   * drill bit's own length and prevents the machine from hitting
   * either end of the extrusion.
   *
   * WHY both ends: with the referenceEnd toggle, operators can place
   * holes near either end. A pattern measured from the far end could
   * place holes close to the 0mm end (e.g., "from end: 980" on a
   * 1000mm extrusion = position 20mm). We must check both sides.
   *
   * For double holes, the second hole is 40mm from the first. The
   * direction depends on referenceEnd — but since we resolve absolute
   * positions first, we just expand both positions and check them all. */
  const slotFitChecks = useMemo(() => {
    return slotPatternsSorted.map(slot => {
      let maxPos = 0;
      let minPos = materialLength;
      for (const pattern of slot.patterns) {
        for (let i = 0; i < pattern.count; i++) {
          /* Resolve absolute position — same logic as job useMemo.
           * We expand double holes inline rather than calling the job's
           * resolvePosition because the job object isn't available here
           * and we need both the primary and secondary hole positions. */
          const basePos = pattern.referenceEnd === 'end'
            ? materialLength - pattern.fromEnd - i * pattern.spacing
            : pattern.fromEnd + i * pattern.spacing;
          const positions = pattern.holeType === 'double-hole'
            ? pattern.referenceEnd === 'end'
              ? [basePos, basePos - 40]
              : [basePos, basePos + 40]
            : [basePos];
          for (const pos of positions) {
            if (pos > maxPos) maxPos = pos;
            if (pos < minPos) minPos = pos;
          }
        }
      }
      return {
        slotId: slot.slotId,
        /* clearanceEnd: material remaining after the last hole + 20mm.
         * Positive = fits, negative = overruns the far end. */
        clearanceEnd: materialLength - (maxPos + 20),
        /* clearanceStart: material before the first hole minus 20mm.
         * Positive = fits, negative = too close to the 0mm end. */
        clearanceStart: minPos - 20,
      };
    });
  }, [slotPatternsSorted, materialLength]);

  /* ── Derived validity flags ─────────────────────────────────────
   * WHY both checks: a pattern from the start could overrun the far
   * end, while a pattern from the end could be too close to the start.
   * We check both clearanceEnd (far end) and clearanceStart (0mm end)
   * so the UI can warn about either problem. */
  const fits = slotFitChecks.every(check => check.clearanceEnd >= 0 && check.clearanceStart >= 0);
  const firstOverrun = slotFitChecks.find(check => check.clearanceEnd < 0 || check.clearanceStart < 0);
  /* WHY two clearance values: with referenceEnd toggle, holes can sit
   * near either end. We track which end is tight separately so the UI
   * can show "from start" vs "from end" instead of guessing. */
  const minClearanceEnd = slotFitChecks.length > 0
    ? Math.min(...slotFitChecks.map(check => check.clearanceEnd))
    : Infinity;
  const minClearanceStart = slotFitChecks.length > 0
    ? Math.min(...slotFitChecks.map(check => check.clearanceStart))
    : Infinity;
  const minClearance = Math.min(minClearanceEnd, minClearanceStart);
  /* Determine which end is tight — used for the warning message so
   * operators know which side of the extrusion needs attention. */
  const tightEnd = minClearanceEnd <= minClearanceStart ? 'end' : 'start';
  const canDownload = fits && hasOrderNumber && !isGcodeEmpty && slotPatternsSorted.length > 0;

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
    const STORAGE_KEY = 'drilling-machine-ui-state-v3';
    const defaultProfile = filteredProfiles.find(p => p.id === '40-4040') || filteredProfiles[0];
    const defaultFace = defaultProfile.faces[0];
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setProfileId(defaultProfile.id);
    setMaterialLength(1000);
    setOrderNumber('');
    setSelectedFaceIndex(0);
    setSlotPatterns([{ slotId: defaultFace.slots[0].id, patterns: [{ id: 'reset-default', holeType: 'single-hole', fromEnd: 20, count: 1, spacing: 0, referenceEnd: 'start' }] }]);
    setSlotToAdd(defaultFace.slots[1] ? String(defaultFace.slots[1].id) : '');
    setSaveMessage('');
    setRepetitions(1);
  };

  return {
    hasOrderNumber,
    job,
    gcode,
    isGcodeEmpty,
    vizRows,
    slotFitChecks,
    fits,
    firstOverrun,
    minClearance,
    tightEnd,
    canDownload,
    handleSaveToDrive,
    handleResetJob,
  };
}
