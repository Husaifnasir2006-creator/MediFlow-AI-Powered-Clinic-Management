import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from './config.service.js';

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient | null = null;
  private adminClient: SupabaseClient | null = null;
  private isConnected: boolean = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  /**
   * Resets the singleton instance (useful for unit tests that toggle storage mode).
   */
  public static resetInstance(): void {
    SupabaseService.instance = new SupabaseService();
  }

  private initialize(): void {
    const config = ConfigService.getInstance().getConfig();

    if (config.storageMode === 'supabase') {
      const url = config.supabaseUrl;
      const anonKey = config.supabaseAnonKey;
      const serviceRoleKey = config.supabaseServiceRoleKey;

      if (!url || !anonKey || !serviceRoleKey) {
        throw new Error(
          '[SUPABASE SERVICE ERROR] Persistent storage mode active, but required Supabase credentials ' +
          'are missing. Never silently switching to in-memory store when storage mode is "supabase".'
        );
      }

      try {
        this.client = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        this.adminClient = createClient(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        this.isConnected = true;
        if (config.nodeEnv !== 'test') {
          console.log('[SUPABASE SERVICE] Successfully initialized persistent Supabase client for:', url);
        }
      } catch (err: any) {
        this.isConnected = false;
        throw new Error(`[SUPABASE SERVICE ERROR] Failed to initialize Supabase client: ${err.message}`);
      }
    } else {
      // Explicitly documented in-memory development / testing mode
      this.client = null;
      this.adminClient = null;
      this.isConnected = false;
    }
  }

  public isLiveConnected(): boolean {
    return this.isConnected;
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public getAdminClient(): SupabaseClient | null {
    return this.adminClient || this.client;
  }

  /**
   * Performs an active healthcheck ping against the remote Supabase database.
   */
  public async pingDatabase(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    if (!this.adminClient) {
      return { ok: false, message: 'Supabase client is not initialized (in-memory mode active).' };
    }

    const start = Date.now();
    try {
      const { data, error } = await this.adminClient.from('subscription_plans').select('count', { count: 'exact', head: true });
      if (error) {
        return { ok: false, message: `Database error on ping: ${error.message}` };
      }
      return { ok: true, message: 'Database connection verified.', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { ok: false, message: `Network/connection error on ping: ${err.message}` };
    }
  }
}
