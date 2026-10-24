import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { Appointment, PrescriptionRequest } from '../types';
import { 
  Calendar, 
  AlertTriangle, 
  Video, 
  Pill, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Stethoscope
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TODAY_FORMATTED = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export const DashboardPage: React.FC = () => {
  const { user, role, clinic } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [appts, rxs] = await Promise.all([
          api.getAppointments(),
          api.getPrescriptions()
        ]);
        setAppointments(appts);
        setPrescriptions(rxs);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updateAppointmentStatus(id, newStatus);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as any } : a));
    } catch (err) {
      alert('Error updating status: ' + err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>)}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  const todayCount = appointments.length;
  const pendingRefills = prescriptions.filter(p => p.status === 'pending').length;
  const highRiskCount = appointments.filter(a => a.no_show_risk_level === 'high').length;
  const videoAppointments = appointments.filter(a => a.consultation_type === 'video');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <span>Welcome back, {user?.first_name || 'Clinician'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium border border-brand-200">
              {clinic?.name || 'St. Jude Healthcare'}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {TODAY_FORMATTED} — Practice Operations & Patient Queue
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/appointments"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Appointment</span>
          </Link>
          <Link
            to="/prescriptions"
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
          >
            <Pill className="w-4 h-4 text-brand-600" />
            <span>Refill Requests ({pendingRefills})</span>
          </Link>
        </div>
      </div>

      {/* Local Demonstration Mode Info Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-bold text-slate-800">Local Demonstration Mode Active:</span>
          <span className="text-slate-500">
            Operating on in-memory mock repository with instant reactivity. All NHS patient records and GMC registrations are synthetic.
          </span>
        </div>
        <Link
          to="/settings"
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0 self-start sm:self-auto"
        >
          View Practice Settings →
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Visits</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-display font-extrabold text-navy-900">{todayCount}</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +12% this wk
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Across 2 consultant suites</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telemedicine Rooms</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-display font-extrabold text-navy-900">{videoAppointments.length}</span>
            <span className="text-xs text-teal-700 font-medium px-2 py-0.5 bg-teal-50 rounded-full">
              HD WebRTC
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Active encrypted rooms ready</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">No-Show Risk Guard</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-display font-extrabold text-navy-900">
              {highRiskCount === 0 ? '0 High' : `${highRiskCount} High`}
            </span>
            <span className="text-xs text-slate-500 font-medium">AI Scoring</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">SMS reminder prompts dispatched</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Refills Pending</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-display font-extrabold text-navy-900">{pendingRefills}</span>
            <span className="text-xs text-purple-700 font-medium px-2 py-0.5 bg-purple-50 rounded-full">
              Safety Verified
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Awaiting clinician sign-off</p>
        </div>
      </div>

      {/* Main Grid: Today's Clinical Schedule & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Appointments Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-navy-900">Today's Patient Schedule</h2>
              <p className="text-xs text-slate-500">Live check-in queue, consultation modes, and AI risk prediction</p>
            </div>
            <Link to="/appointments" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <span>View Full Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {appointments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No appointments scheduled for today.
              </div>
            ) : (
              appointments.map((appt) => {
                const startTime = new Date(appt.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const isVideo = appt.consultation_type === 'video';

                return (
                  <div key={appt.id} className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5 min-w-[200px]">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-800">{startTime}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">UK Time</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-navy-900">
                            {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Patient'}
                          </h3>
                          {isVideo ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                              <Video className="w-3 h-3" /> Video Call
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              In-Person
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{appt.reason_for_visit}</p>
                        
                        {/* No-show risk indicator pill */}
                        <div className="mt-1.5 flex items-center space-x-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            appt.no_show_risk_level === 'high' 
                              ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                              : appt.no_show_risk_level === 'medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <AlertTriangle className="w-3 h-3" />
                            No-Show Risk: {Math.round(appt.no_show_risk_score * 100)}% ({appt.no_show_risk_level})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions based on role */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {isVideo && (
                        <Link
                          to={`/telemedicine?apptId=${appt.id}`}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Room</span>
                        </Link>
                      )}

                      {appt.status !== 'checked_in' && appt.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'checked_in')}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                        >
                          Check In
                        </button>
                      )}

                      {appt.status === 'checked_in' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'completed')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Refill Alerts & AI Safety Status */}
        <div className="space-y-6">
          
          {/* Prescription Safety Refill Queue */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-600" />
                <span>Refill Review Queue</span>
              </h2>
              <Link to="/prescriptions" className="text-xs font-semibold text-brand-600 hover:underline">
                Review all
              </Link>
            </div>

            <div className="mt-3 space-y-3">
              {prescriptions.slice(0, 3).map((rx) => (
                <div key={rx.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{rx.medication_name}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                      rx.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : rx.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {rx.status}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-1">{rx.dosage} • {rx.quantity}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">"{rx.patient_reason}"</p>
                  
                  {rx.safety_flags && rx.safety_flags.length > 0 && (
                    <div className="mt-2 text-[10px] text-teal-800 bg-teal-50/80 p-1.5 rounded border border-teal-200/50">
                      ✓ {rx.safety_flags[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Clinical Governance Callout */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-900 to-navy-900 text-white shadow-soft">
            <div className="flex items-center space-x-2 text-brand-300 mb-2">
              <Stethoscope className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Clinical AI Assistant</span>
            </div>
            <h3 className="font-bold text-sm">No-Show & Safety Guard Active</h3>
            <p className="text-xs text-brand-100 mt-1.5 leading-relaxed">
              Transparent statistical weighting evaluates 7 UK outpatient factors. All clinical decisions remain strictly clinician-authorized.
            </p>
            <div className="mt-4 pt-3 border-t border-brand-800/80 flex items-center justify-between text-xs">
              <span className="text-brand-200">Pre-intake completion</span>
              <span className="font-bold text-white">92.4%</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
