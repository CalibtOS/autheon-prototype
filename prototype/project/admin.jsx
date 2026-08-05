/* global React, ReactDOM, AuthStore, useAuthStore, Pill, Lbl, Ic, DriverUI */
const {
  useState: useStateA,
  useEffect: useEffectA,
  useLayoutEffect: useLayoutEffectA,
  useMemo: useMemoA,
  useRef: useRefA,
  useId: useIdA,
} = React;

// Client change plan Phase 5 #1: "accepted" (marketplace self-accept) is
// deliberately excluded — only direct-dispatch ("assigned") and empty-run
// review orders may be handed to a different service partner. The button is
// hidden entirely for accepted orders rather than shown-then-blocked.
const REASSIGNABLE_STATUSES = ["assigned", "empty_run_reported"];

// The console uses the SAME dialog primitive as the Driver PWA (driver-ui.jsx),
// so both surfaces inherit one dialog standard — outer rounding, spacing, the
// title/description/content hierarchy, and the canonical Cancel | Primary
// action grammar. Do not hand-roll a fixed backdrop + card for a new dialog.
const Dialog = (props) => <DriverUI.Dialog {...props} />;
const AccountAccessDialog = null;

const ADMIN_TOUR_DOC_TYPES = [
  "invoice",
  "fuel_receipt",
  "toll_receipt",
  "delivery_note",
  "waiting_time_evidence",
  "other_proof",
  "other_receipt",
];

// Client requirement (Phase 11): "missing" documents must be clearly
// recognizable, not just submitted/accepted/rejected ones. This prototype's
// data model has no per-tour "expected document types" concept, so the two
// most fundamentally expected artifacts (proof of delivery, billing invoice)
// are used as a reasonable default — flag if the client wants a
// per-customer or per-transport-type expected-document configuration.
const EXPECTED_TOUR_DOC_TYPES = ["delivery_note", "invoice"];

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
    }[code] ||
    code ||
    "—"
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

