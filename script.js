const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const dateInput = document.getElementById('date');
const descCounter = document.getElementById('desc-counter');
const MAX_DESC = 80;

// Default percentage split (stored as decimals)
const DEFAULT_PCTS = { p1: 0.10, p2: 0.50, p3: 0.40 };

// Default settings
const DEFAULT_SETTINGS = { p1: DEFAULT_PCTS.p1, p2: DEFAULT_PCTS.p2, p3: DEFAULT_PCTS.p3, dark: false };

// Keys used in localStorage
const LS_PCTS_KEY = 'expense_tracker_pcts_v1';

// const dummyTransactions = [
//   { id: 1, text: 'Flower', amount: -20 },
//   { id: 2, text: 'Salary', amount: 300 },
//   { id: 3, text: 'Book', amount: -10 },
//   { id: 4, text: 'Camera', amount: 150 }
// ];

// Initialize IndexedDB
const OLD_DB_NAME = 'ExpenseTrackerDB';
const dbName = 'onefifthDB';
const dbVersion = 2;
let db;

// Helper: check if a database exists (uses indexedDB.databases() when available)
async function databaseExists(name) {
  if (typeof indexedDB.databases === 'function') {
    try {
      const dbs = await indexedDB.databases();
      return dbs.some(d => d.name === name);
    } catch (e) {
      // fallthrough to fallback
    }
  }

  // Fallback: attempt to open the DB and detect upgrade
  return new Promise((resolve) => {
    let upgraded = false;
    const req = indexedDB.open(name);
    req.onupgradeneeded = () => {
      upgraded = true; // DB didn't exist (or schema upgrade would run)
    };
    req.onsuccess = (ev) => {
      const opened = ev.target.result;
      opened.close();
      if (upgraded) {
        // remove the accidentally created DB
        indexedDB.deleteDatabase(name).onsuccess = () => resolve(false);
      } else resolve(true);
    };
    req.onerror = () => resolve(false);
  });
}

async function migrateOldDBIfNeeded() {
  if (OLD_DB_NAME === dbName) return; // nothing to do
  const exists = await databaseExists(OLD_DB_NAME);
  if (!exists) return; // no old DB to migrate

  // Read old DB data
  const oldOpenReq = indexedDB.open(OLD_DB_NAME);
  const oldData = { transactions: [], settings: null };
  await new Promise((resolve) => {
    oldOpenReq.onsuccess = () => {
      const oldDb = oldOpenReq.result;
      if (oldDb.objectStoreNames.contains('transactions')) {
        const tx = oldDb.transaction(['transactions'], 'readonly');
        const store = tx.objectStore('transactions');
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => { oldData.transactions = getAllReq.result || []; };
      }
      if (oldDb.objectStoreNames.contains('settings')) {
        const tx2 = oldDb.transaction(['settings'], 'readonly');
        const store2 = tx2.objectStore('settings');
        const getReq = store2.get('dashboard');
        getReq.onsuccess = () => { oldData.settings = (getReq.result && getReq.result.value) || null; };
      }
      // wait a tick to ensure async gets finished
      setTimeout(() => { oldDb.close(); resolve(); }, 200);
    };
    oldOpenReq.onerror = () => resolve();
  });

  // Open (or create) new DB and import data
  const newOpenReq = indexedDB.open(dbName, dbVersion);
  newOpenReq.onupgradeneeded = (event) => {
    const newDb = event.target.result;
    if (!newDb.objectStoreNames.contains('transactions')) {
      const store = newDb.createObjectStore('transactions', { keyPath: 'id' });
      store.createIndex('date', 'date', { unique: false });
    }
    if (!newDb.objectStoreNames.contains('settings')) {
      newDb.createObjectStore('settings', { keyPath: 'key' });
    }
  };
  await new Promise((resolve) => {
    newOpenReq.onsuccess = () => {
      const newDb = newOpenReq.result;
      // import transactions
      if (oldData.transactions && oldData.transactions.length) {
        const tx = newDb.transaction(['transactions'], 'readwrite');
        const store = tx.objectStore('transactions');
        oldData.transactions.forEach(t => {
          try { store.put(t); } catch (e) { /* ignore */ }
        });
      }
      // import settings
      if (oldData.settings) {
        const tx2 = newDb.transaction(['settings'], 'readwrite');
        const store2 = tx2.objectStore('settings');
        try { store2.put({ key: 'dashboard', value: oldData.settings }); } catch (e) { }
      }
      newDb.close();
      resolve();
    };
    newOpenReq.onerror = () => resolve();
  });
}

