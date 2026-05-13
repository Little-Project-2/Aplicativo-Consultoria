import { registerSW } from 'virtual:pwa-register';

declare global {
  interface Window {
    __CONSULTORIA_UPDATE_SW__?: () => Promise<void>;
  }
}

function showUpdatingIndicator() {
  if (document.getElementById('pwa-updating-hint')) return;

  const hint = document.createElement('div');
  hint.id = 'pwa-updating-hint';
  hint.textContent = 'Atualizando aplicação...';
  hint.style.cssText =
    'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;padding:10px 14px;border-radius:999px;background:rgba(15,23,42,0.92);color:#fff;font:600 12px Inter,system-ui,sans-serif;box-shadow:0 8px 22px rgba(0,0,0,0.28);';
  document.body.appendChild(hint);
}

export function registerConsultoriaPwa() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdatingIndicator();
      updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      window.setInterval(
        () => {
          registration?.update().catch(() => undefined);
        },
        30 * 60 * 1000
      );
    }
  });

  window.__CONSULTORIA_UPDATE_SW__ = () => updateSW(true);
}
