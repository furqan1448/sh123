/* ===== صفحة مشرفات وحدة الإشراف الإداري (idari.html) ===== */
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const $ = id => document.getElementById(id);
const VIEW_KEY = 'idari_view', NAME_KEY = 'idari_name', KIND_KEY = 'idari_kind';
let LISTS = { centers: [], types: [], typesIdari: [] };
let VISITS = [], IDR = [], idKind = 'visit', idEdit = null;

const ALL_VIEWS = ['loginView', 'homeView', 'visitsView', 'idListView', 'mcView', 'idVisitForm', 'idProgramForm', 'idSuggestForm', 'idMonthlyForm', 'idMgrEvalForm', 'idHallsForm', 'atView'];
const FORM_OF = { visit: 'idVisitForm', program: 'idProgramForm', suggest: 'idSuggestForm', monthly: 'idMonthlyForm', mgreval: 'idMgrEvalForm', halls: 'idHallsForm' };
const ID_PFX = { visit: 'iv', program: 'ip', suggest: 'is', monthly: 'im', mgreval: 'me', halls: 'hl' };

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
  if (!p || p.unit === ID_UNIT) return false;
  toast('هذا الحساب من ' + (p.unit || 'وحدة أخرى') + '، جارِ التحويل لصفحتها');
  setTimeout(() => { location.href = p.unit === 'وحدة تحفيظ الصغار' ? 'sighar.html' : 'mushrifat.html'; }, 1200);
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
    loadIdari(true);
    loadDirs();
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
  VISITS = []; IDR = [];
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
  el.innerHTML = /Center$/.test(id) ? centerOpts(arr, ph) : '<option value="">' + esc(ph) + '</option>' + arr.map(x => '<option>' + esc(x) + '</option>').join('');
  if (cur && arr.indexOf(cur) > -1) el.value = cur;
}
function fillLists() {
  ['vCenter', 'ivCenter', 'ipCenter', 'imCenter', 'meCenter', 'hlCenter'].forEach(id => fillSelect(id, centersForMe(), centersPh('اختاري المركز')));
  fillSelect('fCenter', centersForMe(), 'كل المراكز');
  fillTypes();
  fillVStatus();
}
async function preload() {
  loadDirs();
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
function hijriYear() {
  try { return String(parseInt(new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).format(new Date()), 10) || ''); } catch (e) { return ''; }
}
/* ---------- خانات التاريخ الهجري (اليوم + اليوم/الشهر/السنة) مثل تقرير الزيارة في نظام المقاصف ---------- */
const arD = n => idDigits(n);
function hdBuild(p) {
  const opt = (n, a) => '<option value="' + n + '">' + (a ? arD(n) : n) + '</option>';
  let dd = '', mm = '';
  for (let i = 1; i <= 30; i++) dd += opt(i, true);
  for (let i = 1; i <= 12; i++) mm += opt(i, true);
  $(p + 'DateBox').innerHTML =
    '<div class="hd-grid">' +
      '<div><label for="' + p + 'DayN">اليوم</label><select id="' + p + 'DayN">' + DAYS.map(x => '<option>' + x + '</option>').join('') + '</select></div>' +
      '<div><label for="' + p + 'HD">التاريخ: اليوم</label><select id="' + p + 'HD" onchange="hdChanged(\'' + p + '\')">' + dd + '</select></div>' +
      '<div><label for="' + p + 'HM">الشهر</label><select id="' + p + 'HM" onchange="hdChanged(\'' + p + '\')">' + mm + '</select></div>' +
      '<div><label for="' + p + 'HY">السنة</label><input id="' + p + 'HY" inputmode="numeric" maxlength="4" onchange="hdChanged(\'' + p + '\')"></div>' +
    '</div><div class="hd-prev">يظهر في التقرير: <b id="' + p + 'HPrev"></b></div>';
}
// عند تغيير التاريخ الهجري نختار اسم اليوم تلقائياً (ويمكن تعديله)
function hdChanged(p) {
  const g = idHToG($(p + 'HY').value, $(p + 'HM').value, $(p + 'HD').value);
  if (g) $(p + 'DayN').value = dayOf(g);
  hdPrev(p);
  if (p === 'iv') ivUpdateNo();
  if (p === 'im') imUpdateNo();
}
function hdPrev(p) {
  const y = $(p + 'HY').value.trim();
  $(p + 'HPrev').innerHTML = '<span dir="rtl">' + (y ? idHDate({ data: { hd: $(p + 'HD').value, hm: $(p + 'HM').value, hy: y } }) : '—') + '</span>';
}
function hdSet(p, rec) {
  const d = (rec && rec.data) || {};
  let h = d.hd ? { d: +d.hd, m: +d.hm, y: +d.hy } : null;
  if (!h && rec && rec.date) { const q = rec.date.split('-'); h = idHParts(new Date(+q[0], +q[1] - 1, +q[2])); }
  if (!h) h = idHParts(new Date()) || { d: 1, m: 1, y: '' };
  $(p + 'HD').value = h.d; $(p + 'HM').value = h.m; $(p + 'HY').value = h.y;
  const g = idHToG(h.y, h.m, h.d);
  $(p + 'DayN').value = (rec && idDayName(rec)) || (g ? dayOf(g) : DAYS[new Date().getDay()]);
  hdPrev(p);
}
function hdGet(p) {
  const hd = $(p + 'HD').value, hm = $(p + 'HM').value, hy = $(p + 'HY').value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
  return { hd, hm, hy, dayName: $(p + 'DayN').value, greg: idHToG(hy, hm, hd) };
}
['iv', 'ip', 'is', 'im', 'me', 'hl'].forEach(hdBuild);

/* ======================= كشف الخروج (نفس فكرة الإشراف التربوي) ======================= */
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
// أنواع زيارة الإشراف الإداري (العمود D في «القوائم»)، وإن كان فارغاً تُستخدم الأنواع العامة
const vTypes = () => (LISTS.typesIdari && LISTS.typesIdari.length) ? LISTS.typesIdari : (LISTS.types || []);
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

/* ======================= النماذج الثلاثة ======================= */
const SIGW = {
  ivSup: makeSigWidget('ivSupW', { saved: true, none: true }),
  ipSup: makeSigWidget('ipSupW', { saved: true, none: true }),
  isSup: makeSigWidget('isSupW', { saved: true, none: true }),
  imSup: makeSigWidget('imSupW', { saved: true }),
  meSup: makeSigWidget('meSupW', { saved: true }),
  hlSup: makeSigWidget('hlSupW', { saved: true })
};
const SIGS_OF = { visit: { sup: 'ivSup' }, program: { sup: 'ipSup' }, suggest: { sup: 'isSup' }, monthly: { sup: 'imSup' }, mgreval: { sup: 'meSup' }, halls: { sup: 'hlSup' } };
const ID_HINT = {
  visit: '',
  program: 'تخطيط وتنفيذ ونتائج برنامج المشرفة المقيمة، ويُطبع أو يُحمَّل PDF بالكليشة.',
  suggest: 'الاقتراحات والمرئيات والصعوبات التي تواجه المشرفة، وتُسلَّم آخر الفصل الدراسي.',
  mgreval: 'تقييم مديرة المركز من ١٠٠ ببنود الاستمارة، مع توصيات المشرفة، ويُطبع أو يُحمَّل PDF بالكليشة.',
  halls: 'حصر قاعات المركز لكل دور (نوعها، حالتها، عدد الكراسي، الطاقة الاستيعابية)، ويُطبع أو يُحمَّل PDF بالكليشة.',
  monthly: 'متابعة إدارية شهرية للمركز (الهيئة الإدارية، المبنى، السجلات والملفات): استمارة لكل زيارة، وتُطبع أو تُحمَّل PDF بالكليشة.'
};

async function loadIdari(silent) {
  if (!IDR.length) { const c = cacheGet('idari'); if (c) IDR = c; }
  renderIdari();
  try {
    const out = await api('getIdari');
    IDR = out.data || []; cacheSet('idari', IDR); renderIdari();
  } catch (e) { if (!silent) toast(e.message, false); }
}

function idOpenList(kind) {
  idKind = kind;
  localStorage.setItem(KIND_KEY, kind);
  $('idListTitle').textContent = ID_KINDS[kind] === 'برنامج مشرفة مقيمة' ? 'تخطيط وتنفيذ ونتائج لبرنامج مشرفة مقيمة' : ID_KINDS[kind] === 'الاقتراحات والصعوبات' ? 'الاقتراحات والمرئيات – الصعوبات' : ID_KINDS[kind];
  $('idListHint').textContent = ID_HINT[kind] || '';
  $('idListHint').classList.toggle('hidden', !ID_HINT[kind]);
  show('idListView');
  loadIdari();
}

