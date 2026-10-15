/* ===== صفحة مشرفات وحدة تحفيظ الصغار (sighar.html) — على نمط صفحة الإشراف الإداري ===== */
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const $ = id => document.getElementById(id);
const VIEW_KEY = 'sgh_view', NAME_KEY = 'sgh_name';
let LISTS = { centers: [], types: [], teachers: [], typesSgh: [] };
let VISITS = [], SGH = [], sgEdit = null;

const ALL_VIEWS = ['loginView', 'homeView', 'visitsView', 'sgListView', 'sgForm'];

function show(id) {
  ALL_VIEWS.forEach(v => $(v).classList.add('hidden'));
  $(id).classList.remove('hidden');
  if (id !== 'loginView') localStorage.setItem(VIEW_KEY, id);
  window.scrollTo(0, 0);
  setTimeout(() => SIG_WIDGETS.forEach(w => w.resize()), 60);
}

/* ---------- الدخول ---------- */
// حساب من وحدة أخرى: نحوّله لصفحة وحدته (الدخول يبقى محفوظاً)
function wrongUnit(p) {
  if (!p || p.unit === SG_UNIT) return false;
  toast('هذا الحساب من ' + (p.unit || 'وحدة أخرى') + '، جارِ التحويل لصفحتها');
  setTimeout(() => { location.href = p.unit === ID_UNIT ? 'idari.html' : 'mushrifat.html'; }, 1200);
  return true;
}
async function doLogin() {
  const un = $('un').value.trim(), pw = $('pw').value.trim();
  if (!un) return toast('أدخلي اسم المستخدم', false);
  if (!pw) return toast('أدخلي كلمة المرور', false);
  const btn = $('loginBtn');
  localStorage.setItem(USER_KEY, un);
  localStorage.setItem(PW_KEY, pw);
  setBtnBusy(btn, true, 'جارِ التحقق...');
  try {
    const out = await api('getLists');
    if (wrongUnit(out.profile)) return;
    applyLists(out.data, out.profile);
    loadMySig();
    show('homeView');
    loadSgh(true);
  } catch (e) {
    localStorage.removeItem(PW_KEY); localStorage.removeItem(USER_KEY);
    toast(e.message, false);
  } finally { setBtnBusy(btn, false); }
}
['un', 'pw'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));

function logout() {
  [PW_KEY, USER_KEY, VIEW_KEY, NAME_KEY].forEach(k => localStorage.removeItem(k));
  cacheClear(); clearMySigLocal(); sigRefreshAll();
  VISITS = []; SGH = [];
  $('un').value = ''; $('pw').value = '';
  show('loginView');
}

const myName = () => localStorage.getItem(NAME_KEY) || '';
function applyLists(d, prof) {
  LISTS = d || LISTS;
  cacheSet('lists', LISTS);
  if (prof && prof.name) localStorage.setItem(NAME_KEY, prof.name);
  fillLists();
}
function fillSelect(id, arr, ph) {
  const el = $(id), cur = el.value;
  el.innerHTML = '<option value="">' + esc(ph) + '</option>' + arr.map(x => '<option>' + esc(x) + '</option>').join('');
  if (cur && arr.indexOf(cur) > -1) el.value = cur;
}
function fillLists() {
  ['vCenter', 'sgCenter'].forEach(id => fillSelect(id, LISTS.centers || [], 'اختاري المركز'));
  fillSelect('fCenter', LISTS.centers || [], 'كل المراكز');
  fillTeachers();
  fillTypes();
  fillVStatus();
}
// أسماء المعلمات للاقتراح: من «القوائم» ومن التقارير السابقة
function fillTeachers() {
  const set = new Set((LISTS.teachers || []).concat(SGH.map(r => r.teacher)).filter(Boolean));
  $('sgTeachers').innerHTML = [...set].sort((a, b) => a.localeCompare(b, 'ar')).map(n => '<option value="' + esc(n) + '">').join('');
}
async function preload() {
  const c = cacheGet('lists');
  if (c) { LISTS = c; fillLists(); }
  fillVStatus();
  loadMySig();
  try {
    const out = await api('getLists');
    if (wrongUnit(out.profile)) return;
    applyLists(out.data, out.profile);
  } catch (e) {
    if (e.auth) { toast('انتهت صلاحية الدخول، سجّلي الدخول من جديد', false); logout(); }
    else if (!c) toast(e.message, false);
  }
}

