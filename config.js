// ===== الإعدادات =====
// الصقي هنا رابط الـ Web App بعد النشر (ينتهي بـ /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbxkSAFrUFDPQU-Vz3UiPU7Uv-NQiwkIAwvnO0elYEEztY37AJGqyXDlif4mHCSWGR-5jA/exec";

const PW_KEY = 'mush_pw';
const USER_KEY = 'mush_user';
// ===== تسجيل الخروج تلقائياً عند إغلاق الصفحة (في كل صفحات المنظومة) =====
// كلمة المرور تبقى أثناء التنقل بين صفحات المنظومة وتحديثها، وعند إغلاق الصفحة ثم فتحها من جديد يُطلب الدخول مرة أخرى
(function () {
  const PW_KEYS = ['mush_pw', 'ctr_pw', 'tch_pw', 'mgr_pw'];   // المشرفات، إدارة المراكز، المعلمات، إدارة الوحدات
  try {
    if (!sessionStorage.getItem('furqan_session')) {
      PW_KEYS.forEach(k => localStorage.removeItem(k));
      sessionStorage.setItem('furqan_session', '1');
    }
  } catch (e) {}
})();
const getPw = () => localStorage.getItem(PW_KEY) || '';
const getUser = () => localStorage.getItem(USER_KEY) || '';

// ===== كاش محلي: نعرض آخر بيانات محفوظة فوراً ثم نحدّثها من الخادم بالخلفية =====
const CACHE_PFX = 'mush_c_';
function cacheGet(k) {
  try { const o = JSON.parse(localStorage.getItem(CACHE_PFX + getUser() + '_' + k)); return o ? o.d : null; } catch (e) { return null; }
}
function cacheSet(k, d) {
  try { localStorage.setItem(CACHE_PFX + getUser() + '_' + k, JSON.stringify({ d })); }
  catch (e) { cacheClear(); }   // الذاكرة ممتلئة: نمسح الكاش فقط (لا يؤثر على الدخول)
}
function cacheClear() {
  Object.keys(localStorage).filter(k => k.indexOf(CACHE_PFX) === 0).forEach(k => localStorage.removeItem(k));
}

// استدعاء الـ API (POST بنوع text/plain لتفادي مشاكل CORS) مع إعادة محاولة تلقائية
async function api(action, data = {}) {
  const body = JSON.stringify({ action, username: getUser(), password: getPw(), ...data });
  let lastErr;
  for (let i = 0; i < 3; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body, signal: ctrl.signal
      });
      clearTimeout(t);
      const out = await res.json();
      if (!out.ok) throw Object.assign(new Error(out.error || 'حدث خطأ'), { final: true, auth: String(out.error || '').indexOf('كلمة المرور') > -1 });
      return out;
    } catch (e) {
      clearTimeout(t);
      if (e.final) throw e;
      lastErr = e;
    }
  }
  throw new Error('تعذّر الاتصال بالخادم، تأكدي من الإنترنت ورابط النشر');
}

/* ===== التوقيع: رسم أو إرفاق صورة (+ توقيع محفوظ تلقائياً في الاستمارات) ===== */
const SIG_MAX_CHARS = 45000;      // حد حجم التوقيع المحفوظ داخل الشيت
let mySig = '', mySigLoaded = false;   // توقيع المشرفة المحفوظ (للاستمارات فقط، وليس لتوقيع المديرة)
const SIG_WIDGETS = [];
const mySigKey = () => 'mush_sig_' + getUser();

