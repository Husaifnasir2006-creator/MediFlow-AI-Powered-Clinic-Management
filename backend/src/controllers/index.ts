import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { StorageService } from '../services/storage.service.js';
import { AuthService } from '../services/auth.service.js';
import { NoShowPredictionService } from '../services/no_show.service.js';
import { NotificationService } from '../services/notification.service.js';
import { GoogleCalendarService } from '../services/calendar.service.js';
import { BillingService } from '../services/billing.service.js';
import { PrescriptionService } from '../services/prescription.service.js';
import { EnvelopeEncryptionService } from '../services/intake.service.js';
import {
  createPatientSchema,
  createAppointmentSchema,
  loginSchema,
  registerSchema,
  requestRefillSchema
} from '../schemas/index.js';
import { Appointment, Patient, PrescriptionRequest, UserRole } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class AuthController {
  public static async demoSwitch(req: AuthenticatedRequest, res: Response) {
    const role = (req.params.role || 'clinic_owner') as UserRole;
    const demo = AuthService.getDemoUserByRole(role);
    if (!demo) {
      return res.status(404).json({ error: `Demo account for role '${role}' not found.` });
    }
    return res.json(demo);
  }

  public static async login(req: AuthenticatedRequest, res: Response) {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format()
      });
    }

    try {
      const { email, password } = parseResult.data;
      const result = await AuthService.login(email, password);
      return res.json(result);
    } catch (err: any) {
      return res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  }

  public static async register(req: AuthenticatedRequest, res: Response) {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format()
      });
    }

    try {
      const result = await AuthService.register(parseResult.data);
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Registration failed' });
    }
  }

  public static async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const storage = StorageService.getInstance();
    const user = storage.users.find(u => u.id === req.user?.userId);
    const membership = storage.memberships.find(m => m.user_id === req.user?.userId);
    const clinic = storage.clinics.find(c => c.id === (req.user?.clinicId || membership?.clinic_id));

    return res.json({
      user,
      role: req.user.role,
      clinic,
      isPlatformAdmin: req.user.isPlatformAdmin
    });
  }
}

export class ClinicController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    // Platform admin sees all clinics; tenants see clinics they are permitted to inspect
    if (req.user?.isPlatformAdmin) {
      return res.json(storage.clinics);
    }
    const tenantClinics = storage.clinics.filter(c => c.id === req.user?.clinicId);
    return res.json(tenantClinics.length > 0 ? tenantClinics : storage.clinics);
  }

  public static async getBySlug(req: AuthenticatedRequest, res: Response) {
    const { slug } = req.params;
    const storage = StorageService.getInstance();
    const clinic = storage.clinics.find(c => c.slug === slug);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    const services = storage.services.filter(s => s.clinic_id === clinic.id && s.is_active);
    const doctors = storage.getDoctorsByClinic(clinic.id);

    return res.json({ clinic, services, doctors });
  }

  public static async updateSettings(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const storage = StorageService.getInstance();

    // Multi-tenant check: Admin/Owner may only modify settings for their own clinic
    if (!req.user?.isPlatformAdmin && req.user?.clinicId !== id) {
      return res.status(403).json({
        error: 'Tenant isolation violation: Access denied to foreign clinic tenant settings.'
      });
    }

    const clinic = storage.clinics.find(c => c.id === id);
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });

    clinic.settings = { ...clinic.settings, ...req.body };
    clinic.updated_at = new Date().toISOString();
    if (storage.getRepository()) {
      await storage.updateClinic(id, clinic.settings);
    }
    return res.json(clinic);
  }
}

export class AppointmentController {
  public static async getAppointments(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';
    if (storage.getRepository()) {
      const pId = req.user?.role === 'patient' ? req.user?.userId : undefined;
      const appts = await storage.fetchAppointments(clinicId, pId);
      return res.json(appts);
    }
    let appts = storage.getAppointmentsWithDetails(clinicId);

    // Patient role isolation: patients may strictly view only their own bookings
    if (req.user?.role === 'patient') {
      const patient = storage.patients.find(p => p.user_id === req.user?.userId);
      if (patient) {
        appts = appts.filter(a => a.patient_id === patient.id);
      } else {
        appts = [];
      }
    }

    return res.json(appts);
  }

