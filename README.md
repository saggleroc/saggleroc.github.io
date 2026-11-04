# FleetHacker project site

Static GitHub Pages site for the FleetHacker 2026 proof of concept.

- `/` is the project overview.
- `/app/` is the temporary demo launcher.
- `/app/sender.html` generates a dashboard message.
- `/app/0800.html` decodes the message and renders the ship's offline 0800 report.
- `/presentation/` hosts the integrated SAGGLE ROC HTML slide deck.

The hosted demo includes a simulated browser-local drive. It stores generated
messages in `localStorage`, allowing the generator and viewer to demonstrate a
file handoff without requiring users to download or locate real files.

## Temporary content

Anything labeled `TEMP`, `TEMPORARY`, `SAMPLE`, or `DEMO` is intentionally
unfinished and must be reviewed or replaced before a final release. The site
uses synthetic example data and is not an approved operational system.

GitHub Pages publishes this repository from the `main` branch. Because this is
the `saggleroc.github.io` user-site repository, the public URL is:

<https://saggleroc.github.io/>

## Development workflow

Make and test website changes on the `dev` branch. Only merge `dev` into `main`
when the local preview is ready to deploy.

From PowerShell in this repository:

```powershell
.\preview.ps1
```

This opens <http://localhost:8080/> and serves the site from the current working
tree, including the simulated file-storage workflow. Press `Ctrl+C` to stop.
Use a different port when needed:

```powershell
.\preview.ps1 -Port 8090
```
