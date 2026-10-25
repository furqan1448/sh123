/* ===== محاضر الاجتماعات (الإشراف التربوي وتحفيظ الصغار) =====
   تكتب المشرفة المحضر وتنشره لكل المعلمات أو لمعلمات محددات، فيصل لهن في أيقونة «المعلمات» ويضغطن «تم الاطلاع».
   بدون تواقيع. العرض و PDF بالكليشة الحمراء (صفحة A4 طولية). يُحمَّل بعد idari-print.js و sighar-print.js. */
const MN_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* ---------- شكل المحضر (نفس النموذج الورقي بدون تواقيع) ---------- */
const MN_CSS = `
.idoc.mn{width:794px;font-size:17px}
.idoc.mn .idc-body{padding:0 40px}
.idoc.mn .idc-title{font-size:24px;margin:18px 0 12px}
.idoc.mn p{margin:0 0 8px;line-height:1.9;font-weight:600}
.idoc.mn .mn-h{font-weight:800;margin:12px 0 4px}
.idoc table{min-width:0}
.idoc.mn .mn-ol{margin:0 0 6px;padding-right:6px}
.idoc.mn .mn-li{display:flex;gap:8px;line-height:1.9;font-weight:600}
.idoc.mn .mn-li b{color:#7a1f2b;min-width:24px;flex:none}
.idoc.mn .mn-parts{display:flex;gap:16px;margin-top:6px}
.idoc.mn .mn-parts table{flex:1;font-size:16px}
.idoc.mn .mn-parts td{text-align:right;padding:6px 10px;height:34px}
.idoc.mn .mn-parts td.idc-n{text-align:center;width:44px}
`;
function mnDocHtml(rec, sigs, lhUrl) {
  const d = rec.data || {};
  const m = x => '<span class="idc-m">' + x + '</span>';
  const head = '<img class="idc-lh" src="' + esc(lhUrl || SG_BG) + '" width="2000" height="351" alt="">';
  const no = esc(idDigits(rec.no || ''));
  const date = d.hy ? '<span class="idc-date"><bdi>' + idDigits(d.hd) + '</bdi> / <bdi>' + idDigits(d.hm) + '</bdi> / <bdi>' + idDigits(d.hy) + 'هـ</bdi></span>' : '';
  const ol = L => '<div class="mn-ol">' + (L || []).map((x, i) => '<div class="mn-li"><b>' + idDigits(i + 1) + '-</b><span>' + esc(x) + '</span></div>').join('') + '</div>';
  const parts = d.parts || [];
  let parts2 = '';
  if (parts.length) {
    const half = Math.ceil(parts.length / 2);
    const tbl = (from, to) => '<table><tr><th style="width:44px">م</th><th>الاسم</th></tr>' +
      parts.slice(from, to).map((n, i) => '<tr><td class="idc-n">' + idDigits(from + i + 1) + '</td><td>' + esc(n) + '</td></tr>').join('') + '</table>';
    parts2 = '<div class="mn-h">المشاركات في الاجتماع:</div><div class="mn-parts idc-avoid">' + tbl(0, half) + (parts.length > 1 ? tbl(half, parts.length) : '') + '</div>';
  }
  return '<div class="idoc sg mn">' + head + '<div class="idc-body">' +
    '<div class="idc-title">محضر اجتماع رقم ( ' + no + ' )</div>' +
    '<p>الحمد لله رب العالمين، والصلاة والسلام على أشرف الأنبياء والمرسلين سيدنا محمد وعلى آله وصحبه وسلم تسليماً كثيراً، وبعد:</p>' +
    '<p>في يوم: ' + m(esc(rec.dayName || '')) + ' الموافق: ' + m(date) + ' عُقد الاجتماع رقم ( ' + m(no) + ' )' + (rec.center ? ' بمركز / ' + m(esc(rec.center)) : '') + '</p>' +
    '<div class="mn-h">وكانت نقاط الاجتماع كالتالي:</div>' + ol(d.points) +
    (d.outs && d.outs.length ? '<div class="mn-h">وقد تم الاجتماع بحمد الله تعالى، وخلص إلى النقاط التالية:</div>' + ol(d.outs) : '') +
    parts2 + '</div></div>';
}

