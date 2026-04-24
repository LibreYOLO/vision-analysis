import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className }: LogoProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-mark.png"
        alt="Vision Analysis"
        fill
        sizes={`${size}px`}
        className="object-contain"
      />
    </span>
  );
}
