export const EIGHT_OCLOCK_FORMAT = "EIGHT-OCLOCK-REPORT";
export const EIGHT_OCLOCK_VERSION = 2;

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function validateDocument(document) {
  const errors = [];
  const add = (code, path, message) => errors.push({ code, path, message });

  if (!isObject(document)) {
    add("document.type", "$", "Document must be a JSON object.");
    return { valid: false, errors };
  }
  if (document.format !== EIGHT_OCLOCK_FORMAT) add("document.format", "$.format", `Expected "${EIGHT_OCLOCK_FORMAT}".`);
  if (document.version !== EIGHT_OCLOCK_VERSION) add("document.version", "$.version", `Expected version ${EIGHT_OCLOCK_VERSION}.`);
  for (const field of ["uid", "generatedAt"]) {
    if (typeof document[field] !== "string" || !document[field].trim()) add(`document.${field}`, `$.${field}`, `${field} is required.`);
  }
  if (document.generatedAt && Number.isNaN(Date.parse(document.generatedAt))) {
    add("document.generatedAt.invalid", "$.generatedAt", "generatedAt must be an ISO-compatible timestamp.");
  }
  if (!isObject(document.report)) add("document.report", "$.report", "Report metadata is required.");
  if (!Array.isArray(document.tables) || document.tables.length === 0) {
    add("document.tables", "$.tables", "At least one table is required.");
  } else {
    const tableUids = new Set();
    document.tables.forEach((table, tableIndex) => {
      const path = `$.tables[${tableIndex}]`;
      if (!isObject(table)) return add("table.type", path, "Table must be an object.");
      if (!table.uid || typeof table.uid !== "string") add("table.uid", `${path}.uid`, "Table UID is required.");
      else if (tableUids.has(table.uid)) add("table.uid.duplicate", `${path}.uid`, `Duplicate table UID "${table.uid}".`);
      else tableUids.add(table.uid);
      if (!Array.isArray(table.columns)) add("table.columns", `${path}.columns`, "Columns must be an array.");
      if (!Array.isArray(table.rows)) add("table.rows", `${path}.rows`, "Rows must be an array.");
      const rowUids = new Set();
      if (Array.isArray(table.rows)) table.rows.forEach((row, rowIndex) => {
        const rowPath = `${path}.rows[${rowIndex}]`;
        if (!isObject(row) || typeof row.uid !== "string" || !row.uid) add("row.uid", `${rowPath}.uid`, "Row UID is required.");
        else if (rowUids.has(row.uid)) add("row.uid.duplicate", `${rowPath}.uid`, `Duplicate row UID "${row.uid}".`);
        else rowUids.add(row.uid);
        if (!isObject(row?.values)) add("row.values", `${rowPath}.values`, "Row values must be an object.");
      });
    });
  }
  return { valid: errors.length === 0, errors };
}

export function equipmentReadinessRecords(document) {
  const validation = validateDocument(document);
  if (!validation.valid) throw new Error(validation.errors[0].message);
  const table = document.tables.find(item => item.uid === "equipment-repair-performance");
  if (!table) throw new Error('Required table "equipment-repair-performance" was not found.');

  // TEMPORARY PROTOTYPE SCHEMA: normalized child tables are joined here so
  // transport and viewer consumers can continue using their legacy record shape.
  const children = normalizedReadinessChildren(document);
  return table.rows.map((row, index) => {
    const value = row.values;
    if (typeof value.ship !== "string" || !value.ship.trim()) throw new Error(`Row ${index + 1} has no ship name.`);
    if (!Number.isFinite(value.repairHours) || value.repairHours < 0) throw new Error(`Row ${index + 1} has invalid repairHours.`);
    return {
      ship: value.ship,
      repair_hours: value.repairHours,
      is_this_ship: Boolean(value.isSelectedUnit),
      failure_rate: finiteNumber(value.failureRate, `Row ${index + 1} failureRate`),
      failures: orderedValues(children.failures, row.uid, "category", "count", 4, `Row ${index + 1} failures`),
      uptime: orderedValues(children.uptime, row.uid, "missionArea", "uptimePercent", 4, `Row ${index + 1} uptime`),
      long_repairs: children.longRepairs.filter(item => item.shipUid === row.uid).map(item => [item.description, finiteNumber(item.hours, `${value.ship} repair hours`)]),
      weekly_repairs: orderedValues(children.weeklyRepairs, row.uid, "weekIndex", "repairCount", 8, `Row ${index + 1} weeklyRepairs`)
    };
  });
}

function normalizedReadinessChildren(document) {
  const rows = uid => {
    const table = document.tables.find(item => item.uid === uid);
    if (!table?.rows) throw new Error(`Required table "${uid}" was not found.`);
    return table.rows.map(row => row.values);
  };
  return {
    failures: rows("failures-by-category"),
    uptime: rows("mission-area-uptime"),
    longRepairs: rows("recent-long-repairs"),
    weeklyRepairs: rows("weekly-repairs")
  };
}

function orderedValues(rows, shipUid, orderField, valueField, length, label) {
  const values = rows.filter(item => item.shipUid === shipUid)
    .sort((a, b) => typeof a[orderField] === "number" ? a[orderField] - b[orderField] : 0)
    .map(item => item[valueField]);
  return numberArray(values, length, label);
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a number.`);
  return value;
}

function numberArray(value, length, label) {
  if (!Array.isArray(value) || value.length !== length || value.some(item => !Number.isFinite(item))) {
    throw new Error(`${label} must contain ${length} numbers.`);
  }
  return [...value];
}
