# TEMPORARY PROTOTYPE SCHEMA

This prototype temporarily normalizes equipment-readiness data so every
canonical table cell is scalar. The ship table contains only ship-level
fields; failures, mission-area uptime, recent long repairs, and weekly repairs
are stored in four child tables joined by `shipUid`.

The compatibility joins in `shared/core/document-model.mjs`,
`shared/browser-foundation.js`, and `developer-mode.js` intentionally preserve
the legacy dashboard and compact ND1 transport record shape at their
boundaries. Canonical JSON exports remain normalized.

These changes are isolated prototype work. During merge, omit them unless the
temporary schema is explicitly wanted, or cherry-pick them carefully with
their fixture and tests. Do not treat this layout as a permanent schema
decision.
