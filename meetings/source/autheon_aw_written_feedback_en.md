# Autheon App Prototype Written Feedback

## English Version

**Source:** German written feedback PDF from AW about the current app prototype  
**Purpose:** English markdown version for PRD review and implementation planning.

## Introductory Feedback

The provided test environment already appeals to us very much and, in its basic orientation, corresponds to our expectations for the planned PWA. Both the frontend for the service partners and the admin backend appear structured, clear, and practical.

We also consider the current UI and UX implementation to be very successful. The design is modern, easy to understand, and well aligned with operational use in the area of vehicle transfer.

The following points should therefore not be understood as fundamental criticism of the current implementation. They are consolidated feedback on desired adjustments, additional requirements, and points that still need clarification in the functional and technical logic. Individual smaller optimizations, for example regarding icons, labels, or detailed functions, may still arise during the further test process and would be submitted separately if needed.

# A. Frontend

## 1. Pull to Refresh Function in the Marketplace

In the marketplace, the user should have the option to manually update the order list using a pull to refresh function. This allows the driver to check at any time whether new orders are available or whether the status of existing orders has changed.

Please check whether the marketplace is already synchronized continuously or in real time. If automatic synchronization is planned, it should also be clarified whether manual refresh through pull to refresh can still be implemented in a meaningful way.

From an operational perspective, the following points are especially relevant:

* Are orders newly published in the backend immediately visible in the frontend?
* Is the order list updated automatically or only after a manual reload?

**Figure reference:** Example animation in the original PDF.

## 2. Push Notifications

The driver should be able to independently decide whether they want to activate push notifications in the PWA. Prior activation by an admin should not be required.

### 2.1 Types of Push Notifications

To keep the complexity of the first version lean, the push settings should initially be simple:

* Activate or deactivate push notifications.
* Notification for newly published orders.
* Notification for new orders in a desired postal code area.

The selection should be made using clear toggle switches. For postal code filtering, the driver should be able to store a desired pickup area. At least 1 digit or 2 digit postal code filtering should be possible.

Examples:

* `4` for a rough area.
* `40` or `41` for a more precise area.

It is important that the system does not generate an error for foreign or unknown postal codes and that orders are not incorrectly hidden as a result. The standard case currently concerns orders within Germany. In the future, the country should additionally be recordable in the address field in the backend.

## 3. Intelligent Navigation From the Frontend

After an order has been accepted or assigned, the driver should be able to start navigation directly from the tour detail view to the pickup address and to the delivery address.

For this purpose, two separate actions should be provided in the tour detail view:

* Start navigation to pickup.
* Start navigation to delivery.

By selecting the respective function, the address should be passed to a navigation app available on the smartphone, for example Apple Maps, Google Maps, or another available map app.

This function is important from an operational perspective because it saves the driver several manual steps and reduces address entry errors. At the same time, it makes the process significantly faster and more intuitive for the driver.

The full addresses should still only be visible after the tour has been accepted or assigned. Before acceptance, the marketplace preview should continue to show only reduced information, as before.

## 4. Tour Related Document Management

In addition to uploading invoices, the driver should also be able to upload further tour related documents. These include, in particular, expense receipts and evidence relating to the execution of the tour or special circumstances of the tour.

The upload should always be assigned to a specific tour. In the frontend, a separate function should therefore be provided in the tour detail view next to the invoice upload, for example `Upload document / receipt`.

When uploading, the driver should be able to select the document type. Suitable categories would be:

* Invoice.
* Fuel receipt.
* Toll receipt.
* Delivery document.
* Waiting time proof.
* Other proof.
* Other receipt.

The system should support common file formats, especially PDF and image formats such as JPG or PNG. Ideally, capture should be possible in a scan like manner using the smartphone camera so that documents are clearly legible and cleanly documented.

For certain document types, the system should automatically show the driver notices.

Example for a fuel receipt:

> Please make sure that the vehicle registration number is noted on the fuel receipt.

Example for waiting time proof:

> Please upload comprehensible proof of the start, end, and reason for the waiting time.

In the admin backend, all uploaded documents should be viewable, downloadable, and clearly assigned to the respective tour. It should also be possible to see:

