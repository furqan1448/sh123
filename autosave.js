/* ===== الحفظ التلقائي للنماذج (مثل Google Sheets) =====
   كل ما يُكتب في النموذج يُحفظ في الجهاز أثناء الكتابة. إذا انقطع الإنترنت أو خرجت المشرفة أو أُغلق المتصفح
   ثم فتحت النموذج من جديد، يرجع كل ما كتبته كما هو. تُحذف المسودة تلقائياً بعد الحفظ الناجح.
   (التواقيع المرسومة لا تُحفظ في المسودة، وتُعاد قبل الحفظ.) */
const AD = (function () {
  const forms = {};      // viewId → { key(), collect(), apply(draft), label }
  const PFX = 'ad_';
  const user = () => { try { return (typeof getUser === 'function' && getUser()) || ''; } catch (e) { return ''; } };
  const k = (viewId, id) => PFX + user() + '_' + viewId + '_' + (id || 'new');
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
  const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} };
  let timer = 0, paused = false;

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
    write(k(viewId, f.key()), { d: data, at: t.toLocaleDateString('ar-SA-u-nu-arab', { day: 'numeric', month: 'numeric' }) + ' ' + t.toLocaleTimeString('ar-SA-u-nu-arab', { hour: 'numeric', minute: '2-digit' }) });
    write(PFX + user() + '_last', { view: viewId, id: f.key() });
  }

  function register(viewId, f) {
    forms[viewId] = f;
    const view = document.getElementById(viewId); if (!view) return;
    const onEdit = () => { clearTimeout(timer); timer = setTimeout(() => saveNow(viewId), 500); };
    view.addEventListener('input', onEdit, true);
    view.addEventListener('change', onEdit, true);
    view.addEventListener('click', e => { if (e.target.closest('button')) onEdit(); }, true);   // إضافة/حذف صف
  }

  // بعد فتح النموذج (جديد أو تعديل): إن وُجدت مسودة لم تُحفظ نعيدها
  function offer(viewId) {
    const f = forms[viewId]; if (!f) return false;
    const saved = read(k(viewId, f.key()));
    banner(viewId, false);
    if (!saved || !saved.d) return false;
    paused = true;
    try { f.apply(saved.d); } catch (e) { console.warn('autosave restore', e); }
    paused = false;
    banner(viewId, true, saved.at);
    return true;
  }

  function clear(viewId, id) {
    const f = forms[viewId];
    try { localStorage.removeItem(k(viewId, id != null ? id : (f ? f.key() : ''))); } catch (e) {}
    banner(viewId, false);
  }
  // بعد الحفظ الناجح: نحذف المسودتين (الجديد والتعديل)
  function done(viewId, id) { clear(viewId, 'new'); if (id) clear(viewId, id); }

  // آخر نموذج كان مفتوحاً (لإعادة فتحه بعد تحديث الصفحة)
  function last() { const v = read(PFX + user() + '_last'); return v && read(k(v.view, v.id)) ? v : null; }
  function has(viewId, id) { return !!read(k(viewId, id || 'new')); }

  // حفظ أخير قبل إغلاق الصفحة
  window.addEventListener('pagehide', () => Object.keys(forms).forEach(saveNow));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Object.keys(forms).forEach(saveNow); });

  return { register, offer, clear, done, last, has, saveNow };
})();
