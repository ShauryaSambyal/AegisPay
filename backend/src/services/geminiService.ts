import { GoogleGenAI } from '@google/genai';
import { AIInvestigationReport, DriftBreakdown, SimulatedMerchant } from '../types/index.js';

/**
 * Forensic report generator for SIMULATED merchants only.
 *
 * Names used here are fictional (SIM-* catalogue). There is no real business
 * identity in this module, so a generated narrative cannot accuse a real shop.
 * When no Gemini key is configured the deterministic heuristic report is used.
 */
export class GeminiService {
  private static getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  public static async investigateMerchant(
    merchant: SimulatedMerchant,
    drift: DriftBreakdown
  ): Promise<AIInvestigationReport> {
    const client = this.getClient();

    if (client) {
      try {
        const prompt = `
You are a payment-risk analyst writing a triage note inside a hackathon demo.

CONTEXT: This merchant is a SIMULATED entity. Its id (${merchant.id}) and name (${merchant.displayName}) are fictional, and every metric below comes from a deterministic simulator. Never imply a real business is involved.

Use plain English. Return JSON matching this shape:
{"merchantId","merchantName","investigationDate","executiveSummary","driftVerdict":"CONFIRMED_BETTING_FRONT"|"GENUINE_SEASONAL_SURGE"|"NEEDS_FURTHER_MONITORING","confidenceScore","evidenceItems":[{"title","description","severity":"CRITICAL"|"HIGH"|"MEDIUM"|"LOW"}],"regulatoryDossier":{"fiuSuspiciousCategory","narrative","statutoryViolations":[]},"actionableRemediations":[]}

Simulated merchant facts:
- Name: ${merchant.displayName} (${merchant.id})
- Category: ${merchant.mccDescription}
- Simulated city: ${merchant.city}, ${merchant.state}
- Declared monthly turnover: ₹${merchant.declaredTurnoverMonthly.toLocaleString('en-IN')}
- Simulated monthly volume: ₹${merchant.metrics.totalVolume30d.toLocaleString('en-IN')}
- Average ticket: ₹${merchant.metrics.avgTicketSize}
- Out-of-state payers: ${(merchant.metrics.outOfStateRatio * 100).toFixed(0)}%
- Late-night share: ${(merchant.metrics.nightTimeRatio * 100).toFixed(0)}%
- Round-amount share: ${(merchant.metrics.roundAmountRatio * 100).toFixed(0)}%
- Repeat payers: ${(merchant.metrics.repeatPayerRatio * 100).toFixed(1)}%
- Rule-based score: ${drift.compositeScore}/100 (${drift.tier})
`;

        const apiPromise = client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0.2 },
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 8000)
        );
        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        if (response?.text) {
          return JSON.parse(response.text) as AIInvestigationReport;
        }
      } catch (err) {
        console.warn('Gemini call failed, using the deterministic report engine:', err);
      }
    }

    return this.generateHeuristicReport(merchant, drift);
  }

  private static generateHeuristicReport(
    merchant: SimulatedMerchant,
    drift: DriftBreakdown
  ): AIInvestigationReport {
    const isBetting = merchant.isBettingFront;
    const isLegit = !isBetting && drift.compositeScore < 30;
    const category = merchant.mccDescription.toLowerCase();
    const monthlyLakhs = (merchant.metrics.totalVolume30d / 100000).toFixed(1);
    const multiple = Math.max(
      1,
      Math.round(merchant.metrics.totalVolume30d / Math.max(1, merchant.declaredTurnoverMonthly))
    );
    const base = {
      dataOrigin: 'simulated' as const,
      merchantId: merchant.id,
      merchantName: merchant.displayName,
      investigationDate: new Date().toISOString().split('T')[0],
    };

    if (isBetting) {
      return {
        ...base,
        executiveSummary: `Simulated finding: this fictional ${category} behaves like a betting-collection front. Synthetic volume reaches ₹${monthlyLakhs} lakh (about ${multiple}x declared turnover) and mostly arrives late at night.`,
        driftVerdict: 'CONFIRMED_BETTING_FRONT',
        confidenceScore: 92,
        evidenceItems: [
          {
            title: 'Late-night concentration',
            description: `${Math.round(merchant.metrics.nightTimeRatio * 100)}% of simulated volume arrives after 22:00 against an onboarding baseline of ${Math.round(merchant.baseline.nightShare * 100)}%.`,
            severity: 'CRITICAL',
          },
          {
            title: 'Out-of-state payers',
            description: `${Math.round(merchant.metrics.outOfStateRatio * 100)}% of simulated payers are registered outside ${merchant.state}.`,
            severity: 'HIGH',
          },
          {
            title: 'Round-amount tickets',
            description: `${Math.round(merchant.metrics.roundAmountRatio * 100)}% of simulated tickets are exact round amounts typical of stakes rather than retail prices.`,
            severity: 'HIGH',
          },
          {
            title: 'Low payer retention',
            description: `Only ${(merchant.metrics.repeatPayerRatio * 100).toFixed(1)}% of simulated payer ids return.`,
            severity: 'MEDIUM',
          },
        ],
        regulatoryDossier: {
          fiuSuspiciousCategory: `Synthetic demo: behaviour inconsistent with the declared ${category} category`,
          narrative: `Demo scenario. In the simulated data this ${category} takes round-amount payments late at night from payers across India, which models a betting-collection front. No real transaction data was used.`,
          statutoryViolations: [
            'Prevention of Money Laundering Act (PMLA), 2002',
            'Public Gambling Act, 1867 & State Online Gaming Rules',
            'RBI Guidelines on Merchant Due Diligence & Monitoring',
          ],
        },
        actionableRemediations: [
          'Demo action: hold payouts pending manual review.',
          'Demo action: notify the acquiring bank with the simulated evidence pack.',
          'Demo action: restrict the checkout to local payers.',
        ],
      };
    }

    if (isLegit) {
      return {
        ...base,
        executiveSummary: `Simulated finding: a genuine ${category} with a normal seasonal rush. Payers are local, hours are business hours, and average tickets sit close to the onboarding baseline.`,
        driftVerdict: 'GENUINE_SEASONAL_SURGE',
        confidenceScore: 90,
        evidenceItems: [
          {
            title: 'Daytime trading',
            description: `${Math.round((1 - merchant.metrics.nightTimeRatio) * 100)}% of simulated purchases happen during business hours.`,
            severity: 'LOW',
          },
          {
            title: 'Local payers',
            description: `About ${Math.round((1 - merchant.metrics.outOfStateRatio) * 100)}% of simulated payers are local to ${merchant.city}.`,
            severity: 'LOW',
          },
          {
            title: 'Baseline-consistent tickets',
            description: `Average simulated ticket is ₹${merchant.metrics.avgTicketSize} against an onboarding baseline of ₹${Math.round(merchant.baseline.avgTicket)}.`,
            severity: 'LOW',
          },
        ],
        regulatoryDossier: {
          fiuSuspiciousCategory: 'Synthetic demo: normal activity with a seasonal increase',
          narrative: 'Demo scenario. Simulated payment times, amounts and payer locations are all consistent with healthy neighbourhood trade.',
          statutoryViolations: [],
        },
        actionableRemediations: [
          'Demo action: keep Tier 0 with instant payouts.',
          'Demo action: no reserve or documentation request.',
        ],
      };
    }

    return {
      ...base,
      executiveSummary: `Simulated finding: mild drift for this fictional ${category}. Ticket sizes rose slightly and a few out-of-state payers appeared, which is worth watching but does not justify friction.`,
      driftVerdict: 'NEEDS_FURTHER_MONITORING',
      confidenceScore: 74,
      evidenceItems: [
        {
          title: 'Slightly larger tickets',
          description: `Simulated average ticket is ₹${merchant.metrics.avgTicketSize} against a ₹${Math.round(merchant.baseline.avgTicket)} baseline.`,
          severity: 'MEDIUM',
        },
        {
          title: 'Some out-of-state payers',
          description: `${Math.round(merchant.metrics.outOfStateRatio * 100)}% of simulated payers are outside ${merchant.state}.`,
          severity: 'LOW',
        },
      ],
      regulatoryDossier: {
        fiuSuspiciousCategory: `Synthetic demo: ${category} testing a bulk-order line`,
        narrative: 'Demo scenario. The simulated business is adding bulk orders without updating its declared category. No betting-like behaviour found.',
        statutoryViolations: [],
      },
      actionableRemediations: [
        'Demo action: keep Tier 1 monitoring with normal payout timing.',
        'Demo action: request itemised invoices on tickets above ₹5,000.',
      ],
    };
  }
}
