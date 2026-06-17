/* -----------------------------------------------------------------
   G-code generator — Patch's actual controller format

   This produces .nc files that are loaded onto the machine and run
   as standalone programs, ending with M30 (program end + rewind).

   The G-code structure follows Patch's spec from 2026-06-10:
   1. Header: set up machine state (coolant, metric, spindle, work offsets)
   2. Per-hole: move to position -> set G56 offset -> call feature macro
   3. Footer: safe Z, spindle off, return past beam end, M30

   Key conventions:
   - G54 = machine coordinates (safe Z, home position)
   - G55 = work offset for the current face (set via G10 L20 P2)
   - G56 = feature-level offset (set per hole via G10 L20 P3)
   - M98 P#### = call a pre-loaded macro on the machine controller
   - Slot 1 uses X0, slot 2 uses X40 (40mm slot-to-slot on 40x80)
   ----------------------------------------------------------------- */

import { MACRO_CALLS, MACHINE_CONFIG, HOLE_TYPE_SKUS } from './config.js';

/** Pad G-code to a fixed width so comments line up. */
const PAD = 30;
const g = (code, comment) => code.padEnd(PAD) + `; ${comment}`;

/**
 * Generate the G-code header.
 *
 * This initialises the machine state before drilling begins.
 * The header is the same for every job — only the job name and
 * material length vary. The tool change (T1 M6) is commented out
 * because the machine typically has the correct tool already loaded;
 * uncomment it if tool changes are needed.
 */
function generateHeader(job, lines) {
  const nc = (s) => lines.push(s);
  const date = new Date().toLocaleString();

  nc(`; --------------------------------------`);
  nc(``);
  nc(`;  Order: ${job.name}`);
  nc(`;  Generated: ${date}`);
  nc(`;  Material length: ${job.materialLength}mm`);
  if (job.repetitions > 1) {
    nc(`;  Batch size: ${job.repetitions} repetitions`);
  }
  nc(`;  Total operations: ${job.operations.length}`);
  nc(`; --------------------------------------`);
  nc(``);

  // --- Setup ---
  nc(g('M9', 'Coolant off'));
  nc(g('G17', 'Set XY plane'));
  nc(g('G21', 'Set metric'));
  nc(g('G90', 'Absolute positioning'));
  nc(g(`G54 G0 Z${MACHINE_CONFIG.safeZ}`, 'Go to safe Z in G54'));
  nc(g('G54 G0 X0 Y0', 'Go to X0 Y0 in G54'));
  nc(g('; T1 M6', 'Tool change (uncomment if needed)'));
  nc(g(`S${MACHINE_CONFIG.spindleRPM} M3`, `Start spindle @ ${MACHINE_CONFIG.spindleRPM} RPM`));
  nc(g(`G54 G0 Z${MACHINE_CONFIG.safeZ}`, 'Safe Z'));
  nc(g(`G10 L20 P2 X0 Y0 Z${MACHINE_CONFIG.safeZ}`, 'Set G55 work offset'));
  nc(g(`G4 P${MACHINE_CONFIG.spindleWaitMs}`, 'Wait for spindle to reach speed'));
  nc(``);
}

/**
 * Move to a hole position in G55 coordinates.
 *
 * We move to safe Z first to avoid dragging the drill bit across
 * the workpiece during positioning. The X position is slot-specific:
 * slot 1 = X0, slot 2 = X-60 (60mm offset for 40×80 profiles).
 */
function moveToHole(xPosition, yPosition, lines) {
  const nc = (s) => lines.push(s);
  nc(g(`G55 G0 Z${MACHINE_CONFIG.safeZ}`, 'Safe Z in G55'));
  nc(g(`G55 G0 X${xPosition} Y${yPosition.toFixed(1)}`, 'Move to hole position'));
}

/**
 * Get the SKU description for a hole type at a given position.
 */
function skuDescription(holeType, position) {
  const skuInfo = HOLE_TYPE_SKUS[holeType];
  return skuInfo
    ? `${skuInfo.sku} (${skuInfo.desc} @ ${position}mm)`
    : MACRO_CALLS[holeType]?.slot1?.comment || 'Unknown feature';
}

/**
 * Set G56 at the feature position and call the macro.
 *
 * G10 L20 P3 sets the G56 work offset to the current position.
 * This tells the machine "this is where the feature starts" so the
 * macro can use relative coordinates internally. Then M98 P####
 * calls the pre-loaded macro that performs the actual drilling.
 */
