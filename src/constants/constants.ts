export const STANDARD_PROCESS_NAMES = [
  "Setup",
  "SMT",
  "Inspection",
  "Repair/Rework",
  "HMT",
  "Wash",
  "Cut",
  "Test",
  "Delivery",
] as const;

export type StandardProcessName = (typeof STANDARD_PROCESS_NAMES)[number];