function loadMySig() {
  try { mySig = localStorage.getItem(mySigKey()) || ''; } catch (e) {}
  sigRefreshAll();
  if (!mySig && !mySigLoaded) {   // جهاز جديد: نجلبه من الخادم مرة واحدة
    mySigLoaded = true;
    api('getMySig').then(o => {
      if (o.data) { mySig = o.data; try { localStorage.setItem(mySigKey(), mySig); } catch (e) {} sigRefreshAll(); }
    }).catch(() => {});
  }
}
function saveMySig(d) {
  mySig = d;
  try { localStorage.setItem(mySigKey(), d); } catch (e) {}
  api('saveMySig', { data: d }).catch(() => {});
  sigRefreshAll();
}
function deleteMySig() {
  mySig = '';
  try { localStorage.removeItem(mySigKey()); } catch (e) {}
  api('deleteMySig').catch(() => {});
  sigRefreshAll();
  toast('تم حذف التوقيع المحفوظ');
}
function clearMySigLocal() {
  try { localStorage.removeItem(mySigKey()); } catch (e) {}
  mySig = ''; mySigLoaded = false;
}
function sigRefreshAll() { SIG_WIDGETS.forEach(w => w.refresh()); }

// يصغّر الرسم/الصورة حتى يتّسع في خلية الشيت (≤ 45 ألف حرف) مع بقاء الوضوح
function sigFit(src, w0, h0, png) {
  for (const W of [480, 400, 320, 260, 200, 150]) {
    const sc = Math.min(1, W / w0), cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w0 * sc)); cv.height = Math.max(1, Math.round(h0 * sc));
    const x = cv.getContext('2d');
    if (!png) { x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); }
    x.drawImage(src, 0, 0, cv.width, cv.height);
    const d = png ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.8);
    if (d.length <= SIG_MAX_CHARS) return d;
  }
  return '';
}
function sigFromFile(file) {
  return new Promise((res, rej) => {
    if (!/^image\//.test(file.type)) return rej(new Error('اختاري ملف صورة'));
    if (file.size > 8 * 1024 * 1024) return rej(new Error('الصورة كبيرة، اختاري صورة أصغر'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight; URL.revokeObjectURL(url);
      const d = (file.type === 'image/png' ? sigFit(img, w, h, true) : '') || sigFit(img, w, h, false);
      d ? res(d) : rej(new Error('تعذّر تصغير الصورة، جرّبي صورة أبسط'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('تعذّرت قراءة الصورة')); };
    img.src = url;
  });
}

/* o = { saved: يسمح بالتوقيع المحفوظ تلقائياً } — خيار «بدون توقيع» أُلغي من كل الوحدات (يُكتفى بالرسم أو إرفاق صورة).
   ترك التوقيع فارغاً في الخانات الاختيارية يعني عدم إرفاق توقيع. */
function makeSigWidget(rootId, o) {
  o = o || {};
  const root = document.getElementById(rootId);
  root.className = 'sigw';
  root.innerHTML =
    '<div class="ev-tabs sigw-tabs"></div>' +
    '<div class="sigw-pane" data-p="saved"><div class="sigw-prev"><img alt="التوقيع المحفوظ"></div>' +
      '<div class="sig-tools"><span>يُرفق تلقائياً مع كل استمارة جديدة</span>' +
      '<button type="button" class="btn danger" style="padding:6px 14px;font-size:13px" data-act="del">حذف المحفوظ</button></div></div>' +
    '<div class="sigw-pane" data-p="draw"><div class="sig-box"><canvas></canvas></div>' +
      '<div class="sig-tools"><span>وقّعي داخل المربع بالإصبع أو الماوس</span>' +
      '<button type="button" class="btn light" style="padding:6px 14px;font-size:13px" data-act="clr">مسح التوقيع</button></div></div>' +
    '<div class="sigw-pane" data-p="image"><input type="file" accept="image/*">' +
      '<div class="sigw-prev hidden"><img alt="صورة التوقيع"></div>' +
      '<div class="sig-tools"><span>صورة واضحة للتوقيع (يفضّل خلفية بيضاء)</span>' +
      '<button type="button" class="btn light" style="padding:6px 14px;font-size:13px" data-act="rm">إزالة الصورة</button></div></div>' +
    '<div class="sigw-pane" data-p="none"><p class="sigw-none"></p></div>' +
    (o.saved ? '<label class="check sigw-keep hidden"><input type="checkbox"> <span>حفظ هذا التوقيع لاستخدامه تلقائياً في الاستمارات القادمة</span></label>' : '');

  const q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
  const cv = q('canvas'), ctx = cv.getContext('2d'), tabs = q('.sigw-tabs');
  const fileIn = q('input[type=file]'), keep = q('.sigw-keep');
  let keepTab = false, mode = '', drawing = false, has = false, imgData = '', lastW = 0, noneText = 'بدون توقيع', noneHint = 'لن يُرفق توقيع مع هذه الاستمارة.';

  const defMode = () => (o.saved && mySig) ? 'saved' : 'draw';
  const avail = () => (o.saved && mySig ? [['saved', 'توقيعي المحفوظ']] : []).concat([['draw', 'رسم'], ['image', 'إرفاق صورة']], keepTab ? [[ 'none', noneText ]] : []);

  function resize() {
    const r = cv.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    if (!r.width || (has && Math.round(r.width) === lastW)) return;
    lastW = Math.round(r.width);
    cv.width = r.width * ratio; cv.height = r.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1b1b1b';
    has = false;
  }
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => { drawing = true; cv.setPointerCapture(e.pointerId); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); has = true; updKeep(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => cv.addEventListener(ev, () => drawing = false));

  function drawn() {
    if (!has) return '';
    return sigFit(cv, cv.width, cv.height, true);
  }
  function current() {
    if (mode === 'saved') return mySig;
    if (mode === 'draw') return drawn();
    if (mode === 'image') return imgData;
    return '';
  }
  function updKeep() {
    if (!keep) return;
    const show = (mode === 'draw' && has) || (mode === 'image' && imgData);
    keep.classList.toggle('hidden', !show);
  }
  function setMode(m) {
    if (m === 'none' && !keepTab) m = defMode();   // لا يوجد «بدون توقيع»: نرجع للرسم أو التوقيع المحفوظ
    mode = m;
    qa('.sigw-pane').forEach(p => p.classList.toggle('hidden', p.dataset.p !== m));
    [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.m === m));
    if (m === 'draw') setTimeout(resize, 30);
    if (m === 'saved') q('[data-p=saved] img').src = mySig;
    if (m === 'none') q('.sigw-none').textContent = noneHint;
    updKeep();
  }
  function renderTabs() {
    tabs.innerHTML = avail().map(a => '<button type="button" data-m="' + a[0] + '">' + esc(a[1]) + '</button>').join('');
    [...tabs.children].forEach(b => b.onclick = () => setMode(b.dataset.m));
  }
  function refresh() {
    renderTabs();
    const ok = avail().some(a => a[0] === mode);
    setMode(ok ? mode : defMode());
  }
  function setImage(d) {
    imgData = d || '';
    const box = q('[data-p=image] .sigw-prev');
    box.classList.toggle('hidden', !imgData);
    if (imgData) box.querySelector('img').src = imgData;
    if (!imgData) fileIn.value = '';
    updKeep();
  }

  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; if (!f) return;
    try { setImage(await sigFromFile(f)); } catch (e) { toast(e.message, false); fileIn.value = ''; }
  });
  root.addEventListener('click', e => {
    const a = e.target.dataset && e.target.dataset.act; if (!a) return;
    if (a === 'clr') { ctx.clearRect(0, 0, cv.width, cv.height); has = false; updKeep(); }
    if (a === 'rm') setImage('');
    if (a === 'del' && confirm('حذف التوقيع المحفوظ؟')) deleteMySig();
  });

  const api_ = {
    resize,
    refresh,
    setMode,
    get: current,                       // التوقيع الحالي (data URL) أو ''
    has: () => !!current(),
    // يُستدعى بعد نجاح الحفظ: إن علّمت «حفظ توقيعي» نثبّته للاستمارات القادمة
    commit() {
      if (o.saved && keep && keep.querySelector('input').checked && (mode === 'draw' || mode === 'image')) {
        const d = current(); if (d) saveMySig(d);
      }
    },
    reset() {                           // استمارة جديدة
      ctx.clearRect(0, 0, cv.width, cv.height); has = false; setImage('');
      if (keep) keep.querySelector('input').checked = false;
      keepTab = false; noneText = 'بدون توقيع'; noneHint = 'لن يُرفق توقيع مع هذه الاستمارة.';
      renderTabs(); setMode(defMode());
    },
    keepOld(label) {                    // وضع التعديل: التوقيع السابق يبقى ما لم نختر غيره
      keepTab = true; noneText = label; noneHint = 'سيبقى التوقيع السابق المحفوظ مع هذه الاستمارة كما هو.';
      renderTabs(); setMode('none');
    },
    draftData: () => (mode === 'draw' || mode === 'image') ? current() : '',
    loadDraft(d) { if (d) { setImage(d); setMode('image'); } }
  };
  SIG_WIDGETS.push(api_);
  api_.reset();
  return api_;
}

