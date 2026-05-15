import type { PackageOption } from "@renderer/shared/types/lazify";

export interface PackageSearchPickerProps {
  value: string;
  selectedTemplateId: string;
  busy: boolean;
  onChange: (value: string) => void;
}

export interface TemplatePackagePreview extends PackageOption {
  requestedVersion: string;
}
