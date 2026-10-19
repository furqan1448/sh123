/* ===== أيقونة «المراكز» (centers.html): دخول المركز باسمه وكلمة مروره (مثل نظام المقاصف) =====
   «الوارد من المشرفات»: تقارير زيارة الإشراف الإداري (تصل تلقائياً)، وكل نموذج ترسله مشرفة من أي وحدة بزر «📤 إرسال للمركز».
   مع تنبيه بعدد ما لم يُطّلع عليه، فتطّلع المديرة وتضغط «تم الاطلاع» أو توقّع من حساب المركز. */
const $ = id => document.getElementById(id);
const C_NAME = 'ctr_name', C_PW = 'ctr_pw', C_CACHE = 'ctr_reports', C_SIGNER = 'ctr_signer';
let CREP = [], CIN = [], cCur = null, cSigsCur = {}, CME = null, inCur = null, inFile = null;

function cShow(id) {
  ['loginView', 'homeView', 'reportsView', 'signView', 'inView'].forEach(v => $(v).classList.add('hidden'));
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
  CREP = []; CIN = []; $('cPw').value = '';
  cShow('loginView');
}

/* ---------- القائمة والتنبيه ---------- */
function cApply(out) {
  CREP = out.data || [];
  CIN = out.inbox || [];
  CME = out.center || CME;
  try { localStorage.setItem(C_CACHE, JSON.stringify({ me: CME, data: CREP, inbox: CIN })); } catch (e) {}
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
// نموذج وارد بزر «📤 إرسال للمركز»
function inItem(x) {
  const id = esc(x.id), pending = x.status === 'new';
  return '<div class="t-item' + (pending ? ' pending' : '') + '"><b>' + esc(x.title || 'نموذج') + '</b> <span class="t-mode">' + (x.mode === 'sign' ? 'للاطلاع والتوقيع' : 'للاطلاع') + '</span>' +
    '<div class="t-meta">المشرفة: ' + esc(x.supName || '—') + ' — أُرسل: ' + esc(idDigits(x.at)) +
    (x.note ? '<br>ملاحظة المشرفة: ' + esc(x.note) : '') +
    (!pending ? '<br><span class="t-signed">✔ ' + (x.status === 'sign' ? 'تم التوقيع' : 'تم الاطلاع') + (x.signer ? ' من ' + esc(x.signer) : '') + ' بتاريخ ' + esc(idDigits(x.doneAt)) + '</span>' : '') + '</div>' +
    '<div class="act"><button class="btn' + (pending ? '' : ' light') + '" onclick="inOpen(\'' + id + '\')">' + (pending ? (x.mode === 'sign' ? 'فتح النموذج والتوقيع' : 'فتح النموذج') : 'عرض') + '</button></div></div>';
}
const cTime = x => String(x.at || (x.data && x.data.savedAt) || x.date || '');
function cRender() {
  const all = CREP.map(r => ({ t: 'r', r, pend: !r.signed, at: cTime(r) })).concat(CIN.map(x => ({ t: 'i', r: x, pend: x.status === 'new', at: x.at })))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const pend = all.filter(x => x.pend), done = all.filter(x => !x.pend);
  const html = x => x.t === 'r' ? cItem(x.r, x.pend) : inItem(x.r);
  $('stPending').textContent = idDigits(pend.length); $('stSigned').textContent = idDigits(done.length); $('pendBadge').textContent = idDigits(pend.length);
  $('tileBadge').textContent = idDigits(pend.length); $('tileBadge').classList.toggle('hidden', !pend.length);
  $('cBanner').classList.toggle('hidden', !pend.length);
  $('cBanner').textContent = pend.length ? '🔔 لديكم ' + idDigits(pend.length) + (pend.length === 1 ? ' نموذج وارد من المشرفات بانتظار الاطلاع' : ' نماذج واردة من المشرفات بانتظار الاطلاع') + ' — اضغطي للاطلاع' : '';
  $('pendList').innerHTML = pend.length ? pend.map(html).join('') : '<p class="empty">لا يوجد وارد بانتظار الاطلاع</p>';
  $('signedList').innerHTML = done.length ? done.map(html).join('') : '<p class="empty">لا يوجد بعد</p>';
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

/* ---------- نموذج وارد: عرض الملف ثم «تم الاطلاع» أو التوقيع ---------- */
const inSig = makeSigWidget('inSigW', {});
const IN_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let inPdfLoading = null;
function inLoadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  if (inPdfLoading) return inPdfLoading;
  inPdfLoading = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = IN_PDFJS + 'pdf.min.js';
    sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = IN_PDFJS + 'pdf.worker.min.js'; res(); };
    sc.onerror = () => { inPdfLoading = null; rej(new Error('تعذّر تحميل عارض الملفات')); };
    document.head.appendChild(sc);
  });
  return inPdfLoading;
}
function inBlob(o) {
  const bin = atob(o.data), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return { bytes: u, blob: new Blob([u], { type: o.mime || 'application/octet-stream' }), name: o.name || 'ملف', isPdf: /pdf/i.test(o.mime || '') || /\.pdf$/i.test(o.name || '') };
}
// معاينة صفحات ملف PDF داخل الصفحة (تعمل على الجوال)
async function inPreview(f, id) {
  const box = $('inPrev');
  if (!f.isPdf) { box.innerHTML = '<p class="empty">الملف بصيغة Excel — اضغطي «تحميل الملف» لفتحه.</p>'; return; }
  box.innerHTML = '<p class="empty">جارِ عرض الملف...</p>';
  try {
    await inLoadPdfJs();
    const pdf = await window.pdfjsLib.getDocument({ data: f.bytes.slice() }).promise;
    const out = document.createElement('div'); out.className = 'in-prev';
    for (let p = 1; p <= pdf.numPages; p++) {
      if (!inCur || inCur.id !== id) return;
      const page = await pdf.getPage(p), vp = page.getViewport({ scale: 1.6 });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      const im = new Image(); im.alt = 'صفحة ' + p; im.src = cv.toDataURL('image/jpeg', 0.9);
      out.appendChild(im);
    }
    if (inCur && inCur.id === id) { box.innerHTML = ''; box.appendChild(out); }
  } catch (e) { box.innerHTML = '<p class="empty">تعذّر عرض الملف هنا، اضغطي «فتح الملف» أو «تحميل الملف».</p>'; }
}
async function inOpen(id) {
  const x = CIN.find(y => y.id === id); if (!x) return;
  inCur = x; inFile = null;
  const pending = x.status === 'new';
  $('inTitle').textContent = x.title || 'نموذج';
  $('inMeta').innerHTML = 'المشرفة: <b>' + esc(x.supName || '—') + '</b><br>تاريخ الإرسال: ' + esc(idDigits(x.at)) + '<br>المطلوب: <b>' + (x.mode === 'sign' ? 'الاطلاع والتوقيع' : 'الاطلاع') + '</b>' +
    (!pending ? '<br><span class="t-signed">✔ ' + (x.status === 'sign' ? 'تم التوقيع' : 'تم الاطلاع') + (x.signer ? ' من ' + esc(x.signer) : '') + ' بتاريخ ' + esc(idDigits(x.doneAt)) + '</span>' : '');
  $('inNote').classList.toggle('hidden', !x.note); $('inNote').textContent = x.note ? 'ملاحظة المشرفة: ' + x.note : '';
  $('inBar').innerHTML = '';
  $('inPrev').innerHTML = '<p class="empty">جارِ تحميل الملف...</p>';
  $('inAct').classList.toggle('hidden', !pending);
  if (pending) {
    const sign = x.mode === 'sign';
    $('inActTitle').textContent = sign ? 'اعتماد وتوقيع مديرة المركز' : 'تأكيد الاطلاع';
    $('inSigBox').classList.toggle('hidden', !sign);
    $('inBtn').textContent = sign ? 'اعتماد وتوقيع' : 'تم الاطلاع';
    $('inAgree').checked = false; inSig.reset();
    $('inSigner').value = localStorage.getItem(C_SIGNER) || '';
  }
  cShow('inView');
  try {
    const f = inBlob(await cApi('c_file', { id }));
    if (!inCur || inCur.id !== id) return;
    inFile = f;
    $('inBar').innerHTML = (f.isPdf ? '<button class="btn light" onclick="inView()">فتح الملف</button>' : '') + '<button class="btn light" onclick="inSave()">تحميل الملف</button>';
    inPreview(f, id);
  } catch (e) { $('inPrev').innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; }
}
function inView() {
  if (!inFile) return;
  const u = URL.createObjectURL(inFile.blob);
  if (!window.open(u, '_blank')) inSave();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
function inSave() {
  if (!inFile) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(inFile.blob); a.download = inFile.name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function inDone(btn) {
  if (!inCur) return;
  const sign = inCur.mode === 'sign', signer = $('inSigner').value.trim();
  if (!signer) return toast('اكتبي اسم مديرة المركز', false);
  if (!$('inAgree').checked) return toast('علّمي على «اطّلعتُ على النموذج» أولاً', false);
  const sig = sign ? inSig.get() : '';
  if (sign && !sig) return toast('وقّعي داخل المربع أو أرفقي صورة التوقيع', false);
  setBtnBusy(btn, true, 'جارِ الحفظ...');
  try {
    const out = await cApi('c_done', { id: inCur.id, signature: sig, signer });
    try { localStorage.setItem(C_SIGNER, signer); } catch (e) {}
    Object.assign(inCur, { status: sign ? 'sign' : 'ack', doneAt: out.at, signer });
    toast(sign ? 'تم التوقيع، شكراً لكم' : 'تم تأكيد الاطلاع، شكراً لكم');
    $('inAct').classList.add('hidden');
    cRender(); cShow('reportsView'); cLoad();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- استعادة الجلسة ---------- */
(function init() {
  cLoadNames();
  if (!localStorage.getItem(C_NAME) || !localStorage.getItem(C_PW)) return;
  try { const c = JSON.parse(localStorage.getItem(C_CACHE) || 'null'); if (c) { CME = c.me; cApply({ center: c.me, data: c.data, inbox: c.inbox }); } } catch (e) {}
  cShow('homeView');
  cLoad();
})();
