/**
 * منظومة مشرفات مكتب إشراف الداخل — Code.gs
 * الصقيه في Apps Script المرتبط بقوقل شيت، ثم شغّلي setup() مرة واحدة، ثم انشري كـ Web App.
 */

// إن كان الـ Apps Script غير مرتبط بالشيت تلقائياً: ضعي هنا رقم الشيت (ID) من رابطه، وإلا اتركيه فارغاً
const SPREADSHEET_ID = '';
function ss_() { return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActive(); }

const SHEET = {
  USERS: 'المستخدمات',
  MANAGERS: 'مديرات الوحدات',
  LISTS: 'القوائم',
  VISITS: 'كشف الخروج',
  FILES: 'المرفقات',
  EVALS: 'استمارات التقييم',
  DRAFTS: 'المسودات',   // مسودات الاستمارات لكل مشرفة (تظهر من أي جهاز)، تُنشأ تلقائياً
  SIGS: 'التواقيع',   // نسخة مصغّرة من كل توقيع (للإكسل) + توقيع المشرفة المحفوظ، تُنشأ تلقائياً
  IDARI: 'نماذج الإشراف الإداري',   // نماذج وحدة الإشراف الإداري (تقرير الزيارة، برنامج مشرفة مقيمة، الاقتراحات والصعوبات)، تُنشأ تلقائياً
  SGH: 'تقارير تحفيظ الصغار',   // تقارير زيارة مشرفات وحدة تحفيظ الصغار، تُنشأ تلقائياً
  SGS: 'خلاصة التقارير التعليمية',
  MIN: 'محاضر الاجتماعات',   // محاضر الاجتماعات (الإشراف التربوي وتحفيظ الصغار) تُنشر للمعلمات، تُنشأ تلقائياً
  MINACK: 'اطلاع المحاضر',   // من اطّلعت على كل محضر ومتى
  FILEACK: 'اطلاع المرفقات',
  RPT: 'خلاصة التقارير',   // «خلاصة التقارير» في الإشراف التربوي (reports.js)، تُنشأ تلقائياً   // من اطّلعت على كل مرفق مشارك ومتى
  STF: 'إجراءات الموظفات',   // نماذج الإنذار والتعهد والملاحظات على موظفات المراكز (تحفيظ الصغار)، تُنشأ تلقائياً
  SGE: 'استمارات تحفيظ الصغار'   // استمارات تقييم الأداء الوظيفي لتحفيظ الصغار (7 استمارات)، تُنشأ تلقائياً   // خلاصة التقارير التعليمية – متابعة المشرفة للمعلمة (تحفيظ الصغار)، تُنشأ تلقائياً
};

const DEFAULT_UNIT = 'وحدة الإشراف التربوي';
const SGH_UNIT = 'وحدة تحفيظ الصغار';   // تُكتب بهذا النص في عمود «الوحدة» لمشرفات تحفيظ الصغار ومديرة وحدتهن
const IDARI_UNIT = 'وحدة الإشراف الإداري';   // تُكتب بهذا النص في عمود «الوحدة» لمشرفات الإشراف الإداري ومديرة وحدتهن   // وحدة السجلات القديمة والمستخدمات اللاتي لم تُكتب لهن وحدة
const ALL_UNITS = 'الكل';   // إذا كتبتِ «الكل» في وحدة مديرة الوحدات ترى كل الوحدات
const OWNER_HEADERS = ['المسجِّلة', 'الوحدة'];

const VISIT_HEADERS = ['الرقم', 'اسم المركز', 'نوع الزيارة', 'التاريخ', 'التاريخ الهجري', 'اليوم',
  'المديرة متغيبة', 'التوقيع', 'تُحسب يوم', 'وقت التسجيل', 'حالة الزيارة', 'المسجِّلة', 'الوحدة'];
// حالات الزيارة: الأولى تحتاج توقيع المديرة، والباقي بدون توقيع (الأربع الأولى تُحسب يوم حضور، والأخيرة يوم غياب)
const VISIT_STATUS = ['تمت الزيارة', 'تمت الزيارة والمديرة متغيبة', 'تمت الزيارة وتعذر التوثيق لتعليق الموقع أو الشبكة', 'تمت الزيارة قبل توفر موقع النظام', 'لم تتم الزيارة'];
const VISIT_NONE = VISIT_STATUS[4]; // لم تتم الزيارة: تُحسب يوم غياب ولا تحتاج نوع زيارة ولا توقيع
const VISIT_STATUS_COL = 11;
const FILE_HEADERS = ['الرقم', 'العنوان', 'اسم الملف', 'الرابط', 'وقت الرفع', 'المسجِّلة', 'الوحدة', 'المشاركة مع المعلمات'];
const EVAL_HEADERS = ['الرقم', 'اسم المركز', 'الفترة', 'اسم المعلمة', 'المؤهل', 'الفئة', 'اليوم', 'التاريخ',
  'عنوان الدرس', 'سنوات الخبرة', 'العدد الكلي', 'العدد الحاضر', 'رقم الزيارة', 'اسم المشرفة',
  'الدرجة الكلية', 'الدرجة الموزونة', 'التقدير', 'البنود', 'ملاحظات المشرفة', 'توصيات المشرفة', 'التوقيع', 'وقت التسجيل', 'نوع الاستمارة', 'بيانات إضافية', 'المسجِّلة', 'الوحدة'];
const EVAL_URL_COL = 21; // عمود التوقيع (رابط ملف في الدرايف)

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DRIVE_FOLDER_NAME = 'منظومة مشرفات - الملفات';
const LINK_MARK = 'رابط';
const LISTS_SGH_TYPES = 'أنواع الزيارة (تحفيظ الصغار)';   // العمود E في «القوائم»: إن تُرك فارغاً تُستخدم «أنواع الزيارة» العامة
const LISTS_IDARI_TYPES = 'أنواع الزيارة (الإشراف الإداري)';   // العمود D في «القوائم»: إن تُرك فارغاً تُستخدم «أنواع الزيارة» العامة // يُكتب في عمود «اسم الملف» للمرفقات من نوع رابط (لا يوجد ملف في الدرايف ليُحذف)

/* ============ الإعداد الأولي (شغّليه مرة واحدة) ============ */
function setup() {
  const ss = ss_();

  // المستخدمات: اسم المستخدم (هو نفسه الاسم الظاهر) + كلمة المرور + الوحدة
  const us = getOrCreate_(ss, SHEET.USERS);
  if (us.getLastRow() === 0) {
    us.getRange(1, 1, 1, 3).setValues([['اسم المستخدم', 'كلمة المرور', 'الوحدة']]);
    us.getRange(2, 1, 1, 3).setNumberFormat('@').setValues([['مشرفة1', '1234', DEFAULT_UNIT]]);
  }
  const uh = usersCols_(us.getRange(1, 1, 1, Math.max(us.getLastColumn(), 1)).getDisplayValues()[0]);
  if (uh.unit < 0) us.getRange(1, us.getLastColumn() + 1).setValue('الوحدة');   // ورقة قديمة بلا عمود الوحدة
  styleHeader_(us, us.getLastColumn());
  us.getRange('A2:B500').setNumberFormat('@');
  us.setColumnWidths(1, us.getLastColumn(), 220);

  // مديرات الوحدات (دخول مستقل لصفحة «إدارة الوحدات»: الاسم + كلمة المرور + الوحدة)
  const ms = getOrCreate_(ss, SHEET.MANAGERS);
  if (ms.getLastRow() === 0) {
    ms.getRange(1, 1, 1, 3).setValues([['الاسم', 'كلمة المرور', 'الوحدة']]);
    ms.getRange(2, 1, 1, 3).setNumberFormat('@').setValues([['مديرة الوحدة', '1234', DEFAULT_UNIT]]);
  }
  [['الاسم', 1], ['كلمة المرور', 2], ['الوحدة', 3]].forEach(h => { if (!ms.getRange(1, h[1]).getValue()) ms.getRange(1, h[1]).setValue(h[0]); });
  styleHeader_(ms, 3);
  ms.getRange('A2:C200').setNumberFormat('@');
  ms.setColumnWidth(1, 200); ms.setColumnWidth(2, 200); ms.setColumnWidth(3, 240);

  // القوائم (المصدر للقوائم المنسدلة)
  const ls = getOrCreate_(ss, SHEET.LISTS);
  if (ls.getLastRow() === 0) {
    ls.getRange(1, 1, 1, 2).setValues([['أسماء المراكز', 'أنواع الزيارة']]);
    ls.getRange(2, 1, 2, 2).setValues([['مركز تجريبي 1', 'زيارة دورية'], ['مركز تجريبي 2', 'زيارة مفاجئة']]);
  }
  if (!ls.getRange(1, 3).getValue()) ls.getRange(1, 3).setValue('أسماء المعلمات');
  if (!ls.getRange(1, 4).getValue()) ls.getRange(1, 4).setValue(LISTS_IDARI_TYPES);
  if (!ls.getRange(1, 5).getValue()) ls.getRange(1, 5).setValue(LISTS_SGH_TYPES);
  styleHeader_(ls, 5);
  ls.setColumnWidth(1, 220); ls.setColumnWidth(2, 220); ls.setColumnWidth(3, 220); ls.setColumnWidth(4, 260); ls.setColumnWidth(5, 260);

  // كشف الخروج
  const vs = getOrCreate_(ss, SHEET.VISITS);
  ensureHeaders_(vs, VISIT_HEADERS);
  ensureExtraHeaders_(vs, VISIT_HEADERS);
  styleHeader_(vs, VISIT_HEADERS.length);
  vs.getRange(2, 4, 1999, 2).setNumberFormat('@'); // التاريخ والهجري كنص
  const dvCenter = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ls.getRange('A2:A500'), true).setAllowInvalid(true).build();
  const dvType = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ls.getRange('B2:B500'), true).setAllowInvalid(true).build();
  vs.getRange('B2:B2000').setDataValidation(dvCenter);
  vs.getRange('C2:C2000').setDataValidation(dvType);
  vs.setColumnWidths(1, VISIT_HEADERS.length, 140);

  // المرفقات
  const fs = getOrCreate_(ss, SHEET.FILES);
  ensureHeaders_(fs, FILE_HEADERS);
  ensureExtraHeaders_(fs, FILE_HEADERS);
  styleHeader_(fs, FILE_HEADERS.length);
  fs.setColumnWidths(1, FILE_HEADERS.length, 160);

  // استمارات التقييم
  const es = getOrCreate_(ss, SHEET.EVALS);
  ensureHeaders_(es, EVAL_HEADERS);
  // ورقة قديمة قبل إضافة عمود النوع: نكمّل ترويسته فقط
  if (es.getLastRow() > 0) es.getRange(1, 1, 1, EVAL_HEADERS.length).setValues([EVAL_HEADERS]);
  styleHeader_(es, EVAL_HEADERS.length);
  es.setColumnWidths(1, EVAL_HEADERS.length, 140);

  idariSheet_(); // نماذج الإشراف الإداري
  sghSheet_();   // تقارير تحفيظ الصغار
  sgsSheet_();   // خلاصة التقارير التعليمية
  sgeSheet_();   // استمارات تحفيظ الصغار
  folder_(); // ينشئ مجلد الدرايف
  Logger.log('تم الإعداد بنجاح');
}

function getOrCreate_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function ensureHeaders_(sh, headers) {
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}
// يكمّل ترويسات الأعمدة الجديدة (المسجِّلة، الوحدة) في ورقة قديمة دون الحاجة لتشغيل setup
function ensureExtraHeaders_(sh, headers) {
  const n = headers.length;
  const cur = sh.getRange(1, 1, 1, n).getValues()[0];
  let changed = false;
  for (let i = 0; i < n; i++) if (!cur[i]) { cur[i] = headers[i]; changed = true; }
  if (changed) { sh.getRange(1, 1, 1, n).setValues([cur]); styleHeader_(sh, n); }
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
    if (req.action === 'listNames') {   // قائمة الأسماء لشاشة الدخول (أسماء فقط، بلا كلمات مرور)
      out = { ok: true, data: listNames_(req.kind, req.unit, req.exclude) };
    } else if (req.action === 'getManage' || (req.action === 'getSigs' && req.mgr)) {   // صفحة إدارة الوحدات لها دخول مستقل (ورقة «مديرات الوحدات»)
      const mgr = mgrAuth_(req.username, req.password);
      if (!mgr) out = { ok: false, error: 'الاسم أو كلمة المرور غير صحيحة' };
      else if (req.action === 'getSigs') out = { ok: true, data: getSigs_(req.items) };   // توقيعات الاستمارات لملف الإكسل
      else out = getManage_(mgr);
    } else if (String(req.action || '').indexOf('c_') === 0) {   // أيقونة «المراكز»: دخول باسم المركز وكلمة مروره
      out = centerRoute_(req);
    } else if (String(req.action || '').indexOf('t_') === 0) {   // أيقونة «المعلمات»: دخول برقم الجوال وكلمة مرور بوابة المعلمات
      out = teacherRoute_(req);
    } else if (!checkAuth_(req.username, req.password)) {
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
    case 'login': return { ok: true, profile: profileOf_(r.username) };
    case 'getLists': return { ok: true, data: getLists_(), profile: profileOf_(r.username) };
    case 'getVisits': return { ok: true, data: visitsFor_(r) };
    case 'addVisit': return withLock_(() => addVisit_(r));
    case 'deleteVisit': return withLock_(() => { const o = deleteById_(SHEET.VISITS, r.id); sigDel_(r.id); return o; });
    case 'getFiles': return { ok: true, data: getFilesFor_(r) };
    case 'shareFile': return withLock_(() => shareFile_(r));
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
    case 'getMyCenters': return { ok: true, data: myCentersGet_(r.username) };
    case 'saveMyCenters': return withLock_(() => myCentersSave_(r));
    case 'getMySig': return { ok: true, data: sigGet_('u:' + norm_(r.username).toLowerCase()) };
    case 'saveMySig': return withLock_(() => { sigPut_('u:' + norm_(r.username).toLowerCase(), r.data); return { ok: true }; });
    case 'deleteMySig': return withLock_(() => { sigDel_('u:' + norm_(r.username).toLowerCase()); return { ok: true }; });
    case 'getDirectors': return getDirectors_(r);
    case 'getIdari': return { ok: true, data: getIdariFor_(r.username) };
    case 'saveIdari': return withLock_(() => saveIdari_(r));
    case 'deleteIdari': return withLock_(() => deleteIdari_(r));
    case 'getSgh': return { ok: true, data: getSghFor_(r.username) };
    case 'saveSgh': return withLock_(() => saveSgh_(r));
    case 'deleteSgh': return withLock_(() => deleteSgh_(r));
    case 'lookupTeacher': { const t = teacherByPhone_(r.phone); return { ok: true, found: !!t, name: t ? t.name : '', id: t ? t.id : '', data: t ? { id: t.id, name: t.name } : null }; }
    case 'getMinutes': return { ok: true, data: getMinutesFor_(r.username) };
    case 'saveMinute': return withLock_(() => saveMinute_(r));
    case 'deleteMinute': return withLock_(() => deleteMinute_(r));
    case 'teacherPhone': return { ok: true, phone: teacherPhoneById_(r.tid) };   // جوال المعلمة لتنبيهها في واتساب بعد إرسال التقرير
    case 'teacherDir': return { ok: true, data: certRows_(false).map(t => ({ id: t.id, name: t.name })) };
    case 'getReports': return { ok: true, data: getReportsFor_(r.username) };
    case 'getReport': return { ok: true, data: getReport_(r) };
    case 'saveReport': return withLock_(() => saveReport_(r));
    case 'deleteReport': return withLock_(() => deleteReport_(r));
    case 'getSge': return { ok: true, data: getSgeFor_(r.username) };
    case 'saveSge': return withLock_(() => saveSge_(r));
    case 'deleteSge': return withLock_(() => deleteSge_(r));
    case 'getSgs': return { ok: true, data: getSgsFor_(r.username) };
    case 'saveSgs': return withLock_(() => saveSgs_(r));
    case 'deleteSgs': return withLock_(() => deleteSgs_(r));
    case 'getStf': return { ok: true, data: getStfFor_(r.username) };   // إجراءات الموظفات (تحفيظ الصغار)
    case 'saveStf': return withLock_(() => saveStf_(r));
    case 'deleteStf': return withLock_(() => deleteStf_(r));
    case 'scCenters': return { ok: true, data: outCenters_() };
    case 'getHasr': { const u = norm_(r.username).toLowerCase(); return { ok: true, data: hasrFor_(x => x.sup === u) }; }   // حصر الغياب الوارد من المراكز
    case 'hasrSeen': return withLock_(() => hasrSeen_(r));
    case 'hasrSig': { const u = norm_(r.username).toLowerCase(), x = hasrFor_(y => y.id === String(r.id || '') && y.sup === u)[0]; if (!x) throw new Error('غير موجود'); return { ok: true, data: sigGet_(x.id + '|mgr') }; }   // «📤 إرسال للمركز»
    case 'sendCenter': return withLock_(() => sendCenter_(r));
    case 'getSent': return { ok: true, data: getSent_(r) };
    case 'sentFile': return outFile_(sentOwn_(r));
    case 'sentSig': { const x = sentOwn_(r); return { ok: true, data: sigGet_(x.id + '|ctr') }; }
    case 'unsend': return withLock_(() => unsend_(r));
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
// أعمدة ورقة المستخدمات تُعرف من عناوينها: اسم المستخدم | كلمة المرور | الوحدة (وعمود «الاسم» القديم اختياري إن بقي)
function usersCols_(head) {
  const h = head.map(x => norm_(x));
  const at = (name, def) => { const i = h.indexOf(name); return i > -1 ? i : def; };
  return { user: at('اسم المستخدم', 0), pw: at('كلمة المرور', 1), name: at('الاسم', -1), unit: at('الوحدة', -1) };
}
// كل صف: [اسم الدخول بحروف صغيرة, كلمة المرور, الاسم الظاهر, الوحدة, اسم الدخول كما كُتب]
function usersRows_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const hit = cache.get('users_v3');
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  }
  const sh = ss_().getSheetByName(SHEET.USERS);
  if (!sh) throw new Error('شغّلي setup() أولاً');
  const all = sh.getDataRange().getDisplayValues();
  const c = usersCols_(all[0] || []);
  const rows = all.slice(1).filter(r => norm_(r[c.user])).map(r => {
    const u = norm_(r[c.user]);
    return [u.toLowerCase(), norm_(r[c.pw]), (c.name > -1 && norm_(r[c.name])) || u, (c.unit > -1 && norm_(r[c.unit])) || DEFAULT_UNIT, u];
  });
  try { cache.put('users_v3', JSON.stringify(rows), 120); } catch (e) {}
  return rows;
}
function checkAuth_(user, pw) {
  const u = norm_(user).toLowerCase(), p = norm_(pw);
  if (!u || !p) return false;
  const has = rows => rows.some(r => r[0] === u && r[1] === p);
  return has(usersRows_(false)) || has(usersRows_(true));
}

