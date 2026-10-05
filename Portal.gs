/**
 * بوابة المعلمات — الخادم (المرحلة 2 + 3)
 * يقرأ سجل المعلمات من شيت الشهادات (قراءة فقط) ولا يعدّل فيه شيئًا.
 */
const PORTAL = {
  CERT_SHEET_ID: '10SGdGcDEUJS0G8_s_m12Ix8A7hoN4iPLWm_p7yi6j88',
  CERT_SHEET_HINT: 'شهادة',
  COLS: { pass: 'م', name: 'اسم المعلمة', cat: 'الفئة المناسبة للتدريس', phone: 'رقم الجوال', id: 'Teacher ID' },
  SUPERVISORS_URL: 'https://script.google.com/macros/s/AKfycbwprgzy25H8WcXQvHVfeEjWsMVwXm1jQW5IbnJPmO7r-qg09BIFZljZBUlwmucDgSGmbw/exec',
  TOKEN_HOURS: 24,
  MAX_FAILS: 5,
  LOCK_MIN: 15,
  LOG_SHEET: 'سجل الدخول'
};

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(msg, auth) { return { ok: false, error: msg, auth: !!auth }; }

function pPhone_(v) {
  let p = String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
  if (p.indexOf('966') === 0) p = '0' + p.slice(3);
  if (p.length === 9) p = '0' + p;
  return p;
}

// سجل المعلمات من شيت الشهادات (قراءة فقط)
function registry_() {
  const ss = SpreadsheetApp.openById(PORTAL.CERT_SHEET_ID);
  const sh = ss.getSheets().find(s => s.getName().indexOf(PORTAL.CERT_SHEET_HINT) !== -1);
  if (!sh) throw new Error('ورقة الشهادات غير موجودة');
  const v = sh.getDataRange().getDisplayValues();
  const hr = v.findIndex(r => r.some(c => String(c).trim() === PORTAL.COLS.name));
  if (hr < 0) throw new Error('صف العناوين غير موجود');
  const h = v[hr].map(c => String(c).trim());
  const ix = {};
  Object.keys(PORTAL.COLS).forEach(k => ix[k] = h.indexOf(PORTAL.COLS[k]));
  if (ix.name < 0 || ix.phone < 0 || ix.pass < 0 || ix.id < 0) throw new Error('أعمدة ناقصة في ورقة الشهادات');
  const rows = [];
  for (let i = hr + 1; i < v.length; i++) {
    const r = v[i];
    const t = {
      id: String(r[ix.id]).trim(),
      name: String(r[ix.name]).trim(),
      cat: ix.cat >= 0 ? String(r[ix.cat]).trim() : '',
      phone: pPhone_(r[ix.phone]),
      pass: String(r[ix.pass]).trim().toUpperCase()
    };
    if (t.name && t.phone.length === 10) rows.push(t);
  }
  return rows;
}

function pub_(t) { return { id: t.id, name: t.name, category: t.cat, phone: t.phone }; }

// ===== رمز الجلسة الموقّع =====
function secret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('PORTAL_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('PORTAL_SECRET', s); }
  return s;
}
function sign_(obj) {
  const body = Utilities.base64EncodeWebSafe(Utilities.newBlob(JSON.stringify(obj)).getBytes());
  return body + '.' + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, secret_()));
}
function verify_(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  if (Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], secret_())) !== parts[1]) return null;
  const obj = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  return obj.exp > Date.now() ? obj : null;
}

// ===== سجل الدخول =====
function log_(event, who) {
  try {
    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName(PORTAL.LOG_SHEET);
    if (!sh) {
      sh = ss.insertSheet(PORTAL.LOG_SHEET);
      sh.appendRow(['الوقت', 'الحدث', 'المعلمة']);
      sh.setRightToLeft(true);
    }
    sh.appendRow([new Date(), event, who]);
  } catch (e) { Logger.log(e); }
}
const mask_ = phone => '******' + String(phone).slice(-4);

// ===== الإجراءات =====
function login_(req) {
  const phone = pPhone_(req.phone);
  const pass = String(req.password || '').trim().toUpperCase();
  if (phone.length !== 10 || !pass) return fail_('تحققي من رقم الجوال وكلمة المرور.');

  const cache = CacheService.getScriptCache();
  const key = 'fails_' + phone;
  const fails = Number(cache.get(key) || 0);
  if (fails >= PORTAL.MAX_FAILS) {
    log_('محظور مؤقتًا', mask_(phone));
    return fail_('تم إيقاف المحاولات مؤقتًا. حاولي بعد ' + PORTAL.LOCK_MIN + ' دقيقة.');
  }
  const t = registry_().find(r => r.phone === phone && r.pass === pass && r.id);
  if (!t) {
    cache.put(key, String(fails + 1), PORTAL.LOCK_MIN * 60);
    log_('فشل الدخول', mask_(phone));
    return fail_('رقم الجوال أو كلمة المرور غير صحيحة.');
  }
  cache.remove(key);
  log_('دخول ناجح', t.id);
  return { ok: true, token: sign_({ tid: t.id, exp: Date.now() + PORTAL.TOKEN_HOURS * 3600 * 1000 }), teacher: pub_(t) };
}

function me_(req) {
  const s = verify_(req.token);
  if (!s) return fail_('انتهت الجلسة، سجلي الدخول من جديد.', true);
  const t = registry_().find(r => r.id === s.tid);
  if (!t) return fail_('الحساب غير موجود.', true);
  return { ok: true, teacher: pub_(t) };
}

// ملاحظات المشرفة: المعرّف يؤخذ من الرمز الموقّع فقط، وليس مما يرسله المتصفح
function notes_(req) {
  const s = verify_(req.token);
  if (!s) return fail_('انتهت الجلسة، سجلي الدخول من جديد.', true);
  const key = PropertiesService.getScriptProperties().getProperty('PORTAL_KEY');
  if (!key) return fail_('لم يُضبط مفتاح الربط بعد.');
  const res = UrlFetchApp.fetch(PORTAL.SUPERVISORS_URL, {
    method: 'post', contentType: 'text/plain', muteHttpExceptions: true,
    payload: JSON.stringify({ action: 'portalNotes', key: key, tid: s.tid })
  });
  const data = JSON.parse(res.getContentText());
  if (!data.ok) return fail_('تعذر جلب الملاحظات حاليًا.');
  return { ok: true, items: data.items };
}

/** شغّليها مرة واحدة: تنشئ مفتاح الربط وتعرضه لتنسخيه إلى نظام المشرفات */
function portalMakeKey() {
  const p = PropertiesService.getScriptProperties();
  let k = p.getProperty('PORTAL_KEY');
  if (!k) { k = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); p.setProperty('PORTAL_KEY', k); }
  SpreadsheetApp.getUi().alert('مفتاح الربط (انسخيه كاملًا)', k, SpreadsheetApp.getUi().ButtonSet.OK);
}

function doGet() { return out_({ ok: true, service: 'teacher-portal' }); }

function doPost(e) {
  try {
    const req = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (req.action === 'login') return out_(login_(req));
    if (req.action === 'me') return out_(me_(req));
    if (req.action === 'notes') return out_(notes_(req));
    return out_(fail_('طلب غير معروف'));
  } catch (err) {
    Logger.log(err);
    return out_(fail_('تعذر تنفيذ الطلب، حاولي مرة أخرى.'));
  }
}
