/* ===== إدارة الوحدات: متابعة مشرفات كل وحدة (تظهر لمديرات الوحدات فقط) ===== */
// صفحة مستقلة (units.html) بدخول خاص: ورقة «مديرات الوحدات» (الاسم | كلمة المرور | الوحدة). وحدة «الكل» = كل الوحدات
let MG = null, mgTab = 'visits', mgSub = '';
/* التصفية حسب أيقونات كل وحدة: [المفتاح، التبويب، النوع داخل التبويب، اسم الأيقونة] */
const MG_ICONS = {
  'وحدة الإشراف التربوي': [['visits', 'visits', '', 'كشف الخروج'], ['evw', 'evals', 'w', 'استمارات التقييم الأسبوعية'], ['evf', 'evals', 'f', 'استمارات التقييم النهائية'],
    ['rpt', 'rpt', '', 'خلاصة التقارير'], ['min', 'min', '', 'محاضر الاجتماعات'], ['files', 'files', '', 'المرفقات']],
  'وحدة تحفيظ الصغار': [['visits', 'visits', '', 'كشف الخروج'], ['sgv', 'sgh', 'visit', 'تقرير زيارة مشرفة تحفيظ صغار'], ['sgs', 'sgh', 'sum', 'خلاصة التقارير التعليمية'],
    ['sge', 'sgh', 'eval', 'استمارات التقييم'], ['stf', 'sgh', 'stf', 'إجراءات الموظفات'], ['min', 'min', '', 'محاضر الاجتماعات'], ['files', 'files', '', 'المرفقات']],
  'وحدة الإشراف الإداري': [['visits', 'visits', '', 'كشف الخروج'], ['iv', 'idari', 'visit', 'تقرير زيارة المشرفة'], ['ip', 'idari', 'program', 'برنامج مشرفة مقيمة'],
    ['is', 'idari', 'suggest', 'الاقتراحات والصعوبات'], ['im', 'idari', 'monthly', 'المتابعة الإدارية الشهرية'], ['me', 'idari', 'mgreval', 'استمارة تقييم المديرة'],
    ['hl', 'idari', 'halls', 'حصر القاعات في المراكز'], ['min', 'min', '', 'محاضر الاجتماعات'], ['files', 'files', '', 'المرفقات']]
};
const MG_ICONS_DEF = [['visits', 'visits', '', 'كشف الخروج'], ['min', 'min', '', 'محاضر الاجتماعات'], ['files', 'files', '', 'المرفقات']];
// «جميع المستندات» أولاً، ثم أيقونات الوحدة
const mgIconsOf = u => [['all', 'all', '', 'جميع المستندات']].concat(MG_ICONS[u] || MG_ICONS_DEF);
function mgIconSet() {
  const unit = document.getElementById('mgUnit').value, k = document.getElementById('mgIcon').value;
  const it = mgIconsOf(unit).find(x => x[0] === k) || mgIconsOf(unit)[0];
  mgTab = it[1]; mgSub = it[2];
  mgRender();
}
// نوع السجل داخل تبويب تحفيظ الصغار
const mgSgKind = x => ['sum', 'eval', 'stf'].indexOf(x.kind) > -1 ? x.kind : 'visit';
const MG_NONE = 'غير محدد (سجلات قديمة)';
const MG_LIMIT = 300;   // أقصى عدد صفوف تُعرض في التفاصيل

const $ = id => document.getElementById(id);
const MG_USER = 'mgr_user', MG_PW = 'mgr_pw';   // مفاتيح مستقلة عن صفحة المشرفات (لا يتداخل الحسابان)

function show(id) {
  ['loginView', 'manageView'].forEach(v => $(v).classList.add('hidden'));
  $(id).classList.remove('hidden');
  window.scrollTo(0, 0);
}

