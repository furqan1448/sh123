/* ===== وحدة تحفيظ الصغار: تقرير زيارة مشرفة تحفيظ صغار — العرض والطباعة وتحميل PDF والمشاركة =====
   الكليشة الحمراء (letterhead.jpg) أعلى التقرير، وجدول مثل تقرير الزيارة في نظام المقاصف: كل توصية في صف برقمها.
   يعتمد على الأدوات المشتركة في idari-print.js (التاريخ الهجري، أداة PDF، خط Tajawal) فيُحمَّل بعده. */
const SG_BG = 'letterhead.jpg';   // الكليشة الحمراء الموحّدة
const SG_UNIT = 'وحدة تحفيظ الصغار';
const SG_TITLE = 'تقرير زيارة مشرفة وحدة تحفيظ الصغار';
const SGS_TITLE = 'خلاصة التقارير التعليمية – متابعة المشرفة للمعلمة';
const sgTitleOf = rec => rec && rec.kind === 'stf' ? (STF_TYPES[(rec.data && rec.data.form) || rec.form] || 'نموذج موظفة') : rec && rec.kind === 'min' ? 'محضر اجتماع رقم ' + (rec.no || '') : rec && rec.kind === 'sum' ? SGS_TITLE : rec && rec.kind === 'eval' && typeof sgeFormOf === 'function' && sgeFormOf(rec) ? sgeFormOf(rec).title : SG_TITLE;
// استمارات التقييم صفحة طولية، وباقي النماذج عرضية
const sgPortrait = rec => !!(rec && (rec.kind === 'eval' || rec.kind === 'min' || rec.kind === 'stf'));
const sgAllCss = () => SG_CSS + STF_CSS + (typeof SGE_CSS === 'string' ? SGE_CSS : '') + (typeof MN_CSS === 'string' ? MN_CSS : '');

// جلب التواقيع (تُستبدل في صفحة إدارة الوحدات بدخول المديرة)
let sgSigFetch = items => api('getSigs', { items }).then(o => o.data || {});


// تنسيق جدول مثل تقرير الزيارة في نظام المقاصف (فئات idoc من idari-print.js) مع خط أكبر وأوضح
const SG_CSS = ID_CSS + `
.idoc.sg{font-size:17px}
.idoc.sg .idc-title{font-size:27px;margin:24px 0 18px}
.idoc.sg .sg-unit{text-align:center;color:#7a1f2b;font-weight:800;font-size:17px;margin:0 0 16px}
.idoc.sg .idc-meta,.idoc.sg .idc-meta *{font-size:18px}
.idoc.sg table{font-size:17.5px}
.idoc.sg th{font-size:18px;padding:9px 10px}
.idoc.sg .idc-info td{font-size:17.5px;padding:11px 10px}
.idoc.sg .idc-n{font-size:18px}
.idoc.sg td.sg-rec{text-align:right;padding:10px 16px;font-weight:600;line-height:1.7;height:46px}
.idoc.sg .idc-foot>div{font-size:18px;min-width:280px}
.idoc.sg .idc-sig{max-height:66px;max-width:210px}
.idoc.sg .sg-sub{text-align:center;font-weight:800;font-size:18px;line-height:1.9;margin:-8px 0 16px}
.idoc.sg td.sg-l{text-align:right;padding:9px 12px;font-weight:600;line-height:1.6;height:44px}
.idoc.sg .sg-sumfoot{display:flex;justify-content:flex-end;margin:26px 0 0}
.idoc.sg .sg-sumfoot>div{min-width:330px;font-weight:800;font-size:18px;line-height:2.2}
.idoc.sg .sg-sumfoot img{max-height:60px;max-width:200px;vertical-align:middle}
`;

const sgRecList = rec => String(rec.recs || '').split('\n').map(x => x.trim()).filter(Boolean);