function profileOf_(user) {
  const u = norm_(user).toLowerCase();
  let row = usersRows_(false).filter(x => x[0] === u)[0] || usersRows_(true).filter(x => x[0] === u)[0] || [];
  return { username: u, name: row[2] || norm_(user), unit: row[3] || DEFAULT_UNIT };
}

/* ============ القوائم ============ */
function getLists_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const hit = cache.get('lists_v3');
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  }
  const sh = ss_().getSheetByName(SHEET.LISTS);
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  const centers = [], types = [], teachers = [], typesIdari = [], typesSgh = [];
  rows.forEach(r => {
    if (String(r[0]).trim()) centers.push(String(r[0]).trim());
    if (String(r[1]).trim()) types.push(String(r[1]).trim());
    if (r[2] != null && String(r[2]).trim()) teachers.push(String(r[2]).trim());
    if (r[3] != null && String(r[3]).trim()) typesIdari.push(String(r[3]).trim());
    if (r[4] != null && String(r[4]).trim()) typesSgh.push(String(r[4]).trim());
  });
  // أسماء المعلمات للقائمة المنسدلة: من «القوائم» + سجل المعلمات (شيت الشهادات)
  try { certRows_(false).forEach(t => { if (teachers.indexOf(t.name) < 0) teachers.push(t.name); }); } catch (e) {}
  teachers.sort((a, b) => a.localeCompare(b, 'ar'));
  const out = { centers: centers, types: types, teachers: teachers, typesIdari: typesIdari, typesSgh: typesSgh };
  try { cache.put('lists_v3', JSON.stringify(out), 120); } catch (e) {}
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
      absent: absent, status: status, signature: r[7], counted: r[8] === 'نعم', at: r[9], owner: r[11] || '', unit: r[12] || '' };
  }).reverse();
}

const VT_FIXED = ['توجيهية', 'تقييمية'];
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
  const meU = profileOf_(r.username).unit;
  const typesOf = l => (meU === IDARI_UNIT && l.typesIdari && l.typesIdari.length) ? l.typesIdari
    : (meU === SGH_UNIT && l.typesSgh && l.typesSgh.length) ? l.typesSgh : l.types;
  // كشف الخروج في الإشراف الإداري وتحفيظ الصغار: أنواع ثابتة (توجيهية، تقييمية، أخرى: نص تكتبه المشرفة)
  const fixedT = meU === IDARI_UNIT || meU === SGH_UNIT;
  const okFixed = t => VT_FIXED.indexOf(t) > -1 || /^أخرى(\s*:\s*.{1,80})?$/.test(t);
  const badType = l => typeList.some(t => fixedT ? !okFixed(t) : typesOf(l).indexOf(t) < 0);
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
  ensureExtraHeaders_(sh, VISIT_HEADERS);
  const me = profileOf_(r.username);
  const id = Utilities.getUuid();
  const row = sh.getLastRow() + 1;
  const vals = [[
    id, center, type, date, String(r.hijri || ''), day,
    status === VISIT_STATUS[1] ? 'نعم' : 'لا', sigUrl, notVisited ? 'لا' : 'نعم',
    Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'), status, me.username, me.unit
  ]];
  const rg = sh.getRange(row, 1, 1, vals[0].length);
  rg.clearDataValidations(); // التحقق يمنع أنواع الزيارة المتعددة (مفصولة بـ «،») فنلغيه، والتحقق يتم داخل الكود أعلاه
  rg.setNumberFormat('@').setValues(vals);
  if (needSig && sigUrl) sigPut_(id, r.signature);
  return { ok: true, id: id, day: day, signature: sigUrl };
}

// كشف الخروج لكل مشرفة: زيارات وحدتها فقط، و mine = زياراتها هي فقط (صفحة الإشراف الإداري)
function visitsFor_(r) {
  const me = profileOf_(r.username);
  return getVisits_().filter(v => (v.unit || DEFAULT_UNIT) === me.unit && (!r.mine || v.owner === me.username));
}

/* ============ المرفقات ============ */
function getFiles_() {
  const sh = ss_().getSheetByName(SHEET.FILES);
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  return rows.filter(r => r[0]).map(r => {
    let target = null;
    try { target = r[7] ? JSON.parse(r[7]) : null; } catch (e) {}
    return { id: r[0], title: r[1], name: r[2], url: r[3], at: r[4], owner: r[5] || '', unit: r[6] || '', target: target };
  }).reverse();
}
// مرفقات وحدة المشرفة فقط (مع من اطّلعت من المعلمات على المرفقات المشاركة)
function getFilesFor_(r) {
  const me = profileOf_(r.username), acks = ackRows_(SHEET.FILEACK);
  return getFiles_().filter(f => (f.unit || DEFAULT_UNIT) === me.unit).map(f => Object.assign(f, { acks: acks.filter(a => a.mid === f.id) }));
}
// مشاركة مرفق مع المعلمات (الكل أو محددات) أو إلغاء المشاركة
function shareFile_(r) {
  const me = profileOf_(r.username), id = String(r.id || '');
  if (me.unit === IDARI_UNIT && r.target) throw new Error('مشاركة المرفقات مع المعلمات غير متاحة في ' + IDARI_UNIT);
  const sh = ss_().getSheetByName(SHEET.FILES);
  ensureExtraHeaders_(sh, FILE_HEADERS);
  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 7).getValues() : [];
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) !== id) continue;
    if ((String(rows[i][6]) || DEFAULT_UNIT) !== me.unit) throw new Error('هذا المرفق ليس من وحدتكِ');
    const tg = r.target && typeof r.target === 'object' ? r.target : null;
    let val = '';
    if (tg && (tg.all || (Array.isArray(tg.ids) && tg.ids.length))) {
      const list = a => (Array.isArray(a) ? a : []).map(x => String(x).trim().slice(0, 120)).filter(Boolean).slice(0, 400);
      val = JSON.stringify(tg.all ? { all: true } : { all: false, ids: list(tg.ids), names: list(tg.names) });
      if (val.length > 45000) throw new Error('عدد المعلمات كبير جداً، اختاري «كل المعلمات»');
    }
    sh.getRange(i + 2, 8).setNumberFormat('@').setValue(val);
    return { ok: true };
  }
  throw new Error('المرفق غير موجود');
}

function addFile_(r) {
  const title = String(r.title || '').trim();
  const me = profileOf_(r.username);
  ensureExtraHeaders_(ss_().getSheetByName(SHEET.FILES), FILE_HEADERS);
  if (!title) throw new Error('اكتبي عنوان المرفق');
  const link = String(r.url || '').trim();
  if (link) {   // إرفاق رابط بدل ملف
    if (link.length > 2000 || !/^https?:\/\/[^\s]+$/i.test(link)) throw new Error('الرابط غير صحيح، يجب أن يبدأ بـ http أو https');
    const lid = Utilities.getUuid();
    ss_().getSheetByName(SHEET.FILES).appendRow([
      lid, title, LINK_MARK, link,
      Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'), me.username, me.unit
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
    Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'), me.username, me.unit
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
    signature: r[20], at: r[21], formType: evalTypeKey_(r[22]), extra: r[23] || '', owner: r[24] || '', unit: r[25] || ''
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

function evalRow_(r, c, id, sigUrl, at, typeLabel, owner, unit) {
  const s = c.s;
  return [
    id, c.center, c.period, c.teacher, s(r.qual), s(r.cat), s(r.day), c.date,
    s(r.lesson), s(r.years), s(r.total), s(r.present), s(r.visitNo), s(r.supervisor),
    s(r.raw), s(r.weighted), s(r.grade), JSON.stringify(c.items), s(r.notes), s(r.recs), sigUrl,
    at, typeLabel, s(r.extra).slice(0, 2000), owner || '', unit || ''
  ];
}

function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'); }

function addEval_(r) {
  const c = evalCommon_(r);
  const sigUrl = evalSig_(r, c.teacher, c.date);
  const sh = ss_().getSheetByName(SHEET.EVALS);
  if (!sh) throw new Error('شغّلي setup() مرة أخرى لإنشاء ورقة الاستمارات');
  const row = sh.getLastRow() + 1;
  ensureExtraHeaders_(sh, EVAL_HEADERS);
  const me = profileOf_(r.username);
  const newId = Utilities.getUuid();
  const vals = [evalRow_(r, c, newId, sigUrl, nowStr_(), evalTypeLabel_(c.s(r.formType)), me.username, me.unit)];
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
  const vals = [evalRow_(r, c, id, sigUrl, String(old[21] || nowStr_()), String(old[22] || evalTypeLabel_(c.s(r.formType))), String(old[24] || ''), String(old[25] || ''))];
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


/* شغّليها مرة واحدة من Apps Script لإزالة قيود التحقق القديمة من ورقة «كشف الخروج» */
function fixVisitValidation() {
  const sh = ss_().getSheetByName(SHEET.VISITS);
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), VISIT_HEADERS.length).clearDataValidations();
  Logger.log('تمت إزالة قيود التحقق من كشف الخروج');
}


/* ============ إدارة الوحدات (دخول مستقل لمديرات الوحدات) ============ */
// ورقة «مديرات الوحدات»: الاسم | كلمة المرور | الوحدة. كل مديرة ترى مشرفات وحدتها وما سجّلنه. وحدة «الكل» ترى كل الوحدات.
// أسماء القائمة المنسدلة في شاشة الدخول: kind = 'users' (المشرفات) أو 'managers' (مديرات الوحدات)
// unit = أسماء هذه الوحدة فقط، exclude = إخفاء أسماء هذه الوحدة (للمشرفات فقط)
function listNames_(kind, unit, exclude) {
  const isM = kind === 'managers';
  const seen = {}, out = [];
  unit = norm_(unit);
  const ex = String(exclude || '').split('|').map(norm_).filter(Boolean);   // أكثر من وحدة مفصولة بـ |
  if (!isM) {   // المشرفات: اسم المستخدم هو نفسه الاسم الظاهر
    usersRows_(true).forEach(r => {
      if (seen[r[0]] || (unit && r[3] !== unit) || ex.indexOf(r[3]) > -1) return;
      seen[r[0]] = 1;
      out.push({ u: r[4], n: r[2] });
    });
    return out;
  }
  const sh = ss_().getSheetByName(SHEET.MANAGERS);
  if (!sh) throw new Error('شغّلي setup() أولاً');
  sh.getDataRange().getDisplayValues().slice(1).forEach(r => {
    const u = norm_(r[0]);
    if (!u || seen[u.toLowerCase()]) return;
    if (!isM) {
      const un = norm_(r[3]) || DEFAULT_UNIT;
      if ((unit && un !== unit) || ex.indexOf(un) > -1) return;
    }
    seen[u.toLowerCase()] = 1;
    out.push({ u: u, n: (!isM && norm_(r[2])) || u });   // القيمة = اسم الدخول، والنص = الاسم الظاهر إن وُجد
  });
  return out;
}

function mgrAuth_(name, pw) {
  const n = norm_(name).toLowerCase(), p = norm_(pw);
  if (!n || !p) return null;
  const sh = ss_().getSheetByName(SHEET.MANAGERS);
  if (!sh) throw new Error('شغّلي setup() أولاً');
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  for (let i = 0; i < rows.length; i++) {
    if (norm_(rows[i][0]).toLowerCase() === n && norm_(rows[i][1]) === p) {
      return { name: norm_(rows[i][0]), unit: norm_(rows[i][2]) || DEFAULT_UNIT };
    }
  }
  return null;
}

function getManage_(me) {
  const all = [ALL_UNITS, 'جميع الوحدات', 'كل الوحدات'].indexOf(me.unit) > -1;   // مديرة عامة ترى كل الوحدات
  const U = u => u || DEFAULT_UNIT;
  const inScope = u => all || U(u) === me.unit;

  const users = usersRows_(true)
    .map(x => ({ username: x[0], name: x[2], unit: U(x[3]) }))
    .filter(u => inScope(u.unit));

  const visits = getVisits_().filter(v => inScope(v.unit)).map(v => ({
    id: v.id, owner: v.owner, unit: U(v.unit), center: v.center, type: v.type, date: v.date, day: v.day,
    status: v.status, counted: v.counted, signature: v.signature, at: v.at }));
  // الاستمارات كاملة (البنود والدرجات والملاحظات) ليتمكن الموقع من عرضها وتصديرها إكسل كما عند المشرفة
  const evals = getEvalsCached_().filter(e => inScope(e.unit)).map(e => Object.assign({}, e, { unit: U(e.unit) }));
  const fAcks = ackRows_(SHEET.FILEACK);
  const files = getFiles_().filter(f => inScope(f.unit)).map(f => ({
    id: f.id, owner: f.owner, unit: U(f.unit), title: f.title, name: f.name, url: f.url, at: f.at, target: f.target, acks: fAcks.filter(a => a.mid === f.id) }));
  const mAcks = minAcks_();
  const minutes = getMinutes_().filter(m => inScope(m.unit)).map(m => Object.assign({}, m, { unit: U(m.unit), acks: mAcks.filter(a => a.mid === m.id) }));
  const idari = getIdari_().filter(x => inScope(x.unit)).map(x => Object.assign({}, x, { unit: U(x.unit) }));
  const sgh = getSgh_().concat(getSgs_(), getSge_(), getStf_()).filter(x => inScope(x.unit)).map(x => Object.assign({}, x, { unit: U(x.unit) }));

  const seen = {};
  users.concat(visits, evals, files, idari, sgh, minutes).forEach(x => { seen[x.unit] = 1; });
  if (!all) seen[me.unit] = 1;
  const reports = reportsList_().filter(x => inScope(x.unit)).map(x => Object.assign(x, { unit: U(x.unit) }));
  return { ok: true, me: me, units: Object.keys(seen).sort(), users: users, visits: visits, evals: evals, files: files, idari: idari, sgh: sgh, minutes: minutes, reports: reports };
}


/* ============ نماذج وحدة الإشراف الإداري ============ */
// الأنواع: visit = تقرير زيارة المشرفة، program = تخطيط وتنفيذ ونتائج لبرنامج مشرفة مقيمة، suggest = الاقتراحات والمرئيات – الصعوبات،
// monthly = استمارة المتابعة الإدارية الشهرية (اختيارات البنود وأسماء المنسوبات في عمود «البيانات»)
const IDARI_TYPES = { visit: 'تقرير زيارة المشرفة', program: 'برنامج مشرفة مقيمة', suggest: 'الاقتراحات والصعوبات', monthly: 'استمارة المتابعة الإدارية الشهرية',
  mgreval: 'استمارة تقييم المديرة', halls: 'حصر القاعات في المراكز' };
const IDARI_HEADERS = ['الرقم', 'النموذج', 'اسم المركز', 'الفصل الدراسي', 'العام', 'الفترة', 'التاريخ', 'اليوم', 'رقم الزيارة',
  'اسم المشرفة', 'اسم المديرة', 'البيانات', 'وقت التسجيل', 'المسجِّلة', 'الوحدة'];
const IDARI_SIGS = ['sup', 'mgr', 'ack'];   // توقيع المشرفة، توقيع المديرة، توقيع بالعلم (تُحفظ في ورقة «التواقيع» بالمعرّف: الرقم|النوع)

function idariSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.IDARI);
  if (!sh) {
    sh = ss.insertSheet(SHEET.IDARI);
    sh.getRange(1, 1, 1, IDARI_HEADERS.length).setValues([IDARI_HEADERS]);
    styleHeader_(sh, IDARI_HEADERS.length);
    sh.setColumnWidths(1, IDARI_HEADERS.length, 150);
    sh.setColumnWidth(12, 320);
    const ls = ss.getSheetByName(SHEET.LISTS);   // عمود أنواع زيارة الإشراف الإداري في «القوائم»
    if (ls && !ls.getRange(1, 4).getValue()) { ls.getRange(1, 4).setValue(LISTS_IDARI_TYPES); styleHeader_(ls, 4); ls.setColumnWidth(4, 260); }
  }
  return sh;
}

function getIdari_() {
  const sh = ss_().getSheetByName(SHEET.IDARI);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, IDARI_HEADERS.length).getDisplayValues();
  return rows.filter(r => r[0]).map(r => {
    let data = {};
    try { data = JSON.parse(r[11] || '{}'); } catch (e) {}
    return { id: r[0], kind: idariKey_(r[1]), center: r[2], sem: r[3], year: r[4], period: r[5], date: r[6], day: r[7],
      visitNo: r[8], supName: r[9], mgrName: r[10], data: data, at: r[12], owner: r[13] || '', unit: r[14] || '' };
  }).reverse();
}
function getIdariFor_(username) {
  const u = norm_(username).toLowerCase();
  return getIdari_().filter(x => x.owner === u);
}
function idariKey_(label) {
  for (const k in IDARI_TYPES) if (IDARI_TYPES[k] === label) return k;
  return '';
}

