import Image from "next/image";
import icon from "@/app/icon.png";

export function BrandIcon({
  size = 28,
  className,
}: Readonly<{ size?: number; className?: string }>) {
  return (
    <Image
      src={icon}
      alt=""
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
