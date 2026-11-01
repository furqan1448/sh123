/* ===================== «بياناتي الشخصية» للمعلمات =====================
   - المعلمة (teachers.html): تعبّئ بياناتها وتحفظها، ويمكنها تعديلها متى شاءت.
   - مديرة المركز (centers.html): أيقونة «بيانات المعلمات» تعرض معلمات مركزها تلقائياً.
   - المشرفات (mushrifat.html، sighar.html): أيقونة «بيانات المعلمات» تعرض معلمات المراكز المشرفة عليها.
   (لا تُستخدم في الإشراف الإداري). يتطلب: config.js، idari-print.js (وexport.js لملف Excel). */
const TP_F = [
  { s: 'البيانات الأساسية' },
  { k: 'name', l: 'الاسم الرباعي', req: 1 },
  { k: 'nid', l: 'رقم الهوية / الإقامة', req: 1, num: 1, max: 10, ph: '١٠ أرقام' },
  { k: 'nat', l: 'الجنسية', req: 1, list: ['سعودية'] },
  { k: 'birth', l: 'تاريخ الميلاد', type: 'date' },
  { k: 'phone', l: 'رقم الجوال', ro: 1 },
  { k: 'phone2', l: 'رقم جوال آخر', num: 1, max: 10, ph: 'اختياري' },
  { s: 'المؤهلات والخبرات' },
  { k: 'qual', l: 'المؤهل العلمي', req: 1, opts: ['ابتدائي', 'متوسط', 'ثانوي', 'دبلوم', 'بكالوريوس', 'ماجستير', 'دكتوراه', 'أخرى'] },
  { k: 'major', l: 'التخصص' },
  { k: 'qq', l: 'المؤهل في القرآن الكريم', opts: ['اختبار مكتب', 'دبلوم عالي', 'دبلوم متوسط', 'دبلوم تأهيل منتهي بالتوظيف'] },
  { k: 'hifz', l: 'مقدار الحفظ (بالأجزاء)', req: 1, opts: Array.from({ length: 30 }, (_, i) => String(i + 1)) },
  { k: 'ijaza', l: 'الإجازة في القرآن الكريم', opts: ['لا يوجد', 'مجازة برواية حفص', 'مجازة بأكثر من رواية', 'أخرى'] },
  { k: 'exp', l: 'عدد سنوات الخبرة في التدريس', num: 1, max: 2 },
  { k: 'skills', l: 'مهارات تمتلكها المعلمة', area: 1, wide: 1 },
  { k: 'other', l: 'خبرات أخرى', area: 1, wide: 1 },
  { s: 'العمل في الجمعية' },
  { k: 'center', l: 'المركز', req: 1, center: 1 },
  { k: 'period', l: 'الفترة', req: 1, opts: ['الصباحية', 'المسائية', 'الصباحية والمسائية'] },
  { k: 'cat', l: 'فئة التدريس' }
];
const TP_KEYS = TP_F.filter(f => f.k);
const tpD = s => String(s == null ? '' : s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
// التاريخ: اليوم / الشهر / السنة بالاتجاه الصحيح
function tpDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  if (!m) return esc(tpD(v));
  return '<span class="tp-date"><bdi>' + tpD(+m[3]) + '</bdi> / <bdi>' + tpD(+m[2]) + '</bdi> / <bdi>' + tpD(m[1]) + 'م</bdi></span>';
}
// وقت آخر تحديث: «2026-11-01 18:30» ← التاريخ بالاتجاه الصحيح ثم الساعة
function tpAt(v) {
  const m = /^(\d{4}-\d{2}-\d{2})\s*(\d{1,2}:\d{2})?/.exec(String(v || ''));
  if (!m) return esc(tpD(v || '—'));
  return tpDate(m[1]) + (m[2] ? ' — الساعة <bdi dir="ltr">' + tpD(m[2]) + '</bdi>' : '');
}
function tpVal(p, f) {
  const v = p[f.k];
  if (!v) return '<span class="tp-empty">—</span>';
  if (f.type === 'date') return tpDate(v);
  if (f.k === 'phone' || f.k === 'phone2') return '<a href="tel:' + esc(v) + '" dir="ltr">' + esc(tpD(v)) + '</a>';
  if (f.k === 'hifz') return esc(tpD(v)) + ' جزءاً';
  if (f.k === 'center') return esc(v);
  return esc(f.num ? tpD(v) : v);
}

