/* ===== وحدة تحفيظ الصغار: إجراءات الموظفات (إنذار شفوي، إنذار خطي، تعهد موظفة مقصرة، ملاحظات على موظفة) =====
   تعبّئ المشرفة النموذج وتوقّع، وبعد الحفظ يُرسَل للموظفة (من اسمها في النموذج) لتطّلع وتوقّع من حسابها في «المعلمات»
   فيُكتب توقيعها في النموذج. ولمديرة المركز: «📤 إرسال للمديرة» (اطلاع فقط، أو اطلاع وتوقيع) كما كان.
   الشكل والطباعة في sighar-print.js (stfDocHtml)، ويُحمَّل هذا الملف بعد sighar.js. */
let STF = [], sfEdit = null, sfType = '', SF_DIRS = null;
ALL_VIEWS.push('sfListView', 'sfForm');
const sfEmpW = makeSigWidget('sfEmpW', {});
const sfSupW = makeSigWidget('sfSupW', { saved: true });   // توقيع المشرفة (يمكن حفظه للنماذج القادمة)
hdBuild('sf');
hpBuild('sfOd'); hpBuild('sfWd');
['sfOralDay', 'sfWrDay'].forEach(id => { $(id).innerHTML = '<option value="">اليوم</option>' + DAYS.map(x => '<option>' + x + '</option>').join(''); });
$('sfTypes').innerHTML = STF_ORDER.map(k => '<button class="tile" onclick="sfNew(\'' + k + '\')"><b>' + esc(STF_TYPES[k]) + '</b></button>').join('');
$('sfFType').innerHTML = '<option value="">كل النماذج</option>' + STF_ORDER.map(k => '<option value="' + k + '">' + esc(STF_TYPES[k]) + '</option>').join('');
$('sfPeriod').addEventListener('change', e => {
  if (e.target.checked) document.querySelectorAll('#sfPeriod input').forEach(i => { if (i !== e.target) i.checked = false; });
  sfMgrAuto();
});
const sfForm = r => (r.data && r.data.form) || r.form || '';

