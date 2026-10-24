import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Video,
  FileText,
  Pill,
  Clock,
  BarChart3,
  CreditCard,
  Building,
  ShieldCheck,
  HeartHandshake,
  Settings
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role } = useAuth();

  const getNavLinks = () => {
    if (role === 'platform_owner') {
      return [
        { to: '/platform', label: 'Platform Console', icon: Building },
        { to: '/billing', label: 'SaaS Plans & ARR', icon: CreditCard },
        { to: '/compliance', label: 'GDPR & CQC Readiness', icon: ShieldCheck },
        { to: '/settings', label: 'Platform Settings', icon: Settings }
      ];
    }

    if (role === 'patient') {
      return [
        { to: '/', label: 'My Patient Portal', icon: LayoutDashboard },
        { to: '/appointments', label: 'My Appointments', icon: Calendar },
        { to: '/telemedicine', label: 'Join Video Consultation', icon: Video },
        { to: '/prescriptions', label: 'Prescription Refills', icon: Pill },
        { to: '/intake', label: 'Digital Intake Forms', icon: FileText },
        { to: '/compliance', label: 'Privacy & Data Rights', icon: ShieldCheck }
      ];
    }

    // Clinic Staff (Owner, Admin, Doctor, Receptionist)
    const base = [
      { to: '/', label: 'Overview', icon: LayoutDashboard },
      { to: '/appointments', label: 'Smart Scheduler', icon: Calendar },
      { to: '/patients', label: 'Patients Directory', icon: Users },
      { to: '/telemedicine', label: 'Telemedicine (WebRTC)', icon: Video },
      { to: '/prescriptions', label: 'Prescription Queue', icon: Pill },
      { to: '/intake', label: 'Intake Forms (AES-256)', icon: FileText },
      { to: '/rota', label: 'Staff Rota & Shifts', icon: Clock }
    ];

    if (['clinic_owner', 'administrator'].includes(role)) {
      base.push({ to: '/analytics', label: 'Clinic Analytics', icon: BarChart3 });
      base.push({ to: '/billing', label: 'Stripe SaaS Billing', icon: CreditCard });
      base.push({ to: '/settings', label: 'Practice Settings', icon: Settings });
    }

    base.push({ to: '/compliance', label: 'Compliance & CQC Checklist', icon: ShieldCheck });

    return base;
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 shrink-0 hidden md:block min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation Menu
        </div>
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/' || link.to === '/platform'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-900 border border-brand-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 text-brand-600" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* UK Healthcare Trust / Security Badge Callout */}
      <div className="mt-8 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold mb-1">
          <HeartHandshake className="w-4 h-4 text-brand-600" />
          <span>UK Healthcare Ready</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          NHS Caldicott principles, CQC Good Practice, and AES-256 encrypted clinical intake.
        </p>
      </div>
    </aside>
  );
};
