/* global React, AuthStore, useAuthStore, Pill, Lbl, Ic */
const {
  useState: useStateA,
  useEffect: useEffectA,
  useMemo: useMemoA,
  useRef: useRefA,
} = React;

const ADMIN_TOUR_DOC_TYPES = [
  "invoice",
  "fuel_receipt",
  "toll_receipt",
  "delivery_note",
  "waiting_time_evidence",
  "other_proof",
  "other_receipt",
];

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
    }[code] || code || "—"
  );
};

const tourDocSupplierInvoiceId = (doc) => {
  if (!AuthStore.isTourBillingInvoiceType(doc?.documentType)) return "";
  return String(doc.supplierInvoiceNumber || "").trim();
};

const uniqueTourDocTypeLabels = (docs, t) => {
  const seen = new Set();
  const labels = [];
  for (const d of docs) {
    const code = AuthStore.normalizeTourDocumentType(d.documentType);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    labels.push(displayTourDocType(code, t));
  }
  return labels;
};

// =========================================================================
// ADMIN — NAV
// =========================================================================
const AdminNav = ({ section, setSection }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const total = store.getJobs().length;
  const invCount = store.getTourDocuments().length;
  const alertCount = store.getAdminEmailQueue().length;
  const mdrOpenCount = store.getOpenMasterDataChangeRequestCount();
  const financeOn = store.getFeatureFlag("financeModule");
  const items = [
    { id: "overview", label: t("navJobs"), count: total, I: Ic.N.Tour },
    {
      id: "notifications",
      label: t("adminNotificationFeed"),
      count: alertCount,
      I: Ic.N.Audit,
    },
    {
      id: "masterdata",
      label: t("navMasterDataRequests"),
      count: mdrOpenCount || null,
      I: Ic.N.Users,
    },
    { id: "drivers", label: t("navDrivers"), count: null, I: Ic.N.Users },
    { id: "staff", label: t("navStaff"), count: null, I: Ic.N.Users },
    {
      id: "customers",
      label: t("navCustomers") || "Customers",
      count: null,
      I: Ic.N.Building,
    },
    {
      id: "addresses",
      label: t("navAddresses") || "Addresses",
      count: null,
      I: Ic.N.Building,
    },
    { id: "infopoint", label: t("navInfopoint"), count: null, I: Ic.N.Doc },
    {
      id: "invoices",
      label: t("navTourBilling"),
      count: invCount,
      I: Ic.N.Doc,
    },
    ...(financeOn
      ? [{ id: "finance", label: t("navFinance"), count: null, I: Ic.N.Audit }]
      : []),
    { id: "audit", label: t("navAuditLog"), count: null, I: Ic.N.Audit },
    { id: "features", label: t("navFeatures"), count: null, I: Ic.N.Settings },
  ];
  return (
    <aside className="admin-nav">
      <div className="nav-head">
        <div className="nav-eyebrow">{t("adminConsole")}</div>
        <div className="nav-brand">
          <img
            className="brand-mark"
            src="favicon.svg"
            alt=""
            width="22"
            height="22"
            aria-hidden="true"
          />{" "}
          {store.getAppDisplayName()}
        </div>
      </div>
      <div className="nav-list">
        <div className="nav-section">{t("navigate")}</div>
        {items.map((it) => (
          <button
            type="button"
            key={it.id}
            className={
              "nav-item " +
              (section === it.id ||
              (section === "detail" && it.id === "overview")
                ? "on"
                : "")
            }
            onClick={() => setSection(it.id)}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <span className="ic">
                <it.I />
              </span>{" "}
              {it.label}
            </span>
            {it.count != null && <span className="count">{it.count}</span>}
          </button>
        ))}
      </div>
      <div className="nav-foot">
        <span className="avatar">AB</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Anna Bauer</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            {t("dispatcher")}
          </div>
        </div>
        <button
          className="btn icon sm"
          title={t("adminLogoutTitle")}
          onClick={() => window.alert(t("adminLogoutDemoAlert"))}
        >
          <Ic.Logout />
        </button>
      </div>
    </aside>
  );
};

