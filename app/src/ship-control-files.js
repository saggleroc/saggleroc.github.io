(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EightOClockShipControls = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SPECS = {
    tso: {
      tableUid: "ship-tso",
      columns: ["number", "date", "department", "related_condition", "control"],
      required: ["number", "department", "control"]
    },
    dfs: {
      tableUid: "ship-dfs",
      columns: ["number", "date", "department", "type", "related_condition", "deviation"],
      required: ["number", "department", "type", "deviation"]
    }
  };

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    text = String(text).replace(/^\uFEFF/, "");
    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (quoted) {
        if (character === '"' && text[index + 1] === '"') { field += '"'; index++; }
        else if (character === '"') quoted = false;
        else field += character;
      } else if (character === '"') quoted = true;
      else if (character === ",") { row.push(field); field = ""; }
      else if (character === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (character !== "\r") field += character;
    }
    row.push(field);
    if (row.some(value => value !== "") || !rows.length) rows.push(row);
    return rows;
  }

  function csvCell(value) {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function getSpec(kind) {
    const spec = SPECS[kind];
    if (!spec) throw new Error(`Unknown ship dataset "${kind}".`);
    return spec;
  }

  function exportCsv(kind, rows = []) {
    const spec = getSpec(kind);
    const headers = ["__table_uid", ...spec.columns];
    const outputRows = rows.length ? rows : [{}];
    return [headers, ...outputRows.map(row => [spec.tableUid, ...spec.columns.map(column => row[column] ?? "")])]
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");
  }

  function importCsv(kind, text) {
    const spec = getSpec(kind);
    const matrix = parseCsv(text);
    const headers = (matrix.shift() || []).map(value => value.trim());
    for (const column of ["__table_uid", ...spec.columns]) {
      if (!headers.includes(column)) throw new Error(`Missing required column "${column}".`);
    }
    return matrix
      .filter(values => values.some((value, index) => index > 0 && String(value).trim()))
      .map((values, index) => {
        const source = Object.fromEntries(headers.map((header, column) => [header, String(values[column] ?? "").trim()]));
        if (source.__table_uid !== spec.tableUid) throw new Error(`Row ${index + 2} is not for the ${kind.toUpperCase()} dataset.`);
        for (const column of spec.required) {
          if (!source[column]) throw new Error(`Row ${index + 2} requires "${column}".`);
        }
        return Object.fromEntries(spec.columns.map(column => [column, source[column]]));
      });
  }

  return { SPECS, parseCsv, exportCsv, importCsv };
});
