/**
 * WWLO PRM Service Worker — Version-aware with aggressive cache busting.
 *
 * Strategy:
 *   - Navigation requests (HTML): Network-first, fallback to cache
 *   - Static assets (/_expo/static/*): Cache-first (content-hashed, immutable)
 *   - API / version.json: Network-only (never cached)
 *   - Everything else: Stale-while-revalidate
 *
 * On install, skipWaiting() activates immediately.
 * On activate, old caches are purged and clients.claim() takes control.
 * Clients are notified of updates via postMessage.
 */

const CACHE_VERSION = 'wwlo-prm-v3';

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Don't pre-cache — let runtime caching handle it.
  // This avoids stale pre-cached assets when deploying new versions.
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_VERSION) {
            console.log('[SW] Purging old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      // Take control of all open clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that a new SW has taken over
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ── Handle Web Share Target POST ─────────────────────────────────────────
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const title = formData.get('title') || '';
        const text  = formData.get('text')  || '';
        const sharedUrl = formData.get('url') || '';

        const bodyParts = [];
        if (text)      bodyParts.push(text);
        if (sharedUrl) bodyParts.push(sharedUrl);
        const body = bodyParts.join('\n\n');

        const dest = new URL('/modal', url.origin);
        if (title) dest.searchParams.set('prefillTitle', title);
        if (body)  dest.searchParams.set('prefillBody', body);

        return Response.redirect(dest.toString(), 303);
      })()
    );
    return;
  }

  // Only handle GET requests from our origin
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // ── Never cache version endpoint or API routes ───────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ── Navigation requests: network-first ───────────────────────────────────
  // This ensures users always get the latest HTML shell with fresh JS bundle refs.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback — serve cached HTML
          return caches.match(event.request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // ── Immutable static assets: cache-first ─────────────────────────────────
  // Expo content-hashes these, so once cached they're valid forever.
  if (url.pathname.startsWith('/_expo/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // ── Everything else: stale-while-revalidate ──────────────────────────────
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
