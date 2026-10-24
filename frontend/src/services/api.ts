import { UserRole, Appointment, Patient, Doctor, PrescriptionRequest, StaffShift, SubscriptionPlan } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private token: string | null = null;
  private currentRole: UserRole = 'clinic_owner';

  public setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('mediflow_token', token);
    else localStorage.removeItem('mediflow_token');
  }

  public setDemoRole(role: UserRole) {
    this.currentRole = role;
    localStorage.setItem('mediflow_demo_role', role);
  }

  public getDemoRole(): UserRole {
    return (localStorage.getItem('mediflow_demo_role') as UserRole) || this.currentRole;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Demo-Role': this.getDemoRole(),
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Auth & Profile
  public getMe() {
    return this.request<any>('/auth/me');
  }

  public switchDemoRole(role: UserRole) {
    this.setDemoRole(role);
    return this.request<any>(`/auth/demo-switch/${role}`);
  }

  // Clinic
  public getClinics() {
    return this.request<any[]>('/clinics');
  }

  public getClinicBySlug(slug: string) {
    return this.request<any>(`/public/clinics/${slug}`);
  }

  public updateClinicSettings(clinicId: string, settings: any) {
    return this.request<any>(`/clinics/${clinicId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Doctors
  public getDoctors() {
    return this.request<Doctor[]>('/doctors');
  }

  public getDoctorSlots(doctorId: string, date?: string) {
    const query = date ? `?date=${date}` : '';
    return this.request<{ availableSlots: string[]; bookedSlots: string[] }>(`/doctors/${doctorId}/slots${query}`);
  }

  // Patients
  public getPatients() {
    return this.request<Patient[]>('/patients');
  }

  public getPatientById(id: string) {
    return this.request<Patient>(`/patients/${id}`);
  }

  public createPatient(patientData: Partial<Patient>) {
    return this.request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  }

  public updatePatient(id: string, updates: Partial<Patient>) {
    return this.request<Patient>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  public deletePatient(id: string) {
    return this.request<{ success: boolean; message: string }>(`/patients/${id}`, {
      method: 'DELETE'
    });
  }

  // Appointments
  public getAppointments() {
    return this.request<Appointment[]>('/appointments');
  }

  public createAppointment(data: any) {
    return this.request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public updateAppointmentStatus(id: string, status: string, cancellation_reason?: string) {
    return this.request<Appointment>(`/appointments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, cancellation_reason })
    });
  }

  public predictNoShow(features: any) {
    return this.request<{ score: number; riskLevel: string; factors: string[]; recommendation: string }>(
      '/appointments/predict-no-show',
      {
        method: 'POST',
        body: JSON.stringify(features)
      }
    );
  }

  // Prescriptions
  public getPrescriptions() {
    return this.request<PrescriptionRequest[]>('/prescriptions');
  }

  public requestRefill(data: any) {
    return this.request<PrescriptionRequest>('/prescriptions/request', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public checkPrescriptionSafety(patient_id: string, medication_name: string) {
    return this.request<{ passed: boolean; warnings: string[]; requiresSpecialistApproval: boolean }>(
      '/prescriptions/safety-check',
      {
        method: 'POST',
        body: JSON.stringify({ patient_id, medication_name })
      }
    );
  }

  public reviewPrescription(id: string, status: string, clinical_rationale: string, doctor_id?: string) {
    return this.request<PrescriptionRequest>(`/prescriptions/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, clinical_rationale, doctor_id })
    });
  }

  // Intake Forms
  public getIntakeTemplates() {
    return this.request<any[]>('/intake/templates');
  }

  public submitIntakeResponse(data: any) {
    return this.request<any>('/intake/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Telemedicine
  public getTelemedicineSession(appointmentId: string) {
    return this.request<any>(`/telemedicine/session/${appointmentId}`);
  }

  // Rota
  public getShifts() {
    return this.request<StaffShift[]>('/rota/shifts');
  }

  public getRotaPerformance() {
    return this.request<any>('/rota/performance');
  }

  // Analytics
  public getDashboardMetrics() {
    return this.request<any>('/analytics/dashboard');
  }

  // Billing
  public getPlans() {
    return this.request<SubscriptionPlan[]>('/billing/plans');
  }

  public getSubscription() {
    return this.request<any>('/billing/subscription');
  }

  public checkoutBilling(plan_code: string, billing_cycle: 'monthly' | 'annual') {
    return this.request<any>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_code, billing_cycle })
    });
  }
}

export const api = new ApiClient();
