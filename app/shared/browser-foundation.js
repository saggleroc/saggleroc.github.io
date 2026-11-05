(function (global) {
  "use strict";

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

  function validateDocument(document) {
    const errors = [];
    const add = (code, path, message) => errors.push({ code, path, message });
    if (!isObject(document)) {
      add("document.type", "$", "Document must be a JSON object.");
      return { valid: false, errors };
    }
    if (document.format !== "EIGHT-OCLOCK-REPORT") add("document.format", "$.format", 'Expected "EIGHT-OCLOCK-REPORT".');
    if (document.version !== 2) add("document.version", "$.version", "Expected version 2.");
    for (const field of ["uid", "generatedAt"]) {
      if (typeof document[field] !== "string" || !document[field].trim()) add(`document.${field}`, `$.${field}`, `${field} is required.`);
    }
    if (document.generatedAt && Number.isNaN(Date.parse(document.generatedAt))) {
      add("document.generatedAt.invalid", "$.generatedAt", "generatedAt must be an ISO-compatible timestamp.");
    }
    if (!isObject(document.report)) add("document.report", "$.report", "Report metadata is required.");
    if (!Array.isArray(document.tables) || document.tables.length === 0) add("document.tables", "$.tables", "At least one table is required.");
    return { valid: errors.length === 0, errors };
  }

  function numberArray(value, length, label) {
    if (!Array.isArray(value) || value.length !== length || value.some(item => !Number.isFinite(item))) {
      throw new Error(`${label} must contain ${length} numbers.`);
    }
    return value.slice();
  }

  function equipmentReadinessRecords(document) {
    const validation = validateDocument(document);
    if (!validation.valid) throw new Error(`${validation.errors[0].path}: ${validation.errors[0].message}`);
    const table = document.tables.find(item => item.uid === "equipment-repair-performance");
    if (!table || !Array.isArray(table.rows)) throw new Error('Required table "equipment-repair-performance" was not found.');
    // TEMPORARY PROTOTYPE SCHEMA: join normalized child tables into the
    // legacy dashboard/transport record shape.
    const childRows = uid => {
      const child = document.tables.find(item => item.uid === uid);
      if (!child || !Array.isArray(child.rows)) throw new Error(`Required table "${uid}" was not found.`);
      return child.rows.map(row => row.values);
    };
    const failures = childRows("failures-by-category");
    const uptime = childRows("mission-area-uptime");
    const longRepairs = childRows("recent-long-repairs");
    const weeklyRepairs = childRows("weekly-repairs");
    const ordered = (rows, shipUid, orderField, valueField, length, label) => numberArray(
      rows.filter(item => item.shipUid === shipUid)
        .sort((a, b) => typeof a[orderField] === "number" ? a[orderField] - b[orderField] : 0)
        .map(item => item[valueField]),
      length,
      label
    );
    return table.rows.map((row, index) => {
      const value = row && row.values;
      if (!isObject(value)) throw new Error(`Row ${index + 1} has no values object.`);
      if (typeof value.ship !== "string" || !value.ship.trim()) throw new Error(`Row ${index + 1} has no ship name.`);
      if (!Number.isFinite(value.repairHours) || value.repairHours < 0) throw new Error(`Row ${index + 1} has invalid repairHours.`);
      if (!Number.isFinite(value.failureRate)) throw new Error(`Row ${index + 1} failureRate must be a number.`);
      return {
        ship: value.ship,
        repair_hours: value.repairHours,
        is_this_ship: Boolean(value.isSelectedUnit),
        failure_rate: value.failureRate,
        failures: ordered(failures, row.uid, "category", "count", 4, `Row ${index + 1} failures`),
        uptime: ordered(uptime, row.uid, "missionArea", "uptimePercent", 4, `Row ${index + 1} uptime`),
        long_repairs: longRepairs.filter(item => item.shipUid === row.uid).map(item => [item.description, item.hours]),
        weekly_repairs: ordered(weeklyRepairs, row.uid, "weekIndex", "repairCount", 8, `Row ${index + 1} weeklyRepairs`)
      };
    });
  }

  function base32Encode(bytes) {
    let bits = 0, value = 0, output = "";
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits) output += alphabet[(value << (5 - bits)) & 31];
    return output;
  }

  function base32Decode(text) {
    const clean = text.toUpperCase().replace(/0/g, "O").replace(/1/g, "I").replace(/[^A-Z2-7]/g, "");
    if (!clean) throw new Error("Payload contains no Base32 data.");
    let bits = 0, value = 0;
    const bytes = [];
    for (const char of clean) {
      value = (value << 5) | alphabet.indexOf(char);
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }

  function checksum(bytes) {
    let hash = 0x811c9dc5;
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }

  async function compress(bytes) {
    if (!("CompressionStream" in global)) return { bytes, method: "NONE" };
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return compressed.length < bytes.length ? { bytes: compressed, method: "GZIP" } : { bytes, method: "NONE" };
  }

  async function decompress(bytes, method) {
    if (method === "NONE") return bytes;
    if (method !== "GZIP") throw new Error(`Unsupported compression method: ${method}`);
    if (!("DecompressionStream" in global)) throw new Error("This browser cannot decompress GZIP payloads.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function encodeMessage(packet, options) {
    const settings = options || {};
    const sourceBytes = new TextEncoder().encode(JSON.stringify(packet));
    const result = await compress(sourceBytes);
    const encoded = base32Encode(result.bytes);
    const lines = (encoded.match(/.{1,64}/g) || []).join("\n");
    const message = [
      `SUBJECT: ${settings.subject || "DASHBOARD UPDATE"}`, "", settings.body || "", "",
      "----- EIGHT O'CLOCK REPORT PAYLOAD BEGIN -----", "VERSION: 1", "ENCODING: BASE32",
      `COMPRESSION: ${result.method}`, `LENGTH: ${result.bytes.length}`,
      `RAW-LENGTH: ${sourceBytes.length}`, `CHECKSUM: ${checksum(result.bytes)}`,
      "", lines, "----- EIGHT O'CLOCK REPORT PAYLOAD END -----"
    ].join("\n");
    return { message, rawLength: sourceBytes.length, encodedLength: encoded.length, byteLength: result.bytes.length, compression: result.method };
  }

  async function decodeMessage(text) {
    const block = text.match(/-+\s*EIGHT\s+O['’]?CLOCK\s+REPORT\s+PAYLOAD\s+BEGIN\s*-+([\s\S]*?)-+\s*EIGHT\s+O['’]?CLOCK\s+REPORT\s+PAYLOAD\s+END\s*-+/i);
    if (!block) throw new Error("No Eight O'Clock Report payload markers were found.");
    const section = block[1];
    const expectedChecksum = section.match(/CHECKSUM\s*:\s*([0-9A-F]{8})/i)?.[1].toUpperCase();
    const expectedLength = Number(section.match(/LENGTH\s*:\s*(\d+)/i)?.[1]);
    const expectedRawLength = Number(section.match(/RAW-LENGTH\s*:\s*(\d+)/i)?.[1]);
    const compression = section.match(/COMPRESSION\s*:\s*([A-Z0-9-]+)/i)?.[1].toUpperCase() || "NONE";
    if (!expectedChecksum || !Number.isFinite(expectedLength)) throw new Error("Payload metadata is incomplete.");
    const payloadText = section.split(/\r?\n/)
      .filter(line => !/^\s*(VERSION|ENCODING|COMPRESSION|LENGTH|RAW-LENGTH|CHECKSUM)\s*:/i.test(line))
      .join("");
    const bytes = base32Decode(payloadText);
    if (bytes.length !== expectedLength) throw new Error(`Payload length check failed (expected ${expectedLength}, found ${bytes.length}).`);
    const actualChecksum = checksum(bytes);
    if (actualChecksum !== expectedChecksum) throw new Error(`Payload checksum failed (${actualChecksum} ≠ ${expectedChecksum}).`);
    const rawBytes = await decompress(bytes, compression);
    if (Number.isFinite(expectedRawLength) && rawBytes.length !== expectedRawLength) throw new Error("Decompressed length check failed.");
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBytes));
  }

  global.EightOClockReport = { validateDocument, equipmentReadinessRecords, encodeMessage, decodeMessage };
})(window);
