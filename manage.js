/* ===== إدارة الوحدات: متابعة مشرفات كل وحدة (تظهر لمديرات الوحدات فقط) ===== */
// صفحة مستقلة (units.html). الدور يأتي من ورقة «المستخدمات» (عمود الدور): sup = مشرفة، mgr = مديرة وحدة، admin = مديرة عامة (كل الوحدات)
let MG = null, mgTab = 'visits';
const MG_NONE = 'غير محدد (سجلات قديمة)';
const MG_LIMIT = 300;   // أقصى عدد صفوف تُعرض في التفاصيل

const $ = id => document.getElementById(id);
const MG_DENY = 'هذه الصفحة لمديرات الوحدات فقط';

function show(id) {
  ['loginView', 'manageView'].forEach(v => $(v).classList.add('hidden'));
  $(id).classList.remove('hidden');
  window.scrollTo(0, 0);
}

async function doLogin() {
  const un = $('un').value.trim(), pw = $('pw').value.trim();
  if (!un) return toast('أدخلي اسم المستخدم', false);
  if (!pw) return toast('أدخلي كلمة المرور', false);
  const btn = $('loginBtn'), oldU = getUser(), oldP = getPw();
  localStorage.setItem(USER_KEY, un); localStorage.setItem(PW_KEY, pw);
  setBtnBusy(btn, true, 'جارِ التحقق...');
  try {
    MG = await api('getManage');
    show('manageView'); mgFillUnits(); mgRender();
  } catch (e) {
    // نُرجع بيانات الدخول السابقة (قد تكون جلسة مشرفة في صفحة المشرفات) ولا نمسحها
    if (oldU && oldP) { localStorage.setItem(USER_KEY, oldU); localStorage.setItem(PW_KEY, oldP); }
    else { localStorage.removeItem(USER_KEY); localStorage.removeItem(PW_KEY); }
    toast(e.message === MG_DENY ? 'هذا الحساب ليس مديرة وحدة' : e.message, false);
  } finally { setBtnBusy(btn, false); }
}
['un', 'pw'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));

function logout() {
  localStorage.removeItem(PW_KEY); localStorage.removeItem(USER_KEY);
  MG = null; $('un').value = ''; $('pw').value = '';
  show('loginView');
}

async function mgLoad() {
  const sum = $('mgSum');
  if (sum && !MG) sum.innerHTML = '<tr><td colspan="6" class="empty">جارِ التحميل...</td></tr>';
  try {
    MG = await api('getManage');
    mgFillUnits(); mgRender();
  } catch (e) {
    if (e.auth) { toast('انتهت صلاحية الدخول، سجّلي الدخول من جديد', false); logout(); return; }
    if (e.message === MG_DENY) { toast('هذا الحساب ليس مديرة وحدة', false); show('loginView'); return; }
    toast(e.message, false);
    if (sum) sum.innerHTML = '<tr><td colspan="6" class="empty">تعذّر التحميل، اضغطي «تحديث»</td></tr>';
  }
}

(function init() {
  if (getUser() && getPw()) { show('manageView'); mgLoad(); }
})();

function mgFillUnits() {
  const sel = document.getElementById('mgUnit');
  const cur = sel.value;
  sel.innerHTML = MG.units.map(u => '<option>' + esc(u) + '</option>').join('');
  sel.value = MG.units.indexOf(cur) > -1 ? cur : (MG.units.indexOf(MG.me.unit) > -1 ? MG.me.unit : MG.units[0]);
  document.getElementById('mgUnitBox').classList.toggle('hidden', MG.units.length < 2);   // اختيار الوحدة للمديرة العامة فقط
}

function mgClear() {
  document.getElementById('mgFrom').value = '';
  document.getElementById('mgTo').value = '';
  document.getElementById('mgSup').value = '*';
  mgRender();
}

