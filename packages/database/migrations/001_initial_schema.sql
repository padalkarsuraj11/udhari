-- ============================================================
-- UDHARI PLATFORM — DATABASE FOUNDATION MIGRATION
-- Supabase / PostgreSQL
-- Phase 2: Multi-tenant architecture with authentication
--
-- IMPORTANT: Row Level Security (RLS) is the PRIMARY mechanism
-- for multi-tenant data isolation. Every table with tenant data
-- MUST have RLS enabled and appropriate policies.
--
-- Architecture:
--   auth.users (Supabase Auth)
--        ↓
--   user_profiles (App metadata & role)
--        ↓
--   tenants (Business/Owner account)
--        ↓
--   Business data (contractors, customers, transactions, etc.)
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('platform_admin', 'owner', 'staff');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE business_type AS ENUM ('Electrical', 'Plumbing', 'Construction', 'Paint', 'Hardware', 'Building Materials', 'Other');
CREATE TYPE subscription_plan AS ENUM ('Starter', 'Professional', 'Enterprise');

-- ============================================================
-- USER PROFILES TABLE
-- Extends Supabase auth.users with application-level data
-- One profile per authenticated user
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role   NOT NULL DEFAULT 'owner',
  full_name       TEXT        NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,

  -- Tenant linkage (NULL for platform admins)
  tenant_id       UUID        REFERENCES tenants(id) ON DELETE CASCADE,

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ
);

COMMENT ON TABLE user_profiles IS 'Application user profiles extending Supabase auth.users';
COMMENT ON COLUMN user_profiles.role IS 'User role: platform_admin (no tenant), owner (tenant admin), staff (tenant member)';
COMMENT ON COLUMN user_profiles.tenant_id IS 'Linked tenant for owners/staff. NULL for platform admins.';

-- ============================================================
-- TENANTS TABLE
-- Represents each material supplier business using the platform.
-- This is the root of the multi-tenant hierarchy.
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Business information
  business_name     TEXT        NOT NULL,
  business_type     business_type NOT NULL,
  owner_name        TEXT        NOT NULL,

  -- Contact
  email             TEXT        UNIQUE NOT NULL,
  phone             TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,

  -- Account management
  status            account_status NOT NULL DEFAULT 'active',
  plan              subscription_plan NOT NULL DEFAULT 'Starter',

  -- Login identifier (unique username/code for owner login)
  login_identifier  TEXT        UNIQUE NOT NULL,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_login_identifier CHECK (length(login_identifier) >= 3)
);

COMMENT ON TABLE tenants IS 'Platform tenants — each row represents one material supplier business';
COMMENT ON COLUMN tenants.login_identifier IS 'Unique identifier for owner login (e.g., PATEL001, username, etc.)';
COMMENT ON COLUMN tenants.status IS 'active: full access, inactive: login blocked, suspended: temporary block';

-- Add forward reference for user_profiles.tenant_id
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================
-- CONTRACTORS TABLE
-- Contractors that a tenant provides material to on credit.
-- Tenant-scoped: each contractor belongs to one tenant.
-- ============================================================
CREATE TABLE IF NOT EXISTS contractors (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  contact_name    TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  credit_limit    DECIMAL(12,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contractors IS 'Contractors that receive materials on credit from a specific tenant/supplier';
CREATE INDEX idx_contractors_tenant_id ON contractors(tenant_id);

-- ============================================================
-- CUSTOMERS / PROJECTS TABLE
-- Each contractor may have multiple customers or project sites.
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contractor_id   UUID        NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  project_type    TEXT        DEFAULT 'Residential' CHECK (project_type IN (
    'Residential', 'Commercial', 'Industrial', 'Society', 'Government', 'Other'
  )),
  address         TEXT,
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'inactive')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Customer sites/projects under a contractor — the third level of the business hierarchy';
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_contractor_id ON customers(contractor_id);

-- ============================================================
-- MATERIALS TABLE
-- Catalog of materials a supplier stocks.
-- ============================================================
CREATE TABLE IF NOT EXISTS materials (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  unit            TEXT        NOT NULL DEFAULT 'piece',
  rate            DECIMAL(10,2) NOT NULL DEFAULT 0,
  category        TEXT,
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE materials IS 'Material catalog per tenant';
CREATE INDEX idx_materials_tenant_id ON materials(tenant_id);

-- ============================================================
-- MATERIAL TRANSACTIONS (ISSUES)
-- Each time material is issued to a contractor/customer on credit.
-- ============================================================
CREATE TABLE IF NOT EXISTS material_transactions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contractor_id   UUID        NOT NULL REFERENCES contractors(id),
  customer_id     UUID        REFERENCES customers(id),

  -- Transaction detail
  transaction_date DATE       NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - advance_amount) STORED,

  due_date        DATE,
  status          TEXT        NOT NULL DEFAULT 'outstanding' CHECK (status IN (
    'outstanding', 'partial', 'paid', 'overdue', 'written_off'
  )),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE material_transactions IS 'Each material issue event — the core credit transaction';
CREATE INDEX idx_material_transactions_tenant ON material_transactions(tenant_id);
CREATE INDEX idx_material_transactions_contractor ON material_transactions(contractor_id);

-- ============================================================
-- PAYMENTS TABLE
-- Payment receipts against outstanding transactions.
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contractor_id   UUID        NOT NULL REFERENCES contractors(id),
  customer_id     UUID        REFERENCES customers(id),
  transaction_id  UUID        REFERENCES material_transactions(id),

  payment_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  amount          DECIMAL(12,2) NOT NULL,
  payment_method  TEXT        DEFAULT 'cash' CHECK (payment_method IN (
    'cash', 'upi', 'bank_transfer', 'cheque', 'other'
  )),
  reference       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Payment receipts from contractors/customers';
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_contractor_id ON payments(contractor_id);

-- ============================================================
-- BILLS TABLE
-- Formal bills generated for contractors/customers.
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contractor_id   UUID        NOT NULL REFERENCES contractors(id),
  customer_id     UUID        REFERENCES customers(id),
  bill_number     TEXT        NOT NULL,
  bill_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'
  )),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, bill_number)
);

