const CACHE_NAME = "memory-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/memory-core.js",
  "./js/datasets.js",
  "./js/tts.js",
  "./data/schema.json",
  "./data/level1_voyelles.json",
  "./data/level2_alphabet.json",
  "./data/level3_syllabes_simples.json",
  "./data/level4_syllabes_complexes.json",
  "./assets/images/assiette.svg",
  "./assets/images/couteau.svg",
  "./assets/images/cuillere.svg",
  "./assets/images/fourchette.svg",
  "./assets/images/pomme.svg",
  "./assets/images/verre.svg",
  "./favicon/site.webmanifest",
  "./favicon/favicon-32x32.png",
  "./favicon/favicon-16x16.png",
  "./favicon/apple-touch-icon.png",
  "./favicon/android-chrome-192x192.png",
  "./favicon/android-chrome-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if(request.method !== "GET"){
    event.respondWith(fetch(request));
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if(!isSameOrigin){
    return;
  }

  if(request.mode === "navigate"){
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put("./", copy))
          );
          return response;
        })
        .catch(() => caches.match(request).then((match) => match || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if(cached){
        event.waitUntil(
          fetch(request).then((response) => {
            if(response && response.ok){
              return caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
          }).catch(() => {})
        );
        return cached;
      }

      return fetch(request).then((response) => {
        if(response && response.ok){
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          );
        }
        return response;
      });
    })
  );
});
