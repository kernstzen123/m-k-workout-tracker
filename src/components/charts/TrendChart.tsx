"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { TooltipCard, type LegendItem } from "./ChartFrame";
import { useChartColors } from "./useChartColors";

export interface TrendSeries<T> {
  key: keyof T & string;
  label: string;
  /** "chart-1" is the main series; "chart-2" the comparison. */
  color: "chart-1" | "chart-2";
  /** line = 2px line (with end dot); dots = points only (e.g. raw weigh-ins). */
  kind: "line" | "dots";
  format: (value: number) => string;
}

/**
 * Line/point trend over time. Thin 2px lines, ≥8px ringed dots, solid hairline grid, crosshair
 * tooltip listing every series, and a direct label on the main series' last value only.
 */
export function TrendChart<T extends { label: string }>({
  data,
  series,
  height = 220,
  yDomain,
}: {
  data: readonly T[];
  series: TrendSeries<T>[];
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
}) {
  const c = useChartColors();
  const colorOf = (s: TrendSeries<T>) => (s.color === "chart-1" ? c.series1 : c.series2);
  const main = series[0];
  const lastIndex = data.length - 1;

  return (
    <div style={{ height }} className="-mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data as T[]} margin={{ top: 12, right: 40, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeWidth={1} />
          <XAxis
            dataKey="label"
            tick={{ fill: c.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            width={44}
            tick={{ fill: c.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            domain={yDomain ?? ["auto", "auto"]}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            cursor={{ stroke: c.muted, strokeWidth: 1 }}
            isAnimationActive={false}
            content={(props: TooltipContentProps) => {
              if (!props.active || !props.payload?.length) return null;
              return (
                <TooltipCard
                  heading={String(props.label ?? "")}
                  rows={series
                    .map((s) => {
                      const p = props.payload?.find((x) => x.dataKey === s.key);
                      if (p?.value == null) return null;
                      return {
                        label: s.label,
                        value: s.format(Number(p.value)),
                        color: colorOf(s),
                        mark: (s.kind === "dots" ? "dot" : "line") as LegendItem["mark"],
                      };
                    })
                    .filter((r): r is NonNullable<typeof r> => r !== null)}
                />
              );
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stroke={s.kind === "dots" ? "transparent" : colorOf(s)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls
              isAnimationActive={false}
              dot={
                s.kind === "dots"
                  ? { r: 4, fill: colorOf(s), stroke: c.surface, strokeWidth: 2 }
                  : (props: { cx?: number; cy?: number; index?: number }) =>
                      props.index === lastIndex && props.cx != null && props.cy != null ? (
                        <circle
                          key="end"
                          cx={props.cx}
                          cy={props.cy}
                          r={4}
                          fill={colorOf(s)}
                          stroke={c.surface}
                          strokeWidth={2}
                        />
                      ) : (
                        <g key={props.index} />
                      )
              }
              activeDot={{ r: 5, fill: colorOf(s), stroke: c.surface, strokeWidth: 2 }}
              label={
                s === main
                  ? (props: { x?: unknown; y?: unknown; index?: number; value?: unknown }) =>
                      props.index === lastIndex && props.value != null ? (
                        <text
                          x={Number(props.x) + 8}
                          y={Number(props.y)}
                          dy={4}
                          fill={c.text}
                          fontSize={12}
                          fontWeight={600}
                        >
                          {s.format(Number(props.value))}
                        </text>
                      ) : null
                  : undefined
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