const sBtn = (txt, fn, cls) => '<button class="btn ' + (cls || 'light') + '" style="padding:6px 10px;font-size:13px" onclick="' + fn + '">' + txt + '</button>';
function renderIdari() {
  idStatsRender();
  const L = IDR.filter(r => r.kind === idKind);
  rcStart();
  if (!L.length) { $('idBody').innerHTML = rcEmpty('لا توجد نماذج محفوظة'); return; }
  const cnt = r => ((r.data && (r.data.notes || r.data.rows)) || []).length;
  const short = s => { s = String(s || ''); return s.length > 70 ? s.slice(0, 70) + '…' : s; };
  $('idBody').innerHTML = L.map((r, i) => {
    const id = esc(r.id), d = r.data || {};
    const date = (esc(idDayName(r)) + ' ' + idHDate(r)).trim();
    let title = esc(r.center || '') || '—', sub = r.period ? esc(r.period) : '', meta = [], tags = '';
    if (idKind === 'visit') {
      meta = [rcM('التاريخ', date), rcM('رقم الزيارة', esc(idDigits(r.visitNo))), rcM('عدد البنود', arD(cnt(r)))];
      tags = d.sigs && d.sigs.mgr ? '<span class="tag ok">✔ وقّعت المديرة' + (d.mgrAt ? ' <small>' + esc(d.mgrAt) + '</small>' : '') + '</span>' : '<span class="tag warn">⏳ بانتظار توقيع المديرة</span>';
    } else if (idKind === 'program') meta = [rcM('التاريخ', date), d.content ? esc(short(d.content)) : ''];
    else if (idKind === 'suggest') { title = 'الفصل ' + (esc(r.sem) || '—') + (r.year ? ' — ' + esc(arD(r.year)) + 'هـ' : ''); sub = ''; meta = [rcM('التاريخ', date), rcM('عدد البنود', arD(cnt(r)))]; }
    else if (idKind === 'monthly') { const neg = imNegCount(d); meta = [rcM('التاريخ', date), rcM('رقم الزيارة', esc(idDigits(r.visitNo))), rcM('نوعها', esc(d.vtype || ''))]; tags = neg ? '<span class="tag warn">تحتاج متابعة: ' + arD(neg) + '</span>' : '<span class="tag ok">لا توجد بنود تحتاج متابعة</span>'; }
    else if (idKind === 'mgreval') { const sc = d.sc || []; meta = [rcM('المديرة', esc(r.mgrName || '')), rcM('التاريخ', date)]; if (sc.some(x => meNum(x) != null)) tags = '<span class="tag ok">الدرجة: ' + arD(meTotal(sc)) + ' / ١٠٠</span>'; }
    else if (idKind === 'halls') { const t = hlTotals(d); meta = [rcM('الفصل / العام', esc([r.sem, r.year].filter(Boolean).join(' / '))), rcM('القاعات', arD(t.halls)), rcM('الطاقة الاستيعابية', arD(t.cap))]; }
    return rcCard({ no: arD(i + 1), title, sub, meta, tags: tags + scTag('idari', r.id),
      main: [['عرض', 'idOpen(\'' + id + '\')'], ['PDF', 'idDo(\'' + id + '\', this, \'pdf\')'], scAct('idari', r.id),
        idKind === 'visit' ? ['📲 للمديرة', 'idDo(\'' + id + '\', this, \'send\')', 'id-wa'] : null],
      more: [['🔗 مشاركة', 'idDo(\'' + id + '\', this, \'share\')'], '-', ['✏️ تعديل', 'idEditRec(\'' + id + '\')'], ['✕ حذف', 'idDel(\'' + id + '\')', 'danger']] });
  }).join('');
}
const recById = id => IDR.find(r => r.id === id);
// «📤 إرسال للمركز أو المعلمة» (تقرير الزيارة يصل للمركز تلقائياً أيضاً)
scRegister('idari', {
  rec: recById,
  title: r => (ID_KINDS[r.kind] || 'نموذج') + (r.center ? ' — ' + r.center : '') + ((r.data && r.data.hy) ? ' — ' + idDigits(r.data.hd + '/' + r.data.hm + '/' + r.data.hy) + 'هـ' : ''),
  center: r => r.center, period: r => r.period,
  file: async r => ({ blob: await idPdfBlob(r), name: idFileName(r) + '.pdf', mime: 'application/pdf' }),
  alt: async r => ({ blob: await idXlsxBlob(r), name: idFileName(r) + '.xlsx', mime: DX_MIME })   // نسخة Excel
});
/* ---------- بعد الحفظ: الإرسال للمديرة (اطلاع فقط، أو اطلاع وتوقيع) مثل وحدة تحفيظ الصغار ---------- */
function idAfterSave(rec) {
  const m = $('idModal'), b = $('idModalBody'), visit = rec.kind === 'visit', id = esc(rec.id);
  b.innerHTML = '<div class="id-send"><div><b>✅ تم حفظ ' + (visit ? 'التقرير' : 'النموذج') + '.</b></div>' +
    scMgrBox('idari', rec.id, visit ? 'التقرير (وعند التوقيع يُكتب توقيعها في خانة «مديرة المركز»)' : 'النموذج') +
    '<div style="margin-top:10px">' + (visit ? '<button class="btn id-wa" onclick="idCloseModal(); idDo(\'' + id + '\', this, \'send\')">💬 تنبيهها في واتساب</button> ' : '') +
    '<button class="btn light" onclick="idCloseModal()">إغلاق</button></div></div>';
  m.classList.remove('hidden');
}
function idToMgr(id, sign) {
  idCloseModal();
  scOpen('idari', id).then(() => { if (sign) { const x = document.querySelector('#scModal input[name="scMode"][value="sign"]'); if (x) x.checked = true; } });
}
function idOpen(id) { const r = recById(id); if (r) idView(r); }
function idDo(id, btn, what) { const r = recById(id); if (!r) return; what === 'pdf' ? idPdf(r, btn) : what === 'share' ? idShare(r, btn) : what === 'send' ? idSendMgr(r, btn) : idPrint(r, btn); }
async function idDel(id) {
  if (!confirm('هل تريدين حذف هذا النموذج؟')) return;
  IDR = IDR.filter(r => r.id !== id);
  cacheSet('idari', IDR); renderIdari();
  try { await api('deleteIdari', { id }); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); loadIdari(); }
}

/* ======================= تقرير الزيارة: مثل نظام المقاصف ======================= */
/* ---------- الملاحظات: كل ملاحظة في سطر برقمها ---------- */
// كل سطر: الملاحظة وتوصيتها (v نص الملاحظة، أو { n: الملاحظة، r: التوصية })
function ivAddNote(v) {
  if (typeof v === 'string' || v == null) v = { n: v || '', r: '' };
  const row = document.createElement('div');
  row.className = 'id-note-row';
  row.innerHTML = '<span class="num"></span><div class="iv-nr"><textarea class="iv-n" rows="2" placeholder="الملاحظة"></textarea><textarea class="iv-r" rows="2" placeholder="التوصية"></textarea></div><button type="button" class="x" title="حذف">✕</button>';
  row.querySelector('.iv-n').value = v.n || '';
  row.querySelector('.iv-r').value = v.r || '';
  row.querySelector('.x').onclick = () => {
    if ($('ivNotes').children.length < 2) { row.querySelectorAll('textarea').forEach(t => { t.value = ''; }); return; }
    row.remove(); ivNumNotes();
  };
  $('ivNotes').appendChild(row);
  ivNumNotes();
}
function ivNumNotes() { [...$('ivNotes').children].forEach((el, i) => { el.querySelector('.num').textContent = arD(i + 1); }); }
function ivNotesSet(list) {
  $('ivNotes').innerHTML = '';
  (list && list.length ? list : ['', '']).forEach(ivAddNote);
}
// الأسطر المكتوبة: [{ n, r }]
const ivRowsGet = () => [...$('ivNotes').children].map(row => ({ n: row.querySelector('.iv-n').value.trim(), r: row.querySelector('.iv-r').value.trim() })).filter(x => x.n || x.r);
const ivNotesGet = () => ivRowsGet().map(x => x.n);
const ivRecsGet = () => ivRowsGet().map(x => x.r);
const IV_REC_DEFAULT = '';   // التوصية فارغة، تكتبها المشرفة

/* ---------- الفترة: اختيار واحد (صباحي أو مسائي) ---------- */
$('ivPeriod').addEventListener('change', e => {
  if (e.target.checked) document.querySelectorAll('#ivPeriod input').forEach(i => { if (i !== e.target) i.checked = false; });
  ivCenterChanged();
});
const ivPeriod = () => periodGet('ivPeriod');

