/* ===== أيقونة «المعلمات» (teachers.html): تطّلع المعلمة على تقارير المشرفات المرسلة إليها وتوقّع عليها =====
   الدخول برقم الجوال وكلمة مرور بوابة المعلمات، والتقارير مرتبطة بها عن طريق رقم جوالها في تقرير المشرفة. */
const $ = id => document.getElementById(id);
const T_PHONE = 'tch_phone', T_PW = 'tch_pw', T_CACHE = 'tch_reports';
let TREP = [], tCur = null, tSigsCur = {}, TME = null, TMIN = [], tMinCur = null;

function tShow(id) {
  ['loginView', 'homeView', 'reportsView', 'certView', 'signView', 'minView', 'minDocView'].forEach(v => $(v).classList.add('hidden'));
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
  TREP = []; $('tPhone').value = ''; $('tPw').value = ''; $('tHintBox').textContent = '';
  tShow('loginView');
}

/* ---------- قائمة التقارير ---------- */
function tApply(out) {
  TREP = out.data || [];
  TME = out.teacher || TME;
  TMIN = out.minutes || [];
  try { localStorage.setItem(T_CACHE, JSON.stringify({ name: out.teacher.name, me: out.teacher, data: TREP, minutes: TMIN })); } catch (e) {}
  tMinRender();
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
      : '<button class="btn light" onclick="tOpen(\'' + id + '\')">عرض</button><button class="btn light" onclick="tPdf(\'' + id + '\', this)">تحميل PDF</button>') + '</div></div>';
}
function tRender() {
  const pend = TREP.filter(r => !r.signed), done = TREP.filter(r => r.signed);
  $('stPending').textContent = pend.length; $('stSigned').textContent = done.length; $('pendBadge').textContent = pend.length;
  $('tileBadge').textContent = pend.length; $('tileBadge').classList.toggle('hidden', !pend.length);
  $('pendList').innerHTML = pend.length ? pend.map(r => tItem(r, true)).join('') : '<p class="empty">لا توجد تقارير بانتظار توقيعكِ</p>';
  $('signedList').innerHTML = done.length ? done.map(r => tItem(r, false)).join('') : '<p class="empty">لا توجد تقارير موقّعة بعد</p>';
}

/* ---------- عرض التقرير والتوقيع ---------- */
const tSig = makeSigWidget('tSigW', {});
async function tOpen(id) {
  const r = TREP.find(x => x.id === id); if (!r) return;
  tCur = r; tSigsCur = {};
  $('tDoc').innerHTML = '<p class="empty">جارِ التحميل...</p>';
  $('tSignCard').classList.toggle('hidden', !!r.signed);
  $('tAgree').checked = false; tSig.reset();
  $('tBar').innerHTML = '<button class="btn light" id="tVPrint">طباعة</button><button class="btn light" id="tVPdf">تحميل PDF</button>';
  $('tVPrint').onclick = e => sgPrint(r, e.currentTarget, tSigsCur);
  $('tVPdf').onclick = e => sgPdf(r, e.currentTarget, tSigsCur);
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
  $('minBar').innerHTML = '<button class="btn light" id="minPdfBtn">تحميل PDF</button>';
  $('minPdfBtn').onclick = e => sgPdf(m, e.currentTarget, {});
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

/* ---------- استعادة الجلسة ---------- */
(function init() {
  if (!localStorage.getItem(T_PHONE) || !localStorage.getItem(T_PW)) return;
  try {
    const c = JSON.parse(localStorage.getItem(T_CACHE) || 'null');
    if (c) { TREP = c.data || []; TME = c.me || null; TMIN = c.minutes || []; $('tHello').textContent = 'مرحباً ' + c.name; tRender(); tMinRender(); }
  } catch (e) {}
  tShow('homeView');
  tLoad();
})();
