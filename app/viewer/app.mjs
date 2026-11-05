import { decodeMessage } from "../shared/transport/eight-oclock.mjs";

export async function decodeDashboardMessage(text) {
  const decoded = await decodeMessage(text);
  let packet;
  if (decoded.f === "ND1" && ["repair", "readiness"].includes(decoded.d) && Array.isArray(decoded.r)) {
    packet = {
      as_of: decoded.t,
      records: decoded.r.map(row => ({
        ship: row[0],
        repair_hours: row[1],
        is_this_ship: row[2] === 1,
        failure_rate: row[3] ?? 0,
        failures: Array.isArray(row[4]) ? row[4] : [0, 0, 0, 0],
        uptime: Array.isArray(row[5]) ? row[5] : [0, 0, 0, 0],
        long_repairs: Array.isArray(row[6]) ? row[6] : [],
        weekly_repairs: Array.isArray(row[7]) ? row[7] : []
      }))
    };
  } else if (decoded.format === "EIGHT-OCLOCK-REPORT-1" && decoded.dashboard === "equipment-repair-time" && Array.isArray(decoded.records)) {
    packet = decoded;
  } else {
    throw new Error("The decoded data is not a supported dashboard packet.");
  }
  const subject = text.match(/^\s*SUBJECT\s*:\s*(.+)$/im)?.[1].trim() || "Dashboard update";
  return { packet, subject };
}
