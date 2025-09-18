# PayMaster Africa - Environment Setup Guide

## Quick Setup Steps

### 1. Clone and Install
```bash
git clone https://github.com/Mvula88/paymasterafrica.git
cd paymaster-africa
npm install
```

### 2. Create Required Accounts (All Free Tier)

#### Clerk (Authentication)
1. Sign up at https://clerk.com
2. Create new application
3. Go to **API Keys** section
4. Copy your keys:
   - `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`
5. Enable **Organizations** feature (for multi-company support)

#### Supabase (Database)
1. Sign up at https://supabase.com
2. Create new project (remember your database password!)
3. Go to **Settings > API**:
   - Copy `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role key` → `SUPABASE_SERVICE_KEY`
4. Go to **Settings > Database**:
   - Copy connection string → `DATABASE_URL`

#### Redis (Job Queue)
**Option 1: Docker (Recommended)**
```bash
docker run -d -p 6379:6379 --name redis-paymaster redis:alpine
```

**Option 2: Upstash (Cloud)**
1. Sign up at https://upstash.com
2. Create Redis database
3. Copy connection URL

#### Resend (Email)
1. Sign up at https://resend.com (3,000 free emails/month)
2. Go to **API Keys**
3. Create and copy API key → `RESEND_API_KEY`

### 3. Configure Environment Variables

Update `apps/web/.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_[your-key]
CLERK_SECRET_KEY=sk_test_[your-key]
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-key]
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Update `apps/api/.env`:
```env
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
CLERK_SECRET_KEY=sk_test_[your-key]
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_KEY=[your-service-key]
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_[your-key]
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### 4. Database Setup

Run migrations in Supabase:

1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Run the SQL
4. Copy contents of `supabase/seed.sql`
5. Run the seed SQL

### 5. Start Development

```bash
# Start all services
npm run dev

# Or start individually
cd apps/web && npm run dev  # Frontend on http://localhost:3000
cd apps/api && npm run dev  # API on http://localhost:3001
```

### 6. Access the Application

- **Main App**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **Employee Portal**: http://localhost:3000/portal
- **API**: http://localhost:3001/api/health
- **Queue Monitor**: http://localhost:3001/admin/queues

### 7. Test Credentials (from seed data)

**Owner Account**
- Email: owner@democorp.com
- Company: Demo Corporation

**Employee Account**
- Email: john.doe@democorp.com
- Employee #: EMP001

## Troubleshooting

### Database Connection Issues
- Ensure your Supabase project is active
- Check DATABASE_URL format is correct
- Verify password doesn't contain special characters (or URL-encode them)

### Redis Connection Issues
- Ensure Redis is running: `docker ps` or `redis-cli ping`
- Check REDIS_URL format: `redis://localhost:6379`

### Clerk Authentication Issues
- Verify API keys are correct
- Ensure redirect URLs are configured in Clerk dashboard
- Check organization feature is enabled

### Email Issues
- Verify Resend API key is active
- Check email domain is verified (for production)
- Test with Resend dashboard first

## Production Deployment

### Vercel Deployment
1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
- Update all URLs to production domains
- Use production API keys
- Enable SSL/TLS for Redis
- Configure proper CORS origins

## Support

- GitHub Issues: https://github.com/Mvula88/paymasterafrica/issues
- Documentation: See README.md

## Free Tier Limits

- **Clerk**: 5,000 monthly active users
- **Supabase**: 500MB database, 2GB bandwidth
- **Upstash Redis**: 10,000 commands/day
- **Resend**: 3,000 emails/month
- **Vercel**: Unlimited deployments

Perfect for development and small-scale production!