// Sidebar footer initials — the admin console's `initialsFromName`: up to two
// leading characters, "?" when there is nothing to derive them from.
const initialsFromName = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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
  // Footer identity — the console's exact shape: the name, falling back to the
  // email only when the name is blank, with the role line beneath. An email
  // change therefore produces no visible footer change; the Audit log is the
  // observable proof.
  const currentAdmin = store.getCurrentAdmin();
  const adminName = String(currentAdmin?.name || "").trim();
  const adminEmail = String(currentAdmin?.email || "").trim();
  const displayName = adminName || adminEmail || "—";
  const initials = initialsFromName(adminName || adminEmail);
  const items = [
    { id: "overview", label: t("navJobs"), count: total, I: Ic.N.Tour },
    {
      id: "notifications",
      label: t("adminNotificationFeed"),
      count: alertCount,
      I: Ic.N.Audit,
    },
    {
      id: "drivers",
      label: t("navDrivers"),
      count: mdrOpenCount || null,
      I: Ic.N.Users,
    },
    { id: "staff", label: t("navStaff"), count: null, I: Ic.N.Users },
    {
      id: "customercenter",
      label: t("navCustomerCenter") || "Customer Center",
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
        {/* Client change plan Phase 6: clicking the signed-in admin's own
            name/avatar opens their own profile — the Staff screen is the
            closest existing admin-account view (a dedicated single-profile
            page isn't part of Phase 8's scope either). */}
        <button
          type="button"
          className="btn ghost"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            padding: 0,
            border: "none",
            background: "none",
            textAlign: "left",
            cursor: "pointer",
          }}
          title={t("adminOwnProfileTitle")}
          onClick={() => setSection("staff")}
        >
          <span className="avatar">{initials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              {t("dispatcher")}
            </div>
          </div>
        </button>
        <button
          className="btn icon sm"
          title={t("adminLogoutTitle")}
          onClick={() => store.logoutAdmin()}
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
/**
 * Per-row action menu (client change plan Phase 4): unavailable actions are
 * HIDDEN, never shown-and-disabled. Cancel opens the same reason-code
 * cancellation dialog used in the detail view, inline at the row level.
 */
const RowActionsMenu = ({
  job,
  onOpen,
  onEdit,
  onDuplicate,
  onDeleteDraft,
  showToast,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [open, setOpen] = useStateA(false);
  const [cancelOpen, setCancelOpen] = useStateA(false);
  const [menuPos, setMenuPos] = useStateA(null);
  const btnRef = useRefA(null);
  const canEdit = store.canAdminEditOrder(job);
  const canCancel =
    store.canAdminEditOrder(job) ||
    ["accepted", "assigned", "empty_run_reported", "published"].includes(
      job.status,
    );
  const isDraft = job.status === "draft";

  // The row menu previously used `position: absolute` inside the table row,
  // but `.tbl` and `.table-wrap` both clip overflow — the dropdown got cut
  // off / visually merged with the row below it. Portaling into
  // document.body with viewport-fixed coordinates (computed from the
  // trigger button's own rect) escapes that clipping entirely.
  useLayoutEffectA(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({
        top: rect.bottom + 2,
        right: window.innerWidth - rect.right,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onClick={(e) => e.stopPropagation()}
    >
      {cancelOpen ? (
        <AdminCancelJobModal
          job={job}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => setCancelOpen(false)}
          showToast={showToast}
        />
      ) : null}
      <button
        ref={btnRef}
        type="button"
        className="btn icon sm"
        aria-label={t("adminRowActionsLabel")}
        onClick={() => setOpen((v) => !v)}
      >
        ⋮
      </button>
      {open && menuPos
        ? ReactDOM.createPortal(
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 300 }}
                onClick={() => setOpen(false)}
              />
              <ul
                role="menu"
                style={{
                  position: "fixed",
                  top: menuPos.top,
                  right: menuPos.right,
                  zIndex: 301,
                  margin: 0,
                  padding: 4,
                  listStyle: "none",
                  background: "var(--surface, #fff)",
                  border: "1px solid var(--border, #ccc)",
                  borderRadius: 8,
                  minWidth: 160,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                }}
              >
                <li>
                  <button
                    type="button"
                    className="btn ghost xs"
                    style={{ width: "100%", textAlign: "left" }}
                    onClick={() => {
                      setOpen(false);
                      onOpen(job);
                    }}
                  >
                    {t("adminRowActionOpen")}
                  </button>
                </li>
                {canEdit ? (
                  <li>
                    <button
                      type="button"
                      className="btn ghost xs"
                      style={{ width: "100%", textAlign: "left" }}
                      onClick={() => {
                        setOpen(false);
                        onEdit(job.id);
                      }}
                    >
                      {t("adminRowActionEdit")}
                    </button>
                  </li>
                ) : null}
                <li>
                  <button
                    type="button"
                    className="btn ghost xs"
                    style={{ width: "100%", textAlign: "left" }}
                    onClick={() => {
                      setOpen(false);
                      onDuplicate(job);
                    }}
                  >
                    {t("adminRowActionDuplicate")}
                  </button>
                </li>
                {canCancel ? (
                  <li>
                    <button
                      type="button"
                      className="btn ghost xs"
                      style={{ width: "100%", textAlign: "left" }}
                      onClick={() => {
                        setOpen(false);
                        setCancelOpen(true);
                      }}
                    >
                      {t("adminRowActionCancel")}
                    </button>
                  </li>
                ) : null}
                {isDraft ? (
                  <li>
                    <button
                      type="button"
                      className="btn ghost xs danger"
                      style={{ width: "100%", textAlign: "left" }}
                      onClick={() => {
                        setOpen(false);
                        onDeleteDraft(job);
                      }}
                    >
                      {t("adminRowActionDeleteDraft")}
                    </button>
                  </li>
                ) : null}
              </ul>
            </>,
            document.body,
          )
        : null}
    </div>
  );
};

const Overview = ({
  onOpen,
  freshId,
  page = 1,
  rows = 50,
  onFilteredCountChange,
  onEdit,
  onDuplicate,
  onDeleteDraft,
  showToast,
  // Client change plan Phase 6: filters/sort/density are now controlled by
  // the host (AdminApp) instead of local state, so they survive this
  // component unmounting when the admin navigates away and back — see
  // AUTHEON Prototype.html for the lifted state and scroll-position restore.
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange: setStatusFilter,
  density,
  onDensityChange: setDensity,
  sortDesc,
  onSortDescChange: setSortDesc,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const setSearch = onSearchChange;
  const [filtersOpen, setFiltersOpen] = useStateA(false);
  // Client requirement (Phase 4 #4/#5): structured filters beyond free-text
  // search — date range, customer, service partner, pickup/delivery
  // location — keyed on the planned pickup date, not job creation date.
  const [dateFrom, setDateFrom] = useStateA("");
  const [dateTo, setDateTo] = useStateA("");
  const [customerFilter, setCustomerFilter] = useStateA("");
  const [driverFilter, setDriverFilter] = useStateA("");
  const [pickupCityFilter, setPickupCityFilter] = useStateA("");
  const [deliveryCityFilter, setDeliveryCityFilter] = useStateA("");
  const counts = store.countsByStatus();

  const all = store.getJobs();
  const uniqueSorted = (arr) => [...new Set(arr.filter(Boolean))].sort();
  const customerOptions = uniqueSorted(all.map((j) => j.customer));
  const driverOptions = uniqueSorted(all.map((j) => j.driver));
  const structuredFiltersActive = !!(
    dateFrom ||
    dateTo ||
    customerFilter ||
    driverFilter ||
    pickupCityFilter ||
    deliveryCityFilter
  );
  const filtered = all.filter((j) => {
    // Umbrella match: e.g. the "Cancelled" tile catches cancelled_by_sp /
    // cancelled_by_autheon / empty_run_not_recognised; the "Empty run reported"
    // tile is the review bucket.
    if (statusFilter && store.statusUmbrella(j.status) !== statusFilter)
      return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(
        j.tour.toLowerCase().includes(q) ||
        j.customer.toLowerCase().includes(q) ||
        (j.driver || "").toLowerCase().includes(q) ||
        j.startCity.toLowerCase().includes(q) ||
        j.endCity.toLowerCase().includes(q) ||
        (j.vin || "").toLowerCase().includes(q) ||
        (j.plate || "").toLowerCase().includes(q)
      ))
        return false;
    }
    // Keyed on the job's planned pickup date, not job creation date, per the
    // client's explicit requirement. `pickup.dateLong` is "Weekday,
    // DD.MM.YYYY" — extract the DD.MM.YYYY portion for parsing.
    if (dateFrom || dateTo) {
      const m = String(j.pickup?.dateLong || "").match(/(\d{2}\.\d{2}\.\d{4})/);
      const iso = m ? AuthStore.ddmmyyyyToIso(m[1]) : null;
      if (!iso) return false;
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
    }
    if (customerFilter && j.customer !== customerFilter) return false;
    if (driverFilter && j.driver !== driverFilter) return false;
    if (
      pickupCityFilter &&
      !j.startCity.toLowerCase().includes(pickupCityFilter.toLowerCase())
    )
      return false;
    if (
      deliveryCityFilter &&
      !j.endCity.toLowerCase().includes(deliveryCityFilter.toLowerCase())
    )
      return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    sortDesc ? b.tour.localeCompare(a.tour) : a.tour.localeCompare(b.tour),
  );
  useEffectA(() => {
    onFilteredCountChange?.(sorted.length);
  }, [sorted.length]);
  const paged = sorted.slice((page - 1) * rows, page * rows);

  const stats = [
    ["draft", AuthStore.statusLabel("draft")],
    ["published", AuthStore.statusLabel("published")],
    ["assigned", AuthStore.statusLabel("assigned")],
    ["accepted", AuthStore.statusLabel("accepted")],
    ["empty_run_reported", AuthStore.statusLabel("empty_run_reported")],
    ["performed", AuthStore.statusLabel("performed")],
    ["cancelled", AuthStore.statusLabel("cancelled")],
  ];

  const statusLegendKeys = [
    "draft",
    "published",
    "assigned",
    "accepted",
    "empty_run_reported",
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
          className={
            "chip " + (filtersOpen || structuredFiltersActive ? "on" : "")
          }
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
            {t("adminFilterStatusPrefix")} {AuthStore.statusLabel(statusFilter)}{" "}
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
        <button
          type="button"
          className="label"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() => setSortDesc((v) => !v)}
        >
          <Ic.Sort /> {t("tourNo")} {sortDesc ? "↓" : "↑"}
        </button>
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
              setDateFrom("");
              setDateTo("");
              setCustomerFilter("");
              setDriverFilter("");
              setPickupCityFilter("");
              setDeliveryCityFilter("");
            }}
          >
            {t("adminReset")}
          </button>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 10,
              width: "100%",
              marginTop: 6,
              paddingTop: 10,
              borderTop: "1px solid var(--line)",
            }}
          >
            <div>
              <label className="field-label" htmlFor="ov-filter-date-from">
                {t("adminFilterPickupFrom")}
              </label>
              <input
                id="ov-filter-date-from"
                type="date"
                className="input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ov-filter-date-to">
                {t("adminFilterPickupTo")}
              </label>
              <input
                id="ov-filter-date-to"
                type="date"
                className="input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ov-filter-customer">
                {t("adminCustomersColCust")}
              </label>
              <select
                id="ov-filter-customer"
                className="input"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <option value="">{t("billingFilterAll")}</option>
                {customerOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="ov-filter-driver">
                {t("adminAuditFilterServicePartner")}
              </label>
              <select
                id="ov-filter-driver"
                className="input"
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
              >
                <option value="">{t("billingFilterAll")}</option>
                {driverOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="ov-filter-pickup-city">
                {t("adminFilterPickupLocation")}
              </label>
              <input
                id="ov-filter-pickup-city"
                className="input"
                value={pickupCityFilter}
                onChange={(e) => setPickupCityFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ov-filter-delivery-city">
                {t("adminFilterDeliveryLocation")}
              </label>
              <input
                id="ov-filter-delivery-city"
                className="input"
                value={deliveryCityFilter}
                onChange={(e) => setDeliveryCityFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className={`tbl ${density === "dense" ? "dense" : ""}`}>
          <thead>
            <tr>
              <th style={{ width: 96 }}>{t("adminColTour")}</th>
              <th>{t("adminColCustomer")}</th>
              <th>{t("adminColPlateOrVin")}</th>
              <th>{t("adminColOrigin")}</th>
              <th>{t("adminColDestination")}</th>
              <th>{t("adminColAppointment")}</th>
              <th>{t("adminColDriver")}</th>
              <th>{t("adminColStatusHeader")}</th>
              <th>{t("adminColDocuments") || "Documents"}</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((j, index) => (
              <tr
                key={j.id}
                className={
                  "row " +
                  (j.id === freshId ? "fresh" : "") +
                  (index < 4 ? " list-enter" : "")
                }
                style={index < 4 ? { ["--list-enter-i"]: index } : undefined}
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
                <td className="mono">
                  {j.plate
                    ? j.plate
                    : j.vin
                      ? `…${String(j.vin).slice(-6)}`
                      : "—"}
                </td>
                <td>{j.startCity || j.startPlz}</td>
                <td>{j.endCity || j.endPlz}</td>
                <td className="mono date" style={{ fontSize: 12 }}>
                  {AuthStore.formatJobScheduleShort(j, t("adminWindowFlex"))}
                </td>
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
                <td>
                  <RowActionsMenu
                    job={j}
                    onOpen={onOpen}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDeleteDraft={onDeleteDraft}
                    showToast={showToast}
                  />
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td
                  colSpan="10"
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

const OverviewFooter = ({
  filteredCount,
  totalCount,
  page,
  rows,
  onPageChange,
  onRowsChange,
}) => {
  const { t } = useI18n();
  const maxPage = Math.max(1, Math.ceil(filteredCount / rows));
  const setPage = onPageChange;
  const setRows = onRowsChange;
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

const JobFinancePanel = ({
  job,
  onOpenTourBilling,
  onOpenConsolidatedInvoice,
  showToast,
}) => {
  const { t, locale } = useI18n();
  const store = useAuthStore();
  const linkedInvoices = store
    .getTourDocumentsForJob(job.id)
    .filter((d) => d.reviewStatus !== "replaced");
  const consolidatedInvoice = store.getActiveInvoiceForJob(job.id);
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
  const [expandedDocId, setExpandedDocId] = useStateA(null);
  const [docActionKind, setDocActionKind] = useStateA(null);
  const [docActionReason, setDocActionReason] = useStateA("");
  const [docActionNote, setDocActionNote] = useStateA("");
  const [docActionVisible, setDocActionVisible] = useStateA(true);
  const [docAcceptInvNum, setDocAcceptInvNum] = useStateA("");
  const [docAcceptInvDate, setDocAcceptInvDate] = useStateA("");
  const resetDocAction = () => {
    setDocActionKind(null);
    setDocActionReason("");
    setDocActionNote("");
    setDocActionVisible(true);
    setDocAcceptInvNum("");
    setDocAcceptInvDate("");
  };
  const toggleExpanded = (id) => {
    setExpandedDocId((prev) => (prev === id ? null : id));
    resetDocAction();
  };
  const invoiceActionErr = (r) => {
    const reason = r?.reason;
    if (reason === "invoice_number_required")
      return t("adminInvoiceErrNumberRequired");
    return t("adminInvoiceErrGeneric");
  };
  const onAcceptClick = (doc) => {
    if (AuthStore.isTourBillingInvoiceType(doc.documentType)) {
      setDocActionKind("accept_invoice");
      return;
    }
    const r = store.acceptTourDocument(doc.id);
    if (r.ok) {
      showToast?.(t("adminDocAccepted"), doc.fileName);
      setExpandedDocId(null);
    } else showToast?.(invoiceActionErr(r));
  };
  const submitAcceptInvoice = (doc) => {
    const r = store.acceptTourDocument(doc.id, {
      supplierInvoiceNumber: docAcceptInvNum.trim(),
      supplierInvoiceDate: docAcceptInvDate.trim(),
    });
    if (r.ok) {
      showToast?.(t("adminDocAccepted"), doc.fileName);
      setExpandedDocId(null);
      resetDocAction();
    } else showToast?.(invoiceActionErr(r));
  };
  const submitDocAction = (doc) => {
    const reason = docActionReason.trim();
    if (!reason) return;
    const opts = {
      reason,
      internalNote: docActionNote.trim(),
      visibleToPartner: docActionVisible,
    };
    const r =
      docActionKind === "reject"
        ? store.rejectTourDocument(doc.id, opts)
        : store.requireTourDocumentCorrection(doc.id, opts);
    if (r.ok) {
      showToast?.(
        docActionKind === "reject"
          ? t("adminDocRejected") || "Rejected"
          : t("adminDocCorrectionRequired"),
        doc.fileName,
      );
      setExpandedDocId(null);
      resetDocAction();
    } else showToast?.(invoiceActionErr(r));
  };
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
    linkedInvoices.some(
      (u) => u.reviewStatus === "uploaded" || u.reviewStatus === "in_review",
    );
  const snapshotDocTypes = uniqueTourDocTypeLabels(linkedInvoices, t);
  const displayDocReviewStatus = (st) => {
    const code = AuthStore.normalizeTourDocumentReviewStatus(st);
    return (
      {
        uploaded: t("docReviewUploaded"),
        in_review: t("docReviewUnderReview"),
        accepted: t("docReviewAccepted"),
        rejected: t("docReviewRejected"),
        correction_required: t("docReviewCorrectionRequired"),
        replaced: t("docReviewReplaced"),
      }[code] ||
      code ||
      "—"
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
        <div>
          <div className="label">{t("ciTabLabel")}</div>
          {consolidatedInvoice ? (
            <>
              <div className="mono" style={{ marginTop: 8, fontWeight: 600 }}>
                {consolidatedInvoice.supplierInvoiceNumber}
              </div>
              <Pill
                status={
                  consolidatedInvoice.status === "completed"
                    ? "accepted"
                    : consolidatedInvoice.status === "rejected"
                      ? "cancelled"
                      : "assigned"
                }
                style={{ marginTop: 6 }}
              >
                {t(
                  CONSOLIDATED_INVOICE_STATUS_LABEL_KEY[
                    consolidatedInvoice.status
                  ] || consolidatedInvoice.status,
                )}
              </Pill>
              {onOpenConsolidatedInvoice && (
                <button
                  type="button"
                  className="btn xs"
                  style={{ marginTop: 8, display: "block" }}
                  onClick={onOpenConsolidatedInvoice}
                >
                  {t("adminOpenTourBillingBtn")}
                </button>
              )}
            </>
          ) : (
            <div style={{ marginTop: 8, fontSize: 13 }}>—</div>
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
              const expanded = expandedDocId === u.id;
              const actions = AuthStore.tourDocumentReviewActions(
                u.reviewStatus,
              );
              return (
                <React.Fragment key={u.id}>
                  <tr
                    onClick={() => toggleExpanded(u.id)}
                    style={{ cursor: "pointer" }}
                  >
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
                  {expanded && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          background: "var(--surface-2, #f7f7f9)",
                          padding: 14,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(150px, 1fr))",
                            gap: 10,
                            fontSize: 12.5,
                          }}
                        >
                          <div>
                            <div className="label">
                              {t("adminFinanceUploadColStatus")}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              {displayDocReviewStatus(u.reviewStatus)}
                            </div>
                          </div>
                          <div>
                            <div className="label">{sourceLabel(u)}</div>
                            <div style={{ marginTop: 4 }}>
                              {fmtIso(u.uploadedAt)}
                            </div>
                          </div>
                          {u.rejectionReason ? (
                            <div>
                              <div className="label">
                                {t("adminDocActionReasonLabel")}
                              </div>
                              <div style={{ marginTop: 4 }}>
                                {u.rejectionReason}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {docActionKind === "accept_invoice" ? (
                          <div
                            style={{
                              marginTop: 12,
                              display: "grid",
                              gap: 8,
                              maxWidth: 320,
                            }}
                          >
                            <input
                              className="input"
                              placeholder={t(
                                "adminSupplierInvoiceNumberPlaceholder",
                              )}
                              value={docAcceptInvNum}
                              onChange={(e) =>
                                setDocAcceptInvNum(e.target.value)
                              }
                            />
                            <input
                              type="date"
                              className="input"
                              value={docAcceptInvDate}
                              onChange={(e) =>
                                setDocAcceptInvDate(e.target.value)
                              }
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                className="btn xs"
                                onClick={resetDocAction}
                              >
                                {t("cancel")}
                              </button>
                              <button
                                type="button"
                                className="btn xs primary"
                                onClick={() => submitAcceptInvoice(u)}
                              >
                                {t("adminDocAccept") || t("accept")}
                              </button>
                            </div>
                          </div>
                        ) : docActionKind === "reject" ||
                          docActionKind === "correction" ? (
                          <div
                            style={{
                              marginTop: 12,
                              display: "grid",
                              gap: 8,
                              maxWidth: 420,
                            }}
                          >
                            <textarea
                              className="input"
                              rows={2}
                              placeholder={t("adminDocActionReasonLabel")}
                              value={docActionReason}
                              onChange={(e) =>
                                setDocActionReason(e.target.value)
                              }
                            />
                            <textarea
                              className="input"
                              rows={2}
                              placeholder={t("adminInternalNotePlaceholder")}
                              value={docActionNote}
                              onChange={(e) => setDocActionNote(e.target.value)}
                            />
                            <label
                              style={{
                                fontSize: 12.5,
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={docActionVisible}
                                onChange={(e) =>
                                  setDocActionVisible(e.target.checked)
                                }
                              />
                              {t("adminDocActionVisibleLabel")}
                            </label>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                className="btn xs"
                                onClick={resetDocAction}
                              >
                                {t("cancel")}
                              </button>
                              <button
                                type="button"
                                className="btn xs primary"
                                disabled={!docActionReason.trim()}
                                onClick={() => submitDocAction(u)}
                              >
                                {docActionKind === "reject"
                                  ? t("adminDocReject") || t("reject")
                                  : t("adminDocActionRequireCorrection")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              marginTop: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            {actions.canAccept && (
                              <button
                                type="button"
                                className="btn xs primary"
                                onClick={() => onAcceptClick(u)}
                              >
                                {t("adminDocAccept") || t("accept")}
                              </button>
                            )}
                            {actions.canRequireCorrection && (
                              <button
                                type="button"
                                className="btn xs"
                                onClick={() => setDocActionKind("correction")}
                              >
                                {t("adminDocActionRequireCorrection")}
                              </button>
                            )}
                            {actions.canReject && (
                              <button
                                type="button"
                                className="btn xs"
                                onClick={() => setDocActionKind("reject")}
                              >
                                {t("adminDocReject") || t("reject")}
                              </button>
                            )}
                            {onOpenTourBilling && (
                              <button
                                type="button"
                                className="btn xs"
                                onClick={onOpenTourBilling}
                              >
                                {t("adminFinanceReviewDocuments")}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

// Reason-id → localized label maps for the service-partner reports.
const EMPTY_RUN_REASON_KEY = {
  not_operational: "emptyRunReasonNotOperational",
  not_roadworthy: "emptyRunReasonNotRoadworthy",
  not_present: "emptyRunReasonNotPresent",
  not_released: "emptyRunReasonNotReleased",
  key_docs_missing: "emptyRunReasonKeyDocs",
  other: "emptyRunReasonOther",
};
const SP_CANCEL_REASON_KEY = {
  appointment_not_kept: "spCancelReasonAppointment",
  booked_accidentally: "spCancelReasonAccidental",
  org_not_possible: "spCancelReasonOrgImpossible",
  other: "spCancelReasonOther",
};

// ADMIN — Empty-run review (Storno-Workflow §4). Open review case for a
// reported empty run: exactly two decisions, no intermediate state. Also
// renders a read-only outcome summary once decided.
const EmptyRunReviewPanel = ({ job, showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const isPending = job.status === "empty_run_reported";
  const isTerminal = store.isEmptyRunTerminal(job.status);
  if (!isPending && !isTerminal) return null;
  const report = job.emptyRunReport || {};
  const reasonLabel = report.reason
    ? t(EMPTY_RUN_REASON_KEY[report.reason] || "emptyRunReasonOther")
    : "—";
  const decide = (decision) => {
    const r = store.reviewEmptyRun(job.id, decision);
    if (r && r.ok) {
      showToast?.(
        decision === "recognised"
          ? t("adminEmptyRunRecognisedToast")
          : t("adminEmptyRunNotRecognisedToast"),
        t("adminEmptyRunDecisionSub", { tour: job.tour }),
      );
    } else {
      showToast?.(t("adminToastUpdateFailed"), "");
    }
  };
  const evidence = report.evidence || [];
  return (
    <section className="card" style={{ padding: 22, borderColor: "#c4b5fd" }}>
      <div className="sec-head">
        <h3>
          <span className="num">07</span>
          {t("adminEmptyRunReviewTitle")}
        </h3>
        <Pill status={job.status} />
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.55 }}>
        <strong>{job.driver || "—"}</strong>
        {" · "}
        <span className="label" style={{ display: "inline" }}>
          {t("adminEmptyRunReasonLabel")}:
        </span>{" "}
        {reasonLabel}
      </p>
      {report.description || report.message ? (
        <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.55 }}>
          {report.description || report.message}
        </p>
      ) : null}
      {evidence.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>
            {t("adminEmptyRunEvidence")}: {evidence.length}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {evidence.map((ev, i) => {
              const canPreview = ev.isImage && ev.previewUrl;
              const sizeKb =
                ev.sizeBytes > 0
                  ? `${Math.max(1, Math.round(ev.sizeBytes / 1024))} KB`
                  : "";
              return canPreview ? (
                <a
                  key={ev.id || i}
                  href={ev.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`${ev.fileName}${sizeKb ? " · " + sizeKb : ""}`}
                  style={{
                    display: "block",
                    width: 84,
                    height: 84,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid var(--line)",
                    background: "var(--surface-2, #f4f4f5)",
                  }}
                >
                  <img
                    src={ev.previewUrl}
                    alt={ev.fileName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </a>
              ) : (
                <div
                  key={ev.id || i}
                  title={ev.fileName}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 2,
                    minWidth: 120,
                    maxWidth: 200,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ev.fileName}
                  </span>
                  <span className="label" style={{ margin: 0 }}>
                    {ev.mimeType || "file"}
                    {sizeKb ? " · " + sizeKb : ""}
                    {ev.isImage && !ev.previewUrl
                      ? " · " + t("adminEvidenceNoPreview")
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {isPending ? (
        <>
          <p className="label" style={{ marginTop: 14 }}>
            {t("adminEmptyRunReviewHint")}
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn primary"
              onClick={() => decide("recognised")}
            >
              {t("adminEmptyRunDecideRecognised")}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => decide("not_recognised")}
            >
              {t("adminEmptyRunDecideNotRecognised")}
            </button>
          </div>
        </>
      ) : (
        <div
          className="banner"
          style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5 }}
        >
          {AuthStore.statusLabel(job.status)}
          {report.decidedBy ? ` · ${report.decidedBy}` : ""}
          {report.decidedAt ? ` · ${report.decidedAt}` : ""}
        </div>
      )}
    </section>
  );
};

// ADMIN — Internal notes (Storno-Workflow §6). Admin-only, never shown in the
// service-partner frontend. Optional; each note auto-stamps author + time and
// stays permanently attached to the order.
const InternalNotesPanel = ({ job, showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [text, setText] = useStateA("");
  const notes = store.getInternalNotes(job.id);
  const add = () => {
    const r = store.addInternalNote(job.id, text);
    if (r && r.ok) {
      setText("");
      showToast?.(t("adminInternalNotesTitle"), "");
    }
  };
  return (
    <section className="card" style={{ padding: 22 }}>
      <div className="sec-head">
        <h3>{t("adminInternalNotesTitle")}</h3>
      </div>
      <p className="label" style={{ marginTop: 8 }}>
        {t("adminInternalNotesHint")}
      </p>
      <div className="stack-12" style={{ marginTop: 12 }}>
        {notes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            {t("adminInternalNotesEmpty")}
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {notes.map((n) => (
              <li
                key={n.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)",
                  padding: "10px 12px",
                }}
              >
                <div
                  className="mono"
                  style={{ fontSize: 12, color: "var(--muted)" }}
                >
                  {n.author} · {n.at}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.5 }}>
                  {n.text}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <textarea
        className="input"
        style={{ marginTop: 12, width: "100%" }}
        rows={2}
        value={text}
        placeholder={t("adminInternalNotePlaceholder")}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn"
          disabled={!text.trim()}
          onClick={add}
        >
          {t("adminInternalNoteAdd")}
        </button>
      </div>
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
  if (reason === "marketplace_accepted_not_reassignable")
    return t("reassignBlockedMarketplaceAccepted");
  if (reason === "driver_required") return t("adminAssignDriverRequired");
  if (reason === "driver_not_found") return t("adminAssignDriverNotFound");
  if (reason === "driver_not_active") return t("adminAssignDriverInactive");
  if (reason === "same_driver") return t("adminReassignSameDriver");
  return t("adminInvoiceErrGeneric");
};

const AssignDriverDialog = ({ open, mode, job, onClose, onConfirm }) => {
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
    <Dialog
      open
      onClose={onClose}
      titleId="assign-driver-title"
      title={title}
      description={hint}
      actions={
        <>
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
        </>
      }
    >
      <div className="mono dialog-meta">
        {t("tourNo")} {job.tour} · {job.customer}
      </div>
      {drivers.length === 0 ? (
        <p className="dialog-error">{t("adminAssignNoActiveDrivers")}</p>
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
            <p className="label dialog-hint">
              {t("adminAssignCurrentDriver", { name: job.driver })}
            </p>
          ) : null}
        </div>
      )}
      {mode !== "reassign" ? (
        <div>
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
          <p className="label dialog-hint">
            {t("adminAssignConfirmationNoteHint")}
          </p>
        </div>
      ) : null}
    </Dialog>
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
  const policy = job
    ? store.checkAdminCancelPolicy(job, { overrideNote })
    : { ok: true };
  const needsOverride =
    job && !policy.ok && policy.reason === "within_cancel_cutoff";

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
        showToast?.(t("adminCancelMessageTooShort", { min: r.min || minMsg }));
      else if (r.reason === "within_cancel_cutoff")
        showToast?.(t("adminCancelCutoffBlocked", { hours: r.minHours || 1 }));
      else showToast?.(t("cancellationBlocked"), t("cancellationRules"));
      return;
    }
    onConfirm?.(r);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      alertdialog
      title={t("adminCancelJobModalTitle")}
      description={
        dr
          ? t("adminCancelJobModalHintDriver")
          : t("adminCancelJobModalHintNoDriver")
      }
      actions={
        <>
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
        </>
      }
    >
      {needsOverride ? (
        <div className="banner banner-warn dialog-banner">
          {t("adminCancelCutoffBlocked", {
            hours: policy.minHours || 1,
          })}
        </div>
      ) : null}
      <div>
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
              {t(`cancellationReason_${c}`) ||
                store.getCancellationReasonLabel(c)}
            </option>
          ))}
        </select>
      </div>
      {dr ? (
        <div>
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
        <div>
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
    </Dialog>
  );
};

// ADMIN — Edit order (Storno-Workflow §7). Admins may change ALL eligible
// business data on any non-terminal order (draft, published, or already-booked)
// through the canonical Create/Edit Job form (`NewOrder`). For a booked order
// the save routes through store.updateOrderFromForm, which persists immediately,
// notifies the assigned partner with the actual changed values (no partner
// re-confirmation), audits previous → new per field, and preserves the
// operational status. There is no separate limited editor — a single form
// avoids drift with Job Creation.

// =========================================================================
// ADMIN — DETAIL
// =========================================================================
/**
 * Admin-side preview of a generated transport order.
 *
 * Renders the print-ready A4 document itself — same HTML the driver flow and
 * `tools/pdf/` use — inside a full-size same-origin frame, so Print can drive
 * the frame and produce the real PDF through Chromium.
 */
const AdminTransportOrderPreview = ({ preview, onClose }) => {
  const { t } = useI18n();
  if (!preview) return null;
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      eyebrow={`${t("transportOrderPdf")} · ${preview.documentVersion}`}
      title={preview.fileName}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {t("close")}
          </button>
          <button
            type="button"
            className="btn cta"
            onClick={() =>
              window.AutheonTransportOrderPdf?.printDocumentHtml(
                preview.previewHtml,
                preview.fileName,
              )
            }
          >
            <Ic.Down /> {t("download")}
          </button>
        </>
      }
    >
      <iframe
        className="admin-a4-preview"
        title={preview.fileName}
        srcDoc={preview.previewHtml}
      />
      <div
        className="label mono"
        style={{ marginTop: 10, overflowWrap: "anywhere" }}
      >
        {t("adminPdfChecksum")} {preview.checksumSha256}
      </div>
    </Dialog>
  );
};

const AdminDetail = ({
  job,
  onBack,
  onPublish,
  onRequestAssign,
  onRequestReassign,
  onCancelled,
  onEdit,
  onOpenTourBilling,
  onOpenConsolidatedInvoice,
  showToast,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [cancelOpen, setCancelOpen] = useStateA(false);
  // Transport-order PDF (Task 17): the active document drives the card, the
  // full immutable history drives the version list.
  const transportOrderDocs = store.getTransportOrderDocuments(job.id);
  const activeTransportOrderDoc = transportOrderDocs.find((d) => d.isActive) || null;
  const [pdfPreview, setPdfPreview] = useStateA(null);
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
          {job.replacesCancelledTour || job.replacedByTour ? (
            <div
              className="banner"
              style={{ marginBottom: 10, fontSize: 12.5 }}
            >
              {job.replacesCancelledTour
                ? t("adminReplacesCancelledTour", {
                    tour: job.replacesCancelledTour,
                  })
                : t("adminReplacedByTour", { tour: job.replacedByTour })}
            </div>
          ) : null}
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
            {job.distanceKm
              ? `${job.distanceKm} km`
              : t("distanceNotYetCalculated")}{" "}
            ·{" "}
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
            {displayTransportType(job.transportType, t)} ·{" "}
            {t("adminDriverOfferLumpSum")}
          </div>
        </div>
      </div>

      {store.isCancelledStatus(job.status) && job.cancellationActor ? (
        <div
          className="banner banner-warn"
          style={{ marginBottom: 18, fontSize: 13, lineHeight: 1.55 }}
        >
          {t("cancellationActor")}:{" "}
          {job.cancellationActor === "driver" ||
          job.cancellationActor === "service_partner"
            ? t("cancellationActorDriver")
            : job.cancellationActor === "customer"
              ? t("cancellationActorCustomer")
              : t("cancellationActorAdmin")}
          {job.spCancellation?.reason
            ? ` · ${t(SP_CANCEL_REASON_KEY[job.spCancellation.reason] || "spCancelReasonOther")}`
            : ""}
          {job.cancellationReasonText ? ` — ${job.cancellationReasonText}` : ""}
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
                  {job.distanceKm ? (
                    <>
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
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 400,
                        color: "var(--muted)",
                      }}
                    >
                      {t("distanceNotYetCalculated")}
                    </span>
                  )}
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
                  {displayVehicleTypeAdmin(job.vehicleType, t)}
                </div>
              </div>
              <div>
                <div className="label">{t("details")}</div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>
                  {[job.manufacturer, job.vehicleModel]
                    .filter((v) => v && v !== "—")
                    .join(" ") || "—"}
                </div>
              </div>
              <div>
                <div className="label">{t("officialLicencePlate")}</div>
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
            {/* Transport type + registration status + characteristics, each as
                its own explicit value. No red-plate number is shown anywhere:
                the number is not recorded, only the derived requirement. */}
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
                <span className="pill outline no-dot">
                  {t("transportType")}:{" "}
                  {displayTransportType(job.transportType, t)}
                </span>
                {job.registrationStatus ? (
                  <span className="pill outline no-dot">
                    {AuthStore.registrationStatusLabel(
                      job.registrationStatus,
                      t,
                    )}
                  </span>
                ) : null}
                {job.electricVehicle ? (
                  <span className="pill outline no-dot">
                    {t("vehicleInfoElectric")}
                  </span>
                ) : null}
                {job.readyToDrive ? (
                  <span className="pill outline no-dot">
                    {t("vehicleReadyToDrive")}
                  </span>
                ) : null}
              </div>
            </div>
            {/* DERIVED red-licence-plate notice — Admin Backend job detail. */}
            <AdminRedPlatesNotice
              registrationStatus={job.registrationStatus}
              transportType={job.transportType}
            />
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
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      {t("phone")} 2: {c.secondPhone}
                    </div>
                  ) : null}
                  {c.email ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
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
                {activeTransportOrderDoc
                  ? `${t("adminPdfActiveVersion")} v${activeTransportOrderDoc.version} · ${activeTransportOrderDoc.title}`
                  : t("notGenerated")}
              </span>
            </div>
            {!activeTransportOrderDoc ? (
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 13 }}>
                    {activeTransportOrderDoc.fileName}
                  </div>
                  <div className="label" style={{ marginTop: 2 }}>
                    {t("adminPdfIssued", {
                      at: activeTransportOrderDoc.generatedAt,
                    })}
                    {" · "}
                    {t("adminPdfDataRevision")}{" "}
                    {activeTransportOrderDoc.dataRevision}
                    {" · "}
                    {t("adminPdfTrigger")} {activeTransportOrderDoc.trigger}
                  </div>
                  <div
                    className="label mono"
                    style={{ marginTop: 2, overflowWrap: "anywhere" }}
                  >
                    {t("adminPdfChecksum")}{" "}
                    {activeTransportOrderDoc.checksumSha256}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn xs"
                  onClick={() => {
                    const r = AuthStore.getTransportOrderPreview(job.id);
                    if (r.ok) setPdfPreview(r.preview);
                  }}
                >
                  <Ic.Eye /> {t("view")}
                </button>
                <button
                  type="button"
                  className="btn xs"
                  onClick={() => {
                    const r = AuthStore.downloadPdf(job.id);
                    if (r.ok) {
                      window.AutheonTransportOrderPdf?.printDocumentHtml(
                        r.previewHtml,
                        r.fileName,
                      );
                    }
                  }}
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
            {/* Immutable version history. Superseded versions are never
                overwritten, so each one keeps its own checksum, revision and
                booking-time partner snapshot. */}
            {transportOrderDocs.length > 1 ? (
              <div style={{ marginTop: 14 }}>
                <div className="label">{t("adminPdfVersionHistory")}</div>
                <ul
                  className="mono"
                  style={{
                    listStyle: "none",
                    margin: "6px 0 0",
                    padding: 0,
                    fontSize: 11,
                  }}
                >
                  {transportOrderDocs
                    .slice()
                    .reverse()
                    .map((d) => (
                      <li
                        key={d.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: "3px 0",
                          opacity: d.isActive ? 1 : 0.62,
                        }}
                      >
                        <span style={{ minWidth: 28 }}>v{d.version}</span>
                        <span style={{ minWidth: 92 }}>{d.generatedAt}</span>
                        <span style={{ minWidth: 130 }}>{d.trigger}</span>
                        <span
                          style={{ flex: 1, overflowWrap: "anywhere" }}
                          title={d.checksumSha256}
                        >
                          {d.checksumSha256.slice(0, 24)}…
                        </span>
                        {!d.isActive ? (
                          <span>{t("adminPdfSupersededVersion")}</span>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </section>
          {pdfPreview ? (
            <AdminTransportOrderPreview
              preview={pdfPreview}
              onClose={() => setPdfPreview(null)}
            />
          ) : null}

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

          <JobFinancePanel
            job={job}
            onOpenTourBilling={onOpenTourBilling}
            onOpenConsolidatedInvoice={onOpenConsolidatedInvoice}
            showToast={showToast}
          />
          <EmptyRunReviewPanel job={job} showToast={showToast} />
          <InternalNotesPanel job={job} showToast={showToast} />
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
                <div className="label" style={{ marginTop: 4, fontSize: 10.5 }}>
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
            {REASSIGNABLE_STATUSES.includes(job.status) && onRequestReassign ? (
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
  onCancelled,
  onRevertToDraft,
  onDeleteDraft,
  onDuplicate,
  showToast,
}) => {
  const { t } = useI18n();
  // Own the cancel modal here so the footer's Cancel action works standalone
  // (the trigger previously referenced state that lived in AdminDetail).
  const [cancelOpen, setCancelOpen] = useStateA(false);
  const canEdit = AuthStore.canAdminEditOrder(job);
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
        {canEdit && job.status === "draft" && (
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
                  .requestAdminConfirm(
                    t("adminDeleteDraftConfirm", { tour: job.tour }),
                    {
                      title: t("adminDeleteDraft"),
                      confirmLabel: t("adminDeleteDraft"),
                      destructive: true,
                    },
                  )
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
        {REASSIGNABLE_STATUSES.includes(job.status) && onRequestReassign && (
          <button type="button" className="btn" onClick={onRequestReassign}>
            {t("adminReassignDriver")}
          </button>
        )}
        {/* Edit order (§7) — full order form on any non-terminal booked order
            (published/assigned/accepted/empty_run_reported). Saving
            persists immediately, notifies the assigned partner with the actual
            changed values and audits previous → new, without changing status. */}
        {canEdit && job.status !== "draft" && (
          <button type="button" className="btn" onClick={onEdit}>
            {t("adminEditActiveOrder")}
          </button>
        )}
        {/* Duplicate order (§9) — reuse an existing/cancelled order as a new
            draft. Primary entry per spec is the row three-dot menu; this
            footer action provides the same capability from the detail view. */}
        {job.status !== "draft" && onDuplicate && (
          <button
            type="button"
            className="btn"
            onClick={() => onDuplicate(job)}
          >
            {t("adminDuplicateOrder")}
          </button>
        )}
        {/* Admin cancellation (§5) — booked orders and unbooked published ones.
            Both become "Cancelled by Autheon" and stay visible in the backend. */}
        {["accepted", "assigned", "empty_run_reported", "published"].includes(
          job.status,
        ) && (
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
  startCountry: "D",
  endCompany: "",
  endStreet: "",
  endHouseNo: "",
  endPlz: "",
  endCity: "",
  endCountry: "D",
  distance: "",
  pickupDate: "",
  pickupFrom: "",
  pickupTo: "",
  pickupFlex: false,
  deliveryDate: "",
  deliveryFrom: "",
  deliveryTo: "",
  deliveryFlex: false,
  // Vehicle domain — four explicit categories (client confirmation
  // "Systemlogik Fahrzeugeingabe"). NOT one flattened tag collection.
  vehicleType: "",
  manufacturer: "",
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
  transportType: AuthStore.TRANSPORT_TYPE_OWN_AXLE,
  registrationStatus: "",
  electricVehicle: false,
  readyToDrive: false,
  // No red-plate fields: the requirement is DERIVED by
  // AuthStore.requiresRedLicencePlates and the plate number is never captured.
  pickupLocationId: "",
  deliveryLocationId: "",
  savePickupToMaster: false,
  saveDeliveryToMaster: false,
};

// Vehicle-domain display helpers delegate to the SHARED store resolvers so the
// Admin Backend and the Driver PWA can never disagree on a label or on the
// derived red-licence-plate requirement.
const displayTransportType = (value, t) =>
  AuthStore.transportTypeLabel(value, t);
const displayVehicleTypeAdmin = (value, t) =>
  AuthStore.vehicleTypeLabel(value, t);

/**
 * Derived red-licence-plate notice for Admin Backend surfaces. Renders the ONE
 * shared component from driver-ui.jsx (which consults
 * AuthStore.requiresRedLicencePlates) using the existing semantic warning
 * treatments — .banner.banner-warn and .pill.warn / --st-warn tokens. No admin
 * component re-derives "deregistered + own axle".
 */
const AdminRedPlatesNotice = ({
  registrationStatus,
  transportType,
  compact,
}) => (
  <DriverUI.RedPlatesRequiredNotice
    registrationStatus={registrationStatus}
    transportType={transportType}
    variant={compact ? "admin-pill" : "admin-banner"}
  />
);

/**
 * Manufacturer field with quick search (client change plan Phase 3 #3):
 * ranked exact/starts-with/contains matches via AuthStore.searchManufacturers,
 * so typing "G" surfaces manufacturers starting with G before "Volkswagen".
 * Free text is allowed but a value is only committed via onChange when it
 * exactly matches a catalogue entry or a suggestion is clicked — this keeps
 * `form.manufacturer` restricted to the approved catalogue as before, while
 * adding search instead of a long alphabetical dropdown.
 */
const ManufacturerSearchField = ({ id, value, onChange, placeholder }) => {
  const [query, setQuery] = useStateA(value || "");
  const [open, setOpen] = useStateA(false);
  useEffectA(() => setQuery(value || ""), [value]);
  const results = AuthStore.searchManufacturers(
    query,
    AuthStore.MANUFACTURER_SUGGESTIONS,
  ).slice(0, 8);
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (AuthStore.MANUFACTURER_SUGGESTIONS.includes(e.target.value)) {
            onChange(e.target.value);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
          if (!AuthStore.MANUFACTURER_SUGGESTIONS.includes(query)) {
            // Revert to the last committed value — manufacturer stays
            // restricted to the approved catalogue (unlike model, which is
            // free text).
            setQuery(value || "");
          }
        }}
      />
      {open && query && results.length ? (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            right: 0,
            margin: "2px 0 0",
            padding: 4,
            listStyle: "none",
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #ccc)",
            borderRadius: 8,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {results.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="btn ghost xs"
                style={{ width: "100%", textAlign: "left" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery(name);
                  onChange(name);
                  setOpen(false);
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

function dateErrorLabelStandalone(reason, t) {
  if (reason === "invalid_format") return t("dateInvalidFormat");
  if (reason === "invalid_calendar_date") return t("dateInvalidCalendar");
  if (reason === "past_date") return t("dateInThePast");
  return "";
}

/**
 * Manual-entry date field with calendar-icon picker and "Today" action
 * (client change plan Phase 1 #1). Keeps the existing manual DD.MM.YYYY text
 * entry + blur reformat — the native <input type="date"> is an additive
 * picker, not a replacement, so keyboard-only entry keeps working exactly as
 * before. `error` renders the parseStrictDate rejection reason inline.
 */
const DateField = ({ value, onChange, onBlur, placeholder, error, testId }) => {
  const { t } = useI18n();
  const [pickerOpen, setPickerOpen] = useStateA(false);
  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          className="input mono"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={{ paddingRight: 60 }}
          data-testid={testId}
        />
        <div
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            gap: 2,
          }}
        >
          <button
            type="button"
            title={t("today")}
            onClick={() => onChange(AuthStore.todayDdmmyyyy())}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            {t("today")}
          </button>
          <button
            type="button"
            aria-label={t("newOrderOpenCalendar")}
            onClick={() => setPickerOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--muted)",
            }}
          >
            <Ic.Calendar />
          </button>
        </div>
      </div>
      {pickerOpen ? (
        <input
          type="date"
          className="input mono"
          style={{ marginTop: 6 }}
          value={AuthStore.ddmmyyyyToIso(value)}
          onChange={(e) => {
            const next = AuthStore.isoToDdmmyyyy(e.target.value);
            if (next) onChange(next);
            setPickerOpen(false);
          }}
        />
      ) : null}
      {error ? (
        <div
          style={{ color: "var(--destructive)", fontSize: 12, marginTop: 4 }}
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
};

const NewOrder = ({ onCancel, onFormChange, editJobId }) => {
  const store = useAuthStore();
  const { t } = useI18n();
  const editingJob = editJobId ? store.getJob(editJobId) : null;

  // Load the full form from ANY editable order — draft OR already-booked
  // (Storno §7). Terminal orders are never editable (canAdminEditOrder).
  const buildFormState = () => {
    if (editJobId) {
      const j = store.getJob(editJobId);
      if (j && store.canAdminEditOrder(j)) {
        const mapped = store.jobToDraftForm(j);
        if (mapped) return { ...EMPTY_NEW_ORDER_FORM, ...mapped };
      }
    }
    return { ...EMPTY_NEW_ORDER_FORM };
  };
  // A booked edit re-uses this exact form but saves through updateOrderFromForm
  // (persist + notify partner + audit prev→new) instead of the draft path.
  const isBookedEdit = !!editingJob && editingJob.status !== "draft";

  const [form, setForm] = useStateA(buildFormState);
  // Exactly the three approved vehicle types. SUV, Van/Transporter and
  // Classic car/Oldtimer were removed by the client confirmation and are NOT
  // offered here.
  const vehicleTypes = AuthStore.selectableVehicleTypes().map((value) => ({
    value,
    label: displayVehicleTypeAdmin(value, t),
  }));
  const transportTypes = AuthStore.TRANSPORT_TYPES.map((value) => ({
    value,
    label: displayTransportType(value, t),
  }));
  const registrationStatuses = AuthStore.REGISTRATION_STATUSES.map((value) => ({
    value,
    label: AuthStore.registrationStatusLabel(value, t),
  }));
  const [activeSec, setActiveSec] = useStateA("01");
  const [showGeneralNote, setShowGeneralNote] = useStateA(
    () => !!buildFormState().notesDriver,
  );
  const [showInternalNote, setShowInternalNote] = useStateA(
    () => !!buildFormState().notes,
  );
  const [adminAttachFiles, setAdminAttachFiles] = useStateA([]);
  const [scheduleOverrideNote, setScheduleOverrideNote] = useStateA("");
  const [distanceEstimateNote, setDistanceEstimateNote] = useStateA("");
  const adminDocFileRef = useRefA(null);

  useEffectA(() => {
    const next = buildFormState();
    setForm(next);
    setActiveSec("01");
    setAdminAttachFiles([]);
    setScheduleOverrideNote("");
    setDistanceEstimateNote("");
    setShowGeneralNote(!!next.notesDriver);
    setShowInternalNote(!!next.notes);
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
        startCountry: a.country || "D",
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
        endCountry: a.country || "D",
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
    "manufacturer",
    "model",
    "vin",
    // Registration status is its own single-select category and must be stated
    // explicitly — it is never inferred from the transport type.
    "registrationStatus",
    // The OFFICIAL licence plate stays required while the vehicle is
    // registered and becomes optional (but still enterable, never disabled)
    // once it is deregistered — a de-stamped plate is still useful.
    ...(form.registrationStatus === AuthStore.REGISTRATION_DEREGISTERED
      ? []
      : ["plate"]),
    "driverOffer",
  ];
  const scheduleDateWarning =
    form.pickupDate &&
    form.deliveryDate &&
    AuthStore.compareDottedDates(form.pickupDate, form.deliveryDate) > 0;
  // Strict calendar validation (Phase 1 #2): rejects bad day/month, letters,
  // extra digits, incomplete input and past dates. Only evaluated once the
  // field has content — an empty required field is reported via `required`.
  const pickupDateCheck = form.pickupDate
    ? AuthStore.parseStrictDate(form.pickupDate)
    : null;
  const deliveryDateCheck = form.deliveryDate
    ? AuthStore.parseStrictDate(form.deliveryDate)
    : null;
  const dateErrorLabel = (check) =>
    !check || check.valid ? "" : dateErrorLabelStandalone(check.reason, t);
  const pickupDateError = dateErrorLabel(pickupDateCheck);
  const deliveryDateError = dateErrorLabel(deliveryDateCheck);
  // Driver-offer bounds (Phase 2 #7) — configurable in Settings, defaults
  // 0.01 / 999.99 EUR. Letters can't be typed at all (input filter above).
  const offerPolicies = store.getOperationalPolicies();
  const driverOfferNum = parseFloat(
    String(form.driverOffer || "").replace(",", "."),
  );
  const driverOfferError = (() => {
    if (!form.driverOffer) return "";
    if (!Number.isFinite(driverOfferNum)) return t("driverOfferInvalid");
    if (driverOfferNum < (offerPolicies.driverOfferMinEur ?? 0.01))
      return t("driverOfferTooLow");
    if (driverOfferNum > (offerPolicies.driverOfferMaxEur ?? 999.99))
      return t("driverOfferTooHigh", {
        max: (offerPolicies.driverOfferMaxEur ?? 999.99).toFixed(2),
      });
    return "";
  })();
  const pickupTimeWarning =
    form.pickupFrom &&
    form.pickupTo &&
    AuthStore.compareTimeStrings(form.pickupFrom, form.pickupTo) > 0;
  const deliveryTimeWarning =
    form.deliveryFrom &&
    form.deliveryTo &&
    AuthStore.compareTimeStrings(form.deliveryFrom, form.deliveryTo) > 0;
  // Confirmed VIN rule: exactly 17 characters. Same helper the authoritative
  // write path uses (AuthStore.validateVehicleForm) — no second rule here.
  const vinLength = String(form.vin || "").trim().length;
  const vinLengthError = vinLength > 0 && !AuthStore.isValidVin(form.vin);
  // Applicability of "Ready to drive" — drives EMPHASIS only. The stored value
  // is never cleared when the transport type changes.
  const readyToDriveApplicable = AuthStore.isReadyToDriveApplicable(
    form.transportType,
  );
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
  const valid =
    filled === total &&
    !sameDayWindowBlocked &&
    !pickupDateError &&
    !deliveryDateError &&
    !driverOfferError;
  const wasCommitted = editingJob && AuthStore.jobWasEverCommitted(editingJob);
  const existingAdminDocs = editJobId
    ? store
        .getTourDocumentsForJob(editJobId)
        .filter((d) => d.source === "admin_off_channel" || d.source === "admin")
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
  const sectionLabel = (id) => sections.find((s) => s[0] === id)?.[1] || id;
  // Client requirement (Phase 1 #4): a persistent validation summary with
  // jump links, alongside the existing field-level inline errors — not a
  // replacement for them.
  const validationIssues = [];
  if (required.includes("customer") && !form.customer)
    validationIssues.push({
      section: "01",
      text: t("newOrderValidationRequired"),
    });
  if (
    [
      "startCity",
      "startPlz",
      "startStreet",
      "endCity",
      "endPlz",
      "endStreet",
    ].some((k) => !form[k] || !String(form[k]).trim())
  )
    validationIssues.push({
      section: "02",
      text: t("newOrderValidationRequired"),
    });
  if (!form.pickupDate || !form.deliveryDate)
    validationIssues.push({
      section: "03",
      text: t("newOrderValidationRequired"),
    });
  if (pickupDateError)
    validationIssues.push({ section: "03", text: pickupDateError });
  if (deliveryDateError)
    validationIssues.push({ section: "03", text: deliveryDateError });
  if (sameDayWindowBlocked)
    validationIssues.push({
      section: "03",
      text: t("newOrderValidationWindowOrder"),
    });
  if (
    ["vehicleType", "manufacturer", "model", "vin", "registrationStatus"].some(
      (k) => !form[k] || !String(form[k]).trim(),
    ) ||
    (required.includes("plate") && !form.plate)
  )
    validationIssues.push({
      section: "04",
      text: t("newOrderValidationRequired"),
    });
  if (vinLengthError)
    validationIssues.push({
      section: "04",
      text: t("newOrderVinLengthError", { count: vinLength }),
    });
  if (!form.driverOffer)
    validationIssues.push({
      section: "05",
      text: t("newOrderValidationRequired"),
    });
  if (driverOfferError)
    validationIssues.push({ section: "05", text: driverOfferError });
  const jumpToSection = (id) => {
    setActiveSec(id);
    document
      .getElementById("sec-" + id)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

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

      {isBookedEdit && (
        <div
          className="card"
          style={{
            padding: "12px 16px",
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Pill status={editingJob.status} className="no-dot">
            {AuthStore.statusLabel(editingJob.status)}
          </Pill>
          <span className="label" style={{ margin: 0, lineHeight: 1.4 }}>
            {t("adminEditOrderStatusNote", {
              status: AuthStore.statusLabel(editingJob.status),
            })}
          </span>
        </div>
      )}

      {validationIssues.length > 0 && (
        <div
          className="card"
          role="alert"
          style={{
            padding: "14px 16px",
            marginBottom: 18,
            border: "1px solid var(--danger, #c0392b)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {t("newOrderValidationSummaryTitle", {
              count: validationIssues.length,
            })}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {validationIssues.map((issue, i) => (
              <li key={i} style={{ fontSize: 13 }}>
                <button
                  type="button"
                  className="btn-link"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--danger, #c0392b)",
                    textDecoration: "underline",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                  onClick={() => jumpToSection(issue.section)}
                >
                  {sectionLabel(issue.section)}
                </button>
                {" — "}
                {issue.text}
              </li>
            ))}
          </ul>
        </div>
      )}

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
              {form.customerId ? (
                <button
                  type="button"
                  className="btn ghost xs"
                  style={{ marginTop: 6 }}
                  onClick={() => onCustomerSelect("")}
                >
                  {t("manualEntryToggleLabel")}
                </button>
              ) : null}
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
                  inputMode="numeric"
                  value={form.distance}
                  onChange={(e) => {
                    set("distance", e.target.value.replace(/\D/g, ""));
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
                  color: "var(--destructive)",
                  borderLeft: "3px solid var(--destructive)",
                }}
                role="alert"
              >
                {t("adminScheduleSameDayWindowError")} (
                {t("newOrderPickupSchedule")})
              </div>
            ) : null}
            {deliveryTimeWarning ? (
              <div
                className="dash-area"
                style={{
                  marginTop: 10,
                  padding: 12,
                  fontSize: 12.5,
                  color: "var(--destructive)",
                  borderLeft: "3px solid var(--destructive)",
                }}
                role="alert"
              >
                {t("adminScheduleSameDayWindowError")} (
                {t("newOrderDeliverySchedule")})
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
                  <label className="field-label">
                    {t("newOrderPickupDate")} *
                  </label>
                  <DateField
                    value={form.pickupDate}
                    onChange={(v) => set("pickupDate", v)}
                    onBlur={blurDate("pickupDate")}
                    placeholder={t("newOrderDatePh")}
                    error={pickupDateError}
                    testId="pickup-date"
                  />
                </div>
                <div>
                  <label className="field-label">
                    {t("newOrderWindowFrom")}
                  </label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderTimePh")}
                    value={form.pickupFrom}
                    onChange={(e) => set("pickupFrom", e.target.value)}
                    onBlur={blurTime("pickupFrom")}
                    disabled={!!form.pickupFlex}
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
                    disabled={!!form.pickupFlex}
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
                  <label className="field-label">
                    {t("newOrderDeliveryDate")} *
                  </label>
                  <DateField
                    value={form.deliveryDate}
                    onChange={(v) => set("deliveryDate", v)}
                    onBlur={blurDate("deliveryDate")}
                    placeholder={t("newOrderDatePh")}
                    error={deliveryDateError}
                    testId="delivery-date"
                  />
                </div>
                <div>
                  <label className="field-label">
                    {t("newOrderWindowFrom")}
                  </label>
                  <input
                    className="input mono"
                    placeholder={t("newOrderTimePh")}
                    value={form.deliveryFrom}
                    onChange={(e) => set("deliveryFrom", e.target.value)}
                    onBlur={blurTime("deliveryFrom")}
                    disabled={!!form.deliveryFlex}
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
                    disabled={!!form.deliveryFlex}
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
            {/* ------------------------------------------------------------
                Vehicle entry per client confirmation "Systemlogik
                Fahrzeugeingabe". Four SEPARATE semantic categories with their
                own cardinalities — deliberately NOT one flat multi-select tag
                collection (that earlier proposal was superseded). The chip and
                segmented-control primitives are reused only for visual
                consistency; the payload keeps discrete fields.
                ------------------------------------------------------------ */}
            {/* 1. Vehicle type — exactly one (single-select, 3 approved values) */}
            <div style={{ marginTop: 14 }}>
              <label className="field-label" id="new-order-vehicle-type-label">
                {t("vehicleType")} *
              </label>
              <div
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                role="radiogroup"
                aria-labelledby="new-order-vehicle-type-label"
              >
                {vehicleTypes.map((vt) => (
                  <button
                    key={vt.value}
                    type="button"
                    role="radio"
                    aria-checked={form.vehicleType === vt.value}
                    className={
                      "chip actionable " +
                      (form.vehicleType === vt.value ? "on" : "")
                    }
                    onClick={() => set("vehicleType", vt.value)}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Vehicle data — manufacturer (dropdown), model, official
                   licence plate and VIN are each their own field. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <div>
                <label className="field-label" htmlFor="new-order-manufacturer">
                  {t("manufacturer")} *
                </label>
                {/* Manufacturer is picked from the existing catalogue
                    (AuthStore.MANUFACTURER_SUGGESTIONS) via ranked quick
                    search, not a long alphabetical dropdown. */}
                <ManufacturerSearchField
                  id="new-order-manufacturer"
                  value={form.manufacturer}
                  onChange={(v) => set("manufacturer", v)}
                  placeholder={t("manufacturerPh")}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="new-order-model">
                  {t("newOrderModel")} *
                </label>
                {/* Manufacturer-dependent suggestions via <datalist> — the
                    field stays free text, so a model missing from the list
                    can still be typed and is never overwritten. */}
                <input
                  id="new-order-model"
                  className="input"
                  list="new-order-model-options"
                  placeholder={t("newOrderModelPh")}
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                />
                <datalist id="new-order-model-options">
                  {(AuthStore.MANUFACTURER_MODELS[form.manufacturer] || []).map(
                    (m) => (
                      <option key={m} value={m} />
                    ),
                  )}
                </datalist>
              </div>
              {/* Official licence plate of the TRANSPORTED vehicle. Always
                  rendered and always enabled — deregistration no longer hides,
                  disables or clears it, and it is never replaced by a
                  red-plate field. */}
              <div>
                <label className="field-label" htmlFor="new-order-plate">
                  {t("officialLicencePlate")}
                  {form.registrationStatus ===
                  AuthStore.REGISTRATION_DEREGISTERED
                    ? ""
                    : " *"}
                </label>
                <input
                  id="new-order-plate"
                  className="input mono"
                  placeholder={t("newOrderPlatePh")}
                  value={form.plate}
                  onChange={(e) => set("plate", e.target.value)}
                  onBlur={(e) =>
                    set("plate", AuthStore.normalizePlate(e.target.value))
                  }
                />
                <p
                  className="label"
                  style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45 }}
                >
                  {t("officialLicencePlateHint")}
                </p>
              </div>
              <div>
                <label className="field-label" htmlFor="new-order-vin">
                  {t("vin")} * ({t("newOrderVinLen")})
                </label>
                <input
                  id="new-order-vin"
                  className="input mono"
                  placeholder={t("newOrderVinLen")}
                  value={form.vin}
                  aria-invalid={vinLengthError || undefined}
                  aria-describedby={
                    vinLengthError ? "new-order-vin-error" : undefined
                  }
                  onChange={(e) =>
                    set("vin", AuthStore.normalizeVin(e.target.value))
                  }
                />
                {vinLengthError ? (
                  <p
                    id="new-order-vin-error"
                    className="label"
                    style={{
                      marginTop: 6,
                      fontSize: 11.5,
                      lineHeight: 1.45,
                      color: "var(--st-warn)",
                    }}
                  >
                    {t("newOrderVinLengthError", { count: vinLength })}
                  </p>
                ) : null}
              </div>
            </div>

            {/* 3. Transport type — exactly one. Renames the former "Axle". */}
            <div style={{ marginTop: 14 }}>
              <label
                className="field-label"
                id="new-order-transport-type-label"
              >
                {t("transportType")} *
              </label>
              <div
                className="seg"
                style={{ display: "inline-grid", gridAutoFlow: "column" }}
                role="radiogroup"
                aria-labelledby="new-order-transport-type-label"
              >
                {transportTypes.map((tt) => (
                  <button
                    key={tt.value}
                    type="button"
                    role="radio"
                    aria-checked={form.transportType === tt.value}
                    className={form.transportType === tt.value ? "on" : ""}
                    /* Only transportType changes — readyToDrive and every other
                       category are left exactly as the user set them. */
                    onClick={() => set("transportType", tt.value)}
                  >
                    {tt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Registration status — exactly one, INDEPENDENT of transport
                   type. No "Red plates" pseudo-option any more: the red-plate
                   requirement is derived, never selected. */}
            <div style={{ marginTop: 14 }}>
              <label className="field-label" id="new-order-registration-label">
                {t("registrationStatus")} *
              </label>
              <div
                className="seg"
                style={{ display: "inline-grid", gridAutoFlow: "column" }}
                role="radiogroup"
                aria-labelledby="new-order-registration-label"
              >
                {registrationStatuses.map((rs) => (
                  <button
                    key={rs.value}
                    type="button"
                    role="radio"
                    aria-checked={form.registrationStatus === rs.value}
                    className={form.registrationStatus === rs.value ? "on" : ""}
                    onClick={() => set("registrationStatus", rs.value)}
                  >
                    {rs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Additional vehicle characteristics — INDEPENDENT attributes,
                   each individually selectable. */}
            <div style={{ marginTop: 14 }}>
              <label className="field-label">
                {t("vehicleCharacteristics")}
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  aria-pressed={form.electricVehicle}
                  className={
                    "chip actionable " + (form.electricVehicle ? "on" : "")
                  }
                  onClick={() => set("electricVehicle", !form.electricVehicle)}
                >
                  {t("vehicleInfoElectric")}
                </button>
                <button
                  type="button"
                  aria-pressed={form.readyToDrive}
                  className={
                    "chip actionable " + (form.readyToDrive ? "on" : "")
                  }
                  onClick={() => set("readyToDrive", !form.readyToDrive)}
                >
                  {t("vehicleReadyToDrive")}
                </button>
              </div>
              {/* Applicability is communicated, not enforced: the control stays
                  available and a stored value is never cleared just because the
                  transport type changed. */}
              {readyToDriveApplicable ? (
                <p
                  className="label"
                  style={{
                    marginTop: 6,
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    fontWeight: 600,
                  }}
                >
                  {t("vehicleReadyToDriveApplicability")}
                </p>
              ) : null}
              <p
                className="label"
                style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45 }}
              >
                {t("newOrderVehicleInfoHint")}
              </p>
            </div>

            {/* DERIVED red-licence-plate notice — location 1 of 5. Rendered
                from the single canonical policy, not from a manual selection. */}
            <AdminRedPlatesNotice
              registrationStatus={form.registrationStatus}
              transportType={form.transportType}
            />
          </section>

          <section id="sec-05" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">05</span> {t("newOrderSecDriverOffer")}
              </h3>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field-label">
                {t("newOrderDriverOfferEur")}
              </label>
              <input
                className="input mono"
                style={{ maxWidth: 200, fontSize: 18, fontWeight: 600 }}
                placeholder={t("newOrderDriverOfferPh")}
                inputMode="decimal"
                value={form.driverOffer}
                onChange={(e) => {
                  // Digits plus a single decimal separator (comma or dot).
                  // A leading '-' is stripped too, so negative amounts can't
                  // be typed at all (client change plan Phase 2 #7).
                  let v = e.target.value.replace(/[^\d.,]/g, "");
                  const sep = v.search(/[.,]/);
                  if (sep !== -1) {
                    v =
                      v.slice(0, sep + 1) +
                      v.slice(sep + 1).replace(/[.,]/g, "");
                  }
                  set("driverOffer", v);
                }}
                onBlur={() => {
                  const n = parseFloat(
                    String(form.driverOffer || "").replace(",", "."),
                  );
                  if (Number.isFinite(n)) set("driverOffer", n.toFixed(2));
                }}
              />
              {driverOfferError ? (
                <div
                  style={{
                    color: "var(--destructive)",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                  role="alert"
                >
                  {driverOfferError}
                </div>
              ) : null}
            </div>
          </section>

          <section id="sec-06" className="card" style={{ padding: 22 }}>
            <div className="sec-head">
              <h3>
                <span className="num">06</span> {t("newOrderSecNotes")}
              </h3>
            </div>
            {/* Split per client change plan Phase 2 #9: pickup/delivery notes
                live in section 02 with each address. Here: general notes
                (driver/service-partner-visible, ORDER_EDIT_FIELDS dv:true on
                `notesDriver`) and internal notes (admin-only, dv:false on
                `notes`) — both optional and hidden until explicitly added. */}
            <div style={{ marginTop: 14 }}>
              {showGeneralNote ? (
                <>
                  <label className="field-label">
                    {t("newOrderGeneralNoteLabel")}
                  </label>
                  <textarea
                    className="input"
                    value={form.notesDriver || ""}
                    onChange={(e) => set("notesDriver", e.target.value)}
                  />
                </>
              ) : (
                <button
                  type="button"
                  className="btn ghost xs"
                  onClick={() => setShowGeneralNote(true)}
                >
                  + {t("newOrderGeneralNoteLabel")}
                </button>
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              {showInternalNote ? (
                <>
                  <label className="field-label">
                    {t("newOrderInternalNoteLabel")}
                  </label>
                  <textarea
                    className="input"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </>
              ) : (
                <button
                  type="button"
                  className="btn ghost xs"
                  onClick={() => setShowInternalNote(true)}
                >
                  + {t("newOrderInternalNoteLabel")}
                </button>
              )}
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
                <div
                  className="label"
                  style={{ marginTop: 14, marginBottom: 8 }}
                >
                  {t("newOrderAdminDocsExisting")}
                </div>
                <ul className="doc-card-list">
                  {existingAdminDocs.map((doc, index) => (
                    <li
                      key={doc.id}
                      className={"doc-card" + (index < 4 ? " list-enter" : "")}
                      style={
                        index < 4 ? { ["--list-enter-i"]: index } : undefined
                      }
                    >
                      <div className="doc-card-head">
                        <span
                          className="mono"
                          style={{ wordBreak: "break-all" }}
                        >
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
                {adminAttachFiles.map((item, index) => (
                  <li
                    key={item.id}
                    className={"doc-card" + (index < 4 ? " list-enter" : "")}
                    style={
                      index < 4 ? { ["--list-enter-i"]: index } : undefined
                    }
                  >
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
                <p className="empty-state-title">
                  {t("newOrderAdminDocsEmpty")}
                </p>
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
  bookedEdit,
  onSaveBookedEdit,
}) => {
  const { t } = useI18n();
  // Editing an already-booked order: a single Save action that persists,
  // notifies the assigned partner and preserves the operational status
  // (Storno §7). Publish/Assign do not apply to a booked order.
  if (bookedEdit) {
    return (
      <>
        <span className="label">{t("adminEditOrderSaveHint")}</span>
        <div style={{ display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={onCancel}>
            {t("newOrderCancel")}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!valid}
            onClick={onSaveBookedEdit}
          >
            {t("adminSaveAndNotify")}
          </button>
        </div>
      </>
    );
  }
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
  firstName: "",
  lastName: "",
  company: "",
  legalForm: "",
  driverCode: "",
  address: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: AuthStore.DEFAULT_COUNTRY_SIGN,
  email: "",
  phone: "",
  secondPhone: "",
  notes: "",
  probationJobLimit: "3",
  taxStatus: "",
  taxNumber: "",
  vatId: "",
  accountHolder: "",
  iban: "",
});

const emptyAdminEditForm = () => ({
  name: "",
  email: "",
});

const userInputErrStyle = { borderColor: "var(--destructive)" };

const UserFormError = ({ message, id }) =>
  message ? (
    <div
      className="label"
      id={id}
      role="alert"
      style={{ color: "var(--destructive)", fontSize: 11.5, marginTop: 4 }}
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
  if (String(form.iban || "").trim()) {
    const check = AuthStore.validateIban(form.iban);
    if (!check.valid) {
      errors.iban =
        check.reason === "invalid_checksum"
          ? t("adminUsersErrIbanChecksum")
          : check.reason === "invalid_length"
            ? t("adminUsersErrIbanLength")
            : t("adminUsersErrIbanFormat");
    }
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
      <label className="field-label">{t("adminUsersFieldFirstName")}</label>
      <input
        className="input"
        value={form.firstName || ""}
        onChange={(e) => {
          setF("firstName", e.target.value);
          if (form.lastName)
            setF("name", `${e.target.value} ${form.lastName}`.trim());
        }}
        autoComplete="given-name"
      />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldLastName")}</label>
      <input
        className="input"
        value={form.lastName || ""}
        onChange={(e) => {
          setF("lastName", e.target.value);
          if (form.firstName)
            setF("name", `${form.firstName} ${e.target.value}`.trim());
        }}
        autoComplete="family-name"
      />
    </div>
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
      <p className="label" style={{ marginTop: 4, fontSize: 11 }}>
        {t("adminUsersFieldNameHint")}
      </p>
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
      <label className="field-label">{t("adminUsersFieldLegalForm")}</label>
      <input
        className="input"
        placeholder="GmbH, e.K., …"
        value={form.legalForm || ""}
        onChange={(e) => setF("legalForm", e.target.value)}
      />
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
      <p
        className="label"
        style={{ marginTop: 4, fontSize: 11, lineHeight: 1.4 }}
      >
        {t("adminUsersFieldAddressLegacyHint")}
      </p>
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldStreet")}</label>
      <input
        className="input"
        value={form.street || ""}
        onChange={(e) => setF("street", e.target.value)}
      />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldHouseNumber")}</label>
      <input
        className="input"
        value={form.houseNumber || ""}
        onChange={(e) => setF("houseNumber", e.target.value)}
      />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldPostalCode")}</label>
      <input
        className="input mono"
        value={form.postalCode || ""}
        onChange={(e) => setF("postalCode", e.target.value.replace(/\D/g, ""))}
      />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldCity")}</label>
      <input
        className="input"
        value={form.city || ""}
        onChange={(e) => setF("city", e.target.value)}
      />
    </div>
    <div>
      <label className="field-label">{t("countryFieldLabel")}</label>
      <select
        className="input mono"
        value={AuthStore.normalizeCountrySign(form.country)}
        onChange={(e) => setF("country", e.target.value)}
      >
        {[...AuthStore.COUNTRY_SIGNS]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
      </select>
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldSecondPhone")}</label>
      <input
        className="input"
        type="tel"
        value={form.secondPhone || ""}
        onChange={(e) => setF("secondPhone", e.target.value)}
      />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldTaxStatus")}</label>
      <select
        className="input"
        value={form.taxStatus || ""}
        onChange={(e) => setF("taxStatus", e.target.value)}
      >
        <option value="">{t("adminUsersFieldTaxStatusPh")}</option>
        {AuthStore.TAX_STATUSES.map((code) => (
          <option key={code} value={code}>
            {t(`adminTaxStatus_${code}`)}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldTaxNumber")}</label>
      <input
        className="input mono"
        value={form.taxNumber || ""}
        onChange={(e) => setF("taxNumber", e.target.value)}
      />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldVatId")}</label>
      <input
        className="input mono"
        value={form.vatId || ""}
        onChange={(e) => setF("vatId", e.target.value)}
      />
    </div>
    <div>
      <label className="field-label">{t("adminUsersFieldAccountHolder")}</label>
      <input
        className="input"
        value={form.accountHolder || ""}
        onChange={(e) => setF("accountHolder", e.target.value)}
      />
    </div>
    <div style={{ gridColumn: "1 / -1" }}>
      <label className="field-label">{t("adminUsersFieldIban")}</label>
      <input
        className="input mono"
        style={errors.iban ? userInputErrStyle : undefined}
        value={form.iban || ""}
        onChange={(e) => setF("iban", e.target.value.toUpperCase())}
        placeholder="DE89 3704 0044 0532 0130 00"
      />
      <UserFormError message={errors.iban} />
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
      <label className="field-label">
        {t("adminUsersFieldProbationLimit")}
      </label>
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
  if (reason === "duplicate_driver_code")
    return t("adminUsersErrDriverCodeDuplicate");
  if (reason === "driver_code_required")
    return t("adminUsersErrDriverCodeRequired");
  if (reason === "driver_code_immutable")
    return t("adminUsersErrDriverCodeImmutable");
  if (reason === "invalid_probation_limit")
    return t("adminUsersErrProbationLimit");
  return t("adminInvoiceErrGeneric");
};

// Account/access status (User.status axis) — 5 values, shared by the
// StaffPane's single status control and DriversPane's separate "Account
// access" column. Distinct from Driver.status (operational/marketplace axis).
const accountStatusLabel = (state, t) => {
  const key = {
    "Pending verification": "adminUsersAccountStatus_PendingVerification",
    Active: "adminUsersAccountStatus_Active",
    Suspended: "adminUsersAccountStatus_Suspended",
    Inactive: "adminUsersAccountStatus_Inactive",
    "Invite failed": "adminUsersAccountStatus_InviteFailed",
  }[state];
  return key ? t(key) : state || "—";
};

const accountStatusPillVariant = (state) =>
  state === "Active"
    ? "accepted"
    : state === "Suspended" || state === "Invite failed"
      ? "cancelled"
      : "published";

// Operational/marketplace axis (Driver.status) — matches the real
// DriverStatus enum (Active/Blocked/Inactive). Maps each current status to
// its valid next transitions only, so the UI never offers a no-op or an
// invalid change. `confirm` flags transitions that need a confirm step
// before firing (anything that removes the driver from job matching).
const DRIVER_STATUS_TRANSITIONS = {
  Active: [
    { to: "Blocked", labelKey: "adminUsersBlock", confirm: "block" },
    { to: "Inactive", labelKey: "adminUsersDeactivate", confirm: "deactivate" },
  ],
  Blocked: [
    { to: "Active", labelKey: "adminUsersActivate", confirm: null },
    { to: "Inactive", labelKey: "adminUsersDeactivate", confirm: "deactivate" },
  ],
  Inactive: [
    { to: "Active", labelKey: "adminUsersActivate", confirm: null },
    { to: "Blocked", labelKey: "adminUsersBlock", confirm: "block" },
  ],
};

// Client requirement (Phase 7 #1): merge "Drivers" and "Profile Changes" into
// one "Service Partners" nav entry with switchable views — same pattern as
// CustomerCenterPane (Phase 9) and TourBillingCenterPane (Phase 12).
const ServicePartnersCenterPane = ({
  showToast,
  initialRequestId,
  onClearInitialRequest,
  onOpenJob,
}) => {
  const { t } = useI18n();
  const [view, setView] = useStateA(
    initialRequestId ? "changerequests" : "partners",
  );
  useEffectA(() => {
    if (initialRequestId) setView("changerequests");
  }, [initialRequestId]);
  return (
    <div id="servicepartnercenter">
      <div className="tabs">
        {[
          ["partners", t("navDrivers")],
          ["changerequests", t("navMasterDataRequests")],
        ].map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={view === id ? "on" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setView(id)}
          >
            {lbl}
          </button>
        ))}
      </div>
      {view === "partners" ? (
        <DriversPane showToast={showToast} />
      ) : (
        <MasterDataRequestsPane
          showToast={showToast}
          initialRequestId={initialRequestId}
          onClearInitialRequest={onClearInitialRequest}
          onOpenJob={onOpenJob}
        />
      )}
    </div>
  );
};

const DriversPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [driverModal, setDriverModal] = useStateA(null);
  const [driverForm, setDriverForm] = useStateA(emptyDriverEditForm());
  const [driverErrors, setDriverErrors] = useStateA({});
  const [profileDriverId, setProfileDriverId] = useStateA(null);
  const setDF = (k, v) => {
    setDriverForm((p) => ({ ...p, [k]: v }));
    setDriverErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openNewDriver = () => {
    setDriverForm(emptyDriverEditForm());
    setDriverErrors({});
    setDriverModal("new");
  };

  const openEditDriver = (d) => {
    setDriverForm({
      name: d.name || "",
      firstName: d.firstName || "",
      lastName: d.lastName || "",
      company: d.company || "",
      legalForm: d.legalForm || "",
      driverCode: d.driverCode || "",
      address: d.address || "",
      street: d.street || "",
      houseNumber: d.houseNumber || "",
      postalCode: d.postalCode || "",
      city: d.city || "",
      country: d.country || AuthStore.DEFAULT_COUNTRY_SIGN,
      email: d.email || "",
      phone: d.phone || "",
      secondPhone: d.secondPhone || "",
      notes: d.notes || "",
      probationJobLimit:
        d.probationJobLimit != null ? String(d.probationJobLimit) : "3",
      taxStatus: d.taxStatus || "",
      taxNumber: d.taxNumber || "",
      vatId: d.vatId || "",
      accountHolder: d.accountHolder || "",
      iban: d.iban || "",
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

  const applyAccountStatus = (record, kind, status) => {
    const result = store.setAccountStatus(kind, record.id, status);
    if (!result.ok) {
      if (result.reason === "active_jobs") {
        showToast?.(
          t("adminUsersToastDriverActiveJobs", { count: result.count }),
          record.name,
        );
      }
      return;
    }
    showToast?.(t("adminUsersToastAccountStatusChanged"), record.name);
  };

  const handleDeleteDriver = (driver) => {
    void window
      .requestAdminConfirm(
        t("adminDeleteDriverConfirmBody", { name: driver.name }),
        {
          title: t("adminDeleteDriverConfirmTitle", { name: driver.name }),
          destructive: true,
          confirmLabel: t("adminDeleteDriverConfirmAction"),
        },
      )
      .then((ok) => {
        if (!ok) return;
        const result = store.deleteDriver(driver.id);
        if (!result.ok) {
          if (result.reason === "active_jobs") {
            showToast?.(
              t("adminUsersToastDriverActiveJobs", { count: result.count }),
              driver.name,
            );
          } else {
            showToast?.(t("adminUsersSaveFailed"), driver.name);
          }
          return;
        }
        showToast?.(t("adminUsersDeleted"), driver.name);
      });
  };

  // Activating isn't destructive — fires immediately, same precedent as
  // StaffPane's applyAdminStatus. Block/Deactivate remove the driver from
  // job matching, so they get a confirm step first.
  const applyDriverStatusTransition = (driver, transition) => {
    if (!transition.confirm) {
      applyDriverStatus(driver, transition.to);
      return;
    }
    const isBlock = transition.confirm === "block";
    void window
      .requestAdminConfirm(
        t(
          isBlock
            ? "adminDriverBlockConfirmBody"
            : "adminDriverDeactivateConfirmBody",
          { name: driver.name },
        ),
        {
          title: t(
            isBlock
              ? "adminDriverBlockConfirmTitle"
              : "adminDriverDeactivateConfirmTitle",
            { name: driver.name },
          ),
          destructive: true,
          confirmLabel: t(
            isBlock
              ? "adminDriverBlockConfirmAction"
              : "adminDriverDeactivateConfirmAction",
          ),
        },
      )
      .then((ok) => {
        if (ok) applyDriverStatus(driver, transition.to);
      });
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
              <th>{t("adminUsersLastActivity")}</th>
              <th>{t("adminUsersColAccess")}</th>
              <th>{t("adminUsersColActions")}</th>
            </tr>
          </thead>
          <tbody>
            {store.getDrivers().map((d, index) => (
              <tr
                key={d.id}
                className={index < 4 ? "list-enter" : undefined}
                style={index < 4 ? { ["--list-enter-i"]: index } : undefined}
              >
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
                    status={
                      d.status === "Active"
                        ? "accepted"
                        : d.status === "Blocked"
                          ? "cancelled"
                          : "published"
                    }
                  >
                    {t(`adminUsersStatus_${d.status}`)}
                  </Pill>
                  {/* An admin reading "Inactive" cannot otherwise tell a
                      moderator's decision from the nightly sweep's. */}
                  {d.deactivationReason === "inactivity" && (
                    <span
                      className="label"
                      title={t("adminUsersAutoBadgeTitle")}
                      style={{
                        marginLeft: 6,
                        padding: "1px 6px",
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        fontSize: 9.5,
                      }}
                    >
                      {t("adminUsersAutoBadge")}
                    </span>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    {(DRIVER_STATUS_TRANSITIONS[d.status] || []).map(
                      (transition) => (
                        <button
                          key={transition.to}
                          type="button"
                          className="btn xs"
                          onClick={() =>
                            applyDriverStatusTransition(d, transition)
                          }
                        >
                          {t(transition.labelKey)}
                        </button>
                      ),
                    )}
                  </div>
                </td>
                {/* Last activity drives the automatic-deactivation clock. */}
                <td>
                  {d.lastActiveAt ? (
                    window.AutheonFormatters.formatDate(
                      new Date(d.lastActiveAt),
                    )
                  ) : (
                    /* "Never signed in" is a different fact from "signed in long
                       ago" - an em-dash would read as "unknown" and hide a
                       partner who never onboarded at all. */
                    <span className="label" style={{ fontStyle: "italic" }}>
                      {t("adminUsersLastActivityNever")}
                    </span>
                  )}
                </td>
                <td>
                  <Pill status={accountStatusPillVariant(d.accountStatus)}>
                    {accountStatusLabel(d.accountStatus, t)}
                  </Pill>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    {d.accountStatus === "Invite failed" ||
                    d.accountStatus === "Pending verification" ? (
                      <button
                        type="button"
                        className="btn xs"
                        onClick={() => triggerResendAccess(d)}
                      >
                        {t("adminUsersResendInvite")}
                      </button>
                    ) : null}
                    {d.accountStatus === "Active" ? (
                      <button
                        type="button"
                        className="btn xs"
                        onClick={() =>
                          applyAccountStatus(d, "driver", "Suspended")
                        }
                      >
                        {t("adminUsersSuspendAccount")}
                      </button>
                    ) : null}
                    {d.accountStatus === "Suspended" ||
                    d.accountStatus === "Inactive" ? (
                      <button
                        type="button"
                        className="btn xs"
                        onClick={() =>
                          applyAccountStatus(d, "driver", "Active")
                        }
                      >
                        {t("adminUsersReactivateAccount")}
                      </button>
                    ) : null}
                  </div>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="btn xs"
                    onClick={() => setProfileDriverId(d.id)}
                  >
                    {t("adminServicePartnerProfileButton")}
                  </button>
                  <button
                    type="button"
                    className="btn xs primary"
                    style={{ marginLeft: 6 }}
                    onClick={() => openEditDriver(d)}
                  >
                    {t("adminUsersEdit")}
                  </button>
                  <button
                    type="button"
                    className="btn xs danger"
                    style={{ marginLeft: 6 }}
                    onClick={() => handleDeleteDriver(d)}
                  >
                    {t("adminUsersDelete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {profileDriverId ? (
        <ServicePartnerProfileModal
          driver={store.getDrivers().find((d) => d.id === profileDriverId)}
          onClose={() => setProfileDriverId(null)}
          showToast={showToast}
        />
      ) : null}

      {driverModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="dialog-backdrop"
          onClick={() => setDriverModal(null)}
        >
          <div
            className="dialog-panel dialog-panel--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="dialog-title">
              {driverModal === "new"
                ? t("adminUsersNewDriverTitle")
                : t("adminUsersEditDriverTitle")}
            </h2>
            {driverModal !== "new" ? (
              <p
                className="label"
                style={{ margin: "0 0 16px", fontSize: 11.5 }}
              >
                {t("adminUsersServicePartnerId")} {driverModal}
              </p>
            ) : null}
            {driverModal !== "new"
              ? (() => {
                  const summary =
                    store.getServicePartnerProfileSummary(driverModal);
                  return (
                    <div
                      className="card"
                      style={{
                        padding: 12,
                        marginBottom: 16,
                        display: "flex",
                        gap: 18,
                        flexWrap: "wrap",
                        fontSize: 12.5,
                      }}
                    >
                      <span>
                        {t("adminUsersSummaryCompletedOrders")}:{" "}
                        <strong>{summary.completedOrders}</strong>
                      </span>
                      <span>
                        {t("adminUsersSummaryOpenDocReviews")}:{" "}
                        <strong>{summary.openDocumentReviews}</strong>
                      </span>
                      <span>
                        {t("adminUsersSummaryOpenChangeRequests")}:{" "}
                        <strong>{summary.openProfileChangeRequests}</strong>
                      </span>
                    </div>
                  );
                })()
              : null}
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
            <div className="dialog-actions">
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
    </div>
  );
};

/** Phase 7: permanent 7-section service-partner profile page, replacing
    the single edit modal as the primary "view a partner" surface — the
    edit modal remains for quick master-data edits from the list. */
const SP_PROFILE_TABS = [
  "overview",
  "masterdata",
  "documents",
  "orders",
  "changerequests",
  "notes",
  "audit",
];

const ServicePartnerProfileModal = ({ driver, onClose, showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [tab, setTab] = useStateA("overview");
  const [notesDraft, setNotesDraft] = useStateA(driver?.notes || "");
  const [rejectDocId, setRejectDocId] = useStateA(null);
  const [rejectReason, setRejectReason] = useStateA("");
  const fileInputRefs = useRefA({});

  if (!driver) return null;

  const summary = store.getServicePartnerProfileSummary(driver.id);
  const docs = store.getDriverDocuments(driver.id);
  const orders = store
    .getJobs()
    .filter((j) => j.driverId === driver.id || j.driver === driver.name);
  const changeRequests = store.listMasterDataChangeRequests({
    driverId: driver.id,
  });
  const auditEntries = store
    .getAuditLog()
    .filter((a) => a.actor === driver.name)
    .slice(0, 50);

  const docFor = (category) =>
    docs.find((d) => d.category === category && d.reviewStatus !== "replaced");

  const triggerUpload = (category) => {
    const input = fileInputRefs.current[category];
    input?.click();
  };

  const onFilePicked = (category) => (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = store.addDriverOnboardingDocument(driver.id, f, { category });
    if (r.ok) showToast?.(t("adminSPDocUpload"), f.name);
    else showToast?.(t("adminMasterDataSaveFailed"), r.reason || "");
  };

  const saveNotes = () => {
    const r = store.updateDriver(driver.id, { notes: notesDraft });
    if (r.ok) showToast?.(t("adminInvoiceSaved"), driver.name);
    else showToast?.(t("adminMasterDataSaveFailed"), r.reason || "");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--scrim-ink) 45%, transparent)",
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
        style={{
          maxWidth: 920,
          width: "100%",
          maxHeight: "88vh",
          display: "flex",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <aside
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: "1px solid var(--line)",
            padding: 16,
            overflow: "auto",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{driver.name}</div>
          <div
            className="mono label"
            style={{ fontSize: 11, marginBottom: 16 }}
          >
            {driver.id}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SP_PROFILE_TABS.map((id) => (
              <button
                key={id}
                type="button"
                className={"nav-item " + (tab === id ? "on" : "")}
                style={{ padding: "7px 10px", fontSize: 13, textAlign: "left" }}
                onClick={() => setTab(id)}
              >
                {
                  {
                    overview: t("adminSPProfileTabOverview"),
                    masterdata: t("adminSPProfileTabMasterData"),
                    documents: t("adminSPProfileTabDocuments"),
                    orders: t("adminSPProfileTabOrders"),
                    changerequests: t("adminSPProfileTabChangeRequests"),
                    notes: t("adminSPProfileTabNotes"),
                    audit: t("adminSPProfileTabAudit"),
                  }[id]
                }
              </button>
            ))}
          </div>
        </aside>
        <div style={{ flex: 1, padding: 22, overflow: "auto" }}>
          {tab === "overview" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div className="label">{t("adminSPProfileJoined")}</div>
                  <div>{driver.joinedAt || "—"}</div>
                </div>
                <div>
                  <div className="label">{t("adminSPProfileLastLogin")}</div>
                  <div>{driver.lastLoginAt || "—"}</div>
                </div>
                <div>
                  <div className="label">{t("adminMasterDataStatus")}</div>
                  <Pill
                    status={
                      driver.status === "Active" ? "accepted" : "cancelled"
                    }
                  >
                    {driver.status}
                  </Pill>
                </div>
                <div>
                  <div className="label">
                    {t("adminSPProfileProbationLimit")}
                  </div>
                  <div>{driver.probationJobLimit ?? "—"}</div>
                </div>
                <div>
                  <div className="label">
                    {t("adminSPProfileCompletedOrders")}
                  </div>
                  <div>{summary.completedOrders}</div>
                </div>
                <div>
                  <div className="label">
                    {t("adminSPProfileOpenDocReviews")}
                  </div>
                  <div>{summary.openDocumentReviews}</div>
                </div>
                <div>
                  <div className="label">
                    {t("adminSPProfileOpenChangeRequests")}
                  </div>
                  <div>{summary.openProfileChangeRequests}</div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "masterdata" ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div>
                <strong>{driver.name}</strong>
                {driver.legalForm ? ` (${driver.legalForm})` : ""}
              </div>
              <div>{driver.company}</div>
              <div>
                {[driver.street, driver.houseNumber].filter(Boolean).join(" ")}
                {", "}
                {[driver.postalCode, driver.city, driver.country]
                  .filter(Boolean)
                  .join(" ")}
              </div>
              <div className="mono">
                {[driver.phone, driver.secondPhone, driver.email]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div>
                {t("adminUsersFieldTaxStatus") || "Tax status"}:{" "}
                {driver.taxStatus || "—"} ·{" "}
                {t("adminUsersFieldVatId") || "VAT ID"}: {driver.vatId || "—"}
              </div>
              <div className="mono">IBAN: {driver.iban || "—"}</div>
            </div>
          ) : null}

          {tab === "documents" ? (
            <div style={{ display: "grid", gap: 14 }}>
              {AuthStore.DRIVER_DOC_CATEGORIES.map((category) => {
                const doc = docFor(category);
                return (
                  <div
                    key={category}
                    className="card"
                    style={{
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {t("adminSPDocCategory_" + category)}
                      </div>
                      {doc ? (
                        <div className="label" style={{ fontSize: 11.5 }}>
                          {doc.fileName} · v{doc.version}
                        </div>
                      ) : (
                        <div className="label" style={{ fontSize: 11.5 }}>
                          {t("adminSPDocNoneYet")}
                        </div>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {doc ? (
                        <Pill
                          status={
                            doc.reviewStatus === "accepted"
                              ? "accepted"
                              : doc.reviewStatus === "rejected"
                                ? "cancelled"
                                : "warn"
                          }
                        >
                          {doc.reviewStatus}
                        </Pill>
                      ) : null}
                      {doc && doc.reviewStatus === "uploaded" ? (
                        <>
                          <button
                            type="button"
                            className="btn xs primary"
                            onClick={() => {
                              const r = store.acceptDriverDocument(doc.id);
                              if (r.ok)
                                showToast?.(
                                  t("adminSPDocAccept"),
                                  doc.fileName,
                                );
                            }}
                          >
                            {t("adminSPDocAccept")}
                          </button>
                          <button
                            type="button"
                            className="btn xs danger"
                            onClick={() => {
                              setRejectDocId(doc.id);
                              setRejectReason("");
                            }}
                          >
                            {t("adminSPDocReject")}
                          </button>
                        </>
                      ) : null}
                      <input
                        ref={(el) => {
                          fileInputRefs.current[category] = el;
                        }}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: "none" }}
                        onChange={onFilePicked(category)}
                      />
                      <button
                        type="button"
                        className="btn xs"
                        onClick={() => triggerUpload(category)}
                      >
                        {doc ? t("adminSPDocReplace") : t("adminSPDocUpload")}
                      </button>
                    </div>
                  </div>
                );
              })}
              {rejectDocId ? (
                <div
                  className="card"
                  style={{
                    padding: 14,
                    border: "1px solid var(--danger, #c0392b)",
                  }}
                >
                  <label className="field-label">
                    {t("adminDocActionReasonLabel")}
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn xs"
                      onClick={() => setRejectDocId(null)}
                    >
                      {t("adminInvoiceCancel")}
                    </button>
                    <button
                      type="button"
                      className="btn xs danger"
                      disabled={!rejectReason.trim()}
                      onClick={() => {
                        const r = store.rejectDriverDocument(
                          rejectDocId,
                          rejectReason.trim(),
                        );
                        if (r.ok) {
                          showToast?.(t("adminSPDocReject"), "");
                          setRejectDocId(null);
                        }
                      }}
                    >
                      {t("adminSPDocReject")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "orders" ? (
            <div>
              {orders.length ? (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("adminColTour")}</th>
                      <th>{t("adminCustomersColCust")}</th>
                      <th>{t("adminMasterDataStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((j) => (
                      <tr key={j.id}>
                        <td className="mono">{j.tour}</td>
                        <td>{j.customer}</td>
                        <td>{j.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span className="label">{t("adminSPNoOrders")}</span>
              )}
            </div>
          ) : null}

          {tab === "changerequests" ? (
            <div>
              {changeRequests.length ? (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                  {changeRequests.map((r) => (
                    <li key={r.id} style={{ marginBottom: 10 }}>
                      <div>
                        <strong>{r.id}</strong> · {r.status} ·{" "}
                        {mdrChangeTypeLabel(r, t)}
                      </div>
                      <MasterDataChangeListChips row={r} t={t} />
                      {r.status === "open" ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          <button
                            type="button"
                            className="btn xs primary"
                            onClick={() => {
                              const res = store.resolveMasterDataChangeRequest(
                                r.id,
                                "approved",
                                "",
                              );
                              if (res.ok)
                                showToast?.(
                                  t("adminMdrApproved") || "Approved",
                                  r.id,
                                );
                            }}
                          >
                            {t("adminMdrApprove") || "Approve"}
                          </button>
                          <button
                            type="button"
                            className="btn xs danger"
                            onClick={() => {
                              const res = store.resolveMasterDataChangeRequest(
                                r.id,
                                "rejected",
                                "",
                              );
                              if (res.ok)
                                showToast?.(
                                  t("adminMdrRejected") || "Rejected",
                                  r.id,
                                );
                            }}
                          >
                            {t("adminMdrReject") || "Reject"}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="label">{t("adminSPNoChangeRequests")}</span>
              )}
            </div>
          ) : null}

          {tab === "notes" ? (
            <div>
              <textarea
                className="input"
                rows={6}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
              />
              <button
                type="button"
                className="btn primary"
                style={{ marginTop: 10 }}
                onClick={saveNotes}
              >
                {t("adminMasterDataSave")}
              </button>
            </div>
          ) : null}

          {tab === "audit" ? (
            <div>
              {auditEntries.length ? (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("adminAuditColTime")}</th>
                      <th>{t("adminAuditColAction")}</th>
                      <th>{t("adminAuditColEntity")}</th>
                      <th>{t("adminAuditColMeta")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map((a, i) => (
                      <tr key={i}>
                        <td className="mono">{a.at}</td>
                        <td>{a.action}</td>
                        <td>{a.entity}</td>
                        <td>{a.meta || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span className="label">{t("adminSPNoAuditEntries")}</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className="btn icon"
        style={{ position: "fixed", top: 24, right: 24 }}
        onClick={onClose}
        aria-label={t("close")}
      >
        <Ic.X />
      </button>
    </div>
  );
};

const StaffPane = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [adminModal, setAdminModal] = useStateA(null);
  const [adminForm, setAdminForm] = useStateA(emptyAdminEditForm());
  const [adminErrors, setAdminErrors] = useStateA({});
  const setAF = (k, v) => {
    setAdminForm((p) => ({ ...p, [k]: v }));
    setAdminErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openNewAdmin = () => {
    setAdminForm(emptyAdminEditForm());
    setAdminErrors({});
    setAdminModal("new");
  };

  const adminFormValid =
    Object.keys(validateAdminFormLocal(adminForm, t)).length === 0;

  // Create-only — matches FE staff table (no edit dialog in production admin)
  const saveAdmin = () => {
    const localErrors = validateAdminFormLocal(adminForm, t);
    if (Object.keys(localErrors).length) {
      setAdminErrors(localErrors);
      return;
    }
    const r = store.addAdmin(adminForm);
    if (!r.ok) {
      showToast?.(t("adminUsersSaveFailed"), userSaveErr(r, "admin", t));
      return;
    }
    setAdminModal(null);
    setAdminErrors({});
    if (r.access) {
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
    showToast?.(t("adminUsersToastInviteAdmin"), user.name);
  };

  // Client change plan Phase 8: self-deactivation and last-active-admin are
  // blocked by store.setAccountStatus itself (technical guard, not just a UI
  // check) — this wrapper turns those rejections into readable toasts and
  // adds the required confirmation step before deactivating someone else.
  const runAdminStatusChange = (admin, status) => {
    const result = store.setAccountStatus("admin", admin.id, status);
    if (!result.ok) {
      if (result.reason === "cannot_change_own_status") {
        showToast?.(t("adminCannotChangeOwnStatus"), admin.name);
      } else if (result.reason === "last_active_admin") {
        showToast?.(t("adminCannotDeactivateLastAdmin"), admin.name);
      } else {
        showToast?.(t("adminUsersSaveFailed"), admin.name);
      }
      return;
    }
    showToast?.(t("adminUsersToastAdminChanged"), admin.name);
  };

  const applyAdminStatus = (admin, status) => {
    const currentAdmin = store.getCurrentAdmin();
    const isSelf = currentAdmin && admin.id === currentAdmin.id;
    if (isSelf) {
      // store.setAccountStatus rejects this outright — surface the same
      // message without a confirm round-trip for something that can't
      // succeed either way.
      runAdminStatusChange(admin, status);
      return;
    }
    if (status === "Active") {
      // Reactivating someone isn't a destructive action — no confirmation
      // needed, matches "confirm before deactivating" (not every change).
      runAdminStatusChange(admin, status);
      return;
    }
    void window
      .requestAdminConfirm(
        t("adminDeactivateAdminConfirmBody", { name: admin.name }),
        {
          title: t("adminDeactivateAdminConfirmTitle", { name: admin.name }),
          destructive: true,
          confirmLabel: t("adminDeactivateAdminConfirmAction"),
        },
      )
      .then((ok) => {
        if (ok) runAdminStatusChange(admin, status);
      });
  };

  const handleDeleteAdmin = (admin) => {
    void window
      .requestAdminConfirm(
        t("adminDeleteAdminConfirmBody", { name: admin.name }),
        {
          title: t("adminDeleteAdminConfirmTitle", { name: admin.name }),
          destructive: true,
          confirmLabel: t("adminDeleteAdminConfirmAction"),
        },
      )
      .then((ok) => {
        if (!ok) return;
        const result = store.deleteAdmin(admin.id);
        if (!result.ok) {
          if (result.reason === "cannot_change_own_status") {
            showToast?.(t("adminCannotChangeOwnStatus"), admin.name);
          } else if (result.reason === "last_active_admin") {
            showToast?.(t("adminCannotDeactivateLastAdmin"), admin.name);
          } else {
            showToast?.(t("adminUsersSaveFailed"), admin.name);
          }
          return;
        }
        showToast?.(t("adminUsersDeleted"), admin.name);
      });
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
        {store.getAdmins().map((a, index) => (
          <div
            key={a.id}
            className={index < 4 ? "list-enter" : undefined}
            style={{
              padding: "14px 0",
              borderBottom: "1px solid var(--line)",
              ...(index < 4 ? { ["--list-enter-i"]: index } : null),
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
                <div className="label" style={{ fontSize: 9.5, marginTop: 3 }}>
                  {a.email}
                </div>
              </div>
              <Pill status={accountStatusPillVariant(a.status)}>
                {accountStatusLabel(a.status, t)}
              </Pill>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
                alignItems: "center",
              }}
            >
              {/* Client change plan Phase 8: hide the status controls on the
                  signed-in admin's own row rather than let them pick a
                  status and then show a blocked-toast — "hide unavailable
                  actions" applies here the same as the Phase 4 row menu. */}
              {store.getCurrentAdmin()?.id === a.id ? (
                <span className="label" style={{ fontSize: 11.5 }}>
                  {t("adminOwnAccountRowHint")}
                </span>
              ) : (
                <>
                  {a.status === "Invite failed" ||
                  a.status === "Pending verification" ? (
                    <button
                      type="button"
                      className="btn xs"
                      onClick={() => triggerResendAccess(a)}
                    >
                      {t("adminUsersResendInvite")}
                    </button>
                  ) : null}
                  {a.status === "Active" ? (
                    <button
                      type="button"
                      className="btn xs"
                      onClick={() => applyAdminStatus(a, "Suspended")}
                    >
                      {t("adminUsersSuspendAccount")}
                    </button>
                  ) : null}
                  {a.status === "Suspended" || a.status === "Inactive" ? (
                    <button
                      type="button"
                      className="btn xs"
                      onClick={() => applyAdminStatus(a, "Active")}
                    >
                      {t("adminUsersReactivateAccount")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn xs danger"
                    onClick={() => handleDeleteAdmin(a)}
                  >
                    {t("adminUsersDelete")}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      {adminModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="dialog-backdrop"
          onClick={() => setAdminModal(null)}
        >
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="dialog-title">{t("adminUsersNewAdminTitle")}</h2>
            <AdminUserFormFields
              form={adminForm}
              setF={setAF}
              errors={adminErrors}
              t={t}
            />
            <div className="dialog-actions">
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
    </div>
  );
};

const emptyCustomerForm = () => ({
  name: "",
  legalForm: "",
  type: "",
  contact: "",
  phone: "",
  email: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "D",
  billingNotes: "",
  instructions: "",
  active: true,
});

/** Minimal address block for the Customer form (street/postal/city/country only —
    contact person, phone, email, and notes are already top-level customer fields). */
const CustomerAddressFields = ({ form, setF }) => {
  const { t } = useI18n();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 80px", gap: 10 }}>
      <div>
        <label className="field-label">{t("adminMasterDataStreet")}</label>
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
          inputMode="numeric"
          value={form.houseNumber}
          onChange={(e) =>
            setF("houseNumber", e.target.value.replace(/\D/g, ""))
          }
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr 72px",
            gap: 10,
          }}
        >
          <div>
            <label className="field-label">{t("newOrderPlzPh")}</label>
            <input
              className="input mono"
              inputMode="numeric"
              maxLength={5}
              value={form.postalCode}
              onChange={(e) =>
                setF("postalCode", e.target.value.replace(/\D/g, ""))
              }
            />
          </div>
          <div>
            <label className="field-label">{t("newOrderCityPh")}</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setF("city", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{t("countryFieldLabel")}</label>
            <select
              className="input mono"
              value={AuthStore.normalizeCountrySign(form.country)}
              onChange={(e) => setF("country", e.target.value)}
            >
              {[...AuthStore.COUNTRY_SIGNS]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

const emptyAddressForm = () => ({
  label: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "D",
  contactPerson: "",
  phone: "",
  secondPhone: "",
  email: "",
  notes: "",
  active: true,
});

/** Keep only digits and a single leading "+" (for the country code). */
const sanitizePhone = (val) => {
  const plus = val.trimStart().startsWith("+") ? "+" : "";
  return plus + val.replace(/\D/g, "");
};

/** Shared address fields (same as Addresses master create/update). */
const AddressMasterFields = ({ form, setF }) => {
  const { t } = useI18n();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <label className="field-label">
          {t("adminMasterDataLocationName")} *
        </label>
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
            inputMode="numeric"
            value={form.houseNumber}
            onChange={(e) =>
              setF("houseNumber", e.target.value.replace(/\D/g, ""))
            }
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
            inputMode="numeric"
            maxLength={5}
            value={form.postalCode}
            onChange={(e) =>
              setF("postalCode", e.target.value.replace(/\D/g, ""))
            }
          />
          {(() => {
            const suggestion = AuthStore.suggestGermanTown(form.postalCode);
            return suggestion && suggestion !== form.city ? (
              <button
                type="button"
                className="btn ghost xs"
                style={{ marginTop: 4 }}
                onClick={() => setF("city", suggestion)}
              >
                {t("addressPlzSuggestion")}: {suggestion}
              </button>
            ) : null;
          })()}
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
          <label className="field-label">{t("countryFieldLabel")}</label>
          <select
            className="input mono"
            value={AuthStore.normalizeCountrySign(form.country)}
            onChange={(e) => setF("country", e.target.value)}
          >
            {[...AuthStore.COUNTRY_SIGNS]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setF("phone", sanitizePhone(e.target.value))}
          />
        </div>
      </div>
      <div>
        <label className="field-label">{t("adminMasterDataSecondPhone")}</label>
        <input
          className="input"
          inputMode="tel"
          value={form.secondPhone}
          onChange={(e) => setF("secondPhone", sanitizePhone(e.target.value))}
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label className="field-label">{t("adminMasterDataNotes")}</label>
          <select
            className="input xs"
            style={{ width: "auto", fontSize: 11.5 }}
            value=""
            onChange={(e) => {
              const key = e.target.value;
              if (!key) return;
              const wording = t(key);
              const existing = String(form.notes || "").trim();
              setF("notes", existing ? `${existing} ${wording}` : wording);
            }}
          >
            <option value="">{t("addStandardWording")}</option>
            {AuthStore.STANDARD_WORDINGS.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </select>
        </div>
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
    country: form[keys.country] || "D",
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
        {form[keys.showExtra] ? (
          <>
            <label className="field-label">{t("alternateContact")}</label>
            <input
              className="input"
              placeholder={t("alternateContact")}
              value={form[keys.alternateContact] || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  [keys.alternateContact]: e.target.value,
                }))
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
          </>
        ) : (
          <button
            type="button"
            className="btn ghost xs"
            onClick={() => setForm((f) => ({ ...f, [keys.showExtra]: true }))}
          >
            + {t("alternateContact")}
          </button>
        )}
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
      className="dialog-backdrop"
      onClick={onClose}
    >
      <div
        className="dialog-panel dialog-panel--md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
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

/** Phase 9: Customer Center merges Customers + Addresses under one nav
    entry with switchable views. Create-customer/create-address remain
    modals inside their respective view, consistent with every other
    master-data pane in this prototype. */
const CustomerCenterPane = ({ showToast, onOpenJob }) => {
  const { t } = useI18n();
  const [view, setView] = useStateA("customers");
  return (
    <div id="customercenter">
      <div className="tabs">
        {[
          ["customers", t("navCustomers") || "Customers"],
          ["addresses", t("navAddresses") || "Addresses"],
        ].map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={view === id ? "on" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setView(id)}
          >
            {lbl}
          </button>
        ))}
      </div>
      {view === "customers" ? (
        <CustomersPane showToast={showToast} onOpenJob={onOpenJob} />
      ) : (
        <AddressesPane showToast={showToast} />
      )}
    </div>
  );
};

const CustomersPane = ({ showToast, onOpenJob }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const customers = store.getCustomers();
  const jobs = store.getJobs ? store.getJobs() : [];
  const [modal, setModal] = useStateA(null);
  const [detailId, setDetailId] = useStateA(null);
  const [form, setForm] = useStateA(emptyCustomerForm());
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => {
    setForm(emptyCustomerForm());
    setModal("new");
  };
  const openEdit = (op) => {
    setForm({
      name: op.name || "",
      legalForm: op.legalForm || "",
      type: op.type || "",
      contact: op.contact || "",
      phone: op.phone || "",
      email: op.email || "",
      street: op.street || "",
      houseNumber: op.houseNumber || "",
      postalCode: op.postalCode || "",
      city: op.city || "",
      country: op.country || "D",
      billingNotes: op.billingNotes || "",
      instructions: op.instructions || "",
      active: op.active !== false,
    });
    setModal(op.id);
  };
  const closeModal = () => setModal(null);
  const detailCustomer = detailId
    ? customers.find((c) => c.id === detailId) || null
    : null;
  const detailJobs = detailCustomer
    ? jobs.filter((j) => j.customerId === detailCustomer.id)
    : [];
  // Client requirement (Phase 9): cross-reference which address-book entries
  // this customer has actually used for pickup/delivery, distinct from its
  // own master-data address — derived from linked orders' soft locationId
  // pointers (jobs store their own address snapshot independently).
  const detailUsedAddresses = (() => {
    if (!detailCustomer) return [];
    const seen = new Map();
    for (const j of detailJobs) {
      for (const side of ["pickup", "delivery"]) {
        const loc = j[side];
        const id = loc?.locationId;
        if (!id || seen.has(id)) continue;
        const addr = store.getAddress(id);
        seen.set(id, {
          id,
          label: addr?.label || loc.name || id,
          street: loc.street,
          houseNumber: loc.houseNumber,
          postalCode: loc.postalCode,
          city: loc.city,
          country: loc.country,
          side,
          deleted: !addr,
        });
      }
    }
    return [...seen.values()];
  })();

  const save = () => {
    const payload = { ...form };
    const r =
      modal === "new"
        ? store.addCustomer(payload)
        : store.updateCustomer(modal, payload);
    if (!r.ok) {
      showToast?.(
        t("adminMasterDataSaveFailed"),
        masterDataErr(r, t, "customer"),
      );
      return;
    }
    showToast?.(
      modal === "new"
        ? t("adminCustomersCreated")
        : t("adminMasterDataUpdated"),
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
      .requestAdminConfirm(t("adminMasterDataDeleteConfirm"), {
        destructive: true,
      })
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
            {customers.map((op, index) => (
              <tr
                key={op.id}
                className={index < 4 ? "list-enter" : undefined}
                style={index < 4 ? { ["--list-enter-i"]: index } : undefined}
              >
                <td>
                  <button
                    type="button"
                    className="btn ghost xs"
                    style={{
                      padding: 0,
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onClick={() => setDetailId(op.id)}
                  >
                    {op.name}
                  </button>
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
                    onClick={() => setDetailId(op.id)}
                  >
                    {t("adminMasterDataView") || t("adminMasterDataEdit")}
                  </button>
                  <button
                    type="button"
                    className="btn xs"
                    style={{ marginLeft: 6 }}
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
          <div className="dialog-actions">
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
          <div
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}
          >
            <div>
              <label className="field-label">{t("adminUsersColName")} *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">
                {t("adminUsersFieldLegalForm")}
              </label>
              <input
                className="input"
                placeholder="GmbH, e.K., …"
                value={form.legalForm}
                onChange={(e) => setF("legalForm", e.target.value)}
              />
            </div>
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
          <CustomerAddressFields form={form} setF={setF} />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label className="field-label">
                {t("adminMasterDataContact")}
              </label>
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
            <label className="field-label">
              {t("adminMasterDataBillingNotes")}
            </label>
            <textarea
              className="input"
              rows={2}
              value={form.billingNotes}
              onChange={(e) => setF("billingNotes", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">
              {t("adminMasterDataInstructions")}
            </label>
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
      <MasterDataModal
        open={!!detailCustomer}
        title={detailCustomer?.name || ""}
        onClose={() => setDetailId(null)}
        footer={
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
              onClick={() => setDetailId(null)}
            >
              {t("adminInvoiceCancel")}
            </button>
            {detailCustomer ? (
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  openEdit(detailCustomer);
                  setDetailId(null);
                }}
              >
                {t("adminMasterDataEdit")}
              </button>
            ) : null}
          </div>
        }
      >
        {detailCustomer ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div
                className="label"
                style={{ fontWeight: 600, marginBottom: 6 }}
              >
                {t("adminCustomerDetailMasterData")}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>
                  {detailCustomer.name}
                  {detailCustomer.legalForm
                    ? ` (${detailCustomer.legalForm})`
                    : ""}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)" }}
                >
                  {detailCustomer.id}
                </div>
                <div>{detailCustomer.type || "—"}</div>
                <Pill
                  status={
                    detailCustomer.active !== false ? "accepted" : "cancelled"
                  }
                >
                  {detailCustomer.active !== false
                    ? t("adminMasterDataActive")
                    : t("adminMasterDataInactive")}
                </Pill>
              </div>
            </div>
            <div>
              <div
                className="label"
                style={{ fontWeight: 600, marginBottom: 6 }}
              >
                {t("adminCustomerDetailAddress")}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {detailCustomer.street || detailCustomer.postalCode ? (
                  <>
                    <div>
                      {[detailCustomer.street, detailCustomer.houseNumber]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                    <div>
                      {[
                        detailCustomer.postalCode,
                        detailCustomer.city,
                        detailCustomer.country,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                  </>
                ) : (
                  <span className="label">—</span>
                )}
              </div>
            </div>
            <div>
              <div
                className="label"
                style={{ fontWeight: 600, marginBottom: 6 }}
              >
                {t("adminCustomerDetailUsedAddresses")} (
                {detailUsedAddresses.length})
              </div>
              {detailUsedAddresses.length ? (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                  {detailUsedAddresses.map((a) => (
                    <li key={`${a.side}-${a.id}`} style={{ marginBottom: 4 }}>
                      <span className="label" style={{ fontSize: 11 }}>
                        {a.side === "pickup" ? t("pickup") : t("delivery")}
                      </span>{" "}
                      {a.label} —{" "}
                      {[a.street, a.houseNumber].filter(Boolean).join(" ")},{" "}
                      {[a.postalCode, a.city].filter(Boolean).join(" ")}
                      {a.deleted ? (
                        <span
                          className="label"
                          style={{ marginLeft: 6, fontStyle: "italic" }}
                        >
                          ({t("adminCustomerDetailAddressDeleted")})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="label">—</span>
              )}
            </div>
            <div>
              <div
                className="label"
                style={{ fontWeight: 600, marginBottom: 6 }}
              >
                {t("adminCustomerDetailContactPersons")}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>{detailCustomer.contact || "—"}</div>
                <div className="mono" style={{ fontSize: 11.5 }}>
                  {[detailCustomer.phone, detailCustomer.email]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </div>
            <div>
              <div
                className="label"
                style={{ fontWeight: 600, marginBottom: 6 }}
              >
                {t("adminCustomerDetailOrders")} ({detailJobs.length})
              </div>
              {detailJobs.length ? (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("adminColTour")}</th>
                      <th>{t("adminMasterDataStatus")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailJobs.slice(0, 10).map((j) => (
                      <tr key={j.id}>
                        <td className="mono">{j.tourNumber || j.id}</td>
                        <td>{j.status}</td>
                        <td>
                          <button
                            type="button"
                            className="btn xs"
                            onClick={() => {
                              setDetailId(null);
                              onOpenJob?.(j);
                            }}
                          >
                            {t("adminMasterDataView") || t("view")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span className="label">—</span>
              )}
            </div>
            <div>
              <div
                className="label"
                style={{ fontWeight: 600, marginBottom: 6 }}
              >
                {t("adminMasterDataBillingNotes")}
              </div>
              <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                {detailCustomer.billingNotes || "—"}
              </div>
            </div>
            <div>
              <div
                className="label"
                style={{ fontWeight: 600, marginBottom: 6 }}
              >
                {t("adminCustomerDetailRelationshipStart")}
              </div>
              <div style={{ fontSize: 13 }}>
                {detailCustomer.joinedAt || "—"}
              </div>
            </div>
            <div>
              <div
                className="label"
                style={{ fontWeight: 600, marginBottom: 6 }}
              >
                {t("adminCustomerDetailChangeHistory")}
              </div>
              {Array.isArray(detailCustomer.changeHistory) &&
              detailCustomer.changeHistory.length ? (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                  {detailCustomer.changeHistory.slice(0, 8).map((c, i) => (
                    <li key={i}>
                      {c.at} — {c.by} —{" "}
                      {Array.isArray(c.fields) ? c.fields.join(", ") : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="label">—</span>
              )}
            </div>
          </div>
        ) : null}
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
      country: a.country || "D",
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
    const confirmMsg =
      used > 0
        ? t("adminMasterDataAddressInUseConfirm", { count: used })
        : t("adminMasterDataDeleteConfirm");
    void window
      .requestAdminConfirm(confirmMsg, {
        destructive: true,
      })
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
            {list.map((a, index) => (
              <tr
                key={a.id}
                className={index < 4 ? "list-enter" : undefined}
                style={index < 4 ? { ["--list-enter-i"]: index } : undefined}
              >
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
                  <div style={{ fontWeight: 600 }}>
                    {a.contactPerson || "—"}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 11.5, marginTop: 2 }}
                  >
                    {a.phone || "—"}
                  </div>
                  {a.email ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginTop: 2,
                      }}
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
          <div className="dialog-actions">
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
  // No publication-date field: production stamps `publishedAt` server-side.
  const [newsForm, setNewsForm] = useStateA({
    title: "",
    body: "",
    notifyInApp: true,
    notifyPush: false,
  });
  const [editNews, setEditNews] = useStateA(null);
  const [editNewsForm, setEditNewsForm] = useStateA({ title: "", body: "" });
  const [docModal, setDocModal] = useStateA(null);
  const [docForm, setDocForm] = useStateA({
    title: "",
    description: "",
    category: "Operations",
  });
  const [editDoc, setEditDoc] = useStateA(null);
  const [editDocForm, setEditDocForm] = useStateA({
    title: "",
    description: "",
    category: "Operations",
  });
  const [pendingDelete, setPendingDelete] = useStateA(null);
  const docFileRef = useRefA(null);
  const [docFile, setDocFile] = useStateA(null);
  const replaceInputRef = useRefA(null);
  // Held in a ref, not state: the click on the hidden input and the change event
  // are one user gesture, so there is no render in between to read state from.
  const replaceTargetRef = useRefA(null);

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
      notifyInApp: newsForm.notifyInApp,
      notifyPush: newsForm.notifyPush,
    });
    showToast?.(t("adminInfopointPublishedToast"), item.title);
    setNewsForm({ title: "", body: "", notifyInApp: true, notifyPush: false });
  };

  const openEditNews = (item) => {
    setEditNews(item.id);
    setEditNewsForm({ title: item.title, body: item.body });
  };

  const saveEditNews = () => {
    if (!editNewsForm.title.trim() || !editNewsForm.body.trim()) return;
    const r = store.updateNewsItem(editNews, editNewsForm);
    if (!r.ok) return;
    showToast?.(t("adminInfopointNewsUpdated"), editNewsForm.title);
    setEditNews(null);
  };

  const toggleNewsVisibility = (n) => {
    // The store hands back live objects, so the set-visibility call flips
    // `n.visible` underneath us — read it before, not after.
    const wasVisible = n.visible;
    const r = wasVisible ? store.hideNewsItem(n.id) : store.showNewsItem(n.id);
    if (!r.ok) return;
    showToast?.(
      wasVisible ? t("adminInfopointNewsHidden") : t("adminInfopointNewsShown"),
      n.title,
    );
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

  const openEditDoc = (d) => {
    setEditDoc(d.id);
    setEditDocForm({
      title: d.title,
      description: d.description || "",
      category: d.category || "Operations",
    });
  };

  const saveEditDoc = () => {
    if (!editDocForm.title.trim()) return;
    const r = store.updateGeneralDocument(editDoc, editDocForm);
    if (!r.ok) return;
    showToast?.(t("adminInfopointDocUpdated"), editDocForm.title);
    setEditDoc(null);
  };

  const onReplacePick = (d) => {
    replaceTargetRef.current = d;
    replaceInputRef.current?.click();
  };

  const onReplaceFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!file || !target) return;
    const r = store.replaceDocument(target.id);
    if (!r.ok) return;
    showToast?.(t("adminDocumentsReplaced"), target.title);
  };

  const toggleDocVisibility = (d) => {
    // Same live-object caveat as the news toggle: capture before the flip.
    const wasVisible = d.visible;
    const r = store.toggleDocument(d.id);
    if (!r.ok) return;
    showToast?.(
      wasVisible ? t("adminInfopointDocHidden") : t("adminInfopointDocShown"),
      d.title,
    );
  };

  const confirmDeleteDoc = () => {
    if (!pendingDelete) return;
    const r = store.deleteGeneralDocument(pendingDelete.id);
    if (!r.ok) return;
    showToast?.(t("adminInfopointDocDeleted"), pendingDelete.title);
    setPendingDelete(null);
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
        ref={replaceInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: "none" }}
        onChange={onReplaceFile}
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
          {docs.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 12 }}>
              <p className="empty-state-title">
                {t("adminInfopointDocsEmptyTitle")}
              </p>
              <p className="empty-state-desc">
                {t("adminInfopointDocsEmptyDesc")}
              </p>
            </div>
          ) : (
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
                {docs.map((d, index) => (
                  <tr
                    key={d.id}
                    className={index < 4 ? "list-enter" : undefined}
                    style={
                      index < 4 ? { ["--list-enter-i"]: index } : undefined
                    }
                  >
                    <td>
                      <strong>{d.title}</strong>
                    </td>
                    <td
                      style={{
                        fontSize: 12.5,
                        color: "var(--muted)",
                        maxWidth: 220,
                      }}
                    >
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
                        onClick={() => openEditDoc(d)}
                      >
                        {t("adminMasterDataEdit")}
                      </button>
                      <button
                        type="button"
                        className="btn xs"
                        style={{ marginLeft: 6 }}
                        onClick={() => onReplacePick(d)}
                      >
                        {t("adminDocReplace")}
                      </button>
                      <button
                        type="button"
                        className="btn xs"
                        style={{ marginLeft: 6 }}
                        onClick={() => toggleDocVisibility(d)}
                      >
                        {d.visible ? t("adminDocHide") : t("adminDocShow")}
                      </button>
                      <button
                        type="button"
                        className="btn xs danger"
                        style={{ marginLeft: 6 }}
                        onClick={() => setPendingDelete(d)}
                      >
                        {t("adminMasterDataDelete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <>
          <section className="card" style={{ padding: 22, marginTop: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
              {t("adminInfopointPublishTitle")}
            </h2>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div>
                <label className="field-label">
                  {t("adminInfopointSubject")} *
                </label>
                <input
                  className="input"
                  value={newsForm.title}
                  onChange={(e) =>
                    setNewsForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label">
                  {t("adminInfopointMessage")} *
                </label>
                <textarea
                  className="input"
                  rows={5}
                  value={newsForm.body}
                  onChange={(e) =>
                    setNewsForm((f) => ({ ...f, body: e.target.value }))
                  }
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={newsForm.notifyInApp}
                  onChange={(e) =>
                    setNewsForm((f) => ({
                      ...f,
                      notifyInApp: e.target.checked,
                    }))
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
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={publishNews}
                >
                  {t("adminInfopointPublishButton")}
                </button>
              </div>
            </div>
          </section>

          <h2 style={{ margin: "24px 0 0", fontSize: 17, fontWeight: 600 }}>
            {t("adminInfopointNewsListTitle")}
          </h2>
          {news.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 12 }}>
              <p className="empty-state-title">
                {t("adminInfopointNewsEmptyTitle")}
              </p>
              <p className="empty-state-desc">
                {t("adminInfopointNewsEmptyDesc")}
              </p>
            </div>
          ) : (
            <table className="tbl" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>{t("adminInfopointSubject")}</th>
                  <th>{t("adminInfopointPublishDate")}</th>
                  <th>{t("adminInfopointColRead")}</th>
                  <th>{t("adminDocumentsColVis")}</th>
                  <th>{t("adminDocumentsColAct")}</th>
                </tr>
              </thead>
              <tbody>
                {news.map((n, index) => (
                  <tr
                    key={n.id}
                    className={index < 4 ? "list-enter" : undefined}
                    style={
                      index < 4 ? { ["--list-enter-i"]: index } : undefined
                    }
                  >
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
                      {t("adminInfopointReadCount", {
                        count: n.readBy?.length || 0,
                      })}
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
                        onClick={() => toggleNewsVisibility(n)}
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
          )}
        </>
      )}

      <MasterDataModal
        open={!!docModal}
        title={t("adminInfopointAddDoc")}
        onClose={closeDocModal}
        footer={
          <div className="dialog-actions">
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
            <label className="field-label">
              {t("adminInfopointDocTitle")} *
            </label>
            <input
              className="input"
              value={docForm.title}
              onChange={(e) =>
                setDocForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">
              {t("adminInfopointDocDescription")}
            </label>
            <input
              className="input"
              value={docForm.description}
              onChange={(e) =>
                setDocForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">
              {t("adminInfopointDocCategory")}
            </label>
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
              {t("adminInfopointDocFile")} *
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
                style={{
                  margin: "8px 0 0",
                  fontSize: 12.5,
                  wordBreak: "break-all",
                }}
              >
                {docFile.name}
              </p>
            ) : null}
            <p className="label" style={{ margin: "6px 0 0", fontSize: 12 }}>
              {t("adminInfopointDocFileHint")}
            </p>
          </div>
        </div>
      </MasterDataModal>

      <MasterDataModal
        open={!!editDoc}
        title={t("adminInfopointEditDocTitle")}
        onClose={() => setEditDoc(null)}
        footer={
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setEditDoc(null)}
            >
              {t("adminInvoiceCancel")}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!editDocForm.title.trim()}
              onClick={saveEditDoc}
            >
              {t("adminMasterDataSave")}
            </button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="field-label">
              {t("adminInfopointDocTitle")} *
            </label>
            <input
              className="input"
              value={editDocForm.title}
              onChange={(e) =>
                setEditDocForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">
              {t("adminInfopointDocDescription")}
            </label>
            <input
              className="input"
              value={editDocForm.description}
              onChange={(e) =>
                setEditDocForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">
              {t("adminInfopointDocCategory")}
            </label>
            <select
              className="input"
              value={editDocForm.category}
              onChange={(e) =>
                setEditDocForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              {INFOPOINT_DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </MasterDataModal>

      <MasterDataModal
        open={!!pendingDelete}
        title={t("adminInfopointDeleteDocTitle")}
        onClose={() => setPendingDelete(null)}
        footer={
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setPendingDelete(null)}
            >
              {t("adminInvoiceCancel")}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={confirmDeleteDoc}
            >
              {t("adminMasterDataDelete")}
            </button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: 14 }}>
          {t("adminInfopointDeleteDocConfirm", {
            title: pendingDelete?.title || "",
          })}
        </p>
      </MasterDataModal>

      <MasterDataModal
        open={!!editNews}
        title={t("adminInfopointEditNewsTitle")}
        onClose={() => setEditNews(null)}
        footer={
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setEditNews(null)}
            >
              {t("adminInvoiceCancel")}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!editNewsForm.title.trim() || !editNewsForm.body.trim()}
              onClick={saveEditNews}
            >
              {t("adminMasterDataSave")}
            </button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="field-label">
              {t("adminInfopointSubject")} *
            </label>
            <input
              className="input"
              value={editNewsForm.title}
              onChange={(e) =>
                setEditNewsForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">
              {t("adminInfopointMessage")} *
            </label>
            <textarea
              className="input"
              rows={5}
              value={editNewsForm.body}
              onChange={(e) =>
                setEditNewsForm((f) => ({ ...f, body: e.target.value }))
              }
            />
          </div>
        </div>
      </MasterDataModal>
    </div>
  );
};

const DocumentsPane = InfopointPane;

const CONSOLIDATED_INVOICE_STATUS_LABEL_KEY = {
  in_review: "docReviewUnderReview",
  correction_required: "docReviewCorrectionRequired",
  rejected: "docReviewRejected",
  completed: "adminMasterDataActive",
};

/** Phase 12: consolidated invoices span multiple completed tours — a
    distinct entity from per-tour documents, with its own status enum
    (in review / correction required / rejected / completed). */
const ConsolidatedInvoicesPane = ({ showToast, onOpenJob }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const jobs = store.getJobs();
  const invoices = store.getConsolidatedInvoices();
  const [search, setSearch] = useStateA("");
  const [pickedJobIds, setPickedJobIds] = useStateA(() => new Set());
  const [invNum, setInvNum] = useStateA("");
  const [amount, setAmount] = useStateA("");
  const [file, setFile] = useStateA(null);
  const fileRef = useRefA(null);
  const [actionId, setActionId] = useStateA(null);
  const [actionReason, setActionReason] = useStateA("");
  const [actionNote, setActionNote] = useStateA("");

  const completedTours = useMemoA(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((j) => j.status === "performed")
      .filter(
        (j) =>
          !q ||
          j.tour?.toLowerCase().includes(q) ||
          j.customer?.toLowerCase().includes(q),
      );
  }, [jobs, search]);

  const togglePick = (jobId) => {
    setPickedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const pickedJobs = jobs.filter((j) => pickedJobIds.has(j.id));
  const driverOfferSum = pickedJobs.reduce(
    (sum, j) => sum + (Number(j.driverOffer) || 0),
    0,
  );
  const amountNum = Number(amount);
  const amountMismatch =
    pickedJobs.length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    Math.abs(amountNum - driverOfferSum) > 0.01;

  const resetForm = () => {
    setPickedJobIds(new Set());
    setInvNum("");
    setAmount("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const createErr = (r) => {
    if (!r || r.ok) return "";
    const reason = r.reason;
    if (reason === "no_tours_selected") return t("ciErrNoTours");
    if (reason === "no_file") return t("ciErrNoFile");
    if (reason === "invalid_type") return t("invoiceUploadInvalidType");
    if (reason === "no_invoice_id") return t("ciErrNoInvoiceNumber");
    if (reason === "invalid_amount") return t("ciErrInvalidAmount");
    if (reason === "tour_already_invoiced") return t("ciErrAlreadyInvoiced");
    if (reason === "tour_not_completed") return t("ciErrNotCompleted");
    return t("adminInvoiceErrGeneric");
  };

  const submitCreate = () => {
    const r = store.createConsolidatedInvoice({
      jobIds: [...pickedJobIds],
      file,
      supplierInvoiceNumber: invNum.trim(),
      amount: amountNum,
    });
    if (!r.ok) {
      showToast?.(t("adminMasterDataSaveFailed"), createErr(r));
      return;
    }
    showToast?.(t("ciCreated"), r.invoice.supplierInvoiceNumber);
    resetForm();
  };

  const acting = actionId ? store.getConsolidatedInvoice(actionId) : null;
  const openAction = (inv) => {
    setActionId(inv.id);
    setActionReason("");
    setActionNote("");
  };
  const closeAction = () => {
    setActionId(null);
    setActionReason("");
    setActionNote("");
  };
  const submitAction = (kind) => {
    if (!acting) return;
    const reason = actionReason.trim();
    if (!reason) return;
    const opts = { reason, internalNote: actionNote.trim() };
    const r =
      kind === "reject"
        ? store.rejectConsolidatedInvoice(acting.id, opts)
        : store.requireConsolidatedInvoiceCorrection(acting.id, opts);
    if (r.ok) {
      showToast?.(
        kind === "reject"
          ? t("adminDocRejected")
          : t("adminDocCorrectionRequired"),
        acting.supplierInvoiceNumber,
      );
      closeAction();
    } else showToast?.(t("adminInvoiceErrGeneric"));
  };

  return (
    <div id="consolidated-invoices">
      <p className="pane-lead">{t("ciDesc")}</p>

      <section className="card" style={{ padding: 18, marginTop: 12 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>
          {t("ciCreateTitle")}
        </h3>
        <div>
          <label className="field-label" htmlFor="ci-search">
            {t("ciSelectTours")}
          </label>
          <input
            id="ci-search"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ciSearchToursPh")}
            style={{ marginBottom: 8 }}
          />
          <div
            style={{
              maxHeight: 220,
              overflow: "auto",
              border: "1px solid var(--line)",
              borderRadius: 10,
            }}
          >
            <table className="tbl">
              <thead>
                <tr>
                  <th></th>
                  <th>{t("adminColTour")}</th>
                  <th>{t("adminCustomersColCust")}</th>
                  <th>{t("adminInvoiceDriverOffer") || "Driver offer"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {completedTours.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="label" style={{ padding: 14 }}>
                      {t("ciNoCompletedTours")}
                    </td>
                  </tr>
                ) : (
                  completedTours.map((j) => {
                    const alreadyInvoiced =
                      store.countActiveInvoicesForJob(j.id) > 0;
                    return (
                      <tr key={j.id}>
                        <td>
                          <input
                            type="checkbox"
                            disabled={alreadyInvoiced}
                            checked={pickedJobIds.has(j.id)}
                            onChange={() => togglePick(j.id)}
                            aria-label={j.tour}
                          />
                        </td>
                        <td className="mono">{j.tour}</td>
                        <td>{j.customer}</td>
                        <td className="mono">
                          {j.driverOffer != null
                            ? j.driverOffer.toFixed(2)
                            : "—"}
                        </td>
                        <td className="label" style={{ fontSize: 11.5 }}>
                          {alreadyInvoiced ? t("ciAlreadyInvoiced") : ""}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div>
            <label className="field-label" htmlFor="ci-invnum">
              {t("adminSupplierInvoiceNumberLabel")}
            </label>
            <input
              id="ci-invnum"
              className="input"
              value={invNum}
              onChange={(e) => setInvNum(e.target.value)}
              placeholder={t("adminSupplierInvoiceNumberPlaceholder")}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="ci-amount">
              {t("ciInvoiceAmount")}
            </label>
            <input
              id="ci-amount"
              className="input mono"
              inputMode="decimal"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.,]/g, ""))
              }
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="field-label">
              {t("adminInvoiceUploadLabel")}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="btn"
              onClick={() => fileRef.current?.click()}
            >
              <Ic.Plus /> {t("adminInvoiceUploadButton")}
            </button>
            {file ? (
              <p
                className="label mono"
                style={{ margin: "6px 0 0", fontSize: 11.5 }}
              >
                {file.name}
              </p>
            ) : null}
          </div>
        </div>

        {pickedJobs.length > 0 ? (
          <p
            className="label"
            style={{
              marginTop: 12,
              fontSize: 12.5,
              color: amountMismatch ? "var(--danger, #c0392b)" : undefined,
            }}
          >
            {t("ciDriverOfferSum")}: {driverOfferSum.toFixed(2)}
            {amountMismatch ? ` · ${t("ciAmountMismatch")}` : ""}
          </p>
        ) : null}

        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn primary"
            disabled={
              pickedJobIds.size === 0 ||
              !file ||
              !invNum.trim() ||
              !(amountNum > 0)
            }
            onClick={submitCreate}
          >
            {t("ciCreateAction")}
          </button>
        </div>
      </section>

      <section className="card" style={{ padding: 18, marginTop: 18 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>{t("ciListTitle")}</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("adminSupplierInvoiceNumberLabel")}</th>
              <th>{t("ciTourCount")}</th>
              <th>{t("ciInvoiceAmount")}</th>
              <th>{t("invoiceColUploaded")}</th>
              <th>{t("billingColReview")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="label" style={{ padding: 14 }}>
                  {t("ciListEmpty")}
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const pending =
                  inv.status === "in_review" ||
                  inv.status === "correction_required";
                return (
                  <tr key={inv.id}>
                    <td className="mono">{inv.supplierInvoiceNumber}</td>
                    <td>
                      {inv.jobIds.length}
                      <div className="label" style={{ fontSize: 10.5 }}>
                        {inv.jobIds
                          .map(
                            (id) => jobs.find((j) => j.id === id)?.tour || id,
                          )
                          .join(", ")}
                      </div>
                    </td>
                    <td className="mono">
                      {inv.amount.toFixed(2)}
                      {inv.amountMismatch ? (
                        <div
                          className="label"
                          style={{
                            fontSize: 10.5,
                            color: "var(--danger, #c0392b)",
                          }}
                        >
                          {t("ciAmountMismatch")} (
                          {inv.driverOfferSum.toFixed(2)})
                        </div>
                      ) : null}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {inv.createdAt || "—"}
                    </td>
                    <td>
                      <Pill
                        status={
                          inv.status === "completed"
                            ? "accepted"
                            : inv.status === "rejected"
                              ? "cancelled"
                              : "warn"
                        }
                      >
                        {t(CONSOLIDATED_INVOICE_STATUS_LABEL_KEY[inv.status])}
                      </Pill>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {pending ? (
                        <>
                          <button
                            type="button"
                            className="btn xs primary"
                            onClick={() => {
                              const r = store.acceptConsolidatedInvoice(inv.id);
                              if (r.ok)
                                showToast?.(
                                  t("adminDocAccepted"),
                                  inv.supplierInvoiceNumber,
                                );
                            }}
                          >
                            {t("adminDocAccept")}
                          </button>
                          <button
                            type="button"
                            className="btn xs danger"
                            style={{ marginLeft: 6 }}
                            onClick={() => openAction(inv)}
                          >
                            {t("adminDocFlagIssue")}
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <MasterDataModal
        open={!!acting}
        title={t("adminDocActionDialogTitle")}
        onClose={closeAction}
        footer={
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <button type="button" className="btn" onClick={closeAction}>
              {t("adminInvoiceCancel")}
            </button>
            <button
              type="button"
              className="btn warn"
              disabled={!actionReason.trim()}
              onClick={() => submitAction("correction")}
            >
              {t("adminDocActionRequireCorrection")}
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={!actionReason.trim()}
              onClick={() => submitAction("reject")}
            >
              {t("adminDocActionReject")}
            </button>
          </div>
        }
      >
        {acting ? (
          <div style={{ display: "grid", gap: 12 }}>
            <p className="label" style={{ margin: 0, fontSize: 13 }}>
              {acting.supplierInvoiceNumber} · {acting.jobIds.length}{" "}
              {t("ciTourCount")}
            </p>
            <div>
              <label className="field-label" htmlFor="ci-action-reason">
                {t("adminDocActionReasonLabel")} *
              </label>
              <textarea
                id="ci-action-reason"
                className="input"
                rows={2}
                autoFocus
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ci-action-note">
                {t("adminDocActionNoteLabel")}
              </label>
              <textarea
                id="ci-action-note"
                className="input"
                rows={2}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </MasterDataModal>
    </div>
  );
};

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
  const [regJobId, setRegJobId] = useStateA(() => store.getJobs()[0]?.id ?? "");
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
  const [hideCompleted, setHideCompleted] = useStateA(false);
  const visibleUploads = useMemoA(() => {
    let list = scopedUploads;
    if (filterType) list = list.filter((u) => u.documentType === filterType);
    if (filterReview)
      list = list.filter((u) => u.reviewStatus === filterReview);
    if (filterSource) list = list.filter((u) => u.source === filterSource);
    if (hideCompleted) {
      list = list.filter((u) => {
        const j = jobs.find((x) => x.id === u.jobId);
        return (j?.documentReviewSummary || "") !== "Accepted";
      });
    }
    return list;
  }, [
    scopedUploads,
    filterType,
    filterReview,
    filterSource,
    hideCompleted,
    jobs,
  ]);
  const filtersActive = !!(
    filterType ||
    filterReview ||
    filterSource ||
    hideCompleted
  );
  const resetFilters = () => {
    setFilterType("");
    setFilterReview("");
    setFilterSource("");
    setHideCompleted(false);
  };
  // Client requirement: group Tour Documents by tour first, then by document
  // type, with open/incomplete tours surfaced before fully-accepted ones.
  const groupedByTour = useMemoA(() => {
    const groups = new Map();
    for (const u of visibleUploads) {
      const key = u.jobId || "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(u);
    }
    const rows = [...groups.entries()].map(([jobId, docs]) => {
      const job =
        jobId !== "__none__" ? jobs.find((j) => j.id === jobId) : null;
      const status = job?.documentReviewSummary || "Not Started";
      const liveDocs = docs.filter((d) => d.reviewStatus !== "replaced");
      const missingTypes = EXPECTED_TOUR_DOC_TYPES.filter(
        (type) =>
          !liveDocs.some(
            (d) => AuthStore.normalizeTourDocumentType(d.documentType) === type,
          ),
      );
      return {
        jobId,
        job,
        status,
        missingTypes,
        docs: [...docs].sort((a, b) =>
          String(a.documentType || "").localeCompare(
            String(b.documentType || ""),
          ),
        ),
      };
    });
    rows.sort((a, b) => {
      const aDone = a.status === "Accepted" ? 1 : 0;
      const bDone = b.status === "Accepted" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return (b.job?.tour || "").localeCompare(a.job?.tour || "");
    });
    return rows;
  }, [visibleUploads, jobs]);
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
        in_review: t("docReviewUnderReview"),
        accepted: t("docReviewAccepted"),
        rejected: t("docReviewRejected"),
        correction_required: t("docReviewCorrectionRequired"),
        replaced: t("docReviewReplaced"),
      }[code] ||
      code ||
      "—"
    );
  };

  const reviewPillStatus = (st) => {
    const code = AuthStore.normalizeTourDocumentReviewStatus(st);
    if (code === "accepted") return "accepted";
    if (code === "rejected" || code === "correction_required")
      return "cancelled";
    if (code === "uploaded" || code === "in_review") return "warn";
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
    if (reason === "no_invoice_id")
      return t("adminInvoiceErrInvoiceIdRequired");
    if (reason === "already_accepted") return t("adminDocErrAlreadyAccepted");
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

  const [actionDocId, setActionDocId] = useStateA(null);
  const [actionReason, setActionReason] = useStateA("");
  const [actionNote, setActionNote] = useStateA("");
  const [actionVisible, setActionVisible] = useStateA(true);
  const actionDoc = actionDocId
    ? uploads.find((u) => u.id === actionDocId)
    : null;
  const openActionDialog = (u) => {
    setActionDocId(u.id);
    setActionReason("");
    setActionNote("");
    setActionVisible(true);
  };
  const closeActionDialog = () => {
    setActionDocId(null);
    setActionReason("");
    setActionNote("");
    setActionVisible(true);
  };
  const submitDocAction = (kind) => {
    if (!actionDoc) return;
    const reason = actionReason.trim();
    if (!reason) return;
    const opts = {
      reason,
      internalNote: actionNote.trim(),
      visibleToPartner: actionVisible,
    };
    const r =
      kind === "reject"
        ? store.rejectTourDocument(actionDoc.id, opts)
        : store.requireTourDocumentCorrection(actionDoc.id, opts);
    if (r.ok) {
      showToast?.(
        kind === "reject"
          ? t("adminDocRejected") || "Rejected"
          : t("adminDocCorrectionRequired"),
        actionDoc.fileName,
      );
      closeActionDialog();
    } else showToast?.(invoiceActionErr(r));
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
    setEditForm((p) => (p ? { ...p, replaceFile: f, fileName: f.name } : p));
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
        <div
          style={{
            marginTop: -6,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
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

      <details className="card status-explain" style={{ marginTop: 16 }}>
        <summary className="status-explain-summary">
          {t("docStatusExplainTitle")}
        </summary>
        <div className="status-explain-body">
          <ul className="status-explain-list" role="list">
            {[
              "uploaded",
              "in_review",
              "accepted",
              "correction_required",
              "rejected",
              "replaced",
            ].map((code) => (
              <li key={code}>
                <span className="status-explain-pill">
                  <Pill status={reviewPillStatus(code)}>
                    {displayDocReviewStatus(code)}
                  </Pill>
                </span>
                <p className="status-explain-text">
                  {t("docStatusExplain." + code)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </details>

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
            <option value="in_review">{t("docReviewUnderReview")}</option>
            <option value="accepted">{t("docReviewAccepted")}</option>
            <option value="rejected">{t("docReviewRejected")}</option>
            <option value="correction_required">
              {t("docReviewCorrectionRequired")}
            </option>
            <option value="replaced">{t("docReviewReplaced")}</option>
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
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
            />
            {t("billingHideCompleted")}
          </label>
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
          className="dialog-backdrop"
          onClick={closeRegister}
        >
          <div
            className="dialog-panel dialog-panel--md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reg-invoice-title" className="dialog-title">
              {t("adminTourDocRegisterTitle")}
            </h2>
            <p className="dialog-desc">{t("adminTourDocRegisterHint")}</p>
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
                    style={{
                      margin: "8px 0 0",
                      fontSize: 12.5,
                      wordBreak: "break-all",
                    }}
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
            <div className="dialog-actions dialog-actions--row">
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
            <th>{t("invoiceColUploaded")}</th>
            <th>{t("adminInvoiceColSource")}</th>
            <th>{t("billingColReview")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {groupedByTour.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="label"
                style={{ padding: "22px 12px" }}
              >
                {filtersActive
                  ? t("billingFilterEmpty")
                  : t("invoiceUploadEmpty")}
              </td>
            </tr>
          ) : (
            groupedByTour.map((group) => (
              <React.Fragment key={group.jobId}>
                <tr className="tbl-group-row">
                  <td colSpan={8} style={{ background: "var(--paper-2)" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        padding: "4px 2px",
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>
                        {group.job
                          ? `${group.job.tour} · ${group.job.customer}`
                          : t("invoiceJobNone")}
                      </strong>
                      <Pill
                        status={
                          group.status === "Accepted"
                            ? "accepted"
                            : group.status === "Rejected" ||
                                group.status === "Correction Required"
                              ? "cancelled"
                              : "warn"
                        }
                      >
                        {group.status}
                      </Pill>
                      {group.missingTypes.map((type) => (
                        <Pill key={type} status="cancelled">
                          {t("adminDocMissing")}: {displayTourDocType(type, t)}
                        </Pill>
                      ))}
                      {group.job && onOpenJob ? (
                        <button
                          type="button"
                          className="btn xs"
                          onClick={() => onOpenJob(group.job.id)}
                        >
                          {t("adminOpenTourFromInvoice")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {group.docs.map((u, index) => {
                  const actions = AuthStore.tourDocumentReviewActions(
                    u.reviewStatus,
                  );
                  return (
                    <tr
                      key={u.id}
                      className={index < 4 ? "list-enter" : undefined}
                      style={
                        index < 4 ? { ["--list-enter-i"]: index } : undefined
                      }
                      onClick={() => {
                        setViewId(u.id);
                        store.markTourDocumentInReview(u.id);
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
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
                      <td
                        style={{ whiteSpace: "nowrap" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn xs"
                          onClick={() => {
                            setViewId(u.id);
                            store.markTourDocumentInReview(u.id);
                          }}
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
                        {actions.canReject || actions.canRequireCorrection ? (
                          <button
                            type="button"
                            className="btn xs danger"
                            style={{ marginLeft: 6 }}
                            onClick={() => openActionDialog(u)}
                          >
                            {t("adminDocFlagIssue")}
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
                })}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>

      {false && editId && editForm && (
        <div
          role="dialog"
          aria-modal="true"
          className="dialog-backdrop"
          onClick={closeEdit}
        >
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="dialog-title">{t("adminInvoiceEdit")}</h2>
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
                <label className="field-label">
                  {t("adminInvoiceUploadLabel")}
                </label>
                <p
                  className="label mono"
                  style={{
                    margin: "0 0 8px",
                    fontSize: 12.5,
                    wordBreak: "break-all",
                  }}
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
            <div className="dialog-actions">
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
          className="dialog-backdrop"
          onClick={closeAccept}
        >
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="dialog-title">{t("adminAcceptInvoiceTitle")}</h2>
            <p className="dialog-desc">{accepting.fileName}</p>
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
                <DateField
                  value={acceptInvDate}
                  onChange={setAcceptInvDate}
                  onBlur={(e) =>
                    setAcceptInvDate(AuthStore.formatDateInput(e.target.value))
                  }
                  placeholder={t("adminSupplierInvoiceDatePlaceholder")}
                  error={
                    acceptInvDate &&
                    !AuthStore.parseStrictDate(acceptInvDate, {
                      allowPast: true,
                    }).valid
                      ? dateErrorLabelStandalone(
                          AuthStore.parseStrictDate(acceptInvDate, {
                            allowPast: true,
                          }).reason,
                          t,
                        )
                      : ""
                  }
                  testId="accept-inv-date"
                />
              </div>
            </div>
            <div className="dialog-actions">
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

      {actionDoc && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "color-mix(in srgb, var(--scrim-ink) 45%, transparent)",
            zIndex: 102,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={closeActionDialog}
        >
          <div
            className="card elev"
            style={{ maxWidth: 480, width: "100%", padding: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>
              {t("adminDocActionDialogTitle")}
            </h2>
            <p
              className="label"
              style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.5 }}
            >
              {actionDoc.fileName} ·{" "}
              {displayTourDocType(actionDoc.documentType, t)}
              {actionDoc.jobId
                ? (() => {
                    const j = jobs.find((x) => x.id === actionDoc.jobId);
                    return j ? ` · ${j.tour} · ${j.customer}` : "";
                  })()
                : ""}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label className="field-label" htmlFor="doc-action-reason">
                    {t("adminDocActionReasonLabel")} *
                  </label>
                  <select
                    className="input xs"
                    style={{ width: "auto", fontSize: 11.5 }}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setActionReason(e.target.value);
                    }}
                  >
                    <option value="">{t("adminRejectNotePlaceholder")}</option>
                    <option value={t("rejectionPresetLegible")}>
                      {t("rejectionPresetLegible")}
                    </option>
                    <option value={t("rejectionPresetRegistration")}>
                      {t("rejectionPresetRegistration")}
                    </option>
                    <option value={t("rejectionPresetWaiting")}>
                      {t("rejectionPresetWaiting")}
                    </option>
                  </select>
                </div>
                <textarea
                  id="doc-action-reason"
                  className="input"
                  rows={2}
                  autoFocus
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  style={{ marginTop: 6, resize: "vertical", minHeight: 52 }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="doc-action-note">
                  {t("adminDocActionNoteLabel")}
                </label>
                <textarea
                  id="doc-action-note"
                  className="input"
                  rows={2}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  style={{ marginTop: 6, resize: "vertical", minHeight: 44 }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={actionVisible}
                  onChange={(e) => setActionVisible(e.target.checked)}
                />
                {t("adminDocActionVisibleLabel")}
              </label>
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
              <button type="button" className="btn" onClick={closeActionDialog}>
                {t("adminInvoiceCancel")}
              </button>
              {AuthStore.tourDocumentReviewActions(actionDoc.reviewStatus)
                .canRequireCorrection ? (
                <button
                  type="button"
                  className="btn warn"
                  disabled={!actionReason.trim()}
                  onClick={() => submitDocAction("correction")}
                >
                  {t("adminDocActionRequireCorrection")}
                </button>
              ) : null}
              {AuthStore.tourDocumentReviewActions(actionDoc.reviewStatus)
                .canReject ? (
                <button
                  type="button"
                  className="btn danger"
                  disabled={!actionReason.trim()}
                  onClick={() => submitDocAction("reject")}
                >
                  {t("adminDocActionReject")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          className="dialog-backdrop"
          onClick={() => setViewId(null)}
        >
          <div
            className="dialog-panel dialog-panel--md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="dialog-title">{t("invoiceViewTitle")}</h2>
            <p className="dialog-desc">{t("invoiceViewDisclaimer")}</p>
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
                `${t("adminDocMetaType")} ${displayTourDocType(
                  viewing.documentType,
                  t,
                )}`,
                `Review: ${displayDocReviewStatus(viewing.reviewStatus)}`,
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
                      viewing.servicePeriodFrom || viewing.servicePeriodTo
                        ? `${t("tourDocServicePeriodFrom")}/${t("tourDocServicePeriodTo")}: ${viewing.servicePeriodFrom || "—"} – ${viewing.servicePeriodTo || "—"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join("\n")
                  : null,
                viewing.receiptDate
                  ? `${t("tourDocReceiptDate")}: ${viewing.receiptDate}`
                  : null,
                viewing.netAmount != null ||
                viewing.grossAmount != null ||
                viewing.taxRatePercent != null
                  ? [
                      viewing.netAmount != null
                        ? `${t("tourDocNetAmount")}: ${viewing.netAmount.toFixed(2)}`
                        : null,
                      viewing.taxRatePercent != null
                        ? `${t("tourDocTaxRate")}: ${viewing.taxRatePercent}`
                        : null,
                      viewing.grossAmount != null
                        ? `${t("tourDocGrossAmount")}: ${viewing.grossAmount.toFixed(2)}`
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

/** Phase 12: consolidated invoices are a distinct workflow from per-tour
    document review, but the client's plan keeps both under one "Tour
    Billing" nav entry — same merge-with-tabs pattern as Phase 9's
    CustomerCenterPane. */
const TourBillingCenterPane = (props) => {
  const { t } = useI18n();
  const [view, setView] = useStateA(props.initialView || "documents");
  return (
    <div id="tourbillingcenter">
      <div className="tabs">
        {[
          ["documents", t("navTourBilling")],
          ["invoices", t("ciTabLabel")],
        ].map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={view === id ? "on" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setView(id)}
          >
            {lbl}
          </button>
        ))}
      </div>
      {view === "documents" ? (
        <TourBillingPane {...props} />
      ) : (
        <ConsolidatedInvoicesPane
          showToast={props.showToast}
          onOpenJob={props.onOpenJob}
        />
      )}
    </div>
  );
};

const AuditPane = ({ showToast }) => {
  const { t, tPlural } = useI18n();
  const store = useAuthStore();
  const drivers = store.getDrivers();
  const [filterDate, setFilterDate] = useStateA("");
  const [filterDriver, setFilterDriver] = useStateA("");
  const [filterTour, setFilterTour] = useStateA("");
  // The retention confirmation, holding the preview it was opened with. Null
  // means closed — the preview is read when the dialog OPENS and never on
  // render, mirroring the product, where it is a second exact count over the
  // whole table and running it per visit would double the cost retention
  // exists to reduce.
  const [retentionPreview, setRetentionPreview] = useStateA(null);
  const retentionDays = store.AUDIT_RETENTION_WINDOW_DAYS;

  const allEntries = store.getAuditLog();
  const visibleEntries = useMemoA(() => {
    let list = allEntries;
    if (filterDate) {
      list = list.filter((a) => {
        const d = store.parseAuditEntryDate(a);
        if (!d) return false;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}` === filterDate;
      });
    }
    if (filterDriver) {
      list = list.filter((a) => a.actor === filterDriver);
    }
    if (filterTour.trim()) {
      const q = filterTour.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.entity?.toLowerCase().includes(q) ||
          a.meta?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allEntries, filterDate, filterDriver, filterTour]);

  const filtersActive = !!(filterDate || filterDriver || filterTour.trim());
  const resetFilters = () => {
    setFilterDate("");
    setFilterDriver("");
    setFilterTour("");
  };

  const confirmRetentionPurge = () => {
    // No argument, and deliberately none available: the purge deletes by age
    // and by nothing else, so the filters above cannot narrow it. They are also
    // left applied — housekeeping should not cost the admin the investigation
    // they were in the middle of.
    const result = store.purgeAuditEvents();
    setRetentionPreview(null);
    showToast?.(
      tPlural("adminAuditRetentionDoneTitle", result.deletedCount),
      t("adminAuditRetentionDoneSub", { cutoff: result.cutoffDisplay }),
    );
  };

  return (
    <div>
      <div className="pane-toolbar">
        <p className="pane-lead">{t("auditDesc")}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
          {/* Destructive styling, so the retention action is never mistaken for
              the export beside it. The label states the WINDOW and never the
              current result set — it reads identically whether filters are
              active or not, because the purge ignores them. */}
          <button
            type="button"
            className="btn danger"
            onClick={() => setRetentionPreview(store.getAuditRetentionPreview())}
          >
            {t("adminAuditRetentionAction", { days: retentionDays })}
          </button>
        </div>
      </div>
      {retentionPreview ? (
        <Dialog
          open
          alertdialog
          onClose={() => setRetentionPreview(null)}
          title={t("adminAuditRetentionTitle", { days: retentionDays })}
          description={
            retentionPreview.eligibleCount === 0
              ? t("adminAuditRetentionNothing", { days: retentionDays })
              : tPlural(
                  "adminAuditRetentionCount",
                  retentionPreview.eligibleCount,
                  { cutoff: retentionPreview.cutoffDisplay },
                )
          }
          actions={
            <>
              <button
                type="button"
                className="btn"
                onClick={() => setRetentionPreview(null)}
              >
                {t("adminInvoiceCancel")}
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={confirmRetentionPurge}
              >
                {t("adminAuditRetentionConfirm")}
              </button>
            </>
          }
        >
          <div className="banner banner-warn dialog-banner">
            {t("adminAuditRetentionWarning")}
          </div>
        </Dialog>
      ) : null}
      <div
        className="card"
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          alignItems: "end",
          marginBottom: 16,
        }}
      >
        <div>
          <label className="field-label" htmlFor="audit-filter-date">
            {t("adminAuditFilterDate")}
          </label>
          <input
            id="audit-filter-date"
            type="date"
            className="input"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="audit-filter-driver">
            {t("adminAuditFilterServicePartner")}
          </label>
          <select
            id="audit-filter-driver"
            className="input"
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
          >
            <option value="">{t("billingFilterAll")}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="audit-filter-tour">
            {t("adminAuditFilterTour")}
          </label>
          <input
            id="audit-filter-tour"
            className="input"
            value={filterTour}
            onChange={(e) => setFilterTour(e.target.value)}
            placeholder={t("adminAuditFilterTourPh")}
          />
        </div>
        <div>
          {filtersActive ? (
            <button type="button" className="btn" onClick={resetFilters}>
              {t("billingFilterReset")}
            </button>
          ) : null}
        </div>
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
          {visibleEntries.length === 0 ? (
            <tr>
              <td colSpan={5} className="label" style={{ padding: 14 }}>
                {t("billingFilterEmpty")}
              </td>
            </tr>
          ) : (
            visibleEntries.map((a, i) => (
              <tr
                key={i}
                className={i < 4 ? "list-enter" : undefined}
                style={i < 4 ? { ["--list-enter-i"]: i } : undefined}
              >
                <td className="mono">{a.at}</td>
                <td>
                  <strong>{a.action}</strong>
                </td>
                <td>{a.actor}</td>
                <td>{a.entity}</td>
                <td>{a.meta || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// No admin-configurable feature flags currently exist; the Settings toggle
// list below renders one row per key here.
const FLAG_I18N = {};

const CRITICAL_ALERT_EVENTS = new Set([
  "report_problem_cancel",
  "empty_run_reported",
  "job_cancelled",
  "tour_document_reuploaded",
]);

const ADMIN_ALERT_EVENT_I18N = {
  master_data_change_requested: "adminNotifMasterDataChange",
  report_problem_cancel: "adminNotifReportProblemCancel",
  empty_run_reported: "adminNotifEmptyRunReported",
  job_accepted: "adminNotifJobAccepted",
  job_performed: "adminNotifJobPerformed",
  tour_document_uploaded: "adminNotifDocumentUploaded",
  tour_document_reuploaded: "adminNotifDocumentReuploaded",
};

const parseMasterDataRequestIdFromMeta = (meta) => {
  const m = String(meta || "").match(/(MDR-[A-Za-z0-9-]+)/);
  return m ? m[1] : "";
};

// Email is no longer part of ops-managed master data (driver self-serves it
// via the Account & sign-in flow), so it is not a reviewable change field.
const MASTER_DATA_CHANGE_FIELDS = [
  ["company", "company"],
  ["address", "address"],
  ["phone", "phone"],
];

/** Queue/detail title — company like the admin FE partner label, not contact name. */
const mdrPartnerLabel = (row, store) => {
  const live = row?.driverId
    ? store?.getDrivers?.()?.find((d) => d.id === row.driverId)?.company
    : "";
  return (
    live ||
    row?.snapshot?.company ||
    row?.proposed?.company ||
    row?.driverName ||
    "—"
  );
};

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
    <div className="queue-list-changes">
      {changed.map(([key, labelKey]) => (
        <span key={key} className="queue-list-chip on">
          {t(labelKey)}
        </span>
      ))}
    </div>
  );
};

const MasterDataCompareTable = ({
  snapshot,
  proposed,
  changeType,
  t,
  onlyChanged,
}) => {
  const fields =
    changeType === "daily_limit_override"
      ? [["dailyJobLimit", "adminUsersFieldProbationLimit"]]
      : MASTER_DATA_CHANGE_FIELDS;
  const rows = fields
    .map(([key, labelKey]) => {
      const before = snapshot?.[key] || "";
      const after = proposed?.[key] ?? before;
      const changed = String(before).trim() !== String(after).trim();
      if (onlyChanged && !changed) return null;
      return (
        <div
          key={key}
          className={`compare-table-row${changed ? " is-changed" : ""}`}
        >
          <div className="compare-table-cell">{t(labelKey)}</div>
          <div className="compare-table-cell before">{before || "—"}</div>
          <div className="compare-table-cell after">{after || "—"}</div>
        </div>
      );
    })
    .filter(Boolean);
  if (!rows.length) {
    return <div style={{ color: "var(--muted)", fontSize: 13 }}>—</div>;
  }
  return (
    <div className="compare-table">
      <div className="compare-table-header">
        <span>{t("adminMdrCompareField")}</span>
        <span>{t("adminMdrCompareBefore")}</span>
        <span>{t("adminMdrCompareAfter")}</span>
      </div>
      {rows}
    </div>
  );
};

/**
 * Compact page list, mirroring the admin app's `getPaginationItems`:
 * `1 … 4 5 6 … 20`. Up to 7 pages every number is shown.
 */
const queuePageItems = (page, totalPages) => {
  const safeTotal = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), safeTotal);
  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }
  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(safeTotal - 1, current + 1);
  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < safeTotal - 1) items.push("ellipsis");
  items.push(safeTotal);
  return items;
};

/**
 * Queue footer for the change-request list.
 *
 * Deliberately not `OverviewFooter`: that one is built for the full-width
 * overview table (it never wraps, and hardcodes page buttons 1/2/3) so it looked
 * squeezed and behaved differently inside this narrower card. This mirrors the
 * admin app's `Pagination` — summary on the left, rows-per-page plus a windowed
 * pager on the right — using only existing prototype classes.
 */
const ChangeRequestQueueFooter = ({
  total,
  page,
  rows,
  onPageChange,
  onRowsChange,
}) => {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, rows)));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * rows + 1;
  const to = Math.min(current * rows, total);

  return (
    <div
      className="admin-foot"
      style={{ flexWrap: "wrap", justifyContent: "space-between" }}
    >
      <span className="label">
        {t("adminMdrShowingRange", { from, to, total })}
      </span>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <span className="label">{t("rowsPerPage")}</span>
        <select
          className="input"
          style={{ width: 74 }}
          value={rows}
          onChange={(e) => onRowsChange(Number(e.target.value))}
        >
          <option>20</option>
          <option>50</option>
          <option>100</option>
        </select>
        <div style={{ display: "inline-flex", gap: 4 }}>
          <button
            type="button"
            className="btn icon sm"
            disabled={current <= 1}
            aria-label={t("adminMdrPagerPrev")}
            onClick={() => onPageChange(current - 1)}
          >
            ‹
          </button>
          {queuePageItems(current, totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`gap-${index}`}
                aria-hidden="true"
                style={{ padding: "0 6px", color: "var(--muted)" }}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={item === current ? "btn xs primary" : "btn xs"}
                style={{ minWidth: 30 }}
                aria-current={item === current ? "page" : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className="btn icon sm"
            disabled={current >= totalPages}
            aria-label={t("adminMdrPagerNext")}
            onClick={() => onPageChange(current + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

const MasterDataRequestsPane = ({
  showToast,
  initialRequestId,
  onClearInitialRequest,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [filter, setFilter] = useStateA("open");
  const [selectedId, setSelectedId] = useStateA(initialRequestId || "");
  const [adminNote, setAdminNote] = useStateA("");
  const [page, setPage] = useStateA(1);
  // 20 to match the admin app's queue page size, not the 25 the overview uses.
  const [rowsPerPage, setRowsPerPage] = useStateA(20);

  // Deep-link: select the request, jump the filter to its status (so an
  // approved id never sits under Open), then clear the parent sticky id so
  // remounts / later Service Partners visits do not reopen this tab.
  useEffectA(() => {
    if (!initialRequestId) return;
    const row = store.getMasterDataChangeRequest(initialRequestId);
    if (row) {
      setSelectedId(row.id);
      if (
        row.status === "open" ||
        row.status === "approved" ||
        row.status === "rejected"
      ) {
        setFilter(row.status);
        setPage(1);
      }
    } else {
      setSelectedId(initialRequestId);
    }
    onClearInitialRequest?.();
  }, [initialRequestId]);

  const allRows = store.listMasterDataChangeRequests(
    filter === "all" ? {} : { status: filter },
  );
  // Per-status counts so the reviewer can see the size of the backlog without
  // clicking each filter to find out what is in it.
  const statusCounts = {
    open: store.listMasterDataChangeRequests({ status: "open" }).length,
    approved: store.listMasterDataChangeRequests({ status: "approved" }).length,
    rejected: store.listMasterDataChangeRequests({ status: "rejected" }).length,
  };
  statusCounts.all =
    statusCounts.open + statusCounts.approved + statusCounts.rejected;
  // The production queue is paginated server-side; page the mock list so the
  // footer, the result count and the reset-to-page-1 behaviour all match.
  const rows = allRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  // Only show a detail pane for requests visible under the active filter —
  // looking up by id alone caused empty Open + resolved detail side-by-side.
  const selected =
    allRows.find((r) => r.id === selectedId) ||
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
    // No width cap — the queue is a work surface, so it fills the pane and the
    // reviewer gets every pixel the window offers.
    <div>
      {/* Match prototype main: pane-lead above a left-aligned `.seg` — no card
          wrapping the subtitle beside the filter. */}
      <p className="pane-lead">{t("adminMdrSub")}</p>
      <div
        className="seg"
        style={{ display: "inline-flex", flexWrap: "wrap", marginBottom: 18 }}
      >
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
            aria-pressed={filter === id}
            aria-label={`${label} (${String(statusCounts[id])})`}
            onClick={() => {
              setFilter(id);
              setPage(1);
              setSelectedId("");
            }}
          >
            {label}
            <span
              className="mono"
              aria-hidden="true"
              style={{ marginLeft: 7, opacity: 0.65 }}
            >
              {statusCounts[id]}
            </span>
          </button>
        ))}
      </div>
      {/* Single column until a request is selected, and even then only from
          1280px up — see `.queue-split` for why the width gate is needed. */}
      <div className={selected ? "queue-split two" : "queue-split"}>
        <section className="card" style={{ padding: 0 }}>
          {rows.length === 0 ? (
            <div
              style={{
                padding: 28,
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              <div>{t("adminMdrEmpty")}</div>
              <div className="label" style={{ marginTop: 6 }}>
                {t("adminMdrEmptyHint")}
              </div>
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
                    selectedId === row.id
                      ? "color-mix(in srgb, var(--st-published) 6%, transparent)"
                      : "transparent",
                }}
                onClick={() => {
                  setSelectedId(row.id);
                  setAdminNote("");
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {mdrPartnerLabel(row, store)}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}
                >
                  {row.driverCode || "—"} · {row.createdAt}
                </div>
                <div className="label" style={{ fontSize: 10.5, marginTop: 6 }}>
                  {mdrChangeTypeLabel(row, t)}
                </div>
                {/* Chips + status on one line — matches the admin FE list row. */}
                <div className="queue-list-meta">
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
                </div>
              </button>
            ))
          )}
          {/* Reuses the overview footer so the queue counts and pager look and
              behave exactly like every other admin list. */}
          {allRows.length > 0 ? (
            <ChangeRequestQueueFooter
              total={allRows.length}
              page={page}
              rows={rowsPerPage}
              onPageChange={(next) => {
                setPage(next);
                setSelectedId("");
              }}
              onRowsChange={(next) => {
                setRowsPerPage(next);
                setPage(1);
                setSelectedId("");
              }}
            />
          ) : null}
        </section>
        {selected ? (
          <section className="card" style={{ padding: 22 }}>
            <h2 className="dialog-title" style={{ textAlign: "left" }}>
              {mdrPartnerLabel(selected, store)}
            </h2>
            <p
              className="mono"
              style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}
            >
              {selected.driverCode || "—"} · {selected.createdAt}
            </p>
            <div className="label" style={{ fontSize: 11, marginTop: 8 }}>
              {mdrChangeTypeLabel(selected, t)}
            </div>
            {selected.proposed ? (
              <div style={{ marginTop: 16 }}>
                <div className="field-label">
                  {t("adminMdrProposedChanges")}
                </div>
                <p
                  className="label"
                  style={{
                    margin: "6px 0 0",
                    fontSize: 11.5,
                    lineHeight: 1.45,
                  }}
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
                {selected.changeType === "daily_limit_override" &&
                selected.note ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="field-label">
                      {t("adminUsersFieldNotes")}
                    </div>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
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
              <div className="queue-detail-actions">
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
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
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
              <div
                style={{ marginTop: 16, fontSize: 13, color: "var(--muted)" }}
              >
                <div>
                  {t("adminMdrResolvedAt")}: {selected.resolvedAt || "—"}
                </div>
                {selected.adminNote ? (
                  <div style={{ marginTop: 8 }}>
                    <div className="field-label">{t("adminMdrAdminNoteResolved")}</div>
                    <div style={{ marginTop: 6, lineHeight: 1.5 }}>
                      {selected.adminNote}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
};

const NotificationFeedPane = ({
  showToast,
  onOpenJob,
  onReviewMasterDataRequest,
}) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const rows = store.getAdminEmailQueue();
  return (
    <div style={{ maxWidth: 900 }}>
      <p className="pane-lead">{t("adminNotificationFeedSub")}</p>
      <section className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div
            style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}
          >
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
                  ? "color-mix(in srgb, var(--destructive) 4%, transparent)"
                  : "transparent",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {ADMIN_ALERT_EVENT_I18N[row.event]
                    ? t(ADMIN_ALERT_EVENT_I18N[row.event])
                    : row.event}
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}
                >
                  {row.tour ? `${t("adminColTour")} ${row.tour}` : "—"}
                  {row.meta ? ` · ${row.meta}` : ""}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--muted-2)",
                    marginTop: 4,
                  }}
                >
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

// Every numeric operational policy is a whole number of 1 or more — the same
// rule the Autheon console's system-setting catalog enforces. The helpers below
// are the single source for it: the input attributes, the Save gate and the
// inline message all read from here rather than restating it.
const MIN_POLICY_NUMBER = 1;

// A numeric field differs from its stored value once both sides read as
// numbers, so "1", "1.0" and "01" all match a stored 1. A cleared or
// non-numeric field can never equal the stored number, so it reads as dirty
// here (and fails isPolicyNumberValid) rather than being hidden as "clean".
const isPolicyNumberDirty = (current, baseline) => {
  const trimmed = String(current).trim();
  if (trimmed === "") return true;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return true;
  return parsed !== baseline;
};

// `max` is optional because operational policies are bounded from below only;
// the driver upload limits are the fields with a ceiling to respect (platform
// per-file ceiling of 50 MB, area total of 1024 MB).
const isPolicyNumberValid = (current, max = Number.POSITIVE_INFINITY) => {
  const trimmed = String(current).trim();
  if (trimmed === "") return false;
  const parsed = Number(trimmed);
  return (
    Number.isInteger(parsed) &&
    parsed >= MIN_POLICY_NUMBER &&
    parsed <= max
  );
};

// EUR policy fields (driver-offer max / high-offer warning threshold) are
// positive decimals, not whole numbers — a separate validator from the
// integer-only policy fields above.
const isPolicyEurValid = (current) => {
  const trimmed = String(current).trim();
  if (trimmed === "") return false;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0;
};

// Gated on the field being dirty so a freshly opened screen never nags — the
// stored values always satisfy the rule. One message covers cleared, zero and
// fractional alike: it reads as a complete instruction in every case. Optional
// `max` matches isPolicyNumberValid so upload-limit fields reuse this helper.
const policyNumberError = (current, baseline, message, max) =>
  isPolicyNumberDirty(current, baseline) && !isPolicyNumberValid(current, max)
    ? message
    : "";

// Bounds the admin form enforces on driver upload limits. Read from the store
// rather than restated here: the store clamps to the same numbers, and two
// copies of a bound are two chances for the form to promise what the store
// will not honour. Megabytes; both fields are integers. Resolved lazily
// because this module is evaluated before window.AuthStore exists.
const uploadLimitMaxFileMb = () =>
  (window.AuthStore?.PLATFORM_UPLOAD_CEILING_BYTES ?? 50 * 1024 * 1024) /
  (1024 * 1024);
const uploadLimitMaxTotalMb = () =>
  window.AuthStore?.MAX_UPLOAD_AREA_TOTAL_MB ?? 1024;
// Labelled pill switch. The console renders a role="switch" button beside its
// label; the prototype's pill treatment is a checkbox + slider, so the label
// wraps the control and carries role="switch" on the input for parity.
const PolicySwitchRow = ({ id, label, checked, onChange }) => (
  <label className="policy-switch-row policy-grid-full">
    <span className="policy-switch-label">{label}</span>
    <span className="policy-switch">
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="policy-switch-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="policy-switch-slider" />
    </span>
  </label>
);

/**
 * Automatic deactivation of dormant service partners (PRD OQ-15).
 *
 * Mirrors OperationalPoliciesForm: local string state seeded from the store,
 * dirty/valid gating, Save + Discard. The one departure is the warning lead
 * time, whose floor is 0 rather than 1 — "0" is the configured way to
 * deactivate with no notice, which isPolicyNumberValid would reject.
 */
const DriverInactivityForm = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const policy = store.getDriverInactivityPolicy();

  const storedEnabled = policy.enabled;
  const storedThreshold = policy.thresholdDays;
  const storedWarning = policy.warningDays;

  const [enabled, setEnabled] = useStateA(storedEnabled);
  const [threshold, setThreshold] = useStateA(String(storedThreshold));
  const [warning, setWarning] = useStateA(String(storedWarning));

  const seedFromStore = () => {
    setEnabled(storedEnabled);
    setThreshold(String(storedThreshold));
    setWarning(String(storedWarning));
  };

  useEffectA(seedFromStore, [storedEnabled, storedThreshold, storedWarning]);

  const isWarningValid = (current) => {
    const trimmed = String(current).trim();
    if (trimmed === "") return false;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 0;
  };

  const thresholdValid = isPolicyNumberValid(threshold);
  const warningValid = isWarningValid(warning);
  // Mirrors the server's cross-field rule. Without it the only feedback would
  // be a rejected save with no indication which field is wrong.
  const warningFits =
    thresholdValid && warningValid && Number(warning) < Number(threshold);

  const dirty =
    enabled !== storedEnabled ||
    isPolicyNumberDirty(threshold, storedThreshold) ||
    isPolicyNumberDirty(warning, storedWarning);

  const canSave = dirty && thresholdValid && warningValid && warningFits;

  const numericMessage = t("settings.system.policyWholeNumberError");
  const thresholdError = policyNumberError(
    threshold,
    storedThreshold,
    numericMessage,
  );
  const warningError =
    isPolicyNumberDirty(warning, storedWarning) && !warningValid
      ? numericMessage
      : thresholdValid && warningValid && !warningFits
        ? t("adminInactivityWarningTooLate")
        : "";

  const onSave = () => {
    store.setDriverInactivityPolicy({
      enabled,
      thresholdDays: Number(threshold),
      warningDays: Number(warning),
    });
    showToast(t("adminOperationalPoliciesSaved"));
  };

  const onRunNow = () => {
    const result = store.runInactivitySweep();
    showToast(
      t("adminInactivityRunResult")
        .replace("{deactivated}", result.deactivated.length)
        .replace("{warned}", result.warned.length)
        .replace("{skipped}", result.skippedWithActiveJobs.length),
    );
  };

  return (
    <div className="policy-grid" style={{ marginTop: 16 }}>
      <PolicySwitchRow
        id="inactivity-enabled"
        label={t("adminInactivityEnabled")}
        checked={enabled}
        onChange={setEnabled}
      />
      <label className="field">
        <span className="label">{t("adminInactivityThreshold")}</span>
        <input
          id="inactivity-threshold-days"
          type="number"
          min={MIN_POLICY_NUMBER}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        {thresholdError ? (
          <span className="field-error">{thresholdError}</span>
        ) : null}
      </label>
      <label className="field">
        <span className="label">{t("adminInactivityWarning")}</span>
        <input
          id="inactivity-warning-days"
          type="number"
          min={0}
          step={1}
          value={warning}
          onChange={(e) => setWarning(e.target.value)}
        />
        {warningError ? (
          <span className="field-error">{warningError}</span>
        ) : null}
      </label>
      <p className="label policy-grid-full" style={{ lineHeight: 1.55 }}>
        {t("adminInactivityWarningHelp")}
      </p>
      <div className="policy-actions policy-grid-full">
        <button
          type="button"
          className="btn primary"
          disabled={!canSave}
          onClick={onSave}
        >
          {t("adminInactivitySave")}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!dirty}
          onClick={seedFromStore}
        >
          {t("settings.system.discardChanges")}
        </button>
        {/* Disabled while dirty: a check applies the SAVED policy, so offering
            it beside unsaved edits invites the admin to think they just tested
            the numbers on screen. */}
        <button
          type="button"
          className="btn"
          disabled={dirty}
          onClick={onRunNow}
        >
          {t("adminInactivityRunNow")}
        </button>
      </div>
    </div>
  );
};

const OperationalPoliciesForm = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const policies = store.getOperationalPolicies();

  // Stored values, read as primitives. getOperationalPolicies() hands back a
  // fresh object on every call, so the re-seed effect below depends on these
  // and not on `policies` — an object dep would fire on every render and wipe
  // whatever the user is currently typing.
  const storedCancelHours = Number(
    policies.adminCancelMinHoursBeforePickupStart ?? 1,
  );
  const storedScheduleHours = Number(
    policies.scheduleChangeMinHoursBeforePickupStart ?? 1,
  );
  const storedMinDriverMsg = Number(
    policies.cancellation?.adminCancelDriverMessageMinChars ?? 20,
  );
  const storedDefaultLimit = Number(
    policies.driverAcceptance?.probationJobCount ?? 3,
  );
  const storedDriverOfferMax = Number(policies.driverOfferMaxEur ?? 999.99);
  const storedDriverOfferWarn = Number(
    policies.driverOfferHighWarningEur ?? 200.0,
  );
  const storedAllowOverride =
    policies.allowPolicyOverrideWithAuditNote !== false;
  const storedRequiresReasonCode =
    policies.cancellation?.adminCancelRequiresReasonCode !== false;
  const storedRequiresDriverMessage =
    policies.cancellation?.adminCancelRequiresDriverMessage !== false;

  const [adminCancelHours, setAdminCancelHours] = useStateA(
    String(storedCancelHours),
  );
  const [scheduleHours, setScheduleHours] = useStateA(
    String(storedScheduleHours),
  );
  const [minDriverMsg, setMinDriverMsg] = useStateA(String(storedMinDriverMsg));
  const [defaultLimit, setDefaultLimit] = useStateA(String(storedDefaultLimit));
  const [driverOfferMax, setDriverOfferMax] = useStateA(
    String(storedDriverOfferMax),
  );
  const [driverOfferWarn, setDriverOfferWarn] = useStateA(
    String(storedDriverOfferWarn),
  );
  const [allowOverride, setAllowOverride] = useStateA(storedAllowOverride);
  const [requiresReasonCode, setRequiresReasonCode] = useStateA(
    storedRequiresReasonCode,
  );
  const [requiresDriverMessage, setRequiresDriverMessage] = useStateA(
    storedRequiresDriverMessage,
  );

  // Replays the stored values into the form. The effect runs it on mount and
  // after a save (the store emits new values); Discard runs it directly to drop
  // unsaved edits.
  const seedFromStore = () => {
    setAdminCancelHours(String(storedCancelHours));
    setScheduleHours(String(storedScheduleHours));
    setMinDriverMsg(String(storedMinDriverMsg));
    setDefaultLimit(String(storedDefaultLimit));
    setAllowOverride(storedAllowOverride);
    setRequiresReasonCode(storedRequiresReasonCode);
    setRequiresDriverMessage(storedRequiresDriverMessage);
    setDriverOfferMax(String(storedDriverOfferMax));
    setDriverOfferWarn(String(storedDriverOfferWarn));
  };

  useEffectA(seedFromStore, [
    storedCancelHours,
    storedScheduleHours,
    storedMinDriverMsg,
    storedDefaultLimit,
    storedAllowOverride,
    storedRequiresReasonCode,
    storedRequiresDriverMessage,
    storedDriverOfferMax,
    storedDriverOfferWarn,
  ]);

  // At least one field differs from the stored values. Drives both the Save
  // gate and whether Discard is offered.
  const dirty =
    isPolicyNumberDirty(adminCancelHours, storedCancelHours) ||
    isPolicyNumberDirty(scheduleHours, storedScheduleHours) ||
    isPolicyNumberDirty(minDriverMsg, storedMinDriverMsg) ||
    isPolicyNumberDirty(defaultLimit, storedDefaultLimit) ||
    isPolicyNumberDirty(driverOfferMax, storedDriverOfferMax) ||
    isPolicyNumberDirty(driverOfferWarn, storedDriverOfferWarn) ||
    allowOverride !== storedAllowOverride ||
    requiresReasonCode !== storedRequiresReasonCode ||
    requiresDriverMessage !== storedRequiresDriverMessage;

  // Save enables only for a real, valid change. Reverting every field by hand,
  // or a cleared/zero/fractional field, leaves it disabled — the primary button
  // always promises a save that will succeed. Switches are always valid; only
  // their dirtiness matters.
  const canSave =
    dirty &&
    isPolicyNumberValid(adminCancelHours) &&
    isPolicyNumberValid(scheduleHours) &&
    isPolicyNumberValid(minDriverMsg) &&
    isPolicyNumberValid(defaultLimit) &&
    isPolicyEurValid(driverOfferMax) &&
    isPolicyEurValid(driverOfferWarn);

  const save = () => {
    if (!canSave) return;
    // Every field is passed explicitly rather than spread from the stored
    // policies — a passthrough would let a value round-trip with no control
    // behind it, which is exactly how the three switches stayed unreachable.
    // canSave guarantees each Number() below is a whole number of 1 or more.
    store.setOperationalPolicies({
      operational: {
        adminCancelMinHoursBeforePickupStart: Number(adminCancelHours),
        scheduleChangeMinHoursBeforePickupStart: Number(scheduleHours),
        allowPolicyOverrideWithAuditNote: allowOverride,
        driverOfferMaxEur: Number(driverOfferMax),
        driverOfferHighWarningEur: Number(driverOfferWarn),
      },
      cancellation: {
        adminCancelDriverMessageMinChars: Number(minDriverMsg),
        adminCancelRequiresReasonCode: requiresReasonCode,
        adminCancelRequiresDriverMessage: requiresDriverMessage,
      },
      driverAcceptance: {
        probationJobCount: Number(defaultLimit),
      },
    });
    showToast?.(t("adminOperationalPoliciesSaved"));
  };

  const numericMessage = t("settings.system.policyWholeNumberError");
  const numericFields = [
    {
      id: "policy-cancel-hours",
      label: t("adminPolicyCancelHoursLabel"),
      value: adminCancelHours,
      setValue: setAdminCancelHours,
      stored: storedCancelHours,
    },
    {
      id: "policy-schedule-hours",
      label: t("adminPolicyScheduleHoursLabel"),
      value: scheduleHours,
      setValue: setScheduleHours,
      stored: storedScheduleHours,
    },
    {
      id: "policy-min-driver-msg",
      label: t("adminPolicyMinDriverMsgLabel"),
      value: minDriverMsg,
      setValue: setMinDriverMsg,
      stored: storedMinDriverMsg,
    },
    {
      id: "policy-default-limit",
      label: t("adminPolicyDefaultProbationLimitLabel"),
      value: defaultLimit,
      setValue: setDefaultLimit,
      stored: storedDefaultLimit,
    },
  ];

  return (
    <div className="policy-grid">
      {numericFields.map((f) => {
        const err = policyNumberError(f.value, f.stored, numericMessage);
        return (
          <div className="policy-field" key={f.id}>
            <label className="field-label" htmlFor={f.id}>
              {f.label}
            </label>
            {/* min/step are affordance only — HTML constraints are advisory,
                so isPolicyNumberValid is what gates Save. */}
            <input
              id={f.id}
              className="input"
              type="number"
              min={MIN_POLICY_NUMBER}
              step={1}
              value={f.value}
              style={err ? userInputErrStyle : undefined}
              aria-invalid={err ? true : undefined}
              aria-describedby={err ? `${f.id}-error` : undefined}
              onChange={(e) => f.setValue(e.target.value)}
            />
            <UserFormError id={`${f.id}-error`} message={err} />
          </div>
        );
      })}
      <div className="policy-field">
        <label className="field-label" htmlFor="policy-driver-offer-max">
          {t("adminPolicyDriverOfferMaxLabel")}
        </label>
        <input
          id="policy-driver-offer-max"
          className="input"
          type="number"
          min={0.01}
          step={0.01}
          value={driverOfferMax}
          style={
            isPolicyNumberDirty(driverOfferMax, storedDriverOfferMax) &&
            !isPolicyEurValid(driverOfferMax)
              ? userInputErrStyle
              : undefined
          }
          onChange={(e) => setDriverOfferMax(e.target.value)}
        />
      </div>
      <div className="policy-field">
        <label className="field-label" htmlFor="policy-driver-offer-warn">
          {t("adminPolicyDriverOfferWarnLabel")}
        </label>
        <input
          id="policy-driver-offer-warn"
          className="input"
          type="number"
          min={0.01}
          step={0.01}
          value={driverOfferWarn}
          style={
            isPolicyNumberDirty(driverOfferWarn, storedDriverOfferWarn) &&
            !isPolicyEurValid(driverOfferWarn)
              ? userInputErrStyle
              : undefined
          }
          onChange={(e) => setDriverOfferWarn(e.target.value)}
        />
      </div>
      <PolicySwitchRow
        id="policy-allow-override"
        label={t("settings.system.policyAllowOverrideLabel")}
        checked={allowOverride}
        onChange={setAllowOverride}
      />
      <PolicySwitchRow
        id="policy-requires-reason-code"
        label={t("settings.system.policyRequiresReasonCodeLabel")}
        checked={requiresReasonCode}
        onChange={setRequiresReasonCode}
      />
      <PolicySwitchRow
        id="policy-requires-driver-message"
        label={t("settings.system.policyRequiresDriverMessageLabel")}
        checked={requiresDriverMessage}
        onChange={setRequiresDriverMessage}
      />
      <div className="policy-actions policy-grid-full">
        <button
          type="button"
          className="btn primary touch-target"
          disabled={!canSave}
          onClick={save}
        >
          {t("adminOperationalPoliciesSave")}
        </button>
        <button
          type="button"
          className="btn touch-target"
          disabled={!dirty}
          onClick={seedFromStore}
        >
          {t("settings.system.discardChanges")}
        </button>
      </div>
    </div>
  );
};

// A help contact differs from its stored value once both sides are trimmed, so
// trailing whitespace alone is not an edit — and a cleared field, which can
// never equal a stored contact, always reads as dirty rather than as "clean".
const isContactDirty = (current, stored) =>
  String(current).trim() !== String(stored || "").trim();

// Blank / malformed / valid, the three states the console's shared
// setting-string guard distinguishes. Blank is not "no change" but a required
// field the admin has emptied, and it gets its own message. The format rule
// itself is the store's — passed in, never restated here.
const contactStatus = (value, isValidFormat) => {
  const trimmed = String(value).trim();
  if (trimmed === "") return "empty";
  return isValidFormat(trimmed) ? "valid" : "malformed";
};

// One settings boundary for every driver-facing help channel. Infopoint keeps
// its hotline + email, while Feedback and Report an error own one recipient
// each. All values save or discard together.
const HelpContactsForm = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const contacts = store.getDriverSupportContact();

  // Stored values read as primitives. getDriverSupportContact() hands back a
  // fresh object on every call, so the re-seed effect below depends on these
  // and not on `contacts` — an object dep would fire on every render and wipe
  // whatever the user is currently typing.
  const storedHotline = String(contacts.phone || "");
  const storedInfopointEmail = String(contacts.email || "");
  const storedFeedbackEmail = String(contacts.feedbackEmail || "");
  const storedReportErrorEmail = String(contacts.reportErrorEmail || "");

  const [hotline, setHotline] = useStateA(storedHotline);
  const [infopointEmail, setInfopointEmail] = useStateA(storedInfopointEmail);
  const [feedbackEmail, setFeedbackEmail] = useStateA(storedFeedbackEmail);
  const [reportErrorEmail, setReportErrorEmail] = useStateA(
    storedReportErrorEmail,
  );

  // Replays the stored contacts into the form. The effect runs it on mount and
  // after a save (the store emits the newly stored values); Discard runs it
  // directly to drop unsaved edits.
  const seedFromStore = () => {
    setHotline(storedHotline);
    setInfopointEmail(storedInfopointEmail);
    setFeedbackEmail(storedFeedbackEmail);
    setReportErrorEmail(storedReportErrorEmail);
  };

  useEffectA(seedFromStore, [
    storedHotline,
    storedInfopointEmail,
    storedFeedbackEmail,
    storedReportErrorEmail,
  ]);

  const hotlineStatus = contactStatus(hotline, store.isValidSupportPhone);
  const infopointEmailStatus = contactStatus(
    infopointEmail,
    store.isValidSupportEmail,
  );
  const feedbackEmailStatus = contactStatus(
    feedbackEmail,
    store.isValidSupportEmail,
  );
  const reportErrorEmailStatus = contactStatus(
    reportErrorEmail,
    store.isValidSupportEmail,
  );
  const hotlineDirty = isContactDirty(hotline, storedHotline);
  const infopointEmailDirty = isContactDirty(
    infopointEmail,
    storedInfopointEmail,
  );
  const feedbackEmailDirty = isContactDirty(feedbackEmail, storedFeedbackEmail);
  const reportErrorEmailDirty = isContactDirty(
    reportErrorEmail,
    storedReportErrorEmail,
  );
  const dirty =
    hotlineDirty ||
    infopointEmailDirty ||
    feedbackEmailDirty ||
    reportErrorEmailDirty;

  // A save must leave the form matching what persists, so any blank or
  // malformed field disables Save outright — there is no partial save that
  // silently drops a field. These are the store setter's own rules, so an
  // enabled Save always promises a save that will succeed.
  const canSave =
    dirty &&
    hotlineStatus === "valid" &&
    infopointEmailStatus === "valid" &&
    feedbackEmailStatus === "valid" &&
    reportErrorEmailStatus === "valid";

  const save = (event) => {
    event.preventDefault();
    if (!canSave) return;
    store.setDriverSupportContact({
      phone: hotline.trim(),
      email: infopointEmail.trim(),
      feedbackEmail: feedbackEmail.trim(),
      reportErrorEmail: reportErrorEmail.trim(),
    });
    showToast?.(t("settings.system.helpContactsSaved"));
  };

  // Messages are gated on the field being dirty, so a freshly opened screen
  // never nags — the stored contacts always satisfy the rules.
  const hotlineError =
    hotlineDirty && hotlineStatus !== "valid"
      ? hotlineStatus === "empty"
        ? t("settings.system.helpContactsHotlineRequired")
        : t("settings.system.helpContactsHotlineError")
      : "";
  const emailError = (dirtyState, status) =>
    dirtyState && status !== "valid"
      ? status === "empty"
        ? t("settings.system.helpContactsEmailRequired")
        : t("settings.system.helpContactsEmailError")
      : "";
  const infopointEmailError = emailError(
    infopointEmailDirty,
    infopointEmailStatus,
  );
  const feedbackEmailError = emailError(
    feedbackEmailDirty,
    feedbackEmailStatus,
  );
  const reportErrorEmailError = emailError(
    reportErrorEmailDirty,
    reportErrorEmailStatus,
  );

  return (
    <form className="help-contacts-form" onSubmit={save} noValidate>
      <div className="help-contacts-grid">
        <section
          className="help-contact-group"
          aria-labelledby="help-contacts-infopoint-title"
        >
          <div className="help-contact-group-copy">
            <h3 id="help-contacts-infopoint-title">
              {t("settings.system.helpContactsInfopointTitle")}
            </h3>
            <p>{t("settings.system.helpContactsInfopointBlurb")}</p>
          </div>
          <div className="help-contact-fields">
            <div className="help-contact-field">
              <label className="field-label" htmlFor="help-contacts-hotline">
                {t("settings.system.helpContactsHotlineLabel")}
              </label>
              <input
                id="help-contacts-hotline"
                className="input"
                type="tel"
                value={hotline}
                style={hotlineError ? userInputErrStyle : undefined}
                aria-invalid={hotlineError ? true : undefined}
                aria-describedby={
                  hotlineError ? "help-contacts-hotline-error" : undefined
                }
                onChange={(e) => setHotline(e.target.value)}
              />
              <UserFormError
                id="help-contacts-hotline-error"
                message={hotlineError}
              />
            </div>
            <div className="help-contact-field">
              <label
                className="field-label"
                htmlFor="help-contacts-infopoint-email"
              >
                {t("settings.system.helpContactsEmailLabel")}
              </label>
              <input
                id="help-contacts-infopoint-email"
                className="input"
                type="email"
                value={infopointEmail}
                style={infopointEmailError ? userInputErrStyle : undefined}
                aria-invalid={infopointEmailError ? true : undefined}
                aria-describedby={
                  infopointEmailError
                    ? "help-contacts-infopoint-email-error"
                    : undefined
                }
                onChange={(e) => setInfopointEmail(e.target.value)}
              />
              <UserFormError
                id="help-contacts-infopoint-email-error"
                message={infopointEmailError}
              />
            </div>
          </div>
        </section>

        <section
          className="help-contact-group"
          aria-labelledby="help-contacts-feedback-title"
        >
          <div className="help-contact-group-copy">
            <h3 id="help-contacts-feedback-title">
              {t("settings.system.helpContactsFeedbackTitle")}
            </h3>
            <p>{t("settings.system.helpContactsFeedbackBlurb")}</p>
          </div>
          <div className="help-contact-fields">
            <div className="help-contact-field">
              <label className="field-label" htmlFor="help-contacts-feedback">
                {t("settings.system.helpContactsRecipientLabel")}
              </label>
              <input
                id="help-contacts-feedback"
                className="input"
                type="email"
                value={feedbackEmail}
                style={feedbackEmailError ? userInputErrStyle : undefined}
                aria-invalid={feedbackEmailError ? true : undefined}
                aria-describedby={
                  feedbackEmailError
                    ? "help-contacts-feedback-error"
                    : undefined
                }
                onChange={(e) => setFeedbackEmail(e.target.value)}
              />
              <UserFormError
                id="help-contacts-feedback-error"
                message={feedbackEmailError}
              />
            </div>
          </div>
        </section>

        <section
          className="help-contact-group"
          aria-labelledby="help-contacts-report-error-title"
        >
          <div className="help-contact-group-copy">
            <h3 id="help-contacts-report-error-title">
              {t("settings.system.helpContactsReportErrorTitle")}
            </h3>
            <p>{t("settings.system.helpContactsReportErrorBlurb")}</p>
          </div>
          <div className="help-contact-fields">
            <div className="help-contact-field">
              <label
                className="field-label"
                htmlFor="help-contacts-report-error"
              >
                {t("settings.system.helpContactsRecipientLabel")}
              </label>
              <input
                id="help-contacts-report-error"
                className="input"
                type="email"
                value={reportErrorEmail}
                style={reportErrorEmailError ? userInputErrStyle : undefined}
                aria-invalid={reportErrorEmailError ? true : undefined}
                aria-describedby={
                  reportErrorEmailError
                    ? "help-contacts-report-error-error"
                    : undefined
                }
                onChange={(e) => setReportErrorEmail(e.target.value)}
              />
              <UserFormError
                id="help-contacts-report-error-error"
                message={reportErrorEmailError}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="policy-actions help-contacts-actions">
        <button
          type="submit"
          className="btn primary touch-target"
          disabled={!canSave}
        >
          {t("settings.system.helpContactsSave")}
        </button>
        <button
          type="button"
          className="btn touch-target"
          disabled={!dirty}
          onClick={seedFromStore}
        >
          {t("settings.system.discardChanges")}
        </button>
      </div>
    </form>
  );
};

// Driver upload limits — the largest single file a driver may upload, and the
// largest total one upload area may hold. Both in megabytes. Follows the
// numeric-policy helpers above (dirty-gated inline errors, Save gated on
// validity) and adds the one rule the other cards do not have: a total below
// the per-file limit is rejected here, since it would configure a state in
// which no permitted file could ever be uploaded.
const DriverUploadLimitsForm = ({ showToast }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const limits = store.getDriverUploadLimits();

  // Stored values as primitives. getDriverUploadLimits() hands back a fresh
  // object on every call, so the re-seed effect depends on these and not on
  // `limits` — an object dep would fire on every render and wipe typing.
  const storedMaxFileMb = Number(limits.maxFileMb);
  const storedMaxTotalMb = Number(limits.maxTotalMb);

  const [maxFileMb, setMaxFileMb] = useStateA(String(storedMaxFileMb));
  const [maxTotalMb, setMaxTotalMb] = useStateA(String(storedMaxTotalMb));

  const UPLOAD_LIMIT_MAX_FILE_MB = uploadLimitMaxFileMb();
  const UPLOAD_LIMIT_MAX_TOTAL_MB = uploadLimitMaxTotalMb();

  const seedFromStore = () => {
    setMaxFileMb(String(storedMaxFileMb));
    setMaxTotalMb(String(storedMaxTotalMb));
  };

  useEffectA(seedFromStore, [storedMaxFileMb, storedMaxTotalMb]);

  const dirty =
    isPolicyNumberDirty(maxFileMb, storedMaxFileMb) ||
    isPolicyNumberDirty(maxTotalMb, storedMaxTotalMb);

  const isMaxFileValid = isPolicyNumberValid(
    maxFileMb,
    UPLOAD_LIMIT_MAX_FILE_MB,
  );
  const isMaxTotalValid = isPolicyNumberValid(
    maxTotalMb,
    UPLOAD_LIMIT_MAX_TOTAL_MB,
  );

  // Cross-field rule: only meaningful once both fields are individually
  // valid — otherwise the field's own message is the actionable one.
  const isTotalBelowFile =
    isMaxFileValid &&
    isMaxTotalValid &&
    Number(maxTotalMb) < Number(maxFileMb);

  const canSave =
    dirty && isMaxFileValid && isMaxTotalValid && !isTotalBelowFile;

  const maxFileError = policyNumberError(
    maxFileMb,
    storedMaxFileMb,
    t("settings.system.uploadLimitsRangeError", {
      min: MIN_POLICY_NUMBER,
      max: UPLOAD_LIMIT_MAX_FILE_MB,
    }),
    UPLOAD_LIMIT_MAX_FILE_MB,
  );
  // Cross-field message sits on the total — that is the field the admin must
  // raise (or the per-file limit they must lower) — and only after the field's
  // own range rule is satisfied.
  const maxTotalError =
    policyNumberError(
      maxTotalMb,
      storedMaxTotalMb,
      t("settings.system.uploadLimitsRangeError", {
        min: MIN_POLICY_NUMBER,
        max: UPLOAD_LIMIT_MAX_TOTAL_MB,
      }),
      UPLOAD_LIMIT_MAX_TOTAL_MB,
    ) ||
    (dirty && isTotalBelowFile
      ? t("settings.system.uploadLimitsTotalBelowFileError", {
          maxFileMb: Number(maxFileMb),
        })
      : "");

  const save = (event) => {
    event.preventDefault();
    if (!canSave) return;
    store.setDriverUploadLimits({
      maxFileMb: Number(maxFileMb),
      maxTotalMb: Number(maxTotalMb),
    });
    showToast?.(t("settings.system.uploadLimitsSaved"));
  };

  return (
    <form
      className="upload-limits-form"
      onSubmit={save}
      noValidate
    >
      <div className="policy-grid">
        <div className="policy-field">
          <label className="field-label" htmlFor="upload-limits-max-file">
            {t("settings.system.uploadLimitsMaxFileLabel")}
          </label>
          <input
            id="upload-limits-max-file"
            className="input"
            type="number"
            min={MIN_POLICY_NUMBER}
            max={UPLOAD_LIMIT_MAX_FILE_MB}
            step={1}
            value={maxFileMb}
            style={maxFileError ? userInputErrStyle : undefined}
            aria-invalid={maxFileError ? true : undefined}
            aria-describedby={
              maxFileError
                ? "upload-limits-max-file-hint upload-limits-max-file-error"
                : "upload-limits-max-file-hint"
            }
            onChange={(e) => setMaxFileMb(e.target.value)}
          />
          <p id="upload-limits-max-file-hint" className="upload-limits-hint">
            {t("settings.system.uploadLimitsMaxFileHint")}
          </p>
          <UserFormError
            id="upload-limits-max-file-error"
            message={maxFileError}
          />
        </div>
        <div className="policy-field">
          <label className="field-label" htmlFor="upload-limits-max-total">
            {t("settings.system.uploadLimitsMaxTotalLabel")}
          </label>
          <input
            id="upload-limits-max-total"
            className="input"
            type="number"
            min={MIN_POLICY_NUMBER}
            max={UPLOAD_LIMIT_MAX_TOTAL_MB}
            step={1}
            value={maxTotalMb}
            style={maxTotalError ? userInputErrStyle : undefined}
            aria-invalid={maxTotalError ? true : undefined}
            aria-describedby={
              maxTotalError
                ? "upload-limits-max-total-hint upload-limits-max-total-error"
                : "upload-limits-max-total-hint"
            }
            onChange={(e) => setMaxTotalMb(e.target.value)}
          />
          <p id="upload-limits-max-total-hint" className="upload-limits-hint">
            {t("settings.system.uploadLimitsMaxTotalHint")}
          </p>
          <UserFormError
            id="upload-limits-max-total-error"
            message={maxTotalError}
          />
        </div>
      </div>

      <div className="policy-actions upload-limits-actions">
        <button
          type="submit"
          className="btn primary touch-target"
          disabled={!canSave}
        >
          {t("settings.system.uploadLimitsSave")}
        </button>
        <button
          type="button"
          className="btn touch-target"
          disabled={!dirty}
          onClick={seedFromStore}
        >
          {t("settings.system.discardChanges")}
        </button>
      </div>
    </form>
  );
};

// Appearance toggle icon — matches the Autheon console's ThemeToggle: in
// dark mode it shows the sun (click → light), in light mode the moon
// (click → dark). Lucide-equivalent strokes, drawn with prototype tokens.
const SunIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);
const MoonIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// Change email — maps the store's rejection reason onto the field, using the
// console's own message for each one rather than a generic failure string.
const changeEmailErr = (r, t) => {
  if (!r || r.ok) return "";
  if (r.reason === "required") return t("settings.account.fieldRequired");
  if (r.reason === "invalid_email")
    return t("settings.account.changeEmail.invalidEmail");
  if (r.reason === "duplicate_email") return t("adminUsersEmailDuplicate");
  return t("adminInvoiceErrGeneric");
};

// SettingsPane — mirrors the Autheon admin console's tabbed Settings screen
// (User settings · System settings), plus a prototype-only Prototype settings
// tab holding the branding display name and the finance-module flag. The shell
// chrome owns the single page title ("Settings" via navFeatures); this pane
// opens with the console's Settings subtitle as its lead and never repeats the
// h1. Tab state is component-local and resets on navigating away, matching the
// console. Branding and the finance flag are moved, not changed: the display
// name still writes its audit entry and the flag still gates the Finance nav
// item. The operational-policies form is relocated unchanged (ticket 03
// improves it). User settings ships with Language + Appearance rows wired to
// the same global locale/theme state as the demo chrome, plus the console's
// Change email and Change password sections above them. Change email is real:
// it writes to the demo dispatcher record via updateAdmin and lands in the
// Audit log. Change password enforces the console's client-side rules and
// persists nothing — there is no password state in the store, and inventing
// one would be worse than the gap.
const SettingsPane = ({ showToast }) => {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = window.AutheonTheme
    ? window.AutheonTheme.useTheme()
    : { theme: "light", setTheme: () => {} };
  const store = useAuthStore();
  const [tab, setTab] = useStateA("user");
  const baseId = useIdA();

  const tabs = [
    {
      id: "user",
      label: t("settings.user.title"),
      tabId: `${baseId}-tab-user`,
      panelId: `${baseId}-panel-user`,
    },
    {
      id: "system",
      label: t("settings.system.title"),
      tabId: `${baseId}-tab-system`,
      panelId: `${baseId}-panel-system`,
    },
    {
      id: "prototype",
      label: t("settings.prototype.title"),
      tabId: `${baseId}-tab-prototype`,
      panelId: `${baseId}-panel-prototype`,
    },
  ];

  const onTabKeyDown = (event, currentId) => {
    const index = tabs.findIndex((it) => it.id === currentId);
    if (index < 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(index + delta + tabs.length) % tabs.length];
      if (!next) return;
      setTab(next.id);
      const el = document.getElementById(next.tabId);
      if (el) el.focus();
    }
  };

  // --- Change email -------------------------------------------------------
  // Seeded from the demo dispatcher record and re-seeded whenever it changes.
  // The store owns every rule (required / malformed / duplicate); the only
  // check here is the console's own guard against re-submitting the address
  // that is already saved, which the store has no reason to reject.
  const currentAdmin = store.getCurrentAdmin();
  const currentEmail = String(currentAdmin?.email || "");
  const [emailValue, setEmailValue] = useStateA(currentEmail);
  const [emailError, setEmailError] = useStateA("");

  useEffectA(() => {
    setEmailValue(currentEmail);
    setEmailError("");
  }, [currentEmail]);

  const emailDirty = emailValue !== currentEmail;

  const submitEmail = (e) => {
    e.preventDefault();
    if (!currentAdmin) return;
    // Read the saved address off the live record BEFORE updateAdmin runs.
    const savedEmail = String(currentAdmin.email || "");
    const next = emailValue.trim().toLowerCase();
    if (next && next === savedEmail.toLowerCase()) {
      setEmailError(t("settings.account.changeEmail.unchanged"));
      return;
    }
    const r = store.updateAdmin(currentAdmin.id, { email: next });
    if (!r.ok) {
      setEmailError(changeEmailErr(r, t));
      return;
    }
    setEmailError("");
    showToast?.(t("settings.account.changeEmail.successToast"), next);
  };

  // --- Change password ----------------------------------------------------
  // Client-side only, exactly the console's rules. Nothing is persisted: the
  // store holds no password state and this ticket does not add any.
  const emptyPasswordForm = { current: "", next: "", confirm: "" };
  const [passwordForm, setPasswordForm] = useStateA(emptyPasswordForm);
  const [passwordErrors, setPasswordErrors] = useStateA({});
  const setPasswordField = (key, value) => {
    setPasswordForm((p) => ({ ...p, [key]: value }));
    setPasswordErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submitPassword = (e) => {
    e.preventDefault();
    const errors = {};
    if (!passwordForm.current)
      errors.current = t("settings.account.fieldRequired");
    if (passwordForm.next.length < 8)
      errors.next = t("settings.account.changePassword.passwordMinLength");
    if (!passwordForm.confirm)
      errors.confirm = t(
        "settings.account.changePassword.confirmPasswordRequired",
      );
    // The console's mismatch check is a schema-level refine: it only runs once
    // every field passes its own rule.
    if (
      !Object.keys(errors).length &&
      passwordForm.next !== passwordForm.confirm
    )
      errors.confirm = t("settings.account.changePassword.passwordMismatch");
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordForm(emptyPasswordForm);
    setPasswordErrors({});
    showToast?.(t("settings.account.changePassword.successToast"), "");
  };

  // Prototype settings — branding + finance flag, relocated unchanged.
  const flags = store.getFeatureFlags();
  const appDisplayName = store.getAppDisplayName();
  const [displayName, setDisplayName] = useStateA(appDisplayName);

  useEffectA(() => {
    setDisplayName(appDisplayName);
  }, [appDisplayName]);

  const commitDisplayName = () => {
    store.setAppDisplayName(displayName);
  };

  const nextTheme = theme === "dark" ? "light" : "dark";
  const appearanceAria =
    nextTheme === "light"
      ? t("settings.user.appearanceLight")
      : t("settings.user.appearanceDark");

  return (
    <div style={{ maxWidth: 720 }}>
      <p className="settings-lead">{t("settings.subtitle")}</p>

      <div
        className="settings-tabs"
        role="tablist"
        aria-label={t("navFeatures")}
      >
        {tabs.map((it) => {
          const selected = tab === it.id;
          return (
            <button
              key={it.id}
              id={it.tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={it.panelId}
              tabIndex={selected ? 0 : -1}
              className={`settings-tab${selected ? " on" : ""}`}
              onClick={() => setTab(it.id)}
              onKeyDown={(e) => onTabKeyDown(e, it.id)}
            >
              {it.label}
            </button>
          );
        })}
      </div>

      {tab === "user" && (
        <section
          id={`${baseId}-panel-user`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-user`}
          className="settings-tabpanel"
        >
          <p className="settings-lead">{t("settings.user.subtitle")}</p>

          <div className="settings-section">
            <div className="settings-row-label">
              {t("settings.account.changeEmail.title")}
            </div>
            <div className="settings-row-hint">
              {t("settings.account.changeEmail.description")}
            </div>
            <form className="settings-form" onSubmit={submitEmail} noValidate>
              <div>
                <label
                  className="field-label"
                  htmlFor={`${baseId}-change-email`}
                >
                  {t("settings.account.changeEmail.emailLabel")}
                </label>
                <input
                  id={`${baseId}-change-email`}
                  className="input"
                  type="email"
                  autoComplete="email"
                  style={emailError ? userInputErrStyle : undefined}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={
                    emailError ? `${baseId}-change-email-error` : undefined
                  }
                  value={emailValue}
                  onChange={(e) => {
                    setEmailValue(e.target.value);
                    setEmailError("");
                  }}
                />
                <UserFormError
                  id={`${baseId}-change-email-error`}
                  message={emailError}
                />
              </div>
              <div className="settings-form-actions">
                <button
                  type="submit"
                  className="btn primary"
                  disabled={!emailDirty}
                >
                  {t("settings.account.changeEmail.submitButton")}
                </button>
              </div>
            </form>
          </div>

          <div className="settings-section">
            <div className="settings-row-label">
              {t("settings.account.changePassword.title")}
            </div>
            <div className="settings-row-hint">
              {t("settings.account.changePassword.description")}
            </div>
            <form
              className="settings-form"
              onSubmit={submitPassword}
              noValidate
            >
              <div>
                <label
                  className="field-label"
                  htmlFor={`${baseId}-current-password`}
                >
                  {t("settings.account.changePassword.currentPasswordLabel")}
                </label>
                <input
                  id={`${baseId}-current-password`}
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  style={passwordErrors.current ? userInputErrStyle : undefined}
                  aria-invalid={passwordErrors.current ? true : undefined}
                  aria-describedby={
                    passwordErrors.current
                      ? `${baseId}-current-password-error`
                      : undefined
                  }
                  value={passwordForm.current}
                  onChange={(e) => setPasswordField("current", e.target.value)}
                />
                <UserFormError
                  id={`${baseId}-current-password-error`}
                  message={passwordErrors.current}
                />
              </div>
              <div>
                <label
                  className="field-label"
                  htmlFor={`${baseId}-new-password`}
                >
                  {t("settings.account.changePassword.newPasswordLabel")}
                </label>
                <input
                  id={`${baseId}-new-password`}
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  style={passwordErrors.next ? userInputErrStyle : undefined}
                  aria-invalid={passwordErrors.next ? true : undefined}
                  aria-describedby={
                    passwordErrors.next
                      ? `${baseId}-new-password-error`
                      : undefined
                  }
                  value={passwordForm.next}
                  onChange={(e) => setPasswordField("next", e.target.value)}
                />
                <UserFormError
                  id={`${baseId}-new-password-error`}
                  message={passwordErrors.next}
                />
              </div>
              <div>
                <label
                  className="field-label"
                  htmlFor={`${baseId}-confirm-password`}
                >
                  {t("settings.account.changePassword.confirmPasswordLabel")}
                </label>
                <input
                  id={`${baseId}-confirm-password`}
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  style={passwordErrors.confirm ? userInputErrStyle : undefined}
                  aria-invalid={passwordErrors.confirm ? true : undefined}
                  aria-describedby={
                    passwordErrors.confirm
                      ? `${baseId}-confirm-password-error`
                      : undefined
                  }
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordField("confirm", e.target.value)}
                />
                <UserFormError
                  id={`${baseId}-confirm-password-error`}
                  message={passwordErrors.confirm}
                />
              </div>
              <div className="settings-form-actions">
                <button type="submit" className="btn primary">
                  {t("settings.account.changePassword.submitButton")}
                </button>
              </div>
            </form>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-row-label">
                {t("settings.user.languageLabel")}
              </div>
              <div className="settings-row-hint">
                {t("settings.user.languageHint")}
              </div>
            </div>
            <div
              className="seg"
              style={{ display: "inline-grid", gridAutoFlow: "column" }}
              role="group"
              aria-label={t("settings.user.languageLabel")}
            >
              <button
                type="button"
                className={locale === "en" ? "on" : ""}
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
              >
                {t("settings.user.langEn")}
              </button>
              <button
                type="button"
                className={locale === "de" ? "on" : ""}
                aria-pressed={locale === "de"}
                onClick={() => setLocale("de")}
              >
                {t("settings.user.langDe")}
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-row-label">
                {t("settings.user.appearanceLabel")}
              </div>
              <div className="settings-row-hint">
                {t("settings.user.appearanceHint")}
              </div>
            </div>
            <button
              type="button"
              className="btn icon touch-target appearance-toggle"
              aria-label={appearanceAria}
              aria-pressed={theme === "dark"}
              onClick={() => setTheme(nextTheme)}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </section>
      )}

      {tab === "system" && (
        <section
          id={`${baseId}-panel-system`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-system`}
          className="settings-tabpanel"
        >
          <p className="settings-lead">{t("settings.system.subtitle")}</p>

          <section className="card" style={{ padding: 22 }}>
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

          {/* Its own card rather than another row in Operational policies: this
              is the only setting that makes the platform change a partner's
              status unattended, and it owns a manual trigger. */}
          <section className="card" style={{ padding: 22, marginTop: 18 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
              {t("adminInactivityTitle")}
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
              {t("adminInactivityBlurb")}
            </p>
            <DriverInactivityForm showToast={showToast} />
          </section>

          <section className="card" style={{ padding: 22, marginTop: 18 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
              {t("settings.system.helpContactsTitle")}
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
              {t("settings.system.helpContactsBlurb")}
            </p>
            <HelpContactsForm showToast={showToast} />
          </section>

          <section className="card" style={{ padding: 22, marginTop: 18 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
              {t("settings.system.uploadLimitsTitle")}
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
              {t("settings.system.uploadLimitsBlurb")}
            </p>
            <DriverUploadLimitsForm showToast={showToast} />
          </section>

          <section className="card" style={{ padding: 22, marginTop: 18 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
              {t("statusExplain.title")}
            </h2>
            <p
              style={{
                color: "var(--muted)",
                marginTop: 8,
                marginBottom: 14,
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {t("statusExplain.intro")}
            </p>
            <ul
              className="status-explain-list"
              role="list"
              style={{ margin: 0 }}
            >
              {[
                "draft",
                "published",
                "assigned",
                "accepted",
                "empty_run_reported",
                "performed",
                "cancelled",
              ].map((key) => (
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
            <p
              className="status-explain-note"
              style={{ marginTop: 12, marginBottom: 0 }}
            >
              {t("statusExplain.noteSeparate")}
            </p>
          </section>
        </section>
      )}

      {tab === "prototype" && (
        <section
          id={`${baseId}-panel-prototype`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-prototype`}
          className="settings-tabpanel"
        >
          <p className="settings-lead">{t("settings.prototype.subtitle")}</p>

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
          <section
            className="card"
            style={{ padding: "0 18px", marginTop: 14 }}
          >
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
                      onChange={(e) =>
                        store.setFeatureFlag(key, e.target.checked)
                      }
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                  </label>
                </div>
              );
            })}
          </section>
        </section>
      )}
    </div>
  );
};

// =========================================================================
// LOGIN — admin console (autheon-fe parity: apps/admin LoginPage,
// centered-card layout — muted canvas, centered card with logo/heading,
// LoginForm inside).
// =========================================================================
const AdminLoginScreen = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [mode, setMode] = useStateA("login"); // login | forgot
  const [notice, setNotice] = useStateA("");

  const body =
    mode === "forgot" ? (
      <DriverUI.ForgotPasswordFlow
        kind="admin"
        onExit={() => setMode("login")}
        onDone={() => {
          setMode("login");
          setNotice(t("authForgotPasswordSuccessNotice"));
        }}
        copy={{
          invalidEmail: t("authErrorInvalidEmail"),
          title: t("authAdminForgotTitle"),
          subtitle: t("authAdminForgotSubtitle"),
          emailLabel: t("authAdminForgotEmailLabel"),
          emailPlaceholder: t("authAdminForgotEmailPlaceholder"),
          submit: t("authAdminForgotSubmit"),
          backToLogin: t("authAdminForgotBackToLogin"),
          otpTitle: t("authAdminForgotOtpTitle"),
          otpSubtitlePrefix: t("authAdminForgotOtpSubtitlePrefix"),
          otpSubmit: t("authAdminForgotOtpSubmit"),
          otpResendCooldownPrefix: t("authAdminForgotOtpResendCooldownPrefix"),
          otpResendButton: t("authAdminForgotOtpResendButton"),
          otpBack: t("authAdminForgotOtpBack"),
          otpInvalidCode: t("authAdminForgotOtpInvalidCode", { length: 6 }),
          otpIncorrectCode: t("authAdminForgotOtpIncorrectCode"),
          resetTitle: t("authAdminResetTitle"),
          resetSubtitle: t("authAdminResetSubtitle"),
          resetPasswordLabel: t("authAdminResetPasswordLabel"),
          resetPasswordPlaceholder: t("authAdminResetPasswordPlaceholder"),
          resetConfirmLabel: t("authAdminResetConfirmLabel"),
          resetConfirmPlaceholder: t("authAdminResetConfirmPlaceholder"),
          resetSubmit: t("authAdminResetSubmit"),
          resetBack: t("authAdminResetBack"),
          resetMinLength: t("authAdminResetMinLength"),
          resetConfirmRequired: t("authAdminResetConfirmRequired"),
          resetMismatch: t("authAdminResetMismatch"),
          demoHint: (code) => t("authForgotPasswordDemoHint", { code }),
        }}
      />
    ) : (
      <>
        <div className="auth-logo-row">
          <img
            className="brand-mark"
            src="favicon.svg"
            alt=""
            width="22"
            height="22"
            aria-hidden="true"
          />
          <span className="auth-logo-text">{store.getAppDisplayName()}</span>
        </div>
        <div className="auth-heading-block">
          <h1 className="auth-heading">{t("authAdminLoginTitle")}</h1>
          <p className="auth-subheading">{t("authAdminLoginSubtitle")}</p>
        </div>
        {notice && (
          <InlineAlert
            tone="success"
            message={notice}
            onDismiss={() => setNotice("")}
          />
        )}
        <DriverUI.LoginForm
          emailLabel={t("authAdminLoginEmailLabel")}
          emailPlaceholder={t("authAdminLoginEmailPlaceholder")}
          passwordLabel={t("authAdminLoginPasswordLabel")}
          passwordPlaceholder={t("authAdminLoginPasswordPlaceholder")}
          showPasswordLabel={t("authAdminLoginShowPassword")}
          hidePasswordLabel={t("authAdminLoginHidePassword")}
          submitLabel={t("authAdminLoginSubmit")}
          forgotPasswordLabel={t("authAdminLoginForgotPassword")}
          onForgotPassword={() => {
            setNotice("");
            setMode("forgot");
          }}
          onSubmit={(email, password) => store.loginAdmin({ email, password })}
          demoEmail="demo.admin@demo.local"
          demoFillLabel={t("authDemoFillButton")}
        />
      </>
    );

  return (
    <div className="auth-shell-admin">
      <div className="card auth-card-admin">
        <DriverUI.AuthTopChrome />
        {body}
      </div>
    </div>
  );
};

// =========================================================================
// SET PASSWORD / ACCEPT INVITE — admin console (autheon-fe parity:
// apps/admin SetPasswordPage — differs from the driver version in copy
// only: "Create your account" / "Create account" + a success toast). NOT
// wired to any reachable screen — see the driver-side comment above.
// =========================================================================
const AdminSetPasswordScreen = ({ email = "", token = "" }) => {
  const { t } = useI18n();
  const isValidLink = Boolean(email && token);

  const body = (
    <>
      <div className="auth-logo-row">
        <img
          className="brand-mark"
          src="favicon.svg"
          alt=""
          width="22"
          height="22"
          aria-hidden="true"
        />
        <span className="auth-logo-text">{AuthStore.getAppDisplayName()}</span>
      </div>
      <div className="auth-heading-block">
        <h1 className="auth-heading">
          {isValidLink
            ? t("authAdminSetPasswordTitle")
            : t("authAdminSetPasswordInvalidLinkTitle")}
        </h1>
        <p className="auth-subheading">
          {isValidLink
            ? t("authAdminSetPasswordSubtitle")
            : t("authAdminSetPasswordInvalidLinkMessage")}
        </p>
      </div>
      {isValidLink ? (
        <DriverUI.SetPasswordForm
          email={email}
          token={token}
          kind="admin"
          onDone={() => {}}
          copy={{
            passwordLabel: t("authAdminSetPasswordPasswordLabel"),
            passwordPlaceholder: t("authAdminSetPasswordPasswordPlaceholder"),
            confirmLabel: t("authAdminSetPasswordConfirmLabel"),
            confirmPlaceholder: t("authAdminSetPasswordConfirmPlaceholder"),
            showPassword: t("authAdminLoginShowPassword"),
            hidePassword: t("authAdminLoginHidePassword"),
            submit: t("authAdminSetPasswordSubmit"),
            minLength: t("authAdminSetPasswordMinLength"),
            complexity: t("authAdminSetPasswordComplexity"),
            confirmRequired: t("authAdminSetPasswordConfirmRequired"),
            mismatch: t("authAdminSetPasswordMismatch"),
            invalidLinkMessage: t("authAdminSetPasswordInvalidLinkMessage"),
          }}
        />
      ) : (
        <p className="auth-subheading">
          {t("authAdminSetPasswordInvalidLinkHint")}
        </p>
      )}
    </>
  );

  return (
    <div className="auth-shell-admin">
      <div className="card auth-card-admin">
        <DriverUI.AuthTopChrome />
        {body}
      </div>
    </div>
  );
};

Object.assign(window, {
  AdminNav,
  AdminLoginScreen,
  AdminSetPasswordScreen,
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
  ServicePartnersCenterPane,
  StaffPane,
  CustomerCenterPane,
  CustomersPane,
  AddressesPane,
  DocumentsPane,
  InfopointPane,
  TourBillingPane,
  TourBillingCenterPane,
  ConsolidatedInvoicesPane,

  AuditPane,
  NotificationFeedPane,
  MasterDataRequestsPane,
  SettingsPane,
});
