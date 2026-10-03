/**
 * منظومة مشرفات مكتب إشراف الداخل — Code.gs
 * الصقيه في Apps Script المرتبط بقوقل شيت، ثم شغّلي setup() مرة واحدة، ثم انشري كـ Web App.
 */

// إن كان الـ Apps Script غير مرتبط بالشيت تلقائياً: ضعي هنا رقم الشيت (ID) من رابطه، وإلا اتركيه فارغاً
const SPREADSHEET_ID = '';
function ss_() { return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActive(); }

const SHEET = {
  USERS: 'المستخدمات',
  LISTS: 'القوائم',
  VISITS: 'كشف الخروج',
  FILES: 'المرفقات',
  EVALS: 'استمارات التقييم'
};

const VISIT_HEADERS = ['الرقم', 'اسم المركز', 'نوع الزيارة', 'التاريخ', 'التاريخ الهجري', 'اليوم',
  'المديرة متغيبة', 'التوقيع', 'تُحسب يوم', 'وقت التسجيل', 'حالة الزيارة'];
// حالات الزيارة: الأولى تحتاج توقيع المديرة، والباقي بدون توقيع (وكلها تُحسب يوماً واحداً)
const VISIT_STATUS = ['تمت الزيارة', 'تمت الزيارة والمديرة متغيبة', 'تمت الزيارة وتعذر التوثيق لتعليق الموقع أو الشبكة', 'تمت الزيارة قبل توفر موقع النظام'];
const VISIT_STATUS_COL = 11;
const FILE_HEADERS = ['الرقم', 'العنوان', 'اسم الملف', 'الرابط', 'وقت الرفع'];
const EVAL_HEADERS = ['الرقم', 'اسم المركز', 'الفترة', 'اسم المعلمة', 'المؤهل', 'الفئة', 'اليوم', 'التاريخ',
  'عنوان الدرس', 'سنوات الخبرة', 'العدد الكلي', 'العدد الحاضر', 'رقم الزيارة', 'اسم المشرفة',
  'الدرجة الكلية', 'الدرجة الموزونة', 'التقدير', 'البنود', 'ملاحظات المشرفة', 'توصيات المشرفة', 'التوقيع', 'وقت التسجيل', 'نوع الاستمارة', 'بيانات إضافية'];
const EVAL_URL_COL = 21; // عمود التوقيع (رابط ملف في الدرايف)

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DRIVE_FOLDER_NAME = 'منظومة مشرفات - الملفات';
const LINK_MARK = 'رابط'; // يُكتب في عمود «اسم الملف» للمرفقات من نوع رابط (لا يوجد ملف في الدرايف ليُحذف)

