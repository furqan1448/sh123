/* ===== وحدة تحفيظ الصغار: تقرير زيارة مشرفة تحفيظ صغار — العرض والطباعة وتحميل PDF والمشاركة =====
   الكليشة الحمراء (letterhead.jpg) أعلى التقرير، وجدول مثل تقرير الزيارة في نظام المقاصف: كل توصية في صف برقمها.
   يعتمد على الأدوات المشتركة في idari-print.js (التاريخ الهجري، أداة PDF، خط Tajawal) فيُحمَّل بعده. */
const SG_BG = 'letterhead.jpg';   // الكليشة الحمراء الموحّدة
const SG_UNIT = 'وحدة تحفيظ الصغار';
const SG_TITLE = 'تقرير زيارة مشرفة وحدة تحفيظ الصغار';
const SGS_TITLE = 'خلاصة التقارير التعليمية – متابعة المشرفة للمعلمة';
const sgTitleOf = rec => rec && rec.kind === 'sum' ? SGS_TITLE : SG_TITLE;

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
  const rows = (d.rows || []).filter(r => r && (r.center || r.teacher || r.notes || r.att || r.score));
  const n = Math.max(rows.length, 1);
  let body = '';
  for (let i = 0; i < n; i++) {
    const r = rows[i] || {};
    body += '<tr><td class="idc-n">' + idDigits(i + 1) + '</td><td class="sg-l">' + esc(r.center || '') + '</td><td class="sg-l">' + esc(r.teacher || '') +
      '</td><td class="sg-l">' + idNl(r.notes || '') + '</td><td>' + esc(r.att || '') + '</td><td>' + m(esc(idDigits(r.score || ''))) + '</td></tr>';
  }
  const sub = [rec.sem ? 'الفصل الدراسي ' + esc(rec.sem) + (rec.year ? ' لعام ' + idDigits(rec.year) + 'هـ' : '') : (rec.year ? 'لعام ' + idDigits(rec.year) + 'هـ' : ''),
    (d.from && d.from.y) || (d.to && d.to.y) ? 'خلال الفترة من ' + m(sgHTxt(d.from)) + ' إلى ' + m(sgHTxt(d.to)) : ''].filter(Boolean).join('<br>');
  const date = d.hy ? sgHTxt({ d: d.hd, m: d.hm, y: d.hy }) : '';
  return '<div class="idoc sg">' + head + '<div class="idc-body">' +
    '<div class="idc-title">' + SGS_TITLE + '</div>' + (sub ? '<div class="sg-sub">' + sub + '</div>' : '') +
    '<div class="idc-meta"><span>رقم الزيارة: ' + m(esc(idDigits(rec.visitNo)) || '—') + '</span><span>الفترة: ' + periodBoxes + '</span></div>' +
    '<table><colgroup><col style="width:56px"><col style="width:17%"><col style="width:19%"><col><col style="width:14%"><col style="width:12%"></colgroup>' +
    '<tr><th>م</th><th>اسم المركز</th><th>اسم المعلمة</th><th>الملاحظات التي تم رصدها</th><th>حضور مادة أم قرآن أم كليهما</th><th>مستوى أداء المعلمة بالدرجة</th></tr>' +
    body + '</table>' +
    '<div class="sg-sumfoot idc-avoid"><div>اسم المشرفة: ' + m(esc(rec.supName || '')) + '<br>التاريخ: ' + m(date) + '<br>التوقيع: ' + (sigs.sup ? '<img src="' + sigs.sup + '" alt="">' : '') + '</div></div>' +
  '</div></div>';
}

// تواقيع التقرير المحفوظ (من ورقة «التواقيع»)
async function sgLoadSigs(rec) {
  const has = (rec.data && rec.data.sigs) || {};
  const items = ['sup', 'tch'].filter(k => has[k]).map(k => ({ id: rec.id + '|' + k }));
  if (!items.length) return {};
  const map = await sgSigFetch(items);
  const out = {};
  ['sup', 'tch'].forEach(k => { if (map[rec.id + '|' + k]) out[k] = map[rec.id + '|' + k]; });
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
      '<style>@page{size:A4 landscape;margin:7mm}html,body{margin:0;background:#fff}' + SG_CSS +
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
  box.style.cssText = 'position:absolute;top:0;left:0;width:1123px;z-index:-1;background:#fff;direction:rtl';
  box.innerHTML = '<style>' + SG_CSS + '.idoc{width:1123px;padding:0}</style>' + sgDocHtml(rec, sigs);
  document.body.appendChild(box);
  try {
    await Promise.all([...box.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    const opt = { margin: 0, image: { type: 'jpeg', quality: 0.97 }, jsPDF: { unit: 'mm', format: [297, 210], orientation: 'landscape' } };
    try {
      await idLoadImgLib();
      const fontCss = await idFontEmbedCss();
      const io = { pixelRatio: 2, backgroundColor: '#ffffff', width: 1123, style: { margin: '0' } };
      if (fontCss) io.fontEmbedCSS = fontCss; else io.skipFonts = true;
      const cv = await window.htmlToImage.toCanvas(box.querySelector('.idoc'), io);
      return await window.html2pdf().set(opt).from(idFitPage(cv), 'canvas').outputPdf('blob');
    } catch (e) { console.warn('html-to-image failed, falling back to html2canvas', e); }
    return await window.html2pdf().set(Object.assign(opt, {
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: 1123, onclone: idFixBidi },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.idc-avoid'] }
    })).from(box.querySelector('.idoc'))
      .toContainer().get('container').then(c => {
        if (c.parentElement) c.parentElement.style.direction = 'ltr';
        Object.assign(c.style, { position: 'absolute', top: '0', left: '0', right: 'auto', margin: '0', width: '1123px', direction: 'rtl' });
      }).toCanvas().toPdf().outputPdf('blob');
  } finally { box.remove(); }
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
    '<style>' + SG_CSS + '</style><div class="id-scroll sg-fit">' + sgDocHtml(rec, sigs) + '</div>';
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
