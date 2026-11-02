/* ===== خلاصة التقارير — واجهة المشرفات ===== */
const RP_EDU = ['ابتدائي', 'متوسط', 'ثانوي', 'دبلوم', 'جامعي', 'ماجستير', 'دكتوراة'];
const RP_QQ = ['مجازة', 'خاتمة', 'حافظة', 'دورات حفظ', 'خريجة دبلوم عالي إعداد المعلمات', 'خريجة دبلوم متوسط لتأهيل المعلمات',
  'خريجة تأهيل معلمات', 'خريجة دورة تأهيل منتهي بالتوظيف', 'اختبار مكتب', '-'];
const RP_CATS = ['أمهات', 'متعلمات', 'ناشئة', 'أمهات ومتعلمات', 'متعلمات وناشئة', 'أمهات وناشئة', 'جميع الفئات'];
const RP_RATES = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];
const RP_GRADES = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف', 'لم تجتاز'];
const RP_SUBJ = { none: '', tajweed: 'التجويد', tabyan: 'التبيان' };
const RP_SUBJ_MAX = { tajweed: 100, tabyan: 40 };

const RP_FIELDS = [
  { k: 'center', l: 'اسم المركز', t: 'center' },
  { k: 'name', l: 'اسم المعلمة', t: 'tname' },
  { k: 'edu', l: 'المؤهل العلمي', t: 'sel', o: RP_EDU },
  { k: 'qq', l: 'المؤهل في القرآن', t: 'sel', o: RP_QQ },
  { k: 'parts', l: 'مقدار حفظها بالأجزاء', t: 'num' },
  { k: 'nat', l: 'الجنسية', t: 'text' },
  { k: 'years', l: 'عدد سنوات الخبرة', t: 'num' },
  { k: 'cat', l: 'فئة الدارسات', t: 'sel', o: RP_CATS },
  { k: 'cnt', l: 'العدد', t: 'num' },
  { k: 'ach', l: 'التقدير العام لتحصيلهن', t: 'sel', o: RP_RATES },
  { k: 'beh', l: 'المستوى العام لسلوك الدارسات', t: 'sel', o: RP_RATES },
  { k: 'skills', l: 'مهارات تمتلكها المعلمة', t: 'area' },
  { k: 'improve', l: 'نقاط تحتاج إلى تحسين', t: 'area' },
  { k: 'notes', l: 'التوصيات والملاحظات', t: 'area' }
];

let RP = { id: '', meta: rpDefaultMeta(), rows: [], open: 0 };
let RP_LIST = [];

function rpDefaultMeta() {
  let sup = '';
  try { sup = localStorage.getItem('rp_sup_' + getUser()) || ''; } catch (e) {}
  if (!sup) sup = getUser();
  return { supervisor: sup, period: 'صباحية', semester: 'الأول', year: '1447', quran: true, subject: 'none', manager: false };
}
function rpBlankRow(prev) {
  const r = {};
  RP_FIELDS.forEach(f => r[f.k] = '');
  r.q = ''; r.s = ''; r.m = '';
  if (prev) { r.center = prev.center || ''; r.cat = prev.cat || ''; }
  return r;
}

/* ---------- الحساب ---------- */
function rpNum(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,،]/g, '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
function rpWeights(m) {
  const hasS = m.subject !== 'none', hasM = !!m.manager;
  if (hasS && hasM) return { q: 70, s: 10, m: 20 };
  if (hasS) return { q: 80, s: 20, m: 0 };
  if (hasM) return { q: 80, s: 0, m: 20 };
  return { q: 100, s: 0, m: 0 };
}
function rpGrade(t) {
  if (t === null) return '';
  return t >= 90 ? 'ممتاز' : t >= 80 ? 'جيد جداً' : t >= 70 ? 'جيد' : t >= 60 ? 'مقبول' : t >= 50 ? 'ضعيف' : 'لم تجتاز';
}
function rpCalc(r, m) {
  const out = { q: null, qw: null, s: null, sw: null, m: null, mw: null, total: null, grade: '' };
  if (!m.quran) return out;
  const w = rpWeights(m);
  out.q = rpNum(r.q);
  if (out.q !== null) out.qw = out.q * w.q / 100;
  let ok = out.q !== null;
  if (w.s) {
    out.s = rpNum(r.s);
    if (out.s !== null) out.sw = out.s / RP_SUBJ_MAX[m.subject] * w.s; else ok = false;
  }
  if (w.m) {
    out.m = rpNum(r.m);
    if (out.m !== null) out.mw = out.m * w.m / 100; else ok = false;
  }
  if (ok) {
    out.total = Math.round(((out.qw || 0) + (out.sw || 0) + (out.mw || 0)) * 100) / 100;
    out.grade = rpGrade(out.total);
  }
  return out;
}
function rpModeTitle(m) {
  if (!m.quran) return 'بدون تقييم المشرفة وبدون تقييم المديرة';
  const p = ['تقييم القرآن'];
  if (m.subject !== 'none') p.push('تقييم ' + RP_SUBJ[m.subject]);
  if (m.manager) p.push('تقييم المديرة');
  return p.join(' + ');
}

