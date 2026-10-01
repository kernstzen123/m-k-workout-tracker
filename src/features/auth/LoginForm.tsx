"use client";

import { Dumbbell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { authErrorMessage, resetPassword, signIn } from "@/lib/data/auth";
import { errorCode, reportError } from "@/lib/monitoring";
import { toast } from "@/lib/toast";
import { useAuthStore } from "./store";

export function LoginForm() {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "signedIn" || status === "denied") router.replace("/");
  }, [status, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await signIn(email, password);
    } catch (err) {
      const code = errorCode(err);
      if (!code?.startsWith("auth/invalid") && code !== "auth/wrong-password") {
        reportError(err, { where: "signIn" });
      }
      setError(authErrorMessage(code));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    if (!email.trim()) {
      setError("Enter your email first, then tap “Forgot password”.");
      return;
    }
    try {
      await resetPassword(email);
      toast.success("If that account exists, a reset email is on its way.");
    } catch (err) {
      reportError(err, { where: "resetPassword" });
      toast.success("If that account exists, a reset email is on its way.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-fg">
          <Dumbbell aria-hidden className="size-9" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight">M&amp;K Workout</h1>
        <p className="text-muted">Sign in to log your training.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" block disabled={busy || !email || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Forgot password
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Private app — accounts are created by the owners. There is no sign-up.
      </p>
    </main>
  );
}
