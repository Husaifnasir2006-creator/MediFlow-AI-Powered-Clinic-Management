import React from 'react';
import { useAuth } from '../../context/useAuth';
import { UserRole } from '../../types';
import { 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  ChevronDown, 
  ExternalLink, 
  Activity,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ROLE_LABELS: Record<UserRole, { label: string; color: string; desc: string }> = {
  clinic_owner: { label: 'Clinic Owner', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', desc: 'Dr. Oliver Sterling' },
  doctor: { label: 'Consultant GP', color: 'bg-teal-100 text-teal-800 border-teal-200', desc: 'Dr. Alistair Finch' },
  receptionist: { label: 'Receptionist', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', desc: 'Marcus Cooper' },
  administrator: { label: 'Practice Admin', color: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'Sarah Jenkins' },
  patient: { label: 'Patient Portal', color: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'James Smith' },
  platform_owner: { label: 'Platform Console', color: 'bg-rose-100 text-rose-800 border-rose-200', desc: 'Victoria Sterling (SaaS)' }
};

export const Navbar: React.FC = () => {
  const { user, role, clinic, switchRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Clinic Indicator */}
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-display font-bold text-xl text-navy-900 tracking-tight">MediFlow</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">UK</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1" title="Local in-memory mock store active. Supabase disconnected for safe local testing.">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  LOCAL DEMO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Healthcare Practice SaaS</p>
            </div>
          </Link>

          {role !== 'platform_owner' && clinic && (
            <div className="hidden md:flex items-center pl-4 border-l border-slate-200 space-x-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-800">{clinic.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> CQC {clinic.cqc_rating}
              </span>
            </div>
          )}
        </div>

        {/* Right Actions: Public Booking Link + Role Switcher + User Profile */}
        <div className="flex items-center space-x-3">
          {/* Public Booking Quick Link */}
          {clinic && (
            <Link
              to={`/book/${clinic.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
              title="Google Business Profile Public Booking Page"
            >
              <span>Public Booking Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Interactive Role Switcher Modal / Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              title="Switch user perspective to preview different role permissions"
            >
              <UserCheck className="w-4 h-4 text-brand-600" />
              <div className="text-left hidden sm:block">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">Role View</div>
                <div className="leading-tight font-bold">{ROLE_LABELS[role]?.label}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-premium border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-navy-900">Switch Experience Role</p>
                  <p className="text-[11px] text-slate-500">Test multi-role workspaces & permissions live</p>
                </div>
                <div className="mt-1 space-y-1">
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((rKey) => (
                    <button
                      key={rKey}
                      onClick={() => {
                        switchRole(rKey);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition ${
                        role === rKey ? 'bg-brand-50 text-brand-900 font-semibold border border-brand-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-900">{ROLE_LABELS[rKey].label}</div>
                        <div className="text-[11px] text-slate-500">{ROLE_LABELS[rKey].desc}</div>
                      </div>
                      {role === rKey && (
                        <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
              {user ? `${user.first_name[0]}${user.last_name[0]}` : <User className="w-4 h-4" />}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">
                {user ? `${user.first_name} ${user.last_name}` : 'Healthcare User'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{ROLE_LABELS[role]?.label}</p>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