/* ---------- تخطيط الأعمدة (مشترك بين المعاينة وExcel) ---------- */
function rpLayout(m) {
  const c = [];
  const w = rpWeights(m);
  c.push({ g: '', label: 'م', role: 'idx', width: 5 });
  c.push({ g: 'معلومات المشرفة', label: 'اسم المشرفة', role: 'sup', width: 22 });
  c.push({ g: 'معلومات المشرفة', label: 'اسم المركز', k: 'center', width: 26 });
  c.push({ g: 'معلومات عن المعلمة', label: 'اسم المعلمة', k: 'name', width: 28 });
  c.push({ g: 'معلومات عن المعلمة', label: 'المؤهل العلمي', k: 'edu', width: 14 });
  c.push({ g: 'معلومات عن المعلمة', label: 'المؤهل في القرآن', k: 'qq', width: 26 });
  c.push({ g: 'معلومات عن المعلمة', label: 'مقدار حفظها بالأجزاء', k: 'parts', num: true, width: 12 });
  c.push({ g: 'معلومات عن المعلمة', label: 'الجنسية', k: 'nat', width: 12 });
  c.push({ g: 'معلومات عن المعلمة', label: 'عدد سنوات الخبرة', k: 'years', num: true, width: 12 });
  c.push({ g: 'معلومات عن المعلمة', label: 'مهارات تمتلكها المعلمة', k: 'skills', width: 30 });
  c.push({ g: 'معلومات عن المعلمة', label: 'نقاط تحتاج إلى تحسين', k: 'improve', width: 30 });
  c.push({ g: 'معلومات عن الدارسات', label: 'فئة الدارسات', k: 'cat', width: 18 });
  c.push({ g: 'معلومات عن الدارسات', label: 'العدد', k: 'cnt', num: true, width: 8 });
  c.push({ g: 'معلومات عن الدارسات', label: 'التقدير العام لتحصيلهن', k: 'ach', width: 14 });
  c.push({ g: 'معلومات عن الدارسات', label: 'المستوى العام لسلوك الدارسات', k: 'beh', width: 14 });
  if (m.quran) {
    const weighted = !!(w.s || w.m);
    c.push({ g: 'تقييم المعلمة', label: 'تقييم المشرفة في القرآن', role: 'q', num: true, width: 13 });
    if (weighted) c.push({ g: 'تقييم المعلمة', label: 'معدل تقييم المشرفة في القرآن (' + w.q + '%)', role: 'qw', num: true, width: 14 });
    if (w.s) {
      const nm = RP_SUBJ[m.subject];
      c.push({ g: 'تقييم المعلمة', label: 'تقييم المشرفة في ' + nm + ' (من ' + RP_SUBJ_MAX[m.subject] + ')', role: 's', num: true, width: 14 });
      c.push({ g: 'تقييم المعلمة', label: 'معدل تقييم المشرفة في ' + nm + ' (' + w.s + '%)', role: 'sw', num: true, width: 14 });
    }
    if (w.m) {
      c.push({ g: 'تقييم المعلمة', label: 'تقييم المديرة', role: 'm', num: true, width: 12 });
      c.push({ g: 'تقييم المعلمة', label: 'معدل تقييم المديرة (' + w.m + '%)', role: 'mw', num: true, width: 14 });
    }
    if (weighted) c.push({ g: 'تقييم المعلمة', label: 'المجموع (100)', role: 'total', num: true, width: 11 });
    c.push({ g: 'تقييم المعلمة', label: 'التقدير', role: 'grade', width: 12 });
  }
  c.push({ g: '', label: 'التوصيات والملاحظات', k: 'notes', width: 34 });
  return c;
}
function rpCellValue(col, r, i, m, cv) {
  if (col.k) return col.num ? rpNum(r[col.k]) : String(r[col.k] || '');
  switch (col.role) {
    case 'idx': return i + 1;
    case 'sup': return m.supervisor;
    case 'q': return cv.q; case 'qw': return cv.qw;
    case 's': return cv.s; case 'sw': return cv.sw;
    case 'm': return cv.m; case 'mw': return cv.mw;
    case 'total': return cv.total;
    case 'grade':
      if (rpWeights(m).s || rpWeights(m).m) return cv.grade;
      return cv.q === null ? '' : rpGrade(cv.q);
  }
  return '';
}
function rpFmt(v) {
  if (v === null || v === undefined || v === '') return '';
  return typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v);
}

