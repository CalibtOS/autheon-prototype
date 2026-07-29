/* eslint-disable no-unused-vars */
/**
 * Driver PWA UI primitives — shared building blocks of the driver design contract.
 * Loaded before driver.jsx in AUTHEON Prototype.html
 */
const { useEffect, useLayoutEffect, useRef, useCallback, useState, useId } =
  React;

const fmt = () => window.AutheonFormatters || {};

// ---------------------------------------------------------------------------
// StatusPill — unified status representation
// ---------------------------------------------------------------------------
function StatusPill({ status, children, className = "" }) {
  const key = String(status || "draft").replace(/-/g, "_");
  return <span className={`pill ${key} ${className}`.trim()}>{children}</span>;
}

// ---------------------------------------------------------------------------
// Badge — numeric notification badge (99+ cap)
// ---------------------------------------------------------------------------
function Badge({
  count,
  variant = "primary",
  className = "",
  ariaHidden = false,
}) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  const label = n > 99 ? "99+" : String(n);
  return (
    <span
      className={`ui-badge ui-badge-${variant} ${className}`.trim()}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : label}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) {
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
// Sheet — bottom sheet / centered modal primitive (pull-to-dismiss on bottom)
// ---------------------------------------------------------------------------
const SHEET_DISMISS_DISTANCE_PX = 96;
const SHEET_DISMISS_VELOCITY = 0.55;

function shouldDismissSheetDrag(distancePx, velocityPxPerMs) {
  return (
    distancePx >= SHEET_DISMISS_DISTANCE_PX ||
    velocityPxPerMs >= SHEET_DISMISS_VELOCITY
  );
}

/**
 * Attach pull-down dismiss to a bottom-sheet panel via its grabber (and optional
 * head). Returns an unsubscribe fn. Use for ad-hoc sheets that still render
 * raw `.sheet` markup; prefer `<Sheet>` for new work.
 */
function bindBottomSheetPullDismiss(panel, handle, onClose) {
  if (!panel || !handle || typeof onClose !== "function") return () => {};
  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let dragging = false;
  let pointerId = null;

  const reset = () => {
    panel.style.transform = "";
    panel.style.transition = "";
    dragging = false;
    pointerId = null;
  };

  const onDown = (event) => {
    if (event.button !== 0) return;
    if (event.pointerType === "touch" && !event.isPrimary) return;
    if (
      event.target &&
      event.target.closest &&
      event.target.closest(
        'button, a, input, select, textarea, label, [role="button"]',
      )
    ) {
      return;
    }
    event.preventDefault();
    dragging = true;
    pointerId = event.pointerId;
    startY = event.clientY;
    lastY = event.clientY;
    lastT = performance.now();
    panel.style.transition = "none";
    if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
  };

  const onMove = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const dy = Math.max(0, event.clientY - startY);
    panel.style.transform = `translate3d(0, ${dy}px, 0)`;
    lastY = event.clientY;
    lastT = performance.now();
  };

  const onUp = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const distance = Math.max(0, event.clientY - startY);
    const elapsed = Math.max(1, performance.now() - lastT);
    const velocity = (event.clientY - lastY) / elapsed;
    if (shouldDismissSheetDrag(distance, velocity)) {
      reset();
      onClose();
      return;
    }
    panel.style.transition = "transform 200ms ease-out";
    panel.style.transform = "translate3d(0, 0, 0)";
    const clear = () => {
      panel.style.transition = "";
      panel.style.transform = "";
      panel.removeEventListener("transitionend", clear);
    };
    panel.addEventListener("transitionend", clear);
    dragging = false;
    pointerId = null;
  };

  handle.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  return () => {
    handle.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    reset();
  };
}

