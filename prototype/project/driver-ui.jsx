/* eslint-disable no-unused-vars */
/**
 * Driver PWA UI primitives — design source of truth building blocks.
 * Loaded before driver.jsx in AUTHEON Prototype.html
 */
const { useEffect, useLayoutEffect, useRef, useCallback, useState, useId } = React;

const fmt = () => window.AutheonFormatters || {};

// ---------------------------------------------------------------------------
// StatusPill — unified status representation
// ---------------------------------------------------------------------------
function StatusPill({ status, children, className = "" }) {
  const key = String(status || "draft").replace(/-/g, "_");
  return (
    <span className={`pill ${key} ${className}`.trim()}>{children}</span>
  );
}

// ---------------------------------------------------------------------------
// Badge — numeric notification badge (99+ cap)
// ---------------------------------------------------------------------------
function Badge({ count, variant = "primary", className = "" }) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  const label = n > 99 ? "99+" : String(n);
  return (
    <span
      className={`ui-badge ui-badge-${variant} ${className}`.trim()}
      aria-label={label}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
function EmptyState({ title, description, actionLabel, onAction, className = "" }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {title ? <p className="empty-state-title">{title}</p> : null}
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="btn primary sm" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------
function SkeletonJobCard() {
  return (
    <div className="skeleton-jobcard" aria-hidden="true">
      <div className="skeleton-line skeleton-line-lg" />
      <div className="skeleton-line skeleton-line-md" />
      <div className="skeleton-line skeleton-line-sm" />
    </div>
  );
}

function SkeletonList({ count = 3 }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading…">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonJobCard key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet — bottom sheet / centered modal primitive
// ---------------------------------------------------------------------------
function Sheet({
  open,
  onClose,
  title,
  titleId,
  children,
  footer,
  centered = false,
  className = "",
}) {
  const panelRef = useRef(null);
  const tid = titleId || "sheet-title";

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`sheet-backdrop ${centered ? "center" : ""}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`sheet ${centered ? "modal" : ""} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? tid : undefined}
      >
        {!centered ? <div className="grabber" aria-hidden="true" /> : null}
        {title ? (
          <div className="sheet-head">
            <h2 id={tid}>{title}</h2>
          </div>
        ) : null}
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmSheet — destructive / binding confirmations
// ---------------------------------------------------------------------------
function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}) {
  const { t } = useI18n();
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      centered
      className="confirm-sheet"
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onCancel}>
            {cancelLabel || t("cancel")}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? "danger" : "cta"}`}
            onClick={onConfirm}
          >
            {confirmLabel || t("confirm")}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// SortSelect — header icon trigger + portaled dropdown (no native OS picker)
// ---------------------------------------------------------------------------
function SortIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 6v12M4 14l3 3 3-3M17 18V6M20 10l-3-3-3 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12l5 5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getPhoneScreen() {
  if (typeof document === "undefined") return null;
  return document.querySelector(".phone-screen");
}

function SortSelect({ value, onChange, options, label }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const triggerRef = useRef(null);
  const titleId = useId();
  const aria = label || t("sortJobs");
  const current = options.find(([v]) => v === value);
  const currentLabel = current ? current[1] : aria;
  const defaultValue = options[0]?.[0];
  const isCustomSort = defaultValue != null && value !== defaultValue;

  const updatePosition = useCallback(() => {
    const shell = getPhoneScreen();
    const trigger = triggerRef.current;
    if (!shell || !trigger) return;

    const shellRect = shell.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(280, shellRect.width - 24);
    const gap = 8;
    const headHeight = 40;
    const rowHeight = 44;
    const panelPadding = 12;
    const estimatedHeight = Math.min(
      headHeight + options.length * rowHeight + panelPadding,
      shellRect.height - 24,
    );

    let top = triggerRect.bottom - shellRect.top + gap;
    const spaceBelow = shellRect.bottom - triggerRect.bottom - gap - 12;
    const spaceAbove = triggerRect.top - shellRect.top - gap - 12;

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      top = triggerRect.top - shellRect.top - gap - estimatedHeight;
    }

    top = Math.max(12, Math.min(top, shellRect.height - estimatedHeight - 12));

    let left = triggerRect.right - shellRect.left - panelWidth;
    left = Math.max(12, Math.min(left, shellRect.width - panelWidth - 12));

    setPanelStyle({ top, left, width: panelWidth, maxHeight: estimatedHeight });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    updatePosition();
    const shell = getPhoneScreen();
    if (!shell) return undefined;

    const onScroll = () => updatePosition();
    shell.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePosition);

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updatePosition);
      ro.observe(shell);
    }

    return () => {
      shell.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePosition);
      ro?.disconnect();
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const pick = (val) => {
    onChange(val);
    setOpen(false);
  };

  const portalTarget = open ? getPhoneScreen() : null;
  const menu =
    open && portalTarget && panelStyle
      ? ReactDOM.createPortal(
          <>
            <div
              className="sort-dropdown-backdrop"
              onClick={() => setOpen(false)}
              role="presentation"
            />
            <div
              className="sort-dropdown-panel"
              style={{
                top: panelStyle.top,
                left: panelStyle.left,
                width: panelStyle.width,
                maxHeight: panelStyle.maxHeight,
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="sort-dropdown-head" id={titleId}>
                {aria}
              </div>
              <ul
                className="sort-menu"
                role="listbox"
                aria-label={aria}
                aria-activedescendant={`sort-opt-${value}`}
              >
                {options.map(([val, lab]) => {
                  const selected = val === value;
                  return (
                    <li key={val} role="none">
                      <button
                        type="button"
                        id={`sort-opt-${val}`}
                        role="option"
                        aria-selected={selected}
                        className={`sort-menu-item${selected ? " on" : ""}`}
                        onClick={() => pick(val)}
                      >
                        <span className="sort-menu-label">{lab}</span>
                        <span
                          className={`sort-menu-check${selected ? "" : " sort-menu-check--empty"}`}
                          aria-hidden={!selected}
                        >
                          {selected ? <CheckIcon /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>,
          portalTarget,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`header-btn sort-trigger${isCustomSort ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`${aria}: ${currentLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <SortIcon />
      </button>
      {menu}
    </>
  );
}

// ---------------------------------------------------------------------------
// AdminConfirmBridge — replaces window.confirm in admin.jsx
// ---------------------------------------------------------------------------
function AdminConfirmBridge() {
  const { t } = useI18n();
  const [pending, setPending] = useState(null);

  useEffect(() => {
    window.requestAdminConfirm = (message, opts = {}) =>
      new Promise((resolve) => {
        setPending({
          message,
          title: opts.title,
          destructive: opts.destructive !== false,
          confirmLabel: opts.confirmLabel,
          resolve,
        });
      });
    return () => {
      window.requestAdminConfirm = null;
    };
  }, []);

  if (!pending) return null;

  return (
    <ConfirmSheet
      open
      title={pending.title || t("confirm")}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      destructive={pending.destructive}
      onConfirm={() => {
        pending.resolve(true);
        setPending(null);
      }}
      onCancel={() => {
        pending.resolve(false);
        setPending(null);
      }}
    />
  );
}

window.DriverUI = {
  StatusPill,
  Badge,
  EmptyState,
  SkeletonJobCard,
  SkeletonList,
  Sheet,
  ConfirmSheet,
  SortSelect,
  AdminConfirmBridge,
};
