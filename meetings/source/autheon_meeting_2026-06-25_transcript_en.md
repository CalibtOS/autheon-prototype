# Autheon × AW — Jour Fixe Meeting: Deep Analysis

**Source file:** `Autheon_x_AW__Jour_FIxe20260625151126Besprechungsaufzeichnungmp4.txt`
**Inferred meeting date/time:** 2026‑06‑25, ~15:11 (parsed from the export filename timestamp — *labeled as inferred, not stated in the transcript itself*)
**Meeting length:** ~1 hour 13 minutes (last timestamp: 1:13:12)
**Original language:** German (this analysis is written in English as requested; quotes are translated, not verbatim)
**Meeting type:** Recurring status/design-review call ("Jour Fixe") between the Autheon client team and the agency/dev team ("AW") building Autheon's driver marketplace app

### Speaker key (inferred from context — see notes)

| Label | Who | Confidence | Evidence |
|---|---|---|---|
| **C1** (Speaker 1) | Autheon client side — commercial/business framing, describes client operating rules in detail | Medium | Talks about "our client" ("Auftraggeber"), internal Excel workaround, company strategy |
| **A‑Ferhat** (Speaker 2) | Agency/dev lead presenting Figma + backend — almost certainly **Ferhat**, based on context from related Autheon meetings | High | Repeatedly addressed as "Ferhat" / "Fert" / "Erhard" by others; his video freezes mid‑meeting, matching a known pattern for this person |
| **A‑Felix** (Speaker 3) | Agency technical team member — likely **Felix** | Medium | Directly addressed as "Felix" at 1:10:52 and replies in character; also gives a technical explanation of Apple OTP autofill and Monday.com usage |
| **C2** (Speaker 4) | Autheon client side — operations/dispatch detail specialist | Medium | Gives concrete driver-experience arguments, cites exact time-window rules |

⚠️ **Unclear:** Near the end (≈1:10–1:13), speaker turns get harder to track (WhatsApp-group housekeeping, an accidental call to "Carolin"). One line attributed to Speaker 3 ("Felix, probably already blocked as spam") reads oddly if Speaker 3 *is* Felix — this may be a diarization mix-up in the source transcript. Treated as **unclear**, not corrected.

---

## 1. Meeting overview

**Main topic:** A working/design-review session covering (a) branding assets Autheon still owes the agency, (b) a large batch of Figma UI/UX changes to the driver-facing marketplace app (login, marketplace list, filters, sorting, notifications, job details, accept flow), and (c) a deep, unplanned dive into the client's real-world scheduling business logic (time windows, "by-latest" deadlines, multi-day trips).

**Why it was important:** This is not just a UI review — it surfaces a genuine architectural risk: the client's scheduling rules are more flexible and varied than the current design assumes, and if not captured correctly now, the system could end up limiting the client's business instead of supporting it.

**Who seemed to be involved:** Two people from Autheon (client, C1 and C2) with strong operational/logistics knowledge, and two people from the agency (A‑Ferhat, presenting; A‑Felix, technical support).

**What the meeting was trying to solve:** Align on a wave of interface details already built in Figma (login, marketplace, filters, sorting, job cards, notifications, database/backend progress), while also stress-testing whether the underlying data model can handle the client's actual scheduling rules.

**General direction of the discussion:** Mostly a structured Figma walkthrough (agency shows a screen, asks for a reaction, client responds live or defers to a written Figma comment). Around the 20–39 minute mark, this shifts into a longer, more strategic discussion about time windows and business-logic flexibility. The last ~5 minutes are informal ops tooling talk (Monday.com, WhatsApp group).

**Final outcome, if any:** No single "sign-off" moment. Instead: (1) a working agreement to use Figma comments as the main feedback channel, (2) several small confirmed UI decisions, (3) an explicit plan to dedicate part of the **next Monday meeting** to the time-window/business-logic topic, and (4) a client commitment to do one full internal review pass over all screens "this weekend or after Monday" (soft deadline).

---

## 2. Executive summary

**Most important message:** The interface work is progressing well and is being reviewed screen-by-screen, but the most valuable thing that happened in this meeting was not a UI decision — it was the moment the agency lead stopped and said, in effect, *"you clearly have a lot of business logic in your heads that we haven't captured yet, and if we don't get it now, the software we're building could box you in."* [STATED, ~30:39]

**Biggest decisions/conclusions:**
- Feedback will flow through Figma comments (not Word docs) — a clear process decision.
- The system must support **both** fixed appointment times **and** flexible time windows, because the client's real operations use both, and window length is not fixed (it varies by which end-client the order comes from, from ~2 to ~6 hours). [STATED]
- Full job details (address, contact, license plate/VIN, instructions) are deliberately hidden until *after* a driver accepts — a progressive-disclosure design already implemented and confirmed as good practice. [STATED]
- A conscious decision was made to **not** over-engineer every scheduling edge case right now — ship something usable, refine later once real usage patterns exist. [STATED, ~39:40, credited mainly to A‑Felix]

**Most important problems discussed:**
- Two client stakeholders (C1 and C2) openly disagreed about whether pickup/delivery times should show on the compact marketplace card or only after tapping in — unresolved. [STATED — open disagreement]
- The client's scheduling rules (time windows, "by-latest" deadlines, multi-day trips, per-client variation) exist only as spoken/tribal knowledge and informal Excel/PDF workflows — nothing is written down yet in a form the dev team can build against. [IMPLIED — flagged directly by A‑Ferhat but not yet resolved]
- A genuine usability trap was caught live: after accepting a job, the screen looks almost identical to before, and even the presenter momentarily didn't notice he'd switched modes.

**Most useful ideas:**
- Use Figma comment threads as the shared, running record of open items, and use live meetings specifically to resolve the ones that are "stuck," instead of re-explaining everything each time. [STATED, ~1:10:01, C1]
- The postal-code filter overlap rule worked out live (narrower prefix inside a broader one → treat as a union, broader wins) is a small but genuinely reusable piece of specification logic. [STATED, ~49:59–51:20]

**Practical value of the meeting:** High for documentation and planning purposes, moderate-to-high for immediate build progress (many items are still "let's think about it" rather than final), and high for risk-avoidance if the time-window issue is properly followed up on Monday.

---

## 3. Meeting converted into good steps

**Step 1 — Branding assets check-in**
- What happened: Agency confirms it has the current logo + a vector version; asks about a compact logo for browser-tab-sized use.
- Why it matters: Blocks final visual polish; low urgency right now.
- Important details: New company name will likely start with "A" but isn't finalized yet.
- Transcript evidence: [0:06]–[1:35]
- Practical meaning: Client owes a logo package once naming is locked.
- Follow up needed: Yes — no deadline given ("over time").

**Step 2 — Driver login & password reset walkthrough**
- What happened: Agency shows the first-ever login screens (email + password, reset flow, provisional first-login password). Client approves the provisional-credentials approach.
- Why it matters: Core account-security flow; first real "yes, that's fine" of the meeting.
- Important details: iOS may auto-fill emailed OTP codes but this isn't guaranteed and isn't fully in the team's control; SMS OTP is more reliable for autofill but is *not* the current plan (email-only).
- Transcript evidence: [1:35]–[9:16]
- Practical meaning: Password reset ships as email + 6-digit code; OTP autofill is a "nice if it happens" not a promised feature.
- Follow up needed: Yes — confirm actual iOS/PWA autofill behavior once built.

**Step 3 — Multi-language scope clarification**
- What happened: Agency explains English/German language files will exist, but true multi-language support (including free-text, user-generated notification/email content) is a separate, not-yet-built feature.
- Why it matters: Prevents a future misunderstanding ("wait, I thought this was already multilingual").
- Transcript evidence: [2:38]–[4:00]
- Practical meaning: Document this now as an explicit *out-of-scope-for-v1* item.
- Follow up needed: Add to backlog/roadmap.

**Step 4 — Marketplace welcome/home screen review**
- What happened: Agency shows the very first screen after login (the Marketplace itself, no separate "Welcome back, [Name]" header or avatar). Asks if that's acceptable.
- Why it matters: First impression of the app.
- Transcript evidence: [9:16]–[11:04]
- Practical meaning: Client defers — will comment later rather than decide live.
- Follow up needed: Yes — explicit Figma comment expected.

