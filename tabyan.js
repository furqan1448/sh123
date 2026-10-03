// ===== استمارات التقييم الأسبوعية — استمارة تقييم أداء معلمة التبيان (من 40) =====
// البنود ودرجاتها وقوائمها مأخوذة من ملف الإكسل (مادة التبيان)
const TB = {
  items: [
    ['التزام المعلمة بتنفيذ الخطة التربوية', 2],
    ['التزام المعلمة بتنفيذ الخطة الزمنية للمنهج', 2],
    ['تفقد الكتب', 1],
    ['القراءة النموذجية للأمثلة', 5],
    ['المراجعة', 5],
    ['التحضير للمعلومة الجديدة', 5],
    ['التمكين', 5],
    ['استخدام الوسائل التعليمية المتاحة', 4],
    ['ضبط المعلمة للدارسات وتحفيزهن', 1],
    ['تسلسل عرض الدرس', 2],
    ['الغلق وتنوع صور التطبيق', 2],
    ['تفعيل الكتاب بما يتناسب مع مراحل الدرس', 1],
    ['توزيع الوقت على عناصر الدرس توزيعاً مناسباً', 1],
    ['مستوى أداء الدارسات', 2],
    ['تقبل المعلمة للتوجيهات وتنفيذها', 2]
  ],
  lists: {
    period: ['صباحي', 'مسائي'],
    qual: ['دبلوم عالي', 'دبلوم متوسط', 'دورة تأهيل منتهي بالتوظيف', 'اختبار مكتب'],
    day: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'],
    cat: ['أمهات', 'متعلمات', 'ناشئة', 'أمهات - متعلمات', 'أمهات - ناشئة', 'متعلمات - ناشئة']
  }
};
const TB_MAX = TB.items.reduce((a, i) => a + i[1], 0); // 40

// جدول التقدير (من الأعلى للأدنى)
const TB_GRADES = [
  [38, 40, 'ممتاز مرتفع'], [36, 37, 'ممتاز'], [34, 35, 'جيد جداً مرتفع'], [30, 33, 'جيد مرتفع'],
  [28, 29, 'جيد'], [24, 27, 'مقبول مرتفع'], [20, 23, 'مقبول'], [0, 19, 'ضعيف']
];
// نفس معادلة الإكسل: الدرجات ذات الكسر (مثل 37.5) تُحسب في الفئة الأدنى
function tbGrade(t) {
  for (let i = 0; i < TB_GRADES.length; i++) if (t >= TB_GRADES[i][0]) return TB_GRADES[i][2];
  return 'ضعيف';
}

let tbBuilt = false, tbPad = null;
const tbFmt = x => String(Math.round(x * 100) / 100);

function tbBuild() {
  document.getElementById('tbItems').innerHTML = TB.items.map((it, i) =>
    '<div class="tb-item"><span class="ev-num">' + (i + 1) + '</span><b>' + esc(it[0]) + '</b>' +
    '<span class="ev-sc"><input type="number" inputmode="decimal" min="0" max="' + it[1] + '" step="0.5" data-t="' + i + '" placeholder="0"><small>/' + it[1] + '</small></span></div>'
  ).join('');
  document.getElementById('tbLegend').innerHTML = TB_GRADES.map(g =>
    gradeTag((g[0] === g[1] ? g[0] : g[1] + ' - ' + g[0]) + ': ' + g[2]).replace(/class="tag[^"]*"/, 'class="tag gr ' + gradeCls(g[2]) + '" style="margin:3px"')).join('');
}

function tbBind() {
  const box = document.getElementById('tbItems');
  box.addEventListener('input', tbCalc);
  box.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.t === undefined) return;
    const max = +el.max;
    if (el.value !== '') {
      let v = parseFloat(el.value);
      if (isNaN(v) || v < 0) v = 0;
      if (v > max) { v = max; toast('أعلى درجة لهذا البند ' + max, false); }
      el.value = v;
    }
    tbCalc();
  });
}

function tbFillMax() {
  let c = 0;
  document.querySelectorAll('#tbItems input').forEach(i => { if (i.value === '') { i.value = i.max; c++; } });
  tbCalc();
  toast(c ? 'تمت تعبئة ' + c + ' بند بالدرجة الكاملة، عدّلي ما يلزم' : 'كل البنود معبأة');
}

