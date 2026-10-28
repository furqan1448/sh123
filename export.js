// ===== تحميل الدرجات: Excel فقط مع الكليشة الثابتة (letterhead.jpg) =====
// الكليشة في أعلى كل ملف يتم تحميله. لتغييرها استبدلي ملف letterhead.jpg فقط.
const EX_LETTERHEAD = 'letterhead.jpg';
const EX_LETTER_RATIO = 351 / 2000; // ارتفاع/عرض الكليشة
const EX_XLSX_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
const EX_GRADE_COLORS = { 'gr-top': '0A5C32', 'gr-ex': '1B8F4E', 'gr-vg': '1F8A8A', 'gr-g': '2A73B8', 'gr-p': 'C98A0A', 'gr-w': 'E0531F', 'gr-f': 'B71C1C' };
const EX_PRIMARY = '7A1F2B';
/* تنسيق ملفات الإكسل: لتغيير الشكل يكفي تعديل هذا الكائن */
const EX_THEME = {   // ألوان مأخوذة من استمارة الإكسل الأصلية للجمعية
  font: 'Arial', size: 12, line: '000000',
  title: { fill: 'FFFFFF', color: '953734', size: 16 },
  head: { fill: 'F2DBDB', color: '000000' },
  label: { fill: 'F2DBDB', color: '000000' },
  sec: { fill: 'D9D9D9', color: '000000' },
  foot: { fill: 'F2F2F2', color: '000000' },
  num: 'F2F2F2',
  zebra: '', gradeFill: false, rowH: 22
};
let exCur = null;      // الاستمارة المفتوحة حالياً
let exLoading = null;
let exLetterBuf = null;   // الكليشة تُجلب مرة واحدة فقط

function exGradeColor(g) { return EX_GRADE_COLORS[gradeCls(g)] || ''; }
function exNum(v) { const n = parseFloat(v); return (v !== '' && v != null && !isNaN(n) && String(n) === String(v).trim()) ? n : v; }
function exSafe(s) { return String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').slice(0, 60); }

/* ---------- تحميل مكتبة الإكسل عند أول استخدام ---------- */
function exLoad() {
  if (window.ExcelJS) return Promise.resolve();
  if (exLoading) return exLoading;
  exLoading = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = EX_XLSX_LIB;
    sc.onload = () => res();
    sc.onerror = () => { exLoading = null; rej(new Error('تعذّر تحميل أداة التصدير، تأكدي من الاتصال بالإنترنت')); };
    document.head.appendChild(sc);
  });
  return exLoading;
}

