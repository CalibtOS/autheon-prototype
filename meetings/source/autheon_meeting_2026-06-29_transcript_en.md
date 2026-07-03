Source analyzed: uploaded meeting transcript, with timestamps preserved from the transcript. 

# 1. Meeting overview

## Main topic

The meeting was mainly about reviewing the AUTHEON prototype/Figma designs and converting client feedback into concrete product requirements.

However, the real value of the meeting was deeper than UI feedback. The discussion exposed important business rules around:

- Driver job marketplace behavior.
- Pickup and delivery time windows.
- Document uploads and document quality.
- Manual job assignment.
- Driver booking limits.
- Driver blocking / access restrictions.
- Future financial workflow improvements such as credit-note processing.



## Why the meeting was important

This meeting was important because it revealed several structural requirements that affect the system design, not only the screen design.

The biggest risk discussed was this: if the prototype is built around the wrong workflow assumptions, later changes may require deep restructuring. Ferhat explicitly raised this concern around structural inconsistencies and special cases.

## Who seemed to be involved


| Person                        | Role in meeting                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Ferhat Catak                  | Led the review, asked structural/product questions, explained Figma/Monday process                     |
| Taner Özdemir / AUTHEON       | Main business-side explainer, showed real examples, clarified operational workflow                     |
| Carolina Offermanns / AUTHEON | Added operational details, especially around documents, driver communication, and blocking             |
| Till Toenges                  | Added product/technical perspective, asked clarifying questions, handled scheduling/calendar follow-up |




## What the meeting was trying to solve

The meeting tried to solve three things:

1. Confirm which Figma/prototype feedback items are already accepted.
2. Identify missing business rules before development goes too far.
3. Set up a clear feedback process using Figma comments, Monday, WhatsApp, and follow-up meetings.



## General direction of the discussion

The meeting started with access/setup problems, then moved into Figma feedback, then became a deeper requirements-discovery session.

The most important shift was from:

> “Where should this button or number appear?”

to:

> “Does the current system structure correctly represent how AUTHEON actually works?”



## Final outcome

Several points were clearly confirmed, and several others were left as homework or open requirements.

The clearest confirmed items were:

- Add a back button from active job screens back to the marketplace.
- Show notification counts.
- Show the total number of marketplace jobs even before filters are applied.
- Replace exact pickup/dropoff times with pickup and delivery time windows.
- Allow optional admin-side document uploads, such as approach sketches.
- Treat vehicle color/images as not necessary for the current version.
- Keep scanner/AI/photo-quality automation as future-version functionality, not MVP.
- Treat manual assignment as an exceptional fallback, not a normal workflow.



# 2. Executive summary

This meeting was a product-clarification and requirements-risk meeting for the AUTHEON platform.

The meeting began with practical setup: making sure the AUTHEON team could access the correct Figma page, comments, links, and password. Ferhat explained that the correct page for feedback is **“Kleins Feedback”** and that comments should be handled directly there.

The first concrete UI decisions were small but important: the driver app needs a way back to the marketplace from an active job, notification counts need to be visible, and the marketplace should show the total number of available jobs even without active filters.

The deeper value of the meeting came when Ferhat raised concern about structural inconsistencies. Taner then showed a real transport order and explained how AUTHEON currently receives job information, stores relevant fields in Excel, and generates job documents manually. This revealed that the prototype’s exact pickup/dropoff times are wrong for the real business. AUTHEON usually works with pickup and delivery **time windows**, not fixed exact times.

A major requirement emerged: the system needs two separate time windows, one for pickup and one for delivery. A single global time range would not work because pickup and delivery involve different parties and different locations.

The meeting also clarified how notes and additional information should be treated. Some information is order-specific, some can be customer/contact-specific, but AUTHEON usually receives the relevant instructions from the Auftraggeber each time. Therefore, persistent notes may be useful but are not a critical requirement.

Document handling became another major topic. Drivers may upload invoices, fuel receipts, delivery documents, or other proof files. For MVP, the system should accept uploaded files without heavy automatic validation. Scanner-like cleanup, AI quality checks, automatic extraction, and full photo-protocol workflows were discussed as useful future improvements, but likely outside the first milestone.

The team also discussed driver booking limits. AUTHEON has a real operational risk: some drivers may book too many jobs, cancel them, or monopolize the marketplace. Till suggested a reputation-based system where new drivers start with lower limits and can earn higher limits after successful jobs. Carolina and Taner clarified that individual overrides may also be needed because drivers behave differently.

Manual assignment was clarified as a rare fallback, not a normal dispatching model. AUTHEON wants drivers to choose jobs themselves for commercial/legal reasons. Admin assignment should only happen when external confirmation exists, such as a call or email.

Finally, Carolina raised the need to block or restrict individual drivers without fully removing their access. For example, a driver may be blocked from seeing or booking new marketplace jobs while still being allowed to correct an invoice. Ferhat explained that this is technically possible but introduces process complexity because admins must remember which permissions were disabled and when to restore them.

Overall, this meeting was highly valuable because it exposed the real operational model behind the screens. It turned the prototype from a UI artifact into a more serious product specification.

# 3. Meeting converted into good steps



## Step 1: Meeting setup and access troubleshooting

**What happened:**
The meeting started with technical issues: Fireflies joined, Ferhat had connection/screen problems, and the team waited until everyone could participate.

**Why it matters:**
This delayed the actual product discussion but also showed that tool access and meeting readiness are part of the workflow risk.

**Important details:**
There were issues with Figma access, password prompts, email invitations, spam filtering, and browser login.

**Transcript evidence:**
0:03–13:26, especially the discussion about Figma access, password, account activation, and shared links.

**Practical meaning:**
The team needs a cleaner access checklist before important feedback sessions.

**Follow up needed:**
Make sure all stakeholders have working Figma, Monday, and calendar access before the next meeting.

---



## Step 2: Confirm the correct Figma feedback page

**What happened:**
Ferhat explained that the correct Figma page for client feedback is **“Kleins Feedback”**, not the previous provisional page.

**Why it matters:**
Feedback must not be scattered across the wrong Figma pages.

**Important details:**
Ferhat moved comments from the old page to the correct one and tagged the AUTHEON team.

**Transcript evidence:**
6:26–7:28.

**Practical meaning:**
“Kleins Feedback” should become the official feedback page for this phase.

**Follow up needed:**
AUTHEON should review and respond to comments on that page.

---



## Step 3: Confirm three already accepted UI/product changes

**What happened:**
Ferhat listed three points that seemed already agreed:

1. Back button from active job state back to marketplace.
2. Notification count.
3. Marketplace total job count visible even without filters.

**Why it matters:**
These are no longer vague feedback items; they should become implementation tasks.

**Important details:**
The marketplace currently shows a result count only when a filter is active. Ferhat said users should always see how many jobs exist.

**Transcript evidence:**
14:24–18:14.

**Practical meaning:**
These are clear UI requirements.

**Follow up needed:**
Create implementation tasks and define exact display style for marketplace total count.

---



## Step 4: Identify structural risk in the prototype

**What happened:**
Ferhat explained that the Monday meeting was important because structural inconsistencies had appeared.

**Why it matters:**
This is one of the most important moments in the meeting. The concern is not cosmetic. It is about whether the system structure can support real business cases.

**Important details:**
Ferhat warned that if the system structure is wrong, later restructuring could be deep and inefficient.

**Transcript evidence:**
18:14–20:43.

**Practical meaning:**
The team must validate business rules before implementation, not after.

**Follow up needed:**
Create a structured list of edge cases and workflow rules.

---



## Step 5: Review a real transport order

**What happened:**
Taner showed a real example order and explained how AUTHEON currently receives and processes Auftraggeber data.

**Why it matters:**
The real order clarified many requirements better than abstract discussion.

**Important details:**
AUTHEON receives job data, transfers relevant information into Excel, and creates documents/templates from that information.

