# ClickUp apply playbook — give this file to a teammate

**This is the only file they need to edit the AUTHEON board.**  
Owners and IDs also live in [`task-book.md`](./task-book.md). If ClickUp and the task book disagree after this run, **the task book wins** — fix ClickUp again. Do not invent a third assignment scheme.

**Who:** anyone with edit access to the AUTHEON list.  
**How:** Prefer MCP/`clickup_update_task` when the API allows; otherwise the ClickUp **website**.  
**API status (2026-08-16):** Sync complete + **G-6b** integrated (`869ebyppk` Ismail BE client-pack templates). OQ #27 amended to client pack. G-6 = Omar FE. Non-WBS client-review `869ebf84g` kept as authority.  
**Do not:** invent OQ answers · reuse retired IDs · put umbrellas `in progress` · assign Ismail to FE clone cards · implement on RETIRED cards · invent new WBS IDs (OQ mirror cards only when disposition has a row with no card).

**Done when:** every checkbox in Parts A–F is ticked, then comment on **K-5**: `ClickUp apply playbook 2026-08-14 complete` (posted).

---

## 0. Open this list

- **List:** AUTHEON  
- **List ID:** `901217611464`  
- **URL:** https://app.clickup.com/901217611464  
- **Title pattern (every build card):** `[Wn][ID][Role][Person] Short title`  
  Example: `[W0][A-0][BE][Ismail] Sync FE shared to BE HEAD`  
- **Umbrellas:** `[Wn][ID][Role] Umbrella — …` (Person optional; **not** implementation WIP)  
- **OQ cards:** no `[Wn]` prefix.

### People (set **exactly one** primary assignee)

| Person | ClickUp user ID | Email |
|--------|-----------------|-------|
| Omar Emad | `87704079` | omar.emad@calibtos.com |
| Marwan | `87724881` | marwan.shakib@calibtos.com |
| Mohamed Yasser | `87690667` | mohamed.yasser@calibtos.com |
| Karim | `87889039` | karim.ayman@calibtos.com |
| Ismail | `87889037` | ismail.nagaty@calibtos.com |
| Youssef | `87791931` | youssef.elkondakly@calibtos.com |
| Ayman | `93759472` | (security) |

If a card has two people, **remove** the extra. Collab is a **comment**, not a second assignee.

**Collab comments only (do not add a second assignee):**

| Card | Comment to add |
|------|----------------|
| F-7 | `Collab: Ismail SMTP (F-8). Yasser stays primary.` |
| G-6 | FE Omar — PDF bytes from **G-6b** |
| G-6b | Ismail primary — client pack templates (`869ebyppk`) |
| F-5 | `Collab: Ayman (SEC). Omar stays primary.` |

### Statuses (use only these)

| Status | Meaning |
|--------|---------|
| `not started` | Default for open work |
| `in progress` | Someone is implementing **this** card now |
| `questions` | Blocked on an OQ — link the OQ card |
| `completed` | Card DoD met |
| `canceled` | Retired / merged — **not** “moved” |

If the UI shows `cancelled` (British spelling), use that. Same meaning.

### How to find a card

1. Search the AUTHEON list for the ID in brackets: `[E-1c]` or `[L-7]`.  
2. Or open `https://app.clickup.com/t/{id}` from the tables.  
3. Include closed/canceled in search if the card vanished.  
4. Children often sit under an umbrella (E-1, F-1, F-3, F-4, D-2, G-1, H-1, H-2, I-1, I-2, I-4, I-5, SEC). Expand the parent.

### How to paste a description (every surviving card you touch)

Replace the description with this skeleton. Fill from the **AC file** in Part C. Copy Goal / Authority / AC table / DoD from that section. Do not invent extra AC.

```markdown
## Goal
{one sentence from the AC section}

## Authority
- Prototype: {from AC}
- PRD: T{n}
- BE / DBML: {from AC}
- Axis V: {Dxx/Axx or n/a}
- AC: Autheon/docs/plans/appendices/{file} § {ID}
- Owner: {Person}

## Acceptance
{paste the binary table from the AC section}

## Definition of Done
- All Acceptance rows Pass or explicit N/A with reason
- UI: proto | FE screenshots on this card
- No invented OQ answers
- FE: Page → api/hook → Repository → apiClient
```

**AC files (repo path `Autheon/docs/plans/`):**

| IDs starting with | File |
|-------------------|------|
| A- | `appendices/epic-a-binary-ac.md` |
| L- | `appendices/epic-l-driver-pwa-shell-ui-ac.md` |
| N- D- B- C- | `appendices/epic-ndbc-binary-ac.md` |
| E- F- G- H- I- M- J- K- SEC | `appendices/epic-efghimk-binary-ac.md` |
| OQ # | `appendices/oq-disposition.md` |

Waves: **W0** = A, L, N · **W1** = B, C · **W2** = D + G-3/4/7/8 · **W3** = E, F, F-7, F-8 · **W4** = remaining G, H, I, M · **W5** = K, J, SEC. OQs have no wave.

---

## Part A — Cancel merged cards (do first)

For each row: open the card → status **`canceled`** → rename as in “New title” → description **first line only** as given → remove extra assignees.

