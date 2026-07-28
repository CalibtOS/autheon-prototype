/**
 * Order-entry input formatters (Feedback.pdf B.1.3) — prototype helpers.
 */
(function () {
  // Sorted alphabetically (client change plan Phase 3 #1) — includes the
  // brands the client flagged as missing (#2). Do not append new entries at
  // the end; keep the list sorted so no separate sort step can drift from it.
  const MANUFACTURER_SUGGESTIONS = [
    "Audi",
    "BMW",
    "BYD",
    "Citroën",
    "Cupra",
    "Dacia",
    "DAF",
    "Fiat",
    "Ford",
    "Honda",
    "Hyundai",
    "Iveco",
    "Jaguar",
    "Jeep",
    "Kia",
    "Land Rover",
    "Lexus",
    "MAN",
    "Maserati",
    "Mazda",
    "Mercedes-Benz",
    "MG",
    "Mini",
    "Mitsubishi",
    "Nissan",
    "NIO",
    "Opel",
    "ORA",
    "Peugeot",
    "Polestar",
    "Porsche",
    "Renault",
    "Scania",
    "Seat",
    "Skoda",
    "Smart",
    "Tesla",
    "Toyota",
    "Volkswagen",
    "Volkswagen Nutzfahrzeuge",
    "Volvo",
    "XPENG",
    "Zeekr",
  ];

  // Manufacturer-dependent model suggestions (Phase 3 #4) — a curated
  // starter list per brand, not exhaustive. The model field stays a free-text
  // input with these as suggestions (native <datalist>), so a model missing
  // from this list can still be typed and is never overwritten (#5).
  const MANUFACTURER_MODELS = {
    Audi: ["A3", "A4", "A6", "Q3", "Q5", "e-tron"],
    BMW: ["1 Series", "3 Series", "5 Series", "X1", "X3", "X5", "i4"],
    BYD: ["Atto 3", "Dolphin", "Seal", "Han"],
    Citroën: ["C3", "C4", "C5 Aircross", "Berlingo"],
    Cupra: ["Leon", "Formentor", "Born", "Ateca"],
    Dacia: ["Sandero", "Duster", "Jogger", "Spring"],
    DAF: ["XF", "CF", "LF"],
    Fiat: ["500", "Panda", "Tipo", "Ducato"],
    Ford: ["Fiesta", "Focus", "Kuga", "Transit", "Puma"],
    Honda: ["Civic", "CR-V", "Jazz", "HR-V"],
    Hyundai: ["i20", "i30", "Tucson", "Kona", "Ioniq 5"],
    Iveco: ["Daily", "Eurocargo", "Stralis"],
    Jaguar: ["XE", "F-Pace", "I-Pace"],
    Jeep: ["Renegade", "Compass", "Grand Cherokee"],
    Kia: ["Ceed", "Sportage", "Niro", "EV6"],
    "Land Rover": ["Defender", "Discovery", "Range Rover Evoque"],
    Lexus: ["CT", "IS", "NX", "RX"],
    MAN: ["TGX", "TGS", "TGE"],
    Maserati: ["Ghibli", "Levante", "Grecale"],
    Mazda: ["2", "3", "CX-5", "CX-30"],
    "Mercedes-Benz": [
      "A-Class",
      "C-Class",
      "E-Class",
      "GLC",
      "Sprinter",
      "Atego",
    ],
    MG: ["MG3", "ZS", "HS", "MG4"],
    Mini: ["Cooper", "Countryman", "Clubman"],
    Mitsubishi: ["Space Star", "ASX", "Outlander", "L200"],
    Nissan: ["Micra", "Qashqai", "Juke", "Leaf"],
    NIO: ["ET5", "ET7", "EL7"],
    Opel: ["Corsa", "Astra", "Grandland", "Vivaro"],
    ORA: ["Funky Cat"],
    Peugeot: ["208", "308", "2008", "3008", "Boxer"],
    Polestar: ["Polestar 2", "Polestar 3", "Polestar 4"],
    Porsche: ["911", "Cayenne", "Macan", "Taycan"],
    Renault: ["Clio", "Megane", "Captur", "Master"],
    Scania: ["R Series", "S Series", "G Series"],
    Seat: ["Ibiza", "Leon", "Ateca"],
    Skoda: ["Fabia", "Octavia", "Kodiaq", "Superb"],
    Smart: ["fortwo", "forfour", "#1"],
    Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
    Toyota: ["Yaris", "Corolla", "RAV4", "Proace"],
    Volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "Transporter"],
    "Volkswagen Nutzfahrzeuge": ["Crafter", "Caddy", "Transporter"],
    Volvo: ["V60", "XC40", "XC60", "XC90"],
    XPENG: ["G6", "G9", "P7"],
    Zeekr: ["001", "X"],
  };

  /**
   * Ranked search over MANUFACTURER_SUGGESTIONS (Phase 3 #3): exact match,
   * then starts-with, then contains — so typing "G" surfaces manufacturers
   * starting with G before an unrelated brand that merely contains a "g".
   */
  function searchManufacturers(query, list) {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    const source = list || MANUFACTURER_SUGGESTIONS;
    if (!q) return source;
    const exact = [];
    const starts = [];
    const contains = [];
    for (const name of source) {
      const n = name.toLowerCase();
      if (n === q) exact.push(name);
      else if (n.startsWith(q)) starts.push(name);
      else if (n.includes(q)) contains.push(name);
    }
    return [...exact, ...starts, ...contains];
  }

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

  /** DD.MM.YYYY -> YYYY-MM-DD for bridging to a native <input type="date">. */
  function ddmmyyyyToIso(raw) {
    const m = String(raw || "")
      .trim()
      .match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return "";
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  /** YYYY-MM-DD (native date input value) -> DD.MM.YYYY */
  function isoToDdmmyyyy(raw) {
    const m = String(raw || "")
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    return `${m[3]}.${m[2]}.${m[1]}`;
  }

  function todayDdmmyyyy() {
    const d = new Date();
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
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
    const m = String(s || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})$/);
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
    MANUFACTURER_MODELS,
    searchManufacturers,
    formatDateInput,
    formatTimeInput,
    normalizeVin,
    normalizePlate,
    compareTimeStrings,
    ddmmyyyyToIso,
    isoToDdmmyyyy,
    todayDdmmyyyy,
  };
})();
