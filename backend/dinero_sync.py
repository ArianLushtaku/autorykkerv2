"""
Dinero Invoice Sync Script
Standalone script to sync invoices from Dinero for one or all users.

Usage:
    python dinero_sync.py                    # Sync for all enabled users
    python dinero_sync.py --user-id UUID     # Sync for specific user
    python dinero_sync.py --full-sync        # Full sync (re-fetch all invoices)
"""

import os
import sys
import argparse
import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize services
from database import supabase
from dinero_service import DineroService

dinero_service = DineroService()


def get_enabled_users(supabase_client) -> List[Dict]:
    """Get all users with Dinero connected"""
    try:
        response = supabase_client.table('profiles') \
            .select('id, full_name, dinero_org_id, dinero_access_token_encrypted, dinero_refresh_token_encrypted, dinero_token_expires_at') \
            .eq('is_dinero_connected', True) \
            .execute()
        return response.data or []
    except Exception as e:
        print(f"❌ Error fetching users: {e}")
        return []


def refresh_dinero_token_if_needed(user_profile: Dict, supabase_client) -> Optional[str]:
    """Check and refresh Dinero token if needed, returns decrypted access token"""
    user_id = user_profile['id']
    expires_at = user_profile.get('dinero_token_expires_at', 0)
    
    try:
        # Check if token needs refresh (expired or expiring in next 60 seconds)
        if not expires_at or time.time() > expires_at - 60:
            print(f"   🔄 Token expired, refreshing...")
            
            encrypted_refresh_token = user_profile.get('dinero_refresh_token_encrypted')
            if not encrypted_refresh_token:
                print(f"   ❌ No refresh token found")
                return None
            
            # Decrypt refresh token
            refresh_token = dinero_service.decrypt_token(encrypted_refresh_token, user_id)
            if not refresh_token:
                print(f"   ❌ Failed to decrypt refresh token")
                return None
            
            # Refresh the token
            new_token_data = dinero_service.refresh_access_token(refresh_token)
            
            # Encrypt and save new tokens
            import base64
            encrypted_access = base64.b64encode(dinero_service.encrypt_token(new_token_data['access_token'])).decode('utf-8')
            encrypted_refresh = base64.b64encode(dinero_service.encrypt_token(new_token_data['refresh_token'])).decode('utf-8')
            
            update_payload = {
                'dinero_access_token_encrypted': encrypted_access,
                'dinero_refresh_token_encrypted': encrypted_refresh,
                'dinero_token_expires_at': int(time.time()) + new_token_data.get('expires_in', 3600),
            }
            
            supabase_client.table('profiles').update(update_payload).eq('id', user_id).execute()
            print(f"   ✅ Token refreshed successfully")
            
            return new_token_data['access_token']
        else:
            # Token still valid, decrypt and return
            encrypted_access_token = user_profile.get('dinero_access_token_encrypted')
            access_token = dinero_service.decrypt_token(encrypted_access_token, user_id)
            return access_token
            
    except Exception as e:
        print(f"   ❌ Error refreshing token: {e}")
        return None


