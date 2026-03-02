# Multi-Tenant Invoice Matcher Automation

## Overview

Automated invoice matching system that processes **all users** with automation enabled in parallel, with intelligent incremental syncing to handle transaction lag.

## Key Features

### 🚀 **Parallel Processing**
- Processes up to **5 users simultaneously** using ThreadPoolExecutor
- **5-10x faster** than sequential processing
- Thread-safe with isolated Supabase clients per worker

### 📊 **Intelligent Sync Tracking**
- **Initial sync**: Fetches ALL transactions for new users
- **Incremental sync**: Only fetches new transactions since last run
- **3-day overlap buffer**: Handles transaction lag (e.g., transactions dated Nov 23 appearing on Nov 25)
- Tracks `last_matcher_sync` per user in `automation_settings` table

### 🔒 **Security**
- Service role key stored server-side only (never exposed to clients)
- RLS enforced - all queries filtered by `user_id`
- Each user's data processed in isolation
- Audit trail with match history per tenant

## How It Works

### Sync Logic

```
Day 1 (Initial Sync):
  - last_matcher_sync = NULL
  - Fetches ALL transactions
  - After success: last_matcher_sync = 2025-11-25 14:00:00

Day 2 (Incremental Sync):
  - last_matcher_sync = 2025-11-25 14:00:00
  - Fetches transactions from: 2025-11-22 14:00:00 (3-day overlap)
  - This catches late-arriving transactions from Nov 23-24
  - After success: last_matcher_sync = 2025-11-26 14:00:00
```

### Why 3-Day Overlap?

Bank transactions can have a **booking_date** that's 1-3 days in the past:
- Transaction happens on Nov 23
- Appears in GoCardless API on Nov 25 with `booking_date = 2025-11-23`

Without overlap, we'd miss these transactions. The 3-day buffer ensures we catch them.

## Setup

### 1. Apply Database Migration

```bash
cd /Users/arianlushtaku/Desktop/saas
supabase db push
```

Or manually run:
```sql
-- File: supabase/migrations/20241125_matcher_sync_tracking.sql
ALTER TABLE automation_settings 
ADD COLUMN IF NOT EXISTS last_matcher_sync TIMESTAMP WITH TIME ZONE;
```

### 2. Environment Variables

```bash
# .env file
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# No USER_ID needed for production!
```

### 3. Enable Automation Per User

Users enable automation in their settings:

```sql
UPDATE automation_settings 
SET automation_enabled = true 
WHERE user_id = 'user-uuid';
```

## Usage

### Production Mode (All Users)

```bash
python3 invoice_matcher_v2.py
```

Output:
```
🚀 Invoice Matcher - Multi-Tenant Mode (Parallel Processing)
================================================================================
🏭 PRODUCTION MODE: Running for all enabled users
📋 Found 10 users with automation enabled

⚡ Processing 10 users in parallel (max 5 workers)...

================================================================================
🤖 Running invoice matcher for user a422f931-51a8-42de-bdaa-879561ce63f7
   Last sync: 2025-11-24T14:30:00
   Mode: INCREMENTAL (with 3-day overlap buffer)
   Fetching transactions from: 2025-11-21 (3-day overlap)
================================================================================
Loaded 45 transactions, 234 invoices, 89 contacts.
...
✅ Saved 12 matches to database (3 already existed)

[1/10] ✅ Completed user a422f931-51a8-42de-bdaa-879561ce63f7
[2/10] ✅ Completed user b533g042-62b9-53ef-ceeb-980672df74f8
...

================================================================================
🎉 AUTOMATION COMPLETE
================================================================================
Users processed: 10
Total matches found: 87
Total saved to database: 65
Total skipped (duplicates): 22
Elapsed time: 45.3 seconds (0.8 minutes)
Average per user: 4.5 seconds
================================================================================
```

### Debug Mode (Single User)

```bash
python3 invoice_matcher_v2.py --user-id a422f931-51a8-42de-bdaa-879561ce63f7
```

Useful for:
- Testing changes
- Debugging specific user issues
- Manual re-runs

