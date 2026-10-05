// ===== استمارات التقييم الأسبوعية — استمارة تقييم أداء معلمة التجويد (من 100) =====
// البنود ودرجاتها وقوائمها مأخوذة من ملف الإكسل (مادة التجويد)
const TJ = {
  lists: {
    period: ['صباحي', 'مسائي'],
    qual: ['دبلوم عالي', 'دبلوم متوسط', 'دورة تأهيل منتهي بالتوظيف', 'اختبار مكتب'],
    day: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'],
    cat: ['أمهات', 'متعلمات', 'ناشئة', 'أمهات - متعلمات', 'أمهات - ناشئة', 'متعلمات - ناشئة']
  }
};
// نوعان: تعدد المجموعات (16 بنداً) / بدون تعدد (18 بنداً)
const TJ_V = {
  multi: { label: 'تعدد المجموعات', items: [
    ['صياغة الأهداف وشمولها', 5],
  ['التحضير الجيد كتابياً', 5],
  ['توزيع المنهج والسير وفقه', 3],
  ['الاهتمام بالتمهيد وأساليبه(مراجعة الدرس سابقاً)', 7],
  ['قراءة المعلمة للدرس من الكتاب مع التوضيح', 2],
  ['عرض الدرس بطريقة مناسبة للفئة مع التشويق وتنوع طرق التدريس', 10],
  ['صحة المادة العلمية', 10],
  ['تسلسل المادة العلمية والتمكن من إيصالها', 10],
  ['الإعداد الجيد للوسائل واستخدامها بصورة وظيفية', 5],
  ['تعيين الواجب كماً وكيفاً', 2],
  ['استخدام الفصحى و وضوح الصوت', 3],
  ['الاهتمام بالتطبيق', 20],
  ['ضبط الفصل', 5],
  ['مراعاة الفروق الفردية', 3],
  ['صحة توزيع الزمن عموماً على مراحل الدرس', 2],
  ['تقدير المسؤولية', 8]
  ] },
  single: { label: 'بدون تعدد', items: [
    ['صياغة الأهداف وشمولها', 5],
    ['التحضير الجيد كتابياً', 5],
    ['توزيع المنهج والسير وفقه', 3],
    ['مراجعة الدرس السابق', 2],
    ['الاهتمام بالتمهيد وأساليبه', 5],
    ['قراءة المعلمة للدرس من الكتاب مع التوضيح', 2],
    ['عرض الدرس بطريقة مناسبة للفئة مع التشويق وتنوع طرق التدريس', 10],
    ['صحة المادة العلمية', 10],
    ['تسلسل المادة العلمية والتمكن من إيصالها', 10],
    ['تحقيق الأهداف التربوية', 10],
    ['الإعداد الجيد للوسائل واستخدامها بصورة وظيفية', 5],
    ['تعيين الواجب كماً وكيفاً', 2],
    ['استخدام الفصحى و وضوح الصوت', 3],
    ['الاهتمام بالتطبيق', 10],
    ['ضبط الفصل', 5],
    ['مراعاة الفروق الفردية', 3],
    ['صحة توزيع الزمن عموماً على مراحل الدرس', 2],
    ['تقدير المسؤولية', 8]
  ] }
};
let tjType = 'multi', TJ_ITEMS = TJ_V.multi.items, TJ_MAX = 100;

// التقدير: نفس توزيع استمارة القرآن الكريم (على 100)
const TJ_GRADES = [[90, 'ممتاز'], [80, 'جيد جداً'], [70, 'جيد'], [60, 'مقبول'], [50, 'ضعيف']];
function tjGrade(t) {
  for (let i = 0; i < TJ_GRADES.length; i++) if (t >= TJ_GRADES[i][0]) return TJ_GRADES[i][1];
  return 'لم تجتاز';
}

let tjBuilt = false, tjPad = null, tjFin = false;   // tjFin: استمارة التجويد النهائية
const tjFmt = x => String(Math.round(x * 100) / 100);

