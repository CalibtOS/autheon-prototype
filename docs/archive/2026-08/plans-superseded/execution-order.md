# Fastest-path execution order

**Purpose:** Finish the program in the shortest calendar time **without** skipping gates (skipping gates creates rework, which is slower).  
**Owners:** [assignment-capacity-matrix.md](./assignment-capacity-matrix.md)  
**How to pull a card:** [pm-operating-system.md](./pm-operating-system.md)  
**What exists:** [task-split-registry.md](./task-split-registry.md)

This file is the **day-to-day work order**. The master plan is the charter. Do not invent a third sequence.

---

## 1. The idea in one paragraph

Five people can code at once. The **end date** is set by Omar’s chain (shared enums → Storno → PWA chrome → hard marketplace/job cards). Everyone else stays busy on work that does **not** sit on that chain. Marwan is idle only until Omar finishes **L-1**; then he starts driver clone. Youssef prepares checklists from day one. Ayman waits until there is product to attack (Wave 5), except collab on F-5.

**Any order does not work.** Parallel inside a phase does.

---

## 2. Critical path (this is what makes the project late if it slips)

```text
Ismail A-0
    → Omar A-2 (Storno codes) → A-3 → A-4 → A-6     === Epic A exit
    → Omar L-1 (shared header) → L-2 (Marketplace chrome)
    → Omar E-1d FilterSheet + E-2 locked job
    → Marwan E-1 body + E-3 accept
    → Youssef E-1i + K-2 driver clone
    → K-4 journeys + K-6 Axis V
```

Second critical path (admin / billing), mostly **parallel** to the driver path after A-0:

```text
A-0 → Ismail B-1/C-1 → Yasser B-2 → B-3/B-3a → B-4 → B-5
    → Karim admin chrome (M-1 already started in phase 0)
    → Youssef K-1 admin clone + K-4
```

PDF **G-6 Done** is off the critical path for Wave 0–3. It waits on client OQ #22–28. Do not stall A/L/N/E for it.

---

## 3. How one person works one task (every card, every wave)

1. Confirm you are the owner in the capacity matrix (ignore stale ClickUp `[Person]` until K-5).
2. Open the AC appendix section for that ID (Goal · Authority · Acceptance).
3. Open the prototype file named in Authority (side-by-side).
4. Implement **only** the AC rows. No redesign.
5. PR + proto\|FE screenshots on the card.
6. Mark the card Done only when every AC row is Pass or explicit N/A.
7. Pull the **next** card in **your lane** below — not a random later-wave card.

WIP = **one** build card in progress.

---

## 4. Phase-by-phase order (fastest calendar)

Phases overlap on purpose. A person who finishes their phase-N cards starts the first unblocked phase-N+1 card in their lane.

### Phase 0 — Day 1 (four lanes, Marwan waits ~L-1)

| Lane | Order (do top to bottom) | Blocked by |
|------|--------------------------|------------|
| **Ismail** | **A-0** | — |
| **Omar** | A-1 (N/A if A-0 enough) → **A-2** → A-3 → A-4 → A-6 | A-0 |
| **Yasser** | **N-1** (inventory) | — |
| **Karim** | **M-1** (nav + titles) | — |
| **Marwan** | *Idle until Omar L-1 lands* — then F-1a (see Phase 0b) | L-1 |
| **Youssef** | Draft K-1 / K-2 screenshot checklists (no code) | — |

Omar after A-6: **L-1 immediately** (do not start E-1). Then **L-2**. Then L-3, L-4, L-5, L-6, L-8 (any order). Then **N-2**.

Youssef **A-5** (live Storno smoke) as soon as A-2 works on live BE.  
Youssef **L-9** after L-1…L-6.

### Phase 0b — As soon as L-1 is Done (kill Marwan idle time)

| Lane | Start |
|------|--------|
| **Marwan** | F-1a Profile landing (needs L-1; L-4 if control bands not ready, do F-1a identity/nav first) |
| **Omar** | Keep L-2 → rest of L → N-2 (do not join Marwan’s F cards) |

Do **not** let Marwan start E-1 until L-2 PASS.

### Phase 1 — After A-0 (overlaps Omar still on L)

| Lane | Order |
|------|--------|
| **Ismail** | B-1 CI DTOs → C-1 SP doc enums → B-8 tour-doc persist |
| **Yasser** | After N-1: B-2 hooks → **B-3** shell → **B-3a** docs tab → B-4 create → B-5 review → B-7/B-9/B-10 as listed |
| **Yasser** | C-2 → **C-3** Documents tab → C-4 if proto still has onboarding docs |
| **Karim** | If M-1 Done and Omar still on L: **M-2**, **M-3** (admin chrome). Do not start G-11 yet if you will context-switch; M-2/M-3 are small and unstick later admin work |

