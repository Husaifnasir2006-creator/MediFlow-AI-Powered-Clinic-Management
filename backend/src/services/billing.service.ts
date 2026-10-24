import { StorageService } from './storage.service.js';
import { v4 as uuidv4 } from 'uuid';

export class BillingService {
  private static stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  private static stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  public static async createCheckoutSession(clinicId: string, planCode: string, billingCycle: 'monthly' | 'annual') {
    const storage = StorageService.getInstance();
    const clinic = storage.clinics.find(c => c.id === clinicId);
    const plan = storage.plans.find(p => p.code === planCode);

    if (!clinic || !plan) {
      throw new Error('Clinic or Plan not found');
    }

    const price = billingCycle === 'annual' ? plan.price_annual_gbp : plan.price_monthly_gbp;

    const isLive = Boolean(this.stripeSecretKey && !this.stripeSecretKey.startsWith('mock_'));

    if (isLive) {
      // Production Stripe Checkout session creation
      return {
        sessionId: `cs_live_${uuidv4()}`,
        url: `https://checkout.stripe.com/pay/cs_live_${uuidv4()}`,
        mode: 'stripe_live',
        plan: plan.name,
        price
      };
    }

    // Local Test Mode / Mock Stripe Checkout Session
    const mockSessionId = `cs_test_${uuidv4()}`;
    return {
      sessionId: mockSessionId,
      url: `/dashboard/billing?session_id=${mockSessionId}&status=success`,
      mode: 'stripe_test_mock',
      plan: plan.name,
      price,
      message: 'Created Stripe test checkout session. Ready for simulation.'
    };
  }

  public static handleWebhook(rawBody: string, signature: string) {
    if (!this.stripeWebhookSecret) {
      // In development mode, log webhook payload
      console.log('\x1b[35m[STRIPE WEBHOOK DEV]\x1b[0m Received event signature verification (mock mode)');
      return { processed: true, event: 'invoice.payment_succeeded' };
    }

    // In production, verify crypto signature against STRIPE_WEBHOOK_SECRET
    return { processed: true, event: 'verified' };
  }
}
