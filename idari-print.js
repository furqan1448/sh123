/* ===== نماذج وحدة الإشراف الإداري: الطباعة وتحميل PDF والمشاركة بالكليشة الحمراء (letterhead.jpg) ===== */
// يُستخدم في صفحة المشرفات (idari.html) وفي صفحة إدارة الوحدات (units.html)
const ID_LETTERHEAD = 'letterhead.jpg';
const ID_UNIT = 'وحدة الإشراف الإداري';
const ID_PDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
const ID_IMG_LIB = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';   // مثل نظام المقاصف: يرسم النموذج بمحرك المتصفح نفسه
const ID_KINDS = {
  visit: 'تقرير زيارة المشرفة',
  program: 'برنامج مشرفة مقيمة',
  suggest: 'الاقتراحات والصعوبات'
};
const ID_PROGRAM_ROWS = [['day', 'اليوم / التاريخ'], ['center', 'المركز'], ['content', 'المحتوى'], ['plan', 'التخطيط'],
  ['method', 'طريقة التنفيذ'], ['tools', 'الوسائل'], ['results', 'النتائج'], ['ratio', 'نسبة الاستفادة']];
const ID_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// جلب التواقيع (تُستبدل في صفحة إدارة الوحدات بدخول المديرة)
let idSigFetch = items => api('getSigs', { items }).then(o => o.data || {});

const idDigits = s => String(s == null ? '' : s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

/* ---------- التاريخ الهجري (مثل تقرير الزيارة في نظام المقاصف: يوم / شهر / سنة تُقرأ من اليمين) ---------- */
// أجزاء التاريخ الهجري (أم القرى) لتاريخ ميلادي
function idHParts(dt) {
  try {
    const o = {};
    new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(dt).forEach(p => { if (p.type === 'day' || p.type === 'month' || p.type === 'year') o[p.type] = parseInt(p.value, 10); });
    return o.day ? { d: o.day, m: o.month, y: o.year } : null;
  } catch (e) { return null; }
}
const idYmd = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
// التاريخ الميلادي المقابل لتاريخ هجري (للترتيب والتصفية فقط) أو '' إن لم يوجد
function idHToG(y, m, d) {
  y = +y; m = +m; d = +d;
  if (!y || !m || !d) return '';
  const now = new Date(), t = idHParts(now);
  if (!t) return '';
  const est = Math.round((y - t.y) * 354.367 + (m - t.m) * 29.53 + (d - t.d));
  for (let k = 0; k <= 6; k++) {
    for (const s of k ? [k, -k] : [0]) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + est + s);
      const h = idHParts(dt);
      if (h && h.y === y && h.m === m && h.d === d) return idYmd(dt);
    }
  }
  return '';
}
// نص التاريخ: كل جزء معزول حتى يبقى الترتيب من اليمين لليسار (اليوم ثم الشهر ثم السنة)
function idHDate(rec) {
  const d = (rec && rec.data) || {};
  let p = d.hd ? { d: d.hd, m: d.hm, y: d.hy } : null;
  if (!p && rec && rec.date) { const q = rec.date.split('-'); p = idHParts(new Date(+q[0], +q[1] - 1, +q[2])); }
  if (!p) return '';
  return '<span class="idc-date"><bdi>' + idDigits(p.d) + '</bdi> / <bdi>' + idDigits(p.m) + '</bdi> / <bdi>' + idDigits(p.y) + 'هـ</bdi></span>';
}
const idDayName = rec => ((rec.data && rec.data.dayName) || rec.day || '');

const idNl = s => esc(s).replace(/\n/g, '<br>');
const idBox = on => '<span class="idc-box">' + (on ? '✓' : '') + '</span>';
const idSig = d => d ? '<img class="idc-sig" src="' + d + '" alt="">' : '';

