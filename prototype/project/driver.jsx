/* global React, AuthStore, useAuthStore */
const { useState, useEffect, useRef, useMemo } = React;

// =========================================================================
// SHARED ATOMS
// =========================================================================
const Pill = ({ status, children, className = "" }) => {
  const cls = status ? AuthStore.statusCls(status) : "";
  const label = children || (status ? AuthStore.statusLabel(status) : "");
  return <span className={`pill ${cls} ${className}`}>{label}</span>;
};

const Lbl = ({ children, className = "", ...props }) => (
  <span className={`label ${className}`} {...props}>
    {children}
  </span>
);

const displayAxle = (value, t) =>
  ({
    All: t("all"),
    "Own axle": t("ownAxle"),
    "Third-party axle": t("thirdPartyAxle"),
  })[value] || value;

const displayVehicle = (value, t) =>
  ({
    All: t("all"),
    "Light truck <3.5t": t("lightTruck"),
  })[value] || value;

const displayDriverStatus = (value, t) =>
  ({
    Active: t("driverStatusActive"),
  })[value] || value;

const displayDocTitle = (doc, t) =>
  ({
    "DOC-001": t("docGeneralWorkInstructions"),
    "DOC-002": t("docDriverTerms"),
    "DOC-003": t("docEmergencyContacts"),
    "DOC-004": t("docPrivacyPolicy"),
    "DOC-005": t("docImprint"),
  })[doc.id] || doc.title;

const displayDocCategory = (category, t) =>
  ({
    Operations: t("docCategoryOperations"),
    Legal: t("docCategoryLegal"),
    Safety: t("docCategorySafety"),
  })[category] || category;

const displayDocScope = (scope, t) =>
  ({
    Global: t("docScopeGlobal"),
  })[scope] || scope;

const displayDriverNote = (note, t) =>
  ({
    "Please confirm arrival 15 minutes early.": t("noteConfirmArrival"),
    "Report any pickup delay immediately to dispatch.": t(
      "noteReportPickupDelay",
    ),
  })[note] || note;

