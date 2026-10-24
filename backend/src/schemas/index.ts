import { z } from 'zod';

export const createPatientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Valid phone number required'),
  nhs_number: z.string().regex(/^\d{3}\s?\d{3}\s?\d{4}$/, 'UK NHS number must be 10 digits (e.g. 485 920 1823)').optional().or(z.literal('')),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  medical_allergies: z.string().optional()
});

export const createAppointmentSchema = z.object({
  clinic_id: z.string().optional(),
  patient_id: z.string().min(1, 'Patient ID is required'),
  doctor_id: z.string().min(1, 'Doctor ID is required'),
  service_id: z.string().optional(),
  start_time: z.string().datetime({ message: 'start_time must be an ISO 8601 UTC date string' }),
  end_time: z.string().datetime({ message: 'end_time must be an ISO 8601 UTC date string' }),
  consultation_type: z.enum(['in_person', 'video']).default('in_person'),
  reason_for_visit: z.string().min(1, 'Reason for visit is required')
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters with numbers/symbols'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(5, 'Phone number is required'),
  clinic_id: z.string().optional(),
  role: z.enum(['clinic_owner', 'administrator', 'doctor', 'receptionist', 'patient']).default('patient')
});

export const requestRefillSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  medication_name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  preferred_pharmacy: z.string().optional(),
  patient_reason: z.string().min(1, 'Reason for refill is required')
});
