"""
Dinero Payment Registration Service
Handles registering payments for invoices in Dinero
"""

import requests
import logging
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class DineroPaymentService:
    """Service for registering payments in Dinero"""
    
    BASE_URL = "https://api.dinero.dk/v1"
    
    def __init__(self, access_token: str, organization_id: str):
        """
        Initialize the payment service
        
        Args:
            access_token: Dinero API access token
            organization_id: Dinero organization ID
        """
        self.access_token = access_token
        self.organization_id = organization_id
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Dinero API requests"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def get_invoice_details(self, invoice_guid: str) -> Optional[Dict]:
        """
        Get invoice details from Dinero
        
        Args:
            invoice_guid: Dinero invoice GUID
            
        Returns:
            Invoice details dict or None if error
        """
        url = f"{self.BASE_URL}/{self.organization_id}/invoices/{invoice_guid}"
        
        try:
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error fetching invoice {invoice_guid}: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching invoice {invoice_guid}: {e}")
            return None
    
    def register_payment(
        self,
        invoice_guid: str,
        match_id: str,
        payment_amount: float,
        payment_date: str,
        description: str = "Autorykker Registreret"
    ) -> Optional[Dict]:
        """
        Register a payment for an invoice in Dinero
        
        Args:
            invoice_guid: Dinero invoice GUID
            match_id: Invoice match ID (for external reference)
            payment_amount: Payment amount
            payment_date: Payment date (YYYY-MM-DD format)
            description: Payment description
            
        Returns:
            Payment response dict or None if error
        """
        # First, get invoice details to fetch timestamp and depositAccountNumber
        logger.info(f"Fetching invoice details for {invoice_guid}")
        invoice_details = self.get_invoice_details(invoice_guid)
        
        if not invoice_details:
            logger.error(f"Could not fetch invoice details for {invoice_guid}")
            return None
        
        # Extract required fields
        timestamp = invoice_details.get('TimeStamp')
        deposit_account = invoice_details.get('DepositAccountNumber')
        
        if not timestamp:
            logger.error(f"Invoice {invoice_guid} missing TimeStamp")
            return None
        
        if not deposit_account:
            logger.error(f"Invoice {invoice_guid} missing DepositAccountNumber")
            return None
        
        # Prepare payment data
        payment_data = {
            "externalReference": f"AutoRykker - {match_id}",
            "paymentDate": payment_date,
            "description": description,
            "amount": payment_amount,
            "timestamp": timestamp,
            "depositAccountNumber": deposit_account,
            "remainderIsFee": False
        }
        
        # Register payment
        url = f"{self.BASE_URL}/{self.organization_id}/invoices/{invoice_guid}/payments"
        
        try:
            logger.info(f"Registering payment for invoice {invoice_guid}: {payment_amount} DKK on {payment_date}")
            response = requests.post(url, json=payment_data, headers=self._get_headers())
            response.raise_for_status()
            
            logger.info(f"Successfully registered payment for invoice {invoice_guid}")
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            error_text = e.response.text if hasattr(e.response, 'text') else str(e)
            logger.error(f"Error registering payment for invoice {invoice_guid}: {e.response.status_code} - {error_text}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error registering payment for invoice {invoice_guid}: {e}")
            return None
    
    def register_payment_from_match(self, match: Dict) -> Optional[Dict]:
        """
        Register payment from an invoice match
        
        Args:
            match: Invoice match dict with keys:
                - id: Match ID
                - invoice_id: Dinero GUID
                - transaction_amount: Payment amount
                - transaction_date: Payment date
                
        Returns:
            Payment response dict or None if error
        """
        invoice_guid = match.get('invoice_id')
        match_id = match.get('id')
        amount = match.get('transaction_amount')
        transaction_date = match.get('transaction_date')
        
        if not all([invoice_guid, match_id, amount, transaction_date]):
            logger.error(f"Match missing required fields: {match}")
            return None
        
        # Convert transaction_date to YYYY-MM-DD format if needed
        if isinstance(transaction_date, str):
            # Parse ISO format and extract date
            try:
                date_obj = datetime.fromisoformat(transaction_date.replace('Z', '+00:00'))
                payment_date = date_obj.strftime('%Y-%m-%d')
            except:
                payment_date = transaction_date.split('T')[0]  # Simple fallback
        else:
            payment_date = transaction_date.strftime('%Y-%m-%d')
        
        return self.register_payment(
            invoice_guid=invoice_guid,
            match_id=match_id,
            payment_amount=float(amount),
            payment_date=payment_date
        )
