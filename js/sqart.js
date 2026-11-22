/* ===== بطاقات «ما أصدقك» — ورق لعب مقلوب بأسلوب مسطّح =====
   الشخصية فوق ونفسها مقلوبة تحت، مقصوصة على خط مائل بالنص، وبالنص رمز أبيض.
   الخلفية لونين هادية وهالة ورا الراس. كل شخصية بوقفتها وحركة يدينها الخاصة.
   DahoomSqArt.portrait(k) / card(k, o) / back()
*/
window.DahoomSqArt = (function(){
  const INK='#17120E', WHITE='#F4EFE5', WSH='#CFC5B3', CREAM='#EDE6D6', GOLD='#E3A43A';
  const SKIN={ tajer:['#D7A06E','#B07A4C'], wasta:['#E3B48C','#C08E66'], muhami:['#D9A578','#B27C52'], harami:['#C48C61','#9C6A43'], shurti:['#C98E5F','#A06C42'], faddah:['#DCA77A','#B3805A'], dallal:['#C08A60','#996A45'] };
  const BG ={ tajer:['#3A2B10','#4A3814'], wasta:['#0F2E20','#143D2A'], muhami:['#33231A','#45301F'], harami:['#151A2D','#1E2540'], shurti:['#0E2140','#13305A'], faddah:['#38122D','#4A1A3C'], dallal:['#3D1612','#521F18'] };
  const ACC={ tajer:'#E7B53E', wasta:'#4FD39A', muhami:'#D9A441', harami:'#8EA2F0', shurti:'#5AB4FF', faddah:'#FF7EC7', dallal:'#FF8A5C' };
  const COL={ tajer:'#D9961A', wasta:'#2E9E5B', muhami:'#8A5A2B', harami:'#5E6680', shurti:'#2478C8', faddah:'#D5489A', dallal:'#E2563F' };
  const NUM={ tajer:'١', wasta:'٢', muhami:'٣', harami:'٤', shurti:'٥', faddah:'٦', dallal:'٧' };
  let N=0;
  const cx=50, cy=25;   // مكان الراس

  // ---------- الوجه ----------
  function face(k, o={}){
    const [s,d]=SKIN[k], lx=o.look||0;
    let h=`<path d="M${cx-9} ${cy-4}Q${cx-9.6} ${cy+8} ${cx} ${cy+12.6}Q${cx+9.6} ${cy+8} ${cx+9} ${cy-4}Q${cx+8.6} ${cy-12.2} ${cx} ${cy-12.6}Q${cx-8.6} ${cy-12.2} ${cx-9} ${cy-4}Z" fill="${s}"/>`
      + `<path d="M${cx+2.4} ${cy-12.4}Q${cx+8.6} ${cy-12} ${cx+9} ${cy-4}Q${cx+9.6} ${cy+8} ${cx} ${cy+12.6}Q${cx+5.4} ${cy+6} ${cx+5.6} ${cy-2}Q${cx+5.6} ${cy-9} ${cx+2.4} ${cy-12.4}Z" fill="${d}"/>`;
    if(o.ears) h+=`<ellipse cx="${cx-9.3}" cy="${cy+.5}" rx="1.8" ry="3" fill="${s}"/><ellipse cx="${cx+9.3}" cy="${cy+.5}" rx="1.8" ry="3" fill="${d}"/>`;
    if(o.beard) h+=`<path d="M${cx-9} ${cy+1}Q${cx-8.6} ${cy+10.6} ${cx} ${cy+14}Q${cx+8.6} ${cy+10.6} ${cx+9} ${cy+1}Q${cx+6.4} ${cy+8.2} ${cx} ${cy+8.8}Q${cx-6.4} ${cy+8.2} ${cx-9} ${cy+1}Z" fill="${o.beard}"/>`;
    if(o.stubble) h+=`<path d="M${cx-8.4} ${cy+3}Q${cx-7.6} ${cy+11} ${cx} ${cy+12.4}Q${cx+7.6} ${cy+11} ${cx+8.4} ${cy+3}Q${cx+6} ${cy+9} ${cx} ${cy+9.4}Q${cx-6} ${cy+9} ${cx-8.4} ${cy+3}Z" fill="rgba(30,20,15,.28)"/>`;
    if(!o.shades){
      [-4.1,4.1].forEach(dx=>{ const x=cx+dx;
        const ir = dx>0 && o.irisR;
        h+=`<path d="M${x-2.3} ${cy-1}Q${x} ${cy-2.9} ${x+2.3} ${cy-1}Q${x} ${cy+.6} ${x-2.3} ${cy-1}Z" fill="#FBF6EC"/>`
          + (ir ? `<circle cx="${x+lx}" cy="${cy-1.05}" r="1.15" fill="${o.irisR}"/><circle cx="${x+lx}" cy="${cy-1.05}" r=".55" fill="${INK}"/>` : `<circle cx="${x+lx}" cy="${cy-1.05}" r="1.1" fill="${INK}"/>`)
          + `<circle cx="${x+lx-.4}" cy="${cy-1.45}" r=".35" fill="#fff"/>`; });
      if(o.lids) [-4.1,4.1].forEach(dx=>{ const x=cx+dx; h+=`<path d="M${x-2.4} ${cy-1.4}Q${x} ${cy-3.1} ${x+2.4} ${cy-1.4}L${x+2.4} ${cy-.9}Q${x} ${cy-2} ${x-2.4} ${cy-.9}Z" fill="${d}"/>`; });
    } else h+=`<path d="M${cx-7.4} ${cy-2.6}H${cx-.9}L${cx-1.4} ${cy+1}Q${cx-4.4} ${cy+2} ${cx-7} ${cy+.6}Z M${cx+7.4} ${cy-2.6}H${cx+.9}L${cx+1.4} ${cy+1}Q${cx+4.4} ${cy+2} ${cx+7} ${cy+.6}Z" fill="${INK}"/><path d="M${cx-.9} ${cy-2}H${cx+.9}" stroke="${INK}" stroke-width=".7"/><path d="M${cx-6.2} ${cy-1.6}L${cx-3.6} ${cy-1.9}M${cx+2.4} ${cy-1.9}L${cx+5} ${cy-1.6}" stroke="rgba(255,255,255,.55)" stroke-width=".5"/>`;
    const b=o.brows||[0,0];
    h+=`<path d="M${cx-6.6} ${cy-4.4+b[0]}L${cx-1.6} ${cy-5.2}L${cx-1.7} ${cy-4.2}L${cx-6.5} ${cy-3.4+b[0]}Z M${cx+1.6} ${cy-5.2}L${cx+6.6} ${cy-4.4+b[1]}L${cx+6.5} ${cy-3.4+b[1]}L${cx+1.7} ${cy-4.2}Z" fill="${o.browC||'#2A1C12'}"/>`;
    h+=`<path d="M${cx+.2} ${cy+.6}L${cx+1.9} ${cy+4.6}L${cx-.6} ${cy+5}Z" fill="${d}"/>`;
    if(o.mous) h+=`<path d="M${cx-4.2} ${cy+7.2}Q${cx-2} ${cy+5.4} ${cx} ${cy+6.4}Q${cx+2} ${cy+5.4} ${cx+4.2} ${cy+7.2}Q${cx+2} ${cy+6.8} ${cx} ${cy+7.4}Q${cx-2} ${cy+6.8} ${cx-4.2} ${cy+7.2}Z" fill="${o.mous}"/>`;
    const m=o.mouth||'smile', mc='#6A2E22';
    if(m==='smile') h+=`<path d="M${cx-3} ${cy+8}Q${cx} ${cy+10.4} ${cx+3} ${cy+8}Q${cx} ${cy+9} ${cx-3} ${cy+8}Z" fill="${mc}"/>`;
    if(m==='grin') h+=`<path d="M${cx-3.4} ${cy+7.8}Q${cx} ${cy+11.4} ${cx+3.4} ${cy+7.8}Z" fill="${mc}"/><path d="M${cx-2.8} ${cy+8}H${cx+2.8}" stroke="#fff" stroke-width=".7"/>`;
    if(m==='flat') h+=`<path d="M${cx-2.6} ${cy+8.4}H${cx+2.6}" stroke="${mc}" stroke-width=".9" stroke-linecap="round"/>`;
    if(m==='smirk') h+=`<path d="M${cx-2.6} ${cy+8.6}Q${cx+1} ${cy+9.2} ${cx+3.2} ${cy+7.4}" stroke="${mc}" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
    if(m==='shout') h+=`<ellipse cx="${cx}" cy="${cy+8.6}" rx="2.6" ry="2.2" fill="${mc}"/><ellipse cx="${cx}" cy="${cy+9.6}" rx="1.4" ry=".8" fill="#C96A5C"/>`;
    // ابتسامة واثقة بشفايف حمرا مليانة
    if(m==='confident') h+=`<path d="M${cx-2.7} ${cy+8.1}Q${cx-1.3} ${cy+7.2} ${cx-.4} ${cy+7.6}Q${cx} ${cy+7.35} ${cx+.4} ${cy+7.6}Q${cx+1.4} ${cy+7.1} ${cx+2.9} ${cy+7.7}Q${cx} ${cy+8.5} ${cx-2.7} ${cy+8.1}Z" fill="#C42848"/>`
      + `<path d="M${cx-2.7} ${cy+8.1}Q${cx} ${cy+8.6} ${cx+2.9} ${cy+7.7}Q${cx+2} ${cy+10} ${cx+.1} ${cy+10}Q${cx-2} ${cy+10} ${cx-2.7} ${cy+8.1}Z" fill="#D93B5C"/>`
      + `<path d="M${cx-2.7} ${cy+8.1}Q${cx} ${cy+8.6} ${cx+2.9} ${cy+7.7}" stroke="#7A1530" stroke-width=".35" fill="none"/><ellipse cx="${cx+.5}" cy="${cy+9.2}" rx=".75" ry=".24" fill="#fff" opacity=".5"/>`
      + `<path d="M${cx+2.9} ${cy+7.7}Q${cx+3.5} ${cy+7.4} ${cx+3.8} ${cy+6.8}" stroke="rgba(90,35,10,.4)" stroke-width=".4" fill="none" stroke-linecap="round"/>`;
    if(m==='lips') h+=`<path d="M${cx-2.6} ${cy+8.2}Q${cx} ${cy+6.8} ${cx+2.6} ${cy+8.2}Q${cx} ${cy+10.2} ${cx-2.6} ${cy+8.2}Z" fill="#B23A4A"/>`;
    return h;
  }

  // ---------- غطاء الراس ----------
  const ghutra = (f, sh) => `<path d="M${cx} ${cy-17}Q${cx-13.4} ${cy-17} ${cx-13.2} ${cy-3}Q${cx-14} ${cy+14} ${cx-19.6} ${cy+31}L${cx-9.4} ${cy+31}Q${cx-10.2} ${cy+14} ${cx-9.6} ${cy-2}L${cx+9.6} ${cy-2}Q${cx+10.2} ${cy+14} ${cx+9.4} ${cy+31}L${cx+19.6} ${cy+31}Q${cx+14} ${cy+14} ${cx+13.2} ${cy-3}Q${cx+13.4} ${cy-17} ${cx} ${cy-17}Z" fill="${f}"/>`
    + `<path d="M${cx+9.6} ${cy-2}Q${cx+10.2} ${cy+14} ${cx+9.4} ${cy+31}L${cx+19.6} ${cy+31}Q${cx+14} ${cy+14} ${cx+13.2} ${cy-3}Q${cx+13.2} ${cy-12} ${cx+8} ${cy-15.6}Q${cx+10.4} ${cy-9} ${cx+9.6} ${cy-2}Z" fill="${sh}"/>`;
  const ghutraFront = f => `<path d="M${cx-9.9} ${cy-4.6}Q${cx-9.2} ${cy-13.4} ${cx} ${cy-13.8}Q${cx+9.2} ${cy-13.4} ${cx+9.9} ${cy-4.6}Q${cx} ${cy-9.6} ${cx-9.9} ${cy-4.6}Z" fill="${f}"/>`;
  // العقال: حلقتين على الراس فوق الجبهة (الجزء الخلفي ورا الراس ما يبان)
  const igal = `<path d="M${cx-11.6} ${cy-11.4}Q${cx} ${cy-7.6} ${cx+11.6} ${cy-11.4}" stroke="${INK}" stroke-width="1.6" fill="none"/><path d="M${cx-12} ${cy-9.6}Q${cx} ${cy-5.8} ${cx+12} ${cy-9.6}" stroke="${INK}" stroke-width="1.6" fill="none"/>`
    + `<path d="M${cx-8} ${cy-8.4}Q${cx} ${cy-6.4} ${cx+8} ${cy-8.4}" stroke="rgba(255,255,255,.2)" stroke-width=".35" fill="none"/>`;
  const hood = (f, sh) => `<path d="M${cx} ${cy-17.4}Q${cx-13.8} ${cy-17.4} ${cx-13.8} ${cy-2}Q${cx-13.4} ${cy+17} ${cx-6} ${cy+23}L${cx+6} ${cy+23}Q${cx+13.4} ${cy+17} ${cx+13.8} ${cy-2}Q${cx+13.8} ${cy-17.4} ${cx} ${cy-17.4}Z" fill="${f}"/><path d="M${cx+8} ${cy-15.6}Q${cx+13.8} ${cy-12} ${cx+13.8} ${cy-2}Q${cx+13.4} ${cy+17} ${cx+6} ${cy+23}L${cx+3} ${cy+23}Q${cx+11} ${cy+12} ${cx+10.6} ${cy-4}Q${cx+10.6} ${cy-11} ${cx+8} ${cy-15.6}Z" fill="${sh}"/>`;
  const hoodFront = f => ghutraFront(f) + `<path d="M${cx-9.5} ${cy+1}Q${cx-8.2} ${cy+12.4} ${cx} ${cy+14.2}Q${cx+8.2} ${cy+12.4} ${cx+9.5} ${cy+1}Q${cx+10.4} ${cy+16.4} ${cx} ${cy+18.4}Q${cx-10.4} ${cy+16.4} ${cx-9.5} ${cy+1}Z" fill="${f}"/>`;

  // ---------- اليد: تنرسم حول 0,0 — pose: open | point | fist | cup ----------
  function hand(k, x, y, rot, pose, f=1, sc=1){
    const [s,d]=SKIN[k]; let g='';
    const fing=(fx,h,w=1.55)=>`<rect x="${fx}" y="${-1-h}" width="${w}" height="${h+1.4}" rx="${w/2}" fill="${s}"/>`;
    if(pose==='open'||pose==='cup') g+=fing(-3.3,4.8)+fing(-1.6,5.6)+fing(.1,5.3)+fing(1.8,4.2);
    if(pose==='point') g+=fing(-3.3,6.4)+`<rect x="-1.7" y="-2.4" width="5.2" height="2.6" rx="1.2" fill="${d}"/>`;
    if(pose==='fist') g+=`<rect x="-3.6" y="-2.6" width="7.2" height="3.2" rx="1.5" fill="${s}"/><path d="M-1.8 -2.4V.4M0 -2.4V.4M1.8 -2.4V.4" stroke="${d}" stroke-width=".45"/>`;
    g+=`<rect x="-3.6" y="-1.2" width="7.2" height="6.6" rx="2.2" fill="${s}"/><path d="M1.6 -1.2H1.4Q3.6 -1.2 3.6 1V3.2Q3.6 5.4 1.4 5.4H1.6Z" fill="${d}"/>`;
    g+=`<rect x="2.4" y="0" width="1.7" height="4.6" rx=".85" fill="${s}" transform="rotate(-38 3.2 2.2)"/>`;
    if(pose==='cup') g=`<g transform="scale(1 .82)">${g}</g>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${f*sc} ${sc})">${g}</g>`;
  }
  const arm = (pts, f, w=5) => `<path d="M${pts}" stroke="${f}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  // ---------- الجسم ----------
  const torso = f => `<path d="M37 104Q35.4 62 38.6 51Q39.6 47 44 44.6L45.6 42.4H54.4L56 44.6Q60.4 47 61.4 51Q64.6 62 63 104Z" fill="${f}"/>`;
  const neck = k => `<rect x="${cx-3.6}" y="${cy+9}" width="7.2" height="9" rx="2.4" fill="${SKIN[k][1]}"/>`;
  const thobeV = `<path d="M43 41.6L50 60L57 41.6Z" fill="${WHITE}"/><path d="M50 41.6L50 60L57 41.6Z" fill="${WSH}"/>`;
  const bishtTrim = c => `<path d="M43.4 42.4L46.4 68M56.6 42.4L53.6 68" stroke="${c}" stroke-width="1.5"/>`;

  // ---------- الشخصيات ----------
  const ROLES = {
    // التاجر: يقدّم الريالات بكفه، واليد الثانية على صدره، وابتسامة واثقة
    tajer:{ sym:'coin', draw:k=>torso('#1D1712')+`<path d="M55 43.4L63 104H57.6Z" fill="#2A211A"/>`+neck(k)+thobeV+bishtTrim('#E8B04A')
        + arm('40 50Q24 44 18 34', '#1D1712')+arm('60 50Q66 44 58 39', '#1D1712')
        + ghutra(WHITE, WSH)+face(k,{beard:'#251A12', mous:'#251A12', mouth:'grin', brows:[-.4,-.4]})+ghutraFront(WHITE)+igal
        + hand(k, 18, 31, 0, 'open', 1, 1.05) + [0,1,2,3].map(i=>`<ellipse cx="18" cy="${24-i*2}" rx="4.4" ry="1.5" fill="#F2C14E" stroke="#8C5C14" stroke-width=".5"/>`).join('')
        // رزمة ريالات بيضا مفرودة قدام فمه
        + [-16,-6,4].map(r=>`<g transform="rotate(${r} 52 38)"><rect x="41" y="29" width="21" height="8.4" rx=".6" fill="${WHITE}"/><rect x="42.6" y="30.6" width="17.8" height="5.2" fill="none" stroke="${WSH}" stroke-width=".55"/><circle cx="51.5" cy="33.2" r="1.7" fill="none" stroke="${WSH}" stroke-width=".55"/></g>`).join('')
        + hand(k, 58, 38, -70, 'fist', 1, 1) },
    // الواسطة: الجوال على أذنها، ويدها الثانية تأشر «أعرف واحد»
    wasta:{ sym:'key', draw:k=>torso('#120E16')+`<path d="M55 43.4L63 104H57.6Z" fill="#221A28"/>`+`<path d="M44.6 42.4L47 66M55.4 42.4L53 66" stroke="${GOLD}" stroke-width=".9"/>`
        + arm('40 50Q24 42 20 30', '#120E16')+arm('60 50Q68 40 63 33', '#120E16')
        + hood('#16111C','#251D2D')+face(k,{shades:true, mouth:'lips', brows:[-.6,.6]})+hoodFront('#16111C')
        + hand(k, 20, 27, -8, 'point', 1, 1.05)+`<path d="M17 33.4L23 32.6" stroke="${GOLD}" stroke-width=".9"/>`
        // جوال أبيض كبير على خدها
        + `<g transform="rotate(12 59 22)"><rect x="53.4" y="12" width="9" height="19" rx="2" fill="${WHITE}"/><rect x="54.9" y="14.4" width="6" height="13" rx=".8" fill="${WSH}"/><circle cx="57.9" cy="29.4" r=".7" fill="${WSH}"/></g>`
        + hand(k, 61.4, 31, -160, 'fist', 1, 1)+`<path d="M58.4 35.8L64.4 34.8" stroke="${GOLD}" stroke-width=".9"/>` },
    // المحامي: «اعتراض!» بإصبع مرفوع، وماسك الملف عند صدره
    muhami:{ sym:'scales', draw:k=>torso('#1A1C24')+`<path d="M55 43.4L63 104H57.6Z" fill="#262A35"/>`+neck(k)+thobeV+bishtTrim('#C9CED8')
        + arm('60 50Q79 42 81 30', '#1A1C24')
        + ghutra(WHITE, WSH)+face(k,{beard:'#2E2218', mouth:'flat', brows:[.8,-.8]})+ghutraFront(WHITE)+igal
        + `<circle cx="${cx-4.1}" cy="${cy-1}" r="3" fill="rgba(255,255,255,.12)" stroke="${GOLD}" stroke-width=".55"/><circle cx="${cx+4.1}" cy="${cy-1}" r="3" fill="rgba(255,255,255,.12)" stroke="${GOLD}" stroke-width=".55"/><path d="M${cx-1.1} ${cy-1.2}H${cx+1.1}" stroke="${GOLD}" stroke-width=".5"/>`
        + hand(k, 81, 27, 8, 'point', -1, 1.1)
        // وثيقة بيضا مختومة قدام فمه
        + `<g transform="rotate(-9 50 33)"><rect x="37" y="28.6" width="25" height="9.4" rx=".6" fill="${WHITE}"/><path d="M40 31.6H59M40 34.4H55" stroke="${WSH}" stroke-width=".6"/><path d="M60 28.6L62 30.6V38H60Z" fill="${WSH}"/></g><circle cx="38.4" cy="34.6" r="2.6" fill="#B8323A"/><circle cx="38.4" cy="34.6" r="1.4" fill="#8E2229"/>`
        + arm('40 50Q34 46 41 40', '#1A1C24') + hand(k, 41, 39, -30, 'fist', 1, 1) },
    // الحرامي: طاقية، لثام على عيونه، بلوزة مخططة، «شششش» بإصبعه، والكيس على كتفه
    harami:{ sym:'ninja', draw:(k,u)=>`<defs><pattern id="${u}st" width="6" height="3.4" patternUnits="userSpaceOnUse"><rect width="6" height="3.4" fill="#1F2438"/><rect width="6" height="1.5" fill="#D9DDE8"/></pattern></defs>`
        + `<path d="M58 24C74 14 90 22 88 40C87 50 76 52 70 46Z" fill="#B88A55"/><path d="M60 24C66 20 72 20 76 23" stroke="#7A5832" stroke-width="1.2" fill="none"/><path d="M71 30L78 37" stroke="#7A5832" stroke-width=".8"/>`
        + torso('#1F2438')+[49,52.6,56.2,59.8,63.4,67].map(y=>`<path d="M${y<53?40.4:39} ${y}H${y<53?59.6:61}" stroke="#D9DDE8" stroke-width="1.6"/>`).join('')+neck(k)
        + arm('60 50Q70 38 66 32', '#1F2438')+arm('40 50Q34 46 43 41', '#1F2438')
        + face(k,{ears:true, stubble:true, mouth:'smirk', brows:[-.9,.9], look:1})
        + `<path d="M${cx-10.6} ${cy-3.6}L${cx+10.6} ${cy-4.2}L${cx+10.4} ${cy+1.4}L${cx-10.4} ${cy+1.8}Z" fill="${INK}"/>`
        + [-4.1,4.1].map(dx=>`<path d="M${cx+dx-2.3} ${cy-1}Q${cx+dx} ${cy-2.9} ${cx+dx+2.3} ${cy-1}Q${cx+dx} ${cy+.6} ${cx+dx-2.3} ${cy-1}Z" fill="#FBF6EC"/><circle cx="${cx+dx+1}" cy="${cy-1.05}" r="1.1" fill="${INK}"/>`).join('')
        + `<path d="M${cx-10.6} ${cy-5}Q${cx-11} ${cy-18.6} ${cx} ${cy-19}Q${cx+11} ${cy-18.6} ${cx+10.6} ${cy-5}Z" fill="#2A2F45"/><rect x="${cx-11.4}" y="${cy-7.8}" width="22.8" height="3.4" rx="1.2" fill="#363C58"/>`
        // صرّة فلوس بيضا قدام فمه
        + `<path d="M46 29C43 29 42 32 43.4 33.6C38 35 37.6 42 42 44C46 46 54 46 57 43.4C60 40.4 58 34.6 53.6 33.6C55 32 54 29 51 29Z" fill="${WHITE}"/><path d="M44 33.6H55.4" stroke="${WSH}" stroke-width="1"/><circle cx="50" cy="39.2" r="2.4" fill="none" stroke="${WSH}" stroke-width=".6"/>`
        + hand(k, 43, 40, -30, 'fist', 1, 1)+hand(k, 66, 31, 170, 'fist', 1, 1) },
    // الشرطي: يرفع كفه «وقف!»، والدفتر بيده الثانية
    shurti:{ sym:'shield', draw:k=>torso('#2D5C8F')+`<path d="M55 43.4L63 104H57.6Z" fill="#234A75"/>`+neck(k)+`<path d="M44 41.4L50 50L56 41.4Z" fill="#E9EEF5"/>`
        + `<path d="M38.4 50L44.4 46.4L45 48.6L39.2 52Z M61.6 50L55.6 46.4L55 48.6L60.8 52Z" fill="${GOLD}"/><circle cx="50" cy="56" r=".9" fill="${GOLD}"/><circle cx="50" cy="63" r=".9" fill="${GOLD}"/><circle cx="50" cy="70" r=".9" fill="${GOLD}"/>`
        + arm('60 50Q80 44 82 32', '#2D5C8F')+arm('40 50Q33 46 41 41', '#2D5C8F')
        + face(k,{ears:true, mous:'#1F150E', mouth:'flat', brows:[1,1]})
        + `<path d="M${cx-14.4} ${cy-16.4}Q${cx} ${cy-23.4} ${cx+14.4} ${cy-16.4}L${cx+10.8} ${cy-9.4}H${cx-10.8}Z" fill="#1A2B4C"/>`
        + `<path d="M${cx-14.4} ${cy-16.4}Q${cx} ${cy-23.4} ${cx+14.4} ${cy-16.4}Q${cx} ${cy-18.6} ${cx-14.4} ${cy-16.4}Z" fill="#2A4272"/><path d="M${cx+4} ${cy-19.6}L${cx+10.8} ${cy-9.4}H${cx+6.4}Z" fill="rgba(0,0,0,.18)"/>`
        + `<rect x="${cx-10.8}" y="${cy-10}" width="21.6" height="3.4" fill="#0F1A30"/><rect x="${cx-10.8}" y="${cy-8.9}" width="21.6" height=".9" fill="${GOLD}"/>`
        + `<path d="M${cx-11.4} ${cy-6.8}Q${cx} ${cy-3.6} ${cx+11.4} ${cy-6.8}L${cx+10.2} ${cy-5.4}Q${cx} ${cy-2.4} ${cx-10.2} ${cy-5.4}Z" fill="${INK}"/><path d="M${cx-8} ${cy-5.2}Q${cx} ${cy-3.4} ${cx+8} ${cy-5.2}" stroke="rgba(255,255,255,.18)" stroke-width=".4" fill="none"/>`
        + `<path d="M${cx} ${cy-17.8}L${cx+1.2} ${cy-15.2}L${cx+4} ${cy-15}L${cx+1.9} ${cy-13.2}L${cx+2.6} ${cy-10.6}L${cx} ${cy-12}L${cx-2.6} ${cy-10.6}L${cx-1.9} ${cy-13.2}L${cx-4} ${cy-15}L${cx-1.2} ${cy-15.2}Z" fill="${GOLD}"/>`
        + hand(k, 82, 28, 6, 'open', -1, 1.25)
        // دفتر المخالفات الأبيض مرفوع قدام فمه
        + `<g transform="rotate(-8 49 33)"><rect x="40.6" y="27.4" width="17" height="12" rx=".6" fill="${WHITE}"/><rect x="40.6" y="27.4" width="17" height="2.8" fill="#C8323A"/><path d="M43 32.6H55M43 35H53M43 37.2H51" stroke="${WSH}" stroke-width=".55"/></g>` + hand(k, 42, 40, -30, 'fist', 1, 1) },
    // المخبرة: تأشر بإصبعها على عينها «عيني عليك» — عينها بلون رمز المخبر. o.alt==='m' → نسخة ولد
    // o.alt==='f' → نسخة بنت (شيلة وعباية)
    faddah:{ sym:'eye', draw:(k,u,o={})=>{ const girl=o.alt!=='m', sleeve=girl?'#16101A':'#1D1418';
      const mark = '';
      const body = girl
        ? torso('#16101A')+`<path d="M55 43.4L63 104H57.6Z" fill="#251A2A"/><path d="M44.6 42.4L47 66M55.4 42.4L53 66" stroke="#FF7EC7" stroke-width=".9"/>`
        : `<defs><pattern id="${u}sh" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><rect width="2.4" height="2.4" fill="#C42F36"/><rect width="1.2" height="1.2" fill="#F4E9E0"/></pattern></defs>`
          + torso('#1D1418')+`<path d="M55 43.4L63 104H57.6Z" fill="#2B1F25"/>`+neck(k)+thobeV+bishtTrim('#FF7EC7');
      const head = girl
        ? hood('#1A1218','#2B1E28')+face(k,{mouth:'confident', brows:[-1.4,.2], look:-1.1, irisR:'#FF5FB8'})+hoodFront('#1A1218')
        : ghutra(`url(#${u}sh)`, 'rgba(0,0,0,.25)')+face(k,{mous:'#2A1C12', mouth:'smirk', brows:[-1.2,.8], look:-1.1, lids:true, irisR:'#FF5FB8'})+ghutraFront(`url(#${u}sh)`)+igal;
      return body + arm('60 50Q68 44 62 34.6', sleeve) + arm('40 50Q37 60 38.4 74', sleeve) + head + mark
        + hand(k, 61.6, 32, -40, 'point', 1, 1)
        + (girl ? `<path d="M59.4 34.8L64.6 34" stroke="${GOLD}" stroke-width=".8"/>` : ''); } },
    // الدلّالة: ترفع لفّة القماش عالي، ويدها عند فمها تنادي
    dallal:{ sym:'tag', draw:k=>torso('#15101A')+`<path d="M55 43.4L63 104H57.6Z" fill="#241B2A"/>`
        + `<path d="M15 14C11 26 22 34 18 48C16 56 22 62 20 70" stroke="#E2563F" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M19 14C18 26 28 34 25 46C23 54 28 60 27 66" stroke="#F2C14E" stroke-width="3" fill="none" stroke-linecap="round"/>`
        + `<rect x="9" y="8.6" width="16" height="6" rx="2.4" fill="#2E9E5B"/><path d="M11 8.6V14.6M15 8.6V14.6M19 8.6V14.6M23 8.6V14.6" stroke="#1E7A44" stroke-width=".6"/>`
        + arm('40 50Q22 40 18 20', '#15101A')+arm('60 50Q68 42 61.6 36', '#15101A')
        + hood('#1C1520','#2B2130')+face(k,{mouth:'shout', brows:[-1,-1]})
        + `<g fill="#E7B53E" stroke="#8C5C14" stroke-width=".3"><path d="M${cx-9.4} ${cy-5}H${cx+9.4}V${cy-3}H${cx-9.4}Z"/><path d="M${cx-1.1} ${cy-3}H${cx+1.1}V${cy+5}H${cx-1.1}Z"/><path d="M${cx-9} ${cy+1}H${cx-1.1}V${cy+5.4}Q${cx-6.4} ${cy+5.6} ${cx-9} ${cy+1}Z"/><path d="M${cx+9} ${cy+1}H${cx+1.1}V${cy+5.4}Q${cx+6.4} ${cy+5.6} ${cx+9} ${cy+1}Z"/></g>`
        + hoodFront('#1C1520')
        // قماش أبيض مطوي ترفعه قدام فمها
        + `<path d="M39 31.4Q44 29 50 31Q56 33 61 30.6L62 36.6Q56 39 50 37Q44 35 40 37.4Z" fill="${WHITE}"/><path d="M41 34.4Q45 32.4 50 34Q55 35.6 60.6 33.6" stroke="${WSH}" stroke-width=".6" fill="none"/>`
        + hand(k, 17, 17, 0, 'fist', 1, 1.05) + hand(k, 61.6, 36, -110, 'fist', 1, 1) },
  };

  // ---------- الرموز البيضا بالنص ----------
  // أيقونات اللعبة نفسها (من assets/icons) — الرمز بنص البطاقة نفس أيقونة الشخصية باللعبة
  const ICONS = {"phone": {"vb": 512.0, "st": false, "d": ["M160 32c-16 0-32 16-32 32v384c0 16 16 32 32 32h192c16 0 32-16 32-32V64c0-16-16-32-32-32H160zm21.68 23h96v18h-96V55zM304 55h32v18h-32V55zM154 96h204v320H154V96zm70 342h63.984c16 0 16 16 16 16v6H208v-6s0-16 16-16z"]}, "masks": {"vb": 512.0, "st": false, "d": ["M418.813 30.625c-21.178 26.27-49.712 50.982-84.125 70.844-36.778 21.225-75.064 33.62-110.313 38.06 2.048 6.063 4.316 12.15 6.813 18.25 16.01.277 29.366-.434 36.406-1.5l9.47-1.53 8.436-1.28.22 10.186c-.17 6.172-.535 12.41-1.095 18.72l56.625 8.843c.86-.095 1.713-.15 2.563-.157 11.188-.114 21.44 7.29 24.468 18.593.657 2.448.922 4.903.845 7.313 5.972-2.075 11.753-4.305 17.28-6.72l9.595-4.188 2.313 10.22c3.483 15.308 6.028 31.385 7.375 48.062C438.29 247.836 468.438 225.71 493 197.5c-3.22-36.73-16.154-78.04-39.125-117.813-.735-1.272-1.47-2.526-2.22-3.78l-27.56 71.374c5.154.762 10.123 3.158 14.092 7.126 9.81 9.807 9.813 25.69 0 35.5-9.812 9.81-25.722 9.807-35.53 0-8.86-8.858-9.69-22.68-2.532-32.5l38.938-100.844c-6.45-9.18-13.215-17.83-20.25-25.937zM51.842 118.72c-8.46 17.373-15.76 36.198-21.187 56.436-14.108 52.617-13.96 103.682-2.812 143.438 13.3-2.605 26.442-3.96 39.312-4.03 1.855-.012 3.688.02 5.53.06 20.857.48 40.98 4.332 59.97 11.5-1.08-11.156-1.656-22.574-1.656-34.218 0-27.8 3.135-54.377 9-78.937l2.47-10.407 9.655 4.562c29.467 13.98 66.194 23.424 106.28 25.22 5.136-20.05 8.19-39.78 9.408-58.75-35.198 4.83-75.387 2.766-116.407-8.22-38.363-10.272-72.314-26.78-99.562-46.656zm230.594 82.218c-1.535 10.452-3.615 21.03-6.218 31.687 15.873-.193 31.286-1.594 46-3.97-1.056-1.84-1.895-3.822-2.47-5.968-1.455-5.432-1-10.925.938-15.78l-38.25-5.97zM105 201.375l4.156 18.22-21.594 4.905c8.75 5.174 13.353 15.703 10.594 26-3.32 12.394-16.045 19.758-28.437 16.438-12.394-3.32-19.76-16.075-16.44-28.47.676-2.517 1.756-4.82 3.126-6.874l-21.062 4.78-4.125-18.218 73.78-16.78zm388.594 22.813c-25.53 25.46-55.306 45.445-86.906 60.5.05 2.397.093 4.8.093 7.218 0 9.188-.354 18.232-1.03 27.125 16.635 1.33 32.045-1.7 45.344-9.374 25.925-14.962 40.608-45.694 42.5-85.47zm-338.844 3c-4.03 19.993-6.33 41.31-6.406 63.593l.125-.342c30.568 10.174 62.622 17.572 95.25 21.375l7.5.875.718 7.5 5.687 60.125-18.625 1.75-2.53-26.75c-4.547 1.875-9.726 2.34-14.845.968-12.393-3.32-19.76-16.042-16.438-28.436.285-1.06.647-2.08 1.063-3.063-19.535-3.727-38.736-8.592-57.406-14.53 2.69 49.62 16.154 94.04 36.094 126.656 22.366 36.588 52.13 57.78 83.968 57.78 31.838.003 61.602-21.19 83.97-57.78 19.536-31.96 32.846-75.244 35.905-123.656-15.773 4.657-31.894 8.552-48.25 11.656 1.914 4.57 2.415 9.78 1.033 14.938-3.322 12.394-16.045 19.758-28.438 16.437-.732-.195-1.43-.427-2.125-.686l-2.5 26.47-18.594-1.752 5.688-60.125.72-7.5 7.498-.875c29.245-3.407 57.995-9.717 85.657-18.312v-1.594c0-21.573-2.27-42.23-6.064-61.75C351.132 242.653 313.092 250 272.312 250c-43.59 0-83.986-8.658-117.562-22.813zm-87.5 105.968c-10.87.102-21.995 1.22-33.375 3.313 12.695 31.62 33.117 53.07 59 60 16.9 4.523 34.896 2.536 52.813-5.25-4.382-13.89-7.874-28.606-10.344-43.97-21.115-9.623-43.934-14.32-68.094-14.094zm137.5 80.22h130.813c-40.082 44.594-92.623 42.844-130.813 0z"]}, "hm-camera": {"vb": 24.0, "st": true, "d": ["M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2", "M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"]}, "ninja": {"vb": 512.0, "st": false, "d": ["M280.054 19.867c-64.315 0-121.76 28.793-159.643 73.934 27.387.07 87.928 3.05 96.12 25.726-38.414-12.105-79.753-11.26-108.534-9.302a201.013 201.013 0 0 0-13.656 23.314c31.507-8.307 147.998-3.37 154.8 21.268-75.985-18.624-140.59-8.65-162.058-4.895-8.768 22.446-13.584 46.805-13.584 72.272 0 111.736 96.248 269.949 210.324 269.949 57.808 0 109.1-40.63 145.637-95.248-31.403 23.812-98.04 57.308-139.002 34.648 81.592-8.994 139.965-50.978 156.19-63.353 25.207-47.142 39.959-100.432 39.959-145.996 0-111.737-92.477-202.317-206.553-202.317zm-.002 151.692c105.084 0 190.273 27.727 190.273 61.931 0 22.047-4.495 33.48-57.797 44.453-29.39 6.052-95.127-31.181-132.476-31.181-34.864 0-87.12 41.345-115.219 36.017-56.597-10.732-75.053-26.433-75.053-49.289 0-34.204 85.188-61.931 190.272-61.931zm83.885 39.894c-20.14-.12-41.571 3.295-41.475 9.91.182 12.453 17.364 22.298 38.377 21.99 21.013-.306 18.555-16.216 37.717-23.101-.085-5.837-16.85-8.693-34.62-8.799zm-172.682 2.883c-17.77.105-34.534 2.964-34.62 8.8 19.162 6.885 16.704 22.796 37.718 23.102 21.013.307 38.195-9.54 38.377-21.992.096-6.615-21.336-10.03-41.475-9.91zm92.57 82.441c31.032 0 56.188 25.235 56.188 25.235s-28.184-11.104-59.217-11.104c-31.032 0-53.16 11.104-53.16 11.104s25.156-25.235 56.19-25.235zM31.25 411.39c4.344 2.046 7.783-40.336 52.246-61.265-8.111-8.465-12.438-24.638-14.24-35.502-32.733 4.158-55.012 84.887-38.006 96.767zm56.31-41.694c-7.511-.052-17.26-.228-17.445 16.937-.498 46.31-42.805 96.953-40.128 98.215 7.138 3.364 49.598-32.077 61.906-59.44 4.159-9.244 11.516-55.603-4.333-55.712z"]}, "hm-gavel": {"vb": 24.0, "st": true, "d": ["M13 10l7.383 7.418c.823 .82 .823 2.148 0 2.967a2.11 2.11 0 0 1 -2.976 0l-7.407 -7.385", "M6 9l4 4", "M13 10l-4 -4", "M3 21h7", "M6.793 15.793l-3.586 -3.586a1 1 0 0 1 0 -1.414l2.293 -2.293l.5 .5l3 -3l-.5 -.5l2.293 -2.293a1 1 0 0 1 1.414 0l3.586 3.586a1 1 0 0 1 0 1.414l-2.293 2.293l-.5 -.5l-3 3l.5 .5l-2.293 2.293a1 1 0 0 1 -1.414 0z"]}, "hm-exchange": {"vb": 24.0, "st": true, "d": ["M7 10h14l-4 -4", "M17 14h-14l4 4"]}, "coins": {"vb": 512.0, "st": false, "d": ["M264.4 95.01c-35.6-.06-80.2 11.19-124.2 34.09C96.27 152 61.45 182 41.01 211.3c-20.45 29.2-25.98 56.4-15.92 75.8 10.07 19.3 35.53 30.4 71.22 30.4 35.69.1 80.29-11.2 124.19-34 44-22.9 78.8-53 99.2-82.2 20.5-29.2 25.9-56.4 15.9-75.8-10.1-19.3-35.5-30.49-71.2-30.49zm91.9 70.29c-3.5 15.3-11.1 31-21.8 46.3-22.6 32.3-59.5 63.8-105.7 87.8-46.2 24.1-93.1 36.2-132.5 36.2-18.6 0-35.84-2.8-50.37-8.7l10.59 20.4c10.08 19.4 35.47 30.5 71.18 30.5 35.7 0 80.3-11.2 124.2-34.1 44-22.8 78.8-52.9 99.2-82.2 20.4-29.2 26-56.4 15.9-75.7zm28.8 16.8c11.2 26.7 2.2 59.2-19.2 89.7-18.9 27.1-47.8 53.4-83.6 75.4 11.1 1.2 22.7 1.8 34.5 1.8 49.5 0 94.3-10.6 125.9-27.1 31.7-16.5 49.1-38.1 49.1-59.9 0-21.8-17.4-43.4-49.1-59.9-16.1-8.4-35.7-15.3-57.6-20zm106.7 124.8c-10.2 11.9-24.2 22.4-40.7 31-35 18.2-82.2 29.1-134.3 29.1-21.2 0-41.6-1.8-60.7-5.2-23.2 11.7-46.5 20.4-68.9 26.1 1.2.7 2.4 1.3 3.7 2 31.6 16.5 76.4 27.1 125.9 27.1s94.3-10.6 125.9-27.1c31.7-16.5 49.1-38.1 49.1-59.9z"]}, "hm-siren": {"vb": 24.0, "st": true, "d": ["M8 16v-4a4 4 0 0 1 8 0v4", "M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7", "M6 17a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1z"]}};
  const ROLE_ICON = {"tajer": "coins", "wasta": "phone", "muhami": "hm-gavel", "harami": "ninja", "shurti": "hm-siren", "faddah": "hm-camera", "dallal": "hm-exchange"};
  // أيقونة بحجم size حول (x,y) بلون c
  function iconSVG(name, x, y, size, c){
    const I=ICONS[name]; if(!I) return '';
    const sc=size/I.vb, t=`translate(${(x-size/2).toFixed(2)} ${(y-size/2).toFixed(2)}) scale(${sc.toFixed(4)})`;
    return I.st ? `<g transform="${t}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I.d.map(d=>`<path d="${d}"/>`).join('')}</g>`
                : `<g transform="${t}" fill="${c}">${I.d.map(d=>`<path d="${d}"/>`).join('')}</g>`;
  }
  const SYM = {
    // نفس أيقونة النينجا الصغيرة اللي باللعبة
    ninja:()=>`<path transform="translate(30 50) scale(.078)" fill="${WHITE}" d="M280.054 19.867c-64.315 0-121.76 28.793-159.643 73.934 27.387.07 87.928 3.05 96.12 25.726-38.414-12.105-79.753-11.26-108.534-9.302a201.013 201.013 0 0 0-13.656 23.314c31.507-8.307 147.998-3.37 154.8 21.268-75.985-18.624-140.59-8.65-162.058-4.895-8.768 22.446-13.584 46.805-13.584 72.272 0 111.736 96.248 269.949 210.324 269.949 57.808 0 109.1-40.63 145.637-95.248-31.403 23.812-98.04 57.308-139.002 34.648 81.592-8.994 139.965-50.978 156.19-63.353 25.207-47.142 39.959-100.432 39.959-145.996 0-111.737-92.477-202.317-206.553-202.317zm-.002 151.692c105.084 0 190.273 27.727 190.273 61.931 0 22.047-4.495 33.48-57.797 44.453-29.39 6.052-95.127-31.181-132.476-31.181-34.864 0-87.12 41.345-115.219 36.017-56.597-10.732-75.053-26.433-75.053-49.289 0-34.204 85.188-61.931 190.272-61.931zm83.885 39.894c-20.14-.12-41.571 3.295-41.475 9.91.182 12.453 17.364 22.298 38.377 21.99 21.013-.306 18.555-16.216 37.717-23.101-.085-5.837-16.85-8.693-34.62-8.799zm-172.682 2.883c-17.77.105-34.534 2.964-34.62 8.8 19.162 6.885 16.704 22.796 37.718 23.102 21.013.307 38.195-9.54 38.377-21.992.096-6.615-21.336-10.03-41.475-9.91zm92.57 82.441c31.032 0 56.188 25.235 56.188 25.235s-28.184-11.104-59.217-11.104c-31.032 0-53.16 11.104-53.16 11.104s25.156-25.235 56.19-25.235zM31.25 411.39c4.344 2.046 7.783-40.336 52.246-61.265-8.111-8.465-12.438-24.638-14.24-35.502-32.733 4.158-55.012 84.887-38.006 96.767zm56.31-41.694c-7.511-.052-17.26-.228-17.445 16.937-.498 46.31-42.805 96.953-40.128 98.215 7.138 3.364 49.598-32.077 61.906-59.44 4.159-9.244 11.516-55.603-4.333-55.712z"/>`,
    coin:a=>`<circle cx="50" cy="70" r="13" fill="${WHITE}"/><circle cx="50" cy="70" r="10.4" fill="none" stroke="${a}" stroke-width="1.1"/><path d="M50 62.4L52.2 67.8L57.6 70L52.2 72.2L50 77.6L47.8 72.2L42.4 70L47.8 67.8Z" fill="${a}"/>`,
    key:a=>`<circle cx="50" cy="58" r="8" fill="${WHITE}"/><circle cx="50" cy="58" r="3.2" fill="${a}"/><rect x="48.3" y="64.4" width="3.4" height="24" fill="${WHITE}"/><rect x="51.6" y="80" width="5.4" height="2.8" fill="${WHITE}"/><rect x="51.6" y="85" width="4" height="2.8" fill="${WHITE}"/>`,
    scales:()=>`<g fill="${WHITE}"><polygon points="48.8,52 51.2,52 51.6,86 48.4,86"/><polygon points="47.2,52 52.8,52 50,48.4"/><polygon points="33,60 67,60 65.4,62.8 34.6,62.8"/>
      <path d="M34.6 62.4L30.6 76M34.6 62.4L38.6 76M65.4 62.4L61.4 76M65.4 62.4L69.4 76" stroke="${WHITE}" stroke-width=".6"/><path d="M28.4 76H40.8A6.2 4.6 0 0 1 28.4 76Z"/><path d="M59.2 76H71.6A6.2 4.6 0 0 1 59.2 76Z"/><polygon points="41,90 59,90 55.6,86 44.4,86"/></g>`,
    sack:a=>`<path d="M45 58C42 56 43 52 46 53L50 55L54 53C57 52 58 56 55 58Z" fill="${WHITE}"/><path d="M46 58C36 62 34 82 42 86C46 88 54 88 58 86C66 82 64 62 54 58Z" fill="${WHITE}"/><path d="M45.6 58.4H54.4" stroke="${a}" stroke-width="1.2"/><circle cx="50" cy="73" r="5.6" fill="${a}"/><path d="M50 69.6L51 72L53.4 73L51 74L50 76.4L49 74L46.6 73L49 72Z" fill="${WHITE}"/>`,
    shield:a=>`<path d="M50 54L63 58.6V68C63 77 57.4 82.6 50 86C42.6 82.6 37 77 37 68V58.6Z" fill="${WHITE}"/><path d="M50 57.6L60 61.2V68.2C60 75 55.8 79.4 50 82.2C44.2 79.4 40 75 40 68.2V61.2Z" fill="none" stroke="${a}" stroke-width=".9"/><path d="M50 62.6L51.8 66.8L56.4 67.2L52.9 70.1L54 74.6L50 72.2L46 74.6L47.1 70.1L43.6 67.2L48.2 66.8Z" fill="${a}"/>`,
    eye:a=>`<path d="M30 70Q50 54 70 70Q50 86 30 70Z" fill="${WHITE}"/><circle cx="50" cy="70" r="7.6" fill="${a}"/><circle cx="50" cy="70" r="3.6" fill="${INK}"/><circle cx="47.8" cy="67.8" r="1.4" fill="#fff"/>`,
    tag:a=>`<path d="M50 48C46.4 51 47 55 50 57" stroke="${WHITE}" stroke-width=".9" fill="none"/><polygon points="50,55 60,62 60,88 40,88 40,62" fill="${WHITE}"/><circle cx="50" cy="61.4" r="2" fill="${a}"/><circle cx="50" cy="75" r="6.6" fill="${a}"/><path d="M50 71.6L51 74L53.4 75L51 76L50 78.4L49 76L46.6 75L49 74Z" fill="${WHITE}"/>`,
  };

  // الشبكة: خطوط مشعّة ودوائر من مركز بكل نص (ثابتة لكل شخصية)
  const RAY2={ tajer:'#F08A2E', wasta:'#C9E86A', muhami:'#E07A3A', harami:'#C7B8FF', shurti:'#FF5A5A', faddah:'#FFC36B', dallal:'#FFD166' };
  function rays(k, x, y){
    const a=ACC[k], b=RAY2[k]; let s=7; for(const ch of k) s=(s*31+ch.charCodeAt(0))%9973;
    const rnd=()=>{ s=(s*16807)%2147483647; return (s%1000)/1000; };
    let out='';
    for(let i=0;i<22;i++){ const t=i/22*Math.PI*2+(rnd()-.5)*.16, L=55+rnd()*70;
      out+=`<path d="M${x} ${y}L${(x+L*Math.cos(t)).toFixed(1)} ${(y+L*Math.sin(t)).toFixed(1)}" stroke="${i%3?a:b}" stroke-width="${[.3,.45,.6][i%3]}" opacity=".6"/>`; }
    return out + [10,18,27].map(r=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${r===10?b:a}" stroke-width=".45" opacity=".55"/>`).join('');
  }
  const SCENE = {
    // سوق: أقواس وفوانيس
    tajer:a=>[-6,20,46,72].map(x=>`<path d="M${x} 84V54Q${x+14} 34 ${x+28} 54V84Z" fill="rgba(0,0,0,.24)"/><path d="M${x+4} 84V56Q${x+14} 41 ${x+24} 56" stroke="${a}" stroke-width=".4" fill="none" opacity=".5"/>`).join('')
      + [[12,0,20],[88,0,16]].map(([x,y,l])=>`<path d="M${x} ${y}V${l}" stroke="${a}" stroke-width=".4"/><path d="M${x-3} ${l}H${x+3}L${x+2} ${l+7}H${x-2}Z" fill="${a}"/><circle cx="${x}" cy="${l+3.6}" r="5" fill="${a}" opacity=".18"/>`).join(''),
    // إشارات اتصال من الزاوية
    wasta:a=>[16,28,40,52,64,76].map((r,i)=>`<path d="M${100-r} 0A${r} ${r} 0 0 0 100 ${r}" stroke="${a}" stroke-width="${1.6-i*.15}" fill="none" opacity="${.5-i*.06}"/>`).join('')
      + [[14,14],[22,40],[8,58],[30,8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".9" fill="${a}" opacity=".6"/>`).join(''),
    // محكمة: أعمدة وسقف مثلث
    muhami:a=>`<path d="M-2 16L50 2L102 16Z" fill="rgba(255,236,200,.07)" stroke="${a}" stroke-width=".4" opacity=".7"/>`
      + [4,16,74,86].map(x=>`<rect x="${x}" y="18" width="8" height="70" fill="rgba(255,236,200,.07)"/><rect x="${x-1}" y="17" width="10" height="2.4" fill="rgba(255,236,200,.12)"/><path d="M${x+2.6} 20V88M${x+5.4} 20V88" stroke="rgba(0,0,0,.2)" stroke-width=".5"/>`).join(''),
    // ليل: قمر بدر ونجوم وسطوح نجدية
    harami:a=>{ let m='M-2 84V64'; for(let x=-2;x<104;x+=10) m+=`L${x+2.5} 64L${x+5} 58L${x+7.5} 64L${x+10} 64`; m+='V84Z';
      return `<circle cx="82" cy="15" r="8.4" fill="#F3E6BF" opacity=".9"/><circle cx="80" cy="13" r="1.6" fill="#D9CBA0"/><circle cx="85" cy="18" r="1.1" fill="#D9CBA0"/><circle cx="82" cy="15" r="13" fill="#F3E6BF" opacity=".08"/>`
        + [[12,12],[24,6],[30,20],[8,34],[94,36],[68,6],[40,10]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".8" fill="#F3E6BF"/>`).join(''); },
    // ضوء أحمر وأزرق من فوق
    shurti:a=>`<path d="M0 0H28L0 34Z" fill="#FF4D4D" opacity=".3"/><path d="M100 0H72L100 34Z" fill="#6FC3FF" opacity=".36"/><circle cx="0" cy="0" r="10" fill="#FF4D4D" opacity=".35"/><circle cx="100" cy="0" r="10" fill="#6FC3FF" opacity=".4"/>`,
    // لوحة تحقيق: قصاصات مثبتة بخيط أحمر، وسبوت لايت
    faddah:a=>`<path d="M40 0H60L86 84H14Z" fill="rgba(255,255,255,.06)"/>`
      + `<g transform="rotate(-10 14 40)"><rect x="4" y="32" width="18" height="14" fill="#EFE6CF" opacity=".85"/><path d="M6.4 36H19.6M6.4 39H18M6.4 42H19.6" stroke="#8a7f6a" stroke-width=".6"/></g><g transform="rotate(8 86 52)"><rect x="77" y="45" width="17" height="13" fill="#EFE6CF" opacity=".85"/><rect x="79" y="47" width="6" height="5" fill="#8a7f6a"/><path d="M87 48H92M87 51H91" stroke="#8a7f6a" stroke-width=".6"/></g>`
      + `<path d="M13 33L50 12L86 46" stroke="#E0475B" stroke-width=".5" fill="none"/><circle cx="13" cy="33" r="1.3" fill="#E0475B"/><circle cx="86" cy="46" r="1.3" fill="#E0475B"/><circle cx="50" cy="12" r="1" fill="#E0475B"/>`,
    // سوق القماش: أعلام مثلثة وأقمشة مخططة معلّقة
    dallal:a=>{ const c=['#F2C14E','#2E9E5B','#F4EFE5','#5AB4FF','#E2563F']; let f='';
      for(let i=0;i<9;i++){ const x=-2+i*13, y=6+Math.sin(i/8*Math.PI)*5; f+=`<path d="M${x} ${y}L${x+11} ${y+1}L${x+5.5} ${y+10}Z" fill="${c[i%5]}" opacity=".85"/>`; }
      return `<path d="M-4 5Q50 18 104 5" stroke="#F4EFE5" stroke-width=".5" fill="none" opacity=".6"/>${f}`
; },
  };
  function portrait(k, opt={}){
    const R=ROLES[k]; if(!R) return '';
    const u='sqc'+(++N), [b1,b2]=BG[k], a=ACC[k];
    const sparks=[[14,10],[86,12],[92,32],[8,40],[80,6]].map(([x,y],i)=>`<path d="M${x} ${y-1.8}L${x+.5} ${y-.5}L${x+1.8} ${y}L${x+.5} ${y+.5}L${x} ${y+1.8}L${x-.5} ${y+.5}L${x-1.8} ${y}L${x-.5} ${y-.5}Z" fill="${a}" opacity="${.5+i%2*.3}"/>`).join('');
    const fig = `<g transform="translate(61 25) scale(.94) translate(-50 -25)"><circle cx="${cx}" cy="${cy}" r="21" fill="${a}" opacity=".2"/><circle cx="${cx}" cy="${cy}" r="21" fill="none" stroke="${a}" stroke-width=".5" opacity=".7"/><circle cx="${cx}" cy="${cy}" r="25" fill="none" stroke="${a}" stroke-width=".3" opacity=".45"/>${R.draw(k, u, opt)}</g>`;
    const half = `<g mask="url(#${u}m)">${SCENE[k](a)}${fig}</g>`;
    return `<svg class="sq-art" viewBox="0 0 100 140" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs>
        <pattern id="${u}h" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><circle cx=".8" cy=".8" r=".26" fill="rgba(0,0,0,.2)"/></pattern>
        <clipPath id="${u}c"><rect x="4" y="4" width="92" height="132" rx="5"/></clipPath>
        <linearGradient id="${u}g" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="98"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
        <mask id="${u}m" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="180"><rect x="-20" y="-20" width="140" height="180" fill="url(#${u}g)"/></mask>
        <g id="${u}f">${half}</g></defs>
      <rect width="100" height="140" fill="${CREAM}"/>
      <g clip-path="url(#${u}c)"><rect width="100" height="140" fill="${b1}"/><rect width="100" height="140" fill="${b2}" opacity=".5"/>
        <use href="#${u}f"/><use href="#${u}f" transform="rotate(180 50 70)"/>
        <circle cx="50" cy="70" r="18.6" fill="#0B0908" opacity=".35"/><circle cx="50" cy="70" r="16.6" fill="#0B0908"/><circle cx="50" cy="70" r="16.6" fill="none" stroke="${CREAM}" stroke-width=".8"/><circle cx="50" cy="70" r="18.4" fill="none" stroke="${a}" stroke-width=".6"/>
        <g transform="translate(50 70) scale(.74) translate(-50 -70)">${SYM[R.sym](a)}</g>
        <rect width="100" height="140" fill="url(#${u}h)"/></g></svg>`;
  }
  const esc = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function card(k, o){
    if(typeof o==='string') o={ name:o, color:arguments[2] };
    o=o||{};
    return `<span class="sqc tarot court" style="--rc:${o.color||COL[k]||'#555'};--rl:${ACC[k]||CREAM}">${portrait(k, { alt:o.alt })}<span class="sqc-plate">${esc(o.name)}</span></span>`;
  }
  function back(){
    const u='sqb'+(++N), M=ICONS.masks;
    let rays=''; for(let i=0;i<32;i++){ const t=i/32*Math.PI*2; rays+=`<path d="M50 70L${(50+95*Math.cos(t)).toFixed(1)} ${(70+95*Math.sin(t)).toFixed(1)}" stroke="#E3B95A" stroke-width="${i%2?.25:.6}" opacity="${i%2?.35:.55}"/>`; }
    const mini = `<g transform="scale(${(7/M.vb).toFixed(4)})" fill="#E3B95A">${M.d.map(d=>`<path d="${d}"/>`).join('')}</g>`;
    const title = y => `<text x="50" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="7.4" fill="#F3E6C8" style="font-family:Lalezar,'IBM Plex Sans Arabic',sans-serif">ما أصدقك</text>`;
    return `<span class="sqc tarot court back"><svg class="sq-art" viewBox="0 0 100 140" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs>
        <pattern id="${u}p" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><g opacity=".13">${mini}</g><g transform="translate(8 8)" opacity=".13">${mini}</g></pattern>
        <radialGradient id="${u}r" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#7A1E35"/><stop offset="1" stop-color="#2A0812"/></radialGradient>
        <pattern id="${u}h" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><circle cx=".8" cy=".8" r=".26" fill="rgba(0,0,0,.2)"/></pattern><clipPath id="${u}c"><rect x="4" y="4" width="92" height="132" rx="5"/></clipPath></defs>
      <rect width="100" height="140" fill="${CREAM}"/><g clip-path="url(#${u}c)"><rect width="100" height="140" fill="url(#${u}r)"/><rect width="100" height="140" fill="url(#${u}p)"/>${rays}
        <rect x="8" y="8" width="84" height="124" rx="3" fill="none" stroke="#E3B95A" stroke-width=".5" opacity=".8"/><rect x="10" y="10" width="80" height="120" rx="2" fill="none" stroke="#E3B95A" stroke-width=".25" opacity=".6"/>
        ${[[10,10],[90,10],[10,130],[90,130]].map(([x,y])=>`<path d="M${x} ${y-3}L${x+3} ${y}L${x} ${y+3}L${x-3} ${y}Z" fill="#E3B95A"/>`).join('')}
        <circle cx="50" cy="70" r="27" fill="none" stroke="#E3B95A" stroke-width=".4" stroke-dasharray="1.2 1.6"/>
        <circle cx="50" cy="70" r="22" fill="#2A0812" stroke="#E3B95A" stroke-width="1.1"/><circle cx="50" cy="70" r="19.4" fill="${CREAM}"/><circle cx="50" cy="70" r="17.6" fill="none" stroke="#7A1E35" stroke-width=".5"/>
        ${iconSVG('masks', 50, 70, 26, '#5A1428')}
        <rect x="31" y="15" width="38" height="11" rx="1.4" fill="#2A0812" stroke="#E3B95A" stroke-width=".5"/>${title(20.8)}
        <rect x="31" y="114" width="38" height="11" rx="1.4" fill="#2A0812" stroke="#E3B95A" stroke-width=".5"/>${[42,50,58].map((x,i)=>`<path d="M${x} ${119.5-(i===1?3:2.2)}L${x+(i===1?3:2.2)} 119.5L${x} ${119.5+(i===1?3:2.2)}L${x-(i===1?3:2.2)} 119.5Z" fill="#E3B95A"/>`).join('')}
        <rect width="100" height="140" fill="url(#${u}h)"/></g></svg></span>`;
  }
  // بلاطة اللعبة بالرئيسية: مروحة بطاقات حقيقية من اللعبة
  function mountTile(){
    const m=document.querySelector('#card-sadq .mk-sq'); if(!m || m.dataset.done) return; m.dataset.done='1';
    const names={ faddah:'المخبرة', tajer:'التاجر', harami:'الحرامي', wasta:'الواسطة' };
    m.innerHTML = `<span class="sqt c1">${card('faddah',{name:names.faddah})}</span><span class="sqt c2">${card('wasta',{name:names.wasta})}</span><span class="sqt c3">${back()}</span><span class="sqt c4">${card('tajer',{name:names.tajer})}</span><span class="sqt c5">${card('harami',{name:names.harami})}</span>`;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mountTile); else setTimeout(mountTile, 0);
  return { portrait, card, back, mountTile, has:k=>!!ROLES[k] };
})();