def sync_invoices_for_user(user_profile: Dict, supabase_client, full_sync: bool = False) -> Dict[str, int]:
    """Sync invoices for a single user"""
    user_id = user_profile['id']
    user_name = user_profile.get('full_name', 'Unknown')
    org_id = user_profile.get('dinero_org_id')
    
    print(f"\n{'='*60}")
    print(f"👤 User: {user_name} ({user_id[:8]}...)")
    print(f"   Organization ID: {org_id}")
    print(f"{'='*60}")
    
    if not org_id:
        print(f"   ❌ No Dinero organization ID set")
        return {'synced': 0, 'errors': 1}
    
    # Get valid access token
    access_token = refresh_dinero_token_if_needed(user_profile, supabase_client)
    if not access_token:
        print(f"   ❌ Could not get valid access token")
        return {'synced': 0, 'errors': 1}
    
    # Determine sync mode
    changes_since_filter = None
    if not full_sync:
        # Get last sync timestamp for incremental sync
        try:
            last_sync_response = supabase_client.table('invoices') \
                .select('dinero_updated_at') \
                .eq('user_id', user_id) \
                .order('dinero_updated_at', desc=True) \
                .limit(1) \
                .execute()
            
            if last_sync_response.data and last_sync_response.data[0].get('dinero_updated_at'):
                last_sync_timestamp = last_sync_response.data[0]['dinero_updated_at']
                changes_since_filter = datetime.fromisoformat(last_sync_timestamp.replace('Z', '+00:00')).strftime('%Y-%m-%dT%H:%M:%SZ')
                print(f"   📅 Incremental sync since: {changes_since_filter}")
            else:
                print(f"   📅 No previous sync found, doing full sync")
        except Exception as e:
            print(f"   ⚠️  Could not get last sync time: {e}")
    else:
        print(f"   📅 Full sync requested")
    
    # Fetch invoices from Dinero
    print(f"   🔄 Fetching invoices from Dinero...")
    try:
        all_invoices = dinero_service.get_invoices(access_token, org_id, changes_since=changes_since_filter)
        print(f"   📦 Received {len(all_invoices)} invoices from Dinero")
    except Exception as e:
        print(f"   ❌ Error fetching invoices: {e}")
        return {'synced': 0, 'errors': 1}
    
    if not all_invoices:
        print(f"   ✅ No new invoices to sync")
        return {'synced': 0, 'errors': 0}
    
    # Transform invoices for database
    invoices_to_upsert = []
    for inv in all_invoices:
        invoice_data = {
            'user_id': user_id,
            'dinero_guid': inv.get('Guid'),
            'invoice_number': inv.get('Number'),
            'contact_name': inv.get('ContactName'),
            'contact_guid': inv.get('ContactGuid'),
            'status': inv.get('Status'),
            'currency': inv.get('Currency'),
            'total_incl_vat': inv.get('TotalInclVat'),
            'total_excl_vat': inv.get('TotalExclVat'),
            'total_vat': inv.get('TotalVat'),
            'issue_date': inv.get('Date'),
            'payment_date': inv.get('PaymentDate'),
            'dinero_created_at': inv.get('CreatedAt'),
            'dinero_updated_at': inv.get('UpdatedAt'),
            'mail_out_status': inv.get('MailOutStatus'),
            'latest_mail_out_type': inv.get('LatestMailOutType'),
            'raw_details': inv,
            'updated_at': datetime.now().isoformat(),
        }
        invoices_to_upsert.append(invoice_data)
    
    # Upsert to database
    print(f"   💾 Saving {len(invoices_to_upsert)} invoices to database...")
    try:
        response = supabase_client.table('invoices').upsert(
            invoices_to_upsert,
            on_conflict='dinero_guid'
        ).execute()
        
        if hasattr(response, 'error') and response.error:
            print(f"   ❌ Database error: {response.error.message}")
            return {'synced': 0, 'errors': 1}
        
        print(f"   ✅ Successfully synced {len(invoices_to_upsert)} invoices")
        return {'synced': len(invoices_to_upsert), 'errors': 0}
        
    except Exception as e:
        print(f"   ❌ Error saving to database: {e}")
        return {'synced': 0, 'errors': 1}


def main():
    """Main execution"""
    parser = argparse.ArgumentParser(description='Sync invoices from Dinero')
    parser.add_argument('--user-id', type=str, help='Sync for specific user only')
    parser.add_argument('--full-sync', action='store_true', help='Full sync (re-fetch all invoices)')
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🚀 DINERO INVOICE SYNC")
    print("="*60)
    
    if not supabase:
        print("❌ ERROR: Supabase client not initialized. Check your .env file.")
        sys.exit(1)
    
    # Determine which users to process
    if args.user_id:
        print(f"🔧 Single user mode: {args.user_id}")
        try:
            response = supabase.table('profiles') \
                .select('id, full_name, dinero_org_id, dinero_access_token_encrypted, dinero_refresh_token_encrypted, dinero_token_expires_at, is_dinero_connected') \
                .eq('id', args.user_id) \
                .single() \
                .execute()
            
            if not response.data:
                print(f"❌ User not found: {args.user_id}")
                sys.exit(1)
            
            if not response.data.get('is_dinero_connected'):
                print(f"❌ User {args.user_id} does not have Dinero connected")
                sys.exit(1)
            
            users = [response.data]
        except Exception as e:
            print(f"❌ Error fetching user: {e}")
            sys.exit(1)
    else:
        print("🏭 Multi-user mode: All Dinero-connected users")
        users = get_enabled_users(supabase)
        
        if not users:
            print("⚠️  No users with Dinero connected. Exiting.")
            sys.exit(0)
    
    print(f"\n📊 Processing {len(users)} user(s)...")
    
    # Process each user
    total_synced = 0
    total_errors = 0
    start_time = time.time()
    
    for user in users:
        result = sync_invoices_for_user(user, supabase, full_sync=args.full_sync)
        total_synced += result['synced']
        total_errors += result['errors']
    
    elapsed_time = time.time() - start_time
    
    # Final summary
    print(f"\n{'='*60}")
    print(f"🎉 SYNC COMPLETE")
    print(f"{'='*60}")
    print(f"Users processed: {len(users)}")
    print(f"Total invoices synced: {total_synced}")
    print(f"Errors: {total_errors}")
    print(f"Elapsed time: {elapsed_time:.1f} seconds")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