**Transcript evidence:**
21:31–23:38.

**Practical meaning:**
The system should model the real input structure and current operational workflow.

**Follow up needed:**
Use real order examples to validate job creation fields.

---



## Step 6: Correct the time model from exact times to time windows

**What happened:**
Taner clarified that jobs usually have pickup and delivery time windows, not exact times.

**Why it matters:**
This directly affects database design, forms, validation, driver UI, marketplace display, and scheduling logic.

**Important details:**
There should be two separate windows:

- Pickup window.
- Delivery/dropoff window.

A single global time range would not work because pickup and delivery involve different parties.

**Transcript evidence:**
23:38–28:21.

**Practical meaning:**
The prototype must be updated to support time windows.

**Follow up needed:**
Update Figma, data model, job form, and driver UI.

---



## Step 7: Clarify notes and additional information

**What happened:**
The team discussed whether notes belong to the contact person, the customer, or the specific order.

**Why it matters:**
This affects data modeling and reuse. Incorrect note persistence can create wrong operational assumptions.

**Important details:**
Carolina explained that instructions often differ per order, even for the same customer. Taner later clarified that some persistent customer-level notes may still be useful, such as “report to building 8.”

**Transcript evidence:**
30:37–42:42.

**Practical meaning:**
The system needs clear note categories or at least clear rules for what is persistent versus order-specific.

**Follow up needed:**
Define note types: customer note, contact note, order note, driver-visible instruction.

---



## Step 8: Clarify vehicle identification fields

**What happened:**
Taner showed that vehicle identification normally depends on VIN/chassis number and license plate. Vehicle color was considered unnecessary.

**Why it matters:**
This prevents unnecessary fields from entering MVP.

**Important details:**
Carolina and Taner both indicated that color is usually irrelevant. Till also warned against building fields for hypothetical future customers too early.

**Transcript evidence:**
52:22–54:36.

**Practical meaning:**
Do not add vehicle color or vehicle photos to MVP unless future client evidence requires it.

**Follow up needed:**
Confirm required vehicle fields: manufacturer/type, license plate, VIN, registered/not registered status.

---



## Step 9: Discuss driver-uploaded documents

**What happened:**
The team discussed driver uploads for invoices, fuel receipts, delivery notes, and other proof documents.

**Why it matters:**
Document upload is central to operational completion and payment/reconciliation.

**Important details:**
Drivers may upload PDFs, JPGs, PNGs, photos of receipts, invoices, and delivery documents. Automatic conversion to PDF was discussed but not clearly accepted for MVP.

**Transcript evidence:**
56:02–1:02:58.

**Practical meaning:**
MVP should allow flexible upload formats and human review.

**Follow up needed:**
Define accepted file types, document categories, upload timing, and rejection workflow.

---



## Step 10: Separate MVP document review from future AI/scanner features

**What happened:**
The team discussed scanner apps, cropping, image quality, and possible AI validation.

**Why it matters:**
This is useful but could become scope creep.

**Important details:**
Till said these features could be valuable but likely belong in a second step. Ferhat agreed that AI/scanner features are future-version functionality.

**Transcript evidence:**
1:01:21–1:05:54.

**Practical meaning:**
Document-quality automation should be documented as V2/future, not required for first milestone.

**Follow up needed:**
Create a future-feature backlog item for document quality scanning/AI.

---



## Step 11: Confirm document rejection/review cycle

**What happened:**
Ferhat demonstrated that admins can reject uploaded documents with a reason, and the driver should see what needs correction.

**Why it matters:**
This gives AUTHEON a practical workflow for incorrect invoices or unreadable receipts.

**Important details:**
Carolina said corrections are needed regularly, at least weekly.

**Transcript evidence:**
1:05:54–1:08:30.

**Practical meaning:**
Document rejection with reason is an MVP-critical workflow.

**Follow up needed:**
Ensure driver notifications and correction states are implemented and tested.

---



## Step 12: Discuss driver job limits and reputation

**What happened:**
Ferhat asked whether the system should prevent drivers from accepting jobs that overlap or exceed reasonable limits. Taner explained concerns about drivers booking too many jobs. Till suggested a reputation-based system.

**Why it matters:**
This affects marketplace fairness, operational risk, and driver trust.

**Important details:**
Some drivers can complete multiple short trips per day. Others may book too much or monopolize available work. New drivers may need lower limits.

**Transcript evidence:**
1:08:30–1:20:47.

**Practical meaning:**
A configurable booking-limit system may be needed.

**Follow up needed:**
AUTHEON must define rules: per day, per time window, per driver, new-driver limits, completed-job thresholds, manual overrides.

---



## Step 13: Clarify manual assignment as exception only

**What happened:**
Taner explained that admin assignment should only be a temporary/emergency solution.

**Why it matters:**
The business model depends on the driver/service partner choosing work independently.

**Important details:**
Manual assignment may happen if a driver calls while driving or cannot use the system, but it should be backed by external confirmation.

**Transcript evidence:**
1:21:12–1:22:39.

**Practical meaning:**
Manual assignment should not become the standard dispatch model.

**Follow up needed:**
Document assignment policy and required confirmation evidence.

---



## Step 14: Confirm optional admin document upload

**What happened:**
Ferhat asked whether admins should be able to upload extra documents to a job. Taner and Carolina confirmed the need, for example approach sketches.

**Why it matters:**
Some information cannot be represented well as text.

**Important details:**
This should not be mandatory but should be possible.

**Transcript evidence:**
1:22:39–1:25:02.

**Practical meaning:**
Admin job creation/editing should support optional file attachments.

**Follow up needed:**
Add optional admin-side attachments to requirements.

---



## Step 15: Discuss exact coordinates

**What happened:**
Ferhat asked whether latitude/longitude fields are needed. Taner said not for now.

**Why it matters:**
This prevents unnecessary complexity in MVP.

**Important details:**
If a driver cannot find a location, they can call the contact person. Approach sketches can also help.

**Transcript evidence:**
1:25:02–1:26:41.

**Practical meaning:**
Coordinates are a future option, not a current requirement.

**Follow up needed:**
Document as “not MVP, keep in mind.”

---



## Step 16: Discuss document upload before job completion

**What happened:**
Ferhat noted that documents are currently only uploadable after job completion. Taner said this should be discussed internally, but it may make sense to allow uploads during the tour.

**Why it matters:**
Drivers may fuel before dropoff and could lose the receipt before completing the job.

**Important details:**
Taner leaned toward keeping upload open rather than over-restricting document timing.

**Transcript evidence:**
1:27:06–1:28:22.

**Practical meaning:**
Document upload timing needs a product decision.

**Follow up needed:**
Decide whether uploads are allowed during active jobs.

---



## Step 17: Discuss future credit-note process

**What happened:**
Ferhat mentioned a credit-note process similar to platforms that generate payout statements. Taner said AUTHEON wants this eventually.

**Why it matters:**
This could significantly reduce invoice correction workload.

**Important details:**
AUTHEON currently receives invoices from contractors, which creates errors and correction work. In the future, AUTHEON wants to generate credit notes itself.

**Transcript evidence:**
1:28:22–1:29:25.

**Practical meaning:**
The architecture should not block future credit-note workflows.

**Follow up needed:**
Add to future roadmap and consider data model compatibility.

---



## Step 18: Discuss selective driver blocking

**What happened:**
Carolina asked whether a driver can be blocked from marketplace access while still being able to correct invoices.

**Why it matters:**
This is an important permission/role-control requirement.

**Important details:**
Ferhat explained that selective blocking is possible but adds process complexity.

**Transcript evidence:**
1:29:43–1:35:30.

**Practical meaning:**
The system may need feature-level permission toggles per driver.

**Follow up needed:**
Define which functions can be blocked and how admins track blocked states.

---



## Step 19: Schedule next follow-ups