**Step 5 — Feedback workflow agreed**
- What happened: Client asks how feedback should be given (Word doc with screenshots?). Agency clarifies: use Figma's native comment/speech-bubble tool directly on the shared link, also referenced from Monday.com and WhatsApp.
- Why it matters: This becomes the standing process for the rest of the project, not just this meeting.
- Transcript evidence: [11:04]–[13:17]
- Practical meaning: No more ad-hoc Word/screenshot markup needed.
- Follow up needed: None — this is a settled decision.

**Step 6 — Notification icon and Corporate Design gap**
- What happened: Client asks for a visible *number*, not just a colored dot, on the notification icon. Separately, client admits they don't have a finished Corporate Design (colors, fonts, hex codes) yet because their own website isn't live.
- Why it matters: The number-vs-dot request is a small, clear requirement; the missing Corporate Design is a real blocker for final visual polish.
- Transcript evidence: [13:17]–[14:31]
- Practical meaning: Agency proceeds with placeholder styling until the client sends a design reference doc.
- Follow up needed: Client to produce and send a Corporate Design document (fonts, hex codes, corner radius, accent colors).

**Step 7 — Filter & sort UI simplification**
- What happened: Agency shows a redesigned filter/sort row — combined into one row, icon-only (no repeated text labels), to save space, since the icons are self-explanatory.
- Transcript evidence: [14:38]–[18:49]
- Practical meaning: Cleaner, more compact marketplace header.
- Follow up needed: Client to confirm via comment.

**Step 8 — Total job count & filter preview count**
- What happened: Client explicitly asks for (and gets agreement on) a *total* job count visible on the marketplace home screen even with no filters applied. Separately, a previously-removed "how many results would this filter return" preview number is flagged by the client as "actually pretty important" and worth bringing back.
- Why it matters: Both numbers help drivers avoid wasted taps into empty result sets.
- Transcript evidence: [18:01]–[18:49]
- Practical meaning: Two related but distinct pieces of UI to (re)build.
- Follow up needed: Yes — reintroduce the preview count.

**Step 9 — The time-window debate (marketplace card layout)**
- What happened: Should pickup/delivery time windows be visible on the compact marketplace card, or only after tapping into the order? C1 wants it deferred (space concerns); C2 argues strongly for showing it up front so drivers juggling multiple tours can decide fast.
- Why it matters: Real, unresolved disagreement between the two client stakeholders — a layout decision that affects the whole list screen.
- Transcript evidence: [19:14]–[22:41]
- Practical meaning: Agency cannot finalize this card layout until the client aligns internally.
- Follow up needed: Yes — client-internal alignment needed.

**Step 10 — The core business-logic deep dive (time windows, "by-latest," multi-day trips)**
- What happened: A long, important detour: the client explains their real scheduling rules — most orders use a time *window* (typically ~4 hours, but this varies 2–6h by which end-client is involved), some use fixed exact times, some are genuinely open-ended ("by [date] at the latest"), and a small number span multiple days/overnight. The agency explicitly warns that if this isn't captured properly, the software could end up more rigid than the client's current Excel/PDF-based workflow.
- Why it matters: This is the single most strategically important segment of the meeting.
- Important details: The client (Autheon) often imposes a *tighter* internal deadline on drivers than the end-client contractually requires, as a safety buffer.
- Transcript evidence: [19:54]–[39:40]
- Practical meaning: The data model needs a flexible time-representation (window OR fixed OR by-latest), not a single rigid "pickup time / delivery time" pair.
- Follow up needed: Yes — dedicated discussion planned for the upcoming Monday meeting.

**Step 11 — Scope discipline decision**
- What happened: A‑Felix makes the case that the team should not try to fully solve every scheduling edge case now; ship a flexible-but-simple time entry field, refine categorization/filtering later once real usage data exists.
- Why it matters: A deliberate anti-scope-creep decision, given the topic above could otherwise spiral.
- Transcript evidence: [39:40]–[39:46]
- Practical meaning: v1 will not lock in a rigid schema for time handling.
- Follow up needed: Revisit once usage patterns are known.

**Step 12 — Vehicle type icons & brand tone**
- What happened: Should the marketplace show vehicle-type icons (car/van/truck, possibly an EV symbol)? Undecided. But the client is very clear on tone: the app must feel **serious and premium, never playful**, in both visuals and copy (formal, polite language, since users are unfamiliar subcontractors, not employees).
- Transcript evidence: [39:46]–[42:06]
- Practical meaning: A durable brand/tone guideline for *all* future screens, not just this one.
- Follow up needed: Decide on vehicle-type icon usage; keep the tone rule as a standing guideline.

**Step 13 — Job card visual polish (price, date, distance)**
- What happened: Price repositioned and highlighted; date moved and shrunk; distance number moved to sit directly between the two locations instead of being tucked under the destination.
- Why it matters: Incremental but well-received visual refinement.
- Transcript evidence: [42:06]–[44:55]
- Practical meaning: Client likes the distance change specifically ("pretty good UI improvement").
- Follow up needed: Comments for anything undecided.

**Step 14 — Bottom navigation redesign**
- What happened: New "floating," glass/Apple-style bottom nav; labels show only next to the active icon.
- Transcript evidence: [45:02]–[48:00]
- Practical meaning: Client likes the direction but wants to think it over; also wants the option to suggest specific icon assets (e.g., a preferred bell icon) before a "design freeze."
- Follow up needed: Client to send preferred icon references if any.

**Step 15 — Client commits to a full internal review pass**
- What happened: Client says they'll sit down as a team and go through every screen, giving one more complete round of feedback, planned in stages rather than all at once.
- Transcript evidence: [48:10]–[48:34]
- Practical meaning: A meaningful commitment, but with a soft/fuzzy deadline ("weekend or maybe after Monday").
- Follow up needed: Yes — track this explicitly since the deadline is vague.

**Step 16 — Postal code & date range filter logic**
- What happened: Deep, technical, but well-resolved discussion of how overlapping postal-code prefixes should behave in the filter (agreed: narrower prefix inside a broader one → broader wins/union). Pickup vs delivery date range interaction left open.
- Transcript evidence: [48:34]–[52:29]
- Practical meaning: One precise piece of filter logic is now specified clearly enough to build; one related question is still open.
- Follow up needed: Resolve pickup/delivery date range interaction.

**Step 17 — Job details, accept flow, and post-accept confusion risk**
- What happened: Confirmed: full details only unlock after accepting (slide-to-confirm). A real usability risk is caught live — the post-accept "View Job" screen looks almost identical to the pre-accept one, and even the presenter briefly lost track of which mode he was in. Proposed fix: an explicit "back to marketplace" button.
- Transcript evidence: [56:18]–[1:02:02]
- Practical meaning: A genuine usability fix identified and (informally) agreed, but not yet confirmed as built.
- Follow up needed: Yes — add the button; confirm PDF should be emailed as well as shown in-app.

**Step 18 — Backend/database progress demo**
- What happened: Agency shows the API test environment and a (not-yet-final) database diagram: Orders, Job Locations, Notification Deliveries, and other entities, explaining this reflects requirements gathered during meetings like this one.
- Transcript evidence: [1:04:57]–[1:08:22]
- Practical meaning: Reassures the client that substantial backend work is happening beyond what's visible in Figma.
- Follow up needed: None immediate — informational.

**Step 19 — Connection freeze & wrap-up**
- What happened: A‑Ferhat's video/audio freezes; team troubleshoots via WhatsApp; connection restored; meeting wraps with a plan to use Figma comments as the shared "source of truth" between meetings, plus WhatsApp group setup for quick questions.
- Transcript evidence: [1:08:22]–[1:13:12]
- Practical meaning: A useful process idea (comments as source of truth) closes out the meeting.
- Follow up needed: Confirm WhatsApp group membership is complete.

---

## 4. Important points extracted from the meeting

> Status legend: **Resolved** = agreed live · **Deferred** = explicitly pushed to later/comments · **Open** = unresolved disagreement or unanswered question · **Implied** = not stated outright but reasonably inferable

**Point 1**
What was said: Agency has the current logo and a vector file; will produce the same for the new name once finalized.
Who said it: A‑Ferhat
Timestamp: 0:06
Why it is important: Confirms a pending client deliverable.
Category: Action item
Status: Deferred

**Point 2**
What was said: The new company name will probably start with "A," but this isn't certain yet.
Who said it: A‑Ferhat
Timestamp: 0:06
Why it is important: Naming is still unresolved and blocks branding assets.
Category: Unclear point
Status: Open

