const SUPABASE_URL = 'https://wzznqnagjccxkqxlwuqu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PmNID_cCg92YRghHV1WSYQ_043c7qgk';

// دالة جلب الهيدرز مع توكن الجلسة الحقيقي
function getSupabaseHeaders() {
  const token = sessionStorage.getItem('sb_access_token');
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

let state = {
  drawerBalance: 0,
  logs: [],
  services: [],
  debtors: [],
  creditors: []
};

// ---------------- نظام التحقق من حالة النظام (قفل/فتح) ----------------
async function checkSystemStatus() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?select=*`, {
      headers: getSupabaseHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const setting = data[0];
        if (setting.status === 'locked' || setting.active === false) {
          document.body.innerHTML = `            
            <div style="
    display: flex; 
    justify-content: center; 
    align-items: center; 
    height: 100vh; 
    background: linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%); 
    font-family: 'Cairo', sans-serif; 
    text-align: center; 
    direction: rtl; 
    padding: 20px;
    margin: 0;
  ">
    <div style="
      background: rgba(17, 24, 39, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 20px;
      padding: 45px 30px;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    ">
      <div style="font-size: 48px; margin-bottom: 15px; filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.4));">⚠️</div>
      <h2 style="color: #f87171; font-size: 22px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px;">تم إيقاف النظام لعمل إجراء صيانة</h2>
      <h2 style="color: #dfd8d8; font-size: 22px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px;">نأسف على الإزعاج، النظام غير متاح حالياً</h2>  
      <p style="color: #9ca3af; font-size: 20px; line-height: 1.6; margin-bottom: 25px;">يرجى التواصل مع الدعم الفني من خلال الرقم:</p>
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px dashed rgba(239, 68, 68, 0.3); padding: 10px; border-radius: 10px; color: #fca5a5; font-size: 16px; font-weight: bold; direction: ltr; display: inline-block; margin-bottom: 20px;">
        01040810091
      </div>
      <div style="font-size: 12px; color: #eef2f7; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 15px; margin-top: 10px;">
      نظام إدارة الأعمال الدعم الفني🔒
      </div>
    </div>
  </div>
          `;
          return false;
        }
      }
    }
  } catch (err) {
    console.error("فشل التحقق من حالة النظام:", err);
  }
  return true;
}

// ---------------- نظام تسجيل الدخول عبر Supabase Auth ----------------
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      const welcomeSec = document.getElementById('welcomeSection');
      const loginSec = document.getElementById('loginSection');
      if (welcomeSec) welcomeSec.style.display = 'none';
      if (loginSec) loginSec.classList.remove('hidden');
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('usernameInput').value.trim();
      const pass = document.getElementById('passwordInput').value.trim();
      const errorMsg = document.getElementById('loginError');

      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password: pass })
        });

        if (res.ok) {
          const data = await res.json();
          sessionStorage.setItem('sb_access_token', data.access_token);
          if (errorMsg) errorMsg.style.display = 'none';
          e.target.reset();
          checkAuth();
        } else {
          if (errorMsg) {
            errorMsg.textContent = 'بيانات الدخول غير صحيحة';
            errorMsg.style.display = 'block';
          }
        }
      } catch (err) {
        console.error('Login error:', err);
        if (errorMsg) {
          errorMsg.textContent = 'فشل الاتصال بالسيرفر';
          errorMsg.style.display = 'block';
        }
      }
    });
  }

  const authForm = document.getElementById('changeAuthForm');
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Swal.fire('تنبيه', 'إدارة الحسابات تتم من لوحة تحكم من ادمن ', 'info');
    });
  }

  checkAuth();
});

function logout() {
  Swal.fire({
    title: 'log out',
    text: 'going to log out, are you sure?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'yes, log out',
    cancelButtonText: 'cancel'
  }).then(async (result) => {
    if (result.isConfirmed) {
      sessionStorage.removeItem('sb_access_token');
      checkAuth();
      const welcomeSec = document.getElementById('welcomeSection');
      if (welcomeSec) welcomeSec.style.display = 'flex';
    }
  });
}

async function checkAuth() {
  const token = sessionStorage.getItem('sb_access_token');
  const welcomeSec = document.getElementById('welcomeSection');
  const loginSec = document.getElementById('loginSection');
  const appSec = document.getElementById('appSection');

  if (token) {
    const isActive = await checkSystemStatus();
    if (!isActive) return;

    if (welcomeSec) welcomeSec.style.display = 'none';
    if (loginSec) loginSec.classList.add('hidden');
    if (appSec) appSec.classList.remove('hidden');

    loadStateFromSupabase();
  } else {
    if (appSec) appSec.classList.add('hidden');
  }
}

// ---------------- جلب البيانات من Supabase ----------------
async function loadStateFromSupabase() {
  try {
    const headers = getSupabaseHeaders();
    const [txRes, srvRes, debRes, credRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/transactions?select=*&order=created_at.desc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/services?select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/debtors?select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/creditors?select=*`, { headers })
    ]);

    if (txRes.status === 401 || srvRes.status === 401) {
      sessionStorage.removeItem('sb_access_token');
      checkAuth();
      return;
    }

    state.logs = txRes.ok ? await txRes.json() : [];
    state.services = srvRes.ok ? await srvRes.json() : [];
    state.debtors = debRes.ok ? await debRes.json() : [];
    state.creditors = credRes.ok ? await credRes.json() : [];

    state.drawerBalance = state.logs.reduce((acc, log) => {
      const amt = Number(log.amount || 0);
      const isInc = String(log.type || '').toLowerCase() === 'in';
      return isInc ? acc + amt : acc - amt;
    }, 0);

    renderUI();
  } catch (err) {
    console.error("فشل الاتصال بـ Supabase:", err);
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

// 1. نموذج الدرج
const drawerForm = document.getElementById('drawerForm');
if (drawerForm) {
  drawerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('drawerTxType').value;
    const amount = parseFloat(document.getElementById('drawerTxAmount').value) || 0;
    const note = document.getElementById('drawerTxNote').value || '';

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
        method: 'POST',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({ type, amount: Number(amount), notes: note })
      });
      if (res.ok) {
        await loadStateFromSupabase();
        e.target.reset();
        Swal.fire({ icon: 'success', title: 'success fully', timer: 1200, showConfirmButton: false });
      } else {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'failed to save the transaction' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: 'failed to save the transaction' });
    }
  });
}

