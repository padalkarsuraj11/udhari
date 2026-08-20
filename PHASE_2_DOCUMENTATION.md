# Udhari Platform — Phase 2 Implementation Documentation

## Overview

This document describes the database foundation, authentication architecture, and multi-tenant isolation implemented in Phase 2 of the Udhari Platform.

## Architecture

### Multi-Tenant Model

```
auth.users (Supabase Auth)
    ↓
user_profiles (role: platform_admin | owner | staff)
    ↓
tenants (business accounts)
    ↓
Business Data (contractors, customers, transactions, etc.)
```

### Key Concepts

- **Tenant**: A business account (material supplier) using the platform
- **Platform Admin**: Has access to all tenants, can create/manage owners
- **Owner**: Tenant administrator with full access to their business data only
- **Staff**: Future role for tenant team members

## Database Schema

### Core Tables

#### `tenants`
- Root of multi-tenant hierarchy
- Stores business information and account status
- Has unique `login_identifier` for owner login
- Linked to `user_profiles` via `tenant_id`

#### `user_profiles`
- Extends Supabase `auth.users` with application data
- Stores user role and tenant association
- Platform admins have `tenant_id = NULL`

#### Tenant-Scoped Tables
All business data tables include `tenant_id`:
- `contractors`
- `customers`
- `materials`
- `material_transactions`
- `payments`
- `bills`
- `risk_profiles`
- `whatsapp_accounts`

#### `audit_logs`
- Immutable audit trail
- Tracks platform admin actions and user authentication events

## Row Level Security (RLS)

RLS is the **PRIMARY** mechanism for tenant isolation. All tenant-scoped tables have RLS enabled.

### Key Policies

**Tenants Table:**
- Platform admins can view/manage all tenants
- Owners can view their own tenant only

**Business Data (contractors, customers, etc.):**
- Users can only access data where `tenant_id = auth.current_tenant_id()`
- Platform admins bypass RLS using service-role key server-side

**Account Status Enforcement:**
- Inactive tenants are blocked from accessing any data
- Enforced at RLS level via `check_tenant_active()` function

### Helper Functions

- `auth.current_tenant_id()`: Returns authenticated user's tenant_id
- `auth.is_platform_admin()`: Checks if user is platform admin
- `check_tenant_active()`: Verifies tenant status is 'active'

## Authentication Flow

### Admin Login

1. Admin enters email + password
2. Backend validates credentials via Supabase Auth
3. Backend verifies `role = 'platform_admin'` from user_profiles
4. Returns session token + user profile
5. Frontend stores session, redirects to admin dashboard

### Owner Login

1. Owner enters `login_identifier` + password
2. Backend looks up tenant by `login_identifier`
3. Backend checks tenant status (must be 'active')
4. Backend retrieves tenant email, authenticates via Supabase
5. Returns session token + user profile + tenant info
6. Frontend stores session, redirects to owner dashboard

### Session Management

- Access tokens stored in Supabase Auth session
- Frontend sends `Authorization: Bearer <token>` with API requests
- Backend validates token and extracts user context
- Sessions auto-refresh via Supabase client

## Authorization

### Route Protection

**Frontend:**
- `/admin/*` — Requires authenticated user with `role = platform_admin`
- `/client/*` (owner routes) — Requires authenticated user with `role = owner`

**Backend:**
- `/api/admin/*` — `requireAuth + requireAdmin` middleware
- `/api/contractors`, `/api/customers`, etc. — `requireAuth + attachOwnerContext` middleware

### Middleware

**`requireAuth`:**
- Validates JWT token from Authorization header
- Attaches `req.user` and `req.accessToken`

**`requireAdmin`:**
- Checks `req.user.app_metadata.role === 'platform_admin'`
- Returns 403 if not admin

**`attachOwnerContext`:**
- Extracts `tenant_id` from user metadata
- Attaches `req.ownerId` for tenant-scoped queries
- Returns 403 if no tenant association

## API Endpoints

### Authentication (`/api/auth`)

- `POST /login` — Email/password or loginIdentifier/password
- `POST /logout` — Invalidate session
- `GET /me` — Get current user profile
- `POST /refresh` — Refresh access token

### Admin (`/api/admin`)

- `GET /dashboard` — Platform-wide statistics
- `GET /owners` — List all tenants (paginated, filterable)
- `GET /owners/:id` — Tenant details with stats
- `POST /owners` — Create new owner (tenant + auth user)
- `PATCH /owners/:id/status` — Activate/deactivate tenant
- `GET /activity` — Recent platform activity (audit logs)

### Owner Business Data (`/api/*`)

All tenant-scoped routes automatically filter by `req.ownerId`:
- `/api/contractors` — Contractor management
- `/api/customers` — Customer/project management
- `/api/materials` — Material catalog
- `/api/transactions` — Material issue transactions
- `/api/payments` — Payment receipts
- `/api/bills` — Bill generation
- `/api/risk` — Risk assessment

## Security Considerations

### Frontend Security

**NEVER expose these in frontend code:**
- `SUPABASE_SERVICE_ROLE_KEY`
- Database passwords
- Private API keys

**Only use in frontend:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (public key)
- `VITE_API_BASE_URL`

