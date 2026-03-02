# Invoice Reminder Automation System

## Overview

Automated reminder system following Danish debt collection rules. Sends reminders at appropriate intervals and automatically moves cases to debt collection (inkasso) when needed.

## Complete Automation Workflow

```
1. Invoice Sync (Dinero)
   ├─ Reminder sync
   └─ Full invoice sync
   
2. Invoice Matcher
   └─ Match bank transactions to invoices
   
3. Payment Registration
   └─ Register matched payments in Dinero
   
4. Invoice Sync (Again)
   └─ Update invoice statuses after payment registration
   
5. Reminder Automation ← THIS SYSTEM
   ├─ Analyze overdue unpaid invoices
   ├─ Send appropriate reminders
   └─ Move Rykker 3 cases to inkasso queue
```

## Danish Debt Collection Rules

### Timing Schedule

| Stage | Days After Due Date | Days Since Previous | Action |
|-------|-------------------|-------------------|--------|
| **PreReminder** | 3 days | - | Friendly payment reminder |
| **Rykker 1** | 13 days | 10 days after PreReminder | First official reminder |
| **Rykker 2** | 23 days | 10 days after Rykker 1 | Second official reminder |
| **Rykker 3** | 33 days | 10 days after Rykker 2 | Final reminder + Inkasso |

### State Machine

```
Invoice Sent (MailOut)
    ↓ (3 days overdue)
PreReminder
    ↓ (10 days later = 13 days overdue)
Rykker 1
    ↓ (10 days later = 23 days overdue)
Rykker 2
    ↓ (10 days later = 33 days overdue)
Rykker 3 → Move to Inkasso Queue
```

## How It Works

### 1. Find Overdue Invoices

```python
# Fetches all unpaid invoices past their payment_date
overdue_invoices = get_overdue_unpaid_invoices()

# Logs breakdown:
# ✅ Found 45 overdue invoices
#    Overdue breakdown: {
#      '1-3 days': 12,
#      '4-13 days': 18,
#      '14-23 days': 10,
#      '24-33 days': 4,
#      '34+ days': 1
#    }
```

### 2. Analyze Each Invoice

```python
for invoice in overdue_invoices:
    decision = determine_next_reminder_stage(invoice)
    
    # Decision based on:
    # - days_overdue
    # - latest_mail_out_type (current stage)
    # - reminder_history (how many reminders sent)
```

### 3. Decision Logic

**Example 1: Invoice 5 days overdue, stage = MailOut**
```
🔍 Analyzing invoice 10403: 5 days overdue, current stage: MailOut
   Reminder history: 0 reminders sent
   ✅ 10403: Ready for PreReminder (5 days)
   Decision: Send PreReminder
```

**Example 2: Invoice 15 days overdue, stage = PreReminder**
```
🔍 Analyzing invoice 10404: 15 days overdue, current stage: PreReminder
   Reminder history: 1 reminders sent
   12 days since PreReminder
   ✅ 10404: Ready for Rykker 1 (15 days)
   Decision: Send Rykker 1
```

**Example 3: Invoice 35 days overdue, stage = Rykker2**
```
🔍 Analyzing invoice 10405: 35 days overdue, current stage: Rykker2
   Reminder history: 3 reminders sent
   12 days since Rykker 2
   ⚠️  10405: Ready for Rykker 3 / Inkasso (35 days)
   Decision: Send Rykker 3 + Move to Inkasso Queue
```

### 4. Execute Actions

```python
# Send reminders
if decision.should_send:
    send_reminder(decision)  # Via Dinero API
    record_reminder_sent(decision)  # Log in reminder_history

# Move to inkasso if needed
if decision.move_to_inkasso:
    move_to_inkasso_queue(decision, invoice)
```

## Detailed Logging

Every operation is logged with full context:

### Startup
```
================================================================================
🚀 Starting Invoice Reminder Automation
   User: a422f931-51a8-42de-bdaa-879561ce63f7
   Mode: LIVE
================================================================================
```

