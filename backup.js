/* ===== نسخة احتياطية مقروءة (إدارة الوحدات) =====
   ملف ZIP يُحفظ في جهاز المديرة ولا يأخذ أي مساحة من قوقل:
   - كل استمارة ونموذج وتقرير ومحضر وخلاصة واستمارة بيانات معلمة = ملف Excel منسّق بالكليشة (مثل زر Excel تمامًا) مع التواقيع
   - «الفهرس.xlsx»: جدول بكل الملفات + كشف الخروج + المرفقات (بروابطها) + بيانات المعلمات
   مرتّبة في مجلدات: الوحدة / نوع النموذج. يتطلب: manage.js وملفات الطباعة والتصدير المحمّلة في units.html */
const BK_ZIP_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
let bkLoading = null, bkBusy = false;
function bkLoadZip() {
  if (window.JSZip) return Promise.resolve();
  if (bkLoading) return bkLoading;
  bkLoading = new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = BK_ZIP_LIB;
    sc.onload = () => res(); sc.onerror = () => { bkLoading = null; rej(new Error('تعذّر تحميل أداة الضغط، تأكدي من الاتصال بالإنترنت')); };
    document.head.appendChild(sc);
  });
  return bkLoading;
}
const bkSafe = s => String(s == null ? '' : s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'بدون اسم';

// جلب كل التواقيع المطلوبة دفعةً واحدة (طلبات مجمّعة) بدل طلب لكل استمارة
async function bkSigs(items, onStep) {
  const map = {}, seen = {};
  items = items.filter(x => x && x.id && !seen[x.id] && (seen[x.id] = 1));
  for (let i = 0; i < items.length; i += 50) {
    try { Object.assign(map, (await mgApi('getSigs', { items: items.slice(i, i + 50), mgr: true })).data || {}); } catch (e) {}
    if (onStep) onStep(Math.min(i + 50, items.length), items.length);
  }
  return map;
}

async function mgBackup(btn) {
  if (!MG) return toast('حدّثي الصفحة أولاً', false);
  if (bkBusy) return;
  bkBusy = true;
  const label = btn ? btn.innerHTML : '';
  const say = t => { if (btn) btn.textContent = t; };
  btn && (btn.disabled = true);
  const names = {}; (MG.users || []).forEach(u => { names[u.username] = u.name; });
  const supOf = r => names[String(r.owner || '').toLowerCase()] || names[r.owner] || r.owner || '';

  // قائمة كل ما سيُحفظ
  const jobs = [];
  (MG.evals || []).forEach((r, i) => jobs.push({ g: 'ev', r, i }));
  (MG.idari || []).forEach(r => jobs.push({ g: 'id', r }));
  (MG.sgh || []).forEach(r => jobs.push({ g: 'sg', r }));
  (MG.minutes || []).forEach(r => jobs.push({ g: 'min', r }));
  (MG.reports || []).forEach(r => jobs.push({ g: 'rp', r }));
  (MG.tprof || []).forEach(r => jobs.push({ g: 'tp', r }));

  // تحويل الحفظ والتنبيهات مؤقتًا: الملفات تُجمع في الذاكرة بدل تحميل كل واحد منها
  const orig = { dx: dxSave, ex: exSave, toast: toast, id: idSigFetch, sg: sgSigFetch, exf: exFetchSigs };
  let caught = null;
  dxSave = exSave = (blob, name) => { caught = { blob, name }; };
  toast = () => {};
  const zipFiles = [], index = [], used = {};
  try {
    say('جارِ التجهيز...');
    await bkLoadZip(); await exLoad();

    // التواقيع
    const sigItems = [];
    jobs.forEach(j => {
      const has = (j.r.data && j.r.data.sigs) || {};
      if (j.g === 'ev' && j.r.signature) sigItems.push({ id: j.r.id, url: j.r.signature });
      if (j.g === 'id') ['sup', 'mgr', 'ack'].forEach(k => { if (has[k]) sigItems.push({ id: j.r.id + '|' + k }); });
      if (j.g === 'sg' || j.g === 'min') ['sup', 'tch', 'mgr', 'emp'].forEach(k => { if (has[k]) sigItems.push({ id: j.r.id + '|' + k }); });
    });
    const SIG = await bkSigs(sigItems, (a, n) => say('جارِ جلب التواقيع ' + a + ' / ' + n));
    const fromMap = items => { const o = {}; items.forEach(x => { if (SIG[x.id]) o[x.id] = SIG[x.id]; }); return Promise.resolve(o); };
    idSigFetch = fromMap; sgSigFetch = fromMap;
    exFetchSigs = async items => { const o = {}; for (const x of items.filter(Boolean)) { if (SIG[x.id]) { const d = await exImgDims(SIG[x.id]); if (d) o[x.id] = d; } } return o; };

    const GROUP = { ev: 'استمارات الإشراف التربوي', id: 'نماذج الإشراف الإداري', sg: 'تحفيظ الصغار', min: 'محاضر الاجتماعات', rp: 'خلاصات التقارير', tp: 'بيانات المعلمات' };
    for (let n = 0; n < jobs.length; n++) {
      const j = jobs[n], r = j.r;
      say('جارِ إعداد الملفات ' + (n + 1) + ' / ' + jobs.length);
      let title = GROUP[j.g], note = '';
      caught = null;
      try {
        if (j.g === 'ev') {
          const m = exFormModel(r); title = m.title || title;
          const blob = await exBlob(m, async mm => { if (r.signature) { const sg = await exFetchSigs([{ id: r.id, url: r.signature }]); mm.signature = sg[r.id] || null; } });
          caught = { blob, name: m.file + '.xlsx' };
        } else if (j.g === 'id') {
          title = ID_KINDS[r.kind] || title;
          caught = { blob: await idXlsxBlob(r, await idLoadSigs(r)), name: idFileName(r) + '.xlsx' };
        } else if (j.g === 'sg' || j.g === 'min') {
          title = j.g === 'min' ? 'محضر اجتماع' : (sgTitleOf(r) || title);
          caught = { blob: await sgXlsxBlob(r, await sgLoadSigs(r)), name: sgFileName(r) + '.xlsx' };
        } else if (j.g === 'rp') {
          await rpXlsx(await mgRptGet(r.id), null);   // يُلتقط عبر exSave
        } else if (j.g === 'tp') {
          caught = { blob: await docXlsxBlob('<style>' + ID_CSS + TPD_CSS + '.idoc{width:794px;padding:0}</style><div class="idoc ptdoc">' + tpDocHtml(r) + '</div>', { width: 794 }), name: tpDocName(r) + '.xlsx' };
        }
        if (!caught) throw new Error('لم يُنشأ الملف');
      } catch (e) { note = 'تعذّر إنشاء الملف: ' + (e.message || e); caught = null; }
      const unit = bkSafe(r.unit || (MG.me && MG.me.unit) || 'الوحدة');
      const folder = unit + '/' + (j.g === 'ev' || j.g === 'sg' || j.g === 'id' ? bkSafe(title.replace(' – متابعة المشرفة للمعلمة', '')) : bkSafe(GROUP[j.g]));
      let path = '';
      if (caught) {
        let base = bkSafe(String(caught.name).replace(/\.xlsx$/i, '').replace(/_/g, ' ')), p = folder + '/' + base + '.xlsx', k = 2;
        while (used[p]) p = folder + '/' + base + ' (' + (k++) + ').xlsx';
        used[p] = 1; path = p;
        zipFiles.push({ path: p, blob: caught.blob });
      }
      index.push([GROUP[j.g], title, r.unit || '', r.center || '', r.teacher || r.name || '', j.g === 'tp' ? '' : supOf(r), r.date || r.sem || '', path, note]);
    }

    // الفهرس: كل الملفات + كشف الخروج + المرفقات + بيانات المعلمات
    say('جارِ إعداد الفهرس...');
    const wb = new ExcelJS.Workbook(); wb.creator = 'جمعية فرقان لتحفيظ القرآن الكريم';
    const sheet = (name, head, rows, widths) => {
      const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
      ws.columns = head.map((h, i) => ({ header: h, width: (widths && widths[i]) || 18 }));
      rows.forEach(r => ws.addRow(r));
      const hr = ws.getRow(1); hr.height = 24;
      hr.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7A1F2B' } }; c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
      ws.eachRow((row, i) => { if (i > 1) row.eachCell({ includeEmpty: true }, c => { c.alignment = { vertical: 'top', horizontal: 'right', wrapText: true }; c.font = Object.assign({ name: 'Arial' }, c.font || {}); }); });
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: head.length } };
      return ws;
    };
    sheet('الفهرس', ['القسم', 'النموذج', 'الوحدة', 'المركز', 'المعلمة / الاسم', 'المشرفة', 'التاريخ', 'مسار الملف داخل المجلد', 'ملاحظة'], index, [20, 30, 20, 24, 24, 20, 14, 60, 30]);
    sheet('كشف الخروج', ['الوحدة', 'المشرفة', 'المركز', 'نوع الزيارة', 'التاريخ', 'اليوم', 'حالة الزيارة', 'تُحسب', 'وقت التسجيل'],
      (MG.visits || []).map(v => [v.unit, supOf(v), v.center, v.type, v.date, v.day, v.status, v.counted ? 'نعم' : 'لا', v.at]), [20, 20, 26, 20, 14, 12, 30, 8, 18]);
    const fws = sheet('المرفقات', ['الوحدة', 'المشرفة', 'العنوان', 'اسم الملف', 'الرابط', 'التاريخ'],
      (MG.files || []).map(f => [f.unit, supOf(f), f.title, f.name, f.url ? { text: 'فتح الملف', hyperlink: f.url } : '', f.at]), [20, 20, 30, 30, 14, 18]);
    fws.getColumn(5).eachCell((c, i) => { if (i > 1 && c.value) c.font = { color: { argb: 'FF1F5FA8' }, underline: true, name: 'Arial' }; });
    const TPU = typeof TP_F !== 'undefined' ? TP_F.filter(f => f && f.k).map(f => [f.k, f.l]) : [['name', 'الاسم'], ['center', 'المركز']];
    const tpv = v => v == null ? '' : typeof v === 'object' ? (Array.isArray(v) ? v.map(x => typeof x === 'object' ? Object.values(x).filter(Boolean).join(' - ') : x).join('، ') : Object.values(v).filter(Boolean).join(' - ')) : String(v);
    sheet('بيانات المعلمات', TPU.map(c => c[1]), (MG.tprof || []).map(p => TPU.map(c => tpv(p[c[0]]))));
    const ibuf = await wb.xlsx.writeBuffer();

    say('جارِ ضغط الملفات...');
    const zip = new JSZip();
    zip.file('الفهرس.xlsx', ibuf);
    zipFiles.forEach(f => zip.file(f.path, f.blob));
    const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const d = new Date(), dt = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    orig.dx(out, 'نسخة احتياطية - منظومة مكتب إشراف الداخل - ' + dt + '.zip');
    const fails = index.filter(x => x[8]).length;
    orig.toast('تم تحميل النسخة الاحتياطية — عدد الملفات: ' + zipFiles.length + (fails ? '، وتعذّر ' + fails + ' — انظري عمود «ملاحظة» في الفهرس' : ''), !fails);
  } catch (e) {
    orig.toast(e.message || 'تعذّر إعداد النسخة الاحتياطية', false);
  } finally {
    dxSave = orig.dx; exSave = orig.ex; toast = orig.toast; idSigFetch = orig.id; sgSigFetch = orig.sg; exFetchSigs = orig.exf;
    bkBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
  }
}
