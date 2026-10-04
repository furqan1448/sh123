// ===== استمارات التقييم النهائية — استمارة تقييم القرآن الكريم (النهائي) =====
// البنود والدرجات مطابقة لملفي الإكسل (بدون تعدد / تعدد المجموعات) وهي نفس بنود الاستمارة الأسبوعية (EV و EV2 في evals.js)
// الفرق الوحيد: النهائية درجات فقط (بدون التنفيذ والمعايير والملاحظات)، وتُحفظ بنوع f_single / f_multi
const EF_TYPES = { single: 'بدون تعدد', multi: 'تعدد المجموعات' };
// قائمة الفئة كما في ملف الإكسل لكل نوع
const EF_CATS = {
  single: ['أمهات', 'متعلمات', 'ناشئة', 'متعلمات - ناشئة'],
  multi: ['أمهات', 'متعلمات', 'ناشئة']
};
let efType = 'single', efTypeBuilt = '', efBuilt = false, efPad = null;
const efD = () => efType === 'multi' ? EV2 : EV;

/* ---------- بناء الاستمارة ---------- */
function efBuild() {
  let n = 0, html = '';
  EV_SECTIONS.forEach((sec, si) => {
    html += '<details class="card ev-sec"' + (si === 0 || window.innerWidth >= 900 ? ' open' : '') + '><summary><span>' + esc(sec.title) +
      '</span><span class="ev-prog"><b id="efC_' + sec.key + '">0</b>/' + efD()[sec.key].length + '</span></summary>';
    efD()[sec.key].forEach((it, i) => {
      html += '<div class="tb-item"><span class="ev-num">' + (i + 1) + '</span><b>' + esc(it.t) + '</b>' +
        '<span class="ev-sc"><input type="number" inputmode="decimal" min="0" max="' + it.max + '" step="0.5" data-i="' + (n++) + '" placeholder="0"><small>/' + it.max + '</small></span></div>';
    });
    html += '<div class="ev-sub">المجموع: <b id="efS_' + sec.key + '">0</b> من ' + evFmt(sec.maxSum) +
      ' &nbsp;|&nbsp; الموزونة: <b id="efW_' + sec.key + '">0</b> من ' + evFmt(sec.target) + '</div></details>';
  });
  document.getElementById('efSections').innerHTML = html;
}

function efBind() {
  const box = document.getElementById('efSections');
  box.addEventListener('input', efCalc);
  box.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.i === undefined) return;
    const max = +el.max;
    if (el.value !== '') {
      let v = parseFloat(el.value);
      if (isNaN(v) || v < 0) v = 0;
      if (v > max) { v = max; toast('أعلى درجة لهذا البند ' + max, false); }
      el.value = v;
    }
    efCalc();
  });
}

// تعبئة البنود الفارغة فقط بالدرجة الكاملة (للتعديل بعدها حسب الحاجة)
function efFillMax() {
  let c = 0;
  document.querySelectorAll('#efSections input').forEach(i => { if (i.value === '') { i.value = i.max; c++; } });
  efCalc();
  toast(c ? 'تمت تعبئة ' + c + ' بند بالدرجة الكاملة، عدّلي ما يلزم' : 'كل البنود معبأة');
}

function efCalc() {
  const ins = document.querySelectorAll('#efSections input');
  let idx = 0, rawTotal = 0, wTotal = 0, filledAll = 0;
  EV_SECTIONS.forEach(sec => {
    let sum = 0, filled = 0;
    efD()[sec.key].forEach(it => {
      const el = ins[idx++]; if (!el) return;
      const v = parseFloat(el.value);
      if (!isNaN(v)) { sum += Math.min(Math.max(v, 0), it.max); filled++; }
    });
    filledAll += filled;
    const w = sum * sec.target / sec.maxSum;
    const ce = document.getElementById('efC_' + sec.key); if (ce) ce.textContent = filled;
    const se = document.getElementById('efS_' + sec.key); if (se) se.textContent = evFmt(sum);
    const we = document.getElementById('efW_' + sec.key); if (we) we.textContent = evFmt(w);
    rawTotal += sum; wTotal += w;
  });
  const g = evGrade(wTotal);
  document.getElementById('efRaw').textContent = evFmt(rawTotal);
  document.getElementById('efWeighted').textContent = evFmt(wTotal);
  setGrade(document.getElementById('efGrade'), filledAll ? g : '—');
  return { rawTotal, wTotal, grade: g };
}

