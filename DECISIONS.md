# Drilling Machine Interface — Design Decisions

## Session: 2026-06-10

### Summary

Spoke with Patch about the drilling machine interface. The app is currently overdeveloped for the immediate needs. We only need to support 40-series extrusions with the specific subroutines Patch has defined. The full multi-profile/feature system should be preserved for later, behind an options toggle.

---

### Key Decisions

#### 1. Scope reduction — 40-series only for now

**What changed:** Only 40-series extrusion profiles (40×40, 40×80) will be active in the default/limited mode. All 20-series, 30-series, and C-Beam profiles move behind an "advanced features" toggle.

**Why:** Patch's subroutines and G-code format are written for 40-series extrusions only. The other profiles exist in the tooling but aren't needed for the current production run.

**Preserved:** All profile data stays in config.js — nothing is deleted, just filtered by mode.

---

#### 2. Feature toggle system — simple vs advanced mode

**Proposed architecture:**

- **Config-driven** — a new `FEATURE_CONFIG` object in `config.js` defines what's available in simple vs advanced mode
  - `simple`: list of enabled profile IDs, enabled hole types, and optionally face/slot restrictions per profile
  - `advanced`: everything enabled (current behaviour)
- **UI toggle** — a settings/options menu (small gear icon or toggle switch) to switch modes
- **Persistence** — mode preference saved to localStorage alongside existing job state
- **Filtering** — profile selector, face selector, slot selector, and hole type selector all filter options based on current mode
- **Visual indicator** — simple mode shows a badge/label so operators know what mode they're in

**Why toggle instead of separate build:**
- Single deployment that grows with the project
- No branching/merge hell later when "advanced" features are needed
- Operators see a clean, focused UI by default
- Patch can validate the simple mode workflows first

**What goes in simple mode by default:**
- Profiles: `40-4040` (40×40), `40-4080` (40×80)
- Hole types: mapped to Patch's feature macros (see G-code format below)
- Faces/slots: per profile as defined in config

**What stays in advanced:**
- All 8 profiles
- All 4 original placeholder hole types
- Everything the app currently does

---

#### 3. G-code format — Patch's spec (2026-06-10)

Patch provided the actual G-code structure. This replaces the placeholder format in the current generator.

##### Header

```
M9 (coolant off)
G17 (setting planes)
G21 (set to metric)
G90 (absolute positioning)
G54 G0 Z60 (go to z 60)
G54 G0 X0 Y0 (Go to x0 y0)
(T1 M6 tool change may need to uncomment)
S24000 M3 (start spindle)
G54 G0 Z60
G10 L20 P2 X0 Y0 Z60 (Set G55)
G4 P4 (let spindle get up to speed)
```

Key differences from current generator:
- **Spindle speed: 24,000 RPM** (not 19,200)
- Uses G10 L20 to set work offsets (G55 via P2, G56 via P3) instead of direct G55/G56
- Tool change (T1 M6) is commented out — may need if different tooling required

##### Per-hole macro call (each feature)

```
G55 G0 Z60
G55 G0 X0 Y[HolePos]
G10 L20 P3 X0 Y0 Z60 (Set G56 to feature position)
M98 P[Feature Macro] (See Patch macro table)
```

##### Slot-specific offsets

**Slot 1:** Offsets at X0
```
G55 G0 X0 Y[HolePos]
G10 L20 P3 X0 Y0 Z60
M98 P[Feature Macro]
```

**Slot 2:** Offsets at X-60 (60mm from slot 1 for 40×80)
```
G55 G0 X0 Y[HolePos]
G10 L20 P3 X-60 Y0 Z60
M98 P[Feature Macro]
```

The X-60 offset corresponds to the 60mm slot-to-slot distance on 40×80 extrusions.

##### Footer

```
G54 G0 Z60 (safe Z in machine coords)
M5 (spindle off)
G54 G0 X0 Y[Beam length + 50] (return to machine zero)
M99
```

