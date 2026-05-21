# Drilling Machine Interface

G-code script generator for the custom extrusion drilling machine.

Produces Patch-style subroutine scripts (`.nc` files) from a visual job builder — pick a Maker Store extrusion profile, select face/slot, define the hole pattern, build up multiple operations, and download the G-code.

## What it does

- Select from 8 Maker Store extrusion profiles (20/30/40 series, C-Beam)
- Click the cross-section diagram to pick which face to drill
- Choose hole type (through hole, slot, offset, M8 counterbore) — gated by slot width
- Set number of holes, offset from end, spacing
- Enter the actual extrusion length — validates patterns won't overrun
- Add multiple face/pattern operations to a job
- **Generates G-code using Patch subroutines:**
  - `O1000` — Through hole (G81 peck cycle)
  - `O1001` — Slot milling (G1 linear)
  - `O1002` — Offset hole (spot drill + peck)
  - `O1003` — M8 counterbore (G82)
- Preview generated script, download as `.nc` file
- Save/load jobs to localStorage
- Tool reference with G-code subroutine mapping
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
| `O1000` | Through hole | G81 peck drill cycle |
| `O1001` | Slot | G1 linear milling |
| `O1002` | Offset hole | Spot drill + peck |
| `O1003` | M8 counterbore | G82 counterbore cycle |

These must be loaded on the machine controller before running the script.
