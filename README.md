# Drilling Machine Interface

G-code script generator for the custom extrusion drilling machine.

Produces Patch-style subroutine scripts (`.nc` files) from a visual job builder — pick a Maker Store extrusion profile, select face/slot, define the hole pattern, build up multiple operations, and download the G-code.

## What it does

- Select from 8 Maker Store extrusion profiles (20/30/40 series, C-Beam)
- Choose hole type (5mm hole, 5mm slot, 8mm hole, 12mm hole)
- Set number of holes, offset from end, spacing
- Enter the actual extrusion length — validates patterns won't overrun
- **Generates G-code using Patch subroutines:**
  - `O1000` — 5mm hole (G81 peck cycle)
  - `O1001` — 5mm slot (G1 milling)
  - `O1002` — 8mm hole (G81 peck cycle)
  - `O1003` — 12mm hole (G81 peck cycle)
- Preview generated script, download as `.nc` file
- G-code preview with dark terminal-style display
- Keyboard shortcut: `Ctrl+Enter` to download the script

## Local development

```bash
npm install
npm run dev     # dev server
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

## G-code subroutines

The generated script calls four Patch controller subroutines:

| Sub | Operation | Notes |
|-----|-----------|-------|
| `O1000` | 5mm hole | G81 peck drill cycle |
| `O1001` | 5mm slot | G1 linear milling |
| `O1002` | 8mm hole | G81 peck drill cycle |
| `O1003` | 12mm hole | G81 peck drill cycle |

These must be loaded on the machine controller before running the script.

Job name should be:
Order number - Profile - Hole type - Date

More detailed commments in Top of G-code

Review the naming structure

1 file per face.
