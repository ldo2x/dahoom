/* ===== دحوم — مؤشر «جاري التحميل» =====
   أي شي ياخذ وقت (تحميل أسئلة اللعبة، تسجيل الدخول، حفظ الملف، البحث، الاتصال) يعرض هالمؤشر
   عشان اللاعب يعرف إن الموقع شغال وما علّق.
     DahoomBusy.show('نجهّز الأسئلة…')   → يطلع بعد ربع ثانية (لو خلص الشي قبلها ما يطلع أبد)
     DahoomBusy.hide()
     DahoomBusy.wrap(promise, 'نحفظ…')  → يطلع ويختفي مع الوعد، ويرجّع نفس الوعد
   الطلبات تتراكم: لو فيه شيين شغالين، المؤشر يظل لين يخلصون الثنين.
*/
window.DahoomBusy = (function(){
  let count = 0, timer = null, shownAt = 0, el = null;
  const DELAY = 250, MIN = 450;
  function node(){
    if(el) return el;
    el = document.createElement('div');
    el.className = 'dh-busy'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="dh-busy-card"><span class="dh-loader" aria-hidden="true"><i></i><i></i><i></i></span><b class="dh-busy-msg"></b></div>';
    document.body.appendChild(el);
    return el;
  }
  function show(msg){
    count++;
    const n = node(); n.querySelector('.dh-busy-msg').textContent = msg || 'لحظة…';
    if(n.classList.contains('on') || timer) return;
    timer = setTimeout(() => { timer = null; if(count > 0){ n.classList.add('on'); shownAt = Date.now(); } }, DELAY);
  }
  function hide(all){
    count = all ? 0 : Math.max(0, count - 1);
    if(count) return;
    if(timer){ clearTimeout(timer); timer = null; }
    if(!el || !el.classList.contains('on')) return;
    const wait = Math.max(0, MIN - (Date.now() - shownAt));
    setTimeout(() => { if(!count && el) el.classList.remove('on'); }, wait);
  }
  function wrap(p, msg){
    show(msg);
    return Promise.resolve(p).finally(() => hide());
  }
  return { show, hide, wrap };
})();