const initDB = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await migrateOldDBIfNeeded();
    } catch (e) {
      console.warn('Migration check failed', e);
    }

    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
      // create settings store to persist UI preferences
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
};

let transactions = [];

// Load all transactions from IndexedDB
const loadTransactions = () => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');
    const request = store.getAll();

    request.onsuccess = () => {
      transactions = request.result;
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// Add transaction
function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === '' || amount.value.trim() === '') {
    alert('Please add a text and amount');
    return;
  }

  const selectedDate = dateInput ? dateInput.value : new Date().toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  if (selectedDate > today) {
    alert('Cannot add transactions for future dates');
    return;
  }

  // Clean and enforce maxlength on description
  let cleanedText = text.value.trim().replace(/\s+/g, ' ');
  if (cleanedText.length > MAX_DESC) cleanedText = cleanedText.slice(0, MAX_DESC);

  // Store just the date portion (YYYY-MM-DD)
  const transactionDate = selectedDate;

  const transaction = {
    id: generateID(),
    text: cleanedText,
    amount: +amount.value,
    date: transactionDate
  };

  // Add to IndexedDB
  const transaction_db = db.transaction(['transactions'], 'readwrite');
  const store = transaction_db.objectStore('transactions');
  const request = store.add(transaction);

  request.onsuccess = () => {
    transactions.push(transaction);
    updateValues();
    text.value = '';
    amount.value = '';
    dateInput.value = '';

    // Hide add modal (if present)
    try {
      const addModalEl = document.getElementById('addModal');
      if (addModalEl) {
        const modalInstance = bootstrap.Modal.getInstance(addModalEl) || new bootstrap.Modal(addModalEl);
        modalInstance.hide();
      }
    } catch (e) {
      // ignore if bootstrap not available
    }

    // Show success message
    const successMsg = document.getElementById('success-message');
    if (successMsg) {
      successMsg.style.display = 'block';
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 3000);
    }
    if (descCounter) descCounter.textContent = `0 / ${MAX_DESC}`;
  };

  request.onerror = () => {
    alert('Error adding transaction');
  };
}


// Generate random ID
function generateID() {
  return Math.floor(Math.random() * 100000000);
}


// Update the balance, income and expense
function updateValues() {
  const amounts = transactions.map(transaction => transaction.amount);

  const totalNum = amounts.reduce((acc, item) => (acc += item), 0);
  const total = totalNum.toFixed(2);

  const incomeNum = amounts
    .filter(item => item > 0)
    .reduce((acc, item) => (acc += item), 0);
  const income = incomeNum.toFixed(2);

  const expenseNum = (
    amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1
  );
  const expense = expenseNum.toFixed(2);

  balance.innerText = `₦${total}`;
  money_plus.innerText = `₦${income}`;
  money_minus.innerText = `₦${expense}`;

  // Update percentage boxes (10%,50%,40% of total income)
  try {
    const box1 = document.getElementById('box1');
    const box2 = document.getElementById('box2');
    const box3 = document.getElementById('box3');
    const pcts = loadPercentages();
    if (box1) box1.innerText = `₦${(incomeNum * pcts.p1).toFixed(2)}`;
    if (box2) box2.innerText = `₦${(incomeNum * pcts.p2).toFixed(2)}`;
    if (box3) box3.innerText = `₦${(incomeNum * pcts.p3).toFixed(2)}`;
  } catch (e) {
    // ignore if boxes are not in DOM
  }
}




// In-memory settings cache (populated at startup)
let SETTINGS = null;

// Initialize settings from IndexedDB into SETTINGS cache
async function initSettings() {
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(['settings'], 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('dashboard');
    req.onsuccess = () => {
      if (req.result && req.result.value) {
        SETTINGS = req.result.value;
      } else {
        SETTINGS = { ...DEFAULT_SETTINGS };
        // persist defaults
        const tx2 = db.transaction(['settings'], 'readwrite');
        const store2 = tx2.objectStore('settings');
        store2.put({ key: 'dashboard', value: SETTINGS });
      }
      // apply dark mode if needed
      applyDarkMode(SETTINGS.dark);
      resolve();
    };
    req.onerror = () => {
      SETTINGS = { ...DEFAULT_SETTINGS };
      applyDarkMode(SETTINGS.dark);
      resolve();
    };
  });
}

// Load percentages from in-memory SETTINGS
function loadPercentages() {
  if (!SETTINGS) return DEFAULT_PCTS;
  return { p1: SETTINGS.p1, p2: SETTINGS.p2, p3: SETTINGS.p3 };
}