/* ---------- التاريخ ---------- */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const dayOf = v => { if (!v) return ''; const p = v.split('-'); return DAYS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; };
const arD = n => idDigits(n);

/* ---------- خانات التاريخ الهجري (اليوم + اليوم/الشهر/السنة) مثل الإشراف الإداري ---------- */
function hdBuild(p) {
  const opt = n => '<option value="' + n + '">' + arD(n) + '</option>';
  let dd = '', mm = '';
  for (let i = 1; i <= 30; i++) dd += opt(i);
  for (let i = 1; i <= 12; i++) mm += opt(i);
  $(p + 'DateBox').innerHTML =
    '<div class="hd-grid">' +
      '<div><label for="' + p + 'DayN">اليوم</label><select id="' + p + 'DayN">' + DAYS.map(x => '<option>' + x + '</option>').join('') + '</select></div>' +
      '<div><label for="' + p + 'HD">التاريخ: اليوم</label><select id="' + p + 'HD" onchange="hdChanged(\'' + p + '\')">' + dd + '</select></div>' +
      '<div><label for="' + p + 'HM">الشهر</label><select id="' + p + 'HM" onchange="hdChanged(\'' + p + '\')">' + mm + '</select></div>' +
      '<div><label for="' + p + 'HY">السنة</label><input id="' + p + 'HY" inputmode="numeric" maxlength="4" onchange="hdChanged(\'' + p + '\')"></div>' +
    '</div><div class="hd-prev">يظهر في التقرير: <b id="' + p + 'HPrev"></b></div>';
}
function hdChanged(p) {
  const g = idHToG($(p + 'HY').value, $(p + 'HM').value, $(p + 'HD').value);
  if (g) $(p + 'DayN').value = dayOf(g);
  hdPrev(p);
  sgUpdateNo();
}
function hdPrev(p) {
  const y = $(p + 'HY').value.trim();
  $(p + 'HPrev').innerHTML = '<span dir="rtl">' + (y ? idHDate({ data: { hd: $(p + 'HD').value, hm: $(p + 'HM').value, hy: y } }) : '—') + '</span>';
}
function hdSet(p, rec) {
  const d = (rec && rec.data) || {};
  let h = d.hd ? { d: +d.hd, m: +d.hm, y: +d.hy } : null;
  if (!h) h = idHParts(new Date()) || { d: 1, m: 1, y: '' };
  $(p + 'HD').value = h.d; $(p + 'HM').value = h.m; $(p + 'HY').value = h.y;
  const g = idHToG(h.y, h.m, h.d);
  $(p + 'DayN').value = d.dayName || (g ? dayOf(g) : DAYS[new Date().getDay()]);
  hdPrev(p);
}
function hdGet(p) {
  const hd = $(p + 'HD').value, hm = $(p + 'HM').value, hy = $(p + 'HY').value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
  return { hd, hm, hy, dayName: $(p + 'DayN').value, greg: idHToG(hy, hm, hd) };
}
hdBuild('sg');

/* ======================= كشف الخروج (نفس فكرة الوحدات الأخرى) ======================= */
const V_STATUS = ['تمت الزيارة', 'تمت الزيارة والمديرة متغيبة', 'تمت الزيارة وتعذر التوثيق لتعليق الموقع أو الشبكة', 'تمت الزيارة قبل توفر موقع النظام', 'لم تتم الزيارة'];
const V_SIGNED = V_STATUS[0], V_NONE = V_STATUS[4];
const vStatusOf = v => v.status || (v.absent ? V_STATUS[1] : V_STATUS[0]);
const V_NOC = 'غياب بدون تحديد مركز';
const vIsAbsent = v => vStatusOf(v) === V_NONE;
const V_TSEP = '، ';

