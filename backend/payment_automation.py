"""
Payment Registration Automation
Automatically registers payments in Dinero for pending invoice matches
"""

import os
import sys
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from supabase import create_client
import logging
import time
import subprocess
from collections import deque

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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


class PaymentAutomation:
    """Handles automated payment registration for invoice matches"""
    
    def __init__(self, supabase_client, user_id: str):
        self.supabase = supabase_client
        self.user_id = user_id
        self.rate_limiter = RateLimiter()  # 100 requests/minute
        self.api_calls_made = 0
        
    def get_user_profile(self) -> Optional[Dict]:
        """Get user profile with Dinero credentials"""
        try:
            response = self.supabase.table('profiles').select('*').eq('id', self.user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching profile for user {self.user_id}: {e}")
            return None
    
    def get_dinero_access_token(self, profile: Dict) -> tuple[Optional[str], Optional[Dict]]:
        """Get valid Dinero access token for user, refreshing if needed
        
        Returns:
            tuple: (access_token, token_update_dict) where token_update_dict is None if no refresh occurred
        """
        try:
            from dinero_service import DineroService
            
            dinero_service = DineroService()
            
            # Use get_valid_access_token which handles refresh automatically
            access_token, token_update = dinero_service.get_valid_access_token(profile)
            
            # Update token in database if it was refreshed
            if token_update:
                logger.info(f"🔄 Refreshed Dinero token for user {self.user_id}")
                self.supabase.table('profiles').update(token_update).eq('id', self.user_id).execute()
            
            return access_token, token_update
            
        except Exception as e:
            logger.error(f"Error getting Dinero access token for user {self.user_id}: {e}")
            return None, None
    
    def get_pending_matches(self) -> List[Dict]:
        """Get all pending invoice matches for user"""
        try:
            response = self.supabase.table('invoice_matches')\
                .select('*')\
                .eq('user_id', self.user_id)\
                .eq('status', 'pending')\
                .is_('marked_paid_at', 'null')\
                .order('created_at')\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error fetching pending matches for user {self.user_id}: {e}")
            return []
    
    def register_payment(self, match: Dict, access_token: str, organization_id: str) -> Tuple[bool, str]:
        """Register a single payment in Dinero
        
        Following the documented flow in PAYMENT_REGISTRATION.md:
        1. Get invoice details from Dinero (for timestamp and deposit account)
        2. Register payment in Dinero
        3. Update match status in database
        """
        try:
            from dinero_payment_service import DineroPaymentService
            
            payment_service = DineroPaymentService(access_token, organization_id)
            
            # API Call 1: Get invoice details (respects rate limit)
            logger.info(f"Fetching invoice details for {match['invoice_id']}")
            self.rate_limiter.wait_if_needed()
            invoice_details = payment_service.get_invoice_details(match['invoice_id'])
            self.api_calls_made += 1
            
            if not invoice_details:
                return False, "Could not fetch invoice details"
            
            # API Call 2: Register payment (respects rate limit)
            logger.info(f"Registering payment for invoice {match['invoice_number']}")
            self.rate_limiter.wait_if_needed()
            result = payment_service.register_payment_from_match(match)
            self.api_calls_made += 1
            
            if result:
                # Update match status in database
                # marked_paid_by is 'AutoRykker' for automated payments
                self.supabase.table('invoice_matches').update({
                    'marked_paid_at': datetime.now().isoformat(),
                    'marked_paid_by': 'AutoRykker'
                }).eq('id', match['id']).execute()
                
                logger.info(f"✓ Successfully registered payment for invoice {match['invoice_number']} ({match['transaction_amount']} DKK)")
                return True, "Success"
            else:
                return False, "Payment registration failed"
                
        except Exception as e:
            logger.error(f"Error registering payment for match {match['id']}: {e}")
            return False, str(e)
    
    def process_user_payments(self) -> Dict:
        """Process all pending payments for user"""
        logger.info(f"Processing payments for user {self.user_id}")
        
        # Get user profile
        profile = self.get_user_profile()
        if not profile:
            return {
                'user_id': self.user_id,
                'success': False,
                'error': 'User profile not found',
                'processed': 0,
                'successful': 0,
                'failed': 0
            }
        
        # Check if Dinero is connected
        if not profile.get('is_dinero_connected'):
            logger.warning(f"User {self.user_id} has not connected Dinero")
            return {
                'user_id': self.user_id,
                'success': False,
                'error': 'Dinero not connected',
                'processed': 0,
                'successful': 0,
                'failed': 0
            }
        
        # Get access token (with automatic refresh if needed)
        access_token, token_update = self.get_dinero_access_token(profile)
        if not access_token:
            return {
                'user_id': self.user_id,
                'success': False,
                'error': 'Could not get Dinero access token',
                'processed': 0,
                'successful': 0,
                'failed': 0
            }
        
        organization_id = profile.get('dinero_org_id')
        if not organization_id:
            return {
                'user_id': self.user_id,
                'success': False,
                'error': 'No Dinero organization ID',
                'processed': 0,
                'successful': 0,
                'failed': 0
            }
        
        # Get pending matches
        pending_matches = self.get_pending_matches()
        logger.info(f"Found {len(pending_matches)} pending matches for user {self.user_id}")
        
        if not pending_matches:
            return {
                'user_id': self.user_id,
                'success': True,
                'processed': 0,
                'successful': 0,
                'failed': 0
            }
        
        # Process matches (rate limiter handles timing automatically)
        successful = 0
        failed = 0
        failed_matches = []
        
        for match in pending_matches:
            success, error = self.register_payment(match, access_token, organization_id)
            
            if success:
                successful += 1
            else:
                failed += 1
                failed_matches.append({
                    'match_id': match['id'],
                    'invoice_number': match['invoice_number'],
                    'error': error
                })
                logger.error(f"✗ Failed to register payment for invoice {match['invoice_number']}: {error}")
        
        return {
            'user_id': self.user_id,
            'success': True,
            'processed': len(pending_matches),
            'successful': successful,
            'failed': failed,
            'failed_matches': failed_matches,
            'api_calls': self.api_calls_made
        }


def process_user(user_id: str, supabase_client) -> Dict:
    """Process payments for a single user (thread-safe)"""
    try:
        automation = PaymentAutomation(supabase_client, user_id)
        return automation.process_user_payments()
    except Exception as e:
        logger.error(f"Error processing user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return {
            'user_id': user_id,
            'success': False,
            'error': str(e),
            'processed': 0,
            'successful': 0,
            'failed': 0
        }


def test_single_invoice(supabase_client, invoice_id: str):
    """Test payment registration for a single invoice GUID"""
    print("\n" + "="*80)
    print(f"🧪 TEST MODE: Registering payment for invoice {invoice_id}")
    print("="*80 + "\n")
    
    try:
        # Find match for this invoice
        response = supabase_client.table('invoice_matches')\
            .select('*')\
            .eq('invoice_id', invoice_id)\
            .eq('status', 'pending')\
            .is_('marked_paid_at', 'null')\
            .limit(1)\
            .execute()
        
        if not response.data:
            print(f"❌ No pending match found for invoice {invoice_id}")
            print("\nPossible reasons:")
            print("  - Invoice already has payment registered")
            print("  - No match exists for this invoice")
            print("  - Match status is not 'pending'")
            return
        
        match = response.data[0]
        user_id = match['user_id']
        
        print(f"✓ Found match:")
        print(f"  Match ID: {match['id']}")
        print(f"  Invoice Number: {match['invoice_number']}")
        print(f"  Transaction Amount: {match['transaction_amount']} DKK")
        print(f"  Transaction Date: {match['transaction_date']}")
        print(f"  User ID: {user_id}\n")
        
        # Get user profile
        profile_response = supabase_client.table('profiles').select('*').eq('id', user_id).single().execute()
        profile = profile_response.data
        
        if not profile.get('is_dinero_connected'):
            print(f"❌ User has not connected Dinero")
            return
        
        print(f"✓ User has Dinero connected")
        print(f"  Organization ID: {profile.get('dinero_org_id')}\n")
        
        # Initialize automation
        automation = PaymentAutomation(supabase_client, user_id)
        
        # Get access token (with automatic refresh if needed)
        access_token, token_update = automation.get_dinero_access_token(profile)
        if not access_token:
            print(f"❌ Could not get Dinero access token")
            return
        
        print(f"✓ Got Dinero access token\n")
        
        # Register payment
        print("🔄 Registering payment in Dinero...\n")
        success, error = automation.register_payment(
            match, 
            access_token, 
            profile.get('dinero_org_id')
        )
        
        if success:
            print("\n" + "="*80)
            print("✅ SUCCESS!")
            print("="*80)
            print(f"Payment registered for invoice {match['invoice_number']}")
            print(f"Amount: {match['transaction_amount']} DKK")
            print(f"Match marked as paid at: {datetime.now().isoformat()}")
            print(f"Marked by: AutoRykker")
            print(f"\nTotal API calls made: {automation.api_calls_made}")
        else:
            print("\n" + "="*80)
            print("❌ FAILED")
            print("="*80)
            print(f"Error: {error}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


def run_invoice_sync_for_users(user_ids: List[str]):
    """Run invoice sync for all users who had payments registered
    
    Calls the /dinero/sync API endpoint for each user to update invoice statuses
    """
    if not user_ids:
        logger.info("No users to sync")
        return
    
    logger.info("\n" + "="*80)
    logger.info(f"🔄 Running invoice sync for {len(user_ids)} user(s)...")
    logger.info("="*80)
    
    import requests
    
    # Get app URL from environment or use localhost
    app_url = os.environ.get('APP_URL', 'http://localhost:5003')
    
    success_count = 0
    failed_count = 0
    
    for user_id in user_ids:
        try:
            # Call the /dinero/sync endpoint for this user
            # We need to get the user's access token first
            supabase_url = os.environ.get('SUPABASE_URL')
            supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
            supabase = create_client(supabase_url, supabase_key)
            
            # Get user profile
            profile = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
            if not profile.data:
                logger.warning(f"⚠️  User {user_id[:8]}... - Profile not found")
                failed_count += 1
                continue
            
            # Import sync function directly instead of HTTP call
            from sync_customers import sync_customers_for_user, get_last_customer_sync_time
            from dinero_service import DineroService
            
            dinero_service = DineroService()
            access_token, token_update = dinero_service.get_valid_access_token(profile.data)
            
            if not access_token:
                logger.warning(f"⚠️  User {user_id[:8]}... - Could not get access token")
                failed_count += 1
                continue
            
            # Update token if refreshed
            if token_update:
                supabase.table('profiles').update(token_update).eq('id', user_id).execute()
            
            org_id = profile.data.get('dinero_org_id')
            if not org_id:
                logger.warning(f"⚠️  User {user_id[:8]}... - No organization ID")
                failed_count += 1
                continue
            
            # Run sync
            last_sync = get_last_customer_sync_time(user_id)
            result = sync_customers_for_user(user_id, access_token, org_id, last_sync)
            
            logger.info(f"✅ User {user_id[:8]}... - Synced {result.get('stored', 0)} customers")
            success_count += 1
            
        except Exception as e:
            logger.error(f"❌ User {user_id[:8]}... - Sync failed: {e}")
            failed_count += 1
    
    logger.info("\n" + "="*80)
    logger.info(f"📊 Invoice Sync Complete: {success_count} succeeded, {failed_count} failed")
    logger.info("="*80)


def main():
    """Main execution - process all users with automation enabled"""
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Payment automation script')
    parser.add_argument('--invoice-id', type=str, help='Test with specific invoice GUID')
    parser.add_argument('--user-id', type=str, help='Process specific user only')
    args = parser.parse_args()
    
    load_dotenv()
    
    # Initialize Supabase client
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        logger.error("Missing Supabase credentials")
        return
    
    supabase_client = create_client(supabase_url, supabase_key)
    
    # Test mode: single invoice
    if args.invoice_id:
        test_single_invoice(supabase_client, args.invoice_id)
        return
    
    print("\n" + "="*80)
    print("💰 Payment Registration Automation - Multi-Tenant Mode")
    print("="*80)
    
    # Get all users with automation enabled
    try:
        response = supabase_client.table('automation_settings')\
            .select('user_id')\
            .eq('automation_enabled', True)\
            .execute()
        
        users = [row['user_id'] for row in response.data] if response.data else []
        
        if not users:
            print("No users with automation enabled")
            return
        
        print(f"📋 Found {len(users)} users with automation enabled\n")
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        return
    
    # Process users in parallel (max 5 workers to avoid overwhelming API)
    max_workers = 5
    print(f"⚡ Processing {len(users)} users in parallel (max {max_workers} workers)...\n")
    
    results = []
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all user processing tasks
        future_to_user = {
            executor.submit(process_user, user_id, supabase_client): user_id 
            for user_id in users
        }
        
        # Process results as they complete
        for i, future in enumerate(as_completed(future_to_user), 1):
            user_id = future_to_user[future]
            try:
                result = future.result()
                results.append(result)
                
                if result['success']:
                    print(f"[{i}/{len(users)}] ✅ {user_id[:8]}... - {result['successful']}/{result['processed']} payments registered")
                else:
                    print(f"[{i}/{len(users)}] ❌ {user_id[:8]}... - {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                logger.error(f"Error processing user {user_id}: {e}")
                results.append({
                    'user_id': user_id,
                    'success': False,
                    'error': str(e),
                    'processed': 0,
                    'successful': 0,
                    'failed': 0
                })
    
    elapsed_time = time.time() - start_time
    
    # Print summary
    print("\n" + "="*80)
    print("🎉 PAYMENT AUTOMATION COMPLETE")
    print("="*80)
    
    total_processed = sum(r['processed'] for r in results)
    total_successful = sum(r['successful'] for r in results)
    total_failed = sum(r['failed'] for r in results)
    total_api_calls = sum(r.get('api_calls', 0) for r in results)
    
    print(f"Users processed: {len(results)}")
    print(f"Total matches processed: {total_processed}")
    print(f"Total payments registered: {total_successful}")
    print(f"Total failed: {total_failed}")
    print(f"Total API calls: {total_api_calls}")
    print(f"Elapsed time: {elapsed_time:.1f} seconds ({elapsed_time/60:.1f} minutes)")
    print(f"Average per user: {elapsed_time/len(results):.1f} seconds")
    
    # Show failed matches if any
    failed_matches = []
    for result in results:
        if result.get('failed_matches'):
            failed_matches.extend(result['failed_matches'])
    
    if failed_matches:
        print(f"\n⚠️  {len(failed_matches)} failed matches:")
        for fm in failed_matches[:10]:  # Show first 10
            print(f"   - Invoice {fm['invoice_number']}: {fm['error']}")
        if len(failed_matches) > 10:
            print(f"   ... and {len(failed_matches) - 10} more")
    
    print("="*80 + "\n")
    
    # Run invoice sync after payment registration for users who had successful payments
    if total_successful > 0:
        # Get list of users who had successful payments
        users_with_payments = [r['user_id'] for r in results if r.get('successful', 0) > 0]
        run_invoice_sync_for_users(users_with_payments)
    else:
        logger.info("No payments registered, skipping invoice sync")


if __name__ == '__main__':
    main()