/* ---------- أرقام المديرات (ورقة «أرقام المديرات» في الشيت) ---------- */
let DIRS = null;
async function loadDirs() {
  if (!DIRS) { const c = cacheGet('dirs'); if (c) DIRS = c; }
  try {
    const out = await api('getDirectors');
    DIRS = out.data || []; cacheSet('dirs', DIRS);
  } catch (e) { if (!DIRS) DIRS = []; }
}
// مطابقة اسم المركز بين القائمة وورقة المديرات (تتجاهل الهمزات والتشكيل والأقواس والمسافات وكلمة «مركز»)
const ivKey = t => String(t || '').replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/مركز/g, '').replace(/[^\u0621-\u064Aa-z0-9]/gi, '');
function ivDirsFor(center) {
  if (!DIRS || !center) return [];
  const k = ivKey(center);
  let L = DIRS.filter(d => ivKey(d.center) === k);
  if (!L.length) {
    const near = DIRS.filter(d => { const x = ivKey(d.center); return x && (x.indexOf(k) > -1 || k.indexOf(x) > -1); });
    const names = [...new Set(near.map(d => d.center))];
    if (names.length === 1) L = near;
  }
  return L;
}
function ivFillMgr() {
  const st = $('ivMgrStatus'), center = $('ivCenter').value;
  if (!center) { st.textContent = ''; return; }
  const L = ivDirsFor(center);
  if (!L.length) { st.textContent = DIRS && DIRS.length ? 'لا توجد بيانات مديرة لهذا المركز في ورقة «أرقام المديرات»؛ اكتبيها يدوياً.' : ''; return; }
  let per = ivPeriod();
  if (!per) {
    const hasM = L.some(d => !d.evening), hasE = L.some(d => d.evening);
    if (hasM && hasE) { st.textContent = 'لهذا المركز فترتان: اختاري الفترة لتظهر بيانات المديرة.'; return; }
    per = hasE ? 'مسائي' : 'صباحي';
    periodSet('ivPeriod', per);
  }
  const d = L.find(x => x.evening === (per === 'مسائي'));
  if (!d) { $('ivMgrName').value = ''; $('ivMgrPhone').value = ''; st.textContent = 'لا توجد مديرة مسجّلة لهذا المركز في الفترة ' + (per === 'مسائي' ? 'المسائية' : 'الصباحية') + '.'; return; }
  $('ivMgrName').value = d.name || '';
  $('ivMgrPhone').value = d.phone ? '0' + d.phone.slice(3) : '';
  st.textContent = '✔️ المديرة: ' + (d.name || '—') + (d.phone ? '' : ' (بلا رقم جوال)');
}

/* ---------- رقم الزيارة التلقائي: ترتيب الزيارة بين تقاريركِ لنفس المركز ونفس الفترة ---------- */
const pad2 = x => String(x).padStart(2, '0');
function ivHKey(r) {
  const d = (r && r.data) || {};
  if (d.hy && d.hm && d.hd) return d.hy + '-' + pad2(d.hm) + '-' + pad2(d.hd);
  if (r && r.date) { const q = r.date.split('-'); const h = idHParts(new Date(+q[0], +q[1] - 1, +q[2])); if (h) return h.y + '-' + pad2(h.m) + '-' + pad2(h.d); }
  return '';
}
function ivUpdateNo() {
  const hint = $('ivVisitNoHint'), center = $('ivCenter').value, per = ivPeriod();
  if (!center || !per) { hint.textContent = center ? 'اختاري الفترة ليُحسب رقم الزيارة.' : ''; return; }
  const hd = hdGet('iv');
  const cur = /^\d{4}$/.test(hd.hy) ? hd.hy + '-' + pad2(hd.hm) + '-' + pad2(hd.hd) : '9999';
  const selfId = idEdit ? idEdit.id : '';
  const L = IDR.filter(r => r.kind === 'visit' && r.id !== selfId && r.center === center && String(r.period || '').indexOf(per) > -1);
  const before = L.filter(r => ivHKey(r) < cur).length;
  const same = L.some(r => ivHKey(r) === cur);
  const n = before + 1;
  $('ivVisitNo').value = n;
  const pl = per === 'مسائي' ? 'المسائية' : 'الصباحية';
  hint.textContent = (L.length ? 'زياراتكِ السابقة لهذا المركز في الفترة ' + pl + ': ' + arD(before) + '، فهذه الزيارة رقم ' + arD(n) + '.'
    : 'لا توجد زيارات سابقة لهذا المركز في الفترة ' + pl + '، فهذه الزيارة الأولى.') +
    (same ? ' تنبيه: يوجد تقرير آخر لهذا المركز بنفس التاريخ.' : '');
}
function ivCenterChanged() { ivFillMgr(); ivUpdateNo(); }

/* ---------- صفوف الجداول (الاقتراحات) ---------- */
function ivRowHtml(r) {
  r = r || {};
  return '<div class="id-row"><div class="id-row-h"><b>بند</b><button type="button" class="btn danger" onclick="idRowDel(this)">حذف البند</button></div>' +
    '<label>بشأن</label><input data-k="about" autocomplete="off" value="' + esc(r.about) + '">' +
    '<div class="row2"><div><label>الملاحظة</label><textarea data-k="note" rows="2">' + esc(r.note) + '</textarea></div>' +
    '<div><label>التوصية</label><textarea data-k="rec" rows="2">' + esc(r.rec) + '</textarea></div></div></div>';
}
function isRowHtml(r) {
  r = r || {};
  return '<div class="id-row"><div class="id-row-h"><b>بند</b><button type="button" class="btn danger" onclick="idRowDel(this)">حذف البند</button></div>' +
    '<div class="row2"><div><label>الاقتراحات والمرئيات</label><textarea data-k="sug" rows="2">' + esc(r.sug) + '</textarea></div>' +
    '<div><label>الصعوبات التي تواجه المشرفة</label><textarea data-k="dif" rows="2">' + esc(r.dif) + '</textarea></div></div></div>';
}
function idRowsSet(boxId, rows, fn) {
  rows = rows && rows.length ? rows : [{}];
  $(boxId).innerHTML = rows.map(fn).join('');
  idRowsNum(boxId);
}
function idRowsNum(boxId) { [...$(boxId).children].forEach((el, i) => { el.querySelector('.id-row-h b').textContent = 'بند ' + (i + 1); }); }
function isAddRow() { $('isRows').insertAdjacentHTML('beforeend', isRowHtml()); idRowsNum('isRows'); }
function idRowDel(btn) {
  const row = btn.closest('.id-row'), box = row.parentNode;
  if (box.children.length < 2) { row.querySelectorAll('input,textarea').forEach(x => x.value = ''); return; }
  row.remove(); idRowsNum(box.id);
}
function idRowsGet(boxId) {
  return [...$(boxId).children].map(el => {
    const o = {}; el.querySelectorAll('[data-k]').forEach(x => { o[x.dataset.k] = x.value.trim(); }); return o;
  }).filter(o => Object.keys(o).some(k => o[k]));
}
const periodGet = id => [...document.querySelectorAll('#' + id + ' input:checked')].map(i => i.value).join(' / ');
const periodSet = (id, v) => document.querySelectorAll('#' + id + ' input').forEach(i => { i.checked = String(v || '').indexOf(i.value) > -1; });

/* ---------- فتح نموذج جديد / تعديل ---------- */
function idFill(kind, r) {
  r = r || {};
  const d = r.data || {};
  const edit = !!r.id;
  document.querySelectorAll('#' + FORM_OF[kind] + ' [data-edit]').forEach(x => x.classList.toggle('hidden', !edit));
  if (kind === 'visit') {
    selSet('ivCenter', r.center);
    $('ivSem').value = r.sem || ''; $('ivYear').value = r.year || hijriYear();
    periodSet('ivPeriod', r.period);
    hdSet('iv', edit ? r : null); $('ivVisitNo').value = r.visitNo || '';
    $('ivType').value = d.vtype || 'إداري';
    $('ivMgrName').value = r.mgrName || ''; $('ivSupName').value = r.supName || myName();
    $('ivMgrPhone').value = d.mgrPhone || '';
    $('ivMgrStatus').textContent = ''; $('ivVisitNoHint').textContent = '';
    if (Array.isArray(d.notes)) {
      $('ivAbout').value = d.about || '';
      // توصية لكل ملاحظة؛ والتقارير السابقة (توصية واحدة للكل) تظهر توصيتها في السطر الأول
      ivNotesSet(d.notes.map((n, i) => ({ n, r: Array.isArray(d.recs) ? (d.recs[i] || '') : (i === 0 ? (d.recText || '') : '') })));
    } else if (d.rows && d.rows.length) {
      // تقرير قديم (بشأن/ملاحظة/توصية لكل بند): يُحوَّل للتنسيق الجديد عند تعديله
      $('ivAbout').value = '';
      ivNotesSet(d.rows.filter(x => x.about || x.note || x.rec).map(x => ({ n: [x.about, x.note].filter(Boolean).join(' — '), r: x.rec || '' })));
    } else {
      $('ivAbout').value = ''; ivNotesSet([]);
    }
    if (!edit) { loadDirs().then(() => { if (!idEdit) ivCenterChanged(); }); }
  } else if (kind === 'monthly') {
    imFill(r, edit);
  } else if (kind === 'mgreval') {
    meFill(r, edit);
  } else if (kind === 'halls') {
    hlFill(r, edit);
  } else if (kind === 'program') {
    hdSet('ip', edit ? r : null); selSet('ipCenter', r.center);
    ['content', 'plan', 'method', 'tools', 'results', 'ratio'].forEach(k => { $('ip' + k[0].toUpperCase() + k.slice(1)).value = d[k] || ''; });
    $('ipSupName').value = edit ? (r.supName || '') : myName();
  } else {
    $('isSem').value = r.sem || ''; $('isYear').value = r.year || hijriYear();
    periodSet('isPeriod', r.period);
    $('isSupName').value = r.supName || myName(); hdSet('is', edit ? r : null);
    idRowsSet('isRows', d.rows, isRowHtml);
  }
  const has = d.sigs || {};
  Object.keys(SIGS_OF[kind]).forEach(k => {
    const w = SIGW[SIGS_OF[kind][k]];
    w.reset();
    if (edit && has[k]) w.keepOld('الإبقاء على التوقيع السابق');
  });
}
function idNew() { idEdit = null; idFill(idKind, null); show(FORM_OF[idKind]); }
function idEditRec(id) {
  const r = recById(id); if (!r) return;
  idEdit = r; idKind = r.kind; idFill(r.kind, r); show(FORM_OF[r.kind]);
}
function idBack() { idEdit = null; show('idListView'); renderIdari(); }

