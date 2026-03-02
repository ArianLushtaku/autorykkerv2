"""
Sync customers/contacts from Dinero API to Supabase.
Handles pagination and incremental syncing using changesSince parameter.
"""
import os
import time
import logging
import requests
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


class CustomerSync:
    """Syncs customers from Dinero API to Supabase."""
    
    def __init__(self, user_id: str, access_token: str, organization_id: str):
        """
        Initialize customer sync.
        
        Args:
            user_id: Supabase user ID
            access_token: Dinero API access token
            organization_id: Dinero organization ID
        """
        self.user_id = user_id
        self.access_token = access_token
        self.organization_id = organization_id
        self.base_url = "https://api.dinero.dk/v1"
        
    def fetch_customers(self, changes_since: Optional[str] = None, page: int = 0, page_size: int = 1000) -> Optional[List[Dict]]:
        """
        Fetch customers from Dinero API with pagination.
        
        Args:
            changes_since: ISO timestamp for incremental sync (YYYY-MM-DDTHH:mm:ssZ)
            page: Page number (0-based)
            page_size: Number of items per page (max 1000)
            
        Returns:
            List of customer dictionaries or None if error
        """
        try:
            url = f"{self.base_url}/{self.organization_id}/contacts"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            # Request all available fields
            fields = [
                'Name', 'ContactGuid', 'ExternalReference', 'IsPerson',
                'Street', 'ZipCode', 'City', 'CountryKey',
                'Phone', 'Email', 'Webpage', 'AttPerson',
                'VatNumber', 'EanNumber',
                'PaymentConditionType', 'PaymentConditionNumberOfDays',
                'IsMember', 'MemberNumber',
                'CompanyStatus', 'VatRegionKey',
                'CreatedAt', 'UpdatedAt', 'DeletedAt',
                'PreferredInvoiceLanguageKey', 'PreferredInvoiceCurrencyKey'
            ]
            
            params = {
                'fields': ','.join(fields),
                'page': page,
                'pageSize': page_size
            }
            
            # Add changesSince if provided for incremental sync
            if changes_since:
                params['changesSince'] = changes_since
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()

                if isinstance(data, dict):
                    # Dinero wraps collections in a "Collection" key
                    customers = data.get('Collection')
                    if customers is None:
                        # Fallback to lower-case key just in case
                        customers = data.get('collection', [])
                    if not isinstance(customers, list):
                        logger.error(
                            f"Unexpected customer payload shape on page {page}: {type(customers)}"
                        )
                        return []
                    logger.info(
                        f"Fetched {len(customers)} customers from page {page} (Collection wrapper)"
                    )
                    return customers

                if isinstance(data, list):
                    logger.info(f"Fetched {len(data)} customers from page {page}")
                    return data

                logger.error(
                    f"Unexpected customer payload type on page {page}: {type(data)}"
                )
                return []
            elif response.status_code == 404:
                logger.info(f"No more customers on page {page}")
                return []
            else:
                logger.error(f"Failed to fetch customers (page {page}): {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout fetching customers (page {page})")
            return None
        except Exception as e:
            logger.error(f"Error fetching customers (page {page}): {e}")
            return None
    
    def fetch_all_customers(self, changes_since: Optional[str] = None) -> List[Dict]:
        """
        Fetch all customers from Dinero API with automatic pagination.
        
        Args:
            changes_since: ISO timestamp for incremental sync
            
        Returns:
            List of all customer dictionaries
        """
        all_customers = []
        page = 0
        page_size = 1000  # Maximum allowed by Dinero API
        
        while True:
            customers = self.fetch_customers(changes_since, page, page_size)
            
            if customers is None:
                # Error occurred
                logger.error(f"Error fetching page {page}, stopping pagination")
                break
            
            if not customers or len(customers) == 0:
                # No more customers
                logger.info(f"No more customers after page {page}")
                break
            
            all_customers.extend(customers)
            logger.info(f"Total customers fetched so far: {len(all_customers)}")
            
            # If we got less than page_size, we're on the last page
            if len(customers) < page_size:
                logger.info(f"Last page reached (got {len(customers)} < {page_size})")
                break
            
            page += 1
            
            # Rate limiting: Dinero allows 100 requests/minute
            # Sleep briefly between pages to avoid hitting limits
            time.sleep(0.1)
        
        return all_customers
    
    def store_customers(self, customers: List[Dict]) -> Dict:
        """
        Store customers in Supabase database.
        
        Args:
            customers: List of customer data from Dinero API
            
        Returns:
            Dictionary with sync statistics
        """
        stats = {
            'total': len(customers),
            'stored': 0,
            'failed': 0
        }
        
        if not customers:
            logger.warning("No customers to store")
            return stats
        
        logger.info(f"Storing {len(customers)} customers in database")
        
        # Prepare customer data for upsert
        customers_to_upsert = []
        for customer in customers:
            try:
                customer_data = {
                    'user_id': self.user_id,
                    'contact_guid': customer.get('ContactGuid'),
                    'external_reference': customer.get('ExternalReference'),
                    'name': customer.get('Name'),
                    'is_person': customer.get('IsPerson', False),
                    'street': customer.get('Street'),
                    'zip_code': customer.get('ZipCode'),
                    'city': customer.get('City'),
                    'country_key': customer.get('CountryKey'),
                    'phone': customer.get('Phone'),
                    'email': customer.get('Email'),
                    'webpage': customer.get('Webpage'),
                    'att_person': customer.get('AttPerson'),
                    'vat_number': customer.get('VatNumber'),
                    'ean_number': customer.get('EanNumber'),
                    'payment_condition_type': customer.get('PaymentConditionType'),
                    'payment_condition_number_of_days': customer.get('PaymentConditionNumberOfDays'),
                    'is_member': customer.get('IsMember', False),
                    'member_number': customer.get('MemberNumber'),
                    'company_status': customer.get('CompanyStatus'),
                    'vat_region_key': customer.get('VatRegionKey'),
                    'preferred_invoice_language_key': customer.get('PreferredInvoiceLanguageKey'),
                    'preferred_invoice_currency_key': customer.get('PreferredInvoiceCurrencyKey'),
                    'dinero_created_at': customer.get('CreatedAt'),
                    'dinero_updated_at': customer.get('UpdatedAt'),
                    'dinero_deleted_at': customer.get('DeletedAt'),
                    'last_synced_at': datetime.utcnow().isoformat()
                }
                customers_to_upsert.append(customer_data)
            except Exception as e:
                logger.error(f"Error preparing customer {customer.get('Name', 'Unknown')}: {e}")
                stats['failed'] += 1
        
        # Batch upsert (update if exists, insert if new)
        try:
            response = supabase.table('customers').upsert(
                customers_to_upsert,
                on_conflict='user_id,contact_guid'
            ).execute()
            
            if hasattr(response, 'error') and response.error:
                logger.error(f"Failed to store customers: {response.error}")
                stats['failed'] = len(customers_to_upsert)
            else:
                stats['stored'] = len(customers_to_upsert)
                logger.info(f"Successfully stored {stats['stored']} customers")
        
        except Exception as e:
            logger.error(f"Error storing customers: {e}")
            stats['failed'] = len(customers_to_upsert)
        
        return stats
    
    def sync(self, changes_since: Optional[str] = None) -> Dict:
        """
        Perform full customer sync from Dinero to Supabase.
        
        Args:
            changes_since: ISO timestamp for incremental sync (YYYY-MM-DDTHH:mm:ssZ)
            
        Returns:
            Dictionary with sync statistics
        """
        start_time = time.time()
        
        sync_type = "INCREMENTAL" if changes_since else "FULL"
        logger.info(f"=== Starting {sync_type} Customer Sync for user {self.user_id} ===")
        if changes_since:
            logger.info(f"Using changesSince filter: {changes_since}")
        
        # Fetch all customers from Dinero
        customers = self.fetch_all_customers(changes_since)
        
        if not customers:
            logger.info("No customers to sync")
            return {
                'total': 0,
                'stored': 0,
                'failed': 0,
                'duration_seconds': time.time() - start_time
            }
        
        # Store in database
        stats = self.store_customers(customers)
        stats['duration_seconds'] = time.time() - start_time
        
        logger.info(f"=== Customer Sync Complete ===")
        logger.info(f"Total: {stats['total']}, Stored: {stats['stored']}, "
                   f"Failed: {stats['failed']}, Duration: {stats['duration_seconds']:.2f}s")
        
        return stats