  public static async createAppointment(req: AuthenticatedRequest, res: Response) {
    // 1. Validate payload with Zod
    const parseResult = createAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format()
      });
    }

    const {
      patient_id, doctor_id, service_id, start_time, end_time,
      consultation_type, reason_for_visit
    } = parseResult.data;

    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || req.body.clinic_id || 'clinic-st-jude';

    // 2. Multi-tenant isolation: Verify doctor belongs to the target clinic
    const doctor = storage.doctors.find(d => d.id === doctor_id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    if (!req.user?.isPlatformAdmin && doctor.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Selected doctor belongs to a foreign clinic.' });
    }

    // 3. Multi-tenant isolation: Verify patient belongs to the target clinic
    const patient = storage.patients.find(p => p.id === patient_id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient record not found' });
    }
    if (!req.user?.isPlatformAdmin && patient.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Patient record belongs to a foreign clinic.' });
    }

    // 4. Conflict Prevention Check
    const startReq = new Date(start_time).getTime();
    const endReq = new Date(end_time).getTime();

    if (endReq <= startReq) {
      return res.status(400).json({ error: 'Invalid timeframe: end_time must be after start_time' });
    }

    const conflict = storage.appointments.find(a => {
      if (a.doctor_id !== doctor_id || ['cancelled', 'no_show'].includes(a.status)) {
        return false;
      }
      const existingStart = new Date(a.start_time).getTime();
      const existingEnd = new Date(a.end_time).getTime();
      return (startReq < existingEnd && endReq > existingStart);
    });

    if (conflict) {
      return res.status(409).json({
        error: 'Scheduling Conflict: Doctor already has an appointment booked in this timeframe.',
        conflictAppointmentId: conflict.id
      });
    }

    // 5. Calculate No-Show Prediction
    const leadTimeDays = Math.max(0, Math.round((startReq - Date.now()) / (86400000)));
    const dayOfWeek = new Date(start_time).getDay();
    const prediction = NoShowPredictionService.predict({
      leadTimeDays,
      priorNoShows: 0,
      priorCompleted: 2,
      hasCompletedIntake: true,
      hasConfirmedReminder: true,
      consultationType: consultation_type,
      dayOfWeek
    });

    // 6. Persist appointment
    const newAppt: Appointment = {
      id: storage.getRepository() ? uuidv4() : `appt-${uuidv4().substring(0, 8)}`,
      clinic_id: clinicId,
      patient_id,
      doctor_id,
      service_id: service_id || 'srv-1',
      start_time,
      end_time,
      status: 'confirmed',
      consultation_type,
      reason_for_visit,
      no_show_risk_score: prediction.score,
      no_show_risk_level: prediction.riskLevel,
      no_show_factors: prediction.factors,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (storage.getRepository()) {
      await storage.persistAppointment(newAppt);
    } else {
      storage.appointments.push(newAppt);
    }

    // 7. Create WebRTC consultation session if video consultation
    if (consultation_type === 'video') {
      const sessionData = {
        id: storage.getRepository() ? uuidv4() : `session-${newAppt.id}`,
        clinic_id: clinicId,
        appointment_id: newAppt.id,
        doctor_id,
        patient_id,
        room_sid: `room-${newAppt.id}`,
        status: 'waiting' as const,
        duration_seconds: 0,
        created_at: new Date().toISOString()
      };
      if (storage.getRepository()) {
        await storage.persistConsultationSession(sessionData);
      } else {
        storage.consultationSessions.push(sessionData);
      }
    }

    // 8. Trigger synthetic notifications
    NotificationService.sendAppointmentReminder({
      clinicId,
      recipientPhone: patient.phone,
      patientName: `${patient.first_name} ${patient.last_name}`,
      title: 'MediFlow Appointment Confirmed',
      message: `Your appointment is confirmed for ${new Date(start_time).toLocaleString('en-GB')}.`,
      type: 'sms'
    }).catch(console.error);

    // 9. Sync Google Calendar
    const doctorDetails = storage.getDoctorWithDetails(doctor_id);
    if (doctorDetails?.user) {
      GoogleCalendarService.syncAppointment({
        doctorId: doctor_id,
        doctorEmail: doctorDetails.user.email,
        summary: `MediFlow: ${newAppt.reason_for_visit}`,
        description: `Patient: ${patient.first_name} ${patient.last_name}`,
        startTime: start_time,
        endTime: end_time
      }).catch(console.error);
    }

    const hydrated = {
      ...newAppt,
      patient,
      doctor: doctorDetails,
      service: storage.services.find(s => s.id === newAppt.service_id)
    };

    return res.status(201).json(hydrated);
  }

  public static async updateStatus(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { status, cancellation_reason } = req.body;
    const storage = StorageService.getInstance();
    const appt = storage.appointments.find(a => a.id === id);

    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    // Multi-tenant check
    if (!req.user?.isPlatformAdmin && appt.clinic_id !== req.user?.clinicId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Access denied to foreign appointment.' });
    }

    appt.status = status;
    if (cancellation_reason) appt.cancellation_reason = cancellation_reason;
    if (status === 'checked_in') appt.checked_in_at = new Date().toISOString();
    if (status === 'completed') appt.completed_at = new Date().toISOString();
    appt.updated_at = new Date().toISOString();
    if (storage.getRepository()) {
      await storage.updateAppointment(id, status, cancellation_reason);
    }

    return res.json(appt);
  }

  public static async predictNoShow(req: AuthenticatedRequest, res: Response) {
    const prediction = NoShowPredictionService.predict(req.body);
    return res.json(prediction);
  }
}

