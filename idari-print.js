/* ===== نماذج وحدة الإشراف الإداري: الطباعة وتحميل PDF بالكليشة الحمراء (letterhead.jpg) ===== */
// يُستخدم في صفحة المشرفات (idari.html) وفي صفحة إدارة الوحدات (units.html)
const ID_LETTERHEAD = 'letterhead.jpg';
const ID_UNIT = 'وحدة الإشراف الإداري';
const ID_PDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
const ID_KINDS = {
  visit: 'تقرير زيارة المشرفة',
  program: 'برنامج مشرفة مقيمة',
  suggest: 'الاقتراحات والصعوبات'
};
const ID_PROGRAM_ROWS = [['day', 'اليوم / التاريخ'], ['center', 'المركز'], ['content', 'المحتوى'], ['plan', 'التخطيط'],
  ['method', 'طريقة التنفيذ'], ['tools', 'الوسائل'], ['results', 'النتائج'], ['ratio', 'نسبة الاستفادة']];

// جلب التواقيع (تُستبدل في صفحة إدارة الوحدات بدخول المديرة)
let idSigFetch = items => api('getSigs', { items }).then(o => o.data || {});

const idDigits = s => String(s == null ? '' : s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
function idHijri(date) {
  if (!date) return '';
  const p = String(date).split('-');
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' })
      .format(new Date(+p[0], +p[1] - 1, +p[2])).replace(/‏/g, '').replace(/\s*هـ$/, '') + 'هـ';
  } catch (e) { return date; }
}
const idNl = s => esc(s).replace(/\n/g, '<br>');
const idBox = on => '<span class="idc-box">' + (on ? '✓' : '') + '</span>';
const idSig = d => d ? '<img class="idc-sig" src="' + d + '" alt="">' : '';

const ID_CSS = `
.idoc{width:1090px;background:#fff;color:#222;font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;font-size:15px;line-height:1.55;padding:0 4px}
.idoc *{box-sizing:border-box}
.idoc .idc-lh{width:100%;display:block}
.idoc .idc-unit{display:flex;justify-content:flex-end;margin:6px 0 0}
.idoc .idc-unit span{background:#7a1f2b;color:#fff;font-weight:700;border-radius:0 20px 20px 0;padding:5px 26px;font-size:15px}
.idoc .idc-title{text-align:center;font-size:22px;font-weight:800;color:#7a1f2b;margin:0 0 8px}
.idoc .idc-title.u{text-decoration:underline;text-underline-offset:6px}
.idoc .idc-line{display:flex;flex-wrap:wrap;gap:6px 26px;align-items:center;margin:0 6px 10px;font-size:15.5px}
.idoc .idc-line b{color:#7a1f2b}
.idoc .idc-v{font-weight:700;color:#7a1f2b;border-bottom:1px dotted #999;padding:0 6px;min-width:90px;display:inline-block}
.idoc .idc-box{display:inline-flex;width:15px;height:15px;border:1.3px solid #444;align-items:center;justify-content:center;font-size:12px;margin-left:4px;vertical-align:middle;color:#7a1f2b;font-weight:800}
.idoc table{width:100%;border-collapse:collapse;font-size:14.5px}
.idoc th,.idoc td{border:1px solid #555;padding:6px 8px;vertical-align:middle}
.idoc th{background:#f3e3e6;color:#5c1620;font-weight:800;text-align:center}
.idoc td{text-align:right}
.idoc td.c{text-align:center}
.idoc tr.idc-r td{height:30px;padding:4px 8px}
.idoc .idc-lbl{color:#7a1f2b;font-weight:800;text-align:center;background:#fcf6f7;width:190px}
.idoc .idc-sig{max-height:54px;max-width:170px;vertical-align:middle}
.idoc td .idc-sig{max-height:110px;max-width:100%}
.idoc .idc-note{font-size:13.5px;margin:5px 6px 0}
.idoc .idc-foot{display:flex;justify-content:space-between;gap:30px;margin:10px 6px 0;font-size:15.5px}
.idoc .idc-foot>div{display:flex;flex-direction:column;gap:6px;min-width:280px}
.idoc .idc-foot>.idc-row{flex-direction:row;min-width:0}
.idoc .idc-foot b{color:#7a1f2b}
.idoc .idc-row{display:flex;align-items:center;gap:8px;min-height:30px}
.idoc .idc-avoid{page-break-inside:avoid;break-inside:avoid}
`;

