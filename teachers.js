/* ===== أيقونة «المعلمات» (teachers.html): تطّلع المعلمة على تقارير المشرفات المرسلة إليها وتوقّع عليها =====
   الدخول برقم الجوال وكلمة مرور بوابة المعلمات، والتقارير مرتبطة بها عن طريق رقم جوالها في تقرير المشرفة. */
const $ = id => document.getElementById(id);
const T_PHONE = 'tch_phone', T_PW = 'tch_pw', T_CACHE = 'tch_reports';
let TIN = [], inCur = null, inFile = null;
let TREP = [], tCur = null, tSigsCur = {}, TME = null, TMIN = [], tMinCur = null, TFILES = [];

function tShow(id) {
  ['loginView', 'homeView', 'reportsView', 'certView', 'signView', 'minView', 'minDocView', 'filesView', 'inView'].forEach(v => $(v).classList.add('hidden'));
  $(id).classList.remove('hidden');
  window.scrollTo(0, 0);
  setTimeout(() => SIG_WIDGETS.forEach(w => w.resize()), 60);
  if (id === 'certView') tCertFont();
}

// طلب بدخول المعلمة (رقم الجوال + كلمة المرور) مع إعادة محاولة تلقائية
async function tApi(action, data) {
  const body = JSON.stringify(Object.assign({ action, phone: localStorage.getItem(T_PHONE) || '', password: localStorage.getItem(T_PW) || '' }, data || {}));
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

// تواقيع التقرير تُجلب بدخول المعلمة (لتقاريرها فقط)
sgSigFetch = items => tApi('t_sigs', { id: String(items[0].id).split('|')[0] }).then(o => o.data || {});

/* ---------- الدخول ---------- */
async function tHint() {
  const v = $('tPhone').value.trim(), box = $('tHintBox');
  box.className = 'id-hint'; box.textContent = '';
  if (!v) return;
  try {
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 't_hint', phone: v }) });
    const out = await res.json();
    if (out.ok) { box.className = 'id-hint ok'; box.textContent = 'مرحباً ' + out.name; }
    else box.textContent = out.error || '';
  } catch (e) {}
}
async function tLogin() {
  const ph = $('tPhone').value.trim(), pw = $('tPw').value.trim();
  if (!ph) return toast('أدخلي رقم الجوال', false);
  if (!pw) return toast('أدخلي كلمة المرور', false);
  localStorage.setItem(T_PHONE, ph); localStorage.setItem(T_PW, pw);
  const btn = $('tLoginBtn');
  setBtnBusy(btn, true, 'جارِ التحقق...');
  try {
    const out = await tApi('t_login');
    tApply(out);
    tShow('homeView');
  } catch (e) {
    localStorage.removeItem(T_PHONE); localStorage.removeItem(T_PW);
    toast(e.message, false);
  } finally { setBtnBusy(btn, false); }
}
['tPhone', 'tPw'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') tLogin(); }));

function tLogout() {
  [T_PHONE, T_PW, T_CACHE].forEach(k => localStorage.removeItem(k));
  TREP = []; TIN = []; $('tPhone').value = ''; $('tPw').value = ''; $('tHintBox').textContent = '';
  tShow('loginView');
}

/* ---------- قائمة التقارير ---------- */
function tApply(out) {
  TREP = out.data || [];
  TME = out.teacher || TME;
  TMIN = out.minutes || [];
  TFILES = out.files || [];
  TIN = out.inbox || [];
  try { localStorage.setItem(T_CACHE, JSON.stringify({ name: out.teacher.name, me: out.teacher, data: TREP, minutes: TMIN, files: TFILES, inbox: TIN })); } catch (e) {}
  tMinRender(); tFilesRender();
  $('tHello').textContent = 'مرحباً ' + out.teacher.name;
  tRender();
}
async function tLoad() {
  try { tApply(await tApi('t_list')); }
  catch (e) {
    if (e.auth) { toast('انتهت صلاحية الدخول، سجّلي الدخول من جديد', false); tLogout(); }
    else toast(e.message, false);
  }
}
const tDate = r => ((r.data && r.data.dayName) || r.day || '') + ' ' + idHDate(r);
function tItem(r, pending) {
  const id = esc(r.id);
  return '<div class="t-item' + (pending ? ' pending' : '') + '"><b>' + esc(sgTitleOf(r)) + '</b>' +
    '<div class="t-meta">المركز: ' + esc(r.center) + ' — ' + tDate(r) + '<br>المشرفة: ' + esc(r.supName || '—') + ' — رقم الزيارة: ' + esc(idDigits(r.visitNo) || '—') +
    (!pending && r.data && r.data.tchAt ? '<br><span class="t-signed">✔ وقّعتِ بتاريخ ' + esc(r.data.tchAt) + '</span>' : '') + '</div>' +
    '<div class="act">' + (pending ? '<button class="btn" onclick="tOpen(\'' + id + '\')">فتح التقرير والتوقيع</button>'
      : '<button class="btn light" onclick="tOpen(\'' + id + '\')">عرض</button>') + '</div></div>';   // يُعرض النموذج أولاً ثم الحفظ PDF أو Excel
}
// نموذج وارد بزر «📤 إرسال» من المشرفة
function inItem(x) {
  const id = esc(x.id), pending = x.status === 'new';
  return '<div class="t-item' + (pending ? ' pending' : '') + '"><b>' + esc(x.title || 'نموذج') + '</b> <span class="t-mode">' + (x.mode === 'sign' ? 'للاطلاع والتوقيع' : 'للاطلاع') + '</span>' +
    '<div class="t-meta">المشرفة: ' + esc(x.supName || '—') + ' — أُرسل: ' + esc(idDigits(x.at)) + (x.note ? '<br>ملاحظة المشرفة: ' + esc(x.note) : '') +
    (!pending ? '<br><span class="t-signed">✔ ' + (x.status === 'sign' ? 'وقّعتِ' : 'اطّلعتِ') + ' بتاريخ ' + esc(idDigits(x.doneAt)) + '</span>' : '') + '</div>' +
    '<div class="act"><button class="btn' + (pending ? '' : ' light') + '" onclick="inOpen(\'' + id + '\')">' + (pending ? (x.mode === 'sign' ? 'فتح النموذج والتوقيع' : 'فتح النموذج') : 'عرض') + '</button></div></div>';
}
function tRender() {
  const all = TREP.map(r => ({ h: () => tItem(r, !r.signed), pend: !r.signed, at: String(r.at || r.date || '') }))
    .concat(TIN.map(x => ({ h: () => inItem(x), pend: x.status === 'new', at: String(x.at || '') })))
    .sort((a, b) => b.at.localeCompare(a.at));
  const pend = all.filter(x => x.pend), done = all.filter(x => !x.pend);
  $('stPending').textContent = pend.length; $('stSigned').textContent = done.length; $('pendBadge').textContent = pend.length;
  $('tileBadge').textContent = pend.length; $('tileBadge').classList.toggle('hidden', !pend.length);
  $('pendList').innerHTML = pend.length ? pend.map(x => x.h()).join('') : '<p class="empty">لا يوجد ما ينتظر اطّلاعكِ</p>';
  $('signedList').innerHTML = done.length ? done.map(x => x.h()).join('') : '<p class="empty">لا يوجد بعد</p>';
}

/* ---------- عرض التقرير والتوقيع ---------- */
const tSig = makeSigWidget('tSigW', {});
async function tOpen(id) {
  const r = TREP.find(x => x.id === id); if (!r) return;
  tCur = r; tSigsCur = {};
  $('tDoc').innerHTML = '<p class="empty">جارِ التحميل...</p>';
  $('tSignCard').classList.toggle('hidden', !!r.signed);
  $('tAgree').checked = false; tSig.reset();
  $('tBar').innerHTML = dxBar('tVPdf', 'tVXls');
  $('tVPdf').onclick = e => sgPdf(r, e.currentTarget, tSigsCur);
  $('tVXls').onclick = e => sgXlsx(r, e.currentTarget, tSigsCur);
  tShow('signView');
  try { tSigsCur = await sgLoadSigs(r); } catch (e) {}
  $('tDoc').innerHTML = '<style>' + sgAllCss() + '</style><div class="id-scroll sg-fit">' + sgDocHtml(r, tSigsCur) + '</div>';
  sgFitBox($('tDoc').querySelector('.sg-fit'));
}
async function tPdf(id, btn) { const r = TREP.find(x => x.id === id); if (r) sgPdf(r, btn); }
async function tSign(btn) {
  if (!tCur) return;
  if (!$('tAgree').checked) return toast('علّمي على «اطّلعتُ على التقرير» أولاً', false);
  const sig = tSig.get();
  if (!sig) return toast('وقّعي داخل المربع أو أرفقي صورة التوقيع', false);
  setBtnBusy(btn, true, 'جارِ التوقيع...');
  try {
    const out = await tApi('t_sign', { id: tCur.id, signature: sig });
    toast('تم التوقيع، شكراً لكِ');
    tCur.signed = true; tCur.data = Object.assign({}, tCur.data, { tchAt: out.at, sigs: Object.assign({}, tCur.data.sigs, { tch: '1' }) });
    tSigsCur = Object.assign({}, tSigsCur, { tch: sig });
    $('tSignCard').classList.add('hidden');
    $('tDoc').innerHTML = '<style>' + sgAllCss() + '</style><div class="id-scroll sg-fit">' + sgDocHtml(tCur, tSigsCur) + '</div>';
    sgFitBox($('tDoc').querySelector('.sg-fit'));
    tRender();
    tLoad();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- شهادتي: نفس شهادة موقع الشهادات (القالب + الاسم + فئة التدريس) ---------- */
function tCertOpen() {
  if (!TME) return toast('جارِ تحميل بياناتكِ، أعيدي المحاولة بعد لحظات', false);
  $('certName').textContent = TME.name || '';
  $('certCat').textContent = TME.category || '';
  tShow('certView');
}
function tCertFont() {
  const c = $('certificate'); if (!c || !c.offsetWidth) return;
  c.style.setProperty('--cert-font-size', Math.round(c.offsetWidth * 0.04) + 'px');
}
window.addEventListener('resize', tCertFont);
function tLoadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[src="' + src + '"]')) return res();
    const sc = document.createElement('script'); sc.src = src; sc.onload = () => res(); sc.onerror = () => rej(new Error('تعذّر تحميل أداة PDF، تأكدي من الإنترنت'));
    document.body.appendChild(sc);
  });
}
async function tCertPdf(btn) {
  setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    await tLoadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await tLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const canvas = await html2canvas($('certificate'), { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'cm', format: [21, 29.7] });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 21, 29.7);
    pdf.save('شهادة-اجتياز-' + ((TME && TME.name) || 'المعلمة') + '.pdf');
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر إنشاء ملف PDF', false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- محاضر الاجتماعات: تطّلع المعلمة وتضغط «تم الاطلاع» ---------- */
function tMinOpen() { tShow('minView'); tMinRender(); tLoad(); }
function tMinItem(m) {
  return '<div class="t-item' + (m.acked ? '' : ' pending') + '"><b>محضر اجتماع رقم ( ' + esc(idDigits(m.no)) + ' )</b>' +
    '<div class="t-meta">' + esc(m.dayName || '') + ' ' + esc(idDigits(m.hijri || '')) + (m.center ? ' — ' + esc(m.center) : '') +
    (m.acked ? '<br><span class="t-signed">✔ اطّلعتِ' + (m.ackAt ? ' بتاريخ ' + esc(m.ackAt) : '') + '</span>' : '') + '</div>' +
    '<div class="act"><button class="btn' + (m.acked ? ' light' : '') + '" onclick="tMinShow(\'' + esc(m.id) + '\')">' + (m.acked ? 'عرض' : 'فتح المحضر') + '</button></div></div>';
}
function tMinRender() {
  const pend = TMIN.filter(m => !m.acked), done = TMIN.filter(m => m.acked);
  $('minBadge').textContent = pend.length; $('minBadge').classList.toggle('hidden', !pend.length);
  $('minPendBadge').textContent = pend.length;
  $('minPend').innerHTML = pend.length ? pend.map(tMinItem).join('') : '<p class="empty">لا توجد محاضر جديدة</p>';
  $('minDone').innerHTML = done.length ? done.map(tMinItem).join('') : '<p class="empty">لا توجد محاضر بعد</p>';
}
function tMinShow(id) {
  const m = TMIN.find(x => x.id === id); if (!m) return;
  tMinCur = m;
  $('minBar').innerHTML = dxBar('minPdfBtn', 'minXlsBtn');
  $('minPdfBtn').onclick = e => sgPdf(m, e.currentTarget, {});
  $('minXlsBtn').onclick = e => sgXlsx(m, e.currentTarget, {});
  $('minDoc').innerHTML = '<style>' + sgAllCss() + '</style><div class="id-scroll sg-fit">' + sgDocHtml(m, {}) + '</div>';
  $('minAckBtn').classList.toggle('hidden', !!m.acked);
  $('minAcked').classList.toggle('hidden', !m.acked);
  $('minAcked').textContent = m.acked ? '✔ اطّلعتِ على هذا المحضر' + (m.ackAt ? ' بتاريخ ' + m.ackAt : '') : '';
  tShow('minDocView');
  sgFitBox($('minDoc').querySelector('.sg-fit'));
}
async function tMinAck(btn) {
  if (!tMinCur) return;
  setBtnBusy(btn, true, 'جارِ الحفظ...');
  try {
    const out = await tApi('t_ack', { id: tMinCur.id });
    tMinCur.acked = true; tMinCur.ackAt = out.at;
    toast('تم تسجيل اطلاعكِ، شكراً لكِ');
    tMinShow(tMinCur.id); tMinRender();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- المرفقات المشاركة: تفتح المعلمة المرفق ثم تضغط «تم الاطلاع» ---------- */
function tFilesOpen() { tShow('filesView'); tFilesRender(); tLoad(); }
const tHref = u => /^https?:\/\//i.test(u || '') ? u : '#';
function tFileItem(f) {
  const id = esc(f.id);
  return '<div class="t-item' + (f.acked ? '' : ' pending') + '"><b>' + esc(f.title) + '</b>' +
    '<div class="t-meta">' + (f.name === 'رابط' ? 'رابط' : esc(f.name)) + ' — ' + esc(String(f.at || '').split(' ')[0]) +
    (f.acked ? '<br><span class="t-signed">✔ اطّلعتِ' + (f.ackAt ? ' بتاريخ ' + esc(f.ackAt) : '') + '</span>' : '') + '</div>' +
    '<div class="act"><a class="btn light" target="_blank" rel="noopener noreferrer" href="' + esc(tHref(f.url)) + '">فتح المرفق</a>' +
    (f.acked ? '' : '<button class="btn" onclick="tFileAck(\'' + id + '\', this)">✔ تم الاطلاع</button>') + '</div></div>';
}
function tFilesRender() {
  const pend = TFILES.filter(f => !f.acked), done = TFILES.filter(f => f.acked);
  $('filesBadge').textContent = pend.length; $('filesBadge').classList.toggle('hidden', !pend.length);
  $('filesPendBadge').textContent = pend.length;
  $('filesPend').innerHTML = pend.length ? pend.map(tFileItem).join('') : '<p class="empty">لا توجد مرفقات جديدة</p>';
  $('filesDone').innerHTML = done.length ? done.map(tFileItem).join('') : '<p class="empty">لا توجد مرفقات بعد</p>';
}
async function tFileAck(id, btn) {
  const f = TFILES.find(x => x.id === id); if (!f) return;
  setBtnBusy(btn, true, '...');
  try { const out = await tApi('t_fack', { id }); f.acked = true; f.ackAt = out.at; toast('تم تسجيل اطلاعكِ'); tFilesRender(); }
  catch (e) { toast(e.message, false); setBtnBusy(btn, false); }
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
  if (!f.isPdf) { box.innerHTML = '<p class="empty">هذا النموذج أُرسل بصيغة Excel فقط، فلا تتوفر له معاينة هنا — اضغطي «حفظ Excel» لفتحه.</p>'; return; }
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
  const x = TIN.find(y => y.id === id); if (!x) return;
  inCur = x; inFile = null;
  const pending = x.status === 'new', sign = x.mode === 'sign';
  $('inTitle').textContent = x.title || 'نموذج';
  $('inMeta').innerHTML = 'المشرفة: <b>' + esc(x.supName || '—') + '</b><br>تاريخ الإرسال: ' + esc(idDigits(x.at)) + '<br>المطلوب: <b>' + (sign ? 'الاطلاع والتوقيع' : 'الاطلاع') + '</b>' +
    (!pending ? '<br><span class="t-signed">✔ ' + (x.status === 'sign' ? 'وقّعتِ' : 'اطّلعتِ') + ' بتاريخ ' + esc(idDigits(x.doneAt)) + '</span>' : '');
  $('inNote').classList.toggle('hidden', !x.note); $('inNote').textContent = x.note ? 'ملاحظة المشرفة: ' + x.note : '';
  $('inBar').innerHTML = '';
  $('inPrev').innerHTML = '<p class="empty">جارِ تحميل الملف...</p>';
  $('inAct').classList.toggle('hidden', !pending);
  if (pending) {
    $('inActTitle').textContent = sign ? 'التوقيع بالاطلاع' : 'تأكيد الاطلاع';
    $('inSigBox').classList.toggle('hidden', !sign);
    $('inBtn').textContent = sign ? 'توقيع' : '✔ تم الاطلاع';
    $('inAgree').checked = false; inSig.reset();
  }
  tShow('inView');
  try {
    const f = await inGetFile(id, 'pdf');
    if (!inCur || inCur.id !== id) return;
    inFile = f;
    $('inBar').innerHTML = inBarHtml(f.fmts);
    inPreview(f, id);
  } catch (e) { $('inPrev').innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; }
}
// الملف الوارد: نعرض نسخة PDF للمعاينة، ونحفظ بالصيغة التي تختارها (PDF أو Excel)
const inFiles = {};
async function inGetFile(id, fmt) {
  const k = id + '|' + fmt;
  if (inFiles[k]) return inFiles[k];
  const o = await tApi('t_file', { id, fmt });
  const f = inBlob(o); f.fmts = o.fmts || [f.isPdf ? 'pdf' : 'xlsx'];
  inFiles[id + '|' + (f.isPdf ? 'pdf' : 'xlsx')] = f;
  return f;
}
function inBarHtml(fmts) {
  return (fmts.indexOf('pdf') > -1 ? '<button class="btn light" onclick="inSaveFmt(\'pdf\', this)">' + DX_ICO_PDF + 'حفظ PDF</button>' : '') +
    (fmts.indexOf('xlsx') > -1 ? '<button class="btn light" onclick="inSaveFmt(\'xlsx\', this)">' + DX_ICO_XLS + 'حفظ Excel</button>' : '');
}
async function inSaveFmt(fmt, btn) {
  if (!inCur) return;
  setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    const f = await inGetFile(inCur.id, fmt);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f.blob); a.download = f.name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  } catch (e) { toast(e.message || 'تعذّر التحميل', false); }
  finally { setBtnBusy(btn, false); }
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
  const sign = inCur.mode === 'sign';
  if (!$('inAgree').checked) return toast('علّمي على «اطّلعتُ على النموذج» أولاً', false);
  const sig = sign ? inSig.get() : '';
  if (sign && !sig) return toast('وقّعي داخل المربع أو أرفقي صورة التوقيع', false);
  setBtnBusy(btn, true, 'جارِ الحفظ...');
  try {
    const out = await tApi('t_done', { id: inCur.id, signature: sig });
    Object.assign(inCur, { status: sign ? 'sign' : 'ack', doneAt: out.at });
    toast(sign ? 'تم التوقيع، شكراً لكِ' : 'تم تسجيل اطلاعكِ، شكراً لكِ');
    $('inAct').classList.add('hidden');
    tRender(); tShow('reportsView'); tLoad();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}


/* ---------- استعادة الجلسة ---------- */
(function init() {
  if (!localStorage.getItem(T_PHONE) || !localStorage.getItem(T_PW)) return;
  try {
    const c = JSON.parse(localStorage.getItem(T_CACHE) || 'null');
    if (c) { TREP = c.data || []; TIN = c.inbox || []; TME = c.me || null; TMIN = c.minutes || []; TFILES = c.files || []; $('tHello').textContent = 'مرحباً ' + c.name; tRender(); tMinRender(); tFilesRender(); }
  } catch (e) {}
  tShow('homeView');
  tLoad();
})();
