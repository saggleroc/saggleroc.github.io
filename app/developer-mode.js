(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const mode = document.body.dataset.mode;
  // TEMPORARY PROTOTYPE SCHEMA: child-table metadata is intentionally local
  // to these prototype pages; dashboard records remain a compatibility view.
  const childSpecs = {
    failures:{tableUid:"failures-by-category", order:"category", value:"count", labels:["Propulsion","Electrical","Combat systems","Auxiliary"]},
    uptime:{tableUid:"mission-area-uptime", order:"missionArea", value:"uptimePercent", labels:["Engineering","Combat systems","Communications","Navigation"]},
    weeklyRepairs:{tableUid:"weekly-repairs", order:"weekIndex", value:"repairCount"}
  };
  let documentModel = null;
  let activeSheetUid = null;

  const clone = value => structuredClone(value);
  const table = () => documentModel.tables.find(item => item.uid === "equipment-repair-performance");
  const childTable = uid => documentModel.tables.find(item => item.uid === uid);
  const replaceChildValues = (shipUid, key, values) => {
    const spec = childSpecs[key], target = childTable(spec.tableUid);
    target.rows = target.rows.filter(row => row.values.shipUid !== shipUid);
    values.forEach((value, index) => target.rows.push({
      uid:`${shipUid}-${spec.tableUid}-${index + 1}`,
      values:{shipUid, [spec.order]:spec.labels ? spec.labels[index] : index + 1, ...(key === "weeklyRepairs" ? {weekLabel:`Week ${index + 1}`} : {}), [spec.value]:value}
    }));
  };
  const enrichedRow = row => {
    const values = {};
    Object.keys(row.values).forEach(key => Object.defineProperty(values, key, {
      enumerable:true,
      get:() => row.values[key],
      set:next => { row.values[key] = next; }
    }));
    Object.entries(childSpecs).forEach(([key, spec]) => Object.defineProperty(values, key, {
      enumerable:true,
      get:() => childTable(spec.tableUid).rows.filter(item => item.values.shipUid === row.uid)
        .sort((a,b) => typeof a.values[spec.order] === "number" ? a.values[spec.order] - b.values[spec.order] : 0)
        .map(item => item.values[spec.value]),
      set:next => replaceChildValues(row.uid, key, next)
    }));
    Object.defineProperty(values, "longRepairs", {
      enumerable:true,
      get:() => childTable("recent-long-repairs").rows.filter(item => item.values.shipUid === row.uid).map(item => [item.values.description,item.values.hours]),
      set:next => {
        const target = childTable("recent-long-repairs");
        target.rows = target.rows.filter(item => item.values.shipUid !== row.uid);
        next.forEach((repair,index) => target.rows.push({uid:`${row.uid}-long-repair-${index + 1}`,values:{shipUid:row.uid,description:repair[0],hours:repair[1]}}));
      }
    });
    return {uid:row.uid, values};
  };
  const dashboardRows = () => table().rows.map(enrichedRow);
  const selectedRow = () => dashboardRows().find(row => row.values.isSelectedUnit) || dashboardRows()[0];
  const number = (value, label, minimum = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < minimum) throw new Error(`${label} must be a number of at least ${minimum}.`);
    return parsed;
  };
  const array = (value, length, label) => {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed) || (length && parsed.length !== length)) throw new Error(`${label} must be a JSON array${length ? ` with ${length} items` : ""}.`);
    return parsed;
  };
  const slug = value => String(value || "ship").toLowerCase().replace(/^uss\s+/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function packetToDocument(packet) {
    const now = new Date().toISOString();
    return {
      format:"EIGHT-OCLOCK-REPORT",
      version:2,
      uid:`equipment-readiness-${now.slice(0, 10)}`,
      generatedAt:now,
      report:{uid:"equipment-readiness", title:"Equipment Readiness", subtitle:"Imported Eight O'Clock Report message", unitUid:"selected-unit", asOf:packet.as_of},
      tables:normalizedTables(packet.records, packet.as_of),
      extensions:{shipboardPrototype:true,temporaryPrototypeSchema:true}
    };
  }

  function normalizedTables(records, asOf) {
    const main = {
        uid:"equipment-repair-performance",
        title:"Equipment Repair Performance",
        source:{uid:"eight-oclock-message", title:"Imported Eight O'Clock Report message", asOf},
        columns:[
          {uid:"ship",title:"Ship",type:"string",required:true},
          {uid:"repairHours",title:"Mean Repair Time",type:"number",unit:"hours",required:true},
          {uid:"isSelectedUnit",title:"Selected Unit",type:"boolean"},
          {uid:"failureRate",title:"Failure Rate",type:"number"}
        ],
        rows:records.map((record, index) => ({
          uid:slug(record.ship) || `row-${index + 1}`,
          values:{
            ship:String(record.ship),
            repairHours:Number(record.repair_hours),
            isSelectedUnit:Boolean(record.is_this_ship),
            failureRate:Number(record.failure_rate || 0)
          }
        }))
      };
    const source = main.source;
    const make = (uid,title,columns,rows) => ({uid,title,source:clone(source),columns,rows});
    const failures=[], uptime=[], longRepairs=[], weekly=[];
    main.rows.forEach((row,index) => {
      const record=records[index];
      (record.failures || [0,0,0,0]).forEach((count,i) => failures.push({uid:`${row.uid}-failure-${i+1}`,values:{shipUid:row.uid,category:childSpecs.failures.labels[i],count:Number(count)}}));
      (record.uptime || [0,0,0,0]).forEach((value,i) => uptime.push({uid:`${row.uid}-uptime-${i+1}`,values:{shipUid:row.uid,missionArea:childSpecs.uptime.labels[i],uptimePercent:Number(value)}}));
      (record.long_repairs || []).forEach((repair,i) => longRepairs.push({uid:`${row.uid}-long-repair-${i+1}`,values:{shipUid:row.uid,description:String(repair[0]),hours:Number(repair[1])}}));
      (record.weekly_repairs || [0,0,0,0,0,0,0,0]).forEach((count,i) => weekly.push({uid:`${row.uid}-week-${i+1}`,values:{shipUid:row.uid,weekIndex:i+1,weekLabel:`Week ${i+1}`,repairCount:Number(count)}}));
    });
    return [
      main,
      make("failures-by-category","Failures by Category",[{uid:"shipUid",title:"Ship UID",type:"string",required:true},{uid:"category",title:"Category",type:"string",required:true},{uid:"count",title:"Count",type:"number",required:true}],failures),
      make("mission-area-uptime","Mission-area Uptime",[{uid:"shipUid",title:"Ship UID",type:"string",required:true},{uid:"missionArea",title:"Mission Area",type:"string",required:true},{uid:"uptimePercent",title:"Uptime",type:"number",required:true}],uptime),
      make("recent-long-repairs","Recent Long Repairs",[{uid:"shipUid",title:"Ship UID",type:"string",required:true},{uid:"description",title:"Description",type:"string",required:true},{uid:"hours",title:"Hours",type:"number",required:true}],longRepairs),
      make("weekly-repairs","Weekly Repairs",[{uid:"shipUid",title:"Ship UID",type:"string",required:true},{uid:"weekIndex",title:"Week Index",type:"number",required:true},{uid:"weekLabel",title:"Week Label",type:"string",required:true},{uid:"repairCount",title:"Repair Count",type:"number",required:true}],weekly)
    ];
  }

  async function parseInput(text) {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Choose a file or paste data first.");
    if (trimmed.startsWith("{")) return JSON.parse(trimmed);
    const decoded = await EightOClockReport.decodeMessage(text);
    if (decoded.f !== "ND1" || !Array.isArray(decoded.r)) throw new Error("This Eight O'Clock Report packet is not an equipment-readiness message.");
    return packetToDocument({
      as_of:decoded.t,
      records:decoded.r.map(row => ({
        ship:row[0], repair_hours:row[1], is_this_ship:row[2] === 1, failure_rate:row[3] ?? 0,
        failures:row[4], uptime:row[5], long_repairs:row[6], weekly_repairs:row[7]
      }))
    });
  }

  function validate(model) {
    if (model?.format !== "EIGHT-OCLOCK-REPORT" || model.version !== 2) throw new Error("Expected a canonical Eight O'Clock Report version 2 JSON document.");
    const source = model.tables?.find(item => item.uid === "equipment-repair-performance");
    if (!source?.rows?.length) throw new Error('The "equipment-repair-performance" table has no rows.');
    ["failures-by-category","mission-area-uptime","recent-long-repairs","weekly-repairs"].forEach(uid => {
      if (!model.tables.some(item => item.uid === uid)) throw new Error(`The normalized "${uid}" table is required.`);
    });
    documentModel = model;
    source.rows.forEach((row, index) => {
      const value = row.values;
      if (!value || !String(value.ship || "").trim()) throw new Error(`Row ${index + 1} needs a ship name.`);
      number(value.repairHours, `${value.ship} repair time`);
      number(value.failureRate, `${value.ship} failure rate`);
      const joined = enrichedRow(row).values;
      array(joined.failures, 4, `${value.ship} failures`).forEach((item, i) => number(item, `Failure ${i + 1}`));
      array(joined.uptime, 4, `${value.ship} uptime`).forEach((item, i) => number(item, `Uptime ${i + 1}`));
      array(joined.weeklyRepairs, 8, `${value.ship} weekly repairs`).forEach((item, i) => number(item, `Week ${i + 1}`));
      array(joined.longRepairs, null, `${value.ship} long repairs`);
    });
    return model;
  }

  function metrics() {
    const rows = dashboardRows();
    const selected = rows.find(row => row.values.isSelectedUnit) || rows[0];
    const sorted = [...rows].sort((a, b) => a.values.repairHours - b.values.repairHours);
    return {
      selected,
      average:rows.reduce((sum, row) => sum + Number(row.values.repairHours), 0) / rows.length,
      rank:sorted.indexOf(selected) + 1
    };
  }

  function renderSummary() {
    const {selected, average, rank} = metrics();
    $("shipName").textContent = selected.values.ship;
    $("asOf").textContent = new Date(documentModel.report.asOf || documentModel.generatedAt).toLocaleString();
    $("selectedMetric").textContent = `${Number(selected.values.repairHours).toFixed(1)} hr`;
    $("averageMetric").textContent = `${average.toFixed(1)} hr`;
    $("rankMetric").textContent = `${rank} of ${table().rows.length}`;
    $("failureMetric").textContent = Number(selected.values.failureRate).toFixed(1);
  }

  function editableText(value, onCommit, kind = "number") {
    const element = document.createElement("span");
    element.className = "editable";
    element.contentEditable = "true";
    element.spellcheck = false;
    element.textContent = value;
    element.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); element.blur(); }
      if (event.key === "Escape") { element.textContent = value; element.blur(); }
    });
    element.addEventListener("blur", () => {
      try {
        onCommit(kind === "number" ? number(element.textContent, "Value") : element.textContent.trim());
        renderDirect();
        setStatus("Value updated; linked metrics recalculated.", "ok");
      } catch (error) {
        element.textContent = value;
        setStatus(error.message, "error");
      }
    });
    return element;
  }

  function renderDirect() {
    renderSummary();
    const {selected, average} = metrics();
    const rows = dashboardRows();
    const maximum = Math.max(...rows.map(row => row.values.repairHours), average) * 1.08;
    const chart = $("modeContent");
    chart.replaceChildren();
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Dashed values are raw data and editable. Fleet average and rank are calculated and read-only.";
    chart.append(hint);

    const comparison = section("Repair time comparison");
    rows.forEach(row => {
      const line = document.createElement("div");
      line.className = `chart-row${row.uid === selected.uid ? " selected" : ""}`;
      line.append(editableText(row.values.ship, value => { row.values.ship = value; }, "text"));
      const track = document.createElement("div");
      track.className = "track";
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.width = `${row.values.repairHours / maximum * 100}%`;
      track.append(bar);
      line.append(track, editableText(Number(row.values.repairHours).toFixed(1), value => { row.values.repairHours = value; }));
      comparison.append(line);
    });
    chart.append(comparison);

    const detail = document.createElement("div");
    detail.className = "grid-two";
    detail.append(
      scalarEditor("Failure rate", selected.values.failureRate, value => { selected.values.failureRate = value; }),
      arrayEditor("Failures by category", selected.values.failures, ["Propulsion","Electrical","Combat systems","Auxiliary"], values => { selected.values.failures = values; }),
      arrayEditor("Mission-area uptime", selected.values.uptime, ["Engineering","Combat systems","Communications","Navigation"], values => { selected.values.uptime = values; }),
      arrayEditor("Repairs by week", selected.values.weeklyRepairs, selected.values.weeklyRepairs.map((_, i) => `Week ${i + 1}`), values => { selected.values.weeklyRepairs = values; }),
      longRepairEditor(selected)
    );
    chart.append(detail);
  }

  function scalarEditor(title, value, save) {
    const container = section(title);
    const card = document.createElement("div");
    card.className = "value-card";
    card.append(editableText(String(value), save));
    container.append(card);
    return container;
  }

  function section(title) {
    const element = document.createElement("section");
    element.className = "card";
    const heading = document.createElement("h2");
    heading.textContent = title;
    element.append(heading);
    return element;
  }

  function arrayEditor(title, values, labels, save) {
    const container = section(title);
    const grid = document.createElement("div");
    grid.className = "value-grid";
    values.forEach((value, index) => {
      const card = document.createElement("div");
      card.className = "value-card";
      const label = document.createElement("span");
      label.textContent = labels[index];
      card.append(label, editableText(String(value), next => {
        const copy = [...values];
        copy[index] = next;
        save(copy);
      }));
      grid.append(card);
    });
    container.append(grid);
    return container;
  }

  function longRepairEditor(selected) {
    const container = section("Recent long repairs");
    selected.values.longRepairs.forEach((repair, index) => {
      const row = document.createElement("div");
      row.className = "chart-row";
      row.append(
        editableText(String(repair[0]), value => { const next=selected.values.longRepairs; next[index][0]=value; selected.values.longRepairs=next; }, "text"),
        document.createElement("span"),
        editableText(String(repair[1]), value => { const next=selected.values.longRepairs; next[index][1]=value; selected.values.longRepairs=next; })
      );
      container.append(row);
    });
    return container;
  }

  function csvEscape(value) {
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function tableToCsv(sourceTable) {
    const columns = ["__row_uid", ...sourceTable.columns.map(column => column.uid)];
    return [
      columns.join(","),
      ...sourceTable.rows.map(row => columns.map(column => csvEscape(column === "__row_uid" ? row.uid : row.values[column])).join(","))
    ].join("\r\n");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], value = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
        else if (char === '"') quoted = false;
        else value += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") { row.push(value); value = ""; }
      else if (char === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
      else value += char;
    }
    if (value || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
    return rows.filter(item => item.some(cell => cell.trim()));
  }

  function applyTableCsv(sourceTable, text) {
    const rows = parseCsv(text);
    const headers = rows.shift();
    const expected = ["__row_uid", ...sourceTable.columns.map(column => column.uid)];
    if (!headers || expected.some((field, index) => headers[index] !== field)) throw new Error(`CSV header must be: ${expected.join(",")}`);
    const seen = new Set();
    sourceTable.rows = rows.map((cells, index) => {
      const raw = Object.fromEntries(expected.map((field, cellIndex) => [field, cells[cellIndex] ?? ""]));
      const uid = raw.__row_uid.trim() || `new-row-${Date.now()}-${index + 1}`;
      if (seen.has(uid)) throw new Error(`Duplicate row UID "${uid}".`);
      seen.add(uid);
      const values = {};
      sourceTable.columns.forEach(column => {
        const value = raw[column.uid];
        values[column.uid] = column.type === "number" ? number(value, `${column.title || column.uid}, row ${index + 1}`)
          : column.type === "boolean" ? /^(true|1|yes)$/i.test(value)
          : value;
      });
      return {uid, values};
    });
    validate(documentModel);
  }

  function renderCsv() {
    const container = $("modeContent");
    container.replaceChildren();
    activeSheetUid = documentModel.tables.some(item => item.uid === activeSheetUid) ? activeSheetUid : documentModel.tables[0].uid;
    const sourceTable = documentModel.tables.find(item => item.uid === activeSheetUid);
    const card = section("Integrated CSV editor");
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = "Each normalized JSON table has its own CSV sheet. Every CSV cell contains one scalar value.";
    const sheetTabs = document.createElement("div");
    sheetTabs.className = "sheet-tabs";
    documentModel.tables.forEach(item => {
      const button = document.createElement("button");
      button.className = `sheet-tab${item === sourceTable ? " active" : ""}`;
      button.textContent = item.title || item.uid;
      button.addEventListener("click", () => {
        activeSheetUid = item.uid;
        renderCsv();
      });
      sheetTabs.append(button);
    });
    const editor = document.createElement("textarea");
    editor.id = "csvEditor";
    editor.className = "csv-editor";
    editor.spellcheck = false;
    editor.value = tableToCsv(sourceTable);
    const apply = document.createElement("button");
    apply.textContent = "Apply CSV changes";
    apply.addEventListener("click", () => {
      try {
        applyTableCsv(sourceTable, editor.value);
        renderSummary();
        editor.value = tableToCsv(sourceTable);
        setStatus(`${sourceTable.title || sourceTable.uid} CSV changes applied; linked metrics recalculated.`, "ok");
      } catch (error) { setStatus(`CSV not applied: ${error.message}`, "error"); }
    });
    card.append(note, sheetTabs, editor, apply);
    container.append(card);
  }

  function inputFor(value, commit, options = {}) {
    const input = document.createElement("input");
    input.value = options.json ? JSON.stringify(value) : String(value);
    if (options.type) input.type = options.type;
    if (options.wide) input.className = "wide";
    input.addEventListener("change", () => {
      try {
        commit(options.json ? array(input.value, options.length, options.label) : options.type === "number" ? number(input.value, options.label) : input.value.trim());
        validate(documentModel);
        renderSummary();
        if (mode === "tables") renderTableDashboard();
        setStatus("Table value updated; linked metrics recalculated.", "ok");
      } catch (error) { setStatus(error.message, "error"); }
    });
    return input;
  }

  function renderTables() {
    const container = $("modeContent");
    container.replaceChildren();
    activeSheetUid = documentModel.tables.some(item => item.uid === activeSheetUid) ? activeSheetUid : documentModel.tables[0].uid;
    const sourceTable = documentModel.tables.find(item => item.uid === activeSheetUid);
    const selectedRows = new Set();
    const workbook = section("Shipboard data workbook");
    workbook.classList.add("sheet-card");
    const note = document.createElement("p");
    note.className = "sheet-note";
    note.textContent = "Each JSON table is a sheet. Edit cells, add rows, or select multiple rows for deletion; the Dashboard tab remains read-only.";
    const sheetTabs = document.createElement("div");
    sheetTabs.className = "sheet-tabs";
    documentModel.tables.forEach(item => {
      const button = document.createElement("button");
      button.className = `sheet-tab${item === sourceTable ? " active" : ""}`;
      button.textContent = item.title || item.uid;
      button.addEventListener("click", () => {
        activeSheetUid = item.uid;
        renderTables();
      });
      sheetTabs.append(button);
    });
    const tools = document.createElement("div");
    tools.className = "sheet-tools";
    const addRow = document.createElement("button");
    addRow.textContent = "＋ Add row";
    addRow.addEventListener("click", () => {
      const sample = sourceTable.rows[0]?.values || {};
      const values = Object.fromEntries(sourceTable.columns.map(column => [column.uid, defaultCellValue(column, sample[column.uid])]));
      const uid=`new-row-${Date.now()}`;
      sourceTable.rows.push({uid, values});
      if (sourceTable.uid === "equipment-repair-performance") {
        replaceChildValues(uid, "failures", [0,0,0,0]);
        replaceChildValues(uid, "uptime", [0,0,0,0]);
        replaceChildValues(uid, "weeklyRepairs", [0,0,0,0,0,0,0,0]);
      }
      renderTables();
      refreshTableDashboard();
      setStatus(`Added a row to ${sourceTable.title || sourceTable.uid}.`, "ok");
    });
    const deleteRows = document.createElement("button");
    deleteRows.className = "secondary";
    deleteRows.textContent = "Delete selected";
    deleteRows.addEventListener("click", () => {
      if (!selectedRows.size) return setStatus("Select one or more row checkboxes first.", "error");
      if (sourceTable.uid === "equipment-repair-performance" && selectedRows.size === sourceTable.rows.length) {
        return setStatus("Keep at least one row in the demonstration table so the dashboard can render.", "error");
      }
      sourceTable.rows = sourceTable.rows.filter(row => !selectedRows.has(row.uid));
      if (sourceTable.uid === "equipment-repair-performance") {
        documentModel.tables.slice(1).forEach(child => {
          child.rows = child.rows.filter(row => !selectedRows.has(row.values.shipUid));
        });
      }
      renderTables();
      refreshTableDashboard();
      setStatus(`Deleted ${selectedRows.size} row${selectedRows.size === 1 ? "" : "s"}.`, "ok");
    });
    tools.append(addRow, deleteRows);
    const wrap = document.createElement("div");
    wrap.className = "table-wrap sheet-wrap";
    const element = document.createElement("table");
    element.className = "sheet";
    const head = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["✓", "#", ...sourceTable.columns.map(column => column.title || column.uid)].forEach(header => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.append(th);
    });
    head.append(headerRow);
    element.append(head);
    const body = document.createElement("tbody");
    sourceTable.rows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      const add = child => { const td = document.createElement("td"); td.append(child); tr.append(td); };
      const choose = document.createElement("input");
      choose.type = "checkbox";
      choose.setAttribute("aria-label", `Select row ${rowIndex + 1} for deletion`);
      choose.addEventListener("change", () => {
        if (choose.checked) selectedRows.add(row.uid);
        else selectedRows.delete(row.uid);
        tr.classList.toggle("selected-sheet-row", choose.checked);
      });
      add(choose);
      const rowNumber = document.createElement("td");
      rowNumber.className = "row-number";
      rowNumber.textContent = String(rowIndex + 1);
      tr.append(rowNumber);
      sourceTable.columns.forEach(column => {
        const value = row.values[column.uid];
        const input = document.createElement("input");
        if (column.type === "boolean") {
          input.type = "checkbox";
          input.checked = Boolean(value);
        } else {
          input.type = column.type === "number" ? "number" : "text";
          input.value = column.type === "array" || (value && typeof value === "object") ? JSON.stringify(value) : String(value ?? "");
          if (column.type === "string") input.className = "ship-cell";
        }
        input.setAttribute("aria-label", `${column.title || column.uid}, row ${rowIndex + 1}`);
        input.addEventListener("change", () => {
          const previous = clone(row.values[column.uid]);
          try {
            row.values[column.uid] = column.type === "boolean" ? input.checked
              : column.type === "number" ? number(input.value, column.title || column.uid)
              : column.type === "array" ? array(input.value, null, column.title || column.uid)
              : input.value;
            validate(documentModel);
            refreshTableDashboard();
            setStatus(`Updated ${column.title || column.uid} in row ${rowIndex + 1}.`, "ok");
          } catch (error) {
            row.values[column.uid] = previous;
            if (column.type === "boolean") input.checked = Boolean(previous);
            else input.value = typeof previous === "object" ? JSON.stringify(previous) : String(previous ?? "");
            setStatus(error.message, "error");
          }
        });
        add(input);
      });
      body.append(tr);
    });
    element.append(body);
    wrap.append(element);
    workbook.append(note, sheetTabs, tools, wrap);
    container.append(workbook);
    refreshTableDashboard();
    setupTableTabs();
  }

  function defaultCellValue(column, sample) {
    if (column.type === "boolean") return false;
    if (column.type === "number") return 0;
    if (column.type === "array") {
      if (column.uid === "longRepairs") return [];
      if (!Array.isArray(sample)) return [];
      return sample.map(item => Array.isArray(item) ? item.map(value => typeof value === "number" ? 0 : "") : typeof item === "number" ? 0 : "");
    }
    return column.required ? "New row" : "";
  }

  function refreshTableDashboard() {
    if (!documentModel.tables.some(item => item.uid === "equipment-repair-performance")) return;
    renderSummary();
    renderTableDashboard();
  }

  function renderTableDashboard() {
    const container = $("dashboardVisuals");
    if (!container) return;
    container.replaceChildren();
    const {selected, average} = metrics();
    const rows = dashboardRows();
    const maximum = Math.max(...rows.map(row => row.values.repairHours), average) * 1.08;
    const comparison = section("Repair time comparison");
    rows.forEach(row => {
      const line = document.createElement("div");
      line.className = `chart-row${row.uid === selected.uid ? " selected" : ""}`;
      const name = document.createElement("span");
      name.textContent = row.values.ship;
      const track = document.createElement("div");
      track.className = "track";
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.width = `${row.values.repairHours / maximum * 100}%`;
      const value = document.createElement("span");
      value.textContent = `${Number(row.values.repairHours).toFixed(1)} hr`;
      track.append(bar);
      line.append(name, track, value);
      comparison.append(line);
    });
    const details = document.createElement("div");
    details.className = "grid-two";
    const failure = section("Failures by category");
    failure.append(readOnlyValues(["Propulsion","Electrical","Combat systems","Auxiliary"], selected.values.failures));
    const uptime = section("Mission-area uptime");
    uptime.append(readOnlyValues(["Engineering","Combat systems","Communications","Navigation"], selected.values.uptime, "%"));
    details.append(failure, uptime);
    container.append(comparison, details);
  }

  function readOnlyValues(labels, values, suffix = "") {
    const grid = document.createElement("div");
    grid.className = "value-grid";
    values.forEach((value, index) => {
      const card = document.createElement("div");
      card.className = "value-card";
      const label = document.createElement("span");
      label.className = "muted";
      label.textContent = labels[index];
      const display = document.createElement("strong");
      display.textContent = `${value}${suffix}`;
      card.append(label, display);
      grid.append(card);
    });
    return grid;
  }

  function setupTableTabs() {
    const activate = name => {
      const dashboardActive = name === "dashboard";
      $("dashboardPane").hidden = !dashboardActive;
      $("editorPane").hidden = dashboardActive;
      $("dashboardTab").classList.toggle("active", dashboardActive);
      $("editorTab").classList.toggle("active", !dashboardActive);
      $("dashboardTab").setAttribute("aria-selected", String(dashboardActive));
      $("editorTab").setAttribute("aria-selected", String(!dashboardActive));
      if (dashboardActive) {
        renderSummary();
        renderTableDashboard();
      }
    };
    $("dashboardTab").onclick = () => activate("dashboard");
    $("editorTab").onclick = () => activate("editor");
  }

  function render() {
    renderSummary();
    ({direct:renderDirect, csv:renderCsv, tables:renderTables})[mode]();
    $("workspace").hidden = false;
  }

  function setStatus(message, type = "") {
    $("status").className = type;
    $("status").textContent = message;
  }

  async function load() {
    try {
      documentModel = validate(await parseInput($("sourceText").value));
      render();
      setStatus(`Loaded ${table().rows.length} ships.`, "ok");
    } catch (error) {
      $("workspace").hidden = true;
      setStatus(`Not loaded: ${error.message}`, "error");
    }
  }

  function download() {
    try {
      validate(documentModel);
      const exported = clone(documentModel);
      const now = new Date();
      const selected = selectedRow().values.ship;
      exported.generatedAt = now.toISOString();
      exported.uid = `${slug(selected)}-ship-edits-${now.toISOString().slice(0, 10)}`;
      exported.extensions = {
        ...(exported.extensions || {}),
        shipEdits:{editedAboardShip:true, editedAt:now.toISOString(), unit:selected, prototypeMode:mode}
      };
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2) + "\n"], {type:"application/json"}));
      link.download = `${slug(selected)}-ship-edits-${now.toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setStatus(`Downloaded ${link.download}.`, "ok");
    } catch (error) { setStatus(`Not saved: ${error.message}`, "error"); }
  }

  $("sourceFile").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (file) { $("sourceText").value = await file.text(); await load(); }
  });
  $("loadData").addEventListener("click", load);
  $("saveJson").addEventListener("click", download);
})();
