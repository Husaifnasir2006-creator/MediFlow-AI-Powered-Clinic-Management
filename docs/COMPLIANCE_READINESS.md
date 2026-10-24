# MediFlow — Security, Privacy & Compliance Readiness Document

> [!WARNING]
> **Statutory Notice**: MediFlow must never be described or marketed as "GDPR-certified" or "HIPAA-certified". No independent body issues universal software certifications under UK GDPR or HIPAA. Compliance is a shared operational, legal, and organizational responsibility between the SaaS software vendor and the deploying clinic organization. All synthetic data used in development and tests does not represent real patients. Independent validation by accredited legal and clinical professionals is required prior to processing live clinical records.

---

## 1. Compliance Architecture Overview

MediFlow is engineered to support UK clinics in adhering to:
- **UK General Data Protection Regulation (UK GDPR)**
- **Data Protection Act 2018 (DPA 2018)**
- **NHS Caldicott Principles (Eight Principles of Patient Information Handling)**
- **Care Quality Commission (CQC) Digital Record Standards**
- **Health Insurance Portability and Accountability Act (HIPAA)** (Security Rule technical safeguards)

---

## 2. Technical Controls Implementation & Status Matrix

| Regulatory Requirement | Technical Implementation | Status | Verification Method |
| :--- | :--- | :--- | :--- |
| **Multi-Tenant Data Isolation** | PostgreSQL Row-Level Security (RLS) on all 24 clinic tables + Application controller tenant verification (`requireTenant`) | **Implemented** | Automated integration tests (`api.test.ts`) verifying cross-clinic access rejection (403 Forbidden) |
| **Least Privilege Access Control (RBAC)** | Role-Based Access Control across 6 roles (`clinic_owner`, `administrator`, `doctor`, `receptionist`, `patient`, `platform_owner`) | **Implemented** | Integration tests confirming role restrictions (e.g., receptionists cannot approve prescriptions; patients cannot view clinic registries) |
| **Patient Record Authorization** | Strict patient-identity verification preventing patients from inspecting records other than their own | **Implemented** | Automated tests verifying 403 on foreign patient record lookups |
| **Envelope Encryption at Rest** | Node.js `crypto` AES-256-GCM envelope encryption with Data Encryption Keys (DEKs) and key ID references | **Implemented** | Automated unit tests verifying ciphertext, IV, authTag, and DEK ID creation |
| **In-Transit Encryption** | TLS 1.3 for REST APIs; DTLS-SRTP for peer-to-peer WebRTC consultations | **Implemented** | Enforced via HTTP security headers, Helmet, and DTLS transport |
| **WebRTC Signaling Authorization** | WebSocket connection validation requiring valid JWT and clinical room permission checking | **Implemented** | Integration tests for JWT validation and room participant boundaries |
| **Appointment Conflict Avoidance** | Atomic time-overlap detection preventing double-booking for attending clinicians | **Implemented** | Automated tests asserting 409 Conflict on overlapping bookings |
| **API Payload Validation** | Strict Zod schema validation on patient creation, appointments, auth, and prescriptions | **Implemented** | Integration tests verifying 400 Bad Request on invalid payloads (e.g. UK NHS number format, ISO timestamps) |
| **Clinical Decision Safeguards** | Repeat prescription approvals require authorized clinician sign-off with recorded rationale; AI predictions strictly non-diagnostic | **Implemented** | Integration tests verifying clinician review requirements and explainable non-diagnostic no-show risk factors |
| **Safe Error Handling** | Global exception middleware masking internal stack traces, database schemas, and server internals | **Implemented** | Automated tests confirming sanitized error responses on invalid lookups |
| **Public Booking Privacy** | Public booking links (`/book/:clinicSlug`) never expose private patient lists or doctor calendars | **Implemented** | Controller tests verifying isolation of public endpoints |
| **Audit Trails** | Immutable `audit_logs` schema tracking sensitive record access and modifications | **Implemented** | Schema migration + in-memory and database audit logging pipeline |
| **Supabase Integration & RLS Migration** | Complete 24-table migration script (`20261023000001_initial_schema.sql`) + dual client integration (`SupabaseService`) | **Implemented** | Verified SQL schema with RLS policies, helper functions, and index definitions |
| **Authentication & Password Hashing** | Bcrypt (10 rounds) password hashing, login, and registration alongside demo switching | **Implemented** | Automated tests for `/auth/login`, `/auth/register`, and role demo switching |

---

## 3. Four-Tier Compliance Readiness Checklist

