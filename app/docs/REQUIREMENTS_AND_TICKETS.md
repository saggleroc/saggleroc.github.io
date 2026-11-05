# Eight O'Clock Report Requirements and Development Tickets

## 1. Requirement Conventions

- **MUST**: required for the MVP unless assigned to a later phase.
- **SHOULD**: important but may be deferred after review.
- **MAY**: optional or exploratory.
- Ticket priorities are **P0** (foundation/blocking), **P1** (MVP), **P2**
  (post-MVP), and **P3** (future).

## 2. Functional Requirements

### R-DATA — Generic data model

- **R-DATA-001:** The app MUST use a versioned JSON document as its canonical
  interchange format.
- **R-DATA-002:** A document MUST support any number of tables.
- **R-DATA-003:** Documents and tables MUST have stable UIDs and human-readable
  titles; subtitles MUST be optional.
- **R-DATA-004:** Each table MUST define typed columns with stable UIDs.
- **R-DATA-005:** Each row MUST have a stable UID and keyed values.
- **R-DATA-006:** The model MUST permit additional metadata without requiring a
  transport change.
- **R-DATA-007:** Unknown fields SHOULD survive import/export round trips.
- **R-DATA-008:** Schema versions and migrations MUST be explicit.
- **R-DATA-009:** The prototype MUST include representative Personnel,
  Material, and Training tables.

### R-PROV — Provenance and freshness

- **R-PROV-001:** Every snapshot MUST record when it was generated.
- **R-PROV-002:** A table SHOULD record an authoritative source UID/name and the
  source's effective timestamp when known.
- **R-PROV-003:** The UI MUST distinguish shore-provided data from ship-provided
  updates.
- **R-PROV-004:** Local updates MUST record a UID, timestamp, actor label,
  operation, target, and changed values.
- **R-PROV-005:** The UI MUST surface stale or unknown source timestamps.
- **R-PROV-006:** Classification/distribution metadata MUST have a defined
  placeholder in the model; required policy is pending.

### R-REPORT — 0800 report experience

- **R-REPORT-001:** The app MUST provide Personnel, Material, and Training
  sections.
- **R-REPORT-002:** The report MUST provide an overview showing priority items
  and data freshness.
- **R-REPORT-003:** Example Personnel content SHOULD cover fit/fill and CNECs.
- **R-REPORT-004:** Example Material content SHOULD cover CASREPs, jobs,
  mission impact, training impact, and standing orders.
- **R-REPORT-005:** Example Training content SHOULD cover outstanding,
  upcoming, overdue events, and recent scores.
- **R-REPORT-006:** The generic table view MUST support readable empty, loading,
  invalid, and no-results states.
- **R-REPORT-007:** Presentation modules MUST reference table/column UIDs rather
  than table positions or display labels.
- **R-REPORT-008:** Domain calculations MUST document their input fields and
  assumptions.

### R-UPDATE — Shipboard augmentation

- **R-UPDATE-001:** A user MUST be able to add, edit, annotate, and archive
  supported records in the app.
- **R-UPDATE-002:** The base shore snapshot MUST remain recoverable after local
  updates.
- **R-UPDATE-003:** The app MUST derive current state by applying an ordered
  local update log to the base snapshot.
- **R-UPDATE-004:** A user MUST be able to inspect local updates.
- **R-UPDATE-005:** A user MUST be able to discard one local update or reset all
  local changes with confirmation.
- **R-UPDATE-006:** Conflicting or invalid updates MUST be shown for review and
  MUST NOT silently replace source data.
- **R-UPDATE-007:** The app SHOULD support notes that do not replace structured
  source values.

### R-IMPORT — Import

- **R-IMPORT-001:** The app MUST import a complete canonical JSON document.
- **R-IMPORT-002:** The app MUST validate input before replacing the active
  document.
- **R-IMPORT-003:** The app MUST import CSV using a table-specific mapping.
- **R-IMPORT-004:** CSV mappings SHOULD support header aliases, required fields,
  type conversion, defaults, and row UID construction.
- **R-IMPORT-005:** Imports MUST show a preview and error summary before being
  applied.
- **R-IMPORT-006:** One bad row SHOULD NOT prevent valid rows from being
  reviewed, but partial application MUST require explicit confirmation.
- **R-IMPORT-007:** Excel import SHOULD use the same normalized mapping
  interface as CSV.