**What happened:**
The team discussed Wednesday and Thursday follow-up meetings. Till agreed to handle calendar invites.

**Why it matters:**
The feedback process depends on rapid follow-up.

**Important details:**
Wednesday 14:00 was discussed and accepted. Thursday also remained relevant.

**Transcript evidence:**
43:16–46:39 and 1:36:33–1:37:34.

**Practical meaning:**
Feedback should be completed before or during the next meetings.

**Follow up needed:**
Till to send calendar invites.

# 4. Important points extracted from the meeting


| Point                                                    | What was said                                                        | Who said it     | Timestamp                    | Why it is important                              | Category                  | Status              |
| -------------------------------------------------------- | -------------------------------------------------------------------- | --------------- | ---------------------------- | ------------------------------------------------ | ------------------------- | ------------------- |
| Correct Figma page is “Kleins Feedback”                  | Feedback should happen on the dedicated page                         | Ferhat          | 6:26                         | Prevents scattered feedback                      | Documentation point       | Directly stated     |
| AUTHEON had not completed full feedback homework         | They planned to review but could not due to other tasks/heat         | Taner           | 2:07, 19:19                  | Feedback is not complete yet                     | Problem                   | Directly stated     |
| Back button needed                                       | From active job state back to marketplace                            | Ferhat/Taner    | 14:24–14:45                  | Driver UX requirement                            | Decision                  | Directly stated     |
| Notification count needed                                | Notification indicator should show a number                          | Ferhat          | 14:45–15:22                  | Improves driver awareness                        | Requirement               | Directly stated     |
| Marketplace should show total job count                  | Count should be visible even without filters                         | Ferhat          | 15:22–18:14                  | Marketplace transparency                         | Requirement               | Directly stated     |
| Structural inconsistencies are a risk                    | Prototype may not support real special cases                         | Ferhat          | 18:14–20:43                  | Prevents expensive rework                        | Risk                      | Directly stated     |
| AUTHEON uses time windows                                | Pickup and delivery usually have windows, not exact times            | Taner           | 23:38–24:44                  | Core data model change                           | Requirement               | Directly stated     |
| Two separate time windows are needed                     | Pickup and delivery are different parties/locations                  | Ferhat/Taner    | 27:17–28:21                  | Prevents wrong scheduling model                  | Requirement               | Directly stated     |
| Drivers should drive directly                            | AGB says direct route after pickup                                   | Carolina        | 25:55–26:11                  | Legal/operational rule                           | Business point            | Directly stated     |
| Enforcement is AUTHEON’s responsibility                  | If driver delays, system does not need to solve it automatically     | Taner           | 26:11–26:33                  | Separates system logic from business enforcement | Business point            | Directly stated     |
| Template fields should be dynamic                        | Driver data, order number, vehicle data, etc. inserted automatically | Taner           | 29:15–30:35                  | Document generation requirement                  | Requirement               | Directly stated     |
| Registered/not registered vehicle field appeared         | “zugelassen, nicht zugelassen” in template                           | Taner/Till      | 29:15–30:50                  | Important legal/transport field                  | Unclear point             | Needs clarification |
| Notes differ by order                                    | Same customer may have different contact/instructions                | Carolina        | 31:56–32:32                  | Affects note persistence                         | Requirement               | Directly stated     |
| Some customer notes may be persistent                    | Building/location instructions can be reused                         | Taner/Ferhat    | 34:37–36:26                  | Data modeling nuance                             | Technical point           | Directly stated     |
| Customers usually provide instructions each time         | AUTHEON receives current instructions per order                      | Taner           | 41:37–42:42                  | Reduces need for persistent note logic           | Business point            | Directly stated     |
| Vehicle color is not needed                              | VIN and plate usually identify the vehicle                           | Carolina/Taner  | 52:42–54:36                  | Avoids unnecessary MVP fields                    | Decision                  | Directly stated     |
| Vehicle photo protocol is V2                             | Around 20 photos/checklist may come later                            | Taner           | 55:22–56:02                  | Future roadmap                                   | Idea                      | Directly stated     |
| Driver uploads should handle receipts/invoices/documents | Tank receipts, invoices, delivery notes, proof documents             | Taner           | 56:21–59:48                  | Core document workflow                           | Requirement               | Directly stated     |
| Scanner/AI can help but later                            | Useful but likely beyond first milestone                             | Till/Ferhat     | 1:04:30–1:05:54              | Scope control                                    | Risk / Idea               | Directly stated     |
| Document rejection with reason is important              | Admin can reject and driver corrects                                 | Ferhat/Carolina | 1:05:54–1:08:30              | Critical operational workflow                    | Requirement               | Directly stated     |
| Corrections happen often                                 | At least weekly, sometimes multiple invoices                         | Carolina        | 1:07:13                      | High practical value                             | Business point            | Directly stated     |
| Driver booking limits may be needed                      | Prevent overbooking/marketplace monopolization                       | Taner           | 1:09:37–1:12:22              | Marketplace control                              | Risk                      | Directly stated     |
| Reputation system suggested                              | New drivers have lower limits, trusted drivers higher                | Till            | 1:13:21–1:13:52              | Possible solution                                | Idea                      | Directly stated     |
| Individual driver limits may be needed                   | Admin should override per driver                                     | Carolina        | 1:13:56–1:14:35              | Operational flexibility                          | Requirement               | Directly stated     |
| Admin assignment is rare fallback                        | Not normal workflow                                                  | Taner           | 1:21:12–1:22:39              | Protects business model                          | Decision                  | Directly stated     |
| Admin should upload optional documents                   | Example: approach sketch                                             | Taner/Carolina  | 1:24:28–1:25:02              | Important attachment requirement                 | Requirement               | Directly stated     |
| Coordinates not needed now                               | Address/contact/sketch are enough for now                            | Taner           | 1:25:52–1:26:41              | Prevents MVP complexity                          | Decision                  | Directly stated     |
| Upload before completion may be needed                   | Fuel receipt may be created during tour                              | Taner           | 1:27:06–1:28:22              | Improves driver workflow                         | Follow up point           | Needs decision      |
| Credit-note process planned later                        | AUTHEON wants to generate credit notes eventually                    | Taner           | 1:28:22–1:29:25              | Future finance architecture                      | Idea / future requirement | Directly stated     |
| Selective blocking may be needed                         | Block marketplace but allow invoice correction                       | Carolina        | 1:29:43–1:31:12              | Permission model requirement                     | Requirement               | Needs specification |
| Selective blocking creates admin-process risk            | Admins may forget to unblock features                                | Ferhat          | 1:32:48–1:35:03              | Operational risk                                 | Risk                      | Directly stated     |
| Follow-up meetings needed                                | Wednesday/Thursday follow-up discussed                               | Team            | 43:16–46:39, 1:36:33–1:37:34 | Keeps feedback loop moving                       | Action item               | Directly stated     |




# 5. Decisions made



## Clear decisions


