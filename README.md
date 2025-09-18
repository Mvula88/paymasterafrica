# PayMaster Africa 🌍

A complete payroll SaaS platform for Namibia 🇳🇦 and South Africa 🇿🇦, built with modern technologies and designed for scalability across African markets.

## 🚀 Features

### Core Functionality
- **Multi-Country Support**: Built-in support for Namibia and South Africa tax regulations
- **Automated Calculations**: PAYE, SSC, UIF, SDL, VET levy calculations with latest tax tables
- **Document Generation**: Payslips, PAYE5, IRP5, EMP201, EMP501 certificates
- **Bank Integration**: EFT batch files for major banks (FNB, Bank Windhoek, Nedbank, Standard Bank)
- **Employee Portal**: Self-service access to payslips and tax certificates
- **Compliance Management**: Deadline tracking and statutory return generation
- **Role-Based Access**: Owner, Admin, Payroll Officer, and Employee roles

### Country-Specific Features

#### 🇳🇦 Namibia
- PAYE tax brackets (monthly, versioned)
- Social Security contributions (0.9% + 0.9%, N$500-11,000 ceiling)
- VET Levy (1% for companies with annual payroll ≥ N$1m)
- PAYE5 year-end certificates

#### 🇿🇦 South Africa
- PAYE tax brackets with rebates (age-based)
- UIF contributions (1% + 1%, capped)
- Skills Development Levy (1% where applicable)
- IRP5/IT3(a) certificates
- EMP201 monthly returns & EMP501 reconciliations

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase, Express API
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Clerk with RBAC
- **Queue**: BullMQ (Redis) for background jobs
- **PDF Generation**: pdfmake
- **Email**: Resend
- **Deployment**: Vercel (frontend) + Supabase (backend)

## 📦 Project Structure

```
paymaster-africa/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Express API server
├── packages/
│   ├── database/     # Prisma schema and migrations
│   ├── tax-engine/   # Tax calculation engines
│   └── shared/       # Shared utilities and types
├── supabase/
│   ├── migrations/   # Database migrations
│   └── seed.sql      # Seed data
└── docker-compose.yml
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker & Docker Compose (for local development)
- Supabase account
- Clerk account

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/paymaster-africa.git
cd paymaster-africa
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create `.env.local` in `apps/web/`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://...
```

Create `.env` in `apps/api/`:
```env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
SUPABASE_SERVICE_KEY=your-service-key
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_...
```

4. Start the development environment:
```bash
# Using Docker Compose (recommended)
docker-compose up

# Or run services individually
npm run dev
```

### Database Setup

1. Run migrations:
```bash
npm run db:migrate
```

2. Seed the database:
```bash
npm run db:seed
```

## 📝 API Endpoints

### Payroll Operations
- `POST /api/payrolls/:id/run` - Run payroll for a period
- `GET /api/payrolls/:id` - Get payroll details
- `PUT /api/payrolls/:id/approve` - Approve payroll run

### Documents
- `GET /api/payslips/:id.pdf` - Generate payslip PDF
- `POST /api/returns/:country/:type/export` - Export statutory returns

### Banking
- `POST /api/bank-batches/:period/build` - Build bank payment batch

### Employee Portal
- `GET /api/portal/employees/:id/payslips` - Get employee payslips
- `GET /api/portal/employees/:id/documents` - Get employee documents

## 🔒 Security

- **Authentication**: Clerk OIDC with JWT
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: All sensitive data encrypted at rest
- **Audit Logging**: Complete audit trail of all operations
- **Compliance**: POPIA and GDPR compliant

## 📊 Reports

Available reports include:
- Payroll cost analysis
- Tax liability summary
- Employee cost breakdown
- General ledger export
- Compliance status dashboard

## 🚢 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy:
```bash
vercel --prod
```

### Docker Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📚 Documentation

- [User Guide](./docs/user-guide.md)
- [API Documentation](./docs/api.md)
- [Tax Configuration](./docs/tax-configuration.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Documentation: [docs.paymasterafrica.com](https://docs.paymasterafrica.com)
- Email: support@paymasterafrica.com
- Issues: [GitHub Issues](https://github.com/your-org/paymaster-africa/issues)

## 🙏 Acknowledgments

Built with ❤️ for African businesses by the PayMaster Africa team.