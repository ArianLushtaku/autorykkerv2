import os
import time
import json
import logging
import base64
import requests
import stripe
from functools import wraps
from flask import Flask, redirect, url_for, session, request, jsonify
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from database import supabase
import sys
from requests.exceptions import HTTPError
from datetime import datetime, timezone, timedelta

# Import services
from gocardless_service import GoCardlessService
from dinero_service import DineroService
from dinero_payment_service import DineroPaymentService
from sync_reminder_fees import sync_reminder_fees_for_user, get_last_reminder_sync_time
from sync_customers import sync_customers_for_user, get_last_customer_sync_time

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)

# --- Flask App Initialization ---
app = Flask(__name__)

# --- Rate Limiting ---
# Prevents abuse by limiting requests per IP
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],  # Default limits for all routes
    storage_uri="memory://",  # Use Redis in production: "redis://localhost:6379"
)

# --- Health Check Endpoint ---
@app.route('/')
def health_check():
    return jsonify({'status': 'ok', 'message': 'Backend is healthy'}), 200
# --- CORS Configuration ---
# Allow multiple origins by splitting the FRONTEND_URL environment variable.
# This supports custom domains, www subdomains, and Render preview URLs.
frontend_url_str = os.environ.get('FRONTEND_URL', '')
if not frontend_url_str:
    logging.warning("FRONTEND_URL environment variable not set. CORS may not work correctly.")
    allowed_origins = []
else:
    allowed_origins = [url.strip() for url in frontend_url_str.split(',') if url.strip()]

logging.info(f"CORS configured for the following origins: {allowed_origins}")
CORS(app, supports_credentials=True, origins=allowed_origins, allow_headers=['Content-Type', 'Authorization'])
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_very_secret_key')

# Supabase client is now initialized in database.py and imported.

# Instantiate services globally. They are now stateless.
dinero_service = DineroService()
gocardless_service = GoCardlessService()

# --- Auth Decorator ---

def refresh_dinero_token_if_needed(f):
    @wraps(f)
    def decorated_function(current_user, *args, **kwargs):
        # Proactively check if the token needs to be refreshed.
        access_token, update_payload = dinero_service.get_valid_access_token(current_user)

        if not access_token:
            app.logger.error(f"Could not obtain a valid Dinero access token for user {current_user['id']}.")
            return jsonify({'error': 'Failed to authenticate with Dinero. Please try reconnecting the service.'}), 401

        # If the token was refreshed, update the user's profile in Supabase.
        if update_payload:
            app.logger.info(f"Dinero token was refreshed for user {current_user['id']}. Updating profile.")
            try:
                supabase.table('profiles').update(update_payload).eq('id', current_user['id']).execute()
                # Also update the local current_user object to reflect the changes immediately
                current_user.update(update_payload)
            except Exception as e:
                app.logger.error(f"Failed to save refreshed Dinero token for user {current_user['id']}: {e}", exc_info=True)
                # Decide if you should proceed with a potentially stale token or fail.
                # For now, we'll fail to prevent inconsistent state.
                return jsonify({'error': 'Failed to save refreshed token.'}), 500

        # Add the decrypted token to the user object for the decorated function to use.
        current_user['decrypted_dinero_token'] = access_token

        # Now, execute the decorated function.
        try:
            return f(current_user, *args, **kwargs)
        except HTTPError as e:
            # This handles cases where the token might be revoked or invalid for other reasons
            # even after passing the expiry check.
            app.logger.error(f"HTTPError occurred for user {current_user['id']} after token check: {e}", exc_info=True)
            return jsonify({'error': 'An API error occurred with Dinero.', 'details': str(e)}), e.response.status_code
        except Exception as e:
            app.logger.error(f"An unexpected error occurred in a Dinero-protected route for user {current_user['id']}: {e}", exc_info=True)
            return jsonify({'error': 'An unexpected error occurred.'}), 500
    return decorated_function

