# Distance estimation — API contract, failure handling, and user communication

Status: proposed (prototype behaviour implemented, production behaviour to be built)
Scope: admin console (order creation + order detail), driver PWA (marketplace, job detail, confirmations), backend jobs module.

## 1. Why this exists

The distance of a transport is not entered by hand in the general case — it is
calculated from the pickup and delivery addresses. In the prototype there is no
network, so the value was simply absent for any route outside a small hard-coded
table, and the UI rendered an empty / "not yet calculated" placeholder — in one
path it even wrote the literal string `null` into the distance field of the new
order form.

Two separate problems follow from that, and they need two separate answers:

- **Prototype (demo surface):** a demo must never show an empty or `null`
  distance. It shows a plausible example value, explicitly marked as an estimate.
- **Production (real system):** the distance comes from a routing provider over
  the network. That call can be slow, fail, be rate-limited, or return no route.
  Each of those states must be handled and communicated to the user, not
  silently collapsed into an empty field.

## 2. Prototype behaviour (implemented)

`store.js`:

- `DISTANCE_TABLE` — known postal-code pairs, exact values, unchanged.
- `approximateDistanceKm(plzA, plzB)` — deterministic postal-code approximation
  used when the pair is not in the table. Same pair always yields the same km, so
  demo screens are stable.
- `estimateDistanceKm(job)` — table first, then approximation. Returns `null`
  **only** when a postal code is missing.
- `estimateDistanceDetail(job)` → `{ km, source }` with
  `source ∈ { "table", "approximation", "unavailable" }`.
- `resolveDisplayDistance(jobOrId)` → same shape plus `source: "stored"` when the
  job already carries a `distanceKm`.

UI rule, both surfaces:

| State                              | Admin console                                  | Driver PWA          |
| ---------------------------------- | ---------------------------------------------- | ------------------- |
| Stored value / known route (exact) | `585 km`                                       | `585 km`            |
| Approximated from postal codes     | `~ 585 km` + "Estimated from postal codes"     | `~ 585 km`          |
| No postal-code pair                | "Distance not yet calculated"                  | same                |

i18n keys: `distanceApprox`, `distanceEstimatedLabel`, `distanceNotYetCalculated`
(EN + DE). No screen renders a bare `job.distanceKm`; every surface goes through
`displayDistance()` (admin) or `jobDistanceText()` / `jobDistanceKm()` (driver).

## 3. Production contract

### 3.1 Ownership

Distance is **server-owned**. The backend calls the routing provider and persists
the result on the job. Clients never call the provider directly (API key
exposure, no per-client rate budget, no consistency between admin and driver).

### 3.2 Persisted fields (jobs module)

| Field                 | Type          | Meaning                                                       |
| --------------------- | ------------- | ------------------------------------------------------------- |
| `distanceKm`          | int, nullable | Last successfully calculated distance. Null = never obtained.  |
| `distanceSource`      | enum          | `routing_provider` \| `manual` \| `approximation`              |
| `distanceCalculatedAt`| timestamptz   | When the value was produced. Null when `distanceKm` is null.   |
| `distanceStatus`      | enum          | `ok` \| `pending` \| `failed` \| `no_route` \| `manual`        |

A manually entered distance (`manual`) is never overwritten by a provider result;
recalculation is an explicit admin action.

### 3.3 Calculation triggers

- On order create and on any change to a pickup/delivery address → enqueue a
  calculation job (async, not inline in the request path).
- Explicit admin action "Recalculate distance" → same job, higher priority.
- Never on read. A GET must not trigger an outbound provider call.

### 3.4 Provider call rules

Per `rules/api-design.md` and `rules/performance.md`:

- Explicit timeout (recommended 5 s), retry with exponential backoff on 429/5xx,
  max 3 attempts, then mark `failed`.
- Cache by normalized address pair — identical pairs must not re-call the
  provider. Distances between two fixed addresses do not change meaningfully.
- Log every call with correlation ID, job ID, provider, latency, and outcome.
  Never log full addresses beyond what is needed.
- A provider outage must never block order creation, publication, or acceptance.
  The order is valid without a distance; the distance is enrichment.

### 3.5 API surface

`GET /jobs/:id` and job list responses return:

```json
{
  "distanceKm": 585,
  "distanceSource": "routing_provider",
  "distanceStatus": "ok",
  "distanceCalculatedAt": "2026-08-06T09:12:44.000Z"
}
```

`POST /jobs/:id/distance/recalculate` → `202 Accepted` (async job enqueued).
Errors follow the standard error envelope; the client renders the status, never
a raw provider message.

## 4. Failure modes and what the user sees

| Case | `distanceStatus` | Admin console | Driver PWA |
| --- | --- | --- | --- |
| Calculation queued / in flight | `pending` | "Distance is being calculated…" (skeleton, not a spinner in a table cell) | Distance line hidden, no empty placeholder |
| Provider returned no route (islands, bad address) | `no_route` | "No route found for these addresses — check pickup and delivery, or enter the distance manually." + manual input focused | "Distance not available" |
| Provider error / timeout / rate limit, retries exhausted | `failed` | "Distance could not be calculated automatically. Retry, or enter it manually." + **Retry** button + manual input | "Distance not available" |
| Addresses incomplete (no postal code) | `failed` (reason: input) | "Enter pickup and delivery postal codes before estimating distance." (existing copy) | "Distance not available" |
| Manual value entered | `manual` | `585 km` + "Entered manually" | `585 km` |

Rules that hold in every case:

- **Never render an empty field, `null`, `NaN`, `undefined`, or `0 km`** as a
  distance. If there is no value, there is a sentence explaining why.
- **The driver never sees an internal error.** The driver-facing state is binary:
  a distance, or "Distance not available". Retry/diagnostics belong to the admin.
- All user-facing copy is German in production (per `rules/observability.md`);
  the English strings above are the source text for translation.
- The failure is visible to operations, not only to the user: a `failed`
  distance must be reported to Sentry with the job ID and correlation ID, and a
  sustained failure rate on the provider is an alertable condition.
- A missing distance must not block any workflow — publishing, accepting,
  performing, and invoicing all remain possible without it.

## 5. Open questions for the client

1. Which routing provider (Google Distance Matrix, HERE, OSRM self-hosted)?
   This decides cost model, rate limits, and whether caching is contractually
   required.
2. Is the distance contractually relevant (driver payout, invoicing)? If yes, an
   approximation must never be presented as a calculated value anywhere in
   production, and manual overrides need an audit-log entry.
3. Should the driver see toll-aware / truck-profile distance, or straight road
   distance? Different provider profiles, different prices.
