/* ===== صفحة مشرفات وحدة تحفيظ الصغار (sighar.html) — على نمط صفحة الإشراف الإداري ===== */
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const $ = id => document.getElementById(id);
const VIEW_KEY = 'sgh_view', NAME_KEY = 'sgh_name';
let LISTS = { centers: [], types: [], teachers: [], typesSgh: [] };
let VISITS = [], SGH = [], sgEdit = null, SGS = [], ssEdit = null;

const ALL_VIEWS = ['loginView', 'homeView', 'visitsView', 'sgListView', 'sgForm', 'ssListView', 'ssForm'];

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
  VISITS = []; SGH = []; SGS = [];
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
  if (!L.length) { $('sgBody').innerHTML = '<tr><td colspan="8" class="empty">' + (SGH.length ? 'لا توجد نتائج' : 'لا توجد تقارير محفوظة') + '</td></tr>'; return; }
  $('sgBody').innerHTML = L.map((r, i) => {
    const id = esc(r.id);
    return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.teacher) + '</td><td>' + esc(r.center) + '</td><td>' + esc(r.period) + '</td><td>' +
      (esc((r.data && r.data.dayName) || r.day) + ' ' + idHDate(r)).trim() + '</td><td>' + (esc(arD(r.visitNo)) || '—') + '</td><td>' + sgTStatus(r) + '</td>' +
      '<td><div class="act">' + sBtn('عرض', 'sgOpen(\'' + id + '\')') + sBtn('طباعة', 'sgDo(\'' + id + '\', this, \'print\')') +
      sBtn('PDF', 'sgDo(\'' + id + '\', this, \'pdf\')') + sBtn('مشاركة', 'sgDo(\'' + id + '\', this, \'share\')') +
      sBtn('تعديل', 'sgEditRec(\'' + id + '\')') + sBtn('حذف', 'sgDel(\'' + id + '\')', 'danger') + '</div></td></tr>';
  }).join('');
}
const recById = id => SGH.find(r => r.id === id);
// حالة توقيع المعلمة: من حسابها، أو على جهاز المشرفة، أو بانتظار توقيعها
function sgTStatus(r) {
  const d = r.data || {}, signed = d.sigs && d.sigs.tch;
  if (signed) return '<span class="tag ok">✔ وقّعت' + (d.tchAt ? ' <small>' + esc(d.tchAt) + '</small>' : '') + '</span>';
  if (d.tid) return '<span class="tag warn">⏳ بانتظار توقيعها</span>';
  return '<span style="color:var(--muted)">—</span>';
}
// البحث عن المعلمة برقم جوالها في سجل المعلمات (شيت الشهادات)
let sgTFound = null;
async function sgLookupT() {
  const v = $('sgTPhone').value.trim(), hint = $('sgTHint');
  sgTFound = null;
  if (!v) { hint.textContent = ''; return; }
  hint.textContent = 'جارِ البحث عن المعلمة...';
  try {
    const out = await api('lookupTeacher', { phone: v });
    sgTFound = out.data;
    hint.innerHTML = '✔ المعلمة: <b>' + esc(out.data.name) + '</b>';
    if (!$('sgTeacher').value.trim()) { $('sgTeacher').value = out.data.name; sgUpdateNo(); }
  } catch (e) { hint.textContent = '✖ ' + e.message; }
}
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

