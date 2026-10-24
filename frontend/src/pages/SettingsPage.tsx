import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import {
  Settings,
  Building,
  Bell,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Database,
  Smartphone,
  Mail,
  Lock,
  Sparkles
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { clinic } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'booking' | 'system'>('profile');
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Clinic Profile State initialized from clinic
  const [clinicName, setClinicName] = useState<string>(() => clinic?.name || 'St. Jude Private Medical Centre');
  const [cqcRating, setCqcRating] = useState<string>(() => clinic?.cqc_rating || 'Outstanding');
  const [cqcNumber, setCqcNumber] = useState<string>('1-102938481');
  const [phone, setPhone] = useState<string>(() => clinic?.phone || '+44 20 7946 0912');
  const [email, setEmail] = useState<string>(() => clinic?.email || 'reception@stjude-health.co.uk');
  const [address, setAddress] = useState<string>(() => clinic?.address_line1 || '14 Marylebone High Street');
  const [city, setCity] = useState<string>(() => clinic?.city || 'London');
  const [postalCode, setPostalCode] = useState<string>(() => clinic?.postal_code || 'W1G 9PJ');

  // Notifications State
  const [smsEnabled, setSmsEnabled] = useState<boolean>(true);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [reminderLeadTime, setReminderLeadTime] = useState<string>('24');
  const [aiAlertsEnabled, setAiAlertsEnabled] = useState<boolean>(true);
  const [intakeAutoPrompt, setIntakeAutoPrompt] = useState<boolean>(true);

  // Booking Rules State
  const [slotDuration, setSlotDuration] = useState<string>('30');
  const [minNoticeHours, setMinNoticeHours] = useState<string>('2');
  const [allowPublicBooking, setAllowPublicBooking] = useState<boolean>(true);
  const [allowTelehealth, setAllowTelehealth] = useState<boolean>(true);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const clinicId = clinic?.id || 'clinic-st-jude';
      await api.updateClinicSettings(clinicId, {
        name: clinicName,
        cqc_rating: cqcRating,
        phone,
        email,
        address_line1: address,
        city,
        postal_code: postalCode,
        sms_reminders_enabled: smsEnabled,
        email_confirmations_enabled: emailEnabled,
        reminder_lead_time_hours: parseInt(reminderLeadTime, 10),
        ai_no_show_alerts: aiAlertsEnabled,
        intake_prompt_on_booking: intakeAutoPrompt,
        default_slot_duration: parseInt(slotDuration, 10),
        min_advance_booking_hours: parseInt(minNoticeHours, 10),
        allow_public_booking: allowPublicBooking,
        telehealth_enabled: allowTelehealth
      });
      showToast('success', 'Practice settings and preferences successfully saved to local store.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update clinic settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-600" />
            <span>Practice Settings & Preferences</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinic profile, CQC compliance parameters, automated patient notifications, and booking rules.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-2 shrink-0 self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Storage & Environment Notice Banner */}
      <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/80 flex items-start space-x-3 text-xs text-brand-900">
        <Database className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold">ENVIRONMENT: LOCAL DEMONSTRATION & DEV MODE</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-200 text-brand-800">
              SUPABASE OFFLINE (SAFE MOCK LAYER)
            </span>
          </div>
          <p className="text-brand-800 leading-relaxed text-[11px]">
            Data changes made here update the active in-memory repository instantly. All patient records, GMC credentials, and NHS Spine mappings are strictly synthetic demonstrations. External integrations (Twilio, Google Calendar, Stripe) run in verified sandbox simulation mode.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-1 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Clinic Profile & CQC</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-1 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Automated Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('booking')}
          className={`pb-3 px-1 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'booking'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Scheduling & Triage Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`pb-3 px-1 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'system'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Compliance & Data Governance</span>
        </button>
      </div>

      {/* Tab 1: Profile & CQC */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-navy-900">Practice Profile Information</h2>
            <p className="text-xs text-slate-500">Details displayed to patients and referenced on clinical documents</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Practice Legal Name</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">CQC Inspection Rating</label>
              <select
                value={cqcRating}
                onChange={(e) => setCqcRating(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
              >
                <option value="Outstanding">Outstanding (Exemplary Practice)</option>
                <option value="Good">Good (Meets all CQC standards)</option>
                <option value="Requires Improvement">Requires Improvement</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">CQC Provider / Location ID</label>
              <input
                type="text"
                value={cqcNumber}
                onChange={(e) => setCqcNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary Telephone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Practice Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Registered Address Line 1</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">UK Postcode</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-navy-900">Automated Patient Communication Rules</h2>
            <p className="text-xs text-slate-500">Configure reminder channels, lead times, and AI risk dispatching</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-800">SMS Appointment Reminders (Twilio Sandbox)</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Automatically dispatch SMS reminders with 2-way confirmation response tracking.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-800">Email Confirmation & Calendar Invites (.ics)</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Send immediate booking confirmation receipts with Google Calendar / Outlook sync attachments.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-800">Predictive AI No-Show Intervention</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Flag appointments with high no-show risk score (&gt;60%) and prompt reception to follow up.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={aiAlertsEnabled}
                onChange={(e) => setAiAlertsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Standard Reminder Lead Time</label>
                <select
                  value={reminderLeadTime}
                  onChange={(e) => setReminderLeadTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                >
                  <option value="12">12 Hours Prior</option>
                  <option value="24">24 Hours Prior (Standard NHS)</option>
                  <option value="48">48 Hours Prior</option>
                  <option value="72">72 Hours Prior</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Digital Intake Form Prompt</label>
                <select
                  value={intakeAutoPrompt ? 'auto' : 'manual'}
                  onChange={(e) => setIntakeAutoPrompt(e.target.value === 'auto')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                >
                  <option value="auto">Prompt patient automatically via SMS upon booking</option>
                  <option value="manual">Require clinician/reception manual dispatch</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Booking & Triage Rules */}
      {activeTab === 'booking' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-navy-900">Clinic Scheduling & Availability Rules</h2>
            <p className="text-xs text-slate-500">Configure consultation durations and public patient booking limits</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Default Consultation Duration</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
              >
                <option value="15">15 Minutes (Brief Follow-up)</option>
                <option value="30">30 Minutes (Standard Consultation)</option>
                <option value="45">45 Minutes (Extended Clinical Review)</option>
                <option value="60">60 Minutes (Comprehensive Intake)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Minimum Notice for Online Bookings</label>
              <select
                value={minNoticeHours}
                onChange={(e) => setMinNoticeHours(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours (Default)</option>
                <option value="6">6 Hours</option>
                <option value="24">24 Hours</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <label className="flex items-center space-x-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPublicBooking}
                onChange={(e) => setAllowPublicBooking(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="font-bold text-slate-800">Enable Google Business Profile Public Booking Page</span>
                <p className="text-[11px] text-slate-500">
                  Allows prospective patients to book initial consultations via /book/{clinic?.slug || 'st-jude-london'}.
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={allowTelehealth}
                onChange={(e) => setAllowTelehealth(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="font-bold text-slate-800">Enable HD Telemedicine WebRTC Consultations</span>
                <p className="text-[11px] text-slate-500">
                  Activates encrypted in-browser video appointments with integrated SOAP clinical note taking.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Tab 4: Compliance & Data Governance */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-navy-900">UK Healthcare Governance & Architecture</h2>
            <p className="text-xs text-slate-500">Demonstration parameters and Caldicott principles compliance</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800">Caldicott Principle 7</span>
              <p className="text-slate-500 text-[11px]">
                Duty to share clinical information for individual care is as important as the duty to protect patient confidentiality.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800">Envelope Encryption</span>
              <p className="text-slate-500 text-[11px]">
                Pre-consultation digital intake responses encrypted with AES-256-GCM and individual cryptographic keys.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800">Multi-Tenant Isolation</span>
              <p className="text-slate-500 text-[11px]">
                Clinic workspaces are strictly isolated by clinic_id in backend controllers and PostgreSQL RLS policies.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-amber-900 font-bold">
              <Lock className="w-4 h-4 text-amber-700" />
              <span>Demonstration Architecture Note</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              When ready for production staging, set <code className="font-mono bg-amber-100 px-1 rounded">DATA_STORAGE_MODE=supabase</code> and provide Supabase credentials in <code className="font-mono bg-amber-100 px-1 rounded">backend/.env</code>. The backend will automatically switch from the in-memory mock repository to persistent PostgreSQL with Row-Level Security.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
