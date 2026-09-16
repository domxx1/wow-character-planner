/* v0.7.10 compatibility shim — navigation is superseded by v0.7.11. */
(() => {
  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = "WoW Retail · 12.1 · 0.7.10";
})();
