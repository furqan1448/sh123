/* ===== الإشراف التربوي: عرض استمارات التقييم (القرآن، التبيان، التجويد، النهائي) وطباعتها وتحميلها PDF =====
   بنفس تنسيق استمارات وحدة تحفيظ الصغار: الكليشة الحمراء من الطرف إلى الطرف، والعنوان العنابي، وجدول البيانات،
   وجدول البنود بعمود «المجال»، ثم التوجيهات والتواقيع.
   يعتمد على: idari-print.js (التاريخ والأدوات) و sighar-print.js (الطباعة وPDF والمشاركة) فيُحمَّل بعدهما،
   وعلى بيانات الاستمارات في evals.js و tabyan.js و tajweed.js و final.js. */

const TV_CSS = `
.idoc.tv{width:794px;font-size:15.5px}
.idoc.tv .idc-body{padding:0 26px 14px}
.idoc.tv .idc-title{font-size:20px;margin:12px 0 10px;line-height:1.4}
.idoc.tv table{font-size:15px}
.idoc.tv .tv-info td{background:#f6f6f6;text-align:right;padding:4px 10px;font-weight:700}
.idoc.tv .tv-info{margin-bottom:8px}
.idoc.tv th{padding:4px 8px;font-size:15px}
.idoc.tv td{padding:3px 7px;line-height:1.35}
.idoc.tv td.tv-t{text-align:right;line-height:1.35}
.idoc.tv td.tv-g{font-weight:800;background:#faf6f6;color:#7a1f2b}
.idoc.tv td.tv-v{color:#7a1f2b;font-weight:800}
.idoc.tv tr.tv-sub td{background:#faf6f6;font-weight:800}
.idoc.tv tr.tv-sum td{background:#f2f2f2;font-weight:800;font-size:16px}
.idoc.tv .tv-box{border:1px solid #444;margin-top:8px}
.idoc.tv .tv-box b{display:block;background:#f2f2f2;padding:3px 12px;border-bottom:1px solid #444}
.idoc.tv .tv-box div{padding:5px 12px;min-height:30px;white-space:pre-wrap;line-height:1.5;font-weight:600}
.idoc.tv .idc-foot{margin-top:10px}
.idoc.tv .idc-foot>div{font-size:16px;min-width:260px}
`;

const tvJson = (t, d) => { try { const x = JSON.parse(t || ''); return x == null ? d : x; } catch (e) { return d; } };
const tvNum = v => { const n = parseFloat(v); return isNaN(n) ? '' : String(Math.round(n * 1000) / 1000); };
// التاريخ الهجري (أم القرى) من التاريخ الميلادي المحفوظ، مثل: ٩/٥/١٤٤٨هـ
function tvHijri(dateStr) {
  const p = String(dateStr || '').split(' ')[0].split('-');
  if (p.length !== 3) return idDigits(dateStr || '');
  const dt = new Date(+p[0], +p[1] - 1, +p[2]);
  if (isNaN(dt)) return idDigits(dateStr || '');
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(dt);
    const g = t => ((parts.find(x => x.type === t) || {}).value || '').replace(/\D/g, '');
    return '<span class="idc-date"><bdi>' + idDigits(g('day')) + '</bdi>/<bdi>' + idDigits(g('month')) + '</bdi>/<bdi>' + idDigits(g('year')) + 'هـ</bdi></span>';
  } catch (e) { return idDigits(dateStr); }
}

/* نوع الاستمارة وعنوانها وبنودها */
function tvForm(r) {
  const ft = String(r.formType || '');
  if (ft === 'tabyan' || ft === 'f_tabyan') {
    return { title: 'استمارة تقييم أداء معلمة التبيان ' + (ft === 'f_tabyan' ? '(النهائي)' : '(الأسبوعي)'),
      groups: [{ items: TB.items.map(it => ({ t: it[0], max: it[1] })) }], max: TB_MAX };
  }
  if (ft.indexOf('tj_') === 0 || ft.indexOf('f_tj_') === 0) {
    const vt = /tj_single$/.test(ft) ? 'single' : 'multi';
    return { title: 'استمارة تقييم مادة التجويد ' + (ft.indexOf('f_') === 0 ? '(النهائي)' : 'الأسبوعي') + ' — ' + TJ_V[vt].label,
      groups: [{ items: TJ_V[vt].items.map(it => ({ t: it[0], max: it[1] })) }], max: 100 };
  }
  const fin = ft === 'f_single' || ft === 'f_multi', multi = ft === 'multi' || ft === 'f_multi';
  const D = multi ? EV2 : EV;
  return { title: 'استمارة تقييم القرآن الكريم ' + (fin ? '(النهائي)' : '(الأسبوعي)') + ' — ' + (multi ? 'تعدد المجموعات' : 'بدون تعدد'),
    quran: true, fin: fin,
    groups: EV_SECTIONS.map(sec => ({ title: sec.title, target: sec.target, maxSum: sec.maxSum, items: D[sec.key].map(it => ({ t: it.t, max: it.max })) })), max: 100 };
}

