# Manual Review & Learning System

## Overview

The Manual Review System tracks unmatched transactions and learns from manual reviews to improve future automatic matching. When you manually match a transaction to an invoice (e.g., son paying for father), the system stores that pattern and uses it for future automatic matching.

## Database Tables

### `unmatched_transactions`
Tracks bank transactions that couldn't be automatically matched to invoices.

**Columns:**
- `transaction_id`: Reference to bank transaction
- `transaction_date`, `transaction_amount`, `transaction_reference`, `transaction_debtor_name`: Transaction details
- `status`: `pending`, `under_review`, `resolved`, `ignored`
- `matched_invoice_id`, `matched_invoice_number`: If manually matched
- `review_notes`: Notes from manual review
- `reviewed_at`, `reviewed_by`: Audit trail

### `manual_match_rules`
Stores learned matching patterns from manual reviews.

**Columns:**
- `transaction_debtor_name`: Name on bank transaction (e.g., "John Doe")
- `invoice_contact_id`: Dinero contact GUID to match to (e.g., "Father Doe")
- `invoice_contact_name`: Contact name for display
- `confidence`: Match confidence (default 0.95)
- `times_used`: How many times this rule has been applied
- `last_used_at`: When rule was last used
- `created_from_transaction_id`, `created_from_invoice_id`: Original manual match

## How It Works

### 1. **Automatic Matching**
Invoice matcher tries multiple strategies:
1. Invoice number extraction
2. Address-based matching
3. Name matching
4. Fuzzy name matching
5. Combined invoice payment
6. **Manual rules** (learned patterns) ← NEW!

### 2. **Unmatched Tracking**
Transactions that don't match are saved to `unmatched_transactions`:
```
📋 Tracking unmatched transactions...
✅ Tracked 15 unmatched transactions for manual review
```

### 3. **Manual Review Workflow**

#### Step 1: View Unmatched Transactions
```sql
SELECT * FROM unmatched_transactions 
WHERE user_id = 'xxx' AND status = 'pending'
ORDER BY transaction_date DESC;
```

#### Step 2: Manual Match
User reviews transaction and matches it to correct invoice:
- Transaction: "John Doe" paying 500 DKK
- Invoice: #12345 for "Father Doe" (500 DKK)

#### Step 3: Create Manual Rule
```sql
INSERT INTO manual_match_rules (
    user_id,
    transaction_debtor_name,
    invoice_contact_id,
    invoice_contact_name,
    created_by,
    created_from_transaction_id,
    created_from_invoice_id
) VALUES (
    'user-id',
    'John Doe',
    'contact-guid-for-father',
    'Father Doe',
    'user-id',
    'transaction-id',
    'invoice-guid'
);
```

#### Step 4: Update Unmatched Transaction
```sql
UPDATE unmatched_transactions SET
    status = 'resolved',
    matched_invoice_id = 'invoice-guid',
    matched_invoice_number = '12345',
    match_confidence = 0.95,
    reviewed_at = NOW(),
    reviewed_by = 'user-id',
    review_notes = 'Son paying for father'
WHERE id = 'unmatched-transaction-id';
```

#### Step 5: Create Invoice Match
```sql
INSERT INTO invoice_matches (
    user_id,
    transaction_id,
    transaction_date,
    transaction_amount,
    invoice_id,
    invoice_number,
    invoice_amount,
    confidence,
    match_reason,
    match_type,
    status
) VALUES (
    'user-id',
    'transaction-id',
    '2025-11-27',
    500.00,
    'invoice-guid',
    '12345',
    500.00,
    0.95,
    'Manual match: John Doe → Father Doe',
    'manual_rule',
    'pending'
);
```

### 4. **Future Automatic Matching**
Next time "John Doe" makes a payment:
1. Matcher tries all automatic strategies (fail)
2. Matcher checks manual rules
3. Finds rule: "John Doe" → "Father Doe"
4. Automatically matches to Father Doe's invoices
5. Updates rule usage stats:
   ```sql
   UPDATE manual_match_rules SET
       times_used = times_used + 1,
       last_used_at = NOW()
   WHERE id = 'rule-id';
   ```

## Matching Priority

```
1. Invoice Number (HIGHEST)
   ↓
2. Address-based
   ↓
3. Name matching
   ↓
4. Fuzzy name
   ↓
5. Combined invoices
   ↓
6. Manual rules (LAST RESORT)
   ↓
7. Unmatched → Manual review
```

