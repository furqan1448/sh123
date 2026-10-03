// ===== استمارات التقييم الأسبوعية — استمارة تقييم القرآن الكريم (بدون تعدد المجموعات) =====
// بنود الاستمارة وقوائمها مأخوذة من ملف الإكسل
const EV = {"basic": [{"t": "القراءة المثالية للمعلمة", "max": 20.0, "crit": ["اللحن الجلي", "الأحكام الأساسية ( إسقاط الأحكام – عدم الإتقان)", "التكلف في القراءة", "الهيئة الغير صحيحة للحرف \"ضم الشفتين لتفخيم الحروف المفخمة\"", "عدم إتمام الحركات (الضم – الفتحة – الكسرة)", "عدم إتمام الضم", "عدم إتمام الفتحة", "عدم إتمام الكسرة", "عدم العناية بالمشدد", "عدم تحقيق الهمزات", "عدم ضبط الصفات", "عدم ضبط المخارج", "عدم ضبط المدود", "عدم ضبط الوقف والابتداء", "عدم قلقلة السواكن"], "note": ["متابعة عرض التلاوة مع المشرفة", "التدريب على الآيات مع شيخ متقن"]}, {"t": "التصويب أثناء تسميع الواجب", "max": 4.0, "crit": ["عدم استخدام الأسلوب المناسب", "عدم التدريب على تصحيح الخطأ", "عدم تجزئة الآيات أو الوفوغ الصحيح", "عدم دقة التصويب وتمييز الخطأ وتحديده ووصفه وذلك في جميع الأحكام", "عدم كتابة الكلمات الخاصة بالدرس السابق لجميع الفئات"], "note": ["التأكيد على الدرس السابق", "دقة التصويب وتمييز الخطأ وتحديده ووصفه وذلك في جميع الأحكام", "التدريب على تصحيح الخطأ", "قراءة الآيات جماعي أو تشغيل صوت الشيخ (إثرائي)"]}, {"t": "القراءة الجماعية مع التصويب ( مجموعة واحدة أو مجموعتين", "max": 5.0, "crit": ["عدم استخدام السبورة في التصويب", "عدم إعطاء آلية أو أساليب في التصويب وعدم استخدام عبارات تجويدية صحيحة", "عدم القدرة على تمييز الخطأ أو تحديده أو وصفه"], "note": ["مدارسة المعلمة لنشرة تصويب الأخطاء", "أخرى:"]}, {"t": "قراءة المجيدات فأقل مع التصويب (مجموعة واحدة أو مجموعتين)", "max": 4.0, "crit": ["عدم استخدام الأسلوب المناسب في التدريب", "عدم التدريب على الصواب مشافهة", "عدم تمييز الخطأ أو تحديده أو وصفه للكملة التي يتم التصويب فيها"], "note": ["مدارسة المعلمة لنشرة تصويب الأخطاء"]}, {"t": "وضوح الصوت", "max": 1.0, "crit": ["السرعة أو البطء المخل في الأداء", "عدم وصول الصوت إلى جميع الدراسات"], "note": ["ضرورة وصول الصوت إلى جميع الدراسات", "عدم السرعة أو البطء المخل في الأداء"]}, {"t": "مراعاة الفروق الفردية (الاهتمام بالدارسات (المستوى الأقل أداء – المستوى الممتاز)", "max": 4.0, "crit": ["عدم القراءة المثالية لجميع المجموعات", "عدم تنظيم وترتيب المجموعات لتسهيل عرض الدرس"], "note": ["تنظيم وترتيب المجموعات لتسهيل عرض الدرس", "القراءة المثالية لجميع المجموعات"]}, {"t": "المحافظة على الدوام", "max": 1.0, "crit": ["الاعتذار عن الحضور من المرة الثانية", "التأخير في حضور الحصة بدون عذر ملزم للتأخير", "عدم الانضباط في الدوام بالحضور للمركز وعدم التأخير"], "note": ["الانضباط في الدوام"]}], "second": [{"t": "تفقد المصاحف", "max": 3.0, "crit": ["أن تكون حجم المصاحف غير مناسبة لجميع الفئات", "عدم الحث على تعظيم المصحف", "عدم تفقد فئة الناشئة والأمهات بفتح المصحف لهن وتحديد الآية"], "note": ["أهمية تعظيم كتاب الله تعالى في نفوس الدارسات", "تفقد المصاحف بطريقة مناسبة للفئة"]}, {"t": "استخدام الفصحى في الحديث", "max": 3.0, "crit": ["عدم استخدام الفصحى بما يناسب الفئة قدر الإمكان"], "note": ["استخدام الفصحى بما يناسب الفئة قدر الإمكان"]}], "sub": [{"t": "تقدير المسؤولية", "max": 5.0, "crit": ["عدم الاستجابة للملاحظات والاهتمام بها", "عدم تنفيذ ما يسند إليها من أعمال عموما \"حصص مشاهدة-كشوفات-الاهتمام بالتحضير بشكل عام\""], "note": ["التوجيه إلى الاستجابة للتوصيات وتنفيذ ما يسند إليها"]}, {"t": "المظهر العام والقدوة الحسنة \"حسن الخلق-سلامة العقيدة\"", "max": 5.0, "crit": ["المخالفات الشرعية", "مخالفة المظهر والقدوة \"الملابس الضيقة-فتحة التنورة-فتحة الصدر-إطالة الأظافر-لبس ما يشير إلى أنه من التمائم\"", "عدم التحلي بمكارم الأخلاق أو عدم العدل أو وجود بعض البدع"], "note": ["الالتزام باللباس الشرعي"]}, {"t": "صحة المادة العلمية \"التمهيد-تثبيت العقيدة .....الخ\"", "max": 5.0, "crit": ["إعطاء معلومة خطأ", "عدم التحقق من الأحاديث الواردة عند التحضير"], "note": ["تم تزويد المعلمة ببعض المراجع الموثوق فيها"]}, {"t": "التمكن من إيصال المادة العلمية \"التحضير الذهني\"", "max": 5.0, "crit": ["عدم التسلسل في المعلومات", "عدم فهم المادة العامية أو عدم حفظها قدر الإمكان ولا يشترط نصيا", "عدم مناسبة المعلومة لفئة الدارسات"], "note": ["التوجيه إلى أهمية التسلسل في المعلومات ومناسبتها للفئة"]}, {"t": "تحقيق الأهداف التربوية \"تثبيت العقيدة والربط بالواقع\"", "max": 5.0, "crit": ["عدم اختيار موضوع مناسب للفئة والدرس", "عدم إعطاء عبارات مركزة وجيدة أو الإسهاب", "عدم الرجوع للمراجع الصحيحة"], "note": ["حلقة تنشيط", "مدارسة المعلمة نشرة تثبيت العقيدة"]}, {"t": "الاهتمام بالنمو المعرفي", "max": 4.0, "crit": ["عدم حضور الدورات", "عدم مشاركة المعلمة فيما تحتاجه لتطويرها من حضور \"حصص مشاهدة-دورة عرض..\""], "note": ["الاهتمام بمدارسة ما يطلب منها", "حضور (الدورات-حصص مشاهدة-حلقات تنشيطية)"]}, {"t": "التعامل مع الجميع بحكمة واتزان", "max": 4.0, "crit": ["عدم احترام الدارسات وعدم التعامل الحسن مع الجميع", "عدم استخدام أسلوب الرفق واللين", "عدم استخدام عبارات الشكر والثناء", "عدم التعامل مع المواقف الطارئة في الفصل بحكمة"], "note": ["احترام الدارسات والتعامل الحسن مع الجميع", "استخدام عبارات الشكر والثناء", "التعامل مع المواقف الطارئة في الفصل بحكمة"]}, {"t": "التنويع في طرق التدريس", "max": 4.0, "crit": ["عدم استخدام طريقة مناسبة للفئة", "عدم استخدام طريقتين من طرق التدريس على الأقل مثال: \"إلقائي واستجوابي\""], "note": ["استخدام طرق مناسبة لكل مرحلة من مراحل التدريس"]}, {"t": "إدارة المجموعات", "max": 4.0, "crit": ["عدم تحفيز الدارسات عموما", "عدم تعزيز الأقل أداء خاصة", "عدم تعزيز الدارسة الممتازة", "عدم وضع خطة علاجية للدارسة الأقل أداء"], "note": ["أهمية تحفيز الدارسات عموما", "أهمية تعزيز الأقل أداء خاصة", "أهمية وضع خطة علاجية للدارسة الأقل أداء", "تعزيز الدارسة الممتازة"]}, {"t": "التحضير الجيد كتابيا \"صياغة الأهداف- -توزيع المنهج\"", "max": 3.0, "crit": ["عدم احضار الدفتر يوميا", "عدم الاهتمام بالتحضير عموما \"التنسيق ووضوح الخط\"", "عدم التنظيم العام حسب تسلسل مراحل الدرس", "عدم السير وفق المنهج", "عدم صحة صياغة الهدف", "عدم كتابة المعلومات العامة"], "note": ["أهمية إحضار الدفتر يوميا", "أهمية التحضير عموما \"التنسيق، وضوح الخط\"", "أهمية التنظيم العام حسب تسلسل مراحل الدرس", "أهمية صياغة الهدف", "أهمية كتبة المعلومات العامة", "أهمية موافقة تحضير الدرس مع توزيع المنهج"]}, {"t": "الاستخدام الأمثل للوسائل التعليمية \"السبورة\"", "max": 3.0, "crit": ["عدم تفعيل أي وسيلة مناسبة بما يخدم الدرس وأهم وسيلة السبورة", "عدم تنظيم السبورة وعدم كتابة المعلومات الخاصة بالدرس"], "note": ["أهمية تفعيل وسيلة مناسبة بما يخدم الدرس", "أهمية تنظيم السبورة وكتابة المعلومات الخاصة"]}, {"t": "الغلق والتطبيق \"التأكد من استيعاب الدارسات\"", "max": 3.0, "crit": ["عدم سؤال الدارسات عن إحدى فقرات الدرس( أهم نقاط الدرس)", "السؤال في العقيدة وفي الكلمات التي تحتاج عناية"], "note": ["أهمية إدارة التطبيق بنجاح وفاعلية بطريقة صحيحة", "أهمية غلق الدرس بتعداد أبرز النقاط"]}, {"t": "ضبط الصف", "max": 2.0, "crit": ["عدم ضبط الصف عند السؤال وعند الإجابة", "عدم منع المحادثات الجانبية", "عدم منع الإجابات الجماعية"], "note": ["أهمية تزويد المعلمة بنشرة ضبط الصف"]}, {"t": "التشويق في أجزاء الدرس \"استثارة الدافعية للتعلم", "max": 3.0, "crit": ["لا يوجد ابتكار أو ابداع أو التجديد في مراحل الدرس", "حتى لو مرحلة واحدة \"بالضوابط الشرعية\""], "note": ["حضور حصة مشاهدة", "التوجيه إلى: الابتكار والإبداع والتجديد"]}], "lists": {"period": ["صباحي", "مسائي"], "qual": ["دبلوم عالي", "دبلوم متوسط", "دورة تأهيل منتهي بالتوظيف", "اختبار مكتب"], "cat": ["أمهات", "متعلمات", "ناشئة"], "day": ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء"]}};

const EV_SECTIONS = [
  { key: 'basic',  title: 'المهارات الأساسية 70%',  target: 69.966 },
  { key: 'second', title: 'المهارات الثانوية 10%',  target: 9.96 },
  { key: 'sub',    title: 'المهارات الفرعية 20%',   target: 20.00 }
];
EV_SECTIONS.forEach(s => s.maxSum = EV[s.key].reduce((a, i) => a + i.max, 0));

// استمارة «تعدد المجموعات»: نفس البنود والدرجات، وعنوانا بندين فقط مختلفان (بند 6 أساسية وبند 9 فرعية)
const EV2 = JSON.parse(JSON.stringify(EV));
(function () {
  const a = EV2.basic[5], b = EV2.sub[8], tmp = a.t;
  a.t = b.t; b.t = tmp;
})();
const EV_TYPES = { single: 'بدون تعدد', multi: 'تعدد المجموعات' };
let evType = 'single', evTypeBuilt = '';
function evD() { return evType === 'multi' ? EV2 : EV; }

const EV_EXEC = ['نفذ', 'لم ينفذ', 'نوعاً ما'];
let evBuilt = false, evPad = null, evRows = [];

function evFmt(x) { return String(Math.round(x * 1000) / 1000); }
function evGrade(w) {
  if (w >= 90) return 'ممتاز';
  if (w >= 80) return 'جيد جداً';
  if (w >= 70) return 'جيد';
  if (w >= 60) return 'مقبول';
  if (w >= 50) return 'ضعيف';
  return 'لم تجتاز';
}
function evOpts(arr, ph) {
  return '<option value="">' + esc(ph) + '</option>' + arr.map(x => '<option>' + esc(x) + '</option>').join('');
}

/* ---------- لوحة التوقيع ---------- */
function makeSigPad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false, has = false;
  function resize() {
    const r = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    if (!r.width) return;
    canvas.width = r.width * ratio; canvas.height = r.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1b1b1b';
    has = false;
  }
  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', e => { drawing = true; canvas.setPointerCapture(e.pointerId); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); has = true; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, () => drawing = false));
  return {
    resize,
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); has = false; },
    has: () => has,
    data: () => canvas.toDataURL('image/png')
  };
}