| Decision                                                 | Who made or supported it                 | Timestamp       | Reason                                           | Impact                                          | Next step                       | Confidence  |
| -------------------------------------------------------- | ---------------------------------------- | --------------- | ------------------------------------------------ | ----------------------------------------------- | ------------------------------- | ----------- |
| Use “Kleins Feedback” as the Figma feedback page         | Ferhat, acknowledged by Taner            | 6:26–7:28       | Correct page created for client feedback         | Centralizes comments                            | AUTHEON reviews/comments there  | High        |
| Add back button from active job screens to marketplace   | Ferhat, Taner agreed                     | 14:24–14:45     | Driver may want to return to marketplace         | Driver UX change                                | Create implementation task      | High        |
| Show notification count                                  | Ferhat                                   | 14:45–15:22     | Driver needs visible notification signal         | UI/notification requirement                     | Add to driver app tasks         | High        |
| Show marketplace total count even without filters        | Ferhat, Taner confirmed current behavior | 15:22–18:14     | Users need overview of available jobs            | Marketplace UI change                           | Ferhat to propose display style | High        |
| Use pickup/dropoff time windows instead of exact times   | Taner, Ferhat confirmed                  | 23:38–28:21     | Real logistics uses windows, not exact times     | Data model and UI must change                   | Update forms/screens/data model | High        |
| Do not add vehicle color/photo as MVP requirement        | Carolina, Taner, Till, Ferhat            | 52:42–54:36     | VIN and plate identify vehicle                   | Avoids unnecessary fields                       | Keep vehicle fields minimal     | High        |
| Keep full vehicle photo protocol for V2                  | Taner                                    | 55:22–56:02     | Useful but future scope                          | Roadmap item                                    | Add to future backlog           | High        |
| Treat scanner/AI document quality as future feature      | Till, Ferhat                             | 1:04:30–1:05:54 | Valuable but beyond first milestone              | Scope control                                   | Document as future enhancement  | High        |
| Admin assignment is exception/notlösung, not normal flow | Taner, Ferhat                            | 1:21:12–1:22:39 | Driver should normally choose jobs independently | Assignment feature should be limited/contextual | Document policy                 | High        |
| Allow optional admin-side document uploads               | Taner, Carolina                          | 1:24:28–1:25:02 | Needed for approach sketches and extra info      | Admin job feature                               | Add optional attachment support | High        |
| Do not implement exact coordinates now                   | Taner, Ferhat                            | 1:25:52–1:26:41 | Address/contact/sketch enough for MVP            | Avoids complexity                               | Keep as future option           | High        |
| Design should keep future credit-note workflow possible  | Taner, Ferhat                            | 1:28:22–1:29:25 | AUTHEON wants to reduce invoice errors later     | Future finance architecture                     | Add roadmap note                | Medium-high |
| Schedule follow-up meeting Wednesday around 14:00        | Team, Till to handle                     | 1:36:33–1:37:34 | More feedback needed                             | Continues requirements clarification            | Calendar invite                 | High        |




## Implied decisions


| Implied decision                                                                       | Evidence                                                                         | Confidence  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------- |
| Document rejection/re-upload flow is MVP-important                                     | Carolina said corrections happen weekly; Ferhat showed rejection reason workflow | High        |
| Driver notifications should include rejected document updates                          | Ferhat said notification should come in for rejected document feedback           | Medium-high |
| Driver booking limits need a configurable design, not hardcoded one rule               | Discussion covered per-day, per-driver, reputation, overrides                    | Medium      |
| Selective driver blocking should be specified before implementation                    | Carolina requested it; Ferhat warned about complexity                            | Medium      |
| Notes/instructions should not be blindly persisted as universal customer/contact rules | Carolina and Taner explained instructions vary per order                         | Medium-high |




# 6. Action items and follow ups


| Action item                                                 | Owner                            | Deadline                                                   | Evidence                     | Priority    | Notes                                                         |
| ----------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------- | ---------------------------- | ----------- | ------------------------------------------------------------- |
| Review Figma comments on “Kleins Feedback”                  | Taner / Carolina                 | Before next feedback meeting; mentioned tomorrow/Wednesday | 6:26–7:28, 46:05–46:39       | High        | They had not completed full review yet                        |
| Add feedback directly in Figma comments                     | Taner / Carolina                 | Before or during next meeting                              | 46:39–50:52                  | High        | Ferhat explained how to comment and preview scrolling screens |
| Use Monday for collected questions/answers                  | Ferhat + AUTHEON                 | Not specified                                              | 50:52–51:31, 1:29:25–1:29:43 | High        | Ferhat will add questions to Monday                           |
| Send WhatsApp update when Monday questions are added        | Ferhat                           | Not specified                                              | 1:29:25–1:29:43              | Medium      | Keeps AUTHEON informed                                        |
| Propose how marketplace total count should be displayed     | Ferhat                           | Not specified                                              | 16:31–18:14                  | High        | Requirement accepted; display design still unclear            |
| Send any new documents by email                             | AUTHEON                          | Not specified                                              | 46:39–46:57                  | Medium      | Used for better understanding of workflow                     |
| Define driver booking/limit rules                           | Taner / Carolina                 | Not specified                                              | 1:09:37–1:20:47              | High        | Needs concrete values and logic                               |
| Decide whether booking limits apply to admin assignment too | AUTHEON + product/technical team | Not specified                                              | 1:20:47–1:21:12              | Medium-high | Admin assignment may need same rule checks                    |
| Define manual assignment policy                             | AUTHEON                          | Not specified                                              | 1:21:12–1:22:39              | High        | Should include required proof/email confirmation              |
| Define admin-upload document requirements                   | AUTHEON + implementation team    | Not specified                                              | 1:22:39–1:25:02              | High        | Optional upload, e.g. approach sketch                         |
| Decide whether uploads are allowed before job completion    | AUTHEON                          | Not specified                                              | 1:27:06–1:28:22              | High        | Taner said internal discussion needed                         |
| Add credit-note process to future roadmap                   | Product/project team             | Future version                                             | 1:28:22–1:29:25              | Medium      | Not MVP, but architecture should not block it                 |
| Define selective driver-blocking states                     | AUTHEON + product/technical team | Not specified                                              | 1:29:43–1:35:30              | High        | Example: block marketplace but allow invoice correction       |
| Create driver document-quality instruction                  | AUTHEON                          | Not specified                                              | 1:03:18–1:05:54              | Medium      | Could be app notice or driver circular                        |
| Ensure document rejection includes reason and notification  | Implementation team              | Not specified                                              | 1:05:54–1:08:30              | High        | Important for corrections                                     |
| Add Ferhat to relevant calendar meetings                    | Till                             | Immediate / before next meeting                            | 43:16–45:20                  | High        | Ferhat said meeting was not in his calendar                   |
| Create/send Wednesday meeting invite                        | Till                             | Wednesday meeting                                          | 1:36:33–1:37:34              | High        | Wednesday 14:00 discussed                                     |
| Confirm Thursday meeting time                               | Till / team                      | Before Thursday                                            | 43:16–46:05                  | Medium      | Thursday 14:00 discussed                                      |




# 7. Problems, risks, and concerns



## 1. Incomplete client feedback

**Where it appeared:**
Taner said they had planned to review Figma over the weekend but could not.

**Why it matters:**
Development decisions may be delayed or based on partial feedback.

**Possible consequence:**
Late changes, rework, missed business rules.

**Suggested next step:**
Set a clear review deadline before each meeting.

**Explicit or implied:**
Explicit.

---



## 2. Tool access friction

**Where it appeared:**
Figma password, browser login, spam filter, missing calendar invitation.

**Why it matters:**
Important feedback time was consumed by access issues.

**Possible consequence:**
Slow decision-making, missed comments, confusion over correct source of truth.

**Suggested next step:**
Create a stakeholder access checklist.

**Explicit or implied:**
Explicit.

---



## 3. Prototype may have wrong time model

**Where it appeared:**
Prototype used exact times, but AUTHEON uses time windows.

**Why it matters:**
This affects forms, database schema, driver UI, job matching, and documents.

**Possible consequence:**
Deep refactor if discovered late.

**Suggested next step:**
Change job model to pickup window and delivery window.

**Explicit or implied:**
Explicit.

---



## 4. Structural rework risk

**Where it appeared:**
Ferhat warned that wrong structure could require deep restructuring.

**Why it matters:**
This is the main strategic risk of the meeting.

**Possible consequence:**
High implementation cost and delay.

**Suggested next step:**
Run structured edge-case discovery before implementation.

**Explicit or implied:**
Explicit.

---



## 5. Note ownership is unclear

**Where it appeared:**
Discussion about notes belonging to address/customer/contact/order.