(function tpCss() {
  const st = document.createElement('style');
  st.textContent = `
.tp-note{background:#f6f0f2;border-right:4px solid var(--primary);border-radius:10px;padding:10px 12px;margin-bottom:12px;line-height:1.8;font-size:14.5px}
.tp-sec{font-weight:800;color:var(--primary);font-size:16px;margin:18px 0 2px;padding-bottom:6px;border-bottom:1.5px dashed var(--line)}
.tp-sec:first-child{margin-top:4px}
.tp-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
.tp-grid .wide{grid-column:1/-1}
@media(max-width:560px){.tp-grid{grid-template-columns:1fr}}
.tp-grid label .rq{color:#b3261e;margin-inline-start:3px}
.tp-grid input[readonly]{background:#f5f1f2;color:var(--muted)}
.tp-at{font-size:13.5px;color:var(--muted);text-align:center;margin-top:10px}
.tp-done{display:inline-block;background:#e4f4ec;color:#1f6b40;border-radius:20px;padding:2px 12px;font-size:13px;font-weight:800}
.tp-new{position:absolute;top:10px;left:10px;background:var(--gold);color:#fff;border-radius:20px;padding:1px 9px;font-size:12px;font-weight:800}
.tp-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 12px}
.tp-tools input{flex:1;min-width:180px;margin:0}
.tp-tools .btn{padding:9px 14px;font-size:14px}
@media(max-width:560px){.tp-tools input{flex-basis:100%}.tp-tools .btn{flex:1}}
.tp-cnt{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.tp-cnt span{background:#fbeef0;color:var(--primary);border-radius:20px;padding:3px 12px;font-weight:800;font-size:13.5px}
.tp-gh{font-weight:800;color:#fff;background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-radius:12px;padding:8px 14px;margin:16px 0 10px;display:flex;justify-content:space-between;align-items:center}
.tp-gh small{background:rgba(255,255,255,.18);border-radius:20px;padding:1px 10px}
.tp-card{border:1.5px solid var(--line);border-radius:16px;background:#fff;margin-bottom:10px;overflow:hidden}
.tp-row{cursor:pointer;padding:12px 14px;display:flex;align-items:center;gap:12px}
.tp-row:hover{background:#fcf8f9}
.tp-open{padding:7px 12px;font-size:13.5px;white-space:nowrap}
@media(max-width:480px){.tp-open{padding:6px 9px;font-size:12.5px}}
.tpd-fit{overflow:hidden;border:1.5px solid var(--line);border-radius:12px;background:#fff;margin-top:10px;position:relative}
.tpd-in{width:794px;transform-origin:top right;position:absolute;top:0;right:0}
.tp-card summary::-webkit-details-marker{display:none}
.tp-av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#a8404f);color:#fff;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;flex:none}
.tp-hd{flex:1;min-width:0}
.tp-hd b{display:block;color:var(--text);font-size:16px}
.tp-hd small{color:var(--muted);font-weight:600;font-size:13px;line-height:1.7}
.tp-arw{color:var(--primary);font-weight:800;font-size:13px;white-space:nowrap}
.tp-card[open] .tp-arw{transform:rotate(180deg)}
.tp-body{border-top:1px dashed var(--line);padding:6px 14px 14px}
.tp-body h4{margin:12px 0 6px;color:var(--primary);font-size:14.5px}
.tp-kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 14px}
.tp-kv div{background:#faf6f7;border-radius:10px;padding:7px 10px;font-size:14px}
.tp-kv div.wide{grid-column:1/-1}
.tp-kv span{display:block;color:var(--muted);font-size:12px;font-weight:700}
.tp-kv b{font-weight:700;color:var(--text);word-break:break-word}
.tp-kv a{color:var(--primary);font-weight:800;text-decoration:none}
.tp-empty{color:#b9aeb1}
`;
  document.head.appendChild(st);
})();

