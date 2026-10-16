/* ===== إحصائيات نهاية المباراة =====
   جوائز بأسماء سعودية، منحنى النقاط بعد كل دور، توزيع النقاط حسب الخانة، جدول كامل، وأبرز اللحظات.
   ألوان الخانات من لوحة مفحوصة لعمى الألوان (فاتح/غامق)؛ خطوط الفرق بلون الفريق + اسم على طرف الخط + مفتاح.
*/
window.DahoomStats = (function(){
  const D = window.Dahoom;
  const { esc, ic } = D;
  const SRC = [['q','أسئلة'],['c','بدون كلام'],['t','تحديات'],['steal','سرقات']];
  const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
  const sec = ms => (ms/1000).toFixed(2);

  // ---------- الجوائز ----------
  // كل جائزة: أعلى (أو أقل) قيمة؛ التعادل يروح للأعلى نقاطًا؛ ما تنعطى لو ما فيه بيانات
  function awards(teams, T){
    const defs = [
      { key:'wolf',    title:'الذيب',          icon:'crown',     desc:'أكبر دور بالمباراة',        val:t=>T[t.id].bestTurn,              fmt:v=>`+${v} بدور واحد` },
      { key:'thief',   title:'الحرامي',         icon:'ninja',     desc:'أكثر سرقات',               val:t=>T[t.id].steals,                fmt:v=>`${v} سرقات` },
      { key:'finger',  title:'أسرع إصبع',       icon:'whistle',   desc:'أسرع بز بالمتوسط',          val:t=>avg(T[t.id].buzz), low:true,   fmt:v=>`${sec(v)} ث` },
      { key:'saboteur',title:'المخرّب',          icon:'attack',    desc:'أكثر بطاقات هجوم رماها',    val:t=>T[t.id].attacks,               fmt:v=>`${v} ضربات` },
      { key:'bag',     title:'كيس الملاكمة',    icon:'defense',   desc:'أكثر واحد انضرب',           val:t=>T[t.id].hits,                  fmt:v=>`${v} ضربات جته` },
      { key:'fire',    title:'مولّعة',          icon:'flame',     desc:'أطول سلسلة نجاحات',         val:t=>T[t.id].maxCombo>=2?T[t.id].maxCombo:0, fmt:v=>`${v} ورا بعض` },
      { key:'actor',   title:'نجم التمثيل',     icon:'masks',     desc:'أكثر نقاط من بدون كلام',    val:t=>T[t.id].pts.c,                 fmt:v=>`${v} نقطة` },
      { key:'unlucky', title:'منحوس الليلة',    icon:'skull',     desc:'أكثر محاولات فاشلة',        val:t=>T[t.id].fails,                 fmt:v=>`${v} فشل` },
    ];
    const out=[];
    defs.forEach(d=>{
      const vals=teams.map(t=>({t, v:d.val(t)})).filter(x=>x.v!=null && (d.low ? x.v>0 : x.v>0));
      if(!vals.length) return;
      vals.sort((a,b)=> d.low ? a.v-b.v || b.t.score-a.t.score : b.v-a.v || b.t.score-a.t.score);
      if(teams.length>1 && !d.low && vals.length>1 && vals[0].v===vals[1].v && d.key!=='wolf' && d.key!=='fire') return; // تعادل = ما فيه جائزة
      out.push({ key:d.key, title:d.title, icon:d.icon, desc:d.desc, team:vals[0].t, value:d.fmt(vals[0].v) });
    });
    return out;
  }

  // ---------- تلميح عائم مشترك ----------
  function tip(){ let t=document.getElementById('viz-tip'); if(!t){ t=document.createElement('div'); t.id='viz-tip'; t.className='viz-tip'; document.body.appendChild(t); } return t; }
  function showTip(html, x, y){ const t=tip(); t.innerHTML=html; t.style.display='block'; const r=t.getBoundingClientRect();
    let L=x+14, Tp=y-r.height-10; if(L+r.width>innerWidth-8) L=x-r.width-14; if(Tp<8) Tp=y+16; t.style.transform=`translate(${Math.round(L)}px,${Math.round(Tp)}px)`; }
  function hideTip(){ const t=document.getElementById('viz-tip'); if(t) t.style.display='none'; }

  // ---------- منحنى النقاط ----------
  function lineChart(teams, series, target){
    const W=900, H=340, pl=46, pr=150, pt=18, pb=36, iw=W-pl-pr, ih=H-pt-pb;
    const n=series.length, maxV=Math.max(target||0, ...series.flatMap(s=>teams.map(t=>s.scores[t.id]||0)));
    const step = maxV<=400?100:maxV<=1000?250:500, top=Math.ceil(maxV/step)*step||step, minV=Math.min(0,...series.flatMap(s=>teams.map(t=>s.scores[t.id]||0)));
    const bot = minV<0 ? -Math.ceil(-minV/step)*step : 0;
    const X=i=> pl + (n<=1?0: i*iw/(n-1)), Y=v=> pt + ih - (v-bot)/(top-bot)*ih;
    let grid=''; for(let v=bot; v<=top; v+=step) grid+=`<line x1="${pl}" x2="${pl+iw}" y1="${Y(v)}" y2="${Y(v)}" class="viz-grid${v===0?' zero':''}"/><text x="${pl-8}" y="${Y(v)+4}" class="viz-axis" text-anchor="end">${v}</text>`;
    let rounds=''; let lastR=null; series.forEach((s,i)=>{ if(s.round!==lastR && s.round>0){ rounds+=`<line x1="${X(i)}" x2="${X(i)}" y1="${pt}" y2="${pt+ih}" class="viz-round"/><text x="${X(i)+4}" y="${H-12}" class="viz-axis viz-rtl" text-anchor="end">لفة ${s.round}</text>`; } lastR=s.round; });
    const tgt = target ? `<line x1="${pl}" x2="${pl+iw}" y1="${Y(target)}" y2="${Y(target)}" class="viz-target"/><text x="${pl+4}" y="${Y(target)-6}" class="viz-axis viz-rtl" text-anchor="end">الهدف ${target}</text>` : '';
    // الخطوط + نقطة النهاية + اسم الفريق على الطرف (مع إبعاد الأسماء عن بعض)
    const ends = teams.map(t=>({t, y:Y(series[n-1].scores[t.id]||0)})).sort((a,b)=>a.y-b.y);
    for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<20) ends[i].y=ends[i-1].y+20;
    const lines = teams.map(t=>`<polyline class="viz-line" style="--c:${t.color}" points="${series.map((s,i)=>`${X(i).toFixed(1)},${Y(s.scores[t.id]||0).toFixed(1)}`).join(' ')}"/>
      <circle class="viz-end" style="--c:${t.color}" cx="${X(n-1)}" cy="${Y(series[n-1].scores[t.id]||0)}" r="5"/>`).join('');
    const labels = ends.map(e=>`<text x="${X(n-1)+12}" y="${e.y+5}" class="viz-label"><tspan class="viz-label-n">${esc(e.t.name)}</tspan> ${series[n-1].scores[e.t.id]||0}</text>`).join('');
    return `<div class="viz-chart" data-viz="line"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="نقاط كل فريق بعد كل دور">${grid}${rounds}${tgt}${lines}${labels}
      <line class="viz-cross" x1="0" x2="0" y1="${pt}" y2="${pt+ih}" style="display:none"/><rect class="viz-hit" x="${pl}" y="${pt}" width="${iw}" height="${ih}"/></svg></div>`;
  }
  function wireLine(root, teams, series){
    const svg=root.querySelector('[data-viz="line"] svg'); if(!svg) return;
    const hit=svg.querySelector('.viz-hit'), cross=svg.querySelector('.viz-cross'); const n=series.length;
    const pl=46, iw=900-46-150;
    hit.addEventListener('pointermove', e=>{
      const r=svg.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width*900;
      const i=Math.max(0,Math.min(n-1, Math.round((x-pl)/(iw/(Math.max(1,n-1))))));
      const cx=pl+(n<=1?0:i*iw/(n-1)); cross.setAttribute('x1',cx); cross.setAttribute('x2',cx); cross.style.display='';
      const s=series[i]; const rows=[...teams].sort((a,b)=>(s.scores[b.id]||0)-(s.scores[a.id]||0));
      showTip(`<div class="vt-h">${esc(s.label)}</div>${rows.map(t=>`<div class="vt-r"><i style="--c:${t.color}"></i>${esc(t.name)}<b>${s.scores[t.id]||0}</b></div>`).join('')}`, e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', ()=>{ cross.style.display='none'; hideTip(); });
  }

  // ---------- النقاط حسب الخانة (أشرطة مكدسة) ----------
  function sourceBars(teams, T){
    const tot=t=>SRC.reduce((a,[k])=>a+Math.max(0,T[t.id].pts[k]),0);
    const max=Math.max(1,...teams.map(tot));
    return `<div class="viz-legend">${SRC.map(([k,n],i)=>`<span><i class="viz-sw s${i+1}"></i>${n}</span>`).join('')}</div>
      <div class="viz-bars">${teams.map(t=>{ const sum=tot(t);
        return `<div class="vb-row"><span class="vb-name"><i style="--c:${t.color}"></i>${esc(t.name)}</span>
          <span class="vb-track"><span class="vb-bar" style="width:${(sum/max*100).toFixed(1)}%">${SRC.map(([k,n],i)=>{ const v=Math.max(0,T[t.id].pts[k]); return v?`<span class="vb-seg s${i+1}" style="flex:${v}" data-tip="${esc(t.name)} · ${n}: ${v}"></span>`:''; }).join('')}</span></span>
          <span class="vb-val">${sum}</span></div>`; }).join('')}</div>`;
  }
  function wireBars(root){
    root.querySelectorAll('.vb-seg').forEach(s=>{
      s.addEventListener('pointermove', e=>showTip(`<div class="vt-r">${esc(s.dataset.tip)}</div>`, e.clientX, e.clientY));
      s.addEventListener('pointerleave', hideTip);
    });
  }

  // ---------- الجدول ----------
  function table(teams, T){
    const f=(o,k)=>`${o.ok[k]}/${o.tries[k]}`;
    return `<div class="viz-table-wrap"><table class="viz-table"><thead><tr><th>الفريق</th><th>النقاط</th><th>أسئلة صح</th><th>بدون كلام</th><th>تحديات</th><th>سرقات</th><th>بطاقات لعبها</th><th>صافي البطاقات</th><th>ضربات جته</th><th>أفضل دور</th><th>أطول سلسلة</th><th>متوسط البز</th></tr></thead>
      <tbody>${teams.map(t=>{ const o=T[t.id]; const cardsNet=t.score-SRC.reduce((a,[k])=>a+o.pts[k],0); const b=avg(o.buzz);
        const N = v => `<bdi dir="ltr">${v}</bdi>`;
        return `<tr><td><span class="vt-team"><i style="--c:${t.color}"></i>${esc(t.name)}</span></td><td class="num">${N(t.score)}</td><td class="num">${f(o,'q')}</td><td class="num">${f(o,'c')}</td><td class="num">${f(o,'t')}</td><td class="num">${o.steals}</td><td class="num">${o.cards}</td><td class="num">${N((cardsNet>0?'+':'')+cardsNet)}</td><td class="num">${o.hits}</td><td class="num">${o.bestTurn}</td><td class="num">${o.maxCombo}</td><td class="num">${b==null?'—':sec(b)+' ث'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function awardsHTML(list){
    return list.length ? `<div class="aw-grid">${list.map(a=>`<div class="aw" style="--c:${a.team.color}"><span class="aw-ic">${ic(a.icon)}</span><div class="aw-t">${esc(a.title)}</div><div class="aw-team">${esc(a.team.name)}</div><div class="aw-v">${esc(a.value)}</div><div class="aw-d">${esc(a.desc)}</div></div>`).join('')}</div>` : '';
  }

  // ---------- ألف نقطة ----------
  function renderAlf(el, G, target){
    const teams=[...G.teams].sort((a,b)=>b.score-a.score), T=G.stats.T;
    const aw=awards(teams,T); G.stats.awards=aw;
    const turns=G.stats.series.length-1;
    el.innerHTML=`<div class="ms">
      <div class="ms-head"><h2>وش صار بالمباراة</h2><span class="muted">${G.round} لفات · ${turns} دور · ${G.stats.moments.length} لحظة</span></div>
      ${awardsHTML(aw)}
      <section class="ms-card"><h3>النقاط بعد كل دور</h3><p class="muted small">مرّر على المنحنى تشوف النقاط بأي لحظة</p>${lineChart(teams, G.stats.series, target)}</section>
      <section class="ms-card"><h3>من وين جات النقاط</h3><p class="muted small">النقاط اللي كسبها كل فريق من كل خانة (البطاقات والضربات بالجدول تحت)</p>${sourceBars(teams,T)}</section>
      <section class="ms-card"><h3>الأرقام كاملة</h3>${table(teams,T)}</section>
      ${G.stats.moments.length?`<section class="ms-card"><h3>أبرز اللحظات</h3><ol class="ms-moments">${G.stats.moments.slice(-14).map(m=>`<li style="--c:${m.color||'var(--line)'}"><span class="mm-r">ل${m.round}</span>${m.text}</li>`).join('')}</ol></section>`:''}
    </div>`;
    wireLine(el, teams, G.stats.series); wireBars(el);
  }

  // ---------- خلية الحروف ----------
  function renderKhaliya(el, G){
    const teams=G.teams, T=G.stats||{};
    const rows=teams.map((t,i)=>({t, o:T[i]||{cells:0,ok:0,wrong:0,buzz:[]}}));
    const fast=rows.filter(r=>r.o.buzz.length).sort((a,b)=>avg(a.o.buzz)-avg(b.o.buzz))[0];
    const most=[...rows].sort((a,b)=>b.o.cells-a.o.cells)[0];
    const aw=[]; if(most && most.o.cells) aw.push({title:'ملك الخلية',icon:'hive',desc:'أكثر خلايا لوّنها',team:most.t,value:`${most.o.cells} خلية`});
    if(fast) aw.push({title:'أسرع إصبع',icon:'whistle',desc:'أسرع بز بالمتوسط من قراءة السؤال',team:fast.t,value:`${sec(avg(fast.o.buzz))} ث`});
    const max=Math.max(1,...rows.map(r=>r.o.cells));
    el.innerHTML=`<div class="ms"><div class="ms-head"><h2>وش صار بالخلية</h2><span class="muted">${G.round} جولات</span></div>${awardsHTML(aw)}
      <section class="ms-card"><h3>الخلايا اللي لوّنها كل فريق</h3><div class="viz-bars">${rows.map(r=>`<div class="vb-row"><span class="vb-name"><i style="--c:${r.t.color}"></i>${esc(r.t.name)}</span><span class="vb-track"><span class="vb-bar" style="width:${(r.o.cells/max*100).toFixed(1)}%"><span class="vb-seg" style="flex:1;background:${r.t.color}"></span></span></span><span class="vb-val">${r.o.cells}</span></div>`).join('')}</div></section>
      <section class="ms-card"><h3>الأرقام كاملة</h3><div class="viz-table-wrap"><table class="viz-table"><thead><tr><th>الفريق</th><th>جولات</th><th>خلايا</th><th>إجابات صح</th><th>غلط</th><th>متوسط البز</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="vt-team"><i style="--c:${r.t.color}"></i>${esc(r.t.name)}</span></td><td class="num">${r.t.wins}</td><td class="num">${r.o.cells}</td><td class="num">${r.o.ok}</td><td class="num">${r.o.wrong}</td><td class="num">${r.o.buzz.length?sec(avg(r.o.buzz))+' ث':'—'}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  }

  return { awards, renderAlf, renderKhaliya, avg };
})();