/* ---------- الحفظ ---------- */
// auto: حفظ تلقائي عند الخروج من النموذج (بدون رسائل التحقق؛ إن كان ناقصاً يبقى مسودة)
let idAutoFail = '';
async function idSave(kind, btn, sendAfter, auto) {
  const fail = m => { if (auto) idAutoFail = m; else toast(m, false); return false; };
  const req = { kind, id: idEdit ? idEdit.id : '' };
  const p = ID_PFX[kind];
  const hd = hdGet(p);
  if (!/^\d{4}$/.test(hd.hy)) return fail('اكتبي سنة التاريخ الهجري (مثال: 1448)', false);
  const dateData = { hd: hd.hd, hm: hd.hm, hy: hd.hy, dayName: hd.dayName };
  req.date = hd.greg;   // الميلادي المقابل (للترتيب والتصفية فقط)
  if (kind === 'visit') {
    Object.assign(req, { center: $('ivCenter').value, sem: $('ivSem').value, year: $('ivYear').value.trim(), period: periodGet('ivPeriod'),
      visitNo: $('ivVisitNo').value.trim(), mgrName: $('ivMgrName').value.trim(), supName: $('ivSupName').value.trim(),
      data: Object.assign({ vtype: $('ivType').value.trim() || 'إداري', 
        about: $('ivAbout').value.trim(), notes: ivNotesGet(), recs: ivRecsGet(), mgrPhone: $('ivMgrPhone').value.trim() }, dateData) });
    if (!req.center) return fail('اختاري اسم المركز', false);
    if (!req.period) return fail('اختاري الفترة (صباحي أو مسائي)', false);
    if (!req.data.notes.some(Boolean)) return fail('اكتبي ملاحظة واحدة على الأقل', false);
  } else if (kind === 'mgreval') {
    Object.assign(req, meCollect(true));
    req.data = Object.assign(req.data, dateData);
    if (!req.center) return fail('اختاري اسم المركز', false);
    if (!req.mgrName) return fail('اكتبي اسم المديرة', false);
    const bad = ME_ITEMS.findIndex((it, i) => { const v = meNum(req.data.sc[i]); return req.data.sc[i] !== '' && (v == null || v < 0 || v > it[2]); });
    if (bad > -1) { if (auto) return fail('درجة غير صحيحة'); toast('درجة «' + ME_ITEMS[bad][1] + '» يجب أن تكون بين ٠ و' + arD(ME_ITEMS[bad][2]), false); document.querySelectorAll('#meItems .me-it')[bad].scrollIntoView({ block: 'center' }); return false; }
    const empty = req.data.sc.filter(x => x === '').length;
    if (empty === ME_ITEMS.length) return fail('اكتبي درجات البنود', false);
    if (empty && (auto || !confirm('توجد ' + arD(empty) + ' بنود بدون درجة (تُحسب صفراً). هل تريدين الحفظ؟'))) return fail('توجد بنود بدون درجة');
  } else if (kind === 'halls') {
    Object.assign(req, hlCollect(true));
    req.data = Object.assign(req.data, dateData);
    if (!req.center) return fail('اختاري اسم المركز', false);
    if (!req.data.floors.some(f => f.halls.length)) return fail('أضيفي قاعة واحدة على الأقل', false);
  } else if (kind === 'monthly') {
    Object.assign(req, imCollect(true), {});
    req.data = Object.assign(req.data, dateData);
    if (!req.center) return fail('اختاري اسم المركز', false);
    if (!req.period) return fail('اختاري الفترة (صباحي أو مسائي)', false);
    if (!req.data.ev.some(e => (e.a || []).some(Boolean))) return fail('قيّمي بنداً واحداً على الأقل', false);
  } else if (kind === 'program') {
    const data = Object.assign({}, dateData);
    ['content', 'plan', 'method', 'tools', 'results', 'ratio'].forEach(k => { data[k] = $('ip' + k[0].toUpperCase() + k.slice(1)).value.trim(); });
    Object.assign(req, { center: $('ipCenter').value, supName: $('ipSupName').value.trim(), data });
    if (!req.center) return fail('اختاري المركز', false);
    if (!data.content && !data.plan && !data.results) return fail('اكتبي المحتوى أو التخطيط أو النتائج', false);
  } else {
    Object.assign(req, { sem: $('isSem').value, year: $('isYear').value.trim(), period: periodGet('isPeriod'),
      supName: $('isSupName').value.trim(), data: Object.assign({ rows: idRowsGet('isRows') }, dateData) });
    if (!req.data.rows.length) return fail('اكتبي اقتراحاً أو صعوبة واحدة على الأقل', false);
  }
  // التواقيع: صورة جديدة، أو «keep» لإبقاء التوقيع السابق في وضع التعديل
  const oldHas = (idEdit && idEdit.data && idEdit.data.sigs) || {};
  req.sigs = {};
  Object.keys(SIGS_OF[kind]).forEach(k => { const v = SIGW[SIGS_OF[kind][k]].get(); req.sigs[k] = v || (idEdit && oldHas[k] ? 'keep' : ''); });

  if (btn) setBtnBusy(btn, true);
  try {
    const res = await api('saveIdari', req);
    Object.keys(SIGS_OF[kind]).forEach(k => SIGW[SIGS_OF[kind][k]].commit());
    AD.done(FORM_OF[kind], idEdit && idEdit.id);
    toast(auto ? 'حُفظ النموذج تلقائياً عند الخروج' : idEdit ? 'تم حفظ التعديل' : 'تم حفظ النموذج');
    const rec = { id: res.id, kind, center: req.center || '', sem: req.sem || '', year: req.year || '', period: req.period || '', date: req.date || '',
      day: res.day || dayOf(req.date), visitNo: req.visitNo || '', supName: req.supName || '', mgrName: req.mgrName || '',
      data: Object.assign({}, req.data, { sigs: res.sigs || {} }), at: idEdit ? idEdit.at : '' };
    IDR = IDR.filter(r => r.id !== rec.id); IDR.unshift(rec);
    cacheSet('idari', IDR);
    idEdit = null; idKind = kind;
    show('idListView'); renderIdari();
    loadIdari(true);
    if (!auto) idAfterSave(rec);
    return true;
  } catch (e) { toast(auto ? 'تعذّر الحفظ التلقائي (' + e.message + ')، وبقي النموذج مسودة في هذا الجهاز' : e.message, false); return false; }
  finally { if (btn) setBtnBusy(btn, false); }
}

/* ======================= استمارة المتابعة الإدارية الشهرية ======================= */
// عدد البنود التي اختير فيها التقييم السلبي (تحتاج متابعة)
function imNegCount(d) { return ((d && d.ev) || []).reduce((s, e) => s + (e.a || []).filter(v => v === '2').length, 0); }

