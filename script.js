const DEFAULT_USER_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const DEFAULT_PASS_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

let authUserHash = localStorage.getItem('app_user_hash') || DEFAULT_USER_HASH;
let authPassHash = localStorage.getItem('app_pass_hash') || DEFAULT_PASS_HASH;

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// حقن أزرار المزامنة مباشرة في أعلى صفحة التطبيق لضمان ظهورها للجميع
document.addEventListener('DOMContentLoaded', () => {
  const appSection = document.getElementById('appSection');
  if (appSection && !document.getElementById('fixedSyncBar')) {
    const syncBar = document.createElement('div');
    syncBar.id = 'fixedSyncBar';
    syncBar.style.cssText = 'background: #1e293b; padding: 12px; margin-bottom: 15px; border-radius: 8px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; border: 1px solid #334155;';
    syncBar.innerHTML = `
      <span style="color: #38bdf8; font-weight: bold; font-size: 14px;">🔄 شريط المزامنة السريعة:</span>
      <div style="display: flex; gap: 8px; flex: 1; min-width: 250px;">
        <button type="button" id="globalExportBtn" style="flex:1; background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">📤 نسخ كود المزامنة</button>
        <button type="button" id="globalImportBtn" style="flex:1; background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">📥 لصق كود المزامنة</button>
      </div>
    `;
    appSection.insertBefore(syncBar, appSection.firstChild);

    // حدث زر التصدير/النسخ
    document.getElementById('globalExportBtn').addEventListener('click', () => {
      const syncData = {
        d: localStorage.getItem('br_drawer'),
        l: localStorage.getItem('br_logs'),
        s: localStorage.getItem('br_services'),
        db: localStorage.getItem('br_debtors'),
        cr: localStorage.getItem('br_creditors'),
        u: localStorage.getItem('app_user_hash'),
        p: localStorage.getItem('app_pass_hash')
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(syncData))));
      
      // محاولة النسخ التلقائي أو إظهار الكود بنص واضح
      navigator.clipboard.writeText(encoded).then(() => {
        alert('✅ تم نسخ كود المزامنة إلى الحافظة بنجاح!\n\nقم بلصقه في الجهاز الآخر.');
      }).catch(() => {
        prompt("نسخ الكود يدويًا (حدد الكل واضغط نسخ):", encoded);
      });
    });

    // حدث زر الاستيراد/اللصق
    document.getElementById('globalImportBtn').addEventListener('click', () => {
      const inputCode = prompt("الرجاء لصق كود المزامنة هنا:");
      if (!inputCode) return;
      try {
        const decoded = decodeURIComponent(escape(atob(inputCode.trim())));
        const data = JSON.parse(decoded);

        if (data.d !== undefined) localStorage.setItem('br_drawer', data.d);
        if (data.l) localStorage.setItem('br_logs', data.l);
        if (data.s) localStorage.setItem('br_services', data.s);
        if (data.db) localStorage.setItem('br_debtors', data.db);
        if (data.cr) localStorage.setItem('br_creditors', data.cr);
        if (data.u) localStorage.setItem('app_user_hash', data.u);
        if (data.p) localStorage.setItem('app_pass_hash', data.p);

        alert('🎉 تمت المزامنة وتحديث البيانات بنجاح!');
        location.reload();
      } catch (err) {
        alert('❌ خطأ: الكود غير صالح أو غير مكتمل، تأكد من نسخه كاملاً.');
      }
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

// نظام تسجيل الدخول
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
  if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
    sessionStorage.removeItem('isLoggedIn');
    checkAuth();
  }
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

// 1. حركة الدرج
document.getElementById('drawerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = document.getElementById('drawerTxType').value;
  const amount = parseFloat(document.getElementById('drawerTxAmount').value);
  const note = document.getElementById('drawerTxNote').value;

  addLog(type, amount, note);
  saveState();
  e.target.reset();
  alert('تمت العملية بنجاح');
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
  alert('تم حفظ الخدمة');
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
  alert('تم إضافة المدين');
});

function payDebtor(id) {
  const debtor = state.debtors.find(d => d.id === id);
  if (!debtor) return;

  const payAmount = parseFloat(prompt(`سداد دين لـ (${debtor.name})\nالمبلغ المتبقي: ${debtor.amount} ج.م\nأدخل مبلغ السداد:`, debtor.amount));
  if (payAmount > 0 && payAmount <= debtor.amount) {
    debtor.amount -= payAmount;
    addLog('out', payAmount, `سداد دين لـ: ${debtor.name}`);
    if (debtor.amount === 0) {
      state.debtors = state.debtors.filter(d => d.id !== id);
    }
    saveState();
  }
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
  alert('تم إضافة الدائن');
});