function fillVStatus() {
  const el = $('vStatus');
  if (el && !el.options.length) { el.innerHTML = V_STATUS.map(x => '<option>' + esc(x) + '</option>').join(''); onStatusChange(); }
}
// أنواع زيارة تحفيظ الصغار (العمود E في «القوائم»)، وإن كان فارغاً تُستخدم الأنواع العامة
const vTypes = () => (LISTS.typesSgh && LISTS.typesSgh.length) ? LISTS.typesSgh : (LISTS.types || []);
function fillTypes() {
  const box = $('vTypeList'); if (!box) return;
  const cur = getVTypes();
  box.innerHTML = vTypes().map(t => '<label class="chip"><input type="checkbox" value="' + esc(t) + '"' + (cur.indexOf(t) > -1 ? ' checked' : '') + '><span>' + esc(t) + '</span></label>').join('') || '<span class="empty">لا توجد أنواع زيارة</span>';
}
const getVTypes = () => [...document.querySelectorAll('#vTypeList input:checked')].map(i => i.value);
const clearVTypes = () => document.querySelectorAll('#vTypeList input').forEach(i => i.checked = false);

function onDateChange() {
  const v = $('vDate').value;
  $('vDay').value = dayOf(v);
  try {
    const p = v.split('-');
    $('vHijri').textContent = v ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(+p[0], +p[1] - 1, +p[2])) : '—';
  } catch (e) { $('vHijri').textContent = '—'; }
}
$('vDate').value = todayStr();
onDateChange();

const vSig = makeSigWidget('vSigW', {});
function onStatusChange() {
  const st = $('vStatus').value, needSig = st === V_SIGNED, none = st === V_NONE;
  $('sigSection').classList.toggle('hidden', !needSig);
  $('vTypeBox').classList.toggle('hidden', none);
  $('vCenterBox').classList.toggle('hidden', none);
  const note = $('absentNote');
  note.classList.toggle('hidden', needSig);
  note.textContent = none ? 'لم تتم الزيارة: يكفي اختيار هذه الحالة ثم الحفظ، وتُسجَّل يوم غياب (بدون مركز ولا نوع زيارة ولا توقيع).'
    : 'التوقيع غير مطلوب في هذه الحالة، وتُحسب الزيارة يوم حضور.';
  if (needSig) setTimeout(() => vSig.resize(), 30);
}

