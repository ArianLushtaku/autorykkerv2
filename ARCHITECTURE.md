# Autorykker - System Architecture & Implementation Plan

## 🎯 System Overview

Autorykker is an automated debt collection system that integrates with:
- **Dinero** (accounting system) - for invoices
- **GoCardless** (bank integration) - for transactions

### Core Workflow
1. Fetch invoices from Dinero → Store in Supabase
2. Fetch bank transactions from GoCardless → Store in Supabase
3. Match transactions with invoices automatically
4. Send automated reminders (pre-reminder → rykker 1 → rykker 2 → rykker 3)
5. Queue invoices for inkasso after 3rd rykker

---

## 🗄️ Database Schema

### Existing Tables
- `profiles` - User profiles with encrypted tokens
- `invoices` - Synced from Dinero

### New Tables Needed

#### 1. `bank_transactions`
```sql
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  account_id TEXT NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  booking_date DATE NOT NULL,
  value_date DATE,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'DKK',
  creditor_name TEXT,
  creditor_account TEXT,
  debtor_name TEXT,
  debtor_account TEXT,
  remittance_information TEXT,
  additional_information TEXT,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON bank_transactions(user_id);
CREATE INDEX idx_transactions_booking_date ON bank_transactions(booking_date);
CREATE INDEX idx_transactions_amount ON bank_transactions(amount);
```

#### 2. `payment_matches`
```sql
CREATE TABLE payment_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  transaction_id UUID REFERENCES bank_transactions(id),
  match_type TEXT CHECK (match_type IN ('automatic', 'manual', 'suggested')),
  confidence_score DECIMAL(5,2), -- 0-100
  match_reason TEXT,
  matched_at TIMESTAMP DEFAULT NOW(),
  matched_by UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('pending', 'confirmed', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_matches_user_id ON payment_matches(user_id);
CREATE INDEX idx_payment_matches_invoice_id ON payment_matches(invoice_id);
CREATE INDEX idx_payment_matches_status ON payment_matches(status);
```

#### 3. `reminder_history`
```sql
CREATE TABLE reminder_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('pre_reminder', 'rykker_1', 'rykker_2', 'rykker_3')),
  sent_at TIMESTAMP DEFAULT NOW(),
  sent_via TEXT CHECK (sent_via IN ('email', 'sms', 'letter', 'pdf')),
  recipient_email TEXT,
  recipient_phone TEXT,
  status TEXT CHECK (status IN ('sent', 'failed', 'bounced', 'opened', 'clicked')) DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reminder_history_user_id ON reminder_history(user_id);
CREATE INDEX idx_reminder_history_invoice_id ON reminder_history(invoice_id);
CREATE INDEX idx_reminder_history_sent_at ON reminder_history(sent_at);
```

#### 4. `automation_settings`
```sql
CREATE TABLE automation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  
  -- Pre-reminder settings
  pre_reminder_enabled BOOLEAN DEFAULT true,
  pre_reminder_days_after_due INTEGER DEFAULT 3,
  pre_reminder_method TEXT DEFAULT 'email',
  
  -- Rykker 1 settings
  rykker_1_enabled BOOLEAN DEFAULT true,
  rykker_1_days_after_pre INTEGER DEFAULT 14,
  rykker_1_method TEXT DEFAULT 'email',
  rykker_1_fee DECIMAL(10,2) DEFAULT 100.00,
  
  -- Rykker 2 settings
  rykker_2_enabled BOOLEAN DEFAULT true,
  rykker_2_days_after_rykker_1 INTEGER DEFAULT 14,
  rykker_2_method TEXT DEFAULT 'letter',
  rykker_2_fee DECIMAL(10,2) DEFAULT 250.00,
  
  -- Rykker 3 settings
  rykker_3_enabled BOOLEAN DEFAULT true,
  rykker_3_days_after_rykker_2 INTEGER DEFAULT 14,
  rykker_3_method TEXT DEFAULT 'letter',
  rykker_3_fee DECIMAL(10,2) DEFAULT 500.00,
  
  -- Inkasso settings
  auto_inkasso_enabled BOOLEAN DEFAULT false,
  inkasso_days_after_rykker_3 INTEGER DEFAULT 7,
  min_amount_for_inkasso DECIMAL(10,2) DEFAULT 500.00,
  
  -- General settings
  business_days_only BOOLEAN DEFAULT true,
  exclude_weekends BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. `inkasso_queue`
```sql
CREATE TABLE inkasso_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  invoice_number TEXT NOT NULL,
  original_amount DECIMAL(15,2) NOT NULL,
  total_fees DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  days_overdue INTEGER,
  last_reminder_sent TIMESTAMP,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'exported', 'sent_to_inkasso', 'resolved', 'cancelled')) DEFAULT 'pending',
  added_at TIMESTAMP DEFAULT NOW(),
  exported_at TIMESTAMP,
  resolved_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_inkasso_queue_user_id ON inkasso_queue(user_id);
