// Database initialization (same as in script.js)
const dbName = 'onefifthDB';
const dbVersion = 2;
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
            // ensure settings store exists (schema v2)
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
};

// Format date to readable string
function formatDate(date) {
    // Short form: "Mon Oct 7" (no year)
    const d = new Date(date);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // remove possible comma from monthDay and join
    return `${weekday} ${monthDay.replace(',', '')}`;
}

// Currency formatter / helper (short, with grouping)
function formatCurrency(value) {
    const num = Number(value) || 0;
    try {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(num);
    } catch (e) {
        return '₦' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
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
        // Handle both new date-only format and legacy ISO strings
        const date = transaction && transaction.date ? transaction.date : new Date().toISOString().slice(0, 10);
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
    <div class="list-group-item list-group-item-action ${transaction.amount < 0 ? 'minus' : 'plus'}" id="transaction-${transaction.id}">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0">${transaction.text}</h6>
          <small class="text-muted">${transaction.date}</small>
        </div>
        <div class="d-flex align-items-center">
                                <span class="badge ${transaction.amount < 0 ? 'bg-danger' : 'bg-success'} rounded-pill me-2">
                                    ${sign}${formatCurrency(Math.abs(transaction.amount))}
                                </span>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editTransaction(${transaction.id})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction(${transaction.id})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Load and display transactions
// Delete transaction
async function deleteTransaction(id) {
    if (!db) {
        console.error('Database not initialized');
        return;
    }

    const transaction = db.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');
    const request = store.get(id);

    request.onsuccess = () => {
        const tx = request.result;
        if (tx) {
            transactionToDelete = tx;

            // Populate the delete modal with transaction details
            document.getElementById('deleteTransactionText').textContent = tx.text;
            document.getElementById('deleteTransactionAmount').textContent =
                `${tx.amount < 0 ? '-' : '+'}$${Math.abs(tx.amount)}`;
            document.getElementById('deleteTransactionDate').textContent =
                new Date(tx.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

            // Show the delete modal
            deleteModal.show();
        }
    };
}

let editModal;
let deleteModal;
let currentTransaction;
let transactionToDelete;

// Initialize modals and form handlers
function initializeModals() {
    // Initialize edit modal
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editForm = document.getElementById('editForm');
    const editText = document.getElementById('editText');
    const editDescCounter = document.getElementById('editDescCounter');
    const editDate = document.getElementById('editDate');
    const saveButton = document.getElementById('saveEdit');

    // Initialize delete modal
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    const confirmDeleteBtn = document.getElementById('confirmDelete');

    // Delete confirmation handler
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!db || !transactionToDelete) {
            console.error('Database not initialized or no transaction selected');
            return;
        }

        const transaction = db.transaction(['transactions'], 'readwrite');
        const store = transaction.objectStore('transactions');
        const request = store.delete(transactionToDelete.id);

        request.onsuccess = () => {
            deleteModal.hide();
            loadTransactionHistory(); // Reload to update totals
        };
    });

    // Character counter for description
    editText.addEventListener('input', (e) => {
        const length = e.target.value.length;
        editDescCounter.textContent = `${length} / 80`;
    });

    // Date validation
    editDate.max = new Date().toISOString().split('T')[0];

    // Save button handler
    saveButton.addEventListener('click', () => {
        const form = document.getElementById('editForm');
        if (form.checkValidity()) {
            saveEditedTransaction();
        } else {
            form.reportValidity();
        }
    });
}

// Edit transaction
function editTransaction(id) {
    if (!db) {
        console.error('Database not initialized');
        return;
    }

    const transaction = db.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');
    const request = store.get(id);

    request.onsuccess = () => {
        const tx = request.result;
        if (tx) {
            currentTransaction = tx;

            // Populate the modal form
            document.getElementById('editTransactionId').value = tx.id;
            document.getElementById('editText').value = tx.text;
            document.getElementById('editAmount').value = tx.amount;
            document.getElementById('editDate').value = tx.date;
            document.getElementById('editDescCounter').textContent = `${tx.text.length} / 80`;

            // Show the modal
            editModal.show();
        }
    };
}

// Save edited transaction
function saveEditedTransaction() {
    const text = document.getElementById('editText').value.trim();
    const amount = parseFloat(document.getElementById('editAmount').value);
    const date = document.getElementById('editDate').value;

    if (text && !isNaN(amount) && date) {
        const updatedTx = {
            ...currentTransaction,
            text: text,
            amount: amount,
            date: date
        };

        const updateTx = db.transaction(['transactions'], 'readwrite');
        const updateStore = updateTx.objectStore('transactions');
        const updateRequest = updateStore.put(updatedTx);

        updateRequest.onsuccess = () => {
            editModal.hide();
            loadTransactionHistory(); // Reload to show updated data
        };
    }
}

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
        });
        // Read optional filter from query string: 'income' or 'expense'
        const params = new URLSearchParams(window.location.search);
        const filter = params.get('filter');
        let filtered = transactions;
        if (filter === 'income') {
            filtered = transactions.filter(t => Number(t.amount) > 0);
        } else if (filter === 'expense') {
            filtered = transactions.filter(t => Number(t.amount) < 0);
        }
        // Update page title or header to indicate active filter
        try {
            const titleEl = document.querySelector('.card-title');
            if (titleEl) {
                if (filter === 'income') titleEl.textContent = 'Transaction History — Income';
                else if (filter === 'expense') titleEl.textContent = 'Transaction History — Expense';
                else titleEl.textContent = 'Transaction History';
            }
        } catch (e) { }
        const groupedTransactions = groupTransactionsByDate(filtered);
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
                                                ${dateTotal >= 0 ? '+' : '-'}${formatCurrency(Math.abs(dateTotal))}
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
        initializeModals();
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