**Point 3**
What was said: Login screens are built for mobile; tablet resolution has not been addressed and isn't currently a priority.
Who said it: A‑Ferhat
Timestamp: 1:35–2:38
Why it is important: A deliberate scope decision worth documenting so it isn't mistaken for an oversight later.
Category: Requirement
Status: Resolved (deprioritized, not dropped)

**Point 4**
What was said: German/English language files will exist for the client to translate, but real multi-language support (including free-text, user-generated content) is a separate future feature, not built now.
Who said it: A‑Ferhat
Timestamp: 2:46
Why it is important: Prevents a scope misunderstanding later.
Category: Documentation point
Status: Resolved (scoped out for now)

**Point 5**
What was said: Accounts are created only via the admin dashboard; invited users get provisional login credentials by email and must change the password on first login.
Who said it: A‑Ferhat
Timestamp: 4:02–4:35
Why it is important: Core security/account-provisioning flow.
Category: Technical point
Status: Resolved

**Point 6**
What was said: Client approves the provisional-credentials approach for now.
Who said it: C1
Timestamp: 5:44
Why it is important: A concrete sign-off, however small.
Category: Decision
Status: Resolved

**Point 7**
What was said: Whether iOS can auto-fill an emailed one-time password directly is uncertain; it depends on Apple's own behavior and works more reliably with SMS than email.
Who said it: A‑Ferhat / A‑Felix
Timestamp: 6:37–8:47
Why it is important: Sets realistic expectations — this convenience feature is not fully controllable by the team.
Category: Risk
Status: Open (needs verification once built)

**Point 8**
What was said: Password reset will stay email-based (no SMS) for now.
Who said it: A‑Ferhat
Timestamp: 8:47
Why it is important: Confirms scope of the reset flow.
Category: Decision
Status: Resolved

**Point 9**
What was said: The very first screen after login is the Marketplace itself — no separate "Welcome back" header with name/photo.
Who said it: A‑Ferhat
Timestamp: 9:16–11:04
Why it is important: First-impression design choice; client hasn't confirmed it yet.
Category: Client feedback
Status: Deferred

**Point 10**
What was said: Feedback should be given via Figma's native comment tool on the shared link, not via marked-up Word documents.
Who said it: A‑Ferhat
Timestamp: 11:57
Why it is important: Establishes the standing feedback process for the whole project.
Category: Decision
Status: Resolved

**Point 11**
What was said: The notification icon currently shows only a colored dot; the client wants an actual number visible.
Who said it: C1 (and again by C1/A‑Ferhat at 46:48)
Timestamp: 13:17 and 46:48
Why it is important: Concrete, repeated requirement — raised twice with the same answer both times.
Category: Requirement
Status: Resolved

**Point 12**
What was said: The client does not yet have a finished Corporate Design (fonts, colors, hex codes) because their own website isn't live yet.
Who said it: C1
Timestamp: 13:40
Why it is important: A real blocker for final visual polish; no delivery date given.
Category: Problem
Status: Open

**Point 13**
What was said: The filter and sort controls were combined into a single icon-only row (no text labels) to save space, since the icons are self-explanatory.
Who said it: A‑Ferhat
Timestamp: 14:38
Why it is important: Space-efficiency pattern reused elsewhere later (bottom nav).
Category: Idea
Status: Resolved (implemented, pending final client sign-off)

**Point 14**
What was said: Client explicitly wants the *total* number of marketplace jobs visible even before any filter is applied.
Who said it: C1
Timestamp: 18:01–18:16
Why it is important: A clear, confirmed requirement that improves driver orientation.
Category: Requirement
Status: Resolved

**Point 15**
What was said: A previously-removed "preview" count (how many results a filter-in-progress would return) is flagged by the client as actually quite important.
Who said it: C1
Timestamp: 18:49
Why it is important: A design element cut for space reasons may need to come back.
Category: Client feedback
Status: Open

**Point 16**
What was said: Whether pickup/delivery time windows should appear on the compact marketplace card is disputed between the two client reps — one wants it deferred to the detail screen, the other wants it visible up front so drivers can decide quickly.
Who said it: C1 vs C2
Timestamp: 19:14–22:41
Why it is important: A genuine internal disagreement that blocks a layout decision.
Category: Problem
Status: Open

**Point 17**
What was said: The client confirms both fixed appointment times and flexible time windows exist in their real business; window length is typically ~4 hours but varies (2–6h) depending on which end-client the order comes from.
Who said it: C2 / C1
Timestamp: 20:11–23:35
Why it is important: Directly affects the required data structure — a single fixed "4-hour window" assumption would be wrong.
Category: Requirement
Status: Resolved (as a fact to design around), though the full implementation is still open

**Point 18**
What was said: The system must be built so both time windows and exact time specifications are structurally possible, and the client can choose window length themselves.
Who said it: A‑Ferhat
Timestamp: 22:58
Why it is important: Direct architectural requirement.
Category: Technical point
Status: Resolved (as direction), implementation pending

**Point 19**
What was said: When an already-published order can't find a driver in time, the client's current workaround is manual: edit their internal Excel with a new date, clear it with the end-client, and re-publish.
Who said it: C1
Timestamp: 24:48
Why it is important: Implies the platform needs a way to edit/republish or return a live order to draft — not stated explicitly as a feature request, but strongly implied by the described workaround.
Category: Idea
Status: Implied

**Point 20**
What was said: A small number of trips span more than one day (overnight), almost always for distance/logistics reasons (e.g., Berlin to Saarland), not because of vehicle problems.
Who said it: C1
Timestamp: 26:51–27:19
Why it is important: The system must support pickup day ≠ delivery day, even if rare.
Category: Requirement
Status: Resolved (as a fact), implementation pending

**Point 21**
What was said: Some orders only have a "by [date], at the latest" deadline rather than an exact delivery moment; the client often imposes a tighter internal deadline than the end-client actually requires, as a safety margin.
Who said it: C1
Timestamp: 27:50–29:09
Why it is important: This is a nuance ("no later than" vs. "exactly then") that a simple start/end datetime field would not capture correctly.
Category: Risk
Status: Open

**Point 22**
What was said: The agency explicitly warns that the client's mature, real-world business logic isn't documented anywhere yet, and if it isn't communicated clearly now, the resulting software could end up constraining the client rather than helping them — deep structural changes later are costly.
Who said it: A‑Ferhat
Timestamp: 30:39–31:52
Why it is important: The single most strategically important statement in the meeting.
Category: Risk
Status: Open — explicitly deferred to a dedicated Monday discussion

**Point 23**
What was said: Autheon is a brand-new company; it must design its scheduling logic to work for future end-clients too, not just the current one, since different clients will have different rules.
Who said it: C1 / C2
Timestamp: 35:26–36:19
Why it is important: Frames today's specific business rules as one example, not the permanent spec.
Category: Business point
Status: Resolved (as context)

**Point 24**
What was said: The team should not try to "plan itself to death" — ship a usable version now with flexible (not overly structured) time entry, and refine later once real usage patterns are visible.
Who said it: A‑Felix
Timestamp: 38:11–39:40
Why it is important: A deliberate anti-scope-creep decision balancing Point 22's risk with delivery speed.
Category: Decision
Status: Resolved

**Point 25**
What was said: The app must feel serious and premium, never playful — this applies to icon style and to all copywriting (formal/polite tone), because end users are unfamiliar subcontracted business owners, not employees.
Who said it: C1
Timestamp: 41:03
Why it is important: A durable brand/tone guideline that should apply to every future screen.
Category: Business point
Status: Resolved

**Point 26**
What was said: Whether to show vehicle-type icons (and whether to include an EV-specific icon) is undecided; some drivers actively avoid electric vehicles.
Who said it: C1
Timestamp: 39:46–42:06
Why it is important: Small UI decision with a real user-preference nuance behind it.
Category: Client feedback
Status: Open

**Point 27**
What was said: Client can't make fast, confident aesthetic judgments live in the meeting and prefers to review async as a team, then give consolidated feedback.
Who said it: C1 / C2
Timestamp: 43:12–43:31
Why it is important: Sets realistic expectations for how design feedback will actually flow going forward.
Category: Internal note
Status: Resolved (as a working pattern)

**Point 28**
What was said: The distance number was moved to sit directly between the two locations instead of being tucked under the destination — praised as a good UI improvement.
Who said it: A‑Ferhat / C1
Timestamp: 44:17–44:55
Why it is important: Small confirmed win.
Category: Client feedback
Status: Resolved

