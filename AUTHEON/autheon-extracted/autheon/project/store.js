// AUTHEON — Shared store (prototype). Single source of truth for Driver + Admin views.
// Business rules aligned with PRD v1.2 Phase 1 (publish/assign only from Draft; no Published→Assigned).

window.AuthStore = (() => {
  const listeners = new Set();
  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  const emit = () => listeners.forEach((fn) => fn());

  /** Logged-in driver persona for this demo (matches assigned/accepted seed rows). */
  const DEMO_DRIVER = "Jordan Blake";
  const DEMO_ADMIN = "Anna Bauer";

  const STATUSES = {
    draft: { i18n: "status.draft", cls: "draft" },
    published: { i18n: "status.published", cls: "published" },
    assigned: { i18n: "status.assigned", cls: "assigned" },
    accepted: { i18n: "status.accepted", cls: "accepted" },
    return_requested: {
      i18n: "status.return_requested",
      cls: "return_requested",
    },
    completed: { i18n: "status.completed", cls: "completed" },
    cancelled: { i18n: "status.cancelled", cls: "cancelled" },
  };

  const mk = (over) => ({
    id: "",
    tour: "",
    customer: "",
    category: "Standard",
    startCity: "",
    startPlz: "",
    startStreet: "",
    startCompany: "",
    endCity: "",
    endPlz: "",
    endStreet: "",
    endCompany: "",
    distanceKm: 0,
    date: "",
    dateLong: "",
    windowFrom: "",
    windowTo: "",
    windowFlex: false,
    vehicle: "",
    vehicleModel: "",
    plate: "",
    vin: "",
    axle: "Own axle",
    price: 0,
    contactPickup: { name: "", phone: "" },
    contactDelivery: { name: "", phone: "" },
    notes: "",
    notesDriver: "",
    status: "draft",
    driver: null,
    isNew: false,
    hasReturnRequest: false,
    returnReason: "",
    returnMessage: "",
    preReturnStatus: null,
    history: [],
    createdAt: "",
    pdfVersion: 0,
    completedAt: "",
    // Financial (PRD task 21 / domain model)
    revenue: null,
    driverCompensation: null,
    expenses: null,
    invoiceReceived: false,
    invoiceType: "",
    invoiceNumber: "",
    paymentStatus: "Unpaid",
    financialNotes: "",
    netAmount: null,
    vatRate: 19,
    grossAmount: null,
    ...over,
  });

  const drivers = [
    {
      id: "DRV-0228",
      name: DEMO_DRIVER,
      company: "Blake Transport Services",
      partnerId: "AU-41-0228",
      address: "Landsberger Str. 22, 80339 München",
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
        axle: "Own axle",
        push: false,
      },
    },
  ];

  const admins = [
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

  const customers = [
    {
      id: "CUST-001",
      name: "Muller Automobile GmbH",
      type: "Dealer group",
      pickup: "Landsberger Str. 142, 80339 München",
      delivery: "Chausseestr. 88, 10115 Berlin",
      contact: "H. Schneider",
      phone: "+49 89 1234567",
      instructions: "Keys at reception; logistics yard requires safety vest.",
    },
    {
      id: "CUST-002",
      name: "Classic Cars AG",
      type: "Fleet customer",
      pickup: "Plieninger Str. 14, 70565 Stuttgart",
      delivery: "Marsstr. 22, 80339 München",
      contact: "S. Keller",
      phone: "+49 711 441122",
      instructions:
        "Historic vehicles require enclosed transport confirmation.",
    },
  ];

  const documents = [
    {
      id: "DOC-001",
      title: "General work instructions",
      category: "Operations",
      visible: true,
      scope: "Global",
      version: "v1.2",
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

  const featureFlags = {
    ...(window.AUTHEON_FLAG_DEFAULTS || { notificationPreferences: false }),
  };

  const auditLog = [
    {
      action: "prototype_loaded",
      actor: "System",
      entity: "AUTHEON demo",
      at: "05.05. 15:49",
      meta: "Client-side PRD coverage prototype",
    },
  ];

  /** Partner invoice file references only (no binary persisted) — mock uploads from Driver PWA. */
  const invoiceUploads = [];

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

  function isAllowedInvoiceFile(file) {
    if (!file || !file.name) return false;
    const ty = (file.type || "").trim().toLowerCase();
    if (ty === "application/pdf" || /^image\/(jpeg|png|webp|gif)$/.test(ty))
      return true;
    const ext = file.name.split(".").pop().toLowerCase();
    return ["pdf", "jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  }

  const jobs = [
    mk({
      id: "A-2026-00847",
      tour: "0847-26",
      customer: "Müller Automobile GmbH",
      startCity: "München",
      startPlz: "80339",
      startStreet: "Landsberger Str. 142",
      startCompany: "Müller Automobile GmbH",
      endCity: "Berlin",
      endPlz: "10115",
      endStreet: "Chausseestr. 88",
      endCompany: "Autohaus Nord Berlin",
      distanceKm: 585,
      date: "23.04.",
      dateLong: "Wed, 23.04.2026",
      windowFrom: "08:00",
      windowTo: "12:00",
      vehicle: "SUV",
      vehicleModel: "VW Tiguan 2.0 TDI",
      plate: "M-AB 1234",
      vin: "WVGZZZ5NZKW123456",
      axle: "Own axle",
      price: 340,
      revenue: 340,
      netAmount: 285.71,
      grossAmount: 340,
      driverCompensation: 260,
      expenses: 12,
      invoiceReceived: false,
      invoiceType: "Net",
      invoiceNumber: "",
      paymentStatus: "Unpaid",
      contactPickup: { name: "H. Schneider", phone: "+49 89 1234567" },
      contactDelivery: { name: "F. Becker", phone: "+49 30 9876543" },
      notes:
        "Key handover at reception. Vehicle prepared, fuel approx. ½ tank. Ref: KR-88213.",
      notesDriver: "Please confirm arrival 15 minutes early.",
      status: "published",
      pdfVersion: 1,
      history: [
        { st: "draft", at: "23.04. 09:14", by: "A. Bauer" },
        { st: "published", at: "23.04. 11:02", by: "A. Bauer" },
      ],
      createdAt: "23.04. 09:14",
    }),
    mk({
      id: "A-2026-00848",
      tour: "0848-26",
      customer: "Nord-Flotte GmbH",
      startCity: "Bremen",
      startPlz: "28195",
      startStreet: "Marktplatz 1",
      startCompany: "Nord-Flotte Dispatch",
      endCity: "Hamburg",
      endPlz: "22767",
      endStreet: "Reeperbahn 30",
      endCompany: "Hamburg Vehicle Yard",
      distanceKm: 124,
      date: "08.05.",
      dateLong: "Fri, 08.05.2026",
      windowFrom: "09:00",
      windowTo: "12:00",
      vehicle: "PKW",
      vehicleModel: "Skoda Superb",
      plate: "HB-NF 848",
      vin: "TMBJH7NP8P0123848",
      axle: "Own axle",
      price: 185,
      revenue: 185,
      driverCompensation: 145,
      status: "assigned",
      driver: DEMO_DRIVER,
      pdfVersion: 1,
      contactPickup: { name: "T. Brandt", phone: "+49 421 778899" },
      contactDelivery: { name: "M. Linke", phone: "+49 40 556677" },
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
      customer: "Classic Cars AG",
      startCity: "Stuttgart",
      startPlz: "70565",
      startStreet: "Plieninger Str. 14",
      startCompany: "Classic Cars AG · Logistics",
      endCity: "München",
      endPlz: "80339",
      endStreet: "Marsstr. 22",
      endCompany: "Classic Cars AG · Showroom",
      distanceKm: 232,
      date: "23.04.",
      dateLong: "Wed, 23.04.2026",
      windowFrom: "06:00",
      windowTo: "10:00",
      vehicle: "PKW",
      vehicleModel: "BMW 3 Touring",
      plate: "S-CC 220",
      vin: "WBA8E1100K5J12345",
      axle: "Third-party axle",
      price: 220,
      revenue: 220,
      driverCompensation: 175,
      expenses: 0,
      status: "return_requested",
      driver: DEMO_DRIVER,
      hasReturnRequest: true,
      returnReason: "return",
      returnMessage:
        "Customer postponed pickup; requesting dispatch to re-open tour.",
      preReturnStatus: "assigned",
      pdfVersion: 1,
      history: [
        { st: "draft", at: "22.04. 16:11", by: "A. Bauer" },
        { st: "assigned", at: "23.04. 07:55", by: "A. Bauer" },
        { st: "return_requested", at: "23.04. 08:40", by: DEMO_DRIVER },
      ],
      createdAt: "22.04. 16:11",
    }),
    mk({
      id: "A-2026-00845",
      tour: "0845-26",
      customer: "AutoLogistik KG",
      startCity: "Köln",
      startPlz: "50667",
      startStreet: "Hohe Str. 110",
      startCompany: "AutoLogistik · Hub Köln",
      endCity: "Frankfurt",
      endPlz: "60311",
      endStreet: "Zeil 90",
      endCompany: "AutoLogistik · Hub Frankfurt",
      distanceKm: 186,
      date: "24.04.",
      dateLong: "Thu, 24.04.2026",
      windowFrom: "10:00",
      windowTo: "14:00",
      vehicle: "PKW",
      vehicleModel: "Audi A4",
      plate: "K-AL 845",
      vin: "WAUZZZ4M5KA000001",
      axle: "Third-party axle",
      price: 145,
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
      customer: "Müller Automobile GmbH",
      startCity: "Hamburg",
      startPlz: "20095",
      startStreet: "Mönckebergstr. 7",
      endCity: "Hannover",
      endPlz: "30159",
      endStreet: "Karmarschstr. 30",
      distanceKm: 156,
      date: "22.04.",
      dateLong: "Tue, 22.04.2026",
      windowFlex: true,
      vehicle: "PKW",
      vehicleModel: "VW Polo",
      plate: "HH-MA 88",
      vin: "WVWZZZ6RZKY098765",
      axle: "Third-party axle",
      price: 165,
      status: "published",
      pdfVersion: 1,
      createdAt: "20.04. 14:00",
      history: [{ st: "published", at: "20.04. 14:30", by: "A. Bauer" }],
    }),
    mk({
      id: "A-2026-00843",
      tour: "0843-26",
      customer: "Classic Cars AG",
      startCity: "Stuttgart",
      startPlz: "70173",
      startStreet: "Königstr. 60",
      endCity: "München",
      endPlz: "80331",
      endStreet: "Marienplatz 8",
      distanceKm: 232,
      date: "26.04.",
      dateLong: "Sat, 26.04.2026",
      windowFrom: "06:00",
      windowTo: "10:00",
      vehicle: "Van",
      vehicleModel: "Mercedes Sprinter",
      plate: "S-CC 130",
      vin: "WDB9067321V123987",
      axle: "Own axle",
      price: 280,
      status: "accepted",
      driver: DEMO_DRIVER,
      pdfVersion: 1,
      createdAt: "20.04. 09:00",
      history: [{ st: "accepted", at: "23.04. 06:11", by: DEMO_DRIVER }],
    }),
    mk({
      id: "A-2026-00842",
      tour: "0842-26",
      customer: "Nord-Flotte GmbH",
      startCity: "Hamburg",
      startPlz: "20095",
      startStreet: "Steinstr. 5",
      endCity: "Bremen",
      endPlz: "28195",
      endStreet: "Domshof 8",
      distanceKm: 124,
      date: "21.04.",
      dateLong: "Mon, 21.04.2026",
      windowFrom: "09:00",
      windowTo: "11:00",
      vehicle: "PKW",
      vehicleModel: "Skoda Octavia",
      plate: "HH-NF 42",
      vin: "TMBJG7NE7K0123456",
      axle: "Third-party axle",
      price: 135,
      revenue: 135,
      paymentStatus: "Paid",
      invoiceReceived: true,
      invoiceNumber: "INV-NF-2188",
      status: "completed",
      driver: DEMO_DRIVER,
      completedAt: "21.04. 12:48",
      pdfVersion: 1,
      history: [{ st: "completed", at: "21.04. 12:48", by: DEMO_DRIVER }],
      createdAt: "19.04. 13:00",
    }),
    mk({
      id: "A-2026-00841",
      tour: "0841-26",
      customer: "Müller & Sohn KG",
      startCity: "Berlin",
      startPlz: "10623",
      startStreet: "Kantstr. 41",
      endCity: "Leipzig",
      endPlz: "04109",
      endStreet: "Augustusplatz 9",
      distanceKm: 188,
      date: "22.04.",
      dateLong: "Tue, 22.04.2026",
      windowFlex: true,
      vehicle: "SUV",
      vehicleModel: "Ford Kuga",
      plate: "B-MS 200",
      vin: "WF0AXXTTGA000111",
      axle: "Own axle",
      price: 195,
      status: "cancelled",
      driver: DEMO_DRIVER,
      history: [{ st: "cancelled", at: "21.04. 22:00", by: "Dispatch" }],
      createdAt: "18.04. 15:00",
    }),
    mk({
      id: "A-2026-00840",
      tour: "0840-26",
      customer: "Classic Cars AG",
      startCity: "Düsseldorf",
      startPlz: "40213",
      startStreet: "Königsallee 12",
      endCity: "Köln",
      endPlz: "50667",
      endStreet: "Hohe Str. 22",
      distanceKm: 78,
      date: "25.04.",
      dateLong: "Fri, 25.04.2026",
      windowFrom: "12:00",
      windowTo: "16:00",
      vehicle: "PKW",
      vehicleModel: "Audi Q3",
      plate: "D-CC 80",
      vin: "WAUZZZF38K1234567",
      axle: "Own axle",
      price: 110,
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
      customer: "AutoLogistik KG",
      startCity: "Berlin",
      startPlz: "10115",
      startStreet: "Invalidenstr. 80",
      endCity: "Stuttgart",
      endPlz: "70173",
      endStreet: "Königstr. 80",
      distanceKm: 632,
      date: "27.04.",
      dateLong: "Sat, 27.04.2026",
      windowFrom: "06:00",
      windowTo: "09:00",
      vehicle: "PKW",
      vehicleModel: "Audi A6",
      plate: "B-AL 60",
      vin: "WAUZZZ4G9KN123456",
      axle: "Own axle",
      price: 365,
      status: "published",
      pdfVersion: 1,
      contactPickup: { name: "J. Tausch", phone: "+49 30 552288" },
      contactDelivery: { name: "R. Wagner", phone: "+49 711 224488" },
      createdAt: "20.04. 17:00",
    }),
    mk({
      id: "A-2026-00838",
      tour: "0838-26",
      customer: "Nord-Flotte GmbH",
      startCity: "Bremen",
      startPlz: "28195",
      startStreet: "Marktplatz 1",
      endCity: "Hamburg",
      endPlz: "22767",
      endStreet: "Reeperbahn 30",
      distanceKm: 124,
      date: "25.04.",
      dateLong: "Fri, 25.04.2026",
      windowFrom: "10:00",
      windowTo: "12:00",
      vehicle: "Light truck <3.5t",
      vehicleModel: "Iveco Daily",
      plate: "HB-NF 11",
      vin: "ZCFC135C805678123",
      axle: "Own axle",
      price: 175,
      status: "published",
      pdfVersion: 1,
      contactPickup: { name: "F. Brandt", phone: "+49 421 113355" },
      contactDelivery: { name: "G. Linke", phone: "+49 40 998822" },
      createdAt: "22.04. 09:30",
    }),
    mk({
      id: "A-2026-00837",
      tour: "0837-26",
      customer: "Müller Automobile GmbH",
      startCity: "Nürnberg",
      startPlz: "90402",
      startStreet: "Königstr. 2",
      endCity: "Frankfurt",
      endPlz: "60311",
      endStreet: "Zeil 56",
      distanceKm: 226,
      date: "28.04.",
      dateLong: "Sun, 28.04.2026",
      windowFrom: "08:00",
      windowTo: "10:00",
      vehicle: "PKW",
      vehicleModel: "VW Golf",
      plate: "N-MA 14",
      vin: "WVWZZZ1KZAW123456",
      axle: "Third-party axle",
      price: 185,
      status: "published",
      pdfVersion: 1,
      createdAt: "23.04. 08:00",
    }),
  ];

  const driverState = {
    acceptedIds: new Set(["A-2026-00845", "A-2026-00843"]),
    completedIds: new Set(["A-2026-00842"]),
    pendingIds: new Set(["A-2026-00846"]),
  };

  let nextTourSeq = 849;

  function parseJobDate(job) {
    const m = job.dateLong && job.dateLong.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const m2 = job.date && job.date.match(/(\d{2})\.(\d{2})\./);
    if (m2) return new Date(2026, +m2[2] - 1, +m2[1]);
    return null;
  }

  function returnDeadline(job) {
    const d = parseJobDate(job);
    if (!d || Number.isNaN(d.getTime())) return null;
    const deadline = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate() - 1,
      23,
      59,
      59,
      999,
    );
    return deadline;
  }

  function isReturnDeadlinePassed(job) {
    const deadline = returnDeadline(job);
    if (!deadline) return false;
    return new Date() > deadline;
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

  const api = {
    STATUSES,
    DEMO_DRIVER,
    DEMO_ADMIN,
    statusLabel: (s) => {
      const key = STATUSES[s]?.i18n;
      if (key && window.I18n?.t) return window.I18n.t(key);
      return s;
    },
    statusCls: (s) => STATUSES[s]?.cls || "",
    returnDeadline,
    isReturnDeadlinePassed,

    getJobs: () => jobs,
    getJob: (id) => jobs.find((j) => j.id === id),
    getDrivers: () => drivers,
    getAdmins: () => admins,
    getCustomers: () => customers,
    getDocuments: () => documents,
    getAuditLog: () => auditLog,
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
      if (driverState.acceptedIds.has(j.id)) return true;
      if (driverState.completedIds.has(j.id)) return true;
      if (driverState.pendingIds.has(j.id)) return true;
      if (
        j.driver === DEMO_DRIVER &&
        ["assigned", "accepted", "return_requested"].includes(j.status)
      )
        return true;
      return false;
    },

    isAccepted: (id) => driverState.acceptedIds.has(id),
    isCompleted: (id) => driverState.completedIds.has(id),
    isPending: (id) => driverState.pendingIds.has(id),

    acceptJob(id) {
      const j = api.getJob(id);
      if (!j || j.status !== "published")
        return { ok: false, reason: "not_available" };
      if (!api.isCurrentDriverActive())
        return { ok: false, reason: "driver_restricted" };
      j.preReturnStatus = null;
      j.status = "accepted";
      j.driver = DEMO_DRIVER;
      j.pdfVersion = Math.max(1, j.pdfVersion || 0);
      j.history = [
        ...(j.history || []),
        { st: "accepted", at: nowStamp(), by: DEMO_DRIVER },
      ];
      driverState.acceptedIds.add(id);
      log("job_accepted", DEMO_DRIVER, j.tour, "Binding slide confirmation");
      emit();
      return { ok: true };
    },

    completeJob(id) {
      const j = api.getJob(id);
      if (!j || !["assigned", "accepted"].includes(j.status))
        return { ok: false };
      j.status = "completed";
      j.completedAt = nowStamp();
      j.history = [
        ...(j.history || []),
        { st: "completed", at: nowStamp(), by: j.driver || DEMO_DRIVER },
      ];
      driverState.completedIds.add(id);
      driverState.acceptedIds.delete(id);
      log(
        "job_completed",
        j.driver || DEMO_DRIVER,
        j.tour,
        "Driver marked completed",
      );
      emit();
      return { ok: true };
    },

    submitReturn(id, reason, message) {
      const j = api.getJob(id);
      if (!j || !["assigned", "accepted"].includes(j.status))
        return { ok: false, reason: "invalid_state" };
      if (isReturnDeadlinePassed(j)) return { ok: false, reason: "deadline" };
      j.preReturnStatus = j.status;
      j.returnReason = reason;
      j.returnMessage = message;
      j.hasReturnRequest = true;
      j.status = "return_requested";
      j.history = [
        ...(j.history || []),
        { st: "return_requested", at: nowStamp(), by: DEMO_DRIVER },
      ];
      driverState.pendingIds.add(id);
      log("return_requested", DEMO_DRIVER, j.tour, `${reason}: ${message}`);
      emit();
      return { ok: true };
    },

    approveReturn(id) {
      const j = api.getJob(id);
      if (!j || j.status !== "return_requested") return { ok: false };
      j.driver = null;
      j.hasReturnRequest = false;
      j.status = "draft";
      j.history = [
        ...(j.history || []),
        {
          st: "draft",
          at: nowStamp(),
          by: "A. Bauer",
          meta: "Return approved → Draft",
        },
      ];
      driverState.pendingIds.delete(id);
      driverState.acceptedIds.delete(id);
      log(
        "return_approved",
        DEMO_ADMIN,
        j.tour,
        "Assignment removed; job returned to Draft",
      );
      emit();
      return { ok: true };
    },

    rejectReturn(id, note) {
      const j = api.getJob(id);
      if (!j || j.status !== "return_requested") return { ok: false };
      const restore = j.preReturnStatus || "accepted";
      j.status = restore;
      j.hasReturnRequest = false;
      j.history = [
        ...(j.history || []),
        {
          st: restore,
          at: nowStamp(),
          by: "A. Bauer",
          meta: `Return rejected${note ? `: ${note}` : ""}`,
        },
      ];
      driverState.pendingIds.delete(id);
      log(
        "return_rejected",
        DEMO_ADMIN,
        j.tour,
        note || "Kept previous execution state",
      );
      emit();
      return { ok: true };
    },

    publishJob(id) {
      const j = api.getJob(id);
      if (!j || j.status !== "draft") return { ok: false };
      j.status = "published";
      j.isNew = false;
      j.pdfVersion = Math.max(1, j.pdfVersion || 0);
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
      const notified = drivers
        .filter((d) => d.status === "Active" && d.prefs?.push)
        .map((d) => d.name);
      log(
        "notification_queued",
        "System",
        j.tour,
        notified.length
          ? `Matched: ${notified.join(", ")}`
          : "No active matching preferences",
      );
      emit();
      return { ok: true };
    },

    assignJob(id, driverName) {
      const j = api.getJob(id);
      if (!j || j.status !== "draft") return { ok: false };
      j.status = "assigned";
      j.driver = driverName || DEMO_DRIVER;
      j.pdfVersion = Math.max(1, j.pdfVersion || 0);
      j.history = [
        ...(j.history || []),
        { st: "assigned", at: nowStamp(), by: "A. Bauer" },
      ];
      log("job_assigned", DEMO_ADMIN, j.tour, `Driver: ${j.driver}`);
      emit();
      return { ok: true };
    },

    cancelJob(id) {
      const j = api.getJob(id);
      if (
        !j ||
        !["accepted", "assigned", "return_requested"].includes(j.status)
      )
        return { ok: false };
      j.status = "cancelled";
      j.history = [
        ...(j.history || []),
        { st: "cancelled", at: nowStamp(), by: "A. Bauer" },
      ];
      driverState.acceptedIds.delete(id);
      driverState.pendingIds.delete(id);
      log("job_cancelled", DEMO_ADMIN, j.tour, "Admin cancellation");
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
      const axleMap = {
        Eigenachse: "Own axle",
        Fremdachse: "Third-party axle",
        "Own axle": "Own axle",
        "Third-party axle": "Third-party axle",
      };
      const axle = axleMap[form.axle] || form.axle || "Own axle";
      const price =
        parseFloat(String(form.price || "0").replace(",", ".")) || 0;
      const dist = parseInt(form.distance || form.distanceKm || 0, 10) || 0;
      const vat = 19;
      const net =
        price > 0 ? Math.round((price / (1 + vat / 100)) * 100) / 100 : null;
      const newJob = mk({
        id,
        tour,
        customer: form.customer || "New customer",
        startCity: form.startCity,
        startPlz: form.startPlz,
        startStreet: form.startStreet,
        startCompany: form.startCompany || form.customer,
        endCity: form.endCity,
        endPlz: form.endPlz,
        endStreet: form.endStreet,
        endCompany: form.endCompany || form.customer,
        distanceKm: dist,
        date: form.date,
        dateLong: form.dateLong || form.date,
        windowFrom: form.from || form.windowFrom,
        windowTo: form.to || form.windowTo,
        vehicle: form.vehicleType || form.vehicle || "PKW",
        vehicleModel:
          [form.brand, form.model].filter(Boolean).join(" ").trim() || "—",
        plate: form.plate,
        vin: form.vin,
        axle,
        price,
        revenue: price,
        netAmount: net,
        vatRate: vat,
        grossAmount: price,
        contactPickup: { name: form.cName1, phone: form.cPhone1 },
        contactDelivery: { name: form.cName2, phone: form.cPhone2 },
        notes: form.notes,
        notesDriver: form.notesDriver || "",
        status: "draft",
        isNew: true,
        createdAt: nowStamp(),
        pdfVersion: 0,
        history: [{ st: "draft", at: nowStamp(), by: "A. Bauer" }],
      });
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

    updateFinancial(id, patch) {
      const j = api.getJob(id);
      if (!j) return { ok: false };
      Object.assign(j, patch);
      log(
        "financial_updated",
        DEMO_ADMIN,
        j.tour,
        Object.keys(patch).join(", "),
      );
      emit();
      return { ok: true };
    },

    setDriverStatus(id, status) {
      const d = drivers.find((x) => x.id === id);
      if (!d) return { ok: false };
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

    addCustomer(data) {
      const c = {
        id: `CUST-${String(customers.length + 1).padStart(3, "0")}`,
        ...data,
      };
      customers.unshift(c);
      log("customer_created", DEMO_ADMIN, c.name, "Master data");
      emit();
      return c;
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

    exportJobsCsv() {
      const cols = [
        "tour",
        "customer",
        "startCompany",
        "startPlz",
        "startCity",
        "endCompany",
        "endPlz",
        "endCity",
        "date",
        "windowFrom",
        "windowTo",
        "driver",
        "status",
        "vehicle",
        "vehicleModel",
        "axle",
        "revenue",
        "driverCompensation",
        "expenses",
        "invoiceReceived",
        "invoiceType",
        "invoiceNumber",
        "paymentStatus",
        "notes",
      ];
      const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const rows = [cols.join(",")].concat(
        jobs.map((j) => cols.map((c) => esc(j[c])).join(",")),
      );
      log(
        "jobs_exported",
        DEMO_ADMIN,
        "CSV/XLSX continuity",
        `${jobs.length} rows`,
      );
      emit();
      return rows.join("\n");
    },

    transportOrderText(id) {
      const j = api.getJob(id);
      if (!j) return "";
      return [
        "AUTHEON TRANSPORT ORDER",
        `Tour: ${j.tour}`,
        `Category: ${j.category}`,
        `Issued: ${nowStamp()}`,
        `Driver: ${j.driver || "To be assigned"}`,
        `Customer: ${j.customer}`,
        `Pickup: ${j.startCompany || j.customer}, ${j.startStreet}, ${j.startPlz} ${j.startCity}`,
        `Pickup contact: ${j.contactPickup?.name || ""} ${j.contactPickup?.phone || ""}`,
        `Delivery: ${j.endCompany || j.customer}, ${j.endStreet}, ${j.endPlz} ${j.endCity}`,
        `Delivery contact: ${j.contactDelivery?.name || ""} ${j.contactDelivery?.phone || ""}`,
        `Vehicle: ${j.vehicleModel} / ${j.vehicle}`,
        `License plate: ${j.plate}`,
        `VIN: ${j.vin}`,
        `Axle: ${j.axle}`,
        `Distance: ${j.distanceKm} km`,
        `Net: ${j.netAmount || ""} VAT: ${j.vatRate || 19}% Gross: ${j.grossAmount || j.price}`,
        "Instructions: pre-trip inspection, direct route, incident reporting, digital proof/protocol submission, safety clothing on logistics yards, weather-appropriate tires, invoice within seven calendar days.",
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
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>AUTHEON transport order</title></head><body><pre style="font:13px/1.5 monospace;white-space:pre-wrap;padding:24px">${escaped}</pre></body></html>`;
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

    addInvoiceUpload(file, opts = {}) {
      if (!file) return { ok: false, reason: "no_file" };
      if (!isAllowedInvoiceFile(file))
        return { ok: false, reason: "invalid_type" };
      if (!api.isCurrentDriverActive())
        return { ok: false, reason: "driver_restricted" };
      const d = api.getCurrentDriver();
      if (!d) return { ok: false, reason: "no_driver" };
      let jobId = opts.jobId != null && opts.jobId !== "" ? opts.jobId : null;
      if (jobId && !api.getJob(jobId)) jobId = null;
      const mime = (file.type || guessMimeFromName(file.name) || "").trim();
      const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;
      const row = {
        id: `IU-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        invoiceId,
        driverId: d.id,
        driverName: d.name,
        jobId,
        fileName: file.name,
        mimeType: mime || "application/octet-stream",
        sizeBytes: typeof file.size === "number" ? file.size : 0,
        uploadedAt: new Date().toISOString(),
        processed: false,
      };
      invoiceUploads.unshift(row);
      if (jobId) {
        const j = api.getJob(jobId);
        if (j)
          api.updateFinancial(jobId, {
            invoiceNumber: invoiceId,
            invoiceReceived: true,
          });
      }
      log(
        "invoice_upload_registered",
        d.name,
        row.fileName,
        row.jobId || "unscoped",
      );
      emit();
      return { ok: true, id: row.id, invoiceId: row.invoiceId };
    },

    getInvoiceUploads() {
      return invoiceUploads.slice();
    },

    /** Invoice uploads scoped to a tour/job (Partner invoices ↔ Finance). */
    getInvoiceUploadsForJob(jobId) {
      if (!jobId) return [];
      return invoiceUploads.filter((x) => x.jobId === jobId);
    },

    updateInvoiceUpload(id, patch) {
      const u = invoiceUploads.find((x) => x.id === id);
      if (!u) return { ok: false };
      if (patch.jobId !== undefined)
        return { ok: false, reason: "job_scope_readonly" };
      if (patch.processed !== undefined) u.processed = !!patch.processed;
      log(
        "invoice_upload_updated",
        DEMO_ADMIN,
        u.fileName,
        JSON.stringify(patch),
      );
      emit();
      return { ok: true };
    },

    deleteInvoiceUpload(id) {
      const i = invoiceUploads.findIndex((x) => x.id === id);
      if (i < 0) return { ok: false };
      const [removed] = invoiceUploads.splice(i, 1);
      log("invoice_upload_deleted", DEMO_ADMIN, removed.fileName, removed.id);
      emit();
      return { ok: true };
    },

    downloadInvoicePlaceholder(id) {
      const u = invoiceUploads.find((x) => x.id === id);
      if (!u) return { ok: false };
      const raw =
        (u.fileName || "invoice").replace(/[^a-zA-Z0-9._-]/g, "_") || "invoice";
      const stubName = /\.txt$/i.test(raw)
        ? raw
        : `${raw.replace(/\.[^.]+$/, "")}-AUTHEON-placeholder.txt`;
      const jobLine = u.jobId ? `Job ID: ${u.jobId}` : "Job: (none / unscoped)";
      const body = [
        "AUTHEON prototype — binary file not stored.",
        `Invoice ID: ${u.invoiceId || "(pending)"}`,
        `Original filename: ${u.fileName}`,
        `MIME: ${u.mimeType}`,
        `Uploaded (ISO): ${u.uploadedAt}`,
        `Driver: ${u.driverName} (${u.driverId})`,
        jobLine,
        `Processed: ${u.processed ? "yes" : "no"}`,
        "",
        "This placeholder replaces an actual PDF/image in the demo.",
      ].join("\r\n");
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = stubName;
      a.click();
      URL.revokeObjectURL(url);
      return { ok: true };
    },

    getFeatureFlag: (key) => featureFlags[key],
    getFeatureFlags: () => ({ ...featureFlags }),
    setFeatureFlag(key, value) {
      featureFlags[key] = !!value;
      log("feature_flag_changed", DEMO_ADMIN, key, String(!!value));
      emit();
    },

    subscribe,
  };

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
