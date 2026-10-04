// ===== تحميل الدرجات: Excel فقط مع الكليشة الثابتة (letterhead.jpg) =====
// الكليشة في أعلى كل ملف يتم تحميله. لتغييرها استبدلي ملف letterhead.jpg فقط.
const EX_LETTERHEAD = 'letterhead.jpg';
const EX_LETTER_RATIO = 351 / 2000; // ارتفاع/عرض الكليشة
const EX_XLSX_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
const EX_GRADE_COLORS = { 'gr-top': '0A5C32', 'gr-ex': '1B8F4E', 'gr-vg': '1F8A8A', 'gr-g': '2A73B8', 'gr-p': 'C98A0A', 'gr-w': 'E0531F', 'gr-f': 'B71C1C' };
const EX_PRIMARY = '7A1F2B';
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

  if (ft === 'tabyan' || ft.indexOf('tj_') === 0) {
    const isT = ft === 'tabyan';
    const list = isT ? TB.items : TJ_V[ft === 'tj_single' ? 'single' : 'multi'].items;
    const max = list.reduce((a, i) => a + i[1], 0);
    m.title = isT ? 'استمارة تقييم أداء معلمة مادة التبيان (الأسبوعي)'
      : 'استمارة تقييم مادة التجويد الأسبوعي — ' + (ft === 'tj_single' ? 'بدون تعدد المجموعات' : 'تعدد المجموعات');
    m.file = (isT ? 'التبيان' : 'التجويد') + '_' + exSafe(r.teacher) + '_' + exSafe(r.date);
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
  m.cols = ['م', 'البند', 'التنفيذ', 'الدرجة العظمى', 'الدرجة المكتسبة', 'المعايير والتوجيه'];
  m.widths = [6, 44, 12, 14, 16, 46];
  let n = 0;
  EV_SECTIONS.forEach(sec => {
    m.sections.push({
      title: sec.title,
      rows: D[sec.key].map((it, k) => {
        const x = items[n++] || {};
        return [k + 1, it.t, x.e || '', it.max, exNum(x.s), [x.c, x.n].filter(Boolean).join(' | ')];
      })
    });
  });
  m.totals = [['الدرجة الكلية من 100', exNum(r.raw)], ['الدرجة الموزونة', exNum(r.weighted)], ['التقدير', r.grade]];
  if (r.notes) m.notes.push(['ملاحظات المشرفة', r.notes]);
  if (r.recs) m.notes.push(['توصيات المشرفة', r.recs]);
  return m;
}

