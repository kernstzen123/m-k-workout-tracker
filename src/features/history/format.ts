import { format, parseISO } from "date-fns";

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

export function formatDay(date: string, pattern = "EEE d MMM"): string {
  return format(parseISO(date), pattern);
}

export function formatKg(n: number): string {
  return `${Math.round(n).toLocaleString()} kg`;
}
