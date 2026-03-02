-- Query to view all transaction data
-- Run this in Supabase SQL Editor after syncing transactions

-- View all transactions with key fields
SELECT 
  id,
  transaction_id,
  booking_date,
  amount,
  currency,
  debtor_name,
  creditor_name,
  remittance_information,
  additional_information,
  created_at
FROM bank_transactions
ORDER BY booking_date DESC
LIMIT 100;

-- View raw JSON data to see all fields GoCardless provides
SELECT 
  transaction_id,
  booking_date,
  amount,
  raw_data
FROM bank_transactions
ORDER BY booking_date DESC
LIMIT 10;

-- Count transactions by account
SELECT 
  account_id,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  MIN(booking_date) as earliest_transaction,
  MAX(booking_date) as latest_transaction
FROM bank_transactions
GROUP BY account_id;

-- View transactions with potential invoice references
-- (Looking for invoice numbers in remittance info)
SELECT 
  transaction_id,
  booking_date,
  amount,
  debtor_name,
  remittance_information,
  additional_information
FROM bank_transactions
WHERE 
  remittance_information IS NOT NULL 
  OR additional_information IS NOT NULL
ORDER BY booking_date DESC
LIMIT 50;