const ID_CSS = `
.idoc{width:1090px;background:#fff;color:#222;font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;font-size:15px;line-height:1.6;padding:0 4px}
.idoc *{box-sizing:border-box}
.idoc tr td{background:#fff}   /* كل الخلايا بيضاء (بدون تظليل الصفوف من style.css) */
.idoc bdi{unicode-bidi:isolate}
.idoc .idc-lh{width:100%;height:auto;aspect-ratio:2000/351;display:block}
.idoc .idc-body{padding:0 28px}
.idoc .idc-title{text-align:center;font-size:25px;font-weight:800;color:#7a1f2b;margin:22px 0 18px}
.idoc .idc-meta{display:flex;justify-content:space-between;align-items:center;gap:20px;font-weight:800;font-size:15.5px;margin:0 0 14px}
.idoc .idc-meta>span{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.idoc .idc-m{color:#7a1f2b}
.idoc .idc-date{display:inline-block;direction:rtl}
.idoc .idc-box{display:inline-flex;width:14px;height:14px;border:1.6px solid #222;align-items:center;justify-content:center;font-size:12px;margin-left:5px;vertical-align:middle;font-weight:900;line-height:1}
.idoc .idc-per{display:inline-flex;gap:16px;align-items:center}
.idoc table{width:100%;border-collapse:collapse;font-size:15px}
.idoc th,.idoc td{border:1px solid #444;padding:8px 10px;vertical-align:middle;text-align:center}
.idoc th{background:#f2f2f2;color:#222;font-weight:800}
.idoc .idc-info td{background:#f2f2f2;font-weight:800;padding:10px}
.idoc .idc-info{margin-bottom:-1px}
.idoc tr.idc-r td{height:44px}
.idoc .idc-prog td{padding:6px 10px}
.idoc .idc-n{color:#7a1f2b;font-weight:800;width:54px}
.idoc .idc-lbl{font-weight:800;background:#f2f2f2;width:200px}
.idoc td.r{text-align:right}
.idoc .idc-sig{max-height:62px;max-width:190px;display:block;margin:4px auto 0}
.idoc .idc-foot{display:flex;justify-content:space-around;gap:30px;margin:28px 0 0;align-items:flex-start}
.idoc .idc-foot>div{text-align:center;font-weight:800;font-size:16px;min-width:240px;line-height:1.8}
.idoc .idc-note{font-size:14px;margin:12px 0 0;font-weight:700}
.idoc .idc-avoid{page-break-inside:avoid;break-inside:avoid}
.idoc .idp{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#222}
.idoc .idp-in{padding:24px 60px 26px}
.idoc .idp-title{text-align:center;font-size:24px;font-weight:700;color:#6f0c1e;margin:0 0 20px}
.idoc .idp-meta{display:flex;gap:46px;align-items:center;font-size:16.5px;margin:0 6px 14px}
.idoc .idp-meta b{color:#6f0c1e}
.idoc .idp table{width:100%;border-collapse:collapse;font-size:15.5px;table-layout:fixed}
.idoc .idp th{background:#fde9ed;color:#6f0c1e;font-weight:600;font-size:17px;border:1px solid #333;padding:5px 8px}
.idoc .idp tr td{background:#fff;border:1px solid #333;height:34px;padding:4px 10px;text-align:right;vertical-align:middle}
.idoc .idp-sig{display:flex;justify-content:space-between;align-items:flex-start;font-size:15.5px;margin:14px 6px 0}
.idoc .idp-sig>div{flex:1}
.idoc .idp-sig>div:nth-child(2){text-align:center}
.idoc .idp-sig>div:last-child{text-align:left}
.idoc .idp-sig b{color:#6f0c1e}
.idoc .idp-sig img{max-height:54px;max-width:170px;display:inline-block;vertical-align:middle}
.idoc .idp-note{font-size:13px;margin:22px 6px 0}
.idoc .idc-subject{font-weight:800;color:#7a1f2b;font-size:15.5px;margin:0 0 12px}
.idoc td.idc-note-c{text-align:right;padding-right:14px;height:52px}
.idoc td.idc-rec-c{text-align:right;padding-right:14px;font-weight:700}
`;

