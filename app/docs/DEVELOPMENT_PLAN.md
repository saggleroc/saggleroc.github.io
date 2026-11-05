# Eight O'Clock Report Development Plan

## 1. Purpose

Eight O'Clock Report will become an offline-first report workspace for shipboard
decision support. Shore-side processes will assemble the best available
Personnel, Material, and Training data from authoritative sources. A ship will
receive a snapshot, review it locally, and add ship-known updates without
requiring a continuous network connection.

This plan deliberately avoids encoding a final 0800 report layout before the
authoritative specification is available. The first implementation will use
representative data and configurable schemas so the real format can be adopted
quickly.

## 2. Product Goals

- Present an actionable 0800 report organized around Personnel, Material, and
  Training.
- Accept a shore-generated JSON snapshot containing any number of typed tables.
- Allow shipboard users to augment, correct, and annotate imported information.
- Support in-app editing and configurable Excel/CSV import mappings.
- Preserve the source, time, and authorship of values and updates.
- Keep the shore-side sender and shipboard viewer as separate applications,
  each containing only the capabilities required for its role.
- Operate locally with no server, build step, or network dependency for the
  initial proof of concept.
- Make schemas, imports, validation, and presentation easy for developers or
  authorized AI tools to modify.
- Continue to support low-bandwidth Eight O'Clock Report text transport.

## 3. Non-Goals for the First Release

- Replacing authoritative personnel, maintenance, or training systems.
- Automatically connecting to production authoritative systems.
- Providing an approved security, classification, or records-management
  solution.
- Resolving conflicting reports without human review.
- Providing multi-user real-time collaboration.
- Digitally signing, encrypting, or authorizing updates.
- Free-form runtime code generation by an AI tool.
- Sending shipboard modifications back to shore in v1.

## 4. Working Product Model

### 4.1 Snapshot

A snapshot is the complete shore-known state for one report period. It contains:

- Document identity and schema version.
- Unit and report metadata.
- One or more independently identified tables.
- Provenance and freshness metadata.
- Optional presentation configuration.

### 4.2 Local update

A local update is a ship-entered operation layered on top of the imported
snapshot. It may add, update, annotate, or archive a record. Updates must not
silently overwrite the original source value.

The viewer derives its current state by applying ordered local updates to the
base snapshot. In v1 this enables reset, audit, local persistence, and local
backup/restore. A later version may package and transmit shipboard modifications
back to shore, but the v1 viewer will not generate return messages or perform
shore reconciliation.

### 4.3 Tables

Tables are generic typed datasets rather than one fleet-wide record shape. Each
table has:

- Stable `uid`, title, and optional subtitle.
- A column schema with stable UIDs and data types.
- Rows with stable UIDs.
- Optional source, freshness, and validation metadata.
- Optional import aliases and presentation hints.

Initial example tables will cover:

- Personnel fit/fill.
- Critical Navy Enlisted Classifications (CNECs).
- CASREPs.
- Maintenance jobs.
- Mission and training impacts.
- Standing orders.
- Outstanding, upcoming, and overdue training.
- Recent training scores.

These are examples, not assumptions about the final 0800 specification.

## 5. Proposed Architecture

### 5.1 Separate applications

The sender and viewer are independent applications with different users,
deployment locations, and responsibilities.

**Shore-side sender**

- Imports or receives authoritative-source data.
- Maps source data into a validated canonical snapshot.
- Previews the outbound snapshot for data-quality review.
- Encodes and exports a one-way Eight O'Clock Report update for delivery to a ship.
- Does not provide shipboard editing, local-update history, operational
  dashboard customization, or return-package processing.

**Shipboard viewer**

- Imports and validates a shore-generated Eight O'Clock Report snapshot.
- Displays the 0800 report and source/freshness metadata.
- Allows local in-app or configured CSV/Excel augmentation.
- Maintains local updates, persistence, reset, backup, and restore.
- Does not compile authoritative-source data, generate shore-to-ship packages,
  or send modifications back to shore in v1.

The two applications share a documented protocol and canonical data schema, not
application behavior or UI code. Neither application should depend on the other
application being present. If implementation utilities are shared, they must be
small domain-neutral libraries (for example validation or report decoding),
packaged with each application so each remains independently deployable and
offline-capable.

The proof of concept should be converted from two monolithic HTML files into
two separately deployable sets of small ES modules while retaining static
offline deployment.