/* ---------- محتوى التقرير (نفس الشكل للعرض والطباعة والـ PDF) ---------- */
function sgDocHtml(rec, sigs, lhUrl) {
  if (rec && rec.kind === 'sum') return sgsDocHtml(rec, sigs, lhUrl);
  if (rec && rec.kind === 'eval') return sgeDocHtml(rec, sigs, lhUrl);
  if (rec && rec.kind === 'min') return mnDocHtml(rec, sigs, lhUrl);
  if (rec && rec.kind === 'stf') return stfDocHtml(rec, sigs, lhUrl);
  sigs = sigs || {};
  const d = rec.data || {};
  const per = String(rec.period || '');
  const m = x => '<span class="idc-m">' + x + '</span>';   // القيم باللون العنابي
  const head = '<img class="idc-lh" src="' + esc(lhUrl || SG_BG) + '" width="2000" height="351" alt="">';
  const periodBoxes = '<span class="idc-per"><span>' + idBox(per.indexOf('صباحي') > -1) + 'صباحي</span><span>' + idBox(per.indexOf('مسائي') > -1) + 'مسائي</span></span>';
  const date = d.hd ? idHDate(rec) : '';
  const recs = sgRecList(rec);
  const n = Math.max(recs.length, 1);
  let body = '';
  for (let i = 0; i < n; i++) body += '<tr><td class="idc-n">' + idDigits(i + 1) + '</td><td class="sg-rec" colspan="4">' + idNl(recs[i] || '') + '</td></tr>';
  const sigCol = (lbl, name, sg) => '<div>' + lbl + (name ? '<br>' + m(esc(name)) : '') + idSig(sg) + '</div>';
  return '<div class="idoc sg">' + head + '<div class="idc-body">' +
    '<div class="idc-title">' + SG_TITLE + '</div>' +
    '<div class="idc-meta"><span><span>المركز: ' + m(esc(rec.center)) + '</span>' + periodBoxes + '</span><span>اسم المعلمة: ' + m(esc(rec.teacher)) + '</span></div>' +
    '<table><colgroup><col style="width:60px"><col style="width:17%"><col style="width:22%"><col style="width:14%"><col></colgroup>' +
    '<tr class="idc-info"><td colspan="2">اليوم: ' + m(esc(d.dayName || rec.day || '')) + '</td><td>التاريخ: ' + m(date) + '</td><td>رقم الزيارة: ' + m(esc(idDigits(rec.visitNo))) + '</td><td>موضوع الدرس: ' + m(esc(rec.lesson)) + '</td></tr>' +
    '<tr><th>م</th><th colspan="4">التوصيات العامة</th></tr>' + body + '</table>' +
    '<div class="idc-foot idc-avoid">' + sigCol('توقيع المعلمة بالاطلاع', rec.teacher, sigs.tch) + sigCol('المشرفة', rec.supName, sigs.sup) + '</div>' +
  '</div></div>';
}

