(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  const departments = {
    ENG:{label:"Engineering",color:"#2378a9"}, OPS:{label:"Operations",color:"#0c8b8c"},
    CS:{label:"Combat Systems",color:"#6554a6"}, WEPS:{label:"Weapons",color:"#b36b00"},
    SUP:{label:"Supply",color:"#1f7a45"}
  };
  const levels = ["supervisor", "journeyman", "apprentice"];
  let currentReport = null;
  const shipControls = { tso: [], dfs: [] };
  const setShipDataStatus = message => {
    $("shipDataStatus").textContent = message;
    $("modalShipDataStatus").textContent = message;
  };

  const pct = (value, total) => total ? Math.round(value / total * 100) : 0;
  const state = value => value < 80 ? "bad" : value < 90 ? "watch" : "good";
  const totalManning = rows => rows.reduce((total, row) => {
    levels.forEach(level => {
      total.required += Number(row[level]?.required || 0);
      total.onboard += Number(row[level]?.onboard || 0);
    });
    return total;
  }, {required:0, onboard:0});

  function validate(data) {
    if (!data || data.format !== "EIGHT-OCLOCK-REPORT") throw new Error("Expected an Eight O'Clock Report.");
    if (!data.report?.ship?.name) throw new Error("The report has no ship identity.");
    for (const key of ["missionAreas", "manning", "casreps", "necs"]) {
      if (!Array.isArray(data[key])) throw new Error(`${key} must be an array.`);
    }
    return data;
  }

  function header(data, title, page, count) {
    const ship = data.report.ship;
    return `<header class="page-header"><div class="brand">Eight O'Clock Report<small>${esc(title)}</small></div>
      <div class="ship-id"><div class="ship-name">${esc(ship.name)}</div><div class="ship-meta">${esc(ship.hullNumber)} · UIC ${esc(ship.uic)} · Page ${page} of ${count}</div></div></header>`;
  }

  const footer = data => `<footer class="page-footer"><span>${esc(data.report.classification || "UNCLASSIFIED")} · Data as of ${esc(new Date(data.report.asOf || data.generatedAt).toLocaleString())}</span><span>BA = required · COB = onboard · RE = readiness evaluation</span></footer>`;
  const tag = (text, type) => `<span class="tag ${type}">${esc(text)}</span>`;

  function overview(data, count) {
    const manning = totalManning(data.manning), fill = pct(manning.onboard, manning.required);
    const significant = data.casreps.filter(row => ["C3", "C4"].includes(row.category));
    const gaps = data.necs.filter(row => Number(row.onboard) < Number(row.required));
    const uncertified = data.missionAreas.filter(row => !row.certified);
    const low = data.missionAreas.filter(row => Number(row.readiness) < 80);
    const noTeam = data.missionAreas.filter(row => !row.trainingTeam);
    const readiness = Math.max(0, Math.round(fill * .28 + (100-Math.min(significant.length*18,100))*.2 + (100-Math.min(gaps.length*4,100))*.18 + (100-Math.min(uncertified.length*25,100))*.15 + (100-Math.min(low.length*6,100))*.11 + (100-Math.min(noTeam.length*20,100))*.08));
    const color = readiness >= 85 ? "var(--green)" : readiness >= 75 ? "var(--amber)" : "var(--red)";
    const cards = [
      ["Ship Manning BA vs COB", `${manning.onboard} / ${manning.required}`, `${fill}% filled`, state(fill)],
      ["Significant CASREPs", significant.length, "C3/C4 command attention", significant.length ? "bad" : "good"],
      ["NEC Gaps", gaps.length, `${data.necs.length} requirements assessed`, gaps.length > 5 ? "watch" : "good"],
      ["Uncertified Mission Areas", uncertified.length, `${data.missionAreas.length} areas assessed`, uncertified.length ? "bad" : "good"],
      ["Mission Areas RE Below 80%", low.length, "Readiness threshold = 80%", low.length ? "watch" : "good"],
      ["Areas Without Training Team", noTeam.length, "Certified team availability", noTeam.length ? "watch" : "good"]
    ].map(card => `<div class="kpi ${card[3]}"><div class="kpi-label">${card[0]}</div><div class="kpi-value">${card[1]}</div><div class="kpi-detail">${card[2]}</div></div>`).join("");
    const deptRows = Object.keys(departments).map(dept => {
      const rows = data.manning.filter(row => row.department === dept), totals = totalManning(rows), fillRate = pct(totals.onboard, totals.required);
      return `<div class="bar-row"><strong>${dept}</strong><div class="bar-track"><div class="bar-fill" style="width:${fillRate}%;background:${departments[dept].color}"></div></div><strong>${fillRate}%</strong></div>`;
    }).join("");
    const risks = data.missionAreas.filter(row => !row.certified || row.readiness < 80 || !row.trainingTeam).sort((a,b) => a.readiness-b.readiness).slice(0,6)
      .map(row => `<div class="risk"><strong>${esc(row.name)} · ${esc(row.department)}</strong><span>RE ${esc(row.readiness)}%${row.certified ? "" : " · Not certified"}${row.trainingTeam ? "" : " · No training team"}</span></div>`).join("") || `<p class="empty">No mission-area flags.</p>`;
    return `<section class="print-page" id="overview">${header(data, "Ship Overview", 1, count)}
      <h2>Command Readiness Snapshot</h2><div class="overview-layout"><div class="kpi-grid">${cards}</div>
      <section class="panel ring-panel"><h3>Composite Readiness Index</h3><div class="ring" style="background:conic-gradient(${color} ${readiness*3.6}deg,#dfe8ec 0)"><span>${readiness}<small>INDEX</small></span></div><strong>${readiness >= 85 ? "READY / STABLE" : readiness >= 75 ? "WATCH ITEMS PRESENT" : "COMMAND ATTENTION REQUIRED"}</strong></section></div>
      <div class="three-col"><section class="panel"><h3>Department Manning</h3>${deptRows}</section><section class="panel"><h3>Priority Watch List</h3>${risks}</section><section class="panel"><h3>Commander's Intent</h3><p>${esc(data.summary.intent)}</p><h3>Operating Environment</h3><p>${esc(data.summary.weather)}</p></section></div>${footer(data)}</section>`;
  }

  function departmentPage(data, dept, page, count) {
    const description = departments[dept], manningRows = data.manning.filter(row => row.department === dept);
    const mission = data.missionAreas.filter(row => row.department === dept);
    const necs = data.necs.filter(row => row.department === dept);
    const casreps = data.casreps.filter(row => row.department === dept);
    const totals = totalManning(manningRows), fill = pct(totals.onboard, totals.required);
    const gaps = necs.filter(row => row.onboard < row.required);
    const significant = casreps.filter(row => ["C3","C4"].includes(row.category));
    const flags = mission.filter(row => !row.certified || row.readiness < 80 || !row.trainingTeam).length;
    const stats = [["Manning BA / COB",`${totals.onboard} / ${totals.required}`,state(fill)],["NEC Gaps",gaps.length,gaps.length?"watch":"good"],["Significant CASREPs",significant.length,significant.length?"bad":"good"],["Mission Readiness Flags",flags,flags?"watch":"good"]]
      .map(item => `<div class="dept-stat ${item[2]}"><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join("");
    const manning = manningRows.flatMap(row => levels.map(level => {
      const item = row[level], rate = pct(item.onboard,item.required);
      return `<div class="bar-row wide"><strong>${level}</strong><div class="bar-track"><div class="bar-fill" style="width:${rate}%"></div></div><strong>${item.onboard}/${item.required}</strong></div>`;
    })).join("") || `<p class="empty">No manning record.</p>`;
    const missions = mission.map(row => `<div class="mission-row"><strong>${esc(row.name)}</strong><div class="bar-track"><div class="bar-fill ${state(row.readiness)}" style="width:${row.readiness}%"></div></div><b>${row.readiness}%</b>${tag(row.certified?"CERT":"UNCERT",row.certified?"good":"bad")}${tag(row.trainingTeam?"TT":"NO TT",row.trainingTeam?"good":"watch")}</div>`).join("") || `<p class="empty">No mission areas mapped.</p>`;
    const necRows = necs.sort((a,b)=>(a.onboard-a.required)-(b.onboard-b.required)).map(row => `<tr><td><strong>${esc(row.code)}</strong></td><td>${esc(row.name)}</td><td class="right">${row.required}</td><td class="right">${row.onboard}</td><td class="right">${row.onboard < row.required ? tag(`-${row.required-row.onboard}`,"bad") : tag("0","good")}</td><td>${esc(row.projectedFill||"N/A")}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">No NEC requirements mapped.</td></tr>`;
    const casualties = casreps.map(row => `<article class="casrep ${String(row.category).toLowerCase()}"><strong>${esc(row.category)} · CASREP ${esc(row.number)} · ${esc(row.equipment)}</strong><b>ETR ${esc(row.etr)}</b><p>${esc(row.missionArea)} — ${esc(row.description)}</p></article>`).join("") || `<p class="empty">No CASREPs recorded.</p>`;
    return `<section class="print-page" id="${dept.toLowerCase()}">${header(data, `${description.label} Department`, page, count)}
      <div class="department-top">${stats}</div><div class="two-col"><section class="panel"><h3>Manning Composition</h3>${manning}</section><section class="panel"><h3>Mission-Area Readiness</h3>${missions}</section></div>
      <div class="two-col lower"><section class="panel nec"><h3>NEC Detail</h3><table><thead><tr><th>NEC</th><th>Requirement</th><th>BA</th><th>COB</th><th>Gap</th><th>Projected Fill</th></tr></thead><tbody>${necRows}</tbody></table></section><section class="panel"><h3>CASREP Status</h3>${casualties}</section></div>${footer(data)}</section>`;
  }

  function shipControlsPage(data, page, count) {
    const tsoRows = shipControls.tso.map(row => `<tr><td>${esc(row.number)}</td><td>${esc(row.date)}</td><td>${esc(row.department)}</td><td>${esc(row.related_condition)}</td><td>${esc(row.control)}</td></tr>`).join("");
    const dfsRows = shipControls.dfs.map(row => `<tr><td>${esc(row.number)}</td><td>${esc(row.date)}</td><td>${esc(row.department)}</td><td>${esc(row.type)}</td><td>${esc(row.related_condition)}</td><td>${esc(row.deviation)}</td></tr>`).join("");
    return `<section class="print-page" id="ship-controls">${header(data, "Ship TSO and DFS Controls", page, count)}
      <h2>Ship-Originated Operational Controls</h2><p class="callout"><strong>Ship-uploaded CSV data.</strong> TSO and DFS records are maintained aboard ship and are not supplied in the shore message.</p>
      <section class="panel"><h3>Temporary Standing Orders (TSO)</h3>${tsoRows ? `<table><thead><tr><th>Number</th><th>Date</th><th>Dept</th><th>Related Condition</th><th>Control</th></tr></thead><tbody>${tsoRows}</tbody></table>` : `<p class="empty">No TSO CSV has been uploaded.</p>`}</section>
      <section class="panel" style="margin-top:10px"><h3>Departures from Specification (DFS)</h3>${dfsRows ? `<table><thead><tr><th>Number</th><th>Date</th><th>Dept</th><th>Type</th><th>Related Condition</th><th>Approved Deviation</th></tr></thead><tbody>${dfsRows}</tbody></table>` : `<p class="empty">No DFS CSV has been uploaded.</p>`}</section>${footer(data)}</section>`;
  }

  function render(raw = currentReport) {
    const data = validate(raw);
    currentReport = data;
    const count = 7;
    $("report").innerHTML = overview(data, count) + Object.keys(departments).map((dept,index) => departmentPage(data,dept,index+2,count)).join("") + shipControlsPage(data,7,count);
    $("tabNav").innerHTML = [["overview","Overview"],...Object.keys(departments).map(value=>[value.toLowerCase(),value]),["ship-controls","TSO / DFS"]].map(([id,label])=>`<a href="#${id}">${label}</a>`).join("");
    $("dashboard").hidden = false;
  }

  async function decode() {
    $("status").className = "";
    $("status").textContent = "Decoding and verifying report…";
    try {
      const decoded = await EightOClockReport.decodeMessage($("message").value);
      const data = decoded.d === "eight-oclock" ? decoded.r : decoded;
      shipControls.tso = [];
      shipControls.dfs = [];
      render(data);
      $("status").className = "ok";
      $("status").textContent = `Eight O'Clock Report verified: ${data.report.ship.name}.`;
      setShipDataStatus("Report loaded. Upload ship TSO and/or DFS CSV files.");
    } catch (error) {
      $("dashboard").hidden = true;
      $("status").className = "error";
      $("status").textContent = `Not loaded: ${error.message}`;
    }
  }

  function downloadCsv(kind) {
    const csv = EightOClockShipControls.exportCsv(kind, shipControls[kind]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    link.download = `${EightOClockShipControls.SPECS[kind].tableUid}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setShipDataStatus(`${kind.toUpperCase()} ${shipControls[kind].length ? "data" : "blank template"} downloaded.`);
  }

  async function loadMessageTraffic() {
    const file = VirtualDrive.list().find(item => item.type === "text/plain" || item.name.toLowerCase().endsWith(".txt"));
    if (!file) {
      $("status").className = "error";
      $("status").textContent = "No delivered report was found. Generate and send one first.";
      return;
    }
    $("loadTraffic").classList.remove("next-action");
    $("message").value = file.content;
    await decode();
  }

  async function uploadCsv(kind, event) {
    const file = event.target.files[0];
    if (!file || !currentReport) return;
    try {
      shipControls[kind] = EightOClockShipControls.importCsv(kind, await file.text());
      render();
      setShipDataStatus(`${shipControls[kind].length} ${kind.toUpperCase()} row(s) uploaded from ${file.name}.`);
    } catch (error) {
      setShipDataStatus(`Not imported: ${error.message}`);
    } finally { event.target.value = ""; }
  }

  $("decode").addEventListener("click", decode);
  $("loadTraffic").addEventListener("click", loadMessageTraffic);
  $("resetApp").addEventListener("click", () => {
    VirtualDrive.clear();
    location.href = "./foundry.html";
  });
  $("messageFile").addEventListener("change", async event => { const file=event.target.files[0]; if(file){$("message").value=await file.text();decode();} });
  $("printReport").addEventListener("click", () => window.print());
  $("openShipData").addEventListener("click", () => { $("shipDataModal").hidden = false; });
  $("closeShipData").addEventListener("click", () => { $("shipDataModal").hidden = true; });
  $("shipDataModal").addEventListener("click", event => {
    if (event.target === $("shipDataModal")) $("shipDataModal").hidden = true;
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") $("shipDataModal").hidden = true;
  });
  $("exportTso").addEventListener("click", () => downloadCsv("tso"));
  $("exportDfs").addEventListener("click", () => downloadCsv("dfs"));
  $("tsoFile").addEventListener("change", event => uploadCsv("tso", event));
  $("dfsFile").addEventListener("change", event => uploadCsv("dfs", event));
  $("clearShipData").addEventListener("click", () => {
    shipControls.tso = [];
    shipControls.dfs = [];
    if (currentReport) render();
    setShipDataStatus("Ship TSO and DFS data cleared.");
  });
})();
