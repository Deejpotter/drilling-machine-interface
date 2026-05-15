# Drilling Machine Interface

React prototype for the custom extrusion drilling machine web app.

## What it does
- lets the operator pick a standard or custom drilling pattern
- shows a rough visual preview of the block sequence
- exports a JSON payload and a Patch-style script preview
- is ready to be deployed as a static container in Coolify

## Local build

```bash
npm install
npm run build
```

## Coolify deployment

Use the `Dockerfile` in this repo.

Suggested deployment settings:
- **Build type:** Dockerfile
- **Port:** 80
- **Domain:** `drilling.deejpotter.com`
- **Health check:** `/health`

The container serves the Vite build through Nginx with SPA routing enabled.

## Next step

Replace the prototype export preview with the real Patch export contract once that format is confirmed.
