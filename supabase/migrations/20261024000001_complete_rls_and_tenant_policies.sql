-- ==============================================================================
-- MediFlow — Migration 20261024000001: Complete RLS & Multi-Tenant Policies
-- Fixes missing RLS policies across all 24 entities and ensures strict tenant isolation
-- Includes DROP POLICY IF EXISTS guards for safe idempotent execution
-- ==============================================================================

-- 1. Helper function: Get user role in a given clinic
CREATE OR REPLACE FUNCTION get_user_role_in_clinic(p_clinic_id UUID)
RETURNS user_role SECURITY DEFINER STABLE
LANGUAGE SQL AS $$
  SELECT role FROM clinic_memberships
  WHERE user_id = auth.uid() AND clinic_id = p_clinic_id AND is_active = true
  LIMIT 1;
$$;

-- Helper function: Get all colleague user IDs sharing active clinics with current user
-- Uses SECURITY DEFINER to avoid recursive RLS subqueries during policy evaluation
CREATE OR REPLACE FUNCTION get_user_colleague_ids()
RETURNS TABLE (user_id UUID) SECURITY DEFINER STABLE
LANGUAGE SQL AS $$
  SELECT DISTINCT cm2.user_id 
  FROM clinic_memberships cm1
  JOIN clinic_memberships cm2 ON cm1.clinic_id = cm2.clinic_id
  WHERE cm1.user_id = auth.uid() 
    AND cm1.is_active = true 
    AND cm2.is_active = true;
$$;

-- 2. User Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile and clinic colleagues" ON user_profiles;
CREATE POLICY "Users can view their own profile and clinic colleagues" ON user_profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR is_platform_admin() 
    OR id IN (SELECT get_user_colleague_ids())
  );

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (
    id = auth.uid() 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid() OR is_platform_admin());

