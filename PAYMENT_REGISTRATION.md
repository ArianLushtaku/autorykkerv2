# Payment Registration in Dinero

## Overview

This feature allows you to automatically register payments in Dinero for matched invoices. When a bank transaction is matched to an invoice, you can register that payment with a single API call.

## How It Works

### 1. **Get Match from Database**
Fetches the invoice match record which contains:
- `invoice_id` - The Dinero GUID (used to call Dinero API)
- `transaction_amount` - Payment amount
- `transaction_date` - Payment date
- `id` - Match ID (used for external reference only)

### 2. **Fetch Invoice Details from Dinero**
Calls Dinero API: `GET /v1/{organizationId}/invoices/{dinero_guid}`
Gets required fields:
- `TimeStamp` - Required for payment registration
- `DepositAccountNumber` - Bank account for the payment

### 3. **Register Payment in Dinero**
Calls Dinero API: `POST /v1/{organizationId}/invoices/{dinero_guid}/payments`
With data from the match:
- **External Reference**: `AutoRykker - {match_id}` (for tracking in our system)
- **Payment Date**: `transaction_date` from match
- **Amount**: `transaction_amount` from match
- **Timestamp**: From invoice details (step 2)
- **Deposit Account**: From invoice details (step 2)
- **Description**: "Autorykker Registreret"

### 4. **Update Match Status**
Updates the `invoice_matches` record:
- Sets `status` to `marked_paid`
- Records `marked_paid_at` timestamp
- Records `marked_paid_by` user ID
- Stores `economic_payment_id` for reference

## API Endpoints

### Single Payment Registration

**POST** `/invoice_matches/{match_id}/register_payment`

Registers a payment for a single invoice match.

**Note:** The `{match_id}` in the URL is our internal match ID. The endpoint will:
1. Look up the match to get `invoice_id` (Dinero GUID)
2. Use that Dinero GUID to call Dinero's payment API
3. Use `transaction_amount` and `transaction_date` from the match

**Example:**
```bash
curl -X POST http://localhost:5003/invoice_matches/967bc6ab-9543-42d2-b028-8681ba6e6a1e/register_payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Payment registered successfully",
  "match_id": "967bc6ab-9543-42d2-b028-8681ba6e6a1e",
  "invoice_number": "10403",
  "amount": 279.0,
  "marked_paid_at": "2025-11-26T14:30:00Z"
}
```

### Bulk Payment Registration

**POST** `/invoice_matches/{match_id}/bulk_register_payments`

Registers payments for multiple invoice matches at once.

**Body:**
```json
{
  "match_ids": [
    "967bc6ab-9543-42d2-b028-8681ba6e6a1e",
    "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    "e5f6g7h8-9012-34ij-klmn-5678901234op"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "success": [
      {
        "match_id": "967bc6ab-9543-42d2-b028-8681ba6e6a1e",
        "invoice_number": "10403",
        "amount": 279.0
      }
    ],
    "failed": [
      {
        "match_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
        "invoice_number": "10404",
        "reason": "Payment registration failed"
      }
    ],
    "skipped": [
      {
        "match_id": "e5f6g7h8-9012-34ij-klmn-5678901234op",
        "reason": "Already paid",
        "invoice_number": "10405"
      }
    ]
  },
  "summary": {
    "total": 3,
    "successful": 1,
    "failed": 1,
    "skipped": 1
  }
}
```

## Data Flow Diagram

```
Frontend Request:
POST /invoice_matches/967bc6ab-9543-42d2-b028-8681ba6e6a1e/register_payment
                    ↓ (match_id - our internal ID)

Backend fetches match from database:
{
  id: "967bc6ab-9543-42d2-b028-8681ba6e6a1e",  ← match_id (for externalReference)
  invoice_id: "233fab94-7b51-4cba-a794-f9b6ad583bed",  ← dinero_guid (for Dinero API)
  transaction_amount: 279,  ← payment amount
  transaction_date: "2025-11-14T00:00:00Z"  ← payment date
}
                    ↓

Backend calls Dinero API:
GET /v1/{orgId}/invoices/233fab94-7b51-4cba-a794-f9b6ad583bed
                    ↓ (using dinero_guid)

Gets invoice details:
{
  "TimeStamp": "000000009DF2A482",
  "DepositAccountNumber": 55000
}
                    ↓

Backend calls Dinero API:
POST /v1/{orgId}/invoices/233fab94-7b51-4cba-a794-f9b6ad583bed/payments
                    ↓ (using dinero_guid)

Sends payment data:
{
  "externalReference": "AutoRykker - 967bc6ab-9543-42d2-b028-8681ba6e6a1e",  ← match_id
  "paymentDate": "2025-11-14",  ← from match.transaction_date
  "amount": 279,  ← from match.transaction_amount
  "timestamp": "000000009DF2A482",  ← from invoice details
  "depositAccountNumber": 55000,  ← from invoice details
  "description": "Autorykker Registreret",
  "remainderIsFee": false
}
```

