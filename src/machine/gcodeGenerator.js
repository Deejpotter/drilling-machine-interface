/* ────────────────────────────────────────────
   G-code generator — Patch subroutine style
   Produces a standalone drilling script with
   references to standard Patch subroutines.

   Subroutines expected on the controller:
     O1000 — Through hole (G81 peck drill cycle)
     O1001 — Slot milling (G1 linear)
     O1002 — Offset hole (spot drill + peck)
     O1003 — M8 counterbore (G82)
   ──────────────────────────────────────────── */

const SUB_CALLS = {
  through: { sub: 'O1000', comment: 'Through hole drill (G81)' },
  slot5:   { sub: 'O1001', comment: '5mm slot mill (G1)' },
  offset:  { sub: 'O1002', comment: 'Offset hole (spot + peck)' },
  'cbore-m8': { sub: 'O1003', comment: 'M8 counterbore (G82)' },
};

/**
 * @param {import('./constants').GcodeJob} job
 * @returns {string} full G-code script
 */
export function generateGcode(job) {
  const lines = [];
  const nc = (s) => lines.push(s);

  const date = new Date().toLocaleString();

  nc(`; ──────────────────────────────────────`);
  nc(`;  ${job.name}`);
  nc(`;  Generated: ${date}`);
  nc(`;  Material length: ${job.materialLength}mm`);
  nc(`;  Total operations: ${job.operations.length}`);
  nc(`; ──────────────────────────────────────`);
  nc(``);
  nc(`G17 G21 G40 G49 G80 G90   ; Safe startup`);
  nc(`G91 G28 Z0                ; Tool to home`);
  nc(`G90                        ; Absolute mode`);
  nc(``);
  nc(`; ─── Tool call ───`);
  nc(`T1 M6                     ; Select tool`);
  nc(`S3000 M3                  ; Spindle on`);
  nc(`G0 X0 Y0 Z50              ; Move to safe Z`);
  nc(``);

  let opIndex = 0;
  for (const op of job.operations) {
    opIndex++;
    const { profile, face, holes } = op;
    nc(`; ─── ${profile} → ${face} · ${holes.length} holes ───`);
    nc(`;  Slot width: ${op.slot_width_mm}mm`);

    for (const hole of holes) {
      const sub = SUB_CALLS[hole.holeType];
      if (!sub) continue;
      const x = hole.distance_from_end_mm;
      nc(`G0 X${x.toFixed(1)} Y0 Z5    ; Hole ${hole.step} @ ${x.toFixed(1)}mm`);
      nc(`${sub.sub}                   ; ${sub.comment}`);
    }
    nc(``);
  }

  nc(`; ─── Finish ───`);
  nc(`G91 G28 Z0                ; Tool to home`);
  nc(`M5                         ; Spindle stop`);
  nc(`M30                        ; End`);
  nc(``);
  nc(`; ──────────────────────────────────────`);
  nc(`;  End of ${job.name}`);
  nc(`; ──────────────────────────────────────`);

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
  a.download = `${job.name.replace(/[^a-z0-9]+/gi, '_')}.nc`;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
