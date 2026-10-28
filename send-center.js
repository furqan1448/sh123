/* ===== «📤 إرسال»: زر عام بجانب كل نموذج محفوظ في كل الوحدات، يُرسل النموذج للمركز أو للمعلمة =====
   المشرفة تختار الجهة: المركز (يُعبّأ تلقائياً من النموذج) أو المعلمة (من سجل المعلمات)، وطريقة الإرسال: اطلاع فقط، أو اطلاع وتوقيع،
   مع ملاحظة اختيارية. يصل للمركز في صفحة «المراكز» تحت «الوارد من المشرفات»، وللمعلمة في أيقونة «المعلمات»، مع شارة التنبيه،
   وتظهر حالته هنا بجانب الزر. بعد الإرسال للمعلمة يظهر زر تنبيهها في واتساب.
   كل وحدة تسجّل نماذجها هكذا:
     scRegister('idari', { rec: id => ..., title: r => ..., center: r => ..., period: r => ..., file: async r => ({ blob, name, mime }) }); */
const SC_SRC = {};
let SC_CENTERS = null, SC_SENT = null, scLoading = null, scCur = null, scAt = 0;
let SC_TDIR = null, SC_TBY = {}, SC_TLBL = {}, scTLoading = null;
function scRegister(src, def) { SC_SRC[src] = def; }
// أيقونات خطية (بدل الإيموجي) مثل أيقونات الموقع: المركز/المديرة والمعلمة
const SC_SVG = d => '<svg class="sc-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const SC_ICO_C = SC_SVG('<path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9.5 21v-4.5h5V21"/><path d="M9 11h6"/>');
const SC_ICO_T = SC_SVG('<circle cx="8" cy="7" r="2.6"/><path d="M3.5 20v-3.2A4.5 4.5 0 0 1 8 12.3a4.5 4.5 0 0 1 3.4 1.6"/><rect x="12.5" y="4" width="8" height="6.5" rx="1"/><path d="M11 15.5l3.5-3"/>');
const scNoTeacher = () => !!(document.body && document.body.id === 'idariPage');   // الإشراف الإداري: لا ربط مع المعلمات (الإرسال للمركز فقط)


