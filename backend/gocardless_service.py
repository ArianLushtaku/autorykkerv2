import os
import logging
import requests
import base64
import time
from cryptography.fernet import Fernet
import threading
from database import supabase # Import supabase client to re-fetch profile


class GoCardlessTokenExpiredError(Exception):
    """Raised when the GoCardless refresh token has expired and user needs to re-authenticate."""
    pass


class GoCardlessService:
    BASE_URL = "https://bankaccountdata.gocardless.com/api/v2"
    _user_locks = {}
    _dict_lock = threading.Lock()

    def __init__(self):
        """Initializes a stateless service."""
        logging.info("Initializing GoCardlessService...")
        self.secret_id = os.getenv("GOCARDLESS_SECRET_ID")
        self.secret_key = os.getenv("GOCARDLESS_SECRET_KEY")

        if not self.secret_id:
            logging.error("GoCardlessService: GOCARDLESS_SECRET_ID environment variable not found.")
        else:
            logging.info("GoCardlessService: GOCARDLESS_SECRET_ID loaded successfully.")

        if not self.secret_key:
            logging.error("GoCardlessService: GOCARDLESS_SECRET_KEY environment variable not found.")
        else:
            logging.info("GoCardlessService: GOCARDLESS_SECRET_KEY loaded successfully.")
        self.encryption_key = os.getenv("ENCRYPTION_KEY").encode()
        self.fernet = Fernet(self.encryption_key)
        # self.access_token is no longer set on init; it's fetched dynamically.

    def encrypt_token(self, token):
        """Encrypts a token string and returns the encrypted bytes."""
        return self.fernet.encrypt(token.encode())

    def decrypt_token(self, encrypted_token_b64, user_id_for_logging='N/A'):
        """Decrypts a Base64 encoded encrypted token."""
        if not encrypted_token_b64:
            return None
        try:
            encrypted_token_bytes = base64.b64decode(encrypted_token_b64.encode('utf-8'))
            return self.fernet.decrypt(encrypted_token_bytes).decode()
        except Exception as e:
            logging.error(f"Failed to decrypt token for user {user_id_for_logging}: {e}")
            return None

    def _get_headers(self, access_token):
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    def _make_request(self, method, endpoint, **kwargs):
        # This method now relies on the decorator in app.py to provide a valid token.
        # The decorator will call get_valid_access_token.
        access_token = kwargs.pop('access_token') # The decorator must inject this.
        url = f"{self.BASE_URL}/{endpoint}/"
        headers = self._get_headers(access_token)
        response = requests.request(method, url, headers=headers, **kwargs)
        try:
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # Log the detailed error message from GoCardless API response
            logging.error(f"HTTP Error making request to {url}: {e.response.status_code} - {e.response.text}")
            
            # Handle rate limit errors (429) with detailed message
            if e.response.status_code == 429:
                try:
                    error_data = e.response.json()
                    detail = error_data.get('detail', 'Rate limit exceeded')
                    
                    # Extract retry time from detail message
                    import re
                    match = re.search(r'(\d+) seconds', detail)
                    if match:
                        seconds = int(match.group(1))
                        hours = seconds / 3600
                        logging.warning(f"GoCardless rate limit hit. Retry after {hours:.1f} hours ({seconds} seconds)")
                    
                    # Create a custom exception with the rate limit info
                    rate_limit_error = requests.exceptions.HTTPError(
                        f"GoCardless rate limit exceeded: {detail}",
                        response=e.response
                    )
                    rate_limit_error.is_rate_limit = True
                    rate_limit_error.retry_after_seconds = seconds if match else None
                    raise rate_limit_error
                except (ValueError, KeyError):
                    pass
            
            raise

    def create_access_token(self):
        """Gets the initial access and refresh token pair from GoCardless."""
        url = f"{self.BASE_URL}/token/new/"
        payload = {
            "secret_id": self.secret_id,
            "secret_key": self.secret_key
        }
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        token_data = response.json()
        # Calculate the absolute expiry time for the access token
        token_data['access_expires_at'] = int(time.time()) + token_data['access_expires']
        return token_data

    def refresh_access_token(self, refresh_token):
        """Refreshes the access token using a refresh token."""
        url = f"{self.BASE_URL}/token/refresh/"
        payload = {"refresh": refresh_token}
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        response = requests.post(url, json=payload, headers=headers)
        
        # Handle expired refresh token (401 Unauthorized)
        if response.status_code == 401:
            logging.error("GoCardless refresh token has expired. User needs to re-authenticate.")
            raise GoCardlessTokenExpiredError("Refresh token expired. Please reconnect your bank account.")
        
        response.raise_for_status()
        token_data = response.json()
        token_data['access_expires_at'] = int(time.time()) + token_data['access_expires']
        # GoCardless doesn't return a new refresh token - the old one stays valid
        # So we add it back to the response
        token_data['refresh'] = refresh_token
        return token_data

    def _get_user_lock(self, user_id):
        with self._dict_lock:
            if user_id not in self._user_locks:
                self._user_locks[user_id] = threading.Lock()
            return self._user_locks[user_id]

    def get_valid_access_token(self, user_profile):
        """
        Checks if the access token is valid, refreshes it if not, and returns a valid token.
        Returns a tuple: (access_token, new_token_payload_for_supabase)
        The second element is None if the token was not refreshed.
        """
        user_id = user_profile['id']
        user_lock = self._get_user_lock(user_id)

        with user_lock:
            # Re-fetch the profile within the lock to get the most up-to-date token info
            try:
                profile_response = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
                if not profile_response.data:
                    raise Exception(f"User profile {user_id} not found in database.")
                fresh_user_profile = profile_response.data
            except Exception as e:
                logging.error(f"Failed to re-fetch profile for user {user_id}: {e}")
                fresh_user_profile = user_profile # Fallback to the provided profile

            expires_at = fresh_user_profile.get('gocardless_token_expires_at', 0)
            refresh_token_created_at = fresh_user_profile.get('gocardless_refresh_token_created_at', 0)
            
            # GoCardless refresh tokens expire after 30 days from CREATION (not last use)
            # We proactively get new tokens if refresh token is older than 25 days
            REFRESH_TOKEN_MAX_AGE = 25 * 24 * 60 * 60  # 25 days in seconds
            refresh_token_expired = refresh_token_created_at and (time.time() - refresh_token_created_at > REFRESH_TOKEN_MAX_AGE)
            
            if refresh_token_expired:
                logging.info(f"GoCardless refresh token for user {user_id} is older than 25 days. Getting new token pair.")
                new_token_data = self.create_access_token()
                update_payload = {
                    'gocardless_token': base64.b64encode(self.encrypt_token(new_token_data['access'])).decode('utf-8'),
                    'gocardless_refresh_token_encrypted': base64.b64encode(self.encrypt_token(new_token_data['refresh'])).decode('utf-8'),
                    'gocardless_token_expires_at': new_token_data['access_expires_at'],
                    'gocardless_refresh_token_created_at': int(time.time())  # Track when refresh token was created
                }
                return new_token_data['access'], update_payload
            elif not expires_at or time.time() > expires_at - 60:
                logging.info(f"GoCardless access token for user {user_id} has expired or is expiring. Refreshing.")
                encrypted_refresh_token_b64 = fresh_user_profile.get('gocardless_refresh_token_encrypted')
                if not encrypted_refresh_token_b64:
                    # This case handles initial token creation where no refresh token exists yet.
                    logging.info("No GoCardless refresh token found, creating initial token set.")
                    new_token_data = self.create_access_token()
                    update_payload = {
                        'gocardless_token': base64.b64encode(self.encrypt_token(new_token_data['access'])).decode('utf-8'),
                        'gocardless_refresh_token_encrypted': base64.b64encode(self.encrypt_token(new_token_data['refresh'])).decode('utf-8'),
                        'gocardless_token_expires_at': new_token_data['access_expires_at'],
                        'gocardless_refresh_token_created_at': int(time.time())
                    }
                else:
                    # Standard refresh flow.
                    refresh_token = self.decrypt_token(encrypted_refresh_token_b64, user_id)
                    if not refresh_token:
                        raise Exception("Failed to decrypt GoCardless refresh token.")
                    new_token_data = self.refresh_access_token(refresh_token)
                    update_payload = {
                        'gocardless_token': base64.b64encode(self.encrypt_token(new_token_data['access'])).decode('utf-8'),
                        'gocardless_refresh_token_encrypted': base64.b64encode(self.encrypt_token(new_token_data['refresh'])).decode('utf-8'),
                        'gocardless_token_expires_at': new_token_data['access_expires_at']
                    }
                return new_token_data['access'], update_payload
            else:
                # Token is still valid, just decrypt and return it.
                encrypted_access_token_b64 = fresh_user_profile.get('gocardless_token')
                access_token = self.decrypt_token(encrypted_access_token_b64, user_id)
                return access_token, None

    def get_institutions(self, access_token, country_code='GB'):
        return self._make_request('GET', 'institutions', params={'country': country_code}, access_token=access_token)

    def create_agreement(self, access_token, institution_id, max_historical_days=None):
        # First, get the institution's limits
        institutions = self.get_institutions(access_token, country_code='DK')
        institution = next((i for i in institutions if i['id'] == institution_id), None)
        
        # Use institution's max if not specified, default to 90 if not found
        if max_historical_days is None:
            if institution and 'transaction_total_days' in institution:
                max_historical_days = min(int(institution['transaction_total_days']), 730)
            else:
                max_historical_days = 90  # Safe default
        
        # Get max access days from institution or default to 90
        max_access_days = 90
        if institution and 'max_access_valid_for_days' in institution:
            max_access_days = min(int(institution['max_access_valid_for_days']), 180)
        
        logging.info(f"Creating agreement for {institution_id}: max_historical_days={max_historical_days}, access_valid_for_days={max_access_days}")
        
        payload = {
            "institution_id": institution_id,
            "max_historical_days": max_historical_days,
            "access_valid_for_days": max_access_days,
            "access_scope": ["balances", "details", "transactions"]
        }
        return self._make_request('POST', 'agreements/enduser', json=payload, access_token=access_token)

    def create_requisition(self, access_token, institution_id, redirect_uri, reference, agreement_id):
        payload = {
            "institution_id": institution_id,
            "redirect": redirect_uri,
            "reference": reference,
            "agreement": agreement_id,
            "user_language": "EN"
        }
        return self._make_request('POST', 'requisitions', json=payload, access_token=access_token)

    def get_requisition_by_id(self, access_token, requisition_id):
        return self._make_request('GET', f'requisitions/{requisition_id}', access_token=access_token)

    def get_account_balances(self, access_token, account_id):
        return self._make_request('GET', f'accounts/{account_id}/balances', access_token=access_token)

    def get_account_details(self, access_token, account_id):
        return self._make_request('GET', f'accounts/{account_id}/details', access_token=access_token)

    def get_account_transactions(self, access_token, account_id, date_from=None, date_to=None):
        """
        Fetch transactions for an account with optional date filtering.
        
        Args:
            access_token: GoCardless access token
            account_id: Account ID to fetch transactions for
            date_from: Start date in YYYY-MM-DD format (optional)
            date_to: End date in YYYY-MM-DD format (optional)
        """
        params = {}
        if date_from:
            params['date_from'] = date_from
        if date_to:
            params['date_to'] = date_to
            
        return self._make_request('GET', f'accounts/{account_id}/transactions', 
                                 params=params, access_token=access_token)
