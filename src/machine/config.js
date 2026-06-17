/* ────────────────────────────────────────────
   Machine configuration

   This file is the single source of truth for all machine parameters.
   When Patch changes a macro number, adds a new profile, or adjusts
   spindle speed, this is the only file that needs updating.

   The structure is deliberately data-driven — no logic, no conditionals.
   This makes it easy to verify correctness by inspection and prevents
   bugs from sneaking in through complex update paths.
   ──────────────────────────────────────────── */

/* ────────────────────────────────────────────
   Extrusion profiles

   Each profile represents a Maker Store aluminium extrusion type.
   The dimensional data (width, height, slot positions) is used for:
   1. Validation — ensuring hole patterns fit within the face width
   2. Visualisation — scaling the SVG diagram to match proportions
   3. G-code — determining slot-to-slot X offsets (e.g., 60mm on 40×80)

   In simple mode, only 40-series profiles are shown because Patch's
   subroutines are written for those profiles. The 20/30-series data
   stays here for future use — it's filtered at the UI level, not deleted.

   Slot positions are "centre from end" — the distance from the
   extrusion end to the centre of the slot channel. This matters
   because the drilling machine positions relative to the end.

   `xOffset` is the G-code X coordinate Patch uses for that slot
   (40-series: slot 1 = X0, slot 2 = X40). This is per-profile config
   so other series can override when their subroutines are written.
   ──────────────────────────────────────────── */