function Sheet({
  open,
  onClose,
  title,
  titleId,
  children,
  footer,
  centered = false,
  className = "",
  hideHandle = false,
}) {
  const panelRef = useRef(null);
  const grabberRef = useRef(null);
  const headRef = useRef(null);
  const tid = titleId || "sheet-title";

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || centered) return;
    const panel = panelRef.current;
    if (!panel) return;
    const unsubs = [];
    if (grabberRef.current) {
      unsubs.push(bindBottomSheetPullDismiss(panel, grabberRef.current, onClose));
    }
    if (headRef.current) {
      unsubs.push(bindBottomSheetPullDismiss(panel, headRef.current, onClose));
    }
    return () => unsubs.forEach((fn) => fn());
  }, [open, centered, onClose]);

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
        {!centered ? (
          <div
            ref={grabberRef}
            className={`grabber-hit${hideHandle ? " grabber-hit--hidden" : ""}`}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Drag down to close"
          >
            {!hideHandle ? <div className="grabber" aria-hidden="true" /> : null}
          </div>
        ) : null}
        {title ? (
          <div className="sheet-head" ref={headRef}>
            <h2 id={tid}>{title}</h2>
          </div>
        ) : null}
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/**
 * Drop-in grabber for ad-hoc bottom sheets that still use raw `.sheet` markup.
 * Finds the closest `.sheet` ancestor and binds pull-to-dismiss.
 */
function SheetGrabber({ onClose, hidden = false }) {
  const hitRef = useRef(null);

  useEffect(() => {
    const handle = hitRef.current;
    const panel = handle?.closest?.(".sheet");
    if (!handle || !panel || typeof onClose !== "function") return undefined;
    return bindBottomSheetPullDismiss(panel, handle, onClose);
  }, [onClose]);

  return (
    <div
      ref={hitRef}
      className={`grabber-hit${hidden ? " grabber-hit--hidden" : ""}`}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Drag down to close"
    >
      {!hidden ? <div className="grabber" aria-hidden="true" /> : null}
    </div>
  );
}

