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
  EVALS: 'استمارات التقييم',
  DRAFTS: 'المسودات',   // مسودات الاستمارات لكل مشرفة (تظهر من أي جهاز)، تُنشأ تلقائياً
  SIGS: 'التواقيع'   // نسخة مصغّرة من كل توقيع (للإكسل) + توقيع المشرفة المحفوظ، تُنشأ تلقائياً
};

const VISIT_HEADERS = ['الرقم', 'اسم المركز', 'نوع الزيارة', 'التاريخ', 'التاريخ الهجري', 'اليوم',
  'المديرة متغيبة', 'التوقيع', 'تُحسب يوم', 'وقت التسجيل', 'حالة الزيارة'];
// حالات الزيارة: الأولى تحتاج توقيع المديرة، والباقي بدون توقيع (الأربع الأولى تُحسب يوم حضور، والأخيرة يوم غياب)
const VISIT_STATUS = ['تمت الزيارة', 'تمت الزيارة والمديرة متغيبة', 'تمت الزيارة وتعذر التوثيق لتعليق الموقع أو الشبكة', 'تمت الزيارة قبل توفر موقع النظام', 'لم تتم الزيارة'];
const VISIT_NONE = VISIT_STATUS[4]; // لم تتم الزيارة: تُحسب يوم غياب ولا تحتاج نوع زيارة ولا توقيع
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
    case 'deleteVisit': return withLock_(() => { const o = deleteById_(SHEET.VISITS, r.id); sigDel_(r.id); return o; });
    case 'getFiles': return { ok: true, data: getFiles_() };
    case 'addFile': return withLock_(() => addFile_(r));
    case 'deleteFile': return withLock_(() => deleteFile_(r.id));
    case 'getEvals': return { ok: true, data: getEvals_() };
    case 'getEvalsBundle': return { ok: true, data: getEvalsCached_(), drafts: getDrafts_(r.username) };   // طلب واحد: الاستمارات + المسودات
    case 'getDrafts': return { ok: true, data: getDrafts_(r.username) };
    case 'saveDraft': return withLock_(() => saveDraft_(r));
    case 'deleteDraft': return withLock_(() => deleteDraft_(r));
    case 'addEval': return withLock_(() => addEval_(r));
    case 'updateEval': return withLock_(() => updateEval_(r));
    case 'deleteEval': return withLock_(() => { const o = deleteById_(SHEET.EVALS, r.id, true, EVAL_URL_COL); sigDel_(r.id); evalsBump_(); return o; });
    case 'getSigs': return { ok: true, data: getSigs_(r.items) };
    case 'getMySig': return { ok: true, data: sigGet_('u:' + norm_(r.username).toLowerCase()) };
    case 'saveMySig': return withLock_(() => { sigPut_('u:' + norm_(r.username).toLowerCase(), r.data); return { ok: true }; });
    case 'deleteMySig': return withLock_(() => { sigDel_('u:' + norm_(r.username).toLowerCase()); return { ok: true }; });
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
  const type = String(r.type || '').trim();   // قد تحوي أكثر من نوع مفصولة بـ «،»
  const typeList = type ? type.split(/[،,]/).map(x => x.trim()).filter(Boolean) : [];
  let date = String(r.date || '').trim();
  // توافق مع النسخة القديمة من الواجهة (absent=true) إن لم تصل «الحالة»
  const status = String(r.status || (r.absent === true ? VISIT_STATUS[1] : VISIT_STATUS[0])).trim();
  if (VISIT_STATUS.indexOf(status) < 0) throw new Error('حالة الزيارة غير صحيحة');
  const notVisited = status === VISIT_NONE;   // لم تتم الزيارة: لا نوع زيارة ولا توقيع
  if (!notVisited && !center) throw new Error('اختاري اسم المركز');
  if (!type && !notVisited) throw new Error('اختاري نوع الزيارة');
  if (!date && notVisited) date = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd');   // لم تتم الزيارة: لا شيء مطلوب، والتاريخ الافتراضي اليوم
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('التاريخ غير صحيح');
  const needSig = status === VISIT_STATUS[0];
  if (needSig && !r.signature) throw new Error('توقيع المديرة مطلوب، أو اختاري حالة أخرى للزيارة');

  let lists = getLists_(false);
  const badType = l => typeList.some(t => l.types.indexOf(t) < 0);
  if ((center && lists.centers.indexOf(center) < 0) || (!notVisited && badType(lists))) lists = getLists_(true);
  if (center && lists.centers.indexOf(center) < 0) throw new Error('اسم المركز غير موجود في القائمة');
  if (!notVisited && badType(lists)) throw new Error('نوع الزيارة غير موجود في القائمة');

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
    status === VISIT_STATUS[1] ? 'نعم' : 'لا', sigUrl, notVisited ? 'لا' : 'نعم',
    Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'), status
  ]];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  if (needSig && sigUrl) sigPut_(id, r.signature);
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