// زر بحالة انتظار
function setBtnBusy(btn, busy, text) {
  if (busy) { btn.dataset.t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + (text || 'جارِ الحفظ...'); }
  else { btn.disabled = false; btn.innerHTML = btn.dataset.t || btn.innerHTML; }
}

/* ===== قائمة الأسماء المنسدلة في شاشة الدخول (كاش محلي ثم تحديث من الخادم) ===== */
// f = { unit: أسماء وحدة واحدة فقط, exclude: إخفاء أسماء وحدة } (لقائمة المشرفات)
async function loadLoginNames(kind, id, f) {
  const sel = document.getElementById(id);
  if (!sel) return;
  f = f || {};
  const key = 'mush_names_' + kind + (f.unit ? '_u_' + f.unit : '') + (f.exclude ? '_x_' + f.exclude : '');
  const ph = kind === 'managers' ? 'اختاري الاسم' : 'اختاري اسم المستخدم';
  const fill = list => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">' + ph + '</option>' + list.map(n => '<option value="' + esc(n.u) + '">' + esc(n.n) + '</option>').join('');
    if (cur && list.some(n => n.u === cur)) sel.value = cur;
  };
  sel.innerHTML = '<option value="">جارِ تحميل الأسماء...</option>';
  try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && c.length) fill(c); } catch (e) {}
  for (let i = 0; i < 3; i++) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'listNames', kind, unit: f.unit || '', exclude: f.exclude || '' }), signal: ctrl.signal });
      clearTimeout(t);
      const out = await res.json();
      if (!out.ok) throw Object.assign(new Error(out.error || 'خطأ'), { final: true });
      fill(out.data);
      try { localStorage.setItem(key, JSON.stringify(out.data)); } catch (e) {}
      return;
    } catch (e) { clearTimeout(t); if (e.final) break; }
  }
  if (sel.options.length < 2) { sel.innerHTML = '<option value="">' + ph + '</option>'; toast('تعذّر تحميل الأسماء، حدّثي الصفحة', false); }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, ok = true) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'show ' + (ok ? 'ok' : 'err');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 3200);
}

