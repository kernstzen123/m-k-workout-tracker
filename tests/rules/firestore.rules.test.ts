import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

// `npm run test:rules` generates firestore.rules with the test UIDs alice + bob.
const ALICE = "alice";
const BOB = "bob";
const MALLORY = "mallory"; // signed in, but not allowlisted

let env: RulesTestEnvironment;
const now = Date.now();

const user = (name: string) => ({ name, defaultRestSec: 120, shareCompare: true, createdAt: now });
const exercise = {
  name: "Bench Press",
  muscle: "chest",
  secondary: ["triceps", "shoulders"],
  equipment: "barbell",
  type: "strength",
  repMin: 6,
  repMax: 10,
  restSec: 150,
  incrementKg: 2.5,
  archived: false,
  createdAt: now,
  updatedAt: now,
};
const session = {
  date: "2026-10-01",
  dayId: "push",
  programVersion: 1,
  startedAt: now,
  durationSec: 0,
  totalVolume: 0,
  notes: "",
  status: "draft",
};
const set = { exerciseId: "bench-press", order: 0, type: "working", weightKg: 60, reps: 8 };
const cardio = { date: "2026-10-01", type: "walk", durationMin: 20 };
const measurement = { date: "2026-10-01", weightKg: 80.5 };
const program = (version: number, uid: string) => ({
  name: "Main",
  days: [],
  version,
  updatedBy: uid,
  updatedAt: now,
});

const db = (uid: string | null) =>
  uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-mk-workout",
    firestore: { rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore();
    await setDoc(doc(fs, "users", ALICE), user("Alice"));
    await setDoc(doc(fs, "users", BOB), user("Bob"));
    await setDoc(doc(fs, "exercises", "bench-press"), exercise);
    await setDoc(doc(fs, "program", "main"), program(1, ALICE));
    await setDoc(doc(fs, "users", ALICE, "sessions", "s1"), session);
    await setDoc(doc(fs, "users", ALICE, "sessions", "s1", "sets", "set1"), set);
    await setDoc(doc(fs, "users", ALICE, "cardio", "c1"), cardio);
    await setDoc(doc(fs, "users", ALICE, "measurements", "m1"), measurement);
    await setDoc(doc(fs, "users", ALICE, "prs", "bench-press"), { bestWeight: 60 });
  });
});

describe("a third (non-allowlisted) user is denied everything", () => {
  it("cannot read or write shared collections", async () => {
    const fs = db(MALLORY);
    await assertFails(getDoc(doc(fs, "exercises", "bench-press")));
    await assertFails(getDocs(collection(fs, "exercises")));
    await assertFails(setDoc(doc(fs, "exercises", "x"), exercise));
    await assertFails(getDoc(doc(fs, "program", "main")));
    await assertFails(setDoc(doc(fs, "program", "main"), program(2, MALLORY)));
  });

  it("cannot read or write any private data, including their own profile", async () => {
    const fs = db(MALLORY);
    await assertFails(getDoc(doc(fs, "users", ALICE)));
    await assertFails(getDocs(collection(fs, "users", ALICE, "sessions")));
    await assertFails(getDoc(doc(fs, "users", ALICE, "sessions", "s1", "sets", "set1")));
    await assertFails(getDoc(doc(fs, "users", ALICE, "measurements", "m1")));
    await assertFails(setDoc(doc(fs, "users", MALLORY), user("Mallory")));
    await assertFails(setDoc(doc(fs, "users", MALLORY, "sessions", "s1"), session));
  });

  it("denies unauthenticated requests", async () => {
    const fs = db(null);
    await assertFails(getDoc(doc(fs, "exercises", "bench-press")));
    await assertFails(getDoc(doc(fs, "users", ALICE)));
  });
});

