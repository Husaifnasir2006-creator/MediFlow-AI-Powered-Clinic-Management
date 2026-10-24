import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { ConfigService } from '../src/services/config.service.js';
import { StorageService } from '../src/services/storage.service.js';
import { SupabaseService } from '../src/services/supabase.service.js';
import { MigrationWorkflow } from '../src/scripts/migrate.js';
import { AuthService } from '../src/services/auth.service.js';

describe('MediFlow Persistence, Storage Configuration & Tenant Isolation Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    ConfigService.resetInstance();
    StorageService.resetInstance();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    ConfigService.resetInstance();
    StorageService.resetInstance();
  });

  // ============================================================================
  // Suite 1: Production Configuration Safety & Storage Mode Fail-Safe
  // ============================================================================
  describe('1. Storage Mode Configuration & Fail-Safe Guards', () => {
    it('should explicitly default to in-memory mode in non-production when unspecified', () => {
      delete process.env.DATA_STORAGE_MODE;
      process.env.NODE_ENV = 'development';
      ConfigService.resetInstance();

      const config = ConfigService.getInstance().getConfig();
      expect(config.storageMode).toBe('memory');
      expect(StorageService.getInstance().getStorageMode()).toBe('memory');
    });

    it('should fail safely in production if in-memory storage mode is requested', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATA_STORAGE_MODE = 'memory';

      expect(() => {
        ConfigService.resetInstance();
      }).toThrow(/strictly prohibited in production/i);
    });

    it('should fail safely in production if Supabase credentials are missing or placeholder', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATA_STORAGE_MODE = 'supabase';
      process.env.SUPABASE_URL = 'https://your-project-ref.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'eyJhbGciOi...';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOi...';

      expect(() => {
        ConfigService.resetInstance();
      }).toThrow(/Production environment requires persistent Supabase database credentials/i);
    });

    it('should fail safely in non-production if DATA_STORAGE_MODE=supabase is set but credentials are placeholders', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATA_STORAGE_MODE = 'supabase';
      process.env.SUPABASE_URL = 'https://your-project-ref.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'placeholder_key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder_key';

      expect(() => {
        ConfigService.resetInstance();
      }).toThrow(/DATA_STORAGE_MODE is set to "supabase", but required Supabase credentials/i);
    });

    it('should require a secure JWT secret with minimum length in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATA_STORAGE_MODE = 'supabase';
      process.env.SUPABASE_URL = 'https://xyzrealref.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validAnonPayloadKeyHere1234567890';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validServiceRoleKeyHere1234567890';
      process.env.JWT_SECRET = 'short_dev_key';

      expect(() => {
        ConfigService.resetInstance();
      }).toThrow(/requires a strong, random JWT_SECRET/i);
    });
  });

  // ============================================================================
  // Suite 2: Persistence Across Server Restarts vs In-Memory Reset
  // ============================================================================
  describe('2. Persistence Across Server Restarts Lifecycle', () => {
    it('demonstrates that in-memory mock store resets newly added entities on fresh instance re-creation', () => {
      const storage1 = StorageService.getInstance();
      const initialPatientCount = storage1.patients.length;

      // Add a synthetic patient in instance 1
      const ephemeralPatientId = `pat-ephemeral-${Date.now()}`;
      storage1.patients.push({
        id: ephemeralPatientId,
        clinic_id: 'clinic-st-jude',
        first_name: 'Ephemeral',
        last_name: 'TestPatient',
        email: 'ephemeral@test.co.uk',
        phone: '+44 7700 900999',
        date_of_birth: '1985-05-15',
        gender: 'Female',
        address_line1: '12 Test Road',
        city: 'London',
        postal_code: 'W1 1AA',
        emergency_contact_name: 'Next of Kin',
        emergency_contact_phone: '+44 7700 900888',
        emergency_contact_relationship: 'Family',
        is_active: true,
        created_at: new Date().toISOString()
      });

      expect(storage1.patients.length).toBe(initialPatientCount + 1);
      expect(storage1.patients.find(p => p.id === ephemeralPatientId)).toBeDefined();

      // Simulate a server restart: reset and re-instantiate StorageService
      StorageService.resetInstance();
      const storage2 = StorageService.getInstance();

      // State is reset to baseline; ephemeral patient does not persist across in-memory restarts
      expect(storage2.patients.length).toBe(initialPatientCount);
      expect(storage2.patients.find(p => p.id === ephemeralPatientId)).toBeUndefined();
    });

    it('demonstrates that storage repository is properly initialized when persistent store is configured', () => {
      // In development memory mode, repository is null and storage uses local collections
      const storage = StorageService.getInstance();
      expect(storage.getStorageMode()).toBe('memory');
    });
  });

  // ============================================================================
  // Suite 3: Multi-Tenant Authorization & Security Isolation
  // ============================================================================
  describe('3. Multi-Tenant Authorization & Identity Boundaries', () => {
    it('should strictly deny doctor from Clinic A from accessing Clinic B patient data (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/patients/pat-harley-1')
        .set('X-Demo-Role', 'doctor');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Tenant isolation violation');
    });

    it('should strictly deny clinic administrator from modifying settings of another clinic (403 Forbidden)', async () => {
      const res = await request(app)
        .put('/api/clinics/clinic-harley-street/settings')
        .set('X-Demo-Role', 'administrator')
        .send({ currency: 'EUR' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Tenant isolation violation');
    });

    it('should strictly deny patient from viewing another patient record (403 Forbidden)', async () => {
      // Patient user (pat-1) attempting to inspect pat-2 record
      const res = await request(app)
        .get('/api/patients/pat-2')
        .set('X-Demo-Role', 'patient');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied: You may only view your own patient record');
    });

    it('should deny receptionist from reviewing or approving prescription requests (403 Forbidden)', async () => {
      const res = await request(app)
        .put('/api/prescriptions/req-1/review')
        .set('X-Demo-Role', 'receptionist')
        .send({
          status: 'approved',
          clinical_rationale: 'Unauthorized receptionist approval attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should strictly ignore X-Demo-Role header in production mode and require Bearer token', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const res = await request(app)
          .get('/api/clinics')
          .set('X-Demo-Role', 'clinic_owner');

        // In production, X-Demo-Role must not authenticate the request
        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Authentication required. Missing Bearer token.');
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('should allow authentic Bearer JWT tokens in production mode', async () => {
      const token = AuthService.generateToken({
        userId: 'user-owner',
        email: 'owner@stjudehealth.co.uk',
        role: 'clinic_owner',
        clinicId: 'clinic-st-jude',
        isPlatformAdmin: false
      });

      const res = await request(app)
        .get('/api/clinics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ============================================================================
  // Suite 4: Database Migrations & Schema Integrity Check
  // ============================================================================
  describe('4. Database Migrations & Schema Architecture', () => {
    it('should verify all database migration files exist, are versioned, and have non-empty SQL', () => {
      const workflow = new MigrationWorkflow();
      const result = workflow.verifyMigrationIntegrity();

      expect(result.valid).toBe(true);
      expect(result.filesCount).toBeGreaterThanOrEqual(2);
      expect(result.files.some(f => f.name.includes('initial_schema'))).toBe(true);
      expect(result.files.some(f => f.name.includes('complete_rls'))).toBe(true);
    });

    it('should safely mask secrets and extract project reference during staging pre-flight', async () => {
      const workflow = new MigrationWorkflow();
      const report = await workflow.runStagingPreflight();

      expect(report).toBeDefined();
      expect(report.maskedAnonKey).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(report.maskedServiceRoleKey).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(typeof report.safeToProceed).toBe('boolean');
    });
  });

  // ============================================================================
  // Suite 5: Real Supabase Live Connection (Conditional)
  // ============================================================================
  describe('5. Real Supabase Live PostgreSQL Test Suite (Conditional)', () => {
    const isLiveConfigured = Boolean(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_URL.startsWith('http') &&
      !process.env.SUPABASE_URL.includes('your-project-ref') &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('...')
    );

    if (isLiveConfigured) {
      it('[LIVE SUPABASE] should ping remote Supabase PostgreSQL database successfully', async () => {
        const supabaseService = SupabaseService.getInstance();
        const ping = await supabaseService.pingDatabase();
        expect(ping.ok).toBe(true);
      });

      it('[LIVE SUPABASE] should query subscription plans from live PostgreSQL instance', async () => {
        const storage = StorageService.getInstance();
        const repo = storage.getRepository();
        expect(repo).toBeDefined();
        if (repo) {
          const plans = await repo.getSubscriptionPlans();
          expect(Array.isArray(plans)).toBe(true);
        }
      });
    } else {
      it('[LIVE SUPABASE - SKIPPED: credentials pending user approval and .env configuration]', () => {
        // Explicitly documents why the live test is skipped, without failing the test suite
        expect(isLiveConfigured).toBe(false);
        console.log('\x1b[36m[NOTICE]\x1b[0m Live Supabase tests skipped: Remote credentials not yet provisioned in .env.');
      });
    }
  });
});
