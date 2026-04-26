# M365 Deployment Guide

Asset Tracker is a static site (HTML + JS + Cesium ion). It deploys
into Microsoft 365 the same way any HTTPS-hosted page does: as a Teams
Custom Tab or a SharePoint Embed.

## 0. Host the page

Put `index.html`, `config.js`, and the `src/` tree behind HTTPS. Common
options:

- **GitHub Pages** — push to a public/private repo, enable Pages on `main`
  with the source set to `/ (root)`. URL: `https://<user>.github.io/<repo>/`.
- **Azure Static Web Apps** — `az staticwebapp create`, set the app
  location to `/`. Free tier covers tiny tenants.
- **Internal CDN / IIS / nginx** — same pattern, just serve the files.

Cesium tile streams (terrain + imagery) require HTTPS — http origins
will fail in modern browsers.

## 1. Restrict the Cesium ion token

Go to https://cesium.com/ion/tokens, open your token, and under
**Allowed URLs** add every host that will load the page:

- `localhost:8080` (local dev)
- `<user>.github.io` (GitHub Pages)
- `<your-tenant>.sharepoint.com` (SharePoint)
- `*.cloud.microsoft` and `*.teams.microsoft.com` (Teams Tab webview)

Save. The token now only resolves tiles when the request `Origin`
matches one of those hosts. Anyone who reads the deployed bundle can
see the token, but it's useless from any other host.

## 2. Teams Custom Tab

The map runs unchanged inside a Teams Tab. You ship a manifest.zip
that points Teams at the hosted URL.

1. Copy `m365/manifest.template.json` to `m365/manifest.json`.
2. Replace every `REPLACE-WITH-*` placeholder:
   - `id` — generate a new GUID (Windows: `[Guid]::NewGuid().ToString()`,
     macOS/Linux: `uuidgen`).
   - `REPLACE-WITH-YOUR-HOST` — bare hostname, no `https://` (e.g.
     `your-org.github.io`). Appears in `staticTabs.contentUrl`,
     `configurableTabs.configurationUrl`, and `validDomains`.
3. Add two icon files in `m365/`:
   - `color.png` — 192×192 colour icon.
   - `outline.png` — 32×32 white-on-transparent outline.
4. Zip the three files (manifest + two icons) at the root of the zip
   — not inside a parent folder.
5. Sideload to Teams:
   - Open Teams → Apps → Manage your apps → **Upload an app**.
   - Choose **Upload a custom app**, select your zip.
   - For org-wide rollout, your Teams Admin uploads from the
     Teams Admin Center → Manage apps.

The Tab webview runs from `*.cloud.microsoft` / `*.teams.microsoft.com`
— make sure those origins are on the ion Allowed URLs list (step 1).

## 3. SharePoint Embed

The map iframes cleanly into a SharePoint page using the **Embed**
web part:

1. Edit a SharePoint page → Add web part → search **Embed**.
2. Paste your hosted URL, e.g.
   `https://your-org.github.io/asset-tracker/`.
3. Set width 100%, height ~700–900 px.

If the embed renders blank, the IT admin needs to allow your host in
the SharePoint admin center:

- SharePoint Admin Center → **More features** → **HTML Field Security**
  (or "Site collection administration" → "HTML field security",
  depending on tenant version).
- Add your domain (e.g. `your-org.github.io`) to the iframe allowlist.
- Save. May take ~15 minutes to propagate.

WebGL must be allowed for the user's browser. Most managed-device
fleets allow it by default.

## 4. Verify

After uploading the Teams app or saving the SharePoint embed:

- Open the page from inside Teams / SharePoint.
- Check the browser DevTools console for `[cesium-map]` warnings.
  No warning + visible terrain = ion token is resolving.
- Click the Cesium "Globe" button (default base layer picker) —
  Bing imagery should load. If it doesn't, your token is missing
  asset access for ion asset 3 (Bing Maps Aerial with Labels).

## Troubleshooting

| Symptom                                  | Fix                                                                         |
|------------------------------------------|-----------------------------------------------------------------------------|
| Globe is grey / no terrain               | Token unset, expired, or host not in Allowed URLs.                          |
| Imagery is low-res Natural Earth only    | Token does not have access to ion assets 2/3/4 (Bing imagery).              |
| Teams Tab loads but page is blank        | `validDomains` in manifest doesn't list your host.                          |
| SharePoint Embed shows "blocked content" | Add your domain to SharePoint HTML Field Security iframe allowlist.         |
| Map loads in Chrome but not Edge / IE    | WebGL disabled at the browser/policy level. Enable in browser settings.     |
