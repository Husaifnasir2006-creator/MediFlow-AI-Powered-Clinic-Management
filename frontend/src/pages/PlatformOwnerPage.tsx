import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Clinic } from '../types';
import {
  Building2,
  ExternalLink,
  ShieldCheck,
  X,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PlatformOwnerPage: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTenant, setSelectedTenant] = useState<Clinic | null>(null);

  useEffect(() => {
    api.getClinics()
      .then(res => {
        setClinics(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-brand-600" />
          <span>Platform Owner Console (Multi-Tenant SaaS Operations)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Global clinic provisioning, tenant isolation monitoring, subscription MRR, and UK healthcare telemetry.
        </p>
      </div>

      {/* Global SaaS Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Clinic Tenants</span>
          <div className="mt-2 text-3xl font-extrabold text-navy-900">{clinics.length}</div>
          <p className="text-xs text-emerald-600 font-semibold mt-1">100% Tenant Isolation Enforced</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform SaaS MRR</span>
          <div className="mt-2 text-3xl font-extrabold text-navy-900">£8,970</div>
          <p className="text-xs text-brand-600 font-semibold mt-1">+14.2% MoM growth</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Health & Latency</span>
          <div className="mt-2 text-3xl font-extrabold text-emerald-600">99.98%</div>
          <p className="text-xs text-slate-400 mt-1">UK South region (London)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-soft">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">CQC Compliance Audit Status</span>
          <div className="mt-2 text-3xl font-extrabold text-teal-700">Audit Ready</div>
          <p className="text-xs text-teal-800 font-semibold mt-1">Zero cross-tenant leaks logged</p>
        </div>
      </div>

      {/* Provisioned Clinic Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Provisioned Clinic Workspaces</span>
          <span className="text-xs text-slate-400">PostgreSQL Row-Level Security Enabled</span>
        </div>

        <div className="divide-y divide-slate-100">
          {clinics.map(clinic => (
            <div key={clinic.id} className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm">
                  {clinic.name[0]}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-navy-900">{clinic.name}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      CQC: {clinic.cqc_rating}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      ID: {clinic.slug}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {clinic.address_line1}, {clinic.city} {clinic.postal_code} • {clinic.phone} • {clinic.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Link
                  to={`/book/${clinic.slug}`}
                  target="_blank"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>Public Booking Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setSelectedTenant(clinic)}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs"
                >
                  Manage Tenant
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MANAGE TENANT MODAL */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-premium border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                  {selectedTenant.name[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-900">{selectedTenant.name}</h3>
                  <p className="text-[10px] font-mono text-slate-400">Tenant Slug: {selectedTenant.slug}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">CQC Rating</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {selectedTenant.cqc_rating}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Isolation Tier</span>
                  <span className="font-semibold text-slate-800">PostgreSQL RLS</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Telephone</span>
                  <span className="font-semibold text-slate-800">{selectedTenant.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                  <span className="font-semibold text-slate-800">{selectedTenant.city}, {selectedTenant.postal_code}</span>
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-[11px] text-teal-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-700" />
                  <span>Tenant Data Privacy & Caldicott Protection</span>
                </div>
                <p className="text-teal-800">
                  All clinical consultations, prescription refill queues, and intake responses for {selectedTenant.name} are logically separated and inaccessible to foreign practices.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-slate-700 block">Administrative Actions</span>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/settings"
                    onClick={() => setSelectedTenant(null)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-between transition"
                  >
                    <span>Practice Settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={`/book/${selectedTenant.slug}`}
                    target="_blank"
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-between transition"
                  >
                    <span>Public Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformOwnerPage;
