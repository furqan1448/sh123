/* ===================== استمارة تقييم المديرة للمعلمة (صفحة «إدارة المراكز») =====================
   البنود والدرجات منقولة من ملف الإكسل كما هي (المجموع ١٠٠، والمعدل = المجموع ÷ ٥).
   تعبّئها المديرة لمعلمات مركزها، وتوقّع، وتحفظها PDF أو Excel بالكليشة الحمراء.
   وتجلب المشرفة درجتها في «خلاصة التقارير» (تقييم المديرة). يتطلب: config.js، idari-print.js، doc-xlsx.js، list-ui.js، centers.js */
const MGE_GROUPS = [
  { t: 'الأساسية', p: '٨٠٪', items: [['الحرص على تنظيم الأعمال وتفعيلها', 2], ['المحافظة على الدوام وقلة الأعذار', 5], ['الاهتمام بالمستوى العام للدارسات', 6],
    ['المظهر العام للحجاب واللباس + القدوة الحسنة', 5], ['التعامل مع الجميع بحكمة واتزان', 4], ['الاستجابة للتعليمات والأنظمة', 5], ['وضوح الصوت', 3],
    ['تحقيق الأهداف التربوية وتثبيت العقيدة والتوجيه والإرشاد والربط بالواقع', 6], ['الاهتمام بالنمو المعرفي', 5], ['استخدام الفصحى وصحة الإملاء', 2],
    ['التحضير الجيد كتابياً وذهنياً وتوزيع المنهج والسير وفقه', 5], ['صحة المادة العلمية وتسلسلها والتمكن من إيصالها', 6], ['تقدير المسؤولية للمهام الموكلة إليها', 7]] },
  { t: 'الفرعية', p: '١٥٪', items: [['ضبط الفصل ومراعاة الفروق الفردية', 4], ['الاهتمام بالتشويق والإبداع', 3], ['التنويع في طريقة عرض الدرس', 4], ['صياغة الأهداف وشمولها', 4],
    ['صحة توزيع زمن الحصة', 4], ['تنويع التطبيق والشمولية', 3], ['صحة استخدام الوسيلة التعليمية', 3], ['الاهتمام بالتمهيد', 3], ['إدارة المجموعات', 3],
    ['قراءة المجيدات فأقل', 1], ['تسميع الواجب', 1], ['القراءة النموذجية للمعلمة', 2], ['القراءة الجماعية', 1]] },
  { t: 'الثانوية', p: '٥٪', items: [['تفقد المصاحف', 2], ['الاهتمام بتعيين الواجب', 1]] }
];
const MGE_ITEMS = MGE_GROUPS.reduce((a, g) => a.concat(g.items), []);
const MGE_QQ = ['مجازة', 'خاتمة', 'حافظة', 'دورات حفظ', 'خريجة دبلوم عالي إعداد المعلمات', 'خريجة دبلوم متوسط لتأهيل المعلمات', 'خريجة تأهيل معلمات', 'خريجة دورة تأهيل منتهي بالتوظيف', 'اختبار مكتب'];
const MGE_CATS = ['أمهات', 'متعلمات', 'ناشئة', 'أمهات ومتعلمات', 'متعلمات وناشئة', 'أمهات وناشئة', 'جميع الفئات'];
const MGE_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
let MEL = [], meEdit = null, MGE_T = null, meDocCur = null, meSigs = {};
const meD = s => typeof idDigits === 'function' ? idDigits(s) : String(s == null ? '' : s);

