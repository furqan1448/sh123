// ===== تحميل الدرجات: Excel / PDF مع الكليشة الثابتة (letterhead.jpg) =====
// الكليشة في أعلى كل ملف يتم تحميله. لتغييرها استبدلي ملف letterhead.jpg فقط.
const EX_LETTERHEAD = 'letterhead.jpg';
const EX_LETTER_RATIO = 351 / 2000; // ارتفاع/عرض الكليشة
const EX_LIBS = {
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
};
const EX_GRADE_COLORS = { 'gr-top': '0A5C32', 'gr-ex': '1B8F4E', 'gr-vg': '1F8A8A', 'gr-g': '2A73B8', 'gr-p': 'C98A0A', 'gr-w': 'E0531F', 'gr-f': 'B71C1C' };
const EX_PRIMARY = '7A1F2B';
let exCur = null;      // الاستمارة المفتوحة حالياً
const exLoading = {};

function exGradeColor(g) { return EX_GRADE_COLORS[gradeCls(g)] || ''; }
function exNum(v) { const n = parseFloat(v); return (v !== '' && v != null && !isNaN(n) && String(n) === String(v).trim()) ? n : v; }
function exSafe(s) { return String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').slice(0, 60); }

/* ---------- تحميل المكتبات عند أول استخدام ---------- */
function exLoad(kind) {
  if ((kind === 'xlsx' && window.ExcelJS) || (kind === 'pdf' && window.html2pdf)) return Promise.resolve();
  if (exLoading[kind]) return exLoading[kind];
  exLoading[kind] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = EX_LIBS[kind];
    s.onload = () => res();
    s.onerror = () => { exLoading[kind] = null; rej(new Error('تعذّر تحميل أداة التصدير، تأكدي من الاتصال بالإنترنت')); };
    document.head.appendChild(s);
  });
  return exLoading[kind];
}

/* ---------- نموذج بيانات الاستمارة (يُستخدم للـ Excel والـ PDF) ---------- */
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
      row++;
    });
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
  return wb.xlsx.writeBuffer();
}

/* ---------- PDF (يُرسم كصفحة HTML ثم يُحوَّل، فيظهر العربي سليماً) ---------- */
function exPdfHtml(m, W) {
  const e = esc, td = (v, st) => '<td style="' + (st || '') + '">' + e(v) + '</td>';
  const gp = g => {
    const c = exGradeColor(g);
    return c ? '<span style="display:inline-block;background:#' + c + ';color:#fff;font-weight:700;padding:3px 16px;border-radius:14px">' + e(g) + '</span>' : e(g);
  };
  let h = '<style>.exp{direction:rtl;font-family:\'Tajawal\',\'Cairo\',\'Segoe UI\',Tahoma,sans-serif;color:#222;background:#fff;font-size:13px;line-height:1.7}' +
    '.exp table{width:100%;border-collapse:collapse;margin-bottom:12px}.exp td,.exp th{border:1px solid #d9c7c0;padding:5px 8px;vertical-align:middle}' +
    '.exp th{background:#7a1f2b;color:#fff;font-weight:700;text-align:center}.exp .lb{background:#f6f0f2;font-weight:700;width:16%}' +
    '.exp .sec td{background:#f3e3e6;color:#7a1f2b;font-weight:700}.exp tr{page-break-inside:avoid}</style>' +
    '<div class="exp" style="width:' + W + 'px">' +
    '<img id="exPdfLetter" src="' + EX_LETTERHEAD + '" style="width:100%;display:block;margin-bottom:10px">' +
    '<div style="background:#7a1f2b;color:#fff;text-align:center;font-weight:700;font-size:17px;padding:8px;border-radius:6px;margin-bottom:10px">' + e(m.title) + '</div>';

  if (m.info.length) {
    h += '<table>';
    for (let i = 0; i < m.info.length; i += 2) {
      const a = m.info[i], b = m.info[i + 1];
      h += '<tr><td class="lb">' + e(a[0]) + '</td>' + td(a[1], b ? 'width:34%' : '') + (b ? '<td class="lb">' + e(b[0]) + '</td>' + td(b[1], 'width:34%') : '<td class="lb"></td><td></td>') + '</tr>';
    }
    h += '</table>';
  }

  const center = (i, v) => (typeof v === 'number' || m.widths[i] <= 30) && !(i < 3 && m.rows && typeof v !== 'number') ? 'text-align:center' : 'text-align:right';
  if (m.rows) {
    h += '<table><thead><tr>' + m.cols.map(c => '<th>' + e(c) + '</th>').join('') + '</tr></thead><tbody>';
    m.rows.forEach((rw, ri) => {
      h += '<tr style="' + (ri % 2 ? 'background:#faf7f8' : '') + '">' + rw.map((v, i) => {
        const isG = (m.gradeCols || []).indexOf(i) > -1 && v;
        return '<td style="' + (isG ? 'text-align:center' : center(i, v)) + '">' + (isG ? gp(v) : e(v)) + '</td>';
      }).join('') + '</tr>';
    });
    if (!m.rows.length) h += '<tr><td colspan="' + m.cols.length + '" style="text-align:center">لا توجد بيانات</td></tr>';
    h += '</tbody></table>';
  } else {
    h += '<table><thead><tr>' + m.cols.map(c => '<th>' + e(c) + '</th>').join('') + '</tr></thead><tbody>';
    m.sections.forEach(sec => {
      if (sec.title) h += '<tr class="sec"><td colspan="' + m.cols.length + '">' + e(sec.title) + '</td></tr>';
      sec.rows.forEach((rw, ri) => {
        h += '<tr style="' + (ri % 2 ? 'background:#faf7f8' : '') + '">' + rw.map((v, i) => '<td style="' + (m.widths[i] > 30 ? 'text-align:right' : 'text-align:center') + (i === 0 ? ';width:5%' : '') + '">' + e(v) + '</td>').join('') + '</tr>';
      });
    });
    h += '</tbody></table>';
    h += '<table>' + m.totals.map(([l, v]) => '<tr><td class="lb" style="width:40%">' + e(l) + '</td><td style="text-align:center;font-weight:700;font-size:15px">' + (l === 'التقدير' ? gp(v) : e(v)) + '</td></tr>').join('') + '</table>';
    if (m.notes.length) h += '<table>' + m.notes.map(([l, v]) => '<tr><td class="lb">' + e(l) + '</td><td>' + e(v) + '</td></tr>').join('') + '</table>';
  }
  return h + '</div>';
}

