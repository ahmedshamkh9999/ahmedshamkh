const DEFAULT_USER_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const DEFAULT_PASS_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

let authUserHash = localStorage.getItem('app_user_hash') || DEFAULT_USER_HASH;
let authPassHash = localStorage.getItem('app_pass_hash') || DEFAULT_PASS_HASH;

// دالة تشفير SHA-256 للحماية
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// دالة تغيير بيانات الدخول
async function changeCredentials(newUsername, newPassword) {
  if (!newUsername || !newPassword) return;
  const newUHash = await hashText(newUsername.trim());
  const newPHash = await hashText(newPassword.trim());

  authUserHash = newUHash;
  authPassHash = newPHash;

  localStorage.setItem('app_user_hash', newUHash);
  localStorage.setItem('app_pass_hash', newPHash);
  sessionStorage.setItem('isLoggedIn', newPHash);
}

document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('changeAuthForm');
  if (authForm) {
    // إضافة أزرار المزامنة النصية السريعة تلقائياً داخل صفحة الإعدادات
    if (!document.getElementById('textSyncContainer')) {
      const syncDiv = document.createElement('div');
      syncDiv.id = 'textSyncContainer';
      syncDiv.style.marginTop = '25px';
      syncDiv.style.paddingTop = '20px';
      syncDiv.style.borderTop = '1px solid #334155';
      syncDiv.innerHTML = `
        <h3 style="color: #f8fafc; margin-bottom: 8px; font-size: 1.1rem;">🔄 مزامنة فورية سريعة (بين الموبايل والكمبيوتر)</h3>
        <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 15px;">انقل العمليات بين الجهازين بكود نصي بسيط وبدون تعقيد.</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" id="exportTextBtn" class="btn-success" style="flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">📤 نسخ كود المزامنة (من الموبايل)</button>
          <button type="button" id="importTextBtn" class="btn-primary" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">📥 لصق كود المزامنة (للكمبيوتر)</button>
        </div>
      `;
      authForm.parentNode.appendChild(syncDiv);

      // زر تصدير/نسخ الكود (يُستخدم على الموبايل)
      document.getElementById('exportTextBtn').addEventListener('click', () => {
        const syncData = {
          d: localStorage.getItem('br_drawer'),
          l: localStorage.getItem('br_logs'),
          s: localStorage.getItem('br_services'),
          db: localStorage.getItem('br_debtors'),
          cr: localStorage.getItem('br_creditors'),
          u: localStorage.getItem('app_user_hash'),
          p: localStorage.getItem('app_pass_hash')
        };
        const jsonStr = JSON.stringify(syncData);
        const encoded = btoa(unescape(encodeURIComponent(jsonStr)));

        Swal.fire({
          title: 'كود المزامنة الخاص بك',
          html: `
            <p style="color: #94a3b8; font-size: 13px; margin-bottom: 10px;">قم بنسخ هذا الكود وأرسله لنفسك (واتساب) ثم الصقه في جهاز الكمبيوتر:</p>
            <textarea id="syncCodeArea" readonly style="width: 100%; height: 100px; background: #1e293b; color: #38bdf8; border: 1px solid #475569; border-radius: 6px; padding: 10px; font-size: 12px; direction: ltr;">${encoded}</textarea>
          `,
          confirmButtonText: 'نسخ الكود تلقائياً',
          confirmButtonColor: '#10b981',
          didOpen: () => {
            const area = document.getElementById('syncCodeArea');
            area.select();
          }
        }).then((result) => {
          if (result.isConfirmed) {
            navigator.clipboard.writeText(encoded).then(() => {
              Swal.fire({ icon: 'success', title: 'تم النسخ بنجاح!', timer: 1000, showConfirmButton: false });
            });
          }
        });
      });

      // زر استيراد/لصق الكود (يُستخدم على الكمبيوتر)
      document.getElementById('importTextBtn').addEventListener('click', () => {
        Swal.fire({
          title: 'لصق كود المزامنة',
          html: `
            <p style="color: #94a3b8; font-size: 13px; margin-bottom: 10px;">الصق الكود الذي نسخته من الموبايل هنا:</p>
            <textarea id="importCodeArea" placeholder="الصق الكود هنا..." style="width: 100%; height: 100px; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 6px; padding: 10px; font-size: 12px; direction: ltr;"></textarea>
          `,
          showCancelButton: true,
          confirmButtonText: 'مزامنة وتحديث',
          cancelButtonText: 'إلغاء',
          confirmButtonColor: '#3b82f6',
          cancelButtonColor: '#64748b',
          preConfirm: () => {
            const code = document.getElementById('importCodeArea').value.trim();
            if (!code) {
              Swal.showValidationMessage('يرجى لصق الكود أولاً!');
            }
            return code;
          }
        }).then((result) => {
          if (result.isConfirmed) {
            try {
              const decoded = decodeURIComponent(escape(atob(result.value)));
              const data = JSON.parse(decoded);

              if (data.d !== undefined) localStorage.setItem('br_drawer', data.d);
              if (data.l) localStorage.setItem('br_logs', data.l);
              if (data.s) localStorage.setItem('br_services', data.s);
              if (data.db) localStorage.setItem('br_debtors', data.db);
              if (data.cr) localStorage.setItem('br_creditors', data.cr);
              if (data.u) localStorage.setItem('app_user_hash', data.u);
              if (data.p) localStorage.setItem('app_pass_hash', data.p);

              Swal.fire({
                icon: 'success',
                title: 'تمت المزامنة بنجاح!',
                text: 'جاري تحديث بيانات الكمبيوتر...',
                timer: 1500,
                showConfirmButton: false
              }).then(() => {
                location.reload();
              });
            } catch (err) {
              Swal.fire('خطأ', 'الكود غير صالح، تأكد من نسخ الكود كاملاً بشكل صحيح.', 'error');
            }
          }
        });
      });
    }

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPass = document.getElementById('currentPasswordInput') ? document.getElementById('currentPasswordInput').value.trim() : '';
      const newUsers = document.getElementById('newUsernameInput').value.trim();
      const newPass = document.getElementById('newPasswordInput').value.trim();

      if ((document.getElementById('currentPasswordInput') && !currentPass) || !newUsers || !newPass) {
        Swal.fire('تنبيه', 'يرجى إدخال جميع البيانات المطلوبة', 'warning');
        return;
      }

      if (document.getElementById('currentPasswordInput')) {
        const inputCurrentHash = await hashText(currentPass);
        if (inputCurrentHash !== authPassHash) {
          Swal.fire({ icon: 'error', title: 'خطأ!', text: 'كلمة السر الحالية غير صحيحة.', confirmButtonColor: '#ef4444' });
          return;
        }
      }

      await changeCredentials(newUsers, newPass);
      Swal.fire({ icon: 'success', title: 'تم التحديث بنجاح!', text: 'تم تغيير بيانات الدخول.', confirmButtonColor: '#10b981' });
      authForm.reset();
    });
  }
});