CREATE INDEX idx_inkasso_queue_status ON inkasso_queue(status);
CREATE INDEX idx_inkasso_queue_added_at ON inkasso_queue(added_at);
```

---

## 🔄 Data Flow Architecture

### 1. Initial Setup (Already Done ✅)
- User connects Dinero → OAuth → Store encrypted tokens
- User connects GoCardless → OAuth → Store encrypted tokens
- Tokens are encrypted using Fernet encryption
- Tokens auto-refresh when expired

### 2. Data Sync Flow

#### Invoice Sync (Existing)
```
Dinero API → Backend `/dinero/sync` → Supabase `invoices` table
```
- Endpoint: `POST /dinero/sync?full_sync=true`
- Frequency: Daily via cron
- Updates existing invoices
- Adds new invoices

#### Transaction Sync (New)
```
GoCardless API → Backend `/gocardless/sync-transactions` → Supabase `bank_transactions` table
```
- Fetch all connected accounts
- For each account, fetch transactions
- Store in `bank_transactions` table
- Frequency: Daily via cron

### 3. Payment Matching Algorithm

#### Matching Criteria (Priority Order)
1. **Exact Match** (100% confidence)
   - Amount matches exactly
   - Invoice reference in transaction description
   - Date within ±7 days of invoice due date

2. **High Confidence** (80-99%)
   - Amount matches exactly
   - Customer name in transaction
   - Date within ±14 days

3. **Medium Confidence** (60-79%)
   - Amount matches ±5%
   - Partial customer name match
   - Date within ±30 days

4. **Low Confidence** (40-59%)
   - Amount matches ±10%
   - Any text similarity
   - Date within ±60 days

#### Matching Process
```python
def match_transaction_to_invoice(transaction, invoices):
    matches = []
    
    for invoice in invoices:
        score = 0
        reasons = []
        
        # Amount matching (40 points)
        if abs(transaction.amount - invoice.total) < 0.01:
            score += 40
            reasons.append("Exact amount match")
        elif abs(transaction.amount - invoice.total) / invoice.total < 0.05:
            score += 30
            reasons.append("Amount within 5%")
        
        # Reference matching (30 points)
        if invoice.invoice_number in transaction.remittance_information:
            score += 30
            reasons.append("Invoice number in reference")
        
        # Customer name matching (20 points)
        if customer_name_similarity(transaction.debtor_name, invoice.contact_name) > 0.8:
            score += 20
            reasons.append("Customer name match")
        
        # Date proximity (10 points)
        days_diff = abs((transaction.booking_date - invoice.due_date).days)
        if days_diff <= 7:
            score += 10
        elif days_diff <= 14:
            score += 7
        elif days_diff <= 30:
            score += 5
        
        if score >= 40:  # Minimum threshold
            matches.append({
                'invoice': invoice,
                'confidence': score,
                'reasons': reasons
            })
    
    return sorted(matches, key=lambda x: x['confidence'], reverse=True)
```

### 4. Reminder Automation Flow

#### Daily Cron Job Process
```
1. Sync invoices from Dinero
2. Sync transactions from GoCardless
3. Run payment matching
4. Mark matched invoices as paid in Dinero
5. Check overdue invoices for reminders
6. Send appropriate reminders
7. Update inkasso queue
```

#### Reminder Logic
```python
def process_invoice_reminders(invoice, settings):
    # Get reminder history for this invoice
    history = get_reminder_history(invoice.id)
    
    # Check if invoice is overdue
    days_overdue = (today - invoice.due_date).days
    
    if days_overdue < 0:
        return  # Not due yet
    
    # Pre-reminder
    if not has_reminder_type(history, 'pre_reminder'):
        if days_overdue >= settings.pre_reminder_days_after_due:
            send_reminder(invoice, 'pre_reminder', settings)
            return
    
    # Rykker 1
    pre_reminder_date = get_last_reminder_date(history, 'pre_reminder')
    if pre_reminder_date:
        days_since_pre = (today - pre_reminder_date).days
        if days_since_pre >= settings.rykker_1_days_after_pre:
            if not has_reminder_type(history, 'rykker_1'):
                send_reminder(invoice, 'rykker_1', settings)
                return
    
    # Rykker 2
    rykker_1_date = get_last_reminder_date(history, 'rykker_1')
    if rykker_1_date:
        days_since_r1 = (today - rykker_1_date).days
        if days_since_r1 >= settings.rykker_2_days_after_rykker_1:
            if not has_reminder_type(history, 'rykker_2'):
                send_reminder(invoice, 'rykker_2', settings)
                return
    
    # Rykker 3
    rykker_2_date = get_last_reminder_date(history, 'rykker_2')
    if rykker_2_date:
        days_since_r2 = (today - rykker_2_date).days
        if days_since_r2 >= settings.rykker_3_days_after_rykker_2:
            if not has_reminder_type(history, 'rykker_3'):
                send_reminder(invoice, 'rykker_3', settings)
                return
    
    # Inkasso
    rykker_3_date = get_last_reminder_date(history, 'rykker_3')
    if rykker_3_date:
        days_since_r3 = (today - rykker_3_date).days
        if days_since_r3 >= settings.inkasso_days_after_rykker_3:
            if invoice.total >= settings.min_amount_for_inkasso:
                add_to_inkasso_queue(invoice)
