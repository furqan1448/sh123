/* ===== المرفقات (الإشراف التربوي، الإشراف الإداري، تحفيظ الصغار) =====
   رفع ملف أو إرفاق رابط، وتظهر مرفقات الوحدة فقط. ويمكن مشاركة أي مرفق مع المعلمات (الكل أو محددات)
   فيصلهن في أيقونة «المعلمات» ← «المرفقات» ويضغطن «تم الاطلاع»، مثل محاضر الاجتماعات. */
const AT_LINK = 'رابط';
let ATF = [], AT_DIR = null, atPicked = [], atCur = null;
const at$ = id => document.getElementById(id);

(function atInject() {
  const wrap = document.querySelector('.wrap'); if (!wrap) return;
  const div = document.createElement('div');
  div.innerHTML = `
  <div id="atView" class="hidden">
    <button class="back" onclick="show('homeView')">← رجوع</button>
    <div class="card">
      <h2>إضافة مرفق جديد</h2>
      <div class="ev-tabs" id="atMode">
        <button type="button" class="on" data-m="file" onclick="atSetMode('file')">رفع ملف</button>
        <button type="button" data-m="link" onclick="atSetMode('link')">إرفاق رابط</button>
      </div>
      <label for="atTitle">عنوان المرفق</label>
      <input id="atTitle" placeholder="مثال: نموذج متابعة">
      <div id="atFileBox">
        <label for="atFile">الملف</label>
        <input id="atFile" type="file">
        <div style="font-size:13px;color:var(--muted);margin-top:6px">الحد الأقصى 10 ميجابايت.</div>
      </div>
      <div id="atLinkBox" class="hidden">
        <label for="atUrl">الرابط</label>
        <input id="atUrl" type="url" dir="ltr" inputmode="url" autocapitalize="none" autocomplete="off" placeholder="https://">
      </div>
      <button id="atSaveBtn" class="btn block" onclick="atSave(this)">رفع المرفق</button>
    </div>
    <div class="card">
      <h2>المرفقات</h2>
      <div id="atList"><p class="empty">جارِ التحميل...</p></div>
    </div>
  </div>
  <div id="atShareModal" class="modal hidden" onclick="if (event.target === this) this.classList.add('hidden')">
    <div class="modal-box" style="max-width:560px">
      <button class="btn light" style="margin-bottom:10px" onclick="at$('atShareModal').classList.add('hidden')">إغلاق ✕</button>
      <h2 id="atShareTitle"></h2>
      <div class="chips" id="atShMode">
        <label class="chip"><input type="radio" name="atShMode" value="all"><span>كل المعلمات</span></label>
        <label class="chip"><input type="radio" name="atShMode" value="some" checked><span>معلمات محددات</span></label>
      </div>
      <div id="atSomeBox">
        <label for="atSearch">اكتبي اسم المعلمة واختاريه من القائمة</label>
        <div style="display:flex;gap:8px"><input id="atSearch" list="atDirList" autocomplete="off" style="flex:1"><button type="button" class="btn light" onclick="atPick()">إضافة</button></div>
        <datalist id="atDirList"></datalist>
        <div class="chips" id="atPicked" style="margin-top:10px"></div>
      </div>
      <button class="btn block" style="margin-top:14px" onclick="atShareSave(this)">مشاركة</button>
      <button class="btn light block" style="margin-top:8px" id="atUnshareBtn" onclick="atUnshare(this)">إلغاء المشاركة</button>
      <div id="atAcks" style="margin-top:14px"></div>
    </div>
  </div>`;
  while (div.firstElementChild) wrap.appendChild(div.firstElementChild);
  at$('atShMode').addEventListener('change', () => at$('atSomeBox').classList.toggle('hidden', atShMode() === 'all'));
  at$('atSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); atPick(); } });
})();
const atShMode = () => (document.querySelector('#atShMode input:checked') || {}).value || 'some';
let atMode = 'file';
function atSetMode(m) {
  atMode = m;
  document.querySelectorAll('#atMode button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  at$('atFileBox').classList.toggle('hidden', m !== 'file');
  at$('atLinkBox').classList.toggle('hidden', m !== 'link');
}
const atHref = u => /^https?:\/\//i.test(u || '') ? u : '#';

/* ---------- القائمة ---------- */
function atOpen() { show('atView'); atLoad(); }
async function atLoad() {
  if (!ATF.length) { const c = cacheGet('atfiles'); if (c) ATF = c; }
  atRender();
  try { ATF = (await api('getFiles')).data || []; cacheSet('atfiles', ATF); atRender(); } catch (e) { toast(e.message, false); }
}
function atStatus(f) {
  const tg = f.target, a = (f.acks || []).length;
  if (!tg) return '';
  const n = tg.all ? null : (tg.ids || []).length;
  return '<span class="tag ok">مُشارك مع ' + (tg.all ? 'كل المعلمات' : idDigits(n) + ' معلمة') + ' — اطّلعت ' + idDigits(a) + (n != null ? ' من ' + idDigits(n) : '') + '</span>';
}
function atRender() {
  const box = at$('atList'); if (!box) return;
  if (!ATF.length) { box.innerHTML = '<p class="empty">لا توجد مرفقات</p>'; return; }
  const b = (t, fn, cls) => '<button class="btn ' + (cls || 'light') + '" style="padding:6px 10px;font-size:13px" onclick="' + fn + '">' + t + '</button>';
  box.innerHTML = ATF.map(f => {
    const id = esc(f.id);
    return '<div style="border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:10px">' +
      '<a class="lnk" target="_blank" rel="noopener noreferrer" href="' + esc(atHref(f.url)) + '">' + esc(f.title) + '</a>' +
      '<div style="font-size:13px;color:var(--muted);margin:4px 0 8px">' + (f.name === AT_LINK ? 'رابط' : esc(f.name)) + ' — ' + esc(String(f.at || '').split(' ')[0]) + '</div>' +
      (f.target ? '<div style="margin-bottom:8px">' + atStatus(f) + '</div>' : '') +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' + b(f.target ? 'المشاركة ومن اطّلعت' : 'مشاركة مع المعلمات', 'atShareOpen(\'' + id + '\')') + b('حذف', 'atDel(\'' + id + '\')', 'danger') + '</div></div>';
  }).join('');
}

/* ---------- الرفع ---------- */
function atB64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('تعذّرت قراءة الملف')); r.readAsDataURL(file); });
}
async function atSave(btn) {
  const title = at$('atTitle').value.trim();
  if (!title) return toast('اكتبي عنوان المرفق', false);
  const req = { title };
  if (atMode === 'link') {
    let url = at$('atUrl').value.trim();
    if (!url) return toast('الصقي الرابط', false);
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
    if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(url)) return toast('الرابط غير صحيح', false);
    req.url = url;
  } else {
    const file = at$('atFile').files[0];
    if (!file) return toast('اختاري ملفاً', false);
    if (file.size > 10 * 1024 * 1024) return toast('حجم الملف أكبر من 10 ميجابايت', false);
    req.name = file.name; req.mime = file.type || 'application/octet-stream';
    try { req.data = await atB64(file); } catch (e) { return toast(e.message, false); }
  }
  setBtnBusy(btn, true, 'جارِ الرفع...');
  try {
    await api('addFile', req);
    toast('تم حفظ المرفق');
    at$('atTitle').value = ''; at$('atUrl').value = ''; at$('atFile').value = '';
    atLoad();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}