function tbCalc() {
  let sum = 0, filled = 0;
  document.querySelectorAll('#tbItems input').forEach((el, i) => {
    const v = parseFloat(el.value);
    if (!isNaN(v)) { sum += Math.min(Math.max(v, 0), TB.items[i][1]); filled++; }
  });
  const g = tbGrade(sum);
  document.getElementById('tbTotal').textContent = tbFmt(sum);
  document.getElementById('tbTotalBig').textContent = tbFmt(sum);
  const gShow = filled ? g : '—';
  setGrade(document.getElementById('tbGrade'), gShow);
  document.getElementById('tbC').textContent = filled;
  return { sum, grade: g, filled };
}

function tbOpenForm() {
  show('tbFormView');
  if (!tbBuilt) {
    tbBuild(); tbBind();
    document.getElementById('tbPeriod').innerHTML = evOpts(TB.lists.period, 'اختاري الفترة');
    document.getElementById('tbQual').innerHTML = evOpts(TB.lists.qual, 'اختاري المؤهل');
    document.getElementById('tbDay').innerHTML = evOpts(TB.lists.day, 'اختاري اليوم');
    document.getElementById('tbCat').innerHTML = evOpts(TB.lists.cat, 'اختاري الفئة');
    document.getElementById('tbCat2').innerHTML = evOpts(TB.lists.cat, 'اختاري الفئة');
    tbPad = makeSigPad(document.getElementById('tbSig'));
    document.getElementById('tbSigBox').addEventListener('toggle', e => { if (e.target.open) setTimeout(() => tbPad.resize(), 30); });
    tbBuilt = true;
  }
  document.getElementById('tbCenter').innerHTML = evOpts(LISTS.centers, 'اختاري المركز');
  evSetVal('tbSupervisor', getUser());   // اسم المشرفة تلقائياً من حساب الدخول
  evFillTeacherList();
  if (!document.getElementById('tbDate').value) { document.getElementById('tbDate').value = todayStr(); tbDateChange(); }
  tbCalc();
  setTimeout(() => tbPad.resize(), 60);
}

function tbDateChange() {
  const v = document.getElementById('tbDate').value;
  if (!v) return;
  const p = v.split('-');
  const name = DAYS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
  if (TB.lists.day.indexOf(name) > -1) document.getElementById('tbDay').value = name;
}

