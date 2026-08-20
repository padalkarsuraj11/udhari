# Udhari Platform - Security Testing Guide

This document outlines the security tests that must be performed to verify tenant isolation and access control.

## Prerequisites

1. Database migrations applied
2. Backend running on `localhost:4000`
3. Admin frontend running on `localhost:5173`
4. Client frontend running on `localhost:5174`
5. At least one platform admin user created
6. At least two owner accounts created

## Test Suite

### TEST 1: Admin Login Success

**Steps:**
1. Navigate to `http://localhost:5173/login`
2. Enter admin email and password
3. Click "Sign In"

**Expected Result:**
- Login succeeds
- Redirected to `/dashboard`
- Admin dashboard displays platform statistics
- Can navigate to Owners list

**Pass Criteria:**
- ✅ No errors during login
- ✅ Admin dashboard loads
- ✅ Can see all owners in the list

---

### TEST 2: Owner Login Success

**Steps:**
1. Navigate to `http://localhost:5174/login`
2. Enter owner login identifier and password
3. Click "Sign In"

**Expected Result:**
- Login succeeds
- Redirected to `/dashboard`
- Owner dashboard displays business metrics
- Can navigate to contractors, customers

**Pass Criteria:**
- ✅ No errors during login
- ✅ Owner dashboard loads
- ✅ Business name displayed correctly

---

### TEST 3: Tenant Isolation (Owner A vs Owner B)

**Setup:**
- Create Owner A (e.g., login_identifier: PATEL001)
- Create Owner B (e.g., login_identifier: MEHTA002)
- Create contractors for both owners in database

