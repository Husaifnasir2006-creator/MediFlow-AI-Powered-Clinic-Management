import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { StaffShift } from '../types';
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Star,
  Activity,
  Plus,
  Users,
  AlertCircle,
  Filter
} from 'lucide-react';

const CURRENT_MONTH_YEAR = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const TODAY_ISO = new Date().toISOString().split('T')[0];

export const RotaPage: React.FC = () => {
  const { role } = useAuth();
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [newShift, setNewShift] = useState({
    staff_name: 'Dr. Alistair Finch',
    role: 'doctor',
    department: 'General Practice',
    shift_date: TODAY_ISO,
    start_time: '08:30',
    end_time: '17:00'
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    Promise.all([
      api.getShifts(),
      api.getRotaPerformance()
    ]).then(([shiftData, perfData]) => {
      setShifts(shiftData);
      setPerformance(perfData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [role]);

  const handleAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = newShift.staff_name.split(' ');
    const firstName = parts[1] || parts[0];
    const lastName = parts[2] || parts[1] || 'Staff';

    const createdShift: StaffShift = {
      id: `shift-${Date.now()}`,
      clinic_id: 'clinic-st-jude',
      user_id: `user-${Date.now()}`,
      shift_date: newShift.shift_date,
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      role: newShift.role as any,
      department: newShift.department,
      status: 'scheduled',
      user: {
        id: `user-${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}@stjude-health.co.uk`,
        phone: '+44 20 7946 0912',
        is_platform_admin: false
      }
    };

    setShifts([createdShift, ...shifts]);
    setIsModalOpen(false);
    showToast('success', `Shift scheduled for ${newShift.staff_name} (${newShift.shift_date}).`);
  };

  const filteredShifts = shifts.filter(s => {
    if (deptFilter !== 'all' && s.department !== deptFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-brand-600" />
            <span>Staff Rota & Operational Performance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Weekly clinic coverage, consultant shift rotas, and patient throughput analytics.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Assign New Shift</span>
        </button>
      </div>

      {/* Operational Performance Cards */}
      {performance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Avg Waiting Time</span>
              <Activity className="w-4 h-4 text-brand-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-navy-900">
              {performance.averageWaitTimeMins} <span className="text-xs font-normal text-slate-400">mins</span>
            </div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">4.2 mins below UK private practice average</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Visits Completed Today</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-navy-900">
              {performance.completedVisitsToday}
            </div>
            <p className="text-xs text-slate-400 mt-1">1 cancellation handled</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Patient Satisfaction</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-navy-900">
              {performance.patientSatisfactionRating} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
            </div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">98% would recommend</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Rota Fulfillment</span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-navy-900">
              {performance.rotaFulfillment}
            </div>
            <p className="text-xs text-teal-700 font-semibold mt-1">Zero unstaffed sessions</p>
          </div>
        </div>
      )}

      {/* Staff Shifts Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Active Shifts for {CURRENT_MONTH_YEAR} ({filteredShifts.length})
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-medium focus:outline-none"
            >
              <option value="all">All Departments</option>
              <option value="General Practice">General Practice</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Reception & Front Desk">Reception & Front Desk</option>
              <option value="Practice Nursing">Practice Nursing</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredShifts.map((shift) => (
            <div key={shift.id} className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                  {shift.user ? `${shift.user.first_name[0]}${shift.user.last_name[0]}` : 'ST'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-900">
                    {shift.user ? `${shift.user.first_name} ${shift.user.last_name}` : 'Staff Member'}
                  </h3>
                  <p className="text-xs text-slate-500">{shift.department} • <span className="capitalize">{shift.role.replace('_', ' ')}</span></p>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-xs text-slate-600">
                <div className="text-right">
                  <div className="font-bold text-navy-900">{shift.start_time} - {shift.end_time}</div>
                  <div className="text-[11px] text-slate-400">Date: {shift.shift_date}</div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {shift.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ASSIGN SHIFT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-premium border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600" />
                <span>Assign Staff Rota Shift</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignShift} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Staff Member</label>
                <select
                  value={newShift.staff_name}
                  onChange={(e) => setNewShift({ ...newShift, staff_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                >
                  <option value="Dr. Alistair Finch">Dr. Alistair Finch (Consultant GP)</option>
                  <option value="Dr. Claire Sterling">Dr. Claire Sterling (Cardiologist)</option>
                  <option value="Marcus Cooper">Marcus Cooper (Reception & Triage)</option>
                  <option value="Sarah Jenkins">Sarah Jenkins (Practice Administrator)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Department</label>
                <select
                  value={newShift.department}
                  onChange={(e) => setNewShift({ ...newShift, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                >
                  <option value="General Practice">General Practice</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Reception & Front Desk">Reception & Front Desk</option>
                  <option value="Practice Nursing">Practice Nursing</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={newShift.shift_date}
                  onChange={(e) => setNewShift({ ...newShift, shift_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.start_time}
                    onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.end_time}
                    onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Assign Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RotaPage;