**Why it matters:**
Wrong note persistence can show incorrect instructions to drivers.

**Possible consequence:**
Operational mistakes, wrong calls, wrong pickup behavior.

**Suggested next step:**
Define note categories clearly.

**Explicit or implied:**
Explicit.

---



## 6. Registered/not registered vehicle field is not fully clarified

**Where it appeared:**
Taner included “zugelassen / nicht zugelassen” in the template; Till said this was new to him.

**Why it matters:**
This may affect whether a vehicle can be driven on its own axle.

**Possible consequence:**
Legal/operational mismatch if ignored.

**Suggested next step:**
Clarify whether this is a required job field and what rules depend on it.

**Explicit or implied:**
Explicit unclear point.

---



## 7. Driver upload quality may be poor

**Where it appeared:**
Taner and Carolina discussed messy fuel receipt photos.

**Why it matters:**
AUTHEON forwards these documents to clients/order-givers.

**Possible consequence:**
Client complaints, manual correction workload.

**Suggested next step:**
Start with clear driver instructions and rejection workflow; keep AI/scanner for later.

**Explicit or implied:**
Explicit.

---



## 8. Scanner/AI features could cause scope creep

**Where it appeared:**
Discussion about phone scanning, cropping, AI quality checks.

**Why it matters:**
These features are useful but not small.

**Possible consequence:**
First milestone becomes too large.

**Suggested next step:**
Move to V2 backlog.

**Explicit or implied:**
Explicit.

---



## 9. Drivers may book too many jobs

**Where it appeared:**
Taner described drivers booking many jobs or potentially cancelling.

**Why it matters:**
Marketplace fairness and delivery reliability are at risk.

**Possible consequence:**
Jobs blocked from other drivers, cancellations, legal/financial disputes.

**Suggested next step:**
Design configurable booking limits.

**Explicit or implied:**
Explicit.

---



## 10. Drivers may book overlapping jobs

**Where it appeared:**
Ferhat raised same-day/time-slot conflict concerns.

**Why it matters:**
The platform may allow impossible job combinations.

**Possible consequence:**
Missed pickups/deliveries.

**Suggested next step:**
At minimum provide admin visibility; optionally add warnings.

**Explicit or implied:**
Explicit.

---



## 11. Manual assignment has legal/commercial sensitivity

**Where it appeared:**
Taner emphasized that drivers should normally choose jobs themselves.

**Why it matters:**
Assignment changes the business relationship dynamic.

**Possible consequence:**
Driver can claim they were assigned work they did not independently accept.

**Suggested next step:**
Use assignment only with documented external confirmation.

**Explicit or implied:**
Explicit.

---



## 12. Selective blocking increases admin complexity

**Where it appeared:**
Ferhat warned admins may forget which functions were disabled.

**Why it matters:**
Permission toggles need operational tracking.

**Possible consequence:**
Driver remains blocked unintentionally or cannot correct required documents.

**Suggested next step:**
Add visible status badges, reason, date, and unblock reminder.

**Explicit or implied:**
Explicit.

# 8. Hidden or indirect important points



## Hidden point 1: This was a requirements-discovery meeting, not only a feedback meeting

**Evidence:**
The conversation moved from Figma comments to time windows, notes, driver limits, documents, assignment, and permissions.

**Why it matters:**
The output should feed product requirements, not only UI tasks.

**What should be done:**
Convert the transcript into a requirements document and backlog items.

---



## Hidden point 2: AUTHEON’s real workflow is still semi-manual

**Evidence:**
Taner described Excel as a dashboard, manual document templates, received PDFs, and manual review.

**Why it matters:**
The software should not assume a fully automated business process from day one.

**What should be done:**
Design the system to support gradual automation.

---



## Hidden point 3: External formats are outside AUTHEON’s control

**Evidence:**
Taner said they do not define the customer PDFs, emails, or Excel source formats.

**Why it matters:**
The system needs flexible input handling.

**What should be done:**
Avoid overfitting to one PDF layout or one customer format.

---



## Hidden point 4: AUTHEON wants operational control but not over-dispatch responsibility

**Evidence:**
Taner said service partners are responsible for their own planning, but AUTHEON still wants visibility and limits.

**Why it matters:**
The platform should balance freedom with control.

**What should be done:**
Use warnings, limits, dashboards, and audit logs instead of full automated dispatch control.

---



## Hidden point 5: MVP scope must be protected

**Evidence:**
Scanner apps, AI recognition, vehicle photo protocol, credit notes, and coordinates were all discussed but mostly deferred.

**Why it matters:**
The project can easily expand beyond the first milestone.

**What should be done:**
Create a clear MVP vs V2 feature list.

---



## Hidden point 6: Permissions need more than “active/blocked”

**Evidence:**
Carolina asked about blocking marketplace access while still allowing invoice correction.

**Why it matters:**
A simple user status may not be enough.

**What should be done:**
Design feature-level access states.

---



## Hidden point 7: Documentation is becoming a project dependency

**Evidence:**
The team repeatedly referred to comments, Monday, documents, emails, WhatsApp, and homework.

**Why it matters:**
If decisions are not centralized, implementation will become inconsistent.

**What should be done:**
Use one source of truth for requirements.

---



## Hidden point 8: Business rules are legal/commercial, not only technical

**Evidence:**
AGB, direct route, assignment, cancellation costs, and contractor responsibility were discussed.

**Why it matters:**
Technical design must respect business/legal relationships.

**What should be done:**
Tag requirements that have legal or commercial impact.

# 9. Documentation points



## Documentation point: Figma feedback process

**Where it should be documented:**
Project SOP / feedback workflow.

**Why it should be documented:**
To avoid comments being placed on wrong screens/pages.

**Suggested clean wording:**
“Client feedback for the current prototype review phase must be added to the Figma page ‘Kleins Feedback’. Comments should be placed directly on the relevant screen or referenced clearly if the issue appears only in preview/scroll mode.”

---



## Documentation point: Confirmed UI changes

**Where it should be documented:**
Product backlog / UI requirements.

**Why it should be documented:**
These are accepted implementation items.

**Suggested clean wording:**
“The driver interface must include a back button from active job screens to the marketplace, visible notification counts, and a visible total count of marketplace jobs even when no filter is active.”

---



## Documentation point: Time windows

**Where it should be documented:**
Functional requirements / data model.

**Why it should be documented:**
This is a core workflow correction.

**Suggested clean wording:**
“Each transport job must support a pickup time window and a delivery time window. AUTHEON jobs generally do not use exact fixed pickup/dropoff times.”

---



## Documentation point: Separate pickup and delivery parties

**Where it should be documented:**
Business workflow documentation.

**Why it should be documented:**
A single time window is not enough.

**Suggested clean wording:**
“Pickup and delivery are handled as separate operational points. The pickup customer/contact and delivery customer/contact may have independent time windows and instructions.”

---



## Documentation point: Notes/instructions

**Where it should be documented:**
Data model / admin job creation documentation.

**Why it should be documented:**
Unclear note ownership can cause wrong instructions.

**Suggested clean wording:**
“Job instructions may be order-specific. Persistent customer/contact notes may be used only for information that is reliably stable across orders.”

---



## Documentation point: Vehicle fields

**Where it should be documented:**
Job data model.

**Why it should be documented:**
Avoid unnecessary fields and clarify required identifiers.

**Suggested clean wording:**
“Vehicle identification should rely primarily on license plate and VIN/chassis number. Vehicle color is not required for MVP unless a future customer process makes it necessary.”

---



## Documentation point: Registered/not registered vehicle status

**Where it should be documented:**
Open questions / legal-operational requirements.

**Why it should be documented:**
It appeared in Taner’s template but was not fully resolved.

**Suggested clean wording:**
“Clarify whether every job must store vehicle registration status: registered / not registered. Clarify what operational restrictions depend on this field.”

---



## Documentation point: Driver document uploads