def get_last_customer_sync_time(user_id: str) -> Optional[str]:
    """
    Get the last time customers were synced for a user.
    
    Returns:
        ISO timestamp string in Dinero format: 'YYYY-MM-DDTHH:mm:ssZ' or None
    """
    try:
        response = supabase.table('customers') \
            .select('last_synced_at') \
            .eq('user_id', user_id) \
            .order('last_synced_at', desc=True) \
            .limit(1) \
            .execute()
        
        if response.data and len(response.data) > 0:
            timestamp = response.data[0]['last_synced_at']
            # Convert to Dinero format: YYYY-MM-DDTHH:mm:ssZ (no microseconds)
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        return None
    except Exception as e:
        logger.error(f"Error getting last customer sync time: {e}")
        return None


def sync_customers_for_user(user_id: str, access_token: str, organization_id: str,
                            changes_since: Optional[str] = None) -> Dict:
    """
    Convenience function to sync customers for a user.
    
    Args:
        user_id: User ID
        access_token: Dinero access token
        organization_id: Dinero organization ID
        changes_since: Optional ISO timestamp for incremental sync
        
    Returns:
        Dictionary with sync statistics
    """
    syncer = CustomerSync(user_id, access_token, organization_id)
    return syncer.sync(changes_since)


if __name__ == "__main__":
    # Test sync
    import sys
    
    if len(sys.argv) < 4:
        print("Usage: python sync_customers.py <user_id> <access_token> <organization_id>")
        sys.exit(1)
    
    user_id = sys.argv[1]
    access_token = sys.argv[2]
    organization_id = sys.argv[3]
    
    stats = sync_customers_for_user(user_id, access_token, organization_id)
    print(f"\nSync completed: {stats}")