// مطابقة اسم المركز بين النموذج وحسابات المراكز (نفس طريقة الخادم)
const scKey = t => String(t || '').replace(/[-–—]\s*الفتر[ةه].*$/, '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/(^|\s)(مركز|معهد)(\s|$)/g, ' ').replace(/[^ء-يa-z0-9]/gi, '');
const scStatus = x => x.status === 'new' ? '<span class="tag warn">⏳ أُرسل ' + (x.to === 't' ? 'للمعلمة' : 'للمركز') + ' — لم يُطّلع عليه</span>'
  : x.status === 'sign' ? '<span class="tag ok">✔ وقّعت ' + (x.to === 't' ? 'المعلمة' : 'المديرة') + '</span>'
  : '<span class="tag ok">✔ ' + (x.to === 't' ? 'اطّلعت المعلمة' : 'اطّلعت المديرة') + '</span>';
const scCenterName = n => { const c = (SC_CENTERS || []).find(x => x.name === n); return c ? (c.display || c.name) : n; };
const scWho = x => x.to === 't' ? 'المعلمة: ' + x.center : scCenterName(x.center);
const scNorm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
// رقم الجوال بصيغة واتساب الدولية
const scWa = p => { let d = String(p || '').replace(/\D/g, ''); if (/^05\d{8}$/.test(d)) d = '966' + d.slice(1); else if (/^5\d{8}$/.test(d)) d = '966' + d; return /^9665\d{8}$/.test(d) ? d : ''; };
const scDig = s => typeof idDigits === 'function' ? idDigits(s) : String(s);

/* ---------- زر الإرسال وحالته (يُضاف في صف كل نموذج) ---------- */
function scBtn(src, id) {
  id = esc(id);
  return '<button class="btn light sc-btn" style="padding:6px 10px;font-size:13px" onclick="scOpen(\'' + src + '\', \'' + id + '\')">📤 إرسال للمركز' + (scNoTeacher() ? '' : ' أو المعلمة') + '</button>' +
    '<span class="sc-st" data-sc="' + src + '|' + id + '" onclick="scOpen(\'' + src + '\', \'' + id + '\')"></span>';
}
// للبطاقات: زر الإرسال وحالته منفصلين
const scAct = (src, id) => ['📤 إرسال', 'scOpen(\'' + src + '\', \'' + esc(id) + '\')'];
const scTag = (src, id) => '<span class="sc-st" data-sc="' + src + '|' + esc(id) + '" onclick="scOpen(\'' + src + '\', \'' + esc(id) + '\')"></span>';
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
    const h = !L.length ? '' : L.length === 1 ? scStatus(L[0]) :
      '<span class="tag ' + (pend ? 'warn' : 'ok') + '">📤 أُرسل لـ ' + scDig(L.length) + ' جهات' + (pend ? ' — ' + scDig(pend) + ' لم يُطّلع' : ' — اطّلعت كلها') + '</span>';
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
  st.textContent = '.sc-ico{width:20px;height:20px;flex:none;vertical-align:-4px;margin-inline-end:6px;color:var(--primary)}.sc-st{cursor:pointer;align-self:center}.sc-st:empty{display:none}' +
    '#scModal .modal-box{max-width:560px}#scModal .sc-sub{color:var(--muted);font-size:14px;margin-bottom:6px;line-height:1.7}' +
    '.sc-modes{display:flex;flex-direction:column;gap:8px;margin-top:6px}.sc-modes label{display:flex;gap:8px;align-items:flex-start;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;margin:0;cursor:pointer;font-weight:600}' +
    '.sc-modes label:has(input:checked){border-color:var(--gold);background:#fffbf2}.sc-modes small{display:block;color:var(--muted);font-weight:400}.sc-modes input{width:auto;flex:none;margin:5px 0 0;accent-color:var(--primary)}.sc-modes span{flex:1}' +
    '.sc-hint{font-size:13px;margin-top:4px;color:var(--muted)}.sc-acts{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}' +
    '.sc-prev{margin-top:18px;border-top:1.5px solid var(--line);padding-top:12px}.sc-prev h3{font-size:15px;color:var(--primary);margin-bottom:8px}' +
    '.sc-it{border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:14px;line-height:1.8}.sc-it .act{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
    '.sc-it .act .btn{padding:5px 10px;font-size:13px}.sc-sig{max-width:220px;max-height:90px;display:block;margin-top:6px;border:1px dashed var(--gold);border-radius:8px;background:#fff}' +
    '.sc-to{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.sc-to label{display:flex;justify-content:center;align-items:center;gap:8px;border:1.5px solid var(--line);border-radius:12px;padding:10px;margin:0;cursor:pointer;font-weight:700}' +
    '.sc-to label:has(input:checked){border-color:var(--primary);background:#f6f0f2;color:var(--primary)}.sc-to input{width:auto;margin:0;accent-color:var(--primary)}' +
    '.sc-auto{background:#eef7f1;border:1.5px solid #bfe3cd;border-radius:12px;padding:10px 12px;margin:8px 0 0;line-height:1.8}.sc-auto a{cursor:pointer;font-size:13px;margin-inline-start:6px}' +
    '.sc-q .btn{margin:6px 0 0 6px}.sc-q a.lnk{cursor:pointer;font-size:13px}' +
    '.sc-hint.ok{color:#1f7a45;font-weight:700}.sc-done{background:#e4f4ec;border-radius:12px;padding:12px 14px;line-height:1.9;margin-top:12px}.sc-done .btn{margin-top:8px}';
  document.head.appendChild(st);
  m = document.createElement('div');
  m.id = 'scModal'; m.className = 'modal hidden';
  m.innerHTML = '<div class="modal-box"><h2>📤 إرسال النموذج</h2><p class="sc-sub" id="scTitle"></p>' +
    '<div id="scFormBox"><label>إرسال إلى</label><div class="sc-to" id="scTo">' +
    '<label><input type="radio" name="scTo" value="c" checked><span>' + SC_ICO_C + 'المركز</span></label><label><input type="radio" name="scTo" value="t"><span>' + SC_ICO_T + 'المعلمة</span></label></div>' +
    '<div id="scCBox"><p class="sc-auto hidden" id="scCAuto"></p><div id="scCPick"><label for="scCenter">المركز</label><select id="scCenter"></select><p class="sc-hint" id="scHint"></p></div></div>' +
    '<div id="scTBox" class="hidden"><p class="sc-auto hidden" id="scTAuto"></p><div id="scTPick"><label for="scTeacher">المعلمة</label><input id="scTeacher" list="scTList" autocomplete="off" placeholder="اكتبي أو اختاري اسم المعلمة من القائمة"><datalist id="scTList"></datalist><p class="sc-hint" id="scTHint"></p></div></div>' +
    '<label>طريقة الإرسال</label><div class="sc-modes">' +
    '<label><input type="radio" name="scMode" value="ack" checked><span>اطلاع فقط<small id="scMAck"></small></span></label>' +
    '<label><input type="radio" name="scMode" value="sign"><span>اطلاع وتوقيع<small id="scMSign"></small></span></label></div>' +
    '<label for="scNote">ملاحظة (اختياري)</label><textarea id="scNote" rows="3" placeholder="مثال: نأمل الاطلاع ومتابعة الملاحظات الواردة"></textarea>' +
    '<div class="sc-acts"><button class="btn" id="scGo" onclick="scSend(this)">إرسال</button><button class="btn light" onclick="scClose()">إغلاق</button></div></div>' +
    '<div id="scDone" class="hidden"></div>' +
    '<div class="sc-prev hidden" id="scPrev"></div></div>';
  m.addEventListener('click', e => { if (e.target === m) scClose(); });
  m.querySelectorAll('#scTo input').forEach(i => i.addEventListener('change', scToChanged));
  m.querySelector('#scTeacher').addEventListener('input', scTPicked);
  if (scNoTeacher()) { const to = m.querySelector('#scTo'); to.previousElementSibling.remove(); to.remove(); m.querySelector('#scTBox').remove(); }
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
  let L = (SC_CENTERS || []).filter(c => scKey(c.name) === k);
  if (!L.length) {   // اختلاف بسيط في كتابة الاسم: يُقبل إن كان أحد الاسمين جزءاً من الآخر ولا يحتمل غير مركز واحد
    L = (SC_CENTERS || []).filter(c => { const ck = scKey(c.name); return ck && (ck.indexOf(k) > -1 || k.indexOf(ck) > -1); });
    if (new Set(L.map(c => scKey(c.name))).size > 1) return '';
  }
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
  const toC = document.querySelector('#scModal input[name="scTo"][value="c"]'); if (toC) toC.checked = true;
  document.getElementById('scFormBox').classList.remove('hidden');
  document.getElementById('scDone').classList.add('hidden');
  if (document.getElementById('scTeacher')) { document.getElementById('scTeacher').value = ''; document.getElementById('scTHint').textContent = ''; scAutoShow('T', ''); }
  scAutoShow('C', '');
  scToChanged();
  const sel = document.getElementById('scCenter'), hint = document.getElementById('scHint');
  sel.innerHTML = '<option value="">جارِ تحميل المراكز...</option>'; hint.textContent = '';
  m.classList.remove('hidden');
  scPrev();
  try { await scCentersLoad(); } catch (e) { sel.innerHTML = '<option value="">تعذّر تحميل المراكز</option>'; return toast(e.message, false); }
  if (!scCur || scCur.id !== id) return;
  if (!SC_CENTERS.length) { sel.innerHTML = '<option value="">لا توجد حسابات مراكز بعد</option>'; hint.textContent = 'تُضاف الحسابات في ورقة «حسابات المراكز» في الشيت.'; return; }
  const g = scGuess(def.center ? def.center(rec) : '', def.period ? def.period(rec) : '');
  // المراكز المشرفة عليها فقط (ومركز النموذج نفسه دائماً)
  let SCL = typeof mcIsMine === 'function' ? SC_CENTERS.filter(c => c.name === g || mcIsMine(c.name)) : SC_CENTERS;
  sel.innerHTML = '<option value="">' + (SCL.length ? 'اختاري المركز' : NO_CENTERS) + '</option>' + SCL.map(c => '<option value="' + esc(c.name) + '">' + esc(c.display || c.name) + '</option>').join('');
  sel.value = g;
  hint.textContent = g ? '' : (def.center && def.center(rec) ? 'لم يُعثر على حساب لمركز «' + def.center(rec) + '»، اختاريه من القائمة.' : '');
  scAutoShow('C', g ? SC_ICO_C + 'يُرسَل إلى: <b>' + esc(scCenterName(g)) + '</b> <small>(من اسم المركز في النموذج)</small>' : '');
  scPrev();
}
// المُرسَل إليه محدَّد تلقائياً من النموذج: يظهر نصاً ثابتاً مع «تغيير»، والقائمة لا تظهر إلا عند الحاجة
function scAutoShow(w, html) {
  const a = document.getElementById('sc' + w + 'Auto'), p = document.getElementById('sc' + w + 'Pick');
  if (!a || !p) return;
  a.innerHTML = html ? html + ' <a class="lnk" onclick="scAutoShow(\'' + w + '\', \'\')">تغيير</a>' : '';
  a.classList.toggle('hidden', !html); p.classList.toggle('hidden', !!html);
}
/* ---------- الإرسال للمعلمة: اختيار الاسم من سجل المعلمات (الأسماء المكررة مرقّمة) ---------- */
function scToChanged() {
  const t = (document.querySelector('#scModal input[name="scTo"]:checked') || {}).value === 't';
  if (!document.getElementById('scTBox')) { document.getElementById('scMAck').textContent = 'تطّلع المديرة على النموذج وتضغط «تم الاطلاع».'; document.getElementById('scMSign').textContent = 'تطّلع المديرة على النموذج وتوقّع عليه من حساب المركز.'; return; }
  document.getElementById('scCBox').classList.toggle('hidden', t);
  document.getElementById('scTBox').classList.toggle('hidden', !t);
  const who = t ? 'المعلمة' : 'المديرة';
  document.getElementById('scMAck').textContent = 'تطّلع ' + who + ' على النموذج وتضغط «تم الاطلاع».';
  document.getElementById('scMSign').textContent = 'تطّلع ' + who + ' على النموذج وتوقّع عليه من ' + (t ? 'حسابها في أيقونة «المعلمات»' : 'حساب المركز') + '.';
  if (t) scTDirLoad().then(scTGuess);
}
function scTDirLoad() {
  if (SC_TDIR) return Promise.resolve(SC_TDIR);
  if (scTLoading) return scTLoading;
  const build = L => {
    SC_TDIR = L || []; SC_TBY = {}; SC_TLBL = {};
    const cnt = {}, seen = {};
    SC_TDIR.forEach(t => { const k = scNorm(t.name); cnt[k] = (cnt[k] || 0) + 1; });
    const rows = SC_TDIR.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(t => {
      const k = scNorm(t.name); seen[k] = (seen[k] || 0) + 1;
      const lbl = cnt[k] > 1 ? t.name + ' (' + scDig(seen[k]) + ')' : t.name;
      SC_TBY[scNorm(lbl)] = t; SC_TLBL[t.id] = lbl; return lbl;
    });
    document.getElementById('scTList').innerHTML = rows.map(l => '<option value="' + esc(l) + '">').join('');
  };
  const c = typeof cacheGet === 'function' ? cacheGet('tdir') : null;
  if (c && c.length) build(c);
  scTLoading = api('teacherDir').then(o => { build(o.data || []); if (typeof cacheSet === 'function') cacheSet('tdir', SC_TDIR); return SC_TDIR; })
    .catch(e => { if (!SC_TDIR) toast('تعذّر تحميل أسماء المعلمات: ' + e.message, false); return SC_TDIR || []; })
    .finally(() => { scTLoading = null; });
  return SC_TDIR ? Promise.resolve(SC_TDIR) : scTLoading;
}
// المعلمة من النموذج نفسه (إن كان مرتبطاً بمعلمة، أو اسمها مطابق لاسم واحد في السجل)
function scTGuess() {
  if (!scCur || document.getElementById('scTeacher').value.trim()) return;
  const r = scCur.rec, d = r.data || {};
  let lbl = d.tid && SC_TLBL[d.tid];
  if (!lbl && r.teacher && typeof tdFind === 'function' && typeof T_DIR !== 'undefined' && T_DIR) { const x = tdFind(r.teacher, r.center, d.tid); if (x.why === 'ok') lbl = SC_TLBL[x.t.id]; }
  if (!lbl && r.teacher) { const L = (SC_TDIR || []).filter(t => scNorm(t.name) === scNorm(r.teacher)); if (L.length === 1) lbl = SC_TLBL[L[0].id]; }
  if (lbl) { document.getElementById('scTeacher').value = lbl; scTPicked(); const t = scTSel(); if (t) scAutoShow('T', SC_ICO_T + 'يُرسَل إلى: <b>' + esc(t.name) + '</b> <small>(من اسم المعلمة في النموذج)</small>'); }
}
const scTSel = () => SC_TBY[scNorm(document.getElementById('scTeacher').value)] || null;
function scTPicked() {
  const v = document.getElementById('scTeacher').value.trim(), h = document.getElementById('scTHint'), t = scTSel();
  h.className = 'sc-hint' + (t ? ' ok' : '');
  h.textContent = !v ? '' : t ? '✔ يصل إلى: ' + t.name : 'اختاري الاسم من القائمة';
}

