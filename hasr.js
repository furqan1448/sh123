/* ===== «حصر الغياب والتأخير والاستئذان» — الشكل والطباعة وPDF وExcel =====
   مشترك بين صفحة «إدارة المراكز» (centers.html) وصفحة الإشراف الإداري (idari.html). يُحمَّل بعد idari-print.js.
   لكل موظفة ثلاثة أشهر، وفي كل شهر: غياب (ض: اضطراري، غ: بعد الاضطراري، ج: إجازة) وتأخير واستئذان بالدقائق. */
const HS_TITLE = 'حصر الغياب والتأخير والاستئذان';
const HS_KEYS = ['z', 'g', 'j', 't', 'e'];
const HS_ROWS_PER_PAGE = 15;
const HS_CSS = `
.hs .idc-body{padding:0 22px 14px}
.hs .hs-unit{text-align:center;font-weight:800;color:#7a1f2b;font-size:16px;margin:12px 0 0}
.hs .idc-title{font-size:23px;margin:2px 0 12px}
.hs .hs-meta{display:flex;justify-content:space-between;gap:10px;font-weight:700;font-size:15px;margin:0 0 10px}
.hs table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px}
.hs th,.hs td{border:1px solid #7a1f2b;padding:3px 2px;text-align:center;height:28px;font-weight:700}
.hs th{background:#7a1f2b;color:#fff;font-size:12.5px;line-height:1.25}
.hs th.hs-s{background:#f3e6e9;color:#7a1f2b;font-size:11px;padding:2px 1px}
.hs td.hs-n{text-align:right;padding-right:6px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hs td.hs-tot{background:#fbf3e0;color:#7a1f2b}
.hs td.hs-note{font-size:11px;font-weight:600;line-height:1.3}
.hs .hs-leg{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12.5px;font-weight:700;margin:8px 0 0;color:#444}
.hs .hs-foot{display:flex;justify-content:flex-start;margin-top:12px;font-weight:800;font-size:15px;line-height:2}
.hs .hs-foot img{max-height:56px;max-width:180px;vertical-align:middle;display:inline-block}
`;
const hsNum = v => { const n = parseInt(String(v == null ? '' : v).replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)), 10); return isNaN(n) ? null : n; };
// مجموع الأشهر الثلاثة لكل خانة (فارغ إن لم تُعبّأ أي خانة)
function hsTotals(row) {
  const t = {};
  HS_KEYS.forEach(k => { let s = null; (row.m || []).forEach(o => { const n = hsNum(o && o[k]); if (n != null) s = (s || 0) + n; }); t[k] = s; });
  return t;
}
const hsD = v => v == null || v === '' ? '' : idDigits(v);
function hsMonthName(rec, i) { const m = ((rec.data || {}).months || [])[i]; return m ? m : ['الشهر الأول', 'الشهر الثاني', 'الشهر الثالث'][i]; }