-- 3. Clinic Memberships Policies
DROP POLICY IF EXISTS "Users can view memberships in their clinics" ON clinic_memberships;
CREATE POLICY "Users can view memberships in their clinics" ON clinic_memberships
  FOR SELECT USING (
    user_id = auth.uid() 
    OR clinic_id IN (SELECT get_user_clinic_ids()) 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Clinic owners and admins can manage memberships" ON clinic_memberships;
CREATE POLICY "Clinic owners and admins can manage memberships" ON clinic_memberships
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

-- 4. Clinics Update Policy (Allow clinic owners/admins to update settings)
DROP POLICY IF EXISTS "Clinic owners and admins can update their clinic" ON clinics;
CREATE POLICY "Clinic owners and admins can update their clinic" ON clinics
  FOR UPDATE USING (
    id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

-- 5. Doctors & Doctor Availability Policies
DROP POLICY IF EXISTS "Active doctors viewable by public and clinic members" ON doctors;
CREATE POLICY "Active doctors viewable by public and clinic members" ON doctors
  FOR SELECT USING (
    is_active = true 
    OR clinic_id IN (SELECT get_user_clinic_ids()) 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Clinic admins can manage doctors" ON doctors;
CREATE POLICY "Clinic admins can manage doctors" ON doctors
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Doctor availability viewable by clinic members and booking clients" ON doctor_availability;
CREATE POLICY "Doctor availability viewable by clinic members and booking clients" ON doctor_availability
  FOR SELECT USING (
    is_active = true 
    OR clinic_id IN (SELECT get_user_clinic_ids()) 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Clinic admins and doctors can manage availability" ON doctor_availability;
CREATE POLICY "Clinic admins and doctors can manage availability" ON doctor_availability
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator', 'doctor') AND is_active = true
    )
    OR is_platform_admin()
  );

-- 6. Appointment Services Policies
DROP POLICY IF EXISTS "Appointment services viewable by public and clinic members" ON appointment_services;
CREATE POLICY "Appointment services viewable by public and clinic members" ON appointment_services
  FOR SELECT USING (
    is_active = true 
    OR clinic_id IN (SELECT get_user_clinic_ids()) 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Clinic admins can manage appointment services" ON appointment_services;
CREATE POLICY "Clinic admins can manage appointment services" ON appointment_services
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

-- 7. Digital Intake Forms & Responses Policies
DROP POLICY IF EXISTS "Intake templates viewable by clinic members and patients" ON intake_forms;
CREATE POLICY "Intake templates viewable by clinic members and patients" ON intake_forms
  FOR SELECT USING (
    is_active = true 
    OR clinic_id IN (SELECT get_user_clinic_ids()) 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Clinic admins can manage intake templates" ON intake_forms;
CREATE POLICY "Clinic admins can manage intake templates" ON intake_forms
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Patients and clinic staff can view intake responses" ON intake_responses;
CREATE POLICY "Patients and clinic staff can view intake responses" ON intake_responses
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR clinic_id IN (SELECT get_user_clinic_ids())
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Patients can submit intake responses" ON intake_responses;
CREATE POLICY "Patients can submit intake responses" ON intake_responses
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR clinic_id IN (SELECT get_user_clinic_ids())
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Clinicians can review intake responses" ON intake_responses;
CREATE POLICY "Clinicians can review intake responses" ON intake_responses
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('doctor', 'clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

-- 8. Prescriptions Policies
DROP POLICY IF EXISTS "Patients and clinic staff can view issued prescriptions" ON prescriptions;
CREATE POLICY "Patients and clinic staff can view issued prescriptions" ON prescriptions
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR clinic_id IN (SELECT get_user_clinic_ids())
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Doctors can issue prescriptions" ON prescriptions;
CREATE POLICY "Doctors can issue prescriptions" ON prescriptions
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('doctor', 'clinic_owner') AND is_active = true
    )
    OR is_platform_admin()
  );

-- 9. Staff Shifts Policies
DROP POLICY IF EXISTS "Staff can view shifts in their clinic" ON staff_shifts;
CREATE POLICY "Staff can view shifts in their clinic" ON staff_shifts
  FOR SELECT USING (
    user_id = auth.uid() 
    OR clinic_id IN (SELECT get_user_clinic_ids()) 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Clinic admins can manage staff shifts" ON staff_shifts;
CREATE POLICY "Clinic admins can manage staff shifts" ON staff_shifts
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

-- 10. Audit Logs Policies
DROP POLICY IF EXISTS "Clinic admins and platform owners can view audit logs" ON audit_logs;
CREATE POLICY "Clinic admins and platform owners can view audit logs" ON audit_logs
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "System can record audit logs" ON audit_logs;
CREATE POLICY "System can record audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- 11. Subscriptions & Plans Policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active plans viewable by all" ON subscription_plans;
CREATE POLICY "Active plans viewable by all" ON subscription_plans
  FOR SELECT USING (is_active = true OR is_platform_admin());

DROP POLICY IF EXISTS "Clinic owners can view their subscription" ON clinic_subscriptions;
CREATE POLICY "Clinic owners can view their subscription" ON clinic_subscriptions
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships 
      WHERE user_id = auth.uid() AND role IN ('clinic_owner', 'administrator') AND is_active = true
    )
    OR is_platform_admin()
  );

-- 12. Consultation Events (WebRTC telemetry)
ALTER TABLE consultation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consultation events viewable by session participants" ON consultation_events;
CREATE POLICY "Consultation events viewable by session participants" ON consultation_events
  FOR ALL USING (
    session_id IN (
      SELECT id FROM consultation_sessions 
      WHERE clinic_id IN (SELECT get_user_clinic_ids()) 
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR is_platform_admin()
    )
  );

-- 13. Notifications Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view notifications addressed to them or their clinic" ON notifications;
CREATE POLICY "Users can view notifications addressed to them or their clinic" ON notifications
  FOR SELECT USING (
    recipient_user_id = auth.uid() 
    OR clinic_id IN (SELECT get_user_clinic_ids()) 
    OR is_platform_admin()
  );

-- 14. Table Permissions (Grants) for standard API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON subscription_plans, clinics, appointment_services, doctors, doctor_availability TO anon;

-- 15. Patient Self-Service Booking & Registration Policies
DROP POLICY IF EXISTS "Patients can register their own record" ON patients;
CREATE POLICY "Patients can register their own record" ON patients
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_id IN (SELECT get_user_clinic_ids())
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Patients can create their own appointments" ON appointments;
CREATE POLICY "Patients can create their own appointments" ON appointments
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR clinic_id IN (SELECT get_user_clinic_ids())
    OR is_platform_admin()
  );