/* ---------- نموذج بيانات الاستمارة (يُستخدم للإكسل) ---------- */
function exFormModel(r) {
  let items = [], ex = {};
  try { items = JSON.parse(r.items || '[]'); } catch (e) {}
  try { ex = JSON.parse(r.extra || '{}'); } catch (e) {}
  const ft = String(r.formType || '');
  const info = [], push = (l, v) => { if (v !== '' && v != null) info.push([l, String(v)]); };
  const m = { info, sections: [], totals: [], notes: [], landscape: false, gradeVal: r.grade };

  if (ft === 'tabyan' || ft === 'f_tabyan' || ft.indexOf('tj_') === 0 || ft.indexOf('f_tj_') === 0) {
    const isT = ft === 'tabyan' || ft === 'f_tabyan', fin = ft.indexOf('f_') === 0, single = /tj_single$/.test(ft);
    const list = isT ? TB.items : TJ_V[single ? 'single' : 'multi'].items;
    const max = list.reduce((a, i) => a + i[1], 0);
    m.title = isT ? 'استمارة تقييم أداء معلمة مادة التبيان ' + (fin ? '(النهائي)' : '(الأسبوعي)')
      : 'استمارة تقييم مادة التجويد ' + (fin ? 'النهائي' : 'الأسبوعي') + ' — ' + (single ? 'بدون تعدد المجموعات' : 'تعدد المجموعات');
    m.file = (isT ? 'التبيان' : 'التجويد') + (fin ? '_النهائي' : '') + '_' + exSafe(r.teacher) + '_' + exSafe(r.date);
    push('المركز', r.center); push('المعلمة', r.teacher); push('الفترة', r.period); push('اليوم', r.day); push('التاريخ', r.date);
    push('نوعها', ex.kind); push('الفئة', r.cat); push('العدد الكلي', r.total); push('العدد الحاضر', r.present);
    push('الفئة الثانية', ex.cat2); push('العدد الكلي (الفئة الثانية)', ex.total2); push('العدد الحاضر (الفئة الثانية)', ex.present2);
    push('عدد المجموعات', ex.groups); push('المؤهل في القرآن', r.qual); push('سنوات الخبرة', r.years);
    push('عنوان الدرس', r.lesson); push('اسم المشرفة', r.supervisor);
    m.cols = ['م', 'البند', 'الدرجة العظمى', 'الدرجة المكتسبة'];
    m.widths = [6, 62, 16, 18];
    m.sections.push({ title: '', rows: list.map((it, k) => [k + 1, it[0], it[1], exNum((items[k] || {}).s)]) });
    m.totals = [['المجموع الكلي من ' + max, exNum(r.raw)], ['التقدير', r.grade]];
    if (r.recs) m.notes.push(['التوصيات', r.recs]);
    return m;
  }

  if (ft === 'f_single' || ft === 'f_multi') {   // استمارة القرآن الكريم (النهائي): درجات فقط، ومجموع وموزونة لكل قسم
    const fm = ft === 'f_multi', FD = fm ? EV2 : EV;
    m.title = 'استمارة تقييم القرآن الكريم (النهائي) — ' + (fm ? 'تعدد المجموعات' : 'بدون تعدد المجموعات');
    m.file = 'القرآن_النهائي_' + exSafe(r.teacher) + '_' + exSafe(r.date);
    push('المركز', r.center); push('المعلمة', r.teacher); push('الفترة', r.period); push('اليوم', r.day); push('التاريخ', r.date);
    push('رقم الزيارة', r.visitNo); push('نوعها', ex.kind); push('الفئة', r.cat); push('المؤهل في القرآن', r.qual);
    push('العدد الكلي', r.total); push('العدد الحاضر', r.present); push('عدد المجموعات', ex.groups);
    push('الفئة الثانية', ex.cat2); push('العدد الكلي (الفئة الثانية)', ex.total2); push('العدد الحاضر (الفئة الثانية)', ex.present2);
    push('سنوات الخبرة', r.years); push('عنوان الدرس', r.lesson); push('اسم المشرفة', r.supervisor);
    m.cols = ['م', 'البند', 'الدرجة العظمى', 'الدرجة المكتسبة'];
    m.widths = [6, 62, 16, 18];
    let fn = 0;
    EV_SECTIONS.forEach(sec => {
      let sum = 0;
      const rows = FD[sec.key].map((it, k) => {
        const x = items[fn++] || {}, v = parseFloat(x.s);
        if (!isNaN(v)) sum += v;
        return [k + 1, it.t, it.max, exNum(x.s)];
      });
      m.sections.push({ title: sec.title, rows, footer: [['المجموع من ' + evFmt(sec.maxSum), sum], ['الدرجة الموزونة من ' + evFmt(sec.target), Math.round(sum * sec.target / sec.maxSum * 1000) / 1000]] });
    });
    m.totals = [['الدرجة الكلية من 100', exNum(r.raw)], ['الدرجة الموزونة', exNum(r.weighted)], ['التقدير', r.grade]];
    if (r.notes) m.notes.push(['ملاحظات المشرفة', r.notes]);
    if (r.recs) m.notes.push(['التوصيات', r.recs]);
    return m;
  }

  const multi = ft === 'multi', D = multi ? EV2 : EV;
  m.title = 'استمارة تقييم القرآن الكريم — ' + (multi ? 'تعدد المجموعات' : 'بدون تعدد المجموعات');
  m.file = 'القرآن_' + exSafe(r.teacher) + '_' + exSafe(r.date);
  push('المركز', r.center); push('المعلمة', r.teacher); push('الفترة', r.period); push('اليوم', r.day); push('التاريخ', r.date);
  push('الفئة', r.cat); push('المؤهل', r.qual); push('عنوان الدرس', r.lesson); push('سنوات الخبرة', r.years);
  push('العدد الكلي', r.total); push('العدد الحاضر', r.present); push('رقم الزيارة', r.visitNo); push('اسم المشرفة', r.supervisor);
  m.cols = ['م', 'البند', 'التنفيذ', 'الدرجة العظمى', 'الدرجة المكتسبة', 'سبب الخصم'];
  m.widths = [6, 44, 12, 14, 16, 46];
  let n = 0;
  EV_SECTIONS.forEach(sec => {
    m.sections.push({
      title: sec.title,
      rows: D[sec.key].map((it, k) => {
        const x = items[n++] || {};
        return [k + 1, it.t, x.e || '', it.max, exNum(x.s), [x.c === 'أخرى' ? '' : x.c, x.n].filter(Boolean).join(' | ')];
      })
    });
  });
  m.totals = [['الدرجة الكلية من 100', exNum(r.raw)], ['الدرجة الموزونة', exNum(r.weighted)], ['التقدير', r.grade]];
  if (r.notes) m.notes.push(['ملاحظات المشرفة', r.notes]);
  if (r.recs) m.notes.push(['توصيات المشرفة', r.recs]);
  return m;
}

/* ---------- نموذج كشف الخروج: زيارات كل مركز، وفي الأسفل الإجمالي العام لأيام الحضور والغياب ---------- */
function exVisitsModel(rows) {
  const today = new Date().toISOString().slice(0, 10);
  const centers = {};
  rows.forEach(v => { const k = v.center || V_NOC; (centers[k] = centers[k] || []).push(v); });
  const m = {
    title: 'كشف خروج المشرفة', file: 'كشف_الخروج_' + today, landscape: true, visits: true,
    info: [['المشرفة', getUser()], ['تاريخ التقرير', today]],
    cols: ['م', 'التاريخ', 'اليوم', 'الموافق', 'نوع الزيارة', 'الحالة', 'توقيع المديرة'],
    widths: [6, 14, 12, 24, 22, 42, 28], sections: [], totals: [], notes: []
  };
  let att = 0, abs = 0;
  Object.keys(centers).sort((a, b) => a.localeCompare(b, 'ar')).forEach(c => {
    const list = centers[c].slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const a1 = list.filter(v => !vIsAbsent(v)).length, a2 = list.length - a1;
    att += a1; abs += a2;
    m.sections.push({
      title: c,
      rows: list.map((v, i) => [i + 1, v.date, v.day, v.hijri || '', v.type || '—', vStatusOf(v), '']),
      sigIds: list.map(v => v.signature ? { id: v.id, url: v.signature } : null)
    });
  });
  m.info.push(['المراكز', String(Object.keys(centers).filter(k => k !== V_NOC).length)]);
  m.totals = [['إجمالي أيام الحضور', att], ['إجمالي أيام الغياب', abs]];   // الإجمالي العام فقط (بدون إجمالي لكل مركز)
  return m;
}

