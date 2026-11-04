(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NavdashTableFiles = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TABLE_UID = "equipment-readiness";
  const COLUMNS = [
    "__table_uid", "ship", "repair_hours", "failure_rate",
    "propulsion_failures", "electrical_failures", "combat_systems_failures", "auxiliary_failures",
    "engineering_uptime", "combat_systems_uptime", "communications_uptime", "navigation_uptime",
    "repairs_week_1", "repairs_week_2", "repairs_week_3", "repairs_week_4",
    "repairs_week_5", "repairs_week_6", "repairs_week_7", "repairs_week_8",
    "is_this_ship", "long_repair_1", "long_repair_1_hours",
    "long_repair_2", "long_repair_2_hours", "long_repair_3", "long_repair_3_hours"
  ];

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    text = String(text).replace(/^\uFEFF/, "");
    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (quoted) {
        if (character === '"' && text[index + 1] === '"') {
          field += '"';
          index++;
        } else if (character === '"') {
          quoted = false;
        } else {
          field += character;
        }
      } else if (character === '"') {
        quoted = true;
      } else if (character === ",") {
        row.push(field);
        field = "";
      } else if (character === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (character !== "\r") {
        field += character;
      }
    }
    row.push(field);
    if (row.some(value => value !== "") || !rows.length) rows.push(row);
    return rows;
  }

  function csvCell(value) {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportTable(records) {
    const rows = records.map(record => {
      const longRepairs = Array.isArray(record.long_repairs) ? record.long_repairs : [];
      const weekly = Array.isArray(record.weekly_repairs) ? record.weekly_repairs : [];
      const failures = Array.isArray(record.failures) ? record.failures : [];
      const uptime = Array.isArray(record.uptime) ? record.uptime : [];
      return {
        __table_uid: TABLE_UID,
        ship: record.ship,
        repair_hours: record.repair_hours,
        failure_rate: record.failure_rate,
        propulsion_failures: failures[0],
        electrical_failures: failures[1],
        combat_systems_failures: failures[2],
        auxiliary_failures: failures[3],
        engineering_uptime: uptime[0],
        combat_systems_uptime: uptime[1],
        communications_uptime: uptime[2],
        navigation_uptime: uptime[3],
        ...Object.fromEntries(Array.from({length: 8}, (_, index) => [`repairs_week_${index + 1}`, weekly[index]])),
        is_this_ship: record.is_this_ship ? "true" : "false",
        ...Object.fromEntries(Array.from({length: 3}, (_, index) => [
          [`long_repair_${index + 1}`, longRepairs[index]?.[0]],
          [`long_repair_${index + 1}_hours`, longRepairs[index]?.[1]]
        ]).flat())
      };
    });
    return [COLUMNS, ...rows.map(row => COLUMNS.map(column => row[column]))]
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");
  }

  function mostCommonTableUid(rows) {
    const counts = new Map();
    for (const row of rows) {
      const uid = String(row.__table_uid || "").trim();
      if (uid) counts.set(uid, (counts.get(uid) || 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "";
  }

  function number(row, name) {
    return Number(row[name] || 0);
  }

  function importTable(text, expectedTableUid = TABLE_UID) {
    const matrix = parseCsv(text);
    const headers = (matrix.shift() || []).map(header => header.trim());
    const rows = matrix
      .filter(values => values.some(value => value !== ""))
      .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
    const tableUid = mostCommonTableUid(rows);
    if (tableUid !== expectedTableUid) {
      throw new Error(`This file is for "${tableUid || "an unknown table"}", not "${expectedTableUid}".`);
    }
    return rows.map(row => ({
      ship: row.ship,
      repair_hours: number(row, "repair_hours"),
      failure_rate: number(row, "failure_rate"),
      failures: [
        number(row, "propulsion_failures"), number(row, "electrical_failures"),
        number(row, "combat_systems_failures"), number(row, "auxiliary_failures")
      ],
      uptime: [
        number(row, "engineering_uptime"), number(row, "combat_systems_uptime"),
        number(row, "communications_uptime"), number(row, "navigation_uptime")
      ],
      weekly_repairs: Array.from({length: 8}, (_, index) => number(row, `repairs_week_${index + 1}`)),
      is_this_ship: /^(true|yes|1)$/i.test(row.is_this_ship || ""),
      long_repairs: Array.from({length: 3}, (_, index) => {
        const slot = index + 1;
        return row[`long_repair_${slot}`]
          ? [[row[`long_repair_${slot}`], number(row, `long_repair_${slot}_hours`)]]
          : [];
      }).flat()
    }));
  }

  return { TABLE_UID, COLUMNS, parseCsv, exportTable, mostCommonTableUid, importTable };
});
