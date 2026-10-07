/* ===== خلاصة التقارير — واجهة المشرفات ===== */
const RP_EDU = ['ثانوي', 'جامعي', 'دبلوم', 'دكتوراة', 'ماجستير', 'متوسط'];
const RP_QQ = ['مجازة', 'خاتمة', 'حافظة', 'دورات حفظ', 'خريجة دبلوم عالي إعداد المعلمات', 'خريجة دبلوم متوسط لتأهيل المعلمات',
  'خريجة تأهيل معلمات', 'خريجة دورة تأهيل منتهي بالتوظيف', 'اختبار مكتب', '-'];
const RP_CATS = ['أمهات', 'أمهات - متعلمات', 'أمهات - ناشئة', 'متعلمات', 'متعلمات - ناشئة', 'ناشئة'];
const RP_RATES = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];
const RP_GRADES = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف', 'لم تجتاز'];
const RP_SUBJ = { none: '', tajweed: 'التجويد', tabyan: 'التبيان' };
const RP_SUBJ_MAX = { tajweed: 100, tabyan: 40 };

const RP_FIELDS = [
  { k: 'center', l: 'اسم المركز', t: 'center' },
  { k: 'name', l: 'اسم المعلمة', t: 'text' },
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
          '<button class="btn danger" onclick="deleteReport(\'' + esc(r.id) + '\')">حذف</button>' +
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
      const lastQ = g.list.q.length ? g.list.q[g.list.q.length - 1] : null;
      if (lastQ && lastQ.recs) fill('notes', lastQ.recs);
      row.src = [q.note ? 'القرآن: ' + q.note : '', s.note ? RP_SUBJ[m.subject] + ': ' + s.note : ''].filter(Boolean).join(' • ');
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
    let opts = f.t === 'center' ? (LISTS.centers || []) : f.o;
    if (v && opts.indexOf(v) < 0) opts = opts.concat([v]);
    inp = '<select' + attr + '><option value="">—</option>' +
      opts.map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
  } else if (f.t === 'area') {
    inp = '<textarea rows="2"' + attr + '>' + esc(v) + '</textarea>';
  } else if (f.t === 'num') {
    inp = '<input inputmode="decimal"' + attr + ' value="' + esc(v) + '">';
  } else {
    inp = '<input' + attr + ' value="' + esc(v) + '">';
  }
  const wide = f.t === 'area' ? ' rp-wide' : '';
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

