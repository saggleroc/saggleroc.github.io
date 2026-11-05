"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { exportCsv, importCsv } = require("../src/ship-control-files.js");

const tso = [{number:"TSO 26-001",date:"2026-11-05",department:"CS",related_condition:"Link-16",control:"Maintain manual status board."}];
const dfs = [{number:"DFS-E-26-012",date:"2026-11-05",department:"ENG",type:"Temporary / Major",related_condition:"GTM 1A",deviation:"Limit speed to 20 knots."}];

test("TSO rows round-trip through CSV", () => {
  assert.deepEqual(importCsv("tso", exportCsv("tso", tso)), tso);
});

test("DFS rows round-trip through CSV", () => {
  assert.deepEqual(importCsv("dfs", exportCsv("dfs", dfs)), dfs);
});

test("blank templates import as empty datasets", () => {
  assert.deepEqual(importCsv("tso", exportCsv("tso")), []);
  assert.deepEqual(importCsv("dfs", exportCsv("dfs")), []);
});

test("dataset identifiers cannot be interchanged", () => {
  assert.throws(() => importCsv("dfs", exportCsv("tso", tso)), /Missing required column|not for the DFS dataset/);
});