/* ---------- محتوى النموذج (نفس الشكل للطباعة والـ PDF) ---------- */
function idDocHtml(rec, sigs, lhUrl) {
  sigs = sigs || {};
  const d = rec.data || {};
  const per = String(rec.period || '');
  const head = '<img class="idc-lh" src="' + esc(lhUrl || ID_LETTERHEAD) + '" alt="">' +
    '<div class="idc-unit"><span>' + ID_UNIT + '</span></div>';
  const v = x => '<span class="idc-v">' + (x ? esc(x) : '&nbsp;') + '</span>';
  const vd = x => '<span class="idc-v">' + (x ? esc(idDigits(x)) : '&nbsp;') + '</span>';
  const periodBoxes = idBox(per.indexOf('صباحي') > -1) + 'صباحي &nbsp;&nbsp; ' + idBox(per.indexOf('مسائي') > -1) + 'مسائي';
  let h = '';

  if (rec.kind === 'visit') {
    const rows = (d.rows || []).filter(r => r && (r.about || r.note || r.rec));
    const n = Math.max(rows.length, 6);
    let body = '';
    for (let i = 0; i < n; i++) {
      const r = rows[i] || {};
      body += '<tr class="idc-r"><td class="c">' + (rows[i] ? idDigits(i + 1) : '') + '</td><td>' + idNl(r.about) + '</td><td>' + idNl(r.note) + '</td><td>' + idNl(r.rec) + '</td>' +
        (i === 0 ? '<td class="c" rowspan="' + n + '">' + idSig(sigs.ack) + '</td>' : '') + '</tr>';
    }
    h = head + '<div class="idc-title">تقرير زيارة المشرفة *</div>' +
      '<div class="idc-line"><span><b>بمركز:</b> ' + v(rec.center) + '</span><span><b>لعام:</b> ' + vd(rec.year) + '</span><span><b>الفصل الدراسي:</b> ' + v(rec.sem) + '</span><span>' + periodBoxes + '</span></div>' +
      '<table><colgroup><col style="width:44px"><col style="width:23%"><col style="width:31%"><col style="width:26%"><col></colgroup>' +
      '<tr><td colspan="2"><b>اليوم:</b> ' + esc(rec.day || '') + '</td><td><b>التاريخ:</b> ' + esc(d.hijri || idHijri(rec.date)) + '</td><td><b>رقم الزيارة:</b> ' + esc(idDigits(rec.visitNo)) + '</td><td class="c"><b>نوع الزيارة:</b> ' + esc(d.vtype || 'إداري') + '</td></tr>' +
      '<tr><th>م</th><th>بشأن</th><th>الملاحظة</th><th>التوصية</th><th>توقيع بالعلم</th></tr>' + body + '</table>' +
      '<div class="idc-avoid"><div class="idc-note">* تحدد المشرفة (التعليمية / الإدارية) في بند الشأن كما هو موضح في ملف المشرفة.</div>' +
      '<div class="idc-note">يتم أرشفة التقرير في الدرايف مجلد الزيارات.</div>' +
      '<div class="idc-foot"><div class="idc-row"><b>اسم المديرة:</b> ' + v(rec.mgrName) + ' &nbsp; <b>التوقيع:</b> ' + (idSig(sigs.mgr) || v('')) + '</div>' +
      '<div class="idc-row"><b>اسم المشرفة:</b> ' + v(rec.supName) + ' &nbsp; <b>التوقيع:</b> ' + (idSig(sigs.sup) || v('')) + '</div></div></div>';

  } else if (rec.kind === 'program') {
    const val = k => k === 'day' ? [rec.day, d.hijri || idHijri(rec.date)].filter(Boolean).join(' — ') : k === 'center' ? rec.center : d[k];
    h = head + '<div class="idc-title u">تخطيط وتنفيذ ونتائج لبرنامج مشرفة مقيمة:</div>' +
      '<table><colgroup><col style="width:50px"><col style="width:200px"><col></colgroup>' +
      '<tr><th>م</th><th>البيان</th><th>المحتوى</th></tr>' +
      ID_PROGRAM_ROWS.map((r, i) => '<tr class="idc-r"><td class="c">' + idDigits(i + 1) + '</td><td class="idc-lbl">' + r[1] + '</td><td>' + idNl(val(r[0])) + '</td></tr>').join('') +
      '</table>' +
      (rec.supName || sigs.sup ? '<div class="idc-foot idc-avoid"><div></div><div><div class="idc-row"><b>اسم المشرفة:</b> ' + v(rec.supName) + '</div><div class="idc-row"><b>التوقيع:</b> ' + (idSig(sigs.sup) || v('')) + '</div></div></div>' : '');

  } else {
    const rows = (d.rows || []).filter(r => r && (r.sug || r.dif));
    const n = Math.max(rows.length, 6);
    let body = '';
    for (let i = 0; i < n; i++) { const r = rows[i] || {}; body += '<tr class="idc-r"><td>' + idNl(r.sug) + '</td><td>' + idNl(r.dif) + '</td></tr>'; }
    h = head + '<div class="idc-title">الاقتراحات والمرئيات – الصعوبات التي تواجه المشرفة الإدارية *</div>' +
      '<div class="idc-line"><span><b>الفصل الدراسي/</b> ' + v(rec.sem) + '</span><span><b>لعام</b> ' + vd(rec.year) + '</span><span><b>الفترة /</b> ' + periodBoxes + '</span></div>' +
      '<table><colgroup><col style="width:50%"><col style="width:50%"></colgroup><tr><th>الاقتراحات والمرئيات</th><th>الصعوبات التي تواجه المشرفة</th></tr>' + body + '</table>' +
      '<div class="idc-avoid"><div class="idc-foot" style="justify-content:space-between"><div class="idc-row"><b>اسم المشرفة:</b> ' + v(rec.supName) + '</div>' +
      '<div class="idc-row"><b>التوقيع:</b> ' + (idSig(sigs.sup) || v('')) + '</div><div class="idc-row"><b>التاريخ:</b> ' + esc(d.hijri || idHijri(rec.date)) + '</div></div>' +
      '<div class="idc-note">* تطالب المشرفة تسليمها آخر الفصل الدراسي.</div></div>';
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

const idFileName = rec => (ID_KINDS[rec.kind] + ' ' + (rec.center || rec.sem || '') + ' ' + (rec.date || '')).trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_');

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

/* ---------- تحميل PDF مباشرة ---------- */
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
async function idPdf(rec, btn, sigs) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  const box = document.createElement('div');
  try {
    if (!sigs) sigs = await idLoadSigs(rec);
    await idLoadPdfLib();
    box.style.cssText = 'position:fixed;top:0;left:-20000px;z-index:-1;background:#fff';
    box.innerHTML = '<style>' + ID_CSS + '</style>' + idDocHtml(rec, sigs);
    document.body.appendChild(box);
    await Promise.all([...box.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    await window.html2pdf().set({
      margin: [6, 6, 6, 6], filename: idFileName(rec) + '.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.idc-avoid'] }
    }).from(box.querySelector('.idoc')).save();
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر تحميل PDF', false); }
  finally { box.remove(); if (btn) setBtnBusy(btn, false); }
}

/* ---------- عرض داخل الصفحة (نافذة) ---------- */
async function idView(rec) {
  const m = document.getElementById('idModal'), b = document.getElementById('idModalBody');
  if (!m || !b) return;
  b.innerHTML = '<p class="empty">جارِ التحميل...</p>';
  m.classList.remove('hidden');
  let sigs = {};
  try { sigs = await idLoadSigs(rec); } catch (e) {}
  b.innerHTML = '<div class="ex-bar"><button class="btn light" id="idVPrint">طباعة</button><button class="btn light" id="idVPdf">تحميل PDF</button></div>' +
    '<style>' + ID_CSS + '</style><div class="id-scroll">' + idDocHtml(rec, sigs) + '</div>';
  document.getElementById('idVPrint').onclick = e => idPrint(rec, e.currentTarget, sigs);
  document.getElementById('idVPdf').onclick = e => idPdf(rec, e.currentTarget, sigs);
}
function idCloseModal() { const m = document.getElementById('idModal'); if (m) m.classList.add('hidden'); }