**Point 29**
What was said: The bottom navigation was redesigned with a floating, glass/Apple-style look; labels show only next to the active icon.
Who said it: A‑Ferhat
Timestamp: 45:48–46:09
Why it is important: Visual direction well received, not yet formally signed off.
Category: Client feedback
Status: Deferred

**Point 30**
What was said: Client wants the option to propose their own preferred icon assets (e.g., a specific bell icon) before a "design freeze" is declared.
Who said it: C1
Timestamp: 46:48–47:32
Why it is important: A concrete, actionable ask with a clear window (before freeze).
Category: Action item
Status: Open

**Point 31**
What was said: Client will sit down as a team and review every screen, giving one final, complete round of feedback, planned in stages.
Who said it: C1
Timestamp: 48:10–48:34
Why it is important: A real commitment, but the deadline is soft/fuzzy ("weekend or maybe after Monday").
Category: Action item
Status: Open

**Point 32**
What was said: Overlapping postal-code prefixes (e.g., "51" and "510" entered together) should resolve so the broader prefix effectively wins/unions with the narrower one, rather than the narrower one silently disappearing.
Who said it: A‑Ferhat, agreed by C1
Timestamp: 49:59–51:20
Why it is important: A precise, technically correct piece of filter-logic specification worked out live and explicitly agreed.
Category: Decision
Status: Resolved

**Point 33**
What was said: Whether Pickup Date Range and Delivery Date Range filters must fall within the same window, or act independently, is unresolved.
Who said it: A‑Ferhat / C1
Timestamp: 51:20–52:14
Why it is important: Affects filter logic correctness.
Category: Unclear point
Status: Open

**Point 34**
What was said: A results-count "badge" next to the sort/filter button risks being misread by users as "how many filters are active" rather than "how many results this returns," since that's the conventional meaning of such badges.
Who said it: A‑Ferhat
Timestamp: 57:32
Why it is important: A genuinely reusable UX heuristic, independent of this specific screen.
Category: Reusable lesson
Status: Open (design not finalized)

**Point 35**
What was said: Full job details (exact addresses, on-site contacts, license plate/VIN, instructions) are intentionally hidden until after the driver accepts; only a reduced preview is shown before.
Who said it: A‑Ferhat
Timestamp: 58:06
Why it is important: A deliberate, already-implemented progressive-disclosure design pattern.
Category: Technical point
Status: Resolved

**Point 36**
What was said: The "Partner Policy" (essentially Terms & Conditions) is an external link to separately managed static content, not rendered inside the app.
Who said it: A‑Ferhat
Timestamp: 1:00:42
Why it is important: Simple architecture confirmation.
Category: Technical point
Status: Resolved

**Point 37**
What was said: The post-accept "View Job" screen looks almost identical to the pre-accept one; even the presenter momentarily didn't register that the mode had changed.
Who said it: A‑Ferhat
Timestamp: 1:01:04–1:01:48
Why it is important: A live, first-hand demonstration of a real usability risk.
Category: Risk
Status: Open

**Point 38**
What was said: Proposed fix — add a second button on that screen allowing the driver to go back to the marketplace explicitly.
Who said it: C1
Timestamp: 1:01:48
Why it is important: A concrete, low-cost usability fix.
Category: Action item
Status: Open (proposed, not confirmed built)

**Point 39**
What was said: The accepted order's PDF should be viewable/downloadable in-app; client says it's also fine to additionally send it by email.
Who said it: C2 / A‑Ferhat
Timestamp: 1:02:02–1:02:59
Why it is important: A small but concrete requirement clarification.
Category: Requirement
Status: Resolved

**Point 40**
What was said: The database schema shown (Orders, Job Locations, Notification Deliveries, etc.) is explicitly not final and is still evolving based on requirements gathered in meetings like this one.
Who said it: A‑Ferhat
Timestamp: 1:07:xx
Why it is important: Sets expectations that the backend is a living structure, not a locked spec.
Category: Documentation point
Status: Resolved (as ongoing context)

**Point 41**
What was said: A‑Ferhat's audio/video freezes mid-meeting; team troubleshoots via WhatsApp while waiting.
Who said it: C1 / A‑Felix
Timestamp: 1:08:22–1:09:53
Why it is important: A recurring technical reliability issue for this participant, seen in more than one related meeting recording.
Category: Risk
Status: Implied (pattern, not directly discussed as a problem to fix)

**Point 42**
What was said: Client proposes using Figma comment threads as the running shared record of open items, and using live meetings specifically to resolve the "stuck" points rather than re-explaining everything.
Who said it: C1
Timestamp: 1:10:01
Why it is important: A genuinely useful process improvement for how the two teams collaborate.
Category: Reusable lesson
Status: Resolved (agreed working pattern)

---

## 5. Decisions made

**Decision 1**
Decision: Feedback on Figma designs will be given through Figma's native comment tool, not Word documents with screenshots.
Who made or supported it: A‑Ferhat proposed; C1 accepted.
Timestamp: 11:57
Reason: Figma comments attach feedback directly to the exact screen/element and are easier to track than separate documents.
Impact: Becomes the standing process for the whole project.
Next step: None — already in use.
Confidence level: **High**

**Decision 2**
Decision: Password reset stays email-based with a 6-digit one-time code; no SMS-based reset for now.
Who made or supported it: A‑Ferhat, A‑Felix
Timestamp: 8:47
Reason: SMS OTP autofill is more reliable on iOS, but email is the agreed channel for now; SMS wasn't chosen as an alternative.
Impact: Sets the scope of the reset flow; OTP-autofill convenience is not guaranteed.
Next step: Verify actual autofill behavior once implemented and tested on real devices.
Confidence level: **Medium** (the "stay with email" part is firm; the autofill behavior is genuinely uncertain)

**Decision 3**
Decision: The marketplace home screen will show the total number of available jobs, even with no filters applied.
Who made or supported it: C1 (explicit "yes, definitely")
Timestamp: 18:01–18:16
Reason: Helps drivers get oriented immediately without needing to scroll or filter first.
Impact: A confirmed UI requirement for the marketplace screen.
Next step: Build/confirm in the next design iteration.
Confidence level: **High**

**Decision 4**
Decision: The notification icon must show an actual number, not just a colored dot.
Who made or supported it: C1
Timestamp: 13:17, reaffirmed 46:48–47:32
Reason: A dot alone doesn't tell the driver how many notifications are waiting.
Impact: Small but clear UI requirement, applies wherever the notification icon appears.
Next step: Implement in both locations shown.
Confidence level: **High**

**Decision 5**
Decision: The system's data model must support both flexible time windows and exact fixed times for pickup/delivery, with window length chosen per order rather than fixed system-wide.
Who made or supported it: A‑Ferhat, confirmed by C1/C2's description of real operating rules
Timestamp: 22:58, supported by 20:11–23:35
Reason: The client's real business already uses both, and window length varies (2–6h) depending on the end-client.
Impact: Directly shapes the underlying data structure for orders/timing.
Next step: Detailed design of this data model, planned for the Monday follow-up.
Confidence level: **High** (as a requirement); **Medium** (on the exact implementation, since details are still open)

**Decision 6**
Decision: The team will not attempt to fully solve every scheduling edge case now; ship a simpler, flexible time-entry capability first and refine later based on real usage.
Who made or supported it: A‑Felix, implicitly agreed by the group (conversation moves on without objection)
Timestamp: 38:11–39:46
Reason: Avoids over-planning and delivery delay while the full business-logic picture is still being uncovered.
Impact: Keeps the project moving; some scheduling nuances will be handled manually or refined later.
Next step: Revisit once real usage data/patterns exist.
Confidence level: **Medium** (agreed in the room, but not written down as a formal scope document)

**Decision 7**
Decision: Full order details (exact addresses, contact info, license plate/VIN, instructions) stay hidden until after a driver accepts the job; only a reduced preview is shown beforehand.
Who made or supported it: A‑Ferhat (already implemented; presented as existing, sound practice)
Timestamp: 58:06
Reason: Encourages fast decisions on limited info, while ensuring sensitive/detailed info is only shared with a committed driver.
Impact: Confirmed, already-built UX pattern.
Next step: None — considered settled.
Confidence level: **High**

**Decision 8**
Decision: The "Partner Policy" (Terms & Conditions) will be an external link to separately managed static content rather than content rendered inside the app.
Who made or supported it: A‑Ferhat
Timestamp: 1:00:42
Reason: Standard practice, easier to manage/update Terms independently of app releases.
Impact: Simple architecture choice.
Next step: None.
Confidence level: **High**

