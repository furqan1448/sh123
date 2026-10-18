/* ===== أيقونة «المراكز» (centers.html): دخول المركز باسمه وكلمة مروره (مثل نظام المقاصف) =====
   تصل للمركز تقارير زيارة الإشراف الإداري الخاصة به مع تنبيه بعددها، فتطّلع المديرة عليها وتوقّع من حساب المركز. */
const $ = id => document.getElementById(id);
const C_NAME = 'ctr_name', C_PW = 'ctr_pw', C_CACHE = 'ctr_reports', C_SIGNER = 'ctr_signer';
let CREP = [], cCur = null, cSigsCur = {}, CME = null;

function cShow(id) {
  ['loginView', 'homeView', 'reportsView', 'signView'].forEach(v => $(v).classList.add('hidden'));
  $(id).classList.remove('hidden');
  window.scrollTo(0, 0);
  setTimeout(() => SIG_WIDGETS.forEach(w => w.resize()), 60);
}

// طلب بدخول المركز (اسم المركز + كلمة المرور) مع إعادة محاولة تلقائية
async function cApi(action, data) {
  const body = JSON.stringify(Object.assign({ action, center: localStorage.getItem(C_NAME) || '', cpass: localStorage.getItem(C_PW) || '' }, data || {}));
  for (let i = 0; i < 3; i++) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ctrl.signal });
      clearTimeout(t);
      const out = await res.json();
      if (!out.ok) throw Object.assign(new Error(out.error || 'حدث خطأ'), { final: true, auth: /كلمة المرور|المحاولات/.test(out.error || '') });
      return out;
    } catch (e) { clearTimeout(t); if (e.final) throw e; }
  }
  throw new Error('تعذّر الاتصال بالخادم، تأكدي من الإنترنت');
}

// تواقيع التقرير تُجلب بدخول المركز (لتقاريره فقط)
idSigFetch = items => cApi('c_sigs', { id: String(items[0].id).split('|')[0] }).then(o => o.data || {});

/* ---------- الدخول ---------- */
async function cLoadNames() {
  const sel = $('cName');
  const fill = L => {
    const cur = sel.value || localStorage.getItem(C_NAME) || '';
    sel.innerHTML = '<option value="">اختاري اسم المركز</option>' + L.map(c => '<option value="' + esc(c.name) + '">' + esc(c.display || c.name) + '</option>').join('');
    if (cur) sel.value = cur;
  };
  try { const c = JSON.parse(localStorage.getItem('ctr_names') || '[]'); if (c.length) fill(c); } catch (e) {}
  try {
    const out = await cApi('c_names');
    fill(out.data || []);
    try { localStorage.setItem('ctr_names', JSON.stringify(out.data || [])); } catch (e) {}
  } catch (e) { if (sel.options.length < 2) sel.innerHTML = '<option value="">تعذّر تحميل المراكز</option>'; }
}
async function cLogin() {
  const nm = $('cName').value, pw = $('cPw').value.trim();
  if (!nm) return toast('اختاري اسم المركز', false);
  if (!pw) return toast('أدخلي كلمة المرور', false);
  localStorage.setItem(C_NAME, nm); localStorage.setItem(C_PW, pw);
  const btn = $('cLoginBtn');
  setBtnBusy(btn, true, 'جارِ التحقق...');
  try {
    cApply(await cApi('c_login'));
    cShow('homeView');
  } catch (e) {
    localStorage.removeItem(C_PW);
    toast(e.message, false);
  } finally { setBtnBusy(btn, false); }
}
$('cPw').addEventListener('keydown', e => { if (e.key === 'Enter') cLogin(); });
function cLogout() {
  [C_PW, C_CACHE].forEach(k => localStorage.removeItem(k));
  CREP = []; $('cPw').value = '';
  cShow('loginView');
}

