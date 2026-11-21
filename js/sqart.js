/* ===== رسمات شخصيات «ما أصدقك» =====
   كل شخصية رسمة نصفية بأسلوب واحد: خلفية بلون الشخصية، شريط سدو فوق، وأداة تميّزها.
   DahoomSqArt.portrait(k) ترجع SVG نص — يستخدمها التلفزيون والجوال.
*/
window.DahoomSqArt = (function(){
  const INK = '#1d1712', THOBE = '#F2EEE6', THOBE_SH = '#DCD5C8';
  const SKIN = { tajer:'#C98F63', wasta:'#B97A52', muhami:'#D6A27A', harami:'#A9714B', shurti:'#C08458', faddah:'#D3A079', dallal:'#B37750' };
  const BG   = { tajer:'#D9961A', wasta:'#2E9E5B', muhami:'#8A5A2B', harami:'#5E6680', shurti:'#2478C8', faddah:'#D5489A', dallal:'#E2563F' };

  const sadu = () => { let d=''; for(let i=0;i<12;i++) d+=`M${i*10} 0L${i*10+5} 7L${i*10+10} 0Z`; return `<path d="${d}" fill="rgba(0,0,0,.2)"/><rect y="7" width="120" height="1.6" fill="rgba(255,255,255,.25)"/>`; };
  const shm = k => `<pattern id="sqshm-${k}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#C42F36"/><circle cx="1" cy="1" r=".75" fill="#F4E9E0"/><circle cx="3" cy="3" r=".55" fill="#F4E9E0"/></pattern>`;
  const body = (fill=THOBE) => `<path d="M16 140C18 116 35 103 60 103C85 103 102 116 104 140Z" fill="${fill}"/>`;
  const collar = `<path d="M54.5 103.5L60 112L65.5 103.5" stroke="${THOBE_SH}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`;
  const neck = s => `<rect x="53" y="82" width="14" height="24" rx="5" fill="${s}"/>`;
  const ghBack = f => `<path d="M60 33C42 33 35.5 46 35.5 62C35.5 80 31 98 25 118L43 113C43.5 98 43.5 86 44 72L76 72C76.5 86 76.5 98 77 113L95 118C89 98 84.5 80 84.5 62C84.5 46 78 33 60 33Z" fill="${f}"/>`;
  const ghFront = f => `<path d="M43.6 62C43 50 50 44 60 44C70 44 77 50 76.4 62C70 56.6 50 56.6 43.6 62Z" fill="${f}"/>`;
  const igal = `<path d="M43 47.5C44 42.5 76 42.5 77 47.5" stroke="#17130f" stroke-width="2.6" fill="none"/><ellipse cx="60" cy="49.5" rx="17.8" ry="3.6" fill="none" stroke="#17130f" stroke-width="2.8"/>`;
  const face = s => `<ellipse cx="60" cy="68" rx="15.5" ry="18.5" fill="${s}"/>`;
  const eyes = (dx=0) => `<ellipse cx="${54+dx}" cy="68" rx="1.9" ry="2.3" fill="${INK}"/><ellipse cx="${66+dx}" cy="68" rx="1.9" ry="2.3" fill="${INK}"/>`;
  const brows = (tilt=0) => `<path d="M50 ${63.5+tilt}Q54 ${61.5} 57.5 ${63.2}M62.5 63.2Q66 61.5 70 ${63.5+tilt}" stroke="#2a1d14" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const nose = `<path d="M60 69.5Q58.4 74 60.6 75.2" stroke="rgba(60,30,15,.45)" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  const beard = c => `<path d="M45.2 69C45.5 84 52 89 60 89C68 89 74.5 84 74.8 69C72.5 78 68 80.5 60 80.5C52 80.5 47.5 78 45.2 69Z" fill="${c}"/>`;
  const goatee = c => `<path d="M55 82.5C55.5 87.5 57.5 89 60 89C62.5 89 64.5 87.5 65 82.5C63 84 57 84 55 82.5Z" fill="${c}"/>`;
  const mous = c => `<path d="M52.5 78.6Q56 75.6 60 77.2Q64 75.6 67.5 78.6Q64 78 60 79Q56 78 52.5 78.6Z" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const mouth = (w=3.5, curve=1.8, c='#6e3326') => `<path d="M${60-w} 81.6Q60 ${81.6+curve} ${60+w} 81.6" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  const hand = (x,y,s,r=5.5) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*1.15}" fill="${s}"/>`;
  const glow = `<circle cx="60" cy="64" r="46" fill="rgba(255,255,255,.16)"/><circle cx="60" cy="64" r="30" fill="rgba(255,255,255,.08)"/>`;

  const ROLES = {
    // التاجر: بشت بحاشية ذهب، ولحية، وكومة ريالات
    tajer: s => body() + collar + neck(s) + ghBack('#F7F4EE') + face(s) + eyes() + brows() + nose + beard('#2a1f19') + mous('#2a1f19') + mouth(3.6, 2) + ghFront('#F7F4EE') + igal
      + `<path d="M16 140C18 118 31 106 47 103.5L55.5 140Z" fill="#3B2A20"/><path d="M104 140C102 118 89 106 73 103.5L64.5 140Z" fill="#3B2A20"/>`
      + `<path d="M47 103.5L55.5 140M73 103.5L64.5 140" stroke="#E8B04A" stroke-width="3" stroke-linecap="round"/>`
      + [130,124.5,119].map(y=>`<ellipse cx="88" cy="${y}" rx="10" ry="3.6" fill="#F2C14E" stroke="#B9831F" stroke-width="1.4"/>`).join('') + `<ellipse cx="88" cy="119" rx="5" ry="1.4" fill="#B9831F" opacity=".55"/>`,
    // الواسطة: شماغ ونظارة شمسية والجوال على أذنه
    wasta: s => shm('wasta') + body() + collar + neck(s) + ghBack('url(#sqshm-wasta)') + face(s) + brows() + nose + goatee('#2a1f19') + mous('#2a1f19') + mouth(4.2, 2.6) + ghFront('url(#sqshm-wasta)') + igal
      + `<rect x="47" y="64" width="11.5" height="7.5" rx="3.2" fill="#15131a"/><rect x="61.5" y="64" width="11.5" height="7.5" rx="3.2" fill="#15131a"/><path d="M58.5 66.6H61.5" stroke="#15131a" stroke-width="1.8"/><path d="M49 65.6H53" stroke="rgba(255,255,255,.35)" stroke-width="1.2" stroke-linecap="round"/>`
      + `<path d="M93 122C91 106 88 95 84 88L77 90C80.5 98 82.5 108 83 122Z" fill="${THOBE}"/>` + `<rect x="74" y="59" width="8.5" height="21" rx="2.4" fill="#1c2230"/><rect x="75.4" y="61" width="5.7" height="15" rx="1.2" fill="#5FD0A0" opacity=".85"/>` + hand(80.5, 82, s, 5.2),
    // المحامي: نظارة دائرية وبشت غامق وملف مختوم
    muhami: s => body() + collar + neck(s) + ghBack('#F7F4EE') + face(s) + eyes() + brows(-.5) + nose + beard('#3a2a20') + mous('#3a2a20') + mouth(3, 1.2) + ghFront('#F7F4EE') + igal
      + `<circle cx="54" cy="68" r="5.2" fill="rgba(255,255,255,.18)" stroke="#2b2b2b" stroke-width="1.6"/><circle cx="66" cy="68" r="5.2" fill="rgba(255,255,255,.18)" stroke="#2b2b2b" stroke-width="1.6"/><path d="M59.2 67.5Q60 66.6 60.8 67.5" stroke="#2b2b2b" stroke-width="1.5" fill="none"/>`
      + `<path d="M16 140C18 118 31 106 47 103.5L55.5 140Z" fill="#22252e"/><path d="M104 140C102 118 89 106 73 103.5L64.5 140Z" fill="#22252e"/><path d="M47 103.5L55.5 140M73 103.5L64.5 140" stroke="#B9BCC6" stroke-width="2" stroke-linecap="round"/>`
      + `<g transform="rotate(-9 52 124)"><rect x="36" y="111" width="32" height="25" rx="2.5" fill="#F6EEDC" stroke="#C9B996" stroke-width="1"/><path d="M41 118H62M41 123H60M41 128H55" stroke="#9C8E72" stroke-width="1.4" stroke-linecap="round"/><circle cx="62" cy="130" r="3.6" fill="#B8323A"/></g>` + hand(36, 128, s, 4.8) + hand(69, 120, s, 4.8),
    // الحرامي: لثام بفتحة عيون، عيونه تلتفت، وصرّة فلوس
    harami: s => body('#3A3F4D') + `<path d="M50 103.5Q60 110 70 103.5" stroke="#2A2E39" stroke-width="3" fill="none"/>` + neck('#2B2E38') + face(s)
      + `<path d="M60 44C46 44 41.5 55 41.5 68C41.5 82 49 90 60 90C71 90 78.5 82 78.5 68C78.5 55 74 44 60 44Z" fill="#2B2E38"/><rect x="45.5" y="62.5" width="29" height="11" rx="5.5" fill="${s}"/>`
      + `<ellipse cx="56" cy="68" rx="1.9" ry="2.2" fill="${INK}"/><ellipse cx="68" cy="68" rx="1.9" ry="2.2" fill="${INK}"/><path d="M49.5 61Q54 64 57.5 63.4M62.5 63.4Q66 64 70.5 61" stroke="#14161c" stroke-width="2" fill="none" stroke-linecap="round"/>`
      + `<path d="M60 44C66 44 71 47 74 52" stroke="rgba(255,255,255,.12)" stroke-width="3" fill="none" stroke-linecap="round"/>`
      + `<path d="M78 117C71 117 68.5 126 70.5 132.5C72.5 139 89.5 139 91.5 132.5C93.5 126 91 117 84 117Z" fill="#8A6A3F"/><path d="M76.5 117.5Q81 114.5 85.5 117.5" stroke="#5B4527" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="81" cy="128" r="3.6" fill="#F2C14E" stroke="#B9831F" stroke-width="1"/>` + hand(71, 124, s, 4.8),
    // الشرطي: كاب بشعار، شنب، ودفتر مخالفات
    shurti: s => body('#3F6FA0') + `<path d="M54.5 103.5L60 113L65.5 103.5" fill="#E9EEF5"/><rect x="22" y="108" width="15" height="4" rx="2" fill="#E8B04A" transform="rotate(-20 29 110)"/><rect x="83" y="108" width="15" height="4" rx="2" fill="#E8B04A" transform="rotate(20 90 110)"/>` + neck(s) + face(s)
      + `<ellipse cx="44.5" cy="70" rx="3" ry="4.6" fill="${s}"/><ellipse cx="75.5" cy="70" rx="3" ry="4.6" fill="${s}"/>` + eyes() + brows(.6) + nose + mous('#231a14') + mouth(3, -.6)
      + `<path d="M41.5 53C41.5 37 78.5 37 78.5 53Z" fill="#1f2d4a"/><rect x="41.5" y="50" width="37" height="5" fill="#152038"/><path d="M42.5 55C50 60.5 70 60.5 77.5 55L80 57.5C71 63.5 49 63.5 40 57.5Z" fill="#0e1424"/><circle cx="60" cy="46" r="4" fill="#E8B04A"/><path d="M58 46L60 43.4L62 46L60 48.6Z" fill="#9E7322"/>`
      + `<g transform="rotate(8 82 125)"><rect x="70" y="112" width="22" height="27" rx="2" fill="#F6EEDC" stroke="#C9B996" stroke-width="1"/><rect x="70" y="112" width="22" height="5" fill="#C8323A"/><path d="M74 122H88M74 127H86M74 132H84" stroke="#9C8E72" stroke-width="1.3" stroke-linecap="round"/></g><path d="M58 138L71 120" stroke="#1c2230" stroke-width="2.6" stroke-linecap="round"/>` + hand(58, 134, s, 4.6),
    // الفضّاح: كاميرا قدام وجهه وفلاش
    faddah: s => shm('faddah') + body() + collar + neck(s) + ghBack('url(#sqshm-faddah)') + face(s) + `<ellipse cx="53" cy="68" rx="1.9" ry="2.3" fill="${INK}"/><path d="M49 62Q53 59.5 57 61.6" stroke="#2a1d14" stroke-width="1.8" fill="none" stroke-linecap="round"/>` + nose + mous('#2a1f19') + `<path d="M54 82Q58 86.5 64 82.5" stroke="#6e3326" stroke-width="1.6" fill="none" stroke-linecap="round"/>` + ghFront('url(#sqshm-faddah)') + igal
      + `<rect x="57" y="58" width="31" height="21" rx="4" fill="#26262e"/><rect x="61" y="54.5" width="9" height="4.5" rx="1.5" fill="#26262e"/><circle cx="73" cy="68.5" r="8.4" fill="#4a4a55"/><circle cx="73" cy="68.5" r="5.6" fill="#10131c"/><circle cx="71.2" cy="66.6" r="1.7" fill="rgba(255,255,255,.55)"/><rect x="81" y="60.5" width="4.5" height="3" rx="1" fill="#F7E7A8"/>`
      + `<path d="M95 44L97 51L104 50L98.5 54.5L102 61L95.5 57L90.5 62L92 55L85.5 52.5L92.5 51Z" fill="#FFF3B0"/>` + hand(58, 80, s, 4.6) + hand(87, 80, s, 4.6),
    // الدلّال: يرفع السلعة ويصارخ بالسعر
    dallal: s => body() + collar + neck(s) + ghBack('#F7F4EE') + face(s) + eyes() + brows(-1) + nose + mous('#2a1f19') + `<ellipse cx="60" cy="82.6" rx="3.8" ry="3.2" fill="#5a2620"/><ellipse cx="60" cy="84" rx="2.2" ry="1.2" fill="#C96A5C"/>` + ghFront('#F7F4EE') + igal
      + `<path d="M27 122C25 106 23.5 94 25.5 84L33.5 84C34 95 36 107 39.5 118Z" fill="${THOBE}"/>` + hand(29, 79, s, 5.4)
      + `<path d="M29 74L26 58" stroke="#8B6A3D" stroke-width="1.2"/><g transform="rotate(-14 22 50)"><path d="M14 42H30L33 48L30 54H14Z" fill="#F6EEDC" stroke="#C9B996" stroke-width="1"/><circle cx="29" cy="48" r="1.6" fill="#8B6A3D"/><circle cx="20" cy="48" r="3.4" fill="#F2C14E" stroke="#B9831F" stroke-width="1"/></g>`
      + `<path d="M84 76Q90 73 92 68M86 82Q93 82 96 78" stroke="rgba(255,255,255,.7)" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  };
  function portrait(k){
    const f=ROLES[k]; if(!f) return '';
    const s=SKIN[k]||'#C68B59';
    return `<svg class="sq-art" viewBox="0 0 120 140" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><rect width="120" height="140" fill="${BG[k]||'#555'}"/>${glow}${sadu()}${f(s)}</svg>`;
  }
  return { portrait, has:k=>!!ROLES[k] };
})();
