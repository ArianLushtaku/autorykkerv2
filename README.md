# Autorykker - Danish Debt Collection SaaS Platform

A comprehensive debt collection and invoice management system built for Danish businesses. Automate payment reminders, track overdue invoices, and manage customer relationships with intelligent automation.

## 🚀 Features

### Core Functionality
- **Automated Debt Collection**: Danish-compliant reminder automation (pre-reminder, rykker 1-3)
- **Invoice Management**: Sync with Dinero accounting system
- **Bank Integration**: Connect multiple bank accounts via GoCardless for automatic payment matching
- **Customer Risk Scoring**: AI-powered risk assessment and customer segmentation
- **Real-time Dashboard**: Modern React dashboard with live data updates

### Dashboard Features
- **Problemkunder**: Identify and manage high-risk customers
- **Forfaldne Fakturaer**: Track overdue invoices with automated reminders
- **Automatik**: Configure reminder schedules and automation rules
- **Integrationer**: Manage bank connections and third-party integrations
- **Analytics**: Comprehensive reporting and insights

### Technical Highlights
- **Multi-tenant Architecture**: Secure user isolation with Supabase
- **Real-time Updates**: Live dashboard updates via Supabase Realtime
- **Danish Compliance**: Follows Danish debt collection regulations
- **Mobile Responsive**: Fully responsive design for all devices
- **Dark/Light Mode**: User preference support

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Charts**: ApexCharts & Recharts
- **State Management**: React Hooks
- **Authentication**: Supabase Auth

### Backend
- **Framework**: Flask (Python)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with Supabase
- **Rate Limiting**: Flask-Limiter
- **Logging**: Python logging with detailed tracking

### Integrations
- **Dinero API**: Danish accounting system
- **GoCardless**: Bank account connections and payment data
- **Stripe**: Payment processing
- **SMS Service**: Automated SMS reminders

## 📋 Prerequisites

- Node.js 18+ 
- Python 3.9+
- Supabase account
- Dinero API credentials (for Danish accounting)
- GoCardless API credentials (for bank integration)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd autorykker-v2
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Configure environment variables
# Add your Supabase credentials, API keys, etc.
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Configure environment variables
# Add database credentials, API keys, etc.
```

### 4. Database Setup
```bash
# Apply Supabase migrations
# Run SQL files from supabase/queries/ in your Supabase SQL Editor
```

### 5. Start Development
```bash
# Frontend (terminal 1)
npm run dev

# Backend (terminal 2)
cd backend
python app.py
```

Visit `http://localhost:3000` to access the application.

## ⚙️ Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (.env)
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key

# Authentication
SECRET_KEY=your_secret_key
FRONTEND_URL=http://localhost:3000

# Dinero Integration
DINERO_CLIENT_ID=your_dinero_client_id
DINERO_CLIENT_SECRET=your_dinero_client_secret

# GoCardless Integration
GOCARDLESS_SECRET_ID=your_gocardless_secret_id
GOCARDLESS_SECRET_KEY=your_gocardless_secret_key

# SMS Service
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=your_sender_id

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## 🏗️ Architecture

### Frontend Structure
```
src/
├── app/                 # Next.js App Router pages
│   ├── dashboard-v4/    # Main dashboard
│   ├── auth/           # Authentication pages
│   └── api/            # API routes
├── components/         # Reusable UI components
├── lib/               # Utilities and API clients
├── types/             # TypeScript type definitions
└── hooks/             # Custom React hooks
```

### Backend Structure
```
backend/
├── app.py                    # Main Flask application
├── database.py              # Supabase database connection
├── dinero_service.py        # Dinero API integration
├── gocardless_service.py     # GoCardless API integration
├── invoice_matcher_v2.py    # Payment matching algorithm
├── invoice_reminder_automation.py # Reminder automation
└── payment_automation.py    # Payment processing
```

## 🔄 Automation Workflow

1. **Invoice Sync**: Fetch invoices from Dinero
2. **Bank Sync**: Retrieve transactions from connected banks
3. **Payment Matching**: Match payments to invoices automatically
4. **Reminder Automation**: Send reminders based on Danish rules:
   - Pre-reminder: 3 days after due date
   - Rykker 1: 13 days after due date
   - Rykker 2: 23 days after due date
   - Rykker 3: 33 days after due date (move to inkasso)

## 📊 Key Features Explained

### Risk Scoring
- Payment history analysis
- Invoice frequency tracking
- Reminder response patterns
- Custom risk thresholds

### Multi-Bank Support
- Connect multiple bank accounts
- Automatic transaction categorization
- Real-time payment detection
- Manual review workflow

### Danish Compliance
- Follows Danish debt collection laws
- Proper reminder intervals
- GDPR compliant data handling
- Danish currency and formatting

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
cd backend
pytest
```

## 📚 Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Automation System](./AUTOMATION_ARCHITECTURE.md)
- [Payment Matching](./SUPABASE_PAYMENT_MATCHING.md)
- [Reminder Automation](./REMINDER_AUTOMATION.md)

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
```

### Backend (Render/Heroku)
```bash
gunicorn app:app
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🇩🇰 Danish Market Focus

This system is specifically designed for the Danish market with:
- Danish language interface
- Danish accounting system integration (Dinero)
- Danish debt collection compliance
- Danish banking integration
- Danish currency (DKK) support
- Danish business practices

---

Built with ❤️ for Danish businesses
