import { Router } from 'express';
import {
  AuthController,
  ClinicController,
  AppointmentController,
  DoctorController,
  PatientController,
  PrescriptionController,
  IntakeController,
  TelemedicineController,
  RotaController,
  BillingController,
  AnalyticsController
} from '../controllers/index.js';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Health routes
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MediFlow Clinic Management API',
    version: '1.0.0',
    market: 'UK (NHS/Private Healthcare Standards)',
    timestamp: new Date().toISOString()
  });
});

// Demo switch & Auth
router.get('/auth/demo-switch/:role', AuthController.demoSwitch);
router.post('/auth/login', AuthController.login);
router.post('/auth/register', AuthController.register);
router.get('/auth/me', authMiddleware, AuthController.me);

// Public Clinic & Booking Routes (e.g. for Google Business Profile booking /book/:slug)
router.get('/public/clinics/:slug', ClinicController.getBySlug);
router.post('/public/appointments', AppointmentController.createAppointment);

// Authenticated Clinic Operations
router.use(authMiddleware);

// Clinics
router.get('/clinics', ClinicController.getAll);
router.get('/clinics/:slug', ClinicController.getBySlug);
router.put('/clinics/:id/settings', requireRole(['clinic_owner', 'administrator']), ClinicController.updateSettings);

// Doctors
router.get('/doctors', DoctorController.getAll);
router.get('/doctors/:id/slots', DoctorController.getSlots);

// Patients
router.get('/patients', requireRole(['clinic_owner', 'administrator', 'doctor', 'receptionist']), PatientController.getAll);
router.get('/patients/:id', PatientController.getById);
router.post('/patients', requireRole(['clinic_owner', 'administrator', 'doctor', 'receptionist']), PatientController.create);
router.put('/patients/:id', requireRole(['clinic_owner', 'administrator', 'doctor', 'receptionist']), PatientController.update);
router.delete('/patients/:id', requireRole(['clinic_owner', 'administrator']), PatientController.delete);

// Appointments
router.get('/appointments', AppointmentController.getAppointments);
router.post('/appointments', AppointmentController.createAppointment);
router.put('/appointments/:id/status', AppointmentController.updateStatus);
router.post('/appointments/predict-no-show', AppointmentController.predictNoShow);

// Prescriptions
router.get('/prescriptions', PrescriptionController.getAll);
router.post('/prescriptions/request', PrescriptionController.requestRefill);
router.post('/prescriptions/safety-check', PrescriptionController.runSafetyCheck);
router.put('/prescriptions/:id/review', requireRole(['doctor', 'clinic_owner']), PrescriptionController.review);

// Intake Forms
router.get('/intake/templates', IntakeController.getTemplates);
router.get('/intake/responses', IntakeController.getResponses);
router.post('/intake/submit', IntakeController.submit);

// Telemedicine
router.get('/telemedicine/session/:appointmentId', TelemedicineController.getSession);
router.get('/telemedicine/ice-servers', TelemedicineController.getIceServers);

// Rota & Staff Performance
router.get('/rota/shifts', RotaController.getShifts);
router.get('/rota/performance', requireRole(['clinic_owner', 'administrator']), RotaController.getPerformance);

// Analytics
router.get('/analytics/dashboard', requireRole(['clinic_owner', 'administrator', 'platform_owner']), AnalyticsController.getDashboardMetrics);

// Billing & Stripe
router.get('/billing/plans', BillingController.getPlans);
router.get('/billing/subscription', BillingController.getSubscription);
router.post('/billing/checkout', requireRole(['clinic_owner', 'platform_owner']), BillingController.checkout);
router.post('/billing/webhook', BillingController.webhook);

export default router;