### Category 1: Implemented & Automated in Codebase (Verified by Test Suite)
- [x] **Multi-Tenant Isolation**: Controller checks prevent cross-tenant record reads, foreign clinic appointment creation, and cross-clinic settings mutation.
- [x] **Patient Self-Record Scoping**: Patients authenticated under patient accounts can strictly view only their own records.
- [x] **Role-Based Authorization**: Route guards (`requireRole`) enforce clinical duties (e.g., only GMC clinicians may approve prescription requests).
- [x] **Appointment Collision Avoidance**: Calendar conflict prevention blocks overlapping appointments for the same clinician with HTTP 409.
- [x] **Envelope Encryption (AES-256-GCM)**: Sensitive patient intake form payloads are encrypted with dynamic DEKs before storage.
- [x] **Zod Input Validation**: Robust schemas validate NHS number formatting, dates of birth, consultation types, and appointment times.
- [x] **Safe Error Responses**: Unhandled exceptions mask system internals, returning standardized references without stack trace leaks.
- [x] **Secrets Hygiene**: Git excludes `.env` files, `.pem` certificates, and `.key` files; `.env.example` contains placeholders only.
- [x] **WebRTC Signaling Authorization**: WebSocket signaling server validates JWT tokens and ensures participants are authorized for consultation rooms.
- [x] **Full Suite Automation**: 22 automated unit and integration tests passing (`npm test`).

### Category 2: Partially Implemented (Requires Infrastructure / Credentials Configuration)
- [ ] **Dedicated Coturn TURN Server Infrastructure**:
  - *Current State*: WebRTC signaling and STUN servers configured (`stun:stun.l.google.com:19302`). Endpoint `GET /api/telemedicine/ice-servers` reports TURN readiness.
  - *Action Required*: Deploy dedicated, authenticated Coturn server infrastructure and configure `TURN_SERVER_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL` in production `.env` for strict enterprise NHS firewall traversal.
- [ ] **Cloud Hardware Security Module (HSM) KMS Key Binding**:
  - *Current State*: Envelope encryption implementation uses local simulated master keys (`KMS_DATA_KEY`).
  - *Action Required*: Bind master key wrapping to an external FIPS 140-2 Level 3 HSM (e.g. AWS KMS, Azure Key Vault, or Google Cloud KMS) for production deployment.
- [ ] **Live Supabase PostgreSQL Production Deployment**:
  - *Current State*: Complete migration scripts and `@supabase/supabase-js` dual client service (`SupabaseService`) implemented with seamless in-memory fallback.
  - *Action Required*: Execute `supabase db push` to provision live remote PostgreSQL with Row-Level Security policies active.
- [ ] **Twilio SMS / Voice Notification Gateway**:
  - *Current State*: Integrated with automatic development mock logger fallback.
  - *Action Required*: Provide valid `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and alphanumeric sender ID in production `.env`.
- [ ] **Stripe Subscription Billing Gateway**:
  - *Current State*: Integrated with simulated checkout and webhook lifecycle testing.
  - *Action Required*: Connect live Stripe merchant account with verified webhook signatures.

### Category 3: Unimplemented Technical Controls (Future Roadmap)
- [ ] **NHS National Record Integration (Spine / PDS)**:
  - Integration with NHS Personal Demographics Service (PDS) FHIR API for automatic patient demographic lookup via NHS number.
- [ ] **Electronic Prescription Service (EPS) Phase 4 Integration**:
  - Direct digital token transmission to NHS community pharmacies via national EPS architecture.
- [ ] **Automated Backup Point-in-Time Recovery (PITR)**:
  - 30-day automated point-in-time PostgreSQL snapshot recovery across multiple geographic availability zones.

### Category 4: Externally Dependent Legal, Clinical & Governance Milestones
These statutory requirements cannot be satisfied by software code alone and must be completed by the deploying organization prior to processing live clinical patient data:
- [ ] **Data Protection Impact Assessment (DPIA)**: Formal DPIA under UK GDPR Article 35 signed off by the deploying clinic's Data Protection Officer (DPO).
- [ ] **Data Processing Agreement (DPA)**: Legal controller-to-processor standard contractual clauses executed between the clinic and SaaS hosting entity.
- [ ] **Information Commissioner's Office (ICO) Registration**: Verification of active entry on the UK Data Protection Register.
- [ ] **DCB0129 Clinical Safety Case Report**: Clinical risk management documentation produced by the software manufacturer and approved by an accredited Clinical Safety Officer (CSO).
- [ ] **DCB0160 Deployment Safety Assessment**: Clinical risk review conducted by the healthcare organization deploying the system.
- [ ] **MHRA Software as a Medical Device (SaMD) Validation**: Confirmation that algorithmic tools (e.g. no-show scoring) remain strictly non-diagnostic operational classifiers.
- [ ] **Independent CREST-Accredited Penetration Testing**: Third-party boundary breakout and vulnerability penetration audit.
