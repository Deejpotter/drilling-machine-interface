/* ────────────────────────────────────────────
   Machine configuration
   Abstracts profiles, hole types, and macro mappings
   so they can be easily updated without code changes.
   ──────────────────────────────────────────── */

/* ────────────────────────────────────────────
   Machine configuration
   Abstracts profiles, hole types, and macro mappings
   so they can be easily updated without code changes.
   ──────────────────────────────────────────── */

/* ────────────────────────────────────────────
   Extrusion profiles with full dimensional data
   Each face has slots with positions (center from end)
   ──────────────────────────────────────────── */
export const EXTRUSION_PROFILES = [
  {
    id: '20-2020',
    name: '20×20',
    series: 20,
    width: 20,
    height: 20,
    faces: [
      { id: 'face1', label: 'Face 1 (20mm)', width: 20, slots: [{ id: 1, position: 10, width: 6.25 }] },
      { id: 'face2', label: 'Face 2 (20mm)', width: 20, slots: [{ id: 1, position: 10, width: 6.25 }] },
      { id: 'face3', label: 'Face 3 (20mm)', width: 20, slots: [{ id: 1, position: 10, width: 6.25 }] },
      { id: 'face4', label: 'Face 4 (20mm)', width: 20, slots: [{ id: 1, position: 10, width: 6.25 }] },
    ],
  },
  {
    id: '20-2040',
    name: '20×40',
    series: 20,
    width: 20,
    height: 40,
    faces: [
      { id: 'face1', label: 'Face 1 (40mm side)', width: 40, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
      ]},
      { id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
        { id: 1, position: 10, width: 6.25 },
      ]},
      { id: 'face3', label: 'Face 3 (40mm side)', width: 40, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
      ]},
      { id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
        { id: 1, position: 10, width: 6.25 },
      ]},
    ],
  },
  {
    id: '20-2060',
    name: '20×60',
    series: 20,
    width: 20,
    height: 60,
    faces: [
      { id: 'face1', label: 'Face 1 (60mm side)', width: 60, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
        { id: 3, position: 50, width: 6.25 },
      ]},
      { id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
        { id: 1, position: 10, width: 6.25 },
      ]},
      { id: 'face3', label: 'Face 3 (60mm side)', width: 60, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
        { id: 3, position: 50, width: 6.25 },
      ]},
      { id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
        { id: 1, position: 10, width: 6.25 },
      ]},
    ],
  },
  {
    id: '20-2080',
    name: '20×80',
    series: 20,
    width: 20,
    height: 80,
    faces: [
      { id: 'face1', label: 'Face 1 (80mm side)', width: 80, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
        { id: 3, position: 50, width: 6.25 },
        { id: 4, position: 70, width: 6.25 },
      ]},
      { id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
        { id: 1, position: 10, width: 6.25 },
      ]},
      { id: 'face3', label: 'Face 3 (80mm side)', width: 80, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
        { id: 3, position: 50, width: 6.25 },
        { id: 4, position: 70, width: 6.25 },
      ]},
      { id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
        { id: 1, position: 10, width: 6.25 },
      ]},
    ],
  },
  {
    id: '20-cbeam',
    name: 'C-Beam 40×80',
    series: 20,
    width: 40,
    height: 80,
    faces: [
      { id: 'face1', label: 'Face 1 (80mm side)', width: 80, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
        { id: 3, position: 50, width: 6.25 },
        { id: 4, position: 70, width: 6.25 },
      ]},
      { id: 'face2', label: 'Face 2 (40mm side)', width: 40, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
      ]},
      { id: 'face3', label: 'Face 3 (80mm side)', width: 80, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
        { id: 3, position: 50, width: 6.25 },
        { id: 4, position: 70, width: 6.25 },
      ]},
      { id: 'face4', label: 'Face 4 (40mm side)', width: 40, slots: [
        { id: 1, position: 10, width: 6.25 },
        { id: 2, position: 30, width: 6.25 },
      ]},
    ],
  },
  // 30-series (placeholder structure — update with actual dimensions)
  {
    id: '30-3030',
    name: '30×30',
    series: 30,
    width: 30,
    height: 30,
    faces: [
      { id: 'face1', label: 'Face 1 (30mm)', width: 30, slots: [{ id: 1, position: 15, width: 8 }] },
      { id: 'face2', label: 'Face 2 (30mm)', width: 30, slots: [{ id: 1, position: 15, width: 8 }] },
      { id: 'face3', label: 'Face 3 (30mm)', width: 30, slots: [{ id: 1, position: 15, width: 8 }] },
      { id: 'face4', label: 'Face 4 (30mm)', width: 30, slots: [{ id: 1, position: 15, width: 8 }] },
    ],
  },
  // 40-series (placeholder structure — update with actual dimensions)
  {
    id: '40-4040',
    name: '40×40',
    series: 40,
    width: 40,
    height: 40,
    faces: [
      { id: 'face1', label: 'Face 1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8 }] },
      { id: 'face2', label: 'Face 2 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8 }] },
      { id: 'face3', label: 'Face 3 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8 }] },
      { id: 'face4', label: 'Face 4 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8 }] },
    ],
  },
  {
    id: '40-4080',
    name: '40×80',
    series: 40,
    width: 40,
    height: 80,
    faces: [
      { id: 'face1', label: 'Face 1 (80mm side)', width: 80, slots: [
        { id: 1, position: 20, width: 8 },
        { id: 2, position: 60, width: 8 },
      ]},
      { id: 'face2', label: 'Face 2 (40mm side)', width: 40, slots: [
        { id: 1, position: 20, width: 8 },
      ]},
      { id: 'face3', label: 'Face 3 (80mm side)', width: 80, slots: [
        { id: 1, position: 20, width: 8 },
        { id: 2, position: 60, width: 8 },
      ]},
      { id: 'face4', label: 'Face 4 (40mm side)', width: 40, slots: [
        { id: 1, position: 20, width: 8 },
      ]},
    ],
  },
];

export const HOLE_TYPES = [
  { id: 'hole5', label: '5mm hole', minSlot: 6 },
  { id: 'slot5', label: '5mm slot', minSlot: 6 },
  { id: 'hole8', label: '8mm hole', minSlot: 6 },
  { id: 'hole12', label: '12mm hole', minSlot: 6 },
];

/* ────────────────────────────────────────────
   Feature Macro P-numbers (placeholders)
   Replace with actual values from Patch macro table
   ──────────────────────────────────────────── */
export const MACRO_CALLS = {
  hole5: { p: '1000', comment: '5mm hole' },
  slot5: { p: '1001', comment: '5mm slot' },
  hole8: { p: '1002', comment: '8mm hole' },
  hole12: { p: '1003', comment: '12mm hole' },
};

/* ────────────────────────────────────────────
   Machine defaults
   ──────────────────────────────────────────── */
export const MACHINE_CONFIG = {
  spindleRPM: 19200,
  safeZ: 60,
  featureZ: 60,
  footerSafeZ: 55,
  spindleWaitMs: 4,
  defaultMaterialLength: 1000,
  defaultHoleCount: 4,
  defaultFromEnd: 20,
  defaultSpacing: 50,
};
