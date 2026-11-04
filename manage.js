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
  ['loginView', 'manageView', 'achView'].forEach(v => { const el = $(v); if (el) el.classList.add('hidden'); });
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
  const un = $('un').value.trim().toLowerCase(), pw = $('pw').value.trim();
  if (!un) return toast('أدخلي البريد الإلكتروني', false);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(un)) return toast('أدخلي بريدًا إلكترونيًا صحيحًا', false);
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
function mgIdDo(id, btn, what) { const r = mgIdari().find(x => x.id === id); if (!r) return; what === 'xlsx' ? idXlsx(r, btn) : what === 'pdf' ? idPdf(r, btn) : what === 'share' ? idShare(r, btn) : idPrint(r, btn); }

// تقارير وحدة تحفيظ الصغار (sighar-print.js): التواقيع بدخول مديرة الوحدة
sgSigFetch = items => mgApi('getSigs', { items, mgr: true }).then(o => o.data || {});
const mgSgh = () => (MG && MG.sgh) || [];
// محاضر الاجتماعات (minutes.js): عرض و PDF ومن اطّلعت
const mgMinById = id => ((MG && MG.minutes) || []).find(x => x.id === id);
function mgMinDo(id, btn, what) { const r = mgMinById(id); if (!r) return; what === 'xlsx' ? sgXlsx(r, btn) : what === 'pdf' ? sgPdf(r, btn) : sgView(r); }
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
function mgSgDo(id, btn, what) { const r = mgSgh().find(x => x.id === id); if (!r) return; what === 'xlsx' ? sgXlsx(r, btn) : what === 'pdf' ? sgPdf(r, btn) : what === 'share' ? sgShare(r, btn) : sgPrint(r, btn); }

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

