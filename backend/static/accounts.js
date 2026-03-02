document.addEventListener('DOMContentLoaded', () => {
    const accountsList = document.getElementById('accounts-list');
    const transactionsContainer = document.getElementById('transactions-container');
    const transactionsHeader = document.getElementById('transactions-header');
    const transactionsList = document.getElementById('transactions-list');
    const errorContainer = document.getElementById('error-container');

    const API_BASE_URL = 'http://127.0.0.1:5001';

    const showError = (message) => {
        errorContainer.textContent = `An error occurred: ${message}`;
        errorContainer.style.display = 'block';
    };

    const fetchAccounts = async () => {
        try {
            // The backend now knows the user from the session, so we fetch their accounts directly.
            const response = await fetch(`${API_BASE_URL}/requisitions/me`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch accounts.');
            }
            const data = await response.json();
            displayAccounts(data.accounts);
        } catch (error) {
            showError(error.message);
        }
    };

    const displayAccounts = (accountIds) => {
        accountsList.innerHTML = '';
        if (!accountIds || accountIds.length === 0) {
            accountsList.innerHTML = '<li>No accounts found for this connection.</li>';
            return;
        }

        accountIds.forEach(accountId => {
            const listItem = document.createElement('li');
            listItem.textContent = `Account ID: ${accountId.substring(0, 8)}...`;
            listItem.dataset.id = accountId;
            listItem.style.cursor = 'pointer';
            accountsList.appendChild(listItem);

            listItem.addEventListener('click', () => fetchTransactions(accountId));
        });
    };

    const fetchTransactions = async (accountId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/transactions`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch transactions.');
            }
            const data = await response.json();
            displayTransactions(accountId, data.transactions);
        } catch (error) {
            showError(error.message);
        }
    };

    const displayTransactions = (accountId, transactions) => {
        transactionsContainer.style.display = 'block';
        transactionsHeader.textContent = `Transactions for Account ...${accountId.substring(28)}`;
        transactionsList.innerHTML = '';

        const allTransactions = [...transactions.booked, ...transactions.pending];

        if (allTransactions.length === 0) {
            transactionsList.innerHTML = '<p>No transactions found for this account.</p>';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');
        allTransactions.forEach(tx => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${tx.bookingDate || tx.valueDate}</td>
                <td>${tx.remittanceInformationUnstructured}</td>
                <td>${tx.transactionAmount.amount} ${tx.transactionAmount.currency}</td>
            `;
        });
        transactionsList.appendChild(table);
    };

    // On page load, immediately fetch the accounts for the logged-in user.
    fetchAccounts();
});