/* ---------- القائمة والتنبيه ---------- */
function cApply(out) {
  CREP = out.data || [];
  CME = out.center || CME;
  try { localStorage.setItem(C_CACHE, JSON.stringify({ me: CME, data: CREP })); } catch (e) {}
  $('cHello').textContent = 'مرحباً بكم — ' + (CME ? (CME.display || CME.name) : '');
  cRender();
}
async function cLoad() {
  try { cApply(await cApi('c_list')); }
  catch (e) {
    if (e.auth) { toast('انتهت صلاحية الدخول، سجّلي الدخول من جديد', false); cLogout(); }
    else toast(e.message, false);
  }
}
const cDate = r => ((r.data && r.data.dayName) || r.day || '') + ' ' + idHDate(r);
function cItem(r, pending) {
  const id = esc(r.id), d = r.data || {};
  return '<div class="t-item' + (pending ? ' pending' : '') + '"><b>' + esc(ID_KINDS[r.kind] || 'تقرير') + (d.about ? ' — ' + esc(d.about) : '') + '</b>' +
    '<div class="t-meta">' + cDate(r) + (r.period ? ' — الفترة ' + esc(r.period) : '') + '<br>المشرفة: ' + esc(r.supName || '—') + ' — رقم الزيارة: ' + esc(idDigits(r.visitNo) || '—') +
    (!pending && d.mgrAt ? '<br><span class="t-signed">✔ تم التوقيع' + (r.mgrName ? ' من ' + esc(r.mgrName) : '') + ' بتاريخ ' + esc(d.mgrAt) + '</span>' : '') + '</div>' +
    '<div class="act">' + (pending ? '<button class="btn" onclick="cOpen(\'' + id + '\')">فتح التقرير والتوقيع</button>'
      : '<button class="btn light" onclick="cOpen(\'' + id + '\')">عرض</button><button class="btn light" onclick="cPdf(\'' + id + '\', this)">تحميل PDF</button>') + '</div></div>';
}
function cRender() {
  const pend = CREP.filter(r => !r.signed), done = CREP.filter(r => r.signed);
  $('stPending').textContent = idDigits(pend.length); $('stSigned').textContent = idDigits(done.length); $('pendBadge').textContent = idDigits(pend.length);
  $('tileBadge').textContent = idDigits(pend.length); $('tileBadge').classList.toggle('hidden', !pend.length);
  $('cBanner').classList.toggle('hidden', !pend.length);
  $('cBanner').textContent = pend.length ? '🔔 لديكم ' + idDigits(pend.length) + (pend.length === 1 ? ' تقرير زيارة بانتظار توقيع المديرة' : ' تقارير زيارة بانتظار توقيع المديرة') + ' — اضغطي للاطلاع' : '';
  $('pendList').innerHTML = pend.length ? pend.map(r => cItem(r, true)).join('') : '<p class="empty">لا توجد تقارير بانتظار التوقيع</p>';
  $('signedList').innerHTML = done.length ? done.map(r => cItem(r, false)).join('') : '<p class="empty">لا توجد تقارير موقّعة بعد</p>';
}

/* ---------- عرض التقرير والتوقيع ---------- */
function cFitBox(box) {
  if (!box) return;
  const doc = box.querySelector('.idoc'); if (!doc) return;
  doc.style.transform = ''; box.style.height = '';
  const w = doc.offsetWidth, k = Math.min(1, (box.clientWidth - 4) / w);
  if (k >= 1) return;
  doc.style.transform = 'scale(' + k + ')'; doc.style.transformOrigin = 'top right';
  box.style.height = Math.ceil(doc.offsetHeight * k) + 8 + 'px'; box.style.overflow = 'hidden';
  box.querySelectorAll('img').forEach(im => { if (!im.complete && !im._fit) { im._fit = 1; im.addEventListener('load', () => cFitBox(box)); } });
}
window.addEventListener('resize', () => cFitBox(document.querySelector('#cDoc .c-fit')));
function cDraw() {
  $('cDoc').innerHTML = '<style>' + ID_CSS + '</style><div class="id-scroll c-fit">' + idDocHtml(cCur, cSigsCur) + '</div>';
  cFitBox($('cDoc').querySelector('.c-fit'));
}
const cSig = makeSigWidget('cSigW', {});
async function cOpen(id) {
  const r = CREP.find(x => x.id === id); if (!r) return;
  cCur = r; cSigsCur = {};
  $('cDoc').innerHTML = '<p class="empty">جارِ التحميل...</p>';
  $('cSignCard').classList.toggle('hidden', !!r.signed);
  $('cAgree').checked = false; cSig.reset();
  $('cSigner').value = localStorage.getItem(C_SIGNER) || r.mgrName || '';
  $('cBar').innerHTML = '<button class="btn light" id="cVPrint">طباعة</button><button class="btn light" id="cVPdf">تحميل PDF</button>';
  $('cVPrint').onclick = e => idPrint(r, e.currentTarget, cSigsCur);
  $('cVPdf').onclick = e => idPdf(r, e.currentTarget, cSigsCur);
  cShow('signView');
  try { cSigsCur = await idLoadSigs(r); } catch (e) {}
  cDraw();
}
async function cPdf(id, btn) { const r = CREP.find(x => x.id === id); if (r) idPdf(r, btn); }
async function cSign(btn) {
  if (!cCur) return;
  const signer = $('cSigner').value.trim();
  if (!signer) return toast('اكتبي اسم مديرة المركز', false);
  if (!$('cAgree').checked) return toast('علّمي على «اطّلعتُ على التقرير» أولاً', false);
  const sig = cSig.get();
  if (!sig) return toast('وقّعي داخل المربع أو أرفقي صورة التوقيع', false);
  setBtnBusy(btn, true, 'جارِ التوقيع...');
  try {
    const out = await cApi('c_sign', { id: cCur.id, signature: sig, signer });
    try { localStorage.setItem(C_SIGNER, signer); } catch (e) {}
    toast('تم اعتماد التقرير وتوقيعه، شكراً لكم');
    cCur.signed = true; cCur.mgrName = signer;
    cCur.data = Object.assign({}, cCur.data, { mgrAt: out.at, sigs: Object.assign({}, cCur.data.sigs, { mgr: '1' }) });
    cSigsCur = Object.assign({}, cSigsCur, { mgr: sig });
    $('cSignCard').classList.add('hidden');
    cDraw(); cRender(); cLoad();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- استعادة الجلسة ---------- */
(function init() {
  cLoadNames();
  if (!localStorage.getItem(C_NAME) || !localStorage.getItem(C_PW)) return;
  try { const c = JSON.parse(localStorage.getItem(C_CACHE) || 'null'); if (c) { CME = c.me; cApply({ center: c.me, data: c.data }); } } catch (e) {}
  cShow('homeView');
  cLoad();
})();
