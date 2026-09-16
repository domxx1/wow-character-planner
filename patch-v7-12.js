/* v0.7.12 compatibility shim — navigation is reset and superseded by v0.7.13. */
(() => {
  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = "WoW Retail · 12.1 · 0.7.12";
})();