### Phase 2 — After Epic A exit (A-2…A-6 + A-5 smoke)

| Lane | Order |
|------|--------|
| **Omar** | **D-1** Report Problem UX → **D-2a** bucket rules → D-3 labels → D-4 evidence |
| **Marwan** | **D-2b** → D-2c → D-2d → D-2e (only after D-2a) |
| **Karim** | **G-3** empty-run review → **G-4** admin cancel (≠ SP Storno) → G-7 assign → G-8 notes |
| **Youssef** | D-2f + D-5 when D/G-3/G-4 exist |

### Phase 3 — After L-1 **and** L-2 PASS

Driver content. Fastest = Omar unblocks, Marwan clones volume, Karim does notif chrome.

| Lane | Order |
|------|--------|
| **Omar** | **E-1d** FilterSheet → **E-2** locked chrome → E-1g gated Portal → E-6 overlap → E-7 probation → F-5 auth |
| **Marwan** | **E-1a** results-row → E-1b empty+loading → E-1f JobCard → E-1e chips (**after E-1d**) → E-3 accept/perform → E-4 maps → F-1 rest → F-2 → F-4a…d (**F-4c before F-3d**) |
| **Karim** | F-6 admin login → **F-3a** list → F-3b expand → F-3c actions (**after E-2**) |
| **Yasser** | **F-7** booked/assigned mail (send path; PDF attach stays partial until G-6) |
| **Ismail** | **F-8** SMTP (unblocks F-5 invite + F-7 send) |
| **Youssef** | E-1i, F-1e, F-4e as those umbrellas complete |

### Phase 4 — After B-3 shell exists (G-5) and Phase 2 Storno admin is moving

| Lane | Order |
|------|--------|
| **Omar** | **G-2** vehicle domain → H-5 probation admin (same source as E-7) → G-6 PDF UX **when OQs allow** |
| **Marwan** | H-1a → H-2a…c → **H-3** MDR |
| **Karim** | G-1a → G-1b → **G-11a** → G-11b → G-9 → I-2a…c → H-1b → H-2d → H-4 |
| **Yasser** | G-5 finance → I-1a → I-1b → I-4a → I-4b → I-5a…c → I-3 audit |
| **Ismail** | **J-1** gap log (continuous; not a code dump) |
| **Yasser** | N-3 migrate native dialogs (**after N-2**) → N-4 |

### Phase 5 — After in-scope build waves

| Lane | Order |
|------|--------|
| **Youssef** | K-3 regression → K-1 admin clone → K-2 driver clone → **K-4** journeys J1–J10 → K-6 re-audit |
| **Ayman** | SEC-1 → SEC-2 → SEC-3 (F-5 collab with Omar already happened) |
| **Ismail** | J-2 / J-3 **only if** J-1 confirmed a gap; else N/A |
| **Omar** | K-5 ClickUp hygiene (assignees + merged cards) |

---

## 5. What you must never do “to go faster”

| Temptation | Why it is slower |
|------------|------------------|
| Marketplace clone before L-2 | You rebuild the header twice |
| Marwan My Jobs before D-2a | Wrong jobs in the wrong buckets |
| Admin cancel using SP Storno codes | Dual-vocabulary bug across D + G |
| Inventing OQ #22–28 to close G-6 | Client reject + rewrite PDF |
| Ismail on FE clone to “balance points” | Weak FE, Omar reviews forever |
| Two build cards in progress | Nothing finishes |
| Implementing on an umbrella card | Children diverge, umbrella never Done |

---

## 6. Client OQs vs speed

Answer **#7** first (cancel vs empty-run) — unblocks D-1/G-4 edges.  
Answer **#22–28** when you can — unblocks G-6/F-7 PDF Done.  
Do **not** pause Phase 0–3 waiting for PDF OQs.

How an answer lands: [oq-disposition.md](./appendices/oq-disposition.md).

---

## 7. Where the other plan files fit

Do not duplicate the catalog here. **File job, usage, and “do not use for”** live in [README.md](./README.md).

This file (`execution-order.md`) is **layer 3 — sequence only**. After you know the next ID:

1. Owner → [assignment-capacity-matrix.md](./appendices/assignment-capacity-matrix.md)
2. ID still exists → [task-split-registry.md](./appendices/task-split-registry.md)
3. Pass/fail → matching `epic-*-binary-ac.md`
4. How to run the card → [pm-operating-system.md](./appendices/pm-operating-system.md)