* Which driver uploaded the document.
* When the document was uploaded.
* What document type it is.
* Whether the document has already been checked.
* Whether the document was accepted or rejected.

If a document is rejected, the admin should be able to enter a short note, for example:

* Fuel receipt not legible.
* Registration number missing.
* Waiting time not documented comprehensibly.

The driver should be able to see in the frontend whether an uploaded document has been accepted, rejected, or is still under review.

# B. Backend

## 1. Order Creation

### 1.1 Dates and Time Windows

When entering an order in the admin backend, separate date and time windows for pickup and delivery should be recordable for each order.

Required fields:

**Pickup / handover**

* Pickup date.
* Time window from.
* Time window to.

**Delivery / handover**

* Delivery date.
* Time window from.
* Time window to.

Example:

* Pickup: 01.01.2027, 08:00 to 14:00.
* Delivery: 02.01.2027, 08:00 to 12:00.

These time windows should also be visible to the driver in the frontend. Before accepting an order, at least the date information relevant for the decision should be displayed. After acceptance or assignment, the full date information should be visible in the tour detail view.

The system should additionally perform a plausibility check. Illogical entries should be recognized and shown to the admin.

Examples:

* Delivery date is before pickup date.
* Time window `to` is before time window `from`.

In such cases, at least a warning should appear. The admin should be able to consciously confirm the entry if needed.

### 1.2 Ordering Party, Pickup Location, Delivery Location, and Contact Details

When entering an order in the admin backend, the relevant parties should be clearly separated from one another. From the client's perspective, the following structure is required.

#### a) Ordering Party

The ordering party is Autheon's contractual partner and serves in particular for internal assignment, analysis, and billing.

Examples:

* Leasing company.
* Bank.
* Car dealership.
* Company with vehicle fleet.
* Automobile manufacturer.
* Logistics company.

#### b) Pickup Location

The pickup location is the place where the vehicle is taken over.

Data to be recorded:

| Field | Example Value |
|---|---|
| Name | AbsolutWeb GmbH |
| Street, house number | Moltkestraße 131 |
| Postal code, city | 50674 Cologne |
| Country | Germany |
| Contact person | Mr. Felix Krülls |
| Telephone | +49 123456789 |
| Alternative contact person | Optional |
| Telephone 2 | Optional |
| Email | Optional |
| Info | Optional |

#### c) Delivery Location

The delivery location is the place where the vehicle is handed over.

Data to be recorded:

| Field | Example Value |
|---|---|
| Name | CAT Germany GmbH |
| Street, house number | Zülpicher Straße 150 |
| Postal code, city | 52349 Düren |
| Country | Germany |
| Contact person | Gate / reception |
| Telephone | +49 211 1500000 |
| Alternative contact person | Optional |
| Telephone 2 | Optional |
| Email | Optional |
| Info | Optional |

Optional fields should not permanently overload the input form. A function such as the following would be useful:

> Add another contact

or

> Show additional contact details

This keeps order entry lean, but still allows additional information when needed.

### 1.3 Efficient Input

Order entry in the admin backend should be as fast and low error as possible. Since orders are often manually transferred from PDF orders or emails in everyday operations, efficient input fields and automatic formatting are especially important. Even small time savings per order are relevant at higher order volumes.

#### Date Input

The date should be enterable both by free text input and through a calendar picker. The system should automatically convert the input into the format DD.MM.YYYY.

Example:

* `010127` becomes `01.01.2027`.

#### Time Input

Times should be recorded by free text input and automatically formatted. Manual entry of the word `o'clock` should not be required.

Examples:

* `0800` becomes `08:00`.
* `830` becomes `08:30`.

The system should allow only valid times.

#### Vehicle Manufacturer Input

For vehicle manufacturers, a combination of dropdown suggestions and free text input should be possible. The system should suggest known manufacturers, but should not block unknown or differing entries.

The vehicle model should be recordable as a free text field, optionally with a suggestion function.

#### Vehicle Identification Number Input

The VIN should be recorded as a free text field. The system should:

* Allow a maximum of 17 characters.
* Automatically convert letters to uppercase.
* Remove spaces.
* Avoid invalid special characters.
* Show a notice if fewer than 17 characters are entered.

Saving without a VIN should remain possible if it is not included in the order. In this case, a notice should appear.

#### License Plate Input

License plates should be quickly enterable using free text. The system should automatically standardize the input, especially through:

* Automatic uppercase conversion.
* Removal of unnecessary spaces.
* Sensible formatting.
* Support for German and foreign license plates.

Validation that is too rigid and based exclusively on the German license plate format should be avoided, as foreign license plates may also occur in the future.

### 1.4 Distance Calculation and Display

After entry of the pickup and delivery address, the admin backend should, if possible, automatically calculate and display the distance between the two locations. The aim is to reduce the manual step through external navigation tools and speed up later price determination.

The distance should be calculated on the basis of a realistic road route. The decisive factor is not the straight line distance, but an actually drivable route using public roads.

If the map service used determines several possible routes, the system should generally select the shortest drivable route by kilometers.

Example:

If a navigation service suggests three routes, the route with the lowest kilometer distance should be adopted, provided that it is realistically drivable.

After entering or changing addresses, the system should automatically try to calculate the distance. The calculated distance should be displayed in the order and be usable as a basis for manual remuneration calculation.

At the same time, manual entry or correction of the distance must remain possible, especially for cases such as:

* Address is not found clearly.
* Foreign or incomplete address.
* New development area or special location.
* Different kilometer information from the ordering party.
* Manually defined special route.
* Implausible calculation by the map service.

Please check which map service or API is planned for the distance calculation and whether ongoing usage costs arise. It should also be checked whether the respective API can output multiple route alternatives and whether the shortest drivable route by kilometers can be automatically selected from them.

### 1.5 Master Data and Clarification

For efficient order entry, a clean data structure, and later analysis, the relevant parties in the system should be clearly separated from one another. The following terms in particular must be distinguished: ordering party, pickup location, and delivery location. This separation is important because the ordering party is not necessarily identical with the actual pickup or delivery location.

#### Ordering Party

The ordering party is Autheon's contractual partner and commissions the execution of the vehicle transfer.

Examples:

* Leasing company.
* Bank.
* Car dealership.
* Company with a large vehicle fleet.
* Automobile manufacturer.
* Logistics company.

For Autheon, the ordering party is particularly relevant for internal assignment, billing, analysis, and monitoring.

Examples of later analyses:

* How many orders came from which ordering party?
* Which ordering parties generate particularly high revenue?
* Which ordering parties cause a particularly high number of queries or special cases?
* Which relations or locations occur regularly for certain ordering parties?

#### Pickup Location

The pickup location is the specific place where the vehicle is taken over.

Examples:

* Leasing customer.
* Car dealership.
* Workshop.
* Company.
* Private person.
* Logistics site.

For the pickup location, the following data in particular should be recordable:

* Name / company.
* Street and house number.
* Postal code and city.
* Country.
* Contact person.
* Telephone number.
* Optional additional telephone number.
* Optional email address.
* Optional notes on pickup.

#### Delivery Location

The delivery location is the specific place where the vehicle is dropped off.

Examples:

* Car dealership.
* Workshop.
* Logistics center.
* Return location.
* Customer.
* Manufacturer location.

For the delivery location, the following data in particular should be recordable:

* Name / company.
* Street and house number.
* Postal code and city.
* Country.
* Contact person.
* Telephone number.
* Optional additional telephone number.
* Optional email address.
* Optional notes on delivery.

#### Master Data Management in the Backend

There should be master data management in the backend where recurring ordering parties, pickup locations, and delivery locations can be stored and quickly selected during order entry.

This is especially important when vehicles are regularly picked up from or delivered to the same locations.

Example:

An ordering party commissions Autheon with the transfer of 50 vehicles. The vehicles are picked up one after another from different leasing customers and delivered to the same workshop or logistics site. In such cases, selection from existing master data would be significantly more efficient than completely manual new entry for every order.

During order entry, a search or autocomplete function should therefore be provided, for example:

* Select ordering party from master data.
* Select pickup location from master data.
* Select delivery location from master data.
* Create a new data record directly from order entry.
* Update existing master data if needed.

Order entry must not be blocked if a data record does not yet exist. In this case, the admin should enter the data manually and optionally save it as a new master data record.

#### Visibility in the Frontend

The visibility of the data in the frontend should be controlled depending on the status of the order.

Before acceptance of the order, the ordering party should not be visible to the service partner. After acceptance by a service partner or after direct assignment by an admin, the ordering party should be visible in the tour detail view. This lets the service partner know the order context in which the tour is being performed.

Visibility should be regulated as follows:

| Information | Before acceptance in marketplace | After acceptance |
|---|---|---|
| Ordering party | No | Yes |
| Rough pickup region, postal code | Yes | Yes |
| Rough delivery region, postal code | Yes | Yes |
| Full pickup address | No | Yes |
| Full delivery address | No | Yes |
| Contact person | No | Yes |
| Telephone number | No | Yes |
| Driver relevant notes | Limited, for example driven on own wheels | Yes |

## 2. Status Management

For operational management of orders, clear and uniform status management is required. Each order should have an unambiguous status at all times. In addition, it should be traceable in the backend when a status change occurred and who triggered it.

Status management should be transparent and logically structured for both dispatching and drivers.

| Status | Meaning | Permission or changed by |
|---|---|---|
| Draft | Order was created in the backend, but is not yet visible in the marketplace. | Admins |
| Published | Order is visible in the marketplace and can be accepted by service partners. | Admins |
| Accepted | Order was accepted by a service partner in the frontend. | Service partners |
| Assigned | Order was directly assigned to a service partner by an admin. | Admins |
| Performed | The tour was completed operationally or logistically. Invoice, receipts, or evidence may still be open. | Service partners |
| Under review | Invoice, receipts, or evidence were uploaded and must be checked by Autheon. | Admins / drivers |
| Completed | Order was fully checked, documented, and completed for billing purposes. | Admins |
| Cancelled | Order was cancelled and will not be performed. | Admins / drivers |
| Special case | Order cannot be continued normally because a problem exists. | Admins / drivers |

### 2.1 Status in Detail

#### Draft

The order is created in the backend, but has not yet been published. In this status, the admin can continue to edit, complete, or delete the order. The order is not visible to service partners in the frontend.

#### Published

The order was published in the marketplace by an admin. From this point onward, it is visible to authorized service partners and can be accepted.

Important: As soon as an order has been accepted or assigned, it must no longer be bookable by other service partners.

#### Accepted

The order was independently accepted by a service partner in the marketplace. This status is important in order to later evaluate which orders were actually awarded through the marketplace and which orders had to be actively assigned by dispatching. After acceptance, the full order relevant information should be shown to the service partner.

#### Assigned

The order was not freely accepted through the marketplace, but was directly assigned by an admin to a specific service partner.

#### Performed

The service partner reports the tour as performed after completion. This means the vehicle transfer was completed operationally.

However, this status does not yet mean that the order is fully finished. The following may still be missing:

* Invoice.
* Fuel receipts.
* Expense receipts.
* Delivery documents.
* Drop off receipts.
* Waiting time proof.
* Other evidence.

Therefore, `Performed` should be clearly separated from `Completed`.

#### Under Review

This status is useful as soon as the service partner has uploaded the invoice, receipts, or evidence and these must be checked by Autheon.

Alternatively, this status can be set automatically as soon as a relevant document has been uploaded.

Example flow:

```text
Service partner reports tour as performed
↓
Service partner uploads invoice and receipts
↓
Status is set to Under Review
↓
Admin checks documents
↓
Admin sets status to Completed or requests correction
```

#### Completed

The order is fully finished. This means:

* Tour was performed.
* Necessary documents are available.
* Invoice was checked.
* Receipts or evidence were accepted.
* Process is internally completed for billing purposes.

This status should only be set by admins.

#### Cancelled

The order was cancelled and will not be performed. It is important that the backend continues to show who cancelled:

* Cancellation by service partner.
* Cancellation by admin / dispatching.
* Cancellation by ordering party.

In addition, a cancellation reason should be documentable.