Key differences from current generator:
- **M99** (subroutine return), not **M30** (program end) — these .nc files are called as subroutines by the main machine controller
- Y return is **beam length + 50mm**, not just Y0
- **"currently this is missing a significant portion"** — Patch noted the footer is incomplete

---

#### 4. Feature Macro Table — 40-series (Patch, 2026-06-10)

These are the actual P-numbers for the 40-series extrusion drilling machine. All holes are 7mm diameter — the differentiation is pattern type, not hole size.

##### Slot 1 (F1S1) macros

| P# | Description | Pattern | SKU Reference |
|----|-------------|---------|---------------|
| P4108 | F1S1 M8 Counterbore | Single CB hole | BOLT-M8-CAP-SS-035 / BOLT-M8-CAP-SS-065 |
| P4110 | F1S1 Single hole (7mm) | Single hole | HARD-40S-4040-END-FAST-A |
| P4111 | F1S1 Double hole (7mm) | Two holes, 40mm apart | HARD-40S-4080-END-FAST-A |
| P4112 | F1S1 Slotted hole (7mm) | Elongated slot | HARD-40S-4040-END-FAST-A |
| P4150 | F1S1 Central Connector | Connector feature | HARD-40S-CENTRAL-CONNECTOR |
| P4151 | F1S1 Anchor Fast | Anchor feature | HARD-40S-ANCHOR-FAST |

##### Slot 2 (F1S2) macros

| P# | Description | Pattern | SKU Reference |
|----|-------------|---------|---------------|
| P4208 | F1S2 M8 Counterbore | Single CB hole | BOLT-M8-CAP-SS-035 / BOLT-M8-CAP-SS-065 |
| P4210 | F1S2 Single hole (7mm) | Single hole | HARD-40S-4040-END-FAST-A |
| P4211 | F1S2 Double hole (7mm) | Two holes, 40mm apart | HARD-40S-4080-END-FAST-A |
| P4212 | F1S2 Slotted hole (7mm) | Elongated slot | HARD-40S-4040-END-FAST-A |
| P4250 | F1S2 Central Connector | Connector feature | HARD-40S-CENTRAL-CONNECTOR |
| P4251 | F1S2 Anchor Fast | Anchor feature | HARD-40S-ANCHOR-FAST |

---

#### 5. Deprecated: P4010 (combined slot 1 & 2)

P4010 ("F1S1 + F1S2 combined operation") is **crossed out / deprecated**. Replaced by calling P4110 then P4210 as separate macro calls. This means each slot is drilled independently in its own pass — no simultaneous dual-slot operation.

**Implication for the app:** Each slot on a face is a separate G-code file or separate operation sequence. No combined slot operation needed.

---

#### 6. Hole type mapping — current app vs Patch's actual macros

Deej clarified the actual purpose of each hole type:

| Current ID | Actual Purpose | 40-series P# | Future/20-series |
|------------|---------------|--------------|------------------|
| `hole5` (5mm hole) | Reserved for 20-series | — | 20-series only |
| `slot5` (5mm slot) | Reserved for 20-series | — | 20-series only |
| `hole8` (now 7mm) | Single hole per position | P4110/P4210 | Active now |
| `hole12` (counterbore) | Central Connector / Anchor Fast | P4150/P4151/P4250/P4251 | Active now |

**Design decision — keep it generic:** The hole types could be renamed to their exact Maker Store SKUs, but keeping them generic ("7mm hole", "counterbore") makes the app usable for future extrusion sizes and connector types. The P-number mapping handles the specificity per slot.

**Action:** Update `HOLE_TYPES` and `MACRO_CALLS` in config.js to use Patch's actual macro numbers. The hole type IDs should map to the correct P-number based on the slot being drilled.

---

#### 6b. Maker Store connector products (for drilling reference)

These are the physical products the drilling machine is designed to accommodate. Hole patterns are reverse-engineered from their mounting requirements.