**Where it should be documented:**
Driver app requirements.

**Why it should be documented:**
This is central to job completion and payment.

**Suggested clean wording:**
“Drivers must be able to upload job-related documents such as invoices, fuel receipts, delivery notes, and other proof documents. Supported formats and upload timing must be defined.”

---



## Documentation point: Document rejection cycle

**Where it should be documented:**
Admin workflow / driver workflow.

**Why it should be documented:**
Corrections happen frequently.

**Suggested clean wording:**
“Admins must be able to reject uploaded documents with a reason. Drivers must be notified and must be able to upload corrected documents.”

---



## Documentation point: Driver booking limits

**Where it should be documented:**
Marketplace rules / driver management requirements.

**Why it should be documented:**
Prevents overbooking and unfair marketplace behavior.

**Suggested clean wording:**
“The system may need configurable booking limits per driver, per day, or per reputation state. AUTHEON must define the exact limit logic before implementation.”

---



## Documentation point: Manual assignment

**Where it should be documented:**
Admin SOP / business rules.

**Why it should be documented:**
Manual assignment has legal/commercial implications.

**Suggested clean wording:**
“Manual assignment is an exception workflow and should only be used when the driver has confirmed acceptance outside the system, for example by phone and email.”

---



## Documentation point: Selective blocking

**Where it should be documented:**
Driver account management requirements.

**Why it should be documented:**
A driver may need restricted marketplace access while still being allowed to correct invoices/documents.

**Suggested clean wording:**
“Driver access restrictions should support selective blocking of specific functions, such as marketplace visibility or booking, while preserving access to existing jobs and document correction where required.”

# 10. Open questions


| Question                                                                | Why it matters                         | Who should answer it           | Related transcript part      | Priority    |
| ----------------------------------------------------------------------- | -------------------------------------- | ------------------------------ | ---------------------------- | ----------- |
| How exactly should marketplace total count be displayed?                | Requirement accepted, UI not finalized | Ferhat / design team / AUTHEON | 16:31–18:14                  | High        |
| What exact fields are required in the generated order document?         | Affects document generation            | AUTHEON                        | 29:15–30:35                  | High        |
| Is “registered / not registered” a required vehicle field?              | Legal/transport implications           | AUTHEON + legal/operations     | 29:15–30:50                  | High        |
| Should notes be stored at customer, contact, address, or order level?   | Affects data model                     | Product/tech + AUTHEON         | 30:37–42:42                  | High        |
| Which document types can drivers upload?                                | Affects upload UI and validation       | AUTHEON                        | 56:21–59:48                  | High        |
| Should drivers upload documents before job completion?                  | Affects active-job workflow            | AUTHEON                        | 1:27:06–1:28:22              | High        |
| Which file formats should be accepted?                                  | Affects backend/frontend validation    | Tech team + AUTHEON            | 59:53–1:00:55                | Medium      |
| Should image-to-PDF conversion be included in MVP?                      | Scope risk                             | Product/team                   | 57:26–1:02:58                | Medium      |
| What exact driver booking limits are needed?                            | Prevents overbooking and unfairness    | AUTHEON                        | 1:09:37–1:20:47              | High        |
| Should driver limits be reputation-based, manually set, or both?        | Affects driver management              | AUTHEON + product/tech         | 1:13:21–1:14:35              | High        |
| Should admin assignment bypass driver booking limits?                   | Prevents admin-side mistakes           | Product/tech + AUTHEON         | 1:20:47–1:21:12              | Medium-high |
| What proof is required for manual assignment?                           | Legal/commercial clarity               | AUTHEON                        | 1:21:12–1:22:39              | High        |
| Which admin-uploaded document types are needed?                         | Affects admin job form                 | AUTHEON                        | 1:22:39–1:25:02              | Medium      |
| Are exact coordinates needed later?                                     | Future mapping/location feature        | AUTHEON                        | 1:25:02–1:26:41              | Low-medium  |
| What selective blocking states are required?                            | Affects permission model               | AUTHEON + tech team            | 1:29:43–1:35:30              | High        |
| How will admins remember temporary restrictions?                        | Process risk                           | Product/tech + AUTHEON         | 1:32:48–1:35:03              | Medium-high |
| Which meeting is final for next feedback: Wednesday, Thursday, or both? | Scheduling clarity                     | Till / team                    | 43:16–46:39, 1:36:33–1:37:34 | Medium      |




# 11. Reusable knowledge from this meeting



## Lesson 1: Real examples reveal better requirements than abstract discussion

**Explanation:**
Taner’s real transport order clarified time windows, document fields, notes, and PDFs.

**Example from meeting:**
The time-window requirement became obvious only after Taner showed the real order.

**How to reuse it later:**
Always ask clients to show real examples, not only describe workflows.

---



## Lesson 2: Prototype screens can hide wrong business assumptions

**Explanation:**
A screen may look correct while the underlying data model is wrong.

**Example from meeting:**
Exact pickup/dropoff times looked simple in the prototype, but real jobs need windows.

**How to reuse it later:**
Validate screen fields against real operations before development.

---



## Lesson 3: MVP should support workflow reality, not future perfection

**Explanation:**
Scanner apps, AI, photo protocol, and credit notes are valuable but not all MVP.

**Example from meeting:**
The team agreed document-quality automation is useful but likely later.

**How to reuse it later:**
Maintain a strict MVP/V2 backlog.

---



## Lesson 4: Permissions are often more complex than user roles

**Explanation:**
A driver may need to be blocked from new jobs but still allowed to correct documents.

**Example from meeting:**
Carolina’s invoice dispute example showed why full blocking is too simple.

**How to reuse it later:**
Design permissions around actions, not only account status.

---



## Lesson 5: Business/legal rules must be visible in product design

**Explanation:**
Manual assignment, direct-route obligation, and contractor responsibility are not just legal text.

**Example from meeting:**
Taner explained why assignment should remain a rare exception.

**How to reuse it later:**
Add “legal/commercial impact” labels to requirements.

---



## Lesson 6: Flexible configuration is safer than hardcoded rules

**Explanation:**
Driver limits may need different values for different drivers.

**Example from meeting:**
New drivers, trusted drivers, high-performing drivers, and older/less active drivers behave differently.

**How to reuse it later:**
Prefer configurable admin settings where business values may change.

---



## Lesson 7: Human review can be a valid MVP solution

**Explanation:**
Not every document problem needs AI from day one.

**Example from meeting:**
Document rejection with a reason solves many quality problems without scanner AI.

**How to reuse it later:**
Use manual review loops before expensive automation.

# 12. Clean meeting notes



# AUTHEON Product Review Meeting — Deep Meeting Notes



## Main purpose

The meeting focused on reviewing the AUTHEON prototype/Figma feedback and clarifying business-critical workflow requirements before implementation decisions become too expensive to change.

The discussion started with Figma access and feedback setup, then moved into deeper requirements around driver jobs, time windows, documents, driver limits, assignment logic, and driver access restrictions.

## Participants

- Ferhat Catak
- Taner Özdemir / AUTHEON
- Carolina Offermanns / AUTHEON
- Till Toenges



## Topics discussed



### 1. Figma feedback process

The correct Figma page for client feedback is “Kleins Feedback”. Ferhat transferred comments there and explained how AUTHEON should review, reply, and add new comments.

The team also confirmed that links and passwords were shared through Monday and WhatsApp.

### 2. Confirmed prototype/UI changes

The following changes were treated as accepted:

- Add a back button from active job screens back to the marketplace.
- Show a notification count.
- Show the total number of marketplace jobs even when no filters are active.

The exact visual display of the total marketplace count still needs a proposal.

### 3. Structural workflow clarification

Ferhat raised concern that some prototype assumptions may not match AUTHEON’s real operational structure. This was treated as important because wrong assumptions could lead to deep system restructuring later.

