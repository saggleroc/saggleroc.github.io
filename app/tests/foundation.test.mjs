import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { equipmentReadinessRecords, validateDocument } from "../shared/core/document-model.mjs";
import { base32Decode, base32Encode, decodeMessage, encodeMessage } from "../shared/transport/eight-oclock.mjs";

const fixtureUrl = new URL("../examples/equipment-readiness.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

test("canonical example validates and maps to readiness records", () => {
  assert.deepEqual(validateDocument(fixture), { valid: true, errors: [] });
  const records = equipmentReadinessRecords(fixture);
  assert.equal(records.length, 12);
  assert.equal(records.find(record => record.is_this_ship)?.ship, "USS Resolute");
  assert.deepEqual(records[0].failures, [7, 11, 5, 4]);
  assert.deepEqual(records[0].long_repairs[0], ["No. 2 Ship Service Generator", 142]);
  assert.deepEqual(records[0].weekly_repairs, [2, 4, 3, 6, 5, 8, 7, 10]);
});

test("temporary prototype canonical tables contain scalar cells only", () => {
  assert.deepEqual(fixture.tables.map(table => table.uid), [
    "equipment-repair-performance",
    "failures-by-category",
    "mission-area-uptime",
    "recent-long-repairs",
    "weekly-repairs"
  ]);
  for (const table of fixture.tables) {
    for (const row of table.rows) {
      for (const value of Object.values(row.values)) {
        assert.equal(value !== null && typeof value === "object", false, `${table.uid}/${row.uid} has a non-scalar cell`);
      }
    }
  }
});

test("validation reports duplicate row UIDs with a machine-readable location", () => {
  const invalid = structuredClone(fixture);
  invalid.tables[0].rows[1].uid = invalid.tables[0].rows[0].uid;
  const result = validateDocument(invalid);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "row.uid.duplicate");
  assert.match(result.errors[0].path, /rows\[1\]\.uid/);
});

test("Base32 round trips arbitrary bytes", () => {
  const bytes = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
  assert.deepEqual(base32Decode(base32Encode(bytes)), bytes);
});

test("Eight O'Clock Report envelope round trips and detects corruption", async () => {
  const packet = { f: "ND1", d: "readiness", t: "2026-11-04T13:00:00Z", r: [["USS Test", 12, 1]] };
  const encoded = await encodeMessage(packet, { subject: "Test" });
  assert.deepEqual(await decodeMessage(encoded.message), packet);

  const corrupted = encoded.message.replace(/CHECKSUM: ([0-9A-F])/, (_, digit) => `CHECKSUM: ${digit === "0" ? "1" : "0"}`);
  await assert.rejects(() => decodeMessage(corrupted), /checksum failed/i);
});