function togglePassword(inputId, btn) {
  const i = document.getElementById(inputId);
  const show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  btn.innerHTML = show
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// شعار
function applyLogo() {
  document.querySelectorAll('img.logo').forEach(img => {
    img.src = FURQAN_LOGO_URL;
    img.onerror = () => img.style.display = 'none';
  });
}
document.addEventListener('DOMContentLoaded', applyLogo);

// ===== لون التقدير حسب النتيجة (يُستخدم في كل الاستمارات والسجلات) =====
function gradeCls(g) {
  g = String(g || '');
  if (!g || g === '—') return '';
  if (g === 'ممتاز مرتفع') return 'gr-top';
  if (g.indexOf('ممتاز') === 0) return 'gr-ex';
  if (g.indexOf('جيد جداً') === 0) return 'gr-vg';
  if (g.indexOf('جيد') === 0) return 'gr-g';
  if (g.indexOf('مقبول') === 0) return 'gr-p';
  if (g === 'ضعيف') return 'gr-w';
  return 'gr-f';
}
function gradeTag(g) { const k = gradeCls(g); return '<span class="tag' + (k ? ' gr ' + k : '') + '">' + esc(g) + '</span>'; }
function setGrade(el, g) {
  if (!el) return;
  el.textContent = g;
  el.className = el.className.replace(/\bgr(-\w+)?\b/g, '').replace(/\s+/g, ' ').trim();
  const k = gradeCls(g);
  if (k) { el.classList.add('gr'); el.classList.add(k); }
}

// ===== خانات الدرجات: كتابة فقط (بدون أسهم)، وتقبل الأرقام العربية، ولا تتغير بعجلة الماوس أو الأسهم =====
document.addEventListener('input', e => {
  const el = e.target;
  if (!el || !el.closest || !el.closest('.ev-sc') || el.tagName !== 'INPUT') return;
  let v = el.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٫,،]/g, '.');
  v = v.replace(/[^0-9.]/g, '');
  const i = v.indexOf('.');
  if (i > -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '');
  if (v !== el.value) el.value = v;
}, true);   // مرحلة الالتقاط: يُنظَّف القيمة قبل أن تحسبها الاستمارة
document.addEventListener('wheel', e => {
  if (e.target && e.target.closest && e.target.closest('.ev-sc')) e.target.blur();
}, { passive: true });

