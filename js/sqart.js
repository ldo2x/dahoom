/* ===== بطاقات «ما أصدقك» — أسلوب التاروت =====
   خلفية غامقة، إطار خطوط رفيعة بلون العاج، معيّن خلف الشخصية بلون دورها،
   والشخصية بإضاءة جانبية بلونها. التأثيرات (ريالات، إشارة، ميزان، هلال، ضوء، فلاش، قماش)
   تطلع من الإطار. رقم صغير فوق، والاسم بلوحة صغيرة تحت.
   DahoomSqArt.portrait(k)  → الرسمة لحالها (SVG كامل للبطاقة)
   DahoomSqArt.card(k, o)   → البطاقة كاملة (o.name)
   DahoomSqArt.back()       → ظهر البطاقة
*/
window.DahoomSqArt = (function(){
  const INK = '#1d1712', THOBE = '#F2EEE6', THOBE_SH = '#DCD5C8', IVORY = '#E8D9B5', NIGHT = '#0F0C15';
  const SKIN = { tajer:'#C98F63', wasta:'#C99271', muhami:'#D6A27A', harami:'#A9714B', shurti:'#C08458', faddah:'#D3A079', dallal:'#B37750' };
  const BG   = { tajer:'#D9961A', wasta:'#2E9E5B', muhami:'#8A5A2B', harami:'#5E6680', shurti:'#2478C8', faddah:'#D5489A', dallal:'#E2563F' };
  const LIT  = { tajer:'#FFC857', wasta:'#62E6A6', muhami:'#F0B878', harami:'#A9B8F0', shurti:'#74C6FF', faddah:'#FF86CC', dallal:'#FF9270' };
  const NUM  = { tajer:'١', wasta:'٢', muhami:'٣', harami:'٤', shurti:'٥', faddah:'٦', dallal:'٧' };
  let N = 0;

  // ---------- قطع الرسم (إحداثيات 120×140) ----------
  const shm = id => `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#C42F36"/><circle cx="1" cy="1" r=".75" fill="#F4E9E0"/><circle cx="3" cy="3" r=".55" fill="#F4E9E0"/></pattern>`;
  const body = (fill=THOBE) => `<path d="M16 140C18 116 35 103 60 103C85 103 102 116 104 140Z" fill="${fill}"/>`;
  const collar = `<path d="M54.5 103.5L60 112L65.5 103.5" stroke="${THOBE_SH}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`;
  const neck = s => `<rect x="53" y="82" width="14" height="24" rx="5" fill="${s}"/>`;
  const ghBack = f => `<path d="M60 33C42 33 35.5 46 35.5 62C35.5 80 31 98 25 118L43 113C43.5 98 43.5 86 44 72L76 72C76.5 86 76.5 98 77 113L95 118C89 98 84.5 80 84.5 62C84.5 46 78 33 60 33Z" fill="${f}"/>`;
  const ghFront = f => `<path d="M43.6 62C43 50 50 44 60 44C70 44 77 50 76.4 62C70 56.6 50 56.6 43.6 62Z" fill="${f}"/>`;
  const igal = `<path d="M43 47.5C44 42.5 76 42.5 77 47.5" stroke="#0d0b10" stroke-width="2.6" fill="none"/><ellipse cx="60" cy="49.5" rx="17.8" ry="3.6" fill="none" stroke="#0d0b10" stroke-width="2.8"/>`;
  const face = s => `<ellipse cx="60" cy="68" rx="15.5" ry="18.5" fill="${s}"/>`;
  const eyes = (dx=0) => `<ellipse cx="${54+dx}" cy="68" rx="1.9" ry="2.3" fill="${INK}"/><ellipse cx="${66+dx}" cy="68" rx="1.9" ry="2.3" fill="${INK}"/>`;
  const glint = (pts) => pts.map(([x,y])=>`<circle cx="${x-.5}" cy="${y-.7}" r=".75" fill="#fff"/>`).join('');
  const brows = (tilt=0) => `<path d="M50 ${63.5+tilt}Q54 61.5 57.5 63.2M62.5 63.2Q66 61.5 70 ${63.5+tilt}" stroke="#2a1d14" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const nose = `<path d="M60 69.5Q58.4 74 60.6 75.2" stroke="rgba(60,30,15,.5)" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  const beard = c => `<path d="M45.2 69C45.5 84 52 89 60 89C68 89 74.5 84 74.8 69C72.5 78 68 80.5 60 80.5C52 80.5 47.5 78 45.2 69Z" fill="${c}"/>`;
  const goatee = c => `<path d="M55 82.5C55.5 87.5 57.5 89 60 89C62.5 89 64.5 87.5 65 82.5C63 84 57 84 55 82.5Z" fill="${c}"/>`;
  const mous = c => `<path d="M52.5 78.6Q56 75.6 60 77.2Q64 75.6 67.5 78.6Q64 78 60 79Q56 78 52.5 78.6Z" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const mouth = (w=3.5, curve=1.8, c='#6e3326') => `<path d="M${60-w} 81.6Q60 ${81.6+curve} ${60+w} 81.6" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  const hand = (x,y,s,r=5.5) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*1.15}" fill="${s}"/>`;
  const coin = (x,y,r=4.2,rot=0) => `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.42}" fill="#F7C948" stroke="#8C5C14" stroke-width=".8"/><ellipse cx="${x}" cy="${y-.4}" rx="${r*.55}" ry="${r*.2}" fill="none" stroke="#FFF0B3" stroke-width=".5"/></g>`;
  const spark = (x,y,r,c) => `<path d="M${x} ${y-r}L${x+r*.22} ${y-r*.22}L${x+r} ${y}L${x+r*.22} ${y+r*.22}L${x} ${y+r}L${x-r*.22} ${y+r*.22}L${x-r} ${y}L${x-r*.22} ${y-r*.22}Z" fill="${c}"/>`;
  // غطاء الرأس النسائي (شيلة/طرحة)
  const hood = c => `<path d="M60 30C40 30 33.5 45 33.5 63C33.5 84 38 100 47 106L73 106C82 100 86.5 84 86.5 63C86.5 45 80 30 60 30Z" fill="${c}"/>`;
  const hoodFront = c => `<path d="M44.2 64C43.5 51 50 45.5 60 45.5C70 45.5 76.5 51 75.8 64C70.5 57.5 49.5 57.5 44.2 64Z" fill="${c}"/><path d="M44.8 72C45.5 86 52 93 60 93C68 93 74.5 86 75.2 72C76 90 68 99 60 99C52 99 44 90 44.8 72Z" fill="${c}"/>`;

  // ---------- الشخصيات: fig تنرسم بالإضاءة الدرامية، fx تنرسم فوقها لامعة وتطلع من الإطار ----------
  const ROLES = {
    tajer: {   // التاجر: بشت بحاشية ذهب، وريالات تطير
      fig: s => body() + collar + neck(s) + ghBack('#F7F4EE') + face(s) + eyes() + brows() + nose + beard('#2a1f19') + mous('#2a1f19') + mouth(3.6, 2) + ghFront('#F7F4EE') + igal
        + `<path d="M16 140C18 118 31 106 47 103.5L55.5 140Z" fill="#3B2A20"/><path d="M104 140C102 118 89 106 73 103.5L64.5 140Z" fill="#3B2A20"/>` + hand(84, 120, s, 5.5),
      fx: () => `<path d="M47 103.5L55.5 140M73 103.5L64.5 140" stroke="#F2C14E" stroke-width="2.6" stroke-linecap="round"/>` + glint([[54,68],[66,68]])
        + [[84,112,5,0],[84,107,5,0],[84,102,5,0]].map(a=>coin(...a)).join('')
        + coin(96,58,4,-25) + coin(103,38,3.4,30) + coin(92,20,3,-10) + coin(20,44,3.6,20) + coin(12,24,3,-30) + coin(110,82,3.2,15)
        + spark(100,48,2.4,'#FFF0B3') + spark(16,34,2,'#FFF0B3') + spark(28,14,1.6,'#FFF0B3'),
    },
    wasta: {   // الواسطة: امرأة بشيلة ونظارة شمسية، والجوال على أذنها
      fig: s => body('#1c1822') + hood('#25202c') + face(s) + nose + `<path d="M56.5 81Q60 83.8 63.5 81Q60 80 56.5 81Z" fill="#B0434F"/>` + hoodFront('#25202c')
        + `<path d="M93 122C91 106 88 95 84 88L77 90C80.5 98 82.5 108 83 122Z" fill="#1c1822"/>` + `<rect x="74" y="58" width="8.5" height="21" rx="2.4" fill="#1c2230"/>` + hand(80.5, 82, s, 5),
      fx: () => `<path d="M46.5 65.5Q52 62.8 58.6 65.2L57.6 70.8Q52 72.4 47.4 70.4Z" fill="#0b0a0e"/><path d="M73.5 65.5Q68 62.8 61.4 65.2L62.4 70.8Q68 72.4 72.6 70.4Z" fill="#0b0a0e"/><path d="M58.6 66.4H61.4" stroke="#0b0a0e" stroke-width="1.4"/><path d="M48.5 66.4L52.5 65.4M63 65.4L67 66.4" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-linecap="round"/>`
        + `<rect x="75.4" y="60" width="5.7" height="15" rx="1.2" fill="#7CF5BE"/><path d="M77.5 85.5Q81 88 85 85.5M78 88.5Q81.5 91 85.5 88.5" stroke="#F2C14E" stroke-width="1.1" fill="none"/>`
        + [12,19,26,33].map((r,i)=>`<path d="M${88+r*.25} ${52-r}A${r} ${r} 0 0 1 ${88+r} ${60}" stroke="#7CF5BE" stroke-opacity="${.9-i*.18}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`).join('')
        + spark(110,22,2,'#C9FFE6') + spark(100,12,1.4,'#C9FFE6'),
    },
    muhami: {   // المحامي: نظارة دائرية، بشت غامق، ملف مختوم، والميزان فوق راسه
      fig: s => body() + collar + neck(s) + ghBack('#F7F4EE') + face(s) + eyes() + brows(-.5) + nose + beard('#3a2a20') + mous('#3a2a20') + mouth(3, 1.2) + ghFront('#F7F4EE') + igal
        + `<path d="M16 140C18 118 31 106 47 103.5L55.5 140Z" fill="#22252e"/><path d="M104 140C102 118 89 106 73 103.5L64.5 140Z" fill="#22252e"/>` + hand(36, 128, s, 4.8) + hand(69, 120, s, 4.8),
      fx: () => `<circle cx="54" cy="68" r="5.2" fill="rgba(255,255,255,.12)" stroke="#F2C14E" stroke-width="1.2"/><circle cx="66" cy="68" r="5.2" fill="rgba(255,255,255,.12)" stroke="#F2C14E" stroke-width="1.2"/><path d="M59.2 67.5Q60 66.6 60.8 67.5" stroke="#F2C14E" stroke-width="1.1" fill="none"/>` + glint([[54,68],[66,68]])
        + `<g transform="rotate(-9 52 124)"><rect x="36" y="111" width="32" height="25" rx="2.5" fill="#F6EEDC"/><path d="M41 118H62M41 123H60M41 128H55" stroke="#9C8E72" stroke-width="1.4" stroke-linecap="round"/><circle cx="62" cy="130" r="3.6" fill="#C8323A"/></g>`
        + `<g stroke="#F2C14E" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M60 2V22M28 14H92M28 14L20 31M28 14L36 31M92 14L84 31M92 14L100 31"/><path d="M18 31Q28 38 38 31Z M82 31Q92 38 102 31Z" fill="rgba(242,193,78,.35)"/><circle cx="60" cy="14" r="2.4" fill="#F2C14E"/></g>`
        + spark(60,0,2.6,'#FFF0B3'),
    },
    harami: {   // الحرامي: لثام وعيون تلتفت، صرّة فلوس، وهلال
      fig: s => body('#3A3F4D') + neck('#2B2E38') + face(s)
        + `<path d="M60 44C46 44 41.5 55 41.5 68C41.5 82 49 90 60 90C71 90 78.5 82 78.5 68C78.5 55 74 44 60 44Z" fill="#2B2E38"/><rect x="45.5" y="62.5" width="29" height="11" rx="5.5" fill="${s}"/>`
        + `<ellipse cx="56" cy="68" rx="1.9" ry="2.2" fill="${INK}"/><ellipse cx="68" cy="68" rx="1.9" ry="2.2" fill="${INK}"/><path d="M49.5 61Q54 64 57.5 63.4M62.5 63.4Q66 64 70.5 61" stroke="#14161c" stroke-width="2" fill="none" stroke-linecap="round"/>`
        + `<path d="M78 117C71 117 68.5 126 70.5 132.5C72.5 139 89.5 139 91.5 132.5C93.5 126 91 117 84 117Z" fill="#8A6A3F"/>` + hand(71, 124, s, 4.8),
      fx: () => glint([[56,68],[68,68]]) + `<path d="M104 2A15 15 0 1 0 104 32A11 11 0 1 1 104 2Z" fill="#F3E6BF"/>` + `<circle cx="99" cy="17" r="20" fill="#F3E6BF" opacity=".08"/>`
        + coin(81,114,3,0) + coin(88,110,2.6,-30) + coin(96,104,2.2,25)
        + [[16,16],[30,6],[8,50],[112,52],[22,30]].map(([x,y])=>spark(x,y,1.5,'#F3E6BF')).join(''),
    },
    shurti: {   // الشرطي: كاب بنجمة، شنب، دفتر مخالفات، وضوء أحمر وأزرق
      fig: s => body('#3F6FA0') + `<path d="M54.5 103.5L60 113L65.5 103.5" fill="#E9EEF5"/>` + neck(s) + face(s)
        + `<ellipse cx="44.5" cy="70" rx="3" ry="4.6" fill="${s}"/><ellipse cx="75.5" cy="70" rx="3" ry="4.6" fill="${s}"/>` + eyes() + brows(.6) + nose + mous('#231a14') + mouth(3, -.6)
        + `<path d="M41.5 53C41.5 37 78.5 37 78.5 53Z" fill="#1f2d4a"/><rect x="41.5" y="50" width="37" height="5" fill="#152038"/><path d="M42.5 55C50 60.5 70 60.5 77.5 55L80 57.5C71 63.5 49 63.5 40 57.5Z" fill="#0e1424"/>`
        + `<path d="M58 138L71 120" stroke="#1c2230" stroke-width="2.6" stroke-linecap="round"/>` + hand(58, 134, s, 4.6),
      fx: () => `<path d="M0 0H44L-6 64Z" fill="#FF4D4D" opacity=".42"/><path d="M120 0H76L126 64Z" fill="#6FC3FF" opacity=".5"/>` + glint([[54,68],[66,68]])
        + `<path d="M60 41.5L61.3 44.6L64.6 44.8L62 46.9L62.9 50.1L60 48.3L57.1 50.1L58 46.9L55.4 44.8L58.7 44.6Z" fill="#F2C14E"/>`
        + `<rect x="22" y="108" width="15" height="4" rx="2" fill="#F2C14E" transform="rotate(-20 29 110)"/><rect x="83" y="108" width="15" height="4" rx="2" fill="#F2C14E" transform="rotate(20 90 110)"/>`
        + `<g transform="rotate(8 82 125)"><rect x="70" y="112" width="22" height="27" rx="2" fill="#F6EEDC"/><rect x="70" y="112" width="22" height="5" fill="#C8323A"/><path d="M74 122H88M74 127H86M74 132H84" stroke="#9C8E72" stroke-width="1.3" stroke-linecap="round"/></g>`
        + spark(12,18,2.2,'#FFD1D1') + spark(108,18,2.2,'#D6F0FF'),
    },
    faddah: {   // المخبر: شماغ، يطل من ورا جريدة، وفلاش
      fig: (s, id) => shm(id) + body() + neck(s) + ghBack(`url(#${id})`) + face(s) + nose + ghFront(`url(#${id})`) + igal
        + `<path d="M49.5 61.5Q53.5 58.5 57.5 61M62.5 62.2Q66.5 61 70.5 62.8" stroke="#2a1d14" stroke-width="1.9" fill="none" stroke-linecap="round"/>`
        + `<ellipse cx="55.5" cy="67.5" rx="1.9" ry="2.2" fill="${INK}"/><ellipse cx="67.5" cy="67.5" rx="1.9" ry="2.2" fill="${INK}"/>` + hand(34, 108, s, 5) + hand(88, 106, s, 5),
      fx: () => glint([[55.5,67.5],[67.5,67.5]])
        + `<g transform="rotate(-6 60 102)"><path d="M30 76H92L94 132H28Z" fill="#EFE6CF"/><path d="M61 76V132" stroke="#C9BC9C" stroke-width=".8"/><rect x="33" y="80" width="56" height="7" fill="#1d1712"/>
          <path d="M34 92H57M34 96H55M34 100H57M34 104H52M65 92H89M65 96H87" stroke="#8a7f6a" stroke-width="1.2"/><rect x="65" y="100" width="22" height="14" fill="#5a4f5e"/><path d="M68 112L74 105L78 109L81 106L85 112Z" fill="#8f8296"/><path d="M34 110H57M34 114H54M34 118H57M65 118H89M65 122H86M34 122H50" stroke="#8a7f6a" stroke-width="1.2"/></g>`
        + `<path d="M104 8L107 22L120 20L109 28L116 40L104 32L95 42L97 29L84 24L98 21Z" fill="#FFF3B0"/><circle cx="104" cy="25" r="14" fill="#FFF3B0" opacity=".18"/>` + spark(14,20,2.2,'#FFD1EC') + spark(8,58,1.6,'#FFD1EC'),
    },
    dallal: {   // الدلّالة: عباية وطرحة وبطولة ذهب، ترفع القماش وتنادي
      fig: s => body('#1e1a24') + hood('#2a2230') + face(s) + `<ellipse cx="60" cy="84" rx="3.6" ry="3" fill="#5a2620"/>` + hoodFront('#2a2230')
        + `<path d="M27 122C25 106 23.5 94 25.5 84L33.5 84C34 95 36 107 39.5 118Z" fill="#1e1a24"/>` + hand(29, 79, s, 5.2)
        + `<path d="M76 116C74 104 86 98 96 104C104 108 104 126 96 132C88 138 78 130 76 116Z" fill="#7A3B5C"/>`,
      fx: () => `<path d="M45 58.5H75V63.2H45Z M57.8 63H62.2V80H57.8Z M45 63.2Q45.5 74 52 79.5L57.8 79.5L57.8 73Q51.5 72.5 49.5 63.2Z M75 63.2Q74.5 74 68 79.5L62.2 79.5L62.2 73Q68.5 72.5 70.5 63.2Z" fill="#E7B53E" stroke="#8C5C14" stroke-width=".6"/>`
        + `<ellipse cx="53.5" cy="67.6" rx="1.8" ry="2" fill="${INK}"/><ellipse cx="66.5" cy="67.6" rx="1.8" ry="2" fill="${INK}"/>` + glint([[53.5,67.6],[66.5,67.6]])
        + `<path d="M29 74C24 56 34 42 26 26C20 14 30 4 24 -4" stroke="#E2563F" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M31 74C34 58 44 48 38 30C34 18 44 10 40 0" stroke="#F2C14E" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M27 74C18 62 14 48 6 40" stroke="#2E9E5B" stroke-width="3" fill="none" stroke-linecap="round"/>`
        + `<path d="M80 110C86 106 94 106 99 112" stroke="#F2C14E" stroke-width="1.4" fill="none"/><path d="M84 106L90 98L94 106" fill="#F2C14E"/><circle cx="88" cy="120" r="2" fill="#F2C14E"/><circle cx="95" cy="124" r="1.6" fill="#F2C14E"/>`
        + `<path d="M84 72Q91 69 93 63M87 79Q95 79 98 74" stroke="#FFD6C7" stroke-width="1.8" fill="none" stroke-linecap="round"/>` + spark(14,10,2,'#FFE2D6'),
    },
  };

  // الإطار: خطوط عاج رفيعة ومعيّن خلف الشخصية
  function frame(k, u){
    const c=LIT[k]||IVORY;
    return `<rect x="4.5" y="4.5" width="91" height="131" rx="1.6" fill="none" stroke="${IVORY}" stroke-opacity=".6" stroke-width=".55"/>
      <rect x="7.8" y="7.8" width="84.4" height="124.4" fill="none" stroke="${IVORY}" stroke-opacity=".3" stroke-width=".35"/>
      <path d="M50 15L89 62L50 109L11 62Z" fill="url(#${u}d)" stroke="${c}" stroke-width=".8"/>
      <path d="M50 20.5L84.4 62L50 103.5L15.6 62Z" fill="none" stroke="${IVORY}" stroke-opacity=".35" stroke-width=".3"/>
      <circle cx="50" cy="56" r="27" fill="none" stroke="${IVORY}" stroke-opacity=".22" stroke-width=".3"/>
      <path d="M7.8 62H11M89 62H92.2M50 7.8V15" stroke="${IVORY}" stroke-opacity=".35" stroke-width=".3"/>`;
  }
  function portrait(k){
    const R=ROLES[k]; if(!R) return '';
    const s=SKIN[k]||'#C68B59', u='sqa'+(++N), c=BG[k]||'#555', l=LIT[k]||IVORY;
    return `<svg class="sq-art" viewBox="0 0 100 140" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs>
        <radialGradient id="${u}b" cx="50%" cy="44%" r="62%"><stop offset="0" stop-color="${c}" stop-opacity=".5"/><stop offset=".7" stop-color="${c}" stop-opacity=".08"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
        <linearGradient id="${u}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity=".12"/></linearGradient>
        <filter id="${u}f" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values=".78 0 0 0 0  0 .72 0 0 0  0 0 .8 0 0  0 0 0 1 0" result="dk"/>
          <feOffset in="SourceAlpha" dx="1.3" dy="1" result="of"/><feComposite in="SourceAlpha" in2="of" operator="out" result="ed"/>
          <feFlood flood-color="${l}" result="fl"/><feComposite in="fl" in2="ed" operator="in" result="rim"/><feGaussianBlur in="rim" stdDeviation=".35" result="rb"/>
          <feMerge><feMergeNode in="dk"/><feMergeNode in="rb"/></feMerge></filter>
        <pattern id="${u}g" width="2.6" height="2.6" patternUnits="userSpaceOnUse"><circle cx="1.3" cy="1.3" r=".45" fill="rgba(255,255,255,.05)"/></pattern></defs>
      <rect width="100" height="140" fill="${NIGHT}"/><rect width="100" height="140" fill="url(#${u}b)"/><rect width="100" height="140" fill="url(#${u}g)"/>
      ${frame(k, u)}
      <g transform="translate(-10 -2)"><g filter="url(#${u}f)">${R.fig(s, u+'s')}</g>${R.fx(s)}</g></svg>`;
  }
  const esc = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // البطاقة: الرسمة + رقم فوق + الاسم تحت
  function card(k, o){
    if(typeof o==='string') o={ name:o, color:arguments[2] };
    o=o||{};
    return `<span class="sqc tarot" style="--rc:${o.color||BG[k]||'#555'};--rl:${LIT[k]||IVORY}">${portrait(k)}<span class="sqc-num"><b>${NUM[k]||''}</b></span><span class="sqc-plate">${esc(o.name)}</span></span>`;
  }
  // الظهر: نفس لغة الإطار، وميدالية «ص» بالنص
  function back(){
    const u='sqb'+(++N);
    return `<span class="sqc tarot back"><svg class="sq-art" viewBox="0 0 100 140" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs>
        <radialGradient id="${u}b" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#8A1A2B" stop-opacity=".55"/><stop offset="1" stop-color="#8A1A2B" stop-opacity="0"/></radialGradient></defs>
      <rect width="100" height="140" fill="${NIGHT}"/><rect width="100" height="140" fill="url(#${u}b)"/>
      <rect x="4.5" y="4.5" width="91" height="131" rx="1.6" fill="none" stroke="${IVORY}" stroke-opacity=".6" stroke-width=".55"/><rect x="7.8" y="7.8" width="84.4" height="124.4" fill="none" stroke="${IVORY}" stroke-opacity=".3" stroke-width=".35"/>
      <path d="M50 12L92 70L50 128L8 70Z" fill="none" stroke="#E3B95A" stroke-width=".7"/><path d="M50 22L84 70L50 118L16 70Z" fill="none" stroke="${IVORY}" stroke-opacity=".3" stroke-width=".35"/>
      <circle cx="50" cy="70" r="30" fill="none" stroke="${IVORY}" stroke-opacity=".25" stroke-width=".35"/><circle cx="50" cy="70" r="17" fill="#1a1020" stroke="#E3B95A" stroke-width="1.2"/><circle cx="50" cy="70" r="14" fill="none" stroke="#E3B95A" stroke-opacity=".5" stroke-width=".4"/>
      ${[0,90,180,270].map(a=>`<path d="M50 34L52 40L50 46L48 40Z" fill="#E3B95A" transform="rotate(${a} 50 70)"/>`).join('')}
      <text x="50" y="77" text-anchor="middle" font-size="19" fill="#E3B95A" style="font-family:Lalezar,'IBM Plex Sans Arabic',sans-serif">ص</text></svg></span>`;
  }
  return { portrait, card, back, has:k=>!!ROLES[k] };
})();
