# Drilling Machine Interface

G-code generator for the custom extrusion drilling machine.

Produces production-ready G-code scripts (`.nc` files) using the actual machine controller format. Select a profile, choose face and one or more slots, define the hole pattern, and download the G-code file.

## Current project state

- **Simple/advanced mode toggle** — simple mode shows only 40-series profiles (40×40, 40×80) with Patch's actual macros; advanced mode shows all 8 profiles
- Per-slot workflow: add slot rows (S1, S2, etc.) on one face and configure each independently
- Slot-aware G-code: slot 1 uses X0, slot 2 uses X-60 offset (40×80 slot-to-slot distance)
- Setup persisted in local storage; mode preference saved separately
- Download naming uses order number when provided; fallback drill-job names are auto-uniqued

## Stack and frameworks

- Frontend: React + Vite
- Tests: Vitest + Testing Library
- Deployment: Docker + Nginx

## What it does

- **Simple mode (default):** 40×40 and 40×80 profiles only, with Patch's 6 feature types
- **Advanced mode:** all 8 Maker Store extrusion profiles (20/30/40 series, C-Beam)
- Choose face (F1-F4) and one or more slots (S1, S2) on that face
- Choose hole type from Patch's feature macros:
  - Single hole (7mm) — P4110/P4210
  - Double hole (7mm) — P4111/P4211
  - Slotted hole (7mm) — P4112/P4212
  - M8 Counterbore — P4108/P4208
  - Central Connector — P4150/P4250
  - Anchor Fast — P4151/P4251
- Set number of holes, offset from end, and spacing per slot
- Copy previous slot pattern with one click
- Enter material length — validates pattern won't overrun
- **Generates production G-code with:**
  - Real machine controller format (G54/G55/G56 via G10 L20)
  - `M98 P` macro calls with slot-aware P-numbers (P41xx for slot 1, P42xx for slot 2)
  - 24,000 RPM spindle speed
  - `M99` subroutine return (not M30 program end)
  - Y return to beam length + 50mm
- Preview generated script before download
- Download as `.nc` file or save via system file picker (Z: drive)
- **File naming:** `OrderNumber-Profile-F#-S#_S#-Date.nc`
  - Example: `ORD-12345-40x40-F1-S1-20260611.nc`

## Workflow

1. Enter order number (e.g., `ORD-12345`)
2. Select extrusion profile (e.g., `40×40`)
3. Select face (e.g., `F1`)
4. Add one or more slot rows on that face (e.g., `S1` and `S2`)
5. Configure each slot pattern independently (hole type, count, spacing, from-end offset)
6. Save the `.nc` file using either:
   - **Download F# - S# (.NC)** for standard browser download
   - **Save to drive (choose Z:)** to save directly to a mapped drive (e.g., `Z:`)
7. Warehouse team runs the file, then rotates to next face and repeats
8. Use **New job (clear saved state)** when starting a new order from defaults

**Note:** One file per face, with one or more selected slots. Process faces sequentially.

## Local development

```bash
npm install
npm run dev     # dev server at http://localhost:5173
npm test        # run tests (35 passing)
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

## Profile configurations

Each profile includes detailed face and slot data. In simple mode, only 40-series profiles are shown.

### 40×80 example

- **Face 1 (80mm side):** 2 slots @ 20mm and 60mm from end (X0 and X-60 offsets)
- **Face 2 (40mm side):** 1 slot @ 20mm from end
- **Face 3 (80mm side):** 2 slots @ 20mm and 60mm from end
- **Face 4 (40mm side):** 1 slot @ 20mm from end
- **Slot width:** 8mm

All profiles include width, height, and slot positions in `src/machine/config.js`.

## G-code structure

Generated files follow Patch's actual machine controller format:

**Header:**

- Coolant off, metric mode, absolute positioning
- Safe Z movement in G54
- Spindle start @ 24,000 RPM
- Set G55 work offset via `G10 L20 P2`

**Per-hole sequence:**

- Move to hole position in G55 (X0 for slot 1, X-60 for slot 2)
- Set G56 at feature position via `G10 L20 P3`
- Call feature macro via `M98 P####`

**Footer:**

- Safe Z in machine coords (G54)
- Spindle off
- Return past end of beam (`Y[materialLength + 50]`)
- `M99` subroutine return

## Feature macros — 40-series (Patch's actual table)

| Feature | Slot 1 P# | Slot 2 P# | Description |
|---------|-----------|-----------|-------------|
| Single hole (7mm) | P4110 | P4210 | One hole per position |
| Double hole (7mm) | P4111 | P4211 | Two holes, 40mm apart |
| Slotted hole (7mm) | P4112 | P4212 | Elongated slot |
| M8 Counterbore | P4108 | P4208 | Single counterbore hole |
| Central Connector | P4150 | P4250 | Connector feature |
| Anchor Fast | P4151 | P4251 | Anchor feature |

## Configuration

All profiles, hole types, and machine parameters are defined in `src/machine/config.js`:

- `EXTRUSION_PROFILES` - Profile dimensions, faces, and slot positions
- `FEATURE_CONFIG` - Simple vs advanced mode definitions
- `HOLE_TYPES` - Available feature types (semantic IDs)
- `MACRO_CALLS` - Slot-aware P-number mappings
- `MACHINE_CONFIG` - Spindle RPM (24,000), Z heights, defaults

Easy to update without code changes.