/* ---------- محتوى النموذج (نفس الشكل للعرض والطباعة والـ PDF) ---------- */
function idDocHtml(rec, sigs, lhUrl) {
  sigs = sigs || {};
  const d = rec.data || {};
  const per = String(rec.period || '');
  // أبعاد الكليشة مكتوبة صراحةً حتى يُحجز مكانها قبل تحميلها (وإلا يُقصّ أسفل ملف PDF)
  const head = '<img class="idc-lh" src="' + esc(lhUrl || ID_LETTERHEAD) + '" width="2000" height="351" alt="">';
  const m = x => '<span class="idc-m">' + x + '</span>';   // القيم باللون العنابي
  const periodBoxes = '<span class="idc-per"><span>' + idBox(per.indexOf('صباحي') > -1) + 'صباحي</span><span>' + idBox(per.indexOf('مسائي') > -1) + 'مسائي</span></span>';
  const yearSem = (rec.year ? 'لعام ' + idDigits(rec.year) + 'هـ' : '') + (rec.sem ? ' للفصل الدراسي ' + esc(rec.sem) : '');
  const sigCol = (lbl, name, sg) => '<div>' + lbl + (name ? '<br>' + esc(name) : '') + idSig(sg) + '</div>';
  let h = '';

  if (rec.kind === 'visit' && Array.isArray(d.notes)) {
    // تنسيق نظام المقاصف: «بشأن» سطر واحد، وكل ملاحظة في صف برقمها، والتوصية خلية واحدة بجانب الصفوف
    const notes = d.notes.filter(x => String(x || '').trim());
    const n = Math.max(notes.length, 1);
    const ack = d.ackCol === '1' || !!sigs.ack;
    let body = '';
    for (let i = 0; i < n; i++) {
      body += '<tr><td class="idc-n">' + idDigits(i + 1) + '</td><td class="idc-note-c" colspan="2">' + idNl(notes[i] || '') + '</td>' +
        (i === 0 ? '<td class="idc-rec-c" colspan="2" rowspan="' + n + '">' + idNl(d.recText) + '</td>' + (ack ? '<td rowspan="' + n + '">' + idSig(sigs.ack) + '</td>' : '') : '') + '</tr>';
    }
    h = head + '<div class="idc-body"><div class="idc-title">تقرير زيارة المشرفة</div>' +
      '<div class="idc-meta"><span><span>المركز: ' + esc(rec.center) + '</span>' + periodBoxes + '</span><span>' + yearSem + '</span></div>' +
      (d.about ? '<div class="idc-subject">بشأن: ' + esc(d.about) + '</div>' : '') +
      // جدول واحد: صف اليوم/التاريخ/الرقم/النوع حدوده على نفس خطوط أعمدة الجدول
      '<table><colgroup><col style="width:54px"><col style="width:20%"><col><col style="width:' + (ack ? '16%' : '19%') + '"><col style="width:' + (ack ? '16%' : '19%') + '">' + (ack ? '<col style="width:140px">' : '') + '</colgroup>' +
      '<tr class="idc-info"><td colspan="2">اليوم: ' + m(esc(idDayName(rec))) + '</td><td>التاريخ: ' + m(idHDate(rec)) + '</td><td>رقم الزيارة: ' + m(esc(idDigits(rec.visitNo))) + '</td><td' + (ack ? ' colspan="2"' : '') + '>نوع الزيارة: ' + m(esc(d.vtype || 'إداري')) + '</td></tr>' +
      '<tr><th>م</th><th colspan="2">الملاحظة</th><th colspan="2">التوصية</th>' + (ack ? '<th>توقيع بالعلم</th>' : '') + '</tr>' + body + '</table>' +
      '<div class="idc-foot idc-avoid">' + sigCol('المشرفة', rec.supName, sigs.sup) + sigCol('مديرة المركز', rec.mgrName, sigs.mgr) + '</div></div>';

  } else if (rec.kind === 'visit') {
    // النماذج القديمة (بشأن/ملاحظة/توصية لكل بند) تبقى بشكلها السابق
    const rows = (d.rows || []).filter(r => r && (r.about || r.note || r.rec));
    const n = Math.max(rows.length, 3);
    const ack = d.ackCol === '1' || !!sigs.ack;   // عمود «توقيع بالعلم» اختياري (يُوقَّع ورقياً)
    let body = '';
    for (let i = 0; i < n; i++) {
      const r = rows[i] || {};
      body += '<tr class="idc-r"><td class="idc-n">' + (rows[i] ? idDigits(i + 1) : '') + '</td><td>' + idNl(r.about) + '</td><td>' + idNl(r.note) + '</td><td colspan="2">' + idNl(r.rec) + '</td>' +
        (ack && i === 0 ? '<td rowspan="' + n + '">' + idSig(sigs.ack) + '</td>' : '') + '</tr>';
    }
    h = head + '<div class="idc-body"><div class="idc-title">تقرير زيارة المشرفة</div>' +
      '<div class="idc-meta"><span><span>المركز: ' + esc(rec.center) + '</span>' + periodBoxes + '</span><span>' + yearSem + '</span></div>' +
      '<table><colgroup><col style="width:54px"><col style="width:' + (ack ? '20%' : '22%') + '"><col style="width:' + (ack ? '32%' : '38%') + '"><col><col>' + (ack ? '<col style="width:140px">' : '') + '</colgroup>' +
      '<tr class="idc-info"><td colspan="2">اليوم: ' + m(esc(idDayName(rec))) + '</td><td>التاريخ: ' + m(idHDate(rec)) + '</td><td>رقم الزيارة: ' + m(esc(idDigits(rec.visitNo))) + '</td><td' + (ack ? ' colspan="2"' : '') + '>نوع الزيارة: ' + m(esc(d.vtype || 'إداري')) + '</td></tr>' +
      '<tr><th>م</th><th>بشأن</th><th>الملاحظة</th><th colspan="2">التوصية</th>' + (ack ? '<th>توقيع بالعلم</th>' : '') + '</tr>' + body + '</table>' +
      '<div class="idc-foot idc-avoid">' + sigCol('المشرفة', rec.supName, sigs.sup) + sigCol('مديرة المركز', rec.mgrName, sigs.mgr) + '</div></div>';

  } else if (rec.kind === 'program') {
    const val = k => k === 'day' ? [esc(idDayName(rec)), idHDate(rec)].filter(Boolean).join(' &nbsp;—&nbsp; ') : k === 'center' ? esc(rec.center) : idNl(d[k]);
    h = head + '<div class="idc-body"><div class="idc-title">تخطيط وتنفيذ ونتائج لبرنامج مشرفة مقيمة</div>' +
      '<table class="idc-prog"><colgroup><col style="width:54px"><col style="width:200px"><col></colgroup>' +
      '<tr><th>م</th><th>البيان</th><th>المحتوى</th></tr>' +
      ID_PROGRAM_ROWS.map((r, i) => '<tr><td class="idc-n">' + idDigits(i + 1) + '</td><td class="idc-lbl">' + r[1] + '</td><td class="r">' + val(r[0]) + '</td></tr>').join('') +
      '</table>' +
      (rec.supName || sigs.sup ? '<div class="idc-foot idc-avoid">' + sigCol('المشرفة', rec.supName, sigs.sup) + '<div></div></div>' : '') + '</div>';

  } else if (rec.kind === 'suggest') {
    // الكليشة الحمراء، وتنسيق الجدول والخط مثل النموذج الورقي: عمودان برأس وردي، والاسم والتوقيع والتاريخ في سطر واحد
    const rows = (d.rows || []).filter(r => r && (r.sug || r.dif));
    const n = Math.max(rows.length, 6);
    let body = '';
    for (let i = 0; i < n; i++) { const r = rows[i] || {}; body += '<tr><td>' + idNl(r.sug) + '</td><td>' + idNl(r.dif) + '</td></tr>'; }
    const date = [esc(idDayName(rec)), idHDate(rec)].filter(Boolean).join(' ');
    h = head + '<div class="idp"><div class="idp-in"><div class="idp-title">الاقتراحات والمرئيات – الصعوبات التي تواجه المشرفة الإدارية <sup>*</sup></div>' +
      '<div class="idp-meta"><span>الفصل الدراسي/ <b>' + (esc(rec.sem) || '..........') + '</b></span><span>لعام <b>' + (rec.year ? idDigits(rec.year) + 'هـ' : '..........') + '</b></span>' +
      '<span>الفترة / ' + idBox(per.indexOf('صباحي') > -1) + 'صباحي &nbsp; ' + idBox(per.indexOf('مسائي') > -1) + 'مسائي</span></div>' +
      '<table><tr><th>الاقتراحات والمرئيات</th><th>الصعوبات التي تواجه المشرفة</th></tr>' + body + '</table>' +
      '<div class="idp-sig idc-avoid"><div>اسم المشرفة: <b>' + esc(rec.supName || '') + '</b></div><div>التوقيع: ' + (sigs.sup ? '<img src="' + sigs.sup + '" alt="">' : '') + '</div><div>التاريخ: <b>' + date + '</b></div></div>' +
      '<div class="idp-note">* تُطالَب المشرفة بتسليمها آخر الفصل الدراسي.</div></div></div>';
  } else {
    const rows = (d.rows || []).filter(r => r && (r.sug || r.dif));
    const n = Math.max(rows.length, 4);
    let body = '';
    for (let i = 0; i < n; i++) {
      const r = rows[i] || {};
      body += '<tr class="idc-r"><td class="idc-n">' + (rows[i] ? idDigits(i + 1) : '') + '</td><td>' + idNl(r.sug) + '</td><td>' + idNl(r.dif) + '</td></tr>';
    }
    h = head + '<div class="idc-body"><div class="idc-title">الاقتراحات والمرئيات – الصعوبات التي تواجه المشرفة الإدارية</div>' +
      '<div class="idc-meta"><span><span>الفترة:</span>' + periodBoxes + '</span><span>' + yearSem + '</span></div>' +
      '<table><colgroup><col style="width:54px"><col><col></colgroup>' +
      '<tr class="idc-info"><td colspan="2">اليوم: ' + m(esc(idDayName(rec))) + '</td><td>التاريخ: ' + m(idHDate(rec)) + '</td></tr>' +
      '<tr><th>م</th><th>الاقتراحات والمرئيات</th><th>الصعوبات التي تواجه المشرفة</th></tr>' + body + '</table>' +
      '<div class="idc-avoid"><div class="idc-note">تُطالَب المشرفة بتسليمها آخر الفصل الدراسي.</div>' +
      '<div class="idc-foot">' + sigCol('المشرفة', rec.supName, sigs.sup) + '<div></div></div></div></div>';
  }
  return '<div class="idoc">' + h + '</div>';
}

