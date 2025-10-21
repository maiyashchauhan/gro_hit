const CACHE = 'grohit-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Network-first for HTML, cache-first for others
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, resClone)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, resClone)).catch(()=>{});
        return res;
      }))
    );
  }
});

// Background sync for queued operations
self.addEventListener('sync', async (event) => {
  if (event.tag === 'grohit-sync') {
    event.waitUntil(handleSync());
  }
});

async function handleSync(){
  try{
    const db = await openDB();
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const all = await store.getAll();
    for(const item of all){
      // Simulate sending to server by delaying
      await new Promise(r => setTimeout(r, 200));
      await store.delete(item.id);
    }
    await tx.done;
  }catch(e){
    // noop for prototype
  }
}

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('grohit-db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains('queue')){
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
