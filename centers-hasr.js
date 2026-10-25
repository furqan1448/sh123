/* ===== «حصر الغياب والتأخير والاستئذان» في صفحة «إدارة المراكز» =====
   يعبّئه المركز لكل فصل دراسي، وتوقّع المديرة، ويُرسل لمشرفة الإشراف الإداري المختارة. الشكل والطباعة في hasr.js */
let HSL = [], hsEdit = null, HS_SUPS = null;
const HS_DRAFT = () => 'ctr_hasr_draft_' + (localStorage.getItem(C_NAME) || '');
const hsSig = makeSigWidget('hsSigW', {});
(function () {
  const opt = n => '<option value="' + n + '">' + idDigits(n) + '</option>';
  let dd = '', mm = '';
  for (let i = 1; i <= 30; i++) dd += opt(i);
  for (let i = 1; i <= 12; i++) mm += opt(i);
  $('hsHD').innerHTML = dd; $('hsHM').innerHTML = mm;
})();

/* ---------- القائمة ---------- */
function hsOpenList() { cShow('hsListView'); hsLoad(); }
async function hsLoad() {
  hsRender();
  try { HSL = (await cApi('c_hasr')).data || []; hsRender(); }
  catch (e) { if (e.auth) { toast('انتهت صلاحية الدخول، سجّلي الدخول من جديد', false); cLogout(); } else toast(e.message, false); }
}
const hsById = id => HSL.find(x => x.id === id);
function hsRender() {
  rcStart();
  if (!HSL.length) { $('hsList').innerHTML = rcEmpty('لم يُرسل أي حصر بعد'); return; }
  $('hsList').innerHTML = HSL.map((r, i) => {
    const id = esc(r.id);
    return rcCard({ no: idDigits(i + 1), title: 'الفصل ' + (esc(r.sem) || '—') + (r.year ? ' — ' + esc(idDigits(r.year)) + 'هـ' : ''), sub: esc(r.period || ''),
      meta: [rcM('المشرفة', esc(r.supName)), rcM('عدد الموظفات', idDigits(r.count)), rcM('أُرسل', esc(idDigits(r.at)))],
      tags: r.seen ? '<span class="tag ok">✔ اطّلعت المشرفة' + (r.seenAt ? ' <small>' + esc(idDigits(r.seenAt)) + '</small>' : '') + '</span>' : '<span class="tag warn">⏳ لم تطّلع المشرفة بعد</span>',
      main: [['عرض', 'hsView(\'' + id + '\')'], ['PDF', 'hsDo(\'' + id + '\', this, \'pdf\')'], ['Excel', 'hsDo(\'' + id + '\', this, \'xlsx\')']],
      more: [['✏️ تعديل وإعادة إرسال', 'hsEditRec(\'' + id + '\')'], r.seen ? null : '-', r.seen ? null : ['✕ حذف', 'hsDel(\'' + id + '\')', 'danger']].filter(Boolean) });
  }).join('');
}
const hsSigCache = {};
async function hsSigOf(r) {
  if (!r || !r.data || !r.data.sig) return '';
  if (hsSigCache[r.id] != null) return hsSigCache[r.id];
  try { hsSigCache[r.id] = (await cApi('c_hasr_sig', { id: r.id })).data || ''; } catch (e) { return ''; }
  return hsSigCache[r.id];
}
async function hsDo(id, btn, what) {
  const r = hsById(id); if (!r) return;
  const sig = await hsSigOf(r);
  what === 'xlsx' ? hsXlsx(r, btn) : hsPdf(r, btn, sig);
}
async function hsView(id) {
  const r = hsById(id); if (!r) return;
  $('hsBar').innerHTML = '<button class="btn light" id="hsVPdf">تحميل PDF</button><button class="btn light" id="hsVX">تحميل Excel</button>';
  $('hsDoc').innerHTML = '<p class="empty">جارِ التحميل...</p>';
  cShow('hsDocView');
  const sig = await hsSigOf(r);
  $('hsVPdf').onclick = e => hsPdf(r, e.currentTarget, sig);
  $('hsVX').onclick = e => hsXlsx(r, e.currentTarget);
  $('hsDoc').innerHTML = '<div class="hs-box">' + hsViewHtml(r, sig) + '</div>';
  hsFit($('hsDoc').querySelector('.hs-box'));
}
window.addEventListener('resize', () => hsFit(document.querySelector('#hsDoc .hs-box')));
async function hsDel(id) {
  if (!confirm('هل تريدين حذف هذا الحصر؟')) return;
  try { await cApi('c_hasr_del', { id }); HSL = HSL.filter(x => x.id !== id); hsRender(); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); }
}