/* ============ الإعداد الأولي (شغّليه مرة واحدة) ============ */
function setup() {
  const ss = ss_();

  // المستخدمات (اسم المستخدم + كلمة المرور)
  const us = getOrCreate_(ss, SHEET.USERS);
  if (us.getLastRow() === 0) {
    us.getRange(1, 1, 1, 2).setValues([['اسم المستخدم', 'كلمة المرور']]);
    us.getRange(2, 1, 1, 2).setNumberFormat('@').setValues([['مشرفة1', '1234']]);
  }
  styleHeader_(us, 2);
  us.getRange('A2:B500').setNumberFormat('@');
  us.setColumnWidth(1, 200); us.setColumnWidth(2, 200);

  // القوائم (المصدر للقوائم المنسدلة)
  const ls = getOrCreate_(ss, SHEET.LISTS);
  if (ls.getLastRow() === 0) {
    ls.getRange(1, 1, 1, 2).setValues([['أسماء المراكز', 'أنواع الزيارة']]);
    ls.getRange(2, 1, 2, 2).setValues([['مركز تجريبي 1', 'زيارة دورية'], ['مركز تجريبي 2', 'زيارة مفاجئة']]);
  }
  if (!ls.getRange(1, 3).getValue()) ls.getRange(1, 3).setValue('أسماء المعلمات');
  styleHeader_(ls, 3);
  ls.setColumnWidth(1, 220); ls.setColumnWidth(2, 220); ls.setColumnWidth(3, 220);

  // كشف الخروج
  const vs = getOrCreate_(ss, SHEET.VISITS);
  ensureHeaders_(vs, VISIT_HEADERS);
  styleHeader_(vs, VISIT_HEADERS.length);
  vs.getRange(2, 4, 1999, 2).setNumberFormat('@'); // التاريخ والهجري كنص
  const dvCenter = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ls.getRange('A2:A500'), true).setAllowInvalid(false).build();
  const dvType = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ls.getRange('B2:B500'), true).setAllowInvalid(false).build();
  vs.getRange('B2:B2000').setDataValidation(dvCenter);
  vs.getRange('C2:C2000').setDataValidation(dvType);
  vs.setColumnWidths(1, VISIT_HEADERS.length, 140);

  // المرفقات
  const fs = getOrCreate_(ss, SHEET.FILES);
  ensureHeaders_(fs, FILE_HEADERS);
  styleHeader_(fs, FILE_HEADERS.length);
  fs.setColumnWidths(1, FILE_HEADERS.length, 160);

  // استمارات التقييم
  const es = getOrCreate_(ss, SHEET.EVALS);
  ensureHeaders_(es, EVAL_HEADERS);
  // ورقة قديمة قبل إضافة عمود النوع: نكمّل ترويسته فقط
  if (es.getLastRow() > 0) es.getRange(1, 1, 1, EVAL_HEADERS.length).setValues([EVAL_HEADERS]);
  styleHeader_(es, EVAL_HEADERS.length);
  es.setColumnWidths(1, EVAL_HEADERS.length, 140);

  folder_(); // ينشئ مجلد الدرايف
  Logger.log('تم الإعداد بنجاح');
}

