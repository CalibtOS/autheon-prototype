# Task book — IDs, owners, order

**This is the work list.** ClickUp must match it after [`clickup-apply.md`](./clickup-apply.md).  
**Acceptance** for a card: `appendices/epic-*-binary-ac.md` (not this file).  
**Charter / program Done:** [`prototype-fe-be-production-alignment.md`](./prototype-fe-be-production-alignment.md).  
**Client questions:** [`appendices/oq-disposition.md`](./appendices/oq-disposition.md).

Authority: prototype → PRD v2.38 → DBML/BE. Exact clone. Do not invent OQs. Retired IDs are never reused.

---

## 1. How to run one card

1. You are the **Owner** in §3 (ignore stale ClickUp `[Person]` until clickup-apply is done).  
2. Open the AC section for that ID.  
3. Open the prototype named in Authority.  
4. Implement only the AC rows. One card `in progress`.  
5. PR + proto\|FE screenshots. Done = every AC row Pass or N/A.

Umbrellas are not implementation WIP. Parent Done only when all surviving children Done.

---

## 2. Fastest order (critical path)

End date is Omar’s chain. Everyone else works **beside** it.

```text
Ismail A-0 → Omar A-2 → A-3 → A-4 → A-6
          → Omar L-1 → L-2
          → Omar E-1d + E-2 → Marwan E-1 body + E-3 → QA K-2 / K-4
```

Parallel after A-0: Ismail B-1/C-1 → Yasser B/C. Karim **M-1** from day 1.

**Do not:** Marketplace clone before L-2 · Marwan My Jobs before D-2a · G-6 Done before OQ #22–28 · J-2 before J-1 confirms a gap.

### Phase 0 (start now)

| Person | Order |
|--------|--------|
| Ismail | **A-0** |
| Omar | A-1 (N/A if A-0 enough) → **A-2** → A-3 → A-4 → A-6 → **L-1** → **L-2** → L-3…L-6, L-8 → **N-2** |
| Yasser | **N-1** |
| Karim | **M-1** |
| Marwan | After **L-1**: F-1a. Not E-1 until L-2 PASS |
| Youssef | Draft K-1/K-2 checklists; A-5 after A-2 works on live BE; L-9 after L-1…L-6 |

### Later phases

| Phase | Start when | Who does what |
|-------|------------|----------------|
| 1 | A-0 done | Ismail B-1, C-1, B-8 · Yasser B-2 → B-3 → B-3a → B-4 → B-5 and C-2 → C-3 · Karim M-2, M-3 if M-1 done |
| 2 | Epic A exit | Omar D-1 → D-2a → D-3 → D-4 · Marwan D-2b…e · Karim G-3 → G-4 → G-7 → G-8 |
| 3 | L-1 **and** L-2 PASS | Omar E-1d → E-2 → E-1g → E-6 → E-7 → F-5 · Marwan E-1a → E-1b → E-1f → E-1e (after E-1d) → E-3 → E-4 → F-1/F-2/F-4 · Karim F-6 → F-3a/b/c · Yasser F-7 · Ismail F-8 |
| 4 | B-3 shell + phase 2 moving | Omar G-2, H-5, G-6 (when OQs allow) · Marwan H-1a, H-2a…c, H-3 · Karim G-1a/b, G-11a/b, G-9, I-2, H-1b, H-2d, H-4 · Yasser G-5, I-1, I-3, I-4, I-5, N-3 (after N-2), N-4 · Ismail J-1 |
| 5 | Build waves done | Youssef K · Ayman SEC-1…3 · Ismail J-2/J-3 only if J-1 confirmed · Omar K-5 |

---

## 3. Owners (skill-fit)

| Person | Lane | IDs |
|--------|------|-----|
| **Omar** | Architect / hard FS | A-1…A-4, A-6 · L-1…L-6, L-8 · D-1, D-2a, D-3, D-4 · E-1d, E-1g, E-2, E-6, E-7 · N-2 · G-2, G-6, H-5, F-5, K-5 |
| **Marwan** | Driver FE + SP UI | F-1a…d, F-2, F-4a…d, F-3d · H-1a, H-2a…c, H-3 · D-2b…e · E-1a, E-1b, E-1e, E-1f, E-4 · E-3, E-5 |
| **Karim** | Admin FE + notif chrome | G-1a, G-1b, G-11a/b, G-3, G-4, G-7, G-8, G-9 · M-1…M-3 · I-2a…c · F-6 · F-3a/b/c · H-1b, H-2d, H-4 |
| **Yasser** | BE-strong FS | B-2, B-3a, B-4, B-5, B-7, B-9, B-10 · C-2, C-3, C-4 · I-1a/b, I-3, I-4a/b, I-5a…c · G-5 · F-7 · N-1, N-3, N-4 |
| **Ismail** | BE only | A-0 · B-1, B-8 · C-1 · F-8 · J-1, J-2, J-3 · G-6 BE collab |
| **Youssef** | QA | K-1…K-4, K-6 · L-9 · A-5 · D-2f, D-5 · E-1i · F-1e, F-4e · B-6 · C-5 · N-5 |
| **Ayman** | Security | SEC-1, SEC-2, SEC-3 (F-5 collab) |

Do not pad Ismail/Youssef/Ayman with FE clone work.

**ClickUp people IDs:** Omar `87704079` · Marwan `87724881` · Yasser `87690667` · Karim `87889039` · Ismail `87889037` · Youssef `87791931` · Ayman `93759472`