/* ---------- خلاصة التقارير التعليمية – متابعة المشرفة للمعلمة ---------- */
const sgHTxt = o => o && o.y ? '<span class="idc-date"><bdi>' + idDigits(o.d) + '</bdi> / <bdi>' + idDigits(o.m) + '</bdi> / <bdi>' + idDigits(o.y) + 'هـ</bdi></span>' : '';
function sgsDocHtml(rec, sigs, lhUrl) {
  sigs = sigs || {};
  const d = rec.data || {};
  const per = String(rec.period || '');
  const m = x => '<span class="idc-m">' + x + '</span>';
  const head = '<img class="idc-lh" src="' + esc(lhUrl || SG_BG) + '" width="2000" height="351" alt="">';
  const periodBoxes = '<span class="idc-per"><span>' + idBox(per.indexOf('صباحي') > -1) + 'صباحي</span><span>' + idBox(per.indexOf('مسائي') > -1) + 'مسائي</span></span>';
  const tv = !!rec.tview;   // نسخة المعلمة: سطرها فقط ودون عمود الدرجة
  const rows = (d.rows || []).filter(r => r && (r.center || r.teacher || r.notes || r.att || r.score));
  const n = Math.max(rows.length, 1);
  let body = '';
  for (let i = 0; i < n; i++) {
    const r = rows[i] || {};
    body += '<tr><td class="idc-n">' + idDigits(i + 1) + '</td><td class="sg-l">' + esc(r.center || '') + '</td><td class="sg-l">' + esc(r.teacher || '') +
      '</td><td class="sg-l">' + idNl(r.notes || '') + '</td><td>' + esc(r.att || '') + '</td>' + (tv ? '' : '<td>' + m(esc(idDigits(r.score || ''))) + '</td>') + '</tr>';
  }
  const sub = [rec.sem ? 'الفصل الدراسي ' + esc(rec.sem) + (rec.year ? ' لعام ' + idDigits(rec.year) + 'هـ' : '') : (rec.year ? 'لعام ' + idDigits(rec.year) + 'هـ' : ''),
    (d.from && d.from.y) || (d.to && d.to.y) ? 'خلال الفترة من ' + m(sgHTxt(d.from)) + ' إلى ' + m(sgHTxt(d.to)) : ''].filter(Boolean).join('<br>');
  const date = d.hy ? sgHTxt({ d: d.hd, m: d.hm, y: d.hy }) : '';
  return '<div class="idoc sg">' + head + '<div class="idc-body">' +
    '<div class="idc-title">' + SGS_TITLE + '</div>' + (sub ? '<div class="sg-sub">' + sub + '</div>' : '') +
    '<div class="idc-meta"><span>رقم الزيارة: ' + m(esc(idDigits(rec.visitNo)) || '—') + '</span><span>الفترة: ' + periodBoxes + '</span></div>' +
    '<table><colgroup><col style="width:56px"><col style="width:17%"><col style="width:19%"><col><col style="width:14%">' + (tv ? '' : '<col style="width:12%">') + '</colgroup>' +
    '<tr><th>م</th><th>اسم المركز</th><th>اسم المعلمة</th><th>الملاحظات التي تم رصدها</th><th>حضور مادة أم قرآن أم كليهما</th>' + (tv ? '' : '<th>مستوى أداء المعلمة بالدرجة</th>') + '</tr>' +
    body + '</table>' +
    '<div class="sg-sumfoot idc-avoid"><div>اسم المشرفة: ' + m(esc(rec.supName || '')) + '<br>التاريخ: ' + m(date) + '<br>التوقيع: ' + (sigs.sup ? '<img src="' + sigs.sup + '" alt="">' : '') + '</div></div>' +
  '</div></div>';
}

// تواقيع التقرير المحفوظ (من ورقة «التواقيع»)
async function sgLoadSigs(rec) {
  const has = (rec.data && rec.data.sigs) || {};
  const items = ['sup', 'tch', 'mgr', 'emp'].filter(k => has[k]).map(k => ({ id: rec.id + '|' + k }));
  if (!items.length) return {};
  const map = await sgSigFetch(items);
  const out = {};
  ['sup', 'tch', 'mgr', 'emp'].forEach(k => { if (map[rec.id + '|' + k]) out[k] = map[rec.id + '|' + k]; });
  return out;
}

const sgFileName = rec => {
  const d = rec.data || {};
  const dt = d.hd ? d.hd + '-' + d.hm + '-' + d.hy : (rec.date || '');
  return (sgTitleOf(rec).replace(' – متابعة المشرفة للمعلمة', '') + ' ' + (rec.kind === 'sum' ? (rec.sem ? 'الفصل ' + rec.sem : '') : (rec.teacher || '')) + ' ' + dt).trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_');
};

