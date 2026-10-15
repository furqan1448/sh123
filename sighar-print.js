/* ===== وحدة تحفيظ الصغار: تقرير زيارة مشرفة تحفيظ صغار — العرض والطباعة وتحميل PDF والمشاركة =====
   الكليشة الحمراء (letterhead.jpg) أعلى التقرير مثل باقي نماذج المنظومة، وتنسيق الخانات مثل النموذج الورقي.
   يعتمد على الأدوات المشتركة في idari-print.js (التاريخ الهجري، أداة PDF، خط Tajawal) فيُحمَّل بعده. */
const SG_BG = 'letterhead.jpg';   // الكليشة الحمراء الموحّدة
const SG_UNIT = 'وحدة تحفيظ الصغار';
const SG_TITLE = 'تقرير زيارة مشرفة تحفيظ صغار';
const SG_MIN_LINES = 13;   // مساحة «توصيات عامة» تقريباً (بالأسطر) للتنبيه عند طول النص

// جلب التواقيع (تُستبدل في صفحة إدارة الوحدات بدخول المديرة)
let sgSigFetch = items => api('getSigs', { items }).then(o => o.data || {});

const sgPeriodTxt = p => { p = String(p || ''); return p.indexOf('مسائي') > -1 ? 'المسائية' : p.indexOf('صباحي') > -1 ? 'الصباحية' : p; };

const SG_CSS = `
.sgdoc{position:relative;width:794px;min-height:1123px;background:#fff;color:#1d1a1b;
  font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;font-size:17px;line-height:1.7;box-sizing:border-box;padding:0 0 40px}
.sgdoc *{box-sizing:border-box}
.sgdoc bdi{unicode-bidi:isolate}
.sgdoc .sg-lh{width:100%;height:auto;aspect-ratio:2000/351;display:block}
.sgdoc .sg-body{padding:0 54px}
.sgdoc .sg-unit{text-align:center;color:#7a1f2b;font-weight:800;font-size:17px;margin:24px 0 2px}
.sgdoc .sg-title{text-align:center;font-size:25px;font-weight:800;margin:0 0 30px;color:#1d1a1b}
.sgdoc .sg-line{display:flex;align-items:baseline;gap:22px;margin:0 0 16px;font-size:18px}
.sgdoc .sg-f{display:flex;align-items:baseline;gap:8px;min-width:0}
.sgdoc .sg-f>b{font-weight:800;white-space:nowrap}
.sgdoc .sg-v{flex:1;min-width:40px;color:#7a1f2b;font-weight:800;font-size:18px;line-height:1.5;word-break:break-word}
.sgdoc .sg-recs-h{font-weight:800;font-size:19px;margin:28px 0 8px}
.sgdoc .sg-recs{min-height:360px;font-size:18px;line-height:1.9;font-weight:500;color:#1d1a1b;white-space:pre-wrap;word-break:break-word;padding:0 4px}
.sgdoc .sg-ack{display:flex;align-items:flex-end;gap:10px;margin:30px 0 0;font-weight:800;font-size:18px}
.sgdoc .sg-ack .sg-sigbox{min-width:250px;min-height:56px;display:flex;align-items:flex-end;justify-content:center}
.sgdoc .sg-sup{margin:30px 0 0;width:60%;margin-right:auto}
.sgdoc .sg-sup .sg-line{margin-bottom:18px}
.sgdoc .sg-sig{max-height:62px;max-width:230px;display:block}
.sgdoc .sg-date{display:inline-block;direction:rtl}
`;