function saveIdari_(r) {
  const s = v => String(v == null ? '' : v).trim().slice(0, 3000);
  const kind = s(r.kind);
  if (!IDARI_TYPES[kind]) throw new Error('نوع النموذج غير معروف');
  const me = profileOf_(r.username);
  if (me.unit !== IDARI_UNIT) throw new Error('هذا الحساب ليس من ' + IDARI_UNIT);
  const date = s(r.date);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('التاريخ غير صحيح');
  const center = s(r.center);
  if (kind !== 'suggest' && !center) throw new Error('اختاري اسم المركز');
  if (center) {
    let lists = getLists_(false);
    if (lists.centers.indexOf(center) < 0) lists = getLists_(true);
    if (lists.centers.indexOf(center) < 0) throw new Error('اسم المركز غير موجود في القائمة');
  }
  // البيانات: صفوف الجدول وما شابه (نصوص فقط)
  const d = r.data && typeof r.data === 'object' ? r.data : {};
  const clean = v => Array.isArray(v) ? v.slice(0, 60).map(clean) : (v && typeof v === 'object') ? Object.keys(v).slice(0, 40).reduce((o, k) => { o[k] = clean(v[k]); return o; }, {}) : s(v);
  const data = clean(d);
  const sigs = r.sigs && typeof r.sigs === 'object' ? r.sigs : {};   // { sup|mgr|ack: dataURL | 'keep' | '' }
  let day = '';
  if (date) { const p = date.split('-'); day = DAY_NAMES[new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; }

  const sh = idariSheet_();
  let id = s(r.id), row = 0, old = null;
  if (id) {
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { row = i + 2; break; }
    }
    if (!row) throw new Error('السجل غير موجود');
    old = sh.getRange(row, 1, 1, IDARI_HEADERS.length).getDisplayValues()[0];
    if (String(old[13]) !== me.username) throw new Error('لا يمكن تعديل نموذج سجّلته مشرفة أخرى');
  } else {
    id = Utilities.getUuid();
    row = sh.getLastRow() + 1;
  }
  let oldData = {};
  if (old) { try { oldData = JSON.parse(old[11] || '{}'); } catch (e) {} }
  const has = {};
  IDARI_SIGS.forEach(k => {
    const v = String(sigs[k] || '');
    if (k === 'mgr' && oldData.mgrAt && v.indexOf('data:image/') !== 0) { has.mgr = '1'; data.mgrAt = oldData.mgrAt; return; }   // وقّعت المديرة من حساب المركز: يبقى توقيعها
    if (v === 'keep') { if (oldData.sigs && oldData.sigs[k]) has[k] = '1'; return; }
    if (v.indexOf('data:image/') === 0) { sigPut_(id + '|' + k, v); has[k] = '1'; }
    else if (old) sigDel_(id + '|' + k);
  });
  data.sigs = has;
  // النماذج الجديدة تصل للمديرة بزر «📤 إرسال للمديرة» فقط (اطلاع أو اطلاع وتوقيع)؛ القديمة تبقى ظاهرة في صفحة المركز كما كانت
  data.viaSend = old ? String(oldData.viaSend || '') : '1';
  const json = JSON.stringify(data);
  if (json.length > 45000) throw new Error('النموذج طويل جداً، اختصري النصوص');

  const vals = [[id, IDARI_TYPES[kind], center, s(r.sem), s(r.year), s(r.period), date, day, s(r.visitNo),
    s(r.supName), s(r.mgrName), json, old ? String(old[12] || nowStr_()) : nowStr_(), me.username, me.unit]];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, id: id, day: day, sigs: has };
}

function deleteIdari_(r) {
  const id = String(r.id || '');
  const sh = ss_().getSheetByName(SHEET.IDARI);
  if (!sh || !id) throw new Error('السجل غير موجود');
  const me = profileOf_(r.username);
  const last = sh.getLastRow();
  if (last > 1) {
    const rows = sh.getRange(2, 1, last - 1, 14).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) !== id) continue;
      if (String(rows[i][13]) !== me.username) throw new Error('لا يمكن حذف نموذج سجّلته مشرفة أخرى');
      sh.deleteRow(i + 2);
      IDARI_SIGS.forEach(k => sigDel_(id + '|' + k));
      return { ok: true };
    }
  }
  throw new Error('السجل غير موجود');
}


/* ============ أرقام مديرات المراكز (لتقرير زيارة الإشراف الإداري) ============
   ورقة «أرقام المديرات» في هذا الشيت، وتُنشأ تلقائياً عند أول طلب.
   الأعمدة: اسم المركز | الفترة | اسم المديرة | الجوال
   (إذا تُركت خلية «اسم المركز» فارغة فهي تابعة للمركز الذي في الصف السابق)
   لا تُرسَل الأرقام إلا لحسابات وحدة الإشراف الإداري. */
const DIRECTORS_SHEET = 'أرقام المديرات';

function saPhone_(v) {
  let d = String(v == null ? '' : v).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\.0+$/, '').replace(/\D/g, '');
  if (d.indexOf('00966') === 0) d = d.slice(5);
  else if (d.indexOf('966') === 0) d = d.slice(3);
  if (d.indexOf('0') === 0) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? '966' + d : '';
}

function getDirectors_(r) {
  const me = profileOf_(r.username);
  if (me.unit !== IDARI_UNIT && me.unit !== SGH_UNIT) return { ok: true, data: [] };   // أسماء المديرات للإشراف الإداري وتحفيظ الصغار
  const ss = ss_();
  let sh = ss.getSheetByName(DIRECTORS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(DIRECTORS_SHEET);
    sh.getRange(1, 1, 1, 4).setValues([['اسم المركز', 'الفترة', 'اسم المديرة', 'الجوال']]);
    styleHeader_(sh, 4);
    sh.setRightToLeft(true);
    return { ok: true, data: [] };
  }
  const v = sh.getDataRange().getDisplayValues();
  if (v.length < 2) return { ok: true, data: [] };
  const h = v[0].map(x => String(x).trim());
  const col = names => { for (let i = 0; i < names.length; i++) { const k = h.indexOf(names[i]); if (k > -1) return k; } return -1; };
  const cC = col(['اسم المركز', 'المركز']), cP = col(['الفترة']), cN = col(['اسم المديرة', 'المديرة']), cT = col(['الجوال', 'رقم الجوال']);
  if (cC < 0 || cT < 0) throw new Error('ورقة «' + DIRECTORS_SHEET + '» ينقصها عمود «اسم المركز» أو «الجوال»');
  const out = [];
  let last = '';
  for (let i = 1; i < v.length; i++) {
    const c = String(v[i][cC] || '').trim();
    if (c) last = c;
    if (!last) continue;
    const period = cP < 0 ? '' : String(v[i][cP] || '').trim();
    const name = cN < 0 ? '' : String(v[i][cN] || '').trim();
    const phone = saPhone_(v[i][cT]);
    if (!name && !phone) continue;
    out.push({ center: last, period: period, evening: /عصر|مساء|مسائ/.test(period), name: name, phone: phone });
  }
  return { ok: true, data: out };
}


/* ============ وحدة تحفيظ الصغار: تقرير زيارة مشرفة تحفيظ صغار ============
   ورقة «تقارير تحفيظ الصغار» تُنشأ تلقائياً. التواقيع في ورقة «التواقيع» بالمعرّف: الرقم|sup (المشرفة) و الرقم|tch (المعلمة بالاطلاع) */
const SGH_HEADERS = ['الرقم', 'اسم المعلمة', 'اسم المركز', 'الفترة', 'رقم الزيارة', 'اليوم', 'التاريخ الهجري', 'التاريخ',
  'موضوع الدرس', 'توصيات عامة', 'اسم المشرفة', 'البيانات', 'وقت التسجيل', 'المسجِّلة', 'الوحدة'];
const SGH_SIGS = ['sup', 'tch'];

function sghSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.SGH);
  if (!sh) {
    sh = ss.insertSheet(SHEET.SGH);
    sh.getRange(1, 1, 1, SGH_HEADERS.length).setValues([SGH_HEADERS]);
    styleHeader_(sh, SGH_HEADERS.length);
    sh.setColumnWidths(1, SGH_HEADERS.length, 150);
    sh.setColumnWidth(10, 360);
    const ls = ss.getSheetByName(SHEET.LISTS);   // عمود أنواع زيارة تحفيظ الصغار في «القوائم»
    if (ls && !ls.getRange(1, 5).getValue()) { ls.getRange(1, 5).setValue(LISTS_SGH_TYPES); styleHeader_(ls, 5); ls.setColumnWidth(5, 260); }
  }
  return sh;
}

function getSgh_() {
  const sh = ss_().getSheetByName(SHEET.SGH);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, SGH_HEADERS.length).getDisplayValues();
  return rows.filter(r => r[0]).map(r => {
    let data = {};
    try { data = JSON.parse(r[11] || '{}'); } catch (e) {}
    return { id: r[0], kind: 'sgh', teacher: r[1], center: r[2], period: r[3], visitNo: r[4], day: r[5], hijri: r[6], date: r[7],
      lesson: r[8], recs: r[9], supName: r[10], data: data, at: r[12], owner: r[13] || '', unit: r[14] || '' };
  }).reverse();
}
function getSghFor_(username) {
  const u = norm_(username).toLowerCase();
  return getSgh_().filter(x => x.owner === u);
}