function getOrCreate_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function ensureHeaders_(sh, headers) {
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}
function styleHeader_(sh, cols) {
  sh.setRightToLeft(true);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, cols)
    .setBackground('#7a1f2b').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center');
}
function folder_() {
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

/* ============ API ============ */
function doGet() {
  return json_({ ok: true, msg: 'منظومة مشرفات تعمل' });
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    if (!checkAuth_(req.username, req.password)) {
      out = { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    } else {
      out = route_(req);
    }
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return json_(out);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function route_(r) {
  switch (r.action) {
    case 'login': return { ok: true };
    case 'getLists': return { ok: true, data: getLists_() };
    case 'getVisits': return { ok: true, data: getVisits_() };
    case 'addVisit': return withLock_(() => addVisit_(r));
    case 'deleteVisit': return withLock_(() => deleteById_(SHEET.VISITS, r.id));
    case 'getFiles': return { ok: true, data: getFiles_() };
    case 'addFile': return withLock_(() => addFile_(r));
    case 'deleteFile': return withLock_(() => deleteFile_(r.id));
    case 'getEvals': return { ok: true, data: getEvals_() };
    case 'addEval': return withLock_(() => addEval_(r));
    case 'updateEval': return withLock_(() => updateEval_(r));
    case 'deleteEval': return withLock_(() => deleteById_(SHEET.EVALS, r.id, true, EVAL_URL_COL));
    default: throw new Error('إجراء غير معروف');
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ============ المستخدمات من الشيت ============ */
function norm_(s) {
  return String(s == null ? '' : s).trim()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}
// المستخدمات تُحفظ في كاش قصير (دقيقتان) لتسريع كل طلب؛ وإن لم يطابق الكاش نقرأ الشيت مباشرة (مستخدمة جديدة أو كلمة مرور جديدة تعمل فوراً)
function usersRows_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const hit = cache.get('users_v1');
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  }
  const sh = ss_().getSheetByName(SHEET.USERS);
  if (!sh) throw new Error('شغّلي setup() أولاً');
  const rows = sh.getDataRange().getDisplayValues().slice(1).map(r => [norm_(r[0]).toLowerCase(), norm_(r[1])]);
  try { cache.put('users_v1', JSON.stringify(rows), 120); } catch (e) {}
  return rows;
}
function checkAuth_(user, pw) {
  const u = norm_(user).toLowerCase(), p = norm_(pw);
  if (!u || !p) return false;
  const has = rows => rows.some(r => r[0] === u && r[1] === p);
  return has(usersRows_(false)) || has(usersRows_(true));
}

/* ============ القوائم ============ */
function getLists_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const hit = cache.get('lists_v1');
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  }
  const sh = ss_().getSheetByName(SHEET.LISTS);
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  const centers = [], types = [], teachers = [];
  rows.forEach(r => {
    if (String(r[0]).trim()) centers.push(String(r[0]).trim());
    if (String(r[1]).trim()) types.push(String(r[1]).trim());
    if (r[2] != null && String(r[2]).trim()) teachers.push(String(r[2]).trim());
  });
  const out = { centers: centers, types: types, teachers: teachers };
  try { cache.put('lists_v1', JSON.stringify(out), 120); } catch (e) {}
  return out;
}

/* ============ كشف الخروج ============ */
function getVisits_() {
  const sh = ss_().getSheetByName(SHEET.VISITS);
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  return rows.filter(r => r[0]).map(r => {
    const absent = r[6] === 'نعم';
    // الصفوف القديمة ما فيها حالة: نستنتجها من عمود «المديرة متغيبة»
    const status = r[10] || (absent ? VISIT_STATUS[1] : VISIT_STATUS[0]);
    return { id: r[0], center: r[1], type: r[2], date: r[3], hijri: r[4], day: r[5],
      absent: absent, status: status, signature: r[7], counted: r[8] === 'نعم', at: r[9] };
  }).reverse();
}

function addVisit_(r) {
  const center = String(r.center || '').trim();
  const type = String(r.type || '').trim();
  const date = String(r.date || '').trim();
  // توافق مع النسخة القديمة من الواجهة (absent=true) إن لم تصل «الحالة»
  const status = String(r.status || (r.absent === true ? VISIT_STATUS[1] : VISIT_STATUS[0])).trim();
  if (!center) throw new Error('اختاري اسم المركز');
  if (!type) throw new Error('اختاري نوع الزيارة');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('التاريخ غير صحيح');
  if (VISIT_STATUS.indexOf(status) < 0) throw new Error('حالة الزيارة غير صحيحة');
  const needSig = status === VISIT_STATUS[0];
  if (needSig && !r.signature) throw new Error('توقيع المديرة مطلوب، أو اختاري حالة أخرى للزيارة');

  let lists = getLists_(false);
  if (lists.centers.indexOf(center) < 0 || lists.types.indexOf(type) < 0) lists = getLists_(true);
  if (lists.centers.indexOf(center) < 0) throw new Error('اسم المركز غير موجود في القائمة');
  if (lists.types.indexOf(type) < 0) throw new Error('نوع الزيارة غير موجود في القائمة');

  const p = date.split('-');
  const day = DAY_NAMES[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];

  let sigUrl = '';
  if (needSig && r.signature) {
    const b64 = String(r.signature).split(',')[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'توقيع-' + center + '-' + date + '.png');
    const f = folder_().createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    sigUrl = f.getUrl();
  }

  const sh = ss_().getSheetByName(SHEET.VISITS);
  // عمود الحالة الجديد: نكتب ترويسته مرة واحدة إن كانت الورقة قديمة (لا حاجة لتشغيل setup)
  if (!sh.getRange(1, VISIT_STATUS_COL).getValue()) {
    sh.getRange(1, VISIT_STATUS_COL).setValue(VISIT_HEADERS[VISIT_STATUS_COL - 1])
      .setBackground('#7a1f2b').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  }
  const id = Utilities.getUuid();
  const row = sh.getLastRow() + 1;
  const vals = [[
    id, center, type, date, String(r.hijri || ''), day,
    status === VISIT_STATUS[1] ? 'نعم' : 'لا', sigUrl, 'نعم',
    Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'), status
  ]];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, id: id, day: day, signature: sigUrl };
}