```text
/
  sender/
    index.html
    src/
      app.js
      source-import/
      snapshot-builder/
      outbound-transport/
      preview/
      config/
  viewer/
    index.html
    src/
      app.js
      inbound-transport/
      report/
      local-updates/
      local-import/
      persistence/
      backup/
      config/
  protocol/
    schemas/
    examples/
    specification/
  shared/
    core/
      document-model.js
      validation.js
    transport/
      eight-oclock.js
      base32.js
      checksum.js
      compression.js
  docs/
```

Module contracts should use plain JSON-compatible objects. UI modules should
consume selectors or normalized view models rather than decode transport data
or parse files directly.

`shared/` is limited to protocol-level, UI-free code needed by both builds. The
sender must not import viewer modules, and the viewer must not import sender
modules. Each app must have a separate entry point and distributable artifact.

### 5.2 Layer responsibilities

1. **Transport:** Package and recover bytes using the Eight O'Clock Report envelope.
2. **Document model:** Define schemas, tables, rows, metadata, and updates.
3. **Validation:** Report structural errors and domain warnings without
   corrupting accepted data.
4. **Sender source import:** Convert shore source JSON/CSV and later Excel into
   an outbound canonical snapshot.
5. **Sender export:** Generate the one-way shore-to-ship Eight O'Clock Report package.
6. **Viewer local import:** Convert ship-provided JSON/CSV and later Excel into
   local update operations.
7. **Viewer merge and provenance:** Combine the base snapshot and local updates
   while retaining history.
8. **Viewer presentation:** Render overview and domain views from configuration
   and table UIDs.
9. **Viewer persistence:** Store the active snapshot and local updates in the
   browser and provide local portable backups.

### 5.3 Extension strategy

Expected changes should be isolated:

- New source format: add an importer and mapping configuration.
- New table: add schema/configuration and sample data.
- New visualization: add a view module that reads table and column UIDs.
- New 0800 format: update schema, layout configuration, and mappings.
- New transport: implement the same encode/decode document interface.
- Future ship-to-shore workflow: add a separately designed return-package
  protocol and shore reconciliation capability without expanding the v1
  viewer's outbound role.

## 6. Data and Update Principles

- JSON is the canonical interchange and backup format.
- CSV and Excel are imports into one or more JSON tables, not canonical storage.
- Stable UIDs are used for documents, tables, columns, rows, updates, and
  layouts.
- Human-readable titles are never used as relational identifiers.
- Every imported snapshot records `generatedAt`; tables may also record
  `source`, `sourceAsOf`, and `classification` placeholders.
- Every local update records an update UID, timestamp, actor label, operation,
  target, reason/note, and changed values.
- A source value and a ship-supplied value remain distinguishable.
- Unknown fields should be retained where possible to permit forward-compatible
  round trips.
- Schema migrations must be explicit and versioned.
- A local backup is a user-controlled recovery artifact, not a ship-to-shore
  update package.

## 7. Delivery Phases

### Phase 0 — Confirm the foundation

- Review this plan and prioritize the backlog.
- Agree on offline browser targets and permitted persistence.
- Agree on handling of sensitive or classified sample data.
- Confirm whether Excel support may use a bundled third-party library.

**Exit:** Architectural decisions are recorded and the MVP boundary is agreed.

### Phase 1 — Generic document core

- Define and document the versioned JSON schema.
- Create separate sender and viewer entry points and module boundaries.
- Extract protocol-level Eight O'Clock Report functionality from the current HTML while
  keeping outbound generation in the sender and inbound processing in the
  viewer.
- Implement structural validation and useful error reporting.
- Add sender snapshot import/export and viewer local backup/restore as distinct
  workflows.
- Decode existing ND1 messages for backward compatibility.

**Exit:** A multi-table example document can make a sender/viewer round trip
without losing metadata.

### Phase 2 — Example 0800 report

- Create representative Personnel, Material, and Training datasets.
- Build report navigation and domain summary views.
- Add generic table rendering with filtering, sorting, and freshness indicators.
- Keep domain calculations in configurable selectors where practical.

**Exit:** The sample report demonstrates the intended workflow without claiming
to be the final 0800 format.

### Phase 3 — Shipboard augmentation

- Add in-app add/edit/annotate/archive workflows.
- Implement an append-only local update log.
- Persist the base snapshot and local updates locally.
- Support reset and local workspace backup/restore.
- Clearly label shore-originated and ship-originated values.

**Exit:** A user can import a shore snapshot, augment it offline, close/reopen
the app, and create/restore a local backup with provenance intact. The viewer
does not create a return Eight O'Clock Report message.

