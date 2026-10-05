self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (key) { return key.indexOf("pyl-preview-pr30-") === 0; }).map(function (key) { return caches.delete(key); }));
    await new Promise(function (resolve) {
      var req = indexedDB.deleteDatabase("pyl-preview-pr30");
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { resolve(); };
      req.onblocked = function () { resolve(); };
    });
    await self.registration.unregister();
  })());
});
