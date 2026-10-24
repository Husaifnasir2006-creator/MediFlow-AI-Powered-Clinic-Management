# MediFlow Architecture Documentation

## 1. System Overview

**MediFlow** is a multi-tenant healthcare software-as-a-service (SaaS) platform built specifically to streamline clinical operations, doctor schedules, WebRTC consultations, digital intake forms, and automated repeat prescription management for UK private and NHS primary care clinics.

```
                              ┌────────────────────────────────────────┐
                              │          React Vite Frontend           │
                              │  (TanStack Query, Tailwind, Recharts)  │
                              └──────────────────┬─────────────────────┘
                                                 │ HTTPS & WSS
                                                 ▼
                              ┌────────────────────────────────────────┐
                              │       Express.js TypeScript API        │
                              │     + WebRTC Signaling (WebSocket)     │
                              └───────┬────────────┬─────────────┬─────┘
                                      │            │             │
                    ┌─────────────────▼──┐   ┌─────▼───────┐   ┌─▼──────────────────┐
                    │  No-Show AI Model  │   │ Envelope    │   │  Adapters (Twilio, │
                    │ (Statistical Risk) │   │ Encryption  │   │  Google Cal, Stripe│
                    └────────────────────┘   │ (AES-256)   │   └────────────────────┘
                                             └─────────────┘
                                                    │
                                     ┌──────────────▼─────────────┐
                                     │   Supabase PostgreSQL      │
                                     │ (Multi-Tenant RLS Policies)│
                                     └────────────────────────────┘
```

---

## 2. Multi-Tenant Relational Database Schema

The database is partitioned into 24 core relational entities:

1. `subscription_plans`: Global SaaS tiers (Starter, Professional, Enterprise).
2. `clinics`: Distinct clinic tenants with CQC rating, slug, and operational settings.
3. `user_profiles`: Central identity mapped to `auth.users` with UK NHS number.
4. `clinic_memberships`: Role-based clinic association (`clinic_owner`, `administrator`, `doctor`, `receptionist`, `patient`).
5. `doctors`: GMC registration, specialties, and fee schedules.
6. `doctor_availability`: Weekly consultation blocks and break schedules.
7. `patients`: Scoped patient records with emergency contacts and allergy history.
8. `appointment_services`: Billable clinic services with duration and telemedicine eligibility.
9. `appointments`: Clinic appointments with automated conflict avoidance and AI no-show scores.
10. `intake_forms`: Configurable pre-consultation medical questionnaire templates.
11. `intake_responses`: Completed patient forms with AES-256 envelope encryption.
12. `medical_records`: Historical clinical diagnoses and summaries.
13. `clinical_notes`: Structured SOAP records (Subjective, Objective, Assessment, Plan).
14. `prescription_requests`: Patient repeat refill requests with automated cross-allergy checks.
15. `prescriptions`: Legally authorized clinician-issued prescriptions.
16. `consultation_sessions`: Encrypted WebRTC rooms with session timestamps.
17. `consultation_events`: Media mutation and telemetry logs.
18. `notifications`: Multi-channel communication records (Twilio SMS/voice/email).
19. `staff_shifts`: Staff rota management and attendance tracking.
20. `patient_feedback`: Calibrated 1-5 star ratings and reviews.
21. `audit_logs`: Immutable clinical audit trail for DPA 2018 / CQC inspections.
22. `clinic_subscriptions`: Stripe customer and subscription lifecycle tracking.
23. `billing_events`: Stripe webhook event ledger.
24. `calendar_connections`: Google Calendar OAuth sync tokens and sync status.

---

## 3. Row-Level Security (RLS) Policy Design

Tenant isolation is enforced strictly at the database layer using Supabase PostgreSQL RLS:

- **Clinic Isolation**: Clinic members can only read and mutate rows where `clinic_id IN (SELECT clinic_id FROM clinic_memberships WHERE user_id = auth.uid())`.
- **Patient Privacy**: Patients can only inspect their own profile, appointments, intake responses, and prescription requests (`patient.user_id = auth.uid()`).
- **Platform Console**: Only verified platform admins (`is_platform_admin = true`) can access platform-wide billing and tenant registration tables.

---

## 4. Transparent AI No-Show Scoring Algorithm

To avoid black-box discrimination or automatic healthcare denials, the No-Show Prediction engine uses a transparent, calibrated logistic scoring model evaluated against 7 historical features:

$$\text{Logit}(P) = \beta_0 + \beta_1(\text{LeadTime}) + \beta_2(\text{PriorNoShows}) - \beta_3(\text{IntakeCompleted}) - \beta_4(\text{ConfirmedSMS}) - \beta_5(\text{Telehealth}) + \beta_6(\text{DayOfWeek})$$

- **Probability < 22%**: `Low Risk` — Standard automated confirmation.
- **Probability 22% - 39%**: `Medium Risk` — Priority SMS prompt 24h prior.
- **Probability ≥ 40%**: `High Risk` — Recommended telephone reception check-in.
- **Clinical Safeguard**: Predictive scores are purely informational aids; appointments are never denied or delayed based on scores.

---

## 5. WebRTC Telemedicine Signaling Protocol

Doctor-patient consultations use peer-to-peer WebRTC connections secured via DTLS-SRTP:

1. **Room Allocation**: On appointment creation with `consultation_type = 'video'`, a unique `room_sid` is generated.
2. **Signaling Exchange**: WebSocket server at `/ws/signaling` facilitates `offer`, `answer`, and `ice-candidate` handshakes.
3. **Clinical Integration**: Attendee doctors have an integrated SOAP note pad directly adjacent to the video feed for real-time note taking.
