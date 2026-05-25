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
 */
function moveToHole(yPosition, lines) {
  const nc = (s) => lines.push(s);
  nc(`G55 G0 Z${MACHINE_CONFIG.safeZ}                ; Safe Z in G55`);
  nc(`G55 G0 X0 Y${yPosition.toFixed(1)}   ; Move to hole Y position`);
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
 */
function generateFooter(job, lines) {
  const nc = (s) => lines.push(s);
  nc(`G54 G0 Z${MACHINE_CONFIG.footerSafeZ}                  ; Safe Z in machine coords`);
  nc(`M5                          ; Spindle off`);
  nc(`G54 G0 X0 Y0                ; Return to machine zero`);
  nc(`M30                         ; End of program`);
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

    // ──────────────────────────────────────
    // 3. For each hole: move, set offset, drill
    // ──────────────────────────────────────
    for (const hole of holes) {
      const macro = MACRO_CALLS[hole.holeType];
      if (!macro) continue;
      const y = hole.distance_from_end_mm;

      // Move to hole position
      moveToHole(y, lines);

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
  const baseName = job.name.replace(/[^a-z0-9]+/gi, '_');
  const isFallbackJob = /^drill_job_/i.test(baseName);
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 17);
  a.download = `${isFallbackJob ? `${baseName}_${stamp}` : baseName}.nc`;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
