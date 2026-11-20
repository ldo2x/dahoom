/* ===== اللوبي العام: الجلسات المفتوحة =====
   صاحب الجلسة ينشر غرفته (الكود واللعبة وعدد اللاعبين) بـ Firestore كل شوي، واللاعبين يشوفون قائمة الجلسات ويدخلونها.
   نستخدم REST مباشرة (بدون مكتبة) مثل telemetry.js — الجلسة اللي ما تحدّثت من دقيقتين ما تطلع.
   لو Firebase مو متاح: القائمة تطلع فاضية والدخول بالكود يشتغل عادي.
*/
window.DahoomLobby = (function(){
  const CFG = () => window.DAHOOM_FB || {};
  const ok = () => !!(CFG().apiKey && CFG().projectId);
  const base = () => `https://firestore.googleapis.com/v1/projects/${CFG().projectId}/databases/(default)/documents`;
  const FRESH_MS = 120000, BEAT_MS = 40000;
  const GAME_AR = { alf:'ألف نقطة', khaliya:'خلية الحروف', rasm:'ارسم وخمّن', hawamir:'هوامير', sadq:'ما أصدقك' };

  // ---------- جهة صاحب الجلسة ----------
  let last=null, beatT=null, pushT=null, closed=false;
  const str = v => ({ stringValue:String(v==null?'':v) });
  const int = v => ({ integerValue:String(Math.max(0, Math.min(20, Math.round(+v||0)))) });
  function body(r){
    return { fields:{ code:str(String(r.code).slice(0,4)), game:str((r.game||'').slice(0,12)), gameName:str((GAME_AR[r.game]||'').slice(0,24)), host:str((r.host||'').slice(0,24)),
      hostAv:str((r.hostAv||'').slice(0,24)), players:int(r.players), max:int(r.max||8), phase:str((r.phase||'lobby').slice(0,12)), pub:{ booleanValue:!!r.pub },
      updatedAt:{ timestampValue:new Date().toISOString() }, v:{ integerValue:'1' } } };
  }
  async function write(r){
    if(!ok() || !r || !r.code) return;
    try{ await fetch(`${base()}/rooms/${encodeURIComponent(r.code)}?key=${CFG().apiKey}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body(r)), keepalive:true }); }catch(e){}
  }
  // نستدعيها كل ما تغيّر شي (مجمّعة) — والنبض كل 40 ثانية يبقيها بالقائمة
  function publish(r){
    last=Object.assign({}, last||{}, r); closed=false;
    clearTimeout(pushT); pushT=setTimeout(()=>write(last), 800);
    if(!beatT) beatT=setInterval(()=>{ if(last && !closed) write(last); }, BEAT_MS);
  }
  function close(){
    if(!last) return; closed=true; clearInterval(beatT); beatT=null; clearTimeout(pushT);
    write(Object.assign({}, last, { pub:false, phase:'closed', players:0 }));
  }
  window.addEventListener('pagehide', ()=>{ if(last && last.pub && !closed) write(Object.assign({}, last, { pub:false, phase:'closed' })); });

  // ---------- جهة اللاعبين: قائمة الجلسات ----------
  const val = f => f==null ? null : 'stringValue' in f ? f.stringValue : 'integerValue' in f ? +f.integerValue : 'booleanValue' in f ? f.booleanValue : 'timestampValue' in f ? Date.parse(f.timestampValue) : null;
  async function list(){
    if(!ok()) return [];
    try{
      const since=new Date(Date.now()-FRESH_MS).toISOString();
      const q={ structuredQuery:{ from:[{ collectionId:'rooms' }], where:{ fieldFilter:{ field:{ fieldPath:'updatedAt' }, op:'GREATER_THAN', value:{ timestampValue:since } } },
        orderBy:[{ field:{ fieldPath:'updatedAt' }, direction:'DESCENDING' }], limit:40 } };
      const res=await fetch(`${base()}:runQuery?key=${CFG().apiKey}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(q) });
      if(!res.ok) return [];
      const rows=await res.json();
      return rows.filter(r=>r.document).map(r=>{ const f=r.document.fields||{}; const o={}; Object.keys(f).forEach(k=>o[k]=val(f[k])); return o; })
        .filter(o=>o.pub && o.code && o.phase!=='closed' && o.players<o.max);
    }catch(e){ return []; }
  }
  return { publish, close, list, GAME_AR, get enabled(){ return ok(); } };
})();
