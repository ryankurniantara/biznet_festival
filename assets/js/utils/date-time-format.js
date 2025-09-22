// utils/datetime.js
function pad(n) {
  return String(n).padStart(2, "0");
}

export function parseYMDHMS(str) {
  console.log("Parsing date string:", str);
  if (!str || typeof str !== "string") return null;
  const [datePart, timePart = "00:00:00"] = str.trim().split(/\s+/);
  const d = datePart?.split("-").map(Number);
  const t = timePart?.split(":").map(Number);
  if (!d || d.length < 3) return null;
  const [Y, M, D] = d;
  const [h = 0, m = 0, s = 0] = t && t.length >= 2 ? t : [0, 0, 0];
  const jsDate = new Date(Y, (M || 1) - 1, D || 1, h, m, s);
  return isNaN(jsDate.getTime()) ? null : jsDate;
}

export function formatDateLocal(date, locale = "id-ID", options) {
  if (!(date instanceof Date)) return "-";
  const fmt = new Intl.DateTimeFormat(
    locale,
    options || { day: "2-digit", month: "long", year: "numeric" }
  );
  return fmt.format(date);
}

export function formatTimeLocal(date, locale = "id-ID", withSeconds = false) {
  if (!(date instanceof Date)) return "-";
  const opts = withSeconds
    ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
    : { hour: "2-digit", minute: "2-digit", hour12: false };
  return new Intl.DateTimeFormat(locale, opts).format(date);
}

/**
 * Filter formatter fleksibel.
 * @param {string} ymdHmsString  "YYYY-MM-DD HH:mm:ss" atau "YYYY-MM-DD"
 * @param {object} opts
 *   - mode: "date" | "time" | "both" (default "both")
 *   - locale: default "id-ID"
 *   - withSeconds: default false
 *   - empty: fallback string jika invalid (default "-")
 *   - forceUTC: paksa interpretasi UTC (default false)
 */
export function filterDateTime(
  ymdHmsString,
  {
    mode = "both",
    locale = "id-ID",
    withSeconds = false,
    empty = "-",
    forceUTC = false,
  } = {}
) {
  let d = parseYMDHMS(ymdHmsString);
  if (!d) {
    return mode === "date"
      ? { dateText: empty }
      : mode === "time"
      ? { timeText: empty }
      : { dateText: empty, timeText: empty };
  }

  // Opsi: paksa UTC (interpretasi & format sebagai UTC)
  if (forceUTC) {
    // Rebuild via UTC supaya tidak terpengaruh TZ lokal
    const Y = d.getUTCFullYear();
    const M = d.getUTCMonth();
    const D = d.getUTCDate();
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const s = d.getUTCSeconds();
    d = new Date(Date.UTC(Y, M, D, h, m, s));
  }

  if (mode === "date") {
    return { dateText: formatDateLocal(d, locale) };
  }
  if (mode === "time") {
    return { timeText: formatTimeLocal(d, locale, withSeconds) };
  }

  // mode === "both"
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());

  return {
    date: d,
    dateText: formatDateLocal(d, locale),
    timeText: formatTimeLocal(d, locale, withSeconds),
    isoDate: `${Y}-${M}-${D}`,
    isoTime: withSeconds ? `${h}:${m}:${s}` : `${h}:${m}`,
  };
}
