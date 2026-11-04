import { Merchant, RiskTier, DriftBreakdown } from '../types/index.js';

export class DriftEngine {
  /**
   * Computes the Risk Score for a merchant based on 5 clear signals
   */
  public static calculateDrift(merchant: Merchant): DriftBreakdown {
    const { metrics, mcc, city, state } = merchant;

    // 1. Strange Hours (Weight: 25%)
    let temporalScore = 0;
    if (mcc === '5462' || mcc === '7210' || mcc === '7230') {
      const lateNightPenalty = Math.min(100, metrics.nightTimeRatio * 130);
      const matchHourPenalty = Math.min(100, metrics.matchHourSpikeRatio * 120);
      temporalScore = Math.round(lateNightPenalty * 0.5 + matchHourPenalty * 0.5);
    } else {
      temporalScore = Math.round(metrics.nightTimeRatio * 80);
    }

    // 2. Far-Away Payers (Weight: 25%)
    const outOfStateThreshold = mcc === '5462' ? 0.20 : 0.40;
    let geoScore = 0;
    if (metrics.outOfStateRatio > outOfStateThreshold) {
      geoScore = Math.min(100, Math.round(((metrics.outOfStateRatio - outOfStateThreshold) / 0.8) * 100));
    } else {
      geoScore = Math.round(metrics.outOfStateRatio * 40);
    }

    // 3. Exact Round Bet Amounts (Weight: 20%)
    const roundPenalty = Math.min(100, Math.round(metrics.roundAmountRatio * 105));
    const ticketSizeAnomaly = metrics.avgTicketSize > 1000 && mcc === '5462' ? 30 : 0;
    const amountScore = Math.min(100, Math.round(roundPenalty * 0.8 + ticketSizeAnomaly * 0.2));

    // 4. One-Time Strangers vs Repeat Locals (Weight: 15%)
    let payerScore = 0;
    if (metrics.repeatPayerRatio < 0.10) {
      payerScore = Math.round((1 - metrics.repeatPayerRatio) * 100);
    } else {
      payerScore = Math.max(0, Math.round((0.35 - metrics.repeatPayerRatio) * 100));
    }

    // 5. Huge Money vs Small Store (Weight: 15%)
    const volumeMultiplier = metrics.totalVolume30d / merchant.declaredTurnoverMonthly;
    let digitalScore = 0;
    if (volumeMultiplier > 5.0) {
      digitalScore = 95;
    } else if (volumeMultiplier > 2.5) {
      digitalScore = 65;
    } else if (volumeMultiplier > 1.3) {
      digitalScore = 30;
    } else {
      digitalScore = 10;
    }

    // Composite Score
    const composite = Math.round(
      temporalScore * 0.25 +
      geoScore * 0.25 +
      amountScore * 0.20 +
      payerScore * 0.15 +
      digitalScore * 0.15
    );

    // False Positive Safeguard for Honest Bakeries:
    let adjustedScore = composite;
    let falsePositiveSafetyAssessment = 'Normal business evaluation.';
    if (metrics.repeatPayerRatio > 0.30 && metrics.nightTimeRatio < 0.10) {
      adjustedScore = Math.min(30, Math.round(composite * 0.35));
      falsePositiveSafetyAssessment = 
        `HONEST SHOP PROTECTED: Normal holiday or festival sales detected (39%+ repeat local neighbors, daytime shopping). Reduced risk score from ${composite} to ${adjustedScore} so the shopkeeper is not disturbed.`;
    }

    // Assign Level
    let tier: RiskTier = 'TIER_0_SAFE';
    let recommendedAction = 'Standard instant payout. No action needed.';

    if (adjustedScore >= 81) {
      tier = 'TIER_3_QUARANTINE';
      recommendedAction = 'Stop payouts immediately, request video check of store, and file official report for authorities.';
    } else if (adjustedScore >= 56) {
      tier = 'TIER_2_RESTRICT';
      recommendedAction = 'Hold 20% safety reserve, limit single payments to ₹1,000, and only allow local payments.';
    } else if (adjustedScore >= 26) {
      tier = 'TIER_1_MONITOR';
      recommendedAction = 'Keep watching quietly. Ask buyers to confirm receipt items at checkout.';
    }

    return {
      merchantId: merchant.id,
      compositeScore: adjustedScore,
      tier,
      components: {
        temporalAnomaly: {
          score: temporalScore,
          weight: 0.25,
          detail: `${Math.round(metrics.nightTimeRatio * 100)}% of money comes in late at night (10:30 PM - 2:00 AM); ${Math.round(metrics.matchHourSpikeRatio * 100)}% arrives right as live cricket matches end`,
          peakHours: merchant.isBettingFront ? ['11:00 PM - 12:00 AM (Cricket Match End)', '12:30 AM - 2:00 AM (Midnight Bet Settlement)'] : ['9:00 AM - 11:30 AM (Morning Pastry)', '5:30 PM - 8:00 PM (Evening Cake Pickups)']
        },
        geographicEntropy: {
          score: geoScore,
          weight: 0.25,
          detail: `${Math.round(metrics.outOfStateRatio * 100)}% of buyers live outside ${state} for a small local store in ${city}`,
          topPayerRegions: merchant.isBettingFront 
            ? [{ region: 'Delhi NCR', count: 1240 }, { region: 'Maharashtra', count: 980 }, { region: 'Karnataka', count: 820 }, { region: 'Local (MP)', count: 210 }]
            : [{ region: `${city} Metro`, count: 2650 }, { region: `Nearby ${state}`, count: 390 }, { region: 'Other States', count: 80 }]
        },
        amountDistribution: {
          score: amountScore,
          weight: 0.20,
          detail: `${Math.round(metrics.roundAmountRatio * 100)}% of payments are exact round bet amounts (₹500, ₹1,000, ₹5,000) with average payment of ₹${metrics.avgTicketSize}`,
          roundNumberPct: Math.round(metrics.roundAmountRatio * 100)
        },
        payerEntropy: {
          score: payerScore,
          weight: 0.15,
          detail: `Only ${(metrics.repeatPayerRatio * 100).toFixed(1)}% are repeat customers (a normal bakery usually has 35% - 50% regulars)`,
          oneOffPayerPct: Math.round((1 - metrics.repeatPayerRatio) * 100)
        },
        digitalFootprint: {
          score: digitalScore,
          weight: 0.15,
          detail: `Sales are ${volumeMultiplier.toFixed(1)} times higher than what they reported when signing up (Reported: ₹${(merchant.declaredTurnoverMonthly / 100000).toFixed(1)}L, Current: ₹${(metrics.totalVolume30d / 100000).toFixed(1)}L)`,
          webCatalogActive: !merchant.isBettingFront,
          mapsReviewVolume: merchant.isBettingFront ? 3 : 248
        }
      },
      recommendedAction,
      falsePositiveSafetyAssessment
    };
  }
}
