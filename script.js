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

// Keys used in localStorage
const LS_PCTS_KEY = 'expense_tracker_pcts_v1';

// const dummyTransactions = [
//   { id: 1, text: 'Flower', amount: -20 },
//   { id: 2, text: 'Salary', amount: 300 },
//   { id: 3, text: 'Book', amount: -10 },
//   { id: 4, text: 'Camera', amount: 150 }
// ];

// Initialize IndexedDB
const dbName = 'ExpenseTrackerDB';
const dbVersion = 1;
let db;

const initDB = () => {
  return new Promise((resolve, reject) => {
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

  balance.innerText = `$${total}`;
  money_plus.innerText = `$${income}`;
  money_minus.innerText = `$${expense}`;

  // Update percentage boxes (10%,50%,40% of total income)
  try {
    const box1 = document.getElementById('box1');
    const box2 = document.getElementById('box2');
    const box3 = document.getElementById('box3');
    const pcts = loadPercentages();
    if (box1) box1.innerText = `$${(incomeNum * pcts.p1).toFixed(2)}`;
    if (box2) box2.innerText = `$${(incomeNum * pcts.p2).toFixed(2)}`;
    if (box3) box3.innerText = `$${(incomeNum * pcts.p3).toFixed(2)}`;
  } catch (e) {
    // ignore if boxes are not in DOM
  }
}


// Load percentages from localStorage or return defaults
function loadPercentages() {
  try {
    const raw = localStorage.getItem(LS_PCTS_KEY);
    if (!raw) return DEFAULT_PCTS;
    const parsed = JSON.parse(raw);
    // ensure numbers and fallback to defaults for missing fields
    const p1 = typeof parsed.p1 === 'number' ? parsed.p1 : DEFAULT_PCTS.p1;
    const p2 = typeof parsed.p2 === 'number' ? parsed.p2 : DEFAULT_PCTS.p2;
    const p3 = typeof parsed.p3 === 'number' ? parsed.p3 : DEFAULT_PCTS.p3;
    return { p1, p2, p3 };
  } catch (e) {
    return DEFAULT_PCTS;
  }
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
  .then(() => init())
  .catch(error => {
    console.error('Failed to initialize database:', error);
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
      } catch (e) {}
    });
  }
} catch (e) {
  // ignore if settings elements not present
}
