import { SupabaseClient } from '@supabase/supabase-js';
import {
  Clinic, UserProfile, ClinicMembership, Doctor, DoctorAvailability,
  Patient, AppointmentService, Appointment, IntakeForm, IntakeResponse,
  PrescriptionRequest, ConsultationSession, StaffShift, AuditLog,
  SubscriptionPlan, ClinicSubscription
} from '../types/index.js';
import { SupabaseService } from './supabase.service.js';

export class SupabaseRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      const liveClient = SupabaseService.getInstance().getAdminClient();
      if (!liveClient) {
        throw new Error('SupabaseRepository initialized without active SupabaseClient connection.');
      }
      this.client = liveClient;
    }
  }

  // 1. Clinics
  public async getClinics(userId?: string, isPlatformAdmin: boolean = false): Promise<Clinic[]> {
    let query = this.client.from('clinics').select('*');
    if (!isPlatformAdmin && userId) {
      const { data: memberships } = await this.client
        .from('clinic_memberships')
        .select('clinic_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      const clinicIds = (memberships || []).map((m: any) => m.clinic_id);
      if (clinicIds.length > 0) {
        query = query.in('id', clinicIds);
      }
    }
    const { data, error } = await query;
    if (error) throw new Error(`Supabase error fetching clinics: ${error.message}`);
    return data || [];
  }

  public async getClinicBySlug(slug: string): Promise<Clinic | null> {
    const { data, error } = await this.client
      .from('clinics')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`Supabase error fetching clinic by slug: ${error.message}`);
    return data;
  }

  public async updateClinicSettings(id: string, settings: Record<string, any>): Promise<Clinic> {
    const { data, error } = await this.client
      .from('clinics')
      .update({ settings, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Supabase error updating clinic settings: ${error.message}`);
    return data;
  }

  // 2. Users & Memberships
  public async getUserByEmail(email: string): Promise<(UserProfile & { passwordHash?: string }) | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(`Supabase error fetching user: ${error.message}`);
    return data;
  }

  public async getUserById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Supabase error fetching user by id: ${error.message}`);
    return data;
  }

  public async getMembership(userId: string, clinicId?: string): Promise<ClinicMembership | null> {
    let query = this.client
      .from('clinic_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`Supabase error fetching membership: ${error.message}`);
    return data;
  }

  public async createUserWithMembership(params: {
    user: Partial<UserProfile> & { id: string; email: string };
    membership: Partial<ClinicMembership> & { clinic_id: string; role: string };
    patient?: Partial<Patient>;
  }): Promise<{ user: UserProfile; membership: ClinicMembership }> {
    const { data: user, error: userError } = await this.client
      .from('user_profiles')
      .insert({
        id: params.user.id,
        email: params.user.email.toLowerCase(),
        first_name: params.user.first_name,
        last_name: params.user.last_name,
        phone: params.user.phone,
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (userError) throw new Error(`Supabase error creating user: ${userError.message}`);

    const { data: membership, error: memError } = await this.client
      .from('clinic_memberships')
      .insert({
        clinic_id: params.membership.clinic_id,
        user_id: user.id,
        role: params.membership.role,
        department: params.membership.department || 'General Practice',
        is_active: true,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();
    if (memError) throw new Error(`Supabase error creating membership: ${memError.message}`);

    if (params.patient) {
      await this.client.from('patients').insert({
        clinic_id: params.membership.clinic_id,
        user_id: user.id,
        first_name: params.user.first_name,
        last_name: params.user.last_name,
        email: params.user.email.toLowerCase(),
        phone: params.user.phone || '',
        date_of_birth: params.patient.date_of_birth || '1990-01-01',
        gender: params.patient.gender || 'Prefer not to say',
        is_active: true,
        created_at: new Date().toISOString()
      });
    }

    return { user, membership };
  }

  // 3. Patients
  public async getPatients(clinicId: string): Promise<Patient[]> {
    const { data, error } = await this.client
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Supabase error fetching patients: ${error.message}`);
    return data || [];
  }

  public async getPatientById(id: string, clinicId?: string): Promise<Patient | null> {
    let query = this.client.from('patients').select('*').eq('id', id);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`Supabase error fetching patient: ${error.message}`);
    return data;
  }

  public async createPatient(patient: Partial<Patient>): Promise<Patient> {
    const { data, error } = await this.client
      .from('patients')
      .insert(patient)
      .select()
      .single();
    if (error) throw new Error(`Supabase error creating patient: ${error.message}`);
    return data;
  }

  public async updatePatient(id: string, updates: Partial<Patient>, clinicId?: string): Promise<Patient> {
    let query = this.client.from('patients').update(updates).eq('id', id);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query.select().single();
    if (error) throw new Error(`Supabase error updating patient: ${error.message}`);
    return data;
  }

  public async deletePatient(id: string, clinicId?: string): Promise<void> {
    let query = this.client.from('patients').delete().eq('id', id);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { error } = await query;
    if (error) throw new Error(`Supabase error deleting patient: ${error.message}`);
  }

  // 4. Doctors & Availability
  public async getDoctors(clinicId: string): Promise<Doctor[]> {
    const { data, error } = await this.client
      .from('doctors')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('clinic_id', clinicId)
      .eq('is_active', true);
    if (error) throw new Error(`Supabase error fetching doctors: ${error.message}`);
    return data || [];
  }

  public async getDoctorById(id: string): Promise<Doctor | null> {
    const { data, error } = await this.client
      .from('doctors')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Supabase error fetching doctor: ${error.message}`);
    return data;
  }

  // 5. Appointments
  public async getAppointments(clinicId: string, patientId?: string): Promise<Appointment[]> {
    let query = this.client
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*, user:user_profiles(*)),
        service:appointment_services(*)
      `)
      .eq('clinic_id', clinicId)
      .order('start_time', { ascending: true });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase error fetching appointments: ${error.message}`);
    return data || [];
  }

  public async checkAppointmentConflict(doctorId: string, startIso: string, endIso: string): Promise<Appointment | null> {
    const { data, error } = await this.client
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .not('status', 'in', '("cancelled","no_show")')
      .lt('start_time', endIso)
      .gt('end_time', startIso)
      .maybeSingle();
    if (error) throw new Error(`Supabase error checking conflict: ${error.message}`);
    return data;
  }

  public async createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await this.client
      .from('appointments')
      .insert(appointment)
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*, user:user_profiles(*)),
        service:appointment_services(*)
      `)
      .single();
    if (error) throw new Error(`Supabase error creating appointment: ${error.message}`);
    return data;
  }

  public async updateAppointmentStatus(id: string, status: string, cancellationReason?: string): Promise<Appointment> {
    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };
    if (cancellationReason) updatePayload.cancellation_reason = cancellationReason;
    if (status === 'checked_in') updatePayload.checked_in_at = new Date().toISOString();
    if (status === 'completed') updatePayload.completed_at = new Date().toISOString();

    const { data, error } = await this.client
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Supabase error updating appointment status: ${error.message}`);
    return data;
  }

  // 6. Prescriptions
  public async getPrescriptions(clinicId: string, patientId?: string): Promise<PrescriptionRequest[]> {
    let query = this.client
      .from('prescription_requests')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*, user:user_profiles(*))
      `)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase error fetching prescriptions: ${error.message}`);
    return data || [];
  }

  public async createPrescriptionRequest(req: Partial<PrescriptionRequest>): Promise<PrescriptionRequest> {
    const { data, error } = await this.client
      .from('prescription_requests')
      .insert(req)
      .select()
      .single();
    if (error) throw new Error(`Supabase error creating prescription: ${error.message}`);
    return data;
  }

  public async reviewPrescriptionRequest(params: {
    requestId: string;
    doctorId: string;
    status: 'approved' | 'rejected';
    clinicalRationale: string;
  }): Promise<PrescriptionRequest> {
    const { data, error } = await this.client
      .from('prescription_requests')
      .update({
        status: params.status,
        reviewed_by: params.doctorId,
        reviewed_at: new Date().toISOString(),
        doctor_notes: params.clinicalRationale,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.requestId)
      .select()
      .single();
    if (error) throw new Error(`Supabase error reviewing prescription: ${error.message}`);
    return data;
  }

  // 7. Intake Forms & Responses
  public async getIntakeTemplates(clinicId?: string): Promise<IntakeForm[]> {
    let query = this.client.from('intake_forms').select('*').eq('is_active', true);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Supabase error fetching intake forms: ${error.message}`);
    return data || [];
  }

  public async getIntakeResponses(clinicId: string): Promise<IntakeResponse[]> {
    const { data, error } = await this.client
      .from('intake_responses')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Supabase error fetching intake responses: ${error.message}`);
    return data || [];
  }

  public async createIntakeResponse(response: Partial<IntakeResponse>): Promise<IntakeResponse> {
    const { data, error } = await this.client
      .from('intake_responses')
      .insert(response)
      .select()
      .single();
    if (error) throw new Error(`Supabase error creating intake response: ${error.message}`);
    return data;
  }

  // 8. Consultation Sessions
  public async getConsultationSession(appointmentId: string): Promise<ConsultationSession | null> {
    const { data, error } = await this.client
      .from('consultation_sessions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();
    if (error) throw new Error(`Supabase error fetching session: ${error.message}`);
    return data;
  }

  public async createConsultationSession(session: Partial<ConsultationSession>): Promise<ConsultationSession> {
    const { data, error } = await this.client
      .from('consultation_sessions')
      .insert(session)
      .select()
      .single();
    if (error) throw new Error(`Supabase error creating session: ${error.message}`);
    return data;
  }

  // 9. Shifts & Rotas
  public async getShifts(clinicId: string): Promise<StaffShift[]> {
    const { data, error } = await this.client
      .from('staff_shifts')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('clinic_id', clinicId)
      .order('shift_date', { ascending: true });
    if (error) throw new Error(`Supabase error fetching shifts: ${error.message}`);
    return data || [];
  }

  // 10. Plans & Subscriptions
  public async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await this.client
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly_gbp', { ascending: true });
    if (error) throw new Error(`Supabase error fetching plans: ${error.message}`);
    return data || [];
  }

  public async getClinicSubscription(clinicId: string): Promise<ClinicSubscription | null> {
    const { data, error } = await this.client
      .from('clinic_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('clinic_id', clinicId)
      .maybeSingle();
    if (error) throw new Error(`Supabase error fetching subscription: ${error.message}`);
    return data;
  }

  // 11. Audit Logs
  public async createAuditLog(log: Partial<AuditLog>): Promise<void> {
    await this.client.from('audit_logs').insert({
      ...log,
      created_at: new Date().toISOString()
    });
  }
}