/* ---------- طباعة (ومنها «حفظ PDF» من نافذة الطباعة): A4 عرضية مثل تقرير المقاصف ---------- */
async function sgPrint(rec, btn, sigs) {
  const w = window.open('', '_blank');
  if (!w) return toast('اسمحي بالنوافذ المنبثقة لهذا الموقع ثم أعيدي المحاولة', false);
  w.document.write('<p style="font-family:Tahoma;text-align:center;margin-top:40px">جارِ التجهيز...</p>');
  if (btn) setBtnBusy(btn, true, '...');
  try {
    if (!sigs) sigs = await sgLoadSigs(rec);
    const lh = new URL(SG_BG, location.href).href;
    w.document.open();
    w.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>' + esc(sgFileName(rec)) + '</title>' +
      '<link rel="stylesheet" href="' + ID_FONT_CSS + '">' +
      '<style>@page{size:A4 ' + (sgPortrait(rec) ? 'portrait' : 'landscape') + ';margin:7mm}html,body{margin:0;background:#fff}' + sgAllCss() +
      '.idoc{width:100%}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>' +
      sgDocHtml(rec, sigs, lh) + '</body></html>');
    w.document.close();
    const go = () => setTimeout(() => { w.focus(); w.print(); }, 250);
    const img = w.document.querySelector('.idc-lh');
    if (img && !img.complete) { img.onload = go; img.onerror = go; } else go();
  } catch (e) { w.close(); toast(e.message || 'تعذّرت الطباعة', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}

/* ---------- PDF: نفس طريقة تقرير المقاصف (صفحة A4 عرضية والكليشة ملتصقة بأعلى الصفحة) ---------- */
async function sgPdfBlob(rec, sigs) {
  if (!sigs) sigs = await sgLoadSigs(rec);
  await idLoadPdfLib();
  const box = document.createElement('div');
  const P = sgPortrait(rec), W = P ? 794 : 1123;
  box.style.cssText = 'position:absolute;top:0;left:0;width:' + W + 'px;z-index:-1;background:#fff;direction:rtl';
  box.innerHTML = '<style>' + sgAllCss() + '.idoc{width:' + W + 'px;padding:0}</style>' + sgDocHtml(rec, sigs);
  document.body.appendChild(box);
  try {
    await Promise.all([...box.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    const opt = { margin: 0, image: { type: 'jpeg', quality: 0.97 }, jsPDF: { unit: 'mm', format: P ? [210, 297] : [297, 210], orientation: P ? 'portrait' : 'landscape' } };
    try {
      await idLoadImgLib();
      const fontCss = await idFontEmbedCss();
      const io = { pixelRatio: 2, backgroundColor: '#ffffff', width: W, style: { margin: '0' } };
      if (fontCss) io.fontEmbedCSS = fontCss; else io.skipFonts = true;
      const cv = await window.htmlToImage.toCanvas(box.querySelector('.idoc'), io);
      return await window.html2pdf().set(opt).from(P ? sgFitPortrait(cv) : idFitPage(cv), 'canvas').outputPdf('blob');
    } catch (e) { console.warn('html-to-image failed, falling back to html2canvas', e); }
    return await window.html2pdf().set(Object.assign(opt, {
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: W, onclone: idFixBidi },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.idc-avoid'] }
    })).from(box.querySelector('.idoc'))
      .toContainer().get('container').then(c => {
        if (c.parentElement) c.parentElement.style.direction = 'ltr';
        Object.assign(c.style, { position: 'absolute', top: '0', left: '0', right: 'auto', margin: '0', width: W + 'px', direction: 'rtl' });
      }).toCanvas().toPdf().outputPdf('blob');
  } finally { box.remove(); }
}
// صفحة A4 طولية: إن زادت الاستمارة قليلاً عن الصفحة نصغّرها لتكفي صفحة واحدة
function sgFitPortrait(cv) {
  const maxH = cv.width * 297 / 210;
  if (cv.height <= maxH || cv.height > maxH * 1.6) return cv;
  const out = document.createElement('canvas');
  out.width = Math.round(cv.height * 210 / 297); out.height = cv.height;
  const g = out.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, out.width, out.height);
  g.drawImage(cv, Math.round((out.width - cv.width) / 2), 0);
  return out;
}
async function sgPdf(rec, btn, sigs) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try { idSaveBlob(await sgPdfBlob(rec, sigs), sgFileName(rec) + '.pdf'); toast('تم التحميل'); }
  catch (e) { toast(e.message || 'تعذّر تحميل PDF', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}

/* ---------- مشاركة (واتساب وغيره): تختارين جهة الإرسال بنفسك ---------- */
async function sgShare(rec, btn, sigs) {
  if (btn && btn._file) { const f = btn._file; btn._file = null; btn.innerHTML = btn.dataset.t0 || 'مشاركة'; return sgShareFile(f); }
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  let file;
  try { file = new File([await sgPdfBlob(rec, sigs)], sgFileName(rec) + '.pdf', { type: 'application/pdf' }); }
  catch (e) { toast(e.message || 'تعذّر تجهيز الملف', false); if (btn) setBtnBusy(btn, false); return; }
  if (btn) setBtnBusy(btn, false);
  try { await sgShareFile(file, true); }
  catch (e) {
    if (btn) { btn.dataset.t0 = btn.innerHTML; btn._file = file; btn.innerHTML = 'اضغطي للإرسال'; }
    toast('الملف جاهز، اضغطي «اضغطي للإرسال»');
  }
}
async function sgShareFile(file, rethrow) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: SG_TITLE }); return; }
    catch (e) {
      if (e && e.name === 'AbortError') return;
      if (rethrow && e && e.name === 'NotAllowedError') throw e;
    }
  }
  idSaveBlob(file, file.name);
  toast('المشاركة غير مدعومة في هذا المتصفح، تم تحميل الملف لإرساله يدوياً');
}

