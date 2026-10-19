/* ===== «📤 إرسال للمركز»: زر عام بجانب كل نموذج محفوظ في كل الوحدات =====
   المشرفة تختار المركز (يُعبّأ تلقائياً من النموذج) وطريقة الإرسال: اطلاع فقط، أو اطلاع وتوقيع المديرة، مع ملاحظة اختيارية.
   يصل النموذج للمركز في صفحة «المراكز» تحت «الوارد من المشرفات» مع شارة التنبيه، وتظهر حالته هنا بجانب الزر.
   كل وحدة تسجّل نماذجها هكذا:
     scRegister('idari', { rec: id => ..., title: r => ..., center: r => ..., period: r => ..., file: async r => ({ blob, name, mime }) }); */
const SC_SRC = {};
let SC_CENTERS = null, SC_SENT = null, scLoading = null, scCur = null, scAt = 0;
function scRegister(src, def) { SC_SRC[src] = def; }

// مطابقة اسم المركز بين النموذج وحسابات المراكز (نفس طريقة الخادم)
const scKey = t => String(t || '').replace(/[-–—]\s*الفتر[ةه].*$/, '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/(^|\s)(مركز|معهد)(\s|$)/g, ' ').replace(/[^ء-يa-z0-9]/gi, '');
const SC_STATUS = {
  new: '<span class="tag warn">⏳ أُرسل — لم يُطّلع عليه</span>',
  ack: '<span class="tag ok">✔ تم الاطلاع</span>',
  sign: '<span class="tag ok">✔ وقّعت المديرة</span>'
};
const scCenterName = n => { const c = (SC_CENTERS || []).find(x => x.name === n); return c ? (c.display || c.name) : n; };
const scDig = s => typeof idDigits === 'function' ? idDigits(s) : String(s);

/* ---------- زر الإرسال وحالته (يُضاف في صف كل نموذج) ---------- */
function scBtn(src, id) {
  id = esc(id);
  return '<button class="btn light sc-btn" style="padding:6px 10px;font-size:13px" onclick="scOpen(\'' + src + '\', \'' + id + '\')">📤 إرسال للمركز</button>' +
    '<span class="sc-st" data-sc="' + src + '|' + id + '" onclick="scOpen(\'' + src + '\', \'' + id + '\')"></span>';
}
function scLoad(force) {
  if (SC_SENT && !force && Date.now() - scAt < 60000) return Promise.resolve(SC_SENT);
  if (scLoading) return scLoading;
  if (!SC_SENT) { const c = typeof cacheGet === 'function' ? cacheGet('sc_sent') : null; if (c) SC_SENT = c; }
  scAt = Date.now();
  scLoading = api('getSent').then(o => { SC_SENT = o.data || []; if (typeof cacheSet === 'function') cacheSet('sc_sent', SC_SENT); scPaint(); return SC_SENT; })
    .catch(() => SC_SENT || []).finally(() => { scLoading = null; });
  return scLoading;
}
const scFor = (src, id) => (SC_SENT || []).filter(x => x.src === src && x.srcId === id);
function scPaint() {
  const els = document.querySelectorAll('[data-sc]');
  if (!els.length) return;
  if (!scLoading && (!SC_SENT || Date.now() - scAt > 60000)) scLoad();   // تحديث الحالة كل دقيقة على الأكثر عند فتح القوائم
  els.forEach(el => {
    const [src, id] = el.dataset.sc.split('|');
    const L = scFor(src, id);
    el.dataset.p = '1';
    const pend = L.filter(x => x.status === 'new').length;
    const h = !L.length ? '' : L.length === 1 ? SC_STATUS[L[0].status] :
      '<span class="tag ' + (pend ? 'warn' : 'ok') + '">📤 ' + scDig(L.length) + ' مراكز' + (pend ? ' — ' + scDig(pend) + ' لم يُطّلع' : ' — اطّلعت كلها') + '</span>';
    if (el.innerHTML !== h) el.innerHTML = h;
  });
}
// ترسم الحالة تلقائياً كلما ظهرت أزرار جديدة في القوائم
(function () {
  let t = null;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { if (document.querySelector('[data-sc]:not([data-p])')) scPaint(); }, 120); })
    .observe(document.body || document.documentElement, { childList: true, subtree: true });
})();

