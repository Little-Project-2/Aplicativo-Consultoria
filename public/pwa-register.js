(function registerPWA() {
  if (!("serviceWorker" in navigator)) return;

  const isLocalDevHost = ["localhost", "127.0.0.1", "::1"].includes(String(location.hostname || "").toLowerCase());
  const isSecureContext = location.protocol === "https:";

  // Em ambiente local/de desenvolvimento, removemos SWs ativos para evitar travamentos no hard refresh.
  if (isLocalDevHost || !isSecureContext) {
    window.addEventListener("load", async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (!registrations.length) return;
        await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
      } catch (err) {
        console.warn("Falha ao limpar Service Workers locais:", err);
      }
    });
    return;
  }

  window.addEventListener("load", async () => {
    const hadController = !!navigator.serviceWorker.controller;
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });

      const showUpdatingIndicator = () => {
        if (window.__pwaUpdatingHintShown) return;
        window.__pwaUpdatingHintShown = true;
        const hint = document.createElement("div");
        hint.id = "pwa-updating-hint";
        hint.textContent = "Atualizando aplicação...";
        hint.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;padding:10px 14px;border-radius:999px;background:rgba(15,23,42,0.92);color:#fff;font:600 12px Inter,system-ui,sans-serif;box-shadow:0 8px 22px rgba(0,0,0,0.28);";
        document.body.appendChild(hint);
      };

      const activateWaitingWorker = () => {
        if (registration.waiting) {
          showUpdatingIndicator();
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      };

      registration.update().catch(() => {});
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

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || window.__pwaReloading) return;
        window.__pwaReloading = true;
        showUpdatingIndicator();
        window.location.reload();
      });

      setInterval(() => {
        registration.update().catch(() => {});
      }, 30 * 60 * 1000);

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