/* ---------- التوصيات: كل توصية في سطر برقمها (مثل ملاحظات تقرير المقاصف) ---------- */
function sgAddRec(v) {
  const row = document.createElement('div');
  row.className = 'id-note-row';
  row.innerHTML = '<span class="num"></span><textarea rows="2" placeholder="اكتبي التوصية..."></textarea><button type="button" class="x" title="حذف">✕</button>';
  row.querySelector('textarea').value = v || '';
  row.querySelector('.x').onclick = () => {
    if ($('sgRecRows').children.length < 2) { row.querySelector('textarea').value = ''; return; }
    row.remove(); sgNumRecs();
  };
  $('sgRecRows').appendChild(row);
  sgNumRecs();
}
function sgNumRecs() { [...$('sgRecRows').children].forEach((el, i) => { el.querySelector('.num').textContent = arD(i + 1); }); }
function sgRecsSet(text) {
  $('sgRecRows').innerHTML = '';
  const L = String(text || '').split('\n').map(x => x.trim()).filter(Boolean);
  (L.length ? L : ['', '']).forEach(sgAddRec);
}
// كل توصية سطر واحد (تُحفظ في عمود «توصيات عامة» مفصولة بأسطر)
const sgRecsGet = () => [...$('sgRecRows').querySelectorAll('textarea')].map(t => t.value.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');

/* ---------- فتح تقرير جديد / تعديل ---------- */
function sgFill(r) {
  r = r || {};
  const edit = !!r.id;
  document.querySelectorAll('#sgForm [data-edit]').forEach(x => x.classList.toggle('hidden', !edit));
  $('sgTeacher').value = r.teacher || '';
  $('sgTPhone').value = (r.data && r.data.tPhone) || '';
  $('sgTHint').innerHTML = r.data && r.data.tName ? '✔ المعلمة: <b>' + esc(r.data.tName) + '</b>' + (r.data.tchAt ? ' — وقّعت من حسابها' : '') : '';
  sgTFound = null;
  $('sgCenter').value = r.center || '';
  periodSet('sgPeriod', r.period);
  hdSet('sg', edit ? r : null);
  $('sgVisitNo').value = r.visitNo || '';
  $('sgLesson').value = r.lesson || '';
  sgRecsSet(r.recs);
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
    date: hd.greg, lesson: $('sgLesson').value.trim(), recs: sgRecsGet(),
    supName: $('sgSupName').value.trim(), tPhone: $('sgTPhone').value.trim(),
    data: { hd: hd.hd, hm: hd.hm, hy: hd.hy, dayName: hd.dayName }
  };
  if (!req.teacher) return toast('اكتبي اسم المعلمة', false);
  if (!req.center) return toast('اختاري المركز', false);
  if (!req.period) return toast('اختاري الفترة (صباحي أو مسائي)', false);
  if (!req.lesson) return toast('اكتبي موضوع الدرس', false);
  if (!req.recs) return toast('اكتبي توصية واحدة على الأقل', false);
  const oldHas = (sgEdit && sgEdit.data && sgEdit.data.sigs) || {};
  req.sigs = {};
  Object.keys(SGW).forEach(k => { const v = SGW[k].get(); req.sigs[k] = v || (sgEdit && oldHas[k] ? 'keep' : ''); });

  setBtnBusy(btn, true);
  try {
    const res = await api('saveSgh', req);
    SGW.sup.commit();
    toast(sgEdit ? 'تم حفظ التعديل' : 'تم حفظ التقرير');
    const rec = Object.assign({}, req, { id: res.id, kind: 'sgh', day: hd.dayName, at: sgEdit ? sgEdit.at : '',
      data: Object.assign({}, req.data, { sigs: res.sigs || {} }, res.tid ? { tid: res.tid, tName: res.tName, tPhone: req.tPhone, tchAt: res.tchAt } : {}) });
    delete rec.sigs; delete rec.tPhone;
    SGH = SGH.filter(r => r.id !== rec.id); SGH.unshift(rec);
    cacheSet('sgh', SGH);
    sgEdit = null;
    show('sgListView'); renderSgh(); fillTeachers();
    loadSgh(true);
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ======================= خلاصة التقارير التعليمية – متابعة المشرفة للمعلمة ======================= */
const SS_ATT = ['قرآن', 'مادة', 'كليهما'];   // حضور مادة أم قرآن أم كليهما
const ssSupW = makeSigWidget('ssSupW', { saved: true, none: true });
hdBuild('ss');
// خانات تاريخ هجري مختصرة (يوم / شهر / سنة) لـ «خلال الفترة من ... إلى ...»
function hpBuild(id) {
  let dd = '<option value="">اليوم</option>', mm = '<option value="">الشهر</option>';
  for (let i = 1; i <= 30; i++) dd += '<option value="' + i + '">' + arD(i) + '</option>';
  for (let i = 1; i <= 12; i++) mm += '<option value="' + i + '">' + arD(i) + '</option>';
  $(id + 'Box').innerHTML = '<div class="hp-grid"><select id="' + id + 'D">' + dd + '</select><select id="' + id + 'M">' + mm + '</select><input id="' + id + 'Y" inputmode="numeric" maxlength="4" placeholder="السنة"></div>';
}
hpBuild('ssFrom'); hpBuild('ssTo');
const hpGet = id => { const y = $(id + 'Y').value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)); return y && $(id + 'D').value && $(id + 'M').value ? { d: $(id + 'D').value, m: $(id + 'M').value, y } : {}; };
const hpSet = (id, o) => { o = o || {}; $(id + 'D').value = o.d || ''; $(id + 'M').value = o.m || ''; $(id + 'Y').value = o.y || ''; };
const hpKey = o => o && o.y ? o.y + '-' + pad2(o.m) + '-' + pad2(o.d) : '';

$('ssPeriod').addEventListener('change', e => {
  if (e.target.checked) document.querySelectorAll('#ssPeriod input').forEach(i => { if (i !== e.target) i.checked = false; });
});

async function loadSgs(silent) {
  if (!SGS.length) { const c = cacheGet('sgs'); if (c) SGS = c; }
  renderSgs();
  try {
    const out = await api('getSgs');
    SGS = out.data || []; cacheSet('sgs', SGS); renderSgs();
  } catch (e) { if (!silent) toast(e.message, false); }
}
function ssOpenList() { show('ssListView'); loadSgs(); if (!SGH.length) loadSgh(true); }