### Fetching Invoices
```
📋 Fetching overdue unpaid invoices for user a422f931...
✅ Found 45 overdue invoices out of 120 unpaid
   Overdue breakdown: {'1-3 days': 12, '4-13 days': 18, ...}
```

### Analysis
```
📊 Analyzing 45 overdue invoices...
🔍 Analyzing invoice 10403: 5 days overdue, current stage: MailOut
   Reminder history: 0 reminders sent
   ✅ 10403: Ready for PreReminder (5 days)
```

### Sending Reminders
```
📧 Sending PreReminder for invoice 10403
   Customer: Sally Gasbjerg
   Amount: 279.0 DKK
   Days overdue: 5
   📨 Would send PreReminder via Dinero API
   💾 Recorded PreReminder in reminder_history
   ✅ Successfully sent PreReminder
```

### Inkasso Queue
```
🚨 Moving invoice 10405 to inkasso queue
   Customer: John Doe
   Amount: 1500.0 DKK
   Days overdue: 35
   ✅ Added to inkasso queue
```

### Summary
```
================================================================================
🎉 Reminder Automation Complete
   Total overdue invoices: 45
   Reminders sent: 23
   Moved to inkasso: 2
   Errors: 0
   Elapsed time: 12.3s
================================================================================
```

## Database Tables

### reminder_history
Tracks all reminders sent:
```sql
CREATE TABLE reminder_history (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    reminder_type TEXT NOT NULL,  -- PreReminder, Rykker1, Rykker2, Rykker3
    sent_at TIMESTAMPTZ NOT NULL,
    days_overdue INTEGER,
    amount DECIMAL(10, 2),
    contact_name TEXT
);
```

### inkasso_queue
Invoices ready for debt collection:
```sql
CREATE TABLE inkasso_queue (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    invoice_number TEXT NOT NULL,
    dinero_guid TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_guid TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    days_overdue INTEGER NOT NULL,
    issue_date TIMESTAMPTZ NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    added_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,  -- pending, in_progress, sent_to_inkasso, completed, cancelled
    sent_to_inkasso_at TIMESTAMPTZ,
    inkasso_reference TEXT,
    inkasso_company TEXT,
    notes TEXT
);
```

## API Usage

### Run for Single User

```python
from invoice_reminder_automation import run_reminder_automation_for_user
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
user_id = 'a422f931-51a8-42de-bdaa-879561ce63f7'

# Dry run (analyze only, don't send)
result = run_reminder_automation_for_user(user_id, supabase, dry_run=True)

# Live run (actually send reminders)
result = run_reminder_automation_for_user(user_id, supabase, dry_run=False)

print(f"Sent {result['reminders_sent']} reminders")
print(f"Moved {result['moved_to_inkasso']} to inkasso")
```

### Run for All Users

```python
from invoice_reminder_automation import InvoiceReminderAutomation

# Get all users with automation enabled
users = supabase.table('automation_settings') \
    .select('user_id') \
    .eq('automation_enabled', True) \
    .execute()

for user in users.data:
    automation = InvoiceReminderAutomation(supabase, user['user_id'])
    result = automation.process_reminders(dry_run=False)
    print(f"User {user['user_id']}: {result['reminders_sent']} sent")
```

## Configuration

### Timing Constants

```python
class InvoiceReminderAutomation:
    DAYS_UNTIL_PRE_REMINDER = 3  # Days after due date
    DAYS_BETWEEN_REMINDERS = 10  # Days between each reminder
```

To change timing (e.g., for testing):
```python
automation = InvoiceReminderAutomation(supabase, user_id)
automation.DAYS_UNTIL_PRE_REMINDER = 1  # Send PreReminder after 1 day
automation.DAYS_BETWEEN_REMINDERS = 5   # 5 days between reminders
```

## Testing

### Dry Run Mode

Always test with dry_run=True first:

```bash
cd /Users/arianlushtaku/Desktop/saas/autorykker-v2/backend
python3 invoice_reminder_automation.py
```

