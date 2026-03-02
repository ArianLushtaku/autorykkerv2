"""
Invoice Reminder Automation Service
Handles automatic reminder sending based on user-configured rules

This script ONLY handles reminder sending. It should be called as part of a larger workflow:
1. Invoice sync (done separately)
2. Invoice matcher (done separately)
3. Payment registration (done separately)
4. Invoice sync again (done separately)
5. THIS SCRIPT: Analyze overdue invoices and send reminders

Features:
- Pulls timing rules from automation_settings (user-configurable)
- Uses invoice_reminders table to track reminder history
- Sends reminders via Dinero API
- Moves Rykker 3 cases to inkasso_queue
- Comprehensive logging at every step
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from dinero_service import DineroService
from dinero_sms_service import DineroSMSService

logger = logging.getLogger(__name__)


class ReminderStage(Enum):
    """Reminder stages following Danish debt collection rules"""
    NONE = "none"
    PRE_REMINDER = "PreReminder"
    RYKKER_1 = "Rykker1"
    RYKKER_2 = "Rykker2"
    RYKKER_3 = "Rykker3"
    INKASSO = "Inkasso"


@dataclass
class ReminderDecision:
    """Decision about what reminder action to take"""
    invoice_id: str
    invoice_number: str
    contact_name: str
    amount: float
    days_overdue: int
    current_stage: str
    next_stage: ReminderStage
    should_send: bool
    reason: str
    move_to_inkasso: bool = False


class InvoiceReminderAutomation:
    """
    Automated reminder system with user-configurable timing rules
    
    Features:
    - Comprehensive logging at every step
    - State machine for reminder progression
    - User-configurable timing from automation_settings
    - Automatic inkasso queue management
    - Multi-tenant support
    """
    
    def __init__(self, supabase_client, user_id: str, dinero_service: DineroService = None):
        """
        Initialize reminder automation
        
        Args:
            supabase_client: Supabase client instance
            user_id: User ID to process reminders for
            dinero_service: DineroService instance (optional, will create if not provided)
        """
        self.supabase = supabase_client
        self.user_id = user_id
        self.dinero_service = dinero_service or DineroService()
        
        # Load user profile for Dinero access
        self.user_profile = self._load_user_profile()
        
        # Load user's automation settings
        self.settings = self._load_automation_settings()
        
        logger.info(f"🤖 Initialized InvoiceReminderAutomation for user {user_id}")
        logger.info(f"   Settings: PreReminder={self.settings['pre_reminder_days_after_due']}d, "
                   f"Rykker1={self.settings['rykker_1_days_after_pre']}d, "
                   f"Rykker2={self.settings['rykker_2_days_after_rykker_1']}d, "
                   f"Rykker3={self.settings['rykker_3_days_after_rykker_2']}d")
    
    def _load_user_profile(self) -> Dict:
        """
        Load user profile for Dinero API access
        
        Returns:
            Dict with user profile including Dinero credentials
        """
        logger.debug(f"👤 Loading user profile for {self.user_id}")
        
        try:
            response = self.supabase.table('profiles') \
                .select('*') \
                .eq('id', self.user_id) \
                .single() \
                .execute()
            
            if not response.data:
                raise Exception(f"User profile not found for {self.user_id}")
            
            if not response.data.get('dinero_organization_id'):
                raise Exception(f"User {self.user_id} has no Dinero organization configured")
            
            logger.debug(f"✅ User profile loaded")
            return response.data
            
        except Exception as e:
            logger.error(f"❌ Failed to load user profile: {e}")
            raise
    
    def _load_automation_settings(self) -> Dict:
        """
        Load automation settings for the user
        
        Returns:
            Dict with timing rules and configuration
        """
        logger.debug(f"📋 Loading automation settings for user {self.user_id}")
        
        try:
            response = self.supabase.table('automation_settings') \
                .select('*') \
                .eq('user_id', self.user_id) \
                .single() \
                .execute()
            
            if not response.data:
                logger.warning(f"⚠️  No automation settings found for user {self.user_id}, using defaults")
                return self._get_default_settings()
            
            settings = response.data
            logger.debug(f"✅ Loaded automation settings")
            return settings
            
        except Exception as e:
            logger.error(f"❌ Error loading automation settings: {e}")
            return self._get_default_settings()
    
    def _get_default_settings(self) -> Dict:
        """Get default Danish debt collection timing rules"""
        return {
            'automation_enabled': True,
            # Pre-reminder (Påmindelse)
            'pre_reminder_enabled': True,
            'pre_reminder_days_after_due': 3,
            'pre_reminder_email': True,
            'pre_reminder_sms': False,
            # Rykker 1 (min 10 days per Danish law)
            'rykker_1_enabled': True,
            'rykker_1_days_after_pre': 10,
            'rykker_1_email': True,
            'rykker_1_sms': False,
            # Rykker 2 (min 10 days per Danish law)
            'rykker_2_enabled': True,
            'rykker_2_days_after_rykker_1': 10,
            'rykker_2_email': True,
            'rykker_2_sms': False,
            # Rykker 3 (min 10 days per Danish law)
            'rykker_3_enabled': True,
            'rykker_3_days_after_rykker_2': 10,
            'rykker_3_email': True,
            'rykker_3_sms': False,
            # Inkasso
            'auto_inkasso_enabled': True
        }
    
    def get_overdue_unpaid_invoices(self) -> List[Dict]:
        """
        Fetch all overdue unpaid invoices for the user
        
        Returns:
            List of invoice dicts with relevant fields
        """
        logger.info(f"📋 Fetching overdue unpaid invoices for user {self.user_id}")
        
        try:
            response = self.supabase.table('invoices') \
                .select('id, dinero_guid, invoice_number, contact_name, contact_guid, '
                       'total_incl_vat, issue_date, payment_date, status, '
                       'latest_mail_out_type, mail_out_status') \
                .eq('user_id', self.user_id) \
                .in_('status', ['Booked', 'Overdue']) \
                .not_.is_('payment_date', 'null') \
                .execute()
            
            invoices = response.data
            
            # Filter to only overdue invoices
            today = datetime.now(timezone.utc).date()
            overdue_invoices = []
            
            for inv in invoices:
                payment_date = datetime.fromisoformat(inv['payment_date'].replace('Z', '+00:00')).date()
                if payment_date < today:
                    days_overdue = (today - payment_date).days
                    inv['days_overdue'] = days_overdue
                    overdue_invoices.append(inv)
            
            logger.info(f"✅ Found {len(overdue_invoices)} overdue invoices out of {len(invoices)} unpaid")
            
            # Log breakdown by days overdue
            if overdue_invoices:
                ranges = {
                    '1-3 days': len([i for i in overdue_invoices if 1 <= i['days_overdue'] <= 3]),
                    '4-13 days': len([i for i in overdue_invoices if 4 <= i['days_overdue'] <= 13]),
                    '14-23 days': len([i for i in overdue_invoices if 14 <= i['days_overdue'] <= 23]),
                    '24-33 days': len([i for i in overdue_invoices if 24 <= i['days_overdue'] <= 33]),
                    '34+ days': len([i for i in overdue_invoices if i['days_overdue'] >= 34])
                }
                logger.info(f"   Overdue breakdown: {ranges}")
            
            return overdue_invoices
            
        except Exception as e:
            logger.error(f"❌ Error fetching overdue invoices: {e}", exc_info=True)
            return []
    
    def get_reminder_count(self, invoice_id: str) -> int:
        """
        Get the current reminder number for an invoice from invoice_reminders table
        
        Args:
            invoice_id: Invoice database ID
            
        Returns:
            Current reminder_number (0 if no reminders sent yet)
        """
        try:
            response = self.supabase.table('invoice_reminders') \
                .select('reminder_number') \
                .eq('user_id', self.user_id) \
                .eq('invoice_id', invoice_id) \
                .order('reminder_number', desc=True) \
                .limit(1) \
                .execute()
            
            if response.data:
                reminder_number = response.data[0]['reminder_number']
                logger.debug(f"   Found {reminder_number} reminders for invoice {invoice_id}")
                return reminder_number
            else:
                logger.debug(f"   No reminders found for invoice {invoice_id}")
                return 0
            
        except Exception as e:
            logger.error(f"❌ Error fetching reminder count for invoice {invoice_id}: {e}")
            return 0
    
    def determine_next_reminder_stage(self, invoice: Dict) -> ReminderDecision:
        """
        Determine what reminder stage an invoice should be at
        
        Args:
            invoice: Invoice dict with days_overdue, latest_mail_out_type, etc.
            
        Returns:
            ReminderDecision with next action to take
        """
        invoice_id = invoice['id']
        invoice_number = invoice['invoice_number']
        days_overdue = invoice['days_overdue']
        current_mail_type = invoice.get('latest_mail_out_type', 'MailOut')
        
        logger.debug(f"🔍 Analyzing invoice {invoice_number}: {days_overdue} days overdue, "
                    f"current stage: {current_mail_type}")
        
        # Get reminder count from invoice_reminders table
        reminder_count = self.get_reminder_count(invoice_id)
        logger.debug(f"   Current reminder number: {reminder_count}")
        
        # State machine for reminder progression
        decision = ReminderDecision(
            invoice_id=invoice_id,
            invoice_number=invoice_number,
            contact_name=invoice['contact_name'],
            amount=float(invoice['total_incl_vat']),
            days_overdue=days_overdue,
            current_stage=current_mail_type,
            next_stage=ReminderStage.NONE,
            should_send=False,
            reason=""
        )
        
        # Decision logic based on reminder_count and user settings
        # IMPORTANT: reminder_count = number of reminders ALREADY SENT
        # So if reminder_count = 2, that means Rykker 2 was sent, next is Rykker 3
        
        if reminder_count == 0:
            # No reminders sent yet, check if ready for Rykker 1 (PreReminder)
            if self.settings.get('pre_reminder_enabled') and \
               days_overdue >= self.settings['pre_reminder_days_after_due']:
                decision.next_stage = ReminderStage.PRE_REMINDER
                decision.should_send = True
                decision.reason = f"Invoice {days_overdue} days overdue, ready for Rykker 1 (PreReminder)"
                logger.info(f"   ✅ {invoice_number}: Ready for Rykker 1/PreReminder ({days_overdue} days)")
            else:
                decision.reason = f"Only {days_overdue} days overdue, waiting for {self.settings['pre_reminder_days_after_due']} days"
                logger.debug(f"   ⏳ {invoice_number}: Too early for Rykker 1")
        
        elif reminder_count == 1:
            # Rykker 1 sent, check if ready for Rykker 2
            expected_day = self.settings['pre_reminder_days_after_due'] + \
                          self.settings['rykker_1_days_after_pre']
            if self.settings.get('rykker_1_enabled') and days_overdue >= expected_day:
                decision.next_stage = ReminderStage.RYKKER_1
                decision.should_send = True
                decision.reason = f"{days_overdue} days overdue, ready for Rykker 2"
                logger.info(f"   ✅ {invoice_number}: Ready for Rykker 2 ({days_overdue} days)")
            else:
                decision.reason = f"Only {days_overdue} days overdue, waiting for {expected_day} days"
                logger.debug(f"   ⏳ {invoice_number}: Too early for Rykker 2")
        
        elif reminder_count == 2:
            # Rykker 2 sent, check if ready for Rykker 3
            expected_day = self.settings['pre_reminder_days_after_due'] + \
                          self.settings['rykker_1_days_after_pre'] + \
                          self.settings['rykker_2_days_after_rykker_1']
            if self.settings.get('rykker_2_enabled') and days_overdue >= expected_day:
                decision.next_stage = ReminderStage.RYKKER_2
                decision.should_send = True
                decision.reason = f"{days_overdue} days overdue, ready for Rykker 3"
                logger.info(f"   ✅ {invoice_number}: Ready for Rykker 3 ({days_overdue} days)")
            else:
                decision.reason = f"Only {days_overdue} days overdue, waiting for {expected_day} days"
                logger.debug(f"   ⏳ {invoice_number}: Too early for Rykker 3")
        
        elif reminder_count == 3:
            # Rykker 3 sent, move to Inkasso
            decision.next_stage = ReminderStage.INKASSO
            decision.should_send = False
            decision.move_to_inkasso = self.settings.get('auto_inkasso_enabled', True)
            decision.reason = f"Rykker 3 already sent, ready for Inkasso"
            logger.warning(f"   ⚠️  {invoice_number}: Rykker 3 sent, moving to Inkasso")
        
        elif reminder_count >= 4:
            # Already in inkasso or beyond
            decision.next_stage = ReminderStage.INKASSO
            decision.should_send = False
            decision.move_to_inkasso = True
            decision.reason = f"Already sent {reminder_count} reminders, should be in inkasso queue"
            logger.warning(f"   ⚠️  {invoice_number}: {reminder_count} reminders sent, check inkasso queue")
        
        else:
            decision.reason = f"Unexpected reminder count: {reminder_count}"
            logger.warning(f"   ❓ {invoice_number}: Unexpected reminder count {reminder_count}")
        
        return decision
    
    def send_reminder(self, decision: ReminderDecision, invoice: Dict) -> bool:
        """
        Send a reminder via Dinero API
        
        Args:
            decision: ReminderDecision with details about what to send
            invoice: Full invoice dict with dinero_guid, invoice_number, issue_date
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"📧 Sending {decision.next_stage.value} for invoice {decision.invoice_number}")
        logger.info(f"   Customer: {decision.contact_name}")
        logger.info(f"   Amount: {decision.amount} DKK")
        logger.info(f"   Days overdue: {decision.days_overdue}")
        
        try:
            # Get valid access token
            access_token, token_update = self.dinero_service.get_valid_access_token(self.user_profile)
            
            # Update token in database if it was refreshed
            if token_update:
                logger.debug(f"   🔄 Updating refreshed Dinero token")
                self.supabase.table('profiles').update(token_update).eq('id', self.user_id).execute()
            
            organization_id = self.user_profile['dinero_organization_id']
            invoice_guid = invoice['dinero_guid']
            invoice_number = invoice['invoice_number']
            
            # Parse issue date
            from datetime import datetime
            issue_date = datetime.fromisoformat(invoice['issue_date'].replace('Z', '+00:00'))
            
            # Send via Dinero API
            if decision.next_stage == ReminderStage.PRE_REMINDER:
                logger.info(f"   📨 Sending PreReminder (Påmindelse) via Dinero API")
                self.dinero_service.send_pre_reminder(access_token, organization_id, invoice_guid)
            else:
                # Rykker 1, 2, or 3 - determine reminder number
                reminder_number = {
                    ReminderStage.RYKKER_1: 1,
                    ReminderStage.RYKKER_2: 2,
                    ReminderStage.RYKKER_3: 3
                }.get(decision.next_stage, 1)
                
                logger.info(f"   📨 Sending Rykker {reminder_number} via Dinero API (3-step process)")
                self.dinero_service.send_reminder(
                    access_token=access_token,
                    organization_id=organization_id,
                    invoice_guid=invoice_guid,
                    invoice_number=invoice_number,
                    invoice_issue_date=issue_date,
                    reminder_number=reminder_number
                )
            
            logger.info(f"   ✅ Successfully sent {decision.next_stage.value}")
            
            # Check if SMS is enabled for this reminder stage
            sms_enabled = False
            if decision.next_stage == ReminderStage.PRE_REMINDER:
                sms_enabled = self.settings.get('pre_reminder_sms', False)
            elif decision.next_stage == ReminderStage.RYKKER_1:
                sms_enabled = self.settings.get('rykker_1_sms', False)
            elif decision.next_stage == ReminderStage.RYKKER_2:
                sms_enabled = self.settings.get('rykker_2_sms', False)
            elif decision.next_stage == ReminderStage.RYKKER_3:
                sms_enabled = self.settings.get('rykker_3_sms', False)
            
            if sms_enabled:
                self._send_sms_reminder(decision, invoice, access_token, organization_id)
            
            logger.info(f"   💾 Reminder will be recorded in invoice_reminders after next Dinero sync")
            return True
            
        except Exception as e:
            logger.error(f"   ❌ Error sending {decision.next_stage.value}: {e}", exc_info=True)
            return False
    
    def _send_sms_reminder(
        self, 
        decision: ReminderDecision, 
        invoice: Dict, 
        access_token: str, 
        organization_id: str
    ):
        """
        Send SMS reminder for an invoice
        
        Args:
            decision: ReminderDecision with reminder details
            invoice: Full invoice dict
            access_token: Valid Dinero access token
            organization_id: Dinero organization ID
        """
        try:
            # Get customer phone number - try raw_details first, then contact_phone
            customer_phone = None
            if invoice.get('raw_details'):
                raw = invoice['raw_details']
                if isinstance(raw, dict):
                    customer_phone = raw.get('ContactPhone') or raw.get('contact_phone')
            
            if not customer_phone:
                customer_phone = invoice.get('contact_phone')
            
            if not customer_phone:
                logger.warning(f"   ⚠️  No phone number for customer {decision.contact_name}, skipping SMS")
                return
            
            # Initialize SMS service
            sms_service = DineroSMSService(access_token, organization_id)
            
            # Determine if this is a reminder or pre-reminder
            is_reminder = decision.next_stage != ReminderStage.PRE_REMINDER
            
            # Get appropriate template from database settings
            if is_reminder:
                template = self.settings.get('sms_reminder_template') or sms_service.get_default_reminder_template()
                logger.debug(f"   📝 Using reminder template")
            else:
                template = self.settings.get('sms_prereminder_template') or sms_service.get_default_prereminder_template()
                logger.debug(f"   📝 Using pre-reminder template")
            
            # Get company name from settings
            company_name = self.settings.get('company_name') or self.user_profile.get('company_name') or 'Vores firma'
            
            # Format message with variables
            message = sms_service.format_sms_message(
                template=template,
                invoice_number=str(decision.invoice_number),
                customer_name=decision.contact_name,
                amount=decision.amount,
                company_name=company_name,
                reminder_stage='reminder' if is_reminder else 'prereminder'
            )
            
            logger.info(f"   📱 Sending SMS to {decision.contact_name} ({customer_phone})")
            logger.debug(f"   Message: {message[:100]}...")
            
            # Get invoice timestamp
            invoice_timestamp = invoice.get('issue_date', datetime.now(timezone.utc).isoformat())
            
            # Send SMS via Dinero API
            success = sms_service.send_sms(
                voucher_guid=invoice['dinero_guid'],
                receiver_phone=customer_phone,
                receiver_name=decision.contact_name,
                invoice_timestamp=invoice_timestamp,
                is_reminder=is_reminder,
                message=message
            )
            
            if success:
                logger.info(f"   ✅ SMS sent successfully to {customer_phone}")
            else:
                logger.warning(f"   ⚠️  Failed to send SMS to {customer_phone}")
                
        except Exception as e:
            logger.error(f"   ❌ Error sending SMS: {e}", exc_info=True)
    
    def record_reminder_sent(self, decision: ReminderDecision):
        """
        Record that a reminder was sent
        
        NOTE: The actual reminder record should be created by the Dinero sync
        after the reminder is sent via Dinero API. This is just a placeholder
        for logging purposes.
        
        Args:
            decision: ReminderDecision with reminder details
        """
        logger.info(f"   💾 Reminder will be recorded in invoice_reminders table after Dinero sync")
        logger.debug(f"      Invoice: {decision.invoice_number}")
        logger.debug(f"      Type: {decision.next_stage.value}")
        logger.debug(f"      Days overdue: {decision.days_overdue}")
    
    def move_to_inkasso_queue(self, decision: ReminderDecision, invoice: Dict):
        """
        Move an invoice to the inkasso queue
        
        Args:
            decision: ReminderDecision indicating inkasso needed
            invoice: Full invoice dict with all details
        """
        logger.warning(f"🚨 Moving invoice {decision.invoice_number} to inkasso queue")
        logger.warning(f"   Customer: {decision.contact_name}")
        logger.warning(f"   Amount: {decision.amount} DKK")
        logger.warning(f"   Days overdue: {decision.days_overdue}")
        
        try:
            # Check if already in queue
            existing = self.supabase.table('inkasso_queue') \
                .select('id') \
                .eq('user_id', self.user_id) \
                .eq('invoice_id', decision.invoice_id) \
                .execute()
            
            if existing.data:
                logger.info(f"   ℹ️  Invoice already in inkasso queue")
                return
            
            # Add to inkasso queue
            self.supabase.table('inkasso_queue').insert({
                'user_id': self.user_id,
                'invoice_id': decision.invoice_id,
                'invoice_number': decision.invoice_number,
                'dinero_guid': invoice['dinero_guid'],
                'contact_name': decision.contact_name,
                'contact_guid': invoice['contact_guid'],
                'amount': decision.amount,
                'days_overdue': decision.days_overdue,
                'issue_date': invoice['issue_date'],
                'payment_date': invoice['payment_date'],
                'added_at': datetime.now(timezone.utc).isoformat(),
                'status': 'pending'
            }).execute()
            
            logger.warning(f"   ✅ Added to inkasso queue")
            
        except Exception as e:
            logger.error(f"   ❌ Error adding to inkasso queue: {e}", exc_info=True)
    
    def process_reminders(self, dry_run: bool = False) -> Dict:
        """
        Main processing loop for reminder automation
        
        Args:
            dry_run: If True, only analyze but don't send reminders
            
        Returns:
            Summary dict with counts and results
        """
        logger.info("="*80)
        logger.info("🚀 Starting Invoice Reminder Automation")
        logger.info(f"   User: {self.user_id}")
        logger.info(f"   Mode: {'DRY RUN' if dry_run else 'LIVE'}")
        logger.info("="*80)
        
        start_time = datetime.now()
        
        # Get overdue invoices
        overdue_invoices = self.get_overdue_unpaid_invoices()
        
        if not overdue_invoices:
            logger.info("✅ No overdue invoices found")
            return {
                'total_overdue': 0,
                'reminders_to_send': 0,
                'reminders_sent': 0,
                'moved_to_inkasso': 0,
                'errors': 0
            }
        
        # Analyze each invoice
        logger.info(f"\n📊 Analyzing {len(overdue_invoices)} overdue invoices...")
        
        decisions = []
        for invoice in overdue_invoices:
            decision = self.determine_next_reminder_stage(invoice)
            if decision.should_send or decision.move_to_inkasso:
                decisions.append((decision, invoice))
        
        logger.info(f"\n✅ Analysis complete: {len(decisions)} actions needed")
        
        # Summary of actions
        pre_reminders = len([d for d, _ in decisions if d.next_stage == ReminderStage.PRE_REMINDER])
        rykker1 = len([d for d, _ in decisions if d.next_stage == ReminderStage.RYKKER_1])
        rykker2 = len([d for d, _ in decisions if d.next_stage == ReminderStage.RYKKER_2])
        rykker3 = len([d for d, _ in decisions if d.next_stage == ReminderStage.RYKKER_3])
        inkasso = len([d for d, _ in decisions if d.move_to_inkasso])
        
        logger.info(f"   PreReminders: {pre_reminders}")
        logger.info(f"   Rykker 1: {rykker1}")
        logger.info(f"   Rykker 2: {rykker2}")
        logger.info(f"   Rykker 3: {rykker3}")
        logger.info(f"   Move to Inkasso: {inkasso}")
        
        if dry_run:
            logger.info("\n🔍 DRY RUN MODE - No reminders will be sent")
            return {
                'total_overdue': len(overdue_invoices),
                'reminders_to_send': len(decisions),
                'reminders_sent': 0,
                'moved_to_inkasso': 0,
                'errors': 0,
                'dry_run': True
            }
        
        # Execute actions
        logger.info(f"\n📤 Sending reminders...")
        
        sent_count = 0
        inkasso_count = 0
        error_count = 0
        
        for decision, invoice in decisions:
            try:
                # Send reminder if needed
                if decision.should_send:
                    success = self.send_reminder(decision, invoice)
                    if success:
                        sent_count += 1
                    else:
                        error_count += 1
                
                # Move to inkasso if needed
                if decision.move_to_inkasso:
                    self.move_to_inkasso_queue(decision, invoice)
                    inkasso_count += 1
                    
            except Exception as e:
                logger.error(f"❌ Error processing invoice {decision.invoice_number}: {e}", exc_info=True)
                error_count += 1
        
        # Final summary
        elapsed = (datetime.now() - start_time).total_seconds()
        
        logger.info("="*80)
        logger.info("🎉 Reminder Automation Complete")
        logger.info(f"   Total overdue invoices: {len(overdue_invoices)}")
        logger.info(f"   Reminders sent: {sent_count}")
        logger.info(f"   Moved to inkasso: {inkasso_count}")
        logger.info(f"   Errors: {error_count}")
        logger.info(f"   Elapsed time: {elapsed:.1f}s")
        logger.info("="*80)
        
        return {
            'total_overdue': len(overdue_invoices),
            'reminders_to_send': len(decisions),
            'reminders_sent': sent_count,
            'moved_to_inkasso': inkasso_count,
            'errors': error_count
        }


def run_reminder_automation_for_user(user_id: str, supabase_client, dry_run: bool = False) -> Dict:
    """
    Run reminder automation for a single user
    
    Args:
        user_id: User ID to process
        supabase_client: Supabase client instance
        dry_run: If True, only analyze but don't send
        
    Returns:
        Summary dict with results
    """
    automation = InvoiceReminderAutomation(supabase_client, user_id)
    return automation.process_reminders(dry_run=dry_run)



if __name__ == '__main__':
    """Test the reminder automation"""
    import os
    from pathlib import Path
    from dotenv import load_dotenv
    from supabase import create_client
    
    load_dotenv(Path(__file__).parent / '.env')
    
    supabase = create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_ROLE_KEY']
    )
    
    # Test user
    user_id = 'a422f931-51a8-42de-bdaa-879561ce63f7'
    
    # Run in dry-run mode
    result = run_reminder_automation_for_user(user_id, supabase, dry_run=True)
    
    print("\n" + "="*80)
    print("RESULTS:")
    print(f"  Total overdue: {result['total_overdue']}")
    print(f"  Actions needed: {result['reminders_to_send']}")
    print("="*80)