### Phase 4 — Configurable file imports

- Add reusable CSV mapping definitions.
- Provide preview, validation, and conflict handling before applying imports.
- Add table-level CSV templates for local shipboard data entry if needed.
- Add Excel import if approved and technically viable offline.

**Exit:** Users can update example tables from configured files without changing
application code.

### Phase 5 — Adapt to the official 0800 specification

- Compare the official report fields and workflows to the generic model.
- Add or revise table schemas, mappings, validation, calculations, and layouts.
- Add schema migration from prototype documents.
- Create acceptance fixtures representing the official format.

**Exit:** The report matches the agreed specification and passes fixture-based
acceptance tests.

### Phase 6 — Hardening and evaluation

- Test malformed, stale, duplicated, and conflicting inputs.
- Test compatibility across approved target browsers.
- Add accessibility and keyboard-navigation checks.
- Measure message sizes and practical low-bandwidth limits.
- Conduct security and deployment reviews appropriate to the target environment.

**Exit:** Known limitations and deployment controls are documented, with
evidence that core workflows are reliable.

### Future phase — Ship-to-shore update return

This phase is explicitly outside v1. If approved later, it may:

- Export ship-originated operations as a distinct return package.
- Add sender-side or shore-side import, review, conflict detection, and
  reconciliation.
- Define acknowledgement, sequence, replay, identity, authorization, signing,
  encryption, and classification-handling requirements.
- Preserve the original shore snapshot and ship update provenance.

Return traffic must not simply reuse the v1 outbound workflow without a separate
security and reconciliation design.

## 8. Testing Strategy

- Unit tests for transport, validation, migration, merge, and mappings.
- Fixture tests for JSON/CSV import and round-trip preservation.
- Integration tests for snapshot plus local update derivation.
- Browser workflow tests for import, edit, persistence, backup, and restore.
- Corruption tests for Eight O'Clock Report lengths and checksums.
- Compatibility fixtures for legacy ND1 messages.
- Manual review of sample domain calculations with subject-matter experts.

## 9. Key Risks and Mitigations

### Unknown final specification

Use table schemas, mappings, and layouts keyed by stable UIDs. Keep sample
domain logic out of transport and storage.

### Conflicting shore and ship information

Retain the base value and use ordered local operations with visible provenance.
Do not use last-write-wins without showing the conflict.

### Browser storage loss

Provide explicit JSON backup and restore. Treat browser persistence as
convenience, not the sole record.

### Excel complexity

Begin with JSON and CSV. Isolate spreadsheet parsing behind an importer so an
approved bundled library can be added without changing the data model.

### AI-generated modifications

Document module contracts, fixtures, and validation. Require generated changes
to pass tests; do not let imported data execute code or HTML.

### Payload size

Measure realistic report sizes early. Support compression and consider delta
packages only after full-snapshot behavior is reliable.

### Security and classification

Use synthetic examples, label the prototype limits, and avoid implying that
checksums provide authentication or confidentiality.

## 10. Decisions Needed During Review

1. Which browsers and versions represent the target offline environment?
2. Is browser local storage or IndexedDB permitted?
3. Can a third-party Excel parser be bundled and approved?
4. What actor identity should v1 capture locally, and how trustworthy must it
   be?
5. Must multiple watches/users reconcile independent local update histories?
6. In a future ship-to-shore phase, should updates be returned as an augmented
   snapshot, a separate update package, or both?
7. What classification and distribution markings must appear in the UI and
   exports?
8. What age thresholds should mark source data as stale?
9. Is digital signing or encryption expected in a later phase?
10. Which authoritative sources and source identifiers should be represented?

## 11. Definition of MVP

The MVP is complete when it can:

- In the sender, import a valid multi-table JSON shore snapshot.
- In the sender, generate a one-way shore-to-ship Eight O'Clock Report message.
- In the viewer, import and verify that message without sender code or UI.
- In the viewer, display example Personnel, Material, and Training sections.
- In the viewer, show source and freshness metadata.
- In the viewer, accept in-app local updates without erasing source values.
- In the viewer, import configured CSV updates for at least one table.
- In the viewer, persist locally and export/restore a local portable backup.
- Keep sender and viewer builds independently deployable with no cross-role UI
  or functionality.
- Generate shore-to-ship Eight O'Clock Report messages only in the sender; do not generate
  ship-to-shore messages in v1.
- Explain validation and import failures in plain language.
- Preserve a clear path to replace examples with the official 0800 format.
