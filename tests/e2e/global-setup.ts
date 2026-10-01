import { AUTH_EMULATOR, FIRESTORE_EMULATOR, PASSWORD, PROJECT_ID, USERS } from "./fixtures";

/** Reset emulator data and create the test accounts with fixed UIDs. */
export default async function globalSetup(): Promise<void> {
  const admin = { Authorization: "Bearer owner", "Content-Type": "application/json" };

  await fetch(
    `${FIRESTORE_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    {
      method: "DELETE",
    },
  );
  await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });

  for (const { uid, email } of Object.values(USERS)) {
    const res = await fetch(
      `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`,
      {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ localId: uid, email, password: PASSWORD }),
      },
    );
    if (!res.ok) throw new Error(`Creating ${email} failed: ${res.status} ${await res.text()}`);
  }
}
