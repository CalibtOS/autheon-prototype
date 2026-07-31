/**
 * Shared formatters — Intl-based date/time/money/PLZ for driver PWA.
 * Design contract: one formatter module, no ad hoc date strings in JSX.
 */
(function (global) {
  const DEFAULT_LOCALE = "de-DE";

  function locale() {
    try {
      return global.__autheonLocale || DEFAULT_LOCALE;
    } catch {
      return DEFAULT_LOCALE;
    }
  }

  // The store stamps dates as `DD.MM.` with no year (see `nowStamp`), so a
  // yearless dotted date has always meant the prototype's current year. Kept as
  // one constant so the date and the date+time parsers cannot disagree about it.
  const ASSUMED_YEAR = 2026;

  function parseDottedDate(raw) {
    const m = String(raw || "").match(/(\d{2})\.(\d{2})\.?(\d{4})?/);
    if (!m) return null;
    const year = m[3] ? Number(m[3]) : ASSUMED_YEAR;
    return new Date(year, Number(m[2]) - 1, Number(m[1]));
  }

  const pad2 = (n) => String(n).padStart(2, "0");

  /**
   * Parse the store's dotted stamp into plain calendar parts.
   *
   * Accepts `DD.MM.`, `DD.MM.YYYY` and either of those followed by `HH:MM`
   * (the shape `nowStamp()` writes and the seed data uses). Returns null for
   * anything else, so callers can fall back rather than render junk.
   *
   * `minute`/`hour` are null when the value carries no time at all — a
   * date-only value must never be inflated into a fake `00:00`.
   */
  function parseDottedDateTime(raw) {
    const m = String(raw ?? "")
      .trim()
      .match(/^(\d{1,2})\.(\d{1,2})\.?(\d{4})?(?:[\s,]+(\d{1,2}):(\d{2}))?$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    const hasTime = m[4] !== undefined;
    const hour = hasTime ? Number(m[4]) : null;
    const minute = hasTime ? Number(m[5]) : null;
    if (hasTime && (hour > 23 || minute > 59)) return null;
    return {
      day,
      month,
      year: m[3] ? Number(m[3]) : ASSUMED_YEAR,
      hour,
      minute,
    };
  }

  /**
   * Full calendar date plus 24h time — `DD.MM.YYYY + HH:MM`.
   *
   * Assembled from the parsed parts as a string rather than through `Intl`, on
   * purpose: the stored stamp is a wall-clock value with no zone, so building a
   * `Date` and formatting it could shift the displayed calendar day across a
   * DST or UTC boundary. The pattern is numeric and identical in EN and DE, so
   * there is nothing locale-dependent left to delegate.
   *
   * A value with no time renders as the date alone; an unparseable or missing
   * value renders the fallback and never the raw string.
   */
  function formatDateTime(raw, opts) {
    const { separator = " + ", fallback = "—" } = opts || {};
    const p = parseDottedDateTime(raw);
    if (!p) return fallback;
    const date = `${pad2(p.day)}.${pad2(p.month)}.${p.year}`;
    if (p.hour === null) return date;
    return `${date}${separator}${pad2(p.hour)}:${pad2(p.minute)}`;
  }

  function formatDate(raw, opts) {
    const d = raw instanceof Date ? raw : parseDottedDate(raw);
    if (!d || Number.isNaN(d.getTime())) return String(raw || "—");
    return new Intl.DateTimeFormat(locale(), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...opts,
    }).format(d);
  }

  function formatTimeWindow(from, to, flexibleLabel) {
    if (!from && !to) return flexibleLabel || "—";
    if (from && to) return `${from}–${to}`;
    return from || to || "—";
  }

  function formatMoney(amount, currency) {
    const n = Number(amount);
    if (Number.isNaN(n)) return "—";
    return new Intl.NumberFormat(locale(), {
      style: "currency",
      currency: currency || "EUR",
    }).format(n);
  }

  function formatPlz(plz) {
    return String(plz || "").replace(/\D/g, "").slice(0, 5);
  }

  function formatCalendarDayLabel(dayKey) {
    const m = String(dayKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return dayKey || "—";
    return `${m[3]}.${m[2]}.${m[1]}`;
  }

  function formatRelativeDay(dateInput, t) {
    const d = dateInput instanceof Date ? dateInput : parseDottedDate(dateInput);
    if (!d) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cmp = new Date(d);
    cmp.setHours(0, 0, 0, 0);
    const diff = Math.round((today - cmp) / 86400000);
    if (diff === 0) return t ? t("today") : "Today";
    if (diff === 1) return t ? t("yesterday") : "Yesterday";
    return formatDate(d);
  }

  function formatFileSize(bytes) {
    const n = Number(bytes) || 0;
    if (n <= 0) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1048576) {
      const kb = n / 1024;
      return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
    }
    return `${(n / 1048576).toFixed(1)} MB`;
  }

  global.AutheonFormatters = {
    parseDottedDate,
    parseDottedDateTime,
    formatDate,
    formatDateTime,
    formatTimeWindow,
    formatMoney,
    formatPlz,
    formatCalendarDayLabel,
    formatRelativeDay,
    formatFileSize,
  };
})(typeof window !== "undefined" ? window : globalThis);