/* ---------- القائمة ---------- */
async function loadReports() {
  const box = document.getElementById('rpList');
  box.innerHTML = '<p class="empty">جارِ التحميل...</p>';
  try {
    const out = await api('getReports');
    RP_LIST = out.data;
    if (!RP_LIST.length) { box.innerHTML = '<p class="empty">لا توجد خلاصات محفوظة بعد. اضغطي «خلاصة جديدة».</p>'; return; }
    box.innerHTML = RP_LIST.map(r =>
      '<div class="rp-item">' +
        '<div class="rp-item-main">' +
          '<b>' + esc(r.title) + '</b>' +
          '<span>' + esc(r.supervisor || '—') + ' • ' + esc(r.count) + ' معلمة • آخر حفظ: ' + esc((r.at || '').split(' ')[0]) + '</span>' +
        '</div>' +
        '<div class="rp-item-btns">' +
          '<button class="btn light" onclick="openReport(\'' + esc(r.id) + '\')">فتح</button>' +
          '<button class="btn danger vdel" title="حذف" aria-label="حذف" onclick="deleteReport(\'' + esc(r.id) + '\')">✕</button>' +
        '</div>' +
      '</div>').join('');
  } catch (e) { box.innerHTML = '<p class="empty">تعذّر التحميل</p>'; toast(e.message, false); }
}

function newReport() {
  RP = { id: '', meta: rpDefaultMeta(), rows: [rpBlankRow(null)], open: 0 };
  rpShowEditor();
}
async function openReport(id) {
  try {
    const out = await api('getReport', { id });
    RP = { id: out.data.id, meta: out.data.meta, rows: out.data.rows, open: 0 };
    rpShowEditor();
  } catch (e) { toast(e.message, false); }
}
async function deleteReport(id) {
  if (!confirm('هل تريدين حذف هذه الخلاصة نهائيًا؟')) return;
  try { await api('deleteReport', { id }); toast('تم الحذف'); await loadReports(); }
  catch (e) { toast(e.message, false); }
}
function backToReports() {
  show('reportsView');
  loadReports();
}


/* ---------- جلب الدرجات من استمارات التقييم المحفوظة ---------- */
const RP_SRC_TYPES = {
  final: { q: ['f_single', 'f_multi'], tabyan: ['f_tabyan'], tajweed: ['f_tj_single', 'f_tj_multi'] },
  last: { q: ['single', 'multi'], tabyan: ['tabyan'], tajweed: ['tj_single', 'tj_multi'] }
};
const RP_PERIOD_MAP = { 'صباحية': 'صباحي', 'مسائية': 'مسائي' };
function rpEvVal(r, key) { return rpNum(key === 'q' ? r.weighted : r.raw); }

