# PM operating system

**Audience:** anyone pulling a ClickUp card.  
**Companion:** [assignment-capacity-matrix.md](./assignment-capacity-matrix.md) · [task-split-registry.md](./task-split-registry.md) · [../README.md](../README.md)

This is how Autheon alignment work is run. It is the project-manager contract: charter already lives in the [master plan](../prototype-fe-be-production-alignment.md); this file is **operating rhythm, ownership, and task hygiene**.

---

## 1. What “professional PM” means on this program

A complete software program needs these artifacts. We already had most; this file fills the operating gaps.

| PM artifact | Where it lives |
|-------------|----------------|
| Charter (goal, authority, non-goals, program Done) | Master plan §§1, 11 |
| Work breakdown (WBS) | [task-split-registry.md](./task-split-registry.md) |
| Schedule (waves 0–5) | Master plan §5 + registry wave map |
| Resource / skill-fit load | [assignment-capacity-matrix.md](./assignment-capacity-matrix.md) |
| RACI | This file §3 |
| Definition of Ready / Done | This file §§5–6 |
| Quality gates | [coverage-gate.md](./coverage-gate.md) + [exact-screen-clone-gate.md](./exact-screen-clone-gate.md) |
| Requirements traceability | [prd-task-traceability.md](./prd-task-traceability.md) |
| Change control | [oq-disposition.md](./oq-disposition.md) |
| RAID (risks, assumptions, issues, dependencies) | This file §9 + master plan §10 |
| Communication / status | This file §4 |
| Screen inventories | admin + driver prototype inventories |

We do **not** add extra status decks, duplicate epic lists, or a second ClickUp. ClickUp is the board; this folder is the SOT.

---

## 2. Roles (RACI)

| Activity | Omar (lead) | Builders (Marwan / Karim / Yasser / Ismail) | Youssef (QA) | Ayman (sec) | Client / product |
|----------|-------------|-----------------------------------------------|--------------|-------------|------------------|
| Pull a build card, implement, PR | A (hard cards) / C (review) | **R** on owned cards | C (test design) | C on SEC/F-5 | I |
| Exact-clone screenshot sign-off | C | R (attach proto\|FE) | **A** (K-1/K-2/K-6) | I | I |
| Invent layout / “improve” UX | **A** reject | forbidden | reject | — | only via OQ |
| Answer an open question | C (frame impact) | forbidden to invent | I | I | **R/A** |
| Wave start / WIP | **A** | R (one build card) | R (QA lane) | R (SEC) | I |
| BE gap (Epic J) | C | Ismail **R** on J-1…3 | I | C | I |
| Assignment hygiene (K-5) | **R/A** | I | I | I | I |

R = does the work · A = accountable · C = consulted · I = informed.

**One implementer per card.** Collab (Ismail on Yasser verticals, Ayman on F-5) is named in the card body, not a second primary assignee.

---

## 3. Cadence

| Ritual | When | Purpose | Timebox |
|--------|------|---------|---------|
| Daily standup | Every working day | Yesterday / today / blocked (OQ, review, BE) | 15 min |
| Wave review | End of each wave | Exit criteria, clone FAIL list, next wave start | 45 min |
| OQ office | When a card hits an unanswered question | Frame impact; do **not** decide | 20 min |
| PR review | Continuous | Four locks + architecture | per PR |
| Program Done audit | Before release | Re-run coverage + Axis V registries | 1 session |

Standup does not re-plan the WBS. Structure changes go through Omar + this folder, then ClickUp.

---

## 4. How to handle a task (the only legal path)

```
DoR  →  In progress (WIP=1)  →  PR with evidence  →  QA/clone check  →  Done
              ↓
         Blocked / questions  (OQ or dependency — never silent invent)
```

### 4.1 Definition of Ready (must all be true before In progress)

- [ ] Card ID exists in [task-split-registry.md](./task-split-registry.md) (not a retired ID)
- [ ] You are the **named owner** in [assignment-capacity-matrix.md](./assignment-capacity-matrix.md)
- [ ] Binary AC exists in the matching `epic-*-binary-ac.md` (Goal · Authority · Acceptance · DoD)
- [ ] Dependencies in the registry are Done or explicitly N/A
- [ ] Prototype surface identified (file + component + Dxx/Axx)
- [ ] No open OQ that this card’s Done is gated on — or the card is explicitly a partial with named remaining AC
- [ ] Umbrella cards are **not** pulled as implementation work