**Steps:**
1. Login as Owner A
2. Open browser DevTools → Network tab
3. Navigate to Contractors page
4. Observe API request: `GET /api/contractors`
5. Note the contractors returned (should be Owner A's only)
6. Copy Owner A's access token from request headers
7. Logout from Owner A
8. Login as Owner B
9. Navigate to Contractors page
10. Note the contractors returned (should be Owner B's only)

**Expected Result:**
- Owner A sees only their contractors
- Owner B sees only their contractors
- No overlap in data

**Pass Criteria:**
- ✅ Owner A cannot see Owner B's contractors
- ✅ Owner B cannot see Owner A's contractors

---

### TEST 4: Direct API Access Attempt (Bypass Frontend)

**Setup:**
- Login as Owner A
- Copy access token from DevTools → Network → any API request header

**Steps:**
1. Open REST client (Postman, Insomnia, or curl)
2. Make request to get Owner B's contractors:
   ```
   GET http://localhost:4000/api/contractors
   Authorization: Bearer <owner-a-access-token>
   ```
3. Observe response

**Expected Result:**
- Response contains only Owner A's contractors
- RLS policy filters by authenticated user's tenant_id
- Cannot see Owner B's data even with direct API access

**Pass Criteria:**
- ✅ Only Owner A's data returned
- ✅ No way to access Owner B's data

---

### TEST 5: Owner Attempts to Access Admin Routes

**Setup:**
- Login as Owner (not admin)
- Copy access token

**Steps:**
1. Navigate to `http://localhost:5174/admin/dashboard` (if route exists)
2. OR make direct API call:
   ```
   GET http://localhost:4000/api/admin/dashboard
   Authorization: Bearer <owner-access-token>
   ```

**Expected Result:**
- Frontend: Redirect to login or 403 page
- API: 403 Forbidden error

**Pass Criteria:**
- ✅ Access denied at frontend
- ✅ API returns 403 Forbidden

---

### TEST 6: Inactive Owner Login Blocked

**Steps:**
1. Admin logs in
2. Admin navigates to Owners list
3. Admin deactivates Owner A
4. Logout from admin
5. Attempt to login as Owner A (client frontend)

**Expected Result:**
- Login fails with message: "Your account has been deactivated"
- Cannot access dashboard

**Pass Criteria:**
- ✅ Login blocked
- ✅ Clear error message shown

---

### TEST 7: Inactive Owner Cannot Access Data

**Setup:**
- Owner A is already logged in (before deactivation)
- Admin deactivates Owner A in separate session

**Steps:**
1. In Owner A's session, try to navigate to any page
2. Try to make API request to fetch contractors

**Expected Result:**
- API requests return 403 or empty data
- RLS policy blocks access for inactive tenants

**Pass Criteria:**
- ✅ Access blocked after deactivation
- ✅ Error message indicates account is inactive

---

### TEST 8: Unauthenticated Access Blocked

**Steps:**
1. Open browser in incognito mode
2. Navigate to `http://localhost:5173/dashboard` (admin)
3. Navigate to `http://localhost:5174/dashboard` (owner)
4. Make direct API call without Authorization header:
   ```
   GET http://localhost:4000/api/contractors
   ```

**Expected Result:**
- Frontend: Redirect to `/login`
- API: 401 Unauthorized

**Pass Criteria:**
- ✅ Frontend redirects to login
- ✅ API returns 401

---

### TEST 9: Admin Can View All Tenants

**Steps:**
1. Login as platform admin
2. Navigate to Owners list
3. Verify all owners are visible
4. Check database: `SELECT * FROM tenants;`
5. Compare with UI list

**Expected Result:**
- All tenants visible in admin UI
- Admin can view details of any owner
- Admin can activate/deactivate any owner

**Pass Criteria:**
- ✅ All owners displayed
- ✅ Admin can manage all accounts

---

### TEST 10: Create Owner Flow

**Steps:**
1. Login as admin
2. Click "Add Owner" button
3. Fill in business information:
   - Business Name: "Test Supplies"
   - Business Type: "Electrical"
   - Owner Name: "Test User"
   - Email: "test@example.com"
   - Login Identifier: "TEST001"
   - Password: "testpass123"
4. Click "Create Owner"

**Expected Result:**
- Owner created successfully
- Appears in owners list
- Audit log entry created
- Can login with TEST001 credentials

**Pass Criteria:**
- ✅ Owner created without errors
- ✅ Visible in owners list
- ✅ Can login immediately

---

### TEST 11: Duplicate Email Blocked

**Steps:**
1. Admin creates Owner A with email "owner@example.com"
2. Admin attempts to create Owner B with same email

**Expected Result:**
- Second create attempt fails
- Error message: "Email already exists"

**Pass Criteria:**
- ✅ Duplicate email rejected
- ✅ Clear error message

---

### TEST 12: Duplicate Login Identifier Blocked

**Steps:**
1. Admin creates Owner A with login_identifier "OWNER001"
2. Admin attempts to create Owner B with same login_identifier

**Expected Result:**
- Second create attempt fails
- Error message: "Login identifier already exists"

**Pass Criteria:**
- ✅ Duplicate identifier rejected
- ✅ Clear error message

---

### TEST 13: Admin Audit Trail

**Steps:**
1. Login as admin
2. Create new owner
3. Deactivate the owner
4. Reactivate the owner
5. Check audit_logs table:
   ```sql
   SELECT * FROM audit_logs
   WHERE action LIKE '%owner%'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

**Expected Result:**
- All actions logged:
  - admin_created_owner
  - admin_deactivated_owner
  - admin_activated_owner
- Each log has correct user_id, tenant_id, metadata

**Pass Criteria:**
- ✅ All admin actions logged
- ✅ Metadata includes relevant details

---

### TEST 14: User Login Audit

**Steps:**
1. Login as Owner A
2. Logout
3. Check audit_logs table:
   ```sql
   SELECT * FROM audit_logs
   WHERE action IN ('user_login', 'user_logout')
   AND user_id = '<owner-a-user-id>'
   ORDER BY created_at DESC;
   ```

**Expected Result:**
- Login and logout events recorded
- Correct tenant_id associated

**Pass Criteria:**
- ✅ Login event logged
- ✅ Logout event logged

---

### TEST 15: RLS Policy Direct Database Test

**Steps:**
1. Get Owner A's user ID from auth.users
2. Set session to simulate Owner A:
   ```sql
   -- In Supabase SQL Editor (or psql)
   SELECT auth.uid(); -- Should return NULL

   -- Simulate Owner A session (this won't work in SQL editor, use backend test)
   ```
3. Query contractors table:
   ```sql
   SELECT * FROM contractors;
   ```

**Expected Result (when session is set):**
- Only Owner A's contractors returned
- RLS policy filters automatically

**Pass Criteria:**
- ✅ RLS policies active on all tenant tables
- ✅ Users see only their data

---

## Test Results Checklist

Mark each test as PASS or FAIL:

- [ ] TEST 1: Admin Login Success
- [ ] TEST 2: Owner Login Success
- [ ] TEST 3: Tenant Isolation
- [ ] TEST 4: Direct API Access Attempt
- [ ] TEST 5: Owner Attempts Admin Routes
- [ ] TEST 6: Inactive Owner Login Blocked
- [ ] TEST 7: Inactive Owner Cannot Access Data
- [ ] TEST 8: Unauthenticated Access Blocked
- [ ] TEST 9: Admin Can View All Tenants
- [ ] TEST 10: Create Owner Flow
- [ ] TEST 11: Duplicate Email Blocked
- [ ] TEST 12: Duplicate Login Identifier Blocked
- [ ] TEST 13: Admin Audit Trail
- [ ] TEST 14: User Login Audit
- [ ] TEST 15: RLS Policy Direct Database Test

## Critical Tests

These tests MUST pass before Phase 2 is considered complete:

1. TEST 3: Tenant Isolation
2. TEST 4: Direct API Access Attempt
3. TEST 6: Inactive Owner Login Blocked
4. TEST 8: Unauthenticated Access Blocked

## Reporting

After running all tests, create a summary:

```
Phase 2 Security Testing Results
Date: [DATE]
Tester: [NAME]

Total Tests: 15
Passed: [X]
Failed: [Y]

Critical Tests Status: [ALL PASS / FAILURES PRESENT]

Failed Tests:
- TEST X: [Description] - [Reason for failure]

Notes:
[Any additional observations]
```

---

**IMPORTANT:** Do NOT consider Phase 2 complete until all critical tests pass. Tenant isolation is the foundation of the platform's security model.