**Central Connector 40 Series** ([product link](https://www.makerstore.com.au/product/hard-40s-central-connector/))
- SKU: `HARD-40S-CENTRAL-CONNECTOR`
- High-strength, zinc-plated steel fastener for internal connections in T-slot 40-series aluminium extrusion
- Fixed type connector — rigid, bracket-free joint
- Counterbore hole required to seat the bolt head flush
- P-macros: P4150 (slot 1), P4250 (slot 2)
- 2pc or 10pc packs

**Anchor Fast 40 Series** (referenced in macro table)
- SKU: `HARD-40S-ANCHOR-FAST`
- Similar mounting concept to Central Connector
- P-macros: P4151 (slot 1), P4251 (slot 2)

**End Fast 40 Series** (referenced in macro table)
- SKU: `HARD-40S-4040-END-FAST-A` (40×40)
- SKU: `HARD-40S-4080-END-FAST-A` (40×80)
- Used with single/double/slotted 7mm holes
- P-macros: P4110/P4111/P4112 (slot 1), P4210/P4211/P4212 (slot 2)

**Bolt references for counterbore:**
- `BOLT-M8-CAP-SS-035` — M8 cap bolt, 35mm
- `BOLT-M8-CAP-SS-065` — M8 cap bolt, 65mm

These products define the physical hole patterns. The drilling machine exists to pre-drill these specific mounting holes at production scale.

---

#### 7. G-code verification

Patch wants to validate the generated G-code output. He sent sample `.nc` files to compare against (pending receipt).

**Action:** Once samples arrive:
1. Create test fixtures from Patch's samples  
2. Write tests that compare generated output against expected patterns
3. Adjust `gcodeGenerator.js` until output matches Patch's format

**Known discrepancies to fix before sample comparison:**
- [ ] Spindle RPM: 19200 → 24000
- [ ] Work offset method: direct G55/G56 → G10 L20 P2/P3
- [ ] Macro calls: placeholder P1000-P1003 → Patch's actual P-numbers
- [ ] Footer: M30 → M99 (subroutine return)
- [ ] Y return: Y0 → Y[beam length + 50]
- [ ] Slot 2 offset: 0 → X-60
- [ ] Footer noted as incomplete by Patch

---

#### 8. "Keep this version for later"

The current full-featured app is the baseline. The feature toggle will gracefully degrade from full to simple without losing any code. When advanced features are eventually needed (e.g., 20-series comes online, different hole sizes), it's a config change + UI toggle, not a rewrite.

---

### Next steps (ordered)

1. **Update config.js:**
   - Add `FEATURE_CONFIG` with simple/advanced mode definitions
   - Update `HOLE_TYPES` to Patch's actual types (single hole, double hole, slotted hole, M8 CB)
   - Update `MACRO_CALLS` with real P-numbers per slot (P41xx for slot 1, P42xx for slot 2)
   - Update `MACHINE_CONFIG.spindleRPM` to 24000
2. **Update gcodeGenerator.js:**
   - Header format to use G10 L20 pattern
   - Per-hole sequence to Patch's exact format
   - Slot-specific X offsets (0 for slot 1, -60 for slot 2)
   - Footer to use M99 with Y beam_len+50
3. **Add mode toggle in UI** (settings/gear icon)
4. **Wire filtering** — profile/hole-type selectors change with mode
5. **Persist mode** in localStorage
6. **Wait for Patch's G-code samples** for final validation

### Files affected

- `src/machine/config.js` — FEATURE_CONFIG, MACRO_CALLS, HOLE_TYPES, MACHINE_CONFIG
- `src/machine/gcodeGenerator.js` — full G-code format update
- `src/App.jsx` — mode state, toggle UI, filtering logic
- `src/styles.css` — toggle/gear styling

---

### Sources

- Patch G-code format: text message, 2026-06-10
- Patch feature macro table: image, 2026-06-10
- Central Connector product: https://www.makerstore.com.au/product/hard-40s-central-connector/
- Deej hole type clarification: webchat, 2026-06-10 21:38 AEST
