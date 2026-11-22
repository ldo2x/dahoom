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
  // سيرفر الربط الاحتياطي: نسجّل فيه بنفس الكود (لو العام طاح، الجوالات تلقانا هنا)
  let peer2=null, ready2=false, code2=null;
  const conns=new Set();               // كل اتصال: conn.teamId
  let H = null;                        // معالجات اللعبة الحالية
  const pending=new Map();             // reqId -> {teamId, cb}
  let reqSeq=0, pushT=0, cidSeq=0;

  // ---------- سجل الأحداث (للبلاغات) ----------
  const LG = m => { try{ window.DahoomLog && window.DahoomLog.trail(m); }catch(e){} };
  const who = c => { const p=c && c.pid && D.session.players.find(x=>x.id===c.pid); return `${p?p.name:'جوال'} (${c?c.cid:'?'})`; };
  // ملخص الرسالة: نوعها وقيمها القصيرة
  const brief = d => Object.keys(d).filter(k=>k!=='t').slice(0,5).map(k=>{ const v=d[k]; return v==null||typeof v==='object' ? k : `${k}=${String(v).slice(0,20)}`; }).join(' ');
  const NOLOG = { stroke:1, rsync:1, fill:1 };      // رسائل الرسم كثيرة — ما نسجلها
  const logWait = new Map();                        // طلبات السجلات من الجوالات: id → { got:[] }
  // نطلب سجل كل جوال مفتوح (إلا except) وننتظر لين يردون أو تخلص المهلة
  function collectLogs(ms, except){
    return new Promise(res=>{
      const list=[...conns].filter(c=>c.open && c!==except);
      if(!list.length) return res([]);
      const id='L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), w={ got:[] };
      logWait.set(id, w);
      list.forEach(c=>{ try{ c.send({t:'logreq', id}); }catch(e){} });
      let iv=0, to=0;
      const done=()=>{ clearInterval(iv); clearTimeout(to); logWait.delete(id);
        list.forEach(c=>{ if(!w.got.some(g=>g.c===c)) w.got.push({ c, who:who(c), dump:'(ما رد على طلب السجل — غالباً نسخة قديمة أو الاتصال ضعيف)' }); });
        res(w.got.map(g=>({ who:g.who, dump:g.dump }))); };
      iv=setInterval(()=>{ if(w.got.length>=list.length) done(); }, 100);
      to=setTimeout(done, ms);
    });
  }
  if(window.DahoomLog){
    window.DahoomLog.setPeers(ms=>collectLogs(ms));
    window.DahoomLog.addSnap('الجلسة', ()=>{ const ss=D.session, on=onlinePids();
      return { code, ready, game:ss.game, mode:ss.mode, locked:isLocked(), screen:(document.querySelector('.screen.active')||{}).id,
        players:ss.players.map(p=>({ name:p.name, online:on.has(p.id), ready:isReady(p.id) })),
        teams:(ss.teams||[]).map(t=>({ name:t.name, members:(t.members||[]).length })),
        phones:[...conns].map(c=>({ who:who(c), open:!!c.open, away:!!c.away, hb:!!c.hb, seenAgoS:c.seen?Math.round((Date.now()-c.seen)/1000):null, team:c.teamId||null, owner:!!c.owner })),
        waiting:waitingFor().map(p=>p.name) }; });
  }

  const genCode = () => Array.from({length:4},()=> 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*31)]).join('');
  const baseUrl = () => /^https?:/.test(location.protocol) && !/^(localhost|127\.|\[::1\])/.test(location.hostname) ? location.href.replace(/[^/]*([?#].*)?$/,'') : PUBLIC_URL;
  const joinUrl = () => baseUrl()+'remote.html?room='+code;

  let sigT=0;
  function start(){
    if(peer || !window.Peer) return;
    code = sessionStorage.getItem('dahoom_room') || genCode();
    peer = new window.Peer(PREFIX+code, Object.assign({debug:0}, window.DAHOOM_ICE ? {config:{ iceServers: window.DAHOOM_ICE.iceServers }} : {}));
    peer.on('open', ()=>{ LG('الشاشة جاهزة بالكود '+code); ready=true; tries=0; clearTimeout(sigT); sigT=0; sessionStorage.setItem('dahoom_room',code); refreshUI(); publishRoom(); });
    peer.on('connection', onConn);
    peer.on('disconnected', ()=>{ LG('سيرفر الربط انقطع — نرجع نتصل'); ready=ready2; refreshUI(); setTimeout(()=>{ try{ peer.reconnect(); }catch(e){} },1500); });
    startBackup();
    peer.on('error', e=>{
      LG('خطأ سيرفر الربط: '+(e&&e.type));
      if(e.type==='unavailable-id'){ // الكود محجوز (غالبًا من تحديث الصفحة) — نعيد المحاولة ثم نغيّره
        peer.destroy(); peer=null; ready=false;
        if(++tries>=4){ sessionStorage.removeItem('dahoom_room'); tries=0; }
        setTimeout(start, 2000); return;
      }
      // سيرفر الربط يقطع كل شوي ونرجع نتصل لحالنا — الجوالات المتصلة ما تتأثر. ننبّه بس لو ما رجع خلال ٢٠ ثانية
      if(e.type==='network' || e.type==='server-error' || e.type==='socket-error'){ ready=ready2; refreshUI();
        if(!sigT) sigT=setTimeout(()=>{ sigT=0; if(!ready && window.DAHOOM_ICE) toast(window.DAHOOM_ICE.why('signal')+' (اللي متصلين يكملون عادي — بس محد جديد يقدر يدخل)', 6000); }, 20000);
        setTimeout(()=>{ try{ if(peer && peer.disconnected && !peer.destroyed) peer.reconnect(); }catch(err){} }, 3000); }
    });
  }

  function onConn(c){
    c.cid='c'+(++cidSeq);
    c.on('open', ()=>{ conns.add(c); LG('جوال اتصل ('+c.cid+(c.viaBackup?'، عن طريق السيرفر الاحتياطي':'')+')'); });
    c.on('data', d=>onMsg(c,d));
    c.on('close', ()=>{ conns.delete(c); LG('انقطع '+who(c)); refreshUI(); });
    c.on('error', e=>{ conns.delete(c); LG('خطأ اتصال '+who(c)+': '+(e&&e.type||e)); refreshUI(); if(e && e.type==='negotiation-failed' && window.DAHOOM_ICE) toast(window.DAHOOM_ICE.MSG.host); });
  }
  function startBackup(){
    const B = window.DAHOOM_ICE && window.DAHOOM_ICE.peerBackup; if(!B || !code || !window.Peer) return;
    if(peer2 && code2===code && !peer2.destroyed) return;
    try{ peer2 && peer2.destroy(); }catch(e){}
    code2=code; ready2=false;
    const p2 = peer2 = new window.Peer(PREFIX+code, Object.assign({debug:0}, B, {config:{ iceServers: window.DAHOOM_ICE.iceServers }}));
    p2.on('open', ()=>{ if(p2!==peer2) return; ready2=true; LG('السيرفر الاحتياطي جاهز'); if(!ready){ ready=true; refreshUI(); publishRoom(); } });
    p2.on('connection', c=>{ c.viaBackup=true; onConn(c); });
    p2.on('disconnected', ()=>{ if(p2!==peer2) return; ready2=false; setTimeout(()=>{ try{ if(p2===peer2 && !p2.destroyed) p2.reconnect(); }catch(e){} }, 3000); });
    p2.on('error', e=>{ if(p2!==peer2) return; LG('خطأ السيرفر الاحتياطي: '+(e&&e.type));
      if(e && e.type==='unavailable-id'){ try{ p2.destroy(); }catch(err){} peer2=null; setTimeout(startBackup, 4000); } });
  }

  // ---------- الرسائل ----------
  const isSolo = () => D.session.mode==='solo' && D.session.game!=='khaliya';
  const soloList = () => D.session.players.map(p=>({name:p.name, avatar:p.avatar}));
  const canCreate = () => !isSolo() && !!D.session.phoneTeams && !isLocked() && D.session.teams.length < (D.session.game==='khaliya'?2:6);
  // شاشة البداية للجوال اللي ما له مكان بعد: فردي = يسجّل نفسه على طول، فرق = يختار فريقه
  const lobbyMsg = () => isSolo() ? {t:'soloreg', mode:'solo', avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, players:soloList(), locked:isLocked()}
    : {t:'teams', mode:D.session.mode, avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, teams:teamList(), canCreate:canCreate()};
  // اسم ما يتصادم مع لاعب متصل الحين: كان جوال ثاني بنفس الاسم (محمد ومحمد) ياخذ مكان الأول ويطيّره.
  // نفس الاسم لاعب مو متصل = نفس الشخص راجع من جهاز ثاني (نخليه ياخذ مكانه)
  function freeName(name, pid){
    name=String(name||'').trim().slice(0,16); if(!name) return name;
    const P=D.session.players;
    if(window.DahoomBad && window.DahoomBad.has(name)){ name='لاعب'; for(let i=2;i<99 && P.some(p=>p.name===name && p.id!==pid);i++) name='لاعب '+i; }
    const on=onlinePids();
    const clash=n=>P.some(p=>p.name===n && p.id!==pid && on.has(p.id));
    if(!clash(name)) return name;
    for(let i=2;i<30;i++){ const n=name.slice(0,13)+' '+i; if(!P.some(p=>p.name===n && p.id!==pid)) return n; }
    return name;
  }
  function seat(c, teamId){ c.teamId=teamId; c.send({t:'joined', teamId, mode:D.session.mode, avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, teams:teamList()}); push(c); sendInfo(c); resendAsks(c); toast(`جوال ${teamName(teamId)} اتصل`); play('game:g_oneup',{volume:.5}); }
  function onMsg(c, d){
    if(!d || typeof d!=='object') return;
    { const was=alive(c); c.seen=Date.now();
      if(d.t==='hb' || d.t==='away'){ c.hb=true; c.away = d.t==='away'; if(was!==alive(c)){ LG(who(c)+(alive(c)?' رجع':' طلع من الصفحة')); infoAll(); } return; }
      if(c.away){ c.away=false; } if(!was) infoAll(); }
    // طلب سجل: جوال يبلّغ ويبي سجل الشاشة (و all=سجلات باقي الجوالات بعد)
    if(d.t==='logreq'){
      const mine={ who:'الشاشة', dump:window.DahoomLog ? window.DahoomLog.dump(12000) : '' };
      (d.all ? collectLogs(2000, c) : Promise.resolve([])).then(others=>{ try{ c.send({t:'logrep', id:d.id, list:[mine].concat(others)}); }catch(e){} });
      return;
    }
    if(d.t==='logrep'){ const w=logWait.get(d.id); if(w && !w.got.some(g=>g.c===c)) w.got.push({ c, who:who(c), dump:String(d.dump||'').slice(0,9000) }); return; }
    if(!NOLOG[d.t]) LG(`من ${who(c)}: ${d.t} ${brief(d)}`);
    // فردي: الجوال = لاعب. يسجّل اسمه وصورته وبس — بدون فرق
    if(d.t==='hello'){ c.pid = c.pid || d.pid || null; if(d.owner) c.owner=true; sendInfo(c); }
    if(isSolo() && (d.t==='hello' || d.t==='register')){
      const known = d.pid && D.session.players.find(p=>p.id===d.pid);
      if(d.t==='hello'){ if(known){ c.pid=known.id; seat(c, known.id); } else c.send(lobbyMsg()); refreshUI(); return; }
      if(!known && isLocked()){ c.send({t:'notice', msg:'المباراة شغالة — سجّل بعد ما تخلص'}); return; }
      const pl=D.joinPlayer({pid:d.pid, name:freeName(d.name, d.pid), avatar:d.avatar});
      if(pl){ c.pid=pl.id; c.teamId=pl.id; c.send({t:'registered', pid:pl.id, name:pl.name, avatar:pl.avatar, teamId:pl.id, mode:'solo'}); if(H && H.roster) H.roster(); push(c); refreshUI(); }
      return;
    }
    // مستعد / مو مستعد (قبل البداية بس)
    if(d.t==='ready'){ if(c.pid && !isLocked()){ if(d.on) RD.add(c.pid); else RD.delete(c.pid); play('tick',{volume:.4}); infoAll(); } return; }
    // وضع الفرق: اللاعب يسجّل اسمه وصورته أول (بدون فريق)، وبعدها يختار فريقه من شاشة الانتظار
    if(d.t==='register' && !isSolo() && !c.teamId){
      const pl=D.joinPlayer({pid:d.pid, name:freeName(d.name, d.pid), avatar:d.avatar});
      if(pl){ c.pid=pl.id; c.teamId = homeId(pl.id);
        c.send(Object.assign(regMsg(pl), { teamId:c.teamId, teamless:!c.teamId })); if(H && H.roster) H.roster(); push(c); refreshUI(); }
      return; }
    // ياخذ خانة الحكم (خلية الحروف بوضع الحكم البشري، قبل البداية)
    if(d.t==='ref'){
      if(isLocked()){ c.send({t:'notice', msg:'تغيير الدور بعد ما تخلص المباراة'}); return; }
      const p=c.pid && D.session.players.find(x=>x.id===c.pid);
      if(!p || !D.refOn || !D.refOn()){ c.send({t:'notice', msg:'وضع الحكم البشري مو مفعّل'}); return; }
      const old=D.refPid(); D.setRef(p.id); c.teamId='ref';
      if(old && old!==p.id) toast(`${p.name} صار الحكم بدال ${(D.session.players.find(x=>x.id===old)||{}).name||''}`); else toast(`${p.name} صار الحكم`);
      c.send({t:'joined', teamId:'ref', mode:D.session.mode, avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, teams:teamList(), known:true}); push(c); infoAll(); refreshUI(); return; }
    // يختار فريق أو يبدّل (قبل البداية)
    if(d.t==='team'){
      if(isLocked()){ c.send({t:'notice', msg:'تغيير الفريق بعد ما تخلص المباراة'}); return; }
      const p=c.pid && D.session.players.find(x=>x.id===c.pid), t=D.session.teams.find(x=>x.id===d.id);
      if(!p || !t || D.session.mode!=='teams'){ c.send(lobbyMsg()); return; }
      D.joinPlayer({pid:p.id, name:p.name, avatar:p.avatar, teamId:t.id}); c.teamId=t.id;
      c.send({t:'joined', teamId:t.id, mode:D.session.mode, avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, teams:teamList(), known:true}); push(c); refreshUI(); return; }
    // لاعب ينشئ فريق من جواله (لو المضيف مفعّل الخيار) — وينتقل له لو كان مسجّل
    if(d.t==='newteam' && window.DahoomBad && window.DahoomBad.has(d.name)){ c.send({t:'notice', msg:'اسم الفريق فيه كلمة ما تصلح — اختر غيره'}); return; }
    if(d.t==='newteam' && !isLocked()){
      const t = canCreate() ? D.createTeam(d.name) : null;
      if(!t){ c.send({t:'notice', msg:'إنشاء الفرق مقفل — كلّم المضيف'}); return; }
      const p=c.pid && D.session.players.find(x=>x.id===c.pid);
      if(p){ D.joinPlayer({pid:p.id, name:p.name, avatar:p.avatar, teamId:t.id}); c.teamId=t.id; c.send({t:'joined', teamId:t.id, mode:D.session.mode, avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, teams:teamList(), known:true}); push(c); }
      else seat(c, t.id);
      refreshUI(); return;
    }
    if(d.t==='hello'){
      if(isLocked() && d.pid){ const hid=homeId(d.pid); if(hid && d.teamId!==hid){ if(d.teamId) c.send({t:'notice', msg:`ما تقدر تغيّر فريقك وسط اللعبة — انت مع ${teamName(hid)}`}); d.teamId=hid; } }
      const teams = teamList();
      const known = d.pid && D.session.players.find(p=>p.id===d.pid);
      if(known && !isLocked()){ d.teamId = homeId(known.id); }
      if(d.teamId && (teams.some(t=>t.id===d.teamId) || (d.teamId==='ref' && known && isRefPid(known.id)))){ if(known) c.pid=known.id; c.teamId=d.teamId; c.send({t:'joined', teamId:c.teamId, mode:D.session.mode, avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, teams, known:!!known}); push(c); resendAsks(c); toast(`جوال ${teamName(c.teamId)} اتصل`); play('game:g_oneup',{volume:.5}); }
      else if(known){ c.pid=known.id; c.teamId=null; c.send(regMsg(known)); push(c); }
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
      const pl=D.joinPlayer({pid:d.pid, name:freeName(d.name, d.pid), avatar:d.avatar, teamId:tid});
      if(pl){ c.pid=pl.id; c.send({t:'registered', pid:pl.id, name:pl.name, avatar:pl.avatar}); if(H && H.roster) H.roster(); push(c); refreshUI(); }
      return; }
    if(!H) return;
    if(d.t==='buzz' && H.buzz) H.buzz(c.teamId, c.pid, d);
    // خلية الحروف: جواب مكتوب (الحكم التلقائي) وأوامر الحكم البشري
    if(d.t==='khans' && H.khans && c.teamId!=='ref') H.khans(c.teamId, String(d.text||'').slice(0,60), c.pid);
    if(d.t==='khref' && H.ref && c.teamId==='ref') H.ref({ a:String(d.a||''), i:Number.isInteger(d.i)?d.i:undefined });
    if(d.t==='play' && H.play) H.play(c.teamId, d.idx);
    if(d.t==='fuse' && H.fuse) H.fuse(c.teamId);
    if(d.t==='claim' && H.claim) H.claim(c.teamId, c.cid, c.pid);
    if(H.msg && (d.t==='guess' || d.t==='stroke' || d.t==='fill' || d.t==='undo' || d.t==='clear' || d.t==='rpick' || d.t==='rate' || d.t==='rsync')) H.msg(c, d);
    if(d.t==='hmtrade' && H.trade) H.trade(c.teamId, d);
    if(d.t==='khpick' && H.pick && Number.isInteger(d.i)) H.pick(c.teamId, d.i);
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
  // مكان اللاعب: فريقه، أو 'ref' لو هو الحكم (خلية الحروف بوضع الحكم البشري)
  const isRefPid = pid => !!pid && !!D.refPid && D.refPid()===pid;
  const homeId = pid => isRefPid(pid) ? 'ref' : ((homeTeamOf(pid)||{}).id || null);
  const teamName = id => id==='ref' ? 'الحكم' : ((H?H.teams():D.competitors()).find(t=>t.id===id)||{}).name || '';
  const phonesOf = id => [...conns].filter(c=>c.open && c.teamId===id);
  const hasPhone = id => phonesOf(id).length>0;
  const cidOpen = cid => [...conns].some(c=>c.open && c.cid===cid);
  function send(teamId, msg){ phonesOf(teamId).forEach(c=>{ try{ c.send(msg); }catch(e){} }); }
  function push(c){ if(!c.teamId){ if(c.pid && c.open){ try{ c.send({t:'state', waiting:true, teamless:true, locked:isLocked()}); }catch(e){} } return; } if(!H){ try{ c.send({t:'state', waiting:true, locked:false}); }catch(e){} return; } try{ c.send(Object.assign({t:'state', locked:isLocked()}, H.state(c.teamId, c.cid, c.pid))); }catch(e){} }
  // تحديث كل الجوالات (مجمّع عشان ما نرسل عشرات المرات بنفس اللحظة)
  function pushAll(){ if(pushT) return; pushT=setTimeout(()=>{ pushT=0; conns.forEach(push); }, 60); }

  // سؤال لجوال فريق — يرجع reqId، والنتيجة تجي عن طريق cb
  function ask(teamId, spec, cb){
    const reqId='r'+(++reqSeq); pending.set(reqId,{teamId,cb,spec});
    send(teamId, {t:'ask', reqId, spec}); return reqId;
  }
  // جوال رجع اتصل (قفل الشاشة / طلع ورجع) وهو عليه سؤال: نرسله له مرة ثانية — قبل كان السؤال يضيع واللعبة «تعلق»
  function resendAsks(c){ if(!c || !c.teamId) return; pending.forEach((p,reqId)=>{ if(p.teamId===c.teamId && p.spec){ try{ c.send({t:'ask', reqId, spec:p.spec}); }catch(e){} } }); }
  function cancel(reqId){ if(pending.delete(reqId)) closeAsk(reqId); }
  function closeAsk(reqId){ conns.forEach(c=>{ try{ c.send({t:'close', reqId}); }catch(e){} }); }
  function notify(teamId, msg){ send(teamId, msg); }

  function use(handlers){ H=handlers; if(handlers) RD.clear(); FEED.length=0; conns.forEach(c=>{ try{ c.send({t:'feedreset'}); }catch(e){} }); pushAll(); refreshUI(); }

  // ---------- مستعد ----------
  // كل لاعب متصل لازم يضغط «مستعد» قبل ما تبدأ اللعبة (صاحب الجلسة مستعد دايماً — هو اللي يبدأ)
  const RD=new Set(); let rdGame=null;
  // متصل فعلاً: القناة مفتوحة، وما قال إنه غايب، ووصل منه نبض قريب (الجوالات القديمة بدون نبض: القناة تكفي)
  const STALE=15000;
  function alive(c){ return !!(c && c.open && !c.away && (!c.hb || Date.now()-(c.seen||0) < STALE)); }
  const onlinePids = () => new Set([...conns].filter(c=>c.pid && alive(c)).map(c=>c.pid));
  // كل ٥ ثواني: لو أحد راح أو رجع نحدّث الكل (قائمة اللاعبين وزر البداية)
  let aliveSig='';
  setInterval(()=>{ const s=[...onlinePids()].sort().join(','); if(s!==aliveSig){ aliveSig=s; if(conns.size) infoAll(); } }, 5000);
  // صاحب الجلسة يبدأ بدون اللي ما ضغطوا «مستعد»
  function forceReady(){ waitingFor().forEach(p=>RD.add(p.id)); infoAll(); }
  const isReady = pid => RD.has(pid) || (ownerConn() && ownerConn().pid===pid);
  // اللي ننتظرهم: لاعبين متصلين وما ضغطوا مستعد
  const waitingFor = () => { const on=onlinePids(); return D.session.players.filter(p=>on.has(p.id) && !isReady(p.id)); };
  const regMsg = p => ({t:'registered', avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, pid:p.id, name:p.name, avatar:p.avatar, teamId:null, teamless:true, mode:D.session.mode});
  // المضيف وزّع الفرق أو حرّك لاعب: جوال كل لاعب ينتقل لفريقه الجديد بدون ما يسوي شي
  function seatSync(){
    if(isLocked() || isSolo()) return;
    conns.forEach(c=>{ if(!c.open || !c.pid) return; const p=D.session.players.find(x=>x.id===c.pid); if(!p) return;
      const tid=homeId(c.pid); if(tid===c.teamId) return;
      c.teamId=tid; try{ c.send(tid ? {t:'joined', teamId:tid, mode:D.session.mode, avatars:D.AVATARS, avatarGroups:D.AVATAR_GROUPS, teams:teamList(), known:true} : regMsg(p)); }catch(e){} push(c); });
  }

  // ---------- معلومات الجلسة: اللعبة والمضيف واللاعبين (تنرسل لكل الجوالات) ----------
  const GAME_AR = { alf:'ألف نقطة', khaliya:'خلية الحروف', rasm:'ارسم وخمّن', hawamir:'هوامير', sadq:'ما أصدقك' };
  const ownerConn = () => [...conns].find(c=>c.open && c.owner && c.pid);
  const ownerP = () => { const c=ownerConn(); return c ? D.session.players.find(p=>p.id===c.pid) : null; };
  const hostName = () => { const o=ownerP(); if(o) return o.name;
    try{ const A=window.DahoomAccount && window.DahoomAccount.current(); if(A && A.name) return A.name; }catch(e){}
    try{ const m=JSON.parse(localStorage.getItem('dahoom_me')||'null'); if(m && m.name && window.DahoomOwner && window.DahoomOwner.on) return m.name; }catch(e){}
    try{ return localStorage.getItem('dahoom_host')||''; }catch(e){ return ''; } };
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
    if(id==='lobby' || /settings/.test(id)) return { k:'lobby', x:`${hostName()||'صاحب الجلسة'} يجهّز اللعبة — استعدوا` };
    return { k:'home', x:'المضيف يختار اللعبة' };
  }
  function infoMsg(){
    const ss=D.session, solo=ss.mode==='solo' && ss.game!=='khaliya';
    if(rdGame!==ss.game+':'+ss.mode){ rdGame=ss.game+':'+ss.mode; RD.clear(); }   // تغيّرت اللعبة أو الطريقة = الكل يعيد «مستعد»
    const online=onlinePids();
    const teamOf=pid=>ss.teams.find(t=>t.members.includes(pid));
    const refOn = !solo && !!D.refOn && D.refOn();
    return { t:'info', code, game:ss.game, gameName:GAME_AR[ss.game]||'', host:hostName(), mode:solo?'solo':'teams', where:where(), locked:isLocked(),
      ref: refOn ? { color:D.REF_COLOR } : null,
      players: ss.players.map(p=>{ const rf=refOn && isRefPid(p.id), tm=solo||rf?null:teamOf(p.id); const oc=ownerConn();
        return { id:p.id, name:p.name, avatar:p.avatar, color:p.color, team:rf?'الحكم':tm?tm.name:null, tid:rf?'ref':tm?tm.id:null, tc:rf?D.REF_COLOR:tm?tm.color:null, on:online.has(p.id), own:!!(oc && oc.pid===p.id), rd:isReady(p.id) }; }),
      teams: solo ? [] : ss.teams.map(t=>({ id:t.id, name:t.name, color:t.color, n:t.members.length })), phones:[...conns].filter(c=>c.open).length,
      canCreate:canCreate(), maxTeams: ss.game==='khaliya' ? 2 : 6, pub:isPublic(), wait:waitingFor().map(p=>p.name),
      cap: solo && CAP[ss.game] || 0, over: overCap() };
  }
  // ما أصدقك وهوامير: أقصى ٦ — المتصلين الزايدين (حسب ترتيب الدخول) يتفرجون هالمرة
  const CAP = { sadq:6, hawamir:6 };
  function overCap(){
    const ss=D.session, cap=CAP[ss.game]; if(!cap || ss.mode!=='solo') return [];
    const on=onlinePids(); return ss.players.filter(p=>on.has(p.id)).slice(cap).map(p=>p.name);
  }
  function sendInfo(c){ try{ c.send(infoMsg()); if(FEED.length) c.send({t:'feedall', list:FEED}); }catch(e){} }
  let infoT=0;
  function infoAll(){ if(infoT) return; infoT=setTimeout(()=>{ infoT=0; seatSync(); const m=infoMsg(); conns.forEach(c=>{ if(c.open){ try{ c.send(m); }catch(e){} } }); publishRoom(); if(window.DahoomOwner) window.DahoomOwner.render(); }, 150); }
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
    setTimeout(()=>{ try{ peer && peer.destroy(); }catch(e){} try{ peer2 && peer2.destroy(); }catch(e){} peer=null; peer2=null; ready=false; ready2=false; conns.clear(); sessionStorage.removeItem('dahoom_room'); code=null; refreshUI(); start(); }, 300);
  }
  function newSession(){
    const ss=D.session; ss.players=[]; ss.teams.forEach(t=>t.members=[]); ss.save();
    if(D.refreshLobby) D.refreshLobby();
    newCode();
  }

  // ---------- واجهة الشاشة ----------
  function refreshUI(){
    // الجوالات اللي بشاشة اختيار الفريق تشوف العدد والصور يتحدثون مباشرة
    const lm=lobbyMsg(); conns.forEach(c=>{ if(c.open && !c.teamId && !c.pid){ try{ c.send(lm); }catch(e){} } });
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

  // للاختبارات المحلية بس: نعتبر كل المتصلين مستعدين
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  return { _conns: isLocal ? ()=>[...conns].map(c=>({pid:c.pid, open:c.open, hb:!!c.hb, away:!!c.away, age:Date.now()-(c.seen||0)})) : undefined, _readyAll: isLocal ? ()=>{ onlinePids().forEach(id=>RD.add(id)); infoAll(); } : undefined,
    get ownerPid(){ const c=ownerConn(); return c?c.pid:null; }, waitingFor:()=>waitingFor().map(p=>p.name), forceReady, isPublic, setPublic, phones:id=>phonesOf(id).map(c=>({ cid:c.cid, pid:c.pid })), newCode, newSession, info:()=>infoAll(), refresh:()=>refreshUI(), cidOpen, start, use, ask, cancel, notify, hasPhone, pushAll, send, openPanel, joinUrl, get code(){ return code; }, get ready(){ return ready; } };
})();
