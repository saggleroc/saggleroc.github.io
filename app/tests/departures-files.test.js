"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { TABLE_UID, exportCsv, importCsv } = require("../src/departures-files.js");

const rows = [{
  department: "ENG",
  specification: "MIP 123",
  departure: "Inspection interval exceeded, pending availability",
  operationalImpact: "None",
  correctiveAction: "Schedule at next availability",
  owner: "CHENG",
  dueDate: "2026-12-01",
  status: "OPEN"
}];

test("ship departures survive CSV export and import", () => {
  assert.deepEqual(importCsv(exportCsv(rows)), rows);
});

test("the blank template imports as no ship data", () => {
  assert.deepEqual(importCsv(exportCsv()), []);
});

test("CSV rows must identify the departures table", () => {
  const csv = exportCsv(rows).replace(TABLE_UID, "another-table");
  assert.throws(() => importCsv(csv), /not a departures row/);
});

test("a populated row must describe its departure", () => {
  const csv = exportCsv(rows).replace(rows[0].departure, "");
  assert.throws(() => importCsv(csv), /must describe a departure/);
});