/* ---------- السجل ---------- */
function sfOpenList() { show('sfListView'); loadStf(); }
async function loadStf(silent) {
  if (!STF.length) { const c = cacheGet('stf'); if (c) STF = c; }
  renderStf();
  try { STF = (await api('getStf')).data || []; cacheSet('stf', STF); renderStf(); }
  catch (e) { if (!silent) toast(e.message, false); }
}
const sfSigTag = (on, at) => on ? '<span class="tag ok">✔ وقّعت' + (at ? ' <small>' + esc(at) + '</small>' : '') + '</span>' : '<span class="tag warn">⏳ لم توقّع</span>';
function renderStf() {
  const t = $('sfFType').value, q = sgNorm($('sfFQ').value);
  const L = STF.filter(r => (!t || sfForm(r) === t) && (!q || sgNorm(r.teacher + ' ' + r.center).indexOf(q) > -1));
  rcStart();
  if (!L.length) { $('sfBody').innerHTML = rcEmpty(STF.length ? 'لا توجد نتائج' : 'لا توجد نماذج محفوظة'); return; }
  $('sfBody').innerHTML = L.map((r, i) => {
    const id = esc(r.id), d = r.data || {}, sg = d.sigs || {};
    return rcCard({ no: arD(i + 1), title: esc(r.teacher) || '—', sub: esc(STF_TYPES[sfForm(r)] || ''),
      meta: [rcM('المركز', esc([r.center, r.period].filter(Boolean).join(' — '))), rcM('التاريخ', (esc(d.dayName || '') + ' ' + (d.hy ? idHDate(r) : '')).trim())],
      tags: (sg.emp ? '<span class="tag ok">✔ وقّعت الموظفة</span>' : '<span class="tag warn">⏳ توقيع الموظفة</span>') +
        (sg.mgr ? '<span class="tag ok">✔ وقّعت المديرة</span>' : '<span class="tag warn">⏳ توقيع المديرة</span>') + scTag('stf', r.id),
      main: [['عرض', 'sfOpen(\'' + id + '\')'], ['PDF', 'sfDo(\'' + id + '\', this, \'pdf\')'], scAct('stf', r.id)],
      more: [['🔗 مشاركة', 'sfDo(\'' + id + '\', this, \'share\')'], '-', ['✏️ تعديل', 'sfEditRec(\'' + id + '\')'], ['✕ حذف', 'sfDel(\'' + id + '\')', 'danger']] });
  }).join('');
}
const sfById = id => STF.find(r => r.id === id);
function sfOpen(id) { const r = sfById(id); if (r) sgView(r); }
function sfDo(id, btn, what) { const r = sfById(id); if (!r) return; what === 'pdf' ? sgPdf(r, btn) : what === 'share' ? sgShare(r, btn) : sgPrint(r, btn); }
async function sfDel(id) {
  if (!confirm('هل تريدين حذف هذا النموذج؟')) return;
  STF = STF.filter(r => r.id !== id);
  cacheSet('stf', STF); renderStf();
  try { await api('deleteStf', { id }); toast('تم الحذف'); }
  catch (e) { toast(e.message, false); loadStf(); }
}
scRegister('stf', {
  rec: id => sfById(id),
  title: r => (STF_TYPES[sfForm(r)] || 'نموذج') + ' — ' + (r.teacher || '') + (r.data && r.data.hy ? ' — ' + idDigits(r.data.hd + '/' + r.data.hm + '/' + r.data.hy) + 'هـ' : ''),
  center: r => r.center, period: r => r.period,
  file: async r => ({ blob: await sgPdfBlob(r), name: sgFileName(r) + '.pdf', mime: 'application/pdf' })
});

/* ---------- بنود النص (الملاحظات / المخالفات / التوجيه) ---------- */
function sfLines(box, L) {
  L = (L && L.length ? L : ['']);
  $(box).innerHTML = '';
  L.forEach(v => sfAddLine(box, v, true));
  sfNum(box);
}
function sfAddLine(box, v, noFocus) {
  const div = document.createElement('div');
  div.className = 'sf-line';
  div.innerHTML = '<b></b><textarea rows="2"></textarea><button type="button" class="btn light" title="حذف البند">✕</button>';
  div.querySelector('textarea').value = v || '';
  div.querySelector('button').onclick = () => { div.remove(); if (!$(box).children.length) sfAddLine(box); sfNum(box); };
  $(box).appendChild(div);
  sfNum(box);
  if (!noFocus) div.querySelector('textarea').focus();
}
const sfNum = box => [...$(box).children].forEach((x, i) => { x.querySelector('b').textContent = idDigits(i + 1) + '-'; });
const sfGet = box => [...$(box).querySelectorAll('textarea')].map(x => x.value.trim()).filter(Boolean);
const sfPrevGet = (dayId, p) => Object.assign({ day: $(dayId).value }, hpGet(p));
const sfPrevSet = (dayId, p, o) => { o = o || {}; $(dayId).value = o.day || ''; hpSet(p, o); };

