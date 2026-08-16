# Autheon production-alignment plans

**Program:** Production FE+BE = exact clone of the signed-off prototype (admin + driver PWA), PRD T1–T34.  
**Planning: 100% complete.** Next: Wave 0 + client OQs + [ClickUp apply](./clickup-apply.md).

**Authority:** prototype → PRD v2.38 → DBML/BE. Redesign = fail. Do not invent OQ answers.

---

## Living files (this is the whole plan)

| File | Job | Open when |
|------|-----|-----------|
| **This README** | Index | Lost |
| [prototype-fe-be-production-alignment.md](./prototype-fe-be-production-alignment.md) | **Charter** — goal, non-goals, epics, program Done | “What are we shipping?” |
| [task-book.md](./task-book.md) | **Work list** — owners, order, surviving IDs | “What do I do next / who owns this?” |
| [clickup-apply.md](./clickup-apply.md) | **Board sync** — every ClickUp change a teammate must make | When API/UI allows; give this file to whoever updates ClickUp |
| [appendices/oq-disposition.md](./appendices/oq-disposition.md) | **Decisions** — 37 OQs | Client questions; blocked cards |
| [appendices/exact-screen-clone-gate.md](./appendices/exact-screen-clone-gate.md) | **Clone scoreboard** — D01–D23 / A01–A25 | QA K-1 / K-2 / K-6 |
| `appendices/epic-a-binary-ac.md` | AC for **A** | Implementing Storno |
| `appendices/epic-l-driver-pwa-shell-ui-ac.md` | AC for **L** | Implementing PWA chrome |
| `appendices/epic-ndbc-binary-ac.md` | AC for **N D B C** | Dialogs, My Jobs, billing, SP docs |
| `appendices/epic-efghimk-binary-ac.md` | AC for **E F G H I M J K SEC** | Everything else |

Implementer loop: **task-book → AC appendix → prototype → PR.**  
QA: clone scoreboard. Client Q: oq-disposition. Board cleanup: clickup-apply.

---

## Hard rules

1. Exact clone. Four locks: proto · PRD · BE/DBML · screenshots.  
2. SP Storno ≠ Admin cancel.  
3. PDF = **G-6** FE (Omar) + **G-6b** BE client-pack templates (Ismail); OQ #22–28 Resolved (#27 = client pack). F-7 attach waits on G-6b.  
4. FE: Page → api/hook → Repository → apiClient.  
5. ClickUp body = Goal · Authority · Acceptance · DoD from the AC appendix.

---

## Not here (on purpose)

`docs/requirements/prd.json` · `docs/database/` · `docs/design/` (prototype visual remediation, different program) · `docs/decisions/` · `docs/product/`

Superseded plan drafts: `docs/archive/2026-08/plans-superseded/`.
