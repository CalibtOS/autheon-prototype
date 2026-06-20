/**
 * Order-entry input formatters (Feedback.pdf B.1.3) — prototype helpers.
 */
(function () {
  const MANUFACTURER_SUGGESTIONS = [
    "Audi",
    "BMW",
    "Mercedes-Benz",
    "Volkswagen",
    "Opel",
    "Ford",
    "Toyota",
    "Hyundai",
    "Kia",
    "Peugeot",
    "Renault",
    "Citroën",
    "Fiat",
    "Skoda",
    "Seat",
    "Porsche",
    "Volvo",
    "Tesla",
    "Nissan",
    "Mazda",
    "Honda",
    "Mini",
    "Dacia",
    "Jeep",
    "Land Rover",
    "Jaguar",
    "MAN",
    "Iveco",
    "Scania",
    "Volkswagen Nutzfahrzeuge",
  ];

  function digitsOnly(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  /** Format date on blur: 010127 → 01.01.2027 */
  function formatDateInput(raw) {
    const t = String(raw || "").trim();
    if (!t) return "";
    const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (m) {
      let y = parseInt(m[3], 10);
      if (y < 100) y += 2000;
      return `${pad2(m[1])}.${pad2(m[2])}.${y}`;
    }
    const d = digitsOnly(t);
    if (d.length === 6) {
      const dd = d.slice(0, 2);
      const mm = d.slice(2, 4);
      let yy = parseInt(d.slice(4, 6), 10);
      if (yy < 100) yy += 2000;
      return `${dd}.${mm}.${yy}`;
    }
    if (d.length === 8) {
      return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 8)}`;
    }
    return t;
  }

  /** Format time on blur: 0800 → 08:00, 830 → 08:30 */
  function formatTimeInput(raw) {
    const t = String(raw || "").trim();
    if (!t) return "";
    const colon = t.match(/^(\d{1,2}):(\d{2})$/);
    if (colon) {
      const h = Math.min(23, parseInt(colon[1], 10));
      const mi = Math.min(59, parseInt(colon[2], 10));
      return `${pad2(h)}:${pad2(mi)}`;
    }
    const d = digitsOnly(t);
    if (!d.length) return t;
    let h;
    let mi;
    if (d.length <= 2) {
      h = parseInt(d, 10);
      mi = 0;
    } else if (d.length === 3) {
      h = parseInt(d.slice(0, 1), 10);
      mi = parseInt(d.slice(1, 3), 10);
    } else {
      h = parseInt(d.slice(0, 2), 10);
      mi = parseInt(d.slice(2, 4), 10);
    }
    if (Number.isNaN(h) || Number.isNaN(mi)) return t;
    h = Math.min(23, Math.max(0, h));
    mi = Math.min(59, Math.max(0, mi));
    return `${pad2(h)}:${pad2(mi)}`;
  }

  function normalizeVin(raw) {
    return String(raw || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-HJ-NPR-Z0-9]/gi, "")
      .slice(0, 17);
  }

  function normalizePlate(raw) {
    return String(raw || "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseTimeToMinutes(s) {
    const m = String(s || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  /** Returns 1 if a > b, -1 if a < b, 0 if equal or invalid */
  function compareTimeStrings(a, b) {
    const ma = parseTimeToMinutes(a);
    const mb = parseTimeToMinutes(b);
    if (ma == null || mb == null) return 0;
    if (ma > mb) return 1;
    if (ma < mb) return -1;
    return 0;
  }

  window.InputFormatters = {
    MANUFACTURER_SUGGESTIONS,
    formatDateInput,
    formatTimeInput,
    normalizeVin,
    normalizePlate,
    compareTimeStrings,
  };
})();
