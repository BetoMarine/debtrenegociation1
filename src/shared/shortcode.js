/**
 * Short code v1 for A2. 20 data bits + CRC-10, Crockford base32, shown as XXX-XXX.
 * Encode is for tests and a future Right Door nudge. That nudge is step 3 and is not mounted here.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TENORS = [3, 6, 9, 12];
const EPOCH_YEAR = 2024;

export function monthsAskedBucket(tenorMonths) {
  const n = Number(tenorMonths);
  if (n === 3) return 3;
  if (n === 6 || n === 9 || n === 12) return 6;
  return null;
}

export function monthIndex(ym) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(ym || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return (year - EPOCH_YEAR) * 12 + (month - 1);
}

export function indexToMonth(index) {
  const year = EPOCH_YEAR + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function deviceMonthIndex(date = new Date()) {
  return (date.getFullYear() - EPOCH_YEAR) * 12 + date.getMonth();
}

/** CRC-10, poly 0x233, over the 20 data bits. */
export function crc10(data20) {
  let crc = 0;
  for (let i = 19; i >= 0; i -= 1) {
    const bit = (data20 >> i) & 1;
    const msb = (crc >> 9) & 1;
    crc = ((crc << 1) | bit) & 0x3ff;
    if (msb) crc ^= 0x233;
  }
  for (let i = 0; i < 10; i += 1) {
    const msb = (crc >> 9) & 1;
    crc = (crc << 1) & 0x3ff;
    if (msb) crc ^= 0x233;
  }
  return crc;
}

function tenorIndex(tenorMonths) {
  const at = TENORS.indexOf(Number(tenorMonths));
  return at === -1 ? null : at;
}

export function encodeShortCode(record) {
  const version = 1;
  const tenor = tenorIndex(record.tenorMonths);
  const asked = monthsAskedBucket(record.tenorMonths);
  const start = monthIndex(record.startMonth);
  if (tenor == null || asked == null || start == null || start < 0 || start > 511) return null;
  if (record.monthsAskedFor != null && Number(record.monthsAskedFor) !== asked) return null;
  const askedBit = asked === 6 ? 1 : 0;
  const done = record.done ? 1 : 0;
  const data =
    (version << 17) |
    (askedBit << 16) |
    (tenor << 14) |
    (start << 5) |
    (done << 4);
  const crc = crc10(data);
  const bits = (data << 10) | crc;
  let raw = "";
  for (let i = 5; i >= 0; i -= 1) raw += ALPHABET[(bits >> (i * 5)) & 31];
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function normalizeCode(input) {
  return String(input || "")
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export function decodeShortCode(input, now = new Date()) {
  const raw = normalizeCode(input);
  if (raw.length !== 6 || [...raw].some((ch) => !ALPHABET.includes(ch))) {
    return { ok: false, error: "length" };
  }
  let bits = 0;
  for (const ch of raw) bits = (bits << 5) | ALPHABET.indexOf(ch);
  const data = (bits >> 10) & 0xfffff;
  const crc = bits & 0x3ff;
  const version = (data >> 17) & 0x7;
  if (version === 0) return { ok: false, error: "checksum" };
  if (version !== 1) return { ok: false, error: "version" };
  if (crc10(data) !== crc) return { ok: false, error: "checksum" };
  const askedBit = (data >> 16) & 1;
  const tenor = TENORS[(data >> 14) & 0x3];
  const start = (data >> 5) & 0x1ff;
  const done = ((data >> 4) & 1) === 1;
  const reserved = data & 0xf;
  if (reserved !== 0) return { ok: false, error: "checksum" };
  const monthsAskedFor = askedBit ? 6 : 3;
  if (monthsAskedBucket(tenor) !== monthsAskedFor) return { ok: false, error: "checksum" };
  if (start > deviceMonthIndex(now) + 24) return { ok: false, error: "checksum" };
  return {
    ok: true,
    record: {
      v: 1,
      monthsAskedFor,
      tenorMonths: tenor,
      startMonth: indexToMonth(start),
      done,
    },
  };
}
