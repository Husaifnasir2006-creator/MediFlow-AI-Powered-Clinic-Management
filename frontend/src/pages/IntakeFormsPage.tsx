import React, { useState } from 'react';
import { api } from '../services/api';
import {
  FileText,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Send,
  Save,
  AlertTriangle,
  UserCheck,
  KeyRound
} from 'lucide-react';

export const IntakeFormsPage: React.FC = () => {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [encryptionDetails, setEncryptionDetails] = useState<any>(null);

  // Form Fields
  const [allergies, setAllergies] = useState<string>('Penicillin (developed mild hives in 2018)');
  const [medications, setMedications] = useState<string>('Ramipril 5mg daily, Vitamin D3 1000 IU');
  const [smoking, setSmoking] = useState<string>('Never');
  const [medicalConditions, setMedicalConditions] = useState<string>('Essential Hypertension (diagnosed 2021). No cardiac events.');
  const [gdprConsent, setGdprConsent] = useState<boolean>(true);
  const [telehealthConsent, setTelehealthConsent] = useState<boolean>(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.submitIntakeResponse({
        form_id: 'form-standard-gp',
        appointment_id: 'appt-1',
        patient_id: 'pat-1',
        demographics: { age: 47, occupation: 'Architect' },
        medical_history: { conditions: medicalConditions, smoking },
        allergies: [allergies],
        current_medications: [medications],
        consents: { gdprConsent, telehealthConsent },
        clinical_payload: {
          allergies,
          medications,
          medicalConditions,
          smokingStatus: smoking,
          submittedAt: new Date().toISOString()
        }
      });

      setEncryptionDetails({
        keyId: response.encryption_key_id,
        ciphertextPreview: response.encrypted_payload?.substring(0, 32) + '...'
      });
      setSubmitted(true);
    } catch (err) {
      alert('Error submitting intake form: ' + err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Pre-Consultation Digital Intake Form</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard UK Healthcare Clinical Assessment • AES-256 Envelope Encrypted
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>AES-256-GCM Envelope Encryption</span>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-soft text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900">Digital Intake Form Encrypted & Submitted</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Your confidential clinical responses have been sealed with separate envelope-encrypted keys and placed in your attending clinician's pre-appointment review tray.
            </p>
          </div>

          {encryptionDetails && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-md mx-auto text-xs space-y-1 font-mono">
              <div className="flex items-center gap-1.5 text-teal-700 font-bold">
                <KeyRound className="w-4 h-4" />
                <span>KMS Key Reference:</span>
              </div>
              <p className="text-slate-600">{encryptionDetails.keyId}</p>
              <div className="pt-2 text-[11px] text-slate-400">
                Ciphertext: {encryptionDetails.ciphertextPreview}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setSubmitted(false)}
              className="px-5 py-2 text-xs font-semibold bg-brand-600 text-white rounded-xl hover:bg-brand-700"
            >
              Edit Responses
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Known Allergies */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h2 className="text-sm font-bold text-navy-900">1. Documented Allergies & Drug Sensitivities</h2>
            </div>
            <p className="text-xs text-slate-500">
              List any adverse reactions to antibiotics, NSAIDs, latex, local anesthetics, or foods.
            </p>
            <textarea
              rows={2}
              required
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-500/20 font-medium"
            />
          </div>

          {/* Section 2: Current Prescriptions & Medications */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-sm font-bold text-navy-900">2. Current Medications & Dosages</h2>
            </div>
            <p className="text-xs text-slate-500">
              Include prescription medicines, over-the-counter supplements, vitamins, and inhalers.
            </p>
            <textarea
              rows={2}
              required
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-500/20 font-medium"
            />
          </div>

          {/* Section 3: Lifestyle & History */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-navy-900">3. Relevant Medical History & Lifestyle</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Smoking / Nicotine Status</label>
                <select
                  value={smoking}
                  onChange={(e) => setSmoking(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                >
                  <option value="Never">Never smoked</option>
                  <option value="Ex-smoker">Ex-smoker (cessation &gt; 1 yr)</option>
                  <option value="Active smoker">Active smoker (&lt; 10/day)</option>
                  <option value="Heavy smoker">Active smoker (&gt; 10/day)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chronic Medical Conditions</label>
                <input
                  type="text"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 4: GDPR Consents & Caldicott Acknowledgement */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-navy-900">4. UK GDPR & Caldicott Patient Consent</h2>
            </div>

            <label className="flex items-start space-x-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
                className="mt-1 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I understand that my clinical data is encrypted in transit and at rest in accordance with the Data Protection Act 2018 and UK GDPR, and will only be accessed by authorized healthcare clinicians directly involved in my care.
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={telehealthConsent}
                onChange={(e) => setTelehealthConsent(e.target.checked)}
                className="mt-1 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I consent to digital clinical record review and acknowledge that remote telehealth consultations are subject to clinical suitability and emergency care protocols.
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-slate-400" />
              <span>Save Draft</span>
            </button>
            <button
              type="submit"
              disabled={!gdprConsent || !telehealthConsent}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Submit Encrypted Form</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
