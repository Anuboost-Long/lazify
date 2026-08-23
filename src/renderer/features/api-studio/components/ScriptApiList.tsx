import { membersOf, rootMembers, rootsFor, type ApiNode, type ScriptPhase } from "../script-api";

interface ScriptApiListProps {
  phase: ScriptPhase;
  globalName: string;
}

function MemberRow({ node, prefix }: Readonly<{ node: ApiNode; prefix: string }>) {
  return (
    <li className="flex flex-col gap-0.5 py-1.5">
      <span className="font-mono text-[11px] text-text">
        {prefix}
        {node.name}
        {node.signature ? <span className="text-muted">{node.signature}</span> : null}
      </span>
      <span className="text-[11px] leading-5 text-muted">{node.detail}</span>
    </li>
  );
}

export function ScriptApiList({ phase, globalName }: Readonly<ScriptApiListProps>) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rootMembers(phase, rootsFor(globalName)).map((node) => {
        const members = membersOf(node, phase);

        return (
          <li key={node.name} className="py-3 first:pt-0 last:pb-0">
            <MemberRow node={node} prefix={`${globalName}.`} />

            {members.length > 0 ? (
              <ul className="mt-1 flex flex-col divide-y divide-border border-l border-border pl-3">
                {members.map((member) => (
                  <MemberRow
                    key={member.name}
                    node={member}
                    prefix={`${globalName}.${node.name}.`}
                  />
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
