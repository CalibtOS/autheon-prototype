/**
 * TRANSPORT-ORDER DOCUMENT (Fahrauftrag) — payload mapping + deterministic
 * A4 rendering, derived from the approved client templates in `references/`.
 *
 * WHY THIS FILE EXISTS AND WHAT IT IS NOT
 * ---------------------------------------
 * This is the ONE renderer for the transport-order PDF. It is consumed by two
 * callers that must never diverge visually:
 *
 *   1. the prototype runtime (`store.js` -> driver/admin document flow), which
 *      shows the document in the in-app viewer and prints it through Chromium;
 *   2. `tools/pdf/generate-transport-order-pdfs.mjs`, which renders the same
 *      HTML through Playwright/Chromium `page.pdf()` to produce the real PDF
 *      files and PNG renders used for client review and visual regression.
 *
 * It contains NO transaction, versioning, storage, audit or notification
 * logic — that lives in `store.js`, per the PDF-generation skill's rule that
 * "the renderer is not a transaction manager".
 *
 * LANGUAGE RULE (non-negotiable)
 * ------------------------------
 * Every customer-facing string below is GERMAN and hardcoded. The document is
 * a legal artefact for the service partner; it must NOT follow the prototype's
 * UI locale. `window.I18n` is deliberately not used in this file. The English
 * `references/Technical_Specifications_EN.pdf` is a translation for
 * implementers only — see docs/requirements/transport-order-pdf-traceability.md.
 *
 * GEOMETRY
 * --------
 * All measurements are in PostScript points taken directly out of the approved
 * templates' content streams (A4 = 595.32 x 841.92 pt). They are exposed as CSS
 * custom properties in `--geo-*` so a layout correction is a one-line change
 * that both callers pick up. See the traceability doc for the extraction
 * command.
 */
