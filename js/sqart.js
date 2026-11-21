/* ===== رسمات وبطاقات «ما أصدقك» =====
   الأسلوب: طباعة يدوية (لينو): خطوط حبر حول الشخصية، ظل بسيط، وملمس طباعة نقطي فوق الرسمة،
   وكل شخصية بمشهدها (سوق، مجلس، محكمة، سطوح بالليل…).
   DahoomSqArt.portrait(k)   → الرسمة لحالها (SVG)
   DahoomSqArt.card(k, o)    → بطاقة لعب كاملة: الاسم فوق، الرسمة بقوس، وصندوق الحركة تحت
   DahoomSqArt.back()        → ظهر البطاقة
*/
window.DahoomSqArt = (function(){
  const INK = '#1d1712', THOBE = '#F2EEE6', THOBE_SH = '#DCD5C8';
  const SKIN = { tajer:'#C98F63', wasta:'#B97A52', muhami:'#D6A27A', harami:'#A9714B', shurti:'#C08458', faddah:'#D3A079', dallal:'#B37750' };
  const BG   = { tajer:'#D9961A', wasta:'#2E9E5B', muhami:'#8A5A2B', harami:'#5E6680', shurti:'#2478C8', faddah:'#D5489A', dallal:'#E2563F' };
  let N = 0;   // أرقام فريدة للـ pattern داخل كل رسمة (لو تكررت وأول وحدة مخفية، المتصفح ما يرسمها)

  const shm = id => `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#C42F36"/><circle cx="1" cy="1" r=".75" fill="#F4E9E0"/><circle cx="3" cy="3" r=".55" fill="#F4E9E0"/></pattern>`;
  const body = (fill=THOBE) => `<path d="M16 140C18 116 35 103 60 103C85 103 102 116 104 140Z" fill="${fill}"/><path d="M36 140C38 127 43 117 50 110M84 140C82 127 77 117 70 110" stroke="rgba(0,0,0,.16)" stroke-width="1.4" fill="none"/>`;
  const collar = `<path d="M54.5 103.5L60 112L65.5 103.5" stroke="${THOBE_SH}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`;
  const neck = s => `<rect x="53" y="82" width="14" height="24" rx="5" fill="${s}"/>`;
  const ghBack = f => `<path d="M60 33C42 33 35.5 46 35.5 62C35.5 80 31 98 25 118L43 113C43.5 98 43.5 86 44 72L76 72C76.5 86 76.5 98 77 113L95 118C89 98 84.5 80 84.5 62C84.5 46 78 33 60 33Z" fill="${f}"/>
    <path d="M76 72C76.5 86 76.5 98 77 113L95 118C89 98 84.5 80 84.5 62C84.5 52 81 44 76 39C79 50 77.5 62 76 72Z" fill="rgba(0,0,0,.13)" stroke="none"/>`;
  const ghFront = f => `<path d="M43.6 62C43 50 50 44 60 44C70 44 77 50 76.4 62C70 56.6 50 56.6 43.6 62Z" fill="${f}"/>`;
  const igal = `<path d="M43 47.5C44 42.5 76 42.5 77 47.5" stroke="#17130f" stroke-width="2.6" fill="none"/><ellipse cx="60" cy="49.5" rx="17.8" ry="3.6" fill="none" stroke="#17130f" stroke-width="2.8"/>`;
  const face = s => `<ellipse cx="60" cy="68" rx="15.5" ry="18.5" fill="${s}"/><path d="M66 51C77 56 79 78 68 86C73 74 73 61 66 51Z" fill="rgba(90,35,10,.22)" stroke="none"/>`;
  const eyes = (dx=0) => `<ellipse cx="${54+dx}" cy="68" rx="1.9" ry="2.3" fill="${INK}" stroke="none"/><ellipse cx="${66+dx}" cy="68" rx="1.9" ry="2.3" fill="${INK}" stroke="none"/>`;
  const brows = (tilt=0) => `<path d="M50 ${63.5+tilt}Q54 61.5 57.5 63.2M62.5 63.2Q66 61.5 70 ${63.5+tilt}" stroke="#2a1d14" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const nose = `<path d="M60 69.5Q58.4 74 60.6 75.2" stroke="rgba(60,30,15,.5)" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  const beard = c => `<path d="M45.2 69C45.5 84 52 89 60 89C68 89 74.5 84 74.8 69C72.5 78 68 80.5 60 80.5C52 80.5 47.5 78 45.2 69Z" fill="${c}"/>`;
  const goatee = c => `<path d="M55 82.5C55.5 87.5 57.5 89 60 89C62.5 89 64.5 87.5 65 82.5C63 84 57 84 55 82.5Z" fill="${c}"/>`;
  const mous = c => `<path d="M52.5 78.6Q56 75.6 60 77.2Q64 75.6 67.5 78.6Q64 78 60 79Q56 78 52.5 78.6Z" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const mouth = (w=3.5, curve=1.8, c='#6e3326') => `<path d="M${60-w} 81.6Q60 ${81.6+curve} ${60+w} 81.6" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  const hand = (x,y,s,r=5.5) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*1.15}" fill="${s}"/>`;

  // ---------- المشاهد (ورا الشخصية) ----------
  const SCENE = {
    // سوق بأقواس وفانوس
    tajer: () => [-6,34,74].map(x=>`<path d="M${x} 100V50Q${x+20} 18 ${x+40} 50V100Z" fill="rgba(90,45,0,.24)"/><path d="M${x+6} 100V53Q${x+20} 28 ${x+34} 53V100Z" fill="rgba(255,228,150,.16)"/>`).join('')
      + `<circle cx="16" cy="30" r="13" fill="rgba(255,240,170,.3)"/><path d="M16 0V20" stroke="#3b2a20" stroke-width="1"/><path d="M10 20H22L20.5 36H11.5Z" fill="#F2C14E" stroke="${INK}" stroke-width="1.2"/><path d="M9 20H23M11 36H21" stroke="${INK}" stroke-width="1.6"/><circle cx="16" cy="28" r="2.6" fill="#FFF6C8"/>`,
    // مجلس بمشربية وإشارة الجوال
    wasta: () => { let d=''; for(let y=18;y<96;y+=9) for(let x=10+((y/9)%2)*4.5;x<112;x+=9) d+=`M${x} ${y-3.5}L${x+3.5} ${y}L${x} ${y+3.5}L${x-3.5} ${y}Z`;
      return `<path d="M8 100V30Q60 -6 112 30V100Z" fill="rgba(0,40,20,.25)"/><path d="${d}" fill="rgba(255,255,255,.07)"/>`
        + [10,16,22].map((r,i)=>`<path d="M${86+r*.2} ${50-r}A${r} ${r} 0 0 1 ${86+r} ${56}" stroke="rgba(255,255,255,${.75-i*.2})" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join(''); },
    // محكمة: أعمدة وميزان
    muhami: () => `<rect x="2" y="16" width="13" height="124" fill="rgba(255,236,200,.16)"/><rect x="105" y="16" width="13" height="124" fill="rgba(255,236,200,.16)"/><rect x="0" y="12" width="17" height="6" fill="rgba(255,236,200,.24)"/><rect x="103" y="12" width="17" height="6" fill="rgba(255,236,200,.24)"/>`
      + `<g stroke="rgba(255,232,180,.5)" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M60 14V30M30 30H90M30 30L22 48M30 30L38 48M90 30L82 48M90 30L98 48"/><path d="M20 48Q30 56 40 48Z M80 48Q90 56 100 48Z" fill="rgba(255,232,180,.25)"/></g>`,
    // سطوح بالليل: هلال ونجوم وشرافات نجدية
    harami: () => { let m='M0 140V98'; for(let x=0;x<120;x+=12) m+=`L${x+3} 98L${x+6} 91L${x+9} 98L${x+12} 98`; m+='V140Z';
      return `<rect width="120" height="140" fill="rgba(8,10,28,.45)"/><path d="M100 12A12 12 0 1 0 100 36A9 9 0 1 1 100 12Z" fill="#F3E6BF"/>`
        + [[20,16],[38,8],[70,20],[12,40],[84,40],[52,12]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1" fill="#F3E6BF"/>`).join('')
        + `<path d="${m}" fill="rgba(0,0,0,.35)"/>`; },
    // ضوء السيارة الأحمر والأزرق وشريط مربعات
    shurti: () => `<path d="M0 0H52L0 70Z" fill="rgba(255,70,70,.3)"/><path d="M120 0H68L120 70Z" fill="rgba(150,215,255,.38)"/>`
      + Array.from({length:15},(_,i)=>`<rect x="${i*8}" y="${92+(i%2)*5}" width="8" height="5" fill="rgba(255,255,255,.22)"/>`).join(''),
    // سبوت لايت وقصاصات جرايد
    faddah: () => `<path d="M48 0H72L104 140H16Z" fill="rgba(255,255,255,.12)"/>`
      + `<g transform="rotate(-12 22 34)"><rect x="6" y="20" width="30" height="34" fill="#F1E8D2" stroke="${INK}" stroke-width="1"/><rect x="9" y="23" width="24" height="6" fill="#2a2430"/><path d="M9 34H33M9 39H30M9 44H33M9 49H26" stroke="#8a7f6a" stroke-width="1.3"/></g>`
      + `<g transform="rotate(9 100 102)"><rect x="88" y="88" width="26" height="26" fill="#F1E8D2" stroke="${INK}" stroke-width="1"/><path d="M91 93H111M91 98H108M91 103H111M91 108H104" stroke="#8a7f6a" stroke-width="1.3"/></g>`
      + `<circle cx="21" cy="21" r="2" fill="#C8323A"/><circle cx="100" cy="90" r="2" fill="#C8323A"/>`,
    // سوق: أعلام مثلثة وأيادي ترفع
    dallal: () => { const cols=['#F2C14E','#2E9E5B','#F7F4EE','#2478C8']; let f='';
      for(let i=0;i<9;i++){ const x=4+i*13, y=10+Math.sin(i/8*Math.PI)*6; f+=`<path d="M${x} ${y}L${x+11} ${y+1}L${x+5.5} ${y+12}Z" fill="${cols[i%4]}" stroke="${INK}" stroke-width=".8"/>`; }
      return `<path d="M0 9Q60 24 120 9" stroke="${INK}" stroke-width="1" fill="none"/>${f}`
        + `<g fill="rgba(0,0,0,.28)"><path d="M96 140V112L99 100L103 100L104 112V140Z"/><ellipse cx="101" cy="98" rx="4" ry="5"/><path d="M108 140V118L110 108L114 108L115 118V140Z"/><ellipse cx="112" cy="106" rx="3.6" ry="4.5"/></g>`; },
  };

  // ---------- الشخصيات ----------
  const ROLES = {
    // التاجر: بشت بحاشية ذهب، ولحية، وكومة ريالات
    tajer: (s) => body() + collar + neck(s) + ghBack('#F7F4EE') + face(s) + eyes() + brows() + nose + beard('#2a1f19') + mous('#2a1f19') + mouth(3.6, 2) + ghFront('#F7F4EE') + igal
      + `<path d="M16 140C18 118 31 106 47 103.5L55.5 140Z" fill="#3B2A20"/><path d="M104 140C102 118 89 106 73 103.5L64.5 140Z" fill="#3B2A20"/>`
      + `<path d="M47 103.5L55.5 140M73 103.5L64.5 140" stroke="#E8B04A" stroke-width="3" stroke-linecap="round"/>`
      + [130,124.5,119].map(y=>`<ellipse cx="88" cy="${y}" rx="10" ry="3.6" fill="#F2C14E" stroke="#8C5C14" stroke-width="1.3"/>`).join(''),
    // الواسطة: شماغ ونظارة شمسية والجوال على أذنه
    wasta: (s, id) => shm(id) + body() + collar + neck(s) + ghBack(`url(#${id})`) + face(s) + brows() + nose + goatee('#2a1f19') + mous('#2a1f19') + mouth(4.2, 2.6) + ghFront(`url(#${id})`) + igal
      + `<rect x="47" y="64" width="11.5" height="7.5" rx="3.2" fill="#15131a"/><rect x="61.5" y="64" width="11.5" height="7.5" rx="3.2" fill="#15131a"/><path d="M58.5 66.6H61.5" stroke="#15131a" stroke-width="1.8"/><path d="M49 65.6H53" stroke="rgba(255,255,255,.4)" stroke-width="1.2" stroke-linecap="round"/>`
      + `<path d="M93 122C91 106 88 95 84 88L77 90C80.5 98 82.5 108 83 122Z" fill="${THOBE}"/><rect x="74" y="59" width="8.5" height="21" rx="2.4" fill="#1c2230"/><rect x="75.4" y="61" width="5.7" height="15" rx="1.2" fill="#5FD0A0" stroke="none"/>` + hand(80.5, 82, s, 5.2),
    // المحامي: نظارة دائرية وبشت غامق وملف مختوم
    muhami: (s) => body() + collar + neck(s) + ghBack('#F7F4EE') + face(s) + eyes() + brows(-.5) + nose + beard('#3a2a20') + mous('#3a2a20') + mouth(3, 1.2) + ghFront('#F7F4EE') + igal
      + `<circle cx="54" cy="68" r="5.2" fill="rgba(255,255,255,.18)" stroke="#2b2b2b" stroke-width="1.6"/><circle cx="66" cy="68" r="5.2" fill="rgba(255,255,255,.18)" stroke="#2b2b2b" stroke-width="1.6"/><path d="M59.2 67.5Q60 66.6 60.8 67.5" stroke="#2b2b2b" stroke-width="1.5" fill="none"/>`
      + `<path d="M16 140C18 118 31 106 47 103.5L55.5 140Z" fill="#22252e"/><path d="M104 140C102 118 89 106 73 103.5L64.5 140Z" fill="#22252e"/><path d="M47 103.5L55.5 140M73 103.5L64.5 140" stroke="#B9BCC6" stroke-width="2" stroke-linecap="round"/>`
      + `<g transform="rotate(-9 52 124)"><rect x="36" y="111" width="32" height="25" rx="2.5" fill="#F6EEDC"/><path d="M41 118H62M41 123H60M41 128H55" stroke="#9C8E72" stroke-width="1.4" stroke-linecap="round"/><circle cx="62" cy="130" r="3.6" fill="#B8323A"/></g>` + hand(36, 128, s, 4.8) + hand(69, 120, s, 4.8),
    // الحرامي: لثام بفتحة عيون، عيونه تلتفت، وصرّة فلوس
    harami: (s) => body('#3A3F4D') + `<path d="M50 103.5Q60 110 70 103.5" stroke="#2A2E39" stroke-width="3" fill="none"/>` + neck('#2B2E38') + face(s)
      + `<path d="M60 44C46 44 41.5 55 41.5 68C41.5 82 49 90 60 90C71 90 78.5 82 78.5 68C78.5 55 74 44 60 44Z" fill="#2B2E38"/><rect x="45.5" y="62.5" width="29" height="11" rx="5.5" fill="${s}"/>`
      + `<ellipse cx="56" cy="68" rx="1.9" ry="2.2" fill="${INK}" stroke="none"/><ellipse cx="68" cy="68" rx="1.9" ry="2.2" fill="${INK}" stroke="none"/><path d="M49.5 61Q54 64 57.5 63.4M62.5 63.4Q66 64 70.5 61" stroke="#14161c" stroke-width="2" fill="none" stroke-linecap="round"/>`
      + `<path d="M60 44C66 44 71 47 74 52" stroke="rgba(255,255,255,.14)" stroke-width="3" fill="none" stroke-linecap="round"/>`
      + `<path d="M78 117C71 117 68.5 126 70.5 132.5C72.5 139 89.5 139 91.5 132.5C93.5 126 91 117 84 117Z" fill="#8A6A3F"/><path d="M76.5 117.5Q81 114.5 85.5 117.5" stroke="#5B4527" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="81" cy="128" r="3.6" fill="#F2C14E"/>` + hand(71, 124, s, 4.8),
    // الشرطي: كاب بشعار عام، شنب، ودفتر مخالفات
    shurti: (s) => body('#3F6FA0') + `<path d="M54.5 103.5L60 113L65.5 103.5" fill="#E9EEF5"/><rect x="22" y="108" width="15" height="4" rx="2" fill="#E8B04A" transform="rotate(-20 29 110)"/><rect x="83" y="108" width="15" height="4" rx="2" fill="#E8B04A" transform="rotate(20 90 110)"/>` + neck(s) + face(s)
      + `<ellipse cx="44.5" cy="70" rx="3" ry="4.6" fill="${s}"/><ellipse cx="75.5" cy="70" rx="3" ry="4.6" fill="${s}"/>` + eyes() + brows(.6) + nose + mous('#231a14') + mouth(3, -.6)
      + `<path d="M41.5 53C41.5 37 78.5 37 78.5 53Z" fill="#1f2d4a"/><rect x="41.5" y="50" width="37" height="5" fill="#152038"/><path d="M42.5 55C50 60.5 70 60.5 77.5 55L80 57.5C71 63.5 49 63.5 40 57.5Z" fill="#0e1424"/><circle cx="60" cy="46" r="4" fill="#E8B04A"/><path d="M58 46L60 43.4L62 46L60 48.6Z" fill="#9E7322" stroke="none"/>`
      + `<g transform="rotate(8 82 125)"><rect x="70" y="112" width="22" height="27" rx="2" fill="#F6EEDC"/><rect x="70" y="112" width="22" height="5" fill="#C8323A"/><path d="M74 122H88M74 127H86M74 132H84" stroke="#9C8E72" stroke-width="1.3" stroke-linecap="round"/></g><path d="M58 138L71 120" stroke="#1c2230" stroke-width="2.6" stroke-linecap="round"/>` + hand(58, 134, s, 4.6),
    // المخبر: كاميرا قدام وجهه وفلاش
    faddah: (s, id) => shm(id) + body() + collar + neck(s) + ghBack(`url(#${id})`) + face(s) + `<ellipse cx="53" cy="68" rx="1.9" ry="2.3" fill="${INK}" stroke="none"/><path d="M49 62Q53 59.5 57 61.6" stroke="#2a1d14" stroke-width="1.8" fill="none" stroke-linecap="round"/>` + nose + mous('#2a1f19') + `<path d="M54 82Q58 86.5 64 82.5" stroke="#6e3326" stroke-width="1.6" fill="none" stroke-linecap="round"/>` + ghFront(`url(#${id})`) + igal
      + `<rect x="57" y="58" width="31" height="21" rx="4" fill="#26262e"/><rect x="61" y="54.5" width="9" height="4.5" rx="1.5" fill="#26262e"/><circle cx="73" cy="68.5" r="8.4" fill="#4a4a55"/><circle cx="73" cy="68.5" r="5.6" fill="#10131c"/><circle cx="71.2" cy="66.6" r="1.7" fill="rgba(255,255,255,.55)" stroke="none"/><rect x="81" y="60.5" width="4.5" height="3" rx="1" fill="#F7E7A8"/>`
      + `<path d="M95 44L97 51L104 50L98.5 54.5L102 61L95.5 57L90.5 62L92 55L85.5 52.5L92.5 51Z" fill="#FFF3B0"/>` + hand(58, 80, s, 4.6) + hand(87, 80, s, 4.6),
    // الدلّال: يرفع السلعة ويصارخ بالسعر
    dallal: (s) => body() + collar + neck(s) + ghBack('#F7F4EE') + face(s) + eyes() + brows(-1) + nose + mous('#2a1f19') + `<ellipse cx="60" cy="82.6" rx="3.8" ry="3.2" fill="#5a2620"/><ellipse cx="60" cy="84" rx="2.2" ry="1.2" fill="#C96A5C" stroke="none"/>` + ghFront('#F7F4EE') + igal
      + `<path d="M27 122C25 106 23.5 94 25.5 84L33.5 84C34 95 36 107 39.5 118Z" fill="${THOBE}"/>` + hand(29, 79, s, 5.4)
      + `<path d="M29 74L26 58" stroke="#8B6A3D" stroke-width="1.2"/><g transform="rotate(-14 22 50)"><path d="M14 42H30L33 48L30 54H14Z" fill="#F6EEDC"/><circle cx="29" cy="48" r="1.6" fill="#8B6A3D"/><circle cx="20" cy="48" r="3.4" fill="#F2C14E"/></g>`
      + `<path d="M84 76Q90 73 92 68M86 82Q93 82 96 78" stroke="rgba(255,255,255,.8)" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  };

  function portrait(k){
    const f=ROLES[k]; if(!f) return '';
    const s=SKIN[k]||'#C68B59', u='sqa'+(++N);
    return `<svg class="sq-art" viewBox="0 0 120 140" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs><pattern id="${u}g" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".6" fill="rgba(0,0,0,.17)"/></pattern>
        <radialGradient id="${u}v" cx="50%" cy="45%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
        <radialGradient id="${u}l" cx="50%" cy="42%" r="45%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="120" height="140" fill="${BG[k]||'#555'}"/>${SCENE[k] ? SCENE[k]() : ''}<rect width="120" height="140" fill="url(#${u}l)"/>
      <g stroke="${INK}" stroke-width="1.25" stroke-linejoin="round">${f(s, u+'s')}</g>
      <rect width="120" height="140" fill="url(#${u}g)"/><rect width="120" height="140" fill="url(#${u}v)"/></svg>`;
  }
  const esc = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const corners = '<i class="sqc-c k1"></i><i class="sqc-c k2"></i><i class="sqc-c k3"></i><i class="sqc-c k4"></i>';
  // بطاقة لعب: o = { name, color, icon, move, desc, block }
  function card(k, o){
    if(typeof o==='string') o={ name:o, color:arguments[2] };
    o=o||{};
    const icon = o.icon ? `<i class="ic" style="--i:url(../assets/icons/${o.icon}.svg)"></i>` : '';
    return `<span class="sqc" style="--rc:${o.color||BG[k]||'#555'}"><span class="sqc-in">${corners}
      <span class="sqc-head"><span class="sqc-name">${esc(o.name)}</span></span>
      <span class="sqc-arch">${portrait(k)}</span>
      ${o.move ? `<span class="sqc-box"><span class="sqc-emb">${icon}</span><b>${esc(o.move)}</b><small>${esc(o.desc||'')}</small>${o.block?`<em>يصد ${esc(o.block)}</em>`:''}</span>` : ''}
    </span></span>`;
  }
  // ظهر البطاقة: سدو ذهبي خفيف وميدالية بالنص
  function back(){
    return `<span class="sqc back"><span class="sqc-in">${corners}<span class="sqc-med"><b>ص</b></span></span></span>`;
  }
  return { portrait, card, back, has:k=>!!ROLES[k] };
})();
