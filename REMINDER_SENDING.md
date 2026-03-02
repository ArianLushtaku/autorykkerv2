# Invoice Reminder Sending Implementation

## Overview

The Invoice Reminder Automation system now **actually sends reminders** via the Dinero API, following Danish debt collection rules.

## Features Implemented

### ✅ Dinero API Integration

#### Pre-reminder (Påmindelse) - 1 Step
- Sent via `/v1/{organizationId}/invoices/{guid}/email/pre-reminder`
- Simple single API call

#### Reminders (Rykker 1/2/3) - 3 Steps
Sending a Rykker requires 3 separate API calls:

1. **Add Reminder** (Create draft)
   - `POST /v1/{organizationId}/invoices/{voucherGuid}/reminders`
   - Creates reminder with title, description, fees
   - Returns reminder ID and timestamp

2. **Book Reminder** (Make it official)
   - `POST /v1/{organizationId}/invoices/{voucherGuid}/reminders/{id}/book`
   - Books the draft reminder
   - Returns updated timestamp

3. **Send Email** (Actually send it)
   - `POST /v1/{organizationId}/invoices/{voucherGuid}/reminders/email`
   - Sends the booked reminder via email
   - Includes PDF attachment

- **PDF Attachment**: All reminders include invoice PDF (`addVoucherAsPdfAttachment: true`)
- **Token Management**: Automatic token refresh when expired
- **Error Handling**: Comprehensive error logging and recovery at each step

### ✅ Reminder Details

#### Step 1: Add Reminder Payload
```json
{
  "timestamp": "",
  "date": "2025-11-26",
  "title": "Rykker 1",
  "description": "Vedr. vort tilgodehavende i henhold til faktura 12345 af fakturadato 15-10-2025\n\nVi kan desværre konstatere, at vi ikke har modtaget betaling af vort tilgodehavende i henhold til ovennævnte faktura. Vi skal derfor venligst bede dig om at indbetale vort tilgodehavende så hurtigt som muligt til nedenstående bankkonto.",
  "withDebtCollectionWarning": false,
  "withFee": true,
  "withInterestFee": true,
  "withCompensationFee": true
}
```

- **title**: "Rykker 1", "Rykker 2", or "Rykker 3"
- **description**: Danish text with invoice number and issue date
- **withDebtCollectionWarning**: `true` only for Rykker 3
- **withFee/withInterestFee/withCompensationFee**: All `true`

#### Step 2: Book Reminder Payload
```json
{
  "timestamp": "2025-11-26T12:34:56Z"
}
```
Uses timestamp from Step 1 response.

#### Step 3: Send Email Payload
```json
{
  "timestamp": null,
  "addVoucherAsPdfAttachment": true,
  "shouldAddTrustPilotEmailAsBcc": false
}
```

- **timestamp**: `null` - Always use latest version
- **addVoucherAsPdfAttachment**: `true` - Attach PDF to email
- **shouldAddTrustPilotEmailAsBcc**: `false` - No TrustPilot tracking

All other fields (sender, receiver, subject, message) use Dinero's defaults.

## How It Works

### 1. **Analyze Overdue Invoices**
```python
automation = InvoiceReminderAutomation(supabase, user_id)
results = automation.process_reminders(dry_run=False)
```

### 2. **Determine Next Reminder Stage**
Based on:
- Days overdue
- Reminder count from `invoice_reminders` table
- User's timing rules from `automation_settings`

### 3. **Send via Dinero API**
- Get valid access token (auto-refresh if needed)
- Call appropriate Dinero endpoint (pre-reminder or reminder)
- Log success/failure
- Update token in database if refreshed

### 4. **Track in Database**
- Reminder will appear in `invoice_reminders` table after next Dinero sync
- `latest_mail_out_type` in `invoices` table will be updated
- No manual database updates needed - Dinero is source of truth

## Reminder Flow

```
Original Invoice (MailOut)
         ↓ 3 days overdue
PreReminder (Påmindelse) ← send_pre_reminder()
         ↓ 10 days later (13 days overdue)
Rykker 1 ← send_reminder()
         ↓ 10 days later (23 days overdue)
Rykker 2 ← send_reminder()
         ↓ 10 days later (33 days overdue)
Rykker 3 ← send_reminder()
         ↓ After Rykker 3
Inkasso Queue
```

## API Methods

### `DineroService.send_pre_reminder(access_token, organization_id, invoice_guid)`
Sends a pre-reminder (Påmindelse) for an overdue invoice.

**Parameters:**
- `access_token`: Valid Dinero access token
- `organization_id`: Dinero organization ID
- `invoice_guid`: GUID of the invoice

**Returns:** Response dict from Dinero API

**Raises:** `requests.exceptions.HTTPError` if API call fails

### `DineroService.send_reminder(access_token, organization_id, invoice_guid, invoice_number, invoice_issue_date, reminder_number, timestamp=None)`
Sends a reminder (Rykker 1/2/3) for an overdue invoice using the 3-step process.

**Parameters:**
- `access_token`: Valid Dinero access token
- `organization_id`: Dinero organization ID
- `invoice_guid`: GUID of the invoice
- `invoice_number`: Invoice number (for description)
- `invoice_issue_date`: Invoice issue date (datetime object)
- `reminder_number`: Which reminder (1, 2, or 3)
- `timestamp`: Optional timestamp for validation (defaults to None)