/* ---------- أسماء المنسوبات ---------- */
function imAddRow(box, withTitle, v) {
  const row = document.createElement('div');
  row.className = 'im-list-row';
  v = v || (withTitle ? {} : '');
  row.innerHTML = '<span class="num"></span>' + (withTitle ? '<input class="t" placeholder="المسمى" value="' + esc(v.t || 'الإدارية') + '">' : '') +
    '<input class="n" placeholder="الاسم" autocomplete="off" value="' + esc(withTitle ? (v.n || '') : (v || '')) + '"><button type="button" class="x" title="حذف">✕</button>';
  row.querySelector('.x').onclick = () => { row.remove(); imNum(box); imStaffCount(); imNamesList(); };
  row.querySelector('.n').addEventListener('change', () => { imNamesList(); imStaffCount(); });
  $(box).appendChild(row);
  imNum(box);
}
function imNum(box) { [...$(box).children].forEach((el, i) => { el.querySelector('.num').textContent = arD(i + 1); }); }
function imRowsSet(box, list, withTitle, min) {
  $(box).innerHTML = '';
  const L = (list || []).slice();
  // قائمة فارغة: صفوف افتراضية كالاستمارة الورقية؛ وإن نُسخت أسماء فلا تُضاف صفوف فارغة
  if (!L.length) while (L.length < (min || 0)) L.push(withTitle ? { t: IM_ADMIN_TITLES[L.length] || 'الإدارية', n: '' } : '');
  L.forEach(v => imAddRow(box, withTitle, v));
}
function imRowsGet(box, withTitle) {
  return [...$(box).children].map(el => withTitle ? { t: el.querySelector('.t').value.trim(), n: el.querySelector('.n').value.trim() } : el.querySelector('.n').value.trim())
    .filter(x => withTitle ? x.n : x);
}
function imStaffGet() { return { guard: $('imGuard').value.trim(), adm: imRowsGet('imAdm', true), work: imRowsGet('imWork'), tch: imRowsGet('imTch') }; }
function imStaffSet(st) {
  st = st || {};
  $('imGuard').value = st.guard || '';
  imRowsSet('imAdm', st.adm, true, 5);
  imRowsSet('imWork', st.work, false, 3);
  imRowsSet('imTch', st.tch, false, 3);
  imNamesList(); imStaffCount();
}
function imStaffCount() {
  const st = imStaffGet();
  const n = (st.guard ? 1 : 0) + st.adm.length + st.work.length + st.tch.length;
  $('imStaffCnt').innerHTML = n ? '<b>' + arD(n) + '</b> اسماً' : 'لم تُكتب أسماء';
}
// قائمة الأسماء المقترحة لخانة اسم الموظفة في كل قسم
function imNamesList() {
  const st = imStaffGet();
  const names = [st.guard].concat(st.adm.map(x => x.n), st.work).filter(Boolean);
  $('imNames').innerHTML = [...new Set(names)].map(n => '<option value="' + esc(n) + '">').join('');
}

/* ---------- أقسام التقييم ---------- */
let imSeq = 0;
function imSecHtml(e) {
  const sec = IM_SEC(e.k); if (!sec) return '';
  const uid = 'ims' + (++imSeq), a = e.a || [], n = e.n || [];
  let body = '', g = null;
  sec.items.forEach((it, i) => {
    if (it.g && it.g !== g) { g = it.g; body += '<div class="im-g">' + esc(it.g) + '</div>'; }
    body += '<div class="im-it" data-i="' + i + '"><div class="q">' + esc(it.t) + '</div><div class="im-opts">' +
      it.o.map((o, j) => '<label' + (j === 1 ? ' class="neg"' : '') + '><input type="radio" name="' + uid + '_' + i + '" value="' + (j + 1) + '"' + (String(a[i]) === String(j + 1) ? ' checked' : '') + '>' + esc(o) + '</label>').join('') +
      '<button type="button" class="im-nt-btn"' + (n[i] ? ' hidden' : '') + '>＋ ملاحظة</button></div>' +
      '<input class="im-note"' + (n[i] ? '' : ' hidden') + ' placeholder="ملاحظة أو توجيه" value="' + esc(n[i] || '') + '"></div>';
  });
  if (e.k === 'building') body += '<div style="padding:8px 14px 12px"><label style="margin-top:0">الأجهزة غير الصالحة</label><textarea class="im-dev" rows="2"></textarea></div>';
  return '<details class="card ev-sec im-sec" data-k="' + e.k + '"><summary><span>' + esc(sec.title) + '<small class="im-who" style="color:var(--muted);font-weight:600"></small></span><span class="ev-prog"></span></summary>' +
    (sec.person ? '<input class="im-name" list="imNames" autocomplete="off" placeholder="اسم ' + esc(sec.person) + '" value="' + esc(e.name || '') + '">' : '') +
    '<div class="im-tools"><span>تحديد سريع:</span><button type="button" class="btn light" data-all="1">الكل إيجابي</button><button type="button" class="btn light" data-all="0">مسح الاختيارات</button></div>' +
    body + (sec.multi ? '<div class="im-sec-x"><button type="button" class="btn danger" data-del="1">حذف هذا التقييم</button></div>' : '') + '</details>';
}
function imBuildSecs(ev) {
  const byK = {};
  (ev || []).forEach(e => { (byK[e.k] = byK[e.k] || []).push(e); });
  let h = '';
  IM_SECTIONS.forEach(sec => {
    const L = byK[sec.k] && byK[sec.k].length ? byK[sec.k] : [{ k: sec.k }];
    L.forEach(e => { h += imSecHtml(e); });
    if (sec.multi) h += '<button type="button" class="btn light block" style="margin:-6px 0 14px" data-add="' + sec.k + '">＋ إضافة تقييم ' + esc(sec.person) + ' أخرى</button>';
  });
  $('imSecs').innerHTML = h;
  imSecs$().forEach(imSecProgress);
  imTotals();
  return $('imSecs').querySelector('.im-dev');
}
const imSecs$ = () => [...$('imSecs').querySelectorAll('.im-sec')];
function imSecProgress(el) {
  const its = [...el.querySelectorAll('.im-it')];
  const done = its.filter(x => x.querySelector('input:checked')).length;
  const neg = its.filter(x => { const c = x.querySelector('input:checked'); return c && c.value === '2'; }).length;
  el.querySelector('.ev-prog').innerHTML = '<b>' + arD(done) + '</b> / ' + arD(its.length) + (neg ? ' — <b style="color:#b03a2e">' + arD(neg) + '</b> تحتاج متابعة' : '');
  const nm = el.querySelector('.im-name');
  el.querySelector('.im-who').textContent = nm && nm.value.trim() ? ' — ' + nm.value.trim() : '';
}
function imTotals() {
  const its = [...$('imSecs').querySelectorAll('.im-it')];
  $('imDone').textContent = arD(its.filter(x => x.querySelector('input:checked')).length);
  $('imTotal').textContent = arD(its.length);
  $('imNeg').textContent = arD(its.filter(x => { const c = x.querySelector('input:checked'); return c && c.value === '2'; }).length);
}
// الضغط على اختيار محدد مسبقاً يلغي تحديده
let imDownChecked = null;
$('imSecs').addEventListener('pointerdown', e => { const lb = e.target.closest('.im-opts label'); imDownChecked = lb && lb.querySelector('input').checked ? lb.querySelector('input') : null; });
$('imSecs').addEventListener('click', e => {
  const sec = e.target.closest('.im-sec');
  if (e.target.matches('input[type=radio]') && imDownChecked === e.target) { e.target.checked = false; imDownChecked = null; }
  const all = e.target.closest('[data-all]');
  if (all && sec) sec.querySelectorAll('.im-it').forEach(it => { if (all.dataset.all === '1') it.querySelector('input[value="1"]').checked = true; else it.querySelectorAll('input[type=radio]').forEach(x => { x.checked = false; }); });
  const nb = e.target.closest('.im-nt-btn');
  if (nb) { const inp = nb.closest('.im-it').querySelector('.im-note'); inp.hidden = false; nb.hidden = true; inp.focus(); return; }
  const del = e.target.closest('[data-del]');
  if (del && sec) {
    const k = sec.dataset.k;
    if (imSecs$().filter(x => x.dataset.k === k).length < 2) { toast('يبقى تقييم واحد على الأقل، ويمكن تركه فارغاً', false); return; }
    if (!confirm('حذف هذا التقييم؟')) return;
    sec.remove(); imTotals(); return;
  }
  const add = e.target.closest('[data-add]');
  if (add) {
    add.insertAdjacentHTML('beforebegin', imSecHtml({ k: add.dataset.add }));
    const n = add.previousElementSibling; n.open = true; imSecProgress(n); imTotals(); n.scrollIntoView({ block: 'start', behavior: 'smooth' }); return;
  }
  if (sec) { imSecProgress(sec); imTotals(); }
});
$('imSecs').addEventListener('input', e => { const sec = e.target.closest('.im-sec'); if (sec && e.target.classList.contains('im-name')) imSecProgress(sec); });
$('imPeriod').addEventListener('change', e => {
  if (e.target.checked) document.querySelectorAll('#imPeriod input').forEach(i => { if (i !== e.target) i.checked = false; });
  imCenterChanged();
});
$('imMgrName').addEventListener('input', () => { delete $('imMgrName').dataset.auto; });
function imEvGet() {
  return imSecs$().map(el => {
    const its = [...el.querySelectorAll('.im-it')];
    const nm = el.querySelector('.im-name');
    return { k: el.dataset.k, name: nm ? nm.value.trim() : '',
      a: its.map(x => { const c = x.querySelector('input:checked'); return c ? c.value : ''; }),
      n: its.map(x => x.querySelector('.im-note').value.trim()) };
  });
}

