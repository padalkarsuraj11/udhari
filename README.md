# Udhari Platform

Trade Credit & Udhari Management System for material suppliers in India.

## Project Structure

```
udhari-platform/
├── packages/
│   ├── admin/          # Platform Admin Console (React + Vite)
│   ├── client/         # Owner/Business Portal (React + Vite)
│   ├── backend/        # API Server (Node.js + Express)
│   └── database/       # Database migrations (Supabase/PostgreSQL)
├── PHASE_2_DOCUMENTATION.md
├── SECURITY_TESTING.md
└── README.md
```

## Tech Stack

- **Frontend**: React 19, Vite, React Router
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (JWT)

## Current Status: Phase 2 Complete ✅

Phase 2 implements the foundational authentication and multi-tenant architecture:

- ✅ Database schema with RLS policies
- ✅ Platform Admin authentication
- ✅ Owner authentication with login identifiers
- ✅ Tenant isolation (Owner A cannot see Owner B's data)
- ✅ Admin dashboard with real data
- ✅ Owner management (create, activate, deactivate)
- ✅ Audit logging
- ✅ Route protection

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Git

### 1. Clone & Install

```bash
git clone <repository-url>
cd borrow
npm install
```

### 2. Setup Supabase

1. Create a new Supabase project at https://supabase.com
2. Copy your project URL and keys
3. Run migrations:
   - Open Supabase Dashboard → SQL Editor
   - Execute `packages/database/migrations/001_initial_schema.sql`
   - Execute `packages/database/migrations/002_rls_enhancements.sql`

### 3. Configure Environment

**Backend:**
```bash
cd packages/backend
cp .env.example .env
# Edit .env with your Supabase credentials
```

**Admin Frontend:**
```bash
cd packages/admin
cp .env.example .env
# Edit .env with your Supabase credentials
```

**Client Frontend:**
```bash
cd packages/client
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Create First Admin User

Via Supabase Dashboard:
1. Go to Authentication → Users → Add User
2. Enter email: `admin@udhari.io`, password: `admin123`
3. Go to SQL Editor and run:

```sql
UPDATE user_profiles
SET role = 'platform_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@udhari.io');
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd packages/backend
npm run dev
# Runs on http://localhost:4000
```

**Terminal 2 - Admin Frontend:**
```bash
cd packages/admin
npm run dev
# Runs on http://localhost:5173
```

**Terminal 3 - Client Frontend:**
```bash
cd packages/client
npm run dev
# Runs on http://localhost:5174
```

## Usage

### Admin Console

1. Navigate to `http://localhost:5173`
2. Login with `admin@udhari.io` / `admin123`
3. Create new owners via "Add Owner" button
4. View owner statistics and manage accounts

### Owner Portal

1. Admin creates an owner with login ID (e.g., `PATEL001`)
2. Navigate to `http://localhost:5174`
3. Login with the login ID and password
4. Access business dashboard and data

## Security Testing

Before deploying, run the security test suite documented in `SECURITY_TESTING.md`:

**Critical Tests:**
- Tenant isolation (Owner A vs Owner B)
- RLS policy enforcement
- Inactive account blocking
- Route protection

## Architecture Highlights

### Multi-Tenant Model

```
Platform Admin
    ↓
  Tenants (Business Accounts)
    ↓
  Business Data (Contractors, Customers, Transactions)
```

### Tenant Isolation

- **RLS (Row Level Security)**: Database-level enforcement
- **JWT Authentication**: User-scoped access tokens
- **Middleware**: Backend validates tenant context
- **Service-role key**: Admin-only, server-side operations

### Key Security Features

- Email-based admin login
- Login identifier-based owner login
- Tenant status enforcement (active/inactive)
- Audit logging for admin actions
- Immutable audit trail

## Documentation

- **`PHASE_2_DOCUMENTATION.md`** — Complete technical documentation
- **`SECURITY_TESTING.md`** — Security test suite
- **`packages/backend/src/routes/`** — API endpoint documentation (inline)

## What's NOT Implemented Yet

Phase 2 is the **foundation**. The following are planned for future phases:

- Material management
- Transaction recording
- Payment tracking
- Bill generation
- WhatsApp integration
- Risk assessment engine
- Advanced analytics
- Customer-facing bill requests

## Project Phases

- **Phase 1**: UI prototypes and mock data ✅
- **Phase 2**: Authentication & tenant foundation ✅
- **Phase 3**: Core business workflows (planned)
- **Phase 4**: WhatsApp integration (planned)
- **Phase 5**: Risk engine & analytics (planned)

## Contributing

This is a private project. Please contact the project maintainer before making changes.

## Common Issues

### "Supabase not configured" warning
- Ensure `.env` files are created from `.env.example`
- Verify `SUPABASE_URL` and keys are correct
- Restart dev servers after changing `.env`

### "CORS error" in browser
- Check backend `ADMIN_ORIGIN` and `CLIENT_ORIGIN` in `.env`
- Ensure they match your frontend URLs

### "RLS policy violation"
- Verify migrations ran successfully
- Check user has correct `tenant_id` in `user_profiles`
- Ensure tenant status is `active`

### Can't create first admin
- Admin user must be created manually via Supabase Dashboard
- After creating auth user, update `user_profiles` role to `platform_admin`

## Support

For questions or issues:
1. Check `PHASE_2_DOCUMENTATION.md`
2. Review `SECURITY_TESTING.md`
3. Contact project maintainer

## License

Proprietary - All rights reserved

---

**Last Updated**: 2026-08-20
**Current Phase**: 2 (Foundation Complete)
**Next Phase**: 3 (Business Workflows)