/* ---------- نموذج كشف الخروج: كل مركز وتحته أيام الحضور والغياب ---------- */
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
      sigIds: list.map(v => v.signature ? { id: v.id, url: v.signature } : null),
      footer: [['إجمالي أيام الحضور', a1], ['إجمالي أيام الغياب', a2]]
    });
  });
  m.info.push(['المراكز', String(Object.keys(centers).filter(k => k !== V_NOC).length)]);
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
        else { const r = evRows[i]; row.push(exNum(r.weighted), r.grade, r.date); }
      });
      return row;
    });
    return m;
  }
  const sub = EF_SUBJECTS.find(x => x.key === efTab) || EF_SUBJECTS[0];
  m.cols = ['التاريخ', 'المركز', 'المعلمة', 'نوع الاستمارة', 'الدرجة من 100', 'الدرجة الموزونة', 'التقدير'];
  m.widths = [14, 26, 28, 18, 16, 16, 16];
  m.gradeCols = [6];
  m.rows = evRows.filter(sub.match).map(r => [r.date, r.center, r.teacher, r.formType === 'f_multi' ? 'تعدد المجموعات' : 'بدون تعدد', exNum(r.raw), exNum(r.weighted), r.grade]);
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
  const FONT = 'Arial';
  const thin = { style: 'thin', color: { argb: 'FFD9C7C0' } };
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
    cell.font = { name: FONT, size: o.size || 11, bold: !!o.bold, color: { argb: 'FF' + (o.color || '222222') } };
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

  merged(row, 1, n, m.title, { bold: true, size: 14, color: 'FFFFFF', fill: EX_PRIMARY, h: 'center' }, 28); row++;

  m.info.forEach(([l, v]) => {
    merged(row, 1, split, l, { bold: true, fill: 'F6F0F2' });
    merged(row, split + 1, n, v, {}, Math.max(20, lines(v, valWidth) * 16)); row++;
  });
  if (m.info.length) row++;

  if (m.rows) {            // سجل (جدول واحد)
    m.cols.forEach((c, i) => { const cell = ws.getCell(row, i + 1); cell.value = c; style(cell, { bold: true, color: 'FFFFFF', fill: EX_PRIMARY, h: 'center' }); });
    ws.getRow(row).height = 26;
    ws.views = [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: row }];
    row++;
    m.rows.forEach((rw, ri) => {
      rw.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1); cell.value = v;
        const isGrade = (m.gradeCols || []).indexOf(i) > -1 && v;
        style(cell, isGrade ? { bold: true, color: 'FFFFFF', fill: exGradeColor(v) || '777777', h: 'center' }
          : { h: i < 3 && typeof v !== 'number' ? 'right' : 'center', fill: ri % 2 ? 'FAF7F8' : undefined });
      });
      row++;
    });
    if (!m.rows.length) { merged(row, 1, n, 'لا توجد بيانات', { h: 'center' }); row++; }
    ws.headerFooter.oddFooter = '&Cصفحة &P من &N';
    return wb.xlsx.writeBuffer();
  }

  // استمارة
  m.cols.forEach((c, i) => { const cell = ws.getCell(row, i + 1); cell.value = c; style(cell, { bold: true, color: 'FFFFFF', fill: EX_PRIMARY, h: 'center' }); });
  ws.getRow(row).height = 26; row++;
  m.sections.forEach(sec => {
    if (sec.title) { merged(row, 1, n, sec.title, { bold: true, fill: 'F3E3E6', color: EX_PRIMARY }, 22); row++; }
    sec.rows.forEach((rw, ri) => {
      rw.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1); cell.value = v;
        const wide = m.widths[i] > 30;
        style(cell, { h: wide ? 'right' : 'center', fill: ri % 2 ? 'FAF7F8' : undefined });
      });
      const sg = sec.sigs && sec.sigs[ri];
      if (sg) { ws.getRow(row).height = 56; putSig(sg, row - 1, n - 1, colPx(n - 1) - 8, 66, 75); }
      row++;
    });
    (sec.footer || []).forEach(([l, v]) => {
      merged(row, 1, split, l, { bold: true, fill: 'EFE3E6', color: EX_PRIMARY });
      merged(row, split + 1, n, v, { bold: true, size: 12, h: 'center', fill: 'EFE3E6' }, 22);
      row++;
    });
    if (sec.footer) row++;
  });
  row++;
  m.totals.forEach(([l, v]) => {
    const isG = l === 'التقدير';
    merged(row, 1, split, l, { bold: true, fill: 'F6F0F2' });
    merged(row, split + 1, n, v, isG ? { bold: true, size: 13, color: 'FFFFFF', fill: exGradeColor(v) || '777777', h: 'center' } : { bold: true, size: 13, h: 'center' }, 24);
    row++;
  });
  if (m.notes.length) row++;
  m.notes.forEach(([l, v]) => {
    merged(row, 1, split, l, { bold: true, fill: 'F6F0F2' });
    merged(row, split + 1, n, v, {}, Math.max(24, lines(v, valWidth) * 16)); row++;
  });
  if (m.signature && m.signature.data) {   // توقيع المشرفة
    row++;
    merged(row, 1, split, 'توقيع المشرفة', { bold: true, fill: 'F6F0F2' });
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

async function exRun(m, btn, pre) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    if (pre) await pre(m);   // مثلاً جلب التواقيع قبل البناء
    await exLoad();
    if (!exLetterBuf) {
      const resp = await fetch(EX_LETTERHEAD);
      if (!resp.ok) throw new Error('تعذّر تحميل الكليشة (letterhead.jpg)');
      exLetterBuf = await resp.arrayBuffer();
    }
    const out = await exBuildXlsx(m, exLetterBuf, window.ExcelJS);
    exSave(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), m.file + '.xlsx');
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
