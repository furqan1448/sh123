// سجل المعلمات يُحفظ في الكاش 6 ساعات، فيصبح البحث بالجوال فوريًا بدل فتح شيت الشهادات في كل مرة.
// إذا لم توجد المعلمة في الكاش نعيد قراءة الشيت (مرة كل دقيقة كحد أقصى) لتظهر المعلمات المضافات حديثًا.
const CERT_CACHE_KEY = 'cert_v1', CERT_CACHE_TTL = 21600;
function certRowsFresh_() {
  const sh = SpreadsheetApp.openById(CERT_SHEET_ID).getSheets().find(s => s.getName().indexOf('شهادة') !== -1);
  const v = sh.getDataRange().getDisplayValues();
  const hr = v.findIndex(r => r.some(c => String(c).trim() === 'اسم المعلمة'));
  const h = v[hr].map(c => String(c).trim());
  const n = h.indexOf('اسم المعلمة'), ph = h.indexOf('رقم الجوال'), id = h.indexOf('Teacher ID');
  return v.slice(hr + 1).filter(r => String(r[id]).trim()).map(r => ({ id: String(r[id]).trim(), name: String(r[n]).trim(), phone: pPhone_(r[ph]) }));
}
function certCachePut_(rows) {
  try {
    const s = JSON.stringify(rows.map(t => [t.id, t.name, t.phone])), CH = 30000, cnt = Math.ceil(s.length / CH);
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
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(CERT_CACHE_KEY + '_' + i);
    const parts = c.getAll(keys);
    let s = '';
    for (let i = 0; i < n; i++) { const p = parts[keys[i]]; if (p == null) return null; s += p; }
    return JSON.parse(s).map(a => ({ id: a[0], name: a[1], phone: a[2] }));
  } catch (e) { return null; }
}
function certCacheOld_() {
  const at = Number(CacheService.getScriptCache().get(CERT_CACHE_KEY + '_at') || 0);
  return Date.now() - at > 60000;
}
function certRows_(fresh) {
  if (!fresh) { const hit = certCacheGet_(); if (hit) return hit; }
  const rows = certRowsFresh_();
  certCachePut_(rows);
  return rows;
}
function certFind_(test) {
  let hit = certRows_(false).filter(test);
  if (!hit.length && certCacheOld_()) hit = certRows_(true).filter(test);
  return hit.length === 1 ? hit[0] : null;
}
function teacherByPhone_(phone) {
  const p = pPhone_(phone);
  if (p.length !== 10) return null;
  return certFind_(t => t.phone === p);
}
function teacherById_(tid) {
  const id = String(tid || '').trim();
  if (!id) return null;
  return certFind_(t => t.id === id);
}
