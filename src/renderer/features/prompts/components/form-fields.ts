import clsx from "clsx";

import { fieldChromeClassName } from "@renderer/shared/ui/form/FormInput";

/**
 * The app's field chrome, for the controls in the builder's forms.
 *
 * Delegated rather than restated: the border, radius, padding and focus ring
 * all come from the shared form chrome, so these forms move whenever the rest
 * of the app's inputs do. `focus-within` matches an input that holds focus
 * itself, which is what lets the chrome be worn by a bare `<input>`.
 */
export const fieldBase = fieldChromeClassName();

export const fieldTextarea = clsx(fieldBase, "min-h-[104px] resize-y leading-6");

export const fieldMono = clsx(fieldBase, "font-mono text-[12px]");
