# Eight O'Clock Report App and Modification Guide

## 1. What This App Is

Eight O'Clock Report is an offline-first viewer and editor for shipboard report data.
A shore-side process prepares a snapshot from available authoritative sources.
The ship imports that snapshot, reviews it locally, and records ship-known
updates. The current report is the base snapshot plus an ordered local update
log.

The repository began as an equipment-readiness transport demonstration and now
has a minimal JSON-first foundation:

- `sender.html` validates canonical JSON and turns its readiness table into a
  text-safe ND1 compatibility message.
- `viewer.html` validates the message and draws a fixed dashboard.
- `examples/equipment-readiness.json` supplies synthetic demonstration data.
- `shared/core` and `shared/transport` contain UI-free document and protocol
  modules.

The planned version keeps the low-bandwidth transport but replaces the fixed
record shape and monolithic UI with generic tables and modular views.

## 2. Design Rules

These rules are intended to make later human- or AI-assisted changes safer.

1. **JSON is canonical.** CSV and Excel are import/export formats.
2. **UIDs are contracts.** Code references stable UIDs, never display titles or
   array positions.
3. **Source data is preserved.** Ship changes are operations layered over a
   shore snapshot.
4. **Transport is domain-neutral.** Eight O'Clock Report transport code must not know about Personnel,
   Material, Training, CASREPs, or any other report topic.
5. **Views do not parse files.** Importers normalize data before views receive
   it.
6. **Imported configuration is data.** Do not execute imported JavaScript,
   formulas, HTML, templates, or expressions.
7. **Unknown does not mean zero.** Missing, stale, not applicable, and zero are
   distinct states.
8. **Examples are provisional.** Current fields demonstrate architecture; they
   are not the official 0800 specification.
9. **Every change gets a fixture.** Add or update synthetic example data and
   tests with schema, mapping, or calculation changes.
10. **Use safe rendering.** Put user/imported text into `textContent` or
    equivalent safe APIs, not `innerHTML`.

## 3. Planned Module Boundaries

```text
src/core       Data model, validation, migrations, updates, persistence contract
src/transport  Eight O'Clock Report envelope, Base32, compression, checksum
src/import     JSON/CSV/Excel normalization and mapping
src/export     Backups, snapshots, table files, Eight O'Clock Report messages
src/ui         App shell, navigation, editors, reusable components
src/views      Personnel, Material, Training, and future domain presentations
src/config     Default schemas, mappings, layouts, and thresholds
examples       Synthetic documents and source-file fixtures
tests          Core and workflow verification
```

Allowed dependency direction:

```text
UI/views → core interfaces
import/export → core interfaces
transport → bytes and JSON serialization
core → no UI, import-format, or transport dependency
```

Avoid circular imports and avoid shared global state. Pass documents, tables,
and update logs through explicit function parameters.

## 4. Canonical Document Shape

The exact v2 schema will be finalized in development ticket FP-101. The target
shape is:

```json
{
  "format": "EIGHT-OCLOCK-REPORT",
  "version": 2,
  "uid": "report-2026-11-04-uss-example",
  "generatedAt": "2026-11-04T12:00:00Z",
  "report": {
    "uid": "0800-report",
    "title": "0800 Report",
    "subtitle": "USS Example",
    "unitUid": "uss-example",
    "asOf": "2026-11-04T08:00:00-05:00"
  },
  "tables": [
    {
      "uid": "personnel-fit-fill",
      "title": "Personnel Fit / Fill",
      "subtitle": "By rating or work center",
      "source": {
        "uid": "authoritative-source-placeholder",
        "title": "Source pending",
        "asOf": "2026-11-03T20:00:00Z"
      },
      "columns": [
        {"uid": "group", "title": "Group", "type": "string", "required": true},
        {"uid": "required", "title": "Required", "type": "integer"},
        {"uid": "onboard", "title": "On Board", "type": "integer"},
        {"uid": "fitPercent", "title": "Fit", "type": "number", "unit": "percent"}
      ],
      "rows": [
        {
          "uid": "engineering",
          "values": {
            "group": "Engineering",
            "required": 85,
            "onboard": 78,
            "fitPercent": 88.2
          }
        }
      ]
    }
  ],
  "extensions": {}
}
```

Tables contain data, not chart instructions. Presentation configuration may
refer to table and column UIDs:

```json
{
  "uid": "personnel-fit-summary",
  "type": "metric",
  "tableUid": "personnel-fit-fill",
  "valueColumnUid": "fitPercent",
  "title": "Personnel Fit"
}
```

## 5. Local Update Shape

Local updates form a separate append-only log. A conceptual update looks like:

```json
{
  "uid": "update-01JBY...",
  "createdAt": "2026-11-04T13:20:00Z",
  "actor": {"label": "Shipboard watch team"},
  "operation": "replace-fields",
  "target": {
    "tableUid": "material-casreps",
    "rowUid": "casrep-2026-0042"
  },
  "values": {
    "missionImpact": "Degraded",
    "shipNote": "Part received; installation scheduled."
  },
  "reason": "0800 report update"
}
```

Do not edit the base row in place. Apply updates in order to derive a view. A
later reconciliation workflow can export the local log independently from the
shore snapshot.

