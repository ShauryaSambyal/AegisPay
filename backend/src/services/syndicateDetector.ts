import { SimMerchantId, SyndicateGraph, SyndicateLink, SyndicateNode, SyndicateNodeId } from '../types/index.js';
import { simulatedMerchants, findSimulatedMerchant } from '../data/simulatedMerchants.js';

/**
 * Simulated syndicate graph.
 *
 * Every node and edge is fabricated demo data attached to SIM-* identities with
 * fictional names. No real OpenStreetMap business appears here, and this module
 * never imports the real-merchant dataset.
 */

const RING_ID = 'RING-CRICKET';

const ringMembers = (): SimMerchantId[] =>
  simulatedMerchants
    .filter(merchant => merchant.network === RING_ID)
    .map(merchant => merchant.id);

const nameOf = (id: string): string => findSimulatedMerchant(id)?.displayName ?? id;
const categoryOf = (id: string): string => findSimulatedMerchant(id)?.mccDescription ?? 'Simulated merchant';

export const SYNDICATE_HUB_ID = 'HUB-SIM-RING-1' as SyndicateNodeId;
export const PAYER_CLUSTER_NORTH = 'CLUSTER-SIM-PAYERS-NORTH' as SyndicateNodeId;
export const PAYER_CLUSTER_WEST = 'CLUSTER-SIM-PAYERS-WEST' as SyndicateNodeId;
export const SHARED_DEVICE_ID = 'INFRA-SIM-DEVICE-POOL' as SyndicateNodeId;

export class SyndicateDetector {
  public static getSyndicateGraph(): SyndicateGraph {
    const members = ringMembers();
    const merchantNodes: SyndicateNode[] = members.map(id => {
      const merchant = findSimulatedMerchant(id);
      return {
        id,
        dataOrigin: 'simulated',
        name: nameOf(id),
        type: 'MERCHANT',
        riskScore: merchant?.riskScore ?? 0,
        category: `${categoryOf(id)} (MCC ${merchant?.mcc ?? 'n/a'})`,
        details: `${merchant?.riskFactors[0] ?? 'Simulated merchant.'} Identity is fictional and anonymized.`,
      };
    });

    const controlNodes: SyndicateNode[] = simulatedMerchants
      .filter(merchant => merchant.network === null && merchant.riskScore < 25)
      .slice(0, 1)
      .map(merchant => ({
        id: merchant.id,
        dataOrigin: 'simulated' as const,
        name: merchant.displayName,
        type: 'MERCHANT' as const,
        riskScore: merchant.riskScore,
        category: `${merchant.mccDescription} (MCC ${merchant.mcc})`,
        details: 'Honest simulated control merchant with no edges in the ring.',
      }));

    const infraNodes: SyndicateNode[] = [
      {
        id: SYNDICATE_HUB_ID,
        dataOrigin: 'simulated',
        name: 'Simulated Ring Aggregator',
        type: 'SYNDICATE_AGGREGATOR',
        riskScore: 99,
        category: 'Simulated offshore aggregator',
        details: 'Fictional aggregator that distributes anonymous payment instructions in this demo scenario.',
      },
      {
        id: PAYER_CLUSTER_NORTH,
        dataOrigin: 'simulated',
        name: 'Simulated Payer Cluster North',
        type: 'PAYER_CLUSTER',
        riskScore: 88,
        category: 'Simulated payer ring',
        details: 'Modelled cluster of round-amount payers between 23:00 and 02:00.',
      },
      {
        id: PAYER_CLUSTER_WEST,
        dataOrigin: 'simulated',
        name: 'Simulated Payer Cluster West',
        type: 'PAYER_CLUSTER',
        riskScore: 82,
        category: 'Simulated payer ring',
        details: 'Modelled cluster of synchronized bursts aligned with match windows.',
      },
      {
        id: SHARED_DEVICE_ID,
        dataOrigin: 'simulated',
        name: 'Simulated Shared Device Pool',
        type: 'IP_SUBNET',
        riskScore: 95,
        category: 'Simulated device fingerprint pool',
        details: 'Fictional shared device fingerprint used by the simulated ring checkouts.',
      },
    ];

    const links: SyndicateLink[] = [];
    const link = (
      source: SyndicateNodeId,
      target: SyndicateNodeId,
      value: number,
      relationship: SyndicateLink['relationship']
    ): void => {
      links.push({ source, target, value, relationship });
    };

    members.forEach((id, index) => {
      link(index % 2 === 0 ? PAYER_CLUSTER_NORTH : PAYER_CLUSTER_WEST, id, 240 + index * 70, 'FUNDS_ROUTED');
      link(id, SYNDICATE_HUB_ID, 400 + index * 90, 'FUNDS_ROUTED');
      if (index !== 1) link(SHARED_DEVICE_ID, id, 500 + index * 60, 'SHARED_DEVICE');
    });
    if (members.length >= 2) {
      link(members[1], members[0], 120, 'BURST_SYNCHRONIZED');
      link(members[0], members[2] ?? members[1], 90, 'COMMON_PAYER_CLUSTER');
    }

    return {
      dataOrigin: 'simulated',
      nodes: [...merchantNodes, ...controlNodes, ...infraNodes],
      links,
    };
  }
}