| ☑ | Search | URL | New title | Description first line |
|---|--------|-----|-----------|------------------------|
| ☑ | `[L-7]` | https://app.clickup.com/t/869egzku1 | `[RETIRED][L-7] Merged into L-6` | `Merged into L-6 (https://app.clickup.com/t/869egzkua). Overlay stacking is L-6.7–L-6.9. Do not implement.` |
| ☑ | `[M-4]` | https://app.clickup.com/t/869ehetj1 | `[RETIRED][M-4] Merged into M-1` | `Merged into M-1 (https://app.clickup.com/t/869egzm1u). Chrome titles are M-1.5–M-1.10. Do not implement.` |
| ☑ | `[E-1c]` | https://app.clickup.com/t/869eheq0y | `[RETIRED][E-1c] Merged into E-1b` | `Merged into E-1b (https://app.clickup.com/t/869ehepy0). Loading skeleton is E-1b.4–E-1b.6. Do not implement.` |
| ☑ | `[E-1h]` | https://app.clickup.com/t/869eheqa1 | `[RETIRED][E-1h] Merged into E-1g` | `Merged into E-1g (https://app.clickup.com/t/869eheq1p). Inactivity banner is E-1g.4–E-1g.5. Do not implement.` |
| ☑ | `[G-10]` | https://app.clickup.com/t/869egzm17 | `[RETIRED][G-10] Merged into G-9` | `Merged into G-9 (https://app.clickup.com/t/869egzm18). Schedule-override is G-9.4–G-9.6. Do not implement. Remove Ismail if assigned.` |
| ☑ | `[G-1c]` | https://app.clickup.com/t/869ehet5p | `[RETIRED][G-1c] Merged into G-1a` | `Merged into G-1a (https://app.clickup.com/t/869ehet5h). New-job entry is G-1a.3. Do not implement.` |
| ☑ | `[F-3e]` | https://app.clickup.com/t/869ehet59 | `[RETIRED][F-3e] Merged into F-3a` | `Merged into F-3a (https://app.clickup.com/t/869ehet4u). Tab-bar hide is F-3a.2. Do not implement.` |
| ☑ | `[F-3f]` | https://app.clickup.com/t/869ehet5a | `[RETIRED][F-3f] Merged into F-3a` | `Merged into F-3a (https://app.clickup.com/t/869ehet4u). OQ #29–32 is F-3a.3 (gate, not a build card). Do not implement.` |
| ☑ | Pre-plan notif mega | https://app.clickup.com/t/869efuuc7 | `[RETIRED] Notifications refactor — superseded by F-3 / I-2 / I-2d / J-1` | Pointers to F-3 · I-2d · J-1; schedule CRON gaps → J-1→J-2 |

Also cancel if still open: `[E-1-OLD]` / `SUPERSEDED` mega-card `869egzkwb` (already canceled once — confirm).

**Never reuse** L-7, M-4, E-1c, E-1h, G-10, G-1c, F-3e, F-3f, or `869efuuc7` as new work.

---

## Part B — Retitle + owner + description on surviving merge parents

Paste AC from the file/section. **One** assignee. These absorbed the retired cards — descriptions **must** include the absorbed AC rows.

| ☑ | Search | URL | New title | Assignee | AC section |
|---|--------|-----|-----------|----------|------------|
| ☑ | `[L-6]` | https://app.clickup.com/t/869egzkua | `[W0][L-6][FE][Omar] Tab visual + overlay stacking` | Omar only | `epic-l-driver-pwa-shell-ui-ac.md` § L-6 |
| ☑ | `[M-1]` | https://app.clickup.com/t/869egzm1u | `[W4][M-1][FE][Karim] Sidebar order + chrome titles EN+DE` | Karim only (remove Marwan) | `epic-efghimk-binary-ac.md` § M-1 |
| ☑ | `[E-1b]` | https://app.clickup.com/t/869ehepy0 | `[W3][E-1b][FE][Marwan] Marketplace empty + loading` | Marwan only | `epic-efghimk-binary-ac.md` § E-1b |
| ☑ | `[E-1g]` | https://app.clickup.com/t/869eheq1p | `[W3][E-1g][FE][Omar] Portal gated branches` | Omar only | `epic-efghimk-binary-ac.md` § E-1g |
| ☑ | `[G-9]` | https://app.clickup.com/t/869egzm18 | `[W4][G-9][FE][Karim] VIN + schedule-override dialogs` | Karim only | `epic-efghimk-binary-ac.md` § G-9 |
| ☑ | `[G-1a]` | https://app.clickup.com/t/869ehet5h | `[W4][G-1a][FE][Karim] Overview tiles + filters + new-job` | Karim only | `epic-efghimk-binary-ac.md` § G-1a |
| ☑ | `[F-3a]` | https://app.clickup.com/t/869ehet4u | `[W3][F-3a][FE][Karim] Notif list chrome + tab bar + OQ gate` | Karim only | `epic-efghimk-binary-ac.md` § F-3a |

---

## Part C — Every surviving card (title + one assignee)

Work top to bottom. For each row:

