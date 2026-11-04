const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes) {
  let bits = 0, value = 0, output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(text) {
  const clean = text.toUpperCase().replace(/0/g, "O").replace(/1/g, "I").replace(/[^A-Z2-7]/g, "");
  if (!clean) throw new Error("Payload contains no Base32 data.");
  let bits = 0, value = 0;
  const bytes = [];
  for (const char of clean) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export function checksum(bytes) {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export async function compress(bytes) {
  if (!("CompressionStream" in globalThis)) return { bytes, method: "NONE" };
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return compressed.length < bytes.length ? { bytes: compressed, method: "GZIP" } : { bytes, method: "NONE" };
}

export async function decompress(bytes, method) {
  if (method === "NONE") return bytes;
  if (method !== "GZIP") throw new Error(`Unsupported compression method: ${method}`);
  if (!("DecompressionStream" in globalThis)) throw new Error("This browser cannot decompress GZIP payloads.");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeMessage(packet, { subject = "DASHBOARD UPDATE", body = "" } = {}) {
  const sourceBytes = new TextEncoder().encode(JSON.stringify(packet));
  const result = await compress(sourceBytes);
  const encoded = base32Encode(result.bytes);
  const lines = encoded.match(/.{1,64}/g)?.join("\n") ?? "";
  const message = [
    `SUBJECT: ${subject}`, "", body, "",
    "----- NAVDASH PAYLOAD BEGIN -----",
    "VERSION: 1",
    "ENCODING: BASE32",
    `COMPRESSION: ${result.method}`,
    `LENGTH: ${result.bytes.length}`,
    `RAW-LENGTH: ${sourceBytes.length}`,
    `CHECKSUM: ${checksum(result.bytes)}`,
    "", lines,
    "----- NAVDASH PAYLOAD END -----"
  ].join("\n");
  return { message, rawLength: sourceBytes.length, encodedLength: encoded.length, byteLength: result.bytes.length, compression: result.method };
}

export async function decodeMessage(text) {
  const block = text.match(/-+\s*NAVDASH\s+PAYLOAD\s+BEGIN\s*-+([\s\S]*?)-+\s*NAVDASH\s+PAYLOAD\s+END\s*-+/i);
  if (!block) throw new Error("No NAVDASH payload markers were found.");
  const section = block[1];
  const expectedChecksum = section.match(/CHECKSUM\s*:\s*([0-9A-F]{8})/i)?.[1].toUpperCase();
  const expectedLength = Number(section.match(/LENGTH\s*:\s*(\d+)/i)?.[1]);
  const expectedRawLength = Number(section.match(/RAW-LENGTH\s*:\s*(\d+)/i)?.[1]);
  const compression = section.match(/COMPRESSION\s*:\s*([A-Z0-9-]+)/i)?.[1].toUpperCase() || "NONE";
  if (!expectedChecksum || !Number.isFinite(expectedLength)) throw new Error("Payload metadata is incomplete.");
  const payloadText = section.split(/\r?\n/)
    .filter(line => !/^\s*(VERSION|ENCODING|COMPRESSION|LENGTH|RAW-LENGTH|CHECKSUM)\s*:/i.test(line))
    .join("");
  const bytes = base32Decode(payloadText);
  if (bytes.length !== expectedLength) throw new Error(`Payload length check failed (expected ${expectedLength}, found ${bytes.length}).`);
  const actualChecksum = checksum(bytes);
  if (actualChecksum !== expectedChecksum) throw new Error(`Payload checksum failed (${actualChecksum} ≠ ${expectedChecksum}).`);
  const rawBytes = await decompress(bytes, compression);
  if (Number.isFinite(expectedRawLength) && rawBytes.length !== expectedRawLength) {
    throw new Error(`Decompressed length check failed (expected ${expectedRawLength}, found ${rawBytes.length}).`);
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBytes));
}