/* ---------- بناء الاستمارة ---------- */
function evBuild() {
  let n = 0, html = '';
  EV_SECTIONS.forEach((sec, si) => {
    html += '<details class="card ev-sec"' + (si === 0 || window.innerWidth >= 900 ? ' open' : '') + '><summary><span>' + esc(sec.title) +
      '</span><span class="ev-prog"><b id="evC_' + sec.key + '">0</b>/' + evD()[sec.key].length + '</span></summary>' +
      '<div class="ev-head"><span>م</span><span>البند</span><span>التنفيذ</span><span>المعايير</span><span>الدرجة</span><span>الملاحظات والتوجيه</span></div>';
    evD()[sec.key].forEach((it, i) => {
      const id = n++;
      const hasMore = true;
      html += '<div class="ev-item"><div class="ev-row"><span class="ev-num c1">' + (i + 1) + '</span><b class="c2">' + esc(it.t) + '</b>' +
        '<span class="ev-sc c5"><input type="number" inputmode="decimal" min="0" max="' + it.max + '" step="0.5" data-i="' + id + '" data-f="s" placeholder="0"><small>/' + it.max + '</small></span></div>' +
        '<button type="button" class="ev-tg" onclick="evMore(this)">تفاصيل التنفيذ والملاحظات ▾</button>' +
        '<div class="ev-more hidden"><div class="ev-grid">' +
        '<div class="ev-wide c3"><label>التنفيذ</label><select data-i="' + id + '" data-f="e">' + evOpts(EV_EXEC, 'اختاري') + '</select></div>' +
        (it.crit.length ? '<div class="ev-wide c4"><label>المعايير</label><select data-i="' + id + '" data-f="c">' + evOpts(it.crit, 'بدون') + '</select></div>' : '') +
        (it.note.length ? '<div class="ev-wide c6"><label>الملاحظات والتوجيه</label><select data-i="' + id + '" data-f="n">' + evOpts(it.note, 'بدون') + '</select></div>' : '') +
        '</div></div></div>';
    });
    html += '<div class="ev-sub">المجموع: <b id="evS_' + sec.key + '">0</b> من ' + evFmt(sec.maxSum) +
      ' &nbsp;|&nbsp; الموزونة: <b id="evW_' + sec.key + '">0</b> من ' + evFmt(sec.target) + '</div></details>';
  });
  document.getElementById('evSections').innerHTML = html;
}