### 4. Real job example

Taner showed a real transport order and explained how AUTHEON currently receives order information, enters important fields into Excel, and creates transport documents.

This example clarified that AUTHEON usually works with time windows, not exact pickup/dropoff times.

### 5. Time windows

AUTHEON transport jobs usually need:

- A pickup time window.
- A delivery/dropoff time window.

A single overall time window is not enough because pickup and delivery usually involve different parties and different locations.

### 6. Notes and additional information

The team discussed whether notes belong to the customer, contact person, address, or specific order.

Conclusion: many instructions are order-specific and are provided by the Auftraggeber each time. Persistent notes may still be useful for stable information, such as building/location instructions, but this needs clear structure.

### 7. Vehicle data

Vehicle color and vehicle photos are not required for MVP. VIN/chassis number and license plate are normally enough to identify the vehicle.

The field “registered / not registered” appeared in Taner’s proposed document template and needs further clarification.

### 8. Driver document uploads

Drivers may need to upload invoices, fuel receipts, delivery notes, and other job-related documents.

For MVP, the upload process should remain flexible. Scanner features, automatic PDF conversion, AI quality checks, and automatic extraction are useful ideas but should likely be treated as future improvements.

### 9. Document correction workflow

Admins need to review uploaded documents and reject incorrect or unreadable documents with a reason. Drivers should be notified and able to upload corrected documents.

This is important because invoice/document corrections happen regularly.

### 10. Driver booking limits

The team discussed the risk of drivers accepting too many jobs or monopolizing the marketplace.

A possible solution is a configurable limit or reputation-based system where new drivers start with lower limits and trusted drivers receive more flexibility.

AUTHEON needs to define the exact rules.

### 11. Manual assignment

Admin assignment should be an exception and not the normal workflow. It may be used when a driver confirms outside the system, such as by phone or email.

Manual assignment should be documented carefully because the normal business model depends on drivers/service partners choosing work themselves.

### 12. Admin-uploaded documents

Admins should be able to upload optional documents to a job, such as approach sketches or special location instructions.

This should be optional, not mandatory.

### 13. Coordinates

Exact latitude/longitude fields are not needed for MVP. If a location is hard to find, the driver can use contact details or uploaded approach sketches.

Coordinates may remain a future option.

### 14. Upload timing

The team discussed whether drivers should upload documents before a job is marked completed. This may be useful because fuel receipts can be created during the tour.

This needs a final decision.

### 15. Future credit-note process

AUTHEON wants to eventually move toward a credit-note process, where AUTHEON generates payout documents instead of relying fully on contractor invoices.

This is not MVP, but the system architecture should not block it.

### 16. Selective driver blocking

Carolina raised the need to block a driver from viewing or booking marketplace jobs while still allowing them to correct invoices/documents.

This requires a more detailed permission model than simple active/blocked status.

## Important conclusions

- The system must support pickup and delivery time windows.
- Marketplace total count, notification count, and back navigation are confirmed UI requirements.
- Document rejection and correction is operationally important.
- Scanner/AI document handling should be future scope.
- Manual assignment is an exception, not a normal workflow.
- Driver limits and selective blocking require more specification.
- The project needs strong documentation to prevent scattered feedback and unclear requirements.



## Decisions

- Use “Kleins Feedback” as the main Figma feedback page.
- Add back button, notification count, and marketplace total count.
- Replace exact job times with pickup and delivery time windows.
- Do not include vehicle color/photo as MVP requirement.
- Treat photo protocol, scanner features, AI validation, and credit notes as future-version topics.
- Add optional admin document upload.
- Do not implement exact coordinates in MVP.
- Treat manual assignment as exceptional fallback only.



## Action items


| Action item                                           | Owner                       | Deadline            |
| ----------------------------------------------------- | --------------------------- | ------------------- |
| Review and respond to Figma comments                  | AUTHEON                     | Before next meeting |
| Add open questions to Monday                          | Ferhat                      | Not specified       |
| Send WhatsApp update after Monday questions are added | Ferhat                      | Not specified       |
| Propose display for marketplace total count           | Ferhat/design team          | Not specified       |
| Send any new documents by email                       | AUTHEON                     | Not specified       |
| Define driver booking-limit rules                     | AUTHEON                     | Not specified       |
| Define selective driver-blocking rules                | AUTHEON + product/tech team | Not specified       |
| Decide upload timing before/after completion          | AUTHEON                     | Not specified       |
| Add calendar invites for next meetings                | Till                        | Before next meeting |




## Risks

- Late feedback may cause rework.
- Wrong time model could cause deep restructuring.
- Notes/instructions may be stored at the wrong level.
- Driver document quality may create client complaints.
- Booking-limit logic may become complex.
- Selective blocking may create admin tracking issues.
- Future features may expand MVP scope.



## Open questions

- How should marketplace total count be displayed?
- Is vehicle registration status required as a field?
- What note types are needed?
- Which document types and formats should be supported?
- Can drivers upload documents during active jobs?
- What booking limits should apply to new and trusted drivers?
- Should limits apply to admin assignment?
- Which driver functions can be selectively blocked?
- How should admins track temporary restrictions?



## Next steps

1. AUTHEON should finish Figma review and comment directly on the correct page.
2. Ferhat should add all open questions to Monday.
3. The team should convert confirmed points into implementation tasks.
4. AUTHEON should define driver booking-limit and blocking rules.
5. The product/technical team should update the prototype requirements around time windows and document flows.
6. Future features should be separated clearly from MVP scope.



# 13. Timeline of the meeting


| Time            | Topic                          | What happened                                             | Importance                               |
| --------------- | ------------------------------ | --------------------------------------------------------- | ---------------------------------------- |
| 0:03–3:33       | Meeting setup                  | Fireflies joined; Ferhat had connection/screen issues     | Low operational importance, caused delay |
| 4:36–7:28       | Figma access and correct page  | Ferhat explained “Kleins Feedback” page and comments      | High for feedback process                |
| 7:28–13:26      | Links/passwords/accounts       | Monday, WhatsApp, Figma password, browser login discussed | Medium                                   |
| 14:24–18:14     | Confirmed UI changes           | Back button, notification count, marketplace count        | High                                     |
| 18:14–20:43     | Structural risk                | Ferhat warned about structural inconsistencies            | Very high                                |
| 21:31–24:44     | Real job example               | Taner showed real transport order and time windows        | Very high                                |
| 25:02–28:21     | Time-window clarification      | Two separate windows needed                               | Very high                                |
| 28:38–30:35     | Generated document template    | Taner showed proposed dynamic order document fields       | High                                     |
| 30:37–42:42     | Notes/instructions             | Customer/contact/order notes discussed                    | High                                     |
| 43:16–46:39     | Scheduling and docs            | Next meeting and document sharing discussed               | Medium                                   |
| 46:39–50:52     | Figma usage tutorial           | Ferhat showed preview/comment workflow                    | Medium                                   |
| 51:31–54:36     | Source PDFs and vehicle fields | Real PDF shown; vehicle color not needed                  | High                                     |
| 55:22–56:02     | Vehicle photo protocol         | Future V2 feature discussed                               | Medium                                   |
| 56:02–1:02:58   | Driver document uploads        | Receipts, invoices, photos, PDFs, scanner question        | High                                     |
| 1:03:18–1:05:54 | Document quality               | Driver instructions, scanner/AI future possibility        | High                                     |
| 1:05:54–1:08:30 | Document rejection             | Admin rejection/reason/driver correction                  | Very high                                |
| 1:08:30–1:20:47 | Driver booking limits          | Overbooking, reputation, individual limits                | Very high                                |
| 1:21:12–1:22:39 | Manual assignment              | Assignment is rare fallback                               | High                                     |
| 1:22:39–1:25:02 | Admin uploads                  | Optional documents like approach sketches                 | High                                     |
| 1:25:02–1:26:41 | Coordinates                    | Not needed for MVP                                        | Medium                                   |
| 1:27:06–1:28:22 | Upload before completion       | Needs internal decision                                   | High                                     |
| 1:28:22–1:29:25 | Credit-note future             | Future finance workflow                                   | Medium-high                              |
| 1:29:43–1:35:30 | Selective driver blocking      | Block marketplace but allow corrections                   | Very high                                |
| 1:36:33–1:37:34 | Next meeting                   | Wednesday 14:00 discussed; Till to handle                 | Medium                                   |