// طلب مستقل بدخول مديرة الوحدة (الاسم + كلمة المرور من ورقة «مديرات الوحدات»)
async function mgApi(action, data) {
  const body = JSON.stringify(Object.assign({ action: action || 'getManage', username: localStorage.getItem(MG_USER) || '', password: localStorage.getItem(MG_PW) || '' }, data || {}));
  for (let i = 0; i < 3; i++) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ctrl.signal });
      clearTimeout(t);
      const out = await res.json();
      if (!out.ok) throw Object.assign(new Error(out.error || 'حدث خطأ'), { final: true, auth: String(out.error || '').indexOf('كلمة المرور') > -1 });
      return out;
    } catch (e) {
      clearTimeout(t);
      if (e.final) throw e;
    }
  }
  throw new Error('تعذّر الاتصال بالخادم، تأكدي من الإنترنت ورابط النشر');
}

async function doLogin() {
  const un = $('un').value.trim(), pw = $('pw').value.trim();
  if (!un) return toast('أدخلي الاسم', false);
  if (!pw) return toast('أدخلي كلمة المرور', false);
  const btn = $('loginBtn');
  localStorage.setItem(MG_USER, un); localStorage.setItem(MG_PW, pw);
  setBtnBusy(btn, true, 'جارِ التحقق...');
  try {
    MG = await mgApi(); mgPrep();
    show('manageView'); mgFillUnits(); mgRender();
  } catch (e) {
    localStorage.removeItem(MG_USER); localStorage.removeItem(MG_PW);
    toast(e.message, false);
  } finally { setBtnBusy(btn, false); }
}
['un', 'pw'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));

function logout() {
  localStorage.removeItem(MG_USER); localStorage.removeItem(MG_PW);
  MG = null; $('un').value = ''; $('pw').value = '';
  loadLoginNames('managers', 'un');
  show('loginView');
}

async function mgLoad() {
  const sum = $('mgSum');
  if (sum && !MG) sum.innerHTML = '<tr><td colspan="6" class="empty">جارِ التحميل...</td></tr>';
  try {
    MG = await mgApi(); mgPrep();
    mgFillUnits(); mgRender();
  } catch (e) {
    if (e.auth) { toast('انتهت صلاحية الدخول، سجّلي الدخول من جديد', false); logout(); return; }
    toast(e.message, false);
    if (sum) sum.innerHTML = '<tr><td colspan="6" class="empty">تعذّر التحميل، اضغطي «تحديث»</td></tr>';
  }
}

(function init() {
  loadLoginNames('managers', 'un');
  if (localStorage.getItem(MG_USER) && localStorage.getItem(MG_PW)) { show('manageView'); mgLoad(); }
})();

// تجهيز الاستمارات: نفس مصفوفة evRows التي تعتمد عليها دوال العرض والتصدير الجاهزة (evals.js / export.js)
function mgPrep() {
  evRows = MG.evals;
  evRows.forEach(evFixType);
}

// توقيعات الاستمارات لملف الإكسل: بدخول مديرة الوحدة (تعوّض النسخة الأصلية في export.js)
async function exFetchSigs(items) {
  items = items.filter(Boolean);
  const out = {};
  if (!items.length) return out;
  const res = await mgApi('getSigs', { items, mgr: true });
  const map = res.data || {};
  await Promise.all(Object.keys(map).map(async id => { const d = await exImgDims(map[id]); if (d) out[id] = d; }));
  return out;
}

// تواقيع نماذج الإشراف الإداري: بدخول مديرة الوحدة (تعوّض النسخة الأصلية في idari-print.js)
idSigFetch = items => mgApi('getSigs', { items, mgr: true }).then(o => o.data || {});
const mgIdari = () => (MG && MG.idari) || [];
function mgIdOpen(id) { const r = mgIdari().find(x => x.id === id); if (r) idView(r); }
function mgIdDo(id, btn, what) { const r = mgIdari().find(x => x.id === id); if (!r) return; what === 'pdf' ? idPdf(r, btn) : what === 'share' ? idShare(r, btn) : idPrint(r, btn); }