### 4.2 While in progress

- WIP limit: **one build card** per person (`in progress`). QA may hold one sign-off card plus one e2e card.
- Work the AC rows in order. Do not add screens, stats, or chrome the prototype does not have.
- Dual cancel vocabularies: SP Storno codes stay out of Admin cancel, and the reverse.
- FE: Page → api/hook → Repository → apiClient. No raw fetch in pages.
- If you discover a missing API: log it on **J-1**, do not invent a BE contract on the FE card.

### 4.3 Definition of Done (card)

- [ ] Every binary AC row Pass or explicit N/A with reason (not “later”)
- [ ] PR merged; tests for the slice green
- [ ] Proto \| FE screenshots attached on the ClickUp card for UI work
- [ ] Registry ID (Dxx/Axx) ready for Youssef to mark PASS on K-1/K-2
- [ ] EN/DE strings touched in this slice match prototype keys
- [ ] No native `alert`/`confirm` introduced (Epic N)
- [ ] Umbrella stays open until **all children** Done

### 4.4 Card body (required on every ClickUp task)

The **source of truth** for the body is the matching `epic-*-binary-ac.md` section. ClickUp must contain these four headings (copy from the appendix; do not invent AC):

```markdown
## Goal
{one sentence: what Done looks like for the user/system}

## Authority
- Prototype: {file + component}
- PRD: T{n}
- BE / DBML: {endpoint or enum}
- Axis V: {Dxx or Axx or n/a}
- AC appendix: Autheon/docs/plans/appendices/{file} § {ID}
- Owner: {Person from assignment-capacity-matrix.md}

## Acceptance
{binary table from the appendix — every row Pass or explicit N/A}

## Definition of Done
- All Acceptance rows Pass or N/A with reason
- UI: proto | FE screenshots on this card
- No invented OQ answers; gated OQs listed
- Architecture: Page → api/hook → Repository → apiClient (FE)
```

Umbrella cards: Goal = “all surviving children Done”; Acceptance = child ID list; do not implement on the umbrella.

Retired cards: first line `Merged into {ID}` + status `canceled`. Do not keep a second AC table.

### 4.5 ClickUp statuses (use only these meanings)

| Status | Meaning |
|--------|---------|
| `not started` | Ready or waiting on wave/dependency |
| `in progress` | You are implementing **this** card now |
| `questions` | Blocked on an OQ or a human decision — link the OQ card |
| `completed` | Card DoD met |
| `canceled` | Retired (merged into another card) or out of scope — description must name the surviving ID |

Do not use completed for “moved to another card.” That is `canceled` with a pointer.

---

## 5. WBS rules (merge vs split)

Full living WBS: [task-split-registry.md](./task-split-registry.md).

**A card is one PR by one owner against one surface or one contract.**

| Merge when… | Split when… |
|-------------|-------------|
| Same files + same owner + would land in one PR | XL, or two codebases, or two owners |
| One is a gate/OQ row, not build work | Independent screens/sheets (FilterSheet vs JobCard) |
| Two S cards on the same chrome (empty+loading) | QA evidence vs implementation (keep K-*/\*f sign-off separate) |
| Title contains “and” but both halves are the same dialog family | Title “and” names two user-facing surfaces with different AC |

**Never:**

- Horizontal slices (“all DTOs, then all UI”) except Ismail’s pure BE cards (A-0, B-1, C-1, F-8, J-*)
- Pad Ismail/Youssef/Ayman with FE clone work to fake equal points
- Renumber retired IDs (E-1c stays retired; do not shift E-1d → E-1c)
- Pull an umbrella as the implementation task

---

## 6. Waves and start order

