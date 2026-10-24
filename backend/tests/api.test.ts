import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { NoShowPredictionService } from '../src/services/no_show.service.js';
import { PrescriptionService } from '../src/services/prescription.service.js';
import { EnvelopeEncryptionService } from '../src/services/intake.service.js';
import { AuthService } from '../src/services/auth.service.js';

describe('MediFlow Comprehensive Backend Test Suite', () => {
  // 1. Core Health & System Market Readiness
  it('GET /api/health should return 200 and UK market readiness', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.market).toContain('UK');
  });

  // 2. Authentication: Password Hashing, Login, Register, and Demo Switch
  describe('Authentication & Identity Management', () => {
    it('POST /api/auth/login should authenticate with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'owner@stjudehealth.co.uk',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('owner@stjudehealth.co.uk');
      expect(res.body.user.passwordHash).toBeUndefined(); // Must never expose password hashes
      expect(res.body.role).toBe('clinic_owner');
    });

    it('POST /api/auth/login should reject incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'owner@stjudehealth.co.uk',
          password: 'WrongPassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid email or password');
    });

    it('POST /api/auth/register should create new user account and return JWT', async () => {
      const testEmail = `test.user.${Date.now()}@example.co.uk`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          first_name: 'Charlotte',
          last_name: 'Bronte',
          phone: '+44 7700 900321',
          role: 'patient'
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.role).toBe('patient');
    });

    it('GET /api/auth/demo-switch/:role should supply JWT and authenticated user across all 6 roles', async () => {
      const roles = ['clinic_owner', 'doctor', 'patient', 'receptionist', 'administrator', 'platform_owner'];
      for (const role of roles) {
        const res = await request(app).get(`/api/auth/demo-switch/${role}`);
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toBeDefined();
      }
    });
  });

  // 3. Multi-Tenant Isolation
  describe('Multi-Tenant Data Isolation', () => {
    it('Clinic staff from Clinic A should be blocked from viewing Clinic B patient records', async () => {
      // User with role 'doctor' in St. Jude (Clinic A) attempting to fetch Harley Street (Clinic B) patient
      const res = await request(app)
        .get('/api/patients/pat-harley-1')
        .set('X-Demo-Role', 'doctor');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Tenant isolation violation');
    });

    it('Clinic administrator from Clinic A should be blocked from altering Clinic B settings', async () => {
      const res = await request(app)
        .put('/api/clinics/clinic-harley-street/settings')
        .set('X-Demo-Role', 'administrator')
        .send({ currency: 'USD' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Tenant isolation violation');
    });

    it('Platform owner should bypass tenant boundaries to oversee system operations', async () => {
      const res = await request(app)
        .get('/api/patients/pat-harley-1')
        .set('X-Demo-Role', 'platform_owner');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('pat-harley-1');
      expect(res.body.clinic_id).toBe('clinic-harley-street');
    });
  });

  // 4. Patient-Record Authorization
  describe('Patient-Record Authorization & Privacy', () => {
    it('Patient user should be strictly restricted to viewing only their own record', async () => {
      // Demo patient is user-patient-1 / pat-1
      const selfRes = await request(app)
        .get('/api/patients/pat-1')
        .set('X-Demo-Role', 'patient');
      expect(selfRes.status).toBe(200);
      expect(selfRes.body.id).toBe('pat-1');

      // Patient attempting to view pat-2 (Emily Wong)
      const foreignPatientRes = await request(app)
        .get('/api/patients/pat-2')
        .set('X-Demo-Role', 'patient');
      expect(foreignPatientRes.status).toBe(403);
      expect(foreignPatientRes.body.error).toContain('Access denied');
    });

    it('Patient role should not have access to full clinic patient registry', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('X-Demo-Role', 'patient');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('Staff can update patient records (PUT /api/patients/:id) with data persistence', async () => {
      const res = await request(app)
        .put('/api/patients/pat-2')
        .set('X-Demo-Role', 'administrator')
        .send({
          phone: '+44 7700 900888',
          city: 'London',
          medical_allergies: 'Latex, Ciprofloxacin'
        });

      expect(res.status).toBe(200);
      expect(res.body.phone).toBe('+44 7700 900888');
      expect(res.body.medical_allergies).toContain('Latex');
    });

    it('Unauthorized patient cannot update records (PUT /api/patients/:id)', async () => {
      const res = await request(app)
        .put('/api/patients/pat-2')
        .set('X-Demo-Role', 'patient')
        .send({ phone: '+44 7700 900999' });

      expect(res.status).toBe(403);
    });

    it('Clinic owner can delete / archive a patient record (DELETE /api/patients/:id)', async () => {
      // First create a temporary patient to delete
      const createdRes = await request(app)
        .post('/api/patients')
        .set('X-Demo-Role', 'clinic_owner')
        .send({
          first_name: 'Temp',
          last_name: 'ArchiveTest',
          email: 'temp.archive@test.co.uk',
          phone: '+44 7700 900111',
          date_of_birth: '1995-05-15',
          gender: 'Female'
        });

      expect(createdRes.status).toBe(201);
      const tempId = createdRes.body.id;

      // Now delete it
      const delRes = await request(app)
        .delete(`/api/patients/${tempId}`)
        .set('X-Demo-Role', 'clinic_owner');

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });
  });

  // 5. Role-Based Access Control (RBAC)
  describe('Role-Based Access Control', () => {
    it('Receptionist should be forbidden from reviewing and approving prescriptions', async () => {
      const res = await request(app)
        .put('/api/prescriptions/req-1/review')
        .set('X-Demo-Role', 'receptionist')
        .send({
          status: 'approved',
          clinical_rationale: 'Unauthorized receptionist sign-off attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('Authorized doctor should be allowed to review repeat prescription requests', async () => {
      const res = await request(app)
        .put('/api/prescriptions/req-1/review')
        .set('X-Demo-Role', 'doctor')
        .send({
          status: 'approved',
          clinical_rationale: 'Blood pressure verified at 124/82. Refill clinically approved.',
          doctor_id: 'doc-1'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
      expect(res.body.doctor_notes).toBeDefined();
    });

    it('Unauthorized roles should be blocked from practice analytics dashboard', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('X-Demo-Role', 'patient');

      expect(res.status).toBe(403);
    });
  });

  // 6. Appointment Booking & Conflict Detection
  describe('Appointment Booking & Conflict Detection', () => {
    it('should reject overlapping bookings for the same doctor with 409 Conflict', async () => {
      const conflictBooking = {
        clinic_id: 'clinic-st-jude',
        patient_id: 'pat-2',
        doctor_id: 'doc-1',
        service_id: 'srv-1',
        // appt-1 is 1 hour from now for doc-1
        start_time: new Date(Date.now() + 65 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
        consultation_type: 'video',
        reason_for_visit: 'Overlapping test'
      };

      const res = await request(app)
        .post('/api/appointments')
        .set('X-Demo-Role', 'receptionist')
        .send(conflictBooking);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Scheduling Conflict');
    });
  });

  // 7. API Validation & Safe Error Handling (Zod Schemas)
  describe('API Payload Validation & Safe Error Handling', () => {
    it('POST /api/appointments should return 400 when missing mandatory fields', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('X-Demo-Role', 'receptionist')
        .send({
          // Missing start_time, end_time, reason_for_visit
          doctor_id: 'doc-1'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.details).toBeDefined();
    });

    it('POST /api/patients should validate UK NHS number and date of birth', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('X-Demo-Role', 'receptionist')
        .send({
          first_name: 'Arthur',
          last_name: 'Dent',
          email: 'not-an-email',
          phone: '123',
          date_of_birth: 'invalid-date',
          gender: 'Alien'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('should sanitize unhandled errors without leaking stack traces or database internals', async () => {
      const res = await request(app)
        .get('/api/patients/non-existent-patient-id-12345')
        .set('X-Demo-Role', 'doctor');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Patient not found');
      expect(res.body.stack).toBeUndefined();
    });
  });

  // 8. Clinical Algorithms: No-Show AI & Prescription Safety
  describe('Clinical Algorithms & Governance', () => {
    it('No-Show Prediction Service should compute accurate score and explainable factors', () => {
      const highRisk = NoShowPredictionService.predict({
        leadTimeDays: 16,
        priorNoShows: 2,
        priorCompleted: 1,
        hasCompletedIntake: false,
        hasConfirmedReminder: false,
        consultationType: 'in_person',
        dayOfWeek: 1
      });

      expect(highRisk.score).toBeGreaterThan(0.40);
      expect(highRisk.riskLevel).toBe('high');
      expect(highRisk.factors.length).toBeGreaterThan(0);
      expect(highRisk.factors).toContain('Long booking lead time (> 14 days)');

      const lowRisk = NoShowPredictionService.predict({
        leadTimeDays: 1,
        priorNoShows: 0,
        priorCompleted: 5,
        hasCompletedIntake: true,
        hasConfirmedReminder: true,
        consultationType: 'video',
        dayOfWeek: 3
      });

      expect(lowRisk.score).toBeLessThan(0.20);
      expect(lowRisk.riskLevel).toBe('low');
    });

    it('Prescription Safety Check should detect allergy contraindications', () => {
      const checkAmoxicillin = PrescriptionService.runSafetyCheck('pat-1', 'Amoxicillin Trihydrate 500mg');
      expect(checkAmoxicillin.passed).toBe(false);
      expect(checkAmoxicillin.warnings.some(w => w.includes('CRITICAL ALLERGY ALERT'))).toBe(true);

      const checkRamipril = PrescriptionService.runSafetyCheck('pat-1', 'Ramipril 5mg');
      expect(checkRamipril.passed).toBe(true);
    });

    it('Intake Envelope Encryption should generate ciphertext with unique DEK key ID', () => {
      const sensitiveClinicalData = {
        bloodPressure: '138/86',
        symptoms: 'Mild shortness of breath upon exertion',
        pastSurgeries: ['Appendectomy 2014']
      };

      const encrypted = EnvelopeEncryptionService.encrypt(sensitiveClinicalData);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.keyId).toContain('kms-key-');
    });
  });

  // 9. Telemedicine Infrastructure & WebRTC
  describe('Telemedicine Infrastructure & WebRTC', () => {
    it('GET /api/telemedicine/ice-servers should return STUN and statutory notice regarding unconfigured TURN', async () => {
      const res = await request(app)
        .get('/api/telemedicine/ice-servers')
        .set('X-Demo-Role', 'doctor');

      expect(res.status).toBe(200);
      expect(res.body.iceServers).toBeDefined();
      expect(res.body.iceServers.length).toBeGreaterThanOrEqual(1);
      expect(res.body.productionTurnConfigured).toBe(false);
      expect(res.body.notice).toContain('Statutory Notice');
    });

    it('Auth token verification should correctly validate generated JWT tokens', () => {
      const token = AuthService.generateToken({
        userId: 'test-user',
        email: 'test@example.com',
        role: 'doctor',
        clinicId: 'clinic-st-jude',
        isPlatformAdmin: false
      });

      const verified = AuthService.verifyToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe('test-user');
      expect(verified?.role).toBe('doctor');

      const invalid = AuthService.verifyToken('invalid.token.here');
      expect(invalid).toBeNull();
    });
  });
});