/* ---------- محتوى التقرير (نفس الشكل للعرض والطباعة والـ PDF) ---------- */
function sgDocHtml(rec, sigs, bgUrl) {
  sigs = sigs || {};
  const d = rec.data || {};
  const v = (x, minW) => '<span class="sg-v"' + (minW ? ' style="min-width:' + minW + 'px"' : '') + '>' + x + '</span>';
  const f = (lbl, val, grow, minW) => '<span class="sg-f" style="flex:' + (grow || 1) + '"><b>' + lbl + ' /</b>' + v(val, minW) + '</span>';
  const date = d.hd ? '<span class="sg-date"><bdi>' + idDigits(d.hd) + '</bdi> / <bdi>' + idDigits(d.hm) + '</bdi> / <bdi>' + idDigits(d.hy) + 'هـ</bdi></span>' : '';
  const sig = s => s ? '<img class="sg-sig" src="' + s + '" alt="">' : '';
  // أبعاد الكليشة مكتوبة صراحةً حتى يُحجز مكانها قبل تحميلها
  return '<div class="sgdoc"><img class="sg-lh" src="' + esc(bgUrl || SG_BG) + '" width="2000" height="351" alt=""><div class="sg-body">' +
    '<div class="sg-unit">' + SG_UNIT + '</div>' +
    '<div class="sg-title">' + SG_TITLE + '</div>' +
    '<div class="sg-line">' + f('اسم المعلمة', esc(rec.teacher), 1.5) + f('المركز', esc(rec.center), 1.4) + f('الفترة', esc(sgPeriodTxt(rec.period)), 0.9) + '</div>' +
    '<div class="sg-line">' + f('رقم الزيارة', esc(idDigits(rec.visitNo)), 0.7) + f('اليوم', esc(d.dayName || rec.day || ''), 0.9) + f('التاريخ', date, 1.6) + '</div>' +
    '<div class="sg-line">' + f('موضوع الدرس', esc(rec.lesson), 1) + '</div>' +
    '<div class="sg-recs-h">توصيات عامة :</div>' +
    '<div class="sg-recs">' + esc(rec.recs || '') + '</div>' +
    '<div class="sg-ack"><span>توقيع المعلمة بالاطلاع /</span><span class="sg-sigbox">' + sig(sigs.tch) + '</span></div>' +
    '<div class="sg-sup">' +
      '<div class="sg-line">' + f('اسم المشرفة', esc(rec.supName), 1) + '</div>' +
      '<div class="sg-line"><span class="sg-f" style="flex:1"><b>التوقيع /</b><span class="sg-v" style="min-height:50px;display:flex;align-items:flex-end">' + sig(sigs.sup) + '</span></span></div>' +
    '</div>' +
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
  return (SG_TITLE + ' ' + (rec.teacher || '') + ' ' + dt).trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_');
};

