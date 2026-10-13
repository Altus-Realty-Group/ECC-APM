export {};
declare global {
  interface Window { __ECC_NET_CALLS?: any[]; __ECC_TAP_INSTALLED?: boolean; }
}
(function install(){
  const url = new URL(location.href);
  if (url.searchParams.get('debug') !== '1') return;
  if (window.__ECC_TAP_INSTALLED) return;
  window.__ECC_TAP_INSTALLED = true;
  const calls: any[] = window.__ECC_NET_CALLS = [];

  // fetch tap
  const of = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const t0 = performance.now();
    try {
      const res = await of(...args);
      calls.push({ kind:'fetch', url:String(args[0]), status:res.status, ms:Math.round(performance.now()-t0) });
      return res;
    } catch (e:any) {
      calls.push({ kind:'fetch', url:String(args[0]), error:String(e?.message||e), ms:Math.round(performance.now()-t0) });
      throw e;
    }
  };

  // xhr tap
  const oOpen = XMLHttpRequest.prototype.open, oSend = XMLHttpRequest.prototype.send;
  (XMLHttpRequest.prototype as any).open = function(method:string,url:string){ (this as any).__ecc={method,url,t:performance.now()}; return oOpen.apply(this, arguments as any); };
  (XMLHttpRequest.prototype as any).send = function(){ const x=this as any; const m=x.__ecc||{}; x.addEventListener('loadend',()=>{ calls.push({ kind:'xhr', url:m.url, status:x.status, ms:Math.round(performance.now()-m.t) }); }); return oSend.apply(this, arguments as any); };

  // dump to /__audit on unload (dev)
  window.addEventListener('beforeunload', ()=>{
    try{ navigator.sendBeacon('/__audit?name=net_calls', new Blob([JSON.stringify({ route:location.pathname+location.search, calls, ts:new Date().toISOString() })], {type:'application/json'})); }catch{}
  });
})();