// AUTHEON — Shared store (PRD v1.6 prototype). Target spec: AUTHEON/prd.json
// Domain glossary: DOMAIN.md
// Single source of truth for Driver + Admin views.
// Operational statuses: draft, published, assigned, accepted, performed, cancelled, special_case.
// pickup/delivery/orderingPartyName are canonical; syncDisplayFields() denormalizes flat fields for tables/CSV.

window.AuthStore = (() => {
  const listeners = new Set();
  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  const emit = () => listeners.forEach((fn) => fn());

  const DEMO_DRIVER = "Jordan Blake";
  const DEMO_ADMIN = "Anna Bauer";

  const AXLE_OWN = "driven on own wheels";
  const AXLE_THIRD = "third-party axle";

  const STATUSES = {
    draft: { i18n: "status.draft", cls: "draft" },
    published: { i18n: "status.published", cls: "published" },
    assigned: { i18n: "status.assigned", cls: "assigned" },
    accepted: { i18n: "status.accepted", cls: "accepted" },
    performed: { i18n: "status.performed", cls: "performed" },
    cancelled: { i18n: "status.cancelled", cls: "cancelled" },
    special_case: { i18n: "status.special_case", cls: "special_case" },
  };

  const DOC_REVIEW = [
    "uploaded",
    "accepted",
    "rejected",
    "correction_required",
  ];

  function normalizeTourDocumentReviewStatus(st) {
    const s = String(st || "").trim();
    if (DOC_REVIEW.includes(s)) return s;
    return "uploaded";
  }

  function tourDocumentNeedsPartnerCorrection(reviewStatus) {
    return normalizeTourDocumentReviewStatus(reviewStatus) === "correction_required";
  }

  /** Canonical billing invoice document type for tour uploads. */
  const TOUR_DOC_TYPE_INVOICE = "invoice";

  function normalizeTourDocumentType(type) {
    const t = String(type || "").trim();
    return t || TOUR_DOC_TYPE_INVOICE;
  }

  function isTourBillingInvoiceType(type) {
    return normalizeTourDocumentType(type) === TOUR_DOC_TYPE_INVOICE;
  }

  /** Which admin review actions apply for a per-file reviewStatus (V1 — same for all document types). */
  function tourDocumentReviewActions(reviewStatus) {
    const st = normalizeTourDocumentReviewStatus(reviewStatus);
    const pending = st === "uploaded";
    return {
      canView: true,
      canDownload: true,
      canAccept: pending,
      canReject: pending,
      canRequireCorrection: st === "rejected",
      canReplace:
        st === "uploaded" || st === "rejected" || st === "correction_required",
    };
  }

  const SETTLEMENT_STATES = [
    "Not Started",
    "Pending",
    "Processed",
    "Paid",
    "Needs Clarification",
    "Closed",
  ];

  const PAYMENT_STATUSES = ["Invoice Missing", "Invoice Received", "Paid"];

  function normalizePaymentStatus(st) {
    const s = String(st || "").trim();
    if (PAYMENT_STATUSES.includes(s)) return s;
    return "Invoice Missing";
  }

  function mkLocation(over = {}) {
    return {
      locationId: over.locationId || null,
      name: over.name || "",
      street: over.street || "",
      houseNumber: over.houseNumber || "",
      postalCode: over.postalCode || "",
      city: over.city || "",
      country: over.country || "DE",
      contactPerson: over.contactPerson || "",
      alternateContactPerson: over.alternateContactPerson || "",
      phone: over.phone || "",
      secondPhone: over.secondPhone || "",
      email: over.email || "",
      notes: over.notes || "",
      date: over.date || "",
      dateLong: over.dateLong || "",
      windowFrom: over.windowFrom || "",
      windowTo: over.windowTo || "",
      windowFlex: !!over.windowFlex,
    };
  }

  function mk(over) {
    const job = {
      id: "",
      tour: "",
      category: "Standard",
      orderingPartyId: "",
      orderingPartyName: "",
      pickup: mkLocation(),
      delivery: mkLocation(),
      distanceKm: 0,
      distanceManualOverride: null,
      distanceEstimateSource: null,
      vehicle: "",
      vehicleModel: "",
      plate: "",
      vin: "",
      axle: AXLE_OWN,

      revenue: null,
      driverCompensation: null,
      expenses: null,
      notes: "",
      notesDriver: "",
      status: "draft",
      driver: null,
      driverId: null,
      isNew: false,
      history: [],
      createdAt: "",
      pdfVersion: 0,
      performedAt: "",
      documentReviewSummary: "Not Started",
      settlementState: "Not Started",
      specialCaseReport: null,
      cancellationActor: null,
      cancellationReason: "",
      cancellationReasonText: "",
      // Denormalized display fields (syncDisplayFields)
      customer: "",
      startCity: "",
      startPlz: "",
      startStreet: "",
      startCompany: "",
      endCity: "",
      endPlz: "",
      endStreet: "",
      endCompany: "",
      date: "",
      dateLong: "",
      windowFrom: "",
      windowTo: "",
      windowFlex: false,
      contactPickup: { name: "", phone: "" },
      contactDelivery: { name: "", phone: "" },
      netAmount: null,
      vatRate: 19,
      grossAmount: null,
      invoiceReceived: false,
      invoiceType: "",
      invoiceNumber: "",
      paymentStatus: "Invoice Missing",
      financialNotes: "",
      adminInvoiceOverride: null,
      ...over,
    };
    if (over.pickup) job.pickup = mkLocation({ ...job.pickup, ...over.pickup });
    if (over.delivery)
      job.delivery = mkLocation({ ...job.delivery, ...over.delivery });
    syncDisplayFields(job);
    return job;
  }

  function formatStreet(loc) {
    const s = [loc.street, loc.houseNumber].filter(Boolean).join(" ");
    return s.trim();
  }

  function partnerOfferAmount(job) {
    if (!job) return 0;
    const n = job.driverCompensation;
    if (n == null || n === "") return 0;
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  }

  /** Copy structured pickup/delivery/ordering party into flat fields for tables and CSV. */
  function syncDisplayFields(job) {
    if (!job) return job;
    const pu = job.pickup || mkLocation();
    const del = job.delivery || mkLocation();
    job.customer = job.orderingPartyName || job.customer || "";
    job.startCity = pu.city || "";
    job.startPlz = pu.postalCode || "";
    job.startStreet = formatStreet(pu) || pu.street || "";
    job.startCompany = pu.name || "";
    job.endCity = del.city || "";
    job.endPlz = del.postalCode || "";
    job.endStreet = formatStreet(del) || del.street || "";
    job.endCompany = del.name || "";
    job.date = pu.date || job.date || "";
    job.dateLong = pu.dateLong || job.dateLong || "";
    job.windowFrom = pu.windowFrom || "";
    job.windowTo = pu.windowTo || "";
    job.windowFlex = !!pu.windowFlex;
    job.deliveryDate = del.date || "";
    job.deliveryDateLong = del.dateLong || "";
    job.deliveryWindowFrom = del.windowFrom || "";
    job.deliveryWindowTo = del.windowTo || "";
    job.deliveryWindowFlex = !!del.windowFlex;
    job.contactPickup = {
      name: pu.contactPerson || "",
      phone: pu.phone || "",
      secondPhone: pu.secondPhone || "",
      email: pu.email || "",
    };
    job.contactDelivery = {
      name: del.contactPerson || "",
      phone: del.phone || "",
      secondPhone: del.secondPhone || "",
      email: del.email || "",
    };
    return job;
  }

  function normalizeAxle(raw) {
    const s = String(raw || "").trim();
    const map = {
      Eigenachse: AXLE_OWN,
      Fremdachse: AXLE_THIRD,
      "Own axle": AXLE_OWN,
      "Third-party axle": AXLE_THIRD,
      [AXLE_OWN]: AXLE_OWN,
      [AXLE_THIRD]: AXLE_THIRD,
    };
    return map[s] || AXLE_OWN;
  }

  function seedOrderingParties() {
    return [
      {
        id: "OP-001",
        name: "Muller Automobile GmbH",
        type: "Dealer group",
        contact: "H. Schneider",
        phone: "+49 89 1234567",
        email: "logistics@muller-auto.example",
        billingNotes: "Net 14 days; PO required on invoice.",
        instructions: "Keys at reception; logistics yard requires safety vest.",
        active: true,
      },
      {
        id: "OP-002",
        name: "Classic Cars AG",
        type: "Fleet customer",
        contact: "S. Keller",
        phone: "+49 711 441122",
        email: "dispatch@classiccars.example",
        billingNotes: "Historic vehicle surcharge may apply.",
        instructions:
          "Historic vehicles require enclosed transport confirmation.",
        active: true,
      },
      {
        id: "OP-003",
        name: "Nord-Flotte GmbH",
        type: "Fleet customer",
        contact: "T. Brandt",
        phone: "+49 421 778899",
        email: "ops@nordflotte.example",
        billingNotes: "",
        instructions: "Report pickup delays to dispatch immediately.",
        active: true,
      },
      {
        id: "OP-004",
        name: "AutoLogistik KG",
        type: "Logistics hub",
        contact: "J. Tausch",
        phone: "+49 30 552288",
        email: "hub@autologistik.example",
        billingNotes: "Hub-to-hub transfers.",
        instructions: "",
        active: true,
      },
      {
        id: "OP-005",
        name: "Muller & Sohn KG",
        type: "Dealer branch",
        contact: "A. Weiss",
        phone: "+49 30 334455",
        email: "berlin.branch@muller-auto.example",
        billingNotes: "Branch billing under parent group PO.",
        instructions: "Berlin–Leipzig corridor; flexible windows common.",
        active: true,
      },
    ];
  }

  function seedAddresses() {
    return [
      {
        id: "ADDR-001",
        label: "Muller Munich yard",
        street: "Landsberger Str.",
        houseNumber: "142",
        postalCode: "80339",
        city: "Munchen",
        country: "DE",
        contactPerson: "H. Schneider",
        phone: "+49 89 1234567",
        secondPhone: "+49 89 1234568",
        email: "yard.munich@muller-auto.example",
        notes: "Reception key handover.",
      },
      {
        id: "ADDR-002",
        label: "Autohaus Nord Berlin",
        street: "Chausseestr.",
        houseNumber: "88",
        postalCode: "10115",
        city: "Berlin",
        country: "DE",
        contactPerson: "F. Becker",
        phone: "+49 30 9876543",
        secondPhone: "+49 30 9876544",
        email: "delivery.berlin@autohaus-nord.example",
        notes: "Call 30 min before arrival.",
      },
      {
        id: "ADDR-003",
        label: "Classic Cars Stuttgart",
        street: "Plieninger Str.",
        houseNumber: "14",
        postalCode: "70565",
        city: "Stuttgart",
        country: "DE",
        contactPerson: "S. Keller",
        phone: "+49 711 441122",
        secondPhone: "+49 711 441123",
        email: "logistics@classiccars.example",
        notes: "Logistics gate B.",
      },
      {
        id: "ADDR-004",
        label: "Classic Cars Munich showroom",
        street: "Marsstr.",
        houseNumber: "22",
        postalCode: "80339",
        city: "Munchen",
        country: "DE",
        contactPerson: "R. Meier",
        phone: "+49 89 441100",
        secondPhone: "",
        email: "showroom.munich@classiccars.example",
        notes: "Showroom delivery; ask for sales desk.",
      },
      {
        id: "ADDR-005",
        label: "Nord-Flotte Bremen",
        street: "Marktplatz",
        houseNumber: "1",
        postalCode: "28195",
        city: "Bremen",
        country: "DE",
        contactPerson: "T. Brandt",
        phone: "+49 421 778899",
        secondPhone: "+49 421 778800",
        email: "dispatch@nordflotte.example",
        notes: "",
      },
      {
        id: "ADDR-006",
        label: "Hamburg Vehicle Yard",
        street: "Reeperbahn",
        houseNumber: "30",
        postalCode: "22767",
        city: "Hamburg",
        country: "DE",
        contactPerson: "M. Linke",
        alternateContactPerson: "S. Kruger (night shift)",
        phone: "+49 40 556677",
        secondPhone: "+49 40 556678",
        email: "yard.hamburg@nordflotte.example",
        notes: "Gate code on request from dispatch.",
      },
      {
        id: "ADDR-007",
        label: "Muller Hamburg",
        street: "Monckebergstr.",
        houseNumber: "7",
        postalCode: "20095",
        city: "Hamburg",
        country: "DE",
        contactPerson: "L. Hartmann",
        phone: "+49 40 8811220",
        secondPhone: "+49 40 8811221",
        email: "hamburg.logistics@muller-auto.example",
        notes: "Loading bay via side street.",
      },
      {
        id: "ADDR-008",
        label: "Hannover outlet",
        street: "Karmarschstr.",
        houseNumber: "30",
        postalCode: "30159",
        city: "Hannover",
        country: "DE",
        contactPerson: "K. Ullrich",
        phone: "+49 511 440055",
        secondPhone: "",
        email: "hannover@muller-auto.example",
        notes: "",
      },
      {
        id: "ADDR-009",
        label: "Classic Cars Stuttgart showroom",
        street: "Konigstr.",
        houseNumber: "60",
        postalCode: "70173",
        city: "Stuttgart",
        country: "DE",
        contactPerson: "S. Keller",
        phone: "+49 711 441122",
        secondPhone: "+49 711 441199",
        email: "stuttgart.showroom@classiccars.example",
        notes: "",
      },
      {
        id: "ADDR-010",
        label: "Marienplatz delivery",
        street: "Marienplatz",
        houseNumber: "8",
        postalCode: "80331",
        city: "Munchen",
        country: "DE",
        contactPerson: "P. Huber",
        phone: "+49 89 552211",
        secondPhone: "+49 89 552212",
        email: "city.delivery@munchen-mobility.example",
        notes: "Pedestrian zone — call on arrival.",
      },
      {
        id: "ADDR-011",
        label: "Muller Berlin branch",
        street: "Kantstr.",
        houseNumber: "41",
        postalCode: "10623",
        city: "Berlin",
        country: "DE",
        contactPerson: "A. Weiss",
        phone: "+49 30 334455",
        secondPhone: "",
        email: "berlin.branch@muller-auto.example",
        notes: "",
      },
      {
        id: "ADDR-012",
        label: "Leipzig outlet",
        street: "Augustusplatz",
        houseNumber: "9",
        postalCode: "04109",
        city: "Leipzig",
        country: "DE",
        contactPerson: "N. Scholz",
        phone: "+49 341 778899",
        secondPhone: "+49 341 778800",
        email: "leipzig@muller-auto.example",
        notes: "",
      },
      {
        id: "ADDR-013",
        label: "Dusseldorf showroom",
        street: "Konigsallee",
        houseNumber: "12",
        postalCode: "40213",
        city: "Dusseldorf",
        country: "DE",
        contactPerson: "C. Richter",
        phone: "+49 211 667788",
        secondPhone: "",
        email: "duesseldorf@classiccars.example",
        notes: "Valet pickup at rear entrance.",
      },
      {
        id: "ADDR-014",
        label: "Koln logistics hub",
        street: "Hohe Str.",
        houseNumber: "22",
        postalCode: "50667",
        city: "Koln",
        country: "DE",
        contactPerson: "D. Kruger",
        phone: "+49 221 100200",
        secondPhone: "+49 221 100201",
        email: "hub.koeln@autologistik.example",
        notes: "24h gate; ID required.",
      },
      {
        id: "ADDR-015",
        label: "AutoLogistik Hub Koln",
        street: "Hohe Str.",
        houseNumber: "110",
        postalCode: "50667",
        city: "Koln",
        country: "DE",
        contactPerson: "J. Tausch",
        phone: "+49 221 100200",
        secondPhone: "+49 221 100299",
        email: "hub.koeln@autologistik.example",
        notes: "Main Cologne transfer point.",
      },
      {
        id: "ADDR-016",
        label: "AutoLogistik Hub Frankfurt",
        street: "Zeil",
        houseNumber: "90",
        postalCode: "60311",
        city: "Frankfurt",
        country: "DE",
        contactPerson: "E. Braun",
        phone: "+49 69 300400",
        secondPhone: "+49 69 300401",
        email: "hub.frankfurt@autologistik.example",
        notes: "",
      },
      {
        id: "ADDR-017",
        label: "Berlin logistics hub",
        street: "Invalidenstr.",
        houseNumber: "80",
        postalCode: "10115",
        city: "Berlin",
        country: "DE",
        contactPerson: "J. Tausch",
        phone: "+49 30 552288",
        secondPhone: "+49 30 552289",
        email: "hub.berlin@autologistik.example",
        notes: "Night drop-off by appointment only.",
      },
    ];
  }

  function nextNewsId(items) {
    let max = 0;
    for (const n of items) {
      const m = /^NEWS-(\d+)$/.exec(n.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `NEWS-${String(max + 1).padStart(3, "0")}`;
  }

  function nextDocId(items) {
    let max = 0;
    for (const d of items) {
      const m = /^DOC-(\d+)$/.exec(d.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `DOC-${String(max + 1).padStart(3, "0")}`;
  }

  function seedDocuments() {
    return [
      {
        id: "DOC-001",
        title: "General work instructions",
        description: "Day-to-day operational rules for service partners.",
        category: "Operations",
        visible: true,
        scope: "Global",
        version: "v1.3",
        updatedAt: "04.05. 09:10",
        seed: true,
      },
      {
        id: "DOC-002",
        title: "Partner terms",
        description: "Service partner terms and general conditions.",
        category: "Legal",
        visible: true,
        scope: "Global",
        version: "v3.0",
        updatedAt: "02.05. 14:45",
        seed: true,
      },
      {
        id: "DOC-003",
        title: "Emergency contacts",
        description: "Dispatch and emergency contact numbers.",
        category: "Safety",
        visible: true,
        scope: "Global",
        version: "v1.0",
        updatedAt: "01.05. 08:00",
        seed: true,
      },
      {
        id: "DOC-004",
        title: "Privacy policy",
        description: "Data protection information for service partners.",
        category: "Legal",
        visible: true,
        scope: "Global",
        version: "v2.1",
        updatedAt: "29.04. 11:30",
        seed: true,
      },
      {
        id: "DOC-005",
        title: "Imprint",
        description: "Legal imprint and operator details.",
        category: "Legal",
        visible: true,
        scope: "Global",
        version: "v1.0",
        updatedAt: "29.04. 11:31",
        seed: true,
      },
      {
        id: "DOC-006",
        title: "Vehicle pickup instructions",
        description: "Action instructions for vehicle pickup at customer sites.",
        category: "Pickup",
        visible: true,
        scope: "Global",
        version: "v1.0",
        updatedAt: "20.05. 10:00",
        seed: true,
      },
      {
        id: "DOC-007",
        title: "Fuel receipt and invoicing notes",
        description: "How to submit fuel receipts and billing invoices after performed tours.",
        category: "Invoicing",
        visible: true,
        scope: "Global",
        version: "v1.1",
        updatedAt: "20.05. 10:15",
        seed: true,
      },
      {
        id: "DOC-008",
        title: "Cancellation and problem case process",
        description: "When and how to use Report Problem; contact dispatch for special cases.",
        category: "Process",
        visible: true,
        scope: "Global",
        version: "v1.0",
        updatedAt: "20.05. 10:30",
        seed: true,
      },
    ];
  }

  function seedNews() {
    return [
      {
        id: "NEWS-001",
        title: "ATTENTION: public transport strike 01.01.2027",
        body:
          "Dear service partners,\n\nOn Monday, 01.01.2027, there may be isolated warning strikes in public transport. Please check in good time whether your area in Germany is affected.\n\nThank you for your attention and safe travels.",
        publishedAt: "24.05. 09:00",
        visible: true,
        readBy: [],
      },
      {
        id: "NEWS-002",
        title: "New document upload flow",
        body: "After marking a tour performed, upload your billing invoice and delivery proof from the tour detail screen.",
        publishedAt: "05.05. 08:00",
        visible: true,
        readBy: ["DRV-0228"],
      },
      {
        id: "NEWS-003",
        title: "Report Problem replaces returns",
        body: "Use Report Problem to cancel or flag a tour as not performable. Not performable creates a special case for dispatch.",
        publishedAt: "03.05. 14:30",
        visible: true,
        readBy: [],
      },
    ];
  }

  function pu(
    addrId,
    name,
    street,
    hn,
    plz,
    city,
    date,
    dateLong,
    from,
    to,
    contact,
    phone,
    flex = false,
    extra = {},
  ) {
    return mkLocation({
      locationId: addrId,
      name,
      street,
      houseNumber: hn,
      postalCode: plz,
      city,
      country: "DE",
      contactPerson: contact,
      phone,
      secondPhone: extra.secondPhone || "",
      email: extra.email || "",
      notes: extra.notes || "",
      date,
      dateLong,
      windowFrom: from,
      windowTo: to,
      windowFlex: !!flex,
      ...extra,
    });
  }

  function locationFromAddress(addr, schedule = {}) {
    if (!addr) return mkLocation(schedule);
    return mkLocation({
      locationId: addr.id,
      name: addr.label,
      street: addr.street,
      houseNumber: addr.houseNumber,
      postalCode: addr.postalCode,
      city: addr.city,
      country: addr.country || "DE",
      contactPerson: addr.contactPerson || "",
      phone: addr.phone || "",
      secondPhone: addr.secondPhone || "",
      email: addr.email || "",
      notes: addr.notes || "",
      date: schedule.date || "",
      dateLong: schedule.dateLong || "",
      windowFrom: schedule.windowFrom || "",
      windowTo: schedule.windowTo || "",
      windowFlex: !!schedule.windowFlex,
      ...schedule,
    });
  }

  function seedJobs() {
    const byAddr = Object.fromEntries(
      seedAddresses().map((a) => [a.id, a]),
    );
    const loc = (id, schedule) => locationFromAddress(byAddr[id], schedule);

    return [
      mk({
        id: "A-2026-00847",
        tour: "0847-26",
        orderingPartyId: "OP-001",
        orderingPartyName: "Muller Automobile GmbH",
        pickup: loc("ADDR-001", {
          date: "23.04.",
          dateLong: "Wed, 23.04.2026",
          windowFrom: "08:00",
          windowTo: "12:00",
        }),
        delivery: loc("ADDR-002", {
          date: "24.04.",
          dateLong: "Thu, 24.04.2026",
          windowFrom: "10:00",
          windowTo: "14:00",
        }),
        distanceKm: 585,
        distanceEstimateSource: "seed",
        vehicle: "SUV",
        vehicleModel: "VW Tiguan 2.0 TDI",
        plate: "M-AB 1234",
        vin: "WVGZZZ5NZKW123456",
        axle: AXLE_OWN,

        revenue: 340,
        netAmount: 285.71,
        grossAmount: 340,
        driverCompensation: 260,
        expenses: 12,
        notes:
          "Key handover at reception. Vehicle prepared, fuel approx. 1/2 tank. Ref: KR-88213.",
        notesDriver: "Please confirm arrival 15 minutes early.",
        status: "published",
        pdfVersion: 0,
        history: [
          { st: "draft", at: "23.04. 09:14", by: "A. Bauer" },
          { st: "published", at: "23.04. 11:02", by: "A. Bauer" },
        ],
        createdAt: "23.04. 09:14",
      }),
      mk({
        id: "A-2026-00848",
        tour: "0848-26",
        orderingPartyId: "OP-003",
        orderingPartyName: "Nord-Flotte GmbH",
        pickup: loc("ADDR-005", {
          date: "08.05.",
          dateLong: "Fri, 08.05.2026",
          windowFrom: "09:00",
          windowTo: "12:00",
        }),
        delivery: loc("ADDR-006", {
          date: "08.05.",
          dateLong: "Fri, 08.05.2026",
          windowFrom: "12:00",
          windowTo: "16:00",
        }),
        distanceKm: 124,
        distanceEstimateSource: "seed",
        vehicle: "PKW",
        vehicleModel: "Skoda Superb",
        plate: "HB-NF 848",
        vin: "TMBJH7NP8P0123848",
        axle: AXLE_OWN,

        revenue: 185,
        driverCompensation: 145,
        status: "assigned",
        driver: DEMO_DRIVER,
        pdfVersion: 1,
        notesDriver: "Report any pickup delay immediately to dispatch.",
        createdAt: "05.05. 10:00",
        history: [
          { st: "draft", at: "05.05. 10:00", by: "A. Bauer" },
          { st: "assigned", at: "05.05. 10:05", by: "A. Bauer" },
        ],
      }),
      mk({
        id: "A-2026-00846",
        tour: "0846-26",
        orderingPartyId: "OP-002",
        orderingPartyName: "Classic Cars AG",
        pickup: loc("ADDR-003", {
          date: "23.04.",
          dateLong: "Wed, 23.04.2026",
          windowFrom: "06:00",
          windowTo: "10:00",
        }),
        delivery: loc("ADDR-004", {
          date: "23.04.",
          dateLong: "Wed, 23.04.2026",
          windowFrom: "14:00",
          windowTo: "18:00",
        }),
        distanceKm: 232,
        distanceEstimateSource: "seed",
        vehicle: "PKW",
        vehicleModel: "BMW 3 Touring",
        plate: "S-CC 220",
        vin: "WBA8E1100K5J12345",
        axle: AXLE_THIRD,

        revenue: 220,
        driverCompensation: 175,
        notes:
          "Historic vehicle on third-party axle; yard access issue reported by driver.",
        notesDriver: "Do not attempt pickup until dispatch confirms yard reopening.",
        status: "special_case",
        driver: DEMO_DRIVER,
        pdfVersion: 1,
        specialCaseReport: {
          type: "not_performable",
          reason: "access_blocked",
          message:
            "Customer yard closed unexpectedly; vehicle not accessible for pickup.",
          reportedAt: "23.04. 08:40",
          reportedBy: DEMO_DRIVER,
          statusBeforeSpecialCase: "accepted",
        },
        history: [
          { st: "draft", at: "22.04. 16:11", by: "A. Bauer" },
          { st: "assigned", at: "23.04. 07:55", by: "A. Bauer" },
          { st: "accepted", at: "23.04. 08:10", by: DEMO_DRIVER },
          {
            st: "special_case",
            at: "23.04. 08:40",
            by: DEMO_DRIVER,
            meta: "Report Problem: not performable",
          },
        ],
        createdAt: "22.04. 16:11",
      }),
      mk({
        id: "A-2026-00845",
        tour: "0845-26",
        orderingPartyId: "OP-004",
        orderingPartyName: "AutoLogistik KG",
        pickup: loc("ADDR-015", {
          date: "24.04.",
          dateLong: "Thu, 24.04.2026",
          windowFrom: "10:00",
          windowTo: "14:00",
        }),
        delivery: loc("ADDR-016", {
          date: "24.04.",
          dateLong: "Thu, 24.04.2026",
          windowFrom: "14:00",
          windowTo: "18:00",
        }),
        distanceKm: 186,
        distanceEstimateSource: "seed",
        vehicle: "PKW",
        vehicleModel: "Audi A4",
        plate: "K-AL 845",
        vin: "WAUZZZ4M5KA000001",
        axle: AXLE_THIRD,

        revenue: 145,
        driverCompensation: 110,
        notes: "Hub-to-hub Cologne → Frankfurt.",
        notesDriver: "Gate code required at both hubs — see address notes.",
        status: "accepted",
        driver: DEMO_DRIVER,
        pdfVersion: 1,
        history: [
          { st: "draft", at: "21.04. 10:00", by: "A. Bauer" },
          { st: "published", at: "21.04. 10:30", by: "A. Bauer" },
          { st: "accepted", at: "21.04. 14:22", by: DEMO_DRIVER },
        ],
        createdAt: "21.04. 10:00",
      }),
      mk({
        id: "A-2026-00844",
        tour: "0844-26",
        orderingPartyId: "OP-001",
        orderingPartyName: "Muller Automobile GmbH",
        pickup: loc("ADDR-007", {
          date: "22.04.",
          dateLong: "Tue, 22.04.2026",
          windowFlex: true,
        }),
        delivery: loc("ADDR-008", {
          date: "22.04.",
          dateLong: "Tue, 22.04.2026",
          windowFrom: "12:00",
          windowTo: "16:00",
        }),
        distanceKm: 156,
        distanceEstimateSource: "seed",
        vehicle: "PKW",
        vehicleModel: "VW Polo",
        plate: "HH-MA 88",
        vin: "WVWZZZ6RZKY098765",
        axle: AXLE_THIRD,
        driverCompensation: 165,
        revenue: 198,
        notes: "Marketplace preview tour Hamburg → Hannover.",
        status: "published",
        pdfVersion: 0,
        createdAt: "20.04. 14:00",
        history: [
          { st: "draft", at: "20.04. 14:00", by: "A. Bauer" },
          { st: "published", at: "20.04. 14:30", by: "A. Bauer" },
        ],
      }),
      mk({
        id: "A-2026-00843",
        tour: "0843-26",
        orderingPartyId: "OP-002",
        orderingPartyName: "Classic Cars AG",
        pickup: loc("ADDR-009", {
          date: "26.04.",
          dateLong: "Sat, 26.04.2026",
          windowFrom: "06:00",
          windowTo: "10:00",
        }),
        delivery: loc("ADDR-010", {
          date: "26.04.",
          dateLong: "Sat, 26.04.2026",
          windowFrom: "12:00",
          windowTo: "16:00",
        }),
        distanceKm: 232,
        distanceEstimateSource: "seed",
        vehicle: "Van",
        vehicleModel: "Mercedes Sprinter",
        plate: "S-CC 130",
        vin: "WDB9067321V123987",
        axle: AXLE_OWN,
        driverCompensation: 280,
        revenue: 310,
        notesDriver: "Sprinter — check height clearance at Marienplatz delivery.",
        status: "accepted",
        driver: DEMO_DRIVER,
        pdfVersion: 1,
        createdAt: "20.04. 09:00",
        history: [
          { st: "draft", at: "20.04. 09:00", by: "A. Bauer" },
          { st: "published", at: "20.04. 10:00", by: "A. Bauer" },
          { st: "accepted", at: "23.04. 06:11", by: DEMO_DRIVER },
        ],
      }),
      mk({
        id: "A-2026-00842",
        tour: "0842-26",
        orderingPartyId: "OP-003",
        orderingPartyName: "Nord-Flotte GmbH",
        pickup: loc("ADDR-006", {
          name: "Hamburg depot",
          street: "Steinstr.",
          houseNumber: "5",
          postalCode: "20095",
          contactPerson: "M. Linke",
          phone: "+49 40 556677",
          date: "21.04.",
          dateLong: "Mon, 21.04.2026",
          windowFrom: "09:00",
          windowTo: "11:00",
        }),
        delivery: loc("ADDR-005", {
          name: "Bremen hub",
          street: "Domshof",
          houseNumber: "8",
          contactPerson: "T. Brandt",
          phone: "+49 421 778899",
          date: "21.04.",
          dateLong: "Mon, 21.04.2026",
          windowFrom: "13:00",
          windowTo: "15:00",
        }),
        distanceKm: 124,
        distanceEstimateSource: "seed",
        vehicle: "PKW",
        vehicleModel: "Skoda Octavia",
        plate: "HH-NF 42",
        vin: "TMBJG7NE7K0123456",
        axle: AXLE_THIRD,
        driverCompensation: 110,
        revenue: 135,
        grossAmount: 135,
        expenses: 18,
        notes: "Completed Hamburg depot → Bremen hub.",
        paymentStatus: "Paid",
        settlementState: "Paid",
        invoiceReceived: false,
        status: "performed",
        driver: DEMO_DRIVER,
        performedAt: "21.04. 12:48",
        pdfVersion: 1,
        history: [
          { st: "accepted", at: "21.04. 09:00", by: DEMO_DRIVER },
          { st: "performed", at: "21.04. 12:48", by: DEMO_DRIVER },
        ],
        createdAt: "19.04. 13:00",
      }),
      mk({
        id: "A-2026-00841",
        tour: "0841-26",
        orderingPartyId: "OP-005",
        orderingPartyName: "Muller & Sohn KG",
        pickup: loc("ADDR-011", {
          date: "22.04.",
          dateLong: "Tue, 22.04.2026",
          windowFlex: true,
        }),
        delivery: loc("ADDR-012", {
          date: "22.04.",
          dateLong: "Tue, 22.04.2026",
          windowFlex: true,
        }),
        distanceKm: 188,
        distanceEstimateSource: "seed",
        vehicle: "SUV",
        vehicleModel: "Ford Kuga",
        plate: "B-MS 200",
        vin: "WF0AXXTTGA000111",
        axle: AXLE_OWN,
        driverCompensation: 195,
        revenue: 240,
        notes: "Cancelled after driver Report Problem — customer withdrew slot.",
        status: "cancelled",
        cancellationActor: "ordering_party",
        cancellationReasonText: "Customer withdrew delivery slot.",
        driver: DEMO_DRIVER,
        pdfVersion: 1,
        history: [
          { st: "draft", at: "18.04. 15:00", by: "A. Bauer" },
          { st: "assigned", at: "19.04. 08:00", by: "A. Bauer" },
          { st: "accepted", at: "21.04. 09:30", by: DEMO_DRIVER },
          {
            st: "cancelled",
            at: "21.04. 22:00",
            by: "Dispatch",
            meta: "Report Problem: cancel",
          },
        ],
        createdAt: "18.04. 15:00",
      }),
      mk({
        id: "A-2026-00840",
        tour: "0840-26",
        orderingPartyId: "OP-002",
        orderingPartyName: "Classic Cars AG",
        pickup: loc("ADDR-013", {
          date: "25.04.",
          dateLong: "Fri, 25.04.2026",
          windowFrom: "12:00",
          windowTo: "16:00",
        }),
        delivery: loc("ADDR-014", {
          date: "25.04.",
          dateLong: "Fri, 25.04.2026",
          windowFrom: "16:00",
          windowTo: "18:00",
        }),
        distanceKm: 78,
        distanceEstimateSource: "seed",
        vehicle: "PKW",
        vehicleModel: "Audi Q3",
        plate: "D-CC 80",
        vin: "WAUZZZF38K1234567",
        axle: AXLE_OWN,
        driverCompensation: 110,
        revenue: 138,
        notes: "Direct assign Dusseldorf showroom to Koln hub.",
        notesDriver: "Valet pickup at rear entrance per site notes.",
        status: "assigned",
        driver: DEMO_DRIVER,
        pdfVersion: 1,
        createdAt: "21.04. 11:00",
        history: [
          { st: "draft", at: "21.04. 11:00", by: "A. Bauer" },
          { st: "assigned", at: "21.04. 11:04", by: "A. Bauer" },
        ],
      }),
      mk({
        id: "A-2026-00839",
        tour: "0839-26",
        orderingPartyId: "OP-004",
        orderingPartyName: "AutoLogistik KG",
        pickup: loc("ADDR-017", {
          date: "27.04.",
          dateLong: "Sat, 27.04.2026",
          windowFrom: "06:00",
          windowTo: "09:00",
        }),
        delivery: loc("ADDR-003", {
          name: "Stuttgart hub",
          street: "Konigstr.",
          houseNumber: "80",
          contactPerson: "R. Wagner",
          phone: "+49 711 224488",
          secondPhone: "+49 711 224489",
          email: "hub.stuttgart@autologistik.example",
          date: "28.04.",
          dateLong: "Sun, 28.04.2026",
          windowFrom: "10:00",
          windowTo: "14:00",
        }),
        distanceKm: 632,
        distanceEstimateSource: "seed",
        vehicle: "PKW",
        vehicleModel: "Audi A6",
        plate: "B-AL 60",
        vin: "WAUZZZ4G9KN123456",
        axle: AXLE_OWN,
        driverCompensation: 365,
        revenue: 420,
        notes: "Long-haul draft Berlin hub to Stuttgart; verify night gate access.",
        status: "draft",
        pdfVersion: 0,
        createdAt: "20.04. 17:00",
        history: [{ st: "draft", at: "20.04. 17:00", by: "A. Bauer" }],
      }),
    ];
  }

  function seedDriverState() {
    return {
      acceptedIds: new Set(["A-2026-00845", "A-2026-00843"]),
      performedIds: new Set(["A-2026-00842"]),
      specialCaseIds: new Set(["A-2026-00846"]),
      cancelledIds: new Set(["A-2026-00841"]),
    };
  }

  function seedDrivers() {
    return [
      {
        id: "DRV-0228",
        name: DEMO_DRIVER,
        company: "Blake Transport Services",
        partnerId: "AU-41-0228",
        address: "Landsberger Str. 22, 80339 Munchen",
        email: "jordan.blake@example.com",
        phone: "+49 170 4400228",
        status: "Active",
        prefs: {
          notifyPostalPrefix: "80",
          vehicle: "PKW",
          axle: "All",
          pushEnabled: true,
          notifyNewPublished: true,
        },
      },
      {
        id: "DRV-0301",
        name: "Klaus Neumann",
        company: "Neumann Logistik",
        partnerId: "AU-41-0301",
        address: "Hanauer Landstr. 12, 60314 Frankfurt",
        email: "k.neumann@example.com",
        phone: "+49 172 3300301",
        status: "Active",
        prefs: {
          notifyPostalPrefix: "60",
          vehicle: "Transporter",
          axle: AXLE_THIRD,
          pushEnabled: true,
          notifyNewPublished: true,
        },
      },
      {
        id: "DRV-0177",
        name: "Mira Vogt",
        company: "Vogt Fahrservice",
        partnerId: "AU-41-0177",
        address: "Kantstr. 18, 10623 Berlin",
        email: "mira.vogt@example.com",
        phone: "+49 171 991177",
        status: "Blocked",
        prefs: {
          notifyPostalPrefix: "10",
          vehicle: "SUV",
          axle: AXLE_OWN,
          pushEnabled: false,
          notifyNewPublished: false,
        },
      },
    ];
  }

  function seedAdmins() {
    return [
      {
        id: "ADM-001",
        name: DEMO_ADMIN,
        email: "anna.bauer@autheon.example",
        status: "Active",
        role: "Dispatcher",
      },
      {
        id: "ADM-002",
        name: "Lukas Reimann",
        email: "lukas.reimann@autheon.example",
        status: "Active",
        role: "Operations lead",
      },
    ];
  }

  function ensureTourDocumentShape(doc) {
    if (!doc) return;
    if (doc.supplierInvoiceNumber === undefined) doc.supplierInvoiceNumber = "";
    if (doc.supplierInvoiceDate === undefined) doc.supplierInvoiceDate = "";
    if (doc.checkedAt === undefined) doc.checkedAt = "";
    if (doc.checkedBy === undefined) doc.checkedBy = "";
  }

  function seedTourDocuments() {
    return [
      {
        id: "TD-SEED-001",
        jobId: "A-2026-00842",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "partner-invoice-0842.pdf",
        mimeType: "application/pdf",
        sizeBytes: 248120,
        uploadedAt: "2026-04-21T12:52:00.000Z",
        documentType: "invoice",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "driver",
        notes: "",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-002",
        jobId: "A-2026-00842",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "delivery-note-0842.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 412800,
        uploadedAt: "2026-04-21T12:53:00.000Z",
        documentType: "delivery_note",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "driver",
        notes: "Signed at Bremen hub.",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-003",
        jobId: "A-2026-00846",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "yard-closed-photo-0846.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 890400,
        uploadedAt: "2026-04-23T08:38:00.000Z",
        documentType: "other_proof",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "driver",
        notes: "Gate closed — special case evidence.",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-004",
        jobId: "A-2026-00845",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "fuel-receipt-0845.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 198400,
        uploadedAt: "2026-04-21T15:10:00.000Z",
        documentType: "fuel_receipt",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "driver",
        notes: "",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-006",
        jobId: "A-2026-00845",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "toll-receipt-0845-rejected.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 156000,
        uploadedAt: "2026-04-21T16:00:00.000Z",
        documentType: "toll_receipt",
        reviewStatus: "rejected",
        rejectionReason: "Amount illegible — awaiting dispatch to request correction.",
        processed: false,
        source: "driver",
        notes: "",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
    ];
  }

  function seedDriverNotifications() {
    return [
      {
        id: "DN-SEED-001",
        type: "document_rejected",
        jobId: "A-2026-00842",
        tour: "0842-26",
        title: "Document rejected",
        body: "Registration number missing on fuel receipt.",
        read: false,
        createdAt: "21.04. 14:10",
      },
    ];
  }

  function seedAdminEmailQueue() {
    return [
      {
        id: "ALERT-SEED-001",
        event: "special_case_created",
        jobId: "A-2026-00846",
        tour: "0846-26",
        meta: "Report Problem: not performable — yard closed",
        at: "23.04. 08:41",
        sent: true,
      },
      {
        id: "ALERT-SEED-002",
        event: "job_cancelled",
        jobId: "A-2026-00841",
        tour: "0841-26",
        meta: "Driver cancellation — customer cancelled",
        at: "21.04. 22:01",
        sent: true,
      },
    ];
  }

  function seedAudit() {
    return [
      {
        action: "prototype_loaded",
        actor: "System",
        entity: "Transport Portal demo",
        at: "05.05. 15:49",
        meta: "PRD v1.6 client-side prototype",
      },
      {
        action: "job_published",
        actor: DEMO_ADMIN,
        entity: "0847-26",
        at: "23.04. 11:02",
        meta: "Marketplace preview",
      },
      {
        action: "job_accepted",
        actor: DEMO_DRIVER,
        entity: "0845-26",
        at: "21.04. 14:22",
        meta: "Binding slide confirmation",
      },
      {
        action: "special_case_created",
        actor: DEMO_DRIVER,
        entity: "0846-26",
        at: "23.04. 08:40",
        meta: "Not performable — yard closed",
      },
      {
        action: "tour_document_uploaded",
        actor: DEMO_DRIVER,
        entity: "partner-invoice-0842.pdf",
        at: "21.04. 12:52",
        meta: "A-2026-00842 · invoice",
      },
    ];
  }

  let orderingParties = seedOrderingParties();
  let addresses = seedAddresses();
  let documents = seedDocuments();
  let newsItems = seedNews();
  let jobs = seedJobs();

  function nextMasterId(prefix, list) {
    let max = 0;
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    for (const row of list) {
      const m = String(row.id || "").match(re);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${prefix}-${String(max + 1).padStart(3, "0")}`;
  }

  /** Restore target when admin continues a special case (fallback if statusBeforeSpecialCase missing). */
  function inferStatusBeforeSpecialCase(job) {
    const fromReport = job?.specialCaseReport?.statusBeforeSpecialCase;
    if (fromReport && ["assigned", "accepted"].includes(fromReport))
      return fromReport;
    const hist = job?.history || [];
    for (let i = hist.length - 1; i >= 0; i--) {
      const st = hist[i]?.st;
      if (st === "special_case") continue;
      if (["assigned", "accepted"].includes(st)) return st;
    }
    return "assigned";
  }

  function validateSeedData(jobList, partyList, docList, state) {
    const issues = [];
    const partyIds = new Set(partyList.map((p) => p.id));
    const partyNames = Object.fromEntries(partyList.map((p) => [p.id, p.name]));

    for (const j of jobList) {
      if (!j.orderingPartyId || !partyIds.has(j.orderingPartyId)) {
        issues.push(`${j.id}: invalid orderingPartyId`);
      } else if (
        partyNames[j.orderingPartyId] &&
        j.orderingPartyName &&
        j.orderingPartyName !== partyNames[j.orderingPartyId]
      ) {
        issues.push(
          `${j.id}: orderingPartyName mismatch (${j.orderingPartyName} vs ${partyNames[j.orderingPartyId]})`,
        );
      }
      for (const side of ["pickup", "delivery"]) {
        const loc = j[side];
        if (!loc?.contactPerson?.trim() || !loc?.phone?.trim()) {
          issues.push(`${j.id}:${side}: contact`);
        }
        if (!loc?.street?.trim() || !loc?.city?.trim() || !loc?.postalCode?.trim()) {
          issues.push(`${j.id}:${side}: address`);
        }
        if (!loc?.date?.trim() && !loc?.windowFlex) {
          issues.push(`${j.id}:${side}: schedule`);
        }
      }
      if (!j.plate?.trim() || !j.vin?.trim()) issues.push(`${j.id}: vehicle ids`);
      if (!j.vehicle?.trim() || !j.vehicleModel?.trim()) {
        issues.push(`${j.id}: vehicle`);
      }
      if (!(j.distanceKm > 0)) issues.push(`${j.id}: distanceKm`);
      if (j.driverCompensation == null || j.driverCompensation === "") {
        issues.push(`${j.id}: driverCompensation`);
      }
      if (!j.history?.length) issues.push(`${j.id}: history`);
      if (!j.pickup?.date) issues.push(`${j.id}: pickup.date`);
      if (!j.delivery?.date) issues.push(`${j.id}: delivery.date`);
      if (j.status !== "draft" && !(j.pdfVersion > 0) && j.status !== "published") {
        /* published may have pdf 0 until accept */
      }
    }

    for (const id of state.acceptedIds || []) {
      const j = jobList.find((x) => x.id === id);
      if (!j || j.status !== "accepted") {
        issues.push(`driverState.acceptedIds: ${id} status mismatch`);
      }
    }
    for (const id of state.performedIds || []) {
      const j = jobList.find((x) => x.id === id);
      if (!j || j.status !== "performed") {
        issues.push(`driverState.performedIds: ${id} status mismatch`);
      }
    }
    for (const id of state.specialCaseIds || []) {
      const j = jobList.find((x) => x.id === id);
      if (!j || j.status !== "special_case") {
        issues.push(`driverState.specialCaseIds: ${id} status mismatch`);
      } else {
        const prior = j.specialCaseReport?.statusBeforeSpecialCase;
        if (!prior || !["assigned", "accepted"].includes(prior)) {
          issues.push(
            `${j.id}: special case missing valid statusBeforeSpecialCase`,
          );
        }
      }
    }
    for (const id of state.cancelledIds || []) {
      const j = jobList.find((x) => x.id === id);
      if (!j || j.status !== "cancelled") {
        issues.push(`driverState.cancelledIds: ${id} status mismatch`);
      }
    }

    const performedWithDocs = jobList.filter((j) => j.status === "performed");
    for (const j of performedWithDocs) {
      if (!docList.some((d) => d.jobId === j.id)) {
        issues.push(`${j.id}: performed tour has no seed documents`);
      }
    }
    for (const d of docList) {
      const j = jobList.find((x) => x.id === d.jobId);
      if (j && j.status !== "performed") {
        issues.push(`${d.id}: document on non-performed job ${j.id} (${j.status})`);
      }
      if (
        isTourBillingInvoiceType(d.documentType) &&
        normalizeTourDocumentReviewStatus(d.reviewStatus) === "accepted" &&
        !String(d.supplierInvoiceNumber || "").trim()
      ) {
        issues.push(`${d.id}: accepted invoice missing supplierInvoiceNumber`);
      }
    }

    if (issues.length && typeof console !== "undefined") {
      console.warn("[AUTHEON] Seed data issues:\n", issues.join("\n"));
    }
    return issues;
  }

  let drivers = seedDrivers().map((d) => ({
    ...d,
    prefs: normalizeDriverPrefs(d.prefs),
  }));
  let admins = seedAdmins();
  let auditLog = seedAudit();
  let driverState = seedDriverState();
  let tourDocuments = seedTourDocuments();
  for (const doc of tourDocuments) {
    doc.documentType = normalizeTourDocumentType(doc.documentType);
    doc.reviewStatus = normalizeTourDocumentReviewStatus(doc.reviewStatus);
    ensureTourDocumentShape(doc);
  }
  let driverNotifications = seedDriverNotifications();
  let adminEmailQueue = seedAdminEmailQueue();

  for (const j of jobs) {
    j.paymentStatus = normalizePaymentStatus(j.paymentStatus);
    reconcileDocumentReviewSummary(j.id);
    reconcileJobInvoiceFromTourDocuments(j.id);
  }

  validateSeedData(jobs, orderingParties, tourDocuments, driverState);
  let nextTourSeq = 849;

  const legacyFlagDefaults = window.AUTHEON_FLAG_DEFAULTS || {};
  const branding = {
    appDisplayName:
      window.AUTHEON_BRANDING_DEFAULTS?.appDisplayName ||
      legacyFlagDefaults.appDisplayName ||
      "Transport Portal",
  };
  const { appDisplayName: _legacyName, ...flagDefaults } = legacyFlagDefaults;
  const featureFlags = {
    financeModule: false,
    ...flagDefaults,
  };

  const DISTANCE_TABLE = {
    "80339-10115": 585,
    "28195-22767": 124,
    "70565-80339": 232,
    "50667-60311": 186,
    "20095-30159": 156,
    "70173-80331": 232,
    "20095-28195": 124,
    "40213-50667": 78,
    "10115-70173": 632,
  };

  function guessMimeFromName(name) {
    const ext = (String(name).split(".").pop() || "").toLowerCase();
    const map = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };
    return map[ext] || "";
  }

  function isAllowedTourDocumentFile(file) {
    if (!file || !file.name) return false;
    const ty = (file.type || "").trim().toLowerCase();
    if (ty === "application/pdf" || /^image\/(jpeg|webp|gif|png)$/.test(ty))
      return true;
    const ext = file.name.split(".").pop().toLowerCase();
    return ["pdf", "jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  }

  function nowStamp() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm}. ${hh}:${mi}`;
  }

  function log(action, actor, entity, meta) {
    auditLog.unshift({
      action,
      actor,
      entity,
      at: nowStamp(),
      meta: meta || "",
    });
  }

  function bumpPdf(job) {
    job.pdfVersion = (job.pdfVersion || 0) + 1;
  }

  function distanceKey(job) {
    const a = job.pickup?.postalCode || "";
    const b = job.delivery?.postalCode || "";
    if (!a || !b) return "";
    return `${a}-${b}`;
  }

  function estimateDistanceKm(job) {
    if (!job) return 0;
    if (job.distanceManualOverride != null && job.distanceManualOverride !== "")
      return Number(job.distanceManualOverride) || 0;
    const key = distanceKey(job);
    if (key && DISTANCE_TABLE[key]) return DISTANCE_TABLE[key];
    const alt = `${job.pickup?.postalCode || ""}-${job.delivery?.postalCode || ""}`;
    if (DISTANCE_TABLE[alt]) return DISTANCE_TABLE[alt];
    const base = Math.abs(
      (parseInt(job.pickup?.postalCode, 10) || 10000) -
        (parseInt(job.delivery?.postalCode, 10) || 20000),
    );
    return Math.max(40, Math.min(720, Math.round(base / 8)));
  }

  function normalizeDriverPrefs(prefs = {}) {
    const p = prefs || {};
    const legacyPush = p.push === true || p.pushEnabled === true;
    return {
      startPlz: p.startPlz || "",
      endPlz: p.endPlz || "",
      vehicle: p.vehicle || "All",
      axle: p.axle || "All",
      pushEnabled: p.pushEnabled != null ? !!p.pushEnabled : legacyPush,
      notifyNewPublished:
        p.notifyNewPublished != null ? !!p.notifyNewPublished : legacyPush,
      notifyPostalPrefix: String(
        p.notifyPostalPrefix || p.startPlz || "",
      ).trim(),
      push: legacyPush,
    };
  }

  function postalPrefixMatches(job, prefix) {
    const p = String(prefix || "").replace(/\D/g, "");
    if (!p.length) return true;
    const plz = String(job.pickup?.postalCode || job.startPlz || "");
    return plz.startsWith(p.length >= 2 ? p.slice(0, 2) : p.slice(0, 1));
  }

  function maybeNotifyPublishedJob(job) {
    if (!job || job.status !== "published") return;
    const notified = [];
    for (const d of drivers) {
      if (d.status !== "Active") continue;
      const prefs = normalizeDriverPrefs(d.prefs);
      if (!prefs.pushEnabled || !prefs.notifyNewPublished) continue;
      if (
        prefs.notifyPostalPrefix &&
        !postalPrefixMatches(job, prefs.notifyPostalPrefix)
      )
        continue;
      notified.push(d.name);
      log(
        "push_notification_simulated",
        "System",
        job.tour,
        `new published → ${d.name}`,
      );
    }
    if (!notified.length) {
      log(
        "push_notification_simulated",
        "System",
        job.tour || "",
        "no matching subscribers",
      );
    }
  }

  function queuePushNotification(job, context) {
    maybeNotifyPublishedJob(job);
    log("notification_queued", "System", job?.tour || "", context || "system");
  }

  function pushDriverNotification(payload) {
    const d = api.getCurrentDriver();
    const row = {
      id: `DN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: payload.type || "general",
      jobId: payload.jobId || "",
      tour: payload.tour || "",
      title: payload.title || "Notification",
      body: payload.body || "",
      read: false,
      createdAt: nowStamp(),
    };
    if (payload.driverId) {
      row.driverId = payload.driverId;
    } else if (d) {
      row.driverId = d.id;
    }
    driverNotifications.unshift(row);
    log("driver_notification_created", "System", row.title, row.type);
    return row;
  }

  function getJobDisplayStatus(job) {
    if (!job) return "";
    if (
      job.settlementState === "Closed" &&
      job.documentReviewSummary === "Accepted"
    )
      return "Completed";
    if (job.documentReviewSummary === "Under Review") return "Under Review";
    return job.documentReviewSummary || job.status || "";
  }

  function queueAdminEmailAlert(event, jobId, meta) {
    const j = jobId ? jobs.find((x) => x.id === jobId) : null;
    const row = {
      id: `ALERT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event,
      jobId: jobId || "",
      tour: j?.tour || "",
      meta: meta || "",
      at: nowStamp(),
      sent: false,
    };
    adminEmailQueue.unshift(row);
    log("admin_email_alert_queued", "System", j?.tour || event, meta || event);
    return row;
  }

  function reconcileDocumentReviewSummary(jobId) {
    const j = jobs.find((x) => x.id === jobId);
    if (!j) return;
    const docs = tourDocuments.filter((d) => d.jobId === jobId);
    if (!docs.length) {
      j.documentReviewSummary = "Not Started";
      return;
    }
    if (docs.some((d) => d.reviewStatus === "correction_required"))
      j.documentReviewSummary = "Correction Required";
    else if (docs.some((d) => d.reviewStatus === "rejected"))
      j.documentReviewSummary = "Rejected";
    else if (docs.every((d) => d.reviewStatus === "accepted"))
      j.documentReviewSummary = "Accepted";
    else if (docs.some((d) => d.reviewStatus === "uploaded")) {
      j.documentReviewSummary =
        j.status === "performed" ? "Under Review" : "Uploaded";
    } else j.documentReviewSummary = "Pending";
  }

  function reconcileJobInvoiceFromTourDocuments(jobId) {
    const j = jobs.find((x) => x.id === jobId);
    if (!j) return;
    const invoices = tourDocuments.filter(
      (d) =>
        d.jobId === jobId &&
        isTourBillingInvoiceType(d.documentType),
    );
    const accepted = invoices.filter(
      (d) => d.reviewStatus === "accepted" || d.processed,
    );
    const paymentLocked = j.paymentStatus === "Paid";

    if (accepted.length) {
      j.invoiceReceived = true;
      const primary = accepted[accepted.length - 1];
      const invNum = String(primary.supplierInvoiceNumber || "").trim();
      j.invoiceNumber = invNum;
      if (!paymentLocked) j.paymentStatus = "Invoice Received";
      return;
    }

    j.invoiceReceived = false;
    j.invoiceNumber = "";
    if (!paymentLocked) j.paymentStatus = "Invoice Missing";
  }

  function locationFromForm(prefix, form) {
    const p = prefix || "";
    const cap = (k) => p + k.charAt(0).toUpperCase() + k.slice(1);
    const isPickup = p === "pickup";
    const flat = isPickup
      ? {
          locationId: form.pickupLocationId || null,
          name: form.startCompany || "",
          street: form.startStreet || "",
          houseNumber: form.startHouseNo || "",
          postalCode: form.startPlz || "",
          city: form.startCity || "",
          country: form.startCountry || "DE",
        }
      : {
          locationId: form.deliveryLocationId || null,
          name: form.endCompany || "",
          street: form.endStreet || "",
          houseNumber: form.endHouseNo || "",
          postalCode: form.endPlz || "",
          city: form.endCity || "",
          country: form.endCountry || "DE",
        };
    return mkLocation({
      locationId: flat.locationId || form[cap("locationId")] || form[`${p}LocationId`] || null,
      name: flat.name || form[cap("name")] || form[`${p}Name`] || "",
      street: flat.street || form[cap("street")] || form[`${p}Street`] || "",
      houseNumber:
        flat.houseNumber ||
        form[cap("houseNumber")] ||
        form[`${p}HouseNumber`] ||
        "",
      postalCode:
        flat.postalCode ||
        form[cap("postalCode")] ||
        form[`${p}Plz`] ||
        form[`${p}PostalCode`] ||
        "",
      city: flat.city || form[cap("city")] || form[`${p}City`] || "",
      country: flat.country || form[cap("country")] || form[`${p}Country`] || "DE",
      contactPerson:
        form[cap("contactPerson")] ||
        form[`${p}Contact`] ||
        form[`cName${p === "pickup" ? "1" : "2"}`] ||
        "",
      alternateContactPerson:
        form[cap("alternateContactPerson")] ||
        form[`${p}AlternateContact`] ||
        "",
      secondPhone: form[cap("secondPhone")] || form[`${p}SecondPhone`] || "",
      email: form[cap("email")] || form[`${p}Email`] || "",
      notes:
        form[cap("notes")] ||
        form[`${p}ContactNotes`] ||
        form[`${p}Notes`] ||
        "",
      phone:
        form[cap("phone")] ||
        form[`${p}Phone`] ||
        form[`cPhone${p === "pickup" ? "1" : "2"}`] ||
        "",
      date:
        form[cap("date")] ||
        (p === "pickup" ? form.pickupDate : form.deliveryDate) ||
        form.date ||
        "",
      dateLong:
        form[cap("dateLong")] ||
        (p === "pickup" ? form.pickupDateLong : form.deliveryDateLong) ||
        form.dateLong ||
        "",
      windowFrom:
        form[cap("windowFrom")] ||
        (p === "pickup" ? form.pickupFrom : form.deliveryFrom) ||
        (p === "pickup" ? form.from : "") ||
        form.windowFrom ||
        "",
      windowTo:
        form[cap("windowTo")] ||
        (p === "pickup" ? form.pickupTo : form.deliveryTo) ||
        form.windowTo ||
        "",
      windowFlex: !!(
        form[cap("windowFlex")] ||
        (p === "pickup" ? form.pickupFlex : form.deliveryFlex)
      ),
    });
  }

  function draftAxleToForm(axle) {
    return axle === AXLE_THIRD ? "Fremdachse" : "Eigenachse";
  }

  /** Map a draft job to the admin new-order form shape (includes jobId for updates). */
  function jobToDraftForm(job) {
    if (!job) return null;
    const pu = job.pickup || mkLocation();
    const del = job.delivery || mkLocation();
    return {
      jobId: job.id,
      orderingPartyId: job.orderingPartyId || "",
      customer: job.orderingPartyName || job.customer || "",
      startCity: pu.city || job.startCity || "",
      startPlz: pu.postalCode || job.startPlz || "",
      startStreet: pu.street || job.startStreet || "",
      startHouseNo: pu.houseNumber || "",
      startCountry: pu.country || "DE",
      startCompany: pu.name || job.startCompany || "",
      endCity: del.city || job.endCity || "",
      endPlz: del.postalCode || job.endPlz || "",
      endStreet: del.street || job.endStreet || "",
      endHouseNo: del.houseNumber || "",
      endCountry: del.country || "DE",
      endCompany: del.name || job.endCompany || "",
      distance:
        job.distanceKm != null && job.distanceKm !== ""
          ? String(job.distanceKm)
          : job.distanceManualOverride != null
            ? String(job.distanceManualOverride)
            : "",
      distanceKm: job.distanceKm,
      distanceManualOverride: job.distanceManualOverride,
      pickupDate: pu.date || "",
      pickupFrom: pu.windowFrom || "",
      pickupTo: pu.windowTo || "",
      pickupFlex: !!pu.windowFlex,
      deliveryDate: del.date || "",
      deliveryFrom: del.windowFrom || "",
      deliveryTo: del.windowTo || "",
      deliveryFlex: !!del.windowFlex,
      vehicleType: job.vehicle || "",
      brand: job.vehicleModel || "",
      model: "",
      plate: job.plate || "",
      vin: job.vin || "",
      cName1: pu.contactPerson || "",
      cPhone1: pu.phone || "",
      cName2: del.contactPerson || "",
      cPhone2: del.phone || "",
      pickupAlternateContact: pu.alternateContactPerson || "",
      pickupSecondPhone: pu.secondPhone || "",
      pickupEmail: pu.email || "",
      pickupContactNotes: pu.notes || "",
      deliveryAlternateContact: del.alternateContactPerson || "",
      deliverySecondPhone: del.secondPhone || "",
      deliveryEmail: del.email || "",
      deliveryContactNotes: del.notes || "",
      showPickupExtraContact: !!(
        pu.alternateContactPerson ||
        pu.secondPhone ||
        pu.email ||
        pu.notes
      ),
      showDeliveryExtraContact: !!(
        del.alternateContactPerson ||
        del.secondPhone ||
        del.email ||
        del.notes
      ),
      pickupLocationId: pu.locationId || "",
      deliveryLocationId: del.locationId || "",
      driverCompensation:
        job.driverCompensation != null ? String(job.driverCompensation) : "",
      expenses: job.expenses != null ? String(job.expenses) : "",
      notes: job.notes || "",
      notesDriver: job.notesDriver || "",
      axle: draftAxleToForm(job.axle),
      category: job.category || "Standard",
      updatePickupMaster: false,
      updateDeliveryMaster: false,
      updateOrderingPartyMaster: false,
      savePickupToMaster: false,
      saveDeliveryToMaster: false,
    };
  }

  function composeDraftFieldsFromForm(form) {
    const opId = form.orderingPartyId || "";
    const op =
      orderingParties.find((x) => x.id === opId) ||
      orderingParties.find((x) => x.name === form.customer);
    const partnerOffer =
      parseFloat(String(form.driverCompensation || "0").replace(",", ".")) ||
      0;
    const distRaw =
      form.distanceKm ?? form.distance ?? form.distanceManualOverride;
    const dist = parseInt(distRaw, 10) || 0;
    const pickup =
      form.pickup && typeof form.pickup === "object"
        ? mkLocation(form.pickup)
        : locationFromForm("pickup", form);
    const delivery =
      form.delivery && typeof form.delivery === "object"
        ? mkLocation(form.delivery)
        : locationFromForm("delivery", form);
    if (form.startCity || form.startStreet) {
      Object.assign(pickup, {
        city: form.startCity || pickup.city,
        postalCode: form.startPlz || pickup.postalCode,
        street: form.startStreet || pickup.street,
        houseNumber: form.startHouseNo || pickup.houseNumber,
        country: form.startCountry || pickup.country || "DE",
        name: form.startCompany || form.customer || pickup.name,
        contactPerson: form.cName1 || pickup.contactPerson,
        phone: form.cPhone1 || pickup.phone,
        alternateContactPerson:
          form.pickupAlternateContact || pickup.alternateContactPerson,
        secondPhone: form.pickupSecondPhone || pickup.secondPhone,
        email: form.pickupEmail || pickup.email,
        notes: form.pickupContactNotes || pickup.notes,
      });
    }
    if (form.pickupLocationId) pickup.locationId = form.pickupLocationId;
    if (form.endCity || form.endStreet) {
      Object.assign(delivery, {
        city: form.endCity || delivery.city,
        postalCode: form.endPlz || delivery.postalCode,
        street: form.endStreet || delivery.street,
        houseNumber: form.endHouseNo || delivery.houseNumber,
        country: form.endCountry || delivery.country || "DE",
        name: form.endCompany || delivery.name,
        contactPerson: form.cName2 || delivery.contactPerson,
        phone: form.cPhone2 || delivery.phone,
        alternateContactPerson:
          form.deliveryAlternateContact || delivery.alternateContactPerson,
        secondPhone: form.deliverySecondPhone || delivery.secondPhone,
        email: form.deliveryEmail || delivery.email,
        notes: form.deliveryContactNotes || delivery.notes,
      });
    }
    if (form.deliveryLocationId) delivery.locationId = form.deliveryLocationId;
    return {
      orderingPartyId: op?.id || opId,
      orderingPartyName: op?.name || form.customer || "New ordering party",
      pickup,
      delivery,
      distanceKm: dist,
      distanceManualOverride:
        form.distanceManualOverride != null
          ? form.distanceManualOverride
          : null,
      category: form.category || "Standard",
      vehicle: form.vehicleType || form.vehicle || "PKW",
      vehicleModel:
        [form.brand, form.model].filter(Boolean).join(" ").trim() || "—",
      plate: form.plate,
      vin: form.vin,
      axle: normalizeAxle(form.axle),
      driverCompensation: partnerOffer,
      expenses:
        parseFloat(String(form.expenses || "").replace(",", ".")) || null,
      notes: form.notes,
      notesDriver: form.notesDriver || "",
    };
  }

  function parseDottedDate(s) {
    const m = String(s || "")
      .trim()
      .match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (!m) return null;
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    return {
      y,
      mo: parseInt(m[2], 10),
      d: parseInt(m[1], 10),
    };
  }

  function compareDottedDates(a, b) {
    const pa = parseDottedDate(a);
    const pb = parseDottedDate(b);
    if (!pa || !pb) return 0;
    if (pa.y !== pb.y) return pa.y - pb.y;
    if (pa.mo !== pb.mo) return pa.mo - pb.mo;
    return pa.d - pb.d;
  }

  function formatLocTimeWindow(loc, flexLabel) {
    if (!loc) return "";
    if (loc.windowFlex) return flexLabel || "Flexible";
    if (loc.windowFrom && loc.windowTo)
      return `${loc.windowFrom}–${loc.windowTo}`;
    return loc.windowFrom || loc.windowTo || "";
  }

  function formatLocationSchedule(loc, flexLabel) {
    if (!loc) return "—";
    const date = loc.dateLong || loc.date || "";
    const win = formatLocTimeWindow(loc, flexLabel);
    if (date && win) return `${date} · ${win}`;
    return date || win || "—";
  }

  function schedulesOnDifferentDays(job) {
    const pu = job?.pickup;
    const del = job?.delivery;
    if (!pu?.date || !del?.date) return false;
    return pu.date !== del.date;
  }

  function formatJobScheduleShort(job, flexLabel) {
    const pu = job?.pickup || mkLocation();
    const del = job?.delivery || mkLocation();
    if (schedulesOnDifferentDays(job)) {
      const pd = pu.date || "";
      const dd = del.date || "";
      return `${pd} → ${dd}`;
    }
    const date = pu.date || del.date || "";
    const puWin = formatLocTimeWindow(pu, flexLabel);
    const delWin = formatLocTimeWindow(del, flexLabel);
    if (date && puWin && delWin && puWin !== delWin)
      return `${date} · P ${puWin} / D ${delWin}`;
    const win = puWin || delWin;
    if (date && win) return `${date} · ${win}`;
    return date || win || "—";
  }

  const api = {
    STATUSES,
    DOC_REVIEW,
    TOUR_DOC_TYPE_INVOICE,
    normalizeTourDocumentType,
    normalizeTourDocumentReviewStatus,
    normalizePaymentStatus,
    PAYMENT_STATUSES,
    tourDocumentNeedsPartnerCorrection,
    isTourBillingInvoiceType,
    tourDocumentReviewActions,
    SETTLEMENT_STATES,
    DEMO_DRIVER,
    parseDottedDate,
    compareDottedDates,
    formatDateInput:
      window.InputFormatters?.formatDateInput ||
      ((s) => String(s || "").trim()),
    formatTimeInput:
      window.InputFormatters?.formatTimeInput ||
      ((s) => String(s || "").trim()),
    normalizeVin:
      window.InputFormatters?.normalizeVin ||
      ((s) => String(s || "").toUpperCase()),
    normalizePlate:
      window.InputFormatters?.normalizePlate ||
      ((s) => String(s || "").toUpperCase()),
    compareTimeStrings:
      window.InputFormatters?.compareTimeStrings || (() => 0),
    MANUFACTURER_SUGGESTIONS:
      window.InputFormatters?.MANUFACTURER_SUGGESTIONS || [],
    formatLocTimeWindow,
    formatLocationSchedule,
    formatJobScheduleShort,
    schedulesOnDifferentDays,
    DEMO_ADMIN,
    AXLE_OWN,
    AXLE_THIRD,
    syncDisplayFields,
    jobToDraftForm,

    statusLabel: (s) => {
      const key = STATUSES[s]?.i18n;
      if (key && window.I18n?.t) return window.I18n.t(key);
      return s;
    },
    statusCls: (s) => STATUSES[s]?.cls || "",

    getAppDisplayName() {
      return branding.appDisplayName || "Transport Portal";
    },

    getBranding: () => ({ ...branding }),

    setAppDisplayName(name) {
      const next = String(name || "").trim() || "Transport Portal";
      if (branding.appDisplayName === next) return { ok: true };
      branding.appDisplayName = next;
      log("branding_changed", DEMO_ADMIN, "appDisplayName", next);
      emit();
      return { ok: true };
    },

    getJobs: () => jobs,
    getJob: (id) => jobs.find((j) => j.id === id),
    getPartnerOffer: (id) => partnerOfferAmount(api.getJob(id)),
    partnerOfferAmount,
    getDrivers: () => drivers,
    getAdmins: () => admins,
    getOrderingParties: (opts = {}) => {
      const all = orderingParties.slice();
      return opts.activeOnly ? all.filter((x) => x.active !== false) : all;
    },
    getAddresses: (opts = {}) => {
      const all = addresses.slice();
      return opts.activeOnly ? all.filter((x) => x.active !== false) : all;
    },
    getDocuments: () => documents.filter((d) => d.visible !== false),
    getDocumentsAdmin: () => documents.slice(),
    getNews: () => newsItems.filter((n) => n.visible !== false),
    getNewsAdmin: () => newsItems.slice(),
    getAuditLog: () => auditLog,
    getAdminEmailQueue: () => adminEmailQueue.slice(),
    getDriverNotifications: (driverId) => {
      const id =
        driverId ||
        api.getCurrentDriver()?.id ||
        drivers.find((d) => d.name === DEMO_DRIVER)?.id;
      return driverNotifications.filter((n) => !n.driverId || n.driverId === id);
    },
    getDriverNotificationUnreadCount: (driverId) =>
      api.getDriverNotifications(driverId).filter((n) => !n.read).length,
    markDriverNotificationsRead: (ids) => {
      const set = new Set(Array.isArray(ids) ? ids : []);
      let n = 0;
      for (const row of driverNotifications) {
        if (set.size && !set.has(row.id)) continue;
        if (!row.read) {
          row.read = true;
          n++;
        }
      }
      if (n) emit();
      return { ok: true, count: n };
    },
    pushDriverNotification,
    getJobDisplayStatus,

    getCurrentDriver: () =>
      drivers.find((d) => d.name === DEMO_DRIVER) || drivers[0],

    isCurrentDriverActive() {
      const d = api.getCurrentDriver();
      return !d || d.status === "Active";
    },

    countsByStatus: () => {
      const c = {};
      jobs.forEach((j) => {
        c[j.status] = (c[j.status] || 0) + 1;
      });
      return c;
    },

    driver: driverState,

    isMineJob(j) {
      if (!j) return false;
      const curName = api.getCurrentDriver()?.name || DEMO_DRIVER;
      if (driverState.cancelledIds.has(j.id)) return true;
      if (driverState.acceptedIds.has(j.id)) return true;
      if (driverState.performedIds.has(j.id)) return true;
      if (driverState.specialCaseIds.has(j.id)) return true;
      if (j.status === "cancelled" && j.driver === curName) return true;
      if (
        j.driver === curName &&
        ["assigned", "accepted", "special_case", "performed"].includes(j.status)
      )
        return true;
      return false;
    },

    getAssignableDrivers() {
      return drivers.filter((d) => d.status === "Active");
    },

    resolveAssignableDriver(ref) {
      if (ref == null || ref === "")
        return { ok: false, reason: "driver_required" };
      let driver = null;
      if (typeof ref === "object") {
        if (ref.driverId)
          driver = drivers.find((d) => d.id === ref.driverId) || null;
        if (!driver && (ref.driverName || ref.name))
          driver =
            drivers.find(
              (d) => d.name === ref.driverName || d.name === ref.name,
            ) || null;
      } else {
        const s = String(ref).trim();
        driver =
          drivers.find((d) => d.id === s) ||
          drivers.find((d) => d.name === s) ||
          null;
      }
      if (!driver) return { ok: false, reason: "driver_not_found" };
      if (driver.status !== "Active")
        return { ok: false, reason: "driver_not_active" };
      return { ok: true, driver };
    },

    isAccepted: (id) => driverState.acceptedIds.has(id),
    isPerformed: (id) => driverState.performedIds.has(id),
    isSpecialCase: (id) => driverState.specialCaseIds.has(id),

    getOrderingParty: (id) => orderingParties.find((x) => x.id === id) || null,

    getAddress: (id) => addresses.find((x) => x.id === id) || null,

    countJobsUsingOrderingParty(opId) {
      return jobs.filter((j) => j.orderingPartyId === opId).length;
    },

    countJobsUsingAddress(addrId) {
      return jobs.filter(
        (j) =>
          j.pickup?.locationId === addrId || j.delivery?.locationId === addrId,
      ).length;
    },

    addOrderingParty(data) {
      const name = String(data?.name || "").trim();
      if (!name) return { ok: false, reason: "name_required" };
      const op = {
        id: nextMasterId("OP", orderingParties),
        name,
        type: String(data?.type || "").trim(),
        contact: String(data?.contact || "").trim(),
        phone: String(data?.phone || "").trim(),
        email: String(data?.email || "").trim(),
        billingNotes: String(data?.billingNotes || "").trim(),
        instructions: String(data?.instructions || "").trim(),
        active: data?.active !== false,
      };
      orderingParties.unshift(op);
      log("ordering_party_created", DEMO_ADMIN, op.name, op.id);
      emit();
      return { ok: true, party: op };
    },

    updateOrderingParty(id, data) {
      const op = orderingParties.find((x) => x.id === id);
      if (!op) return { ok: false, reason: "not_found" };
      const name = data?.name != null ? String(data.name).trim() : op.name;
      if (!name) return { ok: false, reason: "name_required" };
      if (data?.name != null) op.name = name;
      if (data?.type != null) op.type = String(data.type).trim();
      if (data?.contact != null) op.contact = String(data.contact).trim();
      if (data?.phone != null) op.phone = String(data.phone).trim();
      if (data?.email != null) op.email = String(data.email).trim();
      if (data?.billingNotes != null)
        op.billingNotes = String(data.billingNotes).trim();
      if (data?.instructions != null)
        op.instructions = String(data.instructions).trim();
      if (data?.active != null) op.active = !!data.active;
      log("ordering_party_updated", DEMO_ADMIN, op.name, op.id);
      emit();
      return { ok: true, party: op };
    },

    deleteOrderingParty(id) {
      const op = orderingParties.find((x) => x.id === id);
      if (!op) return { ok: false, reason: "not_found" };
      const used = api.countJobsUsingOrderingParty(id);
      if (used > 0) return { ok: false, reason: "in_use", count: used };
      const idx = orderingParties.findIndex((x) => x.id === id);
      orderingParties.splice(idx, 1);
      log("ordering_party_deleted", DEMO_ADMIN, op.name, op.id);
      emit();
      return { ok: true };
    },

    addAddress(data) {
      const label = String(data?.label || data?.name || "").trim();
      if (!label) return { ok: false, reason: "label_required" };
      const street = String(data?.street || "").trim();
      const postalCode = String(data?.postalCode || "").trim();
      const city = String(data?.city || "").trim();
      if (!street || !postalCode || !city)
        return { ok: false, reason: "address_incomplete" };
      const addr = {
        id: nextMasterId("ADDR", addresses),
        label,
        street,
        houseNumber: String(data?.houseNumber || "").trim(),
        postalCode,
        city,
        country: String(data?.country || "DE").trim() || "DE",
        contactPerson: String(data?.contactPerson || "").trim(),
        phone: String(data?.phone || "").trim(),
        secondPhone: String(data?.secondPhone || "").trim(),
        email: String(data?.email || "").trim(),
        notes: String(data?.notes || "").trim(),
        active: data?.active !== false,
      };
      addresses.unshift(addr);
      log("address_created", DEMO_ADMIN, addr.label, addr.id);
      emit();
      return { ok: true, address: addr };
    },

    updateAddress(id, data) {
      const addr = addresses.find((x) => x.id === id);
      if (!addr) return { ok: false, reason: "not_found" };
      if (data?.label != null) {
        const label = String(data.label).trim();
        if (!label) return { ok: false, reason: "label_required" };
        addr.label = label;
      }
      if (data?.street != null) addr.street = String(data.street).trim();
      if (data?.houseNumber != null)
        addr.houseNumber = String(data.houseNumber).trim();
      if (data?.postalCode != null)
        addr.postalCode = String(data.postalCode).trim();
      if (data?.city != null) addr.city = String(data.city).trim();
      if (data?.country != null)
        addr.country = String(data.country).trim() || "DE";
      if (data?.contactPerson != null)
        addr.contactPerson = String(data.contactPerson).trim();
      if (data?.phone != null) addr.phone = String(data.phone).trim();
      if (data?.secondPhone != null)
        addr.secondPhone = String(data.secondPhone).trim();
      if (data?.email != null) addr.email = String(data.email).trim();
      if (data?.notes != null) addr.notes = String(data.notes).trim();
      if (data?.active != null) addr.active = !!data.active;
      if (!addr.street || !addr.postalCode || !addr.city)
        return { ok: false, reason: "address_incomplete" };
      log("address_updated", DEMO_ADMIN, addr.label, addr.id);
      emit();
      return { ok: true, address: addr };
    },

    deleteAddress(id) {
      const addr = addresses.find((x) => x.id === id);
      if (!addr) return { ok: false, reason: "not_found" };
      const used = api.countJobsUsingAddress(id);
      if (used > 0) return { ok: false, reason: "in_use", count: used };
      const idx = addresses.findIndex((x) => x.id === id);
      addresses.splice(idx, 1);
      log("address_deleted", DEMO_ADMIN, addr.label, addr.id);
      emit();
      return { ok: true };
    },

    markNewsRead(newsId, readerId) {
      const n = newsItems.find((x) => x.id === newsId);
      if (!n) return { ok: false };
      const rid = readerId || api.getCurrentDriver()?.id || DEMO_DRIVER;
      if (!n.readBy.includes(rid)) n.readBy.push(rid);
      emit();
      return { ok: true };
    },

    addNewsItem(data = {}) {
      const notifyInApp = data.notifyInApp !== false;
      const notifyPush = !!data.notifyPush;
      const item = {
        id: nextNewsId(newsItems),
        title: (data.title || "").trim() || "Announcement",
        body: (data.body || "").trim(),
        publishedAt: (data.publishedAt || "").trim() || nowStamp(),
        visible: data.visible !== false,
        readBy: [],
      };
      newsItems.unshift(item);
      log("news_item_created", DEMO_ADMIN, item.title, item.id);
      if (notifyInApp) {
        for (const dr of drivers.filter((x) => x.status === "Active")) {
          pushDriverNotification({
            type: "infopoint_news",
            title: item.title,
            body: (item.body || "").slice(0, 120),
            driverId: dr.id,
          });
        }
      }
      if (notifyPush) {
        for (const dr of drivers.filter((x) => x.status === "Active")) {
          const prefs = normalizeDriverPrefs(dr.prefs);
          if (prefs.pushEnabled) {
            log(
              "push_notification_queued",
              "System",
              item.title,
              dr.partnerId || dr.id,
            );
          }
        }
      }
      emit();
      return item;
    },

    hideNewsItem(id) {
      const n = newsItems.find((x) => x.id === id);
      if (!n) return { ok: false };
      n.visible = false;
      log("news_item_hidden", DEMO_ADMIN, n.title, n.id);
      emit();
      return { ok: true };
    },

    showNewsItem(id) {
      const n = newsItems.find((x) => x.id === id);
      if (!n) return { ok: false };
      n.visible = true;
      log("news_item_shown", DEMO_ADMIN, n.title, n.id);
      emit();
      return { ok: true };
    },

    updateNewsItem(id, patch = {}) {
      const n = newsItems.find((x) => x.id === id);
      if (!n) return { ok: false };
      if (patch.title != null) n.title = String(patch.title).trim() || n.title;
      if (patch.body != null) n.body = String(patch.body).trim();
      if (patch.publishedAt != null)
        n.publishedAt = String(patch.publishedAt).trim() || n.publishedAt;
      log("news_item_updated", DEMO_ADMIN, n.title, n.id);
      emit();
      return { ok: true, item: n };
    },

    estimateDistance(jobOrId) {
      const j =
        typeof jobOrId === "object"
          ? jobOrId
          : jobs.find((x) => x.id === jobOrId);
      if (!j) return { ok: false, km: 0 };
      const km = estimateDistanceKm(j);
      return { ok: true, km, source: "estimate" };
    },

    recalculateDistance(id) {
      const j = api.getJob(id);
      if (!j) return { ok: false };
      if (j.distanceManualOverride != null && j.distanceManualOverride !== "") {
        j.distanceKm = Number(j.distanceManualOverride) || j.distanceKm;
        j.distanceEstimateSource = "manual";
      } else {
        j.distanceKm = estimateDistanceKm(j);
        j.distanceEstimateSource = "recalculated";
      }
      syncDisplayFields(j);
      log(
        "distance_recalculated",
        DEMO_ADMIN,
        j.tour,
        `${j.distanceKm} km (${j.distanceEstimateSource})`,
      );
      emit();
      return { ok: true, km: j.distanceKm };
    },

    acceptJob(id) {
      const j = api.getJob(id);
      if (!j || j.status !== "published")
        return { ok: false, reason: "not_available" };
      if (!api.isCurrentDriverActive())
        return { ok: false, reason: "driver_restricted" };
      j.status = "accepted";
      j.driver = DEMO_DRIVER;
      bumpPdf(j);
      j.history = [
        ...(j.history || []),
        { st: "accepted", at: nowStamp(), by: DEMO_DRIVER },
      ];
      driverState.acceptedIds.add(id);
      log("job_accepted", DEMO_DRIVER, j.tour, "Binding slide confirmation");
      queueAdminEmailAlert("job_accepted", id, `Driver ${DEMO_DRIVER}`);
      emit();
      return { ok: true };
    },

    markPerformed(id) {
      const j = api.getJob(id);
      if (!j || !["assigned", "accepted"].includes(j.status))
        return { ok: false, reason: "invalid_state" };
      if (j.driver && j.driver !== DEMO_DRIVER)
        return { ok: false, reason: "not_assigned_driver" };
      j.status = "performed";
      j.performedAt = nowStamp();
      j.settlementState = j.settlementState || "Pending";
      j.history = [
        ...(j.history || []),
        { st: "performed", at: nowStamp(), by: j.driver || DEMO_DRIVER },
      ];
      driverState.performedIds.add(id);
      driverState.acceptedIds.delete(id);
      log(
        "job_performed",
        j.driver || DEMO_DRIVER,
        j.tour,
        "Driver marked tour performed",
      );
      queueAdminEmailAlert("job_performed", id, j.tour);
      emit();
      return { ok: true };
    },

    reportProblemCancel(id, reason, message) {
      const j = api.getJob(id);
      if (!j || !["assigned", "accepted"].includes(j.status))
        return { ok: false, reason: "invalid_state" };
      if (j.driver && j.driver !== DEMO_DRIVER)
        return { ok: false, reason: "not_assigned_driver" };
      j.status = "cancelled";
      j.cancellationActor = "service_partner";
      j.cancellationReason = reason || "";
      j.cancellationReasonText = message || "";
      j.history = [
        ...(j.history || []),
        {
          st: "cancelled",
          at: nowStamp(),
          by: DEMO_DRIVER,
          meta: `Report Problem cancel: ${reason}`,
        },
      ];
      driverState.acceptedIds.delete(id);
      driverState.cancelledIds.add(id);
      log(
        "report_problem_cancel",
        DEMO_DRIVER,
        j.tour,
        `${reason}: ${message}`,
      );
      queueAdminEmailAlert("report_problem_cancel", id, message);
      emit();
      return { ok: true };
    },

    buildSpecialCaseEvidenceMeta(files) {
      const list = Array.isArray(files) ? files.slice(0, 5) : [];
      const evidence = [];
      for (const file of list) {
        if (!file || !isAllowedTourDocumentFile(file)) continue;
        const mime = (file.type || guessMimeFromName(file.name) || "").trim();
        evidence.push({
          id: `SCE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fileName: file.name,
          mimeType: mime || "application/octet-stream",
          sizeBytes: typeof file.size === "number" ? file.size : 0,
          uploadedAt: new Date().toISOString(),
        });
      }
      return evidence;
    },

    reportProblemNotPerformable(id, reason, message, evidenceFiles) {
      const j = api.getJob(id);
      if (!j || !["assigned", "accepted"].includes(j.status))
        return { ok: false, reason: "invalid_state" };
      if (j.driver && j.driver !== DEMO_DRIVER)
        return { ok: false, reason: "not_assigned_driver" };
      const statusBeforeSpecialCase = j.status;
      const evidence = api.buildSpecialCaseEvidenceMeta(evidenceFiles);
      j.status = "special_case";
      j.specialCaseReport = {
        type: "not_performable",
        reason: reason || "other",
        message: message || "",
        reportedAt: nowStamp(),
        reportedBy: DEMO_DRIVER,
        statusBeforeSpecialCase,
        evidence,
      };
      j.history = [
        ...(j.history || []),
        {
          st: "special_case",
          at: nowStamp(),
          by: DEMO_DRIVER,
          meta: "Report Problem: not performable",
        },
      ];
      driverState.specialCaseIds.add(id);
      driverState.acceptedIds.delete(id);
      log(
        "special_case_created",
        DEMO_DRIVER,
        j.tour,
        `${reason}: ${message}`,
      );
      const alertMeta =
        evidence.length > 0
          ? `${message || ""} · ${evidence.length} file(s)`.trim()
          : message || "";
      queueAdminEmailAlert("special_case_created", id, alertMeta);
      emit();
      return { ok: true };
    },

    requestMasterDataChange(note) {
      const text = String(note || "").trim();
      if (text.length < 10) return { ok: false, reason: "note_too_short" };
      if (!api.isCurrentDriverActive())
        return { ok: false, reason: "driver_restricted" };
      const d = api.getCurrentDriver();
      const who = d?.name || DEMO_DRIVER;
      queueAdminEmailAlert(
        "master_data_change_requested",
        "",
        `${who}: ${text}`,
      );
      log("master_data_change_requested", who, "profile", text.slice(0, 120));
      pushDriverNotification({
        type: "master_data_change_sent",
        title: "Change request sent",
        body: "Dispatch received your master-data change request.",
        driverId: d?.id,
      });
      emit();
      return { ok: true };
    },

    resolveSpecialCase(id, decision, note) {
      const j = api.getJob(id);
      if (!j || j.status !== "special_case") return { ok: false };
      const d = String(decision || "").toLowerCase();
      if (d === "cancel" || d === "cancelled") {
        j.status = "cancelled";
        driverState.specialCaseIds.delete(id);
        driverState.cancelledIds.add(id);
        j.history = [
          ...(j.history || []),
          {
            st: "cancelled",
            at: nowStamp(),
            by: DEMO_ADMIN,
            meta: note || "Special case resolved → cancelled",
          },
        ];
        log("special_case_resolved", DEMO_ADMIN, j.tour, "Cancelled");
        pushDriverNotification({
          type: "order_cancelled",
          jobId: id,
          tour: j.tour,
          title: "Tour cancelled",
          body: note || "",
          driverId: j.driverId,
        });
      } else if (d === "republish") {
        j.status = "published";
        j.driver = null;
        j.specialCaseReport = null;
        driverState.specialCaseIds.delete(id);
        j.history = [
          ...(j.history || []),
          {
            st: "published",
            at: nowStamp(),
            by: DEMO_ADMIN,
            meta: note || "Special case resolved -> republished",
          },
        ];
        log("special_case_resolved", DEMO_ADMIN, j.tour, "Republished");
        queuePushNotification(j, "republish");
        queueAdminEmailAlert("special_case_republished", id, note || "");
      } else if (d === "reopen" || d === "draft") {
        j.status = "draft";
        j.driver = null;
        j.specialCaseReport = null;
        driverState.specialCaseIds.delete(id);
        j.history = [
          ...(j.history || []),
          {
            st: "draft",
            at: nowStamp(),
            by: DEMO_ADMIN,
            meta: note || "Special case resolved → draft",
          },
        ];
        log("special_case_resolved", DEMO_ADMIN, j.tour, "Returned to draft");
      } else if (
        d === "assign" ||
        d === "assigned" ||
        d === "continue"
      ) {
        const restored =
          j.specialCaseReport?.statusBeforeSpecialCase ||
          inferStatusBeforeSpecialCase(j);
        j.status = restored;
        j.specialCaseReport = null;
        driverState.specialCaseIds.delete(id);
        if (restored === "accepted") driverState.acceptedIds.add(id);
        else driverState.acceptedIds.delete(id);
        j.history = [
          ...(j.history || []),
          {
            st: restored,
            at: nowStamp(),
            by: DEMO_ADMIN,
            meta:
              note ||
              `Special case resolved → continued as ${restored}`,
          },
        ];
        log(
          "special_case_resolved",
          DEMO_ADMIN,
          j.tour,
          `Continued as ${restored}`,
        );
        pushDriverNotification({
          type: "special_case_processed",
          jobId: id,
          tour: j.tour,
          title: "Problem case updated",
          body: note || "Dispatch continued the tour.",
          driverId: j.driverId,
        });
      } else if (d === "close") {
        j.status = "performed";
        j.performedAt = j.performedAt || nowStamp();
        j.settlementState = "Closed";
        j.specialCaseReport = null;
        driverState.specialCaseIds.delete(id);
        driverState.performedIds.add(id);
        j.history = [
          ...(j.history || []),
          {
            st: "performed",
            at: nowStamp(),
            by: DEMO_ADMIN,
            meta: note || "Special case resolved → closed",
          },
        ];
        log("special_case_resolved", DEMO_ADMIN, j.tour, "Closed");
      } else {
        return { ok: false, reason: "unknown_decision" };
      }
      emit();
      return { ok: true };
    },

    publishJob(id) {
      const j = api.getJob(id);
      if (!j || j.status !== "draft") return { ok: false };
      j.status = "published";
      j.isNew = false;
      j.history = [
        ...(j.history || []),
        { st: "published", at: nowStamp(), by: "A. Bauer" },
      ];
      log(
        "job_published",
        DEMO_ADMIN,
        j.tour,
        "Visible as reduced marketplace preview",
      );
      queuePushNotification(j, "publish");
      emit();
      return { ok: true };
    },

    deleteDraftJob(id) {
      const idx = jobs.findIndex((x) => x.id === id);
      if (idx < 0) return { ok: false, reason: "not_found" };
      const j = jobs[idx];
      if (j.status !== "draft") return { ok: false, reason: "not_draft" };
      const tour = j.tour;
      jobs.splice(idx, 1);
      driverState.acceptedIds.delete(id);
      driverState.performedIds.delete(id);
      driverState.specialCaseIds.delete(id);
      driverState.cancelledIds.delete(id);
      log("job_draft_deleted", DEMO_ADMIN, tour, "Draft removed by admin");
      emit();
      return { ok: true, tour };
    },

    revertJobToDraft(id) {
      const j = api.getJob(id);
      if (!j || j.status !== "published")
        return { ok: false, reason: "not_published" };
      j.status = "draft";
      j.driver = null;
      j.history = [
        ...(j.history || []),
        {
          st: "draft",
          at: nowStamp(),
          by: DEMO_ADMIN,
          meta: "Reverted from Published",
        },
      ];
      log(
        "job_reverted_to_draft",
        DEMO_ADMIN,
        j.tour,
        "Removed from marketplace; editable as draft",
      );
      emit();
      return { ok: true };
    },

    assignJob(id, driverRef) {
      const j = api.getJob(id);
      if (!j || j.status !== "draft")
        return { ok: false, reason: "not_draft" };
      const dr = api.resolveAssignableDriver(driverRef);
      if (!dr.ok) return dr;
      j.status = "assigned";
      j.driver = dr.driver.name;
      j.driverId = dr.driver.id;
      bumpPdf(j);
      j.history = [
        ...(j.history || []),
        {
          st: "assigned",
          at: nowStamp(),
          by: DEMO_ADMIN,
          meta: `Driver: ${j.driver} (${j.driverId})`,
        },
      ];
      log("job_assigned", DEMO_ADMIN, j.tour, `Driver: ${j.driver}`);
      queuePushNotification(j, "assign");
      queueAdminEmailAlert("job_assigned", id, `Driver: ${j.driver}`);
      emit();
      return { ok: true, driver: dr.driver };
    },

    reassignJob(id, driverRef) {
      const j = api.getJob(id);
      const allowed = ["assigned", "accepted", "special_case"];
      if (!j || !allowed.includes(j.status))
        return { ok: false, reason: "not_reassignable" };
      const dr = api.resolveAssignableDriver(driverRef);
      if (!dr.ok) return dr;
      const prev = j.driver || "";
      if (prev === dr.driver.name) return { ok: false, reason: "same_driver" };
      j.driver = dr.driver.name;
      j.driverId = dr.driver.id;
      j.history = [
        ...(j.history || []),
        {
          st: j.status,
          at: nowStamp(),
          by: DEMO_ADMIN,
          meta: `Reassigned: ${prev || "—"} → ${j.driver}`,
        },
      ];
      log(
        "job_reassigned",
        DEMO_ADMIN,
        j.tour,
        `${prev || "—"} → ${j.driver}`,
      );
      queuePushNotification(j, "assign");
      queueAdminEmailAlert("job_reassigned", id, `${prev} → ${j.driver}`);
      emit();
      return { ok: true, driver: dr.driver, previousDriver: prev };
    },

    cancelJob(id, opts = {}) {
      const j = api.getJob(id);
      const allowed = [
        "accepted",
        "assigned",
        "special_case",
        "performed",
        "published",
      ];
      if (!j || !allowed.includes(j.status))
        return { ok: false, reason: "not_cancellable" };
      j.status = "cancelled";
      j.specialCaseReport = null;
      j.cancellationActor = opts.actor || "admin";
      j.cancellationReason = opts.reason || "";
      j.cancellationReasonText = opts.note || "";
      j.history = [
        ...(j.history || []),
        {
          st: "cancelled",
          at: nowStamp(),
          by: opts.by || DEMO_ADMIN,
          meta: opts.note || "Admin cancellation",
        },
      ];
      driverState.acceptedIds.delete(id);
      driverState.performedIds.delete(id);
      driverState.specialCaseIds.delete(id);
      driverState.cancelledIds.add(id);
      log("job_cancelled", opts.by || DEMO_ADMIN, j.tour, opts.note || "");
      queueAdminEmailAlert("job_cancelled", id, opts.note || "");
      if (j.driverId) {
        pushDriverNotification({
          type: "order_cancelled",
          jobId: id,
          tour: j.tour,
          title: "Tour cancelled",
          body: opts.note || "",
          driverId: j.driverId,
        });
      }
      emit();
      return { ok: true };
    },

    regeneratePdf(id) {
      const j = api.getJob(id);
      if (!j || j.status === "draft") return { ok: false };
      bumpPdf(j);
      log("pdf_regenerated", DEMO_ADMIN, j.tour, `PDF version ${j.pdfVersion}`);
      emit();
      return { ok: true };
    },

    saveDraft(form) {
      const editId = String(form.jobId || form.id || "").trim();
      const opId = form.orderingPartyId || "";
      const op =
        orderingParties.find((x) => x.id === opId) ||
        orderingParties.find((x) => x.name === form.customer);
      if (form.updateOrderingPartyMaster && op?.id) {
        api.updateOrderingParty(op.id, {
          name: form.customer || op.name,
          contact: form.cName1 || op.contact,
          phone: form.cPhone1 || op.phone,
          instructions: form.notesDriver || op.instructions,
        });
      }
      if (form.updatePickupMaster && form.pickupLocationId) {
        api.updateAddress(form.pickupLocationId, {
          label: form.startCompany || undefined,
          street: form.startStreet,
          houseNumber: form.startHouseNo,
          postalCode: form.startPlz,
          city: form.startCity,
          country: form.startCountry,
          contactPerson: form.cName1,
          phone: form.cPhone1,
          secondPhone: form.pickupSecondPhone,
          email: form.pickupEmail,
          notes: form.pickupContactNotes,
        });
      }
      if (form.updateDeliveryMaster && form.deliveryLocationId) {
        api.updateAddress(form.deliveryLocationId, {
          label: form.endCompany || undefined,
          street: form.endStreet,
          houseNumber: form.endHouseNo,
          postalCode: form.endPlz,
          city: form.endCity,
          country: form.endCountry,
          contactPerson: form.cName2,
          phone: form.cPhone2,
          secondPhone: form.deliverySecondPhone,
          email: form.deliveryEmail,
          notes: form.deliveryContactNotes,
        });
      }
      if (form.savePickupToMaster && form.startStreet?.trim()) {
        api.addAddress({
          label:
            form.startCompany ||
            `${form.startStreet}${form.startHouseNo ? " " + form.startHouseNo : ""}, ${form.startCity}`.trim(),
          street: form.startStreet,
          houseNumber: form.startHouseNo,
          postalCode: form.startPlz,
          city: form.startCity,
          country: form.startCountry || "DE",
          contactPerson: form.cName1,
          phone: form.cPhone1,
          secondPhone: form.pickupSecondPhone,
          email: form.pickupEmail,
          notes: form.pickupContactNotes,
        });
      }
      if (form.saveDeliveryToMaster && form.endStreet?.trim()) {
        api.addAddress({
          label:
            form.endCompany ||
            `${form.endStreet}${form.endHouseNo ? " " + form.endHouseNo : ""}, ${form.endCity}`.trim(),
          street: form.endStreet,
          houseNumber: form.endHouseNo,
          postalCode: form.endPlz,
          city: form.endCity,
          country: form.endCountry || "DE",
          contactPerson: form.cName2,
          phone: form.cPhone2,
          secondPhone: form.deliverySecondPhone,
          email: form.deliveryEmail,
          notes: form.deliveryContactNotes,
        });
      }

      const fields = composeDraftFieldsFromForm(form);

      if (editId) {
        const j = jobs.find((x) => x.id === editId);
        if (!j || j.status !== "draft") return null;
        Object.assign(j, fields);
        j.isNew = false;
        if (!j.distanceKm) {
          j.distanceKm = estimateDistanceKm(j);
          j.distanceEstimateSource = "estimate";
        }
        syncDisplayFields(j);
        log(
          "job_draft_updated",
          DEMO_ADMIN,
          j.tour,
          "Draft updated from admin form",
        );
        emit();
        return j;
      }

      const seq = nextTourSeq++;
      const tour = `${String(seq).padStart(4, "0")}-26`;
      const id = `A-2026-${String(seq).padStart(5, "0")}`;
      const newJob = mk({
        id,
        tour,
        ...fields,
        revenue: null,
        netAmount: null,
        vatRate: 19,
        grossAmount: null,
        status: "draft",
        isNew: true,
        createdAt: nowStamp(),
        pdfVersion: 0,
        history: [{ st: "draft", at: nowStamp(), by: "A. Bauer" }],
      });
      if (!newJob.distanceKm) {
        newJob.distanceKm = estimateDistanceKm(newJob);
        newJob.distanceEstimateSource = "estimate";
      }
      jobs.unshift(newJob);
      log(
        "job_created",
        DEMO_ADMIN,
        newJob.tour,
        "Draft created from admin form",
      );
      emit();
      return newJob;
    },

    setDriverStatus(id, status) {
      const allowed = [
        "Active",
        "Blocked",
        "Inactive",
        "Archived",
        "Soft Deleted",
      ];
      const d = drivers.find((x) => x.id === id);
      if (!d || !allowed.includes(status)) return { ok: false };
      d.status = status;
      log("driver_status_changed", DEMO_ADMIN, d.name, status);
      emit();
      return { ok: true };
    },

    resetPassword(kind, id) {
      const pool = kind === "admin" ? admins : drivers;
      const u = pool.find((x) => x.id === id);
      if (!u) return { ok: false };
      log("password_reset_triggered", DEMO_ADMIN, u.name, kind);
      emit();
      return { ok: true };
    },

    toggleDocument(id) {
      const d = documents.find((x) => x.id === id);
      if (!d) return { ok: false };
      d.visible = !d.visible;
      log(
        "document_visibility_changed",
        DEMO_ADMIN,
        d.title,
        d.visible ? "Shown" : "Hidden",
      );
      emit();
      return { ok: true };
    },

    replaceDocument(id) {
      const d = documents.find((x) => x.id === id);
      if (!d) return { ok: false };
      d.version = `v${(parseFloat(String(d.version).replace("v", "")) + 0.1).toFixed(1)}`;
      d.updatedAt = nowStamp();
      log("document_replaced", DEMO_ADMIN, d.title, d.version);
      emit();
      return { ok: true };
    },

    addGeneralDocument(data = {}) {
      const item = {
        id: nextDocId(documents),
        title: (data.title || "").trim() || "Document",
        description: (data.description || "").trim(),
        category: (data.category || "Operations").trim(),
        visible: data.visible !== false,
        scope: data.scope || "Global",
        version: data.version || "v1.0",
        updatedAt: data.updatedAt || nowStamp(),
        seed: false,
      };
      documents.push(item);
      log("document_created", DEMO_ADMIN, item.title, item.id);
      emit();
      return item;
    },

    uploadGeneralDocumentStub(file, meta = {}) {
      const name = file?.name || "document.pdf";
      const base = name.replace(/\.[^.]+$/, "") || "Document";
      return api.addGeneralDocument({
        title: meta.title || base,
        description:
          meta.description ||
          `Uploaded PDF (demo): ${name}`,
        category: meta.category || "Operations",
      });
    },

    renameGeneralDocument(id, title) {
      const d = documents.find((x) => x.id === id);
      if (!d) return { ok: false };
      const next = String(title || "").trim();
      if (!next) return { ok: false, reason: "title_required" };
      d.title = next;
      d.updatedAt = nowStamp();
      log("document_renamed", DEMO_ADMIN, d.title, d.id);
      emit();
      return { ok: true };
    },

    updateGeneralDocument(id, patch = {}) {
      const d = documents.find((x) => x.id === id);
      if (!d) return { ok: false };
      if (patch.title != null) {
        const next = String(patch.title).trim();
        if (!next) return { ok: false, reason: "title_required" };
        d.title = next;
      }
      if (patch.description != null)
        d.description = String(patch.description).trim();
      if (patch.category != null)
        d.category = String(patch.category).trim() || d.category;
      d.updatedAt = nowStamp();
      log("document_updated", DEMO_ADMIN, d.title, d.id);
      emit();
      return { ok: true, item: d };
    },

    deleteGeneralDocument(id) {
      const d = documents.find((x) => x.id === id);
      if (!d) return { ok: false };
      if (d.seed) return { ok: false, reason: "seed_protected" };
      const idx = documents.findIndex((x) => x.id === id);
      if (idx < 0) return { ok: false };
      documents.splice(idx, 1);
      log("document_deleted", DEMO_ADMIN, d.title, d.id);
      emit();
      return { ok: true };
    },

    updateDriverPrefs(patch) {
      const d = api.getCurrentDriver();
      if (!d) return { ok: false };
      d.prefs = { ...(d.prefs || {}), ...patch };
      log(
        "notification_preferences_updated",
        DEMO_DRIVER,
        d.partnerId,
        Object.keys(patch).join(", "),
      );
      emit();
      return { ok: true };
    },

    canDriverUploadTourDocument(jobId) {
      const id =
        jobId != null && String(jobId).trim() ? String(jobId).trim() : "";
      if (!id) return { ok: false, reason: "job_required" };
      const j = api.getJob(id);
      if (!j) return { ok: false, reason: "bad_job" };
      if (j.status !== "performed")
        return { ok: false, reason: "job_not_performed" };
      const d = api.getCurrentDriver();
      if (!d) return { ok: false, reason: "no_driver" };
      if (j.driver && j.driver !== d.name)
        return { ok: false, reason: "not_assigned_driver" };
      return { ok: true, jobId: id };
    },

    addTourDocument(file, opts = {}) {
      if (!file) return { ok: false, reason: "no_file" };
      if (!isAllowedTourDocumentFile(file))
        return { ok: false, reason: "invalid_type" };
      if (!api.isCurrentDriverActive())
        return { ok: false, reason: "driver_restricted" };
      const gate = api.canDriverUploadTourDocument(opts.jobId);
      if (!gate.ok) return gate;
      const jobId = gate.jobId;
      const d = api.getCurrentDriver();
      const mime = (file.type || guessMimeFromName(file.name) || "").trim();
      const row = {
        id: `TD-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        jobId,
        driverId: d.id,
        driverName: d.name,
        fileName: file.name,
        mimeType: mime || "application/octet-stream",
        sizeBytes: typeof file.size === "number" ? file.size : 0,
        uploadedAt: new Date().toISOString(),
        documentType: normalizeTourDocumentType(opts.documentType),
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: opts.source || "driver",
        notes: opts.notes || "",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      };
      ensureTourDocumentShape(row);
      const priorCount = tourDocuments.filter((x) => x.jobId === jobId).length;
      tourDocuments.unshift(row);
      reconcileDocumentReviewSummary(jobId);
      const alertEvent =
        priorCount > 0 ? "tour_document_reuploaded" : "tour_document_uploaded";
      log(
        "tour_document_uploaded",
        d.name,
        row.fileName,
        `${jobId} · ${row.documentType}`,
      );
      queueAdminEmailAlert(alertEvent, jobId, row.documentType);
      emit();
      return { ok: true, id: row.id };
    },

    acceptTourDocument(id, opts = {}) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false, reason: "not_found" };
      if (normalizeTourDocumentReviewStatus(doc.reviewStatus) === "accepted")
        return { ok: true };
      const st = normalizeTourDocumentReviewStatus(doc.reviewStatus);
      if (st !== "uploaded") return { ok: false, reason: "not_pending" };
      const invNum = String(opts.supplierInvoiceNumber ?? "").trim();
      const invDate = String(opts.supplierInvoiceDate ?? "").trim();
      if (isTourBillingInvoiceType(doc.documentType) && !invNum)
        return { ok: false, reason: "invoice_number_required" };
      doc.reviewStatus = "accepted";
      doc.processed = true;
      doc.rejectionReason = "";
      if (isTourBillingInvoiceType(doc.documentType)) {
        doc.supplierInvoiceNumber = invNum;
        doc.supplierInvoiceDate = invDate;
      }
      reconcileDocumentReviewSummary(doc.jobId);
      reconcileJobInvoiceFromTourDocuments(doc.jobId);
      log(
        "tour_document_accepted",
        DEMO_ADMIN,
        doc.fileName,
        isTourBillingInvoiceType(doc.documentType) ? invNum : doc.documentType,
      );
      emit();
      return { ok: true };
    },

    updateTourDocument(id, patch) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false };
      const jobId = doc.jobId;
      if (patch.reviewStatus !== undefined) {
        const next = normalizeTourDocumentReviewStatus(patch.reviewStatus);
        if (next === "accepted")
          return { ok: false, reason: "use_accept_tour_document" };
        if (!DOC_REVIEW.includes(next)) return { ok: false, reason: "bad_status" };
        doc.reviewStatus = next;
        if (next !== "rejected" && next !== "correction_required")
          doc.rejectionReason = "";
      }
      if (patch.processed !== undefined) doc.processed = !!patch.processed;
      if (patch.documentType !== undefined)
        doc.documentType = normalizeTourDocumentType(patch.documentType);
      if (patch.notes !== undefined) doc.notes = String(patch.notes ?? "");
      if (patch.file !== undefined) {
        const file = patch.file;
        if (!file) return { ok: false, reason: "no_file" };
        if (!isAllowedTourDocumentFile(file))
          return { ok: false, reason: "invalid_type" };
        doc.fileName = file.name;
        doc.mimeType =
          (file.type || guessMimeFromName(file.name) || "").trim() ||
          "application/octet-stream";
        doc.sizeBytes = typeof file.size === "number" ? file.size : 0;
        doc.reviewStatus = "uploaded";
        doc.rejectionReason = "";
        doc.processed = false;
        doc.supplierInvoiceNumber = "";
        doc.supplierInvoiceDate = "";
      }
      if (patch.supplierInvoiceNumber !== undefined)
        doc.supplierInvoiceNumber = String(patch.supplierInvoiceNumber ?? "").trim();
      if (patch.supplierInvoiceDate !== undefined)
        doc.supplierInvoiceDate = String(patch.supplierInvoiceDate ?? "").trim();
      reconcileDocumentReviewSummary(jobId);
      reconcileJobInvoiceFromTourDocuments(jobId);
      log("tour_document_updated", DEMO_ADMIN, doc.fileName, doc.reviewStatus);
      emit();
      return { ok: true };
    },

    markTourDocumentChecked(id) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false };
      const st = normalizeTourDocumentReviewStatus(doc.reviewStatus);
      if (st !== "uploaded") return { ok: false, reason: "not_pending" };
      doc.checkedAt = nowStamp();
      doc.checkedBy = DEMO_ADMIN;
      log("tour_document_checked", DEMO_ADMIN, doc.fileName, doc.documentType);
      emit();
      return { ok: true };
    },

    rejectTourDocument(id, reason) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false };
      if (doc.reviewStatus === "accepted")
        return { ok: false, reason: "already_accepted" };
      const st = normalizeTourDocumentReviewStatus(doc.reviewStatus);
      if (st !== "uploaded") return { ok: false, reason: "not_pending" };
      doc.reviewStatus = "rejected";
      doc.rejectionReason = reason || "";
      doc.processed = false;
      reconcileDocumentReviewSummary(doc.jobId);
      reconcileJobInvoiceFromTourDocuments(doc.jobId);
      log(
        "tour_document_rejected",
        DEMO_ADMIN,
        doc.fileName,
        doc.rejectionReason,
      );
      queueAdminEmailAlert(
        "tour_document_rejected",
        doc.jobId,
        doc.rejectionReason,
      );
      const jn = api.getJob(doc.jobId);
      pushDriverNotification({
        type: "document_rejected",
        jobId: doc.jobId,
        tour: jn?.tour || "",
        title: "Document rejected",
        body: doc.rejectionReason || "",
        driverId: doc.driverId,
      });
      emit();
      return { ok: true };
    },

    requireTourDocumentCorrection(id) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false };
      const st = normalizeTourDocumentReviewStatus(doc.reviewStatus);
      if (st !== "rejected") return { ok: false, reason: "not_rejected" };
      doc.reviewStatus = "correction_required";
      doc.processed = false;
      reconcileDocumentReviewSummary(doc.jobId);
      reconcileJobInvoiceFromTourDocuments(doc.jobId);
      log(
        "tour_document_correction_required",
        DEMO_ADMIN,
        doc.fileName,
        doc.rejectionReason,
      );
      queueAdminEmailAlert(
        "tour_document_rejected",
        doc.jobId,
        doc.rejectionReason,
      );
      emit();
      return { ok: true };
    },

    replaceTourDocument(id, file, opts = {}) {
      if (!file) return { ok: false, reason: "no_file" };
      if (!isAllowedTourDocumentFile(file))
        return { ok: false, reason: "invalid_type" };
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false, reason: "not_found" };
      const jobId = doc.jobId;
      const j = api.getJob(jobId);
      if (!j || j.status !== "performed")
        return { ok: false, reason: "job_not_performed" };
      const actor = opts.actor || "driver";
      if (actor === "driver") {
        if (!api.isCurrentDriverActive())
          return { ok: false, reason: "driver_restricted" };
        const d = api.getCurrentDriver();
        if (!d) return { ok: false, reason: "no_driver" };
        if (j.driver && j.driver !== d.name)
          return { ok: false, reason: "not_assigned_driver" };
        if (doc.driverId && doc.driverId !== d.id)
          return { ok: false, reason: "not_owner" };
      }
      const st = normalizeTourDocumentReviewStatus(doc.reviewStatus);
      const replaceable = ["rejected", "correction_required", "uploaded"];
      if (!replaceable.includes(st))
        return { ok: false, reason: "not_replaceable" };
      doc.fileName = file.name;
      doc.mimeType =
        (file.type || guessMimeFromName(file.name) || "").trim() ||
        "application/octet-stream";
      doc.sizeBytes = typeof file.size === "number" ? file.size : 0;
      doc.uploadedAt = new Date().toISOString();
      doc.reviewStatus = "uploaded";
      doc.rejectionReason = "";
      doc.processed = false;
      doc.supplierInvoiceNumber = "";
      doc.supplierInvoiceDate = "";
      if (opts.documentType)
        doc.documentType = normalizeTourDocumentType(opts.documentType);
      reconcileDocumentReviewSummary(jobId);
      reconcileJobInvoiceFromTourDocuments(jobId);
      const who = actor === "driver" ? api.getCurrentDriver()?.name || DEMO_DRIVER : DEMO_ADMIN;
      log(
        "tour_document_replaced",
        who,
        doc.fileName,
        `${jobId} · ${doc.documentType}`,
      );
      queueAdminEmailAlert("tour_document_uploaded", jobId, "replacement upload");
      emit();
      return { ok: true, id: doc.id };
    },

    getTourDocuments: () => tourDocuments.slice(),

    getTourDocumentsForJob(jobId) {
      if (!jobId) return [];
      return tourDocuments.filter((x) => x.jobId === jobId);
    },

    registerTourDocumentAdmin(opts = {}) {
      const jobRaw =
        opts.jobId != null && String(opts.jobId).trim()
          ? String(opts.jobId).trim()
          : "";
      if (!jobRaw || !api.getJob(jobRaw))
        return { ok: false, reason: "bad_job" };
      const driverRaw =
        opts.driverId != null && String(opts.driverId).trim()
          ? String(opts.driverId).trim()
          : "";
      const d = drivers.find((x) => x.id === driverRaw);
      if (!d) return { ok: false, reason: "bad_driver" };
      const file = opts.file;
      if (!file) return { ok: false, reason: "no_file" };
      if (!isAllowedTourDocumentFile(file))
        return { ok: false, reason: "invalid_type" };
      const mime =
        (file.type || guessMimeFromName(file.name) || "").trim() ||
        "application/octet-stream";
      const row = {
        id: `TD-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        jobId: jobRaw,
        driverId: d.id,
        driverName: d.name,
        fileName: file.name,
        mimeType: mime,
        sizeBytes: typeof file.size === "number" ? file.size : 0,
        uploadedAt: new Date().toISOString(),
        documentType: normalizeTourDocumentType(opts.documentType),
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "admin",
        notes: String(opts.notes || "").trim(),
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      };
      ensureTourDocumentShape(row);
      tourDocuments.unshift(row);
      reconcileDocumentReviewSummary(jobRaw);
      reconcileJobInvoiceFromTourDocuments(jobRaw);
      log(
        "tour_document_admin_registered",
        DEMO_ADMIN,
        row.fileName,
        `${jobRaw} · ${row.documentType}`,
      );
      queueAdminEmailAlert("tour_document_uploaded", jobRaw, row.documentType);
      emit();
      return { ok: true, id: row.id };
    },

    downloadTourDocumentPlaceholder(id) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false };
      const raw =
        (doc.fileName || "document").replace(/[^a-zA-Z0-9._-]/g, "_") ||
        "document";
      const stubName = /\.txt$/i.test(raw)
        ? raw
        : `${raw.replace(/\.[^.]+$/, "")}-placeholder.txt`;
      const body = [
        `${api.getAppDisplayName()} prototype — binary file not stored.`,
        `Source: ${doc.source === "admin" ? "admin off-channel" : "driver PWA"}`,
        `Type: ${doc.documentType}`,
        `Original filename: ${doc.fileName}`,
        `MIME: ${doc.mimeType}`,
        `Uploaded (ISO): ${doc.uploadedAt}`,
        `Driver: ${doc.driverName} (${doc.driverId})`,
        `Job ID: ${doc.jobId}`,
        `Review: ${doc.reviewStatus}`,
        doc.rejectionReason ? `Rejection: ${doc.rejectionReason}` : "",
        doc.notes ? `Notes: ${doc.notes}` : "",
        "",
        "Placeholder replaces an actual PDF/image in the demo.",
      ]
        .filter(Boolean)
        .join("\r\n");
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = stubName;
      a.click();
      URL.revokeObjectURL(url);
      return { ok: true };
    },

    updateFinancial(id, patch = {}) {
      const j = api.getJob(id);
      if (!j) return { ok: false, reason: "bad_job" };
      if (
        patch.invoiceReceived !== undefined ||
        patch.invoiceNumber !== undefined
      ) {
        return { ok: false, reason: "use_tour_documents" };
      }
      const allowed = [
        "revenue",
        "driverCompensation",
        "expenses",
        "netAmount",
        "grossAmount",
        "vatRate",
        "paymentStatus",
      ];
      for (const key of allowed) {
        if (patch[key] === undefined) continue;
        if (key === "paymentStatus") {
          j.paymentStatus = normalizePaymentStatus(patch.paymentStatus);
        } else {
          j[key] = patch[key];
        }
      }
      syncDisplayFields(j);
      log(
        "financial_updated",
        DEMO_ADMIN,
        j.tour,
        "Ledger fields updated (invoice via tour documents)",
      );
      emit();
      return { ok: true };
    },

    exportJobsCsv() {
      const cols = [
        { header: "tour", key: "tour" },
        { header: "orderingPartyName", key: "orderingPartyName" },
        { header: "startCompany", key: "startCompany" },
        { header: "startPlz", key: "startPlz" },
        { header: "startCity", key: "startCity" },
        { header: "endCompany", key: "endCompany" },
        { header: "endPlz", key: "endPlz" },
        { header: "endCity", key: "endCity" },
        { header: "date", key: "date" },
        { header: "windowFrom", key: "windowFrom" },
        { header: "windowTo", key: "windowTo" },
        { header: "driver", key: "driver" },
        { header: "status", key: "status" },
        { header: "vehicle", key: "vehicle" },
        { header: "vehicleModel", key: "vehicleModel" },
        { header: "axle", key: "axle" },
        { header: "distanceKm", key: "distanceKm" },
        { header: "documentReviewSummary", key: "documentReviewSummary" },
        { header: "settlementState", key: "settlementState" },
        { header: "revenue", key: "revenue" },
        { header: "grossAmount", key: "grossAmount" },
        { header: "netAmount", key: "netAmount" },
        { header: "partnerOffer", key: "driverCompensation" },
        { header: "expenses", key: "expenses" },
        { header: "invoiceReceived", key: "invoiceReceived" },
        { header: "invoiceNumber", key: "invoiceNumber" },
        { header: "paymentStatus", key: "paymentStatus" },
        { header: "notes", key: "notes" },
      ];
      const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const rows = [cols.map((c) => c.header).join(",")].concat(
        jobs.map((j) => cols.map((c) => esc(j[c.key])).join(",")),
      );
      log(
        "jobs_exported",
        DEMO_ADMIN,
        "CSV export",
        `${jobs.length} rows`,
      );
      emit();
      return rows.join("\n");
    },

    exportAuditLogCsv() {
      const cols = ["at", "action", "actor", "entity", "meta"];
      const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const list = api.getAuditLog();
      const rows = [cols.join(",")].concat(
        list.map((a) => cols.map((c) => esc(a[c])).join(",")),
      );
      log(
        "audit_log_exported",
        DEMO_ADMIN,
        "CSV",
        `${list.length} rows`,
      );
      emit();
      return rows.join("\n");
    },

    transportOrderText(id) {
      const j = api.getJob(id);
      if (!j) return "";
      const appName = api.getAppDisplayName();
      const pu = j.pickup || mkLocation();
      const del = j.delivery || mkLocation();
      return [
        `${appName.toUpperCase()} TRANSPORT ORDER`,
        `Tour: ${j.tour}`,
        `Category: ${j.category}`,
        `Issued: ${nowStamp()}`,
        `Driver: ${j.driver || "To be assigned"}`,
        `Ordering party: ${j.orderingPartyName}`,
        `Pickup: ${pu.name}, ${formatStreet(pu)}, ${pu.postalCode} ${pu.city}`,
        `Pickup contact: ${pu.contactPerson} ${pu.phone}`,
        `Pickup schedule: ${pu.date} ${pu.windowFrom}-${pu.windowTo}`,
        `Delivery: ${del.name}, ${formatStreet(del)}, ${del.postalCode} ${del.city}`,
        `Delivery contact: ${del.contactPerson} ${del.phone}`,
        `Delivery schedule: ${del.date} ${del.windowFrom}-${del.windowTo}`,
        `Vehicle: ${j.vehicleModel} / ${j.vehicle}`,
        `License plate: ${j.plate}`,
        `VIN: ${j.vin}`,
        `Axle: ${j.axle}`,
        `Distance: ${j.distanceKm} km`,
        `Partner offer: ${j.driverCompensation ?? "—"} | Customer gross: ${j.grossAmount ?? j.revenue ?? "—"} | Net: ${j.netAmount ?? "—"} VAT: ${j.vatRate ?? 19}%`,
        `Document review: ${j.documentReviewSummary}`,
        `Settlement: ${j.settlementState}`,
        "Instructions: pre-trip inspection, direct route, incident reporting, digital proof submission, safety clothing on logistics yards.",
        "Legal wording subject to final production review.",
      ].join("\n");
    },

    viewPdf(id) {
      const txt = api.transportOrderText(id);
      if (!txt) return { ok: false };
      const escaped = txt.replace(
        /[&<>]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
      );
      const appName = api.getAppDisplayName();
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${appName} transport order</title></head><body><pre style="font:13px/1.5 monospace;white-space:pre-wrap;padding:24px">${escaped}</pre></body></html>`;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        w.addEventListener("load", () => URL.revokeObjectURL(url), {
          once: true,
        });
      } else {
        URL.revokeObjectURL(url);
      }
      log("pdf_viewed", DEMO_ADMIN, id, "Client-side transport order preview");
      emit();
      return { ok: true };
    },

    downloadPdf(id) {
      const txt = api.transportOrderText(id);
      const j = api.getJob(id);
      if (!txt || !j) return { ok: false };
      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transport-order-${j.id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      log(
        "pdf_downloaded",
        DEMO_ADMIN,
        j.tour,
        "Client-side generated transport order",
      );
      emit();
      return { ok: true };
    },

    reloadDemo() {
      orderingParties = seedOrderingParties();
      addresses = seedAddresses();
      documents = seedDocuments();
      newsItems = seedNews();
      jobs = seedJobs();
      drivers = seedDrivers().map((d) => ({
        ...d,
        prefs: normalizeDriverPrefs(d.prefs),
      }));
      admins = seedAdmins();
      auditLog = seedAudit();
      driverState = seedDriverState();
      tourDocuments = seedTourDocuments();
      for (const doc of tourDocuments) {
        doc.documentType = normalizeTourDocumentType(doc.documentType);
        doc.reviewStatus = normalizeTourDocumentReviewStatus(doc.reviewStatus);
        ensureTourDocumentShape(doc);
      }
      driverNotifications = seedDriverNotifications();
      adminEmailQueue = seedAdminEmailQueue();
      for (const j of jobs) {
        j.paymentStatus = normalizePaymentStatus(j.paymentStatus);
        reconcileDocumentReviewSummary(j.id);
        reconcileJobInvoiceFromTourDocuments(j.id);
      }
      validateSeedData(jobs, orderingParties, tourDocuments, driverState);
      nextTourSeq = 849;
      branding.appDisplayName =
        window.AUTHEON_BRANDING_DEFAULTS?.appDisplayName || "Transport Portal";
      const reloadFlags = window.AUTHEON_FLAG_DEFAULTS || {};
      const { appDisplayName: _n, ...reloadOnlyFlags } = reloadFlags;
      Object.assign(featureFlags, {
        financeModule: false,
        ...reloadOnlyFlags,
      });
      log("demo_reloaded", "System", "Transport Portal", "PRD v1.6 seed");
      emit();
      return { ok: true };
    },

    getFeatureFlag: (key) => featureFlags[key],
    getFeatureFlags: () => ({ ...featureFlags }),
    setFeatureFlag(key, value) {
      if (key === "appDisplayName") {
        return api.setAppDisplayName(value);
      }
      featureFlags[key] = !!value;
      log("feature_flag_changed", DEMO_ADMIN, key, String(value));
      emit();
      return { ok: true };
    },

    subscribe,
  };

  jobs.forEach(syncDisplayFields);

  return api;
})();

window.useAuthStore = function () {
  const [, setT] = React.useState(0);
  React.useEffect(
    () => window.AuthStore.subscribe(() => setT((t) => t + 1)),
    [],
  );
  return window.AuthStore;
};
