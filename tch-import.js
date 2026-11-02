/* ===================== استيراد بيانات المعلمة في الاستمارات =====================
   عند كتابة اسم المعلمة (أو اختياره) في استمارة الإشراف التربوي أو تحفيظ الصغار تُعبّأ الخانات الفارغة تلقائياً:
   1) من «بياناتي الشخصية» التي عبّأتها المعلمة (المركز، الفترة، المؤهل، فئة التدريس، سنوات الخبرة، الجوال)
   2) وما لا يوجد فيها يُؤخذ من آخر «استمارة القرآن الكريم» لنفس المعلمة (مثل العدد الكلي والحاضر ونوعها وعدد المجموعات)
   الخانات التي غيّرتها المشرفة بنفسها لا تُستبدل. لا يُستخدم في الإشراف الإداري. */
// قائمة «فئة التدريس» في استمارات الإشراف التربوي
const T_CATS = ['أمهات', 'متعلمات', 'ناشئة', 'أمهات ومتعلمات', 'متعلمات وناشئة', 'أمهات وناشئة', 'جميع الفئات'];
(function () {
  try { if (typeof EV !== 'undefined') EV.lists.cat = T_CATS; } catch (e) {}
  try { if (typeof TB !== 'undefined') TB.lists.cat = T_CATS; } catch (e) {}
  try { if (typeof TJ !== 'undefined') TJ.lists.cat = T_CATS; } catch (e) {}
  try { if (typeof EF_CATS !== 'undefined') { EF_CATS.single = T_CATS; EF_CATS.multi = T_CATS; } } catch (e) {}
})();

const tiNorm = s => String(s || '').replace(/\s*\(\s*[٠-٩0-9]+\s*\)\s*$/, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, '');
const TI_CACHE = {};
function tiLookup(name, tid) {
  const key = (tid || '') + '|' + tiNorm(name);
  if (!TI_CACHE[key]) TI_CACHE[key] = api('tpLookup', { name: name || '', tid: tid || '' }).then(o => o.data || null).catch(() => { delete TI_CACHE[key]; return null; });
  return TI_CACHE[key];
}
// خيار القائمة المطابق للقيمة (أو null)
function tiOpt(sel, v) {
  if (!sel || !v) return null;
  const k = tiNorm(v);
  return [...sel.options].find(o => o.value && tiNorm(o.value) === k) || null;
}
// خيار المركز المطابق لاسم المركز وفترته من قائمة المراكز في الاستمارة
function tiCenterOpt(sel, name, per) {
  if (!sel || !name) return null;
  const k = tiNorm(typeof cpName === 'function' ? cpName(name) : name), p = String(per || '');
  const L = [...sel.options].filter(o => o.value && tiNorm(typeof cpName === 'function' ? cpName(o.value) : o.value) === k);
  const want = /مسائ/.test(p) && /صباح/.test(p) ? 'both' : /مسائ/.test(p) ? 'pm' : /صباح/.test(p) ? 'am' : '';
  return (want && L.find(o => cpPer(o.value) === want)) || (L.length === 1 || !want ? L[0] : null) || null;
}
const tiPer = p => { p = String(p || ''); return /صباح/.test(p) && /مسائ/.test(p) ? '' : /مسائ/.test(p) ? 'مسائي' : /صباح/.test(p) ? 'صباحي' : ''; };
const tiQual = q => q === 'دبلوم تأهيل منتهي بالتوظيف' ? 'دورة تأهيل منتهي بالتوظيف' : q;
const tiDigits = v => String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
// خانة فارغة أو عُبّئت تلقائياً من قبل (فتُستبدل عند تغيير المعلمة)
const tiFree = el => el && (!String(el.value || '').trim() || el.dataset.ti === '1');
function tiSet(el, v, mark) {
  if (!el || v == null || v === '' || !tiFree(el) || (mark && mark.indexOf(el) > -1)) return false;   // ما عُبّئ من «بياناتي الشخصية» لا يُستبدل بالاستمارة
  if (el.tagName === 'SELECT') { const o = typeof v === 'object' ? v : tiOpt(el, v); if (!o) return false; if (el.value === o.value && el.dataset.ti !== '1') return false; el.value = o.value; }
  else { if (el.value === String(v)) return false; el.value = v; }
  el.dataset.ti = '1';
  el.dispatchEvent(new Event('change', { bubbles: true }));
  if (mark) mark.push(el);
  return true;
}
// المشرفة غيّرت الخانة بنفسها: لا تُستبدل بعد ذلك
document.addEventListener('input', e => { if (e.isTrusted && e.target && e.target.dataset && e.target.dataset.ti) delete e.target.dataset.ti; }, true);
document.addEventListener('change', e => { if (e.isTrusted && e.target && e.target.dataset && e.target.dataset.ti && e.target.tagName === 'SELECT') delete e.target.dataset.ti; }, true);

function tiHint(afterEl, id, txt) {
  let h = document.getElementById(id);
  if (!h) {
    if (!afterEl) return;
    h = document.createElement('div'); h.id = id; h.className = 'id-hint ok';
    h.style.cssText = 'margin:8px 0 0;font-size:13.5px';
    afterEl.parentNode.insertBefore(h, afterEl.nextSibling);
  }
  h.textContent = txt || '';
}