/* ===================== صفحة المعلمة: النموذج ===================== */
let TP_ME = null, TP_CENTERS = [];
function tpFormHtml() {
  let h = '', open = false;
  TP_F.forEach(f => {
    if (f.s) { if (open) h += '</div>'; h += '<div class="tp-sec">' + f.s + '</div><div class="tp-grid">'; open = true; return; }
    const id = 'tp_' + f.k, lab = '<label for="' + id + '">' + f.l + (f.req ? '<span class="rq">*</span>' : '') + '</label>';
    let inp;
    if (f.center) inp = '<select id="' + id + '" onchange="tpCenterPick(this)"></select>';
    else if (f.opts) inp = '<select id="' + id + '"><option value="">اختاري</option>' + f.opts.map(o => '<option>' + esc(o) + '</option>').join('') + '</select>';
    else if (f.area) inp = '<textarea id="' + id + '" rows="3" maxlength="1000"></textarea>';
    else inp = '<input id="' + id + '"' + (f.type ? ' type="' + f.type + '"' : '') + (f.num ? ' inputmode="numeric"' : '') + (f.max ? ' maxlength="' + f.max + '"' : '') +
      (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.ro ? ' readonly' : '') + (f.ltr || f.num || f.ro ? ' dir="ltr" style="text-align:right"' : '') + (f.list ? ' list="' + id + '_l"' : '') + '>' +
      (f.list ? '<datalist id="' + id + '_l">' + f.list.map(o => '<option value="' + esc(o) + '">').join('') + '</datalist>' : '');
    h += '<div' + (f.wide ? ' class="wide"' : '') + '>' + lab + inp + '</div>';
  });
  return h + (open ? '</div>' : '');
}
// اختيار المركز: تُحدَّد الفترة تلقائياً من اسمه (ويمكن تغييرها)
function tpCenterPick(sel) {
  const o = sel.options[sel.selectedIndex], k = o && o.dataset ? o.dataset.p : '';
  const per = { am: 'الصباحية', pm: 'المسائية', both: 'الصباحية والمسائية' }[k];
  if (per) document.getElementById('tp_period').value = per;
}
async function tpOpenMine() {
  tShow('profView');
  const box = document.getElementById('tpForm');
  if (!box.dataset.built) { box.innerHTML = tpFormHtml(); box.dataset.built = '1'; }
  document.getElementById('tpAt').textContent = 'جارِ التحميل...';
  document.getElementById('tpSaveBtn').disabled = true;
  try {
    const out = await tApi('t_prof');
    TP_ME = out.data; TP_CENTERS = out.centers || [];
    const p = TP_ME || { name: out.name };
    p.phone = out.phone;
    if (!p.cat && out.cat) p.cat = out.cat;   // فئة التدريس من سجل المعلمات (إن وُجدت)
    const cfull = p.center ? (TP_CENTERS.find(c => cpName(c).replace(/\s+/g, '') === p.center.replace(/\s+/g, '') && (!p.period || !cpPer(c) || c.indexOf(p.period) > -1)) ||
      TP_CENTERS.find(c => cpName(c).replace(/\s+/g, '') === p.center.replace(/\s+/g, '')) || p.center) : '';
    document.getElementById('tp_center').innerHTML = centerOpts(TP_CENTERS, 'اختاري المركز', null);
    TP_KEYS.forEach(f => { const el = document.getElementById('tp_' + f.k); if (el && !f.center) el.value = p[f.k] || ''; });
    selSet('tp_center', cfull);
    if (!document.getElementById('tp_nat').value && !TP_ME) document.getElementById('tp_nat').value = 'سعودية';
    tpAtRender();
  } catch (e) {
    document.getElementById('tpAt').textContent = '';
    toast(e.message, false);
  } finally { document.getElementById('tpSaveBtn').disabled = false; }
}
function tpAtRender() {
  document.getElementById('tpAt').innerHTML = TP_ME && TP_ME.at ? '<span class="tp-done">✔ بياناتكِ محفوظة</span> — آخر تحديث: ' + tpAt(TP_ME.at) : 'لم تُحفظ بياناتكِ بعد';
  const b = document.getElementById('tpNewBadge'); if (b) b.classList.toggle('hidden', !!TP_ME);
}
async function tpSaveMine(btn) {
  const data = {};
  TP_KEYS.forEach(f => { const el = document.getElementById('tp_' + f.k); if (el) data[f.k] = el.value.trim(); });
  const miss = TP_KEYS.find(f => f.req && !data[f.k]);
  if (miss) { toast('أكملي خانة «' + miss.l + '»', false); const el = document.getElementById('tp_' + miss.k); if (el) el.focus(); return; }
  const nid = data.nid.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
  if (nid.length !== 10) { toast('رقم الهوية / الإقامة يتكون من ١٠ أرقام', false); document.getElementById('tp_nid').focus(); return; }
  data.nid = nid;
  setBtnBusy(btn, true, 'جارِ الحفظ...');
  try {
    const out = await tApi('t_prof_save', { data });
    TP_ME = out.data; if (TME) TME.prof = true;
    tpAtRender();
    toast('تم حفظ بياناتكِ، وتظهر الآن لمديرة مركزكِ ومشرفاتكِ');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ===================== المديرة والمشرفات: عرض بيانات المعلمات ===================== */
let TP_LIST = [], TP_CTX = {};
function tpCard(p) {
  const ini = String(p.name || '?').trim().charAt(0), i = TP_LIST.indexOf(p);
  return '<div class="tp-card"><div class="tp-row" onclick="tpDocOpen(' + i + ')"><div class="tp-av">' + esc(ini) + '</div><div class="tp-hd"><b>' + esc(p.name) + '</b><small>' +
    (p.cat ? esc(p.cat) : 'معلمة') + (TP_CTX.byCenter ? '' : ' — الفترة ' + esc(p.period)) + ' — الجوال: <span dir="ltr">' + esc(tpD(p.phone)) + '</span></small></div>' +
    '<button type="button" class="btn light tp-open">عرض الاستمارة</button></div></div>';
}
/* ---------- استمارة بيانات المعلمة (مثل باقي الاستمارات: عرض ثم حفظ PDF أو Excel) ---------- */
const TPD_CSS = `
.im-page.tpd{width:794px;min-height:1123px;position:relative;background:#fff}
.im-page.tpd .idc-body{padding:0 36px 30px}
.im-page.tpd .idc-title{font-size:24px;margin:14px 0 12px}
.im-page.tpd table{table-layout:fixed;margin-bottom:12px}
.im-page.tpd th.tpd-sec{background:#f2dbdb;color:#000;font-size:16px;text-align:right;padding:7px 12px}
.im-page.tpd td{font-size:14.5px;padding:7px 10px;height:38px;text-align:right}
.im-page.tpd td.idc-lbl{width:auto;background:#f2f2f2;font-weight:800}
.im-page.tpd td.tpd-long{height:64px;vertical-align:top;white-space:pre-wrap}
.im-page.tpd .tpd-at{font-size:12.5px;color:#666;margin-top:6px}
`;
function tpDocPlain(p, f) {
  const v = p[f.k];
  if (!v) return '';
  if (f.type === 'date') return tpDate(v);
  if (f.k === 'hifz') return esc(tpD(v)) + ' جزءاً';
  return esc(f.num || f.ro ? tpD(v) : v);
}
function tpDocHtml(p) {
  const secs = []; let cur = null;
  TP_F.forEach(f => { if (f.s) { cur = { t: f.s, f: [] }; secs.push(cur); } else cur.f.push(f); });
  const tbl = sec => {
    let rows = '', pair = [];
    const flush = () => { if (!pair.length) return; rows += '<tr>' + pair.map(f => '<td class="idc-lbl">' + f.l + '</td><td>' + tpDocPlain(p, f) + '</td>').join('') + (pair.length === 1 ? '<td class="idc-lbl"></td><td></td>' : '') + '</tr>'; pair = []; };
    sec.f.forEach(f => {
      if (f.wide) { flush(); rows += '<tr><td class="idc-lbl">' + f.l + '</td><td class="tpd-long" colspan="3">' + tpDocPlain(p, f) + '</td></tr>'; return; }
      pair.push(f); if (pair.length === 2) flush();
    });
    flush();
    return '<table><colgroup><col style="width:25%"><col style="width:25%"><col style="width:25%"><col style="width:25%"></colgroup><tr><th class="tpd-sec" colspan="4">' + sec.t + '</th></tr>' + rows + '</table>';
  };
  return '<div class="im-page tpd"><img class="idc-lh" src="' + ID_LETTERHEAD + '" width="2000" height="351" alt=""><div class="idc-body">' +
    '<div class="idc-title">استمارة بيانات معلمة</div>' + secs.map(tbl).join('') +
    '<div class="tpd-at">آخر تحديث من المعلمة: ' + tpAt(p.at) + '</div></div></div>';
}
let TP_DOC = null;
function tpDocOpen(i) {
  const p = TP_LIST[i]; if (!p) return;
  TP_DOC = p;
  document.getElementById('tpListPane').classList.add('hidden');
  const d = document.getElementById('tpDocPane'); d.classList.remove('hidden');
  d.innerHTML = '<button class="back" type="button" onclick="tpDocClose()">← قائمة المعلمات</button>' +
    '<div class="ex-bar">' + (typeof dxBar === 'function' ? dxBar('tpdPdf', 'tpdXls') : '<button class="btn light" id="tpdPdf">حفظ PDF</button>') + '</div>' +
    '<div class="tpd-fit"><div class="tpd-in"><style>' + ID_CSS + TPD_CSS + '</style><div class="idoc ptdoc" style="width:794px;padding:0">' + tpDocHtml(p) + '</div></div></div>';
  document.getElementById('tpdPdf').onclick = e => tpDocPdf(e.currentTarget);
  const x = document.getElementById('tpdXls'); if (x) x.onclick = e => tpDocXlsx(e.currentTarget);
  tpDocFit();
  window.scrollTo(0, 0);
}
function tpDocClose() {
  const d = document.getElementById('tpDocPane'), l = document.getElementById('tpListPane');
  if (d) d.classList.add('hidden');
  if (l) l.classList.remove('hidden');
}
// الاستمارة بعرض الشاشة (تصغير على الجوال)
function tpDocFit() {
  const w = document.querySelector('.tpd-fit'), inn = w && w.querySelector('.tpd-in'); if (!inn) return;
  const r = Math.min(1, w.clientWidth / 794);
  inn.style.transform = 'scale(' + r + ')';
  inn.style.right = Math.max(0, (w.clientWidth - 794 * r) / 2) + 'px';   // في الوسط على الشاشات الواسعة
  w.style.height = Math.ceil(inn.offsetHeight * r) + 'px';
}
window.addEventListener('resize', () => { const d = document.getElementById('tpDocPane'); if (TP_DOC && d && !d.classList.contains('hidden')) tpDocFit(); });
const tpDocName = p => 'استمارة_بيانات_' + String(p.name || 'معلمة').trim().replace(/\s+/g, '_');
async function tpDocPdf(btn) {
  if (!TP_DOC) return;
  setBtnBusy(btn, true, 'جارِ التجهيز...');
  try { idSaveBlob(await idPagesPdf([tpDocHtml(TP_DOC)], TPD_CSS, true), tpDocName(TP_DOC) + '.pdf'); toast('تم التحميل'); }
  catch (e) { toast(e.message || 'تعذّر تحميل PDF', false); }
  finally { setBtnBusy(btn, false); }
}
async function tpDocXlsx(btn) {
  if (!TP_DOC) return;
  setBtnBusy(btn, true, 'جارِ التجهيز...');
  try { dxSave(await docXlsxBlob('<style>' + ID_CSS + TPD_CSS + '.idoc{width:794px;padding:0}</style><div class="idoc ptdoc">' + tpDocHtml(TP_DOC) + '</div>', { width: 794 }), tpDocName(TP_DOC) + '.xlsx'); toast('تم التحميل'); }
  catch (e) { toast(e.message || 'تعذّر تحميل Excel', false); }
  finally { setBtnBusy(btn, false); }
}
function tpFiltered() {
  const q = (document.getElementById('tpQ') || {}).value || '';
  const n = s => String(s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, '');
  const k = n(q);
  return k ? TP_LIST.filter(p => [p.name, p.center, p.phone, p.nid].some(v => n(v).indexOf(k) > -1)) : TP_LIST;
}
function tpRenderList() {
  const box = document.getElementById('tpList'); if (!box) return;
  const L = tpFiltered();
  const am = TP_LIST.filter(p => /صباح/.test(p.period) && !/مسائ/.test(p.period)).length, pm = TP_LIST.filter(p => /مسائ/.test(p.period) && !/صباح/.test(p.period)).length;
  document.getElementById('tpCnt').innerHTML = '<span>عدد المعلمات: ' + tpD(TP_LIST.length) + '</span>' + (am ? '<span>الفترة الصباحية: ' + tpD(am) + '</span>' : '') + (pm ? '<span>الفترة المسائية: ' + tpD(pm) + '</span>' : '');
  if (!TP_LIST.length) { box.innerHTML = '<p class="empty">' + (TP_CTX.empty || 'لم تعبّئ أي معلمة بياناتها بعد') + '</p>'; return; }
  if (!L.length) { box.innerHTML = '<p class="empty">لا توجد نتائج</p>'; return; }
  if (!TP_CTX.byCenter) { box.innerHTML = L.map(tpCard).join(''); return; }
  const groups = {};
  L.forEach(p => { const g = p.center + (p.period ? ' - الفترة ' + p.period : ''); (groups[g] = groups[g] || []).push(p); });
  box.innerHTML = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'ar')).map(g => '<div class="tp-gh"><span>' + esc(g) + '</span><small>' + tpD(groups[g].length) + '</small></div>' + groups[g].map(tpCard).join('')).join('');
}
// يُبنى داخل عنصر الصفحة: أدوات البحث والتحميل + القائمة
function tpShell(boxId) {
  const el = document.getElementById(boxId);
  if (el.dataset.built) return;
  el.dataset.built = '1';
  el.innerHTML = '<div id="tpListPane"><div class="tp-tools"><input id="tpQ" placeholder="بحث بالاسم أو المركز أو الجوال أو الهوية" oninput="tpRenderList()">' +
    '<button class="btn light" id="tpPdfBtn" onclick="tpPdf(this)">' + (typeof DX_ICO_PDF !== 'undefined' ? DX_ICO_PDF : '') + 'حفظ PDF</button>' +
    (typeof exRun === 'function' ? '<button class="btn light" onclick="tpXlsx(this)">' + (typeof DX_ICO_XLS !== 'undefined' ? DX_ICO_XLS : '') + 'حفظ Excel</button>' : '') + '</div>' +
    '<div class="tp-cnt" id="tpCnt"></div><div id="tpList"><p class="empty">جارِ التحميل...</p></div></div><div id="tpDocPane" class="hidden"></div>';
}
// load: دالة تجلب القائمة؛ ctx: { byCenter, who, title }
async function tpLoadView(boxId, load, ctx) {
  TP_CTX = ctx || {};
  tpShell(boxId);
  document.getElementById('tpQ').value = '';
  tpDocClose();
  const ck = 'tp_list_' + (TP_CTX.who || '');
  try { const c = JSON.parse(sessionStorage.getItem(ck) || 'null'); if (c) { TP_LIST = c; tpRenderList(); } } catch (e) {}
  try {
    const out = await load();
    TP_LIST = out.data || [];
    if (out.noCenters) TP_CTX.empty = 'لم تحددي «المراكز المشرفة عليها» بعد، فلا تظهر معلمات. حدديها من أيقونة «المراكز المشرفة عليها».';
    try { sessionStorage.setItem(ck, JSON.stringify(TP_LIST)); } catch (e) {}
    tpRenderList();
  } catch (e) {
    if (!TP_LIST.length) document.getElementById('tpList').innerHTML = '<p class="empty">' + esc(e.message || 'تعذّر التحميل') + '</p>';
    toast(e.message || 'تعذّر التحميل', false);
  }
}
function tpHDate() {
  try {
    const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date());
    const g = t => ((p.find(x => x.type === t) || {}).value || '').replace(/\D/g, '');
    return '<span class="tp-date"><bdi>' + tpD(g('day')) + '</bdi> / <bdi>' + tpD(g('month')) + '</bdi> / <bdi>' + tpD(g('year')) + 'هـ</bdi></span>';
  } catch (e) { return ''; }
}
const tpSorted = () => tpFiltered().slice();
// PDF أفقي بالكليشة: أهم البيانات في جدول
const TP_PDF_COLS = [['name', 'الاسم'], ['nid', 'رقم الهوية'], ['phone', 'الجوال'], ['center', 'المركز'], ['period', 'الفترة'],
  ['cat', 'فئة التدريس'], ['qual', 'المؤهل'], ['major', 'التخصص'], ['hifz', 'الحفظ'], ['exp', 'الخبرة']];
