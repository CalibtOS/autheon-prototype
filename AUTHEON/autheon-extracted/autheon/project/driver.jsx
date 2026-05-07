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
    "DOC-002": t("docPartnerTerms"),
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
  const items = [
    { id: "portal", label: t("marketplace"), I: Ic.Tab },
    { id: "mine", label: t("myJobs"), I: Ic.TabList },
    { id: "info", label: t("info"), I: Ic.TabInfo },
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
          <span className="tab-icon">
            <it.I on={tab === it.id} />
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
          <div className="price">€ {job.price.toFixed(2)}</div>
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
          <span style={{ marginLeft: 4 }}>{job.date}</span>
        </span>
        <span className="chip mono">
          {job.windowFlex ? t("flexible") : `${job.windowFrom}–${job.windowTo}`}
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

const Portal = ({ filters, setFilters, openFilter, onOpenJob }) => {
  const { t, locale } = useI18n();
  const store = useAuthStore();
  const [sortDir, setSortDir] = useState("asc");

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
        <div className="label" style={{ marginTop: 4 }}>
          {all.length} {t("openTours")} ·{" "}
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
        className="scroll"
        style={{ padding: "16px 18px 24px", background: "var(--paper-2)" }}
      >
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ padding: 16, borderRight: "1px solid var(--line)" }}>
              <Lbl>{t("date")}</Lbl>
              <div style={{ fontWeight: 600, marginTop: 6 }}>
                {job.dateLong}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <Lbl>{t("timeWindow")}</Lbl>
              <div style={{ fontWeight: 600, marginTop: 6 }} className="mono">
                {job.windowFlex
                  ? t("flexible")
                  : `${job.windowFrom} – ${job.windowTo}`}
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
          <Lbl>{t("payout")}</Lbl>
          <div
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}
            className="tnum"
          >
            € {job.price.toFixed(2)}
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
            {job.dateLong} ·{" "}
            {job.windowFlex
              ? t("flexible")
              : `${job.windowFrom}–${job.windowTo}`}{" "}
            · {job.vehicle} · {job.axle}
          </div>
          <div
            style={{ fontSize: 18, fontWeight: 700, marginTop: 10 }}
            className="tnum"
          >
            € {job.price.toFixed(2)}
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
            {t("viewPartnerPolicy")}
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
// INVOICE UPLOADS (mock metadata only)
// =========================================================================
const JobInvoiceUpload = ({ jobId }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const inputRef = useRef(null);
  const uploads = store.getInvoiceUploads().filter((u) => u.jobId === jobId);
  const active = store.isCurrentDriverActive();
  const onPick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = AuthStore.addInvoiceUpload(f, { jobId });
    if (!r.ok && r.reason === "invalid_type")
      window.alert(t("invoiceUploadInvalidType"));
    else if (!r.ok && r.reason === "driver_restricted")
      window.alert(t("invoiceUploadRestricted"));
  };
  if (!active) return null;
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
      <Lbl>{t("invoiceUploadSectionJob")}</Lbl>
      <p
        style={{
          fontSize: 12,
          color: "var(--muted)",
          margin: "8px 0 12px",
          lineHeight: 1.55,
        }}
      >
        {t("invoiceUploadHint")}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
        style={{ display: "none" }}
        onChange={onPick}
      />
      <button
        type="button"
        className="btn xs"
        onClick={() => inputRef.current?.click()}
      >
        <Ic.Plus /> {t("invoiceUploadButton")}
      </button>
      {uploads.length > 0 ? (
        <ul
          style={{
            margin: "14px 0 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {uploads.map((u) => (
            <li
              key={u.id}
              style={{
                fontSize: 12.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="mono" style={{ wordBreak: "break-all" }}>
                {u.fileName}
              </span>
              {u.processed ? (
                <Pill status="completed">{t("invoiceProcessedBadge")}</Pill>
              ) : (
                <Pill status="assigned">{t("invoicePendingBadge")}</Pill>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="label" style={{ marginTop: 12 }}>
          {t("invoiceUploadEmpty")}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// JOB DETAIL — UNLOCKED (after acceptance / running)
// =========================================================================
const JobUnlocked = ({ job, onBack, onReturn, onComplete }) => {
  const { t, locale } = useI18n();
  const isCompleted = job.status === "completed";
  const deadlinePassed = AuthStore.isReturnDeadlinePassed(job);
  const deadline = AuthStore.returnDeadline(job);
  const deadlineStr = deadline
    ? deadline.toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const returnBlocked = job.status === "return_requested" || deadlinePassed;
  const canComplete = ["assigned", "accepted"].includes(job.status);
  const pickup = job.contactPickup || {};
  const drop = job.contactDelivery || {};
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: "1px dashed var(--line-dash)",
          }}
        >
          {job.status === "completed" ? (
            <Pill status="completed">{t("completed")}</Pill>
          ) : job.status === "return_requested" ? (
            <Pill status="return_requested">{t("returnRequested")}</Pill>
          ) : job.status === "assigned" ? (
            <Pill status="assigned">{t("assignedShort")}</Pill>
          ) : (
            <Pill status="accepted">{t("acceptedActive")}</Pill>
          )}
          <span className="label mono">{job.id}</span>
        </div>

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

        <JobInvoiceUpload jobId={job.id} />

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
            <Lbl>{t("payout")}</Lbl>
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
            € {job.price.toFixed(2)}
          </div>
        </div>

        <div
          className="dash-area"
          style={{
            marginTop: 18,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          {t("returnDeadlineNote", {
            deadline: deadlineStr,
            closed: deadlinePassed ? t("closedSuffix") : "",
          })}
        </div>
      </div>
      {!isCompleted && (
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
            onClick={onReturn}
            disabled={returnBlocked}
          >
            {job.status === "return_requested"
              ? t("awaitingDispatch")
              : deadlinePassed
                ? t("returnWindowClosed")
                : t("returnReportIssue")}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={onComplete}
            disabled={!canComplete}
          >
            {t("markCompleted")}
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
    ["assigned", "accepted", "return_requested"].includes(j.status),
  );
  const done = mine.filter((j) => j.status === "completed");
  const cancelled = mine.filter((j) => j.status === "cancelled");
  const list = tab === "active" ? active : tab === "done" ? done : cancelled;

  const pillFor = (job) => {
    if (job.status === "return_requested")
      return <Pill status="return_requested">{t("returnShort")}</Pill>;
    if (job.status === "assigned")
      return <Pill status="assigned">{t("assignedShort")}</Pill>;
    if (job.status === "accepted")
      return <Pill status="accepted">{t("active")}</Pill>;
    if (job.status === "completed")
      return <Pill status="completed">{t("completed")}</Pill>;
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
            ["done", t("completed"), done.length],
            ["cxl", t("cancelled"), cancelled.length],
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
              }}
            >
              {pillFor(job)}
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
                € {job.price.toFixed(2)}
              </div>
            </div>
            <hr className="dash" style={{ margin: "12px 0 8px" }} />
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--muted)" }}
            >
              {job.date} ·{" "}
              {job.windowFlex
                ? t("flexible")
                : `${job.windowFrom}–${job.windowTo}`}{" "}
              · {displayVehicle(job.vehicle, t)}
            </div>
          </div>
        ))}
        <div className="list-end">— {t("endOfList")} —</div>
      </div>
    </>
  );
};

// =========================================================================
// RETURN / PROBLEM SHEET
// =========================================================================
const ReturnSheet = ({ job, onClose, onSubmit }) => {
  const { t, locale } = useI18n();
  const [reason, setReason] = useState("return");
  const [text, setText] = useState("");
  const valid = text.trim().length >= 10;
  const dl = AuthStore.returnDeadline(job);
  const dlStr = dl
    ? dl.toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const closed = AuthStore.isReturnDeadlinePassed(job);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber"></div>
        <div className="sheet-head">
          <h2>{t("returnEscalate")}</h2>
          <button type="button" onClick={onClose} className="btn icon sm">
            <Ic.X />
          </button>
        </div>
        <div className="sheet-body">
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: closed ? "var(--st-cancelled)" : "var(--muted)",
              marginBottom: 12,
            }}
          >
            {t("cutoffBeforeJob", {
              deadline: dlStr,
              closed: closed ? t("closedSuffix") : "",
            })}
          </div>
          <div className="field-label">{t("reason")}</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 18,
            }}
          >
            {[
              ["return", t("returnReasonFormal"), t("returnReasonFormalSub")],
              [
                "pickup",
                t("returnReasonPickupBlocked"),
                t("returnReasonPickupBlockedSub"),
              ],
              [
                "accident",
                t("returnReasonIncident"),
                t("returnReasonIncidentSub"),
              ],
            ].map(([id, label, sub]) => (
              <div
                key={id}
                role="button"
                tabIndex={0}
                className={
                  "radio-card " +
                  (reason === id ? "on" : "") +
                  (closed ? "" : "")
                }
                style={{ opacity: closed ? 0.5 : 1 }}
                onClick={() => !closed && setReason(id)}
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
            placeholder={t("returnPlaceholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={closed}
          />
          <div className="label" style={{ marginTop: 6 }}>
            {t("charsRequired")}{" "}
            <span style={{ color: "var(--muted-2)", marginLeft: 8 }}>
              {text.length}/10
            </span>
          </div>
          <hr className="dash" style={{ margin: "16px 0" }} />
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--muted)",
              lineHeight: 1.6,
              letterSpacing: 0.04,
            }}
          >
            {t("returnSubmissionNotice")}
          </div>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>
            {t("close")}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!valid || closed}
            onClick={() => onSubmit(reason, text)}
          >
            {t("submit")}
          </button>
        </div>
      </div>
    </div>
  );
};