// 2. أرقام الخدمة
const serviceForm = document.getElementById('serviceForm');
if (serviceForm) {
  serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = document.getElementById('serviceNumInput').value;
    const client = document.getElementById('serviceClientInput').value;
    const cost = parseFloat(document.getElementById('serviceCostInput').value) || 0;
    const status = document.getElementById('servicePaymentStatus').value;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/services`, {
        method: 'POST',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({ num, client, cost, status })
      });

      if (status === 'paid') {
        await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: getSupabaseHeaders(),
          body: JSON.stringify({ type: 'in', amount: cost, notes: `تحصيل خدمة (${num}) - العميل: ${client}` })
        });
      }

      await loadStateFromSupabase();
      e.target.reset();
      Swal.fire({ icon: 'success', title: 'success fully', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: 'failed to save the service' });
    }
  });
}

// 3. مدينون
const debtorForm = document.getElementById('debtorForm');
if (debtorForm) {
  debtorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('debtorName').value;
    const amount = parseFloat(document.getElementById('debtorAmount').value) || 0;
    const reason = document.getElementById('debtorReason').value;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/debtors`, {
        method: 'POST',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({ name, amount, reason })
      });
      await loadStateFromSupabase();
      e.target.reset();
      Swal.fire({ icon: 'success', title: 'success fully add the debtor', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: 'failed to add the debtor' });
    }
  });
}

function payDebtor(id) {
  const debtor = state.debtors.find(d => d.id == id);
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
        const remaining = Number((debtor.amount - payAmount).toFixed(2));
        
        if (remaining <= 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/debtors?id=eq.${id}`, {
            method: 'DELETE',
            headers: getSupabaseHeaders()
          });
        } else {
          await fetch(`${SUPABASE_URL}/rest/v1/debtors?id=eq.${id}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({ amount: remaining })
          });
        }

        await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: getSupabaseHeaders(),
          body: JSON.stringify({ type: 'out', amount: payAmount, notes: `سداد دين لـ: ${debtor.name}` })
        });
        await loadStateFromSupabase();
      }
    }
  });
}

// 4. دائنون
const creditorForm = document.getElementById('creditorForm');
if (creditorForm) {
  creditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('creditorName').value;
    const amount = parseFloat(document.getElementById('creditorAmount').value) || 0;
    const reason = document.getElementById('creditorReason').value;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/creditors`, {
        method: 'POST',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({ name, amount, reason })
      });
      await loadStateFromSupabase();
      e.target.reset();
      Swal.fire({ icon: 'success', title: 'تم إضافة الدائن', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل إضافة الدائن' });
    }
  });
}

function collectCreditor(id) {
  const creditor = state.creditors.find(c => c.id == id);
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
        const remaining = Number((creditor.amount - collectAmount).toFixed(2));

        if (remaining <= 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/creditors?id=eq.${id}`, {
            method: 'DELETE',
            headers: getSupabaseHeaders()
          });
        } else {
          await fetch(`${SUPABASE_URL}/rest/v1/creditors?id=eq.${id}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({ amount: remaining })
          });
        }

        await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: getSupabaseHeaders(),
          body: JSON.stringify({ type: 'in', amount: collectAmount, notes: `تحصيل مستحق من: ${creditor.name}` })
        });
        await loadStateFromSupabase();
      }
    }
  });
}

function deleteLog(id) {
  Swal.fire({
    title: 'Delete Transaction',
    text: 'Are you sure you want to delete this transaction?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'yes, delete',
    cancelButtonText: 'cancel'
  }).then(async (result) => {
    if (result.isConfirmed) {
      await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders()
      });
      await loadStateFromSupabase();
    }
  });
}

function deleteService(id) {
  Swal.fire({
    title: 'Delete Service',
    text: 'Are you sure you want to delete this service?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'yes, delete',
    cancelButtonText: 'cancel'
  }).then(async (result) => {
    if (result.isConfirmed) {
      await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders()
      });
      await loadStateFromSupabase();
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

  const drawerBody = document.getElementById('drawerTableBody');
  if (drawerBody) {
    drawerBody.innerHTML = (state.logs || []).map(log => {
      const isIncome = String(log.type || '').toLowerCase() === 'in';
      const amt = Number(log.amount || 0).toFixed(2);
      const timeStr = log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
      return `
        <tr>
          <td>${timeStr}</td>
          <td><span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">${isIncome ? 'إيداع (+)' : 'سحب (-)'}</span></td>
          <td><strong>${amt} ج.م</strong></td>
          <td>${log.notes || ''}</td>
          <td><button class="btn-danger btn-small" onclick="deleteLog(${log.id})">حذف</button></td>
        </tr>
      `;
    }).join('');
  }

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