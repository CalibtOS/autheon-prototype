/* global React, AuthStore, useAuthStore */
const { useState, useEffect, useRef, useMemo } = React;

const UI = window.DriverUI || {};
const { Badge, EmptyState, SkeletonList, Sheet, ConfirmSheet, SortSelect } = UI;
const F = () => window.AutheonFormatters || {};

// Draggable paged views — a dependency-free carousel for tab content.
// All panes are rendered side-by-side in a horizontal track; the track
// follows the finger during a horizontal drag so the adjacent tab peeks in,
// then snaps to the nearest tab on release. Vertical drags are left to the
// pane's own scrolling. Swipe left → next tab, swipe right → previous tab.
const SwipeViews = ({
  index,
  count,
  onIndexChange,
  className = "",
  style,
  children,
}) => {
  const [dragDx, setDragDx] = useState(null); // px offset while dragging, else null
  const gesture = useRef(null); // { x, y, axis: "x" | "y" | null }
  const widthRef = useRef(1);
  const viewportRef = useRef(null);

  const onTouchStart = (e) => {
    if (e.touches.length !== 1) {
      gesture.current = null;
      return;
    }
    const p = e.touches[0];
    gesture.current = { x: p.clientX, y: p.clientY, axis: null };
    widthRef.current =
      (viewportRef.current && viewportRef.current.offsetWidth) || 1;
  };
  const onTouchMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    const p = e.touches[0];
    const dx = p.clientX - g.x;
    const dy = p.clientY - g.y;
    // Lock the gesture to one axis after a small initial movement.
    if (g.axis === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (g.axis !== "x") return; // vertical → let the pane scroll
    if (e.cancelable) e.preventDefault(); // own the horizontal gesture
    let d = dx;
    // Rubber-band resistance when dragging past the first/last tab.
    if ((index === 0 && d > 0) || (index === count - 1 && d < 0)) d *= 0.35;
    setDragDx(d);
  };
  const onTouchEnd = () => {
    const g = gesture.current;
    gesture.current = null;
    const d = dragDx;
    setDragDx(null);
    if (!g || g.axis !== "x" || d == null) return;
    const threshold = Math.min(72, widthRef.current * 0.22);
    let next = index;
    if (d <= -threshold) next = Math.min(count - 1, index + 1);
    else if (d >= threshold) next = Math.max(0, index - 1);
    if (next !== index) onIndexChange(next);
  };

  const offset = dragDx || 0;
  const trackStyle = {
    transform: `translate3d(calc(${-index * 100}% + ${offset}px), 0, 0)`,
    transition:
      dragDx == null
        ? "transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)"
        : "none",
  };

  return (
    <div
      ref={viewportRef}
      className={`swipe-viewport ${className}`.trim()}
      style={style}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div className="swipe-track" style={trackStyle}>
        {React.Children.map(children, (child, i) => (
          <div className="swipe-pane" aria-hidden={i !== index}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

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
    "driven on own wheels": t("ownAxle"),
    "third-party axle": t("thirdPartyAxle"),
    "Own axle": t("ownAxle"),
    "Third-party axle": t("thirdPartyAxle"),
    Eigenachse: t("ownAxle"),
    Fremdachse: t("thirdPartyAxle"),
  })[value] || value;

// Canonical store axle values for filter comparisons
const canonAxle = (v) =>
  ({
    "Own axle": "driven on own wheels",
    "Third-party axle": "third-party axle",
    Eigenachse: "driven on own wheels",
    Fremdachse: "third-party axle",
  })[v] || v;

const displayVehicle = (value, t) =>
  ({
    All: t("all"),
    "Light truck <3.5t": t("lightTruck"),
  })[value] || value;

// Vehicle values come from two sources: seed data (SUV, PKW, Van,
// Light truck <3.5t) and the admin New Order form (SUV, PKW, Transporter,
// LKW < 3,5t, Oldtimer) — map both to one icon per type.
const vehicleTypeIcon = (vehicle) => {
  switch (vehicle) {
    case "SUV":
      return <Ic.VehicleSuv />;
    case "Van":
    case "Transporter":
      return <Ic.VehicleVan />;
    case "Light truck <3.5t":
    case "LKW < 3,5t":
      return <Ic.VehicleLightTruck />;
    case "Oldtimer":
    case "Classic":
      return <Ic.VehicleClassic />;
    default:
      return <Ic.VehicleCar />;
  }
};

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

const InlineAlert = ({ tone = "error", message, onDismiss }) => {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <div className={`inline-alert inline-alert-${tone}`} role="alert">
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          className="inline-alert-dismiss touch-target"
          onClick={onDismiss}
          aria-label={t("uiDismiss")}
        >
          ×
        </button>
      ) : null}
    </div>
  );
};

