import { MAX_TEMPLATE_CONTENT_BYTES } from "../resources/content-rules";
import type { ProjectTemplate } from "./types";

export function validateTemplate(template: ProjectTemplate): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template.id) {
    errors.push("Template has no id.");
  }

  if (!template.name) {
    errors.push("Template has no name.");
  }

  if (!template.stackDetection) {
    errors.push("Template has no stackDetection.");
  }

  for (const file of template.structure.files) {
    if (!file.path) {
      errors.push(`File "${file.name}" has no path.`);
    }

    if (file.isBinary && typeof file.content === "string") {
      errors.push(`Binary file "${file.path}" should not store content.`);
    }

    if ((file.size ?? 0) > MAX_TEMPLATE_CONTENT_BYTES && typeof file.content === "string") {
      errors.push(`Large file "${file.path}" should not store content.`);
    }
  }

  for (const folder of template.structure.folders) {
    if (!folder.path) {
      errors.push(`Folder "${folder.name}" has no path.`);
    }
  }

  if (template.metadata.fileCount !== template.structure.files.length) {
    errors.push("Template file count does not match metadata.");
  }

  if (!template.stackDetection.commands.install) {
    errors.push("Template commands are missing install.");
  }

  if (template.stackDetection.stack === "unknown" && template.stackDetection.warnings.length === 0) {
    warnings.push("Unknown stack should include at least one warning.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