1. Search `[ID]` (or open the URL if listed).  
2. Set title **exactly** as written.  
3. Set **one** assignee (the Person column). Remove anyone else.  
4. Umbrellas: do **not** set `in progress`. Assignee optional as noted.  
5. If the card is missing, **create it** in list `901217611464` with that title (do not reuse a RETIRED id).  
6. Description paste is Part D — you can do title+assignee now and paste AC in D, or both at once.

`URL` blank = search `[ID]`. Known ClickUp ids are linked.

### Confirmed wrong today (do these even if you skip the rest of C)

| ☑ | Search | URL | Fix |
|---|--------|-----|-----|
| ☑ | `[E-1a]` | https://app.clickup.com/t/869ehepy1 | Omar → **Marwan** |
| ☑ | `[E-1b]` | https://app.clickup.com/t/869ehepy0 | Omar → **Marwan** |
| ☑ | `[E-1i]` | https://app.clickup.com/t/869eheq2g | Omar+Youssef → **Youssef only** |
| ☑ | `[E-4]` | search `[E-4]` | Must be **Marwan** |
| ☑ | `[F-3a]` | https://app.clickup.com/t/869ehet4u | Marwan → **Karim** |
| ☑ | `[F-3b]` | https://app.clickup.com/t/869ehet55 | Marwan → **Karim** |
| ☑ | `[F-3c]` | search `[F-3c]` | Must be **Karim** |
| ☑ | `[F-7]` | https://app.clickup.com/t/869egznfy | Title may still say Omar → **Yasser**. Comment Ismail SMTP |
| ☑ | `[G-2]` | https://app.clickup.com/t/869egzm0x | Karim+Marwan → **Omar only** |
| ☑ | `[G-5]` | https://app.clickup.com/t/869egzm0y | Title may still say Karim → **Yasser** |
| ☑ | `[G-6]` | https://app.clickup.com/t/869egzm11 | Title may still say Karim → **Omar**. Comment Ismail PDF BE + OQ #22–28 |
| ☑ | `[I-1a]` | https://app.clickup.com/t/869ehet6k | Marwan → **Yasser** |
| ☑ | `[M-1]` | https://app.clickup.com/t/869egzm1u | Remove Marwan → **Karim only** |
| ☑ | `[M-2]` | https://app.clickup.com/t/869egzm1t | Remove Marwan → **Karim only** |

### C.1 — Omar (primary)

| ☑ | ID | Exact title | URL |
|---|-----|-------------|-----|
| ☑ | A-6 | `[W0][A-6][FE][Omar] Dual cancel vocabulary docs` | search |
| ☑ | L-1 | `[W0][L-1][FE][Omar] Shared DriverScreenHeader` | search |
| ☑ | L-2 | `[W0][L-2][FE][Omar] Marketplace chrome remove old layout` | search |
| ☑ | L-3 | `[W0][L-3][FE][Omar] Bell + notifications chrome on all tabs` | search |
| ☑ | L-4 | `[W0][L-4][FE][Omar] My Jobs / Infopoint / Profile bands` | search |
| ☑ | L-5 | `[W0][L-5][FE][Omar] Tab bar visibility rules` | search |
| ☑ | L-6 | `[W0][L-6][FE][Omar] Tab visual + overlay stacking` | https://app.clickup.com/t/869egzkua |
| ☑ | L-8 | `[W0][L-8][FE][Omar] Hygiene old desktop layout` | search |
| ☑ | D-1 | `[W2][D-1][FE][Omar] Report problem UX parity` | search |
| ☑ | D-2a | `[W2][D-2a][FE][Omar] My Jobs bucket membership` | search |
| ☑ | D-3 | `[W2][D-3][FE][Omar] Cancelled job reason labels` | search |
| ☑ | D-4 | `[W2][D-4][FE][Omar] Evidence upload source sheet` | search |
| ☑ | E-1d | `[W3][E-1d][FE][Omar] FilterSheet clone` | search |
| ☑ | E-1g | `[W3][E-1g][FE][Omar] Portal gated branches` | https://app.clickup.com/t/869eheq1p |
| ☑ | E-2 | `[W3][E-2][FE][Omar] Locked / unlocked chrome + red-plate` | https://app.clickup.com/t/869egzm03 |
| ☑ | E-6 | `[W3][E-6][FE][Omar] Same-day overlap confirm` | search |
| ☑ | E-7 | `[W3][E-7][FE][Omar] Probation limit block` | search |
| ☑ | N-2 | `[W0][N-2][FE][Omar] Shared Dialog / Confirm / toast primitives` | search |
| ☑ | G-2 | `[W4][G-2][FE][Omar] Job create/edit vehicle domain` | https://app.clickup.com/t/869egzm0x |
| ☑ | F-5 | `[W3][F-5][FE][Omar] Driver auth splash / login / set-password` | search — comment Ayman |
| ☑ | G-6 | `[W4][G-6][FE][Omar] Transport-order PDF UX` | https://app.clickup.com/t/869egzm11 — FE only; PDF bytes from **G-6b** |
| ☑ | H-5 | `[W4][H-5][FE][Omar] Probation UI + manual release` | search |
| ☑ | K-5 | `[W5][K-5][PM][Omar] ClickUp hygiene + assignment` | search |

### C.2 — Marwan (primary)