// Inline policy disclosure — replaces window.alert (plan §6.2 feedback hierarchy)
const PolicyDisclosure = ({ introKey = "partnerTermsApply" }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      {t(introKey)}{" "}
      <button
        type="button"
        className="btn ghost xs"
        style={{
          color: "var(--primary)",
          padding: 0,
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t("viewDriverPolicy")}
      </button>
      {open ? (
        <div className="stack-8">
          <InlineAlert
            tone="info"
            message={t("partnerPolicyAlert")}
            onDismiss={() => setOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
};

const tourDocUploadErrorMessage = (reason, t) => {
  if (reason === "invalid_type") return t("invoiceUploadInvalidType");
  if (reason === "driver_restricted") return t("invoiceUploadRestricted");
  if (reason === "job_not_performed" || reason === "job_not_uploadable")
    return t("tourDocRequiresPerformed");
  if (reason === "not_assigned_driver") return t("invoiceUploadNotYourTour");
  if (reason === "job_required" || reason === "bad_job")
    return t("invoiceUploadTourRequired");
  if (reason === "not_replaceable") return t("tourDocReplaceNotAllowed");
  if (reason === "not_owner") return t("tourDocReplaceNotOwner");
  if (reason === "official_doc_not_replaceable")
    return t("tourDocOfficialNotReplaceable");
  return t("invoiceUploadTourRequired");
};

const jobNeedsDocCorrection = (job, store) =>
  job.status === "performed" &&
  (/correction/i.test(String(job.documentReviewSummary || "")) ||
    store
      .getDriverTourDocumentsForJob(job.id)
      .some((d) =>
        AuthStore.tourDocumentNeedsDriverCorrection(d.reviewStatus),
      ));

// Autheon "A" mark used by the Marketplace tab. Shared between the animated
// active state and the static inactive state so the path data lives in one place.
const AutheonMark = ({ animated = false }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 8 48 32"
    className={animated ? "tabbar-anim-mark" : "tabbar-static-mark"}
    fill="currentColor"
    aria-hidden="true"
  >
    <g transform="translate(0 8)">
      <path pathLength="1" d="M28.7452 0.0499943C29.3687 -0.0214756 30.9431 0.0174098 31.6381 0.0180174C33.6279 0.0329038 35.6176 0.0269789 37.6073 0.000244141C37.9458 1.15288 38.4111 2.45984 38.7891 3.62569L41.1318 10.8437C38.7802 10.9527 36.152 10.7687 33.7703 10.8188C32.0193 10.8557 30.1961 10.7226 28.4612 11.2014C22.0467 12.9713 19.8914 18.3673 16.7499 23.549C15.1759 26.1455 13.6026 28.6479 12.0805 31.2103L11.6666 31.9194C10.5996 31.9722 9.42407 31.9176 8.34659 31.9306C5.58855 31.964 2.75097 31.8662 0 31.9517C0.997865 30.5292 2.50586 27.8959 3.46749 26.3335L10.5896 14.7129C12.8592 10.9904 14.5347 7.73199 17.8721 4.82268C21.2443 1.883 24.3891 0.573297 28.7452 0.0499943Z" />
      <path pathLength="1" d="M38.3618 17.8626C38.3839 18.3225 39.4974 21.737 39.7447 22.4479C40.7885 25.4482 41.7117 29.0015 42.8468 31.9303C41.7937 31.9141 40.7088 31.9275 39.653 31.9275C38.8473 29.1833 37.9224 26.436 37.0768 23.7013C36.7626 22.685 35.9017 21.6732 34.9229 21.2676C33.7384 20.7767 32.2683 20.8416 31.0836 21.3173C30.3712 21.6337 29.7327 22.0982 29.2099 22.6805C28.5719 23.4055 27.1835 25.8009 26.6472 26.7238C25.6773 28.3928 24.4654 30.2545 23.5761 31.9292C22.505 31.9238 20.7214 31.8709 19.7114 31.9733C20.4259 30.5267 21.7266 28.4617 22.6104 27.09C25.1161 23.2008 26.6843 18.2008 31.9865 17.9032C32.4559 17.8373 33.7521 17.8563 34.2521 17.8566L38.3618 17.8626Z" />
      <path pathLength="1" d="M30.693 13.1161C32.8075 12.965 36.2745 13.0789 38.499 13.0869C38.6766 14.0339 39.1326 15.2447 39.3859 16.2471C37.5936 16.3169 35.7941 16.2525 34.0053 16.2721C32.7015 16.2864 31.2113 16.1606 29.9673 16.5009C26.065 17.5685 24.7269 20.5448 22.8602 23.6919L19.7354 28.9582C19.1403 29.937 18.5601 30.9247 17.9947 31.9212C17.0191 31.9231 14.7918 31.8713 13.897 32.0002C14.6112 30.9063 15.3757 29.5605 16.0567 28.4225L19.6507 22.4045C22.4928 17.5959 24.5497 13.7028 30.693 13.1161Z" />
      <path pathLength="1" d="M39.459 17.9398C40.5644 17.9793 41.8666 17.9475 42.9877 17.9492C43.1074 18.7702 43.924 21.0614 44.235 22.0024L47.622 31.9301L43.9359 31.9237C42.5317 27.2651 40.8029 22.6291 39.459 17.9398Z" />
    </g>
  </svg>
);

// Slide-to-confirm handle icons: arrow while ready, lock while disabled,
// check once confirmed. Sized/coloured via CSS (.slide-handle-icon).
const SlideArrowIcon = () => (
  <svg className="slide-handle-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 5l7 7-7 7"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const SlideCheckIcon = () => (
  <svg className="slide-handle-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 12.5l4.5 4.5L19 7"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const SlideLockIcon = () => (
  <svg className="slide-handle-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="10.5" width="14" height="9" rx="2.2" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 10.5V8a4 4 0 118 0v2.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Ic = {
  // Vehicle type icons — mdi:car-suv (Apache-2.0), tabler:car (MIT),
  // lucide:van (ISC), hugeicons:delivery-truck-01 (MIT),
  // mdi:car-convertible (Apache-2.0)
  VehicleSuv: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 6h13l3 4h2c1.11 0 2 .89 2 2v3h-2a3 3 0 0 1-3 3a3 3 0 0 1-3-3H9a3 3 0 0 1-3 3a3 3 0 0 1-3-3H1V8c0-1.11.89-2 2-2m-.5 1.5V10h8V7.5zm9.5 0V10h5.14l-1.89-2.5zm-6 6A1.5 1.5 0 0 0 4.5 15A1.5 1.5 0 0 0 6 16.5A1.5 1.5 0 0 0 7.5 15A1.5 1.5 0 0 0 6 13.5m12 0a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 0 1.5-1.5a1.5 1.5 0 0 0-1.5-1.5" />
    </svg>
  ),
  VehicleCar: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6" />
    </svg>
  ),
  VehicleVan: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 6v5a1 1 0 0 0 1 1h6.102a1 1 0 0 1 .712.298l.898.91a1 1 0 0 1 .288.702V17a1 1 0 0 1-1 1h-3" />
      <path d="M5 18H3a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h12c1.1 0 2.1.8 2.4 1.8l1.176 4.2M9 18h5" />
      <circle cx="16" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  ),
  VehicleLightTruck: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 17.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0Zm-10 0a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0Z" />
      <path d="M14.5 17.5h-5m10 0h.763c.22 0 .33 0 .422-.012a1.5 1.5 0 0 0 1.303-1.302c.012-.093.012-.203.012-.423V13a6.5 6.5 0 0 0-6.5-6.5M2 4h10c1.414 0 2.121 0 2.56.44C15 4.878 15 5.585 15 7v8.5M2 12.75V15c0 .935 0 1.402.201 1.75a1.5 1.5 0 0 0 .549.549c.348.201.815.201 1.75.201M2 7h6m-6 3h4" />
    </svg>
  ),
  VehicleClassic: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="m16 6l-1 .75L17.5 10h-4V8.5H12V10H3c-1.11 0-2 .89-2 2v3h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-3c0-1.11-.89-2-2-2h-2zM6 13.5A1.5 1.5 0 0 1 7.5 15A1.5 1.5 0 0 1 6 16.5A1.5 1.5 0 0 1 4.5 15A1.5 1.5 0 0 1 6 13.5m12 0a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5" />
    </svg>
  ),
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
  Mail: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m3 7 9 6 9-6"
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
  Tab: ({ on }) => <AutheonMark animated={on} />,
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
  /** Double-check — Material "done_all" (filled paths render cleanly at small sizes) */
  CheckAll: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
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
    <nav className="tabbar-container" aria-label={t("primaryNavigation")}>
      <div className="tabbar-capsule">
        {items.map((it) => {
          const isActive = tab === it.id;
          return (
            <button
              key={it.id}
              className={`tabbar-item ${isActive ? "active" : ""}`}
              onClick={() => setTab(it.id)}
              aria-label={it.badge > 0 ? `${it.label} (${it.badge})` : it.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="tabbar-icon-wrap">
                <it.I on={isActive} />
                {it.badge > 0 ? (
                  <span className="tabbar-badge" aria-hidden="true">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                ) : null}
              </span>
              <span className="tabbar-label">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Rough drive-time estimate for display (~75 km/h average, 5-min steps).
// The prototype has no routing service; production replaces this with the
// real route duration.
const estimateDriveTime = (km) => {
  if (!km) return null;
  const mins = Math.max(5, Math.round(((km / 75) * 60) / 5) * 5);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

// Compact leg line for job cards: "23.04. · 08:00–12:00" (or "Flexible")
const legWhen = (loc, t) => {
  if (!loc) return "—";
  const date = loc.date || "";
  const win = loc.windowFlex
    ? t("flexible")
    : [loc.windowFrom, loc.windowTo].filter(Boolean).join("–");
  return [date, win].filter(Boolean).join(" · ") || "—";
};

// Small supporting icons for the important-vehicle-info tags (board §5)
const FlagIc = {
  Bolt: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.2 12.4 2.6 2.6 5-5.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Slash: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Plate: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="8" width="19" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.5 11v2.6M10 11v2.6M13.5 11v2.6M17 11v2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

// Important vehicle info (registered / deregistered / e-vehicle / red plates).
// Optional announcement metadata — renders nothing when unset.
const vehicleInfoFlags = (job, t) => {
  const flags = [];
  if (job.registrationStatus === "registered")
    flags.push({ key: "registered", Icon: FlagIc.CheckCircle, label: t("vehicleInfoRegistered") });
  if (job.registrationStatus === "deregistered")
    flags.push({ key: "deregistered", Icon: FlagIc.Slash, label: t("vehicleInfoDeregistered") });
  if (job.electricVehicle)
    flags.push({ key: "electric", Icon: FlagIc.Bolt, label: t("vehicleInfoElectric") });
  if (job.redPlates)
    flags.push({ key: "redPlates", Icon: FlagIc.Plate, label: t("vehicleInfoRedPlates") });
  return flags;
};

const VehicleFlagTags = ({ job }) => {
  const { t } = useI18n();
  const flags = vehicleInfoFlags(job, t);
  if (!flags.length) return null;
  return (
    <>
      {flags.map(({ key, Icon, label }) => (
        <span key={key} className={`vehicle-flag ${key}`}>
          <Icon /> {label}
        </span>
      ))}
    </>
  );
};

// Shared card body (marketplace + My Jobs) — client reference layout
// (Design Direction Board p.5): route line, pickup/delivery legs,
// footer meta + price right.
const JobCardBody = ({ job }) => {
  const { t } = useI18n();
  return (
    <>
      <div className="jobcard-route-line">
        <div className="route-city start">
          <div className="route-city-name">{job.startCity}</div>
          <div className="route-city-plz">{job.startPlz}</div>
        </div>
        <div className="route-mid" aria-hidden="true">
          <span className="route-arrow">→</span>
          {job.distanceKm ? (
            <span className="route-distance">{job.distanceKm} km</span>
          ) : null}
        </div>
        <div className="route-city end">
          <div className="route-city-name">{job.endCity}</div>
          <div className="route-city-plz">{job.endPlz}</div>
        </div>
      </div>
      <div className="jobcard-legs">
        <div className="jobcard-leg">
          <span className="leg-label">
            <Ic.Map /> {t("pickup")}
          </span>
          <div className="leg-when">{legWhen(job.pickup, t)}</div>
        </div>
        <div className="jobcard-leg">
          <span className="leg-label">
            <Ic.Map /> {t("delivery")}
          </span>
          <div className="leg-when">{legWhen(job.delivery, t)}</div>
        </div>
      </div>
      <hr className="jobcard-divider" />
      <div className="jobcard-footer">
        <span className="vehicle-meta">
          {vehicleTypeIcon(job.vehicle)}
          {job.vehicleModel && job.vehicleModel !== "—"
            ? job.vehicleModel
            : displayVehicle(job.vehicle, t)}
        </span>
        <div className="jobcard-price tnum">
          {F().formatMoney
            ? F().formatMoney(fmtDriverOffer(job))
            : `€ ${fmtDriverOffer(job).toFixed(2)}`}
        </div>
      </div>
      <div className="jobcard-tags">
        <VehicleFlagTags job={job} />
        <span className="axle-chip">{displayAxle(job.axle, t)}</span>
      </div>
    </>
  );
};

// =========================================================================
// PORTAL (job list)
// =========================================================================
const JobCard = ({ job, onOpen }) => {
  return (
    <button type="button" className="jobcard-btn" onClick={() => onOpen(job)}>
      {/* Client decision 2026-07-14: marketplace cards hide tour number and
          status (all marketplace cards are Published); both stay on My Jobs */}
      <JobCardBody job={job} />
    </button>
  );
};

const Portal = ({
  filters,
  setFilters,
  openFilter,
  onOpenJob,
  onOpenNotifications,
  notificationsOpen = false,
}) => {
  const { t, locale } = useI18n();
  const store = useAuthStore();
  const [sortBy, setSortBy] = useState("date_desc");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const pullRef = useRef({ startY: 0, pulling: false });

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(id);
  }, []);

  const portalSortOptions = [
    ["date_desc", t("sortDateDesc")],
    ["date_asc", t("sortDateAsc")],
    ["price_desc", t("sortPriceDesc")],
    ["price_asc", t("sortPriceAsc")],
    ["dist_desc", t("sortDistDesc")],
    ["dist_asc", t("sortDistAsc")],
  ];

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

  if (!store.isCurrentDriverMarketplaceActive()) {
    const d = store.getCurrentDriver();
    return (
      <div
        className="scroll profile-header-block"
      >
        <h1 className="profile-header-title">
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
  const unreadNotif = store.getDriverNotificationUnreadCount();
  const all = store.getJobs().filter((j) => j.status === "published");
  const filtered = all.filter((j) => jobMatchesDriverFilters(j, filters));

  const ordered = filtered.slice().sort((a, b) => {
    if (sortBy === "date_asc") {
      const ad = parseDdMm(a.date)?.getTime() || 0;
      const bd = parseDdMm(b.date)?.getTime() || 0;
      return ad - bd;
    } else if (sortBy === "date_desc") {
      const ad = parseDdMm(a.date)?.getTime() || 0;
      const bd = parseDdMm(b.date)?.getTime() || 0;
      return bd - ad;
    } else if (sortBy === "price_asc") {
      return Number(a.driverOffer || 0) - Number(b.driverOffer || 0);
    } else if (sortBy === "price_desc") {
      return Number(b.driverOffer || 0) - Number(a.driverOffer || 0);
    } else if (sortBy === "dist_asc") {
      return Number(a.distanceKm || 0) - Number(b.distanceKm || 0);
    } else if (sortBy === "dist_desc") {
      return Number(b.distanceKm || 0) - Number(a.distanceKm || 0);
    }
    return 0;
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
  if (filters.from)
    activeChips.push({
      key: "from",
      label:
        filters.from === "Today"
          ? t("today")
          : filters.from === "This week"
            ? t("thisWeek")
            : filters.from === "Weekend"
              ? t("weekend")
              : t("fromDateChip", { date: isoToDisplayDate(filters.from) }),
    });
  if (filters.to)
    activeChips.push({
      key: "to",
      label: t("untilDateChip", { date: isoToDisplayDate(filters.to) }),
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
      <div className="pwa-header">
        {/* Top welcome row */}
        <div className="header-top-row">
          <div className="driver-welcome">
            <div className="driver-avatar">
              {(store.getCurrentDriver()?.name || "Jakob Arsin")
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="welcome-text">
              <div className="welcome-sub">{t("welcomeBack")}</div>
              <div className="welcome-name">
                {store.getCurrentDriver()?.name || "Jakob Arsin"}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="header-bell-btn"
            title={t("driverNotifications")}
            aria-label={
              unreadNotif > 0
                ? `${t("driverNotifications")} (${unreadNotif})`
                : t("driverNotifications")
            }
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            onClick={() => onOpenNotifications?.()}
          >
            <Ic.Bell />
            <Badge
              count={unreadNotif}
              variant="destructive"
              className="bell-badge"
              ariaHidden
            />
          </button>
        </div>

        {/* Title and control buttons row */}
        <div className="header-title-row">
          <div>
            <h1 className="header-title">{t("marketplace")}</h1>
            <div className="header-subtitle">{t("exploreJobs")}</div>
          </div>
          <div className="header-controls">
            <SortSelect
              value={sortBy}
              onChange={setSortBy}
              options={portalSortOptions}
              label={t("sortJobs")}
            />
            <button
              type="button"
              className={`header-btn ${activeChips.length ? "active" : ""}`}
              onClick={openFilter}
              title={t("filters")}
              aria-label={
                activeChips.length
                  ? `${t("filters")} (${activeChips.length})`
                  : t("filters")
              }
            >
              <Ic.Filter />
              {activeChips.length > 0 ? (
                <span className="tabbar-badge" aria-hidden="true">
                  {activeChips.length}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Active chips row */}
        {activeChips.length > 0 ? (
          <div className="header-chips-row">
            {activeChips.map((c) => (
              <button
                key={c.key}
                type="button"
                className="chip"
                aria-label={t("removeFilterChip", { label: c.label })}
                onClick={() => setFilters({ ...filters, [c.key]: "" })}
              >
                {c.label}{" "}
                <span className="x" aria-hidden="true">
                  <Ic.X />
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div
        ref={scrollRef}
        className="scroll scroll-body"
        onTouchStart={onScrollTouchStart}
        onTouchMove={onScrollTouchMove}
        onTouchEnd={onScrollTouchEnd}
      >
        {refreshing ? (
          <div className="label portal-refresh-hint">
            <Ic.Refresh /> {t("refreshDemo")}
          </div>
        ) : null}
        {loading ? (
          <div aria-busy="true" aria-label={t("loadingJobs")}>
            <SkeletonList count={3} />
          </div>
        ) : (
          <>
            <div className="portal-results-row">
              <span className="text-caption" aria-live="polite">
                {ordered.length} {t("results")}
              </span>
            </div>
            {ordered.map((j) => (
              <JobCard key={j.id} job={j} onOpen={onOpenJob} />
            ))}
            {ordered.length === 0 && (
              <EmptyState
                title={t("noJobsMatch")}
                description={t("noToursMatch")}
                actionLabel={t("filters")}
                onAction={openFilter}
              />
            )}
            {ordered.length > 0 ? (
              <div className="list-end">— {t("endOfList")} —</div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
};

// =========================================================================
// FILTER SHEET
// =========================================================================
// Shared marketplace filter predicate (plan §6.1) — single source of truth
// for Portal's list AND the FilterSheet's live result count.
const FILTER_DATE_PRESETS = ["Today", "This week", "Weekend"];
const parseJobDdMm = (raw) => {
  const m = String(raw || "").match(/(\d{2})\.(\d{2})/);
  if (!m) return null;
  return new Date(2026, Number(m[2]) - 1, Number(m[1]));
};
const parseFilterDateFlexible = (raw) => {
  const iso = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return parseJobDdMm(raw);
};
const isoToDisplayDate = (raw) => {
  const iso = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[3]}.${iso[2]}.` : String(raw || "");
};
const jobMatchesDriverFilters = (j, filters) => {
  const jobDate = parseJobDdMm(j.date);
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
    !FILTER_DATE_PRESETS.includes(filters.from)
  ) {
    const fromDate = parseFilterDateFlexible(filters.from);
    if (fromDate && jobDate && jobDate < fromDate) return false;
  }
  if (filters.to && String(filters.to).trim()) {
    const toDate = parseFilterDateFlexible(filters.to);
    if (toDate && jobDate && jobDate > toDate) return false;
  }
  if (filters.from === "Today" && j.date !== "05.05.") return false;
  if (filters.from === "Weekend" && !String(j.dateLong || "").match(/Sat|Sun/i))
    return false;
  if (
    filters.vehicle &&
    filters.vehicle !== "All" &&
    j.vehicle !== filters.vehicle
  )
    return false;
  if (
    filters.axle &&
    filters.axle !== "All" &&
    canonAxle(j.axle) !== canonAxle(filters.axle)
  )
    return false;
  return true;
};

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
  // Same predicate as the marketplace list — the CTA count is exact
  const preview = store
    .getJobs()
    .filter(
      (j) => j.status === "published" && jobMatchesDriverFilters(j, local),
    ).length;

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
            <button
              type="button"
              onClick={onClose}
              className="btn icon sm"
              aria-label={t("dismiss")}
            >
              <Ic.X />
            </button>
          </div>
        </div>
        <div className="sheet-body">
          <div className="field-label">{t("postalArea")}</div>
          <div className="grid-2-col-10">
            <input
              className="input"
              placeholder={t("pickupExample")}
              inputMode="numeric"
              maxLength={5}
              aria-label={t("pickupExample")}
              value={local.startPlz || ""}
              onChange={(e) =>
                setLocal({ ...local, startPlz: e.target.value.replace(/\D/g, "") })
              }
            />
            <input
              className="input"
              placeholder={t("deliveryExample")}
              inputMode="numeric"
              maxLength={5}
              aria-label={t("deliveryExample")}
              value={local.endPlz || ""}
              onChange={(e) =>
                setLocal({ ...local, endPlz: e.target.value.replace(/\D/g, "") })
              }
            />
          </div>

          <div className="field-label mt-field">
            {t("dateWindow")}
          </div>
          <div className="grid-2-col-10">
            <input
              className="input"
              type="date"
              aria-label={t("from")}
              value={
                FILTER_DATE_PRESETS.includes(local.from) ? "" : local.from || ""
              }
              onChange={(e) => setLocal({ ...local, from: e.target.value })}
            />
            <input
              className="input"
              type="date"
              aria-label={t("until")}
              value={local.to || ""}
              onChange={(e) => setLocal({ ...local, to: e.target.value })}
            />
          </div>
          <div className="flex-gap-8-wrap" style={{ marginTop: 10 }}>
            {[
              [t("today"), "Today"],
              [t("thisWeek"), "This week"],
              [t("weekend"), "Weekend"],
            ].map(([label, value]) => (
              <button
                key={value}
                type="button"
                className={`chip actionable chip-btn ${
                  local.from === value ? "on" : ""
                }`}
                aria-pressed={local.from === value}
                onClick={() =>
                  setLocal({
                    ...local,
                    from: local.from === value ? "" : value,
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="field-label mt-field">
            {t("vehicleType")}
          </div>
          <div className="flex-gap-8-wrap">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                className={`chip actionable chip-btn ${
                  local.vehicle === type ? "on" : ""
                }`}
                aria-pressed={local.vehicle === type}
                onClick={() =>
                  setLocal({
                    ...local,
                    vehicle: local.vehicle === type ? "All" : type,
                  })
                }
              >
                {displayVehicle(type, t)}
              </button>
            ))}
          </div>

          <div className="field-label mt-field">
            {t("axleConfiguration")}
          </div>
          <div className="chip-row-wrap">
            {axles.map((a) => (
              <button
                key={a.val}
                type="button"
                className={`chip actionable chip-btn ${
                  local.axle === a.val ? "on" : ""
                }`}
                aria-pressed={local.axle === a.val}
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
const JobLocked = ({ job, onBack, onBackToMarketplace, onAccept }) => {
  const { t } = useI18n();

  return (
    <>
      {/* Header */}
      <div className="pwa-detail-header">
        <button
          type="button"
          className="detail-back-btn"
          onClick={onBack}
          aria-label={t("back")}
        >
          <Ic.Back />
        </button>
        <h2 className="detail-header-title">{t("marketplacePreview")}</h2>
        <div className="w-40-spacer"></div>
      </div>

      {/* Main Content Area */}
      <div className="scroll pwa-detail-body">
        {/* Route Card */}
        <div className="detail-card">
          <div className="detail-section-title">
            <Ic.Map />
            <span>{t("route")}</span>
          </div>
          <div className="detail-route-row">
            <div className="detail-route-city start">
              <div className="city-top">
                <span className="city-name">{job.startCity}</span>
                <span className="route-point start" aria-hidden="true"></span>
              </div>
              <div className="city-pc">
                {t("postalCodeAbbr")}: {job.startPlz}
              </div>
            </div>
            <div className="detail-route-dash" aria-hidden="true"></div>
            <div className="detail-route-info">
              <div className="dist">{job.distanceKm}km</div>
              <div className="time">
                {estimateDriveTime(job.distanceKm) || "—"}
              </div>
            </div>
            <div className="detail-route-dash" aria-hidden="true"></div>
            <div className="detail-route-city end">
              <div className="city-top">
                <span className="route-point end" aria-hidden="true"></span>
                <span className="city-name">{job.endCity}</span>
              </div>
              <div className="city-pc">
                {t("postalCodeAbbr")}: {job.endPlz}
              </div>
            </div>
          </div>
          <hr className="detail-card-divider" />
          <div className="detail-route-times">
            <div>
              <div className="time-label">{t("pickupTime")}</div>
              <div className="time-val">
                {AuthStore.formatLocationSchedule(job.pickup, t("flexible"))}
              </div>
            </div>
            <div className="text-right">
              <div className="time-label">{t("deliveryTime")}</div>
              <div className="time-val">
                {AuthStore.formatLocationSchedule(job.delivery, t("flexible"))}
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Card */}
        <div className="detail-card">
          <div className="detail-section-title">
            <Ic.Pkg />
            <span>{t("vehicle")}</span>
          </div>
          <div className="detail-kv-list">
            <div className="detail-kv-row">
              <div className="label">{t("type")}</div>
              <div className="value">{displayVehicle(job.vehicle, t)}</div>
            </div>
            <div className="detail-kv-row">
              <div className="label">{t("model")}</div>
              <div className="value">{job.vehicleModel}</div>
            </div>
            <div className="detail-kv-row">
              <div className="label">{t("axle")}</div>
              <div className="value">{displayAxle(job.axle, t)}</div>
            </div>
            {vehicleInfoFlags(job, t).length ? (
              <div className="detail-flag-block">
                <div className="label">{t("vehicleInfoLabel")}</div>
                <div className="jobcard-tags">
                  <VehicleFlagTags job={job} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Unlocked after acceptance Card */}
        <div className="detail-card info-card">
          <div className="detail-section-title">
            <Ic.Eye />
            <span>{t("unlockedAfterAcceptance")}</span>
          </div>
          <ul className="detail-check-list">
            <li>
              <span className="check-icon">✓</span>
              <span>{t("fullAddresses")}</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>{t("contactsPhones")}</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>{t("licenseVin")}</span>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <span>{t("instructionsPdf")}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pwa-detail-bottom">
        <div className="bottom-price-info">
          <div className="label">{t("offer")}</div>
          <div className="price">€ {fmtDriverOffer(job).toFixed(2)}</div>
        </div>
        <button type="button" className="btn primary lg-cta" onClick={onAccept}>
          {t("acceptTour")}
        </button>
      </div>
    </>
  );
};

// =========================================================================
// SLIDE TO CONFIRM — shared control for binding actions (acceptance,
// mark-performed). Deliberate gesture prevents accidental taps.
// =========================================================================
const SlideToConfirm = ({ text, doneText, onConfirm }) => {
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef(null);

  const onStart = (e) => {
    e.preventDefault();
    if (done) return;
    setDragging(true);
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    const startPos = pos;
    const move = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const rect = trackRef.current.getBoundingClientRect();
      const maxX = rect.width - 56;
      const dx = Math.max(0, Math.min(maxX, startPos + (cx - startX)));
      setPos(dx);
      if (dx >= maxX - 4) {
        setPos(maxX);
        setDragging(false);
        setDone(true);
        cleanup();
        setTimeout(onConfirm, 380);
      }
    };
    const up = () => {
      cleanup();
      setDragging(false);
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
    <div
      ref={trackRef}
      className={
        "slide-confirm " +
        (done ? "done" : "") +
        (dragging ? " dragging" : "")
      }
    >
      <div className="track-text">{done ? doneText : text}</div>
      <div className="slide-fill" style={{ width: pos }} />
      <div
        className="track-text track-text-fill"
        style={{ clipPath: `inset(0 calc(100% - ${pos}px) 0 0)` }}
      >
        {done ? doneText : text}
      </div>
      <div
        className="thumb"
        style={{ transform: `translateX(${pos}px)` }}
        onMouseDown={onStart}
        onTouchStart={onStart}
      >
        {done ? <SlideCheckIcon /> : <SlideArrowIcon />}
      </div>
    </div>
  );
};

// =========================================================================
// ACCEPTANCE MODAL — slide to confirm
// =========================================================================
const AcceptanceModal = ({ job, onCancel, onConfirm }) => {
  const { t } = useI18n();

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
            fontWeight: 600,
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
          <div className="mono mono-strong">
            {job.startPlz} → {job.endPlz} · {job.distanceKm} km
          </div>
          <div className="mono text-muted-sm" style={{ marginTop: 6 }}>
            {AuthStore.formatJobScheduleShort(job, t("flexible"))} ·{" "}
            {displayVehicle(job.vehicle, t)} · {displayAxle(job.axle, t)}
          </div>
          <div
            style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}
            className="tnum"
          >
            € {fmtDriverOffer(job).toFixed(2)}
          </div>
        </div>

        <p className="para-intro">
          {t("acceptanceLegal")}
        </p>
        <div className="para-muted-xs">
          <PolicyDisclosure />
        </div>

        <SlideToConfirm
          text={t("slideToConfirm")}
          doneText={t("slideAccepted")}
          onConfirm={onConfirm}
        />
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

const tourDocReviewPillStatus = (st) => {
  const code = AuthStore.normalizeTourDocumentReviewStatus(st);
  if (code === "accepted") return "performed";
  if (code === "rejected" || code === "correction_required") return "cancelled";
  return "assigned";
};

// Full-height in-app document viewer (fits the phone frame). Renders the
// seeded real PDF via the browser's native viewer; Download/Share/Print are
// functional. Production streams the actual file to the same surface.
// UMD build — Babel standalone transpiles import() to require(), so the
// module build is unusable here; the classic script attaches window.pdfjsLib.
const PDFJS_URL = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER_URL =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const loadPdfJs = () =>
  window.pdfjsLib
    ? Promise.resolve(window.pdfjsLib)
    : window.__pdfjsLoading ||
      (window.__pdfjsLoading = new Promise((resolve, reject) => {
        const sc = document.createElement("script");
        sc.src = PDFJS_URL;
        sc.onload = () =>
          window.pdfjsLib
            ? resolve(window.pdfjsLib)
            : reject(new Error("pdfjsLib missing"));
        sc.onerror = () => reject(new Error("pdf.js failed to load"));
        document.head.appendChild(sc);
      }));

const DocumentPreviewSheet = ({ preview, onClose }) => {
  const { t } = useI18n();
  const iframeRef = useRef(null);
  const pagesRef = useRef(null);
  const [shareMsg, setShareMsg] = useState("");
  // pdf.js renders the document to canvases inside the phone frame —
  // works on every browser (iframe PDF viewers don't on mobile Safari).
  const [pdfState, setPdfState] = useState("loading"); // loading|ready|fallback

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
    };
  }, [preview?.blobUrl]);

  useEffect(() => {
    let cancelled = false;
    if (!preview?.pdfUrl) {
      setPdfState("fallback");
      return undefined;
    }
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        const doc = await pdfjs.getDocument(preview.pdfUrl).promise;
        if (cancelled) return;
        const el = pagesRef.current;
        if (!el) return;
        el.innerHTML = "";
        const width = Math.max(el.clientWidth - 24, 200);
        const dpr = window.devicePixelRatio || 1;
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const vp = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = `${Math.round(vp.width / dpr)}px`;
          canvas.style.height = `${Math.round(vp.height / dpr)}px`;
          canvas.className = "docview-page";
          el.appendChild(canvas);
          await page.render({
            canvasContext: canvas.getContext("2d"),
            viewport: vp,
          }).promise;
        }
        if (!cancelled) setPdfState("ready");
      } catch (_) {
        if (!cancelled) setPdfState("fallback");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview?.pdfUrl]);

  if (!preview) return null;

  const src = preview.pdfUrl
    ? `${preview.pdfUrl}#toolbar=0&navpanes=0&view=FitH`
    : preview.blobUrl;
  const downloadName = preview.downloadName || preview.fileName || "document.pdf";

  const download = () => {
    const a = document.createElement("a");
    if (preview.pdfUrl) {
      a.href = preview.pdfUrl;
    } else if (preview.downloadBlob) {
      a.href = URL.createObjectURL(preview.downloadBlob);
    } else {
      return;
    }
    a.download = downloadName;
    a.click();
    if (!preview.pdfUrl) URL.revokeObjectURL(a.href);
  };

  const share = async () => {
    setShareMsg("");
    try {
      const blob = preview.pdfUrl
        ? await fetch(preview.pdfUrl).then((r) => r.blob())
        : preview.downloadBlob;
      const file = new File([blob], downloadName, {
        type: blob.type || "application/pdf",
      });
      if (
        typeof navigator.canShare !== "function" ||
        !navigator.canShare({ files: [file] })
      ) {
        setShareMsg(t("shareNotSupported"));
        return;
      }
      await navigator.share({ files: [file], title: preview.title });
    } catch (err) {
      if (err && err.name !== "AbortError") setShareMsg(t("shareNotSupported"));
    }
  };

  const printDoc = () => {
    try {
      const w = iframeRef.current?.contentWindow;
      if (w) {
        w.focus();
        w.print();
        return;
      }
    } catch (_) {
      /* PDF viewer frames are opaque — fall through */
    }
    if (preview.pdfUrl) window.open(preview.pdfUrl, "_blank");
  };

  return (
    <>
      <button
        type="button"
        className="notifications-dropdown-backdrop"
        onClick={onClose}
        aria-label={t("uiDismiss")}
      />
      <div
        className="docview-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("documentPreviewTitle")}
      >
        <div className="docview-head">
          <div className="flex-1-min-0">
            <div className="docview-title">{t("documentPreviewTitle")}</div>
            <div className="docview-filename" title={preview.fileName}>
              {preview.title || preview.fileName}
            </div>
          </div>
          <button
            type="button"
            className="btn icon sm touch-target"
            onClick={onClose}
            aria-label={t("uiDismiss")}
          >
            <Ic.X />
          </button>
        </div>
        <div className="docview-body">
          {preview.pdfUrl && pdfState !== "fallback" ? (
            <div className="docview-pages scroll">
              {pdfState === "loading" ? (
                <div className="docview-loading" aria-busy="true">
                  <SkeletonList count={2} />
                </div>
              ) : null}
              {/* canvases are appended manually — keep out of React's children */}
              <div ref={pagesRef} />
            </div>
          ) : preview.previewable !== false && src ? (
            <iframe
              ref={iframeRef}
              className="docview-frame"
              title={preview.title || t("documentPreviewTitle")}
              src={src}
            />
          ) : (
            <div style={{ padding: 20 }}>{t("previewUnavailable")}</div>
          )}
        </div>
        {shareMsg ? (
          <div style={{ padding: "8px 14px" }}>
            <InlineAlert
              tone="info"
              message={shareMsg}
              onDismiss={() => setShareMsg("")}
            />
          </div>
        ) : null}
        <div className="docview-actions">
          <button type="button" className="btn sm" onClick={download}>
            <Ic.Down /> {t("download")}
          </button>
          {typeof navigator !== "undefined" &&
          typeof navigator.share === "function" ? (
            <button type="button" className="btn sm" onClick={share}>
              {t("share")}
            </button>
          ) : null}
          <button type="button" className="btn sm" onClick={printDoc}>
            {t("print")}
          </button>
        </div>
      </div>
    </>
  );
};

// Document-type chooser — used by the tour-documents card and the
// mark-performed success screen. Grouped per client feedback: core /
// operational / other.
const TourDocCategoryModal = ({ open, onClose, onPick }) => {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet modal"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 20 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-doc-category-title"
      >
        <Lbl id="tour-doc-category-title">{t("tourDocChooseCategory")}</Lbl>
        <div className="category-picker">
          {/* Group 1: Core Documents */}
          <div>
            <div className="category-group-label">
              {t("tourDocGroupCore")}
            </div>
            <div className="category-group">
              <button
                type="button"
                className="category-group-item touch-target"
                onClick={() => onPick("invoice")}
              >
                {displayTourDocType("invoice", t)}
              </button>
              <button
                type="button"
                className="category-group-item touch-target"
                onClick={() => onPick("fuel_receipt")}
              >
                {displayTourDocType("fuel_receipt", t)}
              </button>
            </div>
            <p className="category-picker-desc">{t("tourDocHelperFuel")}</p>
          </div>

          {/* Group 2: Operational Documents */}
          <div>
            <div className="category-group-label">
              {t("tourDocGroupOperational")}
            </div>
            <div className="category-group">
              <button
                type="button"
                className="category-group-item touch-target"
                onClick={() => onPick("toll_receipt")}
              >
                {displayTourDocType("toll_receipt", t)}
              </button>
              <button
                type="button"
                className="category-group-item touch-target"
                onClick={() => onPick("delivery_note")}
              >
                {displayTourDocType("delivery_note", t)}
              </button>
              <button
                type="button"
                className="category-group-item touch-target"
                onClick={() => onPick("waiting_time_evidence")}
              >
                {displayTourDocType("waiting_time_evidence", t)}
              </button>
            </div>
            <p className="category-picker-desc">
              {t("tourDocHelperWaiting")}
            </p>
          </div>

          {/* Group 3: Other Documents */}
          <div>
            <div className="category-group-label">
              {t("tourDocGroupOther")}
            </div>
            <div className="category-group">
              <button
                type="button"
                className="category-group-item touch-target"
                onClick={() => onPick("other_receipt")}
              >
                {displayTourDocType("other_receipt", t)}
              </button>
              <button
                type="button"
                className="category-group-item touch-target"
                onClick={() => onPick("other_proof")}
              >
                {displayTourDocType("other_proof", t)}
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn block touch-target mt-20"
          onClick={onClose}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
};

// File-extension badge (Figma 8:2387) — folded-corner file shape with
// the uppercase extension.
const fileExt = (name) => {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ""));
  return m ? m[1].toUpperCase().slice(0, 4) : "FILE";
};

const FileTypeBadge = ({ fileName }) => (
  <span className="doc-file-badge" aria-hidden="true">
    {fileExt(fileName)}
  </span>
);

// Driver document row (Figma 8:2387): ext badge · name + size ·
// type right-aligned · remove (only while the upload is not yet reviewed).
const MyDocRow = ({ doc, onRemove, t }) => (
  <div className="mydoc-row">
    <FileTypeBadge fileName={doc.fileName} />
    <div className="mydoc-main">
      <div className="mydoc-name" title={doc.fileName}>
        {doc.fileName}
      </div>
      <div className="mydoc-size">{F().formatFileSize(doc.sizeBytes)}</div>
    </div>
    <div className="mydoc-side">
      <div className="mydoc-type">
        {displayTourDocType(doc.documentType, t)}
      </div>
      {doc.reviewStatus !== "uploaded" ? (
        <Pill
          status={tourDocReviewPillStatus(doc.reviewStatus)}
          className="no-dot"
        >
          {displayDocReviewStatus(doc.reviewStatus, t)}
        </Pill>
      ) : null}
    </div>
    {onRemove ? (
      <button
        type="button"
        className="mydoc-remove touch-target"
        onClick={onRemove}
        aria-label={t("removeDocTitle")}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    ) : null}
  </div>
);

// Remove-document confirmation (Figma 8:2545).
const RemoveDocModal = ({ open, onCancel, onConfirm }) => {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="sheet-backdrop center" onClick={onCancel}>
      <div
        className="sheet modal remove-doc-modal"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-doc-title"
      >
        <button
          type="button"
          className="remove-doc-close touch-target"
          onClick={onCancel}
          aria-label={t("cancel")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <div className="remove-doc-icon" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </div>
        <h3 id="remove-doc-title" className="remove-doc-title">
          {t("removeDocTitle")}
        </h3>
        <p className="remove-doc-body">{t("removeDocBody")}</p>
        <div className="remove-doc-actions">
          <button type="button" className="btn" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button type="button" className="btn danger" onClick={onConfirm}>
            {t("removeDocConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

const TourDocumentRow = ({
  fileName,
  metaLine,
  statusNode,
  rejectionReason,
  onView,
  onDownload,
  onReplace,
  viewLabel,
  downloadLabel,
  replaceLabel,
}) => (
  <div className="tour-doc-row">
    <div className="tour-doc-row-icon">
      <Ic.Pdf />
    </div>
    <div className="tour-doc-row-body flex-1-min-0">
      <div className="tour-doc-row-name" title={fileName}>
        {fileName}
      </div>
      <div className="tour-doc-row-meta-row">
        {metaLine ? <span className="tour-doc-row-meta">{metaLine}</span> : null}
        {statusNode ? <div className="tour-doc-row-status">{statusNode}</div> : null}
      </div>
      {rejectionReason ? (
        <p className="tour-doc-row-rejection">{rejectionReason}</p>
      ) : null}
    </div>
    <div className="tour-doc-row-actions">
      {onReplace ? (
        <button
          type="button"
          className="pdf-btn"
          onClick={onReplace}
          title={replaceLabel}
          aria-label={replaceLabel}
        >
          <Ic.Refresh />
        </button>
      ) : null}
      {onView ? (
        <button
          type="button"
          className="pdf-btn"
          onClick={onView}
          title={viewLabel}
          aria-label={viewLabel}
        >
          <Ic.Eye />
        </button>
      ) : null}
      {onDownload ? (
        <button
          type="button"
          className="pdf-btn"
          onClick={onDownload}
          title={downloadLabel}
          aria-label={downloadLabel}
        >
          <Ic.Down />
        </button>
      ) : null}
    </div>
  </div>
);

const JobOfficialTourDocuments = ({ job, onPreview }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const docs = store.getOfficialTourDocumentsForJob(job.id);
  if (!docs.length) return null;

  return (
    <div className="detail-card">
      <div className="detail-section-title">
        <Ic.Pdf />
        <span>{t("officialTourDocumentsSection")}</span>
      </div>
      <p className="tour-doc-section-hint">{t("officialTourDocHint")}</p>
      <div className="tour-doc-list">
        {docs.map((doc) => (
          <TourDocumentRow
            key={doc.id}
            fileName={doc.fileName}
            metaLine={`${t("officialTourDocFromDispatch")} · ${displayTourDocType(doc.documentType, t)} · ${F().formatFileSize(doc.sizeBytes)}`}
            onView={() => {
              const r = store.getTourDocumentPreview(doc.id);
              if (r.ok) onPreview?.(r.preview);
            }}
            onDownload={() => store.downloadTourDocumentPlaceholder(doc.id)}
            viewLabel={t("view")}
            downloadLabel={t("download")}
          />
        ))}
      </div>
    </div>
  );
};

const JobTourDocuments = ({ job, onPreview }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const inputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const jobId = job.id;
  const uploadGate = store.canDriverUploadTourDocument(jobId);
  const canUpload = uploadGate.ok;
  const uploads = store.getDriverTourDocumentsForJob(jobId);
  const [categoryModal, setCategoryModal] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [replaceDocId, setReplaceDocId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const showUploadError = (reason) => {
    setFeedback({
      tone: "error",
      message: tourDocUploadErrorMessage(reason, t),
    });
  };

  const startUpload = (documentType) => {
    const gate = store.canDriverUploadTourDocument(jobId);
    if (!gate.ok) {
      showUploadError(gate.reason);
      return;
    }
    setFeedback(null);
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
      if (!r.ok) showUploadError(r.reason);
      else setFeedback({ tone: "success", message: t("tourDocUploadSuccess") });
      return;
    }
    if (!pendingType) return;
    const r = store.addTourDocument(f, { jobId, documentType: pendingType });
    setPendingType(null);
    if (!r.ok) showUploadError(r.reason);
    else setFeedback({ tone: "success", message: t("tourDocUploadSuccess") });
  };

  const startReplace = (docId) => {
    if (!canUpload) {
      showUploadError(uploadGate.reason || "job_not_uploadable");
      return;
    }
    setFeedback(null);
    setReplaceDocId(docId);
    setCategoryModal(false);
    replaceInputRef.current?.click();
  };

  const canReplaceDoc = (u) =>
    canUpload && store.canDriverReplaceTourDocument(u);

  if (!canUpload && uploads.length === 0) return null;

  return (
    <div className="detail-card" aria-labelledby={`tour-docs-${jobId}`}>
      <div className="detail-section-head">
        <div className="detail-section-title" id={`tour-docs-${jobId}`}>
          <Ic.Pdf />
          <span>{t("tourDocumentsSection")}</span>
        </div>
        {canUpload ? (
          <Pill status="accepted" className="no-dot">
            {t("tourDocUploadAvailable")}
          </Pill>
        ) : null}
      </div>
      <p className="tour-doc-section-hint">
        {canUpload ? t("tourDocUploadHint") : t("tourDocRequiresPerformed")}
      </p>
      <InlineAlert
        tone={feedback?.tone}
        message={feedback?.message}
        onDismiss={() => setFeedback(null)}
      />
      {canUpload ? (
        <button
          type="button"
          className="btn touch-target tour-doc-upload-btn"
          onClick={() => setCategoryModal(true)}
        >
          <Ic.Plus /> {t("tourDocUploadReceiptButton")}
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        capture="environment"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
        className="hidden"
        onChange={onPick}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
        className="hidden"
        onChange={onPick}
      />
      {uploads.length > 0 ? (
        <div className="tour-doc-list">
          {uploads.map((u) => (
            <TourDocumentRow
              key={u.id}
              fileName={u.fileName}
              metaLine={`${displayTourDocType(u.documentType, t)} · ${F().formatFileSize(u.sizeBytes)}`}
              statusNode={
                <Pill status={tourDocReviewPillStatus(u.reviewStatus)} className="no-dot">
                  {displayDocReviewStatus(u.reviewStatus, t)}
                </Pill>
              }
              rejectionReason={
                (u.reviewStatus === "rejected" ||
                  u.reviewStatus === "correction_required") &&
                u.rejectionReason
                  ? t("tourDocRejectionReason", { reason: u.rejectionReason })
                  : null
              }
              onReplace={
                canReplaceDoc(u) ? () => startReplace(u.id) : null
              }
              onView={() => {
                const r = store.getTourDocumentPreview(u.id);
                if (r.ok) onPreview?.(r.preview);
              }}
              onDownload={() => store.downloadTourDocumentPlaceholder(u.id)}
              replaceLabel={t("tourDocReplaceButton")}
              viewLabel={t("view")}
              downloadLabel={t("download")}
            />
          ))}
        </div>
      ) : canUpload ? (
        <div className="tour-doc-empty">
          <p className="tour-doc-empty-title">{t("tourDocEmptyTitle")}</p>
          <p className="tour-doc-empty-desc">{t("tourDocEmptyAction")}</p>
        </div>
      ) : (
        <div className="tour-doc-empty">
          <p className="tour-doc-empty-title">{t("tourDocUploadEmpty")}</p>
        </div>
      )}
      <TourDocCategoryModal
        open={categoryModal}
        onClose={() => setCategoryModal(false)}
        onPick={startUpload}
      />
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
  onBackToMarketplace,
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
  const inExecution = canPerform || isSpecialCase || job.status === "assigned";
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
  const [docPreview, setDocPreview] = useState(null);
  // Performed tours split into two tabs (Figma 8:2268 / 8:2387): job
  // details and the driver's own tour documents.
  const [detailTab, setDetailTab] = useState("details");
  const docs = store.getDriverTourDocumentsForJob(job.id);
  const docCount = docs.length;
  const showDocsTab = isPerformed && detailTab === "documents";
  // My-documents tab: upload + remove state
  const [docsCategoryOpen, setDocsCategoryOpen] = useState(false);
  const [docsPendingType, setDocsPendingType] = useState(null);
  const [docsFeedback, setDocsFeedback] = useState(null);
  const [removeDocId, setRemoveDocId] = useState(null);
  const docsInputRef = useRef(null);

  const docsPickType = (documentType) => {
    setDocsCategoryOpen(false);
    setDocsPendingType(documentType);
    docsInputRef.current?.click();
  };
  const docsOnFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !docsPendingType) return;
    const r = store.addTourDocument(f, {
      jobId: job.id,
      documentType: docsPendingType,
    });
    setDocsPendingType(null);
    setDocsFeedback(
      r.ok
        ? { tone: "success", message: t("tourDocUploadSuccess") }
        : { tone: "error", message: tourDocUploadErrorMessage(r.reason, t) },
    );
  };
  const docsConfirmRemove = () => {
    const r = store.removeDriverTourDocument(removeDocId);
    setRemoveDocId(null);
    if (!r.ok)
      setDocsFeedback({ tone: "error", message: t("removeDocBlocked") });
  };

  return (
    <>
      {docPreview ? (
        <DocumentPreviewSheet
          preview={docPreview}
          onClose={() => setDocPreview(null)}
        />
      ) : null}
      {/* Header */}
      <div className="pwa-detail-header">
        <button
          type="button"
          className="detail-back-btn"
          onClick={onBack}
          aria-label={t("back")}
        >
          <Ic.Back />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h2 className="detail-header-title">Tour #{job.tour}</h2>
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 4 }}
          >
            {isPerformed ? (
              <Pill status="performed">
                {AuthStore.statusLabel("performed")}
              </Pill>
            ) : isCancelled ? (
              <Pill status="cancelled">{t("cancelled")}</Pill>
            ) : isSpecialCase ? (
              <Pill status="special_case">
                {AuthStore.statusLabel("special_case")}
              </Pill>
            ) : job.status === "assigned" ? (
              <Pill status="assigned">{t("assignedShort")}</Pill>
            ) : (
              <Pill status="accepted">{t("acceptedActive")}</Pill>
            )}
          </div>
        </div>
        <div className="w-40-spacer"></div>
      </div>

      {/* Performed tours: details / my documents tab pills (Figma 8:2387) */}
      {isPerformed ? (
        <div className="detail-tabs-row">
          <button
            type="button"
            className={`detail-tab-pill ${detailTab === "details" ? "active" : ""}`}
            onClick={() => setDetailTab("details")}
          >
            <span>{t("jobDetailsTab")}</span>
          </button>
          <button
            type="button"
            className={`detail-tab-pill ${detailTab === "documents" ? "active" : ""}`}
            onClick={() => setDetailTab("documents")}
          >
            <span>{t("myDocumentsTab")}</span>
            <span className="detail-tab-count">{docCount}</span>
          </button>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="scroll pwa-detail-body">
        {showDocsTab ? (
          <div className="mydocs-list">
            <InlineAlert
              tone={docsFeedback?.tone}
              message={docsFeedback?.message}
              onDismiss={() => setDocsFeedback(null)}
            />
            {docs.length === 0 ? (
              <EmptyState
                title={t("tourDocEmptyTitle")}
                description={t("tourDocUploadEmpty")}
              />
            ) : (
              docs.map((u) => (
                <MyDocRow
                  key={u.id}
                  doc={u}
                  t={t}
                  onRemove={
                    u.reviewStatus === "uploaded"
                      ? () => setRemoveDocId(u.id)
                      : null
                  }
                />
              ))
            )}
          </div>
        ) : (
        <>
        {inExecution && !isCancelled && !isPerformed ? (
          <div
            className="banner banner-success"
            role="status"
            style={{ margin: 0 }}
          >
            {t("tourInExecutionBanner")}
          </div>
        ) : null}

        {isCancelled && (
          <div className="cancellation-card" role="status">
            <p className="cancellation-card-title">{t("cancelled")}</p>
            <div>{t("driverTourCancelledNotice")}</div>
            {job.cancellationReason ? (
              <div className="cancellation-card-reason">
                {t("driverCancellationReasonLabel")}:{" "}
                {t(`cancellationReason_${job.cancellationReason}`) ||
                  AuthStore.getCancellationReasonLabel?.(
                    job.cancellationReason,
                  ) ||
                  job.cancellationReason}
              </div>
            ) : null}
            {job.cancellationReasonText ? (
              <div className="cancellation-card-message">
                {job.cancellationReasonText}
              </div>
            ) : null}
          </div>
        )}

        {/* Customer Card */}
        <div className="detail-card customer-card">
          <div className="customer-row">
            <span className="customer-title">{t("customerLabel")}</span>
            <span className="customer-name">
              {job.customerName || job.customer || "—"}
            </span>
          </div>
        </div>

        {/* Route Card with Vertical Timeline */}
        <div className="detail-card">
          <div className="detail-section-title">
            <Ic.Map />
            <span>{t("route")}</span>
          </div>
          <div className="unlocked-route-timeline">
            <div className="timeline-item">
              <div className="timeline-marker">
                <span className="dot blue"></span>
                <span className="line"></span>
              </div>
              <div className="timeline-content">
                <div className="city-info">
                  <div className="city-name">{job.startCity}</div>
                  <div className="city-address">
                    {job.startStreet} · {job.startPlz} {job.startCity}
                  </div>
                </div>
                <a
                  href={pickupMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-link"
                >
                  <Ic.Map /> {t("viewOnMap")}
                </a>
              </div>
            </div>
            <div className="timeline-item-middle">
              <span className="info-badge">🚙 {job.distanceKm} km</span>
              <span className="info-badge">
                ⏱ {estimateDriveTime(job.distanceKm) || "—"}
              </span>
            </div>
            <div className="timeline-item">
              <div className="timeline-marker">
                <span className="dot dark"></span>
              </div>
              <div className="timeline-content">
                <div className="city-info">
                  <div className="city-name">{job.endCity}</div>
                  <div className="city-address">
                    {job.endStreet} · {job.endPlz} {job.endCity}
                  </div>
                </div>
                <a
                  href={deliveryMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-link"
                >
                  <Ic.Map /> {t("viewOnMap")}
                </a>
              </div>
            </div>
          </div>
          <hr className="detail-card-divider" />
          <div className="detail-route-times">
            <div>
              <div className="time-label">{t("pickupTime")}</div>
              <div className="time-val">
                {AuthStore.formatLocationSchedule(job.pickup, t("flexible"))}
              </div>
            </div>
            <div>
              <div className="time-label">{t("deliveryTime")}</div>
              <div className="time-val">
                {AuthStore.formatLocationSchedule(job.delivery, t("flexible"))}
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Card */}
        <div className="detail-card">
          <div className="detail-section-title">
            <Ic.Pkg />
            <span>{t("vehicle")}</span>
          </div>
          <div className="detail-kv-list">
            <div className="detail-kv-row">
              <div className="label">{t("type")}</div>
              <div className="value">{displayVehicle(job.vehicle, t)}</div>
            </div>
            <div className="detail-kv-row">
              <div className="label">{t("model")}</div>
              <div className="value">{job.vehicleModel}</div>
            </div>
            {job.plate ? (
              <div className="detail-kv-row">
                <div className="label">{t("licensePlate")}</div>
                <div className="plate-badge">{job.plate}</div>
              </div>
            ) : null}
            {job.redPlateNumber ? (
              <div className="detail-kv-row">
                <div className="label">{t("redPlateNumber")}</div>
                <div className="plate-badge plate-red">{job.redPlateNumber}</div>
              </div>
            ) : null}
            <div className="detail-kv-row">
              <div className="label">{t("vin")}</div>
              <div className="value mono text-muted-sm">
                {job.vin}
              </div>
            </div>
            <div className="detail-kv-row">
              <div className="label">{t("axle")}</div>
              <div className="value">{displayAxle(job.axle, t)}</div>
            </div>
            {vehicleInfoFlags(job, t).length ? (
              <div className="detail-flag-block">
                <div className="label">{t("vehicleInfoLabel")}</div>
                <div className="jobcard-tags">
                  <VehicleFlagTags job={job} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Contact Card */}
        <div className="detail-card">
          <div className="detail-section-title">
            <Ic.TabUser />
            <span>{t("contact")}</span>
          </div>
          <div className="detail-contacts-grid">
            <div className="contact-column">
              <div className="contact-role">{t("pickupContact")}</div>
              <div className="contact-name">{pickup.name || "—"}</div>
              <div className="contact-actions">
                {pickup.phone ? (
                  <a
                    href={"tel:" + (pickup.phone || "").replace(/\s/g, "")}
                    className="contact-action-btn"
                    title="Call"
                  >
                    <Ic.Phone />
                  </a>
                ) : null}
                {pickup.email ? (
                  <a
                    href={"mailto:" + pickup.email}
                    className="contact-action-btn"
                    title="Email"
                  >
                    <Ic.Mail />
                  </a>
                ) : null}
              </div>
            </div>
            <div className="contact-column">
              <div className="contact-role">{t("deliveryContact")}</div>
              <div className="contact-name">{drop.name || "—"}</div>
              <div className="contact-actions">
                {drop.phone ? (
                  <a
                    href={"tel:" + (drop.phone || "").replace(/\s/g, "")}
                    className="contact-action-btn"
                    title="Call"
                  >
                    <Ic.Phone />
                  </a>
                ) : null}
                {drop.email ? (
                  <a
                    href={"mailto:" + drop.email}
                    className="contact-action-btn"
                    title="Email"
                  >
                    <Ic.Mail />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Operational Instructions Card */}
        <div className="detail-card">
          <div className="detail-section-title">
            <Ic.TabInfo />
            <span>{t("operationalInstructions")}</span>
          </div>
          <div className="detail-pdf-card">
            <div className="pdf-icon-wrap">
              <Ic.Pdf />
            </div>
            <div className="flex-1-min-0">
              <div className="pdf-name">transport-order-{job.id}.pdf</div>
              <div className="pdf-meta">v{job.pdfVersion || 1}</div>
            </div>
            <div className="pdf-actions">
              <button
                type="button"
                className="pdf-btn"
                title={t("view")}
                aria-label={t("view")}
                onClick={() => {
                  const r = store.getTransportOrderPreview(job.id);
                  if (r.ok) setDocPreview(r.preview);
                }}
              >
                <Ic.Eye />
              </button>
              <button
                type="button"
                className="pdf-btn"
                title={t("download")}
                aria-label={t("download")}
                onClick={() => store.downloadPdf(job.id)}
              >
                <Ic.Down />
              </button>
            </div>
          </div>
          <p className="text-muted-sm" style={{ lineHeight: 1.6, margin: 0, fontSize: 13 }}>
            {displayDriverNote(job.notesDriver, t) || t("noDriverAddons")}
          </p>
          {job.notes ? (
            <>
              <hr className="detail-card-divider" />
              <div className="time-label">{t("dispatchNotes")}</div>
              <p className="text-muted-sm" style={{ lineHeight: 1.6, margin: 0, fontSize: 13 }}>
                {job.notes}
              </p>
            </>
          ) : null}
        </div>

        {/* Official Documents Component */}
        <JobOfficialTourDocuments job={job} onPreview={setDocPreview} />

        {/* Tour Documents Component — performed tours show these in the
            dedicated My documents tab instead */}
        {!isPerformed && (
          <JobTourDocuments job={job} onPreview={setDocPreview} />
        )}

        {/* Financial Offer summary */}
        <div className="detail-card price-summary-card">
          <div className="price-summary-row">
            <div>
              <div className="price-label">{t("driverOffer")}</div>
              <div className="price-meta">
                {job.distanceKm} km · {displayAxle(job.axle, t)}
              </div>
            </div>
            <div className="price-val">€ {fmtDriverOffer(job).toFixed(2)}</div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Bottom Bar */}
      {!isPerformed && !isCancelled && !isSpecialCase && (
        <div className="pwa-unlocked-bottom">
          <button
            type="button"
            className="btn primary"
            onClick={onMarkPerformed}
            disabled={!canPerform}
            style={{
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {t("markPerformed")}
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={onReport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            <Ic.Alert />
            {t("reportProblem")}
          </button>
        </div>
      )}

      {/* My documents tab: fixed bottom upload bar (Figma 8:2387) */}
      {showDocsTab && (
        <div className="pwa-unlocked-bottom mydocs-upload-bar">
          <button
            type="button"
            className="btn primary"
            onClick={() => setDocsCategoryOpen(true)}
          >
            {t("tourDocUploadButton")} <UploadTrayIcon />
          </button>
          <p className="mydocs-upload-hint">{t("myDocsUploadHint")}</p>
        </div>
      )}
      {showDocsTab && (
        <>
          <input
            ref={docsInputRef}
            type="file"
            capture="environment"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
            className="hidden"
            onChange={docsOnFile}
          />
          <TourDocCategoryModal
            open={docsCategoryOpen}
            onClose={() => setDocsCategoryOpen(false)}
            onPick={docsPickType}
          />
          <RemoveDocModal
            open={!!removeDocId}
            onCancel={() => setRemoveDocId(null)}
            onConfirm={docsConfirmRemove}
          />
        </>
      )}
    </>
  );
};

const parseDottedDateToTimestamp = (dateStr, fallbackStr) => {
  if (!dateStr) return new Date(fallbackStr || 0).getTime();
  const m = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) {
    return new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime();
  }
  const mShort = dateStr.match(/(\d{2})\.(\d{2})\./);
  if (mShort) {
    return new Date(`2026-${mShort[2]}-${mShort[1]}`).getTime();
  }
  return new Date(dateStr).getTime() || new Date(fallbackStr || 0).getTime();
};

// =========================================================================
// MY JOBS
// =========================================================================
const MyJobs = ({ onOpen }) => {
  const { t } = useI18n();
  const [tab, setTab] = useState("active");
  const TAB_IDS = ["active", "performed", "cancelled", "special"];
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const store = useAuthStore();

  const mine = store.getJobs().filter((j) => store.isMineJob(j));
  const active = mine.filter((j) =>
    ["assigned", "accepted"].includes(j.status),
  );
  const performed = mine.filter((j) => j.status === "performed");
  const cancelled = mine.filter((j) => j.status === "cancelled");
  const special = mine.filter((j) => j.status === "special_case");

  const listFor = (tabId) =>
    tabId === "active"
      ? active
      : tabId === "performed"
        ? performed
        : tabId === "cancelled"
          ? cancelled
          : special;

  const buildList = (tabId) =>
    listFor(tabId)
      .filter((job) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          job.tour.toString().includes(q) ||
          (job.customer || "").toLowerCase().includes(q) ||
          (job.customerName || "").toLowerCase().includes(q) ||
          (job.vehicleModel || "").toLowerCase().includes(q) ||
          (job.plate || "").toLowerCase().includes(q) ||
          (job.vin || "").toLowerCase().includes(q) ||
          (job.startCity || "").toLowerCase().includes(q) ||
          (job.endCity || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "date_asc") {
          const timeA = parseDottedDateToTimestamp(
            a.pickup?.date || a.pickupDate,
            a.createdAt,
          );
          const timeB = parseDottedDateToTimestamp(
            b.pickup?.date || b.pickupDate,
            b.createdAt,
          );
          return timeA - timeB;
        } else if (sortBy === "date_desc") {
          const timeA = parseDottedDateToTimestamp(
            a.pickup?.date || a.pickupDate,
            a.createdAt,
          );
          const timeB = parseDottedDateToTimestamp(
            b.pickup?.date || b.pickupDate,
            b.createdAt,
          );
          return timeB - timeA;
        } else if (sortBy === "tour_asc") {
          return Number(a.tour || 0) - Number(b.tour || 0);
        } else if (sortBy === "tour_desc") {
          return Number(b.tour || 0) - Number(a.tour || 0);
        }
        return 0;
      });

  const myJobsSortOptions = [
    ["date_desc", t("sortDateDesc")],
    ["date_asc", t("sortDateAsc")],
    ["tour_asc", t("sortTourAsc")],
    ["tour_desc", t("sortTourDesc")],
  ];

  const emptyCopyFor = (tabId) =>
    searchQuery
      ? {
          title: t("noJobsMatch"),
          description: t("searchMyJobsPlaceholder"),
          actionLabel: t("reset"),
          onAction: () => setSearchQuery(""),
        }
      : tabId === "active"
        ? {
            title: t("nothingHereYet"),
            description: t("exploreJobs"),
          }
        : tabId === "performed"
          ? {
              title: t("nothingHereYet"),
              description: t("performedTab"),
            }
          : tabId === "cancelled"
            ? {
                title: t("nothingHereYet"),
                description: t("cancelledSub"),
              }
            : {
                title: t("nothingHereYet"),
                description: t("specialCaseTab"),
              };

  const renderJobCard = (job) => (
    <button
      key={job.id}
      type="button"
      className="jobcard-btn"
      onClick={() => onOpen(job)}
    >
      {job.status === "assigned" ? (
        <div className="jobcard-banner-assigned">
          <Ic.TabInfo /> {t("assignedDirectlyNotice")}
        </div>
      ) : null}
      <div className="jobcard-header-row">
        <span className="jobcard-tour-num">Tour #{job.tour}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {job.status === "special_case" && (
            <span className="pill special_case">
              {AuthStore.statusLabel("special_case")}
            </span>
          )}
          {job.status === "accepted" && (
            <span className="pill accepted">{t("active")}</span>
          )}
          {job.status === "performed" && (
            <span className="pill performed">
              {AuthStore.statusLabel("performed")}
            </span>
          )}
          {job.status === "cancelled" && (
            <span className="pill cancelled">{t("cancelled")}</span>
          )}
          {job.status === "assigned" && (
            <span className="pill assigned">{t("assignedShort")}</span>
          )}
        </div>
      </div>
      <JobCardBody job={job} />
      {jobNeedsDocCorrection(job, store) ? (
        <div className="stack-8">
          <span
            className="chip"
            style={{
              borderColor: "var(--st-cancelled)",
              color: "var(--st-cancelled)",
              fontSize: 11,
              padding: "1px 6px",
            }}
          >
            {t("correctionRequiredBadge")}
          </span>
        </div>
      ) : null}
    </button>
  );

  const renderJobsPane = (tabId) => {
    const jobs = buildList(tabId);
    const empty = emptyCopyFor(tabId);
    return (
      <div className="scroll-body swipe-pane-body">
        {jobs.length === 0 && (
          <EmptyState
            title={empty.title}
            description={empty.description}
            actionLabel={empty.actionLabel}
            onAction={empty.onAction}
          />
        )}
        {jobs.map(renderJobCard)}
        {jobs.length > 0 ? (
          <div className="list-end">— {t("endOfList")} —</div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="pwa-screen-header">
        <h1 className="header-title">{t("myJobs")}</h1>
        <div className="header-subtitle">{t("myJobsSubtitle")}</div>
      </div>

      {/* Search and control buttons */}
      <div className="myjobs-search-row">
        <div className="myjobs-search-input-wrap">
          <Ic.Search />
          <input
            type="text"
            placeholder={t("searchMyJobsPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <SortSelect
          value={sortBy}
          onChange={setSortBy}
          options={myJobsSortOptions}
          label={t("sortJobs")}
        />
      </div>

      {/* Horizontal tab pills slider */}
      <div className="myjobs-tabs-slider">
        {[
          ["active", t("active"), active.length],
          ["performed", t("performedTab"), performed.length],
          ["cancelled", t("cancelled"), cancelled.length],
          ["special", t("specialCaseTab"), special.length],
        ].map(([id, lbl, n]) => (
          <button
            key={id}
            type="button"
            className={`myjobs-tab-pill ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            <span>{lbl}</span>
            <span className="pill-badge">{n}</span>
          </button>
        ))}
      </div>

      {/* Swipeable list content — drag left/right to switch tabs */}
      <SwipeViews
        index={TAB_IDS.indexOf(tab)}
        count={TAB_IDS.length}
        onIndexChange={(i) => setTab(TAB_IDS[i])}
        style={{ flex: 1, minHeight: 0, background: "var(--canvas)" }}
      >
        {TAB_IDS.map((tabId) => (
          <React.Fragment key={tabId}>{renderJobsPane(tabId)}</React.Fragment>
        ))}
      </SwipeViews>
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
  const [slideDragging, setSlideDragging] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceNotice, setEvidenceNotice] = useState(null);
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
    [
      "vehicle_not_on_site",
      t("problemReasonNotOnSite"),
      t("problemReasonNotOnSiteSub"),
    ],
    [
      "vehicle_not_roadworthy",
      t("problemReasonNotRoadworthy"),
      t("problemReasonNotRoadworthySub"),
    ],
    [
      "contact_unreachable",
      t("problemReasonNoContact"),
      t("problemReasonNoContactSub"),
    ],
    [
      "wrong_address",
      t("problemReasonWrongAddress"),
      t("problemReasonWrongAddressSub"),
    ],
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
    setSlideDragging(true);
    const startX = e.clientX;
    const startPos = slidePos;
    let completed = false;
    const move = (ev) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const maxX = rect.width - 56;
      const dx = Math.max(0, Math.min(maxX, startPos + (ev.clientX - startX)));
      setSlidePos(dx);
      if (dx >= maxX - 4 && !completed) {
        completed = true;
        setSlidePos(maxX);
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
      setSlideDragging(false);
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
          <h2 className="sheet-head-warn">
            <span className="sheet-head-warn-icon">
              <Ic.Alert />
            </span>
            {t("reportProblem")}
          </h2>
          <button type="button" onClick={onClose} className="btn icon sm" aria-label={t("dismiss")}>
            <Ic.X />
          </button>
        </div>
        <div className="sheet-body">
          {!path ? (
            <div className="flex-col-gap-10">
              {pathOptions.map(([id, label, sub]) => (
                <button
                  key={id}
                  type="button"
                  className="radio-card"
                  onClick={() => {
                    setPath(id);
                    setReason(id === "cancel" ? "driver_unavailable" : "other");
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
                </button>
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
              <div className="flex-col-gap-10" style={{ marginBottom: 18 }}>
                {reasonList.map(([id, label, sub]) => (
                  <button
                    key={id}
                    type="button"
                    className={"radio-card " + (reason === id ? "on" : "")}
                    onClick={() => setReason(id)}
                  >
                    <span className="ring"></span>
                    <div>
                      <div className="t">{label}</div>
                      <div className="s">{sub}</div>
                    </div>
                  </button>
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
                  className={"slide-char-count " + (valid ? "ok" : "need-more")}
                >
                  {text.trim().length}/10
                </span>
              </div>
              {path === "not_performable" ? (
                <div className="mt-16">
                  <div className="field-label">
                    {t("reportProblemEvidenceLabel")}
                  </div>
                  <p className="req-panel-desc" style={{ margin: "6px 0 10px" }}>
                    {t("reportProblemEvidenceHint")}
                  </p>
                  <input
                    ref={evidenceInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
                    className="hidden"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files || []);
                      if (!picked.length) return;
                      setEvidenceFiles((prev) => {
                        const merged = [...prev, ...picked].slice(0, 5);
                        setEvidenceNotice(
                          prev.length + picked.length > 5
                            ? t("reportProblemEvidenceTooMany")
                            : null,
                        );
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
                  {evidenceNotice ? (
                    <div className="stack-8">
                      <InlineAlert
                        tone="warn"
                        message={evidenceNotice}
                        onDismiss={() => setEvidenceNotice(null)}
                      />
                    </div>
                  ) : null}
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
                          <span className="pdf-name">
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
                    <p style={{ margin: 0 }}>
                      {t("reportProblemCancelBindingWarning")}
                    </p>
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      <PolicyDisclosure introKey="reportProblemCancelTermsIntro" />
                    </p>
                  </div>
                  <div className="slide-confirm-wrap mt-16">
                    <div
                      ref={trackRef}
                      className={
                        "slide-confirm" +
                        (slideDone ? " done" : "") +
                        (slideDragging ? " dragging" : "") +
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
                        className="slide-fill"
                        style={{ width: valid ? slidePos : 0 }}
                      />
                      <div
                        className="track-text track-text-fill"
                        style={{
                          clipPath: `inset(0 calc(100% - ${valid ? slidePos : 0}px) 0 0)`,
                        }}
                      >
                        {slideDone
                          ? t("reportProblemCancelConfirmed")
                          : valid
                            ? t("slideToCancelOrder")
                            : t("slideToCancelOrderLocked")}
                      </div>
                      <div
                        className="thumb"
                        style={{
                          transform: `translateX(${valid ? slidePos : 0}px)`,
                        }}
                        onPointerDown={slideEnabled ? onSlideStart : undefined}
                        tabIndex={slideEnabled ? 0 : -1}
                      >
                        {slideDone ? (
                          <SlideCheckIcon />
                        ) : valid ? (
                          <SlideArrowIcon />
                        ) : (
                          <SlideLockIcon />
                        )}
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
        <h3 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 600 }}>
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
          className="btn block primary mt-20"
          onClick={onClose}
        >
          {t("ok")}
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// MARK PERFORMED — deliberate two-stage flow (Figma 07/2026):
//   1. slide-to-confirm (same binding gesture as acceptance; a plain tap
//      could be accidental — Cancel backs out without any state change)
//   2. success screen with optional document upload (invoice, receipts…)
//      reusing the tour-document type chooser; documents can also be added
//      later from the tour's documents tab.
// =========================================================================
const UploadTrayIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 15V4m0 0 4 4m-4-4-4 4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

const MarkPerformedSheet = ({ job, onClose }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [stage, setStage] = useState("confirm"); // confirm | success
  const [error, setError] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const [removeId, setRemoveId] = useState(null);
  const inputRef = useRef(null);
  const uploads = store.getDriverTourDocumentsForJob(job.id);

  const confirmRemove = () => {
    const r = store.removeDriverTourDocument(removeId);
    setRemoveId(null);
    if (!r.ok)
      setUploadFeedback({ tone: "error", message: t("removeDocBlocked") });
  };

  const onSlideConfirm = () => {
    const r = store.markPerformed(job.id);
    if (!r.ok) {
      setError(t("completionBlocked"));
      return;
    }
    setStage("success");
  };

  const pickType = (documentType) => {
    setCategoryOpen(false);
    setPendingType(documentType);
    inputRef.current?.click();
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !pendingType) return;
    const r = store.addTourDocument(f, {
      jobId: job.id,
      documentType: pendingType,
    });
    setPendingType(null);
    setUploadFeedback(
      r.ok
        ? { tone: "success", message: t("tourDocUploadSuccess") }
        : { tone: "error", message: tourDocUploadErrorMessage(r.reason, t) },
    );
  };

  if (stage === "confirm") {
    return (
      <div className="sheet-backdrop center" onClick={onClose}>
        <div
          className="sheet modal"
          onClick={(e) => e.stopPropagation()}
          style={{ padding: 24 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mark-performed-title"
        >
          <Lbl>{t("markPerformed")}</Lbl>
          <h2
            id="mark-performed-title"
            style={{
              margin: "6px 0 14px",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.015em",
            }}
          >
            {t("markPerformedConfirmTitle")}
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
            <div className="mono mono-strong">
              {job.startPlz} → {job.endPlz} · {job.distanceKm} km
            </div>
          </div>
          <p className="para-intro">{t("markPerformedConfirmBody")}</p>
          <InlineAlert
            tone="error"
            message={error}
            onDismiss={() => setError(null)}
          />
          <SlideToConfirm
            text={t("slideToConfirm")}
            doneText={t("slidePerformed")}
            onConfirm={onSlideConfirm}
          />
          <button
            type="button"
            className="btn block"
            style={{ marginTop: 12 }}
            onClick={onClose}
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop center">
      <div
        className="sheet modal performed-success-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="performed-success-title"
      >
        <div className="performed-success-scroll">
          <div className="performed-success-check" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 12l4 4 8-9"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 id="performed-success-title" className="performed-success-title">
            {t("performedSuccessTitle")}
          </h3>
          <p className="performed-success-body">{t("performedSuccessBody")}</p>
          <button
            type="button"
            className="performed-upload-drop touch-target"
            onClick={() => setCategoryOpen(true)}
          >
            <span className="performed-upload-icn">
              <UploadTrayIcon />
            </span>
            <span className="performed-upload-cta">
              {t("performedUploadCta")}
            </span>
            <span className="performed-upload-hint">
              {uploads.length
                ? t("myDocsUploadHint")
                : t("performedUploadHintEmpty")}
            </span>
          </button>
          <InlineAlert
            tone={uploadFeedback?.tone}
            message={uploadFeedback?.message}
            onDismiss={() => setUploadFeedback(null)}
          />
          {uploads.length > 0 ? (
            <div className="mydocs-list performed-success-list">
              {uploads.map((u) => (
                <MyDocRow
                  key={u.id}
                  doc={u}
                  t={t}
                  onRemove={
                    u.reviewStatus === "uploaded"
                      ? () => setRemoveId(u.id)
                      : null
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn block primary mt-16"
          onClick={onClose}
        >
          {t("performedDone")}
        </button>
        <input
          ref={inputRef}
          type="file"
          capture="environment"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
          className="hidden"
          onChange={onPickFile}
        />
        <TourDocCategoryModal
          open={categoryOpen}
          onClose={() => setCategoryOpen(false)}
          onPick={pickType}
        />
        <RemoveDocModal
          open={!!removeId}
          onCancel={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      </div>
    </div>
  );
};

// =========================================================================
// SIMPLE PROFILE / INFO
// =========================================================================
const ProfilePane = () => {
  const { t } = useI18n();
  const [signOutNotice, setSignOutNotice] = useState(false);
  return (
    <div className="scroll" style={{ padding: "10px 22px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
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
          <div className="text-strong-lg">
            {AuthStore.DEMO_DRIVER}
          </div>
          <div className="mono text-muted-sm">
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
            <div className="text-muted-sm">{sub}</div>
          </div>
          <Ic.Chev />
        </div>
      ))}
      {signOutNotice ? (
        <div className="stack-16">
          <InlineAlert
            tone="info"
            message={t("signOutAlert")}
            onDismiss={() => setSignOutNotice(false)}
          />
        </div>
      ) : null}
      <button
        type="button"
        className="btn destructive-outline block"
        style={{ marginTop: 24 }}
        onClick={() => setSignOutNotice(true)}
      >
        <Ic.Logout /> {t("signOut")}
      </button>
    </div>
  );
};

const DriverNotificationsList = ({ onOpenJob, onOpenInfopoint }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const rows = store.getDriverNotifications();

  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const day =
        F().formatRelativeDay?.(row.createdAt, t) || row.createdAt || "";
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(row);
    });
    return [...map.entries()];
  }, [rows, t]);

  const markRead = (row) => {
    if (!row.read) store.markDriverNotificationsRead([row.id]);
  };

  const openRow = (row) => {
    markRead(row);
    if (row.type === "infopoint_news") {
      onOpenInfopoint?.();
      return;
    }
    if (!row.jobId || !onOpenJob) return;
    const job = store.getJobs().find((j) => j.id === row.jobId);
    if (job) onOpenJob(job);
  };

  const isActionable = (row) =>
    row.type === "infopoint_news"
      ? Boolean(onOpenInfopoint)
      : Boolean(row.jobId && onOpenJob);

  if (!rows.length) {
    return (
      <EmptyState
        title={t("driverNotificationsEmpty")}
        className="notifications-empty"
      />
    );
  }

  return (
    <div className="notifications-grouped-list">
      {grouped.map(([day, dayRows]) => (
        <section key={day}>
          <h4 className="notification-day-header">{day}</h4>
          <ul className="notifications-day-rows">
            {dayRows.map((row) => {
              const actionable = isActionable(row);
              const content = (
                <>
                  {!row.read ? (
                    <span className="notification-row-dot" aria-hidden="true" />
                  ) : (
                    <span className="notification-row-dot-spacer" aria-hidden="true" />
                  )}
                  <span className="notification-row-body">
                    <span className="notification-row-title">{row.title}</span>
                    <span className="notification-row-text">{row.body}</span>
                    {row.type === "infopoint_news" ? (
                      <span className="notification-row-hint">
                        {t("driverNotifInfopointHint")}
                      </span>
                    ) : null}
                    <span className="notification-row-meta mono">
                      {row.createdAt}
                      {row.tour ? ` · ${row.tour}` : ""}
                    </span>
                  </span>
                </>
              );

              return (
                <li key={row.id}>
                  {actionable ? (
                    <button
                      type="button"
                      className={`notification-row${row.read ? "" : " unread"}`}
                      onClick={() => openRow(row)}
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      className={`notification-row notification-row-static${
                        row.read ? "" : " unread"
                      }`}
                    >
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};

const DriverNotificationsPane = ({ onClose, onBack, onOpenJob, onOpenInfopoint }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const close = onClose || onBack;
  const unreadCount = store
    .getDriverNotifications()
    .filter((n) => !n.read).length;
  const titleId = "driver-notifications-pane-title";

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <>
      <button
        type="button"
        className="notifications-dropdown-backdrop"
        onClick={close}
        aria-label={t("dismiss")}
      />
      <div
        className="notifications-dropdown"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Two-row header: long DE strings ("Benachrichtigungen",
            "Alle als gelesen markieren") cannot share one row on
            phone widths without colliding. */}
        <div className="notifications-dropdown-header">
          <div className="notifications-pane-head-row">
            <h3 id={titleId}>{t("driverNotifications")}</h3>
            <button
              type="button"
              onClick={close}
              className="btn icon sm notifications-close-btn"
              aria-label={t("dismiss")}
              title={t("dismiss")}
            >
              <Ic.X />
            </button>
          </div>
          <div className="notifications-pane-sub-row">
            <div className="label">{t("driverNotificationsSub")}</div>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="notifications-mark-all-btn"
                onClick={() => store.markDriverNotificationsRead()}
                aria-label={t("markAllRead")}
                title={t("markAllRead")}
              >
                <Ic.CheckAll />
                <span className="notifications-mark-all-label">{t("markAllRead")}</span>
              </button>
            ) : (
              <span className="notifications-all-read-hint" aria-live="polite">
                {t("driverNotificationsAllRead")}
              </span>
            )}
          </div>
        </div>
        <div className="notifications-dropdown-body scroll">
          <DriverNotificationsList
            onOpenJob={onOpenJob}
            onOpenInfopoint={onOpenInfopoint}
          />
        </div>
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

const formatCalendarDayLabel = (dayKey) => {
  const m = String(dayKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : dayKey || "—";
};

const DriverProbationCard = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const summary = store.getDriverProbationSummary();
  if (!summary || !summary.onProbation) return null;
  const pct = summary.limit
    ? Math.min(
        100,
        Math.round((summary.performedCount / summary.limit) * 100),
      )
    : 0;

  return (
    <div className="section-card daily-limit-card probation-card">
      <div className="row-between">
        <h2 className="section-title">{t("driverProbationProfileTitle")}</h2>
        <span className={`pill ${summary.atLimit ? "warn" : "accepted"}`}>
          {summary.performedCount} / {summary.limit}
        </span>
      </div>

      <p className="section-hint">
        {t("driverProbationProfileUsage", {
          performed: summary.performedCount,
          limit: summary.limit,
          taken: summary.takenCount,
        })}
      </p>

      <div
        className="limit-meter stack-12"
        role="progressbar"
        aria-valuenow={summary.performedCount}
        aria-valuemin={0}
        aria-valuemax={summary.limit}
        aria-label={t("driverProbationProfileUsage", {
          performed: summary.performedCount,
          limit: summary.limit,
          taken: summary.takenCount,
        })}
      >
        <div
          className="limit-meter-track"
          style={{ background: "var(--paper-2)", borderRadius: 99, height: 8 }}
        >
          <span
            className={`limit-meter-fill${summary.atLimit ? " at-limit" : ""}`}
            style={{ width: `${pct}%`, borderRadius: 99 }}
            aria-hidden="true"
          />
        </div>
        <div className="limit-meter-meta stack-8 text-caption" aria-hidden="true">
          {summary.atLimit
            ? t("driverProbationProfileAtLimit")
            : t("driverProbationProfileRemaining", {
                remaining: summary.remainingSlots,
              })}
        </div>
      </div>
    </div>
  );
};

const ProbationLimitSheet = ({ limitInfo, onClose }) => {
  const { t } = useI18n();
  return (
    <div className="sheet-backdrop center" onClick={onClose}>
      <div
        className="sheet card confirm-sheet confirm-sheet-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <Lbl>{t("driverProbationLimitTitle")}</Lbl>
        <p style={{ marginTop: 8 }}>
          {t("driverProbationLimitReached", {
            limit: limitInfo?.limit ?? 3,
            performed: limitInfo?.performedCount ?? 0,
          })}
        </p>
        <div className="confirm-sheet-actions">
          <button
            type="button"
            className="btn primary touch-target"
            onClick={onClose}
          >
            {t("uiDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
};

// Help — Infopoint tab only (dispatcher hotline + email; no FAQ accordion)
const HelpSupportContent = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const driver = store.getCurrentDriver();
  const support = store.getDriverSupportContact();
  const mailSubject = encodeURIComponent(
    t("mailtoSubjectSupport", { driverCode: driver?.driverCode || "" }),
  );
  const mailtoHref = `mailto:${support.email}?subject=${mailSubject}`;
  const telHref = `tel:${String(support.phone || "").replace(/\s/g, "")}`;

  return (
    <div className="section-card" style={{ marginTop: 0 }}>
      <h2 className="section-title">{t("helpSupportTitle")}</h2>
      <p className="section-hint">{t("helpSupportIntro")}</p>
      <div className="stack-4">
        <a href={telHref} className="contact-row">
          <span className="contact-row-icon">
            <Ic.Phone />
          </span>
          <span className="flex-1-min-0">
            <span className="contact-row-value">{support.phone}</span>
            <div className="contact-row-sub">{t("dispatcherHotlineSub")}</div>
          </span>
        </a>
        <a href={mailtoHref} className="contact-row">
          <span className="contact-row-icon">
            <Ic.Mail />
          </span>
          <span className="flex-1-min-0">
            <span className="contact-row-value">{support.email}</span>
            <div className="contact-row-sub">{t("profileEmailSupport")}</div>
          </span>
        </a>
      </div>
    </div>
  );
};

const THEME_KEY = "autheon-theme";

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch (_) {
    /* no-op */
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch (_) {
    return "light";
  }
}

function applyAppTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_) {
    /* no-op */
  }
  const color = theme === "dark" ? "#1C1C1E" : "#FFFFFF";
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", color);
    meta.removeAttribute("media");
  });
  const appleStatus = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );
  if (appleStatus) {
    appleStatus.setAttribute(
      "content",
      theme === "dark" ? "black-translucent" : "default",
    );
  }
}

const ProfilePaneFull = () => {
  const { t, locale, setLocale } = useI18n();
  const store = useAuthStore();
  const d = store.getCurrentDriver();
  const prefs = d?.prefs || {};
  const setPref = (patch) => store.updateDriverPrefs(patch);
  const [editingProfile, setEditingProfile] = useState(false);
  const [postalText, setPostalText] = useState("");
  const [theme, setTheme] = useState(readStoredTheme);
  const postalAreas = prefs.postalAreas || [];
  const isPwaSurface =
    typeof document !== "undefined" &&
    document.body.classList.contains("pwa-page");

  useEffect(() => {
    if (!isPwaSurface) return;
    applyAppTheme(theme);
  }, [theme, isPwaSurface]);

  const handleAddPostal = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!postalAreas.includes(trimmed)) {
      setPref({ postalAreas: [...postalAreas, trimmed] });
    }
    setPostalText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddPostal(postalText);
    }
  };

  const handleBlur = () => {
    handleAddPostal(postalText);
  };

  const removePostal = (indexToRemove) => {
    setPref({
      postalAreas: postalAreas.filter((_, idx) => idx !== indexToRemove),
    });
  };
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
  const [mdFeedback, setMdFeedback] = useState(null); // {tone, message}
  const [signOutOpen, setSignOutOpen] = useState(false);
  const submitMasterDataRequest = () => {
    const r = store.requestMasterDataChange(mdForm);
    if (r.ok) {
      setMdForm(emptyMasterDataChangeForm(d));
      setEditingProfile(false);
      setMdFeedback({ tone: "success", message: t("masterDataChangeSent") });
      return;
    }
    const reasonToKey = {
      open_request_exists: "masterDataChangeOpenExists",
      no_changes: "masterDataChangeNoChanges",
      company_required: "masterDataChangeCompanyRequired",
      email_required: "masterDataChangeEmailRequired",
      invalid_email: "masterDataChangeInvalidEmail",
      duplicate_email: "masterDataChangeDuplicateEmail",
    };
    setMdFeedback({
      tone: "error",
      message: t(reasonToKey[r.reason] || "masterDataChangeSubmitFailed"),
    });
  };

  return (
    <>
      <div className="pwa-screen-header">
        <h1 className="header-title">{t("profileTitle")}</h1>
        <div className="header-subtitle">{t("profileSubtitle")}</div>
      </div>
      <div className="scroll scroll-body">
        {/* Identity — header block, not a card (plan §7.7.1) */}
        <div className="profile-identity">
          <span className="avatar">
            {d?.name
              ? d.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
              : "JB"}
          </span>
          <div className="flex-1-min-0">
            <div className="profile-identity-name">
              {d?.name}
              {d?.status === "active" && (
                <span
                  className="profile-verified-badge"
                  title={t("profileVerifiedAccount")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </span>
              )}
            </div>
            <div className="profile-identity-code">{d?.driverCode}</div>
            <div className="stack-4">
              <span className="pill accepted">
                {displayDriverStatus(d?.status, t)}
              </span>
            </div>
          </div>
        </div>

        {/* Probation progress card (hidden after release) */}
        <DriverProbationCard />

        {/* Master Data Card */}
        <div className="section-card mdr-card">
          <div className="row-between">
            <h2 className="section-title">{t("profileMasterData")}</h2>
            {profileMode === "pending" ? (
              <span className="pill assigned">
                {t("masterDataChangePendingBadge")}
              </span>
            ) : null}
          </div>
          {profileMode === "pending" ? (
            <div className="mdr-status-banner stack-12" role="status">
              <strong>{t("masterDataChangePendingTitle")}</strong>
              <div className="stack-4">
                {t("masterDataChangePendingBody", { date: openMdr.createdAt })}
              </div>
            </div>
          ) : (
            <p className="section-hint">
              {profileMode === "edit"
                ? t("masterDataChangeFormHint")
                : t("masterDataChangeNotice")}
            </p>
          )}
          <div className="mdr-field-list stack-16">
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
                  <label className="mdr-field-label" htmlFor={inputId}>
                    {label}
                    {required && profileMode === "edit" ? " *" : ""}
                  </label>
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
                            <span className="mdr-field-badge stack-4">
                              {t("masterDataChangeUpdatedBadge")}
                            </span>
                          ) : null}
                        </div>
                        {changed ? (
                          <div className="mdr-field-old">
                            {pendingBefore || "—"}
                          </div>
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
          {mdFeedback ? (
            <div className="stack-12">
              <InlineAlert
                tone={mdFeedback.tone}
                message={mdFeedback.message}
                onDismiss={() => setMdFeedback(null)}
              />
            </div>
          ) : null}
          {profileMode === "view" ? (
            <button
              type="button"
              className="btn block stack-16"
              onClick={startProfileEdit}
            >
              {t("masterDataChangeEditBtn")}
            </button>
          ) : null}
          {profileMode === "edit" ? (
            <div
              className="mdr-actions stack-16"
              style={{ display: "flex", gap: 10 }}
            >
              <button
                type="button"
                className="btn ghost block"
                onClick={() => {
                  cancelProfileEdit();
                  setMdFeedback(null);
                }}
              >
                {t("masterDataChangeCancel")}
              </button>
              <button
                type="button"
                className="btn primary block"
                onClick={submitMasterDataRequest}
              >
                {t("masterDataChangeSubmit")}
              </button>
            </div>
          ) : null}
          {profileMode === "pending" && openMdr?.note && !openMdr?.proposed ? (
            <p className="section-hint" style={{ fontStyle: "italic" }}>
              {openMdr.note}
            </p>
          ) : null}
        </div>

        {/* Preferences & Notification Card */}
        <div className="section-card">
          <h2 className="section-title">{t("notificationPreferences")}</h2>

          <div
            className="stack-12"
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <label className="switch-row">
              <span className="switch-row-text">{t("pushEnabledMaster")}</span>
              <span className="switch-toggle-wrap">
                <input
                  type="checkbox"
                  className="switch-toggle-input"
                  checked={prefs.pushEnabled !== false}
                  onChange={(e) => setPref({ pushEnabled: e.target.checked })}
                />
                <span className="switch-slider" />
              </span>
            </label>
            <label className="switch-row">
              <span className="switch-row-text">
                {t("pushNotifyNewPublished")}
              </span>
              <span className="switch-toggle-wrap">
                <input
                  type="checkbox"
                  className="switch-toggle-input"
                  checked={prefs.notifyNewPublished !== false}
                  onChange={(e) =>
                    setPref({ notifyNewPublished: e.target.checked })
                  }
                />
                <span className="switch-slider" />
              </span>
            </label>
          </div>

          <div className="stack-16">
            <label className="field-label">{t("vehicleType")}</label>
            <div className="stack-4">
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
            </div>
          </div>
          <div className="stack-16">
            <label className="field-label">{t("axle")}</label>
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
          </div>

          <div className="stack-16">
            <label className="field-label" htmlFor="profile-postal-input">
              {t("pushNotifyPostalPrefix")}
            </label>
            <div className="postal-chip-container stack-4">
              {postalAreas.map((chip, idx) => (
                <span key={idx} className="postal-chip">
                  {chip}
                  <button
                    type="button"
                    className="postal-chip-delete"
                    onClick={() => removePostal(idx)}
                    aria-label={`Remove postal code ${chip}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="profile-postal-input"
                type="text"
                className="postal-chip-input"
                value={postalText}
                inputMode="numeric"
                maxLength={5}
                onChange={(e) =>
                  setPostalText(e.target.value.replace(/\D/g, ""))
                }
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={
                  postalAreas.length === 0 ? t("pushPostalPrefixHint") : ""
                }
              />
            </div>
          </div>
          <div className="stack-16">
            <InlineAlert tone="info" message={t("pushSupportNotice")} />
          </div>
        </div>

        {isPwaSurface ? (
          <div className="section-card">
            <h2 className="section-title">{t("appAppearance")}</h2>
            <p className="section-hint">{t("appAppearanceHint")}</p>
            <div className="stack-16">
              <label className="field-label">{t("appLanguage")}</label>
              <div className="seg full" role="group" aria-label={t("appLanguage")}>
                <button
                  type="button"
                  className={locale === "en" ? "on" : ""}
                  aria-pressed={locale === "en"}
                  onClick={() => setLocale("en")}
                >
                  English
                </button>
                <button
                  type="button"
                  className={locale === "de" ? "on" : ""}
                  aria-pressed={locale === "de"}
                  onClick={() => setLocale("de")}
                >
                  Deutsch
                </button>
              </div>
            </div>
            <div className="stack-16">
              <label className="field-label">{t("appTheme")}</label>
              <div className="seg full" role="group" aria-label={t("appTheme")}>
                <button
                  type="button"
                  className={theme === "light" ? "on" : ""}
                  aria-pressed={theme === "light"}
                  onClick={() => setTheme("light")}
                >
                  {t("themeLight")}
                </button>
                <button
                  type="button"
                  className={theme === "dark" ? "on" : ""}
                  aria-pressed={theme === "dark"}
                  onClick={() => setTheme("dark")}
                >
                  {t("themeDark")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="btn destructive-outline block stack-16"
          onClick={() => setSignOutOpen(true)}
        >
          <Ic.Logout /> {t("signOut")}
        </button>
      </div>

      <ConfirmSheet
        open={signOutOpen}
        title={t("signOut")}
        message={t("signOutAlert")}
        confirmLabel={t("signOut")}
        onConfirm={() => setSignOutOpen(false)}
        onCancel={() => setSignOutOpen(false)}
        destructive
      />
    </>
  );
};

const Infopoint = () => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [subTab, setSubTab] = useState("documents");
  const INFO_TABS = ["documents", "news", "help"];
  const [openNewsId, setOpenNewsId] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const readerId = store.getCurrentDriver()?.id || AuthStore.DEMO_DRIVER;
  const docs = store.getDocuments().filter((d) => d.visible);
  const news = store.getNews();
  const unreadCount = news.filter((n) => !n.readBy.includes(readerId)).length;

  const openNews = (item) => {
    store.markNewsRead(item.id, readerId);
    setOpenNewsId((cur) => (cur === item.id ? null : item.id));
  };

  return (
    <div
      style={{
        background: "var(--paper-2)",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {docPreview ? (
        <DocumentPreviewSheet
          preview={docPreview}
          onClose={() => setDocPreview(null)}
        />
      ) : null}
      <div
        style={{
          background: "var(--paper)",
          padding: "16px 20px 14px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
          }}
        >
          {t("infopoint")}
        </h1>
        <div
          style={{
            fontSize: 13.5,
            color: "var(--muted)",
            marginTop: 4,
            lineHeight: 1.3,
          }}
        >
          {t("infopointSubtitle")}
        </div>

        {/* Horizontal Tab Pills Selector */}
        <div
          className="myjobs-tabs-slider"
          style={{
            marginTop: 16,
            padding: "0 0 12px 0",
            borderBottom: "none",
            justifyContent: "flex-start",
            gap: "20px",
          }}
        >
          {[
            ["documents", t("infopointDocsTab")],
            ["news", t("infopointNewsTab"), unreadCount],
            ["help", t("infopointHelpTab")],
          ].map(([id, lbl, n]) => (
            <button
              key={id}
              type="button"
              className={`myjobs-tab-pill ${subTab === id ? "active" : ""}`}
              onClick={() => setSubTab(id)}
            >
              <span>{lbl}</span>
              {id === "news" && n > 0 ? (
                <span className="pill-badge">{n}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Swipeable tab content — drag left/right to switch tabs */}
      <SwipeViews
        index={INFO_TABS.indexOf(subTab)}
        count={INFO_TABS.length}
        onIndexChange={(i) => setSubTab(INFO_TABS[i])}
        style={{ flex: 1, minHeight: 0, background: "var(--paper-2)" }}
      >
        {INFO_TABS.map((paneId) => (
          <div
            key={paneId}
            className="swipe-pane-body"
            style={{ padding: "16px 20px 24px" }}
          >
            {paneId === "documents" ? (
          <>
            <div className="infopoint-card">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="infopoint-doc-row"
                >
                  <div className="infopoint-news-icon read" style={{ color: "var(--primary)" }}>
                    <Ic.Pdf />
                  </div>
                  <div className="flex-1-min-0">
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {displayDocTitle(d, t)}
                    </div>
                    {d.description ? (
                      <div className="text-muted-sm" style={{ marginTop: 4, lineHeight: 1.4 }}>
                        {d.description}
                      </div>
                    ) : null}
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted-2)",
                        marginTop: 6,
                        fontWeight: 500,
                      }}
                    >
                      {displayDocCategory(d.category, t)} ·{" "}
                      {displayDocScope(d.scope, t)} · {d.version}
                    </div>
                    <div
                      className="mono text-muted-sm"
                      style={{ marginTop: 4 }}
                    >
                      {d.size ? `${d.size} · ` : ""}
                      {d.updatedAt}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="btn icon sm touch-target"
                      style={{
                        background: "var(--paper-2)",
                        border: "1px solid var(--line)",
                      }}
                      onClick={() => {
                        const r = store.getInfopointDocumentPreview(d.id);
                        if (r.ok) setDocPreview(r.preview);
                      }}
                      title={t("view")}
                      aria-label={`${t("view")}: ${d.title}`}
                    >
                      <Ic.Eye />
                    </button>
                    <button
                      type="button"
                      className="btn icon sm touch-target"
                      style={{
                        background: "var(--paper-2)",
                        border: "1px solid var(--line)",
                      }}
                      onClick={() => store.downloadInfopointDocument(d.id)}
                      title={t("download")}
                      aria-label={`${t("download")}: ${d.title}`}
                    >
                      <Ic.Down />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="dash-area"
              style={{
                marginTop: 16,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                letterSpacing: 0,
                textTransform: "none",
                borderRadius: 12,
                padding: 12,
              }}
            >
              {t("emergencyDispatchNotice")}
            </div>
          </>
        ) : paneId === "help" ? (
          <HelpSupportContent />
        ) : (
          <>
            {news.length === 0 ? (
              <div
                className="dash-area"
                style={{ padding: 28, textAlign: "center", borderRadius: 16 }}
              >
                <div style={{ fontWeight: 600 }}>{t("infopointNewsEmpty")}</div>
                <div className="infopoint-empty-hint">
                  {t("infopointNewsAdminHint")}
                </div>
              </div>
            ) : (
              <div className="infopoint-card">
                {news.map((n) => {
                  const unread = !n.readBy.includes(readerId);
                  const expanded = openNewsId === n.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className="infopoint-news-row"
                      onClick={() => openNews(n)}
                      aria-expanded={expanded}
                      aria-label={n.title}
                    >
                      <div
                        className={`infopoint-news-icon ${unread ? "unread" : "read"}`}
                      >
                        <Ic.Calendar />
                        {unread ? (
                          <span
                            style={{
                              position: "absolute",
                              top: -2,
                              right: -2,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--primary)",
                              border: "1.5px solid var(--paper)",
                            }}
                          ></span>
                        ) : null}
                      </div>
                      <div className="flex-1-min-0">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: unread ? 600 : 500,
                              fontSize: 14,
                              color: "var(--text)",
                            }}
                          >
                            {n.title}
                          </div>
                        </div>
                        <div
                          className="mono text-muted-sm"
                          style={{ marginTop: 4 }}
                        >
                          {n.publishedAt}
                        </div>
                        <p
                          className="text-muted-sm"
                          style={{ margin: "8px 0 0", lineHeight: 1.45, fontSize: 13 }}
                        >
                          {expanded
                            ? n.body
                            : `${(n.body || "").slice(0, 100)}${
                                (n.body || "").length > 100 ? "…" : ""
                              }`}
                        </p>
                      </div>
                      <div
                        style={{
                          alignSelf: "center",
                          color: "var(--muted-2)",
                          transform: expanded ? "rotate(180deg)" : "none",
                          transition: "transform 0.15s ease",
                          display: "flex",
                        }}
                      >
                        <Ic.Down />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
            )}
          </div>
        ))}
      </SwipeViews>
    </div>
  );
};

const InfoPaneFull = Infopoint;

const SameDayOverlapSheet = ({ onCancel, onConfirm }) => {
  const { t } = useI18n();
  return (
    <div className="sheet-backdrop center" onClick={onCancel}>
      <div
        className="sheet card confirm-sheet confirm-sheet-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlap-sheet-title"
      >
        <Lbl>{t("driverAcceptOverlapTitle")}</Lbl>
        <h2 id="overlap-sheet-title">{t("bindingAcceptance")}</h2>
        <p>{t("driverAcceptOverlapConfirm")}</p>
        <div className="confirm-sheet-actions">
          <button type="button" className="btn touch-target" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn cta touch-target"
            onClick={onConfirm}
          >
            {t("driverAcceptOverlapConfirmBtn")}
          </button>
        </div>
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
  JobTourDocuments,
  DriverNotificationsList,
  DriverNotificationsPane,
  JobInvoiceUpload,
  MyJobs,
  ReportProblemSheet,
  PendingNotice,
  MarkPerformedSheet,
  ProbationLimitSheet,
  DocumentPreviewSheet,
  SameDayOverlapSheet,
  InlineAlert,
  DriverProbationCard,
  ProfilePane,
  ProfilePaneFull,
  Infopoint,
  InfoPaneFull,
});
