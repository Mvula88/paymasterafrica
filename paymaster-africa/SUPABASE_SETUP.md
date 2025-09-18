# PayMaster Africa - Supabase Only Setup Guide

Now using **Supabase for both authentication and database**! This simplifies the setup to just one service.

## 🚀 Quick Setup (Only 3 Services Needed!)

### 1. **Supabase** (Auth + Database)
1. Go to https://supabase.com
2. Create new project (save your database password!)
3. Get your credentials:
   - **Settings > API**:
     - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role key` → `SUPABASE_SERVICE_KEY`
   - **Settings > Database**:
     - Connection string → `DATABASE_URL`

### 2. **Redis** (Job Queue)
Choose one option:

**Option A: Docker (Easiest)**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Option B: Upstash Cloud (Free)**
- Sign up at https://upstash.com
- Create Redis database
- Copy connection URL

### 3. **Resend** (Email - Optional)
- Sign up at https://resend.com (3,000 free emails/month)
- Get API key from dashboard
- Or skip this for development

## 📁 Environment Setup

Create `apps/web/.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Create `apps/api/.env`:
```env
# Database
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Redis
REDIS_URL=redis://localhost:6379

# Email (optional)
RESEND_API_KEY=re_xxxxx

# URLs
FRONTEND_URL=http://localhost:3000
PORT=3001
```

## 🗄️ Database Setup

1. Go to Supabase Dashboard > SQL Editor
2. Run the migration:
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and run in SQL Editor
3. Run seed data:
   - Copy contents of `supabase/seed.sql`
   - Paste and run in SQL Editor

## 🔐 Enable Auth in Supabase

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Configure settings:
   - Enable email confirmations (optional for dev)
   - Set site URL: `http://localhost:3000`
   - Add redirect URLs:
     - `http://localhost:3000/dashboard`
     - `http://localhost:3000/portal`

## 🚦 Start Development

```bash
# Install dependencies
npm install

# Start all services
npm run dev

# Or run separately:
cd apps/web && npm run dev  # Frontend: http://localhost:3000
cd apps/api && npm run dev  # API: http://localhost:3001
```

## ✅ Test the Application

1. Go to http://localhost:3000
2. Click "Sign Up" to create account
3. Enter your details:
   - Organization name
   - Email & password
4. You'll be redirected to dashboard

## 🎯 What Changed from Clerk?

- **Authentication**: Now using Supabase Auth instead of Clerk
- **User Management**: Built into Supabase Dashboard
- **Session Handling**: Automatic with Supabase
- **Cost**: One less service to pay for!
- **Database**: Same Supabase database

## 📊 Features Available

✅ User authentication (sign up, sign in, sign out)
✅ Protected routes
✅ Role-based access control (RBAC)
✅ Multi-company support
✅ Employee self-service portal
✅ All payroll features

## 🐛 Troubleshooting

### "Invalid token" error
- Make sure you're using the service key in the API
- Check SUPABASE_SERVICE_KEY is set correctly

### Cannot sign in
- Check email/password is correct
- Verify Supabase auth is enabled
- Check browser console for errors

### Database connection issues
- Verify DATABASE_URL format
- Ensure password is URL-encoded if it has special characters
- Check Supabase project is not paused

## 🚀 Production Deployment

1. Update environment variables:
   - Use production URLs
   - Enable email confirmations
   - Set up custom SMTP (optional)

2. Deploy to Vercel:
```bash
vercel --prod
```

3. Update Supabase:
   - Add production URLs to redirect allowlist
   - Enable RLS (Row Level Security) policies
   - Set up database backups

## 💰 Cost Comparison

**Before (with Clerk):**
- Clerk: Free up to 5,000 users
- Supabase: Free tier
- Total: 2 services

**Now (Supabase only):**
- Supabase: Free tier (500MB database, unlimited auth users)
- Total: 1 service

**Simpler, cheaper, same features!** 🎉