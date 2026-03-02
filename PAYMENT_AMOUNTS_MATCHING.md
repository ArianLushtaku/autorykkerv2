# Payment Amounts Matching Implementation

## Overview

The invoice matcher now uses the `invoice_payment_amounts` table which contains an `all_valid_amounts` array. This array holds all valid payment amounts for an invoice, including the original amount and amounts with reminder fees.

## Array Structure: `all_valid_amounts`

```json
["400.00", "502.11", "603.75"]
```

**Index meanings:**
- **Index 0**: Original invoice amount (400.00 DKK)
- **Index 1**: Invoice + Rykker 1 fee (502.11 DKK = 400 + 102.11 fee)
- **Index 2**: Invoice + Rykker 2 fee (603.75 DKK = 400 + 203.75 total fees)
- **Index 3+**: Additional reminder levels if applicable

## How Matching Works

### Example 1: Original Amount Paid
```
Transaction: 400.00 DKK
Invoice #1234 all_valid_amounts: ["400.00", "502.11", "603.75"]

Match check:
- 400.00 == all_valid_amounts[0] ✅
- Result: "exact amount"
- Status: Original invoice paid, no reminder
```

### Example 2: Rykker 1 Paid
```
Transaction: 502.11 DKK
Invoice #1234 all_valid_amounts: ["400.00", "502.11", "603.75"]

Match check:
- 502.11 != all_valid_amounts[0] ❌
- 502.11 == all_valid_amounts[1] ✅
- Fee: 502.11 - 400.00 = 102.11 DKK
- Result: "amount + 102.11 DKK (Rykker 1 paid)"
- Status: Rykker 1 paid, Rykker 2 not sent/paid
```

### Example 3: Rykker 2 Paid
```
Transaction: 603.75 DKK
Invoice #1234 all_valid_amounts: ["400.00", "502.11", "603.75"]

Match check:
- 603.75 != all_valid_amounts[0] ❌
- 603.75 != all_valid_amounts[1] ❌
- 603.75 == all_valid_amounts[2] ✅
- Fee: 603.75 - 400.00 = 203.75 DKK
- Result: "amount + 203.75 DKK (Rykker 2 paid)"
- Status: Rykker 2 paid
```

## Code Implementation

### 1. New Dataclass: `PaymentAmounts`

```python
@dataclass
class PaymentAmounts:
    """Payment amounts from invoice_payment_amounts table"""
    invoice_id: str
    invoice_number: str
    all_valid_amounts: List[float]  # Array of valid payment amounts
```

### 2. Updated `_amounts_match()` Method

```python
def _amounts_match(self, transaction_amount: float, invoice: Invoice):
    # Look up payment amounts for this invoice
    if invoice.invoice_number not in self.payment_amounts_by_invoice:
        # Fall back to simple exact match
        return (True, "exact amount") if abs(transaction_amount - invoice.total_incl_vat) <= 1.0 else (False, "")
    
    payment_amounts = self.payment_amounts_by_invoice[invoice.invoice_number]
    
    # Check each amount in the all_valid_amounts array
    for index, valid_amount in enumerate(payment_amounts.all_valid_amounts):
        if abs(transaction_amount - valid_amount) <= 1.0:
            if index == 0:
                return (True, "exact amount")
            else:
                # Calculate fee and reminder level
                original_amount = payment_amounts.all_valid_amounts[0]
                fee = valid_amount - original_amount
                reminder_level = index  # 1 = Rykker 1, 2 = Rykker 2
                return (True, f"amount + {fee:.2f} DKK (Rykker {reminder_level} paid)")
    
    return (False, "")
```

### 3. CSV Loader: `_load_payment_amounts()`

```python
def _load_payment_amounts(self, filepath: str) -> List[PaymentAmounts]:
    # Reads CSV with columns: invoice_id, invoice_number, all_valid_amounts
    # Parses JSON array string: '["400.00","502.11","603.75"]'
    # Returns list of PaymentAmounts objects
```

## Database Table: `invoice_payment_amounts`

**Expected columns:**
- `invoice_id` (UUID)
- `invoice_number` (TEXT)
- `all_valid_amounts` (JSONB or TEXT) - Array of decimal strings

**Example row:**
```
invoice_id: "abc-123-def"
invoice_number: "1234"
all_valid_amounts: ["400.00", "502.11", "603.75"]
```

## Usage

### Export from Supabase to CSV

```sql
COPY (
  SELECT invoice_id, invoice_number, all_valid_amounts::text
  FROM invoice_payment_amounts
  WHERE user_id = 'your-user-id'
) TO '/path/to/invoice_payment_amounts.csv' WITH CSV HEADER;
```

### Run the Matcher

```python
# In invoice_matcher_v2.py main()
payment_amounts_file = '/Users/arianlushtaku/Desktop/saas/csv/invoice_payment_amounts.csv'

matcher = InvoiceMatcherV2(
    contacts_file='...',
    transactions_file='...',
    invoices_file='...',
    payment_amounts_file=payment_amounts_file  # Add this!
)
```

## Benefits Over Previous Approach

✅ **Simpler**: Single array instead of multiple reminder records  
✅ **Faster**: One lookup per invoice instead of iterating through reminders  
✅ **Clearer**: Array index directly maps to reminder level  
✅ **Flexible**: Easy to add more reminder levels (just append to array)  
✅ **Accurate**: Shows exact reminder level paid (Rykker 1, 2, etc.)

## Match Output Examples

**Before (without payment amounts):**
```
Transaction: 502.11 DKK
Invoice #1234: 400.00 DKK
Result: ❌ Amount mismatch
```

**After (with payment amounts):**
```
Transaction: 502.11 DKK
Invoice #1234: 400.00 DKK
Payment amounts: [400.00, 502.11, 603.75]
Result: ✅ Matched! "amount + 102.11 DKK (Rykker 1 paid)"
```

## Performance

**Memory usage:**
- 1,000 invoices × 3 amounts avg = ~30 KB
- 10,000 invoices × 3 amounts avg = ~300 KB
- Negligible memory footprint

**Lookup speed:**
- O(1) dictionary lookup by invoice_number
- O(n) linear search through amounts array (typically 2-4 items)
- Effectively instant for all practical purposes

## Next Steps

1. **Populate table**: Ensure `invoice_payment_amounts` table has data
2. **Export to CSV**: Export the table for the matcher
3. **Update matcher**: Set `payment_amounts_file` path in `main()`
4. **Test**: Run matcher and verify reminder fee matches work
5. **Monitor**: Check match rate improvement (should jump significantly!)
