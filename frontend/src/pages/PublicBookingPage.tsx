import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MapPin,
  Video,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

const TODAY_ISO = new Date().toISOString().split('T')[0];

export const PublicBookingPage: React.FC = () => {
  const { clinicSlug } = useParams<{ clinicSlug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_ISO);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [consultationType, setConsultationType] = useState<'in_person' | 'video'>('in_person');
  const [patientName, setPatientName] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    const slug = clinicSlug || 'st-jude-london';
    api.getClinicBySlug(slug)
      .then(res => {
        setData(res);
        if (res.services?.length > 0) setSelectedServiceId(res.services[0].id);
        if (res.doctors?.length > 0) setSelectedDoctorId(res.doctors[0].id);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [clinicSlug]);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      api.getDoctorSlots(selectedDoctorId, selectedDate)
        .then(res => {
          setAvailableSlots(res.availableSlots);
          setSelectedTime(prev => (res.availableSlots.length > 0 && !res.availableSlots.includes(prev) ? res.availableSlots[0] : prev));
        })
        .catch(console.error);
    }
  }, [selectedDoctorId, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setSubmitting(true);
    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      const endTime = new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();

      // Creates appointment under clinic
      await api.createAppointment({
        clinic_id: data.clinic.id,
        patient_id: 'pat-1', // maps to guest/registered patient
        doctor_id: selectedDoctorId,
        service_id: selectedServiceId,
        start_time: startTime,
        end_time: endTime,
        consultation_type: consultationType,
        reason_for_visit: reason || 'Public Booking via Clinic Profile'
      });

      setConfirmed(true);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete appointment booking. Please select another slot.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading clinic booking profile...</div>;
  }

  if (!data?.clinic) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Clinic Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">The requested clinic slug does not exist on MediFlow.</p>
        <Link to="/" className="mt-4 inline-block text-xs font-semibold text-brand-600">Back to Dashboard</Link>
      </div>
    );
  }

  const { clinic, services, doctors } = data;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Clinic Public Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Verified Healthcare Practice</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> CQC {clinic.cqc_rating}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-navy-900 mt-1">{clinic.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {clinic.address_line1}, {clinic.city} {clinic.postal_code}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {clinic.phone}
                </span>
              </div>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-xl shrink-0">
              {clinic.name[0]}
            </div>
          </div>
        </div>

        {/* Confirmation Screen */}
        {confirmed ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-soft text-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-navy-900">Appointment Confirmed!</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your consultation has been confirmed with {clinic.name}. An SMS confirmation has been dispatched with appointment instructions.
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left max-w-sm mx-auto space-y-1">
              <p><strong>Date:</strong> {selectedDate}</p>
              <p><strong>Time:</strong> {selectedTime} (UK Time)</p>
              <p><strong>Mode:</strong> {consultationType === 'video' ? 'HD Video Telemedicine' : 'In-Person Consultation'}</p>
            </div>
            <div className="pt-2">
              <Link to="/" className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-semibold">
                Return to MediFlow Home
              </Link>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft space-y-6">
            <div>
              <h2 className="text-base font-bold text-navy-900">Book an Appointment Online</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select a clinical service and convenient consultation slot</p>
            </div>

            {bookingError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Service Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Select Clinical Service</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((srv: any) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      selectedServiceId === srv.id
                        ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xs text-navy-900">{srv.name}</h3>
                      <span className="font-bold text-xs text-brand-700">£{srv.price_gbp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{srv.description}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{srv.duration_mins} mins</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Consultation Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Consultation Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConsultationType('in_person')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                    consultationType === 'in_person' ? 'bg-brand-50 border-brand-500 text-brand-800' : 'border-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-brand-600" />
                  <span>In-Person Clinic Visit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConsultationType('video')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                    consultationType === 'video' ? 'bg-teal-50 border-teal-500 text-teal-800' : 'border-slate-200'
                  }`}
                >
                  <Video className="w-4 h-4 text-teal-600" />
                  <span>HD Video Telemedicine</span>
                </button>
              </div>
            </div>

            {/* Doctor Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Preferred Consultant</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium"
              >
                {doctors.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.user?.last_name || 'Clinician'} — {d.specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Slot selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Appointment Date</label>
                <input
                  type="date"
                  min={TODAY_ISO}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Available Slot</label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                >
                  {availableSlots.length === 0 ? (
                    <option value="10:00">10:00</option>
                  ) : (
                    availableSlots.map(s => <option key={s} value={s}>{s}</option>)
                  )}
                </select>
              </div>
            </div>

            {/* Patient Details */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Patient Contact Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                />
                <input
                  type="tel"
                  required
                  placeholder="UK Mobile Phone"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <textarea
                rows={2}
                placeholder="Brief reason for appointment..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
              >
                <span>{submitting ? 'Confirming Booking...' : 'Confirm & Book Appointment'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
