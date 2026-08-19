import type { ProjectStack } from "../../../brain/stack-detection/types";
import type { HttpMethod, ParameterLocation, SecuritySchemeKind } from "../types";

export type AnnotationSyntax = "bracket" | "decorator";

export type BindingTarget = ParameterLocation | "header" | "body" | "form" | "ignore";

export interface PathSyntax {
  /** Each pattern captures one placeholder body out of a path segment. */
  placeholders: RegExp[];
  /** Splits `{id:int}` into name and constraint. Null when the syntax has none. */
  constraintSeparator: string | null;
  /** Flask writes `<int:user_id>`: the constraint comes first, the name last. */
  constraintFirst?: boolean;
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
  /** Types that are a file the caller uploads, wherever they appear. */
  fileTypes: string[];
  /** A body-bearing method may bind an unannotated model to the request body. */
  inferBodyFromModel: boolean;
}

export interface AuthScheme {
  /** Annotations that put this scheme on a container or a route. */
  annotations: string[];
  kind: SecuritySchemeKind;
  /** Used when the annotation does not name the parameter itself. */
  parameterName: string;
  location: "header" | "query" | "cookie";
  /** Read the parameter name from the annotation's first string argument. */
  nameFromArgument?: boolean;
}

export interface AuthRules {
  schemes: AuthScheme[];
  anonymous: string[];
}

/**
 * How a project states that a scheme guards everything it serves. Every field is
 * a list, so one rule set can cover the several ways its ecosystem writes this.
 */
export interface GlobalSecurityRules {
  /** Declares one scheme. Capture its id as `(?<id>…)` where the syntax has one. */
  definitions: RegExp[];
  /** How far past a definition its own fields are still being read. */
  definitionLength: number;
  fields: {
    parameterName: RegExp[];
    location: RegExp[];
    type: RegExp[];
    scheme: RegExp[];
  };
  /** Requires a declared scheme of every route, naming it by id. */
  requirements: RegExp[];
  /** Guards registered in the pipeline, for a project that declares nothing. */
  guards: RegExp[];
  /** Where a guard reads its parameter, when no declaration names it. */
  guardNames: RegExp[];
  guardParameterName: string;
  /** Substrings a file must hold before any of this is worth running. */
  hints: string[];
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

/** A group named once and reused: `const r = Router()`, `router = APIRouter(prefix=…)`. */
export interface GroupCallRules {
  calls: string[];
  /** Keywords the assignment may start with. Empty where a language needs none. */
  keywords: string[];
  /** Where the call states its prefix, when it is not the first argument. */
  pathArgument: RegExp | null;
}

/** A group opened as a block, whose prefix holds until the block closes. */
export interface BlockGroupRules {
  /** Open a block and capture its prefix, however the language spells it. */
  openers: RegExp[];
  /** Open a block that guards what it holds rather than prefixing it. */
  authOpeners: RegExp[];
  open: string;
  close: string;
}

/** One call that declares a whole resource of routes, e.g. `Route::apiResource`. */
export interface ResourceRules {
  call: string;
  /** The parameter each nested route takes, appended as `{name}`. */
  parameter: string;
  routes: Array<{ method: HttpMethod; nested: boolean }>;
}

export interface CallRules {
  methods: Record<string, HttpMethod>;
  /** What joins a receiver to its call: `.` in most languages, `::` in PHP. */
  separator: string;
  /** Calls that open a prefix shared by later routes, e.g. `MapGroup`. */
  groupCalls: string[];
  /** How a named group states itself, when `groupCalls` alone cannot say. */
  groups: GroupCallRules | null;
  /** Mounts a named group under a prefix, adding to or replacing its own. */
  mounts: Array<{ pattern: RegExp; group: number; path: number; overrides?: boolean }>;
  blockGroups: BlockGroupRules | null;
  /** Reads the methods from an argument, e.g. Flask's `methods=["GET", "POST"]`. */
  methodsArgument: { pattern: RegExp; fallback: HttpMethod[] } | null;
  resources: ResourceRules[];
  /** Finds a handler's parameter list where it is not an arrow function. */
  handlerDeclaration: RegExp | null;
  auth: {
    /** Chained after the route, e.g. `.RequireAuthorization()`. */
    calls: string[];
    /** Passed to the route as a handler, e.g. `router.get(path, requireAuth, …)`. */
    middleware: string[];
    /** Chained to opt one route out of what the project requires globally. */
    anonymousCalls: string[];
    kind: SecuritySchemeKind;
  } | null;
  summaryCalls: string[];
  /** How far past the call to look for chained calls. */
  chainLines: number;
}

export type PropertyNaming = "pascal" | "camel" | "snake" | "snakeUpper" | "kebab";

export interface SerializationRules {
  /** First pattern a source line matches decides how properties are named. */
  namingPolicies: Array<{ pattern: RegExp; naming: PropertyNaming }>;
  /** What the framework serializes as when the project states nothing. */
  defaultNaming: PropertyNaming;
  /** Annotations that name one property outright, beating any policy. */
  nameAnnotations: string[];
  /** Converters that put an enum on the wire as its member name. */
  stringEnums: RegExp[];
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
  serialization: SerializationRules | null;
  globalSecurity: GlobalSecurityRules | null;
  annotations: AnnotationRules | null;
  calls: CallRules | null;
}