function collectCreditor(id) {
  const creditor = state.creditors.find(c => c.id === id);
  if (!creditor) return;

  const collectAmount = parseFloat(prompt(`تحصيل مبلغ من (${creditor.name})\nالمبلغ المستحق: ${creditor.amount} ج.م\nأدخل مبلغ التحصيل:`, creditor.amount));
  if (collectAmount > 0 && collectAmount <= creditor.amount) {
    creditor.amount -= collectAmount;
    addLog('in', collectAmount, `تحصيل مستحق من: ${creditor.name}`);
    if (creditor.amount === 0) {
      state.creditors = state.creditors.filter(c => c.id !== id);
    }
    saveState();
  }
}

function deleteLog(id) {
  if (confirm('هل أنت متأكد من حذف هذه الحركة؟')) {
    const log = state.logs.find(l => l.id === id);
    if (log) {
      if (log.type === 'in') state.drawerBalance -= log.amount;
      if (log.type === 'out') state.drawerBalance += log.amount;
      state.logs = state.logs.filter(l => l.id !== id);
      saveState();
    }
  }
}

function deleteService(id) {
  if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
    state.services = state.services.filter(s => s.id !== id);
    saveState();
  }
}

// تحديث الواجهة
function renderUI() {
  const drawerDisplay = document.getElementById('drawerDisplay');
  if (drawerDisplay) drawerDisplay.textContent = `${state.drawerBalance.toFixed(2)} ج.م`;

  const totalRevenues = state.services.reduce((sum, item) => sum + item.cost, 0);
  const trEl = document.getElementById('totalRevenuesDisplay');
  if (trEl) trEl.textContent = `${totalRevenues.toFixed(2)} ج.م`;

  const totalExpenses = state.logs
    .filter(log => log.type === 'out')
    .reduce((sum, log) => sum + log.amount, 0);
  const teEl = document.getElementById('totalExpensesDisplay');
  if (teEl) teEl.textContent = `${totalExpenses.toFixed(2)} ج.م`;

  const netProfit = totalRevenues - totalExpenses;
  const netProfitEl = document.getElementById('netProfitDisplay');
  if (netProfitEl) {
    netProfitEl.textContent = `${netProfit.toFixed(2)} ج.م`;
    netProfitEl.className = `card-value ${netProfit >= 0 ? 'success-text' : 'danger-text'}`;
  }

  const totalDebtors = state.debtors.reduce((sum, item) => sum + item.amount, 0);
  const tdEl = document.getElementById('totalDebtorsDisplay');
  if (tdEl) tdEl.textContent = `${totalDebtors.toFixed(2)} ج.م`;

  const totalCreditors = state.creditors.reduce((sum, item) => sum + item.amount, 0);
  const tcEl = document.getElementById('totalCreditorsDisplay');
  if (tcEl) tcEl.textContent = `${totalCreditors.toFixed(2)} ج.م`;

  const dtBody = document.getElementById('drawerTableBody');
  if (dtBody) {
    dtBody.innerHTML = state.logs.map(log => `
      <tr>
        <td>${log.time}</td>
        <td><span class="badge ${log.type === 'in' ? 'badge-success' : 'badge-danger'}">${log.type === 'in' ? 'إيداع (+)' : 'سحب (-)'}</span></td>
        <td><strong>${log.amount.toFixed(2)} ج.م</strong></td>
        <td>${log.note}</td>
        <td><button class="btn-danger btn-small" onclick="deleteLog(${log.id})">حذف</button></td>
      </tr>
    `).join('');
  }

  const stBody = document.getElementById('servicesTableBody');
  if (stBody) {
    stBody.innerHTML = state.services.map(s => {
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
  }

  const debtBody = document.getElementById('debtorsTableBody');
  if (debtBody) {
    debtBody.innerHTML = state.debtors.map(d => `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td class="danger-text" style="font-weight: bold;">${d.amount.toFixed(2)} ج.م</td>
        <td>${d.reason}</td>
        <td><button class="btn-success" onclick="payDebtor(${d.id})">سداد من الدرج</button></td>
      </tr>
    `).join('');
  }

  const credBody = document.getElementById('creditorsTableBody');
  if (credBody) {
    credBody.innerHTML = state.creditors.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td class="success-text" style="font-weight: bold;">${c.amount.toFixed(2)} ج.م</td>
        <td>${c.reason}</td>
        <td><button class="btn-success" onclick="collectCreditor(${c.id})">تحصيل للدرج</button></td>
      </tr>
    `).join('');
  }
}

checkAuth();