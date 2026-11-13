/* ===== دحوم — أدوات الرسم (مشتركة بين الشاشة والجوال) =====
   لوحة = قائمة عمليات (خطوط وتعبئات) تنرسم بنفس الشكل على أي مقاس، عشان الرسمة تطلع نفسها بالجوال والشاشة.
   فرش: قلم، قطن (ناعم)، نيون، فلوماستر (شفاف)، ممحاة · أشكال: حر، خط، مربع، دائرة · دلو تعبئة · شفافية · لون حر.
*/
window.DahoomDraw = (function(){
  const COLORS = ['#111111','#FFFFFF','#E53935','#FB8C00','#FDD835','#43A047','#00ACC1','#1E88E5','#8E24AA','#EC407A','#8D6E63','#90A4AE'];
  const SIZES = [0.006, 0.012, 0.024, 0.05];
  const BRUSHES = [['pen','قلم'],['soft','قطن'],['neon','نيون'],['marker','فلوماستر'],['eraser','ممحاة']];
  const SHAPES = [['free','حر'],['line','خط'],['rect','مربع'],['oval','دائرة']];
  const isHex = c => /^#[0-9A-Fa-f]{6}$/.test(c);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, +v||0));
  const rgb = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];

  // ---------- رسم خط/شكل كامل بمسار واحد (عشان الشفافية ما تتراكم عند المفاصل) ----------
  function paint(ctx, W, H, st){
    const p=st.p; if(!p || p.length<2) return;
    const lw=Math.max(1, st.w*W), c = st.b==='eraser' ? '#FFFFFF' : st.c, a = st.b==='eraser' ? 1 : st.a;
    const path=()=>{
      ctx.beginPath();
      const x0=p[0]*W, y0=p[1]*H, x1=p[p.length-2]*W, y1=p[p.length-1]*H;
      if(st.s==='line'){ ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); }
      else if(st.s==='rect'){ ctx.rect(Math.min(x0,x1), Math.min(y0,y1), Math.abs(x1-x0), Math.abs(y1-y0)); }
      else if(st.s==='oval'){ ctx.ellipse((x0+x1)/2, (y0+y1)/2, Math.max(1,Math.abs(x1-x0)/2), Math.max(1,Math.abs(y1-y0)/2), 0, 0, Math.PI*2); }
      else { ctx.moveTo(x0,y0); if(p.length===2) ctx.lineTo(x0+0.01,y0); for(let i=2;i<p.length;i+=2) ctx.lineTo(p[i]*W, p[i+1]*H); }
    };
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=c; ctx.lineWidth=lw; ctx.globalAlpha=a;
    if(st.b==='soft'){ ctx.globalAlpha=a*0.55; ctx.shadowColor=c; ctx.shadowBlur=lw*1.3; path(); ctx.stroke(); }
    else if(st.b==='neon'){ ctx.shadowColor=c; ctx.shadowBlur=lw*2.4; path(); ctx.stroke(); ctx.stroke();
      ctx.shadowBlur=0; ctx.strokeStyle='#FFFFFF'; ctx.globalAlpha=a*0.85; ctx.lineWidth=Math.max(1,lw*0.35); path(); ctx.stroke(); }
    else if(st.b==='marker'){ ctx.globalAlpha=a*0.45; ctx.lineWidth=lw*1.7; ctx.lineCap='butt'; path(); ctx.stroke(); }
    else { path(); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- دلو التعبئة ----------
  function flood(ctx, W, H, fx, fy, color, alpha){
    const x0=Math.floor(clamp(fx,0,0.9999)*W), y0=Math.floor(clamp(fy,0,0.9999)*H);
    const img=ctx.getImageData(0,0,W,H), d=img.data, seen=new Uint8Array(W*H);
    const i0=(y0*W+x0)*4, tr=d[i0], tg=d[i0+1], tb=d[i0+2], [cr,cg,cb]=rgb(color), TOL=96;
    if(alpha>=0.99 && Math.abs(tr-cr)+Math.abs(tg-cg)+Math.abs(tb-cb)<12) return;
    const match=k=>{ const i=k*4; return Math.abs(d[i]-tr)+Math.abs(d[i+1]-tg)+Math.abs(d[i+2]-tb) <= TOL; };
    const put=k=>{ const i=k*4; d[i]=d[i]*(1-alpha)+cr*alpha; d[i+1]=d[i+1]*(1-alpha)+cg*alpha; d[i+2]=d[i+2]*(1-alpha)+cb*alpha; d[i+3]=255; };
    const stack=[y0*W+x0]; seen[y0*W+x0]=1;
    while(stack.length){
      const k=stack.pop(), y=(k/W)|0; let xl=k-y*W, xr=xl;
      while(xl>0 && !seen[y*W+xl-1] && match(y*W+xl-1)){ xl--; seen[y*W+xl]=1; }
      while(xr<W-1 && !seen[y*W+xr+1] && match(y*W+xr+1)){ xr++; seen[y*W+xr]=1; }
      for(let x=xl;x<=xr;x++){
        put(y*W+x);
        if(y>0){ const u=(y-1)*W+x; if(!seen[u] && match(u)){ seen[u]=1; stack.push(u); } }
        if(y<H-1){ const n=(y+1)*W+x; if(!seen[n] && match(n)){ seen[n]=1; stack.push(n); } }
      }
    }
    ctx.putImageData(img,0,0);
  }

  // ---------- اللوحة ----------
  function board(canvas){
    const ctx=canvas.getContext('2d', { willReadFrequently:true });
    const base=document.createElement('canvas'), bctx=base.getContext('2d', { willReadFrequently:true });
    let ops=[], live=null;
    const size=()=>{ if(base.width!==canvas.width || base.height!==canvas.height){ base.width=canvas.width; base.height=canvas.height; return true; } return false; };
    const W=()=>canvas.width, H=()=>canvas.height;
    const render=()=>{ ctx.drawImage(base,0,0); if(live) paint(ctx,W(),H(),live); };
    const commit=()=>{ if(live){ paint(bctx,W(),H(),live); live=null; } };
    function rebuild(){ size(); live=null; bctx.fillStyle='#FFFFFF'; bctx.fillRect(0,0,W(),H());
      ops.forEach(o=> o.fill ? flood(bctx,W(),H(),o.x,o.y,o.c,o.a) : paint(bctx,W(),H(),o)); render(); }
    function stroke(d){
      if(!d || !Array.isArray(d.p) || d.p.length<2) return null;
      const pts=d.p.slice(0,600).map(v=>clamp(v,0,1)), id=String(d.id).slice(0,30);
      let st=ops.find(o=>!o.fill && o.id===id);
      if(!st){ if(ops.length>=1500) return null; commit();
        st={ id, c:isHex(d.c)?d.c:'#111111', w:clamp(d.w||0.012,0.003,0.08), a:clamp(d.a==null?1:d.a,0.1,1),
          b:BRUSHES.some(x=>x[0]===d.b)?d.b:'pen', s:SHAPES.some(x=>x[0]===d.s)?d.s:'free', p:[] };
        ops.push(st); live=st; }
      if(st.p.length<6000) st.p.push(...pts);
      if(st===live) render(); else rebuild();
      return st;
    }
    function fill(d){ if(!d || ops.length>=1500) return; commit();
      const o={ fill:1, x:clamp(d.x,0,1), y:clamp(d.y,0,1), c:isHex(d.c)?d.c:'#111111', a:clamp(d.a==null?1:d.a,0.1,1) };
      ops.push(o); flood(bctx,W(),H(),o.x,o.y,o.c,o.a); render(); }
    const undo=()=>{ if(!ops.length) return false; ops.pop(); rebuild(); return true; };
    const clear=()=>{ ops=[]; rebuild(); };
    const load=list=>{ ops=[]; rebuild(); (list||[]).forEach(o=> o.fill ? fill(o) : stroke(o)); commit(); render(); };
    rebuild();
    return { stroke, fill, undo, clear, load, rebuild, get ops(){ return ops; }, get count(){ return ops.length; } };
  }

  // ---------- شريط الأدوات ----------
  // tool: { c, w, a, b, s, fill } — ينعدل مباشرة
  function newTool(){ return { c:COLORS[0], w:SIZES[1], a:1, b:'pen', s:'free', fill:false }; }
  function toolbar(el, tool, { onUndo, onClear, tap }={}){
    const hit=()=>{ if(tap) tap(); };
    el.innerHTML=`
      <div class="dr-row">${BRUSHES.map(([k,n])=>`<button type="button" class="dr-chip" data-b="${k}">${n}</button>`).join('')}<button type="button" class="dr-chip dr-fill" data-fill>دلو</button></div>
      <div class="dr-row">${SHAPES.map(([k,n])=>`<button type="button" class="dr-chip alt" data-s="${k}">${n}</button>`).join('')}<span class="dr-gap"></span>${SIZES.map((w,i)=>`<button type="button" class="dr-size" data-w="${w}" aria-label="حجم ${i+1}"><i style="--s:${5+i*6}px"></i></button>`).join('')}</div>
      <div class="dr-row">${COLORS.map(c=>`<button type="button" class="dr-sw" style="--c:${c}" data-c="${c}" aria-label="لون"></button>`).join('')}<label class="dr-free" title="لون حر"><input type="color" value="${tool.c}"><span>لون حر</span></label></div>
      <div class="dr-row"><label class="dr-alpha">الشفافية <input type="range" min="10" max="100" step="5" value="${Math.round(tool.a*100)}"><b>${Math.round(tool.a*100)}%</b></label><button type="button" class="dr-chip alt" data-undo>تراجع</button><button type="button" class="dr-chip alt" data-clear>مسح الكل</button></div>`;
    const q=s=>[...el.querySelectorAll(s)];
    const mark=()=>{
      q('[data-b]').forEach(b=>b.classList.toggle('on', !tool.fill && b.dataset.b===tool.b));
      q('[data-fill]').forEach(b=>b.classList.toggle('on', tool.fill));
      q('[data-s]').forEach(b=>b.classList.toggle('on', b.dataset.s===tool.s));
      q('[data-w]').forEach(b=>b.classList.toggle('on', +b.dataset.w===tool.w));
      q('[data-c]').forEach(b=>b.classList.toggle('on', b.dataset.c.toLowerCase()===tool.c.toLowerCase()));
      const fr=el.querySelector('.dr-free'); fr.style.setProperty('--c', tool.c); fr.classList.toggle('on', !COLORS.some(c=>c.toLowerCase()===tool.c.toLowerCase()));
    };
    q('[data-b]').forEach(b=>b.onclick=()=>{ tool.b=b.dataset.b; tool.fill=false; hit(); mark(); });
    q('[data-fill]').forEach(b=>b.onclick=()=>{ tool.fill=true; hit(); mark(); });
    q('[data-s]').forEach(b=>b.onclick=()=>{ tool.s=b.dataset.s; tool.fill=false; hit(); mark(); });
    q('[data-w]').forEach(b=>b.onclick=()=>{ tool.w=+b.dataset.w; hit(); mark(); });
    q('[data-c]').forEach(b=>b.onclick=()=>{ tool.c=b.dataset.c; if(tool.b==='eraser') tool.b='pen'; hit(); mark(); });
    const free=el.querySelector('.dr-free input'); free.oninput=()=>{ tool.c=free.value; if(tool.b==='eraser') tool.b='pen'; mark(); };
    const al=el.querySelector('.dr-alpha input'); al.oninput=()=>{ tool.a=al.value/100; el.querySelector('.dr-alpha b').textContent=al.value+'%'; };
    el.querySelector('[data-undo]').onclick=()=>{ hit(); if(onUndo) onUndo(); };
    el.querySelector('[data-clear]').onclick=()=>{ hit(); if(onClear) onClear(); };
    mark();
  }

  // ---------- ربط اللمس/الماوس باللوحة ----------
  // out(msg): يرسل العملية للطرف الثاني (الجوال ← الشاشة، أو الشاشة ← جوالات المتفرجين). enabled(): يسمح بالرسم؟
  function attach(canvas, B, tool, out, enabled){
    let cur=null, pend=[], timer=0;
    const pt=e=>{ const r=canvas.getBoundingClientRect(); return [ +clamp((e.clientX-r.left)/r.width,0,1).toFixed(4), +clamp((e.clientY-r.top)/r.height,0,1).toFixed(4) ]; };
    const flush=()=>{ timer=0; if(cur && pend.length){ out({ t:'stroke', id:cur.id, c:cur.c, w:cur.w, a:cur.a, b:cur.b, s:cur.s, p:pend }); pend=[]; } };
    canvas.addEventListener('pointerdown', e=>{
      if(enabled && !enabled()) return; e.preventDefault(); try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
      const p=pt(e);
      if(tool.fill){ const m={ t:'fill', x:p[0], y:p[1], c:tool.c, a:tool.a }; B.fill(m); out(m); return; }
      const d={ id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), c:tool.c, w:tool.w, a:tool.a, b:tool.b, s:tool.s, p };
      cur=B.stroke(d); if(!cur) return; pend=[...p]; flush();
    });
    canvas.addEventListener('pointermove', e=>{
      if(!cur) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      (evs.length?evs:[e]).forEach(ev=>{ const p=pt(ev), q=cur.p; if(Math.hypot(p[0]-q[q.length-2], p[1]-q[q.length-1])<0.003) return; B.stroke({ id:cur.id, p }); pend.push(...p); });
      if(!timer) timer=setTimeout(flush,45);
    });
    const end=()=>{ if(!cur) return; clearTimeout(timer); flush(); cur=null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  return { COLORS, SIZES, BRUSHES, SHAPES, paint, flood, board, newTool, toolbar, attach };
})();
