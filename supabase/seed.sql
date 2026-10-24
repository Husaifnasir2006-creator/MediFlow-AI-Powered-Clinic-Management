-- MediFlow Seed Data for UK Multi-Tenant Clinic Management

-- 1. SUBSCRIPTION PLANS
INSERT INTO subscription_plans (id, code, name, description, price_monthly_gbp, price_annual_gbp, max_doctors, max_monthly_appointments, features)
VALUES
('a0000000-0000-0000-0000-000000000001', 'starter', 'Practice Starter', 'Ideal for boutique private practices and solo practitioners', 149.00, 1490.00, 3, 300, '["online_booking", "patient_portal", "basic_analytics", "email_notifications"]'::jsonb),
('a0000000-0000-0000-0000-000000000002', 'professional', 'Professional Clinic', 'Full operational suite for expanding UK medical centres with AI features', 299.00, 2990.00, 10, 1500, '["online_booking", "patient_portal", "advanced_analytics", "sms_voice_notifications", "webrtc_telemedicine", "ai_no_show_prediction", "intake_forms_encryption"]'::jsonb),
('a0000000-0000-0000-0000-000000000003', 'enterprise', 'Enterprise Health Network', 'Multi-location healthcare trusts with custom rotas & dedicated compliance', 599.00, 5990.00, 50, 10000, '["online_booking", "patient_portal", "enterprise_analytics", "google_calendar_two_way", "webrtc_telemedicine", "custom_cqc_audit_exports", "dedicated_account_manager"]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 2. CLINICS
INSERT INTO clinics (id, name, slug, registration_number, cqc_rating, phone, email, address_line1, city, postal_code, country, time_zone, currency, settings)
VALUES
('c1000000-0000-0000-0000-000000000001', 'St. Jude Healthcare Centre', 'st-jude-london', 'UK-CQC-89241', 'Outstanding', '+44 20 7946 0912', 'info@stjudehealth.co.uk', '42 Marylebone High Street', 'London', 'W1U 5HD', 'GB', 'Europe/London', 'GBP', '{"notifications": {"sms_enabled": true, "email_enabled": true, "reminder_hours_before": [24, 2]}, "booking": {"allow_guest": false, "min_notice_hours": 2}}'::jsonb),
('c1000000-0000-0000-0000-000000000002', 'Harley Street Wellness Clinic', 'harley-street-wellness', 'UK-CQC-93104', 'Good', '+44 20 7946 0888', 'contact@harleywellness.co.uk', '10 Harley Street', 'London', 'W1G 9PF', 'GB', 'Europe/London', 'GBP', '{"notifications": {"sms_enabled": true, "email_enabled": true, "reminder_hours_before": [48, 4]}}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 3. USER PROFILES
INSERT INTO user_profiles (id, email, first_name, last_name, phone, date_of_birth, nhs_number, is_platform_admin)
VALUES
('u0000000-0000-0000-0000-000000000001', 'superadmin@mediflow.uk', 'Victoria', 'Sterling', '+44 7700 900111', '1985-04-12', NULL, true),
('u0000000-0000-0000-0000-000000000002', 'owner@stjudehealth.co.uk', 'Oliver', 'Sterling', '+44 7700 900222', '1976-08-20', '829 104 9182', false),
('u0000000-0000-0000-0000-000000000003', 'admin@stjudehealth.co.uk', 'Sarah', 'Jenkins', '+44 7700 900333', '1988-11-05', '719 384 1029', false),
('u0000000-0000-0000-0000-000000000004', 'doctor@stjudehealth.co.uk', 'Alistair', 'Finch', '+44 7700 900444', '1980-02-14', '629 184 7291', false),
('u0000000-0000-0000-0000-000000000005', 'dr.vance@stjudehealth.co.uk', 'Eleanor', 'Vance', '+44 7700 900555', '1984-09-30', '519 283 8192', false),
('u0000000-0000-0000-0000-000000000006', 'reception@stjudehealth.co.uk', 'Marcus', 'Cooper', '+44 7700 900666', '1995-01-18', '910 284 7192', false),
('u0000000-0000-0000-0000-000000000007', 'patient.smith@example.co.uk', 'James', 'Smith', '+44 7700 900777', '1979-06-25', '485 920 1823', false),
('u0000000-0000-0000-0000-000000000008', 'patient.wong@example.co.uk', 'Emily', 'Wong', '+44 7700 900888', '1992-03-10', '928 174 5821', false),
('u0000000-0000-0000-0000-000000000009', 'patient.patel@example.co.uk', 'Raj', 'Patel', '+44 7700 900999', '1968-12-04', '382 910 4729', false)
ON CONFLICT (id) DO NOTHING;

-- 4. CLINIC MEMBERSHIPS
INSERT INTO clinic_memberships (clinic_id, user_id, role, department)
VALUES
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'clinic_owner', 'Executive Medical Office'),
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'administrator', 'Operations & CQC Compliance'),
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000004', 'doctor', 'General Practice & Cardiology'),
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'doctor', 'Dermatology & Internal Medicine'),
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000006', 'receptionist', 'Patient Front Desk')
ON CONFLICT (clinic_id, user_id) DO NOTHING;

