# Drilling Machine Interface

G-code generator for the custom extrusion drilling machine.

Produces production-ready G-code scripts (`.nc` files) using the actual machine controller format. Select a profile, choose a face and one or more slots, define the hole pattern, and download the G-code file.

## What the app does

The drilling machine exists to pre-drill specific mounting holes in Maker Store T-slot aluminium extrusions at production scale. This interface generates the G-code that tells the machine exactly where to drill.

- **Simple mode (default):** 40×40 and 40×80 profiles only, with Patch's 6 feature types
- **Advanced mode:** all 8 Maker Store extrusion profiles (20/30/40 series, C-Beam)
- Choose face (F1–F4) and one or more slots (S1, S2) on that face
- Configure each slot independently — hole type, count, spacing, from-end offset
- Copy previous slot pattern with one click
- Enter material length — validates pattern won't overrun
- **Generates production G-code** matching Patch's actual machine controller format
- Preview generated script before download
- Download as `.nc` file or save via system file picker (Z: drive)

## Why simple vs advanced mode

Patch's subroutines and G-code format are written for 40-series extrusions only. The other profiles exist in the tooling but aren't needed for the current production run.

- **Single deployment** that grows with the project
- **No branching/merge hell** later when advanced features are needed
- **Operators see a clean, focused UI** by default
- **Patch can validate the simple mode workflows first**

All profile data stays in config.js — nothing is deleted, just filtered by mode. When advanced features are eventually needed (e.g., 20-series comes online, different hole sizes), it's a config change + UI toggle, not a rewrite.

## Workflow

1. Enter order number (e.g., `ORD-12345`)
2. Select extrusion profile (e.g., `40×40`)
3. Select face (e.g., `F1`)
4. Add one or more slot rows on that face (e.g., `S1` and `S2`)
5. Configure each slot pattern independently:
   - **Hole type** — select from Patch's feature macros (see table below)
   - **Count** — number of holes in this pattern
   - **From end** — distance in mm from the end of the extrusion to the first hole
   - **Spacing** — distance in mm between each hole
6. The visualisation updates live showing hole positions on the extrusion
7. Save the `.nc` file using either:
   - **Download** for standard browser download
   - **Save to drive (choose Z:)** to save directly to a mapped drive
8. Warehouse team runs the file, then rotates to next face and repeats
9. Use **New job (clear saved state)** when starting a new order from defaults

**One file per face**, with one or more selected slots. Process faces sequentially.

### File naming

Files are named using the order number, profile, pattern number, and face:

```
OrderNumber-Profile_Pattern-F#-Date.nc
```

Examples:
- `ORD-12345-40x80_1-F1-20260614.nc` — order 12345, 40×80 profile, pattern 1, face 1
- `ORD-12345-40x40_1-F1-20260614.nc` — same order, 40×40 profile, pattern 1, face 1

The `_1` suffix indicates which pattern this is for the profile. If a customer asks for 4× 4040 with one pattern and 2× 4080 with another, the files would be `4040_1` and `4080_1` — same pattern number, different profiles.

### Double holes

The double hole type (`HARD-40S-4080-END-FAST-A`) drills two holes 40mm apart at each position. The "from end" distance refers to the **first hole** — the second hole is automatically placed 40mm further along the extrusion.

## Visualisation

The SVG visualisation shows a top-down view of the extrusion face with:

- **Dashed line** — the slot centre line
- **Coloured circles** — each hole position, with labels showing the distance from end
- **Red fill** — indicates a hole that overruns the material length
- **Slot position labels** — shown on the right edge (e.g., `20` for slot at 20mm)

Each slot gets its own colour (blue, green, amber, purple) so you can distinguish multiple slots on one face.

### Overrun validation

The app validates that the hole pattern fits within the material length. If the last hole + 20mm clearance exceeds the material length, a red error appears and the download button is disabled. A warning appears if clearance is tight (less than 20mm).

## Hole types — Patch's feature macros

All holes are 7mm diameter — the differentiation is pattern type, not hole size.

| Hole Type | SKU | Slot 1 P# | Slot 2 P# | Description |
|-----------|-----|-----------|-----------|-------------|
| Single hole | HARD-40S-4040-END-FAST-A | P4110 | P4210 | One hole per position |
| Double hole | HARD-40S-4080-END-FAST-A | P4111 | P4211 | Two holes, 40mm apart |
| Slotted hole | HARD-40S-4040-END-FAST-A | P4112 | P4212 | Elongated slot |
| M8 Counterbore | BOLT-M8-CAP | P4108 | P4208 | Single counterbore hole |
| Central Connector | HARD-40S-CENTRAL-CONNECTOR | P4150 | P4250 | Connector feature |
| Anchor Fast | HARD-40S-ANCHOR-FAST | P4151 | P4251 | Anchor feature |