// حالة بيانات النظام
let state = {
  drawerBalance: parseFloat(localStorage.getItem('br_drawer')) || 0,
  logs: JSON.parse(localStorage.getItem('br_logs')) || [],
  services: JSON.parse(localStorage.getItem('br_services')) || [],
  debtors: JSON.parse(localStorage.getItem('br_debtors')) || [],
  creditors: JSON.parse(localStorage.getItem('br_creditors')) || []
};

// ---------------- نظام تسجيل الدخول ----------------
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('usernameInput').value.trim();
  const pass = document.getElementById('passwordInput').value.trim();
  const errorMsg = document.getElementById('loginError');

  const inputUserHash = await hashText(user);
  const inputPassHash = await hashText(pass);

  if (inputUserHash === authUserHash && inputPassHash === authPassHash) {
    sessionStorage.setItem('isLoggedIn', inputPassHash);
    errorMsg.style.display = 'none';
    e.target.reset();
    checkAuth();
  } else {
    errorMsg.style.display = 'block';
  }
});

function logout() {
  Swal.fire({
    title: 'تسجيل الخروج',
    text: 'هل أنت متأكد من تسجيل الخروج؟',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، خروج',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      sessionStorage.removeItem('isLoggedIn');
      checkAuth();
    }
  });
}

function checkAuth() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === authPassHash;
  const loginSec = document.getElementById('loginSection');
  const appSec = document.getElementById('appSection');

  if (isLoggedIn) {
    loginSec.classList.add('hidden');
    appSec.classList.remove('hidden');
    renderUI();
  } else {
    loginSec.classList.remove('hidden');
    appSec.classList.add('hidden');
  }
}

// ---------------- حفظ البيانات ----------------
function saveState() {
  localStorage.setItem('br_drawer', state.drawerBalance);
  localStorage.setItem('br_logs', JSON.stringify(state.logs));
  localStorage.setItem('br_services', JSON.stringify(state.services));
  localStorage.setItem('br_debtors', JSON.stringify(state.debtors));
  localStorage.setItem('br_creditors', JSON.stringify(state.creditors));
  renderUI();
}