async function exPdf(m) {
  const W = m.landscape ? 1100 : 780;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:0;left:-12000px;background:#fff;z-index:-1';
  box.innerHTML = exPdfHtml(m, W);
  document.body.appendChild(box);
  try {
    const img = box.querySelector('#exPdfLetter');
    await new Promise((res, rej) => {
      if (img.complete && img.naturalWidth) return res();
      img.onload = () => res(); img.onerror = () => rej(new Error('تعذّر تحميل الكليشة (letterhead.jpg)'));
    });
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await window.html2pdf().set({
      margin: [6, 6, 8, 6],
      filename: m.file + '.pdf',
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: W },
      jsPDF: { unit: 'mm', format: 'a4', orientation: m.landscape ? 'landscape' : 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'img'] }
    }).from(box.firstElementChild.nextElementSibling || box).save();
  } finally { box.remove(); }
}

/* ---------- التنفيذ ---------- */
function exSave(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

async function exRun(kind, m, btn) {
  if (btn) setBtnBusy(btn, true);
  try {
    await exLoad(kind);
    if (kind === 'xlsx') {
      const resp = await fetch(EX_LETTERHEAD);
      if (!resp.ok) throw new Error('تعذّر تحميل الكليشة (letterhead.jpg)');
      const out = await exBuildXlsx(m, await resp.arrayBuffer(), window.ExcelJS);
      exSave(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), m.file + '.xlsx');
    } else {
      await exPdf(m);
    }
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر التحميل', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}

function exForm(kind, btn) { if (exCur) exRun(kind, exFormModel(exCur), btn); }
function exList(kind, btn) { exRun(kind, exListModel(), btn); }

// أزرار التحميل أعلى نافذة عرض الاستمارة
function exAttach(r) {
  exCur = r;
  const box = document.getElementById('evModalBody');
  const bar = document.createElement('div');
  bar.className = 'ex-bar';
  bar.innerHTML = '<button class="btn light" onclick="exForm(\'pdf\', this)">تحميل PDF</button><button class="btn light" onclick="exForm(\'xlsx\', this)">تحميل Excel</button>';
  box.insertBefore(bar, box.firstChild);
}
