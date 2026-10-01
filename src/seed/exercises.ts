import { LOWER_BODY, type Equipment, type Muscle } from "@/lib/schemas/common";
import type { ExerciseInput } from "@/lib/schemas/exercise";
import { slugify } from "@/lib/data/util";
import { defaultIncrement } from "@/lib/exerciseDefaults";

/**
 * Seed exercise library. Defaults are derived from muscle, equipment and whether the movement is
 * a compound (C) or isolation (I) lift, with per-exercise overrides where they differ:
 *  - increments: 2.5 kg upper body, 5 kg lower body (barbell/machine), 2 kg dumbbells, 4 kg kettlebells
 *  - compounds 6–10 reps / 150 s rest (heavy lower-body barbell lifts 180 s)
 *  - isolations 10–15 reps / 75 s rest; abs & calves 10–20 / 60 s
 * Time-based holds use reps = seconds.
 */
type Kind = "C" | "I";
type Overrides = Partial<Pick<ExerciseInput, "repMin" | "repMax" | "restSec" | "incrementKg">>;
type Row = [
  name: string,
  muscle: Muscle,
  secondary: Muscle[],
  equipment: Equipment,
  kind: Kind,
  o?: Overrides,
];

// prettier-ignore
const ROWS: Row[] = [
  // Chest
  ["Barbell Bench Press", "chest", ["triceps", "shoulders"], "barbell", "C"],
  ["Incline Barbell Bench Press", "chest", ["shoulders", "triceps"], "barbell", "C"],
  ["Decline Barbell Bench Press", "chest", ["triceps"], "barbell", "C"],
  ["Dumbbell Bench Press", "chest", ["triceps", "shoulders"], "dumbbell", "C"],
  ["Incline Dumbbell Press", "chest", ["shoulders", "triceps"], "dumbbell", "C"],
  ["Decline Dumbbell Press", "chest", ["triceps"], "dumbbell", "C"],
  ["Machine Chest Press", "chest", ["triceps", "shoulders"], "machine", "C"],
  ["Incline Machine Press", "chest", ["shoulders", "triceps"], "machine", "C"],
  ["Smith Machine Bench Press", "chest", ["triceps", "shoulders"], "smith_machine", "C"],
  ["Smith Machine Incline Press", "chest", ["shoulders", "triceps"], "smith_machine", "C"],
  ["Dumbbell Fly", "chest", ["shoulders"], "dumbbell", "I"],
  ["Incline Dumbbell Fly", "chest", ["shoulders"], "dumbbell", "I"],
  ["Cable Crossover", "chest", ["shoulders"], "cable", "I"],
  ["Low-to-High Cable Fly", "chest", ["shoulders"], "cable", "I"],
  ["Pec Deck", "chest", [], "machine", "I"],
  ["Push-Up", "chest", ["triceps", "shoulders"], "bodyweight", "C", { repMin: 8, repMax: 20 }],
  ["Chest Dip", "chest", ["triceps", "shoulders"], "bodyweight", "C"],

  // Back
  ["Deadlift", "back", ["hamstrings", "glutes", "lower_back", "traps"], "barbell", "C", { repMin: 3, repMax: 6, restSec: 180, incrementKg: 5 }],
  ["Rack Pull", "back", ["traps", "lower_back", "glutes"], "barbell", "C", { repMin: 4, repMax: 8, restSec: 180, incrementKg: 5 }],
  ["Pull-Up", "back", ["biceps"], "bodyweight", "C", { repMin: 5, repMax: 10 }],
  ["Chin-Up", "back", ["biceps"], "bodyweight", "C", { repMin: 5, repMax: 10 }],
  ["Assisted Pull-Up", "back", ["biceps"], "machine", "C", { repMin: 6, repMax: 12 }],
  ["Lat Pulldown", "back", ["biceps"], "cable", "C", { repMin: 8, repMax: 12 }],
  ["Close-Grip Lat Pulldown", "back", ["biceps"], "cable", "C", { repMin: 8, repMax: 12 }],
  ["Barbell Row", "back", ["biceps", "lower_back"], "barbell", "C"],
  ["Pendlay Row", "back", ["biceps", "lower_back"], "barbell", "C"],
  ["Seal Row", "back", ["biceps"], "barbell", "C"],
  ["Meadows Row", "back", ["biceps"], "barbell", "C"],
  ["T-Bar Row", "back", ["biceps", "lower_back"], "machine", "C"],
  ["Dumbbell Row", "back", ["biceps"], "dumbbell", "C"],
  ["Chest-Supported Dumbbell Row", "back", ["biceps"], "dumbbell", "C"],
  ["Seated Cable Row", "back", ["biceps"], "cable", "C", { repMin: 8, repMax: 12 }],
  ["Single-Arm Cable Row", "back", ["biceps"], "cable", "C", { repMin: 8, repMax: 12 }],
  ["Machine Row", "back", ["biceps"], "machine", "C", { repMin: 8, repMax: 12 }],
  ["Inverted Row", "back", ["biceps"], "bodyweight", "C", { repMin: 8, repMax: 15 }],
  ["Straight-Arm Pulldown", "back", [], "cable", "I"],
  ["Dumbbell Pullover", "back", ["chest"], "dumbbell", "I"],

  // Lower back
  ["Back Extension", "lower_back", ["glutes", "hamstrings"], "bodyweight", "I", { incrementKg: 2.5 }],
  ["Good Morning", "lower_back", ["hamstrings", "glutes"], "barbell", "C", { repMin: 8, repMax: 12 }],
  ["Reverse Hyperextension", "lower_back", ["glutes", "hamstrings"], "machine", "I"],

  // Traps
  ["Barbell Shrug", "traps", ["forearms"], "barbell", "I", { incrementKg: 5 }],
  ["Dumbbell Shrug", "traps", ["forearms"], "dumbbell", "I"],
  ["Smith Machine Shrug", "traps", ["forearms"], "smith_machine", "I", { incrementKg: 5 }],
  ["Cable Shrug", "traps", [], "cable", "I"],

  // Shoulders
  ["Overhead Press", "shoulders", ["triceps"], "barbell", "C", { repMin: 5, repMax: 8 }],
  ["Push Press", "shoulders", ["triceps", "quads"], "barbell", "C", { repMin: 3, repMax: 6 }],
  ["Dumbbell Shoulder Press", "shoulders", ["triceps"], "dumbbell", "C"],
  ["Arnold Press", "shoulders", ["triceps"], "dumbbell", "C"],
  ["Machine Shoulder Press", "shoulders", ["triceps"], "machine", "C"],
  ["Smith Machine Shoulder Press", "shoulders", ["triceps"], "smith_machine", "C"],
  ["Landmine Press", "shoulders", ["chest", "triceps"], "barbell", "C"],
  ["Dumbbell Lateral Raise", "shoulders", [], "dumbbell", "I", { repMin: 12, repMax: 20, incrementKg: 1 }],
  ["Cable Lateral Raise", "shoulders", [], "cable", "I", { repMin: 12, repMax: 20, incrementKg: 1.25 }],
  ["Machine Lateral Raise", "shoulders", [], "machine", "I", { repMin: 12, repMax: 20 }],
  ["Dumbbell Front Raise", "shoulders", [], "dumbbell", "I", { incrementKg: 1 }],
  ["Rear Delt Fly", "shoulders", ["traps"], "dumbbell", "I", { repMin: 12, repMax: 20, incrementKg: 1 }],
  ["Reverse Pec Deck", "shoulders", ["traps"], "machine", "I", { repMin: 12, repMax: 20 }],
  ["Cable Rear Delt Fly", "shoulders", ["traps"], "cable", "I", { repMin: 12, repMax: 20, incrementKg: 1.25 }],
  ["Face Pull", "shoulders", ["traps"], "cable", "I", { repMin: 12, repMax: 20 }],
  ["Cable Upright Row", "shoulders", ["traps"], "cable", "I"],

  // Biceps
  ["Barbell Curl", "biceps", ["forearms"], "barbell", "I", { repMin: 8, repMax: 12 }],
  ["EZ-Bar Curl", "biceps", ["forearms"], "ez_bar", "I", { repMin: 8, repMax: 12 }],
  ["Dumbbell Curl", "biceps", ["forearms"], "dumbbell", "I", { repMin: 8, repMax: 12 }],
  ["Hammer Curl", "biceps", ["forearms"], "dumbbell", "I", { repMin: 8, repMax: 12 }],
  ["Incline Dumbbell Curl", "biceps", [], "dumbbell", "I"],
  ["Preacher Curl", "biceps", [], "ez_bar", "I"],
  ["Machine Preacher Curl", "biceps", [], "machine", "I"],
  ["Cable Curl", "biceps", ["forearms"], "cable", "I"],
  ["Bayesian Cable Curl", "biceps", [], "cable", "I"],
  ["Rope Hammer Curl", "biceps", ["forearms"], "cable", "I"],
  ["Concentration Curl", "biceps", [], "dumbbell", "I"],
  ["Spider Curl", "biceps", [], "dumbbell", "I"],

  // Triceps
  ["Close-Grip Bench Press", "triceps", ["chest", "shoulders"], "barbell", "C"],
  ["JM Press", "triceps", ["chest"], "barbell", "C", { repMin: 8, repMax: 12 }],
  ["Triceps Dip", "triceps", ["chest", "shoulders"], "bodyweight", "C"],
  ["Triceps Pushdown", "triceps", [], "cable", "I"],
  ["Rope Pushdown", "triceps", [], "cable", "I"],
  ["Single-Arm Cable Pushdown", "triceps", [], "cable", "I", { incrementKg: 1.25 }],
  ["Overhead Cable Extension", "triceps", [], "cable", "I"],
  ["EZ-Bar Skull Crusher", "triceps", [], "ez_bar", "I", { repMin: 8, repMax: 12 }],
  ["Dumbbell Overhead Extension", "triceps", [], "dumbbell", "I"],
  ["Dumbbell Kickback", "triceps", [], "dumbbell", "I", { incrementKg: 1 }],
  ["Machine Triceps Extension", "triceps", [], "machine", "I"],
  ["Bench Dip", "triceps", ["chest"], "bodyweight", "I"],
  ["Diamond Push-Up", "triceps", ["chest"], "bodyweight", "C", { repMin: 8, repMax: 20 }],

  // Forearms
  ["Dumbbell Wrist Curl", "forearms", [], "dumbbell", "I", { repMin: 12, repMax: 20 }],
  ["Reverse Wrist Curl", "forearms", [], "dumbbell", "I", { repMin: 12, repMax: 20 }],
  ["Reverse EZ-Bar Curl", "forearms", ["biceps"], "ez_bar", "I"],

  // Quads
  ["Back Squat", "quads", ["glutes", "hamstrings", "lower_back"], "barbell", "C", { repMin: 5, repMax: 8, restSec: 180 }],
  ["Front Squat", "quads", ["glutes", "abs"], "barbell", "C", { repMin: 5, repMax: 8, restSec: 180 }],
  ["Pause Squat", "quads", ["glutes"], "barbell", "C", { repMin: 3, repMax: 6, restSec: 180 }],
  ["Smith Machine Squat", "quads", ["glutes"], "smith_machine", "C"],
  ["Hack Squat", "quads", ["glutes"], "machine", "C", { repMin: 8, repMax: 12 }],
  ["Pendulum Squat", "quads", ["glutes"], "machine", "C", { repMin: 8, repMax: 12 }],
  ["Belt Squat", "quads", ["glutes"], "machine", "C", { repMin: 8, repMax: 12 }],
  ["Leg Press", "quads", ["glutes", "hamstrings"], "machine", "C", { repMin: 8, repMax: 15, incrementKg: 10 }],
  ["Single-Leg Leg Press", "quads", ["glutes"], "machine", "C", { repMin: 8, repMax: 15 }],
  ["Goblet Squat", "quads", ["glutes"], "dumbbell", "C", { repMin: 8, repMax: 15 }],
  ["Bulgarian Split Squat", "quads", ["glutes", "hamstrings"], "dumbbell", "C", { repMin: 8, repMax: 12 }],
  ["Walking Lunge", "quads", ["glutes", "hamstrings"], "dumbbell", "C", { repMin: 8, repMax: 12 }],
  ["Reverse Lunge", "quads", ["glutes"], "dumbbell", "C", { repMin: 8, repMax: 12 }],
  ["Dumbbell Step-Up", "quads", ["glutes"], "dumbbell", "C", { repMin: 8, repMax: 12 }],
  ["Leg Extension", "quads", [], "machine", "I"],
  ["Sissy Squat", "quads", [], "bodyweight", "I"],

  // Hamstrings
  ["Romanian Deadlift", "hamstrings", ["glutes", "lower_back"], "barbell", "C", { repMin: 6, repMax: 10, restSec: 180 }],
  ["Stiff-Leg Deadlift", "hamstrings", ["glutes", "lower_back"], "barbell", "C"],
  ["Dumbbell Romanian Deadlift", "hamstrings", ["glutes"], "dumbbell", "C", { repMin: 8, repMax: 12 }],
  ["Single-Leg Romanian Deadlift", "hamstrings", ["glutes"], "dumbbell", "C", { repMin: 8, repMax: 12 }],
  ["Lying Leg Curl", "hamstrings", [], "machine", "I"],
  ["Seated Leg Curl", "hamstrings", [], "machine", "I"],
  ["Standing Single-Leg Curl", "hamstrings", [], "machine", "I", { incrementKg: 2.5 }],
  ["Nordic Hamstring Curl", "hamstrings", [], "bodyweight", "I", { repMin: 3, repMax: 8 }],
  ["Glute-Ham Raise", "hamstrings", ["glutes"], "bodyweight", "I", { repMin: 6, repMax: 12 }],
  ["Kettlebell Swing", "hamstrings", ["glutes", "lower_back"], "kettlebell", "C", { repMin: 12, repMax: 20, restSec: 90 }],

  // Glutes & adductors
  ["Barbell Hip Thrust", "glutes", ["hamstrings"], "barbell", "C", { repMin: 8, repMax: 12 }],
  ["Smith Machine Hip Thrust", "glutes", ["hamstrings"], "smith_machine", "C", { repMin: 8, repMax: 12 }],
  ["Machine Hip Thrust", "glutes", ["hamstrings"], "machine", "C", { repMin: 8, repMax: 12 }],
  ["Barbell Glute Bridge", "glutes", ["hamstrings"], "barbell", "C", { repMin: 8, repMax: 15 }],
  ["Single-Leg Hip Thrust", "glutes", ["hamstrings"], "bodyweight", "I", { incrementKg: 2.5 }],
  ["Sumo Deadlift", "glutes", ["quads", "hamstrings", "back"], "barbell", "C", { repMin: 3, repMax: 6, restSec: 180 }],
  ["Cable Pull-Through", "glutes", ["hamstrings"], "cable", "I", { incrementKg: 5 }],
  ["Cable Glute Kickback", "glutes", [], "cable", "I", { incrementKg: 2.5 }],
  ["Hip Abduction Machine", "glutes", [], "machine", "I", { repMin: 12, repMax: 20 }],
  ["Hip Adduction Machine", "adductors", [], "machine", "I", { repMin: 12, repMax: 20 }],

  // Calves
  ["Standing Calf Raise", "calves", [], "machine", "I"],
  ["Seated Calf Raise", "calves", [], "machine", "I"],
  ["Leg Press Calf Raise", "calves", [], "machine", "I"],
  ["Smith Machine Calf Raise", "calves", [], "smith_machine", "I"],
  ["Single-Leg Dumbbell Calf Raise", "calves", [], "dumbbell", "I"],

  // Abs
  ["Cable Crunch", "abs", [], "cable", "I"],
  ["Machine Crunch", "abs", [], "machine", "I"],
  ["Crunch", "abs", [], "bodyweight", "I"],
  ["Decline Crunch", "abs", [], "bodyweight", "I", { incrementKg: 2.5 }],
  ["Bicycle Crunch", "abs", [], "bodyweight", "I"],
  ["Hanging Leg Raise", "abs", [], "bodyweight", "I", { repMin: 8, repMax: 15 }],
  ["Hanging Knee Raise", "abs", [], "bodyweight", "I"],
  ["Captain's Chair Knee Raise", "abs", [], "machine", "I"],
  ["Lying Leg Raise", "abs", [], "bodyweight", "I"],
  ["Ab Wheel Rollout", "abs", ["lower_back"], "other", "I", { repMin: 6, repMax: 15 }],
  ["V-Up", "abs", [], "bodyweight", "I"],
  ["Dead Bug", "abs", [], "bodyweight", "I"],
  ["Russian Twist", "abs", [], "bodyweight", "I", { incrementKg: 2.5 }],
  ["Pallof Press", "abs", [], "cable", "I", { incrementKg: 2.5 }],
  ["Cable Woodchopper", "abs", ["shoulders"], "cable", "I", { incrementKg: 2.5 }],
  ["Plank (seconds)", "abs", [], "bodyweight", "I", { repMin: 30, repMax: 90, incrementKg: 0 }],
  ["Side Plank (seconds)", "abs", [], "bodyweight", "I", { repMin: 20, repMax: 60, incrementKg: 0 }],

  // Full body
  ["Power Clean", "full_body", ["traps", "quads", "glutes"], "barbell", "C", { repMin: 2, repMax: 5, restSec: 180 }],
  ["Hang Clean", "full_body", ["traps", "quads", "glutes"], "barbell", "C", { repMin: 2, repMax: 5, restSec: 180 }],
  ["Thruster", "full_body", ["quads", "shoulders"], "barbell", "C"],
  ["Turkish Get-Up", "full_body", ["shoulders", "abs"], "kettlebell", "C", { repMin: 2, repMax: 5 }],
  ["Burpee", "full_body", ["chest", "quads"], "bodyweight", "C", { repMin: 10, repMax: 20, restSec: 90, incrementKg: 0 }],
];

