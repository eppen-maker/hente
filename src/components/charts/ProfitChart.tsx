"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatCurrencyCompact, formatNumber } from "@/lib/format";
import { projectFromTotalProducts } from "@/lib/calc/fundraising";

interface ProfitChartProps {
  volumes: readonly number[];
  participants: number;
  /** Volume drawn in full contrast. */
  highlight?: number;
}

/**
 * Profit by order volume. Deliberately sparse — no legend, no gradients,
 * one accent bar.
 */
export function ProfitChart({ volumes, participants, highlight }: ProfitChartProps) {
  const data = volumes.map((volume) => {
    const projection = projectFromTotalProducts({ participants, totalProducts: volume });
    return {
      volume,
      label: formatNumber(volume),
      profit: projection.organizationProfit,
      perParticipant: projection.productsPerParticipant,
    };
  });

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#e6dfd3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#e6dfd3" }}
            tick={{ fill: "#6f6b60", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fill: "#9a958a", fontSize: 12 }}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <Tooltip
            cursor={{ fill: "rgba(22,21,15,0.04)" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e6dfd3",
              backgroundColor: "#ffffff",
              fontSize: 13,
              boxShadow: "0 12px 32px rgba(22,21,15,0.10)",
            }}
            labelFormatter={(label) => `${String(label)} produkter`}
            formatter={(value) => [formatCurrency(Number(value)), "Til klubben"]}
          />
          <Bar dataKey="profit" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={entry.volume}
                fill={highlight === entry.volume ? "#16150f" : "#d8c8b6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