/* ===== كشف الخروج: صورة توقيع المديرة بجانب الزيارة (بدل رابط «عرض») =====
   التواقيع تُجلب مرة واحدة لكل زيارة من ورقة «التواقيع» وتبقى في الذاكرة أثناء فتح الصفحة. */
const VSIG = {};
let vSigBusy_ = false;
function vSigCell(v) {
  if (!v || !v.signature) return '—';
  const d = VSIG[v.id];
  if (d) return '<img class="vsig" src="' + d + '" alt="توقيع المديرة">';
  if (d === '') return '<a class="lnk" target="_blank" rel="noopener" href="' + esc(v.signature) + '">عرض</a>';   // زيارة قديمة: التوقيع محفوظ رابطاً فقط
  return '<span class="vsig-wait">…</span>';
}
function vSigLoad(rows, rerender) {
  const need = (rows || []).filter(v => v && v.signature && v.id && !(v.id in VSIG)).slice(0, 120).map(v => ({ id: v.id }));
  if (!need.length || vSigBusy_) return;
  vSigBusy_ = true;
  api('getSigs', { items: need }).then(o => {
    const m = (o && o.data) || {};
    need.forEach(x => { VSIG[x.id] = m[x.id] || ''; });
    vSigBusy_ = false;
    if (rerender) rerender();
  }).catch(() => { vSigBusy_ = false; });
}

/* ===== أسماء المراكز في الاستمارات وكشف الخروج: المراكز المشرفة عليها فقط =====
   (إن لم تحدد المشرفة مراكزها بعد تظهر كل المراكز). myCenters() في my-centers.js */
// نص أول خيار في قائمة المراكز: «لا تتوفر مراكز» إن لم تحدد المشرفة المراكز المشرفة عليها
const NO_CENTERS = 'لا تتوفر مراكز';
function centersPh(ph) { return centersForMe().length ? ph : NO_CENTERS; }
function centersForMe() {
  if (typeof myCenters === 'function') return myCenters();
  return (typeof LISTS !== 'undefined' && LISTS.centers) || [];
}
// تحديد قيمة في قائمة منسدلة، مع إضافتها إن لم تكن فيها (سجل قديم لمركز خارج المراكز المشرفة عليها)
function selSet(el, v) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  v = v == null ? '' : String(v);
  if (v && el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) { const o = document.createElement('option'); o.textContent = /(Center$|^seF_center$)/.test(el.id) ? cpName(v) : v; o.value = v; el.appendChild(o); }
  el.value = v;
}