async function loadVisits() {
  setTimeout(() => vSig.resize(), 50);
  if (!VISITS.length) { const c = cacheGet('visits'); if (c) VISITS = c; }
  renderVisits();
  try {
    const out = await api('getVisits', { mine: true });   // زياراتي فقط
    VISITS = out.data; cacheSet('visits', VISITS); renderVisits();
  } catch (e) { toast(e.message, false); }
}
function statusTag(v) {
  const st = vStatusOf(v);
  return '<span class="tag ' + (st === V_SIGNED ? 'ok' : st === V_NONE ? 'bad' : 'warn') + '">' + esc(st) + '</span>';
}
function renderVisits() {
  const f = $('fCenter').value;
  const att = VISITS.filter(v => !vIsAbsent(v)).length;
  $('stDays').textContent = att;
  $('stAbs').textContent = VISITS.length - att;
  const rows = VISITS.filter(v => !f || v.center === f);
  const body = $('vBody');
  if (!rows.length) { body.innerHTML = '<tr><td colspan="8" class="empty">لا توجد زيارات</td></tr>'; return; }
  body.innerHTML = rows.map((v, i) => '<tr><td>' + (i + 1) + '</td><td>' + (esc(v.center) || '—') + '</td><td>' + (esc(v.type) || '—') + '</td><td>' +
    esc(v.date) + '</td><td>' + esc(v.day) + '</td><td>' + statusTag(v) + '</td><td>' +
    (v.signature ? '<a class="lnk" target="_blank" rel="noopener" href="' + esc(v.signature) + '">عرض</a>' : '—') + '</td>' +
    '<td><button class="btn danger" onclick="delVisit(\'' + esc(v.id) + '\')">حذف</button></td></tr>').join('');
}
async function saveVisit() {
  const status = $('vStatus').value, none = status === V_NONE;
  const center = none ? '' : $('vCenter').value;
  const type = none ? '' : getVTypes().join(V_TSEP);
  const date = $('vDate').value || todayStr();
  const needSig = status === V_SIGNED;
  const sig = needSig ? vSig.get() : '';
  if (!none && !center) return toast('اختاري اسم المركز', false);
  if (!none && !type) return toast('اختاري نوع الزيارة', false);
  if (needSig && !sig) return toast('توقيع المديرة مطلوب (رسم أو صورة)، أو اختاري حالة أخرى للزيارة', false);
  const btn = $('saveVisitBtn');
  setBtnBusy(btn, true);
  try {
    const hijri = $('vHijri').textContent;
    const res = await api('addVisit', { center, type, date, status, hijri, signature: sig });
    toast('تم حفظ الزيارة');
    VISITS.unshift({ id: res.id || ('tmp' + Date.now()), center, type, date, hijri, day: res.day || $('vDay').value,
      absent: status === V_STATUS[1], status, signature: res.signature || '', counted: !none, at: '' });
    cacheSet('visits', VISITS);
    $('vCenter').value = ''; clearVTypes();
    $('vStatus').value = V_SIGNED; onStatusChange(); vSig.reset();
    renderVisits(); loadVisits();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}
async function delVisit(id) {
  if (!confirm('هل تريدين حذف هذه الزيارة؟')) return;
  VISITS = VISITS.filter(v => v.id !== id);
  cacheSet('visits', VISITS); renderVisits();
  try { await api('deleteVisit', { id }); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); loadVisits(); }
}

/* ======================= تقرير زيارة مشرفة تحفيظ صغار ======================= */
const SGW = {
  tch: makeSigWidget('sgTchW', { none: true }),              // توقيع المعلمة بالاطلاع
  sup: makeSigWidget('sgSupW', { saved: true, none: true })  // توقيع المشرفة (يمكن حفظه للتقارير القادمة)
};

async function loadSgh(silent) {
  if (!SGH.length) { const c = cacheGet('sgh'); if (c) SGH = c; }
  renderSgh();
  try {
    const out = await api('getSgh');
    SGH = out.data || []; cacheSet('sgh', SGH); renderSgh(); fillTeachers();
  } catch (e) { if (!silent) toast(e.message, false); }
}
function sgOpenList() { show('sgListView'); loadSgh(); }

const sBtn = (txt, fn, cls) => '<button class="btn ' + (cls || 'light') + '" style="padding:6px 10px;font-size:13px" onclick="' + fn + '">' + txt + '</button>';
const sgNorm = t => String(t || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
function renderSgh() {
  const q = sgNorm($('sgFilter').value);
  const L = SGH.filter(r => !q || sgNorm(r.teacher + ' ' + r.center).indexOf(q) > -1);
  if (!L.length) { $('sgBody').innerHTML = '<tr><td colspan="7" class="empty">' + (SGH.length ? 'لا توجد نتائج' : 'لا توجد تقارير محفوظة') + '</td></tr>'; return; }
  $('sgBody').innerHTML = L.map((r, i) => {
    const id = esc(r.id);
    return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.teacher) + '</td><td>' + esc(r.center) + '</td><td>' + esc(r.period) + '</td><td>' +
      (esc((r.data && r.data.dayName) || r.day) + ' ' + idHDate(r)).trim() + '</td><td>' + (esc(arD(r.visitNo)) || '—') + '</td>' +
      '<td><div class="act">' + sBtn('عرض', 'sgOpen(\'' + id + '\')') + sBtn('طباعة', 'sgDo(\'' + id + '\', this, \'print\')') +
      sBtn('PDF', 'sgDo(\'' + id + '\', this, \'pdf\')') + sBtn('مشاركة', 'sgDo(\'' + id + '\', this, \'share\')') +
      sBtn('تعديل', 'sgEditRec(\'' + id + '\')') + sBtn('حذف', 'sgDel(\'' + id + '\')', 'danger') + '</div></td></tr>';
  }).join('');
}
const recById = id => SGH.find(r => r.id === id);
function sgOpen(id) { const r = recById(id); if (r) sgView(r); }
function sgDo(id, btn, what) { const r = recById(id); if (!r) return; what === 'pdf' ? sgPdf(r, btn) : what === 'share' ? sgShare(r, btn) : sgPrint(r, btn); }
async function sgDel(id) {
  if (!confirm('هل تريدين حذف هذا التقرير؟')) return;
  SGH = SGH.filter(r => r.id !== id);
  cacheSet('sgh', SGH); renderSgh();
  try { await api('deleteSgh', { id }); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); loadSgh(); }
}

