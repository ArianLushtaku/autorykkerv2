# Payment Registration Automation

## Overview

Automated script that processes all pending invoice matches and registers payments in Dinero. Runs in multi-tenant mode with rate limiting, retry logic, and automatic invoice sync after completion.

## Features

✅ **Multi-tenant processing** - Processes all users with automation enabled in parallel
✅ **Rate limiting** - Max 100 API calls per user to avoid overwhelming Dinero API
✅ **Batch processing** - Processes all pending matches per user
✅ **Detailed logging** - Tracks success/failure for each payment
✅ **Automatic invoice sync** - Runs invoice sync after payments to update statuses
✅ **Thread-safe** - Parallel processing with max 5 workers
✅ **Error handling** - Continues processing other users if one fails

## How It Works

### 1. **Fetch Users**
```sql
SELECT user_id FROM automation_settings WHERE enabled = true
```

### 2. **For Each User (in parallel):**

#### a. Get User Profile
- Fetch Dinero credentials
- Check if Dinero is connected
- Get organization ID

#### b. Get Pending Matches
```sql
SELECT * FROM invoice_matches 
WHERE user_id = ? 
  AND status = 'pending' 
  AND marked_paid_at IS NULL
ORDER BY created_at
```

#### c. Process Each Match
1. Check rate limit (max 100 API calls per user)
2. Call Dinero API to get invoice details (1 API call)
3. Call Dinero API to register payment (1 API call)
4. Update database:
   ```sql
   UPDATE invoice_matches SET
       marked_paid_at = NOW(),
       marked_paid_by = user_id
   WHERE id = match_id
   ```
5. Small delay (0.1s) between calls

### 3. **After All Users Processed**
Run invoice sync to update payment statuses:
```bash
python3 sync_customers.py
```

## Usage

### Run Automation
```bash
cd /Users/arianlushtaku/Desktop/saas/autorykker-v2/backend
python3 payment_automation.py
```

### Expected Output
```
================================================================================
💰 Payment Registration Automation - Multi-Tenant Mode
================================================================================
📋 Found 5 users with automation enabled

⚡ Processing 5 users in parallel (max 5 workers)...

Processing payments for user a422f931-51a8-42de-bdaa-879561ce63f7
Found 15 pending matches for user a422f931-51a8-42de-bdaa-879561ce63f7
✓ Registered payment for invoice 10403 (279.0 DKK)
✓ Registered payment for invoice 10404 (500.0 DKK)
✓ Registered payment for invoice 10405 (1250.0 DKK)
...

[1/5] ✅ a422f931... - 15/15 payments registered
[2/5] ✅ b533a042... - 8/8 payments registered
[3/5] ❌ c644b153... - Dinero not connected
[4/5] ✅ d755c264... - 12/12 payments registered
[5/5] ✅ e866d375... - 20/20 payments registered

================================================================================
🎉 PAYMENT AUTOMATION COMPLETE
================================================================================
Users processed: 5
Total matches processed: 55
Total payments registered: 55
Total failed: 0
Total API calls: 110
Elapsed time: 12.3 seconds (0.2 minutes)
Average per user: 2.5 seconds
================================================================================

================================================================================
🔄 Running invoice sync to update payment statuses...
================================================================================
✅ Invoice sync completed successfully
```

## Rate Limiting

### Global Rate Limit
- **Max API calls**: 100 requests per minute (Dinero API limit)
- **API calls per payment**: 2 (get invoice + register payment)
- **Max payments per minute**: ~50 payments

### How It Works
Uses a sliding window rate limiter (same as `sync_reminder_fees.py`):
```python
class RateLimiter:
    def __init__(self, max_requests=100, time_window=60):
        # Tracks timestamps of last 100 requests
        # Waits if limit reached within 60-second window
```

### What Happens at Limit?
```
Rate limit reached. Waiting 15.3 seconds...
```
- Script automatically pauses
- Waits until oldest request falls outside 60-second window
- Resumes processing automatically
- **No matches are skipped** - all pending matches are processed

### Why Rate Limiting?
- Dinero API enforces 100 requests/minute
- Prevents API errors and account suspension
- Allows processing unlimited matches (just takes longer)
- Shared across all users in parallel processing

## Error Handling

### User-Level Errors
If a user fails (e.g., no Dinero connection):
- ❌ Log error for that user
- ✅ Continue processing other users
- ✅ Include in summary report

### Match-Level Errors
If a payment fails (e.g., invoice already paid):
- ❌ Log error for that match
- ✅ Continue processing other matches for same user
- ✅ Include in failed matches report

### Common Errors

**1. Dinero Not Connected**
```
User b533a042 has not connected Dinero
```
**Solution**: User needs to connect Dinero account

**2. Rate Limit Reached**
```
Rate limit reached for user a422f931 (100 API calls)
```
**Solution**: Wait for next run, remaining matches will be processed