// تقارير وحدة تحفيظ الصغار (sighar-print.js): التواقيع بدخول مديرة الوحدة
sgSigFetch = items => mgApi('getSigs', { items, mgr: true }).then(o => o.data || {});
const mgSgh = () => (MG && MG.sgh) || [];
// محاضر الاجتماعات (minutes.js): عرض و PDF ومن اطّلعت
const mgMinById = id => ((MG && MG.minutes) || []).find(x => x.id === id);
function mgMinDo(id, btn, what) { const r = mgMinById(id); if (!r) return; what === 'pdf' ? sgPdf(r, btn) : sgView(r); }
function mgMinAcks(id) {
  const r = mgMinById(id); if (!r) return;
  const tg = (r.data && r.data.target) || {}, acks = r.acks || [];
  let h = '<h2>من اطّلعت على المحضر رقم ( ' + esc(idDigits(r.no)) + ' )</h2><div class="tbl-wrap"><table style="min-width:0"><tr><th>المعلمة</th><th>الحالة</th></tr>';
  if (tg.all) h += acks.length ? acks.map(a => '<tr><td>' + esc(a.name) + '</td><td>✔ ' + esc(a.at) + '</td></tr>').join('') : '<tr><td colspan="2" class="empty">لم تطّلع أي معلمة بعد</td></tr>';
  else h += (tg.ids || []).map((t, i) => { const a = acks.find(k => k.tid === t); return '<tr><td>' + esc((tg.names || [])[i] || t) + '</td><td>' + (a ? '✔ ' + esc(a.at) : '⏳ لم تطّلع') + '</td></tr>'; }).join('');
  document.getElementById('sgModalBody').innerHTML = h + '</table></div>';
  document.getElementById('sgModal').classList.remove('hidden');
}
const arDigitsN = n => idDigits(n);
function mgSgOpen(id) { const r = mgSgh().find(x => x.id === id); if (r) sgView(r); }
function mgSgDo(id, btn, what) { const r = mgSgh().find(x => x.id === id); if (!r) return; what === 'pdf' ? sgPdf(r, btn) : what === 'share' ? sgShare(r, btn) : sgPrint(r, btn); }

const MG_FT = { single: 'بدون تعدد', multi: 'تعدد المجموعات', tabyan: 'التبيان', tj_multi: 'التجويد - تعدد المجموعات', tj_single: 'التجويد - بدون تعدد',
  f_multi: 'القرآن النهائي - تعدد المجموعات', f_single: 'القرآن النهائي - بدون تعدد', f_tabyan: 'التبيان النهائي', f_tj_single: 'التجويد النهائي - بدون تعدد', f_tj_multi: 'التجويد النهائي - تعدد المجموعات' };
const mgFinalLbl = r => (String(r.formType).indexOf('f_') === 0 ? 'نهائي' : 'أسبوعي');
const mgHasW = r => ['single', 'multi', 'f_single', 'f_multi'].indexOf(r.formType) > -1;   // القرآن: له درجة موزونة

// تحميل الاستمارات المعروضة (حسب التصفية) كجدول إكسل واحد
function mgExportEvals(btn) {
  const L = mgEvList();
  if (!L.length) return toast('لا توجد استمارات للتحميل', false);
  const unit = document.getElementById('mgUnit').value || '';
  const m = { title: 'سجل استمارات التقييم — ' + unit, file: 'سجل_الاستمارات_' + exSafe(unit), landscape: true, info: [], sections: [], totals: [], notes: [],
    cols: ['التاريخ', 'المشرفة', 'المركز', 'المعلمة', 'نوع الاستمارة', 'الدرجة من 100', 'الدرجة الموزونة', 'التقدير'],
    widths: [14, 22, 24, 26, 30, 14, 14, 16], gradeCols: [7],
    rows: L.map(([r]) => [r.date, mgWho(r), r.center, r.teacher, MG_FT[r.formType] || '', exNum(r.raw), mgHasW(r) ? exNum(r.weighted) : '', r.grade]) };
  exRun(m, btn);
}

