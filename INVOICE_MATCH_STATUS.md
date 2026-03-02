# Invoice Match Status - Auto-Sync with Invoice Status

## Overview

The `invoice_matches` table no longer stores a static `status` field. Instead, we use a **database view** (`invoice_matches_with_status`) that automatically reflects the current invoice payment status in real-time.

## How It Works

### Before (Static Status - ❌ Gets Stale)
```
invoice_matches table:
  - status: 'pending' (set once, never updated)
  
Problem: If invoice is marked as paid later, match status stays 'pending'
```

### After (Dynamic Status - ✅ Always Current)
```
invoice_matches_with_status view:
  - current_status: computed from invoices.status in real-time
  - invoice_status: the actual invoice status
  
Benefit: Status always reflects current invoice state, no sync needed!
```

## Database Schema

### invoice_matches (Base Table)
```sql
CREATE TABLE invoice_matches (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  transaction_amount DECIMAL(10,2),
  invoice_amount DECIMAL(10,2),
  confidence DECIMAL(3,2),
  match_reason TEXT,
  match_type TEXT,
  status TEXT,  -- Nullable, not used (kept for backward compatibility)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### invoice_matches_with_status (View)
```sql
CREATE VIEW invoice_matches_with_status AS
SELECT 
    im.*,
    CASE 
        WHEN i.status = 'Paid' THEN 'approved'
        ELSE 'pending'
    END as current_status,
    i.status as invoice_status,
    i.due_date as invoice_due_date,
    i.invoice_date as invoice_date
FROM invoice_matches im
LEFT JOIN invoices i ON im.invoice_id = i.invoice_id AND im.user_id = i.user_id;
```

## Usage in Your Application

### ❌ Don't Query This Anymore:
```sql
-- Old way (static status from base table)
SELECT * FROM invoice_matches WHERE status = 'pending';
```

### ✅ Use This Instead:
```sql
-- New way (dynamic status from view)
SELECT * FROM invoice_matches_with_status WHERE status = 'pending';
```

**Note:** The view has a single `status` field (not `current_status`) that is computed from the invoice status.

## API Endpoint Updates

Update your backend endpoints to use the view:

### Example: Get Pending Matches
```python
# Old
response = supabase.table('invoice_matches') \
    .select('*') \
    .eq('user_id', user_id) \
    .eq('status', 'pending') \
    .execute()

# New
response = supabase.table('invoice_matches_with_status') \
    .select('*') \
    .eq('user_id', user_id) \
    .eq('status', 'pending') \
    .execute()
```

### Example: Get Approved Matches
```python
response = supabase.table('invoice_matches_with_status') \
    .select('*') \
    .eq('user_id', user_id) \
    .eq('status', 'approved') \
    .execute()
```

### Example: Get Match with Invoice Details
```python
response = supabase.table('invoice_matches_with_status') \
    .select('invoice_number, transaction_amount, invoice_amount, status, invoice_status, invoice_payment_date') \
    .eq('user_id', user_id) \
    .order('created_at', desc=True) \
    .execute()
```

## Frontend Updates

Update your frontend queries to use `invoice_matches_with_status`:

```typescript
// Old
const { data: matches } = await supabase
  .from('invoice_matches')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'pending');

// New
const { data: matches } = await supabase
  .from('invoice_matches_with_status')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'pending');
```

## Status Mapping

| Invoice Status | Match Status |
|----------------|--------------|
| `Paid`         | `approved`   |
| `Unpaid`       | `pending`    |
| `Overdue`      | `pending`    |
| `Draft`        | `pending`    |
| `Booked`       | `pending`    |

## Benefits

✅ **Always accurate** - Status reflects current invoice state  
✅ **No sync logic** - Database handles it automatically  
✅ **Real-time updates** - Invoice marked as paid? Match status updates instantly  
✅ **Simpler code** - No need to update match status when invoice changes  
✅ **Performance** - View is just a JOIN, very fast with proper indexes  

## Migration Steps

1. **Apply the migration:**
   ```bash
   cd /Users/arianlushtaku/Desktop/saas
   supabase db push
   ```

2. **Update backend API endpoints** to query `invoice_matches_with_status` instead of `invoice_matches`

3. **Update frontend queries** to use the new view

4. **Test** that pending/approved filtering works correctly

## RLS Policies

The view inherits RLS from the base tables (`invoice_matches` and `invoices`), so your existing security policies still apply.

## Backward Compatibility

The `status` column still exists in `invoice_matches` (nullable) for backward compatibility. You can drop it later once all code is updated:

```sql
-- After all code is updated, optionally drop the old column
ALTER TABLE invoice_matches DROP COLUMN status;
```

## Example Queries

### Get all pending matches for a user
```sql
SELECT 
  invoice_number,
  transaction_amount,
  invoice_amount,
  confidence,
  match_type,
  current_status,
  invoice_due_date
FROM invoice_matches_with_status
WHERE user_id = 'a422f931-51a8-42de-bdaa-879561ce63f7'
  AND current_status = 'pending'
ORDER BY created_at DESC;
```

### Get approved matches (paid invoices)
```sql
SELECT 
  invoice_number,
  transaction_amount,
  invoice_status,
  current_status
FROM invoice_matches_with_status
WHERE user_id = 'a422f931-51a8-42de-bdaa-879561ce63f7'
  AND current_status = 'approved';
```

### Count matches by status
```sql
SELECT 
  current_status,
  COUNT(*) as count,
  SUM(transaction_amount) as total_amount
FROM invoice_matches_with_status
WHERE user_id = 'a422f931-51a8-42de-bdaa-879561ce63f7'
GROUP BY current_status;
```