/* ---------- عرض داخل الصفحة (نافذة) ---------- */
async function sgView(rec) {
  const m = document.getElementById('sgModal'), b = document.getElementById('sgModalBody');
  if (!m || !b) return;
  b.innerHTML = '<p class="empty">جارِ التحميل...</p>';
  m.classList.remove('hidden');
  let sigs = {};
  try { sigs = await sgLoadSigs(rec); } catch (e) {}
  b.innerHTML = '<div class="ex-bar"><button class="btn light" id="sgVPrint">طباعة</button><button class="btn light" id="sgVPdf">تحميل PDF</button><button class="btn light" id="sgVShare">مشاركة (واتساب)</button></div>' +
    '<style>' + sgAllCss() + '</style><div class="id-scroll sg-fit">' + sgDocHtml(rec, sigs) + '</div>';
  document.getElementById('sgVPrint').onclick = e => sgPrint(rec, e.currentTarget, sigs);
  document.getElementById('sgVPdf').onclick = e => sgPdf(rec, e.currentTarget, sigs);
  document.getElementById('sgVShare').onclick = e => sgShare(rec, e.currentTarget, sigs);
  sgFitBox(b.querySelector('.sg-fit'));
}
// تصغير التقرير ليناسب عرض الشاشة (الجوال) دون تمرير أفقي
function sgFitBox(box) {
  if (!box) return;
  const doc = box.querySelector('.idoc'); if (!doc) return;
  doc.style.transform = ''; box.style.height = '';
  const w = doc.offsetWidth, k = Math.min(1, (box.clientWidth - 4) / w);
  if (k >= 1) return;
  doc.style.transform = 'scale(' + k + ')'; doc.style.transformOrigin = 'top right';
  box.style.height = Math.ceil(doc.offsetHeight * k) + 8 + 'px'; box.style.overflow = 'hidden';
  // إعادة الحساب بعد تحميل الصور (الكليشة والتواقيع) حتى لا يُقصّ أسفل التقرير
  box.querySelectorAll('img').forEach(im => { if (!im.complete && !im._fit) { im._fit = 1; im.addEventListener('load', () => sgFitBox(box)); } });
}
window.addEventListener('resize', () => document.querySelectorAll('.sg-fit').forEach(sgFitBox));
function sgCloseModal() { const m = document.getElementById('sgModal'); if (m) m.classList.add('hidden'); }


/* ===================== إجراءات الموظفات (تحفيظ الصغار): إنذار شفوي، إنذار خطي، تعهد، ملاحظات =====================
   صفحة A4 طولية بالكليشة الحمراء، بنفس نص النماذج الورقية وبدون نقاط التعبئة. */