function mgFillUnits() {
  const sel = document.getElementById('mgUnit');
  const cur = sel.value;
  sel.innerHTML = MG.units.map(u => '<option>' + esc(u) + '</option>').join('');
  sel.value = MG.units.indexOf(cur) > -1 ? cur : (MG.units.indexOf(MG.me.unit) > -1 ? MG.me.unit : MG.units[0]);
  document.getElementById('mgUnitBox').classList.toggle('hidden', MG.units.length < 2);   // اختيار الوحدة للمديرة العامة فقط
}

function mgClear() {
  document.getElementById('mgFrom').value = '';
  document.getElementById('mgTo').value = '';
  document.getElementById('mgSup').value = '*';
  mgRender();
}

function mgTabSet(t) {
  mgTab = t;
  document.querySelectorAll('#mgTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  mgRender();
}

function mgPick(key) {
  document.getElementById('mgSup').value = key;
  mgRender();
  document.getElementById('mgSup').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const mgLink = (url, txt) => /^https?:\/\//i.test(url || '') ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(txt) + '</a>' : '—';

let mgKnown = {}, mgSupSel = '*', mgFrom = '', mgTo = '', mgUnitSel = '';
const mgWho = x => mgKnown[x.owner] !== undefined ? mgKnown[x.owner] : MG_NONE;
// الاستمارات المعروضة حالياً مع رقمها في evRows (يلزم لدوال العرض والتحميل الجاهزة)
function mgEvList() {
  const inR = d => { d = String(d || '').slice(0, 10); return (!mgFrom || (d && d >= mgFrom)) && (!mgTo || (d && d <= mgTo)); };
  const out = [];
  evRows.forEach((r, i) => {
    if (r.unit !== mgUnitSel || !inR(r.date)) return;
    const k = mgKnown[r.owner] !== undefined ? r.owner : '';
    if (mgSub && mgTab === 'evals' && (mgSub === 'f') !== (String(r.formType).indexOf('f_') === 0)) return;   // أسبوعية أو نهائية
    if (mgSupSel === '*' || k === mgSupSel) out.push([r, i]);
  });
  return out;
}

function mgRender() {
  if (!MG) return;
  const unit = document.getElementById('mgUnit').value;
  const from = document.getElementById('mgFrom').value, to = document.getElementById('mgTo').value;
  const inR = d => { d = String(d || '').slice(0, 10); return (!from || (d && d >= from)) && (!to || (d && d <= to)); };

  // قائمة الأيقونات حسب الوحدة (نحافظ على الاختيار الحالي)
  const icoSel = document.getElementById('mgIcon');
  if (icoSel) {
    const L = mgIconsOf(unit), sig = unit;
    if (icoSel.dataset.sig !== sig) {
      const prev = icoSel.value;
      icoSel.innerHTML = L.map(x => '<option value="' + x[0] + '">' + esc(x[3]) + '</option>').join('');
      icoSel.value = L.some(x => x[0] === prev) ? prev : L[0][0];
      icoSel.dataset.sig = sig;
    }
    const it = L.find(x => x[0] === icoSel.value) || L[0];
    mgTab = it[1]; mgSub = it[2];
  }
  const users = MG.users.filter(u => u.unit === unit);
  const known = {}; users.forEach(u => { known[u.username] = u.name; });
  const okey = x => known[x.owner] !== undefined ? x.owner : '';   // سجل بلا مشرفة معروفة يُجمع تحت «غير محدد»
  const vs = MG.visits.filter(x => x.unit === unit && inR(x.date));
  const es = MG.evals.filter(x => x.unit === unit && inR(x.date));
  const fs = MG.files.filter(x => x.unit === unit && inR(x.at));
  const ids = mgIdari().filter(x => x.unit === unit && inR(x.date || x.at));
  const mins = ((MG && MG.minutes) || []).filter(x => x.unit === unit && inR(x.at));
  // التبويبات حسب الوحدة: الاستمارات للإشراف التربوي، والنماذج للإداري، والتقارير لتحفيظ الصغار
  const rpts = ((MG && MG.reports) || []).filter(x => x.unit === unit && inR(x.at));
  const TAB_UNITS = { rpt: 'وحدة الإشراف التربوي', evals: 'وحدة الإشراف التربوي', idari: 'وحدة الإشراف الإداري', sgh: 'وحدة تحفيظ الصغار' };
  document.querySelectorAll('#mgTabs button').forEach(bt => {
    const t = bt.dataset.t, u = TAB_UNITS[t];
    const show = t === 'min' ? (unit !== 'وحدة الإشراف الإداري' || mins.length) : !u || u === unit || (t === 'evals' && es.length) || (t === 'rpt' && rpts.length) || (t === 'idari' && ids.length) || (t === 'sgh' && mgSgh().some(x => x.unit === unit));
    bt.classList.toggle('hidden', !show);
    if (!show && mgTab === t && !icoSel) { mgTab = 'visits'; document.querySelectorAll('#mgTabs button').forEach(b2 => b2.classList.toggle('on', b2.dataset.t === 'visits')); }
  });
  const sgs = mgSgh().filter(x => x.unit === unit && inR(x.date || x.at));

  const rows = users.map(u => ({ key: u.username, name: u.name }));
  if (vs.concat(es, fs, ids, sgs, mins).some(x => okey(x) === '')) rows.push({ key: '', name: MG_NONE });

  // قائمة تصفية المشرفة (نحافظ على الاختيار الحالي)
  const supSel = document.getElementById('mgSup');
  const prev = supSel.value || '*';
  const opts = '<option value="*">كل المشرفات</option>' + rows.map(r => '<option value="' + esc(r.key) + '">' + esc(r.name) + '</option>').join('');
  if (supSel.dataset.sig !== opts) {
    supSel.innerHTML = opts; supSel.dataset.sig = opts;
    supSel.value = rows.some(r => r.key === prev) || prev === '*' ? prev : '*';
  }
  const sup = supSel.value;
  mgKnown = known; mgSupSel = sup; mgFrom = from; mgTo = to; mgUnitSel = unit;

  // ملخص أعلى الصفحة
  document.getElementById('mgStats').innerHTML =
    '<div class="stat"><b>' + users.length + '</b><span>المشرفات</span></div>' +
    '<div class="stat"><b>' + vs.length + '</b><span>الزيارات</span></div>' +
    '<div class="stat"><b>' + (es.length + ids.length + sgs.length + mins.length) + '</b><span>' + ((ids.length || sgs.length) && !es.length ? (sgs.length && !ids.length ? 'تقارير الزيارة' : 'النماذج') : (ids.length || sgs.length) ? 'الاستمارات والنماذج' : 'الاستمارات') + '</span></div>' +
    '<div class="stat"><b>' + fs.length + '</b><span>المرفقات</span></div>';

  // جدول المشرفات
  document.getElementById('mgSum').innerHTML = rows.length ? rows.map(r => {
    const v = vs.filter(x => okey(x) === r.key), e = es.filter(x => okey(x) === r.key).concat(ids.filter(x => okey(x) === r.key), sgs.filter(x => okey(x) === r.key), mins.filter(x => okey(x) === r.key)), f = fs.filter(x => okey(x) === r.key);
    const pres = v.filter(x => x.counted).length, abs = v.length - pres;
    const last = v.concat(e, f).map(x => x.at || x.date || '').sort().pop() || '—';
    return '<tr class="mg-row" data-k="' + esc(r.key) + '" onclick="mgPick(this.dataset.k)"><td><b>' + esc(r.name) + '</b></td><td>' + pres +
      '</td><td>' + abs + '</td><td>' + e.length + '</td><td>' + f.length + '</td><td>' + esc(last) + '</td></tr>';
  }).join('') : '<tr><td colspan="6" class="empty">لا توجد مشرفات في هذه الوحدة بعد. أضيفيهن في ورقة «المستخدمات».</td></tr>';

  // التفاصيل
  const mine = x => sup === '*' || okey(x) === sup;
  const who = x => esc(known[x.owner] !== undefined ? known[x.owner] : MG_NONE);
  let head = '', body = '', n = 0, bar = '';
  if (mgTab === 'visits') {
    const L = vs.filter(mine); n = L.length;
    head = '<tr><th>المشرفة</th><th>المركز</th><th>نوع الزيارة</th><th>التاريخ</th><th>الحالة</th><th>التوقيع</th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + esc(x.center || '—') + '</td><td>' + esc(x.type || '—') + '</td><td>' +
      esc(x.date) + ' ' + esc(x.day) + '</td><td>' + esc(x.status) + '</td><td>' + mgLink(x.signature, 'عرض') + '</td></tr>').join('');
  } else if (mgTab === 'evals') {
    const L = mgEvList(); n = L.length;
    head = '<tr><th>المشرفة</th><th>المركز</th><th>المعلمة</th><th>النوع</th><th>التاريخ</th><th>الدرجة من 100</th><th>الموزونة</th><th>التقدير</th><th></th></tr>';
    body = L.slice(0, MG_LIMIT).map(([r, i]) => '<tr><td>' + esc(mgWho(r)) + '</td><td>' + esc(r.center) + '</td><td>' + esc(r.teacher) + '</td><td>' +
      esc(MG_FT[r.formType] || '') + '</td><td>' + esc(r.date) + '</td><td>' + esc(r.raw || '—') + '</td><td>' + (mgHasW(r) ? esc(r.weighted || '—') : '—') + '</td><td>' +
      (r.grade ? gradeTag(r.grade) : '—') + '</td><td style="white-space:nowrap"><button class="btn light" style="padding:6px 12px;font-size:13px" onclick="evView(' + i + ')">عرض</button> ' +
      '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="pdfRow(' + i + ', this)">PDF</button> ' +
      '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="exRow(' + i + ', this)">Excel</button></td></tr>').join('');
    if (n) bar = '<button class="btn light" onclick="mgExportEvals(this)">تحميل الاستمارات المعروضة Excel (' + n + ')</button>';
  } else if (mgTab === 'idari') {
    const L = ids.filter(mine).filter(x => !mgSub || x.kind === mgSub); n = L.length;
    const b = (t, fn) => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="' + fn + '">' + t + '</button> ';
    head = '<tr><th>المشرفة</th><th>النموذج</th><th>المركز / الفصل</th><th>التاريخ</th><th></th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + esc(ID_KINDS[x.kind] || '') + '</td><td>' + esc(x.center || [x.sem, x.year].filter(Boolean).join(' ') || '—') +
      '</td><td>' + esc(idDayName(x)) + ' ' + idHDate(x) + '</td><td style="white-space:nowrap">' + b('عرض', 'mgIdOpen(\'' + esc(x.id) + '\')') +
      b('PDF', 'mgIdDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('مشاركة', 'mgIdDo(\'' + esc(x.id) + '\', this, \'share\')') + '</td></tr>').join('');
  } else if (mgTab === 'rpt') {
    const L = rpts.filter(mine); n = L.length;
    head = '<tr><th>المشرفة</th><th>الخلاصة</th><th>الفترة</th><th>الفصل</th><th>العام</th><th>عدد المعلمات</th><th>آخر حفظ</th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + esc(x.title) + '</td><td>' + esc(x.period) + '</td><td>' + esc(x.semester) + '</td><td>' + esc(x.year) + '</td><td>' + esc(x.count) + '</td><td>' + esc(x.at) + '</td></tr>').join('');
  } else if (mgTab === 'min') {
    const L = mins.filter(mine); n = L.length;
    const b = (t, fn) => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="' + fn + '">' + t + '</button> ';
    head = '<tr><th>المشرفة</th><th>رقم الاجتماع</th><th>التاريخ</th><th>المركز</th><th>يصل إلى</th><th>اطّلعت</th><th></th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => { const tg = (x.data && x.data.target) || {}, cnt = tg.all ? null : (tg.ids || []).length;
      return '<tr><td>' + who(x) + '</td><td>' + esc(idDigits(x.no)) + '</td><td>' + esc(x.dayName || '') + ' ' + esc(idDigits(x.hijri || '')) + '</td><td>' + esc(x.center || '—') + '</td><td>' +
        (tg.all ? 'كل المعلمات' : idDigits(cnt) + ' معلمة') + '</td><td>' + idDigits((x.acks || []).length) + (cnt != null ? ' من ' + idDigits(cnt) : '') + '</td><td style="white-space:nowrap">' +
        b('من اطّلعت', 'mgMinAcks(\'' + esc(x.id) + '\')') + b('عرض', 'mgMinDo(\'' + esc(x.id) + '\', this, \'view\')') + b('PDF', 'mgMinDo(\'' + esc(x.id) + '\', this, \'pdf\')') + '</td></tr>'; }).join('');
  } else if (mgTab === 'sgh') {
    const L = sgs.filter(mine).filter(x => !mgSub || mgSgKind(x) === mgSub); n = L.length;
    const b = (t, fn) => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="' + fn + '">' + t + '</button> ';
    head = '<tr><th>المشرفة</th><th>النموذج</th><th>المعلمة</th><th>المركز</th><th>الفترة</th><th>موضوع الدرس</th><th>التاريخ</th><th>رقم الزيارة</th><th>توقيع المعلمة</th><th></th></tr>';
    const tSt = x => { const d = x.data || {}; return x.kind === 'sum' ? '—' : (d.sigs && d.sigs.tch) ? '✔ وقّعت' + (d.tchAt ? ' ' + esc(d.tchAt) : '') : d.tid ? '⏳ بانتظار توقيعها' : '—'; };
    const isSum = x => x.kind === 'sum';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + (isSum(x) ? 'خلاصة التقارير التعليمية' : x.kind === 'stf' ? esc(x.formName || 'إجراء موظفة') : x.kind === 'eval' ? 'استمارة ' + esc(x.formName || '') + (x.grade ? ' — ' + esc(x.grade) : '') : 'تقرير زيارة') + '</td><td>' +
      (isSum(x) ? arDigitsN((x.data && x.data.rows || []).length) + ' معلمات' : esc(x.teacher)) + '</td><td>' + (isSum(x) ? esc([x.sem, x.year].filter(Boolean).join(' ')) : esc(x.center)) + '</td><td>' + esc(x.period) + '</td><td>' + esc(x.lesson || '—') +
      '</td><td>' + esc((x.data && x.data.dayName) || x.day) + ' ' + idHDate(x) + '</td><td>' + esc(idDigits(x.visitNo)) + '</td><td>' + tSt(x) + '</td><td style="white-space:nowrap">' + b('عرض', 'mgSgOpen(\'' + esc(x.id) + '\')') +
      b('PDF', 'mgSgDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('مشاركة', 'mgSgDo(\'' + esc(x.id) + '\', this, \'share\')') + '</td></tr>').join('');
  } else if (mgTab === 'all') {
    // جميع المستندات في جدول واحد (الأحدث أولاً)
    const b = (t, fn) => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="' + fn + '">' + t + '</button> ';
    const hd = x => x.data && x.data.hy ? idHDate(x) : '';
    const sgName = x => x.kind === 'sum' ? 'خلاصة التقارير التعليمية' : x.kind === 'stf' ? (x.formName || 'إجراء موظفة') : x.kind === 'eval' ? 'استمارة ' + (x.formName || '') : 'تقرير زيارة';
    const all = [];
    vs.filter(mine).forEach(x => all.push({ x, t: 'كشف الخروج', c: esc(x.center || '—'), d: esc(x.date || '') + ' ' + esc(x.day || ''), k: String(x.at || x.date || ''), act: mgLink(x.signature, 'التوقيع') }));
    mgEvList().forEach(([r, i]) => all.push({ x: r, t: (MG_FT[r.formType] || 'استمارة') + ' (' + mgFinalLbl(r) + ')', c: esc(r.center || '') + (r.teacher ? ' — ' + esc(r.teacher) : ''), d: esc(r.date || ''), k: String(r.at || r.date || ''),
      act: b('عرض', 'evView(' + i + ')') + b('PDF', 'pdfRow(' + i + ', this)') }));
    ids.filter(mine).forEach(x => all.push({ x, t: ID_KINDS[x.kind] || 'نموذج', c: esc(x.center || [x.sem, x.year].filter(Boolean).join(' ') || '—'), d: esc(idDayName(x)) + ' ' + idHDate(x), k: String(x.date || x.at || ''),
      act: b('عرض', 'mgIdOpen(\'' + esc(x.id) + '\')') + b('PDF', 'mgIdDo(\'' + esc(x.id) + '\', this, \'pdf\')') }));
    sgs.filter(mine).forEach(x => all.push({ x, t: sgName(x), c: esc(x.center || '') + (x.teacher ? ' — ' + esc(x.teacher) : ''), d: hd(x), k: String(x.date || x.at || ''),
      act: b('عرض', 'mgSgOpen(\'' + esc(x.id) + '\')') + b('PDF', 'mgSgDo(\'' + esc(x.id) + '\', this, \'pdf\')') }));
    mins.filter(mine).forEach(x => all.push({ x, t: 'محضر اجتماع رقم ( ' + esc(idDigits(x.no)) + ' )', c: esc(x.center || '—'), d: esc(x.dayName || '') + ' ' + esc(idDigits(x.hijri || '')), k: String(x.at || ''),
      act: b('عرض', 'mgMinDo(\'' + esc(x.id) + '\', this, \'view\')') + b('PDF', 'mgMinDo(\'' + esc(x.id) + '\', this, \'pdf\')') }));
    rpts.filter(mine).forEach(x => all.push({ x, t: 'خلاصة التقارير', c: esc(x.title || ''), d: esc(x.at || ''), k: String(x.at || ''), act: '' }));
    fs.filter(mine).forEach(x => all.push({ x, t: 'مرفق', c: esc(x.title || ''), d: esc(x.at || ''), k: String(x.at || ''), act: mgLink(x.url, 'فتح') }));
    all.sort((a, z) => z.k.localeCompare(a.k));
    n = all.length;
    head = '<tr><th>المشرفة</th><th>المستند</th><th>المركز / العنوان</th><th>التاريخ</th><th></th></tr>';
    body = all.slice(0, MG_LIMIT).map(o => '<tr><td>' + who(o.x) + '</td><td>' + o.t + '</td><td>' + o.c + '</td><td>' + o.d + '</td><td style="white-space:nowrap">' + o.act + '</td></tr>').join('');
  } else {
    const L = fs.filter(mine); n = L.length;
    head = '<tr><th>المشرفة</th><th>العنوان</th><th>الملف</th><th>وقت الرفع</th><th>المشاركة مع المعلمات</th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + esc(x.title) + '</td><td>' + mgLink(x.url, x.name && x.name !== 'رابط' ? x.name : 'فتح الرابط') +
      '</td><td>' + esc(x.at) + '</td><td>' + (x.target ? (x.target.all ? 'كل المعلمات' : idDigits((x.target.ids || []).length) + ' معلمة') + ' — اطّلعت ' + idDigits((x.acks || []).length) : '—') + '</td></tr>').join('');
  }
  document.getElementById('mgBar').innerHTML = bar;
  document.getElementById('mgHead').innerHTML = head;
  document.getElementById('mgBody').innerHTML = body || '<tr><td colspan="9" class="empty">لا توجد سجلات</td></tr>';
  if (n > MG_LIMIT) document.getElementById('mgBody').insertAdjacentHTML('beforeend', '<tr><td colspan="6" class="empty">يظهر أحدث ' + MG_LIMIT + ' سجل من ' + n + '، استخدمي التاريخ لتضييق العرض</td></tr>');
}
