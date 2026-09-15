document.getElementById("refreshApp")?.addEventListener("click", async () => {
  const button = document.getElementById("refreshApp");
  const status = document.getElementById("status");
  button.disabled = true;
  status.textContent = "Aktualisierung wird vorbereitet …";
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith("wow-charplan-")).map(key => caches.delete(key)));
    }
    status.textContent = "Fertig. Deine Charakterdaten wurden nicht gelöscht. Öffne jetzt den Charakterplaner neu.";
    document.getElementById("openApp")?.classList.remove("hidden");
  } catch (error) {
    status.textContent = "Die Aktualisierung konnte nicht vollständig durchgeführt werden. Bitte versuche es erneut.";
    button.disabled = false;
  }
});