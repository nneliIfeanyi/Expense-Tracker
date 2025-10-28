const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const dateInput = document.getElementById('date');
const descCounter = document.getElementById('desc-counter');
const MAX_DESC = 80;

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

    // Show success message
    const successMsg = document.getElementById('success-message');
    successMsg.style.display = 'block';
    setTimeout(() => {
      successMsg.style.display = 'none';
    }, 3000);
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

  const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);

  const income = amounts
    .filter(item => item > 0)
    .reduce((acc, item) => (acc += item), 0)
    .toFixed(2);

  const expense = (
    amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) *
    -1
  ).toFixed(2);

  balance.innerText = `$${total}`;
  money_plus.innerText = `$${income}`;
  money_minus.innerText = `$${expense}`;
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

form.addEventListener('submit', addTransaction);
