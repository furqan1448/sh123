/* ===== صفحة مشرفات وحدة الإشراف الإداري (idari.html) ===== */
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const $ = id => document.getElementById(id);
const VIEW_KEY = 'idari_view', NAME_KEY = 'idari_name', KIND_KEY = 'idari_kind';
let LISTS = { centers: [], types: [], typesIdari: [] };
let VISITS = [], IDR = [], idKind = 'visit', idEdit = null;

const ALL_VIEWS = ['loginView', 'homeView', 'visitsView', 'idListView', 'idVisitForm', 'idProgramForm', 'idSuggestForm'];
const FORM_OF = { visit: 'idVisitForm', program: 'idProgramForm', suggest: 'idSuggestForm' };

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
  if (!p || p.unit === ID_UNIT) return false;
  toast('هذا الحساب من ' + (p.unit || 'وحدة أخرى') + '، جارِ التحويل لصفحتها');
  setTimeout(() => { location.href = 'mushrifat.html'; }, 1200);
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
  } catch (e) {
    localStorage.removeItem(PW_KEY); localStorage.removeItem(USER_KEY);
    toast(e.message, false);
  } finally { setBtnBusy(btn, false); }
}
['un', 'pw'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));

function logout() {
  [PW_KEY, USER_KEY, VIEW_KEY, NAME_KEY].forEach(k => localStorage.removeItem(k));
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
  el.innerHTML = '<option value="">' + esc(ph) + '</option>' + arr.map(x => '<option>' + esc(x) + '</option>').join('');
  if (cur && arr.indexOf(cur) > -1) el.value = cur;
}
function fillLists() {
  ['vCenter', 'ivCenter', 'ipCenter'].forEach(id => fillSelect(id, LISTS.centers || [], 'اختاري المركز'));
  fillSelect('fCenter', LISTS.centers || [], 'كل المراكز');
  fillTypes();
  fillVStatus();
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
function hijriYear() {
  try { return String(parseInt(new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).format(new Date()), 10) || ''); } catch (e) { return ''; }
}
function idDateInfo(p) {
  const v = $(p + 'Date').value;
  if ($(p + 'Day')) $(p + 'Day').textContent = dayOf(v) || '—';
  $(p + 'Hijri').textContent = v ? idHijri(v) : '—';
}

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

/* ======================= النماذج الثلاثة ======================= */
const SIGW = {
  ivAck: makeSigWidget('ivAckW', { none: true }),
  ivMgr: makeSigWidget('ivMgrW', { none: true }),
  ivSup: makeSigWidget('ivSupW', { saved: true, none: true }),
  ipSup: makeSigWidget('ipSupW', { saved: true, none: true }),
  isSup: makeSigWidget('isSupW', { saved: true, none: true })
};
const SIGS_OF = { visit: { ack: 'ivAck', mgr: 'ivMgr', sup: 'ivSup' }, program: { sup: 'ipSup' }, suggest: { sup: 'isSup' } };
const ID_HINT = {
  visit: 'تقرير الزيارة الإدارية للمركز بالملاحظات والتوصيات وتوقيع المديرة، ويُطبع أو يُحمَّل PDF بالكليشة.',
  program: 'تخطيط وتنفيذ ونتائج برنامج المشرفة المقيمة، ويُطبع أو يُحمَّل PDF بالكليشة.',
  suggest: 'الاقتراحات والمرئيات والصعوبات التي تواجه المشرفة، وتُسلَّم آخر الفصل الدراسي.'
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
  $('idListHint').textContent = ID_HINT[kind];
  show('idListView');
  loadIdari();
}

