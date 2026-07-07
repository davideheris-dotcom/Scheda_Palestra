/* Scheda Palestra — service worker
   Strategia:
   - HTML (navigazioni): network-first → aggiornamenti automatici quando carichi
     un nuovo index.html sul repo; fallback alla cache quando sei offline.
   - Font Google (googleapis/gstatic): cache-first → scaricati una volta,
     poi serviti sempre dalla cache, anche offline.
   Non serve mai modificare questo file per aggiornare l'app. */

const CACHE = "scheda-v1";
const PRECACHE = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Navigazioni / documento: network-first, fallback cache
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Font Google: cache-first
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Tutto il resto: cache-first con fallback rete
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});
