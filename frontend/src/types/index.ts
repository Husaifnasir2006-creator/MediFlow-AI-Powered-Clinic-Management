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

export type RiskLevel = 'low' | 'medium' | 'high';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  nhs_number?: string;
  is_platform_admin: boolean;
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
  city: string;
  postal_code: string;
  country: string;
  time_zone: string;
  currency: string;
  settings: Record<string, any>;
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
  no_show_risk_score: number;
  no_show_risk_level: RiskLevel;
  no_show_factors: string[];
  patient?: Patient;
  doctor?: Doctor;
  service?: AppointmentService;
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
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string;
  reviewed_at?: string;
  doctor_notes?: string;
  safety_check_passed: boolean;
  safety_flags: string[];
  created_at: string;
  patient?: Patient;
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
  user?: UserProfile;
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
}
