# PWA - Fluxo de Qualidade (Workbox + PWABuilder + Lighthouse)

Este projeto ja esta com Service Worker usando Workbox em `sw.js` (com fallback automatico caso o CDN da Workbox fique indisponivel).

## 1) Workbox (cache e offline)

- Estrategia para paginas: `NetworkFirst` (evita pagina antiga e funciona offline em queda de rede).
- Estrategia para CSS/JS/manifest: `StaleWhileRevalidate` (abre rapido e atualiza em segundo plano).
- Estrategia para imagens: `CacheFirst` com expiracao.
- Fallback offline: `offline.html` para navegacao sem internet.

## 2) Auditoria Lighthouse (mobile)

No PowerShell, dentro do projeto:

```powershell
# subir servidor local (escolha uma opcao)
python -m http.server 4173
# ou
npx serve . -l 4173
```

Em outro terminal:

```powershell
npx lighthouse http://localhost:4173/index.html --only-categories=pwa,performance,accessibility,best-practices --preset=desktop --output=html --output-path=./lighthouse-index.html
npx lighthouse http://localhost:4173/trainer.html --only-categories=pwa,performance,accessibility,best-practices --preset=desktop --output=html --output-path=./lighthouse-trainer.html
```

Observacao:
- Para simulacao mobile mais estrita, rode no Chrome DevTools (device toolbar) e compare resultados.

## 3) PWABuilder (empacotar para loja)

1. Publique o site em HTTPS.
2. Acesse [https://www.pwabuilder.com](https://www.pwabuilder.com).
3. Informe a URL publicada.
4. Revise os checks (manifest, service worker, icones).
5. Gere pacote Android (APK/AAB) e siga o assistente da Play Console.

## 4) Checklist rapido antes de publicar

- Manifest com icones 192/512 e maskable.
- Service worker ativo e atualizando sem travar (ja configurado com `SKIP_WAITING`).
- Telas sem scroll horizontal no mobile.
- Alvos de toque com minimo de 44px.
- Offline page carregando corretamente sem rede.
