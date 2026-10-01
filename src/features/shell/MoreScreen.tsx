import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Ruler,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/Page";

const LINKS: Array<{ href: string; label: string; description: string; icon: LucideIcon }> = [
  { href: "/program", label: "Program", description: "Our weekly split", icon: ClipboardList },
  {
    href: "/exercises",
    label: "Exercise library",
    description: "Add, edit, archive",
    icon: BookOpen,
  },
  { href: "/cardio", label: "Cardio", description: "Log and weekly totals", icon: HeartPulse },
  { href: "/body", label: "Body", description: "Weight, body fat, tape", icon: Ruler },
  { href: "/compare", label: "Compare", description: "Our key lifts side by side", icon: Users },
  {
    href: "/settings",
    label: "Settings",
    description: "Profile, rest timer, theme",
    icon: Settings,
  },
];

export function MoreScreen() {
  return (
    <>
      <PageHeader title="More" />
      <ul className="flex flex-col gap-2">
        {LINKS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-18 items-center gap-4 rounded-2xl border border-border bg-surface px-4 transition-colors hover:bg-surface-2 active:bg-surface-3"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon aria-hidden className="size-6" />
              </span>
              <span className="flex-1">
                <span className="block text-[1.0625rem] font-semibold">{label}</span>
                <span className="block text-sm text-muted">{description}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
