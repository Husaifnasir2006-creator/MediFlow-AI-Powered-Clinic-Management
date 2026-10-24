# MediFlow — AI-Powered Clinic Management SaaS Platform

[![Node.js](https://img.shields.io/badge/Node.js-20%2B%20%7C%2024%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-cyan.svg)](https://tailwindcss.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-HD%20Telehealth-orange.svg)](https://webrtc.org/)
[![UK Healthcare](https://img.shields.io/badge/UK%20Healthcare-NHS%20%2F%20CQC%20Ready-purple.svg)](#6-security-compliance--synthetic-data)
[![Tests](https://img.shields.io/badge/Tests-38%20Passed-brightgreen.svg)](#2-quality-checks--automated-tests)

**MediFlow** is a modern UK healthcare clinic management SaaS product designed for private medical practices, NHS GP federations, and consultant clinics. It provides intelligent appointment scheduling, transparent AI no-show risk forecasting, encrypted WebRTC telemedicine consultations, pre-consultation digital intake forms (AES-256 envelope encrypted), repeat prescription safety verification, and operational staff rotas.

> [!NOTE]
> **LOCAL DEMONSTRATION & UNIVERSITY REVIEW MODE**:
> The application is currently configured for autonomous local demonstration and development without requiring live Supabase credentials, remote PostgreSQL databases, or paid third-party API accounts. A clean, reactive in-memory mock repository layer is active by default. When ready for production staging, setting `DATA_STORAGE_MODE=supabase` reconnects persistent PostgreSQL with Row-Level Security without modifying frontend components.

---

## 1. Quick Start & Terminal Commands

### Prerequisites
- **Node.js**: v20 or higher (v24.x tested)
- **npm**: v10 or higher

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Launch in VS Code Terminals

#### Terminal 1 — Backend API & WebRTC Signaling:
```bash
cd backend
npm run dev
```
- API Base URL: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`
- WebRTC Signaling WebSocket: `ws://localhost:5000/ws/signaling`
- Engine: `IN-MEMORY MOCK ADAPTER` (zero database credentials required)

#### Terminal 2 — Frontend Web Application:
```bash
cd frontend
npm run dev
```
- Application URL: `http://localhost:5173`
- Open your browser to `http://localhost:5173` to explore all roles and workflows.

---

## 2. Quality Checks & Automated Tests

All tests, compilation steps, and production bundle builds pass with **0 errors**:

### Backend TypeScript Compilation
```bash
cd backend
npm run build
```
*Result: Exits with code 0 (TypeScript `tsc` compiles cleanly).*

### Backend Vitest Automated Test Suite
```bash
cd backend
npm test
```
*Result: 38 tests passing across 2 test files (100% success rate).*
- `tests/api.test.ts` (22 tests): Authentication, multi-tenant clinic isolation, RBAC permissions, scheduling conflict prevention, AI no-show prediction, prescription review, and AES-256 envelope encryption.
- `tests/persistence.test.ts` (16 tests): Storage mode configuration, fail-safe fallback guards, memory repository CRUD, foreign-clinic tenant blocking, and Supabase preflight schema verification.

### Frontend Code Quality & Linting
```bash
cd frontend
npm run lint
```
*Result: 0 errors and 0 warnings across all 26 files via `oxlint`.*

### Frontend Production Bundle Build
```bash
cd frontend
npm run build
```
*Result: Vite production bundle built cleanly in ~2.2s.*

---

## 3. Instant Role Switcher & Demonstration Accounts

Use the **Role View** dropdown located in the top navigation bar to switch between healthcare perspectives instantly:

| Role | Persona Name | Primary Workspaces & Responsibilities |
| :--- | :--- | :--- |
| **Clinic Owner** | Dr. Oliver Sterling (FRCGP) | Practice Overview, Practice Settings, Stripe SaaS billing, Rota management, full patient directory |
| **Medical Doctor** | Dr. Alistair Finch (GMC #7482910) | Smart Scheduler, WebRTC video consultations with SOAP notes, prescription safety approvals |
| **Receptionist** | Marcus Cooper | Patient directory registration, live waiting room triage queue, in-person check-in |
| **Practice Admin** | Sarah Jenkins | Operational rotas & shift assignments, CQC audit checklist, clinic performance analytics |
| **Patient Portal** | James Smith (NHS #485 920 1823) | Self-service booking, digital intake questionnaires, repeat prescription refill requests |
| **Platform Owner** | Victoria Sterling | Multi-tenant SaaS console, clinic provisioning, MRR telemetry, tenant isolation audits |

---

## 4. Core Features & Verified Workflows

### A. Intelligent Appointment Scheduler & Reception Queue (`/appointments`)
- **Interactive Calendar Views**: Switch between **List View**, **Hourly Day Breakdown** (09:00–17:00 with 1-click open slot booking), and **7-Day Weekly Capacity Grid**.
- **Live Reception Triage Queue**: Quick status filter tabs (`All`, `Waiting Room / Arrived`, `Confirmed`, `Completed`) with real-time patient counter.
- **Workflow Actions**: 1-click **Check-In** (marks patient arrived in reception), **Complete Visit** (records timestamp), **Cancel** (releases slot conflict), and **Launch Video** (joins WebRTC room).
- **Explainable AI No-Show Predictor**: Computes risk score (0–100%) and categorizes appointments as `Low`, `Medium`, or `High` risk based on booking lead time, prior history, reminder response, and day of week.

### B. Patient Directory & Medical Records (`/patients`)
- **Full CRUD Capabilities**: Search, filter by gender or allergies, register new practice patients, edit contact/allergy details, and archive records.
- **Clinical Record Viewer Modal**:
  - NHS Spine identifier mapping and verification badge.
  - Full demographics, registered UK residence, and primary telephone.
  - Documented Allergies & Drug Reactions alert panel cross-referenced against the British National Formulary (BNF).
  - Next of kin / Emergency contact relationship & telephone.
  - Recent consultation summaries and clinical history timeline.

### C. Practice Settings & Preferences (`/settings`)
- **Clinic Profile & CQC**: Configure legal practice name, CQC rating (Outstanding / Good), CQC Provider ID, address, and official telephone.
- **Automated Communication Rules**: Toggles for SMS reminders (Twilio sandbox), email calendar invites (.ics), AI risk alerts, and lead time rules (12h, 24h, 48h, 72h).
- **Scheduling Rules**: Slot duration (15m, 30m, 45m, 60m), advance notice hours, public booking enablement, and telemedicine toggles.

### D. Staff Rota & Operational Performance (`/rota`)
- **Operational Metrics**: Real-time average waiting time (vs. UK private benchmarks), daily completed consultations, patient satisfaction score (4.9/5.0), and rota fulfillment.
- **Assign New Shift Modal**: Assign consultant GPs, cardiologists, and triage receptionists with department assignment, shift date, and start/end hours.
- **Department Filters**: Filter active shifts by General Practice, Cardiology, Reception, or Nursing.

### E. Repeat Prescription Safety Screening (`/prescriptions`)
- **Automated Allergy Cross-Check**: Screens repeat medication requests against the patient's documented allergies (e.g. Penicillin cross-reactivity) and controlled drug flags.
- **Clinician Signoff**: Attending doctor approves or rejects refills with a mandatory clinical rationale audit trail.
- *Clearly labeled as a clinical workflow simulation.*

### F. Digital Intake Forms & Envelope Encryption (`/intake`)
- Pre-consultation medical questionnaire with medical history, current medications, smoking status, and GDPR consent.
- Demonstrates **AES-256-GCM envelope encryption** with distinct Data Encryption Keys (DEKs) wrapped by master Key Management Service (KMS) references.

### G. WebRTC HD Telemedicine (`/telemedicine`)
- In-browser encrypted video consultation canvas with microphone mute, camera toggle, screen sharing toggle, and live session duration timer.
- Integrated **SOAP Clinical Note Pad** (Subjective, Objective, Assessment, Plan) enabling doctors to sign and save clinical visit notes.

### H. Stripe SaaS Billing & ARR (`/billing`)
- Tier comparison (Starter, Professional, Enterprise) with monthly and annual discount toggles.
- Simulated **Stripe Customer Billing Portal** displaying active payment card on file (Visa Business ending in 4242) and UK VAT invoice receipt history.

### I. Public Booking Profile (`/book/:clinicSlug`)
- Direct shareable landing page designed for clinic customer acquisition via Google Business Profile.
- Mobile-responsive patient booking flow with live doctor slot availability and transparent service pricing in £ GBP (e.g. `/book/st-jude-london`).

---

## 5. Architecture & Storage Decoupling

MediFlow's backend is architected around an extensible repository pattern:
```
backend/
├── src/
│   ├── services/
│   │   ├── config.service.ts        # Enforces storage mode & environment safety
│   │   ├── storage.service.ts       # Unified data access facade (Memory & Supabase)
│   │   ├── supabase.repository.ts   # Persistent PostgreSQL RLS repository
│   │   ├── no_show.service.ts       # 7-factor AI no-show prediction engine
│   │   ├── prescription.service.ts  # BNF cross-allergy checking engine
│   │   ├── intake.service.ts        # AES-256-GCM envelope encryption
│   │   └── auth.service.ts          # JWT & bcrypt password hashing
│   ├── controllers/                 # Route handlers with tenant isolation checks
│   └── routes/                      # Protected Express API endpoints
```

### Future Supabase Reactivation
When a remote Supabase project is provisioned:
1. Provide credentials in `backend/.env`:
   ```ini
   DATA_STORAGE_MODE=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
2. Verify migration readiness:
   ```bash
   cd backend && npm run migrate:check
   ```
3. Apply SQL migrations from `supabase/migrations/` using the Supabase CLI.

---

## 6. Security, Compliance & Synthetic Data

- **Synthetic Clinical Data**: All patient names, NHS numbers, date of births, doctor GMC numbers, and clinical notes are fictional synthetic demonstrations. No real patient data is included or transmitted.
- **UK Healthcare Alignment**: Follows NHS Caldicott Principles (justified purpose, least privilege, need-to-know access) and CQC digital record-keeping good practice.
- **Third-Party Integrations**: Telemedicine, Twilio SMS, Google Calendar, and Stripe billing execute in simulated sandbox modes for reliable local demonstrations.
- **Statutory Notice**: MediFlow implements technical privacy controls; formal clinical safety case reports (DCB0129) and legal Data Protection Impact Assessments (DPIA) are required prior to live clinical deployment.

---

## 7. License
MediFlow is developed for educational and clinical management demonstration purposes.
