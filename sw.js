const CACHE='castro-alertas-v18';
const ASSETS=['./','./index.html','./painel-barbeiro.html','./style.css','./client.js','./admin.js','./logo-castro.webp','./manifest.webmanifest','./manifest-barbeiro.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
  // HTML sempre consulta a versão publicada, evitando links antigos no app instalado.
  if(event.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/painel-barbeiro.html')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(res=>res).catch(()=>caches.match(event.request)));return;
  }
  event.respondWith((async()=>{try{const res=await fetch(event.request);if(res.ok){const cache=await caches.open(CACHE);cache.put(event.request,res.clone())}return res}catch(_){return await caches.match(event.request)||await caches.match('./index.html')||Response.error()}})());
});
self.addEventListener('push',event=>{
 let info={};try{info=event.data?.json()||{}}catch(_){try{info={body:event.data?.text()||''}}catch(_){}}
 const urgent=String(info.title||'').toLowerCase().includes('agendamento');
 const notification={body:info.body||'Você tem uma atualização.',icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',
   tag:'castro-'+Date.now(),renotify:true,vibrate:urgent?[220,100,220]:[150],
   data:{url:info.url||'./painel-barbeiro.html',receivedAt:Date.now()},timestamp:Date.now()};
 event.waitUntil(self.registration.showNotification(info.title||'Barbearia Castro',notification));
});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=new URL(event.notification.data?.url||'./index.html',self.registration.scope).href;event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async ws=>{for(const c of ws)if(c.url.startsWith(self.registration.scope)){await c.focus();await c.navigate(target);return}return clients.openWindow(target)}))});