function saveSgh_(r) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 300);
  const me = profileOf_(r.username);
  if (me.unit !== SGH_UNIT) throw new Error('هذا الحساب ليس من ' + SGH_UNIT);
  const teacher = s(r.teacher), center = s(r.center), period = s(r.period);
  if (!teacher) throw new Error('اكتبي اسم المعلمة');
  if (!center) throw new Error('اختاري اسم المركز');
  if (!period) throw new Error('اختاري الفترة');
  let lists = getLists_(false);
  if (lists.centers.indexOf(center) < 0) lists = getLists_(true);
  if (lists.centers.indexOf(center) < 0) throw new Error('اسم المركز غير موجود في القائمة');
  const date = s(r.date, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('التاريخ غير صحيح');
  const d = r.data && typeof r.data === 'object' ? r.data : {};
  const data = { hd: s(d.hd, 2), hm: s(d.hm, 2), hy: s(d.hy, 4), dayName: s(d.dayName, 10) };
  if (!/^\d{4}$/.test(data.hy)) throw new Error('اكتبي سنة التاريخ الهجري');
  const hijri = data.hd + '/' + data.hm + '/' + data.hy + 'هـ';
  const recs = s(r.recs, 6000);
  const sigs = r.sigs && typeof r.sigs === 'object' ? r.sigs : {};   // { sup|tch: dataURL | 'keep' | '' }

  const sh = sghSheet_();
  let id = s(r.id, 60), row = 0, old = null;
  if (id) {
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { row = i + 2; break; }
    }
    if (!row) throw new Error('السجل غير موجود');
    old = sh.getRange(row, 1, 1, SGH_HEADERS.length).getDisplayValues()[0];
    if (String(old[13]) !== me.username) throw new Error('لا يمكن تعديل تقرير سجّلته مشرفة أخرى');
  } else {
    id = Utilities.getUuid();
    row = sh.getLastRow() + 1;
  }
  let oldData = {};
  if (old) { try { oldData = JSON.parse(old[11] || '{}'); } catch (e) {} }

  // ربط التقرير بحساب المعلمة (رقم جوالها في شيت الشهادات) لتوقّع عليه من أيقونة «المعلمات»
  const tPick = String(r.tid || '').trim();   // المعلمة المختارة من قائمة الأسماء
  const tPhone = pPhone_(r.tPhone);
  if (tPick) {
    const t = certFind_(x => String(x.id) === tPick);
    if (!t) throw new Error('المعلمة المختارة غير موجودة في سجل المعلمات');
    data.tid = t.id; data.tName = t.name;
  } else if (tPhone) {
    const t = teacherByPhone_(tPhone);
    if (!t) throw new Error('رقم جوال المعلمة غير موجود في سجل المعلمات');
    data.tPhone = tPhone; data.tid = t.id; data.tName = t.name;
  } else {
    const t = teacherByName_(teacher);   // اختيرت المعلمة من القائمة: تُربط تلقائياً إن كان اسمها لا يتكرر
    if (t) { data.tid = t.id; data.tName = t.name; }
  }
  const sameTeacher = data.tid && data.tid === oldData.tid;
  if (sameTeacher && oldData.tchAt) data.tchAt = oldData.tchAt;   // وقّعت المعلمة من حسابها: يبقى توقيعها

  const has = {};
  SGH_SIGS.forEach(k => {
    const v = String(sigs[k] || '');
    if (k === 'tch' && data.tchAt && v.indexOf('data:image/') !== 0) { has[k] = '1'; return; }   // لا يُحذف توقيع وقّعته المعلمة بنفسها
    if (v === 'keep') { if (oldData.sigs && oldData.sigs[k]) has[k] = '1'; return; }
    if (v.indexOf('data:image/') === 0) { sigPut_(id + '|' + k, v); has[k] = '1'; if (k === 'tch') delete data.tchAt; }
    else if (old) sigDel_(id + '|' + k);
  });
  data.sigs = has;

  const vals = [[id, teacher, center, period, s(r.visitNo, 10), data.dayName, hijri, date, s(r.lesson, 500), recs,
    s(r.supName), JSON.stringify(data), old ? String(old[12] || nowStr_()) : nowStr_(), me.username, me.unit]];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, id: id, sigs: has, tid: data.tid || '', tName: data.tName || '', tchAt: data.tchAt || '', tWa: teacherPhoneById_(data.tid) };
}

function deleteSgh_(r) {
  const id = String(r.id || '');
  const sh = ss_().getSheetByName(SHEET.SGH);
  if (!sh || !id) throw new Error('السجل غير موجود');
  const me = profileOf_(r.username);
  const last = sh.getLastRow();
  if (last > 1) {
    const rows = sh.getRange(2, 1, last - 1, 14).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) !== id) continue;
      if (String(rows[i][13]) !== me.username) throw new Error('لا يمكن حذف تقرير سجّلته مشرفة أخرى');
      sh.deleteRow(i + 2);
      SGH_SIGS.forEach(k => sigDel_(id + '|' + k));
      return { ok: true };
    }
  }
  throw new Error('السجل غير موجود');
}


/* ============ وحدة تحفيظ الصغار: خلاصة التقارير التعليمية – متابعة المشرفة للمعلمة ============
   ورقة «خلاصة التقارير التعليمية» تُنشأ تلقائياً. صفوف الجدول (المركز، المعلمة، الملاحظات، الحضور، الدرجة) في عمود «البيانات».
   توقيع المشرفة في ورقة «التواقيع» بالمعرّف: الرقم|sup */
const SGS_HEADERS = ['الرقم', 'الفصل الدراسي', 'العام', 'الفترة من', 'الفترة إلى', 'رقم الزيارة', 'الفترة', 'اسم المشرفة',
  'التاريخ', 'عدد المعلمات', 'البيانات', 'وقت التسجيل', 'المسجِّلة', 'الوحدة'];

function sgsSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.SGS);
  if (!sh) {
    sh = ss.insertSheet(SHEET.SGS);
    sh.getRange(1, 1, 1, SGS_HEADERS.length).setValues([SGS_HEADERS]);
    styleHeader_(sh, SGS_HEADERS.length);
    sh.setColumnWidths(1, SGS_HEADERS.length, 140);
    sh.setColumnWidth(11, 380);
  }
  return sh;
}

function getSgs_() {
  const sh = ss_().getSheetByName(SHEET.SGS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, SGS_HEADERS.length).getDisplayValues();
  return rows.filter(r => r[0]).map(r => {
    let data = {};
    try { data = JSON.parse(r[10] || '{}'); } catch (e) {}
    return { id: r[0], kind: 'sum', sem: r[1], year: r[2], from: r[3], to: r[4], visitNo: r[5], period: r[6], supName: r[7],
      hijri: r[8], count: r[9], data: data, at: r[11], owner: r[12] || '', unit: r[13] || '',
      date: data.greg || '' };
  }).reverse();
}
function getSgsFor_(username) {
  const u = norm_(username).toLowerCase();
  return getSgs_().filter(x => x.owner === u);
}

function saveSgs_(r) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 300);
  const me = profileOf_(r.username);
  if (me.unit !== SGH_UNIT) throw new Error('هذا الحساب ليس من ' + SGH_UNIT);
  const d = r.data && typeof r.data === 'object' ? r.data : {};
  const rows = (Array.isArray(d.rows) ? d.rows : []).slice(0, 60).map(x => ({
    center: s(x && x.center, 200), teacher: s(x && x.teacher, 200), notes: s(x && x.notes, 1500), att: s(x && x.att, 40), score: s(x && x.score, 20),
    tid: s(x && x.tid, 40)   // معرّف المعلمة في سجل المعلمات (لإرسال سطرها إليها)
  })).filter(x => x.center || x.teacher || x.notes || x.att || x.score);
  if (!rows.length) throw new Error('أضيفي معلمة واحدة على الأقل في الجدول');
  const hp = o => (o && typeof o === 'object') ? { d: s(o.d, 2), m: s(o.m, 2), y: s(o.y, 4) } : {};
  const data = { rows: rows, from: hp(d.from), to: hp(d.to), hd: s(d.hd, 2), hm: s(d.hm, 2), hy: s(d.hy, 4), dayName: s(d.dayName, 10), greg: s(r.date, 10) };
  const hTxt = o => o && o.y ? o.d + '/' + o.m + '/' + o.y + 'هـ' : '';
  const json = JSON.stringify(data);
  if (json.length > 45000) throw new Error('الخلاصة طويلة جداً، اختصري الملاحظات');
  const sigs = r.sigs && typeof r.sigs === 'object' ? r.sigs : {};

  const sh = sgsSheet_();
  let id = s(r.id, 60), row = 0, old = null;
  if (id) {
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { row = i + 2; break; }
    }
    if (!row) throw new Error('السجل غير موجود');
    old = sh.getRange(row, 1, 1, SGS_HEADERS.length).getDisplayValues()[0];
    if (String(old[12]) !== me.username) throw new Error('لا يمكن تعديل خلاصة سجّلتها مشرفة أخرى');
  } else {
    id = Utilities.getUuid();
    row = sh.getLastRow() + 1;
  }
  let oldData = {};
  if (old) { try { oldData = JSON.parse(old[10] || '{}'); } catch (e) {} }
  const has = {};
  const v = String(sigs.sup || '');
  if (v === 'keep') { if (oldData.sigs && oldData.sigs.sup) has.sup = '1'; }
  else if (v.indexOf('data:image/') === 0) { sigPut_(id + '|sup', v); has.sup = '1'; }
  else if (old) sigDel_(id + '|sup');
  data.sigs = has;

  const vals = [[id, s(r.sem, 20), s(r.year, 4), hTxt(data.from), hTxt(data.to), s(r.visitNo, 10), s(r.period, 20), s(r.supName),
    hTxt({ d: data.hd, m: data.hm, y: data.hy }), String(rows.length), JSON.stringify(data),
    old ? String(old[11] || nowStr_()) : nowStr_(), me.username, me.unit]];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, id: id, sigs: has };
}

function deleteSgs_(r) {
  const id = String(r.id || '');
  const sh = ss_().getSheetByName(SHEET.SGS);
  if (!sh || !id) throw new Error('السجل غير موجود');
  const me = profileOf_(r.username);
  const last = sh.getLastRow();
  if (last > 1) {
    const rows = sh.getRange(2, 1, last - 1, 13).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) !== id) continue;
      if (String(rows[i][12]) !== me.username) throw new Error('لا يمكن حذف خلاصة سجّلتها مشرفة أخرى');
      sh.deleteRow(i + 2);
      sigDel_(id + '|sup');
      return { ok: true };
    }
  }
  throw new Error('السجل غير موجود');
}



/* ============ أيقونة «المعلمات»: دخول المعلمة وتوقيعها على تقارير المشرفات ============
   سجل المعلمات (الاسم، الجوال، كلمة المرور، Teacher ID) يُقرأ من شيت الشهادات — قراءة فقط ولا يُعدَّل فيه شيء.
   كلمة المرور هي نفسها كلمة مرور بوابة المعلمات. */
const CERT_SHEET_ID = '10SGdGcDEUJS0G8_s_m12Ix8A7hoN4iPLWm_p7yi6j88';
const CERT_COLS = { pass: 'م', name: 'اسم المعلمة', phone: 'رقم الجوال', id: 'Teacher ID', cat: 'الفئة المناسبة للتدريس' };
const T_MAX_FAILS = 5, T_LOCK_MIN = 15;

function pPhone_(v) {
  let p = String(v == null ? '' : v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
  if (p.indexOf('00966') === 0) p = p.slice(5);
  else if (p.indexOf('966') === 0) p = p.slice(3);
  if (p.length === 9) p = '0' + p;
  return p.length === 10 ? p : '';
}

// سجل المعلمات في الكاش 6 ساعات (يُعاد قراءته إن لم توجد المعلمة، مرة كل دقيقة كحد أقصى)
const CERT_CACHE_KEY = 'cert_v4', CERT_CACHE_TTL = 21600;
function certRowsFresh_() {
  const sh = SpreadsheetApp.openById(CERT_SHEET_ID).getSheets().find(x => x.getName().indexOf('شهادة') !== -1);
  if (!sh) throw new Error('ورقة الشهادات غير موجودة');
  const v = sh.getDataRange().getDisplayValues();
  const hr = v.findIndex(r => r.some(c => String(c).trim() === CERT_COLS.name));
  if (hr < 0) throw new Error('صف العناوين غير موجود في ورقة الشهادات');
  const h = v[hr].map(c => String(c).trim());
  const ix = {}; Object.keys(CERT_COLS).forEach(k => ix[k] = h.indexOf(CERT_COLS[k]));
  if (ix.name < 0 || ix.phone < 0 || ix.id < 0 || ix.pass < 0) throw new Error('أعمدة ناقصة في ورقة الشهادات');
  return v.slice(hr + 1).map(r => ({ id: String(r[ix.id]).trim(), name: String(r[ix.name]).trim(), phone: pPhone_(r[ix.phone]), pass: String(r[ix.pass]).trim().toUpperCase(),
    cat: ix.cat > -1 ? String(r[ix.cat]).trim() : '' }))
    .filter(t => t.name && t.phone)
    .map(t => { if (!t.id) t.id = 'P-' + t.phone; return t; });   // معلمة جديدة بلا Teacher ID: معرّف ثابت من رقم جوالها
}
function certCachePut_(rows) {
  try {
    const s = JSON.stringify(rows.map(t => [t.id, t.name, t.phone, t.pass, t.cat])), CH = 30000, cnt = Math.ceil(s.length / CH);
    if (cnt < 1 || cnt > 60) return;
    const o = {};
    for (let i = 0; i < cnt; i++) o[CERT_CACHE_KEY + '_' + i] = s.substr(i * CH, CH);
    o[CERT_CACHE_KEY + '_n'] = String(cnt);
    o[CERT_CACHE_KEY + '_at'] = String(Date.now());
    CacheService.getScriptCache().putAll(o, CERT_CACHE_TTL);
  } catch (e) {}
}
function certCacheGet_() {
  try {
    const c = CacheService.getScriptCache();
    const n = parseInt(c.get(CERT_CACHE_KEY + '_n') || '0', 10);
    if (!n) return null;
    const keys = []; for (let i = 0; i < n; i++) keys.push(CERT_CACHE_KEY + '_' + i);
    const parts = c.getAll(keys); let s = '';
    for (let i = 0; i < n; i++) { const p = parts[keys[i]]; if (p == null) return null; s += p; }
    return JSON.parse(s).map(a => ({ id: a[0], name: a[1], phone: a[2], pass: a[3], cat: a[4] || '' }));
  } catch (e) { return null; }
}
function certRows_(fresh) {
  if (!fresh) { const hit = certCacheGet_(); if (hit) return hit; }
  const rows = certRowsFresh_(); certCachePut_(rows); return rows;
}
function certFind_(test) {
  let hit = certRows_(false).filter(test);
  if (!hit.length) {
    const at = Number(CacheService.getScriptCache().get(CERT_CACHE_KEY + '_at') || 0);
    if (Date.now() - at > 60000) hit = certRows_(true).filter(test);
  }
  return hit.length ? hit[0] : null;
}
function teacherByName_(name) {
  const k = norm_(name).replace(/\s+/g, ' ');
  if (!k) return null;
  try {
    const L = certRows_(false).filter(t => t.name.replace(/\s+/g, ' ') === k);
    return L.length === 1 ? L[0] : null;
  } catch (e) { return null; }
}
function teacherPhoneById_(tid) {
  const id = String(tid || '').trim();
  if (!id) return '';
  try { const t = certFind_(x => String(x.id) === id); return t ? String(t.phone || '') : ''; } catch (e) { return ''; }
}
function teacherByPhone_(phone) { const p = pPhone_(phone); return p ? certFind_(t => t.phone === p) : null; }

// تحقق دخول المعلمة (مع إيقاف مؤقت بعد 5 محاولات خاطئة)
function teacherAuth_(req) {
  const phone = pPhone_(req.phone), pass = String(req.password || '').trim().toUpperCase();
  if (!phone || !pass) throw new Error('تحققي من رقم الجوال وكلمة المرور');
  const c = CacheService.getScriptCache(), key = 'tfail_' + phone;
  const fails = Number(c.get(key) || 0);
  if (fails >= T_MAX_FAILS) throw new Error('تم إيقاف المحاولات مؤقتاً، حاولي بعد ' + T_LOCK_MIN + ' دقيقة');
  const t = certFind_(x => x.phone === phone && x.pass === pass);
  if (!t) { c.put(key, String(fails + 1), T_LOCK_MIN * 60); throw Object.assign(new Error('رقم الجوال أو كلمة المرور غير صحيحة'), { auth: true }); }
  if (fails) c.remove(key);
  return t;
}

// تقارير المعلمة (المرتبطة بمعرّفها فقط)
function teacherReports_(t) {
  return getSgh_().concat(getSge_()).filter(x => x.data && x.data.tid === t.id).map(x => {
    const o = Object.assign({}, x); delete o.owner;
    o.signed = !!(x.data.sigs && x.data.sigs.tch);
    // استمارات التقييم: تصل للمعلمة الملاحظات والتوصيات فقط، دون الدرجات والتقدير
    if (o.kind === 'eval') { o.score = ''; o.max = ''; o.grade = ''; o.data = Object.assign({}, o.data, { sc: [], overall: '' }); o.tview = true; }
    return o;
  });
}

function teacherRoute_(r) {
  try {
    if (r.action === 't_hint') {   // اسم مختصر للتأكد قبل كتابة كلمة المرور
      const t = teacherByPhone_(r.phone);
      return t ? { ok: true, name: t.name.split(/\s+/).slice(0, 2).join(' ') } : { ok: false, error: 'رقم الجوال غير موجود في سجل المعلمات' };
    }
    const t = teacherAuth_(r);
    if (r.action === 't_login' || r.action === 't_list') return { ok: true, teacher: { id: t.id, name: t.name, category: t.cat }, data: teacherReports_(t), minutes: minutesFor_(t), files: filesForTeacher_(t), inbox: teacherInbox_(t) };
    if (r.action === 't_file') { const x = outRows_().find(y => y.id === String(r.id || '') && y.to === 't' && y.tid === t.id); if (!x) throw new Error('هذا النموذج ليس لكِ'); return outFile_(x); }
    if (r.action === 't_done') return withLock_(() => centerDone_({ tid: t.id, name: t.name }, Object.assign({}, r, { signer: t.name })));
    if (r.action === 't_ack') return withLock_(() => minuteAck_(t, r));
    if (r.action === 't_fack') return withLock_(() => fileAck_(t, r));
    if (r.action === 't_sigs') {   // تواقيع تقرير من تقاريرها فقط (للعرض والطباعة)
      const rec = getSgh_().concat(getSge_()).find(x => x.id === String(r.id || '') && x.data && x.data.tid === t.id);
      if (!rec) throw new Error('التقرير غير موجود');
      return { ok: true, data: getSigs_(['sup', 'tch', 'mgr'].map(k => ({ id: rec.id + '|' + k }))) };
    }
    if (r.action === 't_sign') return withLock_(() => teacherSign_(t, r));
    throw new Error('إجراء غير معروف');
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

function teacherSign_(t, r) {
  const id = String(r.id || ''), sig = String(r.signature || '');
  if (sig.indexOf('data:image/') !== 0 || sig.length > 49000) throw new Error('التوقيع غير صالح، أعيدي التوقيع');
  // تقارير الزيارة (عمود البيانات 12) واستمارات التقييم (عمود البيانات 13)
  for (const [name, col] of [[SHEET.SGH, 12], [SHEET.SGE, 13]]) {
  const sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) continue;
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) !== id) continue;
    const cell = sh.getRange(i + 2, col);
    let data = {};
    try { data = JSON.parse(cell.getValue() || '{}'); } catch (e) {}
    if (data.tid !== t.id) throw new Error('هذا التقرير ليس لكِ');
    sigPut_(id + '|tch', sig);
    data.sigs = data.sigs || {}; data.sigs.tch = '1';
    data.tchAt = nowStr_();
    cell.setNumberFormat('@').setValue(JSON.stringify(data));
    return { ok: true, at: data.tchAt };
  }
  }
  throw new Error('التقرير غير موجود');
}