const fmtDriverOffer = (job) => {
  const n = job?.driverOffer;
  if (n == null || n === "") return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const googleMapsSearchUrl = (street, plz, city) => {
  const q = [street, plz, city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

const displayTourDocType = (type, t) => {
  const code = AuthStore.normalizeTourDocumentType(type);
  return (
    {
      invoice: t("tourDocInvoice"),
      fuel_receipt: t("tourDocFuelReceipt"),
      toll_receipt: t("tourDocTollReceipt"),
      delivery_note: t("tourDocDeliveryNote"),
      waiting_time_evidence: t("tourDocWaitingTimeEvidence"),
      other_proof: t("tourDocOtherProof"),
      other_receipt: t("tourDocOtherReceipt"),
    }[code] || code
  );
};

const displayDocReviewStatus = (st, t) => {
  const code = AuthStore.normalizeTourDocumentReviewStatus(st);
  return (
    {
      uploaded: t("docReviewUploaded"),
      accepted: t("docReviewAccepted"),
      rejected: t("docReviewRejected"),
      correction_required: t("docReviewCorrectionRequired"),
    }[code] || code
  );
};

const jobNeedsDocCorrection = (job, store) =>
  job.status === "performed" &&
  (/correction/i.test(String(job.documentReviewSummary || "")) ||
    store
      .getTourDocumentsForJob(job.id)
      .some((d) =>
        AuthStore.tourDocumentNeedsDriverCorrection(d.reviewStatus),
      ));

const Ic = {
  Filter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 5h18M6 12h12M10 19h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m20 20-4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  X: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 5l14 14M19 5L5 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Chev: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Back: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Phone: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A14 14 0 0 1 4 6a2 2 0 0 1 1-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Down: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12l7 7 7-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 9h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 2 21h20L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v5M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Sort: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 5v14M3 15l4 4 4-4M17 19V5M21 9l-4-4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Tab: ({ on }) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={on ? "currentColor" : "none"}
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {on && <rect x="7" y="7" width="10" height="10" rx="1.5" fill="#fff" />}
    </svg>
  ),
  TabList: ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6h16M4 12h16M4 18h10"
        stroke="currentColor"
        strokeWidth={on ? 2.2 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  ),
  TabInfo: ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth={on ? 2 : 1.6}
      />
      <path
        d="M12 11v5M12 8v.5"
        stroke="currentColor"
        strokeWidth={on ? 2.2 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  ),
  TabUser: ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="9"
        r="3.5"
        stroke="currentColor"
        strokeWidth={on ? 2 : 1.6}
      />
      <path
        d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
        stroke="currentColor"
        strokeWidth={on ? 2 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  ),
  Pdf: () => (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
      <path
        d="M3 1h11l5 5v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <text
        x="11"
        y="20"
        textAnchor="middle"
        fontSize="6.5"
        fontFamily="JetBrains Mono"
        fontWeight="700"
        fill="currentColor"
      >
        PDF
      </text>
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Pkg: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 7v10l9 4 9-4V7M12 11v10"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  ),
  Bell: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-2 9-2 9h16s-2-2-2-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  Refresh: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12a9 9 0 1 1-3-6.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M21 4v5h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Map: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  N: {
    Tour: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 17l5-12 4 8 5-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    Users: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3 19c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 1 0 0-6M22 19c0-2.5-2-4-5-4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    Building: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V11h4a1 1 0 0 1 1 1v9M2 21h20M8 8h2M8 12h2M8 16h2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    Doc: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3h10l5 5v13H5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M14 3v6h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
    Audit: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M6 4h8l4 4v12H6z" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M9 11h6M9 15h4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    Plus: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    Settings: () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
};

// =========================================================================
// ROUTE STACK (vertical Start → End)
// =========================================================================
const RouteStack = ({ job, big = true }) => {
  const { t, locale } = useI18n();
  return (
    <div className="route">
      <div className="rail">
        <span className="dot"></span>
        <span className="line"></span>
        <span className="dot filled"></span>
      </div>
      <div>
        <div>
          <div className="city" style={{ fontSize: big ? 22 : 18 }}>
            {job.startCity}
          </div>
          <div className="meta">
            {job.startPlz} · {t("pickup")}
          </div>
        </div>
        <div className="end">
          <div className="city" style={{ fontSize: big ? 22 : 18 }}>
            {job.endCity}
          </div>
          <div className="meta">
            {job.endPlz} · {t("destination")} · {job.distanceKm} km
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// DRIVER PWA — STATUS BAR & TAB BAR
// =========================================================================
const PhoneStatusBar = () => (
  <div className="statusbar">
    <span>9:41</span>
    <span className="right">
      <span className="signal">
        <i style={{ height: 6 }}></i>
        <i style={{ height: 8 }}></i>
        <i style={{ height: 10 }}></i>
        <i style={{ height: 12 }}></i>
      </span>
      <span style={{ fontSize: 11, fontWeight: 500 }}>5G</span>
      <span className="battery"></span>
    </span>
  </div>
);

const TabBar = ({ tab, setTab }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const readerId = store.getCurrentDriver()?.id || AuthStore.DEMO_DRIVER;
  const unreadNews = store
    .getNews()
    .filter((n) => !n.readBy.includes(readerId)).length;
  const items = [
    { id: "portal", label: t("marketplace"), I: Ic.Tab },
    { id: "mine", label: t("myJobs"), I: Ic.TabList },
    { id: "info", label: t("infopoint"), I: Ic.TabInfo, badge: unreadNews },
    { id: "profile", label: t("profile"), I: Ic.TabUser },
  ];
  return (
    <div className="tabbar">
      {items.map((it) => (
        <button
          key={it.id}
          className={tab === it.id ? "on" : ""}
          onClick={() => setTab(it.id)}
        >
          <span className="tab-icon" style={{ position: "relative" }}>
            <it.I on={tab === it.id} />
            {it.badge > 0 ? (
              <span
                className="mono"
                style={{
                  position: "absolute",
                  top: -4,
                  right: -8,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 8,
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {it.badge > 9 ? "9+" : it.badge}
              </span>
            ) : null}
          </span>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
};

// =========================================================================
// PORTAL (job list)
// =========================================================================
const JobCard = ({ job, onOpen }) => {
  const { t } = useI18n();
  return (
    <div className="jobcard" onClick={() => onOpen(job)}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "start",
        }}
      >
        <RouteStack job={job} />
        <div style={{ textAlign: "right" }}>
          <div className="driver-offer">€ {fmtDriverOffer(job).toFixed(2)}</div>
          <Lbl
            className="label"
            style={{ marginTop: 6, display: "inline-block" }}
          >
            {displayAxle(job.axle, t)}
          </Lbl>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <span className="chip mono">
          <Ic.Calendar />
          <span style={{ marginLeft: 4 }}>
            {AuthStore.formatJobScheduleShort(job, t("flexible"))}
          </span>
        </span>
      </div>
      <hr className="dash" style={{ margin: "14px 0 10px" }} />
      <div
        className="mono"
        style={{ fontSize: 11.5, color: "var(--muted)", letterSpacing: 0.02 }}
      >
        {displayVehicle(job.vehicle, t)} · {job.vehicleModel}
      </div>
    </div>
  );
};

const Portal = ({ filters, setFilters, openFilter, onOpenJob, onOpenNotifications }) => {
  const { t, locale } = useI18n();
  const store = useAuthStore();
  const [sortDir, setSortDir] = useState("asc");
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const pullRef = useRef({ startY: 0, pulling: false });

  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    store.reloadDemo();
    setTimeout(() => setRefreshing(false), 400);
  };

  const onScrollTouchStart = (e) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 4) return;
    pullRef.current = { startY: e.touches[0].clientY, pulling: true };
  };
  const onScrollTouchMove = (e) => {
    if (!pullRef.current.pulling || refreshing) return;
    const dy = e.touches[0].clientY - pullRef.current.startY;
    if (dy > 72) {
      pullRef.current.pulling = false;
      onRefresh();
    }
  };
  const onScrollTouchEnd = () => {
    pullRef.current.pulling = false;
  };

  const parseDdMm = (raw) => {
    const m = String(raw || "").match(/(\d{2})\.(\d{2})/);
    if (!m) return null;
    return new Date(2026, Number(m[2]) - 1, Number(m[1]));
  };

  const parseFilterDate = (raw) => {
    const m = String(raw || "").match(/(\d{2})\.(\d{2})/);
    if (!m) return null;
    return new Date(2026, Number(m[2]) - 1, Number(m[1]));
  };

  if (!store.isCurrentDriverActive()) {
    const d = store.getCurrentDriver();
    return (
      <div
        className="scroll"
        style={{ padding: "24px 22px", background: "var(--paper-2)" }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          {t("blockedDriverTitle")}
        </h1>
        <div
          className="card"
          style={{
            padding: 18,
            marginTop: 18,
            borderColor: "var(--st-cancelled)",
          }}
        >
          <Pill status="cancelled">
            {d?.status || t("blockedDriverStatusFallback")}
          </Pill>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--muted)",
            }}
          >
            {t("blockedDriverBody")}
          </p>
        </div>
      </div>
    );
  }
  const unreadNotif = store
    .getDriverNotifications()
    .filter((n) => !n.read).length;
  const all = store.getJobs().filter((j) => j.status === "published");
  const filtered = all.filter((j) => {
    const jobDate = parseDdMm(j.date);
    if (filters.startPlz && String(filters.startPlz).trim()) {
      const d = String(filters.startPlz).replace(/\D/g, "");
      if (d.length >= 2 && !String(j.startPlz).startsWith(d.slice(0, 2)))
        return false;
    }
    if (filters.endPlz && String(filters.endPlz).trim()) {
      const d = String(filters.endPlz).replace(/\D/g, "");
      if (d.length >= 2 && !String(j.endPlz).startsWith(d.slice(0, 2)))
        return false;
    }
    if (
      filters.from &&
      String(filters.from).trim() &&
      !["Today", "This week", "Weekend"].includes(filters.from)
    ) {
      const fromDate = parseFilterDate(filters.from);
      if (fromDate && jobDate && jobDate < fromDate) return false;
    }
    if (filters.to && String(filters.to).trim()) {
      const toDate = parseFilterDate(filters.to);
      if (toDate && jobDate && jobDate > toDate) return false;
    }
    if (filters.from === "Today" && j.date !== "05.05.") return false;
    if (
      filters.from === "Weekend" &&
      !String(j.dateLong || "").match(/Sat|Sun/i)
    )
      return false;
    if (
      filters.vehicle &&
      filters.vehicle !== "All" &&
      j.vehicle !== filters.vehicle
    )
      return false;
    if (filters.axle && filters.axle !== "All" && j.axle !== filters.axle)
      return false;
    return true;
  });

  const ordered = filtered.slice().sort((a, b) => {
    const ad = parseDdMm(a.date)?.getTime() || 0;
    const bd = parseDdMm(b.date)?.getTime() || 0;
    return sortDir === "asc" ? ad - bd : bd - ad;
  });

  const activeChips = [];
  if (filters.startPlz)
    activeChips.push({
      key: "startPlz",
      label: t("pickupPlz", { plz: filters.startPlz }),
    });
  if (filters.endPlz)
    activeChips.push({
      key: "endPlz",
      label: t("dropPlz", { plz: filters.endPlz }),
    });
  if (filters.vehicle && filters.vehicle !== "All")
    activeChips.push({
      key: "vehicle",
      label: displayVehicle(filters.vehicle, t),
    });
  if (filters.axle && filters.axle !== "All")
    activeChips.push({ key: "axle", label: displayAxle(filters.axle, t) });

  return (
    <>
      <div
        style={{
          padding: "8px 22px 18px",
          borderBottom: "1px solid var(--line)",
          position: "relative",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.015em",
          }}
        >
          {t("marketplace")}
        </h1>
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 22,
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn icon sm"
            style={{ position: "relative" }}
            title={t("driverNotifications")}
            aria-label={t("driverNotifications")}
            onClick={() => onOpenNotifications?.()}
          >
            <Ic.Bell />
            {unreadNotif > 0 ? (
              <span
                className="mono"
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 8,
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadNotif > 9 ? "9+" : unreadNotif}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="btn icon sm"
            title={t("refreshDemo")}
            disabled={refreshing}
            onClick={onRefresh}
          >
            <Ic.Refresh />
          </button>
        </div>
        <div className="label" style={{ marginTop: 4 }}>
          {store.getAppDisplayName()} · {all.length} {t("openTours")} ·{" "}
          {new Date().toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          })}
        </div>
        <div
          style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}
        >
          <button
            className={`chip actionable ${activeChips.length ? "on" : ""}`}
            onClick={openFilter}
          >
            <Ic.Filter /> {t("filters")}
            {activeChips.length ? " · " + activeChips.length : ""}
          </button>
          {activeChips.map((c) => (
            <span
              key={c.key}
              className="chip"
              onClick={() => setFilters({ ...filters, [c.key]: "" })}
            >
              {c.label}{" "}
              <span className="x">
                <Ic.X />
              </span>
            </span>
          ))}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="scroll"
        style={{ padding: "16px 18px 24px", background: "var(--paper-2)" }}
        onTouchStart={onScrollTouchStart}
        onTouchMove={onScrollTouchMove}
        onTouchEnd={onScrollTouchEnd}
      >
        {refreshing ? (
          <div
            className="label"
            style={{ textAlign: "center", marginBottom: 10 }}
          >
            <Ic.Refresh /> {t("refreshDemo")}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Lbl>
            {ordered.length} {t("results")}
          </Lbl>
          <button
            type="button"
            className={`chip mono actionable ${sortDir === "desc" ? "on" : ""}`}
            style={{ padding: "5px 10px", cursor: "pointer" }}
            onClick={() => setSortDir((v) => (v === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? `${t("date")} ↑` : `${t("date")} ↓`}
          >
            <Ic.Sort /> {t("date")} {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
        {ordered.map((j) => (
          <JobCard key={j.id} job={j} onOpen={onOpenJob} />
        ))}
        {ordered.length === 0 && (
          <div
            className="dash-area"
            style={{ padding: 28, textAlign: "center" }}
          >
            {t("noToursMatch")}
            <br />
            <button
              type="button"
              className="btn xs"
              style={{ marginTop: 10 }}
              onClick={() => setFilters({})}
            >
              {t("resetFilters")}
            </button>
          </div>
        )}
        <div className="list-end">— {t("endOfList")} —</div>
      </div>
    </>
  );
};

// =========================================================================
// FILTER SHEET
// =========================================================================
const FilterSheet = ({ filters, setFilters, onClose }) => {
  const { t } = useI18n();
  const [local, setLocal] = useState({
    vehicle: "All",
    axle: "All",
    ...filters,
  });
  const reset = () =>
    setLocal({
      startPlz: "",
      endPlz: "",
      from: "",
      to: "",
      vehicle: "All",
      axle: "All",
    });
  const types = ["SUV", "PKW", "Van", "Light truck <3.5t"];
  const axles = [
    { val: "All", label: "All" },
    { val: "Own axle", label: "Own axle" },
    { val: "Third-party axle", label: "Third-party axle" },
  ];
  const store = useAuthStore();
  const preview = store.getJobs().filter((j) => {
    if (j.status !== "published") return false;
    if (local.vehicle && local.vehicle !== "All" && j.vehicle !== local.vehicle)
      return false;
    if (local.axle && local.axle !== "All" && j.axle !== local.axle)
      return false;
    return true;
  }).length;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber"></div>
        <div className="sheet-head">
          <h2>{t("filters")}</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={reset}
              className="btn ghost xs"
              style={{ textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              {t("reset")}
            </button>
            <button type="button" onClick={onClose} className="btn icon sm">
              <Ic.X />
            </button>
          </div>
        </div>
        <div className="sheet-body">
          <div className="field-label">{t("postalArea")}</div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <input
              className="input"
              placeholder={t("pickupExample")}
              value={local.startPlz || ""}
              onChange={(e) => setLocal({ ...local, startPlz: e.target.value })}
            />
            <input
              className="input"
              placeholder={t("deliveryExample")}
              value={local.endPlz || ""}
              onChange={(e) => setLocal({ ...local, endPlz: e.target.value })}
            />
          </div>

          <div className="field-label" style={{ marginTop: 18 }}>
            {t("dateWindow")}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <input
              className="input"
              placeholder={t("from")}
              value={local.from || ""}
              onChange={(e) => setLocal({ ...local, from: e.target.value })}
            />
            <input
              className="input"
              placeholder={t("until")}
              value={local.to || ""}
              onChange={(e) => setLocal({ ...local, to: e.target.value })}
            />
          </div>
          <div
            style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
          >
            {[
              [t("today"), "Today"],
              [t("thisWeek"), "This week"],
              [t("weekend"), "Weekend"],
            ].map(([label, value]) => (
              <span
                key={value}
                className={
                  "chip actionable " + (local.from === value ? "on" : "")
                }
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setLocal({
                    ...local,
                    from: local.from === value ? "" : value,
                  })
                }
              >
                {label}
              </span>
            ))}
          </div>

          <div className="field-label" style={{ marginTop: 18 }}>
            {t("vehicleType")}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {types.map((type) => (
              <span
                key={type}
                className={
                  "chip actionable " + (local.vehicle === type ? "on" : "")
                }
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setLocal({
                    ...local,
                    vehicle: local.vehicle === type ? "All" : type,
                  })
                }
              >
                {displayVehicle(type, t)}
              </span>
            ))}
          </div>

          <div className="field-label" style={{ marginTop: 18 }}>
            {t("axleConfiguration")}
          </div>
          <div className="seg full">
            {axles.map((a) => (
              <button
                key={a.val}
                type="button"
                className={local.axle === a.val ? "on" : ""}
                onClick={() => setLocal({ ...local, axle: a.val })}
              >
                {displayAxle(a.val, t)}
              </button>
            ))}
          </div>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setFilters(local);
              onClose();
            }}
          >
            {t("showResults", { count: preview })}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// JOB DETAIL — LOCKED (before acceptance)
// =========================================================================
const JobLocked = ({ job, onBack, onAccept }) => {
  const { t } = useI18n();
  return (
    <>
      <div
        style={{
          padding: "0 18px 14px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="btn icon sm" onClick={onBack}>
            <Ic.Back />
          </button>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            {t("marketplacePreview")}
          </h2>
        </div>
      </div>
      <div
        className="scroll"
        style={{ padding: "16px 18px 22px", background: "var(--paper-2)" }}
      >
        <div className="card" style={{ padding: 18 }}>
          <Lbl>{t("routeSummary")}</Lbl>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 12,
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
              className="mono"
            >
              {job.startPlz}
            </span>
            <span
              style={{
                flex: 1,
                borderTop: "1.5px dashed var(--line-2)",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  right: -3,
                  top: -5,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "var(--primary)",
                }}
              ></span>
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
              className="mono"
            >
              {job.endPlz}
            </span>
          </div>
          <div className="label" style={{ marginTop: 8 }}>
            {job.startCity} → {job.endCity} · {job.distanceKm} km
          </div>
        </div>

        <div className="card" style={{ padding: 0, marginTop: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div style={{ padding: 16, borderRight: "1px solid var(--line)" }}>
              <Lbl>{t("pickup")}</Lbl>
              <div style={{ fontWeight: 600, marginTop: 6, fontSize: 13 }}>
                {AuthStore.formatLocationSchedule(job.pickup, t("flexible"))}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <Lbl>{t("delivery")}</Lbl>
              <div style={{ fontWeight: 600, marginTop: 6, fontSize: 13 }}>
                {AuthStore.formatLocationSchedule(job.delivery, t("flexible"))}
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid var(--line)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <div style={{ padding: 16, borderRight: "1px solid var(--line)" }}>
              <Lbl>{t("vehicle")}</Lbl>
              <div style={{ fontWeight: 600, marginTop: 6 }}>{job.vehicle}</div>
              <div
                className="mono"
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}
              >
                {job.vehicleModel}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <Lbl>{t("axle")}</Lbl>
              <div style={{ fontWeight: 600, marginTop: 6 }}>{job.axle}</div>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 18,
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Lbl>{t("driverOffer")}</Lbl>
          <div
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}
            className="tnum"
          >
            € {fmtDriverOffer(job).toFixed(2)}
          </div>
        </div>

        <div className="dash-area" style={{ marginTop: 14, padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              color: "var(--text)",
              letterSpacing: 0,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                border: "1.5px solid var(--primary-ink)",
                borderRadius: 3,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ic.Pkg />
            </span>
            <strong
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {t("unlockedAfterAcceptance")}
            </strong>
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 22,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.9,
              textTransform: "none",
              letterSpacing: 0.02,
              color: "var(--muted)",
            }}
          >
            <li>{t("fullAddresses")}</li>
            <li>{t("contactsPhones")}</li>
            <li>{t("licenseVin")}</li>
            <li>{t("instructionsPdf")}</li>
          </ul>
        </div>
      </div>
      <div
        style={{
          padding: "12px 16px 18px",
          borderTop: "1px solid var(--line)",
          display: "grid",
          gridTemplateColumns: "1fr 1.6fr",
          gap: 10,
          background: "var(--paper)",
        }}
      >
        <button type="button" className="btn" onClick={onBack}>
          {t("back")}
        </button>
        <button type="button" className="btn primary" onClick={onAccept}>
          {t("acceptTour")}
        </button>
      </div>
    </>
  );
};

// =========================================================================
// ACCEPTANCE MODAL — slide to confirm
// =========================================================================
const AcceptanceModal = ({ job, onCancel, onConfirm }) => {
  const { t } = useI18n();
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(false);
  const trackRef = useRef(null);

  const onStart = (e) => {
    e.preventDefault();
    if (done) return;
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    const startPos = pos;
    const move = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const rect = trackRef.current.getBoundingClientRect();
      const dx = Math.max(
        0,
        Math.min(rect.width - 92, startPos + (cx - startX)),
      );
      setPos(dx);
      if (dx >= rect.width - 100) {
        setDone(true);
        cleanup();
        setTimeout(onConfirm, 380);
      }
    };
    const up = () => {
      cleanup();
      if (!done) setPos(0);
    };
    const cleanup = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  return (
    <div className="sheet-backdrop center" onClick={onCancel}>
      <div
        className="sheet modal"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 24 }}
      >
        <Lbl>{t("bindingAcceptance")}</Lbl>
        <h2
          style={{
            margin: "6px 0 18px",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.015em",
          }}
        >
          {t("acceptThisTour")}
        </h2>

        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-2)",
            padding: 14,
            background: "var(--paper-2)",
          }}
        >
          <div className="label" style={{ marginBottom: 8 }}>
            Tour #{job.id}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }} className="mono">
            {job.startPlz} → {job.endPlz} · {job.distanceKm} km
          </div>
          <div
            className="mono"
            style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}
          >
            {AuthStore.formatJobScheduleShort(job, t("flexible"))} · {job.vehicle}{" "}
            · {job.axle}
          </div>
          <div
            style={{ fontSize: 18, fontWeight: 700, marginTop: 10 }}
            className="tnum"
          >
            € {fmtDriverOffer(job).toFixed(2)}
          </div>
        </div>

        <p style={{ margin: "16px 0 14px", fontSize: 13.5, lineHeight: 1.55 }}>
          {t("acceptanceLegal")}
        </p>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>
          {t("partnerTermsApply")}{" "}
          <button
            type="button"
            className="btn ghost xs"
            style={{
              color: "var(--primary)",
              padding: 0,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
            onClick={() => window.alert(t("partnerPolicyAlert"))}
          >
            {t("viewDriverPolicy")}
          </button>
        </div>

        <div ref={trackRef} className={"slide-confirm " + (done ? "done" : "")}>
          <div className="track-text">
            {done ? t("slideAccepted") : t("slideToConfirm")}
          </div>
          <div
            className="thumb"
            style={{ width: done ? "100%" : 92 + pos }}
            onMouseDown={onStart}
            onTouchStart={onStart}
          >
            {!done && "›››"}
          </div>
        </div>
        <button
          type="button"
          className="btn block"
          style={{ marginTop: 12 }}
          onClick={onCancel}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// TOUR DOCUMENTS (mock metadata only)
// =========================================================================
const TOUR_DOC_TYPES = [
  "invoice",
  "fuel_receipt",
  "toll_receipt",
  "delivery_note",
  "waiting_time_evidence",
  "other_proof",
  "other_receipt",
];

const JobTourDocuments = ({ job }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const inputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const jobId = job.id;
  const tourPerformed = job.status === "performed";
  const uploads = store.getTourDocumentsForJob(jobId);
  const [categoryModal, setCategoryModal] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [replaceDocId, setReplaceDocId] = useState(null);
  const active = store.isCurrentDriverActive();
  const uploadErr = (reason) => {
    if (reason === "invalid_type") window.alert(t("invoiceUploadInvalidType"));
    else if (reason === "driver_restricted")
      window.alert(t("invoiceUploadRestricted"));
    else if (reason === "job_not_performed")
      window.alert(t("tourDocRequiresPerformed"));
    else if (reason === "not_assigned_driver")
      window.alert(t("invoiceUploadNotYourTour"));
    else if (reason === "job_required" || reason === "bad_job")
      window.alert(t("invoiceUploadTourRequired"));
    else if (reason === "not_replaceable")
      window.alert(t("tourDocReplaceNotAllowed"));
    else if (reason === "not_owner")
      window.alert(t("tourDocReplaceNotOwner"));
  };
  const startUpload = (documentType) => {
    const gate = store.canDriverUploadTourDocument(jobId);
    if (!gate.ok) {
      uploadErr(gate.reason);
      return;
    }
    setPendingType(documentType);
    setCategoryModal(false);
    inputRef.current?.click();
  };
  const onPick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (replaceDocId) {
      const r = store.replaceTourDocument(replaceDocId, f);
      setReplaceDocId(null);
      if (!r.ok) uploadErr(r.reason);
      return;
    }
    if (!pendingType) return;
    const r = store.addTourDocument(f, { jobId, documentType: pendingType });
    setPendingType(null);
    if (!r.ok) uploadErr(r.reason);
  };
  const startReplace = (docId) => {
    if (!tourPerformed) {
      uploadErr("job_not_performed");
      return;
    }
    setReplaceDocId(docId);
    setCategoryModal(false);
    replaceInputRef.current?.click();
  };
  const canReplaceDoc = (u) => {
    const st = AuthStore.normalizeTourDocumentReviewStatus(u.reviewStatus);
    return (
      tourPerformed &&
      ["uploaded", "rejected", "correction_required"].includes(st)
    );
  };
  if (!active) return null;

  if (!tourPerformed) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--paper-2)",
        }}
      >
        <Lbl>{t("tourDocumentsSection")}</Lbl>
        <p
          style={{
            fontSize: 12,
            color: "var(--muted)",
            margin: "8px 0 0",
            lineHeight: 1.55,
          }}
        >
          {t("tourDocAfterPerformedHint")}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "var(--paper-2)",
      }}
    >
      <Lbl>{t("tourDocumentsSection")}</Lbl>
      <p
        style={{
          fontSize: 12,
          color: "var(--muted)",
          margin: "8px 0 12px",
          lineHeight: 1.55,
        }}
      >
        {t("tourDocUploadHint")}
      </p>
      <button
        type="button"
        className="btn xs"
        onClick={() => setCategoryModal(true)}
      >
        <Ic.Plus /> {t("tourDocUploadReceiptButton")}
      </button>
      <input
        ref={inputRef}
        type="file"
        capture="environment"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
        style={{ display: "none" }}
        onChange={onPick}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
        style={{ display: "none" }}
        onChange={onPick}
      />
      {uploads.length > 0 ? (
        <ul
          style={{
            margin: "14px 0 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {uploads.map((u) => (
            <li
              key={u.id}
              style={{
                fontSize: 12.5,
                padding: 10,
                border: "1px solid var(--line)",
                borderRadius: "var(--r-2)",
                background: "var(--paper)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    className="mono"
                    style={{
                      wordBreak: "break-all",
                      display: "block",
                    }}
                  >
                    {u.fileName}
                  </span>
                  <span
                    className="label"
                    style={{ fontSize: 11, marginTop: 4, display: "block" }}
                  >
                    {displayTourDocType(u.documentType, t)}
                  </span>
                </span>
                <Pill
                  status={
                    u.reviewStatus === "accepted"
                      ? "performed"
                      : u.reviewStatus === "rejected" ||
                          u.reviewStatus === "correction_required"
                        ? "cancelled"
                        : "assigned"
                  }
                >
                  {displayDocReviewStatus(u.reviewStatus, t)}
                </Pill>
              </div>
              {(u.reviewStatus === "rejected" ||
                u.reviewStatus === "correction_required") &&
              u.rejectionReason ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    color: "var(--st-cancelled)",
                  }}
                >
                  {t("tourDocRejectionReason", { reason: u.rejectionReason })}
                </p>
              ) : null}
              {canReplaceDoc(u) ? (
                <button
                  type="button"
                  className="btn xs"
                  style={{ marginTop: 8 }}
                  onClick={() => startReplace(u.id)}
                >
                  {t("tourDocReplaceButton")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="label" style={{ marginTop: 12 }}>
          {t("tourDocUploadEmpty")}
        </div>
      )}
      {categoryModal ? (
        <div className="sheet-backdrop" onClick={() => setCategoryModal(false)}>
          <div
            className="sheet modal"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 20 }}
          >
            <Lbl>{t("tourDocChooseCategory")}</Lbl>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 14,
              }}
            >
              {TOUR_DOC_TYPES.map((type) => (
                <div key={type}>
                  <button
                    type="button"
                    className="btn block"
                    onClick={() => startUpload(type)}
                  >
                    {displayTourDocType(type, t)}
                  </button>
                  {type === "fuel_receipt" ? (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 11.5,
                        color: "var(--muted)",
                        lineHeight: 1.45,
                      }}
                    >
                      {t("tourDocHelperFuel")}
                    </p>
                  ) : null}
                  {type === "waiting_time_evidence" ? (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 11.5,
                        color: "var(--muted)",
                        lineHeight: 1.45,
                      }}
                    >
                      {t("tourDocHelperWaiting")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn block"
              style={{ marginTop: 10 }}
              onClick={() => setCategoryModal(false)}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const JobInvoiceUpload = JobTourDocuments;

// =========================================================================
// JOB DETAIL — UNLOCKED (after acceptance / running)
// =========================================================================
const JobUnlocked = ({
  job,
  onBack,
  onReturn,
  onComplete,
  onReportProblem,
  onPerform,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const onReport = onReportProblem || onReturn;
  const onMarkPerformed = onPerform || onComplete;
  const isPerformed = job.status === "performed";
  const isCancelled = job.status === "cancelled";
  const isSpecialCase = job.status === "special_case";
  const canPerform = ["assigned", "accepted"].includes(job.status);
  const pickup = job.contactPickup || {};
  const drop = job.contactDelivery || {};
  const pickupMaps = googleMapsSearchUrl(
    job.startStreet,
    job.startPlz,
    job.startCity,
  );
  const deliveryMaps = googleMapsSearchUrl(
    job.endStreet,
    job.endPlz,
    job.endCity,
  );
  return (
    <>
      <div
        style={{
          padding: "0 18px 14px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="btn icon sm" onClick={onBack}>
            <Ic.Back />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 700 }}>
              Tour #{job.tour}
            </h2>
            <div className="label" style={{ marginTop: 2 }}>
              {t("myJobsExecutionDetail")}
            </div>
          </div>
        </div>
      </div>

      <div className="scroll" style={{ padding: "12px 18px 22px" }}>
        {isCancelled && (
          <div
            className="banner banner-warn"
            style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}
            role="status"
          >
            {t("driverTourCancelledNotice")}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: "1px dashed var(--line-dash)",
          }}
        >
          {job.status === "performed" ? (
            <Pill status="performed">{AuthStore.statusLabel("performed")}</Pill>
          ) : job.status === "cancelled" ? (
            <Pill status="cancelled">{t("cancelled")}</Pill>
          ) : job.status === "special_case" ? (
            <Pill status="special_case">
              {AuthStore.statusLabel("special_case")}
            </Pill>
          ) : job.status === "assigned" ? (
            <Pill status="assigned">{t("assignedShort")}</Pill>
          ) : (
            <Pill status="accepted">{t("acceptedActive")}</Pill>
          )}
          <span className="label mono">{job.id}</span>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--paper-2)",
          }}
        >
          <Lbl>{t("customerLabel")}</Lbl>
          <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>
            {job.customerName || job.customer || "—"}
          </div>
        </div>

        {job.status === "performed" && store.getJobDisplayStatus(job) ? (
          <div style={{ marginTop: 10 }}>
            <Pill status="assigned">{store.getJobDisplayStatus(job)}</Pill>
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <Lbl>{t("pickup")}</Lbl>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "16px 1fr",
              gap: 14,
              marginTop: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 6,
              }}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  border: "1.5px solid var(--primary-ink)",
                }}
              ></span>
              <span
                style={{
                  flex: 1,
                  width: 1.5,
                  background: "var(--primary)",
                  margin: "4px 0",
                  minHeight: 38,
                }}
              ></span>
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "var(--primary)",
                }}
              ></span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>
                {job.startCompany || job.customer}
              </div>
              <div
                className="mono"
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}
              >
                {job.startStreet} · {job.startPlz} {job.startCity}
              </div>
              <a
                href={pickupMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="btn xs"
                style={{ marginTop: 8, display: "inline-flex" }}
              >
                <Ic.Map /> {t("openInMaps")}
              </a>
              <Lbl style={{ marginTop: 18, display: "block" }}>
                {t("delivery")}
              </Lbl>
              <div style={{ fontWeight: 700, fontSize: 15.5, marginTop: 6 }}>
                {job.endCompany || t("contacts") + " · " + job.endCity}
              </div>
              <div
                className="mono"
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}
              >
                {job.endStreet} · {job.endPlz} {job.endCity}
              </div>
              <a
                href={deliveryMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="btn xs"
                style={{ marginTop: 8, display: "inline-flex" }}
              >
                <Ic.Map /> {t("openInMaps")}
              </a>
            </div>
          </div>
        </div>

        <hr className="dash" style={{ margin: "20px 0" }} />

        <Lbl>{t("vehicle")}</Lbl>
        <div style={{ marginTop: 6, fontWeight: 700, fontSize: 15.5 }}>
          {job.vehicleModel} · {job.vehicle}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginTop: 14,
          }}
        >
          <div>
            <Lbl>{t("licensePlate")}</Lbl>
            <div
              className="mono"
              style={{
                fontWeight: 600,
                marginTop: 4,
                padding: "5px 10px",
                border: "1.5px solid var(--primary-ink)",
                display: "inline-block",
                borderRadius: 3,
                fontSize: 13,
              }}
            >
              {job.plate}
            </div>
          </div>
          <div>
            <Lbl>{t("vin")}</Lbl>
            <div className="mono" style={{ fontSize: 12, marginTop: 6 }}>
              {job.vin}
            </div>
          </div>
        </div>

        <hr className="dash" style={{ margin: "20px 0" }} />

        <Lbl>{t("contacts")}</Lbl>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginTop: 8,
          }}
        >
          {[
            [t("pickup"), pickup],
            [t("delivery"), drop],
          ].map(([k, c]) => (
            <div key={k} className="card flat" style={{ padding: 12 }}>
              <div className="label">{k}</div>
              <div style={{ fontWeight: 600, marginTop: 6, fontSize: 14 }}>
                {c.name || "—"}
              </div>
              <a
                href={"tel:" + (c.phone || "").replace(/\s/g, "")}
                className="mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "var(--text)",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                  marginTop: 4,
                }}
              >
                <Ic.Phone /> {c.phone || "—"}
              </a>
              {c.secondPhone ? (
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}
                >
                  {t("phone")} 2: {c.secondPhone}
                </div>
              ) : null}
              {c.email ? (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  {t("email")}: {c.email}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <hr className="dash" style={{ margin: "20px 0" }} />

        <Lbl>{t("transportOrderPdf")}</Lbl>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 8,
            padding: 12,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-2)",
          }}
        >
          <div style={{ color: "var(--primary-ink)", flexShrink: 0 }}>
            <Ic.Pdf />
          </div>
          <div style={{ flex: 1 }}>
            <div className="mono" style={{ fontSize: 12 }}>
              transport-order-{job.id}.pdf
            </div>
            <div className="label" style={{ marginTop: 2 }}>
              {t("demoAsset")} · v{job.pdfVersion || 1}
            </div>
          </div>
          <button
            type="button"
            className="btn xs"
            onClick={() => AuthStore.viewPdf(job.id)}
          >
            <Ic.Eye /> {t("view")}
          </button>
          <button
            type="button"
            className="btn icon sm"
            onClick={() => AuthStore.downloadPdf(job.id)}
          >
            <Ic.Down />
          </button>
        </div>

        <JobTourDocuments job={job} />

        <hr className="dash" style={{ margin: "20px 0" }} />

        <Lbl>{t("operationalInstructions")}</Lbl>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            margin: "8px 0 0",
            color: "var(--muted)",
          }}
        >
          {displayDriverNote(job.notesDriver, t) || t("noDriverAddons")}
        </p>

        <Lbl style={{ marginTop: 16, display: "block" }}>
          {t("dispatchNotes")}
        </Lbl>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>
          {job.notes || "—"}
        </p>

        <hr className="dash" style={{ margin: "20px 0" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <Lbl>{t("driverOffer")}</Lbl>
            <div
              className="mono"
              style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}
            >
              {job.distanceKm} km · {displayAxle(job.axle, t)}
            </div>
          </div>
          <div
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}
            className="tnum"
          >
            € {fmtDriverOffer(job).toFixed(2)}
          </div>
        </div>

      </div>
      {!isPerformed && !isCancelled && !isSpecialCase && (
        <div
          style={{
            padding: "12px 16px 18px",
            borderTop: "1px solid var(--line)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            background: "var(--paper)",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={onReport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ic.Alert />
            {t("reportProblem")}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={onMarkPerformed}
            disabled={!canPerform}
          >
            {t("markPerformed")}
          </button>
        </div>
      )}
    </>
  );
};

