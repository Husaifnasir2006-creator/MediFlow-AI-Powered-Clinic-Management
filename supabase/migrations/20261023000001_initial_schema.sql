-- MediFlow PostgreSQL Schema for Supabase
-- Multi-Tenant Clinic Management Platform with Row Level Security (RLS)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('platform_owner', 'clinic_owner', 'administrator', 'doctor', 'receptionist', 'patient');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE prescription_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'voice', 'push');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. SUBSCRIPTION PLANS (Global)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly_gbp NUMERIC(10,2) NOT NULL,
    price_annual_gbp NUMERIC(10,2) NOT NULL,
    max_doctors INT NOT NULL,
    max_monthly_appointments INT NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CLINICS (Tenants)
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    registration_number VARCHAR(100),
    cqc_rating VARCHAR(50) DEFAULT 'Good', -- UK Care Quality Commission
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'GB',
    time_zone VARCHAR(50) NOT NULL DEFAULT 'Europe/London',
    currency VARCHAR(10) NOT NULL DEFAULT 'GBP',
    logo_url TEXT,
    website_url TEXT,
    settings JSONB NOT NULL DEFAULT '{"notifications": {"sms_enabled": true, "email_enabled": true, "reminder_hours_before": [24, 2]}}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. USER PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY, -- Maps to auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    date_of_birth DATE,
    nhs_number VARCHAR(20), -- UK NHS identifier
    preferred_communication notification_channel DEFAULT 'email',
    is_platform_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. CLINIC MEMBERSHIPS (Multi-tenant Role Association)
CREATE TABLE IF NOT EXISTS clinic_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(clinic_id, user_id)
);

-- 7. DOCTORS
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    gmc_number VARCHAR(20) NOT NULL, -- UK General Medical Council number
    specialty VARCHAR(100) NOT NULL,
    qualifications VARCHAR(255),
    bio TEXT,
    consultation_fee_gbp NUMERIC(10,2) NOT NULL DEFAULT 95.00,
    appointment_duration_mins INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(clinic_id, user_id)
);

-- 8. DOCTOR AVAILABILITY
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. PATIENTS (Clinic tenant scoped)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    nhs_number VARCHAR(20),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(50),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(50),
    medical_allergies TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. APPOINTMENT SERVICES
CREATE TABLE IF NOT EXISTS appointment_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    duration_mins INT NOT NULL DEFAULT 30,
    price_gbp NUMERIC(10,2) NOT NULL DEFAULT 80.00,
    is_telemedicine_eligible BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    service_id UUID REFERENCES appointment_services(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'scheduled',
    consultation_type VARCHAR(20) NOT NULL DEFAULT 'in_person' CHECK (consultation_type IN ('in_person', 'video', 'phone')),
    reason_for_visit TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    -- No-Show Prediction
    no_show_risk_score NUMERIC(4,3) DEFAULT 0.120, -- probability 0.000 to 1.000
    no_show_risk_level risk_level DEFAULT 'low',
    no_show_factors JSONB DEFAULT '[]'::jsonb,
    -- Google Calendar integration
    google_event_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. DIGITAL INTAKE FORMS (Templates)
CREATE TABLE IF NOT EXISTS intake_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. INTAKE RESPONSES (Completed or Draft by patient)
CREATE TABLE IF NOT EXISTS intake_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES intake_forms(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed')),
    demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
    medical_history JSONB NOT NULL DEFAULT '{}'::jsonb,
    allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_medications JSONB NOT NULL DEFAULT '[]'::jsonb,
    emergency_contact JSONB NOT NULL DEFAULT '{}'::jsonb,
    consents JSONB NOT NULL DEFAULT '{"gdpr_consent": true, "treatment_consent": true}'::jsonb,
    encrypted_payload TEXT, -- AES-256 envelope-encrypted clinical payload
    encryption_key_id VARCHAR(100),
    reviewed_by UUID REFERENCES doctors(id),
    reviewed_at TIMESTAMPTZ,
    doctor_review_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. MEDICAL RECORDS
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    record_type VARCHAR(50) NOT NULL DEFAULT 'consultation_summary',
    diagnosis TEXT,
    summary TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. CLINICAL NOTES (SOAP format: Subjective, Objective, Assessment, Plan)
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    differential_diagnosis TEXT,
    is_signed BOOLEAN NOT NULL DEFAULT false,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. PRESCRIPTION REQUESTS & PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS prescription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    preferred_pharmacy VARCHAR(255),
    patient_reason TEXT,
    status prescription_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES doctors(id),
    reviewed_at TIMESTAMPTZ,
    doctor_notes TEXT,
    safety_check_passed BOOLEAN DEFAULT true,
    safety_flags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    request_id UUID REFERENCES prescription_requests(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    instructions TEXT,
    refills_remaining INT NOT NULL DEFAULT 0,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '6 months'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. CONSULTATION SESSIONS & EVENTS (WebRTC Telemedicine)
CREATE TABLE IF NOT EXISTS consultation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    room_sid VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'disconnected', 'abandoned')),
    doctor_joined_at TIMESTAMPTZ,
    patient_joined_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES consultation_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- participant_joined, participant_left, media_muted, media_unmuted, connection_quality_changed
    user_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(50),
    recipient_email VARCHAR(255),
    channel notification_channel NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed', 'mocked')),
    external_provider_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. STAFF SHIFTS & ROTAS
CREATE TABLE IF NOT EXISTS staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    department VARCHAR(100) DEFAULT 'General Outpatient',
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'sick_leave', 'annual_leave')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. PATIENT FEEDBACK
CREATE TABLE IF NOT EXISTS patient_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    would_recommend BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. AUDIT LOGS (Compliance & Security)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL, -- record_accessed, intake_submitted, prescription_approved, etc.
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. CLINIC SUBSCRIPTIONS & BILLING EVENTS (Stripe)
CREATE TABLE IF NOT EXISTS clinic_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID UNIQUE NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    stripe_event_id VARCHAR(100) UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    amount_paid_gbp NUMERIC(10,2),
    currency VARCHAR(10) DEFAULT 'GBP',
    status VARCHAR(50) NOT NULL,
    invoice_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. CALENDAR CONNECTIONS (Google Calendar OAuth)