/* شغّليها مرة واحدة من Apps Script لمنح الإذن بقراءة شيت الشهادات والتأكد من الربط */
function testTeacherRegistry() {
  const rows = certRows_(true);
  Logger.log('عدد المعلمات في سجل الشهادات: ' + rows.length + (rows[0] ? ' — مثال: ' + rows[0].name : ''));
}



/* ============ وحدة تحفيظ الصغار: استمارات تقييم الأداء الوظيفي ============
   ورقة «استمارات تحفيظ الصغار» تُنشأ تلقائياً. الدرجات والملاحظات والتوصيات في عمود «البيانات».
   التواقيع في ورقة «التواقيع» بالمعرّف: الرقم|sup (المشرفة) و الرقم|tch (المعلمة، من حسابها في «المعلمات» أو على جهاز المشرفة).
   (أُلغيت خانة المديرة؛ الاستمارات القديمة يبقى فيها توقيعها الرقم|mgr كما هو) */
const SGE_HEADERS = ['الرقم', 'نوع الاستمارة', 'اسم المعلمة', 'اسم المركز', 'الفترة', 'التاريخ الهجري', 'اليوم', 'التاريخ',
  'الدرجة', 'من', 'التقدير', 'اسم المشرفة', 'البيانات', 'وقت التسجيل', 'المسجِّلة', 'الوحدة'];
const SGE_TYPES = { tilawa: 'التلاوة', tibyan: 'التبيان', madda: 'المادة', liqa: 'لقاء أخير', wajba: 'أثناء الوجبة', arkan: 'معلمة الأركان', saha: 'مشرفة الساحة' };
const SGE_SIGS = ['sup', 'tch'];

function sgeSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.SGE);
  if (!sh) {
    sh = ss.insertSheet(SHEET.SGE);
    sh.getRange(1, 1, 1, SGE_HEADERS.length).setValues([SGE_HEADERS]);
    styleHeader_(sh, SGE_HEADERS.length);
    sh.setColumnWidths(1, SGE_HEADERS.length, 130);
    sh.setColumnWidth(13, 380);
  } else if (String(sh.getRange(1, 12).getValue()).trim() === 'اسم المديرة') {
    sh.getRange(1, 12).setValue('اسم المشرفة');   // تحديث عنوان العمود في الورقة القديمة
  }
  return sh;
}

function getSge_() {
  const sh = ss_().getSheetByName(SHEET.SGE);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, SGE_HEADERS.length).getDisplayValues();
  return rows.filter(r => r[0]).map(r => {
    let data = {};
    try { data = JSON.parse(r[12] || '{}'); } catch (e) {}
    return { id: r[0], kind: 'eval', formName: r[1], teacher: r[2], center: r[3], period: r[4], hijri: r[5], day: r[6], date: r[7],
      score: r[8], max: r[9], grade: r[10], supName: data.supName || '', mgrName: data.mgrName || '', data: data, at: r[13], owner: r[14] || '', unit: r[15] || '',
      visitNo: (data.f && data.f.visitNo) || '', lesson: (data.f && data.f.lesson) || '' };
  }).reverse();
}
function getSgeFor_(username) {
  const u = norm_(username).toLowerCase();
  return getSge_().filter(x => x.owner === u);
}

function saveSge_(r) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 300);
  const me = profileOf_(r.username);
  if (me.unit !== SGH_UNIT) throw new Error('هذا الحساب ليس من ' + SGH_UNIT);
  const d = r.data && typeof r.data === 'object' ? r.data : {};
  const form = s(d.form, 20);
  if (!SGE_TYPES[form]) throw new Error('نوع الاستمارة غير معروف');
  const teacher = s(r.teacher), center = s(r.center);
  if (!teacher) throw new Error('اكتبي اسم المعلمة');
  if (!center) throw new Error('اختاري اسم المركز');
  let lists = getLists_(false);
  if (lists.centers.indexOf(center) < 0) lists = getLists_(true);
  if (lists.centers.indexOf(center) < 0) throw new Error('اسم المركز غير موجود في القائمة');
  const date = s(r.date, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('التاريخ غير صحيح');
  const arr = (a, n, len) => (Array.isArray(a) ? a : []).slice(0, n).map(x => s(x, len));
  const f = {};
  Object.keys(d.f && typeof d.f === 'object' ? d.f : {}).slice(0, 20).forEach(k => { f[k] = s(d.f[k], 200); });
  const data = { form: form, f: f, sc: arr(d.sc, 60, 8), nt: arr(d.nt, 60, 400), recs: arr(d.recs, 4, 3000), overall: s(d.overall, 40),
    hd: s(d.hd, 2), hm: s(d.hm, 2), hy: s(d.hy, 4), dayName: s(d.dayName, 10), supName: s(r.supName) };
  if (!data.supName) throw new Error('اكتبي اسم المشرفة');
  const hijri = data.hy ? data.hd + '/' + data.hm + '/' + data.hy + 'هـ' : '';
  const sigs = r.sigs && typeof r.sigs === 'object' ? r.sigs : {};

  const sh = sgeSheet_();
  let id = s(r.id, 60), row = 0, old = null;
  if (id) {
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { row = i + 2; break; }
    }
    if (!row) throw new Error('السجل غير موجود');
    old = sh.getRange(row, 1, 1, SGE_HEADERS.length).getDisplayValues()[0];
    if (String(old[14]) !== me.username) throw new Error('لا يمكن تعديل استمارة سجّلتها مشرفة أخرى');
  } else {
    id = Utilities.getUuid();
    row = sh.getLastRow() + 1;
  }
  let oldData = {};
  if (old) { try { oldData = JSON.parse(old[12] || '{}'); } catch (e) {} }

  // ربط الاستمارة بحساب المعلمة لتوقّع عليها من أيقونة «المعلمات»
  const tPick = String(r.tid || '').trim();   // المعلمة المختارة من قائمة الأسماء
  const tPhone = pPhone_(r.tPhone);
  if (tPick) {
    const t = certFind_(x => String(x.id) === tPick);
    if (!t) throw new Error('المعلمة المختارة غير موجودة في سجل المعلمات');
    data.tid = t.id; data.tName = t.name;
  } else if (tPhone) {
    const t = teacherByPhone_(tPhone);
    if (!t) throw new Error('رقم جوال المعلمة غير موجود في سجل المعلمات');
    data.tPhone = tPhone; data.tid = t.id; data.tName = t.name;
  } else {
    const t = teacherByName_(teacher);   // اختيرت المعلمة من القائمة: تُربط تلقائياً إن كان اسمها لا يتكرر
    if (t) { data.tid = t.id; data.tName = t.name; }
  }
  if (data.tid && data.tid === oldData.tid && oldData.tchAt) data.tchAt = oldData.tchAt;

  const has = {};
  SGE_SIGS.forEach(k => {
    const v = String(sigs[k] || '');
    if (k === 'tch' && data.tchAt && v.indexOf('data:image/') !== 0) { has[k] = '1'; return; }   // لا يُحذف توقيع وقّعته المعلمة بنفسها
    if (v === 'keep') { if (oldData.sigs && oldData.sigs[k]) has[k] = '1'; return; }
    if (v.indexOf('data:image/') === 0) { sigPut_(id + '|' + k, v); has[k] = '1'; if (k === 'tch') delete data.tchAt; }
    else if (old) sigDel_(id + '|' + k);
  });
  if (!has.sup) throw new Error('توقيع المشرفة مطلوب');
  if (old) sigDel_(id + '|mgr');   // إزالة توقيع المديرة من الاستمارات القديمة عند تعديلها
  data.sigs = has;
  const json = JSON.stringify(data);
  if (json.length > 45000) throw new Error('الاستمارة طويلة جداً، اختصري الملاحظات');

  const vals = [[id, SGE_TYPES[form], teacher, center, s(r.period, 20), hijri, data.dayName, date,
    s(r.score, 10), s(r.max, 10), s(r.grade, 20), data.supName, json,
    old ? String(old[13] || nowStr_()) : nowStr_(), me.username, me.unit]];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, id: id, sigs: has, tid: data.tid || '', tName: data.tName || '', tchAt: data.tchAt || '', tWa: teacherPhoneById_(data.tid) };
}

function deleteSge_(r) {
  const id = String(r.id || '');
  const sh = ss_().getSheetByName(SHEET.SGE);
  if (!sh || !id) throw new Error('السجل غير موجود');
  const me = profileOf_(r.username);
  const last = sh.getLastRow();
  if (last > 1) {
    const rows = sh.getRange(2, 1, last - 1, 15).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) !== id) continue;
      if (String(rows[i][14]) !== me.username) throw new Error('لا يمكن حذف استمارة سجّلتها مشرفة أخرى');
      sh.deleteRow(i + 2);
      SGE_SIGS.concat(['mgr']).forEach(k => sigDel_(id + '|' + k));
      return { ok: true };
    }
  }
  throw new Error('السجل غير موجود');
}


/* ============ فحص ربط أرقام المعلمات (للتشخيص) ============
   اكتبي رقم الجوال بين علامتي التنصيص ثم شغّلي الدالة checkTeacherPhone من Apps Script وانظري إلى «سجل التنفيذ». */
const CHECK_PHONE = '05xxxxxxxx';
function checkTeacherPhone() {
  const ss = SpreadsheetApp.openById(CERT_SHEET_ID);
  Logger.log('الملف المرتبط: «' + ss.getName() + '»');
  Logger.log('رابطه: ' + ss.getUrl());
  Logger.log('الأوراق فيه: ' + ss.getSheets().map(x => x.getName()).join(' | '));
  const sh = ss.getSheets().find(x => x.getName().indexOf('شهادة') !== -1);
  if (!sh) { Logger.log('✖ لا توجد ورقة اسمها يحتوي «شهادة»'); return; }
  Logger.log('الورقة المقروءة: «' + sh.getName() + '» — عدد الصفوف: ' + sh.getLastRow());
  const v = sh.getDataRange().getDisplayValues();
  const hr = v.findIndex(r => r.some(c => String(c).trim() === CERT_COLS.name));
  Logger.log('صف العناوين رقم ' + (hr + 1) + ': ' + (hr > -1 ? v[hr].filter(String).join(' | ') : 'غير موجود'));
  const h = v[hr].map(c => String(c).trim()), cP = h.indexOf(CERT_COLS.phone), cN = h.indexOf(CERT_COLS.name);
  const want = pPhone_(CHECK_PHONE);
  let found = false;
  for (let i = hr + 1; i < v.length; i++) {
    if (pPhone_(v[i][cP]) === want) { found = true; Logger.log('✔ وُجد الرقم في الصف ' + (i + 1) + ' — الاسم: ' + v[i][cN] + ' — الرقم كما هو مكتوب: ' + v[i][cP]); }
  }
  if (!found) Logger.log('✖ الرقم ' + CHECK_PHONE + ' غير موجود في هذه الورقة. آخر 3 أرقام مكتوبة فيها: ' + v.slice(-3).map(r => r[cP]).join(' ، '));
  CacheService.getScriptCache().remove(CERT_CACHE_KEY + '_n');   // يمسح القائمة المؤقتة لتُقرأ من جديد
  Logger.log('تم مسح القائمة المؤقتة، جرّبي الموقع الآن.');
}



