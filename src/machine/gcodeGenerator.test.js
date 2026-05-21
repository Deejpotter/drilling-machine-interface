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
          { step: 1, holeType: 'through', distance_from_end_mm: 20 },
          { step: 2, holeType: 'through', distance_from_end_mm: 70 },
          { step: 3, holeType: 'through', distance_from_end_mm: 120 },
        ],
      },
      {
        profile: '40×40',
        face: 'Right (40mm)',
        slot: 1,
        slot_width_mm: 8,
        holes: [
          { step: 1, holeType: 'cbore-m8', distance_from_end_mm: 50 },
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

  it('includes safe startup block', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('G17 G21 G40 G49 G80 G90');
    expect(gcode).toContain('T1 M6');
    expect(gcode).toContain('S3000 M3');
  });

  it('calls correct subroutines for each hole type', () => {
    const gcode = generateGcode(mockJob);
    // through holes → O1000
    expect(gcode).toContain('O1000');
    // counterbore → O1003
    expect(gcode).toContain('O1003');
    // should NOT contain slot or offset subs
    expect(gcode).not.toContain('O1001');
    expect(gcode).not.toContain('O1002');
  });

  it('positions each hole at the right X coordinate', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('X20.0');
    expect(gcode).toContain('X70.0');
    expect(gcode).toContain('X120.0');
    expect(gcode).toContain('X50.0');
  });

  it('has operation section comments', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('20×40');
    expect(gcode).toContain('40×40');
  });

  it('finishes with M30', () => {
    const gcode = generateGcode(mockJob);
    expect(gcode).toContain('M30');
  });

  it('handles empty operations gracefully', () => {
    const gcode = generateGcode({ name: 'empty', materialLength: 500, operations: [] });
    expect(gcode).toContain('empty');
    expect(gcode).toContain('M30');
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
          { step: 1, holeType: 'through', distance_from_end_mm: 10 },
          { step: 2, holeType: 'slot5', distance_from_end_mm: 50 },
          { step: 3, holeType: 'offset', distance_from_end_mm: 90 },
          { step: 4, holeType: 'cbore-m8', distance_from_end_mm: 130 },
        ],
      }],
    };
    const gcode = generateGcode(job);
    expect(gcode).toContain('O1000');
    expect(gcode).toContain('O1001');
    expect(gcode).toContain('O1002');
    expect(gcode).toContain('O1003');
  });
});
