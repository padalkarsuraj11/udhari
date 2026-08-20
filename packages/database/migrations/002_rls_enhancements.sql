-- ============================================================
-- MIGRATION 002: Additional RLS Policies and Helper Functions
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to check if user is platform admin
CREATE OR REPLACE FUNCTION auth.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'platform_admin'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check tenant active status
CREATE OR REPLACE FUNCTION check_tenant_active()
RETURNS BOOLEAN AS $$
  SELECT status = 'active' FROM tenants
  WHERE id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid());
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- ADDITIONAL RLS POLICIES
-- ============================================================

-- Ensure inactive tenants cannot access data
CREATE POLICY "Inactive tenants blocked from contractors"
  ON contractors FOR ALL
  USING (
    auth.is_platform_admin() OR
    (tenant_id = auth.current_tenant_id() AND check_tenant_active())
  );

-- Similar policies for other tenant-scoped tables
-- (These override the previous "FOR ALL" policies with status checks)

DROP POLICY IF EXISTS "Users can only access own tenant customers" ON customers;
CREATE POLICY "Active tenant users can access customers"
  ON customers FOR ALL
  USING (
    auth.is_platform_admin() OR
    (tenant_id = auth.current_tenant_id() AND check_tenant_active())
  );

DROP POLICY IF EXISTS "Users can only access own tenant materials" ON materials;
CREATE POLICY "Active tenant users can access materials"
  ON materials FOR ALL
  USING (
    auth.is_platform_admin() OR
    (tenant_id = auth.current_tenant_id() AND check_tenant_active())
  );

DROP POLICY IF EXISTS "Users can only access own tenant transactions" ON material_transactions;
CREATE POLICY "Active tenant users can access transactions"
  ON material_transactions FOR ALL
  USING (
    auth.is_platform_admin() OR
    (tenant_id = auth.current_tenant_id() AND check_tenant_active())
  );

DROP POLICY IF EXISTS "Users can only access own tenant payments" ON payments;
CREATE POLICY "Active tenant users can access payments"
  ON payments FOR ALL
  USING (
    auth.is_platform_admin() OR
    (tenant_id = auth.current_tenant_id() AND check_tenant_active())
  );

DROP POLICY IF EXISTS "Users can only access own tenant bills" ON bills;
CREATE POLICY "Active tenant users can access bills"
  ON bills FOR ALL
  USING (
    auth.is_platform_admin() OR
    (tenant_id = auth.current_tenant_id() AND check_tenant_active())
  );

-- ============================================================
-- AUDIT LOGGING TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION log_tenant_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'tenant_status_changed',
        'tenant',
        NEW.id,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'tenant_created',
      'tenant',
      NEW.id,
      jsonb_build_object(
        'business_name', NEW.business_name,
        'plan', NEW.plan
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_tenant_changes
  AFTER INSERT OR UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION log_tenant_changes();

-- ============================================================
-- USER PROFILE AUTO-CREATION
-- When a new auth.users record is created, auto-create profile
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'owner')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates user_profile when auth.users record is created';