// ---------------- التنقل بين التبويبات ----------------
function switchTab(e, tabId) {
  if (e) e.preventDefault();
  
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.section-view').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  if (e && e.currentTarget) {
    e.currentTarget.classList.add('active');
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = e.currentTarget.textContent.replace('⚙️ ', '');
  }

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }
}

function addLog(type, amount, note) {
  if (type === 'in') state.drawerBalance += amount;
  if (type === 'out') state.drawerBalance -= amount;

  state.logs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    type: type,
    amount: amount,
    note: note
  });
}

// 1. حركة الدرج
document.getElementById('drawerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = document.getElementById('drawerTxType').value;
  const amount = parseFloat(document.getElementById('drawerTxAmount').value);
  const note = document.getElementById('drawerTxNote').value;

  addLog(type, amount, note);
  saveState();
  e.target.reset();
  Swal.fire({ icon: 'success', title: 'تمت العملية بنجاح', timer: 1200, showConfirmButton: false });
});

// 2. أرقام الخدمة
document.getElementById('serviceForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const num = document.getElementById('serviceNumInput').value;
  const client = document.getElementById('serviceClientInput').value;
  const cost = parseFloat(document.getElementById('serviceCostInput').value);
  const status = document.getElementById('servicePaymentStatus').value;

  if (status === 'paid') {
    addLog('in', cost, `تحصيل خدمة (${num}) - العميل: ${client}`);
  } else if (status === 'debtor') {
    state.debtors.push({ id: Date.now(), name: client, amount: cost, reason: `خدمة رقم ${num}` });
  } else if (status === 'creditor' || status === 'debt') {
    state.creditors.push({ id: Date.now(), name: client, amount: cost, reason: `خدمة رقم ${num}` });
  }

  state.services.unshift({ id: Date.now(), num, client, cost, status });
  saveState();
  e.target.reset();
  Swal.fire({ icon: 'success', title: 'تم حفظ الخدمة', timer: 1200, showConfirmButton: false });
});

// 3. مدينون
document.getElementById('debtorForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('debtorName').value;
  const amount = parseFloat(document.getElementById('debtorAmount').value);
  const reason = document.getElementById('debtorReason').value;

  state.debtors.push({ id: Date.now(), name, amount, reason });
  saveState();
  e.target.reset();
  Swal.fire({ icon: 'success', title: 'تم إضافة المدين', timer: 1200, showConfirmButton: false });
});

function payDebtor(id) {
  const debtor = state.debtors.find(d => d.id === id);
  if (!debtor) return;

  Swal.fire({
    title: `سداد دين لـ (${debtor.name})`,
    text: `المبلغ المتبقي: ${debtor.amount} ج.م`,
    input: 'number',
    inputValue: debtor.amount,
    inputAttributes: { min: '0.01', max: debtor.amount, step: 'any' },
    showCancelButton: true,
    confirmButtonText: 'سداد',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b'
  }).then((result) => {
    if (result.isConfirmed) {
      const payAmount = parseFloat(result.value);
      if (payAmount > 0 && payAmount <= debtor.amount) {
        debtor.amount -= payAmount;
        addLog('out', payAmount, `سداد دين لـ: ${debtor.name}`);
        if (debtor.amount === 0) {
          state.debtors = state.debtors.filter(d => d.id !== id);
        }
        saveState();
      }
    }
  });
}

// 4. دائنون
document.getElementById('creditorForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('creditorName').value;
  const amount = parseFloat(document.getElementById('creditorAmount').value);
  const reason = document.getElementById('creditorReason').value;

  state.creditors.push({ id: Date.now(), name, amount, reason });
  saveState();
  e.target.reset();
  Swal.fire({ icon: 'success', title: 'تم إضافة الدائن', timer: 1200, showConfirmButton: false });
});

function collectCreditor(id) {
  const creditor = state.creditors.find(c => c.id === id);
  if (!creditor) return;

  Swal.fire({
    title: `تحصيل مبلغ من (${creditor.name})`,
    text: `المبلغ المستحق: ${creditor.amount} ج.م`,
    input: 'number',
    inputValue: creditor.amount,
    inputAttributes: { min: '0.01', max: creditor.amount, step: 'any' },
    showCancelButton: true,
    confirmButtonText: 'تحصيل',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b'
  }).then((result) => {
    if (result.isConfirmed) {
      const collectAmount = parseFloat(result.value);
      if (collectAmount > 0 && collectAmount <= creditor.amount) {
        creditor.amount -= collectAmount;
        addLog('in', collectAmount, `تحصيل مستحق من: ${creditor.name}`);
        if (creditor.amount === 0) {
          state.creditors = state.creditors.filter(c => c.id !== id);
        }
        saveState();
      }
    }
  });
}

