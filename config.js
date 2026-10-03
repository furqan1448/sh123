// ===== الإعدادات =====
// الصقي هنا رابط الـ Web App بعد النشر (ينتهي بـ /exec)
const API_URL ="https://script.google.com/macros/s/AKfycbyGAISrwXCoDJOnuhbOXgmbYj2pRsDzIIHonwynFpeit_5KIFi-oIdU1nI-AVn5291xbA/exec";

const PW_KEY = 'mush_pw';
const USER_KEY = 'mush_user';
const getPw = () => localStorage.getItem(PW_KEY) || '';
const getUser = () => localStorage.getItem(USER_KEY) || '';

// استدعاء الـ API (POST بنوع text/plain لتفادي مشاكل CORS) مع إعادة محاولة تلقائية
async function api(action, data = {}) {
  const body = JSON.stringify({ action, username: getUser(), password: getPw(), ...data });
  let lastErr;
  for (let i = 0; i < 3; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body, signal: ctrl.signal
      });
      clearTimeout(t);
      const out = await res.json();
      if (!out.ok) throw Object.assign(new Error(out.error || 'حدث خطأ'), { final: true, auth: String(out.error || '').indexOf('كلمة المرور') > -1 });
      return out;
    } catch (e) {
      clearTimeout(t);
      if (e.final) throw e;
      lastErr = e;
    }
  }
  throw new Error('تعذّر الاتصال بالخادم، تأكدي من الإنترنت ورابط النشر');
}

// زر بحالة انتظار
function setBtnBusy(btn, busy, text) {
  if (busy) { btn.dataset.t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + (text || 'جارِ الحفظ...'); }
  else { btn.disabled = false; btn.innerHTML = btn.dataset.t || btn.innerHTML; }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, ok = true) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'show ' + (ok ? 'ok' : 'err');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 3200);
}

function togglePassword(inputId, btn) {
  const i = document.getElementById(inputId);
  const show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  btn.innerHTML = show
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// شعار
function applyLogo() {
  document.querySelectorAll('img.logo').forEach(img => {
    img.src = FURQAN_LOGO_URL;
    img.onerror = () => img.style.display = 'none';
  });
}
document.addEventListener('DOMContentLoaded', applyLogo);
