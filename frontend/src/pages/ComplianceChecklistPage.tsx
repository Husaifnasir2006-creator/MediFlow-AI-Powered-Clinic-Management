import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Scale,
  KeyRound,
  FileCheck
} from 'lucide-react';

export const ComplianceChecklistPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Compliance & Security Readiness Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              UK GDPR, Data Protection Act 2018, NHS Caldicott Principles, and CQC Digital Standards
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Regulatory Notice Banner */}
      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
        <div className="flex items-center space-x-2 font-bold text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Statutory Compliance Notice (Independent Legal Validation Required)</span>
        </div>
        <p className="leading-relaxed">
          In strict accordance with professional healthcare regulations, <strong>MediFlow is not and cannot claim to be "certified" under UK GDPR or HIPAA</strong> as no such unilateral software certification legally exists. This platform implements rigorous technical controls, least-privilege architecture, AES-256 envelope encryption, and audit logs. Independent clinical safety review (DCB0129 / DCB0160), legal Data Protection Impact Assessments (DPIA), and institutional Data Processing Agreements (DPA) must be formally executed prior to deployment with live clinical patient records.
        </p>
      </div>

      {/* Grid of Compliance Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pillar 1: UK GDPR & DPA 2018 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <Scale className="w-5 h-5 text-brand-600" />
            <h2 className="text-sm font-bold text-navy-900">1. UK GDPR & Data Protection Act 2018</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Lawful Basis for Processing:</strong>
                <p className="text-slate-500">Explicit consent & provision of healthcare services under Article 6(1)(a) & Article 9(2)(h) special category data.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Data Subject Rights (SAR & Erasure):</strong>
                <p className="text-slate-500">Automated patient export endpoints with statutory clinical record retention exceptions respected.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Multi-Tenant Isolation:</strong>
                <p className="text-slate-500">PostgreSQL Row-Level Security (RLS) ensures clinic data cannot be accessed across practice tenants.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 2: NHS Caldicott Principles */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-bold text-navy-900">2. NHS Caldicott Principles (UK Healthcare)</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Principle 1 & 2 (Justify Purpose & Minimization):</strong>
                <p className="text-slate-500">Every clinical note and prescription action requires an authorized clinician with explicit clinical rationale.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Principle 3 (Strict Need-to-Know Access):</strong>
                <p className="text-slate-500">Receptionists cannot access clinical notes; doctors cannot view unrelated patient records without clinical assignment.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Principle 4 (Duty to Share for Care):</strong>
                <p className="text-slate-500">Emergency contact and critical allergy alerts surface immediately on active consultation queues.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 3: Encryption & Key Management */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <KeyRound className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-bold text-navy-900">3. Cryptographic Controls & Key Separation</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Application-Level Envelope Encryption:</strong>
                <p className="text-slate-500">Digital intake data is encrypted using AES-256-GCM. Data Encryption Keys (DEKs) are unwrapped via managed KMS keys.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">In-Transit Encryption:</strong>
                <p className="text-slate-500">Strict TLS 1.3 for API endpoints; DTLS-SRTP encryption for peer-to-peer WebRTC consultation media streams.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 4: Production Deployment Gates */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-navy-900">4. Pre-Production Validation Requirements</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-800">1. DCB0129 Clinical Safety Case Report:</strong>
              <p className="text-slate-500 mt-0.5">Formal appointment of a Clinical Safety Officer (CSO) to sign off clinical hazard logs.</p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-800">2. External Penetration Testing & CREST Audit:</strong>
              <p className="text-slate-500 mt-0.5">Third-party ethical hacking verification of multi-tenant boundaries and API sanitization.</p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-800">3. ICO Registration & DPA Execution:</strong>
              <p className="text-slate-500 mt-0.5">Clinic controller and MediFlow processor Data Processing Agreements executed.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
