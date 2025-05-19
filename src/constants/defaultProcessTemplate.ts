import { STANDARD_PROCESS_NAMES } from "./constants";

export const DEFAULT_PRODUCT_PROCESSES = STANDARD_PROCESS_NAMES.map((name, idx) => ({
  name,
  sequence: idx + 1,
  type: "manufacturing",
  status: "Not Started",
  assignedResource: null,
  progress: 0,
}));