// =========================================================================
// ADMIN — OVERVIEW (TABLE)
// =========================================================================
const Overview = ({ onOpen, freshId }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [statusFilter, setStatusFilter] = useStateA(null); // null = all active
  const [search, setSearch] = useStateA("");
  const [density, setDensity] = useStateA("comfort");
  const [filtersOpen, setFiltersOpen] = useStateA(false);
  const counts = store.countsByStatus();

  const all = store.getJobs();
  const filtered = all.filter((j) => {
    if (statusFilter && j.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(
          j.tour.toLowerCase().includes(q) ||
          j.customer.toLowerCase().includes(q) ||
          (j.driver || "").toLowerCase().includes(q) ||
          j.startCity.toLowerCase().includes(q) ||
          j.endCity.toLowerCase().includes(q)
        )
      )
        return false;
    }
    return true;
  });

  const stats = [
    ["draft", AuthStore.statusLabel("draft")],
    ["published", AuthStore.statusLabel("published")],
    ["assigned", AuthStore.statusLabel("assigned")],
    ["accepted", AuthStore.statusLabel("accepted")],
    ["special_case", AuthStore.statusLabel("special_case")],
    ["performed", AuthStore.statusLabel("performed")],
    ["cancelled", AuthStore.statusLabel("cancelled")],
  ];

  const statusLegendKeys = [
    "draft",
    "published",
    "assigned",
    "accepted",
    "special_case",
    "performed",
    "cancelled",
  ];

  return (
    <>
      <div className="statgrid" role="group" aria-label={t("jobOverview")}>
        {stats.map(([s, lbl]) => (
          <button
            type="button"
            key={s}
            className={"stat " + (statusFilter === s ? "on" : "")}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
          >
            <div className="label">{lbl}</div>
            <div className="num">{counts[s] || 0}</div>
            <div className="sub">
              {Math.round(((counts[s] || 0) / Math.max(1, all.length)) * 100)}%
              of jobs
            </div>
          </button>
        ))}
      </div>

      <details className="card status-explain">
        <summary className="status-explain-summary">
          {t("statusExplain.title")}
        </summary>
        <div className="status-explain-body">
          <p className="status-explain-intro">{t("statusExplain.intro")}</p>
          <p className="status-explain-note">
            {t("statusExplain.noteSeparate")}
          </p>
          <ul className="status-explain-list" role="list">
            {statusLegendKeys.map((key) => (
              <li key={key}>
                <span className="status-explain-pill">
                  <Pill status={key} />
                </span>
                <p className="status-explain-text">
                  {t("statusExplain." + key)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <div className="toolbar">
        <div className="search">
          <span className="ic">
            <Ic.Search />
          </span>
          <input
            className="input"
            placeholder={t("searchJobsPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t("searchJobsPlaceholder")}
          />
        </div>
        <button
          type="button"
          className={"chip " + (filtersOpen ? "on" : "")}
          style={{ cursor: "pointer" }}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Ic.Filter /> {t("filters")}
        </button>
        {statusFilter ? (
          <span
            className="chip on"
            style={{ cursor: "pointer" }}
            onClick={() => setStatusFilter(null)}
          >
            {t("adminFilterStatusPrefix")}{" "}
            {AuthStore.statusLabel(statusFilter)}{" "}
            <span className="x">
              <Ic.X />
            </span>
          </span>
        ) : (
          <span className="chip">{t("statusAll")}</span>
        )}
        <span style={{ flex: 1 }}></span>
        <div className="seg density-toggle" style={{ gridAutoFlow: "column" }}>
          <button
            type="button"
            className={density === "comfort" ? "on" : ""}
            onClick={() => setDensity("comfort")}
          >
            {t("adminComfort")}
          </button>
          <button
            type="button"
            className={density === "dense" ? "on" : ""}
            onClick={() => setDensity("dense")}
          >
            {t("adminDense")}
          </button>
        </div>
        <span
          className="label"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Ic.Sort /> {t("tourNo")} ↓
        </span>
      </div>

      {filtersOpen && (
        <div
          className="card"
          style={{
            padding: 14,
            margin: "-6px 0 14px",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span className="label">{t("adminQuickFilters")}</span>
          {stats.map(([s, lbl]) => (
            <button
              key={s}
              type="button"
              className={"chip " + (statusFilter === s ? "on" : "")}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            >
              {lbl}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            onClick={() => {
              setStatusFilter(null);
              setSearch("");
            }}
          >
            {t("adminReset")}
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table className={`tbl ${density === "dense" ? "dense" : ""}`}>
          <thead>
            <tr>
              <th style={{ width: 96 }}>{t("adminColTour")}</th>
              <th>{t("adminColCustomer")}</th>
              <th>{t("adminColOrigin")}</th>
              <th>{t("adminColDestination")}</th>
              <th>{t("adminColAppointment")}</th>
              <th>{t("adminColVehicle")}</th>
              <th>{t("adminColDriver")}</th>
              <th>{t("adminColStatusHeader")}</th>
              <th>{t("adminColDocuments") || "Documents"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr
                key={j.id}
                className={"row " + (j.id === freshId ? "fresh" : "")}
                onClick={() => onOpen(j)}
              >
                <td>
                  <div className="tour">{j.tour}</div>
                  {j.isNew && <div className="new-tag">{t("newTag")}</div>}
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{j.customer}</div>
                  {j.isNew && (
                    <div
                      className="label"
                      style={{ fontSize: 9.5, marginTop: 2 }}
                    >
                      {t("adminRowDemo")}
                    </div>
                  )}
                </td>
                <td className="mono num">{j.startPlz}</td>
                <td className="mono num">{j.endPlz}</td>
                <td className="mono date" style={{ fontSize: 12 }}>
                  {AuthStore.formatJobScheduleShort(j, t("adminWindowFlex"))}
                </td>
                <td>{j.vehicle === "Transporter" ? t("adminVehicleTrp") : j.vehicle}</td>
                <td>{j.driver || "—"}</td>
                <td>
                  <Pill status={j.status} />
                </td>
                <td>
                  {store.getJobDisplayStatus(j) ? (
                    <span className="label" style={{ fontSize: 11 }}>
                      {store.getJobDisplayStatus(j)}
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted-2)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "var(--muted)",
                  }}
                >
                  {t("noJobsMatch")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

const OverviewFooter = ({ filteredCount, totalCount }) => {
  const { t } = useI18n();
  const [page, setPage] = useStateA(1);
  const [rows, setRows] = useStateA(25);
  const maxPage = Math.max(1, Math.ceil(totalCount / rows));
  return (
    <>
      <span className="label">
        {t("showingRows", {
          to: Math.min(rows, filteredCount),
          total: totalCount,
        })}{" "}
        {t("adminOverviewPage", { cur: page, max: maxPage })}
      </span>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
        <span className="label">{t("rowsPerPage")}</span>
        <select
          className="input"
          style={{ width: 74, padding: "6px 8px", fontSize: 13 }}
          value={rows}
          onChange={(e) => {
            setRows(Number(e.target.value));
            setPage(1);
          }}
        >
          <option>25</option>
          <option>50</option>
          <option>100</option>
        </select>
        <div
          style={{ display: "inline-flex", gap: 4 }}
          onClick={(e) => {
            const txt = e.target?.textContent || "";
            if (txt.includes("‹")) setPage(Math.max(1, page - 1));
            if (txt.includes("›")) setPage(Math.min(maxPage, page + 1));
          }}
        >
          <button
            className="btn icon sm"
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            ‹
          </button>
          <button
            className="btn xs"
            style={{
              minWidth: 30,
              background: page === 1 ? "var(--paper)" : "var(--paper-3)",
            }}
            onClick={() => setPage(1)}
          >
            1
          </button>
          <button
            className="btn xs"
            style={{
              minWidth: 30,
              background: page === 2 ? "var(--paper)" : "var(--paper-3)",
            }}
            onClick={() => setPage(Math.min(maxPage, 2))}
          >
            2
          </button>
          <button
            className="btn xs"
            style={{
              minWidth: 30,
              background: page === 3 ? "var(--paper)" : "var(--paper-3)",
            }}
            onClick={() => setPage(Math.min(maxPage, 3))}
          >
            3
          </button>
          <span style={{ padding: "0 6px", color: "var(--muted)" }}>…</span>
          <button
            className="btn xs"
            style={{
              minWidth: 30,
              background: page === maxPage ? "var(--paper)" : "var(--paper-3)",
            }}
            onClick={() => setPage(maxPage)}
          >
            {maxPage}
          </button>
          <button
            className="btn icon sm"
            onClick={() => setPage(Math.min(maxPage, page + 1))}
          >
            ›
          </button>
        </div>
      </div>
    </>
  );
};

const JobFinancePanel = ({ job, onEditFinances, onOpenTourBilling }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const linkedInvoices = store.getTourDocumentsForJob(job.id);
  const fmt = (n) =>
    n == null || n === "" ? "—" : `€ ${Number(n).toFixed(2)}`;
  const paymentLabel = (code) => {
    const m = {
      "Invoice Missing": "adminPaymentOptMissing",
      "Invoice Received": "adminPaymentOptReceived",
      Paid: "adminPaymentOptPaid",
    };
    const key = m[AuthStore.normalizePaymentStatus(code)];
    return key ? t(key) : code || t("adminPaymentOptMissing");
  };
  const showPendingBanner =
    linkedInvoices.length > 0 &&
    linkedInvoices.some((u) => u.reviewStatus === "uploaded");
  const snapshotDocTypes = uniqueTourDocTypeLabels(linkedInvoices, t);
  const displayDocReviewStatus = (st) => {
    const code = AuthStore.normalizeTourDocumentReviewStatus(st);
    return (
      {
        uploaded: t("docReviewUploaded"),
        accepted: t("docReviewAccepted"),
        rejected: t("docReviewRejected"),
        correction_required: t("docReviewCorrectionRequired"),
      }[code] || code || "—"
    );
  };
  return (
    <section className="card" style={{ padding: 22 }}>
      <div className="sec-head">
        <h3>
          <span className="num">06</span>
          {t("adminFinanceSnapshotTitle")}
        </h3>
        <span className="label pill-muted">{t("adminViewOnlyBadge")}</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
          marginTop: 14,
        }}
      >
        <div>
          <div className="label">{t("financeCustomerRevenue")}</div>
          <div style={{ fontWeight: 600, marginTop: 6 }} className="tnum">
            {fmt(job.revenue)}
          </div>
        </div>
        <div>
          <div className="label">{t("driverOffer")}</div>
          <div style={{ fontWeight: 600, marginTop: 6 }} className="tnum">
            {fmt(job.driverOffer)}
          </div>
        </div>
        <div>
          <div className="label">{t("financeExpenses")}</div>
          <div style={{ fontWeight: 600, marginTop: 6 }} className="tnum">
            {fmt(job.expenses)}
          </div>
        </div>
        <div>
          <div className="label">
            {t("financeNetVat", { vat: job.vatRate ?? 19 })}
          </div>
          <div style={{ fontWeight: 600, marginTop: 6 }} className="tnum">
            {fmt(job.netAmount)}
          </div>
        </div>
        <div>
          <div className="label">{t("financeGross")}</div>
          <div style={{ fontWeight: 600, marginTop: 6 }} className="tnum">
            {fmt(job.grossAmount)}
          </div>
        </div>
      </div>
      <div className="finance-snapshot-strip">
        <div>
          <div className="label">{t("adminFinanceSnapshotPayment")}</div>
          <Pill
            status={job.paymentStatus === "Paid" ? "performed" : "assigned"}
            style={{ marginTop: 8 }}
          >
            {paymentLabel(job.paymentStatus)}
          </Pill>
        </div>
        <div>
          <div className="label">{t("invoiceReceived")}</div>
          <Pill
            status={job.invoiceReceived ? "accepted" : "assigned"}
            style={{ marginTop: 8 }}
          >
            {job.invoiceReceived
              ? t("adminSnapshotInvoiceYes")
              : t("adminSnapshotInvoiceNo")}
          </Pill>
        </div>
        <div>
          <div className="label">{t("adminFinanceSnapshotInvNum")}</div>
          <div className="mono" style={{ marginTop: 8, fontWeight: 600 }}>
            {job.invoiceNumber || "—"}
          </div>
          {snapshotDocTypes.length > 0 && (
            <div
              className="label"
              style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45 }}
            >
              {snapshotDocTypes.join(" · ")}
            </div>
          )}
        </div>
      </div>

      {linkedInvoices.length > 0 && (
        <table className="tbl compact" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>{t("adminFinanceUploadColId")}</th>
              <th>{t("adminFinanceUploadColFile")}</th>
              <th>{t("adminFinanceUploadColStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {linkedInvoices.map((u) => {
              const invId = tourDocSupplierInvoiceId(u);
              return (
              <tr key={u.id}>
                <td style={{ fontSize: 12, minWidth: 140 }}>
                  <div className="mono" style={{ fontWeight: 600 }}>
                    {invId || "—"}
                  </div>
                  <div
                    className="label"
                    style={{ fontSize: 11, marginTop: 4, lineHeight: 1.35 }}
                  >
                    {displayTourDocType(u.documentType, t)}
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{u.fileName}</td>
                <td>
                  <Pill
                    status={
                      u.reviewStatus === "accepted"
                        ? "accepted"
                        : u.reviewStatus === "rejected" ||
                            u.reviewStatus === "correction_required"
                          ? "cancelled"
                          : "assigned"
                    }
                  >
                    {displayDocReviewStatus(u.reviewStatus)}
                  </Pill>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      )}

      {showPendingBanner && (
        <div className="finance-snapshot-banner" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            {t("adminFinancePendingBanner")}
          </div>
          {onOpenTourBilling && (
            <button
              type="button"
              className="btn xs"
              style={{ marginTop: 10 }}
              onClick={onOpenTourBilling}
            >
              {t("adminFinanceReviewDocuments")}
            </button>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        {onEditFinances && (
          <button type="button" className="btn primary" onClick={onEditFinances}>
            {t("adminEditFinancesBtn")}
          </button>
        )}
        {onOpenTourBilling && (
          <button type="button" className="btn" onClick={onOpenTourBilling}>
            {t("adminOpenTourBillingBtn")}
          </button>
        )}
      </div>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: 12.5,
          color: "var(--muted)",
          lineHeight: 1.55,
        }}
      >
        {t("adminFinanceCompletedInvoiceNote")}
      </p>
    </section>
  );
};

const SPECIAL_CASE_STORE_DECISION = {
  continue: "continue",
  republish: "republish",
  cancel: "cancel",
  close: "close",
};

const SpecialCaseResolutionPanel = ({ job, showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [note, setNote] = useStateA("");
  const [cancelReasonCode, setCancelReasonCode] = useStateA("");
  const [cancelDriverMessage, setCancelDriverMessage] = useStateA("");
  const codes = store.getCancellationReasonCodes();
  const minMsg =
    store.getOperationalPolicies().cancellation?.adminCancelDriverMessageMinChars ||
    20;
  const hasDriver = !!(job.driver || job.driverId);
  if (job.status !== "special_case") return null;
  const report = job.specialCaseReport || {};
  const priorStatus =
    report.statusBeforeSpecialCase ||
    (() => {
      const hist = job.history || [];
      for (let i = hist.length - 1; i >= 0; i--) {
        const st = hist[i]?.st;
        if (st === "special_case") continue;
        if (st === "assigned" || st === "accepted") return st;
      }
      return "assigned";
    })();
  const resolve = (decision) => {
    const mapped = SPECIAL_CASE_STORE_DECISION[decision] || decision;
    const opts =
      mapped === "cancel"
        ? {
            reasonCode: cancelReasonCode,
            driverMessage: cancelDriverMessage || note.trim(),
          }
        : {};
    const r = store.resolveSpecialCase(job.id, mapped, note.trim(), opts);
    if (r && r.ok) {
      showToast?.(
        t("adminSpecialCaseResolved") || "Special case resolved",
        AuthStore.statusLabel(store.getJob(job.id)?.status || decision),
      );
      setNote("");
    } else {
      showToast?.(
        t("adminSpecialCaseResolveFailed") || "Could not resolve special case",
      );
    }
  };
  return (
    <section className="card" style={{ padding: 22, borderColor: "#c4b5fd" }}>
      <div className="sec-head">
        <h3>
          <span className="num">07</span>
          {t("adminSpecialCaseTitle") || "Special case"}
        </h3>
        <Pill status="special_case" />
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.55 }}>
        <strong>{job.driver || "—"}</strong>
        {report.reason ? ` · ${report.reason}` : ""}
      </p>
      <div
        className="dash-area"
        style={{
          marginTop: 12,
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          letterSpacing: 0,
          textTransform: "none",
        }}
      >
        {report.message || report.note || "—"}
      </div>
      {(report.evidence || []).length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div className="label" style={{ marginBottom: 8 }}>
            {t("adminSpecialCaseEvidence")}
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {(report.evidence || []).map((ev) => (
              <li
                key={ev.id}
                style={{
                  fontSize: 12.5,
                  padding: "8px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)",
                  background: "var(--paper)",
                }}
              >
                <span className="mono" style={{ wordBreak: "break-all" }}>
                  {ev.fileName}
                </span>
                <button
                  type="button"
                  className="btn ghost xs"
                  style={{ marginTop: 6, padding: 0 }}
                  onClick={() =>
                    window.alert(`${t("adminSpecialCaseEvidenceDemo")}: ${ev.fileName}`)
                  }
                >
                  {t("adminSpecialCaseEvidenceDemo")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p
        className="label"
        style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.45 }}
      >
        {t("adminSpecialCaseResumeHint", {
          status: AuthStore.statusLabel(priorStatus),
        })}
      </p>
      {hasDriver ? (
        <>
          <label className="field-label" style={{ marginTop: 14 }}>
            {t("adminCancelReasonLabel")}
          </label>
          <select
            className="input"
            style={{ marginTop: 6, width: "100%" }}
            value={cancelReasonCode}
            onChange={(e) => setCancelReasonCode(e.target.value)}
          >
            <option value="">{t("adminCancelReasonPlaceholder")}</option>
            {codes.map((c) => (
              <option key={c} value={c}>
                {t(`cancellationReason_${c}`) || store.getCancellationReasonLabel(c)}
              </option>
            ))}
          </select>
          <label className="field-label" style={{ marginTop: 12 }}>
            {t("adminCancelDriverMessageLabel")}
          </label>
          <textarea
            className="input"
            rows={3}
            style={{ marginTop: 6, width: "100%" }}
            value={cancelDriverMessage}
            onChange={(e) => setCancelDriverMessage(e.target.value)}
            placeholder={t("adminCancelDriverMessagePh")}
          />
          <div className="label" style={{ marginTop: 4 }}>
            {t("adminCancelMessageCounter", {
              count: cancelDriverMessage.length,
              min: minMsg,
            })}
          </div>
        </>
      ) : null}
      <div
        style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="btn primary"
          onClick={() => resolve("continue")}
          title={t("adminSpecialCaseContinueTitle", {
            status: AuthStore.statusLabel(priorStatus),
          })}
        >
          {t("adminSpecialCaseContinue") || "Continue tour"}
        </button>
        <button type="button" className="btn" onClick={() => resolve("republish")}>
          {t("adminSpecialCaseRepublish") || "Republish / draft"}
        </button>
        <button type="button" className="btn" onClick={() => resolve("close")}>
          {t("adminSpecialCaseClose") || "Close"}
        </button>
        <button
          type="button"
          className="btn danger"
          disabled={
            hasDriver &&
            (!cancelReasonCode || cancelDriverMessage.length < minMsg)
          }
          onClick={() => resolve("cancel")}
        >
          {t("adminSpecialCaseCancel") || "Cancel tour"}
        </button>
      </div>
      <label
        className="field-label"
        style={{ marginTop: 14 }}
        htmlFor={`sc-note-${job.id}`}
      >
        {t("adminSpecialCaseNotes") || "Resolution notes"}
      </label>
      <textarea
        id={`sc-note-${job.id}`}
        className="input"
        placeholder={t("adminRejectNotePlaceholder")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </section>
  );
};

// =========================================================================
// ADMIN — ASSIGN / REASSIGN DRIVER
// =========================================================================
const assignDriverErr = (r, t) => {
  if (!r || r.ok) return "";
  const reason = r.reason;
  if (reason === "not_draft") return t("assignBlockedSub");
  if (reason === "not_reassignable") return t("reassignBlockedSub");
  if (reason === "driver_required") return t("adminAssignDriverRequired");
  if (reason === "driver_not_found") return t("adminAssignDriverNotFound");
  if (reason === "driver_not_active") return t("adminAssignDriverInactive");
  if (reason === "same_driver") return t("adminReassignSameDriver");
  return t("adminInvoiceErrGeneric");
};

const AssignDriverDialog = ({
  open,
  mode,
  job,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const drivers = store.getAssignableDrivers();
  const [driverId, setDriverId] = useStateA("");
  const [confirmationNote, setConfirmationNote] = useStateA("");

  useEffectA(() => {
    if (!open || !job) return;
    const list = store.getAssignableDrivers();
    const preferred =
      job.driverId && list.some((d) => d.id === job.driverId)
        ? job.driverId
        : list.find((d) => d.name === job.driver)?.id;
    setDriverId(preferred || list[0]?.id || "");
    setConfirmationNote("");
  }, [open, job?.id, job?.driverId, job?.driver]);

  if (!open || !job) return null;

  const title =
    mode === "reassign"
      ? t("adminReassignDriverTitle")
      : t("adminAssignDriverTitle");
  const hint =
    mode === "reassign"
      ? t("adminReassignDriverHint")
      : t("adminAssignDriverHint");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-driver-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 103,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="card elev"
        style={{ maxWidth: 480, width: "100%", padding: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="assign-driver-title" style={{ margin: "0 0 6px", fontSize: 18 }}>
          {title}
        </h2>
        <p
          className="label"
          style={{ margin: "0 0 14px", fontSize: 12.5, lineHeight: 1.55 }}
        >
          {hint}
        </p>
        <div
          className="mono"
          style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}
        >
          {t("tourNo")} {job.tour} · {job.customer}
        </div>
        {drivers.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--st-cancelled)" }}>
            {t("adminAssignNoActiveDrivers")}
          </p>
        ) : (
          <div>
            <label className="field-label" htmlFor="assign-driver-select">
              {t("adminAssignDriverSelectLabel")}
            </label>
            <select
              id="assign-driver-select"
              className="input"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.driverCode}
                  {d.company ? ` · ${d.company}` : ""}
                </option>
              ))}
            </select>
            {job.driver && mode === "reassign" ? (
              <p
                className="label"
                style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.45 }}
              >
                {t("adminAssignCurrentDriver", { name: job.driver })}
              </p>
            ) : null}
          </div>
        )}
        {mode !== "reassign" ? (
          <div style={{ marginTop: 14 }}>
            <label className="field-label" htmlFor="assign-confirmation-note">
              {t("adminAssignConfirmationNoteLabel")}
            </label>
            <textarea
              id="assign-confirmation-note"
              className="input"
              rows={3}
              value={confirmationNote}
              onChange={(e) => setConfirmationNote(e.target.value)}
              placeholder={t("adminAssignConfirmationNotePlaceholder")}
            />
            <p
              className="label"
              style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.45 }}
            >
              {t("adminAssignConfirmationNoteHint")}
            </p>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 18,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            {t("adminInvoiceCancel")}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!driverId || drivers.length === 0}
            onClick={() => onConfirm(driverId, confirmationNote.trim())}
          >
            {mode === "reassign"
              ? t("adminReassignDriverConfirm")
              : t("adminAssignDriverConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// ADMIN — CANCEL JOB MODAL
// =========================================================================
const AdminCancelJobModal = ({ job, onClose, onConfirm, showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const codes = store.getCancellationReasonCodes();
  const policies = store.getOperationalPolicies();
  const minMsg = policies.cancellation?.adminCancelDriverMessageMinChars || 20;
  const dr = job?.driver || job?.driverId;
  const [reasonCode, setReasonCode] = useStateA("");
  const [driverMessage, setDriverMessage] = useStateA("");
  const [overrideNote, setOverrideNote] = useStateA("");
  const policy = job ? store.checkAdminCancelPolicy(job, { overrideNote }) : { ok: true };
  const needsOverride = job && !policy.ok && policy.reason === "within_cancel_cutoff";

  const submit = () => {
    const r = store.cancelJob(job.id, {
      actor: "admin",
      reason: reasonCode,
      note: driverMessage,
      overrideNote: needsOverride ? overrideNote : "",
    });
    if (!r.ok) {
      if (r.reason === "reason_code_required")
        showToast?.(t("adminCancelReasonRequired"));
      else if (r.reason === "driver_message_too_short")
        showToast?.(
          t("adminCancelMessageTooShort", { min: r.min || minMsg }),
        );
      else if (r.reason === "within_cancel_cutoff")
        showToast?.(
          t("adminCancelCutoffBlocked", { hours: r.minHours || 1 }),
        );
      else showToast?.(t("cancellationBlocked"), t("cancellationRules"));
      return;
    }
    onConfirm?.(r);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal card" style={{ maxWidth: 480, padding: 22 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
          {t("adminCancelJobModalTitle")}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          {dr ? t("adminCancelJobModalHintDriver") : t("adminCancelJobModalHintNoDriver")}
        </p>
        {needsOverride ? (
          <div className="banner banner-warn" style={{ marginTop: 14, fontSize: 13 }}>
            {t("adminCancelCutoffBlocked", {
              hours: policy.minHours || 1,
            })}
          </div>
        ) : null}
        <div style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="cancel-reason-code">
            {t("adminCancelReasonLabel")}
          </label>
          <select
            id="cancel-reason-code"
            className="input"
            style={{ marginTop: 6, width: "100%" }}
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
          >
            <option value="">{t("adminCancelReasonPlaceholder")}</option>
            {codes.map((c) => (
              <option key={c} value={c}>
                {t(`cancellationReason_${c}`) || store.getCancellationReasonLabel(c)}
              </option>
            ))}
          </select>
        </div>
        {dr ? (
          <div style={{ marginTop: 14 }}>
            <label className="field-label" htmlFor="cancel-driver-message">
              {t("adminCancelDriverMessageLabel")}
            </label>
            <textarea
              id="cancel-driver-message"
              className="input"
              rows={4}
              style={{ marginTop: 6, width: "100%", resize: "vertical" }}
              value={driverMessage}
              onChange={(e) => setDriverMessage(e.target.value)}
              placeholder={t("adminCancelDriverMessagePh")}
            />
            <div
              className={`field-counter ${
                driverMessage.length >= minMsg ? "valid" : "invalid"
              }`}
            >
              {t("adminCancelMessageCounter", {
                count: driverMessage.length,
                min: minMsg,
              })}
            </div>
          </div>
        ) : null}
        {needsOverride ? (
          <div style={{ marginTop: 14 }}>
            <label className="field-label" htmlFor="cancel-override-note">
              {t("adminCancelOverrideLabel")}
            </label>
            <textarea
              id="cancel-override-note"
              className="input"
              rows={2}
              style={{ marginTop: 6, width: "100%" }}
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder={t("adminCancelOverridePh")}
            />
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>
            {t("adminInvoiceCancel")}
          </button>
          <button
            type="button"
            className="btn danger"
            disabled={
              !reasonCode ||
              (dr && driverMessage.length < minMsg) ||
              (needsOverride && overrideNote.trim().length < 10)
            }
            onClick={submit}
          >
            {t("adminCancelJobConfirmBtn")}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// ADMIN — DETAIL
// =========================================================================
const AdminDetail = ({
  job,
  onBack,
  onPublish,
  onRequestAssign,
  onRequestReassign,
  onCancelled,
  onEdit,
  onEditFinances,
  onOpenTourBilling,
  showToast,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const financeOn = store.getFeatureFlag("financeModule");
  const [cancelOpen, setCancelOpen] = useStateA(false);
  return (
    <>
      {cancelOpen ? (
        <AdminCancelJobModal
          job={job}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => {
            setCancelOpen(false);
            onCancelled?.(job);
          }}
          showToast={showToast}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 12,
                color: "var(--muted)",
                letterSpacing: 0.05,
              }}
            >
              {t("adminColTour")} {job.tour}
            </span>
            <Pill status={job.status} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {job.customer}
          </h1>
          <div
            className="mono"
            style={{
              fontSize: 13,
              color: "var(--muted)",
              marginTop: 6,
              letterSpacing: 0.02,
            }}
          >
            {job.startPlz} {job.startCity} → {job.endPlz} {job.endCity} ·{" "}
            {job.distanceKm} km ·{" "}
            {AuthStore.schedulesOnDifferentDays(job)
              ? `${AuthStore.formatLocationSchedule(job.pickup, t("flexible"))} → ${AuthStore.formatLocationSchedule(job.delivery, t("flexible"))}`
              : AuthStore.formatLocationSchedule(job.pickup, t("flexible"))}
          </div>
        </div>
        <div
          className="card"
          style={{ padding: "14px 18px", textAlign: "right", minWidth: 220 }}
        >
          <div className="label">{t("driverOffer")}</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              marginTop: 4,
              letterSpacing: "-0.02em",
            }}
            className="tnum"
          >
            € {(job.driverOffer ?? 0).toFixed(2)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              marginTop: 2,
            }}
          >
            {displayAxleAdmin(job.axle, t)} · {t("adminDriverOfferLumpSum")}
          </div>
        </div>
      </div>

      {job.status === "cancelled" && job.cancellationActor ? (
        <div
          className="banner banner-warn"
          style={{ marginBottom: 18, fontSize: 13, lineHeight: 1.55 }}
        >
          {t("cancellationActor")}:{" "}
          {job.cancellationActor === "driver"
            ? t("cancellationActorDriver")
            : job.cancellationActor === "customer"
              ? t("cancellationActorCustomer")
              : t("cancellationActorAdmin")}
          {job.cancellationReasonText
            ? ` — ${job.cancellationReasonText}`
            : ""}
        </div>
      ) : null}

      <div className="grid-main-aside">
        <div className="stack-18">
          {/* Route */}
          <section className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">01</span>
                {t("route")}
              </h3>
            </div>
            <div style={{ marginTop: 10, fontSize: 13.5 }}>
              <span className="label">{t("customerLabel")}</span>
              <div style={{ fontWeight: 600, marginTop: 4 }}>
                {job.customerName || job.customer || "—"}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "22px 1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 8,
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
                    minHeight: 30,
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
                <div className="label">{t("pickup")}</div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>
                  {job.startStreet}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}
                >
                  {job.startPlz} {job.startCity} · DE
                </div>
                <div className="label" style={{ marginTop: 24 }}>
                  {t("delivery")}
                </div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>
                  {job.endStreet}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}
                >
                  {job.endPlz} {job.endCity} · DE
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="label">{t("distance")}</div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    marginTop: 6,
                  }}
                  className="tnum"
                >
                  {job.distanceKm}
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--muted)",
                      marginLeft: 4,
                    }}
                  >
                    km
                  </span>
                </div>
                <div className="label" style={{ marginTop: 24 }}>
                  {t("schedule")}
                </div>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    {t("pickup")}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>
                    {AuthStore.formatLocationSchedule(
                      job.pickup,
                      t("flexible"),
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    {t("delivery")}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>
                    {AuthStore.formatLocationSchedule(
                      job.delivery,
                      t("flexible"),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Vehicle */}
          <section className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">02</span>
                {t("vehicle")}
              </h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr 1fr 1.4fr",
                gap: 24,
                marginTop: 14,
              }}
            >
              <div>
                <div className="label">{t("type")}</div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>
                  {job.vehicle}
                </div>
              </div>
              <div>
                <div className="label">{t("details")}</div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>
                  {job.vehicleModel}
                </div>
              </div>
              <div>
                <div className="label">{t("plate")}</div>
                <div
                  className="mono"
                  style={{
                    fontWeight: 600,
                    marginTop: 6,
                    padding: "4px 10px",
                    border: "1.5px solid var(--primary-ink)",
                    borderRadius: 3,
                    display: "inline-block",
                    fontSize: 13,
                  }}
                >
                  {job.plate || "—"}
                </div>
              </div>
              <div>
                <div className="label">{t("labelFin")}</div>
                <div
                  className="mono"
                  style={{ fontSize: 12, marginTop: 6, wordBreak: "break-all" }}
                >
                  {job.vin || "—"}
                </div>
              </div>
            </div>
            {job.registrationStatus || job.electricVehicle || job.redPlates ? (
              <div style={{ marginTop: 16 }}>
                <div className="label">{t("vehicleInfoLabel")}</div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  {job.registrationStatus === "registered" ? (
                    <span className="pill outline no-dot">
                      {t("vehicleInfoRegistered")}
                    </span>
                  ) : null}
                  {job.registrationStatus === "deregistered" ? (
                    <span className="pill outline no-dot">
                      {t("vehicleInfoDeregistered")}
                    </span>
                  ) : null}
                  {job.electricVehicle ? (
                    <span className="pill outline no-dot">
                      {t("vehicleInfoElectric")}
                    </span>
                  ) : null}
                  {job.redPlates ? (
                    <span className="pill outline no-dot">
                      {t("vehicleInfoRedPlates")}
                      {job.redPlateNumber ? (
                        <span className="mono" style={{ marginLeft: 6 }}>
                          {job.redPlateNumber}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          {/* Contacts */}
          <section className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">03</span>
                {t("contacts")}
              </h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              {[
                [t("pickup"), job.contactPickup || { name: "", phone: "" }],
                [t("delivery"), job.contactDelivery || { name: "", phone: "" }],
              ].map(([k, c]) => (
                <div
                  key={k}
                  style={{
                    padding: 16,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-2)",
                  }}
                >
                  <div className="label">{k}</div>
                  <div style={{ fontWeight: 600, marginTop: 6 }}>
                    {c.name || "—"}
                  </div>
                  <a
                    href={"tel:" + (c.phone || "").replace(/\s/g, "")}
                    className="mono"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 13,
                      marginTop: 4,
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                      color: "var(--text)",
                    }}
                  >
                    <Ic.Phone /> {c.phone || "—"}
                  </a>
                  {c.secondPhone ? (
                    <div
                      className="mono"
                      style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}
                    >
                      {t("phone")} 2: {c.secondPhone}
                    </div>
                  ) : null}
                  {c.email ? (
                    <div
                      style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}
                    >
                      {t("email")}: {c.email}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* PDF */}
          <section className="card" style={{ padding: 22 }}>
            <div
              className="sec-head"
              style={{ justifyContent: "space-between" }}
            >
              <h3>
                <span className="num">04</span>
                {t("transportOrderPdf")}
              </h3>
              <span className="label">
                {job.status === "draft"
                  ? t("notGenerated")
                  : `v${job.pdfVersion || 1} · ${t("demoFile")}`}
              </span>
            </div>
            {job.status === "draft" ? (
              <div
                className="dash-area"
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  padding: 30,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: 0.06,
                }}
              >
                {t("adminPdfDraftPlaceholder")}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 14,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)",
                  marginTop: 14,
                }}
              >
                <Ic.Pdf />
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 13 }}>
                    transport-order-{job.id}.pdf
                  </div>
                  <div className="label" style={{ marginTop: 2 }}>
                    {t("adminPdfIssued", { at: job.createdAt })}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn xs"
                  onClick={() => {
                    const r = AuthStore.getTransportOrderPreview(job.id);
                    if (r.ok && r.preview?.blobUrl)
                      window.open(r.preview.blobUrl, "_blank", "noopener");
                  }}
                >
                  <Ic.Eye /> {t("view")}
                </button>
                <button
                  type="button"
                  className="btn xs"
                  onClick={() => AuthStore.downloadPdf(job.id)}
                >
                  <Ic.Down /> {t("download")}
                </button>
                <button
                  type="button"
                  className="btn xs cta"
                  onClick={() => AuthStore.regeneratePdf(job.id)}
                >
                  <Ic.Refresh /> {t("regenerate")}
                </button>
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">05</span> {t("sectionNotes")}
              </h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                marginTop: 14,
              }}
            >
              <div>
                <div className="label">{t("adminInternalNotes")}</div>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                  }}
                >
                  {job.notes || "—"}
                </p>
              </div>
              <div>
                <div className="label">{t("adminDriverVisibleNotes")}</div>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: "var(--muted)",
                  }}
                >
                  {job.notesDriver || "—"}
                </p>
              </div>
            </div>
          </section>

          {financeOn ? (
            <JobFinancePanel
              job={job}
              onEditFinances={onEditFinances}
              onOpenTourBilling={onOpenTourBilling}
            />
          ) : (
            onOpenTourBilling && (
              <section className="card" style={{ padding: 22 }}>
                <div className="sec-head">
                  <h3>
                    <span className="num">06</span>
                    {t("navTourBilling")}
                  </h3>
                </div>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 13,
                    color: "var(--muted)",
                    lineHeight: 1.55,
                  }}
                >
                  {t("tourBillingDesc")}
                </p>
                <button
                  type="button"
                  className="btn primary"
                  style={{ marginTop: 14 }}
                  onClick={onOpenTourBilling}
                >
                  {t("adminOpenTourBillingBtn")}
                </button>
              </section>
            )
          )}
          <SpecialCaseResolutionPanel job={job} showToast={showToast} />
        </div>

        <aside style={{ position: "sticky", top: 0 }} className="stack-18">
          <div className="card" style={{ padding: 18 }}>
            <div className="label">{t("adminAssignedDriver")}</div>
            <div
              style={{
                marginTop: 10,
                padding: 10,
                background: "var(--paper-3)",
                borderRadius: "var(--r-2)",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                color: job.driver ? "var(--text)" : "var(--muted)",
              }}
            >
              {job.driver || t("adminDriverNone")}
              {job.driverId ? (
                <div
                  className="label"
                  style={{ marginTop: 4, fontSize: 10.5 }}
                >
                  {job.driverId}
                </div>
              ) : null}
            </div>
            {job.status === "draft" && onRequestAssign ? (
              <button
                type="button"
                className="btn primary block"
                style={{ marginTop: 12 }}
                onClick={onRequestAssign}
              >
                {t("adminAssignDriver")}
              </button>
            ) : null}
            {["assigned", "accepted", "special_case"].includes(job.status) &&
            onRequestReassign ? (
              <button
                type="button"
                className="btn block"
                style={{ marginTop: 12 }}
                onClick={onRequestReassign}
              >
                {t("adminReassignDriver")}
              </button>
            ) : null}
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div className="label">{t("adminMetadata")}</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div>
                <div className="label" style={{ fontSize: 9.5 }}>
                  {t("adminLabelCreated")}
                </div>
                <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>
                  {job.createdAt} · A. Bauer
                </div>
              </div>
              <div>
                <div className="label" style={{ fontSize: 9.5 }}>
                  {t("adminLabelLastUpdated")}
                </div>
                <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>
                  {job.createdAt} · A. Bauer
                </div>
              </div>
              <div>
                <div className="label" style={{ fontSize: 9.5 }}>
                  {t("adminLabelSource")}
                </div>
                <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>
                  {t("adminSourceManualForm")}
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div className="label">{t("adminStatusHistory")}</div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {(job.history || [])
                .slice()
                .reverse()
                .map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 12.5,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          i === 0 ? "var(--primary)" : "var(--line-2)",
                      }}
                    ></span>
                    <span style={{ fontWeight: 600 }}>
                      {AuthStore.statusLabel(h.st)}
                    </span>
                    <span
                      className="mono"
                      style={{ color: "var(--muted)", fontSize: 11.5 }}
                    >
                      · {h.at} · {h.by}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

const AdminDetailFooter = ({
  job,
  onPublish,
  onRequestAssign,
  onRequestReassign,
  onEdit,
  onCancel,
  onRevertToDraft,
  onDeleteDraft,
}) => {
  const { t } = useI18n();
  return (
    <>
      <span className="label">
        {job.status === "published"
          ? t("adminRevertToDraftSub")
          : t("adminActionsStatus", {
              status: AuthStore.statusLabel(job.status),
            })}
      </span>
      <div
        style={{
          display: "inline-flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {job.status === "draft" && (
          <button type="button" className="btn" onClick={onEdit}>
            {t("adminEditDraft")}
          </button>
        )}
        {job.status === "draft" && (
          <>
            <button type="button" className="btn" onClick={onRequestAssign}>
              {t("adminAssignDriver")}
            </button>
            <button type="button" className="btn primary" onClick={onPublish}>
              {t("adminPublishToMarketplace")}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                void window
                  .requestAdminConfirm(t("adminDeleteDraftConfirm"), {
                    destructive: true,
                  })
                  .then((ok) => {
                    if (ok) onDeleteDraft();
                  });
              }}
            >
              {t("adminDeleteDraft")}
            </button>
          </>
        )}
        {job.status === "published" && (
          <button type="button" className="btn" onClick={onRevertToDraft}>
            {t("adminRevertToDraft")}
          </button>
        )}
        {["assigned", "accepted", "special_case"].includes(job.status) &&
          onRequestReassign && (
            <button type="button" className="btn" onClick={onRequestReassign}>
              {t("adminReassignDriver")}
            </button>
          )}
        {(job.status === "accepted" ||
          job.status === "assigned" ||
          job.status === "special_case") && (
          <button
            type="button"
            className="btn danger"
            onClick={() => setCancelOpen(true)}
          >
            {t("adminCancelJob")}
          </button>
        )}
      </div>
    </>
  );
};

// =========================================================================
// ADMIN — NEUER AUFTRAG
// =========================================================================
const EMPTY_NEW_ORDER_FORM = {
  customerId: "",
  customer: "",
  startCompany: "",
  startStreet: "",
  startHouseNo: "",
  startPlz: "",
  startCity: "",
  startCountry: "DE",
  endCompany: "",
  endStreet: "",
  endHouseNo: "",
  endPlz: "",
  endCity: "",
  endCountry: "DE",
  distance: "",
  pickupDate: "",
  pickupFrom: "",
  pickupTo: "",
  pickupFlex: false,
  deliveryDate: "",
  deliveryFrom: "",
  deliveryTo: "",
  deliveryFlex: false,
  vehicleType: "",
  brand: "",
  model: "",
  plate: "",
  vin: "",
  cName1: "",
  cPhone1: "",
  cName2: "",
  cPhone2: "",
  pickupAlternateContact: "",
  pickupSecondPhone: "",
  pickupEmail: "",
  pickupContactNotes: "",
  deliveryAlternateContact: "",
  deliverySecondPhone: "",
  deliveryEmail: "",
  deliveryContactNotes: "",
  showPickupExtraContact: false,
  showDeliveryExtraContact: false,
  updatePickupMaster: false,
  updateDeliveryMaster: false,
  driverOffer: "",
  notes: "",
  notesDriver: "",
  axle: "Eigenachse",
  registrationStatus: "",
  electricVehicle: false,
  redPlates: false,
  redPlateNumber: "",
  pickupLocationId: "",
  deliveryLocationId: "",
  savePickupToMaster: false,
  saveDeliveryToMaster: false,
};

const displayAxleAdmin = (value, t) =>
  ({
    "driven on own wheels": t("ownAxle"),
    "third-party axle": t("thirdPartyAxle"),
    Eigenachse: t("ownAxle"),
    Fremdachse: t("thirdPartyAxle"),
    "Own axle": t("ownAxle"),
    "Third-party axle": t("thirdPartyAxle"),
  })[value] || value;

const NewOrder = ({ onCancel, onFormChange, editJobId }) => {
  const store = useAuthStore();
  const { t } = useI18n();
  const editingJob = editJobId ? store.getJob(editJobId) : null;

  const buildFormState = () => {
    if (editJobId) {
      const j = store.getJob(editJobId);
      if (j?.status === "draft") {
        const mapped = store.jobToDraftForm(j);
        if (mapped) return { ...EMPTY_NEW_ORDER_FORM, ...mapped };
      }
    }
    return { ...EMPTY_NEW_ORDER_FORM };
  };

  const vehicleTypes = [
    { value: "SUV", label: t("newOrderVtSuv") },
    { value: "PKW", label: t("newOrderVtPkw") },
    { value: "Transporter", label: t("newOrderVtTransporter") },
    { value: "LKW < 3,5t", label: t("lightTruck") },
    { value: "Oldtimer", label: t("newOrderVtClassic") },
  ];
  const axles = [
    { value: "Eigenachse", label: t("ownAxle") },
    { value: "Fremdachse", label: t("thirdPartyAxle") },
  ];
  const [form, setForm] = useStateA(buildFormState);
  const [activeSec, setActiveSec] = useStateA("01");
  const [adminAttachFiles, setAdminAttachFiles] = useStateA([]);
  const [scheduleOverrideNote, setScheduleOverrideNote] = useStateA("");
  const [distanceEstimateNote, setDistanceEstimateNote] = useStateA("");
  const adminDocFileRef = useRefA(null);

  useEffectA(() => {
    setForm(buildFormState());
    setActiveSec("01");
    setAdminAttachFiles([]);
    setScheduleOverrideNote("");
    setDistanceEstimateNote("");
  }, [editJobId]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const runDistanceEstimate = () => {
    const r = store.estimateDistanceFromForm(form);
    if (!r.ok) {
      setDistanceEstimateNote(t("newOrderDistanceEstimateMissingPlz"));
      return;
    }
    const sourceLabel =
      r.source === "table"
        ? t("newOrderDistanceSourceTable")
        : t("newOrderDistanceSourceHeuristic");
    set("distance", String(r.km));
    setDistanceEstimateNote(
      t("newOrderDistanceEstimateApplied", { km: r.km, source: sourceLabel }),
    );
  };
  const applyMasterAddress = (side, addrId) => {
    if (!addrId) {
      if (side === "pickup") {
        setForm((f) => ({ ...f, pickupLocationId: "" }));
      } else {
        setForm((f) => ({ ...f, deliveryLocationId: "" }));
      }
      return;
    }
    const a = store.getAddress(addrId);
    if (!a) return;
    const line1 = [a.street, a.houseNumber].filter(Boolean).join(" ");
    if (side === "pickup") {
      setForm((f) => ({
        ...f,
        pickupLocationId: a.id,
        startCompany: a.label || "",
        startStreet: a.street || "",
        startHouseNo: a.houseNumber || "",
        startPlz: a.postalCode || "",
        startCity: a.city || "",
        startCountry: a.country || "DE",
        cName1: a.contactPerson || "",
        cPhone1: a.phone || "",
        pickupSecondPhone: a.secondPhone || "",
        pickupEmail: a.email || "",
        pickupContactNotes: a.notes || "",
        savePickupToMaster: false,
        updatePickupMaster: false,
      }));
    } else {
      setForm((f) => ({
        ...f,
        deliveryLocationId: a.id,
        endCompany: a.label || "",
        endStreet: a.street || "",
        endHouseNo: a.houseNumber || "",
        endPlz: a.postalCode || "",
        endCity: a.city || "",
        endCountry: a.country || "DE",
        cName2: a.contactPerson || "",
        cPhone2: a.phone || "",
        deliverySecondPhone: a.secondPhone || "",
        deliveryEmail: a.email || "",
        deliveryContactNotes: a.notes || "",
        saveDeliveryToMaster: false,
        updateDeliveryMaster: false,
      }));
    }
  };
  const customers = store.getCustomers({ activeOnly: true });
  const masterAddresses = store.getAddresses({ activeOnly: true });
  const onCustomerSelect = (customerId) => {
    if (!customerId) {
      setForm((f) => ({
        ...f,
        customerId: "",
        customer: "",
      }));
      return;
    }
    const customer = customers.find((x) => x.id === customerId);
    if (customer) {
      setForm((f) => ({
        ...f,
        customerId: customer.id,
        customer: customer.name,
      }));
    }
  };

  const required = [
    "customer",
    "startCity",
    "startPlz",
    "startStreet",
    "endCity",
    "endPlz",
    "endStreet",
    "pickupDate",
    "deliveryDate",
    "vehicleType",
    // Registered (or unspecified) vehicles need the regular plate; a
    // deregistered vehicle has none (§16 FZV transfer runs use a red plate)
    ...(form.registrationStatus === "deregistered" ? [] : ["plate"]),
    ...(form.redPlates ? ["redPlateNumber"] : []),
    "driverOffer",
  ];
  const scheduleDateWarning =
    form.pickupDate &&
    form.deliveryDate &&
    AuthStore.compareDottedDates(form.pickupDate, form.deliveryDate) > 0;
  const pickupTimeWarning =
    form.pickupFrom &&
    form.pickupTo &&
    AuthStore.compareTimeStrings(form.pickupFrom, form.pickupTo) > 0;
  const deliveryTimeWarning =
    form.deliveryFrom &&
    form.deliveryTo &&
    AuthStore.compareTimeStrings(form.deliveryFrom, form.deliveryTo) > 0;
  const vinShortNotice =
    form.vin && String(form.vin).trim().length > 0 && String(form.vin).length < 17;
  const blurDate = (key) => (e) => {
    const next = AuthStore.formatDateInput(e.target.value);
    if (next !== form[key]) set(key, next);
  };
  const blurTime = (key) => (e) => {
    const next = AuthStore.formatTimeInput(e.target.value);
    if (next !== form[key]) set(key, next);
  };
  const filled = required.filter(
    (k) => form[k] && String(form[k]).trim(),
  ).length;
  const total = required.length;
  const sameDayWindowBlocked = pickupTimeWarning || deliveryTimeWarning;
  const valid = filled === total && !sameDayWindowBlocked;
  const wasCommitted =
    editingJob && AuthStore.jobWasEverCommitted(editingJob);
  const existingAdminDocs = editJobId
    ? store
        .getTourDocumentsForJob(editJobId)
        .filter(
          (d) => d.source === "admin_off_channel" || d.source === "admin",
        )
    : [];

  const appendAdminFiles = (fileList) => {
    if (!fileList?.length) return;
    const next = [];
    for (const file of fileList) {
      if (!AuthStore.isAllowedTourDocumentFile(file)) continue;
      next.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        fileName: file.name,
        documentType: "other_proof",
      });
    }
    if (next.length) setAdminAttachFiles((prev) => [...prev, ...next]);
  };

  useEffectA(() => {
    if (typeof onFormChange === "function")
      onFormChange({ ...form, adminAttachFiles, scheduleOverrideNote }, valid);
  }, [form, valid, adminAttachFiles, scheduleOverrideNote]);

  const sections = [
    ["01", t("newOrderSecCustomer")],
    ["02", t("newOrderSecRoute")],
    ["03", t("newOrderSecSchedule")],
    ["04", t("newOrderSecVehicle")],
    ["05", t("newOrderSecDriverOffer")],
    ["06", t("newOrderSecNotes")],
    ["07", t("newOrderSecDocuments")],
  ];

  return (
    <>
      <div className="pane-toolbar" style={{ marginBottom: 24 }}>
        <p className="pane-lead" style={{ marginBottom: 0 }}>
          {t("newOrderSubtitle")}
        </p>
        <div
          className="card"
          style={{ padding: "10px 16px", textAlign: "right" }}
        >
          <div className="label">{t("tourNo")}</div>
          <div
            className="mono"
            style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}
          >
            {editingJob?.tour || "—"}
          </div>
        </div>
      </div>

      <div className="grid-form-layout">
        {/* TOC */}
        <aside>
          <div className="label" style={{ marginBottom: 12 }}>
            {t("newOrderFormSections")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sections.map(([n, l]) => (
              <a
                key={n}
                className={"nav-item " + (activeSec === n ? "on" : "")}
                onClick={() => {
                  setActiveSec(n);
                  document
                    .getElementById("sec-" + n)
                    ?.scrollIntoView({ block: "start", behavior: "instant" });
                }}
                style={{ padding: "7px 12px", fontSize: 13 }}
              >
                <span>
                  <span
                    className="mono"
                    style={{ fontSize: 11, marginRight: 8, opacity: 0.6 }}
                  >
                    {n}
                  </span>{" "}
                  {l}
                </span>
              </a>
            ))}
          </div>
        </aside>

        {/* Form */}
        <div className="stack-18">
          <section id="sec-01" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">01</span> {t("newOrderSecCustomerTitle")}
              </h3>
              <span className="label">{t("newOrderCustomerMasterLabel")}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label" htmlFor="new-order-customer">
                {t("newOrderSelectCustomer")}
              </label>
              <select
                id="new-order-customer"
                className="input"
                value={form.customerId || ""}
                onChange={(e) => onCustomerSelect(e.target.value)}
              >
                <option value="">{t("newOrderCustomerPlaceholder")}</option>
                {customers.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                    {op.type ? ` · ${op.type}` : ""}
                  </option>
                ))}
              </select>
              <p
                className="label"
                style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.45 }}
              >
                {t("newOrderCustomerSelectHint")}
              </p>
            </div>
            {!form.customer && (
              <div
                className="dash-area"
                style={{
                  marginTop: 14,
                  padding: 14,
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  textTransform: "none",
                  letterSpacing: 0,
                  color: "var(--muted)",
                }}
              >
                <strong style={{ color: "var(--text)" }}>
                  ⓘ {t("newOrderNoCustomerTitle")}
                </strong>{" "}
                {t("newOrderNoCustomerHint")}
              </div>
            )}
          </section>

          <section id="sec-02" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">02</span> {t("newOrderSecRoute")}
              </h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <NewOrderAddressFields
                side="pickup"
                title={t("pickup")}
                form={form}
                setForm={setForm}
                masterAddresses={masterAddresses}
                onMasterSelect={(id) => applyMasterAddress("pickup", id)}
              />
              <NewOrderAddressFields
                side="delivery"
                title={t("delivery")}
                form={form}
                setForm={setForm}
                masterAddresses={masterAddresses}
                onMasterSelect={(id) => applyMasterAddress("delivery", id)}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label" htmlFor="new-order-distance-km">
                {t("newOrderDistanceKm")}
              </label>
              <p className="req-panel-desc" style={{ marginTop: 6 }}>
                {t("newOrderDistanceManualHint")}
              </p>
              <div
                className="req-panel-actions"
                style={{ marginTop: 10, alignItems: "flex-end" }}
              >
                <input
                  id="new-order-distance-km"
                  className="input mono"
                  style={{ maxWidth: 140 }}
                  placeholder="0"
                  value={form.distance}
                  onChange={(e) => {
                    set("distance", e.target.value);
                    setDistanceEstimateNote("");
                  }}
                />
                <button
                  type="button"
                  className="btn primary touch-target"
                  disabled={!form.startPlz?.trim() || !form.endPlz?.trim()}
                  onClick={runDistanceEstimate}
                >
                  {t("newOrderEstimateDistance")}
                </button>
              </div>
              {distanceEstimateNote ? (
                <div
                  className="inline-alert inline-alert-info"
                  role="status"
                  style={{ marginTop: 10 }}
                >
                  {distanceEstimateNote}
                </div>
              ) : null}
            </div>
          </section>

          <section id="sec-03" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">03</span> {t("newOrderSecScheduleTitle")}
              </h3>
            </div>
            <p
              className="label"
              style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.5 }}
            >
              {t("newOrderScheduleHint")}
            </p>
            {scheduleDateWarning ? (
              <div
                className="dash-area"
                style={{
                  marginTop: 12,
                  padding: 12,
                  fontSize: 12.5,
                  color: "var(--st-warn)",
                  borderLeft: "3px solid var(--st-warn)",
                }}
              >
                {t("newOrderScheduleDateWarning")}
              </div>
            ) : null}
            {pickupTimeWarning ? (
              <div
                className="dash-area"
                style={{
                  marginTop: 10,
                  padding: 12,
                  fontSize: 12.5,
                  color: "var(--st-err, #dc2626)",
                  borderLeft: "3px solid var(--st-err, #dc2626)",
                }}
                role="alert"
              >
                {t("adminScheduleSameDayWindowError")} ({t("newOrderPickupSchedule")})
              </div>
            ) : null}
            {deliveryTimeWarning ? (
              <div
                className="dash-area"
                style={{
                  marginTop: 10,
                  padding: 12,
                  fontSize: 12.5,
                  color: "var(--st-err, #dc2626)",
                  borderLeft: "3px solid var(--st-err, #dc2626)",
                }}
                role="alert"
              >
                {t("adminScheduleSameDayWindowError")} ({t("newOrderDeliverySchedule")})
              </div>
            ) : null}
            <div style={{ marginTop: 16 }}>
              <div className="label" style={{ marginBottom: 10 }}>
                {t("newOrderPickupSchedule")}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: 14,
                  alignItems: "end",
                }}
              >
                <div>
                  <label className="field-label">{t("newOrderPickupDate")} *</label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderDatePh")}
                    value={form.pickupDate}
                    onChange={(e) => set("pickupDate", e.target.value)}
                    onBlur={blurDate("pickupDate")}
                  />
                </div>
                <div>
                  <label className="field-label">{t("newOrderWindowFrom")}</label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderTimePh")}
                    value={form.pickupFrom}
                    onChange={(e) => set("pickupFrom", e.target.value)}
                    onBlur={blurTime("pickupFrom")}
                  />
                </div>
                <div>
                  <label className="field-label">{t("newOrderWindowTo")}</label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderTimePh")}
                    value={form.pickupTo}
                    onChange={(e) => set("pickupTo", e.target.value)}
                    onBlur={blurTime("pickupTo")}
                  />
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    paddingBottom: 10,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!form.pickupFlex}
                    onChange={(e) => set("pickupFlex", e.target.checked)}
                  />
                  {t("flexible")}
                </label>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div className="label" style={{ marginBottom: 10 }}>
                {t("newOrderDeliverySchedule")}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: 14,
                  alignItems: "end",
                }}
              >
                <div>
                  <label className="field-label">{t("newOrderDeliveryDate")} *</label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderDatePh")}
                    value={form.deliveryDate}
                    onChange={(e) => set("deliveryDate", e.target.value)}
                    onBlur={blurDate("deliveryDate")}
                  />
                </div>
                <div>
                  <label className="field-label">{t("newOrderWindowFrom")}</label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderTimePh")}
                    value={form.deliveryFrom}
                    onChange={(e) => set("deliveryFrom", e.target.value)}
                    onBlur={blurTime("deliveryFrom")}
                  />
                </div>
                <div>
                  <label className="field-label">{t("newOrderWindowTo")}</label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderTimePh")}
                    value={form.deliveryTo}
                    onChange={(e) => set("deliveryTo", e.target.value)}
                    onBlur={blurTime("deliveryTo")}
                  />
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    paddingBottom: 10,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!form.deliveryFlex}
                    onChange={(e) => set("deliveryFlex", e.target.checked)}
                  />
                  {t("flexible")}
                </label>
              </div>
            </div>
            {wasCommitted ? (
              <div style={{ marginTop: 18 }}>
                <label className="field-label">
                  {t("adminScheduleOverrideLabel")}
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={scheduleOverrideNote}
                  onChange={(e) => setScheduleOverrideNote(e.target.value)}
                  placeholder={t("adminScheduleOverridePh")}
                  style={{ marginTop: 6, resize: "vertical" }}
                />
                <p
                  className="label"
                  style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45 }}
                >
                  {t("adminScheduleOverrideHint")}
                </p>
              </div>
            ) : null}
          </section>

          <section id="sec-04" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">04</span> {t("newOrderSecVehicle")}
              </h3>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">{t("vehicleType")} *</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {vehicleTypes.map((vt) => (
                  <span
                    key={vt.value}
                    className={
                      "chip " + (form.vehicleType === vt.value ? "on" : "")
                    }
                    onClick={() => set("vehicleType", vt.value)}
                  >
                    {vt.label}
                  </span>
                ))}
              </div>
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
                <label className="field-label">{t("newOrderBrand")}</label>
                <input
                  className="input"
                  list="new-order-brand-suggestions"
                  placeholder={t("newOrderBrandPh")}
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
                <datalist id="new-order-brand-suggestions">
                  {(AuthStore.MANUFACTURER_SUGGESTIONS || []).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="field-label">{t("newOrderModel")}</label>
                <input
                  className="input"
                  placeholder={t("newOrderModelPh")}
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                />
              </div>
              {form.registrationStatus === "deregistered" ? (
                <div>
                  <label className="field-label">{t("plate")}</label>
                  <p
                    className="label"
                    style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.5 }}
                  >
                    {t("newOrderPlateHiddenDeregistered")}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="field-label">{t("plate")} *</label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderPlatePh")}
                    value={form.plate}
                    onChange={(e) => set("plate", e.target.value)}
                    onBlur={(e) => set("plate", AuthStore.normalizePlate(e.target.value))}
                  />
                </div>
              )}
              <div>
                <label className="field-label">
                  {t("vin")} ({t("newOrderVinLen")})
                </label>
                <input
                  className="input mono"
                  placeholder={t("newOrderVinLen")}
                  value={form.vin}
                  onChange={(e) =>
                    set("vin", AuthStore.normalizeVin(e.target.value))
                  }
                />
                {vinShortNotice ? (
                  <p
                    className="label"
                    style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45 }}
                  >
                    {t("newOrderVinShortNotice")}
                  </p>
                ) : null}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">{t("axle")}</label>
              <div
                className="seg"
                style={{ display: "inline-grid", gridAutoFlow: "column" }}
              >
                {axles.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    className={form.axle === a.value ? "on" : ""}
                    onClick={() => set("axle", a.value)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Important vehicle info — optional announcement metadata
                (Design Direction Board §5; prd.json vehicle_important_info_v1) */}
            <div style={{ marginTop: 14 }}>
              <label className="field-label">{t("vehicleInfoLabel")}</label>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {/* Registration is one exclusive choice. Red plates legally
                    require a deregistered vehicle (§16 FZV), so "Red plates"
                    lives inside the segment instead of being a combinable
                    chip — selecting it stores deregistered + redPlates. */}
                <div
                  className="seg"
                  style={{ display: "inline-grid", gridAutoFlow: "column" }}
                >
                  {[
                    ["", t("newOrderRegistrationNone")],
                    ["registered", t("vehicleInfoRegistered")],
                    ["deregistered", t("vehicleInfoDeregistered")],
                    ["red_plates", t("vehicleInfoRedPlates")],
                  ].map(([val, label]) => (
                    <button
                      key={val || "none"}
                      type="button"
                      className={
                        (form.redPlates
                          ? "red_plates"
                          : form.registrationStatus || "") === val
                          ? "on"
                          : ""
                      }
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          registrationStatus:
                            val === "red_plates" ? "deregistered" : val,
                          redPlates: val === "red_plates",
                          redPlateNumber:
                            val === "red_plates" ? f.redPlateNumber : "",
                        }))
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span
                  className={"chip " + (form.electricVehicle ? "on" : "")}
                  onClick={() => set("electricVehicle", !form.electricVehicle)}
                >
                  {t("vehicleInfoElectric")}
                </span>
              </div>
              {form.redPlates ? (
                <div style={{ marginTop: 12, maxWidth: 260 }}>
                  <label className="field-label">
                    {t("redPlateNumber")} *
                  </label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderRedPlatePh")}
                    value={form.redPlateNumber}
                    onChange={(e) => set("redPlateNumber", e.target.value)}
                  />
                  <p
                    className="label"
                    style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45 }}
                  >
                    {t("newOrderRedPlateHint")}
                  </p>
                </div>
              ) : null}
              <p
                className="label"
                style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45 }}
              >
                {t("newOrderVehicleInfoHint")}
              </p>
            </div>
          </section>

          <section id="sec-05" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">05</span> {t("newOrderSecDriverOffer")}
              </h3>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">{t("newOrderDriverOfferEur")}</label>
              <input
                className="input mono"
                style={{ maxWidth: 200, fontSize: 18, fontWeight: 600 }}
                placeholder={t("newOrderDriverOfferPh")}
                value={form.driverOffer}
                onChange={(e) => set("driverOffer", e.target.value)}
              />
            </div>
          </section>

          <section id="sec-06" className="card" style={{ padding: 22 }}>
            <div
              className="sec-head"
              style={{ justifyContent: "space-between" }}
            >
              <h3>
                <span className="num">06</span> {t("newOrderSecNotes")}
              </h3>
              <button
                type="button"
                className="btn ghost xs"
                onClick={() => set("notes", t("newOrderStandardNotesText"))}
              >
                {t("newOrderStandardWording")}
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">{t("newOrderNotesFree")}</label>
              <textarea
                className="input"
                placeholder={t("newOrderNotesDriverPh")}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </section>

          <section id="sec-07" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">07</span> {t("newOrderSecDocumentsTitle")}
              </h3>
              <Pill status="published" className="no-dot">
                {t("tourDocUploadAvailable")}
              </Pill>
            </div>
            <p className="req-panel-desc" style={{ marginTop: 10 }}>
              {t("newOrderAdminDocsHint")}
            </p>
            {existingAdminDocs.length ? (
              <>
                <div className="label" style={{ marginTop: 14, marginBottom: 8 }}>
                  {t("newOrderAdminDocsExisting")}
                </div>
                <ul className="doc-card-list">
                  {existingAdminDocs.map((doc) => (
                    <li key={doc.id} className="doc-card">
                      <div className="doc-card-head">
                        <span className="mono" style={{ wordBreak: "break-all" }}>
                          {doc.fileName}
                        </span>
                      </div>
                      <div className="doc-card-meta">
                        {displayTourDocType(doc.documentType, t)}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="req-panel-actions" style={{ marginTop: 14 }}>
              <input
                ref={adminDocFileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  appendAdminFiles(Array.from(e.target.files || []));
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="btn primary touch-target"
                onClick={() => adminDocFileRef.current?.click()}
              >
                <Ic.Plus /> {t("newOrderAdminDocsAdd")}
              </button>
            </div>
            {adminAttachFiles.length ? (
              <ul className="doc-card-list">
                {adminAttachFiles.map((item) => (
                  <li key={item.id} className="doc-card">
                    <div className="doc-card-head">
                      <span className="mono" style={{ wordBreak: "break-all" }}>
                        {item.fileName}
                      </span>
                    </div>
                    <div className="doc-card-meta">
                      {displayTourDocType(item.documentType, t)}
                    </div>
                    <div className="doc-card-actions">
                      <button
                        type="button"
                        className="btn ghost xs touch-target"
                        onClick={() =>
                          setAdminAttachFiles((prev) =>
                            prev.filter((x) => x.id !== item.id),
                          )
                        }
                      >
                        {t("reportProblemEvidenceRemove")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p className="empty-state-title">{t("newOrderAdminDocsEmpty")}</p>
              </div>
            )}
          </section>
        </div>

        {/* Live preview */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div className="label">{t("newOrderLiveSummary")}</div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
              {t("newOrderPreviewTitle")}
            </div>
            <div
              style={{
                padding: 14,
                border: "1px dashed var(--line-2)",
                borderRadius: "var(--r-2)",
                background: "var(--paper-2)",
              }}
            >
              <div className="label">
                {t("newOrderTourLabel", { tour: editingJob?.tour || "—" })}
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    {t("adminColCustomer")}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      marginTop: 2,
                      color: form.customer ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {form.customer || t("newOrderCustomerPending")}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    {t("route")}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 13,
                      marginTop: 2,
                      color: form.startPlz ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {form.startPlz || t("newOrderPlzPh")} →{" "}
                    {form.endPlz || t("newOrderPlzPh")}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    {t("newOrderSecSchedule")}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      marginTop: 2,
                      color:
                        form.pickupDate || form.deliveryDate
                          ? "var(--text)"
                          : "var(--muted)",
                      lineHeight: 1.45,
                    }}
                  >
                    {form.pickupDate
                      ? `${t("pickup")}: ${form.pickupDate}${form.pickupFrom ? ` ${form.pickupFrom}–${form.pickupTo || ""}` : ""}`
                      : "—"}
                    <br />
                    {form.deliveryDate
                      ? `${t("delivery")}: ${form.deliveryDate}${form.deliveryFrom ? ` ${form.deliveryFrom}–${form.deliveryTo || ""}` : ""}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    {t("newOrderSecDriverOffer")}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}
                  >
                    € {form.driverOffer || t("newOrderDriverOfferZero")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="label">{t("newOrderValidation")}</div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {t("newOrderRequiredOpen", { count: total - filled })}
              </div>
              <div className="bar" style={{ marginTop: 10 }}>
                <span style={{ width: (filled / total) * 100 + "%" }}></span>
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginTop: 8,
                  letterSpacing: 0.04,
                }}
              >
                {t("newOrderProgressComplete", { filled, total })}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

const NewOrderFooter = ({
  form,
  onCancel,
  onSaveDraft,
  onPublish,
  onAssign,
  valid,
}) => {
  const { t } = useI18n();
  return (
    <>
      <span className="label">{t("newOrderFooterHint")}</span>
      <div style={{ display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={onCancel}>
          {t("newOrderCancel")}
        </button>
        <button type="button" className="btn" onClick={onSaveDraft}>
          {t("newOrderSaveDraft")}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!valid}
          onClick={onAssign}
        >
          {t("adminAssignDriver")}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!valid}
          onClick={onPublish}
        >
          {t("adminPublishToMarketplace")}
        </button>
      </div>
    </>
  );
};

// =========================================================================
// PLACEHOLDERS for unused nav items
// =========================================================================
const Stub = ({ title, desc }) => {
  const { t } = useI18n();
  return (
    <div style={{ maxWidth: 680 }}>
      <p className="pane-lead">{desc}</p>
      <div
        className="dash-area"
        style={{ padding: 50, textAlign: "center" }}
        aria-label={title}
      >
        {t("adminStubBody")}
      </div>
    </div>
  );
};

const emptyDriverEditForm = () => ({
  name: "",
  company: "",
  driverCode: "",
  address: "",
  email: "",
  phone: "",
  notes: "",
  probationJobLimit: "3",
});

const emptyAdminEditForm = () => ({
  name: "",
  email: "",
});

const userInputErrStyle = { borderColor: "#dc2626" };

const UserFormError = ({ message }) =>
  message ? (
    <div
      className="label"
      role="alert"
      style={{ color: "#dc2626", fontSize: 11.5, marginTop: 4 }}
    >
      {message}
    </div>
  ) : null;

const validateDriverFormLocal = (form, t, opts = {}) => {
  const errors = {};
  if (!String(form.name || "").trim())
    errors.name = t("adminUsersErrNameRequired");
  if (!String(form.company || "").trim())
    errors.company = t("adminUsersErrCompanyRequired");
  if (!opts.isNew && !String(form.driverCode || "").trim())
    errors.driverCode = t("adminUsersErrDriverCodeRequired");
  if (!String(form.email || "").trim())
    errors.email = t("adminUsersErrEmailRequired");
  else if (!AuthStore.isValidEmail(form.email))
    errors.email = t("adminUsersErrEmailInvalid");
  const limitRaw = String(form.probationJobLimit ?? "").trim();
  if (limitRaw) {
    const n = parseInt(limitRaw, 10);
    if (!Number.isFinite(n) || n < 1 || n > 99)
      errors.probationJobLimit = t("adminUsersErrProbationLimit");
  }
  return errors;
};

const validateAdminFormLocal = (form, t) => {
  const errors = {};
  if (!String(form.name || "").trim())
    errors.name = t("adminUsersErrNameRequired");
  if (!String(form.email || "").trim())
    errors.email = t("adminUsersErrEmailRequired");
  else if (!AuthStore.isValidEmail(form.email))
    errors.email = t("adminUsersErrEmailInvalid");
  return errors;
};

const DriverUserFormFields = ({
  form,
  setF,
  errors = {},
  t,
  isNew = false,
  probationSummary = null,
  onReleaseProbation = null,
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    }}
  >
    <div>
      <label className="field-label">{t("adminUsersFieldName")} *</label>
      <input
        className="input"
        style={errors.name ? userInputErrStyle : undefined}
        value={form.name}
        onChange={(e) => setF("name", e.target.value)}
        autoComplete="name"
      />
      <UserFormError message={errors.name} />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldCompany")} *</label>
      <input
        className="input"
        style={errors.company ? userInputErrStyle : undefined}
        value={form.company}
        onChange={(e) => setF("company", e.target.value)}
        autoComplete="organization"
      />
      <UserFormError message={errors.company} />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldDriverCode")}</label>
      <input
        className="input mono"
        style={errors.driverCode ? userInputErrStyle : undefined}
        value={
          isNew
            ? form.driverCode || t("adminUsersFieldDriverCodeAuto")
            : form.driverCode
        }
        readOnly
        disabled
      />
      <UserFormError message={errors.driverCode} />
      <p
        className="label"
        style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.45 }}
      >
        {t("adminUsersFieldDriverCodeHint")}
      </p>
    </div>
    <div style={{ gridColumn: "1 / -1" }}>
      <label className="field-label">{t("adminUsersFieldPhone")}</label>
      <input
        className="input"
        type="tel"
        value={form.phone}
        onChange={(e) => setF("phone", e.target.value)}
        autoComplete="tel"
      />
    </div>
    <div style={{ gridColumn: "1 / -1" }}>
      <label className="field-label">{t("adminUsersFieldEmail")} *</label>
      <input
        className="input"
        type="email"
        style={errors.email ? userInputErrStyle : undefined}
        value={form.email}
        onChange={(e) => setF("email", e.target.value)}
        autoComplete="email"
        placeholder="name@company.example"
      />
      <UserFormError message={errors.email} />
    </div>
    <div style={{ gridColumn: "1 / -1" }}>
      <label className="field-label">{t("adminUsersFieldAddress")}</label>
      <input
        className="input"
        value={form.address}
        onChange={(e) => setF("address", e.target.value)}
        autoComplete="street-address"
      />
    </div>
    <div style={{ gridColumn: "1 / -1" }}>
      <label className="field-label">{t("adminUsersFieldNotes")}</label>
      <textarea
        className="input"
        rows={2}
        value={form.notes}
        onChange={(e) => setF("notes", e.target.value)}
      />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldProbationLimit")}</label>
      <input
        className="input mono"
        type="number"
        min={1}
        max={99}
        value={form.probationJobLimit ?? ""}
        onChange={(e) => setF("probationJobLimit", e.target.value)}
      />
      <UserFormError message={errors.probationJobLimit} />
      <p
        className="label"
        style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.45 }}
      >
        {t("adminUsersFieldProbationLimitHint")}
      </p>
    </div>
    {!isNew && probationSummary ? (
      <div>
        <label className="field-label">{t("adminUsersProbationState")}</label>
        <p className="label" style={{ marginTop: 6, lineHeight: 1.45 }}>
          {probationSummary.onProbation
            ? t("adminUsersProbationOn", {
                performed: probationSummary.performedCount,
                limit: probationSummary.limit,
              })
            : t("adminUsersProbationCleared", {
                clearedAt: probationSummary.clearedAt || "—",
              })}
        </p>
        {probationSummary.onProbation && onReleaseProbation ? (
          <button
            type="button"
            className="btn xs"
            style={{ marginTop: 8 }}
            onClick={onReleaseProbation}
          >
            {t("adminUsersReleaseProbation")}
          </button>
        ) : null}
      </div>
    ) : null}
  </div>
);

const AdminUserFormFields = ({ form, setF, errors = {}, t }) => (
  <div style={{ display: "grid", gap: 12 }}>
    <div>
      <label className="field-label">{t("adminUsersFieldName")} *</label>
      <input
        className="input"
        style={errors.name ? userInputErrStyle : undefined}
        value={form.name}
        onChange={(e) => setF("name", e.target.value)}
        autoComplete="name"
      />
      <UserFormError message={errors.name} />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldEmail")} *</label>
      <input
        className="input"
        type="email"
        style={errors.email ? userInputErrStyle : undefined}
        value={form.email}
        onChange={(e) => setF("email", e.target.value)}
        autoComplete="email"
        placeholder="name@autheon.example"
      />
      <UserFormError message={errors.email} />
    </div>
  </div>
);

const userSaveErr = (r, kind, t) => {
  if (!r || r.ok) return "";
  const reason = r.reason;
  if (reason === "required")
    return kind === "admin"
      ? t("adminUsersAdminRequiredFields")
      : t("adminUsersRequiredFields");
  if (reason === "email_required") return t("adminUsersErrEmailRequired");
  if (reason === "invalid_email") return t("adminUsersErrEmailInvalid");
  if (reason === "duplicate_email") return t("adminUsersEmailDuplicate");
  if (reason === "duplicate_driver_code") return t("adminUsersErrDriverCodeDuplicate");
  if (reason === "driver_code_required") return t("adminUsersErrDriverCodeRequired");
  if (reason === "driver_code_immutable")
    return t("adminUsersErrDriverCodeImmutable");
  if (reason === "invalid_probation_limit")
    return t("adminUsersErrProbationLimit");
  return t("adminInvoiceErrGeneric");
};

const accessStateLabel = (state, t) => {
  const key = {
    "Invite pending": "adminUsersAccessInvitePending",
    Active: "adminUsersAccessActive",
    "Invite failed": "adminUsersAccessInviteFailed",
    Inactive: "adminUsersAccessInactive",
  }[state];
  return key ? t(key) : state || "—";
};

const AccountAccessDialog = ({ open, data, onClose, onResend, showToast }) => {
  const { t } = useI18n();
  if (!open || !data) return null;

  const handleResend = () => {
    const r = onResend?.();
    if (r?.ok) {
      showToast?.(t("adminUsersInviteResentToast"), data.name);
    } else {
      showToast?.(t("adminUsersSaveFailed"), t("adminInvoiceErrGeneric"));
    }
  };

  const inviteOk = data.access?.inviteEmailSent !== false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 105,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="card elev"
        style={{ maxWidth: 480, width: "100%", padding: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>
          {t("adminUsersAccessDialogTitle")}
        </h2>
        <p style={{ color: "var(--muted)", margin: "0 0 16px", fontSize: 13 }}>
          {t("adminUsersAccessDialogHint")}
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div className="label">{t("adminUsersFieldName")}</div>
            <strong>{data.name}</strong>
          </div>
          <div>
            <div className="label">{t("adminUsersAccessEmailLabel")}</div>
            <span className="mono">{data.email || "—"}</span>
          </div>
          <div>
            <div className="label">{t("adminUsersColAccess")}</div>
            <Pill status={inviteOk ? "accepted" : "cancelled"}>
              {inviteOk
                ? t("adminUsersAccessInviteSent")
                : t("adminUsersAccessInviteFailed")}
            </Pill>
            {data.user?.lastInviteAt ? (
              <div
                className="label"
                style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45 }}
              >
                {t("adminUsersAccessLastInvite", { at: data.user.lastInviteAt })}
              </div>
            ) : null}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              color: "var(--muted)",
              lineHeight: 1.55,
            }}
          >
            {t("adminUsersAccessNoPasswordNote")}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          {onResend ? (
            <button type="button" className="btn" onClick={handleResend}>
              {t("adminUsersResendInvite")}
            </button>
          ) : null}
          <button type="button" className="btn primary" onClick={onClose}>
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
};

const DriversPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [driverModal, setDriverModal] = useStateA(null);
  const [driverForm, setDriverForm] = useStateA(emptyDriverEditForm());
  const [credentials, setCredentials] = useStateA(null);
  const [driverErrors, setDriverErrors] = useStateA({});
  const setDF = (k, v) => {
    setDriverForm((p) => ({ ...p, [k]: v }));
    setDriverErrors((e) => ({ ...e, [k]: undefined }));
  };

  const showAccountAccess = (user, access) => {
    setCredentials({
      name: user.name,
      email: user.email || "",
      access,
      user,
      kind: "driver",
    });
  };

  const openNewDriver = () => {
    setDriverForm(emptyDriverEditForm());
    setDriverErrors({});
    setDriverModal("new");
  };

  const openEditDriver = (d) => {
    setDriverForm({
      name: d.name || "",
      company: d.company || "",
      driverCode: d.driverCode || "",
      address: d.address || "",
      email: d.email || "",
      phone: d.phone || "",
      notes: d.notes || "",
      probationJobLimit:
        d.probationJobLimit != null ? String(d.probationJobLimit) : "3",
    });
    setDriverErrors({});
    setDriverModal(d.id);
  };

  const driverFormValid =
    Object.keys(
      validateDriverFormLocal(driverForm, t, {
        isNew: driverModal === "new",
      }),
    ).length === 0;

  const applyDriverStatus = (driver, status) => {
    const result = store.setDriverStatus(driver.id, status);
    if (!result.ok && result.reason === "active_jobs") {
      showToast?.(
        t("adminUsersToastDriverActiveJobs", { count: result.count }),
        driver.name,
      );
      return;
    }
    if (!result.ok) return;
    showToast?.(t("adminUsersToastDriverChanged"), driver.name);
  };

  const saveDriver = () => {
    const localErrors = validateDriverFormLocal(driverForm, t, {
      isNew: driverModal === "new",
    });
    if (Object.keys(localErrors).length) {
      setDriverErrors(localErrors);
      return;
    }
    const payload = { ...driverForm };
    if (driverModal === "new") delete payload.driverCode;
    const r =
      driverModal === "new"
        ? store.addDriver(payload)
        : store.updateDriver(driverModal, payload);
    if (!r.ok) {
      showToast?.(t("adminUsersSaveFailed"), userSaveErr(r, "driver", t));
      return;
    }
    setDriverModal(null);
    setDriverErrors({});
    if (driverModal === "new" && r.access) {
      showAccountAccess(r.driver, r.access);
      showToast?.(t("adminUsersDriverCreated"), driverForm.name);
    } else {
      showToast?.(t("adminUsersSaved"), driverForm.name);
    }
  };

  const releaseDriverProbation = () => {
    if (!driverModal || driverModal === "new") return;
    const r = store.releaseDriverFromProbation(driverModal);
    if (!r.ok) {
      showToast?.(
        t("adminUsersReleaseProbationFailed"),
        userSaveErr(r, "driver", t),
      );
      return;
    }
    showToast?.(t("adminUsersReleaseProbationDone"), driverForm.name);
  };

  const triggerResendAccess = (user) => {
    const r = store.resendAccess("driver", user.id);
    if (!r.ok) {
      showToast?.(t("adminUsersSaveFailed"), t("adminInvoiceErrGeneric"));
      return;
    }
    showAccountAccess(r.user, r.access);
    showToast?.(t("adminUsersToastInviteDriver"), user.name);
  };

  return (
    <div>
      <p className="pane-lead">{t("adminDriversDescLong")}</p>
      <section className="card" style={{ padding: 18 }}>
        <div className="sec-head">
          <h3>{t("adminUsersSectionDrivers")}</h3>
          <button className="btn xs primary" onClick={openNewDriver}>
            <Ic.Plus /> {t("adminUsersNewDriver")}
          </button>
        </div>
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>{t("adminUsersColName")}</th>
              <th>{t("adminUsersColDriverCode")}</th>
              <th>{t("adminUsersColStatus")}</th>
              <th>{t("adminUsersColAccess")}</th>
              <th>{t("adminUsersColActions")}</th>
            </tr>
          </thead>
          <tbody>
            {store.getDrivers().map((d) => (
              <tr key={d.id}>
                <td>
                  <strong>{d.name}</strong>
                  <div
                    className="label"
                    style={{ fontSize: 9.5, marginTop: 2 }}
                  >
                    {d.company} · {d.email}
                  </div>
                </td>
                <td className="mono">{d.driverCode}</td>
                <td>
                  <Pill
                    status={d.status === "Active" ? "accepted" : "cancelled"}
                  >
                    {d.status}
                  </Pill>
                </td>
                <td>
                  <Pill
                    status={
                      d.accessState === "Active" ? "accepted" : "published"
                    }
                  >
                    {accessStateLabel(d.accessState, t)}
                  </Pill>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn xs primary"
                      onClick={() => openEditDriver(d)}
                    >
                      {t("adminUsersEdit")}
                    </button>
                    <button
                      className="btn xs"
                      onClick={() => {
                        applyDriverStatus(
                          d,
                          d.status === "Active" ? "Blocked" : "Active",
                        );
                      }}
                    >
                      {d.status === "Active"
                        ? t("adminUsersBlock")
                        : t("adminUsersActivate")}
                    </button>
                    {["Inactive", "Archived", "Soft Deleted"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className="btn xs"
                        onClick={() => {
                          applyDriverStatus(d, st);
                        }}
                      >
                        {st}
                      </button>
                    ))}
                    <button
                      className="btn xs"
                      onClick={() => triggerResendAccess(d)}
                    >
                      {t("adminUsersResendInvite")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {driverModal ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 104,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setDriverModal(null)}
        >
          <div
            className="card elev"
            style={{
              maxWidth: 520,
              width: "100%",
              padding: 22,
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>
              {driverModal === "new"
                ? t("adminUsersNewDriverTitle")
                : t("adminUsersEditDriverTitle")}
            </h2>
            <DriverUserFormFields
              form={driverForm}
              setF={setDF}
              errors={driverErrors}
              t={t}
              isNew={driverModal === "new"}
              probationSummary={
                driverModal !== "new"
                  ? store.getDriverProbationSummary(driverModal)
                  : null
              }
              onReleaseProbation={releaseDriverProbation}
            />
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 18,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setDriverModal(null)}
              >
                {t("close")}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!driverFormValid}
                onClick={saveDriver}
              >
                {t("adminUsersSave")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AccountAccessDialog
        open={!!credentials}
        data={credentials}
        onClose={() => setCredentials(null)}
        onResend={
          credentials?.user
            ? () => {
                const r = store.resendAccess("driver", credentials.user.id);
                if (r.ok) {
                  setCredentials({
                    ...credentials,
                    access: r.access,
                    user: r.user,
                  });
                }
                return r;
              }
            : undefined
        }
        showToast={showToast}
      />
    </div>
  );
};

const StaffPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [adminModal, setAdminModal] = useStateA(null);
  const [adminForm, setAdminForm] = useStateA(emptyAdminEditForm());
  const [credentials, setCredentials] = useStateA(null);
  const [adminErrors, setAdminErrors] = useStateA({});
  const setAF = (k, v) => {
    setAdminForm((p) => ({ ...p, [k]: v }));
    setAdminErrors((e) => ({ ...e, [k]: undefined }));
  };

  const showAccountAccess = (user, access) => {
    setCredentials({
      name: user.name,
      email: user.email || "",
      access,
      user,
      kind: "admin",
    });
  };

  const openNewAdmin = () => {
    setAdminForm(emptyAdminEditForm());
    setAdminErrors({});
    setAdminModal("new");
  };

  const openEditAdmin = (a) => {
    setAdminForm({
      name: a.name || "",
      email: a.email || "",
    });
    setAdminErrors({});
    setAdminModal(a.id);
  };

  const adminFormValid =
    Object.keys(validateAdminFormLocal(adminForm, t)).length === 0;

  const saveAdmin = () => {
    const localErrors = validateAdminFormLocal(adminForm, t);
    if (Object.keys(localErrors).length) {
      setAdminErrors(localErrors);
      return;
    }
    const r =
      adminModal === "new"
        ? store.addAdmin(adminForm)
        : store.updateAdmin(adminModal, adminForm);
    if (!r.ok) {
      showToast?.(t("adminUsersSaveFailed"), userSaveErr(r, "admin", t));
      return;
    }
    setAdminModal(null);
    setAdminErrors({});
    if (adminModal === "new" && r.access) {
      showAccountAccess(r.admin, r.access);
      showToast?.(t("adminUsersAdminCreated"), adminForm.name);
    } else {
      showToast?.(t("adminUsersSaved"), adminForm.name);
    }
  };

  const triggerResendAccess = (user) => {
    const r = store.resendAccess("admin", user.id);
    if (!r.ok) {
      showToast?.(t("adminUsersSaveFailed"), t("adminInvoiceErrGeneric"));
      return;
    }
    showAccountAccess(r.user, r.access);
    showToast?.(t("adminUsersToastInviteAdmin"), user.name);
  };

  const applyAdminStatus = (admin, status) => {
    const result = store.setAdminStatus(admin.id, status);
    if (!result.ok) return;
    showToast?.(t("adminUsersToastAdminChanged"), admin.name);
  };

  return (
    <div>
      <p className="pane-lead">{t("adminStaffDescLong")}</p>
      <section className="card" style={{ padding: 18 }}>
        <div className="sec-head">
          <h3>{t("adminUsersSectionAdmins")}</h3>
          <button className="btn xs primary" onClick={openNewAdmin}>
            <Ic.Plus /> {t("adminUsersNewAdmin")}
          </button>
        </div>
        {store.getAdmins().map((a) => (
          <div
            key={a.id}
            style={{
              padding: "14px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <strong>{a.name}</strong>
                <div
                  className="label"
                  style={{ fontSize: 9.5, marginTop: 3 }}
                >
                  {a.email}
                </div>
              </div>
              <Pill status="accepted">{a.status}</Pill>
            </div>
            <div
              className="label"
              style={{ fontSize: 11.5, marginTop: 6 }}
            >
              {t("adminUsersColAccess")}: {accessStateLabel(a.accessState, t)}
            </div>
            <div
              style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}
            >
              <button
                type="button"
                className="btn xs primary"
                onClick={() => openEditAdmin(a)}
              >
                {t("adminUsersEdit")}
              </button>
              <button
                type="button"
                className="btn xs"
                onClick={() =>
                  applyAdminStatus(
                    a,
                    a.status === "Active" ? "Inactive" : "Active",
                  )
                }
              >
                {a.status === "Active"
                  ? t("adminUsersDeactivate")
                  : t("adminUsersActivate")}
              </button>
              <button
                type="button"
                className="btn xs"
                onClick={() => triggerResendAccess(a)}
              >
                {t("adminUsersResendInvite")}
              </button>
            </div>
          </div>
        ))}
      </section>

      {adminModal ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 104,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setAdminModal(null)}
        >
          <div
            className="card elev"
            style={{
              maxWidth: 440,
              width: "100%",
              padding: 22,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>
              {adminModal === "new"
                ? t("adminUsersNewAdminTitle")
                : t("adminUsersEditAdminTitle")}
            </h2>
            <AdminUserFormFields
              form={adminForm}
              setF={setAF}
              errors={adminErrors}
              t={t}
            />
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setAdminModal(null)}
              >
                {t("close")}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!adminFormValid}
                onClick={saveAdmin}
              >
                {t("adminUsersSave")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AccountAccessDialog
        open={!!credentials}
        data={credentials}
        onClose={() => setCredentials(null)}
        onResend={
          credentials?.user
            ? () => {
                const r = store.resendAccess("admin", credentials.user.id);
                if (r.ok) {
                  setCredentials({
                    ...credentials,
                    access: r.access,
                    user: r.user,
                  });
                }
                return r;
              }
            : undefined
        }
        showToast={showToast}
      />
    </div>
  );
};

const emptyCustomerForm = () => ({
  name: "",
  type: "",
  contact: "",
  phone: "",
  email: "",
  billingNotes: "",
  instructions: "",
  active: true,
});

const emptyAddressForm = () => ({
  label: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "DE",
  contactPerson: "",
  phone: "",
  secondPhone: "",
  email: "",
  notes: "",
  active: true,
});

/** Shared address fields (same as Addresses master create/update). */
const AddressMasterFields = ({ form, setF }) => {
  const { t } = useI18n();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <label className="field-label">{t("adminMasterDataLocationName")} *</label>
        <input
          className="input"
          value={form.label}
          onChange={(e) => setF("label", e.target.value)}
        />
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 80px", gap: 10 }}
      >
        <div>
          <label className="field-label">{t("adminMasterDataStreet")} *</label>
          <input
            className="input"
            value={form.street}
            onChange={(e) => setF("street", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">{t("adminMasterDataHouseNo")}</label>
          <input
            className="input"
            value={form.houseNumber}
            onChange={(e) => setF("houseNumber", e.target.value)}
          />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "100px 1fr 72px",
          gap: 10,
        }}
      >
        <div>
          <label className="field-label">{t("newOrderPlzPh")} *</label>
          <input
            className="input mono"
            value={form.postalCode}
            onChange={(e) => setF("postalCode", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">{t("newOrderCityPh")} *</label>
          <input
            className="input"
            value={form.city}
            onChange={(e) => setF("city", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">{t("adminMasterDataCountry")}</label>
          <input
            className="input mono"
            value={form.country}
            onChange={(e) => setF("country", e.target.value)}
          />
        </div>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
      >
        <div>
          <label className="field-label">{t("adminMasterDataContact")}</label>
          <input
            className="input"
            value={form.contactPerson}
            onChange={(e) => setF("contactPerson", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">{t("phone")}</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setF("phone", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="field-label">{t("adminMasterDataSecondPhone")}</label>
        <input
          className="input"
          value={form.secondPhone}
          onChange={(e) => setF("secondPhone", e.target.value)}
        />
      </div>
      <div>
        <label className="field-label">{t("adminMasterDataEmail")}</label>
        <input
          className="input"
          value={form.email}
          onChange={(e) => setF("email", e.target.value)}
        />
      </div>
      <div>
        <label className="field-label">{t("adminMasterDataNotes")}</label>
        <textarea
          className="input"
          rows={2}
          value={form.notes}
          onChange={(e) => setF("notes", e.target.value)}
        />
      </div>
    </div>
  );
};

const NEW_ORDER_ADDR_KEY_MAP = {
  pickup: {
    label: "startCompany",
    street: "startStreet",
    houseNumber: "startHouseNo",
    postalCode: "startPlz",
    city: "startCity",
    country: "startCountry",
    contactPerson: "cName1",
    phone: "cPhone1",
    secondPhone: "pickupSecondPhone",
    email: "pickupEmail",
    notes: "pickupContactNotes",
    alternateContact: "pickupAlternateContact",
    locationId: "pickupLocationId",
    saveToMaster: "savePickupToMaster",
    updateMaster: "updatePickupMaster",
    showExtra: "showPickupExtraContact",
  },
  delivery: {
    label: "endCompany",
    street: "endStreet",
    houseNumber: "endHouseNo",
    postalCode: "endPlz",
    city: "endCity",
    country: "endCountry",
    contactPerson: "cName2",
    phone: "cPhone2",
    secondPhone: "deliverySecondPhone",
    email: "deliveryEmail",
    notes: "deliveryContactNotes",
    alternateContact: "deliveryAlternateContact",
    locationId: "deliveryLocationId",
    saveToMaster: "saveDeliveryToMaster",
    updateMaster: "updateDeliveryMaster",
    showExtra: "showDeliveryExtraContact",
  },
};

const NewOrderAddressFields = ({
  side,
  form,
  setForm,
  masterAddresses,
  onMasterSelect,
  title,
}) => {
  const { t } = useI18n();
  const keys = NEW_ORDER_ADDR_KEY_MAP[side];
  const addrView = {
    label: form[keys.label] || "",
    street: form[keys.street] || "",
    houseNumber: form[keys.houseNumber] || "",
    postalCode: form[keys.postalCode] || "",
    city: form[keys.city] || "",
    country: form[keys.country] || "DE",
    contactPerson: form[keys.contactPerson] || "",
    phone: form[keys.phone] || "",
    secondPhone: form[keys.secondPhone] || "",
    email: form[keys.email] || "",
    notes: form[keys.notes] || "",
  };
  const setAddr = (k, v) => setForm((f) => ({ ...f, [keys[k]]: v }));

  return (
    <div>
      <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
        {title}
      </div>
      <label className="field-label" htmlFor={`new-${side}-addr`}>
        {side === "pickup"
          ? t("newOrderPickupFromMaster")
          : t("newOrderDeliveryFromMaster")}
      </label>
      <select
        id={`new-${side}-addr`}
        className="input"
        value={form[keys.locationId] || ""}
        onChange={(e) => onMasterSelect(e.target.value)}
      >
        <option value="">{t("newOrderAddressManual")}</option>
        {masterAddresses.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label} · {a.postalCode} {a.city}
          </option>
        ))}
      </select>
      <div style={{ marginTop: 12 }}>
        <AddressMasterFields form={addrView} setF={setAddr} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">{t("alternateContact")}</label>
        <input
          className="input"
          placeholder={t("alternateContact")}
          value={form[keys.alternateContact] || ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, [keys.alternateContact]: e.target.value }))
          }
        />
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.45,
          }}
        >
          {t("newOrderAlternateContactHint")}
        </p>
      </div>
      {!form[keys.locationId] ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={!!form[keys.saveToMaster]}
            onChange={(e) => {
              setForm((f) => ({
                ...f,
                [keys.saveToMaster]: e.target.checked,
                [keys.locationId]: "",
              }));
            }}
          />
          {side === "pickup"
            ? t("newOrderSavePickupToMaster")
            : t("newOrderSaveDeliveryToMaster")}
        </label>
      ) : (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={!!form[keys.updateMaster]}
            onChange={(e) =>
              setForm((f) => ({ ...f, [keys.updateMaster]: e.target.checked }))
            }
          />
          {t("updateMasterDataFromEntry")}
        </label>
      )}
    </div>
  );
};

const MasterDataModal = ({ open, title, onClose, children, footer }) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 104,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="card elev"
        style={{
          maxWidth: 560,
          width: "100%",
          padding: 22,
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>{title}</h2>
        {children}
        {footer}
      </div>
    </div>
  );
};

const masterDataErr = (r, t, kind) => {
  if (!r || r.ok) return "";
  const reason = r.reason;
  if (reason === "name_required" || reason === "label_required")
    return t("adminMasterDataNameRequired");
  if (reason === "address_incomplete")
    return t("adminMasterDataAddressIncomplete");
  if (reason === "in_use")
    return t(
      kind === "customer"
        ? "adminMasterDataCustomerInUse"
        : "adminMasterDataAddressInUse",
      { count: r.count || 0 },
    );
  return t("adminInvoiceErrGeneric");
};

const CustomersPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const customers = store.getCustomers();
  const [modal, setModal] = useStateA(null);
  const [form, setForm] = useStateA(emptyCustomerForm());
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => {
    setForm(emptyCustomerForm());
    setModal("new");
  };
  const openEdit = (op) => {
    setForm({
      name: op.name || "",
      type: op.type || "",
      contact: op.contact || "",
      phone: op.phone || "",
      email: op.email || "",
      billingNotes: op.billingNotes || "",
      instructions: op.instructions || "",
      active: op.active !== false,
    });
    setModal(op.id);
  };
  const closeModal = () => setModal(null);

  const save = () => {
    const payload = { ...form };
    const r =
      modal === "new"
        ? store.addCustomer(payload)
        : store.updateCustomer(modal, payload);
    if (!r.ok) {
      showToast?.(t("adminMasterDataSaveFailed"), masterDataErr(r, t, "customer"));
      return;
    }
    showToast?.(
      modal === "new" ? t("adminCustomersCreated") : t("adminMasterDataUpdated"),
      r.customer?.name || form.name,
    );
    closeModal();
  };

  const remove = (op) => {
    const used = store.countJobsUsingCustomer(op.id);
    if (used > 0) {
      showToast?.(
        t("adminMasterDataDeleteFailed"),
        t("adminMasterDataCustomerInUse", { count: used }),
      );
      return;
    }
    void window
      .requestAdminConfirm(t("adminMasterDataDeleteConfirm"), { destructive: true })
      .then((ok) => {
        if (!ok) return;
        const r = store.deleteCustomer(op.id);
        if (!r.ok)
          showToast?.(
            t("adminMasterDataDeleteFailed"),
            masterDataErr(r, t, "customer"),
          );
        else showToast?.(t("adminMasterDataDeleted"), op.name);
      });
  };

  return (
    <div id="customers">
      <div className="pane-toolbar">
        <p className="pane-lead">{t("adminCustomersDesc")}</p>
        <button type="button" className="btn primary" onClick={openNew}>
          <Ic.Plus /> {t("adminCustomerAddTitle")}
        </button>
      </div>
      <section className="card" style={{ padding: 18 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("adminCustomersColCust")}</th>
              <th>{t("adminCustomersColContact")}</th>
              <th>{t("adminMasterDataStatus")}</th>
              <th>{t("adminMasterDataJobs")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((op) => (
              <tr key={op.id}>
                <td>
                  <strong>{op.name}</strong>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    {op.type || "—"} · <span className="mono">{op.id}</span>
                  </div>
                </td>
                <td>
                  {op.contact || "—"}
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--muted)" }}
                  >
                    {op.phone || op.email || ""}
                  </div>
                </td>
                <td>
                  <Pill status={op.active !== false ? "accepted" : "cancelled"}>
                    {op.active !== false
                      ? t("adminMasterDataActive")
                      : t("adminMasterDataInactive")}
                  </Pill>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {store.countJobsUsingCustomer(op.id)}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="btn xs"
                    onClick={() => openEdit(op)}
                  >
                    {t("adminMasterDataEdit")}
                  </button>
                  <button
                    type="button"
                    className="btn xs danger"
                    style={{ marginLeft: 6 }}
                    onClick={() => remove(op)}
                  >
                    {t("adminMasterDataDelete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <MasterDataModal
        open={!!modal}
        title={
          modal === "new"
            ? t("adminCustomerAddTitle")
            : t("adminMasterDataEditCustomer")
        }
        onClose={closeModal}
        footer={
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              justifyContent: "flex-end",
            }}
          >
            <button type="button" className="btn" onClick={closeModal}>
              {t("adminInvoiceCancel")}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!form.name.trim()}
              onClick={save}
            >
              {t("adminMasterDataSave")}
            </button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="field-label">{t("adminUsersColName")} *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setF("name", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{t("adminMasterDataType")}</label>
            <input
              className="input"
              value={form.type}
              onChange={(e) => setF("type", e.target.value)}
              placeholder={t("adminMasterDataTypePh")}
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label className="field-label">{t("adminMasterDataContact")}</label>
              <input
                className="input"
                value={form.contact}
                onChange={(e) => setF("contact", e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">{t("phone")}</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setF("phone", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="field-label">{t("adminMasterDataEmail")}</label>
            <input
              className="input"
              value={form.email}
              onChange={(e) => setF("email", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{t("adminMasterDataBillingNotes")}</label>
            <textarea
              className="input"
              rows={2}
              value={form.billingNotes}
              onChange={(e) => setF("billingNotes", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{t("adminMasterDataInstructions")}</label>
            <textarea
              className="input"
              rows={2}
              value={form.instructions}
              onChange={(e) => setF("instructions", e.target.value)}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setF("active", e.target.checked)}
            />
            {t("adminMasterDataActive")}
          </label>
        </div>
      </MasterDataModal>
    </div>
  );
};

const AddressesPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const list = store.getAddresses();
  const [modal, setModal] = useStateA(null);
  const [form, setForm] = useStateA(emptyAddressForm());
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => {
    setForm(emptyAddressForm());
    setModal("new");
  };
  const openEdit = (a) => {
    setForm({
      label: a.label || "",
      street: a.street || "",
      houseNumber: a.houseNumber || "",
      postalCode: a.postalCode || "",
      city: a.city || "",
      country: a.country || "DE",
      contactPerson: a.contactPerson || "",
      phone: a.phone || "",
      secondPhone: a.secondPhone || "",
      email: a.email || "",
      notes: a.notes || "",
      active: a.active !== false,
    });
    setModal(a.id);
  };
  const closeModal = () => setModal(null);

  const save = () => {
    const r =
      modal === "new"
        ? store.addAddress(form)
        : store.updateAddress(modal, form);
    if (!r.ok) {
      showToast?.(
        t("adminMasterDataSaveFailed"),
        masterDataErr(r, t, "address"),
      );
      return;
    }
    showToast?.(
      modal === "new" ? t("adminAddressCreated") : t("adminMasterDataUpdated"),
      r.address?.label || form.label,
    );
    closeModal();
  };

  const remove = (a) => {
    const used = store.countJobsUsingAddress(a.id);
    if (used > 0) {
      showToast?.(
        t("adminMasterDataDeleteFailed"),
        t("adminMasterDataAddressInUse", { count: used }),
      );
      return;
    }
    void window
      .requestAdminConfirm(t("adminMasterDataDeleteConfirm"), { destructive: true })
      .then((ok) => {
        if (!ok) return;
        const r = store.deleteAddress(a.id);
        if (!r.ok)
          showToast?.(
            t("adminMasterDataDeleteFailed"),
            masterDataErr(r, t, "address"),
          );
        else showToast?.(t("adminMasterDataDeleted"), a.label);
      });
  };

  return (
    <div id="addresses">
      <div className="pane-toolbar">
        <p className="pane-lead">{t("adminAddressesDesc")}</p>
        <button type="button" className="btn primary" onClick={openNew}>
          <Ic.Plus /> {t("adminAddressAddTitle")}
        </button>
      </div>
      <section className="card" style={{ padding: 18 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("address")}</th>
              <th>{t("adminColOrigin")}</th>
              <th>{t("adminCustomersColContact")}</th>
              <th>{t("adminMasterDataStatus")}</th>
              <th>{t("adminMasterDataJobs")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.label}</strong>
                  <div className="label mono" style={{ fontSize: 9.5 }}>
                    {a.id}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {[a.street, a.houseNumber].filter(Boolean).join(" ")}
                  <br />
                  {[a.postalCode, a.city, a.country].filter(Boolean).join(" ")}
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{a.contactPerson || "—"}</div>
                  <div className="mono" style={{ fontSize: 11.5, marginTop: 2 }}>
                    {a.phone || "—"}
                  </div>
                  {a.email ? (
                    <div
                      style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}
                    >
                      {a.email}
                    </div>
                  ) : null}
                </td>
                <td>
                  <Pill status={a.active !== false ? "accepted" : "cancelled"}>
                    {a.active !== false
                      ? t("adminMasterDataActive")
                      : t("adminMasterDataInactive")}
                  </Pill>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {store.countJobsUsingAddress(a.id)}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="btn xs"
                    onClick={() => openEdit(a)}
                  >
                    {t("adminMasterDataEdit")}
                  </button>
                  <button
                    type="button"
                    className="btn xs danger"
                    style={{ marginLeft: 6 }}
                    onClick={() => remove(a)}
                  >
                    {t("adminMasterDataDelete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <MasterDataModal
        open={!!modal}
        title={
          modal === "new"
            ? t("adminAddressAddTitle")
            : t("adminMasterDataEditAddress")
        }
        onClose={closeModal}
        footer={
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              justifyContent: "flex-end",
            }}
          >
            <button type="button" className="btn" onClick={closeModal}>
              {t("adminInvoiceCancel")}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={
                !form.label.trim() ||
                !form.street.trim() ||
                !form.postalCode.trim() ||
                !form.city.trim()
              }
              onClick={save}
            >
              {t("adminMasterDataSave")}
            </button>
          </div>
        }
      >
        <AddressMasterFields form={form} setF={setF} />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={(e) => setF("active", e.target.checked)}
          />
          {t("adminMasterDataActive")}
        </label>
      </MasterDataModal>
    </div>
  );
};

const INFOPOINT_DOC_CATEGORIES = [
  "Operations",
  "Legal",
  "Safety",
  "Process",
  "Pickup",
  "Delivery",
  "Invoicing",
];

const InfopointPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [subTab, setSubTab] = useStateA("documents");
  const [newsForm, setNewsForm] = useStateA({
    title: "",
    body: "",
    publishedAt: "",
    notifyInApp: true,
    notifyPush: false,
  });
  const [editNews, setEditNews] = useStateA(null);
  const [editNewsForm, setEditNewsForm] = useStateA({
    title: "",
    body: "",
    publishedAt: "",
  });
  const [docModal, setDocModal] = useStateA(null);
  const [docForm, setDocForm] = useStateA({
    title: "",
    description: "",
    category: "Operations",
  });
  const [renameDoc, setRenameDoc] = useStateA(null);
  const [renameTitle, setRenameTitle] = useStateA("");
  const uploadInputRef = useRefA(null);
  const docFileRef = useRefA(null);
  const [uploadMeta, setUploadMeta] = useStateA(null);
  const [docFile, setDocFile] = useStateA(null);

  const docs = store.getDocumentsAdmin();
  const news = store.getNewsAdmin();

  const publishNews = () => {
    if (!newsForm.title.trim() || !newsForm.body.trim()) {
      showToast?.(t("adminInfopointPublishRequired"));
      return;
    }
    const item = store.addNewsItem({
      title: newsForm.title,
      body: newsForm.body,
      publishedAt: newsForm.publishedAt,
      notifyInApp: newsForm.notifyInApp,
      notifyPush: newsForm.notifyPush,
    });
    showToast?.(t("adminInfopointPublishedToast"), item.title);
    setNewsForm({
      title: "",
      body: "",
      publishedAt: "",
      notifyInApp: true,
      notifyPush: false,
    });
  };

  const openEditNews = (item) => {
    setEditNews(item.id);
    setEditNewsForm({
      title: item.title,
      body: item.body,
      publishedAt: item.publishedAt,
    });
  };

  const saveEditNews = () => {
    const r = store.updateNewsItem(editNews, editNewsForm);
    if (!r.ok) return;
    showToast?.(t("adminInfopointNewsUpdated"), editNewsForm.title);
    setEditNews(null);
  };

  const closeDocModal = () => {
    setDocModal(null);
    setDocFile(null);
    if (docFileRef.current) docFileRef.current.value = "";
  };

  const openNewDoc = () => {
    setDocForm({ title: "", description: "", category: "Operations" });
    setDocFile(null);
    if (docFileRef.current) docFileRef.current.value = "";
    setDocModal("new");
  };

  const onDocFilePick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    setDocFile(f || null);
  };

  const saveDoc = () => {
    if (!docForm.title.trim() || !docFile) return;
    const item = store.uploadGeneralDocumentStub(docFile, {
      title: docForm.title,
      description: docForm.description,
      category: docForm.category,
    });
    showToast?.(t("adminInfopointDocAdded"), item.title);
    closeDocModal();
  };

  const saveRename = () => {
    const r = store.renameGeneralDocument(renameDoc, renameTitle);
    if (!r.ok) return;
    showToast?.(t("adminInfopointDocRenamed"), renameTitle);
    setRenameDoc(null);
  };

  const onUploadPick = (doc) => {
    setUploadMeta(doc || null);
    uploadInputRef.current?.click();
  };

  const onUploadFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (uploadMeta?.id) {
      store.replaceDocument(uploadMeta.id);
      showToast?.(t("adminDocumentsReplaced"), uploadMeta.title);
    } else {
      const item = store.uploadGeneralDocumentStub(file, {});
      showToast?.(t("adminInfopointDocUploadedDemo"), item.title);
    }
    setUploadMeta(null);
  };

  return (
    <div id="infopoint">
      <p className="pane-lead">{t("adminInfopointDesc")}</p>
      <div className="tabs">
        {[
          ["documents", t("adminInfopointDocsTab")],
          ["news", t("adminInfopointNewsTab")],
        ].map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            className={subTab === id ? "on" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setSubTab(id)}
          >
            {lbl}
          </button>
        ))}
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: "none" }}
        onChange={onUploadFile}
      />

      {subTab === "documents" ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 16,
              gap: 8,
            }}
          >
            <button type="button" className="btn primary" onClick={openNewDoc}>
              <Ic.Plus /> {t("adminInfopointAddDoc")}
            </button>
          </div>
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>{t("adminDocumentsColDoc")}</th>
                <th>{t("adminInfopointColDescription")}</th>
                <th>{t("adminDocumentsColCat")}</th>
                <th>{t("adminInfopointColUpdated")}</th>
                <th>{t("adminDocumentsColVis")}</th>
                <th>{t("adminDocumentsColAct")}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.title}</strong>
                    <div className="label" style={{ fontSize: 9.5 }}>
                      {d.scope} · <span className="mono">{d.version}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 220 }}>
                    {d.description || "—"}
                  </td>
                  <td>{d.category}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {d.updatedAt}
                  </td>
                  <td>
                    <Pill status={d.visible ? "accepted" : "cancelled"}>
                      {d.visible ? t("adminDocsShown") : t("adminDocsHidden")}
                    </Pill>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn xs"
                      onClick={() => onUploadPick(d)}
                    >
                      {t("adminInfopointUploadPdf")}
                    </button>
                    <button
                      type="button"
                      className="btn xs"
                      style={{ marginLeft: 6 }}
                      onClick={() => {
                        store.replaceDocument(d.id);
                        showToast?.(t("adminDocumentsReplaced"), d.title);
                      }}
                    >
                      {t("adminDocReplace")}
                    </button>
                    <button
                      type="button"
                      className="btn xs"
                      style={{ marginLeft: 6 }}
                      onClick={() => {
                        setRenameDoc(d.id);
                        setRenameTitle(d.title);
                      }}
                    >
                      {t("adminInfopointRenameDoc")}
                    </button>
                    <button
                      type="button"
                      className="btn xs"
                      style={{ marginLeft: 6 }}
                      onClick={() => {
                        store.toggleDocument(d.id);
                        showToast?.(t("adminDocumentsVisUp"), d.title);
                      }}
                    >
                      {d.visible ? t("adminDocHide") : t("adminDocShow")}
                    </button>
                    {!d.seed ? (
                      <button
                        type="button"
                        className="btn xs danger"
                        style={{ marginLeft: 6 }}
                        onClick={() => {
                          const r = store.deleteGeneralDocument(d.id);
                          if (!r.ok) return;
                          showToast?.(t("adminMasterDataDeleted"), d.title);
                        }}
                      >
                        {t("adminMasterDataDelete")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <section className="card" style={{ padding: 22, marginTop: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
              {t("adminInfopointPublishTitle")}
            </h2>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div>
                <label className="field-label">{t("adminInfopointSubject")} *</label>
                <input
                  className="input"
                  value={newsForm.title}
                  onChange={(e) =>
                    setNewsForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label">{t("adminInfopointMessage")} *</label>
                <textarea
                  className="input"
                  rows={5}
                  value={newsForm.body}
                  onChange={(e) =>
                    setNewsForm((f) => ({ ...f, body: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label">{t("adminInfopointPublishDate")}</label>
                <input
                  className="input mono"
                  placeholder=""
                  value={newsForm.publishedAt}
                  onChange={(e) =>
                    setNewsForm((f) => ({ ...f, publishedAt: e.target.value }))
                  }
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={newsForm.notifyInApp}
                  onChange={(e) =>
                    setNewsForm((f) => ({ ...f, notifyInApp: e.target.checked }))
                  }
                />
                {t("adminInfopointNotifyInApp")}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={newsForm.notifyPush}
                  onChange={(e) =>
                    setNewsForm((f) => ({ ...f, notifyPush: e.target.checked }))
                  }
                />
                {t("adminInfopointNotifyPush")}
              </label>
              <div>
                <button type="button" className="btn primary" onClick={publishNews}>
                  {t("adminInfopointPublishButton")}
                </button>
              </div>
            </div>
          </section>

          <h2 style={{ margin: "24px 0 0", fontSize: 17, fontWeight: 600 }}>
            {t("adminInfopointNewsListTitle")}
          </h2>
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>{t("adminInfopointSubject")}</th>
                <th>{t("adminInfopointPublishDate")}</th>
                <th>{t("adminInfopointColRead")}</th>
                <th>{t("adminDocumentsColVis")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {news.map((n) => (
                <tr key={n.id}>
                  <td>
                    <strong>{n.title}</strong>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                        maxWidth: 360,
                      }}
                    >
                      {(n.body || "").slice(0, 80)}
                      {(n.body || "").length > 80 ? "…" : ""}
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {n.publishedAt}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {t("adminInfopointReadCount", { count: n.readBy?.length || 0 })}
                  </td>
                  <td>
                    <Pill status={n.visible ? "accepted" : "cancelled"}>
                      {n.visible ? t("adminDocsShown") : t("adminDocsHidden")}
                    </Pill>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn xs"
                      onClick={() => openEditNews(n)}
                    >
                      {t("adminInfopointEditNews")}
                    </button>
                    <button
                      type="button"
                      className="btn xs"
                      style={{ marginLeft: 6 }}
                      onClick={() => {
                        if (n.visible) store.hideNewsItem(n.id);
                        else store.showNewsItem(n.id);
                        showToast?.(t("adminDocumentsVisUp"), n.title);
                      }}
                    >
                      {n.visible
                        ? t("adminInfopointHideNews")
                        : t("adminInfopointShowNews")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <MasterDataModal
        open={!!docModal}
        title={t("adminInfopointAddDoc")}
        onClose={closeDocModal}
        footer={
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              justifyContent: "flex-end",
            }}
          >
            <button type="button" className="btn" onClick={closeDocModal}>
              {t("adminInvoiceCancel")}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!docForm.title.trim() || !docFile}
              onClick={saveDoc}
            >
              {t("adminMasterDataSave")}
            </button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="field-label">{t("adminDocumentsColDoc")} *</label>
            <input
              className="input"
              value={docForm.title}
              onChange={(e) =>
                setDocForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">{t("adminInfopointDocDescription")}</label>
            <input
              className="input"
              value={docForm.description}
              onChange={(e) =>
                setDocForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">{t("adminInfopointDocCategory")}</label>
            <select
              className="input"
              value={docForm.category}
              onChange={(e) =>
                setDocForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              {INFOPOINT_DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="infopoint-doc-file">
              {t("adminInvoiceUploadLabel")} *
            </label>
            <input
              id="infopoint-doc-file"
              ref={docFileRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={onDocFilePick}
            />
            <button
              type="button"
              className="btn"
              onClick={() => docFileRef.current?.click()}
            >
              <Ic.Plus /> {t("adminInvoiceUploadButton")}
            </button>
            {docFile ? (
              <p
                className="label mono"
                style={{ margin: "8px 0 0", fontSize: 12.5, wordBreak: "break-all" }}
              >
                {docFile.name}
              </p>
            ) : null}
          </div>
        </div>
      </MasterDataModal>

      <MasterDataModal
        open={!!renameDoc}
        title={t("adminInfopointRenameDoc")}
        onClose={() => setRenameDoc(null)}
        footer={
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              justifyContent: "flex-end",
            }}
          >
            <button type="button" className="btn" onClick={() => setRenameDoc(null)}>
              {t("adminInvoiceCancel")}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!renameTitle.trim()}
              onClick={saveRename}
            >
              {t("adminMasterDataSave")}
            </button>
          </div>
        }
      >
        <label className="field-label">{t("adminDocumentsColDoc")}</label>
        <input
          className="input"
          value={renameTitle}
          onChange={(e) => setRenameTitle(e.target.value)}
        />
      </MasterDataModal>

      <MasterDataModal
        open={!!editNews}
        title={t("adminInfopointEditNewsTitle")}
        onClose={() => setEditNews(null)}
        footer={
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              justifyContent: "flex-end",
            }}
          >
            <button type="button" className="btn" onClick={() => setEditNews(null)}>
              {t("adminInvoiceCancel")}
            </button>
            <button type="button" className="btn primary" onClick={saveEditNews}>
              {t("adminMasterDataSave")}
            </button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="field-label">{t("adminInfopointSubject")}</label>
            <input
              className="input"
              value={editNewsForm.title}
              onChange={(e) =>
                setEditNewsForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">{t("adminInfopointMessage")}</label>
            <textarea
              className="input"
              rows={5}
              value={editNewsForm.body}
              onChange={(e) =>
                setEditNewsForm((f) => ({ ...f, body: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">{t("adminInfopointPublishDate")}</label>
            <input
              className="input mono"
              value={editNewsForm.publishedAt}
              onChange={(e) =>
                setEditNewsForm((f) => ({ ...f, publishedAt: e.target.value }))
              }
            />
          </div>
        </div>
      </MasterDataModal>
    </div>
  );
};

const DocumentsPane = InfopointPane;

const TourBillingPane = ({
  showToast,
  filterJobId,
  onClearFilter,
  onOpenJob,
}) => {
  const store = useAuthStore();
  const { t, locale } = useI18n();
  const [viewId, setViewId] = useStateA(null);
  const [editId, setEditId] = useStateA(null);
  const [editForm, setEditForm] = useStateA(null);
  const [regJobId, setRegJobId] = useStateA(
    () => store.getJobs()[0]?.id ?? "",
  );
  const [regDriverId, setRegDriverId] = useStateA(
    () => store.getDrivers()[0]?.id ?? "",
  );
  const [regDocType, setRegDocType] = useStateA("invoice");
  const [regFile, setRegFile] = useStateA(null);
  const regFileRef = useRefA(null);
  const editFileRef = useRefA(null);
  const [regNotes, setRegNotes] = useStateA("");
  const [registerOpen, setRegisterOpen] = useStateA(false);
  const [filterType, setFilterType] = useStateA("");
  const [filterReview, setFilterReview] = useStateA("");
  const [filterSource, setFilterSource] = useStateA("");
  const [acceptId, setAcceptId] = useStateA(null);
  const [acceptInvNum, setAcceptInvNum] = useStateA("");
  const [acceptInvDate, setAcceptInvDate] = useStateA("");
  const invoiceFileAccept =
    "application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif";
  const [selected, setSelected] = useStateA(() => new Set());
  const uploads = store.getTourDocuments();
  const jobs = store.getJobs();
  const drivers = store.getDrivers();
  const filterJob = filterJobId ? jobs.find((j) => j.id === filterJobId) : null;
  const scopedUploads = filterJobId
    ? uploads.filter((u) => u.jobId === filterJobId)
    : uploads;
  const visibleUploads = useMemoA(() => {
    let list = scopedUploads;
    if (filterType)
      list = list.filter((u) => u.documentType === filterType);
    if (filterReview)
      list = list.filter((u) => u.reviewStatus === filterReview);
    if (filterSource) list = list.filter((u) => u.source === filterSource);
    return list;
  }, [scopedUploads, filterType, filterReview, filterSource]);
  const filtersActive = !!(filterType || filterReview || filterSource);
  const resetFilters = () => {
    setFilterType("");
    setFilterReview("");
    setFilterSource("");
  };
  const viewing = viewId ? uploads.find((u) => u.id === viewId) : null;
  const accepting = acceptId ? uploads.find((u) => u.id === acceptId) : null;
  const fmtIso = (iso) => {
    if (iso == null || iso === "") return "—";
    try {
      return new Date(iso).toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };
  const sourceLabel = (u) =>
    u.source === "admin" || u.source === "admin_off_channel"
      ? t("adminInvoiceSourceAdmin")
      : t("adminInvoiceSourceDriver");

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayDocReviewStatus = (st) => {
    const code = AuthStore.normalizeTourDocumentReviewStatus(st);
    return (
      {
        uploaded: t("docReviewUploaded"),
        accepted: t("docReviewAccepted"),
        rejected: t("docReviewRejected"),
        correction_required: t("docReviewCorrectionRequired"),
      }[code] || code || "—"
    );
  };

  const reviewPillStatus = (st) => {
    const code = AuthStore.normalizeTourDocumentReviewStatus(st);
    if (code === "accepted") return "accepted";
    if (code === "rejected" || code === "correction_required") return "cancelled";
    if (code === "uploaded") return "warn";
    return "draft";
  };

  const invoiceActionErr = (r) => {
    if (r && r.ok) return "";
    const reason = r && r.reason;
    if (reason === "bad_job") return t("adminInvoiceErrBadJob");
    if (reason === "bad_driver") return t("adminInvoiceErrBadDriver");
    if (reason === "no_file" || reason === "no_filename")
      return t("adminInvoiceErrNoFile");
    if (reason === "invalid_type") return t("invoiceUploadInvalidType");
    if (reason === "job_required") return t("adminInvoiceErrJobRequired");
    if (reason === "no_invoice_id") return t("adminInvoiceErrInvoiceIdRequired");
    if (reason === "already_accepted")
      return t("adminDocErrAlreadyAccepted");
    if (reason === "not_pending") return t("adminDocErrNotPending");
    if (reason === "not_rejected") return t("adminDocErrNotRejected");
    if (reason === "invoice_number_required")
      return t("adminInvoiceErrNumberRequired");
    return t("adminInvoiceErrGeneric");
  };

  const closeAccept = () => {
    setAcceptId(null);
    setAcceptInvNum("");
    setAcceptInvDate("");
  };

  const submitAccept = (doc, opts = {}) => {
    const r = store.acceptTourDocument(doc.id, opts);
    if (r.ok) {
      showToast?.(t("adminDocAccepted"), doc.fileName);
      closeAccept();
    } else showToast?.(invoiceActionErr(r));
    return r;
  };

  const onAcceptClick = (u) => {
    if (AuthStore.isTourBillingInvoiceType(u.documentType)) {
      setAcceptId(u.id);
      setAcceptInvNum("");
      setAcceptInvDate("");
      return;
    }
    submitAccept(u);
  };

  const closeRegister = () => {
    setRegisterOpen(false);
    setRegFile(null);
    if (regFileRef.current) regFileRef.current.value = "";
  };
  const onRegFilePick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    setRegFile(f || null);
  };
  const onEditFilePick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setEditForm((p) =>
      p ? { ...p, replaceFile: f, fileName: f.name } : p,
    );
  };

  useEffectA(() => {
    if (!viewId) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setViewId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewId]);

  useEffectA(() => {
    if (!acceptId) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      closeAccept();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [acceptId]);

  return (
    <div>
      <p className="pane-lead">{t("tourBillingDesc")}</p>

      {filterJobId && filterJob && (
        <div style={{ marginTop: -6, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="billing-filter-chip"
            onClick={onClearFilter}
            title={t("adminClearFilter")}
          >
            {t("adminFinanceFilteredTour", {
              tour: filterJob.tour,
              customer: filterJob.customer,
            })}{" "}
            ×
          </button>
        </div>
      )}

      <div
        className="card"
        style={{
          marginTop: 16,
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div>
          <label className="field-label" htmlFor="bill-filter-type">
            {t("billingFilterType")}
          </label>
          <select
            id="bill-filter-type"
            className="input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ marginTop: 6 }}
          >
            <option value="">{t("billingFilterAll")}</option>
            {ADMIN_TOUR_DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {displayTourDocType(type, t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="bill-filter-review">
            {t("billingFilterReview")}
          </label>
          <select
            id="bill-filter-review"
            className="input"
            value={filterReview}
            onChange={(e) => setFilterReview(e.target.value)}
            style={{ marginTop: 6 }}
          >
            <option value="">{t("billingFilterAll")}</option>
            <option value="uploaded">{t("docReviewUploaded")}</option>
            <option value="accepted">{t("docReviewAccepted")}</option>
            <option value="rejected">{t("docReviewRejected")}</option>
            <option value="correction_required">
              {t("docReviewCorrectionRequired")}
            </option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="bill-filter-source">
            {t("billingFilterSource")}
          </label>
          <select
            id="bill-filter-source"
            className="input"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            style={{ marginTop: 6 }}
          >
            <option value="">{t("billingFilterAll")}</option>
            <option value="driver">{t("adminInvoiceSourceDriver")}</option>
            <option value="admin">{t("adminInvoiceSourceAdmin")}</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filtersActive ? (
            <button type="button" className="btn" onClick={resetFilters}>
              {t("billingFilterReset")}
            </button>
          ) : null}
        </div>
      </div>
      <p className="label" style={{ margin: "10px 0 0", fontSize: 12.5 }}>
        {t("billingShowingCount", {
          shown: visibleUploads.length,
          total: scopedUploads.length,
        })}
      </p>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          className="btn"
          disabled={selected.size === 0}
          onClick={() => {
            const names = visibleUploads
              .filter((u) => selected.has(u.id))
              .map((u) => u.fileName)
              .join(", ");
            showToast?.(t("invoiceDownload") || "Download", names);
          }}
        >
          <Ic.Down /> {t("invoiceDownload")} ({selected.size})
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => setRegisterOpen(true)}
        >
          <Ic.Plus /> {t("adminTourDocRegisterTitle")}
        </button>
      </div>

      {registerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-invoice-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 102,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={closeRegister}
        >
          <div
            className="card elev"
            style={{ maxWidth: 520, width: "100%", padding: 22, maxHeight: "90vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reg-invoice-title" style={{ margin: "0 0 8px", fontSize: 17 }}>
              {t("adminTourDocRegisterTitle")}
            </h2>
            <p
              className="label"
              style={{ margin: "0 0 16px", fontSize: 12.5, lineHeight: 1.55 }}
            >
              {t("adminTourDocRegisterHint")}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="reg-doctype">
                  {t("billingFilterType")}
                </label>
                <select
                  id="reg-doctype"
                  className="input"
                  value={regDocType}
                  onChange={(e) => setRegDocType(e.target.value)}
                >
                  {ADMIN_TOUR_DOC_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {displayTourDocType(type, t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="reg-job">
                  {t("adminInvoiceSelectJob")}
                </label>
                <select
                  id="reg-job"
                  className="input"
                  value={regJobId}
                  onChange={(e) => setRegJobId(e.target.value)}
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.tour} · {j.customer}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="reg-drv">
                  {t("adminInvoiceSelectDriver")}
                </label>
                <select
                  id="reg-drv"
                  className="input"
                  value={regDriverId}
                  onChange={(e) => setRegDriverId(e.target.value)}
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="reg-file">
                  {t("adminInvoiceUploadLabel")}
                </label>
                <input
                  id="reg-file"
                  ref={regFileRef}
                  type="file"
                  accept={invoiceFileAccept}
                  style={{ display: "none" }}
                  onChange={onRegFilePick}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => regFileRef.current?.click()}
                >
                  <Ic.Plus /> {t("adminInvoiceUploadButton")}
                </button>
                {regFile ? (
                  <p
                    className="label mono"
                    style={{ margin: "8px 0 0", fontSize: 12.5, wordBreak: "break-all" }}
                  >
                    {regFile.name}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="field-label" htmlFor="reg-notes">
                  {t("adminInvoiceNotes")}
                </label>
                <textarea
                  id="reg-notes"
                  className="input"
                  rows={2}
                  value={regNotes}
                  onChange={(e) => setRegNotes(e.target.value)}
                  style={{ resize: "vertical", minHeight: 52 }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 18,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button type="button" className="btn" onClick={closeRegister}>
                {t("adminInvoiceCancel")}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!jobs.length || !drivers.length || !regFile}
                onClick={() => {
                  const r = store.registerTourDocumentAdmin({
                    jobId: regJobId,
                    driverId: regDriverId,
                    file: regFile,
                    notes: regNotes.trim(),
                    documentType: regDocType,
                  });
                  if (r.ok) {
                    showToast?.(t("adminInvoiceRegistered"), r.id);
                    setRegNotes("");
                    closeRegister();
                  } else showToast?.(invoiceActionErr(r));
                }}
              >
                {t("adminInvoiceAdd")}
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="tbl" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th></th>
            <th>{t("invoiceColFile")}</th>
            <th>{t("billingColType")}</th>
            <th>{t("invoiceColDriver")}</th>
            <th>{t("invoiceColJob")}</th>
            <th>{t("invoiceColUploaded")}</th>
            <th>{t("adminInvoiceColSource")}</th>
            <th>{t("billingColReview")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleUploads.length === 0 ? (
            <tr>
              <td
                colSpan={10}
                className="label"
                style={{ padding: "22px 12px" }}
              >
                {filtersActive
                  ? t("billingFilterEmpty")
                  : t("invoiceUploadEmpty")}
              </td>
            </tr>
          ) : (
            visibleUploads.map((u) => {
              const actions = AuthStore.tourDocumentReviewActions(u.reviewStatus);
              return (
              <tr key={u.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    aria-label={u.fileName}
                  />
                </td>
                <td>
                  <strong className="mono" style={{ fontSize: 13 }}>
                    {u.fileName}
                  </strong>
                  <div className="label" style={{ fontSize: 10.5 }}>
                    {u.mimeType}
                  </div>
                </td>
                <td style={{ fontSize: 12.5, minWidth: 120 }}>
                  {displayTourDocType(u.documentType, t)}
                </td>
                <td>{u.driverName}</td>
                <td style={{ minWidth: 220 }}>
                  {u.jobId ? (
                    (() => {
                      const j = jobs.find((x) => x.id === u.jobId);
                      return j ? (
                        <div>
                          <span style={{ fontSize: 13 }}>
                            {j.tour} · {j.customer}
                          </span>
                          {onOpenJob && (
                            <button
                              type="button"
                              className="btn xs"
                              style={{ marginTop: 6, display: "block" }}
                              onClick={() => onOpenJob(j.id)}
                            >
                              {t("adminOpenTourFromInvoice")}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="mono label" style={{ fontSize: 12 }}>
                          {u.jobId}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="label">{t("invoiceJobNone")}</span>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {fmtIso(u.uploadedAt)}
                </td>
                <td className="label" style={{ fontSize: 12 }}>
                  {sourceLabel(u)}
                </td>
                <td>
                  <Pill status={reviewPillStatus(u.reviewStatus)}>
                    {displayDocReviewStatus(u.reviewStatus)}
                  </Pill>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="btn xs"
                    onClick={() => setViewId(u.id)}
                  >
                    {t("invoiceView")}
                  </button>
                  {actions.canAccept ? (
                    <button
                      type="button"
                      className="btn xs primary"
                      style={{ marginLeft: 6 }}
                      onClick={() => onAcceptClick(u)}
                    >
                      {t("adminDocAccept")}
                    </button>
                  ) : null}
                  {actions.canReject ? (
                    <button
                      type="button"
                      className="btn xs danger"
                      style={{ marginLeft: 6 }}
                      onClick={() => {
                        const preset = window.prompt(
                          `${t("adminRejectNotePlaceholder")}\n${t("rejectionPresetLegible")} / ${t("rejectionPresetRegistration")} / ${t("rejectionPresetWaiting")}`,
                          t("rejectionPresetLegible"),
                        );
                        if (preset == null) return;
                        const reason = preset.trim();
                        if (!reason) return;
                        const r = store.rejectTourDocument(u.id, reason);
                        if (r.ok)
                          showToast?.(
                            t("adminDocRejected") || "Rejected",
                            u.fileName,
                          );
                        else showToast?.(invoiceActionErr(r));
                      }}
                    >
                      {t("adminDocReject") || "Reject"}
                    </button>
                  ) : null}
                  {actions.canRequireCorrection ? (
                    <button
                      type="button"
                      className="btn xs warn"
                      style={{ marginLeft: 6 }}
                      onClick={() => {
                        const r = store.requireTourDocumentCorrection(u.id);
                        if (r.ok)
                          showToast?.(
                            t("adminDocCorrectionRequired"),
                            u.fileName,
                          );
                        else showToast?.(invoiceActionErr(r));
                      }}
                    >
                      {t("adminDocRequireCorrection")}
                    </button>
                  ) : null}
                  {actions.canDownload ? (
                    <button
                      type="button"
                      className="btn xs"
                      style={{ marginLeft: 6 }}
                      onClick={() =>
                        showToast?.(t("invoiceDownload"), u.fileName)
                      }
                    >
                      {t("invoiceDownload")}
                    </button>
                  ) : null}
                  {actions.canReplace && (
                    <label
                      className="btn xs"
                      style={{ marginLeft: 6, cursor: "pointer" }}
                    >
                      {t("tourDocReplaceButton")}
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (!f) return;
                          const r = store.replaceTourDocument(u.id, f, {
                            actor: "admin",
                          });
                          if (r.ok)
                            showToast?.(
                              t("tourDocReplaceButton"),
                              u.fileName,
                            );
                        }}
                      />
                    </label>
                  )}
                </td>
              </tr>
            );
            })
          )}
        </tbody>
      </table>

      {false && editId && editForm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 101,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={closeEdit}
        >
          <div
            className="card elev"
            style={{ maxWidth: 480, width: "100%", padding: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>
              {t("adminInvoiceEdit")}
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="ed-job">
                  {t("adminInvoiceSelectJob")}
                </label>
                <select
                  id="ed-job"
                  className="input"
                  value={editForm.jobId}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, jobId: e.target.value }))
                  }
                >
                  {editForm.jobId &&
                  !jobs.some((j) => j.id === editForm.jobId) ? (
                    <option value={editForm.jobId}>
                      {editForm.jobId} {t("adminInvoiceOrphanSuffix")}
                    </option>
                  ) : null}
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.tour} · {j.customer}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="ed-drv">
                  {t("adminInvoiceSelectDriver")}
                </label>
                <select
                  id="ed-drv"
                  className="input"
                  value={editForm.driverId}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, driverId: e.target.value }))
                  }
                >
                  {editForm.driverId &&
                  !drivers.some((d) => d.id === editForm.driverId) ? (
                    <option value={editForm.driverId}>
                      {editForm.driverId} {t("adminInvoiceOrphanSuffix")}
                    </option>
                  ) : null}
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">{t("adminInvoiceUploadLabel")}</label>
                <p
                  className="label mono"
                  style={{ margin: "0 0 8px", fontSize: 12.5, wordBreak: "break-all" }}
                >
                  {editForm.fileName}
                </p>
                <input
                  ref={editFileRef}
                  type="file"
                  accept={invoiceFileAccept}
                  style={{ display: "none" }}
                  onChange={onEditFilePick}
                />
                <button
                  type="button"
                  className="btn xs"
                  onClick={() => editFileRef.current?.click()}
                >
                  {t("adminInvoiceReplaceDocument")}
                </button>
              </div>
              <div>
                <label className="field-label" htmlFor="ed-inv">
                  {t("invoiceIdLabel")}
                </label>
                <input
                  id="ed-inv"
                  className="input mono"
                  value={editForm.invoiceId}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, invoiceId: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="ed-notes">
                  {t("adminInvoiceNotes")}
                </label>
                <textarea
                  id="ed-notes"
                  className="input"
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  style={{ resize: "vertical", minHeight: 52 }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 18,
                justifyContent: "flex-end",
              }}
            >
              <button type="button" className="btn" onClick={closeEdit}>
                {t("adminInvoiceCancel")}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const patch = { notes: editForm.notes };
                  if (editForm.replaceFile) patch.file = editForm.replaceFile;
                  const r = store.updateTourDocument(editId, patch);
                  if (r.ok) {
                    showToast?.(t("adminInvoiceSaved"), editForm.fileName);
                    closeEdit();
                  } else showToast?.(invoiceActionErr(r));
                }}
              >
                {t("adminInvoiceSave")}
              </button>
            </div>
          </div>
        </div>
      )}

      {accepting && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 102,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={closeAccept}
        >
          <div
            className="card elev"
            style={{ maxWidth: 440, width: "100%", padding: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>
              {t("adminAcceptInvoiceTitle")}
            </h2>
            <p
              className="label"
              style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.45 }}
            >
              {accepting.fileName}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="accept-inv-num">
                  {t("adminSupplierInvoiceNumberLabel")}
                </label>
                <input
                  id="accept-inv-num"
                  className="input"
                  type="text"
                  autoFocus
                  value={acceptInvNum}
                  onChange={(e) => setAcceptInvNum(e.target.value)}
                  placeholder={t("adminSupplierInvoiceNumberPlaceholder")}
                  style={{ marginTop: 6 }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="accept-inv-date">
                  {t("adminSupplierInvoiceDateLabel")}
                </label>
                <input
                  id="accept-inv-date"
                  className="input"
                  type="text"
                  value={acceptInvDate}
                  onChange={(e) => setAcceptInvDate(e.target.value)}
                  placeholder={t("adminSupplierInvoiceDatePlaceholder")}
                  style={{ marginTop: 6 }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 18,
                justifyContent: "flex-end",
              }}
            >
              <button type="button" className="btn" onClick={closeAccept}>
                {t("adminInvoiceCancel")}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!acceptInvNum.trim()}
                onClick={() =>
                  submitAccept(accepting, {
                    supplierInvoiceNumber: acceptInvNum.trim(),
                    supplierInvoiceDate: acceptInvDate.trim(),
                  })
                }
              >
                {t("adminDocAccept")}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setViewId(null)}
        >
          <div
            className="card elev"
            style={{ maxWidth: 520, width: "100%", padding: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>
              {t("invoiceViewTitle")}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                margin: "0 0 14px",
              }}
            >
              {t("invoiceViewDisclaimer")}
            </p>
            <pre
              style={{
                margin: 0,
                padding: 14,
                borderRadius: 10,
                background: "var(--paper-2)",
                border: "1px solid var(--line)",
                fontSize: 12,
                lineHeight: 1.55,
                overflow: "auto",
                fontFamily: "var(--font-mono)",
              }}
            >
              {[
                `${t("adminInvoiceMetaFile")} ${viewing.fileName}`,
                `Review: ${viewing.reviewStatus || "—"}`,
                `${t("adminInvoiceMetaMime")} ${viewing.mimeType}`,
                `${t("adminInvoiceMetaSource")} ${sourceLabel(viewing)}`,
                `${t("adminInvoiceMetaDriver")} ${viewing.driverName}`,
                `${t("adminInvoiceMetaJob")} ${
                  viewing.jobId || t("adminInvoiceJobNone")
                }`,
                viewing.notes
                  ? `${t("adminInvoiceMetaNotes")} ${viewing.notes}`
                  : null,
                `${t("adminInvoiceMetaUploaded")} ${viewing.uploadedAt}`,
                viewing.rejectionReason
                  ? `Rejection: ${viewing.rejectionReason}`
                  : null,
                AuthStore.isTourBillingInvoiceType(viewing.documentType) &&
                (viewing.supplierInvoiceNumber || viewing.supplierInvoiceDate)
                  ? [
                      viewing.supplierInvoiceNumber
                        ? `${t("adminInvoiceMetaSupplierNumber")} ${viewing.supplierInvoiceNumber}`
                        : null,
                      viewing.supplierInvoiceDate
                        ? `${t("adminInvoiceMetaSupplierDate")} ${viewing.supplierInvoiceDate}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join("\n")
                  : null,
                `${t("adminInvoiceMetaSize")} ${viewing.sizeBytes ?? 0} ${t(
                  "adminInvoiceBytesUnit",
                )}`,
              ]
                .filter(Boolean)
                .join("\n")}
            </pre>
            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => setViewId(null)}
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FinancePane = ({
  showToast,
  initialJobId,
  initialOpenEdit,
  onNavConsumed,
  onOpenTourBilling,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const jobs = store.getJobs();
  const [finEditId, setFinEditId] = useStateA(null);
  const [finDraft, setFinDraft] = useStateA(null);
  const [highlightJobId, setHighlightJobId] = useStateA(initialJobId || null);
  const paymentLabel = (code) => {
    const m = {
      "Invoice Missing": "adminPaymentOptMissing",
      "Invoice Received": "adminPaymentOptReceived",
      Paid: "adminPaymentOptPaid",
    };
    const key = m[AuthStore.normalizePaymentStatus(code)];
    return key ? t(key) : code || t("adminPaymentOptMissing");
  };
  const toN = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const openFinEdit = (j) => {
    setFinEditId(j.id);
    setFinDraft({
      revenue: j.revenue ?? "",
      driverOffer: j.driverOffer ?? "",
      expenses: j.expenses ?? "",
      netAmount: j.netAmount ?? "",
      grossAmount: j.grossAmount ?? "",
      vatRate: j.vatRate ?? 19,
      paymentStatus: j.paymentStatus || "Invoice Missing",
    });
  };
  const closeFinEdit = () => {
    setFinEditId(null);
    setFinDraft(null);
  };

  useEffectA(() => {
    if (!initialJobId || !initialOpenEdit) return;
    const j = store.getJob(initialJobId);
    if (j) {
      openFinEdit(j);
      setHighlightJobId(initialJobId);
    }
    onNavConsumed?.();
  }, []);

  useEffectA(() => {
    if (!highlightJobId) return undefined;
    const tmr = setTimeout(() => setHighlightJobId(null), 3200);
    return () => clearTimeout(tmr);
  }, [highlightJobId]);

  useEffectA(() => {
    if (!finEditId) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeFinEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finEditId]);

  const totalRevenue = jobs.reduce(
    (s, j) => s + Number(j.revenue || 0),
    0,
  );
  const unpaid = jobs.filter((j) => j.paymentStatus !== "Paid").length;
  return (
    <div>
      <div className="statgrid">
        <div className="stat">
          <div className="label">{t("adminFinanceColRev")}</div>
          <div className="num">€ {totalRevenue.toFixed(0)}</div>
          <Pill status="accepted">{t("adminFinanceTrackedPill")}</Pill>
        </div>
        <div className="stat">
          <div className="label">{t("adminFinanceStatUnpaidRow")}</div>
          <div className="num">{unpaid}</div>
          <Pill status="assigned">{t("adminFinanceManualPill")}</Pill>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>{t("adminColTour")}</th>
            <th>{t("adminColCustomer")}</th>
            <th>{t("adminFinanceColRev")}</th>
            <th>{t("adminFinanceColDriverOffer")}</th>
            <th>{t("financeExpenses")}</th>
            <th>{t("adminFinanceColInv")}</th>
            <th>{t("adminFinanceColPay")}</th>
            <th style={{ width: 72 }}></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
              <tr
                key={j.id}
                data-job-id={j.id}
                className={highlightJobId === j.id ? "fin-row-highlight" : ""}
              >
                <td className="mono">{j.tour}</td>
                <td>{j.customer}</td>
                <td>€ {Number(j.revenue || 0).toFixed(2)}</td>
                <td>€ {Number(j.driverOffer || 0).toFixed(2)}</td>
                <td>€ {Number(j.expenses || 0).toFixed(2)}</td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {j.invoiceNumber || t("adminFinanceNoInvNum")}
                </td>
                <td>
                  <Pill
                    status={
                      j.paymentStatus === "Paid" ? "performed" : "assigned"
                    }
                  >
                    {paymentLabel(j.paymentStatus)}
                  </Pill>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn xs"
                    onClick={() => openFinEdit(j)}
                  >
                    {t("adminFinanceEditRow")}
                  </button>
                </td>
              </tr>
          ))}
        </tbody>
      </table>

      {finEditId && finDraft && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={closeFinEdit}
        >
          <div
            className="card elev"
            style={{ maxWidth: 520, width: "100%", padding: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>
              {t("adminFinanceEditTitle")}
            </h2>
            <p className="label" style={{ margin: "0 0 16px", fontSize: 12 }}>
              {(() => {
                const j = jobs.find((x) => x.id === finEditId);
                return j ? `${j.tour} · ${j.customer}` : finEditId;
              })()}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label className="field-label" htmlFor="fe-rev">
                  {t("financeCustomerRevenue")} (€)
                </label>
                <input
                  id="fe-rev"
                  className="input tnum"
                  value={finDraft.revenue}
                  onChange={(e) =>
                    setFinDraft((p) => ({ ...p, revenue: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="fe-dc">
                  {t("driverOffer")} (€)
                </label>
                <input
                  id="fe-dc"
                  className="input tnum"
                  value={finDraft.driverOffer}
                  onChange={(e) =>
                    setFinDraft((p) => ({
                      ...p,
                      driverOffer: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="fe-ex">
                  {t("financeExpenses")} (€)
                </label>
                <input
                  id="fe-ex"
                  className="input tnum"
                  value={finDraft.expenses}
                  onChange={(e) =>
                    setFinDraft((p) => ({ ...p, expenses: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="fe-vat">
                  {t("financeVatRateShort")} (%)
                </label>
                <input
                  id="fe-vat"
                  className="input tnum"
                  value={finDraft.vatRate}
                  onChange={(e) =>
                    setFinDraft((p) => ({ ...p, vatRate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="fe-net">
                  {t("financeNetVat", {
                    vat:
                      toN(finDraft.vatRate) ??
                      (typeof finDraft.vatRate === "number"
                        ? finDraft.vatRate
                        : 19),
                  })}{" "}
                  (€)
                </label>
                <input
                  id="fe-net"
                  className="input tnum"
                  value={finDraft.netAmount}
                  onChange={(e) =>
                    setFinDraft((p) => ({ ...p, netAmount: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="fe-gross">
                  {t("financeGross")} (€)
                </label>
                <input
                  id="fe-gross"
                  className="input tnum"
                  value={finDraft.grossAmount}
                  onChange={(e) =>
                    setFinDraft((p) => ({ ...p, grossAmount: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="fe-pay">
                  {t("paymentStatus")}
                </label>
                <select
                  id="fe-pay"
                  className="input"
                  value={finDraft.paymentStatus}
                  onChange={(e) =>
                    setFinDraft((p) => ({
                      ...p,
                      paymentStatus: e.target.value,
                    }))
                  }
                >
                  {[
                    ["Invoice Missing", "adminPaymentOptMissing"],
                    ["Invoice Received", "adminPaymentOptReceived"],
                    ["Paid", "adminPaymentOptPaid"],
                  ].map(([val, key]) => (
                    <option key={val} value={val}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {onOpenTourBilling && (
              <button
                type="button"
                className="btn xs"
                style={{ marginTop: 14 }}
                onClick={() => {
                  closeFinEdit();
                  onOpenTourBilling(finEditId);
                }}
              >
                {t("adminFinanceOpenTourBillingLink")}
              </button>
            )}
            <p
              className="label"
              style={{
                margin: "14px 0 0",
                fontSize: 11.5,
                lineHeight: 1.45,
              }}
            >
              {t("adminFinanceCompletedInvoiceNote")}
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 18,
                justifyContent: "flex-end",
              }}
            >
              <button type="button" className="btn" onClick={closeFinEdit}>
                {t("adminInvoiceCancel")}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const rev = toN(finDraft.revenue);
                  const patch = {
                    driverOffer: toN(finDraft.driverOffer),
                    expenses: toN(finDraft.expenses),
                    netAmount: toN(finDraft.netAmount),
                    grossAmount: toN(finDraft.grossAmount),
                    vatRate: toN(finDraft.vatRate) ?? 19,
                    paymentStatus: finDraft.paymentStatus,
                  };
                  if (rev != null) {
                    patch.revenue = rev;
                  }
                  const r = store.updateFinancial(finEditId, patch);
                  if (r.ok) {
                    const j = store.getJob(finEditId);
                    showToast?.(
                      t("adminFinanceSaved"),
                      j ? `${j.tour} · ${j.customer}` : "",
                    );
                    closeFinEdit();
                  } else if (r.reason === "use_tour_documents") {
                    showToast?.(t("adminFinanceErrUseTourDocuments"));
                  } else showToast?.(t("adminFinanceErrSave"));
                }}
              >
                {t("adminInvoiceSave")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AuditPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  return (
    <div>
      <div className="pane-toolbar">
        <p className="pane-lead">{t("auditDesc")}</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const csv = store.exportAuditLogCsv();
            const blob = new Blob([csv], {
              type: "text/csv;charset=utf-8",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "autheon-audit-log.csv";
            a.click();
            URL.revokeObjectURL(url);
            showToast?.(t("adminAuditExportTitle"), t("adminAuditExportSub"));
          }}
        >
          <Ic.Down /> {t("adminAuditDownloadCsv")}
        </button>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>{t("adminAuditColTime")}</th>
            <th>{t("adminAuditColAction")}</th>
            <th>{t("adminAuditColActor")}</th>
            <th>{t("adminAuditColEntity")}</th>
            <th>{t("adminAuditColMeta")}</th>
          </tr>
        </thead>
        <tbody>
          {store.getAuditLog().map((a, i) => (
            <tr key={i}>
              <td className="mono">{a.at}</td>
              <td>
                <strong>{a.action}</strong>
              </td>
              <td>{a.actor}</td>
              <td>{a.entity}</td>
              <td>{a.meta || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const FLAG_I18N = {
  financeModule: {
    label: "adminFeatureFinanceLabel",
    desc: "adminFeatureFinanceDesc",
  },
};

const CRITICAL_ALERT_EVENTS = new Set([
  "report_problem_cancel",
  "special_case_created",
  "job_cancelled",
  "tour_document_reuploaded",
]);

const ADMIN_ALERT_EVENT_I18N = {
  master_data_change_requested: "adminNotifMasterDataChange",
  report_problem_cancel: "adminNotifReportProblemCancel",
  special_case_created: "adminNotifSpecialCaseCreated",
  job_accepted: "adminNotifJobAccepted",
  job_performed: "adminNotifJobPerformed",
  tour_document_uploaded: "adminNotifDocumentUploaded",
  tour_document_reuploaded: "adminNotifDocumentReuploaded",
};

const parseMasterDataRequestIdFromMeta = (meta) => {
  const m = String(meta || "").match(/(MDR-[A-Za-z0-9-]+)/);
  return m ? m[1] : "";
};

const MASTER_DATA_CHANGE_FIELDS = [
  ["company", "company"],
  ["address", "address"],
  ["email", "email"],
  ["phone", "phone"],
];

const mdrFieldsForRow = (row) =>
  row?.changeType === "daily_limit_override"
    ? [["dailyJobLimit", "adminUsersFieldProbationLimit"]]
    : MASTER_DATA_CHANGE_FIELDS;

const mdrChangedFields = (row) =>
  mdrFieldsForRow(row).filter(
    ([key]) =>
      String(row.snapshot?.[key] ?? "") !== String(row.proposed?.[key] ?? ""),
  );

const mdrChangeTypeLabel = (row, t) => {
  const code = row?.changeType || "contact";
  return t(`masterDataChangeType_${code}`) || code;
};

const MasterDataChangeListChips = ({ row, t }) => {
  if (!row.proposed) {
    const legacy = String(row.note || "").trim();
    return (
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
        {legacy.length > 100 ? `${legacy.slice(0, 100)}…` : legacy || "—"}
      </div>
    );
  }
  const changed = mdrChangedFields(row);
  if (!changed.length) {
    return (
      <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
        {t("adminMdrNoFieldChanges")}
      </div>
    );
  }
  return (
    <div className="mdr-list-changes">
      {changed.map(([key, labelKey]) => (
        <span key={key} className="mdr-list-chip on">
          {t(labelKey)}
        </span>
      ))}
    </div>
  );
};

const MasterDataCompareTable = ({ snapshot, proposed, changeType, t, onlyChanged }) => {
  const fields =
    changeType === "daily_limit_override"
      ? [["dailyJobLimit", "adminUsersFieldProbationLimit"]]
      : MASTER_DATA_CHANGE_FIELDS;
  const rows = fields.map(([key, labelKey]) => {
    const before = snapshot?.[key] || "";
    const after = proposed?.[key] ?? before;
    const changed = String(before).trim() !== String(after).trim();
    if (onlyChanged && !changed) return null;
    return (
      <div
        key={key}
        className={`mdr-compare-row${changed ? " is-changed" : ""}`}
      >
        <div className="mdr-compare-cell label">{t(labelKey)}</div>
        <div className="mdr-compare-cell before">{before || "—"}</div>
        <div className="mdr-compare-cell after">{after || "—"}</div>
      </div>
    );
  }).filter(Boolean);
  if (!rows.length) {
    return <div style={{ color: "var(--muted)", fontSize: 13 }}>—</div>;
  }
  return (
    <div className="mdr-compare">
      <div className="mdr-compare-header">
        <span>{t("adminMdrCompareField")}</span>
        <span>{t("adminMdrCompareBefore")}</span>
        <span>{t("adminMdrCompareAfter")}</span>
      </div>
      {rows}
    </div>
  );
};

const MasterDataRequestsPane = ({ showToast, initialRequestId }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [filter, setFilter] = useStateA("open");
  const [selectedId, setSelectedId] = useStateA(initialRequestId || "");
  const [adminNote, setAdminNote] = useStateA("");

  useEffectA(() => {
    if (initialRequestId) setSelectedId(initialRequestId);
  }, [initialRequestId]);

  const rows = store.listMasterDataChangeRequests(
    filter === "all" ? {} : { status: filter },
  );
  const selected =
    store.getMasterDataChangeRequest(selectedId) ||
    rows.find((r) => r.id === selectedId) ||
    null;

  const resolve = (decision) => {
    if (!selected) return;
    const r = store.resolveMasterDataChangeRequest(
      selected.id,
      decision,
      adminNote.trim(),
    );
    if (r.ok) {
      showToast?.(
        decision === "approve"
          ? t("adminMdrApprovedToast")
          : t("adminMdrRejectedToast"),
        selected.driverName,
      );
      setAdminNote("");
      setSelectedId("");
    } else {
      showToast?.(
        t("adminMdrResolveFailed"),
        userSaveErr({ reason: r.reason }, "driver", t) || r.reason || "",
      );
    }
  };

  return (
    <div style={{ maxWidth: 1040 }}>
      <p className="pane-lead">{t("adminMdrSub")}</p>
      <div className="seg" style={{ display: "inline-flex", marginBottom: 18 }}>
        {[
          ["open", t("adminMdrFilterOpen")],
          ["approved", t("adminMdrFilterApproved")],
          ["rejected", t("adminMdrFilterRejected")],
          ["all", t("adminMdrFilterAll")],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={filter === id ? "on" : ""}
            onClick={() => {
              setFilter(id);
              setSelectedId("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: selected ? "1fr 1.1fr" : "1fr",
          gap: 18,
          marginTop: 18,
          alignItems: "start",
        }}
      >
        <section className="card" style={{ padding: 0 }}>
          {rows.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--muted)" }}>
              {t("adminMdrEmpty")}
            </div>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="btn ghost"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 18px",
                  borderRadius: 0,
                  borderBottom: "1px solid var(--line)",
                  background:
                    selectedId === row.id ? "rgba(30, 64, 175, 0.06)" : "transparent",
                }}
                onClick={() => {
                  setSelectedId(row.id);
                  setAdminNote("");
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{row.driverName}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  {row.driverCode || "—"} · {row.createdAt}
                </div>
                <div className="label" style={{ fontSize: 10.5, marginTop: 6 }}>
                  {mdrChangeTypeLabel(row, t)}
                </div>
                <MasterDataChangeListChips row={row} t={t} />
                <Pill
                  status={
                    row.status === "open"
                      ? "assigned"
                      : row.status === "approved"
                        ? "performed"
                        : "cancelled"
                  }
                >
                  {row.status === "open"
                    ? t("adminMdrStatusOpen")
                    : row.status === "approved"
                      ? t("adminMdrStatusApproved")
                      : t("adminMdrStatusRejected")}
                </Pill>
              </button>
            ))
          )}
        </section>
        {selected ? (
          <section className="card" style={{ padding: 22 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{selected.driverName}</h2>
            <p className="mono" style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              {t("driverCode")}: {selected.driverCode || "—"} · {selected.createdAt}
            </p>
            <div className="label" style={{ fontSize: 11, marginTop: 8 }}>
              {mdrChangeTypeLabel(selected, t)}
            </div>
            {selected.proposed ? (
              <div style={{ marginTop: 16 }}>
                <div className="field-label">{t("adminMdrProposedChanges")}</div>
                <p
                  className="label"
                  style={{ margin: "6px 0 0", fontSize: 11.5, lineHeight: 1.45 }}
                >
                  {selected.status === "open"
                    ? t("adminMdrProposedChangesHint")
                    : t("adminMdrProposedChangesResolved")}
                </p>
                <MasterDataCompareTable
                  snapshot={selected.snapshot}
                  proposed={selected.proposed}
                  changeType={selected.changeType}
                  t={t}
                  onlyChanged
                />
                {selected.changeType === "daily_limit_override" && selected.note ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="field-label">{t("adminUsersFieldNotes")}</div>
                    <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5 }}>
                      {selected.note}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : selected.note ? (
              <>
                <div className="field-label" style={{ marginTop: 16 }}>
                  {t("adminMdrLegacyNote")}
                </div>
                <div
                  className="dash-area"
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    lineHeight: 1.55,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  {selected.note}
                </div>
              </>
            ) : null}
            {selected.status === "open" ? (
              <div className="mdr-detail-actions">
                <label className="field-label">{t("adminMdrAdminNote")}</label>
                <textarea
                  className="input"
                  style={{ marginTop: 8, minHeight: 72 }}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={t("adminMdrAdminNotePh")}
                />
                {selected.proposed ? (
                  <p
                    className="label"
                    style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.45 }}
                  >
                    {t("adminMdrApproveHint")}
                  </p>
                ) : (
                  <p
                    className="label"
                    style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.45 }}
                  >
                    {t("adminMdrLegacyApproveBlocked")}
                  </p>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  {selected.proposed ? (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => resolve("approve")}
                    >
                      {t("adminMdrApprove")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => resolve("reject")}
                  >
                    {t("adminMdrReject")}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16, fontSize: 13, color: "var(--muted)" }}>
                <div>
                  {t("adminMdrResolvedAt")}: {selected.resolvedAt || "—"}
                </div>
                {selected.adminNote ? (
                  <div style={{ marginTop: 8 }}>{selected.adminNote}</div>
                ) : null}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
};

const NotificationFeedPane = ({ showToast, onOpenJob, onReviewMasterDataRequest }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const rows = store.getAdminEmailQueue();
  return (
    <div style={{ maxWidth: 900 }}>
      <p className="pane-lead">{t("adminNotificationFeedSub")}</p>
      <section className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            {t("adminNotificationEmpty")}
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                padding: "14px 18px",
                borderBottom: "1px solid var(--line)",
                background: CRITICAL_ALERT_EVENTS.has(row.event)
                  ? "rgba(220, 38, 38, 0.04)"
                  : "transparent",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {ADMIN_ALERT_EVENT_I18N[row.event]
                    ? t(ADMIN_ALERT_EVENT_I18N[row.event])
                    : row.event}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  {row.tour ? `${t("adminColTour")} ${row.tour}` : "—"}
                  {row.meta ? ` · ${row.meta}` : ""}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>
                  {row.at}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {row.event === "master_data_change_requested" &&
                onReviewMasterDataRequest ? (
                  <button
                    type="button"
                    className="btn xs primary"
                    onClick={() => {
                      const reqId = parseMasterDataRequestIdFromMeta(row.meta);
                      onReviewMasterDataRequest(reqId);
                    }}
                  >
                    {t("adminMdrReviewFromFeed")}
                  </button>
                ) : null}
                {row.jobId ? (
                  <button
                    type="button"
                    className="btn xs"
                    onClick={() => {
                      const j = store.getJob(row.jobId);
                      if (j) onOpenJob?.(j);
                      else showToast?.(t("adminNotificationOpenJob"), row.tour);
                    }}
                  >
                    {t("adminNotificationOpenJob")}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

const OperationalPoliciesForm = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const policies = store.getOperationalPolicies();
  const [adminCancelHours, setAdminCancelHours] = useStateA(
    String(policies.adminCancelMinHoursBeforePickupStart ?? 1),
  );
  const [scheduleHours, setScheduleHours] = useStateA(
    String(policies.scheduleChangeMinHoursBeforePickupStart ?? 1),
  );
  const [minDriverMsg, setMinDriverMsg] = useStateA(
    String(policies.cancellation?.adminCancelDriverMessageMinChars ?? 20),
  );
  const [defaultLimit, setDefaultLimit] = useStateA(
    String(policies.driverAcceptance?.probationJobCount ?? 3),
  );

  const save = () => {
    store.setOperationalPolicies({
      operational: {
        adminCancelMinHoursBeforePickupStart: Number(adminCancelHours) || 0,
        scheduleChangeMinHoursBeforePickupStart: Number(scheduleHours) || 0,
      },
      cancellation: {
        adminCancelDriverMessageMinChars: Number(minDriverMsg) || 20,
      },
      driverAcceptance: {
        probationJobCount: Number(defaultLimit) || 3,
      },
    });
    showToast?.(t("adminOperationalPoliciesSaved"));
  };

  return (
    <div className="policy-grid">
      <div className="policy-field">
        <label className="field-label" htmlFor="policy-cancel-hours">
          {t("adminPolicyCancelHoursLabel")}
        </label>
        <input
          id="policy-cancel-hours"
          className="input"
          type="number"
          min={0}
          step={0.5}
          value={adminCancelHours}
          onChange={(e) => setAdminCancelHours(e.target.value)}
        />
      </div>
      <div className="policy-field">
        <label className="field-label" htmlFor="policy-schedule-hours">
          {t("adminPolicyScheduleHoursLabel")}
        </label>
        <input
          id="policy-schedule-hours"
          className="input"
          type="number"
          min={0}
          step={0.5}
          value={scheduleHours}
          onChange={(e) => setScheduleHours(e.target.value)}
        />
      </div>
      <div className="policy-field">
        <label className="field-label" htmlFor="policy-min-driver-msg">
          {t("adminPolicyMinDriverMsgLabel")}
        </label>
        <input
          id="policy-min-driver-msg"
          className="input"
          type="number"
          min={1}
          value={minDriverMsg}
          onChange={(e) => setMinDriverMsg(e.target.value)}
        />
      </div>
      <div className="policy-field">
        <label className="field-label" htmlFor="policy-default-limit">
          {t("adminPolicyDefaultProbationLimitLabel")}
        </label>
        <input
          id="policy-default-limit"
          className="input"
          type="number"
          min={1}
          value={defaultLimit}
          onChange={(e) => setDefaultLimit(e.target.value)}
        />
      </div>
      <button type="button" className="btn primary touch-target" style={{ width: "fit-content" }} onClick={save}>
        {t("adminOperationalPoliciesSave")}
      </button>
    </div>
  );
};

const FeaturesPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const flags = store.getFeatureFlags();
  const appDisplayName = store.getAppDisplayName();
  const [displayName, setDisplayName] = useStateA(appDisplayName);

  useEffectA(() => {
    setDisplayName(appDisplayName);
  }, [appDisplayName]);

  const commitDisplayName = () => {
    store.setAppDisplayName(displayName);
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <section className="card" style={{ padding: 22 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
          {t("adminBrandingTitle")}
        </h2>
        <p
          style={{
            color: "var(--muted)",
            marginTop: 8,
            marginBottom: 0,
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {t("adminBrandingBlurb")}
        </p>
        <div style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="branding-app-name">
            {t("adminAppDisplayNameLabel")}
          </label>
          <input
            id="branding-app-name"
            className="input"
            style={{ marginTop: 8, maxWidth: 360, fontWeight: 600 }}
            value={displayName}
            placeholder={t("adminAppDisplayNamePh")}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={commitDisplayName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDisplayName();
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </section>

      <section className="card" style={{ padding: 22, marginTop: 22 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
          {t("adminOperationalPoliciesTitle")}
        </h2>
        <p
          style={{
            color: "var(--muted)",
            marginTop: 8,
            marginBottom: 0,
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {t("adminOperationalPoliciesBlurb")}
        </p>
        <OperationalPoliciesForm showToast={showToast} />
      </section>

      <h2
        style={{
          margin: "28px 0 0",
          fontSize: 17,
          fontWeight: 600,
        }}
      >
        {t("adminFeatureFlags")}
      </h2>
      <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
        {t("adminFeatureFlagsBlurb")}
      </p>
      <section className="card" style={{ padding: "0 18px", marginTop: 14 }}>
        {Object.keys(FLAG_I18N).map((key) => {
          const enabled = !!flags[key];
          const meta = FLAG_I18N[key];
          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {meta ? t(meta.label) : key}
                </div>
                {meta?.desc && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 3,
                    }}
                  >
                    {t(meta.desc)}
                  </div>
                )}
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <Pill status={enabled ? "accepted" : "cancelled"}>
                  {enabled ? t("adminPillOn") : t("adminPillOff")}
                </Pill>
                <input
                  type="checkbox"
                  checked={!!enabled}
                  onChange={(e) => store.setFeatureFlag(key, e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
              </label>
            </div>
          );
        })}
      </section>
    </div>
  );
};

Object.assign(window, {
  AdminNav,
  Overview,
  OverviewFooter,
  AssignDriverDialog,
  assignDriverErr,
  AdminDetail,
  AdminDetailFooter,
  NewOrder,
  NewOrderFooter,
  Stub,
  DriversPane,
  StaffPane,
  CustomersPane,
  AddressesPane,
  DocumentsPane,
  InfopointPane,
  TourBillingPane,
  
  FinancePane,
  AuditPane,
  NotificationFeedPane,
  MasterDataRequestsPane,
  FeaturesPane,
});
