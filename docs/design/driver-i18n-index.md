# Driver PWA — i18n Key Index

> Auto-generated from `i18n.js` + t() usage in `driver.jsx`, `driver-ui.jsx` and the shared
> vehicle-domain label resolvers in `store.js`.
> Regenerate: `node prototype/project/_export-driver-i18n.mjs`

Supported languages: **EN** and **DE**. Every driver-facing string is looked up through `t()`;
no language literal belongs in a component. Pluralized accessible names use `tPlural(key, count)`
(resolving `<key>_one` / `<key>_other`) — see Marketplace filter keys below.

## Vehicle domain (client confirmation "Systemlogik Fahrzeugeingabe", 2026-07-26)

Canonical value → key mapping. Labels are **never** hardcoded in a component; the
resolvers `AuthStore.vehicleTypeLabel` / `transportTypeLabel` /
`registrationStatusLabel` own this mapping for both apps.

| Category | Canonical value | Key |
|---|---|---|
| Vehicle type (exactly one) | `passenger_car` | `vehicleTypePassengerCar` |
| Vehicle type | `truck_up_to_7_5_t` | `vehicleTypeTruckUpTo75t` |
| Vehicle type | `truck_over_7_5_t` | `vehicleTypeTruckOver75t` |
| Transport type (exactly one) | `own_axle` | `ownAxle` |
| Transport type | `third_party_axle` | `thirdPartyAxle` |
| Registration status (exactly one) | `registered` | `vehicleInfoRegistered` |
| Registration status | `deregistered` | `vehicleInfoDeregistered` |
| Characteristic (independent) | `electricVehicle` | `vehicleInfoElectric` |
| Characteristic (independent) | `readyToDrive` | `vehicleReadyToDrive` (+ `vehicleReadyToDriveApplicability`) |
| Derived requirement | `requiresRedLicencePlates === true` | `redPlatesRequired` (+ `redPlatesRequiredDetail`) |

Field labels: `vehicleType` · `manufacturer` (+ `manufacturerPh`) · `newOrderModel` ·
`officialLicencePlate` (+ `officialLicencePlateHint`) · `vin` (+ `newOrderVinLen`,
`newOrderVinLengthError`) · `transportType` · `registrationStatus` ·
`vehicleCharacteristics`.

**Deprecated / removed 2026-07-26** (confirmed unused before removal — no `t()`
reference remained in `admin.jsx`, `driver.jsx`, `driver-ui.jsx` or `store.js`):
`axle`, `axleConfiguration`, `orderFieldAxle` (→ `orderFieldTransportType`),
`vehicleInfoRedPlates`, `redPlateNumber`, `orderFieldRedPlates`,
`orderFieldRedPlateNumber`, `newOrderRedPlatePh`, `newOrderRedPlateHint`,
`newOrderPlateHiddenDeregistered`, `newOrderRegistrationNone`,
`newOrderRegistrationLabel`, `newOrderVtSuv`, `newOrderVtPkw`,
`newOrderVtTransporter`, `newOrderVtClassic`, `lightTruck`, `adminVehicleTrp`,
`newOrderVinShortNotice`, `newOrderBrand`, `newOrderBrandPh`,
`vehicleTypeLegacy`, `vehicleTypeLegacyHint`.
Removed vehicle types have no key at all — they are not storable values.

---

## Primary-screen header keys

The four primary screens share one header component (`DriverScreenHeader`, see
[`driver-screen-spec.md`](driver-screen-spec.md)). These keys are the header's contract —
every one of them is load-bearing:

| Screen | Title key | Subtitle key |
|--------|-----------|--------------|
| Marketplace | `marketplace` | `exploreJobs` |
| My Orders | `myJobs` | `myJobsSubtitle` |
| Infopoint | `infopoint` | `infopointSubtitle` |
| Profile | `profileTitle` | `profileSubtitle` |

**Notification action (all four screens):** `driverNotifications` is the translated accessible
name of the header notification button. When the unread count is > 0 the component renders
`` `${driverNotifications} (${count})` `` — e.g. "Notifications (3)" / "Benachrichtigungen (3)" —
so the unread count reaches screen readers as text and the visual badge is never the only signal.
Do not remove or repurpose this key, and keep any translation short enough to stay legible as a
button label.

## Marketplace filter keys

**Languages:** the Driver PWA ships **English (`en`)** and **German (`de`)** only. Every key
below exists in both; `de` is the client-facing locale.

| Key | Used for |
|-----|----------|
| `filters` | Filter panel heading, and the filter button's accessible name when **no** filters are applied |
| `filtersApplied_one` / `filtersApplied_other` | Filter button's accessible name when filters ARE applied — resolved by `tPlural("filtersApplied", count)` |
| `reset` | Clears the draft selections inside the open filter panel |
| `showResults` | Filter panel's apply CTA — `{count}` here is the number of **matching orders**, not the filter count |
| `removeFilterChip` | Accessible name of each removable applied-filter chip |

### Pluralization

`t()` interpolates `{token}` but has no plural support. `tPlural(key, count, vars?)`
(added 2026-07-27, `i18n.js`) resolves `<key>_one` / `<key>_other` and injects `{count}`.
Both driver locales have simple one/other plural categories, so two forms are sufficient.

Whole sentences live in the translation files — components must **not** concatenate fragments
(`count + " filters applied"`), because German word order differs and concatenation cannot be
translated. Correct usage:

```js
aria-label={count ? tPlural("filtersApplied", count) : t("filters")}
```

| Count | EN | DE |
|-------|----|----|
| 0 | Filters | Filter |
| 1 | Filters, 1 applied | Filter, 1 aktiv |
| 3 | Filters, 3 applied | Filter, 3 aktiv |

> The badge itself is `aria-hidden`; this accessible name is the only thing assistive tech
> announces, so the count must stay inside it.

---

### Deprecated / removed

| Key | Status | Reason |
|-----|--------|--------|
| `welcomeBack` | **Removed 2026-07-26** (EN + DE) | The Marketplace greeting block (avatar + "Welcome back," + driver name) was removed by client decision and was not relocated. The key had no other consumer. |
| `kpiAvailableJobs`, `kpiBookedJobs`, `kpiOpenDocuments` | **Orphaned** — still defined in `i18n.js`, not referenced by any `t()` | The Marketplace KPI chip row is not currently rendered. Retained pending a client decision on whether the row returns; see audit item 22. |

---

## Document upload (source selection, 2026-07-27)

The upload-source action sheet and the document rows use these keys. Where a concept already had a key,
it was reused rather than duplicated.

