import fs from "fs";

const path = new URL("./i18n.js", import.meta.url);
let src = fs.readFileSync(path, "utf8");

function findLocale(name) {
  const patterns = [`\n  ${name}: {`, `\n${name}: {`, `  ${name}: {`];
  for (const p of patterns) {
    const idx = src.indexOf(p);
    if (idx >= 0) {
      const open = src.indexOf("{", idx);
      let depth = 0;
      for (let i = open; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") {
          depth--;
          if (depth === 0) return { start: open + 1, end: i };
        }
      }
    }
  }
  throw new Error("locale not found " + name);
}

function extractTopKeys(body) {
  const keys = new Set();
  const re = /^\s{6}([A-Za-z_][A-Za-z0-9_]*)\s*:/gm;
  let m;
  while ((m = re.exec(body))) keys.add(m[1]);
  return keys;
}

/** Remove a top-level key entry (single or multi-line string value). */
function removeKey(body, key) {
  const re = new RegExp(
    `\\n([ \\t]*)${key}\\s*:\\s*(?:` +
      // single-line value ending with comma
      `(?:[^\\n]+),\\s*` +
      `|` +
      // multi-line string: key:\n "...." ,  OR key: "....\n ..."
      `(?:\\n[ \\t]*"[^"]*",\\s*)` +
      `|` +
      `(?:"[^"]*\\n(?:[ \\t]*"[^"]*\\n)*[ \\t]*"[^"]*",\\s*)` +
      `|` +
      `(?:[\\s\\S]*?),\\n(?=[ \\t]*[A-Za-z_][A-Za-z0-9_]*\\s*:)` +
      `)`,
  );
  // Simpler line-based remover
  const lines = body.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(new RegExp(`^(\\s*)${key}\\s*:`));
    if (!m) {
      out.push(line);
      i++;
      continue;
    }
    // skip this key: consume until we have a complete entry ending with comma
    // at same indent level for next key, or until value closes
    let buf = line;
    i++;
    const indent = m[1];
    // If value complete on same line (ends with ,)
    if (/,\s*$/.test(buf) && !/:\s*$/.test(buf)) {
      continue; // drop
    }
    // Multi-line: keep reading until a line ends with `,` and looks like end of string value
    while (i < lines.length) {
      buf += "\n" + lines[i];
      const cur = lines[i];
      i++;
      if (/,\s*$/.test(cur)) {
        // peek: next non-empty should be another key or blank/end
        break;
      }
      // safety
      if (i - (out.length) > 20) break;
    }
    // dropped
  }
  return out.join("\n");
}

function upsertKey(body, key, valueLiteral) {
  // valueLiteral is the RHS including quotes, e.g. `"Enabled"` or multi-line
  const entry = `      ${key}: ${valueLiteral},`;
  if (new RegExp(`^\\s*${key}\\s*:`, "m").test(body)) {
    // replace existing via remove + insert near neighbors later — do remove then insert
    body = removeKey(body, key);
  }
  // Insert after a preferred anchor if present
  return { body, entry, key };
}

const REMOVE = [
  "adminUsersStatus_Active",
  "adminUsersStatus_Blocked",
  "adminUsersStatus_Inactive",
  "adminUsersAccountStatus_PendingVerification",
  "adminUsersAccountStatus_Active",
  "adminUsersAccountStatus_Suspended",
  "adminUsersAccountStatus_Inactive",
  "adminUsersAccountStatus_InviteFailed",
  "adminUsersAutoBadge",
  "adminUsersAutoBadgeTitle",
  "adminUsersBlock",
  "adminUsersActivate",
  "adminUsersDeactivate",
  "adminUsersSuspendAccount",
  "adminUsersReactivateAccount",
  "adminDriverBlockConfirmTitle",
  "adminDriverBlockConfirmBody",
  "adminDriverBlockConfirmAction",
  "adminDriverDeactivateConfirmTitle",
  "adminDriverDeactivateConfirmBody",
  "adminDriverDeactivateConfirmAction",
  "blockedDriverTitle",
  "blockedDriverStatusFallback",
  "blockedDriverBody",
  "driverInactiveByInactivityTitle",
  "driverInactiveByInactivityBody",
  "driverStatusActive",
  "adminNotifOperationalAccessAutoDisabled",
];

