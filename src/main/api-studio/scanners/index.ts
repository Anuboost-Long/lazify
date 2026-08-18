import { frameworkRules } from "../rules";
import type { RouteScanner } from "../types";
import { createFrameworkScanner } from "./framework-scanner";
import { openApiScanner } from "./openapi";

/** Order is priority: an authoritative description outranks reading source. */
export const routeScanners: RouteScanner[] = [
  openApiScanner,
  ...frameworkRules.map(createFrameworkScanner)
];
