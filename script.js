// البيانات الأساسية للنظام
let drawerBalance = parseFloat(localStorage.getItem('drawerBalance')) || 0;
let clients = JSON.parse(localStorage.getItem('clients')) || [];
let financialLogs = JSON.parse(localStorage.getItem('financialLogs')) || [];
let services = JSON.parse(localStorage.getItem('services')) || [];
let currencySymbol = localStorage.getItem('currencySymbol') || 'ج.م';
let appName = localStorage.getItem('appName') || 'نظام إدارة الخدمات';

// حفظ البيانات تلقائياً في المتصفح
function saveData() {
  localStorage.setItem('drawerBalance', drawerBalance);
  localStorage.setItem('clients', JSON.stringify(clients));
  localStorage.setItem('financialLogs', JSON.stringify(financialLogs));
  localStorage.setItem('services', JSON.stringify(services));
  localStorage.setItem('currencySymbol', currencySymbol);
  localStorage.setItem('appName', appName);
}

// التنقل بين الأقسام
function switchTab(event, targetViewId) {
  if (event) event.preventDefault();

  const targetView = document.getElementById(targetViewId);
  if (!targetView) return;

  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });

  targetView.classList.add('active');

  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
}

// 1. تسجيل عميل جديد
document.getElementById('registrationForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const clientName = document.getElementById('clientName').value.trim();
  const serviceNumber = document.getElementById('serviceNumber').value.trim();
  const accountType = document.getElementById('accountType').value;

  if (clients.some(c => c.name === clientName)) {
    alert('اسم العميل موجود بالفعل!');
    return;
  }

  const newClient = {
    id: Date.now(),
    name: clientName,
    serviceNumber: serviceNumber,
    type: accountType,
    credit: 0,
    debit: 0
  };

  clients.push(newClient);
  saveData();
  refreshUI();

  document.getElementById('registrationForm').reset();
});

// تحديث اختيار العملاء القوائم
function updateClientsDropdowns() {
  const dropdowns = [
    document.getElementById('transactionClient'),
    document.getElementById('serviceClient')
  ];

  dropdowns.forEach(select => {
    if (!select) return;
    select.innerHTML = '<option value="">-- اختر العميل --</option>';
    clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.id;
      option.textContent = client.name;
      select.appendChild(option);
    });
  });
}

// 2. تسجيل حركة مالية
document.getElementById('financialForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const clientId = document.getElementById('transactionClient').value;
  const type = document.getElementById('transactionType').value;
  const amount = parseFloat(document.getElementById('transactionAmount').value);
  const note = document.getElementById('transactionNote').value || 'بدون ملاحظات';

  if (type !== 'deposit' && !clientId) {
    alert('يرجى اختيار العميل أولاً!');
    return;
  }

  let client = clients.find(c => c.id == clientId);
  let typeText = '';

  if (type === 'deposit') {
    drawerBalance += amount;
    typeText = 'إيداع مباشر للدرج';
  } else if (type === 'pay_debt') {
    drawerBalance += amount;
    if (client.debit >= amount) {
      client.debit -= amount;
    } else {
      const diff = amount - client.debit;
      client.debit = 0;
      client.credit += diff;
    }
    typeText = `سداد دين (${client.name})`;
  } else if (type === 'add_debt') {
    client.debit += amount;
    typeText = `تسجيل دين (${client.name})`;
  } else if (type === 'add_credit') {
    drawerBalance += amount;
    client.credit += amount;
    typeText = `إيداع مقدم (${client.name})`;
  }

  financialLogs.unshift({
    id: Date.now(),
    date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    clientName: client ? client.name : 'الدرج العام',
    type: typeText,
    amount: amount,
    note: note
  });

  saveData();
  refreshUI();

  document.getElementById('financialForm').reset();
});

// 3. إضافة خدمة جديدة
document.getElementById('serviceForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const clientId = document.getElementById('serviceClient').value;
  const serviceName = document.getElementById('serviceName').value.trim();
  const price = parseFloat(document.getElementById('servicePrice').value);
  const status = document.getElementById('serviceStatus').value;

  const client = clients.find(c => c.id == clientId);

  const newService = {
    id: Date.now(),
    clientName: client ? client.name : 'غير معروف',
    serviceName: serviceName,
    price: price,
    status: status
  };

  services.push(newService);
  saveData();
  refreshUI();

  document.getElementById('serviceForm').reset();
});

// ------------ عمليات الحذف ------------ //

// حذف عميل
function deleteClient(id) {
  if (confirm('هل أنت تأكد من حذف هذا العميل؟')) {
    clients = clients.filter(c => c.id !== id);
    saveData();
    refreshUI();
  }
}

// حذف حركة مالية من السجل
function deleteFinancialLog(id) {
  if (confirm('هل أنت تأكد من حذف هذه الحركة المالية من السجل؟')) {
    financialLogs = financialLogs.filter(log => log.id !== id);
    saveData();
    refreshUI();
  }
}

// حذف خدمة
function deleteService(id) {
  if (confirm('هل أنت تأكد من حذف هذه الخدمة؟')) {
    services = services.filter(s => s.id !== id);
    saveData();
    refreshUI();
  }
}