- **R-IMPORT-008:** Imported text MUST be treated as data and MUST NOT execute
  HTML or script.

### R-EXPORT — Export and portability

- **R-EXPORT-001:** The app MUST export a complete JSON backup containing the
  base snapshot and local update log.
- **R-EXPORT-002:** The app MUST restore an exported backup.
- **R-EXPORT-003:** The app SHOULD export a current augmented snapshot.
- **R-EXPORT-004:** The app SHOULD export ship updates as a separate portable
  package.
- **R-EXPORT-005:** The app SHOULD generate CSV templates or exports for
  configured tables.
- **R-EXPORT-006:** Exports MUST retain UIDs, schema versions, timestamps, and
  provenance.

### R-TRANSPORT — Low-bandwidth message transport

- **R-TRANSPORT-001:** The Eight O'Clock Report envelope MUST support the canonical JSON
  document.
- **R-TRANSPORT-002:** The transport MUST validate encoded and decoded lengths
  and an accidental-corruption checksum.
- **R-TRANSPORT-003:** Compression SHOULD be used when supported and beneficial.
- **R-TRANSPORT-004:** The viewer SHOULD continue to decode existing ND1
  readiness messages.
- **R-TRANSPORT-005:** The UI MUST state that the checksum is not authentication
  or encryption.
- **R-TRANSPORT-006:** Transport code MUST not depend on report-specific fields.

### R-STORE — Offline persistence

- **R-STORE-001:** The app MUST function without network requests after files
  are available locally.
- **R-STORE-002:** The app MUST persist the active snapshot and local updates
  using an approved browser capability.
- **R-STORE-003:** Persistence failures or unavailable storage MUST be visible
  to the user.
- **R-STORE-004:** Portable backup MUST be available regardless of browser
  persistence.
- **R-STORE-005:** The user MUST be able to clear locally stored report data
  with confirmation.

### R-MOD — Modularity and modification

- **R-MOD-001:** Transport, model, validation, import/export, persistence, and
  presentation MUST be separate modules.
- **R-MOD-002:** Module interfaces MUST use documented JSON-compatible values.
- **R-MOD-003:** Adding a table or import mapping SHOULD not require editing
  transport code.
- **R-MOD-004:** Adding a presentation SHOULD not require editing import or
  persistence code.
- **R-MOD-005:** The repository MUST contain an app modification guide.
- **R-MOD-006:** Representative fixtures MUST be available to validate human-
  or AI-generated modifications.
- **R-MOD-007:** Runtime configuration MUST be treated as data, not executable
  code.

## 3. Non-Functional Requirements

### R-NFR — Quality

- **R-NFR-001:** The deployed proof of concept MUST remain static and
  offline-capable.
- **R-NFR-002:** Core workflows MUST be usable by keyboard.
- **R-NFR-003:** Status, severity, and provenance MUST not be conveyed by color
  alone.
- **R-NFR-004:** Errors MUST identify the affected document, table, column, or
  row when possible.
- **R-NFR-005:** The app MUST handle malformed input without losing the current
  valid report.
- **R-NFR-006:** The app MUST avoid dynamic evaluation such as `eval` and
  `new Function`.
- **R-NFR-007:** User-provided content MUST be rendered with safe text APIs.
- **R-NFR-008:** Tests MUST cover model validation, transport, merge, migration,
  and import mappings.
- **R-NFR-009:** Browser and realistic payload-size targets are TBD and MUST be
  measured before deployment recommendations.

## 4. Development Tickets

### Epic E0 — Architecture decisions

#### FP-001 — Record target-environment decisions

**Priority:** P0  
**Depends on:** none

Document target browsers, allowed storage, Excel-library policy, sample-data
handling, actor identity expectations, and export/reconciliation expectations.

**Acceptance criteria**

- Each open decision in the development plan has an owner or disposition.
- Decisions that remain unknown are marked with an explicit temporary default.
- Constraints affecting architecture are captured in the app guide.

#### FP-002 — Define MVP scenarios and terminology

**Priority:** P0  
**Depends on:** FP-001

Write concise user scenarios for shore preparation, ship import, ship update,
backup/restore, and later reconciliation.

**Acceptance criteria**

- Terms including snapshot, source, table, local update, augmented snapshot,
  and backup are defined.
