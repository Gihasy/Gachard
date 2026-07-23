"use client";

import Image from "next/image";

/** Single source of truth for the Gachard brand mark. */
const MARK_SRC = "/icons/gachard-logo.png";

interface LogoProps {
  /** Rendered width & height in px. */
  size?: number;
  /** Extra class on the outer wrapper. */
  className?: string;
  /** Priority hint for Next/Image (above-the-fold). */
  priority?: boolean;
}

export default function Logo({
  size = 36,
  className = "",
  priority = false,
}: LogoProps) {
  return (
    <span className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image
        src={MARK_SRC}
        alt="Gachard"
        fill
        sizes={`${size}px`}
        className="object-contain"
        priority={priority}
      />
    </span>
  );
}