def user_required(f):
    """
    Decorator to protect routes. It validates the user's JWT with Supabase Auth
    and fetches their profile, ensuring they are authenticated and active.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            app.logger.warning("Access attempt with missing or invalid Authorization header.")
            return jsonify({'error': 'Unauthorized: Missing or invalid Authorization header'}), 401

        jwt = auth_header.split('Bearer ')[1]
        
        try:
            # This call validates the JWT with Supabase. It will fail if the token is invalid,
            # expired, or if the user has been disabled or deleted.
            auth_response = supabase.auth.get_user(jwt)
            user = auth_response.user
            if not user:
                app.logger.warning(f"Auth successful but no user object returned for JWT.")
                return jsonify({'error': 'Unauthorized: User not found'}), 401

            # Now that the user is authenticated, fetch their full profile from the 'profiles' table.
            profile_response = supabase.table('profiles').select('*').eq('id', user.id).single().execute()
            
            if not profile_response.data:
                app.logger.error(f"CRITICAL: User {user.id} is authenticated but has no profile.")
                return jsonify({'error': 'Unauthorized: User profile not found'}), 401

            # The user object passed to routes is now the full profile dictionary.
            # The original Supabase user object is available via profile_response.data['user'] if needed.
            current_user_profile = profile_response.data

        except Exception as e:
            # This will catch errors from supabase.auth.get_user() for invalid tokens,
            # as well as any other exceptions.
            app.logger.error(f"Auth error: {e}", exc_info=True)
            return jsonify({'error': 'Unauthorized: Invalid token or user session.'}), 401
        
        return f(current_user_profile, *args, **kwargs)
    return decorated_function

def refresh_gocardless_token_if_needed(f):
    @wraps(f)
    def decorated_function(current_user, *args, **kwargs):
        from gocardless_service import GoCardlessTokenExpiredError
        try:
            # Use the global stateless service
            access_token, update_payload = gocardless_service.get_valid_access_token(current_user)

            if not access_token:
                app.logger.error(f"Could not obtain a valid GoCardless access token for user {current_user['id']}.")
                return jsonify({'error': 'Failed to authenticate with GoCardless.'}), 401

            if update_payload:
                app.logger.info(f"GoCardless token was refreshed for user {current_user['id']}. Updating profile.")
                supabase.table('profiles').update(update_payload).eq('id', current_user['id']).execute()
                current_user.update(update_payload)

            # Inject the valid token into the user object for the route to use.
            current_user['decrypted_gocardless_token'] = access_token
            return f(current_user, *args, **kwargs)
        except GoCardlessTokenExpiredError as e:
            # Refresh token expired - mark connection as disconnected and inform user
            app.logger.warning(f"GoCardless refresh token expired for user {current_user['id']}. User needs to reconnect.")
            supabase.table('profiles').update({
                'is_gocardless_connected': False,
                'gocardless_token': None,
                'gocardless_refresh_token_encrypted': None,
                'gocardless_token_expires_at': None
            }).eq('id', current_user['id']).execute()
            return jsonify({
                'error': 'Bank connection expired. Please reconnect your bank account.',
                'code': 'GOCARDLESS_TOKEN_EXPIRED',
                'reconnect_required': True
            }), 401
        except HTTPError as e:
            app.logger.error(f"HTTPError during GoCardless operation for user {current_user['id']}: {e}", exc_info=True)
            return jsonify({'error': 'An API error occurred with GoCardless.', 'details': str(e)}), e.response.status_code
        except Exception as e:
            app.logger.error(f"An unexpected error in a GoCardless-protected route for user {current_user['id']}: {e}", exc_info=True)
            return jsonify({'error': 'An unexpected GoCardless error occurred.'}), 500
    return decorated_function

# --- User Management API ---
@app.route('/users', methods=['POST'])
@user_required
def create_user(current_user):
    """
    This endpoint is called by the frontend to ensure a user profile exists.
    It's protected and uses the authenticated user's ID to verify the profile.
    """
    user_id = current_user.get('id')

    # The decorator already confirms the user, so we can directly return success.
    # The original logic of checking the profile is redundant if the user_required decorator
    # successfully fetches the user profile.
    app.logger.info(f"User profile confirmed for user_id: {user_id}")
    return jsonify({'message': 'User profile confirmed'}), 200

@app.route('/reminders/metrics', methods=['GET'])
@user_required
def get_reminder_metrics(current_user):
    try:
        user_id = current_user['id']
        
        # Explicitly filter by user_id to prevent data leakage. Do not rely on implicit RLS.
        response = supabase.table('reminder_metrics').select('*').eq('user_id', user_id).execute()

        if response.data and len(response.data) > 0:
            metrics = response.data[0]
            return jsonify({
                'active_reminders_count': metrics.get('active_reminders_count', 0),
                'active_reminders_total_amount': metrics.get('active_reminders_total_amount', 0),
                'overdue_reminders_count': metrics.get('overdue_reminders_count', 0)
            })
        else:
            # If no record is found, return zeroed-out metrics
            return jsonify({
                'active_reminders_count': 0,
                'active_reminders_total_amount': 0,
                'overdue_reminders_count': 0
            })

    except Exception as e:
        app.logger.error(f"Error fetching reminder metrics for user {user_id}: {e}")
        return jsonify({'error': 'An error occurred while fetching reminder metrics.'}), 500

@app.route('/reminders/overview', methods=['GET'])
@user_required
def get_reminder_overview_metrics(current_user):
    user_id = current_user['id']
    try:
        # Explicitly filter by user_id to prevent data leakage. Do not rely on implicit RLS.
        response = supabase.table('reminder_metrics').select('*').eq('user_id', user_id).execute()
        
        app.logger.info(f"Reminder metrics response for user {user_id}: {response.data}")

        if response.data and len(response.data) > 0:
            metrics = response.data[0]
            return jsonify({
                'active_reminders_count': metrics.get('active_reminders_count', 0),
                'sent_this_month_count': metrics.get('sent_this_month_count', 0),
                'ignored_reminders_count': metrics.get('ignored_reminders_count', 0),
                'overdue_reminders_count': metrics.get('overdue_reminders_count', 0),
                'success_rate': metrics.get('success_rate_percent', 0.0),
                'sent_this_month_change': metrics.get('sent_growth_percent', 0.0),
                'ignored_reminders_change': metrics.get('ignored_growth_percent', 0.0),
                'overdue_reminders_change': metrics.get('overdue_growth_percent', 0.0)
            })
        else:
            app.logger.warning(f"No reminder metrics data found for user {user_id}. Returning default zero values.")
            return jsonify({
                'active_reminders_count': 0,
                'sent_this_month_count': 0,
                'ignored_reminders_count': 0,
                'overdue_reminders_count': 0,
                'success_rate': 0.0,
                'sent_this_month_change': 0.0,
                'ignored_reminders_change': 0.0,
                'overdue_reminders_change': 0.0
            })

    except Exception as e:
        app.logger.error(f"Error fetching reminder overview for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': 'Could not fetch reminder overview metrics'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    # Log the exception and return a generic 500 error
    app.logger.error(f"An unhandled exception occurred: {e}", exc_info=True)
    return jsonify(error="An internal server error occurred."), 500

# --- GoCardless API Endpoints ---
@app.route('/institutions', methods=['GET'])
@user_required
@refresh_gocardless_token_if_needed
def get_institutions(current_user):
    country_code = request.args.get('country', 'GB')
    access_token = current_user['decrypted_gocardless_token']
    institutions = gocardless_service.get_institutions(access_token, country_code)
    return jsonify(institutions)

@app.route('/create-auth-link', methods=['POST'])
@user_required
@refresh_gocardless_token_if_needed
def create_auth_link(current_user):
    data = request.get_json()
    institution_id = data.get('institution_id')
    if not institution_id:
        return jsonify({'error': 'institution_id is required'}), 400

    access_token = current_user['decrypted_gocardless_token']
    # The redirect URI must now point to our backend callback.


    user_id_str = str(current_user['id'])
    # Store the user's ID in the session to identify them in the callback
    # Save the correct requisition ID to the user's profile immediately.
    unique_reference = f"{user_id_str}-{int(time.time())}"

    try:
        serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
        state_token = serializer.dumps(user_id_str)

        # Use API_BASE_URL from environment for callback (works in dev and production)
        api_base_url = os.environ.get('API_BASE_URL', 'http://localhost:5003')
        base_redirect_uri = f"{api_base_url}/gocardless/auth/callback"
        redirect_uri_with_state = f"{base_redirect_uri}?state={state_token}"

        agreement = gocardless_service.create_agreement(access_token, institution_id)
        agreement_id = agreement['id']

        requisition = gocardless_service.create_requisition(
            access_token,
            institution_id,
            redirect_uri_with_state, # Pass the URI with the state token here
            unique_reference,
            agreement_id
        )

        # Save the requisition ID to bank_connections table
        requisition_id = requisition['id']
        try:
            # Create bank connection record
            connection_data = {
                'user_id': user_id_str,
                'requisition_id': requisition_id,
                'institution_id': institution_id,
                'status': 'active'
            }
            supabase.table('bank_connections').insert(connection_data).execute()
            
            # Also update profiles for backward compatibility
            supabase.table('profiles').update({'gocardless_requisition_id': requisition_id}).eq('id', user_id_str).execute()
            
            app.logger.info(f"Successfully created bank connection {requisition_id} for user {user_id_str}")
        except Exception as e:
            app.logger.error(f"Failed to create bank connection for user {user_id_str}: {e}", exc_info=True)
            return jsonify({'error': 'Failed to save bank connection.'}), 500



        # The frontend just needs the link to redirect the user.
        return jsonify({'link': requisition['link']})
    except HTTPError as e:
        error_details = e.response.text
        app.logger.error(f"GoCardless API error during auth link creation. Status: {e.response.status_code}, Details: {error_details}", exc_info=True)
        return jsonify({'error': 'Failed to create authorization link due to API error.'}), 500
    except Exception as e:
        app.logger.error(f"An unexpected error occurred creating GoCardless auth link: {e}", exc_info=True)
        return jsonify({'error': 'Failed to create authorization link due to an internal error.'}), 500

@app.route('/gocardless/auth/callback', methods=['GET'])
def gocardless_auth_callback():
    frontend_url = os.environ.get('APP_BASE_URL', 'http://localhost:3000')
    settings_url = f"{frontend_url}/dashboard/integrationer?tab=bank"

    # Check for errors from GoCardless
    gocardless_error = request.args.get('error')
    if gocardless_error:
        error_desc = request.args.get('error_description', 'No description provided.')
        app.logger.error(f"GoCardless returned an error: {gocardless_error} - {error_desc}")
        return redirect(f"{settings_url}&error=gocardless_error&message={error_desc}")

    state_token = request.args.get('state')
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

    try:
        user_id = serializer.loads(state_token, max_age=600) # 10-minute expiry
    except (SignatureExpired, BadTimeSignature):
        app.logger.error(f"GoCardless auth failed due to invalid or expired state token.")
        return redirect(f"{settings_url}&error=gocardless_invalid_state")

    if not user_id:
        app.logger.error(f"GoCardless auth failed. Missing user_id in session after callback.")
        return redirect(f"{settings_url}&error=gocardless_session_expired")

    try:
        # Create initial GoCardless access and refresh tokens
        app.logger.info(f"Creating initial GoCardless tokens for user {user_id}")
        token_data = gocardless_service.create_access_token()
        
        # Encrypt tokens before storing
        encrypted_access_token_bytes = gocardless_service.encrypt_token(token_data['access'])
        encrypted_refresh_token_bytes = gocardless_service.encrypt_token(token_data['refresh'])
        
        # Base64-encode the encrypted bytes to store them as strings
        encrypted_access_token_b64 = base64.b64encode(encrypted_access_token_bytes).decode('utf-8')
        encrypted_refresh_token_b64 = base64.b64encode(encrypted_refresh_token_bytes).decode('utf-8')
        
        # Set the user's profile as connected with tokens
        update_payload = {
            'is_gocardless_connected': True,
            'gocardless_token': encrypted_access_token_b64,
            'gocardless_refresh_token_encrypted': encrypted_refresh_token_b64,
            'gocardless_token_expires_at': token_data['access_expires_at'],
            'gocardless_refresh_token_created_at': int(time.time())  # Track when refresh token was created (expires after 30 days)
        }
        response = supabase.table('profiles').update(update_payload).eq('id', user_id).execute()

        if hasattr(response, 'error') and response.error:
            app.logger.error(f"Failed to update profile for user {user_id} after GoCardless auth: {response.error}")
            raise Exception(f"Supabase error: {response.error.message}")

        app.logger.info(f"Successfully connected GoCardless for user {user_id} with encrypted tokens")
        return redirect(f"{settings_url}&success=gocardless_connected")

    except Exception as e:
        app.logger.error(f"Error in GoCardless callback for user {user_id}: {e}", exc_info=True)
        return redirect(f"{settings_url}&error=gocardless_internal_error")

@app.route('/get_my_accounts', methods=['GET'])
@user_required
@refresh_gocardless_token_if_needed
def get_my_accounts(current_user):
    requisition_id = current_user.get('gocardless_requisition_id')
    if not requisition_id:
        return jsonify({'error': 'No bank account linked for the current user.'}), 404
    try:
        access_token = current_user['decrypted_gocardless_token']
        requisition_data = gocardless_service.get_requisition_by_id(access_token, requisition_id)
        return jsonify(requisition_data)
    except Exception as e:
        app.logger.error(f"Error fetching GoCardless accounts for user {current_user['id']}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to fetch accounts.'}), 500

@app.route('/gocardless/requisition/<requisition_id>', methods=['GET'])
@user_required
@refresh_gocardless_token_if_needed
def get_requisition_details(current_user, requisition_id):
    """Endpoint to fetch details for a specific requisition ID."""
    try:
        access_token = current_user['decrypted_gocardless_token']
        requisition_data = gocardless_service.get_requisition_by_id(access_token, requisition_id)
        return jsonify(requisition_data)
    except Exception as e:
        app.logger.error(f"Error fetching GoCardless requisition {requisition_id} for user {current_user['id']}: {e}", exc_info=True)
        # Check for a 404 specifically if possible, assuming the service raises a specific exception
        if '404' in str(e):
            return jsonify({'error': 'Requisition not found.'}), 404
        return jsonify({'error': 'Failed to fetch requisition details.'}), 500

@app.route('/accounts', methods=['GET'])
@user_required
@refresh_gocardless_token_if_needed
def get_my_accounts_page(current_user):
    # This endpoint was insecure. It allowed fetching accounts for any requisition_id.
    # It is now secured by fetching accounts only from the user's own profile.
    user_id = current_user['id']
    try:
        response = supabase.table('gocardless_accounts').select('*').eq('user_id', user_id).execute()
        return jsonify(response.data)
    except Exception as e:
        app.logger.error(f"Error fetching GoCardless accounts for user {user_id}: {e}")
        return jsonify({'error': 'Failed to fetch accounts.'}), 500

@app.route('/accounts/<account_id>/transactions', methods=['GET'])
@user_required
@refresh_gocardless_token_if_needed
def get_transactions(current_user, account_id):
    access_token = current_user['decrypted_gocardless_token']

    transactions = gocardless_service.get_account_transactions(access_token, account_id)
    
    # Log the full transaction response to the console for inspection
    app.logger.info(f"GoCardless transactions response for account {account_id}: {json.dumps(transactions, indent=2)}")

    return jsonify(transactions)

@app.route('/gocardless/sync-transactions', methods=['POST'])
@user_required
@refresh_gocardless_token_if_needed
def sync_gocardless_transactions(current_user):
    """
    Syncs all bank transactions from GoCardless to Supabase.
    Fetches transactions from all connected bank accounts across all connections.
    """
    user_id = current_user['id']
    
    try:
        access_token = current_user['decrypted_gocardless_token']
        
        # Get all active bank connections for this user
        connections_response = supabase.table('bank_connections').select('*').eq('user_id', user_id).eq('status', 'active').execute()
        connections = connections_response.data or []
        
        if not connections:
            return jsonify({'error': 'No bank connections found'}), 404
        
        total_synced = 0
        errors = []
        connections_processed = 0
        
        # Process each bank connection
        for connection in connections:
            requisition_id = connection['requisition_id']
            connection_id = connection['id']
            
            try:
                # Get requisition details to find all connected accounts
                requisition_data = gocardless_service.get_requisition_by_id(access_token, requisition_id)
                account_ids = requisition_data.get('accounts', [])
                
                if not account_ids:
                    app.logger.warning(f"No accounts found for connection {connection_id}")
                    continue
                
                # Update connection with account IDs (but don't update last_sync_at yet - only after successful sync)
                supabase.table('bank_connections').update({
                    'account_ids': account_ids
                }).eq('id', connection_id).execute()
                
                connections_processed += 1
                
                # Fetch transactions for each account in this connection
                for account_id in account_ids:
                    try:
                        # Fetch ALL transactions without date filtering
                        # GoCardless will return all available transactions based on the agreement's max_historical_days
                        app.logger.info(f"Fetching all available transactions for account {account_id}")
                        
                        try:
                            transactions_data = gocardless_service.get_account_transactions(
                                access_token, account_id, date_from=None, date_to=None
                            )
                        except Exception as rate_error:
                            # Check if it's a rate limit error
                            if hasattr(rate_error, 'is_rate_limit') and rate_error.is_rate_limit:
                                retry_seconds = getattr(rate_error, 'retry_after_seconds', None)
                                if retry_seconds:
                                    hours = retry_seconds / 3600
                                    error_msg = f"GoCardless rate limit reached for account {account_id}. Retry in {hours:.1f} hours."
                                else:
                                    error_msg = f"GoCardless rate limit reached for account {account_id}. Please try again later."
                                
                                app.logger.warning(error_msg)
                                errors.append(error_msg)
                                continue  # Skip this account and continue with others
                            else:
                                # Re-raise if it's not a rate limit error
                                raise
                        
                        # Extract transactions from response
                        transactions = transactions_data.get('transactions', {}).get('booked', [])
                        
                        if not transactions:
                            app.logger.info(f"No transactions found for account {account_id}")
                            continue
                        
                        app.logger.info(f"Account {account_id}: Processing {len(transactions)} transactions from GoCardless")
                        
                        # Prepare all transactions for bulk upsert (like Dinero invoice sync)
                        transactions_to_upsert = []
                        for transaction in transactions:
                            try:
                                transaction_id = transaction.get('transactionId') or transaction.get('internalTransactionId')
                                
                                transaction_record = {
                                    'user_id': user_id,
                                    'connection_id': connection_id,
                                    'account_id': account_id,
                                    'transaction_id': transaction_id,
                                    'booking_date': transaction.get('bookingDate'),
                                    'value_date': transaction.get('valueDate'),
                                    'amount': float(transaction.get('transactionAmount', {}).get('amount', 0)),
                                    'currency': transaction.get('transactionAmount', {}).get('currency', 'DKK'),
                                    'creditor_name': transaction.get('creditorName'),
                                    'creditor_account': transaction.get('creditorAccount', {}).get('iban'),
                                    'debtor_name': transaction.get('debtorName'),
                                    'debtor_account': transaction.get('debtorAccount', {}).get('iban'),
                                    'remittance_information': transaction.get('remittanceInformationUnstructured'),
                                    'additional_information': transaction.get('additionalInformation'),
                                    'raw_data': transaction
                                }
                                transactions_to_upsert.append(transaction_record)
                            except Exception as e:
                                app.logger.error(f"Error preparing transaction: {e}", exc_info=True)
                                errors.append(f"Error preparing transaction: {str(e)}")
                        
                        # Bulk upsert all transactions at once (much faster!)
                        if transactions_to_upsert:
                            try:
                                # Upsert in batches of 500 to avoid payload size limits
                                batch_size = 500
                                for i in range(0, len(transactions_to_upsert), batch_size):
                                    batch = transactions_to_upsert[i:i + batch_size]
                                    response = supabase.table('bank_transactions').upsert(
                                        batch,
                                        on_conflict='transaction_id'
                                    ).execute()
                                    
                                    if not hasattr(response, 'error') or response.error is None:
                                        total_synced += len(batch)
                                        app.logger.info(f"Upserted batch of {len(batch)} transactions")
                                    else:
                                        errors.append(f"Error upserting batch: {response.error}")
                                
                                app.logger.info(f"Account {account_id}: Successfully synced {len(transactions_to_upsert)} transactions")
                            except Exception as e:
                                app.logger.error(f"Error bulk upserting transactions: {e}", exc_info=True)
                                errors.append(f"Error bulk upserting: {str(e)}")
                                
                    except Exception as e:
                        app.logger.error(f"Error fetching transactions for account {account_id}: {e}", exc_info=True)
                        errors.append(f"Error fetching account {account_id}: {str(e)}")
                        
            except Exception as e:
                app.logger.error(f"Error processing connection {connection_id}: {e}", exc_info=True)
                errors.append(f"Error processing connection: {str(e)}")
        
        # Get the most recent transaction date for better user feedback
        latest_transaction = supabase.table('bank_transactions').select('booking_date').eq('user_id', user_id).order('booking_date', desc=True).limit(1).execute()
        latest_transaction_date = latest_transaction.data[0]['booking_date'] if latest_transaction.data else None
        
        # Update last_sync_at for all processed connections ONLY after successful sync
        if connections_processed > 0:
            for connection in connections:
                supabase.table('bank_connections').update({
                    'last_sync_at': datetime.now(timezone.utc).isoformat()
                }).eq('id', connection['id']).execute()
        
        app.logger.info(f"Transaction sync completed for user {user_id}. Connections: {connections_processed}, Total synced: {total_synced}, Latest transaction: {latest_transaction_date}")
        
        return jsonify({
            'success': True,
            'total_synced': total_synced,
            'connections_processed': connections_processed,
            'latest_transaction_date': latest_transaction_date,
            'errors': errors if errors else None
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error syncing transactions for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to sync transactions', 'details': str(e)}), 500

@app.route('/complete_gocardless_connection', methods=['POST'])
@user_required
def complete_gocardless_connection(current_user):
    user_id = current_user['id']
    requisition_id = request.json.get('ref')

    if not requisition_id:
        return jsonify({'error': 'Requisition ID (ref) is required'}), 400

    try:
        update_payload = {
            'gocardless_requisition_id': requisition_id,
            'is_gocardless_connected': True
        }
        
        response = supabase.table('profiles').update(update_payload).eq('id', user_id).select().single().execute()

        if response.error:
            raise response.error

        return jsonify({'message': 'GoCardless connection completed successfully.', 'profile': response.data}), 200

    except Exception as e:
        app.logger.error(f"Error completing GoCardless connection for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected server error occurred.'}), 500

@app.route('/gocardless/disconnect', methods=['POST'])
@user_required
def disconnect_gocardless_route(current_user):
    """Disconnect a specific bank connection or all connections"""
    user_id = current_user['id']
    data = request.get_json() or {}
    connection_id = data.get('connection_id')
    
    try:
        # Always clear tokens from profiles when disconnecting
        update_payload = {
            'gocardless_requisition_id': None,
            'gocardless_token': None,
            'gocardless_refresh_token_encrypted': None,
            'gocardless_token_expires_at': None,
            'is_gocardless_connected': False
        }
        supabase.table('profiles').update(update_payload).eq('id', user_id).execute()
        
        # Try to update bank_connections table if it exists
        try:
            if connection_id:
                # Disconnect specific connection
                supabase.table('bank_connections').update({
                    'status': 'disconnected'
                }).eq('id', connection_id).eq('user_id', user_id).execute()
                
                app.logger.info(f"Disconnected bank connection {connection_id} for user {user_id}")
            else:
                # Disconnect all connections
                supabase.table('bank_connections').update({
                    'status': 'disconnected'
                }).eq('user_id', user_id).execute()
                
                app.logger.info(f"Disconnected all bank connections for user {user_id}")
        except Exception as table_error:
            # Table might not exist yet - that's okay, we already cleared the profile
            app.logger.warning(f"Could not update bank_connections table (might not exist yet): {table_error}")
        
        return jsonify({'message': 'Bank connection(s) disconnected successfully.'}), 200
    except Exception as e:
        app.logger.error(f"Failed to disconnect GoCardless for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': 'An error occurred while disconnecting the integration.'}), 500

@app.route('/gocardless/connections', methods=['GET'])
@user_required
def get_bank_connections(current_user):
    """Get all bank connections for the current user"""
    user_id = current_user['id']
    try:
        response = supabase.table('bank_connections').select('*').eq('user_id', user_id).eq('status', 'active').execute()
        connections = response.data or []
        
        return jsonify({'connections': connections}), 200
    except Exception as e:
        # If table doesn't exist yet, return empty array
        if 'does not exist' in str(e):
            app.logger.warning(f"bank_connections table does not exist yet - returning empty array")
            return jsonify({'connections': []}), 200
        
        app.logger.error(f"Failed to fetch bank connections for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to fetch bank connections.'}), 500

# --- Dinero API Endpoints ---
@app.route('/dinero-auth/start', methods=['GET'])
@user_required
def dinero_auth_start(current_user):
    # Use a timed serializer to create a secure, temporary state token
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    state_token = serializer.dumps(current_user['id'])

    # Use API_BASE_URL from environment for callback (works in dev and production)
    api_base_url = os.environ.get('API_BASE_URL', 'http://localhost:5003')
    redirect_uri = f"{api_base_url}/dinero-auth/callback"
    auth_url = dinero_service.get_authorization_url(redirect_uri, state=state_token)
    return jsonify({'auth_url': auth_url})

@app.route('/dinero-auth/callback', methods=['GET'])
def dinero_auth_callback():
    code = request.args.get('code')
    state_token = request.args.get('state')
    frontend_url = os.environ.get('APP_BASE_URL', 'http://localhost:3000')
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

    if not code or not state_token:
        return redirect(f"{frontend_url}/dashboard?error=dinero_auth_failed&reason=missing_params")

    try:
        # Decode the state token to get the user_id. Set max_age to 10 minutes.
        user_id = serializer.loads(state_token, max_age=600)
    except SignatureExpired:
        return redirect(f"{frontend_url}/dashboard?error=dinero_auth_failed&reason=expired_token")
    except BadTimeSignature:
        return redirect(f"{frontend_url}/dashboard?error=dinero_auth_failed&reason=invalid_token")
    except Exception:
        return redirect(f"{frontend_url}/dashboard?error=dinero_auth_failed&reason=unknown_token_error")

    try:
        # Use API_BASE_URL from environment for callback (works in dev and production)
        api_base_url = os.environ.get('API_BASE_URL', 'http://localhost:5003')
        redirect_uri = f"{api_base_url}/dinero-auth/callback"
        token_data = dinero_service.exchange_code_for_tokens(code, redirect_uri)

        # Encrypt tokens before storing
        encrypted_access_token_bytes = dinero_service.encrypt_token(token_data['access_token'])
        encrypted_refresh_token_bytes = dinero_service.encrypt_token(token_data['refresh_token'])

        # Base64-encode the encrypted bytes to store them as strings
        encrypted_access_token_b64 = base64.b64encode(encrypted_access_token_bytes).decode('utf-8')
        encrypted_refresh_token_b64 = base64.b64encode(encrypted_refresh_token_bytes).decode('utf-8')

        # The Dinero 'api_key' for making requests is the same as the access_token.
        encrypted_api_key_bytes = dinero_service.encrypt_token(token_data['access_token'])
        encrypted_api_key_b64 = base64.b64encode(encrypted_api_key_bytes).decode('utf-8')

        update_payload = {
            'dinero_access_token_encrypted': encrypted_access_token_b64,
            'dinero_refresh_token_encrypted': encrypted_refresh_token_b64,
            'dinero_token_expires_at': int(time.time()) + token_data.get('expires_in', 3600),
            'is_dinero_connected': True
        }
        
        supabase.table('profiles').update(update_payload).eq('id', user_id).execute()

        return redirect(f"{frontend_url}/dashboard?success=dinero_connected")
    except HTTPError as e:
        # Log the specific error response from Dinero API
        error_details = e.response.text
        app.logger.error(f"Dinero token exchange failed. Status: {e.response.status_code}, Details: {error_details}", exc_info=True)
        return redirect(f"{frontend_url}/dashboard?error=dinero_token_exchange_failed&reason=api_error")
    except Exception as e:
        app.logger.error(f"An unexpected error occurred in Dinero callback: {e}", exc_info=True)
        return redirect(f"{frontend_url}/dashboard?error=dinero_token_exchange_failed&reason=internal_error")

@app.route('/dinero/organizations', methods=['GET'])
@user_required
@refresh_dinero_token_if_needed
def get_dinero_organizations_route(current_user):
    # The decorator @refresh_dinero_token_if_needed places the valid, decrypted token 
    # (which is the API key) into current_user['decrypted_dinero_token'].
    api_key = current_user.get('decrypted_dinero_token')

    if not api_key:
        app.logger.error(f"User {current_user['id']} - Dinero API key not found after token refresh decorator.")
        return jsonify({'error': 'Dinero API key not found or invalid. Please reconnect.'}), 401

    organizations = dinero_service.get_organizations(api_key)

    if organizations is None or 'error' in organizations:
        app.logger.error(f"User {current_user['id']} - Failed to fetch organizations from Dinero. Details: {organizations.get('details', 'No details')}")
        return jsonify({'error': 'Failed to fetch organizations from Dinero.'}), 500
    
    return jsonify(organizations)

@app.route('/profile/organization', methods=['POST'])
@user_required
def set_dinero_organization_route(current_user):
    user_id = current_user['id']
    data = request.get_json()
    organization_id = data.get('organization_id')

    if not organization_id:
        return jsonify({'error': 'Organization ID is required.'}), 400

    try:
        supabase.table('profiles').update({'dinero_org_id': organization_id}).eq('id', user_id).execute()
        return jsonify({'message': 'Organization updated successfully.'}), 200
    except Exception as e:
        app.logger.error(f"Failed to update organization ID: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# Endpoint to get already synced invoices (fast)
@app.route('/invoices/metrics', methods=['GET'])
@user_required
def get_invoice_metrics(current_user):
    user_id = current_user['id']
    try:
        # The view is already filtered by auth.uid(), so we just select the single row.
        # The .single() method ensures we get one row or an error, which is what we expect.
        # Do not use .single() as it will error if no row exists for a new user.
        # Explicitly filter by user_id to prevent data leakage. Do not rely on implicit RLS.
        response = supabase.table('dashboard_metrics').select('*').eq('user_id', user_id).execute()
        
        # Log the raw response from Supabase for debugging
        app.logger.info(f"Metrics response for user {user_id}: {response.data}")

        if response.data is None:
            # If no metrics row exists for the user, return a zeroed-out structure.
            app.logger.warning(f"No metrics data found for user {user_id}. Returning default zero values.")
        # If data exists, return the first record. Otherwise, return default zeroed metrics.
        if response.data:
            return jsonify(response.data[0])
        else:
            return jsonify({
                'total_overdue': 0,
                'total_collected': 0,
                'paid_this_month': 0,
                'awaiting_payment_count': 0
            })
    except Exception as e:
        # The .single() method can raise an error if more than one row is returned.
        # We log this to diagnose potential data issues.
        app.logger.error(f"Error fetching invoice metrics for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch invoice metrics.'}), 500

@app.route('/dinero/invoices', methods=['GET'])
@user_required
def get_dinero_invoices(current_user):
    user_id = current_user['id']
    try:
        # --- Server-Side Pagination and Filtering ---
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 10))
        offset = (page - 1) * page_size

        # Base query to filter for dunning cases
        query = supabase.table('invoices').select('*', count='exact') \
            .eq('user_id', user_id) \
            .ilike('latest_mail_out_type', 'Reminder') \
            .not_.in_('status', ['paid', 'overpaid', 'Paid', 'Overpaid', 'PAID', 'OVERPAID'])

        # Apply pagination and ordering
        response = query.order('issue_date', desc=True).range(offset, offset + page_size - 1).execute()

        if response.data is None:
            return jsonify({'invoices': [], 'total': 0})

        # The 'count' is returned alongside the data when count='exact' is used.
        total_records = response.count

        return jsonify({'invoices': response.data, 'total': total_records})

    except Exception as e:
        app.logger.error(f"Error fetching dunning invoices for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch dunning invoices from database.'}), 500

@app.route('/invoices/all', methods=['GET'])
@user_required
def get_all_invoices(current_user):
    user_id = current_user['id']
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 10))
        offset = (page - 1) * page_size

        # Query for all invoices, without dunning-specific filters
        query = supabase.table('invoices').select('*', count='exact') \
            .eq('user_id', user_id)

        response = query.order('issue_date', desc=True).range(offset, offset + page_size - 1).execute()

        if response.data is None:
            return jsonify({'invoices': [], 'total': 0})

        total_records = response.count

        return jsonify({'invoices': response.data, 'total': total_records})

    except Exception as e:
        app.logger.error(f"Error fetching all invoices for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch invoices from database.'}), 500

@app.route('/customers/problem', methods=['GET'])
@user_required
def get_problem_customers(current_user):
    """Get problem customers with risk scoring from SQL view"""
    user_id = current_user['id']
    try:
        limit = int(request.args.get('limit', 10))
        min_risk_score = int(request.args.get('minRiskScore', 20))
        
        # Query the problem_customers view
        response = supabase.table('problem_customers') \
            .select('*') \
            .eq('user_id', user_id) \
            .gte('risk_score', min_risk_score) \
            .order('risk_score', desc=True) \
            .limit(limit) \
            .execute()
        
        if response.data is None:
            return jsonify({'customers': []})
        
        return jsonify({'customers': response.data})
    
    except Exception as e:
        app.logger.error(f"Error fetching problem customers for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch problem customers.'}), 500

@app.route('/dashboard/stats', methods=['GET'])
@user_required
def get_dashboard_stats(current_user):
    """Get dashboard statistics from optimized SQL view"""
    user_id = current_user['id']
    try:
        response = supabase.table('dashboard_stats') \
            .select('*') \
            .eq('user_id', user_id) \
            .execute()
        
        if response.data and len(response.data) > 0:
            return jsonify(response.data[0])
        else:
            # Return empty stats if no data
            return jsonify({
                'total_invoices': 0,
                'total_revenue': 0,
                'average_invoice_value': 0,
                'average_payment_delay': 0,
                'overdue_count': 0,
                'pending_count': 0,
                'paid_count': 0,
                'overdue_amount': 0,
                'pending_amount': 0,
                'paid_amount': 0
            })
    
    except Exception as e:
        app.logger.error(f"Error fetching dashboard stats for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch dashboard stats.'}), 500

@app.route('/invoices/overdue', methods=['GET'])
@user_required
def get_overdue_invoices(current_user):
    """Get overdue invoices from optimized SQL view"""
    user_id = current_user['id']
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 50))
        offset = (page - 1) * page_size
        
        response = supabase.table('overdue_invoices') \
            .select('*', count='exact') \
            .eq('user_id', user_id) \
            .order('days_overdue', desc=True) \
            .range(offset, offset + page_size - 1) \
            .execute()
        
        if response.data is None:
            return jsonify({'invoices': [], 'total': 0})
        
        return jsonify({'invoices': response.data, 'total': response.count})
    
    except Exception as e:
        app.logger.error(f"Error fetching overdue invoices for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch overdue invoices.'}), 500

@app.route('/invoices/pending', methods=['GET'])
@user_required
def get_pending_invoices(current_user):
    """Get pending invoices from optimized SQL view"""
    user_id = current_user['id']
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 50))
        offset = (page - 1) * page_size
        
        response = supabase.table('pending_invoices') \
            .select('*', count='exact') \
            .eq('user_id', user_id) \
            .order('issue_date', desc=True) \
            .range(offset, offset + page_size - 1) \
            .execute()
        
        if response.data is None:
            return jsonify({'invoices': [], 'total': 0})
        
        return jsonify({'invoices': response.data, 'total': response.count})
    
    except Exception as e:
        app.logger.error(f"Error fetching pending invoices for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch pending invoices.'}), 500

@app.route('/customers/behavior', methods=['GET'])
@user_required
def get_customer_behavior(current_user):
    """Get customer payment behavior from optimized SQL view"""
    user_id = current_user['id']
    try:
        response = supabase.table('customer_payment_behavior') \
            .select('*') \
            .eq('user_id', user_id) \
            .order('total_invoices', desc=True) \
            .execute()
        
        if response.data is None:
            return jsonify({'customers': []})
        
        # Calculate behavior summary
        behavior_summary = {
            'excellent': 0,
            'good': 0,
            'slow': 0,
            'problem': 0
        }
        
        for customer in response.data:
            behavior = customer.get('payment_behavior', 'excellent')
            if behavior in behavior_summary:
                behavior_summary[behavior] += 1
        
        return jsonify({
            'customers': response.data,
            'summary': behavior_summary
        })
    
    except Exception as e:
        app.logger.error(f"Error fetching customer behavior for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch customer behavior.'}), 500

@app.route('/invoices/recent', methods=['GET'])
@user_required
def get_recent_invoices(current_user):
    """Get recent invoices from optimized SQL view"""
    user_id = current_user['id']
    try:
        limit = int(request.args.get('limit', 10))
        
        response = supabase.table('recent_invoices') \
            .select('*') \
            .eq('user_id', user_id) \
            .limit(limit) \
            .execute()
        
        if response.data is None:
            return jsonify({'invoices': []})
        
        return jsonify({'invoices': response.data})
    
    except Exception as e:
        app.logger.error(f"Error fetching recent invoices for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch recent invoices.'}), 500

@app.route('/revenue/monthly', methods=['GET'])
@user_required
def get_monthly_revenue(current_user):
    """Get monthly revenue from optimized SQL view"""
    user_id = current_user['id']
    try:
        months = int(request.args.get('months', 6))
        
        response = supabase.table('monthly_revenue') \
            .select('*') \
            .eq('user_id', user_id) \
            .order('month', desc=True) \
            .limit(months if months > 0 else 1000) \
            .execute()
        
        if response.data is None:
            return jsonify({'data': []})
        
        return jsonify({'data': response.data})
    
    except Exception as e:
        app.logger.error(f"Error fetching monthly revenue for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch monthly revenue.'}), 500

@app.route('/invoices/reminders', methods=['GET'])
@user_required
def get_reminder_invoices(current_user):
    user_id = current_user['id']
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 10))
        offset = (page - 1) * page_size

        query = supabase.table('invoices').select('*', count='exact') \
            .eq('user_id', user_id) \
            .eq('latest_mail_out_type', 'PreReminder') \
            .not_.in_('status', ['paid', 'overpaid', 'Paid', 'Overpaid', 'PAID', 'OVERPAID'])

        response = query.order('issue_date', desc=True).range(offset, offset + page_size - 1).execute()

        if response.data is None:
            return jsonify({'invoices': [], 'total': 0})

        total_records = response.count

        return jsonify({'invoices': response.data, 'total': total_records})

    except Exception as e:
        app.logger.error(f"Error fetching reminder invoices for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch reminder invoices from database.'}), 500

@app.route('/invoices/needs_action', methods=['GET'])
@user_required
def get_needs_action_invoices(current_user):
    user_id = current_user['id']
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 12))
        offset = (page - 1) * page_size

        # Step 1: Fetch all invoices that are unpaid and have had a reminder sent.
        query = supabase.table('invoices').select('contact_name, total_incl_vat') \
            .eq('user_id', user_id) \
            .ilike('latest_mail_out_type', 'Reminder') \
            .not_.in_('status', ['paid', 'overpaid', 'Paid', 'Overpaid', 'PAID', 'OVERPAID'])
        
        response = query.execute()

        if not response.data:
            return jsonify({'data': [], 'total': 0})

        # Step 2: Aggregate the data by contact_name in Python.
        customer_aggregation = {}
        for invoice in response.data:
            contact_name = invoice['contact_name']
            if contact_name not in customer_aggregation:
                customer_aggregation[contact_name] = {'invoice_count': 0, 'total_amount': 0}
            
            customer_aggregation[contact_name]['invoice_count'] += 1
            customer_aggregation[contact_name]['total_amount'] += invoice.get('total_incl_vat', 0)

        # Step 3: Filter for customers with more than 2 unpaid reminder invoices.
        needs_action_list = []
        for name, data in customer_aggregation.items():
            if data['invoice_count'] > 2:
                needs_action_list.append({
                    'contact_name': name,
                    'invoice_count': data['invoice_count'],
                    'total_amount': data['total_amount']
                })
        
        # Step 4: Sort by total amount descending for priority.
        sorted_list = sorted(needs_action_list, key=lambda x: x['total_amount'], reverse=True)

        # Step 5: Paginate the results
        total_records = len(sorted_list)
        paginated_list = sorted_list[offset : offset + page_size]

        return jsonify({'data': paginated_list, 'total': total_records})

    except Exception as e:
        app.logger.error(f"Error fetching needs-action invoices for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch needs-action invoices.'}), 500

# Endpoint to trigger a new sync from Dinero (can be slow)
@app.route('/dinero/sync', methods=['POST'])
@user_required
@refresh_dinero_token_if_needed
def sync_dinero_invoices(current_user):
    user_id = current_user['id']
    # Check for the 'full_sync' query parameter
    full_sync_str = request.args.get('full_sync', 'false').lower()
    full_sync = full_sync_str == 'true'

    sync_type = "FULL" if full_sync else "INCREMENTAL"
    app.logger.info(f"--- Starting Dinero {sync_type} invoice sync for user: {user_id} ---")

    try:
        decrypted_token = current_user['decrypted_dinero_token']
        organization_id = current_user.get('dinero_org_id')

        if not organization_id:
            app.logger.error(f"User {user_id} has not selected a Dinero organization.")
            return jsonify({'error': 'Dinero organization not set. Please select one in settings.'}), 400

        changes_since_filter = None
        if not full_sync:
            # Get the last sync timestamp to perform an incremental sync
            last_sync_response = supabase.table('invoices').select('dinero_updated_at').eq('user_id', user_id).order('dinero_updated_at', desc=True).limit(1).execute()
            if last_sync_response.data and last_sync_response.data[0]['dinero_updated_at']:
                last_sync_timestamp = last_sync_response.data[0]['dinero_updated_at']
                changes_since_filter = datetime.fromisoformat(last_sync_timestamp.replace('Z', '+00:00')).strftime('%Y-%m-%dT%H:%M:%SZ')
                app.logger.info(f"Step 2: Found last sync at {changes_since_filter}. Performing incremental sync.")
            else:
                app.logger.info("Step 2: No previous sync found. Performing a full sync.")
        else:
            app.logger.info("Step 2: Full sync requested. Fetching all invoices.")

        app.logger.info(f"Step 3: Calling Dinero API to get invoices for organization {organization_id}.")
        all_invoices = dinero_service.get_invoices(decrypted_token, organization_id, changes_since=changes_since_filter)
        app.logger.info(f"Step 4: Received {len(all_invoices)} invoices from Dinero.")

        if not all_invoices:
            app.logger.info("--- Sync finished: No new invoices to sync. ---")
            return jsonify({"message": "No new invoices to sync"}), 200

        invoices_to_upsert = []
        for invoice in all_invoices:
            total_incl = invoice.get('TotalInclVat', 0) or 0
            total_excl = invoice.get('TotalExclVat', 0) or 0
            total_vat = total_incl - total_excl
            invoice_number = invoice.get('Number')
            invoice_data = {
                'user_id': user_id,
                'dinero_guid': invoice['Guid'],
                'invoice_number': invoice_number if invoice_number is not None else None,
                'contact_guid': invoice.get('ContactGuid'),
                'status': invoice.get('Status'),
                'contact_name': invoice.get('ContactName'),
                'issue_date': invoice.get('Date'),
                'payment_date': invoice.get('PaymentDate'),
                'currency': invoice.get('Currency'),
                'total_incl_vat': total_incl,
                'total_excl_vat': total_excl,
                'total_vat': total_vat,
                'mail_out_status': invoice.get('MailOutStatus'),
                'latest_mail_out_type': invoice.get('LatestMailOutType'),
                'dinero_created_at': invoice.get('CreatedAt'),
                'dinero_updated_at': invoice.get('UpdatedAt'),
                'raw_details': invoice
            }
            invoices_to_upsert.append(invoice_data)


        app.logger.info(f"Step 5: Preparing to upsert {len(invoices_to_upsert)} invoices into Supabase.")
        # Upsert the data, updating records if a conflict on 'dinero_guid' is found.
        response = supabase.table('invoices').upsert(invoices_to_upsert, on_conflict='dinero_guid').execute()

        # Check for errors after the upsert operation
        if hasattr(response, 'error') and response.error:
            app.logger.error(f"Supabase upsert failed: {response.error.message}")
            raise Exception(f"Supabase upsert failed: {response.error.message}")
        app.logger.info(f"--- Sync successful: Upserted {len(invoices_to_upsert)} invoices for user {user_id}. ---")

        include_reminders = request.args.get('include_reminders', 'true').lower() != 'false'
        app.logger.info(
            f"Automatic reminder/customer sync configuration: include_reminders={include_reminders}"
        )

        reminder_stats = None
        reminder_error = None

        if include_reminders:
            try:
                app.logger.info("Starting automatic reminder fee sync...")

                last_reminder_sync = get_last_reminder_sync_time(user_id)

                reminder_stats = sync_reminder_fees_for_user(
                    user_id=user_id,
                    access_token=decrypted_token,
                    organization_id=organization_id,
                    changes_since=last_reminder_sync
                )

                app.logger.info(f"Reminder fee sync completed: {reminder_stats}")

            except Exception as error:
                reminder_error = error
                app.logger.error(
                    f"Reminder fee sync failed (non-critical): {error}",
                    exc_info=True
                )
        else:
            app.logger.info("Skipping reminder fee sync (include_reminders=false)")

        customer_stats = None
        customer_error = None
        try:
            app.logger.info("Starting automatic customer sync...")

            last_customer_sync = get_last_customer_sync_time(user_id)

            customer_stats = sync_customers_for_user(
                user_id=user_id,
                access_token=decrypted_token,
                organization_id=organization_id,
                changes_since=last_customer_sync
            )

            app.logger.info(f"Customer sync completed: {customer_stats}")

        except Exception as error:
            customer_error = error
            app.logger.error(
                f"Customer sync failed (non-critical): {error}",
                exc_info=True
            )

        response_payload = {
            "message": f"Sync successful. {len(invoices_to_upsert)} invoices were updated/added.",
            "customers_synced": customer_stats['stored'] if customer_stats else 0,
            "customers_total": customer_stats['total'] if customer_stats else 0,
        }

        if reminder_stats is not None:
            response_payload.update({
                "reminder_fees_synced": reminder_stats['synced'],
                "reminder_fees_total": reminder_stats['total_invoices'],
            })
        else:
            response_payload["reminders_skipped"] = not include_reminders

        if reminder_error:
            response_payload["reminder_sync_error"] = str(reminder_error)

        if customer_error:
            response_payload["customer_sync_error"] = str(customer_error)

        status_code = 200
        return jsonify(response_payload), status_code

    except HTTPError as e:
        app.logger.error(f"[SYNC_FAILED] HTTPError during Dinero sync for user {user_id}: {e.response.text}", exc_info=True)
        # Standardize error response to always include a 'message' key for the frontend.
        error_details = e.response.json().get('message', e.response.text)
        return jsonify({'message': f'Failed to fetch data from Dinero: {error_details}'}), e.response.status_code
    except Exception as e:
        app.logger.error(f"[SYNC_FAILED] An unexpected error occurred during invoice sync for user {user_id}: {e}", exc_info=True)
        return jsonify({'message': 'An unexpected server error occurred during sync.'}), 500


# API Testing Endpoint - for testing any Dinero API endpoint from dashboard
@app.route('/dinero/test-api', methods=['POST'])
@user_required
@refresh_dinero_token_if_needed
def test_dinero_api(current_user):
    """
    Test any Dinero API endpoint from the dashboard.
    
    Request body:
    {
        "method": "GET",
        "endpoint": "/v1/{organizationId}/webhooks/events",
        "params": {"page": 0},
        "body": {}
    }
    """
    user_id = current_user['id']
    decrypted_token = current_user['decrypted_dinero_token']
    organization_id = current_user.get('dinero_org_id')
    
    if not organization_id:
        return jsonify({'error': 'Dinero organization not set'}), 400
    
    try:
        data = request.get_json()
        method = data.get('method', 'GET').upper()
        endpoint = data.get('endpoint', '')
        params = data.get('params', {})
        body = data.get('body', {})
        
        if not endpoint:
            return jsonify({'error': 'Endpoint is required'}), 400
        
        # Replace {organizationId} placeholder
        endpoint = endpoint.replace('{organizationId}', str(organization_id))
        
        # Build full URL
        url = f"https://api.dinero.dk{endpoint}"
        
        headers = {
            'Authorization': f'Bearer {decrypted_token}',
            'Content-Type': 'application/json'
        }
        
        app.logger.info(f"Testing Dinero API: {method} {url}")
        
        # Make the request
        if method == 'GET':
            response = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == 'POST':
            response = requests.post(url, headers=headers, params=params, json=body, timeout=30)
        elif method == 'PUT':
            response = requests.put(url, headers=headers, params=params, json=body, timeout=30)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, params=params, timeout=30)
        else:
            return jsonify({'error': f'Unsupported method: {method}'}), 400
        
        # Return response
        try:
            response_data = response.json()
        except:
            response_data = response.text
        
        return jsonify({
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'body': response_data,
            'url': url,
            'method': method
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error testing Dinero API: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/dinero/sync-reminder-fees', methods=['POST'])
@user_required
@refresh_dinero_token_if_needed
def sync_reminder_fees_route(current_user):
    """
    Manually trigger reminder fee sync.
    Useful for initial sync or troubleshooting.
    """
    user_id = current_user['id']
    
    try:
        decrypted_token = current_user['decrypted_dinero_token']
        organization_id = current_user.get('dinero_org_id')
        
        if not organization_id:
            return jsonify({'error': 'Dinero organization not set.'}), 400
        
        # Check if this is a full sync request
        full_sync = request.args.get('full_sync', 'false').lower() == 'true'
        
        # Get last sync time for incremental sync
        last_sync = None if full_sync else get_last_reminder_sync_time(user_id)
        
        app.logger.info(f"Manual reminder fee sync requested for user {user_id} (full_sync={full_sync})")
        
        # Perform sync
        stats = sync_reminder_fees_for_user(
            user_id=user_id,
            access_token=decrypted_token,
            organization_id=organization_id,
            changes_since=last_sync
        )
        
        return jsonify({
            'message': 'Reminder fee sync completed',
            'stats': stats
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error during manual reminder fee sync: {e}", exc_info=True)
        return jsonify({'error': 'Failed to sync reminder fees'}), 500

@app.route('/dinero/disconnect', methods=['POST'])
@user_required
def disconnect_dinero_route(current_user):
    user_id = current_user['id']
    try:
        update_payload = {
            'dinero_access_token_encrypted': None,
            'dinero_refresh_token_encrypted': None,
            'dinero_token_expires_at': None,
            'is_dinero_connected': False,
            'dinero_org_id': None
        }
        supabase.table('profiles').update(update_payload).eq('id', user_id).execute()
        return jsonify({'message': 'Dinero integration disconnected successfully.'}), 200
    except Exception as e:
        app.logger.error(f"Failed to disconnect Dinero for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': 'An error occurred while disconnecting the integration.'}), 500

@app.route('/dunning/metrics', methods=['GET'])
@user_required
def get_dunning_metrics(current_user):
    user_id = current_user['id']
    try:
        # Do not use .single() as it will error if no row exists for a new user.
        response = supabase.table('dunning_metrics').select('*').eq('user_id', user_id).execute()
        # If data exists, return the first record. Otherwise, return default zeroed metrics.
        if response.data:
            return jsonify(response.data[0])
        else:
            # Return default zeroed metrics if no data found for the user
            return jsonify({
                'active_reminders_count': 0,
                'total_overdue_amount': 0,
                'avg_overdue_days': 0,
                'collection_rate': 0
            })
    except Exception as e:
        app.logger.error(f"Error fetching dunning metrics for user {user_id}: {e}")
        return jsonify({'message': 'Failed to fetch dunning metrics.'}), 500

# --- Dashboard Metrics API Endpoints ---
@app.route('/dashboard/metrics/overdue', methods=['GET'])
@user_required
def get_overdue_metrics(current_user):
    """Get overdue invoice metrics from the database view"""
    user_id = current_user['id']
    try:
        response = supabase.table('overdue_invoices_metrics').select('*').eq('user_id', user_id).single().execute()
        
        if response.data:
            metrics = {
                'overdue_count': response.data.get('overdue_count', 0),
                'avg_days_overdue': round(response.data.get('avg_days_overdue', 0)),
                'active_reminders_sent': response.data.get('active_reminders_sent', 0),
                'total_overdue_amount': float(response.data.get('total_overdue_amount', 0))
            }
            return jsonify(metrics), 200
        else:
            return jsonify({
                'overdue_count': 0,
                'avg_days_overdue': 0,
                'active_reminders_sent': 0,
                'total_overdue_amount': 0
            }), 200
            
    except Exception as e:
        app.logger.error(f"Error fetching overdue metrics for user {user_id}: {e}")
        return jsonify({'error': 'Failed to fetch overdue metrics.'}), 500

@app.route('/dashboard/metrics/pending', methods=['GET'])
@user_required
def get_pending_metrics(current_user):
    """Get pending invoice metrics from the database view"""
    user_id = current_user['id']
    try:
        response = supabase.table('pending_invoices_metrics').select('*').eq('user_id', user_id).single().execute()
        
        if response.data:
            metrics = {
                'pending_count': response.data.get('pending_count', 0),
                'avg_days_until_due': round(response.data.get('avg_days_until_due', 0)),
                'total_pending_amount': float(response.data.get('total_pending_amount', 0)),
                'due_this_week': response.data.get('due_this_week', 0)
            }
            return jsonify(metrics), 200
        else:
            return jsonify({
                'pending_count': 0,
                'avg_days_until_due': 0,
                'total_pending_amount': 0,
                'due_this_week': 0
            }), 200
            
    except Exception as e:
        app.logger.error(f"Error fetching pending metrics for user {user_id}: {e}")
        return jsonify({'error': 'Failed to fetch pending metrics.'}), 500

@app.route('/dashboard/invoices/overdue', methods=['GET'])
@user_required
def get_overdue_invoices_list(current_user):
    """Get overdue invoices for the dashboard"""
    user_id = current_user['id']
    try:
        limit = request.args.get('limit', 100, type=int)
        
        response = supabase.table('invoices').select('*').eq('user_id', user_id).eq('status', 'Overdue').order('issue_date', desc=True).limit(limit).execute()
        
        invoices = []
        for invoice in response.data:
            issue_date = datetime.fromisoformat(invoice['issue_date'].replace('Z', '+00:00'))
            days_overdue = (datetime.now(timezone.utc) - issue_date).days
            
            invoices.append({
                'id': invoice['id'],
                'invoice_number': f"INV-{invoice['invoice_number']}",
                'customer_name': invoice['contact_name'],
                'customer_email': f"{invoice['contact_name'].lower().replace(' ', '').replace('-', '')}@email.dk",
                'amount': float(invoice['total_incl_vat'] or 0),
                'due_date': invoice['issue_date'],
                'days_overdue': days_overdue,
                'reminder_count': 1 if invoice['latest_mail_out_type'] == 'Reminder' else 0,
                'last_reminder_sent': invoice.get('payment_date') or datetime.now().isoformat().split('T')[0],
                'status': 'overdue'
            })
        
        return jsonify(invoices), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching overdue invoices for user {user_id}: {e}")
        return jsonify({'error': 'Failed to fetch overdue invoices.'}), 500

@app.route('/dashboard/invoices/pending', methods=['GET'])
@user_required
def get_pending_invoices_list(current_user):
    """Get pending invoices for the dashboard"""
    user_id = current_user['id']
    try:
        limit = request.args.get('limit', 50, type=int)
        
        response = supabase.table('invoices').select('*').eq('user_id', user_id).not_('status', 'in', '("Paid","Overpaid","Overdue")').not_('status', 'is', None).order('issue_date', desc=True).limit(limit).execute()
        
        invoices = []
        for invoice in response.data:
            issue_date = datetime.fromisoformat(invoice['issue_date'].replace('Z', '+00:00'))
            payment_date = None
            if invoice.get('payment_date'):
                payment_date = datetime.fromisoformat(invoice['payment_date'].replace('Z', '+00:00'))
                days_until_due = (payment_date - datetime.now(timezone.utc)).days
            else:
                days_until_due = (datetime.now(timezone.utc) - issue_date).days
            
            invoices.append({
                'id': invoice['id'],
                'invoice_number': f"INV-{invoice['invoice_number']}",
                'customer_name': invoice['contact_name'],
                'customer_email': f"{invoice['contact_name'].lower().replace(' ', '').replace('-', '')}@email.dk",
                'amount': float(invoice['total_incl_vat'] or 0),
                'due_date': invoice.get('payment_date') or invoice['issue_date'],
                'days_until_due': days_until_due,
                'expected_payment_date': invoice.get('payment_date'),
                'payment_method': 'Bank Transfer',
                'bank_reference': f"REF-{invoice['invoice_number']}",
                'status': 'pending'
            })
        
        return jsonify(invoices), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching pending invoices for user {user_id}: {e}")
        return jsonify({'error': 'Failed to fetch pending invoices.'}), 500

@app.route('/invoice_matches/<match_id>/register_payment', methods=['POST'])
@user_required
def register_payment_for_match(current_user, match_id):
    """
    Register a payment in Dinero for an invoice match
    
    This will:
    1. Fetch the invoice match from database
    2. Get invoice details from Dinero (timestamp, depositAccountNumber)
    3. Register the payment in Dinero
    4. Update the match status to 'marked_paid'
    """
    user_id = current_user['id']
    
    try:
        # Get the match from database
        match_response = supabase.table('invoice_matches') \
            .select('*') \
            .eq('id', match_id) \
            .eq('user_id', user_id) \
            .single() \
            .execute()
        
        if not match_response.data:
            return jsonify({'error': 'Match not found'}), 404
        
        match = match_response.data
        
        # Check if already marked as paid
        if match.get('marked_paid_at'):
            return jsonify({
                'error': 'Payment already registered',
                'marked_paid_at': match['marked_paid_at']
            }), 400
        
        # Get Dinero credentials
        decrypted_token = current_user['decrypted_dinero_token']
        organization_id = current_user['dinero_organization_id']
        
        if not decrypted_token or not organization_id:
            return jsonify({'error': 'Dinero not connected'}), 400
        
        # Initialize payment service
        payment_service = DineroPaymentService(decrypted_token, organization_id)
        
        # Register payment
        app.logger.info(f"Registering payment for match {match_id}, invoice {match['invoice_number']}")
        payment_result = payment_service.register_payment_from_match(match)
        
        if not payment_result:
            return jsonify({'error': 'Failed to register payment in Dinero'}), 500
        
        # Update match status
        now = datetime.now(timezone.utc).isoformat()
        supabase.table('invoice_matches').update({
            'status': 'marked_paid',
            'marked_paid_at': now,
            'marked_paid_by': user_id,
            'economic_payment_id': f"AutoRykker - {match_id}"
        }).eq('id', match_id).execute()
        
        app.logger.info(f"Successfully registered payment for match {match_id}")
        
        return jsonify({
            'success': True,
            'message': 'Payment registered successfully',
            'match_id': match_id,
            'invoice_number': match['invoice_number'],
            'amount': float(match['transaction_amount']),
            'marked_paid_at': now
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error registering payment for match {match_id}: {e}", exc_info=True)
        return jsonify({'error': f'Failed to register payment: {str(e)}'}), 500

@app.route('/invoice_matches/<match_id>/bulk_register_payments', methods=['POST'])
@user_required
def bulk_register_payments(current_user, match_id=None):
    """
    Register payments for multiple invoice matches
    
    Body: {
        "match_ids": ["uuid1", "uuid2", ...]
    }
    """
    user_id = current_user['id']
    
    try:
        data = request.get_json()
        match_ids = data.get('match_ids', [])
        
        if not match_ids:
            return jsonify({'error': 'No match IDs provided'}), 400
        
        # Get Dinero credentials
        decrypted_token = current_user['decrypted_dinero_token']
        organization_id = current_user['dinero_organization_id']
        
        if not decrypted_token or not organization_id:
            return jsonify({'error': 'Dinero not connected'}), 400
        
        # Initialize payment service
        payment_service = DineroPaymentService(decrypted_token, organization_id)
        
        results = {
            'success': [],
            'failed': [],
            'skipped': []
        }
        
        for mid in match_ids:
            try:
                # Get match
                match_response = supabase.table('invoice_matches') \
                    .select('*') \
                    .eq('id', mid) \
                    .eq('user_id', user_id) \
                    .single() \
                    .execute()
                
                if not match_response.data:
                    results['failed'].append({'match_id': mid, 'reason': 'Not found'})
                    continue
                
                match = match_response.data
                
                # Skip if already paid
                if match.get('marked_paid_at'):
                    results['skipped'].append({
                        'match_id': mid,
                        'reason': 'Already paid',
                        'invoice_number': match['invoice_number']
                    })
                    continue
                
                # Register payment
                payment_result = payment_service.register_payment_from_match(match)
                
                if payment_result:
                    # Update match
                    now = datetime.now(timezone.utc).isoformat()
                    supabase.table('invoice_matches').update({
                        'status': 'marked_paid',
                        'marked_paid_at': now,
                        'marked_paid_by': user_id,
                        'economic_payment_id': f"AutoRykker - {mid}"
                    }).eq('id', mid).execute()
                    
                    results['success'].append({
                        'match_id': mid,
                        'invoice_number': match['invoice_number'],
                        'amount': float(match['transaction_amount'])
                    })
                else:
                    results['failed'].append({
                        'match_id': mid,
                        'invoice_number': match['invoice_number'],
                        'reason': 'Payment registration failed'
                    })
                    
            except Exception as e:
                app.logger.error(f"Error processing match {mid}: {e}")
                results['failed'].append({
                    'match_id': mid,
                    'reason': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'summary': {
                'total': len(match_ids),
                'successful': len(results['success']),
                'failed': len(results['failed']),
                'skipped': len(results['skipped'])
            }
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error in bulk payment registration: {e}", exc_info=True)
        return jsonify({'error': f'Failed to process bulk payments: {str(e)}'}), 500


# --- Automation Endpoints (for Cron Jobs) ---

@app.route('/automation/invoice-matcher', methods=['POST'])
def run_invoice_matcher():
    """Trigger the invoice matcher for one or many users."""
    payload = request.get_json(silent=True) or {}
    target_user_id = payload.get('user_id')

    try:
        app.logger.info("Starting invoice matcher automation", extra={'target_user': target_user_id})

        from invoice_matcher_v2 import run_matcher_for_user, get_enabled_users

        users: List[Dict] = []
        if target_user_id:
            settings_resp = supabase.table('automation_settings') \
                .select('last_matcher_sync') \
                .eq('user_id', target_user_id) \
                .limit(1) \
                .execute()
            last_sync = None
            if settings_resp.data:
                last_sync = settings_resp.data[0].get('last_matcher_sync')
            users = [{'user_id': target_user_id, 'last_matcher_sync': last_sync}]
        else:
            users = get_enabled_users(supabase)

        if not users:
            return jsonify({
                'success': True,
                'message': 'No eligible users found for invoice matcher',
                'users_processed': 0
            }), 200

        results = []
        total_saved = total_skipped = total_matches = 0

        for user_data in users:
            try:
                saved, skipped, matches = run_matcher_for_user(user_data)
                total_saved += saved
                total_skipped += skipped
                total_matches += matches
                results.append({
                    'user_id': user_data['user_id'],
                    'success': True,
                    'saved': saved,
                    'skipped': skipped,
                    'matches': matches
                })
            except Exception as user_error:
                app.logger.error(
                    "Invoice matcher failed for user",
                    extra={'user_id': user_data['user_id'], 'error': str(user_error)}
                )
                results.append({
                    'user_id': user_data['user_id'],
                    'success': False,
                    'error': str(user_error)
                })

        return jsonify({
            'success': True,
            'message': 'Invoice matcher run complete',
            'users_processed': len(users),
            'total_matches': total_matches,
            'total_saved': total_saved,
            'total_skipped': total_skipped,
            'results': results
        }), 200

    except Exception as e:
        app.logger.error("Invoice matcher automation error", exc_info=True)
        return jsonify({'error': f'Failed to run invoice matcher: {str(e)}'}), 500


@app.route('/automation/payment-registration', methods=['POST'])
def run_payment_automation():
    """Trigger payment registration for pending matches."""
    payload = request.get_json(silent=True) or {}
    target_user_id = payload.get('user_id')

    try:
        app.logger.info("Starting payment registration automation", extra={'target_user': target_user_id})

        from payment_automation import process_user
        from sync_customers import sync_customers_for_user, get_last_customer_sync_time
        from dinero_service import DineroService

        user_ids: List[str]
        if target_user_id:
            user_ids = [target_user_id]
        else:
            response = supabase.table('automation_settings') \
                .select('user_id') \
                .eq('automation_enabled', True) \
                .execute()
            user_ids = [row['user_id'] for row in (response.data or [])]

        if not user_ids:
            return jsonify({
                'success': True,
                'message': 'No eligible users found for payment automation',
                'users_processed': 0
            }), 200

        results = []
        users_with_payments: List[str] = []

        for user_id in user_ids:
            try:
                result = process_user(user_id, supabase)
                results.append(result)
                if result.get('successful', 0) > 0:
                    users_with_payments.append(user_id)
            except Exception as user_error:
                app.logger.error(
                    "Payment automation failed for user",
                    extra={'user_id': user_id, 'error': str(user_error)}
                )
                results.append({
                    'user_id': user_id,
                    'success': False,
                    'error': str(user_error)
                })

        total_payments = sum(r.get('successful', 0) for r in results)

        if users_with_payments:
            app.logger.info(
                "Running incremental invoice sync for users with registered payments",
                extra={'users': users_with_payments}
            )
            dinero_service = DineroService()
            for user_id in users_with_payments:
                try:
                    profile_resp = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
                    profile = profile_resp.data
                    if not profile:
                        continue

                    access_token, token_update = dinero_service.get_valid_access_token(profile)
                    if token_update:
                        supabase.table('profiles').update(token_update).eq('id', user_id).execute()

                    org_id = profile.get('dinero_org_id') or profile.get('dinero_organization_id')
                    if access_token and org_id:
                        last_sync = get_last_customer_sync_time(user_id)
                        sync_customers_for_user(user_id, access_token, org_id, last_sync)
                except Exception as sync_error:
                    app.logger.error(
                        "Failed to run post-payment invoice sync",
                        extra={'user_id': user_id, 'error': str(sync_error)}
                    )

        return jsonify({
            'success': True,
            'message': f'Payment automation completed: {total_payments} payments registered',
            'users_processed': len(user_ids),
            'total_payments_registered': total_payments,
            'results': results
        }), 200

    except Exception as e:
        app.logger.error("Payment automation error", exc_info=True)
        return jsonify({'error': f'Failed to run payment automation: {str(e)}'}), 500


@app.route('/automation/sync-reminder-fees', methods=['POST'])
def run_reminder_fee_sync():
    """Sync reminder fee data from Dinero for automation-enabled users."""
    payload = request.get_json(silent=True) or {}
    target_user_id = payload.get('user_id')
    changes_since_override = payload.get('changes_since')

    try:
        app.logger.info(
            "Starting reminder fee sync",
            extra={'target_user': target_user_id, 'changes_since_override': changes_since_override}
        )

        from sync_reminder_fees import sync_reminder_fees_for_user, get_last_reminder_sync_time
        from dinero_service import DineroService

        if target_user_id:
            user_ids = [target_user_id]
        else:
            response = supabase.table('automation_settings') \
                .select('user_id') \
                .eq('automation_enabled', True) \
                .execute()
            user_ids = [row['user_id'] for row in (response.data or [])]

        if not user_ids:
            return jsonify({
                'success': True,
                'message': 'No eligible users found for reminder fee sync',
                'users_processed': 0
            }), 200

        dinero_service = DineroService()
        results = []

        for user_id in user_ids:
            try:
                profile_resp = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
                profile = profile_resp.data
                if not profile or not profile.get('is_dinero_connected'):
                    results.append({
                        'user_id': user_id,
                        'success': False,
                        'error': 'Dinero not connected'
                    })
                    continue

                access_token, token_update = dinero_service.get_valid_access_token(profile)
                if not access_token:
                    results.append({
                        'user_id': user_id,
                        'success': False,
                        'error': 'Could not obtain Dinero access token'
                    })
                    continue

                if token_update:
                    supabase.table('profiles').update(token_update).eq('id', user_id).execute()

                org_id = profile.get('dinero_org_id') or profile.get('dinero_organization_id')
                if not org_id:
                    results.append({
                        'user_id': user_id,
                        'success': False,
                        'error': 'Missing Dinero organization id'
                    })
                    continue

                changes_since = changes_since_override or get_last_reminder_sync_time(user_id)
                stats = sync_reminder_fees_for_user(user_id, access_token, org_id, changes_since)
                results.append({
                    'user_id': user_id,
                    'success': True,
                    'stats': stats
                })

            except Exception as user_error:
                app.logger.error(
                    "Reminder fee sync failed for user",
                    extra={'user_id': user_id, 'error': str(user_error)}
                )
                results.append({
                    'user_id': user_id,
                    'success': False,
                    'error': str(user_error)
                })

        return jsonify({
            'success': True,
            'message': 'Reminder fee sync complete',
            'users_processed': len(user_ids),
            'results': results
        }), 200

    except Exception as e:
        app.logger.error("Reminder fee sync error", exc_info=True)
        return jsonify({'error': f'Failed to sync reminder fees: {str(e)}'}), 500


@app.route('/automation/reminder-automation', methods=['POST'])
def run_reminder_automation():
    """Trigger reminder sending workflow for overdue invoices."""
    payload = request.get_json(silent=True) or {}
    target_user_id = payload.get('user_id')
    dry_run = bool(payload.get('dry_run', False))

    try:
        app.logger.info(
            "Starting reminder automation",
            extra={'target_user': target_user_id, 'dry_run': dry_run}
        )

        from invoice_reminder_automation import run_reminder_automation_for_user

        if target_user_id:
            user_ids = [target_user_id]
        else:
            response = supabase.table('automation_settings') \
                .select('user_id') \
                .eq('automation_enabled', True) \
                .execute()
            user_ids = [row['user_id'] for row in (response.data or [])]

        if not user_ids:
            return jsonify({
                'success': True,
                'message': 'No eligible users found for reminder automation',
                'users_processed': 0
            }), 200

        results = []
        total_reminders = total_inkasso = 0

        for user_id in user_ids:
            try:
                result = run_reminder_automation_for_user(user_id, supabase, dry_run=dry_run)
                reminders_sent = result.get('reminders_sent', 0)
                inkasso_moved = result.get('inkasso_moved', 0)
                total_reminders += reminders_sent
                total_inkasso += inkasso_moved
                results.append({
                    'user_id': user_id,
                    'success': True,
                    'reminders_sent': reminders_sent,
                    'inkasso_moved': inkasso_moved
                })
            except Exception as user_error:
                app.logger.error(
                    "Reminder automation failed for user",
                    extra={'user_id': user_id, 'error': str(user_error)}
                )
                results.append({
                    'user_id': user_id,
                    'success': False,
                    'error': str(user_error)
                })

        return jsonify({
            'success': True,
            'message': 'Reminder automation complete',
            'users_processed': len(user_ids),
            'total_reminders_sent': total_reminders,
            'total_inkasso_moved': total_inkasso,
            'dry_run': dry_run,
            'results': results
        }), 200

    except Exception as e:
        app.logger.error("Reminder automation error", exc_info=True)
        return jsonify({'error': f'Failed to run reminder automation: {str(e)}'}), 500


# --- Contact Form Endpoint (public, no auth required) ---
# In-memory rate limiting store
_contact_rate_limit: dict = {}

@app.route('/contact', methods=['POST'])
def contact_form():
    """
    Public endpoint for marketing contact form submissions.
    Validates input, rate-limits by IP, and inserts into Supabase.
    """
    RATE_LIMIT_WINDOW = 60  # seconds
    RATE_LIMIT_MAX = 3  # max requests per window

    # Get client IP for rate limiting
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if client_ip and ',' in client_ip:
        client_ip = client_ip.split(',')[0].strip()

    now = time.time()

    # Clean up expired entries
    expired_keys = [k for k, v in _contact_rate_limit.items() if v['expires'] <= now]
    for k in expired_keys:
        del _contact_rate_limit[k]

    # Check rate limit
    entry = _contact_rate_limit.get(client_ip)
    if entry:
        if entry['hits'] >= RATE_LIMIT_MAX:
            app.logger.warning(f"Contact form rate limit exceeded for IP: {client_ip}")
            return jsonify({'error': 'For mange forsøg. Prøv igen om et øjeblik.'}), 429
        entry['hits'] += 1
    else:
        _contact_rate_limit[client_ip] = {'hits': 1, 'expires': now + RATE_LIMIT_WINDOW}

    # Parse form data (supports both JSON and form-encoded)
    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form.to_dict()

    first_name = (data.get('firstName') or '').strip()
    last_name = (data.get('lastName') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip() or None
    company = (data.get('company') or '').strip() or None
    message = (data.get('message') or '').strip()
    source_page = (data.get('sourcePage') or '').strip() or 'Kontakt'

    # Validation
    if not first_name or not last_name or not email or not message:
        return jsonify({'error': 'Udfyld venligst alle obligatoriske felter.'}), 400

    # Basic email validation
    import re
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({'error': 'Angiv en gyldig emailadresse.'}), 400

    if len(message) < 10:
        return jsonify({'error': 'Beskeden skal være mindst 10 tegn.'}), 400

    full_name = f"{first_name} {last_name}".strip()

    try:
        result = supabase.table('contact_messages').insert({
            'full_name': full_name,
            'email': email,
            'company': company,
            'phone': phone,
            'message': message,
            'source_page': source_page,
        }).execute()

        app.logger.info(f"Contact form submission saved: {email} from {source_page}")
        return jsonify({'message': 'Tak for din besked! Vi vender tilbage hurtigst muligt.'}), 200

    except Exception as e:
        app.logger.error(f"Failed to save contact form submission: {e}", exc_info=True)
        return jsonify({'error': 'Noget gik galt. Prøv igen om et øjeblik.'}), 500


# --- Auth Endpoints (Backend-controlled) ---
@app.route('/auth/signup', methods=['POST'])
@limiter.limit("5 per minute")  # Strict limit on signups
@limiter.limit("20 per hour")
def signup():
    """
    Handle user signup through backend to prevent direct Supabase abuse.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        full_name = data.get('full_name', '').strip()
        company = data.get('company', '').strip()
        
        # Validation
        if not email or not password:
            return jsonify({'error': 'Email og adgangskode er påkrævet'}), 400
        
        if len(password) < 8:
            return jsonify({'error': 'Adgangskode skal være mindst 8 tegn'}), 400
        
        # Basic email validation
        import re
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return jsonify({'error': 'Ugyldig emailadresse'}), 400
        
        app.logger.info(f"Signup attempt for email: {email}")
        
        # Create user via Supabase Admin API
        auth_response = supabase.auth.admin.create_user({
            'email': email,
            'password': password,
            'email_confirm': True,  # Auto-confirm for now, change to False for email verification
            'user_metadata': {
                'full_name': full_name,
                'company': company,
            }
        })
        
        if not auth_response.user:
            app.logger.error(f"Signup failed for {email}: No user returned")
            return jsonify({'error': 'Kunne ikke oprette bruger'}), 500
        
        user = auth_response.user
        app.logger.info(f"User created successfully: {user.id}")
        
        # Create profile record
        supabase.table('profiles').upsert({
            'id': user.id,
            'full_name': full_name,
            'company_name': company,
        }).execute()
        
        # Sign in the user to get a session
        sign_in_response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password,
        })
        
        if not sign_in_response.session:
            return jsonify({'error': 'Bruger oprettet, men kunne ikke logge ind'}), 500
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
            },
            'session': {
                'access_token': sign_in_response.session.access_token,
                'refresh_token': sign_in_response.session.refresh_token,
                'expires_at': sign_in_response.session.expires_at,
            }
        }), 200
        
    except Exception as e:
        error_msg = str(e)
        app.logger.error(f"Signup error: {error_msg}", exc_info=True)
        
        # Handle common Supabase errors
        if 'already registered' in error_msg.lower() or 'already exists' in error_msg.lower():
            return jsonify({'error': 'Denne email er allerede registreret'}), 409
        
        return jsonify({'error': 'Der opstod en fejl. Prøv igen.'}), 500


