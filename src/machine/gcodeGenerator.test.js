import { describe, it, expect } from 'vitest';
import { generateGcode } from './gcodeGenerator';

describe('G-code Generator', () => {
  const mockJob = {
    name: 'test-job',
    materialLength: 1000,
    operations: [
      {
        profile: '40×40',
        face: 'Top (40mm)',
        slot: 1,
        slot_width_mm: 8,
        holes: [
          { step: 1, holeType: 'single-hole', distance_from_end_mm: 20 },
          { step: 2, holeType: 'single-hole', distance_from_end_mm: 70 },
          { step: 3, holeType: 'single-hole', distance_from_end_mm: 120 },
        ],
      },
      {
        profile: '40×80',
        face: 'Right (80mm)',
        slot: 1,
        slot_width_mm: 8,
        holes: [
          { step: 1, holeType: 'm8-counterbore', distance_from_end_mm: 50 },
        ],
      },
    ],
  };

  it('generates a header with job name', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('test-job');
    expect(gcode).toContain('Material length: 1000mm');
    expect(gcode).toContain('Total operations: 2');
  });

  it('includes custom header block with 24000 RPM', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('M9                          ; Coolant off');
    expect(gcode).toContain('G17                         ; Set XY plane');
    expect(gcode).toContain('G21                         ; Set metric');
    expect(gcode).toContain('S24000 M3                   ; Start spindle @ 24000 RPM');
    expect(gcode).toContain('G10 L20 P2 X0 Y0 Z60        ; Set G55 work offset');
  });

  it('uses M98 P calls with Patch P-numbers', () => {
    const gcode = generateGcode(mockJob);
    // single-hole slot1 = P4110, m8-counterbore slot1 = P4108
    expect(gcode).toContain('M98 P4110');
    expect(gcode).toContain('M98 P4108');
    expect(gcode).not.toContain('M98 P1000');
    expect(gcode).not.toContain('O1000');
  });

  it('positions each hole at the right Y coordinate', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('Y20.0');
    expect(gcode).toContain('Y70.0');
    expect(gcode).toContain('Y120.0');
    expect(gcode).toContain('Y50.0');
  });

  it('sets G56 at each feature position', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('G10 L20 P3 X0 Y0 Z60      ; Set G56 at this feature');
  });

  it('has operation section comments', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('40×40');
    expect(gcode).toContain('40×80');
  });

  it('uses X0 for slot 1 and X-60 for slot 2', () => {
    const job = {
      name: 'slot-test',
      materialLength: 1000,
      operations: [
        {
          profile: '40×80',
          face: 'F1',
          slot: 1,
          slot_width_mm: 8,
          holes: [{ step: 1, holeType: 'single-hole', distance_from_end_mm: 20 }],
        },
        {
          profile: '40×80',
          face: 'F1',
          slot: 2,
          slot_width_mm: 8,
          holes: [{ step: 1, holeType: 'single-hole', distance_from_end_mm: 20 }],
        },
      ],
    };
    const gcode = generateGcode(job);
    // Slot 1 uses X0, slot 2 uses X-60
    expect(gcode).toContain('G55 G0 X0 Y20.0');
    expect(gcode).toContain('G55 G0 X-60 Y20.0');
  });

  it('uses correct P-numbers for slot 2', () => {
    const job = {
      name: 'slot2-test',
      materialLength: 1000,
      operations: [
        {
          profile: '40×80',
          face: 'F1',
          slot: 2,
          slot_width_mm: 8,
          holes: [{ step: 1, holeType: 'single-hole', distance_from_end_mm: 20 }],
        },
      ],
    };
    const gcode = generateGcode(job);
    // single-hole slot2 = P4210
    expect(gcode).toContain('M98 P4210');
  });

  it('finishes with M99 subroutine return', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('G54 G0 Z60                  ; Safe Z in machine coords');
    expect(gcode).toContain('M5                          ; Spindle off');
    expect(gcode).toContain('G54 G0 X0 Y1050');
    expect(gcode).toContain('; Return past end of beam');
    expect(gcode).toContain('M99                         ; Subroutine return');
    expect(gcode).not.toContain('M30');
  });

  it('handles empty operations gracefully', () => {
    const gcode = generateGcode({ name: 'empty', materialLength: 500, operations: [] });
    expect(gcode).toContain('empty');
    expect(gcode).toContain('M99');
    expect(gcode).not.toContain('M98 P');
  });

  it('handles all 40-series hole types', () => {
    const job = {
      name: 'all-types',
      materialLength: 500,
      operations: [{
        profile: '40×40',
        face: 'Top',
        slot: 1,
        slot_width_mm: 8,
        holes: [
          { step: 1, holeType: 'single-hole', distance_from_end_mm: 10 },
          { step: 2, holeType: 'double-hole', distance_from_end_mm: 50 },
          { step: 3, holeType: 'slotted-hole', distance_from_end_mm: 90 },
          { step: 4, holeType: 'm8-counterbore', distance_from_end_mm: 130 },
          { step: 5, holeType: 'central-connector', distance_from_end_mm: 170 },
          { step: 6, holeType: 'anchor-fast', distance_from_end_mm: 210 },
        ],
      }],
    };
    const gcode = generateGcode(job);
    expect(gcode).toContain('M98 P4110'); // single-hole slot1
    expect(gcode).toContain('M98 P4111'); // double-hole slot1
    expect(gcode).toContain('M98 P4112'); // slotted-hole slot1
    expect(gcode).toContain('M98 P4108'); // m8-counterbore slot1
    expect(gcode).toContain('M98 P4150'); // central-connector slot1
    expect(gcode).toContain('M98 P4151'); // anchor-fast slot1
  });
});