/* ===== قائمة المراكز: يظهر اسم المركز وحده، والفترة عنوان مجموعة («الفترة الصباحية» / «الفترة المسائية») =====
   قيمة الخيار تبقى الاسم الكامل كما في «القوائم» (للحفظ والمطابقة)، وعند اختيار المركز تُحدَّد خانة «الفترة» في النموذج تلقائياً */
const cpName = c => String(c || '').replace(/\s*[-–—]?\s*(ال)?فتر(ة|تين|تان)\s+.*$/, '').trim() || String(c || '').trim();
const cpPer = c => { const t = String(c || '').replace(/[أإآ]/g, 'ا'); const m = /مسائ/.test(t), s = /صباح/.test(t); return m && s ? 'both' : m ? 'pm' : s ? 'am' : ''; };
const CP_GROUPS = [['am', 'الفترة الصباحية'], ['pm', 'الفترة المسائية'], ['both', 'الفترتان الصباحية والمسائية'], ['', 'بدون فترة']];
function centerOpts(list, ph, cur) {
  list = list || [];
  const o = x => '<option value="' + esc(x) + '" data-p="' + cpPer(x) + '"' + (cur != null && cur === x ? ' selected' : '') + '>' + esc(cpName(x)) + '</option>';
  let h = ph == null ? '' : '<option value="">' + esc(ph) + '</option>';
  if (!list.some(x => cpPer(x))) return h + list.map(o).join('');
  CP_GROUPS.forEach(([k, t]) => { const L = list.filter(x => cpPer(x) === k); if (L.length) h += '<optgroup label="' + t + '">' + L.map(o).join('') + '</optgroup>'; });
  return h;
}
// خانة الفترة المقابلة لقائمة المركز: evCenter ← evPeriod ، seF_center ← seF_period
function cpPeriodFill(sel) {
  const opt = sel.options[sel.selectedIndex], k = opt && opt.dataset ? opt.dataset.p : '';
  if (!k || k === 'both') return;
  const pid = sel.id === 'seF_center' ? 'seF_period' : sel.id.replace(/Center$/, 'Period');
  if (pid === sel.id) return;
  const el = document.getElementById(pid); if (!el) return;
  const re = k === 'am' ? /صباح/ : /مسائ/;
  if (el.tagName === 'SELECT') {
    const o = [...el.options].find(x => re.test(x.value || x.text));
    if (o && el.value !== o.value) { el.value = o.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
  } else {
    const boxes = [...el.querySelectorAll('input[type=checkbox],input[type=radio]')];
    if (!boxes.some(b => re.test(b.value))) return;
    boxes.forEach(b => { const on = re.test(b.value); if (b.checked !== on) { b.checked = on; b.dispatchEvent(new Event('change', { bubbles: true })); } });
  }
}
document.addEventListener('change', e => {
  const t = e.target;
  if (t && t.tagName === 'SELECT' && t.id && /(Center$|^seF_center$)/.test(t.id) && t.id !== 'fCenter' && t.id !== 'scCenter') cpPeriodFill(t);
});

/* ===== أثناء تجهيز ملف PDF: نافذة «جارِ تجهيز الملف» تغطي الصفحة، فلا يظهر النموذج خلفها أثناء رسمه ===== */
let PDF_BUSY_N = 0;
function pdfBusy(on) {
  PDF_BUSY_N = Math.max(0, PDF_BUSY_N + (on ? 1 : -1));
  let o = document.getElementById('pdfBusyOv');
  if (!o) {
    o = document.createElement('div'); o.id = 'pdfBusyOv';
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#faf7f8;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;font-family:Tajawal,Tahoma,sans-serif;color:#7a1f2b;font-weight:800;font-size:17px';
    o.innerHTML = '<div style="width:42px;height:42px;border:4px solid #ead9dd;border-top-color:#7a1f2b;border-radius:50%;animation:pdfSpin .8s linear infinite"></div><div>جارِ تجهيز الملف...</div>' +
      '<style>@keyframes pdfSpin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(o);
  }
  o.style.display = PDF_BUSY_N ? 'flex' : 'none';
}

/* ===== التواريخ: تظهر في كل الصفحات بترتيب ثابت وصحيح من اليمين لليسار (اليوم ثم الشهر ثم السنة) =====
   التاريخ المكتوب نصاً (مثل 2026-10-28 أو ١٤٤٨/٥/٧ أو ٧/٥/١٤٤٨) قد تنقلب أجزاؤه بجانب النص العربي حسب نوع الأرقام والفاصل،
   فنعزله ونرتّبه: السنة يساراً واليوم يميناً، فيُقرأ من اليمين: اليوم / الشهر / السنة. */
(function () {
  const D = '0-9٠-٩';
  const RE = new RegExp('([' + D + ']{1,4})(\\s?[-/]\\s?)([' + D + ']{1,2})(\\s?[-/]\\s?)([' + D + ']{1,4})', 'g');
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|BDI|CODE)$/;
  const num = t => parseInt(String(t).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660), 10);
  function fixText(node) {
    const t = node.nodeValue;
    if (!t || t.length < 6 || !/[-/]/.test(t)) return;
    RE.lastIndex = 0;
    if (!RE.test(t)) return;
    RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, m, changed = false;
    while ((m = RE.exec(t))) {
      const [all, a, s1, b, s2, c] = m;
      let y, mo, d, sy, sd;
      if (a.length === 4 && c.length <= 2) { y = a; mo = b; d = c; sy = s1; sd = s2; }
      else if (c.length === 4 && a.length <= 2) { y = c; mo = b; d = a; sy = s2; sd = s1; }
      else continue;
      const mv = num(mo), dv = num(d);
      if (!(mv >= 1 && mv <= 12 && dv >= 1 && dv <= 31)) continue;
      frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      // كل جزء معزول وحده، والترتيب من اليمين: اليوم ثم الشهر ثم السنة (مهما كان نوع الأرقام أو الفاصل)
      const el = document.createElement('bdi');
      el.className = 'dt-fix'; el.dir = 'rtl';
      const part = v => { const x = document.createElement('bdi'); x.textContent = v; return x; };
      el.appendChild(part(d)); el.appendChild(document.createTextNode(sd.trim() || sd)); el.appendChild(part(mo)); el.appendChild(document.createTextNode(sy.trim() || sy)); el.appendChild(part(y));
      frag.appendChild(el);
      last = m.index + all.length; changed = true;
    }
    if (!changed) return;
    frag.appendChild(document.createTextNode(t.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (root.parentNode && !SKIP.test(root.parentNode.nodeName) && !(root.parentNode.closest && root.parentNode.closest('bdi,[contenteditable="true"],#vHijri,[data-nodt]'))) fixText(root); return; }
    if (root.nodeType !== 1 || SKIP.test(root.nodeName) || root.isContentEditable) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && !SKIP.test(n.parentNode.nodeName) && !n.parentNode.closest('bdi,[contenteditable="true"],#vHijri,[data-nodt]')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(fixText);
  }
  const start = () => {
    walk(document.body);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(walk))).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

/* ===== إظهار الصفحة بعد تجهيزها (الخط والصفحة المناسبة: الدخول أو الرئيسية) دفعة واحدة دون رمشة ===== */
(function () {
  const d = document.documentElement;
  const reveal = () => requestAnimationFrame(() => d.classList.remove('pg-wait', 'has-sess'));
  const ready = () => {
    let done = false; const go = () => { if (!done) { done = true; reveal(); } };
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go(); } catch (e) { go(); }
    setTimeout(go, 700);   // لا ننتظر الخط أكثر من ذلك
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