/* ---------- الموظفات ---------- */
const HS_MLBL = ['الشهر الأول', 'الشهر الثاني', 'الشهر الثالث'];
function hsEmpHtml() {
  const head = '<span></span><span class="h">ض</span><span class="h">غ</span><span class="h">ج</span><span class="h">تأخير<br>(دقائق)</span><span class="h">استئذان<br>(دقائق)</span>';
  const row = k => '<span class="m" data-ml="' + k + '">' + HS_MLBL[k] + '</span>' + HS_KEYS.map(c => '<input inputmode="numeric" maxlength="4" data-m="' + k + '" data-k="' + c + '">').join('');
  return '<div class="hs-emp-h"><b></b><input class="hs-name" placeholder="اسم الموظفة"><button type="button" class="btn light" title="حذف">✕</button></div>' +
    '<input class="hs-job" placeholder="المسمى الوظيفي" style="margin-top:0">' +
    '<div class="hs-grid">' + head + row(0) + row(1) + row(2) + '<span class="m">المجموع</span>' + HS_KEYS.map(c => '<span class="tot" data-t="' + c + '"></span>').join('') + '</div>' +
    '<input class="hs-note" placeholder="ملاحظات (اختياري)" style="margin-top:8px">';
}
function hsAddEmp(v, noFocus) {
  const div = document.createElement('div');
  div.className = 'hs-emp';
  div.innerHTML = hsEmpHtml();
  v = v || {};
  div.querySelector('.hs-name').value = v.name || '';
  div.querySelector('.hs-job').value = v.job || '';
  div.querySelector('.hs-note').value = v.note || '';
  div.querySelectorAll('input[data-m]').forEach(inp => { const o = (v.m || [])[+inp.dataset.m] || {}; inp.value = o[inp.dataset.k] || ''; });
  div.querySelector('.hs-emp-h .btn').onclick = () => { if ((div.querySelector('.hs-name').value.trim()) && !confirm('حذف هذه الموظفة من الحصر؟')) return; div.remove(); hsNum2(); hsDraft(); };
  div.addEventListener('input', () => { hsTot(div); hsDraft(); });
  $('hsEmps').appendChild(div);
  hsTot(div); hsNum2(); hsMonthLbls();
  if (!noFocus) div.querySelector('.hs-name').focus();
}
const hsNum2 = () => [...$('hsEmps').children].forEach((x, i) => { x.querySelector('.hs-emp-h b').textContent = idDigits(i + 1); });
function hsTot(div) { const t = hsTotals(hsEmpGet(div)); div.querySelectorAll('[data-t]').forEach(el => { el.textContent = hsD(t[el.dataset.t]); }); }
function hsEmpGet(div) {
  const m = [{}, {}, {}];
  div.querySelectorAll('input[data-m]').forEach(inp => { m[+inp.dataset.m][inp.dataset.k] = inp.value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)); });
  return { name: div.querySelector('.hs-name').value.trim(), job: div.querySelector('.hs-job').value.trim(), note: div.querySelector('.hs-note').value.trim(), m };
}
function hsMonthLbls() {
  [0, 1, 2].forEach(k => { const v = $('hsM' + k).value.trim() || HS_MLBL[k]; document.querySelectorAll('#hsEmps [data-ml="' + k + '"]').forEach(el => { el.textContent = v; }); });
}
['hsM0', 'hsM1', 'hsM2'].forEach(id => $(id).addEventListener('input', () => { hsMonthLbls(); hsDraft(); }));
['hsPeriod', 'hsSem', 'hsYear', 'hsSup', 'hsMgr', 'hsHD', 'hsHM', 'hsHY'].forEach(id => $(id).addEventListener('input', () => hsDraft()));

/* ---------- المسودة (على هذا الجهاز) ---------- */
function hsCollect() {
  return { period: $('hsPeriod').value, sem: $('hsSem').value, year: $('hsYear').value.trim(), sup: $('hsSup').value, mgrName: $('hsMgr').value.trim(),
    data: { rows: [...$('hsEmps').children].map(hsEmpGet), months: [0, 1, 2].map(k => $('hsM' + k).value.trim()), hd: $('hsHD').value, hm: $('hsHM').value, hy: $('hsHY').value.trim() } };
}
let hsDraftT = null;
function hsDraft() {
  if (hsEdit) return;
  clearTimeout(hsDraftT);
  hsDraftT = setTimeout(() => { try { localStorage.setItem(HS_DRAFT(), JSON.stringify(hsCollect())); } catch (e) {} }, 400);
}

