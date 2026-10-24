import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationFile {
  name: string;
  fullPath: string;
  sizeBytes: number;
}

export interface TableProbeDetail {
  tableName: string;
  exists: boolean;
  accessibleViaAdmin: boolean;
  accessibleViaAnon: boolean;
  rowCount?: number;
  adminError?: string;
  anonError?: string;
}

export interface StagingPreflightReport {
  timestamp: string;
  configured: boolean;
  projectRef: string;
  explicitProjectRef?: string;
  projectRefMatch: boolean;
  maskedUrl: string;
  maskedAnonKey: string;
  maskedServiceRoleKey: string;
  connected: boolean;
  latencyMs?: number;
  tableDetails: TableProbeDetail[];
  existingTablesCount: number;
  totalProbedTablesCount: number;
  migrationsAppliedEstimate: 'none' | 'partial' | 'complete';
  migrationFilesCount: number;
  migrationFiles: { name: string; sizeBytes: number }[];
  safeToProceed: boolean;
  advisory: string;
}

export class MigrationWorkflow {
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
  }

  public getMigrationFiles(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsDir)) {
      throw new Error(`Migrations directory not found: ${this.migrationsDir}`);
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(file => {
      const fullPath = path.join(this.migrationsDir, file);
      const stat = fs.statSync(fullPath);
      return {
        name: file,
        fullPath,
        sizeBytes: stat.size
      };
    });
  }

  public verifyMigrationIntegrity(): {
    valid: boolean;
    filesCount: number;
    files: MigrationFile[];
    summary: string;
  } {
    const files = this.getMigrationFiles();
    if (files.length === 0) {
      return { valid: false, filesCount: 0, files: [], summary: 'No migration files found.' };
    }

    // Verify naming convention YYYYMMDDXXXXXX_description.sql
    const nameRegex = /^\d{14}_[a-z0-9_]+\.sql$/;
    for (const file of files) {
      if (!nameRegex.test(file.name)) {
        throw new Error(`Migration file does not match versioned timestamp pattern: ${file.name}`);
      }
      const content = fs.readFileSync(file.fullPath, 'utf8');
      if (content.length === 0) {
        throw new Error(`Migration file is empty: ${file.name}`);
      }
    }

    return {
      valid: true,
      filesCount: files.length,
      files,
      summary: `Verified ${files.length} versioned migration file(s) successfully.`
    };
  }

  public extractProjectRef(url?: string): string {
    if (!url) return 'unknown';
    const match = url.match(/^https?:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/);
    return match ? match[1] : 'custom_or_self_hosted';
  }

  public maskSecretKey(key?: string): string {
    if (!key) return '[UNSET]';
    if (key.includes('...') || key.includes('replace_with')) return '[PLACEHOLDER]';
    if (key.length <= 16) return '****';
    return `${key.substring(0, 10)}...[MASKED: ${key.length} chars]`;
  }

  public async runStagingPreflight(): Promise<StagingPreflightReport> {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const explicitProjectRef = process.env.SUPABASE_PROJECT_REF;

    const migrationFiles = this.getMigrationFiles().map(f => ({ name: f.name, sizeBytes: f.sizeBytes }));
    const projectRef = this.extractProjectRef(url);
    const maskedUrl = url ? url.replace(/^(https?:\/\/[a-zA-Z0-9_-]+)\.supabase\.co.*$/, '$1.supabase.co') : '[UNSET]';
    const maskedAnonKey = this.maskSecretKey(anonKey);
    const maskedServiceRoleKey = this.maskSecretKey(serviceRoleKey);

    const projectRefMatch = explicitProjectRef ? (explicitProjectRef === projectRef) : true;

    const isConfigured = Boolean(
      url &&
      url.startsWith('http') &&
      !url.includes('your-project-ref') &&
      serviceRoleKey &&
      !serviceRoleKey.includes('...')
    );

    if (!isConfigured) {
      return {
        timestamp: new Date().toISOString(),
        configured: false,
        projectRef: 'none',
        explicitProjectRef,
        projectRefMatch: true,
        maskedUrl,
        maskedAnonKey,
        maskedServiceRoleKey,
        connected: false,
        tableDetails: [],
        existingTablesCount: 0,
        totalProbedTablesCount: 0,
        migrationsAppliedEstimate: 'none',
        migrationFilesCount: migrationFiles.length,
        migrationFiles,
        safeToProceed: false,
        advisory: 'Staging Supabase credentials pending in .env. No target remote project configured.'
      };
    }

    const start = Date.now();
    try {
      const adminClient = createClient(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const anonClient = anonKey && !anonKey.includes('...')
        ? createClient(url!, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
        : null;

      // Probe schema to evaluate PostgreSQL table existence and RLS behavior
      const probeTables = [
        'subscription_plans',
        'clinics',
        'user_profiles',
        'clinic_memberships',
        'doctors',
        'doctor_availability',
        'patients',
        'appointment_services',
        'appointments',
        'intake_forms',
        'intake_responses',
        'prescription_requests',
        'prescriptions',
        'consultation_sessions',
        'staff_shifts',
        'audit_logs',
        'clinic_subscriptions'
      ];

      const tableDetails: TableProbeDetail[] = [];

      for (const table of probeTables) {
        // 1. Probe with admin service role
        const { count, error: adminErr } = await adminClient
          .from(table)
          .select('*', { count: 'exact', head: true });

        const isTableMissing = adminErr && (
          adminErr.code === '42P01' || 
          adminErr.message.toLowerCase().includes('does not exist')
        );

        const exists = !isTableMissing;
        const accessibleViaAdmin = exists && !adminErr;

        // 2. Probe with anon key (checks public grants and unauthenticated RLS read boundaries)
        let accessibleViaAnon = false;
        let anonError: string | undefined;

        if (anonClient && exists) {
          const { error: anonErr } = await anonClient
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          accessibleViaAnon = !anonErr;
          if (anonErr) {
            anonError = anonErr.code || anonErr.message;
          }
        }

        tableDetails.push({
          tableName: table,
          exists,
          accessibleViaAdmin,
          accessibleViaAnon,
          rowCount: count ?? undefined,
          adminError: adminErr ? adminErr.message : undefined,
          anonError
        });
      }

      const latencyMs = Date.now() - start;
      const existingTables = tableDetails.filter(t => t.exists);
      const existingTablesCount = existingTables.length;

      let estimate: 'none' | 'partial' | 'complete' = 'none';
      if (existingTablesCount === 0) {
        estimate = 'none';
      } else if (existingTablesCount < probeTables.length) {
        estimate = 'partial';
      } else {
        estimate = 'complete';
      }

      let advisory = '';
      if (!projectRefMatch) {
        advisory = `SAFETY ALERT: SUPABASE_PROJECT_REF ("${explicitProjectRef}") does not match URL project reference ("${projectRef}"). Verify target environment before continuing.`;
      } else if (estimate === 'none') {
        advisory = `Target staging project "${projectRef}" is reachable and clean (0 MediFlow tables detected). Ready to receive initial schema migration.`;
      } else if (estimate === 'partial') {
        advisory = `Target staging project "${projectRef}" has ${existingTablesCount}/${probeTables.length} tables (partially migrated). Check migration history before applying.`;
      } else {
        advisory = `Target staging project "${projectRef}" has all ${existingTablesCount} tables present and verified. Database schema is fully deployed.`;
      }

      return {
        timestamp: new Date().toISOString(),
        configured: true,
        projectRef,
        explicitProjectRef,
        projectRefMatch,
        maskedUrl,
        maskedAnonKey,
        maskedServiceRoleKey,
        connected: true,
        latencyMs,
        tableDetails,
        existingTablesCount,
        totalProbedTablesCount: probeTables.length,
        migrationsAppliedEstimate: estimate,
        migrationFilesCount: migrationFiles.length,
        migrationFiles,
        safeToProceed: projectRefMatch,
        advisory
      };
    } catch (err: any) {
      return {
        timestamp: new Date().toISOString(),
        configured: true,
        projectRef,
        explicitProjectRef,
        projectRefMatch,
        maskedUrl,
        maskedAnonKey,
        maskedServiceRoleKey,
        connected: false,
        tableDetails: [],
        existingTablesCount: 0,
        totalProbedTablesCount: 0,
        migrationsAppliedEstimate: 'none',
        migrationFilesCount: migrationFiles.length,
        migrationFiles,
        safeToProceed: false,
        advisory: `Network / connection error: ${err.message}`
      };
    }
  }
}

// CLI execution
if (process.argv[1] === __filename) {
  const workflow = new MigrationWorkflow();
  console.log('====================================================');
  console.log(' MediFlow Safe Staging Pre-Flight Verification');
  console.log('====================================================');

  try {
    const verification = workflow.verifyMigrationIntegrity();
    console.log(`[FILES] ${verification.summary}`);
    verification.files.forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.name} (${f.sizeBytes} bytes)`);
    });
    console.log('----------------------------------------------------');

    workflow.runStagingPreflight().then(report => {
      console.log(`[TARGET PROJECT REF] : ${report.projectRef}`);
      if (report.explicitProjectRef) {
        console.log(`[EXPLICIT REF CHECK] : ${report.explicitProjectRef} (Match: ${report.projectRefMatch})`);
      }
      console.log(`[TARGET HOST]        : ${report.maskedUrl}`);
      console.log(`[ANON KEY]           : ${report.maskedAnonKey}`);
      console.log(`[SERVICE ROLE KEY]   : ${report.maskedServiceRoleKey}`);
      console.log(`[CONNECTIVITY]       : ${report.connected ? `REACHABLE (${report.latencyMs}ms latency)` : 'UNREACHABLE / UNSET'}`);
      console.log(`[TABLE INVENTORY]    : ${report.existingTablesCount}/${report.totalProbedTablesCount} tables present`);
      if (report.tableDetails.length > 0 && report.existingTablesCount > 0) {
        const found = report.tableDetails.filter(t => t.exists).map(t => `${t.tableName} (${t.rowCount ?? 0} rows)`).join(', ');
        console.log(`[DISCOVERED TABLES]  : ${found}`);
      }
      console.log(`[ESTIMATE]           : ${report.migrationsAppliedEstimate.toUpperCase()}`);
      console.log(`[SAFETY ADVISORY]    : ${report.advisory}`);
      console.log('----------------------------------------------------');
      console.log('[SAFEGUARD] 0 writes or modifications were executed during pre-flight.');
      console.log('====================================================');
    });
  } catch (err: any) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  }
}
