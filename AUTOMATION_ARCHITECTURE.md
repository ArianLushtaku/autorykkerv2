# Automation Architecture

## Overview

The automation system is designed as **separate, focused scripts** that can be run independently or chained together via cron jobs. This provides maximum flexibility and easier debugging.

## Design Philosophy

### ✅ **Modular Approach (Recommended)**
Each script does ONE thing well:
- Easy to debug (check logs for specific script)
- Easy to test (run each script independently)
- Easy to schedule (different cron schedules for different tasks)
- Easy to maintain (change one without affecting others)
- Easy to monitor (track success/failure per script)

### ❌ **All-in-One Approach (Not Recommended)**
One giant script that does everything:
- Hard to debug (which part failed?)
- Hard to test (must run entire workflow)
- Inflexible scheduling (all or nothing)
- Risky (one failure stops everything)

## Automation Scripts

### 1. **Invoice Sync** (`sync_dinero_invoices.py`)
**Purpose:** Fetch invoices from Dinero API and update database

**When to run:** Every 6 hours or when triggered manually

**What it does:**
- Fetches new/updated invoices from Dinero
- Syncs reminder data from Dinero
- Updates `invoices` and `invoice_reminders` tables
- Logs all sync activity

**Cron schedule:**
```bash
0 */6 * * * cd /path/to/backend && python3 sync_dinero_invoices.py
```

---

### 2. **Invoice Matcher** (`invoice_matcher_v2.py`)
**Purpose:** Match bank transactions to invoices

**When to run:** After invoice sync, or every 12 hours

**What it does:**
- Loads bank transactions and invoices
- Matches transactions to invoices using multiple algorithms
- Saves matches to `invoice_matches` table
- Sets initial status based on invoice payment status
- Logs all matching activity

**Cron schedule:**
```bash
30 */12 * * * cd /path/to/backend && python3 invoice_matcher_v2.py
```

---

### 3. **Payment Registration** (`register_payments.py`)
**Purpose:** Register matched payments in Dinero

**When to run:** After invoice matcher, or daily

**What it does:**
- Finds approved matches that haven't been registered
- Registers each payment in Dinero via API
- Updates match status to `marked_paid`
- Logs all registration activity

**Cron schedule:**
```bash
0 9 * * * cd /path/to/backend && python3 register_payments.py
```

---

### 4. **Invoice Sync (Again)** 
**Purpose:** Update invoice statuses after payment registration

**When to run:** After payment registration

**What it does:**
- Same as step 1, but updates payment statuses
- Ensures invoices reflect newly registered payments

**Note:** Can reuse the same script as step 1

---

### 5. **Reminder Automation** (`invoice_reminder_automation.py`)
**Purpose:** Send reminders for overdue invoices

**When to run:** Daily at 9 AM

**What it does:**
- Finds overdue unpaid invoices
- Checks reminder count from `invoice_reminders` table
- Determines next reminder stage based on `automation_settings`
- Sends reminders via Dinero API
- Moves Rykker 3 cases to `inkasso_queue`
- Logs all reminder activity

**Cron schedule:**
```bash
0 9 * * 1-5 cd /path/to/backend && python3 invoice_reminder_automation.py
```
(Monday-Friday at 9 AM)

---

## Complete Workflow

### Option A: Separate Cron Jobs (Recommended)

```bash
# Invoice sync - Every 6 hours
0 */6 * * * cd /backend && python3 sync_dinero_invoices.py >> /logs/invoice_sync.log 2>&1

# Invoice matcher - Every 12 hours
30 */12 * * * cd /backend && python3 invoice_matcher_v2.py >> /logs/matcher.log 2>&1

# Payment registration - Daily at 8 AM
0 8 * * 1-5 cd /backend && python3 register_payments.py >> /logs/payments.log 2>&1

# Reminder automation - Daily at 9 AM (after payments)
0 9 * * 1-5 cd /backend && python3 invoice_reminder_automation.py >> /logs/reminders.log 2>&1
```

**Benefits:**
- Each script runs independently
- Different schedules for different tasks
- Separate log files for easy debugging
- One failure doesn't stop others

### Option B: Master Script (Alternative)

Create a `run_full_automation.py` that calls each script:

```python
#!/usr/bin/env python3
"""
Master automation script - runs all automation steps in sequence
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def run_full_automation(user_id: str):
    """Run complete automation workflow for a user"""
    
    logger.info("="*80)
    logger.info(f"🚀 Starting Full Automation for user {user_id}")
    logger.info(f"   Time: {datetime.now()}")
    logger.info("="*80)
    
    try:
        # Step 1: Sync invoices
        logger.info("\n📥 Step 1: Syncing invoices from Dinero...")
        from sync_dinero_invoices import sync_invoices_for_user
        sync_result = sync_invoices_for_user(user_id)
        logger.info(f"   ✅ Synced {sync_result['invoices_synced']} invoices")
        
        # Step 2: Match transactions
        logger.info("\n🔍 Step 2: Matching transactions to invoices...")
        from invoice_matcher_v2 import run_matcher_for_user
        match_result = run_matcher_for_user({'user_id': user_id})
        logger.info(f"   ✅ Created {match_result[0]} matches")
        
        # Step 3: Register payments
        logger.info("\n💳 Step 3: Registering payments in Dinero...")
        from register_payments import register_payments_for_user
        payment_result = register_payments_for_user(user_id)
        logger.info(f"   ✅ Registered {payment_result['registered']} payments")
        
        # Step 4: Sync invoices again (update payment status)
        logger.info("\n📥 Step 4: Syncing invoices again (update status)...")
        sync_result2 = sync_invoices_for_user(user_id)
        logger.info(f"   ✅ Updated {sync_result2['invoices_synced']} invoices")
        
        # Step 5: Send reminders
        logger.info("\n📧 Step 5: Sending reminders...")
        from invoice_reminder_automation import run_reminder_automation_for_user
        reminder_result = run_reminder_automation_for_user(user_id, supabase)
        logger.info(f"   ✅ Sent {reminder_result['reminders_sent']} reminders")
        
        logger.info("\n" + "="*80)
        logger.info("🎉 Full Automation Complete")
        logger.info("="*80)
        
        return {
            'success': True,
            'invoices_synced': sync_result['invoices_synced'],
            'matches_created': match_result[0],
            'payments_registered': payment_result['registered'],
            'reminders_sent': reminder_result['reminders_sent']
        }
        
    except Exception as e:
        logger.error(f"❌ Automation failed: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    # Run for all enabled users
    from database import supabase
    
    users = supabase.table('automation_settings') \
        .select('user_id') \
        .eq('automation_enabled', True) \
        .execute()
    
    for user in users.data:
        run_full_automation(user['user_id'])
```

