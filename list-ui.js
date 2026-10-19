/* ===== شكل موحّد لقوائم النماذج المحفوظة (بطاقات مرتّبة بدل الجداول العريضة) =====
   كل نموذج بطاقة: العنوان، ثم سطر التفاصيل، ثم الحالات (التوقيع، الإرسال)، ثم أزرار قليلة واضحة،
   وباقي الإجراءات (طباعة، مشاركة، تعديل، حذف...) داخل زر «⋯ المزيد».
   rcCard({ no, title, sub, meta: [نص...], tags: html, main: [[نص, onclick, صنف]], more: [[نص, onclick, صنف]] }) */
(function () {
  const st = document.createElement('style');
  st.textContent = `
.rc-list{display:flex;flex-direction:column;gap:10px}
.rc{border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;background:#fff}
.rc-top{display:flex;align-items:flex-start;gap:10px}
.rc-no{flex:none;min-width:28px;height:28px;border-radius:50%;background:#f6f0f2;color:var(--primary);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
.rc-h{flex:1;min-width:0}
.rc-t{display:block;color:var(--primary);font-weight:800;font-size:16px;line-height:1.5}
.rc-sub{display:block;font-size:13px;color:var(--muted);font-weight:700;margin-top:1px}
.rc-meta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:14px;color:var(--muted);margin:8px 0 0;line-height:1.7}
.rc-meta span b{color:var(--ink,#333);font-weight:700}
.rc-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.rc-tags:empty{display:none}
.rc-tags .sc-st{cursor:pointer}
.rc-act{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)}
.rc-act .btn{padding:7px 12px;font-size:13px;flex:0 0 auto}
.rc-more{position:fixed;z-index:60;background:#fff;border:1.5px solid var(--line);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.15);padding:6px;min-width:190px;display:flex;flex-direction:column}
.rc-more button{background:none;border:0;text-align:right;padding:10px 12px;border-radius:8px;font:inherit;font-size:15px;font-weight:600;color:var(--ink,#333);cursor:pointer}
.rc-more button:hover{background:#f6f0f2}
.rc-more button.danger{color:#b71c1c}
.rc-more hr{border:0;border-top:1px solid var(--line);margin:4px 0}
.rc-empty{text-align:center;color:var(--muted);padding:18px 8px}
`;
  document.head.appendChild(st);
})();
const RC_MORE = [];
function rcCard(o) {
  const b = (x, i, pre) => '<button class="btn ' + (x[2] || 'light') + '" onclick="' + x[1] + '">' + x[0] + '</button>';
  let more = '';
  if (o.more && o.more.length) {
    const k = RC_MORE.push(o.more) - 1;
    more = '<button class="btn light" onclick="rcMore(' + k + ', this)">⋯ المزيد</button>';
  }
  return '<div class="rc"><div class="rc-top">' + (o.no != null ? '<span class="rc-no">' + o.no + '</span>' : '') +
    '<div class="rc-h"><span class="rc-t">' + (o.title || '') + '</span>' + (o.sub ? '<span class="rc-sub">' + o.sub + '</span>' : '') + '</div></div>' +
    (o.meta && o.meta.filter(Boolean).length ? '<div class="rc-meta">' + o.meta.filter(Boolean).map(x => '<span>' + x + '</span>').join('') + '</div>' : '') +
    '<div class="rc-tags">' + (o.tags || '') + '</div>' +
    '<div class="rc-act">' + (o.main || []).filter(Boolean).map(b).join('') + more + '</div></div>';
}
// تبدأ كل قائمة جديدة بمسح قائمة «المزيد» القديمة
function rcStart() { RC_MORE.length = 0; rcClose(); }
const rcEmpty = t => '<p class="rc-empty">' + t + '</p>';
const rcM = (label, value) => value ? label + ': <b>' + value + '</b>' : '';
function rcClose() { const m = document.getElementById('rcMore'); if (m) m.remove(); }
function rcMore(k, btn) {
  const was = document.getElementById('rcMore');
  rcClose();
  if (was && was._btn === btn) return;
  const L = RC_MORE[k] || [];
  const m = document.createElement('div');
  m.id = 'rcMore'; m.className = 'rc-more'; m._btn = btn;
  m.innerHTML = L.map(x => x === '-' ? '<hr>' : '<button class="' + (x[2] === 'danger' ? 'danger' : '') + '">' + x[0] + '</button>').join('');
  [...m.querySelectorAll('button')].forEach((el, i) => {
    const x = L.filter(y => y !== '-')[i];
    el.onclick = () => { rcClose(); (new Function('btn', x[1].replace(/\bthis\b/g, 'btn')))(btn); };
  });
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  let top = r.bottom + 6; if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
  let left = r.right - w; if (left < 8) left = 8; if (left + w > innerWidth - 8) left = innerWidth - w - 8;
  m.style.top = top + 'px'; m.style.left = left + 'px';
}
document.addEventListener('click', e => { const m = document.getElementById('rcMore'); if (m && !m.contains(e.target) && e.target !== m._btn) rcClose(); }, true);
window.addEventListener('scroll', rcClose, true);
window.addEventListener('resize', rcClose);
