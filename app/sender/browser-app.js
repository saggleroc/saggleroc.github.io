(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const { encodeMessage } = window.FleetPulse;

  function parseDocument(text) {
    let document;
    try {
      document = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    if (document?.format !== "NAVDASH-0800") throw new Error('Expected format "NAVDASH-0800".');
    if (!document.report?.ship?.name) throw new Error("Report ship identity is required.");
    for (const key of ["missionAreas", "manning", "casreps"]) {
      if (!Array.isArray(document[key])) throw new Error(`${key} must be an array.`);
    }
    const shipNames = new Set([document.report.ship.name, document.report.ship.hullNumber].filter(Boolean).map(value => value.toLowerCase()));
    for (const rows of [document.missionAreas, document.manning, document.casreps]) {
      const otherShip = rows.find(row => row.ship && !shipNames.has(String(row.ship).toLowerCase()));
      if (otherShip) throw new Error(`Data for another ship is not allowed: ${otherShip.ship}.`);
    }
    return document;
  }

  async function generate() {
    $("message").value = "";
    $("status").textContent = "Validating and encoding dashboard data…";
    try {
      const document = parseDocument($("json").value);
      const asOf = $("asOf").value ? new Date($("asOf").value).toISOString() : document.report.asOf || document.generatedAt;
      const packet = { f: "ND1", d: "0800", t: asOf, r: {...document, report: {...document.report, asOf}} };
      const result = await encodeMessage(packet, {
        subject: $("subject").value.trim() || "DASHBOARD UPDATE",
        body: $("body").value.trim()
      });
      $("message").value = result.message;
      const reduction = Math.round((1 - result.encodedLength / (result.rawLength * 1.6)) * 100);
      const count = document.missionAreas.length + document.manning.length + document.casreps.length;
      $("status").textContent = `${count} report rows: ${result.rawLength} raw bytes → ${result.byteLength} ${result.compression.toLowerCase()} bytes → ${result.encodedLength} Base32 characters (${Math.max(0, reduction)}% smaller).`;
      $("loadSample").classList.remove("next-action");
      $("sendToShip").classList.add("next-action");
    } catch (error) {
      $("status").textContent = `Error: ${error.message}`;
    }
  }

  async function loadSample() {
    $("status").textContent = "Loading the built-in synthetic sample…";
    try {
      const response = await fetch("./examples/0800-report.json");
      if (!response.ok) throw new Error(`Sample returned HTTP ${response.status}`);
      $("json").value = await response.text();
      await generate();
    } catch (error) {
      $("status").textContent = `Could not load the sample: ${error.message}`;
    }
  }

  $("jsonFile").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    $("message").value = "";
    $("status").textContent = `Reading ${file.name}…`;
    try {
      $("json").value = await file.text();
      await generate();
    } catch (error) {
      $("status").textContent = `Error reading file: ${error.message}`;
    }
  });
  $("generate").addEventListener("click", generate);
  $("loadSample").addEventListener("click", loadSample);
  $("sendToShip").addEventListener("click", async () => {
    if (!$("message").value) await generate();
    if (!$("message").value) return;
    const name = `USS-MAHAN-0800-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    VirtualDrive.write(name, $("message").value);
    $("sendToShip").classList.remove("next-action");
    $("transfer").hidden = false;
    setTimeout(() => { $("transferStatus").textContent = "Message received aboard USS MAHAN."; }, 1500);
    setTimeout(() => { location.href = "./0800.html"; }, 2600);
  });
  $("resetApp").addEventListener("click", () => {
    VirtualDrive.clear();
    location.reload();
  });

  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  $("asOf").value = local.toISOString().slice(0, 16);
  $("status").textContent = "Load the built-in synthetic sample or import your own JSON to begin.";
})();
