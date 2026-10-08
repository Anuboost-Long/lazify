import type { DocSectionScope, DocSectionSpec } from "./types";

export const COLLECTION_SECTIONS: DocSectionSpec[] = [
  {
    id: "overview",
    scope: "collection",
    title: "Overview",
    hint: "What this API is for and who calls it, in a few sentences.",
    rule: "Open with what the API is for and who calls it. No marketing, no history.",
    required: true
  },
  {
    id: "authentication",
    scope: "collection",
    title: "Authentication",
    hint: "How a caller proves who they are, and where the credential goes.",
    rule: "State the scheme, the header or parameter it travels in, and how a caller gets a credential.",
    required: true
  },
  {
    id: "conventions",
    scope: "collection",
    title: "Conventions",
    hint: "Identifiers, dates, pagination, casing — whatever holds across every route.",
    rule: "Only list conventions the routes actually follow; a convention stated once is not repeated per route.",
    required: false
  },
  {
    id: "errors",
    scope: "collection",
    title: "Errors",
    hint: "The shared error shape and the status codes every route can return.",
    rule: "Describe the error body once, with the field names it really uses.",
    required: true
  },
  {
    id: "rate_limits",
    scope: "collection",
    title: "Limits",
    hint: "Rate limits, payload sizes, timeouts a caller has to plan for.",
    rule: "Give numbers only when the code or configuration states them. Otherwise say the limit is not documented.",
    required: false
  },
  {
    id: "changelog",
    scope: "collection",
    title: "Changelog",
    hint: "What changed in this version of the API.",
    rule: "One line per change, newest first. Leave empty rather than inventing a history.",
    required: false
  }
];

export const ROUTE_SECTIONS: DocSectionSpec[] = [
  {
    id: "purpose",
    scope: "route",
    title: "What it does",
    hint: "One or two sentences: what this route does for the caller.",
    rule: "Say what the route does, not how it is implemented. Never restate the path as a sentence.",
    required: true
  },
  {
    id: "behavior",
    scope: "route",
    title: "Behaviour",
    hint: "Side effects, ordering, idempotency, anything that surprises a caller.",
    rule: "Name side effects the caller cannot see in the response. Skip when there are none.",
    required: false
  },
  {
    id: "auth",
    scope: "route",
    title: "Who can call it",
    hint: "The credential, scope, role or permission this route needs.",
    rule: "State the permission required. Say when a route is public rather than leaving it unsaid.",
    required: true
  },
  {
    id: "parameters",
    scope: "route",
    title: "Parameter notes",
    hint: "What the parameters mean when their names do not say it.",
    rule: "Only cover parameters whose meaning, format or default is not obvious from the table.",
    required: false
  },
  {
    id: "request_body",
    scope: "route",
    title: "Request body",
    hint: "What the body carries, which fields are required, and what they accept.",
    rule: "Describe the fields that exist in the code. Do not invent fields to round out a shape.",
    required: false
  },
  {
    id: "responses",
    scope: "route",
    title: "Response",
    hint: "What a successful call returns and what the caller does with it.",
    rule: "Describe the success body and the status it arrives with.",
    required: true
  },
  {
    id: "errors",
    scope: "route",
    title: "Failure cases",
    hint: "What goes wrong for this route in particular, and the status it returns.",
    rule: "List only failures specific to this route; shared errors live in the collection's Errors section.",
    required: false
  },
  {
    id: "notes",
    scope: "route",
    title: "Notes",
    hint: "Anything a caller needs that has no home above.",
    rule: "Keep this empty unless something genuinely does not fit the sections above.",
    required: false
  }
];

export const FOLDER_SECTION: DocSectionSpec = {
  id: "folder_description",
  scope: "collection",
  title: "About this group",
  hint: "What the routes in this folder have in common, and when a caller reaches for them.",
  rule: "Say what the group is for in two or three sentences. Do not list the routes — they are right below it.",
  required: true
};

export function sectionsFor(scope: DocSectionScope): DocSectionSpec[] {
  return scope === "collection" ? COLLECTION_SECTIONS : ROUTE_SECTIONS;
}

export function sectionSpec(scope: DocSectionScope, id: string): DocSectionSpec | null {
  return sectionsFor(scope).find((section) => section.id === id) ?? null;
}

export function sectionTitle(scope: DocSectionScope, id: string): string {
  return sectionSpec(scope, id)?.title ?? id;
}