| ☑ | ID | Exact title | URL |
|---|-----|-------------|-----|
| ☑ | F-1a | `[W3][F-1a][FE][Marwan] Profile landing IA` | search |
| ☑ | F-1b | `[W3][F-1b][FE][Marwan] MDR one-open + 409` | search |
| ☑ | F-1c | `[W3][F-1c][FE][Marwan] Change-email Cancel\|Primary + code` | search |
| ☑ | F-1d | `[W3][F-1d][FE][Marwan] Password + appearance` | search |
| ☑ | F-2 | `[W3][F-2][FE][Marwan] Notification preferences` | search |
| ☑ | F-4a | `[W3][F-4a][FE][Marwan] Infopoint pills + swipe + unread` | search |
| ☑ | F-4b | `[W3][F-4b][FE][Marwan] Docs View ≠ Download + preview` | search |
| ☑ | F-4c | `[W3][F-4c][FE][Marwan] News full-page detail` | search |
| ☑ | F-4d | `[W3][F-4d][FE][Marwan] Help contacts tel/mailto` | search |
| ☑ | F-3d | `[W3][F-3d][FE][Marwan] Notif deep links + return-to-origin` | search |
| ☑ | H-1a | `[W4][H-1a][FE][Marwan] SP center chrome partners \| MDR` | search |
| ☑ | H-2a | `[W4][H-2a][FE][Marwan] SP profile overview + masterdata` | search |
| ☑ | H-2b | `[W4][H-2b][FE][Marwan] SP profile orders tab` | search |
| ☑ | H-2c | `[W4][H-2c][FE][Marwan] SP profile changerequests in-modal` | search |
| ☑ | H-3 | `[W4][H-3][FE][Marwan] MDR queue + approve/reject` | search |
| ☑ | D-2b | `[W2][D-2b][FE][Marwan] My Jobs control band` | search |
| ☑ | D-2c | `[W2][D-2c][FE][Marwan] My-jobs JobCard` | search |
| ☑ | D-2d | `[W2][D-2d][FE][Marwan] My Jobs empty / search-miss / loading` | search |
| ☑ | D-2e | `[W2][D-2e][FE][Marwan] SwipeViews axis-lock + pill sync` | search |
| ☑ | E-1a | `[W3][E-1a][FE][Marwan] Marketplace results-row` | https://app.clickup.com/t/869ehepy1 |
| ☑ | E-1b | `[W3][E-1b][FE][Marwan] Marketplace empty + loading` | https://app.clickup.com/t/869ehepy0 |
| ☑ | E-1e | `[W3][E-1e][FE][Marwan] Filter badge + chips` | search |
| ☑ | E-1f | `[W3][E-1f][FE][Marwan] Marketplace JobCard anatomy` | search |
| ☑ | E-4 | `[W3][E-4][FE][Marwan] External maps handoff` | search — OQ #3 interim = OS maps |
| ☑ | E-3 | `[W3][E-3][FE][Marwan] Accept / Mark performed sheets` | search |
| ☑ | E-5 | `[W3][E-5][FE][Marwan] App-open / pull refresh` | search |

### C.3 — Karim (primary)

| ☑ | ID | Exact title | URL |
|---|-----|-------------|-----|
| ☑ | G-1a | `[W4][G-1a][FE][Karim] Overview tiles + filters + new-job` | https://app.clickup.com/t/869ehet5h |
| ☑ | G-1b | `[W4][G-1b][FE][Karim] RowActionsMenu hide unavailable` | search |
| ☑ | G-11a | `[W4][G-11a][FE][Karim] AdminDetail section chrome` | search |
| ☑ | G-11b | `[W4][G-11b][FE][Karim] AdminDetailFooter action matrix` | https://app.clickup.com/t/869ehet5q |
| ☑ | G-3 | `[W2][G-3][FE][Karim] Empty-run review chips/copy` | search |
| ☑ | G-4 | `[W2][G-4][FE][Karim] Admin cancel + driver-facing message` | search — OQ #7 blocks Done on phase gates |
| ☑ | G-7 | `[W2][G-7][FE][Karim] Assign / reassign driver` | search |
| ☑ | G-8 | `[W2][G-8][FE][Karim] Internal notes panel` | search |
| ☑ | G-9 | `[W4][G-9][FE][Karim] VIN + schedule-override dialogs` | https://app.clickup.com/t/869egzm18 |
| ☑ | M-1 | `[W4][M-1][FE][Karim] Sidebar order + chrome titles EN+DE` | https://app.clickup.com/t/869egzm1u |
| ☑ | M-2 | `[W4][M-2][FE][Karim] Customer Center title hierarchy` | https://app.clickup.com/t/869egzm1t |
| ☑ | M-3 | `[W4][M-3][FE][Karim] Sidebar foot → own Staff profile` | search |
| ☑ | I-2a | `[W4][I-2a][FE][Karim] Admin feed All/Unread/Read chrome` | search |
| ☑ | I-2b | `[W4][I-2b][FE][Karim] Admin feed filter menu` | search |
| ☑ | I-2c | `[W4][I-2c][FE][Karim] Admin feed deep links + bulk` | search |
| ☑ | F-6 | `[W3][F-6][FE][Karim] Admin auth login / set-password` | search |
| ☑ | F-3a | `[W3][F-3a][FE][Karim] Notif list chrome + tab bar + OQ gate` | https://app.clickup.com/t/869ehet4u |
| ☑ | F-3b | `[W3][F-3b][FE][Karim] Ride expand five values only` | https://app.clickup.com/t/869ehet55 |
| ☑ | F-3c | `[W3][F-3c][FE][Karim] Ride actions locked/unlocked` | search |
| ☑ | H-1b | `[W4][H-1b][FE][Karim] DriversPane + AccessSwitch` | search |
| ☑ | H-2d | `[W4][H-2d][FE][Karim] SP profile notes + audit tabs` | search |
| ☑ | H-4 | `[W4][H-4][FE][Karim] Staff invite / resend / last-admin` | search |

