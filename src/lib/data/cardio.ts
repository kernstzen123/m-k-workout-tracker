import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { cardioDocSchema, type CardioDoc, type CardioEntry } from "@/lib/schemas/tracking";
import { fireAndForget, parseDoc } from "./util";

const cardioCol = (uid: string) => collection(getDb(), "users", uid, "cardio");

export function addCardio(uid: string, data: CardioDoc): string {
  const ref = doc(cardioCol(uid));
  fireAndForget(setDoc(ref, cardioDocSchema.parse(data)), "addCardio", "Couldn't save cardio.");
  return ref.id;
}

export function deleteCardio(uid: string, id: string): void {
  fireAndForget(deleteDoc(doc(cardioCol(uid), id)), "deleteCardio");
}

/** Cardio entries attached to one workout session. */
export function subscribeSessionCardio(
  uid: string,
  sessionId: string,
  onData: (entries: CardioEntry[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(cardioCol(uid), where("sessionId", "==", sessionId), limit(20)),
    (snap) => {
      const list: CardioEntry[] = [];
      for (const d of snap.docs) {
        const parsed = parseDoc(cardioDocSchema, d.id, d.data(), "subscribeSessionCardio");
        if (parsed) list.push(parsed);
      }
      onData(list);
    },
    onError,
  );
}