/* ============ محاضر الاجتماعات: تنشرها المشرفة للمعلمات (الكل أو محددات) وتضغط المعلمة «تم الاطلاع» ============ */
const MIN_HEADERS = ['الرقم', 'رقم الاجتماع', 'اليوم', 'التاريخ الهجري', 'المركز', 'المستهدفات', 'البيانات', 'وقت النشر', 'المسجِّلة', 'الوحدة'];
const MINACK_HEADERS = ['رقم المحضر', 'Teacher ID', 'اسم المعلمة', 'وقت الاطلاع'];
function minSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.MIN);
  if (!sh) { sh = ss.insertSheet(SHEET.MIN); sh.getRange(1, 1, 1, MIN_HEADERS.length).setValues([MIN_HEADERS]); styleHeader_(sh, MIN_HEADERS.length); sh.setColumnWidths(1, MIN_HEADERS.length, 140); sh.setColumnWidth(7, 380); }
  return sh;
}
function minAckSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.MINACK);
  if (!sh) { sh = ss.insertSheet(SHEET.MINACK); sh.getRange(1, 1, 1, MINACK_HEADERS.length).setValues([MINACK_HEADERS]); styleHeader_(sh, MINACK_HEADERS.length); sh.setColumnWidths(1, MINACK_HEADERS.length, 160); }
  return sh;
}
function getMinutes_() {
  const sh = ss_().getSheetByName(SHEET.MIN);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, MIN_HEADERS.length).getDisplayValues().filter(r => r[0]).map(r => {
    let data = {}; try { data = JSON.parse(r[6] || '{}'); } catch (e) {}
    return { id: r[0], kind: 'min', no: r[1], dayName: r[2], hijri: r[3], center: r[4], targetTxt: r[5], data: data, at: r[7], owner: r[8] || '', unit: r[9] || '' };
  }).reverse();
}
function minAcks_() {
  const sh = ss_().getSheetByName(SHEET.MINACK);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues().filter(r => r[0]).map(r => ({ mid: r[0], tid: r[1], name: r[2], at: r[3] }));
}
function getMinutesFor_(username) {
  const u = norm_(username).toLowerCase(), acks = minAcks_();
  return getMinutes_().filter(m => m.owner === u).map(m => Object.assign(m, { acks: acks.filter(a => a.mid === m.id) }));
}
// محاضر المعلمة: المنشورة للجميع أو لها بالتحديد
function minutesFor_(t) {
  const acks = minAcks_().filter(a => a.tid === t.id);
  return getMinutes_().filter(m => { const tg = m.data.target || {}; return tg.all || (tg.ids || []).indexOf(t.id) > -1; })
    .map(m => { const a = acks.find(x => x.mid === m.id); const o = Object.assign({}, m, { acked: !!a, ackAt: a ? a.at : '' }); delete o.owner; delete o.data.target; return o; });
}
function saveMinute_(r) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 300);
  const me = profileOf_(r.username);
  const d = r.data && typeof r.data === 'object' ? r.data : {};
  const list = (a, n, len) => (Array.isArray(a) ? a : []).map(x => s(x, len)).filter(Boolean).slice(0, n);
  const tg = d.target && typeof d.target === 'object' ? d.target : {};
  const target = { all: !!tg.all, ids: tg.all ? [] : list(tg.ids, 400, 40), names: tg.all ? [] : list(tg.names, 400, 120) };
  if (!target.all && !target.ids.length) throw new Error('حدّدي المعلمات اللاتي يصلهن المحضر، أو اختاري «كل المعلمات»');
  const data = { points: list(d.points, 40, 1000), outs: list(d.outs, 40, 1000), parts: list(d.parts, 80, 120), target: target,
    hd: s(d.hd, 2), hm: s(d.hm, 2), hy: s(d.hy, 4) };
  if (!data.points.length) throw new Error('اكتبي نقطة واحدة على الأقل من نقاط الاجتماع');
  const json = JSON.stringify(data);
  if (json.length > 45000) throw new Error('المحضر طويل جداً، اختصري النقاط');
  const hijri = data.hy ? data.hd + '/' + data.hm + '/' + data.hy + 'هـ' : '';
  const tTxt = target.all ? 'كل المعلمات' : target.names.join('، ').slice(0, 1000);
  const sh = minSheet_(); minAckSheet_();
  let id = s(r.id, 60), row = 0, old = null;
  if (id) {
    const last = sh.getLastRow();
    if (last > 1) { const ids = sh.getRange(2, 1, last - 1, 1).getValues(); for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { row = i + 2; break; } }
    if (!row) throw new Error('السجل غير موجود');
    old = sh.getRange(row, 1, 1, MIN_HEADERS.length).getDisplayValues()[0];
    if (String(old[8]) !== me.username) throw new Error('لا يمكن تعديل محضر نشرته مشرفة أخرى');
  } else { id = Utilities.getUuid(); row = sh.getLastRow() + 1; }
  sh.getRange(row, 1, 1, MIN_HEADERS.length).setNumberFormat('@').setValues([[id, s(r.no, 10), s(r.dayName, 10), hijri, s(r.center, 200), tTxt, json,
    old ? String(old[7] || nowStr_()) : nowStr_(), me.username, me.unit]]);
  return { ok: true, id: id };
}
function deleteMinute_(r) {
  const id = String(r.id || ''), me = profileOf_(r.username);
  const sh = ss_().getSheetByName(SHEET.MIN);
  if (!sh || !id || sh.getLastRow() < 2) throw new Error('السجل غير موجود');
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) !== id) continue;
    if (String(rows[i][8]) !== me.username) throw new Error('لا يمكن حذف محضر نشرته مشرفة أخرى');
    sh.deleteRow(i + 2);
    const ak = ss_().getSheetByName(SHEET.MINACK);   // حذف سجل الاطلاع الخاص به
    if (ak && ak.getLastRow() > 1) { const a = ak.getRange(2, 1, ak.getLastRow() - 1, 1).getValues(); for (let j = a.length - 1; j >= 0; j--) if (String(a[j][0]) === id) ak.deleteRow(j + 2); }
    return { ok: true };
  }
  throw new Error('السجل غير موجود');
}
function minuteAck_(t, r) {
  const id = String(r.id || '');
  const m = minutesFor_(t).find(x => x.id === id);
  if (!m) throw new Error('المحضر غير موجود');
  if (m.acked) return { ok: true, at: m.ackAt };
  const at = nowStr_();
  const ak = minAckSheet_();
  ak.getRange(ak.getLastRow() + 1, 1, 1, 4).setNumberFormat('@').setValues([[id, t.id, t.name, at]]);
  return { ok: true, at: at };
}



/* ============ سجلات الاطلاع العامة + المرفقات المشاركة مع المعلمات ============ */
function ackSheet_(name) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, MINACK_HEADERS.length).setValues([MINACK_HEADERS.map((h, i) => i ? h : 'الرقم')]); styleHeader_(sh, MINACK_HEADERS.length); sh.setColumnWidths(1, MINACK_HEADERS.length, 160); }
  return sh;
}
function ackRows_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues().filter(r => r[0]).map(r => ({ mid: r[0], tid: r[1], name: r[2], at: r[3] }));
}
function filesForTeacher_(t) {
  const acks = ackRows_(SHEET.FILEACK).filter(a => a.tid === t.id);
  return getFiles_().filter(f => f.target && (f.target.all || (f.target.ids || []).indexOf(t.id) > -1)).map(f => {
    const a = acks.find(x => x.mid === f.id);
    return { id: f.id, title: f.title, name: f.name, url: f.url, at: f.at, unit: f.unit, acked: !!a, ackAt: a ? a.at : '' };
  });
}
function fileAck_(t, r) {
  const id = String(r.id || '');
  const f = filesForTeacher_(t).find(x => x.id === id);
  if (!f) throw new Error('المرفق غير موجود');
  if (f.acked) return { ok: true, at: f.ackAt };
  const at = nowStr_(), sh = ackSheet_(SHEET.FILEACK);
  sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setNumberFormat('@').setValues([[id, t.id, t.name, at]]);
  return { ok: true, at: at };
}



/* ============ خلاصة التقارير (الإشراف التربوي — reports.js) ============
   كل خلاصة صف واحد؛ بياناتها (الإعدادات + صفوف المعلمات) JSON مقسّم على عدة خلايا لأن الخلية لا تتسع لأكثر من 50 ألف حرف. */
const RPT_HEADERS = ['الرقم', 'العنوان', 'المشرفة', 'الفترة', 'الفصل الدراسي', 'العام', 'عدد المعلمات', 'وقت الحفظ', 'المسجِّلة', 'الوحدة', 'البيانات'];
const RPT_DATA_COL = 11, RPT_CHUNK = 45000, RPT_MAX_CHUNKS = 20;
function rptSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.RPT);
  if (!sh) { sh = ss.insertSheet(SHEET.RPT); sh.getRange(1, 1, 1, RPT_HEADERS.length).setValues([RPT_HEADERS]); styleHeader_(sh, RPT_HEADERS.length); sh.setColumnWidths(1, RPT_HEADERS.length, 140); }
  return sh;
}
function rptTitle_(m) {
  m = m || {};
  return 'خلاصة التقارير' + (m.period ? ' — الفترة ' + m.period : '') + (m.semester ? ' — الفصل ' + m.semester : '') + (m.year ? ' ' + m.year + 'هـ' : '');
}
function reportsList_() {
  const sh = ss_().getSheetByName(SHEET.RPT);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 10).getDisplayValues().filter(r => r[0]).map(r => ({
    id: r[0], title: r[1], supervisor: r[2], period: r[3], semester: r[4], year: r[5], count: r[6], at: r[7], owner: r[8], unit: r[9] })).reverse();
}
function getReportsFor_(username) {
  const u = norm_(username).toLowerCase();
  return reportsList_().filter(x => x.owner === u);
}
function rptRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}
function getReport_(r) {
  const sh = ss_().getSheetByName(SHEET.RPT), id = String(r.id || '');
  const row = sh ? rptRow_(sh, id) : 0;
  if (!row) throw new Error('الخلاصة غير موجودة');
  const head = sh.getRange(row, 1, 1, 10).getValues()[0];
  if (String(head[8]) !== norm_(r.username).toLowerCase()) throw new Error('هذه الخلاصة لمشرفة أخرى');
  const n = Math.max(1, sh.getLastColumn() - RPT_DATA_COL + 1);
  const json = sh.getRange(row, RPT_DATA_COL, 1, n).getValues()[0].map(String).join('');
  let d = {};
  try { d = JSON.parse(json || '{}'); } catch (e) { throw new Error('تعذّرت قراءة بيانات الخلاصة'); }
  return { id: id, meta: d.meta || {}, rows: d.rows || [] };
}
function saveReport_(r) {
  const me = profileOf_(r.username), rep = r.report && typeof r.report === 'object' ? r.report : {};
  const meta = rep.meta && typeof rep.meta === 'object' ? rep.meta : {};
  const rows = Array.isArray(rep.rows) ? rep.rows.slice(0, 500) : [];
  const json = JSON.stringify({ meta: meta, rows: rows });
  const chunks = [];
  for (let i = 0; i < json.length; i += RPT_CHUNK) chunks.push(json.substr(i, RPT_CHUNK));
  if (chunks.length > RPT_MAX_CHUNKS) throw new Error('الخلاصة كبيرة جداً، قسّميها على خلاصتين');
  const sh = rptSheet_();
  let id = String(rep.id || ''), row = id ? rptRow_(sh, id) : 0;
  if (row && String(sh.getRange(row, 9).getValue()) !== me.username) throw new Error('لا يمكن تعديل خلاصة مشرفة أخرى');
  if (!row) { id = Utilities.getUuid(); row = sh.getLastRow() + 1; }
  const count = rows.filter(x => x && String(x.name || '').trim()).length;
  sh.getRange(row, 1, 1, 10).setNumberFormat('@').setValues([[id, rptTitle_(meta), String(meta.supervisor || '').slice(0, 200), String(meta.period || ''), String(meta.semester || ''),
    String(meta.year || ''), String(count), nowStr_(), me.username, me.unit]]);
  const width = Math.max(chunks.length, sh.getLastColumn() - RPT_DATA_COL + 1, 1);
  const vals = []; for (let i = 0; i < width; i++) vals.push(chunks[i] || '');
  sh.getRange(row, RPT_DATA_COL, 1, width).setNumberFormat('@').setValues([vals]);
  return { ok: true, id: id };
}
function deleteReport_(r) {
  const sh = ss_().getSheetByName(SHEET.RPT), id = String(r.id || '');
  const row = sh ? rptRow_(sh, id) : 0;
  if (!row) throw new Error('الخلاصة غير موجودة');
  if (String(sh.getRange(row, 9).getValue()) !== norm_(r.username).toLowerCase()) throw new Error('لا يمكن حذف خلاصة مشرفة أخرى');
  sh.deleteRow(row);
  return { ok: true };
}


/* ============ أيقونة «المراكز»: دخول المركز باسم المركز وكلمة مروره (مثل نظام المقاصف) ============
   ورقة «حسابات المراكز» تُنشأ تلقائياً: اسم المركز | كلمة المرور | الاسم المعروض.
   الحساب للمركز لا لشخص المديرة (لا جوال ولا إيميل). يرى المركز تقارير زيارة الإشراف الإداري الخاصة به،
   فتطّلع المديرة عليها وتوقّع من حساب المركز (مثل تقارير الزيارة في نظام المقاصف). */
const CENTER_ACC_SHEET = 'حسابات المراكز';
const C_MAX_FAILS = 5, C_LOCK_MIN = 15;

function centerAccSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(CENTER_ACC_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CENTER_ACC_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([['اسم المركز', 'كلمة المرور', 'الاسم المعروض']]);
    styleHeader_(sh, 3);
    sh.setRightToLeft(true);
    sh.setColumnWidth(1, 320);
  }
  return sh;
}
function centerAccounts_() {
  const c = CacheService.getScriptCache(), hit = c.get('cacc_v1');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const sh = centerAccSheet_();
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues() : [];
  const out = v.filter(r => String(r[0]).trim()).map(r => ({ name: String(r[0]).trim(), pass: String(r[1]).trim().replace(/\.0+$/, ''), display: String(r[2]).trim() || String(r[0]).trim() }));
  try { c.put('cacc_v1', JSON.stringify(out), 300); } catch (e) {}
  return out;
}
// مطابقة اسم المركز بين الحساب وقائمة مراكز المنظومة: نحذف «الفترة …» و«مركز/معهد» والتشكيل والهمزات والمسافات
function cKey_(t) {
  return String(t || '').replace(/[-–—]\s*الفتر[ةه].*$/, '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/(^|\s)(مركز|معهد)(\s|$)/g, ' ').replace(/[^ء-يa-z0-9]/gi, '');
}
// فترات الحساب من اسمه: «الفترة الصباحية» أو «المسائية» أو كلتاهما (وإن لم تُذكر فكلتاهما)
function cPeriods_(name) {
  const m = /صباح/.test(name), e = /مسائ/.test(name);
  return { m: m || !e, e: e || !m };
}
function centerAuth_(r) {
  const name = String(r.center || '').trim(), pass = String(r.cpass || '').trim();
  if (!name || !pass) throw new Error('اختاري المركز واكتبي كلمة المرور');
  const c = CacheService.getScriptCache(), key = 'cfail_' + cKey_(name).slice(0, 80);
  const fails = Number(c.get(key) || 0);
  if (fails >= C_MAX_FAILS) throw new Error('تم إيقاف المحاولات مؤقتاً، حاولي بعد ' + C_LOCK_MIN + ' دقيقة');
  const acc = centerAccounts_().find(a => a.name === name && a.pass === pass);
  if (!acc) { c.put(key, String(fails + 1), C_LOCK_MIN * 60); throw new Error('اسم المركز أو كلمة المرور غير صحيحة'); }
  if (fails) c.remove(key);
  return acc;
}
// تقارير زيارة الإشراف الإداري الخاصة بهذا المركز (وفترته)
function centerReports_(acc) {
  const k = cKey_(acc.name), per = cPeriods_(acc.name);
  return getIdari_().filter(x => x.kind === 'visit' && !(x.data && x.data.viaSend === '1') && cKey_(x.center) === k && (() => {
    const p = String(x.period || '');
    if (!p) return true;
    return (p.indexOf('صباح') > -1 && per.m) || (p.indexOf('مسائ') > -1 && per.e);
  })()).map(x => { const o = Object.assign({}, x); delete o.owner; o.signed = !!(x.data && x.data.sigs && x.data.sigs.mgr); return o; });
}
function centerRoute_(r) {
  try {
    if (r.action === 'c_names') return { ok: true, data: centerAccounts_().map(a => ({ name: a.name, display: a.display })) };
    const acc = centerAuth_(r);
    if (r.action === 'c_login' || r.action === 'c_list') return { ok: true, center: { name: acc.name, display: acc.display }, data: centerReports_(acc), inbox: centerInbox_(acc) };
    if (r.action === 'c_file') { const x = outRows_().find(y => y.id === String(r.id || '') && y.to === 'c' && y.center === acc.name); if (!x) throw new Error('هذا النموذج لا يخص مركزكم'); return outFile_(x); }
    if (r.action === 'c_done') return withLock_(() => centerDone_(acc, r));
    if (r.action === 'c_sups') return { ok: true, data: listNames_('users', IDARI_UNIT).map(x => ({ u: x.u, n: x.n })) };   // مشرفات الإشراف الإداري
    if (r.action === 'c_hasr') return { ok: true, data: hasrFor_(x => x.center === acc.name) };
    if (r.action === 'c_hasr_save') return withLock_(() => hasrSave_(acc, r));
    if (r.action === 'c_hasr_del') return withLock_(() => hasrDel_(acc, r));
    if (r.action === 'c_hasr_sig') { const x = hasrFor_(y => y.id === String(r.id || '') && y.center === acc.name)[0]; if (!x) throw new Error('غير موجود'); return { ok: true, data: sigGet_(x.id + '|mgr') }; }
    if (r.action === 'c_sigs') {
      const rec = centerReports_(acc).find(x => x.id === String(r.id || ''));
      if (!rec) throw new Error('التقرير غير موجود');
      return { ok: true, data: getSigs_(['sup', 'mgr', 'ack'].map(k => ({ id: rec.id + '|' + k }))) };
    }
    if (r.action === 'c_sign') return withLock_(() => centerSign_(acc, r));
    throw new Error('إجراء غير معروف');
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}
function centerSign_(acc, r) {
  const id = String(r.id || ''), sig = String(r.signature || ''), signer = String(r.signer || '').trim().slice(0, 80);
  if (sig.indexOf('data:image/') !== 0 || sig.length > 49000) throw new Error('التوقيع غير صالح، أعيدي التوقيع');
  if (!centerReports_(acc).some(x => x.id === id)) throw new Error('هذا التقرير لا يخص مركزكم');
  const sh = ss_().getSheetByName(SHEET.IDARI);
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) !== id) continue;
    const row = i + 2;
    let data = {};
    try { data = JSON.parse(sh.getRange(row, 12).getValue() || '{}'); } catch (e) {}
    sigPut_(id + '|mgr', sig);
    data.sigs = data.sigs || {}; data.sigs.mgr = '1';
    data.mgrAt = nowStr_();
    sh.getRange(row, 12).setNumberFormat('@').setValue(JSON.stringify(data));
    if (signer) sh.getRange(row, 11).setNumberFormat('@').setValue(signer);   // اسم المديرة التي وقّعت
    return { ok: true, at: data.mgrAt };
  }
  throw new Error('التقرير غير موجود');
}

/* ============ «📤 إرسال للمركز»: أي نموذج محفوظ من أي وحدة يصل للمركز في «الوارد من المشرفات» ============
   المشرفة تختار المركز وطريقة الإرسال (اطلاع فقط / اطلاع وتوقيع) وملاحظة اختيارية.
   نسخة الملف (PDF أو Excel) تُحفظ في الدرايف بلا مشاركة عامة، ولا تُفتح إلا من حساب المركز أو حساب المشرفة المرسِلة. */
const OUT_SHEET = 'المرسل للمراكز';
const OUT_HEADERS = ['الرقم', 'وقت الإرسال', 'المرسِلة', 'اسم المستخدم', 'الوحدة', 'المصدر', 'رقم النموذج', 'العنوان', 'المركز',
  'الطريقة', 'الملاحظة', 'اسم الملف', 'معرف الملف', 'الحالة', 'وقت الإجراء', 'اسم المديرة', 'المستلمة', 'Teacher ID'];
// المستلمة: «مركز» (يظهر في صفحة المراكز، وعمود «المركز» فيه اسم حساب المركز) أو «معلمة» (يظهر في أيقونة «المعلمات»، وعمود «المركز» فيه اسم المعلمة)
const OUT_ST = { NEW: 'لم يُطّلع عليه', ACK: 'تم الاطلاع', SIGN: 'تم التوقيع' };
const OUT_MODE = { ack: 'اطلاع فقط', sign: 'اطلاع وتوقيع' };
const OUT_FOLDER = 'المرسل للمراكز';
const OUT_MAX_B64 = 14 * 1024 * 1024;   // حد حجم الملف المرسل (~10 ميجا)

function outSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(OUT_SHEET);
  if (!sh) {
    sh = ss.insertSheet(OUT_SHEET);
    sh.getRange(1, 1, 1, OUT_HEADERS.length).setValues([OUT_HEADERS]);
    styleHeader_(sh, OUT_HEADERS.length);
    sh.setRightToLeft(true);
    sh.setFrozenRows(1);
    sh.getRange('A:R').setNumberFormat('@');
  } else ensureExtraHeaders_(sh, OUT_HEADERS);
  return sh;
}
function outFolder_() {
  const p = folder_(), it = p.getFoldersByName(OUT_FOLDER);
  return it.hasNext() ? it.next() : p.createFolder(OUT_FOLDER);
}
function outRows_() {
  const sh = outSheet_(), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, OUT_HEADERS.length).getDisplayValues().map((v, i) => ({
    row: i + 2, id: v[0], at: v[1], supName: v[2], owner: String(v[3]).toLowerCase(), unit: v[4], src: v[5], srcId: v[6], title: v[7],
    center: v[8], mode: v[9] === OUT_MODE.sign ? 'sign' : 'ack', note: v[10], name: v[11], fileId: v[12],
    status: v[13] === OUT_ST.SIGN ? 'sign' : v[13] === OUT_ST.ACK ? 'ack' : 'new', doneAt: v[14], signer: v[15],
    to: v[16] === 'معلمة' ? 't' : 'c', tid: String(v[17] || '')
  })).filter(x => x.id);
}
const outPublic_ = x => { const o = Object.assign({}, x); delete o.row; delete o.fileId; delete o.owner; delete o.tid; return o; };
function outFile_(x) {
  if (!x.fileId) throw new Error('الملف غير موجود');
  const f = DriveApp.getFileById(x.fileId), b = f.getBlob();
  return { ok: true, name: x.name || f.getName(), mime: b.getContentType(), data: Utilities.base64Encode(b.getBytes()) };
}
function outCenters_() { return centerAccounts_().map(a => ({ name: a.name, display: a.display })); }

// إرسال (أو إعادة إرسال نسخة محدّثة إن لم يُطّلع عليه بعد)
function sendCenter_(r) {
  const me = profileOf_(r.username);
  const toT = r.to === 't';
  let acc = null, tch = null;
  if (toT && me.unit === IDARI_UNIT) throw new Error('الإرسال للمعلمات غير متاح في ' + IDARI_UNIT + '، الإرسال للمراكز فقط');
  if (toT) {   // إرسال لمعلمة من سجل المعلمات
    const tid = String(r.tid || '').trim();
    tch = tid ? certFind_(t => t.id === tid) : null;
    if (!tch) throw new Error('اختاري المعلمة من القائمة');
    acc = { name: tch.name };
  } else {
    acc = centerAccounts_().find(a => a.name === String(r.center || '').trim());
    if (!acc) throw new Error('اختاري المركز من القائمة');
  }
  const mode = r.mode === 'sign' ? 'sign' : 'ack';
  const data = String(r.data || '');
  if (!data) throw new Error('تعذّر تجهيز الملف');
  if (data.length > OUT_MAX_B64) throw new Error('حجم الملف كبير جداً');
  const title = String(r.title || 'نموذج').trim().slice(0, 200), note = String(r.note || '').trim().slice(0, 1000);
  const src = String(r.src || '').slice(0, 30), srcId = String(r.srcId || '').slice(0, 80);
  const name = String(r.name || 'ملف').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 150);
  const f = outFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(data), r.mime || 'application/pdf', name));
  const sh = outSheet_(), at = nowStr_();
  const same = x => toT ? (x.to === 't' && x.tid === tch.id) : (x.to === 'c' && x.center === acc.name);
  const old = srcId ? outRows_().find(x => x.owner === me.username && x.src === src && x.srcId === srcId && same(x) && x.status === 'new') : null;
  const vals = [old ? old.id : Utilities.getUuid(), at, me.name, me.username, me.unit, src, srcId, title, acc.name, OUT_MODE[mode], note, name, f.getId(), OUT_ST.NEW, '', '',
    toT ? 'معلمة' : 'مركز', toT ? tch.id : ''];
  if (old) {
    try { DriveApp.getFileById(old.fileId).setTrashed(true); } catch (e) {}
    sh.getRange(old.row, 1, 1, vals.length).setNumberFormat('@').setValues([vals]);
  } else {
    sh.getRange(sh.getLastRow() + 1, 1, 1, vals.length).setNumberFormat('@').setValues([vals]);
  }
  return { ok: true, replaced: !!old, item: outPublic_(outRows_().find(x => x.id === vals[0])), tPhone: toT ? (tch.phone || '') : '' };
}
function getSent_(r) {
  const u = norm_(r.username).toLowerCase();
  return outRows_().filter(x => x.owner === u).map(outPublic_).reverse();
}
function sentOwn_(r) {
  const u = norm_(r.username).toLowerCase(), x = outRows_().find(y => y.id === String(r.id || ''));
  if (!x || x.owner !== u) throw new Error('غير موجود');
  return x;
}
function unsend_(r) {
  const x = sentOwn_(r);
  try { DriveApp.getFileById(x.fileId).setTrashed(true); } catch (e) {}
  outSheet_().deleteRow(x.row);
  sigDel_(x.id + '|ctr');
  return { ok: true };
}

// جهة المركز
function centerInbox_(acc) {
  return outRows_().filter(x => x.to === 'c' && x.center === acc.name).map(x => { const o = outPublic_(x); delete o.unit; return o; }).reverse();
}
function centerDone_(acc, r) {
  const x = outRows_().find(y => y.id === String(r.id || '') && (acc.tid ? (y.to === 't' && y.tid === acc.tid) : (y.to === 'c' && y.center === acc.name)));
  if (!x) throw new Error(acc.tid ? 'هذا النموذج ليس لكِ' : 'هذا النموذج لا يخص مركزكم');
  if (x.status !== 'new') return { ok: true, at: x.doneAt, already: true };
  const signer = String(r.signer || '').trim().slice(0, 80), at = nowStr_();
  let sig = '';
  if (x.mode === 'sign') {
    sig = String(r.signature || '');
    if (!signer) throw new Error('اكتبي اسم مديرة المركز');
    if (sig.indexOf('data:image/') !== 0 || sig.length > 49000) throw new Error('التوقيع غير صالح، أعيدي التوقيع');
    sigPut_(x.id + '|ctr', sig);
  }
  outSheet_().getRange(x.row, 14, 1, 3).setNumberFormat('@').setValues([[x.mode === 'sign' ? OUT_ST.SIGN : OUT_ST.ACK, at, signer]]);
  // نماذج الإشراف الإداري التي فيها خانة «توقيع مديرة المركز»: يُكتب التوقيع في النموذج نفسه أيضاً
  if (sig && acc.tid && (x.src === 'sgh' || x.src === 'sge') && x.srcId) {   // تقرير/استمارة مرسلة لنفس المعلمة: يُكتب توقيعها فيها أيضاً
    try { teacherSign_({ id: acc.tid }, { id: x.srcId, signature: sig }); } catch (e) {}
  }
  if (sig && !acc.tid && x.src === 'idari' && x.srcId) {
    try {
      const sh = ss_().getSheetByName(SHEET.IDARI), n = sh.getLastRow() - 1;
      const ids = n > 0 ? sh.getRange(2, 1, n, 2).getValues() : [];
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) !== x.srcId) continue;
        if (idariKey_(ids[i][1]) !== 'visit') break;   // تقرير الزيارة فقط فيه خانة توقيع المديرة؛ باقي النماذج توقيع المشرفة فقط
        const row = i + 2;
        let data = {};
        try { data = JSON.parse(sh.getRange(row, 12).getValue() || '{}'); } catch (e) {}
        sigPut_(x.srcId + '|mgr', sig);
        data.sigs = data.sigs || {}; data.sigs.mgr = '1'; data.mgrAt = at;
        sh.getRange(row, 12).setNumberFormat('@').setValue(JSON.stringify(data));
        sh.getRange(row, 11).setNumberFormat('@').setValue(signer);
        break;
      }
    } catch (e) {}
  }
  if (sig && acc.tid && x.src === 'stf' && x.srcId) {   // وقّعت الموظفة من حسابها في «المعلمات»: يُكتب توقيعها في النموذج
    try { stfCenterSign_(x.srcId, '', '', sig, at); } catch (e) {}
  }
  if (!acc.tid && x.src === 'stf' && x.srcId && x.mode === 'sign') {
    const emp = String(r.empSig || '');
    try { stfCenterSign_(x.srcId, sig, signer, emp.indexOf('data:image/') === 0 && emp.length < 49000 ? emp : '', at); } catch (e) {}
  }
  return { ok: true, at };
}


/* ============ وحدة تحفيظ الصغار: إجراءات الموظفات ============
   أربعة نماذج: إنذار شفوي، إنذار خطي، تعهد موظفة مقصرة، ملاحظات على موظفة.
   تعبّئها المشرفة، وتوقّع الموظفة على جهازها (اختياري)، وتوقّع مديرة المركز من حساب المركز بعد «📤 إرسال للمركز» (اطلاع وتوقيع)
   فيُكتب توقيعها في النموذج نفسه. التواقيع في ورقة «التواقيع» بالمعرّف: الرقم|emp (الموظفة) و الرقم|mgr (المديرة) */
