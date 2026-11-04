import { SyndicateGraph } from '../types/index.js';
import { merchants } from '../data/merchantsData.js';

/**
 * Graph identities are real OpenStreetMap merchants. Every edge, risk score
 * and cluster below is a synthetic demo scenario built for the challenge —
 * no real business is being accused of fraud.
 */
const merchantName = (id: string): string =>
  merchants.find(m => m.id === id)?.name ?? id;

const merchantCity = (id: string): string =>
  merchants.find(m => m.id === id)?.city ?? 'Unknown';

export class SyndicateDetector {
  public static getSyndicateGraph(): SyndicateGraph {
    return {
      nodes: [
        // Synthetic "front" merchants layered onto real OSM identities
        {
          id: 'MERC-BAKE-001',
          name: `${merchantName('MERC-BAKE-001')} (${merchantCity('MERC-BAKE-001')})`,
          type: 'MERCHANT',
          riskScore: 84,
          category: 'Retail Bakery Front (MCC 5462)',
          details:
            'Demo scenario: real OSM bakery identity with a synthetic risk layer modelling cricket-stake deposits after 10:30 PM.'
        },
        {
          id: 'MERC-REST-006',
          name: `${merchantName('MERC-REST-006')} (${merchantCity('MERC-REST-006')})`,
          type: 'MERCHANT',
          riskScore: 67,
          category: 'Dine-in Restaurant Front (MCC 5812)',
          details:
            'Demo scenario: synthetic night-time volume and shared payer cluster with the bakery node.'
        },
        {
          id: 'MERC-CONV-018',
          name: `${merchantName('MERC-CONV-018')} (${merchantCity('MERC-CONV-018')})`,
          type: 'MERCHANT',
          riskScore: 66,
          category: 'Convenience Store Front (MCC 5499)',
          details:
            'Demo scenario: synthetic round-ticket smurfing pattern and shared device fingerprint.'
        },
        {
          id: 'MERC-BAKE-002',
          name: `${merchantName('MERC-BAKE-002')} (${merchantCity('MERC-BAKE-002')})`,
          type: 'MERCHANT',
          riskScore: 2,
          category: 'Legitimate Merchant (MCC 5462)',
          details:
            'Real OSM bakery identity kept as an honest control. Synthetic risk layer is low; zero links to the demo cluster.'
        },

        // Synthetic syndicate hub & payer clusters
        {
          id: 'HUB-BET-SYNDICATE',
          name: 'Telegram "WinCric99" Betting Ring Aggregator',
          type: 'SYNDICATE_AGGREGATOR',
          riskScore: 99,
          category: 'Offshore Syndicate Gateway (Synthetic Demo)',
          details: 'Fictional aggregator that disperses mule QR codes to bettor channels in this demo scenario.'
        },
        {
          id: 'CLUSTER-PAYERS-NORTH',
          name: 'Payer Cluster #104 (Delhi / NCR / Punjab)',
          type: 'PAYER_CLUSTER',
          riskScore: 88,
          category: 'Synthetic Bettor Origin Ring (1,420 demo UPI IDs)',
          details: 'Demo pattern: high-frequency round-amount transfers (₹1k, ₹5k, ₹10k) between 23:00 and 02:00.'
        },
        {
          id: 'CLUSTER-PAYERS-WEST',
          name: 'Payer Cluster #208 (Mumbai / Ahmedabad)',
          type: 'PAYER_CLUSTER',
          riskScore: 82,
          category: 'Synthetic Bettor Origin Ring (890 demo UPI IDs)',
          details: 'Demo pattern: concurrent burst transfers matching IPL live matches.'
        },
        {
          id: 'INFRA-VPN-SUBNET',
          name: 'Mullvad / NordVPN Proxy Subnet (185.220.101.0/24)',
          type: 'IP_SUBNET',
          riskScore: 95,
          category: 'Obfuscated Routing Gateway (Synthetic Demo)',
          details: 'Fictional shared device fingerprint and IP proxy range used across the demo front checkouts.'
        }
      ],
      links: [
        {
          source: 'CLUSTER-PAYERS-NORTH',
          target: 'MERC-BAKE-001',
          value: 450,
          relationship: 'FUNDS_ROUTED'
        },
        {
          source: 'CLUSTER-PAYERS-NORTH',
          target: 'MERC-REST-006',
          value: 280,
          relationship: 'COMMON_PAYER_CLUSTER'
        },
        {
          source: 'CLUSTER-PAYERS-WEST',
          target: 'MERC-BAKE-001',
          value: 390,
          relationship: 'FUNDS_ROUTED'
        },
        {
          source: 'CLUSTER-PAYERS-WEST',
          target: 'MERC-CONV-018',
          value: 240,
          relationship: 'BURST_SYNCHRONIZED'
        },
        {
          source: 'MERC-BAKE-001',
          target: 'HUB-BET-SYNDICATE',
          value: 850,
          relationship: 'FUNDS_ROUTED'
        },
        {
          source: 'MERC-REST-006',
          target: 'HUB-BET-SYNDICATE',
          value: 520,
          relationship: 'FUNDS_ROUTED'
        },
        {
          source: 'MERC-CONV-018',
          target: 'HUB-BET-SYNDICATE',
          value: 480,
          relationship: 'FUNDS_ROUTED'
        },
        {
          source: 'INFRA-VPN-SUBNET',
          target: 'MERC-BAKE-001',
          value: 900,
          relationship: 'SHARED_DEVICE'
        },
        {
          source: 'INFRA-VPN-SUBNET',
          target: 'MERC-CONV-018',
          value: 600,
          relationship: 'SHARED_DEVICE'
        }
      ]
    };
  }
}