| Concept | Key | Note |
|---------|-----|------|
| Add document (sheet title) | `uploadSourceTitle` | new |
| Take photo | `uploadSourcePhoto` | new |
| Camera (photo action description) | `uploadSourcePhotoDesc` | new |
| Choose file | `uploadSourceFile` | new |
| Select PDF or image from device | `uploadSourceFileDesc` | new |
| Unsupported file type | `invoiceUploadInvalidType` | existing, reused |
| File too large | `invoiceUploadTooLarge` | new — mirrors the advertised 25 MB limit |
| PDF document (accessible file kind) | `docKindPdf` (+ `docKindImage`, `docKindFile`) | new — the extension badge is decorative, so the kind is also exposed as text |
| Upload failed | reason-specific keys via `tourDocUploadErrorMessage()`: `invoiceUploadInvalidType`, `invoiceUploadTooLarge`, `invoiceUploadRestricted`, `invoiceUploadNotYourTour`, `invoiceUploadTourRequired`, `tourDocRequiresPerformed`, `tourDocReplaceNotAllowed`, `tourDocReplaceNotOwner`, `tourDocOfficialNotReplaceable` | existing — there is deliberately no generic "upload failed" string; the driver always gets the actual reason |
| Upload in progress | — | **no key**: the prototype store commits the attachment synchronously, so there is no progress state to label. Add one only when a real async upload lands |
| Remove document | `removeDocTitle`, `removeDocBody`, `removeDocConfirm`, `removeDocBlocked` | existing, reused |
| Replace document | `tourDocReplaceButton`, `tourDocReplaceNotAllowed`, `tourDocReplaceNotOwner` | existing, reused |
| Upload succeeded | `tourDocUploadSuccess` | existing, reused |
| Size/type hints on the dropzone | `performedUploadHintEmpty`, `myDocsUploadHint` | existing — must stay in sync with the enforced 25 MB limit |

---

## Notification keys (type-aware cards + deep links, 2026-07-29)

Notification **category** labels are resolved from a DYNAMIC key —
`t(store.notificationCategoryI18nKey(row.type))`, where the store maps `notification_type` to one of
four category codes. A literal-scanning indexer cannot see them, so they are listed here to keep them
from looking unused and being deleted:

| Category code | Key | EN | DE |
|---------------|-----|----|----|
| `order` | `notifCategoryOrder` | Order | Auftrag |
| `account` | `notifCategoryAccount` | Account | Konto |
| `system` | `notifCategorySystem` | System | System |
| `general_information` | `notifCategoryGeneralInfo` | General information | Allgemeine Information |

The taxonomy is **derived from the type and never stored**, so adding a category means one entry in
the store map plus one key here — never a migration.

### Notification titles and bodies

Notification copy is resolved **when the notification is created**, in `store.js` via the store's
own `t2()` helper — not in the component. A literal-scanning indexer over `driver.jsx` does not see
these either:

| Event | Title key | Body key |
|-------|-----------|----------|
| Newly published matching order | `notifNewPublishedJobTitle` | `notifNewPublishedJobBody` (`{from}`, `{to}`) |
| Booked order updated | `notifOrderUpdatedTitle` (`{tour}`) | `notifOrderUpdatedIntro` + per-field diff lines |
| Cancelled by Autheon | `notifOrderCancelledByAutheonTitle` | `notifOrderCancelledByAutheonBody` (`{tour}`) |
| Empty run recognised / not recognised | `notifEmptyRunRecognisedTitle` / `notifEmptyRunNotRecognisedTitle` | `notifEmptyRunRecognisedBody` / `notifEmptyRunNotRecognisedBody` (`{tour}`) |
| Document accepted | `notifDocumentAcceptedTitle` | `notifDocumentAcceptedBody` (`{file}`) |
| Document rejected | `notifDocumentRejectedTitle` | the admin's rejection reason, falling back to `notifDocumentRejectedBody` |
| Profile change sent / approved / declined | `notifMasterDataSentTitle` / `notifMasterDataApprovedTitle` / `notifMasterDataRejectedTitle` | `notifMasterDataSentBody` / `notifMasterDataApprovedBody` / `notifMasterDataRejectedBody` |
| Sign-in email changed | `emailChangedNotifyTitle` | `emailChangedNotifyBody` (`{email}`) |
| New Infopoint message | the message's own subject | the message's own text (truncated) |

> Copy is frozen at creation time, matching the pre-existing behaviour of every other notification in
> the store. Production should store a message **key + params** and translate on read, so a driver who
> switches language sees their history in the new one.

### Unavailable targets

A notification whose target is gone states why. One reason code → one key, resolved through a single
map (`NOTIF_UNAVAILABLE_I18N`, `driver.jsx`) so no screen invents its own wording:

| Reason | Key |
|--------|-----|
| `taken` (booked by another partner) | `notifUnavailableTaken` |
| `withdrawn` (back to draft) | `notifUnavailableWithdrawn` |
| `cancelled` | `notifUnavailableCancelled` |
| `closed` (performed / empty-run terminal) | `notifUnavailableClosed` |
| `unavailable` (fallback) | `notifUnavailableGeneric` |
| `order_gone` / `message_gone` / `document_gone` | `notifOrderGone` / `notifMessageGone` / `notifDocumentGone` |
| `not_permitted` | `notifNotPermitted` |
| `notification_missing` | `notifTargetUnavailable` |

There is deliberately **no** generic "something went wrong" string — the driver always gets the actual
reason, the same principle the upload errors follow above.

### Removed

| Key | Status | Reason |
|-----|--------|--------|
| `driverNotifInfopointHint` | **Removed 2026-07-29** (EN + DE) | "Also in Infopoint → New messages" described where to find a message. The card now deep-links to that exact message, so the hint had no purpose and no other consumer. |

---

## All driver keys in use

