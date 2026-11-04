import { GoogleGenAI } from '@google/genai';
import { Merchant, AIInvestigationReport, DriftBreakdown } from '../types/index.js';

export class GeminiService {
  private static getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  public static async investigateMerchant(
    merchant: Merchant,
    drift: DriftBreakdown
  ): Promise<AIInvestigationReport> {
    const client = this.getClient();

    if (client) {
      try {
        const prompt = `
You are a Senior Risk & Payment Security Officer at PayU investigating whether a registered retail business is secretly collecting money for illegal sports betting ("The Bakery That Takes Bets" problem).

IMPORTANT CONTEXT: The merchant name, address and category are real OpenStreetMap records. Every transaction, risk metric, risk score and intervention in this exercise is SYNTHETIC DEMO DATA created for a hackathon. Never state or imply that the real business has actually committed a crime. Frame findings as a simulated risk scenario.

IMPORTANT INSTRUCTION: Use simple, plain, everyday English. Do NOT use confusing jargon or difficult words. Write clearly so anyone can understand.

Merchant Information:
- Shop Name: ${merchant.name} (ID: ${merchant.id})
- Registered Legal Entity (synthetic placeholder): ${merchant.legalEntity}
- Registered Type: ${merchant.mccDescription}
- Location: ${merchant.city}, ${merchant.state}
- Reported Monthly Sales: ₹${merchant.declaredTurnoverMonthly.toLocaleString('en-IN')}
- Current Monthly Sales: ₹${merchant.metrics.totalVolume30d.toLocaleString('en-IN')}
- Average Order: ₹${merchant.metrics.avgTicketSize}
- Out-of-State Buyers: ${(merchant.metrics.outOfStateRatio * 100).toFixed(0)}%
- Late Night Payments (10:30 PM - 2:00 AM): ${(merchant.metrics.nightTimeRatio * 100).toFixed(0)}%
- Match-End Spike: ${(merchant.metrics.matchHourSpikeRatio * 100).toFixed(0)}%
- Exact Round Amounts (₹1,000, ₹5,000, etc.): ${(merchant.metrics.roundAmountRatio * 100).toFixed(0)}%
- Returning Local Customers: ${(merchant.metrics.repeatPayerRatio * 100).toFixed(1)}%
- Risk Score: ${drift.compositeScore}/100

Return a valid JSON object in this exact format:
{
  "merchantId": "${merchant.id}",
  "merchantName": "${merchant.name}",
  "investigationDate": "${new Date().toISOString().split('T')[0]}",
  "executiveSummary": "2-3 clear simple sentences summarising whether this shop's synthetic payment pattern looks like illegal betting collection or an honest business. Mention that this is a demo scenario.",
  "driftVerdict": "CONFIRMED_BETTING_FRONT" | "GENUINE_SEASONAL_SURGE" | "NEEDS_FURTHER_MONITORING",
  "confidenceScore": number (85-99 for clear cases),
  "evidenceItems": [
    {
      "title": "Clear short title",
      "description": "Simple explanation of the fact observed",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "regulatoryDossier": {
    "fiuSuspiciousCategory": "Simple summary of why this account is suspicious",
    "narrative": "Clear explanation for bank and police authorities in simple terms, explicitly noting the data is synthetic",
    "statutoryViolations": ["Prevention of Money Laundering Act (PMLA) 2002", "Public Gambling Act 1867", "RBI Payment Guidelines"]
  },
  "actionableRemediations": [
    "Step 1...",
    "Step 2..."
  ]
}
`;

        const apiPromise = client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        // 8 second timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 8000)
        );

        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return parsed as AIInvestigationReport;
        }
      } catch (err) {
        console.warn('Gemini API call timed out or failed, using built-in report engine:', err);
      }
    }

    // High quality intelligent report fallback
    return this.generateHeuristicReport(merchant, drift);
  }

  private static generateHeuristicReport(merchant: Merchant, drift: DriftBreakdown): AIInvestigationReport {
    const isBetting = merchant.isBettingFront;
    const isLegit = !isBetting && drift.compositeScore < 30;
    const category = merchant.mccDescription.toLowerCase();
    const monthlyLakhs = (merchant.metrics.totalVolume30d / 100000).toFixed(1);
    const multiple = Math.max(
      1,
      Math.round(merchant.metrics.totalVolume30d / Math.max(1, merchant.declaredTurnoverMonthly))
    );

    if (isBetting) {
      return {
        merchantId: merchant.id,
        merchantName: merchant.name,
        investigationDate: new Date().toISOString().split('T')[0],
        executiveSummary: `Synthetic demo finding: this real OpenStreetMap ${category} identity is used to model a betting-collection front. In the simulated data, monthly payments reach ₹${monthlyLakhs} Lakhs (about ${multiple}x the declared turnover) and mostly arrive late at night when cricket matches finish.`,
        driftVerdict: 'CONFIRMED_BETTING_FRONT',
        confidenceScore: 96,
        evidenceItems: [
          {
            title: 'Payments Arrive Late at Night',
            description: `${Math.round(merchant.metrics.nightTimeRatio * 100)}% of the simulated money arrives between 10:30 PM and 2:00 AM, matching cricket match death overs and bet settlements rather than normal ${category} opening hours.`,
            severity: 'CRITICAL'
          },
          {
            title: 'Customers Live in Other States',
            description: `${Math.round(merchant.metrics.outOfStateRatio * 100)}% of simulated buyers live in distant cities with no delivery service for this small local shop in ${merchant.city}.`,
            severity: 'CRITICAL'
          },
          {
            title: 'Exact Round Bet Amounts',
            description: `${Math.round(merchant.metrics.roundAmountRatio * 100)}% of simulated payments are exact round numbers (₹1,000, ₹2,500, ₹5,000, ₹10,000) typical of betting stakes rather than normal ${category} prices.`,
            severity: 'HIGH'
          },
          {
            title: 'One-Time Strangers Instead of Regulars',
            description: `Only ${(merchant.metrics.repeatPayerRatio * 100).toFixed(1)}% of simulated buyers ever return. These are modelled as one-time bettors given QR codes on Telegram.`,
            severity: 'HIGH'
          }
        ],
        regulatoryDossier: {
          fiuSuspiciousCategory: `Synthetic demo: shop activity does not match registered ${category} business (modelled as an illegal betting collection point)`,
          narrative: `Demo scenario for the challenge. The merchant identity "${merchant.name}" comes from OpenStreetMap. The synthetic entity "${merchant.legalEntity}" is registered as a ${category}. In the simulated data, payments arrive late at night from across India during sports events, which models the shop as a betting collection point. Monthly sales (₹${monthlyLakhs} Lakhs) are about ${multiple}x the declared turnover. No real transaction data was used.`,
          statutoryViolations: [
            'Prevention of Money Laundering Act (PMLA), 2002',
            'Public Gambling Act, 1867 & State Online Gaming Rules',
            'RBI Guidelines on Merchant Due Diligence & Monitoring'
          ]
        },
        actionableRemediations: [
          'Demo action: stop payment payouts immediately to keep funds safe.',
          'Demo action: send an official Suspicious Activity Report to bank authorities and police.',
          'Demo action: lock the QR code so it only accepts payments within 15 km of the shop.',
          `Demo action: request a live photo or video of the open ${category} counter.`
        ]
      };
    } else if (isLegit) {
      return {
        merchantId: merchant.id,
        merchantName: merchant.name,
        investigationDate: new Date().toISOString().split('T')[0],
        executiveSummary: `Synthetic demo finding: this is a genuine, honest ${category} in the simulated data, experiencing a normal seasonal rush. Sales rose because of local festive demand, and customers are nearby families buying during normal daytime hours.`,
        driftVerdict: 'GENUINE_SEASONAL_SURGE',
        confidenceScore: 94,
        evidenceItems: [
          {
            title: 'Normal Daytime Shopping Hours',
            description: `${Math.round((1 - merchant.metrics.nightTimeRatio) * 100)}% of simulated purchases happen during normal business hours, consistent with everyday neighbourhood trade.`,
            severity: 'LOW'
          },
          {
            title: 'Local Neighbourhood Families',
            description: `About ${Math.round((1 - merchant.metrics.outOfStateRatio) * 100)}% of simulated customers live near ${merchant.city}, showing strong local community support.`,
            severity: 'LOW'
          },
          {
            title: 'Normal Prices & Loyal Regulars',
            description: `Simulated ticket sizes average ₹${merchant.metrics.avgTicketSize}, and ${(merchant.metrics.repeatPayerRatio * 100).toFixed(1)}% of customers are returning regulars.`,
            severity: 'LOW'
          }
        ],
        regulatoryDossier: {
          fiuSuspiciousCategory: 'Synthetic demo: normal business activity with a seasonal sales increase (verified clean)',
          narrative: `Demo scenario for the challenge. The merchant identity "${merchant.name}" comes from OpenStreetMap. In the simulated data, sales rose with documented local festive demand. Payment times, prices and customer locations are all consistent with a healthy neighbourhood ${category}.`,
          statutoryViolations: []
        },
        actionableRemediations: [
          'Demo action: keep Level 0 (Safe) — no payment holds or restrictions.',
          'Demo action: raise the sales limit to accommodate festive rushes.',
          'Demo action: keep payouts instant so the shopkeeper experiences zero delays.'
        ]
      };
    } else {
      return {
        merchantId: merchant.id,
        merchantName: merchant.name,
        investigationDate: new Date().toISOString().split('T')[0],
        executiveSummary: `Synthetic demo finding: this ${category} shows a mild change in business. Average order size rose slightly, consistent with a small new bulk-order line. Recommend watching quietly without interrupting the business.`,
        driftVerdict: 'NEEDS_FURTHER_MONITORING',
        confidenceScore: 78,
        evidenceItems: [
          {
            title: 'Slightly Larger Order Sizes',
            description: `Simulated average order values are ₹${merchant.metrics.avgTicketSize}, with occasional bulk orders from nearby offices.`,
            severity: 'MEDIUM'
          },
          {
            title: 'A Few Orders from Nearby Business Areas',
            description: `${Math.round(merchant.metrics.outOfStateRatio * 100)}% of simulated orders come from outside ${merchant.state}, consistent with a small corporate or gifting channel.`,
            severity: 'LOW'
          }
        ],
        regulatoryDossier: {
          fiuSuspiciousCategory: `Synthetic demo: ${category} expanding into bulk orders without updating its declared category`,
          narrative: `Demo scenario for the challenge. The merchant identity "${merchant.name}" comes from OpenStreetMap. In the simulated data the business is adding a bulk-order line. No signs of illegal betting or money laundering were found in this scenario.`,
          statutoryViolations: []
        },
        actionableRemediations: [
          'Demo action: keep Level 1 (Watch) and ask buyers to confirm line items on orders above ₹5,000.',
          `Demo action: remind the owner to update the registered category to include bulk ${category} orders.`,
          'Demo action: continue normal next-day payouts without disturbing the shop.'
        ]
      };
    }
  }
}