/* ============ التواقيع (نسخة مصغّرة لكل توقيع تُستخدم في الإكسل) ============ */
function sigSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.SIGS);
  if (!sh) {
    sh = ss.insertSheet(SHEET.SIGS);
    sh.getRange(1, 1, 1, 2).setValues([['المعرّف', 'التوقيع (نسخة مصغّرة)']]);
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 260);
  }
  return sh;
}
function sigRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}
function sigPut_(id, data) {
  data = String(data || '');
  if (!id || data.indexOf('data:image/') !== 0 || data.length > 49000) return;   // خلية الشيت لا تتّسع لأكثر من ذلك
  const sh = sigSheet_();
  const row = sigRow_(sh, id) || sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, 2).setNumberFormat('@').setValues([[String(id), data]]);
}
function sigGet_(id) {
  const sh = ss_().getSheetByName(SHEET.SIGS);
  if (!sh) return '';
  const row = sigRow_(sh, id);
  return row ? String(sh.getRange(row, 2).getValue()) : '';
}
function sigDel_(id) {
  try {
    const sh = ss_().getSheetByName(SHEET.SIGS);
    if (!sh) return;
    const row = sigRow_(sh, id);
    if (row) sh.deleteRow(row);
  } catch (e) {}
}
// items = [{id, url}] → { id: dataURL }. إن لم توجد نسخة مصغّرة (سجلات قديمة) نقرأ الملف من الدرايف مرة واحدة ونحفظ نسخة منه
function getSigs_(items) {
  items = Array.isArray(items) ? items.slice(0, 120) : [];
  const out = {};
  if (!items.length) return out;
  const sh = ss_().getSheetByName(SHEET.SIGS);
  const last = sh ? sh.getLastRow() : 0;
  const rowOf = {};
  if (last > 1) {
    const ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) rowOf[String(ids[i][0])] = i + 2;
  }
  const need = items.filter(x => x && rowOf[String(x.id)]);
  if (need.length > 15) {   // كثيرة: نقرأ العمود دفعة واحدة
    const vals = sh.getRange(2, 2, last - 1, 1).getValues();
    need.forEach(x => { out[x.id] = String(vals[rowOf[String(x.id)] - 2][0]); });
  } else {
    need.forEach(x => { out[x.id] = String(sh.getRange(rowOf[String(x.id)], 2).getValue()); });
  }
  let fb = 0, folderId = '';
  items.forEach(x => {
    if (!x || out[x.id] || !x.url || fb >= 25) return;
    const m = String(x.url).match(/[-\w]{25,}/);
    if (!m) return;
    try {
      if (!folderId) folderId = folder_().getId();
      const f = DriveApp.getFileById(m[0]);
      const ps = f.getParents(); let inside = false;
      while (ps.hasNext()) if (ps.next().getId() === folderId) { inside = true; break; }
      if (!inside) return;   // لا نقرأ إلا ملفات المنظومة
      const blob = f.getBlob(), d = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
      out[x.id] = d; fb++;
      sigPut_(x.id, d);
    } catch (e) {}
  });
  return out;
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
    signature: r[20], at: r[21], formType: evalTypeKey_(r[22]), extra: r[23] || ''
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

// أنواع الاستمارات (المفتاح ← الاسم المكتوب في عمود «نوع الاستمارة»). f_ = استمارات التقييم النهائية
const EVAL_TYPE_LABELS = {
  multi: 'تعدد المجموعات', tabyan: 'التبيان', tj_multi: 'التجويد - تعدد المجموعات', tj_single: 'التجويد - بدون تعدد',
  f_multi: 'القرآن النهائي - تعدد المجموعات', f_single: 'القرآن النهائي - بدون تعدد',
  f_tabyan: 'التبيان النهائي', f_tj_single: 'التجويد النهائي - بدون تعدد', f_tj_multi: 'التجويد النهائي - تعدد المجموعات'
};
function evalTypeLabel_(ft) {
  return EVAL_TYPE_LABELS[ft] || 'بدون تعدد';
}
function evalTypeKey_(label) {
  for (const k in EVAL_TYPE_LABELS) if (EVAL_TYPE_LABELS[k] === label) return k;
  return 'single';
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
  if (sigUrl) sigPut_(newId, r.signature);
  evalsBump_();
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
    sigPut_(id, r.signature);
  }
  const vals = [evalRow_(r, c, id, sigUrl, String(old[21] || nowStr_()), String(old[22] || evalTypeLabel_(c.s(r.formType))))];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  evalsBump_();
  return { ok: true, id: id, signature: sigUrl };
}


