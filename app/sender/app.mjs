import { equipmentReadinessRecords } from "../shared/core/document-model.mjs";
import { encodeMessage } from "../shared/transport/navdash.mjs";

const $ = id => document.getElementById(id);

function parseDocument(text) {
  let document;
  try {
    document = JSON.parse(text);
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
    const asOf = $("asOf").value
      ? new Date($("asOf").value).toISOString()
      : document.report.asOf || document.generatedAt;
    const packet = {
      f: "ND1",
      d: "readiness",
      t: asOf,
      u: "h",
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

$("jsonFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  $("message").value = "";
  $("status").textContent = `Reading ${file.name}…`;
  $("json").value = await file.text();
  await generate();
});

$("generate").addEventListener("click", generate);
$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("message").value);
  } catch {
    $("message").select();
    if (!document.execCommand("copy")) throw new Error("Copy was blocked; select and copy the message manually.");
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

const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
$("asOf").value = local.toISOString().slice(0, 16);
$("status").textContent = "No data loaded. Import a canonical JSON file to begin.";