const EN = {
  accessEnabled: `"Enabled"`,
  accessDisabled: `"Disabled"`,
  operationalAccess: `"Operational access"`,
  accountAccess: `"Account access"`,
  filterAll: `"All"`,
  adminUsersEnableAccess: `"Enable"`,
  adminUsersDisableAccess: `"Disable"`,
  adminUsersFilterOperational: `"Operational access"`,
  adminUsersFilterAccount: `"Account access"`,
  adminDisableOperationalConfirmTitle: `"Disable operational access for {name}?"`,
  adminDisableOperationalConfirmBody: `"\\n        "{name} will no longer see the marketplace and cannot be assigned or accept new tours. Tours already assigned to them continue and can still be completed. You can re-enable access at any time."`,
  // fix below - better as single string
};

// Rebuild EN/DE maps cleanly
const ADD_EN = {
  accessEnabled: "Enabled",
  accessDisabled: "Disabled",
  operationalAccess: "Operational access",
  accountAccess: "Account access",
  filterAll: "All",
  adminUsersEnableAccess: "Enable",
  adminUsersDisableAccess: "Disable",
  adminUsersFilterOperational: "Operational access",
  adminUsersFilterAccount: "Account access",
  adminDisableOperationalConfirmTitle: "Disable operational access for {name}?",
  adminDisableOperationalConfirmBody:
    "{name} will no longer see the marketplace and cannot be assigned or accept new tours. Tours already assigned to them continue and can still be completed. You can re-enable access at any time.",
  adminDisableOperationalConfirmAction: "Disable access",
  adminDisableAccountConfirmTitle: "Disable account access for {name}?",
  adminDisableAccountConfirmBody:
    "{name} will be signed out and cannot sign in again until account access is re-enabled. This does not change their operational access.",
  adminDisableAccountConfirmAction: "Disable account",
  adminNotifOperationalAccessDisabled: "Operational access disabled",
  adminNotifOperationalAccessEnabled: "Operational access enabled",
  adminNotifAccountAccessDisabled: "Account access disabled",
  adminNotifAccountAccessEnabled: "Account access enabled",
  adminNotifReasonInactivity: "Reason: inactivity",
  adminNotifActorSystem: "System",
  adminNotifAccessRemovedAuto: "Access removed automatically (inactivity)",
  adminNotifAccessRemovalDeferred:
    "Access removal deferred — partner has open tours",
  adminNotifAutoRemovedMeta:
    "{name} · inactive {days} days · sign-in and marketplace both disabled",
  adminNotifDeferredMeta:
    "{name} · inactive {days} days · {count} open tours · marketplace removed, sign-in kept",
  driverAccessDisabledTitle: "Marketplace unavailable",
  driverAccessDisabledBody:
    "You cannot browse the marketplace or take on new tours right now. Tours already assigned to you are not affected — you can complete them and upload their documents as usual. Contact your dispatcher to have access restored.",
  driverNotifOperationalDisabledTitle: "Marketplace access paused",
  driverNotifOperationalDisabledBody:
    "You can still complete and upload documents for tours already assigned to you.",
  driverNotifOperationalEnabledTitle: "Marketplace access restored",
  driverNotifOperationalEnabledBody:
    "You can browse the marketplace and accept new tours again.",
  driverNotifAccountDisabledTitle: "Sign-in disabled",
  driverNotifAccountDisabledBody:
    "Your account can no longer be used to sign in. Contact your dispatcher.",
  driverNotifAccountEnabledTitle: "Sign-in restored",
  driverNotifAccountEnabledBody: "You can sign in to your account again.",
  driverAccessDeferredTitle:
    "Marketplace paused — your open tours are not affected",
  driverAccessDeferredBody:
    "Your account has been unused for a long time, so marketplace access has been paused and you cannot take on new tours. You can still sign in, and the tours already assigned to you continue as normal — you can complete them and upload their documents as usual.",
  driverAccessDeferredRestore:
    "Contact your dispatcher to have marketplace access restored — they can switch it back on right away.",
  driverAccessDeferredOpenTours: "{count} open tours",
  driverInactivityWarningTitle: "Your account will be deactivated in {days} days",
  driverInactivityWarningBody:
    "Your account has been unused for {inactive} days. If it stays unused, you will no longer be able to sign in and you will lose access to the marketplace. Signing in and working on a tour is enough to keep it active.",
  driverNotifAccountAutoDisabledTitle: "Account deactivated after inactivity",
  driverNotifAccountAutoDisabledBody:
    "Your account has not been used for {days} days, so sign-in and marketplace access have been switched off. Contact your dispatcher to have them restored.",
  driverNotifDeferredTitle: "Marketplace paused — your open tours continue",
  driverNotifDeferredBody:
    "Marketplace access has been paused because your account has been unused. You can still sign in and complete the tours already assigned to you. Contact your dispatcher to have marketplace access restored.",
};