**Decision 9**
Decision: Overlapping postal-code filter prefixes should be treated so the broader prefix subsumes/unions with the narrower one (broader wins) rather than the narrower one being silently dropped.
Who made or supported it: A‑Ferhat proposed; C1 explicitly agreed ("you're right")
Timestamp: 49:59–51:20
Reason: Matches the logically correct behavior a user would expect.
Impact: Concrete, buildable filter-logic specification.
Next step: Implement as specified.
Confidence level: **High**

**Decision 10**
Decision: The time-window/business-logic topic will get dedicated discussion time in the upcoming Monday meeting.
Who made or supported it: A‑Ferhat proposed; no objection from the client
Timestamp: 30:39–31:52
Reason: Too large/important a topic to fully resolve inside this meeting.
Impact: Sets the agenda for the next session.
Next step: Prepare notes/questions ahead of Monday (see Section 15).
Confidence level: **High**

### Implied decisions (not explicitly finalized, but reasonably clear from context)

- The client will produce a single consolidated Corporate Design reference document (fonts, hex codes, corner style, accent colors) before final visual styling is locked. *(Implied by 13:40–14:31 — treated as an obligation, not phrased as a formal commitment with a date.)*
- The client's internal "manual reschedule" workaround (edit Excel, inform end-client, republish) implies the platform will eventually need an equivalent "edit/republish a live order" capability. *(Implied at 24:48 — never stated as a formal feature request.)*

---

## 6. Action items and follow ups

| Action item | Owner | Deadline | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| Provide new logo + vector file once new company name is finalized | Client (C1) | Not specified | 0:06–1:35 | Medium | New name likely starts with "A," not yet confirmed |
| Provide a compact/small logo variant for browser-tab-sized use | Client (C1) | Not specified | 0:58–1:14 | Low | Explicitly deferred "over time" |
| Verify iOS/PWA behavior for auto-filling emailed one-time passcodes | Agency (A‑Ferhat / A‑Felix) | Not specified | 6:37–8:47 | Medium | Outcome is uncertain and partly outside team's control |
| Produce and send a Corporate Design reference document (fonts, hex codes, accent colors, corner radius) | Client (C1) | Not specified | 13:40–14:31 | High | Blocks final visual polish; no date given, tied to client's own website launch |
| Add a visible number (not just a dot) to the notification icon in all locations | Agency (design) | Not specified | 13:17, 46:48 | Medium | Requested twice, same answer both times |
| Reintroduce the "results preview" count inside the filter overlay | Agency (design) | Not specified | 18:18–18:49 | Medium | Was removed for space; client flagged it as important |
| Align internally on whether pickup/delivery times show on the compact marketplace card or only in the detail view | Client (C1 & C2) | Not specified | 19:14–22:41 | High | Open disagreement between the two client reps; blocks a layout decision |
| Prepare detailed notes on time-window / "by-latest" / multi-day-trip business rules for the Monday deep-dive | Both sides | Next Monday meeting | 30:39–31:52 | High | See Section 15 for a suggested pre-meeting checklist |
| Decide whether Pickup Date Range and Delivery Date Range filters must fall in the same window or act independently | Client (C1) | Not specified | 51:20–52:14 | Medium | Explicitly "we'll think about it" |
| Decide whether to show vehicle-type icons, including whether an EV-specific icon is wanted | Client (C1) | Not specified | 39:46–42:06 | Low–Medium | Some drivers actively avoid EVs — sensitive detail |
| Finalize sort-order labels/options | Client (C1) | Not specified | 55:53–56:13 | Medium | "Need to think about it" |
| Send any preferred icon references (e.g., preferred bell/notification icon) before design freeze | Client (C1) | Before design freeze (no date) | 46:48–47:32 | Medium | Explicit open invitation from agency |
| Add a "back to Marketplace" button on the post-accept "View Job" screen | Agency (design) | Not specified | 1:01:48 | Medium | Addresses a real, demonstrated usability risk |
| Add a Figma placeholder comment noting the accepted order's PDF should also be emailed | Agency (A‑Ferhat) | Not specified | 1:02:44–1:03:31 | Low | Screen not yet built out for this |
| Complete internal team review of all Figma screens and give one consolidated round of final feedback | Client team | "This weekend or maybe after Monday" (soft) | 48:10–48:34 | High | Deadline explicitly uncertain — track actively |
| Share Figma access link via WhatsApp group and Monday.com item | Agency (A‑Ferhat) | Immediately after meeting (implied) | 1:10:22–1:10:52 | Medium | Standard housekeeping |
| Confirm WhatsApp group membership is complete and correct (Felix, Carolina, others) | Client (C1), assisted by C2 | Not specified | 1:10:52–1:12:52 | Low | Some confusion observed live (misdialed call, uncertain membership) |

---

## 7. Problems, risks, and concerns

**1. Client scheduling business logic is undocumented ("tribal knowledge")**
Where it appeared: 19:54–39:40, most explicitly at 30:39–31:52.
Why it matters: The dev team is building a structured system on top of rules that currently only exist as spoken explanation and informal Excel/PDF workflows.
Possible consequence: If misunderstood or only partially captured, the software could be less flexible than the client's current manual process, forcing costly rework later.
Suggested next step: Turn this meeting's business-logic discussion into a written internal requirements note before the Monday follow-up (see Section 9).
Explicit or implied: **Explicit** — directly stated by A‑Ferhat.

**2. Internal client disagreement on marketplace card time display**
Where it appeared: 19:14–22:41.
Why it matters: Blocks a layout decision the agency needs in order to finalize the marketplace card design.
Possible consequence: Continued back-and-forth or a design built on an assumption that gets overturned later.
Suggested next step: Client (C1 and C2) should resolve this internally and communicate one unified answer.
Explicit or implied: **Explicit**.

**3. Usability risk: post-accept screen looks almost identical to pre-accept screen**
Where it appeared: 1:01:04–1:01:48.
Why it matters: Even the presenter briefly didn't notice the mode change — a strong signal that real drivers could get confused about whether they've actually committed to a job.
Possible consequence: Driver confusion, accidental actions, support burden.
Suggested next step: Implement the proposed "back to Marketplace" button; consider an additional visual cue (e.g., a different header color/label) marking the "in-progress job" mode.
Explicit or implied: **Explicit**, demonstrated live.

**4. Missing Corporate Design blocks final visual polish**
Where it appeared: 13:40–14:31.
Why it matters: Without official colors/fonts/hex codes, the agency is designing with placeholder styling that will need to be revisited.
Possible consequence: Rework once the real design system arrives; possible delay if it arrives late.
Suggested next step: Set an informal target date for the client to deliver this document, even if approximate.
Explicit or implied: **Explicit**.

**5. Recurring connectivity issue for A‑Ferhat**
Where it appeared: 1:08:22–1:09:53.
Why it matters: A‑Ferhat's video/audio froze mid-meeting; this matches a pattern also seen in at least one other related Autheon meeting recording.
Possible consequence: Lost meeting time, repeated disruptions, potential missed information during freezes.
Suggested next step: **Recommendation** (not discussed in the transcript): consider checking network/hardware setup ahead of the next call.
Explicit or implied: **Implied** — the freeze itself is explicit; the "recurring pattern" and suggested fix are this analysis's own observation/recommendation.

**6. Several UI micro-decisions deferred without deadlines**
Where it appeared: throughout — sort labels (55:53), vehicle-type icons (39:46), preview count (18:49), date-range interaction (51:20).
Why it matters: A growing pile of "we'll think about it" items with no tracking deadline risks stalling design freeze.
Possible consequence: Items get forgotten or resurface late in the process.
Suggested next step: Track all open items in one place (Monday.com or a single Figma page) with owners, even if deadlines stay soft.
Explicit or implied: **Implied** — the individual deferrals are explicit; the accumulation risk is this analysis's observation.

**7. Coordination gap in WhatsApp group setup**
Where it appeared: 1:10:52–1:12:52.
Why it matters: Uncertainty about who is actually in the group, an accidental call, and a comment about a number possibly being blocked as spam suggest the contact list isn't fully reliable yet.
Possible consequence: Quick informal questions may not reach everyone who needs them.
Suggested next step: Confirm final group membership explicitly in a follow-up message.
Explicit or implied: **Explicit** (the confusion itself is visible in the transcript).