export const EXTRUSION_PROFILES = [
  {
    id: '20-2020',
    name: '20×20',
    series: 20,
    width: 20,
    height: 20,
    faces: [
      { id: 'face1', label: 'Face 1 (20mm)', width: 20, slots: [{ id: 1, position: 10, width: 6.25, xOffset: 0 }] },
      { id: 'face2', label: 'Face 2 (20mm)', width: 20, slots: [{ id: 1, position: 10, width: 6.25, xOffset: 0 }] },
      { id: 'face3', label: 'Face 3 (20mm)', width: 20, slots: [{ id: 1, position: 10, width: 6.25, xOffset: 0 }] },
      { id: 'face4', label: 'Face 4 (20mm)', width: 20, slots: [{ id: 1, position: 10, width: 6.25, xOffset: 0 }] },
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
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 (40mm side)', width: 40, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
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
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
          { id: 3, position: 50, width: 6.25, xOffset: 40 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 (60mm side)', width: 60, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
          { id: 3, position: 50, width: 6.25, xOffset: 40 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
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
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
          { id: 3, position: 50, width: 6.25, xOffset: 40 },
          { id: 4, position: 70, width: 6.25, xOffset: 60 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 (80mm side)', width: 80, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
          { id: 3, position: 50, width: 6.25, xOffset: 40 },
          { id: 4, position: 70, width: 6.25, xOffset: 60 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 (20mm side)', width: 20, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
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
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
          { id: 3, position: 50, width: 6.25, xOffset: 40 },
          { id: 4, position: 70, width: 6.25, xOffset: 60 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 (40mm side)', width: 40, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 (80mm side — outer slots only)', width: 80, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 4, position: 70, width: 6.25, xOffset: 60 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 (40mm side)', width: 40, slots: [
          { id: 1, position: 10, width: 6.25, xOffset: 0 },
          { id: 2, position: 30, width: 6.25, xOffset: 20 },
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
      { id: 'face1', label: 'Face 1 (30mm)', width: 30, slots: [{ id: 1, position: 15, width: 8, xOffset: 0 }] },
      { id: 'face2', label: 'Face 2 (30mm)', width: 30, slots: [{ id: 1, position: 15, width: 8, xOffset: 0 }] },
      { id: 'face3', label: 'Face 3 (30mm)', width: 30, slots: [{ id: 1, position: 15, width: 8, xOffset: 0 }] },
      { id: 'face4', label: 'Face 4 (30mm)', width: 30, slots: [{ id: 1, position: 15, width: 8, xOffset: 0 }] },
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
      { id: 'face1', label: 'Face 1 — S1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8, xOffset: 0 }] },
      { id: 'face2', label: 'Face 2 — S1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8, xOffset: 0 }] },
      { id: 'face3', label: 'Face 3 — S1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8, xOffset: 0 }] },
      { id: 'face4', label: 'Face 4 — S1 (40mm)', width: 40, slots: [{ id: 1, position: 20, width: 8, xOffset: 0 }] },
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
          { id: 1, position: 20, width: 8, xOffset: 0 },
          { id: 2, position: 60, width: 8, xOffset: 40 },
        ]
      },
      {
        id: 'face2', label: 'Face 2 — S1 (40mm)', width: 40, slots: [
          { id: 1, position: 20, width: 8, xOffset: 0 },
        ]
      },
      {
        id: 'face3', label: 'Face 3 — S1 S2 (80mm)', width: 80, slots: [
          { id: 1, position: 20, width: 8, xOffset: 0 },
          { id: 2, position: 60, width: 8, xOffset: 40 },
        ]
      },
      {
        id: 'face4', label: 'Face 4 — S1 (40mm)', width: 40, slots: [
          { id: 1, position: 20, width: 8, xOffset: 0 },
        ]
      },
    ],
  },
];

/* ────────────────────────────────────────────
   Feature toggle — simple vs advanced mode

   Simple mode exists because Patch's subroutines and G-code format
   are written for 40-series extrusions only. The other profiles
   exist in the tooling but aren't needed for the current production run.

   This config drives the entire filtering pipeline — profile selector,
   face selector, hole type dropdown, and slot width validation all
   read from here. Changing a single array here updates the whole UI.

   Advanced mode shows everything. It's the "escape hatch" for when
   20-series comes online or new hole types are added — just update
   these arrays, no code changes needed.
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
   Hole types

   Each hole type maps to a physical feature on the extrusion.
   The labels show Maker Store SKUs so operators can cross-reference
   with the hardware they're installing.

   Constraints:
   - minSlot: minimum slot width (mm) required for this hole type
   - maxSlots: maximum number of slots a face can have to use this type
     (e.g., double-hole is limited to 2 slots because it spans both)

   All holes are 7mm diameter - the differentiation is pattern type,
   not hole size. This is because the physical drilling bit is the
   same; the controller macro determines the pattern (single, double,
   slotted, counterbore).

   Central Connector and Anchor Fast are NOT in this list - they are
   fixed-position end fittings (16mm and 18mm from end) and are
   toggled separately per slot via the endFittings state, not added
   as repeatable patterns.
   ----------------------------------------------------------------- */
export const HOLE_TYPES = [
  { id: 'single-hole', label: 'HARD-40S-4040-END-FAST-A (7mm hole)', description: 'One hole per position', minSlot: 6, maxSlots: 99 },
  { id: 'double-hole', label: 'HARD-40S-4080-END-FAST-A (2x 7mm hole - 40mm apart)', description: 'Two holes, 40mm apart, across both slots', minSlot: 6, maxSlots: 2 },
  { id: 'slotted-hole', label: 'HARD-40S-4040-END-FAST-A (7mm slot)', description: 'Elongated slot', minSlot: 6, maxSlots: 99, slotLength: 50 },
  { id: 'm8-counterbore', label: 'BOLT-M8-CAP (M8 counterbore)', description: 'Single counterbore hole', minSlot: 6, maxSlots: 99 },
];

/* ────────────────────────────────────────────
   SKU mapping

   Maps hole type IDs to Maker Store product codes. Used in:
   1. G-code header — operators see the SKU at the top of the file
   2. G-code comments — each macro call includes the SKU description
   3. File naming — future use for SKU-based filenames

   This is a separate lookup from HOLE_TYPES because the SKU format
   is different from the display label (e.g., label includes
   parenthetical description, SKU is just the product code).
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

   These are the real P-numbers from Patch's controller. Each
   hole type has two macros: one for slot 1 (P41xx) and one for
   slot 2 (P42xx). The X-offset differs between slots:
   - Slot 1: X0
   - Slot 2: X-60 (60mm slot-to-slot distance on 40×80)

   The comment field is used in G-code output for human readability.
   Operators and Patch can cross-reference the generated .nc files
   against the macro table to verify correctness.
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

   These are the initial values for a new job. They're configurable
   at runtime through the UI but start here as sensible defaults.

   Why these values?
   - spindleRPM 24000: the recommended speed for 7mm aluminium drilling
   - safeZ 60: high enough to clear clamps and fixtures
   - featureZ 60: where the macro starts its descent
   - footerSafeZ 60: safe height for the final Y return
   - spindleWaitMs 4: 4 seconds for spindle to reach full RPM
   - defaultMaterialLength 1000: common beam length (1m)
   - defaultFromEnd 20: first hole typically 20mm from end
   - defaultSpacing 50: common hole spacing for end fixtures
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