/* ---------- المديرة ورقم الزيارة ونسخ الأسماء من آخر استمارة للمركز ---------- */
function imFillMgr() {
  const st = $('imMgrStatus'), center = $('imCenter').value;
  if (!center) { st.textContent = ''; return; }
  const L = ivDirsFor(center);
  if (!L.length) { st.textContent = ''; return; }
  let per = periodGet('imPeriod');
  if (!per) {
    const hasM = L.some(d => !d.evening), hasE = L.some(d => d.evening);
    if (hasM && hasE) { st.textContent = 'لهذا المركز فترتان: اختاري الفترة لتظهر بيانات المديرة.'; return; }
    per = hasE ? 'مسائي' : 'صباحي';
    periodSet('imPeriod', per);
  }
  const d = L.find(x => x.evening === (per === 'مسائي'));
  if (d && d.name && (!$('imMgrName').value.trim() || $('imMgrName').dataset.auto === '1')) { $('imMgrName').value = d.name; $('imMgrName').dataset.auto = '1'; }
  st.textContent = d && d.name ? '✔️ المديرة: ' + d.name : '';
}
function imUpdateNo() {
  const hint = $('imVisitNoHint'), center = $('imCenter').value, per = periodGet('imPeriod');
  if (!center || !per) { hint.textContent = ''; return; }
  const hd = hdGet('im');
  const cur = /^\d{4}$/.test(hd.hy) ? hd.hy + '-' + pad2(hd.hm) + '-' + pad2(hd.hd) : '9999';
  const selfId = idEdit ? idEdit.id : '';
  const L = IDR.filter(r => r.kind === 'monthly' && r.id !== selfId && r.center === center && String(r.period || '').indexOf(per) > -1);
  const before = L.filter(r => ivHKey(r) < cur).length;
  if (!idEdit) $('imVisitNo').value = before + 1;
  hint.textContent = L.length ? 'استماراتكِ السابقة لهذا المركز في هذه الفترة: ' + arD(before) + '، فهذه الزيارة رقم ' + arD(before + 1) + '.' : 'لا توجد استمارات سابقة لهذا المركز في هذه الفترة، فهذه الزيارة الأولى.';
}
// استمارة جديدة: تُنسخ أسماء المنسوبات وأسماء من قُيِّمن من آخر استمارة لنفس المركز (والفترة إن وُجدت)
function imCopyFromLast() {
  if (idEdit) return;
  const center = $('imCenter').value, per = periodGet('imPeriod');
  const st = imStaffGet();
  if (!center || st.guard || st.adm.length || st.work.length || st.tch.length) return;
  const L = IDR.filter(r => r.kind === 'monthly' && r.center === center && (!per || String(r.period || '').indexOf(per) > -1))
    .sort((x, y) => (ivHKey(y) + (y.at || '')).localeCompare(ivHKey(x) + (x.at || '')));
  const last = L[0];
  if (!last || !last.data) return;
  imStaffSet(last.data.staff);
  if (last.data.gen) ['halls', 'used', 'cap'].forEach(k => { const el = $('im' + k[0].toUpperCase() + k.slice(1)); if (!el.value) el.value = last.data.gen[k] || ''; });
  // أسماء من قُيِّمن فقط (بدون الاختيارات والملاحظات)
  const cur = imEvGet();
  if (!cur.some(e => e.name || e.a.some(Boolean))) imBuildSecs((last.data.ev || []).map(e => ({ k: e.k, name: e.name })));
  $('imStaffHint').textContent = '✔ نُسخت الأسماء من آخر استمارة لهذا المركز، ويمكن تعديلها.';
}
function imCenterChanged() { imFillMgr(); imUpdateNo(); imCopyFromLast(); }

/* ---------- تعبئة الاستمارة وجمع بياناتها ---------- */
function imFill(r, edit) {
  const d = r.data || {}, gen = d.gen || {};
  selSet('imCenter', r.center);
  periodSet('imPeriod', r.period);
  $('imSem').value = r.sem || ''; $('imYear').value = r.year || hijriYear();
  hdSet('im', edit ? r : null);
  $('imVisitNo').value = r.visitNo || '';
  document.querySelectorAll('#imVType input').forEach(i => { i.checked = i.value === (d.vtype || ''); });
  $('imMgrName').value = r.mgrName || ''; delete $('imMgrName').dataset.auto;
  $('imMgrStatus').textContent = ''; $('imVisitNoHint').textContent = '';
  $('imStaffHint').textContent = 'تُنسخ الأسماء تلقائياً من آخر استمارة لهذا المركز، ويمكن تعديلها.';
  $('imHalls').value = gen.halls || ''; $('imUsed').value = gen.used || ''; $('imCap').value = gen.cap || ''; $('imGenNotes').value = gen.notes || '';
  imStaffSet(d.staff);
  $('imStaffSec').open = false;
  const dev = imBuildSecs(d.ev);
  if (dev) dev.value = d.devices || '';
  $('imOther').value = d.other || '';
  $('imSupName').value = r.supName || myName();
  if (!edit) loadDirs().then(() => { if (!idEdit && $('imCenter').value) imCenterChanged(); });
}
function imCollect(trim) {
  const v = id => trim ? $(id).value.trim() : $(id).value;
  const vt = document.querySelector('#imVType input:checked');
  const dev = $('imSecs').querySelector('.im-dev');
  return { center: $('imCenter').value, sem: $('imSem').value, year: v('imYear'), period: periodGet('imPeriod'), visitNo: v('imVisitNo'),
    mgrName: v('imMgrName'), supName: v('imSupName'),
    data: { vtype: vt ? vt.value : '', gen: { halls: v('imHalls'), used: v('imUsed'), cap: v('imCap'), notes: v('imGenNotes') },
      staff: imStaffGet(), ev: imEvGet(), devices: dev ? (trim ? dev.value.trim() : dev.value) : '', other: v('imOther') } };
}

/* ======================= استمارة تقييم المديرة ======================= */
function meBuild(sc, nt) {
  sc = sc || []; nt = nt || [];
  let h = '', g = null;
  ME_ITEMS.forEach((it, i) => {
    if (it[0] !== g) { g = it[0]; h += '<div class="me-g">' + esc(g) + '</div>'; }
    h += '<div class="me-it"><div class="q">' + esc(it[1]) + '</div><div class="sc"><input inputmode="decimal" class="me-sc" value="' + esc(sc[i] == null ? '' : sc[i]) + '"><small>من ' + arD(it[2]) + '</small>' +
      '<button type="button" class="im-nt-btn"' + (nt[i] ? ' hidden' : '') + '>＋ ملاحظة</button></div>' +
      '<input class="im-note"' + (nt[i] ? '' : ' hidden') + ' placeholder="ملاحظة" value="' + esc(nt[i] || '') + '"></div>';
  });
  $('meItems').innerHTML = h;
  meCalc();
}
function meCalc() {
  const its = [...document.querySelectorAll('#meItems .me-it')];
  const sc = its.map(x => x.querySelector('.me-sc').value.trim());
  its.forEach((el, i) => { const v = meNum(sc[i]); el.classList.toggle('bad', sc[i] !== '' && (v == null || v < 0 || v > ME_ITEMS[i][2])); });
  $('meSum').textContent = arD(meTotal(sc));
  $('meDone').textContent = arD(sc.filter(x => x !== '').length);
  $('meCnt').textContent = arD(ME_ITEMS.length);
}
$('meItems').addEventListener('input', e => { if (e.target.classList.contains('me-sc')) meCalc(); });
$('meItems').addEventListener('click', e => {
  const nb = e.target.closest('.im-nt-btn');
  if (nb) { const inp = nb.closest('.me-it').querySelector('.im-note'); inp.hidden = false; nb.hidden = true; inp.focus(); }
});
$('mePeriod').addEventListener('change', e => {
  if (e.target.checked) document.querySelectorAll('#mePeriod input').forEach(i => { if (i !== e.target) i.checked = false; });
  meCenterChanged();
});
['meMgrName', 'mePhone'].forEach(id => $(id).addEventListener('input', () => { delete $(id).dataset.auto; }));
// اسم المديرة وجوالها من ورقة «أرقام المديرات» (مثل تقرير الزيارة)
function meCenterChanged() {
  const st = $('meMgrStatus'), center = $('meCenter').value;
  if (!center) { st.textContent = ''; return; }
  const L = ivDirsFor(center);
  if (!L.length) { st.textContent = ''; return; }
  let per = periodGet('mePeriod');
  if (!per) {
    const hasM = L.some(d => !d.evening), hasE = L.some(d => d.evening);
    if (hasM && hasE) { st.textContent = 'لهذا المركز فترتان: اختاري الفترة لتظهر بيانات المديرة.'; return; }
    per = hasE ? 'مسائية' : 'صباحية';
    periodSet('mePeriod', per);
  }
  const d = L.find(x => x.evening === (per.indexOf('مسائ') > -1));
  if (!d) { st.textContent = ''; return; }
  const set = (id, v) => { if (v && (!$(id).value.trim() || $(id).dataset.auto === '1')) { $(id).value = v; $(id).dataset.auto = '1'; } };
  set('meMgrName', d.name);
  set('mePhone', d.phone ? '0' + d.phone.slice(3) : '');
  // بيانات المديرة الشخصية من آخر استمارة تقييم لها (إن وُجدت)
  const last = IDR.filter(r => r.kind === 'mgreval' && r.mgrName && r.mgrName === $('meMgrName').value.trim() && (!idEdit || r.id !== idEdit.id))
    .sort((x, y) => (ivHKey(y) + (y.at || '')).localeCompare(ivHKey(x) + (x.at || '')))[0];
  if (last && !idEdit) {
    const ld = last.data || {};
    [['meJuz', 'juz'], ['meBirth', 'birth'], ['meBirthplace', 'birthplace'], ['meExp', 'exp'], ['meEdu', 'edu']].forEach(([id, k]) => { if (!$(id).value && ld[k]) $(id).value = ld[k]; });
    if (!$('meQuran').value && ld.quran) meQuranSet(ld.quran);
  }
  st.textContent = '✔️ المديرة: ' + (d.name || '—') + (last && !idEdit ? ' — عُبّئت بياناتها من آخر تقييم لها' : '');
}
function meQuranSet(q) {
  const known = ME_QURAN.indexOf(q) > -1;
  $('meQuran').value = q ? (known ? q : 'أخرى') : '';
  $('meQuranOther').value = known ? '' : (q || '');
  $('meQuranOther').classList.toggle('hidden', !(q && !known));
}
function meFill(r, edit) {
  const d = r.data || {};
  selSet('meCenter', r.center);
  periodSet('mePeriod', r.period);
  $('meSem').value = r.sem || ''; $('meYear').value = r.year || hijriYear();
  $('meMgrName').value = r.mgrName || ''; $('mePhone').value = d.phone || '';
  delete $('meMgrName').dataset.auto; delete $('mePhone').dataset.auto;
  $('meJuz').value = d.juz || ''; $('meBirth').value = d.birth || ''; $('meBirthplace').value = d.birthplace || '';
  $('meExp').value = d.exp || ''; $('meEdu').value = d.edu || '';
  $('meQuran').innerHTML = '<option value="">اختاري</option>' + ME_QURAN.concat(['أخرى']).map(x => '<option>' + esc(x) + '</option>').join('');
  meQuranSet(d.quran || '');
  hdSet('me', edit ? r : null);
  meBuild(d.sc, d.nt);
  $('meRecs').value = d.recs || '';
  $('meSupName').value = r.supName || myName();
  $('meMgrStatus').textContent = '';
  if (!edit) loadDirs();
}
function meCollect(trim) {
  const v = id => trim ? $(id).value.trim() : $(id).value;
  const its = [...document.querySelectorAll('#meItems .me-it')];
  const q = $('meQuran').value === 'أخرى' ? v('meQuranOther') : $('meQuran').value;
  return { center: $('meCenter').value, sem: $('meSem').value, year: v('meYear'), period: periodGet('mePeriod'),
    mgrName: v('meMgrName'), supName: v('meSupName'),
    data: { phone: v('mePhone'), juz: v('meJuz'), birth: v('meBirth'), birthplace: v('meBirthplace'), exp: v('meExp'), quran: q, edu: v('meEdu'),
      sc: its.map(x => x.querySelector('.me-sc').value.trim().replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c))),
      nt: its.map(x => x.querySelector('.im-note').value.trim()), recs: v('meRecs') } };
}

