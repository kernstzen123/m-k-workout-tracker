import { LOWER_BODY, type Equipment, type Muscle } from "@/lib/schemas/common";

/** Default load increment: 2.5 kg upper / 5 kg lower body, 2 kg dumbbells, 4 kg kettlebells. */
export function defaultIncrement(muscle: Muscle, equipment: Equipment): number {
  switch (equipment) {
    case "dumbbell":
      return 2;
    case "kettlebell":
      return 4;
    case "bodyweight":
    case "band":
    case "cardio_machine":
      return 0;
    default:
      return LOWER_BODY.has(muscle) ? 5 : 2.5;
  }
}
