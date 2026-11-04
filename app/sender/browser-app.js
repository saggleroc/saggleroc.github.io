(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const { equipmentReadinessRecords, encodeMessage } = window.FleetPulse;

  function parseDocument(text) {
    let document;
    try {
      document = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    return { document, records: equipmentReadinessRecords(document) };
  }

  async function generate() {
    $("message").value = "";
    $("status").textContent = "Validating and encoding dashboard data…";
    try {
      const { document, records } = parseDocument($("json").value);
      const asOf = $("asOf").value ? new Date($("asOf").value).toISOString() : document.report.asOf || document.generatedAt;
      const packet = {
        f: "ND1", d: "readiness", t: asOf, u: "h",
        r: records.map(item => [
          item.ship, item.repair_hours, item.is_this_ship ? 1 : 0, item.failure_rate,
          item.failures, item.uptime, item.long_repairs, item.weekly_repairs
        ])
      };
      const result = await encodeMessage(packet, {
        subject: $("subject").value.trim() || "DASHBOARD UPDATE",
        body: $("body").value.trim()
      });
      $("message").value = result.message;
      const reduction = Math.round((1 - result.encodedLength / (result.rawLength * 1.6)) * 100);
      $("status").textContent = `${records.length} records: ${result.rawLength} raw bytes → ${result.byteLength} ${result.compression.toLowerCase()} bytes → ${result.encodedLength} Base32 characters (${Math.max(0, reduction)}% smaller).`;
    } catch (error) {
      $("status").textContent = `Error: ${error.message}`;
    }
  }

  async function loadSample() {
    $("status").textContent = "Loading the built-in synthetic sample…";
    try {
      const response = await fetch("./examples/equipment-readiness.json");
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
  $("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("message").value);
    } catch {
      $("message").select();
      if (!document.execCommand("copy")) {
        $("status").textContent = "Copy was blocked; select and copy the message manually.";
        return;
      }
    }
    $("status").textContent = "Message copied.";
  });
  $("download").addEventListener("click", async () => {
    if (!$("message").value) await generate();
    if (!$("message").value) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([$("message").value], { type: "text/plain" }));
    link.download = `navdash-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  $("saveVirtual").addEventListener("click", async () => {
    if (!$("message").value) await generate();
    if (!$("message").value) return;
    const name = `navdash-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    VirtualDrive.write(name, $("message").value);
    $("status").innerHTML = `Saved <strong>${name}</strong> to the simulated drive. <a href="./viewer.html" style="color:#61b7ff">Open it in the viewer →</a>`;
  });

  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  $("asOf").value = local.toISOString().slice(0, 16);
  $("status").textContent = "Load the built-in synthetic sample or import your own JSON to begin.";
})();
