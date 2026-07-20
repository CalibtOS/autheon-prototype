// AUTHEON — Shared store (PRD v1.8 prototype). Target spec: docs/requirements/prd.json
// Domain glossary: DOMAIN.md
// Single source of truth for Driver + Admin views.
// Operational statuses: draft, published, assigned, accepted, performed, cancelled, special_case.
// pickup/delivery/customerName are canonical; syncDisplayFields() denormalizes flat fields for tables/CSV.

window.AuthStore = (() => {
  const listeners = new Set();
  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  const emit = () => listeners.forEach((fn) => fn());

  const DEMO_DRIVER = "Jordan Blake";
  const DEMO_ADMIN = "Anna Bauer";

  // Seeded real 2-page PDF served by every in-app document view/download —
  // stands in for the production file stream (see driver DocumentPreviewSheet).
  const SAMPLE_PDF_URL = "assets/transport-order-sample.pdf";
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

  const ACTIVE_JOB_STATUSES = ["assigned", "accepted", "special_case"];

  function normalizeTourDocumentReviewStatus(st) {
    const s = String(st || "").trim();
    if (DOC_REVIEW.includes(s)) return s;
    return "uploaded";
  }

  function tourDocumentNeedsDriverCorrection(reviewStatus) {
    return (
      normalizeTourDocumentReviewStatus(reviewStatus) === "correction_required"
    );
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

  function isOfficialTourDocumentSource(source) {
    const s = String(source || "")
      .trim()
      .toLowerCase();
    return (
      s === "admin_off_channel" || s === "admin" || s === "generated"
    );
  }

  function isDriverTourDocumentSource(source) {
    const s = String(source || "")
      .trim()
      .toLowerCase();
    return s === "driver" || s === "driver_pwa";
  }

  function canDriverReplaceTourDocument(doc) {
    if (!doc || isOfficialTourDocumentSource(doc.source)) return false;
    if (!isDriverTourDocumentSource(doc.source)) return false;
    const st = normalizeTourDocumentReviewStatus(doc.reviewStatus);
    return ["uploaded", "rejected", "correction_required"].includes(st);
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
      customerId: "",
      customerName: "",
      pickup: mkLocation(),
      delivery: mkLocation(),
      distanceKm: 0,
      vehicle: "",
      vehicleModel: "",
      plate: "",
      vin: "",
      axle: AXLE_OWN,
      // Important vehicle info (Design Direction Board §5 — optional metadata;
      // PRD decision on required V1 persistence still open)
      registrationStatus: null, // "registered" | "deregistered" | null
      electricVehicle: false,
      redPlates: false,
      // German red transfer plate no. (§16 FZV, dealer "06" series) — belongs
      // to the operator, not the vehicle; captured per tour when redPlates=true
      redPlateNumber: "",

      revenue: null,
      driverOffer: null,
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

  function driverOfferAmount(job) {
    if (!job) return 0;
    const n = job.driverOffer;
    if (n == null || n === "") return 0;
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  }

  /** Copy structured pickup/delivery/customer data into flat fields for tables and CSV. */
  function syncDisplayFields(job) {
    if (!job) return job;
    const pu = job.pickup || mkLocation();
    const del = job.delivery || mkLocation();
    job.customer = job.customerName || job.customer || "";
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

  function seedCustomers() {
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
        title: "Driver terms",
        description: "Driver terms and general conditions.",
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
        description:
          "Action instructions for vehicle pickup at customer sites.",
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
        description:
          "How to submit fuel receipts and billing invoices after performed tours.",
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
        description:
          "When and how to use Report Problem; contact dispatch for special cases.",
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
        body: "Dear service partners,\n\nOn Monday, 01.01.2027, there may be isolated warning strikes in public transport. Please check in good time whether your area in Germany is affected.\n\nThank you for your attention and safe travels.",
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
    const byAddr = Object.fromEntries(seedAddresses().map((a) => [a.id, a]));
    const loc = (id, schedule) => locationFromAddress(byAddr[id], schedule);

    return [
      mk({
        id: "A-2026-00847",
        tour: "0847-26",
        customerId: "OP-001",
        customerName: "Muller Automobile GmbH",
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
        vehicle: "SUV",
        vehicleModel: "VW Tiguan 2.0 TDI",
        plate: "M-AB 1234",
        vin: "WVGZZZ5NZKW123456",
        axle: AXLE_OWN,
        registrationStatus: "registered",

        revenue: 340,
        netAmount: 285.71,
        grossAmount: 340,
        driverOffer: 260,
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
        customerId: "OP-003",
        customerName: "Nord-Flotte GmbH",
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
        vehicle: "PKW",
        vehicleModel: "Skoda Superb",
        plate: "HB-NF 848",
        vin: "TMBJH7NP8P0123848",
        axle: AXLE_OWN,
        registrationStatus: "registered",
        electricVehicle: true,

        revenue: 185,
        driverOffer: 145,
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
        customerId: "OP-002",
        customerName: "Classic Cars AG",
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
        vehicle: "PKW",
        vehicleModel: "BMW 3 Touring",
        plate: "S-CC 220",
        vin: "WBA8E1100K5J12345",
        axle: AXLE_THIRD,

        revenue: 220,
        driverOffer: 175,
        notes:
          "Historic vehicle on third-party axle; yard access issue reported by driver.",
        notesDriver:
          "Do not attempt pickup until dispatch confirms yard reopening.",
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
          evidence: [
            {
              id: "SCE-SEED-001",
              fileName: "yard-closed-photo-0846.jpg",
              mimeType: "image/jpeg",
              sizeBytes: 890400,
              uploadedAt: "2026-04-23T08:38:00.000Z",
            },
          ],
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
        customerId: "OP-004",
        customerName: "AutoLogistik KG",
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
        vehicle: "PKW",
        vehicleModel: "Audi A4",
        plate: "K-AL 845",
        vin: "WAUZZZ4M5KA000001",
        axle: AXLE_THIRD,

        revenue: 145,
        driverOffer: 110,
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
        customerId: "OP-001",
        customerName: "Muller Automobile GmbH",
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
        vehicle: "PKW",
        vehicleModel: "VW Polo",
        plate: "",
        vin: "WVWZZZ6RZKY098765",
        axle: AXLE_THIRD,
        registrationStatus: "deregistered",
        redPlates: true,
        redPlateNumber: "HH-06 2440",
        driverOffer: 165,
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
        customerId: "OP-002",
        customerName: "Classic Cars AG",
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
        vehicle: "Van",
        vehicleModel: "Mercedes Sprinter",
        plate: "S-CC 130",
        vin: "WDB9067321V123987",
        axle: AXLE_OWN,
        driverOffer: 280,
        revenue: 310,
        notesDriver:
          "Sprinter — check height clearance at Marienplatz delivery.",
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
        customerId: "OP-003",
        customerName: "Nord-Flotte GmbH",
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
        vehicle: "PKW",
        vehicleModel: "Skoda Octavia",
        plate: "HH-NF 42",
        vin: "TMBJG7NE7K0123456",
        axle: AXLE_THIRD,
        driverOffer: 110,
        revenue: 135,
        grossAmount: 135,
        expenses: 18,
        notes: "Completed Hamburg depot → Bremen hub.",
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
        customerId: "OP-005",
        customerName: "Muller & Sohn KG",
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
        vehicle: "SUV",
        vehicleModel: "Ford Kuga",
        plate: "B-MS 200",
        vin: "WF0AXXTTGA000111",
        axle: AXLE_OWN,
        driverOffer: 195,
        revenue: 240,
        notes:
          "Cancelled after driver Report Problem — customer withdrew slot.",
        status: "cancelled",
        cancellationActor: "customer",
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
        customerId: "OP-002",
        customerName: "Classic Cars AG",
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
        vehicle: "PKW",
        vehicleModel: "Audi Q3",
        plate: "D-CC 80",
        vin: "WAUZZZF38K1234567",
        axle: AXLE_OWN,
        driverOffer: 110,
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
        customerId: "OP-004",
        customerName: "AutoLogistik KG",
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
        vehicle: "PKW",
        vehicleModel: "Audi A6",
        plate: "B-AL 60",
        vin: "WAUZZZ4G9KN123456",
        axle: AXLE_OWN,
        driverOffer: 365,
        revenue: 420,
        notes:
          "Long-haul draft Berlin hub to Stuttgart; verify night gate access.",
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
        driverCode: "AU-41-0228",
        address: "Landsberger Str. 22, 80339 Munchen",
        email: "jordan.blake@example.com",
        emailVerified: true,
        pendingEmailChange: null,
        phone: "+49 170 4400228",
        notes: "",
        status: "Active",
        accessState: ACCESS_STATE.ACTIVE,
        probationJobLimit: 3,
        probationClearedAt: null,
        prefs: {
          postalAreas: ["80"],
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
        driverCode: "AU-41-0301",
        address: "Hanauer Landstr. 12, 60314 Frankfurt",
        email: "k.neumann@example.com",
        phone: "+49 172 3300301",
        notes: "",
        status: "Active",
        accessState: ACCESS_STATE.ACTIVE,
        probationJobLimit: 3,
        probationClearedAt: "01.04.2026 10:00",
        prefs: {
          postalAreas: ["60"],
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
        driverCode: "AU-41-0177",
        address: "Kantstr. 18, 10623 Berlin",
        email: "mira.vogt@example.com",
        phone: "+49 171 991177",
        notes: "",
        status: "Blocked",
        accessState: ACCESS_STATE.ACTIVE,
        probationJobLimit: 3,
        probationClearedAt: null,
        prefs: {
          postalAreas: ["10"],
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
        accessState: ACCESS_STATE.ACTIVE,
      },
      {
        id: "ADM-002",
        name: "Lukas Reimann",
        email: "lukas.reimann@autheon.example",
        status: "Active",
        accessState: ACCESS_STATE.ACTIVE,
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
        id: "TD-SEED-ACTIVE-001",
        jobId: "A-2026-00845",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "pickup-proof-0845.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 156000,
        uploadedAt: "2026-04-23T07:15:00.000Z",
        documentType: "other_proof",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "driver",
        notes: "Pre-completion upload on active tour (v1.8).",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-ADMIN-0845",
        jobId: "A-2026-00845",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "vehicle-photo-0845.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 204800,
        uploadedAt: "2026-04-22T16:30:00.000Z",
        documentType: "other_proof",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "admin_off_channel",
        notes: "Dispatch reference photo attached at job creation.",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-001",
        jobId: "A-2026-00842",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "driver-invoice-0842.pdf",
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
        jobId: "A-2026-00842",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "fuel-receipt-0842.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 198400,
        uploadedAt: "2026-04-21T14:05:00.000Z",
        documentType: "fuel_receipt",
        reviewStatus: "rejected",
        rejectionReason: "Registration number missing on fuel receipt.",
        processed: false,
        source: "driver",
        notes: "",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-004",
        jobId: "A-2026-00842",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "toll-receipt-0842.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 156000,
        uploadedAt: "2026-04-21T15:10:00.000Z",
        documentType: "toll_receipt",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "driver",
        notes: "",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-005",
        jobId: "A-2026-00842",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "driver-invoice-0842-v1-rejected.pdf",
        mimeType: "application/pdf",
        sizeBytes: 241000,
        uploadedAt: "2026-04-21T12:40:00.000Z",
        documentType: "invoice",
        reviewStatus: "rejected",
        rejectionReason:
          "Supplier invoice number missing — please re-upload with correct reference.",
        processed: false,
        source: "driver",
        notes: "First billing invoice attempt.",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
      },
      {
        id: "TD-SEED-006",
        jobId: "A-2026-00842",
        driverId: "DRV-0228",
        driverName: DEMO_DRIVER,
        fileName: "waiting-time-0842.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 302400,
        uploadedAt: "2026-04-21T12:54:00.000Z",
        documentType: "waiting_time_evidence",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "driver",
        notes: "Hub waiting time at Bremen delivery.",
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
        meta: "Report Problem: not performable — yard closed · 1 file(s)",
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
        entity: "driver-invoice-0842.pdf",
        at: "21.04. 12:52",
        meta: "A-2026-00842 · invoice",
      },
    ];
  }

  let customers = seedCustomers();
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

  function isValidEmail(value) {
    const email = String(value || "").trim();
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const ACCESS_STATE = {
    INVITE_PENDING: "Invite pending",
    ACTIVE: "Active",
    INVITE_FAILED: "Invite failed",
  };

  function simulateAccountInvite(user, kind) {
    user.accessState = ACCESS_STATE.INVITE_PENDING;
    user.lastInviteAt = nowStamp();
    user.identityProvisioned = true;
    user.inviteEmailSent = true;
    user.inviteFailureReason = "";
    log("user_access_invite_sent", DEMO_ADMIN, user.name || user.email, kind);
    return {
      identityProvisioned: true,
      inviteEmailSent: true,
    };
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
      if (!j.customerId || !partyIds.has(j.customerId)) {
        issues.push(`${j.id}: invalid customerId`);
      } else if (
        partyNames[j.customerId] &&
        j.customerName &&
        j.customerName !== partyNames[j.customerId]
      ) {
        issues.push(
          `${j.id}: customerName mismatch (${j.customerName} vs ${partyNames[j.customerId]})`,
        );
      }
      for (const side of ["pickup", "delivery"]) {
        const loc = j[side];
        if (!loc?.contactPerson?.trim() || !loc?.phone?.trim()) {
          issues.push(`${j.id}:${side}: contact`);
        }
        if (
          !loc?.street?.trim() ||
          !loc?.city?.trim() ||
          !loc?.postalCode?.trim()
        ) {
          issues.push(`${j.id}:${side}: address`);
        }
        if (!loc?.date?.trim() && !loc?.windowFlex) {
          issues.push(`${j.id}:${side}: schedule`);
        }
      }
      // Deregistered vehicles have no regular plate; a red transfer plate
      // number may stand in (§16 FZV). VIN is always required.
      const plateOk =
        j.registrationStatus === "deregistered"
          ? true
          : !!j.plate?.trim();
      if (!plateOk || !j.vin?.trim())
        issues.push(`${j.id}: vehicle ids`);
      if (!j.vehicle?.trim() || !j.vehicleModel?.trim()) {
        issues.push(`${j.id}: vehicle`);
      }
      if (!(j.distanceKm > 0)) issues.push(`${j.id}: distanceKm`);
      if (j.driverOffer == null || j.driverOffer === "") {
        issues.push(`${j.id}: driverOffer`);
      }
      if (!j.history?.length) issues.push(`${j.id}: history`);
      if (!j.pickup?.date) issues.push(`${j.id}: pickup.date`);
      if (!j.delivery?.date) issues.push(`${j.id}: delivery.date`);
      if (
        j.status !== "draft" &&
        !(j.pdfVersion > 0) &&
        j.status !== "published"
      ) {
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
      if (j && !uploadAllowedStatuses().includes(j.status)) {
        issues.push(
          `${d.id}: document on job ${j.id} with status ${j.status} (allowed: ${uploadAllowedStatuses().join(", ")})`,
        );
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
  let masterDataChangeRequests = [];

  for (const j of jobs) {
    j.paymentStatus = normalizePaymentStatus(j.paymentStatus);
    reconcileDocumentReviewSummary(j.id);
    reconcileJobInvoiceFromTourDocuments(j.id);
  }

  validateSeedData(jobs, customers, tourDocuments, driverState);
  let nextTourSeq = 849;

  const legacyFlagDefaults = window.AUTHEON_FLAG_DEFAULTS || {};
  const branding = {
    appDisplayName:
      window.AUTHEON_BRANDING_DEFAULTS?.appDisplayName ||
      legacyFlagDefaults.appDisplayName ||
      "Transport Portal",
  };
  const driverSupportContact = {
    phone:
      window.AUTHEON_SUPPORT_DEFAULTS?.phone || "+49 30 1234 5678",
    email:
      window.AUTHEON_SUPPORT_DEFAULTS?.email || "support@autheon.example",
  };
  const { appDisplayName: _legacyName, ...flagDefaults } = legacyFlagDefaults;
  const featureFlags = {
    financeModule: false,
    ...flagDefaults,
  };

  const CANCELLATION_REASON_CODES = [
    "driver_unavailable",
    "vehicle_not_available",
    "customer_cancelled",
    "appointment_not_possible",
    "incorrect_order_data",
    "vehicle_not_roadworthy",
    "other",
  ];

  const CANCELLATION_REASON_LABELS = {
    driver_unavailable: "Driver unavailable",
    vehicle_not_available: "Vehicle not available",
    customer_cancelled: "Customer cancelled order",
    appointment_not_possible: "Appointment no longer possible",
    incorrect_order_data: "Incorrect order data",
    vehicle_not_roadworthy: "Vehicle not roadworthy",
    other: "Other reason",
  };

  const operationalPolicies = {
    adminCancelMinHoursBeforePickupStart: 1,
    scheduleChangeMinHoursBeforePickupStart: 1,
    referenceTime: "pickup_window_start",
    allowPolicyOverrideWithAuditNote: true,
  };

  const cancellationPolicies = {
    adminCancelRequiresReasonCode: true,
    adminCancelRequiresDriverMessage: true,
    adminCancelDriverMessageMinChars: 20,
    driverCancelExplanationMinChars: 10,
  };

  const driverAcceptanceDefaults = {
    probationJobCount: 3,
  };

  function cancellationReasonLabel(code) {
    return CANCELLATION_REASON_LABELS[code] || code || "";
  }

  function parseLocationDateTime(loc) {
    if (!loc) return null;
    const dl = String(loc.dateLong || "");
    const m = dl.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!m) return null;
    const wf = String(loc.windowFrom || "00:00").match(/^(\d{1,2}):(\d{2})/);
    const h = wf ? +wf[1] : 0;
    const min = wf ? +wf[2] : 0;
    return new Date(+m[3], +m[2] - 1, +m[1], h, min, 0);
  }

  function hoursUntilPickupStart(job, at = new Date()) {
    const start = parseLocationDateTime(job?.pickup);
    if (!start || Number.isNaN(start.getTime())) return Infinity;
    return (start.getTime() - at.getTime()) / 3600000;
  }

  function pickupCalendarKey(loc) {
    const dl = String(loc?.dateLong || loc?.date || "");
    const m = dl.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = String(loc?.date || "").match(/(\d{2})\.(\d{2})/);
    if (d) return `2026-${d[2]}-${d[1]}`;
    return "";
  }

  function jobDriverRecord(job) {
    if (!job) return null;
    if (job.driverId) return drivers.find((d) => d.id === job.driverId) || null;
    if (job.driver)
      return drivers.find((d) => d.name === job.driver) || null;
    return null;
  }

  function driverProbationActiveCount(driverId) {
    if (!driverId) return 0;
    return jobs.filter((j) => {
      if (!ACTIVE_JOB_STATUSES.includes(j.status)) return false;
      const dr = jobDriverRecord(j);
      return dr && dr.id === driverId;
    }).length;
  }

  function driverProbationPerformedCount(driverId) {
    if (!driverId) return 0;
    return jobs.filter((j) => {
      if (j.status !== "performed") return false;
      const dr = jobDriverRecord(j);
      return dr && dr.id === driverId;
    }).length;
  }

  function driverProbationTakenCount(driverId) {
    return (
      driverProbationActiveCount(driverId) +
      driverProbationPerformedCount(driverId)
    );
  }

  function maybeAutoReleaseProbation(driver) {
    if (!driver || driver.probationClearedAt) return false;
    const limit =
      driver.probationJobLimit ??
      driverAcceptanceDefaults.probationJobCount ??
      3;
    const performed = driverProbationPerformedCount(driver.id);
    if (performed < limit) return false;
    driver.probationClearedAt = nowStamp();
    log(
      "driver_probation_released",
      DEMO_ADMIN,
      driver.name,
      `automatic · ${performed}/${limit} Performed · ${driver.driverCode || driver.id}`,
    );
    return true;
  }

  function nextDriverCode() {
    let max = 0;
    for (const d of drivers) {
      const m = String(d.driverCode || "").match(/^AU-41-(\d+)$/i);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `AU-41-${String(max + 1).padStart(4, "0")}`;
  }

  function driverHasSameDayActiveJob(driverId, job, excludeId) {
    const day = pickupCalendarKey(job?.pickup);
    if (!driverId || !day) return false;
    return jobs.some((j) => {
      if (j.id === excludeId) return false;
      if (!["accepted", "assigned", "special_case"].includes(j.status))
        return false;
      const dr = jobDriverRecord(j);
      if (!dr || dr.id !== driverId) return false;
      return pickupCalendarKey(j.pickup) === day;
    });
  }

  function uploadAllowedStatuses() {
    return ["assigned", "accepted", "special_case", "performed"];
  }

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

  function jobLikeFromForm(form) {
    return {
      pickup: {
        postalCode: String(form.startPlz || form.pickup?.postalCode || "").trim(),
      },
      delivery: {
        postalCode: String(form.endPlz || form.delivery?.postalCode || "").trim(),
      },
    };
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
      // postalAreas replaces single notifyPostalPrefix — supports multi-area subscriptions
      postalAreas: Array.isArray(p.postalAreas)
        ? p.postalAreas.map(String).filter(Boolean)
        : String(p.notifyPostalPrefix || p.startPlz || "").trim()
          ? [String(p.notifyPostalPrefix || p.startPlz || "").trim()]
          : [],
      push: legacyPush,
    };
  }

  function postalAreaMatches(job, areas) {
    if (!areas || !areas.length) return true;
    const plz = String(job.pickup?.postalCode || job.startPlz || "");
    return areas.some((area) => {
      const p = String(area || "").replace(/\D/g, "");
      if (!p.length) return true;
      return plz.startsWith(p.length >= 2 ? p.slice(0, 2) : p.slice(0, 1));
    });
  }

  function maybeNotifyPublishedJob(job) {
    if (!job || job.status !== "published") return;
    const notified = [];
    for (const d of drivers) {
      if (d.status !== "Active") continue;
      const prefs = normalizeDriverPrefs(d.prefs);
      if (!prefs.pushEnabled || !prefs.notifyNewPublished) continue;
      if (
        prefs.postalAreas.length &&
        !postalAreaMatches(job, prefs.postalAreas)
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
      (d) => d.jobId === jobId && isTourBillingInvoiceType(d.documentType),
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
      locationId:
        flat.locationId ||
        form[cap("locationId")] ||
        form[`${p}LocationId`] ||
        null,
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
      country:
        flat.country || form[cap("country")] || form[`${p}Country`] || "DE",
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
      customerId: job.customerId || "",
      customer: job.customerName || job.customer || "",
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
          : "",
      distanceKm: job.distanceKm,
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
      registrationStatus: job.registrationStatus || "",
      electricVehicle: !!job.electricVehicle,
      redPlates: !!job.redPlates,
      redPlateNumber: job.redPlateNumber || "",
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
      driverOffer: job.driverOffer != null ? String(job.driverOffer) : "",
      expenses: job.expenses != null ? String(job.expenses) : "",
      notes: job.notes || "",
      notesDriver: job.notesDriver || "",
      axle: draftAxleToForm(job.axle),
      category: job.category || "Standard",
      updatePickupMaster: false,
      updateDeliveryMaster: false,
      savePickupToMaster: false,
      saveDeliveryToMaster: false,
    };
  }

  function composeDraftFieldsFromForm(form) {
    const opId = form.customerId || "";
    const op =
      customers.find((x) => x.id === opId) ||
      customers.find((x) => x.name === form.customer);
    const driverOffer =
      parseFloat(String(form.driverOffer || "0").replace(",", ".")) || 0;
    const distRaw = form.distanceKm ?? form.distance;
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
      customerId: op?.id || opId,
      customerName: op?.name || form.customer || "New customer",
      pickup,
      delivery,
      distanceKm: dist,
      category: form.category || "Standard",
      vehicle: form.vehicleType || form.vehicle || "PKW",
      vehicleModel:
        [form.brand, form.model].filter(Boolean).join(" ").trim() || "—",
      // Deregistered vehicles carry no regular plate (conditional form rule)
      plate:
        form.registrationStatus === "deregistered" ? "" : form.plate,
      vin: form.vin,
      axle: normalizeAxle(form.axle),
      registrationStatus:
        form.registrationStatus === "registered" ||
        form.registrationStatus === "deregistered"
          ? form.registrationStatus
          : null,
      electricVehicle: !!form.electricVehicle,
      redPlates: !!form.redPlates,
      redPlateNumber: form.redPlates
        ? String(form.redPlateNumber || "").trim()
        : "",
      driverOffer: driverOffer,
      expenses:
        parseFloat(String(form.expenses || "").replace(",", ".")) || null,
      notes: form.notes,
      notesDriver: form.notesDriver || "",
    };
  }

  function jobWasEverCommitted(job) {
    return (job?.history || []).some((h) =>
      ["published", "assigned", "accepted", "performed", "special_case"].includes(
        h.st,
      ),
    );
  }

  function jobScheduleSnapshot(job) {
    const p = job?.pickup || {};
    const d = job?.delivery || {};
    return [
      p.date,
      p.windowFrom,
      p.windowTo,
      d.date,
      d.windowFrom,
      d.windowTo,
    ].join("|");
  }

  function formScheduleSnapshot(form) {
    return [
      form.pickupDate,
      form.pickupFrom,
      form.pickupTo,
      form.deliveryDate,
      form.deliveryFrom,
      form.deliveryTo,
    ].join("|");
  }

  function processPendingAdminAttachments(jobId, form) {
    const pending = form?.adminAttachFiles || [];
    let count = 0;
    for (const item of pending) {
      const file = item?.file || item;
      if (!file?.name) continue;
      const r = api.attachAdminJobDocument(jobId, file, {
        documentType: item.documentType || "other_proof",
        notes: item.notes || "",
      });
      if (r.ok) count++;
    }
    return count;
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
    tourDocumentNeedsDriverCorrection,
    isTourBillingInvoiceType,
    tourDocumentReviewActions,
    isOfficialTourDocumentSource,
    isDriverTourDocumentSource,
    canDriverReplaceTourDocument,
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
    compareTimeStrings: window.InputFormatters?.compareTimeStrings || (() => 0),
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
    isValidEmail,
    isAllowedTourDocumentFile,
    jobWasEverCommitted,

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

    getDriverSupportContact: () => ({ ...driverSupportContact }),

    setAppDisplayName(name) {
      const next = String(name || "").trim() || "Transport Portal";
      if (branding.appDisplayName === next) return { ok: true };
      branding.appDisplayName = next;
      log("branding_changed", DEMO_ADMIN, "appDisplayName", next);
      emit();
      return { ok: true };
    },

    getCancellationReasonCodes: () => CANCELLATION_REASON_CODES.slice(),
    getCancellationReasonLabel: (code) => cancellationReasonLabel(code),

    getOperationalPolicies: () => ({
      ...operationalPolicies,
      cancellation: { ...cancellationPolicies },
      driverAcceptance: { ...driverAcceptanceDefaults },
    }),

    setOperationalPolicies(partial = {}) {
      if (partial.operational)
        Object.assign(operationalPolicies, partial.operational);
      if (partial.cancellation)
        Object.assign(cancellationPolicies, partial.cancellation);
      if (partial.driverAcceptance)
        Object.assign(driverAcceptanceDefaults, partial.driverAcceptance);
      log(
        "operational_policies_changed",
        DEMO_ADMIN,
        "app_settings",
        JSON.stringify(partial),
      );
      emit();
      return { ok: true };
    },

    checkAdminCancelPolicy(job, opts = {}) {
      const minH = operationalPolicies.adminCancelMinHoursBeforePickupStart;
      if (minH == null || minH <= 0) return { ok: true };
      const hours = hoursUntilPickupStart(job);
      if (hours >= minH) return { ok: true };
      if (
        opts.overrideNote &&
        operationalPolicies.allowPolicyOverrideWithAuditNote
      ) {
        return { ok: true, policyOverride: true };
      }
      return {
        ok: false,
        reason: "within_cancel_cutoff",
        hoursRemaining: Math.max(0, hours),
        minHours: minH,
      };
    },

    checkScheduleChangePolicy(job, opts = {}) {
      const minH = operationalPolicies.scheduleChangeMinHoursBeforePickupStart;
      if (minH == null || minH <= 0) return { ok: true };
      const hours = hoursUntilPickupStart(job);
      if (hours >= minH) return { ok: true };
      if (
        opts.overrideNote &&
        operationalPolicies.allowPolicyOverrideWithAuditNote
      ) {
        return { ok: true, policyOverride: true };
      }
      return {
        ok: false,
        reason: "within_schedule_cutoff",
        hoursRemaining: Math.max(0, hours),
        minHours: minH,
      };
    },

    getJobs: () => jobs,
    getJob: (id) => jobs.find((j) => j.id === id),
    getDriverOffer: (id) => driverOfferAmount(api.getJob(id)),
    driverOfferAmount,
    getDrivers: () => drivers,
    getAdmins: () => admins,
    getCustomers: (opts = {}) => {
      const all = customers.slice();
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
      return driverNotifications.filter(
        (n) => !n.driverId || n.driverId === id,
      );
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

    isDriverBlocked() {
      const d = api.getCurrentDriver();
      return Boolean(d && d.status === "Blocked");
    },

    isCurrentDriverActive() {
      const d = api.getCurrentDriver();
      return !d || d.status === "Active";
    },

    isCurrentDriverMarketplaceActive() {
      const d = api.getCurrentDriver();
      return !d || d.status === "Active";
    },

    canDriverAccessMarketplace() {
      return api.isCurrentDriverMarketplaceActive();
    },

    canDriverUploadOnAssignedTour(jobId) {
      const d = api.getCurrentDriver();
      if (!d) return false;
      if (d.status === "Active" || d.status === "Blocked") return true;
      return false;
    },

    todayCalendarKey() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },

    getDriverProbationSummary(driverId) {
      const d = driverId
        ? drivers.find((x) => x.id === driverId)
        : api.getCurrentDriver();
      if (!d) return null;
      const limit =
        d.probationJobLimit ??
        driverAcceptanceDefaults.probationJobCount ??
        3;
      const activeCount = driverProbationActiveCount(d.id);
      const performedCount = driverProbationPerformedCount(d.id);
      const takenCount = activeCount + performedCount;
      const onProbation = !d.probationClearedAt;
      return {
        limit,
        activeCount,
        performedCount,
        takenCount,
        bookedCount: takenCount,
        onProbation,
        clearedAt: d.probationClearedAt || null,
        atLimit: onProbation && takenCount >= limit && performedCount < limit,
        remainingSlots: onProbation
          ? Math.max(0, limit - takenCount)
          : null,
      };
    },

    /** @deprecated use getDriverProbationSummary */
    getDriverDailyAcceptanceSummary() {
      const s = api.getDriverProbationSummary();
      if (!s) return null;
      return {
        limit: s.limit,
        count: s.takenCount,
        dayKey: api.todayCalendarKey(),
        atLimit: s.atLimit,
        remaining: s.remainingSlots ?? 0,
        pendingLimitRequest: false,
        hasOpenRequest: false,
        onProbation: s.onProbation,
        performedCount: s.performedCount,
      };
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

    getCustomer: (id) => customers.find((x) => x.id === id) || null,

    getAddress: (id) => addresses.find((x) => x.id === id) || null,

    countJobsUsingCustomer(opId) {
      return jobs.filter((j) => j.customerId === opId).length;
    },

    countJobsUsingAddress(addrId) {
      return jobs.filter(
        (j) =>
          j.pickup?.locationId === addrId || j.delivery?.locationId === addrId,
      ).length;
    },

    countActiveJobsForDriver(driverId) {
      const driver = drivers.find((x) => x.id === driverId);
      if (!driver) return 0;
      return jobs.filter(
        (j) =>
          ACTIVE_JOB_STATUSES.includes(j.status) &&
          (j.driverId === driverId ||
            (!j.driverId && j.driver === driver.name)),
      ).length;
    },

    addCustomer(data) {
      const name = String(data?.name || "").trim();
      if (!name) return { ok: false, reason: "name_required" };
      const op = {
        id: nextMasterId("OP", customers),
        name,
        type: String(data?.type || "").trim(),
        contact: String(data?.contact || "").trim(),
        phone: String(data?.phone || "").trim(),
        email: String(data?.email || "").trim(),
        billingNotes: String(data?.billingNotes || "").trim(),
        instructions: String(data?.instructions || "").trim(),
        active: data?.active !== false,
      };
      customers.unshift(op);
      log("customer_created", DEMO_ADMIN, op.name, op.id);
      emit();
      return { ok: true, customer: op };
    },

    updateCustomer(id, data) {
      const op = customers.find((x) => x.id === id);
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
      log("customer_updated", DEMO_ADMIN, op.name, op.id);
      emit();
      return { ok: true, customer: op };
    },

    deleteCustomer(id) {
      const op = customers.find((x) => x.id === id);
      if (!op) return { ok: false, reason: "not_found" };
      const used = api.countJobsUsingCustomer(id);
      if (used > 0) return { ok: false, reason: "in_use", count: used };
      const idx = customers.findIndex((x) => x.id === id);
      customers.splice(idx, 1);
      log("customer_deleted", DEMO_ADMIN, op.name, op.id);
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
              dr.driverCode || dr.id,
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
      const key = distanceKey(j);
      const source =
        key && DISTANCE_TABLE[key]
          ? "table"
          : j?.pickup?.postalCode && j?.delivery?.postalCode
            ? "heuristic"
            : "unknown";
      return { ok: true, km, source };
    },

    estimateDistanceFromForm(form) {
      const jobLike = jobLikeFromForm(form || {});
      const pickup = jobLike.pickup.postalCode;
      const delivery = jobLike.delivery.postalCode;
      if (!pickup || !delivery) {
        return { ok: false, reason: "postal_codes_required" };
      }
      const km = estimateDistanceKm(jobLike);
      const key = distanceKey(jobLike);
      const source =
        key && DISTANCE_TABLE[key] ? "table" : "heuristic";
      return { ok: true, km, source };
    },

    recalculateDistance(id) {
      const j = api.getJob(id);
      if (!j) return { ok: false };
      j.distanceKm = estimateDistanceKm(j);
      syncDisplayFields(j);
      log(
        "distance_recalculated",
        DEMO_ADMIN,
        j.tour,
        `${j.distanceKm} km`,
      );
      emit();
      return { ok: true, km: j.distanceKm };
    },

    acceptJob(id, opts = {}) {
      const j = api.getJob(id);
      if (!j || j.status !== "published")
        return { ok: false, reason: "not_available" };
      if (!api.isCurrentDriverActive())
        return { ok: false, reason: "driver_restricted" };
      const dr = api.getCurrentDriver();
      if (!dr) return { ok: false, reason: "no_driver" };
      if (!dr.probationClearedAt) {
        const limit =
          dr.probationJobLimit ??
          driverAcceptanceDefaults.probationJobCount ??
          3;
        const performedCount = driverProbationPerformedCount(dr.id);
        const takenCount = driverProbationTakenCount(dr.id);
        if (takenCount >= limit && performedCount < limit) {
          return {
            ok: false,
            reason: "probation_limit_reached",
            limit,
            performedCount,
            takenCount,
          };
        }
      }
      if (
        !opts.confirmSameDayOverlap &&
        driverHasSameDayActiveJob(dr.id, j, id)
      ) {
        return { ok: false, reason: "same_day_overlap_confirm" };
      }
      j.status = "accepted";
      j.driver = dr.name;
      j.driverId = dr.id;
      bumpPdf(j);
      j.history = [
        ...(j.history || []),
        { st: "accepted", at: nowStamp(), by: dr.name },
      ];
      driverState.acceptedIds.add(id);
      log("job_accepted", dr.name, j.tour, "Binding slide confirmation");
      queueAdminEmailAlert("job_accepted", id, `Driver ${dr.name}`);
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
      const dr = jobDriverRecord(j);
      if (dr) maybeAutoReleaseProbation(dr);
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
      j.cancellationActor = "driver";
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
      log("special_case_created", DEMO_DRIVER, j.tour, `${reason}: ${message}`);
      const alertMeta =
        evidence.length > 0
          ? `${message || ""} · ${evidence.length} file(s)`.trim()
          : message || "";
      queueAdminEmailAlert("special_case_created", id, alertMeta);
      emit();
      return { ok: true };
    },

    getMasterDataChangeRequest(id) {
      return masterDataChangeRequests.find((r) => r.id === id) || null;
    },

    getOpenMasterDataChangeRequestForDriver(driverId) {
      const id =
        driverId ||
        api.getCurrentDriver()?.id ||
        drivers.find((x) => x.name === DEMO_DRIVER)?.id;
      if (!id) return null;
      return (
        masterDataChangeRequests.find(
          (r) => r.driverId === id && r.status === "open",
        ) || null
      );
    },

    listMasterDataChangeRequests(opts = {}) {
      let rows = masterDataChangeRequests.slice();
      if (opts.status) {
        rows = rows.filter((r) => r.status === opts.status);
      }
      if (opts.driverId) {
        rows = rows.filter((r) => r.driverId === opts.driverId);
      }
      rows.sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      );
      return rows;
    },

    getOpenMasterDataChangeRequestCount() {
      return masterDataChangeRequests.filter((r) => r.status === "open").length;
    },

    requestMasterDataChange(proposed) {
      if (!api.isCurrentDriverActive())
        return { ok: false, reason: "driver_restricted" };
      const d = api.getCurrentDriver();
      if (!d) return { ok: false, reason: "no_driver" };
      if (api.getOpenMasterDataChangeRequestForDriver(d.id)) {
        return { ok: false, reason: "open_request_exists" };
      }
      // Email is no longer part of ops-managed master data — the driver owns
      // it via the self-serve Account & sign-in flow (verify, don't approve).
      // It is preserved unchanged here so an approval never rewrites it.
      const p = {
        company: String(proposed?.company ?? "").trim(),
        address: String(proposed?.address ?? "").trim(),
        email: d.email || "",
        phone: String(proposed?.phone ?? "").trim(),
      };
      if (!p.company) return { ok: false, reason: "company_required" };
      const snapshot = {
        company: d.company || "",
        address: d.address || "",
        email: d.email || "",
        phone: d.phone || "",
      };
      const changedFields = ["company", "address", "phone"].filter(
        (k) => p[k] !== snapshot[k],
      );
      if (!changedFields.length) return { ok: false, reason: "no_changes" };
      const who = d.name || DEMO_DRIVER;
      const reqId = `MDR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      // Derive changeType from which fields changed — matches master_data_change_type enum
      const changeType = changedFields.includes("address")
        ? "address"
        : "contact";
      const row = {
        id: reqId,
        driverId: d.id,
        driverName: who,
        driverCode: d.driverCode || "",
        changeType,
        note: "",
        proposed: p,
        status: "open",
        createdAt: nowStamp(),
        resolvedAt: null,
        resolvedBy: null,
        reviewedBy: null,
        reviewedAt: null,
        adminNote: "",
        snapshot,
      };
      masterDataChangeRequests.unshift(row);
      queueAdminEmailAlert(
        "master_data_change_requested",
        "",
        `${who}: ${changedFields.join(", ")} · ${reqId}`,
      );
      log(
        "master_data_change_requested",
        who,
        "profile",
        `${reqId} · ${changedFields.join(", ")}`,
      );
      pushDriverNotification({
        type: "master_data_change_sent",
        title: "Change request sent",
        body: "The operations team received your profile change request.",
        driverId: d.id,
      });
      emit();
      return { ok: true, id: reqId, request: row };
    },

    // ---- Driver self-service email change (verify, don't approve) --------
    // The driver owns their sign-in email. A change is confirmed by a
    // 6-digit code sent to the NEW address; the OLD address stays live until
    // the code is confirmed. No operations approval, ever. Backend delivery
    // of the code, real persistence, and rate limiting are simulated here and
    // captured as requirements for the dev team.
    EMAIL_CODE_TTL_MS: 10 * 60 * 1000,
    EMAIL_CODE_RESEND_MS: 30 * 1000,

    getDriverEmailChange() {
      const d = api.getCurrentDriver();
      if (!d) return null;
      return {
        email: d.email || "",
        emailVerified: d.emailVerified !== false,
        pending: d.pendingEmailChange || null,
      };
    },

    startDriverEmailChange(newEmailRaw) {
      if (!api.isCurrentDriverActive())
        return { ok: false, reason: "restricted" };
      const d = api.getCurrentDriver();
      if (!d) return { ok: false, reason: "no_driver" };
      const newEmail = String(newEmailRaw || "").trim();
      if (!isValidEmail(newEmail)) return { ok: false, reason: "invalid_email" };
      if (newEmail.toLowerCase() === String(d.email || "").toLowerCase())
        return { ok: false, reason: "same_email" };
      if (
        drivers.some(
          (x) =>
            x.id !== d.id &&
            String(x.email || "").toLowerCase() === newEmail.toLowerCase(),
        )
      )
        return { ok: false, reason: "duplicate_email" };
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const now = Date.now();
      d.pendingEmailChange = {
        newEmail,
        code,
        createdAt: nowStamp(),
        sentAt: now,
        expiresAt: now + api.EMAIL_CODE_TTL_MS,
        attempts: 0,
        resendCount: 0,
      };
      // Code is delivered to the NEW inbox only (proof of ownership).
      log(
        "driver_email_change_requested",
        d.name || DEMO_DRIVER,
        "account",
        `${d.email || "—"} → ${newEmail}`,
      );
      emit();
      return { ok: true, newEmail, code, expiresInSec: api.EMAIL_CODE_TTL_MS / 1000 };
    },

    resendDriverEmailCode() {
      const d = api.getCurrentDriver();
      if (!d || !d.pendingEmailChange)
        return { ok: false, reason: "no_pending" };
      const now = Date.now();
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const pending = d.pendingEmailChange;
      pending.code = code;
      pending.sentAt = now;
      pending.expiresAt = now + api.EMAIL_CODE_TTL_MS;
      pending.attempts = 0;
      pending.resendCount = (pending.resendCount || 0) + 1;
      log(
        "driver_email_change_requested",
        d.name || DEMO_DRIVER,
        "account",
        `resend · ${pending.newEmail}`,
      );
      emit();
      return { ok: true, newEmail: pending.newEmail, code };
    },

    confirmDriverEmailChange(codeRaw) {
      const d = api.getCurrentDriver();
      if (!d || !d.pendingEmailChange)
        return { ok: false, reason: "no_pending" };
      const pending = d.pendingEmailChange;
      if (Date.now() > pending.expiresAt) {
        return { ok: false, reason: "expired" };
      }
      const code = String(codeRaw || "").trim();
      if (code !== pending.code) {
        pending.attempts = (pending.attempts || 0) + 1;
        emit();
        return { ok: false, reason: "invalid_code" };
      }
      const oldEmail = d.email || "";
      const newEmail = pending.newEmail;
      // Re-check uniqueness at confirm time (another account may have taken it).
      if (
        drivers.some(
          (x) =>
            x.id !== d.id &&
            String(x.email || "").toLowerCase() === newEmail.toLowerCase(),
        )
      ) {
        return { ok: false, reason: "duplicate_email" };
      }
      d.email = newEmail;
      d.emailVerified = true;
      d.pendingEmailChange = null;
      log(
        "driver_email_changed",
        d.name || DEMO_DRIVER,
        "account",
        `${oldEmail || "—"} → ${newEmail}`,
      );
      // Notify the OLD inbox that the sign-in address changed (security).
      pushDriverNotification({
        type: "email_changed",
        title: window.I18n
          ? window.I18n.t("emailChangedNotifyTitle")
          : "Sign-in email changed",
        body: window.I18n
          ? window.I18n.t("emailChangedNotifyBody", { email: newEmail })
          : `Your sign-in email was changed to ${newEmail}.`,
        driverId: d.id,
      });
      emit();
      return { ok: true, email: newEmail, previousEmail: oldEmail };
    },

    cancelDriverEmailChange() {
      const d = api.getCurrentDriver();
      if (!d) return { ok: false, reason: "no_driver" };
      d.pendingEmailChange = null;
      emit();
      return { ok: true };
    },

    requestDailyLimitIncrease() {
      return { ok: false, reason: "removed" };
    },

    releaseDriverFromProbation(id) {
      const d = drivers.find((x) => x.id === id);
      if (!d) return { ok: false, reason: "not_found" };
      if (d.probationClearedAt) return { ok: false, reason: "already_cleared" };
      d.probationClearedAt = nowStamp();
      log(
        "driver_probation_released",
        DEMO_ADMIN,
        d.name,
        `manual · ${d.driverCode || d.id}`,
      );
      emit();
      return { ok: true, driver: d };
    },

    resolveMasterDataChangeRequest(id, decision, adminNote) {
      const row = masterDataChangeRequests.find((r) => r.id === id);
      if (!row) return { ok: false, reason: "not_found" };
      if (row.status !== "open") return { ok: false, reason: "not_open" };
      const d = String(decision || "").toLowerCase();
      const approved = d === "approve" || d === "approved";
      const rejected = d === "reject" || d === "rejected";
      if (!approved && !rejected) return { ok: false, reason: "bad_decision" };
      if (row.changeType === "daily_limit_override") {
        row.status = "rejected";
        row.resolvedAt = nowStamp();
        row.resolvedBy = DEMO_ADMIN;
        row.reviewedBy = DEMO_ADMIN;
        row.reviewedAt = nowStamp();
        row.adminNote =
          String(adminNote || "").trim() ||
          "Daily limit overrides removed; probation model is in use.";
        log(
          "master_data_change_rejected",
          DEMO_ADMIN,
          row.driverName,
          `${row.id} · legacy daily_limit_override`,
        );
        emit();
        return { ok: true, request: row };
      }
      if (approved) {
        const p = row.proposed;
        if (!p) return { ok: false, reason: "no_proposed_data" };
        const upd = api.updateDriver(row.driverId, {
          company: p.company,
          address: p.address,
          email: p.email,
          phone: p.phone,
        });
        if (!upd.ok)
          return { ok: false, reason: upd.reason || "update_failed" };
      }
      row.status = approved ? "approved" : "rejected";
      row.resolvedAt = nowStamp();
      row.resolvedBy = DEMO_ADMIN;
      row.reviewedBy = DEMO_ADMIN;
      row.reviewedAt = nowStamp();
      row.adminNote = String(adminNote || "").trim();
      const action = approved
        ? "master_data_change_approved"
        : "master_data_change_rejected";
      log(
        action,
        DEMO_ADMIN,
        row.driverName,
        `${row.id} · ${row.adminNote || "—"}`,
      );
      pushDriverNotification({
        type: approved
          ? "master_data_change_approved"
          : "master_data_change_rejected",
        title: approved
          ? "Profile change approved"
          : "Profile change declined",
        body: row.adminNote
          ? row.adminNote
          : approved
            ? "Your master-data change request was approved."
            : "Your master-data change request was declined.",
        driverId: row.driverId,
      });
      emit();
      return { ok: true, request: row };
    },

    resolveSpecialCase(id, decision, note, opts = {}) {
      const j = api.getJob(id);
      if (!j || j.status !== "special_case") return { ok: false };
      const d = String(decision || "").toLowerCase();
      if (d === "cancel" || d === "cancelled") {
        return api.cancelJob(id, {
          actor: "admin",
          reason: opts.reasonCode || "",
          note: opts.driverMessage || note || "",
          overrideNote: opts.overrideNote || "",
          by: DEMO_ADMIN,
          fromSpecialCase: true,
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
      } else if (d === "assign" || d === "assigned" || d === "continue") {
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
            meta: note || `Special case resolved → continued as ${restored}`,
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

    revertJobToDraft(id, opts = {}) {
      const j = api.getJob(id);
      if (!j || j.status !== "published")
        return { ok: false, reason: "not_published" };
      const policy = api.checkScheduleChangePolicy(j, {
        overrideNote: opts.overrideNote,
      });
      if (!policy.ok) return { ok: false, ...policy };
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
      if (policy.policyOverride) {
        log(
          "policy_override",
          DEMO_ADMIN,
          j.tour,
          `Revert to draft inside cutoff: ${opts.overrideNote}`,
        );
      }
      emit();
      return { ok: true };
    },

    assignJob(id, driverRef, opts = {}) {
      const j = api.getJob(id);
      if (!j || j.status !== "draft") return { ok: false, reason: "not_draft" };
      const dr = api.resolveAssignableDriver(driverRef);
      if (!dr.ok) return dr;
      const confirmationNote = String(opts.confirmationNote || "").trim();
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
          meta: confirmationNote
            ? `Driver: ${dr.driver.name} (${dr.driver.id}) · proof: ${confirmationNote}`
            : `Driver: ${dr.driver.name} (${dr.driver.id})`,
        },
      ];
      log(
        "job_assigned",
        DEMO_ADMIN,
        j.tour,
        confirmationNote
          ? `Driver: ${dr.driver.name} · confirmation: ${confirmationNote}`
          : `Driver: ${dr.driver.name}`,
      );
      if (confirmationNote) {
        log(
          "manual_assign_confirmation",
          DEMO_ADMIN,
          j.tour,
          confirmationNote,
        );
      }
      queuePushNotification(j, "assign");
      queueAdminEmailAlert(
        "job_assigned",
        id,
        confirmationNote
          ? `Driver: ${dr.driver.name} · ${confirmationNote}`
          : `Driver: ${dr.driver.name}`,
      );
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
      log("job_reassigned", DEMO_ADMIN, j.tour, `${prev || "—"} → ${j.driver}`);
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

      const actor = opts.actor || "admin";
      const reasonCode = String(opts.reason || opts.reasonCode || "").trim();
      const reasonText = String(opts.note || opts.reasonText || "").trim();
      const overrideNote = String(opts.overrideNote || "").trim();
      const dr = jobDriverRecord(j);
      const hadDriver = !!dr;

      if (actor === "admin" || actor === "customer") {
        const policy = api.checkAdminCancelPolicy(j, { overrideNote });
        if (!policy.ok) return policy;
        if (cancellationPolicies.adminCancelRequiresReasonCode && !reasonCode)
          return { ok: false, reason: "reason_code_required" };
        const minMsg =
          cancellationPolicies.adminCancelDriverMessageMinChars || 20;
        if (
          hadDriver &&
          cancellationPolicies.adminCancelRequiresDriverMessage &&
          reasonText.length < minMsg
        ) {
          return {
            ok: false,
            reason: "driver_message_too_short",
            min: minMsg,
          };
        }
      }

      j.status = "cancelled";
      j.specialCaseReport = null;
      j.cancellationActor = actor;
      j.cancellationReason = reasonCode;
      j.cancellationReasonText = reasonText;
      j.history = [
        ...(j.history || []),
        {
          st: "cancelled",
          at: nowStamp(),
          by: opts.by || DEMO_ADMIN,
          meta:
            reasonText ||
            cancellationReasonLabel(reasonCode) ||
            "Admin cancellation",
        },
      ];
      driverState.acceptedIds.delete(id);
      driverState.performedIds.delete(id);
      driverState.specialCaseIds.delete(id);
      driverState.cancelledIds.add(id);
      log(
        "job_cancelled",
        opts.by || DEMO_ADMIN,
        j.tour,
        reasonText || reasonCode || "",
      );
      queueAdminEmailAlert("job_cancelled", id, reasonText || reasonCode || "");
      if (overrideNote) {
        log(
          "policy_override",
          opts.by || DEMO_ADMIN,
          j.tour,
          `Admin cancel inside cutoff: ${overrideNote}`,
        );
      }
      if (dr) {
        const notifyBody =
          reasonText ||
          cancellationReasonLabel(reasonCode) ||
          "Tour cancelled by dispatch.";
        pushDriverNotification({
          type: "order_cancelled",
          jobId: id,
          tour: j.tour,
          title: "Tour cancelled",
          body: notifyBody,
          driverId: dr.id,
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
      const compareTimes =
        window.InputFormatters?.compareTimeStrings || (() => 0);
      if (
        form.pickupFrom &&
        form.pickupTo &&
        compareTimes(form.pickupFrom, form.pickupTo) > 0
      ) {
        return { error: "cross_midnight_window", leg: "pickup" };
      }
      if (
        form.deliveryFrom &&
        form.deliveryTo &&
        compareTimes(form.deliveryFrom, form.deliveryTo) > 0
      ) {
        return { error: "cross_midnight_window", leg: "delivery" };
      }
      const editId = String(form.jobId || form.id || "").trim();
      const opId = form.customerId || "";
      const op =
        customers.find((x) => x.id === opId) ||
        customers.find((x) => x.name === form.customer);
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
        if (!j || j.status !== "draft") return { error: "not_draft" };
        if (
          jobWasEverCommitted(j) &&
          formScheduleSnapshot(form) !== jobScheduleSnapshot(j)
        ) {
          const policy = api.checkScheduleChangePolicy(j, {
            overrideNote: form.scheduleOverrideNote,
          });
          if (!policy.ok) {
            return {
              error: policy.reason,
              minHours: policy.minHours,
              hoursRemaining: policy.hoursRemaining,
            };
          }
          if (policy.policyOverride) {
            log(
              "policy_override",
              DEMO_ADMIN,
              j.tour,
              `Schedule change inside cutoff: ${form.scheduleOverrideNote}`,
            );
          }
        }
        Object.assign(j, fields);
        j.isNew = false;
        if (!j.distanceKm) {
          j.distanceKm = estimateDistanceKm(j);
        }
        syncDisplayFields(j);
        processPendingAdminAttachments(j.id, form);
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
      }
      jobs.unshift(newJob);
      processPendingAdminAttachments(newJob.id, form);
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
      if (status !== "Active") {
        const activeJobs = api.countActiveJobsForDriver(id);
        if (activeJobs > 0) {
          return { ok: false, reason: "active_jobs", count: activeJobs };
        }
      }
      d.status = status;
      log("driver_status_changed", DEMO_ADMIN, d.name, status);
      emit();
      return { ok: true };
    },

    updateDriver(id, patch = {}) {
      const d = drivers.find((x) => x.id === id);
      if (!d) return { ok: false, reason: "not_found" };
      const fields = ["name", "company", "address", "email", "phone", "notes"];
      for (const k of fields) {
        if (patch[k] !== undefined) d[k] = String(patch[k] ?? "").trim();
      }
      if (patch.driverCode !== undefined) {
        const code = String(patch.driverCode ?? "").trim();
        if (code && code !== d.driverCode) {
          return { ok: false, reason: "driver_code_immutable" };
        }
      }
      if (!d.name || !d.company) return { ok: false, reason: "required" };
      if (!d.driverCode) return { ok: false, reason: "driver_code_required" };
      if (!d.email) return { ok: false, reason: "email_required" };
      if (!isValidEmail(d.email)) return { ok: false, reason: "invalid_email" };
      if (drivers.some((x) => x.id !== id && x.email === d.email))
        return { ok: false, reason: "duplicate_email" };
      if (patch.probationJobLimit !== undefined) {
        const n = parseInt(String(patch.probationJobLimit).trim(), 10);
        if (!Number.isFinite(n) || n < 1 || n > 99)
          return { ok: false, reason: "invalid_probation_limit" };
        const prev = d.probationJobLimit;
        d.probationJobLimit = n;
        if (prev !== n) {
          log(
            "driver_probation_limit_changed",
            DEMO_ADMIN,
            d.name,
            `${prev} → ${n}`,
          );
        }
      }
      log("driver_updated", DEMO_ADMIN, d.name, d.driverCode || "");
      emit();
      return { ok: true };
    },

    updateAdmin(id, patch = {}) {
      const a = admins.find((x) => x.id === id);
      if (!a) return { ok: false, reason: "not_found" };
      if (patch.name !== undefined) a.name = String(patch.name).trim();
      if (patch.email !== undefined) a.email = String(patch.email).trim();
      if (!a.name || !a.email) return { ok: false, reason: "required" };
      if (!isValidEmail(a.email)) return { ok: false, reason: "invalid_email" };
      if (admins.some((x) => x.id !== id && x.email === a.email))
        return { ok: false, reason: "duplicate_email" };
      log("admin_updated", DEMO_ADMIN, a.name, a.email);
      emit();
      return { ok: true };
    },

    addDriver(data = {}) {
      const name = String(data.name || "").trim();
      const company = String(data.company || "").trim();
      const email = String(data.email || "").trim();
      if (!name || !company) return { ok: false, reason: "required" };
      if (!email) return { ok: false, reason: "email_required" };
      if (!isValidEmail(email)) return { ok: false, reason: "invalid_email" };
      if (drivers.some((d) => d.email === email))
        return { ok: false, reason: "duplicate_email" };
      const driverCode = nextDriverCode();
      const id = nextMasterId("DRV", drivers);
      const probationJobLimit = (() => {
        if (
          data.probationJobLimit !== undefined &&
          data.probationJobLimit !== ""
        ) {
          const n = parseInt(String(data.probationJobLimit).trim(), 10);
          if (Number.isFinite(n) && n >= 1 && n <= 99) return n;
        }
        return driverAcceptanceDefaults.probationJobCount ?? 3;
      })();
      const driver = {
        id,
        name,
        company,
        driverCode,
        address: String(data.address || "").trim(),
        email,
        phone: String(data.phone || "").trim(),
        notes: String(data.notes || "").trim(),
        probationJobLimit,
        probationClearedAt: null,
        status: "Active",
        prefs: {
          postalAreas: [],
          vehicle: "PKW",
          axle: "All",
          pushEnabled: true,
          notifyNewPublished: true,
        },
      };
      const access = simulateAccountInvite(driver, "driver");
      drivers.unshift(driver);
      log(
        "driver_created",
        DEMO_ADMIN,
        driver.name,
        `system-assigned ID ${driver.driverCode} · ${driver.id}`,
      );
      emit();
      return { ok: true, driver, access };
    },

    addAdmin(data = {}) {
      const name = String(data.name || "").trim();
      const email = String(data.email || "").trim();
      if (!name || !email) return { ok: false, reason: "required" };
      if (!isValidEmail(email)) return { ok: false, reason: "invalid_email" };
      if (admins.some((a) => a.email === email))
        return { ok: false, reason: "duplicate_email" };
      const admin = {
        id: nextMasterId("ADM", admins),
        name,
        email,
        status: "Active",
      };
      const access = simulateAccountInvite(admin, "admin");
      admins.unshift(admin);
      log("admin_created", DEMO_ADMIN, admin.name, admin.id);
      emit();
      return { ok: true, admin, access };
    },

    resendAccess(kind, id) {
      const pool = kind === "admin" ? admins : drivers;
      const u = pool.find((x) => x.id === id);
      if (!u) return { ok: false };
      const access = simulateAccountInvite(u, kind);
      log("user_access_invite_resent", DEMO_ADMIN, u.name || u.email, kind);
      emit();
      return { ok: true, access, user: u };
    },

    setAdminStatus(id, status) {
      const allowed = ["Active", "Inactive"];
      const a = admins.find((x) => x.id === id);
      if (!a || !allowed.includes(status)) return { ok: false };
      a.status = status;
      log("admin_status_changed", DEMO_ADMIN, a.name, status);
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
        description: meta.description || `Uploaded PDF (demo): ${name}`,
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
        d.driverCode,
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
      if (!uploadAllowedStatuses().includes(j.status))
        return { ok: false, reason: "job_not_uploadable" };
      const d = api.getCurrentDriver();
      if (!d) return { ok: false, reason: "no_driver" };
      if (!api.canDriverUploadOnAssignedTour(id))
        return { ok: false, reason: "driver_blocked" };
      if (j.driver && j.driver !== d.name)
        return { ok: false, reason: "not_assigned_driver" };
      return { ok: true, jobId: id };
    },

    addTourDocument(file, opts = {}) {
      if (!file) return { ok: false, reason: "no_file" };
      if (!isAllowedTourDocumentFile(file))
        return { ok: false, reason: "invalid_type" };
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
        source: "driver",
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

    // Driver removes an own upload before dispatch has reviewed it
    // (Figma 8:2545). Reviewed documents (checked/accepted/rejected) are
    // audit-relevant and can only be replaced, not removed.
    removeDriverTourDocument(id) {
      const idx = tourDocuments.findIndex((x) => x.id === id);
      if (idx === -1) return { ok: false, reason: "not_found" };
      const doc = tourDocuments[idx];
      const d = api.getCurrentDriver();
      if (!d || doc.driverId !== d.id)
        return { ok: false, reason: "not_owner" };
      if (normalizeTourDocumentReviewStatus(doc.reviewStatus) !== "uploaded")
        return { ok: false, reason: "already_in_review" };
      tourDocuments.splice(idx, 1);
      reconcileDocumentReviewSummary(doc.jobId);
      log(
        "tour_document_removed",
        d.name,
        doc.fileName,
        `${doc.jobId} · ${doc.documentType}`,
      );
      emit();
      return { ok: true };
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
        if (!DOC_REVIEW.includes(next))
          return { ok: false, reason: "bad_status" };
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
        doc.supplierInvoiceNumber = String(
          patch.supplierInvoiceNumber ?? "",
        ).trim();
      if (patch.supplierInvoiceDate !== undefined)
        doc.supplierInvoiceDate = String(
          patch.supplierInvoiceDate ?? "",
        ).trim();
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
      if (!j || !uploadAllowedStatuses().includes(j.status))
        return { ok: false, reason: "job_not_uploadable" };
      const actor = opts.actor || "driver";
      if (actor === "driver") {
        const d = api.getCurrentDriver();
        if (!d) return { ok: false, reason: "no_driver" };
        if (j.driver && j.driver !== d.name)
          return { ok: false, reason: "not_assigned_driver" };
        if (doc.driverId && doc.driverId !== d.id)
          return { ok: false, reason: "not_owner" };
        if (isOfficialTourDocumentSource(doc.source))
          return { ok: false, reason: "official_doc_not_replaceable" };
        if (!isDriverTourDocumentSource(doc.source))
          return { ok: false, reason: "official_doc_not_replaceable" };
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
      const who =
        actor === "driver"
          ? api.getCurrentDriver()?.name || DEMO_DRIVER
          : DEMO_ADMIN;
      log(
        "tour_document_replaced",
        who,
        doc.fileName,
        `${jobId} · ${doc.documentType}`,
      );
      queueAdminEmailAlert(
        "tour_document_uploaded",
        jobId,
        "replacement upload",
      );
      emit();
      return { ok: true, id: doc.id };
    },

    getTourDocuments: () => tourDocuments.slice(),

    getTourDocumentsForJob(jobId) {
      if (!jobId) return [];
      return tourDocuments.filter((x) => x.jobId === jobId);
    },

    getOfficialTourDocumentsForJob(jobId) {
      return api
        .getTourDocumentsForJob(jobId)
        .filter((doc) => isOfficialTourDocumentSource(doc.source));
    },

    getDriverTourDocumentsForJob(jobId) {
      return api
        .getTourDocumentsForJob(jobId)
        .filter((doc) => isDriverTourDocumentSource(doc.source));
    },

    isOfficialTourDocumentSource,
    isDriverTourDocumentSource,
    canDriverReplaceTourDocument,

    attachAdminJobDocument(jobId, file, opts = {}) {
      const jobRaw = String(jobId || "").trim();
      const j = api.getJob(jobRaw);
      if (!j) return { ok: false, reason: "bad_job" };
      if (j.status === "cancelled")
        return { ok: false, reason: "bad_status" };
      if (!file) return { ok: false, reason: "no_file" };
      if (!isAllowedTourDocumentFile(file))
        return { ok: false, reason: "invalid_type" };
      const dr = jobDriverRecord(j);
      const mime =
        (file.type || guessMimeFromName(file.name) || "").trim() ||
        "application/octet-stream";
      const row = {
        id: `TD-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        jobId: jobRaw,
        driverId: dr?.id || "",
        driverName: dr?.name || j.driver || "Dispatch",
        fileName: file.name,
        mimeType: mime,
        sizeBytes: typeof file.size === "number" ? file.size : 0,
        uploadedAt: new Date().toISOString(),
        documentType: normalizeTourDocumentType(opts.documentType),
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "admin_off_channel",
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
        `${jobRaw} · ${row.documentType} · admin_off_channel`,
      );
      queueAdminEmailAlert("tour_document_uploaded", jobRaw, row.documentType);
      emit();
      return { ok: true, id: row.id };
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
        source: "admin_off_channel",
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
      const base =
        String(doc.fileName || "document")
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/\.[^.]+$/, "") || "document";
      const a = document.createElement("a");
      a.href = SAMPLE_PDF_URL;
      a.download = `${base}.pdf`;
      a.click();
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
        "driverOffer",
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
        { header: "customerName", key: "customerName" },
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
        { header: "driverOffer", key: "driverOffer" },
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
      log("jobs_exported", DEMO_ADMIN, "CSV export", `${jobs.length} rows`);
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
      log("audit_log_exported", DEMO_ADMIN, "CSV", `${list.length} rows`);
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
        `Customer: ${j.customerName}`,
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
        `Driver offer: ${j.driverOffer ?? "—"} | Customer gross: ${j.grossAmount ?? j.revenue ?? "—"} | Net: ${j.netAmount ?? "—"} VAT: ${j.vatRate ?? 19}%`,
        `Document review: ${j.documentReviewSummary}`,
        `Settlement: ${j.settlementState}`,
        "Instructions: pre-trip inspection, direct route, incident reporting, digital proof submission, safety clothing on logistics yards.",
        "Legal wording subject to final production review.",
      ].join("\n");
    },

    getTransportOrderPreview(id) {
      const j = api.getJob(id);
      if (!j) return { ok: false };
      const fileName = `transport-order-${j.id}.pdf`;
      log("pdf_viewed", DEMO_ADMIN, id, "In-PWA transport order preview");
      emit();
      return {
        ok: true,
        preview: {
          title: fileName,
          fileName,
          mimeType: "application/pdf",
          previewable: true,
          pdfUrl: SAMPLE_PDF_URL,
          downloadName: fileName,
        },
      };
    },

    viewPdf(id) {
      return api.getTransportOrderPreview(id);
    },

    downloadPdf(id) {
      const j = api.getJob(id);
      if (!j) return { ok: false };
      const a = document.createElement("a");
      a.href = SAMPLE_PDF_URL;
      a.download = `transport-order-${j.id}.pdf`;
      a.click();
      log(
        "pdf_downloaded",
        DEMO_ADMIN,
        j.tour,
        "Seeded sample transport-order PDF",
      );
      emit();
      return { ok: true };
    },

    getTourDocumentPreview(id) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false };
      const base = String(doc.fileName || "document").replace(/\.[^.]+$/, "");
      return {
        ok: true,
        preview: {
          title: doc.fileName,
          fileName: doc.fileName,
          mimeType: "application/pdf",
          previewable: true,
          pdfUrl: SAMPLE_PDF_URL,
          downloadName: `${base}.pdf`,
        },
      };
    },

    getInfopointDocumentPreview(id) {
      const doc = documents.find((x) => x.id === id);
      if (!doc || !doc.visible) return { ok: false };
      const title = doc.title || "document";
      const fileName = `${String(title).replace(/[^a-zA-Z0-9._-]+/g, "_")}.pdf`;
      return {
        ok: true,
        preview: {
          title,
          fileName,
          mimeType: "application/pdf",
          previewable: true,
          pdfUrl: SAMPLE_PDF_URL,
          downloadName: fileName,
        },
      };
    },

    downloadInfopointDocument(id) {
      const r = api.getInfopointDocumentPreview(id);
      if (!r.ok) return { ok: false };
      const a = document.createElement("a");
      a.href = SAMPLE_PDF_URL;
      a.download = r.preview.downloadName;
      a.click();
      return { ok: true };
    },

    reloadDemo() {
      customers = seedCustomers();
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
      masterDataChangeRequests = [];
      for (const j of jobs) {
        j.paymentStatus = normalizePaymentStatus(j.paymentStatus);
        reconcileDocumentReviewSummary(j.id);
        reconcileJobInvoiceFromTourDocuments(j.id);
      }
      validateSeedData(jobs, customers, tourDocuments, driverState);
      nextTourSeq = 849;
      branding.appDisplayName =
        window.AUTHEON_BRANDING_DEFAULTS?.appDisplayName || "Transport Portal";
      const reloadFlags = window.AUTHEON_FLAG_DEFAULTS || {};
      const { appDisplayName: _n, ...reloadOnlyFlags } = reloadFlags;
      Object.assign(featureFlags, {
        financeModule: false,
        ...reloadOnlyFlags,
      });
      log("demo_reloaded", "System", "Transport Portal", "PRD v1.8 seed");
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
