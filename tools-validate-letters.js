// يفحص بنك الحروف: الجواب يبدأ بالحرف (متجاهلين ال)، وما فيه نصوص مسودة
global.window={};
const fs=require('fs');
for(const f of fs.readdirSync('data').filter(f=>/^letters-.*\.js$/.test(f))) require('./data/'+f);
const list=window.DAHOOM_DATA.letters;
const norm=s=>s.replace(/^[\s"«(]+/,'').replace(/^(ال|الْ)/,'').replace(/^[\s]+/,'');
const first=s=>{ let c=norm(s)[0]; if('إأآا'.includes(c)) c='أ'; return c; };
const bad=[]; const counts={}; const hard={};
list.forEach(x=>{
  counts[x.l]=(counts[x.l]||0)+1; if(x.d===3) hard[x.l]=(hard[x.l]||0)+1;
  const a=x.a.trim();
  const f=first(a);
  if(f!==x.l) bad.push(`LETTER ${x.l} ≠ "${a}" | ${x.q.slice(0,50)}`);
  if(/لا:|—|نقبل|نستبدل|الجواب المقصود|لا،|لا\. /.test(x.q+' '+x.a)) bad.push(`DRAFT ${x.l}: ${x.q.slice(0,60)} => ${a.slice(0,40)}`);
});
const dups={}; list.forEach(x=>{const k=x.l+'|'+x.a.trim(); dups[k]=(dups[k]||0)+1;});
Object.entries(dups).filter(([k,v])=>v>1).forEach(([k,v])=>bad.push('DUP '+k+' x'+v));
console.log(counts); console.log('HARD',hard); console.log('total',list.length);
console.log(bad.join('\n')); console.log('problems:',bad.length);
