import { RiskLevel } from '../types/index.js';

export interface NoShowFeatures {
  leadTimeDays: number;
  priorNoShows: number;
  priorCompleted: number;
  hasCompletedIntake: boolean;
  hasConfirmedReminder: boolean;
  consultationType: 'in_person' | 'video' | 'phone';
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  patientAge?: number;
}

export interface PredictionResult {
  score: number; // probability between 0.00 and 1.00
  riskLevel: RiskLevel;
  factors: string[];
  recommendation: string;
}

/**
 * Transparent statistical scoring model for UK Clinic Outpatient No-Show Risk.
 * Uses a logistic probability function with calibrated health-system weights.
 */
export class NoShowPredictionService {
  public static predict(features: NoShowFeatures): PredictionResult {
    // Intercept baseline log-odds for UK private/NHS general practice (~12% baseline)
    let logit = -2.0;
    const factors: string[] = [];

    // 1. Lead Time Impact: Every day of lead time adds slight decay in attendance commitment
    if (features.leadTimeDays > 14) {
      logit += 0.85;
      factors.push('Long booking lead time (> 14 days)');
    } else if (features.leadTimeDays > 5) {
      logit += 0.40;
      factors.push('Moderate booking lead time (> 5 days)');
    } else if (features.leadTimeDays <= 1) {
      logit -= 0.50;
      factors.push('Same-day / next-day booking (higher urgency)');
    }

    // 2. Prior No-Show History
    if (features.priorNoShows >= 2) {
      logit += 1.30;
      factors.push(`${features.priorNoShows} prior missed appointments on record`);
    } else if (features.priorNoShows === 1) {
      logit += 0.65;
      factors.push('1 prior missed appointment on record');
    }

    // Prior Reliability Bonus
    if (features.priorCompleted >= 3 && features.priorNoShows === 0) {
      logit -= 0.70;
      factors.push('Consistent attendance record (0 missed visits)');
    }

    // 3. Digital Patient Intake Completion
    if (features.hasCompletedIntake) {
      logit -= 0.80;
      factors.push('Pre-consultation intake form completed');
    } else {
      logit += 0.35;
      factors.push('Intake form pending completion');
    }

    // 4. Two-way SMS / Automated Confirmation
    if (features.hasConfirmedReminder) {
      logit -= 0.90;
      factors.push('Confirmed attendance via two-way notification');
    } else {
      logit += 0.25;
      factors.push('Reminder unconfirmed');
    }

    // 5. Consultation Type
    if (features.consultationType === 'video') {
      logit -= 0.30;
      factors.push('Telemedicine consultation (no travel required)');
    }

    // 6. Day of Week (Monday/Friday peak outpatient variance)
    if (features.dayOfWeek === 1 || features.dayOfWeek === 5) {
      logit += 0.20;
    }

    // Logistic sigmoid transformation: P = 1 / (1 + e^(-logit))
    const probability = 1 / (1 + Math.exp(-logit));
    const score = Math.round(probability * 1000) / 1000;

    let riskLevel: RiskLevel = 'low';
    let recommendation = 'Standard clinical workflow. Automated reminder scheduled.';

    if (score >= 0.40) {
      riskLevel = 'high';
      recommendation = 'Suggest friendly telephone check-in by reception and standby waiting list allocation.';
    } else if (score >= 0.22) {
      riskLevel = 'medium';
      recommendation = 'Send priority SMS confirmation prompt 24h prior to appointment.';
    }

    return {
      score,
      riskLevel,
      factors,
      recommendation
    };
  }
}
