/* ===================== المراكز المشرفة عليها (مشترك بين جميع الوحدات) =====================
   كل مشرفة تحدد المراكز التي تشرف عليها (تُحفظ في ورقة «مراكز المشرفات»)، مع عرضها مقسّمة حسب الفترة
   وتحميلها PDF وExcel. يُستخدم في: مشرفات الوحدات (mushrifat.html)، تحفيظ الصغار (sighar.html)، الإشراف الإداري (idari.html).
   يتطلب: config.js، export.js، idari-print.js، وعنصر #mcView في الصفحة. */
const mc$ = id => document.getElementById(id);
// اسم المشرفة: من مفتاح اسم الوحدة إن وُجد، وإلا اسم المستخدم
function mcMyName() {
  try { if (typeof NAME_KEY !== 'undefined' && localStorage.getItem(NAME_KEY)) return localStorage.getItem(NAME_KEY); } catch (e) {}
  return getUser();
}
let MYC = cacheGet('mycenters') || [];
let mcLoaded = false, mcUser = getUser(), mcFetching = null;
const mcNorm = s => String(s || '').trim();
async function mcFetch() {
  if (mcFetching) return mcFetching;
  const before = JSON.stringify(MYC);
  mcFetching = (async () => {
    try { const out = await api('getMyCenters'); MYC = out.data || []; cacheSet('mycenters', MYC); mcLoaded = true; } catch (e) {}
    mcFetching = null;
    if (JSON.stringify(MYC) !== before) mcRefreshLists();
  })();
  return mcFetching;
}
// المراكز التي تظهر في الاستمارات وكشف الخروج: المراكز المشرفة عليها (بأسمائها كما في «القوائم»)، مرتبة: الصباحية ثم المسائية.
// إن لم تحدد المشرفة مراكزها بعد: كل المراكز
function myCenters() {
  const all = mcAll();
  if (!getUser()) return all;
  if (mcUser !== getUser()) { mcUser = getUser(); MYC = cacheGet('mycenters') || []; mcLoaded = false; }   // دخول بحساب آخر
  if (!mcLoaded && !mcFetching && getPw()) setTimeout(mcFetch, 0);
  if (!MYC.length) return all;
  const byKey = {}; all.forEach(c => { byKey[mcKey(c)] = c; });
  const L = [...new Set(MYC.map(mcNorm).filter(Boolean).map(c => byKey[mcKey(c)] || c))].sort((a, b) => mcName(a).localeCompare(mcName(b), 'ar'));
  return mcGroups(L).reduce((o, g) => o.concat(g.list), []);
}
// إعادة تعبئة قوائم المراكز في الصفحة بعد تغيّر المراكز المشرفة عليها
function mcRefreshLists() { try { if (typeof fillLists === 'function') fillLists(); } catch (e) {} }
// قائمة المراكز للاختيار: من «القوائم» (اسم المركز + عمود الفترة)
const mcAll = () => (LISTS.centers || []).map(mcNorm).filter(Boolean);
// مفتاح المطابقة: الاسم + الفترة (يتجاهل اختلاف المسافات حول «-»)
const mcKey = c => mcName(c) + '|' + mcPeriod(c);
async function mcOpen() {
  show('mcView');
  mc$('mcSearch').value = '';
  mcSel = mcSelFromSaved();
  mc$('mcPickFold').open = !MYC.length;   // القائمة مصغّرة إن سبق الاختيار
  mcRender(); mcSavedRender();
  await mcFetch();
  mcSel = mcSelFromSaved();
  if (!MYC.length) mc$('mcPickFold').open = true;
  mcRender(); mcSavedRender();
}
// المراكز المحفوظة (تحت القائمة) + تحميلها PDF وExcel
const mcSorted = () => MYC.map(mcNorm).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ar'));
// الفترة من اسم المركز: «... - الفترة الصباحية» أو «... - الفترة المسائية»
function mcPeriod(c) {
  const t = String(c || '').replace(/[أإآ]/g, 'ا');
  const m = /مسائ/.test(t), s = /صباح/.test(t);
  return m && s ? 'both' : m ? 'pm' : s ? 'am' : '';
}
// اسم المركز بدون الفترة: «أم حكيم - الفترة الصباحية» ← «أم حكيم» (الفترة تظهر في عنوان المجموعة)
const mcName = c => String(c || '').replace(/\s*[-–—]?\s*(ال)?فتر(ة|تين|تان)\s+.*$/, '').trim() || String(c || '').trim();
const MC_GROUPS = [['am', 'توزيع المراكز - الفترة الصباحية'], ['pm', 'توزيع المراكز - الفترة المسائية'], ['both', 'توزيع المراكز - الفترتان الصباحية والمسائية'], ['', 'توزيع المراكز - بدون فترة محددة']];
// تقسيم المراكز حسب الفترة: [{ k, title, list }]
const mcGroups = L => MC_GROUPS.map(([k, title]) => ({ k, title, list: L.filter(c => mcPeriod(c) === k) })).filter(g => g.list.length);
function mcPeriodLine(L, lead) {
  const am = L.filter(c => mcPeriod(c) === 'am').length, pm = L.filter(c => mcPeriod(c) === 'pm').length,
    both = L.filter(c => mcPeriod(c) === 'both').length, none = L.length - am - pm - both;
  return '<div class="mc-per">' + (lead ? '<b>' + lead + '</b>' : '') + '<span class="mc-p am">الفترة الصباحية: ' + am + '</span><span class="mc-p pm">الفترة المسائية: ' + pm + '</span>' +
    (both ? '<span class="mc-p">صباحية ومسائية: ' + both + '</span>' : '') + (none ? '<span class="mc-p">بدون فترة: ' + none + '</span>' : '') + '</div>';
}
function mcSavedRender() {
  const L = mcSorted();
  mc$('mcSavedCnt').textContent = L.length;
  mc$('mcSaved').innerHTML = L.length ? mcPeriodLine(L) + '<div class="tbl-wrap"><table class="mc-tbl"><colgroup><col style="width:56px"><col></colgroup><tbody>' +
    mcGroups(L).map(g => '<tr class="mc-gh"><td colspan="2">' + g.title + '</td></tr>' + g.list.map((c, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(mcName(c)) + '</td></tr>').join('')).join('') + '</tbody></table></div>'
    : '<p class="empty">لم تحددي المراكز بعد. افتحي «اختيار المراكز» أعلاه.</p>';
}
const MC_CSS = `
.im-page.mcp{width:794px;height:1123px;overflow:hidden;position:relative;background:#fff;font-size:16px}
.im-page.mcp .idc-body{padding:0 40px}
.im-page.mcp .idc-title{font-size:22px;margin:14px 0 10px}
.im-page.mcp .mc-meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px 18px;font-weight:700;margin:0 0 10px}
.im-page.mcp td{height:36px;padding:4px 10px;font-size:16px}
.im-page.mcp td.r{text-align:right}
.im-page.mcp tr.mc-gh td{background:#d9d9d9 !important;color:#000;font-weight:800;text-align:right;font-size:16.5px;border-color:#000}
.im-page.mcp td{border-color:#000}
.im-page.mcp td.idc-n{color:#000;background:#f2f2f2}
.im-page.mcp .mc-pg{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:12px;color:#777}
`;
function mcHDate() {
  try {
    const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date());
    const g = t => ((p.find(x => x.type === t) || {}).value || '').replace(/\D/g, '');
    return '<span class="idc-date"><bdi>' + idDigits(g('day')) + '</bdi>/<bdi>' + idDigits(g('month')) + '</bdi>/<bdi>' + idDigits(g('year')) + 'هـ</bdi></span>';   // اليوم ثم الشهر ثم السنة (بالاتجاه الصحيح)
  } catch (e) { return ''; }
}
async function mcPdf(btn) {
  const L = mcSorted();
  if (!L.length) return toast('لا توجد مراكز محفوظة', false);
  setBtnBusy(btn, true, 'جارِ التجهيز...');
  try {
    // صفوف مجمّعة حسب الفترة: عنوان لكل فترة ثم مراكزها بترقيم مستقل
    const items = [];
    mcGroups(L).forEach(g => {
      items.push({ h: 1, html: '<tr class="mc-gh"><td colspan="2">' + g.title + '</td></tr>' });
      g.list.forEach((c, k) => items.push({ html: '<tr><td class="idc-n">' + idDigits(k + 1) + '</td><td class="r">' + esc(mcName(c)) + '</td></tr>' }));
    });
    const per = 20, pages = [];
    let cur = [];
    items.forEach(it => {
      if (cur.length >= per) { const carry = cur[cur.length - 1].h ? [cur.pop()] : []; pages.push(cur.map(x => x.html).join('')); cur = carry; }
      cur.push(it);
    });
    if (cur.length) pages.push(cur.map(x => x.html).join(''));
    const val = x => '<span class="idc-m">' + x + '</span>';
    const html = pages.map((rows, i) => '<div class="im-page mcp"><img class="idc-lh" src="' + ID_LETTERHEAD + '" width="2000" height="351" alt=""><div class="idc-body">' +
      '<div class="idc-title">المراكز المشرفة عليها</div>' +
      '<div class="mc-meta"><span>المشرفة: ' + val(esc(mcMyName())) + '</span><span>عدد المراكز: ' + val(idDigits(L.length)) + '</span><span>التاريخ: ' + val(mcHDate()) + '</span></div>' +
      '<div class="mc-meta" style="justify-content:flex-start;gap:30px"><span>الفترة الصباحية: ' + val(idDigits(L.filter(c => mcPeriod(c) === 'am').length)) + '</span><span>الفترة المسائية: ' + val(idDigits(L.filter(c => mcPeriod(c) === 'pm').length)) + '</span></div>' +
      '<table><colgroup><col style="width:70px"><col></colgroup>' + rows + '</table></div>' +
      (pages.length > 1 ? '<div class="mc-pg">صفحة ' + idDigits(i + 1) + ' من ' + idDigits(pages.length) + '</div>' : '') + '</div>');
    idSaveBlob(await idPagesPdf(html, MC_CSS, true), 'المراكز_المشرفة_عليها.pdf');
    toast('تم التحميل');
  } catch (e) { toast(e.message || 'تعذّر تحميل PDF', false); }
  finally { setBtnBusy(btn, false); }
}
function mcXlsx(btn) {
  const L = mcSorted();
  if (!L.length) return toast('لا توجد مراكز محفوظة', false);
  exRun({ title: 'المراكز المشرفة عليها', file: 'المراكز_المشرفة_عليها', landscape: false,
    info: [['المشرفة', mcMyName()], ['عدد المراكز', String(L.length)],
      ['الفترة الصباحية', String(L.filter(c => mcPeriod(c) === 'am').length)], ['الفترة المسائية', String(L.filter(c => mcPeriod(c) === 'pm').length)]],
    cols: ['م', ''], widths: [8, 70], sections: mcGroups(L).map(g => ({ title: g.title, rows: g.list.map((c, i) => [i + 1, mcName(c)]) })), totals: [], notes: [] }, btn);
}
let mcSel = new Set();
// المراكز المحفوظة بأسمائها كما في القائمة الحالية (لتبقى محددة حتى لو اختلفت كتابة الفترة)
function mcSelFromSaved() {
  const byKey = {}; mcAll().forEach(c => { byKey[mcKey(c)] = c; });
  return new Set(MYC.map(mcNorm).filter(Boolean).map(c => byKey[mcKey(c)] || c));
}
function mcRender() {
  const all = mcAll();
  const q = mc$('mcSearch').value.trim();
  const shown = all.filter(c => !q || c.indexOf(q) > -1);
  // القائمة مقسّمة: الفترة الصباحية ثم المسائية (مع «تحديد الكل» لكل فترة)
  mc$('mcList').innerHTML = shown.length ? mcGroups(shown).map(g => {
    const gAll = all.filter(c => mcPeriod(c) === g.k), on = gAll.filter(c => mcSel.has(c)).length;
    return '<div class="mc-grp"><div class="mc-grp-h"><span>' + g.title.replace('توزيع المراكز - ', '') + ' <small>(' + on + ' / ' + gAll.length + ')</small></span>' +
      '<label class="mc-grp-all"><input type="checkbox" data-k="' + g.k + '"' + (gAll.length && on === gAll.length ? ' checked' : '') + ' onchange="mcToggleGroup(this)"><span>تحديد الكل</span></label></div>' +
      '<div class="mc-grp-b">' + g.list.map(c => '<label class="check mc-item"><input type="checkbox" value="' + esc(c) + '"' + (mcSel.has(c) ? ' checked' : '') + ' onchange="mcPick(this)"><span>' + esc(mcName(c)) + '</span></label>').join('') + '</div></div>';
  }).join('')
    : '<p class="empty">' + (all.length ? 'لا يوجد مركز بهذا الاسم' : 'جارِ تحميل المراكز...') + '</p>';
  mc$('mcAll').checked = all.length > 0 && all.every(c => mcSel.has(c));
  mc$('mcCount').textContent = 'المراكز المحددة: ' + mcSel.size + ' من ' + all.length;
  mc$('mcPickCnt').textContent = mcSel.size + ' / ' + all.length;
}
function mcPick(el) { if (el.checked) mcSel.add(el.value); else mcSel.delete(el.value); mcRender(); }
function mcToggleGroup(el) { mcAll().filter(c => mcPeriod(c) === el.dataset.k).forEach(c => el.checked ? mcSel.add(c) : mcSel.delete(c)); mcRender(); }
function mcToggleAll(on) { mcAll().forEach(c => on ? mcSel.add(c) : mcSel.delete(c)); mcRender(); }
async function mcSave() {
  const btn = mc$('mcSaveBtn');
  setBtnBusy(btn, true, 'جارِ الحفظ...');
  try {
    const list = [...mcSel];
    const out = await api('saveMyCenters', { centers: list });
    MYC = out.data || list; cacheSet('mycenters', MYC);
    toast('تم حفظ المراكز المشرفة عليها');
    mcRefreshLists();
    mc$('mcPickFold').open = false;
    mcSavedRender();
    window.scrollTo({ top: mc$('mcSaved').getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
  } catch (e) { toast(e.message || 'تعذّر الحفظ', false); }
  finally { setBtnBusy(btn, false); }
}