- Each MVP workflow has a start state, user action, and expected outcome.

### Epic E1 — Generic document foundation

#### FP-101 — Define Eight O'Clock Report document schema v2

**Priority:** P0  
**Depends on:** FP-002

Define the canonical JSON structure for metadata, schemas, tables, rows, local
updates, and optional presentation configuration.

**Acceptance criteria**

- A machine-readable schema and annotated example exist.
- UIDs and required/optional fields are documented.
- The schema supports multiple tables and unknown extension metadata.
- The schema does not contain report-specific transport assumptions.

#### FP-102 — Create representative 0800 example document

**Priority:** P0  
**Depends on:** FP-101

Create synthetic Personnel, Material, and Training tables.

**Acceptance criteria**

- Examples cover all currently named report topics.
- Data is clearly synthetic and contains no operational information.
- At least one stale, missing, high-priority, and locally updated example is
  represented.

#### FP-103 — Extract transport modules

**Priority:** P0  
**Depends on:** FP-101

Move Base32, checksum, compression, and Eight O'Clock Report envelope logic out of the
monolithic pages.

**Acceptance criteria**

- Encode/decode functions accept or return bytes/documents without UI access.
- Existing valid messages continue to pass fixture tests.
- Corrupted length/checksum fixtures fail clearly.

#### FP-104 — Implement document validation

**Priority:** P0  
**Depends on:** FP-101

Validate document structure, table schemas, row identities, and typed values.

**Acceptance criteria**

- Errors include a machine-readable code and human-readable location/message.
- Validation distinguishes fatal structural errors from warnings.
- Invalid imports cannot replace the current valid report.

#### FP-105 — Add schema migration framework

**Priority:** P1  
**Depends on:** FP-101, FP-104

Create sequential, testable schema migrations.

**Acceptance criteria**

- Migration source and destination versions are explicit.
- Migration never mutates the caller's original object.
- Unsupported future versions are rejected without data loss.

#### FP-106 — Preserve legacy ND1 decoding

**Priority:** P2  
**Depends on:** FP-103, FP-104

Map the existing readiness packet to either a legacy view or a compatible v2
document.

**Acceptance criteria**

- Existing sample messages decode successfully.
- Legacy origin and missing metadata are made visible.

### Epic E2 — Modular application shell

#### FP-201 — Split sender and viewer into modules

**Priority:** P0  
**Depends on:** FP-103, FP-104

Create the planned `core`, `transport`, `import`, `export`, `ui`, `views`, and
`config` boundaries.

**Acceptance criteria**

- No transport module accesses the DOM.
- No domain view parses files or encoded messages.
- Static files run locally in the agreed target environment.
- Module responsibilities are documented.

#### FP-202 — Build report navigation and shell

**Priority:** P1  
**Depends on:** FP-102, FP-201

Provide Overview, Personnel, Material, Training, Data, and Updates navigation.

**Acceptance criteria**

- Navigation is keyboard accessible.
- The selected report/unit and as-of time are always visible.
- Missing sections fail gracefully.

#### FP-203 — Build generic table view

**Priority:** P1  
**Depends on:** FP-201

Render any valid table schema with safe text output.

**Acceptance criteria**

- Supports typed formatting, sorting, filtering, and empty states.
- Shows source and freshness where available.
- Does not require code changes for a new basic table.

#### FP-204 — Build configurable status-summary components

**Priority:** P1  
**Depends on:** FP-202, FP-203

Add reusable count, status, score, and priority summaries driven by config.

**Acceptance criteria**

- Components reference stable table and column UIDs.
- Missing/invalid inputs show an explanation instead of a fabricated value.
- Calculation assumptions are documented and tested.

#### FP-205 — Create Personnel example views

**Priority:** P1  
**Depends on:** FP-204

Build fit/fill and CNEC views from the example schema.

**Acceptance criteria**

- Users can identify shortages and data freshness.
- Calculations are isolated from rendering and covered by fixtures.

#### FP-206 — Create Material example views

**Priority:** P1  
**Depends on:** FP-204

Build CASREP, maintenance job, mission/training impact, and standing-order
views.

**Acceptance criteria**

- Priority and impact are readable without relying only on color.
- Records can be traced to source table/row UIDs.

#### FP-207 — Create Training example views

**Priority:** P1  
**Depends on:** FP-204

