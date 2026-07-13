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

  function parseDottedDate(raw) {
    const m = String(raw || "").match(/(\d{2})\.(\d{2})\.?(\d{4})?/);
    if (!m) return null;
    const year = m[3] ? Number(m[3]) : 2026;
    return new Date(year, Number(m[2]) - 1, Number(m[1]));
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
    formatDate,
    formatTimeWindow,
    formatMoney,
    formatPlz,
    formatCalendarDayLabel,
    formatRelativeDay,
    formatFileSize,
  };
})(typeof window !== "undefined" ? window : globalThis);
