/* ===== الحفظ التلقائي للنماذج (مثل Google Sheets) =====
   كل ما يُكتب في النموذج يُحفظ في الجهاز أثناء الكتابة. إذا انقطع الإنترنت أو خرجت المشرفة أو أُغلق المتصفح
   ثم فتحت النموذج من جديد، يرجع كل ما كتبته كما هو. تُحذف المسودة تلقائياً بعد الحفظ الناجح.
   (التواقيع المرسومة لا تُحفظ في المسودة، وتُعاد قبل الحفظ.)
   والمسودة تُحفظ في الخادم أيضاً (ورقة «مسودات النماذج»)، فتظهر للمشرفة من أي جهاز تدخل منه. */
const AD = (function () {
  const forms = {};      // viewId → { key(), collect(), apply(draft), label }
  const PFX = 'ad_';
  const user = () => { try { return (typeof getUser === 'function' && getUser()) || ''; } catch (e) { return ''; } };
  const k = (viewId, id) => PFX + user() + '_' + viewId + '_' + (id || 'new');
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
  const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} };
  let timer = 0, paused = false;
  // ---------- مزامنة المسودات مع الخادم ----------
  const sk = (viewId, id) => viewId + '|' + (id || 'new');
  const pend = {};   // مسودات لم تُرسل للخادم بعد: مفتاح الخادم ← { local, t }
  let pushTimer = 0;
  const canApi = () => typeof api === 'function' && typeof getPw === 'function' && getPw() && user();
  function push() {
    clearTimeout(pushTimer);
    if (!canApi()) return;
    Object.keys(pend).forEach(key => {
      const p = pend[key]; delete pend[key];
      const v = read(p.local); if (!v || !v.d) return;
      api('adSave', { key, t: v.t || p.t, data: JSON.stringify({ d: v.d, at: v.at }) }).catch(() => { pend[key] = p; });
    });
  }
  function queue(viewId, id, t) { pend[sk(viewId, id)] = { local: k(viewId, id), t }; clearTimeout(pushTimer); pushTimer = setTimeout(push, 3000); }
  // عند إغلاق الصفحة: نرسل ما بقي فوراً (sendBeacon يكمل حتى بعد الإغلاق)
  function beacon() {
    if (!canApi() || typeof API_URL === 'undefined' || !navigator.sendBeacon) return;
    Object.keys(pend).forEach(key => {
      const p = pend[key], v = read(p.local); if (!v || !v.d) return;
      try { if (navigator.sendBeacon(API_URL, new Blob([JSON.stringify({ action: 'adSave', username: getUser(), password: getPw(), key, t: v.t || p.t, data: JSON.stringify({ d: v.d, at: v.at }) })], { type: 'text/plain;charset=utf-8' }))) delete pend[key]; } catch (e) {}
    });
  }
  const offered = {};   // النموذج المفتوح: هل وُجدت مسودة عند فتحه؟ وهل كُتب فيه بعدها؟
  let syncedUser = '';
  // جلب مسودات المشرفة من الخادم (عند الدخول): الأحدث يُعتمد، وما في الجهاز ولم يصل للخادم يُرسل
  async function sync() {
    if (!canApi() || syncedUser === user()) return;
    syncedUser = user();
    let L = [];
    try { L = (await api('adList')).data || []; } catch (e) { syncedUser = ''; return; }
    const onServer = {};
    L.forEach(x => {
      onServer[x.key] = x.t;
      const i = x.key.indexOf('|'); if (i < 0) return;
      const lk = k(x.key.slice(0, i), x.key.slice(i + 1)), loc = read(lk);
      if (!loc || (loc.t || 0) < x.t) { try { const o = JSON.parse(x.data); write(lk, { d: o.d, at: o.at, t: x.t }); } catch (e) {} }
    });
    const pre = PFX + user() + '_';
    Object.keys(localStorage).filter(key => key.indexOf(pre) === 0 && key !== pre + 'last').forEach(key => {
      const rest = key.slice(pre.length), i = rest.indexOf('_'); if (i < 0) return;
      const viewId = rest.slice(0, i), id = rest.slice(i + 1), v = read(key);
      if (v && v.d && (v.t || 1) > (onServer[sk(viewId, id)] || 0)) queue(viewId, id, v.t || Date.now());
    });
    // نموذج مفتوح الآن ولم يُكتب فيه بعد ولم تكن له مسودة: نعرض المسودة القادمة من جهاز آخر
    Object.keys(offered).forEach(viewId => {
      const o = offered[viewId], view = document.getElementById(viewId);
      if (o && !o.had && !o.typed && view && !view.classList.contains('hidden')) offer(viewId);
    });
  }
  // المزامنة تبدأ بعد الدخول (بلا تعديل صفحات الدخول): نتحقق كل ثانيتين حتى تتم
  setInterval(() => { if (canApi() && syncedUser !== user()) sync(); }, 2000);

  function banner(viewId, show, at) {
    const view = document.getElementById(viewId); if (!view) return;
    let b = view.querySelector('.ad-banner');
    if (!b) {
      b = document.createElement('div');
      b.className = 'ad-banner';
      b.style.cssText = 'background:#eef8f1;border:1.5px solid #9fd3b2;color:#1f6b40;border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:14px;font-weight:700;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap';
      const back = view.querySelector('.back');
      view.insertBefore(b, back ? back.nextSibling : view.firstChild);
    }
    b.classList.toggle('hidden', !show);
    if (show) {
      b.innerHTML = '<span>✔ استُعيد ما كتبتِه سابقاً ولم يُحفظ' + (at ? ' (' + at + ')' : '') + '</span>' +
        '<button type="button" class="btn light" style="padding:5px 12px;font-size:13px">تجاهل المسودة</button>';
      b.querySelector('button').onclick = () => {
        if (!confirm('حذف ما كتبتِه في المسودة والبدء من جديد؟')) return;
        const f = forms[viewId]; clear(viewId);
        if (f && f.reset) f.reset();
        banner(viewId, false);
      };
    }
  }

  // يحفظ النموذج المفتوح حالياً (يُستدعى أثناء الكتابة)
  function saveNow(viewId) {
    const f = forms[viewId], view = document.getElementById(viewId);
    if (!f || !view || view.classList.contains('hidden') || paused) return;
    let data;
    try { data = f.collect(); } catch (e) { return; }
    const t = new Date();
    write(k(viewId, f.key()), { d: data, t: t.getTime(), at: t.toLocaleDateString('ar-SA-u-nu-arab', { day: 'numeric', month: 'numeric' }) + ' ' + t.toLocaleTimeString('ar-SA-u-nu-arab', { hour: 'numeric', minute: '2-digit' }) });
    queue(viewId, f.key(), t.getTime());
    write(PFX + user() + '_last', { view: viewId, id: f.key() });
  }

  function register(viewId, f) {
    forms[viewId] = f;
    const view = document.getElementById(viewId); if (!view) return;
    const onEdit = () => { if (offered[viewId]) offered[viewId].typed = true; clearTimeout(timer); timer = setTimeout(() => saveNow(viewId), 500); };
    view.addEventListener('input', onEdit, true);
    view.addEventListener('change', onEdit, true);
    view.addEventListener('click', e => { if (e.target.closest('button')) onEdit(); }, true);   // إضافة/حذف صف
  }

  // بعد فتح النموذج (جديد أو تعديل): إن وُجدت مسودة لم تُحفظ نعيدها
  function offer(viewId) {
    const f = forms[viewId]; if (!f) return false;
    const saved = read(k(viewId, f.key()));
    banner(viewId, false);
    offered[viewId] = { had: !!(saved && saved.d), typed: false };
    if (!saved || !saved.d) return false;
    paused = true;
    try { f.apply(saved.d); } catch (e) { console.warn('autosave restore', e); }
    paused = false;
    banner(viewId, true, saved.at);
    return true;
  }

  function clear(viewId, id) {
    const f = forms[viewId], key = id != null ? id : (f ? f.key() : '');
    try { localStorage.removeItem(k(viewId, key)); } catch (e) {}
    delete pend[sk(viewId, key)];
    if (canApi()) api('adDel', { key: sk(viewId, key) }).catch(() => {});   // تُحذف من الخادم أيضاً
    banner(viewId, false);
  }
  // بعد الحفظ الناجح: نحذف المسودتين (الجديد والتعديل)
  function done(viewId, id) { clear(viewId, 'new'); if (id) clear(viewId, id); }

  // آخر نموذج كان مفتوحاً (لإعادة فتحه بعد تحديث الصفحة)
  function last() { const v = read(PFX + user() + '_last'); return v && read(k(v.view, v.id)) ? v : null; }
  function has(viewId, id) { return !!read(k(viewId, id || 'new')); }

  // حفظ أخير قبل إغلاق الصفحة
  window.addEventListener('pagehide', () => { Object.keys(forms).forEach(saveNow); beacon(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { Object.keys(forms).forEach(saveNow); beacon(); } });

  return { register, offer, clear, done, last, has, saveNow, sync };
})();
