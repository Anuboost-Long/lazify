import { POSTMAN_NAMESPACES, POSTMAN_ROOT, type PostmanMember } from "./postman-map";

type Native = Record<string, unknown>;

function forward(shell: Native, source: Native, member: PostmanMember): void {
  if (member.callOfValue) {
    shell[member.postman] = () => source[member.native];
    return;
  }

  const held = source[member.native];

  if (typeof held === "function") {
    shell[member.postman] = held.bind(source);
    return;
  }

  Object.defineProperty(shell, member.postman, {
    enumerable: true,
    get: () => source[member.native],
    set: (value: unknown) => {
      source[member.native] = value;
    }
  });
}

export function postmanFacade(native: Native): Native {
  const facade: Native = {};

  for (const namespace of POSTMAN_NAMESPACES) {
    const source = native[namespace.native] as Native | undefined;
    if (!source) continue;

    const shell: Native = {};

    for (const member of namespace.members) forward(shell, source, member);

    facade[namespace.postman] = shell;
  }

  for (const member of POSTMAN_ROOT) forward(facade, native, member);

  return facade;
}