const sBtn = (txt, fn, cls) => '<button class="btn ' + (cls || 'light') + '" style="padding:6px 10px;font-size:13px" onclick="' + fn + '">' + txt + '</button>';
function renderIdari() {
  const L = IDR.filter(r => r.kind === idKind);
  const heads = {
    visit: ['م', 'المركز', 'التاريخ', 'رقم الزيارة', 'البنود', ''],
    program: ['م', 'المركز', 'التاريخ', 'المحتوى', ''],
    suggest: ['م', 'الفصل الدراسي', 'العام', 'التاريخ', 'البنود', '']
  }[idKind];
  $('idHead').innerHTML = '<tr>' + heads.map(h => '<th>' + h + '</th>').join('') + '</tr>';
  if (!L.length) { $('idBody').innerHTML = '<tr><td colspan="' + heads.length + '" class="empty">لا توجد نماذج محفوظة</td></tr>'; return; }
  const cnt = r => ((r.data && r.data.rows) || []).length;
  const short = s => { s = String(s || ''); return s.length > 50 ? s.slice(0, 50) + '…' : s; };
  $('idBody').innerHTML = L.map((r, i) => {
    const id = esc(r.id);
    const acts = '<td><div class="act">' + sBtn('عرض', 'idOpen(\'' + id + '\')') + sBtn('طباعة', 'idDo(\'' + id + '\', this, \'print\')') +
      sBtn('PDF', 'idDo(\'' + id + '\', this, \'pdf\')') + sBtn('تعديل', 'idEditRec(\'' + id + '\')') + sBtn('حذف', 'idDel(\'' + id + '\')', 'danger') + '</div></td>';
    const date = esc(r.date) + (r.day ? ' ' + esc(r.day) : '');
    if (idKind === 'visit') return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.center) + '</td><td>' + date + '</td><td>' + (esc(r.visitNo) || '—') + '</td><td>' + cnt(r) + '</td>' + acts + '</tr>';
    if (idKind === 'program') return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.center) + '</td><td>' + date + '</td><td>' + esc(short(r.data && r.data.content)) + '</td>' + acts + '</tr>';
    return '<tr><td>' + (i + 1) + '</td><td>' + (esc(r.sem) || '—') + '</td><td>' + (esc(r.year) || '—') + '</td><td>' + (date || '—') + '</td><td>' + cnt(r) + '</td>' + acts + '</tr>';
  }).join('');
}
const recById = id => IDR.find(r => r.id === id);
function idOpen(id) { const r = recById(id); if (r) idView(r); }
function idDo(id, btn, what) { const r = recById(id); if (!r) return; what === 'pdf' ? idPdf(r, btn) : idPrint(r, btn); }
async function idDel(id) {
  if (!confirm('هل تريدين حذف هذا النموذج؟')) return;
  IDR = IDR.filter(r => r.id !== id);
  cacheSet('idari', IDR); renderIdari();
  try { await api('deleteIdari', { id }); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); loadIdari(); }
}