// تواقيع النموذج المحفوظ (من ورقة «التواقيع»)
async function idLoadSigs(rec) {
  const has = (rec.data && rec.data.sigs) || {};
  const items = ['sup', 'mgr', 'ack'].filter(k => has[k]).map(k => ({ id: rec.id + '|' + k }));
  if (!items.length) return {};
  const map = await idSigFetch(items);
  const out = {};
  ['sup', 'mgr', 'ack'].forEach(k => { if (map[rec.id + '|' + k]) out[k] = map[rec.id + '|' + k]; });
  return out;
}

const idFileName = rec => {
  const d = rec.data || {};
  const dt = d.hd ? d.hd + '-' + d.hm + '-' + d.hy : (rec.date || '');
  return (ID_KINDS[rec.kind] + ' ' + (rec.center || rec.sem || '') + ' ' + dt).trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_');
};

/* ---------- طباعة (ومنها «حفظ PDF» من نافذة الطباعة) ---------- */
async function idPrint(rec, btn, sigs) {
  const w = window.open('', '_blank');
  if (!w) return toast('اسمحي بالنوافذ المنبثقة لهذا الموقع ثم أعيدي المحاولة', false);
  w.document.write('<p style="font-family:Tahoma;text-align:center;margin-top:40px">جارِ التجهيز...</p>');
  if (btn) setBtnBusy(btn, true, '...');
  try {
    if (!sigs) sigs = await idLoadSigs(rec);
    const lh = new URL(ID_LETTERHEAD, location.href).href;
    w.document.open();
    w.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>' + esc(idFileName(rec)) + '</title>' +
      '<style>@page{size:A4 landscape;margin:7mm}html,body{margin:0;background:#fff}' + ID_CSS +
      '.idoc{width:100%}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>' +
      idDocHtml(rec, sigs, lh) + '</body></html>');
    w.document.close();
    const go = () => setTimeout(() => { w.focus(); w.print(); }, 250);
    const img = w.document.querySelector('.idc-lh');
    if (img && !img.complete) { img.onload = go; img.onerror = go; } else go();
  } catch (e) { w.close(); toast(e.message || 'تعذّرت الطباعة', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}

/* ---------- PDF ---------- */
let idPdfLoading = null;
function idLoadPdfLib() {
  if (window.html2pdf) return Promise.resolve();
  if (idPdfLoading) return idPdfLoading;
  idPdfLoading = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = ID_PDF_LIB;
    sc.onload = () => res();
    sc.onerror = () => { idPdfLoading = null; rej(new Error('تعذّر تحميل أداة PDF، تأكدي من الاتصال بالإنترنت')); };
    document.head.appendChild(sc);
  });
  return idPdfLoading;
}
let idImgLoading = null;
function idLoadImgLib() {
  if (window.htmlToImage) return Promise.resolve();
  if (idImgLoading) return idImgLoading;
  idImgLoading = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = ID_IMG_LIB;
    sc.onload = () => res();
    sc.onerror = () => { idImgLoading = null; rej(new Error('img lib')); };
    document.head.appendChild(sc);
  });
  return idImgLoading;
}
// إذا زاد النموذج قليلاً عن صفحة A4 عرضية نصغّره ليكفي صفحة واحدة؛ وإن كان طويلاً جداً يُقسَّم على صفحات
function idFitPage(cv) {
  const maxH = cv.width * 210 / 297;
  if (cv.height <= maxH || cv.height > maxH * 1.8) return cv;
  const out = document.createElement('canvas');
  out.width = Math.round(cv.height * 297 / 210); out.height = cv.height;
  const g = out.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, out.width, out.height);
  g.drawImage(cv, Math.round((out.width - cv.width) / 2), 0);
  return out;
}
// مكتبة الرسم (html2canvas) تعكس النقطتين والأرقام بجانب الكلمات العربية، فنلف كل نص عربي بعلامة اتجاه داخل النسخة المؤقتة فقط
function idFixBidi(doc) {
  const root = doc.querySelector('.idoc');
  if (!root) return;
  const w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [];
  let n;
  while ((n = w.nextNode())) nodes.push(n);
  nodes.forEach(t => { const v = t.nodeValue; if (v && /[\u0600-\u06FF0-9]/.test(v)) t.nodeValue = '\u202B' + v + '\u202C'; });
}
// يبني ملف PDF ويعيده كـ Blob (بنفس طريقة تقرير الزيارة في نظام المقاصف: صفحة A4 عرضية، والكليشة ملتصقة بأعلى الصفحة)
async function idPdfBlob(rec, sigs) {
  if (!sigs) sigs = await idLoadSigs(rec);
  await idLoadPdfLib();
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:0;left:0;width:1123px;z-index:-1;background:#fff;direction:rtl';
  box.innerHTML = '<style>' + ID_CSS + '.idoc{width:1123px;padding:0}</style>' + idDocHtml(rec, sigs);
  document.body.appendChild(box);
  try {
    await Promise.all([...box.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    // الطريقة الأساسية: رسم النموذج بمحرك المتصفح (العربي والنقطتان والأرقام في أماكنها الصحيحة)
    try {
      await idLoadImgLib();
      const cv = await window.htmlToImage.toCanvas(box.querySelector('.idoc'), { pixelRatio: 2, backgroundColor: '#ffffff', width: 1123, skipFonts: true, style: { margin: '0' } });
      return await window.html2pdf().set({ margin: 0, image: { type: 'jpeg', quality: 0.97 }, jsPDF: { unit: 'mm', format: [297, 210], orientation: 'landscape' } })
        .from(idFitPage(cv), 'canvas').outputPdf('blob');
    } catch (e) { console.warn('html-to-image failed, falling back to html2canvas', e); }
    // الطريقة الاحتياطية
    return await window.html2pdf().set({
      margin: 0, image: { type: 'jpeg', quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: 1123, onclone: idFixBidi },
      jsPDF: { unit: 'mm', format: [297, 210], orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.idc-avoid'] }
    }).from(box.querySelector('.idoc'))
      // الموقع كله من اليمين لليسار، والمكتبة تضع حاويتها حسب عرض الشاشة فتنزاح الصفحة وتُقصّ؛ نثبّتها في أعلى اليسار بعرض A4
      .toContainer().get('container').then(c => {
        if (c.parentElement) c.parentElement.style.direction = 'ltr';
        Object.assign(c.style, { position: 'absolute', top: '0', left: '0', right: 'auto', margin: '0', width: '1123px', direction: 'rtl' });
      }).toCanvas().toPdf().outputPdf('blob');
  } finally { box.remove(); }
}
function idSaveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function idPdf(rec, btn, sigs) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try { idSaveBlob(await idPdfBlob(rec, sigs), idFileName(rec) + '.pdf'); toast('تم التحميل'); }
  catch (e) { toast(e.message || 'تعذّر تحميل PDF', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}

/* ---------- مشاركة (واتساب وغيره): مثل نظام المقاصف، تختارين جهة الإرسال بنفسك ---------- */
async function idShare(rec, btn, sigs) {
  // الضغطة الثانية بعد التجهيز: نفتح المشاركة مباشرة (بعض الأجهزة تشترط ضغطة جديدة)
  if (btn && btn._file) { const f = btn._file; btn._file = null; btn.innerHTML = btn.dataset.t0 || 'مشاركة'; return idShareFile(f, rec); }
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  let file;
  try {
    const blob = await idPdfBlob(rec, sigs);
    file = new File([blob], idFileName(rec) + '.pdf', { type: 'application/pdf' });
  } catch (e) { toast(e.message || 'تعذّر تجهيز الملف', false); if (btn) setBtnBusy(btn, false); return; }
  if (btn) setBtnBusy(btn, false);
  try { await idShareFile(file, rec, true); }
  catch (e) {
    if (btn) { btn.dataset.t0 = btn.innerHTML; btn._file = file; btn.innerHTML = 'اضغطي للإرسال'; }
    toast('الملف جاهز، اضغطي «اضغطي للإرسال»');
  }
}
async function idShareFile(file, rec, rethrow) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: ID_KINDS[rec.kind] }); return; }
    catch (e) {
      if (e && e.name === 'AbortError') return;   // ألغت المشاركة
      if (rethrow && e && e.name === 'NotAllowedError') throw e;
    }
  }
  idSaveBlob(file, file.name);
  toast('المشاركة غير مدعومة في هذا المتصفح، تم تحميل الملف لإرساله يدوياً');
}

