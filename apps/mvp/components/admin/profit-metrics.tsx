"use client";

import {
  CreditCard,
  Package,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface ProfitMetricsData {
  totalRevenue: number;
  totalCreatorPayouts: number;
  totalPrintCosts: number;
  platformProfit: number;
  paidOrdersCount: number;
  cyclesWithData: number;
}

interface ProfitMetricsProps {
  data: ProfitMetricsData;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function MetricCard({
  title,
  amount,
  icon: Icon,
  trend,
  trendDirection,
  subtitle,
  variant = "neutral",
}: {
  title: string;
  amount: string;
  icon: React.ElementType;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  subtitle?: string;
  variant?: "positive" | "negative" | "neutral" | "highlight";
}) {
  const variantStyles = {
    positive: "bg-jade-50 border-jade-200",
    negative: "bg-red-50 border-red-200",
    neutral: "bg-beige-50 border-beige-200",
    highlight: "bg-fuchsia-50 border-fuchsia-200",
  };

  const iconStyles = {
    positive: "text-jade-600 bg-jade-100",
    negative: "text-red-600 bg-red-100",
    neutral: "text-muted-foreground/60 bg-beige-200",
    highlight: "text-fuchsia-600 bg-fuchsia-100",
  };

  return (
    <div className={`rounded-lg border p-6 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground/60">{title}</p>
          <p className="mt-2 text-2xl font-bold text-foreground>{amount}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground/50">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-2 ${iconStyles[variant]}`}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          {trendDirection === "up" && (
            <TrendingUp className="h-4 w-4 text-jade-600" />
          )}
          {trendDirection === "down" && (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          <span
            className={`text-xs font-medium ${
              trendDirection === "up"
                ? "text-jade-600"
                : trendDirection === "down"
                  ? "text-red-600"
                  : "text-muted-foreground/50"
            }`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

export function ProfitMetrics({ data }: ProfitMetricsProps) {
  const profitMargin =
    data.totalRevenue > 0
      ? ((data.platformProfit / data.totalRevenue) * 100).toFixed(1)
      : "0.0";

  const avgOrderValue =
    data.paidOrdersCount > 0 ? data.totalRevenue / data.paidOrdersCount : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Platform Profit"
          amount={formatCurrency(data.platformProfit)}
          icon={PiggyBank}
          variant={data.platformProfit >= 0 ? "positive" : "negative"}
          subtitle={`${profitMargin}% margin across ${data.cyclesWithData} cycles`}
        />
        <MetricCard
          title="Total Revenue"
          amount={formatCurrency(data.totalRevenue)}
          icon={CreditCard}
          variant="highlight"
          subtitle={`${data.paidOrdersCount} paid orders`}
        />
        <MetricCard
          title="Creator Payouts"
          amount={formatCurrency(data.totalCreatorPayouts)}
          icon={Wallet}
          variant="neutral"
          subtitle="Distributed to creators"
        />
        <MetricCard
          title="Print & Fulfillment"
          amount={formatCurrency(data.totalPrintCosts)}
          icon={Package}
          variant="neutral"
          subtitle="Peecho wholesale costs"
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="rounded-lg border border-beige-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-foreground>Profit Breakdown</h3>
        <p className="text-sm text-muted-foreground/60">
          Financial overview across all completed cycles
        </p>

        <div className="mt-6 space-y-4">
          {/* Revenue Bar */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground>Total Revenue</span>
              <span className="font-mono text-foreground>
                {formatCurrency(data.totalRevenue)}
              </span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-beige-100">
              <div
                className="h-full rounded-full bg-fuchsia-500"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Costs Stack */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground/70">
                  <span className="h-2 w-2 rounded-full bg-ocean-500" />
                  Creator Payouts
                </span>
                <span className="font-mono text-muted-foreground/70">
                  {formatCurrency(data.totalCreatorPayouts)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-beige-100">
                <div
                  className="h-full rounded-full bg-ocean-500"
                  style={{
                    width:
                      data.totalRevenue > 0
                        ? `${(data.totalCreatorPayouts / data.totalRevenue) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground/70">
                  <span className="h-2 w-2 rounded-full bg-beige-400" />
                  Print & Fulfillment
                </span>
                <span className="font-mono text-muted-foreground/70">
                  {formatCurrency(data.totalPrintCosts)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-beige-100">
                <div
                  className="h-full rounded-full bg-beige-400"
                  style={{
                    width:
                      data.totalRevenue > 0
                        ? `${(data.totalPrintCosts / data.totalRevenue) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-jade-700">
                  <span className="h-2 w-2 rounded-full bg-jade-500" />
                  Platform Profit
                </span>
                <span className="font-mono font-medium text-jade-700">
                  {formatCurrency(data.platformProfit)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-beige-100">
                <div
                  className="h-full rounded-full bg-jade-500"
                  style={{
                    width:
                      data.totalRevenue > 0
                        ? `${Math.max(0, (data.platformProfit / data.totalRevenue) * 100)}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-beige-200 pt-6 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/50">
              Avg Order Value
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground>
              {formatCurrency(avgOrderValue)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/50">
              Profit Margin
            </p>
            <p className="mt-1 text-lg font-semibold text-jade-600">
              {profitMargin}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/50">
              Creator Share
            </p>
            <p className="mt-1 text-lg font-semibold text-ocean-600">
              {data.totalRevenue > 0
                ? `${((data.totalCreatorPayouts / data.totalRevenue) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/50">
              Fulfillment Share
            </p>
            <p className="mt-1 text-lg font-semibold text-beige-600">
              {data.totalRevenue > 0
                ? `${((data.totalPrintCosts / data.totalRevenue) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
