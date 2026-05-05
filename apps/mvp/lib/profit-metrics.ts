import { db } from "./db";

export interface ProfitMetricsData {
  totalRevenue: number;
  totalCreatorPayouts: number;
  totalPrintCosts: number;
  platformProfit: number;
  paidOrdersCount: number;
  cyclesWithData: number;
}

export async function calculateProfitMetrics(): Promise<ProfitMetricsData> {
  // Fetch all paid billing records with their financial data
  const billingRecords = await db.billingRecord.findMany({
    where: {
      status: "PAID",
    },
    select: {
      amount: true,
      wholesaleTotalAmount: true,
      platformMarkupAmount: true,
      creatorPayoutAmount: true,
      cycleId: true,
    },
  });

  // Fetch all sent creator payouts
  const _creatorPayouts = await db.creatorPayout.findMany({
    where: {
      status: "SENT",
    },
    select: {
      amount: true,
    },
  });

  // Calculate metrics
  const totalRevenue = billingRecords.reduce(
    (sum, record) => sum + Number(record.amount),
    0,
  );

  // Print costs are the wholesale amounts from Peecho
  const totalPrintCosts = billingRecords.reduce(
    (sum, record) => sum + Number(record.wholesaleTotalAmount || 0),
    0,
  );

  // Creator payouts from the billing records (actual payout amounts)
  const totalCreatorPayouts = billingRecords.reduce(
    (sum, record) => sum + Number(record.creatorPayoutAmount || 0),
    0,
  );

  // Platform profit is the markup minus what we pay creators
  // Or calculated as: Revenue - Print Costs - Creator Payouts
  const platformProfit = totalRevenue - totalPrintCosts - totalCreatorPayouts;

  // Count unique cycles with data
  const uniqueCycles = new Set(billingRecords.map((r) => r.cycleId));

  return {
    totalRevenue,
    totalCreatorPayouts,
    totalPrintCosts,
    platformProfit,
    paidOrdersCount: billingRecords.length,
    cyclesWithData: uniqueCycles.size,
  };
}

export async function calculateProfitMetricsByCycle(
  cycleId: string,
): Promise<ProfitMetricsData> {
  const billingRecords = await db.billingRecord.findMany({
    where: {
      cycleId,
      status: "PAID",
    },
    select: {
      amount: true,
      wholesaleTotalAmount: true,
      creatorPayoutAmount: true,
    },
  });

  const totalRevenue = billingRecords.reduce(
    (sum, record) => sum + Number(record.amount),
    0,
  );

  const totalPrintCosts = billingRecords.reduce(
    (sum, record) => sum + Number(record.wholesaleTotalAmount || 0),
    0,
  );

  const totalCreatorPayouts = billingRecords.reduce(
    (sum, record) => sum + Number(record.creatorPayoutAmount || 0),
    0,
  );

  const platformProfit = totalRevenue - totalPrintCosts - totalCreatorPayouts;

  return {
    totalRevenue,
    totalCreatorPayouts,
    totalPrintCosts,
    platformProfit,
    paidOrdersCount: billingRecords.length,
    cyclesWithData: billingRecords.length > 0 ? 1 : 0,
  };
}