/* ---------- الفترة: اختيار واحد (صباحي أو مسائي) ---------- */
$('sgPeriod').addEventListener('change', e => {
  if (e.target.checked) document.querySelectorAll('#sgPeriod input').forEach(i => { if (i !== e.target) i.checked = false; });
  sgUpdateNo();
});
const periodGet = id => [...document.querySelectorAll('#' + id + ' input:checked')].map(i => i.value).join(' / ');
const periodSet = (id, v) => document.querySelectorAll('#' + id + ' input').forEach(i => { i.checked = String(v || '').indexOf(i.value) > -1; });

/* ---------- رقم الزيارة التلقائي: ترتيب الزيارة بين تقاريركِ لنفس المعلمة في نفس المركز (ويمكن تعديله) ---------- */
const pad2 = x => String(x).padStart(2, '0');
const sgHKey = r => { const d = (r && r.data) || {}; return d.hy ? d.hy + '-' + pad2(d.hm) + '-' + pad2(d.hd) : ''; };
let sgNoTouched = false;
$('sgVisitNo').addEventListener('input', () => { sgNoTouched = true; });
function sgUpdateNo() {
  const hint = $('sgVisitNoHint'), t = sgNorm($('sgTeacher').value), center = $('sgCenter').value;
  if (!t || !center) { hint.textContent = ''; return; }
  const hd = hdGet('sg');
  const cur = /^\d{4}$/.test(hd.hy) ? hd.hy + '-' + pad2(hd.hm) + '-' + pad2(hd.hd) : '9999';
  const selfId = sgEdit ? sgEdit.id : '';
  const L = SGH.filter(r => r.id !== selfId && sgNorm(r.teacher) === t && r.center === center);
  const before = L.filter(r => sgHKey(r) < cur).length;
  const same = L.some(r => sgHKey(r) === cur);
  if (!sgNoTouched && !sgEdit) $('sgVisitNo').value = before + 1;
  hint.textContent = (L.length ? 'زياراتكِ السابقة لهذه المعلمة في هذا المركز: ' + arD(before) + '، فهذه الزيارة رقم ' + arD(before + 1) + '.'
    : 'لا توجد زيارات سابقة لهذه المعلمة في هذا المركز، فهذه الزيارة الأولى.') + (same ? ' تنبيه: يوجد تقرير آخر لها بنفس التاريخ.' : '');
}

// تنبيه إذا زادت التوصيات عن مساحة الصفحة الواحدة
$('sgRecs').addEventListener('input', () => {
  const v = $('sgRecs').value, lines = v.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 85)), 0);
  $('sgRecsHint').textContent = lines > SG_MIN_LINES + 4 ? 'التوصيات طويلة؛ سيُصغَّر التقرير قليلاً ليكفي صفحة واحدة.' : '';
});