### C.4 — Yasser (primary)

| ☑ | ID | Exact title | URL |
|---|-----|-------------|-----|
| ☑ | A-1 | `[W0][A-1][FE][Yasser] Enums available to UI` | https://app.clickup.com/t/869egzktn |
| ☑ | A-2 | `[W0][A-2][FE][Yasser] ReportProblemSheet codes + validation` | https://app.clickup.com/t/869egzktf |
| ☑ | A-3 | `[W0][A-3][FE][Yasser] Storno i18n EN+DE` | https://app.clickup.com/t/869egzktj |
| ☑ | A-4 | `[W0][A-4][FE][Yasser] Storno tests / fixtures` | https://app.clickup.com/t/869egzktg |
| ☑ | B-2 | `[W1][B-2][FS][Yasser] CI repository + hooks` | search |
| ☑ | B-3a | `[W1][B-3a][FS][Yasser] Tour Billing documents tab` | search |
| ☑ | B-4 | `[W1][B-4][FS][Yasser] Consolidated invoice create + mismatch` | search |
| ☑ | B-5 | `[W1][B-5][FS][Yasser] CI review + financeModule gate` | search |
| ☑ | B-7 | `[W1][B-7][FS][Yasser] Tour-doc amount & invoice metadata matrix` | search |
| ☑ | B-9 | `[W1][B-9][FS][Yasser] FE amount/metadata sheet` | search |
| ☑ | B-10 | `[W1][B-10][FS][Yasser] Remove tour document modal` | search |
| ☑ | C-2 | `[W1][C-2][FS][Yasser] SP docs repository + hooks` | search |
| ☑ | C-3 | `[W1][C-3][FS][Yasser] SP Documents tab UI 1:1` | search |
| ☑ | C-4 | `[W1][C-4][FS][Yasser] Create-driver onboarding docs` | search |
| ☑ | I-1a | `[W4][I-1a][FS][Yasser] Customers CRUD` | https://app.clickup.com/t/869ehet6k |
| ☑ | I-1b | `[W4][I-1b][FS][Yasser] Addresses CRUD` | search |
| ☑ | I-3 | `[W4][I-3][FS][Yasser] Audit log filters / export` | search |
| ☑ | I-4a | `[W4][I-4a][FS][Yasser] Infopoint admin docs CRUD` | search |
| ☑ | I-4b | `[W4][I-4b][FS][Yasser] Infopoint admin news CRUD + notify` | search |
| ☑ | I-5a | `[W4][I-5a][FS][Yasser] Settings user pane` | search |
| ☑ | I-5b | `[W4][I-5b][FS][Yasser] Settings system policies` | search |
| ☑ | I-5c | `[W4][I-5c][FS][Yasser] Settings inactivity + help + upload limits` | search |
| ☑ | G-5 | `[W4][G-5][FS][Yasser] Job finance panel vs job_financials` | https://app.clickup.com/t/869egzm0y |
| ☑ | F-7 | `[W3][F-7][FS][Yasser] Driver booked/assigned email + order PDF` | https://app.clickup.com/t/869egznfy — comment Ismail SMTP; PDF attach gated on G-6 |
| ☑ | N-1 | `[W0][N-1][FS][Yasser] Inventory FE alert/confirm/toast` | search |
| ☑ | N-3 | `[W0][N-3][FS][Yasser] Migrate admin+driver off native alert/confirm` | search |
| ☑ | N-4 | `[W0][N-4][FS][Yasser] Error banner / inline field errors` | search |

### C.5 — Ismail (primary) — BE only

Do **not** put Ismail on marketplace, admin clone, G-10, or any FE 1:1 card.

| ☑ | ID | Exact title | URL |
|---|-----|-------------|-----|
| ☑ | A-0 | `[W0][A-0][BE][Ismail] Sync FE shared to BE HEAD` | https://app.clickup.com/t/869egzkry |
| ☑ | B-1 | `[W1][B-1][BE][Ismail] Shared DTOs/Zod for consolidated invoices` | search |
| ☑ | B-8 | `[W1][B-8][BE][Ismail] Persist tour-doc metadata on upload/accept` | search |
| ☑ | C-1 | `[W1][C-1][BE][Ismail] Shared driver-document enums/DTOs` | search |
| ☑ | F-8 | `[W3][F-8][BE][Ismail] AUTHEON SMTP for all application mail` | https://app.clickup.com/t/869egzp84 |
| ☑ | G-6b | `[W4][G-6b][BE][Ismail] Transport-order PDF templates (client pack)` | https://app.clickup.com/t/869ebyppk — authority `869ebf84g` |
| ☑ | J-1 | `[W5][J-1][BE][Ismail] Gap log prototype action → endpoint` | search |
| ☑ | I-2d | `[W4][I-2d][BE][Ismail] Admin feed severity/status + mark-processed` | https://app.clickup.com/t/869ehx7t2 — under I-2; OQ #30 |
| ☑ | J-2 | `[W5][J-2][BE][Ismail] Implement missing BE endpoint` | https://app.clickup.com/t/869eheu37 — keep `not started` until J-1 confirms a gap |
| ☑ | J-3 | `[W5][J-3][BE][Ismail] Shared package dual-publish on enum change` | https://app.clickup.com/t/869eheu98 — same as J-2 |