// Save percentages to IndexedDB and update cache
function savePercentages(p1, p2, p3) {
  if (!db) {
    // fallback to updating cache only
    SETTINGS = { p1, p2, p3, dark: (SETTINGS && SETTINGS.dark) || false };
    return;
  }
  SETTINGS = { p1: Number(p1), p2: Number(p2), p3: Number(p3), dark: (SETTINGS && SETTINGS.dark) || false };
  const tx = db.transaction(['settings'], 'readwrite');
  const store = tx.objectStore('settings');
  store.put({ key: 'dashboard', value: SETTINGS });
}

// Save dark mode preference
function saveDarkMode(isDark) {
  if (!SETTINGS) SETTINGS = { ...DEFAULT_SETTINGS };
  SETTINGS.dark = !!isDark;
  if (!db) return;
  const tx = db.transaction(['settings'], 'readwrite');
  const store = tx.objectStore('settings');
  store.put({ key: 'dashboard', value: SETTINGS });
}

function applyDarkMode(enabled) {
  try {
    if (enabled) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  } catch (e) { }
}
// Save percentages (expects decimals that sum to ~1)
function savePercentages(p1, p2, p3) {
  try {
    const obj = { p1: Number(p1), p2: Number(p2), p3: Number(p3) };
    localStorage.setItem(LS_PCTS_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to save percentages', e);
  }
}

// Remove transaction by ID
function removeTransaction(id) {
  const transaction_db = db.transaction(['transactions'], 'readwrite');
  const store = transaction_db.objectStore('transactions');
  const request = store.delete(id);

  request.onsuccess = () => {
    transactions = transactions.filter(transaction => transaction.id !== id);
    init();
  };

  request.onerror = () => {
    alert('Error removing transaction');
  };
}

// Init app
async function init() {
  await loadTransactions();
  updateValues();
  // Apply UI settings after loading data
  try {
    // ensure dark mode icon matches persisted setting
    const darkIcon = document.getElementById('darkIcon');
    if (SETTINGS && darkIcon) {
      if (SETTINGS.dark) { darkIcon.classList.remove('bi-moon-fill'); darkIcon.classList.add('bi-sun-fill'); }
      else { darkIcon.classList.remove('bi-sun-fill'); darkIcon.classList.add('bi-moon-fill'); }
    }
  } catch (e) { }
}

// Live description counter and default date
try {
  if (dateInput) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
    dateInput.max = today;  // Prevent selecting future dates
  }

  if (descCounter && text) {
    // initialize counter
    descCounter.textContent = `${text.value.length} / ${MAX_DESC}`;

    text.addEventListener('input', () => {
      // update counter
      const len = text.value.length;
      descCounter.textContent = `${len} / ${MAX_DESC}`;
      // optional: prevent typing beyond maxlength (input has maxlength attr too)
      if (len >= MAX_DESC) {
        // truncate the value to MAX_DESC
        text.value = text.value.slice(0, MAX_DESC);
        descCounter.textContent = `${MAX_DESC} / ${MAX_DESC}`;
      }
    });
  }
} catch (e) {
  // ignore if inputs not present or environment doesn't support
}

// Initialize the database and start the app
initDB()
  .then(() => initSettings())
  .then(() => init())
  .catch(error => {
    console.error('Failed to initialize database or settings:', error);
    alert('Could not load the expense tracker database');
  });

