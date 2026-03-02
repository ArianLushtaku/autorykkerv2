#!/usr/bin/env python3
"""
Export overdue invoice analysis to CSV
Shows exactly what the reminder automation sees
"""

import os
import csv
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv(Path(__file__).parent / '.env')

supabase = create_client(
    os.environ['SUPABASE_URL'],
    os.environ['SUPABASE_SERVICE_ROLE_KEY']
)

user_id = 'a422f931-51a8-42de-bdaa-879561ce63f7'

print("📋 Fetching overdue unpaid invoices...")

# Fetch all unpaid invoices
response = supabase.table('invoices') \
    .select('id, invoice_number, contact_name, total_incl_vat, '
           'issue_date, payment_date, status, latest_mail_out_type') \
    .eq('user_id', user_id) \
    .in_('status', ['Booked', 'Overdue']) \
    .not_.is_('payment_date', 'null') \
    .execute()

invoices = response.data
print(f"✅ Found {len(invoices)} unpaid invoices")

# Calculate overdue and get reminder counts
today = datetime.now(timezone.utc).date()
results = []

for inv in invoices:
    # Parse dates
    issue_date = datetime.fromisoformat(inv['issue_date'].replace('Z', '+00:00')).date()
    payment_date = datetime.fromisoformat(inv['payment_date'].replace('Z', '+00:00')).date()
    
    # Calculate days overdue
    days_overdue = (today - payment_date).days
    
    # Only include overdue invoices
    if days_overdue <= 0:
        continue
    
    # Get reminder count
    reminder_response = supabase.table('invoice_reminders') \
        .select('reminder_number') \
        .eq('user_id', user_id) \
        .eq('invoice_id', inv['id']) \
        .order('reminder_number', desc=True) \
        .limit(1) \
        .execute()
    
    reminder_count = reminder_response.data[0]['reminder_number'] if reminder_response.data else 0
    
    # Get automation settings for timing (default Danish rules)
    # In production, this would be loaded per user from automation_settings table
    pre_reminder_days = 3
    rykker_1_days = 10
    rykker_2_days = 10
    rykker_3_days = 10
    
    # Determine current stage and next action
    # Dinero naming: MailOut → PreReminder (Påmindelse) → Reminder (Rykker 1/2/3)
    # reminder_number tells us WHICH Rykker was sent (1, 2, or 3)
    # BUT: invoice_reminders table might not be synced, so fallback to latest_mail_out_type
    
    latest_mail = inv.get('latest_mail_out_type', 'MailOut')
    
    if reminder_count > 0:
        # We have accurate data from invoice_reminders table
        if reminder_count == 1:
            current_stage = "Rykker 1"
            next_action = "Rykker 2"
            # Next action date: due_date + pre_reminder_days + rykker_1_days
            next_action_date = payment_date + timedelta(days=pre_reminder_days + rykker_1_days)
        elif reminder_count == 2:
            current_stage = "Rykker 2"
            next_action = "Rykker 3"
            # Next action date: due_date + pre_reminder_days + rykker_1_days + rykker_2_days
            next_action_date = payment_date + timedelta(days=pre_reminder_days + rykker_1_days + rykker_2_days)
        elif reminder_count == 3:
            current_stage = "Rykker 3"
            next_action = "Inkasso"
            # Already at Rykker 3, move to inkasso immediately
            next_action_date = today
        else:
            current_stage = f"Rykker {reminder_count}"
            next_action = f"Already in Inkasso ({reminder_count} reminders sent)"
            next_action_date = today
    else:
        # No data in invoice_reminders, fallback to latest_mail_out_type
        if latest_mail == 'Reminder':
            # Dinero says reminder sent, but we don't know which one
            # Assume at least Rykker 1
            current_stage = "Rykker 1+ (unsynced)"
            next_action = "Sync invoice_reminders!"
            next_action_date = None  # Can't calculate without knowing which reminder
        elif latest_mail == 'PreReminder':
            # Påmindelse sent
            current_stage = "Påmindelse"
            next_action = "Rykker 1"
            # Next action date: due_date + pre_reminder_days + rykker_1_days
            next_action_date = payment_date + timedelta(days=pre_reminder_days + rykker_1_days)
        else:
            # MailOut or unknown
            current_stage = "Original Invoice"
            next_action = "PreReminder (Påmindelse)"
            # Next action date: due_date + pre_reminder_days
            next_action_date = payment_date + timedelta(days=pre_reminder_days)
    
    # Determine if we should send NOW
    should_send_now = next_action_date is not None and today >= next_action_date
    
    results.append({
        'invoice_number': inv['invoice_number'],
        'contact_name': inv['contact_name'],
        'amount': float(inv['total_incl_vat']),
        'issue_date': issue_date.isoformat(),
        'due_date': payment_date.isoformat(),
        'today': today.isoformat(),
        'days_overdue': days_overdue,
        'status': inv['status'],
        'latest_mail_out_type': latest_mail,
        'reminder_number': reminder_count,
        'current_stage': current_stage,
        'next_action': next_action,
        'next_action_date': next_action_date.isoformat() if next_action_date else 'N/A',
        'should_send_now': 'YES' if should_send_now else 'NO'
    })

# Sort by days overdue (most overdue first)
results.sort(key=lambda x: x['days_overdue'], reverse=True)

print(f"✅ Found {len(results)} overdue invoices")

# Export to CSV
csv_file = Path(__file__).parent / 'overdue_invoices_analysis.csv'

with open(csv_file, 'w', newline='', encoding='utf-8') as f:
    if results:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

print(f"✅ Exported to: {csv_file}")
print(f"\nTop 10 most overdue:")
print("-" * 170)
print(f"{'Invoice':<10} {'Customer':<25} {'Days':<6} {'R#':<4} {'Current Stage':<20} {'Next Action':<25} {'Next Date':<12} {'Send?':<6}")
print("-" * 170)

for inv in results[:10]:
    print(f"{inv['invoice_number']:<10} "
          f"{inv['contact_name'][:23]:<25} "
          f"{inv['days_overdue']:<6} "
          f"{inv['reminder_number']:<4} "
          f"{inv['current_stage']:<20} "
          f"{inv['next_action']:<25} "
          f"{inv['next_action_date']:<12} "
          f"{inv['should_send_now']:<6}")

print("-" * 170)
print(f"\n📊 Summary:")
print(f"   Total overdue: {len(results)}")
print(f"   Should send NOW: {len([r for r in results if r['should_send_now'] == 'YES'])}")
print(f"   ")
print(f"   Need PreReminder (Påmindelse): {len([r for r in results if r['reminder_number'] == 0])}")
print(f"   Need Rykker 1: {len([r for r in results if r['reminder_number'] == 1])}")
print(f"   Need Rykker 2: {len([r for r in results if r['reminder_number'] == 2])}")
print(f"   Need Rykker 3: {len([r for r in results if r['reminder_number'] == 3])}")
print(f"   Already in Inkasso: {len([r for r in results if r['reminder_number'] >= 4])}")
print(f"\n✅ Full data exported to: {csv_file}")