COMMENT ON TABLE bills IS 'Formal bills issued to contractors/customers';
CREATE INDEX idx_bills_tenant_id ON bills(tenant_id);

-- ============================================================
-- BILL ITEMS TABLE
-- Line items within a bill.
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_items (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id         UUID        NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  material_id     UUID        REFERENCES materials(id),
  description     TEXT        NOT NULL,
  quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit            TEXT,
  rate            DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount          DECIMAL(12,2) GENERATED ALWAYS AS (quantity * rate) STORED
);

COMMENT ON TABLE bill_items IS 'Line items in bills';
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);

-- ============================================================
-- RISK PROFILES TABLE
-- Computed risk assessment for each contractor.
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_profiles (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contractor_id   UUID        NOT NULL UNIQUE REFERENCES contractors(id) ON DELETE CASCADE,
  risk_level      TEXT        NOT NULL DEFAULT 'normal' CHECK (risk_level IN (
    'normal', 'medium', 'high', 'critical'
  )),
  risk_score      INT         NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  avg_days_overdue   INT      DEFAULT 0,
  overdue_ratio      DECIMAL(5,4) DEFAULT 0,
  last_payment_days  INT      DEFAULT 0,
  computed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE risk_profiles IS 'Risk assessment per contractor';
CREATE INDEX idx_risk_profiles_tenant_id ON risk_profiles(tenant_id);

-- ============================================================
-- WHATSAPP ACCOUNTS TABLE
-- WhatsApp Business API integration per tenant.
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number    TEXT,
  business_account_id TEXT,
  status          TEXT        NOT NULL DEFAULT 'disconnected' CHECK (status IN (
    'connected', 'disconnected', 'pending_verification'
  )),
  connected_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE whatsapp_accounts IS 'WhatsApp integration per tenant';

-- ============================================================
-- AUDIT LOGS TABLE
-- Immutable log of important actions for compliance and debugging.
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL,
  resource_type   TEXT        NOT NULL,
  resource_id     UUID,
  metadata        JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for platform and tenant actions';
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenants', 'user_profiles', 'contractors', 'customers',
    'materials', 'material_transactions', 'bills'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- This is the CORE of multi-tenant isolation
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER PROFILES RLS
-- ============================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Platform admins can view all profiles
CREATE POLICY "Platform admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'platform_admin'
    )
  );

-- ============================================================
-- TENANTS RLS
-- ============================================================

-- Platform admins can view all tenants
CREATE POLICY "Platform admins can view all tenants"
  ON tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'platform_admin'
    )
  );

-- Platform admins can manage all tenants
CREATE POLICY "Platform admins can manage tenants"
  ON tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'platform_admin'
    )
  );

-- Owners can view their own tenant
CREATE POLICY "Owners can view own tenant"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- ============================================================
-- TENANT-SCOPED DATA RLS (Contractors, Customers, etc.)
-- ============================================================

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION auth.current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

-- Contractors RLS
CREATE POLICY "Users can only access own tenant contractors"
  ON contractors FOR ALL
  USING (tenant_id = auth.current_tenant_id());

-- Customers RLS
CREATE POLICY "Users can only access own tenant customers"
  ON customers FOR ALL
  USING (tenant_id = auth.current_tenant_id());

-- Materials RLS
CREATE POLICY "Users can only access own tenant materials"
  ON materials FOR ALL
  USING (tenant_id = auth.current_tenant_id());

-- Transactions RLS
CREATE POLICY "Users can only access own tenant transactions"
  ON material_transactions FOR ALL
  USING (tenant_id = auth.current_tenant_id());

-- Payments RLS
CREATE POLICY "Users can only access own tenant payments"
  ON payments FOR ALL
  USING (tenant_id = auth.current_tenant_id());

-- Bills RLS
CREATE POLICY "Users can only access own tenant bills"
  ON bills FOR ALL
  USING (tenant_id = auth.current_tenant_id());

-- Bill Items RLS (via bill)
CREATE POLICY "Users can only access own tenant bill items"
  ON bill_items FOR ALL
  USING (
    bill_id IN (
      SELECT id FROM bills WHERE tenant_id = auth.current_tenant_id()
    )
  );

-- Risk Profiles RLS
CREATE POLICY "Users can only access own tenant risk profiles"
  ON risk_profiles FOR ALL
  USING (tenant_id = auth.current_tenant_id());

-- WhatsApp Accounts RLS
CREATE POLICY "Users can only access own tenant whatsapp account"
  ON whatsapp_accounts FOR ALL
  USING (tenant_id = auth.current_tenant_id());

-- Audit Logs RLS
CREATE POLICY "Users can view own tenant audit logs"
  ON audit_logs FOR SELECT
  USING (
    tenant_id = auth.current_tenant_id()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Platform admins can view all audit logs
CREATE POLICY "Platform admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- ============================================================
-- INITIAL SETUP COMPLETE
-- ============================================================
COMMENT ON SCHEMA public IS 'Udhari Platform - Multi-tenant trade credit management system';
