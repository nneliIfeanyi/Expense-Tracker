// Database initialization (same as in script.js)
const dbName = 'ExpenseTrackerDB';
const dbVersion = 1;
let db;

const historyContainer = document.getElementById('history-container');

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

// Format date to readable string
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Group transactions by date
function groupTransactionsByDate(transactions) {
    const groups = {};

    // Sort safely even if some transactions lack a date
    transactions.sort((a, b) => {
        const da = a && a.date ? new Date(a.date) : new Date(0);
        const db = b && b.date ? new Date(b.date) : new Date(0);
        return db - da;
    });

    transactions.forEach(transaction => {
        // Fallback to ISO now if date missing/invalid
        const rawDate = transaction && transaction.date ? transaction.date : new Date().toISOString();
        const date = String(rawDate).split('T')[0]; // Get just the date part
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
    });

    return groups;
}

// Create transaction element
function createTransactionElement(transaction) {
    const sign = transaction.amount < 0 ? '-' : '+';

    return `
    <div class="list-group-item list-group-item-action ${transaction.amount < 0 ? 'minus' : 'plus'}">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0">${transaction.text}</h6>
          <small class="text-muted">${new Date(transaction.date).toLocaleTimeString()}</small>
        </div>
        <span class="badge ${transaction.amount < 0 ? 'bg-danger' : 'bg-success'} rounded-pill">
          ${sign}$${Math.abs(transaction.amount)}
        </span>
      </div>
    </div>
  `;
}

// Load and display transactions
async function loadTransactionHistory() {
    try {
        if (!db) {
            throw new Error('Database not initialized');
        }

        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const transactions = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        }); const groupedTransactions = groupTransactionsByDate(transactions);
        let historyHTML = '';

        for (const [date, txs] of Object.entries(groupedTransactions)) {
            // Ensure amounts exist and are numbers
            const dateTotal = txs.reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);
            const totalClass = dateTotal >= 0 ? 'text-success' : 'text-danger';

            historyHTML += `
        <div class="date-group mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="mb-0">${formatDate(date)}</h5>
            <span class="fw-bold ${totalClass}">
              ${dateTotal >= 0 ? '+' : '-'}$${Math.abs(dateTotal).toFixed(2)}
            </span>
          </div>
          <div class="list-group">
            ${txs.map(createTransactionElement).join('')}
          </div>
        </div>
      `;
        }

        if (historyHTML === '') {
            historyHTML = `
        <div class="text-center text-muted">
          <h5>No transactions found</h5>
          <p>Start adding transactions to see them here</p>
        </div>
      `;
        }

        historyContainer.innerHTML = historyHTML;

    } catch (error) {
        console.error('Error loading transaction history:', error);
        historyContainer.innerHTML = `
      <div class="alert alert-danger">
        Error loading transaction history. Please try again later.
      </div>
    `;
    }
}

// Initialize the database and load history
async function initializeApp() {
    try {
        await initDB();
        console.log('Database initialized successfully');
        await loadTransactionHistory();
    } catch (error) {
        console.error('Error:', error);
        historyContainer.innerHTML = `
      <div class="alert alert-danger">
        <h5 class="alert-heading">Error Loading Transactions</h5>
        <p class="mb-0">${error.message || 'Could not load the expense tracker database. Please try refreshing the page.'}</p>
        <hr>
        <small>Tip: Make sure you have added some transactions on the main page first.</small>
      </div>
    `;
    }
}

// Start the application
initializeApp();