# Drilling Machine Interface

G-code generator for the custom extrusion drilling machine.

Produces production-ready G-code scripts (`.nc` files) using the actual machine controller format. Select a profile, choose face and slot, define the hole pattern, and download the G-code file.

## What it does

- Select from 8 Maker Store extrusion profiles (20/30/40 series, C-Beam) with detailed slot configurations
- Choose face (4 sides per extrusion) and specific slot within that face
- Choose hole type (5mm hole, 5mm slot, 8mm hole, 12mm hole)
- Set number of holes, offset from end, and spacing
- Enter material length — validates pattern won't overrun
- **Generates production G-code with:**
  - Real machine controller format (G54/G55/G56 work offsets)
  - `M98 P` macro calls for feature operations
  - 19,200 RPM spindle speed
  - Proper header/footer sequences
- Preview generated script before download
- Download as `.nc` file
- **File naming:** `OrderNumber-Profile-Face-Slot-Date.nc`
  - Example: `ORD-12345-20x40-Fface1-S1-20260522.nc`

## Workflow

1. Enter order number (e.g., `ORD-12345`)
2. Select extrusion profile (e.g., `20×40`)
3. Select face (e.g., `Face 1 (40mm side)`)
4. Select slot (e.g., `Slot 1 @ 10mm from end`)
5. Configure hole pattern (count, spacing, from-end offset)
6. Download the `.nc` file for that face/slot
7. Warehouse team runs the file, then rotates to next face/slot and repeats

**Note:** One file per face/slot combination. Process sequentially.

## Local development

```bash
npm install
npm run dev     # dev server at http://localhost:5173
npm test        # run tests (26 passing)
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

Each profile includes detailed face and slot data:

### 20×40 example:
- **Face 1 (40mm side):** 2 slots @ 10mm and 30mm from end
- **Face 2 (20mm side):** 1 slot @ 10mm from end
- **Face 3 (40mm side):** 2 slots @ 10mm and 30mm from end
- **Face 4 (20mm side):** 1 slot @ 10mm from end
- **Slot width:** 6.25mm

All profiles include width, height, and slot positions in `src/machine/config.js`.

## G-code structure

Generated files follow the actual machine controller format:

**Header:**
- Coolant off, metric mode, absolute positioning
- Safe Z movement in G54
- Spindle start @ 19,200 RPM
- Set G55 work offset

**Per-hole sequence:**
- Move to hole Y position in G55
- Set G56 at feature position
- Call feature macro via `M98 P####`

**Footer:**
- Safe Z in machine coords (G54)
- Spindle off
- Return to machine zero
- `M30` end

## Feature macros

The generator uses placeholder P-numbers that must be replaced with actual macro numbers from the Patch controller table:

| Hole Type | Placeholder P# | Description |
|-----------|---------------|-------------|
| 5mm hole | P1000 | Single hole drill |
| 5mm slot | P1001 | Linear slot mill |
| 8mm hole | P1002 | Single hole drill |
| 12mm hole | P1003 | Single hole drill |

**Action required:** Update `MACRO_CALLS` in `src/machine/config.js` with real P-numbers from your macro table before production use.

## Configuration

All profiles, hole types, and machine parameters are defined in `src/machine/config.js`:

- `EXTRUSION_PROFILES` - Profile dimensions, faces, and slot positions
- `HOLE_TYPES` - Available hole/slot options
- `MACRO_CALLS` - P-number mappings (update with real values)
- `MACHINE_CONFIG` - Spindle RPM, Z heights, defaults

Easy to update without code changes.
