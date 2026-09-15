<<<<<<< HEAD
// ---------------- التشفير وحفظ البيانات المعتمدة ----------------
const DEFAULT_USER_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const DEFAULT_PASS_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

let authUserHash = localStorage.getItem('app_user_hash') || DEFAULT_USER_HASH;
let authPassHash = localStorage.getItem('app_pass_hash') || DEFAULT_PASS_HASH;

// دالة تشفير SHA-256 لحماية البيانات
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// دالة لتغيير اسم المستخدم وكلمة السر
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

// معالجة نموذج تغيير البيانات (الآمن بعد إضافة التحقق)
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

      // التحقق من صحة كلمة السر الحالية
      if (document.getElementById('currentPasswordInput')) {
        const inputCurrentHash = await hashText(currentPass);
        if (inputCurrentHash !== authPassHash) {
          Swal.fire({
            icon: 'error',
            title: 'خطأ!',
            text: 'كلمة السر الحالية غير صحيحة، لا يمكنك تغيير البيانات.',
            confirmButtonColor: '#ef4444'
          });
          return;
        }
      }

      await changeCredentials(newUsers, newPass);

      Swal.fire({
        icon: 'success',
        title: 'تم التحديث بنجاح!',
        text: 'تم تغيير اسم المستخدم وكلمة السر بنجاح.',
        confirmButtonColor: '#10b981'
      });

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
    text: 'هل أنت تأكد من تسجيل الخروج؟',
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

// ---------------- منطق إدارة النظام ----------------

function saveState() {
  localStorage.setItem('br_drawer', state.drawerBalance);
  localStorage.setItem('br_logs', JSON.stringify(state.logs));
  localStorage.setItem('br_services', JSON.stringify(state.services));
  localStorage.setItem('br_debtors', JSON.stringify(state.debtors));
  localStorage.setItem('br_creditors', JSON.stringify(state.creditors));
  renderUI();
}

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

// 1. حركة الدرج المباشرة
document.getElementById('drawerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = document.getElementById('drawerTxType').value;
  const amount = parseFloat(document.getElementById('drawerTxAmount').value);
  const note = document.getElementById('drawerTxNote').value;

  addLog(type, amount, note);
  saveState();
  e.target.reset();
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
});