**G-6** FE stays **Omar**. **G-6b** BE templates = **Ismail** primary (client pack).

### C.6 — Youssef (primary) — QA

| ☑ | ID | Exact title | URL |
|---|-----|-------------|-----|
| ☑ | K-1 | `[W5][K-1][QA][Youssef] Admin side-by-side checklist A01–A25` | search |
| ☑ | K-2 | `[W5][K-2][QA][Youssef] Driver side-by-side checklist D01–D23` | search |
| ☑ | K-3 | `[W5][K-3][QA][Youssef] Scope A BE e2e regression` | search |
| ☑ | K-4 | `[W5][K-4][QA][Youssef] Full FE e2e critical paths` | search |
| ☑ | K-6 | `[W5][K-6][QA][Youssef] Axis V clone gate audit` | search |
| ☑ | L-9 | `[W0][L-9][QA][Youssef] Driver chrome side-by-side QA` | search |
| ☑ | A-5 | `[W0][A-5][QA][Youssef] Live BE Storno smoke` | search |
| ☑ | D-2f | `[W2][D-2f][QA][Youssef] My Jobs D13 screenshot sign-off` | search |
| ☑ | D-5 | `[W2][D-5][QA][Youssef] E2E full Storno vertical` | search |
| ☑ | E-1i | `[W3][E-1i][QA][Youssef] D05+D06 screenshot sign-off` | https://app.clickup.com/t/869eheq2g |
| ☑ | F-1e | `[W3][F-1e][QA][Youssef] Profile D22/D23 screenshot sign-off` | search |
| ☑ | F-4e | `[W3][F-4e][QA][Youssef] Infopoint D21 screenshot sign-off` | search |
| ☑ | B-6 | `[W1][B-6][QA][Youssef] E2E CI create → review → paid` | search |
| ☑ | C-5 | `[W1][C-5][QA][Youssef] E2E SP doc upload → review → replace` | search |
| ☑ | N-5 | `[W0][N-5][QA][Youssef] Dialog standard QA checklist` | search |

### C.7 — Ayman (primary)

| ☑ | ID | Exact title | URL |
|---|-----|-------------|-----|
| ☑ | SEC-1 | `[W5][SEC-1][SEC][Ayman] Jobs + Storno IDOR` | https://app.clickup.com/t/869eheu2h |
| ☑ | SEC-2 | `[W5][SEC-2][SEC][Ayman] Docs + billing IDOR` | https://app.clickup.com/t/869eheu2t |
| ☑ | SEC-3 | `[W5][SEC-3][SEC][Ayman] Auth/session` | https://app.clickup.com/t/869eheu2u |

### C.8 — Umbrellas (not implementation WIP)

| ☑ | ID | Exact title | Assignee | URL |
|---|-----|-------------|----------|-----|
| ☑ | E-1 | `[W3][E-1][FE] Umbrella — Marketplace Portal (D05+D06)` | none or Omar review | https://app.clickup.com/t/869ehepxk |
| ☑ | F-1 | `[W3][F-1][FE] Umbrella — Profile (D22/D23)` | none or Marwan | search |
| ☑ | F-3 | `[W3][F-3][FE] Umbrella — Notifications (D20)` | none or Karim | https://app.clickup.com/t/869egzm0p |
| ☑ | F-4 | `[W3][F-4][FE] Umbrella — Infopoint (D21)` | none or Marwan | search |
| ☑ | D-2 | `[W2][D-2][FE] Umbrella — My Jobs (D13)` | none or Omar | search |
| ☑ | B-3 | `[W1][B-3][FS] Umbrella — Tour Billing 2 tabs` | none or Yasser | search |
| ☑ | G-1 | `[W4][G-1][FE] Umbrella — Jobs overview (A03)` | Karim | https://app.clickup.com/t/869egzm0w |
| ☑ | H-1 | `[W4][H-1][FE] Umbrella — Drivers / SP center` | none | search |
| ☑ | H-2 | `[W4][H-2][FE] Umbrella — SP profile (Documents = C-3)` | none | search |
| ☑ | I-1 | `[W4][I-1][FS][Yasser] Umbrella — Customers + Addresses` | Yasser | https://app.clickup.com/t/869egzm1k |
| ☑ | I-2 | `[W4][I-2][FE] Umbrella — Admin notification feed` | Karim | search |
| ☑ | I-4 | `[W4][I-4][FS] Umbrella — Infopoint admin` | Yasser | search |
| ☑ | I-5 | `[W4][I-5][FS] Umbrella — Settings` | Yasser | search |
| ☑ | SEC | `[W5][SEC] Umbrella — Security` | Ayman | search |