function hsDocPages(rec, sig, lhUrl) {
  const d = rec.data || {}, rows = d.rows || [];
  const per = HS_ROWS_PER_PAGE, n = Math.max(1, Math.ceil(rows.length / per));
  const m = x => '<span class="idc-m">' + x + '</span>';
  const head = '<img class="idc-lh" src="' + esc(lhUrl || 'letterhead.jpg') + '" width="2000" height="351" alt="">';
  const grp = i => '<th colspan="5">' + esc(i < 3 ? hsMonthName(rec, i) : 'المجموع') + '</th>';
  const sub = '<th colspan="3" class="hs-s">غياب</th><th rowspan="2" class="hs-s">تأخير</th><th rowspan="2" class="hs-s">استئذان</th>';
  const sub2 = '<th class="hs-s">ض</th><th class="hs-s">غ</th><th class="hs-s">ج</th>';
  const cols = '<colgroup><col style="width:26px"><col style="width:150px"><col style="width:82px">' + ('<col style="width:30px">'.repeat(3) + '<col style="width:38px"><col style="width:44px">').repeat(4) + '<col style="width:118px"></colgroup>';
  const thead = '<tr><th rowspan="3">م</th><th rowspan="3">اسم الموظفة</th><th rowspan="3">المسمى<br>الوظيفي</th>' + [0, 1, 2, 3].map(grp).join('') + '<th rowspan="3">ملاحظات</th></tr>' +
    '<tr>' + sub.repeat(4) + '</tr><tr>' + sub2.repeat(4) + '</tr>';
  const date = d.hy ? '<span class="idc-date"><bdi>' + idDigits(d.hd) + '</bdi> / <bdi>' + idDigits(d.hm) + '</bdi> / <bdi>' + idDigits(d.hy) + 'هـ</bdi></span>' : '';
  const pages = [];
  for (let p = 0; p < n; p++) {
    const part = rows.slice(p * per, p * per + per);
    const body = part.map((r, i) => {
      const t = hsTotals(r);
      return '<tr><td>' + idDigits(p * per + i + 1) + '</td><td class="hs-n">' + esc(r.name) + '</td><td class="hs-n" style="font-size:12px">' + esc(r.job || '') + '</td>' +
        [0, 1, 2].map(k => HS_KEYS.map(c => '<td>' + hsD(((r.m || [])[k] || {})[c]) + '</td>').join('')).join('') +
        HS_KEYS.map(c => '<td class="hs-tot">' + hsD(t[c]) + '</td>').join('') + '<td class="hs-note">' + esc(r.note || '') + '</td></tr>';
    }).join('');
    const last = p === n - 1;
    pages.push('<div class="im-page hs">' + head + '<div class="idc-body"><div class="hs-unit">الشؤون الإدارية</div><div class="idc-title">' + HS_TITLE + '</div>' +
      '<div class="hs-meta"><span>اسم المركز: ' + m(esc(rec.centerDisplay || rec.center || '')) + '</span><span>الفترة: ' + m(esc(rec.period || '')) + '</span><span>الفصل الدراسي: ' + m(esc(rec.sem || '')) +
      '</span><span>عام: ' + m(esc(idDigits(rec.year || ''))) + 'هـ</span></div>' +
      '<table>' + cols + thead + body + '</table>' +
      '<div class="hs-leg"><span>ض: غياب اضطراري</span><span>غ: بعد الاضطراري</span><span>ج: إجازة تم رفعها لشؤون الموظفات</span><span>المقصود في التأخير والاستئذان عدد الدقائق وليس عدد المرات</span></div>' +
      (last ? '<div class="hs-foot"><div>مديرة المركز: ' + m(esc(rec.mgrName || '')) + (date ? '<br>التاريخ: ' + m(date) : '') + '<br><span style="white-space:nowrap">التوقيع: ' + (sig ? '<img src="' + sig + '" alt="">' : '') + '</span>' + '</div></div>' : '') +
      (n > 1 ? '<div style="text-align:center;font-size:12px;color:#777;margin-top:6px">صفحة ' + idDigits(p + 1) + ' من ' + idDigits(n) + '</div>' : '') +
      '</div></div>');
  }
  return pages;
}
const hsFileName = rec => (HS_TITLE + ' ' + (rec.centerDisplay || rec.center || '') + ' ' + (rec.sem ? 'الفصل ' + rec.sem : '') + ' ' + (rec.year || '')).trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_');
async function hsPdfBlob(rec, sig) { return idPagesPdf(hsDocPages(rec, sig), HS_CSS, false); }
async function hsPdf(rec, btn, sig) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try { idSaveBlob(await hsPdfBlob(rec, sig), hsFileName(rec) + '.pdf'); toast('تم التحميل'); }
  catch (e) { toast(e.message || 'تعذّر تحميل PDF', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}
// عرض داخل الصفحة (مصغّر على الجوال)
function hsViewHtml(rec, sig) {
  return '<style>' + ID_CSS + HS_CSS + '.hs-view .im-page{width:1123px;background:#fff;margin:0 0 12px}</style><div class="idoc hs-view" style="width:1123px">' + hsDocPages(rec, sig).join('') + '</div>';
}
function hsFit(box) {
  const doc = box && box.querySelector('.hs-view'); if (!doc) return;
  doc.style.transform = ''; box.style.height = '';
  const k = Math.min(1, (box.clientWidth - 4) / doc.offsetWidth);
  if (k >= 1) return;
  doc.style.transform = 'scale(' + k + ')'; doc.style.transformOrigin = 'top right';
  box.style.height = Math.ceil(doc.offsetHeight * k) + 8 + 'px'; box.style.overflow = 'hidden';
  box.querySelectorAll('img').forEach(im => { if (!im.complete && !im._fit) { im._fit = 1; im.addEventListener('load', () => hsFit(box)); } });
}

/* ---------- Excel منسّق (نفس أعمدة النموذج الورقي) ---------- */
function hsLoadExcel() {
  if (window.ExcelJS) return Promise.resolve();
  return new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    sc.onload = () => res(); sc.onerror = () => rej(new Error('تعذّر تحميل أداة Excel'));
    document.head.appendChild(sc);
  });
}
async function hsXlsx(rec, btn) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    await hsLoadExcel();
    const wb = new window.ExcelJS.Workbook(), ws = wb.addWorksheet('الحصر', { views: [{ rightToLeft: true }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    const red = 'FF953734', head = 'FFF2DBDB', pale = 'FFD9D9D9', gold = 'FFF2F2F2', blk = 'FF000000';   // ألوان استمارة الإكسل الأصلية للجمعية
    const border = { top: { style: 'thin', color: { argb: blk } }, bottom: { style: 'thin', color: { argb: blk } }, left: { style: 'thin', color: { argb: blk } }, right: { style: 'thin', color: { argb: blk } } };
    const N = 24;   // م + الاسم + المسمى + 20 خانة + ملاحظات
    ws.columns = [{ width: 5 }, { width: 26 }, { width: 14 }].concat(Array(20).fill({ width: 5.5 }), [{ width: 22 }]);
    const cell = (r, c, v, o) => { const x = ws.getCell(r, c); x.value = v; x.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' }; x.font = { name: 'Arial', bold: true, size: 11, color: { argb: o && o.color || 'FF000000' } }; if (o && o.fill) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } }; if (!o || o.border !== false) x.border = border; return x; };
    ws.mergeCells(1, 1, 1, N); cell(1, 1, 'الشؤون الإدارية', { color: red, border: false });
    ws.mergeCells(2, 1, 2, N); cell(2, 1, HS_TITLE, { color: red, border: false }).font.size = 16;
    ws.mergeCells(3, 1, 3, 8); cell(3, 1, 'اسم المركز: ' + (rec.centerDisplay || rec.center || ''), { border: false });
    ws.mergeCells(3, 9, 3, 13); cell(3, 9, 'الفترة: ' + (rec.period || ''), { border: false });
    ws.mergeCells(3, 14, 3, 19); cell(3, 14, 'الفصل الدراسي: ' + (rec.sem || ''), { border: false });
    ws.mergeCells(3, 20, 3, N); cell(3, 20, 'عام: ' + (rec.year || '') + 'هـ', { border: false });
    const h = 5;
    [[1, 'م'], [2, 'اسم الموظفة'], [3, 'المسمى الوظيفي'], [N, 'ملاحظات']].forEach(([c, t]) => { ws.mergeCells(h, c, h + 2, c); cell(h, c, t, { fill: head, color: blk }); });
    for (let g = 0; g < 4; g++) {
      const c0 = 4 + g * 5;
      ws.mergeCells(h, c0, h, c0 + 4); cell(h, c0, g < 3 ? hsMonthName(rec, g) : 'المجموع', { fill: head, color: blk });
      ws.mergeCells(h + 1, c0, h + 1, c0 + 2); cell(h + 1, c0, 'غياب', { fill: pale, color: blk });
      ws.mergeCells(h + 1, c0 + 3, h + 2, c0 + 3); cell(h + 1, c0 + 3, 'تأخير', { fill: pale, color: blk });
      ws.mergeCells(h + 1, c0 + 4, h + 2, c0 + 4); cell(h + 1, c0 + 4, 'استئذان', { fill: pale, color: blk });
      ['ض', 'غ', 'ج'].forEach((t, i) => cell(h + 2, c0 + i, t, { fill: pale, color: blk }));
    }
    const rows = (rec.data && rec.data.rows) || [];
    rows.forEach((r, i) => {
      const R = h + 3 + i, t = hsTotals(r);
      cell(R, 1, i + 1); cell(R, 2, r.name).alignment.horizontal = 'right'; cell(R, 3, r.job || '');
      [0, 1, 2].forEach(k => HS_KEYS.forEach((c, j) => { const v = hsNum(((r.m || [])[k] || {})[c]); cell(R, 4 + k * 5 + j, v == null ? '' : v); }));
      HS_KEYS.forEach((c, j) => cell(R, 19 + j, t[c] == null ? '' : t[c], { fill: gold, color: blk }));
      cell(R, N, r.note || '').font.size = 9;
      ws.getRow(R).height = 22;
    });
    const L = h + 3 + rows.length + 1;
    ws.mergeCells(L, 1, L, N);
    cell(L, 1, 'ض: غياب اضطراري     غ: بعد الاضطراري     ج: إجازة تم رفعها لشؤون الموظفات     — المقصود في التأخير والاستئذان عدد الدقائق وليس عدد المرات', { border: false }).font.size = 10;
    ws.mergeCells(L + 2, 1, L + 2, 12);
    cell(L + 2, 1, 'مديرة المركز: ' + (rec.mgrName || ''), { border: false }).alignment.horizontal = 'right';
    const buf = await wb.xlsx.writeBuffer();
    idSaveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), hsFileName(rec) + '.xlsx');
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر تحميل Excel', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}