---

## 4. Surviving WBS (retired IDs in §5)

Wave prefix: W0 = A, L, N · W1 = B, C · W2 = D + G-3/4/7/8 · W3 = E, F, F-7/F-8 · W4 = G rest, H, I, M · W5 = K, J, SEC. OQs have no wave.

| ID | Title (short) | Depends |
|----|---------------|---------|
| A-0…A-6 | Shared enums, Report Problem, i18n, tests, smoke, dual vocab | A-0 before A-1…A-4 |
| L-1…L-6, L-8, L-9 | PWA chrome (L-7 → L-6) | L-1 before L-2; L-9 after L-1…L-6 |
| N-1…N-5 | Dialog standard | N-2 before N-3 |
| E-1 | Umbrella Marketplace | children a,b,d,e,f,g,i |
| E-1a | Results-row | L-1/L-2 |
| E-1b | Empty + loading (was +E-1c) | E-1a |
| E-1d | FilterSheet | L-2 |
| E-1e | Badge + chips | E-1d |
| E-1f | JobCard | E-1a |
| E-1g | Gated Portal (was +E-1h) | L-2 |
| E-1i | D05+D06 sign-off | E-1a…g |
| E-2…E-7 | Locked chrome, accept/perform, maps, refresh, overlap, probation | E-1e after E-1d; E-3 after E-2 for F-3c |
| D-2 | Umbrella My Jobs | D-2a…f |
| D-2a | Bucket membership | A |
| D-2b…e | UI | D-2a; D-2b needs L-4 |
| D-1, D-3, D-4, D-5 | Report Problem UX, labels, evidence, e2e | A |
| F-1 / F-3 / F-4 | Umbrellas Profile / Notifs / Infopoint | F-3a…d (e/f retired); F-3d needs F-4c |
| F-2, F-5, F-6, F-7, F-8 | Prefs, driver auth, admin auth, mail, SMTP | F-7 PDF attach needs G-6 |
| B-1…B-10 | Tour billing (B-3 umbrella + B-3a docs tab) | B-1 before B-2 |
| C-1…C-5 | SP documents | C-1 before C-2 |
| G-1 | Umbrella overview | G-1a (was +G-1c), G-1b |
| G-2…G-9, G-11a/b | Jobs / PDF / VIN+schedule (G-10 → G-9) | G-6 Done blocked OQ #22–28 |
| H-1…H-5 | SP / Staff / MDR / probation | Documents tab = C-3 |
| I-1…I-5 | CC, feed, audit, Infopoint admin, settings | — |
| M-1…M-3 | Admin nav + titles (M-4 → M-1), CC hierarchy, foot | — |
| J-1…J-3 | Gap log; implement only if confirmed | J-2/J-3 wait on J-1 |
| SEC-1…3 | IDOR / session | — |
| K-1…K-6 | QA / clone / e2e / ClickUp hygiene | — |

---

## 5. Retired (canceled in ClickUp)

| Retired | Merged into |
|---------|-------------|
| L-7 | L-6 |
| M-4 | M-1 |
| E-1c | E-1b |
| E-1h | E-1g |
| G-10 | G-9 |
| G-1c | G-1a |
| F-3e, F-3f | F-3a |

---

## 6. PRD T1–T34 → this book

T1 foundation (BE done) · T2 H/F-5/F-6 · T3 H · T4 I-1 · T5 G-2 · T6 G · T7 E-1+L · T8 E-2 · T9 E-3/E-6/E-7 · T10 D-2+L · T11 E-3 · T12 A+D · T13 G-3 · T14 G-4 · T15 G-1+M-1 · T16 G-7…G-9 · T17 G-6 · T18 F-4/I-4 · T19 F-1/F-2 · T20 F-3/I-2 · T21 G-5/B · T22 I-3 · T23 N · T24 G-1/I-3 · T25 E/F/L · T26 K · T27 B · T28 E-4 · T29 K/ops · T30 H-5 · T31 I-5 · T32 A+D+G-3/G-4 · T33 I-2 · T34 C.

---

## 7. ClickUp IDs we already know

List `901217611464`. Full apply steps: [`clickup-apply.md`](./clickup-apply.md).

| ID | ClickUp |
|----|---------|
| A-0 | `869egzkry` |
| A-2 | `869egzktf` |
| E-1 | `869ehepxk` |
| E-1a | `869ehepy1` |
| E-1b | `869ehepy0` |
| E-1g | `869eheq1p` |
| E-1i | `869eheq2g` |
| E-2 | `869egzm03` |
| F-3 | `869egzm0p` |
| F-3a | `869ehet4u` |
| F-3b | `869ehet55` |
| F-7 | `869egznfy` |
| F-8 | `869egzp84` |
| G-1 | `869egzm0w` |
| G-1a | `869ehet5h` |
| G-2 | `869egzm0x` |
| G-5 | `869egzm0y` |
| G-6 | `869egzm11` |
| G-9 | `869egzm18` |
| G-11b | `869ehet5q` |
| I-1 | `869egzm1k` |
| I-1a | `869ehet6k` |
| L-6 | `869egzkua` |
| M-1 | `869egzm1u` |
| M-2 | `869egzm1t` |
| J-2 | `869eheu37` |
| J-3 | `869eheu98` |
| SEC-1 | `869eheu2h` |
| SEC-2 | `869eheu2t` |
| SEC-3 | `869eheu2u` |
