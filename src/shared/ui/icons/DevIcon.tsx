import clsx from "clsx";

interface DevIconProps {
  name: string;
  className?: string;
  title?: string;
}

function NextJsIcon({ className = "", title }: Pick<DevIconProps, "className" | "title">) {
  return (
    <span
      aria-hidden="true"
      title={title}
      className={clsx("inline-flex items-center justify-center", className)}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[1em] w-[1em]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8.25 15.75V8.25L15.75 15.75V8.25"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function DevIcon({ name, className = "", title }: DevIconProps) {
  if (name === "nextjs-original" || name === "nextjs-plain") {
    return <NextJsIcon className={className} title={title} />;
  }

  return (
    <i
      aria-hidden="true"
      title={title}
      className={clsx(`devicon-${name}`, className)}
    />
  );
}
