import os
import requests
import time
import logging
import base64
from cryptography.fernet import Fernet
import threading
from database import supabase

class DineroService:
    _user_locks = {}
    _dict_lock = threading.Lock()

    def __init__(self):
        logging.info("Initializing DineroService...")
        self.client_id = os.getenv("DINERO_CLIENT_ID")
        self.client_secret = os.getenv("DINERO_CLIENT_SECRET")

        if not self.client_id:
            logging.error("DineroService: DINERO_CLIENT_ID environment variable not found.")
        else:
            logging.info("DineroService: DINERO_CLIENT_ID loaded successfully.")

        if not self.client_secret:
            logging.error("DineroService: DINERO_CLIENT_SECRET environment variable not found.")
        else:
            logging.info("DineroService: DINERO_CLIENT_SECRET loaded successfully.")
        self.api_key = os.getenv("DINERO_API_KEY")
        self.auth_url = 'https://connect.visma.com/connect/authorize'
        self.token_url = 'https://connect.visma.com/connect/token'
        self.base_url = 'https://api.dinero.dk'
        
        encryption_key = os.getenv('ENCRYPTION_KEY')
        if not encryption_key:
            raise ValueError("ENCRYPTION_KEY not set in environment.")
        self.cipher = Fernet(encryption_key.encode())

    def get_authorization_url(self, redirect_uri, state):
        scopes = 'dineropublicapi:read dineropublicapi:write offline_access'
        params = {
            'client_id': self.client_id,
            'scope': scopes,
            'response_type': 'code',
            'redirect_uri': redirect_uri,
            'state': state,
            'ui_locales': 'da-DK'
        }
        req = requests.Request('GET', self.auth_url, params=params)
        return req.prepare().url

    def exchange_code_for_tokens(self, code, redirect_uri):
        payload = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        response = requests.post(self.token_url, data=payload, headers=headers)
        response.raise_for_status()
        token_data = response.json()
        token_data['expires_at'] = int(time.time()) + token_data['expires_in']
        return token_data

    def _get_auth_headers(self, access_token):
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

    def refresh_access_token(self, refresh_token):
        payload = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        response = requests.post(self.token_url, data=payload, headers=headers)
        response.raise_for_status()
        token_data = response.json()
        token_data['expires_at'] = int(time.time()) + token_data['expires_in']
        return token_data

    def get_organizations(self, user_api_key):
        # For this specific endpoint, the user's token is used for both the bearer token and the api_key param.
        headers = self._get_auth_headers(user_api_key)
        params = {'api_key': user_api_key}
        url = f"{self.base_url}/v1.1/organizations"
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            logging.error(f"Dinero API error fetching organizations. Status: {e.response.status_code}, Details: {e.response.text}")
            return {'error': 'Failed to fetch organizations', 'details': e.response.text}
        except Exception as e:
            logging.error(f"Unexpected error fetching organizations: {e}")
            return {'error': 'An unexpected error occurred'}

    def get_invoices(self, access_token, organization_id, changes_since=None):
        all_invoices = []
        page = 0
        page_size = 1000  # Max allowed page size

        # Define the fields and status filter as requested
        fields = "Guid,ContactName,Date,Description,PaymentDate,Status,ExternalReference,Number,ContactGuid,Currency,MailOutStatus,LatestMailOutType,TotalExclVatInDkk,TotalInclVatInDkk,TotalExclVat,TotalInclVat,CreatedAt,UpdatedAt,DeletedAt"
        status_filter = "Paid,Booked,OverPaid,OverDue"

        while True:
            params = {
                'pageSize': page_size,
                'page': page,
                'fields': fields,
                'statusFilter': status_filter,
            }
            if changes_since:
                params['changesSince'] = changes_since

            url = f"{self.base_url}/v1/{organization_id}/invoices"
            headers = self._get_auth_headers(access_token)
            
            logging.info(f"Requesting Dinero invoices from {url} with params: {params}")
            response = requests.get(url, headers=headers, params=params)
            logging.info(f"Dinero API response status: {response.status_code}")
            logging.info(f"Dinero API response content: {response.text[:500]}...") # Log first 500 chars

            response.raise_for_status()
            data = response.json()
            
            invoices = data.get('Collection', [])
            
            # If the collection is empty, we've reached the last page.
            if not invoices:
                break

            all_invoices.extend(invoices)
            page += 1

        return all_invoices

    def get_invoice_details(self, access_token, organization_id, guid):
        url = f"{self.base_url}/v1/{organization_id}/invoices/{guid}"
        headers = self._get_auth_headers(access_token)
        headers['Accept'] = 'application/json'
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

    def encrypt_token(self, token):
        return self.cipher.encrypt(token.encode())

    def decrypt_token(self, encrypted_token_b64, user_id_for_logging='N/A'):
        if not encrypted_token_b64:
            return None
        encrypted_token_bytes = base64.b64decode(encrypted_token_b64.encode('utf-8'))
        return self.cipher.decrypt(encrypted_token_bytes).decode()

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
            # This prevents a race condition where another thread has already refreshed the token
            try:
                profile_response = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
                if not profile_response.data:
                    raise Exception(f"User profile {user_id} not found in database.")
                fresh_user_profile = profile_response.data
            except Exception as e:
                logging.error(f"Failed to re-fetch profile for user {user_id}: {e}")
                # Fallback to the provided profile, but the risk of race condition remains
                fresh_user_profile = user_profile

            expires_at = fresh_user_profile.get('dinero_token_expires_at', 0)
            
            if time.time() > expires_at - 60: # Refresh if expiring in the next 60 seconds
                logging.info(f"Dinero token for user {user_id} has expired or is expiring soon. Refreshing.")
                
                refresh_token = self.decrypt_token(fresh_user_profile.get('dinero_refresh_token_encrypted'), user_id)
                if not refresh_token:
                    raise Exception("Cannot refresh Dinero token: No refresh token found.")
                
                new_token_data = self.refresh_access_token(refresh_token)
                
                update_payload = {
                    'dinero_access_token_encrypted': base64.b64encode(self.encrypt_token(new_token_data['access_token'])).decode('utf-8'),
                    'dinero_refresh_token_encrypted': base64.b64encode(self.encrypt_token(new_token_data['refresh_token'])).decode('utf-8'),
                    'dinero_token_expires_at': new_token_data['expires_at']
                }
                
                return new_token_data['access_token'], update_payload
            else:
                access_token = self.decrypt_token(fresh_user_profile.get('dinero_access_token_encrypted'), user_id)
                return access_token, None

    def send_pre_reminder(self, access_token, organization_id, invoice_guid):
        """
        Send a pre-reminder (Påmindelse) for an overdue invoice.
        
        Args:
            access_token: Valid Dinero access token
            organization_id: Dinero organization ID
            invoice_guid: GUID of the invoice to send reminder for
            
        Returns:
            dict: Response from Dinero API
            
        Raises:
            requests.exceptions.HTTPError: If the API request fails
        """
        url = f"{self.base_url}/v1/{organization_id}/invoices/{invoice_guid}/email/pre-reminder"
        headers = self._get_auth_headers(access_token)
        
        payload = {
            "timestamp": None,
            "addVoucherAsPdfAttachment": True,
            "shouldAddTrustPilotEmailAsBcc": False
        }
        
        logging.info(f"Sending pre-reminder for invoice {invoice_guid}")
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        logging.info(f"Pre-reminder sent successfully for invoice {invoice_guid}")
        return response.json() if response.text else {"success": True}

    def send_reminder(self, access_token, organization_id, invoice_guid, invoice_number, 
                     invoice_issue_date, reminder_number, timestamp=None):
        """
        Send a reminder (Rykker 1/2/3) for an overdue invoice.
        This is a 3-step process:
        1. Add reminder (create draft)
        2. Book reminder (make it official)
        3. Send email (actually send it)
        
        Args:
            access_token: Valid Dinero access token
            organization_id: Dinero organization ID
            invoice_guid: GUID of the invoice to send reminder for
            invoice_number: Invoice number for description
            invoice_issue_date: Invoice issue date (datetime object) for description
            reminder_number: Which reminder (1, 2, or 3)
            timestamp: Optional timestamp for validation (defaults to None for latest)
            
        Returns:
            dict: Response from Dinero API with reminder details
            
        Raises:
            requests.exceptions.HTTPError: If the API request fails
        """
        from datetime import datetime
        
        headers = self._get_auth_headers(access_token)
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Format issue date as DD-MM-YYYY for description
        issue_date_formatted = invoice_issue_date.strftime('%d-%m-%Y')
        
        # Build description
        description = (
            f"Vedr. vort tilgodehavende i henhold til faktura {invoice_number} af fakturadato {issue_date_formatted}\n\n"
            f"Vi kan desværre konstatere, at vi ikke har modtaget betaling af vort tilgodehavende i henhold til "
            f"ovennævnte faktura. Vi skal derfor venligst bede dig om at indbetale vort tilgodehavende så hurtigt "
            f"som muligt til nedenstående bankkonto."
        )
        
        # STEP 1: Add reminder (create draft)
        logging.info(f"Step 1/3: Adding Rykker {reminder_number} draft for invoice {invoice_guid}")
        add_url = f"{self.base_url}/v1/{organization_id}/invoices/{invoice_guid}/reminders"
        
        add_payload = {
            "timestamp": timestamp or "",  # Empty string if None
            "date": today,
            "title": f"Rykker {reminder_number}",
            "description": description,
            "withDebtCollectionWarning": reminder_number >= 3,  # Only for Rykker 3
            "withFee": True,
            "withInterestFee": True,
            "withCompensationFee": True
        }
        
        logging.debug(f"Add reminder payload: {add_payload}")
        add_response = requests.post(add_url, headers=headers, json=add_payload)
        add_response.raise_for_status()
        add_data = add_response.json()
        
        reminder_id = add_data.get('id')  # lowercase
        new_timestamp = add_data.get('timestamp')  # lowercase
        
        logging.info(f"✅ Reminder draft created with ID: {reminder_id}")
        logging.debug(f"   Response: {add_data}")
        
        # STEP 2: Book reminder (make it official)
        logging.info(f"Step 2/3: Booking Rykker {reminder_number} (ID: {reminder_id})")
        book_url = f"{self.base_url}/v1/{organization_id}/invoices/{invoice_guid}/reminders/{reminder_id}/book"
        
        book_payload = {
            "timestamp": new_timestamp
        }
        
        logging.debug(f"Book reminder payload: {book_payload}")
        book_response = requests.post(book_url, headers=headers, json=book_payload)
        book_response.raise_for_status()
        book_data = book_response.json()
        
        final_timestamp = book_data.get('timestamp')  # lowercase
        
        logging.info(f"✅ Reminder booked successfully")
        logging.debug(f"   Response: {book_data}")
        
        # STEP 3: Send email
        logging.info(f"Step 3/3: Sending Rykker {reminder_number} email")
        email_url = f"{self.base_url}/v1/{organization_id}/invoices/{invoice_guid}/reminders/email"
        
        email_payload = {
            "timestamp": None,  # Use latest version
            "addVoucherAsPdfAttachment": True,
            "shouldAddTrustPilotEmailAsBcc": False
        }
        
        logging.debug(f"Send email payload: {email_payload}")
        email_response = requests.post(email_url, headers=headers, json=email_payload)
        email_response.raise_for_status()
        
        logging.info(f"✅ Rykker {reminder_number} sent successfully for invoice {invoice_guid}")
        
        return {
            "success": True,
            "reminder_id": reminder_id,
            "reminder_number": reminder_number,
            "timestamp": final_timestamp
        }
