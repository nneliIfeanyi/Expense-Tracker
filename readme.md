## Expense Tracker

A modern, responsive expense tracking application that helps you manage your income and expenses with a user-friendly interface and powerful features.

## Key Features

### Dashboard (index.html)
- Quick overview of total balance
- Real-time income and expense summaries
- Clean, focused transaction entry form
- Description length control (max 80 chars) with live counter
- Back-dating support with future date prevention
- Success notifications for transaction additions
- Responsive Bootstrap design for all devices

### Transaction History (history.html)
- Comprehensive transaction history
- Transactions grouped by date with daily totals
- Advanced transaction management:
  - Edit transactions via modal dialog
  - Delete transactions with detailed confirmation
  - Full validation on all edits
- Color-coded income and expenses
- Bootstrap Icons for intuitive actions
- Mobile-responsive controls

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
- Additional Field: date (ISO string) — transactions now include a date field so records can be back-dated and grouped by day

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
- Robust error handling and state management

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
   - Validates input data (description length, date, required fields)
   - Stores new transactions in IndexedDB
   - Shows success notification
   - Updates UI automatically
   - Includes error handling

4. **editTransaction()**
   - Opens modal with current transaction data
   - Validates all fields before saving
   - Updates transaction in IndexedDB
   - Real-time character counting
   - Prevents future dates

5. **deleteTransaction()**
   - Shows confirmation modal with transaction details
   - Requires explicit confirmation
   - Removes transaction from IndexedDB
   - Updates UI with new totals
   - Includes error handling

### Error Handling
- Database initialization errors
- Transaction addition/removal errors
- Data loading errors
- Graceful fallbacks and user notifications

### User Interface Features

### Navigation
- Consistent navigation bar across pages
- Active state indicators for current page
- Quick access to dashboard and history
- Mobile-responsive menu with Bootstrap 5.3.2

### Dashboard View
- Clean, card-based layout with Bootstrap components
- Real-time balance updates
- Prominent display of total balance
- Separate cards for income and expenses
- Success notifications for user actions
- Form validation with helpful feedback
- Character counter for descriptions

### History View
- Chronological organization of transactions
- Date-based grouping with daily totals
- Edit modal with:
  - Pre-populated form fields
  - Live character counting
  - Date validation
  - Field validation
  - Clear save/cancel actions
- Delete confirmation modal with:
  - Transaction details preview
  - Warning message
  - Clear confirmation required
- Bootstrap Icons for action buttons
- Responsive layout for all devices

### Data Validation
- Description length limit (80 chars)
- Required fields validation
- Future date prevention
- Amount format validation
- Real-time feedback to users

### Error Handling
- Database operation error handling
- Input validation error messages
- User-friendly error notifications
- Graceful fallbacks for all operations
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