async function rpFetchEvals() {
  const btn = document.getElementById('rpFetchBtn');
  rpReadMeta();
  setBtnBusy(btn, true, 'جارِ الجلب...');
  try {
    await evLoadList(true, true);
    for (let i = 0; i < 40 && evLoading; i++) await new Promise(r => setTimeout(r, 250));
    const src = document.getElementById('rpSrc').value;
    const from = document.getElementById('rpFrom').value, to = document.getElementById('rpTo').value;
    const samePeriod = document.getElementById('rpSamePeriod').checked;
    const mine = document.getElementById('rpMine').checked;
    const me = String(getUser()).trim().toLowerCase();
    const types = RP_SRC_TYPES[src === 'final' ? 'final' : 'last'];
    const kindOf = ft => Object.keys(types).find(k => types[k].indexOf(ft) > -1);

    const groups = {};
    evRows.forEach(r => {
      const kind = kindOf(r.formType);
      if (!kind) return;
      if (from && String(r.date) < from) return;
      if (to && String(r.date) > to) return;
      if (samePeriod && r.period !== RP_PERIOD_MAP[RP.meta.period]) return;
      if (mine && String(r.owner || '').trim().toLowerCase() !== me) return;
      const key = evNameKey(r.teacher);
      if (!key) return;
      const g = groups[key] || (groups[key] = { name: r.teacher, list: { q: [], tabyan: [], tajweed: [] }, info: null });
      g.list[kind].push(r);
      if (!g.info || String(r.date) >= String(g.info.date)) { g.info = r; g.name = r.teacher; }
    });
    // تقييمات المديرات (استمارة تقييم المعلمة في «إدارة المراكز»)
    let MGE = [];
    try { MGE = ((await api('getMgrEvals')).data || []).filter(x => (!from || String(x.date) >= from) && (!to || String(x.date) <= to) &&
      (!samePeriod || !x.period || x.period === RP.meta.period)); } catch (e) {}
    const mgBy = {};
    MGE.forEach(x => { const k = evNameKey(x.teacher); if (k) (mgBy[k] = mgBy[k] || []).push(x); });
    Object.keys(mgBy).forEach(k => { if (!groups[k]) groups[k] = { name: mgBy[k][0].teacher, list: { q: [], tabyan: [], tajweed: [] }, info: { center: mgBy[k][0].center, date: '' } }; });
    const keys = Object.keys(groups);
    if (!keys.length) { toast('لا توجد استمارات مطابقة للخيارات المحددة', false); return; }

    const pick = (arr, key) => {
      if (!arr.length) return { v: null, note: '' };
      const sorted = arr.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.at).localeCompare(String(b.at)));
      if (src === 'avg') {
        const vals = sorted.map(x => rpEvVal(x, key)).filter(x => x !== null);
        if (!vals.length) return { v: null, note: '' };
        return { v: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100, note: 'متوسط ' + vals.length };
      }
      const l = sorted[sorted.length - 1];
      return { v: rpEvVal(l, key), note: String(l.date) };
    };

    let nTj = 0, nTb = 0;
    keys.forEach(k => { if (groups[k].list.tajweed.length) nTj++; if (groups[k].list.tabyan.length) nTb++; });
    const m = RP.meta;
    if (!m.quran) m.quran = true;
    if (m.subject === 'none' && (nTj || nTb)) m.subject = nTb > nTj ? 'tabyan' : 'tajweed';
    if (Object.keys(mgBy).length) m.manager = true;   // وُجد تقييم من المديرة
    if (nTj && nTb) toast('وُجدت درجات التبيان والتجويد معًا؛ اعتُمدت درجات ' + RP_SUBJ[m.subject] + ' فقط في هذا النموذج', false);

    if (RP.rows.length === 1 && !RP.rows[0].name.trim()) RP.rows = [];
    let added = 0, updated = 0;
    keys.sort((a, b) => groups[a].name.localeCompare(groups[b].name, 'ar')).forEach(k => {
      const g = groups[k], info = g.info;
      let row = RP.rows.find(r => evNameKey(r.name) === k);
      if (row) updated++; else { row = rpBlankRow(null); RP.rows.push(row); added++; }
      const fill = (f, v) => { if (!String(row[f] || '').trim() && v) row[f] = String(v); };
      fill('name', g.name); fill('center', info.center); fill('qq', info.qual); fill('cat', info.cat);
      fill('years', info.years); fill('cnt', info.total);
      const q = pick(g.list.q, 'q'), s = m.subject !== 'none' ? pick(g.list[m.subject], 'raw') : { v: null, note: '' };
      if (q.v !== null) row.q = String(q.v);
      if (s.v !== null) row.s = String(s.v);
      let mg = { v: null, note: '' };
      if (mgBy[k]) {   // درجة المديرة: الأحدث، أو المتوسط عند اختيار «متوسط الاستمارات»
        const L = mgBy[k].slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.at).localeCompare(String(b.at)));
        const vals = L.map(x => rpNum(x.total)).filter(x => x !== null);
        if (vals.length) mg = src === 'avg' ? { v: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100, note: 'متوسط ' + vals.length } : { v: vals[vals.length - 1], note: String(L[L.length - 1].date) };
        if (mg.v !== null) row.m = String(mg.v);
      }
      const lastQ = g.list.q.length ? g.list.q[g.list.q.length - 1] : null;
      if (lastQ && lastQ.recs) fill('notes', lastQ.recs);
      row.src = [q.note ? 'القرآن: ' + q.note : '', s.note ? RP_SUBJ[m.subject] + ': ' + s.note : '', mg.note ? 'المديرة: ' + mg.note : ''].filter(Boolean).join(' • ');
    });
    RP.open = -1;
    rpShowMetaControls();
    rpRender();
    toast('تم جلب ' + keys.length + ' معلمة (جديدة ' + added + '، محدّثة ' + updated + ') — راجعي الدرجات ثم أدخلي تقييم المديرة إن وُجد');
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- المحرّر ---------- */
function rpShowEditor() {
  rpShowMetaControls();
  show('reportEditView');
  rpRender();
}
function rpShowMetaControls() {
  const m = RP.meta;
  document.getElementById('rpSubject').disabled = !m.quran;
  document.getElementById('rpMgr').disabled = !m.quran;
  document.getElementById('rpSup').value = m.supervisor;
  document.getElementById('rpPeriod').value = m.period;
  document.getElementById('rpSem').value = m.semester;
  document.getElementById('rpYear').value = m.year;
  document.getElementById('rpQuran').checked = !!m.quran;
  document.getElementById('rpSubject').value = m.subject;
  document.getElementById('rpMgr').checked = !!m.manager;
}
function rpReadMeta() {
  const m = RP.meta;
  m.supervisor = document.getElementById('rpSup').value.trim();
  m.period = document.getElementById('rpPeriod').value;
  m.semester = document.getElementById('rpSem').value;
  m.year = document.getElementById('rpYear').value.trim();
  m.quran = document.getElementById('rpQuran').checked;
  m.subject = document.getElementById('rpSubject').value;
  m.manager = document.getElementById('rpMgr').checked;
  if (!m.quran) { m.subject = 'none'; m.manager = false; document.getElementById('rpSubject').value = 'none'; document.getElementById('rpMgr').checked = false; }
  document.getElementById('rpSubject').disabled = !m.quran;
  document.getElementById('rpMgr').disabled = !m.quran;
  try { localStorage.setItem('rp_sup_' + getUser(), m.supervisor); } catch (e) {}
}
function rpMetaChanged() { rpReadMeta(); rpRender(); }