# 14. Best transcript evidence


| Timestamp | Speaker      | Near-exact English transcript meaning                                               | Why important                                     | Related topic          |
| --------- | ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------- |
| 6:26      | Ferhat       | “The page is called Kleins Feedback. It is exactly meant for you.”                  | Establishes feedback source of truth              | Figma process          |
| 14:24     | Ferhat       | “We recorded three points that should definitely be done.”                          | Introduces confirmed changes                      | Decisions              |
| 14:45     | Ferhat/Taner | “Back button… return to marketplace.” / “Correct.”                                  | Confirms driver navigation requirement            | UI requirement         |
| 15:22     | Ferhat       | “We definitely want a number, not only…”                                            | Confirms notification/result count concern        | UI requirement         |
| 16:31     | Ferhat       | “The count should appear even when no filters are set.”                             | Defines marketplace count requirement             | Marketplace            |
| 18:14     | Ferhat       | “Structural inconsistencies appeared… possible problems in the general structure.”  | Most important risk statement                     | Structural risk        |
| 23:38     | Taner        | “We usually always have a time window.”                                             | Core correction to time model                     | Time windows           |
| 25:10     | Ferhat       | “The prototype has exact times, but actually you work with time windows.”           | Converts business fact into system requirement    | Data model             |
| 27:26     | Taner        | “It cannot be one time window because they are two different points/customers.”     | Confirms need for separate pickup/dropoff windows | Workflow               |
| 31:56     | Carolina     | “It is actually always different in the orders.”                                    | Shows notes are often order-specific              | Notes                  |
| 41:37     | Taner        | “No, we always receive it communicated.”                                            | Reduces need for persistent note automation       | Responsibility         |
| 52:42     | Ferhat       | “You do not choose this format yourself.”                                           | Confirms external source format constraint        | Input documents        |
| 53:53     | Carolina     | “The most important is VIN and license plate.”                                      | Supports not adding vehicle color                 | Vehicle identification |
| 55:29     | Taner        | “I would like this in version 2.”                                                   | Places photo protocol in future scope             | Roadmap                |
| 59:53     | Till         | “Conversion to PDF is technically possible; I do not see the big advantage.”        | Pushes against unnecessary MVP complexity         | Document upload        |
| 1:04:30   | Till         | “This is an area where you can do a lot, also with AI… but beyond first milestone.” | Clear scope-control statement                     | AI/scanner             |
| 1:07:13   | Carolina     | “At least once a week with at least two invoices we need a correction.”             | Shows document correction is frequent             | Document review        |
| 1:09:37   | Taner        | “I wrote this down: limitation of driver jobs.”                                     | Introduces booking-limit requirement              | Marketplace control    |
| 1:13:21   | Till         | “I can imagine a reputation system.”                                                | Suggests scalable solution                        | Driver limits          |
| 1:21:12   | Taner        | “Assignment should only be a temporary/emergency solution.”                         | Defines assignment as exception                   | Admin assignment       |
| 1:24:28   | Taner        | “You mean approach descriptions.”                                                   | Confirms admin upload need                        | Attachments            |
| 1:25:52   | Taner        | “Let us test with this program first.”                                              | Coordinates deferred                              | Scope                  |
| 1:28:32   | Taner        | “We want to do that eventually.”                                                    | Confirms future credit-note idea                  | Finance roadmap        |
| 1:29:43   | Carolina     | “Can we block drivers from seeing jobs but not invoices?”                           | Important permission requirement                  | Selective blocking     |
| 1:32:48   | Ferhat       | “The problem is overview; you must remember what was disabled.”                     | Highlights admin-process risk                     | Blocking risk          |




# 15. Final practical action plan



## What you should do immediately

1. Extract the confirmed decisions into tasks.
2. Update the requirements around time windows.
3. Mark driver document rejection as a critical workflow.
4. Create an open-question list for AUTHEON before the next meeting.
5. Separate MVP features from V2/future ideas.



## What you should document

- Figma feedback process.
- Confirmed UI changes.
- Pickup and delivery time-window model.
- Generated order document fields.
- Notes/instructions data model.
- Driver document upload and rejection workflow.
- Manual assignment policy.
- Driver booking-limit rules.
- Selective driver blocking rules.
- Future roadmap: photo protocol, scanner/AI, credit notes, coordinates.



## What you should clarify

- Is “registered / not registered” required?
- What exact job document fields are mandatory?
- What upload formats are accepted?
- Can drivers upload documents before completion?
- What exact driver limits should exist?
- Should limits be automatic, manual, or both?
- Which driver functions can be blocked?
- How should temporary restrictions be tracked?



## What you should discuss with the team

- Data model impact of time windows.
- Whether to use feature-level permissions for drivers.
- How to avoid scope creep from AI/scanner/photo-protocol ideas.
- How to make admin restrictions visible and auditable.
- Whether to show warnings for overlapping driver jobs.
- How manual assignment should be logged.



## What you should turn into tasks


| Task                                             | Type                                |
| ------------------------------------------------ | ----------------------------------- |
| Add active-job back button                       | Frontend                            |
| Add notification count                           | Frontend/backend notification logic |
| Add marketplace total count                      | Frontend/API                        |
| Replace exact times with pickup/delivery windows | Full-stack/data model               |
| Add optional admin attachments                   | Full-stack                          |
| Add document rejection reason                    | Admin/backend                       |
| Add driver correction notification               | Notification/driver app             |
| Define driver booking limits                     | Product requirement                 |
| Add configurable driver limits                   | Admin/backend                       |
| Add selective driver access restrictions         | Permissions/backend/frontend        |
| Add future credit-note roadmap item              | Product/architecture                |
| Add future scanner/AI roadmap item               | Product roadmap                     |




## What you should remember for later

This meeting is strong evidence that the prototype should not be treated as final truth yet. It is a conversation tool. The real product specification must come from the operational edge cases revealed during meetings like this.

# 16. Importance rating



## Rating: 9 / 10

This meeting was very important.


| Factor                 | Rating    | Reason                                                                      |
| ---------------------- | --------- | --------------------------------------------------------------------------- |
| Number of decisions    | High      | Several UI and workflow decisions were confirmed                            |
| Number of action items | High      | Many follow-ups emerged for Figma, Monday, docs, limits, permissions        |
| Strategic value        | Very high | The meeting corrected assumptions about time windows and workflow structure |
| Risk level             | Very high | Wrong modeling could cause deep rework                                      |
| Reusable knowledge     | Very high | Many lessons apply to future requirements discovery                         |
| Impact on future work  | Very high | Affects database, UI, backend rules, permissions, documents, and roadmap    |


The meeting deserves a high rating because it uncovered structural requirements before implementation locked them in. The most valuable discovery was that AUTHEON’s real workflow uses operational time windows, flexible document handling, and business-controlled driver rules, not a simple fixed-time job marketplace.

# 17. Final short summary

This meeting was really about turning the AUTHEON prototype into a more accurate product specification.

It was important because the team discovered that several prototype assumptions need deeper business validation, especially around time windows, documents, driver limits, manual assignment, and driver blocking.

The most important next steps are to document the confirmed decisions, update the system requirements for pickup/dropoff time windows, define driver booking and blocking rules, and separate MVP requirements from future features like scanner/AI document checks, vehicle photo protocols, and credit-note automation.