describe("a user cannot write the other user's private data", () => {
  it("bob cannot write alice's profile, sessions, sets, cardio, measurements or aggregates", async () => {
    const fs = db(BOB);
    await assertFails(setDoc(doc(fs, "users", ALICE), user("Hacked")));
    await assertFails(setDoc(doc(fs, "users", ALICE, "sessions", "s2"), session));
    await assertFails(updateDoc(doc(fs, "users", ALICE, "sessions", "s1"), { notes: "x" }));
    await assertFails(deleteDoc(doc(fs, "users", ALICE, "sessions", "s1")));
    await assertFails(setDoc(doc(fs, "users", ALICE, "sessions", "s1", "sets", "set2"), set));
    await assertFails(setDoc(doc(fs, "users", ALICE, "cardio", "c2"), cardio));
    await assertFails(setDoc(doc(fs, "users", ALICE, "measurements", "m2"), measurement));
    await assertFails(setDoc(doc(fs, "users", ALICE, "prs", "bench-press"), { bestWeight: 999 }));
  });

  it("bob cannot read alice's cardio or measurements", async () => {
    const fs = db(BOB);
    await assertFails(getDoc(doc(fs, "users", ALICE, "cardio", "c1")));
    await assertFails(getDoc(doc(fs, "users", ALICE, "measurements", "m1")));
  });
});

describe("either user can read (but not write) the other's sessions", () => {
  it("bob can read alice's sessions and sets", async () => {
    const fs = db(BOB);
    await assertSucceeds(getDoc(doc(fs, "users", ALICE, "sessions", "s1")));
    await assertSucceeds(getDocs(collection(fs, "users", ALICE, "sessions")));
    await assertSucceeds(getDocs(collection(fs, "users", ALICE, "sessions", "s1", "sets")));
  });

  it("alice can read bob's sessions", async () => {
    await assertSucceeds(getDocs(collection(db(ALICE), "users", BOB, "sessions")));
  });
});

describe("owners manage their own data", () => {
  it("alice can create, update and delete her own sessions and sets", async () => {
    const fs = db(ALICE);
    await assertSucceeds(setDoc(doc(fs, "users", ALICE, "sessions", "s2"), session));
    await assertSucceeds(updateDoc(doc(fs, "users", ALICE, "sessions", "s2"), { notes: "good" }));
    await assertSucceeds(setDoc(doc(fs, "users", ALICE, "sessions", "s2", "sets", "a"), set));
    await assertSucceeds(deleteDoc(doc(fs, "users", ALICE, "sessions", "s2", "sets", "a")));
    await assertSucceeds(deleteDoc(doc(fs, "users", ALICE, "sessions", "s2")));
    await assertSucceeds(setDoc(doc(fs, "users", ALICE, "cardio", "c2"), cardio));
    await assertSucceeds(getDoc(doc(fs, "users", ALICE, "measurements", "m1")));
  });

  it("rejects malformed writes", async () => {
    const fs = db(ALICE);
    const sets = (id: string) => doc(fs, "users", ALICE, "sessions", "s1", "sets", id);
    await assertFails(
      setDoc(doc(fs, "users", ALICE, "sessions", "bad"), { ...session, status: "x" }),
    );
    await assertFails(setDoc(sets("neg"), { ...set, reps: -1 }));
    await assertFails(setDoc(sets("extra"), { ...set, evil: true }));
  });
});

describe("shared collections", () => {
  it("both users can create and edit exercises but never delete them", async () => {
    await assertSucceeds(
      setDoc(doc(db(ALICE), "exercises", "squat"), { ...exercise, name: "Squat" }),
    );
    await assertSucceeds(updateDoc(doc(db(BOB), "exercises", "squat"), { archived: true }));
    await assertFails(deleteDoc(doc(db(BOB), "exercises", "squat")));
  });

  it("program saves must bump the version by exactly one and record the editor", async () => {
    const bob = db(BOB);
    await assertSucceeds(setDoc(doc(bob, "program", "main"), program(2, BOB)));
    await assertFails(setDoc(doc(bob, "program", "main"), program(2, BOB))); // stale version
    await assertFails(setDoc(doc(bob, "program", "main"), program(3, ALICE))); // spoofed editor
    await assertSucceeds(setDoc(doc(db(ALICE), "program", "main"), program(3, ALICE)));
    await assertFails(deleteDoc(doc(bob, "program", "main")));
  });
});

describe("compare opt-out", () => {
  it("partner can read prs while sharing, and not after the owner opts out", async () => {
    await assertSucceeds(getDoc(doc(db(BOB), "users", ALICE, "prs", "bench-press")));
    await assertSucceeds(updateDoc(doc(db(ALICE), "users", ALICE), { shareCompare: false }));
    await assertFails(getDoc(doc(db(BOB), "users", ALICE, "prs", "bench-press")));
    await assertSucceeds(getDoc(doc(db(ALICE), "users", ALICE, "prs", "bench-press")));
  });
});