/* ======================= حصر القاعات في المراكز ======================= */
function hlBuild(floors) {
  const byName = {};
  (floors || []).forEach(f => { byName[f.name] = f.halls || []; });
  $('hlFloors').innerHTML = HL_FLOORS.map(name => '<details class="card ev-sec hl-floor" data-f="' + esc(name) + '"' + ((byName[name] || []).length || name === 'الأرضي' ? ' open' : '') + '>' +
    '<summary><span>الدور ' + esc(name) + '</span><span class="ev-prog"></span></summary><div style="padding:4px 14px 14px">' +
    '<div class="hl-hd"><span>م</span><span>النوع (ك/ص)</span><span>الحالة</span><span>الكراسي</span><span>الطاقة</span><span></span></div>' +
    '<div class="hl-list"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn light" data-add="1">＋ إضافة قاعة</button>' +
    '<button type="button" class="btn light" data-addn="1">＋ إضافة عدة قاعات</button></div></div></details>').join('');
  document.querySelectorAll('#hlFloors .hl-floor').forEach(el => (byName[el.dataset.f] || []).forEach(h => hlAddRow(el, h)));
  hlCalc();
}
function hlAddRow(floorEl, h) {
  h = h || {};
  const row = document.createElement('div');
  row.className = 'hl-row';
  row.innerHTML = '<span class="num"></span><select class="type"><option value="">—</option>' + HL_TYPES.map(t => '<option value="' + t[0] + '"' + (h.type === t[0] ? ' selected' : '') + ' title="' + t[1] + '">' + t[0] + '</option>').join('') + '</select>' +
    '<input class="status" list="hlStatusDl" placeholder="الحالة" value="' + esc(h.status || '') + '">' +
    '<input class="chairs" inputmode="numeric" placeholder="الكراسي" value="' + esc(h.chairs || '') + '">' +
    '<input class="cap" inputmode="numeric" placeholder="الطاقة" value="' + esc(h.cap || '') + '">' +
    '<button type="button" class="x" title="حذف">✕</button>';
  floorEl.querySelector('.hl-list').appendChild(row);
}
function hlCalc() {
  let n = 0, cap = 0, over = 0;
  document.querySelectorAll('#hlFloors .hl-floor').forEach(f => {
    const rows = [...f.querySelectorAll('.hl-row')];
    let fc = 0;
    rows.forEach((r, i) => {
      r.querySelector('.num').textContent = arD(i + 1);
      const c = hlNum(r.querySelector('.cap').value);
      const o = c > HL_MAX_CAP; r.classList.toggle('over', o); if (o) over++;
      fc += c;
    });
    n += rows.length; cap += fc;
    f.querySelector('.ev-prog').innerHTML = rows.length ? '<b>' + arD(rows.length) + '</b> قاعة — الطاقة ' + arD(fc) : 'لا توجد قاعات';
  });
  $('hlCnt').textContent = arD(n);
  $('hlCap').textContent = arD(cap);
  $('hlOver').textContent = over ? '⚠ ' + arD(over) + ' فوق ٢٥' : '';
}
$('hlFloors').addEventListener('click', e => {
  const f = e.target.closest('.hl-floor'); if (!f) return;
  if (e.target.closest('[data-add]')) { hlAddRow(f); hlCalc(); f.querySelector('.hl-row:last-child select').focus(); }
  else if (e.target.closest('[data-addn]')) {
    const k = parseInt(String(prompt('كم قاعة تريدين إضافتها في الدور ' + f.dataset.f + '؟', '4') || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)), 10);
    if (k > 0 && k <= 40) { for (let i = 0; i < k; i++) hlAddRow(f); hlCalc(); }
  } else if (e.target.closest('.x')) { e.target.closest('.hl-row').remove(); hlCalc(); }
});
$('hlFloors').addEventListener('input', hlCalc);
function hlFloorsGet() {
  return [...document.querySelectorAll('#hlFloors .hl-floor')].map(f => ({ name: f.dataset.f,
    halls: [...f.querySelectorAll('.hl-row')].map(r => ({ type: r.querySelector('.type').value, status: r.querySelector('.status').value.trim(),
      chairs: r.querySelector('.chairs').value.trim().replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)),
      cap: r.querySelector('.cap').value.trim().replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)) })) }));
}
// حصر جديد: تُنسخ القاعات وبيانات المركز من آخر حصر لنفس المركز (ثم تُعدَّل الحالة أو الأعداد فقط)
function hlCenterChanged() {
  if (idEdit) return;
  const center = $('hlCenter').value;
  if (!center || hlFloorsGet().some(f => f.halls.length)) return;
  const last = IDR.filter(r => r.kind === 'halls' && r.center === center).sort((x, y) => (ivHKey(y) + (y.at || '')).localeCompare(ivHKey(x) + (x.at || '')))[0];
  if (!last || !last.data) { $('hlCopyHint').textContent = ''; return; }
  hlBuild(last.data.floors);
  [['hlNo', 'no'], ['hlFac', 'facilities'], ['hlFloorsN', 'floorsCount']].forEach(([id, k]) => { if (!$(id).value) $(id).value = last.data[k] || ''; });
  $('hlCopyHint').textContent = '✔ نُسخت القاعات من آخر حصر لهذا المركز، ويمكن تعديلها.';
}
function hlFill(r, edit) {
  const d = r.data || {};
  selSet('hlCenter', r.center);
  $('hlSem').value = r.sem || ''; $('hlYear').value = r.year || hijriYear();
  $('hlNo').value = d.no || ''; $('hlFac').value = d.facilities || ''; $('hlFloorsN').value = d.floorsCount || '';
  $('hlNotes').value = d.notes || '';
  $('hlCopyHint').textContent = '';
  hdSet('hl', edit ? r : null);
  hlBuild(d.floors);
  $('hlSupName').value = r.supName || myName();
}
function hlCollect(trim) {
  const v = id => trim ? $(id).value.trim() : $(id).value;
  return { center: $('hlCenter').value, sem: $('hlSem').value, year: v('hlYear'), supName: v('hlSupName'),
    data: { no: v('hlNo'), facilities: v('hlFac'), floorsCount: v('hlFloorsN'), notes: v('hlNotes'), floors: hlFloorsGet() } };
}

