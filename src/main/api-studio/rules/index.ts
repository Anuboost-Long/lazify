import { aspNetRules } from "./aspnet";
import { expressRules } from "./express";
import { nestJsRules } from "./nestjs";
import type { FrameworkRules } from "./types";

export const frameworkRules: FrameworkRules[] = [aspNetRules, nestJsRules, expressRules];

export { aspNetRules, expressRules, nestJsRules };
export type * from "./types";
