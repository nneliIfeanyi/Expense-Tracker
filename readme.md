## Expense Tracker

A modern, responsive expense tracking application that helps you manage your income and expenses with a user-friendly interface and powerful features.

## Key Features

### Dashboard (index.html)
- Quick overview of total balance
- Real-time income and expense summaries
- Recent transactions display (last 5 transactions)
- Easy-to-use form for adding new transactions
- Responsive Bootstrap design for all devices

### Transaction History (history.html)
- Comprehensive transaction history
- Transactions grouped by date
- Daily total calculations
- Detailed transaction timestamps
- Color-coded income and expenses

## Project Structure
```
expense-tracker/
├── index.html      # Dashboard page
├── history.html    # Transaction history page
├── script.js       # Main application logic
├── history.js      # History page functionality
└── style.css       # Custom styling
```

## Database Implementation

The application uses IndexedDB for data storage, providing improved performance and reliability over localStorage.

### Database Structure
- Database Name: ExpenseTrackerDB
- Version: 1
- Object Store: transactions
- Key Path: id (auto-generated)

### Key Features
1. **Persistent Storage**: All transactions are stored in IndexedDB
2. **Improved Performance**: Better handling of large datasets
3. **Offline Support**: Full functionality without internet connection
4. **Error Handling**: Robust error management for database operations

### Technical Implementation Details

#### Database Initialization
- Automatic database creation and versioning
- Object store creation with transaction support
- Async/await pattern for database operations

#### Core Functions
1. **initDB()**
   - Initializes the IndexedDB database
   - Creates object store if not exists
   - Handles database versioning

2. **loadTransactions()**
   - Retrieves all stored transactions
   - Populates the application state
   - Returns Promise for async operations

3. **addTransaction()**
   - Stores new transactions in IndexedDB
   - Updates UI automatically
   - Includes error handling

4. **removeTransaction()**
   - Deletes transactions from database
   - Updates UI to reflect changes
   - Includes error handling

### Error Handling
- Database initialization errors
- Transaction addition/removal errors
- Data loading errors
- Graceful fallbacks and user notifications

## User Interface Features

### Navigation
- Consistent navigation bar across pages
- Active state indicators for current page
- Quick access to dashboard and history
- Mobile-responsive menu

### Dashboard View
- Clean, card-based layout
- Real-time balance updates
- Prominent display of total balance
- Separate cards for income and expenses
- Recent transactions section with quick history link

### History View
- Chronological organization of transactions
- Date-based grouping
- Daily total calculations
- Timestamp display for each transaction
- Responsive table layout for all screen sizes

## Responsive Design
- Built with Bootstrap 5.3.2
- Mobile-first approach
- Flexible grid system
- Responsive typography
- Touch-friendly interface
- Optimized for all screen sizes

## Browser Support
- Supports all modern browsers with IndexedDB
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers
- Progressive enhancement for older browsers

## Future Enhancements
1. **Filtering & Search**
   - Date range selection
   - Category filtering
   - Transaction search
   - Advanced sorting options

2. **Data Management**
   - Export to CSV/PDF
   - Data backup/restore
   - Bulk operations
   - Transaction categories

3. **Analytics**
   - Spending trends
   - Monthly reports
   - Category analysis
   - Budget tracking

4. **User Experience**
   - Dark mode
   - Customizable themes
   - Keyboard shortcuts
   - Transaction templates