function evBind() {
  document.getElementById('evSections').addEventListener('input', evCalc);
  document.getElementById('evSections').addEventListener('change', e => {
    if (e.target.dataset.f === 's') {
      const max = +e.target.max;
      if (e.target.value !== '') {
        let v = parseFloat(e.target.value);
        if (isNaN(v) || v < 0) v = 0;
        if (v > max) { v = max; toast('أعلى درجة لهذا البند ' + max, false); }
        e.target.value = v;
      }
    }
    evCalc();
  });
}

function evMore(btn) {
  const m = btn.nextElementSibling, open = m.classList.toggle('hidden') === false;
  btn.innerHTML = open ? 'إخفاء التفاصيل ▴' : 'تفاصيل التنفيذ والملاحظات ▾';
}

// تعبئة البنود الفارغة فقط بالدرجة الكاملة (للتعديل بعدها حسب الحاجة)
function evFillMax() {
  let c = 0;
  document.querySelectorAll('#evSections input[data-f="s"]').forEach(i => { if (i.value === '') { i.value = i.max; c++; } });
  evCalc();
  toast(c ? 'تمت تعبئة ' + c + ' بند بالدرجة الكاملة، عدّلي ما يلزم' : 'كل البنود معبأة');
}

function evCalc() {
  const ins = document.querySelectorAll('#evSections input[data-f="s"]');
  let idx = 0, rawTotal = 0, wTotal = 0, filledAll = 0, totalAll = 0;
  EV_SECTIONS.forEach(sec => {
    let sum = 0, filled = 0;
    EV[sec.key].forEach(it => {
      const v = parseFloat(ins[idx++].value);
      totalAll++;
      if (!isNaN(v)) { sum += Math.min(Math.max(v, 0), it.max); filled++; }
    });
    filledAll += filled;
    const ce = document.getElementById('evC_' + sec.key); if (ce) ce.textContent = filled;
    const w = sum * sec.target / sec.maxSum;
    document.getElementById('evS_' + sec.key).textContent = evFmt(sum);
    document.getElementById('evW_' + sec.key).textContent = evFmt(w);
    rawTotal += sum; wTotal += w;
  });
  document.querySelectorAll('#evSections .ev-item').forEach(el => {
    const has = [...el.querySelectorAll('.ev-more select')].some(s => s.value && s.dataset.f !== 'e' ? true : (s.dataset.f === 'e' && s.value));
    el.querySelector('.ev-tg').classList.toggle('has', has);
  });
  const bn = document.getElementById('evBarN'); if (bn) bn.textContent = filledAll + '/' + totalAll;
  const g = evGrade(wTotal);
  document.getElementById('evRaw').textContent = evFmt(rawTotal);
  document.getElementById('evWeighted').textContent = evFmt(wTotal);
  document.getElementById('evGrade').textContent = g;
  document.getElementById('evBarW').textContent = evFmt(wTotal);
  document.getElementById('evBarG').textContent = g;
  return { rawTotal, wTotal, grade: g };
}

