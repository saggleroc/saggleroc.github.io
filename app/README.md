# Offline Single-Ship Eight O'Clock Report

This prototype packages a single ship's Eight O'Clock Report inside ordinary text and
renders it as an offline command brief. It has no build step, runtime network
requests, or third-party dependencies.

## Try it

1. Open `sender.html` in a browser. It supports direct `file:` use; a static
   server is optional.
2. Import `examples/eight-oclock-report.json`.
3. The generator creates the message automatically; copy or download the result.
4. Open `viewer.html`.
5. Paste the complete message or import the downloaded text file. `viewer.html`
   automatically opens the Eight O'Clock Report viewer.

The viewer displays mission certification, departmental manning, open CASREPs,
NEC health, command priorities, and weather for one hull only. It renders an
overview plus five printable department sheets.

Use **Export Departures CSV** to download the ship-data template. Populated
departures imported from that CSV create a seventh, ship-originated sheet.
Clearing the imported data removes that sheet; shore-provided data is unchanged.

The generator starts without dashboard data or a generated message. The sample
JSON includes fleet repair time and failure-rate comparisons, rolling failure
counts by category, eight weeks of repair activity, mission-area uptime
percentages, and up to three recent long repair items per ship.
`isSelectedUnit: true` selects the ship that the dashboard highlights.

JSON is the canonical interchange format. CSV and Excel support are intentionally
deferred to configurable import mappings; they will not define the stored model.

## Development

Core behavior uses dependency-free ES modules under `shared/`. Run the tests
with Node.js 20 or newer:

```powershell
node --test
```

## Edit a shipboard table

After loading a message in `viewer.html`, use **Export CSV** on the equipment
readiness table. Edit that file in Excel and import the saved CSV to replace the
table immediately. Existing rows include `__table_uid=equipment-readiness`;
new rows may leave that column blank. **Reset to shore data** restores the table
from the originally loaded message.

The demo intentionally supports CSV rather than bundling a comparatively large
offline XLSX parser. Excel can open and save the exported CSV directly.

## Shipboard editing prototypes

Three standalone pages compare possible developer-mode workflows:

- `developer-direct.html` edits raw values directly in dashboard visuals.
- `developer-csv.html` provides an integrated CSV text editor.
- `developer-tables.html` exposes all source data as editable browser tables.

Each page accepts either canonical Eight O'Clock Report v2 JSON or a complete report text
message. Calculated values remain read-only. The download action exports a full
canonical JSON snapshot named `<ship>-ship-edits-YYYY-MM-DD.json` with
`extensions.shipEdits` metadata identifying the ship, edit time, and prototype.

## Message format

The human-readable subject and body are followed by a marked `EIGHT O'CLOCK REPORT` block.
The block contains:

- A protocol version
- Base32 encoding (letters and digits only)
- GZIP compression when supported and beneficial
- Compressed and uncompressed byte lengths
- An FNV-1a checksum
- Compact UTF-8 JSON records encoded as Base32

Whitespace, line wrapping, capitalization, and stray punctuation inside the
payload are tolerated. The decoder also treats `0` as `O` and `1` as `I`.
If a real payload character is removed or changed, the length or checksum test
rejects the update rather than displaying corrupted data.

Modern browsers use their built-in compression streams, so no compression
library or network connection is required. The sender falls back to an
uncompressed payload if GZIP is unavailable or would make a tiny payload larger.
The viewer remains compatible with uncompressed messages from the original
proof-of-concept format.

## Deliberate proof-of-concept limits

- The checksum detects accidents but is not a security mechanism.
- Messages are not encrypted or digitally signed.
- There is one dashboard schema and each message contains a full snapshot.
- The canonical example uses the proposed v2 table shape, but transport still
  emits the compact ND1 compatibility packet until the v2 transport ticket.
- There is no sequence, replay, sender authorization, or classification logic.
- The HTML files are demonstration software, not an approved shipboard system.
