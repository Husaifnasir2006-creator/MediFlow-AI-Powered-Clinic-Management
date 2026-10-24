import { StorageService } from './storage.service.js';
import { PrescriptionRequest, PrescriptionStatus } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface PrescriptionSafetyCheckResult {
  passed: boolean;
  warnings: string[];
  requiresSpecialistApproval: boolean;
}

export class PrescriptionService {
  public static runSafetyCheck(patientId: string, medicationName: string): PrescriptionSafetyCheckResult {
    const storage = StorageService.getInstance();
    const patient = storage.patients.find(p => p.id === patientId);
    const warnings: string[] = [];
    let requiresSpecialistApproval = false;

    if (!patient) {
      return { passed: false, warnings: ['Patient record not found'], requiresSpecialistApproval: true };
    }

    const medLower = medicationName.toLowerCase();
    const allergiesLower = (patient.medical_allergies || '').toLowerCase();

    // 1. Cross-allergy checking
    if (allergiesLower.includes('penicillin') && (medLower.includes('amoxicillin') || medLower.includes('penicillin') || medLower.includes('ampicillin'))) {
      warnings.push(`CRITICAL ALLERGY ALERT: Patient has documented allergy to ${patient.medical_allergies}`);
    }

    if (allergiesLower.includes('aspirin') && (medLower.includes('ibuprofen') || medLower.includes('naproxen') || medLower.includes('aspirin'))) {
      warnings.push(`NSAID/Aspirin cross-reactivity warning detected`);
    }

    // 2. High-risk controlled substance flag (UK Schedule 2-4)
    const controlledList = ['morphine', 'tramadol', 'codeine', 'diazepam', 'lorazepam', 'pregabalin', 'gabapentin'];
    if (controlledList.some(c => medLower.includes(c))) {
      warnings.push('Controlled substance policy: In-person consultation or GMC specialist approval mandatory.');
      requiresSpecialistApproval = true;
    }

    // 3. Duplicate active pending requests
    const activeRequests = storage.prescriptionRequests.filter(
      r => r.patient_id === patientId && r.medication_name.toLowerCase() === medLower && ['pending', 'under_review'].includes(r.status)
    );
    if (activeRequests.length > 0) {
      warnings.push('Duplicate request: Patient already has an active pending refill request for this medication.');
    }

    const passed = !warnings.some(w => w.startsWith('CRITICAL'));

    return {
      passed,
      warnings,
      requiresSpecialistApproval
    };
  }

  public static reviewRequest(
    requestId: string,
    doctorId: string,
    status: 'approved' | 'rejected',
    clinicalRationale: string
  ): PrescriptionRequest {
    const storage = StorageService.getInstance();
    const req = storage.prescriptionRequests.find(r => r.id === requestId);

    if (!req) {
      throw new Error('Prescription request not found');
    }

    const doctor = storage.doctors.find(d => d.id === doctorId);
    if (!doctor) {
      throw new Error('Reviewing clinician not authorized or GMC registration missing');
    }

    req.status = status;
    req.reviewed_by = doctorId;
    req.reviewed_at = new Date().toISOString();
    req.doctor_notes = clinicalRationale;
    req.updated_at = new Date().toISOString();

    // Audit log
    storage.auditLogs.push({
      id: uuidv4(),
      clinic_id: req.clinic_id,
      actor_user_id: doctor.user_id,
      actor_role: 'doctor',
      action: status === 'approved' ? 'PRESCRIPTION_APPROVED' : 'PRESCRIPTION_REJECTED',
      resource_type: 'prescription_request',
      resource_id: req.id,
      details: {
        medication: req.medication_name,
        dosage: req.dosage,
        patient_id: req.patient_id,
        clinicalRationale
      },
      created_at: new Date().toISOString()
    });

    return req;
  }
}
