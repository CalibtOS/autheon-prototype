/* global React, AuthStore, useAuthStore, useI18n, TabBar, Portal, MyJobs, Infopoint, ProfilePaneFull, JobLocked, JobUnlocked, AcceptanceModal, ReportProblemSheet, PendingNotice, TourBookedSuccessSheet, MarkPerformedSheet, ProbationLimitSheet, SameDayOverlapSheet, FilterSheet, DriverNotificationsPane, DriverLoginScreen, useNotificationDeepLink */
/**
 * PwaDriverApp — real-viewport driver PWA shell for /pwa.
 *
 * Same application wiring as DriverApp in AUTHEON Prototype.html, without
 * phone-mock chrome. Supports installable standalone display via manifest + SW.
 */
const { useState, useEffect } = React;

function useAutheonPwa() {
  const [pwa, setPwa] = useState(() =>
    window.AutheonPwa
      ? window.AutheonPwa.getState()
      : {
          isStandalone: false,
          isIos: false,
          isChromium: false,
          canInstall: false,
          installed: false,
          swReady: false,
          swControlling: false,
          installBlockedHint: false,
        },
  );
  useEffect(() => {
    if (!window.AutheonPwa) return undefined;
    return window.AutheonPwa.subscribe(setPwa);
  }, []);
  return pwa;
}

