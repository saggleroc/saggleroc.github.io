# FleetHacker project site

Static GitHub Pages site for the FleetHacker 2026 proof of concept.

- `/` is the project overview.
- `/app/` is the temporary demo launcher.
- `/app/sender.html` generates a dashboard message.
- `/app/viewer.html` decodes the message and renders the offline dashboard.
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