Examples:

* Ordering party withdrew order.
* Vehicle no longer available.
* Service partner cancels accepted order.
* Tour data incorrect.
* Appointment no longer possible.
* Other.

#### Special Case

This status should be provided for cases in which the tour cannot be continued normally, but should not immediately be finally cancelled.

Possible examples:

* Vehicle not on site.
* Vehicle not roadworthy.
* Vehicle deregistered.
* Red license plates required.
* Contact person not reachable.
* Wrong address.
* Waiting time.
* Empty trip / deadhead trip.
* Damage to the vehicle.
* Missing documents.
* Other clarification required.

The service partner should be able to trigger such cases using a function such as `Report problem`. The admin then decides whether the order will be continued, cancelled, adjusted, or billed separately.

### 2.2 Additional Requirements

For every status change, the system should automatically document:

* Previous status.
* New status.
* Date and time.
* Triggering user.
* Optional comment.
* Uploaded evidence, if applicable.

It should also be checked whether notifications are triggered automatically for certain status changes.

Examples:

* Order was accepted: admin receives notice.
* Order was cancelled: admin receives notice.
* Invoice was uploaded: admin receives notice.
* Document was rejected: service partner receives notice.
* Order was completed: status in the frontend is updated.

# C. General Logic

## 1. Cancellation and Problem Case Logic

The current return logic should be simplified. Instead of a time dependent return, Version 1 should have clear cancellation and problem case logic.

As soon as a service partner has accepted an order, this order is considered bindingly booked. A later return in the classic sense should not be provided. Instead, the service partner should receive two main options in the tour detail view through the `Report problem` function:

* Cancel order.
* Report order as not performable.

### Example Flow: Cancellation by Service Partner

```text
Service partner is in My Tours
↓
Service partner opens the affected tour
↓
Service partner selects Report problem
↓
Service partner selects Cancel order
↓
System shows a clear confirmation dialog
↓
Service partner confirms through Slide to confirm
↓
Order is shown in the backend as cancelled by service partner
↓
Admin receives a notification
↓
Order can be republished, adjusted, or finally cancelled by the admin
```

The confirmation dialog should be clearly worded, for example:

> You are about to cancel this order bindingly. Please note that cancellation after acceptance of the order may trigger costs or further consequences according to the applicable terms. Please check your decision carefully.

In addition, the applicable terms should be referenced, for example:

> The current service partner terms / general terms and conditions apply.

The general terms and conditions or service partner terms should be linked at this point.

### Example Flow: Report Order as Not Performable

This option is used when the service partner cannot properly perform the order because an objective problem exists.

Examples:

* Vehicle not on site.
* Vehicle not roadworthy.
* Vehicle deregistered.
* Wrong address.
* Vehicle data does not match.
* Other special case.

Example flow:

```text
Service partner opens the tour
↓
Service partner selects Report problem
↓
Service partner selects Order not performable
↓
Service partner must select a reason
↓
Service partner can add a description
↓
Service partner can upload evidence, for example photos, waiting time proof, drop off receipt, delivery document, or other documents
↓
Backend receives a report
↓
Status is set to Special case
↓
Admin decides on the next steps
```

Important: In this case, the order should not be automatically finally cancelled. It should first move into a special status so that Autheon can check whether the tour must be adjusted, rescheduled, billed, or cancelled.

The cancellation and problem case logic should be linked to status management:

| Action by service partner | Result in the system |
|---|---|
| Cancel order | Status: Cancelled by service partner or main status Cancelled with cancellation type |
| Report order as not performable | Status: Special case |
| Report problem with evidence | Status: Special case, documents become visible in the backend |
| Admin accepts cancellation | Order remains cancelled |
| Admin republishes tour | Status back to Published |
| Admin clarifies problem and tour continues | Status back to Accepted |
| Admin closes special case | Status depending on result: Completed or Cancelled |

### Important Addition: Cancellation Reason

For every cancellation, a reason should be documented.

Possible selection fields:

* Service partner unavailable.
* Vehicle not available.
* Ordering party cancelled the order.
* Appointment no longer possible.
* Incorrect order data.
* Vehicle not roadworthy.
* Other reason.

