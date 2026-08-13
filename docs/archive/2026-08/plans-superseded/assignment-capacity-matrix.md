# Assignment + capacity matrix (skill-fit)

**Date:** 2026-08-13 (structure revision — merge pass)  
**Points:** S=1 · M=2 · L=3 · XL=5 · umbrellas=0  
**Equal load:** the four product builders (Omar, Marwan, Karim, Yasser) stay at **47 / 48 / 46 / 47**. Marwan is 48 because **E-4** (maps handoff) had no owner — assigned to driver FE, not padded onto Ismail. Karim is 46 because **F-3f** (OQ gate) was retired as a non-build card.  
**Specialist lanes stay in-role:** Ismail BE, Youssef QA, Ayman security — do **not** pad them with FE clone work they are weak at.

**Authority:** prototype → PRD v2.38 → DBML/BE. Exact clone. No invent OQs.  
**WBS:** [task-split-registry.md](./task-split-registry.md) · **How to run work:** [pm-operating-system.md](./pm-operating-system.md)

**ClickUp people IDs:** Omar `87704079` · Marwan `87724881` · Yasser `87690667` · Karim `87889039` · Ismail `87889037` · Youssef `87791931` · Ayman `93759472`

---

## How we used the skill profiles

| Person | Profile | Assignment rule |
|--------|---------|-----------------|
| **Omar** | Strongest FS, solution architect, team lead | Hardest / cross-cutting only: Storno contract, PWA shell architecture, locked-job chrome, FilterSheet, vehicle domain, dialog primitive, auth, PDF coord. **Not** 20 marketplace grind cards. |
| **Marwan** | Mid FS, **stronger FE** | Driver FE clone + SP profile/MDR UI (visual 1:1). |
| **Karim** | **FE only** (small BE) | Admin FE clone (jobs chrome, nav, feed) + driver notification **list chrome** (pure UI). No DTOs, no SMTP, no IDOR. |
| **Yasser** | Mid FS, **stronger BE** | Billing, SP docs, customers, settings/`app_settings`, finance panel, mail with Ismail. One FE migrate card (N-3) because he is still FS. |
| **Ismail** | **BE only** (small FE) | Shared package, DTOs, persist, SMTP, gap log, PDF BE. Collab on Yasser/Omar cards — never primary on UI clone. |
| **Youssef** | QA | Sign-off + e2e + Axis V only. |
| **Ayman** | Security | SEC-1…3 + F-5 collab. |

---

## Weighted load

| Person | Pts | Difficulty mix |
|--------|-----|----------------|
| Omar | **47** | High (architecture / domain) |
| Marwan | **48** | Medium (FE clone, MDR rules); +1 E-4 (was unassigned) |
| Karim | **46** | Medium (admin + notif chrome); −1 for retired F-3f gate |
| Yasser | **47** | Medium (BE-adjacent FS) |
| Youssef | 30 | QA lane |
| Ismail | 19 | BE lane (all real BE work; not padded) |
| Ayman | 8 | Security lane |

---

## Omar — 47 pts (architect / lead)

Unblocks the team. Reviews umbrellas he does not implement.

