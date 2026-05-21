/* global React, AuthStore, useAuthStore, Pill, Lbl, Ic */
const {
  useState: useStateA,
  useEffect: useEffectA,
  useMemo: useMemoA,
  useRef: useRefA,
} = React;

// =========================================================================
// ADMIN — NAV
// =========================================================================
const AdminNav = ({ section, setSection }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const total = store.getJobs().length;
  const invCount = store.getTourDocuments().length;
  const financeOn = store.getFeatureFlag("financeModule");
  const items = [
    { id: "overview", label: t("navJobs"), count: total, I: Ic.N.Tour },
    { id: "users", label: t("navUsers"), count: null, I: Ic.N.Users },
    {
      id: "orderingparties",
      label: t("navOrderingParties") || "Ordering parties",
      count: null,
      I: Ic.N.Building,
    },
    {
      id: "addresses",
      label: t("navAddresses") || "Addresses",
      count: null,
      I: Ic.N.Building,
    },
    { id: "documents", label: t("navDocuments"), count: null, I: Ic.N.Doc },
    {
      id: "invoices",
      label: t("navPartnerInvoices"),
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
          <span className="mark"></span> {store.getAppDisplayName()}
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
            className="mono"
            style={{
              fontSize: 10.5,
              color: "var(--muted)",
              letterSpacing: 0.06,
              textTransform: "uppercase",
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
      <div className="page-head">
        <h1 className="page-title">{t("jobOverview")}</h1>
        <div className="label">
          {filtered.length} / {all.length}
        </div>
      </div>

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
                  {j.date} ·{" "}
                  {j.windowFlex
                    ? t("adminWindowFlex")
                    : `${j.windowFrom?.slice(0, 2)}-${j.windowTo?.slice(0, 2)}`}
                </td>
                <td>{j.vehicle === "Transporter" ? t("adminVehicleTrp") : j.vehicle}</td>
                <td>{j.driver || "—"}</td>
                <td>
                  <Pill status={j.status} />
                </td>
                <td>
                  {j.documentReviewSummary ? (
                    <span className="label" style={{ fontSize: 11 }}>
                      {j.documentReviewSummary}
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

const JobFinancePanel = ({ job, onEditFinances, onOpenPartnerInvoices }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const linkedInvoices = store.getTourDocumentsForJob(job.id);
  const fmt = (n) =>
    n == null || n === "" ? "—" : `€ ${Number(n).toFixed(2)}`;
  const paymentLabel = (code) => {
    const m = {
      "Invoice Missing": "adminPaymentOptMissing",
      "Invoice Received": "adminPaymentOptReceived",
      Unpaid: "adminPaymentOptUnpaid",
      Paid: "adminPaymentOptPaid",
    };
    const key = m[code];
    return key ? t(key) : code || t("adminPaymentOptUnpaid");
  };
  const showPendingBanner =
    linkedInvoices.length > 0 &&
    linkedInvoices.some(
      (u) =>
        u.reviewStatus === "uploaded" || u.reviewStatus === "under_review",
    );
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
          <div style={{ fontWeight: 700, marginTop: 6 }} className="tnum">
            {fmt(job.revenue)}
          </div>
        </div>
        <div>
          <div className="label">{t("partnerOffer")}</div>
          <div style={{ fontWeight: 600, marginTop: 6 }} className="tnum">
            {fmt(job.driverCompensation)}
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
          <div style={{ fontWeight: 700, marginTop: 6 }} className="tnum">
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
            {linkedInvoices.map((u) => (
              <tr key={u.id}>
                <td className="mono" style={{ fontSize: 12 }}>
                  {u.documentType || "—"}
                </td>
                <td style={{ fontSize: 13 }}>{u.fileName}</td>
                <td>
                  <Pill
                    status={
                      u.reviewStatus === "accepted"
                        ? "accepted"
                        : u.reviewStatus === "rejected"
                          ? "cancelled"
                          : "assigned"
                    }
                  >
                    {u.reviewStatus || "—"}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showPendingBanner && (
        <div className="finance-snapshot-banner" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            {t("adminFinancePendingBanner")}
          </div>
          {onOpenPartnerInvoices && (
            <button
              type="button"
              className="btn xs"
              style={{ marginTop: 10 }}
              onClick={onOpenPartnerInvoices}
            >
              {t("adminFinanceReviewInvoices")}
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
        {onOpenPartnerInvoices && (
          <button type="button" className="btn" onClick={onOpenPartnerInvoices}>
            {t("adminOpenPartnerInvoicesBtn")}
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
  if (job.status !== "special_case") return null;
  const report = job.specialCaseReport || {};
  const resolve = (decision) => {
    const mapped = SPECIAL_CASE_STORE_DECISION[decision] || decision;
    const r = store.resolveSpecialCase(job.id, mapped, note.trim());
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
      <div
        style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="btn primary"
          onClick={() => resolve("continue")}
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
// ADMIN — DETAIL
// =========================================================================
const AdminDetail = ({
  job,
  onBack,
  onPublish,
  onAssign,
  onCancel,
  onEdit,
  onEditFinances,
  onOpenPartnerInvoices,
  showToast,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const financeOn = store.getFeatureFlag("financeModule");
  return (
    <>
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
              fontWeight: 700,
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
            {job.distanceKm} km · {job.dateLong} ·{" "}
            {job.windowFlex
              ? t("flexible")
              : `${job.windowFrom}–${job.windowTo}`}
          </div>
        </div>
        <div
          className="card"
          style={{ padding: "14px 18px", textAlign: "right", minWidth: 220 }}
        >
          <div className="label">{t("partnerOffer")}</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginTop: 4,
              letterSpacing: "-0.02em",
            }}
            className="tnum"
          >
            € {(job.driverCompensation ?? 0).toFixed(2)}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--muted)",
              letterSpacing: 0.04,
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            {job.axle} · {t("adminPayoutLumpSum")}
          </div>
        </div>
      </div>

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
                <div style={{ fontWeight: 700, marginTop: 6 }}>
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
                <div style={{ fontWeight: 700, marginTop: 6 }}>
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
                    fontWeight: 700,
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
                <div style={{ fontWeight: 600, marginTop: 6 }}>
                  {job.dateLong}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 12, color: "var(--muted)" }}
                >
                  {job.windowFlex
                    ? t("flexible")
                    : `${job.windowFrom} – ${job.windowTo}`}
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
                <div style={{ fontWeight: 700, marginTop: 6 }}>
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
                    fontWeight: 700,
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
                  <div style={{ fontWeight: 700, marginTop: 6 }}>
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
                  onClick={() => AuthStore.viewPdf(job.id)}
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
              onOpenPartnerInvoices={onOpenPartnerInvoices}
            />
          ) : (
            onOpenPartnerInvoices && (
              <section className="card" style={{ padding: 22 }}>
                <div className="sec-head">
                  <h3>
                    <span className="num">06</span>
                    {t("navPartnerInvoices")}
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
                  {t("partnerInvoicesDesc")}
                </p>
                <button
                  type="button"
                  className="btn primary"
                  style={{ marginTop: 14 }}
                  onClick={onOpenPartnerInvoices}
                >
                  {t("adminOpenPartnerInvoicesBtn")}
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
            </div>
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
  onAssign,
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
            <button type="button" className="btn" onClick={onAssign}>
              {t("adminAssignDriver")}
            </button>
            <button type="button" className="btn primary" onClick={onPublish}>
              {t("adminPublishToMarketplace")}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (!window.confirm(t("adminDeleteDraftConfirm"))) return;
                onDeleteDraft();
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
        {(job.status === "accepted" ||
          job.status === "assigned" ||
          job.status === "special_case") && (
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (!window.confirm(t("adminCancelJobConfirm"))) return;
              onCancel();
            }}
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
const NewOrder = ({ onCancel, onFormChange }) => {
  const store = useAuthStore();
  const { t } = useI18n();
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
  const [form, setForm] = useStateA({
    customer: "",
    startCity: "",
    startPlz: "",
    startStreet: "",
    endCity: "",
    endPlz: "",
    endStreet: "",
    distance: "",
    date: "",
    from: "",
    to: "",
    vehicleType: "",
    brand: "",
    model: "",
    plate: "",
    vin: "",
    cName1: "",
    cPhone1: "",
    cName2: "",
    cPhone2: "",
    driverCompensation: "",
    notes: "",
    notesDriver: "",
    axle: "Eigenachse",
  });
  const [activeSec, setActiveSec] = useStateA("01");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const prefillCustomer = () => {
    const c = store.getOrderingParties()[0];
    if (!c) return;
    setForm((f) => ({
      ...f,
      customer: c.name,
      startStreet: c.pickup.split(",")[0] || f.startStreet,
      startPlz: (c.pickup.match(/\b\d{5}\b/) || [""])[0],
      startCity:
        (c.pickup.split(",").pop() || "").replace(/\d/g, "").trim() ||
        f.startCity,
      endStreet: c.delivery.split(",")[0] || f.endStreet,
      endPlz: (c.delivery.match(/\b\d{5}\b/) || [""])[0],
      endCity:
        (c.delivery.split(",").pop() || "").replace(/\d/g, "").trim() ||
        f.endCity,
      cName1: c.contact,
      cPhone1: c.phone,
      notesDriver: c.instructions,
    }));
  };

  const required = [
    "customer",
    "startCity",
    "startPlz",
    "startStreet",
    "endCity",
    "endPlz",
    "endStreet",
    "date",
    "vehicleType",
    "plate",
    "driverCompensation",
  ];
  const filled = required.filter(
    (k) => form[k] && String(form[k]).trim(),
  ).length;
  const total = required.length;
  const valid = filled === total;

  useEffectA(() => {
    if (typeof onFormChange === "function") onFormChange(form, valid);
  }, [form, valid]);

  const sections = [
    ["01", t("newOrderSecCustomer")],
    ["02", t("newOrderSecRoute")],
    ["03", t("newOrderSecSchedule")],
    ["04", t("newOrderSecVehicle")],
    ["05", t("newOrderSecContacts")],
    ["06", t("newOrderSecPartnerOffer")],
    ["07", t("newOrderSecNotes")],
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <div className="label">{t("newOrderSubtitle")}</div>
          <h1
            style={{
              margin: "6px 0 0",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {t("navNewJob")}
          </h1>
        </div>
        <div
          className="card"
          style={{ padding: "10px 16px", textAlign: "right" }}
        >
          <div className="label">{t("tourNo")}</div>
          <div
            className="mono"
            style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}
          >
            0848-26
          </div>
        </div>
      </div>

      <div className="grid-form-layout">
        {/* TOC */}
        <aside style={{ position: "sticky", top: 0 }}>
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
              <span className="label">{t("newOrderPrefillMaster")}</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px",
                gap: 14,
                marginTop: 14,
              }}
            >
              <div>
                <label className="field-label">{t("newOrderSelectCustomer")}</label>
                <input
                  className="input"
                  placeholder={t("newOrderCustomerSearchPh")}
                  value={form.customer}
                  onChange={(e) => set("customer", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">{t("newOrderOrCreateNew")}</label>
                <button
                  type="button"
                  className="btn block"
                  style={{ padding: "10px 12px" }}
                  onClick={prefillCustomer}
                >
                  <Ic.Plus /> {t("newOrderFromMasterData")}
                </button>
              </div>
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
              <div>
                <label className="field-label">{t("newOrderStartAddress")}</label>
                <input
                  className="input"
                  placeholder={t("newOrderStreetPh")}
                  value={form.startStreet}
                  onChange={(e) => set("startStreet", e.target.value)}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <input
                    className="input mono"
                    placeholder={t("newOrderPlzPh")}
                    value={form.startPlz}
                    onChange={(e) => set("startPlz", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder={t("newOrderCityPh")}
                    value={form.startCity}
                    onChange={(e) => set("startCity", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">{t("newOrderEndAddress")}</label>
                <input
                  className="input"
                  placeholder={t("newOrderStreetPh")}
                  value={form.endStreet}
                  onChange={(e) => set("endStreet", e.target.value)}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <input
                    className="input mono"
                    placeholder={t("newOrderPlzPh")}
                    value={form.endPlz}
                    onChange={(e) => set("endPlz", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder={t("newOrderCityPh")}
                    value={form.endCity}
                    onChange={(e) => set("endCity", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">{t("newOrderDistanceKm")}</label>
              <input
                className="input mono"
                style={{ maxWidth: 200 }}
                placeholder="0"
                value={form.distance}
                onChange={(e) => set("distance", e.target.value)}
              />
            </div>
          </section>

          <section id="sec-03" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">03</span> {t("newOrderSecScheduleTitle")}
              </h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <div>
                <label className="field-label">{t("date")} *</label>
                <input
                  className="input mono"
                  placeholder={t("newOrderDatePh")}
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">{t("newOrderWindowFrom")}</label>
                <input
                  className="input mono"
                  placeholder={t("newOrderTimePh")}
                  value={form.from}
                  onChange={(e) => set("from", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">{t("newOrderWindowTo")}</label>
                <input
                  className="input mono"
                  placeholder={t("newOrderTimePh")}
                  value={form.to}
                  onChange={(e) => set("to", e.target.value)}
                />
              </div>
            </div>
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
                  placeholder={t("newOrderBrandPh")}
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
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
              <div>
                <label className="field-label">{t("plate")} *</label>
                <input
                  className="input mono"
                  placeholder={t("newOrderPlatePh")}
                  value={form.plate}
                  onChange={(e) => set("plate", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">
                  {t("vin")} ({t("newOrderVinLen")})
                </label>
                <input
                  className="input mono"
                  placeholder={t("newOrderVinLen")}
                  value={form.vin}
                  onChange={(e) => set("vin", e.target.value)}
                />
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
          </section>

          <section id="sec-05" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">05</span> {t("newOrderSecContacts")}
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
              <div>
                <label className="field-label">{t("newOrderContactPickup")}</label>
                <input
                  className="input"
                  placeholder={t("newOrderContactPersonPh")}
                  value={form.cName1}
                  onChange={(e) => set("cName1", e.target.value)}
                />
                <input
                  className="input mono"
                  style={{ marginTop: 10 }}
                  placeholder={t("newOrderPhonePh")}
                  value={form.cPhone1}
                  onChange={(e) => set("cPhone1", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">{t("newOrderContactDelivery")}</label>
                <input
                  className="input"
                  placeholder={t("newOrderContactPersonPh")}
                  value={form.cName2}
                  onChange={(e) => set("cName2", e.target.value)}
                />
                <input
                  className="input mono"
                  style={{ marginTop: 10 }}
                  placeholder={t("newOrderPhonePh")}
                  value={form.cPhone2}
                  onChange={(e) => set("cPhone2", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section id="sec-06" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">06</span> {t("newOrderSecPartnerOffer")}
              </h3>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">{t("newOrderPartnerOfferEur")}</label>
              <input
                className="input mono"
                style={{ maxWidth: 200, fontSize: 18, fontWeight: 700 }}
                placeholder={t("newOrderPartnerOfferPh")}
                value={form.driverCompensation}
                onChange={(e) => set("driverCompensation", e.target.value)}
              />
            </div>
          </section>

          <section id="sec-07" className="card" style={{ padding: 22 }}>
            <div
              className="sec-head"
              style={{ justifyContent: "space-between" }}
            >
              <h3>
                <span className="num">07</span> {t("newOrderSecNotes")}
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
        </div>

        {/* Live preview */}
        <aside
          style={{
            position: "sticky",
            top: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div className="label">{t("newOrderLiveSummary")}</div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
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
                {t("newOrderTourLabel", { tour: "0848-26" })}
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
                      fontSize: 13,
                      marginTop: 2,
                      color: form.date ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {form.date || t("newOrderDatePreview")} ·{" "}
                    {form.from || t("newOrderTimePh")}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    {t("newOrderSecPartnerOffer")}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}
                  >
                    € {form.driverCompensation || t("newOrderPartnerOfferZero")}
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
      <h1
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 14 }}>{desc}</p>
      <div
        className="dash-area"
        style={{ marginTop: 24, padding: 50, textAlign: "center" }}
      >
        {t("adminStubBody")}
      </div>
    </div>
  );
};

const UsersPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
        {t("adminUsersDriversTitle")}
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        {t("adminUsersDescLong")}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 18,
          marginTop: 22,
        }}
      >
        <section className="card" style={{ padding: 18 }}>
          <div className="sec-head">
            <h3>{t("adminUsersSectionPartners")}</h3>
            <button
              className="btn xs primary"
              onClick={() =>
                showToast?.(
                  t("adminUsersToastNewDriverTitle"),
                  t("adminUsersToastNewDriverSub"),
                )
              }
            >
              <Ic.Plus /> {t("adminUsersNewDriver")}
            </button>
          </div>
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>{t("adminUsersColName")}</th>
                <th>{t("adminUsersColPartnerId")}</th>
                <th>{t("adminUsersColStatus")}</th>
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
                  <td className="mono">{d.partnerId}</td>
                  <td>
                    <Pill
                      status={d.status === "Active" ? "accepted" : "cancelled"}
                    >
                      {d.status}
                    </Pill>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="btn xs"
                        onClick={() => {
                          store.setDriverStatus(
                            d.id,
                            d.status === "Active" ? "Blocked" : "Active",
                          );
                          showToast?.(
                            t("adminUsersToastDriverChanged"),
                            d.name,
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
                            store.setDriverStatus(d.id, st);
                            showToast?.(t("adminUsersToastDriverChanged"), st);
                          }}
                        >
                          {st}
                        </button>
                      ))}
                      <button
                        className="btn xs"
                        onClick={() => {
                          store.resetPassword("driver", d.id);
                          showToast?.(t("adminUsersToastPwDriver"), d.name);
                        }}
                      >
                        {t("adminUsersResetPw")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card" style={{ padding: 18 }}>
          <div className="sec-head">
            <h3>{t("adminUsersSectionAdmins")}</h3>
            <button
              className="btn xs primary"
              onClick={() =>
                showToast?.(
                  t("adminUsersToastNewAdminTitle"),
                  t("adminUsersToastNewAdminSub"),
                )
              }
            >
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
                    {a.role} · {a.email}
                  </div>
                </div>
                <Pill status="accepted">{a.status}</Pill>
              </div>
              <button
                className="btn xs"
                style={{ marginTop: 10 }}
                onClick={() => {
                  store.resetPassword("admin", a.id);
                  showToast?.(t("adminUsersToastPwAdmin"), a.name);
                }}
              >
                {t("adminUsersTriggerPwReset")}
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

const OrderingPartiesPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [name, setName] = useStateA("");
  return (
    <div id="orderingparties">
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
        {t("navOrderingParties") || "Ordering parties"}
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 18,
          marginTop: 22,
        }}
      >
        <section className="card" style={{ padding: 18 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("adminCustomersColCust")}</th>
                <th>{t("adminCustomersColContact")}</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {store.getOrderingParties().map((op) => (
                <tr key={op.id}>
                  <td>
                    <strong>{op.name}</strong>
                    <div className="label" style={{ fontSize: 9.5 }}>
                      {op.type || "—"}
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
                  <td className="mono" style={{ fontSize: 12 }}>
                    {op.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: "0 0 12px" }}>{t("adminCustomerAddTitle")}</h3>
          <label className="field-label">{t("adminUsersColName")}</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("adminPlaceholderCustName")}
          />
          <button
            className="btn primary block"
            style={{ marginTop: 12 }}
            disabled={!name.trim()}
            onClick={() => {
              store.addOrderingParty({ name: name.trim() });
              setName("");
              showToast?.(
                t("adminCustomersCreated"),
                t("adminCustomersCreatedSub"),
              );
            }}
          >
            {t("adminCustomerCreate")}
          </button>
        </section>
      </div>
    </div>
  );
};

const AddressesPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [label, setLabel] = useStateA("");
  const [city, setCity] = useStateA("");
  return (
    <div id="addresses">
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
        {t("navAddresses") || "Addresses"}
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 18,
          marginTop: 22,
        }}
      >
        <section className="card" style={{ padding: 18 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("address")}</th>
                <th>{t("adminColOrigin")}</th>
                <th>{t("adminCustomersColContact")}</th>
              </tr>
            </thead>
            <tbody>
              {store.getAddresses().map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.label}</strong>
                    <div className="label" style={{ fontSize: 9.5 }}>
                      {a.id}
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {[a.street, a.houseNumber].filter(Boolean).join(" ")}
                    <br />
                    {[a.postalCode, a.city].filter(Boolean).join(" ")}
                  </td>
                  <td>{a.contactPerson || a.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: "0 0 12px" }}>
            {t("adminAddressAddTitle") || "Add address"}
          </h3>
          <label className="field-label">{t("address")}</label>
          <input
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <label className="field-label" style={{ marginTop: 10 }}>
            City
          </label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button
            type="button"
            className="btn primary block"
            style={{ marginTop: 12 }}
            disabled={!label.trim()}
            onClick={() => {
              store.addAddress({ label: label.trim(), city: city.trim() });
              setLabel("");
              setCity("");
              showToast?.(t("adminAddressCreated") || "Address created");
            }}
          >
            {t("adminCustomerCreate")}
          </button>
        </section>
      </div>
    </div>
  );
};

const DocumentsPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
        {t("navDocuments")}
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        {t("adminDocumentsPaneDesc")}
      </p>
      <table className="tbl" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>{t("adminDocumentsColDoc")}</th>
            <th>{t("adminDocumentsColCat")}</th>
            <th>{t("adminDocumentsColScope")}</th>
            <th>{t("adminDocumentsColVer")}</th>
            <th>{t("adminDocumentsColVis")}</th>
            <th>{t("adminDocumentsColAct")}</th>
          </tr>
        </thead>
        <tbody>
          {store.getDocuments().map((d) => (
            <tr key={d.id}>
              <td>
                <strong>{d.title}</strong>
                <div className="label" style={{ fontSize: 9.5 }}>
                  {t("adminDocumentUpdated", { at: d.updatedAt })}
                </div>
              </td>
              <td>{d.category}</td>
              <td>{d.scope}</td>
              <td className="mono">{d.version}</td>
              <td>
                <Pill status={d.visible ? "accepted" : "cancelled"}>
                  {d.visible ? t("adminDocsShown") : t("adminDocsHidden")}
                </Pill>
              </td>
              <td>
                <button
                  className="btn xs"
                  onClick={() => {
                    store.replaceDocument(d.id);
                    showToast?.(t("adminDocumentsReplaced"), d.title);
                  }}
                >
                  {t("adminDocReplace")}
                </button>
                <button
                  className="btn xs"
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    store.toggleDocument(d.id);
                    showToast?.(t("adminDocumentsVisUp"), d.title);
                  }}
                >
                  {d.visible ? t("adminDocHide") : t("adminDocShow")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PartnerInvoicesPane = ({
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
  const [regFile, setRegFile] = useStateA(null);
  const regFileRef = useRefA(null);
  const editFileRef = useRefA(null);
  const [regNotes, setRegNotes] = useStateA("");
  const [registerOpen, setRegisterOpen] = useStateA(false);
  const invoiceFileAccept =
    "application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif";
  const [selected, setSelected] = useStateA(() => new Set());
  const uploads = store.getTourDocuments();
  const jobs = store.getJobs();
  const drivers = store.getDrivers();
  const filterJob = filterJobId ? jobs.find((j) => j.id === filterJobId) : null;
  const visibleUploads = filterJobId
    ? uploads.filter((u) => u.jobId === filterJobId)
    : uploads;
  const viewing = viewId ? uploads.find((u) => u.id === viewId) : null;
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
    u.source === "admin" ? t("adminInvoiceSourceAdmin") : t("adminInvoiceSourceDriver");

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reviewPillStatus = (st) => {
    if (st === "accepted") return "accepted";
    if (st === "rejected") return "cancelled";
    return "assigned";
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
    return t("adminInvoiceErrGeneric");
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

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
        {t("navPartnerInvoices")}
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        {t("partnerInvoicesDesc")}
      </p>

      {filterJobId && filterJob && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="chip on billing-filter-chip"
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
        style={{
          marginTop: 18,
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
            const names = uploads
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
          <Ic.Plus /> {t("adminInvoiceRegisterTitle")}
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
              {t("adminInvoiceRegisterTitle")}
            </h2>
            <p
              className="label"
              style={{ margin: "0 0 16px", fontSize: 12.5, lineHeight: 1.55 }}
            >
              {t("adminInvoiceRegisterHint")}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
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
                  {t("adminInvoiceSelectPartner")}
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
                    documentType: "partner_invoice",
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
            <th>{t("invoiceColPartner")}</th>
            <th>{t("invoiceColJob")}</th>
            <th>{t("invoiceColUploaded")}</th>
            <th>{t("adminInvoiceColSource")}</th>
            <th>{t("invoiceColProcessed")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleUploads.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="label"
                style={{ padding: "22px 12px" }}
              >
                {t("invoiceUploadEmpty")}
              </td>
            </tr>
          ) : (
            visibleUploads.map((u) => (
              <tr
                key={u.id}
                className={u.reviewStatus === "accepted" ? "st-accepted-bg" : undefined}
              >
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
                    {u.reviewStatus || "—"}
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
                  <button
                    type="button"
                    className="btn xs primary"
                    style={{ marginLeft: 6 }}
                    onClick={() => {
                      store.updateTourDocument(u.id, { reviewStatus: "accepted" });
                      showToast?.(t("adminDocAccepted") || "Accepted", u.fileName);
                    }}
                  >
                    {t("adminDocAccept") || "Accept"}
                  </button>
                  <button
                    type="button"
                    className="btn xs danger"
                    style={{ marginLeft: 6 }}
                    onClick={() => {
                      const reason = window.prompt(
                        t("adminRejectNotePlaceholder"),
                        "",
                      );
                      if (reason == null) return;
                      store.rejectTourDocument(u.id, reason);
                      showToast?.(t("adminDocRejected") || "Rejected", u.fileName);
                    }}
                  >
                    {t("adminDocReject") || "Reject"}
                  </button>
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
                </td>
              </tr>
            ))
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
                  {t("adminInvoiceSelectPartner")}
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
                `${t("adminInvoiceMetaPartner")} ${viewing.driverName}`,
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
  onOpenPartnerInvoices,
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
      Unpaid: "adminPaymentOptUnpaid",
      Paid: "adminPaymentOptPaid",
    };
    const key = m[code];
    return key ? t(key) : code || t("adminPaymentOptUnpaid");
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
      driverCompensation: j.driverCompensation ?? "",
      expenses: j.expenses ?? "",
      netAmount: j.netAmount ?? "",
      grossAmount: j.grossAmount ?? "",
      vatRate: j.vatRate ?? 19,
      paymentStatus: j.paymentStatus || "Unpaid",
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
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
        {t("adminFinanceTrackingTitle")}
      </h1>
      <div className="statgrid" style={{ marginTop: 22 }}>
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
            <th>{t("adminFinanceColPartnerOffer")}</th>
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
                <td>€ {Number(j.driverCompensation || 0).toFixed(2)}</td>
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
                  {t("partnerOffer")} (€)
                </label>
                <input
                  id="fe-dc"
                  className="input tnum"
                  value={finDraft.driverCompensation}
                  onChange={(e) =>
                    setFinDraft((p) => ({
                      ...p,
                      driverCompensation: e.target.value,
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
                    ["Unpaid", "adminPaymentOptUnpaid"],
                    ["Paid", "adminPaymentOptPaid"],
                  ].map(([val, key]) => (
                    <option key={val} value={val}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {onOpenPartnerInvoices && (
              <button
                type="button"
                className="btn xs"
                style={{ marginTop: 14 }}
                onClick={() => {
                  closeFinEdit();
                  onOpenPartnerInvoices(finEditId);
                }}
              >
                {t("adminFinanceOpenPartnerInvoicesLink")}
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
                    driverCompensation: toN(finDraft.driverCompensation),
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
                  } else if (r.reason === "use_partner_invoices") {
                    showToast?.(t("adminFinanceErrUsePartnerInvoices"));
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
          {t("navAuditLog")}
        </h1>
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
      <table className="tbl" style={{ marginTop: 18 }}>
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
  documentsModule: {
    label: "adminFeatureDocumentsLabel",
    desc: "adminFeatureDocumentsDesc",
  },
  financeModule: {
    label: "adminFeatureFinanceLabel",
    desc: "adminFeatureFinanceDesc",
  },
  notificationPreferences: {
    label: "adminFeatureNotifLabel",
    desc: "adminFeatureNotifDesc",
  },
};

const FeaturesPane = () => {
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
      <h1
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {t("adminSettingsTitle")}
      </h1>

      <section className="card" style={{ padding: 22, marginTop: 22 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
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

      <h2
        style={{
          margin: "28px 0 0",
          fontSize: 17,
          fontWeight: 700,
        }}
      >
        {t("adminFeatureFlags")}
      </h2>
      <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
        {t("adminFeatureFlagsBlurb")}
      </p>
      <section className="card" style={{ padding: "0 18px", marginTop: 14 }}>
        {Object.entries(flags).map(([key, enabled]) => {
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
  AdminDetail,
  AdminDetailFooter,
  NewOrder,
  NewOrderFooter,
  Stub,
  UsersPane,
  OrderingPartiesPane,
  AddressesPane,
  DocumentsPane,
  PartnerInvoicesPane,
  FinancePane,
  AuditPane,
  FeaturesPane,
});
