export interface ReturnedModel {
  model: string;
  collection: boolean;
}

const WRAPPERS = new Set([
  "task",
  "valuetask",
  "promise",
  "observable",
  "actionresult",
  "ok",
  "okobjectresult",
  "created",
  "createdatactionresult",
  "jsonresult",
  "results",
  "responseentity",
  "nullable"
]);

const COLLECTIONS = new Set([
  "ienumerable",
  "list",
  "ilist",
  "icollection",
  "ireadonlylist",
  "ireadonlycollection",
  "iqueryable",
  "array",
  "collection",
  "pagedlist",
  "hashset"
]);

const NOT_A_MODEL = new Set([
  "string",
  "int",
  "int32",
  "int64",
  "long",
  "short",
  "byte",
  "double",
  "decimal",
  "float",
  "bool",
  "boolean",
  "number",
  "void",
  "object",
  "any",
  "unknown",
  "guid",
  "datetime",
  "dateonly",
  "timespan",
  "unit",
  "iactionresult",
  "actionresult",
  "iresult",
  "filecontentresult",
  "fileresult",
  "contentresult",
  "nocontentresult",
  "okresult",
  "task",
  "promise",
  "response"
]);

function outerName(type: string) {
  const open = type.indexOf("<");

  return (open === -1 ? type : type.slice(0, open)).split(".").pop() ?? "";
}

function innerType(type: string) {
  const open = type.indexOf("<");
  const close = type.lastIndexOf(">");

  if (open === -1 || close < open) return null;

  const inner = type.slice(open + 1, close).trim();
  let depth = 0;

  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];

    if (char === "<") depth += 1;
    if (char === ">") depth -= 1;
    if (char === "," && depth === 0) return inner.slice(0, index).trim();
  }

  return inner;
}

export function modelFromReturnType(returnType: string | null): ReturnedModel | null {
  let type = (returnType ?? "").trim();
  let collection = false;

  for (let step = 0; step < 8 && type.length > 0; step += 1) {
    if (type.endsWith("?")) {
      type = type.slice(0, -1).trim();
      continue;
    }

    if (type.endsWith("[]")) {
      collection = true;
      type = type.slice(0, -2).trim();
      continue;
    }

    const name = outerName(type).toLowerCase();
    const inner = innerType(type);

    if (inner && (WRAPPERS.has(name) || COLLECTIONS.has(name))) {
      collection = collection || COLLECTIONS.has(name);
      type = inner;
      continue;
    }

    break;
  }

  const model = outerName(type);

  if (
    !model ||
    type.includes("<") ||
    NOT_A_MODEL.has(model.toLowerCase()) ||
    !/^[A-Za-z_]\w*$/.test(model)
  ) {
    return null;
  }

  return { model, collection };
}