Parent Done only when all surviving children Done. Do not implement on the umbrella.

---

## Part D — Refresh descriptions (Goal · Authority · Acceptance · DoD)

Paste from the AC section named in §0. Keep status `not started` unless already in progress (exception: G-6 → `questions`).

**Must refresh (plans rewrote these after last ClickUp thicken):**

| ☑ | ID | Search / URL | AC section | Notes |
|---|-----|--------------|------------|--------|
| ☑ | A-0…A-6 | `[A-0]` `869egzkry`, `[A-2]` `869egzktf`, rest search | `epic-a-binary-ac.md` | Pasted 2026-08-14 |
| ☑ | F-7 | `869egznfy` | `epic-efghimk-binary-ac.md` § F-7 | Owner Yasser; PDF attach gated on G-6 / OQ #22–28 |
| ☑ | F-8 | `869egzp84` | `epic-efghimk-binary-ac.md` § F-8 | Owner Ismail |
| ☑ | J-1 | search `[J-1]` | `epic-efghimk-binary-ac.md` § J-1 | Gap log only |
| ☑ | J-2 | `869eheu37` | § J-2 | Stay `not started` until J-1 confirms a gap |
| ☑ | J-3 | `869eheu98` | § J-3 | Same |
| ☑ | B-3a | search `[B-3a]` | `epic-ndbc-binary-ac.md` § B-3a | Docs tab A22; owner Yasser |
| ☑ | E-4 | search `[E-4]` | `epic-efghimk-binary-ac.md` § E-4 | Owner Marwan; OQ #3 interim = OS maps |
| ☑ | All Part B parents | (already in B) | merged AC | L-6, M-1, E-1b, E-1g, G-9, G-1a, F-3a + G-6, I-2d |

**Should refresh (every other surviving card in Part C):** if the description is missing Goal / Authority / Acceptance / DoD, paste from the matching AC heading. If it already has that skeleton and matches the current AC table, skip.

---

## Part E — Open-question cards (37)

Search `OQ` or `#1` … `#37`. Titles have **no** `[Wn]`. Do not create extra OQ cards.

Source of truth: `appendices/oq-disposition.md`. Copy the **Disposition** + **Interim build rule** into the card. Do **not** invent answers.

### Resolved → status `completed`

First line of description = the recorded rule. Title may add `RESOLVED` if it does not already.

| ☑ | OQ | Title hint | Rule to paste |
|---|-----|------------|---------------|
| ☑ | #1 | T&C / cancellation-conditions URL | German hybrid: in-app Fahrerbedingungen sheet on accept/cancel; when legal supplies it, `VITE_DRIVER_TERMS_URL` opens hosted AGB. Do not invent the URL or legal text. |
| ☑ | #2 | Keycloak invite/reset SMTP | AUTHEON mail for **all** emails. Do not send via Keycloak SMTP. From-address / templates / link expiry = ops `SMTP_*`. |
| ☑ | #9 | Marketplace restriction model | Granular axes — do not reopen. |
| ☑ | #10 | Vehicle Systemlogik | Use `vehicle_domain_v2` (client PDF). |
| ☑ | #11 | Direct assign | Proto assign/reassign + confirmation note. Thickens **G-7**. |
| ☑ | #12 | Driver booking email | Drivers get workflow email on marketplace **booked** and admin **assigned**; must attach transport-order PDF. Mail via AUTHEON SMTP. PDF attach gated on G-6 / #27–28. |
| ☑ | #22 | PDF distance | **Exclude** `distanceKm` from PDF / `PDF_RELEVANT_FIELDS`. Thickens **G-6** (no new build card). |
| ☑ | #23 | PDF relevant-change | Template-rendered fields only mint new version + notify. Thickens **G-6**. |
| ☑ | #24 | PDF failure UX | Fail path + **auto-retry ×3**. Thickens **G-6** (no new build card). |
| ☑ | #25 | PDF history visibility | Driver/SP = active only; history = admin/audit. Thickens **G-6**. |
| ☑ | #26 | PDF optional fields | SP house# + creator phone stay optional. Thickens **G-6**. |
| ☑ | #13 | Marketplace card schedule | Cards show date · window (proto legWhen). Thickens **E-1**. |
| ☑ | #14 | Scheduling modes | Date+window+flex only; no by-latest. Thickens **G-2**. |
| ☑ | #15 | Date filter linkage | One linked schedule filter (from/to). Thickens **E-1d**. |
| ☑ | #16 | Marketplace sort | Proto options + default date_desc. Thickens **E-1a**. |
| ☑ | #29 | Dispatch feed spec | Reconstruction `dispatch-notification-feed-spec.md` is **binding**. Thickens **I-2**. |
| ☑ | #30 | Feed BE fields | **BE required** — severity/status/processed* + mark-processed. New child **I-2d** Ismail. Thickens **I-2**. |
| ☑ | #31 | Inactivity activity clock | **last authenticated request** → `users.last_activity_at` (matches BE interceptor). |
| ☑ | #32 | Event-name drift | **Code/@shared wins**; align matrix + FE. Thickens **F-3 / I-2**. |
| ☑ | #35 | PWA history | V1 = **in-app Back only**; pushState out of scope. |
| ☑ | #36 | Probation notif | V1 = **profile-card-only**; no push/in-app event. Thickens **H-5 / E-7**. |
| ☑ | #37 | Notif type registry | Must cover `job_assigned` + `document_correction_required`; fail loud. Thickens **F-3**. |
| ☑ | #33 | Notification category taxonomy | No category chips. |
| ☑ | #34 | Profile deep-link destination | Closed for MDR. |
| ☑ | #3 | Maps / distance | E-4 = Google Maps URL handoff; distance = BE GraphHopper; no paid FE SDK. Thickens **E-4**. |
| ☑ | #4 | Retention / malware / DSGVO | V1 = **pipeline-as-is**; no invented scanners/claims. Thickens **B/C / I-3** (soft). |
| ☑ | #5 | Branding package | V1 = **proto-tokens** until Corporate Design pack; no invented finals. Cosmetics later. |
| ☑ | #6 | Driver ID format | V1 = **`AU-41-####`** (BE `DriverCodeAssignmentService`). Thickens **H**. |
| ☑ | #7 | Cancel vs empty-run | Proto lock: both only on `assigned`\|`accepted`; no phase gates. Thickens **D-1 / G-4**. |
| ☑ | #8 | Domain / hosting | V1 = **ops-later**; clone unblocked; T29 Done waits on ops pack. |
| ☑ | #17 | Admin proto server gates | V1 = **j1-gap-gated**; J-2 only after J-1 MISSING/WRONG. Thickens **J-1/J-2**. |
| ☑ | #18 | Keycloak / lastLoginAt | V1 = **keycloak-as-planned**; Active after activation/first login. Thickens **F-5**. |
| ☑ | #19 | Durable audit | V1 = **live-audit-apis**; no FE in-memory trail. Thickens **I-3**. |
| ☑ | #20 | Push / Infopoint transport | V1 = **in-app + email + Web Push (VAPID)** as-built; no FCM/APNs invent. Thickens **F-3 / I-4**. |
| ☑ | #21 | Expected tour-doc “Missing” | V1 = **fixed-pair** `delivery_note` + `invoice`; full upload catalog unchanged. Thickens **B-7**. |