/* ---------- فتح الاستمارة ---------- */
function evOpenForm(type) {
  evType = type === 'multi' ? 'multi' : 'single';
  show('evalFormView');
  const lbl = document.getElementById('evTypeLabel'); if (lbl) lbl.textContent = EV_TYPES[evType];
  if (evTypeBuilt !== evType) { evBuild(); evTypeBuilt = evType; evCalc(); }
  if (!evBuilt) {
    evBind();
    document.getElementById('evPeriod').innerHTML = evOpts(EV.lists.period, 'اختاري الفترة');
    document.getElementById('evQual').innerHTML = evOpts(EV.lists.qual, 'اختاري المؤهل');
    document.getElementById('evCat').innerHTML = evOpts(EV.lists.cat, 'اختاري الفئة');
    document.getElementById('evDay').innerHTML = evOpts(EV.lists.day, 'اختاري اليوم');
    evPad = makeSigPad(document.getElementById('evSig'));
    document.getElementById('evSigBox').addEventListener('toggle', e => { if (e.target.open) setTimeout(() => evPad.resize(), 30); });
    evBuilt = true;
  }
  document.getElementById('evCenter').innerHTML = evOpts(LISTS.centers, 'اختاري المركز');
  evFillTeacherList();
  if (!document.getElementById('evDate').value) { document.getElementById('evDate').value = todayStr(); evDateChange(); }
  evCalc();
  setTimeout(() => evPad.resize(), 60);
}