function rpFieldHtml(i, f) {
  const r = RP.rows[i], id = 'rp_' + i + '_' + f.k, v = r[f.k] == null ? '' : r[f.k];
  const attr = ' data-i="' + i + '" data-k="' + f.k + '" id="' + id + '"';
  let inp;
  if (f.t === 'sel' || f.t === 'center') {
    let opts = f.t === 'center' ? centersForMe() : f.o;
    if (v && opts.indexOf(v) < 0) opts = opts.concat([v]);
    inp = '<select' + attr + '>' + (f.t === 'center' ? centerOpts(opts, opts.length ? '—' : NO_CENTERS, v) :
      '<option value="">—</option>' + opts.map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('')) + '</select>';
  } else if (f.t === 'tname') {   // اسم المعلمة: قائمة منسدلة بأسماء المعلمات (مع إمكانية الكتابة للبحث)
    inp = '<input list="teacherList" autocomplete="off" placeholder="اختاري من القائمة"' + attr + ' value="' + esc(v) + '">';
  } else if (f.t === 'area') {
    inp = '<textarea rows="2"' + attr + '>' + esc(v) + '</textarea>';
  } else if (f.t === 'num') {
    inp = '<input inputmode="decimal"' + attr + ' value="' + esc(v) + '">';
  } else {
    inp = '<input' + attr + ' value="' + esc(v) + '">';
  }
  const wide = f.t === 'area' ? ' rp-wide' : f.t === 'tname' || f.k === 'qq' || f.t === 'center' ? ' rp-w2' : '';
  return '<div class="rp-f' + wide + '"><label for="' + id + '">' + esc(f.l) + '</label>' + inp + '</div>';
}
function rpScoreFields(i) {
  const m = RP.meta, w = rpWeights(m);
  if (!m.quran) return '';
  const sc = (k, label) => {
    const id = 'rp_' + i + '_' + k;
    return '<div class="rp-f"><label for="' + id + '">' + esc(label) + '</label>' +
      '<input inputmode="decimal" data-i="' + i + '" data-k="' + k + '" id="' + id + '" value="' + esc(RP.rows[i][k]) + '"></div>';
  };
  let h = '<div class="rp-scores"><div class="rp-sc-title">التقييم</div><div class="rp-grid">';
  h += sc('q', 'تقييم المشرفة في القرآن (من 100)');
  if (w.s) h += sc('s', 'تقييم المشرفة في ' + RP_SUBJ[m.subject] + ' (من ' + RP_SUBJ_MAX[m.subject] + ')');
  if (w.m) h += sc('m', 'تقييم المديرة (من 100)');
  return h + '</div></div>';
}
function rpChip(i) {
  const m = RP.meta, r = RP.rows[i];
  if (!m.quran) return '';
  const cv = rpCalc(r, m), w = rpWeights(m);
  if (cv.total === null) return '<span class="tag warn">التقييم ناقص</span>';
  const g = (w.s || w.m) ? cv.grade : rpGrade(cv.q);
  return '<span class="tag ' + (cv.total >= 50 ? 'ok' : 'warn') + '">' + rpFmt(cv.total) + ' — ' + esc(g) + '</span>';
}
function rpRender() {
  const m = RP.meta;
  document.getElementById('rpMode').textContent = rpModeTitle(m);
  const w = rpWeights(m);
  document.getElementById('rpWeights').textContent = m.quran
    ? 'الأوزان: القرآن ' + w.q + '%' + (w.s ? ' • ' + RP_SUBJ[m.subject] + ' ' + w.s + '%' : '') + (w.m ? ' • المديرة ' + w.m + '%' : '')
    : 'لا توجد درجات في هذا النموذج؛ تُسجَّل المعلومات والتوصيات فقط.';
  document.getElementById('rpCards').innerHTML = RP.rows.map((r, i) => {
    const open = RP.open === i;
    return '<div class="rp-card' + (open ? ' open' : '') + '" id="rpCard' + i + '">' +
      '<div class="rp-head" onclick="rpToggle(' + i + ')">' +
        '<span class="rp-num">' + (i + 1) + '</span>' +
        '<b id="rpTitle' + i + '">' + esc(r.name || 'معلمة جديدة') + '</b>' +
        '<span id="rpChip' + i + '">' + rpChip(i) + '</span>' +
        '<span class="rp-arrow">' + (open ? '▲' : '▼') + '</span>' +
      '</div>' +
      '<div class="rp-body' + (open ? '' : ' hidden') + '">' +
        '<div class="rp-grid">' + RP_FIELDS.map(f => rpFieldHtml(i, f)).join('') + '</div>' +
        rpScoreFields(i) +
        (r.src ? '<div class="rp-src">المصدر — ' + esc(r.src) + '</div>' : '') +
        '<div class="rp-btns"><button class="btn danger" onclick="rpRemove(' + i + ')">حذف هذه المعلمة</button></div>' +
      '</div></div>';
  }).join('');
  rpSummary();
}
function rpToggle(i) { RP.open = RP.open === i ? -1 : i; rpRender(); }
function rpAdd() {
  RP.rows.push(rpBlankRow(RP.rows[RP.rows.length - 1]));
  RP.open = RP.rows.length - 1;
  rpRender();
  setTimeout(() => { const el = document.getElementById('rpCard' + RP.open); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 40);
}
function rpRemove(i) {
  if (!confirm('حذف هذه المعلمة من الخلاصة؟')) return;
  RP.rows.splice(i, 1);
  if (!RP.rows.length) RP.rows.push(rpBlankRow(null));
  RP.open = Math.min(RP.open, RP.rows.length - 1);
  rpRender();
}
document.addEventListener('input', e => {
  const t = e.target;
  if (!t.dataset || t.dataset.k === undefined || t.dataset.i === undefined || !t.closest('#rpCards')) return;
  const i = +t.dataset.i;
  RP.rows[i][t.dataset.k] = t.value;
  if (t.dataset.k === 'name') document.getElementById('rpTitle' + i).textContent = t.value || 'معلمة جديدة';
  document.getElementById('rpChip' + i).innerHTML = rpChip(i);
  rpSummary();
});

// عند اختيار اسم المعلمة: تُعبّأ الخانات الفارغة من «بياناتي الشخصية» (إن سجّلت المعلمة بياناتها)
const RP_EDU_MAP = { 'بكالوريوس': 'جامعي', 'دكتوراه': 'دكتوراة' };
const RP_QQ_MAP = { 'دبلوم عالي': 'خريجة دبلوم عالي إعداد المعلمات', 'دبلوم متوسط': 'خريجة دبلوم متوسط لتأهيل المعلمات', 'دبلوم تأهيل منتهي بالتوظيف': 'خريجة دورة تأهيل منتهي بالتوظيف' };
document.addEventListener('change', async e => {
  const t = e.target;
  if (!t.dataset || t.dataset.k !== 'name' || !t.closest('#rpCards') || typeof tiLookup !== 'function') return;
  const i = +t.dataset.i, name = t.value.trim(); if (!name) return;
  const p = await tiLookup(name);
  const r = RP.rows[i]; if (!p || !r || String(r.name).trim() !== name) return;
  const put = (k, v, list) => { if (!v || String(r[k] || '').trim()) return; if (list && list.indexOf(v) < 0) return; r[k] = String(v); };
  const C = centersForMe(), cn = tiNorm(cpName(p.center || ''));
  const per = /مسائ/.test(p.period) && !/صباح/.test(p.period) ? 'pm' : /صباح/.test(p.period) && !/مسائ/.test(p.period) ? 'am' : '';
  put('center', C.find(c => tiNorm(cpName(c)) === cn && (!per || cpPer(c) === per)) || C.find(c => tiNorm(cpName(c)) === cn));
  put('edu', RP_EDU_MAP[p.qual] || p.qual, RP_EDU);
  put('qq', RP_QQ_MAP[p.qq] || p.qq, RP_QQ);
  put('parts', p.hifz); put('nat', p.nat); put('years', String(p.exp || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  put('cat', p.cat, RP_CATS); put('skills', p.skills);
  if (String(r.src || '').indexOf('بياناتي الشخصية') < 0) r.src = (r.src ? r.src + ' • ' : '') + 'بيانات المعلمة من «بياناتي الشخصية»';
  rpRender();
});

/* ---------- الملخص والمعاينة ---------- */
function rpSummary() {
  const m = RP.meta, cols = rpLayout(m);
  const calcs = RP.rows.map(r => rpCalc(r, m));
  const w = rpWeights(m);
  const done = calcs.filter(c => c.total !== null);
  const st = document.getElementById('rpStats');
  let h = '<div class="stat"><b>' + RP.rows.filter(r => r.name.trim()).length + '</b><span>عدد المعلمات</span></div>';
  if (m.quran) {
    const avg = done.length ? done.reduce((a, c) => a + c.total, 0) / done.length : null;
    h += '<div class="stat"><b>' + (avg === null ? '—' : rpFmt(avg)) + '</b><span>متوسط المجموع</span></div>';
  }
  st.innerHTML = h;
  st.style.gridTemplateColumns = 'repeat(' + (m.quran ? 2 : 1) + ',1fr)';

  const dist = document.getElementById('rpDist');
  if (m.quran && done.length) {
    const cnt = {};
    done.forEach(c => { const g = (w.s || w.m) ? c.grade : rpGrade(c.q); cnt[g] = (cnt[g] || 0) + 1; });
    dist.innerHTML = RP_GRADES.filter(g => cnt[g]).map(g => '<span class="tag warn" style="margin:3px">' + g + ': ' + cnt[g] + '</span>').join('');
  } else dist.innerHTML = '';

  // جدول المعاينة (يُطبع كما هو)
  const groups = [];
  cols.forEach(c => {
    const last = groups[groups.length - 1];
    if (c.g && last && last.g === c.g) last.n++; else groups.push({ g: c.g, n: 1, first: c });
  });
  let t = '<thead><tr>' + groups.map(g => g.g
    ? '<th colspan="' + g.n + '">' + esc(g.g) + '</th>'
    : '<th rowspan="2">' + esc(g.first.label) + '</th>').join('') + '</tr><tr>' +
    cols.filter(c => c.g).map(c => '<th>' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>';
  RP.rows.forEach((r, i) => {
    const cv = calcs[i];
    t += '<tr>' + cols.map(c => '<td>' + esc(rpFmt(rpCellValue(c, r, i, m, cv))) + '</td>').join('') + '</tr>';
  });
  document.getElementById('rpPreview').innerHTML = t + '</tbody>';
  document.getElementById('rpPrintTitle').innerHTML =
    '<b>خلاصة تقارير الإشراف (تقييم المعلمات)</b><br>' + esc(rpModeTitle(m)) + '<br>' +
    'الفترة: ' + esc(m.period) + ' — الفصل الدراسي: ' + esc(m.semester) + ' — لعام ' + esc(m.year) + 'هـ' +
    (m.supervisor ? ' — المشرفة: ' + esc(m.supervisor) : '');
}

/* ---------- الحفظ ---------- */
function rpValidate() {
  const m = RP.meta;
  if (!m.supervisor) return 'اكتبي اسم المشرفة';
  if (!/^\d{4}$/.test(m.year.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)))) return 'اكتبي العام الهجري بأربع خانات، مثل 1447';
  for (let i = 0; i < RP.rows.length; i++) {
    const r = RP.rows[i];
    if (!r.name.trim()) return 'اكتبي اسم المعلمة رقم ' + (i + 1) + ' أو احذفيها';
    if (m.quran) {
      const chk = (k, max, nm) => {
        const raw = String(r[k] || '').trim();
        if (!raw) return null;
        const n = rpNum(raw);
        if (n === null || n < 0 || n > max) return 'درجة ' + nm + ' للمعلمة رقم ' + (i + 1) + ' يجب أن تكون بين 0 و' + max;
        return null;
      };
      const e = chk('q', 100, 'القرآن') || (m.subject !== 'none' ? chk('s', RP_SUBJ_MAX[m.subject], RP_SUBJ[m.subject]) : null) || (m.manager ? chk('m', 100, 'المديرة') : null);
      if (e) return e;
    }
  }
  return '';
}
async function saveReport() {
  rpReadMeta();
  const err = rpValidate();
  if (err) return toast(err, false);
  const btn = document.getElementById('rpSaveBtn');
  setBtnBusy(btn, true);
  try {
    const out = await api('saveReport', { report: { id: RP.id, meta: RP.meta, rows: RP.rows } });
    RP.id = out.id;
    toast('تم حفظ الخلاصة ✅');
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- التصدير إلى Excel (بالكليشة نفسها المستخدمة في بقية الملفات) ---------- */
function rpColLetter(n) { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

// ملف Excel بنفس تنسيق الاستمارات الأسبوعية (الكليشة، العنوان العنابي، رأس الجدول الوردي) وبأعمدة مضغوطة واضحة
async function exportReport() {
  rpReadMeta();
  const err = rpValidate();
  if (err) return toast(err, false);
  const m = RP.meta, cols = rpLayout(m), w = rpWeights(m);
  const calcs = RP.rows.map(r => rpCalc(r, m));
  const done = calcs.filter(c => c.total !== null);
  const avg = done.length ? Math.round(done.reduce((a, c) => a + c.total, 0) / done.length * 100) / 100 : null;
  const W = { idx: 5, sup: 13, center: 15, name: 20, edu: 10, qq: 17, parts: 8, nat: 9, years: 8, skills: 22, improve: 22, cat: 12, cnt: 7, ach: 10, beh: 10, notes: 26 };
  const widths = cols.map(c => W[c.k] || W[c.role] || (c.role === 'grade' ? 10 : 10));
  const short = c => c.label.replace('تقييم المشرفة في ', 'تقييم ').replace('معدل تقييم المشرفة في ', 'معدل ').replace('المستوى العام لسلوك الدارسات', 'سلوك الدارسات')
    .replace('التقدير العام لتحصيلهن', 'تحصيل الدارسات').replace('مقدار حفظها بالأجزاء', 'الحفظ (أجزاء)').replace('عدد سنوات الخبرة', 'سنوات الخبرة');
  const rows = RP.rows.map((r, i) => cols.map(c => { let v = rpCellValue(c, r, i, m, calcs[i]); if (c.k === 'center' && v && typeof cpName === 'function') v = cpName(v); return v === null || v === undefined ? '' : (typeof v === 'number' ? Math.round(v * 100) / 100 : String(v)); }));
  const info = [['المشرفة', m.supervisor], ['الفترة', m.period + '   —   الفصل الدراسي: ' + m.semester + '   —   العام: ' + m.year + 'هـ'], ['نوع التقييم', rpModeTitle(m) + (m.quran && (w.s || w.m) ? '  (الأوزان: القرآن ' + w.q + '%' + (w.s ? '، ' + RP_SUBJ[m.subject] + ' ' + w.s + '%' : '') + (w.m ? '، المديرة ' + w.m + '%' : '') + ')' : '')],
    ['عدد المعلمات', String(RP.rows.length) + (m.quran && avg !== null ? '   —   متوسط المجموع: ' + avg : '')]];
  const gi = cols.findIndex(c => c.role === 'grade');
  await exRun({ title: 'خلاصة تقارير الإشراف (تقييم المعلمات)', file: 'خلاصة تقارير الإشراف - ' + exSafe(m.supervisor || 'مشرفة') + ' - ' + m.semester + ' ' + m.year,
    landscape: true, info, cols: cols.map(short), widths, rows, gradeCols: gi > -1 ? [gi] : [], autoH: true, headH: 40,
    rightCols: cols.map((c, i) => ['name', 'center', 'skills', 'improve', 'notes', 'qq'].indexOf(c.k) > -1 ? i : -1).filter(i => i > -1) }, document.getElementById('rpXlsBtn'));
}
function printReport() { rpReadMeta(); rpSummary(); window.print(); }