/* ---------- فتح / تعبئة ---------- */
async function hsLoadSups(cur) {
  const sel = $('hsSup');
  const fill = L => { sel.innerHTML = '<option value="">اختاري المشرفة</option>' + L.map(x => '<option value="' + esc(x.u) + '">' + esc(x.n) + '</option>').join(''); if (cur) sel.value = cur; };
  if (HS_SUPS) return fill(HS_SUPS);
  try { const c = JSON.parse(localStorage.getItem('ctr_sups') || '[]'); if (c.length) fill(c); } catch (e) {}
  try { HS_SUPS = (await cApi('c_sups')).data || []; localStorage.setItem('ctr_sups', JSON.stringify(HS_SUPS)); fill(HS_SUPS); }
  catch (e) { if (sel.options.length < 2) sel.innerHTML = '<option value="">تعذّر تحميل الأسماء</option>'; }
}
function hsFill(r) {
  r = r || {};
  const d = r.data || {};
  $('hsEditNote').classList.toggle('hidden', !hsEdit);
  const nm = (CME && CME.name) || localStorage.getItem(C_NAME) || '';
  $('hsPeriod').value = r.period || (/مسائ/.test(nm) ? 'مسائية' : /صباح/.test(nm) ? 'صباحية' : '');
  $('hsSem').value = r.sem || '';
  const h = idHParts(new Date()) || {};
  $('hsYear').value = r.year || h.y || '';
  [0, 1, 2].forEach(k => { $('hsM' + k).value = (d.months || [])[k] || ''; });
  $('hsEmps').innerHTML = '';
  (d.rows && d.rows.length ? d.rows : [{}]).forEach(x => hsAddEmp(x, true));
  $('hsMgr').value = r.mgrName || localStorage.getItem(C_SIGNER) || '';
  $('hsHD').value = d.hd || h.d || 1; $('hsHM').value = d.hm || h.m || 1; $('hsHY').value = d.hy || h.y || '';
  hsSig.reset();
  if (hsEdit && d.sig) hsSig.keepOld('الإبقاء على التوقيع السابق');
  hsLoadSups(r.sup || '');
}
function hsNew() {
  hsEdit = null;
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(HS_DRAFT()) || 'null'); } catch (e) {}
  if (draft && draft.data && (draft.data.rows || []).some(x => x.name) && confirm('توجد مسودة محفوظة على هذا الجهاز، هل تريدين إكمالها؟')) { hsFill(draft); }
  else {
    // أسماء الموظفات ومسمياتهن من آخر حصر (والأرقام فارغة)
    const last = HSL[0];
    const rows = last && last.data && last.data.rows ? last.data.rows.map(x => ({ name: x.name, job: x.job })) : null;
    hsFill({ sup: last && last.sup, mgrName: last && last.mgrName, period: last && last.period, data: rows ? { rows } : {} });
    if (rows) toast('تمت تعبئة أسماء الموظفات من الحصر السابق');
  }
  cShow('hsForm');
}
function hsEditRec(id) { const r = hsById(id); if (!r) return; hsEdit = r; hsFill(r); cShow('hsForm'); }

async function hsSave(btn) {
  const req = hsCollect();
  req.data.rows = req.data.rows.filter(x => x.name);
  if (!req.period) return toast('اختاري الفترة', false);
  if (!req.sem) return toast('اختاري الفصل الدراسي', false);
  if (!req.data.rows.length) return toast('أضيفي موظفة واحدة على الأقل', false);
  if (!req.sup) return toast('اختاري المشرفة المرسل إليها', false);
  if (!req.mgrName) return toast('اكتبي اسم مديرة المركز', false);
  const sig = hsSig.get() || (hsEdit && hsEdit.data && hsEdit.data.sig ? 'keep' : '');
  if (!sig) return toast('وقّعي في خانة توقيع مديرة المركز', false);
  req.id = hsEdit ? hsEdit.id : ''; req.signature = sig;
  setBtnBusy(btn, true, 'جارِ الإرسال...');
  try {
    const out = await cApi('c_hasr_save', req);
    try { localStorage.setItem(C_SIGNER, req.mgrName); if (!hsEdit) localStorage.removeItem(HS_DRAFT()); } catch (e) {}
    if (sig !== 'keep') hsSigCache[out.id] = sig;
    toast('تم الإرسال للمشرفة ' + (out.supName || ''));
    hsEdit = null;
    hsOpenList();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}
