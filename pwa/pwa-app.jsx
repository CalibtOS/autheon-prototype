/* global React, AuthStore, useAuthStore, useI18n, TabBar, Portal, MyJobs, Infopoint, ProfilePaneFull, JobLocked, JobUnlocked, AcceptanceModal, ReportProblemSheet, PendingNotice, MarkPerformedSheet, ProbationLimitSheet, SameDayOverlapSheet, FilterSheet, DriverNotificationsPane */
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
  const [showNotifications, setShowNotifications] = useState(false);

  const handleOpenJob = (j, fromTab = tab) => {
    const portalLocked =
      j.status === "published" &&
      !store.isAccepted(j.id) &&
      !store.isPerformed(j.id);
    const mode = portalLocked ? "locked" : "unlocked";
    setActiveJob({ id: j.id, mode, fromTab });
  };
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
      />
    );
  } else if (tab === "info") {
    body = <Infopoint />;
  } else {
    body = <ProfilePaneFull />;
  }

  return (
    <div className="phone-shell pwa-viewport">
      {!pwa.isStandalone ? (
        <div className="pwa-mode-bar" role="region" aria-label={t("pwaInstallRegion")}>
          <div className="pwa-mode-bar-copy">
            <strong>{t("pwaInstallTitle")}</strong>
            <span>
              {pwa.canInstall
                ? t("pwaInstallSub")
                : pwa.swControlling
                  ? t("pwaInstallSubManual")
                  : t("pwaInstallSubPreparing")}
            </span>
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
              {pwa.isIos ? t("pwaInstallIosTitle") : t("pwaInstallManualTitle")}
            </h2>
            <ol>
              {pwa.isIos ? (
                <>
                  <li>{t("pwaInstallIosStep1")}</li>
                  <li>{t("pwaInstallIosStep2")}</li>
                  <li>{t("pwaInstallIosStep3")}</li>
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
              onClose={() => setShowNotifications(false)}
              onOpenJob={(job) => {
                setShowNotifications(false);
                handleOpenJob(job);
              }}
              onOpenInfopoint={() => {
                setShowNotifications(false);
                setTab("info");
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
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PwaDriverApp });