const ADD_DE = {
  accessEnabled: "Aktiviert",
  accessDisabled: "Deaktiviert",
  operationalAccess: "Betriebszugang",
  accountAccess: "Kontozugang",
  filterAll: "Alle",
  adminUsersEnableAccess: "Aktivieren",
  adminUsersDisableAccess: "Deaktivieren",
  adminUsersFilterOperational: "Betriebszugang",
  adminUsersFilterAccount: "Kontozugang",
  adminDisableOperationalConfirmTitle:
    "Betriebszugang für {name} deaktivieren?",
  adminDisableOperationalConfirmBody:
    "{name} sieht den Marktplatz nicht mehr und kann keine neuen Touren zugewiesen bekommen oder annehmen. Bereits zugewiesene Touren laufen weiter und können abgeschlossen werden. Sie können den Zugang jederzeit wieder aktivieren.",
  adminDisableOperationalConfirmAction: "Zugang deaktivieren",
  adminDisableAccountConfirmTitle: "Kontozugang für {name} deaktivieren?",
  adminDisableAccountConfirmBody:
    "{name} wird abgemeldet und kann sich erst wieder anmelden, wenn der Kontozugang reaktiviert wird. Der Betriebszugang bleibt davon unberührt.",
  adminDisableAccountConfirmAction: "Konto deaktivieren",
  adminNotifOperationalAccessDisabled: "Betriebszugang deaktiviert",
  adminNotifOperationalAccessEnabled: "Betriebszugang aktiviert",
  adminNotifAccountAccessDisabled: "Kontozugang deaktiviert",
  adminNotifAccountAccessEnabled: "Kontozugang aktiviert",
  adminNotifReasonInactivity: "Grund: Inaktivität",
  adminNotifActorSystem: "System",
  adminNotifAccessRemovedAuto: "Zugang automatisch entzogen (Inaktivität)",
  adminNotifAccessRemovalDeferred:
    "Zugangsentzug zurückgestellt — Partner hat offene Touren",
  adminNotifAutoRemovedMeta:
    "{name} · {days} Tage inaktiv · Anmeldung und Marktplatz deaktiviert",
  adminNotifDeferredMeta:
    "{name} · {days} Tage inaktiv · {count} offene Touren · Marktplatz entzogen, Anmeldung bleibt",
  driverAccessDisabledTitle: "Marktplatz nicht verfügbar",
  driverAccessDisabledBody:
    "Sie können derzeit den Marktplatz nicht nutzen und keine neuen Touren übernehmen. Bereits zugewiesene Touren sind davon nicht betroffen — Sie können sie wie gewohnt abschließen und die zugehörigen Dokumente hochladen. Wenden Sie sich an Ihre Disposition, um den Zugang wiederherstellen zu lassen.",
  driverNotifOperationalDisabledTitle: "Marktplatzzugang pausiert",
  driverNotifOperationalDisabledBody:
    "Bereits zugewiesene Touren können Sie weiterhin abschließen und deren Dokumente hochladen.",
  driverNotifOperationalEnabledTitle: "Marktplatzzugang wiederhergestellt",
  driverNotifOperationalEnabledBody:
    "Sie können den Marktplatz wieder nutzen und neue Touren annehmen.",
  driverNotifAccountDisabledTitle: "Anmeldung deaktiviert",
  driverNotifAccountDisabledBody:
    "Ihr Konto kann nicht mehr für die Anmeldung verwendet werden. Wenden Sie sich an Ihre Disposition.",
  driverNotifAccountEnabledTitle: "Anmeldung wiederhergestellt",
  driverNotifAccountEnabledBody:
    "Sie können sich wieder in Ihrem Konto anmelden.",
  driverAccessDeferredTitle:
    "Marktplatz pausiert — Ihre offenen Touren sind nicht betroffen",
  driverAccessDeferredBody:
    "Ihr Konto wurde lange nicht genutzt, daher wurde der Marktplatzzugang pausiert und Sie können keine neuen Touren übernehmen. Sie können sich weiterhin anmelden, und Ihre bereits zugewiesenen Touren laufen normal weiter — Sie können sie abschließen und die zugehörigen Dokumente wie gewohnt hochladen.",
  driverAccessDeferredRestore:
    "Wenden Sie sich an Ihre Disposition, um den Marktplatzzugang wiederherstellen zu lassen — sie kann ihn sofort wieder aktivieren.",
  driverAccessDeferredOpenTours: "{count} offene Touren",
  driverInactivityWarningTitle: "Ihr Konto wird in {days} Tagen deaktiviert",
  driverInactivityWarningBody:
    "Ihr Konto wurde seit {inactive} Tagen nicht genutzt. Bleibt es ungenutzt, können Sie sich nicht mehr anmelden und verlieren den Zugang zum Marktplatz. Es genügt, sich anzumelden und an einer Tour zu arbeiten, um es aktiv zu halten.",
  driverNotifAccountAutoDisabledTitle: "Konto nach Inaktivität deaktiviert",
  driverNotifAccountAutoDisabledBody:
    "Ihr Konto wurde seit {days} Tagen nicht genutzt — Anmeldung und Marktplatzzugang wurden deaktiviert. Wenden Sie sich an Ihre Disposition, um sie wiederherstellen zu lassen.",
  driverNotifDeferredTitle:
    "Marktplatz pausiert — Ihre offenen Touren laufen weiter",
  driverNotifDeferredBody:
    "Der Marktplatzzugang wurde pausiert, da Ihr Konto nicht genutzt wurde. Sie können sich weiterhin anmelden und Ihre bereits zugewiesenen Touren abschließen. Wenden Sie sich an Ihre Disposition, um den Marktplatzzugang wiederherstellen zu lassen.",
};