/* ---------- النموذج ---------- */
function sfLayout(k) {
  sfType = k;
  $('sfTitle').textContent = STF_TYPES[k];
  const notes = k === 'notes';
  $('sfSemBox').classList.toggle('hidden', notes);
  $('sfJobBox').classList.toggle('hidden', !notes);
  $('sfActBox').classList.toggle('hidden', !notes);
  $('sfObsLbl').textContent = k === 'taahud' ? 'المخالفات التي تتعهد الموظفة بعدم تكرارها' : notes ? 'رُصدت حولكِ الملاحظات التالية' : k === 'khatti' ? 'الملاحظات المتكررة على الموظفة' : 'الملاحظات المرصودة على الموظفة';
  $('sfReqCard').classList.toggle('hidden', k === 'taahud');
  $('sfReqLbl').textContent = notes ? 'وعليه مطلوب منكِ التالي' : 'فإنه قد تم إنذارها ' + (k === 'khatti' ? 'خطياً' : 'شفوياً') + ' وتوجيهها إلى';
  $('sfPrevCard').classList.toggle('hidden', k !== 'khatti' && k !== 'taahud');
  $('sfPrevLbl').textContent = k === 'taahud' ? 'الإنذارات السابقة' : 'الإنذار الشفوي السابق';
  $('sfOralLbl').textContent = k === 'taahud' ? 'والتي تم إنذاري بشأنها شفوياً' : 'والتي تم إنذارها بشأنها شفوياً';
  $('sfWrBox').classList.toggle('hidden', k !== 'taahud');
}
function sfFillCenters(cur) {
  const L = centersForMe();
  $('sfCenter').innerHTML = centerOpts(L, centersPh('اختاري المركز')) +
    (cur && L.indexOf(cur) < 0 ? '<option>' + esc(cur) + '</option>' : '');
  $('sfCenter').value = cur || '';
}
function sfFill(k, r) {
  r = r || {};
  const d = r.data || {}, edit = !!r.id;
  sfLayout(k);
  document.querySelectorAll('#sfForm [data-edit]').forEach(x => x.classList.toggle('hidden', !edit));
  sfFillCenters(r.center || '');
  periodSet('sfPeriod', r.period);
  $('sfEmp').value = r.teacher || ''; $('sfSem').value = r.sem || '';
  $('sfJob').value = d.job || ''; $('sfYears').value = d.years || '';
  document.querySelectorAll('#sfAction input').forEach(i => { i.checked = i.value === d.action; });
  hdSet('sf', edit || d.hy ? r : null);
  sfLines('sfObs', d.obs); sfLines('sfReq', d.req);
  sfPrevSet('sfOralDay', 'sfOd', d.oral); sfPrevSet('sfWrDay', 'sfWd', d.written);
  $('sfMgr').value = r.mgrName || ''; $('sfMgr').dataset.auto = '';
  $('sfMgrHint').textContent = d.sigs && d.sigs.mgr ? '✔ وقّعت المديرة من حساب المركز' + (d.mgrAt ? ' بتاريخ ' + d.mgrAt : '') : '';
  $('sfMgr').disabled = !!(d.sigs && d.sigs.mgr);
  $('sfSupName').value = edit ? (r.supName || '') : myName();
  sfEmpW.reset();
  if (edit && d.sigs && d.sigs.emp) sfEmpW.keepOld('الإبقاء على توقيع الموظفة السابق');
  sfSupW.reset();
  if (edit && d.sigs && d.sigs.sup) sfSupW.keepOld('الإبقاء على توقيع المشرفة السابق');
  tdSet('sf', d);
  loadTDir();
}
function sfNew(k) { sfEdit = null; sfFill(k, null); show('sfForm'); sfLoadDirs(); }
function sfEditRec(id) { const r = sfById(id); if (!r) return; sfEdit = r; sfFill(sfForm(r), r); show('sfForm'); sfLoadDirs(); }
function sfBack() { sfEdit = null; show('sfListView'); renderStf(); }

