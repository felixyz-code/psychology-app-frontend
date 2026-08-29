/**
 * PsiqueOS Service Worker — Subfase 16.3 PWA Performance Optimization
 *
 * Strategy:
 *   - CACHE_FIRST  → Static fonts & icons (Google Fonts, Material Icons)
 *   - STALE_WHILE_REVALIDATE → Application static assets (styles, scripts)
 *   - NETWORK_ONLY → All /api/* clinical data (never cache sensitive records)
 *
 * Note: Clinical session notes and patient data must NEVER be cached by the SW.
 * The offline draft persistence is handled exclusively via IndexedDB/localStorage
 * within the Angular application layer (session-note-form-dialog.component.ts).
 */

const CACHE_NAME = 'psiqueos-static-v1';
const FONTS_CACHE_NAME = 'psiqueos-fonts-v1';

/** Static assets cached on install for immediate availability */
const PRECACHE_URLS = ['/favicon.ico', '/manifest.webmanifest'];

/** Origins that serve fonts/icons — always use stale-while-revalidate */
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

// ─── Lifecycle: Install ──────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Lifecycle: Activate ─────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, FONTS_CACHE_NAME];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !currentCaches.includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch Interception ───────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NETWORK_ONLY: Never intercept API calls — clinical data must stay fresh
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    // For font/icon origins specifically, use stale-while-revalidate
    if (FONT_ORIGINS.some((origin) => request.url.startsWith(origin))) {
      event.respondWith(staleWhileRevalidate(request, FONTS_CACHE_NAME));
      return;
    }
    // All other cross-origin or API requests: pass through
    return;
  }

  // CACHE_FIRST: Static assets served from same origin
  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Angular routing — let index.html handle client-side navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Static assets: icons, manifest, fonts files
  if (
    url.pathname.match(/\.(ico|svg|webmanifest|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Stale-while-revalidate for JS/CSS bundles (hashed filenames from Angular build)
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }
});

// ─── Strategies ──────────────────────────────────────────────────────────────

/**
 * Cache-First: Return cached response if available, else fetch and cache.
 * Ideal for immutable assets (favicons, fonts with long TTL).
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Stale-While-Revalidate: Return cached response immediately while
 * fetching fresh version in background. Ideal for fonts and non-critical assets.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached ?? fetchPromise;
}
