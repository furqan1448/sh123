<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>مشرفات وحدة الإشراف الإداري — منظومة مشرفات مكتب إشراف الداخل</title>
<link rel="preconnect" href="https://script.google.com">
<link rel="preconnect" href="https://script.googleusercontent.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap">
<link rel="stylesheet" href="style.css">
<style>
  .id-hint{font-size:13px;color:var(--muted);margin-top:4px;min-height:1em}
  .id-note-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px}
  .id-note-row .num{font-weight:800;color:var(--maroon,#7a1f2b);min-width:22px;text-align:center;margin-top:10px}
  .id-note-row textarea{flex:1;margin:0;resize:vertical}
  .id-note-row .x{flex:none;width:auto;padding:6px 10px;margin-top:4px;background:transparent;border:1px solid #ddd;border-radius:8px;color:#888;cursor:pointer}
  .btn.id-wa{background:#1f8f4e;border-color:#1f8f4e;color:#fff;text-decoration:none;display:inline-block}
  .id-send{padding:14px 16px;border:1px solid #bfe3cd;background:#f1faf4;border-radius:12px;line-height:2}
  .id-send .btn{margin-top:8px}
</style>
</head>
<body id="idariPage">
<div class="topbar">
  <img class="logo" alt="شعار فرقان">
  <h1>مشرفات</h1>
  <p>وحدة الإشراف الإداري</p>
</div>

<div class="wrap">

  <!-- تسجيل الدخول -->
  <div id="loginView" class="card" style="max-width:420px;margin:30px auto">
    <h2>تسجيل الدخول</h2>
    <label for="un">اسم المستخدم</label>
    <select id="un"><option value="">جارِ تحميل الأسماء...</option></select>
    <label for="pw">كلمة المرور</label>
    <div class="pw-wrap">
      <input id="pw" type="password" autocomplete="current-password" placeholder="أدخلي كلمة المرور">
      <button type="button" class="pw-toggle" onclick="togglePassword('pw', this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
    </div>
    <button id="loginBtn" class="btn block" onclick="doLogin()">دخول</button>
    <p style="margin-top:12px;text-align:center"><a class="lnk" href="index.html">الرئيسية</a></p>
  </div>

  <!-- القائمة الرئيسية -->
  <div id="homeView" class="hidden">
    <div class="grid">
      <button class="tile" onclick="show('visitsView'); loadVisits()"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 13l2 2 3.5-4"/><path d="M10 18h5"/></svg><b>كشف الخروج</b></button>
      <button class="tile" onclick="idOpenList('visit')"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 9h16"/><path d="M9.5 9v11.5"/><path d="M12.5 13h5"/><path d="M12.5 16.5h3.5"/></svg><b>تقرير زيارة المشرفة</b></button>
      <button class="tile" onclick="idOpenList('program')"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15.5" rx="2"/><path d="M8 3v4M16 3v4"/><path d="M4 10h16"/><path d="M8.5 14.5l2 2 4-4"/></svg><b>برنامج مشرفة مقيمة</b></button>
      <button class="tile" onclick="idOpenList('suggest')"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg><b>الاقتراحات والصعوبات</b></button>
    </div>
    <p style="text-align:center;margin-top:22px"><button class="btn light" onclick="logout()">تسجيل الخروج</button></p>
  </div>

  <!-- كشف الخروج -->
  <div id="visitsView" class="hidden">
    <button class="back" onclick="show('homeView')">← رجوع</button>

    <div class="stats">
      <div class="stat"><b id="stDays">0</b><span>أيام الحضور (الزيارات)</span></div>
      <div class="stat"><b id="stAbs">0</b><span>أيام الغياب</span></div>
    </div>

    <div class="card">
      <h2>تسجيل زيارة جديدة</h2>
      <div id="vCenterBox">
        <label for="vCenter">اسم المركز</label>
        <select id="vCenter"><option value="">جارِ التحميل...</option></select>
      </div>
      <div id="vTypeBox">
        <label>نوع الزيارة <span style="font-weight:400;color:var(--muted);font-size:14px">(يمكن اختيار أكثر من نوع)</span></label>
        <div id="vTypeList" class="chips"><span class="empty">جارِ التحميل...</span></div>
      </div>
      <div class="row2">
        <div><label for="vDate">التاريخ</label><input id="vDate" type="date" onchange="onDateChange()"></div>
        <div><label for="vDay">اليوم</label><input id="vDay" readonly></div>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-top:6px">الموافق: <span id="vHijri">—</span></div>
      <label for="vStatus">حالة الزيارة</label>
      <select id="vStatus" onchange="onStatusChange()"></select>
      <div id="sigSection">
        <label>توقيع المديرة</label>
        <div id="vSigW"></div>
      </div>
      <p id="absentNote" class="hidden" style="margin-top:12px;font-size:14px;color:var(--muted)"></p>
      <button id="saveVisitBtn" class="btn block" onclick="saveVisit()">حفظ</button>
    </div>

    <div class="card">
      <h2>سجل الزيارات</h2>
      <label for="fCenter" style="margin-top:0">تصفية حسب المركز</label>
      <select id="fCenter" onchange="renderVisits()"><option value="">كل المراكز</option></select>
      <div class="ex-bar"><button class="btn light" onclick="exVisits(this)">تحميل كشف الخروج Excel</button></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>م</th><th>المركز</th><th>نوع الزيارة</th><th>التاريخ</th><th>اليوم</th><th>الحالة</th><th>التوقيع</th><th></th></tr></thead>
          <tbody id="vBody"><tr><td colspan="8" class="empty">جارِ التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- سجل النماذج (مشترك للأنواع الثلاثة) -->
  <div id="idListView" class="hidden">
    <button class="back" onclick="show('homeView')">← رجوع</button>
    <div class="card">
      <h2 id="idListTitle"></h2>
      <p class="rp-hint" id="idListHint"></p>
      <button class="btn block" onclick="idNew()">＋ نموذج جديد</button>
    </div>
    <div class="card">
      <h2>النماذج المحفوظة</h2>
      <div class="tbl-wrap">
        <table style="min-width:600px">
          <thead id="idHead"></thead>
          <tbody id="idBody"><tr><td class="empty">جارِ التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- تقرير زيارة المشرفة -->
  <div id="idVisitForm" class="hidden">
    <button class="back" onclick="idBack()">← رجوع</button>
    <div class="edit-note hidden" data-edit>وضع التعديل: يُحفظ التعديل على نفس النموذج.</div>
    <div class="card">
      <h2>تقرير زيارة المشرفة</h2>
      <label for="ivCenter">المركز</label>
      <select id="ivCenter" onchange="ivCenterChanged()"></select>
      <div class="id-hint" id="ivMgrStatus"></div>
      <div class="row2">
        <div><label for="ivSem">الفصل الدراسي</label><select id="ivSem"><option value="">اختاري</option><option>الأول</option><option>الثاني</option><option>الثالث</option></select></div>
        <div><label for="ivYear">لعام</label><input id="ivYear" inputmode="numeric" maxlength="4" placeholder="1447"></div>
      </div>
      <label>الفترة</label>
      <div class="chips" id="ivPeriod"><label class="chip"><input type="checkbox" value="صباحي"><span>صباحي</span></label><label class="chip"><input type="checkbox" value="مسائي"><span>مسائي</span></label></div>
      <div id="ivDateBox"></div>
      <div class="row2">
        <div><label for="ivVisitNo">رقم الزيارة</label><input id="ivVisitNo" inputmode="numeric"><div class="id-hint" id="ivVisitNoHint"></div></div>
        <div><label for="ivType">نوع الزيارة</label><input id="ivType" value="إداري"></div>
      </div>
      <label for="ivAbout">بشأن</label>
      <input id="ivAbout" autocomplete="off" placeholder="مثال: الأداء الإداري للمركز">
    </div>

    <div class="card">
      <h2>الملاحظات</h2>
      <p class="rp-hint" style="margin-top:0">كل ملاحظة في سطر برقمها، كما تظهر في جدول التقرير.</p>
      <div id="ivNotes"></div>
      <button type="button" class="btn light block" onclick="ivAddNote()">＋ إضافة ملاحظة</button>
      <label for="ivRec">التوصية <span style="font-weight:400;color:var(--muted);font-size:14px">(تظهر في خلية واحدة بجانب الملاحظات)</span></label>
      <textarea id="ivRec" rows="2"></textarea>
    </div>

    <div class="card">
      <h2>التواقيع</h2>
      <div class="row2">
        <div><label for="ivMgrName" style="margin-top:0">اسم مديرة المركز</label><input id="ivMgrName"></div>
        <div><label for="ivMgrPhone" style="margin-top:0">جوال المديرة (واتساب)</label><input id="ivMgrPhone" inputmode="tel" dir="ltr" placeholder="05xxxxxxxx" style="text-align:right"></div>
      </div>
      <label for="ivSupName">اسم المشرفة</label><input id="ivSupName">
      <p class="rp-hint" style="margin-top:8px">توقيع المديرة لا يُطلب هنا؛ يُرسَل التقرير إليها (زر «حفظ وإرسال للمديرة») وتوقّع عليه.</p>
      <label class="check"><input type="checkbox" id="ivAckCol"><span>إظهار عمود «توقيع بالعلم» في التقرير (فارغ للتوقيع عليه)</span></label>
      <label>توقيع المشرفة</label>
      <div id="ivSupW"></div>
      <button id="ivSaveBtn" class="btn block" onclick="idSave('visit', this)">حفظ التقرير</button>
      <button id="ivSaveSendBtn" class="btn block id-wa" style="margin-top:10px" onclick="idSave('visit', this, true)">📲 حفظ وإرسال للمديرة</button>
    </div>
  </div>

  <!-- تخطيط وتنفيذ ونتائج لبرنامج مشرفة مقيمة -->
  <div id="idProgramForm" class="hidden">
    <button class="back" onclick="idBack()">← رجوع</button>
    <div class="edit-note hidden" data-edit>وضع التعديل: يُحفظ التعديل على نفس النموذج.</div>
    <div class="card">
      <h2>تخطيط وتنفيذ ونتائج لبرنامج مشرفة مقيمة</h2>
      <div id="ipDateBox"></div>
      <label for="ipCenter">المركز</label><select id="ipCenter"></select>
      <label for="ipContent">المحتوى</label><textarea id="ipContent" rows="2"></textarea>
      <label for="ipPlan">التخطيط</label><textarea id="ipPlan" rows="2"></textarea>
      <label for="ipMethod">طريقة التنفيذ</label><textarea id="ipMethod" rows="2"></textarea>
      <label for="ipTools">الوسائل</label><textarea id="ipTools" rows="2"></textarea>
      <label for="ipResults">النتائج</label><textarea id="ipResults" rows="2"></textarea>
      <label for="ipRatio">نسبة الاستفادة</label><input id="ipRatio" placeholder="مثال: 90%">
      <label for="ipSupName">اسم المشرفة <span style="font-weight:400;color:var(--muted);font-size:14px">(اختياري، يظهر أسفل النموذج)</span></label><input id="ipSupName">
      <label>توقيع المشرفة <span style="font-weight:400;color:var(--muted);font-size:14px">(اختياري)</span></label>
      <div id="ipSupW"></div>
      <button id="ipSaveBtn" class="btn block" onclick="idSave('program', this)">حفظ النموذج</button>
    </div>
  </div>

  <!-- الاقتراحات والمرئيات – الصعوبات -->
  <div id="idSuggestForm" class="hidden">
    <button class="back" onclick="idBack()">← رجوع</button>
    <div class="edit-note hidden" data-edit>وضع التعديل: يُحفظ التعديل على نفس النموذج.</div>
    <div class="card">
      <h2>الاقتراحات والمرئيات – الصعوبات التي تواجه المشرفة الإدارية</h2>
      <div class="row2">
        <div><label for="isSem">الفصل الدراسي</label><select id="isSem"><option value="">اختاري</option><option>الأول</option><option>الثاني</option><option>الثالث</option></select></div>
        <div><label for="isYear">لعام</label><input id="isYear" inputmode="numeric" maxlength="4" placeholder="1447"></div>
      </div>
      <label>الفترة</label>
      <div class="chips" id="isPeriod"><label class="chip"><input type="checkbox" value="صباحي"><span>صباحي</span></label><label class="chip"><input type="checkbox" value="مسائي"><span>مسائي</span></label></div>
      <p class="rp-hint" style="margin-top:10px">تُطالَب المشرفة بتسليمها آخر الفصل الدراسي.</p>
    </div>
    <div class="card">
      <h2>البنود</h2>
      <div id="isRows"></div>
      <button type="button" class="btn light block" onclick="isAddRow()">＋ إضافة بند</button>
    </div>
    <div class="card">
      <label for="isSupName" style="margin-top:0">اسم المشرفة</label><input id="isSupName">
      <div id="isDateBox"></div>
      <label>توقيع المشرفة</label>
      <div id="isSupW"></div>
      <button id="isSaveBtn" class="btn block" onclick="idSave('suggest', this)">حفظ النموذج</button>
    </div>
  </div>

  <!-- عرض نموذج -->
  <div id="idModal" class="modal hidden" onclick="if (event.target === this) idCloseModal()">
    <div class="modal-box" style="max-width:1140px">
      <button class="btn light" style="margin-bottom:10px" onclick="idCloseModal()">إغلاق ✕</button>
      <div id="idModalBody"></div>
    </div>
  </div>

</div>

<script src="logo-config.js"></script>
<script src="config.js"></script>
<script src="export.js"></script>
<script src="idari-print.js"></script>
<script src="idari.js"></script>
</body>
</html>
