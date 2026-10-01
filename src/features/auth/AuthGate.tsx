"use client";

import { ShieldX, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Page";
import { reportError } from "@/lib/monitoring";
import { useAuthStore } from "./store";

/** Renders children only for an allowlisted, signed-in user. */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
  }, [status, router]);

  if (status === "signedIn") return <>{children}</>;

  if (status === "unconfigured") {
    return (
      <FullScreen icon={<Wrench aria-hidden />} title="Firebase isn't configured">
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in your Firebase web config,
        and restart the dev server. See the README.
      </FullScreen>
    );
  }

  if (status === "denied") {
    return (
      <FullScreen icon={<ShieldX aria-hidden />} title="This account isn't allowed">
        <p>This app is private. Sign in with one of the two allowlisted accounts.</p>
        <Button
          className="mt-4"
          onClick={() => signOut().catch((e: unknown) => reportError(e, { where: "signOut" }))}
        >
          Sign out
        </Button>
      </FullScreen>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  );
}

function FullScreen({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-muted [&_svg]:size-12">{icon}</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="max-w-sm text-muted">{children}</div>
    </main>
  );
}
