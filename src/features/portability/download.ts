import { toDayString } from "@/lib/dates";

/** Save text as a file via a temporary object URL (works offline, no server round trip). */
export function downloadText(
  filename: string,
  text: string,
  type = "text/csv;charset=utf-8",
): void {
  // BOM so Excel opens UTF-8 (é, ×, –) correctly.
  const blob = new Blob(["\uFEFF", text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const exportName = (kind: string) => `mk-workout-${kind}-${toDayString()}.csv`;

/** Example files for each import type. */
export const TEMPLATES = {
  workouts:
    "date,workout,duration_min,session_notes,exercise,set_type,weight_kg,reps,rpe,rest_sec,set_note\r\n" +
    "2025-06-02,Upper A,62,Felt strong,Barbell Bench Press,warmup,40,10,,,\r\n" +
    "2025-06-02,Upper A,62,Felt strong,Barbell Bench Press,working,80,8,8,150,\r\n" +
    "2025-06-02,Upper A,62,Felt strong,Barbell Row,working,70,10,,120,\r\n",
  cardio:
    "date,type,duration_min,distance_km,avg_hr,intensity\r\n2025-06-02,Incline Treadmill Walk,15,1.2,118,low\r\n",
  body:
    "date,weight_kg,body_fat_pct,chest_cm,waist_cm,hips_cm,arms_cm,thighs_cm,calves_cm,neck_cm\r\n" +
    "2025-06-02,80.4,16.5,,84,,,,,\r\n",
} as const;
