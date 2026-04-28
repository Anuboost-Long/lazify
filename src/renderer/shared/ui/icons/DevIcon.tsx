interface DevIconProps {
  name: string;
  className?: string;
  title?: string;
}

export default function DevIcon({ name, className = "", title }: DevIconProps) {
  return (
    <i
      aria-hidden="true"
      title={title}
      className={`devicon-${name} ${className}`.trim()}
    />
  );
}