function tjBuild() {
  document.getElementById('tjItems').innerHTML = TJ_ITEMS.map((it, i) =>
    '<div class="tb-item"><span class="ev-num">' + (i + 1) + '</span><b>' + esc(it[0]) + '</b>' +
    '<span class="ev-sc"><input type="text" inputmode="decimal" min="0" max="' + it[1] + '" step="0.5" data-t="' + i + '" placeholder="0"><small>/' + it[1] + '</small></span></div>'
  ).join('');
  const lg = TJ_GRADES.map((g, i) => [(i === 0 ? 'من ' + g[0] + ' فأكثر' : 'من ' + g[0] + ' إلى ' + (TJ_GRADES[i - 1][0] - 1)) + ': ' + g[1], g[1]]);
  lg.push(['أقل من 50: لم تجتاز', 'لم تجتاز']);
  document.getElementById('tjLegend').innerHTML = lg.map(x => '<span class="tag gr ' + gradeCls(x[1]) + '" style="margin:3px">' + x[0] + '</span>').join('');
}

function tjBind() {
  const box = document.getElementById('tjItems');
  box.addEventListener('input', tjCalc);
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
    tjCalc();
  });
}

function tjFillMax() {
  let c = 0;
  document.querySelectorAll('#tjItems input').forEach(i => { if (i.value === '') { i.value = i.max; c++; } });
  tjCalc();
  toast(c ? 'تمت تعبئة ' + c + ' بند بالدرجة الكاملة، عدّلي ما يلزم' : 'كل البنود معبأة');
}

function tjCalc() {
  let sum = 0, filled = 0;
  document.querySelectorAll('#tjItems input').forEach((el, i) => {
    const v = parseFloat(el.value);
    if (!isNaN(v)) { sum += Math.min(Math.max(v, 0), TJ_ITEMS[i][1]); filled++; }
  });
  const g = tjGrade(sum);
  document.getElementById('tjTotal').textContent = tjFmt(sum);
  document.getElementById('tjTotalBig').textContent = tjFmt(sum);
  const gShow = filled ? g : '—';
  setGrade(document.getElementById('tjGrade'), gShow);
  document.getElementById('tjC').textContent = filled;
  return { sum, grade: g, filled };
}

function tjBack() { show(tjFin ? 'evalsFinalView' : 'evalsView'); evLoadList(); }

function tjOpenForm(type, fin) {
  type = type === 'single' ? 'single' : 'multi';
  tjFin = !!fin;
  try { localStorage.setItem('mush_fin', tjFin ? '1' : ''); } catch (e) {}
  show('tjFormView');
  if (!tjBuilt || type !== tjType) {
    tjType = type; TJ_ITEMS = TJ_V[type].items;
    TJ_MAX = TJ_ITEMS.reduce((a, i) => a + i[1], 0);
    tjBuild();
    document.getElementById('tjCnt').textContent = TJ_ITEMS.length;
  }
  document.getElementById('tjTitle').textContent = 'استمارة تقييم مادة التجويد ' + (tjFin ? '(النهائي)' : 'الأسبوعي') + ' — ' + TJ_V[type].label;
  if (!tjBuilt) {
    tjBind();
    document.getElementById('tjPeriod').innerHTML = evOpts(TJ.lists.period, 'اختاري الفترة');
    document.getElementById('tjQual').innerHTML = evOpts(TJ.lists.qual, 'اختاري المؤهل');
    document.getElementById('tjDay').innerHTML = evOpts(TJ.lists.day, 'اختاري اليوم');
    document.getElementById('tjCat').innerHTML = evOpts(TJ.lists.cat, 'اختاري الفئة');
    document.getElementById('tjCat2').innerHTML = evOpts(TJ.lists.cat, 'اختاري الفئة');
    tjPad = makeSigWidget('tjSigW', { saved: true });
    tjBuilt = true;
  }
  document.getElementById('tjCenter').innerHTML = evOpts(LISTS.centers, 'اختاري المركز');
  evSetVal('tjSupervisor', getUser());   // اسم المشرفة تلقائياً من حساب الدخول
  evFillTeacherList();
  if (!document.getElementById('tjDate').value) { document.getElementById('tjDate').value = todayStr(); tjDateChange(); }
  tjCalc();
  setTimeout(() => tjPad.resize(), 60);
}

