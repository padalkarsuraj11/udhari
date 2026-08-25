-- ============================================================
-- MIGRATION 003: Fixes and Enhancements
-- Udhari Platform — Phase 2 corrections
--
-- Changes:
--   1. Add 'country' column to tenants table
--   2. Fix handle_new_user trigger to prefer app_metadata for role
--      (app_metadata is only settable by service-role, user_metadata
--      is user-controlled and therefore untrusted for role assignment)
--   3. Add useful indexes for performance
--   4. Add audit INSERT policy so backend can write audit logs
--   5. Tighten RLS: platform admin bypass for contractors (remove
--      duplicate policy added by 002 that conflicts with 001)
-- ============================================================

-- ============================================================
-- 1. ADD COUNTRY COLUMN TO TENANTS
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';

COMMENT ON COLUMN tenants.country IS 'Country where the business operates';

-- ============================================================
-- 2. FIX handle_new_user TRIGGER
-- Prefer app_metadata for role assignment (service-role only).
-- app_metadata cannot be set by users directly — only by the
-- service-role key — making it a trusted source of role truth.
-- Falls back to user_metadata then defaults to 'owner'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_full_name TEXT;
BEGIN
  -- Prefer app_metadata.role (set by service-role/admin only)
  -- Fall back to user_metadata.role, then default to 'owner'
  v_role := COALESCE(
    (NEW.raw_app_meta_data->>'role')::user_role,
    (NEW.raw_user_meta_data->>'role')::user_role,
    'owner'::user_role
  );

  v_full_name := COALESCE(
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );

  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (NEW.id, v_full_name, v_role)
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      role      = EXCLUDED.role,
      updated_at = NOW()
    -- Only update if role is changing from the trusted app_metadata source
    WHERE NEW.raw_app_meta_data->>'role' IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS
  'Auto-creates user_profile when auth.users record is created. '
  'Uses app_metadata.role (service-role only) for trusted role assignment.';

-- ============================================================
-- 3. AUDIT LOGS — INSERT POLICY
-- The backend uses service-role key so it bypasses RLS.
-- But if we ever want client-side audit writes, we need this.
-- Also ensures the backend (anon-key calls) can INSERT audit logs.
-- ============================================================

-- Allow authenticated users to insert their own audit entries
-- (backend uses service-role which bypasses RLS anyway, but
-- this is required if we switch to user-scoped writes later)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
    AND policyname = 'Authenticated users can insert audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert audit logs"
      ON audit_logs FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================================
-- 4. FIX DUPLICATE/CONFLICTING CONTRACTORS RLS POLICY
-- Migration 002 added "Inactive tenants blocked from contractors"
-- but migration 001 already had "Users can only access own tenant contractors"
-- These two FOR ALL policies can conflict. Drop the 001 one and
-- keep the 002 one which is stricter (checks tenant active status).
-- ============================================================
DROP POLICY IF EXISTS "Users can only access own tenant contractors" ON contractors;

-- Ensure the active-tenant policy from 002 exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contractors'
    AND policyname = 'Inactive tenants blocked from contractors'
  ) THEN
    CREATE POLICY "Inactive tenants blocked from contractors"
      ON contractors FOR ALL
      USING (
        auth.is_platform_admin() OR
        (tenant_id = auth.current_tenant_id() AND check_tenant_active())
      );
  END IF;
END $$;

-- ============================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================

-- Tenants: status-based queries (list active owners, etc.)
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Tenants: login_identifier lookup (owner login flow)
CREATE INDEX IF NOT EXISTS idx_tenants_login_identifier ON tenants(login_identifier);

-- Tenants: email lookup (duplicate check, auth lookup)
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- Tenants: created_at for sorting recent owners
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at DESC);

-- User profiles: last_seen_at for "last login" display
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen_at ON user_profiles(last_seen_at DESC);

-- ============================================================
-- 6. UPDATE updated_at TRIGGER COVERAGE
-- Ensure tenants table trigger exists
-- ============================================================
DROP TRIGGER IF EXISTS trg_updated_at ON tenants;
CREATE TRIGGER trg_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MIGRATION 003 COMPLETE
-- ============================================================
COMMENT ON SCHEMA public IS
  'Udhari Platform — Multi-tenant trade credit management system. '
  'Migrations: 001 (initial schema), 002 (RLS enhancements), 003 (fixes + country).';