/* ---------- طباعة (ومنها «حفظ PDF» من نافذة الطباعة) ---------- */
async function sgPrint(rec, btn, sigs) {
  const w = window.open('', '_blank');
  if (!w) return toast('اسمحي بالنوافذ المنبثقة لهذا الموقع ثم أعيدي المحاولة', false);
  w.document.write('<p style="font-family:Tahoma;text-align:center;margin-top:40px">جارِ التجهيز...</p>');
  if (btn) setBtnBusy(btn, true, '...');
  try {
    if (!sigs) sigs = await sgLoadSigs(rec);
    const bg = new URL(SG_BG, location.href).href;
    w.document.open();
    w.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>' + esc(sgFileName(rec)) + '</title>' +
      '<link rel="stylesheet" href="' + ID_FONT_CSS + '">' +
      '<style>@page{size:A4 portrait;margin:0}html,body{margin:0;background:#fff}' + SG_CSS +
      '.sgdoc{width:210mm;min-height:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>' +
      sgDocHtml(rec, sigs, bg) + '</body></html>');
    w.document.close();
    const go = () => setTimeout(() => { w.focus(); w.print(); }, 350);
    const im = new w.Image(); im.onload = go; im.onerror = go; im.src = bg;   // ننتظر الخلفية قبل الطباعة
  } catch (e) { w.close(); toast(e.message || 'تعذّرت الطباعة', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}

/* ---------- PDF: صفحة A4 طولية بنفس شكل النموذج ---------- */
function sgFitPage(cv) {
  const maxH = cv.width * 297 / 210;
  if (cv.height <= maxH * 1.01) return cv;
  const out = document.createElement('canvas');   // أطول قليلاً من الصفحة: نصغّره ليكفي صفحة واحدة
  out.width = Math.round(cv.height * 210 / 297); out.height = cv.height;
  const g = out.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, out.width, out.height);
  g.drawImage(cv, Math.round((out.width - cv.width) / 2), 0);
  return out;
}
async function sgPdfBlob(rec, sigs) {
  if (!sigs) sigs = await sgLoadSigs(rec);
  await idLoadPdfLib();
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:0;left:0;width:794px;z-index:-1;background:#fff;direction:rtl';
  // الكليشة كبيانات مضمّنة حتى تظهر في الرسم
  let bg = SG_BG;
  try { const b = await (await fetch(SG_BG)).blob(); bg = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch (e) {}
  box.innerHTML = '<style>' + SG_CSS + '</style>' + sgDocHtml(rec, sigs, bg);
  document.body.appendChild(box);
  try {
    await Promise.all([...box.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    const opt = { margin: 0, image: { type: 'jpeg', quality: 0.95 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    try {
      await idLoadImgLib();
      const fontCss = await idFontEmbedCss();
      const io = { pixelRatio: 2.2, backgroundColor: '#ffffff', width: 794, style: { margin: '0' } };
      if (fontCss) io.fontEmbedCSS = fontCss; else io.skipFonts = true;
      const cv = await window.htmlToImage.toCanvas(box.querySelector('.sgdoc'), io);
      return await window.html2pdf().set(opt).from(sgFitPage(cv), 'canvas').outputPdf('blob');
    } catch (e) { console.warn('html-to-image failed, falling back to html2canvas', e); }
    return await window.html2pdf().set(Object.assign(opt, {
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: 794, onclone: doc => sgFixBidi(doc) }
    })).from(box.querySelector('.sgdoc'))
      .toContainer().get('container').then(c => {
        if (c.parentElement) c.parentElement.style.direction = 'ltr';
        Object.assign(c.style, { position: 'absolute', top: '0', left: '0', right: 'auto', margin: '0', width: '794px', direction: 'rtl' });
      }).toCanvas().toPdf().outputPdf('blob');
  } finally { box.remove(); }
}
function sgFixBidi(doc) {
  const root = doc.querySelector('.sgdoc');
  if (!root) return;
  const w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [];
  let n;
  while ((n = w.nextNode())) nodes.push(n);
  nodes.forEach(t => { const v = t.nodeValue; if (v && /[؀-ۿ0-9]/.test(v)) t.nodeValue = '‫' + v + '‬'; });
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
    '<style>' + SG_CSS + '</style><div class="id-scroll sg-scroll"><div class="sg-zoom">' + sgDocHtml(rec, sigs) + '</div></div>';
  document.getElementById('sgVPrint').onclick = e => sgPrint(rec, e.currentTarget, sigs);
  document.getElementById('sgVPdf').onclick = e => sgPdf(rec, e.currentTarget, sigs);
  document.getElementById('sgVShare').onclick = e => sgShare(rec, e.currentTarget, sigs);
  sgZoom();
}
// تصغير المعاينة لتناسب عرض الجوال
function sgZoom() {
  const sc = document.querySelector('.sg-scroll'), z = document.querySelector('.sg-zoom');
  if (!sc || !z) return;
  const doc = z.firstElementChild;
  const k = Math.min(1, (sc.clientWidth - 22) / 794);
  doc.style.transform = 'scale(' + k + ')'; doc.style.transformOrigin = 'top right';
  z.style.cssText = 'overflow:hidden;margin:0 auto;width:' + Math.floor(794 * k) + 'px;height:' + Math.ceil(doc.offsetHeight * k) + 'px';
}
window.addEventListener('resize', sgZoom);
function sgCloseModal() { const m = document.getElementById('sgModal'); if (m) m.classList.add('hidden'); }