async function exportReport() {
  rpReadMeta();
  const err = rpValidate();
  if (err) return toast(err, false);
  const btn = document.getElementById('rpXlsBtn');
  setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    await exLoad();
    if (!exLetterBuf) {
      const resp = await fetch(EX_LETTERHEAD);
      if (!resp.ok) throw new Error('تعذّر تحميل الكليشة (letterhead.jpg)');
      exLetterBuf = await resp.arrayBuffer();
    }
    const m = RP.meta, cols = rpLayout(m), w = rpWeights(m), N = cols.length;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'جمعية فرقان لتحفيظ القرآن الكريم';
    const ws = wb.addWorksheet('تقييم معلمات المركز', {
      views: [{ rightToLeft: true, showGridLines: false }],
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.2 } }
    });
    const FONT = 'Arial', MAROON = 'FF7A1F2B', LIGHT = 'FFF6F0F2';
    const thin = { style: 'thin', color: { argb: 'FFD9C7C0' } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };
    cols.forEach((c, i) => ws.getColumn(i + 1).width = c.width);

    // الكليشة في أعلى الملف
    const pxW = cols.reduce((a, c) => a + Math.round(c.width * 7 + 5), 0);
    const imgH = Math.round(pxW * EX_LETTER_RATIO), HR = 4;
    for (let i = 1; i <= HR; i++) ws.getRow(i).height = (imgH * 0.75) / HR;
    ws.addImage(wb.addImage({ buffer: exLetterBuf, extension: 'jpeg' }), { tl: { col: 0, row: 0 }, ext: { width: pxW, height: imgH } });

    const bar = (row, text, size, fill, color) => {
      ws.mergeCells(row, 1, row, N);
      const c = ws.getCell(row, 1);
      c.value = text;
      c.font = { name: FONT, size, bold: true, color: { argb: color || 'FF222222' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
      if (fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      ws.getRow(row).height = size + 16;
    };
    const T = HR + 2;
    bar(T, 'خلاصة تقارير الإشراف (تقييم المعلمات)', 16, MAROON, 'FFFFFFFF');
    bar(T + 1, rpModeTitle(m), 12, LIGHT, MAROON);
    bar(T + 2, 'الفترة: ' + m.period + '     الفصل الدراسي: ' + m.semester + '     لعام ' + m.year + 'هـ     المشرفة: ' + m.supervisor, 11, null);

    const H1 = T + 4, H2 = H1 + 1, D0 = H2 + 1;
    let c0 = 1;
    while (c0 <= N) {
      const col = cols[c0 - 1];
      if (!col.g) {
        ws.mergeCells(H1, c0, H2, c0);
        ws.getCell(H1, c0).value = col.label;
        c0++;
      } else {
        let c1 = c0;
        while (c1 < N && cols[c1].g === col.g) c1++;
        ws.mergeCells(H1, c0, H1, c1);
        ws.getCell(H1, c0).value = col.g;
        for (let k = c0; k <= c1; k++) ws.getCell(H2, k).value = cols[k - 1].label;
        c0 = c1 + 1;
      }
    }
    for (let r = H1; r <= H2; r++) for (let k = 1; k <= N; k++) {
      const c = ws.getCell(r, k);
      c.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r === H1 ? MAROON : 'FF9B3A47' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
      c.border = border;
    }
    ws.getRow(H1).height = 22; ws.getRow(H2).height = 48;
    ws.views = [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: H2 }];

    const L = {};
    cols.forEach((c, i) => { if (c.role) L[c.role] = rpColLetter(i + 1); });
    const gradeF = ref => 'IF(' + ref + '="","",IF(' + ref + '>=90,"ممتاز",IF(' + ref + '>=80,"جيد جداً",IF(' + ref + '>=70,"جيد",IF(' + ref + '>=60,"مقبول",IF(' + ref + '>=50,"ضعيف","لم تجتاز"))))))';
    const calcs = RP.rows.map(r => rpCalc(r, m));
    RP.rows.forEach((r, i) => {
      const n = D0 + i, cv = calcs[i];
      cols.forEach((col, ci) => {
        const cell = ws.getCell(n, ci + 1);
        const val = rpCellValue(col, r, i, m, cv);
        let f = null;
        if (col.role === 'qw') f = 'IF(' + L.q + n + '="","",' + L.q + n + '*' + w.q + '/100)';
        else if (col.role === 'sw') f = 'IF(' + L.s + n + '="","",' + L.s + n + '/' + RP_SUBJ_MAX[m.subject] + '*' + w.s + ')';
        else if (col.role === 'mw') f = 'IF(' + L.m + n + '="","",' + L.m + n + '*' + w.m + '/100)';
        else if (col.role === 'total') {
          const parts = [L.qw, w.s ? L.sw : null, w.m ? L.mw : null].filter(Boolean).map(x => x + n);
          f = 'IF(COUNT(' + parts.join(',') + ')<' + parts.length + ',"",ROUND(' + parts.join('+') + ',2))';
        } else if (col.role === 'grade') f = gradeF((L.total || L.q) + n);
        if (f) cell.value = { formula: f, result: val === null ? '' : val };
        else cell.value = (val === null || val === '') ? null : val;
        cell.font = { name: FONT, size: 10, bold: col.role === 'grade' || col.role === 'total' };
        cell.alignment = { horizontal: ['skills', 'improve', 'notes'].includes(col.k) ? 'right' : 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
        cell.border = border;
        if (col.num) cell.numFmt = '0.##';
        if (i % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF9F6' } };
      });
      ws.getRow(n).height = 34;
    });

    const last = D0 + RP.rows.length + 1;
    ws.mergeCells(last, 1, last, N);
    const done = calcs.filter(c => c.total !== null);
    const avg = done.length ? Math.round(done.reduce((a, c) => a + c.total, 0) / done.length * 100) / 100 : null;
    const sc = ws.getCell(last, 1);
    sc.value = 'عدد المعلمات: ' + RP.rows.length + (m.quran && avg !== null ? '     متوسط المجموع: ' + avg : '');
    sc.font = { name: FONT, size: 11, bold: true, color: { argb: MAROON } };
    sc.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };

    const dv = (k, list) => {
      const ci = cols.findIndex(c => c.k === k);
      if (ci < 0) return;
      const Lt = rpColLetter(ci + 1);
      for (let n = D0; n < D0 + RP.rows.length + 40; n++)
        ws.getCell(Lt + n).dataValidation = { type: 'list', allowBlank: true, formulae: ['"' + list.join(',') + '"'] };
    };
    dv('edu', RP_EDU); dv('cat', RP_CATS); dv('ach', RP_RATES); dv('beh', RP_RATES);

    const buf = await wb.xlsx.writeBuffer();
    exSave(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'خلاصة تقارير الإشراف - ' + exSafe(m.supervisor || 'مشرفة') + ' - ' + m.semester + ' ' + m.year + '.xlsx');
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر التحميل', false); }
  finally { setBtnBusy(btn, false); }
}
function printReport() { rpReadMeta(); rpSummary(); window.print(); }
