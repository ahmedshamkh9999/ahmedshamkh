import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ---------------- تهيئة Firebase ----------------
const firebaseConfig = {
  apiKey: "AIzaSyDvqses2apRbgaV2nuqi1PXQUkSJLen7Sk",
  authDomain: "ahmed-55bb3.firebaseapp.com",
  databaseURL: "https://ahmed-55bb3-default-rtdb.firebaseio.com",
  projectId: "ahmed-55bb3",
  storageBucket: "ahmed-55bb3.firebasestorage.app",
  messagingSenderId: "302443612277",
  appId: "1:302443612277:web:56ff03a8a3f14b8e24503c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// البيانات المعتمدة لتسجيل الدخول
const AUTH_USER = "admin";
const AUTH_PASS = "1234";

// حالة بيانات النظام الأولى
let state = {
  drawerBalance: 0,
  logs: [],
  services: [],
  debtors: [],
  creditors: []
};

// ---------------- الاستماع للتغيرات لحظياً من Firebase ----------------
onValue(ref(db, 'app_state'), (snapshot) => {
  console.log("Firebase Connected successfully! Data retrieved:", snapshot.val());
  const data = snapshot.val();
  if (data) {
    state = {
      drawerBalance: data.drawerBalance || 0,
      logs: data.logs || [],
      services: data.services || [],
      debtors: data.debtors || [],
      creditors: data.creditors || []
    };
  } else {
    state = { drawerBalance: 0, logs: [], services: [], debtors: [], creditors: [] };
  }
  renderUI();
}, (error) => {
  console.error("Firebase Read Error:", error);
});

// حفظ الحالة في Firebase عند أي تعديل
function saveState() {
  console.log("Saving new state to Firebase...", state);
  set(ref(db, 'app_state'), state)
    .then(() => {
      console.log("State saved successfully!");
    })
    .catch((error) => {
      console.error("Firebase Save Error:", error);
    });
}

// ---------------- نظام تسجيل الدخول ----------------

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('usernameInput').value.trim();
  const pass = document.getElementById('passwordInput').value.trim();
  const errorMsg = document.getElementById('loginError');

  if (user === AUTH_USER && pass === AUTH_PASS) {
    sessionStorage.setItem('isLoggedIn', 'true');
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
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
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

function switchTab(e, tabId) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.section-view').forEach(s => s.classList.remove('active'));
  
  e.currentTarget.classList.add('active');
  document.getElementById(tabId).classList.add('active');
  document.getElementById('pageTitle').textContent = e.currentTarget.textContent;
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
  // رصيد الدرج
  document.getElementById('drawerDisplay').textContent = `${state.drawerBalance.toFixed(2)} ج.م`;

  // 1. حساب إجمالي الإيرادات (مجموع القيم لجميع الخدمات)
  const totalRevenues = state.services.reduce((sum, item) => sum + item.cost, 0);
  document.getElementById('totalRevenuesDisplay').textContent = `${totalRevenues.toFixed(2)} ج.م`;

  // 2. حساب إجمالي المصروفات والسحوبات من اليومية
  const totalExpenses = state.logs
    .filter(log => log.type === 'out')
    .reduce((sum, log) => sum + log.amount, 0);
  document.getElementById('totalExpensesDisplay').textContent = `${totalExpenses.toFixed(2)} ج.م`;

  // 3. حساب صافي الربح (الإيرادات - المصروفات)
  const netProfit = totalRevenues - totalExpenses;
  const netProfitEl = document.getElementById('netProfitDisplay');
  netProfitEl.textContent = `${netProfit.toFixed(2)} ج.م`;
  netProfitEl.className = `card-value ${netProfit >= 0 ? 'success-text' : 'danger-text'}`;

  // حساب إجمالي المدينين والدائنين
  const totalDebtors = state.debtors.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById('totalDebtorsDisplay').textContent = `${totalDebtors.toFixed(2)} ج.م`;

  const totalCreditors = state.creditors.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById('totalCreditorsDisplay').textContent = `${totalCreditors.toFixed(2)} ج.م`;

  // عرض جدول حركة الدرج
  document.getElementById('drawerTableBody').innerHTML = state.logs.map(log => `
    <tr>
      <td>${log.time}</td>
      <td><span class="badge ${log.type === 'in' ? 'badge-success' : 'badge-danger'}">${log.type === 'in' ? 'إيداع (+)' : 'سحب (-)'}</span></td>
      <td><strong>${log.amount.toFixed(2)} ج.م</strong></td>
      <td>${log.note}</td>
      <td><button class="btn-danger btn-small" onclick="deleteLog(${log.id})">حذف</button></td>
    </tr>
  `).join('');

  // عرض جدول الخدمات
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

  // عرض جدول مدينون
  document.getElementById('debtorsTableBody').innerHTML = state.debtors.map(d => `
    <tr>
      <td><strong>${d.name}</strong></td>
      <td class="danger-text" style="font-weight: bold;">${d.amount.toFixed(2)} ج.م</td>
      <td>${d.reason}</td>
      <td><button class="btn-success" onclick="payDebtor(${d.id})">سداد من الدرج</button></td>
    </tr>
  `).join('');

  // عرض جدول دائنون
  document.getElementById('creditorsTableBody').innerHTML = state.creditors.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td class="success-text" style="font-weight: bold;">${c.amount.toFixed(2)} ج.م</td>
      <td>${c.reason}</td>
      <td><button class="btn-success" onclick="collectCreditor(${c.id})">تحصيل للدرج</button></td>
    </tr>
  `).join('');
}

// إتاحة الدوال للنافذة لتسليم الأحداث من أزرار HTML
window.logout = logout;
window.switchTab = switchTab;
window.payDebtor = payDebtor;
window.collectCreditor = collectCreditor;
window.deleteLog = deleteLog;
window.deleteService = deleteService;

// التحقق من الجلسة عند تحميل الصفحة
checkAuth();