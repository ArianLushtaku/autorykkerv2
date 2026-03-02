"""
Invoice-Transaction Matching Algorithm V2
Simple and accurate matching based on:
1. Invoice number + exact amount
2. Customer name + exact amount
3. Address lookup + exact amount
"""

import csv
import re
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from difflib import SequenceMatcher
import unicodedata

@dataclass
class Invoice:
    dinero_guid: str  # Dinero GUID (unique identifier from Dinero)
    invoice_number: str
    contact_name: str
    total_incl_vat: float
    issue_date: datetime
    status: str
    contact_guid: Optional[str] = None
    latest_mail_out_type: Optional[str] = None
    
    @property
    def invoice_id(self) -> str:
        """Alias for dinero_guid field (for clarity in automation code)"""
        return self.dinero_guid
    
    def __repr__(self):
        return f"Invoice({self.invoice_number}, {self.contact_name}, {self.total_incl_vat} DKK)"


@dataclass
class Transaction:
    id: str
    booking_date: datetime
    amount: float
    debtor_name: str
    remittance_information: str
    additional_information: str
    
    def __repr__(self):
        return f"Transaction({self.amount} DKK, {self.debtor_name})"


@dataclass
class Contact:
    name: str
    address: str
    postal_code: str
    city: str
    contact_guid: Optional[str] = None  # Dinero ContactGuid for matching invoices


@dataclass
class PaymentAmounts:
    """Payment amounts from invoice_payment_amounts table
    
    all_valid_amounts array structure:
    - Index 0: Original invoice amount
    - Index 1: Invoice + 1st reminder fee (Rykker 1)
    - Index 2: Invoice + 2nd reminder fee (Rykker 2)
    - etc.
    """
    invoice_id: str
    invoice_number: str
    all_valid_amounts: List[float]  # Array of valid payment amounts
    
    def __repr__(self):
        return f"PaymentAmounts(Invoice #{self.invoice_number}, Amounts: {self.all_valid_amounts})"


@dataclass
class Match:
    transaction: Transaction
    invoice: Invoice
    confidence: float
    match_reason: str
    
    def __repr__(self):
        return f"Match(confidence={self.confidence:.0%}, reason={self.match_reason})"