function PwaDriverApp() {
  const store = useAuthStore();
  const { t } = useI18n();
  const pwa = useAutheonPwa();
  const [installHintOpen, setInstallHintOpen] = useState(false);
  const [tab, setTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("tab");
      return next === "mine" || next === "info" || next === "profile" || next === "portal"
        ? next
        : "portal";
    } catch (_) {
      return "portal";
    }
  });
  const [filters, setFilters] = useState({});
  const [showFilter, setShowFilter] = useState(false);
  const [activeJob, setActiveJob] = useState(null); // {id, mode}
  const [acceptModal, setAcceptModal] = useState(null);
  const [reportProblemJob, setReportProblemJob] = useState(null);
  const [pendingNotice, setPendingNotice] = useState(null);
  const [markPerformedJobId, setMarkPerformedJobId] = useState(null);
  const [probationLimitModal, setProbationLimitModal] = useState(null);
  const [overlapConfirm, setOverlapConfirm] = useState(null);
  const [banner, setBanner] = useState(null);
  const [bookedSuccess, setBookedSuccess] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandNotificationId, setExpandNotificationId] = useState(null);
  const [deepLinkNewsId, setDeepLinkNewsId] = useState(null);

  const handleOpenJob = (j, mode = null, fromTab = tab) => {
    // One shared entitlement rule (store.driverJobViewMode) decides Marketplace
    // preview vs full tour detail, so a deep link cannot open a screen the
    // marketplace itself would keep locked.
    setActiveJob({
      id: j.id,
      mode: mode || store.driverJobViewMode(j),
      fromTab,
    });
  };

  /** Applies a resolved push-notification deep link (see useNotificationDeepLink). */
  const applyNotificationDeepLink = (notificationId, nav) => {
    // A tapped push has been seen.
    store.markDriverNotificationsRead([notificationId]);
    if (nav.kind === "news") {
      setShowNotifications(false);
      setActiveJob(null);
      setDeepLinkNewsId(nav.newsId);
      setTab("info");
      return;
    }
    if (nav.kind === "document") {
      setShowNotifications(false);
      setDeepLinkNewsId(null);
      setActiveJob({
        id: nav.jobId,
        mode: nav.mode,
        fromTab: "mine",
        openDocumentId: nav.documentId,
      });
      return;
    }
    setActiveJob(null);
    setExpandNotificationId(nav.expandId);
    setShowNotifications(true);
  };

  useNotificationDeepLink(applyNotificationDeepLink);
  const back = () => {
    const returnTab = activeJob?.fromTab || tab;
    setActiveJob(null);
    if (returnTab) setTab(returnTab);
  };
  const backToMarketplace = () => {
    setActiveJob(null);
    setTab("portal");
  };

  const job = activeJob ? store.getJob(activeJob.id) : null;

  let body;
  if (activeJob && job) {
    if (activeJob.mode === "locked") {
      body = (
        <JobLocked
          job={job}
          onBack={back}
          onBackToMarketplace={backToMarketplace}
          onAccept={() => setAcceptModal(job)}
        />
      );
    } else {
      body = (
        <JobUnlocked
          job={job}
          onBack={back}
          onBackToMarketplace={backToMarketplace}
          onReportProblem={() => setReportProblemJob(job)}
          onPerform={() => setMarkPerformedJobId(job.id)}
          openDocumentId={activeJob.openDocumentId || null}
        />
      );
    }
  } else if (tab === "portal") {
    body = (
      <Portal
        filters={filters}
        setFilters={setFilters}
        openFilter={() => setShowFilter(true)}
        onOpenJob={handleOpenJob}
        onOpenNotifications={() => setShowNotifications(true)}
        notificationsOpen={showNotifications}
      />
    );
  } else if (tab === "mine") {
    body = (
      <MyJobs
        onOpen={(j) =>
          setActiveJob({ id: j.id, mode: "unlocked", fromTab: "mine" })
        }
        onOpenNotifications={() => setShowNotifications(true)}
        notificationsOpen={showNotifications}
      />
    );
  } else if (tab === "info") {
    body = (
      <Infopoint
        onOpenNotifications={() => setShowNotifications(true)}
        notificationsOpen={showNotifications}
        deepLinkNewsId={deepLinkNewsId}
        onDeepLinkConsumed={() => setDeepLinkNewsId(null)}
      />
    );
  } else {
    body = (
      <ProfilePaneFull
        onOpenNotifications={() => setShowNotifications(true)}
        notificationsOpen={showNotifications}
      />
    );
  }

  return (
    <div className="phone-shell pwa-viewport">
      {!pwa.isStandalone ? (
        <div className="pwa-mode-bar" role="region" aria-label={t("pwaInstallRegion")}>
          <div className="pwa-mode-bar-copy">
            <strong>{t("pwaInstallTitle")}</strong>
          </div>
          <div className="pwa-mode-bar-actions">
            <button
              type="button"
              className="btn primary xs"
              onClick={() => {
                void (async () => {
                  if (pwa.canInstall) {
                    const result = await window.AutheonPwa?.promptInstall();
                    if (result && result.ok) return;
                  }
                  setInstallHintOpen(true);
                })();
              }}
            >
              {t("pwaInstallAction")}
            </button>
            <a
              className="pwa-mode-bar-link"
              href="/"
              target="_top"
              rel="noopener"
            >
              {t("pwaBackToPrototype")}
            </a>
          </div>
        </div>
      ) : null}

      {installHintOpen ? (
        <div
          className="pwa-ios-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="pwa-ios-sheet-card">
            <h2 id="pwa-install-title">
              {pwa.isIos
                ? t("pwaInstallIosTitle")
                : pwa.installBlockedHint
                  ? t("pwaInstallAuthTitle")
                  : t("pwaInstallManualTitle")}
            </h2>
            <ol>
              {pwa.isIos ? (
                <>
                  <li>{t("pwaInstallIosStep1")}</li>
                  <li>{t("pwaInstallIosStep2")}</li>
                  <li>{t("pwaInstallIosStep3")}</li>
                </>
              ) : pwa.installBlockedHint ? (
                <>
                  <li>{t("pwaInstallAuthStep1")}</li>
                  <li>{t("pwaInstallAuthStep2")}</li>
                  <li>{t("pwaInstallAuthStep3")}</li>
                </>
              ) : (
                <>
                  <li>{t("pwaInstallManualStep1")}</li>
                  <li>{t("pwaInstallManualStep2")}</li>
                  <li>{t("pwaInstallManualStep3")}</li>
                </>
              )}
            </ol>
            <button
              type="button"
              className="btn primary"
              onClick={() => setInstallHintOpen(false)}
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="phone">
        <div className="phone-screen">
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {banner && (
              <div
                className={`banner ${
                  typeof banner === "object" && banner.tone === "success"
                    ? "banner-success"
                    : "banner-warn"
                }`}
                role="alert"
              >
                {typeof banner === "object" ? banner.text : banner}
                <button
                  type="button"
                  className="btn xs touch-target"
                  style={{ marginLeft: 10 }}
                  onClick={() => setBanner(null)}
                >
                  {t("dismiss")}
                </button>
              </div>
            )}
            {body}
          </div>
          {!activeJob && (
            <TabBar tab={tab} setTab={setTab} />
          )}
          {showNotifications && (
            <DriverNotificationsPane
              onClose={() => {
                setShowNotifications(false);
                setExpandNotificationId(null);
              }}
              initialExpandedId={expandNotificationId}
              onOpenJob={(job, mode) => {
                setShowNotifications(false);
                handleOpenJob(job, mode);
              }}
              onOpenInfopoint={() => {
                setShowNotifications(false);
                setTab("info");
              }}
              onOpenNews={(newsId) => {
                setShowNotifications(false);
                setDeepLinkNewsId(newsId);
                setTab("info");
              }}
              onOpenTourDocument={({ jobId, documentId }) => {
                setShowNotifications(false);
                setActiveJob({
                  id: jobId,
                  mode: "unlocked",
                  fromTab: tab,
                  openDocumentId: documentId,
                });
              }}
              onOpenMarketplace={() => {
                setShowNotifications(false);
                setActiveJob(null);
                setTab("portal");
              }}
            />
          )}
          {showFilter && (
            <FilterSheet
              filters={filters}
              setFilters={setFilters}
              onClose={() => setShowFilter(false)}
            />
          )}
          {acceptModal && (
            <AcceptanceModal
              job={acceptModal}
              onCancel={() => setAcceptModal(null)}
              onConfirm={() => {
                const tryAccept = (confirmOverlap) => {
                  const r = store.acceptJob(acceptModal.id, {
                    confirmSameDayOverlap: confirmOverlap,
                  });
                  const id = acceptModal.id;
                  if (!r.ok) {
                    if (r.reason === "same_day_overlap_confirm") {
                      setAcceptModal(null);
                      setOverlapConfirm({ jobId: id });
                      return;
                    }
                    setAcceptModal(null);
                    if (r.reason === "driver_restricted") {
                      setBanner({ tone: "warn", text: t("blockedDriverBody") });
                    } else if (r.reason === "probation_limit_reached") {
                      setProbationLimitModal({
                        limit: r.limit,
                        performedCount: r.performedCount,
                      });
                    } else {
                      setBanner({ tone: "warn", text: t("toastAssignedElsewhere") });
                    }
                    setActiveJob({ id, mode: "locked" });
                    return;
                  }
                  setAcceptModal(null);
                  setActiveJob({ id, mode: "unlocked" });
                  setBookedSuccess(true);
                };
                tryAccept(false);
              }}
            />
          )}
          {reportProblemJob && (
            <ReportProblemSheet
              job={reportProblemJob}
              onClose={() => setReportProblemJob(null)}
              onSubmit={(path, reason, msg, evidence) => {
                const r =
                  path === "cancel"
                    ? store.reportProblemCancel(
                        reportProblemJob.id,
                        reason,
                        msg,
                      )
                    : store.reportProblemNotPerformable(
                        reportProblemJob.id,
                        reason,
                        msg,
                        evidence,
                      );
                setReportProblemJob(null);
                if (!r.ok) return;
                setPendingNotice(path);
                setActiveJob({ id: reportProblemJob.id, mode: "unlocked" });
              }}
            />
          )}
          {pendingNotice && (
            <PendingNotice
              kind={pendingNotice}
              onClose={() => setPendingNotice(null)}
            />
          )}
          {markPerformedJobId && store.getJob(markPerformedJobId) && (
            <MarkPerformedSheet
              job={store.getJob(markPerformedJobId)}
              onClose={() => setMarkPerformedJobId(null)}
            />
          )}
          {probationLimitModal && (
            <ProbationLimitSheet
              limitInfo={probationLimitModal}
              onClose={() => setProbationLimitModal(null)}
            />
          )}
          {overlapConfirm && (
            <SameDayOverlapSheet
              onCancel={() => {
                setOverlapConfirm(null);
                setActiveJob({ id: overlapConfirm.jobId, mode: "locked" });
              }}
              onConfirm={() => {
                const id = overlapConfirm.jobId;
                const r = store.acceptJob(id, {
                  confirmSameDayOverlap: true,
                });
                setOverlapConfirm(null);
                if (!r.ok) {
                  if (r.reason === "probation_limit_reached") {
                    setProbationLimitModal({
                      limit: r.limit,
                      performedCount: r.performedCount,
                    });
                  } else if (r.reason === "driver_restricted") {
                    setBanner({ tone: "warn", text: t("blockedDriverBody") });
                  } else {
                    setBanner({ tone: "warn", text: t("toastAssignedElsewhere") });
                  }
                  setActiveJob({ id, mode: "locked" });
                  return;
                }
                setActiveJob({ id, mode: "unlocked" });
                setBookedSuccess(true);
              }}
            />
          )}
          {bookedSuccess && (
            <TourBookedSuccessSheet onClose={() => setBookedSuccess(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PwaDriverRoot — login gate for the installable /pwa surface. Mirrors the
 * client-preview App() gate: unauthenticated renders the same
 * DriverLoginScreen (standalone — no phone-mock chrome), authenticated
 * mounts the real PwaDriverApp. Kept as a separate component (not an early
 * return inside PwaDriverApp) so the session toggle never changes which
 * hooks a single component instance calls between renders.
 */
function PwaDriverRoot() {
  const store = useAuthStore();

  // Debug-only deep link for the not-yet-wired Set Password / Accept Invite
  // screen — no button or nav entry anywhere renders this; only reachable
  // by visiting e.g. /pwa/?screen=set-password&email=driver.one@demo.local&token=demo
  const debugParams = new URLSearchParams(window.location.search);
  if (debugParams.get("screen") === "set-password") {
    return (
      <DriverSetPasswordScreen
        email={debugParams.get("email") || ""}
        token={debugParams.get("token") || ""}
        standalone
      />
    );
  }

  return store.isDriverAuthenticated() ? (
    <PwaDriverApp />
  ) : (
    <DriverLoginScreen standalone />
  );
}

Object.assign(window, { PwaDriverApp, PwaDriverRoot });