// اسم الموظفة من قائمة سجل المعلمات (tDirList)، وتعبئة الإنذارات السابقة تلقائياً من النماذج المحفوظة لنفس الموظفة
$('sfEmp').addEventListener('change', () => {
  tdPin($('sfEmp'));
  const k = sgNorm($('sfEmp').value);
  if (!k) return;
  const mine = STF.filter(r => sgNorm(r.teacher) === k && (!sfEdit || r.id !== sfEdit.id));
  if (!mine.length) return;
  const last = mine[0], filled = [];
  if (!$('sfCenter').value && last.center) { sfFillCenters(last.center); periodSet('sfPeriod', last.period); filled.push('المركز'); sfMgrAuto(); }
  if (sfType === 'notes') {
    const n = mine.find(r => r.data && (r.data.job || r.data.years));
    if (n && !$('sfJob').value) { $('sfJob').value = n.data.job || ''; $('sfYears').value = n.data.years || ''; filled.push('المسمى الوظيفي'); }
  }
  const prevOf = form => { const r = mine.find(x => sfForm(x) === form); return r && r.data && r.data.hy ? { day: r.data.dayName || '', d: r.data.hd, m: r.data.hm, y: r.data.hy } : null; };
  if ((sfType === 'khatti' || sfType === 'taahud') && !hpGet('sfOd').y) { const o = prevOf('shafawi'); if (o) { sfPrevSet('sfOralDay', 'sfOd', o); filled.push('تاريخ الإنذار الشفوي'); } }
  if (sfType === 'taahud' && !hpGet('sfWd').y) { const o = prevOf('khatti'); if (o) { sfPrevSet('sfWrDay', 'sfWd', o); filled.push('تاريخ الإنذار الخطي'); } }
  if (filled.length) toast('تمت تعبئة: ' + filled.join('، ') + ' من النماذج السابقة');
});

// اسم مديرة المركز من ورقة «أرقام المديرات»
async function sfLoadDirs() {
  if (!SF_DIRS) { const c = cacheGet('dirs'); if (c) SF_DIRS = c; }
  try { SF_DIRS = (await api('getDirectors')).data || []; cacheSet('dirs', SF_DIRS); } catch (e) { if (!SF_DIRS) SF_DIRS = []; }
  sfMgrAuto();
}
function sfCenterChanged() { sfMgrAuto(); }
function sfMgrAuto() {
  const el = $('sfMgr');
  if (el.disabled || (el.value.trim() && el.dataset.auto !== '1')) return;
  const k = scKey($('sfCenter').value);
  if (!k || !SF_DIRS) return;
  let L = SF_DIRS.filter(d => scKey(d.center) === k && d.name);
  const per = periodGet('sfPeriod');
  if (L.length > 1 && per) { const ev = /مسائ/.test(per); const p = L.filter(d => !!d.evening === ev); if (p.length) L = p; }
  if (L[0]) { el.value = L[0].name; el.dataset.auto = '1'; }
}
$('sfMgr').addEventListener('input', () => { $('sfMgr').dataset.auto = ''; });

