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
    peer = new window.Peer(PREFIX+code, Object.assign({debug:0}, window.DAHOOM_ICE ? {config:{ iceServers: window.DAHOOM_ICE.iceServers }} : {}));
    peer.on('open', ()=>{ ready=true; tries=0; sessionStorage.setItem('dahoom_room',code); refreshUI(); publishRoom(); });
    peer.on('connection', c=>{
      c.cid='c'+(++cidSeq);
      c.on('open', ()=>{ conns.add(c); });
      c.on('data', d=>onMsg(c,d));
      c.on('close', ()=>{ conns.delete(c); refreshUI(); });
      c.on('error', e=>{ conns.delete(c); refreshUI(); if(e && e.type==='negotiation-failed' && window.DAHOOM_ICE) toast(window.DAHOOM_ICE.MSG.host); });
    });
    peer.on('disconnected', ()=>{ ready=false; refreshUI(); setTimeout(()=>{ try{ peer.reconnect(); }catch(e){} },1500); });
    peer.on('error', e=>{
      if(e.type==='unavailable-id'){ // الكود محجوز (غالبًا من تحديث الصفحة) — نعيد المحاولة ثم نغيّره
        peer.destroy(); peer=null; ready=false;
        if(++tries>=4){ sessionStorage.removeItem('dahoom_room'); tries=0; }
        setTimeout(start, 2000); return;
      }
      if(e.type==='network' || e.type==='server-error' || e.type==='socket-error'){ ready=false; refreshUI(); if(window.DAHOOM_ICE) toast(window.DAHOOM_ICE.why('signal')); }
    });
  }

  // ---------- الرسائل ----------
  const isSolo = () => D.session.mode==='solo' && D.session.game!=='khaliya';
  const soloList = () => D.session.players.map(p=>({name:p.name, avatar:p.avatar}));
  const canCreate = () => !isSolo() && !!D.session.phoneTeams && !isLocked() && D.session.teams.length < (D.session.game==='khaliya'?2:6);
  // شاشة البداية للجوال اللي ما له مكان بعد: فردي = يسجّل نفسه على طول، فرق = يختار فريقه
  const lobbyMsg = () => isSolo() ? {t:'soloreg', mode:'solo', avatars:D.AVATARS, players:soloList(), locked:isLocked()}
    : {t:'teams', mode:D.session.mode, avatars:D.AVATARS, teams:teamList(), canCreate:canCreate()};
  function seat(c, teamId){ c.teamId=teamId; c.send({t:'joined', teamId, mode:D.session.mode, avatars:D.AVATARS, teams:teamList()}); push(c); sendInfo(c); toast(`جوال ${teamName(teamId)} اتصل`); play('game:g_oneup',{volume:.5}); }
  function onMsg(c, d){
    if(!d || typeof d!=='object') return;
    // فردي: الجوال = لاعب. يسجّل اسمه وصورته وبس — بدون فرق
    if(d.t==='hello'){ c.pid = c.pid || d.pid || null; if(d.owner) c.owner=true; sendInfo(c); }
    if(isSolo() && (d.t==='hello' || d.t==='register')){
      const known = d.pid && D.session.players.find(p=>p.id===d.pid);
      if(d.t==='hello'){ if(known){ c.pid=known.id; seat(c, known.id); } else c.send(lobbyMsg()); refreshUI(); return; }
      if(!known && isLocked()){ c.send({t:'notice', msg:'المباراة شغالة — سجّل بعد ما تخلص'}); return; }
      const pl=D.joinPlayer({pid:d.pid, name:d.name, avatar:d.avatar});
      if(pl){ c.pid=pl.id; c.teamId=pl.id; c.send({t:'registered', pid:pl.id, name:pl.name, avatar:pl.avatar, teamId:pl.id, mode:'solo'}); if(H && H.roster) H.roster(); push(c); refreshUI(); }
      return;
    }
    // لاعب ينشئ فريق من جواله (لو المضيف مفعّل الخيار)
    if(d.t==='newteam' && !c.teamId){
      const t = canCreate() ? D.createTeam(d.name) : null;
      if(t) seat(c, t.id); else c.send({t:'notice', msg:'إنشاء الفرق مقفل — كلّم المضيف'});
      refreshUI(); return;
    }
    if(d.t==='hello'){
      if(isLocked() && d.pid){ const home=homeTeamOf(d.pid); if(home && d.teamId!==home.id){ if(d.teamId) c.send({t:'notice', msg:`ما تقدر تغيّر فريقك وسط اللعبة — انت مع ${home.name}`}); d.teamId=home.id; } }
      const teams = teamList();
      if(d.teamId && teams.some(t=>t.id===d.teamId)){ c.teamId=d.teamId; c.send({t:'joined', teamId:c.teamId, mode:D.session.mode, avatars:D.AVATARS, teams}); push(c); toast(`جوال ${teamName(c.teamId)} اتصل`); play('game:g_oneup',{volume:.5}); }
      else c.send(lobbyMsg());
      refreshUI(); return;
    }
    if(!c.teamId) return;
    if(d.t==='answer'){ const p=pending.get(d.reqId); if(p && p.teamId===c.teamId){ pending.delete(d.reqId); closeAsk(d.reqId); p.cb(d.value); } return; }
    if(d.t==='leave' && isLocked()){ c.send({t:'notice', msg:'تغيير الفريق بعد ما تخلص المباراة'}); return; }
    if(d.t==='leave'){ c.teamId=null; c.send(lobbyMsg()); refreshUI(); return; }
    if(d.t==='register'){ // اللاعب يسجل اسمه وصورته من جواله
      if(D.session.mode==='solo') return;
      let tid=c.teamId; if(isLocked()){ const home=homeTeamOf(d.pid); if(home) tid=home.id; }
      const pl=D.joinPlayer({pid:d.pid, name:d.name, avatar:d.avatar, teamId:tid});
      if(pl){ c.pid=pl.id; c.send({t:'registered', pid:pl.id, name:pl.name, avatar:pl.avatar}); if(H && H.roster) H.roster(); push(c); refreshUI(); }
      return; }
    if(!H) return;
    if(d.t==='buzz' && H.buzz) H.buzz(c.teamId, c.pid);
    if(d.t==='play' && H.play) H.play(c.teamId, d.idx);
    if(d.t==='fuse' && H.fuse) H.fuse(c.teamId);
    if(d.t==='claim' && H.claim) H.claim(c.teamId, c.cid, c.pid);
    if(H.msg && (d.t==='guess' || d.t==='stroke' || d.t==='fill' || d.t==='undo' || d.t==='clear' || d.t==='rpick' || d.t==='rate' || d.t==='rsync')) H.msg(c, d);
    if(d.t==='hmtrade' && H.trade) H.trade(c.teamId, d);
    if(d.t==='report'){ const ok = H.report ? H.report(c.teamId, c.pid, d) : false; try{ c.send({t:'notice', msg: ok ? 'وصل البلاغ — شكراً' : 'ما قدرنا نرسل البلاغ'}); }catch(e){} }
  }
  // كل فريق: عدد لاعبينه وصورهم (عشان الجوال يعرضهم بقائمة الاختيار)
  const membersOf = id => { const ss=D.session, t=ss.teams.find(x=>x.id===id);
    if(t) return t.members.map(m=>ss.players.find(p=>p.id===m)).filter(Boolean);
    const p=ss.players.find(x=>x.id===id); return p?[p]:[]; };
  const teamList = () => (H ? H.teams() : D.joinable()).map(t=>({ id:t.id, name:t.name, color:t.color,
    players:membersOf(t.id).map(p=>({name:p.name, avatar:p.avatar})), phones:phonesOf(t.id).length }));
  // وسط المباراة: ممنوع تغيير الفريق (قبلها وبعدها عادي)
  const isLocked = () => !!document.querySelector('#game.active, #khaliya.active, #rasm.active, #hawamir.active, #sadq.active');
  const homeTeamOf = pid => pid ? D.session.teams.find(t=>t.members.includes(pid)) : null;
  const teamName = id => ((H?H.teams():D.competitors()).find(t=>t.id===id)||{}).name || '';
  const phonesOf = id => [...conns].filter(c=>c.open && c.teamId===id);
  const hasPhone = id => phonesOf(id).length>0;
  const cidOpen = cid => [...conns].some(c=>c.open && c.cid===cid);
  function send(teamId, msg){ phonesOf(teamId).forEach(c=>{ try{ c.send(msg); }catch(e){} }); }
  function push(c){ if(!c.teamId || !H) return; try{ c.send(Object.assign({t:'state', locked:isLocked()}, H.state(c.teamId, c.cid, c.pid))); }catch(e){} }
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

  function use(handlers){ H=handlers; FEED.length=0; conns.forEach(c=>{ try{ c.send({t:'feedreset'}); }catch(e){} }); pushAll(); refreshUI(); }

  // ---------- معلومات الجلسة: اللعبة والمضيف واللاعبين (تنرسل لكل الجوالات) ----------
  const GAME_AR = { alf:'ألف نقطة', khaliya:'خلية الحروف', rasm:'ارسم وخمّن', hawamir:'هوامير', sadq:'ما أصدقك' };
  const ownerConn = () => [...conns].find(c=>c.open && c.owner && c.pid);
  const ownerP = () => { const c=ownerConn(); return c ? D.session.players.find(p=>p.id===c.pid) : null; };
  const hostName = () => { const o=ownerP(); if(o) return o.name; try{ return localStorage.getItem('dahoom_host')||''; }catch(e){ return ''; } };
  const isPublic = () => { try{ return localStorage.getItem('dahoom_public')!=='0'; }catch(e){ return true; } };
  const setPublic = v => { try{ localStorage.setItem('dahoom_public', v?'1':'0'); }catch(e){} publishRoom(); };
  const MAXP = { hawamir:6, sadq:6, khaliya:12, rasm:12, alf:12 };
  // اللوبي العام: نحدّث بيانات الجلسة (اللعبة وصاحبها وعدد اللاعبين ووش مرحلتها)
  function publishRoom(){
    const L=window.DahoomLobby; if(!L || !ready || !code) return;
    const players=new Set([...conns].filter(c=>c.open && c.pid).map(c=>c.pid)).size, o=ownerP();
    L.publish({ code, game:D.session.game||'', host:hostName()||'جلسة بدون اسم', hostAv:o?o.avatar:'', players, max:MAXP[D.session.game]||12, phase:isLocked()?'play':'lobby', pub:isPublic() });
  }
  function where(){
    const id=(document.querySelector('.screen.active')||{}).id||'';
    if(isLocked()) return { k:'play', x:'المباراة شغالة' };
    if(id==='results') return { k:'done', x:'المباراة خلصت' };
    if(id==='lobby') return { k:'lobby', x:'المضيف يرتّب اللاعبين' + (D.session.mode==='solo'?'':' والفرق') };
    if(/settings/.test(id)) return { k:'settings', x:'المضيف يضبط إعدادات اللعبة — قربت تبدأ' };
    return { k:'home', x:'المضيف يختار اللعبة' };
  }
  function infoMsg(){
    const ss=D.session, solo=ss.mode==='solo' && ss.game!=='khaliya';
    const online=new Set([...conns].filter(c=>c.open && c.pid).map(c=>c.pid));
    const teamOf=pid=>ss.teams.find(t=>t.members.includes(pid));
    return { t:'info', code, game:ss.game, gameName:GAME_AR[ss.game]||'', host:hostName(), mode:solo?'solo':'teams', where:where(), locked:isLocked(),
      players: ss.players.map(p=>{ const tm=solo?null:teamOf(p.id); const oc=ownerConn(); return { id:p.id, name:p.name, avatar:p.avatar, color:p.color, team:tm?tm.name:null, tc:tm?tm.color:null, on:online.has(p.id), own:!!(oc && oc.pid===p.id) }; }),
      teams: solo ? [] : ss.teams.map(t=>({ id:t.id, name:t.name, color:t.color, n:t.members.length })), phones:[...conns].filter(c=>c.open).length };
  }
  function sendInfo(c){ try{ c.send(infoMsg()); if(FEED.length) c.send({t:'feedall', list:FEED}); }catch(e){} }
  let infoT=0;
  function infoAll(){ if(infoT) return; infoT=setTimeout(()=>{ infoT=0; const m=infoMsg(); conns.forEach(c=>{ if(c.open){ try{ c.send(m); }catch(e){} } }); publishRoom(); if(window.DahoomOwner) window.DahoomOwner.render(); }, 150); }
  document.addEventListener('dahoom:screen', ()=>{ infoAll(); });
  document.addEventListener('dahoom:session', ()=>{ infoAll(); });
  // سجل الأحداث: آخر 60 حدث، ينرسل للجوالات أول بأول
  const FEED=[];
  document.addEventListener('dahoom:feed', e=>{ const f=e.detail; FEED.push(f); if(FEED.length>60) FEED.shift(); conns.forEach(c=>{ if(c.open){ try{ c.send({t:'feed', f}); }catch(err){} } }); });

  // ---------- تجديد الجلسة ----------
  // كود جديد: كل الأجهزة تنفصل ولازم يدخلون الكود الجديد. جلسة جديدة: نفس الشي + نمسح اللاعبين
  function newCode(){
    if(window.DahoomLobby) window.DahoomLobby.close();
    conns.forEach(c=>{ try{ c.send({t:'ended', msg:'المضيف جدّد الجلسة — ادخل الكود الجديد'}); }catch(e){} });
    setTimeout(()=>{ try{ peer && peer.destroy(); }catch(e){} peer=null; ready=false; conns.clear(); sessionStorage.removeItem('dahoom_room'); code=null; refreshUI(); start(); }, 300);
  }
  function newSession(){
    const ss=D.session; ss.players=[]; ss.teams.forEach(t=>t.members=[]); ss.save();
    if(D.refreshLobby) D.refreshLobby();
    newCode();
  }

  // ---------- واجهة الشاشة ----------
  function refreshUI(){
    // الجوالات اللي بشاشة اختيار الفريق تشوف العدد والصور يتحدثون مباشرة
    const lm=lobbyMsg(); conns.forEach(c=>{ if(c.open && !c.teamId){ try{ c.send(lm); }catch(e){} } });
    $$('.net-dot').forEach(el=>el.classList.toggle('on', ready));
    const box=$('#net-panel-body'); if(box) box.innerHTML=panelBody();
    if(H && H.onPhones) H.onPhones();
    infoAll();
  }
  function panelBody(){
    const teams = H ? H.teams() : D.competitors();
    return `<div class="net-code">${ready?esc(code):'…'}</div>
      <div class="muted small">${ready?'افتحوا الرابط من الجوال أو صوّروا الكود':'نجهّز الغرفة — يحتاج إنترنت'}</div>
      <div class="muted small net-url">${ready?esc(joinUrl()):''}</div>
      <div class="net-teams">${teams.map(t=>{ const n=phonesOf(t.id).length; return `<span class="net-team ${n?'on':''}" style="--c:${t.color}">${ic('phone')} ${esc(t.name)} ${n?`<b>${n}</b>`:'<i>ما اتصل</i>'}</span>`; }).join('')}</div>
      <div class="muted small">${[...conns].filter(c=>c.open).length} جهاز متصل الحين</div>`;
  }
  function openPanel(){
    start();
    modal(`<div class="eyebrow">تحكم من الجوال</div><h3>دخلوا جوالاتكم</h3>
      <div class="net-wrap mt-s"><div id="net-qr" class="net-qr"></div><div id="net-panel-body" class="stack">${panelBody()}</div></div>
      <p class="muted small mt-s">كل لاعب يدخل من جواله أو كمبيوتره ويشوف كل شي: الجلسة واللاعبين، اللعبة وسجل الأحداث، ويلعب منه. المضيف يبقى الحكم على الشاشة.</p>
      <label class="net-host"><span class="lbl">اسمك (المضيف)</span><input type="text" id="net-host" maxlength="16" placeholder="مثلاً: دحوم" value="${esc(hostName())}"></label>
      <div class="net-renew"><div class="lbl">تجديد الجلسة</div>
        <div class="row"><button class="btn small" data-newcode>${ic('recycle')} كود جديد</button><button class="btn small btn-bad" data-newsess>${ic('broom')} جلسة جديدة</button></div>
        <p class="muted small">«كود جديد» يفصل كل الأجهزة ويطلع كود ثاني، واللاعبين يبقون. «جلسة جديدة» يمسح اللاعبين ويبدأ من الصفر.</p></div>
      <div class="row center mt-s"><button class="btn" data-x>تمام</button></div>`,{onMount(m){
        m.querySelector('[data-x]').onclick=()=>m.remove();
        const hn=m.querySelector('#net-host'); hn.onchange=()=>{ try{ localStorage.setItem('dahoom_host', hn.value.trim().slice(0,16)); }catch(e){} infoAll(); };
        m.querySelector('[data-newcode]').onclick=async ()=>{ if(isLocked()){ toast('خلّص المباراة أول'); return; } m.remove(); if(await D.confirmBox('<h3>كود جديد؟</h3><p class="muted">كل الأجهزة تنفصل ولازم يدخلون الكود الجديد.</p>','جدّد','تراجع','btn-hype')){ newCode(); setTimeout(openPanel,400); } };
        m.querySelector('[data-newsess]').onclick=async ()=>{ if(isLocked()){ toast('خلّص المباراة أول'); return; } m.remove(); if(await D.confirmBox('<h3>جلسة جديدة؟</h3><p class="muted">نمسح كل اللاعبين ونفصل الأجهزة ونطلع كود جديد.</p>','امسح وابدأ','تراجع','btn-bad')){ newSession(); setTimeout(openPanel,400); } };
        const draw=()=>{ const q=m.querySelector('#net-qr'); if(!q) return; q.innerHTML=''; if(ready && window.QRCode){ new window.QRCode(q,{text:joinUrl(),width:220,height:220,colorDark:'#120A24',colorLight:'#ffffff'}); } else setTimeout(draw,500); };
        draw();
      }});
  }
  document.addEventListener('click', e=>{ if(e.target.closest('[data-net]')) openPanel(); });

  return { get ownerPid(){ const c=ownerConn(); return c?c.pid:null; }, isPublic, setPublic, phones:id=>phonesOf(id).map(c=>({ cid:c.cid, pid:c.pid })), newCode, newSession, info:()=>infoAll(), refresh:()=>refreshUI(), cidOpen, start, use, ask, cancel, notify, hasPhone, pushAll, send, openPanel, joinUrl, get code(){ return code; }, get ready(){ return ready; } };
})();
