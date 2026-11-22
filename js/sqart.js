/* ===== بطاقات «ما أصدقك» — أسلوب ورق اللعب المقلوب =====
   أشكال مسطّحة بحواف حادة وألوان قليلة. الشخصية فوق، ونفسها مقلوبة تحت (مثل ورق الشايب والبنت)،
   وبالنص رمز أبيض كبير. خطوط مشعّة ودوائر من مركزين، وملمس طباعة نقطي، وحافة عاجية.
   كل شخصية تمسك شي أبيض قدام وجهها (ورقة، جوال، كاميرا…) — هذي توقيع البطاقات.
   DahoomSqArt.portrait(k)  → الرسمة (SVG كامل للبطاقة)
   DahoomSqArt.card(k, o)   → البطاقة (o.name)
   DahoomSqArt.back()       → ظهر البطاقة
*/
window.DahoomSqArt = (function(){
  const INK='#16110D', WHITE='#F4EFE5', WHITE_SH='#CFC5B3', CREAM='#EDE6D6';
  const SKIN={ tajer:['#D7A06E','#A7683F'], wasta:['#E0AE84','#B07A55'], muhami:['#D9A578','#A86E45'], harami:['#B98258','#8A5A36'], shurti:['#C98E5F','#96623B'], faddah:['#DCA77A','#A9744B'], dallal:['#C08A60','#8E5E3A'] };
  const BG ={ tajer:'#3A2B10', wasta:'#0F2E20', muhami:'#3A2718', harami:'#151A2D', shurti:'#0E2140', faddah:'#38122D', dallal:'#3D1612' };
  const RAY={ tajer:['#E7B53E','#F08A2E'], wasta:['#4FD39A','#C9E86A'], muhami:['#D9A441','#E07A3A'], harami:['#8EA2F0','#C7B8FF'], shurti:['#5AB4FF','#FF5A5A'], faddah:['#FF7EC7','#FFC36B'], dallal:['#FF8A5C','#FFD166'] };
  const COL={ tajer:'#D9961A', wasta:'#2E9E5B', muhami:'#8A5A2B', harami:'#5E6680', shurti:'#2478C8', faddah:'#D5489A', dallal:'#E2563F' };
  const NUM={ tajer:'١', wasta:'٢', muhami:'٣', harami:'٤', shurti:'٥', faddah:'٦', dallal:'٧' };
  let N=0;
  const P=(pts, f)=>`<polygon points="${pts}" fill="${f}"/>`;

  // ---------- الخلفية: خطوط مشعّة ودوائر (ثابتة لكل شخصية عشان ما تتغيّر كل مرة) ----------
  function rays(k, cx, cy, salt=''){
    const [a,b]=RAY[k]; let s=7; for(const ch of k+salt) s=(s*31+ch.charCodeAt(0))%9973;
    const rnd=()=>{ s=(s*16807)%2147483647; return (s%1000)/1000; };
    let out='';
    for(let i=0;i<20;i++){ const t=i/20*Math.PI*2+(rnd()-.5)*.16, L=60+rnd()*70;
      out+=`<path d="M${cx} ${cy}L${(cx+L*Math.cos(t)).toFixed(1)} ${(cy+L*Math.sin(t)).toFixed(1)}" stroke="${i%3?a:b}" stroke-width="${[.3,.45,.6][i%3]}" opacity=".7"/>`; }
    return out + [11,19,28].map(r=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${r===11?b:a}" stroke-width=".45" opacity=".65"/>`).join('');
  }

  // ---------- الجسم ----------
  const sleeve = f => P('57,40 64,48 41,59 34,55', f);
  const BODY = {
    bisht: (trim) => P('56,31 93,33 100,72 52,74 46,57', INK) + P('74,33 93,33 100,72 84,73', '#241B15') + P('66,36 81,37 73,60', WHITE) + P('73,37 81,37 73,60', WHITE_SH)
      + `<path d="M66 36L71 73M81 37L85 73" stroke="${trim}" stroke-width="1.7"/>` + sleeve(INK) + `<path d="M41 59L34 55" stroke="${trim}" stroke-width="1.2"/>`,
    thobe: () => P('56,31 93,33 100,72 52,74 46,57', WHITE) + P('76,33 93,33 100,72 86,73', WHITE_SH) + `<path d="M70 36L73 50L77 36" stroke="${WHITE_SH}" stroke-width="1" fill="none"/>` + sleeve(WHITE) + P('41,59 34,55 37,53 43,57', WHITE_SH),
    abaya: (trim) => P('55,30 93,32 100,72 52,74 45,56', '#120E16') + P('76,32 93,32 100,72 86,73', '#231C2A') + sleeve('#120E16') + (trim ? `<path d="M41 59L34 55M58 31L52 74" stroke="${trim}" stroke-width="1.1"/>` : ''),
    hoodie: () => P('55,30 93,32 100,72 52,74 45,56', '#232838') + P('76,32 93,32 100,72 86,73', '#1A1E2B') + sleeve('#232838') + `<path d="M64 40L68 60M84 41L88 62" stroke="#141826" stroke-width="1"/>`,
    uniform: () => P('56,31 93,33 100,72 52,74 46,57', '#2D5C8F') + P('76,33 93,33 100,72 86,73', '#234A75') + P('67,35 80,36 73,47', '#E9EEF5') + P('59,33 68,32 67,35 58,36', '#E3A43A') + P('84,33 93,34 92,37 84,36', '#E3A43A')
      + `<path d="M72 48V70" stroke="#1C3A5E" stroke-width=".8"/><circle cx="72.6" cy="53" r=".9" fill="#E3A43A"/><circle cx="72.8" cy="59" r=".9" fill="#E3A43A"/>` + sleeve('#2D5C8F'),
  };

  // ---------- الراس ----------
  const FACE = (k) => { const [s,d]=SKIN[k]; return P('64.5,16 78,14.5 80.5,25 77,33.5 70,35 64,27', s) + P('74.5,14.8 78,14.5 80.5,25 77,33.5 74,30', d) + P('70.6,22.2 72.6,27.2 70.2,27.6', d); };
  const EYE = (x=68.6, y=21.5) => `<ellipse cx="${x}" cy="${y}" rx="1.15" ry=".85" fill="${INK}"/>` + P(`${x-2.6},${y-2.2} ${x+2.9},${y-2.9} ${x+2.7},${y-1.9} ${x-2.4},${y-1.3}`, INK);
  const EYE2 = (x=76.2, y=20.6) => `<ellipse cx="${x}" cy="${y}" rx=".9" ry=".8" fill="${INK}"/>`;
  const ghutra = f => P('60,9 86,6 94,31 85,45 79,34 66,31 59,19', f) + P('81,7 86,6 94,31 85,45 83,30', 'rgba(0,0,0,.18)') + P('63.6,17.2 79,15 78.6,17.4 63.8,19.6', f);
  const igal = `<path d="M62 13.5L87 10M61.5 16.6L87.5 13.2" stroke="${INK}" stroke-width="2.1"/>`;
  const beard = P('64,27 69,32 77,33 79.5,27 78,37 70,39 65,33', INK);
  const mous = P('67,27.6 75.6,26.6 76.6,28.6 72,28.3 66.6,29.3', INK);
  const hood = (f, sh) => P('59,9 84,5 93,22 96,44 86,47 80,34 66,32 57,20', f) + P('80,6 84,5 93,22 96,44 86,47 84,30', sh) + P('63.4,17.4 79,15 78.6,17.8 63.8,19.8', f) + P('63,27 69,35.5 77,34.6 80.4,26 80.6,36.5 70,39.4 61.8,31', f);

  // ---------- الأيادي ----------
  const handL = k => { const [s,d]=SKIN[k]; return P('36,50 28,47 21,48 21,51 28,51.5 24,55 31,57.5 38,55', s) + P('31,57.5 38,55 36,52 30,54', d); };
  const handR = (k, f) => { const [s]=SKIN[k]; return P('60,56 70,52 74,57 66,62', f) + P('66,57 62,61 64,64 70,61', s); };

  // ---------- الشخصيات: head + body + الشي الأبيض اللي قدام الوجه ----------
  const ROLES = {
    tajer: { body:()=>BODY.bisht('#E8B04A'),
      head:k=>ghutra(WHITE)+FACE(k)+EYE()+beard+mous+igal,
      // رزمة ريالات مفرودة قدام فمه
      prop:()=>[[-14,0],[-6,0],[2,0]].map(([r])=>`<g transform="rotate(${r} 66 31)"><rect x="55" y="24" width="24" height="10" rx=".6" fill="${WHITE}"/><rect x="57" y="26" width="20" height="6" fill="none" stroke="${WHITE_SH}" stroke-width=".6"/><circle cx="67" cy="29" r="1.8" fill="none" stroke="${WHITE_SH}" stroke-width=".6"/></g>`).join(''),
      hands:k=>handL(k)+handR(k, INK),
      // ريال كبير بنجمة
      sym:(b)=>`<circle cx="50" cy="70" r="15" fill="${WHITE}"/><circle cx="50" cy="70" r="12" fill="none" stroke="${b}" stroke-width="1.2"/>`
        + `<path d="M50 61L52.4 67.6L59 70L52.4 72.4L50 79L47.6 72.4L41 70L47.6 67.6Z" fill="${b}"/>` + [0,45,90,135,180,225,270,315].map(a=>`<circle cx="50" cy="56.6" r=".8" fill="${b}" transform="rotate(${a} 50 70)"/>`).join('') },
    wasta: { body:()=>BODY.abaya('#E3A43A'),
      head:k=>hood('#15111A','#241C2C')+FACE(k).replace(/<polygon points="64.5,16[^>]*>/,'')+P('64.8,17 78,15.6 80.2,25 77,32.8 70,34.2 64.4,27', SKIN[k][0])+P('74.5,15.8 78,15.6 80.2,25 77,32.8 74,29.5', SKIN[k][1])
        + P('64.8,19.6 72.6,18.6 72.2,22.4 66,23', INK) + P('73.4,18.5 78.8,17.8 78.4,21.6 73.2,22.2', INK) + `<path d="M66.4 20.4L69.6 20" stroke="rgba(255,255,255,.5)" stroke-width=".6"/>` + P('68.4,29.2 72.6,28.6 71.2,30.4', '#B23A4A')
        + hood('#15111A','#241C2C').replace(/<polygon points="59,9[^>]*>|<polygon points="80,6[^>]*>/g,''),
      // جوال أبيض كبير على أذنها
      prop:()=>`<g transform="rotate(14 84 22)"><rect x="80" y="9" width="9" height="22" rx="2" fill="${WHITE}"/><rect x="81.6" y="11.4" width="5.8" height="15" rx=".8" fill="${WHITE_SH}"/></g>`,
      hands:k=>handL(k)+P('79,30 86,28 88,34 82,37', SKIN.wasta[0])+`<path d="M80 35.5L87 33.5" stroke="#E3A43A" stroke-width="1"/>`+handR(k,'#120E16'),
      // مفتاح (الواسطة تفتح الأبواب)
      sym:(b)=>`<circle cx="50" cy="55" r="9" fill="${WHITE}"/><circle cx="50" cy="55" r="3.6" fill="${b}"/><rect x="48.2" y="62" width="3.6" height="28" fill="${WHITE}"/><rect x="51.6" y="80" width="6" height="3" fill="${WHITE}"/><rect x="51.6" y="85.5" width="4.4" height="3" fill="${WHITE}"/>`
        + `<path d="M44 55H56" stroke="${b}" stroke-width=".6" opacity=".6"/>` },
    muhami: { body:()=>BODY.bisht('#C9CED8'),
      head:k=>ghutra(WHITE)+FACE(k)+EYE()+beard+igal+`<circle cx="68.8" cy="21.6" r="2.6" fill="none" stroke="#E3A43A" stroke-width=".7"/><circle cx="75.6" cy="20.8" r="2.3" fill="none" stroke="#E3A43A" stroke-width=".7"/><path d="M71.4 21.3L73.3 21" stroke="#E3A43A" stroke-width=".6"/>`,
      // وثيقة مختومة قدام فمه
      prop:()=>P('57,25 84,19 86,26 59,32', WHITE)+P('84,19 86,26 83,26.5', WHITE_SH)+`<path d="M62 27.6L80 23.6M63 29.4L76 26.6" stroke="${WHITE_SH}" stroke-width=".5"/><circle cx="59.5" cy="29" r="3" fill="#B8323A"/><circle cx="59.5" cy="29" r="1.6" fill="#8E2229"/>`,
      hands:k=>handL(k)+handR(k, INK),
      // الميزان
      sym:()=>`<g fill="${WHITE}"><polygon points="48.8,44 51.2,44 51.6,92 48.4,92"/><polygon points="47,44 53,44 50,40"/><polygon points="29,59.5 71,59.5 69,63 31,63"/>
        <path d="M31 62.5L25.5 80M31 62.5L36.5 80M69 62.5L63.5 80M69 62.5L74.5 80" stroke="${WHITE}" stroke-width=".7"/><path d="M23 80H39A8 6 0 0 1 23 80Z"/><path d="M61 80H77A8 6 0 0 1 61 80Z"/><polygon points="39,96 61,96 57,91 43,91"/></g>` },
    harami: { body:()=>BODY.hoodie(),
      head:k=>P('59,9 82,7 88,20 86,36 74,41 63,35 57,20', '#1F2333')+P('78,8 82,7 88,20 86,36 82,30', '#2C3247')+P('63.4,18.4 81,16.2 81.4,22.4 63.8,24.4', SKIN[k][0])+P('77,16.6 81,16.2 81.4,22.4 77.2,22.9', SKIN[k][1])
        + `<ellipse cx="68.4" cy="20.6" rx="1.3" ry="1" fill="${INK}"/><ellipse cx="76.4" cy="19.8" rx="1.2" ry=".95" fill="${INK}"/><circle cx="68" cy="20.2" r=".35" fill="#fff"/><circle cx="76" cy="19.4" r=".35" fill="#fff"/>`
        + P('64,16.6 71.6,17.2 71.4,18.2 64.2,18', INK)+P('73.6,17.2 80.6,15.2 80.8,16.2 73.8,18.3', INK),
      // صرّة فلوس بيضا قدام ذقنه
      prop:()=>`<path d="M60 26C56 26 54.6 31 55.6 35C56.8 39.6 66.4 39.6 67.6 35C68.6 31 66.8 26 63 26Z" fill="${WHITE}"/><path d="M58.6 26.4Q61.6 23.8 64.4 26.4" stroke="${WHITE_SH}" stroke-width="1.2" fill="none"/><circle cx="61.6" cy="33" r="1.8" fill="none" stroke="${WHITE_SH}" stroke-width=".6"/>`,
      hands:k=>handL(k)+handR(k, '#232838'),
      // هلال ونجمة
      sym:(b)=>`<path d="M58 54A17 17 0 1 0 58 86A13 13 0 1 1 58 54Z" fill="${WHITE}"/><path d="M58 66L59.3 69.6L63 70L60.1 72.3L61.1 76L58 73.9L54.9 76L55.9 72.3L53 70L56.7 69.6Z" fill="${WHITE}"/>` },
    shurti: { body:()=>BODY.uniform(),
      head:k=>FACE(k)+P('77.6,18 80.6,17.4 81.4,24 78.6,24.8', SKIN[k][1])+EYE()+EYE2()+mous
        + P('62,10 84,7 86.4,14 62,17.4', '#1A2B4C')+P('62,15 86.4,12.4 86.8,15 62.4,17.8', '#0F1A30')+P('60,17.6 87.4,14.4 88.4,16.6 62,20.2', INK)
        + `<path d="M74 8.6L74.9 10.6L77 10.8L75.4 12.2L75.9 14.2L74 13.1L72.1 14.2L72.6 12.2L71 10.8L73.1 10.6Z" fill="#E3A43A"/>`,
      // دفتر مخالفات أبيض وقلم
      prop:()=>`<g transform="rotate(-10 61 31)"><rect x="54" y="23" width="14" height="17" rx=".8" fill="${WHITE}"/><rect x="54" y="23" width="14" height="3.2" fill="#C8323A"/><path d="M56 29.5H66M56 32.5H65M56 35.5H63" stroke="${WHITE_SH}" stroke-width=".6"/></g><path d="M67 40L72 30" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`,
      hands:k=>handL(k)+handR(k, '#2D5C8F'),
      // نجمة الشارة
      sym:(b)=>`<g transform="translate(50 70)"><rect x="-11" y="-11" width="22" height="22" fill="${WHITE}"/><rect x="-11" y="-11" width="22" height="22" fill="${WHITE}" transform="rotate(45)"/>`
        + `<circle r="9" fill="none" stroke="${b}" stroke-width="1"/><path d="M0 -6L1.8 -1.9L6 -1.6L2.8 1.2L3.7 5.4L0 3.2L-3.7 5.4L-2.8 1.2L-6 -1.6L-1.8 -1.9Z" fill="${b}"/></g>` },
    faddah: { body:()=>BODY.bisht('#FF7EC7'),
      head:(k,u)=>`<defs><pattern id="${u}sh" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><rect width="2.4" height="2.4" fill="#C42F36"/><rect width="1.2" height="1.2" fill="#F4E9E0"/></pattern></defs>`
        + ghutra(`url(#${u}sh)`)+FACE(k)+EYE2(76.4,20.6)+P('73.6,18.4 79.4,17 79.2,18 73.8,19.3', INK)+mous+igal,
      // كاميرا بيضا على عينه
      prop:()=>`<g transform="rotate(-6 66 22)"><rect x="56" y="15.5" width="17" height="12" rx="1.4" fill="${WHITE}"/><rect x="58" y="13.4" width="5" height="2.6" fill="${WHITE}"/><rect x="56" y="24" width="17" height="3.5" fill="${WHITE_SH}"/>
        <circle cx="65.5" cy="21.4" r="4.2" fill="${INK}"/><circle cx="65.5" cy="21.4" r="2.6" fill="#3B3346"/><circle cx="64.5" cy="20.4" r=".9" fill="#fff"/><rect x="69.4" y="16.8" width="2.4" height="1.6" fill="#FFD166"/></g>`
        + `<path d="M52 8L53.4 13L58 12.2L54.4 15.6L57 19.6L52.6 17.4L49 21L49.8 16.2L45.4 14.4L50.2 13.4Z" fill="#FFD166"/>`,
      hands:k=>handL(k)+P('55,26 59,24 60,30 56,31', SKIN.faddah[0])+handR(k, INK),
      // عين
      sym:(b)=>`<path d="M27 70Q50 50 73 70Q50 90 27 70Z" fill="${WHITE}"/><circle cx="50" cy="70" r="8.6" fill="${b}"/><circle cx="50" cy="70" r="4" fill="${INK}"/><circle cx="47.6" cy="67.6" r="1.6" fill="#fff"/>`
        + [-60,-30,0,30,60].map(a=>`<path d="M50 50V44" stroke="${WHITE}" stroke-width="1.4" transform="rotate(${a} 50 70)"/>`).join('') },
    dallal: { body:()=>BODY.abaya(''),
      head:k=>hood('#1C1520','#2B2130')+P('64.8,17 78,15.6 80.2,25 77,32.8 70,34.2 64.4,27', SKIN[k][0])+P('74.5,15.8 78,15.6 80.2,25 77,32.8 74,29.5', SKIN[k][1])
        + `<ellipse cx="67.6" cy="21.4" rx=".95" ry=".8" fill="${INK}"/><ellipse cx="75.4" cy="20.6" rx=".9" ry=".75" fill="${INK}"/>`
        + `<g fill="#E7B53E"><polygon points="64.4,17.6 79.4,16 79.6,18.6 64.6,20.2"/><polygon points="70.4,19.6 72.6,19.4 72.9,27.4 70.8,27.6"/><polygon points="64.6,23 70.4,22.6 70.7,27.4 66.4,26.6"/><polygon points="72.6,22.4 79.4,21.6 78.8,25.8 72.9,27.2"/></g>`
        + `<ellipse cx="71.4" cy="30.8" rx="1.7" ry="1.3" fill="#5a2620"/>`
        + hood('#1C1520','#2B2130').replace(/<polygon points="59,9[^>]*>|<polygon points="80,6[^>]*>/g,''),
      // قماش أبيض ينسدل من يدها المرفوعة
      prop:()=>`<path d="M28 47C26 36 34 28 40 22C46 16 52 16 56 22C52 22 46 26 44 34C42 42 38 50 34 54Z" fill="${WHITE}"/><path d="M40 24C44 22 48 22 52 23M38 32C40 30 42 29 44 29" stroke="${WHITE_SH}" stroke-width=".7" fill="none"/>`,
      hands:k=>handL(k)+handR(k, '#120E16'),
      // بطاقة سعر معلّقة
      sym:(b)=>`<path d="M50 44C46 48 47 52 50 54" stroke="${WHITE}" stroke-width="1" fill="none"/><polygon points="50,52 61,60 61,92 39,92 39,60" fill="${WHITE}"/><circle cx="50" cy="59" r="2.2" fill="${b}"/>`
        + `<circle cx="50" cy="76" r="7.5" fill="${b}"/><circle cx="50" cy="76" r="5.6" fill="none" stroke="${WHITE}" stroke-width=".8"/><path d="M50 72.4L51.1 75L53.6 76L51.1 77L50 79.6L48.9 77L46.4 76L48.9 75Z" fill="${WHITE}"/>` },
  };

  function portrait(k){
    const R=ROLES[k]; if(!R) return '';
    const u='sqc'+(++N), bg=BG[k], [ra,rb]=RAY[k];
    const fig = R.body() + R.head(k, u) + R.prop() + R.hands(k);
    return `<svg class="sq-art" viewBox="0 0 100 140" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs>
        <pattern id="${u}h" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><circle cx=".8" cy=".8" r=".28" fill="rgba(0,0,0,.22)"/></pattern>
        <clipPath id="${u}c"><rect x="4" y="4" width="92" height="132" rx="5"/></clipPath><g id="${u}f">${fig}</g></defs>
      <rect width="100" height="140" fill="${CREAM}"/>
      <g clip-path="url(#${u}c)"><rect width="100" height="140" fill="${bg}"/>${rays(k,30,46)}${rays(k,70,94,'z')}
        <use href="#${u}f"/><use href="#${u}f" transform="rotate(180 50 70)"/>${R.sym(ra)}<rect width="100" height="140" fill="url(#${u}h)"/></g></svg>`;
  }
  const esc = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function card(k, o){
    if(typeof o==='string') o={ name:o, color:arguments[2] };
    o=o||{};
    return `<span class="sqc tarot court" style="--rc:${o.color||COL[k]||'#555'};--rl:${(RAY[k]||[CREAM])[0]}">${portrait(k)}<span class="sqc-num"><b>${NUM[k]||''}</b></span><span class="sqc-plate">${esc(o.name)}</span></span>`;
  }
  // الظهر: نفس اللغة — خطوط مشعّة من النص وميدالية «ص» مقلوبة ومتناظرة
  function back(){
    const u='sqb'+(++N); let r='';
    for(let i=0;i<28;i++){ const t=i/28*Math.PI*2; r+=`<path d="M50 70L${(50+90*Math.cos(t)).toFixed(1)} ${(70+90*Math.sin(t)).toFixed(1)}" stroke="${i%2?'#E3B95A':'#E07A3A'}" stroke-width="${i%2?.5:.3}" opacity=".6"/>`; }
    return `<span class="sqc tarot court back"><svg class="sq-art" viewBox="0 0 100 140" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs>
        <pattern id="${u}h" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><circle cx=".8" cy=".8" r=".28" fill="rgba(0,0,0,.22)"/></pattern><clipPath id="${u}c"><rect x="4" y="4" width="92" height="132" rx="5"/></clipPath></defs>
      <rect width="100" height="140" fill="${CREAM}"/><g clip-path="url(#${u}c)"><rect width="100" height="140" fill="#3A0F1C"/>${r}
        ${[14,24,36].map(x=>`<circle cx="50" cy="70" r="${x}" fill="none" stroke="#E3B95A" stroke-width=".5" opacity=".7"/>`).join('')}
        <circle cx="50" cy="70" r="12" fill="${CREAM}"/><circle cx="50" cy="70" r="9.6" fill="none" stroke="#3A0F1C" stroke-width=".8"/>
        <text x="50" y="75.5" text-anchor="middle" font-size="14" fill="#3A0F1C" style="font-family:Lalezar,'IBM Plex Sans Arabic',sans-serif">ص</text>
        <rect width="100" height="140" fill="url(#${u}h)"/></g></svg></span>`;
  }
  return { portrait, card, back, has:k=>!!ROLES[k] };
})();
