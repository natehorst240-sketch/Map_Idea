# M365 Packaging

This folder contains a Teams app manifest template that wraps the hosted
Asset Tracker page as a Teams Tab.

Files:

- `manifest.template.json` — Teams app manifest (v1.16). Replace the
  `REPLACE-WITH-*` placeholders, add `color.png` (192×192) and
  `outline.png` (32×32, white-on-transparent), and zip the three files.
- For full step-by-step, see `docs/m365-deployment.md`.

The map app itself is unchanged for Teams / SharePoint deployment —
just host `index.html` and friends behind HTTPS and point the manifest
at the URL.
