const API_BASE = `${window.location.origin}/api`;
const DEFAULT_USER_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const DEFAULT_PASS_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
let authUserHash = localStorage.getItem('app_user_hash') || DEFAULT_USER_HASH;
let authPassHash = localStorage.getItem('app_pass_hash') || DEFAULT_PASS_HASH;

// دالة تشفير SHA-256 للحماية
async function hashText(text) {
  if (!crypto.subtle) {
    // توافق فوري مع admin و 1234 على شبكة HTTP المحلية
    if (text === 'admin') return DEFAULT_USER_HASH;
    if (text === '1234') return DEFAULT_PASS_HASH;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
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

  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      const welcomeSec = document.getElementById('welcomeSection');
      const loginSec = document.getElementById('loginSection');
      if (welcomeSec) welcomeSec.style.display = 'none';
      if (loginSec) loginSec.classList.remove('hidden');
    });
  }
});

// حالة بيانات النظام المعتمدة من السيرفر
let state = {
  drawerBalance: 0,
  logs: [],
  services: [],
  debtors: [],
  creditors: []
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
      const welcomeSec = document.getElementById('welcomeSection');
      if (welcomeSec) welcomeSec.style.display = 'flex';
      checkAuth();
    }
  });
}

function checkAuth() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === authPassHash;
  const welcomeSec = document.getElementById('welcomeSection');
  const loginSec = document.getElementById('loginSection');
  const appSec = document.getElementById('appSection');

  if (isLoggedIn) {
    if (welcomeSec) welcomeSec.style.display = 'none';
    if (loginSec) loginSec.classList.add('hidden');
    if (appSec) appSec.classList.remove('hidden');
    loadStateFromDB();
  } else {
    if (appSec) appSec.classList.add('hidden');
  }
}

// ---------------- جلب البيانات الحقيقية من السيرفر ----------------
async function loadStateFromDB() {
  try {
    const res = await fetch(`${API_BASE}/state`);
    if (res.ok) {
      const data = await res.json();
      state.drawerBalance = Number(data.drawerBalance || 0);
      state.logs = data.logs || data.transactions || [];
      state.services = data.services || [];
      state.debtors = data.debtors || [];
      state.creditors = data.creditors || [];
      renderUI();
    }
  } catch (err) {
    console.error("فشل الاتصال بالسيرفر:", err);
  }
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

// 1. حركة الدرج
document.getElementById('drawerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('drawerTxType').value;
  const amount = parseFloat(document.getElementById('drawerTxAmount').value) || 0;
  const note = document.getElementById('drawerTxNote').value || '';

  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, note })
    });
    if (res.ok) {
      await loadStateFromDB();
      e.target.reset();
      Swal.fire({ icon: 'success', title: 'تمت العملية بنجاح', timer: 1200, showConfirmButton: false });
    }
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل حفظ الحركة بالسيرفر' });
  }
});

// 2. أرقام الخدمة
document.getElementById('serviceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const num = document.getElementById('serviceNumInput').value;
  const client = document.getElementById('serviceClientInput').value;
  const cost = parseFloat(document.getElementById('serviceCostInput').value) || 0;
  const status = document.getElementById('servicePaymentStatus').value;

  try {
    await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num, client, cost, status })
    });

    if (status === 'paid') {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'in', amount: cost, note: `تحصيل خدمة (${num}) - العميل: ${client}` })
      });
    }

    await loadStateFromDB();
    e.target.reset();
    Swal.fire({ icon: 'success', title: 'تم حفظ الخدمة بالسيرفر', timer: 1200, showConfirmButton: false });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل حفظ الخدمة' });
  }
});

// 3. مدينون (إضافة وسداد)
document.getElementById('debtorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('debtorName').value;
  const amount = parseFloat(document.getElementById('debtorAmount').value) || 0;
  const reason = document.getElementById('debtorReason').value;

  try {
    await fetch(`${API_BASE}/debtors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount, reason })
    });
    await loadStateFromDB();
    e.target.reset();
    Swal.fire({ icon: 'success', title: 'تم إضافة المدين', timer: 1200, showConfirmButton: false });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل إضافة المدين' });
  }
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
  }).then(async (result) => {
    if (result.isConfirmed) {
      const payAmount = parseFloat(result.value);
      if (payAmount > 0 && payAmount <= debtor.amount) {
        const remaining = debtor.amount - payAmount;
        await fetch(`${API_BASE}/debtors/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: remaining })
        });
        await fetch(`${API_BASE}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'out', amount: payAmount, note: `سداد دين لـ: ${debtor.name}` })
        });
        await loadStateFromDB();
      }
    }
  });
}

// 4. دائنون (إضافة وتحصيل)
const creditorForm = document.getElementById('creditorForm');
if (creditorForm) {
  creditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('creditorName').value;
    const amount = parseFloat(document.getElementById('creditorAmount').value) || 0;
    const reason = document.getElementById('creditorReason').value;

    try {
      await fetch(`${API_BASE}/creditors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount, reason })
      });
      await loadStateFromDB();
      e.target.reset();
      Swal.fire({ icon: 'success', title: 'تم إضافة الدائن', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل إضافة الدائن' });
    }
  });
}

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
  }).then(async (result) => {
    if (result.isConfirmed) {
      const collectAmount = parseFloat(result.value);
      if (collectAmount > 0 && collectAmount <= creditor.amount) {
        const remaining = creditor.amount - collectAmount;
        await fetch(`${API_BASE}/creditors/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: remaining })
        });
        await fetch(`${API_BASE}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'in', amount: collectAmount, note: `تحصيل مستحق من: ${creditor.name}` })
        });
        await loadStateFromDB();
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
  }).then(async (result) => {
    if (result.isConfirmed) {
      await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
      await loadStateFromDB();
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
  }).then(async (result) => {
    if (result.isConfirmed) {
      await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' });
      await loadStateFromDB();
    }
  });
}

