const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');

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
  } else {
    const transaction = {
      id: generateID(),
      text: text.value,
      amount: +amount.value,
      date: new Date().toISOString()
    };

    // Add to IndexedDB
    const transaction_db = db.transaction(['transactions'], 'readwrite');
    const store = transaction_db.objectStore('transactions');
    const request = store.add(transaction);

    request.onsuccess = () => {
      transactions.push(transaction);
      addTransactionDOM(transaction);
      updateValues();
      text.value = '';
      amount.value = '';
    };

    request.onerror = () => {
      alert('Error adding transaction');
    };
  }
}

// Generate random ID
function generateID() {
  return Math.floor(Math.random() * 100000000);
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
  // Get sign
  const sign = transaction.amount < 0 ? '-' : '+';

  const item = document.createElement('li');

  // Add Bootstrap and custom classes
  item.classList.add('list-group-item', transaction.amount < 0 ? 'minus' : 'plus');

  item.innerHTML = `
    <div class="d-flex justify-content-between align-items-center w-100">
      <span>${transaction.text}</span>
      <span>${sign}$${Math.abs(transaction.amount)}</span>
    </div>
    <button class="delete-btn" onclick="removeTransaction(${transaction.id})">×</button>
  `;

  list.appendChild(item);
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
  list.innerHTML = '';
  await loadTransactions();

  // Sort transactions by date and get only the 5 most recent
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recentTransactions.length === 0) {
    list.innerHTML = `
      <li class="list-group-item text-center text-muted">
        <p class="mb-0">No recent transactions</p>
        <small>Add a transaction to get started</small>
      </li>
    `;
  } else {
    recentTransactions.forEach(addTransactionDOM);
  }

  updateValues();
}

// Initialize the database and start the app
initDB()
  .then(() => init())
  .catch(error => {
    console.error('Failed to initialize database:', error);
    alert('Could not load the expense tracker database');
  });

form.addEventListener('submit', addTransaction);
