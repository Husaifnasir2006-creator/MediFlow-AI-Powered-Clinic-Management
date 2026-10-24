import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { PrescriptionRequest, Patient } from '../types';
import {
  Pill,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Stethoscope
} from 'lucide-react';

export const PrescriptionsPage: React.FC = () => {
  const { role } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Review Modal State (Doctor)
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [selectedRx, setSelectedRx] = useState<PrescriptionRequest | null>(null);
  const [clinicalRationale, setClinicalRationale] = useState<string>('');
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');

  // New Request Modal State (Patient / Receptionist)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [patientId, setPatientId] = useState<string>('pat-1');
  const [medName, setMedName] = useState<string>('Ramipril Tablets');
  const [dosage, setDosage] = useState<string>('5mg');
  const [frequency, setFrequency] = useState<string>('Once daily');
  const [quantity, setQuantity] = useState<string>('56 tablets (2 months)');
  const [pharmacy, setPharmacy] = useState<string>('Boots Pharmacy - Marylebone High St');
  const [patientReason, setPatientReason] = useState<string>('Ongoing blood pressure maintenance. BP normal.');

  // Live Safety check status
  const [safetyCheckResult, setSafetyCheckResult] = useState<{ passed: boolean; warnings: string[] } | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.getPrescriptions(),
      api.getPatients()
    ])
      .then(([rxs, pats]) => {
        if (!ignore) {
          setPrescriptions(rxs);
          setPatients(pats);
        }
      })
      .catch(err => {
        if (!ignore) console.error('Failed to load prescriptions:', err);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [role]);

  // Run safety check as user types medication name
  useEffect(() => {
    if (patientId && medName) {
      api.checkPrescriptionSafety(patientId, medName)
        .then(res => setSafetyCheckResult(res))
        .catch(console.error);
    }
  }, [patientId, medName]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.requestRefill({
        patient_id: patientId,
        medication_name: medName,
        dosage,
        frequency,
        quantity,
        preferred_pharmacy: pharmacy,
        patient_reason: patientReason
      });

      setPrescriptions([created, ...prescriptions]);
      setIsRequestModalOpen(false);
      alert('Prescription refill request submitted to clinician review queue.');
    } catch (err) {
      alert('Error creating prescription request: ' + err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRx) return;

    try {
      const updated = await api.reviewPrescription(
        selectedRx.id,
        reviewDecision,
        clinicalRationale,
        'doc-1'
      );

      setPrescriptions(prev => prev.map(p => p.id === updated.id ? updated : p));
      setReviewModalOpen(false);
      setSelectedRx(null);
      setClinicalRationale('');
      alert(`Prescription marked as ${reviewDecision.toUpperCase()} with audit trail.`);
    } catch (err: any) {
      alert('Review failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <Pill className="w-6 h-6 text-purple-600" />
            <span>Prescription Refill & Medication Safety Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated allergy checking, controlled drug screening, and clinician approval audit trails.
          </p>
        </div>

        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Refill Request</span>
        </button>
      </div>

      {/* Safety Notice Callout */}
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-start space-x-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-teal-900">UK Clinical Governance Policy</h2>
          <p className="text-teal-800 mt-0.5 leading-relaxed">
            All repeat prescription refill requests are screened for allergen cross-reactivity and controlled substance restrictions. Refill authorization requires registered GMC clinician approval with recorded rationale.
          </p>
        </div>
      </div>

      {/* Prescription Requests List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {prescriptions.length} Refill Requests in Practice Queue
          </span>
          <span className="text-xs text-slate-400">Electronic Prescribing Protocol</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {prescriptions.map((rx) => {
            const hasAllergyWarning = rx.safety_flags?.some(f => f.includes('ALLERGY') || f.includes('CRITICAL'));
            
            return (
              <div key={rx.id} className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Pill className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-navy-900">{rx.medication_name}</h3>
                      <span className="text-xs font-semibold text-slate-600">{rx.dosage}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        rx.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rx.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : rx.status === 'under_review'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rx.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      <strong>Patient:</strong> {rx.patient ? `${rx.patient.first_name} ${rx.patient.last_name}` : 'Patient Record'} • 
                      <strong> Pharmacy:</strong> {rx.preferred_pharmacy}
                    </p>

                    <p className="text-xs text-slate-600 mt-1 italic">
                      Reason: "{rx.patient_reason}"
                    </p>

                    {/* Safety flags / warnings */}
                    {rx.safety_flags && rx.safety_flags.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {rx.safety_flags.map((flag, idx) => (
                          <div
                            key={idx}
                            className={`text-[11px] font-medium p-1.5 rounded-lg flex items-center gap-1.5 ${
                              hasAllergyWarning
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-teal-50 text-teal-800 border border-teal-200'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Doctor decision notes if reviewed */}
                    {rx.doctor_notes && (
                      <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <strong>Clinician Rationale:</strong> {rx.doctor_notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor Action Button */}
                {['doctor', 'clinic_owner'].includes(role) && rx.status === 'pending' && (
                  <div className="shrink-0">
                    <button
                      onClick={() => {
                        setSelectedRx(rx);
                        setReviewModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <Stethoscope className="w-4 h-4" />
                      <span>Review & Prescribe</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Review Modal for Doctor */}
      {reviewModalOpen && selectedRx && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-premium border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-purple-600" />
                <span>Clinician Refill Review</span>
              </h2>
              <button onClick={() => setReviewModalOpen(false)} className="text-xs font-bold text-slate-400">✕</button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p><strong>Medication:</strong> {selectedRx.medication_name} ({selectedRx.dosage})</p>
              <p><strong>Patient:</strong> {selectedRx.patient?.first_name} {selectedRx.patient?.last_name}</p>
              <p><strong>Reason:</strong> {selectedRx.patient_reason}</p>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Clinical Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('approved')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                      reviewDecision === 'approved' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approve Refill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('rejected')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                      reviewDecision === 'rejected' ? 'bg-rose-50 border-rose-500 text-rose-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Reject / Need Visit</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Clinical Rationale (Logged for Audit)</label>
                <textarea
                  rows={3}
                  required
                  value={clinicalRationale}
                  onChange={(e) => setClinicalRationale(e.target.value)}
                  placeholder="e.g. Blood pressure stabilized on current dose; kidney function stable within last 6 months."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-premium border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-purple-600" />
                <span>Submit Prescription Refill Request</span>
              </h2>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-xs font-bold text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Patient</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} (Allergies: {p.medical_allergies || 'None'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g. Ramipril, Amoxicillin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 5mg, 500mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Frequency</label>
                  <input
                    type="text"
                    required
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="text"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              {/* Live Allergy and Safety check indicator */}
              {safetyCheckResult && safetyCheckResult.warnings.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Clinical Safety Alert</span>
                  </div>
                  {safetyCheckResult.warnings.map((w, idx) => (
                    <p key={idx} className="text-[11px]">{w}</p>
                  ))}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Preferred Community Pharmacy</label>
                <input
                  type="text"
                  required
                  value={pharmacy}
                  onChange={(e) => setPharmacy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Patient Reason / Symptom Status</label>
                <textarea
                  rows={2}
                  required
                  value={patientReason}
                  onChange={(e) => setPatientReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