| IDs | Pts | Why Omar |
|-----|-----|----------|
| A-1…A-4, A-6 | 5 | Storno contract + dual vocabulary (A-0 Ismail primary) |
| L-1…L-6, L-8 | 11 | PWA shell architecture (L-7 merged into L-6) |
| D-1, D-2a, D-3, D-4 | 7 | Storno domain + bucket membership rules |
| E-1d, E-1g, E-2, E-6, E-7 | 11 | Hardest marketplace (FilterSheet, gated Portal) + locked chrome + accept gates. E-1h merged into E-1g |
| N-2 | 2 | Dialog primitive = shared architecture |
| G-2 | 3 | Vehicle domain / Systemlogik |
| F-5 | 2 | Driver auth architecture (Ayman collab) |
| G-6 | 2 | PDF UX coord (blocked OQ #22–28; Ismail BE) |
| H-5 | 2 | Probation snapshot = same source as E-7 |
| K-5 | 2 | Lead owns assignment hygiene |

**Not Omar:** E-1a/b/e/f grind, F profile/infopoint, admin nav, billing UI.

---

## Marwan — 48 pts (FE-strong FS)

Driver visual clone + SP profile (FE-heavy).

| IDs | Pts |
|-----|-----|
| F-1a…d, F-2, F-4a…d | 17 |
| F-3d | 3 | Deep links depend on F-4c |
| H-1a, H-2a…c, H-3 | 13 | SP chrome + profile tabs + MDR (ties F-1b) |
| D-2b…e | 6 | My Jobs UI (membership = Omar D-2a) |
| E-1a, E-1b, E-1e, E-1f, **E-4** | 8 | Marketplace body clone after Omar L + E-1d. E-1c merged into E-1b. E-4 maps handoff (OQ #3 interim) |
| E-3, E-5 | 3 | Accept/perform sheets + RQ refresh |

Umbrellas: F-1, F-4, D-2 (children mixed with Omar D-2a), E-1 (Omar owns E-1d/g).

---

## Karim — 46 pts (FE only)

Admin screens + notification **chrome** (no BE contracts).

| IDs | Pts |
|-----|-----|
| G-1a, G-1b, G-11a/b, G-3, G-4, G-7, G-8, G-9 | 19 | G-1c → G-1a; G-10 → G-9 |
| M-1…M-3 | 5 | Nav order + titles (M-4 merged into M-1). Admin FAIL today |
| I-2a…c | 6 | Feed chrome |
| F-6 | 2 | Admin login chrome |
| F-3a, F-3b, F-3c | 8 | Notif list/expand/actions (UI). F-3e/f merged into F-3a. F-3d stays Marwan |
| H-1b, H-2d, H-4 | 6 | AccessSwitch, notes/audit tabs, Staff pane |

**Not Karim:** G-2 (Omar domain), G-5 (Yasser+Ismail finance), G-6 (Omar+Ismail PDF), B-8/C-1/F-8 (Ismail).

---

## Yasser — 47 pts (BE-strong FS)

Data/API-shaped product work. Ismail owns the pure BE slices inside the same verticals.

| IDs | Pts |
|-----|-----|
| B-2, B-3a, B-4, B-5, B-7, B-9, B-10 | 14 | (B-1 + B-8 = Ismail) |
| C-2, C-3, C-4 | 7 | (C-1 = Ismail) |
| I-1a/b | 4 | Customers/Addresses CRUD |
| I-3 | 2 | Audit (BE-adjacent) |
| I-4a/b | 4 | Infopoint admin CRUD |
| I-5a…c | 6 | `app_settings` (keep three clusters; do not mega-merge) |
| G-5 | 2 | Job finance vs `job_financials` |
| F-7 | 2 | Booked/assigned mail (Ismail SMTP) |
| N-1, N-3, N-4 | 6 | Inventory + migrate + error patterns (FS; N-2 = Omar). N-3 stays one vertical |

---

## Ismail — 19 pts (BE only)

| IDs | Pts |
|-----|-----|
| A-0 | 2 | Shared package HEAD |
| B-1, B-8 | 1+2 | CI DTOs + tour-doc persist |
| C-1 | 1 | SP doc enums |
| F-8 | 2 | AUTHEON SMTP |
| F-7 | 2 | Mail send path (Yasser FE/FS collab) |
| J-1 | 2 | Gap log |
| J-2 | 3 | Only if J-1 confirms |
| J-3 | 2 | Dual-publish on enum change |
| G-6 | 2 | PDF generation BE |

Do not assign Ismail marketplace/admin clone cards to “equalize” to 47.

---

## Youssef — 30 pts (QA)

K-1 L, K-2 L, K-3 M, K-4 XL, K-6 M, L-9 M, A-5 S, D-2f S, D-5 L, E-1i S, F-1e S, F-4e S, B-6 M, C-5 M, N-5 S.

---

## Ayman — 8 pts (security)

SEC-1 M, SEC-2 M, SEC-3 M. F-5 collab with Omar. No invent OQ #4/#18.

---

## Cross-lane dependencies (do not break)

```
Ismail A-0  →  Omar A-1…A-4
Omar L-1/L-2  →  Marwan E-1a/b/e/f
Omar E-1d  →  Marwan E-1e chips
Omar D-2a  →  Marwan D-2b…e
Omar N-2  →  Yasser N-3
Marwan F-4c  →  Marwan F-3d  →  Karim F-3c (E-2 Omar)
Yasser B-2  →  Yasser B-4/B-5  (Ismail B-1/B-8)
Omar E-7  ↔  Omar H-5  (same probation source)
Karim M-1  →  all admin fidelity
```

---

## Wave start (skill-fit)

| Wave | Omar | Marwan | Karim | Yasser | Ismail |
|------|------|--------|-------|--------|--------|
| W0 | A + L + N-2 | — | **M-1** (nav+titles FAIL) | N-1 inventory | A-0 |
| W1 | — | — | — | B + C | B-1, B-8, C-1 |
| W2 | D-1/D-2a/D-3/D-4 | D-2b…e | G-3/G-4/G-7/G-8 | — | — |
| W3 | E-1d/g, E-2, E-6/7, F-5 | E-1a/b/e/f, **E-4**, E-3, F-1/F-4 | F-3 chrome, F-6 | F-7 | F-8 |
| W4 | G-2, G-6, H-5 | H-1a, H-2, H-3 | G rest, M, I-2, H-1b/H-4 | I-1, I-3, I-4, I-5, G-5 | J-1 |
| W5 | K-5 | — | — | — | J-2/J-3 | Youssef K, Ayman SEC |

---

## ClickUp

**SOT is this file** for assignees. Title pattern: `[Wn][ID][Role][Person] Title`.

### Apply queue (2026-08-13 structure revision)

ClickUp **update API is rate-limited** (~23h). Search still works. Apply this queue when the API recovers. Until then **this file wins** over leftover `[Person]` tags.

**Cancel** (status `canceled`, first line `Merged into {ID}`):

| Retired | ID | Into |
|---------|-----|------|
| L-7 | `869egzku1` | L-6 `869egzkua` |
| M-4 | `869ehetj1` | M-1 `869egzm1u` |
| E-1c | `869eheq0y` | E-1b `869ehepy0` |
| E-1h | `869eheqa1` | E-1g `869eheq1p` |
| G-10 | `869egzm17` | G-9 `869egzm18` |
| G-1c | `869ehet5p` | G-1a `869ehet5h` |
| F-3e | `869ehet59` | F-3a `869ehet4u` |
| F-3f | `869ehet5a` | F-3a `869ehet4u` |

**Retitle surviving parents + single assignee:**

| ID | ClickUp | New title | Assignee |
|----|---------|-----------|----------|
| L-6 | `869egzkua` | `[W0][L-6][FE][Omar] Tab visual + overlay stacking` | Omar |
| M-1 | `869egzm1u` | `[W4][M-1][FE][Karim] Sidebar order + chrome titles EN+DE` | Karim only |
| E-1b | `869ehepy0` | `[W3][E-1b][FE][Marwan] Marketplace empty + loading` | Marwan |
| E-1g | `869eheq1p` | `[W3][E-1g][FE][Omar] Portal gated branches` | Omar |
| G-9 | `869egzm18` | `[W4][G-9][FE][Karim] VIN + schedule-override dialogs` | Karim only |
| G-1a | `869ehet5h` | `[W4][G-1a][FE][Karim] Overview tiles + filters + new-job` | Karim |
| F-3a | `869ehet4u` | `[W3][F-3a][FE][Karim] Notif list chrome + tab bar + OQ gate` | Karim |

**Known assignee mismatches to fix (title `[Person]` + primary assignee):**

| ClickUp | Today | Should be |
|---------|-------|-----------|
| E-1a `869ehepy1` | Omar | **Marwan** |
| E-1b `869ehepy0` | Omar | **Marwan** |
| F-3a `869ehet4u` / F-3b `869ehet55` / F-3 umbrella `869egzm0p` | Marwan | **Karim** on a/b/c; umbrella can stay unassigned or Karim |
| I-1a `869ehet6k` | Marwan | **Yasser** |
| G-2 `869egzm0x` | Karim+Marwan | **Omar** only |
| M-1 `869egzm1u` / M-2 `869egzm1t` | Karim+Marwan | **Karim** only |
| E-1i `869eheq2g` | Omar+Youssef | **Youssef** only |