// Wire modal submit button to submit the form (if present)
try {
  const submitAdd = document.getElementById('submitAdd');
  if (submitAdd) {
    submitAdd.addEventListener('click', () => {
      // use requestSubmit if available to trigger native submit
      if (form) {
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  }
} catch (e) {
  // ignore
}

form.addEventListener('submit', addTransaction);

// Settings modal wiring (configure percentage boxes)
try {
  const saveSettingsBtn = document.getElementById('saveSettings');
  const pct1Input = document.getElementById('pct1');
  const pct2Input = document.getElementById('pct2');
  const pct3Input = document.getElementById('pct3');
  const pctError = document.getElementById('pct-error');
  const settingsModalEl = document.getElementById('settingsModal');

  if (settingsModalEl) {
    // Populate inputs when modal opens
    settingsModalEl.addEventListener('show.bs.modal', () => {
      const pcts = loadPercentages();
      if (pct1Input) pct1Input.value = Math.round(pcts.p1 * 100);
      if (pct2Input) pct2Input.value = Math.round(pcts.p2 * 100);
      if (pct3Input) pct3Input.value = Math.round(pcts.p3 * 100);
      if (pctError) pctError.style.display = 'none';
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const v1 = Number(pct1Input.value || 0);
      const v2 = Number(pct2Input.value || 0);
      const v3 = Number(pct3Input.value || 0);
      const sum = v1 + v2 + v3;
      if (sum !== 100) {
        if (pctError) pctError.style.display = 'block';
        return;
      }
      // convert to decimals and save
      savePercentages(v1 / 100, v2 / 100, v3 / 100);
      // update UI immediately
      updateValues();
      // hide modal
      try {
        const modal = bootstrap.Modal.getInstance(settingsModalEl) || new bootstrap.Modal(settingsModalEl);
        modal.hide();
      } catch (e) { }
    });
  }
} catch (e) {
  // ignore if settings elements not present
}

// Initialize tooltips, presets and dark mode toggle
try {
  // Tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach(function (tooltipTriggerEl) {
    new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Preset selector removed — users will enter percentage values manually

  // Dark mode toggle wiring
  const darkToggle = document.getElementById('darkToggle');
  const darkIcon = document.getElementById('darkIcon');
  if (darkToggle) {
    // ensure icon reflects current setting (if available)
    if (SETTINGS && SETTINGS.dark) {
      if (darkIcon) { darkIcon.classList.remove('bi-moon-fill'); darkIcon.classList.add('bi-sun-fill'); }
    } else {
      if (darkIcon) { darkIcon.classList.remove('bi-sun-fill'); darkIcon.classList.add('bi-moon-fill'); }
    }

    darkToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      // toggle icon
      if (darkIcon) {
        if (isDark) { darkIcon.classList.remove('bi-moon-fill'); darkIcon.classList.add('bi-sun-fill'); }
        else { darkIcon.classList.remove('bi-sun-fill'); darkIcon.classList.add('bi-moon-fill'); }
      }
      // persist
      saveDarkMode(isDark);
    });
  }
} catch (e) {
  // ignore small UI wiring errors
}

// Register service worker for PWA
try {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => console.log('Service worker registered:', reg.scope))
        .catch((err) => console.warn('Service worker registration failed:', err));
    });
  }
} catch (e) {
  // ignore
}

// PWA install prompt
let deferredPrompt;

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show the install button
  const installContainer = document.getElementById('installContainer');
  if (installContainer) installContainer.classList.remove('d-none');
});

// When the app is installed, hide the install button
window.addEventListener('appinstalled', () => {
  const installContainer = document.getElementById('installContainer');
  if (installContainer) installContainer.classList.add('d-none');
  deferredPrompt = null;
});

// Check if already installed or running in standalone mode
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  const installContainer = document.getElementById('installContainer');
  if (installContainer) installContainer.classList.add('d-none');
}

// Handle install button click
try {
  const installBtn = document.getElementById('installPWA');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      // Show the prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      // We've used the prompt, and can't use it again, clear it
      deferredPrompt = null;
      // Hide the install button
      const installContainer = document.getElementById('installContainer');
      if (installContainer) installContainer.classList.add('d-none');
    });
  }
} catch (e) {
  // ignore if button not in DOM
}

// Income/Expense card click handlers: navigate to history with filter query
try {
  const incomeCard = document.getElementById('incomeCard');
  const expenseCard = document.getElementById('expenseCard');
  function navToFilter(type) {
    window.location.href = `history.html?filter=${encodeURIComponent(type)}`;
  }
  if (incomeCard) {
    incomeCard.addEventListener('click', () => navToFilter('income'));
    incomeCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navToFilter('income'); } });
  }
  if (expenseCard) {
    expenseCard.addEventListener('click', () => navToFilter('expense'));
    expenseCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navToFilter('expense'); } });
  }
} catch (e) { }

// Service worker update notification: show a small in-app banner when a new SW version is available
function createUpdateBanner() {
  const existing = document.getElementById('sw-update-banner');
  if (existing) return existing;
  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.style.position = 'fixed';
  banner.style.right = '16px';
  banner.style.bottom = '16px';
  banner.style.zIndex = '2000';
  banner.innerHTML = `
    <div class="toast show align-items-center text-bg-primary" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">A new version is available.</div>
        <button id="sw-refresh" type="button" class="btn btn-light btn-sm me-2">Refresh</button>
        <button id="sw-dismiss" type="button" class="btn btn-outline-light btn-sm">Dismiss</button>
      </div>
    </div>`;
  document.body.appendChild(banner);
  document.getElementById('sw-refresh').addEventListener('click', () => {
    // try to reload to pick up new content controlled by the newly activated SW
    window.location.reload(true);
  });
  document.getElementById('sw-dismiss').addEventListener('click', () => {
    banner.remove();
  });
  return banner;
}

// Listen for messages from the service worker
if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    try {
      if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
        createUpdateBanner();
      }
    } catch (e) { }
  });
}