const STF_TYPES = { shafawi: 'إنذار شفوي لموظفة', khatti: 'إنذار خطي لموظفة', taahud: 'تعهد موظفة مقصرة', notes: 'ملاحظات على موظفة' };
const STF_HEADERS = ['الرقم', 'النموذج', 'اسم المركز', 'الفترة', 'الفصل الدراسي', 'اسم الموظفة', 'اليوم', 'التاريخ الهجري',
  'اسم المديرة', 'اسم المشرفة', 'البيانات', 'وقت التسجيل', 'المسجِّلة', 'الوحدة'];
const STF_DATA_COL = 11;

function stfSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET.STF);
  if (!sh) {
    sh = ss.insertSheet(SHEET.STF);
    sh.getRange(1, 1, 1, STF_HEADERS.length).setValues([STF_HEADERS]);
    styleHeader_(sh, STF_HEADERS.length);
    sh.setRightToLeft(true);
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, STF_HEADERS.length, 140);
    sh.setColumnWidth(STF_DATA_COL, 380);
  }
  return sh;
}
const stfKey_ = label => { for (const k in STF_TYPES) if (STF_TYPES[k] === label) return k; return ''; };
function getStf_() {
  const sh = ss_().getSheetByName(SHEET.STF);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, STF_HEADERS.length).getDisplayValues().filter(r => r[0]).map(r => {
    let data = {};
    try { data = JSON.parse(r[10] || '{}'); } catch (e) {}
    const form = data.form || stfKey_(r[1]);
    return { id: r[0], kind: 'stf', form: form, formName: STF_TYPES[form] || r[1], center: r[2], period: r[3], sem: r[4], teacher: r[5], day: r[6], hijri: r[7],
      mgrName: r[8], supName: r[9], data: data, at: r[11], owner: r[12] || '', unit: r[13] || '', date: data.greg || '' };
  }).reverse();
}
function getStfFor_(username) {
  const u = norm_(username).toLowerCase();
  return getStf_().filter(x => x.owner === u);
}
function stfRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}
function saveStf_(r) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 300);
  const me = profileOf_(r.username);
  if (me.unit !== SGH_UNIT) throw new Error('هذا الحساب ليس من ' + SGH_UNIT);
  const d = r.data && typeof r.data === 'object' ? r.data : {};
  const form = STF_TYPES[d.form] ? d.form : '';
  if (!form) throw new Error('نوع النموذج غير معروف');
  const list = (a, n) => (Array.isArray(a) ? a : []).map(x => s(x, 600)).filter(Boolean).slice(0, n || 20);
  const dd = o => (o && typeof o === 'object') ? { day: s(o.day, 10), d: s(o.d, 2), m: s(o.m, 2), y: s(o.y, 4) } : {};
  const data = {
    form: form, obs: list(d.obs), req: list(d.req), oral: dd(d.oral), written: dd(d.written),
    job: s(d.job, 120), years: s(d.years, 10), action: ['shafawi', 'khatti', 'taahud'].indexOf(d.action) > -1 ? d.action : '',
    hd: s(d.hd, 2), hm: s(d.hm, 2), hy: s(d.hy, 4), dayName: s(d.dayName, 10), greg: s(r.date, 10),
    tid: s(d.tid, 40), tName: s(d.tName, 200)   // الموظفة في سجل المعلمات (يُرسل لها النموذج بعد الحفظ)
  };
  if (!data.obs.length) throw new Error(form === 'taahud' ? 'اكتبي المخالفات' : 'اكتبي الملاحظات');
  const sigs = r.sigs && typeof r.sigs === 'object' ? r.sigs : {};
  const sh = stfSheet_();
  let id = s(r.id, 60), row = 0, old = null;
  if (id) {
    row = stfRow_(sh, id);
    if (!row) throw new Error('السجل غير موجود');
    old = sh.getRange(row, 1, 1, STF_HEADERS.length).getDisplayValues()[0];
    if (String(old[12]) !== me.username) throw new Error('لا يمكن تعديل نموذج سجّلته مشرفة أخرى');
  } else { id = Utilities.getUuid(); row = sh.getLastRow() + 1; }
  let oldData = {};
  if (old) { try { oldData = JSON.parse(old[10] || '{}'); } catch (e) {} }
  const os = oldData.sigs || {}, has = {};
  const v = String(sigs.emp || '');
  if (v === 'keep') { if (os.emp) { has.emp = '1'; if (oldData.empAt) data.empAt = oldData.empAt; } }
  else if (v.indexOf('data:image/') === 0) { if (v.length > 49000) throw new Error('صورة توقيع الموظفة كبيرة'); sigPut_(id + '|emp', v); has.emp = '1'; }
  else if (old && os.emp) sigDel_(id + '|emp');
  const vs = String(sigs.sup || '');   // توقيع المشرفة
  if (vs === 'keep') { if (os.sup) has.sup = '1'; }
  else if (vs.indexOf('data:image/') === 0) { if (vs.length > 49000) throw new Error('صورة توقيع المشرفة كبيرة'); sigPut_(id + '|sup', vs); has.sup = '1'; }
  else if (old && os.sup) sigDel_(id + '|sup');
  if (os.mgr) { has.mgr = '1'; data.mgrAt = oldData.mgrAt || ''; }   // توقيع المديرة من حساب المركز يبقى كما هو
  data.sigs = has;
  const json = JSON.stringify(data);
  if (json.length > 45000) throw new Error('النموذج طويل جداً، اختصري النص');
  const hTxt = data.hy ? data.hd + '/' + data.hm + '/' + data.hy + 'هـ' : '';
  const mgrName = os.mgr && old ? String(old[8] || '') : s(r.mgrName, 120);
  const vals = [[id, STF_TYPES[form], s(r.center, 200), s(r.period, 20), s(r.sem, 20), s(r.teacher, 200), data.dayName, hTxt,
    mgrName, s(r.supName, 120), json, old ? String(old[11] || nowStr_()) : nowStr_(), me.username, me.unit]];
  sh.getRange(row, 1, 1, vals[0].length).setNumberFormat('@').setValues(vals);
  return { ok: true, id: id, sigs: has, mgrName: mgrName };
}
function deleteStf_(r) {
  const id = String(r.id || ''), me = profileOf_(r.username);
  const sh = ss_().getSheetByName(SHEET.STF);
  const row = sh && id ? stfRow_(sh, id) : 0;
  if (!row) throw new Error('السجل غير موجود');
  if (String(sh.getRange(row, 13).getDisplayValue()) !== me.username) throw new Error('لا يمكن حذف نموذج سجّلته مشرفة أخرى');
  sh.deleteRow(row);
  sigDel_(id + '|emp'); sigDel_(id + '|mgr'); sigDel_(id + '|sup');
  return { ok: true };
}
// توقيع مديرة المركز (وتوقيع الموظفة إن وقّعت عندها) من صفحة المراكز يُكتب في النموذج نفسه
function stfCenterSign_(id, sig, signer, empSig, at) {
  const sh = ss_().getSheetByName(SHEET.STF);
  const row = sh ? stfRow_(sh, id) : 0;
  if (!row) return;
  let data = {};
  try { data = JSON.parse(sh.getRange(row, STF_DATA_COL).getValue() || '{}'); } catch (e) {}
  data.sigs = data.sigs || {};
  if (sig) { sigPut_(id + '|mgr', sig); data.sigs.mgr = '1'; data.mgrAt = at; if (signer) sh.getRange(row, 9).setNumberFormat('@').setValue(signer); }
  if (empSig) { sigPut_(id + '|emp', empSig); data.sigs.emp = '1'; data.empAt = at; }
  sh.getRange(row, STF_DATA_COL).setNumberFormat('@').setValue(JSON.stringify(data));
}

// النماذج المرسلة للمعلمة بزر «📤 إرسال» (اطلاع فقط أو اطلاع وتوقيع)
function teacherInbox_(t) {
  return outRows_().filter(x => x.to === 't' && x.tid === t.id).map(x => { const o = outPublic_(x); delete o.unit; return o; }).reverse();
}


/* ============ «حصر الغياب والتأخير والاستئذان» من صفحة «إدارة المراكز» إلى مشرفة الإشراف الإداري ============
   يعبّئه المركز لكل فصل دراسي (ثلاثة أشهر لكل موظفة)، وتوقّع المديرة، ويُرسل لمشرفة يختارها المركز من مشرفات الإشراف الإداري،
   فيصلها في صفحة الإشراف الإداري تحت «الوارد من المراكز» مع تنبيه. توقيع المديرة في ورقة «التواقيع» بالمعرّف: الرقم|mgr */
const HASR_SHEET = 'حصر الغياب والتأخير';
const HASR_HEADERS = ['الرقم', 'المركز', 'الفترة', 'الفصل الدراسي', 'العام', 'اسم المديرة', 'المشرفة (اسم الدخول)', 'اسم المشرفة',
  'عدد الموظفات', 'البيانات', 'وقت الإرسال', 'الحالة', 'وقت الاطلاع'];
function hasrSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(HASR_SHEET);
  if (!sh) {
    sh = ss.insertSheet(HASR_SHEET);
    sh.getRange(1, 1, 1, HASR_HEADERS.length).setValues([HASR_HEADERS]);
    styleHeader_(sh, HASR_HEADERS.length);
    sh.setRightToLeft(true); sh.setFrozenRows(1);
    sh.setColumnWidths(1, HASR_HEADERS.length, 140); sh.setColumnWidth(10, 380);
    sh.getRange('A:M').setNumberFormat('@');
  }
  return sh;
}
function hasrRows_() {
  const sh = hasrSheet_(), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, HASR_HEADERS.length).getDisplayValues().map((v, i) => {
    let data = {};
    try { data = JSON.parse(v[9] || '{}'); } catch (e) {}
    return { row: i + 2, id: v[0], center: v[1], period: v[2], sem: v[3], year: v[4], mgrName: v[5], sup: String(v[6]).toLowerCase(), supName: v[7],
      count: v[8], data: data, at: v[10], seen: v[11] === 'تم الاطلاع', seenAt: v[12] };
  }).filter(x => x.id);
}
function hasrFor_(test) {
  const disp = {};
  centerAccounts_().forEach(a => { disp[a.name] = a.display; });
  return hasrRows_().filter(test).map(x => { const o = Object.assign({}, x); delete o.row; o.centerDisplay = disp[x.center] || x.center; return o; }).reverse();
}
function hasrSave_(acc, r) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 200);
  const sup = listNames_('users', IDARI_UNIT).find(x => norm_(x.u).toLowerCase() === norm_(r.sup).toLowerCase());
  if (!sup) throw new Error('اختاري المشرفة من القائمة');
  const d = r.data && typeof r.data === 'object' ? r.data : {};
  const num = v => { v = String(v == null ? '' : v).replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).trim(); return /^\d{1,4}$/.test(v) ? v : ''; };
  const rows = (Array.isArray(d.rows) ? d.rows : []).slice(0, 80).map(x => ({
    name: s(x && x.name, 120), job: s(x && x.job, 80), note: s(x && x.note, 300),
    m: [0, 1, 2].map(k => { const o = (x && x.m && x.m[k]) || {}; return { z: num(o.z), g: num(o.g), j: num(o.j), t: num(o.t), e: num(o.e) }; })
  })).filter(x => x.name);
  if (!rows.length) throw new Error('أضيفي موظفة واحدة على الأقل');
  const data = { rows: rows, months: (Array.isArray(d.months) ? d.months : []).slice(0, 3).map(x => s(x, 30)), hd: s(d.hd, 2), hm: s(d.hm, 2), hy: s(d.hy, 4) };
  const json = JSON.stringify(data);
  if (json.length > 45000) throw new Error('الحصر طويل جداً');
  const sig = String(r.signature || '');
  const sh = hasrSheet_();
  let id = s(r.id, 60), row = 0, old = null;
  if (id) {
    old = hasrRows_().find(x => x.id === id);
    if (!old || old.center !== acc.name) throw new Error('الحصر غير موجود');
    row = old.row;
  } else { id = Utilities.getUuid(); row = sh.getLastRow() + 1; }
  if (sig.indexOf('data:image/') === 0) { if (sig.length > 49000) throw new Error('صورة التوقيع كبيرة'); sigPut_(id + '|mgr', sig); data.sig = '1'; }
  else if (sig === 'keep' && old && old.data.sig) data.sig = '1';
  else throw new Error('وقّعي في خانة توقيع مديرة المركز');
  sh.getRange(row, 1, 1, HASR_HEADERS.length).setNumberFormat('@').setValues([[id, acc.name, s(r.period, 20), s(r.sem, 20), s(r.year, 4), s(r.mgrName, 120),
    norm_(sup.u).toLowerCase(), sup.n, String(rows.length), JSON.stringify(data), nowStr_(), 'جديد', '']]);
  return { ok: true, id: id, at: nowStr_(), supName: sup.n };
}
function hasrDel_(acc, r) {
  const x = hasrRows_().find(y => y.id === String(r.id || '') && y.center === acc.name);
  if (!x) throw new Error('الحصر غير موجود');
  if (x.seen) throw new Error('اطّلعت عليه المشرفة، فلا يمكن حذفه');
  hasrSheet_().deleteRow(x.row); sigDel_(x.id + '|mgr');
  return { ok: true };
}
function hasrSeen_(r) {
  const u = norm_(r.username).toLowerCase(), x = hasrRows_().find(y => y.id === String(r.id || '') && y.sup === u);
  if (!x) throw new Error('غير موجود');
  if (x.seen) return { ok: true, at: x.seenAt };
  const at = nowStr_();
  hasrSheet_().getRange(x.row, 12, 1, 2).setNumberFormat('@').setValues([['تم الاطلاع', at]]);
  return { ok: true, at: at };
}


/* ============ المراكز المشرفة عليها (لكل مشرفة) ============
   ورقة «مراكز المشرفات»: صف لكل مشرفة فيه قائمة المراكز التي تشرف عليها (JSON).
   تُستخدم في إحصائية تقارير الزيارة: المراكز التي تمت زيارتها والتي لم تتم زيارتها. */
const MYC_SHEET_ = 'مراكز المشرفات';
function mycSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(MYC_SHEET_);
  if (!sh) {
    sh = ss.insertSheet(MYC_SHEET_);
    sh.getRange(1, 1, 1, 3).setValues([['المستخدم', 'المراكز', 'آخر تحديث']])
      .setBackground('#7a1f2b').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    sh.setFrozenRows(1);
  }
  return sh;
}
function mycRow_(sh, u) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim().toLowerCase() === u) return i + 2;
  return 0;
}
function myCentersGet_(username) {
  const sh = ss_().getSheetByName(MYC_SHEET_);
  if (!sh) return [];
  const row = mycRow_(sh, norm_(username).toLowerCase());
  if (!row) return [];
  try { const a = JSON.parse(sh.getRange(row, 2).getValue() || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function myCentersSave_(r) {
  const list = (Array.isArray(r.centers) ? r.centers : []).map(c => String(c || '').trim().slice(0, 200)).filter(Boolean).slice(0, 500);
  const sh = mycSheet_(), u = norm_(r.username).toLowerCase();
  const row = mycRow_(sh, u) || sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[u, JSON.stringify(list), Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm')]]);
  return { ok: true, data: list };
}