Manual rules are checked **last** because they're learned patterns and should only be used when all automatic methods fail.

## API Endpoints (To Be Implemented)

### Get Unmatched Transactions
```
GET /api/unmatched-transactions
Response: List of unmatched transactions with status
```

### Manual Match Transaction
```
POST /api/unmatched-transactions/{id}/match
Body: {
    "invoice_id": "invoice-guid",
    "invoice_number": "12345",
    "create_rule": true,
    "notes": "Son paying for father"
}
```

### Get Manual Rules
```
GET /api/manual-match-rules
Response: List of learned matching rules with usage stats
```

### Delete Manual Rule
```
DELETE /api/manual-match-rules/{id}
```

## Benefits

### 1. **Zero Transaction Loss**
Every transaction is accounted for - either matched or tracked for review.

### 2. **Learning System**
System gets smarter over time as you review edge cases.

### 3. **Audit Trail**
Complete history of manual reviews and learned patterns.

### 4. **Reduced Manual Work**
Once you review "John paying for Father" once, it's automatic forever.

## Example Scenarios

### Scenario 1: Son Paying for Father
- **Transaction**: "John Doe" pays 500 DKK
- **Invoice**: #12345 for "Father Doe" (500 DKK)
- **Manual Review**: Match John → Father
- **Rule Created**: "John Doe" → "Father Doe" (contact_guid)
- **Future**: All John Doe payments automatically match to Father Doe

### Scenario 2: Company Payment from Different Account
- **Transaction**: "ABC Holding" pays 1000 DKK
- **Invoice**: #67890 for "ABC Company" (1000 DKK)
- **Manual Review**: Match ABC Holding → ABC Company
- **Rule Created**: "ABC Holding" → "ABC Company"
- **Future**: ABC Holding payments automatically match to ABC Company

### Scenario 3: Nickname vs Legal Name
- **Transaction**: "Mike's Shop" pays 250 DKK
- **Invoice**: #11111 for "Michael's Workshop ApS" (250 DKK)
- **Manual Review**: Match Mike's Shop → Michael's Workshop
- **Rule Created**: "Mike's Shop" → "Michael's Workshop ApS"
- **Future**: Mike's Shop payments automatically match

## Statistics

### Unmatched Transaction Stats
```sql
SELECT * FROM unmatched_transaction_stats WHERE user_id = 'xxx';
```
Returns:
- `total_unmatched`: Total unmatched transactions
- `pending_review`: Awaiting manual review
- `under_review`: Currently being reviewed
- `resolved`: Successfully matched
- `ignored`: Marked as ignore (refunds, etc.)
- `total_unmatched_amount`: Total DKK unmatched

### Manual Rule Stats
```sql
SELECT * FROM manual_match_rule_stats WHERE user_id = 'xxx';
```
Returns:
- `total_rules`: Total learned rules
- `active_rules`: Rules that have been used
- `unused_rules`: Rules never used yet
- `total_matches_from_rules`: Total automatic matches from rules
- `last_rule_used_at`: Most recent rule usage

## Best Practices

### 1. **Review Regularly**
Check unmatched transactions weekly to keep the queue manageable.

### 2. **Add Notes**
Always add notes when creating rules to remember why the match was made.

### 3. **Verify Rules**
Periodically review `times_used` to ensure rules are working correctly.

### 4. **Delete Bad Rules**
If a rule causes incorrect matches, delete it immediately.

### 5. **Ignore Refunds**
Mark refund transactions as `ignored` so they don't clutter the review queue.

## Implementation Checklist

- [x] Database tables created
- [x] Migration applied
- [x] Matcher loads manual rules
- [x] Matcher uses manual rules as last fallback
- [x] Matcher tracks unmatched transactions
- [x] Rule usage stats updated automatically
- [ ] API endpoints for manual review
- [ ] Frontend UI for manual review
- [ ] Rule management UI
- [ ] Bulk review actions
- [ ] Export unmatched transactions to CSV

## Future Enhancements

1. **Smart Suggestions**: AI-powered suggestions for manual matches
2. **Bulk Actions**: Match multiple transactions at once
3. **Rule Patterns**: Support regex patterns for transaction references
4. **Confidence Adjustment**: Allow users to adjust rule confidence
5. **Rule Expiration**: Auto-disable rules not used in 6 months
6. **Conflict Detection**: Warn if multiple rules could match same transaction