/* ---------- فتح تقرير جديد / تعديل ---------- */
function sgFill(r) {
  r = r || {};
  const edit = !!r.id;
  document.querySelectorAll('#sgForm [data-edit]').forEach(x => x.classList.toggle('hidden', !edit));
  $('sgTeacher').value = r.teacher || '';
  $('sgCenter').value = r.center || '';
  periodSet('sgPeriod', r.period);
  hdSet('sg', edit ? r : null);
  $('sgVisitNo').value = r.visitNo || '';
  $('sgLesson').value = r.lesson || '';
  $('sgRecs').value = r.recs || '';
  $('sgRecsHint').textContent = '';
  $('sgSupName').value = edit ? (r.supName || '') : myName();
  $('sgVisitNoHint').textContent = '';
  sgNoTouched = false;
  const has = (r.data && r.data.sigs) || {};
  Object.keys(SGW).forEach(k => { SGW[k].reset(); if (edit && has[k]) SGW[k].keepOld('الإبقاء على التوقيع السابق'); });
  if (!edit) SGW.tch.setMode('none');   // المعلمة: الافتراضي بدون توقيع (يُوقَّع ورقياً) ويمكن اختيار الرسم
}
function sgNew() { sgEdit = null; sgFill(null); show('sgForm'); }
function sgEditRec(id) { const r = recById(id); if (!r) return; sgEdit = r; sgFill(r); show('sgForm'); }
function sgBack() { sgEdit = null; show('sgListView'); renderSgh(); }

/* ---------- الحفظ ---------- */
async function sgSave(btn) {
  const hd = hdGet('sg');
  if (!/^\d{4}$/.test(hd.hy)) return toast('اكتبي سنة التاريخ الهجري (مثال: 1448)', false);
  const req = {
    id: sgEdit ? sgEdit.id : '',
    teacher: $('sgTeacher').value.trim(), center: $('sgCenter').value, period: periodGet('sgPeriod'),
    visitNo: $('sgVisitNo').value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)),
    date: hd.greg, lesson: $('sgLesson').value.trim(), recs: $('sgRecs').value.replace(/\s+$/, ''),
    supName: $('sgSupName').value.trim(),
    data: { hd: hd.hd, hm: hd.hm, hy: hd.hy, dayName: hd.dayName }
  };
  if (!req.teacher) return toast('اكتبي اسم المعلمة', false);
  if (!req.center) return toast('اختاري المركز', false);
  if (!req.period) return toast('اختاري الفترة (صباحي أو مسائي)', false);
  if (!req.lesson) return toast('اكتبي موضوع الدرس', false);
  const oldHas = (sgEdit && sgEdit.data && sgEdit.data.sigs) || {};
  req.sigs = {};
  Object.keys(SGW).forEach(k => { const v = SGW[k].get(); req.sigs[k] = v || (sgEdit && oldHas[k] ? 'keep' : ''); });

  setBtnBusy(btn, true);
  try {
    const res = await api('saveSgh', req);
    SGW.sup.commit();
    toast(sgEdit ? 'تم حفظ التعديل' : 'تم حفظ التقرير');
    const rec = Object.assign({}, req, { id: res.id, kind: 'sgh', day: hd.dayName, at: sgEdit ? sgEdit.at : '',
      data: Object.assign({}, req.data, { sigs: res.sigs || {} }) });
    delete rec.sigs;
    SGH = SGH.filter(r => r.id !== rec.id); SGH.unshift(rec);
    cacheSet('sgh', SGH);
    sgEdit = null;
    show('sgListView'); renderSgh(); fillTeachers();
    loadSgh(true);
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- استعادة الجلسة ---------- */
(function init() {
  loadLoginNames('users', 'un', { unit: SG_UNIT });
  if (!getPw() || !getUser()) return;
  const last = localStorage.getItem(VIEW_KEY);
  preload();
  if (last === 'visitsView') { show('visitsView'); loadVisits(); }
  else if (last === 'sgListView' || last === 'sgForm') sgOpenList();
  else { show('homeView'); loadSgh(true); }
})();
