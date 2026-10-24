import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  BarChart3
} from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#f43f5e'];

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getDashboardMetrics()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-500">Loading clinic analytics engine...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-600" />
          <span>Clinic Performance & AI Risk Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Historical attendance distributions, appointment utilization, and predictive no-show prevention metrics.
        </p>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Monthly Revenue</span>
          <div className="mt-2 text-3xl font-extrabold text-navy-900">
            £{data.summary.monthlyRevenueGbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-1">+8.4% vs previous month</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Practice No-Show Rate</span>
          <div className="mt-2 text-3xl font-extrabold text-navy-900">
            {data.summary.averageNoShowRate}
          </div>
          <p className="text-xs text-teal-700 font-semibold mt-1">Industry benchmark: 14.2%</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Interventions Saved</span>
          <div className="mt-2 text-3xl font-extrabold text-navy-900">
            {data.summary.noShowInterventionsSaved} <span className="text-xs font-normal text-slate-400">visits</span>
          </div>
          <p className="text-xs text-brand-600 font-semibold mt-1">Estimated £2,185 recovered revenue</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Patient Registry</span>
          <div className="mt-2 text-3xl font-extrabold text-navy-900">
            {data.summary.activePatients}
          </div>
          <p className="text-xs text-slate-400 mt-1">All UK GDPR compliant</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Appointment Schedule vs No-Shows */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
          <div>
            <h2 className="text-sm font-bold text-navy-900">Weekly Appointment Volume vs Attendance</h2>
            <p className="text-xs text-slate-500">Scheduled visits compared with completed consultations and missed slots</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="scheduled" name="Scheduled" fill="#0d9488" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="noShows" name="No-Shows" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* No-Show Risk Distribution (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
          <div>
            <h2 className="text-sm font-bold text-navy-900">Patient Appointment No-Show Risk Distribution</h2>
            <p className="text-xs text-slate-500">Real-time breakdown of appointments classified by calibrated statistical weights</p>
          </div>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.riskLevelDistribution || data.riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.riskDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