(function (global) {
  "use strict";

  // =======================================================================
  // CANONICAL BACKEND VALUES -> TEMPLATE
  //
  // Template selection reads the canonical backend vehicle-type value ONLY.
  // It must never depend on a translated or displayed label, so this map is
  // keyed by the same string constants `store.js` persists.
  // =======================================================================
  const TEMPLATE_PKW = "pkw";
  const TEMPLATE_LKW = "lkw";

  const VEHICLE_TYPE_PASSENGER_CAR = "passenger_car";
  const VEHICLE_TYPE_TRUCK_UP_TO_7_5_T = "truck_up_to_7_5_t";
  const VEHICLE_TYPE_TRUCK_OVER_7_5_T = "truck_over_7_5_t";

  const TEMPLATE_BY_VEHICLE_TYPE = {
    [VEHICLE_TYPE_PASSENGER_CAR]: TEMPLATE_PKW,
    // Both approved truck categories share ONE template and ONE title.
    [VEHICLE_TYPE_TRUCK_UP_TO_7_5_T]: TEMPLATE_LKW,
    [VEHICLE_TYPE_TRUCK_OVER_7_5_T]: TEMPLATE_LKW,
  };

  const TEMPLATE_TITLE = {
    [TEMPLATE_PKW]: { lead: "FAHRAUFTRAG", accent: "PKW" },
    [TEMPLATE_LKW]: { lead: "FAHRAUFTRAG", accent: "LKW" },
  };

  const TRANSPORT_TYPE_LABEL = {
    own_axle: "Eigenachse",
    third_party_axle: "Fremdachse",
  };

  const REGISTRATION_REGISTERED = "registered";
  const REGISTRATION_DEREGISTERED = "deregistered";
  const REGISTRATION_LABEL = {
    [REGISTRATION_REGISTERED]: "Zugelassen",
    [REGISTRATION_DEREGISTERED]: "Abgemeldet",
  };

  /**
   * Resolves the template key from the canonical backend vehicle type.
   * Returns null for an unknown/missing value — callers must treat that as a
   * mandatory-data failure rather than silently defaulting to PKW.
   */
  function selectTemplate(vehicleType) {
    const key = String(vehicleType || "").trim();
    return TEMPLATE_BY_VEHICLE_TYPE[key] || null;
  }

  // =======================================================================
  // ISSUER / STATIC DOCUMENT COPY
  //
  // Read verbatim off the approved templates. `Ort` is the issuer's seat and
  // is static in the template — it is NOT the pickup or delivery city.
  //
  // LEGAL: this wording, the GTC reference and the footer register data are
  // still pending final legal sign-off (see traceability doc, blocker B5).
  // =======================================================================
  const ISSUER = {
    senderLine: "AUTHEON GmbH • Rheinpromenade 4a • 40789 Monheim am Rhein",
    ort: "Monheim am Rhein",
    salutation: "Sehr geehrte Damen und Herren,",
    intro:
      "hiermit beauftragen wir Sie auf Grundlage Ihrer Buchung über den Marktplatz mit der Überführung des nachfolgend bezeichneten Fahrzeugs.",
    closing: ["Mit freundlichen Grüßen", "Autheon GmbH"],
    legal:
      "Dieses Dokument wurde maschinell erstellt und bedarf keiner Unterschrift. Es dokumentiert den über den digitalen Marktplatz geschlossenen Fahrauftrag. Es gelten die zum Buchungszeitpunkt aktuellen Allgemeinen Geschäftsbedingungen für Servicepartner der Autheon GmbH.",
    footer: [
      {
        strong: "AUTHEON GmbH",
        lines: ["Rheinpromenade 4a", "40789 Monheim am Rhein", "Deutschland"],
      },
      {
        lines: [
          "Geschäftsführer: Taner Özdemir",
          "Sitz der Gesellschaft: Monheim am Rhein",
          "Amtsgericht Düsseldorf – HRB 109929",
          "Steuernummer: 135/5704/1725",
          "UID-Nr.: DE456828827",
        ],
      },
      {
        lines: [
          "Bankverbindung: Commerzbank AG",
          "Kontoinhaber: Autheon GmbH",
          "IBAN: DE81 3424 0050 0352 4642 00",
          "BIC: COBADEFFXXX",
        ],
      },
      {
        lines: [
          "Bürozeiten: Mo – Fr: 08:00 Uhr – 17:00 Uhr",
          "E-Mail: Info@autheon.de",
          "Web: www.autheon.de",
          "Tel.: +49 2173 265 1110",
        ],
      },
    ],
  };

  /** Section labels, verbatim from the approved templates. */
  const LABELS = {
    ort: "Ort",
    datum: "Datum",
    auftragsnummer: "Auftragsnummer",
    geschaeftsbereich: "Geschäftsbereich",
    kunde: "Kunde",
    auftragserstellung: "Auftragserstellung",
    vehicleMakeModel: "Fahrzeughersteller & Modell",
    vehiclePlateVin: "Amt. Kennzeichen / FIN",
    registrationStatus: "Zulassungsstatus",
    pickupHeading: "ÜBERNAHME",
    pickupSubtitle: "Das Fahrzeug ist an folgender Anschrift zu übernehmen",
    deliveryHeading: "ÜBERGABE",
    deliverySubtitle: "Das Fahrzeug ist an folgender Anschrift zu übergeben",
    contact: "Ansprechpartner",
    dateTime: "Datum – Uhrzeit",
    phoneEmail: "Telefonnummer – E-Mail",
    additionalInfo: "Zusatzinformation:",
    bookingDateTime: "Buchungsdatum/-Zeit",
    compensation: "Vergütung",
    // Additional-information line labels. The blank templates carry no label
    // copy for these rows (the commented template was not supplied with this
    // bundle), so the wording is pending client/legal confirmation — see
    // blocker B5. The ORDER is fixed by TASK.md and is enforced in code.
    infoNote: "Hinweis",
    infoAltContact: "Weiterer Ansprechpartner",
    infoDriverNote: "Hinweis für den Fahrer",
    pageCounter: { of: "von", page: "Seite" },
  };

  // =======================================================================
  // FORMATTERS
  //
  // Every one is explicit and timezone-pinned. No server-locale default is
  // allowed anywhere: the output must be byte-identical on a developer Mac
  // and in a UTC container, so values are assembled from
  // `Intl.DateTimeFormat.formatToParts` rather than from a locale's own
  // date/number pattern.
  // =======================================================================
  const BERLIN = "Europe/Berlin";

  const berlinParts = (() => {
    let fmt = null;
    return function berlinPartsOf(date) {
      if (!fmt) {
        fmt = new Intl.DateTimeFormat("en-GB", {
          timeZone: BERLIN,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        });
      }
      const out = {};
      for (const p of fmt.formatToParts(date)) {
        if (p.type !== "literal") out[p.type] = p.value;
      }
      return out;
    };
  })();

  /**
   * Accepts an ISO string, a Date, or the prototype's dotted `DD.MM.` /
   * `DD.MM.YYYY` display strings. Returns null when the input carries no
   * usable date — callers decide whether that is a mandatory-field failure.
   */
  function toDate(value) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const raw = String(value || "").trim();
    if (!raw) return null;
    // Dotted prototype display format, with or without a year.
    const dotted = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?/);
    if (dotted) {
      const day = Number(dotted[1]);
      const month = Number(dotted[2]);
      const year = dotted[3] ? Number(dotted[3]) : new Date().getFullYear();
      // Noon UTC keeps the calendar day stable in Europe/Berlin (UTC+1/+2) so
      // a date-only value can never shift across the day boundary.
      const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /** `DD.MM.YYYY` in Europe/Berlin. */
  function formatGermanDate(value) {
    const d = toDate(value);
    if (!d) return "";
    const p = berlinParts(d);
    return `${p.day}.${p.month}.${p.year}`;
  }

  /** `HH:MM Uhr` in Europe/Berlin, 24h. */
  function formatGermanTime(value) {
    const d = toDate(value);
    if (!d) return "";
    const p = berlinParts(d);
    return `${p.hour}:${p.minute} Uhr`;
  }

  /**
   * A bare `HH:MM` clock string that is already wall-clock text (the
   * prototype stores time windows that way) is passed through unchanged; it
   * carries no instant and must not be re-interpreted in a time zone.
   */
  function formatClock(raw) {
    const m = String(raw || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return "";
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  }

  /** `08:00 – 12:00 Uhr`, or a single time, or "" when no window is set. */
  function formatTimeWindow(from, to) {
    const a = formatClock(from);
    const b = formatClock(to);
    if (a && b) return `${a} – ${b} Uhr`;
    if (a) return `${a} Uhr`;
    if (b) return `${b} Uhr`;
    return "";
  }

  /**
   * German money, e.g. `100,00 EUR Netto`. Built by hand from the fixed-point
   * value so no locale can substitute a different group/decimal separator.
   */
  function formatEurNet(amount) {
    // `Number("")` and `Number(null)` are both 0, so a missing compensation
    // would otherwise render as "0,00 EUR Netto" — a document asserting the
    // partner is paid nothing. An absent value must stay absent so the
    // mandatory-field check rejects it.
    if (amount === null || amount === undefined) return "";
    if (typeof amount === "string" && amount.trim() === "") return "";
    if (typeof amount === "boolean") return "";
    const n = Number(amount);
    if (!Number.isFinite(n)) return "";
    const negative = n < 0;
    const cents = Math.round(Math.abs(n) * 100);
    const whole = String(Math.floor(cents / 100));
    const frac = String(cents % 100).padStart(2, "0");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${negative ? "-" : ""}${grouped},${frac} EUR Netto`;
  }

  // =======================================================================
  // SHA-256 (pure, dependency-free, synchronous)
  //
  // The store is fully synchronous, and `crypto.subtle` is async and absent
  // in some non-secure contexts, so the checksum is computed here.
  //
  // PROTOTYPE DEVIATION, DELIBERATE AND DOCUMENTED: this hashes the CANONICAL
  // DOCUMENT SOURCE (the payload + rendered HTML), not the PDF binary. A
  // static prototype has no server that owns the bytes, and Chromium's PDF
  // output embeds a creation timestamp, so a binary hash taken in the browser
  // would not be reproducible. The generator in tools/pdf/ additionally
  // records the real SHA-256 of every PDF it writes. See blocker B6.
  // =======================================================================
  const SHA_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i += 1) {
      let c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        const lo = str.charCodeAt(i + 1);
        i += 1;
        c = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00);
        out.push(
          0xf0 | (c >> 18),
          0x80 | ((c >> 12) & 0x3f),
          0x80 | ((c >> 6) & 0x3f),
          0x80 | (c & 0x3f),
        );
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return out;
  }

  /** Hex SHA-256 of a UTF-8 string. */
  function sha256Hex(input) {
    const msg = utf8Bytes(String(input));
    const bitLen = msg.length * 8;
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    // 64-bit big-endian length; the high word is safe to derive from a float
    // because a document source never approaches 2^32 bits (512 MiB).
    const hi = Math.floor(bitLen / 0x100000000);
    const lo = bitLen >>> 0;
    msg.push(
      (hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff,
      (lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff,
    );

    const h = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    const w = new Int32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    for (let block = 0; block < msg.length; block += 64) {
      for (let i = 0; i < 16; i += 1) {
        const o = block + i * 4;
        w[i] =
          (msg[o] << 24) | (msg[o + 1] << 16) | (msg[o + 2] << 8) | msg[o + 3];
      }
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i += 1) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + SHA_K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0;
      h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0;
      h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
  }

  // =======================================================================
  // HTML ESCAPING
  //
  // Escaped by default. Every value that reaches the template goes through
  // `esc()`; there is no raw-HTML interpolation path in this renderer at all,
  // so a partner name, an address or a free-text note can never inject markup
  // or trigger a renderer-side network request.
  // =======================================================================
  const ESC_MAP = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  function esc(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (ch) => ESC_MAP[ch],
    );
  }

  // =======================================================================
  // MANDATORY / OPTIONAL CLASSIFICATION
  //
  // Sourced, not invented:
  //   * order fields  -> the repository's existing `validateOrderDraft()`
  //     (customer, vehicle set, driver offer, both addresses, both dates);
  //   * recipient set -> Technical Specifications §2 "Recipient" (snapshot of
  //     company name, street, house number, postal code, city and country);
  //   * tour + booking timestamp -> Technical Specifications §1/§2.
  //
  // House number is listed by the specification but is NOT required by the
  // repository's address validation, so it is treated as optional and its
  // line collapses cleanly. Everything the sources do not classify stays
  // optional — see blocker B4 for the classifications awaiting confirmation.
  // =======================================================================
  const MANDATORY_FIELDS = [
    "tour",
    "vehicleType",
    "customerName",
    "manufacturer",
    "vehicleModel",
    "plate",
    "vin",
    "transportType",
    "registrationStatus",
    "compensation",
    "bookedAt",
    "servicePartner.company",
    "servicePartner.street",
    "servicePartner.postalCode",
    "servicePartner.city",
    "servicePartner.country",
    "pickup.street",
    "pickup.postalCode",
    "pickup.city",
    "pickup.date",
    "delivery.street",
    "delivery.postalCode",
    "delivery.city",
    "delivery.date",
  ];

  const nonEmpty = (v) => String(v == null ? "" : v).trim() !== "";

  // =======================================================================
  // PAYLOAD MAPPING
  // =======================================================================

  function addressLines(loc) {
    const street = [loc.street, loc.houseNumber].filter(nonEmpty).join(" ");
    const town = [loc.postalCode, loc.city].filter(nonEmpty).join(" ");
    return [loc.name, street, town, loc.country].filter(nonEmpty);
  }

  /**
   * Additional-information entries, in the order TASK.md fixes:
   * location note, additional contact person, driver note. An absent entry is
   * dropped entirely — label included — so no empty placeholder is ever
   * rendered.
   */
  function additionalInfo(loc, driverNote) {
    return [
      { label: LABELS.infoNote, text: loc.notes },
      { label: LABELS.infoAltContact, text: loc.alternateContactPerson },
      { label: LABELS.infoDriverNote, text: driverNote },
    ].filter((row) => nonEmpty(row.text));
  }

  function locationSection(loc, driverNote) {
    return {
      addressLines: addressLines(loc),
      contact: String(loc.contactPerson || "").trim(),
      date: formatGermanDate(loc.date),
      timeWindow: formatTimeWindow(loc.windowFrom, loc.windowTo),
      phone: String(loc.phone || "").trim(),
      email: String(loc.email || "").trim(),
      additionalInfo: additionalInfo(loc, driverNote),
    };
  }

  /**
   * Maps structured backend data into the render DTO.
   *
   * INPUT IS STRUCTURED BACKEND DATA ONLY. No argument may come from rendered
   * UI text, and no field here reads a translated label.
   *
   * @param {object} input
   * @param {object} input.job                 order record (canonical values)
   * @param {object} input.servicePartner      booking-time snapshot, already frozen
   * @param {object} [input.admin]             order creator (name/initials, phone)
   * @param {string|Date} input.bookedAt       the binding booking instant
   * @param {object} [input.gtc]               { documentId, version }
   * @returns {{ok: boolean, missing: string[], payload: object|null}}
   */
  function buildPayload(input) {
    const job = input.job || {};
    const partner = input.servicePartner || {};
    const admin = input.admin || {};
    const pickup = job.pickup || {};
    const delivery = job.delivery || {};

    const template = selectTemplate(job.vehicleType);
    const transportLabel = TRANSPORT_TYPE_LABEL[job.transportType] || "";
    const registration = String(job.registrationStatus || "");
    const compensation = job.driverOffer;
    const bookedAt = input.bookedAt;

    // ---- mandatory-field validation ------------------------------------
    const values = {
      tour: job.tour,
      vehicleType: template,
      customerName: job.customerName || job.customer,
      manufacturer: job.manufacturer,
      vehicleModel: job.vehicleModel,
      plate: job.plate,
      vin: job.vin,
      transportType: transportLabel,
      registrationStatus: REGISTRATION_LABEL[registration] || "",
      compensation: formatEurNet(compensation),
      bookedAt: formatGermanDate(bookedAt),
      "servicePartner.company": partner.company,
      "servicePartner.street": partner.street,
      "servicePartner.postalCode": partner.postalCode,
      "servicePartner.city": partner.city,
      "servicePartner.country": partner.country,
      "pickup.street": pickup.street,
      "pickup.postalCode": pickup.postalCode,
      "pickup.city": pickup.city,
      "pickup.date": formatGermanDate(pickup.date),
      "delivery.street": delivery.street,
      "delivery.postalCode": delivery.postalCode,
      "delivery.city": delivery.city,
      "delivery.date": formatGermanDate(delivery.date),
    };
    const missing = MANDATORY_FIELDS.filter((f) => !nonEmpty(values[f]));
    if (missing.length) return { ok: false, missing, payload: null };

    const tour = String(job.tour).trim();
    const creator = [
      String(admin.initials || admin.name || "").trim(),
      String(admin.phone || "").trim(),
    ].filter(nonEmpty);

    const payload = {
      // --- identity / metadata ----------------------------------------
      template,
      title: TEMPLATE_TITLE[template],
      // PDF metadata (Technical Specifications §3).
      metaTitle: `Fahrauftrag ${tour}`,
      metaAuthor: "AUTHEON GmbH",
      // ONE tour identifier across filename, metadata title, UI and audit.
      tour,
      jobId: String(job.id || ""),
      fileName: `Fahrauftrag-${tour}.pdf`,

      issuer: ISSUER,
      labels: LABELS,

      // --- recipient: booking-time service-partner snapshot ------------
      recipient: addressLines({
        name: partner.company,
        street: partner.street,
        houseNumber: partner.houseNumber,
        postalCode: partner.postalCode,
        city: partner.city,
        country: partner.country,
        // The contact person is a separate line above the street in the
        // approved template, so it is spliced in below rather than here.
      }),
      recipientPerson: String(partner.person || "").trim(),

      // --- right-hand meta grid ---------------------------------------
      meta: {
        ort: ISSUER.ort,
        datum: formatGermanDate(bookedAt),
        auftragsnummer: tour,
        geschaeftsbereich: transportLabel,
        kunde: String(job.customerName || job.customer).trim(),
        auftragserstellung: creator.join(" · "),
      },

      // --- vehicle ----------------------------------------------------
      vehicle: {
        makeModel: `${String(job.manufacturer).trim()} ${String(job.vehicleModel).trim()}`,
        plate: String(job.plate).trim(),
        vin: String(job.vin).trim(),
        registered: registration === REGISTRATION_REGISTERED,
        deregistered: registration === REGISTRATION_DEREGISTERED,
        registeredLabel: REGISTRATION_LABEL[REGISTRATION_REGISTERED],
        deregisteredLabel: REGISTRATION_LABEL[REGISTRATION_DEREGISTERED],
      },

      pickup: locationSection(pickup, job.notesDriver),
      delivery: locationSection(delivery, job.notesDriver),

      booking: {
        date: formatGermanDate(bookedAt),
        time: formatGermanTime(bookedAt),
        compensation: formatEurNet(compensation),
      },

      // NOTE: `job.distanceKm` is deliberately absent. The client technical
      // specification excludes the PWA distance from the PDF; the older PRD
      // Task 17 acceptance text still lists it. This single omission is the
      // isolated distance change — see blocker B1.
    };

    return { ok: true, missing: [], payload };
  }

  // =======================================================================
  // RENDERING
  // =======================================================================

  /**
   * DEFAULT DOCUMENT FONT.
   *
   * Deliberately TrueType, not woff2. Chromium/Skia can only embed a real
   * `sfnt` into the PDF; when it is handed a woff2 webfont it falls back to
   * Type3 outline glyphs, which breaks both "fonts fully embedded" and text
   * extraction. These are the canonical OFL Montserrat static faces served by
   * Google's own font host, referenced — never copied into the repository,
   * which intentionally ships no font binaries.
   *
   * Pass `options.fontCss` to replace this with `@font-face` rules that inline
   * repository-owned licensed files as data: URIs; `tools/pdf/fetch-fonts.mjs`
   * plus `--font-dir` does exactly that for the generator. Production must
   * vendor licensed files rather than depend on this host — blocker B3.
   */
  const GSTATIC = "https://fonts.gstatic.com/s/montserrat/v31";
  const DEFAULT_FONT_CSS = [
    "@font-face{font-family:Montserrat;font-style:normal;font-weight:400;font-display:block;" +
      `src:url(${GSTATIC}/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aX8.ttf) format("truetype");}`,
    "@font-face{font-family:Montserrat;font-style:normal;font-weight:700;font-display:block;" +
      `src:url(${GSTATIC}/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM73w5aX8.ttf) format("truetype");}`,
  ].join("\n");

  /**
   * Checkbox as a stable inline vector object. Drawn rather than typed: the
   * approved template used a Segoe UI Symbol glyph, which is a host font we
   * must not depend on. `X` marks the applicable box (spec §2).
   */
  function checkbox(selected) {
    const mark = selected
      ? '<path d="M1.9 1.9 L6.5 6.5 M6.5 1.9 L1.9 6.5" stroke="#000" stroke-width="0.85" fill="none"/>'
      : "";
    return (
      '<svg class="cb" viewBox="0 0 8.4 8.4" aria-hidden="true">' +
      '<rect x="0.25" y="0.25" width="7.9" height="7.9" fill="none" stroke="#000" stroke-width="0.5"/>' +
      mark +
      "</svg>"
    );
  }

  /**
   * Wordmark. Uses the supplied SVG asset when one is configured, otherwise
   * types "AUTHEON" in the document font at the measured cap height and
   * width. The typeset form is a PLACEHOLDER: the production logotype is part
   * of the pending branding pack (repository open question OQ-4, blocker B5).
   */
  function wordmark(logoSvgDataUri) {
    if (logoSvgDataUri) {
      return `<img class="logo" src="${esc(logoSvgDataUri)}" alt="AUTHEON" />`;
    }
    return '<div class="logo logo-type" aria-label="AUTHEON">AUTHEON</div>';
  }

  /**
   * The additional-information cell, or "" when the section carries none.
   *
   * Returning "" drops the WHOLE table — the `Zusatzinformation:` label
   * included. An empty labelled 48pt box would be exactly the blank
   * placeholder the specification forbids ("optional field missing: hide the
   * label and content").
   */
  function infoBlock(section, labels) {
    if (!section.additionalInfo.length) return "";
    const rows = section.additionalInfo
      .map(
        (row) =>
          `<div class="info-row"><span class="info-label">${esc(row.label)}:</span> ${esc(row.text)}</div>`,
      )
      .join("");
    return (
      `<div class="info-title">${esc(labels.additionalInfo)}</div>` +
      `<div class="info-body">${rows}</div>`
    );
  }

  /**
   * One ÜBERNAHME / ÜBERGABE block: grey heading cell spanning the address
   * lines, then contact / date-time / phone-email rows, then the
   * additional-information cell. Optional values collapse their whole row so
   * no labelled blank is emitted.
   */
  function locationBlock(section, heading, subtitle, labels) {
    const address = section.addressLines
      .map((line) => `<div class="addr-line">${esc(line)}</div>`)
      .join("");

    // A split row whose second half has no value merges into one cell rather
    // than leaving a visibly empty box next to the filled one. The whole row
    // disappears when neither half has a value.
    const splitRow = (label, left, right, rightClass) => {
      if (!nonEmpty(left) && !nonEmpty(right)) return "";
      const head = `<tr><th>${esc(label)}</th>`;
      if (!nonEmpty(right)) {
        return `${head}<td colspan="2">${esc(left)}</td></tr>`;
      }
      if (!nonEmpty(left)) {
        return `${head}<td colspan="2" class="${rightClass}">${esc(right)}</td></tr>`;
      }
      return (
        `${head}<td class="c1">${esc(left)}</td>` +
        `<td class="c2 ${rightClass}">${esc(right)}</td></tr>`
      );
    };

    const rows = [];
    if (section.contact) {
      rows.push(
        `<tr><th>${esc(labels.contact)}</th><td colspan="2">${esc(section.contact)}</td></tr>`,
      );
    }
    rows.push(splitRow(labels.dateTime, section.date, section.timeWindow, ""));
    rows.push(
      splitRow(labels.phoneEmail, section.phone, section.email, "wrap-any"),
    );
    const bodyRows = rows.filter(Boolean);

    const info = infoBlock(section, labels);
    return (
      '<section class="loc keep-together">' +
      '<table class="t t-loc-head"><tbody><tr>' +
      `<th class="head-cell" rowspan="${Math.max(section.addressLines.length, 1)}">` +
      `<div class="head-title">${esc(heading)}</div>` +
      `<div class="head-sub">${esc(subtitle)}</div>` +
      "</th>" +
      `<td class="addr">${address}</td>` +
      "</tr></tbody></table>" +
      (bodyRows.length
        ? `<table class="t t-loc-rows"><tbody>${bodyRows.join("")}</tbody></table>`
        : "") +
      (info
        ? `<table class="t t-info"><tbody><tr><td>${info}</td></tr></tbody></table>`
        : "") +
      "</section>"
    );
  }

  /**
   * The complete, self-contained A4 document.
   *
   * Header (title + wordmark) and footer (legal paragraph + register band)
   * live in `<thead>` / `<tfoot>` of one wrapper table, so Chromium repeats
   * them on every printed page by the paged-media spec — no fixed
   * positioning, no manual height maths, and no hardcoded page count.
   *
   * @param {object} payload      from `buildPayload()`
   * @param {object} [options]
   * @param {string} [options.fontCss]         @font-face CSS (data: URIs) that
   *   replaces DEFAULT_FONT_CSS once licensed Montserrat files exist
   * @param {string} [options.logoSvgDataUri]  wordmark asset, when available
   * @param {number} [options.pageMarginBottom] pt reserved for the generator's
   *   `Seite X von Y` counter strip; 0 for single-page output
   */
  function renderHtml(payload, options) {
    const opts = options || {};
    const labels = payload.labels;
    const v = payload.vehicle;

    // Recipient: company, contact person, then the address lines.
    const recipientLines = [payload.recipient[0], payload.recipientPerson]
      .filter(nonEmpty)
      .concat(payload.recipient.slice(1));

    const metaRows = [
      [
        [labels.ort, payload.meta.ort],
        [labels.datum, payload.meta.datum],
      ],
      [
        [labels.auftragsnummer, payload.meta.auftragsnummer],
        [labels.geschaeftsbereich, payload.meta.geschaeftsbereich],
      ],
      [
        [labels.kunde, payload.meta.kunde],
        [labels.auftragserstellung, payload.meta.auftragserstellung],
      ],
    ]
      .map(
        (row) =>
          '<div class="meta-row">' +
          row
            .map(
              ([label, value]) =>
                '<div class="meta-cell">' +
                `<div class="meta-label">${esc(label)}</div>` +
                `<div class="meta-value">${esc(value)}</div>` +
                "</div>",
            )
            .join("") +
          "</div>",
      )
      .join("");

    const fontFaces = `<style>${opts.fontCss || DEFAULT_FONT_CSS}</style>`;

    const footerCols = payload.issuer.footer
      .map(
        (col) =>
          '<div class="fcol">' +
          (col.strong ? `<div class="fstrong">${esc(col.strong)}</div>` : "") +
          col.lines.map((l) => `<div>${esc(l)}</div>`).join("") +
          "</div>",
      )
      .join("");

    return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${esc(payload.metaTitle)}</title>
<meta name="author" content="${esc(payload.metaAuthor)}" />
${fontFaces}
<style>
/* ---------------------------------------------------------------------
   Geometry, in PostScript points, measured from the approved templates.
   The three horizontal edges are intentionally NOT unified: the source
   document sets body text, tables and the footer band to slightly
   different widths, and reproducing that is what makes the render match.
   --------------------------------------------------------------------- */
:root {
  --geo-margin-left: 70.8pt;
  --geo-text-width: 453.7pt;   /* 70.8 -> 524.5 */
  --geo-table-width: 467.9pt;  /* 70.8 -> 538.7 */
  --geo-footer-offset: -3pt;   /* footer band starts at x 67.8 */
  --geo-footer-width: 460.3pt; /* 67.8 -> 528.1 */
  --geo-label-col: 155.3pt;    /* 70.8 -> 226.1 */
  --geo-value-col-1: 121.1pt;  /* 226.1 -> 347.2 */
  --geo-header-top: 29.7pt;
  --geo-header-height: 62pt;
  --geo-footer-bottom: 15.7pt;
  --geo-row-height: 16.1pt;
  --geo-cell-pad-x: 5.3pt;
  --geo-block-gap: 16.4pt;
  --line-9: 10.4pt;
  --rule: #000;
  --grey-cell: #f2f2f2;
}
@page {
  size: A4;
  margin: 0 0 ${Number(opts.pageMarginBottom) || 0}pt 0;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; }
body {
  font-family: Montserrat, sans-serif;
  font-size: 9pt;
  line-height: var(--line-9);
  color: #000;
  background: #fff;
  -webkit-font-smoothing: antialiased;
  /* Paged-media hardening: never orphan a single line of a paragraph. */
  widows: 2;
  orphans: 2;
}
.keep-together { break-inside: avoid; }

/* One wrapper table = automatic per-page header/footer repetition. */
table.page { width: 100%; height: 100%; border-collapse: collapse; }
table.page > thead { display: table-header-group; }
table.page > tfoot { display: table-footer-group; }
table.page > tbody > tr > td { vertical-align: top; }

/* ---- repeated header ---- */
.doc-header {
  position: relative;
  height: var(--geo-header-height);
  padding-top: var(--geo-header-top);
  margin-left: var(--geo-margin-left);
  width: var(--geo-text-width);
}
.doc-title {
  position: absolute;
  left: 0;
  top: 36.4pt;
  font-size: 14.04pt;
  line-height: 1;
  letter-spacing: 0.15pt;
  white-space: nowrap;
}
.doc-title b { font-weight: 700; }
.logo { position: absolute; right: 0; top: 29.7pt; height: 16.9pt; width: 146.1pt; }
/* Placeholder wordmark — see wordmark() for why this is not the final asset. */
.logo-type {
  font-size: 17.4pt;
  line-height: 16.9pt;
  font-weight: 400;
  letter-spacing: 1.55pt;
  text-align: right;
  white-space: nowrap;
}

/* ---- page-1 top block ---- */
.body-pad { margin-left: var(--geo-margin-left); }
.top { display: flex; align-items: flex-start; margin-top: 6.3pt; }
.top-left { width: 227.5pt; flex: 0 0 227.5pt; }
.sender { font-size: 6pt; line-height: 8.9pt; }
.recipient { margin-top: 3.6pt; }
.recipient div { font-size: 9pt; line-height: 12.6pt; }
.meta-grid { width: 232.5pt; flex: 0 0 232.5pt; margin-left: 17.5pt; margin-top: 7.1pt; }
.meta-row { display: flex; margin-bottom: 8.4pt; }
.meta-cell { width: 108.8pt; flex: 0 0 108.8pt; padding-left: 12.6pt; }
.meta-cell + .meta-cell { width: 109.2pt; flex: 0 0 109.2pt; }
.meta-label, .meta-value { font-size: 6pt; line-height: 8.4pt; }

.salutation { margin-top: 32.1pt; }
.intro {
  margin-top: 11.1pt;
  width: var(--geo-text-width);
  text-align: justify;
  text-justify: inter-word;
}

/* ---- shared table system ----
   Visible hairlines only where the approved template draws them; the
   right-hand meta grid and the address block above stay borderless. */
table.t {
  width: var(--geo-table-width);
  margin-left: var(--geo-margin-left);
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: var(--geo-block-gap);
}
table.t + table.t { margin-top: 0; }
table.t th, table.t td {
  border: 0.5pt solid var(--rule);
  padding: 3pt var(--geo-cell-pad-x) 2.7pt;
  font-weight: 400;
  text-align: left;
  vertical-align: top;
  /* No fixed row height: on a table cell, height acts as a MINIMUM, so long
     values grow the row instead of being clipped. */
  height: var(--geo-row-height);
  break-inside: avoid;
}
table.t th { width: var(--geo-label-col); }
table.t td.c1 { width: var(--geo-value-col-1); }
/* Long unbroken tokens (international e-mail addresses) must wrap rather
   than overflow the cell. */
.wrap-any { overflow-wrap: anywhere; word-break: break-word; }

/* ---- vehicle table ---- */
.plate-cell .dereg { color: #c00000; font-weight: 700; }
/* Higher specificity than table.t td on purpose: the template gives this
   cell two 16pt lines and no vertical padding. */
table.t td.reg-cell { line-height: 16.05pt; padding-top: 0; padding-bottom: 0; }
.cb { width: 8.4pt; height: 8.4pt; vertical-align: -0.6pt; margin-right: 1.8pt; }

/* ---- location blocks ---- */
.loc { margin-top: var(--geo-block-gap); }
.loc table.t { margin-top: 0; }
table.t th.head-cell {
  background: var(--grey-cell);
  text-align: center;
  vertical-align: middle;
  padding: 0 var(--geo-cell-pad-x);
}
.head-title { font-size: 14.04pt; line-height: 16.1pt; letter-spacing: 0.2pt; }
.head-sub { font-size: 5.04pt; line-height: 7.5pt; margin-top: 1.5pt; }
table.t td.addr { padding: 0 var(--geo-cell-pad-x); }
.addr-line { line-height: 16.1pt; }
table.t.t-info td { height: 48pt; }
.info-title { line-height: var(--line-9); }
/* Additional-information CONTENT is 7 pt (TASK.md); its label row is not. */
.info-body { font-size: 7pt; line-height: 9.2pt; margin-top: 1.5pt; }
.info-label { font-weight: 700; }
.info-row { overflow-wrap: anywhere; }

/* ---- closing / footer ---- */
.closing { margin-top: 12.4pt; font-size: 9.96pt; line-height: 12.1pt; }
.legal {
  margin-left: var(--geo-margin-left);
  width: var(--geo-text-width);
  margin-top: 2pt;
  font-size: 6pt;
  line-height: 7.4pt;
  text-align: justify;
}
.footer-band {
  margin-left: calc(var(--geo-margin-left) + var(--geo-footer-offset));
  width: var(--geo-footer-width);
  margin-top: 10.8pt;
  padding-bottom: var(--geo-footer-bottom);
  display: flex;
  color: #0d0d0d;
}
.fcol {
  border-left: 0.5pt solid #0d0d0d;
  min-height: 36.6pt;
  padding: 0 4pt 0 5.1pt;
  font-size: 5.04pt;
  line-height: 6.1pt;
}
.fcol:nth-child(1) { width: 115.2pt; }
.fcol:nth-child(2) { width: 122.2pt; }
.fcol:nth-child(3) { width: 108pt; }
.fcol:nth-child(4) { width: 115pt; }
.fstrong { font-size: 6pt; line-height: 7.3pt; font-weight: 700; }
</style>
</head>
<body data-template="${esc(payload.template)}" data-tour="${esc(payload.tour)}">
<table class="page">
  <thead><tr><td>
    <div class="doc-header">
      <div class="doc-title">${esc(payload.title.lead)} <b>${esc(payload.title.accent)}</b></div>
      ${wordmark(opts.logoSvgDataUri)}
    </div>
  </td></tr></thead>
  <tfoot><tr><td>
    <div class="legal">${esc(payload.issuer.legal)}</div>
    <div class="footer-band">${footerCols}</div>
  </td></tr></tfoot>
  <tbody><tr><td>
    <div class="body-pad">
      <div class="top">
        <div class="top-left">
          <div class="sender">${esc(payload.issuer.senderLine)}</div>
          <div class="recipient">${recipientLines
            .map((l) => `<div>${esc(l)}</div>`)
            .join("")}</div>
        </div>
        <div class="meta-grid">${metaRows}</div>
      </div>
      <div class="salutation">${esc(payload.issuer.salutation)}</div>
      <div class="intro">${esc(payload.issuer.intro)}</div>
    </div>

    <table class="t t-vehicle keep-together"><tbody>
      <tr>
        <th>${esc(labels.vehicleMakeModel)}</th>
        <td colspan="2">${esc(v.makeModel)}</td>
      </tr>
      <tr>
        <th>${esc(labels.vehiclePlateVin)}</th>
        <td class="c1 plate-cell">${esc(v.plate)}${
          v.deregistered
            ? ` <span class="dereg">${esc(v.deregisteredLabel)}</span>`
            : ""
        }</td>
        <td class="c2 wrap-any">${esc(v.vin)}</td>
      </tr>
      <tr>
        <th>${esc(labels.registrationStatus)}</th>
        <td colspan="2" class="reg-cell">
          <div>${checkbox(v.registered)}${esc(v.registeredLabel)}</div>
          <div>${checkbox(v.deregistered)}${esc(v.deregisteredLabel)}</div>
        </td>
      </tr>
    </tbody></table>

    ${locationBlock(payload.pickup, labels.pickupHeading, labels.pickupSubtitle, labels)}
    ${locationBlock(payload.delivery, labels.deliveryHeading, labels.deliverySubtitle, labels)}

    <table class="t t-booking keep-together"><tbody>
      <tr>
        <th>${esc(labels.bookingDateTime)}</th>
        <td class="c1">${esc(payload.booking.date)}</td>
        <td class="c2">${esc(payload.booking.time)}</td>
      </tr>
      <tr>
        <th>${esc(labels.compensation)}</th>
        <td colspan="2">${esc(payload.booking.compensation)}</td>
      </tr>
    </tbody></table>

    <div class="body-pad closing">${payload.issuer.closing
      .map((l) => `<div>${esc(l)}</div>`)
      .join("")}</div>
  </td></tr></tbody>
</table>
</body>
</html>`;
  }

  /**
   * Convenience: map + render + checksum in one call.
   * Returns `{ok:false, missing}` unchanged when mandatory data is absent, so
   * a caller can never accidentally publish an incomplete document.
   */
  function buildDocument(input, options) {
    const built = buildPayload(input);
    if (!built.ok) return built;
    const html = renderHtml(built.payload, options);
    // The checksum covers the canonical source: the mapped payload AND the
    // rendered markup. Any change to either produces a different digest.
    const checksum = sha256Hex(
      `${JSON.stringify(built.payload)}\n${html}`,
    );
    return { ok: true, missing: [], payload: built.payload, html, checksum };
  }

  /**
   * Hands a rendered document to the browser's own PDF writer.
   *
   * WHY THIS IS THE PROTOTYPE'S DOWNLOAD PATH: the repository is a static
   * front end with no server, so nothing here can produce PDF bytes. Chromium
   * can — it is the same engine `tools/pdf/` drives through Playwright — so the
   * document is printed from a detached iframe and the user saves it as PDF.
   * The layout, the embedded Montserrat faces and the A4 page box are
   * identical to the generated review artefacts because it is the same HTML.
   * See the traceability document, "Prototype deviations", for what production
   * must do instead.
   *
   * Returns false when there is no DOM (Node-side tests) or no content.
   */
  function printDocumentHtml(html, title) {
    if (typeof document === "undefined" || !html) return false;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.title = title || "Fahrauftrag";
    // Off-screen rather than display:none — a hidden frame has no layout, and
    // Chromium will not paginate what it never laid out.
    frame.style.cssText =
      "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;";
    document.body.appendChild(frame);
    const cleanup = () => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    };
    frame.onload = () => {
      try {
        const win = frame.contentWindow;
        // Fonts must be ready or Chromium prints with substituted metrics.
        const go = () => {
          win.focus();
          win.print();
          // Safari/Firefox return from print() synchronously; Chromium's modal
          // resolves before this fires. A timeout keeps the frame alive long
          // enough for every engine without leaking it.
          setTimeout(cleanup, 2000);
        };
        if (win.document.fonts?.ready) {
          win.document.fonts.ready.then(go, go);
        } else {
          go();
        }
      } catch (_) {
        cleanup();
      }
    };
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    return true;
  }

  global.AutheonTransportOrderPdf = {
    // constants
    TEMPLATE_PKW,
    TEMPLATE_LKW,
    TEMPLATE_BY_VEHICLE_TYPE,
    TEMPLATE_TITLE,
    TRANSPORT_TYPE_LABEL,
    REGISTRATION_LABEL,
    MANDATORY_FIELDS,
    ISSUER,
    LABELS,
    // behaviour
    selectTemplate,
    formatGermanDate,
    formatGermanTime,
    formatTimeWindow,
    formatEurNet,
    sha256Hex,
    escapeHtml: esc,
    buildPayload,
    renderHtml,
    buildDocument,
    printDocumentHtml,
  };
})(typeof window !== "undefined" ? window : globalThis);
