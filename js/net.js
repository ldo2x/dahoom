/* ===== الجوالات — جهة الشاشة (المضيف) =====
   اتصال مباشر بين الشاشة والجوالات (WebRTC عن طريق PeerJS وسيرفره المجاني) — ما يحتاج سيرفر خاص.
   الشاشة تفتح غرفة بكود، وكل جوال يدخل الكود ويختار فريقه.
   اللعبة الشغالة تسجّل نفسها بـ DahoomNet.use({...}) عشان تجاوب الجوالات.
*/
window.DahoomNet = (function(){
  const D = window.Dahoom;
  const { $, $$, esc, ic, toast, modal, play } = D;
  const PUBLIC_URL = 'https://ldo2x.github.io/dahoom/';
  const PREFIX = 'dahoom-v2-';
  let peer=null, code=null, ready=false, tries=0;
  const conns=new Set();               // كل اتصال: conn.teamId
  let H = null;                        // معالجات اللعبة الحالية
  const pending=new Map();             // reqId -> {teamId, cb}
  let reqSeq=0, pushT=0, cidSeq=0;

  const genCode = () => Array.from({length:4},()=> 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*31)]).join('');
  const baseUrl = () => /^https?:/.test(location.protocol) && !/^(localhost|127\.|\[::1\])/.test(location.hostname) ? location.href.replace(/[^/]*([?#].*)?$/,'') : PUBLIC_URL;
  const joinUrl = () => baseUrl()+'remote.html?room='+code;

  function start(){
    if(peer || !window.Peer) return;
    code = sessionStorage.getItem('dahoom_room') || genCode();
    peer = new window.Peer(PREFIX+code, {debug:0});
    peer.on('open', ()=>{ ready=true; tries=0; sessionStorage.setItem('dahoom_room',code); refreshUI(); });
    peer.on('connection', c=>{
      c.cid='c'+(++cidSeq);
      c.on('open', ()=>{ conns.add(c); });
      c.on('data', d=>onMsg(c,d));
      c.on('close', ()=>{ conns.delete(c); refreshUI(); });
      c.on('error', ()=>{ conns.delete(c); refreshUI(); });
    });
    peer.on('disconnected', ()=>{ ready=false; refreshUI(); setTimeout(()=>{ try{ peer.reconnect(); }catch(e){} },1500); });
    peer.on('error', e=>{
      if(e.type==='unavailable-id'){ // الكود محجوز (غالبًا من تحديث الصفحة) — نعيد المحاولة ثم نغيّره
        peer.destroy(); peer=null; ready=false;
        if(++tries>=4){ sessionStorage.removeItem('dahoom_room'); tries=0; }
        setTimeout(start, 2000); return;
      }
      if(e.type==='network' || e.type==='server-error' || e.type==='socket-error'){ ready=false; refreshUI(); }
    });
  }

  // ---------- الرسائل ----------
  function onMsg(c, d){
    if(!d || typeof d!=='object') return;
    if(d.t==='hello'){
      const teams = H ? H.teams() : D.competitors();
      if(d.teamId && teams.some(t=>t.id===d.teamId)){ c.teamId=d.teamId; c.send({t:'joined', teamId:c.teamId}); push(c); toast(`جوال ${teamName(c.teamId)} اتصل`); play('game:g_oneup',{volume:.5}); }
      else c.send({t:'teams', teams: teams.map(t=>({id:t.id,name:t.name,color:t.color}))});
      refreshUI(); return;
    }
    if(!c.teamId) return;
    if(d.t==='answer'){ const p=pending.get(d.reqId); if(p && p.teamId===c.teamId){ pending.delete(d.reqId); closeAsk(d.reqId); p.cb(d.value); } return; }
    if(d.t==='leave'){ c.teamId=null; c.send({t:'teams', teams:(H?H.teams():D.competitors()).map(t=>({id:t.id,name:t.name,color:t.color}))}); refreshUI(); return; }
    if(!H) return;
    if(d.t==='buzz' && H.buzz) H.buzz(c.teamId);
    if(d.t==='play' && H.play) H.play(c.teamId, d.idx);
    if(d.t==='fuse' && H.fuse) H.fuse(c.teamId);
    if(d.t==='claim' && H.claim) H.claim(c.teamId, c.cid);
  }
  const teamName = id => ((H?H.teams():D.competitors()).find(t=>t.id===id)||{}).name || '';
  const phonesOf = id => [...conns].filter(c=>c.open && c.teamId===id);
  const hasPhone = id => phonesOf(id).length>0;
  const cidOpen = cid => [...conns].some(c=>c.open && c.cid===cid);
  function send(teamId, msg){ phonesOf(teamId).forEach(c=>{ try{ c.send(msg); }catch(e){} }); }
  function push(c){ if(!c.teamId || !H) return; try{ c.send(Object.assign({t:'state'}, H.state(c.teamId, c.cid))); }catch(e){} }
  // تحديث كل الجوالات (مجمّع عشان ما نرسل عشرات المرات بنفس اللحظة)
  function pushAll(){ if(pushT) return; pushT=setTimeout(()=>{ pushT=0; conns.forEach(push); }, 60); }

  // سؤال لجوال فريق — يرجع reqId، والنتيجة تجي عن طريق cb
  function ask(teamId, spec, cb){
    const reqId='r'+(++reqSeq); pending.set(reqId,{teamId,cb});
    send(teamId, {t:'ask', reqId, spec}); return reqId;
  }
  function cancel(reqId){ if(pending.delete(reqId)) closeAsk(reqId); }
  function closeAsk(reqId){ conns.forEach(c=>{ try{ c.send({t:'close', reqId}); }catch(e){} }); }
  function notify(teamId, msg){ send(teamId, msg); }

  function use(handlers){ H=handlers; pushAll(); refreshUI(); }

  // ---------- واجهة الشاشة ----------
  function refreshUI(){
    $$('.net-dot').forEach(el=>el.classList.toggle('on', ready));
    const box=$('#net-panel-body'); if(box) box.innerHTML=panelBody();
    if(H && H.onPhones) H.onPhones();
  }
  function panelBody(){
    const teams = H ? H.teams() : D.competitors();
    return `<div class="net-code">${ready?esc(code):'…'}</div>
      <div class="muted small">${ready?'افتحوا الرابط من الجوال أو صوّروا الكود':'نجهّز الغرفة — يحتاج إنترنت'}</div>
      <div class="muted small net-url">${ready?esc(joinUrl()):''}</div>
      <div class="net-teams">${teams.map(t=>{ const n=phonesOf(t.id).length; return `<span class="net-team ${n?'on':''}" style="--c:${t.color}">${ic('phone')} ${esc(t.name)} ${n?`<b>${n}</b>`:'<i>ما اتصل</i>'}</span>`; }).join('')}</div>`;
  }
  function openPanel(){
    start();
    modal(`<div class="eyebrow">تحكم من الجوال</div><h3>دخلوا جوالاتكم</h3>
      <div class="net-wrap mt-s"><div id="net-qr" class="net-qr"></div><div id="net-panel-body" class="stack">${panelBody()}</div></div>
      <p class="muted small mt-s">كل فريق يختار اسمه من الجوال: يبز، ويشوف بطاقاته سرّية ويلعبها، ويجاوب على الرهان وردود الفعل. المضيف يبقى الحكم على الشاشة.</p>
      <div class="row center mt-s"><button class="btn" data-x>تمام</button></div>`,{onMount(m){
        m.querySelector('[data-x]').onclick=()=>m.remove();
        const draw=()=>{ const q=m.querySelector('#net-qr'); if(!q) return; q.innerHTML=''; if(ready && window.QRCode){ new window.QRCode(q,{text:joinUrl(),width:220,height:220,colorDark:'#120A24',colorLight:'#ffffff'}); } else setTimeout(draw,500); };
        draw();
      }});
  }
  document.addEventListener('click', e=>{ if(e.target.closest('[data-net]')) openPanel(); });

  return { cidOpen, start, use, ask, cancel, notify, hasPhone, pushAll, send, openPanel, joinUrl, get code(){ return code; }, get ready(){ return ready; } };
})();