---

## 8. Hidden or indirect important points

**Hidden point 1 — The client's default working style is deliberate, not fast-and-loose**
Transcript evidence: Repeated instances of "we can't decide this on the spot, let's think about it / discuss internally" (43:17, 52:14, 56:13, and others).
Why it matters: This is a consistent pattern, not a one-off. Future meetings should be planned expecting an async follow-up round for most visual/design questions rather than expecting final sign-off live.
What should be done with it: Build this expectation into meeting planning — treat live meetings as "present + gather initial reactions," and Figma comments as where real decisions get finalized.

**Hidden point 2 — The "serious, premium, not playful" brand stance is a strong, repeated opinion**
Transcript evidence: 41:03, phrased with unusual emphasis ("this is very important to us personally").
Why it matters: This should function as a standing design/copywriting constraint applied to *every* future screen, not just the ones discussed in this meeting.
What should be done with it: Write it into a short design-principles note so future contributors (designers, copywriters) don't have to rediscover it.

**Hidden point 3 — The presenter's own confusion is proof of a real usability risk**
Transcript evidence: 1:01:04–1:01:48 — A‑Ferhat says he didn't notice he'd been "teleported" into a new screen mode.
Why it matters: This isn't a hypothetical risk raised in the abstract — it actually happened to the person who built and knows the screen best.
What should be done with it: Treat this as a priority fix, not a "nice to have" (see Risk #3 above).

**Hidden point 4 — Missing Corporate Design is itself tied to another unfinished external dependency**
Transcript evidence: 13:40 — "our website isn't online yet."
Why it matters: The Corporate Design document depends on the client's own website launch, which has no stated timeline. This is a dependency chain worth tracking as its own item, not just a simple "please send us a document" task.
What should be done with it: Ask the client for a rough estimate of their website timeline, since it gates a project deliverable.

**Hidden point 5 — Autheon explicitly frames itself as designing for future clients it doesn't have yet**
Transcript evidence: 35:26–36:19 — "we are a fresh new company... we must not fixate on one client."
Why it matters: This reframes every business rule discussed in this meeting as *one example* of a pattern, not a permanent spec. Future originating clients may introduce entirely new rules not covered here.
What should be done with it: When documenting business logic (see Section 9), explicitly label which rules are "current client X's rules" versus "general platform rules," so the distinction isn't lost later.

**Hidden point 6 — The Figma-comments-as-source-of-truth idea, proposed casually, is a real process improvement**
Transcript evidence: 1:10:01 — proposed by C1 near the very end, almost as an aside.
Why it matters: This is arguably one of the most useful ideas in the entire meeting, but it's easy to overlook since it wasn't flagged as a "decision" in the moment.
What should be done with it: Treat this as an adopted working principle going forward (see Reusable Knowledge, Section 11).

**Hidden point 7 — The team is aware of, but hasn't fully resolved, a tension between flexibility and buildability**
Transcript evidence: The contrast between Point 22 (business logic is complex and undocumented — risk of over-constraining) and Decision 6 / Point 24 (don't over-plan, ship something simple now).
Why it matters: These two positions are in genuine tension. The meeting ends with an intent to revisit on Monday, but the actual resolution — how to be flexible *without* over-engineering — is still open.
What should be done with it: Make this tension the explicit framing question for the Monday session, rather than treating it as already resolved.

---

## 9. Documentation points

**Documentation point:** Client's real-world scheduling rules (time windows vary 2–6h by end-client; some orders are fixed-time; some are "by-latest" deadlines; occasional multi-day/overnight trips; Autheon applies its own safety-buffer deadline beyond what the end-client requires).
Where it should be documented: A dedicated internal requirements/business-rules document, referenced by both teams before the Monday meeting.
Why it should be documented: This is tribal knowledge today; if it stays undocumented, it will likely need to be re-explained from memory in every future discussion, with a real risk of details being lost or contradicted.
Suggested clean wording: *"Order timing can be represented three ways: (1) a time window with a client-chosen start and end, (2) an exact fixed time, or (3) an open-ended 'no later than [date/time]' deadline. Window length is not fixed system-wide — it is set per order and historically ranges from 2 to 6 hours depending on the originating client. Autheon may apply an internal deadline stricter than the end-client's actual requirement, as an operational safety margin."*

**Documentation point:** Multi-language (i18n) scope clarification.
Where it should be documented: Product backlog / roadmap, and the requirements document.
Why it should be documented: Prevents a future misunderstanding that the product is "already multilingual" when only German/English UI strings exist, not true dynamic multi-language support for free-text content.
Suggested clean wording: *"v1 ships with German (primary, polished) and English UI language files. True multi-language support for free-text/user-generated content (notifications, emails) is a distinct future feature, not yet in scope."*

**Documentation point:** Feedback process.
Where it should be documented: Team onboarding notes / project SOP.
Why it should be documented: Avoids the "should I use Word or Figma?" question resurfacing with any new reviewer.
Suggested clean wording: *"All design feedback is given as comments directly on the shared Figma file. Do not create separate Word documents or screenshots with markup."*

**Documentation point:** Brand tone and visual style guideline.
Where it should be documented: A short design-principles page, linked from the main project brief.
Why it should be documented: A strong, repeated client preference that should guide every future screen and every piece of copy, not just the ones reviewed today.
Suggested clean wording: *"The app must read as serious and premium, never playful. Avoid cartoonish icons. All copy uses a formal, polite register (addressing subcontracted business owners, not employees)."*

**Documentation point:** Postal-code filter overlap logic.
Where it should be documented: Technical filter-logic specification for the marketplace search feature.
Why it should be documented: A precise rule was worked out live and agreed; if not written down, a future developer could implement it differently without knowing this conversation happened.
Suggested clean wording: *"When a user enters multiple postal-code prefixes where one is a subset of another (e.g., '51' and '510'), treat the broader prefix as inclusive of the narrower one — do not silently drop or overwrite the broader match."*

**Documentation point:** Progressive disclosure of job details (pre- vs. post-acceptance).
Where it should be documented: UX pattern library / design documentation.
Why it should be documented: A deliberate, reusable design pattern that should be applied consistently to any future screen with similar "preview before commit" needs.
Suggested clean wording: *"Only show a reduced preview of order details before acceptance. Full details (exact addresses, on-site contacts, license plate/VIN, instructions) unlock only after the driver accepts."*

**Documentation point:** Open items still pending client decision.
Where it should be documented: A single tracked list (Monday.com board or a dedicated Figma page) — see Section 6 for the current list.
Why it should be documented: Multiple "we'll think about it" items are currently scattered across the conversation with no single tracking location.
Suggested clean wording: *"Open Design Decisions" tracker, one row per item, with a status column (Open / Client reviewing / Resolved).*

---

## 10. Open questions

**Question 1:** Should pickup/delivery time windows be shown on the compact marketplace list card, or only after tapping into the order-detail screen?
Why it matters: Directly affects the marketplace card layout; currently blocked by internal client disagreement.
Who should answer: Client (C1 and C2 to align internally, then relay one answer).
Related transcript part: 19:14–22:41
Priority: High

**Question 2:** Should the "results preview" count (how many results a filter-in-progress would return) be reintroduced into the filter overlay?
Why it matters: Client called it "actually pretty important" but no final decision was made.
Who should answer: Client (C1)
Related transcript part: 18:18–18:49
Priority: Medium

**Question 3:** When both a Pickup Date Range and a Delivery Date Range filter are set, must both fall inside the same window, or are they independent constraints?
Why it matters: Affects filter logic correctness for a not-yet-finalized feature.
Who should answer: Client (C1)
Related transcript part: 51:20–52:14
Priority: Medium

**Question 4:** Should vehicle-type icons be shown at all, and if so, should an EV-specific icon be included?
Why it matters: Small UI decision with a real underlying user-preference nuance (some drivers avoid EVs).
Who should answer: Client (C1)
Related transcript part: 39:46–42:06
Priority: Low–Medium

**Question 5:** What should the final sort-order options and labels be?
Why it matters: Currently only roughly sketched (newest, price up/down, one unclear/garbled option); client explicitly said they need to think about it.
Who should answer: Client (C1)
Related transcript part: 55:53–56:13
Priority: Medium

**Question 6:** Is Dark Mode actually required for this app?
Why it matters: Briefly mentioned but the transcript is unclear/garbled at this point — not clearly resolved either way.
Who should answer: Client (C1), to be re-confirmed since this analysis could not extract a clear answer from the recording.
Related transcript part: ~9:16 (unclear passage)
Priority: Low (flagged mainly so it isn't silently dropped)

**Question 7:** What will the new company/brand name actually be?
Why it matters: Blocks the final logo/branding deliverable.
Who should answer: Client (C1)
Related transcript part: 0:06
Priority: Medium

**Question 8:** How should the two "number" concepts (total marketplace jobs vs. filter-preview result count) be visually distinguished so they aren't confused with each other or with a "filters active" badge?
Why it matters: Directly connects to the UX heuristic raised at 57:32 about badge-number ambiguity; not yet resolved.
Who should answer: Agency design team, with client sign-off.
Related transcript part: 18:01–18:49 and 57:32
Priority: Medium

---

## 11. Reusable knowledge from this meeting

**Lesson 1 — Use the collaboration tool's native comments as the shared source of truth, not a separate document format**
Explanation: Switching from "mark up a Word doc with arrows" to "comment directly in Figma" keeps feedback attached to the exact element it refers to and avoids duplicate, hard-to-reconcile feedback documents.
Example from the meeting: 11:04–13:17, and reinforced again at 1:10:01 when the client proposed using accumulated Figma comments as the thing future meetings should resolve, rather than re-explaining everything live.
How to reuse it later: Whenever starting design review with a new stakeholder or team, explicitly state up front which tool is the "source of truth" for feedback, to avoid the Word-vs-native-comments question resurfacing.

**Lesson 2 — When a client has a mature, undocumented business process, ask for it explicitly and early, before building a rigid data model around assumptions**
Explanation: Software is much harder to restructure later than a flexible Excel/PDF workflow. Asking "walk me through exactly how this really works today" before finalizing a schema avoids expensive rework.
Example from the meeting: 19:54–39:40, especially A‑Ferhat's explicit warning at 30:39–31:52.
How to reuse it later: Before finalizing any data model for a new feature, run a short "how does this actually work today, including edge cases" conversation, even if it feels like a detour from the visual review.

**Lesson 3 — A number badge on a UI control has a conventional meaning users expect; reusing that pattern for a different meaning creates confusion**
Explanation: Users are trained to read a small number badge near a filter/sort control as "how many filters are active." Using the same visual pattern to mean "how many results this returns" risks misinterpretation.
Example from the meeting: 57:32.
How to reuse it later: Before reusing a familiar UI pattern for a new purpose, explicitly check whether the new meaning matches what users already expect from that pattern; if not, use a visually distinct element instead.

**Lesson 4 — Progressive disclosure (show less before commitment, more after) is a good pattern for marketplace/gig-style acceptance flows**
Explanation: Showing a reduced preview before a driver commits, then unlocking full detail after acceptance, speeds up decision-making while protecting sensitive details until there's a real commitment.
Example from the meeting: 58:06.
How to reuse it later: Apply the same "preview before commit, detail after commit" pattern to any future feature involving a similar accept/commit action.

**Lesson 5 — Deliberately choosing not to over-engineer, and saying so out loud, is a useful project-management move**
Explanation: Naming the temptation to "solve every edge case now" and consciously rejecting it (in favor of a simpler v1 plus later refinement) keeps a complex discussion from stalling the whole project.
Example from the meeting: 38:11–39:46.
How to reuse it later: When a requirements discussion starts spiraling into many hypothetical edge cases, explicitly pause and ask: "Do we need to solve this now, or can we ship something flexible and revisit once we have real usage data?"

**Lesson 6 — Test a new screen/flow on yourself while presenting it — if you get confused, users will too**
Explanation: The presenter's own momentary confusion about which screen "mode" he was in was the clearest possible evidence of a real usability problem.
Example from the meeting: 1:01:04–1:01:48.
How to reuse it later: Treat your own confusion while demoing a flow as a strong, first-hand usability signal — don't dismiss it just because you "know" how the feature is supposed to work.

---

## 12. Clean meeting notes

**Meeting title:** Autheon × AW — Jour Fixe (Design & Backend Review)
**Date:** 2026-06-25 (inferred from file metadata)
**Duration:** ~1h 13m
**Attendees:** Autheon client team (2 representatives), Agency/dev team (2 representatives — lead presenter very likely Ferhat, technical support very likely Felix)

**Main purpose:** Review recent Figma design work on the driver marketplace app (login, marketplace, filters, job details, navigation) and check in on backend/database progress.

**Topics discussed:**
- Pending branding assets (logo, vector file, new company name)
- Login and password-reset flow, including OTP autofill limitations
- Scope of multi-language support (in scope: static UI strings; out of scope for now: dynamic free-text content)
- Feedback process (Figma comments as the standard channel)
- Marketplace home screen: job counts, notification icon
- Filter and sort UI redesign, including postal-code and date-range filter logic
- Time-window vs. fixed-time vs. "by-latest" scheduling logic (major topic)
- Vehicle-type icons and overall brand tone (serious/premium, not playful)
- Job card visual refinements (price, date, distance)
- Bottom navigation redesign
- Job acceptance flow and post-acceptance screen (usability risk identified)
- Backend/database progress demo
- Tooling housekeeping (Monday.com, WhatsApp group)

**Important conclusions:**
- The client's real scheduling rules are more varied and flexible than a simple fixed-time model would capture; this needs dedicated design attention.
- Figma comments are now the agreed feedback channel for the whole project.
- The app's tone must stay serious/premium; never playful.
- A real usability risk exists around the post-acceptance screen looking too similar to the pre-acceptance one.

**Decisions:** See Section 5 for the full list — highlights: Figma-comments-as-feedback-channel; total job count shown on marketplace home; visible notification count (not just a dot); support both time windows and fixed times in the data model; hide full order details until after acceptance; postal-code filter overlap logic.

**Action items:** See Section 6 for the full table with owners and evidence.

**Risks:** Undocumented business logic (high); internal client disagreement on time-window display (high); post-acceptance screen confusion (medium-high); missing Corporate Design (medium); A‑Ferhat's recurring connectivity issue (low-medium, recommendation only).

**Open questions:** See Section 10 — highest priority: time-window display on marketplace card; results-preview count reintroduction.

**Next steps:** Dedicated business-logic deep dive at the upcoming Monday meeting; client to complete a full internal review pass of all Figma screens; client to send Corporate Design reference document when ready.

---

## 13. Timeline of the meeting

| Time | Topic | What happened | Importance |
|---|---|---|---|
| 0:06–1:35 | Branding | Logo/vector file status checked; new name (likely starting with "A") still pending | Medium |
| 1:35–4:00 | Login screens & localization | First login/reset screens shown; language-file scope clarified (German polished, English available, full i18n deferred) | Medium |
| 4:00–9:16 | Account provisioning & password reset | Admin-only account creation, provisional credentials, 6-digit OTP reset, iOS autofill uncertainty discussed | Medium |
| 9:16–11:04 | Marketplace welcome screen | First post-login screen reviewed (no name/avatar header); client defers | Medium |
| 11:04–13:17 | Feedback process | Agreed: use Figma comments, not Word docs | High (process) |
| 13:17–14:31 | Notification icon & Corporate Design gap | Client wants a visible number, not a dot; Corporate Design doc still missing | Medium–High |
| 14:38–18:49 | Filter/sort UI & result counts | Combined filter/sort row; total job count confirmed; preview count flagged as important | High |
| 19:14–22:41 | Time display debate | Disagreement between client reps on showing times on the marketplace card | High |
| 22:41–39:40 | Core business-logic deep dive | Time windows vs. fixed times vs. "by-latest," multi-day trips, risk of over-constraining the client, deliberate anti-scope-creep decision | **Very High** |
| 39:46–42:06 | Vehicle icons & brand tone | Icon decision deferred; strong "serious, premium, not playful" tone requirement stated | Medium–High |
| 42:06–48:34 | Job card & nav redesign | Price/date/distance refinements; new floating bottom nav; client commits to a full review pass | Medium |
| 48:34–52:29 | Postal code & date range filters | Overlap logic resolved live; date-range interaction left open | Medium–High |
| 52:29–58:06 | Vehicle type & date range UI walkthrough | Continued Figma demo, mostly confirmatory | Low–Medium |
| 58:06–1:03:59 | Job details & accept flow | Progressive disclosure confirmed; usability risk on post-accept screen identified; PDF/email question resolved | High |
| 1:03:59–1:08:22 | Monday.com usage & backend demo | Tooling how-to; database/API progress shown as status update | Low–Medium |
| 1:08:22–1:09:53 | Connectivity issue | A‑Ferhat's video/audio freezes; team troubleshoots | Low (but recurring pattern) |
| 1:09:53–1:13:12 | Wrap-up & tooling | Figma-comments-as-source-of-truth idea proposed; WhatsApp group setup, minor confusion | Medium (process idea), Low (housekeeping) |

---

## 14. Best transcript evidence

**1.** Timestamp: 30:39 | Speaker: A‑Ferhat | "I think we need to drill into this more, because it looks like you already have a lot of clear business logic — built from real experience over many trips — but it hasn't been fully communicated to us yet. If it isn't, what we build for you could end up boxing you in instead of giving you the freedom you'd actually like." | Why important: The single most strategically important statement in the meeting — names the core risk directly. | Related topic: Business-logic/data-model risk.

**2.** Timestamp: 20:11 | Speaker: C2 | Explains that at least a 4-hour time window is required from the customer, and that some drivers combine multiple tours in a day, so seeing pickup times early matters to them. | Why important: Grounds the time-window debate in a concrete operational reason. | Related topic: Time-window display debate.

**3.** Timestamp: 27:50 | Speaker: C1 | Describes giving a "by [date], at the latest" deadline to drivers rather than an exact delivery moment, and that Autheon sometimes sets a tighter internal deadline than the end-client actually requires, as a buffer. | Why important: Reveals a scheduling nuance ("no later than" vs. exact time) the current design may not fully capture. | Related topic: Scheduling data model.

**4.** Timestamp: 38:11 | Speaker: A‑Felix | Advises against "planning ourselves to death," suggesting the team get a usable version working first and refine time-related details later once there's real experience with them. | Why important: A clear, deliberate scope-discipline decision. | Related topic: MVP vs. over-engineering.

**5.** Timestamp: 41:03 | Speaker: C1 | States that the app must not feel playful, and should instead feel serious and premium, including in the tone of all written copy, because users are unfamiliar subcontracted business owners, not employees. | Why important: A durable brand/tone guideline for the whole product. | Related topic: Brand tone.

**6.** Timestamp: 49:59 | Speaker: A‑Ferhat, agreed by C1 | Works through the postal-code overlap example (e.g., "51" and "510" both entered) and concludes the broader prefix should effectively include/win over the narrower one. | Why important: A precise, resolved piece of filter-logic specification. | Related topic: Search/filter logic.

**7.** Timestamp: 57:32 | Speaker: A‑Ferhat | Notes that a number badge near a filter/sort button is conventionally read as "how many filters are active," not "how many results this returns" — flagging a risk of reusing that pattern for a different meaning. | Why important: A reusable UX heuristic. | Related topic: UI pattern design.

**8.** Timestamp: 58:06 | Speaker: A‑Ferhat | Explains that only a reduced set of details is shown before a driver accepts a job; full details (addresses, contacts, license plate/VIN, instructions) unlock only after acceptance. | Why important: Confirms a deliberate, already-built UX pattern. | Related topic: Job details / accept flow.

**9.** Timestamp: 1:01:04 | Speaker: A‑Ferhat | Admits he didn't immediately notice that clicking into an accepted job had switched him into a different screen "mode," calling it potentially confusing for users. | Why important: First-hand proof of a real usability risk. | Related topic: Post-acceptance screen confusion.

**10.** Timestamp: 1:10:01 | Speaker: C1 | Suggests that Figma comment threads should serve as the shared foundation of open items, so live meetings can be used specifically to resolve points that are "getting stuck," instead of re-explaining everything from scratch. | Why important: A genuinely useful, easily-missed process improvement. | Related topic: Collaboration process.

---

## 15. Final practical action plan

**1. What I should do immediately**
- Log the open items from Section 6 into whatever the team's real tracker is (Monday.com board), with owners even if deadlines are still "not specified."
- Flag the two highest-priority open disagreements (marketplace-card time display; results-preview count) for quick internal client alignment before the next meeting.

**2. What I should document**
- Write up the scheduling business-logic explanation (time windows vary 2–6h by client; fixed times exist; "by-latest" deadlines exist; multi-day trips are rare but must be supported) as a standalone internal note — see Section 9 for suggested wording.
- Write the brand-tone guideline ("serious, premium, never playful; formal copy") as a short, reusable design-principles note.
- Write the postal-code filter overlap rule into the technical filter specification, exactly as agreed.

**3. What I should clarify**
- Ask the client for even a rough estimate of when their Corporate Design document / website launch will be ready, since it blocks final visual polish.
- Ask the client to confirm, in writing, their internal decision on the marketplace-card time-display disagreement.
- Confirm whether Dark Mode is actually required (the transcript is unclear on this point).

**4. What I should discuss with the team**
- Bring the core tension between "the business logic is more complex than assumed" (risk) and "don't over-engineer, ship something flexible" (decision) into the Monday meeting as the explicit framing question, not as something already fully resolved.
- Discuss the post-acceptance screen usability risk and confirm the "back to Marketplace" button fix gets built.

**5. What I should turn into tasks**
- All items in the Section 6 action-item table.
- The two unresolved UX/UI badge-and-count questions (Section 10, Questions 2 and 8).

**6. What I should remember for later**
- Autheon explicitly wants a platform flexible enough for *future* originating clients with different rules, not just the current one — treat today's specific numbers (e.g., "4-hour window") as one example, not a hard constant.
- The Figma-comments-as-source-of-truth idea (Section 11, Lesson 1) is worth actively reinforcing in future meetings, since it was proposed almost in passing but is genuinely valuable.

---

## 16. Importance rating

**Rating: 7 / 10**

Explanation:
- **Number of decisions (High):** A solid number of concrete decisions were reached (feedback process, several UI requirements, postal-code filter logic, progressive disclosure confirmation), even though many remain "let's think about it."
- **Number of action items (High):** 17 distinct action items identified, spanning both sides (client and agency).
- **Strategic value (High):** The business-logic risk conversation (Section 4, Points 21–24; Section 7, Risk 1) is genuinely strategic — it's the kind of issue that, if missed, causes expensive rework months later.
- **Risk level (Medium-High):** No single risk is catastrophic, but the combination of undocumented business logic, an unresolved internal client disagreement, and a demonstrated usability confusion adds up to meaningful risk if not actively tracked.
- **Reusable knowledge (High):** Several genuinely transferable lessons came out of this meeting (Section 11) — the badge-semantics heuristic, the progressive-disclosure pattern, the "test it on yourself while presenting" habit, and the Figma-comments-as-source-of-truth process idea.
- **Impact on future work (Medium-High):** Sets the agenda for the next meeting (Monday deep-dive) and establishes lasting process/tone guidelines that will apply well beyond this single session.

It is not a 9–10 because there was no single make-or-break decision, no crisis, and much of the visual/UX content is incremental design polish rather than pivotal strategy — but the business-logic segment alone pushes this meeting well above an average status call.

---

## 17. Final short summary

**What was this meeting really about?**
This was a regular check-in between Autheon (the client) and their agency/dev team about the driver marketplace app. Most of it was a screen-by-screen review of new Figma designs (login, marketplace, filters, notifications, job details). But partway through, the conversation turned into something more important: a detailed look at how Autheon's real scheduling rules actually work — and a warning that if those rules aren't captured properly, the software could end up more rigid than the client's current manual process.

**Why was it important?**
Because it surfaced a real risk before it became an expensive problem. It also produced several concrete UI decisions, agreed on a clear feedback process (Figma comments), set a lasting brand-tone rule ("serious, not playful"), and caught a genuine usability mistake (a confusing post-acceptance screen) while it was still cheap to fix.

**What are the most important next steps?**
1. Dedicate real time in the Monday meeting to fully working through the scheduling/time-window business logic.
2. Get the two client stakeholders aligned on whether pickup/delivery times show on the marketplace card.
3. Write down the business rules, the brand-tone guideline, and the postal-code filter logic somewhere permanent, so they don't rely on memory of this one conversation.
4. Keep tracking the growing list of "we'll think about it" items so none of them get lost before design freeze.

---

*This analysis was produced by reading the full transcript (205 lines, ~1h13m) directly from the uploaded file. Points marked "Open," "Unclear," "Implied," or "Recommendation" reflect genuine ambiguity or inference on the analyst's part, not confirmed facts from the transcript.*