/* ---------- النافذة ---------- */
function scModal() {
  let m = document.getElementById('scModal');
  if (m) return m;
  const st = document.createElement('style');
  st.textContent = '.sc-st{cursor:pointer;align-self:center}.sc-st:empty{display:none}' +
    '#scModal .modal-box{max-width:560px}#scModal .sc-sub{color:var(--muted);font-size:14px;margin-bottom:6px;line-height:1.7}' +
    '.sc-modes{display:flex;flex-direction:column;gap:8px;margin-top:6px}.sc-modes label{display:flex;gap:8px;align-items:flex-start;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;margin:0;cursor:pointer;font-weight:600}' +
    '.sc-modes label:has(input:checked){border-color:var(--gold);background:#fffbf2}.sc-modes small{display:block;color:var(--muted);font-weight:400}.sc-modes input{width:auto;flex:none;margin:5px 0 0;accent-color:var(--primary)}.sc-modes span{flex:1}' +
    '.sc-hint{font-size:13px;margin-top:4px;color:var(--muted)}.sc-acts{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}' +
    '.sc-prev{margin-top:18px;border-top:1.5px solid var(--line);padding-top:12px}.sc-prev h3{font-size:15px;color:var(--primary);margin-bottom:8px}' +
    '.sc-it{border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:14px;line-height:1.8}.sc-it .act{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
    '.sc-it .act .btn{padding:5px 10px;font-size:13px}.sc-sig{max-width:220px;max-height:90px;display:block;margin-top:6px;border:1px dashed var(--gold);border-radius:8px;background:#fff}';
  document.head.appendChild(st);
  m = document.createElement('div');
  m.id = 'scModal'; m.className = 'modal hidden';
  m.innerHTML = '<div class="modal-box"><h2>📤 إرسال للمركز</h2><p class="sc-sub" id="scTitle"></p>' +
    '<label for="scCenter">المركز</label><select id="scCenter"></select><p class="sc-hint" id="scHint"></p>' +
    '<label>طريقة الإرسال</label><div class="sc-modes">' +
    '<label><input type="radio" name="scMode" value="ack" checked><span>اطلاع فقط<small>تطّلع المديرة على النموذج وتضغط «تم الاطلاع».</small></span></label>' +
    '<label><input type="radio" name="scMode" value="sign"><span>اطلاع وتوقيع<small>تطّلع المديرة على النموذج وتوقّع عليه من حساب المركز.</small></span></label></div>' +
    '<label for="scNote">ملاحظة للمديرة (اختياري)</label><textarea id="scNote" rows="3" placeholder="مثال: نأمل الاطلاع ومتابعة الملاحظات الواردة"></textarea>' +
    '<div class="sc-acts"><button class="btn" id="scGo" onclick="scSend(this)">إرسال</button><button class="btn light" onclick="scClose()">إغلاق</button></div>' +
    '<div class="sc-prev hidden" id="scPrev"></div></div>';
  m.addEventListener('click', e => { if (e.target === m) scClose(); });
  document.body.appendChild(m);
  return m;
}
function scClose() { const m = document.getElementById('scModal'); if (m) m.classList.add('hidden'); scCur = null; }
async function scCentersLoad() {
  if (SC_CENTERS) return SC_CENTERS;
  const c = typeof cacheGet === 'function' ? cacheGet('sc_centers') : null;
  if (c && c.length) { SC_CENTERS = c; api('scCenters').then(o => { SC_CENTERS = o.data || c; cacheSet('sc_centers', SC_CENTERS); }).catch(() => {}); return SC_CENTERS; }
  const o = await api('scCenters');
  SC_CENTERS = o.data || [];
  if (typeof cacheSet === 'function') cacheSet('sc_centers', SC_CENTERS);
  return SC_CENTERS;
}
// اختيار المركز تلقائياً من اسم مركز النموذج وفترته
function scGuess(center, period) {
  const k = scKey(center); if (!k) return '';
  const L = (SC_CENTERS || []).filter(c => scKey(c.name) === k);
  if (L.length < 2) return L[0] ? L[0].name : '';
  const p = String(period || ''), want = /صباح/.test(p) ? /صباح/ : /مسائ/.test(p) ? /مسائ/ : null;
  return ((want && L.find(c => want.test(c.name))) || L[0]).name;
}
async function scOpen(src, id) {
  const def = SC_SRC[src], rec = def && def.rec(id);
  if (!rec) return;
  scCur = { src, id, rec, def };
  const m = scModal();
  document.getElementById('scTitle').textContent = def.title(rec);
  document.getElementById('scNote').value = '';
  document.querySelector('#scModal input[value="ack"]').checked = true;
  const sel = document.getElementById('scCenter'), hint = document.getElementById('scHint');
  sel.innerHTML = '<option value="">جارِ تحميل المراكز...</option>'; hint.textContent = '';
  m.classList.remove('hidden');
  scPrev();
  try { await scCentersLoad(); } catch (e) { sel.innerHTML = '<option value="">تعذّر تحميل المراكز</option>'; return toast(e.message, false); }
  if (!scCur || scCur.id !== id) return;
  if (!SC_CENTERS.length) { sel.innerHTML = '<option value="">لا توجد حسابات مراكز بعد</option>'; hint.textContent = 'تُضاف الحسابات في ورقة «حسابات المراكز» في الشيت.'; return; }
  sel.innerHTML = '<option value="">اختاري المركز</option>' + SC_CENTERS.map(c => '<option value="' + esc(c.name) + '">' + esc(c.display || c.name) + '</option>').join('');
  const g = scGuess(def.center ? def.center(rec) : '', def.period ? def.period(rec) : '');
  sel.value = g;
  hint.textContent = g ? '✔ تم اختيار المركز تلقائياً من النموذج، ويمكنك تغييره.' : (def.center && def.center(rec) ? 'لم يُعثر على حساب لمركز «' + def.center(rec) + '»، اختاريه من القائمة.' : '');
  scPrev();
}
function scPrev() {
  const box = document.getElementById('scPrev');
  if (!scCur) return;
  const L = scFor(scCur.src, scCur.id);
  box.classList.toggle('hidden', !L.length);
  if (!L.length) return;
  box.innerHTML = '<h3>أُرسل سابقاً</h3>' + L.map(x => {
    const id = esc(x.id);
    return '<div class="sc-it"><b>' + esc(scCenterName(x.center)) + '</b> — ' + (x.mode === 'sign' ? 'اطلاع وتوقيع' : 'اطلاع فقط') + '<br>' +
      '<span style="color:var(--muted)">أُرسل: ' + esc(scDig(x.at)) + '</span><br>' + SC_STATUS[x.status] +
      (x.status !== 'new' ? ' <small>' + esc(scDig(x.doneAt)) + (x.signer ? ' — ' + esc(x.signer) : '') + '</small>' : '') +
      (x.note ? '<br><small>ملاحظتك: ' + esc(x.note) + '</small>' : '') +
      '<div id="scSig_' + id + '"></div><div class="act">' +
      (x.status === 'sign' ? '<button class="btn light" onclick="scShowSig(\'' + id + '\', this)">عرض توقيع المديرة</button>' : '') +
      '<button class="btn light" onclick="scSentFile(\'' + id + '\', this)">الملف المرسل</button>' +
      (x.status === 'new' ? '<button class="btn danger" onclick="scUnsend(\'' + id + '\', this)">سحب الإرسال</button>' : '') + '</div></div>';
  }).join('');
}
const scB64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(new Error('تعذّر قراءة الملف')); fr.readAsDataURL(blob); });
function scSaveB64(o) {
  const bin = atob(o.data), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([u], { type: o.mime || 'application/octet-stream' })); a.download = o.name || 'ملف';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function scSend(btn) {
  if (!scCur) return;
  const center = document.getElementById('scCenter').value;
  if (!center) return toast('اختاري المركز', false);
  const mode = (document.querySelector('#scModal input[name="scMode"]:checked') || {}).value || 'ack';
  const note = document.getElementById('scNote').value.trim();
  const { src, id, rec, def } = scCur;
  const dup = scFor(src, id).find(x => x.center === center);
  if (dup && dup.status !== 'new' && !confirm('سبق إرسال هذا النموذج لهذا المركز واطّلعت عليه المديرة. هل تريدين إرساله مرة أخرى؟')) return;
  setBtnBusy(btn, true, 'جارِ تجهيز الملف...');
  try {
    const f = await def.file(rec);
    btn.innerHTML = 'جارِ الإرسال...';
    const out = await api('sendCenter', { src, srcId: id, title: def.title(rec), center, mode, note, name: f.name, mime: f.mime, data: await scB64(f.blob) });
    SC_SENT = (SC_SENT || []).filter(x => x.id !== out.item.id);
    SC_SENT.unshift(out.item);
    if (typeof cacheSet === 'function') cacheSet('sc_sent', SC_SENT);
    scPaint(); scPrev();
    toast(out.replaced ? 'تم تحديث النسخة المرسلة للمركز' : 'تم الإرسال للمركز، ويظهر لهم في «الوارد من المشرفات»');
    scClose();
  } catch (e) { toast(e.message || 'تعذّر الإرسال', false); }
  finally { setBtnBusy(btn, false); }
}
async function scShowSig(id, btn) {
  setBtnBusy(btn, true, '...');
  try {
    const o = await api('sentSig', { id });
    const box = document.getElementById('scSig_' + id);
    if (box) box.innerHTML = o.data ? '<img class="sc-sig" src="' + esc(o.data) + '" alt="توقيع المديرة">' : '<small>لا يوجد توقيع</small>';
    btn.remove();
  } catch (e) { toast(e.message, false); setBtnBusy(btn, false); }
}
async function scSentFile(id, btn) {
  setBtnBusy(btn, true, 'جارِ التحميل...');
  try { scSaveB64(await api('sentFile', { id })); toast('تم التحميل'); }
  catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}
async function scUnsend(id, btn) {
  if (!confirm('سحب الإرسال؟ سيختفي النموذج من صفحة المركز.')) return;
  setBtnBusy(btn, true, '...');
  try {
    await api('unsend', { id });
    SC_SENT = (SC_SENT || []).filter(x => x.id !== id);
    if (typeof cacheSet === 'function') cacheSet('sc_sent', SC_SENT);
    scPaint(); scPrev(); toast('تم سحب الإرسال');
  } catch (e) { toast(e.message, false); setBtnBusy(btn, false); }
}