```

---

## 🔧 API Endpoints Needed

### Transaction Sync
```
POST /gocardless/sync-transactions
- Fetches all transactions from connected accounts
- Stores in bank_transactions table
- Returns count of new transactions
```

### Payment Matching
```
POST /payments/match
- Runs matching algorithm
- Creates payment_matches records
- Returns matches with confidence scores

GET /payments/matches?status=pending
- Returns unconfirmed matches for review

POST /payments/matches/:id/confirm
- Confirms a suggested match
- Marks invoice as paid in Dinero

POST /payments/matches/:id/reject
- Rejects a suggested match
```

### Reminder Management
```
GET /reminders/history/:invoice_id
- Returns reminder history for invoice

POST /reminders/send
- Manually send a reminder

GET /automation/settings
- Returns user's automation settings

PUT /automation/settings
- Updates automation settings
```

### Inkasso Queue
```
GET /inkasso/queue
- Returns invoices in inkasso queue

POST /inkasso/export
- Generates Excel/PDF report

POST /inkasso/:id/resolve
- Marks invoice as resolved

POST /inkasso/:id/cancel
- Removes from queue
```

---

## 🤖 Cron Job Implementation

### Option 1: Supabase Edge Functions (Recommended)
```typescript
// supabase/functions/daily-automation/index.ts
Deno.serve(async (req) => {
  // 1. Get all users with active integrations
  const users = await getActiveUsers()
  
  for (const user of users) {
    // 2. Sync invoices
    await syncDineroInvoices(user)
    
    // 3. Sync transactions
    await syncGoCardlessTransactions(user)
    
    // 4. Match payments
    await matchPayments(user)
    
    // 5. Process reminders
    await processReminders(user)
    
    // 6. Update inkasso queue
    await updateInkassoQueue(user)
  }
  
  return new Response('Automation completed')
})
```

### Option 2: External Cron Service
- Use cron-job.org or similar
- Call webhook endpoint daily
- Endpoint: `POST /automation/run-daily`

### Option 3: Backend Scheduler
```python
# Use APScheduler in Flask
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(run_daily_automation, 'cron', hour=2)  # Run at 2 AM
scheduler.start()
```

---

## 📊 UI Components Needed

### 1. Automation Settings Page
- Configure reminder intervals
- Set fees for each rykker
- Enable/disable automation
- Set inkasso thresholds

### 2. Payment Matching Dashboard
- Show pending matches
- Confidence scores
- Confirm/reject buttons
- Manual matching interface

### 3. Reminder History View
- Timeline of reminders sent
- Status tracking
- Resend options

### 4. Inkasso Queue Page
- List of invoices ready for inkasso
- Export to Excel/PDF
- Bulk actions
- Resolution tracking

---

## 🚀 Implementation Priority

### MVP Phase 1 (Current Sprint)
1. ✅ GoCardless integration
2. ✅ Bank selector modal
3. 🔄 Transaction sync endpoint
4. 🔄 Basic payment matching
5. 🔄 Automation settings table

### MVP Phase 2
1. Reminder history tracking
2. Manual payment matching UI
3. Settings page for automation
4. Basic cron job

### MVP Phase 3
1. Automated reminder sending
2. Inkasso queue
3. Export functionality
4. Email templates

### Post-MVP
1. SMS reminders
2. PDF letter generation
3. Advanced matching algorithms
4. Analytics dashboard

---

## 🔐 Security Considerations

1. **Token Encryption** ✅
   - All API tokens encrypted with Fernet
   - Stored as base64 in Supabase

2. **API Access Control**
   - All endpoints require authentication
   - User can only access their own data
   - Row-level security in Supabase

3. **Cron Job Authentication**
   - Use service role key for cron jobs
   - Or implement webhook with secret token

4. **Data Privacy**
   - GDPR compliance
   - Data retention policies
   - Audit logs

---

## 📝 Next Steps

**Immediate Actions:**
1. Create database migration for new tables
2. Implement transaction sync endpoint
3. Build basic matching algorithm
4. Create automation settings UI
5. Set up cron job infrastructure

**Would you like me to start with any specific phase?**
