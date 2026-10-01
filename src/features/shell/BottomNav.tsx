"use client";

import { Dumbbell, History, House, LayoutGrid, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS: Array<{ href: string; label: string; icon: LucideIcon; match: string[] }> = [
  { href: "/", label: "Home", icon: House, match: ["/"] },
  { href: "/workout", label: "Workout", icon: Dumbbell, match: ["/workout"] },
  { href: "/history", label: "History", icon: History, match: ["/history"] },
  { href: "/progress", label: "Progress", icon: TrendingUp, match: ["/progress"] },
  {
    href: "/more",
    label: "More",
    icon: LayoutGrid,
    match: ["/more", "/program", "/exercises", "/cardio", "/body", "/compare", "/settings"],
  },
];

function isActive(pathname: string, match: string[]): boolean {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = isActive(pathname, match);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-accent" : "text-muted hover:text-fg",
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