/* ---------- إرسال التقرير للمديرة مباشرة (واتساب) — مثل نظام المقاصف ----------
   يُحفظ ملف PDF في الجهاز، ثم يظهر زر يفتح محادثة المديرة برسالة جاهزة، وتُرفق الملف من 📎. */
function idWaPhone(v) {
  let d = String(v || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '');
  if (d.indexOf('00966') === 0) d = d.slice(5);
  else if (d.indexOf('966') === 0) d = d.slice(3);
  if (d.indexOf('0') === 0) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? '966' + d : '';
}
function idPlainHDate(rec) {
  const d = (rec && rec.data) || {};
  return d.hd ? idDigits(d.hd) + ' / ' + idDigits(d.hm) + ' / ' + idDigits(d.hy) + 'هـ' : '';
}
async function idSendMgr(rec, btn, sigs) {
  const d = rec.data || {};
  let phone = idWaPhone(d.mgrPhone);
  if (!phone) {
    const v = prompt('لا يوجد جوال محفوظ لمديرة المركز في هذا التقرير. اكتبي جوالها (05xxxxxxxx):', '');
    if (v === null) return;
    phone = idWaPhone(v);
    if (!phone) return toast('رقم الجوال غير صحيح', false);
  }
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    const name = idFileName(rec) + '.pdf';
    idSaveBlob(await idPdfBlob(rec, sigs), name);
    const msg = 'السلام عليكم ورحمة الله وبركاته\n' +
      'سعادة ' + (rec.mgrName ? 'الأستاذة/ ' + rec.mgrName + ' — مديرة ' : 'مديرة ') + (/^مركز/.test(rec.center || '') ? '' : 'مركز ') + (rec.center || '') + ' المحترمة\n' +
      'نرفق لكم تقرير زيارة المشرفة' + (d.vtype ? ' (' + d.vtype + ')' : '') + (idPlainHDate(rec) ? ' بتاريخ ' + idPlainHDate(rec) : '') + '.\n' +
      'شاكرين لكم تعاونكم.\n' +
      (rec.supName ? 'المشرفة: ' + rec.supName + '\n' : '') +
      ID_UNIT + ' — جمعية فرقان';
    const m = document.getElementById('idModal'), b = document.getElementById('idModalBody');
    b.innerHTML = '<div class="id-send">' +
      '<div>✅ حُفظ ملف التقرير <b>' + esc(name) + '</b> في جهازكِ.</div>' +
      '<div>اضغطي الزر لفتح محادثة المديرة' + (rec.mgrName ? ' (' + esc(rec.mgrName) + ')' : '') + '، ثم أرفقي الملف من زر الإرفاق 📎 ← «مستند».</div>' +
      '<a class="btn id-wa" target="_blank" rel="noopener" href="https://wa.me/' + phone + '?text=' + encodeURIComponent(msg) + '">💬 فتح محادثة المديرة في واتساب</a></div>';
    m.classList.remove('hidden');
  } catch (e) { toast(e.message || 'تعذّر تجهيز الملف', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}

/* ---------- عرض داخل الصفحة (نافذة) ---------- */
async function idView(rec) {
  const m = document.getElementById('idModal'), b = document.getElementById('idModalBody');
  if (!m || !b) return;
  b.innerHTML = '<p class="empty">جارِ التحميل...</p>';
  m.classList.remove('hidden');
  let sigs = {};
  try { sigs = await idLoadSigs(rec); } catch (e) {}
  b.innerHTML = '<div class="ex-bar"><button class="btn light" id="idVPrint">طباعة</button><button class="btn light" id="idVPdf">تحميل PDF</button><button class="btn light" id="idVShare">مشاركة (واتساب)</button>' +
    (rec.kind === 'visit' && typeof idSendMgr === 'function' && document.getElementById('idariPage') ? '<button class="btn id-wa" id="idVSend">📲 إرسال للمديرة</button>' : '') + '</div>' +
    '<style>' + ID_CSS + '</style><div class="id-scroll">' + idDocHtml(rec, sigs) + '</div>';
  document.getElementById('idVPrint').onclick = e => idPrint(rec, e.currentTarget, sigs);
  document.getElementById('idVPdf').onclick = e => idPdf(rec, e.currentTarget, sigs);
  document.getElementById('idVShare').onclick = e => idShare(rec, e.currentTarget, sigs);
  const sb = document.getElementById('idVSend');
  if (sb) sb.onclick = e => idSendMgr(rec, e.currentTarget, sigs);
}
function idCloseModal() { const m = document.getElementById('idModal'); if (m) m.classList.add('hidden'); }
