/* global React, AuthStore, useAuthStore, useI18n, TabBar, Portal, MyJobs, Infopoint, ProfilePaneFull, JobLocked, JobUnlocked, AcceptanceModal, ReportProblemSheet, PendingNotice, MarkPerformedSheet, ProbationLimitSheet, SameDayOverlapSheet, FilterSheet, DriverNotificationsPane */
/**
 * PwaDriverApp — real-viewport shell for the /pwa responsive preview.
 *
 * This is the same application wiring as the DriverApp inside
 * `prototype/project/AUTHEON Prototype.html` (kept deliberately in sync),
 * minus the decorative phone-mockup chrome: no pwa-tag, no bezel notch,
 * no fake status bar. The device/browser provides the real viewport and
 * safe areas. All screens, components, state and business logic are the
 * shared window-exported components from driver.jsx / driver-ui.jsx —
 * nothing is reimplemented here.
 *
 * Layout differences live in pwa.css under `.phone-shell.pwa-viewport`.
 * The `.phone-shell` / `.phone` / `.phone-screen` class names are kept so
 * the ~300 shared component selectors in styles.css keep applying.
 *
 * NOTE: if the prototype's inline DriverApp gains new flows/modals,
 * mirror the change here.
 */
const { useState } = React;

function PwaDriverApp() {
  const store = useAuthStore();
  const { t } = useI18n();
  const [tab, setTab] = useState("portal");
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
