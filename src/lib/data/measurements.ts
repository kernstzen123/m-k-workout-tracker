import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
  measurementDocSchema,
  type Measurement,
  type MeasurementDoc,
} from "@/lib/schemas/tracking";
import { fireAndForget, parseDoc } from "./util";

const col = (uid: string) => collection(getDb(), "users", uid, "measurements");

/** Bounded: about a year of daily weigh-ins. */
export const MEASUREMENT_LIMIT = 400;

export function subscribeMeasurements(
  uid: string,
  onData: (list: Measurement[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(col(uid), orderBy("date", "desc"), limit(MEASUREMENT_LIMIT)),
    (snap) => {
      const list: Measurement[] = [];
      for (const d of snap.docs) {
        const parsed = parseDoc(measurementDocSchema, d.id, d.data(), "subscribeMeasurements");
        if (parsed) list.push(parsed);
      }
      onData(list);
    },
    onError,
  );
}

export function addMeasurement(uid: string, data: MeasurementDoc): string {
  const ref = doc(col(uid));
  fireAndForget(
    setDoc(ref, measurementDocSchema.parse(data)),
    "addMeasurement",
    "Couldn't save that measurement.",
  );
  return ref.id;
}

export function deleteMeasurement(uid: string, id: string): void {
  fireAndForget(deleteDoc(doc(col(uid), id)), "deleteMeasurement");
}