function deleteLog(id) {
  Swal.fire({
    title: 'حذف الحركة',
    text: 'هل أنت متأكد من حذف هذه الحركة؟',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      const log = state.logs.find(l => l.id === id);
      if (log) {
        if (log.type === 'in') state.drawerBalance -= log.amount;
        if (log.type === 'out') state.drawerBalance += log.amount;
        state.logs = state.logs.filter(l => l.id !== id);
        saveState();
      }
    }
  });
}

function deleteService(id) {
  Swal.fire({
    title: 'حذف الخدمة',
    text: 'هل أنت متأكد من حذف هذه الخدمة؟',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      state.services = state.services.filter(s => s.id !== id);
      saveState();
    }
  });
}

// ---------------- تحديث الواجهة ----------------
function renderUI() {
  document.getElementById('drawerDisplay').textContent = `${state.drawerBalance.toFixed(2)} ج.م`;

  const totalRevenues = state.services.reduce((sum, item) => sum + item.cost, 0);
  document.getElementById('totalRevenuesDisplay').textContent = `${totalRevenues.toFixed(2)} ج.م`;

  const totalExpenses = state.logs
    .filter(log => log.type === 'out')
    .reduce((sum, log) => sum + log.amount, 0);
  document.getElementById('totalExpensesDisplay').textContent = `${totalExpenses.toFixed(2)} ج.م`;

  const netProfit = totalRevenues - totalExpenses;
  const netProfitEl = document.getElementById('netProfitDisplay');
  netProfitEl.textContent = `${netProfit.toFixed(2)} ج.م`;
  netProfitEl.className = `card-value ${netProfit >= 0 ? 'success-text' : 'danger-text'}`;

  const totalDebtors = state.debtors.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById('totalDebtorsDisplay').textContent = `${totalDebtors.toFixed(2)} ج.م`;

  const totalCreditors = state.creditors.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById('totalCreditorsDisplay').textContent = `${totalCreditors.toFixed(2)} ج.م`;

  document.getElementById('drawerTableBody').innerHTML = state.logs.map(log => `
    <tr>
      <td>${log.time}</td>
      <td><span class="badge ${log.type === 'in' ? 'badge-success' : 'badge-danger'}">${log.type === 'in' ? 'إيداع (+)' : 'سحب (-)'}</span></td>
      <td><strong>${log.amount.toFixed(2)} ج.م</strong></td>
      <td>${log.note}</td>
      <td><button class="btn-danger btn-small" onclick="deleteLog(${log.id})">حذف</button></td>
    </tr>
  `).join('');

  document.getElementById('servicesTableBody').innerHTML = state.services.map(s => {
    let badgeClass = 'badge-success';
    let badgeText = 'محصل بالدرج';
    if (s.status === 'debtor') {
      badgeClass = 'badge-danger';
      badgeText = 'مستحق (مدينون)';
    } else if (s.status === 'creditor' || s.status === 'debt') {
      badgeClass = 'badge-warning';
      badgeText = 'مستحق (دائنون)';
    }
    return `
      <tr>
        <td><strong>${s.num}</strong></td>
        <td>${s.client}</td>
        <td>${s.cost.toFixed(2)} ج.م</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td><button class="btn-danger btn-small" onclick="deleteService(${s.id})">حذف</button></td>
      </tr>
    `;
  }).join('');

  document.getElementById('debtorsTableBody').innerHTML = state.debtors.map(d => `
    <tr>
      <td><strong>${d.name}</strong></td>
      <td class="danger-text" style="font-weight: bold;">${d.amount.toFixed(2)} ج.م</td>
      <td>${d.reason}</td>
      <td><button class="btn-success" onclick="payDebtor(${d.id})">سداد من الدرج</button></td>
    </tr>
  `).join('');

  document.getElementById('creditorsTableBody').innerHTML = state.creditors.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td class="success-text" style="font-weight: bold;">${c.amount.toFixed(2)} ج.م</td>
      <td>${c.reason}</td>
      <td><button class="btn-success" onclick="collectCreditor(${c.id})">تحصيل للدرج</button></td>
    </tr>
  `).join('');
}

// التشغيل الأولي
checkAuth();