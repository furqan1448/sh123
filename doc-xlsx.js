/* ===== تحويل أي نموذج إلى ملف Excel بنفس شكل العرض (الكليشة، العنوان، الجداول، التواقيع) =====
   يرسم النموذج في الصفحة (مخفياً خلف نافذة «جارِ تجهيز الملف») ثم ينقل كل سطر وكل خلية إلى ورقة Excel
   بمكانها ولونها، فيصلح لكل النماذج دون إعداد خاص لكل نموذج.
   يُستخدم: للمديرة والمعلمة («حفظ Excel»)، وعند الإرسال للمديرة أو المعلمة (تُرسل نسخة PDF ونسخة Excel). */
const DX_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
const DX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
let dxLoading = null;
const dxImgCache = {};

function dxLoad() {
  if (window.ExcelJS) return Promise.resolve();
  if (typeof exLoad === 'function') return exLoad();
  if (dxLoading) return dxLoading;
  dxLoading = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = DX_LIB;
    sc.onload = () => res();
    sc.onerror = () => { dxLoading = null; rej(new Error('تعذّر تحميل أداة Excel، تأكدي من الاتصال بالإنترنت')); };
    document.head.appendChild(sc);
  });
  return dxLoading;
}
// صورة ← base64 (الكليشة تُجلب مرة واحدة)
async function dxImg(src) {
  if (!src) return null;
  if (dxImgCache[src]) return dxImgCache[src];
  let b64 = '', ext = 'png';
  if (src.indexOf('data:') === 0) {
    const m = src.match(/^data:image\/(\w+);base64,(.*)$/);
    if (!m) return null;
    ext = m[1]; b64 = m[2];
  } else {
    const r = await fetch(src);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
    b64 = btoa(s);
    ext = /\.png($|\?)/i.test(src) ? 'png' : 'jpeg';
  }
  ext = /png/i.test(ext) ? 'png' : 'jpeg';
  const o = { base64: b64, extension: ext };
  if (src.indexOf('data:') !== 0) dxImgCache[src] = o;
  return o;
}
// لون CSS ← ARGB (أو null إن كان شفافاً)
function dxColor(c) {
  const m = String(c || '').match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map(x => parseFloat(x));
  if (p.length > 3 && p[3] === 0) return null;
  return 'FF' + p.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const dxText = el => String(el.innerText || el.textContent || '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

// html: نص النموذج (مع <style>)، opt: { width: 1123 أو 794، landscape، sheet }
async function docXlsxBlob(html, opt) {
  opt = opt || {};
  const W = opt.width || 1123;
  await dxLoad();
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;top:0;left:0;width:' + W + 'px;z-index:-1;background:#fff;direction:rtl';
  box.innerHTML = html;
  document.body.appendChild(box);
  if (typeof pdfBusy === 'function') pdfBusy(1);
  try {
    await Promise.all([...box.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
    const root = box.querySelector('.idoc') || box;
    const R = root.getBoundingClientRect();
    // المسافة من الحافة اليمنى (الورقة من اليمين لليسار)
    const xr = rect => ({ a: Math.round(R.right - rect.right), b: Math.round(R.right - rect.left) });

    // 1) جمع أجزاء النموذج بالترتيب
    const blocks = [];
    const walk = el => {
      for (const ch of el.children) {
        if (/^(STYLE|SCRIPT|COLGROUP)$/.test(ch.tagName)) continue;
        const cs = getComputedStyle(ch);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (ch.tagName === 'IMG') { blocks.push({ t: ch.classList.contains('idc-lh') ? 'lh' : 'img', el: ch }); continue; }
        if (ch.tagName === 'TABLE') { blocks.push({ t: 'table', el: ch }); continue; }
        if (ch.querySelector('table, img.idc-lh')) { walk(ch); continue; }
        const kids = [...ch.children].filter(c => getComputedStyle(c).display !== 'none');
        if ((cs.display === 'flex' || cs.display === 'grid') && kids.length >= 2) { blocks.push({ t: 'cols', el: ch, kids }); continue; }
        // حاوية فيها عدة أسطر (فقرات وعناوين): كل سطر منها صف مستقل
        if (kids.filter(c => /^(block|flex|grid|table|list-item)$/.test(getComputedStyle(c).display)).length >= 2) { walk(ch); continue; }
        if (dxText(ch) || ch.querySelector('img')) blocks.push({ t: 'text', el: ch });
      }
    };
    walk(root);

    // 2) حدود الأعمدة من خلايا الجداول (كل حد مشترك يصبح عموداً في الورقة)
    let bs = [0, Math.round(R.width)];
    blocks.filter(b => b.t === 'table').forEach(b => b.el.querySelectorAll('td,th').forEach(c => { const x = xr(c.getBoundingClientRect()); bs.push(x.a, x.b); }));
    bs = bs.filter(v => v >= 0 && v <= R.width + 2).sort((a, b) => a - b);
    const B = [];
    bs.forEach(v => { if (!B.length || v - B[B.length - 1] > 10) B.push(v); else B[B.length - 1] = Math.round((B[B.length - 1] + v) / 2); });
    if (B.length < 3) { B.length = 0; for (let i = 0; i <= 8; i++) B.push(Math.round(R.width * i / 8)); }
    const NC = B.length - 1;
    const colOf = x => { let best = 0, d = 1e9; B.forEach((v, i) => { const k = Math.abs(v - x); if (k < d) { d = k; best = i; } }); return best; };
    const span = rect => { const x = xr(rect); let c1 = colOf(x.a), c2 = colOf(x.b); if (c2 <= c1) c2 = Math.min(NC, c1 + 1); return [c1 + 1, c2]; };   // أعمدة الورقة (1..NC)
    const colPx = i => B[i + 1] - B[i];

    const wb = new window.ExcelJS.Workbook();
    wb.creator = 'جمعية فرقان لتحفيظ القرآن الكريم';
    const ws = wb.addWorksheet(opt.sheet || 'النموذج', {
      views: [{ rightToLeft: true, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: opt.landscape === false || W < 900 ? 'portrait' : 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.4, header: 0.2, footer: 0.2 } }
    });
    ws.columns = B.slice(1).map((v, i) => ({ width: Math.max(2, (v - B[i]) / 7) }));
    const thin = { style: 'thin', color: { argb: 'FF000000' } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };
    let row = 1;
    const rowTop = [];   // أعلى كل صف في الورقة بالبكسل (لوضع الصور)
    const setH = (r, px) => { ws.getRow(r).height = Math.max(14, px * 0.75); };
    const styleCell = (cell, el, withBorder) => {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize) || 15;
      const al = cs.textAlign === 'center' ? 'center' : (cs.textAlign === 'left' || cs.textAlign === 'end') ? 'left' : 'right';
      cell.font = { name: 'Arial', size: Math.round(fs * 0.75 * 10) / 10, bold: (parseInt(cs.fontWeight, 10) || 400) >= 600, color: { argb: dxColor(cs.color) || 'FF222222' } };
      cell.alignment = { horizontal: al, vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
      const bg = dxColor(cs.backgroundColor);
      if (bg && bg !== 'FFFFFFFF') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      if (withBorder) cell.border = border;
    };
    const put = (r1, r2, c1, c2, val, el, withBorder) => {
      if (r2 > r1 || c2 > c1) { try { ws.mergeCells(r1, c1, r2, c2); } catch (e) {} }
      const cell = ws.getCell(r1, c1);
      cell.value = val;
      styleCell(cell, el, withBorder);
      if (withBorder) for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) ws.getCell(r, c).border = border;
    };
    // الصور (التواقيع) في مكانها: الصف والعمود من موقعها في النموذج
    const pending = [];
    // ارتفاع يكفي النص إذا التفّ داخل الخلية (للأسطر خارج الجداول)
    const fitH = (r, c1, c2, txt, el) => {
      const fs = parseFloat(getComputedStyle(el).fontSize) || 15;
      let w = 0; for (let c = c1 - 1; c < c2; c++) w += colPx(c);
      const lines = String(txt || '').split('\n').reduce((n, ln) => n + Math.max(1, Math.ceil(ln.length * fs * 0.62 / Math.max(40, w - 8))), 0);
      const need = lines * fs * 1.55 + 6;
      if ((ws.getRow(r).height || 0) / 0.75 < need) ws.getRow(r).height = need * 0.75;
    };
    const addImgs = (el, r0, top0) => el.querySelectorAll('img').forEach(im => { if (!im.classList.contains('idc-lh') && im.naturalWidth) pending.push({ im, r0, top0 }); });

    for (const b of blocks) {
      if (b.t === 'lh') {   // الكليشة بعرض الورقة
        const im = await dxImg(b.el.getAttribute('src'));
        const rc = b.el.getBoundingClientRect(), h = Math.round(R.width * (rc.height / Math.max(1, rc.width)));
        if (im) { const id = wb.addImage(im); ws.addImage(id, { tl: { col: 0, row: row - 1 }, ext: { width: Math.round(R.width), height: h } }); }
        const n = 4; for (let i = 0; i < n; i++) { setH(row + i, h / n); rowTop[row + i] = rc.top + i * rc.height / n; }
        row += n + 1;
        continue;
      }
      if (b.t === 'table') {
        const trs = [...b.el.rows];
        const base = row, rowOfTr = new Map();
        trs.forEach((tr, i) => { rowOfTr.set(tr, base + i); const rc = tr.getBoundingClientRect(); setH(base + i, rc.height); rowTop[base + i] = rc.top; });
        trs.forEach((tr, i) => {
          [...tr.cells].forEach(td => {
            const [c1, c2] = span(td.getBoundingClientRect());
            const r1 = base + i, r2 = r1 + Math.max(1, td.rowSpan || 1) - 1;
            const t = dxText(td);
            put(r1, r2, c1, c2, /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : t, td, true);
            addImgs(td, r1, td.getBoundingClientRect().top);
          });
        });
        row = base + trs.length + 1;
        continue;
      }
      if (b.t === 'cols') {   // أجزاء متجاورة (سطر البيانات أعلى النموذج، أو التواقيع أسفله)
        const rc = b.el.getBoundingClientRect();
        setH(row, rc.height); rowTop[row] = rc.top;
        // كل جزء يأخذ الأعمدة من بدايته حتى بداية الجزء التالي (فلا يضيق فيلتفّ النص)
        const parts = b.kids.map(k => ({ k, c1: span(k.getBoundingClientRect())[0] })).filter(x => dxText(x.k) || x.k.querySelector('img')).sort((x, y) => x.c1 - y.c1);
        parts.forEach((x, i) => { if (i && x.c1 <= parts[i - 1].c1) x.c1 = parts[i - 1].c1 + 1; });
        parts.forEach((x, i) => {
          const k = x.k, c1 = Math.min(NC, x.c1), c2 = i < parts.length - 1 ? Math.max(c1, Math.min(NC, parts[i + 1].c1 - 1)) : NC;
          if (i && c1 <= parts[i - 1].c2) return;
          x.c2 = c2;
          // أجزاء السطر الواحد (مثل: المركز ☑ صباحي ☐ مسائي) تبقى في سطر واحد، والتواقيع (اسم فوق اسم) في أسطرها
          const tk = /flex|inline/.test(getComputedStyle(k).display) && !k.querySelector('br,div') ? dxText(k).replace(/\s*\n+\s*/g, '   ') : dxText(k);
          put(row, row, c1, c2, tk, k, false);
          fitH(row, c1, c2, tk, k);
          // النص يبدأ من موضعه في النموذج (محاذاة لليمين من بداية الجزء)
          ws.getCell(row, c1).alignment = Object.assign({}, ws.getCell(row, c1).alignment, { vertical: 'top', horizontal: 'right' });
          addImgs(k, row, rc.top);
        });
        row += 2;
        continue;
      }
      // سطر نصي بعرض الورقة (العنوان، بشأن، الملاحظات)
      const rc = b.el.getBoundingClientRect();
      setH(row, rc.height); rowTop[row] = rc.top;
      put(row, row, 1, NC, dxText(b.el), b.el, false);
      fitH(row, 1, NC, dxText(b.el), b.el);
      // سطر نصه في وسط الصفحة (مثل عنوان المحضر) يبقى في الوسط
      try {
        const rg = document.createRange(); rg.selectNodeContents(b.el);
        const tr = rg.getBoundingClientRect();
        if (tr.width && tr.width < rc.width * 0.8 && Math.abs((tr.left + tr.right) / 2 - (rc.left + rc.right) / 2) < 14)
          ws.getCell(row, 1).alignment = Object.assign({}, ws.getCell(row, 1).alignment, { horizontal: 'center' });
      } catch (e) {}
      addImgs(b.el, row, rc.top);
      row += b.t === 'img' ? 1 : 1;
    }
    // وضع الصور
    for (const p of pending) {
      const im = await dxImg(p.im.getAttribute('src'));
      if (!im) continue;
      const rc = p.im.getBoundingClientRect(), x = xr(rc);
      let c = 0; while (c < NC - 1 && B[c + 1] <= x.a) c++;
      let r = p.r0; while (rowTop[r + 1] != null && rowTop[r + 1] <= rc.top) r++;
      const rowPx = (ws.getRow(r).height || 15) / 0.75;
      const fy = Math.min(0.95, Math.max(0, (rc.top - (rowTop[r] || p.top0)) / rowPx));
      const fx = Math.min(0.95, Math.max(0, (x.a - B[c]) / Math.max(1, colPx(c))));
      // في الورقة من اليمين لليسار يبدأ العمود من اليمين، فنضع الصورة من الحافة اليمنى
      const id = wb.addImage(im);
      ws.addImage(id, { tl: { col: c + fx, row: r - 1 + fy }, ext: { width: Math.round(rc.width), height: Math.round(rc.height) } });
    }
    const out = await wb.xlsx.writeBuffer();
    return new Blob([out], { type: DX_MIME });
  } finally {
    box.remove();
    if (typeof pdfBusy === 'function') pdfBusy(0);
  }
}
function dxSave(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

/* ---------- لكل نوع: نسخة Excel من النموذج ---------- */
// نماذج الإشراف الإداري (idari-print.js)
async function idXlsxBlob(rec, sigs) {
  if (!sigs) sigs = await idLoadSigs(rec);
  if (rec.kind === 'monthly') return docXlsxBlob('<style>' + ID_CSS + IM_CSS + '.idoc{width:1123px;padding:0}</style><div class="idoc imdoc">' + imDocPages(rec, sigs).join('') + '</div>', { width: 1123 });
  const P = typeof ID_PORTRAIT !== 'undefined' && ID_PORTRAIT[rec.kind];
  return docXlsxBlob('<style>' + ID_CSS + '.idoc{width:' + (P ? 794 : 1123) + 'px;padding:0}</style>' + idDocHtml(rec, sigs), { width: P ? 794 : 1123 });
}
// تقارير ونماذج تحفيظ الصغار والمحاضر واستمارات الإشراف التربوي (sighar-print.js)
async function sgXlsxBlob(rec, sigs) {
  if (!sigs) sigs = await sgLoadSigs(rec);
  const P = sgPortrait(rec), W = P ? 794 : 1123;
  return docXlsxBlob('<style>' + sgAllCss() + '.idoc{width:' + W + 'px;padding:0}</style>' + sgDocHtml(rec, sigs), { width: W });
}
async function idXlsx(rec, btn, sigs) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try { dxSave(await idXlsxBlob(rec, sigs), idFileName(rec) + '.xlsx'); toast('تم التحميل'); }
  catch (e) { toast(e.message || 'تعذّر تحميل Excel', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}
async function sgXlsx(rec, btn, sigs) {
  if (btn) setBtnBusy(btn, true, 'جارِ التجهيز...');
  try { dxSave(await sgXlsxBlob(rec, sigs), sgFileName(rec) + '.xlsx'); toast('تم التحميل'); }
  catch (e) { toast(e.message || 'تعذّر تحميل Excel', false); }
  finally { if (btn) setBtnBusy(btn, false); }
}
// شريط الحفظ للمديرة والمعلمة: «حفظ PDF» و«حفظ Excel»
const dxBar = (pdfId, xlsId) => '<button class="btn light" id="' + pdfId + '">' + DX_ICO_PDF + 'حفظ PDF</button><button class="btn light" id="' + xlsId + '">' + DX_ICO_XLS + 'حفظ Excel</button>';
const DX_ICO = d => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;margin-inline-end:6px" aria-hidden="true">' + d + '</svg>';
const DX_ICO_PDF = DX_ICO('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M12.5 11v6"/><path d="M10 14.5l2.5 2.5 2.5-2.5"/>');
const DX_ICO_XLS = DX_ICO('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>');