class InvoiceMatcherV2:
    def __init__(self, contacts_file: str = None, transactions_file: str = None, invoices_file: str = None, 
                 user_id: Optional[str] = None, 
                 supabase_client = None,
                 only_unpaid: bool = False,
                 from_date = None):
        """Initialize the invoice matcher.
        
        Args:
            contacts_file: Path to contacts CSV (deprecated - use Supabase)
            transactions_file: Path to transactions CSV (deprecated - use Supabase)
            invoices_file: Path to invoices CSV (deprecated - use Supabase)
            user_id: User ID for Supabase queries
            supabase_client: Supabase client instance
            only_unpaid: If True, only load unpaid invoices (for automation)
            from_date: datetime object - only load transactions from this date onwards (for incremental sync)
        """
        # Store Supabase client for on-demand queries
        self.user_id = user_id
        self.supabase_client = supabase_client
        self.only_unpaid = only_unpaid
        self.from_date = from_date
        
        # Load data - customers from Supabase if available, otherwise from CSV
        if supabase_client and user_id:
            print("Loading customers from Supabase...")
            self.contacts = self._load_customers_from_supabase()
        else:
            print("Loading contacts from CSV...")
            self.contacts = self._load_contacts(contacts_file)
        
        # Load transactions from Supabase if available, otherwise from CSV
        if supabase_client and user_id:
            print("Loading transactions from Supabase...")
            self.transactions = self._load_transactions_from_supabase()
        else:
            print("Loading transactions from CSV...")
            self.transactions = self._load_transactions(transactions_file)
        
        # Load invoices from Supabase if available (includes contact_guid), otherwise from CSV
        if supabase_client and user_id:
            print("Loading invoices from Supabase...")
            self.invoices = self._load_invoices_from_supabase()
        else:
            print("Loading invoices from CSV...")
            self.invoices = self._load_invoices(invoices_file)
        
        # Create lookup indexes for fast matching
        self.invoices_by_number = {inv.invoice_number: inv for inv in self.invoices}
        
        # NEW: Index invoices by contact_guid for accurate matching
        # This prevents mixing up invoices from different people with same name
        self.invoices_by_contact_guid = {}
        for inv in self.invoices:
            if inv.contact_guid:
                if inv.contact_guid not in self.invoices_by_contact_guid:
                    self.invoices_by_contact_guid[inv.contact_guid] = []
                self.invoices_by_contact_guid[inv.contact_guid].append(inv)
        
        # Legacy: Also keep name-based index for fallback
        self.invoices_by_contact = {}
        for inv in self.invoices:
            contact_key = self._normalize_text(inv.contact_name)
            if contact_key not in self.invoices_by_contact:
                self.invoices_by_contact[contact_key] = []
            self.invoices_by_contact[contact_key].append(inv)
        
        # Cache for payment amounts (populated on-demand)
        self.payment_amounts_by_invoice = {}
        
        # Load manual match rules from Supabase
        if supabase_client and user_id:
            print("Loading manual match rules from Supabase...")
            self.manual_rules = self._load_manual_rules_from_supabase()
        else:
            self.manual_rules = []
        
    def _normalize_text(self, text: str) -> str:
        """Normalize text: lowercase, remove accents, extra spaces"""
        if not text:
            return ""
        # Remove accents
        text = ''.join(c for c in unicodedata.normalize('NFD', text)
                      if unicodedata.category(c) != 'Mn')
        # Lowercase and remove extra spaces
        text = ' '.join(text.lower().split())
        return text
    
    def _extract_invoice_number(self, text: str) -> Optional[str]:
        """Extract invoice number from transaction text - ONLY explicit references
        
        Supports invoice numbers from 2-6 digits (e.g., 99, 8490, 10335, 100000)
        """
        if not text:
            return None
        
        text = text.strip()
        
        # Check if the text is JUST a number (common in Danish bank transfers)
        # Support 2-6 digit invoice numbers
        if re.match(r'^\d{2,6}$', text):
            return text
        
        # ONLY match explicit invoice references with prefixes
        # Support 2-6 digit invoice numbers
        patterns = [
            r'fak[:\s#]*(\d{2,6})',  # fak: 6684, fak 7074, fak8346, fak10335
            r'faktura[:\s#]*(\d{2,6})',  # faktura 5678, faktura8346, faktura 10329
            r'fakturanr[:\s#.]*(\d{2,6})',  # fakturanr. 5678, fakturanr. 10203
            r'invoice[:\s#]*(\d{2,6})',  # invoice #1234, invoice 10335
            r'fakt[:\s#]*(\d{2,6})',  # fakt 7663, fakt8346, fakt 10335
            r'overførsel[:\s#]*(\d{2,6})', # overførsel 7960, overførsel 8490
            r'overf[:\s#]*(\d{2,6})', # overf 7960
            r'\sf(\d{2,6})\b',  # f7074, f10335 (space before f)
            r'\bnr[:\s#.]*(\d{2,6})',  # nr 8123, nr. 10203
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Check for numbers with spaces like "79 35" -> "7935" or "10 335" -> "10335"
        # Look for pattern: digits space digits at end
        space_number_match = re.search(r'(\d{2,3})\s+(\d{2,3})$', text)
        if space_number_match:
            # Combine the digits
            combined = space_number_match.group(1) + space_number_match.group(2)
            if len(combined) >= 2 and len(combined) <= 6:  # Valid invoice number length
                return combined
        
        return None

    def _extract_invoice_number_from_stripped_text(self, texts: List[str]) -> Optional[str]:
        """Extracts a potential invoice number by finding the first number sequence in texts.
        
        Handles common prefixes like 'f', 'nr', 'fak', 'faktura', etc.
        """
        for text in texts:
            if not text:
                continue
            
            # Use the same extraction logic as _extract_invoice_number
            invoice_num = self._extract_invoice_number(text)
            if invoice_num:
                return invoice_num
            
            # Fallback: Find the first sequence of 2-6 digits (invoice number)
            # This prevents "8014 goethesgade 3" from becoming "80143"
            match = re.search(r'\b(\d{2,6})\b', text)
            if match:
                return match.group(1)
                
        return None
    
    def _fuzzy_match_score(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings (0-1)"""
        str1_norm = self._normalize_text(str1)
        str2_norm = self._normalize_text(str2)
        
        if not str1_norm or not str2_norm:
            return 0.0
        
        return SequenceMatcher(None, str1_norm, str2_norm).ratio()

    def _amounts_match(self, transaction_amount: float, invoice: Invoice, has_invoice_number: bool = False) -> Tuple[bool, str]:
        """Checks if a transaction amount matches an invoice.
        
        Args:
            transaction_amount: Amount from bank transaction
            invoice: Invoice to match against
            has_invoice_number: True if invoice number was explicitly found in transaction text
        
        Returns (matches: bool, reason: str)
        
        Matching priority:
        1. Exact match (within 1 DKK for rounding)
        2. Reminder fees (invoice + rykker gebyr)
        3. LAST RESORT: 10 DKK buffer (only if invoice number explicitly mentioned)
        """
        invoice_amount = invoice.total_incl_vat
        
        # 1. Check for exact match (within 1 DKK for rounding)
        if abs(transaction_amount - invoice_amount) <= 1.0:
            return (True, "exact amount")
        
        # 2. Check if we have payment amounts cached (reminder fees)
        if invoice.invoice_number in self.payment_amounts_by_invoice:
            payment_amounts = self.payment_amounts_by_invoice[invoice.invoice_number]
            
            # Check each amount in the all_valid_amounts array
            if payment_amounts and payment_amounts.all_valid_amounts:
                for index, valid_amount in enumerate(payment_amounts.all_valid_amounts):
                    if valid_amount is not None and abs(transaction_amount - valid_amount) <= 1.0:
                        if index == 0:
                            return (True, "exact amount")
                        else:
                            # Calculate the fee (difference from original amount)
                            original_amount = payment_amounts.all_valid_amounts[0]
                            fee = valid_amount - original_amount
                            reminder_level = index  # 1 = Rykker 1, 2 = Rykker 2, etc.
                            return (True, f"amount + {fee:.2f} DKK (Rykker {reminder_level} paid)")
        
        # 3. Not cached - query Supabase on-demand if client available
        elif hasattr(self, 'supabase_client') and self.supabase_client and hasattr(self, 'user_id') and self.user_id:
            payment_amounts = self._fetch_payment_amounts_for_invoice(invoice.invoice_number)
            if payment_amounts and payment_amounts.all_valid_amounts:
                # Cache it for future lookups
                self.payment_amounts_by_invoice[invoice.invoice_number] = payment_amounts
                
                # Check the amounts
                for index, valid_amount in enumerate(payment_amounts.all_valid_amounts):
                    if valid_amount is not None and abs(transaction_amount - valid_amount) <= 1.0:
                        if index == 0:
                            return (True, "exact amount")
                        else:
                            original_amount = payment_amounts.all_valid_amounts[0]
                            fee = valid_amount - original_amount
                            reminder_level = index
                            return (True, f"amount + {fee:.2f} DKK (Rykker {reminder_level} paid)")
        
        # 4. LAST RESORT: 10 DKK buffer (only if invoice number explicitly mentioned)
        # This handles bank fees, small rounding errors when customer explicitly references invoice
        if has_invoice_number and abs(transaction_amount - invoice_amount) <= 10.0:
            diff = transaction_amount - invoice_amount
            if diff > 0:
                return (True, f"overpaid by {diff:.2f} DKK (invoice number match)")
            else:
                return (True, f"underpaid by {abs(diff):.2f} DKK (invoice number match)")
        
        return (False, "")
    
    def _fetch_payment_amounts_for_invoice(self, invoice_number: str) -> Optional[PaymentAmounts]:
        """Fetch payment amounts for a single invoice from Supabase on-demand.
        
        Queries the invoice_payment_amounts VIEW which correctly accumulates reminder fees.
        
        Args:
            invoice_number: Invoice number to fetch payment amounts for
            
        Returns:
            PaymentAmounts object or None if not found
        """
        try:
            # Query the invoice_payment_amounts VIEW
            # This view correctly accumulates fees (e.g., Rykker 2 = original + fee1 + fee2)
            response = self.supabase_client.table('invoice_payment_amounts') \
                .select('invoice_id, invoice_number, all_valid_amounts') \
                .eq('user_id', self.user_id) \
                .eq('invoice_number', invoice_number) \
                .execute()
            
            if not response.data or len(response.data) == 0:
                return None
            
            row = response.data[0]
            all_amounts = row.get('all_valid_amounts')
            
            # If no amounts available, return None
            if not all_amounts or not isinstance(all_amounts, list) or len(all_amounts) == 0:
                return None
            
            # Convert to floats if needed
            all_amounts = [float(amt) for amt in all_amounts if amt is not None]
            
            if not all_amounts:
                return None
            
            return PaymentAmounts(
                invoice_id=row['invoice_id'],
                invoice_number=str(invoice_number),
                all_valid_amounts=all_amounts
            )
            
        except Exception as e:
            # Silently fail - just means no reminder data available
            return None
    
    def _load_contacts(self, filepath: str) -> List[Contact]:
        """Load contacts from CSV"""
        contacts = []
        try:
            with open(filepath, 'r', encoding='utf-8-sig') as f:  # utf-8-sig handles BOM
                # Detect delimiter
                first_line = f.readline()
                f.seek(0)
                delimiter = ';' if ';' in first_line else ','
                
                reader = csv.DictReader(f, delimiter=delimiter)
                for row in reader:
                    try:
                        contact = Contact(
                            name=row.get('Kontaktnavn', '').strip(),
                            address=row.get('Adresse', '').strip(),
                            postal_code=row.get('Postnummer', '').strip(),
                            city=row.get('By', '').strip()
                        )
                        if contact.name:  # Only add if name is not empty
                            contacts.append(contact)
                    except:
                        continue
        except Exception as e:
            print(f"Warning: Could not load contacts: {e}")
        
        return contacts
    
    def _load_transactions(self, filepath: str) -> List[Transaction]:
        """Load transactions from CSV"""
        transactions = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    amount = float(row['amount'])
                    if amount <= 0:
                        continue

                    # Filter out MobilePay transactions
                    debtor_name = row.get('debtor_name', '')
                    remittance_info = row.get('remittance_information', '')
                    if 'mobilepay' in debtor_name.lower() or 'mobilepay' in remittance_info.lower():
                        continue
                    
                    transactions.append(Transaction(
                        id=row['id'],
                        booking_date=datetime.strptime(row['booking_date'], '%Y-%m-%d'),
                        amount=amount,
                        debtor_name=row.get('debtor_name', ''),
                        remittance_information=row.get('remittance_information', ''),
                        additional_information=row.get('additional_information', '')
                    ))
                except:
                    continue
        
        return transactions
    
    def _load_transactions_from_supabase(self) -> List[Transaction]:
        """Load bank transactions from Supabase bank_transactions table"""
        if not self.supabase_client or not self.user_id:
            return []
        
        try:
            # Fetch ALL transactions by paginating
            all_transactions = []
            page_size = 1000
            offset = 0
            
            while True:
                query = self.supabase_client.table('bank_transactions')\
                    .select('id, booking_date, amount, debtor_name, remittance_information, additional_information')\
                    .eq('user_id', self.user_id)\
                    .gt('amount', 0)
                
                # Add date filter if from_date is specified (for incremental sync)
                if self.from_date:
                    from_date_str = self.from_date.strftime('%Y-%m-%d')
                    query = query.gte('booking_date', from_date_str)
                
                response = query\
                    .order('booking_date', desc=True)\
                    .range(offset, offset + page_size - 1)\
                    .execute()
                
                if not response.data:
                    break
                
                for row in response.data:
                    try:
                        # Filter out MobilePay transactions
                        debtor_name = row.get('debtor_name', '') or ''
                        remittance_info = row.get('remittance_information', '') or ''
                        if 'mobilepay' in debtor_name.lower() or 'mobilepay' in remittance_info.lower():
                            continue
                        
                        all_transactions.append(Transaction(
                            id=row['id'],
                            booking_date=datetime.strptime(row['booking_date'], '%Y-%m-%d'),
                            amount=float(row['amount']),
                            debtor_name=debtor_name,
                            remittance_information=remittance_info,
                            additional_information=row.get('additional_information', '') or ''
                        ))
                    except Exception as e:
                        continue
                
                if len(response.data) < page_size:
                    break
                
                offset += page_size
            
            print(f"Loaded {len(all_transactions)} transactions from Supabase")
            return all_transactions
        except Exception as e:
            print(f"Error loading transactions from Supabase: {e}")
            return []
    
    def _load_customers_from_supabase(self) -> List[Contact]:
        """Load customers from Supabase customers table"""
        if not self.supabase_client or not self.user_id:
            return []
        
        try:
            # Fetch ALL customers by paginating
            all_contacts = []
            page_size = 1000
            offset = 0
            
            while True:
                response = self.supabase_client.table('customers')\
                    .select('contact_guid, name, street, zip_code, city')\
                    .eq('user_id', self.user_id)\
                    .is_('dinero_deleted_at', 'null')\
                    .range(offset, offset + page_size - 1)\
                    .execute()
                
                if not response.data:
                    break
                
                for row in response.data:
                    all_contacts.append(Contact(
                        name=row.get('name', ''),
                        address=row.get('street', ''),
                        postal_code=row.get('zip_code', ''),
                        city=row.get('city', ''),
                        contact_guid=row.get('contact_guid')
                    ))
                
                if len(response.data) < page_size:
                    break
                
                offset += page_size
            
            print(f"Loaded {len(all_contacts)} customers from Supabase")
            return all_contacts
        except Exception as e:
            print(f"Error loading customers from Supabase: {e}")
            return []
    
    def _load_invoices_from_supabase(self) -> List[Invoice]:
        """Load invoices from Supabase invoices table"""
        if not self.supabase_client or not self.user_id:
            return []
        
        try:
            # Fetch ALL invoices by paginating (Supabase default limit is 1000)
            all_invoices = []
            page_size = 1000
            offset = 0
            
            # Determine which statuses to load
            if self.only_unpaid:
                # For automation: only load unpaid invoices (Booked, Overdue)
                statuses = ['Booked', 'Overdue']
            else:
                # For manual matching: load all invoices
                statuses = ['Paid', 'Booked', 'Overdue']
            
            while True:
                response = self.supabase_client.table('invoices')\
                    .select('dinero_guid, invoice_number, contact_name, contact_guid, total_incl_vat, issue_date, status, latest_mail_out_type')\
                    .eq('user_id', self.user_id)\
                    .in_('status', statuses)\
                    .order('dinero_guid')\
                    .range(offset, offset + page_size - 1)\
                    .execute()
                
                if not response.data:
                    break
                
                for row in response.data:
                    try:
                        all_invoices.append(Invoice(
                            dinero_guid=row['dinero_guid'],
                            invoice_number=str(row['invoice_number']),
                            contact_name=row.get('contact_name', ''),
                            total_incl_vat=float(row['total_incl_vat']),
                            issue_date=datetime.strptime(row['issue_date'], '%Y-%m-%d'),
                            status=row['status'],
                            contact_guid=row.get('contact_guid'),
                            latest_mail_out_type=row.get('latest_mail_out_type')
                        ))
                    except Exception as e:
                        continue
                
                # If we got less than page_size, we're done
                if len(response.data) < page_size:
                    break
                
                offset += page_size
            
            # Sort invoices by invoice number (newest first)
            all_invoices.sort(key=lambda x: int(x.invoice_number), reverse=True)
            
            print(f"Loaded {len(all_invoices)} invoices from Supabase")
            return all_invoices
        except Exception as e:
            print(f"Error loading invoices from Supabase: {e}")
            return []
    
    def _load_manual_rules_from_supabase(self) -> List[Dict]:
        """Load manual match rules from Supabase"""
        if not self.supabase_client or not self.user_id:
            return []
        
        try:
            response = self.supabase_client.table('manual_match_rules')\
                .select('*')\
                .eq('user_id', self.user_id)\
                .execute()
            
            rules = response.data if response.data else []
            print(f"Loaded {len(rules)} manual match rules from Supabase")
            return rules
        except Exception as e:
            print(f"Error loading manual match rules from Supabase: {e}")
            return []
    
    def _load_invoices(self, filepath: str) -> List[Invoice]:
        """Load invoices from CSV"""
        invoices = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # Only consider Paid, Booked, and Overdue invoices
                    if row['status'] not in ['Paid', 'Booked', 'Overdue']:
                        continue
                    
                    invoices.append(Invoice(
                        id=row['id'],
                        invoice_number=row['invoice_number'],
                        contact_name=row['contact_name'],
                        total_incl_vat=float(row['total_incl_vat']),
                        issue_date=datetime.strptime(row['issue_date'], '%Y-%m-%d'),
                        status=row['status'],
                        contact_guid=row.get('contact_guid'),  # Include contact_guid
                        latest_mail_out_type=row.get('latest_mail_out_type')
                    ))
                except:
                    continue
        
        # Sort invoices by invoice number (newest first)
        invoices.sort(key=lambda x: int(x.invoice_number), reverse=True)
        
        return invoices
    
    def _find_contact_by_address(self, address_text: str) -> Optional[str]:
        """Find contact name by searching address in Kontakter.csv"""
        address_norm = self._normalize_text(address_text)
        
        for contact in self.contacts:
            # Check if address appears in transaction
            contact_address_norm = self._normalize_text(f"{contact.address} {contact.postal_code} {contact.city}")
            
            if contact.address and len(contact.address) > 5:
                if self._normalize_text(contact.address) in address_norm:
                    return contact.name
            
            # Check postal code + city
            if contact.postal_code and contact.city:
                postal_city = self._normalize_text(f"{contact.postal_code} {contact.city}")
                if postal_city in address_norm and len(postal_city) > 8:
                    return contact.name
        
        return None
    
    # ============================================================================
    # COMMENTED OUT: Previous matching algorithm (kept for reference)
    # ============================================================================
    # def match_transaction_OLD(self, transaction: Transaction) -> Optional[Match]:
    #     """Match a single transaction to an invoice - OLD VERSION"""
    #     
    #     trans_text = f"{transaction.debtor_name} {transaction.remittance_information} {transaction.additional_information}"
    #
    #     # --- NEW STRATEGY 0: STRIP ALL TEXT AND CHECK FOR NUMBER ---
    #     fields_to_strip = [transaction.remittance_information, transaction.debtor_name, transaction.additional_information]
    #     invoice_number_stripped = self._extract_invoice_number_from_stripped_text(fields_to_strip)
    #     if invoice_number_stripped and invoice_number_stripped in self.invoices_by_number:
    #         invoice = self.invoices_by_number[invoice_number_stripped]
    #         matches, reason = self._amounts_match(transaction.amount, invoice)
    #         if matches and invoice.issue_date.date() <= transaction.booking_date.date():
    #             return Match(...)
    #     
    #     # STRATEGY 1: Invoice number matching
    #     # STRATEGY 2: Name matching
    #     # STRATEGY 3: Address lookup
    #     # ... (rest of old algorithm)
    # ============================================================================

    def _extract_address_from_additional_info(self, additional_info: str) -> Optional[dict]:
        """Extract address from additional_information field.
        
        The format uses multiple spaces as field delimiters, but the structure varies:
        - OVERFØRSEL[Name fields...]              [Address]                      [PostalCode]  [City]
        
        Strategy: Find the 4-digit postal code first, then work backwards to identify fields.
        """
        if not additional_info or len(additional_info.strip()) < 10:
            return None
        
        text = additional_info.strip().upper()
        
        # Find the 4-digit postal code (should be near the end)
        # Look for postal code followed by city name
        postal_match = re.search(r'\b(\d{4})\s+([A-ZÆØÅ][A-ZÆØÅa-zæøå\s]+)$', text)
        postal_code = None
        city = ""
        
        if not postal_match:
            # Fallback: Try to find just a 4-digit postal code anywhere
            postal_match = re.search(r'\b(\d{4})\b', text)
            if postal_match:
                postal_code = postal_match.group(1)
                # Try to extract city after postal code
                after_postal = text[postal_match.end():].strip()
                # City is typically the next word(s) after postal code
                city_match = re.match(r'^([A-ZÆØÅ][A-ZÆØÅa-zæøå\s]+?)(?:\s|$)', after_postal)
                city = city_match.group(1).strip() if city_match else ""
        else:
            postal_code = postal_match.group(1)
            city = postal_match.group(2).strip()
        
        # If no postal code found, try to extract just the name
        if not postal_code:
            # Remove common prefixes
            name_text = text.replace('OVERFØRSEL', '').replace('OVERFORSEL', '').strip()
            # If there's text left, treat it as a name
            if name_text and len(name_text) > 3:
                name_parts = name_text.split()
                lastname = name_parts[-1] if name_parts else ""
                return {
                    'lastname': lastname,
                    'address': '',  # No address found
                    'postal_code': '',
                    'city': ''
                }
            return None
        
        # Everything before the postal code
        before_postal = text[:postal_match.start()].strip()
        
        # Split by multiple spaces (2+ spaces indicate field boundaries)
        fields = re.split(r'\s{2,}', before_postal)
        fields = [f.strip() for f in fields if f.strip()]
        
        if len(fields) < 1:
            # Fallback: Try splitting by single space and look for street patterns
            words = before_postal.split()
            if len(words) >= 2:
                # Look for a word followed by a number (typical street address)
                # Start from the end to find the rightmost street pattern
                for i in range(len(words) - 1, 0, -1):
                    if re.search(r'\d', words[i]):
                        # Found potential address (word with number)
                        # Address is from the word before the number to the end
                        address_start = i - 1 if i > 0 else i
                        address = ' '.join(words[address_start:])
                        name_parts = words[:address_start]
                        lastname = name_parts[-1] if name_parts else ""
                        return {
                            'lastname': lastname,
                            'address': address,
                            'postal_code': postal_code,
                            'city': city
                        }
            return None
        
        if len(fields) == 1:
            # Only one field - could be name+address combined or just address
            # Check if it contains a number (likely an address)
            if re.search(r'\d', fields[0]):
                # Has number, likely address. Try to split name from address
                words = fields[0].split()
                for i in range(len(words) - 1, 0, -1):
                    if re.search(r'\d', words[i]):
                        address_start = i - 1 if i > 0 else i
                        address = ' '.join(words[address_start:])
                        name_parts = words[:address_start]
                        lastname = name_parts[-1] if name_parts else ""
                        return {
                            'lastname': lastname,
                            'address': address,
                            'postal_code': postal_code,
                            'city': city
                        }
            # No number, assume it's a name
            return {
                'lastname': "",
                'address': fields[0],
                'postal_code': postal_code,
                'city': city
            }
        
        # Multiple fields - last field is typically the address
        # But verify by checking if it contains a number
        address = fields[-1]
        
        # If the last field doesn't have a number, it might be part of the name
        # Look backwards for the first field with a number (street address)
        if not re.search(r'\d', address):
            for i in range(len(fields) - 1, -1, -1):
                if re.search(r'\d', fields[i]):
                    address = fields[i]
                    name_fields = fields[:i]
                    break
            else:
                # No field with number found, use last field as address anyway
                name_fields = fields[:-1]
        else:
            name_fields = fields[:-1]
        
        # Everything before address is the name
        full_name = ' '.join(name_fields)
        name_parts = full_name.split()
        lastname = name_parts[-1] if name_parts else ""
        
        return {
            'lastname': lastname,
            'address': address,
            'postal_code': postal_code,
            'city': city
        }

    def _normalize_address(self, address: str) -> str:
        """Normalize address by removing all non-alphanumeric characters and converting to uppercase.
        
        Example: "Sundgade 71 J" -> "SUNDGADE71J"
        Example: "Frederikparken 1,2,-2" -> "FREDERIKPARKEN122"
        Example: "Frederikparken 1, 2. 2" -> "FREDERIKPARKEN122"
        """
        if not address:
            return ""
        # Remove all non-alphanumeric characters (spaces, commas, periods, hyphens, etc.)
        normalized = re.sub(r'[^A-ZÆØÅ0-9]', '', address.upper())
        return normalized
    
    def _tokenize_address(self, address: str) -> set:
        """Tokenize address into normalized components for flexible matching.
        
        This creates tokens from the address, removing neighborhood names but keeping
        apartment details. Tokens allow partial matching.
        
        Examples:
        - "Tinggårdvej 4, st tv" -> {"TINGGÅRDVEJ", "4", "ST", "TV"}
        - "Tinggårdvej 4, Ragebøl" -> {"TINGGÅRDVEJ", "4", "RAGEBØL"}
        - "Sundgade 71 J" -> {"SUNDGADE", "71", "J"}
        """
        if not address:
            return set()
        
        # Normalize and split by common delimiters
        address_upper = address.upper()
        # Split by spaces, commas, periods, hyphens
        tokens = re.split(r'[\s,\.\-]+', address_upper)
        
        # Clean and filter tokens
        normalized_tokens = set()
        for token in tokens:
            # Remove non-alphanumeric chars from each token
            clean_token = re.sub(r'[^A-ZÆØÅ0-9]', '', token)
            if clean_token and len(clean_token) > 0:
                normalized_tokens.add(clean_token)
        
        return normalized_tokens
    
    def _address_tokens_match(self, contact_address: str, transaction_address: str) -> bool:
        """Check if contact address matches transaction address with exact apartment matching.
        
        Strategy:
        1. Extract base address (street name + number) from both
        2. Check if base addresses match
        3. If contact has apartment info, transaction MUST have the same apartment info
        4. If contact has NO apartment info, transaction can have any apartment info (or none)
        
        Examples:
        - Contact: "Midtkobbel 11" (no apartment)
        - Transaction: "Midtkobbel 11, 1. tv" 
        - Match: YES (contact has no apartment requirement)
        
        - Contact: "Midtkobbel 11, 1. tv"
        - Transaction: "Midtkobbel 11, 1. tv"
        - Match: YES (exact apartment match)
        
        - Contact: "Midtkobbel 11, 1. tv"
        - Transaction: "Midtkobbel 11, 2. th"
        - Match: NO (different apartments)
        
        - Contact: "Midtkobbel 11, 1. tv"
        - Transaction: "Midtkobbel 11"
        - Match: NO (contact requires apartment, transaction doesn't have it)
        """
        contact_tokens = self._tokenize_address(contact_address)
        transaction_tokens = self._tokenize_address(transaction_address)
        
        if not contact_tokens:
            return False
        
        # Separate base address tokens (street + number) from apartment tokens
        # Apartment indicators: ST, TV, TH, MF, SAL, KL, numbers like 1, 2, 3 when combined with ST/TV/TH
        apartment_indicators = {'ST', 'TV', 'TH', 'MF', 'SAL', 'KL', 'ETG'}
        
        # Extract base address (street name + house number)
        # House number is typically 1-3 digits, sometimes with letters like 11A
        contact_base = set()
        contact_apartment = set()
        
        for token in contact_tokens:
            # Check if it's an apartment indicator or a floor number (1-9 when near apartment indicators)
            if token in apartment_indicators or (token.isdigit() and len(token) == 1):
                contact_apartment.add(token)
            else:
                contact_base.add(token)
        
        transaction_base = set()
        transaction_apartment = set()
        
        for token in transaction_tokens:
            if token in apartment_indicators or (token.isdigit() and len(token) == 1):
                transaction_apartment.add(token)
            else:
                transaction_base.add(token)
        
        # Base address must match
        if not contact_base.issubset(transaction_base):
            return False
        
        # If contact has apartment info, transaction MUST have the same apartment info
        if contact_apartment:
            return contact_apartment.issubset(transaction_apartment)
        
        # If contact has NO apartment info, match regardless of transaction apartment
        return True
    
    def match_transaction(self, transaction: Transaction) -> Optional[Match]:
        """COMBINED MATCHING ALGORITHM
        
        Strategy (PRIORITY ORDER):
        1. **HIGHEST PRIORITY**: Invoice number extraction - if customer writes invoice number, use it!
        2. Address-based matching (lastname + address or address only)
        3. Name matching
        4. FALLBACK: Fuzzy name matching (for cases with no postal code)
        5. FALLBACK: Combined invoice payment (multiple invoices in one transaction)
        
        CRITICAL: Invoice number matching MUST come first to prevent revenue loss.
        Example: Customer writes "Faktura 7660" but we match to newer invoice 8456 by address/amount.
        Result: Invoice 7660 stays unpaid, 8456 gets marked paid → company loses money!
        """
        
        # Store debug info for unmatched transactions
        if not hasattr(transaction, 'debug_info'):
            transaction.debug_info = []
        
        # ===== PRIORITY 1: Invoice number extraction (HIGHEST PRIORITY) =====
        # When customer explicitly writes invoice number, ALWAYS use it first
        match = self._match_by_invoice_number(transaction)
        if match:
            return match
        
        # ===== PRIORITY 2: Address-based matching =====
        match = self._match_by_address(transaction)
        if match:
            return match
        
        # ===== PRIORITY 3: Name matching =====
        match = self._match_by_name(transaction)
        if match:
            return match
        
        # ===== FALLBACK: Fuzzy name matching (when no postal code/address found) =====
        match = self._match_by_fuzzy_name(transaction)
        if match:
            return match
        
        # ===== FALLBACK: Combined invoice payment (multiple invoices in one transaction) =====
        match = self._match_combined_invoices(transaction)
        if match:
            return match
        
        # ===== LAST RESORT: Manual match rules (learned from previous manual reviews) =====
        match = self._match_by_manual_rules(transaction)
        if match:
            return match
        
        return None
    
    def _match_by_address(self, transaction: Transaction) -> Optional[Match]:
        """NEW ADDRESS-BASED MATCHING (from additional_information field)
        
        Strategy:
        1. Extract address from additional_information field (using space delimiters)
        2. Try matching with lastname + address (high confidence 0.95)
        3. If no match, try address only (lower confidence 0.75)
        4. Match based on amount
        """
        
        # Extract address components from additional_information
        extracted = self._extract_address_from_additional_info(transaction.additional_information)
        
        # Fallback: if no address in additional_information, try direct token matching from remittance_information
        # This handles cases like "Overførsel 8764 Midtkobbel 11, Sønderborg"
        if not extracted or not extracted.get('address'):
            # Try to find contact by tokenizing remittance_information and matching against addresses
            remittance_text = transaction.remittance_information or ""
            if remittance_text:
                remittance_upper = remittance_text.upper()
                
                # Try to find a contact whose address tokens match
                for contact in self.contacts:
                    if self._address_tokens_match(contact.address, remittance_text):
                        # Found a potential contact by base address!
                        # Now VERIFY: Check if contact's FULL address (including apartment) is in remittance text
                        contact_tokens = self._tokenize_address(contact.address)
                        
                        # Check if ALL contact address tokens appear in remittance text
                        # This ensures apartment info matches if contact has apartment
                        all_tokens_present = True
                        for token in contact_tokens:
                            if token not in remittance_upper:
                                all_tokens_present = False
                                transaction.debug_info.append(f"Contact {contact.name} at {contact.address} - missing token '{token}' in remittance info")
                                break
                        
                        if not all_tokens_present:
                            continue  # Skip this contact, apartment info doesn't match
                        
                        # Full address matches! Now check if they have matching invoices
                        if contact.contact_guid and contact.contact_guid in self.invoices_by_contact_guid:
                            for invoice in self.invoices_by_contact_guid[contact.contact_guid]:
                                if invoice.issue_date.date() > transaction.booking_date.date():
                                    continue
                                matches, reason = self._amounts_match(transaction.amount, invoice)
                                if matches:
                                    # Found a match via remittance_information tokenization!
                                    return Match(
                                        transaction=transaction,
                                        invoice=invoice,
                                        confidence=0.90,
                                        match_reason=f"Address-based (from remittance info): {contact.name} at {contact.address[:30]} + {reason}"
                                    )
            
            # If still no match, give up
            transaction.debug_info.append("Address extraction failed")
            return None
        
        # Normalize the extracted address (remove spaces, commas, etc.)
        extracted_address_norm = self._normalize_address(extracted['address'])
        extracted_lastname_norm = self._normalize_text(extracted['lastname'])
        
        # STRATEGY 1: Try matching with lastname + address (highest confidence)
        matched_contact = None
        match_confidence = 1.0
        match_type = "lastname + address"
        
        if extracted_lastname_norm:
            for contact in self.contacts:
                # Check if lastname matches (normalized)
                contact_name_parts = contact.name.split()
                if not contact_name_parts:
                    continue
                
                contact_lastname = contact_name_parts[-1]
                contact_lastname_norm = self._normalize_text(contact_lastname)
                
                # Lastname must match
                if contact_lastname_norm != extracted_lastname_norm:
                    continue
                
                # Check if addresses match using token-based matching
                # This allows transaction to have extra tokens (neighborhood names)
                # but requires all contact tokens to be present
                if self._address_tokens_match(contact.address, extracted['address']):
                    matched_contact = contact
                    break
        
        # STRATEGY 2: If no match with lastname, try address only (lower confidence)
        if not matched_contact and extracted_address_norm:
            # First, find all contacts with matching address
            matching_contacts = []
            for contact in self.contacts:
                # Use token-based matching for address-only strategy too
                if self._address_tokens_match(contact.address, extracted['address']):
                    matching_contacts.append(contact)
            
            # If multiple contacts share the same address, we need to disambiguate
            if len(matching_contacts) > 1:
                # First, filter out inactive customers (those with no invoices in last 4 months)
                # This handles duplicate customer entries and customers who haven't ordered recently
                from datetime import timedelta
                four_months_ago = transaction.booking_date - timedelta(days=120)
                
                active_contacts = []
                for contact in matching_contacts:
                    if contact.contact_guid and contact.contact_guid in self.invoices_by_contact_guid:
                        # Check if they have any invoice in the last 4 months
                        has_recent_invoice = False
                        for invoice in self.invoices_by_contact_guid[contact.contact_guid]:
                            if invoice.issue_date.date() >= four_months_ago.date():
                                has_recent_invoice = True
                                break
                        
                        if has_recent_invoice:
                            active_contacts.append(contact)
                
                # If filtering left us with only 1 active contact, use that one
                if len(active_contacts) == 1:
                    matched_contact = active_contacts[0]
                    match_confidence = 0.95
                    match_type = "address only"
                elif len(active_contacts) > 1:
                    # Multiple active contacts - need name matching to disambiguate
                    all_text = f"{transaction.debtor_name} {transaction.remittance_information}".lower()
                    
                    # Try to find a contact whose name appears in transaction
                    name_matched_contact = None
                    for contact in active_contacts:
                        # Check both first name and last name
                        name_parts = contact.name.lower().split()
                        for name_part in name_parts:
                            if len(name_part) > 2 and name_part in all_text:  # At least 3 chars to avoid false matches
                                name_matched_contact = contact
                                break
                        if name_matched_contact:
                            break
                    
                    if name_matched_contact:
                        # Name found in transaction - ONLY try this specific contact
                        # Do NOT try other contacts to avoid matching wrong person
                        if name_matched_contact.contact_guid and name_matched_contact.contact_guid in self.invoices_by_contact_guid:
                            for invoice in self.invoices_by_contact_guid[name_matched_contact.contact_guid]:
                                if invoice.issue_date.date() > transaction.booking_date.date():
                                    continue
                                matches, reason = self._amounts_match(transaction.amount, invoice)
                                if matches:
                                    matched_contact = name_matched_contact
                                    match_confidence = 0.95
                                    match_type = "address only"
                                    break
                        
                        # If name-matched contact has no matching invoices, don't try others
                        if not matched_contact:
                            contact_names = ", ".join([c.name for c in active_contacts[:3]])
                            transaction.debug_info.append(f"Multiple active contacts at same address ({contact_names}) - name matched '{name_matched_contact.name}' but no matching invoices")
                            return None
                    else:
                        # No name in transaction - try to find most recent invoice with matching amount
                        # This handles cases like family members paying for each other
                        best_invoice = None
                        best_contact = None
                        
                        for contact in active_contacts:
                            if contact.contact_guid and contact.contact_guid in self.invoices_by_contact_guid:
                                for invoice in self.invoices_by_contact_guid[contact.contact_guid]:
                                    if invoice.issue_date.date() > transaction.booking_date.date():
                                        continue
                                    matches, reason = self._amounts_match(transaction.amount, invoice)
                                    if matches:
                                        # Found a matching invoice - check if it's more recent than current best
                                        if best_invoice is None or invoice.issue_date > best_invoice.issue_date:
                                            best_invoice = invoice
                                            best_contact = contact
                        
                        if best_invoice:
                            # Found a match - use the most recent invoice
                            # Return directly since we already have the invoice
                            matches, reason = self._amounts_match(transaction.amount, best_invoice)
                            return Match(
                                transaction=transaction,
                                invoice=best_invoice,
                                confidence=0.90,  # Slightly lower confidence since no name match
                                match_reason=f"Address-based (most recent at shared address): {best_contact.name} at {extracted['address'][:30]} + {reason}"
                            )
                        else:
                            # No matching invoices found
                            contact_names = ", ".join([c.name for c in active_contacts[:3]])
                            transaction.debug_info.append(f"Multiple active contacts at same address ({contact_names}) - no name found, no matching invoices")
                            return None
                else:
                    # All contacts at this address are inactive (no invoices in last 4 months)
                    contact_names = ", ".join([c.name for c in matching_contacts[:3]])
                    transaction.debug_info.append(f"Multiple contacts at same address ({contact_names}) - all inactive (no invoices in last 4 months)")
                    return None
            elif len(matching_contacts) == 1:
                # Only one contact at this address - safe to match
                matched_contact = matching_contacts[0]
                match_confidence = 0.95
                match_type = "address only"
        
        if not matched_contact:
            transaction.debug_info.append(f"No contact found for address: {extracted_address_norm[:20]}...")
            return None
        
        # Find invoices for this contact using contact_guid
        # This is the KEY FIX: Use contact_guid instead of name to avoid mixing up
        # invoices from different people with the same name (e.g., multiple "Michael"s)
        candidate_invoices = []
        
        if matched_contact.contact_guid and matched_contact.contact_guid in self.invoices_by_contact_guid:
            # Use contact_guid for accurate matching
            for invoice in self.invoices_by_contact_guid[matched_contact.contact_guid]:
                # Check if invoice is recent and not paid yet (or recently paid)
                if invoice.issue_date.date() > transaction.booking_date.date():
                    continue
                
                candidate_invoices.append(invoice)
        else:
            # Fallback to name-based matching if contact_guid not available
            contact_key = self._normalize_text(matched_contact.name)
            if contact_key not in self.invoices_by_contact:
                transaction.debug_info.append(f"Contact found ({matched_contact.name}) but no invoices")
                return None
            
            for invoice in self.invoices_by_contact[contact_key]:
                # Check if invoice is recent and not paid yet (or recently paid)
                if invoice.issue_date.date() > transaction.booking_date.date():
                    continue
                
                candidate_invoices.append(invoice)
        
        # Now check if any candidate invoice matches the transaction amount
        for invoice in candidate_invoices:
            # Check amount match (with reminder fee logic)
            matches, reason = self._amounts_match(transaction.amount, invoice)
            if matches:
                if transaction.amount > invoice.total_incl_vat:
                    transaction.debug_info.append(f"Overpayment detected: {transaction.amount:.2f} DKK > invoice {invoice.invoice_number} amount {invoice.total_incl_vat:.2f} DKK")
                return Match(
                    transaction=transaction,
                    invoice=invoice,
                    confidence=match_confidence,
                    match_reason=f"Address-based ({match_type}): {matched_contact.name} at {matched_contact.address} + {reason}"
                )
        
        if candidate_invoices:
            amounts = [f"#{inv.invoice_number}:{inv.total_incl_vat:.2f}" for inv in candidate_invoices[:3]]
            transaction.debug_info.append(f"Contact found ({matched_contact.name}), {len(candidate_invoices)} invoices but amount mismatch. Tried: {', '.join(amounts)}")
        
        return None
    
    def _match_by_invoice_number(self, transaction: Transaction) -> Optional[Match]:
        """PRIORITY 1: Extract invoice number from transaction text
        
        When customer explicitly writes an invoice number, we MUST prioritize it.
        However, we validate the amount to prevent matching to wrong invoices.
        
        Tolerance: ±10 DKK (covers bank fees, rounding, small errors)
        
        If amount is significantly different (>10 DKK), we reject the match and fall back
        to address/name matching. This handles cases where customer writes wrong invoice number.
        
        Note: We only check remittance_information and debtor_name, NOT additional_information
        because additional_information contains addresses with postal codes (e.g., "6400")
        that would be mistaken for invoice numbers.
        """
        fields_to_strip = [
            transaction.remittance_information,
            transaction.debtor_name
        ]
        
        invoice_number = self._extract_invoice_number_from_stripped_text(fields_to_strip)
        
        if not invoice_number:
            transaction.debug_info.append("No invoice number found in text")
            return None
        
        if invoice_number not in self.invoices_by_number:
            transaction.debug_info.append(f"Invoice #{invoice_number} not found in database")
            return None
        
        invoice = self.invoices_by_number[invoice_number]
        
        # Validate amount and date
        # Pass has_invoice_number=True to allow 10 DKK tolerance (bank fees, rounding)
        matches, reason = self._amounts_match(transaction.amount, invoice, has_invoice_number=True)
        if matches and invoice.issue_date.date() <= transaction.booking_date.date():
            return Match(
                transaction=transaction,
                invoice=invoice,
                confidence=1.00,  # Highest confidence - customer explicitly wrote invoice number AND amount matches
                match_reason=f"Invoice number: #{invoice_number} + {reason}"
            )
        
        if not matches:
            # Amount doesn't match - customer probably wrote wrong invoice number
            # Log this clearly and fall back to other matching strategies
            diff = abs(transaction.amount - invoice.total_incl_vat)
            transaction.debug_info.append(
                f"⚠️  Customer wrote invoice #{invoice_number} but amount mismatch: "
                f"{transaction.amount:.2f} DKK vs {invoice.total_incl_vat:.2f} DKK (diff: {diff:.2f} DKK). "
                f"Falling back to address/amount matching to find correct invoice."
            )
        else:
            transaction.debug_info.append(f"Invoice #{invoice_number} found but date issue (invoice issued after payment)")
        
        return None
    
    def _match_by_name(self, transaction: Transaction) -> Optional[Match]:
        """Match by customer name using token-based matching (same as address matching)
        
        All contact name tokens must appear in transaction text.
        Transaction can have extra tokens (middle names, titles, etc.)
        """
        trans_text = f"{transaction.debtor_name} {transaction.remittance_information} {transaction.additional_information}"
        trans_text_norm = self._normalize_text(trans_text)
        
        # Try to find a contact name in the transaction text
        best_match = None
        best_confidence = 0
        names_found = []
        
        for contact_name, invoices in self.invoices_by_contact.items():
            # Tokenize contact name and transaction text
            contact_tokens = self._tokenize_address(contact_name)  # Reuse address tokenization
            trans_tokens = self._tokenize_address(trans_text)
            
            # Check if ALL contact name tokens appear in transaction
            # Transaction can have extra tokens (e.g., "Lorenz Petersen Schmidt" has "Petersen" extra)
            if contact_tokens.issubset(trans_tokens):
                names_found.append(contact_name)
                
                # Higher confidence if it's an exact match (same number of tokens)
                if len(contact_tokens) == len(trans_tokens):
                    confidence = 0.85  # Exact name match
                else:
                    confidence = 0.75  # Transaction has extra tokens
                # Find matching invoice by amount
                for invoice in invoices:
                    if invoice.issue_date.date() > transaction.booking_date.date():
                        continue
                    
                    matches, reason = self._amounts_match(transaction.amount, invoice)
                    if matches:
                        if best_confidence < confidence:
                            best_confidence = confidence
                            match_type = "exact" if len(contact_tokens) == len(trans_tokens) else "with extra tokens"
                            best_match = Match(
                                transaction=transaction,
                                invoice=invoice,
                                confidence=confidence,
                                match_reason=f"Name match ({match_type}): {invoice.contact_name} + {reason}"
                            )
        
        if names_found and not best_match:
            transaction.debug_info.append(f"Names found ({', '.join(names_found[:3])}) but amount mismatch")
        elif not names_found:
            transaction.debug_info.append("No customer names found in transaction text")
        
        return best_match
    
    def _match_by_fuzzy_name(self, transaction: Transaction) -> Optional[Match]:
        """FALLBACK: Fuzzy name matching when no postal code/address found
        
        This catches cases like:
        - "OVERFØRSELKENT DYRVIG MENTZ" (no address, just name)
        - Malformed additional_information fields
        
        Strategy: Extract potential name words and fuzzy match against contacts
        """
        # Get all text from transaction
        all_text = f"{transaction.debtor_name} {transaction.remittance_information} {transaction.additional_information}"
        all_text_norm = self._normalize_text(all_text)
        
        # Remove common prefixes
        all_text_norm = all_text_norm.replace('overforsel', '').replace('overførsel', '').strip()
        
        # Split into words (potential name parts)
        words = all_text_norm.split()
        
        # Try to find contacts where multiple name parts match
        best_match = None
        best_score = 0
        best_contact = None
        
        for contact_name, invoices in self.invoices_by_contact.items():
            contact_norm = self._normalize_text(contact_name)
            contact_words = set(contact_norm.split())
            transaction_words = set(words)
            
            # Count matching words
            matching_words = contact_words & transaction_words
            
            # Need at least 2 matching words (first + last name)
            if len(matching_words) >= 2:
                # Calculate match score (percentage of contact name words that match)
                score = len(matching_words) / len(contact_words) if contact_words else 0
                
                if score > best_score:
                    best_score = score
                    best_contact = contact_name
                    
                    # Try to find matching invoice by amount
                    for invoice in invoices:
                        if invoice.issue_date.date() > transaction.booking_date.date():
                            continue
                        
                        matches, reason = self._amounts_match(transaction.amount, invoice)
                        if matches:
                            best_match = Match(
                                transaction=transaction,
                                invoice=invoice,
                                confidence=0.70,  # Lower confidence for fuzzy match
                                match_reason=f"Fuzzy name match: {invoice.contact_name} ({len(matching_words)} words) + {reason}"
                            )
                            break
        
        if best_contact and not best_match:
            transaction.debug_info.append(f"Fuzzy name match found ({best_contact}) but amount mismatch")
        elif not best_contact:
            transaction.debug_info.append("No fuzzy name matches found")
        
        return best_match
    
    def _match_combined_invoices(self, transaction: Transaction) -> Optional[Match]:
        """FALLBACK: Match combined invoice payments (multiple invoices in one transaction)
        
        When a customer pays multiple invoices at once, the transaction amount equals
        the sum of multiple invoice amounts.
        
        Strategy:
        1. Find contact from transaction text
        2. Get all unpaid invoices for that contact
        3. Try combinations of 2-3 invoices to see if sum matches transaction amount
        """
        # Get all text to find contact
        all_text = f"{transaction.debtor_name} {transaction.remittance_information} {transaction.additional_information}"
        all_text_norm = self._normalize_text(all_text)
        
        # Try to find contact
        matched_contact = None
        candidate_invoices = []
        
        # Search for contact name in transaction text
        for contact_name, invoices in self.invoices_by_contact.items():
            contact_norm = self._normalize_text(contact_name)
            if contact_norm in all_text_norm or all_text_norm in contact_norm:
                matched_contact = contact_name
                # Get invoices issued before transaction date
                candidate_invoices = [inv for inv in invoices 
                                     if inv.issue_date.date() <= transaction.booking_date.date()]
                break
        
        if not matched_contact or len(candidate_invoices) < 2:
            return None
        
        # Try combinations of 2 invoices
        from itertools import combinations
        for combo in combinations(candidate_invoices, 2):
            total = sum(inv.total_incl_vat for inv in combo)
            if abs(transaction.amount - total) <= 1.0:
                # Found matching combination!
                invoice_numbers = ", ".join([f"#{inv.invoice_number}" for inv in combo])
                return Match(
                    transaction=transaction,
                    invoice=combo[0],  # Primary invoice (first one)
                    confidence=0.85,
                    match_reason=f"Combined payment for {invoice_numbers} ({total:.2f} DKK)"
                )
        
        # Try combinations of 3 invoices
        if len(candidate_invoices) >= 3:
            for combo in combinations(candidate_invoices, 3):
                total = sum(inv.total_incl_vat for inv in combo)
                if abs(transaction.amount - total) <= 1.0:
                    invoice_numbers = ", ".join([f"#{inv.invoice_number}" for inv in combo])
                    return Match(
                        transaction=transaction,
                        invoice=combo[0],
                        confidence=0.85,
                        match_reason=f"Combined payment for {invoice_numbers} ({total:.2f} DKK)"
                    )
        
        # Log that we found contact but no matching combination
        if matched_contact:
            transaction.debug_info.append(f"Contact found ({matched_contact}) but no invoice combination matches amount")
        
        return None
    
    def _match_by_manual_rules(self, transaction: Transaction) -> Optional[Match]:
        """Match using learned patterns from manual reviews
        
        When a user manually matches a transaction to an invoice (e.g., son paying for father),
        we store that pattern and use it for future automatic matching.
        
        Example: "John Doe" (transaction) → "Father Doe" (invoice contact)
        """
        if not self.manual_rules:
            return None
        
        # Normalize transaction debtor name for matching
        trans_debtor_norm = self._normalize_text(transaction.debtor_name)
        
        # Try to find a matching rule
        for rule in self.manual_rules:
            rule_debtor_norm = self._normalize_text(rule.get('transaction_debtor_name', ''))
            
            # Check if transaction debtor name matches the rule
            if not rule_debtor_norm or rule_debtor_norm != trans_debtor_norm:
                continue
            
            # Found a matching rule! Now find invoices for the target contact
            target_contact_id = rule.get('invoice_contact_id')
            if not target_contact_id:
                continue
            
            # Get invoices for this contact
            if target_contact_id in self.invoices_by_contact_guid:
                candidate_invoices = self.invoices_by_contact_guid[target_contact_id]
                
                # Find invoice with matching amount
                for invoice in candidate_invoices:
                    # Skip invoices issued after transaction
                    if invoice.issue_date.date() > transaction.booking_date.date():
                        continue
                    
                    # Check if amounts match
                    matches, reason = self._amounts_match(transaction.amount, invoice)
                    if matches:
                        # Update rule usage stats
                        if self.supabase_client and self.user_id:
                            try:
                                self.supabase_client.table('manual_match_rules').update({
                                    'times_used': rule.get('times_used', 0) + 1,
                                    'last_used_at': datetime.now().isoformat()
                                }).eq('id', rule['id']).execute()
                            except:
                                pass  # Don't fail matching if stats update fails
                        
                        # Return match with high confidence (learned from manual review)
                        return Match(
                            transaction=transaction,
                            invoice=invoice,
                            confidence=rule.get('confidence', 0.95),
                            match_reason=f"Manual rule: {transaction.debtor_name} → {rule.get('invoice_contact_name', 'Unknown')} + {reason}"
                        )
            
            transaction.debug_info.append(f"Manual rule found but no matching invoice for contact {rule.get('invoice_contact_name')}")
        
        return None
    
    def _match_split_payments(self, unmatched_transactions: List[Transaction]) -> Dict[str, Match]:
        """Match split payments - multiple transactions from same contact on same day that sum to invoice amount
        
        Example: Customer accidentally sends 100 DKK, then 150 DKK on same day for a 249 DKK invoice
        """
        from collections import defaultdict
        from itertools import combinations
        
        results = {}
        
        # Group unmatched transactions by date and contact (address)
        transactions_by_date_contact = defaultdict(list)
        
        for transaction in unmatched_transactions:
            # Extract address to identify contact
            extracted = self._extract_address_from_additional_info(transaction.additional_information)
            
            if extracted and extracted['address']:
                # Use date + address as key
                key = (transaction.booking_date.date(), extracted['address'][:20])
                transactions_by_date_contact[key].append((transaction, extracted))
        
        # For each group, check if any combination of 2-3 transactions sums to an invoice
        for (date, address_prefix), trans_list in transactions_by_date_contact.items():
            if len(trans_list) < 2:
                continue
            
            # Find the contact for this address
            matched_contact = None
            for transaction, extracted in trans_list:
                for contact in self.contacts:
                    if self._address_tokens_match(contact.address, extracted['address']):
                        matched_contact = contact
                        break
                if matched_contact:
                    break
            
            if not matched_contact or not matched_contact.contact_guid:
                continue
            
            # Get invoices for this contact
            if matched_contact.contact_guid not in self.invoices_by_contact_guid:
                continue
            
            candidate_invoices = self.invoices_by_contact_guid[matched_contact.contact_guid]
            
            # Try combinations of 2 transactions
            transactions_only = [t for t, _ in trans_list]
            for combo in combinations(transactions_only, 2):
                total_amount = sum(t.amount for t in combo)
                
                # Check if this sum matches any invoice
                for invoice in candidate_invoices:
                    # Invoice must be issued before the earliest transaction date
                    if invoice.issue_date.date() > min(t.booking_date.date() for t in combo):
                        continue
                    
                    matches, reason = self._amounts_match(total_amount, invoice)
                    if matches:
                        # Found a match! Mark all transactions in combo as matched to this invoice
                        amounts_str = " + ".join([f"{t.amount:.2f}" for t in combo])
                        for trans in combo:
                            results[trans.id] = Match(
                                transaction=trans,
                                invoice=invoice,
                                confidence=0.85,
                                match_reason=f"Split payment ({amounts_str} = {total_amount:.2f} DKK) for invoice #{invoice.invoice_number}"
                            )
                        break
                
                if any(t.id in results for t in combo):
                    break  # Already matched this combo
            
            # Try combinations of 3 transactions if 2 didn't work
            if len(transactions_only) >= 3:
                for combo in combinations(transactions_only, 3):
                    # Skip if any already matched
                    if any(t.id in results for t in combo):
                        continue
                    
                    total_amount = sum(t.amount for t in combo)
                    
                    for invoice in candidate_invoices:
                        if invoice.issue_date.date() > min(t.booking_date.date() for t in combo):
                            continue
                        
                        matches, reason = self._amounts_match(total_amount, invoice)
                        if matches:
                            amounts_str = " + ".join([f"{t.amount:.2f}" for t in combo])
                            for trans in combo:
                                results[trans.id] = Match(
                                    transaction=trans,
                                    invoice=invoice,
                                    confidence=0.80,
                                    match_reason=f"Split payment ({amounts_str} = {total_amount:.2f} DKK) for invoice #{invoice.invoice_number}"
                                )
                            break
        
        return results

    
    def match_all_transactions(self) -> Dict[str, Optional[Match]]:
        """Match all transactions"""
        results = {}
        
        # First pass: normal matching
        for transaction in self.transactions:
            match = self.match_transaction(transaction)
            if match:
                results[transaction.id] = match
        
        # Second pass: match split payments (multiple transactions for one invoice)
        unmatched_transactions = [t for t in self.transactions if t.id not in results]
        split_payment_matches = self._match_split_payments(unmatched_transactions)
        results.update(split_payment_matches)
        
        return results
    
    def _write_report_to_csv(self, results: Dict[str, Optional[Match]], output_file: str):
        """Helper function to write match results to CSV files (matched and unmatched separately)."""
        
        # Prepare file paths
        base_path = output_file.rsplit('.', 1)[0]
        matched_file = f"{base_path}_matched.csv"
        unmatched_file = f"{base_path}_unmatched.csv"
        
        # Write matched transactions
        with open(matched_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Transaction ID',
                'Transaction Date',
                'Transaction Amount',
                'Debtor Name',
                'Remittance Info',
                'Additional Information',
                'Extracted Address (Raw)',
                'Extracted Address (Normalized)',
                'Extracted Lastname',
                'Invoice ID',
                'Invoice Number',
                'Invoice Contact',
                'Invoice Amount',
                'Confidence',
                'Match Reason',
                'Status'
            ])
            
            matched_count = 0
            total_matched_amount = 0.0
            
            for transaction in self.transactions:
                match = results.get(transaction.id)
                
                if match:
                    matched_count += 1
                    total_matched_amount += transaction.amount
                    
                    # Extract address info for debugging
                    extracted = self._extract_address_from_additional_info(transaction.additional_information)
                    extracted_address_raw = extracted['address'] if extracted else ''
                    extracted_address_normalized = self._normalize_address(extracted_address_raw) if extracted_address_raw else ''
                    extracted_lastname = extracted['lastname'] if extracted else ''
                    
                    # Determine status based on match reason
                    status = 'OVERPAID' if 'overpaid' in match.match_reason.lower() else 'MATCHED'
                    
                    writer.writerow([
                        transaction.id,
                        transaction.booking_date.strftime('%Y-%m-%d'),
                        f"{transaction.amount:.2f}",
                        transaction.debtor_name,
                        transaction.remittance_information[:50],
                        transaction.additional_information[:80],
                        extracted_address_raw,
                        extracted_address_normalized,
                        extracted_lastname,
                        match.invoice.id,
                        match.invoice.invoice_number,
                        match.invoice.contact_name,
                        f"{match.invoice.total_incl_vat:.2f}",
                        f"{match.confidence:.2f}",
                        match.match_reason,
                        status
                    ])
        
        # Write unmatched transactions
        with open(unmatched_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Transaction ID',
                'Transaction Date',
                'Transaction Amount',
                'Debtor Name',
                'Remittance Info',
                'Additional Information',
                'Extracted Address (Raw)',
                'Extracted Address (Normalized)',
                'Extracted Lastname',
                'Debug Info'
            ])
            
            for transaction in self.transactions:
                match = results.get(transaction.id)
                
                if not match:
                    # Extract address info for debugging
                    extracted = self._extract_address_from_additional_info(transaction.additional_information)
                    extracted_address_raw = extracted['address'] if extracted else ''
                    extracted_address_normalized = self._normalize_address(extracted_address_raw) if extracted_address_raw else ''
                    extracted_lastname = extracted['lastname'] if extracted else ''
                    
                    # Get debug info
                    debug_info = ' | '.join(transaction.debug_info) if hasattr(transaction, 'debug_info') else ''
                    
                    writer.writerow([
                        transaction.id,
                        transaction.booking_date.strftime('%Y-%m-%d'),
                        f"{transaction.amount:.2f}",
                        transaction.debtor_name,
                        transaction.remittance_information[:50],
                        transaction.additional_information[:80],
                        extracted_address_raw,
                        extracted_address_normalized,
                        extracted_lastname,
                        debug_info
                    ])
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"MATCHING REPORT SUMMARY (V2)")
        print(f"{'='*60}")
        print(f"Total transactions: {len(self.transactions)}")
        print(f"Matched: {matched_count}")
        print(f"Unmatched: {len(self.transactions) - matched_count}")
        print(f"Match rate: {(matched_count / len(self.transactions) * 100):.1f}%")
        print(f"Total matched amount: {total_matched_amount:,.2f} DKK")
        print(f"\nMatched report saved to: {matched_file}")
        print(f"Unmatched report saved to: {unmatched_file}")
        print(f"{'='*60}\n")

        return results


def get_enabled_users(supabase_client):
    """Fetch all users with automation_enabled=true from automation_settings.
    
    Returns:
        List of dicts with 'user_id' and 'last_matcher_sync'
    """
    try:
        response = supabase_client.table('automation_settings') \
            .select('user_id, last_matcher_sync') \
            .eq('automation_enabled', True) \
            .execute()
        
        users = response.data
        print(f"📋 Found {len(users)} users with automation enabled")
        return users
    except Exception as e:
        print(f"❌ Error fetching enabled users: {e}")
        return []


def run_matcher_for_user(user_data):
    """Run invoice matcher for a single user and save matches to database.
    
    Args:
        user_data: Dict with 'user_id' and 'last_matcher_sync'
        
    Returns:
        Tuple of (saved_count, skipped_count, total_matches)
    """
    from supabase import create_client
    import os
    from datetime import datetime, timedelta
    
    user_id = user_data['user_id']
    last_sync = user_data.get('last_matcher_sync')
    
    # Create a new Supabase client for this thread (thread-safe)
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    supabase_client = create_client(supabase_url, supabase_key)
    
    print(f"\n{'='*80}")
    print(f"🤖 Running invoice matcher for user {user_id}")
    if last_sync:
        print(f"   Last sync: {last_sync}")
        print(f"   Mode: INCREMENTAL (1-day overlap)")
    else:
        print(f"   Mode: INITIAL SYNC (all transactions)")
    print(f"{'='*80}")
    
    try:
        # Calculate date range for transaction fetching
        # Use 3-day overlap buffer to handle transaction lag
        if last_sync:
            # Parse last_sync if it's a string
            if isinstance(last_sync, str):
                last_sync_dt = datetime.fromisoformat(last_sync.replace('Z', '+00:00'))
            else:
                last_sync_dt = last_sync
            
            # Subtract 3 days as overlap buffer
            # from_date = last_sync_dt - timedelta(days=3)
            # print(f"   Fetching transactions from: {from_date.date()} (3-day overlap)")
            
            # Subtract 1 day to catch late transactions from previous day
            from_date = last_sync_dt - timedelta(days=1)
            print(f"   Fetching transactions from: {from_date.date()} (1-day overlap)")
        else:
            from_date = None
            print(f"   Fetching ALL transactions (initial sync)")
        
        # Initialize matcher with Supabase data only (no CSV files)
        matcher = InvoiceMatcherV2(
            user_id=user_id,
            supabase_client=supabase_client,
            from_date=from_date  # Pass date filter
        )
        
        print(f"Loaded {len(matcher.transactions)} transactions, {len(matcher.invoices)} invoices, {len(matcher.contacts)} contacts.")

        print("\nMatching transactions to invoices...")
        results = matcher.match_all_transactions()
        
        # Save to database using batch upsert
        print("\n💾 Saving matches to database...")
        
        # Prepare all matches for batch insert
        matches_to_save = []
        for trans_id, match in results.items():
            if match:
                match_reason = match.match_reason.lower()
                if 'invoice number' in match_reason:
                    match_type = 'invoice_number'
                elif 'address' in match_reason:
                    match_type = 'address'
                elif 'name match' in match_reason and 'fuzzy' not in match_reason:
                    match_type = 'name'
                elif 'fuzzy' in match_reason:
                    match_type = 'fuzzy'
                elif 'combined' in match_reason:
                    match_type = 'combined'
                else:
                    match_type = 'other'
                
                # Set initial status based on invoice status
                # Trigger will keep it in sync when invoice status changes
                initial_status = 'approved' if match.invoice.status == 'Paid' or match.invoice.status == 'Overpaid' else 'pending'
                
                matches_to_save.append({
                    'user_id': user_id,
                    'transaction_id': match.transaction.id,
                    'transaction_date': match.transaction.booking_date.isoformat(),
                    'transaction_amount': float(match.transaction.amount),
                    'invoice_id': match.invoice.invoice_id,
                    'invoice_number': str(match.invoice.invoice_number),
                    'invoice_amount': float(match.invoice.total_incl_vat),
                    'confidence': float(match.confidence),
                    'match_reason': match.match_reason,
                    'match_type': match_type,
                    'status': initial_status
                })
        
        total_matches = len(matches_to_save)
        saved = 0
        skipped = 0
        
        # Batch upsert in chunks of 500
        if matches_to_save:
            batch_size = 500
            for i in range(0, len(matches_to_save), batch_size):
                batch = matches_to_save[i:i + batch_size]
                try:
                    # Use upsert with on_conflict to handle duplicates
                    # Table has UNIQUE(transaction_id, invoice_id) constraint
                    result = supabase_client.table('invoice_matches').upsert(
                        batch,
                        on_conflict='transaction_id,invoice_id'
                    ).execute()
                    
                    # Count how many were actually inserted vs updated
                    batch_saved = len(result.data) if result.data else len(batch)
                    saved += batch_saved
                    
                    print(f"   Batch {i//batch_size + 1}: Upserted {len(batch)} matches")
                    
                except Exception as e:
                    print(f"   ⚠️  Error upserting batch {i//batch_size + 1}: {e}")
                    # Fallback to individual inserts for this batch
                    for match_data in batch:
                        try:
                            supabase_client.table('invoice_matches').insert(match_data).execute()
                            saved += 1
                        except Exception as e2:
                            if 'duplicate' in str(e2).lower() or 'unique' in str(e2).lower():
                                skipped += 1
        
        print(f"✅ Saved {saved} matches to database ({skipped} already existed)")
        
        # Track unmatched transactions
        print("\n📋 Tracking unmatched transactions...")
        unmatched_to_save = []
        matched_transaction_ids = set(match['transaction_id'] for match in matches_to_save)
        
        for transaction in matcher.transactions:
            if transaction.id not in matched_transaction_ids:
                unmatched_to_save.append({
                    'user_id': user_id,
                    'transaction_id': transaction.id,
                    'transaction_date': transaction.booking_date.isoformat(),
                    'transaction_amount': float(transaction.amount),
                    'transaction_reference': transaction.remittance_information or '',
                    'transaction_debtor_name': transaction.debtor_name or '',
                    'status': 'pending'
                })
        
        # Batch upsert unmatched transactions
        unmatched_saved = 0
        if unmatched_to_save:
            batch_size = 500
            for i in range(0, len(unmatched_to_save), batch_size):
                batch = unmatched_to_save[i:i + batch_size]
                try:
                    result = supabase_client.table('unmatched_transactions').upsert(
                        batch,
                        on_conflict='user_id,transaction_id'
                    ).execute()
                    unmatched_saved += len(batch)
                except Exception as e:
                    print(f"   ⚠️  Error upserting unmatched batch: {e}")
        
        print(f"✅ Tracked {unmatched_saved} unmatched transactions for manual review")
        
        # Update last_matcher_sync to NOW() after successful processing
        try:
            supabase_client.table('automation_settings') \
                .update({'last_matcher_sync': datetime.now().isoformat()}) \
                .eq('user_id', user_id) \
                .execute()
            print(f"   Updated last_matcher_sync for user {user_id}")
        except Exception as sync_error:
            print(f"   ⚠️  Failed to update last_matcher_sync: {sync_error}")
        
        return (saved, skipped, total_matches)
        
    except Exception as e:
        print(f"❌ Error processing user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return (0, 0, 0)


def main():
    """Main execution - supports multi-tenant mode or single user debugging"""
    import os
    import argparse
    from dotenv import load_dotenv
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run invoice matcher')
    parser.add_argument('--user-id', type=str, help='Run for specific user only (for debugging)')
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Initialize Supabase client
    supabase_client = None
    try:
        from supabase import create_client
        SUPABASE_URL = os.environ.get('SUPABASE_URL')
        SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            print("Supabase client initialized")
        else:
            print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
            return
    except Exception as e:
        print(f"ERROR: Failed to initialize Supabase: {e}")
        return
    
    print("\n🚀 Invoice Matcher - Multi-Tenant Mode (Parallel Processing)")
    print("=" * 80)
    
    # Determine which users to process
    if args.user_id:
        # Debug mode: single user
        print(f"🔧 DEBUG MODE: Running for single user {args.user_id}")
        # Fetch sync data for this user
        try:
            response = supabase_client.table('automation_settings') \
                .select('user_id, last_matcher_sync') \
                .eq('user_id', args.user_id) \
                .execute()
            if response.data:
                users = response.data
            else:
                # User not in automation_settings, create minimal entry
                users = [{'user_id': args.user_id, 'last_matcher_sync': None}]
        except:
            users = [{'user_id': args.user_id, 'last_matcher_sync': None}]
    else:
        # Production mode: all enabled users
        print("🏭 PRODUCTION MODE: Running for all enabled users")
        users = get_enabled_users(supabase_client)
        
        if not users:
            print("⚠️  No users with automation enabled. Exiting.")
            return
    
    print(f"\n⚡ Processing {len(users)} users in parallel (max 5 workers)...\n")
    
    # Process users in parallel
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import time
    
    total_saved = 0
    total_skipped = 0
    total_matches = 0
    start_time = time.time()
    
    max_workers = min(5, len(users))  # Max 5 parallel workers
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_user = {
            executor.submit(run_matcher_for_user, user_data): user_data['user_id']
            for user_data in users
        }
        
        # Collect results as they complete
        completed = 0
        for future in as_completed(future_to_user):
            user_id = future_to_user[future]
            completed += 1
            try:
                saved, skipped, matches = future.result()
                total_saved += saved
                total_skipped += skipped
                total_matches += matches
                print(f"\n[{completed}/{len(users)}] ✅ Completed user {user_id}")
            except Exception as e:
                print(f"\n[{completed}/{len(users)}] ❌ Failed for user {user_id}: {e}")
    
    elapsed_time = time.time() - start_time
    
    # Final summary
    print(f"\n{'='*80}")
    print(f"🎉 AUTOMATION COMPLETE")
    print(f"{'='*80}")
    print(f"Users processed: {len(users)}")
    print(f"Total matches found: {total_matches}")
    print(f"Total saved to database: {total_saved}")
    print(f"Total skipped (duplicates): {total_skipped}")
    print(f"Elapsed time: {elapsed_time:.1f} seconds ({elapsed_time/60:.1f} minutes)")
    print(f"Average per user: {elapsed_time/len(users):.1f} seconds")
    print(f"{'='*80}")


if __name__ == '__main__':
    main()