### Backend Security

**Service Role Key:**
- Bypasses RLS
- Only used server-side for admin operations
- Stored in `.env`, never committed to git

**RLS Enforcement:**
- All tenant data protected by RLS policies
- Even with valid JWT, users can only access their tenant's data
- Platform admins use service-role key for cross-tenant operations

### Audit Logging

All important actions are logged:
- Admin creates owner
- Admin activates/deactivates owner
- User login
- User logout
- Tenant status changes

Audit logs are immutable and include metadata for forensics.

## Environment Setup

### Backend `.env`

```env
NODE_ENV=development
PORT=4000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

ADMIN_ORIGIN=http://localhost:5173
CLIENT_ORIGIN=http://localhost:5174
```

### Admin Frontend `.env`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_API_BASE_URL=http://localhost:4000/api
```

### Client Frontend `.env`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_API_BASE_URL=http://localhost:4000/api
```

## Database Migrations

### Running Migrations

Migrations are located in `packages/database/migrations/`.

**Using Supabase CLI:**

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

**Manually via SQL Editor:**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `001_initial_schema.sql`
3. Execute
4. Copy contents of `002_rls_enhancements.sql`
5. Execute

### Migration Files

- `001_initial_schema.sql` — Core tables, RLS policies, indexes
- `002_rls_enhancements.sql` — Helper functions, triggers, additional policies

## Testing

### Manual Testing Scenarios

**TEST 1: Admin Login**
- Admin logs in with email/password
- Verify access to admin dashboard
- Verify can see all tenants

**TEST 2: Owner Login**
- Owner logs in with login_identifier/password
- Verify access to owner dashboard
- Verify can only see own business data

**TEST 3: Tenant Isolation**
- Create Owner A and Owner B
- Login as Owner A
- Verify cannot access Owner B's contractors/customers
- Try changing tenant_id in API request
- Verify RLS blocks access

**TEST 4: Inactive Account**
- Admin deactivates Owner A
- Owner A attempts login
- Verify login blocked with "account inactive" message

**TEST 5: Route Protection**
- Unauthenticated user accesses `/admin/dashboard`
- Verify redirect to login
- Owner user accesses `/admin/dashboard`
- Verify 403 or redirect

**TEST 6: Admin Create Owner**
- Admin creates new owner via UI
- Verify tenant created in database
- Verify auth user created
- Verify user_profile linked to tenant
- Verify audit log entry

**TEST 7: Admin Deactivate Owner**
- Admin deactivates owner
- Verify tenant status updated
- Verify audit log entry
- Verify owner login blocked

## Running the Application

### Start Backend

```bash
cd packages/backend
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

Backend runs on `http://localhost:4000`

### Start Admin Frontend

```bash
cd packages/admin
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

Admin frontend runs on `http://localhost:5173`

### Start Client Frontend

```bash
cd packages/client
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

Client frontend runs on `http://localhost:5174`

## Creating First Admin User

Since the platform requires an admin to create owners, you need to create the first admin user manually:

**Via Supabase Dashboard:**

1. Go to Authentication → Users
2. Click "Add User"
3. Enter email and password
4. After user is created, go to SQL Editor
5. Run:

```sql
UPDATE user_profiles
SET role = 'platform_admin'
WHERE id = '<auth-user-id>';
```

**Via Supabase CLI:**

```bash
supabase db execute "
UPDATE user_profiles
SET role = 'platform_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@udhari.io');
"
```

## Known Limitations / Future Work

**Phase 2 does NOT implement:**
- Material management UI
- Transaction creation
- Payment recording
- Bill generation
- WhatsApp integration
- Risk engine
- Advanced analytics

These will be implemented in subsequent phases.

**Current Limitations:**
- No email verification flow (users created by admin are auto-confirmed)
- No password reset flow
- No invite system for staff users
- No subscription billing integration
- No file uploads (for bills, receipts, etc.)

## Architectural Decisions

### Why Supabase?

- Built-in authentication with JWT
- Row Level Security for tenant isolation
- Real-time capabilities for future features
- PostgreSQL for complex queries and data integrity

### Why Service Role Key on Backend?

- Platform admin needs cross-tenant access for dashboard stats
- RLS policies would block admin from viewing all tenants
- Service role bypasses RLS but only used server-side
- Owner routes still use user JWT with RLS enforcement

### Why Login Identifier?

- Business owners prefer simple identifiers over email
- Easier to remember (e.g., "PATEL001" vs "ramesh@patelelectrical.com")
- Still linked to email for auth security
- Admin can customize identifier per business

### Why Separate Tenants and User Profiles?

- One tenant can have multiple users (future staff members)
- Platform admin has no tenant (tenant_id = NULL)
- Clear separation of business entity vs. user account
- Easier to implement role-based permissions later

## Next Steps (Phase 3)

Phase 3 will focus on implementing the core business workflows:

1. Material catalog management
2. Contractor onboarding
3. Customer/project tracking
4. Material issue transactions
5. Payment recording
6. Basic reporting

Phase 3 will NOT include WhatsApp integration or risk engine yet.

---

**Generated:** 2026-08-20
**Version:** Phase 2
**Status:** Foundation Complete
