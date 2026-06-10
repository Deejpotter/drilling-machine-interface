/* ────────────────────────────────────────────
   G-code generator — Real Patch controller format
   Produces a standalone drilling script matching
   the actual machine's G-code structure.
   ──────────────────────────────────────────── */

import { MACRO_CALLS, MACHINE_CONFIG } from './config.js';

/**
 * Generate custom G-code header
 */
function generateHeader(job, lines) {
  const nc = (s) => lines.push(s);
  const date = new Date().toLocaleString();

  nc(`; ──────────────────────────────────────`);
  nc(`;  ${job.name}`);
  nc(`;  Generated: ${date}`);
  nc(`;  Material length: ${job.materialLength}mm`);
  nc(`;  Total operations: ${job.operations.length}`);
  nc(`; ──────────────────────────────────────`);
  nc(``);
  nc(`M9                          ; Coolant off`);
  nc(`G17                         ; Set XY plane`);
  nc(`G21                         ; Set metric`);
  nc(`G90                         ; Absolute positioning`);
  nc(`G54 G0 Z${MACHINE_CONFIG.safeZ}                  ; Go to safe Z in G54`);
  nc(`G54 G0 X0 Y0                ; Go to X0 Y0 in G54`);
  nc(`; T1 M6                     ; Tool change (uncomment if needed)`);
  nc(`S${MACHINE_CONFIG.spindleRPM} M3                   ; Start spindle @ ${MACHINE_CONFIG.spindleRPM} RPM`);
  nc(`G54 G0 Z${MACHINE_CONFIG.safeZ}                  ; Safe Z`);
  nc(`G10 L20 P2 X0 Y0 Z${MACHINE_CONFIG.safeZ}        ; Set G55 work offset`);
  nc(`G4 P${MACHINE_CONFIG.spindleWaitMs}                       ; Wait for spindle to reach speed`);
  nc(``);
}

/**
 * Generate G-code for moving to a hole position
 * @param {number} xPosition - X offset (0 for slot 1, -60 for slot 2)
 * @param {number} yPosition - Y distance from end
 * @param {string[]} lines - G-code output lines
 */
function moveToHole(xPosition, yPosition, lines) {
  const nc = (s) => lines.push(s);
  nc(`G55 G0 Z${MACHINE_CONFIG.safeZ}                ; Safe Z in G55`);
  nc(`G55 G0 X${xPosition} Y${yPosition.toFixed(1)}   ; Move to hole position`);
}

/**
 * Generate G-code for setting work offset and drilling a hole
 */
function drillHole(macro, lines) {
  const nc = (s) => lines.push(s);
  nc(`G10 L20 P3 X0 Y0 Z${MACHINE_CONFIG.featureZ}      ; Set G56 at this feature`);
  nc(`M98 P${macro.p}            ; Call feature macro — ${macro.comment}`);
  nc(``);
}

/**
 * Generate G-code footer
 * M99 (subroutine return), not M30 (program end)
 * Y returns to beam length + 50mm
 */
function generateFooter(job, lines) {
  const nc = (s) => lines.push(s);
  nc(`G54 G0 Z${MACHINE_CONFIG.footerSafeZ}                  ; Safe Z in machine coords`);
  nc(`M5                          ; Spindle off`);
  nc(`G54 G0 X0 Y${job.materialLength + 50}                ; Return past end of beam`);
  nc(`M99                         ; Subroutine return`);
  nc(``);
  nc(`; ──────────────────────────────────────`);
  nc(`;  End of ${job.name}`);
  nc(`; ──────────────────────────────────────`);
}

/**
 * @param {import('./constants').GcodeJob} job
 * @returns {string} full G-code script
 */
export function generateGcode(job) {
  const lines = [];

  // ──────────────────────────────────────
  // 1. Setup — Custom G-code header
  // ──────────────────────────────────────
  generateHeader(job, lines);

  // ──────────────────────────────────────
  // 2. Process each operation (one face/slot)
  // ──────────────────────────────────────
  for (const op of job.operations) {
    const { profile, face, holes } = op;
    const slotTag = op.slot ? ` · S${op.slot}` : '';
    lines.push(`; ─── ${profile} → ${face}${slotTag} · ${holes.length} holes ───`);
    lines.push(`;  Slot width: ${op.slot_width_mm}mm`);
    lines.push(``);

    // Slot-specific X offset: slot 1 = X0, slot 2 = X-60 (60mm slot-to-slot on 40×80)
    const slotXOffset = op.slot === 2 ? -60 : 0;

    // ──────────────────────────────────────
    // 3. For each hole: move, set offset, drill
    // ──────────────────────────────────────
    for (const hole of holes) {
      const macroSet = MACRO_CALLS[hole.holeType];
      if (!macroSet) continue;
      // Pick slot1 or slot2 P-number based on which slot we're drilling
      const macro = op.slot === 2 ? macroSet.slot2 : macroSet.slot1;
      if (!macro) continue;
      const y = hole.distance_from_end_mm;

      // Move to hole position with slot-specific X offset
      moveToHole(slotXOffset, y, lines);

      // Set G56 and call macro
      drillHole(macro, lines);
    }
  }

  // ──────────────────────────────────────
  // 4. End — Custom G-code footer
  // ──────────────────────────────────────
  generateFooter(job, lines);

  return lines.join('\n');
}

function buildBaseFilename(job) {
  const baseName = job.name.replace(/[^a-z0-9]+/gi, '_');
  const isFallbackJob = /^drill_job_/i.test(baseName);
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 17);
  return isFallbackJob ? `${baseName}_${stamp}` : baseName;
}

/**
 * Generate g-code and download as .nc file
 * @param {import('./constants').GcodeJob} job
 */
export function downloadGcode(job) {
  const gcode = generateGcode(job);
  const blob = new Blob([gcode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${buildBaseFilename(job)}.nc`;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Save g-code using system file picker (e.g. choose Z: drive)
 * @param {import('./constants').GcodeJob} job
 */
export async function saveGcodeWithPicker(job) {
  if (typeof window === 'undefined' || typeof window.showSaveFilePicker !== 'function') {
    const err = new Error('File picker API unavailable');
    err.code = 'NO_FILE_PICKER_API';
    throw err;
  }

  const gcode = generateGcode(job);
  const handle = await window.showSaveFilePicker({
    suggestedName: `${buildBaseFilename(job)}.nc`,
    types: [{
      description: 'NC files',
      accept: { 'text/plain': ['.nc'] },
    }],
  });
  const writable = await handle.createWritable();
  await writable.write(gcode);
  await writable.close();
  return handle.name || `${buildBaseFilename(job)}.nc`;
}
