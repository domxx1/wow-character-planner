/* v0.7.28 — Shift all dashboard bars slightly to the right. */
(() => {
  const VERSION = "0.7.28";

  const style = document.createElement("style");
  style.textContent = `
    /* Keep all overview bar layouts aligned. A slightly wider label column moves
       the progress bars to the right without changing their height or metrics. */
    #dashboard .v51-row{
      grid-template-columns:minmax(108px,160px) minmax(110px,1fr) minmax(210px,auto)!important;
      gap:10px!important;
    }

    @media(max-width:640px){
      #dashboard .v51-row{
        grid-template-columns:minmax(82px,106px) minmax(70px,1fr) minmax(112px,auto)!important;
        gap:6px!important;
      }
    }
  `;
  document.head.appendChild(style);

  const brand = document.querySelector(".brand-sub");
  if (brand) {
    const forever = typeof window.wowCharacterPlannerGameMode === "function" && window.wowCharacterPlannerGameMode() === "forever";
    brand.textContent = forever ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
  }
})();