/* ---------- نموذج بيانات السجل (الجدول المعروض حالياً) ---------- */
function exListModel() {
  const tabLabel = { quran: 'القرآن الكريم', tabyan: 'التبيان', tajweed: 'التجويد', teachers: 'سجل المعلمات' }[evTab];
  const m = { title: 'سجل استمارات التقييم الأسبوعية — ' + tabLabel, file: 'سجل_' + tabLabel.replace(/\s+/g, '_'), landscape: true, info: [], sections: [], totals: [], notes: [] };
  if (evTab === 'teachers') {
    m.cols = ['المعلمة']; m.widths = [30]; m.gradeCols = [];
    EV_SUBJECTS.forEach(s => {
      m.cols.push(s.label + ' - الدرجة', s.label + ' - التقدير', s.label + ' - التاريخ');
      m.widths.push(16, 18, 14);
      m.gradeCols.push(m.cols.length - 2);
    });
    m.rows = evTeacherGroups().map(g => {
      const row = [g.name];
      EV_SUBJECTS.forEach(s => {
        const i = g.last[s.key];
        if (i === undefined) row.push('', '', '');
        else { const r = evRows[i]; row.push(exNum(s.key === 'quran' ? r.weighted : r.raw), r.grade, r.date); }
      });
      return row;
    });
    return m;
  }
  const sub = EV_SUBJECTS.find(x => x.key === evTab);
  const hasType = evTab !== 'tabyan';
  m.cols = ['التاريخ', 'المركز', 'المعلمة'].concat(hasType ? ['نوع الاستمارة'] : [], sub.weighted ? ['الدرجة من 100', 'الدرجة الموزونة'] : ['المجموع من ' + sub.max], ['التقدير']);
  m.widths = [14, 26, 28].concat(hasType ? [18] : [], sub.weighted ? [16, 16] : [16], [16]);
  m.gradeCols = [m.cols.length - 1];
  m.rows = evRows.filter(sub.match).map(r => {
    const t = (r.formType === 'multi' || r.formType === 'tj_multi') ? 'تعدد المجموعات' : (hasType ? 'بدون تعدد' : '');
    return [r.date, r.center, r.teacher].concat(hasType ? [t] : [], sub.weighted ? [exNum(r.raw), exNum(r.weighted)] : [exNum(r.raw)], [r.grade]);
  });
  return m;
}

/* ---------- نموذج سجل الاستمارات النهائية (الجدول المعروض حالياً) ---------- */
function exListModelF() {
  const tabLabel = efTab === 'teachers' ? 'سجل المعلمات' : (EF_SUBJECTS.find(x => x.key === efTab) || EF_SUBJECTS[0]).label;
  const m = { title: 'سجل استمارات التقييم النهائية — ' + tabLabel, file: 'سجل_النهائية_' + tabLabel.replace(/\s+/g, '_'), landscape: true, info: [], sections: [], totals: [], notes: [] };
  if (efTab === 'teachers') {
    m.cols = ['المعلمة']; m.widths = [30]; m.gradeCols = [];
    EF_SUBJECTS.forEach(s => {
      m.cols.push(s.label + ' - الدرجة', s.label + ' - التقدير', s.label + ' - التاريخ');
      m.widths.push(16, 18, 14);
      m.gradeCols.push(m.cols.length - 2);
    });
    m.rows = evTeacherGroups(EF_SUBJECTS).filter(g => EF_SUBJECTS.some(s => g.last[s.key] !== undefined)).map(g => {
      const row = [g.name];
      EF_SUBJECTS.forEach(s => {
        const i = g.last[s.key];
        if (i === undefined) row.push('', '', '');
        else { const r = evRows[i]; row.push(exNum(s.key === 'quran' ? r.weighted : r.raw), r.grade, r.date); }
      });
      return row;
    });
    return m;
  }
  const sub = EF_SUBJECTS.find(x => x.key === efTab) || EF_SUBJECTS[0];
  const hasType = sub.key !== 'tabyan';
  m.cols = ['التاريخ', 'المركز', 'المعلمة'].concat(hasType ? ['نوع الاستمارة'] : [], sub.weighted ? ['الدرجة من 100', 'الدرجة الموزونة'] : ['المجموع من ' + sub.max], ['التقدير']);
  m.widths = [14, 26, 28].concat(hasType ? [18] : [], sub.weighted ? [16, 16] : [16], [16]);
  m.gradeCols = [m.cols.length - 1];
  m.rows = evRows.filter(sub.match).map(r => {
    const t = (r.formType === 'f_multi' || r.formType === 'f_tj_multi') ? 'تعدد المجموعات' : 'بدون تعدد';
    return [r.date, r.center, r.teacher].concat(hasType ? [t] : [], sub.weighted ? [exNum(r.raw), exNum(r.weighted)] : [exNum(r.raw)], [r.grade]);
  });
  return m;
}

