/* global React, ReactDOM, AuthStore, useAuthStore */
const { useState, useEffect, useRef, useMemo } = React;

const UI = window.DriverUI || {};
const {
  Badge,
  EmptyState,
  SkeletonList,
  Sheet,
  SheetGrabber,
  SheetPullRegion,
  ConfirmSheet,
  SortSelect,
} = UI;
const F = () => window.AutheonFormatters || {};

// Portal target for full-frame overlays. The tab bar is a later sibling of
// the tab body inside .phone-screen and ties it on z-index (both 40), so an
// overlay rendered inline in a tab pane loses the paint order and the nav
// swallows taps meant for the overlay. Portaling to .phone-screen appends
// after the tab bar and wins the tie — same trick SortSelect uses for its
// dropdown (driver-ui.jsx).
const getPhoneScreen = () => {
  if (typeof document === "undefined") return null;
  return document.querySelector(".phone-screen");
};

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

// Vehicle-domain display helpers delegate to the SHARED store resolvers
// (client confirmation "Systemlogik Fahrzeugeingabe") so the Driver PWA and the
// Admin Backend can never render a different label or a different derived
// red-licence-plate decision.
// "All" must never reach transportTypeLabel — normalizeTransportType falls
// back unknown values to own_axle, which would duplicate the Own axle chip.
const isMarketplaceFilterAll = (value) =>
  value == null ||
  String(value).trim() === "" ||
  String(value).trim() === "All";

const displayTransportType = (value, t) =>
  isMarketplaceFilterAll(value)
    ? t("all")
    : AuthStore.transportTypeLabel(value, t);

// Canonical transport-type value for filter comparisons.
const canonTransportType = (v) =>
  isMarketplaceFilterAll(v) ? "All" : AuthStore.normalizeTransportType(v);

const displayVehicle = (value, t) =>
  isMarketplaceFilterAll(value)
    ? t("all")
    : AuthStore.vehicleTypeLabel(value, t);

// Icon mapping for the three confirmed vehicle types.
const vehicleTypeIcon = (vehicleType) => {
  switch (AuthStore.normalizeVehicleType(vehicleType)) {
    case AuthStore.VEHICLE_TYPE_TRUCK_UP_TO_7_5_T:
      return <Ic.VehicleLightTruck />;
    case AuthStore.VEHICLE_TYPE_TRUCK_OVER_7_5_T:
      return <Ic.VehicleTruck />;
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
  if (reason === "file_too_large") return t("invoiceUploadTooLarge");
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
      <path
        pathLength="1"
        d="M28.7452 0.0499943C29.3687 -0.0214756 30.9431 0.0174098 31.6381 0.0180174C33.6279 0.0329038 35.6176 0.0269789 37.6073 0.000244141C37.9458 1.15288 38.4111 2.45984 38.7891 3.62569L41.1318 10.8437C38.7802 10.9527 36.152 10.7687 33.7703 10.8188C32.0193 10.8557 30.1961 10.7226 28.4612 11.2014C22.0467 12.9713 19.8914 18.3673 16.7499 23.549C15.1759 26.1455 13.6026 28.6479 12.0805 31.2103L11.6666 31.9194C10.5996 31.9722 9.42407 31.9176 8.34659 31.9306C5.58855 31.964 2.75097 31.8662 0 31.9517C0.997865 30.5292 2.50586 27.8959 3.46749 26.3335L10.5896 14.7129C12.8592 10.9904 14.5347 7.73199 17.8721 4.82268C21.2443 1.883 24.3891 0.573297 28.7452 0.0499943Z"
      />
      <path
        pathLength="1"
        d="M38.3618 17.8626C38.3839 18.3225 39.4974 21.737 39.7447 22.4479C40.7885 25.4482 41.7117 29.0015 42.8468 31.9303C41.7937 31.9141 40.7088 31.9275 39.653 31.9275C38.8473 29.1833 37.9224 26.436 37.0768 23.7013C36.7626 22.685 35.9017 21.6732 34.9229 21.2676C33.7384 20.7767 32.2683 20.8416 31.0836 21.3173C30.3712 21.6337 29.7327 22.0982 29.2099 22.6805C28.5719 23.4055 27.1835 25.8009 26.6472 26.7238C25.6773 28.3928 24.4654 30.2545 23.5761 31.9292C22.505 31.9238 20.7214 31.8709 19.7114 31.9733C20.4259 30.5267 21.7266 28.4617 22.6104 27.09C25.1161 23.2008 26.6843 18.2008 31.9865 17.9032C32.4559 17.8373 33.7521 17.8563 34.2521 17.8566L38.3618 17.8626Z"
      />
      <path
        pathLength="1"
        d="M30.693 13.1161C32.8075 12.965 36.2745 13.0789 38.499 13.0869C38.6766 14.0339 39.1326 15.2447 39.3859 16.2471C37.5936 16.3169 35.7941 16.2525 34.0053 16.2721C32.7015 16.2864 31.2113 16.1606 29.9673 16.5009C26.065 17.5685 24.7269 20.5448 22.8602 23.6919L19.7354 28.9582C19.1403 29.937 18.5601 30.9247 17.9947 31.9212C17.0191 31.9231 14.7918 31.8713 13.897 32.0002C14.6112 30.9063 15.3757 29.5605 16.0567 28.4225L19.6507 22.4045C22.4928 17.5959 24.5497 13.7028 30.693 13.1161Z"
      />
      <path
        pathLength="1"
        d="M39.459 17.9398C40.5644 17.9793 41.8666 17.9475 42.9877 17.9492C43.1074 18.7702 43.924 21.0614 44.235 22.0024L47.622 31.9301L43.9359 31.9237C42.5317 27.2651 40.8029 22.6291 39.459 17.9398Z"
      />
    </g>
  </svg>
);

// Slide-to-confirm handle icons: arrow while ready, lock while disabled,
// check once confirmed. Sized/coloured via CSS (.slide-handle-icon).
const SlideArrowIcon = () => (
  <svg
    className="slide-handle-icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
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
  <svg
    className="slide-handle-icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
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
  <svg
    className="slide-handle-icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="5"
      y="10.5"
      width="14"
      height="9"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8 10.5V8a4 4 0 118 0v2.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Ic = {
  // Vehicle type icons for the THREE confirmed types (client confirmation
  // "Systemlogik Fahrzeugeingabe", 2026-07-26):
  //   VehicleCar         → passenger_car        (tabler:car, MIT)
  //   VehicleLightTruck  → truck_up_to_7_5_t    (hugeicons:delivery-truck-01, MIT)
  //   VehicleTruck       → truck_over_7_5_t     (tabler:truck, MIT)
  // The SUV / Van / Classic icons were REMOVED with their vehicle types: no
  // retired type may render as an active selectable option.
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
  // Truck over 7.5 t — heavier silhouette than the up-to-7.5 t icon.
  VehicleTruck: () => (
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
      <path d="M7 17a2 2 0 1 0 4 0a2 2 0 0 0-4 0m9 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0" />
      <path d="M11 17H9.5A1.5 1.5 0 0 1 8 15.5V6.5A1.5 1.5 0 0 1 9.5 5h5A1.5 1.5 0 0 1 16 6.5V17m0-8h3.5l2 4v3.5A1.5 1.5 0 0 1 20 18M8 9H4m1 4h3" />
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
  // Upload-source action sheet (camera vs. device file picker).
  Camera: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .84-.46l.92-1.42A1 1 0 0 1 9.3 4.7h5.4a1 1 0 0 1 .84.42l.92 1.42a1 1 0 0 0 .84.46h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  FolderFile: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13.5 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8.5L13.5 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3v4a1.5 1.5 0 0 0 1.5 1.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.5h7M8.5 16h4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
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
  EyeOff: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  Moon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Sun: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
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
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
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
  Lock: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.2" r="1.4" fill="currentColor" />
    </svg>
  ),
  Globe: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21C9.5 18.6 8.2 15.4 8.2 12S9.5 5.4 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Chat: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 10h.01M12 10h.01M15.5 10h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  CheckCircle: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8.2 12.4 2.6 2.6 5-5.4"
        stroke="currentColor"
        strokeWidth="1.8"
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

// =========================================================================
// SHARED SCREEN HEADER (all four primary driver screens)
// =========================================================================
// Client decision 2026-07-26 (Taner Özdemir / Ferhat Catak): every primary
// menu item's header sits at the SAME height, so the header is one component
// instead of four hand-rolled title blocks. The Marketplace greeting block
// (avatar initials + "Welcome back, <name>") is removed entirely and is NOT
// relocated to another screen — with it gone the title moves up into the
// standard position the other three screens already used.
//
// The notification action is part of this header, so it is available on every
// primary screen. It owns no state: the unread count comes from the store and
// the open/close state stays in the shell (`onOpenNotifications`).

const NotificationBellButton = ({ onOpen, open = false, unreadCount }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  // The store is the single source of truth for the unread count. `unreadCount`
  // is a presentation-only override for the header states gallery
  // (driver-header-states.html) — the app never passes it.
  const storeUnread = store.getDriverNotificationUnreadCount();
  const unread = unreadCount == null ? storeUnread : unreadCount;
  return (
    <button
      type="button"
      // `header-btn` is the shared header icon-button treatment (border,
      // radius, size, surface, shadow) used by sort + filter — the bell must
      // not re-declare any of it. `header-bell-btn` only anchors the badge.
      className="header-btn header-bell-btn"
      title={t("driverNotifications")}
      // The count is in the accessible name, so the visual badge is never the
      // only signal that notifications are unread.
      aria-label={
        unread > 0
          ? `${t("driverNotifications")} (${unread})`
          : t("driverNotifications")
      }
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => onOpen?.()}
    >
      <Ic.Bell />
      <Badge
        count={unread}
        variant="destructive"
        className="header-btn-badge"
        ariaHidden
      />
    </button>
  );
};

const DriverScreenHeader = ({
  title,
  subtitle,
  actions,
  onOpenNotifications,
  notificationsOpen = false,
  unreadCount,
  children,
}) => (
  <div className="pwa-screen-header">
    <div className="screen-header-row">
      <div className="screen-header-titles">
        <h1 className="header-title">{title}</h1>
        {subtitle ? <div className="header-subtitle">{subtitle}</div> : null}
      </div>
      {actions || onOpenNotifications ? (
        <div className="header-controls">
          {actions}
          {onOpenNotifications ? (
            <NotificationBellButton
              onOpen={onOpenNotifications}
              open={notificationsOpen}
              unreadCount={unreadCount}
            />
          ) : null}
        </div>
      ) : null}
    </div>
    {children}
  </div>
);

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
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8.2 12.4 2.6 2.6 5-5.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Slash: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  Plate: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2.5"
        y="8"
        width="19"
        height="8.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 11v2.6M10 11v2.6M13.5 11v2.6M17 11v2.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
};

// Registration status + additional vehicle characteristics, shown to the
// service partner as discrete tags. Registration status is its OWN category —
// it is never inferred from the transport type. The retired manual "Red plates"
// tag is gone; the requirement is derived and rendered by RedPlatesNotice.
// The two INDEPENDENT additional characteristics. Kept separate from
// registration status so a detail view that already lists registration status on
// its own row does not repeat it as a tag.
const vehicleCharacteristicFlags = (job, t) => {
  const flags = [];
  if (job.electricVehicle)
    flags.push({
      key: "electric",
      Icon: FlagIc.Bolt,
      label: t("vehicleInfoElectric"),
    });
  // "Ready to drive" is decision-relevant for third-party-axle transport and is
  // always shown to the service partner when set, on every surface.
  if (job.readyToDrive)
    flags.push({
      key: "readyToDrive",
      Icon: FlagIc.CheckCircle,
      label: t("vehicleReadyToDrive"),
    });
  return flags;
};

// Card-level tag row: registration status (its own category — never inferred
// from the transport type) plus the additional characteristics. The retired
// manual "Red plates" tag is gone; the requirement is derived and rendered by
// RedPlatesRequiredNotice.
const vehicleInfoFlags = (job, t) => {
  const flags = [];
  if (job.registrationStatus === AuthStore.REGISTRATION_REGISTERED)
    flags.push({
      key: "registered",
      Icon: FlagIc.CheckCircle,
      label: t("vehicleInfoRegistered"),
    });
  if (job.registrationStatus === AuthStore.REGISTRATION_DEREGISTERED)
    flags.push({
      key: "deregistered",
      Icon: FlagIc.Slash,
      label: t("vehicleInfoDeregistered"),
    });
  return [...flags, ...vehicleCharacteristicFlags(job, t)];
};

const VehicleFlagTags = ({ job, characteristicsOnly = false }) => {
  const { t } = useI18n();
  const flags = characteristicsOnly
    ? vehicleCharacteristicFlags(job, t)
    : vehicleInfoFlags(job, t);
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

// DERIVED red-licence-plate notice. Defined ONCE in driver-ui.jsx and shared
// with the Admin Backend so no surface can reach a conflicting decision.
const RedPlatesNotice = (props) => (
  <DriverUI.RedPlatesRequiredNotice {...props} />
);

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
          {vehicleTypeIcon(job.vehicleType)}
          {[job.manufacturer, job.vehicleModel]
            .filter((v) => v && v !== "—")
            .join(" ") || displayVehicle(job.vehicleType, t)}
        </span>
        <div className="jobcard-price tnum">
          {F().formatMoney
            ? F().formatMoney(fmtDriverOffer(job))
            : `€ ${fmtDriverOffer(job).toFixed(2)}`}
        </div>
      </div>
      <div className="jobcard-tags">
        <VehicleFlagTags job={job} />
        <span className="axle-chip">
          {displayTransportType(job.transportType, t)}
        </span>
        {/* Derived notice — location 2 of 5: marketplace order card (also My Jobs). */}
        <RedPlatesNotice job={job} variant="tag" />
      </div>
    </>
  );
};