function mgTabSet(t) {
  mgTab = t;
  document.querySelectorAll('#mgTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  mgRender();
}

function mgPick(key) {
  document.getElementById('mgSup').value = key;
  mgRender();
  document.getElementById('mgSup').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const mgLink = (url, txt) => /^https?:\/\//i.test(url || '') ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(txt) + '</a>' : '—';

function mgRender() {
  if (!MG) return;
  const unit = document.getElementById('mgUnit').value;
  const from = document.getElementById('mgFrom').value, to = document.getElementById('mgTo').value;
  const inR = d => { d = String(d || '').slice(0, 10); return (!from || (d && d >= from)) && (!to || (d && d <= to)); };

  const users = MG.users.filter(u => u.unit === unit);
  const known = {}; users.forEach(u => { known[u.username] = u.name; });
  const okey = x => known[x.owner] !== undefined ? x.owner : '';   // سجل بلا مشرفة معروفة يُجمع تحت «غير محدد»
  const vs = MG.visits.filter(x => x.unit === unit && inR(x.date));
  const es = MG.evals.filter(x => x.unit === unit && inR(x.date));
  const fs = MG.files.filter(x => x.unit === unit && inR(x.at));

  const rows = users.map(u => ({ key: u.username, name: u.name }));
  if (vs.concat(es, fs).some(x => okey(x) === '')) rows.push({ key: '', name: MG_NONE });

  // قائمة تصفية المشرفة (نحافظ على الاختيار الحالي)
  const supSel = document.getElementById('mgSup');
  const prev = supSel.value || '*';
  const opts = '<option value="*">كل المشرفات</option>' + rows.map(r => '<option value="' + esc(r.key) + '">' + esc(r.name) + '</option>').join('');
  if (supSel.dataset.sig !== opts) {
    supSel.innerHTML = opts; supSel.dataset.sig = opts;
    supSel.value = rows.some(r => r.key === prev) || prev === '*' ? prev : '*';
  }
  const sup = supSel.value;

  // ملخص أعلى الصفحة
  document.getElementById('mgStats').innerHTML =
    '<div class="stat"><b>' + users.length + '</b><span>المشرفات</span></div>' +
    '<div class="stat"><b>' + vs.length + '</b><span>الزيارات</span></div>' +
    '<div class="stat"><b>' + es.length + '</b><span>الاستمارات</span></div>' +
    '<div class="stat"><b>' + fs.length + '</b><span>المرفقات</span></div>';

  // جدول المشرفات
  document.getElementById('mgSum').innerHTML = rows.length ? rows.map(r => {
    const v = vs.filter(x => okey(x) === r.key), e = es.filter(x => okey(x) === r.key), f = fs.filter(x => okey(x) === r.key);
    const pres = v.filter(x => x.counted).length, abs = v.length - pres;
    const last = v.concat(e, f).map(x => x.at || x.date || '').sort().pop() || '—';
    return '<tr class="mg-row" data-k="' + esc(r.key) + '" onclick="mgPick(this.dataset.k)"><td><b>' + esc(r.name) + '</b></td><td>' + pres +
      '</td><td>' + abs + '</td><td>' + e.length + '</td><td>' + f.length + '</td><td>' + esc(last) + '</td></tr>';
  }).join('') : '<tr><td colspan="6" class="empty">لا توجد مشرفات في هذه الوحدة بعد. أضيفيهن في ورقة «المستخدمات».</td></tr>';

  // التفاصيل
  const mine = x => sup === '*' || okey(x) === sup;
  const who = x => esc(known[x.owner] !== undefined ? known[x.owner] : MG_NONE);
  let head = '', body = '', n = 0;
  if (mgTab === 'visits') {
    const L = vs.filter(mine); n = L.length;
    head = '<tr><th>المشرفة</th><th>المركز</th><th>نوع الزيارة</th><th>التاريخ</th><th>الحالة</th><th>التوقيع</th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + esc(x.center || '—') + '</td><td>' + esc(x.type || '—') + '</td><td>' +
      esc(x.date) + ' ' + esc(x.day) + '</td><td>' + esc(x.status) + '</td><td>' + mgLink(x.signature, 'عرض') + '</td></tr>').join('');
  } else if (mgTab === 'evals') {
    const L = es.filter(mine); n = L.length;
    head = '<tr><th>المشرفة</th><th>المركز</th><th>المعلمة</th><th>النوع</th><th>التاريخ</th><th>التقدير</th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + esc(x.center) + '</td><td>' + esc(x.teacher) + '</td><td>' +
      esc(x.type) + '</td><td>' + esc(x.date) + '</td><td>' + esc(x.grade || '—') + '</td></tr>').join('');
  } else {
    const L = fs.filter(mine); n = L.length;
    head = '<tr><th>المشرفة</th><th>العنوان</th><th>الملف</th><th>وقت الرفع</th></tr>';
    body = L.slice(0, MG_LIMIT).map(x => '<tr><td>' + who(x) + '</td><td>' + esc(x.title) + '</td><td>' + mgLink(x.url, x.name && x.name !== 'رابط' ? x.name : 'فتح الرابط') +
      '</td><td>' + esc(x.at) + '</td></tr>').join('');
  }
  document.getElementById('mgHead').innerHTML = head;
  document.getElementById('mgBody').innerHTML = body || '<tr><td colspan="6" class="empty">لا توجد سجلات</td></tr>';
  if (n > MG_LIMIT) document.getElementById('mgBody').insertAdjacentHTML('beforeend', '<tr><td colspan="6" class="empty">يظهر أحدث ' + MG_LIMIT + ' سجل من ' + n + '، استخدمي التاريخ لتضييق العرض</td></tr>');
}