function scPrev() {
  const box = document.getElementById('scPrev');
  if (!scCur) return;
  const L = scFor(scCur.src, scCur.id);
  box.classList.toggle('hidden', !L.length);
  if (!L.length) return;
  box.innerHTML = '<h3>أُرسل سابقاً</h3>' + L.map(x => {
    const id = esc(x.id);
    return '<div class="sc-it"><b>' + esc(scWho(x)) + '</b> — ' + (x.mode === 'sign' ? 'اطلاع وتوقيع' : 'اطلاع فقط') + '<br>' +
      '<span style="color:var(--muted)">أُرسل: ' + esc(scDig(x.at)) + '</span><br>' + scStatus(x) +
      (x.status !== 'new' ? ' <small>' + esc(scDig(x.doneAt)) + (x.signer ? ' — ' + esc(x.signer) : '') + '</small>' : '') +
      (x.note ? '<br><small>ملاحظتك: ' + esc(x.note) + '</small>' : '') +
      '<div id="scSig_' + id + '"></div><div class="act">' +
      (x.status === 'sign' ? '<button class="btn light" onclick="scShowSig(\'' + id + '\', this)">عرض التوقيع</button>' : '') +
      '<button class="btn light" onclick="scSentFile(\'' + id + '\', this)">الملف المرسل</button>' +
      (x.status === 'new' ? '<button class="btn danger" onclick="scUnsend(\'' + id + '\', this)">سحب الإرسال</button>' : '') + '</div></div>';
  }).join('');
}
// النسخة الثانية بالصيغة الأخرى (PDF ↔ Excel) لتختار المديرة أو المعلمة الصيغة عند الحفظ. إن تعذّر تجهيزها يُرسل الملف الأساسي وحده
async function scAltFile(def, rec, to, tch) {
  if (!def.alt) return null;
  try { return await def.alt(rec, to, tch); } catch (e) { console.warn('alt file failed', e); return null; }
}
const scAltData = async f2 => f2 ? { name2: f2.name, mime2: f2.mime, data2: await scB64(f2.blob) } : {};
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
  const toT = (document.querySelector('#scModal input[name="scTo"]:checked') || {}).value === 't';
  const center = toT ? '' : document.getElementById('scCenter').value, tch = toT ? scTSel() : null;
  if (!toT && !center) return toast('اختاري المركز', false);
  if (toT && !tch) return toast('اختاري المعلمة من القائمة', false);
  const mode = (document.querySelector('#scModal input[name="scMode"]:checked') || {}).value || 'ack';
  const note = document.getElementById('scNote').value.trim();
  const { src, id, rec, def } = scCur;
  const dup = scFor(src, id).find(x => toT ? (x.to === 't' && x.center === tch.name) : (x.to !== 't' && x.center === center));
  if (dup && dup.status !== 'new' && !confirm('سبق إرسال هذا النموذج لهذه الجهة واطّلعت عليه. هل تريدين إرساله مرة أخرى؟')) return;
  setBtnBusy(btn, true, 'جارِ تجهيز الملف...');
  try {
    const f = await def.file(rec, toT ? 't' : 'c', tch);   // للمعلمة قد تكون نسخة خاصة بها (مثل استمارة التقييم دون الدرجات)
    const f2 = await scAltFile(def, rec, toT ? 't' : 'c', tch);
    btn.innerHTML = 'جارِ الإرسال...';
    const out = await api('sendCenter', Object.assign({ src, srcId: id, title: def.title(rec), to: toT ? 't' : 'c', center, tid: tch ? tch.id : '', mode, note, name: f.name, mime: f.mime, data: await scB64(f.blob) }, await scAltData(f2)));
    SC_SENT = (SC_SENT || []).filter(x => x.id !== out.item.id);
    SC_SENT.unshift(out.item);
    if (typeof cacheSet === 'function') cacheSet('sc_sent', SC_SENT);
    scPaint(); scPrev();
    if (!toT) {
      toast(out.replaced ? 'تم تحديث النسخة المرسلة للمركز' : 'تم الإرسال للمركز، ويظهر لهم في «الوارد من المشرفات»');
      return scClose();
    }
    // للمعلمة: رسالة نجاح وزر تنبيهها في واتساب
    const wa = scWa(out.tPhone), title = def.title(rec);
    const msg = 'السلام عليكم ورحمة الله وبركاته\nالأستاذة/ ' + tch.name + ' المحترمة\nنفيدكِ بأنه أُرسل إليكِ «' + title + '»، وهو بانتظار ' +
      (mode === 'sign' ? 'اطّلاعكِ وتوقيعكِ' : 'اطّلاعكِ') + '.\n' + (note ? 'ملاحظة: ' + note + '\n' : '') +
      'يُرجى الدخول إلى منظومة مشرفات ← أيقونة «المعلمات» برقم جوالكِ وكلمة المرور:\n' + new URL('teachers.html', location.href).href + '\n' +
      (typeof myName === 'function' && myName() ? 'المشرفة: ' + myName() + '\n' : '') + 'جمعية فرقان';
    document.getElementById('scFormBox').classList.add('hidden');
    const done = document.getElementById('scDone');
    done.innerHTML = '<div class="sc-done">✅ ' + (out.replaced ? 'تم تحديث النسخة المرسلة' : 'تم الإرسال') + ' للمعلمة <b>' + esc(tch.name) + '</b>، ويظهر لها الآن في أيقونة «المعلمات».<br>' +
      (wa ? 'لتنبيهها: اضغطي الزر لفتح محادثتها في واتساب برسالة جاهزة، ثم اضغطي إرسال.<br><a class="btn id-wa" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(msg) + '">💬 تنبيه المعلمة في واتساب</a>'
        : '<span style="color:#a12a2a">لا يوجد رقم جوال صحيح للمعلمة في سجل المعلمات، فلا يمكن تنبيهها في واتساب.</span>') + '</div>';
    done.classList.remove('hidden');
  } catch (e) { toast(e.message || 'تعذّر الإرسال', false); }
  finally { setBtnBusy(btn, false); }
}
/* ---------- إرسال مباشر للمديرة بضغطة واحدة: المركز من النموذج نفسه ---------- */
async function scQuick(src, id, mode, btn) {
  const def = SC_SRC[src], rec = def && def.rec(id);
  if (!rec) { toast('النموذج غير موجود، حدّثي القائمة', false); return null; }
  setBtnBusy(btn, true, 'جارِ الإرسال...');
  try {
    await scCentersLoad();
    const center = scGuess(def.center ? def.center(rec) : '', def.period ? def.period(rec) : '');
    if (!center) {
      toast('لم يُعثر على حساب لمركز النموذج، اختاريه من القائمة', false);
      scOpen(src, id).then(() => { const x = document.querySelector('#scModal input[name="scMode"][value="' + mode + '"]'); if (x) x.checked = true; });
      return null;
    }
    await scLoad();
    const dup = scFor(src, id).find(x => x.to !== 't' && x.center === center);
    if (dup && dup.status !== 'new' && !confirm('سبق إرسال هذا النموذج لهذا المركز واطّلعت عليه المديرة. هل تريدين إرساله مرة أخرى؟')) return null;
    const f = await def.file(rec, 'c', null);
    const f2 = await scAltFile(def, rec, 'c', null);
    const out = await api('sendCenter', Object.assign({ src, srcId: id, title: def.title(rec), to: 'c', center, tid: '', mode, note: '', name: f.name, mime: f.mime, data: await scB64(f.blob) }, await scAltData(f2)));
    SC_SENT = (SC_SENT || []).filter(x => x.id !== out.item.id); SC_SENT.unshift(out.item);
    if (typeof cacheSet === 'function') cacheSet('sc_sent', SC_SENT);
    scPaint();
    out.centerName = scCenterName(center);
    return out;
  } catch (e) { toast(e.message || 'تعذّر الإرسال', false); return null; }
  finally { setBtnBusy(btn, false); }
}
// صندوق «المديرة» في نافذة ما بعد الحفظ: زران للإرسال المباشر (اطلاع / اطلاع وتوقيع) وخيارات أخرى
function scMgrBox(src, id, what) {
  const a = '\'' + src + '\', \'' + esc(id) + '\'';
  return '<div class="sa-mgr sc-q"><b>المديرة:</b> يُرسَل ' + what + ' لمركز النموذج مباشرة.<br>' +
    '<button class="btn" onclick="scQuickIn(this, ' + a + ', \'ack\')">📤 للاطلاع فقط</button>' +
    '<button class="btn" onclick="scQuickIn(this, ' + a + ', \'sign\')">📤 للاطلاع والتوقيع</button><br>' +
    '<a class="lnk" onclick="scMore(' + a + ')">خيارات أخرى (ملاحظة، أو مركز آخر)</a></div>';
}
async function scQuickIn(btn, src, id, mode) {
  const box = btn.closest('.sc-q');
  const out = await scQuick(src, id, mode, btn);
  if (out && box) box.innerHTML = '<b>المديرة:</b> ✔ ' + (out.replaced ? 'حُدّثت النسخة المرسلة لـ' : 'أُرسل إلى ') + '<b>' + esc(out.centerName) + '</b> ' + (mode === 'sign' ? 'للاطلاع والتوقيع' : 'للاطلاع فقط') + '، ويظهر لهم في «الوارد من المشرفات».';
}
function scMore(src, id) {
  ['sgModal', 'idModal'].forEach(k => { const m = document.getElementById(k); if (m) m.classList.add('hidden'); });
  scOpen(src, id);
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
  if (!confirm('سحب الإرسال؟ سيختفي النموذج من عند الجهة المرسل إليها.')) return;
  setBtnBusy(btn, true, '...');
  try {
    await api('unsend', { id });
    SC_SENT = (SC_SENT || []).filter(x => x.id !== id);
    if (typeof cacheSet === 'function') cacheSet('sc_sent', SC_SENT);
    scPaint(); scPrev(); toast('تم سحب الإرسال');
  } catch (e) { toast(e.message, false); setBtnBusy(btn, false); }
}