function payDebtor(id) {
  const debtor = state.debtors.find(d => d.id === id);
  if (!debtor) return;

  Swal.fire({
    title: `سداد دين لـ (${debtor.name})`,
    text: `المبلغ المتبقي: ${debtor.amount} ج.م`,
    input: 'number',
    inputValue: debtor.amount,
    inputAttributes: {
      min: '0.01',
      max: debtor.amount,
      step: 'any'
    },
    showCancelButton: true,
    confirmButtonText: 'سداد',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b',
    inputValidator: (value) => {
      const val = parseFloat(value);
      if (!val || val <= 0 || val > debtor.amount) {
        return `يرجى إدخال مبلغ صحيح حتى ${debtor.amount} ج.م`;
      }
    }
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
});

function collectCreditor(id) {
  const creditor = state.creditors.find(c => c.id === id);
  if (!creditor) return;

  Swal.fire({
    title: `تحصيل مبلغ من (${creditor.name})`,
    text: `المبلغ المستحق: ${creditor.amount} ج.م`,
    input: 'number',
    inputValue: creditor.amount,
    inputAttributes: {
      min: '0.01',
      max: creditor.amount,
      step: 'any'
    },
    showCancelButton: true,
    confirmButtonText: 'تحصيل',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b',
    inputValidator: (value) => {
      const val = parseFloat(value);
      if (!val || val <= 0 || val > creditor.amount) {
        return `يرجى إدخال مبلغ صحيح حتى ${creditor.amount} ج.م`;
      }
    }
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
    text: 'حذف هذه الحركة؟ (لن تتأثر بقية الجداول)',
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
    text: 'هل أنت تأكد من حذف هذه الخدمة؟',
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

// ---------------- تحديث الواجهة وحساب الأرباح ----------------
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

=======
// ---------------- التشفير وحفظ البيانات المعتمدة ----------------
const DEFAULT_USER_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const DEFAULT_PASS_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

let authUserHash = localStorage.getItem('app_user_hash') || DEFAULT_USER_HASH;
let authPassHash = localStorage.getItem('app_pass_hash') || DEFAULT_PASS_HASH;

// دالة تشفير SHA-256 لحماية البيانات
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// دالة لتغيير اسم المستخدم وكلمة السر
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

// معالجة نموذج تغيير البيانات (الآمن بعد إضافة التحقق)
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

      // التحقق من صحة كلمة السر الحالية
      if (document.getElementById('currentPasswordInput')) {
        const inputCurrentHash = await hashText(currentPass);
        if (inputCurrentHash !== authPassHash) {
          Swal.fire({
            icon: 'error',
            title: 'خطأ!',
            text: 'كلمة السر الحالية غير صحيحة، لا يمكنك تغيير البيانات.',
            confirmButtonColor: '#ef4444'
          });
          return;
        }
      }

      await changeCredentials(newUsers, newPass);

      Swal.fire({
        icon: 'success',
        title: 'تم التحديث بنجاح!',
        text: 'تم تغيير اسم المستخدم وكلمة السر بنجاح.',
        confirmButtonColor: '#10b981'
      });

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
    text: 'هل أنت تأكد من تسجيل الخروج؟',
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

// ---------------- منطق إدارة النظام ----------------

function saveState() {
  localStorage.setItem('br_drawer', state.drawerBalance);
  localStorage.setItem('br_logs', JSON.stringify(state.logs));
  localStorage.setItem('br_services', JSON.stringify(state.services));
  localStorage.setItem('br_debtors', JSON.stringify(state.debtors));
  localStorage.setItem('br_creditors', JSON.stringify(state.creditors));
  renderUI();
}

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

// 1. حركة الدرج المباشرة
document.getElementById('drawerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = document.getElementById('drawerTxType').value;
  const amount = parseFloat(document.getElementById('drawerTxAmount').value);
  const note = document.getElementById('drawerTxNote').value;

  addLog(type, amount, note);
  saveState();
  e.target.reset();
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
});

function payDebtor(id) {
  const debtor = state.debtors.find(d => d.id === id);
  if (!debtor) return;

  Swal.fire({
    title: `سداد دين لـ (${debtor.name})`,
    text: `المبلغ المتبقي: ${debtor.amount} ج.م`,
    input: 'number',
    inputValue: debtor.amount,
    inputAttributes: {
      min: '0.01',
      max: debtor.amount,
      step: 'any'
    },
    showCancelButton: true,
    confirmButtonText: 'سداد',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b',
    inputValidator: (value) => {
      const val = parseFloat(value);
      if (!val || val <= 0 || val > debtor.amount) {
        return `يرجى إدخال مبلغ صحيح حتى ${debtor.amount} ج.م`;
      }
    }
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
});

function collectCreditor(id) {
  const creditor = state.creditors.find(c => c.id === id);
  if (!creditor) return;

  Swal.fire({
    title: `تحصيل مبلغ من (${creditor.name})`,
    text: `المبلغ المستحق: ${creditor.amount} ج.م`,
    input: 'number',
    inputValue: creditor.amount,
    inputAttributes: {
      min: '0.01',
      max: creditor.amount,
      step: 'any'
    },
    showCancelButton: true,
    confirmButtonText: 'تحصيل',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b',
    inputValidator: (value) => {
      const val = parseFloat(value);
      if (!val || val <= 0 || val > creditor.amount) {
        return `يرجى إدخال مبلغ صحيح حتى ${creditor.amount} ج.م`;
      }
    }
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
    text: 'حذف هذه الحركة؟ (لن تتأثر بقية الجداول)',
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
    text: 'هل أنت تأكد من حذف هذه الخدمة؟',
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

// ---------------- تحديث الواجهة وحساب الأرباح ----------------
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

>>>>>>> c96e764d30a75a2739bd30dccd142e12e4b22af8
checkAuth();