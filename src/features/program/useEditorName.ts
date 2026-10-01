import { useEffect, useState } from "react";
import { useAuthStore } from "@/features/auth/store";
import { getUserName } from "@/lib/data/users";

/** "you" / partner name for a uid. */
export function useEditorName(uid: string | undefined): string | null {
  const me = useAuthStore((s) => s.user?.uid);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!uid || uid === me) return;
    let alive = true;
    void getUserName(uid).then((n) => alive && setName(n));
    return () => {
      alive = false;
    };
  }, [uid, me]);
  if (!uid) return null;
  return uid === me ? "you" : (name ?? "your partner");
}