| Key | EN | DE |
|-----|----|----|
| `acceptThisTour` | Accept this tour? | Diese Tour annehmen? |
| `acceptTour` | Accept tour | Tour annehmen |
| `acceptanceLegal` | Acceptance is binding. After commitment, use Report Problem to cancel the order or report an empty run. | Die Annahme ist verbindlich. Danach Problem melden nutzen, um den Auftrag zu stornieren oder eine Leerfahrt zu melden. |
| `acceptedActive` | Accepted · active | Angenommen · aktiv |
| `accountEmailPending` | Change pending | Änderung ausstehend |
| `accountSigninHint` | This is your sign-in email. You control it — no operations approval needed. | Das ist Ihre Anmelde-E-Mail. Sie verwalten sie selbst — keine Freigabe durch den Betrieb nötig. |
| `accountStatus` | Account status | Kontostatus |
| `active` | Active | Aktiv |
| `addPlzArea` | Add | Hinzufügen |
| `all` | All | Alle |
| `appAppearanceHint` | Language and display preferences for this device. | Sprache und Anzeigeeinstellungen für dieses Gerät. |
| `appLanguage` | Language | Sprache |
| `appTheme` | Theme | Design |
| `assignedDirectlyNotice` | Assigned directly by admin. | Direkt vom Administrator zugewiesen. |
| `assignedShort` | Assigned | Zugewiesen |
| `authDemoFillButton` | Fill demo credentials | Demo-Zugangsdaten einfügen |
| `authDriverForgotBackToLogin` | Back to sign in | Zurück zur Anmeldung |
| `authDriverForgotEmailLabel` | Email | E-Mail |
| `authDriverForgotEmailPlaceholder` | user@example.com | user@example.com |
| `authDriverForgotOtpBack` | Go back | Zurück |
| `authDriverForgotOtpIncorrectCode` | Incorrect code. Please try again. | Falscher Code. Bitte versuchen Sie es erneut. |
| `authDriverForgotOtpInvalidCode` | Enter a valid {length}-digit code | Bitte geben Sie einen gültigen {length}-stelligen Code ein |
| `authDriverForgotOtpResendButton` | Resend code | Code erneut senden |
| `authDriverForgotOtpResendCooldownPrefix` | Resend code in  | Code erneut senden in  |
| `authDriverForgotOtpSubmit` | Verify code | Code bestätigen |
| `authDriverForgotOtpSubtitlePrefix` | 6-digit code has been sent to  | Ein 6-stelliger Code wurde gesendet an  |
| `authDriverForgotOtpTitle` | Enter OTP | OTP eingeben |
| `authDriverForgotSubmit` | Send code | Code senden |
| `authDriverForgotSubtitle` | We will send 6-digit code to your email | Wir senden Ihnen einen 6-stelligen Code per E-Mail |
| `authDriverForgotTitle` | Enter your email | E-Mail eingeben |
| `authDriverLoginEmailLabel` | Email | E-Mail |
| `authDriverLoginEmailPlaceholder` | user@example.com | user@example.com |
| `authDriverLoginForgotPassword` | Forget password? | Passwort vergessen? |
| `authDriverLoginHidePassword` | Hide password | Passwort verblenden |
| `authDriverLoginPasswordLabel` | Password | Passwort |
| `authDriverLoginPasswordPlaceholder` | password | passwort |
| `authDriverLoginShowPassword` | Show password | Passwort anzeigen |
| `authDriverLoginSubmit` | Login | Anmelden |
| `authDriverLoginSubtitle` | You get your credentials from the admin | Ihre Zugangsdaten erhalten Sie vom Administrator |
| `authDriverLoginTitle` | Login | Anmelden |
| `authDriverResetBack` | Go back | Zurück |
| `authDriverResetConfirmLabel` | Confirm New Password | Neues Passwort bestätigen |
| `authDriverResetConfirmPlaceholder` | confirm new password | passwort bestätigen |
| `authDriverResetConfirmRequired` | Please confirm your password | Bitte bestätigen Sie Ihr Passwort |
| `authDriverResetMinLength` | Password must be at least 8 characters | Das Passwort muss mindestens 8 Zeichen lang sein |
| `authDriverResetMismatch` | Passwords do not match | Die Passwörter stimmen nicht überein |
| `authDriverResetPasswordLabel` | New Password | Neues Passwort |
| `authDriverResetPasswordPlaceholder` | new password | neues passwort |
| `authDriverResetSubmit` | Reset password | Passwort zurücksetzen |
| `authDriverResetSubtitle` | Enter your new password | Geben Sie Ihr neues Passwort ein |
| `authDriverResetTitle` | Reset password | Passwort zurücksetzen |
| `authDriverSetPasswordComplexity` | Password must contain at least one uppercase letter, one lowercase letter, and one number | Das Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten |
| `authDriverSetPasswordConfirmLabel` | Confirm password | Passwort bestätigen |
| `authDriverSetPasswordConfirmPlaceholder` | confirm password | passwort bestätigen |
| `authDriverSetPasswordConfirmRequired` | Please confirm your password | Bitte bestätigen Sie Ihr Passwort |
| `authDriverSetPasswordInvalidLinkHint` | Ask your administrator to send a new invitation email. | Bitten Sie Ihren Administrator, eine neue Einladungs-E-Mail zu senden. |
| `authDriverSetPasswordInvalidLinkMessage` | This password setup link is invalid or has expired. | Dieser Link zum Passwort festlegen ist ungültig oder abgelaufen. |
| `authDriverSetPasswordInvalidLinkTitle` | Invalid link | Ungültiger Link |
| `authDriverSetPasswordMinLength` | Password must be at least 8 characters | Das Passwort muss mindestens 8 Zeichen lang sein |
| `authDriverSetPasswordMismatch` | Passwords do not match | Die Passwörter stimmen nicht überein |
| `authDriverSetPasswordPasswordLabel` | Password | Passwort |
| `authDriverSetPasswordPasswordPlaceholder` | password | passwort |
| `authDriverSetPasswordSubmit` | Set password | Passwort festlegen |
| `authDriverSetPasswordSubtitle` | Create a password to access your account | Erstellen Sie ein Passwort für Ihren Zugang |
| `authDriverSetPasswordTitle` | Set your password | Passwort festlegen |
| `authErrorAccountRestricted` | This account is blocked. Contact your admin. | Dieses Konto ist gesperrt. Wenden Sie sich an Ihren Administrator. |
| `authErrorEmailRequired` | Email is required. | E-Mail ist erforderlich. |
| `authErrorInvalidCredentials` | Invalid email or password. | Ungültige E-Mail-Adresse oder ungültiges Passwort. |
| `authErrorInvalidEmail` | Enter a valid email address. | Bitte geben Sie eine gültige E-Mail-Adresse ein. |
| `authErrorPasswordRequired` | Password is required. | Passwort ist erforderlich. |
| `authForgotPasswordDemoHint` | Prototype: the 6-digit code sent to your email is {code}. | Prototyp: Der 6-stellige Code, der an Ihre E-Mail gesendet wurde, lautet {code}. |
| `authForgotPasswordSuccessNotice` | Password reset successful. Please sign in with your new password. | Passwort erfolgreich zurückgesetzt. Bitte melden Sie sich mit Ihrem neuen Passwort an. |
| `authLanguageSelectLabel` | Language | Sprache |
| `authOtpFieldAriaLabel` | One-time code | Einmaliger Code |
| `authSwitchToDarkTheme` | Switch to dark theme | Zu dunklem Design wechseln |
| `authSwitchToLightTheme` | Switch to light theme | Zu hellem Design wechseln |
| `back` | Back | Zurück |
| `bindingAcceptance` | Binding acceptance | Verbindliche Annahme |
| `blockedDriverBody` | Marketplace access and new tour acceptance are restricted for blocked drivers. Use My Jobs to correct documents on existing tours. Profile, Info, and historical jobs remain visible in this prototype. | Marktplatzzugriff und neue Tour-Annahmen sind für blockierte Fahrer eingeschränkt. Nutzen Sie Meine Aufträge, um Dokumente bestehender Touren zu korrigieren. Profil, Info und historische Touren bleiben in diesem Prototyp sichtbar. |
| `blockedDriverStatusFallback` | Restricted | Eingeschränkt |
| `blockedDriverTitle` | Marketplace unavailable | Marktplatz nicht verfügbar |
| `cancel` | Cancel | Abbrechen |
| `cancelled` | Cancelled | Storniert |
| `cancelledSub` | Removed from marketplace and active lists. | Aus Marktplatz und aktiven Listen entfernt. |
| `changeEmailBack` | Change address | Adresse ändern |
| `changeEmailCodeGroupLabel` | 6-digit confirmation code | 6-stelliger Bestätigungscode |
| `changeEmailCodeNotice` | We'll send a 6-digit code to your new address to confirm it's yours. | Wir senden einen 6-stelligen Code an Ihre neue Adresse, um zu bestätigen, dass sie Ihnen gehört. |
| `changeEmailCodeSentTo` | Sent to {email} | Gesendet an {email} |
| `changeEmailCodeTitle` | Enter confirmation code | Bestätigungscode eingeben |
| `changeEmailConfirm` | Confirm change | Änderung bestätigen |
| `changeEmailCurrentPrefix` | Current | Aktuell |
| `changeEmailDemoHint` | Prototype: the 6-digit code sent to your new address is {code}. | Prototyp: Der an Ihre neue Adresse gesendete 6-stellige Code lautet {code}. |
| `changeEmailDigitLabel` | Digit {n} | Ziffer {n} |
| `changeEmailDone` | Done | Fertig |
| `changeEmailNewLabel` | New email address | Neue E-Mail-Adresse |
| `changeEmailNewPlaceholder` | name@company.com | name@firma.de |
| `changeEmailResend` | Resend code | Code erneut senden |
| `changeEmailResendIn` | Resend in {time} | Erneut senden in {time} |
| `changeEmailSendCode` | Send code | Code senden |
| `changeEmailSuccessBody` | Your sign-in email is now {email}. Use it the next time you sign in. | Ihre Anmelde-E-Mail lautet jetzt {email}. Verwenden Sie sie bei Ihrer nächsten Anmeldung. |
| `changeEmailSuccessTitle` | Email updated | E-Mail aktualisiert |
| `changeEmailTitle` | Change email address | E-Mail-Adresse ändern |
| `chars30Required` | characters (min. 30) | Zeichen (mind. 30) |
| `close` | Close | Schließen |
| `completionBlocked` | Completion is only available while the tour is Assigned or Accepted. | Abschluss ist nur bei Zugewiesen oder Akzeptiert verfügbar. |
| `confirm` | — | — |
| `contact` | Contact | Kontakt |
| `contactsPhones` | On-site contacts and phones | Vor-Ort-Kontakte und Telefonnummern |
| `correctionRequiredBadge` | Correction | Korrektur |
| `customerLabel` | Customer | Kunde |
| `dateWindow` | Date window | Datumsfenster |
| `delivery` | Delivery | Übergabe |
| `deliveryContact` | Delivery Contact | Ansprechpartner Lieferung |
| `deliveryPlzTwoDigits` | Delivery Postal Code (first 2 digits) | Zustell-PLZ (erste 2 Ziffern) |
| `deliveryTime` | Delivery Time | Lieferzeit |
| `destination` | Destination | Ziel |
| `dismiss` | Dismiss | Schließen |
| `dispatchNotes` | Dispatch notes | Hinweise der Disposition |
| `dispatcherHotlineSub` | Mon-Fri 07:00-22:00 CET (demo) | Mo-Fr 07:00-22:00 CET (Demo) |
| `docCategoryLegal` | Legal | Rechtliches |
| `docCategoryOperations` | Operations | Betrieb |
| `docCategorySafety` | Safety | Sicherheit |
| `docDriverTerms` | Driver terms | Fahrerbedingungen |
| `docEmergencyContacts` | Emergency contacts | Notfallkontakte |
| `docGeneralWorkInstructions` | General work instructions | Allgemeine Arbeitsanweisungen |
| `docImprint` | Imprint | Impressum |
| `docKindFile` | File | Datei |
| `docKindImage` | Image file | Bilddatei |
| `docKindPdf` | PDF document | PDF-Dokument |
| `docPrivacyPolicy` | Privacy policy | Datenschutzerklärung |
| `docReviewAccepted` | Accepted | Akzeptiert |
| `docReviewCorrectionRequired` | Correction required | Korrektur nötig |
| `docReviewRejected` | Rejected | Abgelehnt |
| `docReviewUploaded` | Uploaded | Hochgeladen |
| `docScopeGlobal` | Global | Global |
| `documentPreviewTitle` | Document preview | Dokumentvorschau |
| `download` | Download | Herunterladen |
| `driverAcceptOverlapConfirm` | You already have another tour on this day. Accept anyway? | Sie haben an diesem Tag bereits eine andere Tour. Trotzdem annehmen? |
| `driverAcceptOverlapConfirmBtn` | Accept anyway | Trotzdem annehmen |
| `driverAcceptOverlapTitle` | Same-day tour overlap | Tour-Überschneidung am selben Tag |
| `driverCancellationReasonLabel` | Reason | Grund |
| `driverCode` | driver-id | Fahrer-ID |
| `driverNotifications` | Notifications | Benachrichtigungen |
| `driverNotificationsAllRead` | All caught up | Alles gelesen |
| `driverNotificationsEmpty` | No notifications yet. | Noch keine Benachrichtigungen. |
| `driverNotificationsSub` | Tour and document updates | Tour- und Dokument-Updates |
| `driverOffer` | Driver offer | Fahrerangebot |
| `driverProbationLimitReached` | You are still on probation. Complete {limit} tours marked Performed before booking more (currently {performed} Performed). | Sie sind noch in der Probezeit. Schließen Sie {limit} Touren mit Status Durchgeführt ab, bevor Sie weitere buchen (aktuell {performed} Durchgeführt). |
| `driverProbationLimitTitle` | Probation booking limit | Probezeit-Buchungslimit |
| `driverProbationProfileAtLimit` | Initial booking allowance used — complete Performed tours to be released | Initiale Buchungsanzahl erreicht — schließen Sie Durchgeführt-Touren ab zur Freigabe |
| `driverProbationProfileRemaining` | {remaining} initial booking slot(s) remaining before you must complete Performed tours | Noch {remaining} initiale Buchungsplätze, danach müssen Touren durchgeführt sein |
| `driverProbationProfileTitle` | Probation progress | Probezeit-Fortschritt |
| `driverProbationProfileUsage` | {performed} of {limit} tours Performed · {taken} booked so far | {performed} von {limit} Touren durchgeführt · {taken} bisher gebucht |
| `driverStatusActive` | Active | Aktiv |
| `driverTourCancelledNotice` | Dispatch cancelled this tour. The message below explains why — no further action is required on your side. | Die Disposition hat diese Tour storniert. Die Nachricht unten erklärt warum — es sind keine weiteren Schritte nötig. |
| `dropPlz` | Drop PLZ {plz} | Ziel-PLZ {plz} |
| `emergencyDispatchNotice` | Emergency dispatch: Mon-Fri 07:00-22:00 CET. Incidents, delays, and anomalies must be reported immediately. | Notfall-Disposition: Mo-Fr 07:00-22:00 CET. Vorfälle, Verzögerungen und Auffälligkeiten müssen sofort gemeldet werden. |
| `emptyRunDescLabel` | Description (required) | Beschreibung (erforderlich) |
| `emptyRunDescPlaceholder` | Describe the situation (min. 30 characters). | Beschreiben Sie den Sachverhalt (mind. 30 Zeichen). |
| `emptyRunEvidenceHint` | Optional — you can submit without an upload. | Optional — Sie können ohne Upload absenden. |
| `emptyRunEvidenceLabel` | Photo / evidence (optional) | Foto / Nachweis (optional) |
| `emptyRunPendingLock` | This report is with Autheon for review and can no longer be changed. | Diese Meldung liegt Autheon zur Prüfung vor und kann nicht mehr geändert werden. |
| `emptyRunReasonKeyDocs` | Vehicle key or required documents missing | Fahrzeugschlüssel oder erforderliche Unterlagen fehlen |
| `emptyRunReasonLabel` | Reason | Grund |
| `emptyRunReasonNotOperational` | Vehicle is technically not operational | Fahrzeug ist technisch nicht fahrbereit |
| `emptyRunReasonNotPresent` | Vehicle not present / cannot be found at the location | Fahrzeug ist am angegebenen Standort nicht vorhanden oder nicht auffindbar |
| `emptyRunReasonNotReleased` | Vehicle is not being released | Fahrzeug wird nicht herausgegeben |
| `emptyRunReasonNotRoadworthy` | Vehicle is not roadworthy | Fahrzeug ist nicht verkehrssicher |
| `emptyRunReasonOther` | Other | Sonstiges |
| `emptyRunReviewTab` | Empty run | Leerfahrt |
| `emptyRunSlide` | Report empty run | Leerfahrt melden |
| `emptyRunSlideDone` | Empty run reported | Leerfahrt gemeldet |
| `emptyRunSlideLocked` | Enter at least 30 characters to unlock | Mind. 30 Zeichen eingeben zum Freischalten |
| `emptyRunSuccessBody` | Your report was submitted to Autheon and will be reviewed. | Ihre Meldung wurde an Autheon übermittelt und wird geprüft. |
| `emptyRunSuccessTitle` | Empty run reported | Leerfahrt gemeldet |
| `emptyRunWarning` | The reported empty run will be reviewed by Autheon. Reporting it does not automatically establish any entitlement to recognition or payment. Where possible, please also inform dispatch by phone. | Die gemeldete Leerfahrt wird durch Autheon geprüft. Durch die Meldung entsteht noch kein automatischer Anspruch auf Anerkennung oder Vergütung. Bitte informieren Sie die Disposition nach Möglichkeit zusätzlich telefonisch. |
| `endOfList` | End of list | Ende der Liste |
| `equipment` | Equipment | Ausrüstung |
| `equipmentSub` | Trailers · onboard kits | Anhänger · Bordausstattung |
| `exploreJobs` | Explore available jobs | Verfügbare Aufträge durchsuchen |
| `filters` | Filters | Filter |
| `filtersApplied_one` | Filters, 1 applied | Filter, 1 aktiv |
| `filtersApplied_other` | Filters, {count} applied | Filter, {count} aktiv |
| `flexible` | Flexible | Flexibel |
| `from` | From | Von |
| `fromDateChip` | From {date} | Ab {date} |
| `fullAddresses` | Full pickup and delivery addresses | Vollständige Abhol- und Lieferadressen |
| `helpSupportIntro` | Contact dispatch if you need help on the road. | Wende dich an die Disposition, wenn du unterwegs Hilfe brauchst. |
| `helpSupportTitle` | Help & support | Hilfe & Support |
| `infopoint` | Infopoint | Infopoint |
| `infopointDocsTab` | General documents | Allgemeine Dokumente |
| `infopointHelpTab` | Help | Hilfe |
| `infopointMessage` | Message | Nachricht |
| `infopointNewsAdminHint` | Messages are published by admins under Admin → Infopoint → New messages. | Nachrichten werden im Admin unter Infopoint → Neue Nachrichten veröffentlicht. |
| `infopointNewsEmpty` | No news items yet. | Noch keine News. |
| `infopointNewsRead` | Read | Gelesen |
| `infopointNewsTab` | New messages | Neue Nachrichten |
| `infopointNewsUnread` | New | Neu |
| `infopointSubtitle` | Official documents and dispatcher announcements | Offizielle Dokumente und Ankündigungen der Disposition |
| `instructionsPdf` | Operational instructions and PDF | Operative Hinweise und PDF |
| `invoiceUploadInvalidType` | Only PDF or image files are accepted. | Nur PDF- oder Bilddateien sind erlaubt. |
| `invoiceUploadNotYourTour` | You can only upload invoices for tours assigned to you. | Rechnungen können nur für Ihnen zugewiesene Touren hochgeladen werden. |
| `invoiceUploadRestricted` | Uploads are unavailable while your account is restricted. | Upload nicht möglich, solange das Konto eingeschränkt ist. |
| `invoiceUploadTooLarge` | File is too large. Max file size: 25 MB. | Datei ist zu groß. Max. Dateigröße: 25 MB. |
| `invoiceUploadTourRequired` | Invoice upload must be linked to a valid tour. | Der Upload muss einer gültigen Tour zugeordnet sein. |
| `jobDetailsTab` | Job details | Auftragsdetails |
| `leavePageContinueEditing` | Continue editing | Weiter bearbeiten |
| `leavePageDiscard` | Discard entries | Eingaben verwerfen |
| `leavePageSaveDraft` | Save as draft | Als Entwurf speichern |
| `leavePageTitle` | Leave this order? | Auftrag verlassen? |
| `legal` | Legal | Rechtliches |
| `legalSub` | Terms · privacy · imprint | AGB · Datenschutz · Impressum |
| `licensePlate` | License plate | Kennzeichen |
| `licenseVin` | License plate and VIN | Kennzeichen und FIN |
| `loadingJobs` | Loading jobs… | Touren werden geladen… |
| `mailtoSubjectSupport` | AUTHEON driver support — {driverCode} | AUTHEON Fahrer-Support — {driverCode} |
| `manufacturer` | Manufacturer | Hersteller |
| `markAllRead` | Mark all read | Alle als gelesen markieren |
| `markPerformed` | Mark as performed | Als durchgeführt markieren |
| `markPerformedConfirmBody` | This confirms the vehicle was handed over at the destination. Slide to confirm — or cancel if this was tapped by mistake. | Damit wird bestätigt, dass das Fahrzeug am Ziel übergeben wurde. Zum Bestätigen schieben – oder abbrechen, falls versehentlich getippt. |
| `markPerformedConfirmTitle` | Mark this tour as performed? | Tour als durchgeführt markieren? |
| `marketplace` | Marketplace | Marktplatz |
| `marketplacePreview` | Marketplace preview | Marktplatz-Vorschau |
| `masterDataChangeCancel` | Cancel | Abbrechen |
| `masterDataChangeEditBtn` | Request changes | Änderung anfragen |
| `masterDataChangeFormHint` | Update any fields that need changing, then submit for operations to review. | Felder anpassen und zur Prüfung durch die Disposition senden. |
| `masterDataChangeNotice` | These details are managed by operations. Tap Request changes to propose updates. | Diese Daten verwaltet der Betrieb. Tippen Sie auf Änderung anfragen, um Updates vorzuschlagen. |
| `masterDataChangePendingBadge` | Pending review | Prüfung ausstehend |
| `masterDataChangePendingBody` | Submitted {date}. Operations will review your request before you can send another. | Eingereicht am {date}. Die Disposition prüft Ihre Anfrage, bevor Sie eine weitere senden können. |
| `masterDataChangePendingTitle` | Change request pending | Änderungsanfrage ausstehend |
| `masterDataChangeSent` | Request sent to the operations team. | Anfrage wurde an das Betriebsteam gesendet. |
| `masterDataChangeSubmit` | Submit change request | Änderungsanfrage senden |
| `masterDataChangeUpdatedBadge` | Updated | Geändert |
| `model` | Model | Modell |
| `myDocsUploadHint` | JPG, PNG or PDF (max. 25 MB) | JPG, PNG oder PDF (max. 25 MB) |
| `myDocumentsTab` | My documents | Meine Dokumente |
| `myJobs` | My jobs | Meine Aufträge |
| `myJobsSubtitle` | Track and update your accepted tours | Verfolgen und aktualisieren Sie Ihre akzeptierten Touren |
| `noDriverAddons` | No driver-facing add-ons. | Keine fahrerseitigen Zusatzhinweise. |
| `noJobsMatch` | No jobs match | Keine passenden Touren |
| `noToursMatch` | No tours match these filters. | Keine Touren entsprechen diesen Filtern. |
| `noteConfirmArrival` | Please confirm arrival 15 minutes early. | Bitte Ankunft 15 Minuten vorher bestätigen. |
| `noteReportPickupDelay` | Report any pickup delay immediately to dispatch. | Verzögerungen bei der Abholung sofort an die Disposition melden. |
| `nothingHereYet` | Nothing here yet. | Hier ist noch nichts. |
| `notifCollapsePreview` | Hide tour details | Tourdetails ausblenden |
| `notifExpandPreview` | Show tour details | Tourdetails anzeigen |
| `notifOpenDocument` | Open document | Dokument öffnen |
| `notifOpenMessage` | Open message | Nachricht öffnen |
| `notifPreviewProtectedHint` | Customer, full addresses and licence plate become visible after you accept. | Kunde, vollständige Adressen und Kennzeichen werden nach der Annahme sichtbar. |
| `notifToMyOrders` | To my orders | Zu meinen Aufträgen |
| `notifViewMoreOrders` | View more orders | Weitere Aufträge ansehen |
| `notifViewOrder` | View order | Auftrag ansehen |
| `notifications` | Notifications | Benachrichtigungen |
| `notificationsSub` | Push filters mirror Portal preferences | Push-Filter spiegeln die Portal-Einstellungen |
| `offer` | Offer | Angebot |
| `officialLicencePlate` | Official licence plate | Amtliches Kennzeichen |
| `officialTourDocFromDispatch` | From dispatch | Von Disposition |
| `officialTourDocHint` | Provided by dispatch alongside the transport order. View or download only. | Von der Disposition bereitgestellt — neben dem Transportauftrag. Nur ansehen oder herunterladen. |
| `officialTourDocumentsSection` | Reference documents | Referenzdokumente |
| `ok` | OK | OK |
| `operationalInstructions` | Operational instructions | Operative Hinweise |
| `ownAxle` | Own axle | Eigenachse |
| `partnerPolicyAlert` | Demo document: Driver terms are available in the Driver Info area and admin Documents module. | Demo-Dokument: Fahrerbedingungen sind im Fahrer-Infobereich und im Admin-Dokumentenmodul verfügbar. |
| `performedDone` | Done | Fertig |
| `performedSuccessBody` | Upload your invoice and related documents so payment can be processed. You can skip this step and add them later in the tour's My documents tab. | Rechnung und zugehörige Dokumente hochladen, damit die Auszahlung bearbeitet werden kann. Dieser Schritt kann übersprungen und die Dokumente später im Tab „Meine Dokumente“ hinzugefügt werden. |
| `performedSuccessTitle` | Tour performed successfully. | Tour erfolgreich durchgeführt. |
| `performedTab` | Performed | Durchgeführt |
| `performedUploadCta` | Click to upload | Zum Hochladen tippen |
| `performedUploadHintEmpty` | Max file size: 25 MB | Max. Dateigröße: 25 MB |
| `pickup` | Pickup | Abholung |
| `pickupContact` | Pickup Contact | Ansprechpartner Abholung |
| `pickupPlz` | Pickup PLZ {plz} | Abhol-PLZ {plz} |
| `pickupPlzTwoDigits` | Pickup Postal Code (first 2 digits) | Abhol-PLZ (erste 2 Ziffern) |
| `pickupTime` | Pickup Time | Abholzeit |
| `plzAreaPlaceholder` | 00xxx | 00xxx |
| `postalArea` | Postal code / area | PLZ / Gebiet |
| `postalCodeAbbr` | PLZ | PLZ |
| `previewUnavailable` | Preview is not available for this file type. | Für diesen Dateityp ist keine Vorschau verfügbar. |
| `primaryNavigation` | Primary navigation | Hauptnavigation |
| `print` | Print | Drucken |
| `profile` | Profile | Profil |
| `profileAppVersion` | App version {version} | App-Version {version} |
| `profileBackLabel` | Profile | Profil |
| `profileDateJoined` | Member since | Dabei seit |
| `profileEmailSupport` | Email support | E-Mail-Support |
| `profileFeedbackMailSubject` | AUTHEON feedback — Partner ID {partnerId} | AUTHEON Feedback — Partner-ID {partnerId} |
| `profileGroupAccount` | Account | Konto |
| `profileGroupHelp` | Help | Hilfe |
| `profileGroupSettings` | Settings | Einstellungen |
| `profileMasterData` | Read-only master data | Stammdaten (nur lesbar) |
| `profileNavAppearance` | Appearance and language | Darstellung und Sprache |
| `profileNavBasicData` | Basic data | Stammdaten |
| `profileNavBasicDataSub` | Request a change | Änderung anfragen |
| `profileNavChangeEmail` | Change email address | E-Mail-Adresse ändern |
| `profileNavChangePassword` | Change password | Passwort ändern |
| `profileNavFeedback` | Feedback | Feedback |
| `profileNavNotifications` | Notification settings | Benachrichtigungseinstellungen |
| `profileNavReportError` | Report an error | Fehler melden |
| `profilePartnerId` | Partner ID | Partner ID |
| `profilePasswordConfirm` | Confirm new password | Neues Passwort bestätigen |
| `profilePasswordCurrent` | Current password | Aktuelles Passwort |
| `profilePasswordDeferred` | This is a prototype preview — password changes are not yet processed. | Dies ist eine Prototyp-Vorschau – Passwortänderungen werden noch nicht verarbeitet. |
| `profilePasswordIntro` | Choose a new password for your driver account. | Wählen Sie ein neues Passwort für Ihr Fahrerkonto. |
| `profilePasswordNew` | New password | Neues Passwort |
| `profilePasswordSubmit` | Update password | Passwort aktualisieren |
| `profileReportErrorMailSubject` | AUTHEON error report — Partner ID {partnerId} | AUTHEON Fehlermeldung — Partner-ID {partnerId} |
| `profileSubtitle` | Manage your account, limits and preferences | Verwalten Sie Ihr Konto, Limits und Einstellungen |
| `profileTitle` | Profile | Profil |
| `pushEnabledMaster` | Enable push notifications | Push-Benachrichtigungen aktivieren |
| `pushNotifyNewPublished` | Newly published orders | Neu veröffentlichte Aufträge |
| `pushNotifyPostalPrefix` | Orders in pickup postal code area | Aufträge im Abhol-PLZ-Gebiet |
| `pushSupportNotice` | Android supported in app flow. iOS requires home-screen installation, compatible iOS version, and permission. | Android wird im App-Ablauf unterstützt. iOS erfordert Installation auf dem Homescreen, eine kompatible iOS-Version und Berechtigung. |
| `pwaTag` | Phone mock · framed client preview | Handy-Mock · gerahmte Kundenvorschau |
| `redPlatesRequired` | Red licence plates required | Rote Kennzeichen erforderlich |
| `redPlatesRequiredDetail` | Deregistered vehicle transferred on its own axle. The executing service partner brings their own red licence plates; the plate number is not recorded. | Abgemeldetes Fahrzeug wird auf eigener Achse \u00fcberf\u00fchrt. Der ausf\u00fchrende Servicepartner bringt eigene rote Kennzeichen mit; die Kennzeichennummer wird nicht erfasst. |
| `refreshDemo` | Refresh | Aktualisieren |
| `registrationStatus` | Registration status | Zulassungsstatus |
| `removeDocBlocked` | Documents already in review can't be removed. Contact dispatch if needed. | Dokumente in Prüfung können nicht entfernt werden. Bei Bedarf Disposition kontaktieren. |
| `removeDocBody` | This will permanently remove the file from this tour. Upload a replacement if this document is required for processing. | Die Datei wird dauerhaft von dieser Tour entfernt. Falls das Dokument für die Abrechnung erforderlich ist, muss ein Ersatz hochgeladen werden. |
| `removeDocConfirm` | Remove | Entfernen |
| `removeDocTitle` | Remove document? | Dokument entfernen? |
| `removeFilterChip` | Remove filter: {label} | Filter entfernen: {label} |
| `removePostalCode` | Remove postal code {code} | Postleitzahl {code} entfernen |
| `reportProblem` | Report problem | Problem melden |
| `reportProblemEvidenceAdd` | Add file | Datei hinzufügen |
| `reportProblemEvidenceRemove` | Remove | Entfernen |
| `reportProblemEvidenceTooMany` | Maximum 5 files per report. | Maximal 5 Dateien pro Meldung. |
| `reset` | Reset | Zurücksetzen |
| `results` | results | Ergebnisse |
| `route` | Route | Route |
| `searchMyJobsPlaceholder` | Search tour no. or city… | Tour-Nr. oder Stadt suchen… |
| `settlements` | Settlements | Abrechnungen |
| `settlementsSub` | Statements · driver offers | Abrechnungen · Auszahlungen |
| `share` | Share | Teilen |
| `shareNotSupported` | Sharing is not supported on this device. | Teilen wird auf diesem Gerät nicht unterstützt. |
| `showResults` | Show {count} results | {count} Ergebnisse anzeigen |
| `signOut` | Sign out | Abmelden |
| `signOutAlert` | Are you sure you want to sign out? | Möchten Sie sich wirklich abmelden? |
| `slideAccepted` | Accepted | Angenommen |
| `slidePerformed` | Marked as performed | Als durchgeführt markiert |
| `slideToConfirm` | Slide to confirm → | Zum Bestätigen schieben → |
| `sortDateAsc` | Oldest first | Älteste zuerst |
| `sortDateDesc` | Newest first | Neueste zuerst |
| `sortDistAsc` | Shortest distance | Kürzeste Strecke |
| `sortDistDesc` | Longest distance | Längste Strecke |
| `sortJobs` | Sort orders | Aufträge sortieren |
| `sortPriceAsc` | Lowest price | Niedrigster Preis |
| `sortPriceDesc` | Highest price | Höchster Preis |
| `sortTourAsc` | Tour ID (Asc) | Tour-ID (Auf) |
| `sortTourDesc` | Tour ID (Desc) | Tour-ID (Ab) |
| `spCancelAbort` | Cancel | Abbrechen |
| `spCancelBindingWarning` | You are about to cancel a bindingly booked order. Under the applicable contractual conditions, cancellation costs of up to the agreed remuneration may apply. | Sie sind im Begriff, einen verbindlich gebuchten Auftrag zu stornieren. Gemäß den geltenden Vertragsbedingungen können Stornokosten bis zur Höhe der vereinbarten Vergütung entstehen. |
| `spCancelContinue` | Continue cancellation | Stornierung fortsetzen |
| `spCancelExplanationLabel` | Explanation (required) | Begründung (erforderlich) |
| `spCancelExplanationPlaceholder` | Describe why you are cancelling (min. 30 characters). | Beschreiben Sie, warum Sie stornieren (mind. 30 Zeichen). |
| `spCancelReasonAccidental` | Order booked accidentally | Auftrag versehentlich gebucht |
| `spCancelReasonAppointment` | Appointment cannot be met | Termin kann nicht eingehalten werden |
| `spCancelReasonLabel` | Cancellation reason | Stornierungsgrund |
| `spCancelReasonOrgImpossible` | Execution is organisationally impossible | Durchführung organisatorisch nicht möglich |
| `spCancelReasonOther` | Other | Sonstiges |
| `spCancelSlide` | Cancel order | Auftrag stornieren |
| `spCancelSlideDone` | Order cancelled | Auftrag storniert |
| `spCancelSlideLocked` | Enter at least 30 characters to unlock | Mind. 30 Zeichen eingeben zum Freischalten |
| `spCancelSuccessBody` | The order was successfully cancelled and must no longer be performed. | Der Auftrag wurde erfolgreich storniert und darf nicht mehr durchgeführt werden. |
| `spCancelSuccessTitle` | Order cancelled | Auftrag storniert |
| `spCancelTermsLink` | Applicable terms & contractual conditions | AGB bzw. Vertragsbedingungen |
| `spCancelTermsPlaceholderNotice` | Placeholder: the real cancellation terms / T&C document is not yet wired up. The target link is to be provided by operations. | Platzhalter: Das echte Storno-/AGB-Dokument ist noch nicht verknüpft. Das Ziel wird vom Betrieb bereitgestellt. |
| `themeDark` | Dark | Dunkel |
| `themeLight` | Light | Hell |
| `thirdPartyAxle` | Third-party axle | Fremdachse |
| `thisWeek` | This week | Diese Woche |
| `today` | Today | Heute |
| `tourBookedSuccessBody` | The tour is now active — you'll find it under My jobs. | Die Tour ist jetzt aktiv — du findest sie unter Meine Aufträge. |
| `tourBookedSuccessTitle` | Tour booked successfully. | Tour erfolgreich gebucht. |
| `tourDocChooseCategory` | Choose document type | Dokumenttyp wählen |
| `tourDocDeliveryNote` | Delivery note | Lieferschein |
| `tourDocEmptyAction` | Add receipts, delivery notes, or proof while this tour is active. | Belege, Lieferscheine oder Nachweise während der aktiven Tour hinzufügen. |
| `tourDocEmptyTitle` | No documents yet | Noch keine Dokumente |
| `tourDocFuelReceipt` | Fuel receipt | Tankbeleg |
| `tourDocGroupCore` | Core Documents | Kernbelege |
| `tourDocGroupOperational` | Operational Documents | Betriebliche Belege |
| `tourDocGroupOther` | Other Documents | Sonstige Belege |
| `tourDocHelperFuel` | Please make sure that the vehicle registration number is noted on the fuel receipt. | Bitte darauf achten, dass die Fahrzeug-Identifikationsnummer auf dem Tankbeleg vermerkt ist. |
| `tourDocHelperWaiting` | Please upload comprehensible proof of the start, end, and reason for the waiting time. | Bitte einen nachvollziehbaren Nachweis über Beginn, Ende und Grund der Wartezeit hochladen. |
| `tourDocInvoice` | Billing invoice | Abrechnungsrechnung |
| `tourDocOfficialNotReplaceable` | Documents from dispatch cannot be replaced. Upload your own receipts in Tour documents below. | Dokumente der Disposition können nicht ersetzt werden. Eigene Belege unten unter Tour-Dokumente hochladen. |
| `tourDocOtherProof` | Other proof | Sonstiger Nachweis |
| `tourDocOtherReceipt` | Other receipt | Sonstiger Beleg |
| `tourDocRejectionReason` | Rejection: {reason} | Ablehnung: {reason} |
| `tourDocReplaceButton` | Replace file | Datei ersetzen |
| `tourDocReplaceNotAllowed` | Accepted documents cannot be replaced. Contact dispatch if needed. | Angenommene Dokumente können nicht ersetzt werden. Bei Bedarf Disposition kontaktieren. |
| `tourDocReplaceNotOwner` | You can only replace your own uploads for this tour. | Sie können nur eigene Uploads für diese Tour ersetzen. |
| `tourDocRequiresPerformed` | Document upload is not available for this tour status. | Dokument-Upload ist für diesen Tour-Status nicht verfügbar. |
| `tourDocTollReceipt` | Toll receipt | Mautbeleg |
| `tourDocUploadAvailable` | Upload available | Upload möglich |
| `tourDocUploadButton` | Upload document | Dokument hochladen |
| `tourDocUploadEmpty` | No documents uploaded yet. | Noch keine Dokumente. |
| `tourDocUploadHint` | Upload tour documents such as invoice, receipts, delivery note, waiting time evidence, or other proof. PDF or images. | Tour-Dokumente wie Rechnung, Belege, Lieferschein, Wartezeitnachweis oder sonstige Nachweise hochladen. PDF oder Bilder. |
| `tourDocUploadReceiptButton` | Upload document / receipt | Dokument / Beleg hochladen |
| `tourDocUploadSuccess` | Document uploaded. Dispatch will review it. | Dokument hochgeladen. Die Disposition prüft es. |
| `tourDocWaitingTimeEvidence` | Waiting time evidence | Wartezeitnachweis |
| `tourDocumentsSection` | Tour documents | Tour-Dokumente |
| `tourInExecutionBanner` | Tour in execution — complete pickup, delivery, and documents from this screen. | Tour in Ausführung — Abholung, Zustellung und Dokumente hier abschließen. |
| `transportType` | Transport type | Transportart |
| `uiDismiss` | Dismiss | Schließen |
| `unlockedAfterAcceptance` | Unlocked after acceptance | Nach Annahme freigeschaltet |
| `until` | Until | Bis |
| `untilDateChip` | Until {date} | Bis {date} |
| `uploadSourceFile` | Choose file | Datei auswählen |
| `uploadSourceFileDesc` | Select a PDF or image from your device | PDF oder Bild vom Gerät auswählen |
| `uploadSourcePhoto` | Take photo | Foto aufnehmen |
| `uploadSourcePhotoDesc` | Open the camera | Kamera öffnen |
| `uploadSourceTitle` | Add document | Dokument hinzufügen |
| `vatBankingReadonly` | Address · VAT · banking | Adresse · USt. · Bankdaten |
| `vehicle` | Vehicle | Fahrzeug |
| `vehicleCharacteristics` | Additional vehicle characteristics | Weitere Fahrzeugmerkmale |
| `vehicleInfoDeregistered` | Deregistered | Abgemeldet |
| `vehicleInfoElectric` | Electric vehicle | E-Fahrzeug |
| `vehicleInfoRegistered` | Registered | Zugelassen |
| `vehicleReadyToDrive` | Ready to drive | Fahrbereit |
| `vehicleType` | Vehicle type | Fahrzeugtyp |
| `vehicleTypePassengerCar` | Passenger car | PKW |
| `vehicleTypeTruckOver75t` | Truck over 7.5 t | LKW \u00fcber 7,5 t |
| `vehicleTypeTruckUpTo75t` | Truck up to and including 7.5 t | LKW bis einschlie\u00dflich 7,5 t |
| `view` | View | Ansehen |
| `viewDriverPolicy` | View driver policy | Fahrerrichtlinie ansehen |
| `viewOnMap` | View on map | Auf Karte anzeigen |
| `vin` | VIN | FIN |
| `warnEntryCancelOption` | Cancel order | Auftrag stornieren |
| `warnEntryCancelSub` | End the tour and notify dispatch. | Beendet den Auftrag und informiert die Disposition. |
| `warnEntryEmptyRunOption` | Report empty run | Leerfahrt melden |
| `warnEntryEmptyRunSub` | The order itself can't be executed — Autheon reviews it. | Der Auftrag selbst kann nicht durchgeführt werden — Autheon prüft die Meldung. |
| `weekend` | — | — |