// ------------ إعدادات وإدارة البيانات ------------ //

document.getElementById('settingsForm').addEventListener('submit', function (e) {
  e.preventDefault();
  appName = document.getElementById('appNameInput').value.trim() || 'نظام إدارة الخدمات';
  currencySymbol = document.getElementById('currencyInput').value.trim() || 'ج.م';

  saveData();
  refreshUI();
  alert('تم حفظ الإعدادات بنجاح!');
});

function exportBackup() {
  const data = { drawerBalance, clients, financialLogs, services, currencySymbol, appName };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function resetAllData() {
  if (confirm('هل أنت تأكد من تصفير كافة بيانات النظام؟ لا يمكن التراجع عن هذا الإجراء.')) {
    localStorage.clear();
    drawerBalance = 0;
    clients = [];
    financialLogs = [];
    services = [];
    currencySymbol = 'ج.م';
    appName = 'نظام إدارة الخدمات';

    refreshUI();
    alert('تم تصفير كل بيانات النظام.');
  }
}

// ------------ تحديث الواجهات والجداول ------------ //

function refreshUI() {
  document.getElementById('sidebarTitle').textContent = appName;
  document.getElementById('currencyInput').value = currencySymbol;
  document.getElementById('appNameInput').value = appName;

  updateClientsDropdowns();
  renderAccountsTable();
  renderClientsFinanceTable();
  renderFinancialLogs();
  renderServicesTable();
  updateFinancialSummary();
  updateDashboardStats();
}

function updateFinancialSummary() {
  let totalDebit = 0;
  let totalCredit = 0;

  clients.forEach(c => {
    totalDebit += c.debit;
    totalCredit += c.credit;
  });

  document.getElementById('drawerBalance').textContent = `${drawerBalance.toFixed(2)} ${currencySymbol}`;
  document.getElementById('totalDebit').textContent = `${totalDebit.toFixed(2)} ${currencySymbol}`;
  document.getElementById('totalCredit').textContent = `${totalCredit.toFixed(2)} ${currencySymbol}`;
  document.getElementById('dashboardDrawer').textContent = `${drawerBalance.toFixed(2)} ${currencySymbol}`;
}

function renderClientsFinanceTable() {
  const tbody = document.getElementById('clientsFinanceTableBody');
  if (clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color: #888;">لا يوجد عملاء مسجلون حالياً</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  clients.forEach(c => {
    const net = c.credit - c.debit;
    let badge = net > 0 
      ? `<span class="badge badge-green">له رصيد (${net.toFixed(2)})</span>` 
      : net < 0 
      ? `<span class="badge badge-red">عليه دين (${Math.abs(net).toFixed(2)})</span>` 
      : `<span class="badge badge-gray">خالص الحساب</span>`;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td class="text-blue">${c.credit.toFixed(2)} ${currencySymbol}</td>
      <td class="text-red">${c.debit.toFixed(2)} ${currencySymbol}</td>
      <td><strong>${net.toFixed(2)} ${currencySymbol}</strong></td>
      <td>${badge}</td>
      <td><button class="btn-delete" onclick="deleteClient(${c.id})">حذف العميل</button></td>
    `;
    tbody.appendChild(row);
  });
}

function renderFinancialLogs() {
  const tbody = document.getElementById('financialLogTableBody');
  if (financialLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color: #888;">لا توجد حركات مالية مسجلة</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  financialLogs.forEach(log => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${log.date}</td>
      <td>${log.clientName}</td>
      <td>${log.type}</td>
      <td><strong>${log.amount.toFixed(2)} ${currencySymbol}</strong></td>
      <td>${log.note}</td>
      <td><button class="btn-delete" onclick="deleteFinancialLog(${log.id})">حذف</button></td>
    `;
    tbody.appendChild(row);
  });
}

function renderServicesTable() {
  const tbody = document.getElementById('servicesTableBody');
  if (services.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color: #888;">لا توجد خدمات مسجلة</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  services.forEach((s, index) => {
    let statusClass = 'badge-yellow';
    if (s.status === 'مكتملة') statusClass = 'badge-green';
    if (s.status === 'ملغاة') statusClass = 'badge-red';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${s.clientName}</strong></td>
      <td>${s.serviceName}</td>
      <td>${s.price.toFixed(2)} ${currencySymbol}</td>
      <td><span class="badge ${statusClass}">${s.status}</span></td>
      <td><button class="btn-delete" onclick="deleteService(${s.id})">حذف</button></td>
    `;
    tbody.appendChild(row);
  });
}

function renderAccountsTable() {
  const tbody = document.getElementById('accountsTableBody');
  if (clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color: #888;">لا يوجد حسابات مسجلة</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  clients.forEach((c, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${c.name}</td>
      <td>${c.serviceNumber}</td>
      <td>${c.type}</td>
      <td><button class="btn-delete" onclick="deleteClient(${c.id})">حذف</button></td>
    `;
    tbody.appendChild(row);
  });
}

function updateDashboardStats() {
  document.getElementById('totalClientsCount').textContent = clients.length;
  document.getElementById('totalServicesCount').textContent = services.length;
}

// تشغيل النظام عند تحميل الصفحة
window.onload = refreshUI;