/* ---------- الحفظ التلقائي (autosave.js): نماذج الإشراف الإداري الثلاثة ---------- */
function idCollect(kind) {
  const p = ID_PFX[kind];
  const h = hdGet(p), dateData = { hd: h.hd, hm: h.hm, hy: h.hy, dayName: h.dayName };
  if (kind === 'monthly' || kind === 'mgreval' || kind === 'halls') { const o = (kind === 'monthly' ? imCollect : kind === 'mgreval' ? meCollect : hlCollect)(false); o.data = Object.assign(o.data, dateData); return o; }
  if (kind === 'visit') return { center: $('ivCenter').value, sem: $('ivSem').value, year: $('ivYear').value, period: periodGet('ivPeriod'), visitNo: $('ivVisitNo').value,
    mgrName: $('ivMgrName').value, supName: $('ivSupName').value,
    data: Object.assign({ vtype: $('ivType').value, about: $('ivAbout').value, notes: ivNotesGet(), recs: ivRecsGet(), mgrPhone: $('ivMgrPhone').value }, dateData) };
  if (kind === 'program') {
    const data = Object.assign({}, dateData);
    ['content', 'plan', 'method', 'tools', 'results', 'ratio'].forEach(k => { data[k] = $('ip' + k[0].toUpperCase() + k.slice(1)).value; });
    return { center: $('ipCenter').value, supName: $('ipSupName').value, data };
  }
  return { sem: $('isSem').value, year: $('isYear').value, period: periodGet('isPeriod'), supName: $('isSupName').value, data: Object.assign({ rows: idRowsGet('isRows') }, dateData) };
}
['visit', 'program', 'suggest', 'monthly', 'mgreval', 'halls'].forEach(kind => {
  const p = ID_PFX[kind];
  AD.register(FORM_OF[kind], {
    key: () => idEdit ? idEdit.id : 'new',
    collect: () => idCollect(kind),
    apply: d => {
      const merged = Object.assign({}, idEdit || {}, d, { data: Object.assign({}, (idEdit && idEdit.data) || {}, d.data) });
      idFill(kind, merged); hdSet(p, d);
      if (kind === 'visit') { $('ivMgrName').value = d.mgrName || ''; $('ivMgrPhone').value = (d.data && d.data.mgrPhone) || ''; $('ivVisitNo').value = d.visitNo || ''; }
    },
    reset: () => idFill(kind, idEdit)
  });
});
{ const _n = idNew, _e = idEditRec;
  idNew = function () { _n(); AD.offer(FORM_OF[idKind]); };
  idEditRec = function (id) { _e(id); AD.offer(FORM_OF[idKind]); }; }

/* ---------- استعادة الجلسة ---------- */
/* ===================== المراكز المشرفة عليها + إحصائية تقرير الزيارة =====================
   كل مشرفة تحدد المراكز التي تشرف عليها (تُحفظ في ورقة «مراكز المشرفات»)، وتظهر في قائمة «تقرير زيارة المشرفة»
   إحصائية بالمراكز التي تمت زيارتها (مع عدد الزيارات وآخر زيارة) والتي لم تتم زيارتها. */
/* دوال «المراكز المشرفة عليها» في my-centers.js (مشتركة بين الوحدات) */

function idStatsRender() {
  const box = $('idStats'); if (!box) return;
  if (idKind !== 'visit') { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  if (!mcLoaded) mcFetch().then(() => { if (idKind === 'visit') idStatsRender(); });
  if (!MYC.length) {
    box.innerHTML = '<h2>إحصائية الزيارات</h2><p class="rp-hint">حدّدي أولاً المراكز التي تشرفين عليها، لتظهر هنا المراكز التي تمت زيارتها والتي لم تتم زيارتها.</p>' +
      '<button class="btn light" onclick="mcOpen()">تحديد المراكز المشرفة عليها</button>';
    return;
  }
  const visits = IDR.filter(r => r.kind === 'visit');
  const by = {};
  visits.forEach(r => { const c = mcNorm(r.center); if (!c) return; const k = mcKey(c); (by[k] = by[k] || []).push(r); });
  const mine = MYC.map(mcNorm).filter(Boolean);
  const done = mine.filter(c => by[mcKey(c)]).sort((a, b) => by[mcKey(b)].length - by[mcKey(a)].length || a.localeCompare(b, 'ar'));
  const not = mine.filter(c => !by[mcKey(c)]).sort((a, b) => a.localeCompare(b, 'ar'));
  const lastOf = c => { const L = by[mcKey(c)]; const r = L.slice().sort((a, b) => String(b.date || b.at || '').localeCompare(String(a.date || a.at || '')))[0]; return r && r.data && r.data.hd ? idHDate(r) : esc(r && r.date || ''); };
  const visTbl = done.length ? '<div class="tbl-wrap"><table class="mc-tbl"><thead><tr><th>م</th><th>المركز</th><th>عدد الزيارات</th><th>آخر زيارة</th></tr></thead><tbody>' +
    mcGroups(done).map(g => '<tr class="mc-gh"><td colspan="4">' + g.title + '</td></tr>' + g.list.map((c, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(mcName(c)) + '</td><td><b>' + by[mcKey(c)].length + '</b></td><td>' + lastOf(c) + '</td></tr>').join('')).join('') + '</tbody></table></div>'
    : '<p class="empty">لم تتم زيارة أي مركز بعد</p>';
  const notList = not.length ? '<div class="tbl-wrap"><table class="mc-tbl"><thead><tr><th>م</th><th>المركز</th></tr></thead><tbody>' +
    mcGroups(not).map(g => '<tr class="mc-gh"><td colspan="2">' + g.title + '</td></tr>' + g.list.map((c, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(mcName(c)) + '</td></tr>').join('')).join('') + '</tbody></table></div>'
    : '<p class="empty">تمت زيارة جميع المراكز المشرفة عليها</p>';
  const open = box.querySelectorAll('details[open]');
  const wasOpen = [...open].map(d => d.dataset.k);
  const perRow = (lbl, k) => { const all = mine.filter(c => mcPeriod(c) === k); if (!all.length) return ''; const v = all.filter(c => by[mcKey(c)]).length;
    return '<tr><td>' + lbl + '</td><td>' + all.length + '</td><td class="ok">' + v + '</td><td class="no">' + (all.length - v) + '</td></tr>'; };
  const perTbl = '<div class="tbl-wrap" style="margin-bottom:6px"><table class="mc-tbl mc-ptbl"><thead><tr><th>الفترة</th><th>عدد المراكز</th><th>تمت زيارتها</th><th>لم تتم زيارتها</th></tr></thead><tbody>' +
    perRow('الفترة الصباحية', 'am') + perRow('الفترة المسائية', 'pm') + perRow('صباحية ومسائية', 'both') + perRow('بدون فترة', '') +
    '<tr class="mc-tot"><td>الإجمالي</td><td>' + mine.length + '</td><td class="ok">' + done.length + '</td><td class="no">' + not.length + '</td></tr></tbody></table></div>';
  box.innerHTML = '<h2>إحصائية الزيارات</h2>' + perTbl +
    '<details class="mc-fold" data-k="done"' + (wasOpen.indexOf('done') > -1 ? ' open' : '') + '><summary><span class="mc-ft">المراكز التي تمت زيارتها</span><span class="mc-cnt ok">' + done.length + '</span><span class="mc-arr">▾</span></summary>' + visTbl + '</details>' +
    '<details class="mc-fold" data-k="not"' + (wasOpen.indexOf('not') > -1 ? ' open' : '') + '><summary><span class="mc-ft">المراكز التي لم تتم زيارتها</span><span class="mc-cnt no">' + not.length + '</span><span class="mc-arr">▾</span></summary>' + notList + '</details>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--muted)">من ' + mine.length + ' مركزاً تشرفين عليها — <a class="lnk" href="#" onclick="mcOpen();return false">تعديل المراكز</a></p>';
}

(function init() {
  loadLoginNames('users', 'un', { unit: ID_UNIT });
  idKind = localStorage.getItem(KIND_KEY) || 'visit';
  if (!getPw() || !getUser()) return;
  let last = null; try { last = sessionStorage.getItem(VIEW_KEY); } catch (e) {}   // عند فتح الموقع من جديد (بعد إغلاقه) تظهر الرئيسية
  preload();
  if (last === 'visitsView') { show('visitsView'); loadVisits(); }
  else if (last && FORM_OF[idKind] === last && AD.has(last)) { idOpenList(idKind); idNew(); }
  else if (last === 'idListView' || (last && last.indexOf('id') === 0)) idOpenList(idKind);
  else { show('homeView'); loadIdari(true); }
})();