Build outstanding, upcoming, overdue, and recent-score views.

**Acceptance criteria**

- Date-relative status uses the report as-of time consistently.
- Missing dates and scores are represented explicitly.

### Epic E3 — Local updates and persistence

#### FP-301 — Define local update operation schema

**Priority:** P0  
**Depends on:** FP-101

Define add, replace-fields, annotate, and archive operations.

**Acceptance criteria**

- Operations target stable table and row UIDs.
- Before/source values remain recoverable.
- Actor, timestamp, reason/note, and operation UID are supported.

#### FP-302 — Implement deterministic update application

**Priority:** P0  
**Depends on:** FP-301

Derive current state from a base snapshot and ordered operations.

**Acceptance criteria**

- The same inputs always produce the same result.
- Duplicate operation UIDs are detected.
- Missing targets and type conflicts are surfaced, not ignored.
- Source objects are not mutated.

#### FP-303 — Build in-app record editor

**Priority:** P1  
**Depends on:** FP-203, FP-302

Generate safe edit forms from table schemas.

**Acceptance criteria**

- Required fields and types are validated before update creation.
- The user sees whether each field is source or locally modified.
- Canceling an edit creates no operation.

#### FP-304 — Build update history and reset controls

**Priority:** P1  
**Depends on:** FP-302

Allow users to inspect and discard local changes.

**Acceptance criteria**

- History is ordered and identifies actor/time/target/change.
- Destructive resets require confirmation.
- Removing an operation recomputes derived state predictably.

#### FP-305 — Implement offline persistence adapter

**Priority:** P1  
**Depends on:** FP-302

Persist the active base snapshot, updates, and app settings.

**Acceptance criteria**

- Data survives browser restart in the target environment.
- Storage failures are visible.
- A clear-data action removes app-owned report data only.
- Storage implementation is hidden behind a documented interface.

### Epic E4 — Import, export, and backup

#### FP-401 — Add canonical JSON import/export

**Priority:** P0  
**Depends on:** FP-104

Import and export v2 documents.

**Acceptance criteria**

- Import validates before application.
- Export/import round trips preserve required and unknown fields.
- Filename and visible metadata include report identity and time.

#### FP-402 — Add portable workspace backup/restore

**Priority:** P1  
**Depends on:** FP-302, FP-401

Back up the base snapshot, local operations, and compatible settings.

**Acceptance criteria**

- Restore previews identity, dates, and update counts.
- A failed restore leaves the current workspace unchanged.
- Backup format and version are documented.

#### FP-403 — Define configurable CSV mappings

**Priority:** P0  
**Depends on:** FP-101

Define mapping configuration for headers, aliases, conversion, defaults, and
row UIDs.

**Acceptance criteria**

- At least two differently shaped CSV fixtures map into example tables.
- Mapping errors identify the row and source column.
- Mapping configuration contains no executable expressions.

#### FP-404 — Build CSV import preview and apply flow

**Priority:** P1  
**Depends on:** FP-302, FP-403

Preview CSV-derived operations before applying them.

**Acceptance criteria**

- Shows adds, changes, unchanged rows, warnings, and rejected rows.
- Partial application requires explicit confirmation.
- Applied changes create provenance-bearing local operations.

#### FP-405 — Add table CSV templates and exports

**Priority:** P2  
**Depends on:** FP-403

Generate spreadsheet-friendly templates and current table exports.

**Acceptance criteria**

- Stable IDs are preserved or reconstructable.
- Required columns and accepted values are documented in the file.

#### FP-406 — Evaluate and add Excel import

**Priority:** P2  
**Depends on:** FP-001, FP-403

Evaluate browser-compatible offline spreadsheet parsing and implement only if
approved.

**Acceptance criteria**

- Decision includes dependency, size, license, security, and browser support.
- If implemented, worksheets normalize through the CSV mapping interface.
- If rejected, the supported Excel-to-CSV workflow is documented.

#### FP-407 — Upgrade Eight O'Clock Report message generation for v2

**Priority:** P1  
**Depends on:** FP-103, FP-401

Generate and consume v2 documents using the low-bandwidth envelope.

**Acceptance criteria**

- Multi-table example data completes a message round trip.
- Message metadata reports compressed/raw sizes and checksum.
- Import failures do not replace the current report.

### Epic E5 — Adaptability, quality, and hardening