/* ============ المرفقات ============ */
function getFiles_() {
  const sh = ss_().getSheetByName(SHEET.FILES);
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  return rows.filter(r => r[0]).map(r => ({
    id: r[0], title: r[1], name: r[2], url: r[3], at: r[4]
  })).reverse();
}

function addFile_(r) {
  const title = String(r.title || '').trim();
  if (!title) throw new Error('اكتبي عنوان المرفق');
  const link = String(r.url || '').trim();
  if (link) {   // إرفاق رابط بدل ملف
    if (link.length > 2000 || !/^https?:\/\/[^\s]+$/i.test(link)) throw new Error('الرابط غير صحيح، يجب أن يبدأ بـ http أو https');
    const lid = Utilities.getUuid();
    ss_().getSheetByName(SHEET.FILES).appendRow([
      lid, title, LINK_MARK, link,
      Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm')
    ]);
    return { ok: true, id: lid, url: link };
  }
  if (!r.data) throw new Error('اختاري ملفاً');
  const blob = Utilities.newBlob(Utilities.base64Decode(r.data), r.mime || 'application/octet-stream', r.name || 'ملف');
  const f = folder_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const sh = ss_().getSheetByName(SHEET.FILES);
  const fid = Utilities.getUuid();
  sh.appendRow([
    fid, title, r.name || '', f.getUrl(),
    Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm')
  ]);
  return { ok: true, id: fid, url: f.getUrl() };
}

/* ============ حذف مرفق (الرابط لا يُحذف له ملف من الدرايف) ============ */
function deleteFile_(id) {
  const sh = ss_().getSheetByName(SHEET.FILES);
  const last = sh.getLastRow();
  let isLink = false;
  if (last > 1) {
    const rows = sh.getRange(1, 1, last, 3).getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(id)) { isLink = String(rows[i][2]) === LINK_MARK; break; }
    }
  }
  return deleteById_(SHEET.FILES, id, !isLink);
}

/* ============ حذف صف بالرقم ============ */
function deleteById_(sheetName, id, trashFile, urlCol) {
  const sh = ss_().getSheetByName(sheetName);
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = 1; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      if (trashFile) {
        const url = String(sh.getRange(i + 1, urlCol || 4).getValue());
        const m = url.match(/[-\w]{25,}/);
        if (m) { try { DriveApp.getFileById(m[0]).setTrashed(true); } catch (e) {} }
      }
      sh.deleteRow(i + 1);
      return { ok: true };
    }
  }
  throw new Error('السجل غير موجود');
}

/* ============ استمارات التقييم ============ */
function getEvals_() {
  const sh = ss_().getSheetByName(SHEET.EVALS);
  if (!sh) throw new Error('شغّلي setup() مرة أخرى لإنشاء ورقة الاستمارات');
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  return rows.filter(r => r[0]).map(r => ({
    id: r[0], center: r[1], period: r[2], teacher: r[3], qual: r[4], cat: r[5], day: r[6], date: r[7],
    lesson: r[8], years: r[9], total: r[10], present: r[11], visitNo: r[12], supervisor: r[13],
    raw: r[14], weighted: r[15], grade: r[16], items: r[17], notes: r[18], recs: r[19],
    signature: r[20], at: r[21], formType: r[22] === 'تعدد المجموعات' ? 'multi' : (r[22] === 'التبيان' ? 'tabyan' : (r[22] === 'التجويد - تعدد المجموعات' ? 'tj_multi' : (r[22] === 'التجويد - بدون تعدد' ? 'tj_single' : 'single'))), extra: r[23] || ''
  })).reverse();
}

