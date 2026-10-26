/* ===== صفحة مشرفات وحدة تحفيظ الصغار (sighar.html) — على نمط صفحة الإشراف الإداري ===== */
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const $ = id => document.getElementById(id);
const VIEW_KEY = 'sgh_view', NAME_KEY = 'sgh_name';
let LISTS = { centers: [], types: [], teachers: [], typesSgh: [] };
let VISITS = [], SGH = [], sgEdit = null, SGS = [], ssEdit = null, SGE = [], seEdit = null, seType = '';

const ALL_VIEWS = ['loginView', 'homeView', 'visitsView', 'mcView', 'sgListView', 'sgForm', 'ssListView', 'ssForm', 'seListView', 'seForm', 'mnListView', 'mnForm', 'atView'];

function show(id) {
  ALL_VIEWS.forEach(v => { const el = $(v); if (el) el.classList.add('hidden'); });
  $(id).classList.remove('hidden');
  if (id !== 'loginView') try { sessionStorage.setItem(VIEW_KEY, id); } catch (e) {}   // آخر صفحة لهذه النافذة فقط: تُنسى عند إغلاق الموقع
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
    loadTDir();
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
  try { sessionStorage.removeItem(VIEW_KEY); } catch (e) {}
  cacheClear(); clearMySigLocal(); sigRefreshAll();
  VISITS = []; SGH = []; SGS = []; SGE = [];
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
    loadTDir();
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
// أنواع الزيارة في كشف الخروج: توجيهية / تقييمية / أخرى (عند «أخرى» تُكتب في خانة وتُحفظ «أخرى: النص»)
const VT_LIST = ['توجيهية', 'تقييمية', 'أخرى'];
function fillTypes() {
  const box = $('vTypeList'); if (!box) return;
  if (box.dataset.built) return;
  box.dataset.built = '1';
  box.innerHTML = VT_LIST.map(t => '<label class="chip"><input type="checkbox" value="' + t + '"><span>' + t + '</span></label>').join('') +
    '<input id="vTypeOther" class="hidden" style="margin-top:8px;flex-basis:100%" placeholder="اكتبي نوع الزيارة" autocomplete="off" maxlength="80">';
  box.addEventListener('change', e => {
    if (e.target.value !== 'أخرى') return;
    $('vTypeOther').classList.toggle('hidden', !e.target.checked);
    if (e.target.checked) $('vTypeOther').focus();
  });
}
const getVTypes = () => [...document.querySelectorAll('#vTypeList input[type=checkbox]:checked')].map(i => i.value === 'أخرى' ? ($('vTypeOther').value.trim() ? 'أخرى: ' + $('vTypeOther').value.trim().replace(/[،,]/g, ' ') : 'أخرى') : i.value);
const clearVTypes = () => { document.querySelectorAll('#vTypeList input[type=checkbox]').forEach(i => i.checked = false); const o = $('vTypeOther'); if (o) { o.value = ''; o.classList.add('hidden'); } };

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
    vSigCell(v) + '</td>' +
    '<td><button class="btn danger vdel" title="حذف" aria-label="حذف" onclick="delVisit(\'' + esc(v.id) + '\')">✕</button></td></tr>').join('');
  vSigLoad(rows, renderVisits);
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
  rcStart();
  if (!L.length) { $('sgBody').innerHTML = rcEmpty(SGH.length ? 'لا توجد نتائج' : 'لا توجد تقارير محفوظة'); return; }
  $('sgBody').innerHTML = L.map((r, i) => {
    const id = esc(r.id);
    return rcCard({ no: arD(i + 1), title: esc(r.teacher) || '—', sub: esc([r.center, r.period].filter(Boolean).join(' — ')),
      meta: [rcM('التاريخ', (esc((r.data && r.data.dayName) || r.day) + ' ' + idHDate(r)).trim()), rcM('رقم الزيارة', esc(arD(r.visitNo))), r.lesson ? rcM('الدرس', esc(r.lesson)) : ''],
      tags: (r.data && r.data.tid ? sgTStatus(r) : '') + scTag('sgh', r.id),
      main: [['عرض', 'sgOpen(\'' + id + '\')'], ['PDF', 'sgDo(\'' + id + '\', this, \'pdf\')'], scAct('sgh', r.id)],
      more: [['🔗 مشاركة', 'sgDo(\'' + id + '\', this, \'share\')'],
        r.data && r.data.tid && !(r.data.sigs && r.data.sigs.tch) ? ['📲 تنبيه المعلمة', 'sgNotifyRec(\'' + id + '\', this)'] : null,
        '-', ['✏️ تعديل', 'sgEditRec(\'' + id + '\')'], ['✕ حذف', 'sgDel(\'' + id + '\')', 'danger']].filter(Boolean) });
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
/* ---------- المعلمة المُرسَل إليها = اسم المعلمة المكتوب في النموذج نفسه (من سجل المعلمات) ----------
   خانة اسم المعلمة قائمة منسدلة بأسماء سجل المعلمات (مع إمكانية الكتابة للبحث). الأسماء المكررة تظهر مرقّمة «الاسم (٢)»،
   وإن كُتب اسم مكرر دون رقم تُحدَّد المعلمة من سجلاتكِ السابقة لنفس الاسم في نفس المركز. */
let T_DIR = null, T_BY_LABEL = {}, T_LABEL_BY_ID = {}, tDirLoading = null, TD_ERR = '';
const tdKey = s => sgNorm(s);
const tdClean = s => String(s || '').replace(/\s*\(\s*[٠-٩0-9]+\s*\)\s*$/, '').trim();
function tdBuild(list) {
  T_DIR = list || []; T_BY_LABEL = {}; T_LABEL_BY_ID = {};
  const count = {}, seen = {};
  T_DIR.forEach(t => { const k = tdKey(t.name); count[k] = (count[k] || 0) + 1; });
  const rows = T_DIR.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(t => {
    const k = tdKey(t.name);
    seen[k] = (seen[k] || 0) + 1;
    const label = count[k] > 1 ? t.name + ' (' + arD(seen[k]) + ')' : t.name;
    T_BY_LABEL[tdKey(label)] = t; T_LABEL_BY_ID[t.id] = label;
    return label;
  });
  $('tDirList').innerHTML = rows.map(l => '<option value="' + esc(l) + '">').join('');
}
function loadTDir(force) {
  if (T_DIR && !force) return Promise.resolve(T_DIR);
  if (tDirLoading) return tDirLoading;
  const c = cacheGet('tdir'); if (c && c.length && !T_DIR) { tdBuild(c); tdRefreshAll(); }
  TD_ERR = '';
  tdRefreshAll();
  tDirLoading = api('teacherDir').then(out => {
    const L = out.data || [];
    if (!L.length) throw new Error('سجل المعلمات فارغ أو لم يُقرأ من شيت الشهادات');
    tdBuild(L); cacheSet('tdir', T_DIR); return T_DIR;
  }).catch(e => { TD_ERR = e.message || 'تعذّر الاتصال بالخادم'; if (!T_DIR) toast('تعذّر تحميل أسماء المعلمات: ' + TD_ERR, false); return T_DIR || []; })
    .finally(() => { tDirLoading = null; tdRefreshAll(); });
  return T_DIR ? Promise.resolve(T_DIR) : tDirLoading;
}
function tdRetry() { T_DIR = null; loadTDir(true); }
// السجلات السابقة المرتبطة بمعلمة (لتمييز الأسماء المكررة حسب المركز)
function tdHist() {
  const out = [], add = (name, center, tid) => { if (tid) out.push({ k: sgNorm(name), c: center, tid }); };
  SGH.concat(SGE).forEach(r => add(r.teacher, r.center, r.data && r.data.tid));
  (typeof STF !== 'undefined' ? STF : []).forEach(r => add(r.teacher, r.center, r.data && r.data.tid));
  SGS.forEach(r => ((r.data && r.data.rows) || []).forEach(x => add(x.teacher, x.center, x.tid)));
  return out;
}
// يرجّع { t, why: 'ok' | 'none' (غير موجودة) | 'dup' (مكررة) | 'empty' | 'loading', n, byCenter }
function tdFind(name, center, pin) {
  const raw = String(name || '').trim();
  if (!raw) return { why: 'empty' };
  if (!T_DIR) return { why: 'loading' };
  const lab = T_BY_LABEL[tdKey(raw)];
  if (lab) return { t: lab, why: 'ok' };
  const k = tdKey(tdClean(raw));
  if (pin) { const p = T_DIR.find(x => x.id === pin && tdKey(x.name) === k); if (p) return { t: p, why: 'ok' }; }
  const L = T_DIR.filter(x => tdKey(x.name) === k);
  if (L.length === 1) return { t: L[0], why: 'ok' };
  if (!L.length) return { why: 'none' };
  if (center) {
    const ids = new Set(tdHist().filter(h => h.k === k && h.c === center && L.some(x => x.id === h.tid)).map(h => h.tid));
    if (ids.size === 1) { const id = [...ids][0]; return { t: L.find(x => x.id === id), why: 'ok', byCenter: true }; }
  }
  return { why: 'dup', n: L.length };
}
function tdHintHtml(res) {
  if (res.why === 'ok') return '<span style="color:#1f7a45">✔ يُرسَل بعد الحفظ إلى: <b>' + esc(res.t.name) + '</b>' + (res.byCenter ? ' <small>(حُدّدت من سجلاتكِ السابقة في هذا المركز)</small>' : '') + '</span>';
  if (res.why === 'dup') return '<span style="color:#a15c00">⚠ يوجد ' + arD(res.n) + ' بهذا الاسم في سجل المعلمات، اختاري الاسم المرقّم الصحيح من القائمة.</span>';
  if (res.why === 'none') return '<span style="color:#a12a2a">✖ الاسم غير موجود في سجل المعلمات، فلن يُرسَل لها. اختاريه من القائمة.</span>';
  if (res.why === 'loading') return TD_ERR && !tDirLoading
    ? '<span style="color:#a12a2a">✖ تعذّر تحميل سجل المعلمات: ' + esc(TD_ERR) + '</span> <button type="button" class="btn light" style="padding:3px 10px;font-size:13px" onclick="tdRetry()">إعادة المحاولة</button>'
    : 'جارِ تحميل سجل المعلمات...';
  return '';
}
// خانات كل نموذج: [اسم المعلمة، المركز، التلميح]
function tdEls(p) {
  if (p === 'sg') return [$('sgTeacher'), $('sgCenter'), $('sgTHint')];
  if (p === 'se') return [$('seF_teacher'), $('seF_center'), $('seTHint')];
  if (p === 'sf') return [$('sfEmp'), $('sfCenter'), $('sfTHint')];
  return [];
}
const tdOf = (input, centerEl) => tdFind(input ? input.value : '', centerEl ? centerEl.value : '', input ? input.dataset.tid : '');
// عند اختيار اسم مرقّم من القائمة: يُكتب الاسم دون الرقم وتُثبَّت المعلمة المختارة
function tdPin(input) {
  if (!input || !T_DIR) return;
  const lab = T_BY_LABEL[tdKey(input.value)];
  if (lab) { input.dataset.tid = lab.id; if (input.value.trim() !== lab.name) input.value = lab.name; return; }
  const pin = input.dataset.tid && T_DIR.find(x => x.id === input.dataset.tid);
  if (pin && tdKey(pin.name) !== tdKey(tdClean(input.value))) delete input.dataset.tid;
}
const tdShow = (input, centerEl, hint) => { if (!hint) return; const h = tdHintHtml(tdOf(input, centerEl)); if (hint._h !== h) { hint._h = h; hint.innerHTML = h; } };
function tdRefresh(p) { const [i, c, h] = tdEls(p); if (i) tdShow(i, c, h); }
function ssRowHint(row) { tdShow(row.querySelector('[data-k="teacher"]'), row.querySelector('[data-k="center"]'), row.querySelector('.ss-th')); }
function tdRefreshAll() { ['sg', 'se', 'sf'].forEach(tdRefresh); document.querySelectorAll('#ssRows .id-row').forEach(ssRowHint); }
// المعلمة المحددة {id,name}، أو null إن كانت الخانة فارغة، أو false إن كان الاسم غير موجود أو مكرراً
function tdResolve(p) { const [i, c] = tdEls(p); const r = tdOf(i, c); return r.why === 'empty' ? null : r.why === 'ok' ? r.t : false; }
// عند فتح سجل محفوظ: تثبيت المعلمة المرتبطة به
function tdSet(p, d) {
  d = d || {};
  const [i] = tdEls(p);
  if (i) { if (d.tid) i.dataset.tid = d.tid; else delete i.dataset.tid; }
  tdRefresh(p);
}
// قبل الحفظ: يرجّع المعلمة، أو '' للحفظ دون إرسال، أو undefined لإلغاء الحفظ
async function tdConfirm(input, centerEl, who) {
  await loadTDir();
  tdPin(input);
  const r = tdOf(input, centerEl);
  if (r.why === 'ok') return r.t;
  if (r.why === 'empty') return '';
  if (r.why === 'dup') { input.focus(); input.scrollIntoView({ block: 'center' }); toast('يوجد أكثر من ' + who + ' بهذا الاسم في سجل المعلمات، اختاري الاسم المرقّم الصحيح من القائمة', false); return undefined; }
  if (r.why === 'loading') return confirm('تعذّر تحميل سجل المعلمات، فلن يُرسَل النموذج الآن. هل تريدين الحفظ دون إرسال؟') ? '' : undefined;
  return confirm('اسم ' + who + ' «' + input.value.trim() + '» غير موجود في سجل المعلمات، فلن يُرسَل لها.\nهل تريدين الحفظ دون إرسال؟\n(للإرسال: اختاري الاسم من القائمة)') ? '' : undefined;
}
['input', 'change'].forEach(ev => document.addEventListener(ev, e => {
  const el = e.target;
  if (!el || !el.closest) return;
  if (el.classList.contains('td-name')) tdPin(el);
  const row = el.closest('#ssRows .id-row');
  if (row) return ssRowHint(row);
  if (el.id === 'sgTeacher' || el.id === 'sgCenter') { tdRefresh('sg'); if (el.id === 'sgTeacher') sgUpdateNo(); }
  else if (el.id === 'seF_teacher' || el.id === 'seF_center') tdRefresh('se');
  else if (el.id === 'sfEmp' || el.id === 'sfCenter') tdRefresh('sf');
}));
// نسخة المعلمة: استمارات التقييم بالملاحظات والتوصيات فقط دون الدرجات، والخلاصة بسطرها فقط دون الدرجة
function sgTeacherCopy(r, t) {
  if (!r) return r;
  if (r.kind === 'eval') return Object.assign({}, r, { score: '', max: '', grade: '', tview: true, data: Object.assign({}, r.data, { sc: [], overall: '' }) });
  if (r.kind === 'sum') {
    const rows = (r.data && r.data.rows) || [];
    const mine = t ? rows.filter(x => (x.tid && x.tid === t.id) || sgNorm(x.teacher) === sgNorm(t.name)) : rows;
    return Object.assign({}, r, { tview: true, data: Object.assign({}, r.data, { rows: mine }) });
  }
  return r;
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
  tdSet('sg', r.data);
  loadTDir();
  delete $('sgCenter').dataset.auto; delete $('sgPeriod').dataset.auto;
  if (!SGE.length) loadSge(true);
  $('sgCenter').value = r.center || '';
  periodSet('sgPeriod', r.period);
  hdSet('sg', edit ? r : null);
  $('sgVisitNo').value = r.visitNo || '';
  $('sgLesson').value = r.lesson || '';
  sgRecsSet(r.recs);
  $('sgSupName').value = edit ? (r.supName || '') : myName();
  $('sgVisitNoHint').textContent = '';
  sgNoTouched = false;
  tdRefresh('sg');
  const has = (r.data && r.data.sigs) || {};
  Object.keys(SGW).forEach(k => { SGW[k].reset(); if (edit && has[k]) SGW[k].keepOld('الإبقاء على التوقيع السابق'); });
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
    supName: $('sgSupName').value.trim(),
    data: { hd: hd.hd, hm: hd.hm, hy: hd.hy, dayName: hd.dayName }
  };
  if (!req.teacher) return toast('اكتبي اسم المعلمة', false);
  if (!req.center) return toast('اختاري المركز', false);
  if (!req.period) return toast('اختاري الفترة (صباحي أو مسائي)', false);
  if (!req.lesson) return toast('اكتبي موضوع الدرس', false);
  if (!req.recs) return toast('اكتبي توصية واحدة على الأقل', false);
  const sgT = await tdConfirm($('sgTeacher'), $('sgCenter'), 'المعلمة');   // المعلمة من اسمها في التقرير نفسه
  if (sgT === undefined) return;
  req.teacher = $('sgTeacher').value.trim();
  req.tid = sgT ? sgT.id : '';
  const oldHas = (sgEdit && sgEdit.data && sgEdit.data.sigs) || {};
  req.sigs = {};
  Object.keys(SGW).forEach(k => { const v = SGW[k].get(); req.sigs[k] = v || (sgEdit && oldHas[k] ? 'keep' : ''); });
  req.sigs.tch = sgEdit && oldHas.tch ? 'keep' : '';   // توقيع المعلمة من حسابها فقط (يبقى السابق كما هو)

  setBtnBusy(btn, true);
  try {
    const res = await api('saveSgh', req);
    SGW.sup.commit();
    AD.done('sgForm', sgEdit && sgEdit.id);
    toast(sgEdit ? 'تم حفظ التعديل' : 'تم حفظ التقرير');
    const rec = Object.assign({}, req, { id: res.id, kind: 'sgh', day: hd.dayName, at: sgEdit ? sgEdit.at : '',
      data: Object.assign({}, req.data, { sigs: res.sigs || {} }, res.tid ? { tid: res.tid, tName: res.tName, tchAt: res.tchAt } : {}) });
    delete rec.sigs; delete rec.tid;
    SGH = SGH.filter(r => r.id !== rec.id); SGH.unshift(rec);
    cacheSet('sgh', SGH);
    sgEdit = null;
    show('sgListView'); renderSgh(); fillTeachers();
    sgAfterSave(sgLinkedResult('التقرير', 'sgh', rec, res));
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
  rcStart();
  if (!SGS.length) { $('ssBody').innerHTML = rcEmpty('لا توجد خلاصات محفوظة'); return; }
  $('ssBody').innerHTML = SGS.map((r, i) => {
    const id = esc(r.id), d = r.data || {};
    const range = (d.from && d.from.y) || (d.to && d.to.y) ? sgHTxt(d.from) + ' — ' + sgHTxt(d.to) : '';
    return rcCard({ no: arD(i + 1), title: 'الفصل ' + (esc(r.sem) || '—') + (r.year ? ' — ' + esc(arD(r.year)) + 'هـ' : ''), sub: esc(r.period || ''),
      meta: [rcM('خلال الفترة', range), rcM('رقم الزيارة', esc(arD(r.visitNo))), rcM('عدد المعلمات', arD((d.rows || []).length))],
      tags: scTag('sgs', r.id),
      main: [['عرض', 'ssOpen(\'' + id + '\')'], ['PDF', 'ssDo(\'' + id + '\', this, \'pdf\')'], scAct('sgs', r.id)],
      more: [['🔗 مشاركة', 'ssDo(\'' + id + '\', this, \'share\')'], '-', ['✏️ تعديل', 'ssEditRec(\'' + id + '\')'], ['✕ حذف', 'ssDel(\'' + id + '\')', 'danger']] });
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
  return '<div class="id-row"><div class="id-row-h"><b>معلمة</b><button type="button" class="btn danger vdel" title="حذف" aria-label="حذف" onclick="ssRowDel(this)">✕</button></div>' +
    '<div class="row2"><div><label>اسم المركز</label><select data-k="center">' + centers + '</select></div>' +
    '<div><label>اسم المعلمة</label><input data-k="teacher" class="td-name" list="tDirList" autocomplete="off" placeholder="اختاري من سجل المعلمات" value="' + esc(r.teacher) + '"' + (r.tid ? ' data-tid="' + esc(r.tid) + '"' : '') + '><div class="id-hint ss-th"></div></div></div>' +
    '<label>الملاحظات التي تم رصدها</label><textarea data-k="notes" rows="2">' + esc(r.notes) + '</textarea>' +
    '<div class="row2"><div><label>حضور مادة أم قرآن أم كليهما</label><select data-k="att">' + opts + '</select></div>' +
    '<div><label>مستوى أداء المعلمة بالدرجة</label><input data-k="score" inputmode="decimal" value="' + esc(r.score) + '"></div></div></div>';
}
function ssNum() { [...$('ssRows').children].forEach((el, i) => { el.querySelector('.id-row-h b').textContent = 'المعلمة ' + arD(i + 1); }); }
function ssAddRow(r) { $('ssRows').insertAdjacentHTML('beforeend', ssRowHtml(r)); ssNum(); ssRowHint($('ssRows').lastElementChild); }
function ssRowDel(btn) {
  const row = btn.closest('.id-row');
  if ($('ssRows').children.length < 2) { row.querySelectorAll('input,textarea,select').forEach(x => x.value = ''); return; }
  row.remove(); ssNum();
}
function ssRowsSet(rows) { $('ssRows').innerHTML = ''; (rows && rows.length ? rows : [{}]).forEach(ssAddRow); }
const ssRowsGet = () => [...$('ssRows').children].map(el => {
  const o = {}; el.querySelectorAll('[data-k]').forEach(x => { o[x.dataset.k] = x.value.trim(); });
  o.score = (o.score || '').replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
  const ti = el.querySelector('[data-k="teacher"]'), r = tdOf(ti, el.querySelector('[data-k="center"]'));
  o.tid = r.why === 'ok' ? r.t.id : (r.why === 'loading' ? (ti.dataset.tid || '') : '');   // المعلمة في سجل المعلمات (لإرسال سطرها إليها)
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
    add.push({ center: r.center, teacher: r.teacher, notes, att: '', score: '', tid: (r.data && r.data.tid) || '' });
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
  loadTDir();
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
  // المعلمات المُرسَل إليهن: من أسمائهن في الجدول
  await loadTDir();
  [...$('ssRows').children].forEach(el => tdPin(el.querySelector('[data-k="teacher"]')));
  req.data.rows = ssRowsGet();
  const chk = [...$('ssRows').children].map(el => ({ el, r: tdOf(el.querySelector('[data-k="teacher"]'), el.querySelector('[data-k="center"]')), name: el.querySelector('[data-k="teacher"]').value.trim() })).filter(x => x.name);
  const dup = chk.find(x => x.r.why === 'dup');
  if (dup) { dup.el.scrollIntoView({ block: 'center' }); return toast('«' + dup.name + '» مكرر في سجل المعلمات، اختاري الاسم المرقّم الصحيح من القائمة', false); }
  const miss = chk.filter(x => x.r.why === 'none' || x.r.why === 'loading').map(x => x.name);
  if (miss.length && !confirm('لن تُرسَل الخلاصة لهؤلاء لأن أسماءهن غير موجودة في سجل المعلمات:\n' + miss.join('\n') + '\n\nهل تريدين الحفظ؟')) return;
  const v = ssSupW.get();
  req.sigs = { sup: v || (ssEdit && ssEdit.data && ssEdit.data.sigs && ssEdit.data.sigs.sup ? 'keep' : '') };
  setBtnBusy(btn, true);
  try {
    const res = await api('saveSgs', req);
    ssSupW.commit();
    AD.done('ssForm', ssEdit && ssEdit.id);
    toast(ssEdit ? 'تم حفظ التعديل' : 'تم حفظ الخلاصة');
    const rec = { id: res.id, kind: 'sum', sem: req.sem, year: req.year, visitNo: req.visitNo, period: req.period, supName: req.supName,
      date: req.date, at: ssEdit ? ssEdit.at : '', data: Object.assign({}, req.data, { sigs: res.sigs || {} }) };
    SGS = SGS.filter(r => r.id !== rec.id); SGS.unshift(rec);
    cacheSet('sgs', SGS);
    ssEdit = null;
    // إرسال كل معلمة سطرها فقط (للاطلاع)
    const groups = [];
    rec.data.rows.forEach(x => {
      const t = x.tid && T_DIR && T_DIR.find(y => y.id === x.tid); if (!t) return;
      const g = groups.find(y => y.t.id === t.id); if (g) g.rows.push(x); else groups.push({ t, rows: [x] });
    });
    const out = { what: 'الخلاصة', src: 'sgs', id: rec.id, sent: [], skipped: [], failed: [], none: miss };
    if (groups.length) {
      let sigs = {};
      try { sigs = await sgLoadSigs(rec); } catch (e) {}
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        btn.innerHTML = '<span class="spin"></span> جارِ الإرسال للمعلمات ' + arD(i + 1) + ' من ' + arD(groups.length) + '...';
        const fileRec = Object.assign({}, rec, { tview: true, data: Object.assign({}, rec.data, { rows: g.rows }) });
        await sgPushInto(out, 'sgs', rec.id, SGS_TITLE + ' — ' + g.t.name, g.t, 'ack', fileRec, sigs);
      }
    }
    show('ssListView'); renderSgs();
    sgAfterSave(out);
    loadSgs(true);
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ======================= استمارات تقييم الأداء الوظيفي (7 استمارات) ======================= */
const seSup = makeSigWidget('seSupW', { saved: true });   // توقيع المشرفة (يمكن حفظه للاستمارات القادمة)
hdBuild('se');
// أزرار اختيار الاستمارة + قائمة التصفية
$('seTypes').innerHTML = SGE_ORDER.map(k => '<button class="tile" onclick="seNew(\'' + k + '\')"><b>' + esc(SGE_FORMS[k].name) + '</b></button>').join('');
$('seFType').innerHTML = '<option value="">كل الاستمارات</option>' + SGE_ORDER.map(k => '<option value="' + k + '">' + esc(SGE_FORMS[k].name) + '</option>').join('');

async function loadSge(silent) {
  if (!SGE.length) { const c = cacheGet('sge'); if (c) SGE = c; }
  renderSge();
  try {
    const out = await api('getSge');
    SGE = out.data || []; cacheSet('sge', SGE); renderSge();
  } catch (e) { if (!silent) toast(e.message, false); }
}
function seOpenList() { show('seListView'); loadSge(); }

function renderSge() {
  const t = $('seFType').value, q = sgNorm($('seFQ').value);
  const L = SGE.filter(r => (!t || (r.data && r.data.form) === t) && (!q || sgNorm(r.teacher + ' ' + r.center).indexOf(q) > -1));
  rcStart();
  if (!L.length) { $('seBody').innerHTML = rcEmpty(SGE.length ? 'لا توجد نتائج' : 'لا توجد استمارات محفوظة'); return; }
  $('seBody').innerHTML = L.map((r, i) => {
    const id = esc(r.id), form = sgeFormOf(r) || {};
    const gr = r.grade || (r.data && r.data.overall) || '';
    return rcCard({ no: arD(i + 1), title: esc(r.teacher) || '—', sub: esc(form.name || r.formName || ''),
      meta: [rcM('المركز', esc(r.center)), rcM('التاريخ', (esc((r.data && r.data.dayName) || '') + ' ' + (r.data && r.data.hy ? idHDate(r) : '')).trim()),
        form.grades ? rcM('الدرجة', sgeFmt(sgeNum(r.score)) + ' / ' + sgeFmt(form.max)) : ''],
      tags: (gr ? gradeTag(gr) : '') + (r.data && r.data.tid ? sgTStatus(r) : '') + scTag('sge', r.id),
      main: [['عرض', 'seOpen(\'' + id + '\')'], ['PDF', 'seDo(\'' + id + '\', this, \'pdf\')'], scAct('sge', r.id)],
      more: [['🔗 مشاركة', 'seDo(\'' + id + '\', this, \'share\')'],
        r.data && r.data.tid && !(r.data.sigs && r.data.sigs.tch) ? ['📲 تنبيه المعلمة', 'sgNotifyRec(\'' + id + '\', this)'] : null,
        '-', ['✏️ تعديل', 'seEditRec(\'' + id + '\')'], ['✕ حذف', 'seDel(\'' + id + '\')', 'danger']].filter(Boolean) });
  }).join('');
}
const seById = id => SGE.find(r => r.id === id);
// «📤 إرسال للمركز»: تقارير المتابعة والخلاصات والاستمارات
const sgScDef = get => ({
  rec: get,
  title: r => sgFileName(r).replace(/_/g, ' '),
  center: r => r.center || '', period: r => r.period || '',
  // للمعلمة: نسخة الاستمارة بالملاحظات والتوصيات فقط، ونسخة الخلاصة بسطرها فقط
  file: async (r, to, t) => ({ blob: await sgPdfBlob(to === 't' ? sgTeacherCopy(r, t) : r), name: sgFileName(r) + '.pdf', mime: 'application/pdf' })
});
scRegister('sgh', sgScDef(id => recById(id)));
scRegister('sgs', sgScDef(id => ssById(id)));
scRegister('sge', sgScDef(id => seById(id)));
function seOpen(id) { const r = seById(id); if (r) sgView(r); }
function seDo(id, btn, what) { const r = seById(id); if (!r) return; what === 'share' ? sgShare(r, btn) : sgPdf(r, btn); }
async function seDel(id) {
  if (!confirm('هل تريدين حذف هذه الاستمارة؟')) return;
  SGE = SGE.filter(r => r.id !== id);
  cacheSet('sge', SGE); renderSge();
  try { await api('deleteSge', { id }); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); loadSge(); }
}

/* ---------- بناء الاستمارة حسب نوعها ---------- */
const SE_NUMERIC = ['visitNo', 'total', 'present', 'years'];
function seBuild(k, r) {
  const form = SGE_FORMS[k], d = (r && r.data) || {}, f = d.f || {};
  seType = k;
  $('seTitle').textContent = form.title;
  $('seTchLbl').textContent = 'توقيع ' + form.who;
  // خانات الرأس
  // شبكة مضغوطة: ثلاث خانات في الصف على الشاشة الكبيرة، وخانتان على الجوال (الخانات الطويلة بعرض الصف)
  const SE_WIDE = ['center', 'teacher', 'period', 'lesson', 'subject'];
  $('seFields').innerHTML = form.fields.map(([key, lbl]) => '<div class="se-fld' + (SE_WIDE.indexOf(key) > -1 ? ' wide' : '') + '">' + seFieldHtml(key, lbl) + '</div>').join('');
  function seFieldHtml(key, lbl) {
    if (key === 'center') return '<label for="seF_center">' + lbl + '</label><select id="seF_center"><option value="">اختاري المركز</option>' + (LISTS.centers || []).map(x => '<option>' + esc(x) + '</option>').join('') + '</select>';
    if (key === 'period') return '<label>' + lbl + '</label><div class="chips" id="seF_period"><label class="chip"><input type="checkbox" value="صباحي"><span>صباحي</span></label><label class="chip"><input type="checkbox" value="مسائي"><span>مسائي</span></label></div>';
    if (key === 'teacher') return '<label for="seF_teacher">' + lbl + '</label><input id="seF_teacher" class="td-name" list="tDirList" autocomplete="off" placeholder="اختاري من سجل المعلمات">';
    if (key === 'sem') return '<label for="seF_sem">' + lbl + '</label><select id="seF_sem"><option value="">اختاري</option><option>الأول</option><option>الثاني</option><option>الثالث</option></select>';
    return '<label for="seF_' + key + '">' + lbl + '</label><input id="seF_' + key + '" autocomplete="off"' + (SE_NUMERIC.indexOf(key) > -1 ? ' inputmode="numeric"' : '') + '>';
  }
  const per = $('seF_period');
  if (per) per.addEventListener('change', e => { if (e.target.checked) per.querySelectorAll('input').forEach(i => { if (i !== e.target) i.checked = false; }); });
  // البنود
  const scored = !!form.grades, sc = d.sc || [], nt = d.nt || [];
  // جدول مضغوط مثل ملف الإكسل: صف لكل بند، وخانتا الدرجة والملاحظة داخل الصف
  const cols = scored ? 4 : 2;
  // ترتيب الأعمدة مثل الإكسل: البند | الدرجة | المستحقة | ملاحظات
  let html = '<table class="se-tbl"><colgroup><col>' + (scored ? '<col style="width:42px"><col style="width:58px">' : '') + '<col style="width:' + (scored ? '27%' : '38%') + '"></colgroup>' +
    '<thead><tr><th>بنود التقييم</th>' + (scored ? '<th>الدرجة</th><th>المستحقة</th>' : '') + '<th>ملاحظات</th></tr></thead><tbody>', g = null;
  form.items.forEach((it, i) => {
    if (it.g && it.g !== g) { g = it.g; html += '<tr class="se-g"><td colspan="' + cols + '">' + esc(it.g) + '</td></tr>'; }
    html += '<tr class="se-it" data-i="' + i + '"><td class="se-q">' + (it.g ? '' : '<b>' + arD(i + 1) + '.</b> ') + esc(it.t) + '</td>' +
      (scored ? '<td class="se-max">' + sgeFmt(it.m) + '</td><td class="ev-sc"><input class="se-sc" inputmode="decimal" value="' + esc(sc[i] || '') + '"></td>' : '') +
      '<td class="se-ntc"><textarea class="se-nt" rows="1" placeholder="—">' + esc(nt[i] || '') + '</textarea></td></tr>';
  });
  html += '</tbody></table>';
  $('seItems').innerHTML = html;
  $('seOverallBox').classList.toggle('hidden', scored);
  $('seOverall').value = d.overall || '';
  $('seBar').classList.toggle('hidden', !scored);
  $('seMax').textContent = scored ? sgeFmt(form.max) : '';
  // التوصيات
  $('seRecs').innerHTML = form.recs.map((lbl, i) => '<label for="seR' + i + '"' + (i ? '' : ' style="margin-top:0"') + '>' + esc(lbl) + '</label><textarea id="seR' + i + '" rows="4">' + esc((d.recs && d.recs[i]) || '') + '</textarea>').join('');
  seCalc();
}
$('seItems').addEventListener('input', e => { if (e.target.classList.contains('se-sc')) seCalc(); });
function seScores() { return [...document.querySelectorAll('#seItems .se-sc')].map(x => x.value.trim()); }
function seCalc() {
  const form = SGE_FORMS[seType]; if (!form || !form.grades) return;
  const sc = seScores();
  document.querySelectorAll('#seItems .se-it').forEach((el, i) => { const v = sgeNum(sc[i]); el.classList.toggle('bad', v != null && (v < 0 || v > form.items[i].m)); });
  const t = sgeTotal(form, sc);
  $('seSum').textContent = sgeFmt(t);
  setGrade($('seGrade'), sc.some(x => x !== '') ? sgeGradeOf(form, t) : '—');
}



function seFill(k, r) {
  r = r || {};
  const edit = !!r.id, d = r.data || {}, f = d.f || {};
  document.querySelectorAll('#seForm [data-edit]').forEach(x => x.classList.toggle('hidden', !edit));
  seBuild(k, r);
  $('seF_center').value = r.center || '';
  if ($('seF_period')) periodSet('seF_period', r.period);
  $('seF_teacher').value = r.teacher || '';
  SGE_FORMS[k].fields.forEach(([key]) => { if (['center', 'period', 'teacher'].indexOf(key) < 0 && $('seF_' + key)) $('seF_' + key).value = f[key] || ''; });
  hdSet('se', edit ? r : null);
  tdSet('se', d);
  loadTDir();
  if (!SGH.length) loadSgh(true);
  $('seSupName').value = edit ? (d.supName || r.supName || '') : (d.supName || myName());
  const has = d.sigs || {};
  seSup.reset(); if (edit && has.sup) seSup.keepOld('الإبقاء على التوقيع السابق');
}
function seNew(k) { seEdit = null; seFill(k, null); show('seForm'); }
function seEditRec(id) { const r = seById(id); if (!r) return; seEdit = r; seFill(r.data.form, r); show('seForm'); }
function seBack() { seEdit = null; show('seListView'); renderSge(); }

async function seSave(btn) {
  const form = SGE_FORMS[seType]; if (!form) return;
  const hd = hdGet('se');
  if (!/^\d{4}$/.test(hd.hy)) return toast('اكتبي سنة التاريخ الهجري (مثال: 1448)', false);
  const f = {};
  form.fields.forEach(([key]) => { if (['center', 'period', 'teacher'].indexOf(key) < 0 && $('seF_' + key)) f[key] = $('seF_' + key).value.trim().replace(/[٠-٩]/g, x => SE_NUMERIC.indexOf(key) > -1 ? '٠١٢٣٤٥٦٧٨٩'.indexOf(x) : x); });
  const sc = form.grades ? seScores() : [];
  if (form.grades) {
    const bad = form.items.findIndex((it, i) => { const v = sgeNum(sc[i]); return sc[i] !== '' && (v == null || v < 0 || v > it.m); });
    if (bad > -1) { toast('درجة البند ' + arD(bad + 1) + ' يجب أن تكون بين ٠ و ' + sgeFmt(form.items[bad].m), false); document.querySelectorAll('#seItems .se-it')[bad].scrollIntoView({ block: 'center' }); return; }
    const empty = sc.filter(x => x === '').length;
    if (empty && !confirm('توجد ' + arD(empty) + ' بنود بدون درجة (تُحسب صفراً). هل تريدين الحفظ؟')) return;
  }
  const total = form.grades ? sgeTotal(form, sc) : null;
  const req = {
    id: seEdit ? seEdit.id : '', teacher: $('seF_teacher').value.trim(), center: $('seF_center').value,
    period: $('seF_period') ? periodGet('seF_period') : '', date: hd.greg, supName: $('seSupName').value.trim(),
    score: total == null ? '' : String(Math.round(total * 100) / 100), max: form.max ? String(form.max) : '', grade: form.grades ? sgeGradeOf(form, total) : $('seOverall').value,
    data: { form: seType, f, sc, nt: [...document.querySelectorAll('#seItems .se-nt')].map(x => x.value.trim()),
      recs: form.recs.map((_, i) => $('seR' + i).value.trim()), overall: form.grades ? '' : $('seOverall').value,
      hd: hd.hd, hm: hd.hm, hy: hd.hy, dayName: hd.dayName }
  };
  if (!req.teacher) return toast('اكتبي اسم المعلمة', false);
  if (!req.center) return toast('اختاري المركز', false);
  if (!form.grades && !req.grade) return toast('اختاري التقدير العام', false);
  if (!req.supName) return toast('اكتبي اسم المشرفة', false);
  const seT = await tdConfirm($('seF_teacher'), $('seF_center'), form.who || 'المعلمة');   // المعلمة من اسمها في الاستمارة نفسها
  if (seT === undefined) return;
  req.teacher = $('seF_teacher').value.trim();
  req.tid = seT ? seT.id : '';
  const oldHas = (seEdit && seEdit.data && seEdit.data.sigs) || {};
  req.sigs = {};
  { const v = seSup.get(); req.sigs.sup = v || (seEdit && oldHas.sup ? 'keep' : ''); }
  req.sigs.tch = seEdit && oldHas.tch ? 'keep' : '';   // توقيع المعلمة من حسابها فقط (يبقى السابق كما هو)
  if (!req.sigs.sup) return toast('وقّعي توقيع المشرفة', false);
  setBtnBusy(btn, true);
  try {
    const res = await api('saveSge', req);
    seSup.commit();
    AD.clear('seForm', seEdit ? seEdit.id : 'new-' + seType);
    toast(seEdit ? 'تم حفظ التعديل' : 'تم حفظ الاستمارة');
    const rec = { id: res.id, kind: 'eval', formName: form.name, teacher: req.teacher, center: req.center, period: req.period, date: req.date,
      score: req.score, max: req.max, grade: req.grade, supName: req.supName, at: seEdit ? seEdit.at : '', visitNo: req.data.f.visitNo || '',
      data: Object.assign({}, req.data, { supName: req.supName, sigs: res.sigs || {} }, res.tid ? { tid: res.tid, tName: res.tName, tchAt: res.tchAt } : {}) };
    SGE = SGE.filter(r => r.id !== rec.id); SGE.unshift(rec);
    cacheSet('sge', SGE);
    seEdit = null;
    show('seListView'); renderSge(); loadSge(true);
    sgAfterSave(sgLinkedResult('الاستمارة', 'sge', rec, res));
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- تعبئة المركز والفترة تلقائياً من آخر تقرير/استمارة سُجّلت للمعلمة ----------
   تُعبّأ الخانة فقط إن كانت فارغة أو عُبّئت تلقائياً من قبل (لا يُستبدل ما اختارته المشرفة بنفسها). */
function tdLastFor(name, tid) {
  const k = sgNorm(name);
  if (!k && !tid) return null;
  const all = (SGH.length ? SGH : (cacheGet('sgh') || [])).concat(SGE.length ? SGE : (cacheGet('sge') || []));
  let best = null, bestKey = '';
  all.forEach(r => {
    const d = r.data || {};
    if (!r.center) return;
    if (!((tid && d.tid === tid) || (k && sgNorm(r.teacher) === k))) return;
    const key = (sgHKey(r) || '0000') + ' ' + (r.at || '');
    if (!best || key > bestKey) { best = r; bestKey = key; }
  });
  return best;
}
function tdAutoFill(p) {
  const isSg = p === 'sg';
  const nameEl = isSg ? $('sgTeacher') : $('seF_teacher');
  const cEl = isSg ? $('sgCenter') : $('seF_center');
  const perId = isSg ? 'sgPeriod' : 'seF_period';
  if (!nameEl || !cEl) return;
  const t = tdResolve(p);
  const last = tdLastFor(nameEl.value, t ? t.id : '');
  const hint = $(p + 'AutoHint');
  if (!last) { if (hint) hint.textContent = ''; return; }
  let filled = [];
  if ((!cEl.value || cEl.dataset.auto === '1') && [...cEl.options].some(o => o.value === last.center)) {
    if (cEl.value !== last.center) filled.push('المركز');
    cEl.value = last.center; cEl.dataset.auto = '1';
  }
  const per = $(perId);
  if (per && last.period && (!periodGet(perId) || per.dataset.auto === '1')) {
    if (periodGet(perId) !== last.period) filled.push('الفترة');
    periodSet(perId, last.period); per.dataset.auto = '1';
  }
  if (hint) hint.textContent = filled.length ? 'عُبّئ ' + filled.join(' و') + ' تلقائياً من آخر سجل لهذه المعلمة (يمكن التغيير).' : '';
  if (isSg) sgUpdateNo();
}
// عند اختيار المشرفة المركز أو الفترة بنفسها لا تُستبدل تلقائياً بعد ذلك
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'sgCenter' || el.id === 'seF_center') delete el.dataset.auto;
  const per = el.closest && el.closest('#sgPeriod, #seF_period');
  if (per) delete per.dataset.auto;
  if (el.id === 'sgTeacher') tdAutoFill('sg');
  if (el.id === 'seF_teacher') tdAutoFill('se');
});

/* ======================= تنبيه المعلمة بعد إرسال التقرير/الاستمارة (مثل تقرير الزيارة في نظام المقاصف) =======================
   بعد الحفظ تظهر رسالة: «أُرسل للمعلمة ...» مع زر يفتح محادثتها في واتساب برسالة تنبيه جاهزة فيها رابط أيقونة «المعلمات». */
function sgTWaPhone(v) {
  let d = String(v || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '');
  if (d.indexOf('00966') === 0) d = d.slice(5); else if (d.indexOf('966') === 0) d = d.slice(3);
  if (d.indexOf('0') === 0) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? '966' + d : '';
}
function sgNotifyMsg(rec) {
  const d = rec.data || {};
  const title = sgTitleOf(rec);
  const date = d.hy ? idDigits(d.hd) + ' / ' + idDigits(d.hm) + ' / ' + idDigits(d.hy) + 'هـ' : '';
  const no = rec.visitNo || (d.f && d.f.visitNo) || '';
  const sup = rec.supName || d.supName || '';
  return 'السلام عليكم ورحمة الله وبركاته\n' +
    'الأستاذة/ ' + (d.tName || rec.teacher || '') + ' المحترمة\n' +
    'نفيدكِ بأنه أُرسل إليكِ «' + title + '»' + (no ? ' (رقم الزيارة ' + idDigits(no) + ')' : '') + (date ? ' بتاريخ ' + date : '') +
    '، وهو بانتظار اطّلاعكِ وتوقيعكِ.\n' +
    'يُرجى الدخول إلى منظومة مشرفات ← أيقونة «المعلمات» برقم جوالكِ وكلمة المرور:\n' +
    new URL('teachers.html', location.href).href + '\n' +
    (sup ? 'المشرفة: ' + sup + '\n' : '') +
    'وحدة تحفيظ الصغار — جمعية فرقان';
}
function sgNotifyShow(rec, phone, justSaved) {
  const d = rec.data || {}, name = d.tName || rec.teacher || '';
  const wa = sgTWaPhone(phone);
  const kind = rec.kind === 'eval' ? 'الاستمارة' : 'التقرير';
  const m = $('sgModal'), b = $('sgModalBody');
  b.innerHTML = '<div class="id-send">' +
    (justSaved ? '<div>✅ تم حفظ ' + kind + (rec.kind === 'eval' ? ' وإرسالها' : ' وإرساله') + ' للمعلمة <b>' + esc(name) + '</b>.</div>' : '') +
    '<div>' + (rec.kind === 'eval' ? 'تظهر' : 'يظهر') + ' لها الآن في أيقونة «المعلمات» بانتظار اطّلاعها وتوقيعها.</div>' +
    (wa ? '<div>لتنبيهها: اضغطي الزر لفتح محادثتها في واتساب برسالة تنبيه جاهزة، ثم اضغطي إرسال.</div>' +
          '<a class="btn id-wa" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(sgNotifyMsg(rec)) + '">💬 تنبيه المعلمة في واتساب</a>'
        : '<div style="color:#a12a2a">لا يوجد رقم جوال صحيح للمعلمة في سجل المعلمات، فلا يمكن تنبيهها في واتساب.</div>') +
    '</div>';
  m.classList.remove('hidden');
}
// زر «تنبيه المعلمة» من القائمة (للتقارير المرسلة التي لم توقّع عليها بعد)
async function sgNotifyRec(id, btn) {
  const r = SGH.find(x => x.id === id) || SGE.find(x => x.id === id);
  if (!r || !r.data || !r.data.tid) return toast('هذا السجل غير مرسل لمعلمة، اختاري اسمها من «إرسال للمعلمة» ثم احفظي', false);
  setBtnBusy(btn, true, '...');
  try { const out = await api('teacherPhone', { tid: r.data.tid }); sgNotifyShow(r, out.phone, false); }
  catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}
/* ======================= بعد الحفظ: الإرسال للمعلمة، ثم خيار الإرسال للمديرة =======================
   التقرير والاستمارة: يُربطان بحساب المعلمة عند الحفظ (تطّلع وتوقّع من «المعلمات»).
   الخلاصة وإجراءات الموظفات: تُرسَل نسخة PDF للمعلمة تلقائياً بعد الحفظ (مثل زر «📤 إرسال»).
   المديرة: زر «📤 إرسال للمديرة» يفتح نافذة الإرسال للمركز (اطلاع فقط، أو اطلاع وتوقيع) كما هي. */
function sgWaMsg(name, title, mode) {
  return 'السلام عليكم ورحمة الله وبركاته\n' +
    'الأستاذة/ ' + name + ' المحترمة\n' +
    'نفيدكِ بأنه أُرسل إليكِ «' + title + '»، وهو بانتظار ' + (mode === 'sign' ? 'اطّلاعكِ وتوقيعكِ' : 'اطّلاعكِ') + '.\n' +
    'يُرجى الدخول إلى منظومة مشرفات ← أيقونة «المعلمات» برقم جوالكِ وكلمة المرور:\n' +
    new URL('teachers.html', location.href).href + '\n' +
    (myName() ? 'المشرفة: ' + myName() + '\n' : '') +
    'وحدة تحفيظ الصغار — جمعية فرقان';
}
const SG_HOW = { sign: 'للاطلاع والتوقيع', ack: 'للاطلاع' };
// نتيجة الحفظ للتقرير/الاستمارة المرتبطين بحساب المعلمة
function sgLinkedResult(what, src, rec, res) {
  const out = { what, src, id: rec.id, sent: [], skipped: [], failed: [], none: [] };
  if (!res.tid) { if (rec.teacher) out.none.push(rec.teacher); return out; }
  if (res.tchAt) out.skipped.push({ name: res.tName, st: 'وقّعت عليه سابقاً من حسابها، ويبقى توقيعها بعد التعديل.' });
  else out.sent.push({ name: res.tName, phone: res.tWa, how: SG_HOW.sign, msg: sgNotifyMsg(rec) });
  return out;
}
// إرسال نسخة PDF للمعلمة (لا يُعاد الإرسال إن كانت قد اطّلعت/وقّعت على النسخة السابقة)
async function sgPushInto(out, src, srcId, title, t, mode, fileRec, sigs) {
  try {
    await scLoad(true);
    const prev = (SC_SENT || []).find(x => x.src === src && x.srcId === srcId && x.to === 't' && x.center === t.name);
    if (prev && prev.status !== 'new') {
      out.skipped.push({ name: t.name, st: 'سبق أن ' + (prev.status === 'sign' ? 'وقّعت' : 'اطّلعت') + ' على النسخة المرسلة، فلم تُرسَل مرة أخرى (لإعادة الإرسال: زر «📤 إرسال»).' });
      return;
    }
    const blob = await sgPdfBlob(fileRec, sigs);
    const r = await api('sendCenter', { src, srcId, title, to: 't', center: '', tid: t.id, mode, note: '',
      name: (sgFileName(fileRec) + '_' + t.name).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_') + '.pdf', mime: 'application/pdf', data: await scB64(blob) });
    SC_SENT = (SC_SENT || []).filter(x => x.id !== r.item.id); SC_SENT.unshift(r.item);
    cacheSet('sc_sent', SC_SENT); scPaint();
    out.sent.push({ name: t.name, phone: r.tPhone, how: SG_HOW[mode], again: r.replaced, msg: sgWaMsg(t.name, title, mode) });
  } catch (e) { out.failed.push({ name: t.name, err: e.message || 'تعذّر الإرسال' }); }
}
function sgAfterSave(o) {
  const m = $('sgModal'), b = $('sgModalBody');
  let h = '<div class="id-send"><div><b>✅ تم حفظ ' + o.what + '.</b></div>';
  o.sent.forEach(x => {
    const wa = sgTWaPhone(x.phone);
    h += '<div class="sa-it">✔ ' + (x.again ? 'حُدّثت النسخة المرسلة' : 'أُرسل') + ' للمعلمة <b>' + esc(x.name) + '</b> ' + x.how + '، ويظهر لها في أيقونة «المعلمات».' +
      (wa ? '<br><a class="btn id-wa" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(x.msg) + '">💬 تنبيهها في واتساب</a>'
        : '<br><small style="color:#a12a2a">لا يوجد رقم جوال صحيح لها في سجل المعلمات، فلا يمكن تنبيهها في واتساب.</small>') + '</div>';
  });
  o.skipped.forEach(x => { h += '<div class="sa-it">ℹ️ <b>' + esc(x.name) + '</b>: ' + esc(x.st) + '</div>'; });
  o.failed.forEach(x => { h += '<div class="sa-it" style="color:#a12a2a">✖ تعذّر الإرسال للمعلمة <b>' + esc(x.name) + '</b>: ' + esc(x.err) + ' — أعيدي المحاولة من زر «📤 إرسال».</div>'; });
  if (o.none.length) h += '<div class="sa-it" style="color:#a15c00">⚠ لم يُرسَل لـ: <b>' + o.none.map(esc).join('، ') + '</b> — الاسم غير موجود في سجل المعلمات (اختاريه من القائمة ثم احفظي).</div>';
  h += scMgrBox(o.src, o.id, o.what) + '<div style="margin-top:10px"><button class="btn light" onclick="sgCloseModal()">إغلاق</button></div></div>';
  b.innerHTML = h;
  m.classList.remove('hidden');
}
function sgToMgr(src, id, sign) {
  sgCloseModal();
  scOpen(src, id).then(() => { if (sign) { const x = document.querySelector('#scModal input[name="scMode"][value="sign"]'); if (x) x.checked = true; } });
}
// يُضاف لأزرار القائمة
const sgNotifyBtn = r => (r.data && r.data.tid && !(r.data.sigs && r.data.sigs.tch)) ? sBtn('📲 تنبيه المعلمة', 'sgNotifyRec(\'' + esc(r.id) + '\', this)', 'id-wa') : '';

/* ======================= الحفظ التلقائي (autosave.js) ======================= */
const adHd = p => { const h = hdGet(p); return { hd: h.hd, hm: h.hm, hy: h.hy, dayName: h.dayName }; };
const adWrap = (name, after) => { const o = window[name]; window[name] = function () { const r = o.apply(this, arguments); after.apply(this, arguments); return r; }; };
// تقرير الزيارة
AD.register('sgForm', {
  key: () => sgEdit ? sgEdit.id : 'new',
  collect: () => ({ teacher: $('sgTeacher').value, center: $('sgCenter').value, period: periodGet('sgPeriod'), visitNo: $('sgVisitNo').value, lesson: $('sgLesson').value,
    recs: sgRecsGet(), supName: $('sgSupName').value, data: Object.assign(adHd('sg'), { tid: $('sgTeacher').dataset.tid || '' }) }),
  apply: d => { sgFill(Object.assign({}, sgEdit || {}, d, { data: Object.assign({}, (sgEdit && sgEdit.data) || {}, d.data) })); hdSet('sg', d); },
  reset: () => sgFill(sgEdit)
});
adWrap('sgNew', () => AD.offer('sgForm')); adWrap('sgEditRec', () => AD.offer('sgForm'));
// خلاصة التقارير التعليمية
AD.register('ssForm', {
  key: () => ssEdit ? ssEdit.id : 'new',
  collect: () => ({ sem: $('ssSem').value, year: $('ssYear').value, visitNo: $('ssVisitNo').value, period: periodGet('ssPeriod'), supName: $('ssSupName').value,
    data: Object.assign(adHd('ss'), { rows: ssRowsGet(), from: hpGet('ssFrom'), to: hpGet('ssTo') }) }),
  apply: d => { ssFill(Object.assign({}, ssEdit || {}, d, { data: Object.assign({}, (ssEdit && ssEdit.data) || {}, d.data) })); hdSet('ss', d); },
  reset: () => ssFill(ssEdit)
});
adWrap('ssNew', () => AD.offer('ssForm')); adWrap('ssEditRec', () => AD.offer('ssForm'));
// استمارات التقييم (لكل نوع مسودته)
AD.register('seForm', {
  key: () => seEdit ? seEdit.id : 'new-' + seType,
  collect: () => {
    const form = SGE_FORMS[seType], f = {};
    form.fields.forEach(([key]) => { if (['center', 'period', 'teacher'].indexOf(key) < 0 && $('seF_' + key)) f[key] = $('seF_' + key).value; });
    return { teacher: $('seF_teacher').value, center: $('seF_center').value, period: $('seF_period') ? periodGet('seF_period') : '', supName: $('seSupName').value,
      data: Object.assign(adHd('se'), { form: seType, f, sc: form.grades ? seScores() : [], nt: [...document.querySelectorAll('#seItems .se-nt')].map(x => x.value),
        recs: form.recs.map((_, i) => $('seR' + i).value), overall: $('seOverall').value, tid: $('seF_teacher').dataset.tid || '', supName: $('seSupName').value }) };
  },
  apply: d => { seFill(d.data.form, Object.assign({}, seEdit || {}, d, { data: Object.assign({}, (seEdit && seEdit.data) || {}, d.data) })); hdSet('se', d); seCalc(); },
  reset: () => seFill(seType, seEdit)
});
adWrap('seNew', () => AD.offer('seForm')); adWrap('seEditRec', () => AD.offer('seForm'));

/* ---------- استعادة الجلسة ---------- */
(function init() {
  loadLoginNames('users', 'un', { unit: SG_UNIT });
  if (!getPw() || !getUser()) return;
  let last = null; try { last = sessionStorage.getItem(VIEW_KEY); } catch (e) {}   // عند فتح الموقع من جديد (بعد إغلاقه) تظهر الرئيسية
  preload();
  if (last === 'visitsView') { show('visitsView'); loadVisits(); }
  else if (last === 'sgForm' && AD.has('sgForm')) { sgOpenList(); sgNew(); }
  else if (last === 'ssForm' && AD.has('ssForm')) { ssOpenList(); ssNew(); }
  else if (last === 'mnForm' && AD.has('mnForm')) { mnOpenList(); mnNew(); }
  else if (last === 'seForm' && AD.last() && AD.last().view === 'seForm' && /^new-/.test(AD.last().id)) { seOpenList(); seNew(AD.last().id.slice(4)); }
  else if (last === 'sgListView' || last === 'sgForm') sgOpenList();
  else if (last === 'ssListView' || last === 'ssForm') ssOpenList();
  else if (last === 'seListView' || last === 'seForm') seOpenList();
  else if (last === 'mnListView' || last === 'mnForm') mnOpenList();
  else if (last === 'sfListView' || last === 'sfForm') document.addEventListener('DOMContentLoaded', () => {   // إجراءات الموظفات (sighar-staff.js يُحمَّل بعد هذا الملف)
    sfOpenList();
    const a = AD.last();
    if (last === 'sfForm' && a && a.view === 'sfForm' && /^new-/.test(a.id)) sfNew(a.id.slice(4));
  });
  else { show('homeView'); loadSgh(true); }
})();