const RETARGET_EN = {
  adminUsersColStatus: "Operational access",
  adminUsersColAccess: "Account access",
  adminUsersToastDriverChanged: "Operational access updated",
  adminUsersToastAccountStatusChanged: "Account access updated",
  adminAssignDriverInactive:
    "This service partner's operational access is disabled and they cannot be assigned new tours.",
  adminInactivityTitle: "Automatic access removal",
  adminInactivityBlurb:
    "Service partners who have not used their account for the configured period lose both sign-in and marketplace access. Partners who still have open tours keep their sign-in so they can finish them, and lose marketplace access instead — the account removal is retried automatically once their tours are closed.",
  adminInactivityEnabled:
    "Automatically remove access from inactive service partners",
  adminInactivityThreshold: "Remove access after (days without activity)",
  adminInactivityWarningHelp:
    "Any sign-in or action in the app counts as activity. The warning concerns losing sign-in and marketplace access. Set the warning to 0 to remove access without notice.",
  adminInactivityWarningTooLate:
    "The warning must come before access removal — enter fewer days than the threshold.",
  adminInactivityRunResult:
    "Inactivity check complete: {removed} account access removed, {deferred} deferred (operational access removed instead), {warned} warned.",
  adminInactivitySave: "Save access removal policy",
};

const RETARGET_DE = {
  adminUsersColStatus: "Betriebszugang",
  adminUsersColAccess: "Kontozugang",
  adminUsersToastDriverChanged: "Betriebszugang aktualisiert",
  adminUsersToastAccountStatusChanged: "Kontozugang aktualisiert",
  adminAssignDriverInactive:
    "Der Betriebszugang dieses Servicepartners ist deaktiviert — es können keine neuen Touren zugewiesen werden.",
  adminInactivityTitle: "Automatischer Zugangsentzug",
  adminInactivityBlurb:
    "Servicepartner, die ihr Konto über den eingestellten Zeitraum nicht genutzt haben, verlieren sowohl die Anmeldung als auch den Marktplatzzugang. Partner mit noch offenen Touren behalten ihre Anmeldung, um diese abschließen zu können, und verlieren stattdessen den Marktplatzzugang — der Kontoentzug wird automatisch wiederholt, sobald die Touren abgeschlossen sind.",
  adminInactivityEnabled:
    "Inaktiven Servicepartnern automatisch den Zugang entziehen",
  adminInactivityThreshold: "Zugang entziehen nach (Tagen ohne Aktivität)",
  adminInactivityWarningHelp:
    "Jede Anmeldung oder Aktion in der App zählt als Aktivität. Die Warnung betrifft den Verlust von Anmeldung und Marktplatzzugang. Setzen Sie die Warnung auf 0, um den Zugang ohne Vorankündigung zu entziehen.",
  adminInactivityWarningTooLate:
    "Die Warnung muss vor dem Zugangsentzug liegen — geben Sie weniger Tage als den Schwellenwert ein.",
  adminInactivityRunResult:
    "Inaktivitätsprüfung abgeschlossen: {removed} Kontozugänge entzogen, {deferred} zurückgestellt (stattdessen Betriebszugang entzogen), {warned} gewarnt.",
  adminInactivitySave: "Regel für Zugangsentzug speichern",
};