### Deferred → status `questions`

*(None remaining — #27–28 Resolved 2026-08-14.)*

| ☑ | OQ | Was | Now |
|---|-----|-----|-----|
| ☑ | #27 | Blocked G-6 legal Done | **Resolved** — proto-placeholders + BE as-built |
| ☑ | #28 | Blocked G-6 font Done | **Resolved** — PdfKit defaults V1 |

Link OQ #27–28 on **G-6** as Resolved (G-6 → `not started`, drop BLOCKED from title). Link OQ #3 on **E-4**.

---

## Part F — Board-wide audit (when A–E are done)

Search the AUTHEON list (include closed):

| ☑ | Check |
|---|--------|
| ☑ | No open card titled `[L-7]` `[M-4]` `[E-1c]` `[E-1h]` `[G-10]` `[G-1c]` `[F-3e]` `[F-3f]` except `canceled` / RETIRED |
| ☑ | Every open **build** card has **exactly one** assignee |
| ☑ | Title `[Person]` matches that assignee |
| ☑ | Wave prefix matches the tables above (OQs have none) |
| ☑ | Umbrellas are not `in progress` |
| ☑ | J-2 / J-3 still `not started` unless J-1 has a confirmed gap |
| ☑ | G-6 is `not started` (unblocked; #22–28 Resolved) |
| ☑ | No Ismail on FE clone cards (E-1a/b, F-1, G-1, M-*) |
| ☑ | All 37 Resolved OQs are `completed`; **0** Deferred |
| ☑ | No Deferred OQs left in `questions` for #27–28 |
| ☑ | Comment on K-5: `ClickUp apply playbook 2026-08-14 complete` |

---

## Done when

- [x] Part A: 8 retired cards `canceled` with merge pointer  
- [x] Part B: 7 parents retitled, one owner, absorbed AC pasted  
- [x] Part C: every surviving ID titled + one assignee (especially the “confirmed wrong today” rows)  
- [x] Part D: F-7, F-8, J-1…3, B-3a, E-4, Epic A, merge parents match current AC  
- [x] Part E: **37** Resolved OQs `completed`; **0** Deferred  
- [x] Part F: audit clean  

Tell Omar in standup. After this, **ClickUp matches `task-book.md`**.

---

## If you get stuck

| Problem | What to do |
|---------|------------|
| Cannot find `[E-1e]` | Search `E-1e` without brackets; check it is a subtask under E-1 |
| Status `canceled` missing | Use `cancelled` or Close + comment `RETIRED merged into …` |
| API / MCP errors | Use the website only. This playbook does not need MCP |
| Unsure who owns an ID | This file Part C, or [`task-book.md`](./task-book.md) — not the current ClickUp title |
| Unsure what AC to paste | Table in §0 → open that markdown heading |
| Card missing entirely | Create it in AUTHEON with the exact title from Part C. Do not reuse a RETIRED id |
| Two people on a card | Keep the Person in the title; remove the other; add a collab comment if listed in §0 |
