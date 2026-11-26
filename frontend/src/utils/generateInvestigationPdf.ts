import { jsPDF } from 'jspdf';
import {
  AIInvestigationReport,
  RealMerchant,
  SimulatedMerchant,
  SyndicateGraphType,
  Transaction,
} from '../types';

export interface InvestigationPdfInput {
  report: AIInvestigationReport;
  simulatedMerchant?: SimulatedMerchant | null;
  realMerchant?: RealMerchant | null;
  transactions?: Transaction[];
  syndicateGraph?: SyndicateGraphType | null;
}

const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN_X = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const TOP_Y = 20;
const BOTTOM_LIMIT = 278;

const COLORS = {
  ink: [17, 24, 39] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  subtle: [148, 163, 184] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  cardBg: [248, 250, 252] as [number, number, number],
  darkHeader: [10, 10, 14] as [number, number, number],
  accentEmerald: [16, 185, 129] as [number, number, number],
  accentRose: [225, 29, 72] as [number, number, number],
  accentAmber: [217, 119, 6] as [number, number, number],
  accentSky: [2, 132, 199] as [number, number, number],
};

function cleanPdfText(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return 'N/A';
  return String(value)
    .replace(/₹/g, 'INR ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/·/g, '|')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ');
}

function formatInr(amount: number): string {
  return `INR ${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatPct(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}

function severityRgb(severity: string): [number, number, number] {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return COLORS.accentRose;
    case 'HIGH':
      return COLORS.accentAmber;
    case 'MEDIUM':
      return COLORS.accentSky;
    default:
      return COLORS.accentEmerald;
  }
}

export function generateInvestigationPdf({
  report,
  simulatedMerchant,
  realMerchant,
  transactions = [],
  syndicateGraph = null,
}: InvestigationPdfInput): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = TOP_Y;

  const isReal = !!realMerchant && !simulatedMerchant;
  const businessName = cleanPdfText(
    simulatedMerchant?.displayName || realMerchant?.name || report.merchantName
  );
  const businessId = cleanPdfText(
    simulatedMerchant?.id || realMerchant?.id || report.merchantId
  );

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > BOTTOM_LIMIT) {
      doc.addPage();
      y = TOP_Y;
    }
  };

  const drawSectionHeading = (kicker: string, title: string) => {
    ensureSpace(16);
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(cleanPdfText(kicker.toUpperCase()), MARGIN_X, y);
    y += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.ink);
    doc.text(cleanPdfText(title), MARGIN_X, y);
    y += 2.5;

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.35);
    doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
    y += 5;
  };

  const drawParagraph = (text: string, fontSize = 9.5, color = COLORS.ink, lineHeight = 4.6) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(cleanPdfText(text), CONTENT_WIDTH) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight + 1);
      doc.text(line, MARGIN_X, y);
      y += lineHeight;
    }
  };

  const drawKeyValueGrid = (rows: Array<[string, string]>) => {
    const colWidth = CONTENT_WIDTH / 2;
    const labelOffset = 2;
    for (let i = 0; i < rows.length; i += 2) {
      const left = rows[i];
      const right = rows[i + 1];

      const leftValLines = doc.splitTextToSize(cleanPdfText(left[1]), colWidth - 6) as string[];
      const rightValLines = right
        ? (doc.splitTextToSize(cleanPdfText(right[1]), colWidth - 6) as string[])
        : [];
      const rowHeight = Math.max(leftValLines.length, rightValLines.length) * 4.2 + 7.5;

      ensureSpace(rowHeight + 2);

      // Left cell
      doc.setFillColor(...COLORS.cardBg);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(MARGIN_X, y, colWidth - 2, rowHeight, 1.5, 1.5, 'FD');

      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      doc.text(cleanPdfText(left[0].toUpperCase()), MARGIN_X + labelOffset, y + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.ink);
      leftValLines.forEach((line, idx) => {
        doc.text(line, MARGIN_X + labelOffset, y + 8.5 + idx * 4.2);
      });

      // Right cell
      if (right) {
        const rx = MARGIN_X + colWidth + 2;
        doc.setFillColor(...COLORS.cardBg);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(rx, y, colWidth - 2, rowHeight, 1.5, 1.5, 'FD');

        doc.setFont('courier', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text(cleanPdfText(right[0].toUpperCase()), rx + labelOffset, y + 4);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.ink);
        rightValLines.forEach((line, idx) => {
          doc.text(line, rx + labelOffset, y + 8.5 + idx * 4.2);
        });
      }

      y += rowHeight + 2.5;
    }
  };

  // =========================================================================
  // 1. COVER BANNER / REPORT HEADER
  // =========================================================================
  doc.setFillColor(...COLORS.darkHeader);
  doc.rect(0, 0, PAGE_WIDTH, 42, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(163, 163, 163);
  doc.text('AEGISPAY SENTINEL | FORENSIC AI INVESTIGATION DOSSIER', MARGIN_X, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(businessName, MARGIN_X, 21);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 212, 216);
  doc.text(
    `ID: ${businessId}  |  ORIGIN: ${isReal ? 'OPENSTREETMAP COMMERCIAL RECORD' : 'SIMULATED MERCHANT'}  |  DATE: ${cleanPdfText(report.investigationDate)}`,
    MARGIN_X,
    29
  );

  // Verdict pill on banner
  const verdictLabel = cleanPdfText(report.driftVerdict.split('_').join(' '));
  const verdictColor =
    report.driftVerdict === 'CONFIRMED_BETTING_FRONT'
      ? COLORS.accentRose
      : report.driftVerdict === 'GENUINE_SEASONAL_SURGE'
        ? COLORS.accentEmerald
        : COLORS.accentAmber;
  doc.setFillColor(...verdictColor);
  doc.roundedRect(MARGIN_X, 32.5, 68, 6, 1.5, 1.5, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(verdictLabel, MARGIN_X + 3, 36.6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`CONFIDENCE: ${report.confidenceScore}/100`, PAGE_WIDTH - MARGIN_X - 36, 36.6);

  y = 50;

  // =========================================================================
  // 2. BUSINESS PROFILE & REGISTRATION OVERVIEW
  // =========================================================================
  drawSectionHeading('[ 01 / BUSINESS PROFILE ]', 'Entity Overview & Onboarding Profile');

  if (simulatedMerchant) {
    const turnoverMultiple = (
      simulatedMerchant.metrics.totalVolume30d /
      Math.max(1, simulatedMerchant.declaredTurnoverMonthly)
    ).toFixed(2);

    drawKeyValueGrid([
      ['Business Name', simulatedMerchant.displayName],
      ['Merchant ID', simulatedMerchant.id],
      ['MCC & Category', `${simulatedMerchant.mcc} - ${simulatedMerchant.mccDescription}`],
      ['Location', `${simulatedMerchant.city}, ${simulatedMerchant.state}`],
      ['Onboarded Date', simulatedMerchant.onboardedAt],
      ['Operational Status', simulatedMerchant.status],
      ['Risk Tier & Score', `${simulatedMerchant.riskTier} (${simulatedMerchant.riskScore}/100)`],
      ['Drift Score', `${simulatedMerchant.driftScore}/100`],
      ['Declared Monthly Turnover', formatInr(simulatedMerchant.declaredTurnoverMonthly)],
      ['30-Day Observed Volume', `${formatInr(simulatedMerchant.metrics.totalVolume30d)} (${turnoverMultiple}x declared)`],
      ['Betting Front Flag', simulatedMerchant.isBettingFront ? 'YES - FLAGGED' : 'NO'],
      ['Syndicate Network', simulatedMerchant.network || 'None detected'],
    ]);

    if (simulatedMerchant.osmAddress || simulatedMerchant.osmRef) {
      drawKeyValueGrid([
        ['OSM Reference', simulatedMerchant.osmRef || 'N/A'],
        ['OSM Address', simulatedMerchant.osmAddress || 'N/A'],
      ]);
    }
  } else if (realMerchant) {
    drawKeyValueGrid([
      ['Business Name', realMerchant.name],
      ['Entity ID', realMerchant.id],
      ['Category', realMerchant.categoryLabel],
      ['Address', realMerchant.address || 'Bengaluru, Karnataka'],
      ['Coordinates', `${realMerchant.latitude.toFixed(5)}, ${realMerchant.longitude.toFixed(5)}`],
      ['Postcode', realMerchant.postcode || 'N/A'],
      ['OSM Type & ID', `${realMerchant.osmType} #${realMerchant.osmId}`],
      ['OSM Reference', realMerchant.osmRef],
      ['Data Source', `${realMerchant.source} (${realMerchant.license})`],
      ['Commercial Status', 'Verified Display-Only Retail Record'],
    ]);
  } else {
    drawKeyValueGrid([
      ['Business Name', report.merchantName],
      ['Merchant ID', report.merchantId],
      ['Investigation Date', report.investigationDate],
      ['Confidence Score', `${report.confidenceScore}/100`],
    ]);
  }

  y += 2;

  // =========================================================================
  // 3. FINANCIAL & BEHAVIOURAL TELEMETRY (WHOLE BUSINESS)
  // =========================================================================
  if (simulatedMerchant) {
    drawSectionHeading('[ 02 / TELEMETRY & BASELINE ]', 'Financial Velocity & Behavioural Drift Metrics');

    const { metrics, baseline, interventions } = simulatedMerchant;
    drawKeyValueGrid([
      ['30-Day Transaction Count', `${metrics.transactionCount30d.toLocaleString('en-IN')} txns`],
      ['Average Ticket Size', `${formatInr(metrics.avgTicketSize)} (Baseline: ${formatInr(baseline.avgTicket)})`],
      ['Late-Night Share (>22:00)', `${formatPct(metrics.nightTimeRatio)} (Baseline: ${formatPct(baseline.nightShare)})`],
      ['Round-Amount Ticket Ratio', `${formatPct(metrics.roundAmountRatio)} (Baseline: ${formatPct(baseline.roundShare)})`],
      ['Repeat Payer Ratio', `${formatPct(metrics.repeatPayerRatio)} (Baseline: ${formatPct(baseline.repeatPayerShare)})`],
      ['Out-of-State Payer Share', formatPct(metrics.outOfStateRatio)],
      ['Match-Hour Spike Ratio', formatPct(metrics.matchHourSpikeRatio)],
      ['Baseline Provenance', `${baseline.source} (${baseline.sampledDays} days)`],
    ]);

    y += 2;
    drawSectionHeading('[ 03 / ACTIVE CONTROLS ]', 'Risk Interventions & Compliance Controls');
    drawKeyValueGrid([
      ['Rolling Reserve', `${interventions.rollingReservePercent}%`],
      ['Max Transaction Limit', formatInr(interventions.maxTransactionLimit)],
      ['Smart Geo-Fence', interventions.smartGeoFenceActive ? 'ACTIVE' : 'INACTIVE'],
      ['Video POS Verification', interventions.videoPosRequested ? 'REQUESTED' : 'NOT REQUESTED'],
      ['STR Filed (FIU-IND)', interventions.strFiled ? 'YES - FILED' : 'NO'],
      ['Risk Factors Count', `${simulatedMerchant.riskFactors.length} factor(s) recorded`],
    ]);

    if (simulatedMerchant.riskFactors.length > 0) {
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.ink);
      doc.text('Recorded System Risk Factors:', MARGIN_X, y);
      y += 4.5;
      simulatedMerchant.riskFactors.forEach(factor => {
        drawParagraph(`- ${factor}`, 9, COLORS.muted, 4.3);
      });
      y += 2;
    }
  }

  // =========================================================================
  // 4. AI EXECUTIVE SUMMARY
  // =========================================================================
  drawSectionHeading('[ 04 / AI EXECUTIVE SUMMARY ]', 'Forensic Verdict & Narrative Assessment');
  drawParagraph(report.executiveSummary, 9.5, COLORS.ink, 4.8);
  y += 3;

  // =========================================================================
  // 5. FORENSIC EVIDENCE & DRIFT FACTORS
  // =========================================================================
  drawSectionHeading('[ 05 / FORENSIC EVIDENCE ]', 'Detected Anomalies & Drift Indicators');

  if (report.evidenceItems.length === 0) {
    drawParagraph('No forensic evidence items were reported.', 9, COLORS.muted);
  } else {
    report.evidenceItems.forEach((item, index) => {
      const descLines = doc.splitTextToSize(cleanPdfText(item.description), CONTENT_WIDTH - 8) as string[];
      const boxHeight = 9 + descLines.length * 4.3;
      ensureSpace(boxHeight + 3);

      const sevColor = severityRgb(item.severity);
      doc.setFillColor(...COLORS.cardBg);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, boxHeight, 1.5, 1.5, 'FD');

      // Left severity accent bar
      doc.setFillColor(...sevColor);
      doc.rect(MARGIN_X, y, 2, boxHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLORS.ink);
      doc.text(`${index + 1}. ${cleanPdfText(item.title)}`, MARGIN_X + 5, y + 5);

      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...sevColor);
      doc.text(cleanPdfText(item.severity.toUpperCase()), PAGE_WIDTH - MARGIN_X - 18, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(...COLORS.muted);
      descLines.forEach((line, lIdx) => {
        doc.text(line, MARGIN_X + 5, y + 9.5 + lIdx * 4.3);
      });

      y += boxHeight + 2.5;
    });
  }

  y += 2;

  // =========================================================================
  // 6. REGULATORY DOSSIER & STATUTORY COMPLIANCE
  // =========================================================================
  drawSectionHeading('[ 06 / REGULATORY DOSSIER ]', 'FIU Classification, Statutory Scope & Remediations');

  drawKeyValueGrid([
    ['FIU Suspicious Category', report.regulatoryDossier.fiuSuspiciousCategory],
    ['Statutory Violations Cited', `${report.regulatoryDossier.statutoryViolations.length} statute(s)`],
  ]);

  drawParagraph(report.regulatoryDossier.narrative, 9.2, COLORS.ink, 4.6);
  y += 2;

  if (report.regulatoryDossier.statutoryViolations.length > 0) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    doc.text('Applicable Statutes & Guidelines:', MARGIN_X, y);
    y += 4.5;
    report.regulatoryDossier.statutoryViolations.forEach(statute => {
      drawParagraph(`- ${statute}`, 9, COLORS.muted, 4.3);
    });
    y += 2;
  }

  if (report.actionableRemediations.length > 0) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    doc.text('Recommended Actionable Remediations:', MARGIN_X, y);
    y += 4.5;
    report.actionableRemediations.forEach((action, idx) => {
      drawParagraph(`${idx + 1}. ${action}`, 9, COLORS.ink, 4.4);
    });
    y += 2;
  }

  // =========================================================================
  // 7. SYNDICATE GRAPH CONNECTIONS (IF ANY)
  // =========================================================================
  if (syndicateGraph) {
    const relatedLinks = syndicateGraph.links.filter(
      l => l.source === report.merchantId || l.target === report.merchantId
    );
    if (relatedLinks.length > 0) {
      drawSectionHeading('[ 07 / SYNDICATE TOPOLOGY ]', 'Connected Infrastructure & Graph Links');
      relatedLinks.slice(0, 12).forEach(link => {
        const peerId = link.source === report.merchantId ? link.target : link.source;
        const peerNode = syndicateGraph.nodes.find(n => n.id === peerId);
        const peerLabel = peerNode ? `${peerNode.name} (${peerNode.type})` : peerId;
        drawParagraph(
          `- ${link.relationship} -> ${peerLabel} | Weight: ${link.value}`,
          8.8,
          COLORS.muted,
          4.3
        );
      });
      y += 2;
    }
  }

  // =========================================================================
  // 8. RECENT TRANSACTION ACTIVITY SAMPLE (IF AVAILABLE)
  // =========================================================================
  const merchantTxns = transactions
    .filter(t => t.merchantId === report.merchantId)
    .slice(0, 12);

  if (merchantTxns.length > 0) {
    drawSectionHeading('[ 08 / TRANSACTION SAMPLE ]', `Recent Payment Activity (${merchantTxns.length} Shown)`);

    // Table header
    ensureSpace(12);
    doc.setFillColor(...COLORS.darkHeader);
    doc.rect(MARGIN_X, y, CONTENT_WIDTH, 6.5, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    doc.text('TIMESTAMP', MARGIN_X + 2, y + 4.4);
    doc.text('AMOUNT', MARGIN_X + 42, y + 4.4);
    doc.text('METHOD', MARGIN_X + 70, y + 4.4);
    doc.text('PAYER REGION', MARGIN_X + 96, y + 4.4);
    doc.text('RISK', MARGIN_X + 135, y + 4.4);
    doc.text('FLAGS', MARGIN_X + 148, y + 4.4);
    y += 7.5;

    merchantTxns.forEach((txn, idx) => {
      ensureSpace(6.5);
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.cardBg);
        doc.rect(MARGIN_X, y - 3.8, CONTENT_WIDTH, 5.5, 'F');
      }
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.ink);
      const ts = cleanPdfText(txn.timestamp).replace('T', ' ').slice(0, 16);
      doc.text(ts, MARGIN_X + 2, y);
      doc.text(formatInr(txn.amount), MARGIN_X + 42, y);
      doc.text(cleanPdfText(txn.paymentMethod), MARGIN_X + 70, y);
      doc.text(cleanPdfText(`${txn.payerCity}, ${txn.payerState}`).slice(0, 20), MARGIN_X + 96, y);
      doc.text(`${txn.riskScore}`, MARGIN_X + 135, y);
      doc.text(
        cleanPdfText(txn.anomalyFlags.length > 0 ? txn.anomalyFlags.join(', ') : 'NONE').slice(0, 18),
        MARGIN_X + 148,
        y
      );
      y += 5.5;
    });
  }

  // =========================================================================
  // FOOTER ON EVERY PAGE
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, PAGE_HEIGHT - 14, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 14);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.subtle);
    doc.text(
      `AegisPay Sentinel | Generated ${generatedAt} | ${isReal ? 'OSM Commercial Record' : 'Simulated Demo Data'}`,
      MARGIN_X,
      PAGE_HEIGHT - 9
    );
    doc.text(`Page ${p} of ${totalPages}`, PAGE_WIDTH - MARGIN_X - 20, PAGE_HEIGHT - 9);
  }

  const safeSlug = businessId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `AegisPay_Investigation_${safeSlug}_${report.investigationDate || 'report'}.pdf`;
  doc.save(fileName);
}