/* ---------- فتح الاستمارة ---------- */
function efFillCats() {
  const cur = document.getElementById('efCat').value, cur2 = document.getElementById('efCat2').value;
  document.getElementById('efCat').innerHTML = evOpts(EF_CATS[efType], 'اختاري الفئة');
  document.getElementById('efCat2').innerHTML = evOpts(EF_CATS[efType], 'اختاري الفئة');
  evSetSel('efCat', cur); evSetSel('efCat2', cur2);
}

function efOpenForm(type) {
  efType = type === 'multi' ? 'multi' : 'single';
  show('evfFormView');
  document.getElementById('efTypeLabel').textContent = EF_TYPES[efType];
  if (!efBuilt) {
    efBind();
    document.getElementById('efPeriod').innerHTML = evOpts(EV.lists.period, 'اختاري الفترة');
    document.getElementById('efQual').innerHTML = evOpts(EV.lists.qual, 'اختاري المؤهل');
    document.getElementById('efDay').innerHTML = evOpts(EV.lists.day, 'اختاري اليوم');
    efPad = makeSigWidget('efSigW', { saved: true, none: true });
    efBuilt = true;
  }
  if (efTypeBuilt !== efType) { efBuild(); efTypeBuilt = efType; efFillCats(); }
  document.getElementById('efCenter').innerHTML = evOpts(LISTS.centers, 'اختاري المركز');
  evSetVal('efSupervisor', getUser());   // اسم المشرفة تلقائياً من حساب الدخول
  evFillTeacherList();
  if (!document.getElementById('efDate').value) { document.getElementById('efDate').value = todayStr(); efDateChange(); }
  efCalc();
  setTimeout(() => efPad.resize(), 60);
}

function efDateChange() {
  const v = document.getElementById('efDate').value;
  if (!v) return;
  const p = v.split('-');
  const name = DAYS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
  if (EV.lists.day.indexOf(name) > -1) document.getElementById('efDay').value = name;
}