/* ---------- صفوف الجداول (تقرير الزيارة / الاقتراحات) ---------- */
function ivRowHtml(r) {
  r = r || {};
  return '<div class="id-row"><div class="id-row-h"><b>بند</b><button type="button" class="btn danger" onclick="idRowDel(this)">حذف البند</button></div>' +
    '<label>بشأن</label><input data-k="about" list="ivAboutList" placeholder="تعليمية / إدارية" value="' + esc(r.about) + '">' +
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
function ivAddRow() { $('ivRows').insertAdjacentHTML('beforeend', ivRowHtml()); idRowsNum('ivRows'); }
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
document.body.insertAdjacentHTML('beforeend', '<datalist id="ivAboutList"><option value="إدارية"><option value="تعليمية"></datalist>');

/* ---------- فتح نموذج جديد / تعديل ---------- */
function idFill(kind, r) {
  r = r || {};
  const d = r.data || {};
  const edit = !!r.id;
  document.querySelectorAll('#' + FORM_OF[kind] + ' [data-edit]').forEach(x => x.classList.toggle('hidden', !edit));
  if (kind === 'visit') {
    $('ivCenter').value = r.center || '';
    $('ivSem').value = r.sem || ''; $('ivYear').value = r.year || hijriYear();
    periodSet('ivPeriod', r.period);
    $('ivDate').value = r.date || todayStr(); $('ivVisitNo').value = r.visitNo || '';
    $('ivType').value = d.vtype || 'إداري';
    $('ivMgrName').value = r.mgrName || ''; $('ivSupName').value = r.supName || myName();
    idRowsSet('ivRows', d.rows, ivRowHtml);
    idDateInfo('iv');
  } else if (kind === 'program') {
    $('ipDate').value = r.date || todayStr(); $('ipCenter').value = r.center || '';
    ['content', 'plan', 'method', 'tools', 'results', 'ratio'].forEach(k => { $('ip' + k[0].toUpperCase() + k.slice(1)).value = d[k] || ''; });
    $('ipSupName').value = edit ? (r.supName || '') : myName();
    idDateInfo('ip');
  } else {
    $('isSem').value = r.sem || ''; $('isYear').value = r.year || hijriYear();
    periodSet('isPeriod', r.period);
    $('isSupName').value = r.supName || myName(); $('isDate').value = r.date || todayStr();
    idRowsSet('isRows', d.rows, isRowHtml);
    idDateInfo('is');
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
async function idSave(kind, btn) {
  const req = { kind, id: idEdit ? idEdit.id : '' };
  if (kind === 'visit') {
    Object.assign(req, { center: $('ivCenter').value, sem: $('ivSem').value, year: $('ivYear').value.trim(), period: periodGet('ivPeriod'),
      date: $('ivDate').value, visitNo: $('ivVisitNo').value.trim(), mgrName: $('ivMgrName').value.trim(), supName: $('ivSupName').value.trim(),
      data: { vtype: $('ivType').value.trim() || 'إداري', hijri: $('ivDate').value ? idHijri($('ivDate').value) : '', rows: idRowsGet('ivRows') } });
    if (!req.center) return toast('اختاري اسم المركز', false);
    if (!req.date) return toast('اختاري التاريخ', false);
    if (!req.data.rows.length) return toast('اكتبي بنداً واحداً على الأقل', false);
  } else if (kind === 'program') {
    const data = { hijri: $('ipDate').value ? idHijri($('ipDate').value) : '' };
    ['content', 'plan', 'method', 'tools', 'results', 'ratio'].forEach(k => { data[k] = $('ip' + k[0].toUpperCase() + k.slice(1)).value.trim(); });
    Object.assign(req, { center: $('ipCenter').value, date: $('ipDate').value, supName: $('ipSupName').value.trim(), data });
    if (!req.date) return toast('اختاري اليوم / التاريخ', false);
    if (!req.center) return toast('اختاري المركز', false);
    if (!data.content && !data.plan && !data.results) return toast('اكتبي المحتوى أو التخطيط أو النتائج', false);
  } else {
    Object.assign(req, { sem: $('isSem').value, year: $('isYear').value.trim(), period: periodGet('isPeriod'), date: $('isDate').value,
      supName: $('isSupName').value.trim(), data: { hijri: $('isDate').value ? idHijri($('isDate').value) : '', rows: idRowsGet('isRows') } });
    if (!req.data.rows.length) return toast('اكتبي اقتراحاً أو صعوبة واحدة على الأقل', false);
  }
  // التواقيع: صورة جديدة، أو «keep» لإبقاء التوقيع السابق في وضع التعديل
  const oldHas = (idEdit && idEdit.data && idEdit.data.sigs) || {};
  req.sigs = {};
  Object.keys(SIGS_OF[kind]).forEach(k => { const v = SIGW[SIGS_OF[kind][k]].get(); req.sigs[k] = v || (idEdit && oldHas[k] ? 'keep' : ''); });

  setBtnBusy(btn, true);
  try {
    const res = await api('saveIdari', req);
    Object.keys(SIGS_OF[kind]).forEach(k => SIGW[SIGS_OF[kind][k]].commit());
    toast(idEdit ? 'تم حفظ التعديل' : 'تم حفظ النموذج');
    const rec = { id: res.id, kind, center: req.center || '', sem: req.sem || '', year: req.year || '', period: req.period || '', date: req.date || '',
      day: res.day || dayOf(req.date), visitNo: req.visitNo || '', supName: req.supName || '', mgrName: req.mgrName || '',
      data: Object.assign({}, req.data, { sigs: res.sigs || {} }), at: idEdit ? idEdit.at : '' };
    IDR = IDR.filter(r => r.id !== rec.id); IDR.unshift(rec);
    cacheSet('idari', IDR);
    idEdit = null; idKind = kind;
    show('idListView'); renderIdari();
    loadIdari(true);
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- استعادة الجلسة ---------- */
(function init() {
  loadLoginNames('users', 'un', { unit: ID_UNIT });
  idKind = localStorage.getItem(KIND_KEY) || 'visit';
  if (!getPw() || !getUser()) return;
  const last = localStorage.getItem(VIEW_KEY);
  preload();
  if (last === 'visitsView') { show('visitsView'); loadVisits(); }
  else if (last === 'idListView' || (last && last.indexOf('id') === 0)) idOpenList(idKind);
  else { show('homeView'); loadIdari(true); }
})();