function evDateChange() {
  const v = document.getElementById('evDate').value;
  if (!v) return;
  const p = v.split('-');
  const name = DAYS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
  if (EV.lists.day.indexOf(name) > -1) document.getElementById('evDay').value = name;
}

/* ---------- الحفظ ---------- */
async function evSave() {
  const val = id => document.getElementById(id).value.trim();
  const center = val('evCenter'), period = val('evPeriod'), teacher = val('evTeacher'), date = val('evDate');
  if (!center) return toast('اختاري اسم المركز', false);
  if (!period) return toast('اختاري الفترة', false);
  if (!teacher) return toast('اكتبي اسم المعلمة', false);
  if (!date) return toast('اختاري التاريخ', false);

  const items = [];
  let missing = 0;
  const total = evD().basic.length + evD().second.length + evD().sub.length;
  for (let i = 0; i < total; i++) {
    const q = f => document.querySelector('#evSections [data-i="' + i + '"][data-f="' + f + '"]');
    const s = q('s').value;
    if (s === '') missing++;
    items.push({ score: s, exec: q('e').value, crit: q('c') ? q('c').value : '', note: q('n') ? q('n').value : '' });
  }
  if (missing) {
    const first = [...document.querySelectorAll('#evSections input[data-f="s"]')].find(i => i.value === '');
    if (first) { const d = first.closest('details'); if (d) d.open = true; first.scrollIntoView({ block: 'center' }); first.focus(); }
    return toast('بقي ' + missing + ' بند بدون درجة (اكتبي 0 إن لم ينل شيئاً)', false);
  }

  const btn = document.getElementById('evSaveBtn');
  const calc = evCalc();
  setBtnBusy(btn, true);
  try {
    await api('addEval', {
      center, period, teacher, date, items, formType: evType,
      raw: evFmt(calc.rawTotal), weighted: evFmt(calc.wTotal), grade: calc.grade,
      qual: val('evQual'), cat: val('evCat'), day: val('evDay'), lesson: val('evLesson'),
      years: val('evYears'), total: val('evTotalN'), present: val('evPresent'), visitNo: val('evVisitNo'),
      supervisor: val('evSupervisor'), notes: val('evNotes'), recs: val('evRecs'),
      signature: evPad.has() ? evPad.data() : ''
    });
    toast('تم حفظ الاستمارة');
    evReset();
    show('evalsView');
    evLoadList();
  } catch (e) { toast(e.message, false); }
  finally { setBtnBusy(btn, false); }
}

