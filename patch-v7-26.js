/* v0.7.26 — Pin only the final Gesamt · Gesamt label and restore people-bar width. */
(() => {
  const VERSION = "0.7.26";

  const style = document.createElement("style");
  style.textContent = `
    /* The right-hand total column scrolls normally again. Only the label cell of
       the very last footer row (Gesamt · Gesamt) is kept horizontally visible. */
    #raceClassMatrix.v724-unified-matrix .v75-head-total,
    #raceClassMatrix.v724-unified-matrix .v75-sum-total,
    #raceClassMatrix.v724-unified-matrix tfoot .v75-side-total{
      position:static!important;
      right:auto!important;
      left:auto!important;
      z-index:auto!important;
      box-shadow:none!important;
    }
    #raceClassMatrix.v724-unified-matrix .v75-head-total{background:#151d28!important}
    #raceClassMatrix.v724-unified-matrix .v75-sum-total{background:#111821!important}
    #raceClassMatrix.v724-unified-matrix tfoot .v75-side-total{background:#182230!important}

    #raceClassMatrix.v724-unified-matrix tfoot tr:last-child .v75-footer-label{
      position:sticky!important;
      left:0!important;
      right:auto!important;
      z-index:6!important;
      background:#151d28!important;
      box-shadow:2px 0 0 #4b5c72!important;
    }

    /* Restore the older, wider progress-bar area in the Völker overview. The
       name column returns to its previous compact width; the metrics stay intact. */
    #v67PeopleCoverage .v51-row{
      grid-template-columns:minmax(92px,145px) minmax(110px,1fr) minmax(210px,auto)!important;
      gap:10px!important;
    }

    @media(max-width:640px){
      #v67PeopleCoverage .v51-row{
        grid-template-columns:minmax(72px,96px) minmax(70px,1fr) minmax(112px,auto)!important;
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
