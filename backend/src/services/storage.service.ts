import {
  Clinic, UserProfile, ClinicMembership, Doctor, DoctorAvailability,
  Patient, AppointmentService, Appointment, IntakeForm, IntakeResponse,
  PrescriptionRequest, ConsultationSession, StaffShift, AuditLog,
  SubscriptionPlan, ClinicSubscription
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { ConfigService, StorageMode } from './config.service.js';
import { SupabaseRepository } from './supabase.repository.js';
import { SupabaseService } from './supabase.service.js';

const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

export class StorageService {
  private static instance: StorageService;
  private repository: SupabaseRepository | null = null;

  public clinics: Clinic[] = [];
  public users: (UserProfile & { passwordHash?: string })[] = [];
  public memberships: ClinicMembership[] = [];
  public doctors: Doctor[] = [];
  public availability: DoctorAvailability[] = [];
  public patients: Patient[] = [];
  public services: AppointmentService[] = [];
  public appointments: Appointment[] = [];
  public intakeForms: IntakeForm[] = [];
  public intakeResponses: IntakeResponse[] = [];
  public prescriptionRequests: PrescriptionRequest[] = [];
  public consultationSessions: ConsultationSession[] = [];
  public shifts: StaffShift[] = [];
  public auditLogs: AuditLog[] = [];
  public plans: SubscriptionPlan[] = [];
  public subscriptions: ClinicSubscription[] = [];

  private constructor() {
    this.seedDefaultData();
    if (this.getStorageMode() === 'supabase') {
      try {
        const client = SupabaseService.getInstance().getAdminClient();
        if (client) {
          this.repository = new SupabaseRepository(client);
        }
      } catch (err) {
        if (ConfigService.getInstance().isProduction()) {
          throw err;
        }
      }
    }
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public static resetInstance(): void {
    StorageService.instance = new StorageService();
  }

  public reset(): void {
    this.seedDefaultData();
  }

  public getStorageMode(): StorageMode {
    return ConfigService.getInstance().storageMode;
  }

  public getRepository(): SupabaseRepository | null {
    return this.repository;
  }

  private seedDefaultData() {
    // 1. Subscription Plans
    this.plans = [
      {
        id: 'plan-starter',
        code: 'starter',
        name: 'Practice Starter',
        description: 'Ideal for boutique private practices and solo practitioners',
        price_monthly_gbp: 149.00,
        price_annual_gbp: 1490.00,
        max_doctors: 3,
        max_monthly_appointments: 300,
        features: ['online_booking', 'patient_portal', 'basic_analytics', 'email_notifications'],
        is_active: true
      },
      {
        id: 'plan-professional',
        code: 'professional',
        name: 'Professional Clinic',
        description: 'Full operational suite for expanding UK medical centres with AI features',
        price_monthly_gbp: 299.00,
        price_annual_gbp: 2990.00,
        max_doctors: 10,
        max_monthly_appointments: 1500,
        features: ['online_booking', 'patient_portal', 'advanced_analytics', 'sms_voice_notifications', 'webrtc_telemedicine', 'ai_no_show_prediction', 'intake_forms_encryption'],
        is_active: true
      },
      {
        id: 'plan-enterprise',
        code: 'enterprise',
        name: 'Enterprise Health Network',
        description: 'Multi-location healthcare trusts with custom rotas & dedicated compliance',
        price_monthly_gbp: 599.00,
        price_annual_gbp: 5990.00,
        max_doctors: 50,
        max_monthly_appointments: 10000,
        features: ['online_booking', 'patient_portal', 'enterprise_analytics', 'google_calendar_two_way', 'webrtc_telemedicine', 'custom_cqc_audit_exports', 'dedicated_account_manager'],
        is_active: true
      }
    ];

    // 2. Clinics
    this.clinics = [
      {
        id: 'clinic-st-jude',
        name: 'St. Jude Healthcare Centre',
        slug: 'st-jude-london',
        registration_number: 'UK-CQC-89241',
        cqc_rating: 'Outstanding',
        phone: '+44 20 7946 0912',
        email: 'info@stjudehealth.co.uk',
        address_line1: '42 Marylebone High Street',
        city: 'London',
        postal_code: 'W1U 5HD',
        country: 'GB',
        time_zone: 'Europe/London',
        currency: 'GBP',
        settings: {
          notifications: { sms_enabled: true, email_enabled: true, reminder_hours_before: [24, 2] },
          booking: { allow_guest: false, min_notice_hours: 2 }
        },
        is_active: true,
        created_at: new Date(Date.now() - 365 * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'clinic-harley-street',
        name: 'Harley Street Specialist Clinic',
        slug: 'harley-street-wellness',
        registration_number: 'UK-CQC-93104',
        cqc_rating: 'Good',
        phone: '+44 20 7946 0888',
        email: 'contact@harleywellness.co.uk',
        address_line1: '10 Harley Street',
        city: 'London',
        postal_code: 'W1G 9PF',
        country: 'GB',
        time_zone: 'Europe/London',
        currency: 'GBP',
        settings: {
          notifications: { sms_enabled: true, email_enabled: true, reminder_hours_before: [48, 4] }
        },
        is_active: true,
        created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // 3. User Profiles across all 6 roles
    this.users = [
      {
        id: 'user-platform-owner',
        email: 'superadmin@mediflow.uk',
        first_name: 'Victoria',
        last_name: 'Sterling',
        phone: '+44 7700 900111',
        is_platform_admin: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-clinic-owner',
        email: 'owner@stjudehealth.co.uk',
        first_name: 'Dr. Oliver',
        last_name: 'Sterling',
        phone: '+44 7700 900222',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-admin',
        email: 'admin@stjudehealth.co.uk',
        first_name: 'Sarah',
        last_name: 'Jenkins',
        phone: '+44 7700 900333',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-doctor-1',
        email: 'doctor@stjudehealth.co.uk',
        first_name: 'Dr. Alistair',
        last_name: 'Finch',
        phone: '+44 7700 900444',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-doctor-2',
        email: 'dr.vance@stjudehealth.co.uk',
        first_name: 'Dr. Eleanor',
        last_name: 'Vance',
        phone: '+44 7700 900555',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-receptionist',
        email: 'reception@stjudehealth.co.uk',
        first_name: 'Marcus',
        last_name: 'Cooper',
        phone: '+44 7700 900666',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-patient-1',
        email: 'patient.smith@example.co.uk',
        first_name: 'James',
        last_name: 'Smith',
        phone: '+44 7700 900777',
        nhs_number: '485 920 1823',
        date_of_birth: '1979-06-25',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-patient-2',
        email: 'patient.wong@example.co.uk',
        first_name: 'Emily',
        last_name: 'Wong',
        phone: '+44 7700 900888',
        nhs_number: '928 174 5821',
        date_of_birth: '1992-03-10',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-patient-3',
        email: 'patient.patel@example.co.uk',
        first_name: 'Raj',
        last_name: 'Patel',
        phone: '+44 7700 900999',
        nhs_number: '382 910 4729',
        date_of_birth: '1968-12-04',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-harley-admin',
        email: 'admin@harleywellness.co.uk',
        first_name: 'Charles',
        last_name: 'Montgomery',
        phone: '+44 7700 900550',
        is_platform_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Assign default password hash for local demo and test suites
    this.users.forEach(u => {
      u.passwordHash = DEFAULT_PASSWORD_HASH;
    });

    // 4. Clinic Memberships
    this.memberships = [
      { id: 'm-owner', clinic_id: 'clinic-st-jude', user_id: 'user-clinic-owner', role: 'clinic_owner', department: 'Executive Medical Office', is_active: true, joined_at: new Date().toISOString() },
      { id: 'm-admin', clinic_id: 'clinic-st-jude', user_id: 'user-admin', role: 'administrator', department: 'Operations & CQC Compliance', is_active: true, joined_at: new Date().toISOString() },
      { id: 'm-doc-1', clinic_id: 'clinic-st-jude', user_id: 'user-doctor-1', role: 'doctor', department: 'Cardiology & General Practice', is_active: true, joined_at: new Date().toISOString() },
      { id: 'm-doc-2', clinic_id: 'clinic-st-jude', user_id: 'user-doctor-2', role: 'doctor', department: 'Dermatology & Minor Procedures', is_active: true, joined_at: new Date().toISOString() },
      { id: 'm-rec', clinic_id: 'clinic-st-jude', user_id: 'user-receptionist', role: 'receptionist', department: 'Front Reception', is_active: true, joined_at: new Date().toISOString() },
      { id: 'm-harley-admin', clinic_id: 'clinic-harley-street', user_id: 'user-harley-admin', role: 'administrator', department: 'Practice Operations', is_active: true, joined_at: new Date().toISOString() }
    ];

    // 5. Doctors
    this.doctors = [
      {
        id: 'doc-1',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-doctor-1',
        gmc_number: '7482910',
        specialty: 'General Practice & Cardiology',
        qualifications: 'MBBS, MRCGP, FRCP (London)',
        bio: 'Senior Consultant General Physician with 16 years NHS & private practice experience.',
        consultation_fee_gbp: 95.00,
        appointment_duration_mins: 30,
        is_active: true,
        user: this.users.find(u => u.id === 'user-doctor-1')
      },
      {
        id: 'doc-2',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-doctor-2',
        gmc_number: '6938201',
        specialty: 'Dermatology & Minor Surgery',
        qualifications: 'MBChB, MRCP (Derm), DCH',
        bio: 'Specialist in clinical dermatology, skin screening, and preventive health.',
        consultation_fee_gbp: 120.00,
        appointment_duration_mins: 30,
        is_active: true,
        user: this.users.find(u => u.id === 'user-doctor-2')
      }
    ];

    // 6. Doctor Availability (Mon-Fri 09:00 - 17:00)
    for (let day = 1; day <= 5; day++) {
      this.availability.push({
        id: `avail-doc1-${day}`,
        clinic_id: 'clinic-st-jude',
        doctor_id: 'doc-1',
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        break_start: '13:00',
        break_end: '14:00',
        is_active: true
      });
      this.availability.push({
        id: `avail-doc2-${day}`,
        clinic_id: 'clinic-st-jude',
        doctor_id: 'doc-2',
        day_of_week: day,
        start_time: '10:00',
        end_time: '18:00',
        break_start: '13:00',
        break_end: '14:00',
        is_active: true
      });
    }

    // 7. Patients
    this.patients = [
      {
        id: 'pat-1',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-patient-1',
        first_name: 'James',
        last_name: 'Smith',
        email: 'patient.smith@example.co.uk',
        phone: '+44 7700 900777',
        nhs_number: '485 920 1823',
        date_of_birth: '1979-06-25',
        gender: 'Male',
        address_line1: '14 Baker Street',
        city: 'London',
        postal_code: 'NW1 6XE',
        emergency_contact_name: 'Clara Smith',
        emergency_contact_phone: '+44 7700 900701',
        emergency_contact_relationship: 'Spouse',
        medical_allergies: 'Penicillin (mild cutaneous rash)',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString()
      },
      {
        id: 'pat-2',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-patient-2',
        first_name: 'Emily',
        last_name: 'Wong',
        email: 'patient.wong@example.co.uk',
        phone: '+44 7700 900888',
        nhs_number: '928 174 5821',
        date_of_birth: '1992-03-10',
        gender: 'Female',
        address_line1: '8 Kensington High St',
        city: 'London',
        postal_code: 'W8 4PT',
        emergency_contact_name: 'David Wong',
        emergency_contact_phone: '+44 7700 900802',
        emergency_contact_relationship: 'Father',
        medical_allergies: 'None known',
        is_active: true,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: 'pat-3',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-patient-3',
        first_name: 'Raj',
        last_name: 'Patel',
        email: 'patient.patel@example.co.uk',
        phone: '+44 7700 900999',
        nhs_number: '382 910 4729',
        date_of_birth: '1968-12-04',
        gender: 'Male',
        address_line1: '22 Fitzrovia Way',
        city: 'London',
        postal_code: 'W1T 4BP',
        emergency_contact_name: 'Priya Patel',
        emergency_contact_phone: '+44 7700 900903',
        emergency_contact_relationship: 'Spouse',
        medical_allergies: 'Aspirin, NSAIDs (bronchospasm)',
        is_active: true,
        created_at: new Date(Date.now() - 90 * 86400000).toISOString()
      },
      {
        id: 'pat-harley-1',
        clinic_id: 'clinic-harley-street',
        first_name: 'Arthur',
        last_name: 'Pendelton',
        email: 'arthur.pendelton@example.co.uk',
        phone: '+44 7700 900551',
        nhs_number: '551 294 8839',
        date_of_birth: '1975-04-12',
        gender: 'Male',
        address_line1: '12 Harley Street',
        city: 'London',
        postal_code: 'W1G 9PF',
        emergency_contact_name: 'Mary Pendelton',
        emergency_contact_phone: '+44 7700 900552',
        emergency_contact_relationship: 'Spouse',
        medical_allergies: 'Sulphonamides',
        is_active: true,
        created_at: new Date(Date.now() - 45 * 86400000).toISOString()
      }
    ];

    // 8. Services
    this.services = [
      {
        id: 'srv-1',
        clinic_id: 'clinic-st-jude',
        name: 'Comprehensive GP Consultation',
        code: 'GP-CONS',
        description: 'In-depth general medical examination and clinical treatment plan',
        duration_mins: 30,
        price_gbp: 95.00,
        is_telemedicine_eligible: true,
        is_active: true
      },
      {
        id: 'srv-2',
        clinic_id: 'clinic-st-jude',
        name: 'HD Video Telemedicine Consult',
        code: 'TELE-GP',
        description: 'Encrypted WebRTC consultation from home or workplace',
        duration_mins: 20,
        price_gbp: 75.00,
        is_telemedicine_eligible: true,
        is_active: true
      },
      {
        id: 'srv-3',
        clinic_id: 'clinic-st-jude',
        name: 'Dermatology Assessment & Dermoscopy',
        code: 'DERM-SCR',
        description: 'Skin lesion analysis, diagnostic dermoscopy and mole mapping',
        duration_mins: 30,
        price_gbp: 130.00,
        is_telemedicine_eligible: true,
        is_active: true
      },
      {
        id: 'srv-4',
        clinic_id: 'clinic-st-jude',
        name: 'Executive Cardiovascular Check',
        code: 'CARDIO-EX',
        description: 'ECG review, lipid risk analysis, QRISK3 score, and arterial profile',
        duration_mins: 45,
        price_gbp: 175.00,
        is_telemedicine_eligible: false,
        is_active: true
      }
    ];

    // 9. Appointments
    const now = new Date();
    const appt1Start = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const appt1End = new Date(now.getTime() + 80 * 60 * 1000).toISOString();

    const appt2Start = new Date(now.getTime() + 180 * 60 * 1000).toISOString();
    const appt2End = new Date(now.getTime() + 210 * 60 * 1000).toISOString();

    const appt3Start = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
    const appt3End = new Date(now.getTime() + 24.5 * 3600 * 1000).toISOString();

    this.appointments = [
      {
        id: 'appt-1',
        clinic_id: 'clinic-st-jude',
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        service_id: 'srv-2',
        start_time: appt1Start,
        end_time: appt1End,
        status: 'confirmed',
        consultation_type: 'video',
        reason_for_visit: 'Follow-up on hypertension medication adjustment and home BP logs',
        no_show_risk_score: 0.11,
        no_show_risk_level: 'low',
        no_show_factors: ['Intake form completed', 'Confirmed via SMS reminder', '0 prior no-shows'],
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'appt-2',
        clinic_id: 'clinic-st-jude',
        patient_id: 'pat-2',
        doctor_id: 'doc-2',
        service_id: 'srv-3',
        start_time: appt2Start,
        end_time: appt2End,
        status: 'scheduled',
        consultation_type: 'in_person',
        reason_for_visit: 'Evaluation of changing pigmented lesion on left forearm',
        no_show_risk_score: 0.28,
        no_show_risk_level: 'medium',
        no_show_factors: ['Lead time > 5 days', 'Unconfirmed reminder'],
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'appt-3',
        clinic_id: 'clinic-st-jude',
        patient_id: 'pat-3',
        doctor_id: 'doc-1',
        service_id: 'srv-1',
        start_time: appt3Start,
        end_time: appt3End,
        status: 'confirmed',
        consultation_type: 'in_person',
        reason_for_visit: 'Routine type-2 diabetes review and HbA1c review',
        no_show_risk_score: 0.09,
        no_show_risk_level: 'low',
        no_show_factors: ['Long standing patient', 'Intake verified'],
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // 10. Intake Forms
    this.intakeForms = [
      {
        id: 'form-standard-gp',
        clinic_id: 'clinic-st-jude',
        title: 'Pre-Consultation Clinical Intake Form',
        description: 'Standard UK healthcare clinical history assessment completed prior to appointment.',
        fields: [
          { id: 'allergies', label: 'Known Allergies or Adverse Drug Reactions', type: 'textarea', required: true },
          { id: 'current_medications', label: 'Current Prescriptions and OTC Supplements', type: 'textarea', required: true },
          { id: 'smoking_status', label: 'Smoking Status', type: 'select', options: ['Never', 'Ex-smoker', 'Active smoker'], required: true },
          { id: 'consent_telehealth', label: 'Consent to secure digital consultation & emergency limitations', type: 'checkbox', required: true }
        ],
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    // 11. Intake Responses
    this.intakeResponses = [
      {
        id: 'resp-1',
        clinic_id: 'clinic-st-jude',
        form_id: 'form-standard-gp',
        appointment_id: 'appt-1',
        patient_id: 'pat-1',
        status: 'submitted',
        demographics: { age: 47, occupation: 'Architect' },
        medical_history: { hypertension: true, asthma: false, diabetes: false },
        allergies: ['Penicillin'],
        current_medications: ['Ramipril 5mg OD'],
        emergency_contact: { name: 'Clara Smith', phone: '+44 7700 900701' },
        consents: { gdpr_consent: true, treatment_consent: true },
        submitted_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        created_at: new Date(Date.now() - 2 * 3600000).toISOString()
      }
    ];

    // 12. Prescription Requests
    this.prescriptionRequests = [
      {
        id: 'req-1',
        clinic_id: 'clinic-st-jude',
        patient_id: 'pat-1',
        medication_name: 'Ramipril Tablets',
        dosage: '5mg',
        frequency: 'Once daily in the morning',
        quantity: '56 tablets (2 months supply)',
        preferred_pharmacy: 'Boots Pharmacy - Marylebone High St',
        patient_reason: 'Refill needed for ongoing blood pressure management. Last BP reading was 124/82 mmHg.',
        status: 'pending',
        safety_check_passed: true,
        safety_flags: ['Dosage matches prior prescription history', 'No contraindicating NSAIDs noted'],
        created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'req-2',
        clinic_id: 'clinic-st-jude',
        patient_id: 'pat-3',
        medication_name: 'Metformin Hydrochloride',
        dosage: '500mg',
        frequency: 'Twice daily with meals',
        quantity: '112 tablets',
        preferred_pharmacy: 'Lloyds Pharmacy - Fitzrovia',
        patient_reason: 'Routine diabetic refill continuation. Blood glucose remains steady at 6.1 mmol/L.',
        status: 'under_review',
        safety_check_passed: true,
        safety_flags: ['Renal panel (eGFR) up to date within past 6 months'],
        created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // 13. Consultation Sessions (WebRTC)
    this.consultationSessions = [
      {
        id: 'session-appt-1',
        clinic_id: 'clinic-st-jude',
        appointment_id: 'appt-1',
        doctor_id: 'doc-1',
        patient_id: 'pat-1',
        room_sid: 'room-appt-1',
        status: 'waiting',
        duration_seconds: 0,
        created_at: new Date().toISOString()
      }
    ];

    // 14. Staff Shifts
    const todayStr = new Date().toISOString().split('T')[0];
    this.shifts = [
      {
        id: 'shift-1',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-doctor-1',
        role: 'doctor',
        shift_date: todayStr,
        start_time: '08:30',
        end_time: '17:00',
        department: 'Cardiology & Outpatient',
        status: 'scheduled',
        user: this.users.find(u => u.id === 'user-doctor-1')
      },
      {
        id: 'shift-2',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-doctor-2',
        role: 'doctor',
        shift_date: todayStr,
        start_time: '09:30',
        end_time: '18:00',
        department: 'Dermatology & Minor Procedures',
        status: 'scheduled',
        user: this.users.find(u => u.id === 'user-doctor-2')
      },
      {
        id: 'shift-3',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-receptionist',
        role: 'receptionist',
        shift_date: todayStr,
        start_time: '08:00',
        end_time: '16:30',
        department: 'Front Reception Desk',
        status: 'scheduled',
        user: this.users.find(u => u.id === 'user-receptionist')
      },
      {
        id: 'shift-4',
        clinic_id: 'clinic-st-jude',
        user_id: 'user-admin',
        role: 'administrator',
        shift_date: todayStr,
        start_time: '08:30',
        end_time: '17:00',
        department: 'Practice Operations & Governance',
        status: 'scheduled',
        user: this.users.find(u => u.id === 'user-admin')
      }
    ];

    // 15. Subscriptions
    this.subscriptions = [
      {
        id: 'sub-st-jude',
        clinic_id: 'clinic-st-jude',
        plan_id: 'plan-professional',
        stripe_customer_id: 'cus_stjude_mock123',
        stripe_subscription_id: 'sub_stjude_mock456',
        status: 'active',
        current_period_start: new Date(Date.now() - 10 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
        cancel_at_period_end: false,
        plan: this.plans.find(p => p.id === 'plan-professional')
      }
    ];

    // 16. Audit Logs
    this.auditLogs = [
      {
        id: 'log-1',
        clinic_id: 'clinic-st-jude',
        actor_user_id: 'user-doctor-1',
        actor_email: 'doctor@stjudehealth.co.uk',
        actor_role: 'doctor',
        action: 'PATIENT_RECORD_VIEWED',
        resource_type: 'patient',
        resource_id: 'pat-1',
        ip_address: '127.0.0.1',
        details: { patient_nhs: '485 920 1823', purpose: 'Pre-consultation history check' },
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }

  // Helper Methods with Entity Hydration
  public getAppointmentsWithDetails(clinicId: string): Appointment[] {
    return this.appointments
      .filter(a => a.clinic_id === clinicId)
      .map(appt => ({
        ...appt,
        patient: this.patients.find(p => p.id === appt.patient_id),
        doctor: this.getDoctorWithDetails(appt.doctor_id),
        service: this.services.find(s => s.id === appt.service_id)
      }));
  }

  public getDoctorWithDetails(doctorId: string): Doctor | undefined {
    const doc = this.doctors.find(d => d.id === doctorId);
    if (!doc) return undefined;
    return {
      ...doc,
      user: this.users.find(u => u.id === doc.user_id)
    };
  }

  public getDoctorsByClinic(clinicId: string): Doctor[] {
    return this.doctors
      .filter(d => d.clinic_id === clinicId)
      .map(d => ({
        ...d,
        user: this.users.find(u => u.id === d.user_id)
      }));
  }

  public getPrescriptionsWithDetails(clinicId: string): PrescriptionRequest[] {
    return this.prescriptionRequests
      .filter(r => r.clinic_id === clinicId)
      .map(req => ({
        ...req,
        patient: this.patients.find(p => p.id === req.patient_id),
        doctor: req.reviewed_by ? this.getDoctorWithDetails(req.reviewed_by) : undefined
      }));
  }

  // ============================================================================
  // Unified Persistent Storage API
  // Delegates to persistent SupabaseRepository when DATA_STORAGE_MODE=supabase
  // Uses in-memory data structures when DATA_STORAGE_MODE=memory (local dev/test)
  // ============================================================================

  public async fetchClinics(userId?: string, isPlatformAdmin: boolean = false): Promise<Clinic[]> {
    if (this.repository) {
      return this.repository.getClinics(userId, isPlatformAdmin);
    }
    if (isPlatformAdmin) return this.clinics;
    return this.clinics;
  }

  public async fetchClinicBySlug(slug: string): Promise<Clinic | null> {
    if (this.repository) {
      return this.repository.getClinicBySlug(slug);
    }
    return this.clinics.find(c => c.slug === slug) || null;
  }

  public async updateClinic(id: string, settings: Record<string, any>): Promise<Clinic> {
    if (this.repository) {
      const updated = await this.repository.updateClinicSettings(id, settings);
      const idx = this.clinics.findIndex(c => c.id === id);
      if (idx !== -1) this.clinics[idx] = updated;
      return updated;
    }
    const clinic = this.clinics.find(c => c.id === id);
    if (!clinic) throw new Error('Clinic not found');
    clinic.settings = { ...clinic.settings, ...settings };
    clinic.updated_at = new Date().toISOString();
    return clinic;
  }

  public async fetchPatients(clinicId: string): Promise<Patient[]> {
    if (this.repository) {
      return this.repository.getPatients(clinicId);
    }
    return this.patients.filter(p => p.clinic_id === clinicId);
  }

  public async fetchPatientById(id: string, clinicId?: string): Promise<Patient | null> {
    if (this.repository) {
      return this.repository.getPatientById(id, clinicId);
    }
    const patient = this.patients.find(p => p.id === id);
    if (!patient) return null;
    if (clinicId && patient.clinic_id !== clinicId) return null;
    return patient;
  }

  public async persistPatient(patient: Patient): Promise<Patient> {
    if (this.repository) {
      const persisted = await this.repository.createPatient(patient);
      this.patients.unshift(persisted);
      return persisted;
    }
    this.patients.unshift(patient);
    return patient;
  }

  public async updatePatient(id: string, updates: Partial<Patient>, clinicId?: string): Promise<Patient> {
    if (this.repository) {
      const updated = await this.repository.updatePatient(id, updates, clinicId);
      const idx = this.patients.findIndex(p => p.id === id);
      if (idx !== -1) this.patients[idx] = updated;
      return updated;
    }
    const patient = this.patients.find(p => p.id === id);
    if (!patient) throw new Error('Patient not found');
    if (clinicId && patient.clinic_id !== clinicId) throw new Error('Tenant isolation violation');
    Object.assign(patient, updates);
    return patient;
  }

  public async deletePatient(id: string, clinicId?: string): Promise<void> {
    if (this.repository) {
      await this.repository.deletePatient(id, clinicId);
    }
    const idx = this.patients.findIndex(p => p.id === id);
    if (idx !== -1) {
      if (clinicId && this.patients[idx].clinic_id !== clinicId) {
        throw new Error('Tenant isolation violation');
      }
      this.patients.splice(idx, 1);
    }
  }

  public async fetchDoctors(clinicId: string): Promise<Doctor[]> {
    if (this.repository) {
      return this.repository.getDoctors(clinicId);
    }
    return this.getDoctorsByClinic(clinicId);
  }

  public async fetchDoctorById(id: string): Promise<Doctor | null> {
    if (this.repository) {
      return this.repository.getDoctorById(id);
    }
    return this.getDoctorWithDetails(id) || null;
  }

  public async fetchAppointments(clinicId: string, patientId?: string): Promise<Appointment[]> {
    if (this.repository) {
      return this.repository.getAppointments(clinicId, patientId);
    }
    let list = this.getAppointmentsWithDetails(clinicId);
    if (patientId) {
      const patient = this.patients.find(p => p.user_id === patientId || p.id === patientId);
      list = patient ? list.filter(a => a.patient_id === patient.id) : [];
    }
    return list;
  }

  public async persistAppointment(appt: Appointment): Promise<Appointment> {
    if (this.repository) {
      const persisted = await this.repository.createAppointment(appt);
      this.appointments.push(persisted);
      return persisted;
    }
    this.appointments.push(appt);
    return appt;
  }

  public async updateAppointment(id: string, status: string, reason?: string): Promise<Appointment> {
    if (this.repository) {
      const updated = await this.repository.updateAppointmentStatus(id, status, reason);
      const idx = this.appointments.findIndex(a => a.id === id);
      if (idx !== -1) this.appointments[idx] = updated;
      return updated;
    }
    const appt = this.appointments.find(a => a.id === id);
    if (!appt) throw new Error('Appointment not found');
    appt.status = status as any;
    if (reason) appt.cancellation_reason = reason;
    if (status === 'checked_in') appt.checked_in_at = new Date().toISOString();
    if (status === 'completed') appt.completed_at = new Date().toISOString();
    appt.updated_at = new Date().toISOString();
    return appt;
  }

  public async fetchPrescriptions(clinicId: string, patientId?: string): Promise<PrescriptionRequest[]> {
    if (this.repository) {
      return this.repository.getPrescriptions(clinicId, patientId);
    }
    let list = this.getPrescriptionsWithDetails(clinicId);
    if (patientId) {
      const patient = this.patients.find(p => p.user_id === patientId || p.id === patientId);
      list = patient ? list.filter(r => r.patient_id === patient.id) : [];
    }
    return list;
  }

  public async persistPrescription(req: PrescriptionRequest): Promise<PrescriptionRequest> {
    if (this.repository) {
      const persisted = await this.repository.createPrescriptionRequest(req);
      this.prescriptionRequests.unshift(persisted);
      return persisted;
    }
    this.prescriptionRequests.unshift(req);
    return req;
  }

  public async reviewPrescription(params: {
    requestId: string;
    doctorId: string;
    status: 'approved' | 'rejected';
    clinicalRationale: string;
  }): Promise<PrescriptionRequest> {
    if (this.repository) {
      const reviewed = await this.repository.reviewPrescriptionRequest(params);
      const idx = this.prescriptionRequests.findIndex(r => r.id === params.requestId);
      if (idx !== -1) this.prescriptionRequests[idx] = reviewed;
      return reviewed;
    }
    const rx = this.prescriptionRequests.find(r => r.id === params.requestId);
    if (!rx) throw new Error('Prescription request not found');
    rx.status = params.status;
    rx.reviewed_by = params.doctorId;
    rx.reviewed_at = new Date().toISOString();
    rx.doctor_notes = params.clinicalRationale;
    rx.updated_at = new Date().toISOString();
    return rx;
  }

  public async fetchIntakeTemplates(clinicId?: string): Promise<IntakeForm[]> {
    if (this.repository) {
      return this.repository.getIntakeTemplates(clinicId);
    }
    return this.intakeForms;
  }

  public async fetchIntakeResponses(clinicId: string): Promise<IntakeResponse[]> {
    if (this.repository) {
      return this.repository.getIntakeResponses(clinicId);
    }
    return this.intakeResponses.filter(r => r.clinic_id === clinicId);
  }

  public async persistIntakeResponse(resp: IntakeResponse): Promise<IntakeResponse> {
    if (this.repository) {
      const persisted = await this.repository.createIntakeResponse(resp);
      this.intakeResponses.unshift(persisted);
      return persisted;
    }
    this.intakeResponses.unshift(resp);
    return resp;
  }

  public async fetchConsultationSession(appointmentId: string): Promise<ConsultationSession | null> {
    if (this.repository) {
      return this.repository.getConsultationSession(appointmentId);
    }
    return this.consultationSessions.find(s => s.appointment_id === appointmentId) || null;
  }

  public async persistConsultationSession(session: ConsultationSession): Promise<ConsultationSession> {
    if (this.repository) {
      const persisted = await this.repository.createConsultationSession(session);
      this.consultationSessions.push(persisted);
      return persisted;
    }
    this.consultationSessions.push(session);
    return session;
  }

  public async fetchShifts(clinicId: string): Promise<StaffShift[]> {
    if (this.repository) {
      return this.repository.getShifts(clinicId);
    }
    return this.shifts.filter(s => s.clinic_id === clinicId);
  }

  public async fetchPlans(): Promise<SubscriptionPlan[]> {
    if (this.repository) {
      return this.repository.getSubscriptionPlans();
    }
    return this.plans;
  }

  public async fetchSubscription(clinicId: string): Promise<ClinicSubscription | null> {
    if (this.repository) {
      return this.repository.getClinicSubscription(clinicId);
    }
    return this.subscriptions.find(s => s.clinic_id === clinicId) || null;
  }

  public async findUserByEmail(email: string): Promise<(UserProfile & { passwordHash?: string }) | null> {
    if (this.repository) {
      return this.repository.getUserByEmail(email);
    }
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public async persistAuditLog(log: Partial<AuditLog>): Promise<void> {
    if (this.repository) {
      await this.repository.createAuditLog(log);
    }
    this.auditLogs.push(log as AuditLog);
  }
}
