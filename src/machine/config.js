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
      {
        id: 'face1', label: 'Face 1 (40mm side)', width: 40, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 (40mm side)', width: 40, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25 },
        ]
      },
    ],
  },
  {
    id: '20-2060',
    name: '20×60',
    series: 20,
    width: 20,
    height: 60,
    faces: [
      {
        id: 'face1', label: 'Face 1 (60mm side)', width: 60, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
          { id: 3, position: 50, width: 6.25 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 (60mm side)', width: 60, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
          { id: 3, position: 50, width: 6.25 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25 },
        ]
      },
    ],
  },
  {
    id: '20-2080',
    name: '20×80',
    series: 20,
    width: 20,
    height: 80,
    faces: [
      {
        id: 'face1', label: 'Face 1 (80mm side)', width: 80, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
          { id: 3, position: 50, width: 6.25 },
          { id: 4, position: 70, width: 6.25 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 (80mm side)', width: 80, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
          { id: 3, position: 50, width: 6.25 },
          { id: 4, position: 70, width: 6.25 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25 },
        ]
      },
    ],
  },
  {
    id: '20-cbeam',
    name: 'C-Beam 40×80',
    series: 20,
    width: 40,
    height: 80,
    faces: [
      {
        id: 'face1', label: 'Face 1 (80mm side)', width: 80, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
          { id: 3, position: 50, width: 6.25 },
          { id: 4, position: 70, width: 6.25 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 (40mm side)', width: 40, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 (80mm side — outer slots only)', width: 80, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 4, position: 70, width: 6.25 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 (40mm side)', width: 40, slots: [
          { id: 1, position: 10, width: 6.25 },
          { id: 2, position: 30, width: 6.25 },
        ]
      },
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
      { id: 'face1', label: 'Face 1 — S1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8 }] },
      { id: 'face2', label: 'Face 2 — S1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8 }] },
      { id: 'face3', label: 'Face 3 — S1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8 }] },
      { id: 'face4', label: 'Face 4 — S1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8 }] },
    ],
  },
  {
    id: '40-4080',
    name: '40×80',
    series: 40,
    width: 40,
    height: 80,
    faces: [
      {
        id: 'face1', label: 'Face 1 — S1 S2 (80mm)', width: 80, slots: [
          { id: 1, position: 20, width: 8 },
          { id: 2, position: 60, width: 8 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 — S1 (40mm)', width: 40, slots: [
          { id: 1, position: 20, width: 8 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 — S1 S2 (80mm)', width: 80, slots: [
          { id: 1, position: 20, width: 8 },
          { id: 2, position: 60, width: 8 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 — S1 (40mm)', width: 40, slots: [
          { id: 1, position: 20, width: 8 },
        ]
      },
    ],
  },
];

/* ────────────────────────────────────────────
   Feature toggle — simple vs advanced mode
   Simple = 40-series only with Patch's macros
   Advanced = all profiles, all hole types
   ──────────────────────────────────────────── */
export const FEATURE_CONFIG = {
  simple: {
    profiles: ['40-4040', '40-4080'],
    holeTypes: ['single-hole', 'double-hole', 'slotted-hole', 'm8-counterbore', 'central-connector', 'anchor-fast'],
  },
  advanced: {
    profiles: EXTRUSION_PROFILES.map(p => p.id),
    holeTypes: ['single-hole', 'double-hole', 'slotted-hole', 'm8-counterbore', 'central-connector', 'anchor-fast'],
  },
};

/* ────────────────────────────────────────────
   Hole types — semantic IDs matching Patch's features
   maxSlots: limits which faces can use this hole type
   ──────────────────────────────────────────── */
export const HOLE_TYPES = [
  { id: 'single-hole', label: 'Single Hole (7mm)', description: 'One hole per position', minSlot: 6, maxSlots: 99 },
  { id: 'double-hole', label: 'Double Hole (7mm)', description: 'Two holes, 40mm apart, across both slots', minSlot: 6, maxSlots: 2 },
  { id: 'slotted-hole', label: 'Slot (7mm)', description: 'Elongated slot', minSlot: 6, maxSlots: 99 },
  { id: 'm8-counterbore', label: 'Counterbore (M8)', description: 'Single counterbore hole', minSlot: 6, maxSlots: 99 },
  { id: 'central-connector', label: 'Central Connector', description: 'Connector feature', minSlot: 6, maxSlots: 99 },
  { id: 'anchor-fast', label: 'Anchor Fast', description: 'Anchor feature', minSlot: 6, maxSlots: 99 },
];

/* ────────────────────────────────────────────
   SKU mapping — product codes for each hole type
   Used in G-code header and filenames
   ──────────────────────────────────────────── */
export const HOLE_TYPE_SKUS = {
  'single-hole': { sku: 'HARD-40S-4040-END-FAST-A', desc: '7mm hole' },
  'double-hole': { sku: 'HARD-40S-4080-END-FAST-A', desc: '2x 7mm hole - 40mm apart' },
  'slotted-hole': { sku: 'HARD-40S-4040-END-FAST-A', desc: '7mm slot' },
  'm8-counterbore': { sku: 'BOLT-M8-CAP', desc: 'M8 counterbore' },
  'central-connector': { sku: 'HARD-40S-CENTRAL-CONNECTOR', desc: 'central connector' },
  'anchor-fast': { sku: 'HARD-40S-ANCHOR-FAST', desc: 'anchor fast' },
};

/* ────────────────────────────────────────────
   Feature Macro P-numbers — Patch's actual table
   Slot-aware: slot1 = P41xx, slot2 = P42xx
   ──────────────────────────────────────────── */
export const MACRO_CALLS = {
  'single-hole': {
    slot1: { p: '4110', comment: 'F1S1 Single hole (7mm)' },
    slot2: { p: '4210', comment: 'F1S2 Single hole (7mm)' },
  },
  'double-hole': {
    slot1: { p: '4111', comment: 'F1S1 Double hole (7mm)' },
    slot2: { p: '4211', comment: 'F1S2 Double hole (7mm)' },
  },
  'slotted-hole': {
    slot1: { p: '4112', comment: 'F1S1 Slotted hole (7mm)' },
    slot2: { p: '4212', comment: 'F1S2 Slotted hole (7mm)' },
  },
  'm8-counterbore': {
    slot1: { p: '4108', comment: 'F1S1 M8 Counterbore' },
    slot2: { p: '4208', comment: 'F1S2 M8 Counterbore' },
  },
  'central-connector': {
    slot1: { p: '4150', comment: 'F1S1 Central Connector' },
    slot2: { p: '4250', comment: 'F1S2 Central Connector' },
  },
  'anchor-fast': {
    slot1: { p: '4151', comment: 'F1S1 Anchor Fast' },
    slot2: { p: '4251', comment: 'F1S2 Anchor Fast' },
  },
};

/* ────────────────────────────────────────────
   Machine defaults
   ──────────────────────────────────────────── */
export const MACHINE_CONFIG = {
  spindleRPM: 24000,
  safeZ: 60,
  featureZ: 60,
  footerSafeZ: 60,
  spindleWaitMs: 4,
  defaultMaterialLength: 1000,
  defaultHoleCount: 1,
  defaultFromEnd: 20,
  defaultSpacing: 50,
};