function tvDocHtml(r, sigs, lhUrl) {
  sigs = sigs || {};
  const form = tvForm(r), ex = tvJson(r.extra, {}), items = tvJson(r.items, []);
  const m = x => '<span class="idc-m">' + x + '</span>';
  const head = '<img class="idc-lh" src="' + esc(lhUrl || SG_BG) + '" width="2000" height="351" alt="">';
  // بيانات رأس الاستمارة: ثلاث خانات في كل صف (الفارغ لا يظهر)
  const F = [['اسم المركز', r.center], ['الفترة', r.period], ['اسم المعلمة', r.teacher],
    ['رقم الزيارة', idDigits(r.visitNo || '')], ['اليوم', r.day], ['التاريخ', r.date ? tvHijri(r.date) : ''],
    ['عنوان الدرس', r.lesson], ['نوعها', ex.kind], ['الفئة', r.cat], ['العدد الكلي', idDigits(r.total || '')], ['العدد الحاضر', idDigits(r.present || '')],
    ['الفئة الثانية', ex.cat2], ['العدد الكلي (٢)', idDigits(ex.total2 || '')], ['العدد الحاضر (٢)', idDigits(ex.present2 || '')],
    ['عدد المجموعات', idDigits(ex.groups || '')], ['المؤهل', r.qual], ['سنوات الخبرة', idDigits(r.years || '')]];
  const cells = F.filter(x => String(x[1] || '').trim()).map(x => x[0] + ': ' + m(x[0] === 'التاريخ' ? x[1] : esc(x[1])));
  let info = '';
  for (let i = 0; i < cells.length; i += 3) info += '<tr>' + [0, 1, 2].map(j => '<td>' + (cells[i + j] || '') + '</td>').join('') + '</tr>';

  // البنود: عمود «المجال» للقرآن (المهارات)، وترقيم للتبيان والتجويد
  const hasG = !!form.quran, hasNote = form.quran && !form.fin;
  let body = '', n = 0;
  form.groups.forEach(g => {
    let sum = 0;
    g.items.forEach((it, k) => {
      const x = items[n++] || {};
      const s = x.s != null ? x.s : x.score;
      const v = parseFloat(s); if (!isNaN(v)) sum += v;
      const c = x.c != null ? x.c : x.crit, nt = x.n != null ? x.n : x.note, e = x.e != null ? x.e : x.exec;
      const note = [e, c === 'أخرى' ? '' : c, nt].filter(y => String(y || '').trim()).join(' | ');
      const first = hasG ? (k === 0 ? '<td class="tv-g" rowspan="' + (g.items.length + (form.fin ? 1 : 0)) + '">' + esc(g.title) + '</td>' : '') : '<td class="idc-n">' + idDigits(n) + '</td>';
      body += '<tr>' + first + '<td class="tv-t">' + esc(it.t) + '</td><td>' + idDigits(tvNum(it.max)) + '</td><td class="tv-v">' + idDigits(tvNum(s)) + '</td>' +
        (hasNote ? '<td class="tv-t">' + esc(note) + '</td>' : '') + '</tr>';
    });
    if (form.fin && hasG) body += '<tr class="tv-sub"><td class="tv-t">المجموع (الموزونة: ' + idDigits(tvNum(sum * g.target / g.maxSum)) + ' من ' + idDigits(tvNum(g.target)) + ')</td><td>' + idDigits(tvNum(g.maxSum)) + '</td><td class="tv-v">' + idDigits(tvNum(sum)) + '</td></tr>';
  });
  const span = hasG ? 2 : 2;
  const gradeTxt = esc(r.grade || '');
  const sum = form.quran
    ? '<tr class="tv-sum"><td colspan="' + span + '">الدرجة الكلية</td><td>' + idDigits('100') + '</td><td class="tv-v">' + idDigits(tvNum(r.raw)) + '</td>' + (hasNote ? '<td>الموزونة: ' + m(idDigits(tvNum(r.weighted))) + ' — التقدير: ' + m(gradeTxt) + '</td>' : '') + '</tr>' +
      (hasNote ? '' : '<tr class="tv-sum"><td colspan="' + span + '">الدرجة الموزونة — التقدير: ' + m(gradeTxt) + '</td><td colspan="2" class="tv-v">' + idDigits(tvNum(r.weighted)) + '</td></tr>')
    : '<tr class="tv-sum"><td colspan="' + span + '">الدرجة المستحقة — التقدير: ' + m(gradeTxt) + '</td><td>' + idDigits(tvNum(form.max)) + '</td><td class="tv-v">' + idDigits(tvNum(r.raw)) + '</td></tr>';
  const cols = (hasG ? '<col style="width:96px">' : '<col style="width:40px">') + '<col><col style="width:56px"><col style="width:70px">' + (hasNote ? '<col style="width:22%">' : '');
  const thead = '<tr><th>' + (hasG ? 'المجال' : 'م') + '</th><th>بنود التقييم</th><th>الدرجة</th><th>المستحقة</th>' + (hasNote ? '<th>ملاحظات</th>' : '') + '</tr>';
  const box = (lbl, v) => String(v || '').trim() ? '<div class="tv-box idc-avoid"><b>' + lbl + '</b><div>' + esc(v) + '</div></div>' : '';
  const sigCol = (lbl, name, sg) => '<div>' + lbl + (name ? '<br>' + m(esc(name)) : '') + idSig(sg) + '</div>';
  return '<div class="idoc sg tv">' + head + '<div class="idc-body">' +
    '<div class="idc-title">' + esc(form.title) + '</div>' +
    '<table class="tv-info">' + info + '</table>' +
    '<table><colgroup>' + cols + '</colgroup>' + thead + body + sum + '</table>' +
    box('ملاحظات المشرفة', r.notes) + box(form.quran ? 'توصيات المشرفة' : 'التوصيات', r.recs) +
    '<div class="idc-foot idc-avoid">' + sigCol('اسم المعلمة', r.teacher, '') + sigCol('اسم المشرفة والتوقيع', r.supervisor, sigs.sup) + '</div>' +
  '</div></div>';
}

