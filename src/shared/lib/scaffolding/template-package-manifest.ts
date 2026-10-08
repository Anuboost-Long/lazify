export interface TemplatePackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface TemplatePackageEntry {
  name: string;
  version: string;
}

export interface ProjectPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface PackageVersionMismatch {
  name: string;
  expected: string;
  actual: string;
  dependencyType: "dependencies" | "devDependencies";
}

export interface TemplatePackageInstallPlan {
  dependencies: string[];
  devDependencies: string[];
  versionMismatches: PackageVersionMismatch[];
}