// تحقق وتجهيز بيانات الاستمارة (مشترك بين الإضافة والتعديل)
function evalCommon_(r) {
  const s = v => String(v == null ? '' : v).trim();
  const center = s(r.center), period = s(r.period), teacher = s(r.teacher), date = s(r.date);
  if (!center) throw new Error('اختاري اسم المركز');
  if (!period) throw new Error('اختاري الفترة');
  if (!teacher) throw new Error('اكتبي اسم المعلمة');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('التاريخ غير صحيح');
  if (!Array.isArray(r.items) || !r.items.length || r.items.length > 60) throw new Error('بنود الاستمارة غير مكتملة');

  let lists = getLists_(false);
  if (lists.centers.indexOf(center) < 0) lists = getLists_(true);
  if (lists.centers.indexOf(center) < 0) throw new Error('اسم المركز غير موجود في القائمة');

  // نحفظ البنود بمفاتيح مختصرة (s=الدرجة e=التنفيذ c=المعيار n=الملاحظة) كما تقرؤها شاشة العرض
  const items = r.items.map(x => ({ s: s(x.score), e: s(x.exec), c: s(x.crit), n: s(x.note) }));
  return { s: s, center: center, period: period, teacher: teacher, date: date, items: items };
}

function evalSig_(r, teacher, date) {
  if (!r.signature) return '';
  const b64 = String(r.signature).split(',')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'توقيع-استمارة-' + teacher + '-' + date + '.png');
  const f = folder_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f.getUrl();
}

function evalTypeLabel_(ft) {
  return ({ multi: 'تعدد المجموعات', tabyan: 'التبيان', tj_multi: 'التجويد - تعدد المجموعات', tj_single: 'التجويد - بدون تعدد' })[ft] || 'بدون تعدد';
}

function evalRow_(r, c, id, sigUrl, at, typeLabel) {
  const s = c.s;
  return [
    id, c.center, c.period, c.teacher, s(r.qual), s(r.cat), s(r.day), c.date,
    s(r.lesson), s(r.years), s(r.total), s(r.present), s(r.visitNo), s(r.supervisor),
    s(r.raw), s(r.weighted), s(r.grade), JSON.stringify(c.items), s(r.notes), s(r.recs), sigUrl,
    at, typeLabel, s(r.extra).slice(0, 2000)
  ];
}

function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'); }

function addEval_(r) {
  const c = evalCommon_(r);
  const sigUrl = evalSig_(r, c.teacher, c.date);
  const sh = ss_().getSheetByName(SHEET.EVALS);
  if (!sh) throw new Error('شغّلي setup() مرة أخرى لإنشاء ورقة الاستمارات');
  const row = sh.getLastRow() + 1;
  const newId = Utilities.getUuid();
  const vals = [evalRow_(r, c, newId, sigUrl, nowStr_(), evalTypeLabel_(c.s(r.formType)))];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, id: newId, signature: sigUrl };
}

// تعديل استمارة محفوظة: يبقى رقمها ونوعها ووقت تسجيلها، والتوقيع القديم يبقى إلا إذا وصل توقيع جديد
function updateEval_(r) {
  const id = String(r.id || '');
  if (!id) throw new Error('السجل غير موجود');
  const c = evalCommon_(r);
  const sh = ss_().getSheetByName(SHEET.EVALS);
  if (!sh) throw new Error('شغّلي setup() مرة أخرى لإنشاء ورقة الاستمارات');
  const last = sh.getLastRow();
  let row = 0;
  if (last > 1) {
    const ids = sh.getRange(1, 1, last, 1).getValues();
    for (let i = 1; i < ids.length; i++) if (String(ids[i][0]) === id) { row = i + 1; break; }
  }
  if (!row) throw new Error('السجل غير موجود');

  const old = sh.getRange(row, 1, 1, EVAL_HEADERS.length).getDisplayValues()[0];
  let sigUrl = String(old[EVAL_URL_COL - 1] || '');
  if (r.signature) {
    const newUrl = evalSig_(r, c.teacher, c.date);
    const m = sigUrl.match(/[-\w]{25,}/);
    if (m) { try { DriveApp.getFileById(m[0]).setTrashed(true); } catch (e) {} }
    sigUrl = newUrl;
  }
  const vals = [evalRow_(r, c, id, sigUrl, String(old[21] || nowStr_()), String(old[22] || evalTypeLabel_(c.s(r.formType))))];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, id: id, signature: sigUrl };
}
