export type UserRole = 
  | 'platform_owner' 
  | 'clinic_owner' 
  | 'administrator' 
  | 'doctor' 
  | 'receptionist' 
  | 'patient';

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'checked_in' 
  | 'in_consultation' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';

export type ConsultationType = 'in_person' | 'video' | 'phone';

export type PrescriptionStatus = 
  | 'pending' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  nhs_number?: string;
  avatar_url?: string;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  registration_number: string;
  cqc_rating: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country: string;
  time_zone: string;
  currency: string;
  logo_url?: string;
  website_url?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicMembership {
  id: string;
  clinic_id: string;
  user_id: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  joined_at: string;
}

export interface Doctor {
  id: string;
  clinic_id: string;
  user_id: string;
  gmc_number: string;
  specialty: string;
  qualifications: string;
  bio: string;
  consultation_fee_gbp: number;
  appointment_duration_mins: number;
  is_active: boolean;
  user?: UserProfile;
}

export interface DoctorAvailability {
  id: string;
  clinic_id: string;
  doctor_id: string;
  day_of_week: number; // 0 to 6
  start_time: string; // HH:mm:ss
  end_time: string;
  break_start?: string;
  break_end?: string;
  is_active: boolean;
}

export interface Patient {
  id: string;
  clinic_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  nhs_number?: string;
  date_of_birth: string;
  gender: string;
  address_line1: string;
  city: string;
  postal_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  medical_allergies?: string;
  is_active: boolean;
  created_at: string;
}

export interface AppointmentService {
  id: string;
  clinic_id: string;
  name: string;
  code: string;
  description: string;
  duration_mins: number;
  price_gbp: number;
  is_telemedicine_eligible: boolean;
  is_active: boolean;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  consultation_type: ConsultationType;
  reason_for_visit?: string;
  notes?: string;
  cancellation_reason?: string;
  checked_in_at?: string;
  completed_at?: string;
  no_show_risk_score: number;
  no_show_risk_level: RiskLevel;
  no_show_factors: string[];
  google_event_id?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
  service?: AppointmentService;
}

export interface IntakeForm {
  id: string;
  clinic_id: string;
  title: string;
  description: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    options?: string[];
    required: boolean;
  }>;
  is_active: boolean;
  created_at: string;
}

export interface IntakeResponse {
  id: string;
  clinic_id: string;
  form_id: string;
  appointment_id?: string;
  patient_id: string;
  status: 'draft' | 'submitted' | 'reviewed';
  demographics: Record<string, any>;
  medical_history: Record<string, any>;
  allergies: string[];
  current_medications: string[];
  emergency_contact: Record<string, any>;
  consents: Record<string, boolean>;
  encrypted_payload?: string;
  encryption_key_id?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  doctor_review_notes?: string;
  submitted_at: string;
  created_at: string;
}

export interface PrescriptionRequest {
  id: string;
  clinic_id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  quantity: string;
  preferred_pharmacy: string;
  patient_reason: string;
  status: PrescriptionStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  doctor_notes?: string;
  safety_check_passed: boolean;
  safety_flags: string[];
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface ConsultationSession {
  id: string;
  clinic_id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  room_sid: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'disconnected' | 'abandoned';
  doctor_joined_at?: string;
  patient_joined_at?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds: number;
  created_at: string;
}

export interface StaffShift {
  id: string;
  clinic_id: string;
  user_id: string;
  role: UserRole;
  shift_date: string;
  start_time: string;
  end_time: string;
  department: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'sick_leave' | 'annual_leave';
  notes?: string;
  user?: UserProfile;
}

export interface AuditLog {
  id: string;
  clinic_id?: string;
  actor_user_id?: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly_gbp: number;
  price_annual_gbp: number;
  max_doctors: number;
  max_monthly_appointments: number;
  features: string[];
  is_active: boolean;
}

export interface ClinicSubscription {
  id: string;
  clinic_id: string;
  plan_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan?: SubscriptionPlan;
}