/* ---------- واجهة المشرفة ---------- */
let MN = [], mnEdit = null, MN_DIR = null, mnPicked = [];
const mn$ = id => document.getElementById(id);

// إضافة الشاشات إلى الصفحة مرة واحدة
(function mnInject() {
  const wrap = document.querySelector('.wrap'); if (!wrap || window.MN_NO_UI) return;   // صفحة المعلمات تستخدم شكل المحضر فقط
  const div = document.createElement('div');
  div.innerHTML = `
  <div id="mnListView" class="hidden">
    <button class="back" onclick="show('homeView')">← رجوع</button>
    <div class="card">
      <h2>محاضر الاجتماعات</h2>
      <p class="rp-hint">يُنشر المحضر لكل المعلمات أو لمعلمات تحددينهن، فيصلهن في أيقونة «المعلمات» ويضغطن «تم الاطلاع».</p>
      <button class="btn block" onclick="mnNew()">＋ محضر جديد</button>
    </div>
    <div class="card">
      <h2>المحاضر المنشورة</h2>
      <div id="mnList"><p class="empty">جارِ التحميل...</p></div>
    </div>
  </div>
  <div id="mnForm" class="hidden">
    <button class="back" onclick="mnBack()">← رجوع</button>
    <div class="mn-edit-note hidden" id="mnEditNote" style="background:#fbf3e0;border:1.5px solid var(--gold);border-radius:12px;padding:10px 14px;margin-bottom:12px;font-weight:700;color:var(--primary)">وضع التعديل: يُحفظ التعديل على نفس المحضر.</div>
    <div class="card">
      <h2>محضر اجتماع</h2>
      <div class="row2">
        <div><label for="mnNo" style="margin-top:0">رقم الاجتماع</label><input id="mnNo" inputmode="numeric"></div>
        <div><label for="mnCenter" style="margin-top:0">المركز</label><select id="mnCenter"></select></div>
      </div>
      <div class="hd-grid">
        <div><label for="mnDay">اليوم</label><select id="mnDay"></select></div>
        <div><label for="mnHD">التاريخ: اليوم</label><select id="mnHD"></select></div>
        <div><label for="mnHM">الشهر</label><select id="mnHM"></select></div>
        <div><label for="mnHY">السنة</label><input id="mnHY" inputmode="numeric" maxlength="4"></div>
      </div>
    </div>
    <div class="card">
      <h2>نقاط الاجتماع</h2>
      <div id="mnPoints"></div>
      <button type="button" class="btn light block" onclick="mnAdd('mnPoints')">＋ إضافة نقطة</button>
    </div>
    <div class="card">
      <h2>ما خلص إليه الاجتماع</h2>
      <div id="mnOuts"></div>
      <button type="button" class="btn light block" onclick="mnAdd('mnOuts')">＋ إضافة نقطة</button>
    </div>
    <div class="card">
      <h2>المشاركات في الاجتماع</h2>
      <p class="rp-hint" style="margin-top:0">اسم في كل سطر (بدون تواقيع).</p>
      <div id="mnParts"></div>
      <button type="button" class="btn light block" onclick="mnAdd('mnParts', '', true)">＋ إضافة مشاركة</button>
    </div>
    <div class="card">
      <h2>لمن يُنشر المحضر؟</h2>
      <div class="chips" id="mnMode">
        <label class="chip"><input type="radio" name="mnMode" value="all"><span>كل المعلمات</span></label>
        <label class="chip"><input type="radio" name="mnMode" value="some" checked><span>معلمات محددات</span></label>
      </div>
      <div id="mnSomeBox">
        <label for="mnSearch">اكتبي اسم المعلمة واختاريه من القائمة</label>
        <div style="display:flex;gap:8px"><input id="mnSearch" list="mnDirList" autocomplete="off" style="flex:1"><button type="button" class="btn light" onclick="mnPick()">إضافة</button></div>
        <datalist id="mnDirList"></datalist>
        <button type="button" class="btn light block" style="margin-top:10px" onclick="mnPickParts()">إضافة المشاركات في الاجتماع</button>
        <div class="chips" id="mnPicked" style="margin-top:10px"></div>
      </div>
      <button id="mnSaveBtn" class="btn block" style="margin-top:16px" onclick="mnSave(this)">نشر المحضر</button>
    </div>
  </div>
  <div id="mnAckModal" class="modal hidden" onclick="if (event.target === this) this.classList.add('hidden')">
    <div class="modal-box" style="max-width:560px">
      <button class="btn light" style="margin-bottom:10px" onclick="mn$('mnAckModal').classList.add('hidden')">إغلاق ✕</button>
      <div id="mnAckBody"></div>
    </div>
  </div>`;
  while (div.firstElementChild) wrap.appendChild(div.firstElementChild);
  mn$('mnDay').innerHTML = MN_DAYS.map(x => '<option>' + x + '</option>').join('');
  let dd = '', mm = '';
  for (let i = 1; i <= 30; i++) dd += '<option value="' + i + '">' + idDigits(i) + '</option>';
  for (let i = 1; i <= 12; i++) mm += '<option value="' + i + '">' + idDigits(i) + '</option>';
  mn$('mnHD').innerHTML = dd; mn$('mnHM').innerHTML = mm;
  const syncDay = () => { const g = idHToG(mn$('mnHY').value, mn$('mnHM').value, mn$('mnHD').value); if (g) { const p = g.split('-'); mn$('mnDay').value = MN_DAYS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; } };
  ['mnHD', 'mnHM', 'mnHY'].forEach(id => mn$(id).addEventListener('change', syncDay));
  mn$('mnMode').addEventListener('change', () => mn$('mnSomeBox').classList.toggle('hidden', mnMode() === 'all'));
  mn$('mnSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); mnPick(); } });
})();
const mnMode = () => (document.querySelector('#mnMode input:checked') || {}).value || 'some';

/* ---------- الأسطر (نقاط، نتائج، مشاركات) ---------- */
function mnAdd(box, v, names) {
  const row = document.createElement('div');
  row.className = 'id-note-row';
  row.innerHTML = '<span class="num"></span>' + (names ? '<input' + ' list="mnDirList" autocomplete="off">' : '<textarea rows="2"></textarea>') + '<button type="button" class="x" title="حذف">✕</button>';
  const f = row.querySelector('input,textarea'); f.value = v || ''; f.style.flex = '1'; f.style.margin = '0';
  row.querySelector('.x').onclick = () => { if (mn$(box).children.length < 2) { f.value = ''; return; } row.remove(); mnNum(box); };
  mn$(box).appendChild(row); mnNum(box);
}
function mnNum(box) { [...mn$(box).children].forEach((el, i) => { el.querySelector('.num').textContent = idDigits(i + 1); }); }
function mnSet(box, L, names) { mn$(box).innerHTML = ''; (L && L.length ? L : ['', '']).forEach(v => mnAdd(box, v, names)); }
const mnGet = box => [...mn$(box).querySelectorAll('input,textarea')].map(x => x.value.trim()).filter(Boolean);

/* ---------- اختيار المعلمات ---------- */
async function mnLoadDir() {
  if (MN_DIR) return MN_DIR;
  try { MN_DIR = (await api('teacherDir')).data || []; }
  catch (e) { MN_DIR = []; toast('تعذّر تحميل أسماء المعلمات: ' + e.message, false); }
  mn$('mnDirList').innerHTML = MN_DIR.map(t => '<option value="' + esc(t.name) + '">').join('');
  return MN_DIR;
}
const mnKey = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
function mnFind(name) { const k = mnKey(name); return (MN_DIR || []).filter(t => mnKey(t.name) === k); }
function mnRenderPicked() {
  mn$('mnPicked').innerHTML = mnPicked.length ? mnPicked.map((t, i) => '<span class="chip" style="cursor:default"><span>' + esc(t.name) + ' <button type="button" onclick="mnUnpick(' + i + ')" style="border:0;background:none;color:#c0392b;cursor:pointer;font-weight:800">✕</button></span></span>').join('')
    : '<span class="empty" style="font-size:14px">لم تُحدَّد معلمات بعد</span>';
}
function mnUnpick(i) { mnPicked.splice(i, 1); mnRenderPicked(); }
function mnAddTeacher(t) { if (!mnPicked.some(x => x.id === t.id)) mnPicked.push(t); }
async function mnPick() {
  await mnLoadDir();
  const v = mn$('mnSearch').value.trim(); if (!v) return;
  const L = mnFind(v);
  if (!L.length) return toast('الاسم غير موجود في سجل المعلمات، اختاريه من القائمة', false);
  L.forEach(mnAddTeacher);
  if (L.length > 1) toast('يوجد ' + idDigits(L.length) + ' معلمات بنفس الاسم، أُضفن جميعاً');
  mn$('mnSearch').value = ''; mnRenderPicked();
}
async function mnPickParts() {
  await mnLoadDir();
  const miss = [];
  mnGet('mnParts').forEach(n => { const L = mnFind(n); if (L.length) L.forEach(mnAddTeacher); else miss.push(n); });
  mnRenderPicked();
  if (miss.length) toast('لم يُعثر في سجل المعلمات على: ' + miss.join('، '), false);
}

/* ---------- القائمة ---------- */
async function mnOpenList() { show('mnListView'); mnLoad(); }
async function mnLoad() {
  if (!MN.length) { const c = cacheGet('minutes'); if (c) MN = c; }
  mnRender();
  try { MN = (await api('getMinutes')).data || []; cacheSet('minutes', MN); mnRender(); } catch (e) { toast(e.message, false); }
}
function mnRender() {
  const box = mn$('mnList'); if (!box) return;
  if (!MN.length) { box.innerHTML = '<p class="empty">لا توجد محاضر منشورة</p>'; return; }
  if (typeof rcCard === 'function') {   // نفس شكل بطاقات باقي القوائم
    rcStart();
    box.className = 'rc-list';
    box.innerHTML = MN.map((r, i) => {
      const tg = (r.data && r.data.target) || {}, n = tg.all ? null : (tg.ids || []).length, a = (r.acks || []).length, id = esc(r.id);
      return rcCard({ no: idDigits(i + 1), title: 'محضر اجتماع رقم ( ' + esc(idDigits(r.no)) + ' )', sub: esc(r.center || ''),
        meta: [rcM('التاريخ', esc((r.dayName || '') + ' ' + idDigits(r.hijri || '')).trim()), rcM('يصل إلى', tg.all ? 'كل المعلمات' : idDigits(n) + ' معلمة')],
        tags: '<span class="tag ' + (n != null && a >= n ? 'ok' : 'warn') + '">اطّلعت: ' + idDigits(a) + (n != null ? ' من ' + idDigits(n) : '') + '</span>' + (typeof scTag === 'function' ? scTag('min', r.id) : ''),
        main: [['عرض', 'mnView(\'' + id + '\')'], ['PDF', 'mnDo(\'' + id + '\', this, \'pdf\')'], typeof scAct === 'function' ? scAct('min', r.id) : null, ['من اطّلعت', 'mnAcks(\'' + id + '\')']],
        more: [['🔗 مشاركة', 'mnDo(\'' + id + '\', this, \'share\')'], '-', ['✏️ تعديل', 'mnEditRec(\'' + id + '\')'], ['✕ حذف', 'mnDel(\'' + id + '\')', 'danger']] });
    }).join('');
    return;
  }
  const b = (t, fn, cls) => '<button class="btn ' + (cls || 'light') + '" style="padding:6px 10px;font-size:13px" onclick="' + fn + '">' + t + '</button>';
  box.innerHTML = MN.map(r => {
    const tg = (r.data && r.data.target) || {}, n = tg.all ? null : (tg.ids || []).length, a = (r.acks || []).length, id = esc(r.id);
    return '<div class="t-item" style="border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:10px">' +
      '<b style="color:var(--primary)">محضر اجتماع رقم ( ' + esc(idDigits(r.no)) + ' )</b>' +
      '<div style="font-size:14px;color:var(--muted);margin:4px 0 10px;line-height:1.8">' + esc(r.dayName || '') + ' ' + esc(idDigits(r.hijri || '')) + (r.center ? ' — ' + esc(r.center) : '') +
      '<br>يصل إلى: ' + (tg.all ? 'كل المعلمات' : idDigits(n) + ' معلمة') + ' — اطّلعت: <b style="color:#1f7a45">' + idDigits(a) + (n != null ? ' من ' + idDigits(n) : '') + '</b></div>' +
      '<div class="act" style="display:flex;flex-wrap:wrap;gap:6px">' + b('من اطّلعت', 'mnAcks(\'' + id + '\')') + b('عرض', 'mnView(\'' + id + '\')') + b('PDF', 'mnDo(\'' + id + '\', this, \'pdf\')') +
      b('مشاركة', 'mnDo(\'' + id + '\', this, \'share\')') + (typeof scBtn === 'function' ? scBtn('min', r.id) : '') + b('تعديل', 'mnEditRec(\'' + id + '\')') + b('حذف', 'mnDel(\'' + id + '\')', 'danger') + '</div></div>';
  }).join('');
}
const mnById = id => MN.find(r => r.id === id);
if (typeof scRegister === 'function') scRegister('min', {
  rec: id => mnById(id),
  title: r => 'محضر اجتماع رقم ( ' + idDigits(r.no) + ' )' + (r.center ? ' — ' + r.center : ''),
  center: r => r.center || '', period: r => r.period || '',
  file: async r => ({ blob: await sgPdfBlob(r), name: sgFileName(r) + '.pdf', mime: 'application/pdf' })
});
function mnView(id) { const r = mnById(id); if (r) sgView(r); }
function mnDo(id, btn, what) { const r = mnById(id); if (!r) return; what === 'share' ? sgShare(r, btn) : sgPdf(r, btn); }
function mnAcks(id) {
  const r = mnById(id); if (!r) return;
  const tg = (r.data && r.data.target) || {}, acks = r.acks || [];
  let h = '<h2>من اطّلعت على المحضر رقم ( ' + esc(idDigits(r.no)) + ' )</h2>';
  h += '<div class="tbl-wrap"><table style="min-width:0"><tr><th>المعلمة</th><th>الحالة</th></tr>';
  if (tg.all) h += acks.length ? acks.map(a => '<tr><td>' + esc(a.name) + '</td><td><span class="tag ok">✔ ' + esc(a.at) + '</span></td></tr>').join('') : '<tr><td colspan="2" class="empty">لم تطّلع أي معلمة بعد</td></tr>';
  else h += (tg.ids || []).map((tid, i) => { const a = acks.find(x => x.tid === tid); return '<tr><td>' + esc((tg.names || [])[i] || tid) + '</td><td>' + (a ? '<span class="tag ok">✔ ' + esc(a.at) + '</span>' : '<span class="tag warn">⏳ لم تطّلع</span>') + '</td></tr>'; }).join('');
  mn$('mnAckBody').innerHTML = h + '</table></div>';
  mn$('mnAckModal').classList.remove('hidden');
}
async function mnDel(id) {
  if (!confirm('هل تريدين حذف هذا المحضر؟ سيختفي من عند المعلمات أيضاً.')) return;
  MN = MN.filter(r => r.id !== id); cacheSet('minutes', MN); mnRender();
  try { await api('deleteMinute', { id }); toast('تم الحذف'); } catch (e) { toast(e.message, false); mnLoad(); }
}

/* ---------- محضر جديد / تعديل / نشر ---------- */
function mnFill(r) {
  r = r || {}; const d = r.data || {}, tg = d.target || {};
  mn$('mnEditNote').classList.toggle('hidden', !r.id);
  const centers = (typeof LISTS !== 'undefined' && LISTS.centers) || [];
  mn$('mnCenter').innerHTML = '<option value="">اختاري المركز</option>' + centers.map(x => '<option>' + esc(x) + '</option>').join('');
  mn$('mnCenter').value = r.center || '';
  mn$('mnNo').value = r.no || (MN.length ? '' : '1');
  let h = d.hy ? { d: +d.hd, m: +d.hm, y: +d.hy } : (idHParts(new Date()) || { d: 1, m: 1, y: '' });
  mn$('mnHD').value = h.d; mn$('mnHM').value = h.m; mn$('mnHY').value = h.y;
  mn$('mnDay').value = r.dayName || MN_DAYS[new Date().getDay()];
  mnSet('mnPoints', d.points); mnSet('mnOuts', d.outs); mnSet('mnParts', d.parts, true);
  document.querySelectorAll('#mnMode input').forEach(i => { i.checked = i.value === (tg.all ? 'all' : 'some'); });
  mn$('mnSomeBox').classList.toggle('hidden', !!tg.all);
  mnPicked = (tg.ids || []).map((id, i) => ({ id, name: (tg.names || [])[i] || id }));
  mnRenderPicked();
  mnLoadDir();
}
function mnNew() { mnEdit = null; mnFill(null); show('mnForm'); }
function mnEditRec(id) { const r = mnById(id); if (!r) return; mnEdit = r; mnFill(r); show('mnForm'); }
function mnBack() { mnEdit = null; show('mnListView'); mnRender(); }
async function mnSave(btn) {
  const hy = mn$('mnHY').value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
  if (!/^\d{4}$/.test(hy)) return toast('اكتبي سنة التاريخ الهجري (مثال: 1448)', false);
  const all = mnMode() === 'all';
  const req = { id: mnEdit ? mnEdit.id : '', no: mn$('mnNo').value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)), center: mn$('mnCenter').value, dayName: mn$('mnDay').value,
    data: { points: mnGet('mnPoints'), outs: mnGet('mnOuts'), parts: mnGet('mnParts'), hd: mn$('mnHD').value, hm: mn$('mnHM').value, hy,
      target: { all, ids: all ? [] : mnPicked.map(t => t.id), names: all ? [] : mnPicked.map(t => t.name) } } };
  if (!req.no) return toast('اكتبي رقم الاجتماع', false);
  if (!req.data.points.length) return toast('اكتبي نقطة واحدة على الأقل من نقاط الاجتماع', false);
  if (!all && !mnPicked.length) return toast('حدّدي المعلمات اللاتي يصلهن المحضر، أو اختاري «كل المعلمات»', false);
  setBtnBusy(btn, true, 'جارِ النشر...');
  try {
    const res = await api('saveMinute', req);
    if (typeof AD !== 'undefined') AD.done('mnForm', mnEdit && mnEdit.id);
    toast(mnEdit ? 'تم حفظ التعديل' : 'تم نشر المحضر');
    const rec = { id: res.id, kind: 'min', no: req.no, dayName: req.dayName, hijri: req.data.hd + '/' + req.data.hm + '/' + hy + 'هـ', center: req.center, data: req.data, acks: mnEdit ? mnEdit.acks : [] };
    MN = MN.filter(r => r.id !== rec.id); MN.unshift(rec); cacheSet('minutes', MN);
    mnEdit = null; show('mnListView'); mnRender(); mnLoad();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- الحفظ التلقائي للمحضر (autosave.js) ---------- */
if (typeof AD !== 'undefined' && document.getElementById('mnForm')) {
  AD.register('mnForm', {
    key: () => mnEdit ? mnEdit.id : 'new',
    collect: () => ({ id: mnEdit ? mnEdit.id : '', no: mn$('mnNo').value, center: mn$('mnCenter').value, dayName: mn$('mnDay').value,
      data: { points: mnGet('mnPoints'), outs: mnGet('mnOuts'), parts: mnGet('mnParts'), hd: mn$('mnHD').value, hm: mn$('mnHM').value, hy: mn$('mnHY').value,
        target: { all: mnMode() === 'all', ids: mnPicked.map(t => t.id), names: mnPicked.map(t => t.name) } } }),
    apply: d => { mnFill(Object.assign({}, mnEdit || {}, d, { id: mnEdit ? mnEdit.id : '' })); },
    reset: () => mnFill(mnEdit)
  });
  const _n = mnNew, _e = mnEditRec;
  mnNew = function () { _n(); AD.offer('mnForm'); };
  mnEditRec = function (id) { _e(id); AD.offer('mnForm'); };
}
