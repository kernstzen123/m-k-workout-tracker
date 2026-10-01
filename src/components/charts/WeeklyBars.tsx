"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { TooltipCard } from "./ChartFrame";
import { useChartColors } from "./useChartColors";

/**
 * Single-series weekly columns: ≤24px wide, 4px rounded data-end, square at the baseline,
 * per-bar hover tooltip, and a value label on the current (last) week only.
 */
export function WeeklyBars<T extends { label: string }>({
  data,
  dataKey,
  seriesLabel,
  format,
  height = 200,
}: {
  data: readonly T[];
  dataKey: keyof T & string;
  seriesLabel: string;
  format: (value: number) => string;
  height?: number;
}) {
  const c = useChartColors();
  const lastIndex = data.length - 1;
  return (
    <div style={{ height }} className="-mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data as T[]} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeWidth={1} />
          <XAxis
            dataKey="label"
            tick={{ fill: c.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            width={36}
            allowDecimals={false}
            tick={{ fill: c.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: c.bandFill }}
            isAnimationActive={false}
            content={(props: TooltipContentProps) => {
              const p = props.payload?.[0];
              if (!props.active || p?.value == null) return null;
              return (
                <TooltipCard
                  heading={`Week of ${String(props.label ?? "")}`}
                  rows={[
                    {
                      label: seriesLabel,
                      value: format(Number(p.value)),
                      color: c.series1,
                      mark: "bar",
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            // Recharts types data keys per concrete row type; our generic key is checked by the props.
            dataKey={dataKey as never}
            name={seriesLabel}
            fill={c.series1}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            label={(props: {
              x?: unknown;
              y?: unknown;
              width?: unknown;
              index?: number;
              value?: unknown;
            }) =>
              props.index === lastIndex && props.value != null && Number(props.value) > 0 ? (
                <text
                  x={Number(props.x) + Number(props.width) / 2}
                  y={Number(props.y) - 6}
                  textAnchor="middle"
                  fill={c.text}
                  fontSize={12}
                  fontWeight={600}
                >
                  {format(Number(props.value))}
                </text>
              ) : null
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
