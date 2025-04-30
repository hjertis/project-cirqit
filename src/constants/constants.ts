/**
 * Standard process names used across the application, including Kanban columns.
 */
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
] as const; // Use 'as const' for stricter typing if needed

// Optional: Define a type for these names
export type StandardProcessName = (typeof STANDARD_PROCESS_NAMES)[number];