async function tbSave() {
  const val = id => document.getElementById(id).value.trim();
  const center = val('tbCenter'), period = val('tbPeriod'), teacher = val('tbTeacher'), date = val('tbDate');
  if (!center) return toast('اختاري اسم المركز', false);
  if (!period) return toast('اختاري الفترة', false);
  if (!teacher) return toast('اكتبي اسم المعلمة', false);
  if (!date) return toast('اختاري التاريخ', false);

  const inputs = [...document.querySelectorAll('#tbItems input')];
  const empty = inputs.filter(i => i.value === '');
  if (empty.length) {
    empty[0].scrollIntoView({ block: 'center' }); empty[0].focus();
    return toast('بقي ' + empty.length + ' بند بدون درجة (اكتبي 0 إن لم ينل شيئاً)', false);
  }
  const items = inputs.map(i => ({ score: i.value }));

  const btn = document.getElementById('tbSaveBtn');
  const calc = tbCalc();
  const extra = {
    kind: val('tbKind'), groups: val('tbGroups'),
    cat2: val('tbCat2'), total2: val('tbTotal2'), present2: val('tbPresent2')
  };
  setBtnBusy(btn, true);
  try {
    const editing = EDIT;
    const payload = {
      id: editing ? editing.id : undefined,
      center, period, teacher, date, items, formType: 'tabyan',
      raw: tbFmt(calc.sum), weighted: '', grade: calc.grade,
      qual: val('tbQual'), cat: val('tbCat'), day: val('tbDay'), lesson: val('tbLesson'),
      years: val('tbYears'), total: val('tbTotalN'), present: val('tbPresent'), visitNo: '',
      supervisor: val('tbSupervisor'), notes: '', recs: val('tbRecs'),
      extra: JSON.stringify(extra),
      signature: tbPad.has() ? tbPad.data() : ''
    };
    const res = await api(editing ? 'updateEval' : 'addEval', payload);
    toast(editing ? 'تم تحديث الاستمارة' : 'تم حفظ الاستمارة');
    evAfterSave(payload, res, editing);
    tbReset();
    show('evalsView');
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

function tbReset() {
  ['tbCenter', 'tbPeriod', 'tbTeacher', 'tbQual', 'tbDay', 'tbKind', 'tbCat', 'tbTotalN', 'tbPresent', 'tbGroups',
    'tbCat2', 'tbTotal2', 'tbPresent2', 'tbYears', 'tbLesson', 'tbSupervisor', 'tbRecs']
    .forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('#tbItems input').forEach(el => el.value = '');
  document.getElementById('tbDate').value = todayStr(); tbDateChange();
  if (tbPad) tbPad.clear();
  tbCalc();
}

// عرض استمارة محفوظة (يُستدعى من evView)
function tbView(r) {
  let items = [], ex = {};
  try { items = JSON.parse(r.items || '[]'); } catch (e) {}
  try { ex = JSON.parse(r.extra || '{}'); } catch (e) {}
  const rows = TB.items.map((it, k) => {
    const x = items[k] || {};
    return '<tr><td>' + (k + 1) + '</td><td style="text-align:right">' + esc(it[0]) + '</td><td>' + esc(x.s) + ' / ' + it[1] + '</td></tr>';
  }).join('');
  const f = (l, v) => v ? '<div><b>' + l + ':</b> ' + esc(v) + '</div>' : '';
  document.getElementById('evModalBody').innerHTML =
    '<h2>' + esc(r.center) + ' - ' + esc(r.teacher) + '</h2>' +
    '<div class="ev-info">' + f('نوع الاستمارة', 'مادة التبيان') + f('الفترة', r.period) + f('اليوم', r.day) + f('التاريخ', r.date) +
    f('نوعها', ex.kind) + f('الفئة', r.cat) + f('العدد الكلي', r.total) + f('العدد الحاضر', r.present) +
    f('الفئة الثانية', ex.cat2) + f('العدد الكلي (2)', ex.total2) + f('العدد الحاضر (2)', ex.present2) +
    f('عدد المجموعات', ex.groups) + f('المؤهل في القرآن', r.qual) + f('سنوات الخبرة', r.years) +
    f('عنوان الدرس', r.lesson) + f('اسم المشرفة', r.supervisor) + '</div>' +
    '<div class="tbl-wrap"><table style="min-width:420px"><thead><tr><th>م</th><th>البند</th><th>الدرجة المكتسبة</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="stats" style="margin-top:14px"><div class="stat"><b>' + esc(r.raw) + ' / ' + TB_MAX + '</b><span>المجموع الكلي - التقدير: ' + gradeTag(r.grade) + '</span></div></div>' +
    f('التوصيات', r.recs) +
    (r.signature ? '<div style="margin-top:10px"><a class="lnk" target="_blank" rel="noopener" href="' + esc(r.signature) + '">عرض التوقيع</a></div>' : '');
  document.getElementById('evModal').classList.remove('hidden');
}

// تعديل استمارة محفوظة (يُستدعى من evEdit)
function tbEdit(r) {
  tbOpenForm(); tbReset();
  const ex = evJson(r.extra, {});
  evSetSel('tbCenter', r.center); evSetSel('tbPeriod', r.period); evSetVal('tbTeacher', r.teacher); evSetVal('tbDate', r.date);
  evSetSel('tbDay', r.day); evSetVal('tbKind', ex.kind); evSetSel('tbQual', r.qual); evSetVal('tbYears', r.years);
  evSetSel('tbCat', r.cat); evSetVal('tbGroups', ex.groups); evSetVal('tbTotalN', r.total); evSetVal('tbPresent', r.present);
  evSetSel('tbCat2', ex.cat2); evSetVal('tbSupervisor', r.supervisor); evSetVal('tbTotal2', ex.total2); evSetVal('tbPresent2', ex.present2);
  evSetVal('tbLesson', r.lesson); evSetVal('tbRecs', r.recs);
  const ins = document.querySelectorAll('#tbItems input');
  evJson(r.items, []).forEach((x, k) => { if (ins[k]) ins[k].value = x.s == null ? '' : x.s; });
  tbCalc();
  evSetEditUI('tbFormView', r);
}
