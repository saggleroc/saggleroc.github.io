"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  TABLE_UID,
  exportTable,
  importTable,
  mostCommonTableUid
} = require("../src/table-files.js");

const records = [{
  ship: "USS Example",
  repair_hours: 12,
  failure_rate: 1.5,
  failures: [1, 2, 3, 4],
  uptime: [95, 96, 97, 98],
  weekly_repairs: [1, 2, 3, 4, 5, 6, 7, 8],
  is_this_ship: true,
  long_repairs: [["Pump, cooling", 14]]
}];

test("exported tables can be imported without losing dashboard fields", () => {
  const imported = importTable(exportTable(records));
  assert.deepEqual(imported, records);
});

test("blank table UIDs on added rows use the populated majority UID", () => {
  const rows = [
    {__table_uid: TABLE_UID},
    {__table_uid: TABLE_UID},
    {__table_uid: ""}
  ];
  assert.equal(mostCommonTableUid(rows), TABLE_UID);
});

test("a CSV for another table is rejected", () => {
  const csv = "__table_uid,ship\r\npersonnel,Someone";
  assert.throws(() => importTable(csv), /not "equipment-readiness"/);
});
