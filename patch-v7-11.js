/* v0.7.11 compatibility shim — navigation is fully superseded by v0.7.12. */
(() => {
  /* Intentionally empty. The old History API controller must not remain active
     together with the newer controller, otherwise multiple popstate handlers
     can consume the same Android Back action. */
})();