In addition, a free text field should be available:

> Please explain the reason for the cancellation.

## 2. Notifications for Backend and Frontend

The system should make relevant events visible to admins and service partners. A distinction should be made between backend notifications, frontend notifications, and optional push notifications.

In the admin backend, the following events in particular should be displayed:

* Order was accepted by service partner.
* Order was cancelled by service partner.
* Order was reported as not performable.
* Invoice was uploaded.
* Receipt or evidence was uploaded.
* Invoice, receipt, or evidence was uploaded again.
* Tour was reported as performed.
* Master data change was requested.

Especially critical events such as cancellation, problem case, or not performable order should be clearly highlighted.

In the frontend, service partners should be informed about relevant changes to their tours. These include in particular:

* Order was cancelled by Autheon.
* Invoice was accepted or rejected.
* Receipt or evidence was accepted or rejected.
* Problem case was processed by admin.
* New message in the Infopoint.

If an invoice, receipt, or proof is rejected, the admin should be able to enter a short reason. This reason should be shown to the service partner in the frontend.

Optionally, push notifications should be possible for selected important events. For Version 1, however, push notifications should deliberately be kept lean.

## 3. Optimization of the Info Menu Item

The existing `Info` menu item should be renamed to `Infopoint`. The goal of the Infopoint is to provide service partners in the frontend with a central area for important information, general documents, messages, and action instructions.

In Version 1, the Infopoint should be divided into at least two areas:

* General documents.
* New messages.

### 3.1 Renaming the Info Menu Field

The `Info` menu item should be changed to `Infopoint`.

### 3.2 Sorting by Tab or Segmented Selection

The content in the Infopoint should be clearly organized. Instead of a classic slider, a clear tab structure or segmented selection would be useful from a UI and UX perspective.

This allows the user to switch quickly between the areas. It is important that the area remains clear and intuitive to use on smartphones.

### 3.3 New Selection: General Documents

In the General Documents area, service partners should be able to view permanently available documents. These documents should be uploaded and managed by admins in the backend. The number of documents should not be fixed or limited.

Examples of general documents:

* Action instructions for vehicle pickup.
* Action instructions for vehicle drop off.
* Behavior in case of damage.
* Behavior in case of waiting time.
* Notes on fuel receipts.
* Notes on invoicing.
* Service partner terms / general terms and conditions.
* Data protection information.
* Process description for cancellation / problem case.
* Contact information for emergencies.

The documents should preferably be uploadable as PDF. In the frontend, the documents should be displayed clearly, for example with:

* Document title.
* Short description.
* Upload or update date.
* Download / view function.

In the backend, an admin should be able to:

* Upload documents.
* Rename them.
* Replace them.
* Delete or hide them.

### 3.4 New Selection: New Messages

In the New Messages area, admins should be able to publish short term information to service partners. This function should serve as a simple communication channel without every piece of information having to be communicated by email or telephone.

In the admin backend, a simple input form should be provided with:

* Subject.
* Message text.
* Publication date.

Example message:

> ATTENTION PUBLIC TRANSPORT STRIKE FROM 01.01.2027
>
> Dear service partners,
>
> On Monday, 01.01.2027, there may be isolated warning strikes in the area of public transport. Please inform yourself in good time whether your area in Germany is affected.
>
> Thank you for your attention and safe travels at all times.

In the frontend, messages should initially be displayed compactly, for example as a list with:

* Subject.
* Date.
* Short preview.
* Status: new or read.

When clicked, the full message should open. If new messages are available, the service partner should be able to recognize this in the frontend.

Examples:

* Small badge on the Infopoint menu item.
* New marking on unread messages.
* Sorting of the newest messages at the top.

For particularly important messages, an additional push notification can be provided, provided that push is technically implemented.

# D. Open Points / Questions / Notes

* Can the master data of the service partners be changed by admins?
* Is the frontend also compatible with tablets, for example iPad?
* Is the audit log available in German or does it have to be in English?
* The program should not be named `AUTHEON`. A specific name will still be provided.
* Add an icon, for example, to the return window or Report problem function.