@app.route('/auth/login', methods=['POST'])
@limiter.limit("10 per minute")  # Prevent brute force
@limiter.limit("50 per hour")
def login():
    """
    Handle user login through backend.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email og adgangskode er påkrævet'}), 400
        
        app.logger.info(f"Login attempt for email: {email}")
        
        # Sign in via Supabase
        sign_in_response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password,
        })
        
        if not sign_in_response.session or not sign_in_response.user:
            app.logger.warning(f"Login failed for {email}: Invalid credentials")
            return jsonify({'error': 'Forkert email eller adgangskode'}), 401
        
        user = sign_in_response.user
        session = sign_in_response.session
        
        app.logger.info(f"Login successful for user: {user.id}")
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
            },
            'session': {
                'access_token': session.access_token,
                'refresh_token': session.refresh_token,
                'expires_at': session.expires_at,
            }
        }), 200
        
    except Exception as e:
        error_msg = str(e)
        app.logger.error(f"Login error: {error_msg}", exc_info=True)
        
        if 'invalid' in error_msg.lower() or 'credentials' in error_msg.lower():
            return jsonify({'error': 'Forkert email eller adgangskode'}), 401
        
        return jsonify({'error': 'Der opstod en fejl. Prøv igen.'}), 500


@app.route('/auth/refresh', methods=['POST'])
def refresh_token():
    """
    Refresh an expired access token using a refresh token.
    """
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'error': 'Refresh token required'}), 400
        
        # Refresh the session
        response = supabase.auth.refresh_session(refresh_token)
        
        if not response.session:
            return jsonify({'error': 'Could not refresh session'}), 401
        
        return jsonify({
            'success': True,
            'session': {
                'access_token': response.session.access_token,
                'refresh_token': response.session.refresh_token,
                'expires_at': response.session.expires_at,
            }
        }), 200
        
    except Exception as e:
        app.logger.error(f"Token refresh error: {e}", exc_info=True)
        return jsonify({'error': 'Could not refresh session'}), 401


@app.route('/auth/logout', methods=['POST'])
@user_required
def logout(current_user):
    """
    Log out the current user.
    """
    try:
        app.logger.info(f"Logout for user: {current_user['id']}")
        # The JWT will be invalidated on the client side
        # Supabase doesn't have server-side session invalidation with anon key
        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"Logout error: {e}", exc_info=True)
        return jsonify({'error': 'Logout failed'}), 500


# --- Onboarding Endpoint ---
@app.route('/onboarding/complete', methods=['POST'])
@user_required
def complete_onboarding(current_user):
    """
    Save onboarding data and start trial.
    """
    app.logger.info(f"Completing onboarding for user {current_user['id']}")
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Calculate trial end date (14 days from now)
        trial_ends_at = datetime.now(timezone.utc) + timedelta(days=14)
        
        # Prepare update payload
        update_payload = {
            'company_name': data.get('company_name'),
            'cvr': data.get('cvr'),
            'address': data.get('address'),
            'city': data.get('city'),
            'postal_code': data.get('postal_code'),
            'phone': data.get('phone'),
            'invoice_email': data.get('invoice_email'),
            'subscription_plan': data.get('subscription_plan', 'professional'),
            'billing_cycle': data.get('billing_cycle', 'monthly'),
            'subscription_status': 'trialing',
            'trial_ends_at': trial_ends_at.isoformat(),
            'onboarding_completed': True,
        }
        
        # Update profile
        result = supabase.table('profiles').update(update_payload).eq('id', current_user['id']).execute()
        
        if not result.data:
            app.logger.error(f"Failed to update profile for user {current_user['id']}")
            return jsonify({'error': 'Failed to save onboarding data'}), 500
        
        app.logger.info(f"Onboarding completed for user {current_user['id']}, trial ends at {trial_ends_at}")
        
        return jsonify({
            'success': True,
            'message': 'Onboarding completed successfully',
            'trial_ends_at': trial_ends_at.isoformat(),
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error completing onboarding for user {current_user['id']}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to complete onboarding'}), 500


# --- Subscription Check Endpoint ---
@app.route('/auth/check', methods=['GET'])
@user_required
def check_auth_and_subscription(current_user):
    """
    Check user's authentication status and subscription.
    Returns user info, subscription status, and whether they have access.
    """
    app.logger.info(f"Auth check for user {current_user['id']}")
    
    try:
        subscription_status = current_user.get('subscription_status')
        onboarding_completed = current_user.get('onboarding_completed', False)
        trial_ends_at = current_user.get('trial_ends_at')
        
        # Check if user has active subscription or valid trial
        has_active_subscription = subscription_status in ['active', 'trialing']
        
        # Check if trial is still valid
        trial_valid = False
        if trial_ends_at:
            try:
                trial_end_date = datetime.fromisoformat(trial_ends_at.replace('Z', '+00:00'))
                trial_valid = trial_end_date > datetime.now(timezone.utc)
            except Exception as e:
                app.logger.error(f"Error parsing trial_ends_at: {e}")
        
        # User has dashboard access if:
        # 1. Has completed onboarding AND
        # 2. Has active subscription OR valid trial
        has_access = onboarding_completed and (has_active_subscription or trial_valid)
        
        # Calculate days remaining in trial
        days_remaining = None
        if trial_ends_at and trial_valid:
            try:
                trial_end_date = datetime.fromisoformat(trial_ends_at.replace('Z', '+00:00'))
                days_remaining = (trial_end_date - datetime.now(timezone.utc)).days
            except:
                pass
        
        response_data = {
            'authenticated': True,
            'user': {
                'id': current_user['id'],
                'full_name': current_user.get('full_name'),
                'company_name': current_user.get('company_name'),
                'avatar_url': current_user.get('avatar_url'),
                'is_dinero_connected': current_user.get('is_dinero_connected', False),
                'is_gocardless_connected': current_user.get('is_gocardless_connected', False),
            },
            'subscription': {
                'status': subscription_status,
                'plan': current_user.get('subscription_plan'),
                'billing_cycle': current_user.get('billing_cycle'),
                'trial_ends_at': trial_ends_at,
                'trial_valid': trial_valid,
                'days_remaining': days_remaining,
            },
            'onboarding_completed': onboarding_completed,
            'has_access': has_access,
        }
        
        app.logger.info(f"Auth check result for user {current_user['id']}: has_access={has_access}, subscription={subscription_status}")
        return jsonify(response_data), 200
        
    except Exception as e:
        app.logger.error(f"Error in auth check for user {current_user['id']}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to check subscription status'}), 500


# --- Stripe Configuration ---
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

# Price ID mapping - will be populated from Stripe API
STRIPE_PRICE_IDS = {}

def load_stripe_prices():
    """Load price IDs from Stripe API"""
    global STRIPE_PRICE_IDS
    try:
        if not stripe.api_key:
            app.logger.warning("STRIPE_SECRET_KEY not set, skipping price loading")
            return
            
        prices = stripe.Price.list(active=True, expand=['data.product'])
        
        for price in prices.data:
            # Use lookup_key or nickname to identify prices
            lookup_key = price.lookup_key or price.nickname or ''
            lookup_key_lower = lookup_key.lower()
            interval = price.recurring.interval if price.recurring else 'one_time'
            billing_key = 'yearly' if interval == 'year' else 'monthly'
            
            # Map lookup_key patterns to our plan names
            plan_key = None
            if 'standard' in lookup_key_lower or 'starter' in lookup_key_lower:
                plan_key = 'starter'
            elif 'pro' in lookup_key_lower or 'professional' in lookup_key_lower:
                plan_key = 'professional'
            elif 'enterprise' in lookup_key_lower:
                plan_key = 'enterprise'
            
            if plan_key:
                STRIPE_PRICE_IDS[f"{plan_key}_{billing_key}"] = price.id
                app.logger.info(f"Loaded Stripe price: {plan_key}_{billing_key} = {price.id} (from lookup_key: {lookup_key})")
        
        app.logger.info(f"Loaded {len(STRIPE_PRICE_IDS)} Stripe prices: {STRIPE_PRICE_IDS}")
    except Exception as e:
        app.logger.error(f"Failed to load Stripe prices: {e}")


# --- Stripe Endpoints ---

@app.route('/stripe/prices', methods=['GET'])
def get_stripe_prices():
    """Get available Stripe prices"""
    try:
        if not STRIPE_PRICE_IDS:
            load_stripe_prices()
        return jsonify({'prices': STRIPE_PRICE_IDS}), 200
    except Exception as e:
        app.logger.error(f"Error getting Stripe prices: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/stripe/create-checkout-session', methods=['POST'])
@user_required
def create_checkout_session(current_user):
    """Create a Stripe Embedded Checkout session"""
    try:
        data = request.get_json()
        plan = data.get('plan', 'professional').lower()
        billing_cycle = data.get('billing_cycle', 'monthly').lower()
        
        # Get price ID
        price_key = f"{plan}_{billing_cycle}"
        if not STRIPE_PRICE_IDS:
            load_stripe_prices()
        
        price_id = STRIPE_PRICE_IDS.get(price_key)
        if not price_id:
            app.logger.error(f"Price not found for {price_key}. Available: {STRIPE_PRICE_IDS}")
            return jsonify({'error': f'Price not found for {plan} {billing_cycle}'}), 400
        
        # Get frontend URL for redirects
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000').split(',')[0].strip()
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            ui_mode='embedded',
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            return_url=f"{frontend_url}/onboarding/success?session_id={{CHECKOUT_SESSION_ID}}",
            customer_email=current_user.get('email'),
            metadata={
                'user_id': current_user['id'],
                'plan': plan,
                'billing_cycle': billing_cycle,
            },
            subscription_data={
                'metadata': {
                    'user_id': current_user['id'],
                    'plan': plan,
                    'billing_cycle': billing_cycle,
                },
                'trial_period_days': 14,  # 14 day trial
            },
        )
        
        app.logger.info(f"Created checkout session {checkout_session.id} for user {current_user['id']}, plan={plan}, billing={billing_cycle}")
        
        return jsonify({
            'clientSecret': checkout_session.client_secret,
            'sessionId': checkout_session.id,
        }), 200
        
    except stripe.error.StripeError as e:
        app.logger.error(f"Stripe error creating checkout session: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        app.logger.error(f"Error creating checkout session: {e}", exc_info=True)
        return jsonify({'error': 'Failed to create checkout session'}), 500


@app.route('/stripe/session-status', methods=['GET'])
@user_required
def get_session_status(current_user):
    """Get the status of a checkout session"""
    try:
        session_id = request.args.get('session_id')
        if not session_id:
            return jsonify({'error': 'session_id required'}), 400
        
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # If payment successful, update user's subscription in database
        if checkout_session.status == 'complete' and checkout_session.payment_status == 'paid':
            # Get subscription details
            subscription = stripe.Subscription.retrieve(checkout_session.subscription)
            
            # Update user profile with subscription info
            update_data = {
                'subscription_status': 'trialing' if subscription.status == 'trialing' else 'active',
                'subscription_plan': checkout_session.metadata.get('plan', 'professional'),
                'billing_cycle': checkout_session.metadata.get('billing_cycle', 'monthly'),
                'stripe_customer_id': checkout_session.customer,
                'stripe_subscription_id': checkout_session.subscription,
                'onboarding_completed': True,
            }
            
            # Set trial end date
            if subscription.trial_end:
                update_data['trial_ends_at'] = datetime.fromtimestamp(subscription.trial_end, tz=timezone.utc).isoformat()
            
            # Update profile
            supabase.table('profiles').update(update_data).eq('id', current_user['id']).execute()
            
            app.logger.info(f"Updated subscription for user {current_user['id']}: {update_data}")
        
        return jsonify({
            'status': checkout_session.status,
            'payment_status': checkout_session.payment_status,
            'customer_email': checkout_session.customer_details.email if checkout_session.customer_details else None,
        }), 200
        
    except stripe.error.StripeError as e:
        app.logger.error(f"Stripe error getting session status: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        app.logger.error(f"Error getting session status: {e}", exc_info=True)
        return jsonify({'error': 'Failed to get session status'}), 500


@app.route('/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhooks for subscription events"""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            # For development without webhook secret
            event = json.loads(payload)
            app.logger.warning("Processing webhook without signature verification (dev mode)")
        
        event_type = event.get('type') if isinstance(event, dict) else event.type
        event_data = event.get('data', {}).get('object', {}) if isinstance(event, dict) else event.data.object
        
        app.logger.info(f"Received Stripe webhook: {event_type}")
        
        # Handle subscription events
        if event_type == 'customer.subscription.updated':
            subscription_id = event_data.get('id') if isinstance(event_data, dict) else event_data.id
            status = event_data.get('status') if isinstance(event_data, dict) else event_data.status
            
            # Find user by stripe_subscription_id
            result = supabase.table('profiles').select('id').eq('stripe_subscription_id', subscription_id).execute()
            if result.data:
                user_id = result.data[0]['id']
                supabase.table('profiles').update({
                    'subscription_status': status
                }).eq('id', user_id).execute()
                app.logger.info(f"Updated subscription status for user {user_id}: {status}")
        
        elif event_type == 'customer.subscription.deleted':
            subscription_id = event_data.get('id') if isinstance(event_data, dict) else event_data.id
            
            result = supabase.table('profiles').select('id').eq('stripe_subscription_id', subscription_id).execute()
            if result.data:
                user_id = result.data[0]['id']
                supabase.table('profiles').update({
                    'subscription_status': 'canceled',
                    'stripe_subscription_id': None,
                }).eq('id', user_id).execute()
                app.logger.info(f"Subscription canceled for user {user_id}")
        
        elif event_type == 'invoice.payment_failed':
            subscription_id = event_data.get('subscription') if isinstance(event_data, dict) else event_data.subscription
            
            if subscription_id:
                result = supabase.table('profiles').select('id').eq('stripe_subscription_id', subscription_id).execute()
                if result.data:
                    user_id = result.data[0]['id']
                    supabase.table('profiles').update({
                        'subscription_status': 'past_due'
                    }).eq('id', user_id).execute()
                    app.logger.info(f"Payment failed for user {user_id}, status set to past_due")
        
        return jsonify({'received': True}), 200
        
    except stripe.error.SignatureVerificationError as e:
        app.logger.error(f"Webhook signature verification failed: {e}")
        return jsonify({'error': 'Invalid signature'}), 400
    except Exception as e:
        app.logger.error(f"Webhook error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# --- Main Execution ---
if __name__ == '__main__':
    if not supabase:
        app.logger.error("Application cannot start because Supabase client failed to initialize. Please check your .env file.")
        sys.exit(1)
    else:
        # Load Stripe prices on startup
        load_stripe_prices()
        app.run(debug=True, port=5003)