function renderSgs() {
  if (!SGS.length) { $('ssBody').innerHTML = '<tr><td colspan="6" class="empty">لا توجد خلاصات محفوظة</td></tr>'; return; }
  $('ssBody').innerHTML = SGS.map((r, i) => {
    const id = esc(r.id), d = r.data || {};
    const range = (d.from && d.from.y) || (d.to && d.to.y) ? sgHTxt(d.from) + ' — ' + sgHTxt(d.to) : '—';
    return '<tr><td>' + (i + 1) + '</td><td>' + (esc([r.sem, r.year && arD(r.year) + 'هـ'].filter(Boolean).join(' / ')) || '—') + '</td><td>' + range + '</td><td>' +
      (esc(arD(r.visitNo)) || '—') + '</td><td>' + ((d.rows || []).length) + '</td>' +
      '<td><div class="act">' + sBtn('عرض', 'ssOpen(\'' + id + '\')') + sBtn('طباعة', 'ssDo(\'' + id + '\', this, \'print\')') +
      sBtn('PDF', 'ssDo(\'' + id + '\', this, \'pdf\')') + sBtn('مشاركة', 'ssDo(\'' + id + '\', this, \'share\')') +
      sBtn('تعديل', 'ssEditRec(\'' + id + '\')') + sBtn('حذف', 'ssDel(\'' + id + '\')', 'danger') + '</div></td></tr>';
  }).join('');
}
const ssById = id => SGS.find(r => r.id === id);
function ssOpen(id) { const r = ssById(id); if (r) sgView(r); }
function ssDo(id, btn, what) { const r = ssById(id); if (!r) return; what === 'pdf' ? sgPdf(r, btn) : what === 'share' ? sgShare(r, btn) : sgPrint(r, btn); }
async function ssDel(id) {
  if (!confirm('هل تريدين حذف هذه الخلاصة؟')) return;
  SGS = SGS.filter(r => r.id !== id);
  cacheSet('sgs', SGS); renderSgs();
  try { await api('deleteSgs', { id }); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); loadSgs(); }
}

/* ---------- بنود المعلمات ---------- */
function ssRowHtml(r) {
  r = r || {};
  const opts = '<option value="">اختاري</option>' + SS_ATT.map(x => '<option' + (r.att === x ? ' selected' : '') + '>' + x + '</option>').join('');
  const centers = '<option value="">اختاري المركز</option>' + (LISTS.centers || []).map(x => '<option' + (r.center === x ? ' selected' : '') + '>' + esc(x) + '</option>').join('') +
    (r.center && (LISTS.centers || []).indexOf(r.center) < 0 ? '<option selected>' + esc(r.center) + '</option>' : '');
  return '<div class="id-row"><div class="id-row-h"><b>معلمة</b><button type="button" class="btn danger" onclick="ssRowDel(this)">حذف</button></div>' +
    '<div class="row2"><div><label>اسم المركز</label><select data-k="center">' + centers + '</select></div>' +
    '<div><label>اسم المعلمة</label><input data-k="teacher" list="sgTeachers" autocomplete="off" value="' + esc(r.teacher) + '"></div></div>' +
    '<label>الملاحظات التي تم رصدها</label><textarea data-k="notes" rows="2">' + esc(r.notes) + '</textarea>' +
    '<div class="row2"><div><label>حضور مادة أم قرآن أم كليهما</label><select data-k="att">' + opts + '</select></div>' +
    '<div><label>مستوى أداء المعلمة بالدرجة</label><input data-k="score" inputmode="decimal" value="' + esc(r.score) + '"></div></div></div>';
}
function ssNum() { [...$('ssRows').children].forEach((el, i) => { el.querySelector('.id-row-h b').textContent = 'المعلمة ' + arD(i + 1); }); }
function ssAddRow(r) { $('ssRows').insertAdjacentHTML('beforeend', ssRowHtml(r)); ssNum(); }
function ssRowDel(btn) {
  const row = btn.closest('.id-row');
  if ($('ssRows').children.length < 2) { row.querySelectorAll('input,textarea,select').forEach(x => x.value = ''); return; }
  row.remove(); ssNum();
}
function ssRowsSet(rows) { $('ssRows').innerHTML = ''; (rows && rows.length ? rows : [{}]).forEach(ssAddRow); }
const ssRowsGet = () => [...$('ssRows').children].map(el => {
  const o = {}; el.querySelectorAll('[data-k]').forEach(x => { o[x.dataset.k] = x.value.trim(); });
  o.score = (o.score || '').replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
  return o;
}).filter(o => o.center || o.teacher || o.notes || o.att || o.score);

