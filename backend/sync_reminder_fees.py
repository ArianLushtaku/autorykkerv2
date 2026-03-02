"""
Reminder Fee Sync Service
Syncs reminder fees from Dinero API to cache them for payment matching.
Respects 100 requests/minute rate limit.
"""

import time
import logging
from collections import deque
from datetime import datetime
from typing import Optional, List, Dict
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
from database import supabase


class RateLimiter:
    """Ensures we don't exceed 100 requests/minute to Dinero API"""
    
    def __init__(self, max_requests=100, time_window=60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
    
    def wait_if_needed(self):
        """Wait if we're at the rate limit"""
        now = time.time()
        
        # Remove requests older than the time window
        while self.requests and self.requests[0] < now - self.time_window:
            self.requests.popleft()
        
        # If at limit, wait until we can make another request
        if len(self.requests) >= self.max_requests:
            sleep_time = self.time_window - (now - self.requests[0]) + 0.1  # Add small buffer
            logger.info(f"Rate limit reached. Waiting {sleep_time:.2f} seconds...")
            time.sleep(sleep_time)
            # Clean up old requests after waiting
            now = time.time()
            while self.requests and self.requests[0] < now - self.time_window:
                self.requests.popleft()
        
        # Record this request
        self.requests.append(time.time())


class ReminderFeeSync:
    """Syncs reminder fees from Dinero API"""
    
    def __init__(self, user_id: str, access_token: str, organization_id: str, test_limit: Optional[int] = None):
        self.user_id = user_id
        self.access_token = access_token
        self.organization_id = organization_id
        self.rate_limiter = RateLimiter()
        self.base_url = "https://api.dinero.dk/v1"
        self.test_limit = test_limit  # Limit number of invoices for testing
        
    def get_invoices_needing_sync(self) -> List[Dict]:
        """
        Get invoices that need reminder fee sync.
        Only fetches overdue invoices with reminders.
        
        Note: We fetch all eligible invoices and use Dinero's changesSince
        parameter when calling the API to filter on their side.
        """
        try:
            query = supabase.table('invoices').select('*').eq('user_id', self.user_id)
            
            # Only sync invoices with reminders that are not paid
            query = query.in_('latest_mail_out_type', ['Reminder'])
            query = query.not_.in_('status', ['Paid', 'Overpaid', 'paid', 'overpaid'])
            
            logger.info("Fetching all overdue invoices with reminders")
            
            response = query.execute()
            invoices = response.data or []
            
            # Apply test limit if set
            if self.test_limit:
                invoices = invoices[:self.test_limit]
                logger.info(f"TEST MODE: Limited to {self.test_limit} invoices")
            
            logger.info(f"Found {len(invoices)} invoices needing reminder fee sync")
            return invoices
            
        except Exception as e:
            logger.error(f"Error fetching invoices for sync: {e}")
            return []
    
    def fetch_reminder_details(self, voucher_guid: str, changes_since: Optional[str] = None) -> Optional[Dict]:
        """
        Fetch reminder details from Dinero API for a specific invoice.
        
        Args:
            voucher_guid: The Dinero voucherGuid (stored as dinero_guid in our DB)
            changes_since: Optional ISO timestamp to only get reminders changed since this time
            
        Returns:
            Dictionary with reminder details or None if no reminders found
        """
        self.rate_limiter.wait_if_needed()
        
        try:
            url = f"{self.base_url}/{self.organization_id}/invoices/{voucher_guid}/reminders"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Add changesSince parameter if provided
            # COMMENTED OUT: changesSince filters out historical reminders that haven't been modified
            # This causes issues when syncing existing reminders for the first time
            params = {}
            # if changes_since:
            #     params['changesSince'] = changes_since
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            if response.status_code == 200:
                reminders = response.json()
                
                # Only log details for specific invoices or if there are reminders
                if reminders and len(reminders) > 0:
                    logger.info(f"API returned {len(reminders)} reminder(s) for {voucher_guid}")
                    return reminders
                else:
                    # This is the issue - API returns empty array
                    logger.debug(f"API returned 0 reminders for {voucher_guid}")
                    return None
            elif response.status_code == 404:
                logger.debug(f"Invoice {voucher_guid} not found or has no reminders")
                return None
            else:
                logger.warning(f"Failed to fetch reminders for {voucher_guid}: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout fetching reminders for invoice {voucher_guid}")
            return None
        except Exception as e:
            logger.error(f"Error fetching reminders for invoice {voucher_guid}: {e}")
            return None
    
    def store_reminder_fee(self, invoice: Dict, reminders_array: list) -> bool:
        """
        Store all reminders in database (one row per reminder).
        
        Args:
            invoice: Invoice data from Supabase
            reminders_array: Array of reminder details from Dinero API
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not reminders_array:
                logger.warning(f"No reminders to store for invoice {invoice['invoice_number']}")
                return False
            
            logger.info(f"Storing {len(reminders_array)} reminder(s) for invoice #{invoice['invoice_number']}")
            
            # Process each reminder in the array
            reminders_to_upsert = []
            for reminder in reminders_array:
                reminder_data = {
                    'user_id': self.user_id,
                    'invoice_id': invoice['id'],
                    'invoice_number': str(invoice['invoice_number']),
                    
                    # Reminder identification
                    'dinero_reminder_id': reminder.get('Id'),
                    'reminder_number': reminder.get('Number', 0),
                    'reminder_title': reminder.get('Title'),
                    
                    # Dates
                    'reminder_date': reminder.get('Date'),
                    'reminder_timestamp': reminder.get('Timestamp'),
                    
                    # Amounts (convert to float, handle None)
                    'invoice_total_incl_vat': float(reminder.get('InvoiceTotalInclVatAmount', 0) or 0),
                    'fee_amount': float(reminder.get('FeeAmount', 0) or 0),
                    'interest_amount': float(reminder.get('InterestAmount', 0) or 0),
                    'compensation_fee_amount': float(reminder.get('CompensationFeeAmount', 0) or 0),
                    'accumulated_fees_and_interest': float(reminder.get('AccumulatedFeesAndInterestAmount', 0) or 0),
                    'paid_amount': float(reminder.get('PaidAmount', 0) or 0),
                    'reminder_total_incl_vat': float(reminder.get('ReminderTotalInclVatAmount', 0) or 0),
                    
                    # Flags
                    'is_draft': reminder.get('IsDraft', False),
                    'is_deleted': reminder.get('IsDeleted', False),
                    'with_fee': reminder.get('WithFee', False),
                    'with_interest_fee': reminder.get('WithInterestFee', False),
                    'with_compensation_fee': reminder.get('WithCompensationFee', False),
                    'compensation_fee_available': reminder.get('CompensationFeeAvailable', False),
                    'with_debt_collection_warning': reminder.get('WithDebtCollectionWarning', False),
                    
                    # Text content
                    'description': reminder.get('Description'),
                    'debt_collection_notice_text': reminder.get('DebtCollectionNoticeText'),
                    
                    # Metadata
                    'last_synced_at': datetime.utcnow().isoformat()
                }
                reminders_to_upsert.append(reminder_data)
            
            # Upsert all reminders (will update if invoice_id + dinero_reminder_id exists)
            # Note: We use dinero_reminder_id instead of reminder_number because Dinero
            # sometimes returns duplicate reminder_number values (both "Rykker 1" and "Rykker 2" can have Number=1)
            response = supabase.table('invoice_reminders').upsert(
                reminders_to_upsert,
                on_conflict='invoice_id,dinero_reminder_id'
            ).execute()
            
            if hasattr(response, 'error') and response.error:
                logger.error(f"Failed to store reminders for invoice {invoice['invoice_number']}: {response.error}")
                return False
            
            logger.info(f"Successfully stored {len(reminders_array)} reminder(s) for invoice #{invoice['invoice_number']}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing reminders for invoice {invoice.get('invoice_number')}: {e}")
            return False
    
    def sync(self, changes_since: Optional[str] = None) -> Dict:
        """
        Main sync function.
        
        Args:
            changes_since: ISO timestamp to pass to Dinero API changesSince parameter
                          Format: 'YYYY-MM-DDTHH:mm:ssZ' (UTC)
            
        Returns:
            Dictionary with sync statistics
        """
        start_time = time.time()
        stats = {
            'total_invoices': 0,
            'synced': 0,
            'failed': 0,
            'no_reminders': 0,
            'duration_seconds': 0
        }
        
        sync_type = "INCREMENTAL" if changes_since else "FULL"
        logger.info(f"=== Starting {sync_type} Reminder Fee Sync for user {self.user_id} ===")
        if changes_since:
            logger.info(f"Using changesSince filter: {changes_since}")
        
        # Get invoices that need syncing
        invoices = self.get_invoices_needing_sync()
        stats['total_invoices'] = len(invoices)
        
        if not invoices:
            logger.info("No invoices to sync")
            stats['duration_seconds'] = time.time() - start_time
            return stats
        
        # Sync each invoice
        for i, invoice in enumerate(invoices, 1):
            invoice_number = invoice.get('invoice_number')
            voucher_guid = invoice.get('dinero_guid')
            
            if not voucher_guid:
                logger.warning(f"Invoice #{invoice_number} has no Dinero GUID (voucherGuid), skipping")
                stats['failed'] += 1
                continue
            
            logger.info(f"[{i}/{len(invoices)}] Syncing invoice #{invoice_number} (GUID: {voucher_guid})")
            
            # Fetch reminder details from Dinero (WITHOUT changesSince to get all historical reminders)
            reminder_details = self.fetch_reminder_details(voucher_guid, changes_since=None)
            
            if reminder_details:
                logger.info(f"Invoice #{invoice_number}: Got {len(reminder_details)} reminder(s), storing...")
                # Store in database
                if self.store_reminder_fee(invoice, reminder_details):
                    stats['synced'] += 1
                    logger.info(f"Invoice #{invoice_number}: ✅ Successfully stored")
                else:
                    stats['failed'] += 1
                    logger.error(f"Invoice #{invoice_number}: ❌ Failed to store")
            else:
                logger.warning(f"Invoice #{invoice_number}: No reminders returned from API")
                stats['no_reminders'] += 1
        
        stats['duration_seconds'] = time.time() - start_time
        
        logger.info(f"=== Sync Complete ===")
        logger.info(f"Total: {stats['total_invoices']}, Synced: {stats['synced']}, "
                   f"No Reminders: {stats['no_reminders']}, Failed: {stats['failed']}, "
                   f"Duration: {stats['duration_seconds']:.2f}s")
        
        return stats


def sync_reminder_fees_for_user(user_id: str, access_token: str, organization_id: str, 
                                 changes_since: Optional[str] = None, test_limit: Optional[int] = None) -> Dict:
    """
    Convenience function to sync reminder fees for a user.
    
    Args:
        user_id: User ID
        access_token: Dinero access token
        organization_id: Dinero organization ID
        changes_since: Optional ISO timestamp for Dinero API changesSince parameter
                      Format: 'YYYY-MM-DDTHH:mm:ssZ' (UTC)
        test_limit: Optional limit for testing (e.g., 5 to only sync 5 invoices)
        
    Returns:
        Dictionary with sync statistics
    """
    syncer = ReminderFeeSync(user_id, access_token, organization_id, test_limit=test_limit)
    return syncer.sync(changes_since)


def get_last_reminder_sync_time(user_id: str) -> Optional[str]:
    """
    Get the last time reminders were synced for a user.
    
    Returns:
        ISO timestamp string in Dinero format: 'YYYY-MM-DDTHH:mm:ssZ' or None
    """
    try:
        response = supabase.table('invoice_reminders') \
            .select('last_synced_at') \
            .eq('user_id', user_id) \
            .order('last_synced_at', desc=True) \
            .limit(1) \
            .execute()
        
        if response.data and len(response.data) > 0:
            timestamp = response.data[0]['last_synced_at']
            # Convert to Dinero format: YYYY-MM-DDTHH:mm:ssZ (no microseconds)
            from datetime import datetime
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            # Format without microseconds
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        return None
    except Exception as e:
        logger.error(f"Error getting last sync time: {e}")
        return None


def get_user_dinero_credentials(user_id: str) -> Optional[Dict]:
    """Get Dinero credentials for a user from the database"""
    from dinero_service import DineroService
    import time
    
    dinero_service = DineroService()
    
    try:
        response = supabase.table('profiles') \
            .select('id, full_name, dinero_org_id, dinero_access_token_encrypted, dinero_refresh_token_encrypted, dinero_token_expires_at, is_dinero_connected') \
            .eq('id', user_id) \
            .single() \
            .execute()
        
        if not response.data:
            logger.error(f"User not found: {user_id}")
            return None
        
        profile = response.data
        if not profile.get('is_dinero_connected'):
            logger.error(f"User {user_id} does not have Dinero connected")
            return None
        
        # Check if token needs refresh
        expires_at = profile.get('dinero_token_expires_at', 0)
        if not expires_at or time.time() > expires_at - 60:
            logger.info("Token expired, refreshing...")
            encrypted_refresh = profile.get('dinero_refresh_token_encrypted')
            if not encrypted_refresh:
                logger.error("No refresh token found")
                return None
            
            refresh_token = dinero_service.decrypt_token(encrypted_refresh, user_id)
            new_token_data = dinero_service.refresh_access_token(refresh_token)
            
            # Save new tokens
            import base64
            encrypted_access = base64.b64encode(dinero_service.encrypt_token(new_token_data['access_token'])).decode('utf-8')
            encrypted_refresh = base64.b64encode(dinero_service.encrypt_token(new_token_data['refresh_token'])).decode('utf-8')
            
            supabase.table('profiles').update({
                'dinero_access_token_encrypted': encrypted_access,
                'dinero_refresh_token_encrypted': encrypted_refresh,
                'dinero_token_expires_at': int(time.time()) + new_token_data.get('expires_in', 3600),
            }).eq('id', user_id).execute()
            
            return {
                'access_token': new_token_data['access_token'],
                'org_id': str(profile.get('dinero_org_id')),
                'full_name': profile.get('full_name'),
            }
        else:
            # Token still valid
            encrypted_access = profile.get('dinero_access_token_encrypted')
            access_token = dinero_service.decrypt_token(encrypted_access, user_id)
            return {
                'access_token': access_token,
                'org_id': str(profile.get('dinero_org_id')),
                'full_name': profile.get('full_name'),
            }
    except Exception as e:
        logger.error(f"Error getting credentials: {e}")
        return None


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Sync reminder fees from Dinero')
    parser.add_argument('--user-id', type=str, required=True, help='User ID to sync for')
    parser.add_argument('--changed-since', type=str, help='Only sync invoices changed since this date (ISO format)')
    parser.add_argument('--test-limit', type=int, help='Limit number of invoices for testing')
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🚀 REMINDER FEE SYNC")
    print("="*60)
    
    # Get credentials from database
    creds = get_user_dinero_credentials(args.user_id)
    if not creds:
        print("❌ Could not get Dinero credentials for user")
        sys.exit(1)
    
    print(f"👤 User: {creds.get('full_name', 'Unknown')} ({args.user_id[:8]}...)")
    print(f"   Organization ID: {creds['org_id']}")
    
    # Get last sync time if not specified
    changed_since = args.changed_since
    if not changed_since:
        changed_since = get_last_reminder_sync_time(args.user_id)
        if changed_since:
            print(f"   📅 Incremental sync since: {changed_since}")
        else:
            print(f"   📅 Full sync (no previous sync found)")
    
    print("="*60)
    
    stats = sync_reminder_fees_for_user(
        args.user_id, 
        creds['access_token'], 
        creds['org_id'], 
        changed_since,
        test_limit=args.test_limit
    )
    
    print(f"\n{'='*60}")
    print(f"🎉 SYNC COMPLETE")
    print(f"{'='*60}")
    print(f"Total invoices: {stats['total_invoices']}")
    print(f"Synced: {stats['synced']}")
    print(f"No reminders: {stats['no_reminders']}")
    print(f"Failed: {stats['failed']}")
    print(f"Duration: {stats['duration_seconds']:.2f}s")
    print(f"{'='*60}\n")
