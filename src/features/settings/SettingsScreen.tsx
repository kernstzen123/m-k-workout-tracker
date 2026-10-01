"use client";

import { LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/Field";
import { Card, CardTitle, PageHeader } from "@/components/ui/Page";
import { Switch } from "@/components/ui/Switch";
import { useAuthStore } from "@/features/auth/store";
import { InstallCard } from "@/features/pwa/InstallCard";
import { RestAlertsCard } from "@/features/rest-timer/RestAlertsCard";
import { reportError } from "@/lib/monitoring";
import { userProfileSchema } from "@/lib/schemas/user";
import { toast } from "@/lib/toast";
import { applyThemePref, useThemePref, type ThemePref } from "./theme";

const THEMES: Array<{ value: ThemePref; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export function SettingsScreen() {
  const { user, profile, saveProfile, signOut } = useAuthStore();
  const [name, setName] = useState(profile?.name ?? "");
  const [rest, setRest] = useState(String(profile?.defaultRestSec ?? 120));
  const [errors, setErrors] = useState<{ name?: string; rest?: string }>({});
  const theme = useThemePref();

  function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const result = userProfileSchema.safeParse({
      ...profile,
      name,
      defaultRestSec: Number(rest),
    });
    if (!result.success) {
      const next: typeof errors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "name") next.name = "Enter a name (max 50 characters).";
        if (issue.path[0] === "defaultRestSec") next.rest = "Enter 0–900 seconds.";
      }
      setErrors(next);
      return;
    }
    setErrors({});
    saveProfile(result.data);
    toast.success("Profile saved.");
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4">
        <Card>
          <CardTitle>Profile</CardTitle>
          <form onSubmit={onSaveProfile} className="flex flex-col gap-4" noValidate>
            <TextField
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              maxLength={50}
            />
            <TextField
              label="Default rest (seconds)"
              hint="Used when an exercise has no rest time of its own."
              inputMode="numeric"
              value={rest}
              onChange={(e) => setRest(e.target.value)}
              error={errors.rest}
            />
            <Button type="submit" disabled={!profile}>
              Save profile
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle className="mb-1">Privacy</CardTitle>
          <Switch
            label="Share my lifts in Compare"
            description="Lets your partner see your PRs side by side with theirs."
            checked={profile?.shareCompare ?? true}
            onChange={(shareCompare) => profile && saveProfile({ ...profile, shareCompare })}
          />
        </Card>

        <Card>
          <CardTitle>Appearance</CardTitle>
          <div className="flex gap-2" role="group" aria-label="Theme">
            {THEMES.map((t) => (
              <Chip
                key={t.value}
                selected={theme === t.value}
                onClick={() => {
                  applyThemePref(t.value);
                }}
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </Card>

        <RestAlertsCard />

        <InstallCard />

        <Card className="flex flex-col gap-3">
          <CardTitle className="mb-0">Account</CardTitle>
          <p className="text-sm break-all text-muted">Signed in as {user?.email ?? "—"}</p>
          <Button
            variant="secondary"
            icon={<LogOut aria-hidden />}
            onClick={() =>
              signOut().catch((err: unknown) => {
                reportError(err, { where: "signOut" });
                toast.error("Couldn't sign out.");
              })
            }
          >
            Sign out
          </Button>
        </Card>

        <p className="text-center text-xs text-muted">
          Version {process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
        </p>
      </div>
    </>
  );
}