const PendingNotice = ({ onClose }) => {
  const { t } = useI18n();
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
          {t("returnSentStatus")}{" "}
          <strong style={{ color: "var(--text)" }}>
            {t("returnRequested")}
          </strong>
          . {t("dispatchWillFollowUp")}
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
            {t("partnerId")}: AU-41-0228 · {t("driverStatusActive")}
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

const InfoPane = () => {
  const { t } = useI18n();
  return (
    <div className="scroll" style={{ padding: "10px 22px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
        {t("knowledgeBase")}
      </h1>
      {[
        [t("autheonWorkflow"), t("autheonWorkflowSub")],
        [t("bindingAcceptanceInfo"), t("bindingAcceptanceInfoSub")],
        [t("returnsIncidents"), t("returnsIncidentsSub")],
        [t("settlementRhythm"), t("settlementRhythmSub")],
        [t("dispatcherHotline"), t("dispatcherHotlineSub")],
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
    </div>
  );
};

const ProfilePaneFull = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const d = store.getCurrentDriver();
  const prefs = d?.prefs || {};
  const setPref = (patch) => store.updateDriverPrefs(patch);
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
            {t("partnerId")}: {d?.partnerId} ·{" "}
            {displayDriverStatus(d?.status, t)}
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 14, marginTop: 16 }}>
        <Lbl>{t("profileMasterData")}</Lbl>
        {[
          [t("company"), d?.company],
          [t("address"), d?.address],
          [t("email"), d?.email],
          [t("phone"), d?.phone],
          [t("accountStatus"), displayDriverStatus(d?.status, t)],
        ].map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span className="label" style={{ fontSize: 9.5 }}>
              {k}
            </span>
            <span style={{ fontSize: 12.5, textAlign: "right" }}>{v}</span>
          </div>
        ))}
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 12.5,
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          {t("masterDataChangeNotice")}
        </p>
      </div>
      {store.getFeatureFlag("notificationPreferences") && (
        <div className="card" style={{ padding: 14, marginTop: 14 }}>
          <Lbl>{t("notificationPreferences")}</Lbl>
          <label className="field-label" style={{ marginTop: 14 }}>
            {t("pickupPostalArea")}
          </label>
          <input
            className="input mono"
            value={prefs.startPlz || ""}
            onChange={(e) => setPref({ startPlz: e.target.value })}
            placeholder="e.g. 80"
          />
          <label className="field-label" style={{ marginTop: 12 }}>
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
              checked={!!prefs.push}
              onChange={(e) => setPref({ push: e.target.checked })}
            />
            {t("pushNotificationsEnabled")}
          </label>
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
      )}
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

const InfoPaneFull = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const docs = store.getDocuments().filter((d) => d.visible);
  return (
    <div className="scroll" style={{ padding: "10px 22px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
        {t("infoTitle")}
      </h1>
      {docs.map((d) => (
        <div
          key={d.id}
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
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {displayDocTitle(d, t)}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {displayDocCategory(d.category, t)} ·{" "}
              {displayDocScope(d.scope, t)} · {d.version}
            </div>
          </div>
          <Ic.Chev />
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
    </div>
  );
};

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
  JobInvoiceUpload,
  MyJobs,
  ReturnSheet,
  PendingNotice,
  ProfilePane,
  InfoPane,
  ProfilePaneFull,
  InfoPaneFull,
});