// توقيع الاستمارة المحفوظ في ورقة «التواقيع» (بمعرّف الاستمارة)
async function tvLoadSigs(r) {
  if (!r || !r.signature || !r.id) return {};
  try { const map = await sgSigFetch([{ id: r.id }]); return map[r.id] ? { sup: map[r.id] } : {}; } catch (e) { return {}; }
}

/* سجل بصيغة الطباعة المشتركة (sighar-print.js): kind = 'tv' */
const tvRec = r => Object.assign({}, r, { kind: 'tv', _tv: r });

/* عرض الاستمارة داخل النافذة مع أزرار الطباعة وPDF والمشاركة */
async function tvView(r) {
  const m = document.getElementById('evModal'), b = document.getElementById('evModalBody');
  if (!m || !b) return;
  b.innerHTML = '<p class="empty">جارِ التحميل...</p>';
  m.classList.remove('hidden');
  const sigs = await tvLoadSigs(r);
  const rec = tvRec(r);
  b.innerHTML = '<div class="ex-bar"><button class="btn light" id="tvVPdf">تحميل PDF</button><button class="btn light" id="tvVShare">مشاركة</button></div>' +
    '<style>' + sgAllCss() + '</style><div class="id-scroll sg-fit">' + tvDocHtml(r, sigs) + '</div>';
  document.getElementById('tvVPdf').onclick = e => sgPdf(rec, e.currentTarget, sigs);
  document.getElementById('tvVShare').onclick = e => sgShare(rec, e.currentTarget, sigs);
  sgFitBox(b.querySelector('.sg-fit'));
}
