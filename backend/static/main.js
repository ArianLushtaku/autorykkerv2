document.addEventListener('DOMContentLoaded', () => {
    // --- Dinero Invoice Fetching ---
    const fetchInvoicesBtn = document.getElementById('fetch-invoices-btn');
    const invoicesContainer = document.getElementById('invoices-container');
    const invoicesList = document.getElementById('invoices-list');

    if (fetchInvoicesBtn) {
        fetchInvoicesBtn.addEventListener('click', async () => {
            try {
                invoicesList.innerHTML = '<li>Loading invoices...</li>';
                invoicesContainer.classList.remove('hidden');

                const response = await fetch('/dinero/invoices');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch invoices.');
                }

                const invoices = await response.json();
                displayInvoices(invoices.collection);
            } catch (error) {
                invoicesList.innerHTML = `<li>Error: ${error.message}</li>`;
            }
        });
    }

    const displayInvoices = (invoices) => {
        invoicesList.innerHTML = '';
        if (!invoices || invoices.length === 0) {
            invoicesList.innerHTML = '<li>No invoices found.</li>';
            return;
        }

        invoices.forEach(invoice => {
            const listItem = document.createElement('li');
            listItem.textContent = `Invoice #${invoice.voucherNumber} - Amount: ${invoice.amount} ${invoice.currency}`;
            invoicesList.appendChild(listItem);
        });
    };

    const fetchBanksBtn = document.getElementById('fetch-banks-btn');
    const countryCodeInput = document.getElementById('country-code');
    const banksList = document.getElementById('banks-list'); // Corrected ID
    const errorContainer = document.getElementById('error-container');

    const API_BASE_URL = 'http://127.0.0.1:5001';

    const showError = (message) => {
        errorContainer.textContent = `An error occurred: ${message}`;
        errorContainer.style.display = 'block';
    };

    const clearError = () => {
        errorContainer.style.display = 'none';
    };

    fetchBanksBtn.addEventListener('click', async () => {
        clearError();
        const countryCode = countryCodeInput.value;
        if (!countryCode) {
            showError('Please select a country.');
            return;
        }

        banksList.innerHTML = '<li>Loading...</li>'; // Show a loading message

        try {
            const response = await fetch(`${API_BASE_URL}/institutions?country=${countryCode}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch banks.');
            }
            const institutions = await response.json();
            displayBanks(institutions);
        } catch (error) {
            showError(error.message);
            banksList.innerHTML = ''; // Clear loading message on error
        }
    });

    const displayBanks = (institutions) => {
        banksList.innerHTML = ''; // Clear previous list or loading message
        if (institutions.length === 0) {
            banksList.innerHTML = '<li>No banks found for this country.</li>';
            return;
        }

        institutions.forEach(institution => {
            const listItem = document.createElement('li');
            listItem.dataset.id = institution.id;

            const logo = document.createElement('img');
            logo.src = institution.logo;
            logo.alt = `${institution.name} logo`;

            const name = document.createElement('span');
            name.textContent = institution.name;

            listItem.appendChild(logo);
            listItem.appendChild(name);
            banksList.appendChild(listItem);

            listItem.addEventListener('click', () => handleBankSelection(institution.id));
        });
    };

    const handleBankSelection = async (institutionId) => {
        clearError();
        console.log(`Selected bank ID: ${institutionId}`);
        try {
            const response = await fetch(`${API_BASE_URL}/create-auth-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ institution_id: institutionId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create authentication link.');
            }

            const data = await response.json();
            if (data.link) {
                // Redirect the user to the bank authentication page
                window.location.href = data.link;
            } else {
                throw new Error('No authentication link received.');
            }
        } catch (error) {
            showError(error.message);
        }
    };
});
