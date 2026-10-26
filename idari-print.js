/* ===== نماذج وحدة الإشراف الإداري: الطباعة وتحميل PDF والمشاركة بالكليشة الحمراء (letterhead.jpg) ===== */
// يُستخدم في صفحة المشرفات (idari.html) وفي صفحة إدارة الوحدات (units.html)
const ID_LETTERHEAD = 'letterhead.jpg';
const ID_UNIT = 'وحدة الإشراف الإداري';
const ID_PDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
const ID_FONT_CSS = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Amiri:wght@400;700&display=swap';
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
const idBox = on => '<span class="idc-box">' + (on ? '☑' : '☐') + '</span> ';   // مثل تقرير المقاصف
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
.idoc .idc-meta{font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;font-weight:700;font-size:15.2px;color:#2b2321}
.idoc .idc-meta>span{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.idoc .idc-m{color:#7a1f2b}
.idoc .idc-date{display:inline-block;direction:rtl}
.idoc .idc-box{line-height:1}
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
.idoc .idp{font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;color:#222}
.idoc .idp *{font-weight:400}
.idoc .idp-in{padding:22px 112px 26px}
.idoc .idp-title{text-align:center;font-family:'Amiri',serif;font-size:26px;font-weight:700 !important;color:#7a1f2b;margin:0 0 16px}
.idoc .idp th{font-weight:500 !important;font-size:16px}
.idoc .idp td{font-size:15.5px}
.idoc .idp .idc-meta,.idoc .idp .idc-meta *{font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;font-weight:700;font-size:17px;color:#2b2321}
.idoc .idp .idp-sig,.idoc .idp .idp-sig *{font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;font-weight:700;font-size:17px;color:#2b2321}   /* سطر الاسم والتوقيع والتاريخ مثل سطر الفترة */
.idoc .idp .idp-note{font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;font-weight:500;font-size:15px;color:#2b2321}
.idoc .idp-meta{display:flex;gap:56px;align-items:center;font-size:18px;margin:0 8px 12px}
.idoc .idp table{width:100%;border-collapse:collapse;font-size:17px;table-layout:fixed}
.idoc .idp th{background:#fde9ed;color:#6f0c1e;font-size:21px;border:1px solid #000;padding:2px 10px;text-align:center}
.idoc .idp tr td{background:#fff;border:1px solid #000;height:31px;padding:3px 10px;text-align:right;vertical-align:middle}
.idoc .idp-sig{display:flex;justify-content:space-between;align-items:flex-start;font-size:15px;margin:10px 0 0}
.idoc .idp-sig>div{flex:1}
.idoc .idp-sig>div:nth-child(2){text-align:center}
.idoc .idp-sig>div:last-child{text-align:left}
.idoc .idp-sig img{max-height:54px;max-width:170px;display:inline-block;vertical-align:middle}
.idoc .idp-note{font-size:13px;margin:22px 0 0}
.idoc .idc-subject{font-weight:800;color:#7a1f2b;font-size:15.5px;margin:0 0 12px}
.idoc td.idc-note-c{text-align:right;padding-right:14px;height:52px}
.idoc td.idc-rec-c{text-align:right;padding-right:14px;font-weight:700}
/* ===== التنسيق الموحّد لكل الكشوف والاستمارات (ألوان استمارة تقييم مسؤولة المقصف) =====
   رأس الجدول عنابي بكتابة بيضاء، وخلايا البيانات والمجالات بيج فاتح، وسطور المجموع بيج، والحدود بيج رمادي فاتح. */
/* التنسيق الموحد لجميع النماذج والاستمارات: عنوان عنابي بلا خلفية، ورأس الجدول وردي فاتح بكتابة عنابية، وحدود فاتحة */
.idoc .idc-title{background:transparent !important;color:#7a1f2b !important;border:0 !important;padding:4px 10px !important;line-height:1.35}
/* الخطوط مثل نظام المقاصف: النص Tajawal وعناوين النماذج Amiri */
.idoc .idc-title,.idoc .kf-title{font-family:'Amiri',serif !important;font-weight:700}
.idoc th:not(.hs-s){background:#f3e3e6 !important;color:#7a1f2b !important;border-color:#e2cdd2 !important}
.idoc td{border-color:#e2cdd2 !important}
.idoc .idc-info td,.idoc .sge-info td,.idoc .tv-info td,.idoc td.idc-lbl,.idoc td.k,.idoc td.im-t{background:#fff !important}
.idoc td.sge-g,.idoc td.tv-g,.idoc td.im-g,.idoc td.g{background:#fbf6f7 !important;color:#7a1f2b !important}
.idoc tr.sge-sum td,.idoc tr.tv-sum td,.idoc tr.tv-sub td{background:#fbf6f7 !important}
.idoc .sge-box b,.idoc .tv-box b{background:#f3e3e6 !important;color:#7a1f2b !important;border-color:#e2cdd2 !important}
.idoc .sge-box,.idoc .tv-box{border-color:#e2cdd2 !important}
.idoc .im-band{background:#fff;border-color:#e2cdd2}
.idoc .idc-m,.idoc td.idc-n{color:#7a1f2b}
`;

/* ---------- محتوى النموذج (نفس الشكل للعرض والطباعة والـ PDF) ---------- */
function idDocHtml(rec, sigs, lhUrl) {
  sigs = sigs || {};
  if (rec.kind === 'monthly') return imDocHtml(rec, sigs, lhUrl);   // استمارة المتابعة الإدارية الشهرية (عدة صفحات)
  if (ID_PORTRAIT[rec.kind]) return ptDocHtml(rec, sigs, lhUrl);     // النماذج الطولية (تقييم المديرة، حصر القاعات)
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
    h = head + '<div class="idp"><div class="idp-in"><div class="idp-title">الاقتراحات والمرئيات – الصعوبات التي تواجه المشرفة الإدارية</div>' +
      '<div class="idc-meta"><span>الفترة: ' + periodBoxes + '</span><span>' + yearSem + '</span></div>' +
      '<table><tr><th>الاقتراحات والمرئيات</th><th>الصعوبات التي تواجه المشرفة</th></tr>' + body + '</table>' +
      '<div class="idp-sig idc-avoid"><div>اسم المشرفة: ' + esc(rec.supName || '') + '</div><div>التوقيع: ' + (sigs.sup ? '<img src="' + sigs.sup + '" alt="">' : '') + '</div><div>التاريخ: ' + date + '</div></div>' +
      '<div class="idp-note">تُطالَب المشرفة بتسليمها آخر الفصل الدراسي.</div></div></div>';
  } else {
    const rows = (d.rows || []).filter(r => r && (r.sug || r.dif));
    const n = Math.max(rows.length, 4);
    let body = '';
    for (let i = 0; i < n; i++) {
      const r = rows[i] || {};
      body += '<tr class="idc-r"><td class="idc-n">' + (rows[i] ? idDigits(i + 1) : '') + '</td><td>' + idNl(r.sug) + '</td><td>' + idNl(r.dif) + '</td></tr>';
    }
    h = head + '<div class="idc-body"><div class="idc-title">الاقتراحات والمرئيات – الصعوبات التي تواجه المشرفة الإدارية</div>' +
      '<div class="idc-meta"><span>' + periodBoxes + '</span><span>' + yearSem + '</span></div>' +
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
      '<link rel="stylesheet" href="' + ID_FONT_CSS + '">' +
      '<style>@page{size:A4 ' + (ID_PORTRAIT[rec.kind] ? 'portrait' : 'landscape') + ';margin:8mm 0}@page:first{margin-top:0}html,body{margin:0;background:#fff}' + ID_CSS +
      '.idoc{width:100%;padding:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>' +
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
// خط Tajawal مضمّن كنص حتى يُرسم في ملف PDF بنفس شكله في نظام المقاصف (يُحمَّل مرة واحدة)
let idFontPromise = null;
function idFontEmbedCss() {
  if (idFontPromise) return idFontPromise;
  idFontPromise = (async () => {
    const css = await (await fetch(ID_FONT_CSS)).text();
    let out = '';
    for (const blk of css.split('/* ').slice(1).map(b => '/* ' + b).filter(b => /^\/\* (arabic|latin) \*\//.test(b))) {
      const m = blk.match(/url\(([^)]+)\)/);
      if (!m) continue;
      const blob = await (await fetch(m[1].replace(/["']/g, ''))).blob();
      const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      out += blk.replace(m[0], 'url(' + data + ')');
    }
    return out;
  })().catch(() => { idFontPromise = null; return ''; });
  return idFontPromise;
}
// إذا زاد النموذج قليلاً عن صفحة A4 عرضية نصغّره ليكفي صفحة واحدة؛ وإن كان طويلاً جداً يُقسَّم على صفحات
function idFitPage(cv) { return idFitBleed(cv, false); }
/* صفحة واحدة والكليشة من الطرف إلى الطرف (بلا هوامش بيضاء على الجانبين):
   إن زاد النموذج قليلاً عن الصفحة نصغّر ما تحت الكليشة فقط، وتبقى الكليشة بعرض الصفحة كاملاً.
   وإن كان أقصر نكمل الصفحة بالأبيض من الأسفل حتى لا تظهر صفحة ثانية فارغة. */
function idFitBleed(cv, portrait) {
  const pageH = Math.floor(cv.width * (portrait ? 297 / 210 : 210 / 297)) - 2;
  if (cv.height > pageH * (portrait ? 1.6 : 1.8)) return cv;   // نموذج طويل فعلاً: يُقسَّم على أكثر من صفحة كما هو
  const out = document.createElement('canvas');
  out.width = cv.width; out.height = pageH;
  const g = out.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, out.width, out.height);
  if (cv.height <= pageH) { g.drawImage(cv, 0, 0); return out; }
  const hh = Math.round(cv.width * 351 / 2000);   // ارتفاع الكليشة (بعرض الصفحة)
  g.drawImage(cv, 0, 0, cv.width, hh, 0, 0, cv.width, hh);
  const k = (pageH - hh) / (cv.height - hh), bw = Math.round(cv.width * k);
  g.drawImage(cv, 0, hh, cv.width, cv.height - hh, Math.round((cv.width - bw) / 2), hh, bw, pageH - hh);
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
  if (rec.kind === 'monthly') return imPdfBlob(rec, sigs);
  if (ID_PORTRAIT[rec.kind]) return ptPdfBlob(rec, sigs);
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
      const fontCss = await idFontEmbedCss();
      const io = { pixelRatio: 2, backgroundColor: '#ffffff', width: 1123, style: { margin: '0' } };
      if (fontCss) io.fontEmbedCSS = fontCss; else io.skipFonts = true;
      const cv = await window.htmlToImage.toCanvas(box.querySelector('.idoc'), io);
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
      'ويمكنكم الاطلاع عليه من حساب المركز في منظومة مشرفات ← أيقونة «المراكز» ← «الوارد من المشرفات»:\n' + new URL('centers.html', location.href).href + '\n' +
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
  b.innerHTML = '<div class="ex-bar"><button class="btn light" id="idVPdf">تحميل PDF</button><button class="btn light" id="idVShare">مشاركة</button>' +
    (rec.kind === 'visit' && typeof idSendMgr === 'function' && document.getElementById('idariPage') ? '<button class="btn id-wa" id="idVSend">📲 إرسال للمديرة</button>' : '') + '</div>' +
    '<style>' + ID_CSS + '</style><div class="id-scroll">' + idDocHtml(rec, sigs) + '</div>';
  document.getElementById('idVPdf').onclick = e => idPdf(rec, e.currentTarget, sigs);
  document.getElementById('idVShare').onclick = e => idShare(rec, e.currentTarget, sigs);
  const sb = document.getElementById('idVSend');
  if (sb) sb.onclick = e => idSendMgr(rec, e.currentTarget, sigs);
}
function idCloseModal() { const m = document.getElementById('idModal'); if (m) m.classList.add('hidden'); }

/* ======================= استمارة المتابعة الإدارية الشهرية (kind = monthly) =======================
   البنود منقولة من الاستمارة الورقية. كل سجل = زيارة واحدة (رقمها وتاريخها ونوعها توجيهية/تقييمية).
   لكل بند ثلاثة اختيارات (الإيجابي / السلبي / إلى حد ما) وخانة ملاحظات وتوجيهات.
   القيم المحفوظة في data.ev: [{ k: مفتاح القسم, name: اسم الموظفة, a: ['1'|'2'|'3'|''...], n: [ملاحظات...] }] */
ID_KINDS.monthly = 'استمارة المتابعة الإدارية الشهرية';
const IM_MID = 'إلى حد ما';
const im = (t, pos, neg, mid, g) => ({ t, o: [pos, neg, mid || IM_MID], g: g || '' });
const IM_LOOK = () => im('ملاءمة الشخصية ومظهرها العام', 'ملائمة', 'غير ملائمة');
const IM_DEAL = () => im('حسن التعامل مع الغير', 'حسنة التعامل', 'غير حسنة');
const IM_TIME = () => im('المحافظة على المواعيد وقلة الغياب', 'محافظة', 'غير محافظة');
const IM_FOLLOW = t => im(t, 'تتابع', 'غير متابعة');
const IM_MGR_F = t => im(t, 'متابعة', 'غير متابعة');
const IM_FOLDER = g => [im('التنظيم', 'منظم', 'غير منظم', '', g), im('الاكتمال', 'مكتمل', 'غير مكتمل', '', g)];
const IM_SECTIONS = [
  { k: 'guard', title: 'الحارس', grp: 'متابعة الهيئة الإدارية', person: 'الحارس', items: [
    im('التواجد عند الباب', 'متواجد', 'غير متواجد', 'أحياناً'),
    im('التعاون مع الإدارة', 'متعاون', 'غير متعاون')] },
  { k: 'worker', title: 'العاملة', grp: 'متابعة الهيئة الإدارية', person: 'العاملة', multi: true, items: [
    IM_LOOK(), IM_DEAL(), IM_TIME(),
    im('المحافظة على العهدة المسلمة لها', 'محافظة', 'غير محافظة'),
    im('التعاون مع الإدارة وتنفيذ ما يُسند إليها', 'متعاونة', 'غير متعاونة'),
    im('سرعة تنفيذ ما يُسند إليها', 'سريعة', 'غير سريعة'),
    im('الاهتمام بنظافة القسم المسؤولة عنه', 'مهتمة', 'غير مهتمة'),
    im('إطفاء الأنوار والمكيفات في نهاية الدوام', 'يتم', 'لا يتم'),
    im('ترتيب القاعات بعد نهاية الدوام كل يوم', 'ترتب', 'لا ترتب')] },
  { k: 'assist', title: 'المساعدة', grp: 'متابعة الهيئة الإدارية', person: 'المساعدة', items: [
    IM_LOOK(), IM_DEAL(), IM_TIME(),
    IM_FOLLOW('متابعة سجل حضور المعلمات'), IM_FOLLOW('متابعة سجل أحوال المعلمات'), IM_FOLLOW('متابعة دفاتر تحضير المعلمات'),
    IM_FOLLOW('متابعة جدول المناوبة'), IM_FOLLOW('تسليم الكتب وتأمين الناقص منها'),
    im('التسجيل للمستجدات', 'تسجل', 'لا تسجل'),
    im('تصوير أسئلة الاختبار وكشوف الدرجات', 'تصور', 'لا تصور'),
    im('قدوتها في المظهر والسلوك', 'مناسبة', 'غير مناسبة')] },
  { k: 'admin', title: 'الإدارية', grp: 'متابعة الهيئة الإدارية', person: 'الإدارية', multi: true, items: [
    IM_LOOK(), IM_DEAL(), IM_TIME(),
    im('التعاون مع المديرة والمشرفات', 'متعاونة', 'غير متعاونة'),
    IM_FOLLOW('متابعة سجل قيد الدارسات'), IM_FOLLOW('متابعة السجلات والملفات'), IM_FOLLOW('متابعة ملف العهد'),
    IM_FOLLOW('متابعة العاملات والإشراف على أعمالهن'), IM_FOLLOW('تبليغ النشرات والتعاميم'),
    im('التسجيل للمستجدات', 'تسجل', 'لا تسجل'), IM_FOLLOW('تصوير الأوراق عامة'),
    im('قدوتها في المظهر والسلوك', 'مناسبة', 'غير مناسبة'),
    im('سرعة تنفيذ ما يُسند إليها', 'سريعة', 'غير سريعة')] },
  { k: 'order', title: 'مسؤولة النظام', grp: 'متابعة الهيئة الإدارية', person: 'مسؤولة النظام', multi: true, items: [
    IM_LOOK(), IM_DEAL(), IM_TIME(),
    IM_FOLLOW('أخذ الغياب اليومي ومتابعة حضور وغياب الدارسات'), IM_FOLLOW('متابعة ومعرفة أسباب غياب الدارسات'),
    IM_FOLLOW('متابعة التزام الدارسات بالزي'), IM_FOLLOW('متابعة المعلمات في الحصص'),
    IM_FOLLOW('متابعة دخول الدارسات في الحصص وضبط الجولات'), IM_FOLLOW('مراقبة الدارسات في الأدوار أثناء الحصص والفسحة'),
    im('قدوتها في المظهر والسلوك', 'مناسبة', 'غير مناسبة')] },
  { k: 'security', title: 'ضابطة الأمن', grp: 'متابعة الهيئة الإدارية', person: 'ضابطة الأمن', items: [
    IM_LOOK(), IM_DEAL(), IM_TIME(),
    im('التعاون مع الإدارة', 'متعاونة', 'غير متعاونة'),
    IM_FOLLOW('متابعة الدارسات في الدخول والخروج'), IM_FOLLOW('ضبط دخول وخروج الزائرات والمراجعات'),
    im('عدم مغادرة البوابة لأي ظرف', 'متواجدة دائماً', 'غير متواجدة'),
    im('التواجد عند الباب', 'متواجدة', 'غير متواجدة', 'أحياناً'),
    IM_FOLLOW('التفتيش على الجوالات'),
    im('الاطلاع على إذن الخروج قبل السماح بخروج أي شخص', 'تطلع', 'لا تطلع')] },
  { k: 'manager', title: 'المديرة', grp: 'متابعة الهيئة الإدارية', person: 'المديرة', items: [
    IM_LOOK(), im('حسن التعامل مع الغير (موظفات، دارسات)', 'حسنة التعامل', 'غير حسنة'),
    im('التعاون مع المشرفات (الإداري، التعليمي، تحفيظ الصغار، مراقبة الدوام، مشرفة المقاصف)', 'متعاونة', 'غير متعاونة'),
    im('سرعة تنفيذ ما يُسند إليها', 'سريعة', 'غير سريعة'),
    im('الالتزام بالجدول الزمني للفصل الدراسي', 'ملتزمة', 'غير ملتزمة'),
    im('التقيد بالجدول الزمني لليوم الدراسي', 'متقيدة', 'غير متقيدة'),
    im('رفع البيانات في حينها أو حسب ما يُطلب منها', 'ملتزمة', 'غير ملتزمة'),
    im('الدقة في كتابة البيانات المطلوبة', 'دقيقة', 'غير دقيقة'),
    IM_MGR_F('متابعة الإداريات في القيام بمهامهن'), IM_MGR_F('متابعة العاملات في القيام بمهامهن'),
    IM_MGR_F('متابعة تنفيذ الملفات والسجلات واكتمالها في حينه'),
    im('عقد الاجتماعات الدورية بالمعلمات لمتابعة العمل', 'تعقد', 'لا تعقد'),
    im('تصنيف الدارسات في القاعات', 'مناسب', 'غير مناسب'),
    im('متابعة زي الدارسات ومظهرهن العام', 'نظامي', 'غير نظامي'),
    im('ضبط الدارسات في الحضور والانصراف', 'منضبط', 'غير منضبط'),
    IM_MGR_F('متابعة دخول الدارسات للحصص'), IM_MGR_F('متابعة غياب الدارسات'),
    IM_MGR_F('متابعة المستوى التعليمي للدارسات والحرص على رفع مستواهن'), IM_MGR_F('متابعة توزيع المناهج'),
    IM_MGR_F('متابعة التحضير الكتابي'),
    im('الحضور للمعلمات', 'منتظم', 'غير منتظم'),
    IM_MGR_F('متابعة المناوبة'),
    im('العدالة في توزيع الأعمال على الموظفات', 'عادلة التوزيع', 'لا توجد عدالة'),
    im('متابعة زي المعلمات ومظهرهن العام', 'نظامي', 'غير نظامي'),
    im('استلام أسئلة الاختبار التحريري نموذج (١، ٢)', 'استلمت', 'لم تستلم'),
    im('استلام المسودات من المعلمات بعد الاختبار', 'استلمت', 'لم تستلم'),
    im('استلام الكشوفات النهائية من المعلمات بعد رصد الدرجات', 'استلمت', 'لم تستلم'),
    IM_MGR_F('متابعة نتائج التقييم والاختبارات النهائية'),
    IM_MGR_F('متابعة التزام المنسوبات في الحضور والانصراف'),
    im('توقيع جميع الموظفات على التعهد', 'تم', 'لم يتم'),
    im('الحرص على المال العام وعدم إهداره', 'حريصة', 'غير حريصة'),
    IM_MGR_F('متابعة نظافة المركز'),
    im('المحافظة على ممتلكات المركز', 'محافظة', 'غير محافظة')] },
  { k: 'building', title: 'المبنى والتجهيزات', grp: 'متابعة المبنى والتجهيزات', items: [
    im('نظافة المبنى', 'نظيف', 'غير نظيف'),
    im('الأجهزة والآلات', 'صالحة', 'غير صالحة')] },
  { k: 'records', title: 'السجلات', grp: 'متابعة السجلات والملفات', items: [
    im('تسجيل الزمن الفعلي للحضور والانصراف', 'مسجل', 'غير مسجل', '', 'سجل الحضور والانصراف'),
    im('اكتمال التواقيع للحضور والانصراف', 'مكتمل', 'غير مكتمل', '', 'سجل الحضور والانصراف'),
    im('وضع الخط الأحمر في موعده', 'موضوع', 'غير موضوع', '', 'سجل الحضور والانصراف'),
    im('خلوه من المسح والكشط', 'خالٍ', 'غير خالٍ', '', 'سجل الحضور والانصراف'),
    ...['الصادر', 'الوارد'].flatMap(x => [
      im('التسلسل العام', 'متسلسل', 'غير متسلسل', '', 'سجل ' + x),
      im('تسلسل التواريخ', 'متسلسل', 'غير متسلسل', '', 'سجل ' + x),
      im('تسجيل الموضوع', 'مسجل', 'غير مسجل', '', 'سجل ' + x),
      im('تعبئة الحقول', 'معبأ', 'غير معبأ', '', 'سجل ' + x),
      im('مطابقته على ملفات الإدارة (' + x + ')', 'مطابق', 'غير مطابق', '', 'سجل ' + x),
      im('جودة الخط ووضوحه وخلوه من المسح والكشط', 'واضح', 'غير واضح', '', 'سجل ' + x)]),
    im('حصر الغياب ومتابعته من أول اليوم الدراسي', 'متابعة', 'غير متابعة', '', 'سجل غياب الدارسات'),
    im('حصر الغياب بعذر وبدون عذر نهاية كل يوم', 'يتم', 'لا يتم', '', 'سجل غياب الدارسات'),
    im('متابعة أعذار الدارسات الغائبات', 'متابعة', 'غير متابعة', '', 'سجل غياب الدارسات'),
    im('تنظيم السجل وخلوه من المسح والكشط', 'منتظم', 'غير منتظم', '', 'سجل غياب الدارسات'),
    im('حذف الطالبات المنقطعات', 'متابعة', 'غير متابعة', '', 'سجل غياب الدارسات'),
    im('اكتمال البيانات والتواقيع', 'مكتمل', 'غير مكتمل', '', 'سجل الخروج أثناء الدوام الرسمي'),
    im('تعبئة جميع الحقول من واقع الهوية', 'معبأ', 'غير معبأ', '', 'سجل الخروج أثناء الدوام الرسمي'),
    im('تنظيم السجل وخلوه من المسح والكشط', 'منتظم', 'غير منتظم', '', 'سجل الخروج أثناء الدوام الرسمي'),
    im('جودة الخط ووضوحه', 'واضح', 'غير واضح', '', 'سجل الخروج أثناء الدوام الرسمي'),
    im('تنظيم الكشف وخلوه من المسح والكشط', 'منتظم', 'غير منتظم', '', 'سجل قيد الدارسات'),
    im('جودة الخط ووضوحه', 'واضح', 'غير واضح', '', 'سجل قيد الدارسات'),
    im('تعبئة الحقول', 'معبأ', 'غير معبأ', '', 'سجل قيد الدارسات'),
    im('حذف الطالبات المنقطعات', 'تم', 'لم يتم', '', 'سجل قيد الدارسات'),
    im('الاستخدام', 'مستخدم', 'غير مستخدم', '', 'سجل النشرات الداخلية')] },
  { k: 'folders', title: 'المجلدات والملفات', grp: 'متابعة السجلات والملفات', items: [
    im('خطابات المباشرة', 'موجودة', 'غير موجودة', '', 'مجلد وملف شؤون الموظفات'),
    im('خطابات التكليف ونماذج الطلبات (الوجود)', 'موجودة', 'غير موجودة', '', 'مجلد وملف شؤون الموظفات'),
    im('خطابات التكليف ونماذج الطلبات (الصحة)', 'صحيحة', 'غير صحيحة', '', 'مجلد وملف شؤون الموظفات'),
    im('الملف', 'مكتمل', 'غير مكتمل', '', 'مجلد وملف شؤون الموظفات'),
    im('الاكتمال والدقة', 'مكتمل', 'غير مكتمل', '', 'مجلد الإحصائيات'),
    ...IM_FOLDER('مجلد الوارد'), ...IM_FOLDER('مجلد الصادر'), ...IM_FOLDER('مجلد الزيارات'), ...IM_FOLDER('مجلد النتائج'),
    ...IM_FOLDER('ملف الاختبارات'), ...IM_FOLDER('ملف شؤون الدارسات'),
    im('الوجود', 'موجود', 'غير موجود', '', 'دليل الهاتف'), ...IM_FOLDER('دليل الهاتف')] }
];
const IM_SEC = k => IM_SECTIONS.find(s => s.k === k);
const IM_ADMIN_TITLES = ['الإدارية (المساعدة)', 'الإدارية', 'الإدارية', 'الإدارية', 'الإدارية (ضابطة أمن)'];

const IM_CSS = `
.idoc.imdoc{font-size:13.5px}
.imdoc .im-page{position:relative;background:#fff}
.imdoc .im-page + .im-page{margin-top:24px;border-top:2px dashed #ccc}
@media print{.imdoc .im-page{break-after:page;page-break-after:always}.imdoc .im-page:last-child{break-after:auto;page-break-after:auto}.imdoc .im-page + .im-page{margin-top:0;border:0}}
.imdoc .im-in{padding:0 26px 14px}
.imdoc .idc-title{margin:12px 0 10px}
.imdoc .im-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 18px;font-weight:700;font-size:14.5px;margin:0 0 10px}
.imdoc .im-band{display:flex;flex-wrap:wrap;gap:6px 22px;justify-content:center;font-weight:700;font-size:13.5px;background:#fbf3f4;border:1px solid #444;border-bottom:0;padding:6px 10px}
.imdoc .im-h{font-weight:800;color:#7a1f2b;font-size:15.5px;margin:10px 0 6px;text-decoration:underline}
.imdoc table{font-size:13px}
.imdoc th,.imdoc td{padding:3px 6px;line-height:1.35}
.imdoc th{background:#fbf3f4}
.imdoc td.im-g{background:#f6f0f0 !important;font-weight:800;width:110px;color:#7a1f2b}
.imdoc td.im-t{text-align:right;background:#fdf8f6 !important}
.imdoc td.im-o{white-space:nowrap;font-weight:700;width:96px}
.imdoc td.im-o.on{color:#7a1f2b}
.imdoc td.im-n{text-align:right;width:27%}
.imdoc td.im-k{background:#f6f0f0 !important;font-weight:800;width:150px}
.imdoc td.im-v{text-align:right;color:#7a1f2b;font-weight:700}
.imdoc .im-txt{text-align:right;white-space:pre-wrap;min-height:40px;padding:6px 10px}
.imdoc .im-foot{display:flex;justify-content:space-between;align-items:flex-end;font-weight:800;font-size:15px;margin:22px 10px 0}
.imdoc .im-foot img{max-height:58px;max-width:180px;vertical-align:middle}
`;

// تقسيم البنود على صفحات A4 عرضية (كل صفحة بالكليشة ورأس الزيارة) مثل الاستمارة الورقية
const IM_ROWS_PER_PAGE = 19;
function imOptCells(it, v) {
  return it.o.map((o, j) => '<td class="im-o' + (v === String(j + 1) ? ' on' : '') + '">' + idBox(v === String(j + 1)) + esc(o) + '</td>').join('');
}
function imDocPages(rec, sigs, lhUrl) {
  const d = rec.data || {}, st = d.staff || {}, gen = d.gen || {};
  const head = '<img class="idc-lh" src="' + esc(lhUrl || ID_LETTERHEAD) + '" width="2000" height="351" alt="">';
  const m = x => '<span class="idc-m">' + x + '</span>';
  const vt = String(d.vtype || '');
  const band = '<div class="im-band"><span>المركز: ' + m(esc(rec.center)) + '</span><span>الزيارة رقم: ' + m(esc(idDigits(rec.visitNo || '—'))) + '</span>' +
    '<span>تاريخ الزيارة: ' + m(esc(idDayName(rec))) + ' ' + m(idHDate(rec)) + '</span>' +
    '<span>نوعها: ' + idBox(vt === 'توجيهية') + 'توجيهية &nbsp; ' + idBox(vt === 'تقييمية') + 'تقييمية</span></div>';
  const pages = [];
  // الصفحة الأولى: الرأس والبيانات العامة والهيئة الإدارية والعاملات
  const per = String(rec.period || '');
  let p1 = '<div class="idc-title">استمارة المتابعة الإدارية الشهرية</div>' +
    '<div class="im-meta"><span>اسم المشرفة: ' + m(esc(rec.supName || '')) + '</span><span>اسم المديرة: ' + m(esc(rec.mgrName || '')) + '</span><span>اسم المركز: ' + m(esc(rec.center || '')) + '</span>' +
    '<span>الفصل الدراسي: ' + m(esc(rec.sem || '')) + '</span><span>العام: ' + m(rec.year ? idDigits(rec.year) + 'هـ' : '') + '</span>' +
    '<span>الفترة: ' + idBox(per.indexOf('صباحي') > -1) + 'صباحي &nbsp; ' + idBox(per.indexOf('مسائي') > -1) + 'مسائي</span></div>' +
    '<div class="im-h">البيانات العامة:</div>' + band +
    '<table><tr><td class="im-k">العدد الكلي للقاعات الدراسية</td><td class="im-v">' + esc(idDigits(gen.halls || '')) + '</td><td class="im-k">عدد القاعات الدراسية المستخدمة</td><td class="im-v">' + esc(idDigits(gen.used || '')) + '</td>' +
    '<td class="im-k">الطاقة الاستيعابية للمركز</td><td class="im-v">' + esc(idDigits(gen.cap || '')) + '</td></tr>' +
    (gen.notes ? '<tr><td class="im-k">ملاحظات</td><td class="im-v" colspan="5">' + idNl(gen.notes) + '</td></tr>' : '') + '</table>';
  const adm = (st.adm || []).filter(x => x && (x.t || x.n)), work = (st.work || []).filter(Boolean), tch = (st.tch || []).filter(Boolean);
  let rows = '<tr><th style="width:150px"></th><th style="width:220px">مسمى الوظيفة</th><th>الاسم</th></tr>';
  rows += '<tr><td class="im-g">الحراس</td><td class="im-t">الحارس</td><td class="im-v">' + esc(st.guard || '') + '</td></tr>';
  adm.forEach((x, i) => { rows += '<tr>' + (i === 0 ? '<td class="im-g" rowspan="' + adm.length + '">الهيئة الإدارية</td>' : '') + '<td class="im-t">' + esc(x.t || 'الإدارية') + '</td><td class="im-v">' + esc(x.n || '') + '</td></tr>'; });
  work.forEach((x, i) => { rows += '<tr>' + (i === 0 ? '<td class="im-g" rowspan="' + work.length + '">العاملات</td>' : '') + '<td class="im-t">العاملة رقم (' + idDigits(i + 1) + ')</td><td class="im-v">' + esc(x) + '</td></tr>'; });
  p1 += '<table style="margin-top:10px">' + rows + '</table>';
  pages.push(p1);
  // المعلمات في صفحة مستقلة: عمودان من الأسماء
  if (tch.length) {
    const half = Math.ceil(tch.length / 2);
    let t = '<tr><th style="width:60px">م</th><th>اسم المعلمة</th><th style="width:60px">م</th><th>اسم المعلمة</th></tr>';
    for (let i = 0; i < half; i++) {
      const j = i + half;
      t += '<tr><td class="idc-n">' + idDigits(i + 1) + '</td><td class="im-v">' + esc(tch[i]) + '</td><td class="idc-n">' + (tch[j] ? idDigits(j + 1) : '') + '</td><td class="im-v">' + esc(tch[j] || '') + '</td></tr>';
    }
    pages.push('<div class="im-h">الهيئة التعليمية:</div>' + band + '<table>' + t + '</table>');
  }
  // أقسام التقييم: كل قسم جدول (يُقسَّم على أكثر من صفحة إن طال)
  const blocks = [];
  (d.ev || []).forEach(e => {
    const sec = IM_SEC(e.k); if (!sec) return;
    const a = e.a || [], n = e.n || [];
    if (!a.some(Boolean) && !n.some(Boolean) && !(e.k === 'building' && d.devices)) return;   // قسم لم يُقيَّم: لا يُطبع
    const label = sec.person ? esc(sec.person) + (e.name ? '<br><span style="font-weight:700;color:#222">(' + esc(e.name) + ')</span>' : '') : '';
    const rowsOf = sec.items.map((it, i) => ({ it, v: String(a[i] || ''), note: n[i] || '' }));
    blocks.push({ sec, label, rows: rowsOf, extra: e.k === 'building' && d.devices ? d.devices : '' });
  });
  const thead = '<tr><th colspan="2">عناصر التقييم</th><th colspan="3">التقييم</th><th>الملاحظات المرصودة والتوجيهات</th></tr>';
  let cur = [], used = 0, lastGrp = '';
  const flush = () => { if (cur.length) { pages.push(cur.join('')); cur = []; used = 0; } };
  blocks.forEach(b => {
    let i = 0;
    // القسم الذي يكفي صفحة كاملة لا يُقسَم: يبدأ في صفحة جديدة إن لم يتسع له باقي الصفحة
    if (used && used + b.rows.length + 2 > IM_ROWS_PER_PAGE && b.rows.length + 3 <= IM_ROWS_PER_PAGE) flush();
    while (i < b.rows.length) {
      if (used && used + 4 > IM_ROWS_PER_PAGE) flush();
      const room = Math.max(4, IM_ROWS_PER_PAGE - used - (used ? 2 : 1));
      const part = b.rows.slice(i, i + room);
      const showH = !used && (b.sec.grp !== lastGrp || i === 0);
      let body = '';
      // خلية القسم: للموظفة اسمها، وللسجلات اسم السجل (تُدمج الصفوف المتتالية لنفس السجل)
      part.forEach((r, j) => {
        let g = '';
        if (b.label) { if (j === 0) g = '<td class="im-g" rowspan="' + part.length + '">' + b.label + '</td>'; }
        else if (j === 0 || part[j - 1].it.g !== r.it.g) { let k = 1; while (part[j + k] && part[j + k].it.g === r.it.g) k++; g = '<td class="im-g" rowspan="' + k + '">' + esc(r.it.g || b.sec.title) + '</td>'; }
        body += '<tr>' + g + '<td class="im-t">' + esc(r.it.t) + '</td>' + imOptCells(r.it, r.v) + '<td class="im-n">' + idNl(r.note) + '</td></tr>';
      });
      if (b.extra && i + part.length >= b.rows.length) body += '<tr><td class="im-g">الأجهزة غير الصالحة</td><td class="im-txt" colspan="5">' + idNl(b.extra) + '</td></tr>';
      cur.push((showH || !used ? '<div class="im-h">' + esc(b.sec.grp) + ':</div>' + (used ? '' : band) : '') +
        '<table style="margin-bottom:8px"><colgroup><col style="width:110px"><col style="width:30%"><col><col><col><col style="width:27%"></colgroup>' + thead + body + '</table>');
      used += part.length + 2; lastGrp = b.sec.grp; i += part.length;
    }
  });
  // الصفحة الأخيرة: ملاحظات أخرى والتوقيع (تُضاف لآخر صفحة إن اتسعت لها)
  const last = (d.other ? '<div class="im-h">ملاحظات أخرى:</div><table><tr><td class="im-txt">' + idNl(d.other) + '</td></tr></table>' : '') +
    '<div class="im-foot idc-avoid"><span>اسم المشرفة: ' + m(esc(rec.supName || '')) + '</span><span>التاريخ: ' + m(esc(idDayName(rec))) + ' ' + m(idHDate(rec)) + '</span>' +
    '<span>التوقيع: ' + (sigs && sigs.sup ? '<img src="' + sigs.sup + '" alt="">' : '') + '</span></div>';
  const lastRows = (d.other ? 3 + Math.min(4, String(d.other).split('\n').length) : 0) + 3;
  if (cur.length && used + lastRows <= IM_ROWS_PER_PAGE) { cur.push(last); flush(); }
  else { flush(); pages.push(last); }
  return pages.map(p => '<div class="im-page">' + head + '<div class="im-in">' + p + '</div></div>');
}
function imDocHtml(rec, sigs, lhUrl) {
  return '<style>' + IM_CSS + '</style><div class="idoc imdoc">' + imDocPages(rec, sigs, lhUrl).join('') + '</div>';
}
// ملف PDF متعدد الصفحات: كل صفحة تُرسم وحدها (بالكليشة) وتُصغَّر لتكفي صفحة A4 عرضية
async function imPdfBlob(rec, sigs) {
  if (!sigs) sigs = await idLoadSigs(rec);
  await idLoadPdfLib();
  await idLoadImgLib().catch(() => {});
  const fontCss = await idFontEmbedCss();
  const pages = imDocPages(rec, sigs);
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:0;left:0;width:1123px;z-index:-1;background:#fff;direction:rtl';
  document.body.appendChild(box);
  let worker = null, pdf = null;
  try {
    for (let i = 0; i < pages.length; i++) {
      box.innerHTML = '<style>' + ID_CSS + IM_CSS + '.idoc{width:1123px;padding:0}.imdoc .im-page + .im-page{margin:0;border:0}</style><div class="idoc imdoc">' + pages[i] + '</div>';
      await Promise.all([...box.querySelectorAll('img')].map(im2 => im2.complete ? 0 : new Promise(r => { im2.onload = im2.onerror = r; })));
      const el = box.querySelector('.im-page');
      let cv;
      if (window.htmlToImage) {
        const io = { pixelRatio: 2, backgroundColor: '#ffffff', width: 1123, style: { margin: '0' } };
        if (fontCss) io.fontEmbedCSS = fontCss; else io.skipFonts = true;
        cv = await window.htmlToImage.toCanvas(el, io);
      } else {
        cv = await window.html2pdf().set({ html2canvas: { scale: 2, backgroundColor: '#ffffff', windowWidth: 1123, onclone: idFixBidi } }).from(el).toCanvas().get('canvas');
      }
      // صفحة أطول من A4 عرضية: نوسّع اللوحة (تصغير) لتكفي صفحة واحدة
      const maxH = cv.width * 210 / 297;
      if (cv.height > maxH) {
        const out = document.createElement('canvas');
        out.width = Math.round(cv.height * 297 / 210); out.height = cv.height;
        const g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height);
        g.drawImage(cv, Math.round((out.width - cv.width) / 2), 0);
        cv = out;
      }
      const img = cv.toDataURL('image/jpeg', 0.95);
      const w = 297, h = Math.min(210, 297 * cv.height / cv.width);
      if (!worker) {
        worker = window.html2pdf().set({ margin: 0, jsPDF: { unit: 'mm', format: [297, 210], orientation: 'landscape' } }).from(document.createElement('div')).toPdf();
        pdf = await worker.get('pdf');
        pdf.addImage(img, 'JPEG', 0, 0, w, h);
      } else {
        pdf.addPage([297, 210], 'landscape');
        pdf.addImage(img, 'JPEG', 0, 0, w, h);
      }
    }
    return pdf.output('blob');
  } finally { box.remove(); }
}

/* ======================= صفحات A4 (عرضية أو طولية) → ملف PDF، كل صفحة تُرسم وحدها وتُصغَّر لتكفيها ======================= */
async function idPagesPdf(pages, css, portrait) {
  await idLoadPdfLib();
  await idLoadImgLib().catch(() => {});
  const fontCss = await idFontEmbedCss();
  const W = portrait ? 794 : 1123, pw = portrait ? 210 : 297, ph = portrait ? 297 : 210;
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:0;left:0;width:' + W + 'px;z-index:-1;background:#fff;direction:rtl';
  document.body.appendChild(box);
  let pdf = null;
  try {
    for (let i = 0; i < pages.length; i++) {
      box.innerHTML = '<style>' + ID_CSS + css + '.idoc{width:' + W + 'px;padding:0}.idoc .im-page + .im-page{margin:0;border:0}</style><div class="idoc ' + (portrait ? 'ptdoc' : 'imdoc') + '">' + pages[i] + '</div>';
      await Promise.all([...box.querySelectorAll('img')].map(x => x.complete ? 0 : new Promise(r => { x.onload = x.onerror = r; })));
      const el = box.querySelector('.im-page');
      let cv;
      if (window.htmlToImage) {
        const io = { pixelRatio: 2, backgroundColor: '#ffffff', width: W, style: { margin: '0' } };
        if (fontCss) io.fontEmbedCSS = fontCss; else io.skipFonts = true;
        cv = await window.htmlToImage.toCanvas(el, io);
      } else {
        cv = await window.html2pdf().set({ html2canvas: { scale: 2, backgroundColor: '#ffffff', windowWidth: W, onclone: idFixBidi } }).from(el).toCanvas().get('canvas');
      }
      const maxH = cv.width * ph / pw;
      if (cv.height > maxH) {   // صفحة أطول من A4: تُصغَّر لتكفي صفحة واحدة
        const out = document.createElement('canvas');
        out.width = Math.round(cv.height * pw / ph); out.height = cv.height;
        const g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height);
        g.drawImage(cv, Math.round((out.width - cv.width) / 2), 0);
        cv = out;
      }
      const img = cv.toDataURL('image/jpeg', 0.95), h = Math.min(ph, pw * cv.height / cv.width);
      if (!pdf) pdf = await window.html2pdf().set({ margin: 0, jsPDF: { unit: 'mm', format: [pw, ph], orientation: portrait ? 'portrait' : 'landscape' } }).from(document.createElement('div')).toPdf().get('pdf');
      else pdf.addPage([pw, ph], portrait ? 'portrait' : 'landscape');
      pdf.addImage(img, 'JPEG', 0, 0, pw, h);
    }
    return pdf.output('blob');
  } finally { box.remove(); }
}

/* ======================= النماذج الطولية: استمارة تقييم المديرة، وحصر القاعات في المراكز ======================= */
ID_KINDS.mgreval = 'استمارة تقييم المديرة';
ID_KINDS.halls = 'حصر القاعات في المراكز';
const ID_PORTRAIT = { mgreval: 1, halls: 1 };
// بنود استمارة تقييم المديرة كما في ملف الإكسل: [المحور، البند، الدرجة المستحقة] — المجموع ١٠٠
const ME_ITEMS = [
  ['السمات الشخصية', 'ملاءمة الشخصية للعمل الإداري', 4],
  ['السمات الشخصية', 'قدوتها في المظهر والسلوك', 2],
  ['السمات الشخصية', 'حسن تعاملها مع (المشرفات، الموظفات، الدارسات) ومكتب الإشراف', 3],
  ['المهارات الإدارية', 'وضع الخطط والجداول التنفيذية للعمل بداية كل فصل دراسي', 5],
  ['المهارات الإدارية', 'التناسق والتكامل في إنجاز العمل', 3],
  ['المهارات الإدارية', 'السرعة والدقة في الإنجاز', 3],
  ['المهارات الإدارية', 'إرسال المباشرات والإحصائيات إلى مكتب الإشراف في موعدها', 3],
  ['المهارات الإدارية', 'المهارات القيادية والإبداعية في حل المشكلات', 3],
  ['المهارات الإدارية', 'استخدام التقنية في إنجاز العمل', 5],
  ['المهارات الإدارية', 'التواصل الفعّال مع مكتب الإشراف', 3],
  ['النواحي الإدارية', 'التزامها باللوائح وأنظمة العمل وتنفيذها', 5],
  ['النواحي الإدارية', 'الاهتمام بالنمو المعرفي والمهني وحضور الاجتماعات والورش', 4],
  ['النواحي الإدارية', 'متابعة تنفيذ الملفات والسجلات واكتمالها في حينه', 4],
  ['النواحي الإدارية', 'تنظيم وترتيب السجلات والملفات الإدارية', 4],
  ['النواحي الإدارية', 'عقد الاجتماعات الدورية وتوثيقها', 3],
  ['متابعة الموظفات والمعلمات', 'توزيع الأعمال على الموظفات بشكل متساوٍ', 5],
  ['متابعة الموظفات والمعلمات', 'متابعة أداء الموظفات', 4],
  ['متابعة الموظفات والمعلمات', 'متابعة التزام المنسوبات بالحجاب والزي الشرعي', 3],
  ['متابعة الموظفات والمعلمات', 'متابعة التزام المنسوبات في الحضور والانصراف', 4],
  ['متابعة الموظفات والمعلمات', 'زيارة المعلمات وتقييمهن باستمرار', 5],
  ['متابعة الموظفات والمعلمات', 'متابعة المعلمات في التحضير', 3],
  ['متابعة الموظفات والمعلمات', 'متابعة المعلمات في السير وفق خطة المنهج', 3],
  ['متابعة الموظفات والمعلمات', 'حث المعلمات على التوجيه والإرشاد', 3],
  ['متابعة الدارسات', 'متابعة الدارسات في أدائهن والرفع من مستوى الضعيفات', 4],
  ['متابعة الدارسات', 'متابعة نتائج التقييم والمتابعة والاختبارات النهائية', 5],
  ['الاهتمام بالمنشأة', 'متابعة نظافة المنشأة', 3],
  ['الاهتمام بالمنشأة', 'المحافظة على ممتلكات المنشأة', 4]
];
const ME_MAX = ME_ITEMS.reduce((s, x) => s + x[2], 0);
const ME_QURAN = ['مجازة', 'خاتمة', 'حافظة', 'دورات حفظ', 'خريجة دبلوم عالي إعداد المعلمات', 'خريجة دبلوم متوسط لتأهيل المعلمات', 'خريجة تأهيل معلمات', 'خريجة دورة تأهيل منتهي بالتوظيف'];
const meNum = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫', '.')); return isNaN(n) ? null : n; };
const meTotal = sc => Math.round((sc || []).reduce((s, v) => s + (meNum(v) || 0), 0) * 100) / 100;
// حصر القاعات: الأدوار ونوع القاعة (ك تحفيظ كبار، ص تحفيظ صغار) — الطاقة الاستيعابية للقاعة لا تزيد عن ٢٥
const HL_FLOORS = ['الأرضي', 'الأول', 'الثاني', 'الثالث'];
const HL_TYPES = [['ك', 'تحفيظ كبار'], ['ص', 'تحفيظ صغار']];
const HL_MAX_CAP = 25;
const hlNum = v => meNum(v) || 0;
function hlTotals(d) {
  const floors = (d && d.floors) || [];
  let halls = 0, cap = 0;
  floors.forEach(f => (f.halls || []).forEach(h => { halls++; cap += hlNum(h.cap); }));
  return { halls, cap, floors: floors.filter(f => (f.halls || []).length).length };
}

const PT_CSS = `
.idoc.ptdoc{font-size:14px}
.ptdoc .im-page{position:relative;background:#fff}
.ptdoc .im-page + .im-page{margin-top:24px;border-top:2px dashed #ccc}
@media print{.ptdoc .im-page{break-after:page;page-break-after:always}.ptdoc .im-page:last-child{break-after:auto;page-break-after:auto}.ptdoc .im-page + .im-page{margin-top:0;border:0}}
.ptdoc .pt-in{padding:0 24px 12px}
.ptdoc table.me td{padding:2px 6px;font-size:12.8px;line-height:1.3}
.ptdoc table.me td.g{width:auto;font-size:12.5px}
.ptdoc .idc-title{margin:8px 0 8px;font-size:22px}
.ptdoc table{font-size:13.5px}
.ptdoc th,.ptdoc td{padding:3px 7px;line-height:1.35}
.ptdoc th{background:#fbf3f4}
.ptdoc td.k{background:#f6f0f0 !important;font-weight:800;white-space:nowrap}
.ptdoc td.v{color:#7a1f2b;font-weight:700;text-align:right}
.ptdoc td.g{background:#f6f0f0 !important;font-weight:800;color:#7a1f2b;width:92px}
.ptdoc td.t{text-align:right}
.ptdoc td.s{color:#7a1f2b;font-weight:800;font-size:14.5px}
.ptdoc td.n{text-align:right;width:24%}
.ptdoc tr.sum td{background:#7a1f2b !important;color:#fff;font-weight:800;font-size:15px}
.ptdoc .pt-box{border:1px solid #444;margin-top:10px}
.ptdoc .pt-box b{display:block;background:#f6f0f0;padding:4px 12px;border-bottom:1px solid #444;color:#7a1f2b}
.ptdoc .pt-box div{padding:5px 12px;min-height:34px;white-space:pre-wrap;line-height:1.6;font-weight:600}
.ptdoc .pt-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;font-weight:800;font-size:15px;margin:12px 6px 0}
.ptdoc .pt-foot img{max-height:56px;max-width:170px;vertical-align:middle}
.ptdoc .hl td,.ptdoc .hl th{padding:4px 3px;font-size:12.5px;text-align:center}
.ptdoc .hl td.fl{background:#f6f0f0 !important;font-weight:800;color:#7a1f2b;width:34px;writing-mode:vertical-rl;transform:rotate(180deg)}
.ptdoc .hl td.lb{background:#f6f0f0 !important;font-weight:800;width:92px;white-space:nowrap}
.ptdoc .hl td.v{text-align:center}
.ptdoc .hl td.over{color:#c0392b;font-weight:800}
.ptdoc .pt-note{color:#7a1f2b;font-weight:800;font-size:13.5px;line-height:1.9;margin-top:14px}
`;

function ptHead(lhUrl) { return '<img class="idc-lh" src="' + esc(lhUrl || ID_LETTERHEAD) + '" width="2000" height="351" alt="">'; }
function ptFoot(rec, sigs, lbl) {
  const m = x => '<span class="idc-m">' + x + '</span>';
  return '<div class="pt-foot idc-avoid"><span>' + (lbl || 'اسم المشرفة') + ': ' + m(esc(rec.supName || '')) + '</span><span>التاريخ: ' + m(esc(idDayName(rec))) + ' ' + m(idHDate(rec)) + '</span>' +
    '<span>التوقيع: ' + (sigs && sigs.sup ? '<img src="' + sigs.sup + '" alt="">' : '') + '</span></div>';
}
function mePages(rec, sigs, lhUrl) {
  const d = rec.data || {}, sc = d.sc || [], nt = d.nt || [];
  const kv = (k, v) => '<td class="k">' + k + '</td><td class="v">' + esc(v || '') + '</td>';
  const per = String(rec.period || '');
  let h = '<div class="idc-title">استمارة تقييم المديرة</div>' +
    '<table><tr>' + kv('اسم المركز', rec.center) + kv('الفترة', per) + '</tr><tr>' + kv('الفصل الدراسي', rec.sem) + kv('العام', rec.year ? idDigits(rec.year) + 'هـ' : '') + '</tr></table>' +
    '<table style="margin-top:8px"><tr><th colspan="6">المعلومات الشخصية</th></tr>' +
    '<tr>' + kv('اسم المديرة', rec.mgrName) + kv('رقم الجوال', idDigits(d.phone || '')) + kv('الأجزاء المحفوظة', idDigits(d.juz || '')) + '</tr>' +
    '<tr>' + kv('تاريخ الميلاد', idDigits(d.birth || '')) + kv('محل الميلاد', d.birthplace) + kv('سنوات الخبرة كمديرة', idDigits(d.exp || '')) + '</tr>' +
    '<tr>' + kv('المؤهل في القرآن', d.quran) + kv('المؤهل العلمي', d.edu) + '<td class="k">تاريخ التقييم</td><td class="v">' + esc(idDayName(rec)) + ' ' + idHDate(rec) + '</td></tr></table>';
  let body = '';
  ME_ITEMS.forEach((it, i) => {
    let g = '';
    if (i === 0 || ME_ITEMS[i - 1][0] !== it[0]) { let n = 1; while (ME_ITEMS[i + n] && ME_ITEMS[i + n][0] === it[0]) n++; g = '<td class="g" rowspan="' + n + '">' + esc(it[0]) + '</td>'; }
    const v = meNum(sc[i]);
    body += '<tr>' + g + '<td class="t">' + esc(it[1]) + '</td><td>' + idDigits(it[2]) + '</td><td class="s">' + (v == null ? '' : idDigits(v)) + '</td><td class="n">' + idNl(nt[i] || '') + '</td></tr>';
  });
  h += '<table class="me" style="margin-top:8px;table-layout:fixed"><colgroup><col style="width:86px"><col><col style="width:58px"><col style="width:58px"><col style="width:150px"></colgroup>' +
    '<tr><th colspan="2">البيان</th><th>الدرجة<br>المستحقة</th><th>الدرجة<br>المكتسبة</th><th>ملاحظات</th></tr>' + body +
    '<tr class="sum"><td colspan="2">المجموع</td><td>' + idDigits(ME_MAX) + '</td><td>' + (sc.some(x => meNum(x) != null) ? idDigits(meTotal(sc)) : '') + '</td><td></td></tr></table>' +
    '<div class="pt-box idc-avoid"><b>توصيات المشرفة</b><div>' + esc(d.recs || '') + '</div></div>' + ptFoot(rec, sigs);
  return ['<div class="im-page">' + ptHead(lhUrl) + '<div class="pt-in">' + h + '</div></div>'];
}
function hlPages(rec, sigs, lhUrl) {
  const d = rec.data || {}, tot = hlTotals(d), sem = String(rec.sem || '');
  const m = x => '<span class="idc-m">' + x + '</span>';
  const head = '<div class="idc-title">حصر القاعات في المراكز</div>' +
    '<div class="idc-meta" style="justify-content:center;gap:30px"><span>اسم المركز: ' + m(esc(rec.center || '')) + '</span><span>للفصل الدراسي: ' + idBox(sem === 'الأول') + 'الأول &nbsp; ' + idBox(sem === 'الثاني') + 'الثاني &nbsp; ' + idBox(sem === 'الثالث') + 'الثالث</span><span>لعام: ' + m(rec.year ? idDigits(rec.year) + 'هـ' : '') + '</span></div>' +
    '<table><tr><td class="k">اسم المركز</td><td class="v">' + esc(rec.center || '') + '</td><td class="k">رقم المركز وفق تاريخ الافتتاح</td><td class="v">' + esc(idDigits(d.no || '')) + '</td></tr>' +
    '<tr><td class="k">عدد الأدوار</td><td class="v">' + idDigits(d.floorsCount || tot.floors || '') + '</td><td class="k">عدد القاعات الدراسية</td><td class="v">' + idDigits(tot.halls) + '</td></tr>' +
    '<tr><td class="k">عدد المرافق العامة</td><td class="v">' + esc(idDigits(d.facilities || '')) + '</td><td class="k">إجمالي الطاقة الاستيعابية</td><td class="v">' + idDigits(tot.cap) + '</td></tr></table>';
  // كل دور: صفوف (نوعها، الحالة، عدد الكراسي، الطاقة الاستيعابية) وأعمدة القاعات (١٢ قاعة في الجدول الواحد)
  const blocks = [];
  (d.floors || []).forEach(f => {
    const H = f.halls || [];
    if (!H.length) return;
    for (let i = 0; i < H.length; i += 12) blocks.push({ name: f.name, start: i, halls: H.slice(i, i + 12) });
  });
  const tbl = b => {
    const cols = Array.from({ length: 12 }, (_, i) => b.halls[i] || null);
    const row = (lbl, fn) => '<tr><td class="lb">' + lbl + '</td>' + cols.map(fn).join('') + '</tr>';
    return '<table class="hl" style="margin-top:8px;table-layout:fixed"><colgroup><col style="width:34px"><col style="width:104px">' + '<col>'.repeat(12) + '</colgroup><tr><td class="fl" rowspan="5">' + esc(b.name) + '</td><td class="lb">رقم القاعة</td>' +
      cols.map((h, i) => '<th>' + idDigits(h && h.no ? h.no : b.start + i + 1) + '</th>').join('') + '</tr>' +
      row('نوعها', h => '<td class="v">' + (h ? esc(h.type || '') : '') + '</td>') +
      row('الحالة', h => '<td class="v">' + (h ? esc(h.status || '') : '') + '</td>') +
      row('عدد الكراسي', h => '<td class="v">' + (h ? idDigits(h.chairs || '') : '') + '</td>') +
      row('الطاقة الاستيعابية', h => '<td class="v' + (h && hlNum(h.cap) > HL_MAX_CAP ? ' over' : '') + '">' + (h ? idDigits(h.cap || '') : '') + '</td>') + '</table>';
  };
  const foot = (d.notes ? '<div class="pt-box"><b>ملاحظات</b><div>' + esc(d.notes) + '</div></div>' : '') + ptFoot(rec, sigs, 'اسم المشرفة الإدارية') +
    '<div class="pt-note">( ك ) تحفيظ كبار، ( ص ) تحفيظ صغار<br>ملاحظة: الطاقة الاستيعابية في القاعات الدراسية لا تزيد عن (' + idDigits(HL_MAX_CAP) + ')</div>';
  const pages = [];
  let cur = head, n = 0;
  if (!blocks.length) cur += '<p style="text-align:center;margin:30px 0;color:#888">لم تُسجَّل قاعات</p>';
  blocks.forEach(b => {
    if (n >= 4) { pages.push(cur); cur = ''; n = 0; }
    cur += tbl(b); n++;
  });
  if (n >= 4) { pages.push(cur); cur = ''; }
  pages.push(cur + foot);
  return pages.map(p => '<div class="im-page">' + ptHead(lhUrl) + '<div class="pt-in">' + p + '</div></div>');
}
const ptPages = (rec, sigs, lhUrl) => rec.kind === 'halls' ? hlPages(rec, sigs, lhUrl) : mePages(rec, sigs, lhUrl);
function ptDocHtml(rec, sigs, lhUrl) { return '<style>' + PT_CSS + '</style><div class="idoc ptdoc" style="width:794px">' + ptPages(rec, sigs, lhUrl).join('') + '</div>'; }
async function ptPdfBlob(rec, sigs) {
  if (!sigs) sigs = await idLoadSigs(rec);
  return idPagesPdf(ptPages(rec, sigs), PT_CSS, true);
}