## Cron Setup

### Every 6 Hours

```bash
# Add to crontab (crontab -e)
0 */6 * * * cd /path/to/backend && source venv/bin/activate && python3 invoice_matcher_v2.py >> /var/log/matcher.log 2>&1
```

### Twice Daily (8 AM and 8 PM)

```bash
0 8,20 * * * cd /path/to/backend && source venv/bin/activate && python3 invoice_matcher_v2.py >> /var/log/matcher.log 2>&1
```

## Performance

### Sequential (Old)
- 10 users × 30s each = **5 minutes**
- 100 users × 30s each = **50 minutes**
- 1000 users × 30s each = **8+ hours** ❌

### Parallel (New)
- 10 users ÷ 5 workers = **~1 minute** ✅
- 100 users ÷ 5 workers = **~10 minutes** ✅
- 1000 users ÷ 5 workers = **~1.5 hours** ✅

**5-10x faster** depending on user count!

## Database Schema

### automation_settings

```sql
CREATE TABLE automation_settings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  
  -- Automation toggle
  automation_enabled BOOLEAN DEFAULT false,
  
  -- Sync tracking (NEW)
  last_matcher_sync TIMESTAMP WITH TIME ZONE,
  
  -- Reminder settings
  pre_reminder_enabled BOOLEAN DEFAULT true,
  rykker_1_enabled BOOLEAN DEFAULT true,
  ...
);
```

### invoice_matches

```sql
CREATE TABLE invoice_matches (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  confidence DECIMAL(3,2),
  match_type TEXT,
  status TEXT DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(transaction_id, invoice_id),
  UNIQUE(transaction_id) -- One transaction = one invoice
);
```

## Monitoring

### Check Last Sync Per User

```sql
SELECT 
  user_id,
  automation_enabled,
  last_matcher_sync,
  NOW() - last_matcher_sync AS time_since_sync
FROM automation_settings
WHERE automation_enabled = true
ORDER BY last_matcher_sync DESC;
```

### Check Recent Matches

```sql
SELECT 
  user_id,
  COUNT(*) as match_count,
  MAX(created_at) as latest_match
FROM invoice_matches
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id;
```

### View Logs

```bash
tail -f /var/log/matcher.log
```

## Troubleshooting

### No users found

```
⚠️  No users with automation enabled. Exiting.
```

**Solution**: Enable automation for at least one user:
```sql
UPDATE automation_settings 
SET automation_enabled = true 
WHERE user_id = 'your-user-id';
```

### Duplicate match errors

```
Skipped (already exist): 15
```

**This is normal** - transactions already matched are skipped. The 3-day overlap causes this intentionally.

### Slow performance

If processing is slow:
1. Check database indexes (run performance migration)
2. Reduce `max_workers` if hitting rate limits
3. Check if users have too many unmatched transactions

### Missing transactions

If transactions are missing:
1. Check `last_matcher_sync` date
2. Verify 3-day overlap is applied
3. Check if transactions are filtered (e.g., MobilePay excluded)
4. Manually reset sync: `UPDATE automation_settings SET last_matcher_sync = NULL WHERE user_id = 'xxx'`

## Adding New Customers

**No code changes needed!**

1. Customer signs up and configures settings in dashboard
2. Settings saved to `automation_settings` table
3. Customer enables automation toggle
4. Next cron run automatically includes them

## Security Best Practices

✅ **DO:**
- Keep service role key in server environment only
- Use RLS policies on all tables
- Filter all queries by `user_id`
- Log all automation runs

❌ **DON'T:**
- Expose service role key to frontend
- Share credentials between environments
- Skip user_id filtering in queries
- Run automation from client-side

## Next Steps

1. ✅ Multi-tenant parallel processing (DONE)
2. ✅ Incremental sync with overlap buffer (DONE)
3. ⏳ Dashboard UI for reviewing matches
4. ⏳ Automated marking as paid in Economic
5. ⏳ Reminder automation system
6. ⏳ Celery/Redis for horizontal scaling (100+ users)
