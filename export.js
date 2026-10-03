// ===== تحميل الدرجات: Excel / PDF مع الكليشة الثابتة (letterhead.jpg) =====
// الكليشة في أعلى كل ملف يتم تحميله. لتغييرها استبدلي ملف letterhead.jpg فقط.
const EX_LETTERHEAD = 'letterhead.jpg';
const EX_LETTER_RATIO = 351 / 2000; // ارتفاع/عرض الكليشة
const EX_LIBS = {
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  pdf: [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  ]
};
const EX_GRADE_COLORS = { 'gr-top': '0A5C32', 'gr-ex': '1B8F4E', 'gr-vg': '1F8A8A', 'gr-g': '2A73B8', 'gr-p': 'C98A0A', 'gr-w': 'E0531F', 'gr-f': 'B71C1C' };
const EX_PRIMARY = '7A1F2B';
let exCur = null;      // الاستمارة المفتوحة حالياً
const exLoading = {};

function exGradeColor(g) { return EX_GRADE_COLORS[gradeCls(g)] || ''; }
function exNum(v) { const n = parseFloat(v); return (v !== '' && v != null && !isNaN(n) && String(n) === String(v).trim()) ? n : v; }
function exSafe(s) { return String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').slice(0, 60); }

/* ---------- تحميل المكتبات عند أول استخدام ---------- */
function exLoadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error('x'));
    document.head.appendChild(s);
  });
}
function exLoad(kind) {
  if ((kind === 'xlsx' && window.ExcelJS) || (kind === 'pdf' && window.html2canvas && window.jspdf)) return Promise.resolve();
  if (exLoading[kind]) return exLoading[kind];
  exLoading[kind] = Promise.all([].concat(EX_LIBS[kind]).map(exLoadScript)).catch(() => {
    exLoading[kind] = null;
    throw new Error('تعذّر تحميل أداة التصدير، تأكدي من الاتصال بالإنترنت');
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

/* ---------- PDF ----------
   كل صفحة A4 تُبنى لحالها وتُقسَّم بين الصفوف (لا يُقطع صف في المنتصف)،
   وترويسة الجدول تتكرر في كل صفحة، والكليشة في الصفحة الأولى فقط، ثم تُرسم كصورة داخل ملف PDF
   فيظهر العربي سليماً. */
let exLetterDataUrl = null;
async function exLetterData() {
  if (exLetterDataUrl) return exLetterDataUrl;
  try {
    const resp = await fetch(EX_LETTERHEAD);
    if (!resp.ok) throw new Error('x');
    const blob = await resp.blob();
    exLetterDataUrl = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
    });
  } catch (e) { throw new Error('تعذّر تحميل الكليشة (letterhead.jpg)'); }
  return exLetterDataUrl;
}

// يجزّئ الاستمارة/السجل إلى: رأس + ترويسة جدول + صفوف + ذيل (المجاميع والملاحظات)
function exPdfParts(m, inner, letter) {
  const e = esc;
  const gp = g => {
    const c = exGradeColor(g);
    return c ? '<span class="gp" style="background:#' + c + '">' + e(g) + '</span>' : e(g);
  };
  const css = '<style>' +
    '.exp{direction:rtl;font-family:\'Tajawal\',\'Cairo\',\'Segoe UI\',Tahoma,Arial,sans-serif;color:#222;background:#fff;font-size:12.5px;line-height:1.6}' +
    '.exp *{box-sizing:border-box}' +
    '.exp table{width:100%;border-collapse:collapse;table-layout:fixed}' +
    '.exp td,.exp th{border:1px solid #d9c7c0;padding:5px 7px;vertical-align:middle;word-wrap:break-word;overflow-wrap:anywhere}' +
    '.exp th{background:#7a1f2b;color:#fff;font-weight:700;text-align:center}' +
    '.exp .lb{background:#f6f0f2;font-weight:700}' +
    '.exp .sec td{background:#f3e3e6;color:#7a1f2b;font-weight:700}' +
    '.exp .ttl{background:#7a1f2b;color:#fff;text-align:center;font-weight:700;font-size:16px;padding:8px;border-radius:6px}' +
    '.exp .hd{padding-bottom:10px}.exp .tl{padding-top:12px}.exp .gap{height:8px}' +
    '.exp .gp{display:inline-block;color:#fff;font-weight:700;padding:2px 14px;border-radius:14px}' +
    '.exp.pg{position:relative;overflow:hidden;background:#fff}' +
    '.exp .ft{position:absolute;bottom:12px;left:0;right:0;text-align:center;font-size:11px;color:#8a7d80}' +
    '</style>';

  const imgH = Math.round(inner * EX_LETTER_RATIO);
  let head = '<img src="' + letter + '" style="display:block;width:' + inner + 'px;height:' + imgH + 'px;margin-bottom:10px">' +
    '<div class="ttl">' + e(m.title) + '</div>';
  if (m.info.length) {
    head += '<div class="gap"></div><table><colgroup><col style="width:16%"><col style="width:34%"><col style="width:16%"><col style="width:34%"></colgroup>';
    for (let i = 0; i < m.info.length; i += 2) {
      const a = m.info[i], b = m.info[i + 1];
      head += '<tr><td class="lb">' + e(a[0]) + '</td><td>' + e(a[1]) + '</td>' +
        (b ? '<td class="lb">' + e(b[0]) + '</td><td>' + e(b[1]) + '</td>' : '<td class="lb"></td><td></td>') + '</tr>';
    }
    head += '</table>';
  }

  const tot = m.widths.reduce((a, w) => a + w, 0);
  const colgroup = '<colgroup>' + m.widths.map(w => '<col style="width:' + (w * 100 / tot).toFixed(2) + '%">').join('') + '</colgroup>';
  const thead = '<thead><tr>' + m.cols.map(c => '<th>' + e(c) + '</th>').join('') + '</tr></thead>';
  const rows = [];
  let tail = '';

  if (m.rows) {
    const center = (i, v) => (typeof v === 'number' || m.widths[i] <= 30) && !(i < 3 && typeof v !== 'number') ? 'text-align:center' : 'text-align:right';
    m.rows.forEach((rw, ri) => {
      rows.push('<tr style="' + (ri % 2 ? 'background:#faf7f8' : '') + '">' + rw.map((v, i) => {
        const isG = (m.gradeCols || []).indexOf(i) > -1 && v;
        return '<td style="' + (isG ? 'text-align:center' : center(i, v)) + '">' + (isG ? gp(v) : e(v)) + '</td>';
      }).join('') + '</tr>');
    });
    if (!m.rows.length) rows.push('<tr><td colspan="' + m.cols.length + '" style="text-align:center">لا توجد بيانات</td></tr>');
  } else {
    m.sections.forEach(sec => {
      if (sec.title) rows.push('<tr class="sec"><td colspan="' + m.cols.length + '">' + e(sec.title) + '</td></tr>');
      sec.rows.forEach((rw, ri) => {
        rows.push('<tr style="' + (ri % 2 ? 'background:#faf7f8' : '') + '">' + rw.map((v, i) =>
          '<td style="' + (m.widths[i] > 30 ? 'text-align:right' : 'text-align:center') + '">' + e(v) + '</td>').join('') + '</tr>');
      });
    });
    tail = '<table><colgroup><col style="width:40%"><col style="width:60%"></colgroup>' +
      m.totals.map(([l, v]) => '<tr><td class="lb">' + e(l) + '</td><td style="text-align:center;font-weight:700;font-size:14px">' + (l === 'التقدير' ? gp(v) : e(v)) + '</td></tr>').join('') + '</table>';
    if (m.notes.length) tail += '<div class="gap"></div><table><colgroup><col style="width:16%"><col style="width:84%"></colgroup>' +
      m.notes.map(([l, v]) => '<tr><td class="lb">' + e(l) + '</td><td>' + e(v) + '</td></tr>').join('') + '</table>';
  }
  return { css, head, colgroup, thead, rows, tail };
}

const exTick = ms => new Promise(r => setTimeout(r, ms || 30));

async function exPdf(m) {
  const land = !!m.landscape;
  const PW = land ? 1123 : 794, PH = land ? 794 : 1123;   // مقاس A4 بالبكسل (96dpi)
  const PAD = 30, FOOT = 26;
  const inner = PW - PAD * 2, maxH = PH - PAD * 2 - FOOT;
  const letter = await exLetterData();
  const P = exPdfParts(m, inner, letter);

  // 1) قياس ارتفاع كل جزء بنفس العرض الفعلي للصفحة
  const meas = document.createElement('div');
  meas.style.cssText = 'position:absolute;left:-20000px;top:0;width:' + inner + 'px;visibility:hidden';
  meas.innerHTML = P.css + '<div class="exp" style="width:' + inner + 'px"><div id="mHead" class="hd">' + P.head + '</div>' +
    '<table id="mTbl">' + P.colgroup + P.thead + '<tbody>' + P.rows.join('') + '</tbody></table>' +
    '<div id="mTail" class="tl">' + (P.tail || '') + '</div></div>';
  document.body.appendChild(meas);
  let headH, theadH, rowH, tailH;
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const hh = el => el.getBoundingClientRect().height;
    headH = hh(meas.querySelector('#mHead'));
    theadH = hh(meas.querySelector('#mTbl thead'));
    rowH = [...meas.querySelectorAll('#mTbl tbody tr')].map(hh);
    tailH = P.tail ? hh(meas.querySelector('#mTail')) : 0;
  } finally { meas.remove(); }

  // 2) توزيع الصفوف على الصفحات
  const pages = [];
  let cur = { head: true, rows: [], tail: false }, used = headH + theadH;
  rowH.forEach((h, i) => {
    if (cur.rows.length && used + h > maxH) { pages.push(cur); cur = { head: false, rows: [], tail: false }; used = theadH; }
    cur.rows.push(i); used += h;
  });
  if (tailH) {
    if (used + tailH > maxH && cur.rows.length) { pages.push(cur); cur = { head: false, rows: [], tail: true }; }
    else cur.tail = true;
  }
  pages.push(cur);

  const pageHtml = (pg, idx) =>
    '<div class="exp pg" style="width:' + PW + 'px;height:' + PH + 'px;padding:' + PAD + 'px">' +
    (pg.head ? '<div class="hd">' + P.head + '</div>' : '') +
    (pg.rows.length ? '<table>' + P.colgroup + P.thead + '<tbody>' + pg.rows.map(i => P.rows[i]).join('') + '</tbody></table>' : '') +
    (pg.tail ? '<div class="tl">' + P.tail + '</div>' : '') +
    '<div class="ft">صفحة ' + (idx + 1) + ' من ' + pages.length + '</div></div>';

  // 3) رسم كل صفحة ثم إضافتها للملف
  const cover = document.createElement('div');
  cover.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;display:flex;align-items:center;justify-content:center;font:700 16px Tahoma,Arial,sans-serif;color:#7a1f2b;direction:rtl';
  cover.textContent = 'جارِ تجهيز ملف PDF...';
  const stage = document.createElement('div');
  stage.style.cssText = 'position:fixed;left:0;top:0;width:' + PW + 'px;height:' + PH + 'px;z-index:99998;background:#fff;overflow:hidden';
  document.body.appendChild(stage);
  document.body.appendChild(cover);
  try {
    const { jsPDF } = window.jspdf;
    const orient = land ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: orient, compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    for (let i = 0; i < pages.length; i++) {
      stage.innerHTML = P.css + pageHtml(pages[i], i);
      const el = stage.querySelector('.pg');
      await Promise.all([...stage.querySelectorAll('img')].map(im => im.decode ? im.decode().catch(() => {}) : Promise.resolve()));
      await exTick(40);
      const canvas = await window.html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        width: PW, height: PH, windowWidth: PW, windowHeight: PH, scrollX: 0, scrollY: 0
      });
      if (i) pdf.addPage('a4', orient);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph);
      canvas.width = canvas.height = 0;
    }
    pdf.save(m.file + '.pdf');
  } finally { cover.remove(); stage.remove(); }
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


/* ---------- تحميل استمارة واحدة من السجل (قائمة: PDF / Excel) ---------- */
function exRow(i, kind) {
  const r = evRows[i];
  if (!r) return;
  toast('جارِ تجهيز الملف...');
  exRun(kind, exFormModel(r), null);
}
function closeDlMenu() { const m = document.getElementById('dlMenu'); if (m) m.remove(); }
function dlMenu(ev, btn, i) {
  ev.stopPropagation();
  const old = document.getElementById('dlMenu');
  if (old) { const same = old.dataset.for === String(i); old.remove(); if (same) return; }
  const m = document.createElement('div');
  m.id = 'dlMenu'; m.className = 'dl-menu'; m.dataset.for = String(i);
  m.innerHTML = '<button type="button" data-k="pdf">PDF</button><button type="button" data-k="xlsx">Excel</button>';
  m.addEventListener('click', e => {
    e.stopPropagation();
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    closeDlMenu(); exRow(i, k);
  });
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  let left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
  let top = r.bottom + 4;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
  m.style.left = left + 'px'; m.style.top = top + 'px';
}
document.addEventListener('click', closeDlMenu);
window.addEventListener('scroll', closeDlMenu, true);
window.addEventListener('resize', closeDlMenu);
