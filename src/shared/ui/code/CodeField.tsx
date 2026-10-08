import { useRef, type CSSProperties, type ReactNode } from "react";

import { CodeFindBar } from "./find/CodeFindBar";
import { useCodeFind } from "./find/use-code-find";

interface CodeFieldProps {
  children: ReactNode;
  revision?: unknown;
  className?: string;
  style?: CSSProperties;
}

export function CodeField({ children, revision, className, style }: Readonly<CodeFieldProps>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const find = useCodeFind({
    root: rootRef,
    scroller: scrollerRef,
    revision: revision ?? children
  });

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div ref={scrollerRef} className={className} style={style}>
        {children}
      </div>

      <CodeFindBar find={find} />
    </div>
  );
}
