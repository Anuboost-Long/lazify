import clsx from "clsx";

import type { HttpMethod } from "../types";

const METHOD_TONES: Record<HttpMethod, string> = {
  GET: "bg-[#15803d]/10 text-[#15803d] dark:bg-[#4ade80]/10 dark:text-[#4ade80]",
  POST: "bg-[#b45309]/10 text-[#b45309] dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]",
  PUT: "bg-[#1d4ed8]/10 text-[#1d4ed8] dark:bg-[#60a5fa]/10 dark:text-[#60a5fa]",
  PATCH: "bg-[#7e22ce]/10 text-[#7e22ce] dark:bg-[#c084fc]/10 dark:text-[#c084fc]",
  DELETE: "bg-[#b91c1c]/10 text-[#b91c1c] dark:bg-[#f87171]/10 dark:text-[#f87171]",
  HEAD: "bg-[#0f766e]/10 text-[#0f766e] dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]",
  OPTIONS: "bg-[#475569]/10 text-[#475569] dark:bg-[#94a3b8]/10 dark:text-[#94a3b8]"
};

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

export function MethodBadge({ method, className }: Readonly<MethodBadgeProps>) {
  return (
    <span
      className={clsx(
        "shrink-0 rounded-md px-1.5 py-0.5",
        "font-mono text-[10px] font-semibold tracking-[0.06em]",
        METHOD_TONES[method],
        className
      )}
    >
      {method}
    </span>
  );
}