/* ---------- الواجهة (تُبنى مرة واحدة داخل الصفحة) ---------- */
(function meBuildUi() {
  const wrap = document.querySelector('.wrap'); if (!wrap) return;
  const st = document.createElement('style');
  st.textContent = `
.me-top{display:grid;grid-template-columns:repeat(4,1fr);gap:0 10px}
.me-top .w2{grid-column:span 2}
.me-top label{font-size:13px;margin:8px 0 4px}
.me-top input,.me-top select{padding:7px 10px;font-size:14px;height:38px}
@media(max-width:700px){.me-top{grid-template-columns:1fr 1fr}}
.me-grp{font-weight:800;color:#fff;background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-radius:10px;padding:7px 12px;margin:14px 0 8px;display:flex;justify-content:space-between}
.me-it{display:grid;grid-template-columns:28px 1fr 74px;gap:8px;align-items:center;padding:7px 0;border-bottom:1px dashed var(--line)}
.me-it .n{width:26px;height:26px;border-radius:50%;background:#f3e6e8;color:var(--primary);font-weight:800;font-size:12.5px;display:flex;align-items:center;justify-content:center}
.me-it b{font-weight:700;font-size:14.5px}
.me-it .sc{display:flex;align-items:center;gap:4px}
.me-it .sc input{width:48px;padding:6px 4px;text-align:center;margin:0;height:34px}
.me-it .sc small{color:var(--muted)}
.me-it .nt{grid-column:2/-1}
.me-it .nt input{margin:0;padding:6px 10px;font-size:13.5px;height:34px}
@media(min-width:760px){.me-it{grid-template-columns:28px 1fr 74px 260px}.me-it .nt{grid-column:auto}}
.me-tot{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.me-tot>div{background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;border-radius:14px;padding:10px;text-align:center}
.me-tot b{display:block;font-size:22px}.me-tot span{font-size:12.5px;color:#f1dde0;font-weight:700}
`;
  document.head.appendChild(st);
  const div = document.createElement('div');
  div.innerHTML = `
  <div id="meListView" class="hidden">
    <button class="back" onclick="cShow('homeView')">← رجوع</button>
    <div class="card">
      <h2>استمارة تقييم المعلمة</h2>
      <button class="btn block" onclick="meNew()">+ استمارة تقييم جديدة</button>
    </div>
    <div class="card">
      <h2>الاستمارات المحفوظة</h2>
      <div id="meList" class="rc-list"></div>
    </div>
  </div>
  <div id="meForm" class="hidden">
    <button class="back" onclick="meOpenList()">← رجوع</button>
    <div class="card">
      <h2 id="meTitle">استمارة تقييم المعلمة</h2>
      <datalist id="meTList"></datalist>
      <div class="me-top">
        <div class="w2"><label for="meTeacher">اسم المعلمة</label><input id="meTeacher" list="meTList" autocomplete="off" placeholder="اختاري من القائمة"></div>
        <div><label for="mePeriod">الفترة</label><select id="mePeriod"><option value="">اختاري</option><option>صباحية</option><option>مسائية</option></select></div>
        <div><label for="meDate">التاريخ</label><input id="meDate" type="date" onchange="meDayFill()"></div>
        <div><label for="meF_day">اليوم</label><select id="meF_day"><option value="">اختاري</option>${MGE_DAYS.map(d => '<option>' + d + '</option>').join('')}</select></div>
        <div><label for="meF_visitNo">رقم الزيارة</label><input id="meF_visitNo" inputmode="numeric"></div>
        <div><label for="meF_kind">نوعها</label><select id="meF_kind"><option value="">اختاري</option><option>تقييم</option><option>توجيه</option></select></div>
        <div><label for="meF_years">سنوات الخبرة</label><input id="meF_years" inputmode="numeric"></div>
        <div class="w2"><label for="meF_qq">المؤهل في القرآن</label><select id="meF_qq"><option value="">اختاري</option>${MGE_QQ.map(d => '<option>' + d + '</option>').join('')}</select></div>
        <div class="w2"><label for="meF_cat">الفئة</label><select id="meF_cat"><option value="">اختاري</option>${MGE_CATS.map(d => '<option>' + d + '</option>').join('')}</select></div>
        <div><label for="meF_present">عدد الحاضرات</label><input id="meF_present" inputmode="numeric"></div>
        <div><label for="meF_cnt">العدد الكلي</label><input id="meF_cnt" inputmode="numeric"></div>
        <div class="w2"><label for="meF_lesson">عنوان الدرس</label><input id="meF_lesson"></div>
      </div>
      <div class="id-hint ok" id="meHint"></div>
    </div>
    <div style="margin-bottom:12px"><button type="button" class="btn light" style="width:100%" onclick="meFillMax()">تعبئة البنود الفارغة بالدرجة الكاملة ثم التعديل</button></div>
    <div class="card" id="meItems"></div>
    <div class="card">
      <div class="me-tot"><div><b id="meTotal">٠</b><span>المجموع من ١٠٠</span></div><div><b id="meAvg">٠</b><span>المعدل (من ٢٠)</span></div><div><b id="meGrade">—</b><span>التقدير</span></div></div>
      <label for="meMgrName">اسم المديرة</label><input id="meMgrName">
      <label>توقيع المديرة</label>
      <div id="meSigW"></div>
      <button id="meSaveBtn" class="btn block" onclick="meSave(this)">حفظ الاستمارة</button>
    </div>
  </div>
  <div id="meDocView" class="hidden">
    <button class="back" onclick="meOpenList()">← رجوع</button>
    <div class="card"><div class="ex-bar" id="meBar"></div><div id="meDoc"></div></div>
  </div>`;
  [...div.children].forEach(c => wrap.appendChild(c));
  let n = 0;
  document.getElementById('meItems').innerHTML = MGE_GROUPS.map(g => '<div class="me-grp"><span>' + g.t + ' (' + g.p + ')</span><span>' + meD(g.items.reduce((a, x) => a + x[1], 0)) + '</span></div>' +
    g.items.map(([t, mx]) => { const i = n++; return '<div class="me-it"><span class="n">' + meD(i + 1) + '</span><b>' + t + '</b><span class="sc"><input inputmode="decimal" data-me="' + i + '" data-max="' + mx + '" placeholder="٠"><small>/' + meD(mx) + '</small></span>' +
      '<div class="nt"><input data-men="' + i + '" placeholder="ملاحظات (اختياري)"></div></div>'; }).join('')).join('');
  document.getElementById('meItems').addEventListener('input', meCalc);
  document.getElementById('meItems').addEventListener('change', e => {
    const el = e.target; if (!el.dataset.me) return;
    let v = String(el.value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
    if (v !== '') { v = Math.max(0, Math.min(+v || 0, +el.dataset.max)); el.value = v; }
    meCalc();
  });
  document.getElementById('meTeacher').addEventListener('change', meAutoFill);
  document.getElementById('meForm').addEventListener('input', meDraftSave);
  document.getElementById('meForm').addEventListener('change', meDraftSave);
})();
const meSig = makeSigWidget('meSigW', {});

/* ---------- القائمة ---------- */
function meOpenList() { cShow('meListView'); meLoad(); }
async function meLoad() {
  meRender();
  try { MEL = (await cApi('c_me_list')).data || []; meRender(); }
  catch (e) { if (e.auth) { toast('انتهت صلاحية الدخول، سجّلي الدخول من جديد', false); cLogout(); } else toast(e.message, false); }
}
function meRender() {
  rcStart();
  if (!MEL.length) { $('meList').innerHTML = rcEmpty('لا توجد استمارات تقييم محفوظة بعد'); return; }
  $('meList').innerHTML = MEL.map((r, i) => {
    const id = esc(r.id);
    return rcCard({ no: meD(i + 1), title: esc(r.teacher), sub: esc(r.period || ''),
      meta: [rcM('التاريخ', r.date ? meHijri(r.date) : ''), rcM('المجموع', meD(r.total) + ' / ١٠٠'), rcM('المعدل', meD(r.avg))],
      main: [['عرض', 'meView(\'' + id + '\')'], ['PDF', 'meDo(\'' + id + '\', this, \'pdf\')'], ['Excel', 'meDo(\'' + id + '\', this, \'xlsx\')']],
      more: [['تعديل', 'meOpenEdit(\'' + id + '\')'], ['حذف', 'meDel(\'' + id + '\')', 'danger']] });
  }).join('');
}
const meById = id => MEL.find(x => x.id === id);

/* ---------- النموذج ---------- */
const meDraftKey = () => 'ctr_me_draft_' + (localStorage.getItem(C_NAME) || '');
let meDraftT = 0, meDraftOff = false;
function meCollect() {
  const f = {};
  ['visitNo', 'kind', 'years', 'qq', 'present', 'cnt', 'cat', 'day', 'lesson'].forEach(k => f[k] = ($('meF_' + k).value || '').trim());
  return { teacher: $('meTeacher').value.trim(), tid: $('meTeacher').dataset.tid || '', period: $('mePeriod').value, date: $('meDate').value, mgrName: $('meMgrName').value.trim(),
    data: { f, items: MGE_ITEMS.map((_, i) => ({ s: document.querySelector('[data-me="' + i + '"]').value.trim(), n: document.querySelector('[data-men="' + i + '"]').value.trim() })) } };
}
function meApply(r) {
  meDraftOff = true;
  const d = (r && r.data) || {}, f = d.f || {};
  $('meTeacher').value = (r && r.teacher) || ''; $('meTeacher').dataset.tid = (r && r.tid) || '';
  selSet('mePeriod', (r && r.period) || ''); $('meDate').value = (r && r.date) || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  ['visitNo', 'kind', 'years', 'qq', 'present', 'cnt', 'cat', 'day', 'lesson'].forEach(k => selSet('meF_' + k, f[k] || ''));
  MGE_ITEMS.forEach((_, i) => { const x = (d.items || [])[i] || {}; document.querySelector('[data-me="' + i + '"]').value = x.s || ''; document.querySelector('[data-men="' + i + '"]').value = x.n || ''; });
  $('meMgrName').value = (r && r.mgrName) || (function () { try { return localStorage.getItem('ctr_me_mgr') || ''; } catch (e) { return ''; } })();
  if (!f.day) meDayFill();
  meCalc();
  meDraftOff = false;
}
function meDayFill() { const v = $('meDate').value; if (!v) return; const d = new Date(v + 'T12:00:00'); if (!isNaN(d)) $('meF_day').value = MGE_DAYS[d.getDay()]; }
function meNew() {
  meEdit = null; meSig.reset();
  let dr = null; try { dr = JSON.parse(localStorage.getItem(meDraftKey()) || 'null'); } catch (e) {}
  meApply(dr && dr.r ? dr.r : null);
  $('meHint').textContent = dr && dr.r ? '✔ استُعيد ما كتبتِه سابقاً ولم يُحفظ (مسودة).' : '';
  $('meTitle').textContent = 'استمارة تقييم المعلمة';
  cShow('meForm'); meLoadTeachers();
}
function meOpenEdit(id) {
  const r = meById(id); if (!r) return;
  meEdit = r; meSig.reset();
  meApply(r);
  if (r.data && r.data.sig) meSig.keepOld('الإبقاء على التوقيع السابق');
  $('meHint').textContent = '';
  $('meTitle').textContent = 'تعديل استمارة تقييم المعلمة';
  cShow('meForm'); meLoadTeachers();
}
function meDraftSave() {
  if (meDraftOff || meEdit) return;
  clearTimeout(meDraftT);
  meDraftT = setTimeout(() => { const r = meCollect(); if (!r.teacher && r.data.items.every(x => !x.s)) return; try { localStorage.setItem(meDraftKey(), JSON.stringify({ r, t: Date.now() })); } catch (e) {} }, 500);
}
function meCalc() {
  let t = 0;
  MGE_ITEMS.forEach((_, i) => { const v = parseFloat(String(document.querySelector('[data-me="' + i + '"]').value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))); if (!isNaN(v)) t += v; });
  t = Math.round(t * 100) / 100;
  $('meTotal').textContent = meD(t); $('meAvg').textContent = meD(Math.round(t / 5 * 100) / 100);
  $('meGrade').textContent = t >= 90 ? 'ممتاز' : t >= 80 ? 'جيد جداً' : t >= 70 ? 'جيد' : t >= 60 ? 'مقبول' : t >= 50 ? 'ضعيف' : t > 0 ? 'لم تجتز' : '—';
}
function meFillMax() {
  let c = 0;
  document.querySelectorAll('#meItems [data-me]').forEach(i => { if (i.value === '') { i.value = i.dataset.max; c++; } });
  meCalc(); meDraftSave();
  toast(c ? 'تمت تعبئة ' + c + ' بند بالدرجة الكاملة، عدّلي ما يلزم' : 'كل البنود معبأة');
}
// أسماء المعلمات: معلمات المركز أولاً ثم سجل المعلمات
async function meLoadTeachers() {
  if (MGE_T) return;
  try {
    MGE_T = (await cApi('c_me_teachers')).data || [];
    $('meTList').innerHTML = MGE_T.map(t => '<option value="' + esc(t.name) + '">' + (t.mine ? 'من معلمات المركز' : '') + '</option>').join('');
  } catch (e) { MGE_T = null; }
}
// عند اختيار المعلمة: تُعبّأ الخانات الفارغة من «بياناتي الشخصية»
async function meAutoFill() {
  const el = $('meTeacher'), name = el.value.trim(); if (!name) return;
  const t = (MGE_T || []).find(x => x.name === name); el.dataset.tid = t ? t.tid : '';
  let p = null;
  try { p = (await cApi('c_tplookup', { name, tid: t ? t.tid : '' })).data; } catch (e) {}
  if (!p || el.value.trim() !== name) return;
  const done = [];
  const put = (id, v) => { const x = $(id); if (!x || !v || x.value) return; if (x.tagName === 'SELECT' && ![...x.options].some(o => o.value === v)) return; x.value = v; done.push(id); };
  const qqMap = { 'دبلوم عالي': 'خريجة دبلوم عالي إعداد المعلمات', 'دبلوم متوسط': 'خريجة دبلوم متوسط لتأهيل المعلمات', 'دبلوم تأهيل منتهي بالتوظيف': 'خريجة دورة تأهيل منتهي بالتوظيف', 'اختبار مكتب': 'اختبار مكتب' };
  put('meF_qq', qqMap[p.qq] || p.qq);
  put('meF_years', String(p.exp || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  put('meF_cat', p.cat);
  put('mePeriod', /مسائ/.test(p.period) && !/صباح/.test(p.period) ? 'مسائية' : /صباح/.test(p.period) && !/مسائ/.test(p.period) ? 'صباحية' : '');
  if (p.tid) el.dataset.tid = p.tid;
  $('meHint').textContent = done.length ? '✔ عُبّئت بيانات المعلمة من «بياناتي الشخصية» (يمكن التعديل).' : '';
  meDraftSave();
}
async function meSave(btn) {
  const r = meCollect();
  if (!r.teacher) return toast('اختاري اسم المعلمة', false);
  if (r.data.items.every(x => !x.s)) return toast('أدخلي درجات البنود', false);
  const sig = meSig.get() || (meEdit && meEdit.data && meEdit.data.sig ? 'keep' : '');
  setBtnBusy(btn, true, 'جارِ الحفظ...');
  try {
    const out = await cApi('c_me_save', Object.assign({ id: meEdit ? meEdit.id : '', signature: sig }, r));
    if (sig && sig !== 'keep') meSigs[out.id] = sig;
    try { localStorage.removeItem(meDraftKey()); localStorage.setItem('ctr_me_mgr', r.mgrName); } catch (e) {}
    toast('تم حفظ الاستمارة');
    meEdit = null;
    meOpenList();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}
async function meDel(id) {
  if (!confirm('حذف هذه الاستمارة نهائياً؟')) return;
  try { await cApi('c_me_del', { id }); MEL = MEL.filter(x => x.id !== id); meRender(); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); }
}

/* ---------- العرض والطباعة (PDF وExcel بالكليشة) ---------- */
const MGE_CSS = `
.im-page.mep{width:794px;min-height:1123px;position:relative;background:#fff}
.im-page.mep .idc-body{padding:0 30px 20px}
.im-page.mep .idc-title{font-size:24px;margin:10px 0 8px}
.im-page.mep table{table-layout:fixed;width:100%;border-collapse:collapse}
.im-page.mep td,.im-page.mep th{border:1px solid #000;font-size:12.5px;padding:3px 6px;line-height:1.35}
.im-page.mep .me-info td{background:#fff;text-align:right;height:26px}
.im-page.mep .me-info{margin-bottom:8px}
.im-page.mep th{background:#f2dbdb !important;color:#000;font-weight:800;height:26px}
.im-page.mep td.g{background:#f2f2f2;font-weight:800;writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-size:13px}
.im-page.mep td.t{text-align:right;height:23px}
.im-page.mep td.c{text-align:center}
.im-page.mep td.sum{background:#f2f2f2;font-weight:800;text-align:center;font-size:14px}
.im-page.mep tr.tot td{background:#f2dbdb;font-weight:800;text-align:center;height:28px;font-size:13.5px}
.im-page.mep .me-sig{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-weight:700;font-size:14px}
.im-page.mep .me-sig img{max-height:48px;max-width:170px;vertical-align:middle}
`;
function meHijri(g) {
  try { const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date(g + 'T12:00:00'));
    const x = t => ((p.find(y => y.type === t) || {}).value || '').replace(/\D/g, '');
    return '<span class="idc-date"><bdi>' + meD(x('day')) + '</bdi> / <bdi>' + meD(x('month')) + '</bdi> / <bdi>' + meD(x('year')) + 'هـ</bdi></span>'; } catch (e) { return esc(g); }
}
function meDocHtml(r, sig) {
  const d = r.data || {}, f = d.f || {}, it = d.items || [];
  const m = x => '<span class="idc-m">' + x + '</span>';
  const F = [['اسم المركز', esc((CME && CME.display) || r.center)], ['الفترة', esc(r.period)], ['رقم الزيارة', meD(esc(f.visitNo))], ['نوعها', esc(f.kind)],
    ['اسم المعلمة', esc(r.teacher)], ['سنوات الخبرة', meD(esc(f.years))], ['المؤهل في القرآن', esc(f.qq)], ['الفئة', esc(f.cat)],
    ['عدد الحاضرات', meD(esc(f.present))], ['العدد الكلي', meD(esc(f.cnt))], ['التاريخ', r.date ? meHijri(r.date) : ''], ['اليوم', esc(f.day)], ['عنوان الدرس', esc(f.lesson)]];
  let info = '';
  for (let i = 0; i < F.length; i += 3) info += '<tr>' + [0, 1, 2].map(j => F[i + j] ? '<td>' + F[i + j][0] + ': ' + m(F[i + j][1] || '') + '</td>' : '<td></td>').join('') + '</tr>';
  let body = '', n = 0, total = 0;
  MGE_GROUPS.forEach(g => {
    const gmax = g.items.reduce((a, x) => a + x[1], 0);
    g.items.forEach(([t, mx], k) => {
      const x = it[n] || {}, v = x.s === '' || x.s == null ? '' : +x.s; if (v !== '') total += v;
      body += '<tr>' + (k === 0 ? '<td class="g" rowspan="' + g.items.length + '">' + g.t + ' (' + g.p + ')</td>' : '') + '<td class="t">' + esc(t) + '</td><td class="c">' + meD(mx) + '</td><td class="c">' + meD(v) + '</td><td class="t">' + esc(x.n || '') + '</td>' +
        (k === 0 ? '<td class="sum" rowspan="' + g.items.length + '">' + meD(g.items.reduce((a, _, j) => a + (+((it[n - k + j] || {}).s) || 0), 0)) + ' / ' + meD(gmax) + '</td>' : '') + '</tr>';
      n++;
    });
  });
  total = Math.round(total * 100) / 100;
  return '<div class="im-page mep"><img class="idc-lh" src="' + ID_LETTERHEAD + '" width="2000" height="351" alt=""><div class="idc-body">' +
    '<div class="idc-title">استمارة تقييم المعلمة</div><table class="me-info">' + info + '</table>' +
    '<table><colgroup><col style="width:44px"><col><col style="width:56px"><col style="width:56px"><col style="width:170px"><col style="width:74px"></colgroup>' +
    '<tr><th>المهارة</th><th>البيان</th><th>التقييم</th><th>الدرجة</th><th>الملاحظات</th><th>المجموع</th></tr>' + body +
    '<tr class="tot"><td colspan="2">المجموع</td><td>١٠٠</td><td>' + meD(total) + '</td><td>المعدل</td><td>' + meD(Math.round(total / 5 * 100) / 100) + '</td></tr></table>' +
    '<div class="me-sig"><span>اسم المديرة: ' + m(esc(r.mgrName || '')) + '</span><span>التوقيع: ' + (sig ? '<img src="' + sig + '" alt="">' : '') + '</span></div></div></div>';
}
async function meSigOf(r) {
  if (!r.data || !r.data.sig) return '';
  if (meSigs[r.id]) return meSigs[r.id];
  try { meSigs[r.id] = (await cApi('c_me_sig', { id: r.id })).data || ''; } catch (e) { return ''; }
  return meSigs[r.id];
}
const meFile = r => 'تقييم_المعلمة_' + String(r.teacher || '').trim().replace(/\s+/g, '_') + '_' + (r.date || '');
async function meView(id) {
  const r = meById(id); if (!r) return;
  meDocCur = r;
  $('meBar').innerHTML = dxBar('meVPdf', 'meVXls');
  $('meVPdf').onclick = e => meDo(id, e.currentTarget, 'pdf');
  $('meVXls').onclick = e => meDo(id, e.currentTarget, 'xlsx');
  $('meDoc').innerHTML = '<p class="empty">جارِ التحميل...</p>';
  cShow('meDocView');
  const sig = await meSigOf(r);
  $('meDoc').innerHTML = '<div class="tpd-fit" style="overflow:hidden;position:relative"><div class="tpd-in" style="width:794px;transform-origin:top right;position:absolute;top:0;right:0"><style>' + ID_CSS + MGE_CSS + '</style><div class="idoc ptdoc" style="width:794px;padding:0">' + meDocHtml(r, sig) + '</div></div></div>';
  const w = $('meDoc').querySelector('.tpd-fit'), inn = w.querySelector('.tpd-in');
  const fit = () => { const k = Math.min(1, w.clientWidth / 794); inn.style.transform = 'scale(' + k + ')'; inn.style.right = Math.max(0, (w.clientWidth - 794 * k) / 2) + 'px'; w.style.height = Math.ceil(inn.offsetHeight * k) + 'px'; };
  fit(); setTimeout(fit, 300);
}
async function meDo(id, btn, fmt) {
  const r = meById(id); if (!r) return;
  setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    const sig = await meSigOf(r);
    if (fmt === 'pdf') idSaveBlob(await idPagesPdf([meDocHtml(r, sig)], MGE_CSS, true), meFile(r) + '.pdf');
    else dxSave(await docXlsxBlob('<style>' + ID_CSS + MGE_CSS + '.idoc{width:794px;padding:0}</style><div class="idoc ptdoc">' + meDocHtml(r, sig) + '</div>', { width: 794 }), meFile(r) + '.xlsx');
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر التحميل', false); }
  finally { setBtnBusy(btn, false); }
}