Output:
```
================================================================================
🚀 Starting Invoice Reminder Automation
   User: a422f931-51a8-42de-bdaa-879561ce63f7
   Mode: DRY RUN
================================================================================
📋 Fetching overdue unpaid invoices...
✅ Found 45 overdue invoices

📊 Analyzing 45 overdue invoices...
   PreReminders: 12
   Rykker 1: 8
   Rykker 2: 2
   Rykker 3: 1
   Move to Inkasso: 1

🔍 DRY RUN MODE - No reminders will be sent

RESULTS:
  Total overdue: 45
  Actions needed: 23
================================================================================
```

### Check Reminder History

```python
# See what reminders were sent
reminders = supabase.table('reminder_history') \
    .select('*') \
    .eq('user_id', user_id) \
    .order('sent_at', desc=True) \
    .limit(10) \
    .execute()

for r in reminders.data:
    print(f"{r['sent_at']}: {r['reminder_type']} for invoice {r['invoice_id']}")
```

### Check Inkasso Queue

```python
# See what's in the inkasso queue
queue = supabase.table('inkasso_queue') \
    .select('*') \
    .eq('user_id', user_id) \
    .eq('status', 'pending') \
    .execute()

print(f"Inkasso queue: {len(queue.data)} invoices")
for item in queue.data:
    print(f"  Invoice {item['invoice_number']}: {item['amount']} DKK, {item['days_overdue']} days overdue")
```

## Integration with Full Automation

```python
# Complete automation workflow
def run_full_automation(user_id):
    # 1. Sync invoices from Dinero
    sync_dinero_invoices(user_id)
    
    # 2. Run invoice matcher
    run_matcher_for_user(user_id)
    
    # 3. Register payments for matches
    register_payments_for_matches(user_id)
    
    # 4. Sync invoices again (update payment status)
    sync_dinero_invoices(user_id)
    
    # 5. Run reminder automation
    result = run_reminder_automation_for_user(user_id, supabase)
    
    return result
```

## Error Handling

All errors are logged with full context:

```python
try:
    result = automation.process_reminders()
except Exception as e:
    logger.error(f"❌ Fatal error in reminder automation: {e}", exc_info=True)
```

Individual invoice errors don't stop processing:
```python
for decision, invoice in decisions:
    try:
        send_reminder(decision)
    except Exception as e:
        logger.error(f"❌ Error processing invoice {invoice['invoice_number']}: {e}")
        error_count += 1
        # Continue with next invoice
```

## Monitoring

### Key Metrics to Track

1. **Reminders sent per day**
   - PreReminders
   - Rykker 1, 2, 3

2. **Inkasso queue growth**
   - How many invoices reach Rykker 3

3. **Success rate**
   - Invoices paid after each reminder stage

4. **Processing time**
   - How long automation takes

### Query Examples

```sql
-- Reminders sent today
SELECT reminder_type, COUNT(*) 
FROM reminder_history 
WHERE user_id = 'xxx' 
  AND sent_at >= CURRENT_DATE
GROUP BY reminder_type;

-- Inkasso queue status
SELECT status, COUNT(*), SUM(amount) as total_amount
FROM inkasso_queue
WHERE user_id = 'xxx'
GROUP BY status;

-- Average days to payment by reminder stage
SELECT 
    rh.reminder_type,
    AVG(EXTRACT(DAY FROM i.payment_date - rh.sent_at)) as avg_days_to_payment
FROM reminder_history rh
JOIN invoices i ON rh.invoice_id = i.id
WHERE i.status = 'Paid'
GROUP BY rh.reminder_type;
```

## Next Steps

1. **Implement Dinero API integration** for actually sending reminders
2. **Add email notifications** to user when reminders are sent
3. **Create dashboard** to view reminder history and inkasso queue
4. **Add webhook** to trigger automation when invoices sync
5. **Implement inkasso export** to send cases to debt collection companies
6. **Add A/B testing** for reminder timing and messaging