const STF_TYPES = { shafawi: 'إنذار شفوي لموظفة', khatti: 'إنذار خطي لموظفة', taahud: 'تعهد موظفة مقصرة', notes: 'ملاحظات على موظفة' };
const STF_ORDER = ['shafawi', 'khatti', 'taahud', 'notes'];
const STF_ACTIONS = { shafawi: 'تنبيه شفوي', khatti: 'تنبيه خطي', taahud: 'تعهد' };
const STF_CSS = `
.idoc.stf{width:794px;font-size:18px}
.idoc.stf .idc-body{padding:0 44px 20px}
.idoc.stf .idc-title{font-size:27px;margin:22px 0 18px}
.idoc.stf .stf-meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-weight:700;margin:0 0 18px}
.idoc.stf p{margin:0 0 8px;line-height:1.95;font-weight:600}
.idoc.stf .stf-h{font-weight:800;margin:14px 0 6px;line-height:1.9}
.idoc.stf .stf-h small{font-size:12px;font-weight:600;color:#555}
.idoc.stf .stf-ol{border:1.5px solid #c9b8bc;border-radius:10px;padding:6px 14px;margin:0 0 10px}
.idoc.stf .stf-li{display:flex;gap:8px;line-height:1.85;font-weight:600;padding:4px 0;border-bottom:1px solid #eee3e5}
.idoc.stf .stf-li:last-child{border-bottom:0}
.idoc.stf .stf-li b{color:#7a1f2b;min-width:24px;flex:none}
.idoc.stf .stf-close{text-align:center;font-weight:800;margin:18px 0 8px}
.idoc.stf .stf-sigs{display:flex;justify-content:space-between;gap:22px;margin-top:22px}
.idoc.stf .stf-sigs>div{flex:1;line-height:2.1;font-weight:700}
.idoc.stf .stf-sigs .stf-sh{color:#7a1f2b;font-weight:800;font-size:19px}
.idoc.stf .stf-sigs img{max-height:60px;max-width:170px;vertical-align:middle}
.idoc.stf .stf-acts{display:flex;justify-content:center;gap:46px;font-weight:800;margin:4px 0 14px}
.idoc.stf .stf-sub{text-align:center;color:#7a1f2b;font-weight:800;font-size:20px;text-decoration:underline;text-underline-offset:6px;margin:10px 0 10px}
.idoc.stf .stf-cut{border-top:2px dashed #7a1f2b;margin:22px 0 16px}
.idoc.stf .stf-r3{display:grid;grid-template-columns:1.8fr 1.2fr 1fr;gap:14px}
.idoc.stf .stf-row{display:flex;justify-content:space-between;gap:12px;font-weight:700;margin:0 0 6px}
`;
function stfDocHtml(rec, sigs, lhUrl) {
  sigs = sigs || {};
  const d = rec.data || {}, f = d.form || rec.form;
  const m = x => '<span class="idc-m">' + x + '</span>';
  const head = '<img class="idc-lh" src="' + esc(lhUrl || SG_BG) + '" width="2000" height="351" alt="">';
  const hd = o => o && o.y ? '<span class="idc-date"><bdi>' + idDigits(o.d) + '</bdi> / <bdi>' + idDigits(o.m) + '</bdi> / <bdi>' + idDigits(o.y) + 'هـ</bdi></span>' : '';
  const date = hd({ d: d.hd, m: d.hm, y: d.hy });
  const ol = L => '<div class="stf-ol">' + ((L && L.length ? L : [''])).map((x, i) => '<div class="stf-li"><b>' + idDigits(i + 1) + '-</b><span>' + esc(x) + '</span></div>').join('') + '</div>';
  const name = esc(rec.teacher || ''), mgr = esc(rec.mgrName || '');
  const sigImg = k => sigs[k] ? '<img src="' + sigs[k] + '" alt="">' : '';
  const meta = '<div class="stf-meta"><span>اسم المركز: ' + m(esc(rec.center || '')) + '</span><span>اليوم: ' + m(esc(d.dayName || '')) + '</span><span>التاريخ: ' + m(date) +
    '</span><span>الفصل الدراسي: ' + m(esc(rec.sem || '')) + '</span></div>';
  const prev = (o, lead) => '<p>' + lead + ' يوم ' + m(esc((o && o.day) || '')) + ' بتاريخ ' + m(hd(o)) + '</p>';
  const sup = esc(rec.supName || '');
  const foot = '<div class="stf-sigs idc-avoid"><div>اسم الموظفة: ' + m(name) + '<br>التاريخ: ' + m(date) + '<br>التوقيع: ' + sigImg('emp') + '</div>' +
    '<div><span class="stf-sh">مديرة المركز</span><br>الاسم: ' + m(mgr) + '<br>التاريخ: ' + m(date) + '<br>التوقيع: ' + sigImg('mgr') + '</div>' +
    '<div><span class="stf-sh">المشرفة</span><br>الاسم: ' + m(sup) + '<br>التوقيع: ' + sigImg('sup') + '</div></div>';
  let body = '';
  if (f === 'shafawi' || f === 'khatti') {
    body = meta +
      '<div class="stf-h">' + (f === 'khatti' ? 'نظراً لتكرار' : 'نظراً لرصد') + ' الملاحظات التالية على الموظفة <small>(الاسم وفق الهوية)</small> / ' + m(name) + ' :</div>' + ol(d.obs) +
      (f === 'khatti' ? prev(d.oral, 'والتي تم إنذارها بشأنها شفوياً') : '') +
      '<div class="stf-h">فإنه قد تم إنذارها ' + (f === 'khatti' ? 'خطياً' : 'شفوياً') + ' وتوجيهها إلى:</div>' + ol(d.req) +
      '<div class="stf-close">وضرورة عدم تكرار ذلك، وإلا سيُتّخذ بحقها الإجراء المناسب.</div>' + foot;
  } else if (f === 'taahud') {
    body = meta +
      '<div class="stf-h">أتعهد أنا الموقّعة أدناه على عدم تكرار المخالفات التالية:</div>' + ol(d.obs) +
      prev(d.oral, 'والتي تم إنذاري بشأنها شفوياً') + prev(d.written, 'وخطياً') +
      '<p>وفي حال تكرار المخالفة وعدم التزامي بعدم تكرارها، فإنه يحق لإدارة المركز الرفع بالأمر إلى الجهة الأعلى اختصاصاً، وعلى هذا أتعهد...</p>' + foot;
  } else {
    body = '<div class="stf-row"><span>اسم المركز: ' + m(esc(rec.center || '')) + '</span><span>المسمى الوظيفي: ' + m(esc(d.job || '')) + '</span><span>عدد سنوات الخبرة: ' + m(esc(idDigits(d.years || ''))) + '</span></div>' +
      '<div class="stf-sub">نوع الإجراء المتخذ</div>' +
      '<div class="stf-acts">' + ['shafawi', 'khatti', 'taahud'].map(k => '<span>' + idBox(d.action === k) + STF_ACTIONS[k] + '</span>').join('') + '</div>' +
      '<p>المكرمة الأخت / ' + m(name) + ' &nbsp; وفقها الله</p><p style="text-align:center">السلام عليكم ورحمة الله وبركاته... وبعد:</p>' +
      '<div class="stf-h">رُصدت حولكِ الملاحظات التالية:</div>' + ol(d.obs) +
      '<div class="stf-h">وعليه مطلوب منكِ التالي:</div>' + ol(d.req) +
      '<div class="stf-sigs stf-r3 idc-avoid" style="margin-top:12px"><div>مديرة المركز / ' + m(mgr) + '</div><div>التاريخ: ' + m(date) + '</div><div>التوقيع: ' + sigImg('mgr') + '</div></div>' +
      '<div class="stf-sigs stf-r3 idc-avoid" style="margin-top:4px"><div>المشرفة / ' + m(sup) + '</div><div></div><div>التوقيع: ' + sigImg('sup') + '</div></div>' +
      '<div class="stf-cut"></div>' +
      '<div class="idc-avoid"><p>المكرمة مديرة المركز / ' + m(mgr) + ' &nbsp; سلمها الله</p><p style="text-align:center">السلام عليكم ورحمة الله وبركاته... وبعد:</p>' +
      '<p>لقد اطّلعتُ على الملاحظات المذكورة، وبإذن الله لن تتكرر، وإذا تكرر ذلك مني فللجمعية أن تتخذ ما تراه مناسباً في حقي، وعلى هذا أوقّع.. والله المستعان.</p>' +
      '<div class="stf-sigs stf-r3" style="margin-top:8px"><div>اسم الموظفة / ' + m(name) + '</div><div>التاريخ: ' + m(date) + '</div><div>التوقيع: ' + sigImg('emp') + '</div></div></div>';
  }
  return '<div class="idoc sg stf">' + head + '<div class="idc-body"><div class="idc-title">' + esc(STF_TYPES[f] || 'نموذج') + '</div>' + body + '</div></div>';
}
