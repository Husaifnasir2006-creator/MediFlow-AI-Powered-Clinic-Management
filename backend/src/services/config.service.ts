export type StorageMode = 'memory' | 'supabase';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  storageMode: StorageMode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  kmsDataKey?: string;
  turnServerUrl?: string;
  turnUsername?: string;
  turnCredential?: string;
  isTurnConfigured: boolean;
  isKmsCloudConfigured: boolean;
  isTwilioConfigured: boolean;
  isGoogleCalendarConfigured: boolean;
  isStripeConfigured: boolean;
}

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadAndValidateConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Resets the singleton instance (useful for unit tests that test configuration variations).
   */
  public static resetInstance(): void {
    ConfigService.instance = new ConfigService();
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public get storageMode(): StorageMode {
    return this.config.storageMode;
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  private loadAndValidateConfig(): AppConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const port = parseInt(process.env.PORT || '5000', 10);
    const jwtSecret = process.env.JWT_SECRET || 'mediflow_super_secure_jwt_secret_dev_key_2026';

    const rawStorageMode = (process.env.DATA_STORAGE_MODE || '').toLowerCase();
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const hasValidSupabaseCredentials = Boolean(
      supabaseUrl &&
      supabaseUrl.startsWith('http') &&
      !supabaseUrl.includes('your-project-ref') &&
      supabaseAnonKey &&
      !supabaseAnonKey.includes('...') &&
      supabaseServiceRoleKey &&
      !supabaseServiceRoleKey.includes('...')
    );

    // Resolve storage mode explicitly
    let storageMode: StorageMode;
    if (rawStorageMode === 'supabase') {
      storageMode = 'supabase';
    } else if (rawStorageMode === 'memory') {
      storageMode = 'memory';
    } else {
      // Default: in production require supabase; in dev/test default to memory
      storageMode = nodeEnv === 'production' ? 'supabase' : 'memory';
    }

    // STRICT PRODUCTION SAFETY VALIDATIONS
    if (nodeEnv === 'production') {
      if (storageMode === 'memory') {
        throw new Error(
          '[FATAL CONFIGURATION ERROR] In-memory storage is strictly prohibited in production. ' +
          'DATA_STORAGE_MODE must be set to "supabase" and connected to persistent PostgreSQL.'
        );
      }

      if (!hasValidSupabaseCredentials) {
        throw new Error(
          '[FATAL CONFIGURATION ERROR] Production environment requires persistent Supabase database credentials. ' +
          'Missing or placeholder values detected in SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY. ' +
          'MediFlow will not silently fall back to ephemeral in-memory storage in production.'
        );
      }

      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('dev_key')) {
        throw new Error(
          '[FATAL CONFIGURATION ERROR] Production environment requires a strong, random JWT_SECRET (minimum 32 characters).'
        );
      }
    }

    // Explicit validation when 'supabase' mode is explicitly requested in non-production
    if (storageMode === 'supabase' && !hasValidSupabaseCredentials) {
      throw new Error(
        '[CONFIG ERROR] DATA_STORAGE_MODE is set to "supabase", but required Supabase credentials ' +
        '(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) are missing or placeholder values.'
      );
    }

    const kmsKey = process.env.KMS_DATA_KEY;
    const isKmsCloudConfigured = Boolean(kmsKey && !kmsKey.includes('replace_with') && kmsKey.length >= 32);

    const turnUrl = process.env.TURN_SERVER_URL;
    const turnUser = process.env.TURN_USERNAME;
    const turnCred = process.env.TURN_CREDENTIAL;
    const isTurnConfigured = Boolean(turnUrl && turnUser && turnCred);

    const isTwilioConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      !process.env.TWILIO_ACCOUNT_SID.startsWith('ACXXXX') &&
      process.env.TWILIO_AUTH_TOKEN
    );

    const isGoogleCalendarConfigured = Boolean(
      process.env.GOOGLE_CALENDAR_CLIENT_ID &&
      !process.env.GOOGLE_CALENDAR_CLIENT_ID.includes('your_google_oauth') &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    );

    const isStripeConfigured = Boolean(
      process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.startsWith('mock_') &&
      !process.env.STRIPE_SECRET_KEY.includes('sk_test_51XXXX')
    );

    // Explicit audit log of active storage mode
    if (nodeEnv !== 'test') {
      if (storageMode === 'supabase') {
        console.log(`\x1b[32m[STORAGE ENGINE]\x1b[0m Selected Mode: PERSISTENT SUPABASE POSTGRESQL (Target: ${supabaseUrl})`);
      } else {
        console.log(`\x1b[33m[STORAGE ENGINE]\x1b[0m Selected Mode: IN-MEMORY MOCK ADAPTER (Local Dev/Test). Data will NOT persist across restarts.`);
      }
    }

    return {
      nodeEnv,
      port,
      jwtSecret,
      storageMode,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
      kmsDataKey: kmsKey,
      turnServerUrl: turnUrl,
      turnUsername: turnUser,
      turnCredential: turnCred,
      isTurnConfigured,
      isKmsCloudConfigured,
      isTwilioConfigured,
      isGoogleCalendarConfigured,
      isStripeConfigured
    };
  }
}