**Returns:** Dict with:
```python
{
    "success": True,
    "reminder_id": 12345,
    "reminder_number": 1,
    "timestamp": "2025-11-26T12:34:56Z"
}
```

**Raises:** `requests.exceptions.HTTPError` if any of the 3 API calls fail

**Process:**
1. Adds reminder draft with Danish description
2. Books the reminder to make it official
3. Sends email with PDF attachment

## Usage Examples

### Dry Run (Test Mode)
```python
from supabase import create_client
from invoice_reminder_automation import InvoiceReminderAutomation

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
automation = InvoiceReminderAutomation(supabase, user_id)

# Analyze what would be sent without actually sending
results = automation.process_reminders(dry_run=True)

print(f"Would send {results['reminders_to_send']} reminders")
```

### Live Mode (Actually Send)
```python
# Send reminders for real
results = automation.process_reminders(dry_run=False)

print(f"Sent {results['reminders_sent']} reminders")
print(f"Moved {results['moved_to_inkasso']} to inkasso")
print(f"Errors: {results['errors']}")
```

### Test Script
```bash
cd /Users/arianlushtaku/Desktop/saas/autorykker-v2/backend
python3 test_reminder_automation.py
```

## Logging

Every step is logged with detailed information:

```
🤖 Initialized InvoiceReminderAutomation for user a422f931-51a8-42de-bdaa-879561ce63f7
   Settings: PreReminder=3d, Rykker1=10d, Rykker2=10d, Rykker3=10d

📊 Analyzing 324 overdue invoices...
   ✅ Invoice 60: Ready for Rykker 3 (487 days)
   ⏳ Invoice 10308: Too early for PreReminder

✅ Analysis complete: 288 actions needed
   PreReminders: 88
   Rykker 1: 31
   Rykker 2: 202
   Rykker 3: 3

📤 Sending reminders...
📧 Sending Rykker3 for invoice 60
   Customer: Line stjernholm
   Amount: 199.0 DKK
   Days overdue: 487
   📨 Sending Rykker 3 via Dinero API (3-step process)
   Step 1/3: Adding Rykker 3 draft for invoice abc-123-def
   ✅ Reminder draft created with ID: 12345
   Step 2/3: Booking Rykker 3 (ID: 12345)
   ✅ Reminder booked successfully
   Step 3/3: Sending Rykker 3 email
   ✅ Rykker 3 sent successfully for invoice abc-123-def
   ✅ Successfully sent Rykker3
   💾 Reminder will be recorded in invoice_reminders after next Dinero sync
```

For PreReminders (simpler, single-step):
```
📧 Sending PreReminder for invoice 10308
   Customer: Lasse Bækvad-hansen
   Amount: 459.0 DKK
   Days overdue: 7
   📨 Sending PreReminder (Påmindelse) via Dinero API
   ✅ Pre-reminder sent successfully for invoice xyz-456-abc
   ✅ Successfully sent PreReminder
   💾 Reminder will be recorded in invoice_reminders after next Dinero sync
```

## Error Handling

### Token Expiration
- Automatically refreshes token before sending
- Updates token in database
- Retries request with new token

### API Errors
- Logs full error details
- Continues with next invoice
- Returns error count in results

### Missing Data
- Validates user has Dinero organization configured
- Checks invoice has `dinero_guid`
- Skips invoices with missing data

## Database Tables

### `invoice_reminders`
Tracks reminders sent per invoice (populated by Dinero sync):
- `reminder_number`: 1, 2, 3 (Rykker 1, 2, 3)
- `reminder_title`: "Rykker 1", "Rykker 2", "Rykker 3"
- `reminder_date`: When reminder was sent

### `invoices`
Updated by Dinero sync after reminder sent:
- `latest_mail_out_type`: "PreReminder" or "Reminder"
- `mail_out_status`: "Sent"

### `inkasso_queue`
Invoices moved to debt collection after Rykker 3:
- Full invoice and customer details
- Days overdue
- Status tracking

## Next Steps

1. **Test in Dry Run Mode**: Verify logic is correct
2. **Send First Batch**: Start with small batch in live mode
3. **Monitor Results**: Check Dinero for sent reminders
4. **Run Dinero Sync**: Update `invoice_reminders` table
5. **Verify Tracking**: Confirm reminder counts are correct
6. **Schedule Automation**: Set up cron job for daily runs

## Configuration

Timing rules are stored in `automation_settings` table per user:
- `pre_reminder_days_after_due`: 3 (default)
- `rykker_1_days_after_pre`: 10 (default)
- `rykker_2_days_after_rykker_1`: 10 (default)
- `rykker_3_days_after_rykker_2`: 10 (default)
- `auto_inkasso_enabled`: true (default)

## Important Notes

⚠️ **Reminder Tracking**: The `invoice_reminders` table is populated by the Dinero sync, NOT by this script. After sending a reminder, you must run a Dinero sync to update the tracking.

⚠️ **Testing**: Always test in dry-run mode first to verify the logic before sending real reminders.

⚠️ **Rate Limiting**: Dinero API has rate limits. For large batches, consider adding delays between requests.

⚠️ **Email Templates**: This uses Dinero's default email templates. Custom templates can be configured in Dinero settings.