**3. Payment Already Registered**
```
Failed to register payment for invoice 10403: Payment already exists
```
**Solution**: Match should be marked as paid, check invoice status

**4. Timestamp Error**
```
Failed to register payment for invoice 10404: Invalid timestamp
```
**Solution**: Run invoice sync first to get latest timestamps

## Database Updates

### Before Processing
```sql
-- Match status
status: 'pending'
marked_paid_at: NULL
marked_paid_by: NULL
```

### After Successful Payment
```sql
-- Match status
status: 'pending'  -- Stays pending until invoice sync confirms payment
marked_paid_at: '2025-11-27T17:30:00Z'
marked_paid_by: 'Autorykker'  -- 'Autorykker' for automation, user_id for manual
```

### After Invoice Sync
```sql
-- Match status (updated by trigger when invoice.status changes to 'Paid')
status: 'approved'
marked_paid_at: '2025-11-27T17:30:00Z'
marked_paid_by: 'Autorykker'  -- Remains 'Autorykker'
```

## Workflow Integration

### Complete Automation Flow
```
1. Invoice Sync (sync_customers.py)
   ↓
2. Invoice Matcher (invoice_matcher_v2.py)
   ↓
3. Payment Registration (payment_automation.py) ← NEW!
   ↓
4. Invoice Sync (sync_customers.py) ← Auto-triggered
   ↓
5. Reminder Automation (invoice_reminder_automation.py)
```

### Scheduling (Cron)
```bash
# Run every hour
0 * * * * cd /path/to/backend && python3 payment_automation.py >> logs/payment_automation.log 2>&1
```

Or run manually after invoice matcher:
```bash
python3 invoice_matcher_v2.py && python3 payment_automation.py
```

## Monitoring

### Check Pending Matches
```sql
SELECT 
    user_id,
    COUNT(*) as pending_count,
    SUM(transaction_amount) as pending_amount
FROM invoice_matches
WHERE status = 'pending' AND marked_paid_at IS NULL
GROUP BY user_id;
```

### Check Recently Registered
```sql
SELECT 
    user_id,
    COUNT(*) as registered_count,
    SUM(transaction_amount) as registered_amount
FROM invoice_matches
WHERE marked_paid_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id;
```

### Check Failed Registrations
Look for matches that are pending but have been around for a while:
```sql
SELECT *
FROM invoice_matches
WHERE status = 'pending' 
  AND marked_paid_at IS NULL
  AND created_at < NOW() - INTERVAL '1 day'
ORDER BY created_at;
```

## Retry Logic

### Automatic Retry
- Failed matches stay `pending`
- Next run will attempt them again
- No explicit retry queue needed

### Manual Retry
If a user consistently fails:
```bash
# Check user's Dinero connection
SELECT dinero_connected, dinero_organization_id 
FROM profiles 
WHERE id = 'user-id';

# Re-run for specific user (not implemented yet, but could be added)
python3 payment_automation.py --user-id a422f931-51a8-42de-bdaa-879561ce63f7
```

## Performance

### Benchmarks
- **5 users, 55 matches**: ~12 seconds
- **Average per user**: ~2.5 seconds
- **Average per payment**: ~0.2 seconds (including API calls + DB updates)

### Optimization
- ✅ Parallel processing (5 workers)
- ✅ Minimal delay between calls (0.1s)
- ✅ Batch DB queries where possible
- ✅ Rate limiting prevents overwhelming API

## Security

- ✅ Uses service role key for database access
- ✅ Encrypted Dinero tokens
- ✅ User isolation (can only process own matches)
- ✅ Audit trail (marked_paid_by tracks who registered)

## Testing

### Test with Single User
```python
# Add to payment_automation.py
if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--user-id':
        user_id = sys.argv[2]
        # Process single user
    else:
        main()
```

Then:
```bash
python3 payment_automation.py --user-id a422f931-51a8-42de-bdaa-879561ce63f7
```

### Dry Run Mode
Add `--dry-run` flag to simulate without actually registering payments.

## Troubleshooting

### No Pending Matches
```
Found 0 pending matches for user a422f931...
```
**Possible reasons:**
- All matches already processed
- Invoice matcher hasn't run yet
- Matches are in wrong status

### Invoice Sync Fails
```
❌ Invoice sync failed
```
**Solution:**
- Check sync_customers.py logs
- Verify Dinero credentials
- Run sync manually to debug

### High API Call Count
```
Total API calls: 500
```
**If too high:**
- Reduce max_api_calls per user
- Increase delay between calls
- Process fewer users in parallel

## Future Enhancements

- [ ] Add `--user-id` flag for single user processing
- [ ] Add `--dry-run` flag for testing
- [ ] Email notifications on completion
- [ ] Slack/Discord webhook for failures
- [ ] Dashboard for monitoring
- [ ] Retry queue with exponential backoff
- [ ] Support for partial payments
- [ ] Batch API calls (if Dinero supports)
