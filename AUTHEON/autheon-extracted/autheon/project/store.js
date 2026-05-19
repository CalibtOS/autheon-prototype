// AUTHEON — Shared store (PRD v1.5 prototype). Single source of truth for Driver + Admin views.
// Operational statuses: draft, published, assigned, accepted, performed, cancelled, special_case.
// Ordering party, pickup, and delivery are separate; legacy flat fields are derived for tables.

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
    "missing",
    "uploaded",
    "under_review",
    "accepted",
    "rejected",
    "correction_required",
  ];

  const SETTLEMENT_STATES = [
    "Not Started",
    "Pending",
    "Processed",
    "Paid",
    "Needs Clarification",
    "Closed",
  ];

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
      isNew: false,
      history: [],
      createdAt: "",
      pdfVersion: 0,
      performedAt: "",
      documentReviewSummary: "Not Started",
      settlementState: "Not Started",
      specialCaseReport: null,
      // Legacy flat fields (syncDisplayFields)
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
      paymentStatus: "Unpaid",
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

  function syncDisplayFields(job) {
    if (!job) return job;
    const pu = job.pickup || mkLocation();
    const del = job.delivery || mkLocation();
    job.customer = job.orderingPartyName || job.customer || "";
    job.startCity = pu.city || "";
    job.startPlz = pu.postalCode || "";
    job.startStreet = formatStreet(pu) || pu.street || "";
    job.startCompany = pu.name || job.orderingPartyName || "";
    job.endCity = del.city || "";
    job.endPlz = del.postalCode || "";
    job.endStreet = formatStreet(del) || del.street || "";
    job.endCompany = del.name || "";
    job.date = pu.date || del.date || job.date || "";
    job.dateLong = pu.dateLong || del.dateLong || job.dateLong || "";
    job.windowFrom = pu.windowFrom || "";
    job.windowTo = pu.windowTo || "";
    job.windowFlex = !!(pu.windowFlex || del.windowFlex);
    job.contactPickup = {
      name: pu.contactPerson || "",
      phone: pu.phone || "",
    };
    job.contactDelivery = {
      name: del.contactPerson || "",
      phone: del.phone || "",
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
        notes: "",
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
        notes: "",
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
        phone: "+49 40 556677",
        notes: "",
      },
    ];
  }

  function seedDocuments() {
    return [
      {
        id: "DOC-001",
        title: "General work instructions",
        category: "Operations",
        visible: true,
        scope: "Global",
        version: "v1.3",
        updatedAt: "04.05. 09:10",
      },
      {
        id: "DOC-002",
        title: "Partner terms",
        category: "Legal",
        visible: true,
        scope: "Global",
        version: "v3.0",
        updatedAt: "02.05. 14:45",
      },
      {
        id: "DOC-003",
        title: "Emergency contacts",
        category: "Safety",
        visible: true,
        scope: "Global",
        version: "v1.0",
        updatedAt: "01.05. 08:00",
      },
      {
        id: "DOC-004",
        title: "Privacy policy",
        category: "Legal",
        visible: true,
        scope: "Global",
        version: "v2.1",
        updatedAt: "29.04. 11:30",
      },
      {
        id: "DOC-005",
        title: "Imprint",
        category: "Legal",
        visible: true,
        scope: "Global",
        version: "v1.0",
        updatedAt: "29.04. 11:31",
      },
    ];
  }

  function seedNews() {
    return [
      {
        id: "NEWS-001",
        title: "New document upload flow",
        body: "After marking a tour performed, upload partner invoice and delivery proof from the tour detail screen.",
        publishedAt: "05.05. 08:00",
        visible: true,
        readBy: [],
      },
      {
        id: "NEWS-002",
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
    flex,
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
      date,
      dateLong,
      windowFrom: from,
      windowTo: to,
      windowFlex: flex,
    });
  }

  function seedJobs() {
    return [
      mk({
        id: "A-2026-00847",
        tour: "0847-26",
        orderingPartyId: "OP-001",
        orderingPartyName: "Muller Automobile GmbH",
        pickup: pu(
          "ADDR-001",
          "Muller Automobile GmbH",
          "Landsberger Str.",
          "142",
          "80339",
          "Munchen",
          "23.04.",
          "Wed, 23.04.2026",
          "08:00",
          "12:00",
          "H. Schneider",
          "+49 89 1234567",
        ),
        delivery: pu(
          "ADDR-002",
          "Autohaus Nord Berlin",
          "Chausseestr.",
          "88",
          "10115",
          "Berlin",
          "24.04.",
          "Thu, 24.04.2026",
          "10:00",
          "14:00",
          "F. Becker",
          "+49 30 9876543",
        ),
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
        pickup: pu(
          "ADDR-005",
          "Nord-Flotte Dispatch",
          "Marktplatz",
          "1",
          "28195",
          "Bremen",
          "08.05.",
          "Fri, 08.05.2026",
          "09:00",
          "12:00",
          "T. Brandt",
          "+49 421 778899",
        ),
        delivery: pu(
          "ADDR-006",
          "Hamburg Vehicle Yard",
          "Reeperbahn",
          "30",
          "22767",
          "Hamburg",
          "08.05.",
          "Fri, 08.05.2026",
          "12:00",
          "16:00",
          "M. Linke",
          "+49 40 556677",
        ),
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
        pickup: pu(
          "ADDR-003",
          "Classic Cars AG · Logistics",
          "Plieninger Str.",
          "14",
          "70565",
          "Stuttgart",
          "23.04.",
          "Wed, 23.04.2026",
          "06:00",
          "10:00",
          "S. Keller",
          "+49 711 441122",
        ),
        delivery: pu(
          "ADDR-004",
          "Classic Cars AG · Showroom",
          "Marsstr.",
          "22",
          "80339",
          "Munchen",
          "23.04.",
          "Wed, 23.04.2026",
          "14:00",
          "18:00",
          "R. Meier",
          "+49 89 441100",
        ),
        distanceKm: 232,
        vehicle: "PKW",
        vehicleModel: "BMW 3 Touring",
        plate: "S-CC 220",
        vin: "WBA8E1100K5J12345",
        axle: AXLE_THIRD,

        revenue: 220,
        driverCompensation: 175,
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
        pickup: pu(
          null,
          "AutoLogistik · Hub Koln",
          "Hohe Str.",
          "110",
          "50667",
          "Koln",
          "24.04.",
          "Thu, 24.04.2026",
          "10:00",
          "14:00",
          "Hub Koln",
          "+49 221 100200",
        ),
        delivery: pu(
          null,
          "AutoLogistik · Hub Frankfurt",
          "Zeil",
          "90",
          "60311",
          "Frankfurt",
          "24.04.",
          "Thu, 24.04.2026",
          "14:00",
          "18:00",
          "Hub Frankfurt",
          "+49 69 300400",
        ),
        distanceKm: 186,
        vehicle: "PKW",
        vehicleModel: "Audi A4",
        plate: "K-AL 845",
        vin: "WAUZZZ4M5KA000001",
        axle: AXLE_THIRD,

        revenue: 145,
        driverCompensation: 110,
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
        pickup: pu(
          null,
          "Muller Hamburg",
          "Monckebergstr.",
          "7",
          "20095",
          "Hamburg",
          "22.04.",
          "Tue, 22.04.2026",
          "",
          "",
          "",
          "",
          true,
        ),
        delivery: pu(
          null,
          "Hannover outlet",
          "Karmarschstr.",
          "30",
          "30159",
          "Hannover",
          "22.04.",
          "Tue, 22.04.2026",
          "12:00",
          "16:00",
          "",
          "",
        ),
        distanceKm: 156,
        vehicle: "PKW",
        vehicleModel: "VW Polo",
        plate: "HH-MA 88",
        vin: "WVWZZZ6RZKY098765",
        axle: AXLE_THIRD,
        driverCompensation: 165,
        status: "published",
        pdfVersion: 0,
        createdAt: "20.04. 14:00",
        history: [{ st: "published", at: "20.04. 14:30", by: "A. Bauer" }],
      }),
      mk({
        id: "A-2026-00843",
        tour: "0843-26",
        orderingPartyId: "OP-002",
        orderingPartyName: "Classic Cars AG",
        pickup: pu(
          null,
          "Classic Cars Stuttgart",
          "Konigstr.",
          "60",
          "70173",
          "Stuttgart",
          "26.04.",
          "Sat, 26.04.2026",
          "06:00",
          "10:00",
          "",
          "",
        ),
        delivery: pu(
          null,
          "Marienplatz delivery",
          "Marienplatz",
          "8",
          "80331",
          "Munchen",
          "26.04.",
          "Sat, 26.04.2026",
          "12:00",
          "16:00",
          "",
          "",
        ),
        distanceKm: 232,
        vehicle: "Van",
        vehicleModel: "Mercedes Sprinter",
        plate: "S-CC 130",
        vin: "WDB9067321V123987",
        axle: AXLE_OWN,
        driverCompensation: 280,
        status: "accepted",
        driver: DEMO_DRIVER,
        pdfVersion: 1,
        createdAt: "20.04. 09:00",
        history: [{ st: "accepted", at: "23.04. 06:11", by: DEMO_DRIVER }],
      }),
      mk({
        id: "A-2026-00842",
        tour: "0842-26",
        orderingPartyId: "OP-003",
        orderingPartyName: "Nord-Flotte GmbH",
        pickup: pu(
          "ADDR-006",
          "Hamburg depot",
          "Steinstr.",
          "5",
          "20095",
          "Hamburg",
          "21.04.",
          "Mon, 21.04.2026",
          "09:00",
          "11:00",
          "Depot lead",
          "+49 40 111222",
        ),
        delivery: pu(
          "ADDR-005",
          "Bremen hub",
          "Domshof",
          "8",
          "28195",
          "Bremen",
          "21.04.",
          "Mon, 21.04.2026",
          "13:00",
          "15:00",
          "Hub Bremen",
          "+49 421 333444",
        ),
        distanceKm: 124,
        vehicle: "PKW",
        vehicleModel: "Skoda Octavia",
        plate: "HH-NF 42",
        vin: "TMBJG7NE7K0123456",
        axle: AXLE_THIRD,
        driverCompensation: 110,
        revenue: 135,
        grossAmount: 135,
        paymentStatus: "Paid",
        settlementState: "Paid",
        documentReviewSummary: "Accepted",
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
        orderingPartyId: "OP-001",
        orderingPartyName: "Muller & Sohn KG",
        pickup: pu(
          null,
          "Berlin branch",
          "Kantstr.",
          "41",
          "10623",
          "Berlin",
          "22.04.",
          "Tue, 22.04.2026",
          "",
          "",
          "",
          "",
          true,
        ),
        delivery: pu(
          null,
          "Leipzig outlet",
          "Augustusplatz",
          "9",
          "04109",
          "Leipzig",
          "22.04.",
          "Tue, 22.04.2026",
          "",
          "",
          "",
          "",
          true,
        ),
        distanceKm: 188,
        vehicle: "SUV",
        vehicleModel: "Ford Kuga",
        plate: "B-MS 200",
        vin: "WF0AXXTTGA000111",
        axle: AXLE_OWN,
        driverCompensation: 195,
        status: "cancelled",
        driver: DEMO_DRIVER,
        history: [
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
        pickup: pu(
          null,
          "Dusseldorf showroom",
          "Konigsallee",
          "12",
          "40213",
          "Dusseldorf",
          "25.04.",
          "Fri, 25.04.2026",
          "12:00",
          "16:00",
          "",
          "",
        ),
        delivery: pu(
          null,
          "Koln hub",
          "Hohe Str.",
          "22",
          "50667",
          "Koln",
          "25.04.",
          "Fri, 25.04.2026",
          "16:00",
          "18:00",
          "",
          "",
        ),
        distanceKm: 78,
        vehicle: "PKW",
        vehicleModel: "Audi Q3",
        plate: "D-CC 80",
        vin: "WAUZZZF38K1234567",
        axle: AXLE_OWN,
        driverCompensation: 110,
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
        pickup: pu(
          null,
          "Berlin hub",
          "Invalidenstr.",
          "80",
          "10115",
          "Berlin",
          "27.04.",
          "Sat, 27.04.2026",
          "06:00",
          "09:00",
          "J. Tausch",
          "+49 30 552288",
        ),
        delivery: pu(
          "ADDR-003",
          "Stuttgart hub",
          "Konigstr.",
          "80",
          "70173",
          "Stuttgart",
          "28.04.",
          "Sun, 28.04.2026",
          "10:00",
          "14:00",
          "R. Wagner",
          "+49 711 224488",
        ),
        distanceKm: 632,
        vehicle: "PKW",
        vehicleModel: "Audi A6",
        plate: "B-AL 60",
        vin: "WAUZZZ4G9KN123456",
        axle: AXLE_OWN,
        driverCompensation: 365,
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
          startPlz: "80",
          endPlz: "",
          vehicle: "PKW",
          axle: "All",
          push: true,
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
          startPlz: "10",
          endPlz: "",
          vehicle: "SUV",
          axle: AXLE_OWN,
          push: false,
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

  function seedAudit() {
    return [
      {
        action: "prototype_loaded",
        actor: "System",
        entity: "Transport Portal demo",
        at: "05.05. 15:49",
        meta: "PRD v1.5 client-side prototype",
      },
    ];
  }

  let orderingParties = seedOrderingParties();
  let addresses = seedAddresses();
  let documents = seedDocuments();
  let newsItems = seedNews();
  let jobs = seedJobs();
  let drivers = seedDrivers();
  let admins = seedAdmins();
  let auditLog = seedAudit();
  let driverState = seedDriverState();
  let tourDocuments = [];
  let adminEmailQueue = [];
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
    documentsModule: true,
    financeModule: false,
    notificationPreferences: true,
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

  function queuePushNotification(job, context) {
    const notified = drivers
      .filter((d) => d.status === "Active" && d.prefs?.push)
      .map((d) => d.name);
    log(
      "notification_queued",
      "System",
      job.tour,
      notified.length
        ? `${context}: ${notified.join(", ")}`
        : `${context}: no active push subscribers`,
    );
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
    if (
      docs.some(
        (d) =>
          d.reviewStatus === "rejected" ||
          d.reviewStatus === "correction_required",
      )
    )
      j.documentReviewSummary = "Correction Required";
    else if (docs.some((d) => d.reviewStatus === "under_review"))
      j.documentReviewSummary = "Under Review";
    else if (docs.every((d) => d.reviewStatus === "accepted"))
      j.documentReviewSummary = "Accepted";
    else if (docs.some((d) => d.reviewStatus === "uploaded"))
      j.documentReviewSummary = "Uploaded";
    else j.documentReviewSummary = "Pending";
  }

  function reconcileJobInvoiceFromTourDocuments(jobId) {
    const j = jobs.find((x) => x.id === jobId);
    if (!j) return;
    const invoices = tourDocuments.filter(
      (d) =>
        d.jobId === jobId &&
        (d.documentType === "partner_invoice" || d.documentType === "invoice"),
    );
    const accepted = invoices.filter(
      (d) => d.reviewStatus === "accepted" || d.processed,
    );
    if (!accepted.length) return;
    j.invoiceReceived = true;
    const primary = accepted[accepted.length - 1];
    if (!j.invoiceNumber && primary.fileName) {
      j.invoiceNumber = String(primary.fileName).replace(/\.[^.]+$/i, "");
    }
    if (j.paymentStatus === "Invoice Missing") {
      j.paymentStatus = "Invoice Received";
    }
  }

  function locationFromForm(prefix, form) {
    const p = prefix || "";
    const cap = (k) => p + k.charAt(0).toUpperCase() + k.slice(1);
    return mkLocation({
      locationId: form[cap("locationId")] || form[`${p}LocationId`] || null,
      name: form[cap("name")] || form[`${p}Name`] || "",
      street: form[cap("street")] || form[`${p}Street`] || "",
      houseNumber:
        form[cap("houseNumber")] || form[`${p}HouseNumber`] || "",
      postalCode: form[cap("postalCode")] || form[`${p}Plz`] || form[`${p}PostalCode`] || "",
      city: form[cap("city")] || form[`${p}City`] || "",
      country: form[cap("country")] || form[`${p}Country`] || "DE",
      contactPerson:
        form[cap("contactPerson")] ||
        form[`${p}Contact`] ||
        form[`cName${p === "pickup" ? "1" : "2"}`] ||
        "",
      phone:
        form[cap("phone")] ||
        form[`${p}Phone`] ||
        form[`cPhone${p === "pickup" ? "1" : "2"}`] ||
        "",
      date: form[cap("date")] || form.date || "",
      dateLong: form[cap("dateLong")] || form.dateLong || form.date || "",
      windowFrom:
        form[cap("windowFrom")] ||
        form[`${p}From`] ||
        (p === "pickup" ? form.from : form.to) ||
        form.windowFrom ||
        "",
      windowTo:
        form[cap("windowTo")] ||
        form[`${p}To`] ||
        form.windowTo ||
        "",
      windowFlex: !!(form[cap("windowFlex")] || form.windowFlex),
    });
  }

  const api = {
    STATUSES,
    DOC_REVIEW,
    SETTLEMENT_STATES,
    DEMO_DRIVER,
    DEMO_ADMIN,
    AXLE_OWN,
    AXLE_THIRD,
    syncDisplayFields,

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
    getOrderingParties: () => orderingParties,
    getAddresses: () => addresses,
    getDocuments: () => documents,
    getNews: () => newsItems.filter((n) => n.visible !== false),
    getAuditLog: () => auditLog,
    getAdminEmailQueue: () => adminEmailQueue.slice(),

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
      if (driverState.cancelledIds.has(j.id)) return true;
      if (driverState.acceptedIds.has(j.id)) return true;
      if (driverState.performedIds.has(j.id)) return true;
      if (driverState.specialCaseIds.has(j.id)) return true;
      if (j.status === "cancelled" && j.driver === DEMO_DRIVER) return true;
      if (
        j.driver === DEMO_DRIVER &&
        ["assigned", "accepted", "special_case", "performed"].includes(j.status)
      )
        return true;
      return false;
    },

    isAccepted: (id) => driverState.acceptedIds.has(id),
    isPerformed: (id) => driverState.performedIds.has(id),
    isSpecialCase: (id) => driverState.specialCaseIds.has(id),

    addOrderingParty(data) {
      const op = {
        id: `OP-${String(orderingParties.length + 1).padStart(3, "0")}`,
        name: data.name || "New ordering party",
        type: data.type || "",
        contact: data.contact || "",
        phone: data.phone || "",
        email: data.email || "",
        billingNotes: data.billingNotes || "",
        instructions: data.instructions || "",
      };
      orderingParties.unshift(op);
      log("ordering_party_created", DEMO_ADMIN, op.name, op.id);
      emit();
      return op;
    },

    addAddress(data) {
      const addr = {
        id: `ADDR-${String(addresses.length + 1).padStart(3, "0")}`,
        label: data.label || data.name || "New address",
        street: data.street || "",
        houseNumber: data.houseNumber || "",
        postalCode: data.postalCode || "",
        city: data.city || "",
        country: data.country || "DE",
        contactPerson: data.contactPerson || "",
        phone: data.phone || "",
        notes: data.notes || "",
      };
      addresses.unshift(addr);
      log("address_created", DEMO_ADMIN, addr.label, addr.id);
      emit();
      return addr;
    },

    markNewsRead(newsId, readerId) {
      const n = newsItems.find((x) => x.id === newsId);
      if (!n) return { ok: false };
      const rid = readerId || api.getCurrentDriver()?.id || DEMO_DRIVER;
      if (!n.readBy.includes(rid)) n.readBy.push(rid);
      emit();
      return { ok: true };
    },

    addNewsItem(data) {
      const item = {
        id: `NEWS-${String(newsItems.length + 1).padStart(3, "0")}`,
        title: data.title || "Announcement",
        body: data.body || "",
        publishedAt: data.publishedAt || nowStamp(),
        visible: data.visible !== false,
        readBy: [],
      };
      newsItems.unshift(item);
      log("news_item_created", DEMO_ADMIN, item.title, item.id);
      emit();
      return item;
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

    reportProblemNotPerformable(id, reason, message) {
      const j = api.getJob(id);
      if (!j || !["assigned", "accepted"].includes(j.status))
        return { ok: false, reason: "invalid_state" };
      if (j.driver && j.driver !== DEMO_DRIVER)
        return { ok: false, reason: "not_assigned_driver" };
      j.status = "special_case";
      j.specialCaseReport = {
        type: "not_performable",
        reason: reason || "other",
        message: message || "",
        reportedAt: nowStamp(),
        reportedBy: DEMO_DRIVER,
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
      queueAdminEmailAlert("special_case_created", id, message);
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
        j.status = "assigned";
        j.specialCaseReport = null;
        driverState.specialCaseIds.delete(id);
        j.history = [
          ...(j.history || []),
          {
            st: "assigned",
            at: nowStamp(),
            by: DEMO_ADMIN,
            meta: note || "Special case resolved → reassigned",
          },
        ];
        log("special_case_resolved", DEMO_ADMIN, j.tour, "Reassigned");
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

    assignJob(id, driverName) {
      const j = api.getJob(id);
      if (!j || j.status !== "draft") return { ok: false };
      j.status = "assigned";
      j.driver = driverName || DEMO_DRIVER;
      bumpPdf(j);
      j.history = [
        ...(j.history || []),
        { st: "assigned", at: nowStamp(), by: "A. Bauer" },
      ];
      log("job_assigned", DEMO_ADMIN, j.tour, `Driver: ${j.driver}`);
      queuePushNotification(j, "assign");
      queueAdminEmailAlert("job_assigned", id, `Driver: ${j.driver}`);
      emit();
      return { ok: true };
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
      const seq = nextTourSeq++;
      const tour = `${String(seq).padStart(4, "0")}-26`;
      const id = `A-2026-${String(seq).padStart(5, "0")}`;
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
      if (!pickup.city && form.startCity) {
        Object.assign(pickup, {
          city: form.startCity,
          postalCode: form.startPlz,
          street: form.startStreet,
          name: form.startCompany || form.customer,
        });
      }
      if (!delivery.city && form.endCity) {
        Object.assign(delivery, {
          city: form.endCity,
          postalCode: form.endPlz,
          street: form.endStreet,
          name: form.endCompany,
        });
      }
      const newJob = mk({
        id,
        tour,
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
        revenue: null,
        netAmount: null,
        vatRate: 19,
        grossAmount: null,
        expenses:
          parseFloat(String(form.expenses || "").replace(",", ".")) || null,
        notes: form.notes,
        notesDriver: form.notesDriver || "",
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
        documentType: opts.documentType || "partner_invoice",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: opts.source || "driver",
        notes: opts.notes || "",
      };
      tourDocuments.unshift(row);
      reconcileDocumentReviewSummary(jobId);
      log(
        "tour_document_uploaded",
        d.name,
        row.fileName,
        `${jobId} · ${row.documentType}`,
      );
      queueAdminEmailAlert("tour_document_uploaded", jobId, row.documentType);
      emit();
      return { ok: true, id: row.id };
    },

    updateTourDocument(id, patch) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false };
      const jobId = doc.jobId;
      if (patch.reviewStatus !== undefined) {
        const st = String(patch.reviewStatus);
        if (!DOC_REVIEW.includes(st)) return { ok: false, reason: "bad_status" };
        doc.reviewStatus = st;
        if (st === "accepted") doc.processed = true;
        if (st !== "rejected") doc.rejectionReason = "";
      }
      if (patch.processed !== undefined) doc.processed = !!patch.processed;
      if (patch.documentType !== undefined)
        doc.documentType = patch.documentType;
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
        doc.processed = false;
      }
      reconcileDocumentReviewSummary(jobId);
      reconcileJobInvoiceFromTourDocuments(jobId);
      log("tour_document_updated", DEMO_ADMIN, doc.fileName, doc.reviewStatus);
      emit();
      return { ok: true };
    },

    rejectTourDocument(id, reason) {
      const doc = tourDocuments.find((x) => x.id === id);
      if (!doc) return { ok: false };
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
      emit();
      return { ok: true };
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
        documentType: opts.documentType || "partner_invoice",
        reviewStatus: "uploaded",
        rejectionReason: "",
        processed: false,
        source: "admin",
        notes: String(opts.notes || "").trim(),
      };
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
        return { ok: false, reason: "use_partner_invoices" };
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
        if (patch[key] !== undefined) j[key] = patch[key];
      }
      syncDisplayFields(j);
      log(
        "financial_updated",
        DEMO_ADMIN,
        j.tour,
        "Ledger fields updated (invoice via partner invoices)",
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
      drivers = seedDrivers();
      admins = seedAdmins();
      auditLog = seedAudit();
      driverState = seedDriverState();
      tourDocuments = [];
      adminEmailQueue = [];
      nextTourSeq = 849;
      branding.appDisplayName =
        window.AUTHEON_BRANDING_DEFAULTS?.appDisplayName || "Transport Portal";
      const reloadFlags = window.AUTHEON_FLAG_DEFAULTS || {};
      const { appDisplayName: _n, ...reloadOnlyFlags } = reloadFlags;
      Object.assign(featureFlags, {
        documentsModule: true,
        financeModule: false,
        notificationPreferences: true,
        ...reloadOnlyFlags,
      });
      log("demo_reloaded", "System", "Transport Portal", "PRD v1.5 seed");
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
