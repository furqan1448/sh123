/**
 * منظومة مشرفات مكتب إشراف الداخل — Code.gs
 * الصقيه في Apps Script المرتبط بقوقل شيت، ثم شغّلي setup() مرة واحدة، ثم انشري كـ Web App.
 */

const SHEET = {
  SETTINGS: 'الإعدادات',
  LISTS: 'القوائم',
  VISITS: 'كشف الخروج',
  FILES: 'المرفقات'
};

const VISIT_HEADERS = ['الرقم', 'اسم المركز', 'نوع الزيارة', 'التاريخ', 'التاريخ الهجري', 'اليوم',
  'المديرة متغيبة', 'التوقيع', 'تُحسب يوم', 'وقت التسجيل'];
const FILE_HEADERS = ['الرقم', 'العنوان', 'اسم الملف', 'الرابط', 'وقت الرفع'];

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DRIVE_FOLDER_NAME = 'منظومة مشرفات - الملفات';

/* ============ الإعداد الأولي (شغّليه مرة واحدة) ============ */
function setup() {
  const ss = SpreadsheetApp.getActive();

  // الإعدادات
  const st = getOrCreate_(ss, SHEET.SETTINGS);
  if (st.getLastRow() === 0) {
    st.getRange(1, 1, 1, 2).setValues([['المفتاح', 'القيمة']]);
    st.getRange(2, 1, 1, 2).setValues([['كلمة مرور مشرفات', '1234']]);
  }
  styleHeader_(st, 2);
  st.setColumnWidth(1, 200); st.setColumnWidth(2, 200);

  // القوائم (المصدر للقوائم المنسدلة)
  const ls = getOrCreate_(ss, SHEET.LISTS);
  if (ls.getLastRow() === 0) {
    ls.getRange(1, 1, 1, 2).setValues([['أسماء المراكز', 'أنواع الزيارة']]);
    ls.getRange(2, 1, 2, 2).setValues([['مركز تجريبي 1', 'زيارة دورية'], ['مركز تجريبي 2', 'زيارة مفاجئة']]);
  }
  styleHeader_(ls, 2);
  ls.setColumnWidth(1, 220); ls.setColumnWidth(2, 220);

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

  folder_(); // ينشئ مجلد الدرايف
  Logger.log('تم الإعداد بنجاح ✅');
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
    if (!checkPw_(req.password)) {
      out = { ok: false, error: 'كلمة المرور غير صحيحة' };
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
    case 'deleteFile': return withLock_(() => deleteById_(SHEET.FILES, r.id, true));
    default: throw new Error('إجراء غير معروف');
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ============ كلمة المرور من الشيت ============ */
function norm_(s) {
  return String(s == null ? '' : s).trim()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}
function checkPw_(pw) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.SETTINGS);
  if (!sh) throw new Error('شغّلي setup() أولاً');
  const rows = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < rows.length; i++) {
    if (norm_(rows[i][0]) === 'كلمة مرور مشرفات') {
      const real = norm_(rows[i][1]);
      return real !== '' && real === norm_(pw);
    }
  }
  return false;
}

/* ============ القوائم ============ */
function getLists_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.LISTS);
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  const centers = [], types = [];
  rows.forEach(r => {
    if (String(r[0]).trim()) centers.push(String(r[0]).trim());
    if (String(r[1]).trim()) types.push(String(r[1]).trim());
  });
  return { centers: centers, types: types };
}

/* ============ كشف الخروج ============ */
function getVisits_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.VISITS);
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  return rows.filter(r => r[0]).map(r => ({
    id: r[0], center: r[1], type: r[2], date: r[3], hijri: r[4], day: r[5],
    absent: r[6] === 'نعم', signature: r[7], counted: r[8] === 'نعم', at: r[9]
  })).reverse();
}

function addVisit_(r) {
  const center = String(r.center || '').trim();
  const type = String(r.type || '').trim();
  const date = String(r.date || '').trim();
  const absent = r.absent === true;
  if (!center) throw new Error('اختاري اسم المركز');
  if (!type) throw new Error('اختاري نوع الزيارة');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('التاريخ غير صحيح');
  if (!absent && !r.signature) throw new Error('توقيع المديرة مطلوب، أو حدّدي «تمت زيارة المركز والمديرة متغيبة»');

  const lists = getLists_();
  if (lists.centers.indexOf(center) < 0) throw new Error('اسم المركز غير موجود في القائمة');
  if (lists.types.indexOf(type) < 0) throw new Error('نوع الزيارة غير موجود في القائمة');

  const p = date.split('-');
  const day = DAY_NAMES[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];

  let sigUrl = '';
  if (r.signature) {
    const b64 = String(r.signature).split(',')[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'توقيع-' + center + '-' + date + '.png');
    const f = folder_().createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    sigUrl = f.getUrl();
  }

  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.VISITS);
  const row = sh.getLastRow() + 1;
  const vals = [[
    Utilities.getUuid(), center, type, date, String(r.hijri || ''), day,
    absent ? 'نعم' : 'لا', sigUrl, 'نعم',
    Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm')
  ]];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, day: day };
}

/* ============ المرفقات ============ */
function getFiles_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.FILES);
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  return rows.filter(r => r[0]).map(r => ({
    id: r[0], title: r[1], name: r[2], url: r[3], at: r[4]
  })).reverse();
}

function addFile_(r) {
  const title = String(r.title || '').trim();
  if (!title) throw new Error('اكتبي عنوان المرفق');
  if (!r.data) throw new Error('اختاري ملفاً');
  const blob = Utilities.newBlob(Utilities.base64Decode(r.data), r.mime || 'application/octet-stream', r.name || 'ملف');
  const f = folder_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.FILES);
  sh.appendRow([
    Utilities.getUuid(), title, r.name || '', f.getUrl(),
    Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm')
  ]);
  return { ok: true };
}

/* ============ حذف صف بالرقم ============ */
function deleteById_(sheetName, id, trashFile) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = 1; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      if (trashFile) {
        const url = String(sh.getRange(i + 1, 4).getValue());
        const m = url.match(/[-\w]{25,}/);
        if (m) { try { DriveApp.getFileById(m[0]).setTrashed(true); } catch (e) {} }
      }
      sh.deleteRow(i + 1);
      return { ok: true };
    }
  }
  throw new Error('السجل غير موجود');
}