/* ---------- Excel ---------- */
async function exBuildXlsx(m, imgBuf, ExcelJS) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'جمعية فرقان لتحفيظ القرآن الكريم';
  const ws = wb.addWorksheet('الدرجات', {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: m.landscape ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.2 } }
  });
  const n = m.widths.length;
  ws.columns = m.widths.map(w => ({ width: w }));
  const T = Object.assign({}, EX_THEME, m.theme || {});
  const FONT = T.font;
  const thin = { style: 'thin', color: { argb: 'FF' + T.line } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = hex => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } });
  const pxW = m.widths.reduce((a, w) => a + Math.round(w * 7 + 5), 0);
  const imgH = Math.round(pxW * EX_LETTER_RATIO);

  // الكليشة: أعلى الملف
  const HR = 4;
  for (let i = 1; i <= HR; i++) ws.getRow(i).height = (imgH * 0.75) / HR;
  const imgId = wb.addImage({ buffer: imgBuf, extension: 'jpeg' });
  ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: pxW, height: imgH } });

  let row = HR + 2;
  const style = (cell, o) => {
    cell.font = { name: FONT, size: o.size || T.size, bold: !!o.bold, color: { argb: 'FF' + (o.color || '222222') } };
    cell.alignment = { horizontal: o.h || 'right', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
    if (o.fill) cell.fill = fill(o.fill);
    if (o.border !== false) cell.border = border;
  };
  const merged = (r, c1, c2, val, o, height) => {
    if (c2 > c1) ws.mergeCells(r, c1, r, c2);
    const cell = ws.getCell(r, c1); cell.value = val; style(cell, o);
    for (let c = c1 + 1; c <= c2; c++) ws.getCell(r, c).border = border;
    if (height) ws.getRow(r).height = height;
  };
  // إدراج توقيع (صورة) داخل خلية: sg = { data, w, h }
  const colPx = i => Math.round(m.widths[i] * 7 + 5);
  const putSig = (sg, r0, c0, boxW, boxH, rowPx) => {
    if (!sg || !sg.data) return;
    const k = Math.min(boxW / (sg.w || boxW), boxH / (sg.h || boxH), 1.6), w = Math.round((sg.w || boxW) * k), h = Math.round((sg.h || boxH) * k);
    const png = sg.data.indexOf('data:image/png') === 0;
    const id = wb.addImage({ base64: sg.data.split(',')[1], extension: png ? 'png' : 'jpeg' });
    ws.addImage(id, { tl: { col: c0 + Math.max(0, (boxW - w) / 2) / colPx(c0), row: r0 + Math.max(0, (rowPx - h) / 2) / rowPx }, ext: { width: w, height: h } });
  };
  const lines = (txt, width) => Math.max(1, Math.ceil(String(txt).length / Math.max(10, width)));
  const split = Math.min(2, n - 1);   // أول عمودين للعنوان والباقي للقيمة
  const valWidth = m.widths.slice(split).reduce((a, w) => a + w, 0);

  merged(row, 1, n, m.title, { bold: true, size: T.title.size, color: T.title.color, fill: T.title.fill, h: 'center' }, T.title.size * 2.1); row++;

  m.info.forEach(([l, v]) => {
    merged(row, 1, split, l, { bold: true, fill: T.label.fill, color: T.label.color });
    merged(row, split + 1, n, v, {}, Math.max(T.rowH || 20, lines(v, valWidth) * 16)); row++;
  });
  if (m.info.length) row++;

  if (m.rows) {            // سجل (جدول واحد)
    m.cols.forEach((c, i) => { const cell = ws.getCell(row, i + 1); cell.value = c; style(cell, { bold: true, color: T.head.color, fill: T.head.fill, h: 'center' }); });
    ws.getRow(row).height = 26;
    ws.views = [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: row }];
    row++;
    m.rows.forEach((rw, ri) => {
      rw.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1); cell.value = v;
        const isGrade = (m.gradeCols || []).indexOf(i) > -1 && v;
        style(cell, isGrade ? (T.gradeFill ? { bold: true, color: 'FFFFFF', fill: exGradeColor(v) || '777777', h: 'center' } : { bold: true, color: exGradeColor(v) || '222222', h: 'center' })
          : { h: i < 3 && typeof v !== 'number' ? 'right' : 'center', fill: ri % 2 && T.zebra ? T.zebra : undefined });
      });
      row++;
    });
    if (!m.rows.length) { merged(row, 1, n, 'لا توجد بيانات', { h: 'center' }); row++; }
    ws.headerFooter.oddFooter = '&Cصفحة &P من &N';
    return wb.xlsx.writeBuffer();
  }

  // استمارة
  m.cols.forEach((c, i) => { const cell = ws.getCell(row, i + 1); cell.value = c; style(cell, { bold: true, color: T.head.color, fill: T.head.fill, h: 'center' }); });
  ws.getRow(row).height = 26; row++;
  m.sections.forEach(sec => {
    if (sec.title) { merged(row, 1, n, sec.title, { bold: true, fill: T.sec.fill, color: T.sec.color }, 22); row++; }
    sec.rows.forEach((rw, ri) => {
      rw.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1); cell.value = v;
        const wide = m.widths[i] > 30;
        style(cell, { h: wide ? 'right' : 'center', bold: i === 0 && !!T.num, fill: i === 0 && T.num ? T.num : (ri % 2 && T.zebra ? T.zebra : undefined) });
      });
      if (T.rowH) ws.getRow(row).height = Math.max(T.rowH, rw.some((v, i) => m.widths[i] > 30 && String(v).length > m.widths[i]) ? T.rowH * 1.7 : 0);
      const sg = sec.sigs && sec.sigs[ri];
      if (sg) { ws.getRow(row).height = 56; putSig(sg, row - 1, n - 1, colPx(n - 1) - 8, 66, 75); }
      row++;
    });
    (sec.footer || []).forEach(([l, v]) => {
      merged(row, 1, split, l, { bold: true, fill: T.foot.fill, color: T.foot.color });
      merged(row, split + 1, n, v, { bold: true, size: T.size + 1, h: 'center', fill: T.foot.fill }, 22);
      row++;
    });
    if (sec.footer) row++;
  });
  row++;
  m.totals.forEach(([l, v]) => {
    const isG = l === 'التقدير';
    merged(row, 1, split, l, { bold: true, fill: T.label.fill, color: T.label.color });
    merged(row, split + 1, n, v, isG ? (T.gradeFill ? { bold: true, size: T.size + 2, color: 'FFFFFF', fill: exGradeColor(v) || '777777', h: 'center' } : { bold: true, size: T.size + 2, color: exGradeColor(v) || '222222', h: 'center' }) : { bold: true, size: T.size + 2, h: 'center' }, 24);
    row++;
  });
  if (m.notes.length) row++;
  m.notes.forEach(([l, v]) => {
    merged(row, 1, split, l, { bold: true, fill: T.label.fill, color: T.label.color });
    merged(row, split + 1, n, v, {}, Math.max(24, lines(v, valWidth) * 16)); row++;
  });
  if (m.signature && m.signature.data) {   // توقيع المشرفة
    row++;
    merged(row, 1, split, 'توقيع المشرفة', { bold: true, fill: T.label.fill, color: T.label.color });
    merged(row, split + 1, n, '', {}, 78);
    const boxW = m.widths.slice(split).reduce((a, w) => a + Math.round(w * 7 + 5), 0) - 12;
    putSig(m.signature, row - 1, split, Math.min(boxW, 260), 80, 104);
    row++;
  }
  return wb.xlsx.writeBuffer();
}

