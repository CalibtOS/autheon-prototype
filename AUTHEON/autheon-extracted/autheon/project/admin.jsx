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
  const invCount = store.getInvoiceUploads().length;
  const items = [
    { id: "overview", label: t("navJobs"), count: total, I: Ic.N.Tour },
    { id: "new", label: t("navNewJob"), count: null, I: Ic.N.Plus },
    { id: "users", label: t("navUsers"), count: null, I: Ic.N.Users },
    {
      id: "customers",
      label: t("navCustomers"),
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
    { id: "finance", label: t("navFinance"), count: null, I: Ic.N.Audit },
    { id: "audit", label: t("navAuditLog"), count: null, I: Ic.N.Audit },
    { id: "features", label: t("navFeatures"), count: null, I: Ic.N.Settings },
  ];
  return (
    <aside className="admin-nav">
      <div className="nav-head">
        <div className="nav-eyebrow">{t("adminConsole")}</div>
        <div className="nav-brand">
          <span className="mark"></span> AUTHEON
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
  const [returnsOnly, setReturnsOnly] = useStateA(false);
  const [density, setDensity] = useStateA("comfort");
  const [filtersOpen, setFiltersOpen] = useStateA(false);
  const counts = store.countsByStatus();

  const all = store.getJobs();
  const filtered = all.filter((j) => {
    if (statusFilter && j.status !== statusFilter) return false;
    if (returnsOnly && !j.hasReturnRequest) return false;
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
    ["return_requested", t("returnRequested")],
    ["completed", AuthStore.statusLabel("completed")],
    ["cancelled", AuthStore.statusLabel("cancelled")],
  ];

  const statusLegendKeys = [
    "draft",
    "published",
    "assigned",
    "accepted",
    "return_requested",
    "completed",
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
        <span
          className={"chip " + (returnsOnly ? "on" : "")}
          style={{ cursor: "pointer" }}
          onClick={() => setReturnsOnly(!returnsOnly)}
        >
          {t("returnRequested")}
        </span>
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
              setReturnsOnly(false);
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
              <th>{t("adminColReturn")}</th>
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
                  {j.hasReturnRequest ? (
                    <Pill status="return_requested">{t("open")}</Pill>
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

const JobFinancePanel = ({ job }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const linkedInvoices = store.getInvoiceUploadsForJob(job.id);
  const fmt = (n) =>
    n == null || n === "" ? "—" : `€ ${Number(n).toFixed(2)}`;
  return (
    <section className="card" style={{ padding: 22 }}>
      <div className="sec-head">
        <h3>
          <span className="num">06</span>
          {t("navFinance")}
        </h3>
        <span className="label">{t("adminBadgePhase1")}</span>
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
          <div className="label">{t("financeRevenuePrice")}</div>
          <div style={{ fontWeight: 700, marginTop: 6 }} className="tnum">
            {fmt(job.revenue ?? job.price)}
          </div>
        </div>
        <div>
          <div className="label">{t("financeDriverComp")}</div>
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
            {fmt(job.grossAmount ?? job.price)}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginTop: 18,
        }}
      >
        <div>
          <label className="field-label" htmlFor={`pay-${job.id}`}>
            {t("paymentStatus")}
          </label>
          <select
            id={`pay-${job.id}`}
            className="input"
            value={job.paymentStatus || "Unpaid"}
            onChange={(e) =>
              store.updateFinancial(job.id, { paymentStatus: e.target.value })
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
        <div>
          <label className="field-label" htmlFor={`inv-${job.id}`}>
            {t("invoiceNumber")}
          </label>
          <input
            id={`inv-${job.id}`}
            className="input mono"
            defaultValue={job.invoiceNumber || ""}
            onBlur={(e) =>
              store.updateFinancial(job.id, { invoiceNumber: e.target.value })
            }
          />
        </div>
      </div>
      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginTop: 14,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={!!job.invoiceReceived}
          onChange={(e) =>
            store.updateFinancial(job.id, { invoiceReceived: e.target.checked })
          }
        />
        <span className="label" style={{ margin: 0 }}>
          {t("invoiceReceived")}
        </span>
      </label>
      <div style={{ marginTop: 16 }}>
        <div className="label">{t("financePartnerUploadSection")}</div>
        {linkedInvoices.length === 0 ? (
          <div
            className="label"
            style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.45 }}
          >
            {t("financePartnerUploadNone")}
          </div>
        ) : (
          <ul
            style={{
              margin: "8px 0 0",
              paddingLeft: 18,
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            {linkedInvoices.map((u) => (
              <li key={u.id}>
                <span className="mono" style={{ fontSize: 12 }}>
                  {u.invoiceId || "—"}
                </span>
                <span style={{ color: "var(--muted)" }}> · {u.fileName}</span>
                {u.processed && (
                  <span className="label" style={{ marginLeft: 6 }}>
                    {t("invoiceColProcessed")}
                  </span>
                )}
              </li>
            ))}
          </ul>
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

const ReturnDecisionPanel = ({ job }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [rejectNote, setRejectNote] = useStateA("");
  if (job.status !== "return_requested") return null;
  return (
    <section className="card" style={{ padding: 22, borderColor: "#c4b5fd" }}>
      <div className="sec-head">
        <h3>
          <span className="num">07</span>
          {t("returnRequested")}
        </h3>
        <Pill status="return_requested" />
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.55 }}>
        <strong>{job.driver}</strong> ·{" "}
        {(() => {
          const rr = job.returnReason;
          const map = {
            return: t("returnReasonFormal"),
            pickup: t("returnReasonPickupBlocked"),
            accident: t("returnReasonIncident"),
          };
          return rr ? map[rr] || rr : "—";
        })()}
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
        {job.returnMessage || "—"}
      </div>
      <div
        style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="btn primary"
          onClick={() => store.approveReturn(job.id)}
        >
          {t("returnApproveToStatus", {
            status: AuthStore.statusLabel("draft"),
          })}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => store.rejectReturn(job.id, rejectNote)}
        >
          {t("returnRejectKeep")}
        </button>
      </div>
      <label
        className="field-label"
        style={{ marginTop: 14 }}
        htmlFor={`rej-${job.id}`}
      >
        {t("returnDecisionNotes")}
      </label>
      <textarea
        id={`rej-${job.id}`}
        className="input"
        placeholder={t("adminRejectNotePlaceholder")}
        value={rejectNote}
        onChange={(e) => setRejectNote(e.target.value)}
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
}) => {
  const { t } = useI18n();
  useAuthStore();
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
            {job.hasReturnRequest && (
              <Pill status="return_requested">{t("returnPending")}</Pill>
            )}
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
          <div className="label">{t("payout")}</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginTop: 4,
              letterSpacing: "-0.02em",
            }}
            className="tnum"
          >
            € {job.price.toFixed(2)}
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

          <JobFinancePanel job={job} />
          <ReturnDecisionPanel job={job} />
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

const AdminDetailFooter = ({ job, onPublish, onAssign, onEdit, onCancel }) => {
  const { t } = useI18n();
  return (
    <>
      <span className="label">
        {t("adminActionsStatus", {
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
          </>
        )}
        {job.status === "published" && (
          <span
            className="label"
            style={{ maxWidth: 520, textAlign: "right", lineHeight: 1.5 }}
          >
            {t("adminPhase1PublishedNoAssign")}
          </span>
        )}
        {(job.status === "accepted" ||
          job.status === "assigned" ||
          job.status === "return_requested") && (
          <button type="button" className="btn danger" onClick={onCancel}>
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
const NewOrder = ({ onCancel, onSaveDraft, onPublish, onFormChange }) => {
  const store = useAuthStore();
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
    price: "",
    notes: "",
    notesDriver: "",
    axle: "Eigenachse",
  });
  const [activeSec, setActiveSec] = useStateA("01");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const prefillCustomer = () => {
    const c = store.getCustomers()[0];
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
    "price",
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
    ["01", "Kunde"],
    ["02", "Route"],
    ["03", "Termin"],
    ["04", "Fahrzeug"],
    ["05", "Kontakte"],
    ["06", "Vergütung"],
    ["07", "Notizen"],
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
          <div className="label">Neuer Fahrauftrag</div>
          <h1
            style={{
              margin: "6px 0 0",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Neuer Auftrag
          </h1>
        </div>
        <div
          className="card"
          style={{ padding: "10px 16px", textAlign: "right" }}
        >
          <div className="label">Tour-Nr</div>
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
            Form-Abschnitte
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
                <span className="num">01</span> Kunde / Auftraggeber
              </h3>
              <span className="label">Pre-fill aus Master-Daten</span>
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
                <label className="field-label">Kunde auswählen *</label>
                <input
                  className="input"
                  placeholder="Kunde suchen oder aus Liste wählen…"
                  value={form.customer}
                  onChange={(e) => set("customer", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Oder neu anlegen</label>
                <button
                  type="button"
                  className="btn block"
                  style={{ padding: "10px 12px" }}
                  onClick={prefillCustomer}
                >
                  <Ic.Plus /> Aus Master-Daten
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
                  ⓘ Noch kein Kunde gewählt.
                </strong>{" "}
                Adressen, Kontakte und Notizen werden nach Auswahl automatisch
                vorausgefüllt.
              </div>
            )}
          </section>

          <section id="sec-02" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">02</span> Route
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
                <label className="field-label">Startadresse *</label>
                <input
                  className="input"
                  placeholder="Straße + Nr"
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
                    placeholder="PLZ"
                    value={form.startPlz}
                    onChange={(e) => set("startPlz", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Stadt / Ort"
                    value={form.startCity}
                    onChange={(e) => set("startCity", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Zieladresse *</label>
                <input
                  className="input"
                  placeholder="Straße + Nr"
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
                    placeholder="PLZ"
                    value={form.endPlz}
                    onChange={(e) => set("endPlz", e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Stadt / Ort"
                    value={form.endCity}
                    onChange={(e) => set("endCity", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">Distanz (km)</label>
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
                <span className="num">03</span> Termin / Zeitfenster
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
                <label className="field-label">Datum *</label>
                <input
                  className="input mono"
                  placeholder="TT.MM.JJJJ"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Zeitfenster von</label>
                <input
                  className="input mono"
                  placeholder="—:—"
                  value={form.from}
                  onChange={(e) => set("from", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Zeitfenster bis</label>
                <input
                  className="input mono"
                  placeholder="—:—"
                  value={form.to}
                  onChange={(e) => set("to", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section id="sec-04" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">04</span> Fahrzeug
              </h3>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">Fahrzeugtyp *</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["SUV", "PKW", "Transporter", "LKW < 3,5t", "Oldtimer"].map(
                  (t) => (
                    <span
                      key={t}
                      className={"chip " + (form.vehicleType === t ? "on" : "")}
                      onClick={() => set("vehicleType", t)}
                    >
                      {t}
                    </span>
                  ),
                )}
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
                <label className="field-label">Marke</label>
                <input
                  className="input"
                  placeholder="z.B. Volkswagen"
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Modell</label>
                <input
                  className="input"
                  placeholder="z.B. Passat Variant"
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Kennzeichen *</label>
                <input
                  className="input mono"
                  placeholder="XX-XX 0000"
                  value={form.plate}
                  onChange={(e) => set("plate", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">FIN (17-stellig)</label>
                <input
                  className="input mono"
                  placeholder="17-stellig"
                  value={form.vin}
                  onChange={(e) => set("vin", e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">Achse</label>
              <div
                className="seg"
                style={{ display: "inline-grid", gridAutoFlow: "column" }}
              >
                {["Eigenachse", "Fremdachse"].map((a) => (
                  <button
                    key={a}
                    className={form.axle === a ? "on" : ""}
                    onClick={() => set("axle", a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section id="sec-05" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">05</span> Kontakte
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
                <label className="field-label">Kontakt · Übernahme</label>
                <input
                  className="input"
                  placeholder="Ansprechpartner"
                  value={form.cName1}
                  onChange={(e) => set("cName1", e.target.value)}
                />
                <input
                  className="input mono"
                  style={{ marginTop: 10 }}
                  placeholder="+49 …"
                  value={form.cPhone1}
                  onChange={(e) => set("cPhone1", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Kontakt · Übergabe</label>
                <input
                  className="input"
                  placeholder="Ansprechpartner"
                  value={form.cName2}
                  onChange={(e) => set("cName2", e.target.value)}
                />
                <input
                  className="input mono"
                  style={{ marginTop: 10 }}
                  placeholder="+49 …"
                  value={form.cPhone2}
                  onChange={(e) => set("cPhone2", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section id="sec-06" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">06</span> Vergütung
              </h3>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">Preis (EUR) *</label>
              <input
                className="input mono"
                style={{ maxWidth: 200, fontSize: 18, fontWeight: 700 }}
                placeholder="0,00 €"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </div>
          </section>

          <section id="sec-07" className="card" style={{ padding: 22 }}>
            <div
              className="sec-head"
              style={{ justifyContent: "space-between" }}
            >
              <h3>
                <span className="num">07</span> Notizen
              </h3>
              <button
                type="button"
                className="btn ghost xs"
                onClick={() =>
                  set(
                    "notes",
                    "Standard: Bitte Fahrzeug vor Fahrtantritt prüfen, Schäden dokumentieren und Verzögerungen sofort an AUTHEON melden.",
                  )
                }
              >
                + Standard-Formulierung
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">Freitext</label>
              <textarea
                className="input"
                placeholder="Hinweise für den Fahrer…"
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
          <div className="label">Live-Zusammenfassung</div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              Auftrag-Vorschau
            </div>
            <div
              style={{
                padding: 14,
                border: "1px dashed var(--line-2)",
                borderRadius: "var(--r-2)",
                background: "var(--paper-2)",
              }}
            >
              <div className="label">Tour 0848-26</div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    Kunde
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      marginTop: 2,
                      color: form.customer ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {form.customer || "— noch nicht gewählt —"}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    Route
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 13,
                      marginTop: 2,
                      color: form.startPlz ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {form.startPlz || "PLZ"} → {form.endPlz || "PLZ"}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    Termin
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 13,
                      marginTop: 2,
                      color: form.date ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {form.date || "TT.MM."} · {form.from || "—:—"}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ fontSize: 9.5 }}>
                    Vergütung
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}
                  >
                    € {form.price || "0,00"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="label">Validierung</div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {total - filled} Pflichtfelder offen
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
                {filled} / {total} KOMPLETT
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
                      <button
                        className="btn xs"
                        onClick={() => {
                          store.setDriverStatus(d.id, "Deactivated");
                          showToast?.(t("adminUsersToastDriverOff"), d.name);
                        }}
                      >
                        {t("adminUsersDeactivate")}
                      </button>
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

const CustomersPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [name, setName] = useStateA("");
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
        {t("adminCustomerMasterTitle")}
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
                <th>{t("adminCustomersColPickup")}</th>
                <th>{t("adminCustomersColDeliv")}</th>
                <th>{t("adminCustomersColContact")}</th>
              </tr>
            </thead>
            <tbody>
              {store.getCustomers().map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <div className="label" style={{ fontSize: 9.5 }}>
                      {c.type}
                    </div>
                  </td>
                  <td>{c.pickup}</td>
                  <td>{c.delivery}</td>
                  <td>
                    {c.contact}
                    <div
                      className="mono"
                      style={{ fontSize: 11, color: "var(--muted)" }}
                    >
                      {c.phone}
                    </div>
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
              store.addCustomer({
                name,
                type: "Demo customer",
                pickup: "Reusable pickup address",
                delivery: "Reusable delivery address",
                contact: "New contact",
                phone: "+49 ...",
                instructions: "Prefill-ready instructions",
              });
              setName("");
              showToast?.(
                t("adminCustomersCreated"),
                t("adminCustomersCreatedSub"),
              );
            }}
          >
            {t("adminCustomerCreate")}
          </button>
          <div
            className="dash-area"
            style={{
              marginTop: 14,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              letterSpacing: 0,
            }}
          >
            {t("adminHistoricalPdfNote")}
          </div>
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

const PartnerInvoicesPane = ({ showToast }) => {
  const store = useAuthStore();
  const { t, locale } = useI18n();
  const [viewId, setViewId] = useStateA(null);
  const uploads = store.getInvoiceUploads();
  const jobs = store.getJobs();
  const viewing = viewId ? uploads.find((u) => u.id === viewId) : null;
  const fmtIso = (iso) => {
    try {
      return new Date(iso).toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
        {t("navPartnerInvoices")}
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        {t("partnerInvoicesDesc")}
      </p>
      <table className="tbl" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>{t("invoiceColFile")}</th>
            <th>{t("invoiceIdLabel")}</th>
            <th>{t("invoiceColPartner")}</th>
            <th>{t("invoiceColJob")}</th>
            <th>{t("invoiceColUploaded")}</th>
            <th>{t("invoiceColProcessed")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {uploads.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="label"
                style={{ padding: "22px 12px" }}
              >
                {t("invoiceUploadEmpty")}
              </td>
            </tr>
          ) : (
            uploads.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong className="mono" style={{ fontSize: 13 }}>
                    {u.fileName}
                  </strong>
                  <div className="label" style={{ fontSize: 10.5 }}>
                    {u.mimeType}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {u.invoiceId || "—"}
                </td>
                <td>{u.driverName}</td>
                <td style={{ minWidth: 220 }}>
                  {u.jobId ? (
                    (() => {
                      const j = jobs.find((x) => x.id === u.jobId);
                      return j ? (
                        <span style={{ fontSize: 13 }}>
                          {j.tour} · {j.customer}
                        </span>
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
                <td>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!u.processed}
                      onChange={(e) =>
                        store.updateInvoiceUpload(u.id, {
                          processed: e.target.checked,
                        })
                      }
                    />
                    <span className="label" style={{ margin: 0 }}>
                      {t("invoiceColProcessed")}
                    </span>
                  </label>
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
                    className="btn xs"
                    style={{ marginLeft: 6 }}
                    onClick={() => {
                      AuthStore.downloadInvoicePlaceholder(u.id);
                      showToast?.(t("invoiceDownload"), u.fileName);
                    }}
                  >
                    {t("invoiceDownload")}
                  </button>
                  <button
                    type="button"
                    className="btn xs danger"
                    style={{ marginLeft: 6 }}
                    onClick={() => {
                      if (window.confirm(t("invoiceDeleteConfirm"))) {
                        store.deleteInvoiceUpload(u.id);
                        if (viewId === u.id) setViewId(null);
                        showToast?.(t("invoiceDelete"), u.fileName);
                      }
                    }}
                  >
                    {t("invoiceDelete")}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

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
                `${t("invoiceIdLabel")}: ${viewing.invoiceId || "—"}`,
                `${t("adminInvoiceMetaFile")} ${viewing.fileName}`,
                `${t("adminInvoiceMetaMime")} ${viewing.mimeType}`,
                `${t("adminInvoiceMetaPartner")} ${viewing.driverName}`,
                `${t("adminInvoiceMetaJob")} ${
                  viewing.jobId || t("adminInvoiceJobNone")
                }`,
                `${t("adminInvoiceMetaUploaded")} ${viewing.uploadedAt}`,
                `${t("adminInvoiceMetaProcessed")} ${
                  viewing.processed
                    ? t("adminInvoiceMetaYes")
                    : t("adminInvoiceMetaNo")
                }`,
                `${t("adminInvoiceMetaSize")} ${viewing.sizeBytes} ${t(
                  "adminInvoiceBytesUnit",
                )}`,
              ].join("\n")}
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

const FinancePane = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const jobs = store.getJobs();
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
  const totalRevenue = jobs.reduce(
    (s, j) => s + Number(j.revenue || j.price || 0),
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
            <th>{t("adminFinanceColDrvComp")}</th>
            <th>{t("financeExpenses")}</th>
            <th>{t("adminFinanceColInv")}</th>
            <th>{t("adminFinanceColPay")}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
              <tr key={j.id}>
                <td className="mono">{j.tour}</td>
                <td>{j.customer}</td>
                <td>€ {Number(j.revenue || j.price || 0).toFixed(2)}</td>
                <td>€ {Number(j.driverCompensation || 0).toFixed(2)}</td>
                <td>€ {Number(j.expenses || 0).toFixed(2)}</td>
                <td>
                  {j.invoiceReceived
                    ? t("adminFinanceRecvShort")
                    : t("adminFinanceMissingShort")}
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--muted)" }}
                  >
                    {j.invoiceNumber || t("adminFinanceNoInvNum")}
                  </div>
                </td>
                <td>
                  <Pill
                    status={
                      j.paymentStatus === "Paid" ? "completed" : "assigned"
                    }
                  >
                    {paymentLabel(j.paymentStatus)}
                  </Pill>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

const AuditPane = () => {
  const store = useAuthStore();
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Audit log</h1>
      <table className="tbl" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Entity</th>
            <th>Metadata</th>
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

const FLAG_LABELS = {
  notificationPreferences: {
    label: "Notification preferences",
    desc: "Lets drivers configure push & email preferences from their profile tab.",
  },
};

const FeaturesPane = () => {
  const store = useAuthStore();
  const flags = store.getFeatureFlags();
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
        Feature flags
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
        Toggle features on/off. Changes are reflected immediately in the driver
        app.
      </p>
      <section className="card" style={{ padding: "0 18px", marginTop: 22 }}>
        {Object.entries(flags).map(([key, enabled]) => {
          const meta = FLAG_LABELS[key] || { label: key, desc: "" };
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
                  {meta.label}
                </div>
                {meta.desc && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 3,
                    }}
                  >
                    {meta.desc}
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
                  {enabled ? "ON" : "OFF"}
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
  CustomersPane,
  DocumentsPane,
  PartnerInvoicesPane,
  FinancePane,
  AuditPane,
  FeaturesPane,
});