function formatEntry(key, value) {
  if (value.length > 88 || value.includes('"')) {
    // escape inner quotes
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `      ${key}:\n        "${escaped}",`;
  }
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `      ${key}: "${escaped}",`;
}

function patchBody(body, { remove, add, retarget }) {
  let next = body;
  for (const key of remove) {
    next = removeKey(next, key);
  }
  for (const [key, value] of Object.entries(retarget)) {
    if (new RegExp(`^\\s*${key}\\s*:`, "m").test(next)) {
      next = removeKey(next, key);
    }
    // will re-add via add map merge
    add[key] = value;
  }
  // Remove then re-add all add keys so values are canonical
  for (const key of Object.keys(add)) {
    if (new RegExp(`^\\s*${key}\\s*:`, "m").test(next)) {
      next = removeKey(next, key);
    }
  }
  // Insert block after appTheme if present, else at start
  const entries = Object.entries(add)
    .map(([k, v]) => formatEntry(k, v))
    .join("\n");
  const anchor = next.match(/\n(\s*appTheme:\s*"[^"]*",\s*\n)/);
  if (anchor) {
    next = next.replace(anchor[0], anchor[0] + entries + "\n");
  } else {
    // after first newline
    next = "\n" + entries + next;
  }
  return next;
}

const en = findLocale("en");
const de = findLocale("de");

let enBody = src.slice(en.start, en.end);
let deBody = src.slice(de.start, de.end);

const beforeEn = extractTopKeys(enBody).size;
const beforeDe = extractTopKeys(deBody).size;

enBody = patchBody(enBody, {
  remove: REMOVE,
  add: { ...ADD_EN },
  retarget: RETARGET_EN,
});
deBody = patchBody(deBody, {
  remove: REMOVE,
  add: { ...ADD_DE },
  retarget: RETARGET_DE,
});

src = src.slice(0, en.start) + enBody + src.slice(en.end);
// re-find de after en mutation (de offsets shift if en length changed)
const de2 = (() => {
  // recompute on new src
  const patterns = [`\n  de: {`, `\nde: {`, `  de: {`];
  for (const p of patterns) {
    const idx = src.indexOf(p);
    if (idx >= 0) {
      const open = src.indexOf("{", idx);
      let depth = 0;
      for (let i = open; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") {
          depth--;
          if (depth === 0) return { start: open + 1, end: i };
        }
      }
    }
  }
  throw new Error("de not found after en patch");
})();

// We already patched deBody from old src; but if en grew, we need to replace current de body.
// Re-extract current de body and apply same logical patch from ORIGINAL deBody we already have.
src = src.slice(0, de2.start) + deBody + src.slice(de2.end);

fs.writeFileSync(path, src);

const en3 = findLocale("en");
// refresh src already written — re-read
src = fs.readFileSync(path, "utf8");
const enF = findLocale("en");
const deF = findLocale("de");
const enKeys = extractTopKeys(src.slice(enF.start, enF.end));
const deKeys = extractTopKeys(src.slice(deF.start, deF.end));
const onlyEn = [...enKeys].filter((k) => !deKeys.has(k)).sort();
const onlyDe = [...deKeys].filter((k) => !enKeys.has(k)).sort();
console.log("before", beforeEn, beforeDe);
console.log("after", enKeys.size, deKeys.size);
console.log("onlyEn", onlyEn.length, onlyEn.slice(0, 20));
console.log("onlyDe", onlyDe.length, onlyDe.slice(0, 20));
for (const k of REMOVE) {
  if (enKeys.has(k) || deKeys.has(k))
    console.log("STILL PRESENT", k, enKeys.has(k), deKeys.has(k));
}
for (const k of Object.keys(ADD_EN)) {
  if (!enKeys.has(k) || !deKeys.has(k))
    console.log("MISSING ADD", k, enKeys.has(k), deKeys.has(k));
}
console.log("done");