// توقيع المديرة في كشف الخروج: يظهر مباشرة كصورة (يُجلب بالخلفية)
const MG_SIG = {};
function mgSigCell(x) {
  if (!x.signature) return '—';
  if (MG_SIG[x.id]) return '<img class="mg-sig" src="' + MG_SIG[x.id] + '" alt="توقيع">';
  return '<img class="mg-sig" data-sid="' + esc(x.id) + '" data-surl="' + esc(x.signature) + '" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">';
}
let mgSigBusy = false;
async function mgSigLoad() {
  if (mgSigBusy) return;
  const els = [...document.querySelectorAll('img.mg-sig[data-sid]')];
  const items = [...new Map(els.map(e => [e.dataset.sid, { id: e.dataset.sid, url: e.dataset.surl }])).values()].filter(x => !MG_SIG[x.id] && MG_SIG[x.id] !== '').slice(0, 60);
  if (!items.length) return;
  mgSigBusy = true;
  try {
    const map = (await mgApi('getSigs', { items, mgr: true })).data || {};
    items.forEach(x => { MG_SIG[x.id] = map[x.id] || ''; });
    document.querySelectorAll('img.mg-sig[data-sid]').forEach(e => { const d = MG_SIG[e.dataset.sid]; if (d) { e.src = d; e.removeAttribute('data-sid'); } else if (d === '') e.replaceWith(document.createTextNode('—')); });
  } catch (e) {}
  mgSigBusy = false;
  if (document.querySelector('img.mg-sig[data-sid]') && items.length === 60) mgSigLoad();
}
// خلاصات التقارير: عرض وتحميل PDF أو Excel (reports.js)
const MG_RPT = {};
async function mgRptGet(id) {
  if (!MG_RPT[id]) MG_RPT[id] = (await mgApi('mgrReport', { id })).data;
  return MG_RPT[id];
}
async function mgRptDo(id, btn, what) {
  const t = btn && btn.textContent;
  if (btn) setBtnBusy(btn, true, '...');
  let R = null;
  try { R = await mgRptGet(id); } catch (e) { toast(e.message || 'تعذّر جلب الخلاصة', false); }
  if (btn) { setBtnBusy(btn, false); btn.textContent = t; }
  if (!R) return;
  if (what === 'pdf') return rpPdf(R, btn);
  if (what === 'xlsx') return rpXlsx(R, btn);
  // عرض: نافذة فوق الصفحة فيها الخلاصة بصفحاتها، مع الحفظ PDF أو Excel
  let ov = document.getElementById('mgDocOv');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'mgDocOv';
    ov.innerHTML = '<div class="mg-ov-in"><div class="mg-ov-bar"><button class="btn light" id="mgOvClose">✕ إغلاق</button><span id="mgOvBtns" class="ex-bar" style="margin:0;flex:1"></span></div><div id="mgOvDoc"></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#mgOvClose').onclick = () => { ov.classList.add('hidden'); document.body.style.overflow = ''; };
  }
  ov.classList.remove('hidden'); document.body.style.overflow = 'hidden';
  $('mgOvBtns').innerHTML = dxBar('mgOvPdf', 'mgOvXls');
  $('mgOvPdf').onclick = e => rpPdf(R, e.currentTarget);
  $('mgOvXls').onclick = e => rpXlsx(R, e.currentTarget);
  const box = $('mgOvDoc');
  box.innerHTML = '<div class="mg-ov-fit"><div class="mg-ov-pages"><style>' + ID_CSS + RP_PDF_CSS + '.idoc .im-page + .im-page{margin-top:16px}</style><div class="idoc ptdoc" style="width:794px;padding:0">' + rpDocPages(R).join('') + '</div></div></div>';
  const fit = () => { const w = box.clientWidth, inn = box.querySelector('.mg-ov-pages'), k = Math.min(1, (w - 4) / 794);
    inn.style.transform = 'scale(' + k + ')'; inn.style.right = Math.max(0, (w - 794 * k) / 2) + 'px'; box.querySelector('.mg-ov-fit').style.height = Math.ceil(inn.offsetHeight * k) + 'px'; };
  fit(); setTimeout(fit, 300);
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
  if (mgPaneCur === 'ach') setTimeout(achRender, 0);
  const segT = $('mgSegTch'), idariU = unit === 'وحدة الإشراف الإداري';   // بيانات المعلمات لا تظهر في الإشراف الإداري
  if (segT) segT.classList.toggle('hidden', idariU);
  if (idariU && mgPaneCur === 'tch') setTimeout(() => mgPane('sum'), 0);
  else if (mgPaneCur === 'tch') setTimeout(mgTchRender, 0);   // تغيّر الوحدة أو التاريخ: تتحدث الإنجازات أيضاً
  const myc = (MG && MG.myc) || {};
  const mycN = users.reduce((n, u) => n + ((myc[u.username] || []).length), 0);
  const stat = (n, l, d) => '<div><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg></div><div><b>' + n + '</b><span>' + l + '</span></div></div>';
  document.getElementById('mgStats').innerHTML =
    stat(users.length, 'المشرفات', '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.4A4.6 4.6 0 0 1 21 19"/>') +
    stat(vs.length, 'الزيارات', '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 13l2 2 3.5-4"/>') +
    stat(mycN, 'المراكز المشرفة عليها', '<path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-5h6v5"/><path d="M9.5 11l1.8 1.8 3.2-3.3"/>') +
    stat(mins.length, 'الاجتماعات', '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3.5 18c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5"/><path d="M11.5 18c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5"/>');

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
      esc(x.date) + ' ' + esc(x.day) + '</td><td>' + esc(x.status) + '</td><td>' + mgSigCell(x) + '</td></tr>').join('');
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
      b('PDF', 'mgIdDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('Excel', 'mgIdDo(\'' + esc(x.id) + '\', this, \'xlsx\')') + b('مشاركة', 'mgIdDo(\'' + esc(x.id) + '\', this, \'share\')') + '</td></tr>').join('');
  } else if (mgTab === 'rpt') {
    const L = rpts.filter(mine); n = L.length;
    const b = (t, fn) => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="' + fn + '">' + t + '</button> ';
    head = '<tr><th>المشرفة</th><th>الخلاصة</th><th>الفترة</th><th>الفصل</th><th>العام</th><th>عدد المعلمات</th><th>آخر حفظ</th><th></th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + esc(x.title) + '</td><td>' + esc(x.period) + '</td><td>' + esc(x.semester) + '</td><td>' + esc(x.year) + '</td><td>' + esc(x.count) + '</td><td>' + esc(x.at) + '</td><td style="white-space:nowrap">' +
      b('عرض', 'mgRptDo(\'' + esc(x.id) + '\', this, \'view\')') + b('PDF', 'mgRptDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('Excel', 'mgRptDo(\'' + esc(x.id) + '\', this, \'xlsx\')') + '</td></tr>').join('');
  } else if (mgTab === 'min') {
    const L = mins.filter(mine); n = L.length;
    const b = (t, fn) => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="' + fn + '">' + t + '</button> ';
    head = '<tr><th>المشرفة</th><th>رقم الاجتماع</th><th>التاريخ</th><th>المركز</th><th>يصل إلى</th><th>اطّلعت</th><th></th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => { const tg = (x.data && x.data.target) || {}, cnt = tg.all ? null : (tg.ids || []).length;
      return '<tr><td>' + who(x) + '</td><td>' + esc(idDigits(x.no)) + '</td><td>' + esc(x.dayName || '') + ' ' + esc(idDigits(x.hijri || '')) + '</td><td>' + esc(x.center || '—') + '</td><td>' +
        (tg.all ? 'كل المعلمات' : idDigits(cnt) + ' معلمة') + '</td><td>' + idDigits((x.acks || []).length) + (cnt != null ? ' من ' + idDigits(cnt) : '') + '</td><td style="white-space:nowrap">' +
        b('من اطّلعت', 'mgMinAcks(\'' + esc(x.id) + '\')') + b('عرض', 'mgMinDo(\'' + esc(x.id) + '\', this, \'view\')') + b('PDF', 'mgMinDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('Excel', 'mgMinDo(\'' + esc(x.id) + '\', this, \'xlsx\')') + '</td></tr>'; }).join('');
  } else if (mgTab === 'sgh') {
    const L = sgs.filter(mine).filter(x => !mgSub || mgSgKind(x) === mgSub); n = L.length;
    const b = (t, fn) => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="' + fn + '">' + t + '</button> ';
    head = '<tr><th>المشرفة</th><th>النموذج</th><th>المعلمة</th><th>المركز</th><th>الفترة</th><th>موضوع الدرس</th><th>التاريخ</th><th>رقم الزيارة</th><th>توقيع المعلمة</th><th></th></tr>';
    const tSt = x => { const d = x.data || {}; return x.kind === 'sum' ? '—' : (d.sigs && d.sigs.tch) ? '✔ وقّعت' + (d.tchAt ? ' ' + esc(d.tchAt) : '') : d.tid ? '⏳ بانتظار توقيعها' : '—'; };
    const isSum = x => x.kind === 'sum';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + (isSum(x) ? 'خلاصة التقارير التعليمية' : x.kind === 'stf' ? esc(x.formName || 'إجراء موظفة') : x.kind === 'eval' ? 'استمارة ' + esc(x.formName || '') + (x.grade ? ' — ' + esc(x.grade) : '') : 'تقرير زيارة') + '</td><td>' +
      (isSum(x) ? arDigitsN((x.data && x.data.rows || []).length) + ' معلمات' : esc(x.teacher)) + '</td><td>' + (isSum(x) ? esc([x.sem, x.year].filter(Boolean).join(' ')) : esc(x.center)) + '</td><td>' + esc(x.period) + '</td><td>' + esc(x.lesson || '—') +
      '</td><td>' + esc((x.data && x.data.dayName) || x.day) + ' ' + idHDate(x) + '</td><td>' + esc(idDigits(x.visitNo)) + '</td><td>' + tSt(x) + '</td><td style="white-space:nowrap">' + b('عرض', 'mgSgOpen(\'' + esc(x.id) + '\')') +
      b('PDF', 'mgSgDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('Excel', 'mgSgDo(\'' + esc(x.id) + '\', this, \'xlsx\')') + b('مشاركة', 'mgSgDo(\'' + esc(x.id) + '\', this, \'share\')') + '</td></tr>').join('');
  } else if (mgTab === 'all') {
    // جميع المستندات في جدول واحد (الأحدث أولاً)
    const b = (t, fn) => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="' + fn + '">' + t + '</button> ';
    const hd = x => x.data && x.data.hy ? idHDate(x) : '';
    const sgName = x => x.kind === 'sum' ? 'خلاصة التقارير التعليمية' : x.kind === 'stf' ? (x.formName || 'إجراء موظفة') : x.kind === 'eval' ? 'استمارة ' + (x.formName || '') : 'تقرير زيارة';
    const all = [];
    vs.filter(mine).forEach(x => all.push({ x, t: 'كشف الخروج', c: esc(x.center || '—'), d: esc(x.date || '') + ' ' + esc(x.day || ''), k: String(x.at || x.date || ''), act: mgSigCell(x) }));
    mgEvList().forEach(([r, i]) => all.push({ x: r, t: (MG_FT[r.formType] || 'استمارة') + ' (' + mgFinalLbl(r) + ')', c: esc(r.center || '') + (r.teacher ? ' — ' + esc(r.teacher) : ''), d: esc(r.date || ''), k: String(r.at || r.date || ''),
      act: b('عرض', 'evView(' + i + ')') + b('PDF', 'pdfRow(' + i + ', this)') + b('Excel', 'exRow(' + i + ', this)') }));
    ids.filter(mine).forEach(x => all.push({ x, t: ID_KINDS[x.kind] || 'نموذج', c: esc(x.center || [x.sem, x.year].filter(Boolean).join(' ') || '—'), d: esc(idDayName(x)) + ' ' + idHDate(x), k: String(x.date || x.at || ''),
      act: b('عرض', 'mgIdOpen(\'' + esc(x.id) + '\')') + b('PDF', 'mgIdDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('Excel', 'mgIdDo(\'' + esc(x.id) + '\', this, \'xlsx\')') }));
    sgs.filter(mine).forEach(x => all.push({ x, t: sgName(x), c: esc(x.center || '') + (x.teacher ? ' — ' + esc(x.teacher) : ''), d: hd(x), k: String(x.date || x.at || ''),
      act: b('عرض', 'mgSgOpen(\'' + esc(x.id) + '\')') + b('PDF', 'mgSgDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('Excel', 'mgSgDo(\'' + esc(x.id) + '\', this, \'xlsx\')') }));
    mins.filter(mine).forEach(x => all.push({ x, t: 'محضر اجتماع رقم ( ' + esc(idDigits(x.no)) + ' )', c: esc(x.center || '—'), d: esc(x.dayName || '') + ' ' + esc(idDigits(x.hijri || '')), k: String(x.at || ''),
      act: b('عرض', 'mgMinDo(\'' + esc(x.id) + '\', this, \'view\')') + b('PDF', 'mgMinDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('Excel', 'mgMinDo(\'' + esc(x.id) + '\', this, \'xlsx\')') }));
    rpts.filter(mine).forEach(x => all.push({ x, t: 'خلاصة التقارير', c: esc(x.title || ''), d: esc(x.at || ''), k: String(x.at || ''),
      act: b('عرض', 'mgRptDo(\'' + esc(x.id) + '\', this, \'view\')') + b('PDF', 'mgRptDo(\'' + esc(x.id) + '\', this, \'pdf\')') + b('Excel', 'mgRptDo(\'' + esc(x.id) + '\', this, \'xlsx\')') }));
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
  mgSigLoad();
  if (n > MG_LIMIT) document.getElementById('mgBody').insertAdjacentHTML('beforeend', '<tr><td colspan="6" class="empty">يظهر أحدث ' + MG_LIMIT + ' سجل من ' + n + '، استخدمي التاريخ لتضييق العرض</td></tr>');
}

/* ===================== الإنجازات: زيارات كل مشرفة للمراكز المشرفة عليها ===================== */
// مطابقة المركز: الاسم (بدون «الفترة ...» وبتوحيد الهمزات) + الفترة
const achName = c => String(c || '').replace(/\s*[-–—]?\s*(ال)?فتر(ة|تين|تان)\s+.*$/, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[\s\u0640]+/g, '').trim();   // بدون مسافات (عبدالله = عبد الله)
const achPer = t => { t = String(t || ''); const m = /مسائ|عصر/.test(t), s = /صباح/.test(t); return m && s ? 'b' : m ? 'p' : s ? 'a' : ''; };
// «مركز واحد / مركزان / ٣ مراكز / ١١ مركزاً»
const achCnt = n => n === 1 ? 'مركز واحد' : n === 2 ? 'مركزان' : idDigits(n) + (n >= 3 && n <= 10 ? ' مراكز' : ' مركزاً');
const achShow = c => String(c.name || '') + (c.period ? ' (' + c.period + ')' : '');
// مفتاح «الملخص | الإنجازات» أعلى الصفحة
let mgPaneCur = 'sum';
function mgPane(k) {
  mgPaneCur = k;
  document.querySelectorAll('#mgSeg button').forEach(b => b.classList.toggle('on', b.dataset.p === k));
  $('mgPaneSum').classList.toggle('hidden', k !== 'sum');
  $('mgPaneAch').classList.toggle('hidden', k !== 'ach');
  $('mgPaneTch').classList.toggle('hidden', k !== 'tch');
  $('mgStats').classList.toggle('hidden', k !== 'sum');   // للإنجازات ملخصها الخاص
  if (k === 'ach') achRender();
  if (k === 'tch') mgTchRender();
}
// بيانات المعلمات: كل معلمة سجّلت بياناتها من «بياناتي الشخصية»،
// والبحث بالاسم يشمل أيضاً من لم تسجّل وعبّأت المشرفة بياناتها في الاستمارات (من آخر استمارة لها)
const mgTN = s => String(s || '').replace(/\s*\(\s*[٠-٩0-9]+\s*\)\s*$/, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, '');
const mgCName = c => String(c || '').replace(/\s*[-–—]?\s*(ال)?فتر(ة|تين|تان)\s+.*$/, '').trim() || String(c || '').trim();
const mgPer = p => { p = String(p || ''); return /صباح/.test(p) && /مسائ/.test(p) ? 'الصباحية والمسائية' : /مسائ/.test(p) ? 'المسائية' : /صباح/.test(p) ? 'الصباحية' : ''; };
function mgFormTeachers(reg) {
  const have = {}; reg.forEach(p => { have[mgTN(p.name)] = 1; });
  const best = {};
  const add = (name, o, when) => {
    const k = mgTN(name); if (!k || have[k]) return;
    if (!best[k] || String(when) > String(best[k]._w)) best[k] = Object.assign({ name: String(name).replace(/\s*\(\s*[٠-٩0-9]+\s*\)\s*$/, '').trim(), src: 'form', _w: when }, o);
  };
  (MG.evals || []).forEach(r => add(r.teacher, { center: mgCName(r.center), period: mgPer(r.period || r.center), qq: r.qual || '', cat: r.cat || '', exp: r.years || '',
    srcLabel: 'آخر استمارة تقييم (الإشراف التربوي)' + (r.date ? ' بتاريخ ' + r.date : '') }, (r.date || '') + (r.at || '')));
  (MG.sgh || []).forEach(r => { const f = (r.data && r.data.f) || {};
    add(r.teacher, { center: mgCName(r.center), period: mgPer(r.period || r.center), qq: f.quranQual || '', qual: f.qual || '', cat: f.cat || '', exp: f.years || '',
      srcLabel: 'آخر ' + (r.kind === 'eval' ? 'استمارة' : 'تقرير') + ' (تحفيظ الصغار)' + (r.date ? ' بتاريخ ' + r.date : '') }, (r.date || '') + (r.at || '')); });
  return Object.keys(best).map(k => best[k]).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}
let mgTchKey = null;
function mgTchRender() {
  if (!MG || typeof tpLoadView !== 'function') return;
  const list = (MG.tprof || []).slice().sort((a, b) => String(a.center).localeCompare(String(b.center), 'ar') || String(a.name).localeCompare(String(b.name), 'ar'));
  const extra = mgFormTeachers(list);
  const key = list.length + '|' + extra.length + '|' + list.map(p => p.at).join();
  if (mgTchKey && $('tpBox').dataset.built) { TP_LIST = list; TP_CTX.extra = extra; if (key !== mgTchKey) tpRenderList(); mgTchKey = key; return; }   // تحديث دون إغلاق الاستمارة المفتوحة
  mgTchKey = key;
  tpLoadView('tpBox', () => Promise.resolve({ data: list }), { byCenter: 1, title: 'بيانات المعلمات', who: '', extra,
    empty: 'لم تسجّل أي معلمة بياناتها بعد. ويمكنكِ البحث باسم المعلمة لعرض بياناتها من الاستمارات.' });
}
function achOpen() { mgPane('ach'); }
function achRender() {
  if (!MG) return;
  const unit = document.getElementById('mgUnit').value;
  const from = document.getElementById('mgFrom').value, to = document.getElementById('mgTo').value;
  const inR = d => { d = String(d || '').slice(0, 10); return (!from || (d && d >= from)) && (!to || (d && d <= to)); };
  const users = MG.users.filter(u => u.unit === unit), myc = MG.myc || {};
  // الزيارات المحسوبة (تمت الزيارة) لكل مشرفة: مفتاح المركز ← عدد الزيارات
  const byU = {};
  MG.visits.filter(v => v.unit === unit && v.counted && v.center && inR(v.date)).forEach(v => {
    const k = achName(v.center) + '|' + achPer(v.center);
    const m = byU[v.owner] = byU[v.owner] || {}; m[k] = (m[k] || 0) + 1;
  });
  const list = users.map(u => {
    const C = myc[u.username] || [], seen = byU[u.username] || {};
    const visited = [], rest = [];
    C.forEach(c => { const k = achName(c.name) + '|' + achPer(c.period); (seen[k] || seen[achName(c.name) + '|'] ? visited : rest).push(c); });
    const pct = C.length ? Math.round(visited.length * 100 / C.length) : 0;
    return { u, C, visited, rest, pct, done: C.length > 0 && !rest.length };
  }).sort((a, b) => (b.done - a.done) || (b.pct - a.pct) || a.u.name.localeCompare(b.u.name, 'ar'));
  const D = n => idDigits(n);
  const tot = list.reduce((o, x) => { o.c += x.C.length; o.v += x.visited.length; return o; }, { c: 0, v: 0 });
  const doneN = list.filter(x => x.done).length;
  const range = from || to ? 'من ' + (from || '—') + ' إلى ' + (to || '—') : 'كل الفترات';
  const R = 32, L = 2 * Math.PI * R;
  const ring = p => '<div class="ach-ring"><svg viewBox="0 0 76 76"><circle class="bg" cx="38" cy="38" r="' + R + '" fill="none" stroke-width="8"/><circle class="fg" cx="38" cy="38" r="' + R + '" fill="none" stroke-width="8" stroke-dasharray="' + L.toFixed(1) + '" stroke-dashoffset="' + (L * (1 - p / 100)).toFixed(1) + '"/></svg><em>' + D(p) + '٪</em></div>';
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.6"/></svg>';
  const card = x => {
    const ini = String(x.u.name || '?').trim().charAt(0);
    let h = '<div class="ach-card' + (x.done ? ' done' : '') + '"><div class="ach-top"><div class="ach-av">' + esc(ini) + '</div><div class="ach-nm"><b>' + esc(x.u.name) + '</b><small>' +
      (x.C.length ? achCnt(x.C.length) + ' تشرف عليها' : 'لم تحدد مراكزها بعد') + '</small></div>' + (x.C.length ? ring(x.pct) : '') + '</div>';
    if (!x.C.length) return h + '<div class="ach-none">لم تحدد المشرفة «المراكز المشرفة عليها» بعد</div></div>';
    h += '<div class="ach-nums"><div><b>' + D(x.C.length) + '</b><span>المراكز</span></div><div class="v"><b>' + D(x.visited.length) + '</b><span>تمت زيارتها</span></div><div class="r"><b>' + D(x.rest.length) + '</b><span>المتبقي</span></div></div>' +
      '<div class="ach-bar"><i style="width:' + x.pct + '%"></i></div>';
    if (x.done) h += '<div class="ach-done">' + check + 'تمت زيارة جميع المراكز</div>';
    else h += '<details class="ach-rest"><summary>المراكز المتبقية (' + D(x.rest.length) + ') ▾</summary><div class="ach-chips">' + x.rest.map(c => '<span>' + esc(achShow(c)) + '</span>').join('') + '</div></details>';
    if (x.visited.length && !x.done) h += '<details class="ach-rest"><summary>تمت زيارتها (' + D(x.visited.length) + ') ▾</summary><div class="ach-chips ok">' + x.visited.map(c => '<span>' + esc(achShow(c)) + '</span>').join('') + '</div></details>';
    return h + '</div>';
  };
  const pctAll = tot.c ? Math.round(tot.v * 100 / tot.c) : 0;
  const IC = {
    u: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.3c2.3.2 4 1.8 4.7 4.7"/></svg>',
    s: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z"/></svg>',
    c: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/></svg>',
    r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'
  };
  const tile = (ic, n, t, g) => '<div' + (g ? ' class="g"' : '') + '><span class="ic">' + ic + '</span><div><b>' + n + '</b><span>' + t + '</span></div></div>';
  $('achBody').innerHTML = '<div class="ach-hero"><div><h2><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>إنجازات المشرفات</h2>' +
    '<p>' + esc(unit) + ' — ' + esc(range) + '</p>' +
    '<div class="ach-big">' + D(pctAll) + '<span class="pc">٪</span><small>نسبة إنجاز الوحدة</small></div><div class="ach-hbar"><i style="width:' + pctAll + '%"></i></div></div>' +
    '<div class="ach-tiles">' + tile(IC.u, D(users.length), 'المشرفات') + tile(IC.s, D(doneN), 'أتمّت جميع مراكزها', 1) +
    tile(IC.c, D(tot.v) + ' / ' + D(tot.c), 'تمت زيارتها') + tile(IC.r, D(tot.c - tot.v), 'المتبقي', 1) + '</div></div>' +
    (list.length ? '<div class="ach-grid">' + list.map(card).join('') + '</div>' : '<p class="empty">لا توجد مشرفات في هذه الوحدة</p>');
}
