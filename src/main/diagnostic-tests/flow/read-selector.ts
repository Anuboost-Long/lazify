import { FlowError } from "../errors";
import type { ElementSelector } from "../types";
import { readNumber, readString, type Fields } from "./read-values";

export const SELECTOR_FIELDS = ["id", "label", "role", "name", "text", "x", "y"] as const;

export function readSelector(fields: Fields, where: string): ElementSelector {
	const selector: ElementSelector = {};

	const id = readString(fields, "id", where);
	const label = readString(fields, "label", where);
	const role = readString(fields, "role", where);
	const name = readString(fields, "name", where);
	const text = readString(fields, "text", where);

	if (id) selector.id = id;
	if (label) selector.label = label;
	if (role) selector.role = role;
	if (name) selector.name = name;
	if (text) selector.text = text;

	if (fields.x !== undefined || fields.y !== undefined) {
		selector.point = {
			x: readNumber(fields, "x", where, 0),
			y: readNumber(fields, "y", where, 0),
		};
	}

	if (role && !name && !id && !label && !text) {
		throw new FlowError('"role" needs a "name" to identify which element it means', where);
	}

	if (Object.keys(selector).length === 0) {
		throw new FlowError(`needs an element to act on — one of ${SELECTOR_FIELDS.join(", ")}`, where);
	}

	return selector;
}

export function describeSelector(selector: ElementSelector): string {
	if (selector.id) return `#${selector.id}`;
	if (selector.label) return `"${selector.label}"`;
	if (selector.role) return `${selector.role} "${selector.name}"`;
	if (selector.text) return `"${selector.text}"`;
	if (selector.point) return `(${selector.point.x}, ${selector.point.y})`;

	return "element";
}