async function sfSave(btn) {
  const hd = hdGet('sf');
  const req = {
    id: sfEdit ? sfEdit.id : '', center: $('sfCenter').value, period: periodGet('sfPeriod'), sem: sfType === 'notes' ? '' : $('sfSem').value,
    teacher: $('sfEmp').value.trim(), mgrName: $('sfMgr').value.trim(), supName: $('sfSupName').value.trim(), date: hd.greg,
    data: {
      form: sfType, obs: sfGet('sfObs'), req: sfType === 'taahud' ? [] : sfGet('sfReq'),
      oral: sfType === 'khatti' || sfType === 'taahud' ? sfPrevGet('sfOralDay', 'sfOd') : {}, written: sfType === 'taahud' ? sfPrevGet('sfWrDay', 'sfWd') : {},
      job: sfType === 'notes' ? $('sfJob').value.trim() : '', years: sfType === 'notes' ? $('sfYears').value.trim().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)) : '',
      action: sfType === 'notes' ? ((document.querySelector('#sfAction input:checked') || {}).value || '') : '',
      hd: hd.hd, hm: hd.hm, hy: hd.hy, dayName: hd.dayName
    }
  };
  if (!req.center) return toast('اختاري المركز', false);
  if (!req.teacher) return toast('اكتبي اسم الموظفة', false);
  if (!/^\d{4}$/.test(hd.hy)) return toast('اكتبي سنة التاريخ الهجري (مثال: 1448)', false);
  if (!req.data.obs.length) return toast(sfType === 'taahud' ? 'اكتبي المخالفات' : 'اكتبي الملاحظات', false);
  if (sfType === 'notes' && !req.data.action) return toast('اختاري نوع الإجراء المتخذ', false);
  const old = sfEdit && sfEdit.data && sfEdit.data.sigs;
  req.sigs = { emp: sfEmpW.get() || (old && old.emp ? 'keep' : ''), sup: sfSupW.get() || (old && old.sup ? 'keep' : '') };
  if (!req.sigs.sup) return toast('وقّعي توقيع المشرفة', false);
  const sfT = await tdConfirm($('sfEmp'), $('sfCenter'), 'الموظفة');   // الموظفة من اسمها في النموذج نفسه
  if (sfT === undefined) return;
  req.teacher = $('sfEmp').value.trim();
  req.data.tid = sfT ? sfT.id : ''; req.data.tName = sfT ? sfT.name : '';
  setBtnBusy(btn, true);
  try {
    const res = await api('saveStf', req);
    sfSupW.commit();
    AD.done('sfForm', sfEdit && sfEdit.id);
    toast(sfEdit ? 'تم حفظ التعديل' : 'تم حفظ النموذج');
    const prev = sfEdit || {};
    const rec = { id: res.id, kind: 'stf', form: sfType, center: req.center, period: req.period, sem: req.sem, teacher: req.teacher, mgrName: res.mgrName || req.mgrName,
      supName: req.supName, date: req.date, at: prev.at || '',
      data: Object.assign({}, req.data, { sigs: res.sigs || {}, mgrAt: (prev.data && prev.data.mgrAt) || '', empAt: (prev.data && prev.data.empAt) || '' }) };
    STF = STF.filter(r => r.id !== rec.id); STF.unshift(rec);
    cacheSet('stf', STF);
    sfEdit = null;
    // الإرسال للموظفة: اطلاع وتوقيع (أو اطلاع فقط إن وقّعت على الجهاز)
    const out = { what: 'النموذج', src: 'stf', id: rec.id, sent: [], skipped: [], failed: [], none: sfT ? [] : [req.teacher], mgrSign: true };
    if (sfT) {
      btn.innerHTML = '<span class="spin"></span> جارِ الإرسال للموظفة...';
      await sgPushInto(out, 'stf', rec.id, SC_SRC.stf.title(rec), sfT, rec.data.sigs && rec.data.sigs.emp ? 'ack' : 'sign', rec);
    }
    show('sfListView'); renderStf();
    sgAfterSave(out);
    loadStf(true);
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

/* ---------- الحفظ التلقائي ---------- */
AD.register('sfForm', {
  key: () => sfEdit ? sfEdit.id : 'new-' + sfType,
  collect: () => ({ center: $('sfCenter').value, period: periodGet('sfPeriod'), sem: $('sfSem').value, teacher: $('sfEmp').value, mgrName: $('sfMgr').value, supName: $('sfSupName').value,
    data: Object.assign(adHd('sf'), { form: sfType, tid: $('sfEmp').dataset.tid || '', obs: sfGet('sfObs'), req: sfGet('sfReq'), oral: sfPrevGet('sfOralDay', 'sfOd'), written: sfPrevGet('sfWrDay', 'sfWd'),
      job: $('sfJob').value, years: $('sfYears').value, action: (document.querySelector('#sfAction input:checked') || {}).value || '' }) }),
  apply: d => { sfFill(d.data.form || sfType, Object.assign({}, sfEdit || {}, d, { data: Object.assign({}, (sfEdit && sfEdit.data) || {}, d.data) })); },
  reset: () => sfFill(sfType, sfEdit)
});
adWrap('sfNew', () => AD.offer('sfForm')); adWrap('sfEditRec', () => AD.offer('sfForm'));