function drillHole(macro, lines) {
  const nc = (s) => lines.push(s);
  nc(g(`G10 L20 P3 X0 Y0 Z${MACHINE_CONFIG.featureZ}`, 'Set G56 at this feature'));
  nc(g(`M98 P${macro.p}`, `Call feature macro — ${macro.comment}`));
  nc(``);
}

/**
 * Generate the G-code footer.
 *
 * We use M30 (program end + rewind) since these .nc files are loaded
 * onto the machine and run as standalone programs. The Y return goes
 * past the beam end by 50mm to ensure the drill bit clears the
 * workpiece before the next operation.
 */
function generateFooter(job, lines) {
  const nc = (s) => lines.push(s);
  nc(`; --- End ---`);
  nc(``);
  nc(g(`G54 G0 Z${MACHINE_CONFIG.footerSafeZ}`, 'Safe Z in machine coords'));
  nc(g('M5', 'Spindle off'));
  nc(g(`G54 G0 X0 Y${job.materialLength + 50}`, 'Return past end of beam'));
  nc(g('M30', 'Program end'));
  nc(``);
  nc(`; --------------------------------------`);
  nc(`;  End of ${job.name}`);
  nc(`; --------------------------------------`);
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

  // ----------------------------------------------------------------
  // 2. Process each operation (one face/slot)
  // ----------------------------------------------------------------
  lines.push(`; --- Operations ---`);
  lines.push(``);
  for (const op of job.operations) {
    const { profile, face, holes } = op;
    const slotTag = op.slot ? ` · S${op.slot}` : '';
    lines.push(`; --- ${profile} -> ${face}${slotTag} · ${holes.length} holes ---`);
    lines.push(`;  Slot width: ${op.slot_width_mm}mm`);
    lines.push(``);

    // Slot-specific X offset from config (e.g., 40×80: S1 = X0, S2 = X40)
    // Defined per-slot in the extrusion profile config so different
    // profiles can have different X coordinates for their slots.
    const slotXOffset = op.slotXOffset ?? 0;

    // ----------------------------------------------------------------
    // 3. For each hole: move, set offset, drill
    // ----------------------------------------------------------------
    for (const hole of holes) {
      /* Double-hole is handled by Patch as two separate single-hole
       * operations spaced 40mm apart. The data model already expands
       * the pattern into two distinct Y positions, so we just call
       * the single-hole macro (P4110/P4210) at each position. */
      const macroType = hole.holeType === 'double-hole' ? 'single-hole' : hole.holeType;
      const macroSet = MACRO_CALLS[macroType];
      if (!macroSet) continue;
      // Pick slot1 or slot2 P-number based on which slot we're drilling
      const macro = op.slot === 2 ? macroSet.slot2 : macroSet.slot1;
      if (!macro) continue;
      const y = hole.distance_from_end_mm;

      // SKU comment first — describes what's about to happen
      lines.push(`; ${skuDescription(hole.holeType, y)}`);

      // Move to hole position with slot-specific X offset
      moveToHole(slotXOffset, y, lines);

      // Set G56 and call macro
      drillHole(macro, lines);
    }
  }

  // ----------------------------------------------------------------
  // 4. End - Custom G-code footer
  // ----------------------------------------------------------------
  generateFooter(job, lines);

  return lines.join('\n');
}

/**
 * Build the base filename for the .nc file.
 *
 * The filename follows the naming convention:
 * OrderNumber-Profile_Pattern-F#-DDMMYY
 *
 * The _1 suffix indicates pattern number — future batch tracking
 * will increment this. We use ×→x replacement for filesystem safety.
 */
function buildBaseFilename(job) {
  const orderBase = job.name.replace(/[^a-z0-9]+/gi, '_');
  const profileBase = (job.profile || 'unknown').toLowerCase();
  const faceLabel = job.faceLabel || 'F1';
  const patternMod = job.patternCount > 1 ? `_${job.operationIndex + 1}` : '';
  const d = new Date();
  const dateStamp = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getFullYear()).slice(2)}`; // DDMMYY
  return `${orderBase}-${profileBase}${patternMod}-${faceLabel}-${dateStamp}`;
}

/**
 * Generate G-code and download as .nc file.
 *
 * This is the primary export method — creates a Blob URL and
 * triggers a browser download. The .nc extension is important
 * because the machine controller expects that file type.
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
 * Save G-code using system file picker (e.g., choose Z: drive).
 *
 * This uses the File System Access API (showSaveFilePicker) to let
 * operators save directly to a network drive or USB stick. Falls back
 * gracefully if the browser doesn't support it (e.g., Firefox).
 *
 * @throws {Error} with code 'NO_FILE_PICKER_API' if API unavailable
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
