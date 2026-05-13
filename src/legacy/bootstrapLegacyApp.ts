let legacyScriptPromise: Promise<void> | null = null;

declare global {
  interface Window {
    __CONSULTORIA_LEGACY_SCRIPT_LOADED__?: boolean;
    __CONSULTORIA_LEGACY_BOOTED__?: boolean;
  }
}

export function loadLegacyAppScript() {
  if (window.__CONSULTORIA_LEGACY_SCRIPT_LOADED__) {
    return Promise.resolve();
  }

  if (legacyScriptPromise) {
    return legacyScriptPromise;
  }

  legacyScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-legacy-app="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Legacy script failed to load.')), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.src = '/script.js';
    script.defer = true;
    script.dataset.legacyApp = 'true';
    script.addEventListener(
      'load',
      () => {
        window.__CONSULTORIA_LEGACY_SCRIPT_LOADED__ = true;
        resolve();
      },
      { once: true }
    );
    script.addEventListener('error', () => reject(new Error('Legacy script failed to load.')), {
      once: true
    });

    document.body.appendChild(script);
  });

  return legacyScriptPromise;
}