// ---------------- تحديث الواجهة ----------------
function renderUI() {
  const drawerDisplay = document.getElementById('drawerDisplay');
  if (drawerDisplay) drawerDisplay.textContent = `${(state.drawerBalance || 0).toFixed(2)} ج.م`;

  const totalRevenues = (state.services || []).reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const totalRevEl = document.getElementById('totalRevenuesDisplay');
  if (totalRevEl) totalRevEl.textContent = `${totalRevenues.toFixed(2)} ج.م`;

  const totalExpenses = (state.logs || [])
    .filter(log => String(log.type || '').toLowerCase() === 'out')
    .reduce((sum, log) => sum + Number(log.amount || 0), 0);
  const totalExpEl = document.getElementById('totalExpensesDisplay');
  if (totalExpEl) totalExpEl.textContent = `${totalExpenses.toFixed(2)} ج.م`;

  const netProfit = totalRevenues - totalExpenses;
  const netProfitEl = document.getElementById('netProfitDisplay');
  if (netProfitEl) {
    netProfitEl.textContent = `${netProfit.toFixed(2)} ج.م`;
    netProfitEl.className = `card-value ${netProfit >= 0 ? 'success-text' : 'danger-text'}`;
  }

  const totalDebtors = (state.debtors || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalDebEl = document.getElementById('totalDebtorsDisplay');
  if (totalDebEl) totalDebEl.textContent = `${totalDebtors.toFixed(2)} ج.م`;

  const totalCreditors = (state.creditors || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalCredEl = document.getElementById('totalCreditorsDisplay');
  if (totalCredEl) totalCredEl.textContent = `${totalCreditors.toFixed(2)} ج.م`;

  // رسم جدول الدرج
  const drawerBody = document.getElementById('drawerTableBody');
  if (drawerBody) {
    drawerBody.innerHTML = (state.logs || []).map(log => {
      const isIncome = String(log.type || '').toLowerCase() === 'in';
      const amt = Number(log.amount || 0).toFixed(2);
      return `
        <tr>
          <td>${log.time || '--:--'}</td>
          <td><span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">${isIncome ? 'إيداع (+)' : 'سحب (-)'}</span></td>
          <td><strong>${amt} ج.م</strong></td>
          <td>${log.note || ''}</td>
          <td><button class="btn-danger btn-small" onclick="deleteLog(${log.id})">حذف</button></td>
        </tr>
      `;
    }).join('');
  }

  // رسم جدول الخدمات
  const servicesBody = document.getElementById('servicesTableBody');
  if (servicesBody) {
    servicesBody.innerHTML = (state.services || []).map(s => {
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
          <td><strong>${s.num || ''}</strong></td>
          <td>${s.client || ''}</td>
          <td>${Number(s.cost || 0).toFixed(2)} ج.م</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td><button class="btn-danger btn-small" onclick="deleteService(${s.id})">حذف</button></td>
        </tr>
      `;
    }).join('');
  }

  // رسم جدول المدينون
  const debtorsBody = document.getElementById('debtorsTableBody');
  if (debtorsBody) {
    debtorsBody.innerHTML = (state.debtors || []).map(d => `
      <tr>
        <td><strong>${d.name || ''}</strong></td>
        <td class="danger-text" style="font-weight: bold;">${Number(d.amount || 0).toFixed(2)} ج.م</td>
        <td>${d.reason || ''}</td>
        <td><button class="btn-success" onclick="payDebtor(${d.id})">سداد من الدرج</button></td>
      </tr>
    `).join('');
  }

  // رسم جدول الدائنون
  const creditorsBody = document.getElementById('creditorsTableBody');
  if (creditorsBody) {
    creditorsBody.innerHTML = (state.creditors || []).map(c => `
      <tr>
        <td><strong>${c.name || ''}</strong></td>
        <td class="success-text" style="font-weight: bold;">${Number(c.amount || 0).toFixed(2)} ج.م</td>
        <td>${c.reason || ''}</td>
        <td><button class="btn-success" onclick="collectCreditor(${c.id})">تحصيل للدرج</button></td>
      </tr>
    `).join('');
  }
}

// التشغيل الأولي
checkAuth();