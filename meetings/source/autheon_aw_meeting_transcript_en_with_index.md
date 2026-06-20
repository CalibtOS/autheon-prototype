# Autheon x AW Meeting Transcript

## English Internal PRD Notes

**Source:** German meeting transcript from the Autheon x AW client meeting  
**Meeting date:** 2026-05-18, inferred from the transcript filename  
**Purpose:** Convert the meeting content into structured English notes that can be used to update the PRD.

## Index

1. [Executive Summary](#1-executive-summary)
2. [Meeting Context](#2-meeting-context)
3. [Topic Breakdown With PRD Impact](#3-topic-breakdown-with-prd-impact)
   1. [Order Creation](#31-order-creation)
   2. [Ordering Party Versus Operational Addresses](#32-ordering-party-versus-operational-addresses)
   3. [Address Master Data](#33-address-master-data)
   4. [Manual Saving of Addresses](#34-manual-saving-of-addresses)
   5. [Country Field and Postal Code Logic](#35-country-field-and-postal-code-logic)
   6. [Driver Navigation and Maps](#36-driver-navigation-and-maps)
   7. [Notifications and Audit Log](#37-notifications-and-audit-log)
   8. [Document Uploads and Review](#38-document-uploads-and-review)
   9. [Infopoint](#39-infopoint)
   10. [Distance Calculation](#310-distance-calculation)
   11. [Status Model](#311-status-model)
   12. [Cancellation and Problem Case Logic](#312-cancellation-and-problem-case-logic)
   13. [Finance Section and Partner Invoices](#313-finance-section-and-partner-invoices)
   14. [Service Partner and Driver Management](#314-service-partner-and-driver-management)
   15. [Driver Login and Authentication](#315-driver-login-and-authentication)
   16. [Vehicle Condition Documentation](#316-vehicle-condition-documentation)
   17. [Excel Migration and Rollout](#317-excel-migration-and-rollout)
   18. [Mass Import and CSV Import](#318-mass-import-and-csv-import)
   19. [Tour Types](#319-tour-types)
   20. [Final Client Reaction](#320-final-client-reaction)
4. [Direct PRD Changes](#4-direct-prd-changes)
5. [Requirements Extracted From the Meeting](#5-requirements-extracted-from-the-meeting)
6. [Open Questions](#6-open-questions)
7. [Version 1 Scope Recommendation](#7-version-1-scope-recommendation)
8. [Validation Note](#8-validation-note)

## 1. Executive Summary

The meeting was a client review and clarification session for the Autheon app prototype. The client reacted positively to the prototype and stated that it helped make the planned system easier to understand and discuss. The conversation clarified several important product decisions that should directly update the PRD.

The biggest clarification is that the app must clearly separate three concepts:

* The ordering party that commissions Autheon.
* The pickup location where the vehicle is collected.
* The delivery location where the vehicle is handed over.

The client also clarified that reusable master data should mainly exist for pickup and delivery addresses, not only for ordering parties. Ordering parties are expected to be a small list, while pickup and delivery addresses may become a much larger list.

Version 1 should stay focused. The client accepted keeping several complex items out of the first release, including full finance dashboards, vehicle condition documentation integration, mass CSV import, historical Excel migration, and complex tour chains.

## 2. Meeting Context

The meeting reviewed the current prototype and compared it with the written feedback previously provided by the client. Our team walked through the admin backend and driver PWA, while the client clarified operational expectations.

The main goal was not to redesign the full product from scratch. The goal was to turn the feedback into clearer implementation requirements and decide what belongs in Version 1.

The meeting also helped us identify where the prototype logic was correct, where the terminology needed correction, and where the first version should remain simpler.

## 3. Topic Breakdown With PRD Impact

### 3.1 Order Creation

**Timestamps:** 00:03 to 01:24

The first major discussion was about order creation. Our team initially asked whether the client wanted a clearer separation between the customer and contact persons. The client clarified that the real requirement is the separation between pickup address and delivery address.

The order form must therefore support:

* One pickup address.
* One delivery address.
* Separate pickup date.
* Separate pickup time window.
* Separate delivery date.
* Separate delivery time window.

**PRD impact:** The order creation section must be updated so pickup and delivery are separate operational sections. Each section needs its own address and time data.

### 3.2 Ordering Party Versus Operational Addresses

**Timestamps:** 01:55 to 08:39

The client explained that Autheon has ordering parties that commission the vehicle transfers. These are usually only a few recurring companies, such as leasing companies or car dealers. The customers of those ordering parties are the people or companies where vehicles are actually picked up or delivered.

Example logic:

| Concept | Meaning | Example |
|---|---|---|
| Ordering party | The company that commissions Autheon | Leasing company or car dealership |
| Shared customer | The customer of the ordering party | Leasing customer or vehicle buyer |
| Pickup location | Where the vehicle is collected | Company, private person, logistics site |
| Delivery location | Where the vehicle is handed over | Workshop, dealer, customer, logistics site |

The client explicitly stated that the ordering party list will remain small. The address list will be larger because many different pickup and delivery locations will appear.

**PRD impact:** The PRD should not model the ordering party as the same thing as the pickup or delivery location. The ordering party should remain a required monitoring and reporting field, but address master data should be independent.

### 3.3 Address Master Data

**Timestamps:** 05:31 to 09:55

The client corrected an assumption that selecting an ordering party should automatically fill a fixed pickup address. That would be wrong because the same ordering party can commission vehicles from many locations.

The client wants reusable address data for pickup and delivery locations. The same address record can be used as a pickup location in one order and as a delivery location in another order.

The address master data should support:

* Searching by name.
* Selecting an existing address.
* Autofilling address and contact details.
* Free manual entry when the address is not stored.
* Optional saving of new address records.

The client does not want every one time private address to be saved automatically because that would pollute the master data list.

**PRD impact:** Add a shared address master data module. It should not be tightly bound to one ordering party. During order creation, the admin can select an address or enter one manually.

### 3.4 Manual Saving of Addresses

**Timestamps:** 09:12 to 12:50

The client was open to whichever implementation is simpler, but clearly preferred manual control if automatic saving creates messy data. A recurring address should be saved, while a one time private address may not need to be saved.

**PRD impact:** Address saving should be optional. The order form should not force every address to become master data.

### 3.5 Country Field and Postal Code Logic

**Timestamps:** 13:24 to 16:16

The conversation clarified that the country should be stored separately from the postal code. The system should not use formats like `D-50674` inside the postal code field.

The client confirmed that Germany is the standard case for now. Future support for neighboring countries may become relevant later.

**PRD impact:** The address model must include a separate country field. Postal codes should remain native to the country. German postal code prefix filtering should be supported for Version 1, while international filtering can remain future scope.

### 3.6 Driver Navigation and Maps

**Timestamps:** 19:10 to 21:18

The client wants drivers to start navigation directly from the PWA. The app should not build its own map system. Instead, it should pass the pickup or delivery address to the smartphone navigation app.

Possible target apps include:

* Apple Maps.
* Google Maps.
* The default installed map app.

**PRD impact:** Add two actions in the tour detail view:

* Start navigation to pickup location.
* Start navigation to delivery location.

The app should use external map deep links or standard map URLs.

### 3.7 Notifications and Audit Log

**Timestamps:** 21:35 to 30:38

The team discussed the difference between an audit log and real notifications. The audit log records everything, but urgent operational events could be missed if they only appear in a general log.

The client was especially concerned about critical events such as:

* A driver cancelling an order.
* A driver reporting that a tour cannot be performed.
* A driver uploading an invoice or document.
* A document being rejected.

For admins, a full backend notification center may be too much for Version 1. The simpler first approach is to send admin email alerts with a direct link to the relevant order.

For drivers, the client does not want email notifications for app workflow events. Driver communication should happen through the PWA and push notifications.

**PRD impact:** Version 1 should include driver push notifications and admin email alerts for critical events. A full backend notification center can remain future scope.

### 3.8 Document Uploads and Review

**Timestamps:** 30:44 to 37:56

The client clarified that the invoice upload should not be the only document upload. Drivers may need to upload many tour related documents.

Relevant document types include:

* Invoice.
* Fuel receipt.
* Toll receipt.
* Delivery document.
* Waiting time proof.
* Other proof.
* Other receipt.

The preferred interaction is an upload button that opens an overlay or modal. The driver selects the document type and uploads the file.

The backend should show uploaded documents with:

* Tour relation.
* Driver.
* Upload date.
* Document type.
* Review status.
* Accepted or rejected state.
* Optional rejection reason.

If a document is rejected, the driver must see that action is required again.

**PRD impact:** Document upload and review should be defined clearly. However, the client also accepted that this may be separated into Version 2 if it becomes too expensive or complex for Version 1.

### 3.9 Infopoint

**Timestamps:** 44:19 to 52:03

The client confirmed that the current Info section should become an Infopoint. It should be a central information area for service partners.

The Infopoint should have two main areas:

* General documents.
* News messages.

General documents are permanent or semi permanent PDF documents, such as process instructions, emergency contact information, conditions, or guidance for fuel receipts and invoicing.

News messages are short one way updates from admins. They should not become a complex newsletter system. They do not need replies, attachments, or rich formatting in Version 1.

Useful frontend behavior includes:

* Read and unread status.
* New message badge.
* Newest messages first.
* Short preview before opening the full message.

**PRD impact:** Rename Info to Infopoint. Implement two tabs or segmented areas: General Documents and News.

### 3.10 Distance Calculation

**Timestamps:** 52:18 to 55:56

The client wants the system to estimate the distance between pickup and delivery locations after both addresses are entered. The distance should be based on a realistic road route, not straight line distance.

If multiple routes exist, the system should generally choose the shortest drivable route by kilometers. The client also emphasized that admins must be able to manually override the calculated distance.

**PRD impact:** Add distance calculation through a map API if technically and commercially feasible. The calculated value should support pricing, but should not block manual correction.

### 3.11 Status Model

**Timestamps:** 56:01 to 1:03:15

The meeting clarified that the status model needs separation between operational tour status and document or settlement status.

The client and our team discussed that:

* A tour can be operationally performed.
* Documents may still be missing.
* Invoices may still need review.
* The order may not yet be fully closed for billing.

A special case status is needed for events where the tour cannot continue normally but should not automatically be cancelled.

Examples of special cases:

* Vehicle not on site.
* Vehicle not roadworthy.
* Wrong address.
* Contact person unavailable.
* Waiting time.
* Empty trip.
* Missing documents.
* Vehicle damage.

**PRD impact:** The PRD should separate operational status, document review status, and settlement or closing status. Admin override is important.

### 3.12 Cancellation and Problem Case Logic

**Timestamps:** 1:00:20 to 1:03:15

The client accepted that once a driver accepts an order, the order should not simply be returned like a normal marketplace item. Instead, the driver should use a problem reporting function.

The two main driver actions should be:

* Cancel order.
* Report order as not feasible.

For both paths, the system should capture:

* Reason.
* Optional free text.
* Optional evidence upload.
* Actor.
* Timestamp.
* Admin follow up decision.

**PRD impact:** Replace return window logic with cancellation and problem case logic.

### 3.13 Finance Section and Partner Invoices

**Timestamps:** 1:03:31 to 1:11:06

The finance section in the prototype created confusion. The client initially thought it might relate to outgoing invoices to ordering parties, but the more concrete workflow is partner invoice handling.

The client described the actual workflow:

* Drivers upload invoices.
* A colleague checks invoices continuously.
* Checked invoices are later downloaded.
* Invoices are uploaded into an external bookkeeping system.
* No direct accounting integration is needed for now.

Useful backend behavior could include:

* View uploaded invoices.
* Mark invoices as checked or approved.
* Reject invoices with a reason.
* Select multiple invoices.
* Download selected invoices together.
* Filter by document type later.

**PRD impact:** Remove or de scope the full finance dashboard from Version 1. Partner invoice workflow is more concrete and can be scoped separately.

### 3.14 Service Partner and Driver Management

**Timestamps:** 1:11:06 to 1:16:01

Admins need a service partner management area. The client confirmed that admins should be able to manage service partner data and access.

The backend should support:

* Name.
* Company.
* Contact details.
* Internal notes.
* Active status.
* Blocked status.
* Archive or soft delete.
* Access reset.

Blocked drivers should not be able to accept new tours. Historical tours must remain linked to the driver record for traceability.

**PRD impact:** Add service partner management requirements. Use soft delete or archive for records with historical tours.

### 3.15 Driver Login and Authentication

**Timestamps:** 1:17:17 to 1:19:35

The team discussed whether classic email and password login is necessary. Password based login creates additional flows such as password reset and support.

The client needs protected individual driver access because drivers may upload invoices and documents. However, the client is open to simpler access patterns such as magic links or account keys.

**PRD impact:** Define secure driver authentication. Recommended direction: magic link or token based access, if technically appropriate. Password login remains fallback.

### 3.16 Vehicle Condition Documentation

**Timestamps:** 1:21:31 to 1:23:55

The client currently uses or is testing another app for vehicle condition documentation. The current PWA does not need to integrate with it in Version 1.

The client would like a future workflow where the driver can start vehicle documentation directly from the accepted tour. However, this would create large additional scope because of image storage, plausibility checks, and protocol logic.

**PRD impact:** Vehicle condition documentation must be marked as future scope, not Version 1.

### 3.17 Excel Migration and Rollout

**Timestamps:** 1:24:24 to 1:29:26

The client currently uses Excel as the operational source of truth. No detailed migration plan existed before the meeting.

The recommended rollout approach is:

* Set up the new system.
* Add selected initial drivers and useful master data.
* Start using the system from zero.
* Do not import old historical tours.
* Possibly run Excel and the new system in parallel for one or two months.
* Start with tech friendly drivers.
* Let the client prepare written guidance and instructions.

The client explicitly confirmed that old data should not be entered retroactively.

**PRD impact:** Add rollout assumptions. No historical migration is required for Version 1.

### 3.18 Mass Import and CSV Import

**Timestamps:** 1:29:47 to 1:30:33

Our team asked whether mass import through CSV is required. The client said it is not currently needed.

**PRD impact:** CSV import is out of Version 1.

### 3.19 Tour Types

**Timestamps:** 1:30:33 to 1:31:24

The prototype supports classic A to B tours. The client mentioned that other industry cases exist, such as A to B to A or A to B to C. However, the client explicitly said Version 1 should stay simple.

Complex tours can be represented as separate orders for now.

**PRD impact:** Version 1 supports simple A to B tours only.

### 3.20 Final Client Reaction

**Timestamps:** 1:32:15 to 1:32:35

The client gave strong positive feedback on the prototype. The client said it was a very good representation and an excellent basis for discussing a system that does not exist yet.

**PRD impact:** The prototype direction is validated. The main task is to refine scope and requirements, not restart the concept.

## 4. Direct PRD Changes

| PRD Area | Required Update | Priority | Version |
|---|---|---|---|
| Product scope | Define Version 1 around order management, driver PWA, marketplace, address data, notifications, Infopoint, service partner management, and special case logic. | High | Version 1 |
| Order creation | Separate ordering party, pickup location, delivery location, pickup time window, and delivery time window. | High | Version 1 |
| Address master data | Create shared reusable address data for pickup and delivery locations. | High | Version 1 |
| Postal code and country | Store country separately from postal code. Support German postal code filtering first. | High | Version 1 |
| Driver navigation | Add external map navigation actions for pickup and delivery. | High | Version 1 |
| Notifications | Use driver push notifications and admin email alerts for critical events. | High | Version 1 |
| Documents | Define document upload, categories, review status, rejection reason, and correction loop. | Medium to High | Version 1 or Version 2 |
| Partner invoices | Add invoice review and bulk download if included in scope. | Medium | Version 1 optional |
| Finance | Remove full finance dashboard from Version 1 unless workflow is confirmed. | High | Out of Version 1 |
| Status model | Separate operational status from document review and settlement status. | High | Version 1 |
| Problem cases | Replace return logic with cancellation and not feasible workflows. | High | Version 1 |
| Infopoint | Add General Documents and News areas. | Medium | Version 1 |
| Service partner management | Add active, blocked, archived, and access reset behavior. | High | Version 1 |
| Authentication | Decide magic link, token based login, or password fallback. | High | Version 1 decision |
| Vehicle documentation | Mark as future integration. | High | Future |
| Rollout | Start from zero and do not import historical tours. | High | Version 1 rollout |
| CSV import | Exclude from Version 1. | Medium | Out of Version 1 |
| Tour types | Support A to B tours only. | High | Version 1 |

## 5. Requirements Extracted From the Meeting

| ID | Requirement | Source Topic | Version |
|---|---|---|---|
| REQ 001 | The system shall separate ordering party, pickup location, and delivery location. | Order creation | Version 1 |
| REQ 002 | The system shall allow separate pickup and delivery dates and time windows. | Order creation | Version 1 |
| REQ 003 | The ordering party shall be required for monitoring and reporting. | Ordering party | Version 1 |
| REQ 004 | The system shall provide reusable address master data for pickup and delivery. | Address data | Version 1 |
| REQ 005 | Admins shall be able to decide whether a manually entered address is saved. | Address data | Version 1 |
| REQ 006 | Postal code and country shall be stored separately. | Address data | Version 1 |
| REQ 007 | The driver PWA shall provide external navigation actions. | Driver PWA | Version 1 |
| REQ 008 | The marketplace shall reload on open and support pull to refresh. | Marketplace | Version 1 |
| REQ 009 | Drivers shall receive push notifications rather than email workflow messages. | Notifications | Version 1 |
| REQ 010 | Admins shall receive alerts for critical events, preferably by email in Version 1. | Notifications | Version 1 |
| REQ 011 | Document upload shall support categories beyond invoices. | Documents | Version 1 or Version 2 |
| REQ 012 | Documents shall have review states and rejection reasons. | Documents | Version 1 or Version 2 |
| REQ 013 | Partner invoices shall support manual review and bulk download if included. | Partner invoices | Optional Version 1 |
| REQ 014 | The full finance dashboard shall be excluded until confirmed. | Finance | Out of Version 1 |
| REQ 015 | Operational status shall be separated from document status. | Status model | Version 1 |
| REQ 016 | Special cases shall require admin decision. | Problem cases | Version 1 |
| REQ 017 | Infopoint shall include general documents and news messages. | Infopoint | Version 1 |
| REQ 018 | Service partner records shall support blocking, archiving, and access reset. | Service partner management | Version 1 |
| REQ 019 | Driver login shall be protected and should avoid unnecessary password complexity. | Authentication | Version 1 decision |
| REQ 020 | Vehicle condition documentation shall remain future scope. | Vehicle documentation | Future |
| REQ 021 | Historical Excel tours shall not be migrated. | Rollout | Version 1 rollout |
| REQ 022 | CSV mass import shall not be included in Version 1. | Import | Out of Version 1 |
| REQ 023 | Version 1 shall support simple A to B tours only. | Tour types | Version 1 |

## 6. Open Questions

| Question | Why It Matters | Suggested Next Step |
|---|---|---|
| Should document upload and review be part of Version 1 or an optional module? | It is valuable but may increase cost. | Price it separately or confirm base scope. |
| Which map API should be used for distance calculation? | API costs and route logic affect implementation. | Technical check and cost estimate. |
| Should admin alerts go to one shared mailbox or configurable recipients? | Critical events need reliable routing. | Confirm alert recipients. |
| Which service partner fields are required in the backend? | The client may want to add one or two fields later. | Prepare a proposed form and confirm. |
| Which authentication method should be used? | Security and support effort depend on this decision. | Compare magic link, token link, and password login. |
| Should document rejection reopen the tour or create a correction state? | Drivers must clearly see that action is required. | Design the correction workflow. |
| What should the final app name be? | The client does not want the app named Autheon. | Keep naming configurable until confirmed. |

## 7. Version 1 Scope Recommendation

### Must Have

* Correct order creation model.
* Shared address master data.
* Marketplace and driver PWA.
* External map navigation.
* Pull to refresh.
* Driver push notifications.
* Admin alerts for critical events.
* Core status model.
* Cancellation and problem case logic.
* Infopoint.
* Service partner management.
* Protected driver access.

### Should Have

* Distance calculation with manual override.
* Partner invoice review if budget allows.
* Basic document upload if budget allows.

### Future Scope

* Full finance dashboard.
* Accounting integration.
* Vehicle condition documentation integration.
* Backend notification center.
* CSV import.
* Complex tour chains.
* Rich news or newsletter editor.

## 8. Validation Note

The meeting confirms that the prototype direction is correct. The main changes needed are not visual redesigns. They are data model corrections, workflow clarifications, scope reductions, and clearer Version 1 boundaries.

The strongest immediate PRD updates are:

* Separate ordering party from pickup and delivery addresses.
* Add shared address master data.
* Add country field and postal code filtering logic.
* Define driver navigation through external map apps.
* Separate operational, document, and settlement statuses.
* Replace return logic with cancellation and problem case logic.
* Keep full finance, vehicle condition documentation, CSV import, historical migration, and complex tours out of Version 1.
