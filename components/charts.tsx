"use client";

import {
  Area,
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { compact, pct } from "@/lib/format";

const AXIS = { stroke: "var(--line-strong)", tickLine: false, axisLine: false } as const;

function TooltipBox({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string | number;
  unit?: "nok" | "pct" | "plain";
}) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number | undefined) =>
    v === undefined || v === null
      ? "DATA UNAVAILABLE"
      : unit === "pct"
        ? pct(v)
        : unit === "plain"
          ? new Intl.NumberFormat("nb-NO").format(v)
          : `NOK ${compact(v)}`;
  return (
    <div className="card px-3 py-2 shadow-sm" style={{ background: "var(--surface)" }}>
      <div className="label mb-1.5">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[11.5px] text-ink-2">
          <span className="w-2 h-2 rounded-[1px] shrink-0" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="num ml-auto text-ink">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartFrame({
  children,
  height = 240,
  legend,
}: {
  children: ReactNode;
  height?: number;
  legend?: { name: string; color: string }[];
}) {
  return (
    <div>
      {legend && legend.length > 1 ? (
        <div className="flex items-center gap-4 mb-3">
          {legend.map((l) => (
            <div key={l.name} className="flex items-center gap-1.5 text-[11px] text-ink-2">
              <span className="w-2.5 h-2.5 rounded-[1px]" style={{ background: l.color }} />
              {l.name}
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ height, width: "100%" }}>{children}</div>
    </div>
  );
}

/** Two measures on one NOK axis over time: capital deployed vs estimated value. */
export function PortfolioTrend({
  data,
}: {
  data: { year: number; deployed: number; estimatedValue: number }[];
}) {
  return (
    <ChartFrame
      height={250}
      legend={[
        { name: "Estimated value", color: "var(--chart-1)" },
        { name: "Capital deployed", color: "var(--chart-2)" },
      ]}
    >
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" {...AXIS} dy={6} />
          <YAxis {...AXIS} width={64} tickFormatter={(v) => compact(v as number)} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "var(--line-strong)" }} />
          <Area
            type="monotone"
            dataKey="estimatedValue"
            name="Estimated value"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#gValue)"
            dot={{ r: 3, strokeWidth: 0, fill: "var(--chart-1)" }}
          />
          <Line
            type="monotone"
            dataKey="deployed"
            name="Capital deployed"
            stroke="var(--chart-2)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3, strokeWidth: 0, fill: "var(--chart-2)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Single-measure column chart (revenue, EBITDA, equity, …). */
export function ColumnChart({
  data,
  dataKey,
  name,
  height = 200,
  color = "var(--chart-1)",
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  name: string;
  height?: number;
  color?: string;
}) {
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" {...AXIS} dy={6} />
          <YAxis {...AXIS} width={60} tickFormatter={(v) => compact(v as number)} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--surface-2)" }} />
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          <Bar dataKey={dataKey} name={name} fill={color} radius={[3, 3, 0, 0]} maxBarSize={34} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Single-measure ratio line (margin, equity ratio, ROE). Percent axis. */
export function RatioChart({
  data,
  dataKey,
  name,
  height = 200,
  color = "var(--chart-3)",
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  name: string;
  height?: number;
  color?: string;
}) {
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" {...AXIS} dy={6} />
          <YAxis {...AXIS} width={52} tickFormatter={(v) => pct(v as number, 0)} />
          <Tooltip content={<TooltipBox unit="pct" />} cursor={{ stroke: "var(--line-strong)" }} />
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={name}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3.5, strokeWidth: 0, fill: color }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Ordered downside → base → upside. Sequential ramp, never categorical hues. */
export function ScenarioChart({
  data,
  invested,
  height = 210,
}: {
  data: { name: string; value: number | null }[];
  invested: number;
  height?: number;
}) {
  const colors = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)"];
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="name" {...AXIS} dy={6} />
          <YAxis {...AXIS} width={64} tickFormatter={(v) => compact(v as number)} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--surface-2)" }} />
          <ReferenceLine
            y={invested}
            stroke="var(--ink-3)"
            strokeDasharray="4 3"
            label={{ value: "Invested", position: "insideTopLeft", fill: "var(--ink-3)", fontSize: 10 }}
          />
          <Bar dataKey="value" name="Scenario value" radius={[3, 3, 0, 0]} maxBarSize={56}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i] ?? colors[2]} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
