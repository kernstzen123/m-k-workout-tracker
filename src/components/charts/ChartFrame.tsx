import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface LegendItem {
  label: string;
  color: string;
  /** Legend key mirrors the mark: a short line for lines, a dot for points, a block for bars. */
  mark: "line" | "dot" | "bar";
}

export interface TableColumn<T> {
  label: string;
  value: (row: T) => ReactNode;
  numeric?: boolean;
}

/**
 * Chart card: title + subtitle, a legend when there are ≥ 2 series, the chart, and a
 * "Show as table" disclosure so every value is reachable without hovering.
 */
export function ChartFrame<T>({
  title,
  subtitle,
  legend,
  children,
  table,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  legend?: LegendItem[];
  children: ReactNode;
  table?: { rows: readonly T[]; columns: TableColumn<T>[]; caption: string };
  className?: string;
}) {
  return (
    <figure className={cn("rounded-2xl border border-border bg-surface p-4", className)}>
      <figcaption className="mb-3">
        <p className="eyebrow">{title}</p>
        {subtitle ? <div className="text-sm text-muted">{subtitle}</div> : null}
        {legend && legend.length >= 2 ? (
          <ul
            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted"
            aria-label="Legend"
          >
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <LegendKey color={item.color} mark={item.mark} />
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}
      </figcaption>
      {children}
      {table ? (
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer content-center font-semibold text-accent">
            Show as table
          </summary>
          <div className="mt-2 max-h-72 overflow-auto">
            <table className="w-full border-collapse">
              <caption className="sr-only">{table.caption}</caption>
              <thead>
                <tr className="text-left text-xs tracking-wider text-muted uppercase">
                  {table.columns.map((c) => (
                    <th
                      key={c.label}
                      scope="col"
                      className={cn("py-1 pr-3 font-semibold", c.numeric && "text-right")}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...table.rows].reverse().map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {table.columns.map((c) => (
                      <td
                        key={c.label}
                        className={cn("py-1.5 pr-3", c.numeric && "tabular text-right")}
                      >
                        {c.value(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </figure>
  );
}

export function LegendKey({ color, mark }: { color: string; mark: LegendItem["mark"] }) {
  if (mark === "line")
    return <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: color }} />;
  if (mark === "dot")
    return <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />;
  return <span aria-hidden className="size-3 rounded-sm" style={{ background: color }} />;
}

/** Tooltip body: values lead (strong), series names follow; rows keyed with the mark. */
export function TooltipCard({
  heading,
  rows,
}: {
  heading: string;
  rows: Array<{ label: string; value: string; color: string; mark: LegendItem["mark"] }>;
}) {
  return (
    <div className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm shadow-xl">
      <p className="mb-1 text-xs font-semibold text-muted">{heading}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          <LegendKey color={r.color} mark={r.mark} />
          <span className="tabular font-semibold text-fg">{r.value}</span>
          <span className="text-muted">{r.label}</span>
        </p>
      ))}
    </div>
  );
}