| Wave | Prefix | Start when | People who can start immediately |
|------|--------|------------|----------------------------------|
| 0 | `[W0]` | Now | Omar A+L+N-2 · Ismail A-0 · Yasser N-1 · Karim M-1 (nav FAIL) |
| 1 | `[W1]` | After A-0 shared enums available for billing/docs DTOs | Yasser B/C · Ismail B-1/B-8/C-1 |
| 2 | `[W2]` | After Epic A exit | Omar D-1/D-2a · Marwan D-2b…e · Karim G-3/4/7/8 |
| 3 | `[W3]` | After L-1/L-2 chrome PASS | Omar hard E · Marwan E body + F · Karim F-3 chrome |
| 4 | `[W4]` | After Wave 1 billing shell exists for G-5 | Admin fidelity + H/I/M |
| 5 | `[W5]` | After in-scope build waves | Youssef K · Ayman SEC · Ismail J-2/J-3 if J-1 confirmed |

OQ cards have **no** wave prefix. They are change control, not build.

Wave 0 does **not** wait for OQ #22–28. G-6 waits; A/L/N do not.

---

## 7. RAID (living)

Update this table when a risk becomes an issue or an assumption is disproved. Do not invent product answers here.

### Risks

| ID | Risk | Sev | Mitigation | Owner |
|----|------|-----|------------|-------|
| R1 | FE “improves” beyond prototype | 🔴 | Axis V; reject unsolicited UX; screenshots | Omar + Youssef |
| R2 | Engineer silently answers an OQ | 🔴 | `questions` status; oq-disposition | Omar |
| R3 | Dual enum sources drift | 🟡 | A-0 + J-3 dual-publish | Ismail |
| R4 | Fidelity work before Wave 0 | 🔴 | Wave gate: no E-1 Done before L-1/L-2 | Omar |
| R5 | BE changed to fit old FE | 🔴 | Forbidden; FE moves to proto/DBML | Omar |
| R6 | ClickUp assignees drift from matrix | 🟡 | Matrix is SOT; K-5 retitle | Omar |
| R7 | Over-split cards → coordination tax | 🟡 | 2026-08-13 merge pass (registry) | Omar |

### Assumptions

| ID | Assumption | If false |
|----|------------|----------|
| A1 | Prototype remains signed-off visual/behavioral contract | Stop clone work; new client sign-off |
| A2 | Scope A BE e2e stay the regression floor | K-3 fails → fix BE/FE before new fidelity |
| A3 | Shared package HEAD is the enum SOT after A-0 | A-1 only if A-0 incomplete |

### Issues (open)

| ID | Issue | Impact | Next |
|----|-------|--------|------|
| I1 | Admin nav order/titles still FAIL vs proto | M-1 (merged titles) | Karim Wave 0 parallel |
| I2 | Driver Marketplace still old greeting header | Epic L | Omar Wave 0 |
| I3 | ClickUp list-filter API rate-limited (~23h windows) | Assignee titles can lag matrix | Use search + matrix SOT |

### Dependencies (do not break)

See assignment matrix “Cross-lane dependencies.” Critical:

- Ismail A-0 → Omar A-1…A-4
- Omar L-1/L-2 → Marwan E-1 body
- Omar D-2a → Marwan D-2 UI
- Omar N-2 → Yasser N-3
- OQ #22–28 → G-6 Done (not Wave 0 start)

---

## 8. Status reporting (weekly, one paragraph)

Omar posts (standup or ClickUp comment on K-5):

1. Wave in flight + cards Done this week
2. Blockers (OQ IDs, not vibes)
3. Clone FAIL still open (nav, Marketplace chrome, …)
4. Next week’s WIP (names + IDs)

No second tracker. If it is not in ClickUp + this folder, it is not the plan.

---

## 9. Escalation

| Situation | Escalate to |
|-----------|-------------|
| AC ambiguous vs prototype | Omar (read proto; do not invent) |
| Missing/wrong API | J-1 (Ismail) then Omar |
| Security finding | Ayman; block ship on SEC-1…3 |
| Client product question | OQ card → client; engineering waits |
| Load / skill mismatch | Omar; change matrix first, then ClickUp |

---

## 10. Title + assignment convention

```
[Wn][ID][Role][Person] Short title
```

Example: `[W0][L-1][FE][Omar] Shared DriverScreenHeader on all 4 tabs`

- Person in the title **must** match [assignment-capacity-matrix.md](./assignment-capacity-matrix.md)
- Role: FE · BE · FS · QA · Sec · PM
- Umbrellas: still titled, but **0 pts**, not pulled as WIP
- Retired cards: status `canceled`, title kept, first line of description = `Merged into {ID}`
