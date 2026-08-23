import { aspNetRules } from "./aspnet";
import { expressRules } from "./express";
import { fastApiRules } from "./fastapi";
import { flaskRules } from "./flask";
import { laravelRules } from "./laravel";
import { nestJsRules } from "./nestjs";
import type { FrameworkRules } from "./types";

export const frameworkRules: FrameworkRules[] = [
  aspNetRules,
  nestJsRules,
  expressRules,
  laravelRules,
  fastApiRules,
  flaskRules
];

export { aspNetRules, expressRules, fastApiRules, flaskRules, laravelRules, nestJsRules };
export type * from "./types";