CREATE TABLE IF NOT EXISTS calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID UNIQUE NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'google',
    calendar_id VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    sync_enabled BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 24. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_memberships_user ON clinic_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_clinic ON clinic_memberships(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic ON prescription_requests(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_clinic ON audit_logs(clinic_id, created_at);

-- 25. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's clinic IDs
CREATE OR REPLACE FUNCTION get_user_clinic_ids()
RETURNS TABLE (clinic_id UUID) SECURITY DEFINER STABLE
LANGUAGE SQL AS $$
  SELECT clinic_id FROM clinic_memberships WHERE user_id = auth.uid() AND is_active = true;
$$;

-- Helper function to check if current user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN SECURITY DEFINER STABLE
LANGUAGE SQL AS $$
  SELECT COALESCE((SELECT is_platform_admin FROM user_profiles WHERE id = auth.uid()), false);
$$;

-- RLS: clinics
CREATE POLICY "Platform admins can view all clinics" ON clinics
  FOR ALL USING (is_platform_admin());

CREATE POLICY "Users can view clinics they belong to" ON clinics
  FOR SELECT USING (id IN (SELECT get_user_clinic_ids()));

CREATE POLICY "Public can view active clinics by slug" ON clinics
  FOR SELECT USING (is_active = true);

-- RLS: appointments
CREATE POLICY "Clinic members can view clinic appointments" ON appointments
  FOR SELECT USING (clinic_id IN (SELECT get_user_clinic_ids()) OR is_platform_admin());

CREATE POLICY "Clinic staff can manage appointments" ON appointments
  FOR ALL USING (clinic_id IN (SELECT get_user_clinic_ids()));

CREATE POLICY "Patients can view their own appointments" ON appointments
  FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- RLS: patients
CREATE POLICY "Clinic staff can view patients in their clinic" ON patients
  FOR ALL USING (clinic_id IN (SELECT get_user_clinic_ids()) OR is_platform_admin());

CREATE POLICY "Patients can view only their own profile" ON patients
  FOR SELECT USING (user_id = auth.uid());

-- RLS: medical records & clinical notes
CREATE POLICY "Doctor and admin can view medical records" ON medical_records
  FOR SELECT USING (clinic_id IN (SELECT get_user_clinic_ids()));

CREATE POLICY "Doctors can manage clinical notes" ON clinical_notes
  FOR ALL USING (clinic_id IN (SELECT get_user_clinic_ids()));

-- RLS: prescription requests
CREATE POLICY "Clinic staff can view and manage prescriptions" ON prescription_requests
  FOR ALL USING (clinic_id IN (SELECT get_user_clinic_ids()) OR is_platform_admin());

CREATE POLICY "Patients can view and create their own prescription requests" ON prescription_requests
  FOR ALL USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- RLS: consultation sessions
CREATE POLICY "Participants can view consultation session" ON consultation_sessions
  FOR SELECT USING (
    clinic_id IN (SELECT get_user_clinic_ids()) 
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR is_platform_admin()
  );
