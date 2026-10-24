import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SubscriptionPlan } from '../types';
import {
  CreditCard,
  Check,
  ArrowRight,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  ShieldCheck
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Modals & Feedback
  const [portalModalOpen, setPortalModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    Promise.all([
      api.getPlans(),
      api.getSubscription()
    ]).then(([plansData, subData]) => {
      setPlans(plansData);
      setCurrentSub(subData);
    }).catch(console.error);
  }, []);

  const handleCheckout = async (planCode: string) => {
    try {
      setCheckoutLoading(planCode);
      const res = await api.checkoutBilling(planCode, billingCycle);
      showToast(
        'success',
        `Simulated Stripe Checkout Session created for ${res.plan} (£${res.price}/${billingCycle}). In live production, this redirects to Stripe Checkout.`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Checkout error');
    } finally {
      setCheckoutLoading(null);
    }
  };

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
            <CreditCard className="w-6 h-6 text-brand-600" />
            <span>SaaS Subscription & Stripe Billing</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated UK payment processing, VAT invoicing, doctor license seats, and platform tier limits.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Stripe UK Sandbox Mode</span>
        </div>
      </div>

      {/* Active Subscription Banner */}
      {currentSub && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-900 via-slate-900 to-brand-950 text-white shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-brand-300 uppercase tracking-wider">Active Subscription</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Stripe Status: {currentSub.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1">St. Jude Healthcare Centre — Professional Clinic Tier</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Current billing period ends {new Date(currentSub.current_period_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPortalModalOpen(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5"
            >
              <span>Manage Payment Method</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center my-6">
        <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center text-xs font-semibold">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl transition ${
              billingCycle === 'monthly' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentSub?.plan_id === plan.id || currentSub?.plan?.code === plan.code;
          const price = billingCycle === 'annual' ? Math.round(plan.price_annual_gbp / 12) : plan.price_monthly_gbp;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl p-6 border shadow-soft flex flex-col justify-between transition hover:shadow-premium relative ${
                isCurrent ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
                  Current Plan
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-navy-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{plan.description}</p>

                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-navy-900">£{price}</span>
                  <span className="text-xs text-slate-500 ml-1.5">/ month</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Billed annually at £{plan.price_annual_gbp}</p>
                )}

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-xs">
                  <div className="font-semibold text-slate-800">Plan inclusions:</div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Up to <strong>{plan.max_doctors}</strong> Doctor seats</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span><strong>{plan.max_monthly_appointments}</strong> Appointments/mo</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Online patient booking portal</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>UK GDPR & Caldicott encryption</span>
                  </div>
                  {plan.code !== 'starter' && (
                    <>
                      <div className="flex items-center gap-2 text-slate-600 font-medium text-brand-900">
                        <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
                        <span>AI No-Show Risk Engine</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 font-medium text-brand-900">
                        <Check className="w-4 h-4 text-brand-600 shrink-0" />
                        <span>WebRTC HD Telemedicine</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => handleCheckout(plan.code)}
                  disabled={isCurrent || checkoutLoading === plan.code}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                  }`}
                >
                  {checkoutLoading === plan.code ? (
                    'Preparing Stripe Checkout...'
                  ) : isCurrent ? (
                    'Active Plan'
                  ) : (
                    <>
                      <span>Upgrade to {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* STRIPE CUSTOMER PORTAL SIMULATION MODAL */}
      {portalModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-premium border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                  S
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Stripe Customer Billing Portal</h3>
                  <span className="text-[10px] text-slate-400">Sandbox Simulation</span>
                </div>
              </div>
              <button
                onClick={() => setPortalModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Payment Method</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Default</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-800 font-mono">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span>Visa Business ending in •••• 4242</span>
                </div>
                <p className="text-[11px] text-slate-500">Expires 12/28 • BACS Direct Debit backup configured</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700">Billing Address & UK VAT</span>
                <p className="text-slate-600 text-[11px]">St. Jude Healthcare Centre Ltd, 14 Marylebone High Street, London W1G 9PJ</p>
                <p className="text-slate-500 font-mono text-[11px]">VAT ID: GB 942 8172 09</p>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 block">Recent Invoices (Simulated)</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-2.5 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-bold text-slate-800">Inv-2026-10-01</div>
                        <div className="text-[10px] text-slate-400">1 Oct 2026 • Professional Tier</div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700">£149.00 Paid</span>
                  </div>
                  <div className="p-2.5 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-bold text-slate-800">Inv-2026-09-01</div>
                        <div className="text-[10px] text-slate-400">1 Sep 2026 • Professional Tier</div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700">£149.00 Paid</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPortalModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close Portal View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