/* ---------- الإشراف التربوي (mushrifat.html): ev القرآن، ef القرآن النهائي، tb التبيان، tj التجويد ---------- */
const TI_QURAN = ['single', 'multi', 'f_single', 'f_multi'];
function tiLastQuran(name, pf) {
  if (typeof evRows === 'undefined') return null;
  const k = tiNorm(name); let best = null;
  evRows.forEach(r => {
    if (TI_QURAN.indexOf(String(r.formType)) < 0 || tiNorm(r.teacher) !== k) return;
    if (!best || String(r.date || '') + (r.at || '') > String(best.date || '') + (best.at || '')) best = r;
  });
  return best;
}
const tiTimers = {};
async function tiTarbawi(pf) {
  if (typeof EDIT !== 'undefined' && EDIT) return;   // تعديل استمارة محفوظة: لا تعبئة تلقائية
  const tEl = document.getElementById(pf + 'Teacher'); if (!tEl) return;
  const name = tEl.value.trim();
  const top = tEl.closest('.ev-top');
  if (!name) { tiHint(top, pf + 'TiHint', ''); return; }
  const g = id => document.getElementById(pf + id);
  const done = [], from = [];
  const p = await tiLookup(name);
  if (tEl.value.trim() !== name) return;   // تغيّر الاسم أثناء الجلب
  if (p) {
    const n0 = done.length;
    tiSet(g('Center'), tiCenterOpt(g('Center'), p.center, p.period), done);
    tiSet(g('Period'), tiPer(p.period), done);
    tiSet(g('Qual'), tiQual(p.qq), done);
    tiSet(g('Cat'), p.cat, done);
    tiSet(g('Years'), tiDigits(p.exp), done);
    if (g('Phone') && p.phone) { tiSet(g('Phone'), p.phone, done); if (g('Tid') && !g('Tid').value) g('Tid').value = p.tid || ''; }
    if (done.length > n0) from.push('«بياناتي الشخصية»');
  }
  const q = tiLastQuran(name, pf);
  if (q) {
    const n0 = done.length, ex = (() => { try { return JSON.parse(q.extra || '{}') || {}; } catch (e) { return {}; } })();
    const cOpt = g('Center') && [...g('Center').options].find(o => o.value === q.center);
    tiSet(g('Center'), cOpt || null, done);
    tiSet(g('Period'), q.period, done);
    tiSet(g('Qual'), q.qual, done);
    tiSet(g('Cat'), q.cat, done);
    tiSet(g('Years'), q.years, done);
    tiSet(g('TotalN'), q.total, done);
    tiSet(g('Present'), q.present, done);
    tiSet(g('Kind'), ex.kind, done);
    tiSet(g('Groups'), ex.groups, done);
    if (done.length > n0) from.push('آخر استمارة قرآن لها');
  }
  tiHint(top, pf + 'TiHint', done.length ? '✔ عُبّئت بيانات المعلمة تلقائياً من ' + from.join(' و') + ' (يمكن التعديل) — افتحي «بيانات المعلمة» للمراجعة.' : '');
  const calc = { ev: 'evCalc', tb: 'tbCalc', tj: 'tjCalc', ef: 'efCalc' }[pf];
  if (done.length && typeof window[calc] === 'function') try { window[calc](); } catch (e) {}
}
['ev', 'tb', 'tj', 'ef'].forEach(pf => {
  const el = document.getElementById(pf + 'Teacher'); if (!el) return;
  el.addEventListener('change', () => { clearTimeout(tiTimers[pf]); tiTarbawi(pf); });
  el.addEventListener('input', () => {   // الاختيار من القائمة المنسدلة
    clearTimeout(tiTimers[pf]);
    const dl = el.list, v = el.value.trim();
    if (dl && [...dl.options].some(o => o.value === v)) tiTimers[pf] = setTimeout(() => tiTarbawi(pf), 300);
  });
});

/* ---------- تحفيظ الصغار (sighar.html): تقرير الزيارة sg والاستمارات se ---------- */
async function tiSighar(p) {
  const isSg = p === 'sg';
  const nameEl = document.getElementById(isSg ? 'sgTeacher' : 'seF_teacher'); if (!nameEl) return;
  const name = nameEl.value.trim(); if (!name) return;
  const t = typeof tdResolve === 'function' ? tdResolve(p) : null;
  const prof = await tiLookup(t && t.id ? '' : name, t && t.id ? t.id : '');
  if (!prof || nameEl.value.trim() !== name) return;
  const done = [];
  const cEl = document.getElementById(isSg ? 'sgCenter' : 'seF_center');
  if (cEl && (!cEl.value || cEl.dataset.auto === '1' || cEl.dataset.ti === '1')) {
    const o = tiCenterOpt(cEl, prof.center, prof.period);
    if (o && cEl.value !== o.value && !cEl.value) { cEl.value = o.value; cEl.dataset.ti = '1'; done.push(cEl); }
  }
  const perId = isSg ? 'sgPeriod' : 'seF_period', per = document.getElementById(perId), pv = tiPer(prof.period) || (/صباح/.test(prof.period) && /مسائ/.test(prof.period) ? 'صباحي / مسائي' : '');
  if (per && pv && !periodGet(perId)) { periodSet(perId, pv); per.dataset.auto = '1'; done.push(per); }
  if (!isSg) {
    const f = k => document.getElementById('seF_' + k);
    tiSet(f('quranQual'), prof.qq, done);
    tiSet(f('qual'), prof.qual, done);
    tiSet(f('years'), tiDigits(prof.exp), done);
    tiSet(f('cat'), prof.cat, done);
  }
  if (done.length) {
    const h = document.getElementById(p + 'AutoHint');
    if (h) h.textContent = (h.textContent ? h.textContent + ' ' : '') + '✔ عُبّئت بيانات المعلمة من «بياناتي الشخصية» (يمكن التعديل).';
    if (isSg && typeof sgUpdateNo === 'function') sgUpdateNo();
  }
}
document.addEventListener('change', e => {
  const id = e.target && e.target.id;
  if (id === 'sgTeacher') setTimeout(() => tiSighar('sg'), 0);
  if (id === 'seF_teacher') setTimeout(() => tiSighar('se'), 0);
});
