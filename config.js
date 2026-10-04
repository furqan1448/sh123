// ===== الإعدادات =====
// الصقي هنا رابط الـ Web App بعد النشر (ينتهي بـ /exec)
const API_URL ="https://script.google.com/macros/s/AKfycbyI9ERhAbXNIw1oWP-qy_OZgpOkXiUwMgPemrPqiA8VISnTE4-HtdiE2-qynuUCa9Ab/exec";

const PW_KEY = 'mush_pw';
const USER_KEY = 'mush_user';
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

/* o = { saved: يسمح بالتوقيع المحفوظ تلقائياً, none: يسمح بـ «بدون توقيع» } */
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
  let mode = '', drawing = false, has = false, imgData = '', lastW = 0, noneText = 'بدون توقيع', noneHint = 'لن يُرفق توقيع مع هذه الاستمارة.';

  const defMode = () => (o.saved && mySig) ? 'saved' : 'draw';
  const avail = () => (o.saved && mySig ? [['saved', 'توقيعي المحفوظ']] : []).concat([['draw', 'رسم'], ['image', 'إرفاق صورة']], o.none ? [[ 'none', noneText ]] : []);

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
      noneText = 'بدون توقيع'; noneHint = 'لن يُرفق توقيع مع هذه الاستمارة.';
      renderTabs(); setMode(defMode());
    },
    keepOld(label) {                    // وضع التعديل: التوقيع السابق يبقى ما لم نختر غيره
      noneText = label; noneHint = 'سيبقى التوقيع السابق المحفوظ مع هذه الاستمارة كما هو.';
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