## What Gets Sent to Dinero

```json
{
  "externalReference": "AutoRykker - 967bc6ab-9543-42d2-b028-8681ba6e6a1e",
  "paymentDate": "2025-11-14",
  "description": "Autorykker Registreret",
  "amount": 279,
  "timestamp": "000000009DF2A482",
  "depositAccountNumber": 55000,
  "remainderIsFee": false
}
```

**Where each field comes from:**
- `externalReference` - Our match ID (for tracking)
- `paymentDate` - `match.transaction_date` (from bank transaction)
- `amount` - `match.transaction_amount` (from bank transaction)
- `timestamp` - From Dinero invoice details
- `depositAccountNumber` - From Dinero invoice details
- `description` - Hardcoded "Autorykker Registreret"
- `remainderIsFee` - Always false

## Database Updates

After successful payment registration, the `invoice_matches` table is updated:

```sql
UPDATE invoice_matches SET
  status = 'marked_paid',
  marked_paid_at = NOW(),
  marked_paid_by = {user_id},
  economic_payment_id = 'AutoRykker - {match_id}'
WHERE id = {match_id};
```

## Error Handling

### Common Errors:

1. **Match not found** (404)
   - The match ID doesn't exist or doesn't belong to the user

2. **Payment already registered** (400)
   - The match already has a `marked_paid_at` timestamp

3. **Dinero not connected** (400)
   - User hasn't connected their Dinero account

4. **Failed to register payment** (500)
   - Dinero API error (check logs for details)
   - Invoice might be in wrong status
   - Timestamp might be outdated

### Handling Timestamp Errors:

If you get a timestamp error from Dinero, it means the invoice was updated since you last synced. Solution:
1. Sync invoices from Dinero
2. Try registering the payment again

## Usage Example

### Frontend Integration:

```typescript
// Register single payment
async function registerPayment(matchId: string) {
  const response = await fetch(
    `${API_URL}/invoice_matches/${matchId}/register_payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Payment registered for invoice ${result.invoice_number}`);
  } else {
    console.error(`Failed: ${result.error}`);
  }
}

// Register multiple payments
async function registerBulkPayments(matchIds: string[]) {
  const response = await fetch(
    `${API_URL}/invoice_matches/bulk_register_payments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ match_ids: matchIds })
    }
  );
  
  const result = await response.json();
  
  console.log(`Registered ${result.summary.successful} payments`);
  console.log(`Failed: ${result.summary.failed}`);
  console.log(`Skipped: ${result.summary.skipped}`);
}
```

## Testing

### Test Single Payment:

```bash
# Get a match ID
python3 -c "
from supabase import create_client
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('.env'))
supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

# Get an approved match that hasn't been paid yet
match = supabase.table('invoice_matches') \
    .select('id, invoice_number, transaction_amount, status') \
    .eq('user_id', 'YOUR_USER_ID') \
    .eq('status', 'approved') \
    .is_('marked_paid_at', 'null') \
    .limit(1) \
    .execute()

if match.data:
    print(f\"Match ID: {match.data[0]['id']}\")
    print(f\"Invoice: {match.data[0]['invoice_number']}\")
    print(f\"Amount: {match.data[0]['transaction_amount']}\")
"

# Then register the payment via API
curl -X POST http://localhost:5003/invoice_matches/YOUR_MATCH_ID/register_payment \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Security

- ✅ **User authentication required** - All endpoints use `@user_required` decorator
- ✅ **User isolation** - Can only register payments for own matches
- ✅ **Duplicate prevention** - Checks if payment already registered
- ✅ **Audit trail** - Records who registered the payment and when

## Benefits

1. **Automation** - Register payments automatically after matching
2. **Traceability** - External reference links payment to match
3. **Accuracy** - Uses actual transaction date and amount
4. **Efficiency** - Bulk registration for multiple invoices
5. **Safety** - Prevents duplicate registrations

## Next Steps

Consider adding:
1. **Webhook** - Auto-register payments when match is approved
2. **Scheduled job** - Batch register all approved matches daily
3. **Notification** - Email user when payments are registered
4. **Rollback** - Ability to cancel/reverse a payment registration