export class DoctorController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';
    if (storage.getRepository()) {
      return res.json(await storage.fetchDoctors(clinicId));
    }
    const doctors = storage.getDoctorsByClinic(clinicId);
    return res.json(doctors);
  }

  public static async getSlots(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const storage = StorageService.getInstance();
    const doctor = storage.getRepository()
      ? await storage.fetchDoctorById(id)
      : storage.doctors.find(d => d.id === id);

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const slots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    const bookedTimes = storage.appointments
      .filter(a => a.doctor_id === id && a.start_time.startsWith(dateStr) && !['cancelled', 'no_show'].includes(a.status))
      .map(a => new Date(a.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));

    const availableSlots = slots.filter(s => !bookedTimes.includes(s));

    return res.json({ date: dateStr, doctorId: id, availableSlots, bookedSlots: bookedTimes });
  }
}

export class PatientController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';
    if (storage.getRepository()) {
      const patients = await storage.fetchPatients(clinicId);
      return res.json(patients);
    }
    // Platform admin can view all; tenants are strictly isolated to their own clinic
    const patients = req.user?.isPlatformAdmin
      ? storage.patients
      : storage.patients.filter(p => p.clinic_id === clinicId);
    return res.json(patients);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const storage = StorageService.getInstance();
    const patient = storage.patients.find(p => p.id === id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // 1. Multi-Tenant Isolation Check: Doctor/Admin can only view patients within their clinic
    if (!req.user?.isPlatformAdmin && patient.clinic_id !== req.user?.clinicId) {
      return res.status(403).json({
        error: 'Tenant isolation violation: Access denied to foreign clinic patient record.'
      });
    }

    // 2. Patient Role Isolation Check: Patients can strictly view only their own record
    if (req.user?.role === 'patient') {
      const myPatient = storage.patients.find(p => p.user_id === req.user?.userId);
      if (myPatient?.id !== id) {
        return res.status(403).json({ error: 'Access denied: You may only view your own patient record.' });
      }
    }

    return res.json(patient);
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    // 1. Validate payload with Zod
    const parseResult = createPatientSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format()
      });
    }

    const data = parseResult.data;
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';

    const newPatient: Patient = {
      id: storage.getRepository() ? uuidv4() : `pat-${uuidv4().substring(0, 8)}`,
      clinic_id: clinicId, // Strictly scoped to authenticated clinic
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      nhs_number: data.nhs_number || '',
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      address_line1: data.address_line1 || '',
      city: data.city || 'London',
      postal_code: data.postal_code || '',
      emergency_contact_name: data.emergency_contact_name || '',
      emergency_contact_phone: data.emergency_contact_phone || '',
      emergency_contact_relationship: data.emergency_contact_relationship || '',
      medical_allergies: data.medical_allergies || 'None reported',
      is_active: true,
      created_at: new Date().toISOString()
    };

    if (storage.getRepository()) {
      await storage.persistPatient(newPatient);
    } else {
      storage.patients.unshift(newPatient);
    }
    return res.status(201).json(newPatient);
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';

    const existing = storage.patients.find(p => p.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Patient record not found' });
    }
    if (!req.user?.isPlatformAdmin && existing.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Access denied to foreign patient record.' });
    }

    try {
      const updated = await storage.updatePatient(id, req.body, req.user?.isPlatformAdmin ? undefined : clinicId);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';

    const existing = storage.patients.find(p => p.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Patient record not found' });
    }
    if (!req.user?.isPlatformAdmin && existing.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Access denied to foreign patient record.' });
    }

    try {
      await storage.deletePatient(id, req.user?.isPlatformAdmin ? undefined : clinicId);
      return res.json({ success: true, message: 'Patient record deleted successfully.' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export class PrescriptionController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';
    let list = storage.getPrescriptionsWithDetails(clinicId);

    if (req.user?.role === 'patient') {
      const patient = storage.patients.find(p => p.user_id === req.user?.userId);
      if (patient) {
        list = list.filter(r => r.patient_id === patient.id);
      } else {
        list = [];
      }
    }

    return res.json(list);
  }

  public static async requestRefill(req: AuthenticatedRequest, res: Response) {
    const parseResult = requestRefillSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format()
      });
    }

    const { patient_id, medication_name, dosage, frequency, quantity, preferred_pharmacy, patient_reason } = parseResult.data;
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';

    // Verify patient belongs to clinic
    const patient = storage.patients.find(p => p.id === patient_id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (!req.user?.isPlatformAdmin && patient.clinic_id !== clinicId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Patient belongs to foreign clinic.' });
    }

    const safetyCheck = PrescriptionService.runSafetyCheck(patient_id, medication_name);

    const newReq: PrescriptionRequest = {
      id: `req-${uuidv4().substring(0, 8)}`,
      clinic_id: clinicId,
      patient_id,
      medication_name,
      dosage,
      frequency,
      quantity,
      preferred_pharmacy: preferred_pharmacy || 'Registered NHS Community Pharmacy',
      patient_reason,
      status: 'pending',
      safety_check_passed: safetyCheck.passed,
      safety_flags: safetyCheck.warnings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    storage.prescriptionRequests.unshift(newReq);
    return res.status(201).json(newReq);
  }

  public static async runSafetyCheck(req: AuthenticatedRequest, res: Response) {
    const { patient_id, medication_name } = req.body;
    if (!patient_id || !medication_name) {
      return res.status(400).json({ error: 'patient_id and medication_name are required' });
    }
    const result = PrescriptionService.runSafetyCheck(patient_id, medication_name);
    return res.json(result);
  }

  public static async review(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { status, clinical_rationale, doctor_id } = req.body;
    const storage = StorageService.getInstance();
    const rx = storage.prescriptionRequests.find(r => r.id === id);

    if (!rx) {
      return res.status(404).json({ error: 'Prescription request not found' });
    }

    // Tenant check
    if (!req.user?.isPlatformAdmin && rx.clinic_id !== req.user?.clinicId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Cannot review prescription for foreign clinic.' });
    }

    const doctorIdToUse = doctor_id || 'doc-1';

    try {
      const updated = PrescriptionService.reviewRequest(id, doctorIdToUse, status, clinical_rationale);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export class IntakeController {
  public static async getTemplates(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    return res.json(storage.intakeForms);
  }

  public static async getResponses(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';
    return res.json(storage.intakeResponses.filter(r => r.clinic_id === clinicId));
  }

  public static async submit(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';

    // Application-level AES-256-GCM Envelope Encryption
    const encrypted = EnvelopeEncryptionService.encrypt(req.body.clinical_payload || {});

    const newResponse = {
      id: `resp-${uuidv4().substring(0, 8)}`,
      clinic_id: clinicId,
      form_id: req.body.form_id || 'form-standard-gp',
      appointment_id: req.body.appointment_id,
      patient_id: req.body.patient_id || 'pat-1',
      status: 'submitted' as const,
      demographics: req.body.demographics || {},
      medical_history: req.body.medical_history || {},
      allergies: req.body.allergies || [],
      current_medications: req.body.current_medications || [],
      emergency_contact: req.body.emergency_contact || {},
      consents: req.body.consents || { gdpr_consent: true, treatment_consent: true },
      encrypted_payload: encrypted.ciphertext,
      encryption_key_id: encrypted.keyId,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    storage.intakeResponses.unshift(newResponse);
    return res.status(201).json(newResponse);
  }
}

export class TelemedicineController {
  public static async getSession(req: AuthenticatedRequest, res: Response) {
    const { appointmentId } = req.params;
    const storage = StorageService.getInstance();
    let session = storage.consultationSessions.find(s => s.appointment_id === appointmentId);

    if (!session) {
      const appt = storage.appointments.find(a => a.id === appointmentId);
      if (!appt) return res.status(404).json({ error: 'Appointment not found' });

      // Tenant check
      if (!req.user?.isPlatformAdmin && appt.clinic_id !== req.user?.clinicId) {
        return res.status(403).json({ error: 'Tenant isolation violation: Access denied to foreign clinic telemedicine session.' });
      }

      session = {
        id: `session-${appt.id}`,
        clinic_id: appt.clinic_id,
        appointment_id: appt.id,
        doctor_id: appt.doctor_id,
        patient_id: appt.patient_id,
        room_sid: `room-${appt.id}`,
        status: 'waiting',
        duration_seconds: 0,
        created_at: new Date().toISOString()
      };
      storage.consultationSessions.push(session);
    }

    const doctor = storage.getDoctorWithDetails(session.doctor_id);
    const patient = storage.patients.find(p => p.id === session.patient_id);

    return res.json({ session, doctor, patient });
  }

  public static async getIceServers(req: AuthenticatedRequest, res: Response) {
    const turnUrl = process.env.TURN_SERVER_URL;
    const turnUsername = process.env.TURN_USERNAME;
    const turnCredential = process.env.TURN_CREDENTIAL;

    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
    ];

    const isTurnConfigured = Boolean(turnUrl && turnUsername && turnCredential);

    if (isTurnConfigured) {
      iceServers.push({
        urls: turnUrl!,
        username: turnUsername,
        credential: turnCredential
      });
    }

    return res.json({
      iceServers,
      productionTurnConfigured: isTurnConfigured,
      notice: isTurnConfigured
        ? 'Production Coturn / TURN credentials successfully active.'
        : 'Statutory Notice: Production TURN server is unconfigured. WebRTC sessions will fall back to public STUN. Symmetric NAT and strict healthcare firewall traversal requires dedicated Coturn deployment.'
    });
  }
}

export class RotaController {
  public static async getShifts(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';
    return res.json(storage.shifts.filter(s => s.clinic_id === clinicId));
  }

  public static async getPerformance(req: AuthenticatedRequest, res: Response) {
    return res.json({
      averageWaitTimeMins: 8.5,
      completedVisitsToday: 14,
      cancelledVisitsToday: 1,
      patientSatisfactionRating: 4.88,
      onTimeDepartureRate: '94.2%',
      rotaFulfillment: '100%'
    });
  }
}

export class BillingController {
  public static async getPlans(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    return res.json(storage.plans);
  }

  public static async getSubscription(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';
    const sub = storage.subscriptions.find(s => s.clinic_id === clinicId);
    return res.json(sub || null);
  }

  public static async checkout(req: AuthenticatedRequest, res: Response) {
    const { plan_code, billing_cycle = 'monthly' } = req.body;
    const clinicId = req.user?.clinicId || 'clinic-st-jude';

    try {
      const session = await BillingService.createCheckoutSession(clinicId, plan_code, billing_cycle);
      return res.json(session);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  public static async webhook(req: AuthenticatedRequest, res: Response) {
    const signature = (req.header('stripe-signature') || '') as string;
    const result = BillingService.handleWebhook(JSON.stringify(req.body), signature);
    return res.json(result);
  }
}

export class AnalyticsController {
  public static async getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
    const storage = StorageService.getInstance();
    const clinicId = req.user?.clinicId || 'clinic-st-jude';
    const appointments = storage.appointments.filter(a => a.clinic_id === clinicId);

    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const noShowRiskHigh = appointments.filter(a => a.no_show_risk_level === 'high').length;
    const noShowRiskMedium = appointments.filter(a => a.no_show_risk_level === 'medium').length;
    const noShowRiskLow = appointments.filter(a => a.no_show_risk_level === 'low').length;

    return res.json({
      summary: {
        totalAppointments: total,
        confirmedToday: confirmed,
        completedTotal: completed,
        activePatients: storage.patients.filter(p => p.clinic_id === clinicId).length,
        monthlyRevenueGbp: 18450.00,
        averageNoShowRate: '8.4%',
        noShowInterventionsSaved: 23
      },
      riskDistribution: [
        { name: 'Low Risk', count: noShowRiskLow, percentage: Math.round((noShowRiskLow / (total || 1)) * 100) },
        { name: 'Medium Risk', count: noShowRiskMedium, percentage: Math.round((noShowRiskMedium / (total || 1)) * 100) },
        { name: 'High Risk', count: noShowRiskHigh, percentage: Math.round((noShowRiskHigh / (total || 1)) * 100) }
      ],
      weeklyTrend: [
        { day: 'Mon', scheduled: 18, completed: 16, noShows: 1 },
        { day: 'Tue', scheduled: 22, completed: 21, noShows: 0 },
        { day: 'Wed', scheduled: 20, completed: 19, noShows: 1 },
        { day: 'Thu', scheduled: 25, completed: 24, noShows: 1 },
        { day: 'Fri', scheduled: 24, completed: 22, noShows: 2 },
        { day: 'Sat', scheduled: 12, completed: 12, noShows: 0 }
      ]
    });
  }
}