#### FP-501 — Complete app modification guide

**Priority:** P0  
**Depends on:** FP-101, FP-201, FP-403

Maintain instructions for schemas, mappings, views, fixtures, and safe AI
modification.

**Acceptance criteria**

- A developer can add a basic table and CSV mapping from the guide.
- Contracts and prohibited dependency directions are explicit.
- Verification commands and fixtures are listed.

#### FP-502 — Add automated core tests

**Priority:** P0  
**Depends on:** FP-103, FP-104, FP-302, FP-403

Create tests for transport, validation, migrations, update application, and
mappings.

**Acceptance criteria**

- Valid, invalid, corrupted, duplicate, and unknown-version fixtures exist.
- Tests run locally without network access.
- Failures identify the fixture and behavior.

#### FP-503 — Add end-to-end offline workflows

**Priority:** P1  
**Depends on:** FP-305, FP-402, FP-404, FP-407

Test import, augment, restart, export, and restore workflows.

**Acceptance criteria**

- Tests cover preservation of source and local provenance.
- A malformed import cannot destroy the prior workspace.
- The workflow can run with network access disabled.

#### FP-504 — Accessibility and usability pass

**Priority:** P1  
**Depends on:** FP-202 through FP-207, FP-303

Review keyboard behavior, focus, labels, status communication, and responsive
layout.

**Acceptance criteria**

- Core workflows are keyboard operable.
- Errors and priorities do not rely on color alone.
- Forms have associated labels and actionable errors.

#### FP-505 — Payload and browser compatibility evaluation

**Priority:** P1  
**Depends on:** FP-407

Measure realistic report sizes and test target browsers.

**Acceptance criteria**

- Raw, compressed, and Base32 sizes are recorded for representative reports.
- Browser limitations and fallback behavior are documented.
- Any practical message-size limit is visible to the sender.

#### FP-506 — Security and deployment review

**Priority:** P1  
**Depends on:** MVP feature completion

Review input handling, dependencies, persistence, provenance claims,
classification markings, and deployment assumptions.

**Acceptance criteria**

- Known threats and controls are documented.
- The app never labels checksum validation as sender verification.
- Approval requirements and proof-of-concept limitations are visible.

### Epic E6 — Official 0800 format adoption

#### FP-601 — Map official 0800 specification

**Priority:** P0 when specification arrives  
**Depends on:** FP-101, official specification

Create a field-by-field mapping from the official report to schemas, tables,
sources, validations, and views.

**Acceptance criteria**

- Every required field has a type, source, edit policy, and display location.
- Ambiguities and missing authoritative sources are listed for decision.
- Differences from prototype examples are identified.

#### FP-602 — Implement official schemas and mappings

**Priority:** P0 when specification arrives  
**Depends on:** FP-601

Replace or extend example configuration using official fields and source files.

**Acceptance criteria**

- Official-format fixtures validate.
- Existing prototype documents migrate or fail with clear instructions.
- Transport and persistence require no report-specific rewrite.

#### FP-603 — Implement official calculations and layouts

**Priority:** P0 when specification arrives  
**Depends on:** FP-601, FP-602

Implement accepted summaries, thresholds, prioritization, and report ordering.

**Acceptance criteria**

- Subject-matter experts verify calculations against reference cases.
- Assumptions and thresholds are configurable or documented.
- Printed/exported presentation is reviewed if required.

#### FP-604 — Conduct operational acceptance

**Priority:** P0 when specification arrives  
**Depends on:** FP-603

Exercise representative shore-to-ship workflows with approved synthetic or
controlled test data.

**Acceptance criteria**

- Users can identify priority Personnel, Material, and Training issues.
- Ship updates remain distinct and exportable.
- Defects and requested changes are prioritized before deployment.

## 5. Suggested Initial Sprint

The first implementation sprint should include:

1. FP-001 — Target-environment decisions.
2. FP-002 — MVP scenarios and terminology.
3. FP-101 — JSON schema v2.
4. FP-102 — Representative 0800 example.
5. FP-103 — Transport extraction.
6. FP-104 — Validation.
7. FP-201 — Module split.
8. FP-401 — JSON import/export.
9. FP-501 — Modification guide updates.
10. FP-502 — Core test harness and initial fixtures.

This sequence builds the replaceable data foundation before investing in
presentation details that the official specification may change.