**Cron schedule:**
```bash
0 9 * * 1-5 cd /backend && python3 run_full_automation.py >> /logs/automation.log 2>&1
```

## Configuration

### User Settings (`automation_settings` table)

Each user can configure their own timing rules:

```sql
SELECT 
    pre_reminder_days_after_due,  -- Default: 3 days
    rykker_1_days_after_pre,      -- Default: 10 days
    rykker_2_days_after_rykker_1, -- Default: 10 days
    rykker_3_days_after_rykker_2, -- Default: 10 days
    auto_inkasso_enabled          -- Default: true
FROM automation_settings
WHERE user_id = 'xxx';
```

**Example custom timing:**
```sql
UPDATE automation_settings SET
    pre_reminder_days_after_due = 5,      -- Wait 5 days instead of 3
    rykker_1_days_after_pre = 7,          -- 7 days instead of 10
    rykker_2_days_after_rykker_1 = 7,
    rykker_3_days_after_rykker_2 = 7
WHERE user_id = 'xxx';
```

## Logging

### Log Levels

- **DEBUG**: Detailed analysis of each invoice
- **INFO**: Major steps and successful operations
- **WARNING**: Invoices moving to inkasso, unusual situations
- **ERROR**: Failures that need attention

### Log Format

```
2025-11-26 09:00:00 INFO: ================================================================================
2025-11-26 09:00:00 INFO: 🚀 Starting Invoice Reminder Automation
2025-11-26 09:00:00 INFO:    User: a422f931-51a8-42de-bdaa-879561ce63f7
2025-11-26 09:00:00 INFO:    Settings: PreReminder=3d, Rykker1=10d, Rykker2=10d, Rykker3=10d
2025-11-26 09:00:00 INFO: ================================================================================
2025-11-26 09:00:01 INFO: 📋 Fetching overdue unpaid invoices for user a422f931...
2025-11-26 09:00:02 INFO: ✅ Found 45 overdue invoices out of 120 unpaid
2025-11-26 09:00:02 INFO:    Overdue breakdown: {'1-3 days': 12, '4-13 days': 18, ...}
2025-11-26 09:00:02 INFO: 📊 Analyzing 45 overdue invoices...
2025-11-26 09:00:02 DEBUG: 🔍 Analyzing invoice 10403: 5 days overdue, current stage: MailOut
2025-11-26 09:00:02 DEBUG:    Current reminder number: 0
2025-11-26 09:00:02 INFO:    ✅ 10403: Ready for PreReminder (5 days)
```

### Separate Log Files

```bash
/var/log/autorykker/
├── invoice_sync.log          # Invoice sync activity
├── matcher.log                # Matching activity
├── payments.log               # Payment registration
├── reminders.log              # Reminder sending
└── automation.log             # Full automation (if using master script)
```

## Monitoring

### Key Metrics to Track

1. **Script execution time**
   - How long each script takes
   - Identify performance issues

2. **Success/failure rate**
   - How many scripts complete successfully
   - Track error patterns

3. **Records processed**
   - Invoices synced
   - Matches created
   - Payments registered
   - Reminders sent

4. **Inkasso queue growth**
   - How many invoices reach Rykker 3
   - Track collection effectiveness

### Health Check Queries

```sql
-- Check last successful runs
SELECT 
    'invoice_sync' as script,
    MAX(last_synced_at) as last_run
FROM invoices
WHERE user_id = 'xxx'

UNION ALL

SELECT 
    'matcher' as script,
    MAX(last_matcher_sync) as last_run
FROM automation_settings
WHERE user_id = 'xxx';

-- Check pending actions
SELECT 
    COUNT(*) FILTER (WHERE status = 'approved' AND marked_paid_at IS NULL) as pending_payments,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_inkasso
FROM invoice_matches
WHERE user_id = 'xxx';
```

## Recommendation

**Use separate cron jobs** (Option A) because:

1. ✅ **Easier debugging** - Check specific log file
2. ✅ **Flexible scheduling** - Different frequencies for different tasks
3. ✅ **Fault isolation** - One failure doesn't stop others
4. ✅ **Easier testing** - Run individual scripts
5. ✅ **Better monitoring** - Track each script separately

The master script (Option B) is useful for:
- Manual testing of full workflow
- On-demand full sync
- Debugging workflow issues

But for production, use separate cron jobs!
