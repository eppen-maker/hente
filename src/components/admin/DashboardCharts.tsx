"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatNumber } from "@/lib/format";
import type { DashboardMetrics } from "@/lib/admin/stats";

/**
 * Operational charts. Each answers a question an admin actually asks:
 * is order intake holding up, how much volume is moving per month, and which
 * campaigns carry the quarter.
 */

const INK = "#16150f";
const CLAY = "#d8c8b6";
const LINE = "#e6dfd3";
const MUTED = "#9a958a";

const AXIS = { fill: MUTED, fontSize: 11 };

const TOOLTIP = {
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  backgroundColor: "#ffffff",
  fontSize: 12,
  boxShadow: "0 12px 32px rgba(22,21,15,0.10)",
};

function NoData({ label }: { label: string }) {
  return (
    <div className="grid h-56 place-items-center text-sm text-ink-faint">{label}</div>
  );
}

export function OrdersOverTimeChart({ data }: { data: DashboardMetrics["ordersOverTime"] }) {
  if (data.length === 0) return <NoData label="Ingen bestillinger ennå." />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={LINE} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: LINE }} tick={AXIS} dy={4} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            tick={AXIS}
          />
          <Tooltip
            contentStyle={TOOLTIP}
            labelFormatter={(label) => `Dato ${String(label)}`}
            formatter={(value, name) =>
              name === "value"
                ? [formatCurrency(Number(value)), "Ordreverdi"]
                : [formatNumber(Number(value)), "Bestillinger"]
            }
          />
          <Area
            type="monotone"
            dataKey="orders"
            stroke={INK}
            strokeWidth={1.5}
            fill={CLAY}
            fillOpacity={0.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumePerMonthChart({ data }: { data: DashboardMetrics["volumePerMonth"] }) {
  if (data.length === 0) return <NoData label="Ingen volum registrert ennå." />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={LINE} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: LINE }} tick={AXIS} dy={4} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={AXIS}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip
            cursor={{ fill: "rgba(22,21,15,0.04)" }}
            contentStyle={TOOLTIP}
            formatter={(value) => [formatNumber(Number(value)), "Produkter"]}
          />
          <Bar dataKey="units" fill={INK} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LargestCampaignsChart({
  data,
}: {
  data: DashboardMetrics["largestCampaigns"];
}) {
  if (data.length === 0) return <NoData label="Ingen dugnader med bestillinger ennå." />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid horizontal={false} stroke={LINE} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <YAxis
            type="category"
            dataKey="organization"
            tickLine={false}
            axisLine={false}
            width={120}
            tick={AXIS}
          />
          <Tooltip
            cursor={{ fill: "rgba(22,21,15,0.04)" }}
            contentStyle={TOOLTIP}
            formatter={(value, name) =>
              name === "profit"
                ? [formatCurrency(Number(value)), "Til klubben"]
                : [formatNumber(Number(value)), "Produkter"]
            }
          />
          <Bar dataKey="units" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={index === 0 ? INK : CLAY} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
