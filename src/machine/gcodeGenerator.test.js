import { describe, it, expect } from 'vitest';
import { generateGcode } from './gcodeGenerator';

describe('G-code Generator', () => {
  const mockJob = {
    name: 'test-job',
    materialLength: 1000,
    operations: [
      {
        profile: '20×40',
        face: 'Top (40mm)',
        slot: 1,
        slot_width_mm: 6,
        holes: [
          { step: 1, holeType: 'hole5', distance_from_end_mm: 20 },
          { step: 2, holeType: 'hole5', distance_from_end_mm: 70 },
          { step: 3, holeType: 'hole5', distance_from_end_mm: 120 },
        ],
      },
      {
        profile: '40×40',
        face: 'Right (40mm)',
        slot: 1,
        slot_width_mm: 8,
        holes: [
          { step: 1, holeType: 'hole12', distance_from_end_mm: 50 },
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

  it('includes custom header block', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('M9                          ; Coolant off');
    expect(gcode).toContain('G17                         ; Set XY plane');
    expect(gcode).toContain('G21                         ; Set metric');
    expect(gcode).toContain('S19200 M3                   ; Start spindle @ 19200 RPM');
    expect(gcode).toContain('G10 L20 P2 X0 Y0 Z60        ; Set G55 work offset');
  });

  it('uses M98 P calls for feature macros', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('M98 P1000');
    expect(gcode).toContain('M98 P1003');
    expect(gcode).not.toContain('O1000');
    expect(gcode).not.toContain('O1001');
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
    expect(gcode).toContain('20×40');
    expect(gcode).toContain('40×40');
  });

  it('finishes with custom footer block', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('G54 G0 Z55                  ; Safe Z in machine coords');
    expect(gcode).toContain('M5                          ; Spindle off');
    expect(gcode).toContain('G54 G0 X0 Y0                ; Return to machine zero');
    expect(gcode).toContain('M30                         ; End of program');
  });

  it('handles empty operations gracefully', () => {
    const gcode = generateGcode({ name: 'empty', materialLength: 500, operations: [] });
    expect(gcode).toContain('empty');
    expect(gcode).toContain('M30');
    expect(gcode).not.toContain('M98 P');
  });

  it('handles all hole types', () => {
    const job = {
      name: 'all-types',
      materialLength: 500,
      operations: [{
        profile: '30×30',
        face: 'Top',
        slot: 1,
        slot_width_mm: 8,
        holes: [
          { step: 1, holeType: 'hole5', distance_from_end_mm: 10 },
          { step: 2, holeType: 'slot5', distance_from_end_mm: 50 },
          { step: 3, holeType: 'hole8', distance_from_end_mm: 90 },
          { step: 4, holeType: 'hole12', distance_from_end_mm: 130 },
        ],
      }],
    };
    const gcode = generateGcode(job);
    expect(gcode).toContain('M98 P1000');
    expect(gcode).toContain('M98 P1001');
    expect(gcode).toContain('M98 P1002');
    expect(gcode).toContain('M98 P1003');
  });
});
