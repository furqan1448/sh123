// ===== الإعدادات =====
// الصقي هنا رابط الـ Web App بعد النشر (ينتهي بـ /exec)
const API_URL = 'ضع_رابط_Web_App_هنا';

const PW_KEY = 'mush_pw';
const getPw = () => sessionStorage.getItem(PW_KEY) || '';

// استدعاء الـ API (POST بنوع text/plain لتفادي مشاكل CORS) مع إعادة محاولة تلقائية
async function api(action, data = {}) {
  const body = JSON.stringify({ action, password: getPw(), ...data });
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
      if (!out.ok) throw Object.assign(new Error(out.error || 'حدث خطأ'), { final: true });
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
  btn.textContent = show ? '🙈' : '👁️';
}

// شعار
function applyLogo() {
  document.querySelectorAll('img.logo').forEach(img => {
    img.src = FURQAN_LOGO_URL;
    img.onerror = () => img.style.display = 'none';
  });
}
document.addEventListener('DOMContentLoaded', applyLogo);
