(function registerPWA() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;

  window.addEventListener("load", async () => {
    const hadController = !!navigator.serviceWorker.controller;
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });

      const activateWaitingWorker = () => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      };

      // If a new worker is already waiting, activate it immediately
      activateWaitingWorker();

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            activateWaitingWorker();
          }
        });
      });

      // Reload only when updating an existing controlled app
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || window.__pwaReloading) return;
        window.__pwaReloading = true;
        window.location.reload();
      });

      // Re-check updates periodically while app is open.
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      });
    } catch (err) {
      console.warn("Falha ao registrar Service Worker:", err);
    }
  });
})();