/* ---------- التنفيذ ---------- */
function exSave(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

// يبني ملف الإكسل ويعيده كـ Blob (يُستخدم للتحميل وللإرسال للمركز)
async function exBlob(m, pre) {
  if (pre) await pre(m);   // مثلاً جلب التواقيع قبل البناء
  await exLoad();
  if (!exLetterBuf) {
    const resp = await fetch(EX_LETTERHEAD);
    if (!resp.ok) throw new Error('تعذّر تحميل الكليشة (letterhead.jpg)');
    exLetterBuf = await resp.arrayBuffer();
  }
  const out = await exBuildXlsx(m, exLetterBuf, window.ExcelJS);
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
async function exRun(m, btn, pre) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    exSave(await exBlob(m, pre), m.file + '.xlsx');
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر التحميل', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}

// أبعاد صورة التوقيع (لتناسبها داخل الخلية)
function exImgDims(d) {
  return new Promise(res => { const im = new Image(); im.onload = () => res({ data: d, w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res(null); im.src = d; });
}
// جلب التواقيع من الخادم: items = [{id, url}] → { id: {data,w,h} }
async function exFetchSigs(items) {
  items = items.filter(Boolean);
  const out = {};
  if (!items.length) return out;
  const res = await api('getSigs', { items });
  const map = res.data || {};
  await Promise.all(Object.keys(map).map(async id => { const d = await exImgDims(map[id]); if (d) out[id] = d; }));
  return out;
}

// تحميل استمارة واحدة من السجل (مع التوقيع إن وُجد)
function exRow(i, btn) {
  const r = evRows[i];
  if (!r) return;
  exRun(exFormModel(r), btn, async m => {
    if (r.signature) { const sg = await exFetchSigs([{ id: r.id, url: r.signature }]); m.signature = sg[r.id] || null; }
  });
}
// «📤 إرسال للمركز» لاستمارات التقييم (الأسبوعية والنهائية): تُرسل بملف Excel المنسّق بالكليشة
const exSigPre = r => async m => { if (r.signature) { const sg = await exFetchSigs([{ id: r.id, url: r.signature }]); m.signature = sg[r.id] || null; } };
if (typeof scRegister === 'function') scRegister('ev', {
  rec: id => evRows.find(r => r.id === id),
  title: r => { let t = 'استمارة تقييم'; try { t = exFormModel(r).title || t; } catch (e) {} return t + ' — ' + r.teacher + ' — ' + r.date; },
  center: r => r.center || '', period: r => r.period || '',
  file: async r => { const m = exFormModel(r); return { blob: await exBlob(m, exSigPre(r)), name: m.file + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }; },
  alt: async r => { const m = exFormModel(r), sigs = await tvLoadSigs(r); return { blob: await sgPdfBlob(tvRec(r), sigs), name: m.file + '.pdf', mime: 'application/pdf' }; }   // نسخة PDF
});
// تحميل كشف الخروج: كل مركز وتحته أيام الحضور والغياب (حسب تصفية المركز المعروضة)
function exVisits(btn) {
  const f = document.getElementById('fCenter').value;
  const rows = VISITS.filter(v => !f || v.center === f);
  if (!rows.length) return toast('لا توجد زيارات للتحميل', false);
  exRun(exVisitsModel(rows), btn, async m => {
    const items = [];
    m.sections.forEach(sec => sec.sigIds.forEach(x => x && items.push(x)));
    if (!items.length) return;
    const sg = await exFetchSigs(items);
    m.sections.forEach(sec => { sec.sigs = sec.sigIds.map(x => (x && sg[x.id]) || null); });
  });
}
// تحميل الجدول المعروض (سجل المعلمات)
function exList(btn) { exRun(exListModel(), btn); }
// تحميل جدول سجل الاستمارات النهائية
function exListF(btn) { exRun(exListModelF(), btn); }

// تحميل مسبق لمكتبة الإكسل والكليشة وقت الفراغ ليكون أول تحميل سريعاً
let exPre = false;
function exPrefetch() {
  if (exPre) return; exPre = true;
  const go = () => { exLoad().catch(() => {}); fetch(EX_LETTERHEAD).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) exLetterBuf = b; }).catch(() => {}); };
  (window.requestIdleCallback || (f => setTimeout(f, 2500)))(go);
}

/* ===================== كشف الخروج: طباعة وتحميل PDF بتنسيق الاستمارات =====================
   الكليشة الحمراء من الطرف إلى الطرف، والعنوان العنابي، وجدول لكل مركز فيه صورة توقيع المديرة،
   مع إجمالي أيام الحضور والغياب. يُقسَّم تلقائياً على صفحات A4 طولية (الكليشة أعلى كل صفحة). */
const KF_CSS = `
.im-page.kf{width:1123px;height:794px;overflow:hidden;position:relative;background:#fff;font-size:13.5px;color:#2f2f2f}
.im-page.kf .idc-body{padding:0 34px}
.im-page.kf .kf-title{text-align:center;font-size:22px;font-weight:800;color:#7a1f2b;margin:14px 0 12px}
.im-page.kf .kf-cards{display:flex;gap:12px;margin:0 0 14px}
.im-page.kf .kf-cards>div{flex:1;border:1px solid #e6e6e6;border-radius:8px;padding:7px 14px;display:flex;justify-content:space-between;align-items:center;background:#fafafa}
.im-page.kf .kf-cards span{color:#777;font-weight:700;font-size:13px}
.im-page.kf .kf-cards b{color:#2f2f2f;font-size:14.5px}
.im-page.kf table{font-size:13.5px;table-layout:fixed;width:100%;border-collapse:collapse}
.idoc .im-page.kf th,.idoc .im-page.kf td{border:0 !important;border-bottom:1px solid #ececec !important;color:#2f2f2f}
.idoc .im-page.kf th{padding:9px 6px;font-size:13.5px;font-weight:800;background:#f4f4f4 !important;color:#555 !important;border-bottom:2px solid #7a1f2b !important}
.im-page.kf td{padding:3px 6px;height:31px;text-align:center;line-height:1.3}
.idoc .im-page.kf tr.kf-c td{background:#fff;color:#7a1f2b;font-weight:800;text-align:right;height:34px;padding-top:10px;font-size:14.5px;border-bottom:1px solid #d9c3c8 !important}
.idoc .im-page.kf tr.kf-t td{border:0 !important;padding:14px 0 0;height:auto}
.im-page.kf .kf-tot{display:flex;gap:12px;justify-content:flex-start}
.im-page.kf .kf-tot>div{min-width:230px;border:1px solid #e6e6e6;border-radius:8px;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;background:#fafafa}
.im-page.kf .kf-tot span{color:#555;font-weight:700}
.im-page.kf .kf-tot b{color:#7a1f2b;font-size:17px}
.im-page.kf td.idc-n{color:#888}
.im-page.kf img.kf-sig{height:27px;width:auto;max-width:130px;display:block;margin:auto}
.im-page.kf .kf-pg{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:11px;color:#000}
/* التنسيق المعتمد: رسمي بالأسود، ورأس الجدول عنابي، واسم المركز عنابي بشريط جانبي، وخط Tajawal مع عنوان Amiri مثل نظام المقاصف */
.idoc .im-page.kf,.idoc .im-page.kf *{font-family:'Tajawal','Segoe UI',Tahoma,sans-serif !important}
.idoc .im-page.kf .kf-title{font-family:'Amiri',serif !important;font-size:29px}
.idoc .im-page.kf td{height:36px;font-size:15.5px;font-weight:400;color:#000 !important}
.idoc .im-page.kf th,.idoc .im-page.kf td{border:1px solid #000 !important}
.idoc .im-page.kf th{background:#f2dbdb !important;color:#000 !important;border-color:#000 !important;font-weight:700;font-size:15.5px}
.idoc .im-page.kf tr.kf-c td{border:1px solid #000 !important;background:#d9d9d9 !important;color:#000 !important;padding-top:3px;font-weight:700}
.idoc .im-page.kf tr.kf-t td{border:0 !important;background:transparent !important}
.idoc .im-page.kf td.idc-n{color:#000 !important;background:#f2f2f2 !important;font-weight:700}
.im-page.kf .kf-title{color:#953734 !important}
.im-page.kf .kf-cards{gap:40px;justify-content:flex-start}
.im-page.kf .kf-tot{gap:40px;padding-top:4px}
.im-page.kf .kf-cards>div,.im-page.kf .kf-tot>div{flex:0 0 auto;min-width:0;background:none !important;border:0 !important;padding:0 !important;gap:8px;justify-content:flex-start}
.im-page.kf .kf-cards span,.im-page.kf .kf-tot span{color:#000 !important;font-weight:700}
.im-page.kf .kf-cards b,.im-page.kf .kf-tot b,.im-page.kf .kf-cards b *,.im-page.kf .kf-tot b *{color:#953734 !important}
.im-page.kf .kf-cards span,.im-page.kf .kf-cards b,.im-page.kf .kf-tot span,.im-page.kf .kf-tot b{font-size:16px !important}
.im-page.kf .kf-tot b{font-size:18px !important}
`;
function kfHijri(dateStr) {
  const p = String(dateStr || '').split(' ')[0].split('-');
  if (p.length !== 3) return '';
  try {
    const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(+p[0], +p[1] - 1, +p[2]));
    const g = t => ((parts.find(x => x.type === t) || {}).value || '');
    return '<bdi>' + idDigits(g('day').replace(/\D/g, '')) + ' ' + esc(g('month')) + ' ' + idDigits(g('year').replace(/\D/g, '')) + ' هـ</bdi>';
  } catch (e) { return ''; }
}
function kfGreg(d) {
  const p = String(d || '').split(' ')[0].split('-');
  return p.length === 3 ? '<span class="idc-date"><bdi>' + idDigits(p[0]) + '</bdi>-<bdi>' + idDigits(p[1]) + '</bdi>-<bdi>' + idDigits(p[2]) + '</bdi></span>' : esc(d || '');
}
async function kfSigs(rows) {
  const need = rows.filter(v => v.signature && v.id && !VSIG[v.id]).map(v => ({ id: v.id }));
  for (let i = 0; i < need.length; i += 100) {
    const part = need.slice(i, i + 100);
    try { const o = await api('getSigs', { items: part }); const m = (o && o.data) || {}; part.forEach(x => { VSIG[x.id] = m[x.id] || ''; }); } catch (e) {}
  }
}
// صفحات الكشف: نقيس ارتفاع كل صف فعلياً ونبدأ صفحة جديدة عند امتلاء الصفحة
async function kfPages(rows, lhUrl) {
  if (!document.getElementById('kfFont')) { const l = document.createElement('link'); l.id = 'kfFont'; l.rel = 'stylesheet'; l.href = ID_FONT_CSS; document.head.appendChild(l); }
  await kfSigs(rows);
  try { await Promise.all([document.fonts.load("14px 'Tajawal'"), document.fonts.load("700 26px 'Amiri'")]); } catch (e) {}
  const m = exVisitsModel(rows);
  const lh = esc(lhUrl || ID_LETTERHEAD);
  const today = new Date(); const td = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const centersN = (m.info.find(x => x[0] === 'المراكز') || [])[1] || '';
  const card = (l, v) => '<div><span>' + l + ':</span><b><bdi>' + v + '</bdi></b></div>';
  const top = '<img class="idc-lh" src="' + lh + '" width="2000" height="351" alt=""><div class="idc-body"><div class="kf-title">كشف خروج المشرفة</div>' +
    '<div class="kf-cards">' + card('المشرفة', esc(getUser())) + card('تاريخ التقرير', kfGreg(td)) + card('عدد المراكز', idDigits(centersN)) + '</div>';
  const thead = '<table><colgroup><col style="width:4%"><col style="width:10%"><col style="width:8%"><col style="width:16%"><col style="width:15%"><col style="width:28%"><col style="width:19%"></colgroup>' +
    '<tr><th>م</th><th>التاريخ</th><th>اليوم</th><th>الموافق</th><th>نوع الزيارة</th><th>الحالة</th><th>توقيع المديرة</th></tr>';
  const list = [];
  let att = 0, abs = 0;
  const byCenter = {};
  rows.forEach(v => { const k = v.center || V_NOC; (byCenter[k] = byCenter[k] || []).push(v); });
  Object.keys(byCenter).sort((a, b) => a.localeCompare(b, 'ar')).forEach(c => {
    const L = byCenter[c].slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const a1 = L.filter(v => !vIsAbsent(v)).length, a2 = L.length - a1; att += a1; abs += a2;
    list.push('<tr class="kf-c"><td colspan="7">' + esc(c) + '</td></tr>');
    L.forEach((v, i) => list.push('<tr><td class="idc-n">' + idDigits(i + 1) + '</td><td>' + kfGreg(v.date) + '</td><td>' + esc(v.day || '') + '</td><td>' + kfHijri(v.date) + '</td><td>' + esc(v.type || '—') + '</td><td>' + esc(vStatusOf(v)) + '</td><td>' +
      (VSIG[v.id] ? '<img class="kf-sig" src="' + VSIG[v.id] + '" alt="">' : '') + '</td></tr>'));
  });
  list.push('<tr class="kf-t"><td colspan="7"><div class="kf-tot">' + card('إجمالي أيام الحضور', idDigits(att)) + card('إجمالي أيام الغياب', idDigits(abs)) + '</div></td></tr>');
  // القياس
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:0;left:-3000px;width:1123px;visibility:hidden;direction:rtl';
  box.innerHTML = '<style>' + ID_CSS + KF_CSS + '.idoc{width:1123px;padding:0}</style><div class="idoc imdoc"><div class="im-page kf">' + top + thead + '</table></div></div></div>';
  document.body.appendChild(box);
  const page = box.querySelector('.im-page');
  await Promise.all([...box.querySelectorAll('img')].map(x => x.complete ? 0 : new Promise(r => { x.onload = x.onerror = r; })));
  const limit = 794 - 62;
  const pages = []; let cur = [];
  const table = () => page.querySelector('table');
  let curCenter = '';
  for (const tr of list) {
    if (tr.indexOf('kf-c') > -1) curCenter = tr;
    table().insertAdjacentHTML('beforeend', tr);
    if (page.querySelector('.idc-body').getBoundingClientRect().bottom - page.getBoundingClientRect().top > limit && cur.length) {
      // عنوان المركز لا يبقى وحده أسفل الصفحة: ينتقل مع أول زيارة إلى الصفحة التالية
      const carry = cur[cur.length - 1].indexOf('kf-c') > -1 ? [cur.pop()]
        : (tr.indexOf('kf-t') > -1 && cur.length > 2 && curCenter ? [curCenter.replace('<td colspan="7">', '<td colspan="7">تابع: '), cur.pop()]   // الإجمالي لا يبقى وحده في صفحة
        : (tr.indexOf('kf-c') < 0 && tr.indexOf('kf-t') < 0 && curCenter ? [curCenter.replace('<td colspan="7">', '<td colspan="7">تابع: ')] : []));   // نكرر اسم المركز أعلى الصفحة التالية
      pages.push(cur); cur = carry;
      table().innerHTML = thead.replace(/^<table>/, '') + carry.join('');
      table().insertAdjacentHTML('beforeend', tr);
    }
    cur.push(tr);
  }
  if (cur.length) pages.push(cur);
  box.remove();
  return pages.map((p, i) => '<div class="im-page kf">' + top + thead + p.join('') + '</table></div>' +
    (pages.length > 1 ? '<div class="kf-pg">صفحة ' + idDigits(i + 1) + ' من ' + idDigits(pages.length) + '</div>' : '') + '</div>');
}
function kfRows() {
  const f = document.getElementById('fCenter').value;
  return VISITS.filter(v => !f || v.center === f);
}
async function kfPdf(btn) {
  const rows = kfRows();
  if (!rows.length) return toast('لا توجد زيارات للتحميل', false);
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    const pages = await kfPages(rows);
    idSaveBlob(await idPagesPdf(pages, KF_CSS, false), 'كشف_الخروج_' + getUser().replace(/\s+/g, '_') + '.pdf');
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر تحميل PDF', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}
async function kfPrint(btn) {
  const rows = kfRows();
  if (!rows.length) return toast('لا توجد زيارات للطباعة', false);
  const w = window.open('', '_blank');
  if (!w) return toast('اسمحي بالنوافذ المنبثقة لهذا الموقع ثم أعيدي المحاولة', false);
  w.document.write('<p style="font-family:Tahoma;text-align:center;margin-top:40px">جارِ التجهيز...</p>');
  if (btn) setBtnBusy(btn, true, '...');
  try {
    const pages = await kfPages(rows, new URL(ID_LETTERHEAD, location.href).href);
    w.document.open();
    w.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>كشف الخروج</title><link rel="stylesheet" href="' + ID_FONT_CSS + '">' +
      '<style>@page{size:A4 portrait;margin:0}html,body{margin:0;background:#fff}' + ID_CSS + KF_CSS +
      '.idoc{width:794px;padding:0}.im-page.kf{page-break-after:always;break-after:page}.im-page.kf:last-child{page-break-after:auto;break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><div class="idoc ptdoc">' +
      pages.join('') + '</div></body></html>');
    w.document.close();
    const go = () => setTimeout(() => { w.focus(); w.print(); }, 300);
    const img = w.document.querySelector('.idc-lh');
    if (img && !img.complete) { img.onload = go; img.onerror = go; } else go();
  } catch (e) { w.close(); toast(e.message || 'تعذّرت الطباعة', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}
