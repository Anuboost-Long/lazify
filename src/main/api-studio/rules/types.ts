import type { ProjectStack } from "../../../brain/stack-detection/types";
import type { HttpMethod, ParameterLocation, SecuritySchemeKind } from "../types";

export type AnnotationSyntax = "bracket" | "decorator";

export type BindingTarget = ParameterLocation | "header" | "body" | "ignore";

export interface PathSyntax {
  /** Each pattern captures one placeholder body out of a path segment. */
  placeholders: RegExp[];
  /** Splits `{id:int}` into name and constraint. Null when the syntax has none. */
  constraintSeparator: string | null;
  optionalMarkers: string[];
  catchAllPrefixes: string[];
  /** Prefixes on an action template that ignore the container template. */
  absolutePrefixes: string[];
  /** Placeholders the framework fills in itself, such as `[controller]`. */
  tokens: { container?: string; action?: string };
  /** Trimmed off a container's name before it fills the container token. */
  containerNameSuffix: string | null;
  constraintTypes: Record<string, string>;
}

export interface ContainerRules {
  /** Annotations carrying the container's own path template. */
  templateAnnotations: string[];
  /** Annotations that mark a class as holding routes. */
  markers: string[];
  /** Base types that mark a class as holding routes. */
  baseTypes: string[];
  nameSuffix: string | null;
}

export interface BindingRules {
  annotations: Record<string, BindingTarget>;
  /** Where a bound parameter's wire name comes from. */
  nameFrom: "identifier" | "annotationArgument";
  /** Types that are never part of a request: services, contexts, tokens. */
  ignoredTypes: string[];
  /** A body-bearing method may bind an unannotated model to the request body. */
  inferBodyFromModel: boolean;
}

export interface AuthRules {
  require: string[];
  anonymous: string[];
  kind: SecuritySchemeKind;
  parameterName: string;
  location: "header" | "query" | "cookie";
}

export interface AnnotationRules {
  syntax: AnnotationSyntax;
  container: ContainerRules;
  methods: Record<string, HttpMethod>;
  auth: AuthRules;
  binding: BindingRules;
  responses: { annotation: string; statusPattern: RegExp } | null;
  /** Doc comments that become a route summary. */
  summary: { linePrefix: string; tag: string } | null;
}

export interface CallRules {
  methods: Record<string, HttpMethod>;
  /** Calls that open a prefix shared by later routes, e.g. `MapGroup`. */
  groupCalls: string[];
  auth: {
    /** Chained after the route, e.g. `.RequireAuthorization()`. */
    calls: string[];
    /** Passed to the route as a handler, e.g. `router.get(path, requireAuth, …)`. */
    middleware: string[];
    kind: SecuritySchemeKind;
  } | null;
  summaryCalls: string[];
  /** How far past the call to look for chained calls. */
  chainLines: number;
}

export interface SourceRules {
  extensions: string[];
  /** Read first, so a cap can never drop the files that declare routes. */
  priorityNames: RegExp | null;
  skipDirectories: RegExp | null;
  /** A file without this never declares a route. */
  marker: RegExp;
  maxFiles: number;
}

export interface DetectionRules {
  dependencies: string[];
  stacks: ProjectStack[];
  files: RegExp | null;
}

export interface FrameworkRules {
  id: string;
  label: string;
  detect: DetectionRules;
  sources: SourceRules;
  path: PathSyntax;
  types: Record<string, string>;
  annotations: AnnotationRules | null;
  calls: CallRules | null;
}