async function atDel(id) {
  if (!confirm('هل تريدين حذف هذا المرفق؟ سيختفي من عند المعلمات أيضاً.')) return;
  ATF = ATF.filter(f => f.id !== id); cacheSet('atfiles', ATF); atRender();
  try { await api('deleteFile', { id }); toast('تم الحذف'); } catch (e) { toast(e.message, false); atLoad(); }
}

/* ---------- المشاركة مع المعلمات ---------- */
async function atLoadDir() {
  if (AT_DIR) return AT_DIR;
  try { AT_DIR = (await api('teacherDir')).data || []; } catch (e) { AT_DIR = []; toast('تعذّر تحميل أسماء المعلمات: ' + e.message, false); }
  at$('atDirList').innerHTML = AT_DIR.map(t => '<option value="' + esc(t.name) + '">').join('');
  return AT_DIR;
}
const atKey = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
function atRenderPicked() {
  at$('atPicked').innerHTML = atPicked.length ? atPicked.map((t, i) => '<span class="chip" style="cursor:default"><span>' + esc(t.name) + ' <button type="button" onclick="atPicked.splice(' + i + ',1);atRenderPicked()" style="border:0;background:none;color:#c0392b;cursor:pointer;font-weight:800">✕</button></span></span>').join('')
    : '<span class="empty" style="font-size:14px">لم تُحدَّد معلمات بعد</span>';
}
async function atPick() {
  await atLoadDir();
  const v = at$('atSearch').value.trim(); if (!v) return;
  const L = AT_DIR.filter(t => atKey(t.name) === atKey(v));
  if (!L.length) return toast('الاسم غير موجود في سجل المعلمات، اختاريه من القائمة', false);
  L.forEach(t => { if (!atPicked.some(x => x.id === t.id)) atPicked.push(t); });
  at$('atSearch').value = ''; atRenderPicked();
}
function atShareOpen(id) {
  const f = ATF.find(x => x.id === id); if (!f) return;
  atCur = f; const tg = f.target || {};
  at$('atShareTitle').textContent = 'مشاركة «' + f.title + '» مع المعلمات';
  document.querySelectorAll('#atShMode input').forEach(i => { i.checked = i.value === (tg.all ? 'all' : 'some'); });
  at$('atSomeBox').classList.toggle('hidden', !!tg.all);
  atPicked = (tg.ids || []).map((x, i) => ({ id: x, name: (tg.names || [])[i] || x }));
  atRenderPicked();
  at$('atUnshareBtn').classList.toggle('hidden', !f.target);
  // من اطّلعت
  const acks = f.acks || [];
  let h = '';
  if (f.target) {
    h = '<h2 style="font-size:16px">من اطّلعت</h2><div class="tbl-wrap"><table style="min-width:0"><tr><th>المعلمة</th><th>الحالة</th></tr>';
    if (tg.all) h += acks.length ? acks.map(a => '<tr><td>' + esc(a.name) + '</td><td><span class="tag ok">✔ ' + esc(a.at) + '</span></td></tr>').join('') : '<tr><td colspan="2" class="empty">لم تطّلع أي معلمة بعد</td></tr>';
    else h += (tg.ids || []).map((x, i) => { const a = acks.find(k => k.tid === x); return '<tr><td>' + esc((tg.names || [])[i] || x) + '</td><td>' + (a ? '<span class="tag ok">✔ ' + esc(a.at) + '</span>' : '<span class="tag warn">⏳ لم تطّلع</span>') + '</td></tr>'; }).join('');
    h += '</table></div>';
  }
  at$('atAcks').innerHTML = h;
  at$('atShareModal').classList.remove('hidden');
  atLoadDir();
}
async function atShareSave(btn) {
  if (!atCur) return;
  const all = atShMode() === 'all';
  if (!all && !atPicked.length) return toast('حدّدي المعلمات، أو اختاري «كل المعلمات»', false);
  const target = all ? { all: true } : { all: false, ids: atPicked.map(t => t.id), names: atPicked.map(t => t.name) };
  setBtnBusy(btn, true, 'جارِ المشاركة...');
  try {
    await api('shareFile', { id: atCur.id, target });
    atCur.target = target; cacheSet('atfiles', ATF); atRender();
    at$('atShareModal').classList.add('hidden');
    toast('تمت مشاركة المرفق مع ' + (all ? 'كل المعلمات' : idDigits(atPicked.length) + ' معلمة'));
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}
async function atUnshare(btn) {
  if (!atCur || !confirm('إلغاء مشاركة هذا المرفق؟ سيختفي من عند المعلمات.')) return;
  setBtnBusy(btn, true, '...');
  try {
    await api('shareFile', { id: atCur.id, target: null });
    atCur.target = null; cacheSet('atfiles', ATF); atRender();
    at$('atShareModal').classList.add('hidden'); toast('تم إلغاء المشاركة');
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}
