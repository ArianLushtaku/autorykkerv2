#!/usr/bin/env python3
"""
Dinero SMS Service
Handles sending SMS reminders via Dinero API
"""

import logging
import requests
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class DineroSMSService:
    """Service for sending SMS reminders via Dinero API"""
    
    BASE_URL = "https://api.dinero.dk/v1"
    
    def __init__(self, access_token: str, organization_id: str):
        """
        Initialize Dinero SMS Service
        
        Args:
            access_token: Valid Dinero API access token
            organization_id: Dinero organization ID
        """
        self.access_token = access_token
        self.organization_id = organization_id
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
    
    def send_sms(
        self,
        voucher_guid: str,
        receiver_phone: str,
        receiver_name: str,
        invoice_timestamp: str,
        is_reminder: bool,
        message: str
    ) -> bool:
        """
        Send SMS for an invoice
        
        Args:
            voucher_guid: Invoice GUID (dinero_guid)
            receiver_phone: Customer phone number
            receiver_name: Customer name
            invoice_timestamp: Timestamp of the invoice
            is_reminder: True for reminder (Rykker), False for pre-reminder (Påmindelse)
            message: SMS message text (can include [link-to-pdf] placeholder)
        
        Returns:
            True if SMS sent successfully, False otherwise
        """
        url = f"{self.BASE_URL}/{self.organization_id}/sms/{voucher_guid}/send-sms"
        
        payload = {
            "receiverPhoneNumber": receiver_phone,
            "receiverName": receiver_name,
            "timestamp": invoice_timestamp,
            "isReminder": is_reminder,
            "message": message
        }
        
        try:
            logger.info(f"📱 Sending SMS to {receiver_name} ({receiver_phone}) for invoice {voucher_guid}")
            logger.debug(f"   IsReminder: {is_reminder}")
            logger.debug(f"   Message preview: {message[:100]}...")
            
            response = requests.post(url, json=payload, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                logger.info(f"✅ SMS sent successfully to {receiver_name}")
                return True
            else:
                logger.error(f"❌ Failed to send SMS: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error sending SMS: {e}")
            return False
    
    def format_sms_message(
        self,
        template: str,
        invoice_number: str,
        customer_name: str,
        amount: float,
        company_name: str,
        reminder_stage: str = "reminder"
    ) -> str:
        """
        Format SMS message with variables
        
        Args:
            template: Message template with placeholders
            invoice_number: Invoice number
            customer_name: Customer name
            amount: Invoice amount
            company_name: Company name
            reminder_stage: 'prereminder' or 'reminder'
        
        Returns:
            Formatted message with variables replaced
        
        Available placeholders:
            {customer_name} - Customer name
            {invoice_number} - Invoice number
            {amount} - Invoice amount (formatted with DKK)
            {company_name} - Company name
            [link-to-pdf] - Invoice PDF link (handled by Dinero)
        """
        # Format amount with 2 decimals and DKK
        formatted_amount = f"{amount:,.2f} DKK".replace(",", ".")
        
        # Replace placeholders
        message = template.replace("{customer_name}", customer_name)
        message = message.replace("{invoice_number}", invoice_number)
        message = message.replace("{amount}", formatted_amount)
        message = message.replace("{company_name}", company_name)
        
        return message
    
    @staticmethod
    def get_default_prereminder_template() -> str:
        """
        Get default pre-reminder (Påmindelse) SMS template
        
        Variables:
            {customer_name} - Customer name
            {invoice_number} - Invoice number
            {amount} - Invoice amount (formatted with DKK)
            {company_name} - Company name
            [link-to-pdf] - Invoice PDF link (handled by Dinero API)
        
        Returns:
            Default template string
        """
        return """Kære {customer_name}

Vi må desværre konstatere, at vi ikke har modtaget vores tilgodehavende på {amount} i henhold til faktura {invoice_number}.

Vi skal derfor bede dig om at indbetale vores tilgodehavende hurtigst muligt.

Klik på linket herunder for at downloade fakturaen.
[link-to-pdf]

Med venlig hilsen
{company_name}"""
    
    @staticmethod
    def get_default_reminder_template() -> str:
        """
        Get default reminder (Rykker) SMS template
        
        Variables:
            {customer_name} - Customer name
            {invoice_number} - Invoice number
            {amount} - Invoice amount (formatted with DKK)
            {company_name} - Company name
            [link-to-pdf] - Invoice PDF link (handled by Dinero API)
        
        Returns:
            Default template string
        """
        return """RYKKER - Kære {customer_name}

Vi har endnu ikke modtaget betaling for faktura {invoice_number} på {amount}.

Dette er en officiel rykker. Vi beder dig indbetale beløbet straks for at undgå yderligere rykkergebyrer.

Download faktura:
[link-to-pdf]

Med venlig hilsen
{company_name}"""
