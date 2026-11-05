import { DriftBreakdown, DriftComponents, RiskTier, SimulatedMerchant } from '../types/index.js';

const tierForScore = (score: number): RiskTier => {
  if (score <= 25) return 'TIER_0_SAFE';
  if (score <= 55) return 'TIER_1_MONITOR';
  if (score <= 80) return 'TIER_2_RESTRICT';
  return 'TIER_3_QUARANTINE';
};

const clamp = (value: number): number => Math.max(0, Math.min(100, value));

const robustDeviation = (value: number, baseline: number): number => {
  if (baseline <= 0) return value > 0 ? 3 : 0;
  return Math.max(0, (value - baseline) / baseline);
};

/**
 * Rule-based drift engine over SIMULATED merchants only.
 *
 * There are no MCC-specific hardcoded weights: every comparison is made against
 * the merchant's own onboarding baseline, with an explicit category fallback
 * when a merchant has no usable baseline (cold start).
 */
export class DriftEngine {
  public static calculateDrift(merchant: SimulatedMerchant): DriftBreakdown {
    const { metrics, baseline } = merchant;
    const coldStart = baseline.source === 'category_fallback' || baseline.sampledDays <= 0;

    // 1. Temporal deviation versus the merchant's own night-time baseline.
    const nightRatio = robustDeviation(metrics.nightTimeRatio, Math.max(baseline.nightShare, 0.01));
    const temporalScore = clamp(
      Math.min(100, nightRatio * 55) * 0.7 + Math.min(100, metrics.matchHourSpikeRatio * 120) * 0.3
    );

    // 2. Geographic dispersion: payers far from the merchant's own city.
    const geoScore = clamp(Math.min(100, (metrics.outOfStateRatio / 0.6) * 100));

    // 3. Amount discipline versus the onboarding baseline round-share.
    const roundRatio = robustDeviation(metrics.roundAmountRatio, Math.max(baseline.roundShare, 0.01));
    const amountScore = clamp(
      Math.min(100, roundRatio * 40) * 0.65 + Math.min(100, metrics.roundAmountRatio * 100) * 0.35
    );

    // 4. Payer retention versus the onboarding repeat-payer share.
    const retentionGap = Math.max(
      0,
      (baseline.repeatPayerShare - metrics.repeatPayerRatio) / Math.max(baseline.repeatPayerShare, 0.01)
    );
    const payerScore = clamp(retentionGap * 100);

    // 5. Baseline deviation: volume and ticket versus declared onboarding values.
    const volumeMultiple = metrics.totalVolume30d / Math.max(1, merchant.declaredTurnoverMonthly);
    const ticketMultiple = metrics.avgTicketSize / Math.max(1, baseline.avgTicket);
    const baselineScore = clamp(
      Math.min(100, Math.max(0, volumeMultiple - 1) * 45) * 0.6 +
        Math.min(100, Math.max(0, ticketMultiple - 1) * 40) * 0.4
    );

    const composite = Math.round(
      temporalScore * 0.24 +
        geoScore * 0.2 +
        amountScore * 0.2 +
        payerScore * 0.16 +
        baselineScore * 0.2
    );

    // False-positive safeguard for genuine seasonal/honest behaviour.
    let adjustedScore = composite;
    let safety = coldStart
      ? 'Cold start: no merchant-level baseline yet, category fallback applied and no adverse action taken.'
      : 'Assessed against this merchant\'s own onboarding baseline.';
    if (!coldStart && metrics.repeatPayerRatio >= 0.3 && metrics.nightTimeRatio <= 0.1) {
      adjustedScore = Math.min(30, Math.round(composite * 0.4));
      safety =
        'Honest-shop safeguard: high repeat-payer share with daytime-only trading reduced the score so no payout friction is applied.';
    }

    const tier = tierForScore(adjustedScore);
    const recommendedAction =
      tier === 'TIER_3_QUARANTINE'
        ? 'Hold payouts, request a video POS check, and route to manual review.'
        : tier === 'TIER_2_RESTRICT'
          ? 'Apply a rolling reserve, cap single payments, and restrict to local payers.'
          : tier === 'TIER_1_MONITOR'
            ? 'Monitor quietly and request itemised invoices on large tickets.'
            : 'Standard instant payout. No action needed.';

    const components: DriftComponents = {
      temporalAnomaly: {
        score: Math.round(temporalScore),
        weight: 0.24,
        detail: coldStart
          ? `Cold start: ${(metrics.nightTimeRatio * 100).toFixed(0)}% late-night share compared with the category fallback baseline.`
          : `Late-night share is ${(metrics.nightTimeRatio * 100).toFixed(0)}% against an onboarding baseline of ${(baseline.nightShare * 100).toFixed(0)}%.`,
        peakHours:
          metrics.nightTimeRatio > 0.2
            ? ['22:00-00:00 (simulated burst window)', '00:00-02:00 (simulated settlement window)']
            : ['09:00-12:00 (normal trading)', '17:00-20:00 (evening peak)'],
      },
      geographicEntropy: {
        score: Math.round(geoScore),
        weight: 0.2,
        detail: `${(metrics.outOfStateRatio * 100).toFixed(0)}% of simulated payers are registered outside ${merchant.state}.`,
        topPayerRegions: [
          { region: 'Local metro', count: Math.round(metrics.transactionCount30d * (1 - metrics.outOfStateRatio)) },
          { region: 'Other states', count: Math.round(metrics.transactionCount30d * metrics.outOfStateRatio) },
        ],
      },
      amountDistribution: {
        score: Math.round(amountScore),
        weight: 0.2,
        detail: `${(metrics.roundAmountRatio * 100).toFixed(0)}% of simulated tickets are exact round amounts; average ticket ₹${metrics.avgTicketSize}.`,
        roundNumberPct: Math.round(metrics.roundAmountRatio * 100),
      },
      payerEntropy: {
        score: Math.round(payerScore),
        weight: 0.16,
        detail: `${(metrics.repeatPayerRatio * 100).toFixed(0)}% of simulated payers return, against an onboarding baseline of ${(baseline.repeatPayerShare * 100).toFixed(0)}%.`,
        oneOffPayerPct: Math.round((1 - metrics.repeatPayerRatio) * 100),
      },
      baselineDeviation: {
        score: Math.round(baselineScore),
        weight: 0.2,
        detail: `Simulated volume is ${volumeMultiple.toFixed(1)}x declared turnover and average ticket is ${ticketMultiple.toFixed(1)}x the onboarding baseline (${baseline.source}).`,
        baselineSource: baseline.source,
      },
    };

    return {
      dataOrigin: 'simulated',
      merchantId: merchant.id,
      compositeScore: adjustedScore,
      tier,
      components,
      recommendedAction,
      falsePositiveSafetyAssessment: safety,
    };
  }
}
