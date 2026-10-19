/* ===== الإشراف الإداري: «الوارد من المراكز» — حصر الغياب والتأخير والاستئذان المرسل من صفحة «إدارة المراكز» =====
   يصل للمشرفة التي اختارها المركز، مع تنبيه بعدد ما لم تطّلع عليه. يُعلَّم «تم الاطلاع» عند فتحه. الشكل في hasr.js */
let HSI = [], hsiAt = 0;
ALL_VIEWS.push('hsInView', 'hsInDoc');
function hsiOpen() { show('hsInView'); hsiLoad(); }
async function hsiLoad(silent) {
  if (!HSI.length) { const c = cacheGet('hsi'); if (c) { HSI = c; hsiRender(); } }
  hsiAt = Date.now();
  try { HSI = (await api('getHasr')).data || []; cacheSet('hsi', HSI); hsiRender(); }
  catch (e) { if (!silent) toast(e.message, false); }
}
function hsiBadge() {
  const n = HSI.filter(x => !x.seen).length;
  $('hsiBadge').textContent = idDigits(n); $('hsiBadge').classList.toggle('hidden', !n);
  $('hsiBanner').classList.toggle('hidden', !n);
  $('hsiBanner').textContent = n ? '🔔 وصلكِ ' + idDigits(n) + (n === 1 ? ' حصر غياب جديد من المراكز' : ' حصر غياب جديدة من المراكز') + ' — اضغطي للاطلاع' : '';
}
const hsiById = id => HSI.find(x => x.id === id);
function hsiRender() {
  hsiBadge();
  const box = $('hsiList'); if (!box) return;
  const q = scNorm($('hsiQ').value), f = $('hsiF').value;
  const L = HSI.filter(x => (!q || scNorm(x.centerDisplay + ' ' + x.center).indexOf(q) > -1) && (!f || (f === 'new' ? !x.seen : x.seen)));
  rcStart();
  if (!L.length) { box.innerHTML = rcEmpty(HSI.length ? 'لا توجد نتائج' : 'لم يصلكِ أي حصر بعد'); return; }
  box.innerHTML = L.map((r, i) => {
    const id = esc(r.id);
    return rcCard({ no: idDigits(i + 1), title: esc(r.centerDisplay || r.center), sub: esc(['الفصل ' + (r.sem || '—'), r.year ? idDigits(r.year) + 'هـ' : '', r.period].filter(Boolean).join(' — ')),
      meta: [rcM('المديرة', esc(r.mgrName)), rcM('عدد الموظفات', idDigits(r.count)), rcM('وصل', esc(idDigits(r.at)))],
      tags: r.seen ? '<span class="tag ok">✔ اطّلعتِ عليه' + (r.seenAt ? ' <small>' + esc(idDigits(r.seenAt)) + '</small>' : '') + '</span>' : '<span class="tag warn">🔔 جديد</span>',
      main: [['عرض', 'hsiView(\'' + id + '\')', r.seen ? 'light' : ''], ['PDF', 'hsiDo(\'' + id + '\', this, \'pdf\')'], ['Excel', 'hsiDo(\'' + id + '\', this, \'xlsx\')']] });
  }).join('');
}
const hsiSigs = {};
async function hsiSig(r) {
  if (!r.data || !r.data.sig) return '';
  if (hsiSigs[r.id] == null) { try { hsiSigs[r.id] = (await api('hasrSig', { id: r.id })).data || ''; } catch (e) { return ''; } }
  return hsiSigs[r.id];
}
async function hsiSeen(r) {
  if (r.seen) return;
  try { const o = await api('hasrSeen', { id: r.id }); r.seen = true; r.seenAt = o.at; cacheSet('hsi', HSI); hsiRender(); } catch (e) {}
}
async function hsiDo(id, btn, what) {
  const r = hsiById(id); if (!r) return;
  if (what === 'xlsx') hsXlsx(r, btn); else hsPdf(r, btn, await hsiSig(r));
  hsiSeen(r);
}
async function hsiView(id) {
  const r = hsiById(id); if (!r) return;
  $('hsiBar').innerHTML = '<button class="btn light" id="hsiVPdf">تحميل PDF</button><button class="btn light" id="hsiVX">تحميل Excel</button>';
  $('hsiDoc').innerHTML = '<p class="empty">جارِ التحميل...</p>';
  show('hsInDoc');
  const sig = await hsiSig(r);
  $('hsiVPdf').onclick = e => hsPdf(r, e.currentTarget, sig);
  $('hsiVX').onclick = e => hsXlsx(r, e.currentTarget);
  $('hsiDoc').innerHTML = '<div class="hs-box">' + hsViewHtml(r, sig) + '</div>';
  hsFit($('hsiDoc').querySelector('.hs-box'));
  hsiSeen(r);
}
window.addEventListener('resize', () => hsFit(document.querySelector('#hsiDoc .hs-box')));
// التنبيه في الرئيسية: يُحدَّث مع تحميل النماذج (مرة كل دقيقة على الأكثر)
(function () {
  const o = window.loadIdari;
  window.loadIdari = function () { const r = o.apply(this, arguments); if (Date.now() - hsiAt > 60000) hsiLoad(true); return r; };
  const c = cacheGet('hsi'); if (c) { HSI = c; hsiBadge(); }
  if (getPw() && getUser()) hsiLoad(true);
})();
