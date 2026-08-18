// Prototype runtime config — store owns live state; admin can change at runtime.
window.AUTHEON_BRANDING_DEFAULTS = {
  appDisplayName: "Transport Portal",
};

// PROTOTYPE/DEMO-ONLY controls. Read through `store.getFeatureFlag()` like any
// other flag, so nothing needs to guess at hostnames or build modes.
//
// This file is loaded by the two prototype entry points ONLY — the framed client
// preview (`prototype/project/AUTHEON Prototype.html`) and the standalone driver
// PWA (`pwa/index.html`) — which is what scopes these controls to the prototype.
// Turning the whole set off before production is one edit here; there is no
// second place to remember.
//
// prototypeDemoControls — client-facing demonstration aids that preview a state
//   the in-memory prototype cannot reach on its own. They never call business
//   logic, never mutate state and are never a product requirement. Today:
//   the "already booked" conflict dialog beside the booking-success dialog,
//   which exists because the prototype has one driver identity and so cannot
//   naturally show two partners racing for the same order.
window.AUTHEON_FLAG_DEFAULTS = {
  prototypeDemoControls: true,
};
