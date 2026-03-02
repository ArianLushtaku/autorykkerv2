# SMS Reminder Configuration

## Overview
The reminder automation system can now send SMS messages to customers via the Dinero API when sending reminders.

## Database Setup

Run the migration to add SMS settings:
```bash
# Apply migration via Supabase dashboard SQL editor
supabase/migrations/20241130_add_sms_settings.sql
```

This adds the following columns to `automation_settings`:
- `sms_enabled` (boolean) - Enable/disable SMS sending
- `sms_prereminder_template` (text) - Template for pre-reminders (Påmindelse)
- `sms_reminder_template` (text) - Template for reminders (Rykker 1/2/3)
- `company_name` (text) - Company name for SMS signature

## SMS Templates

### Available Variables
Templates support the following placeholders:
- `{customer_name}` - Customer name
- `{invoice_number}` - Invoice number
- `{amount}` - Invoice amount (formatted as "XXX,XX DKK")
- `{company_name}` - Company name from settings
- `[link-to-pdf]` - Invoice PDF link (automatically added by Dinero)

### Default Pre-Reminder Template (Påmindelse)
```
Kære {customer_name}

Vi må desværre konstatere, at vi ikke har modtaget vores tilgodehavende på {amount} i henhold til faktura {invoice_number}.

Vi skal derfor bede dig om at indbetale vores tilgodehavende hurtigst muligt.

Klik på linket herunder for at downloade fakturaen.
[link-to-pdf]

Med venlig hilsen
{company_name}
```

### Default Reminder Template (Rykker 1/2/3)
```
RYKKER - Kære {customer_name}

Vi har endnu ikke modtaget betaling for faktura {invoice_number} på {amount}.

Dette er en officiel betalingspåmindelse. Vi beder dig indbetale beløbet straks for at undgå yderligere rykkergebyrer.

Download faktura:
[link-to-pdf]

Med venlig hilsen
{company_name}
```

## Configuration

### Enable SMS for a User
```sql
UPDATE automation_settings
SET 
    sms_enabled = true,
    company_name = 'Ebbesens Vinduespolering ApS',
    sms_prereminder_template = 'Your custom template...',
    sms_reminder_template = 'Your custom template...'
WHERE user_id = 'USER_UUID';
```

### Customize Templates
Users can customize templates in the `automation_settings` table. If no custom template is provided, the default templates from `DineroSMSService` will be used.

## How It Works

1. **Email Reminder Sent First**
   - The system sends the email reminder via Dinero API
   - This is the primary reminder method

2. **SMS Sent After Email** (if enabled)
   - Checks if `sms_enabled = true` in automation settings
   - Gets customer phone number from invoice (`contact_phone`)
   - Skips SMS if no phone number available
   - Formats message using template and variables
   - Sends SMS via Dinero API: `POST /v1/{organizationId}/sms/{voucherGuid}/send-sms`

3. **Pre-Reminder vs Reminder**
   - **Pre-Reminder (Påmindelse)**: `isReminder = false`
   - **Reminder (Rykker 1/2/3)**: `isReminder = true`

## API Endpoint

The SMS is sent to:
```
POST https://api.dinero.dk/v1/{organizationId}/sms/{voucherGuid}/send-sms
```

Request body:
```json
{
  "receiverPhoneNumber": "+4512345678",
  "receiverName": "Customer Name",
  "timestamp": "2024-01-15T10:30:00Z",
  "isReminder": true,
  "message": "Your formatted message with [link-to-pdf]"
}
```

## Important Notes

### SMS Costs
- SMS sending has **special terms and conditions**
- Usage will be **invoiced by Dinero**
- By using the API, you accept Dinero's SMS terms

### Phone Number Requirement
- SMS will only be sent if the customer has a phone number in Dinero
- The phone number comes from `invoices.contact_phone` field
- If no phone number exists, the SMS is skipped (logged as warning)

### Invoice Requirements
- Invoice must be **booked** before SMS can be sent
- The system sends email first, then SMS
- Both use the same Dinero access token

## Testing

### Test SMS for a Single User
```bash
# Enable SMS for test user
UPDATE automation_settings
SET sms_enabled = true, company_name = 'Test Company'
WHERE user_id = 'YOUR_USER_ID';

# Run reminder automation
python3 invoice_reminder_automation.py --user-id YOUR_USER_ID
```

### Check Logs
Look for these log messages:
```
📱 Sending SMS to Customer Name (+4512345678) for invoice GUID
   IsReminder: true/false
   Message preview: Kære Customer Name...
✅ SMS sent successfully to +4512345678
```

## Error Handling

The system handles SMS errors gracefully:
- ❌ No phone number → Warning logged, email still sent
- ❌ SMS API error → Error logged, email still sent
- ❌ Invalid template → Uses default template
- ❌ Missing company name → Uses "Vores firma" as fallback

**SMS failures do NOT prevent email reminders from being sent.**

## Files Modified

1. **`dinero_sms_service.py`** (NEW)
   - Service class for sending SMS via Dinero API
   - Template formatting with variables
   - Default templates

2. **`invoice_reminder_automation.py`**
   - Added `_send_sms_reminder()` method
   - Integrated SMS sending after email reminders
   - Checks `sms_enabled` setting

3. **`supabase/migrations/20241130_add_sms_settings.sql`** (NEW)
   - Adds SMS columns to `automation_settings` table
   - Sets default templates for existing users

## Future Enhancements

Potential improvements:
- [ ] SMS-only mode (skip email, send SMS only)
- [ ] SMS delivery status tracking
- [ ] SMS cost tracking per user
- [ ] A/B testing different SMS templates
- [ ] SMS scheduling (send at specific time)
- [ ] SMS character count validation
- [ ] Multi-language SMS templates