-- 5. DOCTORS
INSERT INTO doctors (id, clinic_id, user_id, gmc_number, specialty, qualifications, bio, consultation_fee_gbp, appointment_duration_mins)
VALUES
('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000004', '7482910', 'General Practice & Cardiology', 'MBBS, MRCGP, FRCP (London)', 'Senior Consultant General Physician with 16 years NHS & private practice experience.', 95.00, 30),
('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', '6938201', 'Dermatology & Minor Surgery', 'MBChB, MRCP (Derm), DCH', 'Specialist in clinical dermatology, skin screening, and preventive health.', 120.00, 30)
ON CONFLICT (id) DO NOTHING;

-- 6. DOCTOR AVAILABILITY (Monday-Friday)
INSERT INTO doctor_availability (clinic_id, doctor_id, day_of_week, start_time, end_time, break_start, break_end)
VALUES
('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 1, '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 2, '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 3, '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4, '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 5, '09:00:00', '16:00:00', '12:30:00', '13:30:00'),
('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 1, '10:00:00', '18:00:00', '13:00:00', '14:00:00'),
('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 3, '10:00:00', '18:00:00', '13:00:00', '14:00:00'),
('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 4, '10:00:00', '18:00:00', '13:00:00', '14:00:00')
ON CONFLICT DO NOTHING;

-- 7. PATIENTS
INSERT INTO patients (id, clinic_id, user_id, first_name, last_name, email, phone, nhs_number, date_of_birth, gender, address_line1, city, postal_code, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, medical_allergies)
VALUES
('p1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000007', 'James', 'Smith', 'patient.smith@example.co.uk', '+44 7700 900777', '485 920 1823', '1979-06-25', 'Male', '14 Baker Street', 'London', 'NW1 6XE', 'Clara Smith', '+44 7700 900701', 'Spouse', 'Penicillin (mild rash)'),
('p1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000008', 'Emily', 'Wong', 'patient.wong@example.co.uk', '+44 7700 900888', '928 174 5821', '1992-03-10', 'Female', '8 Kensington High St', 'London', 'W8 4PT', 'David Wong', '+44 7700 900802', 'Father', 'None known'),
('p1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000009', 'Raj', 'Patel', 'patient.patel@example.co.uk', '+44 7700 900999', '382 910 4729', '1968-12-04', 'Male', '22 Fitzrovia Way', 'London', 'W1T 4BP', 'Priya Patel', '+44 7700 900903', 'Spouse', 'Aspirin, NSAIDs (bronchospasm)')
ON CONFLICT (id) DO NOTHING;

-- 8. APPOINTMENT SERVICES
INSERT INTO appointment_services (id, clinic_id, name, code, description, duration_mins, price_gbp, is_telemedicine_eligible)
VALUES
('s1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Comprehensive GP Consultation', 'GP-CONS', 'In-depth general medical examination and clinical advice', 30, 95.00, true),
('s1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'HD Video Telemedicine Consult', 'TELE-GP', 'Encrypted WebRTC consultation from home or workplace', 20, 75.00, true),
('s1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Dermatology Assessment & Dermoscopy', 'DERM-SCR', 'Skin lesion analysis and diagnostic review', 30, 130.00, true),
('s1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'Executive Cardiovascular Check', 'CARDIO-EX', 'Full ECG review, lipid risk analysis, and blood pressure profile', 45, 175.00, false)
ON CONFLICT (id) DO NOTHING;

-- 9. APPOINTMENTS
INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, service_id, start_time, end_time, status, consultation_type, reason_for_visit, no_show_risk_score, no_show_risk_level, no_show_factors)
VALUES
('b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000002', now() + interval '1 hour', now() + interval '1 hour 20 mins', 'confirmed', 'video', 'Follow-up on hypertension medication adjustment and blood pressure log', 0.110, 'low', '["Intake form completed", "Confirmed via SMS", "0 prior no-shows"]'::jsonb),
('b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 's1000000-0000-0000-0000-000000000003', now() + interval '3 hours', now() + interval '3 hours 30 mins', 'scheduled', 'in_person', 'Evaluation of changing pigmented lesion on left forearm', 0.280, 'medium', '["Lead time > 5 days", "Unconfirmed reminder"]'::jsonb),
('b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 30 mins', 'confirmed', 'in_person', 'Routine type-2 diabetes review and HbA1c screening', 0.090, 'low', '["Long standing patient", "Intake verified"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 10. CONSULTATION SESSIONS (WebRTC)
INSERT INTO consultation_sessions (id, clinic_id, appointment_id, doctor_id, patient_id, room_sid, status)
VALUES
('r1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 'mediflow-room-b1000000-0000-0000-0000-000000000001', 'waiting')
ON CONFLICT (appointment_id) DO NOTHING;

-- 11. INTAKE FORMS
INSERT INTO intake_forms (id, clinic_id, title, description, fields)
VALUES
('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Pre-Consultation Clinical Intake Form', 'Standard general clinical assessment required before appointment confirmation under UK healthcare standards.', '[{"id":"allergies","label":"Known Allergies or Adverse Reactions","type":"textarea","required":true},{"id":"current_medications","label":"Current Prescribed or Over-the-counter Medications","type":"textarea","required":true},{"id":"smoking_status","label":"Smoking / Tobacco Usage","type":"select","options":["Never","Ex-smoker","Active smoker"],"required":true},{"id":"consent_telehealth","label":"I consent to encrypted video/clinical assessment and understand emergency limitations","type":"checkbox","required":true}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 12. PRESCRIPTION REFILL REQUESTS
INSERT INTO prescription_requests (id, clinic_id, patient_id, medication_name, dosage, frequency, quantity, preferred_pharmacy, patient_reason, status, safety_check_passed)
VALUES
('q1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 'Ramipril Tablets', '5mg', 'Once daily in the morning', '56 tablets (2 months)', 'Boots Pharmacy - 12 Marylebone High St', 'Refill needed for maintenance blood pressure control. Last BP reading was 124/82.', 'pending', true),
('q1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000003', 'Metformin Hydrochloride', '500mg', 'Twice daily with meals', '112 tablets', 'Lloyds Pharmacy - Fitzrovia', 'Routine diabetic medication continuation. Blood glucose stable.', 'under_review', true)
ON CONFLICT (id) DO NOTHING;

-- 13. STAFF ROTAS
INSERT INTO staff_shifts (clinic_id, user_id, role, shift_date, start_time, end_time, department, status)
VALUES
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000004', 'doctor', CURRENT_DATE, '08:30:00', '17:00:00', 'Cardiology & Outpatient', 'scheduled'),
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'doctor', CURRENT_DATE, '09:30:00', '18:00:00', 'Dermatology & Minor Procedures', 'scheduled'),
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000006', 'receptionist', CURRENT_DATE, '08:00:00', '16:30:00', 'Front Reception', 'scheduled'),
('c1000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'administrator', CURRENT_DATE, '08:30:00', '17:00:00', 'Practice Operations', 'scheduled')
ON CONFLICT DO NOTHING;

-- 14. CLINIC SUBSCRIPTIONS
INSERT INTO clinic_subscriptions (id, clinic_id, plan_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end)
VALUES
('m1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'cus_stjude_mock123', 'sub_stjude_mock456', 'active', now() - interval '10 days', now() + interval '20 days')
ON CONFLICT (clinic_id) DO NOTHING;