// =========================================================================
// MY JOBS
// =========================================================================
const MyJobs = ({ onOpen }) => {
  const { t } = useI18n();
  const [tab, setTab] = useState("active");
  const store = useAuthStore();
  const mine = store.getJobs().filter((j) => store.isMineJob(j));
  const active = mine.filter((j) =>
    ["assigned", "accepted"].includes(j.status),
  );
  const performed = mine.filter((j) => j.status === "performed");
  const cancelled = mine.filter((j) => j.status === "cancelled");
  const special = mine.filter((j) => j.status === "special_case");
  const list =
    tab === "active"
      ? active
      : tab === "performed"
        ? performed
        : tab === "cancelled"
          ? cancelled
          : special;

  const pillFor = (job) => {
    if (job.status === "special_case")
      return (
        <Pill status="special_case">
          {AuthStore.statusLabel("special_case")}
        </Pill>
      );
    if (job.status === "assigned")
      return <Pill status="assigned">{t("assignedShort")}</Pill>;
    if (job.status === "accepted")
      return <Pill status="accepted">{t("active")}</Pill>;
    if (job.status === "performed")
      return (
        <Pill status="performed">{AuthStore.statusLabel("performed")}</Pill>
      );
    if (job.status === "cancelled")
      return <Pill status="cancelled">{t("cancelled")}</Pill>;
    return <Pill status="draft">{AuthStore.statusLabel(job.status)}</Pill>;
  };

  return (
    <>
      <div style={{ padding: "8px 22px 0" }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.015em",
          }}
        >
          {t("myJobs")}
        </h1>
      </div>
      <div style={{ padding: "16px 22px 0" }}>
        <div className="tabs">
          {[
            ["active", t("active"), active.length],
            ["performed", t("performedTab"), performed.length],
            ["cancelled", t("cancelled"), cancelled.length],
            ["special", t("specialCaseTab"), special.length],
          ].map(([id, lbl, n]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "on" : ""}
              style={{ cursor: "pointer" }}
              onClick={() => setTab(id)}
            >
              {lbl} <span className="count">({n})</span>
            </button>
          ))}
        </div>
      </div>
      <div
        className="scroll"
        style={{ padding: "16px 18px 22px", background: "var(--paper-2)" }}
      >
        {list.length === 0 && (
          <div
            className="dash-area"
            style={{ padding: 28, textAlign: "center" }}
          >
            {t("nothingHereYet")}
          </div>
        )}
        {list.map((job) => (
          <div key={job.id} className="jobcard" onClick={() => onOpen(job)}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {pillFor(job)}
                {jobNeedsDocCorrection(job, store) ? (
                  <span
                    className="chip mono"
                    style={{
                      borderColor: "var(--st-cancelled)",
                      color: "var(--st-cancelled)",
                    }}
                  >
                    {t("correctionRequiredBadge")}
                  </span>
                ) : null}
              </div>
              <span className="label">#{job.tour}</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
              }}
            >
              <RouteStack job={job} big={false} />
              <div
                style={{ textAlign: "right", fontSize: 19, fontWeight: 700 }}
                className="tnum"
              >
                € {fmtDriverOffer(job).toFixed(2)}
              </div>
            </div>
            <hr className="dash" style={{ margin: "12px 0 8px" }} />
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--muted)" }}
            >
              {AuthStore.formatJobScheduleShort(job, t("flexible"))} ·{" "}
              {displayVehicle(job.vehicle, t)}
            </div>
          </div>
        ))}
        <div className="list-end">— {t("endOfList")} —</div>
      </div>
    </>
  );
};