/* ============ كاش الاستمارات (يسرّع التحميل؛ يُبطَل تلقائياً عند أي إضافة أو تعديل أو حذف) ============ */
const EVALS_CACHE_TTL = 300;   // ثوانٍ: لو عدّلتِ الشيت يدوياً تظهر التغييرات خلال 5 دقائق كحد أقصى
function evalsVer_() {
  const c = CacheService.getScriptCache();
  let v = c.get('ev_ver');
  if (!v) { v = String(Date.now()); c.put('ev_ver', v, 21600); }
  return v;
}
function evalsBump_() {
  try { CacheService.getScriptCache().put('ev_ver', String(Date.now()), 21600); } catch (e) {}
}
function getEvalsCached_() {
  const c = CacheService.getScriptCache();
  const key = 'ev_' + evalsVer_();
  try {
    const n = parseInt(c.get(key + '_n') || '0', 10);
    if (n > 0) {
      const keys = []; for (let i = 0; i < n; i++) keys.push(key + '_' + i);
      const parts = c.getAll(keys); let s = '', ok = true;
      for (let i = 0; i < n; i++) { const p = parts[key + '_' + i]; if (p == null) { ok = false; break; } s += p; }
      if (ok) return JSON.parse(s);
    }
  } catch (e) {}
  const data = getEvals_();
  try {
    const s = JSON.stringify(data), CH = 30000, cnt = Math.ceil(s.length / CH);   // كل قطعة أقل من 100KB
    if (cnt > 0 && cnt <= 60) {
      const o = {};
      for (let i = 0; i < cnt; i++) o[key + '_' + i] = s.substr(i * CH, CH);
      o[key + '_n'] = String(cnt);
      c.putAll(o, EVALS_CACHE_TTL);
    }
  } catch (e) {}
  return data;
}

/* ============ المسودات (تُحفظ على الخادم لكل مشرفة لتفتحها من أي جهاز) ============ */
const DRAFT_HEADERS = ['الرقم', 'المستخدمة', 'نوع الاستمارة', 'اسم المعلمة', 'المركز', 'التاريخ', 'وقت التحديث', 'البيانات', 'التوقيع'];
function draftSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.DRAFTS);
  if (!sh) {
    sh = ss.insertSheet(SHEET.DRAFTS);
    sh.getRange(1, 1, 1, DRAFT_HEADERS.length).setValues([DRAFT_HEADERS]);
    styleHeader_(sh, DRAFT_HEADERS.length);
    sh.setColumnWidths(1, DRAFT_HEADERS.length, 140);
  }
  return sh;
}
function draftUser_(r) { return norm_(r.username).toLowerCase(); }
function getDrafts_(username) {
  const sh = ss_().getSheetByName(SHEET.DRAFTS);
  if (!sh || sh.getLastRow() < 2) return [];
  const u = norm_(username).toLowerCase();
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, DRAFT_HEADERS.length).getValues();
  const out = [];
  rows.forEach(r => {
    if (!r[0] || String(r[1]) !== u) return;
    let vals = [];
    try { vals = JSON.parse(String(r[7] || '[]')); } catch (e) {}
    out.push({ id: String(r[0]), ft: String(r[2]), teacher: String(r[3]), center: String(r[4]), date: String(r[5]), at: String(r[6]), vals: vals, sig: String(r[8] || '') });
  });
  return out;
}
function draftRow_(sh, id, u) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 1, last - 1, 2).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id && String(ids[i][1]) === u) return i + 2;
  return 0;
}
function saveDraft_(r) {
  const d = r.draft || {};
  const id = String(d.id || '').slice(0, 60);
  if (!id) throw new Error('مسودة غير صالحة');
  const ft = String(d.ft || '');
  if (!EVAL_TYPE_LABELS[ft] && ft !== 'single') throw new Error('نوع المسودة غير معروف');
  if (!Array.isArray(d.vals) || d.vals.length > 300) throw new Error('بيانات المسودة غير صالحة');
  const vals = JSON.stringify(d.vals.map(v => String(v == null ? '' : v)));
  if (vals.length > 45000) throw new Error('المسودة كبيرة جداً');
  let sig = String(d.sig || '');
  if (sig.indexOf('data:image/') !== 0 || sig.length > 45000) sig = '';
  const u = draftUser_(r);
  const sh = draftSheet_();
  const row = draftRow_(sh, id, u) || sh.getLastRow() + 1;
  const at = String(d.at || new Date().toISOString()).slice(0, 40);
  sh.getRange(row, 1, 1, DRAFT_HEADERS.length).setNumberFormat('@').setValues([[
    id, u, ft, String(d.teacher || '').slice(0, 200), String(d.center || '').slice(0, 200), String(d.date || '').slice(0, 20), at, vals, sig
  ]]);
  return { ok: true, id: id };
}
function deleteDraft_(r) {
  const id = String(r.id || '');
  const sh = ss_().getSheetByName(SHEET.DRAFTS);
  if (!sh || !id) return { ok: true };
  const row = draftRow_(sh, id, draftUser_(r));
  if (row) sh.deleteRow(row);
  return { ok: true };
}
