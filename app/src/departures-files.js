(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EightOClockDepartures = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TABLE_UID = "ship-departures-from-spec";
  const COLUMNS = ["__table_uid", "department", "specification", "departure", "operational_impact", "corrective_action", "owner", "due_date", "status"];

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

  const csvCell = value => {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  function exportCsv(rows = []) {
    const values = rows.length ? rows : [{
      department: "", specification: "", departure: "", operationalImpact: "",
      correctiveAction: "", owner: "", dueDate: "", status: ""
    }];
    return [COLUMNS, ...values.map(row => [
      TABLE_UID, row.department, row.specification, row.departure, row.operationalImpact,
      row.correctiveAction, row.owner, row.dueDate, row.status
    ])].map(row => row.map(csvCell).join(",")).join("\r\n");
  }

  function importCsv(text) {
    const matrix = parseCsv(text);
    const headers = (matrix.shift() || []).map(value => value.trim());
    for (const required of COLUMNS) {
      if (!headers.includes(required)) throw new Error(`Missing required column "${required}".`);
    }
    return matrix.filter(values => values.some((value, index) => index > 0 && String(value).trim())).map((values, index) => {
      const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
      if (String(row.__table_uid).trim() !== TABLE_UID) throw new Error(`Row ${index + 2} is not a departures row.`);
      if (!String(row.departure).trim()) throw new Error(`Row ${index + 2} must describe a departure.`);
      return {
        department: row.department.trim(),
        specification: row.specification.trim(),
        departure: row.departure.trim(),
        operationalImpact: row.operational_impact.trim(),
        correctiveAction: row.corrective_action.trim(),
        owner: row.owner.trim(),
        dueDate: row.due_date.trim(),
        status: row.status.trim()
      };
    });
  }

  return { TABLE_UID, COLUMNS, parseCsv, exportCsv, importCsv };
});
