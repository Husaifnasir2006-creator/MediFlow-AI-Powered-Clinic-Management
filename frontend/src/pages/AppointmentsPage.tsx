import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { Appointment, Doctor, Patient } from '../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Video,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  CalendarDays,
  Clock,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TODAY_ISO = new Date().toISOString().split('T')[0];
const DAY_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AppointmentsPage: React.FC = () => {
  const { role, clinic } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [filterDoctor, setFilterDoctor] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'confirmed' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'day' | 'week'>('list');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat-1');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('doc-1');
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_ISO);
  const [selectedTime, setSelectedTime] = useState<string>('14:00');
  const [selectedType, setSelectedType] = useState<'in_person' | 'video'>('video');
  const [reasonForVisit, setReasonForVisit] = useState<string>('Routine clinical consultation');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Real-time AI No-Show Prediction inside booking modal
  const [livePrediction, setLivePrediction] = useState<{ score: number; riskLevel: string; factors: string[] } | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.getAppointments(),
      api.getDoctors(),
      api.getPatients()
    ])
      .then(([appts, docs, pats]) => {
        if (!ignore) {
          setAppointments(appts);
          setDoctors(docs);
          setPatients(pats);
        }
      })
      .catch(err => {
        if (!ignore) {
          console.error('Error fetching appointments:', err);
          showToast('error', 'Failed to retrieve appointments list');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [role]);

  // Fetch slots whenever doctor or date changes
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

  // Recalculate AI No-Show Prediction live
  useEffect(() => {
    const bookingTimestamp = new Date(`${selectedDate}T${selectedTime}:00`).getTime();
    const leadTimeDays = Math.max(0, Math.round((bookingTimestamp - Date.now()) / (86400000)));
    const dayOfWeek = new Date(selectedDate).getDay();

    api.predictNoShow({
      leadTimeDays,
      priorNoShows: 0,
      priorCompleted: 3,
      hasCompletedIntake: true,
      hasConfirmedReminder: true,
      consultationType: selectedType,
      dayOfWeek
    }).then(res => setLivePrediction(res))
      .catch(console.error);
  }, [selectedDate, selectedTime, selectedType]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setSubmitting(true);

    try {
      const start_time = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      const end_time = new Date(new Date(start_time).getTime() + 30 * 60000).toISOString();

      const created = await api.createAppointment({
        clinic_id: clinic?.id || 'clinic-st-jude',
        patient_id: selectedPatientId,
        doctor_id: selectedDoctorId,
        service_id: 'srv-1',
        start_time,
        end_time,
        consultation_type: selectedType,
        reason_for_visit: reasonForVisit
      });

      setAppointments(prev => [created, ...prev]);
      setIsBookingOpen(false);
      showToast('success', 'Appointment confirmed! Simulated Google Calendar invite & Twilio reminder dispatched.');
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status: status as any } : a)));
      const label = status === 'checked_in' ? 'Patient marked arrived in waiting room.' : status === 'completed' ? 'Consultation visit completed.' : 'Appointment status updated.';
      showToast('success', label);
    } catch (err: any) {
      showToast('error', err.message || 'Status update error');
    }
  };

  const openQuickBookAtTime = (time: string) => {
    setSelectedTime(time);
    setSelectedDate(TODAY_ISO);
    setIsBookingOpen(true);
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter(a => {
    if (filterDoctor !== 'all' && a.doctor_id !== filterDoctor) return false;
    if (filterType !== 'all' && a.consultation_type !== filterType) return false;
    if (statusFilter === 'waiting' && a.status !== 'checked_in') return false;
    if (statusFilter === 'confirmed' && a.status !== 'confirmed') return false;
    if (statusFilter === 'completed' && a.status !== 'completed') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const patientName = a.patient ? `${a.patient.first_name} ${a.patient.last_name}`.toLowerCase() : '';
      const reason = (a.reason_for_visit || '').toLowerCase();
      return patientName.includes(term) || reason.includes(term);
    }
    return true;
  });

  const waitingRoomCount = appointments.filter(a => a.status === 'checked_in').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-brand-600" />
            <span>Intelligent Appointment Scheduler</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Day/Week/Month schedules, conflict-avoidance engine, live waiting room queue, and AI no-show risk assessment.
          </p>
        </div>

        <button
          onClick={() => setIsBookingOpen(true)}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Reception Waiting Room Queue Quick Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-soft text-xs">
        <div className="flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-teal-600" />
          <span className="font-bold text-navy-900">Reception Triage Desk:</span>
          <span className="text-slate-500">
            {waitingRoomCount} {waitingRoomCount === 1 ? 'patient' : 'patients'} currently checked-in & waiting in reception
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('waiting')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              statusFilter === 'waiting' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Waiting Room ({waitingRoomCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              statusFilter === 'confirmed' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              statusFilter === 'completed' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        {/* Doctor and Type filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Doctor:</span>
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500 font-medium text-slate-700"
            >
              <option value="all">All Doctors</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.user ? `${d.user.first_name} ${d.user.last_name}` : d.specialty}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500 font-medium text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="in_person">In-Person</option>
              <option value="video">HD Video (Telehealth)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list' ? 'bg-white text-navy-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'day' ? 'bg-white text-navy-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'week' ? 'bg-white text-navy-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE: DAY SCHEDULE BREAKDOWN */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-navy-900">Today's Hourly Consultation Grid</h2>
              <p className="text-xs text-slate-500">Live timeline with booked slots and immediate open scheduling</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
              London Time (Europe/London)
            </span>
          </div>

          <div className="space-y-3">
            {DAY_HOURS.map(hour => {
              const hourInt = parseInt(hour.split(':')[0], 10);
              const matchingAppts = filteredAppointments.filter(a => {
                const apptHour = new Date(a.start_time).getHours();
                return apptHour === hourInt;
              });

              return (
                <div key={hour} className="flex items-start space-x-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition">
                  <div className="w-16 shrink-0 font-mono font-bold text-xs text-slate-500 pt-1">
                    {hour}
                  </div>

                  <div className="grow space-y-2">
                    {matchingAppts.length === 0 ? (
                      <div className="flex items-center justify-between py-1 text-xs text-slate-400">
                        <span className="italic">No consultations currently scheduled</span>
                        <button
                          onClick={() => openQuickBookAtTime(hour)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 rounded-lg border border-brand-200 transition"
                        >
                          + Quick Book Slot
                        </button>
                      </div>
                    ) : (
                      matchingAppts.map(appt => (
                        <div key={appt.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                          <div className="flex items-center space-x-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              appt.status === 'checked_in' ? 'bg-teal-500 animate-pulse' : appt.status === 'completed' ? 'bg-purple-500' : 'bg-blue-500'
                            }`}></span>
                            <div>
                              <span className="font-bold text-xs text-navy-900">
                                {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Patient'}
                              </span>
                              <span className="text-[11px] text-slate-500 ml-2">
                                ({appt.reason_for_visit}) • Dr. {appt.doctor?.user?.last_name || 'Consultant'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {appt.consultation_type === 'video' && (
                              <Link
                                to={`/telemedicine?apptId=${appt.id}`}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1"
                              >
                                <Video className="w-3 h-3" /> Video
                              </Link>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                              {appt.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE: WEEK SCHEDULE BREAKDOWN */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-navy-900">7-Day Weekly Clinic Capacity</h2>
              <p className="text-xs text-slate-500">Distribution of patient appointments across current weekly rota</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">Current Week</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {WEEKDAYS.map((day, idx) => {
              // Map index: Sunday is 0 in JS Date, Mon=1, Tue=2, etc.
              const jsDay = (idx + 1) % 7;
              const dayAppts = filteredAppointments.filter(a => new Date(a.start_time).getDay() === jsDay);

              return (
                <div key={day} className="bg-slate-50 rounded-2xl border border-slate-200 p-3 space-y-2 flex flex-col justify-between min-h-[160px]">
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-700">{day.slice(0, 3)}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-brand-700 border border-slate-200">
                        {dayAppts.length}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {dayAppts.slice(0, 3).map(a => (
                        <div key={a.id} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[10px]">
                          <div className="font-bold text-slate-800 truncate">
                            {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'Visit'}
                          </div>
                          <div className="text-slate-400">
                            {new Date(a.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <p className="text-[10px] text-brand-600 font-semibold text-center pt-1">
                          +{dayAppts.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDate(TODAY_ISO);
                      setIsBookingOpen(true);
                    }}
                    className="w-full py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition"
                  >
                    + Book
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE: STANDARD DETAILED LIST */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {filteredAppointments.length} Appointments Found
              </span>
            </div>
            <span className="text-xs text-slate-400">All times Europe/London (GMT/BST)</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No appointments match your filters</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting another doctor.</p>
                </div>
              ) : (
                filteredAppointments.map((appt) => {
                  const startDate = new Date(appt.start_time);
                  const dateStr = startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const timeStr = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  const isVideo = appt.consultation_type === 'video';

                  return (
                    <div key={appt.id} className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start space-x-4">
                        {/* Date/Time badge */}
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0 text-center">
                          <span className="text-xs font-bold text-brand-700">{dateStr.split(' ')[0]} {dateStr.split(' ')[1]}</span>
                          <span className="text-sm font-extrabold text-navy-900">{timeStr}</span>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-navy-900">
                              {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Patient Record'}
                            </span>
                            {appt.patient?.nhs_number && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                NHS: {appt.patient.nhs_number}
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              appt.status === 'confirmed' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : appt.status === 'checked_in'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold'
                                : appt.status === 'completed'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {appt.status === 'checked_in' ? 'Arrived / In Waiting Room' : appt.status.replace('_', ' ')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 mt-1">{appt.reason_for_visit}</p>
                          
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              Dr. {appt.doctor?.user?.last_name || 'Consultant'} ({appt.doctor?.specialty || 'GP'})
                            </span>
                            
                            {/* No-show risk scoring chip */}
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                appt.no_show_risk_level === 'high' 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                  : appt.no_show_risk_level === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                <AlertTriangle className="w-3 h-3" />
                                AI No-Show: {Math.round(appt.no_show_risk_score * 100)}% ({appt.no_show_risk_level})
                              </span>
                            </div>

                            {isVideo && (
                              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                                <Video className="w-3 h-3" /> WebRTC Video
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {isVideo && (
                          <Link
                            to={`/telemedicine?apptId=${appt.id}`}
                            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Launch Video</span>
                          </Link>
                        )}

                        {appt.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusUpdate(appt.id, 'checked_in')}
                            className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs font-semibold text-teal-800 transition flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span>Check-In</span>
                          </button>
                        )}

                        {appt.status === 'checked_in' && (
                          <button
                            onClick={() => handleStatusUpdate(appt.id, 'completed')}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete Visit</span>
                          </button>
                        )}

                        {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                          <button
                            onClick={() => handleStatusUpdate(appt.id, 'cancelled')}
                            className="px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                            title="Cancel appointment"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-premium border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-brand-600" />
                <span>Book Clinic Appointment</span>
              </h2>
              <button
                onClick={() => setIsBookingOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-4">
              {/* Select Patient */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-500"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} (NHS: {p.nhs_number || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Doctor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Attending Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-500"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user?.first_name} {d.user?.last_name} — {d.specialty} (GMC: {d.gmc_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultation Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Consultation Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedType('in_person')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      selectedType === 'in_person'
                        ? 'border-brand-500 bg-brand-50 text-brand-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>In-Person Clinic Visit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType('video')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      selectedType === 'video'
                        ? 'border-teal-500 bg-teal-50 text-teal-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>HD WebRTC Video Call</span>
                  </button>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Available Slot</label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    {availableSlots.length === 0 ? (
                      <option value="14:00">14:00 (Standard)</option>
                    ) : (
                      availableSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Reason for Visit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Visit / Clinical Notes</label>
                <textarea
                  rows={2}
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  placeholder="e.g. Hypertension review, skin check..."
                />
              </div>

              {/* Live AI Risk Prediction Box */}
              {livePrediction && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      Live AI No-Show Risk Forecast
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      livePrediction.riskLevel === 'high'
                        ? 'bg-rose-100 text-rose-800'
                        : livePrediction.riskLevel === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {Math.round(livePrediction.score * 100)}% ({livePrediction.riskLevel.toUpperCase()})
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {livePrediction.factors.join(' • ')}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