function tjDateChange() {
  const v = document.getElementById('tjDate').value;
  if (!v) return;
  const p = v.split('-');
  const name = DAYS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
  if (TJ.lists.day.indexOf(name) > -1) document.getElementById('tjDay').value = name;
}

async function tjSave() {
  const val = id => document.getElementById(id).value.trim();
  const center = val('tjCenter'), period = val('tjPeriod'), teacher = val('tjTeacher'), date = val('tjDate');
  if (!center) return toast('اختاري اسم المركز', false);
  if (!period) return toast('اختاري الفترة', false);
  if (!teacher) return toast('اكتبي اسم المعلمة', false);
  if (!date) return toast('اختاري التاريخ', false);

  const inputs = [...document.querySelectorAll('#tjItems input')];
  const empty = inputs.filter(i => i.value === '');
  if (empty.length) {
    empty[0].scrollIntoView({ block: 'center' }); empty[0].focus();
    return toast('بقي ' + empty.length + ' بند بدون درجة (اكتبي 0 إن لم ينل شيئاً)', false);
  }
  const items = inputs.map(i => ({ score: i.value }));

  const btn = document.getElementById('tjSaveBtn');
  const calc = tjCalc();
  const extra = {
    fin: tjFin ? 'f_tj_' + tjType : undefined,   // علامة تضمن بقاءها ضمن «النهائية» حتى مع نسخة Apps Script القديمة
    kind: val('tjKind'), groups: val('tjGroups'),
    cat2: val('tjCat2'), total2: val('tjTotal2'), present2: val('tjPresent2')
  };
  setBtnBusy(btn, true);
  try {
    const editing = EDIT;
    const payload = {
      id: editing ? editing.id : undefined,
      center, period, teacher, date, items, formType: (tjFin ? 'f_tj_' : 'tj_') + tjType,
      raw: tjFmt(calc.sum), weighted: '', grade: calc.grade,
      qual: val('tjQual'), cat: val('tjCat'), day: val('tjDay'), lesson: val('tjLesson'),
      years: val('tjYears'), total: val('tjTotalN'), present: val('tjPresent'), visitNo: '',
      supervisor: val('tjSupervisor'), notes: '', recs: val('tjRecs'), send: document.getElementById('tjSend').checked ? 'نعم' : '', phone: document.getElementById('tjPhone').value.trim(), tid: document.getElementById('tjTid').value,
      extra: JSON.stringify(extra),
      signature: tjPad.get()
    };
    const res = await api(editing ? 'updateEval' : 'addEval', payload);
    toast(editing ? 'تم تحديث الاستمارة' : 'تم حفظ الاستمارة');
    tjPad.commit();
    evAfterSave(payload, res, editing);
    tjReset();
    show(tjFin ? 'evalsFinalView' : 'evalsView');
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

function tjReset() {
  ['tjCenter', 'tjPeriod', 'tjTeacher', 'tjQual', 'tjDay', 'tjKind', 'tjCat', 'tjTotalN', 'tjPresent', 'tjGroups',
    'tjCat2', 'tjTotal2', 'tjPresent2', 'tjYears', 'tjLesson', 'tjSupervisor', 'tjRecs', 'tjSend', 'tjPhone', 'tjTid']
    .forEach(id => evSetVal(id, ''));
  document.querySelectorAll('#tjItems input').forEach(el => el.value = '');
  document.getElementById('tjDate').value = todayStr(); tjDateChange();
  if (tjPad) tjPad.reset();
  tjCalc();
}

// عرض استمارة محفوظة (يُستدعى من evView)
function tjView(r) {
  const fin = String(r.formType).indexOf('f_') === 0, vt = /tj_single$/.test(r.formType) ? 'single' : 'multi', TJV = TJ_V[vt].items;
  let items = [], ex = {};
  try { items = JSON.parse(r.items || '[]'); } catch (e) {}
  try { ex = JSON.parse(r.extra || '{}'); } catch (e) {}
  const rows = TJV.map((it, k) => {
    const x = items[k] || {};
    return '<tr><td>' + (k + 1) + '</td><td style="text-align:right">' + esc(it[0]) + '</td><td>' + esc(x.s) + ' / ' + it[1] + '</td></tr>';
  }).join('');
  const f = (l, v) => v ? '<div><b>' + l + ':</b> ' + esc(v) + '</div>' : '';
  document.getElementById('evModalBody').innerHTML =
    '<h2>' + esc(r.center) + ' - ' + esc(r.teacher) + '</h2>' +
    '<div class="ev-info">' + f('نوع الاستمارة', (fin ? 'التجويد (النهائي) - ' : 'التجويد - ') + TJ_V[vt].label) + f('الفترة', r.period) + f('اليوم', r.day) + f('التاريخ', r.date) +
    f('نوعها', ex.kind) + f('الفئة', r.cat) + f('العدد الكلي', r.total) + f('العدد الحاضر', r.present) +
    f('الفئة الثانية', ex.cat2) + f('العدد الكلي (2)', ex.total2) + f('العدد الحاضر (2)', ex.present2) +
    f('عدد المجموعات', ex.groups) + f('المؤهل في القرآن', r.qual) + f('سنوات الخبرة', r.years) +
    f('عنوان الدرس', r.lesson) + f('اسم المشرفة', r.supervisor) + '</div>' +
    '<div class="tbl-wrap"><table style="min-width:420px"><thead><tr><th>م</th><th>البند</th><th>الدرجة المكتسبة</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="stats" style="margin-top:14px"><div class="stat"><b>' + esc(r.raw) + ' / 100</b><span>المجموع الكلي - التقدير: ' + gradeTag(r.grade) + '</span></div></div>' +
    f('التوصيات', r.recs) +
    (r.signature ? '<div style="margin-top:10px"><a class="lnk" target="_blank" rel="noopener" href="' + esc(r.signature) + '">عرض التوقيع</a></div>' : '');
  document.getElementById('evModal').classList.remove('hidden');
}

// تعديل استمارة محفوظة (يُستدعى من evEdit)
function tjEdit(r) {
  tjOpenForm(/tj_single$/.test(r.formType) ? 'single' : 'multi', String(r.formType).indexOf('f_') === 0); tjReset();
  const ex = evJson(r.extra, {});
  evSetSel('tjCenter', r.center); evSetSel('tjPeriod', r.period); evSetVal('tjTeacher', r.teacher); evSetVal('tjDate', r.date);
  evSetSel('tjDay', r.day); evSetVal('tjKind', ex.kind); evSetSel('tjQual', r.qual); evSetVal('tjYears', r.years);
  evSetSel('tjCat', r.cat); evSetVal('tjGroups', ex.groups); evSetVal('tjTotalN', r.total); evSetVal('tjPresent', r.present);
  evSetSel('tjCat2', ex.cat2); evSetVal('tjSupervisor', r.supervisor); evSetVal('tjTotal2', ex.total2); evSetVal('tjPresent2', ex.present2);
  evSetVal('tjLesson', r.lesson); evSetVal('tjRecs', r.recs); evSetVal('tjTid', r.tid); evSetVal('tjSend', r.send);
  const ins = document.querySelectorAll('#tjItems input');
  evJson(r.items, []).forEach((x, k) => { if (ins[k]) ins[k].value = x.s == null ? '' : x.s; });
  tjCalc();
  evSetEditUI('tjFormView', r);
}