/* ---------- الحفظ ---------- */
async function efSave() {
  const val = id => document.getElementById(id).value.trim();
  const center = val('efCenter'), period = val('efPeriod'), teacher = val('efTeacher'), date = val('efDate');
  if (!center) return toast('اختاري اسم المركز', false);
  if (!period) return toast('اختاري الفترة', false);
  if (!teacher) return toast('اكتبي اسم المعلمة', false);
  if (!date) return toast('اختاري التاريخ', false);

  const inputs = [...document.querySelectorAll('#efSections input')];
  const empty = inputs.filter(i => i.value === '');
  if (empty.length) {
    const d = empty[0].closest('details'); if (d) d.open = true;
    empty[0].scrollIntoView({ block: 'center' }); empty[0].focus();
    return toast('بقي ' + empty.length + ' بند بدون درجة (اكتبي 0 إن لم ينل شيئاً)', false);
  }
  const items = inputs.map(i => ({ score: i.value }));

  const btn = document.getElementById('efSaveBtn');
  const calc = efCalc();
  const ft = 'f_' + efType;
  // fin: علامة تضمن بقاء الاستمارة ضمن «النهائية» حتى لو كانت نسخة Apps Script قديمة
  const extra = {
    fin: ft, kind: val('efKind'), groups: val('efGroups'),
    cat2: val('efCat2'), total2: val('efTotal2'), present2: val('efPresent2')
  };
  setBtnBusy(btn, true);
  try {
    const editing = EDIT;
    const payload = {
      id: editing ? editing.id : undefined,
      center, period, teacher, date, items, formType: ft,
      raw: evFmt(calc.rawTotal), weighted: evFmt(calc.wTotal), grade: calc.grade,
      qual: val('efQual'), cat: val('efCat'), day: val('efDay'), lesson: val('efLesson'),
      years: val('efYears'), total: val('efTotalN'), present: val('efPresent'), visitNo: val('efVisitNo'),
      supervisor: val('efSupervisor'), notes: val('efNotes'), recs: val('efRecs'),
      extra: JSON.stringify(extra),
      signature: efPad.get()
    };
    const res = await api(editing ? 'updateEval' : 'addEval', payload);
    toast(editing ? 'تم تحديث الاستمارة' : 'تم حفظ الاستمارة');
    efPad.commit();
    evAfterSave(payload, res, editing);
    efReset();
    show('evalsFinalView');
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

function efReset() {
  ['efCenter', 'efPeriod', 'efTeacher', 'efQual', 'efCat', 'efDay', 'efKind', 'efTotalN', 'efPresent', 'efGroups',
    'efCat2', 'efTotal2', 'efPresent2', 'efYears', 'efLesson', 'efVisitNo', 'efNotes', 'efRecs']
    .forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('#efSections input').forEach(el => el.value = '');
  document.getElementById('efDate').value = todayStr(); efDateChange();
  if (efPad) efPad.reset();
  efCalc();
}

/* ---------- تعديل استمارة محفوظة (يُستدعى من evEdit) ---------- */
function efEdit(r) {
  efOpenForm(r.formType === 'f_multi' ? 'multi' : 'single'); efReset();
  const ex = evJson(r.extra, {});
  evSetSel('efCenter', r.center); evSetSel('efPeriod', r.period); evSetVal('efTeacher', r.teacher); evSetVal('efDate', r.date);
  evSetSel('efDay', r.day); evSetVal('efVisitNo', r.visitNo); evSetVal('efKind', ex.kind); evSetSel('efQual', r.qual);
  evSetSel('efCat', r.cat); evSetVal('efYears', r.years); evSetVal('efLesson', r.lesson); evSetVal('efSupervisor', r.supervisor);
  evSetVal('efTotalN', r.total); evSetVal('efPresent', r.present); evSetVal('efGroups', ex.groups);
  evSetSel('efCat2', ex.cat2); evSetVal('efTotal2', ex.total2); evSetVal('efPresent2', ex.present2);
  evSetVal('efNotes', r.notes); evSetVal('efRecs', r.recs);
  const ins = document.querySelectorAll('#efSections input');
  evJson(r.items, []).forEach((x, k) => { if (ins[k]) ins[k].value = x.s == null ? '' : x.s; });
  efCalc();
  evSetEditUI('evfFormView', r);
}

/* ---------- عرض استمارة محفوظة (يُستدعى من evView) ---------- */
function efView(r) {
  const items = evJson(r.items, []), ex = evJson(r.extra, {}), D = r.formType === 'f_multi' ? EV2 : EV;
  let n = 0, rows = '';
  EV_SECTIONS.forEach(sec => {
    let sum = 0;
    rows += '<tr><th colspan="3" style="text-align:right">' + esc(sec.title) + '</th></tr>';
    D[sec.key].forEach((it, k) => {
      const x = items[n++] || {}, v = parseFloat(x.s);
      if (!isNaN(v)) sum += v;
      rows += '<tr><td>' + (k + 1) + '</td><td style="text-align:right">' + esc(it.t) + '</td><td>' + esc(x.s) + ' / ' + it.max + '</td></tr>';
    });
    rows += '<tr><td colspan="2" style="text-align:right"><b>المجموع</b> (الموزونة: ' + evFmt(sum * sec.target / sec.maxSum) + ' من ' + evFmt(sec.target) + ')</td>' +
      '<td><b>' + evFmt(sum) + ' / ' + evFmt(sec.maxSum) + '</b></td></tr>';
  });
  const f = (l, v) => v ? '<div><b>' + l + ':</b> ' + esc(v) + '</div>' : '';
  document.getElementById('evModalBody').innerHTML =
    '<h2>' + esc(r.center) + ' - ' + esc(r.teacher) + '</h2>' +
    '<div class="ev-info">' + f('نوع الاستمارة', 'القرآن الكريم (النهائي) - ' + EF_TYPES[r.formType === 'f_multi' ? 'multi' : 'single']) +
    f('الفترة', r.period) + f('اليوم', r.day) + f('التاريخ', r.date) + f('نوعها', ex.kind) + f('الفئة', r.cat) + f('المؤهل', r.qual) +
    f('عنوان الدرس', r.lesson) + f('سنوات الخبرة', r.years) + f('العدد الكلي', r.total) + f('العدد الحاضر', r.present) +
    f('الفئة الثانية', ex.cat2) + f('العدد الكلي (2)', ex.total2) + f('العدد الحاضر (2)', ex.present2) + f('عدد المجموعات', ex.groups) +
    f('رقم الزيارة', r.visitNo) + f('اسم المشرفة', r.supervisor) + '</div>' +
    '<div class="tbl-wrap"><table style="min-width:420px"><thead><tr><th>م</th><th>البند</th><th>الدرجة المكتسبة</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="stats" style="margin-top:14px"><div class="stat"><b>' + esc(r.raw) + '</b><span>الدرجة الكلية من 100</span></div></div>' +
    '<div class="stats"><div class="stat"><b>' + esc(r.weighted) + '</b><span>الدرجة الموزونة - التقدير: ' + gradeTag(r.grade) + '</span></div></div>' +
    f('ملاحظات المشرفة', r.notes) + f('توصيات المشرفة', r.recs) +
    (r.signature ? '<div style="margin-top:10px"><a class="lnk" target="_blank" rel="noopener" href="' + esc(r.signature) + '">عرض التوقيع</a></div>' : '');
  document.getElementById('evModal').classList.remove('hidden');
}

/* ---------- سجل الاستمارات النهائية ---------- */
// لإضافة مادة نهائية جديدة أضيفي سطراً هنا فقط
const EF_SUBJECTS = [
  { key: 'quran', label: 'القرآن الكريم', max: 100, weighted: true, match: r => r.formType === 'f_single' || r.formType === 'f_multi', score: r => esc(r.weighted) + ' من 100' },
  { key: 'tabyan', label: 'التبيان', max: 40, weighted: false, match: r => r.formType === 'f_tabyan', score: r => esc(r.raw) + ' من 40' },
  { key: 'tajweed', label: 'التجويد', max: 100, weighted: false, match: r => String(r.formType).indexOf('f_tj_') === 0, score: r => esc(r.raw) + ' من 100' }
];
let efTab = 'quran';

function efSetTab(t) {
  efTab = t;
  document.querySelectorAll('#efTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  efRender();
}

function efRender() {
  renderDrafts();
  const head = document.getElementById('efHead'), body = document.getElementById('efBody');
  if (!head || !body) return;
  const btnView = i => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="evView(' + i + ')">عرض</button>';
  const btnDl = i => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="exRow(' + i + ', this)">تحميل Excel</button>';
  const btnEdit = i => '<button class="btn light ico-btn" title="تعديل" aria-label="تعديل" onclick="evEdit(' + i + ')">' + EV_PENCIL + '</button>';
  const bar = document.getElementById('efListBar');   // تحميل الجدول كاملاً: في «سجل المعلمات» فقط
  if (bar) bar.classList.toggle('hidden', efTab !== 'teachers');

  if (efTab === 'teachers') {
    head.innerHTML = '<tr><th>المعلمة</th>' + EF_SUBJECTS.map(x => '<th>' + x.label + '</th>').join('') + '</tr>';
    const list = evTeacherGroups(EF_SUBJECTS).filter(m => EF_SUBJECTS.some(s => m.last[s.key] !== undefined));
    if (!list.length) { body.innerHTML = '<tr><td colspan="' + (EF_SUBJECTS.length + 1) + '" class="empty">لا توجد استمارات</td></tr>'; return; }
    body.innerHTML = list.map(m => '<tr><td><b>' + esc(m.name) + '</b></td>' + EF_SUBJECTS.map(sub => {
      const i = m.last[sub.key];
      if (i === undefined) return '<td>—</td>';
      const r = evRows[i];
      return '<td>' + gradeTag(r.grade) + '<div style="margin:4px 0;font-size:13px">' + sub.score(r) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:4px">' + esc(r.date) + '</div>' + btnView(i) + '</td>';
    }).join('') + '</tr>').join('');
    return;
  }

  const sub = EF_SUBJECTS.find(x => x.key === efTab) || EF_SUBJECTS[0];
  head.innerHTML = '<tr><th>التاريخ</th><th>المركز</th><th>المعلمة</th>' + (sub.weighted ? '<th>الدرجة من 100</th><th>الدرجة الموزونة</th>' : '<th>المجموع من ' + sub.max + '</th>') + '<th>التقدير</th><th></th><th></th></tr>';
  const rows = [];
  evRows.forEach((r, i) => { if (sub.match(r)) rows.push([r, i]); });
  if (!rows.length) { body.innerHTML = '<tr><td colspan="' + (sub.weighted ? 8 : 7) + '" class="empty">لا توجد استمارات</td></tr>'; return; }
  body.innerHTML = rows.map(([r, i]) => '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.center) + '</td><td>' + esc(r.teacher) +
    (r.formType === 'f_multi' || r.formType === 'f_tj_multi' ? ' <span class="tag">تعدد المجموعات</span>' : '') + '</td>' +
    '<td>' + esc(r.raw) + '</td>' + (sub.weighted ? '<td>' + esc(r.weighted) + '</td>' : '') +
    '<td>' + gradeTag(r.grade) + '</td><td><div class="act">' + btnView(i) + btnDl(i) + '</div></td>' +
    '<td><div class="act">' + btnEdit(i) + '<button class="btn danger" onclick="evDelete(\'' + esc(r.id) + '\')">حذف</button></div></td></tr>').join('');
}
