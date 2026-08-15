import { ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { matchPackageVersions } from "../../brain/package-version-matcher";
import type { InstalledPackage } from "../../renderer/shared/types/lazify";
import type { IpcContext } from "./context";

export function registerPackageHandlers(ctx: IpcContext) {
  ipcMain.handle("lazify:list-project-packages", async (_event, projectPath: string): Promise<InstalledPackage[]> => {
    const pkgJsonPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(pkgJsonPath)) return [];
    const raw = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
    const deps = Object.entries((raw.dependencies ?? {}) as Record<string, string>).map(([name, versionSpec]) => ({ name, versionSpec, isDev: false }));
    const devDeps = Object.entries((raw.devDependencies ?? {}) as Record<string, string>).map(([name, versionSpec]) => ({ name, versionSpec, isDev: true }));
    return [...deps, ...devDeps];
  });

  ipcMain.handle("lazify:add-project-package", async (_event, payload: { projectPath: string; packageName: string; dev?: boolean }) =>
    ctx.workflowEngine.addProjectPackage(payload)
  );

  ipcMain.handle("lazify:remove-project-package", async (_event, payload: { projectPath: string; packageName: string }) =>
    ctx.workflowEngine.removeProjectPackage(payload)
  );

  ipcMain.handle("lazify:install-project-dependencies", async (_event, projectPath: string) =>
    ctx.workflowEngine.installProjectDependencies(projectPath)
  );

  ipcMain.handle("lazify:match-package-versions", async (_event, projectPath: string) =>
    matchPackageVersions({ projectPath, dryRun: true })
  );

  ipcMain.handle("lazify:fix-project-package-versions", async (_event, projectPath: string) => {
    const report = await matchPackageVersions({ projectPath });
    if (!report.installPlan.length) {
      return { success: true, message: "All packages are already compatible.", projectPath };
    }
    return ctx.workflowEngine.installPackage({
      packageName: report.installPlan.join(","),
      baseDirectory: path.dirname(projectPath),
      projectName: path.basename(projectPath)
    });
  });
}