/** Cardio "exercises" — used for program finishers; logged in minutes, not sets. */
const CARDIO: [name: string, equipment: Equipment][] = [
  ["Incline Treadmill Walk", "cardio_machine"],
  ["Treadmill Run", "cardio_machine"],
  ["Stationary Bike", "cardio_machine"],
  ["Assault Bike", "cardio_machine"],
  ["Rowing Machine", "cardio_machine"],
  ["Elliptical", "cardio_machine"],
  ["Stair Climber", "cardio_machine"],
  ["Ski Erg", "cardio_machine"],
  ["Outdoor Walk", "other"],
  ["Outdoor Run", "other"],
  ["Outdoor Cycling", "other"],
  ["Swimming", "other"],
  ["Jump Rope", "other"],
];

function fromRow([name, muscle, secondary, equipment, kind, o = {}]: Row): ExerciseInput {
  const coreOrCalves = muscle === "abs" || muscle === "calves";
  const heavyLower = kind === "C" && equipment === "barbell" && LOWER_BODY.has(muscle);
  return {
    name,
    muscle,
    secondary,
    equipment,
    type: "strength",
    repMin: o.repMin ?? (coreOrCalves ? 10 : kind === "C" ? 6 : 10),
    repMax: o.repMax ?? (coreOrCalves ? 20 : kind === "C" ? 10 : 15),
    restSec: o.restSec ?? (coreOrCalves ? 60 : heavyLower ? 180 : kind === "C" ? 150 : 75),
    incrementKg: o.incrementKg ?? defaultIncrement(muscle, equipment),
  };
}

export const SEED_EXERCISES: ReadonlyArray<ExerciseInput & { id: string }> = [
  ...ROWS.map((row) => ({ ...fromRow(row), id: slugify(row[0]) })),
  ...CARDIO.map(([name, equipment]) => ({
    id: slugify(name),
    name,
    muscle: "cardio" as const,
    secondary: [],
    equipment,
    type: "cardio" as const,
    repMin: 0,
    repMax: 0,
    restSec: 0,
    incrementKg: 0,
  })),
];