// =========================================================================
// REPORT PROBLEM SHEET
// =========================================================================
const ReportProblemSheet = ({ job, onClose, onSubmit }) => {
  const { t } = useI18n();
  const [path, setPath] = useState(null);
  const [reason, setReason] = useState("driver_unavailable");
  const [text, setText] = useState("");
  const [slidePos, setSlidePos] = useState(0);
  const [slideDone, setSlideDone] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const trackRef = useRef(null);
  const evidenceInputRef = useRef(null);
  const valid = text.trim().length >= 10;

  const pathOptions = [
    ["cancel", t("reportProblemCancelTitle"), t("reportProblemCancelSub")],
    [
      "not_performable",
      t("reportProblemNotPerformableTitle"),
      t("reportProblemNotPerformableSub"),
    ],
  ];
  const cancelReasons = [
    [
      "driver_unavailable",
      t("reportCancelDriverUnavailable"),
      t("reportCancelDriverUnavailableSub"),
    ],
    [
      "vehicle_not_available",
      t("reportCancelVehicleNotAvailable"),
      t("reportCancelVehicleNotAvailableSub"),
    ],
    [
      "customer_cancelled",
      t("reportCancelCustomerCancelled"),
      t("reportCancelCustomerCancelledSub"),
    ],
    [
      "appointment_not_possible",
      t("reportCancelAppointmentNotPossible"),
      t("reportCancelAppointmentNotPossibleSub"),
    ],
    [
      "incorrect_order_data",
      t("reportCancelIncorrectData"),
      t("reportCancelIncorrectDataSub"),
    ],
    [
      "vehicle_not_roadworthy",
      t("reportCancelVehicleNotRoadworthy"),
      t("reportCancelVehicleNotRoadworthySub"),
    ],
    ["other", t("reportCancelOther"), t("reportCancelOtherSub")],
  ];
  const notPerformableReasons = [
    ["vehicle_not_on_site", t("problemReasonNotOnSite"), t("problemReasonNotOnSiteSub")],
    ["vehicle_not_roadworthy", t("problemReasonNotRoadworthy"), t("problemReasonNotRoadworthySub")],
    ["contact_unreachable", t("problemReasonNoContact"), t("problemReasonNoContactSub")],
    ["wrong_address", t("problemReasonWrongAddress"), t("problemReasonWrongAddressSub")],
    ["other", t("problemReasonOther"), t("problemReasonOtherSub")],
  ];
  const reasonList = path === "cancel" ? cancelReasons : notPerformableReasons;

  const slideEnabled = valid && !slideDone;

  const onSlideStart = (e) => {
    e.preventDefault();
    if (!slideEnabled || !trackRef.current) return;
    const thumb = e.currentTarget;
    if (thumb.setPointerCapture && e.pointerId != null) {
      try {
        thumb.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    }
    const startX = e.clientX;
    const startPos = slidePos;
    let completed = false;
    const move = (ev) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const dx = Math.max(
        0,
        Math.min(rect.width - 92, startPos + (ev.clientX - startX)),
      );
      setSlidePos(dx);
      if (dx >= rect.width - 100 && !completed) {
        completed = true;
        setSlideDone(true);
        cleanup();
        setTimeout(() => onSubmit("cancel", reason, text.trim(), []), 380);
      }
    };
    const up = (ev) => {
      cleanup();
      if (thumb.releasePointerCapture && ev?.pointerId != null) {
        try {
          thumb.releasePointerCapture(ev.pointerId);
        } catch (_) {
          /* ignore */
        }
      }
      if (!completed) setSlidePos(0);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber"></div>
        <div className="sheet-head">
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: 0,
            }}
          >
            <span style={{ color: "var(--st-warn)" }}>
              <Ic.Alert />
            </span>
            {t("reportProblem")}
          </h2>
          <button type="button" onClick={onClose} className="btn icon sm">
            <Ic.X />
          </button>
        </div>
        <div className="sheet-body">
          {!path ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pathOptions.map(([id, label, sub]) => (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  className="radio-card"
                  onClick={() => {
                    setPath(id);
                    setReason(
                      id === "cancel" ? "driver_unavailable" : "other",
                    );
                    setText("");
                    setEvidenceFiles([]);
                    setSlidePos(0);
                    setSlideDone(false);
                  }}
                >
                  <span className="ring"></span>
                  <div>
                    <div className="t">{label}</div>
                    <div className="s">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn ghost xs"
                style={{ marginBottom: 12, padding: 0 }}
                onClick={() => {
                  setPath(null);
                  setEvidenceFiles([]);
                  setSlidePos(0);
                  setSlideDone(false);
                }}
              >
                {t("back")}
              </button>
              <div className="field-label">{t("reason")}</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                {reasonList.map(([id, label, sub]) => (
                  <div
                    key={id}
                    role="button"
                    tabIndex={0}
                    className={"radio-card " + (reason === id ? "on" : "")}
                    onClick={() => setReason(id)}
                  >
                    <span className="ring"></span>
                    <div>
                      <div className="t">{label}</div>
                      <div className="s">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="field-label">{t("explanationRequired")}</div>
              <textarea
                className="input"
                placeholder={t("reportProblemPlaceholder")}
                value={text}
                onChange={(e) => {
                  const next = e.target.value;
                  setText(next);
                  if (next.trim().length < 10) {
                    setSlidePos(0);
                    setSlideDone(false);
                  }
                }}
              />
              <div className="label" style={{ marginTop: 6 }}>
                {t("charsRequired")}{" "}
                <span
                  className={
                    "slide-char-count " + (valid ? "ok" : "need-more")
                  }
                >
                  {text.trim().length}/10
                </span>
              </div>
              {path === "not_performable" ? (
                <div style={{ marginTop: 16 }}>
                  <div className="field-label">{t("reportProblemEvidenceLabel")}</div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      margin: "6px 0 10px",
                      lineHeight: 1.5,
                    }}
                  >
                    {t("reportProblemEvidenceHint")}
                  </p>
                  <input
                    ref={evidenceInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const picked = Array.from(e.target.files || []);
                      if (!picked.length) return;
                      setEvidenceFiles((prev) => {
                        const merged = [...prev, ...picked].slice(0, 5);
                        if (prev.length + picked.length > 5) {
                          window.alert(t("reportProblemEvidenceTooMany"));
                        }
                        return merged;
                      });
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="btn xs"
                    onClick={() => evidenceInputRef.current?.click()}
                    disabled={evidenceFiles.length >= 5}
                  >
                    <Ic.Plus /> {t("reportProblemEvidenceAdd")}
                  </button>
                  {evidenceFiles.length > 0 ? (
                    <ul
                      style={{
                        margin: "12px 0 0",
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {evidenceFiles.map((f, idx) => (
                        <li
                          key={`${f.name}-${idx}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            padding: "8px 10px",
                            border: "1px solid var(--line)",
                            borderRadius: "var(--r-2)",
                          }}
                        >
                          <span className="mono" style={{ wordBreak: "break-all" }}>
                            {f.name}
                          </span>
                          <button
                            type="button"
                            className="btn ghost xs"
                            onClick={() =>
                              setEvidenceFiles((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            {t("reportProblemEvidenceRemove")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {path === "cancel" ? (
                <>
                  <div
                    role="alert"
                    style={{
                      marginTop: 16,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(234, 179, 8, 0.45)",
                      background: "rgba(234, 179, 8, 0.1)",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                    }}
                  >
                    <p style={{ margin: 0 }}>{t("reportProblemCancelBindingWarning")}</p>
                    <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)" }}>
                      {t("reportProblemCancelTermsIntro")}{" "}
                      <button
                        type="button"
                        className="btn ghost xs"
                        style={{
                          color: "var(--primary)",
                          padding: 0,
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                        }}
                        onClick={() => window.alert(t("partnerPolicyAlert"))}
                      >
                        {t("viewDriverPolicy")}
                      </button>
                    </p>
                  </div>
                <div className="slide-confirm-wrap" style={{ marginTop: 16 }}>
                  <div
                    ref={trackRef}
                    className={
                      "slide-confirm" +
                      (slideDone ? " done" : "") +
                      (!slideEnabled ? " disabled" : "")
                    }
                    aria-disabled={!slideEnabled}
                  >
                    <div className="track-text">
                      {slideDone
                        ? t("reportProblemCancelConfirmed")
                        : valid
                          ? t("slideToCancelOrder")
                          : t("slideToCancelOrderLocked")}
                    </div>
                    <div
                      className="thumb"
                      style={{
                        width: slideDone ? "100%" : valid ? 92 + slidePos : 92,
                      }}
                      onPointerDown={slideEnabled ? onSlideStart : undefined}
                      tabIndex={slideEnabled ? 0 : -1}
                    >
                      {!slideDone && (valid ? "›››" : "LOCK")}
                    </div>
                  </div>
                  {!valid && !slideDone && (
                    <p className="slide-confirm-hint">
                      {t("slideToCancelOrderHint")}
                    </p>
                  )}
                </div>
                </>
              ) : (
                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: 12,
                    color: "var(--muted)",
                    lineHeight: 1.55,
                  }}
                >
                  {t("reportProblemSpecialCaseNotice")}
                </p>
              )}
            </>
          )}
        </div>
        {path === "not_performable" ? (
          <div className="sheet-foot">
            <button type="button" className="btn" onClick={onClose}>
              {t("close")}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!valid}
              onClick={() =>
                onSubmit("not_performable", reason, text.trim(), evidenceFiles)
              }
            >
              {t("submit")}
            </button>
          </div>
        ) : path ? (
          <div className="sheet-foot">
            <button type="button" className="btn block" onClick={onClose}>
              {t("close")}
            </button>
          </div>
        ) : (
          <div className="sheet-foot">
            <button type="button" className="btn block" onClick={onClose}>
              {t("cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PendingNotice = ({ onClose, kind }) => {
  const { t } = useI18n();
  const isCancel = kind === "cancel";
  return (
    <div className="sheet-backdrop center" onClick={onClose}>
      <div
        className="sheet modal"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 26, textAlign: "center", maxWidth: 320 }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "var(--st-accepted-bg)",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M6 12l4 4 8-9"
              stroke="var(--st-accepted)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700 }}>
          {t("requestSent")}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: "var(--muted)",
            lineHeight: 1.55,
          }}
        >
          {isCancel
            ? t("reportProblemCancelSent")
            : t("reportProblemSpecialCaseSent")}
        </p>
        <button
          type="button"
          className="btn block primary"
          style={{ marginTop: 20 }}
          onClick={onClose}
        >
          {t("ok")}
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// SIMPLE PROFILE / INFO
// =========================================================================
const ProfilePane = () => {
  const { t } = useI18n();
  return (
    <div className="scroll" style={{ padding: "10px 22px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
        {t("profileTitle")}
      </h1>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "20px 0 16px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          className="avatar"
          style={{ width: 48, height: 48, fontSize: 14 }}
        >
          JB
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {AuthStore.DEMO_DRIVER}
          </div>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            {t("driverCode")}: AU-41-0228 · {t("driverStatusActive")}
          </div>
        </div>
      </div>
      {[
        [t("profileMasterData"), t("vatBankingReadonly")],
        [t("settlements"), t("settlementsSub")],
        [t("equipment"), t("equipmentSub")],
        [t("notifications"), t("notificationsSub")],
        [t("legal"), t("legalSub")],
      ].map(([label, sub]) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 0",
            borderBottom: "1px solid var(--line)",
            cursor: "pointer",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div>
          </div>
          <Ic.Chev />
        </div>
      ))}
      <button
        type="button"
        className="btn block"
        style={{ marginTop: 24 }}
        onClick={() => window.alert(t("signOutAlert"))}
      >
        <Ic.Logout /> {t("signOut")}
      </button>
    </div>
  );
};

const DriverNotificationsList = ({ markReadOnMount = false }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const rows = store.getDriverNotifications();
  useEffectA(() => {
    if (markReadOnMount && rows.some((r) => !r.read)) {
      store.markDriverNotificationsRead();
    }
  }, [markReadOnMount]);
  if (!rows.length) {
    return (
      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
        {t("driverNotificationsEmpty")}
      </p>
    );
  }
  return (
    <ul
      style={{
        margin: "12px 0 0",
        padding: 0,
        listStyle: "none",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {rows.map((row) => (
        <li
          key={row.id}
          style={{
            padding: 10,
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: row.read ? "var(--paper)" : "var(--paper-2)",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13 }}>{row.title}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            {row.body}
          </div>
          {row.type === "infopoint_news" ? (
            <div style={{ fontSize: 11, color: "var(--primary)", marginTop: 6 }}>
              {t("driverNotifInfopointHint")}
            </div>
          ) : null}
          <div className="mono" style={{ fontSize: 10, color: "var(--muted-2)", marginTop: 4 }}>
            {row.createdAt}
            {row.tour ? ` · ${row.tour}` : ""}
          </div>
        </li>
      ))}
    </ul>
  );
};

const DriverNotificationsPane = ({ onBack }) => {
  const { t } = useI18n();
  return (
    <>
      <div
        style={{
          padding: "0 18px 14px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="btn icon sm" onClick={onBack}>
            <Ic.Back />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {t("driverNotifications")}
            </h2>
            <div className="label" style={{ marginTop: 2 }}>
              {t("driverNotificationsSub")}
            </div>
          </div>
        </div>
      </div>
      <div className="scroll" style={{ padding: "12px 18px 24px" }}>
        <DriverNotificationsList markReadOnMount />
      </div>
    </>
  );
};

const PROFILE_MDR_FIELDS = [
  { key: "company", required: true },
  { key: "address" },
  { key: "email", required: true, type: "email" },
  { key: "phone" },
];

const emptyMasterDataChangeForm = (driver) => ({
  company: driver?.company || "",
  address: driver?.address || "",
  email: driver?.email || "",
  phone: driver?.phone || "",
});

const fieldChanged = (before, after) =>
  String(before || "").trim() !== String(after || "").trim();

const ProfilePaneFull = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const d = store.getCurrentDriver();
  const prefs = d?.prefs || {};
  const setPref = (patch) => store.updateDriverPrefs(patch);
  const [editingProfile, setEditingProfile] = useState(false);
  const [mdForm, setMdForm] = useState(() => emptyMasterDataChangeForm(d));
  const setMdField = (key, value) =>
    setMdForm((prev) => ({ ...prev, [key]: value }));
  const openMdr = store.getOpenMasterDataChangeRequestForDriver(d?.id);
  const profileMode = openMdr ? "pending" : editingProfile ? "edit" : "view";

  const startProfileEdit = () => {
    setMdForm(emptyMasterDataChangeForm(d));
    setEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setMdForm(emptyMasterDataChangeForm(d));
    setEditingProfile(false);
  };
  const submitMasterDataRequest = () => {
    const r = store.requestMasterDataChange(mdForm);
    if (r.ok) {
      setMdForm(emptyMasterDataChangeForm(d));
      setEditingProfile(false);
      window.alert(t("masterDataChangeSent"));
    } else if (r.reason === "open_request_exists") {
      window.alert(t("masterDataChangeOpenExists"));
    } else if (r.reason === "no_changes") {
      window.alert(t("masterDataChangeNoChanges"));
    } else if (r.reason === "company_required") {
      window.alert(t("masterDataChangeCompanyRequired"));
    } else if (r.reason === "email_required") {
      window.alert(t("masterDataChangeEmailRequired"));
    } else if (r.reason === "invalid_email") {
      window.alert(t("masterDataChangeInvalidEmail"));
    } else if (r.reason === "duplicate_email") {
      window.alert(t("masterDataChangeDuplicateEmail"));
    } else {
      window.alert(t("masterDataChangeSubmitFailed"));
    }
  };
  return (
    <div className="scroll" style={{ padding: "10px 22px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
        {t("profileTitle")}
      </h1>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "20px 0 16px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          className="avatar"
          style={{ width: 48, height: 48, fontSize: 14 }}
        >
          JB
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{d?.name}</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            {t("driverCode")}: {d?.driverCode} ·{" "}
            {displayDriverStatus(d?.status, t)}
          </div>
        </div>
      </div>
      <div className="card mdr-card" style={{ padding: 14, marginTop: 16 }}>
        <div className="mdr-card-head">
          <Lbl>{t("profileMasterData")}</Lbl>
          {profileMode === "pending" ? (
            <span className="pill assigned">{t("masterDataChangePendingBadge")}</span>
          ) : null}
        </div>
        {profileMode === "pending" ? (
          <div className="mdr-status-banner" role="status">
            <strong>{t("masterDataChangePendingTitle")}</strong>
            {t("masterDataChangePendingBody", { date: openMdr.createdAt })}
          </div>
        ) : (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12.5,
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            {profileMode === "edit"
              ? t("masterDataChangeFormHint")
              : t("masterDataChangeNotice")}
          </p>
        )}
        <div className="mdr-field-list">
          {PROFILE_MDR_FIELDS.map(({ key, required, type }) => {
            const label = t(key);
            const current = d?.[key] || "";
            const pendingBefore = openMdr?.snapshot?.[key] || "";
            const pendingAfter = openMdr?.proposed?.[key] || "";
            const changed =
              profileMode === "pending" &&
              fieldChanged(pendingBefore, pendingAfter);
            const inputId = `profile-mdr-${key}`;
            return (
              <div
                key={key}
                className={`mdr-field-row${changed ? " is-changed" : ""}`}
              >
                <div className="mdr-field-label">
                  {label}
                  {required ? " *" : ""}
                </div>
                <div className="mdr-field-body">
                  {profileMode === "edit" ? (
                    <input
                      id={inputId}
                      className="input"
                      type={type || "text"}
                      value={mdForm[key]}
                      onChange={(e) => setMdField(key, e.target.value)}
                    />
                  ) : profileMode === "pending" ? (
                    <>
                      <div
                        className={`mdr-field-value${changed ? " is-new" : ""}`}
                      >
                        {pendingAfter || "—"}
                        {changed ? (
                          <span className="mdr-field-badge">
                            {t("masterDataChangeUpdatedBadge")}
                          </span>
                        ) : null}
                      </div>
                      {changed ? (
                        <div className="mdr-field-old">{pendingBefore || "—"}</div>
                      ) : null}
                    </>
                  ) : (
                    <div className="mdr-field-value">{current || "—"}</div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="mdr-field-row">
            <div className="mdr-field-label">{t("accountStatus")}</div>
            <div className="mdr-field-body">
              <div className="mdr-field-value">
                {displayDriverStatus(d?.status, t)}
              </div>
            </div>
          </div>
        </div>
        {profileMode === "view" ? (
          <button
            type="button"
            className="btn block"
            style={{ marginTop: 14 }}
            onClick={startProfileEdit}
          >
            {t("masterDataChangeEditBtn")}
          </button>
        ) : null}
        {profileMode === "edit" ? (
          <div className="mdr-actions">
            <button type="button" className="btn" onClick={cancelProfileEdit}>
              {t("masterDataChangeCancel")}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={submitMasterDataRequest}
            >
              {t("masterDataChangeSubmit")}
            </button>
          </div>
        ) : null}
        {profileMode === "pending" && openMdr?.note && !openMdr?.proposed ? (
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 12,
              lineHeight: 1.45,
              fontStyle: "italic",
              color: "var(--muted)",
            }}
          >
            {openMdr.note}
          </p>
        ) : null}
      </div>
      <div className="card" style={{ padding: 14, marginTop: 14 }}>
        <Lbl>{t("notificationPreferences")}</Lbl>
          <label className="field-label" style={{ marginTop: 14 }}>
            {t("vehicleType")}
          </label>
          <select
            className="input"
            value={prefs.vehicle || "All"}
            onChange={(e) => setPref({ vehicle: e.target.value })}
          >
            {["All", "PKW", "SUV", "Van", "Light truck <3.5t"].map((x) => (
              <option key={x} value={x}>
                {displayVehicle(x, t)}
              </option>
            ))}
          </select>
          <label className="field-label" style={{ marginTop: 12 }}>
            {t("axle")}
          </label>
          <div className="seg full">
            {["All", "Own axle", "Third-party axle"].map((x) => (
              <button
                key={x}
                type="button"
                className={(prefs.axle || "All") === x ? "on" : ""}
                onClick={() => setPref({ axle: x })}
              >
                {displayAxle(x, t)}
              </button>
            ))}
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={prefs.pushEnabled !== false}
              onChange={(e) => setPref({ pushEnabled: e.target.checked })}
            />
            {t("pushEnabledMaster")}
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={prefs.notifyNewPublished !== false}
              onChange={(e) =>
                setPref({ notifyNewPublished: e.target.checked })
              }
            />
            {t("pushNotifyNewPublished")}
          </label>
          <label className="field-label" style={{ marginTop: 12 }}>
            {t("pushNotifyPostalPrefix")}
          </label>
          <input
            className="input mono"
            value={prefs.notifyPostalPrefix || ""}
            onChange={(e) => setPref({ notifyPostalPrefix: e.target.value })}
            placeholder={t("pushPostalPrefixHint")}
          />
          <div
            className="dash-area"
            style={{
              marginTop: 12,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              letterSpacing: 0,
              textTransform: "none",
            }}
          >
            {t("pushSupportNotice")}
          </div>
      </div>
      <button
        type="button"
        className="btn block"
        style={{ marginTop: 18 }}
        onClick={() => window.alert(t("signOutAlert"))}
      >
        <Ic.Logout /> {t("signOut")}
      </button>
    </div>
  );
};

const Infopoint = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [subTab, setSubTab] = useState("documents");
  const [openNewsId, setOpenNewsId] = useState(null);
  const readerId = store.getCurrentDriver()?.id || AuthStore.DEMO_DRIVER;
  const docs = store.getDocuments().filter((d) => d.visible);
  const news = store.getNews();
  const unreadCount = news.filter((n) => !n.readBy.includes(readerId)).length;

  const openNews = (item) => {
    store.markNewsRead(item.id, readerId);
    setOpenNewsId((cur) => (cur === item.id ? null : item.id));
  };

  return (
    <div className="scroll" style={{ padding: "10px 22px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
        {t("infopoint")}
      </h1>
      <div className="label" style={{ marginTop: 4 }}>
        {store.getAppDisplayName()}
      </div>
      <div className="tabs" style={{ marginTop: 16 }}>
        {[
          ["documents", t("infopointDocsTab")],
          ["news", t("infopointNewsTab"), unreadCount],
        ].map(([id, lbl, n]) => (
          <button
            key={id}
            type="button"
            className={subTab === id ? "on" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setSubTab(id)}
          >
            {lbl}
            {id === "news" && n > 0 ? (
              <span className="count"> ({n})</span>
            ) : null}
          </button>
        ))}
      </div>
      {subTab === "documents" ? (
        <>
          {docs.map((d) => (
            <div
              key={d.id}
              style={{
                padding: "16px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {displayDocTitle(d, t)}
                  </div>
                  {d.description ? (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--muted)",
                        marginTop: 6,
                        lineHeight: 1.45,
                      }}
                    >
                      {d.description}
                    </div>
                  ) : null}
                  <div
                    style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}
                  >
                    {displayDocCategory(d.category, t)} · {displayDocScope(d.scope, t)} ·{" "}
                    {d.version}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}
                  >
                    {t("adminInfopointColUpdated")}: {d.updatedAt}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn xs"
                  onClick={() =>
                    window.alert(
                      `${t("infopointDocPreviewDemo")}\n\n${d.title}`,
                    )
                  }
                >
                  {t("infopointDocViewDownload")}
                </button>
              </div>
            </div>
          ))}
          <div
            className="dash-area"
            style={{
              marginTop: 16,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              letterSpacing: 0,
              textTransform: "none",
            }}
          >
            {t("emergencyDispatchNotice")}
          </div>
        </>
      ) : (
        <>
          {news.length === 0 ? (
            <div
              className="dash-area"
              style={{ marginTop: 16, padding: 20, textAlign: "center" }}
            >
              <div>{t("infopointNewsEmpty")}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginTop: 10,
                  lineHeight: 1.5,
                }}
              >
                {t("infopointNewsAdminHint")}
              </div>
            </div>
          ) : (
            news.map((n) => {
              const unread = !n.readBy.includes(readerId);
              const expanded = openNewsId === n.id;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openNews(n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openNews(n);
                    }
                  }}
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid var(--line)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ fontWeight: unread ? 700 : 600, fontSize: 14 }}>
                      {n.title}
                    </div>
                    {unread ? (
                      <span
                        className="chip mono"
                        style={{
                          borderColor: "var(--primary)",
                          color: "var(--primary)",
                        }}
                      >
                        {t("infopointNewsUnread")}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 6,
                    }}
                  >
                    {n.publishedAt}
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 13,
                      color: "var(--muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {expanded
                      ? n.body
                      : `${(n.body || "").slice(0, 120)}${
                          (n.body || "").length > 120 ? "…" : ""
                        }`}
                  </p>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
};

const InfoPaneFull = Infopoint;

// expose
Object.assign(window, {
  Pill,
  Lbl,
  Ic,
  RouteStack,
  PhoneStatusBar,
  TabBar,
  Portal,
  FilterSheet,
  JobCard,
  JobLocked,
  AcceptanceModal,
  JobUnlocked,
  JobTourDocuments,
  DriverNotificationsList,
  DriverNotificationsPane,
  JobInvoiceUpload,
  MyJobs,
  ReportProblemSheet,
  PendingNotice,
  ProfilePane,
  ProfilePaneFull,
  Infopoint,
  InfoPaneFull,
});