function evReset() {
  ['evCenter', 'evPeriod', 'evTeacher', 'evQual', 'evCat', 'evDay', 'evLesson', 'evYears', 'evTotalN', 'evPresent', 'evVisitNo', 'evNotes', 'evRecs']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('evDate').value = todayStr(); evDateChange();
  document.querySelectorAll('#evSections select, #evSections input').forEach(el => el.value = '');
  if (evPad) evPad.clear();
  evCalc();
}

/* ---------- السجل (قرآن لحاله، تبيان لحاله، وسجل موحّد للمعلمة) ---------- */
// لإضافة مادة جديدة (التجويد) أضيفي سطراً هنا فقط
const EV_SUBJECTS = [
  { key: 'quran',  label: 'القرآن الكريم', match: r => r.formType !== 'tabyan', score: r => esc(r.weighted) + ' من 100' },
  { key: 'tabyan', label: 'التبيان',        match: r => r.formType === 'tabyan', score: r => esc(r.raw) + ' من 40' }
];
let evTab = 'quran';

// توحيد كتابة الاسم لأجل الدمج (الهمزات، التاء المربوطة، الياء، التشكيل، المسافات)
function evNameKey(n) {
  return String(n || '').replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

// أسماء المعلمات للقائمة: من الشيت + من الاستمارات المحفوظة
function evTeacherNames() {
  const seen = {}, out = [];
  ((LISTS && LISTS.teachers) || []).concat(evRows.map(r => r.teacher)).forEach(n => {
    const k = evNameKey(n);
    if (k && !seen[k]) { seen[k] = 1; out.push(String(n).trim()); }
  });
  return out.sort((x, y) => x.localeCompare(y, 'ar'));
}
function evFillTeacherList() {
  const dl = document.getElementById('teacherList');
  if (dl) dl.innerHTML = evTeacherNames().map(n => '<option value="' + esc(n) + '"></option>').join('');
}

function evSetTab(t) {
  evTab = t;
  document.querySelectorAll('#evTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  evRender();
}

function evGradeTag(g) {
  return '<span class="tag ' + (g === 'لم تجتاز' || g === 'ضعيف' ? 'warn' : 'ok') + '">' + esc(g) + '</span>';
}

function evRender() {
  const head = document.getElementById('evHead'), body = document.getElementById('evBody');
  if (!head || !body) return;
  const btnView = i => '<button class="btn light" style="padding:6px 12px;font-size:13px" onclick="evView(' + i + ')">عرض</button>';

  if (evTab === 'teachers') {
    head.innerHTML = '<tr><th>المعلمة</th>' + EV_SUBJECTS.map(x => '<th>' + x.label + '</th>').join('') + '</tr>';
    const map = {};
    evRows.forEach((r, i) => {
      const k = evNameKey(r.teacher); if (!k) return;
      const m = map[k] || (map[k] = { name: r.teacher, last: {} });
      EV_SUBJECTS.forEach(sub => {
        if (!sub.match(r)) return;
        const cur = m.last[sub.key];
        if (!cur || String(r.date) > String(evRows[cur].date)) m.last[sub.key] = i;   // أحدث تاريخ
      });
      // الاسم المعروض: من أحدث استمارة
      if (String(r.date) >= String(m.nameDate || '')) { m.name = r.teacher; m.nameDate = r.date; }
    });
    const list = Object.keys(map).map(k => map[k]).sort((x, y) => x.name.localeCompare(y.name, 'ar'));
    if (!list.length) { body.innerHTML = '<tr><td colspan="' + (EV_SUBJECTS.length + 1) + '" class="empty">لا توجد استمارات</td></tr>'; return; }
    body.innerHTML = list.map(m => '<tr><td><b>' + esc(m.name) + '</b></td>' + EV_SUBJECTS.map(sub => {
      const i = m.last[sub.key];
      if (i === undefined) return '<td>—</td>';
      const r = evRows[i];
      return '<td>' + evGradeTag(r.grade) + '<div style="margin:4px 0;font-size:13px">' + sub.score(r) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:4px">' + esc(r.date) + '</div>' + btnView(i) + '</td>';
    }).join('') + '</tr>').join('');
    return;
  }

  const sub = EV_SUBJECTS.find(x => x.key === evTab);
  const isT = evTab === 'tabyan';
  head.innerHTML = isT
    ? '<tr><th>التاريخ</th><th>المركز</th><th>المعلمة</th><th>المجموع من 40</th><th>التقدير</th><th></th><th></th></tr>'
    : '<tr><th>التاريخ</th><th>المركز</th><th>المعلمة</th><th>الدرجة من 100</th><th>الدرجة الموزونة</th><th>التقدير</th><th></th><th></th></tr>';
  const cols = isT ? 7 : 8;
  const rows = [];
  evRows.forEach((r, i) => { if (sub.match(r)) rows.push([r, i]); });
  if (!rows.length) { body.innerHTML = '<tr><td colspan="' + cols + '" class="empty">لا توجد استمارات</td></tr>'; return; }
  body.innerHTML = rows.map(([r, i]) => '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.center) + '</td><td>' + esc(r.teacher) +
    (r.formType === 'multi' ? ' <span class="tag">تعدد المجموعات</span>' : '') + '</td>' +
    (isT ? '<td>' + esc(r.raw) + '</td>' : '<td>' + esc(r.raw) + '</td><td>' + esc(r.weighted) + '</td>') +
    '<td>' + evGradeTag(r.grade) + '</td><td>' + btnView(i) + '</td>' +
    '<td><button class="btn danger" onclick="evDelete(\'' + esc(r.id) + '\')">حذف</button></td></tr>').join('');
}

async function evLoadList() {
  try {
    const out = await api('getEvals');
    evRows = out.data;
    evFillTeacherList();
    evRender();
  } catch (e) { toast(e.message, false); }
}

function evView(i) {
  const r = evRows[i];
  if (r.formType === 'tabyan') return tbView(r);
  let items = [];
  try { items = JSON.parse(r.items || '[]'); } catch (e) {}
  let n = 0, rows = '';
  const D = r.formType === 'multi' ? EV2 : EV;
  EV_SECTIONS.forEach(sec => {
    rows += '<tr><th colspan="5" style="text-align:right">' + esc(sec.title) + '</th></tr>';
    D[sec.key].forEach((it, k) => {
      const x = items[n++] || {};
      rows += '<tr><td>' + (k + 1) + '</td><td style="text-align:right">' + esc(it.t) + '</td><td>' + esc(x.e || '') + '</td>' +
        '<td>' + esc(x.s) + ' / ' + it.max + '</td><td style="text-align:right">' + esc([x.c, x.n].filter(Boolean).join(' | ')) + '</td></tr>';
    });
  });
  const f = (l, v) => v ? '<div><b>' + l + ':</b> ' + esc(v) + '</div>' : '';
  document.getElementById('evModalBody').innerHTML =
    '<h2>' + esc(r.center) + ' - ' + esc(r.teacher) + '</h2>' +
    '<div class="ev-info">' + f('نوع الاستمارة', EV_TYPES[r.formType === 'multi' ? 'multi' : 'single']) + f('الفترة', r.period) + f('اليوم', r.day) + f('التاريخ', r.date) + f('الفئة', r.cat) + f('المؤهل', r.qual) +
    f('عنوان الدرس', r.lesson) + f('سنوات الخبرة', r.years) + f('العدد الكلي', r.total) + f('العدد الحاضر', r.present) +
    f('رقم الزيارة', r.visitNo) + f('اسم المشرفة', r.supervisor) + '</div>' +
    '<div class="tbl-wrap"><table style="min-width:560px"><thead><tr><th>م</th><th>البند</th><th>التنفيذ</th><th>الدرجة</th><th>المعايير والتوجيه</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="stats" style="margin-top:14px"><div class="stat"><b>' + esc(r.raw) + '</b><span>الدرجة الكلية من 100</span></div></div>' +
    '<div class="stats"><div class="stat"><b>' + esc(r.weighted) + '</b><span>الدرجة الموزونة - التقدير: ' + esc(r.grade) + '</span></div></div>' +
    f('ملاحظات المشرفة', r.notes) + f('توصيات المشرفة', r.recs) +
    (r.signature ? '<div style="margin-top:10px"><a class="lnk" target="_blank" rel="noopener" href="' + esc(r.signature) + '">عرض التوقيع</a></div>' : '');
  document.getElementById('evModal').classList.remove('hidden');
}
function evCloseModal() { document.getElementById('evModal').classList.add('hidden'); }

async function evDelete(id) {
  if (!confirm('هل تريدين حذف هذه الاستمارة؟')) return;
  try { await api('deleteEval', { id }); toast('تم الحذف'); evLoadList(); }
  catch (e) { toast(e.message, false); }
}