## 6. How to Add a Table

1. Choose a stable, lowercase, kebab-case table UID.
2. Define the table title, subtitle, source metadata, and columns.
3. Give every column a stable UID and type.
4. Define how row UIDs are sourced or constructed.
5. Add synthetic rows to the example document.
6. Add validation fixtures for valid and invalid rows.
7. Confirm the generic table view displays it.
8. Add a domain view only if the generic view is insufficient.
9. Document source authority, freshness, and ship edit policy.

Never reuse a UID for a different meaning. If a field's meaning materially
changes, create a new UID and a schema migration.

## 7. How to Add or Change a CSV Format

Create a mapping rather than adding format-specific conditions to the UI.
Mappings should specify:

- Target table UID.
- Accepted source-header aliases.
- Required source fields.
- Type conversions and accepted value vocabulary.
- Defaults for truly defaultable values.
- Row UID source or deterministic construction.
- Whether a row represents add, update, annotation, or archive.

Conceptual mapping:

```json
{
  "uid": "casrep-csv-v1",
  "targetTableUid": "material-casreps",
  "columns": {
    "casrepUid": {"headers": ["CASREP ID", "Serial"], "type": "string"},
    "title": {"headers": ["Title", "Description"], "type": "string"},
    "missionImpact": {
      "headers": ["Mission Impact"],
      "type": "enum",
      "values": ["None", "Limited", "Degraded", "Unable"]
    }
  },
  "rowUidColumn": "casrepUid"
}
```

The importer must produce a preview containing adds, changes, unchanged rows,
warnings, and rejected rows. It should create local update operations only
after user confirmation.

If an Excel workbook is later supported, worksheet values should flow through
the same mapping interface. Do not put spreadsheet-specific behavior in views
or the document model.

## 8. How to Add a View

Use a new domain view only when a generic table or configured summary does not
communicate the decision clearly.

1. Name the decision or question the view answers.
2. List required table and column UIDs.
3. Implement a pure selector that converts tables into a small view model.
4. Define behavior for missing, stale, invalid, and empty data.
5. Render the view model using reusable UI components.
6. Add fixtures for normal and edge cases.
7. Document calculations and thresholds.

A view must not:

- Read files.
- Decode Eight O'Clock Report messages.
- Write browser storage directly.
- Mutate source tables.
- Infer fields from display titles.
- Treat a missing value as zero without an explicit domain rule.

## 9. How to Adopt the Official 0800 Format

When the specification arrives:

1. Inventory every section, field, source, data type, required status, and
   allowed ship edit.
2. Map each field to an existing table/column UID or create a new one.
3. Identify calculations, thresholds, ordering, and priority rules.
4. Create controlled reference fixtures and expected results.
5. Update schemas and import mappings.
6. Add explicit migrations for prototype documents.
7. Update presentation configuration or domain views.
8. Have subject-matter experts verify calculations and workflow.

Do not rewrite transport or persistence to match the report. If that becomes
necessary, first check whether report-specific behavior leaked into a lower
layer.

## 10. Guidance for AI-Assisted Changes

An AI tool may help add schemas, mappings, fixtures, styles, and views, but its
change should be treated like any other code change.

Provide the tool with:

- This guide.
- The relevant schema and example fixtures.
- The exact target table/column UIDs.
- Expected behavior for missing and invalid values.
- The tests or acceptance criteria to satisfy.

Require it to:

- Keep module boundaries intact.
- Use synthetic data.
- Preserve backward compatibility unless explicitly waived.
- Add or update tests.
- Avoid new network calls and runtime code execution.
- List assumptions where the official specification is silent.

Review generated changes for:

- Accidentally renamed UIDs.
- Hard-coded source headers or array positions.
- Unsafe `innerHTML` use.
- Silent coercion of invalid values.
- Loss of provenance or source values.
- Domain rules embedded in transport/import code.
- Dependencies that cannot run offline or cannot be approved.

## 11. Current Prototype Limits

The initial foundation is intentionally smaller than the planned application:

- The sender accepts the canonical v2-style JSON example but currently maps one
  equipment-readiness table into the existing compatibility packet.
- The transmitted ND1 packet still stores compact positional arrays rather than
  transporting generic tables.
- Transport and basic document validation are modules; viewer calculations and
  rendering remain together pending FP-201.
- CSV is not a primary input. Configurable CSV mappings and preview/application
  remain FP-403 and FP-404.
- No shipboard edits, update history, persistence, or reconciliation exist.
- The checksum detects accidental corruption but does not authenticate a sender.
- Messages are not encrypted or digitally signed.

These limits are expected and should not be confused with planned behavior.

## 12. Change Checklist

Before considering a modification complete:

- [ ] Stable UIDs are unchanged or explicitly migrated.
- [ ] Canonical JSON remains valid and round-trippable.
- [ ] Source and local values remain distinguishable.
- [ ] Unknown, missing, zero, and not-applicable values remain distinct.
- [ ] Imported content cannot execute code or HTML.
- [ ] No new network dependency was introduced.
- [ ] Synthetic fixtures cover the new behavior.
- [ ] Validation and edge cases are tested.
- [ ] Module documentation is updated.
- [ ] The app still works with network access disabled.