const TP_CSS = `
.im-page.tpp{width:1123px;height:794px;overflow:hidden;position:relative;background:#fff}
.im-page.tpp .idc-body{padding:0 26px}
.im-page.tpp .idc-title{font-size:22px;margin:12px 0 8px}
.im-page.tpp .tp-meta{display:flex;flex-wrap:wrap;gap:6px 26px;font-weight:700;margin:0 0 8px;font-size:14.5px}
.im-page.tpp table{width:100%;border-collapse:collapse;table-layout:fixed}
.im-page.tpp th{background:#f2dbdb;color:#000;font-size:12.5px;padding:5px 3px;border:1px solid #000;font-weight:800}
.im-page.tpp td{border:1px solid #000;font-size:12px;padding:4px 3px;height:34px;text-align:center;line-height:1.35;word-break:break-word}
.im-page.tpp td.r{text-align:right}
.im-page.tpp td.idc-n{background:#f2f2f2}
.im-page.tpp .tp-pg{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:12px;color:#777}
`;
async function tpPdf(btn) {
  const L = tpSorted();
  if (!L.length) return toast('لا توجد بيانات للتحميل', false);
  setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    const per = 13, pages = [];
    for (let i = 0; i < L.length; i += per) pages.push(L.slice(i, i + per));
    const W = { name: 150, nid: 92, phone: 92, center: 140, period: 76, cat: 100, qual: 72, major: 90, hifz: 46, exp: 46 };
    const val = (p, k) => k === 'hifz' || k === 'exp' ? esc(tpD(p[k])) : esc(/nid|phone/.test(k) ? tpD(p[k]) : p[k] || '');
    const html = pages.map((rows, pi) => '<div class="im-page tpp"><img class="idc-lh" src="' + ID_LETTERHEAD + '" width="2000" height="351" alt=""><div class="idc-body">' +
      '<div class="idc-title">' + esc(TP_CTX.title || 'بيانات المعلمات') + '</div>' +
      '<div class="tp-meta">' + (TP_CTX.who ? '<span>' + esc(TP_CTX.whoLabel || '') + esc(TP_CTX.who) + '</span>' : '') + '<span>عدد المعلمات: ' + tpD(L.length) + '</span>' +
      '<span>التاريخ: ' + tpHDate() + '</span>' + '</div>' +
      '<table><colgroup><col style="width:34px">' + TP_PDF_COLS.map(c => '<col style="width:' + W[c[0]] + 'px">').join('') + '</colgroup><tr><th>م</th>' + TP_PDF_COLS.map(c => '<th>' + c[1] + '</th>').join('') + '</tr>' +
      rows.map((p, k) => '<tr><td class="idc-n">' + tpD(pi * per + k + 1) + '</td>' + TP_PDF_COLS.map(c => '<td' + (c[0] === 'name' || c[0] === 'center' ? ' class="r"' : '') + '>' + val(p, c[0]) + '</td>').join('') + '</tr>').join('') +
      '</table></div>' + (pages.length > 1 ? '<div class="tp-pg">صفحة ' + tpD(pi + 1) + ' من ' + tpD(pages.length) + '</div>' : '') + '</div>');
    idSaveBlob(await idPagesPdf(html, TP_CSS, false), 'بيانات_المعلمات.pdf');
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر تحميل PDF', false); }
  finally { setBtnBusy(btn, false); }
}
function tpXlsx(btn) {
  const L = tpSorted();
  if (!L.length) return toast('لا توجد بيانات للتحميل', false);
  const cols = TP_KEYS;
  exRun({ title: TP_CTX.title || 'بيانات المعلمات', file: 'بيانات_المعلمات', landscape: true,
    info: (TP_CTX.who ? [[String(TP_CTX.whoLabel || '').replace(/[:：]\s*$/, ''), TP_CTX.who]] : []).concat([['عدد المعلمات', String(L.length)]]),
    cols: ['م'].concat(cols.map(f => f.l)).concat(['آخر تحديث']),
    widths: [6].concat(cols.map(f => f.k === 'name' ? 30 : f.k === 'skills' || f.k === 'other' ? 40 : f.k === 'center' ? 26 : 18)).concat([18]),
    sections: [{ title: '', rows: L.map((p, i) => [i + 1].concat(cols.map(f => p[f.k] || '')).concat([p.at || ''])) }], totals: [], notes: [] }, btn);
}