### Maker Store connector products

These are the physical products the drilling machine is designed to accommodate. Hole patterns are reverse-engineered from their mounting requirements.

- **Central Connector 40 Series** — high-strength, zinc-plated steel fastener for internal connections in T-slot 40-series aluminium extrusion. Fixed type connector — rigid, bracket-free joint. Counterbore hole required to seat the bolt head flush.
- **Anchor Fast 40 Series** — similar mounting concept to Central Connector.
- **End Fast 40 Series** — used with single/double/slotted 7mm holes.
- **Bolt references for counterbore:** `BOLT-M8-CAP-SS-035` (35mm), `BOLT-M8-CAP-SS-065` (65mm).

## G-code structure

Generated files follow Patch's actual machine controller format. These `.nc` files are called as subroutines by the main machine controller — they do not run standalone.

### Header

```
M9                          ; Coolant off
G17                         ; Set XY plane
G21                         ; Set metric
G90                         ; Absolute positioning
G54 G0 Z60                  ; Go to safe Z in G54
G54 G0 X0 Y0                ; Go to X0 Y0 in G54
; T1 M6                     ; Tool change (uncomment if needed)
S24000 M3                   ; Start spindle @ 24,000 RPM
G54 G0 Z60                  ; Safe Z
G10 L20 P2 X0 Y0 Z60        ; Set G55 work offset
G4 P4                       ; Wait for spindle to reach speed
```

Key details:
- **Spindle speed: 24,000 RPM**
- Uses `G10 L20` to set work offsets (G55 via P2, G56 via P3) instead of direct G55/G56
- Tool change (T1 M6) is commented out — uncomment if different tooling required

### Per-hole sequence

```
G55 G0 Z60                  ; Safe Z in G55
G55 G0 X0 Y[HolePos]        ; Move to hole position
G10 L20 P3 X0 Y0 Z60        ; Set G56 at this feature
M98 P[Feature Macro]        ; Call feature macro
```

Slot-specific offsets:
- **Slot 1:** X0
- **Slot 2:** X-60 (60mm slot-to-slot distance on 40×80)

### Footer

```
G54 G0 Z60                  ; Safe Z in machine coords
M5                          ; Spindle off
G54 G0 X0 Y[Beam length + 50]  ; Return past end of beam
M99                         ; Subroutine return
```

Key details:
- **M99** (subroutine return), not M30 (program end)
- Y return is **beam length + 50mm**, not just Y0

## Profile configurations

Each profile includes detailed face and slot data. In simple mode, only 40-series profiles are shown.

### 40×40

- **4 faces**, each 40mm wide
- **1 slot per face** at 20mm from end (8mm slot width)

### 40×80

- **Face 1 (80mm side):** 2 slots @ 20mm and 60mm from end (X0 and X-60 offsets)
- **Face 2 (40mm side):** 1 slot @ 20mm from end
- **Face 3 (80mm side):** 2 slots @ 20mm and 60mm from end
- **Face 4 (40mm side):** 1 slot @ 20mm from end
- **Slot width:** 8mm

All profiles include width, height, and slot positions in `src/machine/config.js`.

## Configuration

All profiles, hole types, and machine parameters are defined in `src/machine/config.js`:

- `EXTRUSION_PROFILES` — profile dimensions, faces, and slot positions
- `FEATURE_CONFIG` — simple vs advanced mode definitions (which profiles and hole types are available)
- `HOLE_TYPES` — available feature types with SKU labels
- `HOLE_TYPE_SKUS` — product codes for G-code header and filenames
- `MACRO_CALLS` — slot-aware P-number mappings (P41xx for slot 1, P42xx for slot 2)
- `MACHINE_CONFIG` — spindle RPM (24,000), Z heights, default material length, default hole count/spacing

Easy to update without code changes.

## Local development

```bash
npm install
npm run dev     # dev server at http://localhost:5173
npm test        # run tests
npm run build   # production build
```

## Deployment (Coolify)

Use the `Dockerfile` in this repo.

Suggested settings:

- **Build type:** Dockerfile
- **Port:** 80
- **Domain:** `drilling.deejpotter.com`
- **Health check:** `/health`

The container serves the Vite build through Nginx with SPA routing enabled.