// استيراد المعلمات من تقارير الزيارة المحفوظة خلال الفترة (المركز، المعلمة، والتوصيات كملاحظات)
async function ssImport() {
  const from = hpKey(hpGet('ssFrom')), to = hpKey(hpGet('ssTo'));
  if (!from || !to) return toast('اختاري الفترة من وإلى أولاً', false);
  if (!SGH.length) await loadSgh(true);
  const per = periodGet('ssPeriod');
  const L = SGH.filter(r => { const k = sgHKey(r); return k && k >= from && k <= to && (!per || String(r.period || '').indexOf(per) > -1); })
    .sort((a, b) => sgHKey(a).localeCompare(sgHKey(b)));
  if (!L.length) return toast('لا توجد تقارير زيارة محفوظة خلال هذه الفترة', false);
  const cur = ssRowsGet();
  const have = new Set(cur.map(r => sgNorm(r.teacher) + '|' + r.center));
  const add = [];
  L.forEach(r => {
    const k = sgNorm(r.teacher) + '|' + r.center;
    const notes = String(r.recs || '').split('\n').map(x => x.trim()).filter(Boolean).join('\n');
    const ex = add.find(x => sgNorm(x.teacher) + '|' + x.center === k);
    if (ex) { if (notes) ex.notes = [ex.notes, notes].filter(Boolean).join('\n'); return; }
    if (have.has(k)) return;
    add.push({ center: r.center, teacher: r.teacher, notes, att: '', score: '' });
  });
  if (!add.length) return toast('كل معلمات الفترة موجودات في الجدول');
  ssRowsSet(cur.concat(add));
  toast('تمت إضافة ' + add.length + ' معلمة، أكملي الحضور والدرجة');
}

/* ---------- فتح / تعديل / حفظ ---------- */
function ssFill(r) {
  r = r || {};
  const d = r.data || {}, edit = !!r.id;
  document.querySelectorAll('#ssForm [data-edit]').forEach(x => x.classList.toggle('hidden', !edit));
  $('ssSem').value = r.sem || ''; $('ssYear').value = r.year || ((idHParts(new Date()) || {}).y || '');
  hpSet('ssFrom', d.from); hpSet('ssTo', d.to);
  $('ssVisitNo').value = r.visitNo || '';
  periodSet('ssPeriod', r.period);
  ssRowsSet(d.rows);
  $('ssSupName').value = edit ? (r.supName || '') : myName();
  hdSet('ss', edit ? r : null);
  ssSupW.reset();
  if (edit && d.sigs && d.sigs.sup) ssSupW.keepOld('الإبقاء على التوقيع السابق');
}
function ssNew() { ssEdit = null; ssFill(null); show('ssForm'); }
function ssEditRec(id) { const r = ssById(id); if (!r) return; ssEdit = r; ssFill(r); show('ssForm'); }
function ssBack() { ssEdit = null; show('ssListView'); renderSgs(); }

async function ssSave(btn) {
  const hd = hdGet('ss');
  if (!/^\d{4}$/.test(hd.hy)) return toast('اكتبي سنة التاريخ الهجري (مثال: 1448)', false);
  const req = {
    id: ssEdit ? ssEdit.id : '', sem: $('ssSem').value, year: $('ssYear').value.trim(),
    visitNo: $('ssVisitNo').value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)), period: periodGet('ssPeriod'),
    supName: $('ssSupName').value.trim(), date: hd.greg,
    data: { rows: ssRowsGet(), from: hpGet('ssFrom'), to: hpGet('ssTo'), hd: hd.hd, hm: hd.hm, hy: hd.hy, dayName: hd.dayName }
  };
  if (!req.sem) return toast('اختاري الفصل الدراسي', false);
  if (!req.data.rows.length) return toast('أضيفي معلمة واحدة على الأقل', false);
  const v = ssSupW.get();
  req.sigs = { sup: v || (ssEdit && ssEdit.data && ssEdit.data.sigs && ssEdit.data.sigs.sup ? 'keep' : '') };
  setBtnBusy(btn, true);
  try {
    const res = await api('saveSgs', req);
    ssSupW.commit();
    toast(ssEdit ? 'تم حفظ التعديل' : 'تم حفظ الخلاصة');
    const rec = { id: res.id, kind: 'sum', sem: req.sem, year: req.year, visitNo: req.visitNo, period: req.period, supName: req.supName,
      date: req.date, at: ssEdit ? ssEdit.at : '', data: Object.assign({}, req.data, { sigs: res.sigs || {} }) };
    SGS = SGS.filter(r => r.id !== rec.id); SGS.unshift(rec);
    cacheSet('sgs', SGS);
    ssEdit = null;
    show('ssListView'); renderSgs();
    loadSgs(true);
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
  else if (last === 'ssListView' || last === 'ssForm') ssOpenList();
  else { show('homeView'); loadSgh(true); }
})();