// =========================================================================
// PORTAL (job list)
// =========================================================================
const JobCard = ({ job, onOpen, enterIndex }) => {
  const enterStyle =
    typeof enterIndex === "number" && enterIndex >= 0 && enterIndex < 4
      ? { ["--list-enter-i"]: enterIndex }
      : undefined;
  const enterClass =
    typeof enterIndex === "number" && enterIndex >= 0 && enterIndex < 4
      ? " list-enter"
      : "";
  return (
    <button
      type="button"
      className={"jobcard-btn" + enterClass}
      style={enterStyle}
      onClick={() => onOpen(job)}
    >
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
      <div className="scroll profile-header-block">
        <h1 className="profile-header-title">{t("blockedDriverTitle")}</h1>
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

  // Single derivation from the COMMITTED filters — feeds the chip row, the
  // filter button's badge and its accessible name. No separate count state.
  const activeChips = getAppliedMarketplaceFilters(filters, t);

  return (
    <>
      {/* Client decision 2026-07-26: title/subtitle + bell only — the sort and
          filter controls live with the results count below (see client's agreed
          Marketplace structure), which also keeps this header identical in
          height to My Orders / Infopoint / Profile. */}
      <DriverScreenHeader
        title={t("marketplace")}
        subtitle={t("exploreJobs")}
        onOpenNotifications={onOpenNotifications}
        notificationsOpen={notificationsOpen}
      />
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
        {/* Results count + sort/filter controls sit together directly under the
            header (client-agreed Marketplace structure 2026-07-26). Rendered
            outside the loading branch so the controls never disappear. */}
        <div className="portal-results-row">
          <span className="text-caption" aria-live="polite">
            {loading ? "" : `${ordered.length} ${t("results")}`}
          </span>
          <div className="header-controls">
            <SortSelect
              value={sortBy}
              onChange={setSortBy}
              options={portalSortOptions}
              label={t("sortJobs")}
            />
            <MarketplaceFilterButton filters={filters} onOpen={openFilter} />
          </div>
        </div>
        {activeChips.length > 0 ? (
          <div className="header-chips-row">
            {activeChips.map((c) => (
              <button
                key={c.id || c.key}
                type="button"
                className="chip"
                aria-label={t("removeFilterChip", { label: c.label })}
                onClick={() => {
                  if (c.key === "startPlz" || c.key === "endPlz") {
                    const list = normalizePlzAreaList(filters[c.key]).filter(
                      (p) => p !== c.value,
                    );
                    setFilters({ ...filters, [c.key]: list });
                    return;
                  }
                  setFilters({
                    ...filters,
                    [c.key]:
                      MARKETPLACE_FILTER_DEFAULTS[c.key] !== undefined
                        ? MARKETPLACE_FILTER_DEFAULTS[c.key]
                        : "",
                  });
                }}
              >
                {c.label}{" "}
                <span className="x" aria-hidden="true">
                  <Ic.X />
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {loading ? (
          <div aria-busy="true" aria-label={t("loadingJobs")}>
            <SkeletonList count={3} />
          </div>
        ) : (
          <>
            {ordered.map((j, index) => (
              <JobCard
                key={j.id}
                job={j}
                onOpen={onOpenJob}
                enterIndex={index}
              />
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
const FILTER_DATE_PRESETS = ["Today", "This week"];
/** Prototype demo "today" — seed timestamps and Today preset share this fixture day. */
const MARKETPLACE_FIXTURE_TODAY = "05.05.";
const MARKETPLACE_FIXTURE_YEAR = 2026;
const parseJobDdMm = (raw) => {
  const m = String(raw || "").match(/(\d{2})\.(\d{2})/);
  if (!m) return null;
  return new Date(MARKETPLACE_FIXTURE_YEAR, Number(m[2]) - 1, Number(m[1]));
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
/** Monday 00:00 local of the ISO-style week containing `date` (Mon–Sun). */
const startOfWeekMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = d.getDay(); // 0=Sun … 6=Sat
  const offset = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + offset);
  return d;
};
const endOfWeekSunday = (weekStartMonday) => {
  const d = new Date(
    weekStartMonday.getFullYear(),
    weekStartMonday.getMonth(),
    weekStartMonday.getDate() + 6,
  );
  return d;
};
/**
 * Date presets restrict results (audit item 43):
 * - Today → fixture day MARKETPLACE_FIXTURE_TODAY
 * - This week → Mon–Sun calendar week containing that fixture day
 * Production FE uses the same Mon–Sun rule against real device-local today.
 */
const matchesMarketplaceDatePreset = (jobDate, preset) => {
  if (!jobDate) return false;
  const fixtureToday = parseJobDdMm(MARKETPLACE_FIXTURE_TODAY);
  if (!fixtureToday) return false;
  if (preset === "Today") {
    return (
      jobDate.getFullYear() === fixtureToday.getFullYear() &&
      jobDate.getMonth() === fixtureToday.getMonth() &&
      jobDate.getDate() === fixtureToday.getDate()
    );
  }
  if (preset === "This week") {
    const weekStart = startOfWeekMonday(fixtureToday);
    const weekEnd = endOfWeekSunday(weekStart);
    return jobDate >= weekStart && jobDate <= weekEnd;
  }
  return false;
};
/** Exactly 2-digit PLZ area prefix, or "" if invalid. */
const normalizePlzAreaPrefix = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 2);
  return digits.length === 2 ? digits : "";
};

/** Display form: `51` → `51xxx`. */
const formatPlzAreaPill = (prefix) => {
  const digits = normalizePlzAreaPrefix(prefix);
  return digits ? digits.padEnd(5, "x") : "";
};

/**
 * Deduped 2-digit area list. Accepts arrays or a legacy single string.
 */
const normalizePlzAreaList = (value) => {
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      const prefix = normalizePlzAreaPrefix(item);
      if (prefix && !out.includes(prefix)) out.push(prefix);
    }
    return out;
  }
  if (typeof value === "string" || typeof value === "number") {
    const prefix = normalizePlzAreaPrefix(value);
    return prefix ? [prefix] : [];
  }
  return [];
};

/** OR-match across selected 2-digit areas. Empty list → inactive. */
const plzAreasMatch = (postalCode, areas) => {
  const list = normalizePlzAreaList(areas);
  if (!list.length) return true;
  const code = String(postalCode || "");
  if (!code) return false;
  return list.some((prefix) => code.startsWith(prefix));
};

const jobMatchesDriverFilters = (j, filters) => {
  const jobDate = parseJobDdMm(j.date);
  if (!plzAreasMatch(j.startPlz, filters.startPlz)) return false;
  if (!plzAreasMatch(j.endPlz, filters.endPlz)) return false;
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
  if (FILTER_DATE_PRESETS.includes(filters.from)) {
    if (!matchesMarketplaceDatePreset(jobDate, filters.from)) return false;
  }
  if (
    filters.vehicleType &&
    filters.vehicleType !== "All" &&
    AuthStore.normalizeVehicleType(j.vehicleType) !==
      AuthStore.normalizeVehicleType(filters.vehicleType)
  )
    return false;
  if (
    filters.transportType &&
    filters.transportType !== "All" &&
    canonTransportType(j.transportType) !==
      canonTransportType(filters.transportType)
  )
    return false;
  return true;
};

// -------------------------------------------------------------------------
// Applied-marketplace-filter model — ONE canonical derivation
// -------------------------------------------------------------------------
// Deliberately co-located with `jobMatchesDriverFilters` above: the set of
// filters we *count* must mirror the set of filters that actually *restrict*
// the result list. Keep the two in sync when either changes.
//
// This is a pure function of the COMMITTED filter object (the one the shell
// owns and the marketplace list is filtered by) — never of FilterSheet's draft
// state, never of the number of results returned, and never of sort state.
// There is no separate badge-count state anywhere; the badge, the chip row and
// the button's accessible name all read from this single derivation.
//
// A filter is "applied" only when it narrows the result set:
//   startPlz / endPlz        multi-select 2-digit areas — each prefix counts 1
//   from / to                date   — counted when set (each end of the range
//                                     counts separately, mirroring the two
//                                     removable chips)
//   vehicleType /            single-select — counted when set AND not the
//   transportType                           "All" default (not restrictive)
// Empty string, null, undefined, whitespace-only and empty arrays never count.
// PLZ multi-select counts each selected prefix (one removable pill each).
//
// Keys MUST match FilterSheet + jobMatchesDriverFilters (vehicleType /
// transportType). Legacy `vehicle` / `axle` keys are ignored so they cannot
// inflate the badge or resurrect a removed displayAxle helper.
const MARKETPLACE_FILTER_DEFAULTS = {
  startPlz: [],
  endPlz: [],
  vehicleType: "All",
  transportType: "All",
};
const MARKETPLACE_FILTER_KEYS = [
  "startPlz",
  "endPlz",
  "from",
  "to",
  "vehicleType",
  "transportType",
];

const isAppliedMarketplaceFilter = (key, value) => {
  if (key === "startPlz" || key === "endPlz") {
    return normalizePlzAreaList(value).length > 0;
  }
  if (value == null) return false;
  const v = typeof value === "string" ? value.trim() : value;
  if (v === "") return false;
  const dflt = MARKETPLACE_FILTER_DEFAULTS[key];
  if (dflt !== undefined && v === dflt) return false;
  return true;
};

/**
 * Canonical list of applied marketplace filters, in display order.
 * Returns `[{ id, key, value, label? }]`. Count = `.length`.
 * PLZ areas expand to one entry per selected 2-digit prefix (`51xxx`).
 * `t` is optional; when supplied each entry also carries a localized `label`
 * for the removable chip row.
 */
const getAppliedMarketplaceFilters = (filters, t) => {
  const f = filters || {};
  const label = (key, value) => {
    if (!t) return undefined;
    switch (key) {
      case "startPlz":
        return t("pickupPlz", { plz: formatPlzAreaPill(value) });
      case "endPlz":
        return t("dropPlz", { plz: formatPlzAreaPill(value) });
      case "from":
        return value === "Today"
          ? t("today")
          : value === "This week"
            ? t("thisWeek")
            : value === "Weekend"
              ? t("weekend")
              : t("fromDateChip", { date: isoToDisplayDate(value) });
      case "to":
        return t("untilDateChip", { date: isoToDisplayDate(value) });
      case "vehicleType":
        return displayVehicle(value, t);
      case "transportType":
        return displayTransportType(value, t);
      default:
        return String(value);
    }
  };
  // Fixed key order — NOT Object.keys(f), so the chip order cannot depend on
  // insertion order and an unknown key cannot leak into the count.
  const out = [];
  for (const key of MARKETPLACE_FILTER_KEYS) {
    if (key === "startPlz" || key === "endPlz") {
      for (const prefix of normalizePlzAreaList(f[key])) {
        out.push({
          id: `${key}:${prefix}`,
          key,
          value: prefix,
          label: label(key, prefix),
        });
      }
      continue;
    }
    if (!isAppliedMarketplaceFilter(key, f[key])) continue;
    out.push({ id: key, key, value: f[key], label: label(key, f[key]) });
  }
  return out;
};

/** Number of marketplace filters currently restricting the result set. */
const getAppliedMarketplaceFilterCount = (filters) =>
  getAppliedMarketplaceFilters(filters).length;

/**
 * Marketplace filter control + applied-filter count badge.
 *
 * The count is derived here from the COMMITTED `filters` object — never from
 * FilterSheet's draft state, never from the number of results the marketplace
 * returned, and never from sort state. There is no badge-count state to keep
 * in sync.
 *
 * The badge reuses the shared `Badge` visual primitive (as the notification
 * bell does) but none of its notification semantics; `Badge` renders nothing
 * at all for a count of 0, so the zero state reserves no layout space. The
 * count reaches assistive tech through the button's translated, pluralized
 * accessible name — the badge itself is `aria-hidden` and `pointer-events:
 * none`, so the control stays a single focusable, clickable target.
 */
const MarketplaceFilterButton = ({ filters, onOpen }) => {
  const { t, tPlural } = useI18n();
  const count = getAppliedMarketplaceFilterCount(filters);
  return (
    <button
      type="button"
      className={`header-btn header-filter-btn ${count ? "active" : ""}`}
      onClick={onOpen}
      title={t("filters")}
      aria-label={count ? tPlural("filtersApplied", count) : t("filters")}
    >
      <Ic.Filter />
      <Badge
        count={count}
        variant="destructive"
        className="header-btn-badge"
        ariaHidden
      />
    </button>
  );
};

const FilterSheet = ({ filters, setFilters, onClose }) => {
  const { t } = useI18n();
  const [local, setLocal] = useState({
    vehicleType: "All",
    transportType: "All",
    from: "",
    to: "",
    ...filters,
    startPlz: normalizePlzAreaList(filters?.startPlz),
    endPlz: normalizePlzAreaList(filters?.endPlz),
  });
  const [pickupDraft, setPickupDraft] = useState("");
  const [deliveryDraft, setDeliveryDraft] = useState("");
  const reset = () => {
    setLocal({
      startPlz: [],
      endPlz: [],
      from: "",
      to: "",
      vehicleType: "All",
      transportType: "All",
    });
    setPickupDraft("");
    setDeliveryDraft("");
  };
  // Only the three approved vehicle types are filterable.
  const types = AuthStore.selectableVehicleTypes();
  const transportOptions = ["All", ...AuthStore.TRANSPORT_TYPES];
  const store = useAuthStore();
  // Same predicate as the marketplace list — the CTA count is exact
  const preview = store
    .getJobs()
    .filter(
      (j) => j.status === "published" && jobMatchesDriverFilters(j, local),
    ).length;

  const addArea = (side, draft, clearDraft) => {
    const prefix = normalizePlzAreaPrefix(draft);
    if (!prefix) return;
    setLocal((prev) => {
      const list = normalizePlzAreaList(prev[side]);
      if (list.includes(prefix)) return prev;
      return { ...prev, [side]: [...list, prefix] };
    });
    clearDraft();
  };

  const removeArea = (side, prefix) => {
    setLocal((prev) => ({
      ...prev,
      [side]: normalizePlzAreaList(prev[side]).filter((p) => p !== prefix),
    }));
  };

  const renderPlzMulti = (side, label, draft, setDraft, inputId) => {
    const areas = normalizePlzAreaList(local[side]);
    const canAdd =
      normalizePlzAreaPrefix(draft).length === 2 &&
      !areas.includes(normalizePlzAreaPrefix(draft));
    return (
      <div className="filter-plz-block">
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        <div className="filter-plz-row">
          <input
            id={inputId}
            className="input"
            placeholder={t("plzAreaPlaceholder")}
            inputMode="numeric"
            maxLength={2}
            aria-label={label}
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canAdd) addArea(side, draft, () => setDraft(""));
              }
            }}
          />
          <button
            type="button"
            className="btn filter-plz-add"
            disabled={!canAdd}
            onClick={() => addArea(side, draft, () => setDraft(""))}
          >
            <Ic.Plus /> {t("addPlzArea")}
          </button>
        </div>
        {areas.length > 0 ? (
          <div className="filter-plz-pills">
            {areas.map((prefix) => (
              <span key={prefix} className="filter-plz-pill">
                {formatPlzAreaPill(prefix)}
                <button
                  type="button"
                  className="filter-plz-pill-x"
                  onClick={() => removeArea(side, prefix)}
                  aria-label={t("removePostalCode", {
                    code: formatPlzAreaPill(prefix),
                  })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <SheetGrabber onClose={onClose} />
        <SheetPullRegion onClose={onClose} className="sheet-head">
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
        </SheetPullRegion>
        <div className="sheet-body">
          <div className="field-label">{t("postalArea")}</div>
          {renderPlzMulti(
            "startPlz",
            t("pickupPlzTwoDigits"),
            pickupDraft,
            setPickupDraft,
            "filter-pickup-plz",
          )}
          {renderPlzMulti(
            "endPlz",
            t("deliveryPlzTwoDigits"),
            deliveryDraft,
            setDeliveryDraft,
            "filter-delivery-plz",
          )}

          <div className="field-label mt-field">{t("dateWindow")}</div>
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

          <div className="field-label mt-field">{t("vehicleType")}</div>
          <div className="flex-gap-8-wrap">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                className={`chip actionable chip-btn ${
                  local.vehicleType === type ? "on" : ""
                }`}
                aria-pressed={local.vehicleType === type}
                onClick={() =>
                  setLocal({
                    ...local,
                    vehicleType: local.vehicleType === type ? "All" : type,
                  })
                }
              >
                {displayVehicle(type, t)}
              </button>
            ))}
          </div>

          <div className="field-label mt-field">{t("transportType")}</div>
          <div className="chip-row-wrap">
            {transportOptions.map((val) => (
              <button
                key={val}
                type="button"
                className={`chip actionable chip-btn ${
                  local.transportType === val ? "on" : ""
                }`}
                aria-pressed={local.transportType === val}
                onClick={() => setLocal({ ...local, transportType: val })}
              >
                {displayTransportType(val, t)}
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
              setFilters({
                ...local,
                startPlz: normalizePlzAreaList(local.startPlz),
                endPlz: normalizePlzAreaList(local.endPlz),
              });
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
          {/* Pre-acceptance reduced projection: vehicle type, manufacturer,
              model, transport type, registration status and characteristics are
              decision-relevant and shown; plate and VIN stay hidden until
              acceptance. Presentation order matches driver-screen-spec.md. */}
          <div className="detail-kv-list">
            <div className="detail-kv-row">
              <div className="label">{t("vehicleType")}</div>
              <div className="value">{displayVehicle(job.vehicleType, t)}</div>
            </div>
            <div className="detail-kv-row">
              <div className="label">{t("manufacturer")}</div>
              <div className="value">{job.manufacturer || "—"}</div>
            </div>
            <div className="detail-kv-row">
              <div className="label">{t("model")}</div>
              <div className="value">{job.vehicleModel}</div>
            </div>
            <div className="detail-kv-row">
              <div className="label">{t("transportType")}</div>
              <div className="value">
                {displayTransportType(job.transportType, t)}
              </div>
            </div>
            <div className="detail-kv-row">
              <div className="label">{t("registrationStatus")}</div>
              <div className="value">
                {AuthStore.registrationStatusLabel(job.registrationStatus, t)}
              </div>
            </div>
            {vehicleCharacteristicFlags(job, t).length ? (
              <div className="detail-flag-block">
                <div className="label">{t("vehicleCharacteristics")}</div>
                <div className="jobcard-tags">
                  <VehicleFlagTags job={job} characteristicsOnly />
                </div>
              </div>
            ) : null}
          </div>
          {/* Derived notice — location 3 of 5: marketplace preview. */}
          <RedPlatesNotice job={job} variant="banner" />
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
        "slide-confirm " + (done ? "done" : "") + (dragging ? " dragging" : "")
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
            {displayVehicle(job.vehicleType, t)} ·{" "}
            {displayTransportType(job.transportType, t)}
          </div>
          <div
            style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}
            className="tnum"
          >
            € {fmtDriverOffer(job).toFixed(2)}
          </div>
        </div>

        {/* Derived notice — location 4 of 5: booking dialog, clearly
            highlighted before the binding slide-to-confirm so the partner sees
            the execution requirement while committing. */}
        <RedPlatesNotice job={job} variant="banner" />

        <p className="para-intro">{t("acceptanceLegal")}</p>
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
  const downloadName =
    preview.downloadName || preview.fileName || "document.pdf";

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

  const sheet = (
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

  // Render above the tab bar, not inside whichever pane opened us. Job
  // detail unmounts the tab bar anyway, so this only changes Infopoint —
  // where the nav used to paint over the Download/Share/Print row and eat
  // its taps. Falls back to inline if the frame is missing.
  const portalTarget = getPhoneScreen();
  return portalTarget ? ReactDOM.createPortal(sheet, portalTarget) : sheet;
};

// =========================================================================
// UPLOAD SOURCE SELECTION
// -------------------------------------------------------------------------
// Every driver document upload goes through this pair. The generic upload
// control must never open the camera by itself — it opens the action sheet,
// and only the explicit "Take photo" action clicks the capture input.
// =========================================================================

// Device file picker: PDF plus the image types the store accepts
// (store.js -> isAllowedTourDocumentFile). No capture attribute, so the OS
// shows files already stored on the device.
const DOC_FILE_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif";
// Camera capture: images only — a PDF can never come out of this input.
const DOC_PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

const UploadSourceSheet = ({ open, onClose, onTakePhoto, onChooseFile }) => {
  const { t } = useI18n();
  const firstActionRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    firstActionRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet upload-source-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-source-title"
      >
        <SheetGrabber onClose={onClose} />
        <div className="upload-source-body">
          <h2 id="upload-source-title" className="upload-source-title">
            {t("uploadSourceTitle")}
          </h2>
          <div className="upload-source-actions">
            <button
              ref={firstActionRef}
              type="button"
              className="upload-source-action touch-target"
              onClick={onTakePhoto}
            >
              <span className="upload-source-icn">
                <Ic.Camera />
              </span>
              <span className="upload-source-text">
                <span className="upload-source-label">
                  {t("uploadSourcePhoto")}
                </span>
                <span className="upload-source-desc">
                  {t("uploadSourcePhotoDesc")}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="upload-source-action touch-target"
              onClick={onChooseFile}
            >
              <span className="upload-source-icn">
                <Ic.FolderFile />
              </span>
              <span className="upload-source-text">
                <span className="upload-source-label">
                  {t("uploadSourceFile")}
                </span>
                <span className="upload-source-desc">
                  {t("uploadSourceFileDesc")}
                </span>
              </span>
            </button>
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
    </div>
  );
};

// Shared picker: action sheet + the two hidden inputs. Stays mounted while
// the sheet is closed so the native picker can be opened from a ref, and
// resets `value` on every change so re-picking the same file still fires.
const UploadSourcePicker = ({ open, onClose, onFile, returnFocusRef }) => {
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const busyRef = useRef(false);

  const openInput = (ref) => {
    // Guards against a double tap opening two native pickers.
    if (busyRef.current) return;
    busyRef.current = true;
    onClose?.();
    window.setTimeout(() => {
      busyRef.current = false;
      ref.current?.click();
    }, 0);
  };

  const onChange = (e) => {
    const f = e.target.files?.[0] || null;
    e.target.value = "";
    // A dismissed picker usually fires no event at all; if it does, treat it
    // as a no-op — never create an empty attachment or an upload error.
    if (!f) {
      returnFocusRef?.current?.focus?.();
      return;
    }
    onFile?.(f);
  };

  const dismiss = () => {
    onClose?.();
    returnFocusRef?.current?.focus?.();
  };

  return (
    <>
      <UploadSourceSheet
        open={open}
        onClose={dismiss}
        onTakePhoto={() => openInput(photoInputRef)}
        onChooseFile={() => openInput(fileInputRef)}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept={DOC_PHOTO_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={DOC_FILE_ACCEPT}
        className="hidden"
        onChange={onChange}
      />
    </>
  );
};

// Document-type chooser — used by the tour-documents card and the
// mark-performed success screen. Grouped per client feedback: core /
// operational / other. Runs BEFORE the upload-source sheet above.
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
            <div className="category-group-label">{t("tourDocGroupCore")}</div>
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
            <p className="category-picker-desc">{t("tourDocHelperWaiting")}</p>
          </div>

          {/* Group 3: Other Documents */}
          <div>
            <div className="category-group-label">{t("tourDocGroupOther")}</div>
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

// The extension badge is decorative, so the document kind is also exposed as
// text for screen readers — a PDF must never read as just an unnamed icon.
const docKindLabel = (doc, t) => {
  const mime = String(doc?.mimeType || "").toLowerCase();
  const ext = String(doc?.fileName || "")
    .split(".")
    .pop()
    .toLowerCase();
  if (mime === "application/pdf" || ext === "pdf") return t("docKindPdf");
  if (
    /^image\//.test(mime) ||
    ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
  )
    return t("docKindImage");
  return t("docKindFile");
};

// Driver document row (Figma 8:2387): ext badge · name + size ·
// type right-aligned · remove (only while the upload is not yet reviewed).
const MyDocRow = ({ doc, onRemove, t }) => (
  <div className="mydoc-row">
    <FileTypeBadge fileName={doc.fileName} />
    <div className="mydoc-main">
      <div className="mydoc-name" title={doc.fileName}>
        {doc.fileName}
      </div>
      <div className="mydoc-size">
        <span className="sr-only">{docKindLabel(doc, t)} · </span>
        {F().formatFileSize(doc.sizeBytes)}
      </div>
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
        {metaLine ? (
          <span className="tour-doc-row-meta">{metaLine}</span>
        ) : null}
        {statusNode ? (
          <div className="tour-doc-row-status">{statusNode}</div>
        ) : null}
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
  const uploadBtnRef = useRef(null);
  const jobId = job.id;
  const uploadGate = store.canDriverUploadTourDocument(jobId);
  const canUpload = uploadGate.ok;
  const uploads = store.getDriverTourDocumentsForJob(jobId);
  const [categoryModal, setCategoryModal] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [replaceDocId, setReplaceDocId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  // Client requirement (Phase 14): fuel/toll receipts and invoices request
  // structured amount metadata before the upload completes.
  const [amountUpload, setAmountUpload] = useState(null);
  const [amountForm, setAmountForm] = useState(null);
  const [amountErr, setAmountErr] = useState("");

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
    setReplaceDocId(null);
    setPendingType(documentType);
    setCategoryModal(false);
    setSourceOpen(true);
  };

  const emptyAmountForm = (documentType) => ({
    receiptDate: "",
    supplierInvoiceNumber: "",
    supplierInvoiceDate: "",
    servicePeriodFrom: "",
    servicePeriodTo: "",
    netAmount: "",
    grossAmount: "",
    taxRatePercent: "19",
    documentType,
  });

  const finishUpload = (f, documentType, extra = {}) => {
    const r = store.addTourDocument(f, { jobId, documentType, ...extra });
    if (!r.ok) {
      if (r.reason === "amount_math_invalid") {
        setAmountErr(
          t("tourDocAmountMathError", {
            expected:
              r.expectedGross != null ? r.expectedGross.toFixed(2) : "?",
          }),
        );
        return false;
      }
      showUploadError(r.reason);
      return true;
    }
    setFeedback({ tone: "success", message: t("tourDocUploadSuccess") });
    return true;
  };

  const onPick = (f) => {
    if (!f) return;
    if (replaceDocId) {
      const r = store.replaceTourDocument(replaceDocId, f);
      setReplaceDocId(null);
      if (!r.ok) showUploadError(r.reason);
      else setFeedback({ tone: "success", message: t("tourDocUploadSuccess") });
      return;
    }
    if (!pendingType) return;
    if (store.tourDocumentRequiresAmountMetadata(pendingType)) {
      setAmountUpload(f);
      setAmountForm(emptyAmountForm(pendingType));
      setAmountErr("");
      setPendingType(null);
      return;
    }
    finishUpload(f, pendingType);
    setPendingType(null);
  };

  const closeAmountUpload = () => {
    setAmountUpload(null);
    setAmountForm(null);
    setAmountErr("");
  };

  const submitAmountUpload = () => {
    if (!amountUpload || !amountForm) return;
    const isInvoice = amountForm.documentType === "invoice";
    const ok = finishUpload(amountUpload, amountForm.documentType, {
      receiptDate: isInvoice ? "" : amountForm.receiptDate,
      supplierInvoiceNumber: isInvoice ? amountForm.supplierInvoiceNumber : "",
      supplierInvoiceDate: isInvoice ? amountForm.supplierInvoiceDate : "",
      servicePeriodFrom: isInvoice ? amountForm.servicePeriodFrom : "",
      servicePeriodTo: isInvoice ? amountForm.servicePeriodTo : "",
      netAmount: amountForm.netAmount,
      grossAmount: amountForm.grossAmount,
      taxRatePercent: amountForm.taxRatePercent,
    });
    if (ok) closeAmountUpload();
  };

  const startReplace = (docId) => {
    if (!canUpload) {
      showUploadError(uploadGate.reason || "job_not_uploadable");
      return;
    }
    setFeedback(null);
    setPendingType(null);
    setReplaceDocId(docId);
    setCategoryModal(false);
    setSourceOpen(true);
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
          ref={uploadBtnRef}
          type="button"
          className="btn touch-target tour-doc-upload-btn"
          onClick={() => setCategoryModal(true)}
        >
          <Ic.Plus /> {t("tourDocUploadReceiptButton")}
        </button>
      ) : null}
      <UploadSourcePicker
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onFile={onPick}
        returnFocusRef={uploadBtnRef}
      />
      {amountUpload && amountForm ? (
        <div
          role="dialog"
          aria-modal="true"
          className="sheet-backdrop"
          onClick={closeAmountUpload}
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>
              {t("tourDocAmountFormTitle")}
            </h2>
            {amountForm.documentType === "invoice" ? (
              <>
                <div>
                  <label className="field-label" htmlFor="td-inv-num">
                    {t("adminSupplierInvoiceNumberLabel")}
                  </label>
                  <input
                    id="td-inv-num"
                    className="input"
                    value={amountForm.supplierInvoiceNumber}
                    onChange={(e) =>
                      setAmountForm((f) => ({
                        ...f,
                        supplierInvoiceNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="td-inv-date">
                    {t("tourDocInvoiceDate")}
                  </label>
                  <input
                    id="td-inv-date"
                    className="input"
                    placeholder="DD.MM.YYYY"
                    value={amountForm.supplierInvoiceDate}
                    onChange={(e) =>
                      setAmountForm((f) => ({
                        ...f,
                        supplierInvoiceDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <label className="field-label" htmlFor="td-svc-from">
                      {t("tourDocServicePeriodFrom")}
                    </label>
                    <input
                      id="td-svc-from"
                      className="input"
                      placeholder="DD.MM.YYYY"
                      value={amountForm.servicePeriodFrom}
                      onChange={(e) =>
                        setAmountForm((f) => ({
                          ...f,
                          servicePeriodFrom: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="td-svc-to">
                      {t("tourDocServicePeriodTo")}
                    </label>
                    <input
                      id="td-svc-to"
                      className="input"
                      placeholder="DD.MM.YYYY"
                      value={amountForm.servicePeriodTo}
                      onChange={(e) =>
                        setAmountForm((f) => ({
                          ...f,
                          servicePeriodTo: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="field-label" htmlFor="td-receipt-date">
                  {t("tourDocReceiptDate")}
                </label>
                <input
                  id="td-receipt-date"
                  className="input"
                  placeholder="DD.MM.YYYY"
                  value={amountForm.receiptDate}
                  onChange={(e) =>
                    setAmountForm((f) => ({
                      ...f,
                      receiptDate: e.target.value,
                    }))
                  }
                />
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginTop: 10,
              }}
            >
              <div>
                <label className="field-label" htmlFor="td-net">
                  {t("tourDocNetAmount")}
                </label>
                <input
                  id="td-net"
                  className="input mono"
                  inputMode="decimal"
                  value={amountForm.netAmount}
                  onChange={(e) =>
                    setAmountForm((f) => ({ ...f, netAmount: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="td-tax">
                  {t("tourDocTaxRate")}
                </label>
                <input
                  id="td-tax"
                  className="input mono"
                  inputMode="decimal"
                  value={amountForm.taxRatePercent}
                  onChange={(e) =>
                    setAmountForm((f) => ({
                      ...f,
                      taxRatePercent: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="td-gross">
                  {t("tourDocGrossAmount")}
                </label>
                <input
                  id="td-gross"
                  className="input mono"
                  inputMode="decimal"
                  value={amountForm.grossAmount}
                  onChange={(e) =>
                    setAmountForm((f) => ({
                      ...f,
                      grossAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {amountErr ? (
              <p
                style={{
                  color: "var(--danger, #c0392b)",
                  fontSize: 12.5,
                  marginTop: 8,
                }}
              >
                {amountErr}
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 16,
                justifyContent: "flex-end",
              }}
            >
              <button type="button" className="btn" onClick={closeAmountUpload}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={
                  !amountForm.netAmount ||
                  !amountForm.grossAmount ||
                  !amountForm.taxRatePercent
                }
                onClick={submitAmountUpload}
              >
                {t("tourDocAmountFormSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {uploads.length > 0 ? (
        <div className="tour-doc-list">
          {uploads.map((u) => (
            <TourDocumentRow
              key={u.id}
              fileName={u.fileName}
              metaLine={`${displayTourDocType(u.documentType, t)} · ${F().formatFileSize(u.sizeBytes)}`}
              statusNode={
                <Pill
                  status={tourDocReviewPillStatus(u.reviewStatus)}
                  className="no-dot"
                >
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
              onReplace={canReplaceDoc(u) ? () => startReplace(u.id) : null}
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
  const isCancelled = store.isCancelledStatus(job.status);
  const isEmptyRunReported = job.status === "empty_run_reported";
  const isEmptyRunTerminal = store.isEmptyRunTerminal(job.status);
  const canPerform = ["assigned", "accepted"].includes(job.status);
  const inExecution =
    canPerform || isEmptyRunReported || job.status === "assigned";
  // ⚠ action availability (§10): booked orders only; hidden for terminal
  // states and while an empty-run report is pending review.
  const canReportProblem = store.canServicePartnerReport(job);
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
  const [docsSourceOpen, setDocsSourceOpen] = useState(false);
  const docsUploadBtnRef = useRef(null);

  // Client requirement (Phase 14): fuel/toll receipts and invoices request
  // structured amount metadata before the upload completes — same pattern
  // as JobTourDocuments' onPick.
  const [docsAmountUpload, setDocsAmountUpload] = useState(null);
  const [docsAmountForm, setDocsAmountForm] = useState(null);
  const [docsAmountErr, setDocsAmountErr] = useState("");

  const docsPickType = (documentType) => {
    setDocsCategoryOpen(false);
    setDocsPendingType(documentType);
    setDocsSourceOpen(true);
  };
  const docsFinishUpload = (f, documentType, extra = {}) => {
    const r = store.addTourDocument(f, {
      jobId: job.id,
      documentType,
      ...extra,
    });
    if (!r.ok) {
      if (r.reason === "amount_math_invalid") {
        setDocsAmountErr(
          t("tourDocAmountMathError", {
            expected:
              r.expectedGross != null ? r.expectedGross.toFixed(2) : "?",
          }),
        );
        return false;
      }
      setDocsFeedback({
        tone: "error",
        message: tourDocUploadErrorMessage(r.reason, t),
      });
      return true;
    }
    setDocsFeedback({ tone: "success", message: t("tourDocUploadSuccess") });
    return true;
  };
  const docsOnFile = (f) => {
    if (!f || !docsPendingType) return;
    if (store.tourDocumentRequiresAmountMetadata(docsPendingType)) {
      setDocsAmountUpload(f);
      setDocsAmountForm({
        receiptDate: "",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
        servicePeriodFrom: "",
        servicePeriodTo: "",
        netAmount: "",
        grossAmount: "",
        taxRatePercent: "19",
        documentType: docsPendingType,
      });
      setDocsAmountErr("");
      setDocsPendingType(null);
      return;
    }
    docsFinishUpload(f, docsPendingType);
    setDocsPendingType(null);
  };
  const closeDocsAmountUpload = () => {
    setDocsAmountUpload(null);
    setDocsAmountForm(null);
    setDocsAmountErr("");
  };
  const submitDocsAmountUpload = () => {
    if (!docsAmountUpload || !docsAmountForm) return;
    const isInvoice = docsAmountForm.documentType === "invoice";
    const ok = docsFinishUpload(docsAmountUpload, docsAmountForm.documentType, {
      receiptDate: isInvoice ? "" : docsAmountForm.receiptDate,
      supplierInvoiceNumber: isInvoice
        ? docsAmountForm.supplierInvoiceNumber
        : "",
      supplierInvoiceDate: isInvoice ? docsAmountForm.supplierInvoiceDate : "",
      servicePeriodFrom: isInvoice ? docsAmountForm.servicePeriodFrom : "",
      servicePeriodTo: isInvoice ? docsAmountForm.servicePeriodTo : "",
      netAmount: docsAmountForm.netAmount,
      grossAmount: docsAmountForm.grossAmount,
      taxRatePercent: docsAmountForm.taxRatePercent,
    });
    if (ok) closeDocsAmountUpload();
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
              <Pill status={job.status}>
                {AuthStore.statusLabel(job.status)}
              </Pill>
            ) : isEmptyRunTerminal ? (
              <Pill status={job.status}>
                {AuthStore.statusLabel(job.status)}
              </Pill>
            ) : isEmptyRunReported ? (
              <Pill status={job.status}>
                {AuthStore.statusLabel(job.status)}
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
                    {AuthStore.formatLocationSchedule(
                      job.pickup,
                      t("flexible"),
                    )}
                  </div>
                </div>
                <div>
                  <div className="time-label">{t("deliveryTime")}</div>
                  <div className="time-val">
                    {AuthStore.formatLocationSchedule(
                      job.delivery,
                      t("flexible"),
                    )}
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
              {/* Complete order view after booking — full vehicle data. No
              red-plate NUMBER row: the number is brought by the partner and is
              never recorded by AUTHEON. */}
              <div className="detail-kv-list">
                <div className="detail-kv-row">
                  <div className="label">{t("vehicleType")}</div>
                  <div className="value">
                    {displayVehicle(job.vehicleType, t)}
                  </div>
                </div>
                <div className="detail-kv-row">
                  <div className="label">{t("manufacturer")}</div>
                  <div className="value">{job.manufacturer || "—"}</div>
                </div>
                <div className="detail-kv-row">
                  <div className="label">{t("model")}</div>
                  <div className="value">{job.vehicleModel}</div>
                </div>
                {/* Official plate of the transported vehicle — shown whenever known,
                including for a deregistered (de-stamped) vehicle. */}
                {job.plate ? (
                  <div className="detail-kv-row">
                    <div className="label">{t("officialLicencePlate")}</div>
                    <div className="plate-badge">{job.plate}</div>
                  </div>
                ) : null}
                <div className="detail-kv-row">
                  <div className="label">{t("vin")}</div>
                  <div className="value mono text-muted-sm">{job.vin}</div>
                </div>
                <div className="detail-kv-row">
                  <div className="label">{t("transportType")}</div>
                  <div className="value">
                    {displayTransportType(job.transportType, t)}
                  </div>
                </div>
                <div className="detail-kv-row">
                  <div className="label">{t("registrationStatus")}</div>
                  <div className="value">
                    {AuthStore.registrationStatusLabel(
                      job.registrationStatus,
                      t,
                    )}
                  </div>
                </div>
                {vehicleCharacteristicFlags(job, t).length ? (
                  <div className="detail-flag-block">
                    <div className="label">{t("vehicleCharacteristics")}</div>
                    <div className="jobcard-tags">
                      <VehicleFlagTags job={job} characteristicsOnly />
                    </div>
                  </div>
                ) : null}
              </div>
              {/* Derived notice — location 5 of 5: complete order view AFTER
              booking. Stays visible because it is an execution requirement. */}
              <RedPlatesNotice job={job} variant="banner" />
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
              <p
                className="text-muted-sm"
                style={{ lineHeight: 1.6, margin: 0, fontSize: 13 }}
              >
                {displayDriverNote(job.notesDriver, t) || t("noDriverAddons")}
              </p>
              {job.notes ? (
                <>
                  <hr className="detail-card-divider" />
                  <div className="time-label">{t("dispatchNotes")}</div>
                  <p
                    className="text-muted-sm"
                    style={{ lineHeight: 1.6, margin: 0, fontSize: 13 }}
                  >
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
                    {job.distanceKm} km ·{" "}
                    {displayTransportType(job.transportType, t)}
                  </div>
                </div>
                <div className="price-val">
                  € {fmtDriverOffer(job).toFixed(2)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Bar */}
      {/* Empty-run report pending review — locked for the partner (§3.4). */}
      {isEmptyRunReported && (
        <div style={{ padding: "0 16px 12px" }}>
          <InlineAlert tone="info" message={t("emptyRunPendingLock")} />
        </div>
      )}
      {canPerform && (
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
          {canReportProblem && (
            <button
              type="button"
              className="btn outline"
              onClick={onReport}
              aria-label={t("reportProblem")}
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
          )}
        </div>
      )}

      {/* My documents tab: fixed bottom upload bar (Figma 8:2387) */}
      {showDocsTab && (
        <div className="pwa-unlocked-bottom mydocs-upload-bar">
          <button
            ref={docsUploadBtnRef}
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
          <UploadSourcePicker
            open={docsSourceOpen}
            onClose={() => setDocsSourceOpen(false)}
            onFile={docsOnFile}
            returnFocusRef={docsUploadBtnRef}
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
          {docsAmountUpload && docsAmountForm ? (
            <div
              role="dialog"
              aria-modal="true"
              className="sheet-backdrop"
              onClick={closeDocsAmountUpload}
            >
              <div className="sheet" onClick={(e) => e.stopPropagation()}>
                <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>
                  {t("tourDocAmountFormTitle")}
                </h2>
                {docsAmountForm.documentType === "invoice" ? (
                  <>
                    <div>
                      <label className="field-label" htmlFor="mydocs-inv-num">
                        {t("adminSupplierInvoiceNumberLabel")}
                      </label>
                      <input
                        id="mydocs-inv-num"
                        className="input"
                        value={docsAmountForm.supplierInvoiceNumber}
                        onChange={(e) =>
                          setDocsAmountForm((f) => ({
                            ...f,
                            supplierInvoiceNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="mydocs-inv-date">
                        {t("tourDocInvoiceDate")}
                      </label>
                      <input
                        id="mydocs-inv-date"
                        className="input"
                        placeholder="DD.MM.YYYY"
                        value={docsAmountForm.supplierInvoiceDate}
                        onChange={(e) =>
                          setDocsAmountForm((f) => ({
                            ...f,
                            supplierInvoiceDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <div>
                        <label
                          className="field-label"
                          htmlFor="mydocs-svc-from"
                        >
                          {t("tourDocServicePeriodFrom")}
                        </label>
                        <input
                          id="mydocs-svc-from"
                          className="input"
                          placeholder="DD.MM.YYYY"
                          value={docsAmountForm.servicePeriodFrom}
                          onChange={(e) =>
                            setDocsAmountForm((f) => ({
                              ...f,
                              servicePeriodFrom: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="mydocs-svc-to">
                          {t("tourDocServicePeriodTo")}
                        </label>
                        <input
                          id="mydocs-svc-to"
                          className="input"
                          placeholder="DD.MM.YYYY"
                          value={docsAmountForm.servicePeriodTo}
                          onChange={(e) =>
                            setDocsAmountForm((f) => ({
                              ...f,
                              servicePeriodTo: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label
                      className="field-label"
                      htmlFor="mydocs-receipt-date"
                    >
                      {t("tourDocReceiptDate")}
                    </label>
                    <input
                      id="mydocs-receipt-date"
                      className="input"
                      placeholder="DD.MM.YYYY"
                      value={docsAmountForm.receiptDate}
                      onChange={(e) =>
                        setDocsAmountForm((f) => ({
                          ...f,
                          receiptDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <div>
                    <label className="field-label" htmlFor="mydocs-net">
                      {t("tourDocNetAmount")}
                    </label>
                    <input
                      id="mydocs-net"
                      className="input mono"
                      inputMode="decimal"
                      value={docsAmountForm.netAmount}
                      onChange={(e) =>
                        setDocsAmountForm((f) => ({
                          ...f,
                          netAmount: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="mydocs-tax">
                      {t("tourDocTaxRate")}
                    </label>
                    <input
                      id="mydocs-tax"
                      className="input mono"
                      inputMode="decimal"
                      value={docsAmountForm.taxRatePercent}
                      onChange={(e) =>
                        setDocsAmountForm((f) => ({
                          ...f,
                          taxRatePercent: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="mydocs-gross">
                      {t("tourDocGrossAmount")}
                    </label>
                    <input
                      id="mydocs-gross"
                      className="input mono"
                      inputMode="decimal"
                      value={docsAmountForm.grossAmount}
                      onChange={(e) =>
                        setDocsAmountForm((f) => ({
                          ...f,
                          grossAmount: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                {docsAmountErr ? (
                  <p
                    style={{
                      color: "var(--danger, #c0392b)",
                      fontSize: 12.5,
                      marginTop: 8,
                    }}
                  >
                    {docsAmountErr}
                  </p>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 16,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={closeDocsAmountUpload}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={
                      !docsAmountForm.netAmount ||
                      !docsAmountForm.grossAmount ||
                      !docsAmountForm.taxRatePercent
                    }
                    onClick={submitDocsAmountUpload}
                  >
                    {t("tourDocAmountFormSubmit")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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
const MyJobs = ({ onOpen, onOpenNotifications, notificationsOpen = false }) => {
  const { t } = useI18n();
  const [tab, setTab] = useState("active");
  const TAB_IDS = ["active", "performed", "cancelled", "review"];
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const store = useAuthStore();

  const mine = store.getJobs().filter((j) => store.isMineJob(j));
  const active = mine.filter((j) =>
    ["assigned", "accepted"].includes(j.status),
  );
  const performed = mine.filter((j) => j.status === "performed");
  // Cancelled bucket = generic + service-partner + Autheon cancellations, and
  // (as a terminal outcome) a not-recognised empty run belongs in history too.
  const cancelled = mine.filter(
    (j) =>
      store.isCancelledStatus(j.status) || store.isEmptyRunTerminal(j.status),
  );
  // Review bucket = empty-run reports pending Autheon review.
  const review = mine.filter((j) => j.status === "empty_run_reported");

  const listFor = (tabId) =>
    tabId === "active"
      ? active
      : tabId === "performed"
        ? performed
        : tabId === "cancelled"
          ? cancelled
          : review;

  const buildList = (tabId) =>
    listFor(tabId)
      .filter((job) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          job.tour.toString().includes(q) ||
          (job.customer || "").toLowerCase().includes(q) ||
          (job.customerName || "").toLowerCase().includes(q) ||
          (job.manufacturer || "").toLowerCase().includes(q) ||
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
                description: t("emptyRunReviewTab"),
              };

  const renderJobCard = (job, enterIndex) => {
    const enterStyle =
      typeof enterIndex === "number" && enterIndex >= 0 && enterIndex < 4
        ? { ["--list-enter-i"]: enterIndex }
        : undefined;
    const enterClass =
      typeof enterIndex === "number" && enterIndex >= 0 && enterIndex < 4
        ? " list-enter"
        : "";
    return (
      <button
        key={job.id}
        type="button"
        className={"jobcard-btn" + enterClass}
        style={enterStyle}
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
            {(job.status === "empty_run_reported" ||
              store.isEmptyRunTerminal(job.status)) && (
              <span className={"pill " + AuthStore.statusCls(job.status)}>
                {AuthStore.statusLabel(job.status)}
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
            {store.isCancelledStatus(job.status) && (
              <span className="pill cancelled">
                {AuthStore.statusLabel(job.status)}
              </span>
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
  };

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
        {jobs.map((job, index) => renderJobCard(job, index))}
        {jobs.length > 0 ? (
          <div className="list-end">— {t("endOfList")} —</div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <DriverScreenHeader
        title={t("myJobs")}
        subtitle={t("myJobsSubtitle")}
        onOpenNotifications={onOpenNotifications}
        notificationsOpen={notificationsOpen}
      />

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
          ["review", t("emptyRunReviewTab"), review.length],
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
// ⚠ Service-partner entry (Storno-Workflow §1): a single sheet whose two
// options start SEPARATE flows — Cancel order (immediate, slide-to-confirm)
// and Report empty run (submitted for Autheon review). Both require a reason
// and a ≥30-character explanation and confirm via slide-to-confirm so the
// final action can't be triggered accidentally.
const ReportProblemSheet = ({ job, onClose, onSubmit }) => {
  const { t } = useI18n();
  const [path, setPath] = useState(null); // 'cancel' | 'not_performable'
  const [cancelStep, setCancelStep] = useState("warn"); // 'warn' | 'form'
  const [termsOpen, setTermsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceNotice, setEvidenceNotice] = useState(null);
  const [slidePos, setSlidePos] = useState(0);
  const [slideDone, setSlideDone] = useState(false);
  const [slideDragging, setSlideDragging] = useState(false);
  const trackRef = useRef(null);
  const evidenceInputRef = useRef(null);
  const MIN = 30;
  const valid = text.trim().length >= MIN;

  const cancelReasons = [
    ["appointment_not_kept", t("spCancelReasonAppointment")],
    ["booked_accidentally", t("spCancelReasonAccidental")],
    ["org_not_possible", t("spCancelReasonOrgImpossible")],
    ["other", t("spCancelReasonOther")],
  ];
  const emptyRunReasons = [
    ["not_operational", t("emptyRunReasonNotOperational")],
    ["not_roadworthy", t("emptyRunReasonNotRoadworthy")],
    ["not_present", t("emptyRunReasonNotPresent")],
    ["not_released", t("emptyRunReasonNotReleased")],
    ["key_docs_missing", t("emptyRunReasonKeyDocs")],
    ["other", t("emptyRunReasonOther")],
  ];
  const isCancel = path === "cancel";
  const reasonList = isCancel ? cancelReasons : emptyRunReasons;
  const reasonLabel = isCancel
    ? t("spCancelReasonLabel")
    : t("emptyRunReasonLabel");
  const explLabel = isCancel
    ? t("spCancelExplanationLabel")
    : t("emptyRunDescLabel");
  const explPlaceholder = isCancel
    ? t("spCancelExplanationPlaceholder")
    : t("emptyRunDescPlaceholder");
  const slideLabel = isCancel ? t("spCancelSlide") : t("emptyRunSlide");
  const slideDoneLabel = isCancel
    ? t("spCancelSlideDone")
    : t("emptyRunSlideDone");
  const slideLockedLabel = isCancel
    ? t("spCancelSlideLocked")
    : t("emptyRunSlideLocked");

  // Latest submit closure for the slide gesture (evidence only for empty run).
  const submitRef = useRef(() => {});
  submitRef.current = () =>
    onSubmit(path, reason, text.trim(), isCancel ? [] : evidenceFiles);

  const slideEnabled = valid && !slideDone;

  const choosePath = (id) => {
    setPath(id);
    setReason(id === "cancel" ? "appointment_not_kept" : "not_operational");
    setText("");
    setEvidenceFiles([]);
    setEvidenceNotice(null);
    setSlidePos(0);
    setSlideDone(false);
    setCancelStep("warn");
    setTermsOpen(false);
  };
  const backToEntry = () => {
    setPath(null);
    setEvidenceFiles([]);
    setSlidePos(0);
    setSlideDone(false);
    setTermsOpen(false);
  };

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
        setTimeout(() => submitRef.current(), 380);
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

  // Which UI to show: entry → (cancel: warn → form) | (empty run: form).
  const showCancelWarn = isCancel && cancelStep === "warn";
  const showForm = path && !showCancelWarn;

  const slideBlock = (
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
          {slideDone ? slideDoneLabel : valid ? slideLabel : slideLockedLabel}
        </div>
        <div className="slide-fill" style={{ width: valid ? slidePos : 0 }} />
        <div
          className="track-text track-text-fill"
          style={{
            clipPath: `inset(0 calc(100% - ${valid ? slidePos : 0}px) 0 0)`,
          }}
        >
          {slideDone ? slideDoneLabel : valid ? slideLabel : slideLockedLabel}
        </div>
        <div
          className="thumb"
          style={{ transform: `translateX(${valid ? slidePos : 0}px)` }}
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
    </div>
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <SheetGrabber onClose={onClose} />
        <div className="sheet-head">
          <h2 className="sheet-head-warn">
            <span className="sheet-head-warn-icon">
              <Ic.Alert />
            </span>
            {t("reportProblem")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn icon sm"
            aria-label={t("dismiss")}
          >
            <Ic.X />
          </button>
        </div>
        <div className="sheet-body">
          {!path ? (
            <div className="flex-col-gap-10">
              {[
                ["cancel", t("warnEntryCancelOption"), t("warnEntryCancelSub")],
                [
                  "not_performable",
                  t("warnEntryEmptyRunOption"),
                  t("warnEntryEmptyRunSub"),
                ],
              ].map(([id, label, sub]) => (
                <button
                  key={id}
                  type="button"
                  className="radio-card"
                  onClick={() => choosePath(id)}
                >
                  <span className="ring"></span>
                  <div>
                    <div className="t">{label}</div>
                    <div className="s">{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : showCancelWarn ? (
            <>
              <button
                type="button"
                className="btn ghost xs"
                style={{ marginBottom: 12, padding: 0 }}
                onClick={backToEntry}
              >
                {t("back")}
              </button>
              <div
                role="alert"
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(234, 179, 8, 0.45)",
                  background: "rgba(234, 179, 8, 0.1)",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                }}
              >
                <p style={{ margin: 0 }}>{t("spCancelBindingWarning")}</p>
                <p style={{ margin: "10px 0 0" }}>
                  <button
                    type="button"
                    className="btn ghost xs"
                    style={{
                      color: "var(--primary)",
                      padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                    aria-expanded={termsOpen}
                    onClick={() => setTermsOpen((v) => !v)}
                  >
                    {t("spCancelTermsLink")}
                  </button>
                </p>
                {termsOpen ? (
                  <div className="stack-8">
                    <InlineAlert
                      tone="info"
                      message={t("spCancelTermsPlaceholderNotice")}
                      onDismiss={() => setTermsOpen(false)}
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn ghost xs"
                style={{ marginBottom: 12, padding: 0 }}
                onClick={isCancel ? () => setCancelStep("warn") : backToEntry}
              >
                {t("back")}
              </button>
              <div className="field-label">{reasonLabel}</div>
              <div className="flex-col-gap-10" style={{ marginBottom: 18 }}>
                {reasonList.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={"radio-card " + (reason === id ? "on" : "")}
                    onClick={() => setReason(id)}
                  >
                    <span className="ring"></span>
                    <div>
                      <div className="t">{label}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="field-label">{explLabel}</div>
              <textarea
                className="input"
                placeholder={explPlaceholder}
                value={text}
                onChange={(e) => {
                  const next = e.target.value;
                  setText(next);
                  if (next.trim().length < MIN) {
                    setSlidePos(0);
                    setSlideDone(false);
                  }
                }}
              />
              <div className="label" style={{ marginTop: 6 }}>
                <span
                  className={"slide-char-count " + (valid ? "ok" : "need-more")}
                >
                  {text.trim().length}
                </span>{" "}
                {t("chars30Required")}
              </div>
              {!isCancel ? (
                <div className="mt-16">
                  <div className="field-label">
                    {t("emptyRunEvidenceLabel")}
                  </div>
                  <p
                    className="req-panel-desc"
                    style={{ margin: "6px 0 10px" }}
                  >
                    {t("emptyRunEvidenceHint")}
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
                          <span className="pdf-name">{f.name}</span>
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
                  <div
                    role="alert"
                    style={{
                      marginTop: 16,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border:
                        "1px solid color-mix(in srgb, var(--st-warn) 45%, transparent)",
                      background:
                        "color-mix(in srgb, var(--st-warn) 10%, transparent)",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                    }}
                  >
                    {t("emptyRunWarning")}
                  </div>
                </div>
              ) : null}
              {slideBlock}
            </>
          )}
        </div>
        {showCancelWarn ? (
          <div className="sheet-foot">
            <button type="button" className="btn" onClick={onClose}>
              {t("spCancelAbort")}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => setCancelStep("form")}
            >
              {t("spCancelContinue")}
            </button>
          </div>
        ) : showForm ? (
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
          {isCancel ? t("spCancelSuccessTitle") : t("emptyRunSuccessTitle")}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: "var(--muted)",
            lineHeight: 1.55,
          }}
        >
          {isCancel ? t("spCancelSuccessBody") : t("emptyRunSuccessBody")}
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

// Confirmation popup shown after a tour is booked (binding acceptance).
// Mirrors the "Tour performed successfully" popup: a green check, a title,
// a short body, and an OK button that dismisses back to the tour.
const TourBookedSuccessSheet = ({ onClose }) => {
  const { t } = useI18n();
  return (
    <div className="sheet-backdrop center" onClick={onClose}>
      <div
        className="sheet modal"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 26, textAlign: "center", maxWidth: 320 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-booked-success-title"
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
        <h3
          id="tour-booked-success-title"
          style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 600 }}
        >
          {t("tourBookedSuccessTitle")}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: "var(--muted)",
            lineHeight: 1.55,
          }}
        >
          {t("tourBookedSuccessBody")}
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
  const [sourceOpen, setSourceOpen] = useState(false);
  const dropzoneRef = useRef(null);
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
    setSourceOpen(true);
  };

  // Client requirement (Phase 14): fuel/toll receipts and invoices request
  // structured amount metadata before the upload completes — same pattern
  // as JobTourDocuments' onPick.
  const [successAmountUpload, setSuccessAmountUpload] = useState(null);
  const [successAmountForm, setSuccessAmountForm] = useState(null);
  const [successAmountErr, setSuccessAmountErr] = useState("");

  const successFinishUpload = (f, documentType, extra = {}) => {
    const r = store.addTourDocument(f, {
      jobId: job.id,
      documentType,
      ...extra,
    });
    if (!r.ok) {
      if (r.reason === "amount_math_invalid") {
        setSuccessAmountErr(
          t("tourDocAmountMathError", {
            expected:
              r.expectedGross != null ? r.expectedGross.toFixed(2) : "?",
          }),
        );
        return false;
      }
      setUploadFeedback({
        tone: "error",
        message: tourDocUploadErrorMessage(r.reason, t),
      });
      return true;
    }
    setUploadFeedback({ tone: "success", message: t("tourDocUploadSuccess") });
    return true;
  };

  const onPickFile = (f) => {
    if (!f || !pendingType) return;
    if (store.tourDocumentRequiresAmountMetadata(pendingType)) {
      setSuccessAmountUpload(f);
      setSuccessAmountForm({
        receiptDate: "",
        supplierInvoiceNumber: "",
        supplierInvoiceDate: "",
        servicePeriodFrom: "",
        servicePeriodTo: "",
        netAmount: "",
        grossAmount: "",
        taxRatePercent: "19",
        documentType: pendingType,
      });
      setSuccessAmountErr("");
      setPendingType(null);
      return;
    }
    successFinishUpload(f, pendingType);
    setPendingType(null);
  };
  const closeSuccessAmountUpload = () => {
    setSuccessAmountUpload(null);
    setSuccessAmountForm(null);
    setSuccessAmountErr("");
  };
  const submitSuccessAmountUpload = () => {
    if (!successAmountUpload || !successAmountForm) return;
    const isInvoice = successAmountForm.documentType === "invoice";
    const ok = successFinishUpload(
      successAmountUpload,
      successAmountForm.documentType,
      {
        receiptDate: isInvoice ? "" : successAmountForm.receiptDate,
        supplierInvoiceNumber: isInvoice
          ? successAmountForm.supplierInvoiceNumber
          : "",
        supplierInvoiceDate: isInvoice
          ? successAmountForm.supplierInvoiceDate
          : "",
        servicePeriodFrom: isInvoice ? successAmountForm.servicePeriodFrom : "",
        servicePeriodTo: isInvoice ? successAmountForm.servicePeriodTo : "",
        netAmount: successAmountForm.netAmount,
        grossAmount: successAmountForm.grossAmount,
        taxRatePercent: successAmountForm.taxRatePercent,
      },
    );
    if (ok) closeSuccessAmountUpload();
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
                stroke="currentColor"
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
            ref={dropzoneRef}
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
        <UploadSourcePicker
          open={sourceOpen}
          onClose={() => setSourceOpen(false)}
          onFile={onPickFile}
          returnFocusRef={dropzoneRef}
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
        {successAmountUpload && successAmountForm ? (
          <div
            role="dialog"
            aria-modal="true"
            className="sheet-backdrop"
            onClick={closeSuccessAmountUpload}
          >
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>
                {t("tourDocAmountFormTitle")}
              </h2>
              {successAmountForm.documentType === "invoice" ? (
                <>
                  <div>
                    <label className="field-label" htmlFor="success-inv-num">
                      {t("adminSupplierInvoiceNumberLabel")}
                    </label>
                    <input
                      id="success-inv-num"
                      className="input"
                      value={successAmountForm.supplierInvoiceNumber}
                      onChange={(e) =>
                        setSuccessAmountForm((f) => ({
                          ...f,
                          supplierInvoiceNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="success-inv-date">
                      {t("tourDocInvoiceDate")}
                    </label>
                    <input
                      id="success-inv-date"
                      className="input"
                      placeholder="DD.MM.YYYY"
                      value={successAmountForm.supplierInvoiceDate}
                      onChange={(e) =>
                        setSuccessAmountForm((f) => ({
                          ...f,
                          supplierInvoiceDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label className="field-label" htmlFor="success-svc-from">
                        {t("tourDocServicePeriodFrom")}
                      </label>
                      <input
                        id="success-svc-from"
                        className="input"
                        placeholder="DD.MM.YYYY"
                        value={successAmountForm.servicePeriodFrom}
                        onChange={(e) =>
                          setSuccessAmountForm((f) => ({
                            ...f,
                            servicePeriodFrom: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="success-svc-to">
                        {t("tourDocServicePeriodTo")}
                      </label>
                      <input
                        id="success-svc-to"
                        className="input"
                        placeholder="DD.MM.YYYY"
                        value={successAmountForm.servicePeriodTo}
                        onChange={(e) =>
                          setSuccessAmountForm((f) => ({
                            ...f,
                            servicePeriodTo: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="field-label" htmlFor="success-receipt-date">
                    {t("tourDocReceiptDate")}
                  </label>
                  <input
                    id="success-receipt-date"
                    className="input"
                    placeholder="DD.MM.YYYY"
                    value={successAmountForm.receiptDate}
                    onChange={(e) =>
                      setSuccessAmountForm((f) => ({
                        ...f,
                        receiptDate: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <div>
                  <label className="field-label" htmlFor="success-net">
                    {t("tourDocNetAmount")}
                  </label>
                  <input
                    id="success-net"
                    className="input mono"
                    inputMode="decimal"
                    value={successAmountForm.netAmount}
                    onChange={(e) =>
                      setSuccessAmountForm((f) => ({
                        ...f,
                        netAmount: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="success-tax">
                    {t("tourDocTaxRate")}
                  </label>
                  <input
                    id="success-tax"
                    className="input mono"
                    inputMode="decimal"
                    value={successAmountForm.taxRatePercent}
                    onChange={(e) =>
                      setSuccessAmountForm((f) => ({
                        ...f,
                        taxRatePercent: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="success-gross">
                    {t("tourDocGrossAmount")}
                  </label>
                  <input
                    id="success-gross"
                    className="input mono"
                    inputMode="decimal"
                    value={successAmountForm.grossAmount}
                    onChange={(e) =>
                      setSuccessAmountForm((f) => ({
                        ...f,
                        grossAmount: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              {successAmountErr ? (
                <p
                  style={{
                    color: "var(--danger, #c0392b)",
                    fontSize: 12.5,
                    marginTop: 8,
                  }}
                >
                  {successAmountErr}
                </p>
              ) : null}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={closeSuccessAmountUpload}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={
                    !successAmountForm.netAmount ||
                    !successAmountForm.grossAmount ||
                    !successAmountForm.taxRatePercent
                  }
                  onClick={submitSuccessAmountUpload}
                >
                  {t("tourDocAmountFormSubmit")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
          <div className="text-strong-lg">{AuthStore.DEMO_DRIVER}</div>
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
      ].map(([label, sub], index) => (
        <div
          key={label}
          className={index < 4 ? "list-enter" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 0",
            borderBottom: "1px solid var(--line)",
            cursor: "pointer",
            ...(index < 4 ? { ["--list-enter-i"]: index } : null),
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
            {dayRows.map((row, rowIndex) => {
              const flatIndex =
                grouped
                  .slice(
                    0,
                    grouped.findIndex(([d]) => d === day),
                  )
                  .reduce((n, [, rows]) => n + rows.length, 0) + rowIndex;
              const enterClass = flatIndex < 4 ? " list-enter" : "";
              const enterStyle =
                flatIndex < 4 ? { ["--list-enter-i"]: flatIndex } : undefined;
              const actionable = isActionable(row);
              const content = (
                <>
                  {!row.read ? (
                    <span className="notification-row-dot" aria-hidden="true" />
                  ) : (
                    <span
                      className="notification-row-dot-spacer"
                      aria-hidden="true"
                    />
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
                <li
                  key={row.id}
                  className={enterClass.trim() || undefined}
                  style={enterStyle}
                >
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

const DriverNotificationsPane = ({
  onClose,
  onBack,
  onOpenJob,
  onOpenInfopoint,
}) => {
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
                <span className="notifications-mark-all-label">
                  {t("markAllRead")}
                </span>
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

// Email intentionally excluded — it is the driver's own sign-in credential
// and is managed self-serve in the Account & sign-in card, not through the
// ops-approval master-data flow.
const PROFILE_MDR_FIELDS = [
  { key: "company", required: true },
  { key: "address" },
  { key: "phone" },
];

const emptyMasterDataChangeForm = (driver) => ({
  company: driver?.company || "",
  address: driver?.address || "",
  phone: driver?.phone || "",
});

const fieldChanged = (before, after) =>
  String(before || "").trim() !== String(after || "").trim();

const formatCalendarDayLabel = (dayKey) => {
  const m = String(dayKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : dayKey || "—";
};

// 6-digit confirmation-code entry (auto-advance + paste support).
const CODE_LEN = 6;
const CodeInput = ({ value, onChange, disabled }) => {
  const { t } = useI18n();
  const refs = useRef([]);
  const digits = String(value || "")
    .padEnd(CODE_LEN, " ")
    .slice(0, CODE_LEN)
    .split("")
    .map((c) => (c === " " ? "" : c));

  const setDigit = (idx, ch) => {
    const clean = ch.replace(/\D/g, "");
    const next = digits.slice();
    if (clean.length > 1) {
      // paste / multiple chars: fill forward from idx
      for (let i = 0; i < clean.length && idx + i < CODE_LEN; i++) {
        next[idx + i] = clean[i];
      }
      onChange(next.join("").trim());
      const landing = Math.min(idx + clean.length, CODE_LEN - 1);
      refs.current[landing]?.focus();
      return;
    }
    next[idx] = clean;
    onChange(next.join(""));
    if (clean && idx < CODE_LEN - 1) refs.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <div
      className="code-input-row"
      role="group"
      aria-label={t("changeEmailCodeGroupLabel")}
    >
      {Array.from({ length: CODE_LEN }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="code-input-box"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={digits[i]}
          aria-label={t("changeEmailDigitLabel", { n: i + 1 })}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
};

// Self-serve email change — centered modal (same Sheet grammar as ConfirmSheet)
// advancing enter-new-address → confirm-with-code → updated. The address only
// becomes active after the code sent to the NEW inbox is confirmed; the old
// inbox stays live until then and is notified on success. No ops approval.
const ChangeEmailSheet = ({ open, onClose, currentEmail }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [step, setStep] = useState("enter"); // enter | code | done
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [resendLeft, setResendLeft] = useState(0);

  // Open: resume a pending change at the code step so the driver cannot
  // silently start a second flow over an in-flight verification.
  useEffect(() => {
    if (!open) return;
    const pending = store.getDriverEmailChange()?.pending;
    setCode("");
    setError("");
    setConfirmedEmail("");
    if (pending?.newEmail) {
      setStep("code");
      setNewEmail(pending.newEmail);
      setDemoCode(pending.code || "");
      const elapsed = Date.now() - (pending.sentAt || 0);
      setResendLeft(
        Math.max(0, Math.ceil((store.EMAIL_CODE_RESEND_MS - elapsed) / 1000)),
      );
      return;
    }
    setStep("enter");
    setNewEmail("");
    setDemoCode("");
    setResendLeft(0);
  }, [open, store]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendLeft <= 0) return undefined;
    const id = setInterval(
      () => setResendLeft((s) => (s > 0 ? s - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [resendLeft]);

  const errKey = {
    invalid_email: "changeEmailErrInvalid",
    same_email: "changeEmailErrSame",
    duplicate_email: "changeEmailErrDuplicate",
    invalid_code: "changeEmailErrCodeInvalid",
    expired: "changeEmailErrCodeExpired",
    restricted: "changeEmailErrRestricted",
  };
  const mapErr = (reason) => t(errKey[reason] || "changeEmailErrGeneric");

  const close = () => {
    if (step !== "done") store.cancelDriverEmailChange();
    onClose();
  };

  const sendCode = () => {
    const r = store.startDriverEmailChange(newEmail);
    if (!r.ok) {
      setError(mapErr(r.reason));
      return;
    }
    setError("");
    setCode("");
    setDemoCode(r.code);
    setResendLeft(30);
    setStep("code");
  };

  const resend = () => {
    if (resendLeft > 0) return;
    const r = store.resendDriverEmailCode();
    if (!r.ok) {
      setError(mapErr(r.reason));
      return;
    }
    setError("");
    setCode("");
    setDemoCode(r.code);
    setResendLeft(30);
  };

  const confirm = () => {
    const r = store.confirmDriverEmailChange(code);
    if (!r.ok) {
      setError(mapErr(r.reason));
      return;
    }
    setConfirmedEmail(r.email);
    setError("");
    setStep("done");
  };

  const mmss = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  let title = t("changeEmailTitle");
  let body = null;
  let footer = null;

  if (step === "enter") {
    body = (
      <div
        className="stack-4"
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <p className="section-hint" style={{ margin: 0 }}>
          {t("accountSigninHint")}
        </p>
        <div className="change-email-current">
          {t("changeEmailCurrentPrefix")} ·{" "}
          <span className="mono">{currentEmail}</span>
        </div>
        <div>
          <label className="field-label" htmlFor="change-email-new">
            {t("changeEmailNewLabel")}
          </label>
          <input
            id="change-email-new"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("changeEmailNewPlaceholder")}
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              if (error) setError("");
            }}
          />
        </div>
        <p className="section-hint" style={{ margin: 0 }}>
          {t("changeEmailCodeNotice")}
        </p>
        {error ? <InlineAlert tone="error" message={error} /> : null}
      </div>
    );
    footer = (
      <>
        <button type="button" className="btn ghost" onClick={close}>
          {t("cancel")}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!newEmail.trim()}
          onClick={sendCode}
        >
          {t("changeEmailSendCode")}
        </button>
      </>
    );
  } else if (step === "code") {
    title = t("changeEmailCodeTitle");
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="change-email-current">
          {t("changeEmailCodeSentTo", { email: newEmail })}
        </div>
        <CodeInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError("");
          }}
        />
        <div className="change-email-aux-row">
          {resendLeft > 0 ? (
            <span className="section-hint change-email-resend-wait">
              {t("changeEmailResendIn", { time: mmss(resendLeft) })}
            </span>
          ) : (
            <button
              type="button"
              className="change-email-text-link"
              onClick={resend}
            >
              {t("changeEmailResend")}
            </button>
          )}
          <button
            type="button"
            className="change-email-text-link"
            onClick={() => {
              setStep("enter");
              setError("");
            }}
          >
            {t("changeEmailBack")}
          </button>
        </div>
        {demoCode ? (
          <InlineAlert
            tone="info"
            message={t("changeEmailDemoHint", { code: demoCode })}
          />
        ) : null}
        {error ? <InlineAlert tone="error" message={error} /> : null}
      </div>
    );
    footer = (
      <>
        <button type="button" className="btn ghost" onClick={close}>
          {t("cancel")}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={code.replace(/\D/g, "").length !== CODE_LEN}
          onClick={confirm}
        >
          {t("changeEmailConfirm")}
        </button>
      </>
    );
  } else {
    title = t("changeEmailSuccessTitle");
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <span className="change-email-success-check" aria-hidden="true">
          ✓
        </span>
        <p style={{ margin: 0 }}>
          {t("changeEmailSuccessBody", { email: confirmedEmail })}
        </p>
      </div>
    );
    footer = (
      <button type="button" className="btn primary block" onClick={onClose}>
        {t("changeEmailDone")}
      </button>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      footer={footer}
      centered
      className="change-email-sheet"
    >
      {body}
    </Sheet>
  );
};

const DriverProbationCard = ({ enterIndex }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const summary = store.getDriverProbationSummary();
  if (!summary || !summary.onProbation) return null;
  const pct = summary.limit
    ? Math.min(100, Math.round((summary.performedCount / summary.limit) * 100))
    : 0;
  const enter =
    typeof enterIndex === "number" && enterIndex >= 0 && enterIndex < 4;

  return (
    <div
      className={
        "section-card daily-limit-card probation-card" +
        (enter ? " list-enter" : "")
      }
      style={enter ? { ["--list-enter-i"]: enterIndex } : undefined}
    >
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
        <div
          className="limit-meter-meta stack-8 text-caption"
          aria-hidden="true"
        >
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
        className="sheet modal confirm-sheet confirm-sheet-panel"
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
  const canvas = getComputedStyle(document.documentElement)
    .getPropertyValue("--brand-canvas")
    .trim();
  if (canvas) {
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute("content", canvas);
      meta.removeAttribute("media");
    });
  }
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

// Global theme store — mirrors the useI18n subscription shape so the admin
// Settings "Appearance" row and the prototype demo shell chrome drive the
// SAME theme state in both directions. applyAppTheme() remains the single DOM
// writer (data-theme + localStorage + meta); this store layers notification
// on top so every subscriber (chrome App, admin SettingsPane) re-renders when
// any one of them changes the theme. The PWA ProfilePaneFull keeps its own
// isPwaSurface-gated applyAppTheme call and does not subscribe here.
const THEME_LISTENERS = new Set();
const notifyTheme = (next) => THEME_LISTENERS.forEach((fn) => fn(next));
const subscribeTheme = (fn) => {
  THEME_LISTENERS.add(fn);
  return () => THEME_LISTENERS.delete(fn);
};
function setThemeGlobal(next) {
  if (next !== "light" && next !== "dark") return;
  applyAppTheme(next);
  notifyTheme(next);
}
function useTheme() {
  // Match the chrome's pre-existing default (light when nothing stored) so
  // the shell's first paint and button highlight are unchanged.
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return stored === "dark" || stored === "light" ? stored : "light";
    } catch (_) {
      return "light";
    }
  });
  useEffect(() => subscribeTheme((next) => setTheme(next)), []);
  return { theme, setTheme: setThemeGlobal };
}
window.AutheonTheme = { subscribe: subscribeTheme, useTheme };

// Full-row navigation entry: left icon, label (+ optional supporting text),
// trailing chevron. The whole row is a single accessible button.
const ProfileNavRow = ({
  icon: Icon,
  label,
  sub,
  onClick,
  rowId,
  enterIndex,
}) => {
  const enter =
    typeof enterIndex === "number" && enterIndex >= 0 && enterIndex < 4;
  return (
    <button
      type="button"
      className={"profile-nav-row" + (enter ? " list-enter" : "")}
      style={enter ? { ["--list-enter-i"]: enterIndex } : undefined}
      onClick={onClick}
      data-profile-row={rowId}
    >
      <span className="profile-nav-row-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="profile-nav-row-text">
        <span className="profile-nav-row-label">{label}</span>
        {sub ? <span className="profile-nav-row-sub">{sub}</span> : null}
      </span>
      <span className="profile-nav-row-chevron" aria-hidden="true">
        <Ic.Chev />
      </span>
    </button>
  );
};

// Feedback and error reports intentionally contain only the encoded recipient
// and subject. The native mailto link opens the user's configured email client;
// no body, CC, BCC, attachment, or other query parameter is generated.
const buildProfileMailtoHref = (recipient, subject) =>
  `mailto:${encodeURIComponent(String(recipient || "").trim())}?subject=${encodeURIComponent(
    String(subject || "").trim(),
  )}`;

const openProfileMailto = (event, recipient, subject) => {
  event.preventDefault();
  window.location.href = buildProfileMailtoHref(recipient, subject);
};

const ProfileMailtoRow = ({ icon: Icon, label, recipient, subject, rowId }) => (
  <a
    className="profile-nav-row profile-mailto-row"
    href={buildProfileMailtoHref(recipient, subject)}
    onClick={(event) => openProfileMailto(event, recipient, subject)}
    data-profile-row={rowId}
  >
    <span className="profile-nav-row-icon" aria-hidden="true">
      <Icon />
    </span>
    <span className="profile-nav-row-text">
      <span className="profile-nav-row-label">{label}</span>
      <span className="profile-nav-row-sub">{recipient}</span>
    </span>
    <span className="profile-mailto-row-action" aria-hidden="true">
      <Ic.Mail />
    </span>
  </a>
);

// Labelled group of navigation rows (KONTO / EINSTELLUNGEN / HILFE).
const ProfileGroup = ({ label, children, enterIndex }) => {
  const enter =
    typeof enterIndex === "number" && enterIndex >= 0 && enterIndex < 4;
  return (
    <section
      className={"profile-group" + (enter ? " list-enter" : "")}
      style={enter ? { ["--list-enter-i"]: enterIndex } : undefined}
    >
      <h2 className="profile-group-label">{label}</h2>
      <div className="section-card profile-nav-card">{children}</div>
    </section>
  );
};

// In-page back header for a drill-down subpage (mirrors pwa-detail-header).
// The heading takes focus on entry (tabIndex -1) so a state-based drill-down
// announces the new view instead of leaving focus stranded on <body>.
const ProfileSubpageHeader = ({ title, backLabel, onBack, titleRef }) => (
  <div className="pwa-detail-header profile-subpage-header">
    <button
      type="button"
      className="detail-back-btn"
      onClick={onBack}
      aria-label={backLabel}
    >
      <Ic.Back />
    </button>
    <h1 className="detail-header-title" ref={titleRef} tabIndex={-1}>
      {title}
    </h1>
    <div className="w-40-spacer" />
  </div>
);

const ProfilePaneFull = ({
  onOpenNotifications,
  notificationsOpen = false,
}) => {
  const { t, locale, setLocale } = useI18n();
  const store = useAuthStore();
  const d = store.getCurrentDriver();
  const support = store.getDriverSupportContact();
  const partnerId = d?.driverCode || "";
  const feedbackSubject = t("profileFeedbackMailSubject", { partnerId });
  const reportErrorSubject = t("profileReportErrorMailSubject", {
    partnerId,
  });
  const prefs = d?.prefs || {};
  const setPref = (patch) => store.updateDriverPrefs(patch);
  const [editingProfile, setEditingProfile] = useState(false);
  const [postalText, setPostalText] = useState("");
  const [theme, setTheme] = useState(readStoredTheme);
  const postalAreas = normalizePlzAreaList(prefs.postalAreas);

  useEffect(() => {
    applyAppTheme(theme);
  }, [theme]);

  const handleAddPostal = (val) => {
    const prefix = normalizePlzAreaPrefix(val);
    if (!prefix) return;
    const areas = normalizePlzAreaList(postalAreas);
    if (!areas.includes(prefix)) {
      setPref({ postalAreas: [...areas, prefix] });
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
      postalAreas: normalizePlzAreaList(postalAreas).filter(
        (_, idx) => idx !== indexToRemove,
      ),
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
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);
  const emailChange = store.getDriverEmailChange();
  // Drill-down navigation: null = main list; otherwise a subpage id.
  // State-based routing mirrors the job-detail pattern (PwaDriverApp.activeJob),
  // keeping the bottom tab bar visible on the Profile tab.
  const [subpage, setSubpage] = useState(null);
  const scrollBodyRef = useRef(null); // .scroll-body (shared by both views)
  const listScrollTop = useRef(0); // list offset to restore when coming back
  const lastSubpage = useRef(null); // row to re-focus when coming back
  const subpageTitleRef = useRef(null);

  // Swapping views by state alone leaves focus on <body>, so a keyboard or
  // screen-reader user gets no announcement of the change and loses their place
  // in the list (plan §7: every interactive element keeps a visible focus and an
  // accessible name). Entering a subpage moves focus to its heading; returning
  // restores the list offset and re-focuses the originating row.
  //
  // Both views render `.scroll-body` at the same position, so React reuses that
  // one DOM node: its scrollTop survives the swap and has to be reset explicitly,
  // or a subpage opens already scrolled down. The rows themselves *do* unmount,
  // so the row is re-queried by data attribute rather than stored as a node.
  const openSubpage = (id) => () => {
    listScrollTop.current = scrollBodyRef.current?.scrollTop || 0;
    lastSubpage.current = id;
    setSubpage(id);
  };

  useEffect(() => {
    const container = scrollBodyRef.current;
    if (subpage) {
      if (container) container.scrollTop = 0;
      subpageTitleRef.current?.focus({ preventScroll: true });
      return;
    }
    const returningFrom = lastSubpage.current;
    if (!container || !returningFrom) return;
    container.scrollTop = listScrollTop.current;
    container
      .querySelector(`[data-profile-row="${returningFrom}"]`)
      ?.focus({ preventScroll: true });
    lastSubpage.current = null;
  }, [subpage]);
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

  const initials = d?.name
    ? d.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "JB";
  const statusActive = String(d?.status || "").toLowerCase() === "active";
  const onProbation = !!store.getDriverProbationSummary()?.onProbation;

  // ---- Moved content (reused verbatim inside their drill-down subpages) ----

  // Basic data → existing read-only master data + "Request a change" flow.
  const masterDataCard = (
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
  );

  // Notification settings → existing push/vehicle/axle/postal controls.
  const notificationsCard = (
    <div className="section-card">
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
          <span className="switch-row-text">{t("pushNotifyNewPublished")}</span>
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
            value={prefs.vehicleType || "All"}
            onChange={(e) => setPref({ vehicleType: e.target.value })}
          >
            {["All", ...AuthStore.selectableVehicleTypes()].map((x) => (
              <option key={x} value={x}>
                {displayVehicle(x, t)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="stack-16">
        <label className="field-label">{t("transportType")}</label>
        <div className="seg full">
          {["All", ...AuthStore.TRANSPORT_TYPES].map((x) => (
            <button
              key={x}
              type="button"
              className={(prefs.transportType || "All") === x ? "on" : ""}
              onClick={() => setPref({ transportType: x })}
            >
              {displayTransportType(x, t)}
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
            <span key={chip} className="postal-chip filter-plz-pill">
              {formatPlzAreaPill(chip)}
              <button
                type="button"
                className="postal-chip-delete filter-plz-pill-x"
                onClick={() => removePostal(idx)}
                aria-label={t("removePostalCode", {
                  code: formatPlzAreaPill(chip),
                })}
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
            maxLength={2}
            onChange={(e) =>
              setPostalText(e.target.value.replace(/\D/g, "").slice(0, 2))
            }
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={
              postalAreas.length === 0 ? t("plzAreaPlaceholder") : ""
            }
          />
        </div>
      </div>
      <div className="stack-16">
        <InlineAlert tone="info" message={t("pushSupportNotice")} />
      </div>
    </div>
  );

  // Appearance and language → reused theme control + language DROPDOWN.
  const appearanceCard = (
    <div className="section-card">
      <p className="section-hint" style={{ marginTop: 0 }}>
        {t("appAppearanceHint")}
      </p>
      <div className="stack-16">
        <label className="field-label" htmlFor="profile-language-select">
          {t("appLanguage")}
        </label>
        <select
          id="profile-language-select"
          className="input"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
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
  );

  // Deferred shells — visually complete, no submission/validation/backend.
  const passwordCard = (
    <div className="section-card">
      <p className="section-hint" style={{ marginTop: 0 }}>
        {t("profilePasswordIntro")}
      </p>
      <div className="stack-16">
        <label className="field-label" htmlFor="profile-pw-current">
          {t("profilePasswordCurrent")}
        </label>
        <input
          id="profile-pw-current"
          className="input"
          type="password"
          autoComplete="current-password"
        />
      </div>
      <div className="stack-16">
        <label className="field-label" htmlFor="profile-pw-new">
          {t("profilePasswordNew")}
        </label>
        <input
          id="profile-pw-new"
          className="input"
          type="password"
          autoComplete="new-password"
        />
      </div>
      <div className="stack-16">
        <label className="field-label" htmlFor="profile-pw-confirm">
          {t("profilePasswordConfirm")}
        </label>
        <input
          id="profile-pw-confirm"
          className="input"
          type="password"
          autoComplete="new-password"
        />
      </div>
      <button type="button" className="btn primary block stack-16" disabled>
        {t("profilePasswordSubmit")}
      </button>
      <div className="stack-16">
        <InlineAlert tone="info" message={t("profilePasswordDeferred")} />
      </div>
    </div>
  );

  const SUBPAGES = {
    masterData: { title: t("profileNavBasicData"), body: masterDataCard },
    password: { title: t("profileNavChangePassword"), body: passwordCard },
    notifications: {
      title: t("profileNavNotifications"),
      body: notificationsCard,
    },
    appearance: { title: t("profileNavAppearance"), body: appearanceCard },
  };
  const activeSub = subpage ? SUBPAGES[subpage] : null;

  return (
    <>
      {activeSub ? (
        <>
          <ProfileSubpageHeader
            title={activeSub.title}
            backLabel={t("profileBackLabel")}
            onBack={() => setSubpage(null)}
            titleRef={subpageTitleRef}
          />
          <div className="scroll scroll-body" ref={scrollBodyRef}>
            {activeSub.body}
          </div>
        </>
      ) : (
        <>
          <DriverScreenHeader
            title={t("profileTitle")}
            subtitle={t("profileSubtitle")}
            onOpenNotifications={onOpenNotifications}
            notificationsOpen={notificationsOpen}
          />
          <div className="scroll scroll-body" ref={scrollBodyRef}>
            {/* Identity card — avatar, name, partner id */}
            <div
              className="section-card profile-identity-card list-enter"
              style={{ ["--list-enter-i"]: 0 }}
            >
              <span className="avatar">{initials}</span>
              <div className="flex-1-min-0">
                <div className="profile-identity-name">{d?.name}</div>
                <div className="profile-identity-partner">
                  {t("profilePartnerId")}: {d?.driverCode}
                </div>
              </div>
            </div>

            {/* Probation progress — second on the main list while on probation */}
            <DriverProbationCard enterIndex={1} />

            {/* Summary card — status, joined, log out */}
            <div
              className="section-card profile-summary-card list-enter"
              style={{
                ["--list-enter-i"]: onProbation ? 2 : 1,
              }}
            >
              <div className="profile-summary-row">
                <span
                  className={`profile-summary-icon${statusActive ? " is-status" : ""}`}
                  aria-hidden="true"
                >
                  <Ic.CheckCircle />
                </span>
                <span className="profile-summary-text">
                  <span className="profile-summary-label">
                    {t("accountStatus")}
                  </span>
                  <span
                    className={`profile-summary-value${statusActive ? " is-active" : ""}`}
                  >
                    {displayDriverStatus(d?.status, t)}
                  </span>
                </span>
              </div>
              <div className="profile-summary-row">
                <span className="profile-summary-icon" aria-hidden="true">
                  <Ic.Calendar />
                </span>
                <span className="profile-summary-text">
                  <span className="profile-summary-label">
                    {t("profileDateJoined")}
                  </span>
                  <span className="profile-summary-value">
                    {d?.joinedAt || "—"}
                  </span>
                </span>
              </div>
              <button
                type="button"
                className="profile-summary-row profile-summary-action"
                onClick={() => setSignOutOpen(true)}
              >
                <span className="profile-summary-icon" aria-hidden="true">
                  <Ic.Logout />
                </span>
                <span className="profile-summary-text">
                  <span className="profile-summary-action-label">
                    {t("signOut")}
                  </span>
                </span>
                <span className="profile-nav-row-chevron" aria-hidden="true">
                  <Ic.Chev />
                </span>
              </button>
            </div>

            <ProfileGroup
              label={t("profileGroupAccount")}
              enterIndex={onProbation ? 3 : 2}
            >
              <ProfileNavRow
                icon={Ic.TabUser}
                label={t("profileNavBasicData")}
                sub={t("profileNavBasicDataSub")}
                rowId="masterData"
                onClick={openSubpage("masterData")}
              />
              <ProfileNavRow
                icon={Ic.Mail}
                label={t("profileNavChangeEmail")}
                sub={
                  emailChange?.pending
                    ? t("accountEmailPending")
                    : d?.email || "—"
                }
                rowId="changeEmail"
                onClick={() => setEmailSheetOpen(true)}
              />
              <ProfileNavRow
                icon={Ic.Lock}
                label={t("profileNavChangePassword")}
                rowId="password"
                onClick={openSubpage("password")}
              />
            </ProfileGroup>

            <ProfileGroup label={t("profileGroupSettings")}>
              <ProfileNavRow
                icon={Ic.Bell}
                label={t("profileNavNotifications")}
                rowId="notifications"
                onClick={openSubpage("notifications")}
              />
              <ProfileNavRow
                icon={Ic.Globe}
                label={t("profileNavAppearance")}
                rowId="appearance"
                onClick={openSubpage("appearance")}
              />
            </ProfileGroup>

            <ProfileGroup label={t("profileGroupHelp")}>
              <ProfileMailtoRow
                icon={Ic.Chat}
                label={t("profileNavFeedback")}
                rowId="feedback"
                recipient={support.feedbackEmail}
                subject={feedbackSubject}
              />
              <ProfileMailtoRow
                icon={Ic.Alert}
                label={t("profileNavReportError")}
                rowId="reportError"
                recipient={support.reportErrorEmail}
                subject={reportErrorSubject}
              />
            </ProfileGroup>

            <div className="profile-version">
              {t("profileAppVersion", { version: "1.2.0" })}
            </div>
          </div>
        </>
      )}

      <ChangeEmailSheet
        open={emailSheetOpen}
        onClose={() => setEmailSheetOpen(false)}
        currentEmail={d?.email || ""}
      />

      <ConfirmSheet
        open={signOutOpen}
        title={t("signOut")}
        message={t("signOutAlert")}
        confirmLabel={t("signOut")}
        onConfirm={() => {
          setSignOutOpen(false);
          store.logoutDriver();
        }}
        onCancel={() => setSignOutOpen(false)}
        destructive
      />
    </>
  );
};

const Infopoint = ({ onOpenNotifications, notificationsOpen = false }) => {
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
      <DriverScreenHeader
        title={t("infopoint")}
        subtitle={t("infopointSubtitle")}
        onOpenNotifications={onOpenNotifications}
        notificationsOpen={notificationsOpen}
      />

      {/* Horizontal Tab Pills Selector — a sibling band BELOW the header, the
          same way My orders places its search row and tabs. Keeping the tabs
          out of `.pwa-screen-header` is what keeps the header's grey divider at
          the identical height on all four primary screens; the band then draws
          its own divider under the tabs. */}
      <div className="myjobs-tabs-slider infopoint-tabs-slider">
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
                  {docs.map((d, index) => (
                    <div
                      key={d.id}
                      className={
                        "infopoint-doc-row" + (index < 4 ? " list-enter" : "")
                      }
                      style={
                        index < 4 ? { ["--list-enter-i"]: index } : undefined
                      }
                    >
                      <div
                        className="infopoint-news-icon read"
                        style={{ color: "var(--primary)" }}
                      >
                        <Ic.Pdf />
                      </div>
                      <div className="flex-1-min-0">
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {displayDocTitle(d, t)}
                        </div>
                        {d.description ? (
                          <div
                            className="text-muted-sm"
                            style={{ marginTop: 4, lineHeight: 1.4 }}
                          >
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
                    style={{
                      padding: 28,
                      textAlign: "center",
                      borderRadius: 16,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {t("infopointNewsEmpty")}
                    </div>
                    <div className="infopoint-empty-hint">
                      {t("infopointNewsAdminHint")}
                    </div>
                  </div>
                ) : (
                  <div className="infopoint-card">
                    {news.map((n, index) => {
                      const unread = !n.readBy.includes(readerId);
                      const expanded = openNewsId === n.id;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={
                            "infopoint-news-row" +
                            (index < 4 ? " list-enter" : "")
                          }
                          style={
                            index < 4
                              ? { ["--list-enter-i"]: index }
                              : undefined
                          }
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
                              style={{
                                margin: "8px 0 0",
                                lineHeight: 1.45,
                                fontSize: 13,
                              }}
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
        className="sheet modal confirm-sheet confirm-sheet-panel"
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

// =========================================================================
// LOGIN — driver PWA (autheon-fe parity: apps/web LoginPage, mobile-pwa
// layout — full-screen logo header + heading + LoginForm, no tab bar).
// =========================================================================
const DriverLoginScreen = ({ standalone = false }) => {
  const { t } = useI18n();
  const store = useAuthStore();
  const [mode, setMode] = useState("login"); // login | forgot
  const [notice, setNotice] = useState("");

  const body =
    mode === "forgot" ? (
      <DriverUI.ForgotPasswordFlow
        kind="driver"
        onExit={() => setMode("login")}
        onDone={() => {
          setMode("login");
          setNotice(t("authForgotPasswordSuccessNotice"));
        }}
        copy={{
          invalidEmail: t("authErrorInvalidEmail"),
          title: t("authDriverForgotTitle"),
          subtitle: t("authDriverForgotSubtitle"),
          emailLabel: t("authDriverForgotEmailLabel"),
          emailPlaceholder: t("authDriverForgotEmailPlaceholder"),
          submit: t("authDriverForgotSubmit"),
          backToLogin: t("authDriverForgotBackToLogin"),
          otpTitle: t("authDriverForgotOtpTitle"),
          otpSubtitlePrefix: t("authDriverForgotOtpSubtitlePrefix"),
          otpSubmit: t("authDriverForgotOtpSubmit"),
          otpResendCooldownPrefix: t("authDriverForgotOtpResendCooldownPrefix"),
          otpResendButton: t("authDriverForgotOtpResendButton"),
          otpBack: t("authDriverForgotOtpBack"),
          otpInvalidCode: t("authDriverForgotOtpInvalidCode", { length: 6 }),
          otpIncorrectCode: t("authDriverForgotOtpIncorrectCode"),
          resetTitle: t("authDriverResetTitle"),
          resetSubtitle: t("authDriverResetSubtitle"),
          resetPasswordLabel: t("authDriverResetPasswordLabel"),
          resetPasswordPlaceholder: t("authDriverResetPasswordPlaceholder"),
          resetConfirmLabel: t("authDriverResetConfirmLabel"),
          resetConfirmPlaceholder: t("authDriverResetConfirmPlaceholder"),
          resetSubmit: t("authDriverResetSubmit"),
          resetBack: t("authDriverResetBack"),
          resetMinLength: t("authDriverResetMinLength"),
          resetConfirmRequired: t("authDriverResetConfirmRequired"),
          resetMismatch: t("authDriverResetMismatch"),
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
          <h1 className="auth-heading">{t("authDriverLoginTitle")}</h1>
          <p className="auth-subheading">{t("authDriverLoginSubtitle")}</p>
        </div>
        {notice && (
          <InlineAlert
            tone="success"
            message={notice}
            onDismiss={() => setNotice("")}
          />
        )}
        <DriverUI.LoginForm
          emailLabel={t("authDriverLoginEmailLabel")}
          emailPlaceholder={t("authDriverLoginEmailPlaceholder")}
          passwordLabel={t("authDriverLoginPasswordLabel")}
          passwordPlaceholder={t("authDriverLoginPasswordPlaceholder")}
          showPasswordLabel={t("authDriverLoginShowPassword")}
          hidePasswordLabel={t("authDriverLoginHidePassword")}
          submitLabel={t("authDriverLoginSubmit")}
          forgotPasswordLabel={t("authDriverLoginForgotPassword")}
          onForgotPassword={() => {
            setNotice("");
            setMode("forgot");
          }}
          onSubmit={(email, password) => store.loginDriver({ email, password })}
          demoEmail="driver.one@demo.local"
          demoFillLabel={t("authDemoFillButton")}
        />
      </>
    );

  return (
    <div className={`phone-shell${standalone ? " pwa-viewport" : ""}`}>
      {!standalone && <div className="pwa-tag">{t("pwaTag")}</div>}
      <div className="phone">
        {!standalone && <div className="notch"></div>}
        <div className="phone-screen">
          {!standalone && <PhoneStatusBar />}
          <div className="scroll auth-screen" style={{ padding: "28px 22px" }}>
            <DriverUI.AuthTopChrome />
            {body}
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// SET PASSWORD / ACCEPT INVITE — driver PWA (autheon-fe parity: apps/web
// SetPasswordPage). NOT wired to any reachable screen — no route/link/button
// mounts this yet; it exists so the screen can be reviewed and later wired
// once a real invite-token mechanism exists. Page owns email/token link
// validity + heading swap; DriverUI.SetPasswordForm owns the fields.
// =========================================================================
const DriverSetPasswordScreen = ({
  email = "",
  token = "",
  standalone = false,
}) => {
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
            ? t("authDriverSetPasswordTitle")
            : t("authDriverSetPasswordInvalidLinkTitle")}
        </h1>
        <p className="auth-subheading">
          {isValidLink
            ? t("authDriverSetPasswordSubtitle")
            : t("authDriverSetPasswordInvalidLinkMessage")}
        </p>
      </div>
      {isValidLink ? (
        <DriverUI.SetPasswordForm
          email={email}
          token={token}
          kind="driver"
          onDone={() => {}}
          copy={{
            passwordLabel: t("authDriverSetPasswordPasswordLabel"),
            passwordPlaceholder: t("authDriverSetPasswordPasswordPlaceholder"),
            confirmLabel: t("authDriverSetPasswordConfirmLabel"),
            confirmPlaceholder: t("authDriverSetPasswordConfirmPlaceholder"),
            showPassword: t("authDriverLoginShowPassword"),
            hidePassword: t("authDriverLoginHidePassword"),
            submit: t("authDriverSetPasswordSubmit"),
            minLength: t("authDriverSetPasswordMinLength"),
            complexity: t("authDriverSetPasswordComplexity"),
            confirmRequired: t("authDriverSetPasswordConfirmRequired"),
            mismatch: t("authDriverSetPasswordMismatch"),
            invalidLinkMessage: t("authDriverSetPasswordInvalidLinkMessage"),
          }}
        />
      ) : (
        <p className="auth-subheading">
          {t("authDriverSetPasswordInvalidLinkHint")}
        </p>
      )}
    </>
  );

  return (
    <div className={`phone-shell${standalone ? " pwa-viewport" : ""}`}>
      {!standalone && <div className="pwa-tag">{t("pwaTag")}</div>}
      <div className="phone">
        {!standalone && <div className="notch"></div>}
        <div className="phone-screen">
          {!standalone && <PhoneStatusBar />}
          <div className="scroll auth-screen" style={{ padding: "28px 22px" }}>
            <DriverUI.AuthTopChrome />
            {body}
          </div>
        </div>
      </div>
    </div>
  );
};

// expose
Object.assign(window, {
  Pill,
  Lbl,
  DriverLoginScreen,
  DriverSetPasswordScreen,
  Ic,
  RouteStack,
  PhoneStatusBar,
  TabBar,
  DriverScreenHeader,
  NotificationBellButton,
  // Canonical applied-filter derivation — exported so the marketplace badge,
  // the chip row and the unit tests all share one implementation.
  getAppliedMarketplaceFilters,
  getAppliedMarketplaceFilterCount,
  jobMatchesDriverFilters,
  MarketplaceFilterButton,
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
  TourBookedSuccessSheet,
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