/** Make any region (e.g. `.sheet-head`) start a pull-to-dismiss drag. */
function SheetPullRegion({ onClose, className = "", children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const handle = ref.current;
    const panel = handle?.closest?.(".sheet");
    if (!handle || !panel || typeof onClose !== "function") return undefined;
    return bindBottomSheetPullDismiss(panel, handle, onClose);
  }, [onClose]);

  return (
    <div ref={ref} className={className} {...rest}>
      {children}
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
  tertiaryLabel,
  onConfirm,
  onCancel,
  onTertiary,
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
          {tertiaryLabel ? (
            <button type="button" className="btn ghost" onClick={onTertiary}>
              {tertiaryLabel}
            </button>
          ) : null}
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
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
  const [pendingChoice, setPendingChoice] = useState(null);

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
    // Three-way leave-page decision (Save as draft / Discard / Continue
    // editing) — distinct from requestAdminConfirm's binary yes/no because
    // "cancel the dialog" here means "keep editing", not "do nothing".
    window.requestLeavePageDecision = (message, opts = {}) =>
      new Promise((resolve) => {
        setPendingChoice({
          message,
          title: opts.title,
          saveLabel: opts.saveLabel,
          discardLabel: opts.discardLabel,
          continueLabel: opts.continueLabel,
          resolve,
        });
      });
    return () => {
      window.requestAdminConfirm = null;
      window.requestLeavePageDecision = null;
    };
  }, []);

  return (
    <>
      {pending ? (
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
      ) : null}
      {pendingChoice ? (
        <ConfirmSheet
          open
          title={pendingChoice.title || t("leavePageTitle")}
          message={pendingChoice.message}
          tertiaryLabel={pendingChoice.discardLabel || t("leavePageDiscard")}
          cancelLabel={
            pendingChoice.continueLabel || t("leavePageContinueEditing")
          }
          confirmLabel={pendingChoice.saveLabel || t("leavePageSaveDraft")}
          onTertiary={() => {
            pendingChoice.resolve("discard");
            setPendingChoice(null);
          }}
          onCancel={() => {
            pendingChoice.resolve("continue");
            setPendingChoice(null);
          }}
          onConfirm={() => {
            pendingChoice.resolve("save");
            setPendingChoice(null);
          }}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// RedPlatesRequiredNotice — the ONE derived red-licence-plate notice component,
// shared by the Admin Backend and the Driver PWA (client confirmation
// "Systemlogik Fahrzeugeingabe"). It lives here, in the shared primitives
// module loaded before both apps, precisely so the two cannot drift apart or
// redeclare a same-named component in the shared global scope.
//
// It NEVER re-implements the rule: the requirement comes from
// AuthStore.requiresRedLicencePlates (deregistered + own axle). Because it is
// derived on every render, it cannot go stale after a value change, a refetch,
// a reload or the booking transition — and it deliberately keeps showing after
// booking, being an execution requirement rather than a marketplace message.
//
// Accepts either a whole `job` or explicit `registrationStatus`/`transportType`
// (the live admin form state, which is not yet a job).
//
// variant: "tag"          compact chip for dense card/tag rows (Driver PWA)
//          "banner"       full notice for driver detail/booking surfaces
//          "admin-banner" existing .banner.banner-warn treatment (Admin)
//          "admin-pill"   existing .pill.warn treatment (Admin, inline)
// ---------------------------------------------------------------------------
function RedPlatesRequiredNotice({
  job,
  registrationStatus,
  transportType,
  variant = "tag",
}) {
  const { t } = window.useI18n();
  const reg = job ? job.registrationStatus : registrationStatus;
  const transport = job ? job.transportType : transportType;
  if (!window.AuthStore.requiresRedLicencePlates(reg, transport)) return null;
  const label = t("redPlatesRequired");
  const detail = t("redPlatesRequiredDetail");

  if (variant === "admin-pill") {
    return (
      <span className="pill warn no-dot" role="status">
        {label}
      </span>
    );
  }
  if (variant === "admin-banner") {
    return (
      <div
        className="banner banner-warn"
        role="status"
        style={{ margin: "12px 0 0" }}
      >
        <strong>{label}</strong>
        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45 }}>
          {detail}
        </div>
      </div>
    );
  }
  if (variant === "banner") {
    return (
      <div className="red-plates-banner" role="status">
        <span className="red-plates-banner-head">
          <strong>{label}</strong>
        </span>
        <span className="red-plates-banner-detail">{detail}</span>
      </div>
    );
  }
  return (
    <span className="vehicle-flag red-plates-required" role="status">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LoginForm — shared email/password form for the driver + admin login
// screens (autheon-fe parity: RHF+Zod there is plain controlled state +
// synchronous validation here). Only the fields/validation/submit live here;
// each screen supplies its own copy and wraps this in its own layout chrome
// (phone-frame vs. centered card) — see DriverLoginScreen / AdminLoginScreen.
// ---------------------------------------------------------------------------
function LoginForm({
  emailLabel,
  emailPlaceholder,
  passwordLabel,
  passwordPlaceholder,
  showPasswordLabel,
  hidePasswordLabel,
  submitLabel,
  forgotPasswordLabel,
  onForgotPassword,
  onSubmit, // (email, password) => { ok, reason }
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [rootError, setRootError] = useState("");

  const errorText = (reason) => {
    switch (reason) {
      case "email_required":
        return t("authErrorEmailRequired");
      case "invalid_email":
        return t("authErrorInvalidEmail");
      case "password_required":
        return t("authErrorPasswordRequired");
      case "account_restricted":
        return t("authErrorAccountRestricted");
      default:
        return t("authErrorInvalidCredentials");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!email.trim()) errors.email = "email_required";
    else if (!AuthStore.isValidEmail(email)) errors.email = "invalid_email";
    if (!password.trim()) errors.password = "password_required";
    setFieldErrors(errors);
    setRootError("");
    if (errors.email || errors.password) return;

    const result = onSubmit(email.trim(), password);
    if (!result || !result.ok) {
      setRootError(errorText(result?.reason));
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field-group">
        <label className="field-label" htmlFor="auth-login-email">
          {emailLabel}
        </label>
        <input
          id="auth-login-email"
          type="email"
          autoComplete="email"
          placeholder={emailPlaceholder}
          className="input"
          value={email}
          aria-invalid={fieldErrors.email ? "true" : undefined}
          aria-describedby={
            fieldErrors.email ? "auth-login-email-error" : undefined
          }
          onChange={(e) => setEmail(e.target.value)}
        />
        {fieldErrors.email && (
          <p
            id="auth-login-email-error"
            role="alert"
            className="auth-field-error"
          >
            {errorText(fieldErrors.email)}
          </p>
        )}
      </div>

      <div className="auth-field-group">
        <label className="field-label" htmlFor="auth-login-password">
          {passwordLabel}
        </label>
        <div className="auth-password-wrap">
          <input
            id="auth-login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={passwordPlaceholder}
            className="input"
            value={password}
            aria-invalid={fieldErrors.password ? "true" : undefined}
            aria-describedby={
              fieldErrors.password ? "auth-login-password-error" : undefined
            }
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <Ic.EyeOff /> : <Ic.Eye />}
          </button>
        </div>
        {fieldErrors.password && (
          <p
            id="auth-login-password-error"
            role="alert"
            className="auth-field-error"
          >
            {errorText(fieldErrors.password)}
          </p>
        )}
      </div>

      {rootError && (
        <p role="alert" className="auth-field-error auth-root-error">
          {rootError}
        </p>
      )}

      <div className="auth-form-actions">
        <button type="submit" className="btn primary block">
          {submitLabel}
        </button>
        <button
          type="button"
          className="auth-forgot-link"
          onClick={onForgotPassword}
        >
          {forgotPasswordLabel}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// AuthOtpInput — segmented 6-digit code entry. One visually-hidden real
// input handles typing/paste/autofill; decorative cells on top render the
// digits — same pattern as autheon-fe's OtpInput (native keyboard/autofill
// behavior, custom look).
// ---------------------------------------------------------------------------
function AuthOtpInput({ value, onChange, length = 6, ariaLabel }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const cells = Array.from({ length }, (_, i) => value[i] || "");
  return (
    <div className="auth-otp-row" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        className="auth-otp-hidden-input"
        aria-label={ariaLabel || t("authOtpFieldAriaLabel")}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, length))
        }
      />
      {cells.map((digit, i) => (
        <div
          key={i}
          className={`auth-otp-cell${value.length === i ? " active" : ""}`}
          aria-hidden="true"
        >
          {digit}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ForgotPasswordFlow — email -> 6-digit OTP -> new password. Shared by the
// driver + admin login screens (autheon-fe parity: ForgotPasswordPage /
// ForgotPasswordOtpPage / ForgotPasswordResetPage, three routes there —
// three local steps here, since this prototype has no router). `copy` holds
// every string for all three steps; `kind` is "driver" | "admin", passed
// straight through to the matching AuthStore methods.
// ---------------------------------------------------------------------------
function ForgotPasswordFlow({ kind, copy, onExit, onDone }) {
  const [step, setStep] = useState("email"); // email | otp | reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [demoCode, setDemoCode] = useState("");

  useEffect(() => {
    if (!resendAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendAt]);

  const resendWaitSec = resendAt
    ? Math.max(0, Math.ceil((resendAt - now) / 1000))
    : 0;

  const backButton = (label, onClick) => (
    <div className="auth-back-row">
      <button
        type="button"
        className="btn icon"
        aria-label={label}
        onClick={onClick}
      >
        <Ic.Back />
      </button>
    </div>
  );

  if (step === "email") {
    const handleSubmit = (event) => {
      event.preventDefault();
      const value = email.trim();
      if (!AuthStore.isValidEmail(value)) {
        setFieldError(copy.invalidEmail);
        return;
      }
      setFieldError("");
      const result = AuthStore.requestPasswordReset({ email: value, kind });
      setDemoCode(result.code || "");
      setResendAt(Date.now() + AuthStore.PASSWORD_RESET_RESEND_MS);
      setStep("otp");
    };
    return (
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {backButton(copy.backToLogin, onExit)}
        <div className="auth-heading-block">
          <h1 className="auth-heading">{copy.title}</h1>
          <p className="auth-subheading">{copy.subtitle}</p>
        </div>
        <div className="auth-field-group">
          <label className="field-label" htmlFor="forgot-email">
            {copy.emailLabel}
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldError && (
            <p role="alert" className="auth-field-error">
              {fieldError}
            </p>
          )}
        </div>
        <div className="auth-form-actions">
          <button type="submit" className="btn primary block">
            {copy.submit}
          </button>
        </div>
      </form>
    );
  }

  if (step === "otp") {
    const handleSubmit = (event) => {
      event.preventDefault();
      if (otp.trim().length !== 6) {
        setOtpError(copy.otpInvalidCode);
        return;
      }
      const result = AuthStore.verifyPasswordResetCode({
        email,
        kind,
        code: otp.trim(),
      });
      if (!result.ok) {
        setOtpError(
          result.reason === "expired"
            ? copy.otpIncorrectCode
            : copy.otpIncorrectCode,
        );
        return;
      }
      setResetToken(result.resetToken);
      setOtpError("");
      setStep("reset");
    };
    const handleResend = () => {
      if (resendWaitSec > 0) return;
      const result = AuthStore.resendPasswordResetCode({ email, kind });
      setDemoCode(result.code || "");
      setResendAt(Date.now() + AuthStore.PASSWORD_RESET_RESEND_MS);
      setOtp("");
      setOtpError("");
    };
    return (
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {backButton(copy.otpBack, () => {
          setStep("email");
          setOtp("");
          setOtpError("");
        })}
        <div className="auth-heading-block">
          <h1 className="auth-heading">{copy.otpTitle}</h1>
          <p className="auth-subheading">
            {copy.otpSubtitlePrefix}
            {email}
          </p>
        </div>
        {demoCode && <InlineAlert tone="info" message={copy.demoHint(demoCode)} />}
        <div className="auth-field-group">
          <AuthOtpInput value={otp} onChange={setOtp} />
          {otpError && (
            <p role="alert" className="auth-field-error">
              {otpError}
            </p>
          )}
        </div>
        <div className="auth-form-actions">
          <button type="submit" className="btn primary block">
            {copy.otpSubmit}
          </button>
          <button
            type="button"
            className="auth-forgot-link"
            disabled={resendWaitSec > 0}
            onClick={handleResend}
          >
            {resendWaitSec > 0
              ? `${copy.otpResendCooldownPrefix}${resendWaitSec}s`
              : copy.otpResendButton}
          </button>
        </div>
      </form>
    );
  }

  // step === "reset"
  const handleSubmit = (event) => {
    event.preventDefault();
    if (newPassword.trim().length < 8) {
      setFieldError(copy.resetMinLength);
      return;
    }
    if (!confirmPassword.trim()) {
      setFieldError(copy.resetConfirmRequired);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError(copy.resetMismatch);
      return;
    }
    const result = AuthStore.resetPassword({
      email,
      kind,
      resetToken,
      newPassword: newPassword.trim(),
    });
    if (!result.ok) {
      setFieldError(copy.otpIncorrectCode);
      return;
    }
    onDone();
  };
  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {backButton(copy.resetBack, () => {
        setStep("otp");
        setFieldError("");
      })}
      <div className="auth-heading-block">
        <h1 className="auth-heading">{copy.resetTitle}</h1>
        <p className="auth-subheading">{copy.resetSubtitle}</p>
      </div>
      <div className="auth-field-group">
        <label className="field-label" htmlFor="forgot-new-password">
          {copy.resetPasswordLabel}
        </label>
        <input
          id="forgot-new-password"
          type="password"
          autoComplete="new-password"
          className="input"
          placeholder={copy.resetPasswordPlaceholder}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className="auth-field-group">
        <label className="field-label" htmlFor="forgot-confirm-password">
          {copy.resetConfirmLabel}
        </label>
        <input
          id="forgot-confirm-password"
          type="password"
          autoComplete="new-password"
          className="input"
          placeholder={copy.resetConfirmPlaceholder}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {fieldError && (
        <p role="alert" className="auth-field-error">
          {fieldError}
        </p>
      )}
      <div className="auth-form-actions">
        <button type="submit" className="btn primary block">
          {copy.resetSubmit}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// SetPasswordForm — accept-invite / first-password screen. Mirrors
// autheon-fe's SetPasswordForm (RHF+Zod there is plain controlled state +
// synchronous validation here): password + confirm, min-8 + upper/lower/
// digit complexity, calls AuthStore.acceptInvite. `email`/`token` are the
// page's parsed link params; this component owns only the fields/submit —
// same Page-owns-link-validity / Form-owns-fields split as autheon-fe.
// ---------------------------------------------------------------------------
function SetPasswordForm({ email, token, kind, copy, onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (password.length < 8) {
      setFieldError(copy.minLength);
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setFieldError(copy.complexity);
      return;
    }
    if (!confirmPassword.trim()) {
      setFieldError(copy.confirmRequired);
      return;
    }
    if (password !== confirmPassword) {
      setFieldError(copy.mismatch);
      return;
    }
    setFieldError("");
    setSubmitting(true);
    const result = AuthStore.acceptInvite({
      email,
      kind,
      token,
      newPassword: password,
      confirmNewPassword: confirmPassword,
    });
    setSubmitting(false);
    if (!result.ok) {
      setFieldError(copy.invalidLinkMessage);
      return;
    }
    onDone();
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field-group">
        <label className="field-label" htmlFor="set-password-new">
          {copy.passwordLabel}
        </label>
        <div className="auth-password-wrap">
          <input
            id="set-password-new"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="input"
            placeholder={copy.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            aria-label={showPassword ? copy.hidePassword : copy.showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <Ic.EyeOff /> : <Ic.Eye />}
          </button>
        </div>
      </div>
      <div className="auth-field-group">
        <label className="field-label" htmlFor="set-password-confirm">
          {copy.confirmLabel}
        </label>
        <div className="auth-password-wrap">
          <input
            id="set-password-confirm"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            className="input"
            placeholder={copy.confirmPlaceholder}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            aria-label={
              showConfirmPassword ? copy.hidePassword : copy.showPassword
            }
            onClick={() => setShowConfirmPassword((v) => !v)}
          >
            {showConfirmPassword ? <Ic.EyeOff /> : <Ic.Eye />}
          </button>
        </div>
      </div>
      {fieldError && (
        <p role="alert" className="auth-field-error">
          {fieldError}
        </p>
      )}
      <div className="auth-form-actions">
        <button
          type="submit"
          className="btn primary block"
          disabled={submitting}
        >
          {copy.submit}
        </button>
      </div>
    </form>
  );
}

window.DriverUI = {
  StatusPill,
  Badge,
  EmptyState,
  SkeletonJobCard,
  SkeletonList,
  Sheet,
  SheetGrabber,
  SheetPullRegion,
  bindBottomSheetPullDismiss,
  ConfirmSheet,
  SortSelect,
  AdminConfirmBridge,
  RedPlatesRequiredNotice,
  LoginForm,
  AuthOtpInput,
  SetPasswordForm,
  ForgotPasswordFlow,
};
