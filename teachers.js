/* ===== أيقونة «المعلمات» (teachers.html): تطّلع المعلمة على تقارير المشرفات المرسلة إليها وتوقّع عليها =====
   الدخول برقم الجوال وكلمة مرور بوابة المعلمات، والتقارير مرتبطة بها عن طريق رقم جوالها في تقرير المشرفة. */
const $ = id => document.getElementById(id);
const T_PHONE = 'tch_phone', T_PW = 'tch_pw', T_CACHE = 'tch_reports';
let TREP = [], tCur = null, tSigsCur = {};

function tShow(id) {
  ['loginView', 'homeView', 'signView'].forEach(v => $(v).classList.add('hidden'));
  $(id).classList.remove('hidden');
  window.scrollTo(0, 0);
  setTimeout(() => SIG_WIDGETS.forEach(w => w.resize()), 60);
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
  try { localStorage.setItem(T_CACHE, JSON.stringify({ name: out.teacher.name, data: TREP })); } catch (e) {}
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
  $('tDoc').innerHTML = '<style>' + SG_CSS + '</style><div class="id-scroll sg-fit">' + sgDocHtml(r, tSigsCur) + '</div>';
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
    $('tDoc').innerHTML = '<style>' + SG_CSS + '</style><div class="id-scroll sg-fit">' + sgDocHtml(tCur, tSigsCur) + '</div>';
    sgFitBox($('tDoc').querySelector('.sg-fit'));
    tRender();
    tLoad();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- استعادة الجلسة ---------- */
(function init() {
  if (!localStorage.getItem(T_PHONE) || !localStorage.getItem(T_PW)) return;
  try {
    const c = JSON.parse(localStorage.getItem(T_CACHE) || 'null');
    if (c) { TREP = c.data || []; $('tHello').textContent = 'مرحباً ' + c.name; tRender(); }
  } catch (e) {}
  tShow('homeView');
  tLoad();
})();
